import { describe, expect, it } from "vitest";
import {
  AUDIT_LEDGER_MIGRATION_APPROVAL_PREVIEW_STATUS,
  AUDIT_LEDGER_WRITER_APPROVAL_REQUEST_STATUS,
  AUDIT_LEDGER_WRITER_CAPABILITY,
  AUDIT_LEDGER_WRITER_APPROVAL_REQUEST_CONTRACT_ID,
  AUDIT_LEDGER_WRITER_POLICY_GATE_STATUS,
  AUDIT_LEDGER_MIGRATION_APPROVAL_PREVIEW_CONTRACT_ID,
  AUDIT_LEDGER_WRITER_POLICY_GATE_CONTRACT_ID,
  POLICY_DECISION_V1_STATUS,
  POLICY_ENGINE_STATUS,
  createAuditLedgerWriterApprovalRequest,
  createAuditLedgerMigrationApprovalEvidencePreview,
  decideAuditLedgerWriterPolicyGate,
  decideUniversalPacketPolicy,
  type PolicyDecision,
} from "../src/index.js";
import type { UniversalPacket } from "@lnsat/packets";

const createdAt = new Date("2026-05-03T00:00:00.000Z");

describe("policy source status vocabulary", () => {
  it("uses neutral metadata without milestone chronology", () => {
    expect([
      POLICY_ENGINE_STATUS,
      POLICY_DECISION_V1_STATUS,
      AUDIT_LEDGER_WRITER_POLICY_GATE_STATUS,
      AUDIT_LEDGER_WRITER_APPROVAL_REQUEST_STATUS,
      AUDIT_LEDGER_MIGRATION_APPROVAL_PREVIEW_STATUS,
    ]).toEqual([
      "source_only",
      "contract_only",
      "source_only",
      "source_only",
      "source_only",
    ]);
  });
});

describe("@lnsat/policy decision skeleton", () => {
  it("allows a valid low-risk context packet", () => {
    const decision = decide(fixturePacket());

    expect(decision).toEqual({
      decision_id: "pol_context_0001",
      packet_id: "pkt_context_0001",
      actor_id: "agent.codex",
      session_id: "sess_bp0006_0001",
      resource_refs: ["repo:lnsat"],
      capability: "context.read",
      risk_level: 1,
      decision: "allow",
      requires_approval: false,
      reason_codes: [],
      created_at: "2026-05-03T00:00:00.000Z",
    });
  });

  it("denies packets that request an explicitly blocked capability", () => {
    const decision = decide(
      fixturePacket({
        permission_envelope: {
          allow: ["tests.run.sandbox"],
          block: ["tests.run.sandbox", "secret.read.never"],
        },
      }),
    );

    expect(decision).toMatchObject({
      capability: "tests.run.sandbox",
      decision: "deny",
      requires_approval: false,
      reason_codes: ["policy.capability_blocked"],
    });
  });

  it("denies packets that request forbidden direct capabilities", () => {
    const decision = decide(
      fixturePacket({
        permission_envelope: {
          allow: ["ssh"],
          block: ["secret.read.never"],
        },
      }),
    );

    expect(decision).toMatchObject({
      capability: "ssh",
      decision: "deny",
      requires_approval: false,
      reason_codes: ["policy.capability_forbidden"],
    });
  });

  it("requires approval for explicit approval packets, high risk, or gated capabilities", () => {
    const decision = decide(
      fixturePacket({
        risk_level: 6,
        requires_approval: true,
        permission_envelope: {
          allow: ["deploy.request"],
          block: ["secret.read.never"],
        },
      }),
    );

    expect(decision).toMatchObject({
      capability: "deploy.request",
      risk_level: 6,
      decision: "approval_required",
      requires_approval: true,
      reason_codes: [
        "policy.packet_requires_approval",
        "policy.risk_requires_approval",
        "policy.capability_requires_approval",
      ],
    });
  });
});

