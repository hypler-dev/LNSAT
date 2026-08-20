import { open, readFile, rename, unlink } from "node:fs/promises";
import { dirname } from "node:path";

export const gatewayOperationStates = [
  "prepared",
  "authorized",
  "dispatching",
  "accepted",
  "working",
  "input_required",
  "completed",
  "failed",
  "transport_unavailable",
  "outcome_unknown",
  "reconciling",
  "cancel_requested",
  "expired",
  "orphaned",
] as const;

export type GatewayOperationState = (typeof gatewayOperationStates)[number];

export type GatewayOperationScope = {
  tenant_id: string;
  project_id: string;
};

export type GatewayOperationIdentity = GatewayOperationScope & {
  operation_id: string;
  canonical_packet_digest: string;
  tool_argument_digest: string;
  authorization_id: string;
  authorization_expires_at: string;
  idempotency_key: string;
  requester_identity: string;
  workload_identity: string | null;
  adapter_identity: string;
  remote_identity: string;
  protocol: string;
  protocol_version: string;
  requested_at: string;
  mcp_task_id: string | null;
  a2a_task_id: string | null;
  a2a_context_id: string | null;
  a2a_message_id: string | null;
  trace_id: string | null;
};

export type GatewayOperationAttempt = {
  attempt: number;
  dispatched_at: string;
  observation_at: string | null;
  completion_at: string | null;
};

export type GatewayOperationTransition = {
  sequence: number;
  from: GatewayOperationState | null;
  to: GatewayOperationState;
  at: string;
  reason: string;
};

export type GatewayOperationReceipt = {
  receipt_id: string;
  operation_id: string;
  authorization_id: string;
  canonical_packet_digest: string;
  tool_argument_digest: string;
  status: "completed" | "application_error" | "not_executed";
  result_digest: string;
  received_at: string;
};

export type GatewayOperationRecord = GatewayOperationIdentity & {
  state: GatewayOperationState;
  version: number;
  attempt_count: number;
  attempts: GatewayOperationAttempt[];
  transitions: GatewayOperationTransition[];
  dispatch_at: string | null;
  observation_at: string | null;
  completion_at: string | null;
  receipt: GatewayOperationReceipt | null;
  gateway_result_digest: string | null;
  application_error: boolean;
};

export type GatewayOperationPrepareInput = Omit<
  GatewayOperationIdentity,
  "authorization_expires_at" | "requested_at"
> & {
  authorization_expires_at: Date;
  requested_at: Date;
};

export type GatewayOperationStorePrepareResult =
  | { outcome: "created"; record: GatewayOperationRecord }
  | { outcome: "replay"; record: GatewayOperationRecord }
  | { outcome: "collision" };

export interface GatewayOperationStore {
  readonly durability: "durable" | "test_only";
  prepare(record: GatewayOperationRecord): Promise<GatewayOperationStorePrepareResult>;
  read(
    scope: GatewayOperationScope,
    operationId: string,
  ): Promise<GatewayOperationRecord | null>;
  compareAndSwap(
    scope: GatewayOperationScope,
    operationId: string,
    expectedVersion: number,
    record: GatewayOperationRecord,
  ): Promise<"updated" | "conflict" | "missing">;
  list(scope: GatewayOperationScope): Promise<GatewayOperationRecord[]>;
}

export class InMemoryGatewayOperationStore implements GatewayOperationStore {
  readonly durability = "test_only" as const;
  readonly #records = new Map<string, GatewayOperationRecord>();

  async prepare(
    record: GatewayOperationRecord,
  ): Promise<GatewayOperationStorePrepareResult> {
    const idKey = recordKey(record, record.operation_id);
    const idempotencyKey = operationIdempotencyKey(record);
    const existingById = this.#records.get(idKey);
    const existingByIdempotency = [...this.#records.values()].find(
      (candidate) => operationIdempotencyKey(candidate) === idempotencyKey,
    );
    const existing = existingById ?? existingByIdempotency;
    if (existing !== undefined) {
      return operationIdentityEqual(existing, record)
        ? { outcome: "replay", record: clone(existing) }
        : { outcome: "collision" };
    }
    this.#records.set(idKey, clone(record));
    return { outcome: "created", record: clone(record) };
  }

  async read(
    scope: GatewayOperationScope,
    operationId: string,
  ): Promise<GatewayOperationRecord | null> {
    const record = this.#records.get(recordKey(scope, operationId));
    return record === undefined ? null : clone(record);
  }

  async compareAndSwap(
    scope: GatewayOperationScope,
    operationId: string,
    expectedVersion: number,
    record: GatewayOperationRecord,
  ): Promise<"updated" | "conflict" | "missing"> {
    const key = recordKey(scope, operationId);
    const existing = this.#records.get(key);
    if (existing === undefined) return "missing";
    if (existing.version !== expectedVersion) return "conflict";
    this.#records.set(key, clone(record));
    return "updated";
  }

