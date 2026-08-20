import { describe, expect, it } from "vitest";
import {
  createPersistedKnowledgeReadSurface,
  defaultPersistedKnowledgeReadAllowedState,
  defaultPersistedKnowledgeReadApprovalPrerequisiteRefs,
  defaultPersistedKnowledgeReadAuditObligationRefs,
  defaultPersistedKnowledgeReadNoLivePosture,
  defaultPersistedKnowledgeReadPolicyPrerequisiteRefs,
  defaultPersistedKnowledgeReadQueryRefs,
  defaultPersistedKnowledgeReadResultRefs,
  defaultPersistedKnowledgeReadRollbackRefs,
  defaultPersistedKnowledgeReadValidationCommandRefs,
  defaultPersistedKnowledgeTenantProjectScopeRefs,
  knowledgeEvalHarnessContract,
  knowledgePersistenceImplementationPacketContract,
  knowledgeSearchContextContract,
  localKnowledgeRecordContract,
  localRepoKnowledgeIndexContract,
  persistedKnowledgeReadSurfaceApprovalPrerequisiteKinds,
  persistedKnowledgeReadSurfaceAuditObligationKinds,
  persistedKnowledgeReadSurfaceBlockedCapabilityFlags,
  persistedKnowledgeReadSurfaceContract,
  persistedKnowledgeReadSurfaceContractTargetGate,
  persistedKnowledgeReadSurfacePolicyPrerequisiteKinds,
  persistedKnowledgeReadSurfaceQueryKinds,
  persistedKnowledgeReadSurfaceResultKinds,
  persistedKnowledgeReadSurfaceRollbackKinds,
  persistedKnowledgeReadSurfaceValidationKinds,
  persistencePolicyGateContract,
  persistencePolicyGateIds,
  persistenceReadinessPreflightContract,
  persistenceReadinessPreflightTargetGate,
  persistenceSchemaContract,
  type PersistedKnowledgeReadSurfaceRequest,
} from "../src/index.js";

