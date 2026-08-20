import { describe, expect, it } from "vitest";
import {
  createPersistenceSchemaContract,
  defaultPersistenceSchemaAllowedState,
  defaultPersistenceSchemaEntities,
  persistenceSchemaBlockedCapabilityFlags,
  persistenceSchemaContract,
  persistenceSchemaEntityNames,
  persistenceSchemaMigrationReadinessRefs,
  persistenceSchemaRetentionClasses,
  persistenceSchemaRoleBoundaryRefs,
} from "../src/index.js";

describe("persistence schema contract", () => {
  it("emits BP-0204 source-only schema entities and persistence readiness refs", () => {
    const result = createPersistenceSchemaContract();

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected persistence schema contract success");
    }

    expect(result.persistence_schema_contract).toMatchObject({
      contract_id: persistenceSchemaContract.contract_id,
      schema_version: "0.1",
      required_entity_names: [...persistenceSchemaEntityNames],
      retention_classes: [...persistenceSchemaRetentionClasses],
      role_boundary_refs: [...persistenceSchemaRoleBoundaryRefs],
      migration_readiness_refs: [...persistenceSchemaMigrationReadinessRefs],
      allowed_state: defaultPersistenceSchemaAllowedState,
      implementation_artifacts: [],
      migration_artifacts: [],
      live_storage_allowed: false,
      live_execution_allowed: false,
      python_runtime_required: false,
      os_specific_binary_required: false,
      side_effects: [],
    });
    expect(
      result.persistence_schema_contract.entities.map((entity) => entity.entity_name),
    ).toEqual([...persistenceSchemaEntityNames]);
    expect(result.persistence_schema_contract.entities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          entity_name: "audit_events",
          tenant_project_scope: "direct",
          retention_class: "audit_hot",
          role_boundary_refs: expect.arrayContaining(["writer_append_only"]),
          migration_readiness_refs: expect.arrayContaining([
            "G04_WRITER_PREFLIGHT",
            "G05_DATABASE_SECURITY",
            "G08_PERSISTENCE_READINESS",
          ]),
          current_state: "source_contract_only",
          live_storage_allowed: false,
        }),
        expect.objectContaining({
          entity_name: "auth_session_descriptors",
          tenant_project_scope: "direct",
          retention_class: "auth_integration_reference",
        }),
        expect.objectContaining({
          entity_name: "integration_descriptors",
          tenant_project_scope: "direct",
          retention_class: "auth_integration_reference",
        }),
      ]),
    );
    expect(result.persistence_schema_contract.source_refs).toEqual(
      expect.arrayContaining([
        "docs/architecture/PERSISTENCE_SCHEMA_PLAN.md",
        "docs/architecture/PERSISTENCE_AND_POLICY_GATE_REVIEW.md",
        "docs/architecture/AUTH_AND_INTEGRATION_POSTURE.md",
        "docs/reference/CONTRACT_PROVENANCE.md",
        "docs/reference/CONTRACT_PROVENANCE.md",
        "docs/reference/CONTRACT_PROVENANCE.md",
      ]),
    );
    expect(result.side_effects).toEqual([]);
  });

  it("fails closed on missing required entity evidence", () => {
    const result = createPersistenceSchemaContract({
      entities: defaultPersistenceSchemaEntities.filter(
        (entity) => entity.entity_name !== "audit_events",
      ),
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected missing entity failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "persistence_schema_contract.entity_required",
          path: "/entities",
        }),
        expect.objectContaining({
          code: "persistence_schema_contract.entity_set_drift",
          path: "/entities",
        }),
      ]),
    );
    expect(result.raw_input_content).toBe("withheld");
  });

  it("fails closed on tenant scope, retention, role, and migration readiness drift", () => {
    const result = createPersistenceSchemaContract({
      entities: defaultPersistenceSchemaEntities.map((entity) =>
        entity.entity_name === "audit_events"
          ? {
              ...entity,
              field_names: [],
              tenant_project_scope: "none",
              retention_class: "forever",
              role_boundary_refs: ["root"],
              migration_readiness_refs: ["LIVE_REQUEST"],
              live_storage_allowed: true,
            }
          : entity,
      ) as typeof defaultPersistenceSchemaEntities,
      retention_classes: persistenceSchemaRetentionClasses.filter(
        (retentionClass) => retentionClass !== "audit_hot",
      ),
      role_boundary_refs: persistenceSchemaRoleBoundaryRefs.filter(
        (roleBoundaryRef) => roleBoundaryRef !== "writer_append_only",
      ),
      migration_readiness_refs: persistenceSchemaMigrationReadinessRefs.filter(
        (migrationReadinessRef) =>
          migrationReadinessRef !== "G08_PERSISTENCE_READINESS",
      ),
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected schema drift failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "persistence_schema_contract.field_evidence_required",
          path: "/entities/13/field_names",
        }),
        expect.objectContaining({
          code: "persistence_schema_contract.invalid_entity",
          path: "/entities/13/tenant_project_scope",
        }),
        expect.objectContaining({
          code: "persistence_schema_contract.retention_class_required",
          path: "/entities/13/retention_class",
        }),
        expect.objectContaining({
          code: "persistence_schema_contract.role_boundary_ref_required",
          path: "/entities/13/role_boundary_refs/0",
        }),
        expect.objectContaining({
          code: "persistence_schema_contract.migration_readiness_ref_required",
          path: "/entities/13/migration_readiness_refs/0",
        }),
        expect.objectContaining({
          code: "persistence_schema_contract.live_execution_forbidden",
          path: "/entities/13/live_storage_allowed",
        }),
        expect.objectContaining({
          code: "persistence_schema_contract.retention_class_required",
          path: "/retention_classes",
        }),
        expect.objectContaining({
          code: "persistence_schema_contract.role_boundary_ref_required",
          path: "/role_boundary_refs",
        }),
        expect.objectContaining({
          code: "persistence_schema_contract.migration_readiness_ref_required",
          path: "/migration_readiness_refs",
        }),
      ]),
    );
  });

  it("fails closed on blocked DB, migration, runtime, auth, OS, Python, and external-service flags", () => {
    const request = Object.fromEntries(
      persistenceSchemaBlockedCapabilityFlags.map((flag) => [flag, true]),
    );
    const result = createPersistenceSchemaContract(request);

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected blocked capability failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "persistence_schema_contract.blocked_capability_forbidden",
          path: "/database_connection_allowed",
        }),
        expect.objectContaining({
          code: "persistence_schema_contract.blocked_capability_forbidden",
          path: "/schema_sql_artifact_allowed",
        }),
        expect.objectContaining({
          code: "persistence_schema_contract.live_execution_forbidden",
          path: "/live_storage_allowed",
        }),
        expect.objectContaining({
          code: "persistence_schema_contract.live_execution_forbidden",
          path: "/live_execution_allowed",
        }),
        expect.objectContaining({
          code: "persistence_schema_contract.python_runtime_requirement_forbidden",
          path: "/python_runtime_required",
        }),
        expect.objectContaining({
          code: "persistence_schema_contract.os_specific_binary_requirement_forbidden",
          path: "/os_specific_binary_required",
        }),
      ]),
    );
  });

  it("fails closed on unsafe allowed state, secret-like refs, fields, and side effects", () => {
    const result = createPersistenceSchemaContract({
      entities: defaultPersistenceSchemaEntities.map((entity) =>
        entity.entity_name === "knowledge_sources"
          ? {
              ...entity,
              field_names: ["source_id", "api_key"],
              source_refs: ["docs/secret-token.md"],
            }
          : entity,
      ) as typeof defaultPersistenceSchemaEntities,
      source_refs: [
        {
          source_ref: "docs/architecture/PERSISTENCE_SCHEMA_PLAN.md",
          summary: "valid source ref",
        },
        {
          source_ref: "docs/secret-token.md",
          summary: "token value",
        },
      ],
      allowed_state: {
        ...defaultPersistenceSchemaAllowedState,
        secret_posture: "inline-secret-values",
        live_storage_allowed: true,
        live_execution_allowed: true,
        python_runtime_required: true,
        os_specific_binary_required: true,
      },
      side_effects: ["opened-db"],
    } as Parameters<typeof createPersistenceSchemaContract>[0]);

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected unsafe schema posture failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "persistence_schema_contract.invalid_field",
          path: "/entities/0/field_names/1",
        }),
        expect.objectContaining({
          code: "persistence_schema_contract.invalid_source_ref",
          path: "/entities/0/source_refs/0",
        }),
        expect.objectContaining({
          code: "persistence_schema_contract.invalid_source_ref",
          path: "/source_refs/1/source_ref",
        }),
        expect.objectContaining({
          code: "persistence_schema_contract.secret_value_forbidden",
          path: "/allowed_state/secret_posture",
        }),
        expect.objectContaining({
          code: "persistence_schema_contract.live_execution_forbidden",
          path: "/allowed_state/live_storage_allowed",
        }),
        expect.objectContaining({
          code: "persistence_schema_contract.python_runtime_requirement_forbidden",
          path: "/allowed_state/python_runtime_required",
        }),
        expect.objectContaining({
          code: "persistence_schema_contract.os_specific_binary_requirement_forbidden",
          path: "/allowed_state/os_specific_binary_required",
        }),
        expect.objectContaining({
          code: "persistence_schema_contract.side_effects_forbidden",
          path: "/side_effects",
        }),
      ]),
    );
    expect(JSON.stringify(result)).not.toContain("secret-token");
    expect(JSON.stringify(result)).not.toContain("token value");
    expect(JSON.stringify(result)).not.toContain("opened-db");
  });

  it("proves no DB, SQL, writer, runtime, migration runner, or OS connector behavior is implemented", () => {
    const result = createPersistenceSchemaContract();

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected persistence schema contract success");
    }

    const evidence = result.persistence_schema_contract as Record<string, unknown>;

    expect(result.persistence_schema_contract.blocked_capabilities).toEqual(
      expect.arrayContaining([
        "database_connection_allowed",
        "database_write_allowed",
        "migration_execution_allowed",
        "writer_implementation_allowed",
        "schema_sql_artifact_allowed",
        "schema_migration_runner_allowed",
        "runtime_adapter_implementation_allowed",
        "os_specific_binary_required",
        "external_service_call_allowed",
      ]),
    );
    expect(result.persistence_schema_contract.implementation_artifacts).toEqual([]);
    expect(result.persistence_schema_contract.migration_artifacts).toEqual([]);
    expect(evidence.database_client).toBeUndefined();
    expect(evidence.connection_string).toBeUndefined();
    expect(evidence.database_url).toBeUndefined();
    expect(evidence.sql).toBeUndefined();
    expect(evidence.migration_runner).toBeUndefined();
    expect(evidence.writer).toBeUndefined();
    expect(evidence.runtime_dispatcher).toBeUndefined();
    expect(evidence.os_connector_package).toBeUndefined();
  });
});
