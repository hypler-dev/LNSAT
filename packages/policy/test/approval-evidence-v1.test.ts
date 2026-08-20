import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import type { PacketEnvelopeV1 } from "@lnsat/packets";
import {
  approvalEvidenceV1Contract,
  createApprovalRequestV1,
  decideApprovalRequestV1,
  decidePacketEnvelopePolicyV1,
  type ApprovalRequestV1,
  type PolicyDecisionV1,
} from "../src/index.js";

const repoRoot = dirname(dirname(dirname(dirname(fileURLToPath(import.meta.url)))));

describe("@lnsat/policy v1 approval evidence", () => {
  it("matches the authoritative request and human-decision golden vector", async () => {
    const requestSchema = await readJson<Record<string, unknown>>(
      "packages/policy/schemas/approval-request-v1.schema.json",
    );
    const decisionSchema = await readJson<Record<string, unknown>>(
      "packages/policy/schemas/approval-decision-v1.schema.json",
    );
    const fixture = await readJson<ApprovalGoldenFixture>(
      "fixtures/contracts/approval-evidence-v1_0.json",
    );
    const vector = fixture.vectors[0];
    if (vector === undefined) throw new Error("approval vector missing");

    const policyDecision = await approvalRequiredPolicyDecision();
    const requestResult = await createApprovalRequestV1(policyDecision, {
      requested_at: vector.requested_at,
    });
    expect(requestResult.ok).toBe(true);
    if (!requestResult.ok) throw new Error("approval request not created");

    const decisionResult = await decideApprovalRequestV1(
      requestResult.approval_request,
      {
        approver_ref: vector.approver_ref,
        approver_session_ref: vector.approver_session_ref,
        decision: vector.decision,
        reason_code: vector.reason_code,
        decided_at: vector.decided_at,
      },
    );

    expect(fixture.schema).toBe("lnsat.approval_evidence.golden_vectors.v1_0");
    expect(requestSchema).toMatchObject({
      $schema: "https://json-schema.org/draft/2020-12/schema",
      $id: "https://lnsat.local/schemas/approval-request-v1.schema.json",
      additionalProperties: false,
    });
    expect(decisionSchema).toMatchObject({
      $schema: "https://json-schema.org/draft/2020-12/schema",
      $id: "https://lnsat.local/schemas/approval-decision-v1.schema.json",
      additionalProperties: false,
    });
    expect(requestResult.approval_request).toMatchObject({
      contract_version: "lnsat.contracts.v1_0",
      schema_id: "lnsat.approval_request.schema.v1_0",
      approval_request_id: vector.expected.approval_request_id,
      policy_decision_ref: {
        decision_id: vector.expected.policy_decision_id,
        packet_hash: vector.expected.packet_hash,
      },
      requested_capabilities: vector.expected.requested_capabilities,
      policy_reason_codes: vector.expected.policy_reason_codes,
      side_effects: vector.expected.side_effects,
    });
    expect(decisionResult).toMatchObject({
      ok: true,
      approval_decision: {
        schema_id: "lnsat.approval_decision.schema.v1_0",
        approval_decision_id: vector.expected.approval_decision_id,
        decision: vector.decision,
        approval_gate_satisfied: vector.expected.approval_gate_satisfied,
        execution_authorized: vector.expected.execution_authorized,
        side_effects: vector.expected.side_effects,
      },
      errors: [],
      side_effects: [],
    });
  });

  it("freezes identity, validity, human separation, and authority boundaries", () => {
    expect(approvalEvidenceV1Contract).toMatchObject({
      contract_version: "lnsat.contracts.v1_0",
      approval_request: {
        contract_id: "lnsat.approval_request.v1_0",
        schema_id: "lnsat.approval_request.schema.v1_0",
        identity: {
          algorithm: "sha-256",
          output: "apr_<lowercase_hex>",
        },
      },
      approval_decision: {
        contract_id: "lnsat.approval_decision.v1_0",
        schema_id: "lnsat.approval_decision.schema.v1_0",
        identity: {
          algorithm: "sha-256",
          output: "apd_<lowercase_hex>",
        },
      },
      approver_requirement: "identity:human:* and not requester_ref",
      replay_behavior: "exact input produces exact evidence identity",
      authority_boundary:
        "approved satisfies one bound approval gate; it never authorizes execution",
      side_effects: [],
    });
  });

  it("matches all shared approval evidence validation cases", async () => {
    const fixture = await readJson<ApprovalGoldenFixture>(
      "fixtures/contracts/approval-evidence-v1_0.json",
    );
    expect(fixture.validation_cases).toHaveLength(14);

    for (const testCase of fixture.validation_cases) {
      const result =
        testCase.stage === "request"
          ? await runRequestValidationCase(testCase.mutation)
          : await runDecisionValidationCase(testCase.mutation);
      const actual = result.ok ? "ok" : result.errors[0]?.code;
      expect(actual, testCase.case_id).toBe(testCase.expected);
      expect(result.side_effects, testCase.case_id).toEqual([]);
      if (result.ok && "approval_decision" in result) {
        expect(result.approval_decision).toMatchObject({
          decision: testCase.expected_decision,
          reason_code: testCase.expected_reason,
          approval_gate_satisfied: testCase.expected_gate_satisfied,
          execution_authorized: false,
          side_effects: [],
        });
      }
    }
  });

  it("rejects non-required, malformed, or identity-tampered policy evidence", async () => {
    const packet = await readPacketVector();
    const allow = await decidePacketEnvelopePolicyV1(packet, {
      evaluated_at: packet.created_at,
    });
    if (!allow.ok) throw new Error("allow policy decision missing");
    await expect(
      createApprovalRequestV1(allow.policy_decision, {
        requested_at: "2026-07-22T20:01:00Z",
      }),
    ).resolves.toMatchObject({
      ok: false,
      errors: [{ code: "approval_request.not_required" }],
      side_effects: [],
    });

    const approval = await approvalRequiredPolicyDecision();
    const tampered = {
      ...approval,
      decision_id: `pol_${"0".repeat(64)}`,
    } as PolicyDecisionV1;
    await expect(
      createApprovalRequestV1(tampered, {
        requested_at: "2026-07-22T20:01:00Z",
      }),
    ).resolves.toMatchObject({
      ok: false,
      approval_request: null,
      errors: [{ code: "approval_request.invalid_policy_decision" }],
      side_effects: [],
    });

    const semanticTamper = {
      ...approval,
      risk_level: 6,
    } as PolicyDecisionV1;
    await expect(
      createApprovalRequestV1(semanticTamper, {
        requested_at: "2026-07-22T20:01:00Z",
      }),
    ).resolves.toMatchObject({
      ok: false,
      errors: [{ code: "approval_request.invalid_policy_decision" }],
      side_effects: [],
    });

    const malformed = {
      ...approval,
      attacker_secret: "withheld",
    } as PolicyDecisionV1;
    const result = await createApprovalRequestV1(malformed, {
      requested_at: "2026-07-22T20:01:00Z",
    });
    expect(result).toMatchObject({
      ok: false,
      errors: [{ code: "approval_request.invalid_policy_decision" }],
    });
    expect(JSON.stringify(result)).not.toContain("attacker_secret");
    expect(JSON.stringify(result)).not.toContain("withheld");
  });

  it("rejects missing, malformed, early, or expired request times", async () => {
    const policyDecision = await approvalRequiredPolicyDecision();
    const cases = [
      {
        options: undefined as never,
        code: "approval_request.invalid_request_time",
      },
      {
        options: { requested_at: "2026-02-31T00:00:00Z" },
        code: "approval_request.invalid_request_time",
      },
      {
        options: { requested_at: "2026-07-22T19:59:59Z" },
        code: "approval_request.expired",
      },
      {
        options: { requested_at: policyDecision.expires_at },
        code: "approval_request.expired",
      },
    ];
    for (const testCase of cases) {
      await expect(
        createApprovalRequestV1(policyDecision, testCase.options),
      ).resolves.toMatchObject({
        ok: false,
        approval_request: null,
        errors: [{ code: testCase.code }],
        side_effects: [],
      });
    }
  });

  it("snapshots policy evidence before async hashing", async () => {
    const policyDecision = await approvalRequiredPolicyDecision();
    const originalRequester = policyDecision.actor_ref;
    const pending = createApprovalRequestV1(policyDecision, {
      requested_at: "2026-07-22T20:01:00Z",
    });
    policyDecision.actor_ref = "identity:agent:mutated";
    const result = await pending;

    expect(result).toMatchObject({
      ok: true,
      approval_request: { requester_ref: originalRequester },
    });
  });

  it("records denial without satisfying the gate or authorizing execution", async () => {
    const request = await approvalRequest();
    const result = await decideApprovalRequestV1(request, {
      approver_ref: "identity:human:security-reviewer",
      approver_session_ref: "session:local:security-reviewer-0001",
      decision: "denied",
      reason_code: "approval.scope_rejected",
      decided_at: "2026-07-22T20:02:00Z",
    });

    expect(result).toMatchObject({
      ok: true,
      approval_decision: {
        decision: "denied",
        reason_code: "approval.scope_rejected",
        approval_gate_satisfied: false,
        execution_authorized: false,
        side_effects: [],
      },
      errors: [],
      side_effects: [],
    });
  });

  it("requires a distinct human approver", async () => {
    const request = await approvalRequest();
    await expect(
      decideApprovalRequestV1(request, {
        approver_ref: "identity:agent:reviewer",
        approver_session_ref: "session:local:reviewer-0001",
        decision: "approved",
        reason_code: "approval.operator_approved",
        decided_at: "2026-07-22T20:02:00Z",
      }),
    ).resolves.toMatchObject({
      ok: false,
      errors: [{ code: "approval_decision.invalid_input" }],
    });

    const selfRequest = await approvalRequest("identity:human:owner");
    await expect(
      decideApprovalRequestV1(selfRequest, {
        approver_ref: "identity:human:owner",
        approver_session_ref: "session:local:owner-0001",
        decision: "approved",
        reason_code: "approval.operator_approved",
        decided_at: "2026-07-22T20:02:00Z",
      }),
    ).resolves.toMatchObject({
      ok: false,
      errors: [{ code: "approval_decision.self_approval_forbidden" }],
    });
  });

  it("rejects outcome/reason mismatches and malformed decision input", async () => {
    const request = await approvalRequest();
    const cases = [
      {
        options: {
          approver_ref: "identity:human:owner",
          approver_session_ref: "session:local:owner-0001",
          decision: "approved",
          reason_code: "approval.operator_denied",
          decided_at: "2026-07-22T20:02:00Z",
        },
      },
      {
        options: {
          approver_ref: "identity:human:owner",
          approver_session_ref: "session:local:owner-0001",
          decision: "denied",
          reason_code: "approval.operator_approved",
          decided_at: "2026-07-22T20:02:00Z",
        },
      },
      {
        options: {
          approver_ref: "identity:human:owner",
          approver_session_ref: "session:local:owner-0001",
          decision: "approved",
          reason_code: "approval.operator_approved",
          decided_at: "not-an-instant",
        },
      },
    ];

    for (const testCase of cases) {
      await expect(
        decideApprovalRequestV1(request, testCase.options as never),
      ).resolves.toMatchObject({
        ok: false,
        approval_decision: null,
        errors: [{ code: "approval_decision.invalid_input" }],
        side_effects: [],
      });
    }
  });

  it("rejects decisions before request time or at expiry", async () => {
    const request = await approvalRequest();
    for (const decidedAt of ["2026-07-22T20:00:59Z", request.expires_at]) {
      await expect(
        decideApprovalRequestV1(request, {
          approver_ref: "identity:human:owner",
          approver_session_ref: "session:local:owner-0001",
          decision: "approved",
          reason_code: "approval.operator_approved",
          decided_at: decidedAt,
        }),
      ).resolves.toMatchObject({
        ok: false,
        errors: [{ code: "approval_decision.expired" }],
        side_effects: [],
      });
    }
  });

  it("rejects malformed or identity-tampered approval requests", async () => {
    const request = await approvalRequest();
    const cases = [
      { ...request, attacker_secret: "withheld" },
      { ...request, approval_request_id: `apr_${"0".repeat(64)}` },
      { ...request, project_ref: "project:other" },
    ] as ApprovalRequestV1[];

    for (const testCase of cases) {
      const result = await decideApprovalRequestV1(testCase, {
        approver_ref: "identity:human:owner",
        approver_session_ref: "session:local:owner-0001",
        decision: "approved",
        reason_code: "approval.operator_approved",
        decided_at: "2026-07-22T20:02:00Z",
      });
      expect(result).toMatchObject({
        ok: false,
        approval_decision: null,
        errors: [{ code: "approval_decision.invalid_request" }],
        side_effects: [],
      });
      expect(JSON.stringify(result)).not.toContain("attacker_secret");
      expect(JSON.stringify(result)).not.toContain("withheld");
    }
  });

  it("replays exact evidence deterministically and snapshots request input", async () => {
    const request = await approvalRequest();
    const options: {
      approver_ref: string;
      approver_session_ref: string;
      decision: "approved";
      reason_code: "approval.operator_approved";
      decided_at: string;
    } = {
      approver_ref: "identity:human:owner",
      approver_session_ref: "session:local:owner-0001",
      decision: "approved" as const,
      reason_code: "approval.operator_approved" as const,
      decided_at: "2026-07-22T20:02:00Z",
    };
    const first = await decideApprovalRequestV1(request, options);
    const replay = await decideApprovalRequestV1(structuredClone(request), options);
    expect(replay).toEqual(first);

    const originalProject = request.project_ref;
    const pending = decideApprovalRequestV1(request, options);
    request.project_ref = "project:mutated";
    options.approver_ref = "identity:human:mutated";
    options.approver_session_ref = "session:local:mutated";
    const result = await pending;
    expect(result).toEqual(first);
    expect(originalProject).toBe("project:lnsat");
  });
});