describe("persisted knowledge read surface contract", () => {
  it("emits BP-0215 source-only persisted knowledge read surface evidence", () => {
    const result = createPersistedKnowledgeReadSurface();

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected persisted knowledge read surface success");
    }

    expect(result.persisted_knowledge_read_surface).toMatchObject({
      contract_id: persistedKnowledgeReadSurfaceContract.contract_id,
      read_surface_version: "0.1",
      read_surface_identity: {
        packet_ref: "BP-0215",
        selected_after_packet_ref: "BP-0214",
        read_surface_ref: "read_surface:persisted_knowledge_source_only",
        target_gate: persistedKnowledgeReadSurfaceContractTargetGate,
        read_surface_mode: "source_contract_only",
      },
      target_gate: persistedKnowledgeReadSurfaceContractTargetGate,
      prerequisite_gate: persistenceReadinessPreflightTargetGate,
      implementation_packet_contract_id:
        knowledgePersistenceImplementationPacketContract.contract_id,
      policy_gate_contract_id: persistencePolicyGateContract.contract_id,
      persistence_readiness_contract_id:
        persistenceReadinessPreflightContract.contract_id,
      persistence_schema_contract_id: persistenceSchemaContract.contract_id,
      knowledge_record_contract_id: localKnowledgeRecordContract.contract_id,
      local_repo_index_contract_id: localRepoKnowledgeIndexContract.contract_id,
      knowledge_search_context_contract_id: knowledgeSearchContextContract.contract_id,
      knowledge_eval_harness_contract_id: knowledgeEvalHarnessContract.contract_id,
      gate_sequence: [...persistencePolicyGateIds],
      no_live_posture: defaultPersistedKnowledgeReadNoLivePosture,
      allowed_state: defaultPersistedKnowledgeReadAllowedState,
      query_runner_artifacts: [],
      sql_artifacts: [],
      ddl_artifacts: [],
      migration_artifacts: [],
      writer_artifacts: [],
      persisted_storage_artifacts: [],
      gateway_route_artifacts: [],
      mcp_tool_artifacts: [],
      runtime_artifacts: [],
      live_storage_artifacts: [],
      database_connection_allowed: false,
      database_read_allowed: false,
      query_runner_allowed: false,
      sql_query_execution_allowed: false,
      live_execution_allowed: false,
      python_runtime_required: false,
      os_specific_binary_required: false,
      side_effects: [],
    });
    expect(
      result.persisted_knowledge_read_surface.query_refs.map((ref) => ref.query_kind),
    ).toEqual([...persistedKnowledgeReadSurfaceQueryKinds]);
    expect(
      result.persisted_knowledge_read_surface.result_refs.map((ref) => ref.result_kind),
    ).toEqual([...persistedKnowledgeReadSurfaceResultKinds]);
    expect(
      result.persisted_knowledge_read_surface.policy_prerequisite_refs.map(
        (ref) => ref.prerequisite_kind,
      ),
    ).toEqual([...persistedKnowledgeReadSurfacePolicyPrerequisiteKinds]);
    expect(
      result.persisted_knowledge_read_surface.approval_prerequisite_refs.map(
        (ref) => ref.approval_kind,
      ),
    ).toEqual([...persistedKnowledgeReadSurfaceApprovalPrerequisiteKinds]);
    expect(
      result.persisted_knowledge_read_surface.audit_obligation_refs.map(
        (ref) => ref.audit_kind,
      ),
    ).toEqual([...persistedKnowledgeReadSurfaceAuditObligationKinds]);
    expect(
      result.persisted_knowledge_read_surface.rollback_refs.map(
        (ref) => ref.rollback_kind,
      ),
    ).toEqual([...persistedKnowledgeReadSurfaceRollbackKinds]);
    expect(
      result.persisted_knowledge_read_surface.validation_command_refs.map(
        (ref) => ref.validation_kind,
      ),
    ).toEqual([...persistedKnowledgeReadSurfaceValidationKinds]);
    expect(result.persisted_knowledge_read_surface.source_refs).toEqual(
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

  it("fails closed on missing persisted read surface evidence", () => {
    const result = createPersistedKnowledgeReadSurface({
      gate_sequence: persistencePolicyGateIds.filter(
        (gateId) => gateId !== "G09_IMPLEMENTATION_PACKET",
      ),
      query_refs: defaultPersistedKnowledgeReadQueryRefs.filter(
        (ref) => ref.query_kind !== "source_snapshot_query",
      ),
      result_refs: defaultPersistedKnowledgeReadResultRefs.filter(
        (ref) => ref.result_kind !== "source_snapshot_result",
      ),
      tenant_project_scope_refs: defaultPersistedKnowledgeTenantProjectScopeRefs.filter(
        (ref) => ref.scope_kind !== "deny_cross_tenant_by_default",
      ),
      policy_prerequisite_refs:
        defaultPersistedKnowledgeReadPolicyPrerequisiteRefs.filter(
          (ref) => ref.prerequisite_kind !== "bp0214_implementation_packet_ref",
        ),
      approval_prerequisite_refs:
        defaultPersistedKnowledgeReadApprovalPrerequisiteRefs.filter(
          (ref) => ref.approval_kind !== "no_query_runner_request_ref",
        ),
      audit_obligation_refs: defaultPersistedKnowledgeReadAuditObligationRefs.filter(
        (ref) => ref.audit_kind !== "future_query_audit_required",
      ),
      rollback_refs: defaultPersistedKnowledgeReadRollbackRefs.filter(
        (ref) => ref.rollback_kind !== "disable_future_query_runner",
      ),
      validation_command_refs:
        defaultPersistedKnowledgeReadValidationCommandRefs.filter(
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
      throw new Error("expected missing persisted read surface failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "persisted_knowledge_read_surface.gate_sequence_required",
          path: "/gate_sequence",
        }),
        expect.objectContaining({
          code: "persisted_knowledge_read_surface.query_ref_required",
          path: "/query_refs",
        }),
        expect.objectContaining({
          code: "persisted_knowledge_read_surface.result_ref_required",
          path: "/result_refs",
        }),
        expect.objectContaining({
          code: "persisted_knowledge_read_surface.tenant_project_scope_ref_required",
          path: "/tenant_project_scope_refs",
        }),
        expect.objectContaining({
          code: "persisted_knowledge_read_surface.policy_prerequisite_ref_required",
          path: "/policy_prerequisite_refs",
        }),
        expect.objectContaining({
          code: "persisted_knowledge_read_surface.approval_prerequisite_ref_required",
          path: "/approval_prerequisite_refs",
        }),
        expect.objectContaining({
          code: "persisted_knowledge_read_surface.audit_obligation_ref_required",
          path: "/audit_obligation_refs",
        }),
        expect.objectContaining({
          code: "persisted_knowledge_read_surface.rollback_ref_required",
          path: "/rollback_refs",
        }),
        expect.objectContaining({
          code: "persisted_knowledge_read_surface.validation_command_ref_required",
          path: "/validation_command_refs",
        }),
        expect.objectContaining({
          code: "persisted_knowledge_read_surface.source_ref_required",
          path: "/source_refs",
        }),
      ]),
    );
    expect(result.raw_input_content).toBe("withheld");
  });

  it("fails closed on drift toward query runner, DB reads, persistence, approval, audit, runtime, or OS scope", () => {
    const result = createPersistedKnowledgeReadSurface({
      query_refs: defaultPersistedKnowledgeReadQueryRefs.map((ref) =>
        ref.query_kind === "knowledge_record_query"
          ? {
              ...ref,
              query_ref: "query_shape:live-db-query-runner",
              current_state: "query_runner_ready",
              database_connection_allowed: true,
              database_read_allowed: true,
              query_runner_allowed: true,
              sql_query_execution_allowed: true,
              live_execution_allowed: true,
            }
          : ref,
      ) as typeof defaultPersistedKnowledgeReadQueryRefs,
      result_refs: defaultPersistedKnowledgeReadResultRefs.map((ref) =>
        ref.result_kind === "knowledge_record_result"
          ? {
              ...ref,
              citation_refs_required: false,
              current_state: "database_result_live",
              persisted_storage_mutation_allowed: true,
              database_read_allowed: true,
              live_execution_allowed: true,
            }
          : ref,
      ) as typeof defaultPersistedKnowledgeReadResultRefs,
      tenant_project_scope_refs: defaultPersistedKnowledgeTenantProjectScopeRefs.map(
        (ref) =>
          ref.scope_kind === "deny_cross_tenant_by_default"
            ? {
                ...ref,
                scope_ref: "/tmp/live-scope.ts",
                current_state: "scope_mutated",
                database_connection_allowed: true,
                authorization_mutation_allowed: true,
              }
            : ref,
      ) as typeof defaultPersistedKnowledgeTenantProjectScopeRefs,
      approval_prerequisite_refs:
        defaultPersistedKnowledgeReadApprovalPrerequisiteRefs.map((ref) =>
          ref.approval_kind === "source_only_packet_review_ref"
            ? {
                ...ref,
                current_state: "approval_request_created",
                approval_request_creation_allowed: true,
                approval_mutation_allowed: true,
              }
            : ref,
        ) as typeof defaultPersistedKnowledgeReadApprovalPrerequisiteRefs,
      audit_obligation_refs: defaultPersistedKnowledgeReadAuditObligationRefs.map(
        (ref) =>
          ref.audit_kind === "future_query_audit_required"
            ? {
                ...ref,
                current_state: "audit_written",
                audit_write_allowed: true,
                persisted_storage_mutation_allowed: true,
              }
            : ref,
      ) as typeof defaultPersistedKnowledgeReadAuditObligationRefs,
      rollback_refs: defaultPersistedKnowledgeReadRollbackRefs.map((ref) =>
        ref.rollback_kind === "disable_future_query_runner"
          ? {
              ...ref,
              current_state: "rollback_executed",
              rollback_execution_allowed: true,
              live_execution_allowed: true,
            }
          : ref,
      ) as typeof defaultPersistedKnowledgeReadRollbackRefs,
      validation_command_refs: defaultPersistedKnowledgeReadValidationCommandRefs.map(
        (ref) =>
          ref.validation_kind === "full_workspace_check"
            ? {
                ...ref,
                command_ref: "psql DATABASE_URL -c select",
                current_state: "live_command",
                live_execution_allowed: true,
              }
            : ref,
      ) as typeof defaultPersistedKnowledgeReadValidationCommandRefs,
    } as unknown as PersistedKnowledgeReadSurfaceRequest);

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected persisted read drift failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "persisted_knowledge_read_surface.invalid_query_ref",
        }),
        expect.objectContaining({
          code: "persisted_knowledge_read_surface.connection_or_sql_forbidden",
        }),
        expect.objectContaining({
          code: "persisted_knowledge_read_surface.query_runner_forbidden",
        }),
        expect.objectContaining({
          code: "persisted_knowledge_read_surface.invalid_result_ref",
        }),
        expect.objectContaining({
          code: "persisted_knowledge_read_surface.persistence_write_forbidden",
        }),
        expect.objectContaining({
          code: "persisted_knowledge_read_surface.invalid_tenant_project_scope_ref",
        }),
        expect.objectContaining({
          code: "persisted_knowledge_read_surface.auth_or_integration_forbidden",
        }),
        expect.objectContaining({
          code: "persisted_knowledge_read_surface.approval_mutation_forbidden",
        }),
        expect.objectContaining({
          code: "persisted_knowledge_read_surface.audit_write_forbidden",
        }),
        expect.objectContaining({
          code: "persisted_knowledge_read_surface.runtime_or_live_execution_forbidden",
        }),
        expect.objectContaining({
          code: "persisted_knowledge_read_surface.invalid_validation_command_ref",
        }),
      ]),
    );
    expect(result.raw_input_content).toBe("withheld");
  });

  it("fails closed on unsafe allowed state, no-live posture, blocked capabilities, secrets, and side effects", () => {
    const blockedCapabilityRequest = Object.fromEntries(
      persistedKnowledgeReadSurfaceBlockedCapabilityFlags.map((flag) => [flag, true]),
    ) as unknown as PersistedKnowledgeReadSurfaceRequest;

    const blockedCapabilityResult = createPersistedKnowledgeReadSurface(
      blockedCapabilityRequest,
    );

    expect(blockedCapabilityResult.ok).toBe(false);
    if (blockedCapabilityResult.ok) {
      throw new Error("expected blocked capability failure");
    }
    expect(blockedCapabilityResult.errors.length).toBeGreaterThan(0);
    expect(blockedCapabilityResult.raw_input_content).toBe("withheld");

    const unsafeStateResult = createPersistedKnowledgeReadSurface({
      no_live_posture: {
        ...defaultPersistedKnowledgeReadNoLivePosture,
        database_connection_allowed: true,
        database_read_allowed: true,
        query_runner_allowed: true,
        live_execution_allowed: true,
      },
      allowed_state: {
        ...defaultPersistedKnowledgeReadAllowedState,
        source_only_read_surface_contract_allowed: false,
        database_read_allowed: true,
        query_runner_allowed: true,
        python_runtime_required: true,
        os_specific_binary_required: true,
      },
      source_refs: [
        {
          source_ref: "docs/DATABASE_URL.md",
          summary: "read PRIVATE KEY and connect to postgres://example",
        },
      ],
      side_effects: ["db-read"],
      command: "npm run test",
    } as unknown as PersistedKnowledgeReadSurfaceRequest);

    expect(unsafeStateResult.ok).toBe(false);
    if (unsafeStateResult.ok) {
      throw new Error("expected unsafe state failure");
    }
    expect(unsafeStateResult.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "persisted_knowledge_read_surface.no_live_posture_drift",
        }),
        expect.objectContaining({
          code: "persisted_knowledge_read_surface.allowed_state_drift",
        }),
        expect.objectContaining({
          code: "persisted_knowledge_read_surface.secret_value_forbidden",
        }),
        expect.objectContaining({
          code: "persisted_knowledge_read_surface.invalid_source_ref",
        }),
        expect.objectContaining({
          code: "persisted_knowledge_read_surface.unexpected_field",
          path: "/command",
        }),
        expect.objectContaining({
          code: "persisted_knowledge_read_surface.side_effects_forbidden",
          path: "/side_effects",
        }),
      ]),
    );
    expect(JSON.stringify(unsafeStateResult)).not.toContain("PRIVATE KEY");
    expect(JSON.stringify(unsafeStateResult)).not.toContain("postgres://example");
    expect(JSON.stringify(unsafeStateResult)).not.toContain("npm run test");
  });

  it("does not emit DB client, query runner, SQL/DDL, Gateway, MCP, runtime, external service, or OS connector artifacts", () => {
    const result = createPersistedKnowledgeReadSurface();

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected persisted knowledge read surface success");
    }

    expect(result.persisted_knowledge_read_surface).toMatchObject({
      query_runner_artifacts: [],
      sql_artifacts: [],
      ddl_artifacts: [],
      migration_artifacts: [],
      writer_artifacts: [],
      persisted_storage_artifacts: [],
      gateway_route_artifacts: [],
      mcp_tool_artifacts: [],
      runtime_artifacts: [],
      live_storage_artifacts: [],
      side_effects: [],
    });
    expect(result.persisted_knowledge_read_surface.blocked_capabilities).toEqual(
      expect.arrayContaining([
        "database_connection_allowed",
        "database_read_allowed",
        "query_runner_allowed",
        "sql_query_execution_allowed",
        "gateway_route_implementation_allowed",
        "mcp_tool_registration_allowed",
        "external_service_call_allowed",
        "os_connector_package_allowed",
      ]),
    );
  });
});
