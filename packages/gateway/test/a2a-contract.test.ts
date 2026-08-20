import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  inspectA2aAgentCard,
  mapA2aMessageToGatewayOperation,
  mapA2aTaskObservation,
  validateA2aPushTarget,
  type A2aAgentCard,
  type A2aAgentCardInspection,
  type A2aMessage,
  type GatewayOperationPrepareInput,
} from "../src/index.js";

const now = new Date("2026-08-04T00:00:00.000Z");
const fixturePath = join(
  process.cwd(),
  "../../fixtures/contracts/a2a-v1-authority-mapping-v0_1.json",
);

describe("A2A 1.0 transport-neutral authority mapping", () => {
  it("verifies active Agent Card identity without granting action authority", async () => {
    const fixture = await readFixture();
    const inspection = await inspect(fixture.agent_card);

    expect(inspection).toMatchObject({
      ok: true,
      protocol_version: "1.0",
      agent_id: "agent.example.readonly",
      card_digest: expect.stringMatching(/^sha256:[a-f0-9]{64}$/),
      signature_verified: true,
      key_status: "active",
      metadata_trusted_for_authority: false,
      action_authorized: false,
      side_effects: [],
    });
    expect(JSON.stringify(inspection)).not.toContain("private");
  });

  it.each(["revoked", "expired"] as const)(
    "rejects %s Agent Card key",
    async (status) => {
      const fixture = await readFixture();
      const result = await inspectA2aAgentCard({
        card: fixture.agent_card,
        resolved_ips: ["8.8.8.8"],
        redirect_chain: [],
        now,
        verifier: {
          verify: async () => ({
            ok: true,
            agent_id: fixture.agent_card.agent_id,
            key_id: fixture.agent_card.signing.key_id,
            key_status: status,
            key_expires_at: "2026-09-04T00:00:00.000Z",
          }),
        },
      });
      expect(result).toMatchObject({
        ok: false,
        error_code: "a2a.card.key_inactive",
        action_authorized: false,
      });
    },
  );

  it("contains signature verifier failure and identity substitution", async () => {
    const fixture = await readFixture();
    const substituted = await inspectA2aAgentCard({
      card: fixture.agent_card,
      resolved_ips: ["8.8.8.8"],
      redirect_chain: [],
      now,
      verifier: {
        verify: async () => ({
          ok: true,
          agent_id: "agent.substituted",
          key_id: fixture.agent_card.signing.key_id,
          key_status: "active",
          key_expires_at: "2026-09-04T00:00:00.000Z",
        }),
      },
    });
    expect(substituted).toMatchObject({
      ok: false,
      error_code: "a2a.card.signature_invalid",
    });

    const thrown = await inspectA2aAgentCard({
      card: fixture.agent_card,
      resolved_ips: ["8.8.8.8"],
      redirect_chain: [],
      now,
      verifier: { verify: async () => Promise.reject(new Error("raw verifier error")) },
    });
    expect(thrown).toEqual({
      ok: false,
      error_code: "a2a.card.signature_invalid",
      action_authorized: false,
      side_effects: [],
    });
  });

  it("maps message identity while preserving independent LNSAT idempotency", async () => {
    const fixture = await readFixture();
    const card = expectInspection(await inspect(fixture.agent_card));
    const mapped = mapA2aMessageToGatewayOperation({
      card,
      message: fixture.message,
      operation: operation(),
    });

    expect(mapped).toMatchObject({
      ok: true,
      operation: {
        operation_id: "op_a2a_operation_0001",
        idempotency_key: "idem_a2a_operation_0001",
        protocol: "a2a",
        protocol_version: "1.0",
        remote_identity: "a2a:agent.example.readonly",
        a2a_task_id: "a2a-task-0001",
        a2a_context_id: "a2a-context-0001",
        a2a_message_id: "a2a-message-0001",
      },
      a2a_idempotency_advisory: "a2a-advisory-0001",
      cancellation_maps_to_request_only: false,
      push_and_stream_untrusted: true,
      action_authorized_by_a2a: false,
      side_effects: [],
    });
  });

  it("rejects A2A idempotency substitution and principal mismatch", async () => {
    const fixture = await readFixture();
    const card = expectInspection(await inspect(fixture.agent_card));
    expect(
      mapA2aMessageToGatewayOperation({
        card,
        message: {
          ...fixture.message,
          a2a_idempotency_key: "idem_a2a_operation_0001",
        },
        operation: operation(),
      }),
    ).toMatchObject({ ok: false, error_code: "a2a.message.invalid" });
    expect(
      mapA2aMessageToGatewayOperation({
        card,
        message: { ...fixture.message, principal_ref: "user:mallory" },
        operation: operation(),
      }),
    ).toMatchObject({ ok: false, error_code: "a2a.message.invalid" });
  });

  it("rejects forged JSON inspection success without verifier-issued handle", async () => {
    const fixture = await readFixture();
    const verified = expectInspection(await inspect(fixture.agent_card));
    const forged = JSON.parse(JSON.stringify(verified)) as typeof verified;

    expect(
      mapA2aMessageToGatewayOperation({
        card: forged,
        message: fixture.message,
        operation: operation(),
      }),
    ).toMatchObject({ ok: false, error_code: "a2a.message.invalid" });
  });

  it.each([
    ["submitted", "accepted"],
    ["working", "working"],
    ["input-required", "input_required"],
    ["auth-required", "input_required"],
    ["completed", "outcome_unknown"],
    ["failed", "outcome_unknown"],
    ["canceled", "outcome_unknown"],
    ["rejected", "outcome_unknown"],
    ["unknown", "outcome_unknown"],
  ] as const)("maps A2A %s to non-authoritative %s", (state, expected) => {
    expect(
      mapA2aTaskObservation({ state, artifact_refs: ["artifact:result:0001"] }),
    ).toEqual({
      ok: true,
      gateway_observation_state: expected,
      artifact_refs: ["artifact:result:0001"],
      can_complete: false,
      can_approve: false,
      can_authorize: false,
      side_effects: [],
    });
  });

  it("blocks push URL SSRF, redirects, private networks, and credential leakage", () => {
    expect(
      validateA2aPushTarget({
        url: "https://push.example.test/a2a/events",
        resolved_ips: ["8.8.8.8"],
        redirect_chain: [],
      }),
    ).toMatchObject({
      ok: true,
      dns_revalidation_required: true,
      redirects_allowed: false,
      credentials_forwarded: false,
    });

    for (const candidate of [
      {
        url: "http://push.example.test/a2a/events",
        resolved_ips: ["8.8.8.8"],
        redirect_chain: [],
      },
      {
        url: "https://push.example.test/a2a/events?token=forbidden",
        resolved_ips: ["8.8.8.8"],
        redirect_chain: [],
      },
      {
        url: "https://127.0.0.1/a2a/events",
        resolved_ips: ["8.8.8.8"],
        redirect_chain: [],
      },
      {
        url: "https://push.example.test/a2a/events",
        resolved_ips: ["10.0.0.1"],
        redirect_chain: [],
      },
      {
        url: "https://push.example.test/a2a/events",
        resolved_ips: ["8.8.8.8"],
        redirect_chain: ["https://redirect.example.test/a2a/events"],
      },
    ]) {
      expect(validateA2aPushTarget(candidate).ok).toBe(false);
    }
  });
});

