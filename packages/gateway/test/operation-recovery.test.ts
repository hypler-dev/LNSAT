import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  GatewayOperationCoordinator,
  InMemoryGatewayOperationStore,
  JsonFileGatewayOperationStore,
  type GatewayOperationPrepareInput,
  type GatewayOperationReceipt,
  type GatewayOperationResult,
  type GatewayOperationScope,
  type GatewayOperationStore,
} from "../src/index.js";

const base = new Date("2026-08-04T00:00:00.000Z");
const scope = { tenant_id: "tenant-a", project_id: "project-a" };
const digestA = `sha256:${"a".repeat(64)}`;
const digestB = `sha256:${"b".repeat(64)}`;
const digestC = `sha256:${"c".repeat(64)}`;
const digestD = `sha256:${"d".repeat(64)}`;
const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true })),
  );
});

describe("Gateway durable operation and outage recovery", () => {
  it("persists required identity before dispatch and replays exact prepare", async () => {
    const { coordinator } = harness();
    const first = expectOk(await coordinator.prepare(input()));
    const replay = expectOk(await coordinator.prepare(input()));

    expect(first.record).toMatchObject({
      state: "prepared",
      operation_id: "op_operation_0001",
      canonical_packet_digest: digestA,
      tool_argument_digest: digestB,
      authorization_id: "authz:test:0001",
      idempotency_key: "idem_operation_0001",
      requester_identity: "user:alice",
      workload_identity: "spiffe://example.test/workload/agent",
      adapter_identity: "adapter:test",
      remote_identity: "remote:mcp:test",
      protocol: "mcp",
      protocol_version: "2026-07-28",
      attempt_count: 0,
      mcp_task_id: "mcp-task-0001",
      a2a_task_id: "a2a-task-0001",
      trace_id: "00-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa-bbbbbbbbbbbbbbbb-01",
    });
    expect(first.record.transitions).toHaveLength(1);
    expect(replay.replay).toBe(true);
    expect(replay.record).toEqual(first.record);
  });

  it("atomically handles concurrent same-key delivery", async () => {
    const { coordinator } = harness();
    const results = await Promise.all([
      coordinator.prepare(input()),
      coordinator.prepare(input()),
      coordinator.prepare(input()),
    ]);

    expect(results.filter((result) => result.ok && !result.replay)).toHaveLength(1);
    expect(results.filter((result) => result.ok && result.replay)).toHaveLength(2);
  });

  it("fails closed when same key changes argument digest", async () => {
    const { coordinator } = harness();
    expectOk(await coordinator.prepare(input()));
    const changed = await coordinator.prepare(
      input({ operation_id: "op_operation_0002", tool_argument_digest: digestC }),
    );

    expect(changed).toMatchObject({
      ok: false,
      error: { code: "gateway.operation.idempotency_collision" },
      side_effects: [],
    });
  });

  it("keeps crash-before-dispatch authorization retryable", async () => {
    const { coordinator } = harness();
    await preparedAndAuthorized(coordinator);
    const recovered = expectOk(
      await coordinator.recoverAfterRestart(scope, "op_operation_0001", at(2)),
    );

    expect(recovered.record.state).toBe("authorized");
    expect(recovered.record.attempt_count).toBe(0);
  });

  it("recovers durable prepared state through a new store instance", async () => {
    const path = await temporaryStorePath();
    const first = harness(new JsonFileGatewayOperationStore(path));
    expectOk(await first.coordinator.prepare(input()));

    const restarted = harness(new JsonFileGatewayOperationStore(path));
    const records = await restarted.coordinator.list(scope);
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({ state: "prepared", version: 1 });
  });

  it("classifies lost response before task ID as outcome_unknown", async () => {
    const { coordinator } = harness();
    await dispatching(coordinator, input({ mcp_task_id: null }));
    const lost = expectOk(
      await coordinator.markTransportFailure(scope, "op_operation_0001", at(3)),
    );

    expect(lost.record.state).toBe("outcome_unknown");
    expect(lost.record.receipt).toBeNull();
  });

  it("classifies lost response after possible side effect as outcome_unknown", async () => {
    const { coordinator } = harness();
    await dispatching(coordinator);
    expectOk(
      await coordinator.observeRemoteState(
        scope,
        "op_operation_0001",
        "working",
        at(3),
        { mcp_task_id: "mcp-task-0001" },
      ),
    );
    const lost = expectOk(
      await coordinator.markTransportFailure(scope, "op_operation_0001", at(4)),
    );
    expect(lost.record.state).toBe("outcome_unknown");
  });

  it("forbids blind retry while outcome is unknown", async () => {
    const { coordinator } = harness();
    await dispatching(coordinator);
    expectOk(await coordinator.markTransportFailure(scope, "op_operation_0001", at(3)));

    const retry = await coordinator.retryExact(retryInput(at(4)));
    expect(retry).toMatchObject({
      ok: false,
      error: { code: "gateway.operation.reconciliation_required" },
    });
  });

  it("reconnects through reconciliation and rejects stale task results", async () => {
    const { coordinator } = harness();
    await dispatching(coordinator);
    expectOk(await coordinator.markTransportFailure(scope, "op_operation_0001", at(3)));
    expectOk(await coordinator.beginReconciliation(scope, "op_operation_0001", at(4)));

    const stale = await coordinator.observeRemoteState(
      scope,
      "op_operation_0001",
      "working",
      at(5),
      { mcp_task_id: "mcp-task-stale" },
    );
    expect(stale).toMatchObject({
      ok: false,
      error: { code: "gateway.operation.retry_mismatch" },
    });
    const current = expectOk(
      await coordinator.observeRemoteState(
        scope,
        "op_operation_0001",
        "working",
        at(5),
        { mcp_task_id: "mcp-task-0001" },
      ),
    );
    expect(current.record.state).toBe("working");
  });

  it("does not treat remote terminal state as Gateway success", async () => {
    const { coordinator } = harness();
    await dispatching(coordinator);
    const remote = expectOk(
      await coordinator.observeRemoteState(
        scope,
        "op_operation_0001",
        "completed",
        at(3),
      ),
    );
    expect(remote.record).toMatchObject({
      state: "outcome_unknown",
      receipt: null,
      gateway_result_digest: null,
    });
  });

  it("treats cancel as request and records ignored cancellation", async () => {
    const { coordinator } = harness();
    await dispatching(coordinator);
    const cancelled = expectOk(
      await coordinator.requestCancellation(scope, "op_operation_0001", at(3)),
    );
    expect(cancelled.record.state).toBe("cancel_requested");

    const ignored = expectOk(
      await coordinator.observeRemoteState(
        scope,
        "op_operation_0001",
        "working",
        at(4),
      ),
    );
    expect(ignored.record.state).toBe("working");
    expect(ignored.record.transitions.at(-1)?.reason).toBe(
      "cancellation_not_confirmed",
    );
  });

  it("requires exact requested-approved-authorized-executed digest equality", async () => {
    const { coordinator } = harness();
    await dispatching(coordinator);
    const mismatched = await complete(coordinator, {
      executed_digest: digestC,
    });
    expect(mismatched).toMatchObject({
      ok: false,
      error: { code: "gateway.operation.digest_mismatch" },
    });
  });

  it("binds receipt result digest and rejects future receipt time", async () => {
    const first = harness();
    await dispatching(first.coordinator);
    expect(
      await complete(first.coordinator, {
        receipt: receipt({ result_digest: digestC }),
      }),
    ).toMatchObject({
      ok: false,
      error: { code: "gateway.operation.invalid_receipt" },
    });

    const second = harness();
    await dispatching(second.coordinator);
    expect(
      await complete(second.coordinator, {
        receipt: receipt({ received_at: at(7).toISOString() }),
      }),
    ).toMatchObject({
      ok: false,
      error: { code: "gateway.operation.invalid_receipt" },
    });
  });

  it("accepts verified late receipt after timeout and replays duplicate receipt", async () => {
    const { coordinator } = harness();
    await dispatching(coordinator);
    expectOk(await coordinator.markTransportFailure(scope, "op_operation_0001", at(3)));
    const completed = expectOk(await complete(coordinator));
    expect(completed.record).toMatchObject({
      state: "completed",
      receipt: { receipt_id: "receipt:test:0001" },
      gateway_result_digest: digestD,
    });

    const duplicate = expectOk(await complete(coordinator));
    expect(duplicate.replay).toBe(true);
    expect(duplicate.record.version).toBe(completed.record.version);
  });

  it("records completed application error as failed with receipt", async () => {
    const { coordinator } = harness();
    await dispatching(coordinator);
    const failed = expectOk(
      await complete(coordinator, {
        receipt: receipt({ status: "application_error" }),
      }),
    );
    expect(failed.record).toMatchObject({
      state: "failed",
      application_error: true,
      receipt: { status: "application_error" },
    });
  });

  it("verified non-execution enables exact retry only", async () => {
    const { coordinator } = harness();
    await dispatching(coordinator);
    expectOk(await coordinator.markTransportFailure(scope, "op_operation_0001", at(3)));
    expectOk(await coordinator.beginReconciliation(scope, "op_operation_0001", at(4)));
    const nonExecution = expectOk(
      await complete(coordinator, {
        receipt: receipt({
          status: "not_executed",
          received_at: at(5).toISOString(),
        }),
        at: at(5),
      }),
    );
    expect(nonExecution.record.state).toBe("authorized");

    const dispatchedAgain = expectOk(
      await coordinator.beginDispatch(scope, "op_operation_0001", at(6)),
    );
    expect(dispatchedAgain.record.attempt_count).toBe(2);
    expect(dispatchedAgain.record.attempts[0]?.dispatched_at).toBe(at(2).toISOString());
  });

  it("expires authorization during recovery before retry", async () => {
    const { coordinator } = harness();
    await preparedAndAuthorized(
      coordinator,
      input({ authorization_expires_at: at(4) }),
    );
    expectOk(await coordinator.markTransportFailure(scope, "op_operation_0001", at(2)));
    const expired = expectOk(await coordinator.retryExact(retryInput(at(5))));
    expect(expired.record.state).toBe("expired");
  });

  it("detects orphaned operations without claiming non-execution", async () => {
    const { coordinator } = harness();
    await dispatching(coordinator);
    const orphaned = expectOk(
      await coordinator.markOrphaned(scope, "op_operation_0001", at(20), 5_000),
    );
    expect(orphaned.record).toMatchObject({ state: "orphaned", receipt: null });
  });

  it("fails closed on backwards clock movement", async () => {
    const { coordinator } = harness();
    expectOk(await coordinator.prepare(input()));
    const result = await coordinator.authorize(scope, "op_operation_0001", at(-1));
    expect(result).toMatchObject({
      ok: false,
      error: { code: "gateway.operation.clock_skew" },
    });
  });

  it("isolates tenant and project reads", async () => {
    const { coordinator } = harness();
    expectOk(await coordinator.prepare(input()));

    expect(
      await coordinator.list({ tenant_id: "tenant-b", project_id: "project-a" }),
    ).toEqual([]);
    const crossScope = await coordinator.authorize(
      { tenant_id: "tenant-b", project_id: "project-a" },
      "op_operation_0001",
      at(1),
    );
    expect(crossScope).toMatchObject({
      ok: false,
      error: { code: "gateway.operation.not_found" },
    });
  });

  it("detects corrupted persisted transitions after restart", async () => {
    const path = await temporaryStorePath();
    const first = harness(new JsonFileGatewayOperationStore(path));
    expectOk(await first.coordinator.prepare(input()));
    const records = JSON.parse(await readFile(path, "utf8"));
    records[0].state = "completed";
    records[0].version = 2;
    records[0].transitions.push({
      sequence: 2,
      from: "prepared",
      to: "completed",
      at: at(1).toISOString(),
      reason: "corrupted_jump",
    });
    await writeFile(path, JSON.stringify(records), { mode: 0o600 });

    const restarted = harness(new JsonFileGatewayOperationStore(path));
    const result = await restarted.coordinator.authorize(
      scope,
      "op_operation_0001",
      at(2),
    );
    expect(result).toMatchObject({
      ok: false,
      error: { code: "gateway.operation.store_corrupted" },
    });
  });
});