async function approvalRequest(
  actorRef = "identity:agent:codex",
): Promise<ApprovalRequestV1> {
  const result = await createApprovalRequestV1(
    await approvalRequiredPolicyDecision(actorRef),
    { requested_at: "2026-07-22T20:01:00Z" },
  );
  if (!result.ok) throw new Error("approval request missing");
  return result.approval_request;
}

async function runRequestValidationCase(mutation: string) {
  let policy =
    mutation === "use_allow_policy"
      ? await allowPolicyDecision()
      : await approvalRequiredPolicyDecision();
  let requestedAt = "2026-07-22T20:01:00Z";
  if (mutation === "tamper_policy_id") {
    policy = { ...policy, decision_id: `pol_${"0".repeat(64)}` };
  } else if (mutation === "tamper_policy_risk") {
    policy = { ...policy, risk_level: 6 };
  } else if (mutation === "malformed_request_time") {
    requestedAt = "2026-02-31T00:00:00Z";
  } else if (mutation === "early_request_time") {
    requestedAt = "2026-07-22T19:59:59Z";
  } else if (mutation === "expired_request_time") {
    requestedAt = policy.expires_at;
  }
  return createApprovalRequestV1(policy, { requested_at: requestedAt });
}

async function runDecisionValidationCase(mutation: string) {
  const actorRef =
    mutation === "self_approval" ? "identity:human:owner" : "identity:agent:codex";
  let request = await approvalRequest(actorRef);
  const options = {
    approver_ref: "identity:human:owner",
    approver_session_ref: "session:local:owner-0001",
    decision: "approved" as "approved" | "denied",
    reason_code: "approval.operator_approved" as
      "approval.operator_approved" | "approval.scope_rejected",
    decided_at: "2026-07-22T20:02:00Z",
  };
  if (mutation === "deny_scope") {
    options.decision = "denied";
    options.reason_code = "approval.scope_rejected";
  } else if (mutation === "nonhuman_approver") {
    options.approver_ref = "identity:agent:reviewer";
  } else if (mutation === "mismatched_reason") {
    options.reason_code = "approval.scope_rejected";
  } else if (mutation === "early_decision_time") {
    options.decided_at = "2026-07-22T20:00:59Z";
  } else if (mutation === "expired_decision_time") {
    options.decided_at = request.expires_at;
  } else if (mutation === "tamper_request_id") {
    request = { ...request, approval_request_id: `apr_${"0".repeat(64)}` };
  } else if (mutation === "tamper_request_project") {
    request = { ...request, project_ref: "project:other" };
  }
  return decideApprovalRequestV1(request, options);
}

