import { describe, expect, it } from "vitest";
import {
  approvalRequestApproverScopeKinds,
  approvalRequestDecisionReasonKinds,
  approvalRequestPreflightBlockedCapabilityFlags,
  approvalRequestPreflightContract,
  approvalRequestPreflightTargetGate,
  approvalRequestRefKinds,
  createApprovalRequestPreflightContract,
  databaseSecurityPreflightContract,
  defaultApprovalRequestAllowedState,
  defaultApprovalRequestApproverScopeRefs,
  defaultApprovalRequestAuditObligationRefs,
  defaultApprovalRequestDecisionReasonRefs,
  defaultApprovalRequestNoMutationPosture,
  defaultApprovalRequestPolicyGateRefs,
  defaultApprovalRequestRefs,
  defaultApprovalRequestRollbackRefs,
  persistencePolicyGateIds,
  persistenceSchemaContract,
  persistenceSchemaEntityNames,
  policyGateAuditObligationKinds,
  policyGateOperationKinds,
  policyGatePreflightContract,
  policyGatePreflightTargetGate,
  policyGateRollbackKinds,
  writerPreflightContract,
} from "../src/index.js";

describe("approval request preflight contract", () => {
  it("emits BP-0211 source-only approval request evidence", () => {
    const result = createApprovalRequestPreflightContract();

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected approval request preflight success");
    }

    expect(result.approval_request_preflight_contract).toMatchObject({
      contract_id: approvalRequestPreflightContract.contract_id,
      approval_request_version: "0.1",
      target_gate: approvalRequestPreflightTargetGate,
      policy_gate_target_gate: policyGatePreflightTargetGate,
      persistence_schema_contract_id: persistenceSchemaContract.contract_id,
      writer_preflight_contract_id: writerPreflightContract.contract_id,
      database_security_preflight_contract_id:
        databaseSecurityPreflightContract.contract_id,
      policy_gate_preflight_contract_id: policyGatePreflightContract.contract_id,
      required_gate_ids: [...persistencePolicyGateIds],
      required_entity_names: [...persistenceSchemaEntityNames],
      allowed_state: defaultApprovalRequestAllowedState,
      no_approval_mutation_posture: defaultApprovalRequestNoMutationPosture,
      implementation_artifacts: [],
      approval_request_creation_artifacts: [],
      approval_mutation_artifacts: [],
      audit_write_artifacts: [],
      approval_request_creation_allowed: false,
      approval_request_persistence_allowed: false,
      approval_decision_persistence_allowed: false,
      approval_state_transition_allowed: false,
      approval_mutation_allowed: false,
      approve_deny_mutation_allowed: false,
      policy_mutation_allowed: false,
      audit_write_allowed: false,
      database_connection_allowed: false,
      database_write_allowed: false,
      writer_implementation_allowed: false,
      migration_execution_allowed: false,
      live_storage_allowed: false,
      live_execution_allowed: false,
      python_runtime_required: false,
      os_specific_binary_required: false,
      side_effects: [],
    });
    expect(
      result.approval_request_preflight_contract.approval_request_refs.map(
        (ref) => ref.request_kind,
      ),
    ).toEqual([...approvalRequestRefKinds]);
    expect(
      result.approval_request_preflight_contract.approver_scope_refs.map(
        (ref) => ref.scope_kind,
      ),
    ).toEqual([...approvalRequestApproverScopeKinds]);
    expect(
      result.approval_request_preflight_contract.decision_reason_refs.map(
        (ref) => ref.reason_kind,
      ),
    ).toEqual([...approvalRequestDecisionReasonKinds]);
    expect(
      result.approval_request_preflight_contract.policy_gate_refs.map(
        (ref) => ref.operation,
      ),
    ).toEqual([...policyGateOperationKinds]);
    expect(
      result.approval_request_preflight_contract.audit_obligation_refs.map(
        (ref) => ref.obligation_kind,
      ),
    ).toEqual([...policyGateAuditObligationKinds]);
    expect(
      result.approval_request_preflight_contract.rollback_refs.map(
        (ref) => ref.rollback_kind,
      ),
    ).toEqual([...policyGateRollbackKinds]);
    expect(result.approval_request_preflight_contract.source_refs).toEqual(
      expect.arrayContaining([
        "docs/architecture/PERSISTENCE_AND_POLICY_GATE_REVIEW.md",
        "docs/architecture/PERSISTENCE_SCHEMA_PLAN.md",
        "docs/architecture/POLICY_AND_AUDIT.md",
        "packages/packets/src/persistence-policy-gate.ts",
        "packages/packets/src/persistence-schema-contract.ts",
        "packages/packets/src/writer-preflight-contract.ts",
        "packages/packets/src/database-security-preflight-contract.ts",
        "packages/packets/src/policy-gate-preflight-contract.ts",
        "packages/policy/src/index.ts",
        "docs/reference/CONTRACT_PROVENANCE.md",
      ]),
    );
    expect(result.side_effects).toEqual([]);
  });

  it("fails closed on missing approval request preflight evidence", () => {
    const result = createApprovalRequestPreflightContract({
      gate_sequence: persistencePolicyGateIds.filter(
        (gateId) => gateId !== "G07_APPROVAL_REQUEST",
      ),
      approval_request_refs: defaultApprovalRequestRefs.filter(
        (ref) => ref.request_kind !== "policy_decision_link_ref",
      ),
      approver_scope_refs: defaultApprovalRequestApproverScopeRefs.filter(
        (ref) => ref.scope_kind !== "owner_or_admin_scope_ref",
      ),
      decision_reason_refs: defaultApprovalRequestDecisionReasonRefs.filter(
        (ref) => ref.reason_kind !== "approve_reason_code_ref",
      ),
      policy_gate_refs: defaultApprovalRequestPolicyGateRefs.filter(
        (ref) => ref.operation !== "writer.create",
      ),
      audit_obligation_refs: defaultApprovalRequestAuditObligationRefs.filter(
        (ref) => ref.obligation_kind !== "approval_requested_audit_ref",
      ),
      rollback_refs: defaultApprovalRequestRollbackRefs.filter(
        (ref) => ref.rollback_kind !== "approval_state_reversal_ref",
      ),
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected missing approval request evidence failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "approval_request.gate_sequence_required",
          path: "/gate_sequence",
        }),
        expect.objectContaining({
          code: "approval_request.approval_request_ref_required",
          path: "/approval_request_refs",
        }),
        expect.objectContaining({
          code: "approval_request.approver_scope_ref_required",
          path: "/approver_scope_refs",
        }),
        expect.objectContaining({
          code: "approval_request.decision_reason_ref_required",
          path: "/decision_reason_refs",
        }),
        expect.objectContaining({
          code: "approval_request.policy_gate_ref_required",
          path: "/policy_gate_refs",
        }),
        expect.objectContaining({
          code: "approval_request.audit_obligation_ref_required",
          path: "/audit_obligation_refs",
        }),
        expect.objectContaining({
          code: "approval_request.rollback_ref_required",
          path: "/rollback_refs",
        }),
      ]),
    );
    expect(result.raw_input_content).toBe("withheld");
  });

  it("fails closed on approval request, approver, reason, policy, audit, and rollback drift", () => {
    const result = createApprovalRequestPreflightContract({
      approval_request_refs: defaultApprovalRequestRefs.map((ref) =>
        ref.request_kind === "human_request_payload_ref"
          ? {
              ...ref,
              request_ref: "/tmp/live-approval-request.ts",
              current_state: "approval_request_created",
              target_gate: "G10_LIVE_REQUEST",
              approval_request_creation_allowed: true,
              approval_request_persistence_allowed: true,
              approval_mutation_allowed: true,
            }
          : ref,
      ) as typeof defaultApprovalRequestRefs,
      approver_scope_refs: defaultApprovalRequestApproverScopeRefs.map((ref) =>
        ref.scope_kind === "separate_reviewer_scope_ref"
          ? {
              ...ref,
              scope_ref: "https://example.invalid/reviewer",
              current_state: "approver_scope_mutated",
              approver_scope_mutation_allowed: true,
              authorization_mutation_allowed: true,
              external_service_call_allowed: true,
            }
          : ref,
      ) as typeof defaultApprovalRequestApproverScopeRefs,
      decision_reason_refs: defaultApprovalRequestDecisionReasonRefs.map((ref) =>
        ref.reason_kind === "requires_changes_reason_code_ref"
          ? {
              ...ref,
              stable_reason_code_required: false,
              current_state: "decision_persisted",
              decision_reason_mutation_allowed: true,
              approval_decision_persistence_allowed: true,
              approve_deny_mutation_allowed: true,
            }
          : ref,
      ) as typeof defaultApprovalRequestDecisionReasonRefs,
      policy_gate_refs: defaultApprovalRequestPolicyGateRefs.map((ref) =>
        ref.operation === "configure_auth"
          ? {
              ...ref,
              policy_gate_ref: "docs/DATABASE_URL.md",
              policy_gate_target: "G10_LIVE_REQUEST",
              approval_request_target: "G10_LIVE_REQUEST",
              policy_gate_execution_allowed: true,
              approval_request_creation_allowed: true,
              policy_decision_persistence_allowed: true,
            }
          : ref,
      ) as typeof defaultApprovalRequestPolicyGateRefs,
      audit_obligation_refs: defaultApprovalRequestAuditObligationRefs.map((ref) =>
        ref.obligation_kind === "approval_decision_audit_ref"
          ? {
              ...ref,
              required_event_type: "policy_checked",
              current_state: "audit_written",
              audit_write_allowed: true,
              audit_mutation_allowed: true,
            }
          : ref,
      ) as typeof defaultApprovalRequestAuditObligationRefs,
      rollback_refs: defaultApprovalRequestRollbackRefs.map((ref) =>
        ref.rollback_kind === "approval_state_reversal_ref"
          ? {
              ...ref,
              rollback_ref: "docs/DATABASE_URL.md",
              current_state: "rollback_executed",
              rollback_execution_allowed: true,
              service_mutation_allowed: true,
              live_execution_allowed: true,
            }
          : ref,
      ) as typeof defaultApprovalRequestRollbackRefs,
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected approval request drift failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "approval_request.invalid_approval_request_ref",
          path: "/approval_request_refs/1/request_ref",
        }),
        expect.objectContaining({
          code: "approval_request.invalid_approval_request_ref",
          path: "/approval_request_refs/1/current_state",
        }),
        expect.objectContaining({
          code: "approval_request.approval_mutation_forbidden",
          path: "/approval_request_refs/1/approval_request_creation_allowed",
        }),
        expect.objectContaining({
          code: "approval_request.invalid_approver_scope_ref",
          path: "/approver_scope_refs/1/scope_ref",
        }),
        expect.objectContaining({
          code: "approval_request.policy_mutation_forbidden",
          path: "/approver_scope_refs/1/authorization_mutation_allowed",
        }),
        expect.objectContaining({
          code: "approval_request.invalid_decision_reason_ref",
          path: "/decision_reason_refs/2/stable_reason_code_required",
        }),
        expect.objectContaining({
          code: "approval_request.approval_mutation_forbidden",
          path: "/decision_reason_refs/2/approve_deny_mutation_allowed",
        }),
        expect.objectContaining({
          code: "approval_request.connection_or_sql_forbidden",
          path: "/policy_gate_refs/4/policy_gate_ref",
        }),
        expect.objectContaining({
          code: "approval_request.policy_mutation_forbidden",
          path: "/policy_gate_refs/4/policy_gate_execution_allowed",
        }),
        expect.objectContaining({
          code: "approval_request.invalid_audit_obligation_ref",
          path: "/audit_obligation_refs/2/required_event_type",
        }),
        expect.objectContaining({
          code: "approval_request.audit_write_forbidden",
          path: "/audit_obligation_refs/2/audit_write_allowed",
        }),
        expect.objectContaining({
          code: "approval_request.connection_or_sql_forbidden",
          path: "/rollback_refs/2/rollback_ref",
        }),
        expect.objectContaining({
          code: "approval_request.rollback_execution_forbidden",
          path: "/rollback_refs/2/rollback_execution_allowed",
        }),
      ]),
    );
  });

  it("fails closed on blocked approval, policy, audit, DB, writer, migration, runtime, Python, OS, and external-service flags", () => {
    const request = Object.fromEntries(
      approvalRequestPreflightBlockedCapabilityFlags.map((flag) => [flag, true]),
    );
    const result = createApprovalRequestPreflightContract(request);

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected blocked capability failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "approval_request.approval_mutation_forbidden",
          path: "/approval_mutation_allowed",
        }),
        expect.objectContaining({
          code: "approval_request.policy_mutation_forbidden",
          path: "/policy_mutation_allowed",
        }),
        expect.objectContaining({
          code: "approval_request.audit_write_forbidden",
          path: "/audit_write_allowed",
        }),
        expect.objectContaining({
          code: "approval_request.connection_or_sql_forbidden",
          path: "/database_connection_allowed",
        }),
        expect.objectContaining({
          code: "approval_request.writer_implementation_forbidden",
          path: "/writer_implementation_allowed",
        }),
        expect.objectContaining({
          code: "approval_request.migration_execution_forbidden",
          path: "/migration_execution_allowed",
        }),
        expect.objectContaining({
          code: "approval_request.live_execution_forbidden",
          path: "/live_execution_allowed",
        }),
        expect.objectContaining({
          code: "approval_request.python_runtime_requirement_forbidden",
          path: "/python_runtime_required",
        }),
        expect.objectContaining({
          code: "approval_request.os_specific_binary_requirement_forbidden",
          path: "/os_specific_binary_required",
        }),
        expect.objectContaining({
          code: "approval_request.blocked_capability_forbidden",
          path: "/external_service_call_allowed",
        }),
      ]),
    );
  });

  it("fails closed on unsafe state, connection strings, secrets, approval mutation, and side effects", () => {
    const result = createApprovalRequestPreflightContract({
      source_refs: [
        {
          source_ref: "docs/reference/CONTRACT_PROVENANCE.md",
          summary: "valid source ref",
        },
        {
          source_ref: "docs/DATABASE_URL.md",
          summary: "postgres://user:password=value@example.invalid/db",
        },
      ],
      policy_gate_refs: [
        {
          ...defaultApprovalRequestPolicyGateRefs[0]!,
          policy_gate_preflight_ref: "packages/policy/src/secret-token.ts",
        },
        ...defaultApprovalRequestPolicyGateRefs.slice(1),
      ],
      no_approval_mutation_posture: {
        ...defaultApprovalRequestNoMutationPosture,
        approval_request_creation_allowed: true,
        approval_request_persistence_allowed: true,
        approval_mutation_allowed: true,
        approve_deny_mutation_allowed: true,
        policy_mutation_allowed: true,
        audit_write_allowed: true,
        rollback_execution_allowed: true,
        database_connection_allowed: true,
        live_execution_allowed: true,
      },
      allowed_state: {
        ...defaultApprovalRequestAllowedState,
        source_only_approval_request_preflight_allowed: false,
        secret_posture: "inline-secret-values",
        approval_request_creation_allowed: true,
        approval_decision_persistence_allowed: true,
        approve_deny_mutation_allowed: true,
        audit_mutation_allowed: true,
        rollback_execution_allowed: true,
        live_storage_allowed: true,
        live_execution_allowed: true,
        python_runtime_required: true,
        os_specific_binary_required: true,
      },
      side_effects: ["created-approval-request"],
    } as Parameters<typeof createApprovalRequestPreflightContract>[0]);

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected unsafe approval request posture failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "approval_request.connection_or_sql_forbidden",
          path: "/source_refs/1/source_ref",
        }),
        expect.objectContaining({
          code: "approval_request.connection_or_sql_forbidden",
          path: "/source_refs/1/summary",
        }),
        expect.objectContaining({
          code: "approval_request.secret_value_forbidden",
          path: "/policy_gate_refs/0/policy_gate_preflight_ref",
        }),
        expect.objectContaining({
          code: "approval_request.approval_mutation_forbidden",
          path: "/no_approval_mutation_posture/approval_request_creation_allowed",
        }),
        expect.objectContaining({
          code: "approval_request.policy_mutation_forbidden",
          path: "/no_approval_mutation_posture/policy_mutation_allowed",
        }),
        expect.objectContaining({
          code: "approval_request.audit_write_forbidden",
          path: "/no_approval_mutation_posture/audit_write_allowed",
        }),
        expect.objectContaining({
          code: "approval_request.rollback_execution_forbidden",
          path: "/no_approval_mutation_posture/rollback_execution_allowed",
        }),
        expect.objectContaining({
          code: "approval_request.connection_or_sql_forbidden",
          path: "/no_approval_mutation_posture/database_connection_allowed",
        }),
        expect.objectContaining({
          code: "approval_request.allowed_state_drift",
          path: "/allowed_state/source_only_approval_request_preflight_allowed",
        }),
        expect.objectContaining({
          code: "approval_request.secret_value_forbidden",
          path: "/allowed_state/secret_posture",
        }),
        expect.objectContaining({
          code: "approval_request.approval_mutation_forbidden",
          path: "/allowed_state/approval_decision_persistence_allowed",
        }),
        expect.objectContaining({
          code: "approval_request.audit_write_forbidden",
          path: "/allowed_state/audit_mutation_allowed",
        }),
        expect.objectContaining({
          code: "approval_request.rollback_execution_forbidden",
          path: "/allowed_state/rollback_execution_allowed",
        }),
        expect.objectContaining({
          code: "approval_request.live_execution_forbidden",
          path: "/allowed_state/live_storage_allowed",
        }),
        expect.objectContaining({
          code: "approval_request.python_runtime_requirement_forbidden",
          path: "/allowed_state/python_runtime_required",
        }),
        expect.objectContaining({
          code: "approval_request.os_specific_binary_requirement_forbidden",
          path: "/allowed_state/os_specific_binary_required",
        }),
        expect.objectContaining({
          code: "approval_request.side_effects_forbidden",
          path: "/side_effects",
        }),
      ]),
    );
    expect(JSON.stringify(result)).not.toContain("postgres://");
    expect(JSON.stringify(result)).not.toContain("secret-token");
    expect(JSON.stringify(result)).not.toContain("created-approval-request");
  });

  it("proves no approval mutator, audit writer, DB, runtime, external service, or OS connector behavior is implemented", () => {
    const result = createApprovalRequestPreflightContract();

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected approval request preflight success");
    }

    const evidence = result.approval_request_preflight_contract as Record<
      string,
      unknown
    >;

    expect(result.approval_request_preflight_contract.blocked_capabilities).toEqual(
      expect.arrayContaining([
        "approval_request_creation_allowed",
        "approval_request_persistence_allowed",
        "approval_decision_persistence_allowed",
        "approval_mutation_allowed",
        "approve_deny_mutation_allowed",
        "policy_mutation_allowed",
        "audit_write_allowed",
        "database_connection_allowed",
        "database_write_allowed",
        "writer_implementation_allowed",
        "migration_execution_allowed",
        "queue_mutation_allowed",
        "runtime_adapter_implementation_allowed",
        "os_specific_binary_required",
        "external_service_call_allowed",
      ]),
    );
    expect(result.approval_request_preflight_contract.implementation_artifacts).toEqual(
      [],
    );
    expect(
      result.approval_request_preflight_contract.approval_request_creation_artifacts,
    ).toEqual([]);
    expect(
      result.approval_request_preflight_contract.approval_mutation_artifacts,
    ).toEqual([]);
    expect(result.approval_request_preflight_contract.audit_write_artifacts).toEqual(
      [],
    );
    expect(evidence.approval_request_writer).toBeUndefined();
    expect(evidence.approval_mutator).toBeUndefined();
    expect(evidence.audit_writer).toBeUndefined();
    expect(evidence.database_client).toBeUndefined();
    expect(evidence.connection_string).toBeUndefined();
    expect(evidence.writer).toBeUndefined();
    expect(evidence.migration_runner).toBeUndefined();
    expect(evidence.runtime_dispatcher).toBeUndefined();
    expect(evidence.external_service_client).toBeUndefined();
    expect(evidence.os_connector_package).toBeUndefined();
  });
});
