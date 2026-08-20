import { describe, expect, it } from "vitest";
import {
  createPersistencePolicyGateContract,
  defaultPersistencePolicyGateSequence,
  defaultPersistencePolicyScopeOwnership,
  persistencePolicyBlockedCapabilityFlags,
  persistencePolicyGateContract,
  persistencePolicyGateIds,
  persistencePolicyScopeKeys,
} from "../src/index.js";

describe("persistence policy gate contract", () => {
  it("emits BP-0202 source-only gate order and future scope ownership keys", () => {
    const result = createPersistencePolicyGateContract();

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected persistence policy gate success");
    }

    expect(result.persistence_policy_gate).toMatchObject({
      contract_id: persistencePolicyGateContract.contract_id,
      gate_version: "0.1",
      required_gate_ids: [...persistencePolicyGateIds],
      required_scope_keys: [...persistencePolicyScopeKeys],
      allowed_state: {
        source_only_contract_allowed: true,
        gateway_security_boundary: true,
        policy_required_before_mutation: true,
        approval_required_before_mutation: true,
        append_only_audit_required_before_live_state_change: true,
        tenant_project_isolation_required_before_live_data: true,
        secret_posture: "references_only_no_values",
        live_execution_allowed: false,
        python_runtime_required: false,
        os_specific_binary_required: false,
      },
      implementation_artifacts: [],
      live_execution_allowed: false,
      python_runtime_required: false,
      os_specific_binary_required: false,
      side_effects: [],
    });
    expect(
      result.persistence_policy_gate.gate_sequence.map((gate) => gate.gate_id),
    ).toEqual([...persistencePolicyGateIds]);
    expect(
      result.persistence_policy_gate.scope_ownership.map((scope) => scope.scope_key),
    ).toEqual([...persistencePolicyScopeKeys]);
    expect(result.persistence_policy_gate.scope_ownership).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          scope_key: "DB_CONNECTION_WRITE",
          owning_gate_ids: [
            "G05_DATABASE_SECURITY",
            "G08_PERSISTENCE_READINESS",
            "G10_LIVE_REQUEST",
          ],
          current_state: "blocked",
        }),
        expect.objectContaining({
          scope_key: "OS_LEVEL_CONNECTOR_PACKAGE",
          owning_gate_ids: [
            "G06_POLICY_GATE",
            "G07_APPROVAL_REQUEST",
            "G09_IMPLEMENTATION_PACKET",
          ],
          current_state: "blocked",
        }),
      ]),
    );
    expect(result.persistence_policy_gate.source_refs).toEqual(
      expect.arrayContaining([
        "docs/architecture/PERSISTENCE_AND_POLICY_GATE_REVIEW.md",
        "docs/reference/CONTRACT_PROVENANCE.md",
        "docs/reference/CONTRACT_PROVENANCE.md",
      ]),
    );
    expect(result.side_effects).toEqual([]);
  });

  it("fails closed on missing or reordered gates", () => {
    const missing = createPersistencePolicyGateContract({
      gate_sequence: defaultPersistencePolicyGateSequence.filter(
        (gate) => gate.gate_id !== "G03_MIGRATION_ARTIFACT_STATIC",
      ),
    });

    expect(missing.ok).toBe(false);
    if (missing.ok) {
      throw new Error("expected missing gate failure");
    }

    expect(missing.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "persistence_policy_gate.gate_sequence_required",
          path: "/gate_sequence",
        }),
        expect.objectContaining({
          code: "persistence_policy_gate.gate_order_drift",
          path: "/gate_sequence/2",
        }),
      ]),
    );
    expect(missing.raw_input_content).toBe("withheld");

    const reordered = createPersistencePolicyGateContract({
      gate_sequence: [
        defaultPersistencePolicyGateSequence[1]!,
        defaultPersistencePolicyGateSequence[0]!,
        ...defaultPersistencePolicyGateSequence.slice(2),
      ],
    });

    expect(reordered.ok).toBe(false);
    if (reordered.ok) {
      throw new Error("expected reordered gate failure");
    }
    expect(reordered.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "persistence_policy_gate.gate_order_drift",
          path: "/gate_sequence/0",
        }),
        expect.objectContaining({
          code: "persistence_policy_gate.gate_order_drift",
          path: "/gate_sequence/1",
        }),
      ]),
    );
  });

  it("fails closed on scope ownership drift", () => {
    const result = createPersistencePolicyGateContract({
      scope_ownership: defaultPersistencePolicyScopeOwnership
        .filter((scope) => scope.scope_key !== "OS_LEVEL_CONNECTOR_PACKAGE")
        .map((scope) =>
          scope.scope_key === "DB_CONNECTION_WRITE"
            ? {
                ...scope,
                current_state: "active",
              }
            : scope,
        ) as typeof defaultPersistencePolicyScopeOwnership,
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected scope ownership failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "persistence_policy_gate.scope_ownership_drift",
          path: "/scope_ownership/0/current_state",
        }),
        expect.objectContaining({
          code: "persistence_policy_gate.scope_ownership_required",
          path: "/scope_ownership",
        }),
      ]),
    );
  });

  it("fails closed on blocked live, mutation, runtime, credential, deploy, OS, and external service flags", () => {
    const request = Object.fromEntries(
      persistencePolicyBlockedCapabilityFlags.map((flag) => [flag, true]),
    );
    const result = createPersistencePolicyGateContract(request);

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected blocked capability failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "persistence_policy_gate.blocked_capability_forbidden",
          path: "/database_connection_allowed",
        }),
        expect.objectContaining({
          code: "persistence_policy_gate.blocked_capability_forbidden",
          path: "/credential_storage_allowed",
        }),
        expect.objectContaining({
          code: "persistence_policy_gate.blocked_capability_forbidden",
          path: "/deploy_allowed",
        }),
        expect.objectContaining({
          code: "persistence_policy_gate.live_execution_forbidden",
          path: "/live_execution_allowed",
        }),
        expect.objectContaining({
          code: "persistence_policy_gate.python_runtime_requirement_forbidden",
          path: "/python_runtime_required",
        }),
        expect.objectContaining({
          code: "persistence_policy_gate.os_specific_binary_requirement_forbidden",
          path: "/os_specific_binary_required",
        }),
      ]),
    );
  });

  it("fails closed on unsafe allowed state, secret-like refs, and nonempty side effects", () => {
    const result = createPersistencePolicyGateContract({
      allowed_state: {
        source_only_contract_allowed: true,
        gateway_security_boundary: true,
        policy_required_before_mutation: true,
        approval_required_before_mutation: true,
        append_only_audit_required_before_live_state_change: true,
        tenant_project_isolation_required_before_live_data: true,
        secret_posture: "inline-secret-values",
        live_execution_allowed: true,
        python_runtime_required: true,
        os_specific_binary_required: true,
      },
      source_refs: [
        {
          source_ref: "docs/architecture/PERSISTENCE_AND_POLICY_GATE_REVIEW.md",
          summary: "valid source ref",
        },
        {
          source_ref: "docs/secret-token.md",
          summary: "secret token value",
        },
      ],
      side_effects: ["opened-db"],
    } as Parameters<typeof createPersistencePolicyGateContract>[0]);

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected unsafe posture failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "persistence_policy_gate.secret_value_forbidden",
          path: "/allowed_state/secret_posture",
        }),
        expect.objectContaining({
          code: "persistence_policy_gate.live_execution_forbidden",
          path: "/allowed_state/live_execution_allowed",
        }),
        expect.objectContaining({
          code: "persistence_policy_gate.python_runtime_requirement_forbidden",
          path: "/allowed_state/python_runtime_required",
        }),
        expect.objectContaining({
          code: "persistence_policy_gate.os_specific_binary_requirement_forbidden",
          path: "/allowed_state/os_specific_binary_required",
        }),
        expect.objectContaining({
          code: "persistence_policy_gate.invalid_source_ref",
          path: "/source_refs/1/source_ref",
        }),
        expect.objectContaining({
          code: "persistence_policy_gate.side_effects_forbidden",
          path: "/side_effects",
        }),
      ]),
    );
  });

  it("proves no DB, write, runtime, or OS connector behavior is implemented", () => {
    const result = createPersistencePolicyGateContract();

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected persistence policy gate success");
    }

    const evidence = result.persistence_policy_gate as Record<string, unknown>;

    expect(result.persistence_policy_gate.blocked_capabilities).toEqual(
      expect.arrayContaining([
        "database_connection_allowed",
        "database_write_allowed",
        "migration_execution_allowed",
        "writer_implementation_allowed",
        "runtime_adapter_implementation_allowed",
        "os_specific_binary_required",
        "external_service_call_allowed",
      ]),
    );
    expect(result.persistence_policy_gate.implementation_artifacts).toEqual([]);
    expect(evidence.database_client).toBeUndefined();
    expect(evidence.connection_string).toBeUndefined();
    expect(evidence.writer).toBeUndefined();
    expect(evidence.runtime_dispatcher).toBeUndefined();
    expect(evidence.os_connector_package).toBeUndefined();
  });
});
