import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import type { PacketEnvelopeV1 } from "@lnsat/packets";
import {
  createApprovalRequestV1,
  decideApprovalRequestV1,
  decidePacketEnvelopePolicyV1,
  type ApprovalDecisionV1,
  type ApprovalRequestV1,
  type PolicyDecisionV1,
} from "@lnsat/policy";
import {
  auditEventV1Contract,
  createAuditEventV1,
  type AuditEventV1Input,
} from "../src/index.js";

const repoRoot = dirname(dirname(dirname(dirname(fileURLToPath(import.meta.url)))));

describe("@lnsat/audit v1 event evidence", () => {
  it("matches all authoritative packet-policy-approval golden vectors", async () => {
    const schema = await readJson<Record<string, unknown>>(
      "packages/audit/schemas/audit-event-v1.schema.json",
    );
    const fixture = await readJson<AuditGoldenFixture>(
      "fixtures/contracts/audit-event-v1_0.json",
    );
    const chain = await approvalChain();

    expect(fixture.schema).toBe("lnsat.audit_event.golden_vectors.v1_0");
    expect(schema).toMatchObject({
      $schema: "https://json-schema.org/draft/2020-12/schema",
      $id: "https://lnsat.local/schemas/audit-event-v1.schema.json",
      additionalProperties: false,
    });

    for (const vector of fixture.vectors) {
      const result = await createAuditEventV1(inputFor(vector.event_type, chain), {
        observed_at: vector.observed_at,
      });
      expect(result).toMatchObject({
        ok: true,
        audit_event: {
          contract_version: "lnsat.contracts.v1_0",
          schema_id: "lnsat.audit_event.schema.v1_0",
          event_id: vector.expected_event_id,
          event_type: vector.event_type,
          result_status: vector.expected_result_status,
          source_evidence_hash: vector.expected_source_evidence_hash,
          authenticated_provenance: false,
          persistence_requested: false,
          execution_authorized: false,
          side_effects: [],
        },
        errors: [],
        side_effects: [],
      });
    }
  });

  it("matches shared audit source-chain validation vectors", async () => {
    const fixture = await readJson<AuditGoldenFixture>(
      "fixtures/contracts/audit-event-v1_0.json",
    );

    for (const testCase of fixture.validation_cases) {
      const chain = await approvalChain();
      const input = inputFor(testCase.event_type, chain);
      applyAuditMutation(input, testCase.mutation);
      const result = await createAuditEventV1(input, {
        observed_at: testCase.observed_at,
      });
      const actual = result.ok ? "ok" : result.errors[0]?.code;
      expect(actual, testCase.case_id).toBe(testCase.expected);
      expect(result.side_effects, testCase.case_id).toEqual([]);
      if (result.ok) {
        expect(result.audit_event.execution_authorized, testCase.case_id).toBe(false);
        expect(result.audit_event.persistence_requested, testCase.case_id).toBe(false);
      }
    }
    expect(fixture.validation_cases).toHaveLength(9);
  });

  it("freezes event families, identities, idempotency, and authority limits", () => {
    expect(auditEventV1Contract).toMatchObject({
      contract_id: "lnsat.audit_event.v1_0",
      contract_version: "lnsat.contracts.v1_0",
      schema_id: "lnsat.audit_event.schema.v1_0",
      event_types: [
        "policy.decision_recorded",
        "approval.request_recorded",
        "approval.decision_recorded",
      ],
      source_verification:
        "rebuild the complete packet-policy-approval chain before recording evidence",
      source_evidence_identity: {
        algorithm: "sha-256",
        output: "sha256:<lowercase_hex>",
      },
      event_identity: {
        algorithm: "sha-256",
        output: "aud_<lowercase_hex>",
      },
      persistence: "not_requested",
      execution_authorized: false,
      side_effects: [],
    });
  });

  it("records an allow policy decision without approval references", async () => {
    const packet = await readPacketVector();
    const policy = await decidePacketEnvelopePolicyV1(packet, {
      evaluated_at: packet.created_at,
    });
    if (!policy.ok) throw new Error("allow decision missing");

    const result = await createAuditEventV1(
      {
        event_type: "policy.decision_recorded",
        packet,
        policy_decision: policy.policy_decision,
      },
      { observed_at: "2026-07-22T20:00:01Z" },
    );

    expect(result).toMatchObject({
      ok: true,
      audit_event: {
        result_status: "allow",
        approval_request_ref: null,
        approval_decision_ref: null,
        reason_codes: [],
        actor_ref: packet.actor_ref,
        session_ref: packet.session_ref,
        persistence_requested: false,
        execution_authorized: false,
        side_effects: [],
      },
    });
  });

  it("rejects malformed event shapes and observation input without reflection", async () => {
    const chain = await approvalChain();
    const malformed = {
      ...inputFor("policy.decision_recorded", chain),
      attacker_secret: "withheld",
    } as AuditEventV1Input;
    const malformedResult = await createAuditEventV1(malformed, {
      observed_at: "2026-07-22T20:00:10Z",
    });
    expect(malformedResult).toMatchObject({
      ok: false,
      audit_event: null,
      errors: [{ code: "audit_event.invalid_input" }],
      side_effects: [],
    });
    expect(JSON.stringify(malformedResult)).not.toContain("attacker_secret");
    expect(JSON.stringify(malformedResult)).not.toContain("withheld");

    await expect(
      createAuditEventV1(inputFor("policy.decision_recorded", chain), {
        observed_at: "2026-02-31T00:00:00Z",
      }),
    ).resolves.toMatchObject({
      ok: false,
      errors: [{ code: "audit_event.invalid_observed_at" }],
      side_effects: [],
    });
    await expect(
      createAuditEventV1({ event_type: "future.event" } as never, {
        observed_at: "2026-07-22T20:00:10Z",
      }),
    ).resolves.toMatchObject({
      ok: false,
      errors: [{ code: "audit_event.invalid_input" }],
    });
    await expect(
      createAuditEventV1({ event_type: "toString" } as never, {
        observed_at: "2026-07-22T20:00:10Z",
      }),
    ).resolves.toMatchObject({
      ok: false,
      errors: [{ code: "audit_event.invalid_input" }],
    });

    const hostile = new Proxy(
      { event_type: "policy.decision_recorded" },
      {
        ownKeys() {
          throw new Error("raw-secret-marker");
        },
      },
    );
    const hostileResult = await createAuditEventV1(hostile as never, {
      observed_at: "2026-07-22T20:00:10Z",
    });
    expect(hostileResult).toMatchObject({
      ok: false,
      errors: [{ code: "audit_event.invalid_input" }],
    });
    expect(JSON.stringify(hostileResult)).not.toContain("raw-secret-marker");

    const hostileOptions = new Proxy(
      { observed_at: "2026-07-22T20:00:10Z" },
      {
        ownKeys() {
          throw new Error("raw-options-marker");
        },
      },
    );
    const hostileOptionsResult = await createAuditEventV1(
      inputFor("policy.decision_recorded", chain),
      hostileOptions,
    );
    expect(hostileOptionsResult).toMatchObject({
      ok: false,
      errors: [{ code: "audit_event.invalid_observed_at" }],
    });
    expect(JSON.stringify(hostileOptionsResult)).not.toContain("raw-options-marker");
  });

  it("rebuilds and rejects packet or policy drift", async () => {
    const chain = await approvalChain();
    const cases: AuditEventV1Input[] = [
      {
        event_type: "policy.decision_recorded",
        packet: { ...chain.packet, risk_level: 4 },
        policy_decision: chain.policy,
      },
      {
        event_type: "policy.decision_recorded",
        packet: chain.packet,
        policy_decision: { ...chain.policy, risk_level: 4 },
      },
    ];
    for (const input of cases) {
      await expect(
        createAuditEventV1(input, {
          observed_at: "2026-07-22T20:00:10Z",
        }),
      ).resolves.toMatchObject({
        ok: false,
        audit_event: null,
        errors: [{ code: "audit_event.source_evidence_mismatch" }],
        side_effects: [],
      });
    }
  });

  it("rebuilds and rejects approval request or decision drift", async () => {
    const chain = await approvalChain();
    const requestDrift: AuditEventV1Input = {
      event_type: "approval.request_recorded",
      packet: chain.packet,
      policy_decision: chain.policy,
      approval_request: {
        ...chain.request,
        project_ref: "project:other",
      },
    };
    const decisionDrift: AuditEventV1Input = {
      event_type: "approval.decision_recorded",
      packet: chain.packet,
      policy_decision: chain.policy,
      approval_request: chain.request,
      approval_decision: {
        ...chain.decision,
        approval_decision_id: `apd_${"0".repeat(64)}`,
      },
    };

    for (const input of [requestDrift, decisionDrift]) {
      await expect(
        createAuditEventV1(input, {
          observed_at: "2026-07-22T20:02:10Z",
        }),
      ).resolves.toMatchObject({
        ok: false,
        errors: [{ code: "audit_event.source_evidence_mismatch" }],
        side_effects: [],
      });
    }
  });

  it("rejects observation before each source event", async () => {
    const chain = await approvalChain();
    const cases = [
      {
        input: inputFor("policy.decision_recorded", chain),
        observed_at: "2026-07-22T19:59:59Z",
      },
      {
        input: inputFor("approval.request_recorded", chain),
        observed_at: "2026-07-22T20:00:59Z",
      },
      {
        input: inputFor("approval.decision_recorded", chain),
        observed_at: "2026-07-22T20:01:59Z",
      },
    ];
    for (const testCase of cases) {
      await expect(
        createAuditEventV1(testCase.input, {
          observed_at: testCase.observed_at,
        }),
      ).resolves.toMatchObject({
        ok: false,
        audit_event: null,
        errors: [{ code: "audit_event.observed_before_event" }],
        side_effects: [],
      });
    }
  });

  it("uses terminal source identity for deterministic idempotency", async () => {
    const chain = await approvalChain();
    const inputs = [
      inputFor("policy.decision_recorded", chain),
      inputFor("approval.request_recorded", chain),
      inputFor("approval.decision_recorded", chain),
    ];
    const terminalIds = [
      chain.policy.decision_id,
      chain.request.approval_request_id,
      chain.decision.approval_decision_id,
    ];

    for (const [index, input] of inputs.entries()) {
      const observedAt =
        index === 0
          ? "2026-07-22T20:00:10Z"
          : index === 1
            ? "2026-07-22T20:01:10Z"
            : "2026-07-22T20:02:10Z";
      const result = await createAuditEventV1(input, {
        observed_at: observedAt,
      });
      expect(result).toMatchObject({
        ok: true,
        audit_event: {
          idempotency_key: `audit:${input.event_type}:${terminalIds[index]}`,
        },
      });
    }
  });

  it("replays exactly and changes only event identity when observation changes", async () => {
    const chain = await approvalChain();
    const input = inputFor("approval.decision_recorded", chain);
    const first = await createAuditEventV1(input, {
      observed_at: "2026-07-22T20:02:10Z",
    });
    const replay = await createAuditEventV1(structuredClone(input), {
      observed_at: "2026-07-22T20:02:10Z",
    });
    const later = await createAuditEventV1(structuredClone(input), {
      observed_at: "2026-07-22T20:02:11Z",
    });

    expect(replay).toEqual(first);
    expect(first.ok && later.ok).toBe(true);
    if (!first.ok || !later.ok) throw new Error("audit event missing");
    expect(later.audit_event.event_id).not.toBe(first.audit_event.event_id);
    expect(later.audit_event.source_evidence_hash).toBe(
      first.audit_event.source_evidence_hash,
    );
    expect(later.audit_event.idempotency_key).toBe(first.audit_event.idempotency_key);
  });

  it("snapshots the complete chain and options before async verification", async () => {
    const chain = await approvalChain();
    const input = inputFor("approval.decision_recorded", chain);
    const options = { observed_at: "2026-07-22T20:02:10Z" };
    const pending = createAuditEventV1(input, options);
    chain.policy.actor_ref = "identity:agent:mutated";
    chain.request.project_ref = "project:mutated";
    chain.decision.approver_ref = "identity:human:mutated";
    options.observed_at = "2026-07-22T20:03:00Z";
    const result = await pending;

    expect(result).toMatchObject({
      ok: true,
      audit_event: {
        actor_ref: "identity:human:owner",
        project_ref: "project:lnsat",
        observed_at: "2026-07-22T20:02:10Z",
      },
    });
  });
});

