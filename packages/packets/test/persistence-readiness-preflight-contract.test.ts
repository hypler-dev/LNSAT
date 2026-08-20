import { describe, expect, it } from "vitest";
import {
  approvalRequestPreflightContract,
  approvalRequestPreflightTargetGate,
  createPersistenceReadinessPreflightContract,
  databaseSecurityPreflightContract,
  defaultPersistenceReadinessAllowedState,
  defaultPersistenceReadinessAuditObligationRefs,
  defaultPersistenceReadinessMigrationArtifactRefs,
  defaultPersistenceReadinessNoLivePosture,
  defaultPersistenceReadinessPrerequisiteRefs,
  defaultPersistenceReadinessRequiredTestRefs,
  defaultPersistenceReadinessRollbackRefs,
  migrationArtifactStaticReviewContract,
  persistencePolicyGateIds,
  persistenceReadinessMigrationArtifactRefKinds,
  persistenceReadinessPreflightBlockedCapabilityFlags,
  persistenceReadinessPreflightContract,
  persistenceReadinessPreflightTargetGate,
  persistenceReadinessPrerequisiteKinds,
  persistenceReadinessRequiredTestKinds,
  persistenceSchemaContract,
  persistenceSchemaEntityNames,
  policyGatePreflightContract,
  writerPreflightContract,
  type PersistenceReadinessPreflightRequest,
} from "../src/index.js";

