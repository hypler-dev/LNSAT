import { describe, expect, it } from "vitest";
import {
  createPolicyGatePreflightContract,
  databaseSecurityPreflightContract,
  defaultPolicyGateAllowedState,
  defaultPolicyGateApprovalRequirementRefs,
  defaultPolicyGateAuditObligationRefs,
  defaultPolicyGateNoMutationPosture,
  defaultPolicyGateOperationPolicyRefs,
  defaultPolicyGateRiskClassificationRefs,
  defaultPolicyGateRollbackRefs,
  migrationArtifactStaticReviewContract,
  persistencePolicyGateIds,
  persistenceSchemaContract,
  persistenceSchemaEntityNames,
  policyGateAuditObligationKinds,
  policyGateOperationKinds,
  policyGatePreflightBlockedCapabilityFlags,
  policyGatePreflightContract,
  policyGatePreflightTargetGate,
  policyGateRollbackKinds,
  writerPreflightContract,
} from "../src/index.js";

describe("policy gate preflight contract", () => {
  it("emits BP-0210 source-only policy gate evidence", () => {
    const result = createPolicyGatePreflightContract();

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected policy gate preflight success");
    }

    expect(result.policy_gate_preflight_contract).toMatchObject({
      contract_id: policyGatePreflightContract.contract_id,
      policy_gate_version: "0.1",
      target_gate: policyGatePreflightTargetGate,
      persistence_schema_contract_id: persistenceSchemaContract.contract_id,
      migration_static_review_contract_id:
        migrationArtifactStaticReviewContract.contract_id,
      writer_preflight_contract_id: writerPreflightContract.contract_id,
      database_security_preflight_contract_id:
        databaseSecurityPreflightContract.contract_id,
      required_gate_ids: [...persistencePolicyGateIds],
      required_entity_names: [...persistenceSchemaEntityNames],
      allowed_state: defaultPolicyGateAllowedState,
      no_mutation_posture: defaultPolicyGateNoMutationPosture,
      implementation_artifacts: [],
      policy_gate_execution_artifacts: [],
      approval_mutation_artifacts: [],
      audit_write_artifacts: [],
      policy_gate_execution_allowed: false,
      policy_decision_persistence_allowed: false,
      policy_mutation_allowed: false,
      approve_deny_mutation_allowed: false,
      approval_mutation_allowed: false,
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
      result.policy_gate_preflight_contract.operation_policy_refs.map(
        (ref) => ref.operation,
      ),
    ).toEqual([...policyGateOperationKinds]);
    expect(
      result.policy_gate_preflight_contract.risk_classification_refs.map(
        (ref) => ref.operation,
      ),
    ).toEqual([...policyGateOperationKinds]);
    expect(
      result.policy_gate_preflight_contract.approval_requirement_refs.map(
        (ref) => ref.operation,
      ),
    ).toEqual([...policyGateOperationKinds]);
    expect(
      result.policy_gate_preflight_contract.audit_obligation_refs.map(
        (ref) => ref.obligation_kind,
      ),
    ).toEqual([...policyGateAuditObligationKinds]);
    expect(
      result.policy_gate_preflight_contract.rollback_refs.map(
        (ref) => ref.rollback_kind,
      ),
    ).toEqual([...policyGateRollbackKinds]);
    expect(result.policy_gate_preflight_contract.source_refs).toEqual(
      expect.arrayContaining([
        "docs/architecture/PERSISTENCE_AND_POLICY_GATE_REVIEW.md",
        "docs/architecture/PERSISTENCE_SCHEMA_PLAN.md",
        "docs/architecture/POLICY_AND_AUDIT.md",
        "packages/packets/src/persistence-policy-gate.ts",
        "packages/packets/src/persistence-schema-contract.ts",
        "packages/packets/src/migration-artifact-static-review.ts",
        "packages/packets/src/writer-preflight-contract.ts",
        "packages/packets/src/database-security-preflight-contract.ts",
        "packages/policy/src/index.ts",
        "docs/reference/CONTRACT_PROVENANCE.md",
      ]),
    );
    expect(result.side_effects).toEqual([]);
  });

  it("fails closed on missing policy gate preflight evidence", () => {
    const result = createPolicyGatePreflightContract({
      gate_sequence: persistencePolicyGateIds.filter(
        (gateId) => gateId !== "G06_POLICY_GATE",
      ),
      operation_policy_refs: defaultPolicyGateOperationPolicyRefs.filter(
        (ref) => ref.operation !== "writer.migrate",
      ),
      risk_classification_refs: defaultPolicyGateRiskClassificationRefs.filter(
        (ref) => ref.operation !== "writer.create",
      ),
      approval_requirement_refs: defaultPolicyGateApprovalRequirementRefs.filter(
        (ref) => ref.operation !== "ledger.record.append",
      ),
      audit_obligation_refs: defaultPolicyGateAuditObligationRefs.filter(
        (ref) => ref.obligation_kind !== "policy_checked_audit_ref",
      ),
      rollback_refs: defaultPolicyGateRollbackRefs.filter(
        (ref) => ref.rollback_kind !== "writer_disable_ref",
      ),
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected missing policy gate evidence failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "policy_gate.gate_sequence_required",
          path: "/gate_sequence",
        }),
        expect.objectContaining({
          code: "policy_gate.operation_policy_ref_required",
          path: "/operation_policy_refs",
        }),
        expect.objectContaining({
          code: "policy_gate.risk_classification_ref_required",
          path: "/risk_classification_refs",
        }),
        expect.objectContaining({
          code: "policy_gate.approval_requirement_ref_required",
          path: "/approval_requirement_refs",
        }),
        expect.objectContaining({
          code: "policy_gate.audit_obligation_ref_required",
          path: "/audit_obligation_refs",
        }),
        expect.objectContaining({
          code: "policy_gate.rollback_ref_required",
          path: "/rollback_refs",
        }),
      ]),
    );
    expect(result.raw_input_content).toBe("withheld");
  });

  it("fails closed on operation, risk, approval, audit, and rollback drift", () => {
    const result = createPolicyGatePreflightContract({
      operation_policy_refs: defaultPolicyGateOperationPolicyRefs.map((ref) =>
        ref.operation === "writer.migrate"
          ? {
              ...ref,
              policy_gate_ref: "/tmp/policy.ts",
              current_state: "policy_decision_persisted",
              target_gate: "G10_LIVE_REQUEST",
              policy_decision_persistence_allowed: true,
              policy_mutation_allowed: true,
              approve_deny_mutation_allowed: true,
              live_execution_allowed: true,
            }
          : ref,
      ) as typeof defaultPolicyGateOperationPolicyRefs,
      risk_classification_refs: defaultPolicyGateRiskClassificationRefs.map((ref) =>
        ref.operation === "configure_auth"
          ? {
              ...ref,
              risk_ref: "http://example.com/risk",
              risk_kind: "secret_runtime_risk",
              risk_level: 99,
              current_state: "runtime_risk_engine",
              risk_mutation_allowed: true,
              external_service_call_allowed: true,
            }
          : ref,
      ) as typeof defaultPolicyGateRiskClassificationRefs,
      approval_requirement_refs: defaultPolicyGateApprovalRequirementRefs.map((ref) =>
        ref.operation === "approve_action"
          ? {
              ...ref,
              approval_requirement_kind: "inline_approval_grant",
              current_state: "approval_request_created",
              approval_request_creation_allowed: true,
              approval_mutation_allowed: true,
              approve_deny_mutation_allowed: true,
            }
          : ref,
      ) as typeof defaultPolicyGateApprovalRequirementRefs,
      audit_obligation_refs: defaultPolicyGateAuditObligationRefs.map((ref) =>
        ref.obligation_kind === "operation_result_audit_ref"
          ? {
              ...ref,
              required_event_type: "policy_checked",
              current_state: "audit_written",
              audit_write_allowed: true,
              audit_mutation_allowed: true,
            }
          : ref,
      ) as typeof defaultPolicyGateAuditObligationRefs,
      rollback_refs: defaultPolicyGateRollbackRefs.map((ref) =>
        ref.rollback_kind === "migration_repair_ref"
          ? {
              ...ref,
              rollback_ref: "docs/DATABASE_URL.md",
              current_state: "rollback_executed",
              rollback_execution_allowed: true,
              service_mutation_allowed: true,
              live_execution_allowed: true,
            }
          : ref,
      ) as typeof defaultPolicyGateRollbackRefs,
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected policy gate drift failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "policy_gate.invalid_operation_policy_ref",
          path: "/operation_policy_refs/0/policy_gate_ref",
        }),
        expect.objectContaining({
          code: "policy_gate.invalid_operation_policy_ref",
          path: "/operation_policy_refs/0/current_state",
        }),
        expect.objectContaining({
          code: "policy_gate.policy_mutation_forbidden",
          path: "/operation_policy_refs/0/policy_decision_persistence_allowed",
        }),
        expect.objectContaining({
          code: "policy_gate.approval_mutation_forbidden",
          path: "/operation_policy_refs/0/approve_deny_mutation_allowed",
        }),
        expect.objectContaining({
          code: "policy_gate.invalid_risk_classification_ref",
          path: "/risk_classification_refs/4/risk_ref",
        }),
        expect.objectContaining({
          code: "policy_gate.invalid_risk_classification_ref",
          path: "/risk_classification_refs/4/risk_level",
        }),
        expect.objectContaining({
          code: "policy_gate.approval_mutation_forbidden",
          path: "/approval_requirement_refs/3/approval_request_creation_allowed",
        }),
        expect.objectContaining({
          code: "policy_gate.invalid_audit_obligation_ref",
          path: "/audit_obligation_refs/3/required_event_type",
        }),
        expect.objectContaining({
          code: "policy_gate.audit_write_forbidden",
          path: "/audit_obligation_refs/3/audit_write_allowed",
        }),
        expect.objectContaining({
          code: "policy_gate.connection_or_sql_forbidden",
          path: "/rollback_refs/0/rollback_ref",
        }),
        expect.objectContaining({
          code: "policy_gate.rollback_execution_forbidden",
          path: "/rollback_refs/0/rollback_execution_allowed",
        }),
      ]),
    );
  });

  it("fails closed on blocked policy, approval, audit, DB, writer, migration, runtime, Python, OS, and external-service flags", () => {
    const request = Object.fromEntries(
      policyGatePreflightBlockedCapabilityFlags.map((flag) => [flag, true]),
    );
    const result = createPolicyGatePreflightContract(request);

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected blocked capability failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "policy_gate.policy_mutation_forbidden",
          path: "/policy_mutation_allowed",
        }),
        expect.objectContaining({
          code: "policy_gate.approval_mutation_forbidden",
          path: "/approval_mutation_allowed",
        }),
        expect.objectContaining({
          code: "policy_gate.audit_write_forbidden",
          path: "/audit_write_allowed",
        }),
        expect.objectContaining({
          code: "policy_gate.connection_or_sql_forbidden",
          path: "/database_connection_allowed",
        }),
        expect.objectContaining({
          code: "policy_gate.writer_implementation_forbidden",
          path: "/writer_implementation_allowed",
        }),
        expect.objectContaining({
          code: "policy_gate.migration_execution_forbidden",
          path: "/migration_execution_allowed",
        }),
        expect.objectContaining({
          code: "policy_gate.live_execution_forbidden",
          path: "/live_execution_allowed",
        }),
        expect.objectContaining({
          code: "policy_gate.python_runtime_requirement_forbidden",
          path: "/python_runtime_required",
        }),
        expect.objectContaining({
          code: "policy_gate.os_specific_binary_requirement_forbidden",
          path: "/os_specific_binary_required",
        }),
        expect.objectContaining({
          code: "policy_gate.blocked_capability_forbidden",
          path: "/external_service_call_allowed",
        }),
      ]),
    );
  });

  it("fails closed on unsafe state, connection strings, secrets, policy mutation, and side effects", () => {
    const result = createPolicyGatePreflightContract({
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
      operation_policy_refs: [
        {
          ...defaultPolicyGateOperationPolicyRefs[0],
          policy_decision_contract_ref: "packages/policy/src/secret-token.ts",
        },
        ...defaultPolicyGateOperationPolicyRefs.slice(1),
      ],
      no_mutation_posture: {
        ...defaultPolicyGateNoMutationPosture,
        policy_mutation_allowed: true,
        approval_mutation_allowed: true,
        audit_write_allowed: true,
        rollback_execution_allowed: true,
        database_connection_allowed: true,
        live_execution_allowed: true,
      },
      allowed_state: {
        ...defaultPolicyGateAllowedState,
        source_only_policy_gate_preflight_allowed: false,
        secret_posture: "inline-secret-values",
        policy_decision_persistence_allowed: true,
        approve_deny_mutation_allowed: true,
        audit_mutation_allowed: true,
        rollback_execution_allowed: true,
        live_storage_allowed: true,
        live_execution_allowed: true,
        python_runtime_required: true,
        os_specific_binary_required: true,
      },
      side_effects: ["approved-policy"],
    } as Parameters<typeof createPolicyGatePreflightContract>[0]);

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected unsafe policy gate posture failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "policy_gate.connection_or_sql_forbidden",
          path: "/source_refs/1/source_ref",
        }),
        expect.objectContaining({
          code: "policy_gate.connection_or_sql_forbidden",
          path: "/source_refs/1/summary",
        }),
        expect.objectContaining({
          code: "policy_gate.secret_value_forbidden",
          path: "/operation_policy_refs/0/policy_decision_contract_ref",
        }),
        expect.objectContaining({
          code: "policy_gate.policy_mutation_forbidden",
          path: "/no_mutation_posture/policy_mutation_allowed",
        }),
        expect.objectContaining({
          code: "policy_gate.approval_mutation_forbidden",
          path: "/no_mutation_posture/approval_mutation_allowed",
        }),
        expect.objectContaining({
          code: "policy_gate.audit_write_forbidden",
          path: "/no_mutation_posture/audit_write_allowed",
        }),
        expect.objectContaining({
          code: "policy_gate.rollback_execution_forbidden",
          path: "/no_mutation_posture/rollback_execution_allowed",
        }),
        expect.objectContaining({
          code: "policy_gate.connection_or_sql_forbidden",
          path: "/no_mutation_posture/database_connection_allowed",
        }),
        expect.objectContaining({
          code: "policy_gate.allowed_state_drift",
          path: "/allowed_state/source_only_policy_gate_preflight_allowed",
        }),
        expect.objectContaining({
          code: "policy_gate.secret_value_forbidden",
          path: "/allowed_state/secret_posture",
        }),
        expect.objectContaining({
          code: "policy_gate.policy_mutation_forbidden",
          path: "/allowed_state/policy_decision_persistence_allowed",
        }),
        expect.objectContaining({
          code: "policy_gate.approval_mutation_forbidden",
          path: "/allowed_state/approve_deny_mutation_allowed",
        }),
        expect.objectContaining({
          code: "policy_gate.audit_write_forbidden",
          path: "/allowed_state/audit_mutation_allowed",
        }),
        expect.objectContaining({
          code: "policy_gate.rollback_execution_forbidden",
          path: "/allowed_state/rollback_execution_allowed",
        }),
        expect.objectContaining({
          code: "policy_gate.live_execution_forbidden",
          path: "/allowed_state/live_storage_allowed",
        }),
        expect.objectContaining({
          code: "policy_gate.python_runtime_requirement_forbidden",
          path: "/allowed_state/python_runtime_required",
        }),
        expect.objectContaining({
          code: "policy_gate.os_specific_binary_requirement_forbidden",
          path: "/allowed_state/os_specific_binary_required",
        }),
        expect.objectContaining({
          code: "policy_gate.side_effects_forbidden",
          path: "/side_effects",
        }),
      ]),
    );
    expect(JSON.stringify(result)).not.toContain("postgres://");
    expect(JSON.stringify(result)).not.toContain("secret-token");
    expect(JSON.stringify(result)).not.toContain("approved-policy");
  });

  it("proves no policy mutation, approval mutation, audit writer, DB, runtime, external service, or OS connector behavior is implemented", () => {
    const result = createPolicyGatePreflightContract();

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected policy gate preflight success");
    }

    const evidence = result.policy_gate_preflight_contract as Record<string, unknown>;

    expect(result.policy_gate_preflight_contract.blocked_capabilities).toEqual(
      expect.arrayContaining([
        "policy_gate_execution_allowed",
        "policy_decision_persistence_allowed",
        "policy_mutation_allowed",
        "approve_deny_mutation_allowed",
        "approval_mutation_allowed",
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
    expect(result.policy_gate_preflight_contract.implementation_artifacts).toEqual([]);
    expect(
      result.policy_gate_preflight_contract.policy_gate_execution_artifacts,
    ).toEqual([]);
    expect(result.policy_gate_preflight_contract.approval_mutation_artifacts).toEqual(
      [],
    );
    expect(result.policy_gate_preflight_contract.audit_write_artifacts).toEqual([]);
    expect(evidence.policy_writer).toBeUndefined();
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