type ApprovalChain = {
  packet: PacketEnvelopeV1;
  policy: PolicyDecisionV1;
  request: ApprovalRequestV1;
  decision: ApprovalDecisionV1;
};

async function approvalChain(): Promise<ApprovalChain> {
  const packet = await readPacketVector();
  packet.permission_envelope.allow = ["deploy.request"];
  const policy = await decidePacketEnvelopePolicyV1(packet, {
    evaluated_at: "2026-07-22T20:00:00Z",
  });
  if (!policy.ok) throw new Error("policy decision missing");
  const request = await createApprovalRequestV1(policy.policy_decision, {
    requested_at: "2026-07-22T20:01:00Z",
  });
  if (!request.ok) throw new Error("approval request missing");
  const decision = await decideApprovalRequestV1(request.approval_request, {
    approver_ref: "identity:human:owner",
    approver_session_ref: "session:local:owner-0001",
    decision: "approved",
    reason_code: "approval.operator_approved",
    decided_at: "2026-07-22T20:02:00Z",
  });
  if (!decision.ok) throw new Error("approval decision missing");
  return {
    packet,
    policy: policy.policy_decision,
    request: request.approval_request,
    decision: decision.approval_decision,
  };
}

function inputFor(
  eventType: AuditGoldenVector["event_type"],
  chain: ApprovalChain,
): AuditEventV1Input {
  if (eventType === "policy.decision_recorded") {
    return {
      event_type: eventType,
      packet: chain.packet,
      policy_decision: chain.policy,
    };
  }
  if (eventType === "approval.request_recorded") {
    return {
      event_type: eventType,
      packet: chain.packet,
      policy_decision: chain.policy,
      approval_request: chain.request,
    };
  }
  return {
    event_type: eventType,
    packet: chain.packet,
    policy_decision: chain.policy,
    approval_request: chain.request,
    approval_decision: chain.decision,
  };
}