function harness(store: GatewayOperationStore = new InMemoryGatewayOperationStore()) {
  return {
    store,
    coordinator: new GatewayOperationCoordinator(store, {
      verify: async (candidate, expected) => ({
        ok:
          candidate.operation_id === expected.operation_id &&
          candidate.authorization_id === expected.authorization_id &&
          candidate.canonical_packet_digest === expected.canonical_packet_digest &&
          candidate.tool_argument_digest === expected.tool_argument_digest,
      }),
    }),
  };
}

async function preparedAndAuthorized(
  coordinator: GatewayOperationCoordinator,
  prepareInput = input(),
): Promise<void> {
  expectOk(await coordinator.prepare(prepareInput));
  expectOk(await coordinator.authorize(scope, prepareInput.operation_id, at(1)));
}

async function dispatching(
  coordinator: GatewayOperationCoordinator,
  prepareInput = input(),
): Promise<void> {
  await preparedAndAuthorized(coordinator, prepareInput);
  expectOk(await coordinator.beginDispatch(scope, prepareInput.operation_id, at(2)));
}

function input(
  overrides: Partial<GatewayOperationPrepareInput> = {},
): GatewayOperationPrepareInput {
  return {
    ...scope,
    operation_id: "op_operation_0001",
    canonical_packet_digest: digestA,
    tool_argument_digest: digestB,
    authorization_id: "authz:test:0001",
    authorization_expires_at: at(30),
    idempotency_key: "idem_operation_0001",
    requester_identity: "user:alice",
    workload_identity: "spiffe://example.test/workload/agent",
    adapter_identity: "adapter:test",
    remote_identity: "remote:mcp:test",
    protocol: "mcp",
    protocol_version: "2026-07-28",
    requested_at: base,
    mcp_task_id: "mcp-task-0001",
    a2a_task_id: "a2a-task-0001",
    a2a_context_id: "a2a-context-0001",
    a2a_message_id: "a2a-message-0001",
    trace_id: "00-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa-bbbbbbbbbbbbbbbb-01",
    ...overrides,
  };
}

