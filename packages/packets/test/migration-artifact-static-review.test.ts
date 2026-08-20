import { describe, expect, it } from "vitest";
import {
  createMigrationArtifactStaticReview,
  defaultMigrationArtifactStaticReviewAllowedState,
  defaultMigrationArtifactStaticReviewArtifactRefs,
  defaultMigrationArtifactStaticReviewEntityCoverage,
  defaultMigrationArtifactStaticReviewForbiddenTokenChecks,
  defaultMigrationArtifactStaticReviewNoConnectionPosture,
  defaultMigrationArtifactStaticReviewRollbackRefs,
  defaultMigrationArtifactStaticReviewStaticCheckRefs,
  migrationArtifactStaticReviewBlockedCapabilityFlags,
  migrationArtifactStaticReviewCheckIds,
  migrationArtifactStaticReviewContract,
  migrationArtifactStaticReviewForbiddenTokens,
  migrationArtifactStaticReviewTargetGate,
  persistencePolicyGateIds,
  persistenceSchemaContract,
  persistenceSchemaEntityNames,
} from "../src/index.js";

describe("migration artifact static review contract", () => {
  it("emits BP-0205 source-only migration artifact static review evidence", () => {
    const result = createMigrationArtifactStaticReview();

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected migration artifact static review success");
    }

    expect(result.migration_artifact_static_review).toMatchObject({
      contract_id: migrationArtifactStaticReviewContract.contract_id,
      review_version: "0.1",
      target_gate: migrationArtifactStaticReviewTargetGate,
      schema_contract_id: persistenceSchemaContract.contract_id,
      required_gate_ids: [...persistencePolicyGateIds],
      required_entity_names: [...persistenceSchemaEntityNames],
      allowed_state: defaultMigrationArtifactStaticReviewAllowedState,
      no_connection_posture: defaultMigrationArtifactStaticReviewNoConnectionPosture,
      implementation_artifacts: [],
      migration_execution_artifacts: [],
      database_connection_allowed: false,
      migration_execution_allowed: false,
      live_storage_allowed: false,
      live_execution_allowed: false,
      python_runtime_required: false,
      os_specific_binary_required: false,
      side_effects: [],
    });
    expect(
      result.migration_artifact_static_review.schema_entity_coverage.map(
        (coverage) => coverage.entity_name,
      ),
    ).toEqual([...persistenceSchemaEntityNames]);
    expect(
      result.migration_artifact_static_review.artifact_refs.map(
        (artifact) => artifact.artifact_kind,
      ),
    ).toEqual([
      "migration_manifest_ref",
      "sql_artifact_ref",
      "rollback_ref",
      "static_check_ref",
    ]);
    expect(
      result.migration_artifact_static_review.static_check_refs.map(
        (check) => check.check_id,
      ),
    ).toEqual([...migrationArtifactStaticReviewCheckIds]);
    expect(
      result.migration_artifact_static_review.forbidden_token_checks.map(
        (check) => check.token,
      ),
    ).toEqual([...migrationArtifactStaticReviewForbiddenTokens]);
    expect(result.migration_artifact_static_review.source_refs).toEqual(
      expect.arrayContaining([
        "docs/architecture/PERSISTENCE_AND_POLICY_GATE_REVIEW.md",
        "docs/architecture/PERSISTENCE_SCHEMA_PLAN.md",
        "packages/packets/src/persistence-schema-contract.ts",
        "docs/reference/CONTRACT_PROVENANCE.md",
        "docs/reference/CONTRACT_PROVENANCE.md",
      ]),
    );
    expect(result.side_effects).toEqual([]);
  });

  it("fails closed on missing migration and static-review evidence", () => {
    const result = createMigrationArtifactStaticReview({
      gate_sequence: persistencePolicyGateIds.filter(
        (gateId) => gateId !== "G03_MIGRATION_ARTIFACT_STATIC",
      ),
      schema_entity_coverage: defaultMigrationArtifactStaticReviewEntityCoverage.filter(
        (coverage) => coverage.entity_name !== "audit_events",
      ),
      artifact_refs: defaultMigrationArtifactStaticReviewArtifactRefs.filter(
        (artifact) => artifact.artifact_kind !== "sql_artifact_ref",
      ),
      rollback_refs: [],
      static_check_refs: defaultMigrationArtifactStaticReviewStaticCheckRefs.filter(
        (check) => check.check_id !== "NO_CONNECTION_STRING",
      ),
      forbidden_token_checks:
        defaultMigrationArtifactStaticReviewForbiddenTokenChecks.filter(
          (check) => check.token !== "DATABASE_URL",
        ),
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected missing evidence failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "migration_artifact_static_review.gate_sequence_required",
          path: "/gate_sequence",
        }),
        expect.objectContaining({
          code: "migration_artifact_static_review.entity_coverage_required",
          path: "/schema_entity_coverage",
        }),
        expect.objectContaining({
          code: "migration_artifact_static_review.artifact_ref_required",
          path: "/artifact_refs",
        }),
        expect.objectContaining({
          code: "migration_artifact_static_review.rollback_ref_required",
          path: "/rollback_refs",
        }),
        expect.objectContaining({
          code: "migration_artifact_static_review.static_check_ref_required",
          path: "/static_check_refs",
        }),
        expect.objectContaining({
          code: "migration_artifact_static_review.forbidden_token_check_required",
          path: "/forbidden_token_checks",
        }),
      ]),
    );
    expect(result.raw_input_content).toBe("withheld");
  });

  it("fails closed on schema coverage, artifact ref, rollback, and check drift", () => {
    const result = createMigrationArtifactStaticReview({
      schema_entity_coverage: defaultMigrationArtifactStaticReviewEntityCoverage.map(
        (coverage) =>
          coverage.entity_name === "audit_events"
            ? {
                ...coverage,
                migration_manifest_ref: "/tmp/live.sql",
                coverage_state: "ready_to_apply",
                target_gate: "G10_LIVE_REQUEST",
                live_storage_allowed: true,
              }
            : coverage,
      ) as typeof defaultMigrationArtifactStaticReviewEntityCoverage,
      artifact_refs: defaultMigrationArtifactStaticReviewArtifactRefs.map((artifact) =>
        artifact.artifact_kind === "migration_manifest_ref"
          ? {
              ...artifact,
              artifact_ref: "docs/secret-token.sql",
              current_state: "ready_to_execute",
              repo_local: false,
              contains_sql_content: true,
              connection_required: true,
              execution_allowed: true,
            }
          : artifact,
      ) as typeof defaultMigrationArtifactStaticReviewArtifactRefs,
      rollback_refs: defaultMigrationArtifactStaticReviewRollbackRefs.map((ref) => ({
        ...ref,
        rollback_ref: "docs/rollback.md",
        current_state: "execution_plan",
        execution_allowed: true,
      })) as typeof defaultMigrationArtifactStaticReviewRollbackRefs,
      static_check_refs: defaultMigrationArtifactStaticReviewStaticCheckRefs.map(
        (check) =>
          check.check_id === "NO_CONNECTION_STRING"
            ? {
                ...check,
                source_ref: "http://example.com/check",
                required_gate: "G10_LIVE_REQUEST",
                current_state: "runner_enabled",
                external_execution_allowed: true,
              }
            : check,
      ) as typeof defaultMigrationArtifactStaticReviewStaticCheckRefs,
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected static review drift failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "migration_artifact_static_review.entity_coverage_drift",
          path: "/schema_entity_coverage/13/migration_manifest_ref",
        }),
        expect.objectContaining({
          code: "migration_artifact_static_review.entity_coverage_drift",
          path: "/schema_entity_coverage/13/coverage_state",
        }),
        expect.objectContaining({
          code: "migration_artifact_static_review.live_execution_forbidden",
          path: "/schema_entity_coverage/13/live_storage_allowed",
        }),
        expect.objectContaining({
          code: "migration_artifact_static_review.secret_value_forbidden",
          path: "/artifact_refs/0/artifact_ref",
        }),
        expect.objectContaining({
          code: "migration_artifact_static_review.blocked_capability_forbidden",
          path: "/artifact_refs/0/contains_sql_content",
        }),
        expect.objectContaining({
          code: "migration_artifact_static_review.connection_string_forbidden",
          path: "/artifact_refs/0/connection_required",
        }),
        expect.objectContaining({
          code: "migration_artifact_static_review.migration_runner_forbidden",
          path: "/artifact_refs/0/execution_allowed",
        }),
        expect.objectContaining({
          code: "migration_artifact_static_review.invalid_rollback_ref",
          path: "/rollback_refs/0/current_state",
        }),
        expect.objectContaining({
          code: "migration_artifact_static_review.invalid_static_check_ref",
          path: "/static_check_refs/6/source_ref",
        }),
        expect.objectContaining({
          code: "migration_artifact_static_review.blocked_capability_forbidden",
          path: "/static_check_refs/6/external_execution_allowed",
        }),
      ]),
    );
  });

  it("fails closed on blocked DB, migration, runtime, auth, OS, Python, and external-service flags", () => {
    const request = Object.fromEntries(
      migrationArtifactStaticReviewBlockedCapabilityFlags.map((flag) => [flag, true]),
    );
    const result = createMigrationArtifactStaticReview(request);

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected blocked capability failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "migration_artifact_static_review.connection_string_forbidden",
          path: "/database_connection_allowed",
        }),
        expect.objectContaining({
          code: "migration_artifact_static_review.connection_string_forbidden",
          path: "/database_url_allowed",
        }),
        expect.objectContaining({
          code: "migration_artifact_static_review.migration_runner_forbidden",
          path: "/migration_execution_allowed",
        }),
        expect.objectContaining({
          code: "migration_artifact_static_review.migration_runner_forbidden",
          path: "/migration_runner_allowed",
        }),
        expect.objectContaining({
          code: "migration_artifact_static_review.live_execution_forbidden",
          path: "/live_execution_allowed",
        }),
        expect.objectContaining({
          code: "migration_artifact_static_review.python_runtime_requirement_forbidden",
          path: "/python_runtime_required",
        }),
        expect.objectContaining({
          code: "migration_artifact_static_review.os_specific_binary_requirement_forbidden",
          path: "/os_specific_binary_required",
        }),
        expect.objectContaining({
          code: "migration_artifact_static_review.blocked_capability_forbidden",
          path: "/external_service_call_allowed",
        }),
      ]),
    );
  });

  it("fails closed on unsafe allowed state, connection strings, runner tokens, secrets, and side effects", () => {
    const result = createMigrationArtifactStaticReview({
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
      artifact_refs: [
        {
          ...defaultMigrationArtifactStaticReviewArtifactRefs[0],
          summary: "run prisma migrate deploy with api_key",
        },
        ...defaultMigrationArtifactStaticReviewArtifactRefs.slice(1),
      ],
      no_connection_posture: {
        ...defaultMigrationArtifactStaticReviewNoConnectionPosture,
        database_url_allowed: true,
        migration_runner_allowed: true,
      },
      allowed_state: {
        ...defaultMigrationArtifactStaticReviewAllowedState,
        secret_posture: "inline-secret-values",
        sql_execution_allowed: true,
        live_sql_execution_allowed: true,
        live_execution_allowed: true,
        python_runtime_required: true,
        os_specific_binary_required: true,
      },
      side_effects: ["opened-db"],
    } as Parameters<typeof createMigrationArtifactStaticReview>[0]);

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected unsafe static review posture failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "migration_artifact_static_review.connection_string_forbidden",
          path: "/source_refs/1/source_ref",
        }),
        expect.objectContaining({
          code: "migration_artifact_static_review.connection_string_forbidden",
          path: "/source_refs/1/summary",
        }),
        expect.objectContaining({
          code: "migration_artifact_static_review.migration_runner_forbidden",
          path: "/artifact_refs/0/summary",
        }),
        expect.objectContaining({
          code: "migration_artifact_static_review.secret_value_forbidden",
          path: "/artifact_refs/0/summary",
        }),
        expect.objectContaining({
          code: "migration_artifact_static_review.connection_string_forbidden",
          path: "/no_connection_posture/database_url_allowed",
        }),
        expect.objectContaining({
          code: "migration_artifact_static_review.migration_runner_forbidden",
          path: "/no_connection_posture/migration_runner_allowed",
        }),
        expect.objectContaining({
          code: "migration_artifact_static_review.allowed_state_drift",
          path: "/allowed_state/sql_execution_allowed",
        }),
        expect.objectContaining({
          code: "migration_artifact_static_review.live_execution_forbidden",
          path: "/allowed_state/live_sql_execution_allowed",
        }),
        expect.objectContaining({
          code: "migration_artifact_static_review.python_runtime_requirement_forbidden",
          path: "/allowed_state/python_runtime_required",
        }),
        expect.objectContaining({
          code: "migration_artifact_static_review.os_specific_binary_requirement_forbidden",
          path: "/allowed_state/os_specific_binary_required",
        }),
        expect.objectContaining({
          code: "migration_artifact_static_review.side_effects_forbidden",
          path: "/side_effects",
        }),
      ]),
    );
    expect(JSON.stringify(result)).not.toContain("postgres://");
    expect(JSON.stringify(result)).not.toContain("api_key");
    expect(JSON.stringify(result)).not.toContain("opened-db");
  });

  it("proves no DB, SQL content, migration runner, writer, runtime, or OS connector behavior is implemented", () => {
    const result = createMigrationArtifactStaticReview();

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected migration artifact static review success");
    }

    const evidence = result.migration_artifact_static_review as Record<string, unknown>;

    expect(result.migration_artifact_static_review.blocked_capabilities).toEqual(
      expect.arrayContaining([
        "database_connection_allowed",
        "database_write_allowed",
        "migration_execution_allowed",
        "migration_runner_allowed",
        "sql_artifact_content_allowed",
        "sql_execution_allowed",
        "writer_implementation_allowed",
        "runtime_adapter_implementation_allowed",
        "os_specific_binary_required",
        "external_service_call_allowed",
      ]),
    );
    expect(result.migration_artifact_static_review.implementation_artifacts).toEqual(
      [],
    );
    expect(
      result.migration_artifact_static_review.migration_execution_artifacts,
    ).toEqual([]);
    expect(evidence.database_client).toBeUndefined();
    expect(evidence.connection_string).toBeUndefined();
    expect(evidence.database_url).toBeUndefined();
    expect(evidence.sql).toBeUndefined();
    expect(evidence.sql_content).toBeUndefined();
    expect(evidence.migration_runner).toBeUndefined();
    expect(evidence.writer).toBeUndefined();
    expect(evidence.runtime_dispatcher).toBeUndefined();
    expect(evidence.os_connector_package).toBeUndefined();
  });
});