  async list(scope: GatewayOperationScope): Promise<GatewayOperationRecord[]> {
    return [...this.#records.values()]
      .filter(
        (record) =>
          record.tenant_id === scope.tenant_id &&
          record.project_id === scope.project_id,
      )
      .map(clone);
  }
}

export class JsonFileGatewayOperationStore implements GatewayOperationStore {
  readonly durability = "durable" as const;
  readonly #path: string;
  #queue: Promise<void> = Promise.resolve();
  #temporaryCounter = 0;

  constructor(path: string) {
    if (!path.startsWith("/") || path.length > 4096 || /[\u0000\r\n]/.test(path)) {
      throw new Error("Gateway operation store path must be a bounded absolute path.");
    }
    this.#path = path;
  }

  prepare(record: GatewayOperationRecord): Promise<GatewayOperationStorePrepareResult> {
    return this.#exclusive(async () => {
      const records = await this.#load();
      const existing = records.find(
        (candidate) =>
          recordKey(candidate, candidate.operation_id) ===
            recordKey(record, record.operation_id) ||
          operationIdempotencyKey(candidate) === operationIdempotencyKey(record),
      );
      if (existing !== undefined) {
        return operationIdentityEqual(existing, record)
          ? { outcome: "replay", record: clone(existing) }
          : { outcome: "collision" };
      }
      records.push(clone(record));
      await this.#save(records);
      return { outcome: "created", record: clone(record) };
    });
  }

  read(
    scope: GatewayOperationScope,
    operationId: string,
  ): Promise<GatewayOperationRecord | null> {
    return this.#exclusive(async () => {
      const record = (await this.#load()).find(
        (candidate) =>
          recordKey(candidate, candidate.operation_id) ===
          recordKey(scope, operationId),
      );
      return record === undefined ? null : clone(record);
    });
  }

  compareAndSwap(
    scope: GatewayOperationScope,
    operationId: string,
    expectedVersion: number,
    record: GatewayOperationRecord,
  ): Promise<"updated" | "conflict" | "missing"> {
    return this.#exclusive(async () => {
      const records = await this.#load();
      const index = records.findIndex(
        (candidate) =>
          recordKey(candidate, candidate.operation_id) ===
          recordKey(scope, operationId),
      );
      if (index < 0) return "missing";
      if (records[index]!.version !== expectedVersion) return "conflict";
      records[index] = clone(record);
      await this.#save(records);
      return "updated";
    });
  }

  list(scope: GatewayOperationScope): Promise<GatewayOperationRecord[]> {
    return this.#exclusive(async () =>
      (await this.#load())
        .filter(
          (record) =>
            record.tenant_id === scope.tenant_id &&
            record.project_id === scope.project_id,
        )
        .map(clone),
    );
  }

  #exclusive<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.#queue.then(operation, operation);
    this.#queue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  async #load(): Promise<GatewayOperationRecord[]> {
    let text: string;
    try {
      text = await readFile(this.#path, "utf8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw error;
    }
    let value: unknown;
    try {
      value = JSON.parse(text);
    } catch {
      throw new GatewayOperationStoreCorruptionError();
    }
    if (!Array.isArray(value) || !value.every(isValidOperationRecord)) {
      throw new GatewayOperationStoreCorruptionError();
    }
    const operationKeys = new Set<string>();
    const idempotencyKeys = new Set<string>();
    for (const record of value) {
      const operationKey = recordKey(record, record.operation_id);
      const idempotencyKey = operationIdempotencyKey(record);
      if (operationKeys.has(operationKey) || idempotencyKeys.has(idempotencyKey)) {
        throw new GatewayOperationStoreCorruptionError();
      }
      operationKeys.add(operationKey);
      idempotencyKeys.add(idempotencyKey);
    }
    return value.map(clone);
  }

  async #save(records: GatewayOperationRecord[]): Promise<void> {
    const temporaryPath = `${this.#path}.${process.pid}.${this.#temporaryCounter++}.tmp`;
    let handle: Awaited<ReturnType<typeof open>> | null = null;
    try {
      handle = await open(temporaryPath, "wx", 0o600);
      await handle.writeFile(`${JSON.stringify(records)}\n`, "utf8");
      await handle.sync();
      await handle.close();
      handle = null;
      await rename(temporaryPath, this.#path);
      const directory = await open(dirname(this.#path), "r");
      try {
        await directory.sync();
      } finally {
        await directory.close();
      }
    } finally {
      if (handle !== null) await handle.close().catch(() => undefined);
      await unlink(temporaryPath).catch(() => undefined);
    }
  }
}

export class GatewayOperationStoreCorruptionError extends Error {
  constructor() {
    super("Gateway operation store is corrupted.");
    this.name = "GatewayOperationStoreCorruptionError";
  }
}

export interface GatewayOperationReceiptVerifier {
  verify(
    receipt: GatewayOperationReceipt,
    expected: Pick<
      GatewayOperationRecord,
      | "operation_id"
      | "authorization_id"
      | "canonical_packet_digest"
      | "tool_argument_digest"
    >,
  ): Promise<{ ok: true } | { ok: false }>;
}

export type GatewayOperationResult =
  | { ok: true; record: GatewayOperationRecord; replay: boolean; side_effects: [] }
  | {
      ok: false;
      error: {
        code:
          | "gateway.operation.invalid_input"
          | "gateway.operation.idempotency_collision"
          | "gateway.operation.not_found"
          | "gateway.operation.invalid_transition"
          | "gateway.operation.authorization_expired"
          | "gateway.operation.clock_skew"
          | "gateway.operation.concurrent_update"
          | "gateway.operation.reconciliation_required"
          | "gateway.operation.retry_mismatch"
          | "gateway.operation.invalid_receipt"
          | "gateway.operation.digest_mismatch"
          | "gateway.operation.store_corrupted"
          | "gateway.operation.store_unavailable";
        message: string;
      };
      side_effects: [];
    };

export class GatewayOperationCoordinator {
  readonly #store: GatewayOperationStore;
  readonly #receiptVerifier: GatewayOperationReceiptVerifier;

  constructor(
    store: GatewayOperationStore,
    receiptVerifier: GatewayOperationReceiptVerifier,
  ) {
    this.#store = store;
    this.#receiptVerifier = receiptVerifier;
  }

  async prepare(input: GatewayOperationPrepareInput): Promise<GatewayOperationResult> {
    if (!isValidPrepareInput(input)) return failure("gateway.operation.invalid_input");
    const record = initialRecord(input);
    try {
      const result = await this.#store.prepare(record);
      if (result.outcome === "collision") {
        return failure("gateway.operation.idempotency_collision");
      }
      return success(result.record, result.outcome === "replay");
    } catch (error) {
      return storeFailure(error);
    }
  }

  authorize(scope: GatewayOperationScope, operationId: string, at: Date) {
    return this.#transition(
      scope,
      operationId,
      "authorized",
      at,
      "authorization_valid",
      ["prepared"],
    );
  }

  async beginDispatch(
    scope: GatewayOperationScope,
    operationId: string,
    at: Date,
  ): Promise<GatewayOperationResult> {
    return this.#mutate(scope, operationId, at, (record, isoAt) => {
      if (record.state !== "authorized")
        return failure("gateway.operation.invalid_transition");
      if (Date.parse(record.authorization_expires_at) <= at.getTime()) {
        return failure("gateway.operation.authorization_expired");
      }
      const attempt = record.attempt_count + 1;
      return nextRecord(record, "dispatching", isoAt, "dispatch_started", {
        attempt_count: attempt,
        dispatch_at: isoAt,
        attempts: [
          ...record.attempts,
          { attempt, dispatched_at: isoAt, observation_at: null, completion_at: null },
        ],
      });
    });
  }

  observeRemoteState(
    scope: GatewayOperationScope,
    operationId: string,
    remoteState: "accepted" | "working" | "input_required" | "completed" | "failed",
    at: Date,
    identities: {
      mcp_task_id?: string | null;
      a2a_task_id?: string | null;
      a2a_context_id?: string | null;
      a2a_message_id?: string | null;
    } = {},
  ): Promise<GatewayOperationResult> {
    return this.#mutate(scope, operationId, at, (record, isoAt) => {
      if (!remoteIdentitiesMatch(record, identities)) {
        return failure("gateway.operation.retry_mismatch");
      }
      if (
        ![
          "dispatching",
          "accepted",
          "working",
          "input_required",
          "cancel_requested",
          "reconciling",
        ].includes(record.state)
      ) {
        return failure("gateway.operation.invalid_transition");
      }
      const nextState =
        remoteState === "completed" || remoteState === "failed"
          ? "outcome_unknown"
          : remoteState;
      return nextRecord(
        record,
        nextState,
        isoAt,
        remoteState === "completed" || remoteState === "failed"
          ? "remote_terminal_without_gateway_receipt"
          : record.state === "cancel_requested"
            ? "cancellation_not_confirmed"
            : `remote_${remoteState}`,
        {
          observation_at: isoAt,
          attempts: updateLatestAttempt(record.attempts, { observation_at: isoAt }),
        },
      );
    });
  }

  markTransportFailure(
    scope: GatewayOperationScope,
    operationId: string,
    at: Date,
  ): Promise<GatewayOperationResult> {
    return this.#mutate(scope, operationId, at, (record, isoAt) => {
      if (record.state === "authorized") {
        return nextRecord(
          record,
          "transport_unavailable",
          isoAt,
          "transport_unavailable",
        );
      }
      if (
        [
          "dispatching",
          "accepted",
          "working",
          "input_required",
          "cancel_requested",
        ].includes(record.state)
      ) {
        return nextRecord(
          record,
          "outcome_unknown",
          isoAt,
          "transport_lost_after_dispatch",
        );
      }
      return failure("gateway.operation.invalid_transition");
    });
  }

  requestCancellation(
    scope: GatewayOperationScope,
    operationId: string,
    at: Date,
  ): Promise<GatewayOperationResult> {
    return this.#transition(
      scope,
      operationId,
      "cancel_requested",
      at,
      "cancellation_requested",
      [
        "dispatching",
        "accepted",
        "working",
        "input_required",
        "outcome_unknown",
        "reconciling",
      ],
    );
  }

  beginReconciliation(
    scope: GatewayOperationScope,
    operationId: string,
    at: Date,
  ): Promise<GatewayOperationResult> {
    return this.#transition(
      scope,
      operationId,
      "reconciling",
      at,
      "reconciliation_started",
      ["outcome_unknown", "cancel_requested", "orphaned"],
    );
  }

  async completeWithGatewayReceipt(input: {
    scope: GatewayOperationScope;
    operation_id: string;
    at: Date;
    requested_digest: string;
    approved_digest: string;
    authorized_digest: string;
    executed_digest: string;
    tool_argument_digest: string;
    gateway_result_digest: string;
    receipt: GatewayOperationReceipt;
  }): Promise<GatewayOperationResult> {
    const current = await this.#read(input.scope, input.operation_id);
    if (!current.ok) return current;
    const record = current.record;
    if (
      !isValidReceipt(input.receipt) ||
      !isDigest(input.gateway_result_digest) ||
      input.receipt.result_digest !== input.gateway_result_digest ||
      Date.parse(input.receipt.received_at) < Date.parse(record.requested_at) ||
      Date.parse(input.receipt.received_at) > input.at.getTime()
    ) {
      return failure("gateway.operation.invalid_receipt");
    }
    if (
      [
        input.requested_digest,
        input.approved_digest,
        input.authorized_digest,
        input.executed_digest,
      ].some((digest) => digest !== record.canonical_packet_digest) ||
      input.tool_argument_digest !== record.tool_argument_digest
    ) {
      return failure("gateway.operation.digest_mismatch");
    }
    let verified: { ok: true } | { ok: false };
    try {
      verified = await this.#receiptVerifier.verify(input.receipt, record);
    } catch {
      verified = { ok: false };
    }
    if (!verified.ok || !receiptMatches(input.receipt, record)) {
      return failure("gateway.operation.invalid_receipt");
    }
    if (
      ["completed", "failed"].includes(record.state) &&
      record.gateway_result_digest === input.gateway_result_digest &&
      record.receipt !== null &&
      JSON.stringify(record.receipt) === JSON.stringify(input.receipt)
    ) {
      return success(record, true);
    }
    return this.#mutate(input.scope, input.operation_id, input.at, (fresh, isoAt) => {
      if (fresh.version !== record.version)
        return failure("gateway.operation.concurrent_update");
      if (
        ![
          "dispatching",
          "accepted",
          "working",
          "input_required",
          "outcome_unknown",
          "reconciling",
          "cancel_requested",
        ].includes(fresh.state)
      ) {
        return failure("gateway.operation.invalid_transition");
      }
      if (input.receipt.status === "not_executed") {
        const target =
          Date.parse(fresh.authorization_expires_at) > input.at.getTime()
            ? "authorized"
            : "expired";
        return nextRecord(fresh, target, isoAt, "verified_non_execution", {
          receipt: clone(input.receipt),
          observation_at: isoAt,
          attempts: updateLatestAttempt(fresh.attempts, {
            observation_at: isoAt,
            completion_at: isoAt,
          }),
        });
      }
      const target = input.receipt.status === "completed" ? "completed" : "failed";
      return nextRecord(fresh, target, isoAt, "gateway_receipt_verified", {
        receipt: clone(input.receipt),
        gateway_result_digest: input.gateway_result_digest,
        application_error: input.receipt.status === "application_error",
        observation_at: isoAt,
        completion_at: isoAt,
        attempts: updateLatestAttempt(fresh.attempts, {
          observation_at: isoAt,
          completion_at: isoAt,
        }),
      });
    });
  }

  async retryExact(input: {
    scope: GatewayOperationScope;
    operation_id: string;
    at: Date;
    idempotency_key: string;
    canonical_packet_digest: string;
    tool_argument_digest: string;
  }): Promise<GatewayOperationResult> {
    return this.#mutate(input.scope, input.operation_id, input.at, (record, isoAt) => {
      if (record.state === "outcome_unknown" || record.state === "reconciling") {
        return failure("gateway.operation.reconciliation_required");
      }
      if (record.state !== "transport_unavailable") {
        return failure("gateway.operation.invalid_transition");
      }
      if (
        record.idempotency_key !== input.idempotency_key ||
        record.canonical_packet_digest !== input.canonical_packet_digest ||
        record.tool_argument_digest !== input.tool_argument_digest
      ) {
        return failure("gateway.operation.retry_mismatch");
      }
      if (Date.parse(record.authorization_expires_at) <= input.at.getTime()) {
        return nextRecord(
          record,
          "expired",
          isoAt,
          "authorization_expired_before_retry",
        );
      }
      return nextRecord(record, "authorized", isoAt, "exact_retry_authorized");
    });
  }

  recoverAfterRestart(
    scope: GatewayOperationScope,
    operationId: string,
    at: Date,
  ): Promise<GatewayOperationResult> {
    return this.#mutate(scope, operationId, at, (record, isoAt) => {
      if (
        [
          "dispatching",
          "accepted",
          "working",
          "input_required",
          "cancel_requested",
        ].includes(record.state)
      ) {
        return nextRecord(
          record,
          "outcome_unknown",
          isoAt,
          "restart_after_possible_dispatch",
        );
      }
      return success(record, true);
    });
  }

  markOrphaned(
    scope: GatewayOperationScope,
    operationId: string,
    at: Date,
    staleAfterMs: number,
  ): Promise<GatewayOperationResult> {
    return this.#mutate(scope, operationId, at, (record, isoAt) => {
      if (!Number.isSafeInteger(staleAfterMs) || staleAfterMs < 1) {
        return failure("gateway.operation.invalid_input");
      }
      if (["completed", "failed", "expired"].includes(record.state)) {
        return failure("gateway.operation.invalid_transition");
      }
      const lastAt = Date.parse(record.transitions.at(-1)!.at);
      if (at.getTime() - lastAt < staleAfterMs) {
        return failure("gateway.operation.invalid_transition");
      }
      return nextRecord(record, "orphaned", isoAt, "operation_stale");
    });
  }

  list(scope: GatewayOperationScope): Promise<GatewayOperationRecord[]> {
    return this.#store.list(scope);
  }

  #transition(
    scope: GatewayOperationScope,
    operationId: string,
    target: GatewayOperationState,
    at: Date,
    reason: string,
    allowed: GatewayOperationState[],
  ): Promise<GatewayOperationResult> {
    return this.#mutate(scope, operationId, at, (record, isoAt) =>
      allowed.includes(record.state)
        ? nextRecord(record, target, isoAt, reason)
        : failure("gateway.operation.invalid_transition"),
    );
  }

  async #read(
    scope: GatewayOperationScope,
    operationId: string,
  ): Promise<
    | { ok: true; record: GatewayOperationRecord }
    | Extract<GatewayOperationResult, { ok: false }>
  > {
    if (
      !isValidScope(scope) ||
      !safeId(operationId, /^op_[a-z0-9][a-z0-9_-]{7,127}$/)
    ) {
      return failure("gateway.operation.invalid_input");
    }
    try {
      const record = await this.#store.read(scope, operationId);
      if (record === null) return failure("gateway.operation.not_found");
      if (!isValidOperationRecord(record))
        return failure("gateway.operation.store_corrupted");
      return { ok: true, record };
    } catch (error) {
      return storeFailure(error);
    }
  }

  async #mutate(
    scope: GatewayOperationScope,
    operationId: string,
    at: Date,
    mutate: (
      record: GatewayOperationRecord,
      isoAt: string,
    ) => GatewayOperationRecord | GatewayOperationResult,
  ): Promise<GatewayOperationResult> {
    const current = await this.#read(scope, operationId);
    if (!current.ok) return current;
    if (!Number.isFinite(at.getTime()))
      return failure("gateway.operation.invalid_input");
    const lastAt = Date.parse(current.record.transitions.at(-1)!.at);
    if (at.getTime() < lastAt) return failure("gateway.operation.clock_skew");
    const changed = mutate(current.record, at.toISOString());
    if ("ok" in changed) return changed;
    if (!isValidOperationRecord(changed))
      return failure("gateway.operation.store_corrupted");
    try {
      const outcome = await this.#store.compareAndSwap(
        scope,
        operationId,
        current.record.version,
        changed,
      );
      if (outcome === "missing") return failure("gateway.operation.not_found");
      if (outcome === "conflict") return failure("gateway.operation.concurrent_update");
      return success(changed, false);
    } catch (error) {
      return storeFailure(error);
    }
  }
}