describe("persistence readiness preflight contract", () => {
  it("emits BP-0212 source-only persistence readiness evidence", () => {
    const result = createPersistenceReadinessPreflightContract();

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected persistence readiness success");
    }

    expect(result.persistence_readiness_preflight_contract).toMatchObject({
      contract_id: persistenceReadinessPreflightContract.contract_id,
      persistence_readiness_version: "0.1",
      target_gate: persistenceReadinessPreflightTargetGate,
      approval_request_target_gate: approvalRequestPreflightTargetGate,
      persistence_schema_contract_id: persistenceSchemaContract.contract_id,
      migration_static_review_contract_id:
        migrationArtifactStaticReviewContract.contract_id,
      writer_preflight_contract_id: writerPreflightContract.contract_id,
      database_security_preflight_contract_id:
        databaseSecurityPreflightContract.contract_id,
      policy_gate_preflight_contract_id: policyGatePreflightContract.contract_id,
      approval_request_preflight_contract_id:
        approvalRequestPreflightContract.contract_id,
      required_gate_ids: [...persistencePolicyGateIds],
      required_entity_names: [...persistenceSchemaEntityNames],
      allowed_state: defaultPersistenceReadinessAllowedState,
      no_live_posture: defaultPersistenceReadinessNoLivePosture,
      implementation_artifacts: [],
      persistence_readiness_artifacts: [],
      implementation_packet_artifacts: [],
      live_storage_artifacts: [],
      implementation_packet_selection_allowed: false,
      implementation_scope_request_allowed: false,
      persistence_scope_request_allowed: false,
      write_scope_request_allowed: false,
      persisted_storage_allowed: false,
      approval_mutation_allowed: false,
      audit_write_allowed: false,
      database_connection_allowed: false,
      database_write_allowed: false,
      writer_implementation_allowed: false,
      migration_execution_allowed: false,
      queue_mutation_allowed: false,
      live_storage_allowed: false,
      live_execution_allowed: false,
      python_runtime_required: false,
      os_specific_binary_required: false,
      side_effects: [],
    });
    expect(
      result.persistence_readiness_preflight_contract.prerequisite_refs.map(
        (ref) => ref.prerequisite_kind,
      ),
    ).toEqual([...persistenceReadinessPrerequisiteKinds]);
    expect(
      result.persistence_readiness_preflight_contract.migration_artifact_refs.map(
        (ref) => ref.artifact_kind,
      ),
    ).toEqual([...persistenceReadinessMigrationArtifactRefKinds]);
    expect(
      result.persistence_readiness_preflight_contract.required_test_refs.map(
        (ref) => ref.test_kind,
      ),
    ).toEqual([...persistenceReadinessRequiredTestKinds]);
    expect(result.persistence_readiness_preflight_contract.source_refs).toEqual(
      expect.arrayContaining([
        "docs/architecture/PERSISTENCE_AND_POLICY_GATE_REVIEW.md",
        "docs/architecture/PERSISTENCE_SCHEMA_PLAN.md",
        "packages/packets/src/persistence-schema-contract.ts",
        "packages/packets/src/migration-artifact-static-review.ts",
        "packages/packets/src/writer-preflight-contract.ts",
        "packages/packets/src/database-security-preflight-contract.ts",
        "packages/packets/src/policy-gate-preflight-contract.ts",
        "packages/packets/src/approval-request-preflight-contract.ts",
        "docs/reference/CONTRACT_PROVENANCE.md",
      ]),
    );
    expect(result.side_effects).toEqual([]);
  });

  it("fails closed on missing persistence readiness evidence", () => {
    const result = createPersistenceReadinessPreflightContract({
      gate_sequence: persistencePolicyGateIds.filter(
        (gateId) => gateId !== "G08_PERSISTENCE_READINESS",
      ),
      prerequisite_refs: defaultPersistenceReadinessPrerequisiteRefs.filter(
        (ref) => ref.prerequisite_kind !== "migration_static_review_ref",
      ),
      migration_artifact_refs: defaultPersistenceReadinessMigrationArtifactRefs.filter(
        (ref) => ref.artifact_kind !== "reviewed_sql_artifact_ref",
      ),
      required_test_refs: defaultPersistenceReadinessRequiredTestRefs.filter(
        (ref) => ref.test_kind !== "approval_request_preflight_tests",
      ),
      audit_obligation_refs: defaultPersistenceReadinessAuditObligationRefs.filter(
        (ref) => ref.required_event_type !== "approval_requested",
      ),
      rollback_refs: defaultPersistenceReadinessRollbackRefs.filter(
        (ref) => ref.rollback_kind !== "writer_disable_ref",
      ),
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected missing persistence readiness failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "persistence_readiness.gate_sequence_required",
          path: "/gate_sequence",
        }),
        expect.objectContaining({
          code: "persistence_readiness.prerequisite_ref_required",
          path: "/prerequisite_refs",
        }),
        expect.objectContaining({
          code: "persistence_readiness.migration_artifact_ref_required",
          path: "/migration_artifact_refs",
        }),
        expect.objectContaining({
          code: "persistence_readiness.required_test_ref_required",
          path: "/required_test_refs",
        }),
        expect.objectContaining({
          code: "persistence_readiness.audit_obligation_ref_required",
          path: "/audit_obligation_refs",
        }),
        expect.objectContaining({
          code: "persistence_readiness.rollback_ref_required",
          path: "/rollback_refs",
        }),
      ]),
    );
    expect(result.raw_input_content).toBe("withheld");
  });

  it("fails closed on prerequisite, artifact, test, audit, and rollback drift", () => {
    const result = createPersistenceReadinessPreflightContract({
      prerequisite_refs: defaultPersistenceReadinessPrerequisiteRefs.map((ref) =>
        ref.prerequisite_kind === "approval_request_preflight_ref"
          ? {
              ...ref,
              prerequisite_ref: "/tmp/live-approval-request.ts",
              contract_ref: "lnsat.platform.live_approval_writer.v0_1",
              target_gate: "G10_LIVE_REQUEST",
              readiness_gate: "G10_LIVE_REQUEST",
              current_state: "implementation_packet_selected",
              implementation_packet_selection_allowed: true,
              live_storage_allowed: true,
            }
          : ref,
      ) as typeof defaultPersistenceReadinessPrerequisiteRefs,
      migration_artifact_refs: defaultPersistenceReadinessMigrationArtifactRefs.map(
        (ref) =>
          ref.artifact_kind === "reviewed_sql_artifact_ref"
            ? {
                ...ref,
                artifact_ref: "/tmp/live-migration.sql",
                migration_static_review_ref: "live-migration-runner",
                current_state: "migration_executed",
                database_connection_allowed: true,
                migration_execution_allowed: true,
                sql_execution_allowed: true,
              }
            : ref,
      ) as typeof defaultPersistenceReadinessMigrationArtifactRefs,
      required_test_refs: defaultPersistenceReadinessRequiredTestRefs.map((ref) =>
        ref.test_kind === "full_workspace_check"
          ? {
              ...ref,
              command_ref: "git push origin main",
              required_before_implementation_packet: false,
              current_state: "implementation_packet_selected",
              implementation_packet_selection_allowed: true,
              live_execution_allowed: true,
            }
          : ref,
      ) as typeof defaultPersistenceReadinessRequiredTestRefs,
      audit_obligation_refs: defaultPersistenceReadinessAuditObligationRefs.map(
        (ref) =>
          ref.required_event_type === "operation_result_recorded"
            ? {
                ...ref,
                obligation_ref: "/tmp/audit-writer.ts",
                current_state: "audit_written",
                audit_write_allowed: true,
                operation_result_record_allowed: true,
              }
            : ref,
      ) as typeof defaultPersistenceReadinessAuditObligationRefs,
      rollback_refs: defaultPersistenceReadinessRollbackRefs.map((ref) =>
        ref.rollback_kind === "runtime_revert_ref"
          ? {
              ...ref,
              rollback_ref: "/tmp/live-rollback.sh",
              current_state: "rollback_executed",
              rollback_execution_allowed: true,
              live_execution_allowed: true,
            }
          : ref,
      ) as typeof defaultPersistenceReadinessRollbackRefs,
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected persistence readiness drift failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "persistence_readiness.invalid_prerequisite_ref",
        }),
        expect.objectContaining({
          code: "persistence_readiness.implementation_selection_forbidden",
        }),
        expect.objectContaining({
          code: "persistence_readiness.invalid_migration_artifact_ref",
        }),
        expect.objectContaining({
          code: "persistence_readiness.migration_execution_forbidden",
        }),
        expect.objectContaining({
          code: "persistence_readiness.invalid_required_test_ref",
        }),
        expect.objectContaining({
          code: "persistence_readiness.audit_write_forbidden",
        }),
        expect.objectContaining({
          code: "persistence_readiness.invalid_rollback_ref",
        }),
        expect.objectContaining({
          code: "persistence_readiness.live_execution_forbidden",
        }),
      ]),
    );
    expect(result.raw_input_content).toBe("withheld");
  });

  it("fails closed on unsafe allowed state and no-live posture drift", () => {
    const result = createPersistenceReadinessPreflightContract({
      no_live_posture: {
        ...defaultPersistenceReadinessNoLivePosture,
        database_connection_allowed: true,
        approval_mutation_allowed: true,
        implementation_packet_selection_allowed: true,
        live_execution_allowed: true,
      },
      allowed_state: {
        ...defaultPersistenceReadinessAllowedState,
        source_only_persistence_readiness_preflight_allowed: false,
        implementation_packet_selection_allowed: true,
        database_write_allowed: true,
        writer_implementation_allowed: true,
        python_runtime_required: true,
        os_specific_binary_required: true,
      },
    } as unknown as PersistenceReadinessPreflightRequest);

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected unsafe persistence readiness state failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "persistence_readiness.no_live_posture_drift",
        }),
        expect.objectContaining({
          code: "persistence_readiness.allowed_state_drift",
        }),
      ]),
    );
    expect(result.raw_input_content).toBe("withheld");
  });

  it("fails closed on blocked capabilities, secrets, and side effects", () => {
    const blockedCapabilityRequest = Object.fromEntries(
      persistenceReadinessPreflightBlockedCapabilityFlags.map((flag) => [flag, true]),
    ) as unknown as PersistenceReadinessPreflightRequest;

    const blockedCapabilityResult = createPersistenceReadinessPreflightContract(
      blockedCapabilityRequest,
    );

    expect(blockedCapabilityResult.ok).toBe(false);
    if (blockedCapabilityResult.ok) {
      throw new Error("expected blocked capability failure");
    }
    expect(blockedCapabilityResult.errors.length).toBeGreaterThan(0);
    expect(blockedCapabilityResult.raw_input_content).toBe("withheld");

    const secretResult = createPersistenceReadinessPreflightContract({
      source_refs: [
        {
          source_ref: "docs/DATABASE_URL.md",
          summary: "bad source ref",
        },
      ],
      side_effects: ["db-write"],
    } as unknown as PersistenceReadinessPreflightRequest);

    expect(secretResult.ok).toBe(false);
    if (secretResult.ok) {
      throw new Error("expected secret and side effect failure");
    }
    expect(secretResult.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "persistence_readiness.secret_value_forbidden",
        }),
        expect.objectContaining({
          code: "persistence_readiness.invalid_source_ref",
        }),
        expect.objectContaining({
          code: "persistence_readiness.side_effects_forbidden",
          path: "/side_effects",
        }),
      ]),
    );
    expect(secretResult.raw_input_content).toBe("withheld");
  });

  it("does not emit implementation, persistence, or live artifacts", () => {
    const result = createPersistenceReadinessPreflightContract();

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected persistence readiness success");
    }

    expect(result.persistence_readiness_preflight_contract).toMatchObject({
      implementation_artifacts: [],
      persistence_readiness_artifacts: [],
      implementation_packet_artifacts: [],
      live_storage_artifacts: [],
      side_effects: [],
    });
  });
});