async function inspect(card: A2aAgentCard) {
  return inspectA2aAgentCard({
    card,
    resolved_ips: ["8.8.8.8"],
    redirect_chain: [],
    now,
    verifier: {
      verify: async (candidate) => ({
        ok: true,
        agent_id: candidate.agent_id,
        key_id: candidate.signing.key_id,
        key_status: "active",
        key_expires_at: "2026-09-04T00:00:00.000Z",
      }),
    },
  });
}

function operation(): Omit<
  GatewayOperationPrepareInput,
  | "remote_identity"
  | "protocol"
  | "protocol_version"
  | "a2a_task_id"
  | "a2a_context_id"
  | "a2a_message_id"
> {
  return {
    tenant_id: "tenant-a",
    project_id: "project-a",
    operation_id: "op_a2a_operation_0001",
    canonical_packet_digest: `sha256:${"a".repeat(64)}`,
    tool_argument_digest: `sha256:${"b".repeat(64)}`,
    authorization_id: "authz:a2a:0001",
    authorization_expires_at: new Date("2026-08-04T00:30:00.000Z"),
    idempotency_key: "idem_a2a_operation_0001",
    requester_identity: "user:alice",
    workload_identity: null,
    adapter_identity: "adapter:a2a:readonly",
    requested_at: now,
    mcp_task_id: null,
    trace_id: null,
  };
}

function expectInspection(
  value: A2aAgentCardInspection,
): Extract<A2aAgentCardInspection, { ok: true }> {
  expect(value.ok).toBe(true);
  if (!value.ok) throw new Error(value.error_code);
  return value;
}

async function readFixture(): Promise<{
  agent_card: A2aAgentCard;
  message: A2aMessage;
}> {
  return JSON.parse(await readFile(fixturePath, "utf8"));
}