function initialRecord(input: GatewayOperationPrepareInput): GatewayOperationRecord {
  const requestedAt = input.requested_at.toISOString();
  return {
    ...input,
    authorization_expires_at: input.authorization_expires_at.toISOString(),
    requested_at: requestedAt,
    state: "prepared",
    version: 1,
    attempt_count: 0,
    attempts: [],
    transitions: [
      {
        sequence: 1,
        from: null,
        to: "prepared",
        at: requestedAt,
        reason: "operation_prepared",
      },
    ],
    dispatch_at: null,
    observation_at: null,
    completion_at: null,
    receipt: null,
    gateway_result_digest: null,
    application_error: false,
  };
}

function nextRecord(
  record: GatewayOperationRecord,
  state: GatewayOperationState,
  at: string,
  reason: string,
  changes: Partial<GatewayOperationRecord> = {},
): GatewayOperationRecord {
  return {
    ...record,
    ...changes,
    state,
    version: record.version + 1,
    transitions: [
      ...record.transitions,
      {
        sequence: record.transitions.length + 1,
        from: record.state,
        to: state,
        at,
        reason,
      },
    ],
  };
}

function updateLatestAttempt(
  attempts: GatewayOperationAttempt[],
  changes: Partial<GatewayOperationAttempt>,
): GatewayOperationAttempt[] {
  if (attempts.length === 0) return [];
  return attempts.map((attempt, index) =>
    index === attempts.length - 1 ? { ...attempt, ...changes } : attempt,
  );
}