async function allowPolicyDecision(): Promise<PolicyDecisionV1> {
  const packet = await readPacketVector();
  const result = await decidePacketEnvelopePolicyV1(packet, {
    evaluated_at: packet.created_at,
  });
  if (!result.ok) throw new Error("allow policy decision missing");
  return result.policy_decision;
}

async function approvalRequiredPolicyDecision(
  actorRef = "identity:agent:codex",
): Promise<PolicyDecisionV1> {
  const packet = await readPacketVector();
  packet.actor_ref = actorRef;
  packet.permission_envelope.allow = ["deploy.request"];
  const result = await decidePacketEnvelopePolicyV1(packet, {
    evaluated_at: packet.created_at,
  });
  if (!result.ok) throw new Error("policy decision missing");
  return result.policy_decision;
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
  vectors: Array<{ case_id: string; packet: PacketEnvelopeV1 }>;
};

type ApprovalGoldenFixture = {
  schema: string;
  vectors: Array<{
    requested_at: string;
    approver_ref: string;
    approver_session_ref: string;
    decision: "approved";
    reason_code: "approval.operator_approved";
    decided_at: string;
    expected: {
      policy_decision_id: string;
      packet_hash: string;
      approval_request_id: string;
      approval_decision_id: string;
      requested_capabilities: string[];
      policy_reason_codes: string[];
      approval_gate_satisfied: boolean;
      execution_authorized: boolean;
      side_effects: [];
    };
  }>;
  validation_cases: Array<{
    case_id: string;
    stage: "request" | "decision";
    mutation: string;
    expected: string;
    expected_decision?: string;
    expected_reason?: string;
    expected_gate_satisfied?: boolean;
  }>;
};