describe("audit ledger writer policy gate contract", () => {
  it("names the future append-only writer capability and gates writer creation", () => {
    const decision = decideAuditLedgerWriterPolicyGate(
      {
        request_id: "req_bp0039_writer_create",
        actor_id: "agent.codex",
        session_id: "sess_bp0039_0001",
        operation: "writer.create",
        resource_refs: ["ledger:audit_events"],
      },
      { now: createdAt },
    );

    expect(decision).toEqual({
      contract_id: AUDIT_LEDGER_WRITER_POLICY_GATE_CONTRACT_ID,
      decision_id: "pol_req_bp0039_writer_create",
      request_id: "req_bp0039_writer_create",
      actor_id: "agent.codex",
      session_id: "sess_bp0039_0001",
      operation: "writer.create",
      resource_refs: ["ledger:audit_events"],
      capability: AUDIT_LEDGER_WRITER_CAPABILITY,
      writer_capability: AUDIT_LEDGER_WRITER_CAPABILITY,
      risk_level: 7,
      decision: "approval_required",
      requires_approval: true,
      reason_codes: ["policy.audit_ledger_writer_creation_requires_approval"],
      side_effects: [],
      created_at: "2026-05-03T00:00:00.000Z",
    });
  });

  it("requires approval for migration, retention changes, and state-changing ledger operations", () => {
    const operations = [
      ["writer.migrate", "policy.audit_ledger_migration_requires_approval"],
      ["retention.change", "policy.audit_ledger_retention_change_requires_approval"],
      ["ledger.record.append", "policy.audit_ledger_state_change_requires_approval"],
      ["ledger.record.correct", "policy.audit_ledger_state_change_requires_approval"],
      ["ledger.record.retry", "policy.audit_ledger_state_change_requires_approval"],
    ] as const;

    for (const [operation, reasonCode] of operations) {
      const decision = decideAuditLedgerWriterPolicyGate(
        {
          request_id: `req_${operation.replaceAll(".", "_")}`,
          actor_id: "agent.codex",
          session_id: "sess_bp0039_0001",
          operation,
          resource_refs: ["ledger:audit_events"],
        },
        { now: createdAt },
      );

      expect(decision).toMatchObject({
        operation,
        capability: AUDIT_LEDGER_WRITER_CAPABILITY,
        writer_capability: AUDIT_LEDGER_WRITER_CAPABILITY,
        decision: "approval_required",
        requires_approval: true,
        reason_codes: [reasonCode],
        side_effects: [],
      });
    }
  });

  it("allows read-only preview evidence without writer approval or side effects", () => {
    const decision = decideAuditLedgerWriterPolicyGate(
      {
        request_id: "req_bp0039_preview_read",
        actor_id: "agent.codex",
        session_id: "sess_bp0039_0001",
        operation: "preview.read",
        resource_refs: ["ui:packet-inspector"],
      },
      { now: createdAt },
    );

    expect(decision).toMatchObject({
      operation: "preview.read",
      capability: "audit.ledger.preview.read",
      writer_capability: AUDIT_LEDGER_WRITER_CAPABILITY,
      risk_level: 0,
      decision: "allow",
      requires_approval: false,
      reason_codes: [],
      side_effects: [],
    });
  });
});