function success(
  record: GatewayOperationRecord,
  replay: boolean,
): GatewayOperationResult {
  return { ok: true, record: clone(record), replay, side_effects: [] };
}

function failure(
  code: Extract<GatewayOperationResult, { ok: false }>["error"]["code"],
): Extract<GatewayOperationResult, { ok: false }> {
  const messages: Record<typeof code, string> = {
    "gateway.operation.invalid_input": "Operation input is invalid.",
    "gateway.operation.idempotency_collision":
      "Idempotency key or operation identity collided.",
    "gateway.operation.not_found": "Operation was not found in requested scope.",
    "gateway.operation.invalid_transition": "Operation state transition is invalid.",
    "gateway.operation.authorization_expired": "Operation authorization expired.",
    "gateway.operation.clock_skew": "Operation transition time moved backwards.",
    "gateway.operation.concurrent_update": "Operation changed concurrently.",
    "gateway.operation.reconciliation_required":
      "Outcome must be reconciled before retry.",
    "gateway.operation.retry_mismatch":
      "Retry identity does not exactly match operation.",
    "gateway.operation.invalid_receipt": "Execution receipt is invalid.",
    "gateway.operation.digest_mismatch":
      "Requested, approved, authorized, and executed digests differ.",
    "gateway.operation.store_corrupted": "Operation store failed integrity validation.",
    "gateway.operation.store_unavailable": "Operation store is unavailable.",
  };
  return { ok: false, error: { code, message: messages[code] }, side_effects: [] };
}

