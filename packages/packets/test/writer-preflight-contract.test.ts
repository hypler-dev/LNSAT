import { describe, expect, it } from "vitest";
import {
  createWriterPreflightContract,
  defaultWriterPreflightAllowedState,
  defaultWriterPreflightAuditObligationRefs,
  defaultWriterPreflightIdempotencyRefs,
  defaultWriterPreflightNoStoragePosture,
  defaultWriterPreflightRedactionChecks,
  defaultWriterPreflightSchemaEntityRefs,
  defaultWriterPreflightWriterInterfaceRefs,
  migrationArtifactStaticReviewContract,
  persistencePolicyGateIds,
  persistenceSchemaEntityNames,
  writerPreflightAuditObligationKinds,
  writerPreflightBlockedCapabilityFlags,
  writerPreflightContract,
  writerPreflightIdempotencyRefKinds,
  writerPreflightInterfaceRefKinds,
  writerPreflightRedactionCheckIds,
  writerPreflightTargetGate,
} from "../src/index.js";

describe("writer preflight contract", () => {
  it("emits BP-0208 source-only writer preflight evidence", () => {
    const result = createWriterPreflightContract();

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected writer preflight success");
    }

    expect(result.writer_preflight_contract).toMatchObject({
      contract_id: writerPreflightContract.contract_id,
      preflight_version: "0.1",
      target_gate: writerPreflightTargetGate,
      migration_static_review_contract_id:
        migrationArtifactStaticReviewContract.contract_id,
      required_gate_ids: [...persistencePolicyGateIds],
      required_entity_names: [...persistenceSchemaEntityNames],
      allowed_state: defaultWriterPreflightAllowedState,
      no_storage_posture: defaultWriterPreflightNoStoragePosture,
      implementation_artifacts: [],
      writer_execution_artifacts: [],
      database_connection_allowed: false,
      database_write_allowed: false,
      writer_implementation_allowed: false,
      persisted_state_writer_allowed: false,
      live_storage_allowed: false,
      live_execution_allowed: false,
      python_runtime_required: false,
      os_specific_binary_required: false,
      side_effects: [],
    });
    expect(
      result.writer_preflight_contract.schema_entity_refs.map((ref) => ref.entity_name),
    ).toEqual([...persistenceSchemaEntityNames]);
    expect(
      result.writer_preflight_contract.writer_interface_refs.map(
        (ref) => ref.interface_kind,
      ),
    ).toEqual([...writerPreflightInterfaceRefKinds]);
    expect(
      result.writer_preflight_contract.idempotency_refs.map(
        (ref) => ref.idempotency_kind,
      ),
    ).toEqual([...writerPreflightIdempotencyRefKinds]);
    expect(
      result.writer_preflight_contract.redaction_checks.map((check) => check.check_id),
    ).toEqual([...writerPreflightRedactionCheckIds]);
    expect(
      result.writer_preflight_contract.audit_obligation_refs.map(
        (ref) => ref.obligation_kind,
      ),
    ).toEqual([...writerPreflightAuditObligationKinds]);
    expect(result.writer_preflight_contract.source_refs).toEqual(
      expect.arrayContaining([
        "docs/architecture/PERSISTENCE_AND_POLICY_GATE_REVIEW.md",
        "packages/packets/src/persistence-policy-gate.ts",
        "packages/packets/src/persistence-schema-contract.ts",
        "packages/packets/src/migration-artifact-static-review.ts",
        "docs/architecture/AUDIT_LEDGER_WRITER_PERSISTENCE_PREFLIGHT.md",
        "docs/reference/CONTRACT_PROVENANCE.md",
      ]),
    );
    expect(result.side_effects).toEqual([]);
  });

  it("fails closed on missing writer preflight evidence", () => {
    const result = createWriterPreflightContract({
      gate_sequence: persistencePolicyGateIds.filter(
        (gateId) => gateId !== "G04_WRITER_PREFLIGHT",
      ),
      schema_entity_refs: defaultWriterPreflightSchemaEntityRefs.filter(
        (ref) => ref.entity_name !== "audit_events",
      ),
      writer_interface_refs: defaultWriterPreflightWriterInterfaceRefs.filter(
        (ref) => ref.interface_kind !== "append_only_writer_interface_ref",
      ),
      idempotency_refs: defaultWriterPreflightIdempotencyRefs.filter(
        (ref) => ref.idempotency_kind !== "digest_collision_ref",
      ),
      redaction_checks: defaultWriterPreflightRedactionChecks.filter(
        (check) => check.check_id !== "SECRET_VALUE_WITHHELD",
      ),
      audit_obligation_refs: defaultWriterPreflightAuditObligationRefs.filter(
        (ref) => ref.obligation_kind !== "approval_request_ref",
      ),
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected missing writer preflight evidence failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "writer_preflight.gate_sequence_required",
          path: "/gate_sequence",
        }),
        expect.objectContaining({
          code: "writer_preflight.schema_entity_ref_required",
          path: "/schema_entity_refs",
        }),
        expect.objectContaining({
          code: "writer_preflight.writer_interface_ref_required",
          path: "/writer_interface_refs",
        }),
        expect.objectContaining({
          code: "writer_preflight.idempotency_ref_required",
          path: "/idempotency_refs",
        }),
        expect.objectContaining({
          code: "writer_preflight.redaction_check_required",
          path: "/redaction_checks",
        }),
        expect.objectContaining({
          code: "writer_preflight.audit_obligation_ref_required",
          path: "/audit_obligation_refs",
        }),
      ]),
    );
    expect(result.raw_input_content).toBe("withheld");
  });

  it("fails closed on schema, interface, idempotency, redaction, and audit drift", () => {
    const result = createWriterPreflightContract({
      schema_entity_refs: defaultWriterPreflightSchemaEntityRefs.map((ref) =>
        ref.entity_name === "audit_events"
          ? {
              ...ref,
              writer_preflight_ref: "/tmp/writer-live.ts",
              current_state: "ready_to_persist",
              target_gate: "G10_LIVE_REQUEST",
              live_storage_allowed: true,
            }
          : ref,
      ) as typeof defaultWriterPreflightSchemaEntityRefs,
      writer_interface_refs: defaultWriterPreflightWriterInterfaceRefs.map((ref) =>
        ref.interface_kind === "append_only_writer_interface_ref"
          ? {
              ...ref,
              interface_ref: "docs/secret-token-writer.ts",
              current_state: "implementation_ready",
              append_only: false,
              implementation_allowed: true,
              live_storage_allowed: true,
            }
          : ref,
      ) as typeof defaultWriterPreflightWriterInterfaceRefs,
      idempotency_refs: defaultWriterPreflightIdempotencyRefs.map((ref) =>
        ref.idempotency_kind === "exact_replay_ref"
          ? {
              ...ref,
              behavior: "digest_collision_fails_closed",
              current_state: "storage_lookup_ready",
              storage_lookup_allowed: true,
              mutation_allowed: true,
            }
          : ref,
      ) as typeof defaultWriterPreflightIdempotencyRefs,
      redaction_checks: defaultWriterPreflightRedactionChecks.map((check) =>
        check.check_id === "RAW_PAYLOAD_ECHO_BLOCKED"
          ? {
              ...check,
              source_ref: "http://example.com/redaction",
              action: "echo_then_store",
              current_state: "runtime_ready",
              raw_value_echo_allowed: true,
            }
          : check,
      ) as typeof defaultWriterPreflightRedactionChecks,
      audit_obligation_refs: defaultWriterPreflightAuditObligationRefs.map((ref) =>
        ref.obligation_kind === "append_only_audit_ref"
          ? {
              ...ref,
              required_gate: "G10_LIVE_REQUEST",
              current_state: "write_ready",
              audit_write_allowed: true,
            }
          : ref,
      ) as typeof defaultWriterPreflightAuditObligationRefs,
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected writer preflight drift failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "writer_preflight.schema_entity_ref_drift",
          path: "/schema_entity_refs/13/writer_preflight_ref",
        }),
        expect.objectContaining({
          code: "writer_preflight.schema_entity_ref_drift",
          path: "/schema_entity_refs/13/current_state",
        }),
        expect.objectContaining({
          code: "writer_preflight.live_execution_forbidden",
          path: "/schema_entity_refs/13/live_storage_allowed",
        }),
        expect.objectContaining({
          code: "writer_preflight.secret_value_forbidden",
          path: "/writer_interface_refs/0/interface_ref",
        }),
        expect.objectContaining({
          code: "writer_preflight.writer_implementation_forbidden",
          path: "/writer_interface_refs/0/implementation_allowed",
        }),
        expect.objectContaining({
          code: "writer_preflight.invalid_idempotency_ref",
          path: "/idempotency_refs/1/behavior",
        }),
        expect.objectContaining({
          code: "writer_preflight.writer_implementation_forbidden",
          path: "/idempotency_refs/1/storage_lookup_allowed",
        }),
        expect.objectContaining({
          code: "writer_preflight.invalid_redaction_check",
          path: "/redaction_checks/3/source_ref",
        }),
        expect.objectContaining({
          code: "writer_preflight.writer_implementation_forbidden",
          path: "/redaction_checks/3/raw_value_echo_allowed",
        }),
        expect.objectContaining({
          code: "writer_preflight.writer_implementation_forbidden",
          path: "/audit_obligation_refs/2/audit_write_allowed",
        }),
      ]),
    );
  });

  it("fails closed on blocked writer, DB, migration, runtime, auth, OS, queue, Python, and external-service flags", () => {
    const request = Object.fromEntries(
      writerPreflightBlockedCapabilityFlags.map((flag) => [flag, true]),
    );
    const result = createWriterPreflightContract(request);

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected blocked capability failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "writer_preflight.connection_string_forbidden",
          path: "/database_connection_allowed",
        }),
        expect.objectContaining({
          code: "writer_preflight.connection_string_forbidden",
          path: "/database_write_allowed",
        }),
        expect.objectContaining({
          code: "writer_preflight.writer_implementation_forbidden",
          path: "/writer_implementation_allowed",
        }),
        expect.objectContaining({
          code: "writer_preflight.writer_implementation_forbidden",
          path: "/persisted_state_writer_allowed",
        }),
        expect.objectContaining({
          code: "writer_preflight.migration_execution_forbidden",
          path: "/migration_execution_allowed",
        }),
        expect.objectContaining({
          code: "writer_preflight.live_execution_forbidden",
          path: "/live_execution_allowed",
        }),
        expect.objectContaining({
          code: "writer_preflight.python_runtime_requirement_forbidden",
          path: "/python_runtime_required",
        }),
        expect.objectContaining({
          code: "writer_preflight.os_specific_binary_requirement_forbidden",
          path: "/os_specific_binary_required",
        }),
        expect.objectContaining({
          code: "writer_preflight.blocked_capability_forbidden",
          path: "/external_service_call_allowed",
        }),
      ]),
    );
  });

  it("fails closed on unsafe allowed state, storage posture, connection strings, secrets, and side effects", () => {
    const result = createWriterPreflightContract({
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
      writer_interface_refs: [
        {
          ...defaultWriterPreflightWriterInterfaceRefs[0],
          summary: "writer helper carries api_key",
        },
        ...defaultWriterPreflightWriterInterfaceRefs.slice(1),
      ],
      no_storage_posture: {
        ...defaultWriterPreflightNoStoragePosture,
        database_url_allowed: true,
        persisted_state_writer_allowed: true,
      },
      allowed_state: {
        ...defaultWriterPreflightAllowedState,
        secret_posture: "inline-secret-values",
        writer_implementation_allowed: true,
        database_connection_allowed: true,
        live_storage_allowed: true,
        live_execution_allowed: true,
        python_runtime_required: true,
        os_specific_binary_required: true,
      },
      side_effects: ["opened-writer"],
    } as Parameters<typeof createWriterPreflightContract>[0]);

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected unsafe writer preflight posture failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "writer_preflight.connection_string_forbidden",
          path: "/source_refs/1/source_ref",
        }),
        expect.objectContaining({
          code: "writer_preflight.connection_string_forbidden",
          path: "/source_refs/1/summary",
        }),
        expect.objectContaining({
          code: "writer_preflight.secret_value_forbidden",
          path: "/writer_interface_refs/0/summary",
        }),
        expect.objectContaining({
          code: "writer_preflight.connection_string_forbidden",
          path: "/no_storage_posture/database_url_allowed",
        }),
        expect.objectContaining({
          code: "writer_preflight.writer_implementation_forbidden",
          path: "/no_storage_posture/persisted_state_writer_allowed",
        }),
        expect.objectContaining({
          code: "writer_preflight.secret_value_forbidden",
          path: "/allowed_state/secret_posture",
        }),
        expect.objectContaining({
          code: "writer_preflight.writer_implementation_forbidden",
          path: "/allowed_state/writer_implementation_allowed",
        }),
        expect.objectContaining({
          code: "writer_preflight.connection_string_forbidden",
          path: "/allowed_state/database_connection_allowed",
        }),
        expect.objectContaining({
          code: "writer_preflight.live_execution_forbidden",
          path: "/allowed_state/live_storage_allowed",
        }),
        expect.objectContaining({
          code: "writer_preflight.python_runtime_requirement_forbidden",
          path: "/allowed_state/python_runtime_required",
        }),
        expect.objectContaining({
          code: "writer_preflight.os_specific_binary_requirement_forbidden",
          path: "/allowed_state/os_specific_binary_required",
        }),
        expect.objectContaining({
          code: "writer_preflight.side_effects_forbidden",
          path: "/side_effects",
        }),
      ]),
    );
    expect(JSON.stringify(result)).not.toContain("postgres://");
    expect(JSON.stringify(result)).not.toContain("api_key");
    expect(JSON.stringify(result)).not.toContain("opened-writer");
  });

  it("proves no DB, writer, storage, runtime, queue, external service, or OS connector behavior is implemented", () => {
    const result = createWriterPreflightContract();

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected writer preflight success");
    }

    const evidence = result.writer_preflight_contract as Record<string, unknown>;

    expect(result.writer_preflight_contract.blocked_capabilities).toEqual(
      expect.arrayContaining([
        "database_connection_allowed",
        "database_write_allowed",
        "writer_implementation_allowed",
        "persisted_state_writer_allowed",
        "queue_mutation_allowed",
        "runtime_adapter_implementation_allowed",
        "os_specific_binary_required",
        "external_service_call_allowed",
      ]),
    );
    expect(result.writer_preflight_contract.implementation_artifacts).toEqual([]);
    expect(result.writer_preflight_contract.writer_execution_artifacts).toEqual([]);
    expect(evidence.database_client).toBeUndefined();
    expect(evidence.connection_string).toBeUndefined();
    expect(evidence.database_url).toBeUndefined();
    expect(evidence.writer).toBeUndefined();
    expect(evidence.persisted_writer).toBeUndefined();
    expect(evidence.queue).toBeUndefined();
    expect(evidence.runtime_dispatcher).toBeUndefined();
    expect(evidence.os_connector_package).toBeUndefined();
  });
});