describe("audit ledger writer approval request contract", () => {
  it("creates approval request evidence from BP-0039 writer creation gate decisions", () => {
    const gateDecision = decideAuditLedgerWriterPolicyGate(
      {
        request_id: "req_bp0040_writer_create",
        actor_id: "agent.codex",
        session_id: "sess_bp0040_0001",
        operation: "writer.create",
        resource_refs: ["ledger:audit_events"],
      },
      { now: createdAt },
    );
    const approval = createAuditLedgerWriterApprovalRequest(gateDecision, {
      now: createdAt,
    });

    expect(approval).toEqual({
      ok: true,
      approval_request: {
        contract_id: AUDIT_LEDGER_WRITER_APPROVAL_REQUEST_CONTRACT_ID,
        approval_request_id: "apr_bp0040_writer_create",
        approval_status: "requested",
        approval_kind: "writer_creation",
        request_id: "req_bp0040_writer_create",
        actor_id: "agent.codex",
        session_id: "sess_bp0040_0001",
        operation: "writer.create",
        resource_refs: ["ledger:audit_events"],
        requested_capability: AUDIT_LEDGER_WRITER_CAPABILITY,
        writer_capability: AUDIT_LEDGER_WRITER_CAPABILITY,
        risk_level: 7,
        policy_gate_ref: {
          contract_id: AUDIT_LEDGER_WRITER_POLICY_GATE_CONTRACT_ID,
          decision_id: "pol_req_bp0040_writer_create",
          decision: "approval_required",
          requires_approval: true,
          reason_codes: ["policy.audit_ledger_writer_creation_requires_approval"],
        },
        approver_scope: "owner_or_admin",
        evidence_refs: [
          "policy:pol_req_bp0040_writer_create",
          `contract:${AUDIT_LEDGER_WRITER_POLICY_GATE_CONTRACT_ID}`,
          `capability:${AUDIT_LEDGER_WRITER_CAPABILITY}`,
        ],
        reason_codes: [
          "approval.audit_ledger_writer_policy_gate_required",
          "policy.audit_ledger_writer_creation_requires_approval",
        ],
        side_effects: [],
        created_at: "2026-05-03T00:00:00.000Z",
      },
      reason_codes: [
        "approval.audit_ledger_writer_policy_gate_required",
        "policy.audit_ledger_writer_creation_requires_approval",
      ],
      side_effects: [],
    });
  });

  it("requires approval request evidence for migration, retention, and state-changing ledger operations", () => {
    const operations = [
      ["writer.migrate", "audit_ledger_migration"],
      ["retention.change", "retention_policy_change"],
      ["ledger.record.append", "ledger_state_change"],
      ["ledger.record.correct", "ledger_state_change"],
      ["ledger.record.retry", "ledger_state_change"],
    ] as const;

    for (const [operation, approvalKind] of operations) {
      const gateDecision = decideAuditLedgerWriterPolicyGate(
        {
          request_id: `req_bp0040_${operation.replaceAll(".", "_")}`,
          actor_id: "agent.codex",
          session_id: "sess_bp0040_0001",
          operation,
          resource_refs: ["ledger:audit_events"],
        },
        { now: createdAt },
      );
      const approval = createAuditLedgerWriterApprovalRequest(gateDecision, {
        now: createdAt,
      });

      expect(approval.ok).toBe(true);
      if (!approval.ok) {
        throw new Error("Expected approval request evidence.");
      }

      expect(approval.approval_request).toMatchObject({
        approval_kind: approvalKind,
        operation,
        requested_capability: AUDIT_LEDGER_WRITER_CAPABILITY,
        writer_capability: AUDIT_LEDGER_WRITER_CAPABILITY,
        policy_gate_ref: {
          decision_id: gateDecision.decision_id,
          decision: "approval_required",
          requires_approval: true,
          reason_codes: gateDecision.reason_codes,
        },
        side_effects: [],
      });
      expect(approval.reason_codes).toContain(
        "approval.audit_ledger_writer_policy_gate_required",
      );
    }
  });

  it("does not create approval request evidence for read-only preview/UI evidence", () => {
    const gateDecision = decideAuditLedgerWriterPolicyGate(
      {
        request_id: "req_bp0040_preview_read",
        actor_id: "agent.codex",
        session_id: "sess_bp0040_0001",
        operation: "preview.read",
        resource_refs: ["ui:packet-inspector"],
      },
      { now: createdAt },
    );
    const approval = createAuditLedgerWriterApprovalRequest(gateDecision, {
      now: createdAt,
    });

    expect(gateDecision).toMatchObject({
      decision: "allow",
      requires_approval: false,
      side_effects: [],
    });
    expect(approval).toEqual({
      ok: false,
      approval_request: null,
      reason_codes: ["approval.audit_ledger_writer_not_required"],
      side_effects: [],
    });
  });
});