function retryInput(atValue: Date) {
  return {
    scope,
    operation_id: "op_operation_0001",
    at: atValue,
    idempotency_key: "idem_operation_0001",
    canonical_packet_digest: digestA,
    tool_argument_digest: digestB,
  };
}

function receipt(
  overrides: Partial<GatewayOperationReceipt> = {},
): GatewayOperationReceipt {
  return {
    receipt_id: "receipt:test:0001",
    operation_id: "op_operation_0001",
    authorization_id: "authz:test:0001",
    canonical_packet_digest: digestA,
    tool_argument_digest: digestB,
    status: "completed",
    result_digest: digestD,
    received_at: at(6).toISOString(),
    ...overrides,
  };
}

function complete(
  coordinator: GatewayOperationCoordinator,
  overrides: Partial<
    Parameters<GatewayOperationCoordinator["completeWithGatewayReceipt"]>[0]
  > = {},
) {
  return coordinator.completeWithGatewayReceipt({
    scope,
    operation_id: "op_operation_0001",
    at: at(6),
    requested_digest: digestA,
    approved_digest: digestA,
    authorized_digest: digestA,
    executed_digest: digestA,
    tool_argument_digest: digestB,
    gateway_result_digest: digestD,
    receipt: receipt(),
    ...overrides,
  });
}

function expectOk(
  result: GatewayOperationResult,
): Extract<GatewayOperationResult, { ok: true }> {
  expect(result).toMatchObject({ ok: true, side_effects: [] });
  if (!result.ok) throw new Error(result.error.code);
  return result;
}

function at(seconds: number): Date {
  return new Date(base.getTime() + seconds * 1000);
}

async function temporaryStorePath(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "lnsat-operation-recovery-"));
  temporaryDirectories.push(directory);
  return join(directory, "operations.json");
}