function storeFailure(error: unknown): Extract<GatewayOperationResult, { ok: false }> {
  return error instanceof GatewayOperationStoreCorruptionError
    ? failure("gateway.operation.store_corrupted")
    : failure("gateway.operation.store_unavailable");
}

function isValidPrepareInput(input: GatewayOperationPrepareInput): boolean {
  return (
    isValidScope(input) &&
    safeId(input.operation_id, /^op_[a-z0-9][a-z0-9_-]{7,127}$/) &&
    isDigest(input.canonical_packet_digest) &&
    isDigest(input.tool_argument_digest) &&
    safeLabel(input.authorization_id, 256) &&
    Number.isFinite(input.authorization_expires_at.getTime()) &&
    safeId(input.idempotency_key, /^idem_[a-z0-9][a-z0-9_-]{7,127}$/) &&
    safeLabel(input.requester_identity, 512) &&
    (input.workload_identity === null || safeLabel(input.workload_identity, 512)) &&
    safeLabel(input.adapter_identity, 256) &&
    safeLabel(input.remote_identity, 512) &&
    safeLabel(input.protocol, 64) &&
    safeLabel(input.protocol_version, 64) &&
    Number.isFinite(input.requested_at.getTime()) &&
    input.authorization_expires_at.getTime() > input.requested_at.getTime() &&
    [
      input.mcp_task_id,
      input.a2a_task_id,
      input.a2a_context_id,
      input.a2a_message_id,
      input.trace_id,
    ].every((value) => value === null || safeLabel(value, 256))
  );
}