describe("audit ledger migration approval evidence preview", () => {
  it("builds deterministic writer.migrate approval evidence over the BP-0044 artifact family", () => {
    const preview = createAuditLedgerMigrationApprovalEvidencePreview(
      {
        request_id: "req_bp0046_audit_events_migration",
        actor_id: "agent.codex",
        session_id: "sess_bp0046_0001",
      },
      { now: createdAt },
    );

    expect(preview).toMatchObject({
      contract_id: AUDIT_LEDGER_MIGRATION_APPROVAL_PREVIEW_CONTRACT_ID,
      preview_id: "aprev_bp0046_audit_events_migration",
      request_id: "req_bp0046_audit_events_migration",
      actor_id: "agent.codex",
      session_id: "sess_bp0046_0001",
      operation: "writer.migrate",
      artifact_refs: {
        sql_artifact: "packages/audit/migrations/postgresql/0001_audit_events_v0_1.sql",
        manifest_artifact:
          "packages/audit/migrations/postgresql/0001_audit_events_v0_1.manifest.json",
        static_checker: "scripts/check-audit-ledger-migrations.mjs",
        review_evidence_refs: [
          "fixtures/audit/migration-review.md",
          "fixtures/audit/migration-review.md",
          "fixtures/audit/migration-review.md",
        ],
        source_packet_refs: ["BP-0039", "BP-0040", "BP-0044", "BP-0045"],
      },
      static_checker_required: {
        command: "npm run audit:migrations:check",
        source_ref: "scripts/check-audit-ledger-migrations.mjs",
        side_effects: [],
      },
      live_execution_allowed: false,
      side_effects: [],
      created_at: "2026-05-03T00:00:00.000Z",
    });

    expect(preview.policy_gate_decision).toMatchObject({
      contract_id: AUDIT_LEDGER_WRITER_POLICY_GATE_CONTRACT_ID,
      decision_id: "pol_req_bp0046_audit_events_migration",
      operation: "writer.migrate",
      resource_refs: [
        "ledger:audit_events",
        "artifact:packages/audit/migrations/postgresql/0001_audit_events_v0_1.sql",
        "manifest:packages/audit/migrations/postgresql/0001_audit_events_v0_1.manifest.json",
        "checker:scripts/check-audit-ledger-migrations.mjs",
      ],
      capability: AUDIT_LEDGER_WRITER_CAPABILITY,
      writer_capability: AUDIT_LEDGER_WRITER_CAPABILITY,
      risk_level: 7,
      decision: "approval_required",
      requires_approval: true,
      reason_codes: ["policy.audit_ledger_migration_requires_approval"],
      side_effects: [],
    });
    expect(preview.approval_request).toMatchObject({
      contract_id: AUDIT_LEDGER_WRITER_APPROVAL_REQUEST_CONTRACT_ID,
      approval_request_id: "apr_bp0046_audit_events_migration",
      approval_status: "requested",
      approval_kind: "audit_ledger_migration",
      operation: "writer.migrate",
      policy_gate_ref: {
        decision_id: "pol_req_bp0046_audit_events_migration",
        decision: "approval_required",
        requires_approval: true,
        reason_codes: ["policy.audit_ledger_migration_requires_approval"],
      },
      side_effects: [],
    });
    expect(preview.source_refs).toEqual([
      `contract:${AUDIT_LEDGER_WRITER_POLICY_GATE_CONTRACT_ID}`,
      `contract:${AUDIT_LEDGER_WRITER_APPROVAL_REQUEST_CONTRACT_ID}`,
      "artifact:packages/audit/migrations/postgresql/0001_audit_events_v0_1.sql",
      "manifest:packages/audit/migrations/postgresql/0001_audit_events_v0_1.manifest.json",
      "checker:scripts/check-audit-ledger-migrations.mjs",
      "review:fixtures/audit/migration-review.md",
      "review:fixtures/audit/migration-review.md",
      "review:fixtures/audit/migration-review.md",
      "packet:BP-0039",
      "packet:BP-0040",
      "packet:BP-0044",
      "packet:BP-0045",
    ]);
    expect(preview.reason_codes).toEqual([
      "approval.audit_ledger_writer_policy_gate_required",
      "policy.audit_ledger_migration_requires_approval",
    ]);
  });
});

function decide(packet: UniversalPacket): PolicyDecision {
  return decideUniversalPacketPolicy(packet, { now: createdAt });
}

function fixturePacket(overrides: Partial<UniversalPacket> = {}): UniversalPacket {
  return {
    packet_id: "pkt_context_0001",
    packet_type: "ContextPacket",
    version: "0.1",
    project_id: "hypler",
    actor_id: "agent.codex",
    session_id: "sess_bp0006_0001",
    intent: "Compile source-backed context for a bounded packet task.",
    risk_level: 1,
    source_refs: ["doc:docs/architecture/PACKET_MODEL.md"],
    resource_refs: ["repo:lnsat"],
    policy_profile: "context_readonly",
    permission_envelope: {
      allow: ["context.read", "context.compile"],
      block: ["secret.read.never", "deploy.execute.approved"],
    },
    budget: {
      tokens: 8000,
      runtime_seconds: 300,
      cost_usd: 0.25,
      cpu: 1,
      memory_mb: 512,
    },
    constraints: {
      output_contract: "summary_with_source_refs",
    },
    requires_approval: false,
    ttl_seconds: 3600,
    created_at: "2026-05-03T00:00:00Z",
    ...overrides,
  };
}
