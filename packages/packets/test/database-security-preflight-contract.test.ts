import { describe, expect, it } from "vitest";
import {
  createDatabaseSecurityPreflightContract,
  databaseSecurityGrantRefKinds,
  databaseSecurityIsolationRefKinds,
  databaseSecurityPreflightBlockedCapabilityFlags,
  databaseSecurityPreflightContract,
  databaseSecurityPreflightTargetGate,
  databaseSecurityRoleBoundaryKinds,
  databaseSecurityStaticCheckIds,
  defaultDatabaseSecurityAllowedState,
  defaultDatabaseSecurityGrantRefs,
  defaultDatabaseSecurityIsolationRefs,
  defaultDatabaseSecurityNoConnectionPosture,
  defaultDatabaseSecurityRoleBoundaryRefs,
  defaultDatabaseSecuritySchemaEntityRefs,
  defaultDatabaseSecurityStaticChecks,
  migrationArtifactStaticReviewContract,
  persistencePolicyGateIds,
  persistenceSchemaContract,
  persistenceSchemaEntityNames,
  writerPreflightContract,
} from "../src/index.js";

describe("database security preflight contract", () => {
  it("emits BP-0209 source-only database security evidence", () => {
    const result = createDatabaseSecurityPreflightContract();

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected database security preflight success");
    }

    expect(result.database_security_preflight_contract).toMatchObject({
      contract_id: databaseSecurityPreflightContract.contract_id,
      security_version: "0.1",
      target_gate: databaseSecurityPreflightTargetGate,
      persistence_schema_contract_id: persistenceSchemaContract.contract_id,
      migration_static_review_contract_id:
        migrationArtifactStaticReviewContract.contract_id,
      writer_preflight_contract_id: writerPreflightContract.contract_id,
      required_gate_ids: [...persistencePolicyGateIds],
      required_entity_names: [...persistenceSchemaEntityNames],
      allowed_state: defaultDatabaseSecurityAllowedState,
      no_connection_posture: defaultDatabaseSecurityNoConnectionPosture,
      implementation_artifacts: [],
      database_security_execution_artifacts: [],
      sql_artifacts: [],
      database_connection_allowed: false,
      database_write_allowed: false,
      sql_execution_allowed: false,
      ddl_execution_allowed: false,
      role_grant_mutation_allowed: false,
      role_grant_execution_allowed: false,
      grant_application_allowed: false,
      writer_implementation_allowed: false,
      migration_execution_allowed: false,
      live_storage_allowed: false,
      live_execution_allowed: false,
      python_runtime_required: false,
      os_specific_binary_required: false,
      side_effects: [],
    });
    expect(
      result.database_security_preflight_contract.schema_entity_refs.map(
        (ref) => ref.entity_name,
      ),
    ).toEqual([...persistenceSchemaEntityNames]);
    expect(
      result.database_security_preflight_contract.isolation_refs.map(
        (ref) => ref.isolation_kind,
      ),
    ).toEqual([...databaseSecurityIsolationRefKinds]);
    expect(
      result.database_security_preflight_contract.role_boundary_refs.map(
        (ref) => ref.role_kind,
      ),
    ).toEqual([...databaseSecurityRoleBoundaryKinds]);
    expect(
      result.database_security_preflight_contract.grant_refs.map(
        (ref) => ref.grant_kind,
      ),
    ).toEqual([...databaseSecurityGrantRefKinds]);
    expect(
      result.database_security_preflight_contract.static_checks.map(
        (check) => check.check_id,
      ),
    ).toEqual([...databaseSecurityStaticCheckIds]);
    expect(result.database_security_preflight_contract.source_refs).toEqual(
      expect.arrayContaining([
        "docs/architecture/PERSISTENCE_AND_POLICY_GATE_REVIEW.md",
        "docs/architecture/PERSISTENCE_SCHEMA_PLAN.md",
        "packages/packets/src/persistence-policy-gate.ts",
        "packages/packets/src/persistence-schema-contract.ts",
        "packages/packets/src/migration-artifact-static-review.ts",
        "packages/packets/src/writer-preflight-contract.ts",
        "docs/reference/CONTRACT_PROVENANCE.md",
        "docs/reference/CONTRACT_PROVENANCE.md",
      ]),
    );
    expect(result.side_effects).toEqual([]);
  });

  it("fails closed on missing database security preflight evidence", () => {
    const result = createDatabaseSecurityPreflightContract({
      gate_sequence: persistencePolicyGateIds.filter(
        (gateId) => gateId !== "G05_DATABASE_SECURITY",
      ),
      schema_entity_refs: defaultDatabaseSecuritySchemaEntityRefs.filter(
        (ref) => ref.entity_name !== "audit_events",
      ),
      isolation_refs: defaultDatabaseSecurityIsolationRefs.filter(
        (ref) => ref.isolation_kind !== "tenant_project_scope_ref",
      ),
      role_boundary_refs: defaultDatabaseSecurityRoleBoundaryRefs.filter(
        (ref) => ref.role_kind !== "writer_role_ref",
      ),
      grant_refs: defaultDatabaseSecurityGrantRefs.filter(
        (ref) => ref.grant_kind !== "deny_by_default_grant_ref",
      ),
      static_checks: defaultDatabaseSecurityStaticChecks.filter(
        (check) => check.check_id !== "NO_ROLE_GRANT_EXECUTION",
      ),
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected missing database security evidence failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "database_security.gate_sequence_required",
          path: "/gate_sequence",
        }),
        expect.objectContaining({
          code: "database_security.schema_entity_ref_required",
          path: "/schema_entity_refs",
        }),
        expect.objectContaining({
          code: "database_security.isolation_ref_required",
          path: "/isolation_refs",
        }),
        expect.objectContaining({
          code: "database_security.role_boundary_ref_required",
          path: "/role_boundary_refs",
        }),
        expect.objectContaining({
          code: "database_security.grant_ref_required",
          path: "/grant_refs",
        }),
        expect.objectContaining({
          code: "database_security.static_check_required",
          path: "/static_checks",
        }),
      ]),
    );
    expect(result.raw_input_content).toBe("withheld");
  });

  it("fails closed on schema, isolation, role, grant, and static-check drift", () => {
    const result = createDatabaseSecurityPreflightContract({
      schema_entity_refs: defaultDatabaseSecuritySchemaEntityRefs.map((ref) =>
        ref.entity_name === "audit_events"
          ? {
              ...ref,
              database_security_ref: "/tmp/live-db-security.ts",
              current_state: "ready_to_connect",
              target_gate: "G10_LIVE_REQUEST",
              tenant_project_scope_required: false,
              live_storage_allowed: true,
            }
          : ref,
      ) as typeof defaultDatabaseSecuritySchemaEntityRefs,
      isolation_refs: defaultDatabaseSecurityIsolationRefs.map((ref) =>
        ref.isolation_kind === "row_level_policy_or_equivalent_ref"
          ? {
              ...ref,
              isolation_ref: "http://example.com/policy",
              current_state: "policy_execution_ready",
              target_gate: "G10_LIVE_REQUEST",
              tenant_project_scope_required: false,
              database_policy_execution_allowed: true,
              live_storage_allowed: true,
            }
          : ref,
      ) as typeof defaultDatabaseSecurityIsolationRefs,
      role_boundary_refs: defaultDatabaseSecurityRoleBoundaryRefs.map((ref) =>
        ref.role_kind === "writer_role_ref"
          ? {
              ...ref,
              summary: "create role writer superuser",
              current_state: "grant_mutation_ready",
              database_role_connection_allowed: true,
              grant_mutation_allowed: true,
              sql_execution_allowed: true,
              superuser_role_allowed: true,
              bypass_rls_allowed: true,
            }
          : ref,
      ) as typeof defaultDatabaseSecurityRoleBoundaryRefs,
      grant_refs: defaultDatabaseSecurityGrantRefs.map((ref) =>
        ref.grant_kind === "deny_by_default_grant_ref"
          ? {
              ...ref,
              current_state: "grant_ready",
              deny_by_default: false,
              grant_application_allowed: true,
              role_grant_mutation_allowed: true,
              broad_audit_mutation_allowed: true,
            }
          : ref,
      ) as typeof defaultDatabaseSecurityGrantRefs,
      static_checks: defaultDatabaseSecurityStaticChecks.map((check) =>
        check.check_id === "NO_SQL_OR_DDL_EXECUTION"
          ? {
              ...check,
              source_ref: "docs/sql`danger.md",
              required_gate: "G10_LIVE_REQUEST",
              current_state: "execution_ready",
              execution_allowed: true,
              raw_sql_allowed: true,
            }
          : check,
      ) as typeof defaultDatabaseSecurityStaticChecks,
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected database security drift failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "database_security.schema_entity_ref_drift",
          path: "/schema_entity_refs/13/database_security_ref",
        }),
        expect.objectContaining({
          code: "database_security.schema_entity_ref_drift",
          path: "/schema_entity_refs/13/current_state",
        }),
        expect.objectContaining({
          code: "database_security.live_execution_forbidden",
          path: "/schema_entity_refs/13/live_storage_allowed",
        }),
        expect.objectContaining({
          code: "database_security.invalid_isolation_ref",
          path: "/isolation_refs/1/isolation_ref",
        }),
        expect.objectContaining({
          code: "database_security.role_grant_forbidden",
          path: "/role_boundary_refs/0/summary",
        }),
        expect.objectContaining({
          code: "database_security.connection_or_sql_forbidden",
          path: "/role_boundary_refs/0/database_role_connection_allowed",
        }),
        expect.objectContaining({
          code: "database_security.role_grant_forbidden",
          path: "/grant_refs/0/role_grant_mutation_allowed",
        }),
        expect.objectContaining({
          code: "database_security.invalid_grant_ref",
          path: "/grant_refs/0/deny_by_default",
        }),
        expect.objectContaining({
          code: "database_security.invalid_static_check",
          path: "/static_checks/7/source_ref",
        }),
        expect.objectContaining({
          code: "database_security.connection_or_sql_forbidden",
          path: "/static_checks/7/raw_sql_allowed",
        }),
      ]),
    );
  });

  it("fails closed on blocked DB, SQL, role, grant, writer, migration, runtime, Python, OS, and external-service flags", () => {
    const request = Object.fromEntries(
      databaseSecurityPreflightBlockedCapabilityFlags.map((flag) => [flag, true]),
    );
    const result = createDatabaseSecurityPreflightContract(request);

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected blocked capability failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "database_security.connection_or_sql_forbidden",
          path: "/database_connection_allowed",
        }),
        expect.objectContaining({
          code: "database_security.connection_or_sql_forbidden",
          path: "/sql_execution_allowed",
        }),
        expect.objectContaining({
          code: "database_security.role_grant_forbidden",
          path: "/role_grant_mutation_allowed",
        }),
        expect.objectContaining({
          code: "database_security.writer_implementation_forbidden",
          path: "/writer_implementation_allowed",
        }),
        expect.objectContaining({
          code: "database_security.migration_execution_forbidden",
          path: "/migration_execution_allowed",
        }),
        expect.objectContaining({
          code: "database_security.live_execution_forbidden",
          path: "/live_execution_allowed",
        }),
        expect.objectContaining({
          code: "database_security.python_runtime_requirement_forbidden",
          path: "/python_runtime_required",
        }),
        expect.objectContaining({
          code: "database_security.os_specific_binary_requirement_forbidden",
          path: "/os_specific_binary_required",
        }),
        expect.objectContaining({
          code: "database_security.blocked_capability_forbidden",
          path: "/external_service_call_allowed",
        }),
      ]),
    );
  });

  it("fails closed on unsafe state, connection strings, secrets, role/grant tokens, and side effects", () => {
    const result = createDatabaseSecurityPreflightContract({
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
      role_boundary_refs: [
        {
          ...defaultDatabaseSecurityRoleBoundaryRefs[0],
          summary: "role helper carries api_key",
        },
        ...defaultDatabaseSecurityRoleBoundaryRefs.slice(1),
      ],
      no_connection_posture: {
        ...defaultDatabaseSecurityNoConnectionPosture,
        database_url_allowed: true,
        role_grant_execution_allowed: true,
      },
      allowed_state: {
        ...defaultDatabaseSecurityAllowedState,
        secret_posture: "inline-secret-values",
        database_connection_allowed: true,
        role_grant_mutation_allowed: true,
        broad_audit_mutation_allowed: true,
        live_storage_allowed: true,
        live_execution_allowed: true,
        python_runtime_required: true,
        os_specific_binary_required: true,
      },
      side_effects: ["applied-grants"],
    } as Parameters<typeof createDatabaseSecurityPreflightContract>[0]);

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected unsafe database security posture failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "database_security.connection_or_sql_forbidden",
          path: "/source_refs/1/source_ref",
        }),
        expect.objectContaining({
          code: "database_security.connection_or_sql_forbidden",
          path: "/source_refs/1/summary",
        }),
        expect.objectContaining({
          code: "database_security.secret_value_forbidden",
          path: "/role_boundary_refs/0/summary",
        }),
        expect.objectContaining({
          code: "database_security.connection_or_sql_forbidden",
          path: "/no_connection_posture/database_url_allowed",
        }),
        expect.objectContaining({
          code: "database_security.role_grant_forbidden",
          path: "/no_connection_posture/role_grant_execution_allowed",
        }),
        expect.objectContaining({
          code: "database_security.secret_value_forbidden",
          path: "/allowed_state/secret_posture",
        }),
        expect.objectContaining({
          code: "database_security.connection_or_sql_forbidden",
          path: "/allowed_state/database_connection_allowed",
        }),
        expect.objectContaining({
          code: "database_security.role_grant_forbidden",
          path: "/allowed_state/role_grant_mutation_allowed",
        }),
        expect.objectContaining({
          code: "database_security.live_execution_forbidden",
          path: "/allowed_state/live_storage_allowed",
        }),
        expect.objectContaining({
          code: "database_security.python_runtime_requirement_forbidden",
          path: "/allowed_state/python_runtime_required",
        }),
        expect.objectContaining({
          code: "database_security.os_specific_binary_requirement_forbidden",
          path: "/allowed_state/os_specific_binary_required",
        }),
        expect.objectContaining({
          code: "database_security.side_effects_forbidden",
          path: "/side_effects",
        }),
      ]),
    );
    expect(JSON.stringify(result)).not.toContain("postgres://");
    expect(JSON.stringify(result)).not.toContain("api_key");
    expect(JSON.stringify(result)).not.toContain("applied-grants");
  });

  it("proves no DB, SQL, grants, writer, migration, runtime, queue, external service, or OS connector behavior is implemented", () => {
    const result = createDatabaseSecurityPreflightContract();

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected database security preflight success");
    }

    const evidence = result.database_security_preflight_contract as Record<
      string,
      unknown
    >;

    expect(result.database_security_preflight_contract.blocked_capabilities).toEqual(
      expect.arrayContaining([
        "database_connection_allowed",
        "database_write_allowed",
        "sql_execution_allowed",
        "ddl_execution_allowed",
        "role_grant_mutation_allowed",
        "grant_application_allowed",
        "writer_implementation_allowed",
        "migration_execution_allowed",
        "queue_mutation_allowed",
        "runtime_adapter_implementation_allowed",
        "os_specific_binary_required",
        "external_service_call_allowed",
      ]),
    );
    expect(
      result.database_security_preflight_contract.implementation_artifacts,
    ).toEqual([]);
    expect(
      result.database_security_preflight_contract.database_security_execution_artifacts,
    ).toEqual([]);
    expect(result.database_security_preflight_contract.sql_artifacts).toEqual([]);
    expect(evidence.database_client).toBeUndefined();
    expect(evidence.connection_string).toBeUndefined();
    expect(evidence.database_url).toBeUndefined();
    expect(evidence.sql).toBeUndefined();
    expect(evidence.ddl).toBeUndefined();
    expect(evidence.role_grant_runner).toBeUndefined();
    expect(evidence.writer).toBeUndefined();
    expect(evidence.migration_runner).toBeUndefined();
    expect(evidence.queue).toBeUndefined();
    expect(evidence.runtime_dispatcher).toBeUndefined();
    expect(evidence.os_connector_package).toBeUndefined();
  });
});
