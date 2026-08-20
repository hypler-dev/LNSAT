import { describe, expect, it } from "vitest";
import {
  createKnowledgePersistenceImplementationPacket,
  defaultKnowledgePersistenceAllowedState,
  defaultKnowledgePersistenceApprovalPrerequisiteRefs,
  defaultKnowledgePersistenceAuditObligationRefs,
  defaultKnowledgePersistenceFutureArtifactRefs,
  defaultKnowledgePersistenceNoLivePosture,
  defaultKnowledgePersistencePolicyPrerequisiteRefs,
  defaultKnowledgePersistenceRollbackRefs,
  defaultKnowledgePersistenceValidationCommandRefs,
  knowledgeEvalHarnessContract,
  knowledgePersistenceImplementationApprovalPrerequisiteKinds,
  knowledgePersistenceImplementationArtifactKinds,
  knowledgePersistenceImplementationAuditObligationKinds,
  knowledgePersistenceImplementationBlockedCapabilityFlags,
  knowledgePersistenceImplementationPacketContract,
  knowledgePersistenceImplementationPolicyPrerequisiteKinds,
  knowledgePersistenceImplementationRollbackKinds,
  knowledgePersistenceImplementationTargetGate,
  knowledgePersistenceImplementationValidationKinds,
  knowledgeSearchContextContract,
  localKnowledgeRecordContract,
  localRepoKnowledgeIndexContract,
  persistencePolicyGateContract,
  persistencePolicyGateIds,
  persistenceReadinessPreflightContract,
  persistenceReadinessPreflightTargetGate,
  persistenceSchemaContract,
  type KnowledgePersistenceImplementationPacketRequest,
} from "../src/index.js";