function isValidOperationRecord(value: unknown): value is GatewayOperationRecord {
  if (!isPlainObject(value)) return false;
  const record = value as unknown as GatewayOperationRecord;
  if (
    !isValidScope(record) ||
    !safeId(record.operation_id, /^op_[a-z0-9][a-z0-9_-]{7,127}$/) ||
    !isDigest(record.canonical_packet_digest) ||
    !isDigest(record.tool_argument_digest) ||
    !safeLabel(record.authorization_id, 256) ||
    !safeLabel(record.requester_identity, 512) ||
    (record.workload_identity !== null && !safeLabel(record.workload_identity, 512)) ||
    !safeLabel(record.adapter_identity, 256) ||
    !safeLabel(record.remote_identity, 512) ||
    !safeLabel(record.protocol, 64) ||
    !safeLabel(record.protocol_version, 64) ||
    !safeId(record.idempotency_key, /^idem_[a-z0-9][a-z0-9_-]{7,127}$/) ||
    !gatewayOperationStates.includes(record.state) ||
    !Number.isSafeInteger(record.version) ||
    record.version < 1 ||
    !Number.isSafeInteger(record.attempt_count) ||
    record.attempt_count < 0 ||
    !Array.isArray(record.attempts) ||
    !Array.isArray(record.transitions) ||
    record.transitions.length !== record.version ||
    record.attempts.length !== record.attempt_count ||
    !validIso(record.requested_at) ||
    !validIso(record.authorization_expires_at) ||
    Date.parse(record.authorization_expires_at) <= Date.parse(record.requested_at)
  )
    return false;
  if (
    ![record.dispatch_at, record.observation_at, record.completion_at].every(
      (timestamp) => timestamp === null || validIso(timestamp),
    ) ||
    (record.receipt !== null && !isValidReceipt(record.receipt)) ||
    (record.gateway_result_digest !== null &&
      !isDigest(record.gateway_result_digest)) ||
    typeof record.application_error !== "boolean" ||
    [
      record.mcp_task_id,
      record.a2a_task_id,
      record.a2a_context_id,
      record.a2a_message_id,
      record.trace_id,
    ].some((identity) => identity !== null && !safeLabel(identity, 256))
  )
    return false;
  let lastAt = -Infinity;
  for (let index = 0; index < record.transitions.length; index += 1) {
    const transition = record.transitions[index]!;
    const at = Date.parse(transition.at);
    if (
      transition.sequence !== index + 1 ||
      transition.to !==
        (index === record.transitions.length - 1 ? record.state : transition.to) ||
      (index === 0
        ? transition.from !== null || transition.to !== "prepared"
        : transition.from !== record.transitions[index - 1]!.to ||
          !isAllowedTransition(transition.from, transition.to)) ||
      !Number.isFinite(at) ||
      at < lastAt ||
      !safeLabel(transition.reason, 128)
    )
      return false;
    lastAt = at;
  }
  if (record.transitions.at(-1)?.to !== record.state) return false;
  if (record.transitions[0]?.at !== record.requested_at) return false;
  if (
    !record.attempts.every((attempt, index) => {
      if (
        attempt.attempt !== index + 1 ||
        !validIso(attempt.dispatched_at) ||
        (attempt.observation_at !== null && !validIso(attempt.observation_at)) ||
        (attempt.completion_at !== null && !validIso(attempt.completion_at))
      ) {
        return false;
      }
      const dispatchedAt = Date.parse(attempt.dispatched_at);
      return (
        dispatchedAt >= Date.parse(record.requested_at) &&
        (attempt.observation_at === null ||
          Date.parse(attempt.observation_at) >= dispatchedAt) &&
        (attempt.completion_at === null ||
          Date.parse(attempt.completion_at) >= dispatchedAt)
      );
    })
  )
    return false;
  if (record.state === "completed") {
    return (
      record.receipt?.status === "completed" &&
      record.gateway_result_digest === record.receipt.result_digest &&
      record.completion_at !== null &&
      record.application_error === false
    );
  }
  if (record.state === "failed") {
    return (
      record.receipt?.status === "application_error" &&
      record.gateway_result_digest === record.receipt.result_digest &&
      record.completion_at !== null &&
      record.application_error === true
    );
  }
  return record.application_error === false;
}