function applyAuditMutation(
  input: AuditEventV1Input,
  mutation: AuditValidationCase["mutation"],
): void {
  switch (mutation) {
    case "none":
      return;
    case "tamper_packet":
      input.packet.risk_level = 4;
      return;
    case "tamper_policy":
      input.policy_decision.risk_level = 4;
      return;
    case "tamper_request":
      if (input.event_type === "policy.decision_recorded") {
        throw new Error("request mutation requires approval evidence");
      }
      input.approval_request.project_ref = "project:other";
      return;
    case "tamper_decision":
      if (input.event_type !== "approval.decision_recorded") {
        throw new Error("decision mutation requires decision evidence");
      }
      input.approval_decision.approval_decision_id = `apd_${"0".repeat(64)}`;
  }
}

async function readPacketVector(): Promise<PacketEnvelopeV1> {
  const fixture = await readJson<PacketGoldenFixture>(
    "fixtures/contracts/packet-envelope-v1_0.json",
  );
  const packet = fixture.vectors[0]?.packet;
  if (packet === undefined) throw new Error("packet vector missing");
  return packet;
}

async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(join(repoRoot, path), "utf8")) as T;
}

type PacketGoldenFixture = {
  vectors: Array<{ packet: PacketEnvelopeV1 }>;
};

type AuditGoldenVector = {
  event_type:
    | "policy.decision_recorded"
    | "approval.request_recorded"
    | "approval.decision_recorded";
  observed_at: string;
  expected_event_id: string;
  expected_source_evidence_hash: string;
  expected_result_status: string;
};

type AuditValidationCase = {
  case_id: string;
  event_type: AuditGoldenVector["event_type"];
  mutation:
    "none" | "tamper_packet" | "tamper_policy" | "tamper_request" | "tamper_decision";
  observed_at: string;
  expected: string;
};

type AuditGoldenFixture = {
  schema: string;
  vectors: AuditGoldenVector[];
  validation_cases: AuditValidationCase[];
};