describe("knowledge persistence implementation packet contract", () => {
  it("emits BP-0214 source-only knowledge persistence implementation packet evidence", () => {
    const result = createKnowledgePersistenceImplementationPacket();

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected knowledge persistence implementation packet success");
    }

    expect(result.knowledge_persistence_implementation_packet).toMatchObject({
      contract_id: knowledgePersistenceImplementationPacketContract.contract_id,
      implementation_packet_version: "0.1",
      implementation_identity: {
        packet_ref: "BP-0214",
        selected_by_packet_ref: "BP-0213",
        candidate_ref: "candidate:knowledge_persistence_records_snapshots",
        target_gate: knowledgePersistenceImplementationTargetGate,
        implementation_mode: "source_contract_only",
      },
      target_gate: knowledgePersistenceImplementationTargetGate,
      prerequisite_gate: persistenceReadinessPreflightTargetGate,
      policy_gate_contract_id: persistencePolicyGateContract.contract_id,
      persistence_readiness_contract_id:
        persistenceReadinessPreflightContract.contract_id,
      persistence_schema_contract_id: persistenceSchemaContract.contract_id,
      knowledge_record_contract_id: localKnowledgeRecordContract.contract_id,
      local_repo_index_contract_id: localRepoKnowledgeIndexContract.contract_id,
      knowledge_search_context_contract_id: knowledgeSearchContextContract.contract_id,
      knowledge_eval_harness_contract_id: knowledgeEvalHarnessContract.contract_id,
      gate_sequence: [...persistencePolicyGateIds],
      no_live_posture: defaultKnowledgePersistenceNoLivePosture,
      allowed_state: defaultKnowledgePersistenceAllowedState,
      sql_artifacts: [],
      ddl_artifacts: [],
      migration_artifacts: [],
      writer_artifacts: [],
      persisted_storage_artifacts: [],
      runtime_artifacts: [],
      live_storage_artifacts: [],
      database_connection_allowed: false,
      database_write_allowed: false,
      writer_implementation_allowed: false,
      persisted_storage_allowed: false,
      live_execution_allowed: false,
      python_runtime_required: false,
      os_specific_binary_required: false,
      side_effects: [],
    });
    expect(
      result.knowledge_persistence_implementation_packet.future_artifact_refs.map(
        (ref) => ref.artifact_kind,
      ),
    ).toEqual([...knowledgePersistenceImplementationArtifactKinds]);
    expect(
      result.knowledge_persistence_implementation_packet.policy_prerequisite_refs.map(
        (ref) => ref.prerequisite_kind,
      ),
    ).toEqual([...knowledgePersistenceImplementationPolicyPrerequisiteKinds]);
    expect(
      result.knowledge_persistence_implementation_packet.approval_prerequisite_refs.map(
        (ref) => ref.approval_kind,
      ),
    ).toEqual([...knowledgePersistenceImplementationApprovalPrerequisiteKinds]);
    expect(
      result.knowledge_persistence_implementation_packet.audit_obligation_refs.map(
        (ref) => ref.audit_kind,
      ),
    ).toEqual([...knowledgePersistenceImplementationAuditObligationKinds]);
    expect(
      result.knowledge_persistence_implementation_packet.rollback_refs.map(
        (ref) => ref.rollback_kind,
      ),
    ).toEqual([...knowledgePersistenceImplementationRollbackKinds]);
    expect(
      result.knowledge_persistence_implementation_packet.validation_command_refs.map(
        (ref) => ref.validation_kind,
      ),
    ).toEqual([...knowledgePersistenceImplementationValidationKinds]);
    expect(result.knowledge_persistence_implementation_packet.source_refs).toEqual(
      expect.arrayContaining([
        "fixtures/knowledge/packets/BP-0182.md",
        "fixtures/knowledge/packets/BP-0183.md",
        "fixtures/knowledge/packets/BP-0184.md",
        "fixtures/knowledge/packets/BP-0188.md",
        "docs/reference/CONTRACT_PROVENANCE.md",
        "docs/reference/CONTRACT_PROVENANCE.md",
        "docs/reference/CONTRACT_PROVENANCE.md",
        "docs/reference/CONTRACT_PROVENANCE.md",
        "docs/reference/CONTRACT_PROVENANCE.md",
        "docs/reference/CONTRACT_PROVENANCE.md",
        "docs/reference/CONTRACT_PROVENANCE.md",
      ]),
    );
    expect(result.side_effects).toEqual([]);
  });

  it("fails closed on missing implementation packet evidence", () => {
    const result = createKnowledgePersistenceImplementationPacket({
      gate_sequence: persistencePolicyGateIds.filter(
        (gateId) => gateId !== "G09_IMPLEMENTATION_PACKET",
      ),
      future_artifact_refs: defaultKnowledgePersistenceFutureArtifactRefs.filter(
        (ref) => ref.artifact_kind !== "source_snapshot_ref",
      ),
      policy_prerequisite_refs:
        defaultKnowledgePersistencePolicyPrerequisiteRefs.filter(
          (ref) => ref.prerequisite_kind !== "bp0213_selection_ref",
        ),
      approval_prerequisite_refs:
        defaultKnowledgePersistenceApprovalPrerequisiteRefs.filter(
          (ref) => ref.approval_kind !== "no_write_scope_request_ref",
        ),
      audit_obligation_refs: defaultKnowledgePersistenceAuditObligationRefs.filter(
        (ref) => ref.audit_kind !== "future_knowledge_write_audit_required",
      ),
      rollback_refs: defaultKnowledgePersistenceRollbackRefs.filter(
        (ref) => ref.rollback_kind !== "restore_bp0213_handoff",
      ),
      validation_command_refs: defaultKnowledgePersistenceValidationCommandRefs.filter(
        (ref) => ref.validation_kind !== "full_workspace_check",
      ),
      source_refs: [
        {
          source_ref: "docs/reference/CONTRACT_PROVENANCE.md",
          summary: "only",
        },
      ],
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected missing evidence failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "knowledge_persistence_implementation_packet.gate_sequence_required",
          path: "/gate_sequence",
        }),
        expect.objectContaining({
          code: "knowledge_persistence_implementation_packet.future_artifact_ref_required",
          path: "/future_artifact_refs",
        }),
        expect.objectContaining({
          code: "knowledge_persistence_implementation_packet.policy_prerequisite_ref_required",
          path: "/policy_prerequisite_refs",
        }),
        expect.objectContaining({
          code: "knowledge_persistence_implementation_packet.approval_prerequisite_ref_required",
          path: "/approval_prerequisite_refs",
        }),
        expect.objectContaining({
          code: "knowledge_persistence_implementation_packet.audit_obligation_ref_required",
          path: "/audit_obligation_refs",
        }),
        expect.objectContaining({
          code: "knowledge_persistence_implementation_packet.rollback_ref_required",
          path: "/rollback_refs",
        }),
        expect.objectContaining({
          code: "knowledge_persistence_implementation_packet.validation_command_ref_required",
          path: "/validation_command_refs",
        }),
        expect.objectContaining({
          code: "knowledge_persistence_implementation_packet.source_ref_required",
          path: "/source_refs",
        }),
      ]),
    );
    expect(result.raw_input_content).toBe("withheld");
  });

  it("fails closed on drift toward writer, persistence, approval, audit, runtime, or OS scope", () => {
    const result = createKnowledgePersistenceImplementationPacket({
      future_artifact_refs: defaultKnowledgePersistenceFutureArtifactRefs.map((ref) =>
        ref.artifact_kind === "knowledge_record_ref"
          ? {
              ...ref,
              artifact_ref: "future_artifact:live-knowledge-record-writer",
              current_state: "writer_ready",
              persisted_storage_allowed: true,
              writer_implementation_allowed: true,
              database_write_allowed: true,
              live_execution_allowed: true,
            }
          : ref,
      ) as typeof defaultKnowledgePersistenceFutureArtifactRefs,
      policy_prerequisite_refs: defaultKnowledgePersistencePolicyPrerequisiteRefs.map(
        (ref) =>
          ref.prerequisite_kind === "bp0213_selection_ref"
            ? {
                ...ref,
                prerequisite_ref: "/tmp/live-policy.ts",
                current_state: "policy_mutated",
                approval_mutation_allowed: true,
                live_execution_allowed: true,
              }
            : ref,
      ) as typeof defaultKnowledgePersistencePolicyPrerequisiteRefs,
      approval_prerequisite_refs:
        defaultKnowledgePersistenceApprovalPrerequisiteRefs.map((ref) =>
          ref.approval_kind === "source_only_packet_review_ref"
            ? {
                ...ref,
                current_state: "approval_request_created",
                approval_request_creation_allowed: true,
                approval_mutation_allowed: true,
              }
            : ref,
        ) as typeof defaultKnowledgePersistenceApprovalPrerequisiteRefs,
      audit_obligation_refs: defaultKnowledgePersistenceAuditObligationRefs.map(
        (ref) =>
          ref.audit_kind === "future_knowledge_write_audit_required"
            ? {
                ...ref,
                current_state: "audit_written",
                audit_write_allowed: true,
                persisted_storage_allowed: true,
              }
            : ref,
      ) as typeof defaultKnowledgePersistenceAuditObligationRefs,
      rollback_refs: defaultKnowledgePersistenceRollbackRefs.map((ref) =>
        ref.rollback_kind === "disable_future_writer_path"
          ? {
              ...ref,
              current_state: "rollback_executed",
              rollback_execution_allowed: true,
              live_execution_allowed: true,
            }
          : ref,
      ) as typeof defaultKnowledgePersistenceRollbackRefs,
      validation_command_refs: defaultKnowledgePersistenceValidationCommandRefs.map(
        (ref) =>
          ref.validation_kind === "full_workspace_check"
            ? {
                ...ref,
                command_ref: "git push origin main",
                current_state: "live_command",
                live_execution_allowed: true,
              }
            : ref,
      ) as typeof defaultKnowledgePersistenceValidationCommandRefs,
    } as unknown as KnowledgePersistenceImplementationPacketRequest);

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected drift failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "knowledge_persistence_implementation_packet.invalid_future_artifact_ref",
        }),
        expect.objectContaining({
          code: "knowledge_persistence_implementation_packet.persistence_write_forbidden",
        }),
        expect.objectContaining({
          code: "knowledge_persistence_implementation_packet.writer_implementation_forbidden",
        }),
        expect.objectContaining({
          code: "knowledge_persistence_implementation_packet.connection_or_sql_forbidden",
        }),
        expect.objectContaining({
          code: "knowledge_persistence_implementation_packet.invalid_policy_prerequisite_ref",
        }),
        expect.objectContaining({
          code: "knowledge_persistence_implementation_packet.approval_mutation_forbidden",
        }),
        expect.objectContaining({
          code: "knowledge_persistence_implementation_packet.audit_write_forbidden",
        }),
        expect.objectContaining({
          code: "knowledge_persistence_implementation_packet.runtime_or_live_execution_forbidden",
        }),
        expect.objectContaining({
          code: "knowledge_persistence_implementation_packet.invalid_validation_command_ref",
        }),
      ]),
    );
    expect(result.raw_input_content).toBe("withheld");
  });

  it("fails closed on unsafe allowed state, no-live posture, blocked capabilities, secrets, and side effects", () => {
    const blockedCapabilityRequest = Object.fromEntries(
      knowledgePersistenceImplementationBlockedCapabilityFlags.map((flag) => [
        flag,
        true,
      ]),
    ) as unknown as KnowledgePersistenceImplementationPacketRequest;

    const blockedCapabilityResult = createKnowledgePersistenceImplementationPacket(
      blockedCapabilityRequest,
    );

    expect(blockedCapabilityResult.ok).toBe(false);
    if (blockedCapabilityResult.ok) {
      throw new Error("expected blocked capability failure");
    }
    expect(blockedCapabilityResult.errors.length).toBeGreaterThan(0);
    expect(blockedCapabilityResult.raw_input_content).toBe("withheld");

    const unsafeStateResult = createKnowledgePersistenceImplementationPacket({
      no_live_posture: {
        ...defaultKnowledgePersistenceNoLivePosture,
        database_connection_allowed: true,
        approval_mutation_allowed: true,
        live_execution_allowed: true,
      },
      allowed_state: {
        ...defaultKnowledgePersistenceAllowedState,
        source_only_implementation_packet_contract_allowed: false,
        database_write_allowed: true,
        writer_implementation_allowed: true,
        python_runtime_required: true,
        os_specific_binary_required: true,
      },
      source_refs: [
        {
          source_ref: "docs/DATABASE_URL.md",
          summary: "read PRIVATE KEY and connect to postgres://example",
        },
      ],
      side_effects: ["db-write"],
      command: "npm run test",
    } as unknown as KnowledgePersistenceImplementationPacketRequest);

    expect(unsafeStateResult.ok).toBe(false);
    if (unsafeStateResult.ok) {
      throw new Error("expected unsafe state failure");
    }
    expect(unsafeStateResult.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "knowledge_persistence_implementation_packet.no_live_posture_drift",
        }),
        expect.objectContaining({
          code: "knowledge_persistence_implementation_packet.allowed_state_drift",
        }),
        expect.objectContaining({
          code: "knowledge_persistence_implementation_packet.secret_value_forbidden",
        }),
        expect.objectContaining({
          code: "knowledge_persistence_implementation_packet.invalid_source_ref",
        }),
        expect.objectContaining({
          code: "knowledge_persistence_implementation_packet.unexpected_field",
          path: "/command",
        }),
        expect.objectContaining({
          code: "knowledge_persistence_implementation_packet.side_effects_forbidden",
          path: "/side_effects",
        }),
      ]),
    );
    expect(JSON.stringify(unsafeStateResult)).not.toContain("PRIVATE KEY");
    expect(JSON.stringify(unsafeStateResult)).not.toContain("postgres://example");
    expect(JSON.stringify(unsafeStateResult)).not.toContain("npm run test");
  });

  it("does not emit DB client, SQL/DDL, migration, writer, queue, runtime, external service, or OS connector artifacts", () => {
    const result = createKnowledgePersistenceImplementationPacket();

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected knowledge persistence implementation packet success");
    }

    expect(result.knowledge_persistence_implementation_packet).toMatchObject({
      future_runtime_evidence_refs: {
        knowledge_records: null,
        context_bundles: null,
        chunks: [],
        eval_runs: null,
      },
      sql_artifacts: [],
      ddl_artifacts: [],
      migration_artifacts: [],
      writer_artifacts: [],
      persisted_storage_artifacts: [],
      runtime_artifacts: [],
      live_storage_artifacts: [],
      side_effects: [],
    });
    expect(
      result.knowledge_persistence_implementation_packet.blocked_capabilities,
    ).toEqual(
      expect.arrayContaining([
        "database_connection_allowed",
        "database_write_allowed",
        "sql_artifact_allowed",
        "ddl_artifact_allowed",
        "writer_implementation_allowed",
        "persisted_storage_allowed",
        "queue_mutation_allowed",
        "runtime_dispatcher_allowed",
        "external_service_call_allowed",
        "os_connector_package_allowed",
      ]),
    );
  });
});