function isValidReceipt(receipt: GatewayOperationReceipt): boolean {
  return (
    safeLabel(receipt.receipt_id, 256) &&
    safeId(receipt.operation_id, /^op_[a-z0-9][a-z0-9_-]{7,127}$/) &&
    safeLabel(receipt.authorization_id, 256) &&
    isDigest(receipt.canonical_packet_digest) &&
    isDigest(receipt.tool_argument_digest) &&
    ["completed", "application_error", "not_executed"].includes(receipt.status) &&
    isDigest(receipt.result_digest) &&
    validIso(receipt.received_at)
  );
}

function receiptMatches(
  receipt: GatewayOperationReceipt,
  record: GatewayOperationRecord,
): boolean {
  return (
    receipt.operation_id === record.operation_id &&
    receipt.authorization_id === record.authorization_id &&
    receipt.canonical_packet_digest === record.canonical_packet_digest &&
    receipt.tool_argument_digest === record.tool_argument_digest
  );
}

function operationIdentityEqual(
  left: GatewayOperationRecord,
  right: GatewayOperationRecord,
): boolean {
  const keys: Array<keyof GatewayOperationIdentity> = [
    "tenant_id",
    "project_id",
    "operation_id",
    "canonical_packet_digest",
    "tool_argument_digest",
    "authorization_id",
    "authorization_expires_at",
    "idempotency_key",
    "requester_identity",
    "workload_identity",
    "adapter_identity",
    "remote_identity",
    "protocol",
    "protocol_version",
    "requested_at",
    "mcp_task_id",
    "a2a_task_id",
    "a2a_context_id",
    "a2a_message_id",
    "trace_id",
  ];
  return keys.every((key) => left[key] === right[key]);
}

function operationIdempotencyKey(record: GatewayOperationRecord): string {
  return `${record.tenant_id}\u0000${record.project_id}\u0000${record.idempotency_key}`;
}

function recordKey(scope: GatewayOperationScope, operationId: string): string {
  return `${scope.tenant_id}\u0000${scope.project_id}\u0000${operationId}`;
}

function isValidScope(scope: GatewayOperationScope): boolean {
  return safeLabel(scope.tenant_id, 128) && safeLabel(scope.project_id, 128);
}

function isDigest(value: unknown): value is string {
  return typeof value === "string" && /^sha256:[a-f0-9]{64}$/.test(value);
}

function safeId(value: unknown, pattern: RegExp): value is string {
  return typeof value === "string" && pattern.test(value);
}

function safeLabel(value: unknown, maxLength: number): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= maxLength &&
    !/[\u0000-\u001f\u007f]/.test(value)
  );
}

function validIso(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    return new Date(value).toISOString() === value;
  } catch {
    return false;
  }
}

function remoteIdentitiesMatch(
  record: GatewayOperationRecord,
  identities: {
    mcp_task_id?: string | null;
    a2a_task_id?: string | null;
    a2a_context_id?: string | null;
    a2a_message_id?: string | null;
  },
): boolean {
  const keys = [
    "mcp_task_id",
    "a2a_task_id",
    "a2a_context_id",
    "a2a_message_id",
  ] as const;
  return keys.every(
    (key) => identities[key] === undefined || identities[key] === record[key],
  );
}

function isAllowedTransition(
  from: GatewayOperationState,
  to: GatewayOperationState,
): boolean {
  const allowed: Record<GatewayOperationState, readonly GatewayOperationState[]> = {
    prepared: ["authorized", "orphaned"],
    authorized: ["dispatching", "transport_unavailable", "expired", "orphaned"],
    dispatching: [
      "accepted",
      "working",
      "input_required",
      "outcome_unknown",
      "cancel_requested",
      "completed",
      "failed",
      "authorized",
      "expired",
      "orphaned",
    ],
    accepted: [
      "accepted",
      "working",
      "input_required",
      "outcome_unknown",
      "cancel_requested",
      "completed",
      "failed",
      "authorized",
      "expired",
      "orphaned",
    ],
    working: [
      "accepted",
      "working",
      "input_required",
      "outcome_unknown",
      "cancel_requested",
      "completed",
      "failed",
      "authorized",
      "expired",
      "orphaned",
    ],
    input_required: [
      "accepted",
      "working",
      "input_required",
      "outcome_unknown",
      "cancel_requested",
      "completed",
      "failed",
      "authorized",
      "expired",
      "orphaned",
    ],
    completed: [],
    failed: [],
    transport_unavailable: ["authorized", "expired", "orphaned"],
    outcome_unknown: [
      "reconciling",
      "cancel_requested",
      "completed",
      "failed",
      "authorized",
      "expired",
      "orphaned",
    ],
    reconciling: [
      "accepted",
      "working",
      "input_required",
      "outcome_unknown",
      "cancel_requested",
      "completed",
      "failed",
      "authorized",
      "expired",
      "orphaned",
    ],
    cancel_requested: [
      "accepted",
      "working",
      "input_required",
      "outcome_unknown",
      "reconciling",
      "completed",
      "failed",
      "authorized",
      "expired",
      "orphaned",
    ],
    expired: [],
    orphaned: ["reconciling"],
  };
  return allowed[from].includes(to);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function clone<T>(value: T): T {
  return structuredClone(value);
}
