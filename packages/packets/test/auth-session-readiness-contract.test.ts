import { describe, expect, it } from "vitest";
import {
  authSessionReadinessAuthModeKinds,
  authSessionReadinessAuthorizationLevelKinds,
  authSessionReadinessBlockedCapabilityFlags,
  authSessionReadinessContract,
  createAuthSessionReadinessContract,
  defaultAuthSessionReadiness,
  defaultAuthSessionReadinessAllowedState,
  defaultAuthSessionReadinessAuthModeRefs,
  defaultAuthSessionReadinessAuthorizationLevelRefs,
  defaultAuthSessionReadinessIdentityRefs,
  defaultAuthSessionReadinessNoLivePosture,
  defaultAuthSessionReadinessSessionBoundaryRefs,
  defaultAuthSessionReadinessSourceRefs,
  defaultAuthSessionReadinessTenantProjectScopeRefs,
  selfDeployPackagingPlanContract,
  type AuthSessionReadinessRequest,
} from "../src/index.js";

describe("auth session readiness contract", () => {
  it("emits BP-0217 source-only auth/session/authorization readiness evidence", () => {
    const result = createAuthSessionReadinessContract();

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected auth session readiness success");
    }

    expect(result.auth_session_readiness).toMatchObject({
      contract_id: authSessionReadinessContract.contract_id,
      plan_version: "0.1",
      readiness_identity: {
        packet_ref: "BP-0217",
        selected_after_packet_ref: "BP-0216",
        readiness_ref: "auth_session_authorization_levels:source_only",
        readiness_mode: "source_contract_only",
      },
      self_deploy_packaging_plan_contract_id:
        selfDeployPackagingPlanContract.contract_id,
      no_live_posture: defaultAuthSessionReadinessNoLivePosture,
      allowed_state: defaultAuthSessionReadinessAllowedState,
      auth_runtime_artifacts: [],
      user_store_artifacts: [],
      session_database_artifacts: [],
      provider_adapter_artifacts: [],
      credential_artifacts: [],
      permission_mutation_artifacts: [],
      integration_setup_artifacts: [],
      runtime_artifacts: [],
      database_artifacts: [],
      external_service_clients: [],
      live_auth_provider_configured: false,
      session_database_allowed: false,
      permission_mutation_allowed: false,
      auth_provider_wiring_allowed: false,
      integration_setup_write_allowed: false,
      secret_values_allowed: false,
      python_runtime_required: false,
      os_specific_binary_required: false,
      side_effects: [],
    });
    expect(
      result.auth_session_readiness.auth_mode_refs.map((ref) => ref.auth_kind),
    ).toEqual([...authSessionReadinessAuthModeKinds]);
    expect(
      result.auth_session_readiness.authorization_level_refs.map(
        (ref) => ref.level_kind,
      ),
    ).toEqual([...authSessionReadinessAuthorizationLevelKinds]);
    expect(result.auth_session_readiness.source_refs).toEqual(
      expect.arrayContaining([
        "docs/architecture/AUTH_AND_INTEGRATION_POSTURE.md",
        "docs/architecture/MANAGEMENT_UI_INFORMATION_ARCHITECTURE.md",
        "docs/architecture/SELF_DEPLOY_PACKAGING_PLAN.md",
        "docs/reference/CONTRACT_PROVENANCE.md",
        "docs/reference/CONTRACT_PROVENANCE.md",
        "packages/packets/src/auth-session-readiness-contract.ts",
        "packages/packets/test/auth-session-readiness-contract.test.ts",
      ]),
    );
    expect(result.side_effects).toEqual([]);
  });

  it("fails closed on missing auth mode, authorization level, and source evidence", () => {
    const result = createAuthSessionReadinessContract({
      auth_mode_refs: defaultAuthSessionReadinessAuthModeRefs.filter(
        (ref) => ref.auth_kind !== "third_party_auth",
      ),
      authorization_level_refs:
        defaultAuthSessionReadinessAuthorizationLevelRefs.filter(
          (ref) => ref.level_kind !== "configure_auth",
        ),
      identity_refs: defaultAuthSessionReadinessIdentityRefs.filter(
        (ref) => ref.identity_kind !== "agent_seat_identity_ref",
      ),
      session_boundary_refs: defaultAuthSessionReadinessSessionBoundaryRefs.filter(
        (ref) => ref.session_kind !== "revocation_ref",
      ),
      tenant_project_scope_refs:
        defaultAuthSessionReadinessTenantProjectScopeRefs.filter(
          (ref) => ref.scope_kind !== "integration_scope_ref",
        ),
      source_refs: defaultAuthSessionReadinessSourceRefs.filter(
        (ref) => ref.source_ref !== "docs/reference/CONTRACT_PROVENANCE.md",
      ),
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected missing auth readiness evidence failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "auth_session_readiness.auth_mode_ref_required",
          path: "/auth_mode_refs",
        }),
        expect.objectContaining({
          code: "auth_session_readiness.authorization_level_ref_required",
          path: "/authorization_level_refs",
        }),
        expect.objectContaining({
          code: "auth_session_readiness.identity_ref_required",
          path: "/identity_refs",
        }),
        expect.objectContaining({
          code: "auth_session_readiness.session_boundary_ref_required",
          path: "/session_boundary_refs",
        }),
        expect.objectContaining({
          code: "auth_session_readiness.tenant_project_scope_ref_required",
          path: "/tenant_project_scope_refs",
        }),
        expect.objectContaining({
          code: "auth_session_readiness.source_ref_required",
          path: "/source_refs",
        }),
      ]),
    );
    expect(result.raw_input_content).toBe("withheld");
  });

  it("fails closed on auth runtime, provider wiring, permission mutation, DB, and live scope", () => {
    const result = createAuthSessionReadinessContract({
      auth_mode_refs: defaultAuthSessionReadinessAuthModeRefs.map((ref) =>
        ref.auth_kind === "third_party_auth"
          ? {
              ...ref,
              provider_locked: true,
              provider_wiring_allowed: true,
              session_database_allowed: true,
              credential_storage_allowed: true,
            }
          : ref,
      ) as typeof defaultAuthSessionReadinessAuthModeRefs,
      session_boundary_refs: defaultAuthSessionReadinessSessionBoundaryRefs.map(
        (ref) =>
          ref.session_kind === "token_lifetime_ref"
            ? {
                ...ref,
                session_database_allowed: true,
                token_storage_allowed: true,
                jwt_signing_allowed: true,
                oauth_callback_route_allowed: true,
              }
            : ref,
      ) as typeof defaultAuthSessionReadinessSessionBoundaryRefs,
      authorization_level_refs: defaultAuthSessionReadinessAuthorizationLevelRefs.map(
        (ref) =>
          ref.level_kind === "configure_auth"
            ? {
                ...ref,
                permission_mutation_allowed: true,
                live_execution_allowed: true,
              }
            : ref,
      ) as typeof defaultAuthSessionReadinessAuthorizationLevelRefs,
      no_live_posture: {
        ...defaultAuthSessionReadinessNoLivePosture,
        auth_provider_wiring_allowed: true,
        database_write_allowed: true,
        live_execution_allowed: true,
      } as typeof defaultAuthSessionReadinessNoLivePosture,
      allowed_state: {
        ...defaultAuthSessionReadinessAllowedState,
        permission_mutation_allowed: true,
        auth_provider_locked: true,
      } as typeof defaultAuthSessionReadinessAllowedState,
      auth_provider_wiring_allowed: true,
      database_write_allowed: true,
      live_execution_allowed: true,
    } as unknown as AuthSessionReadinessRequest);

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected auth runtime drift failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "auth_session_readiness.invalid_auth_mode_ref",
          path: "/auth_mode_refs/1",
        }),
        expect.objectContaining({
          code: "auth_session_readiness.invalid_session_boundary_ref",
          path: "/session_boundary_refs/1",
        }),
        expect.objectContaining({
          code: "auth_session_readiness.invalid_authorization_level_ref",
          path: "/authorization_level_refs/4",
        }),
        expect.objectContaining({
          code: "auth_session_readiness.no_live_posture_drift",
          path: "/no_live_posture/auth_provider_wiring_allowed",
        }),
        expect.objectContaining({
          code: "auth_session_readiness.allowed_state_drift",
          path: "/allowed_state/permission_mutation_allowed",
        }),
        expect.objectContaining({
          code: "auth_session_readiness.blocked_capability_forbidden",
          path: "/auth_provider_wiring_allowed",
        }),
        expect.objectContaining({
          code: "auth_session_readiness.auth_runtime_forbidden",
          path: "/auth_runtime",
        }),
        expect.objectContaining({
          code: "auth_session_readiness.database_or_writer_forbidden",
          path: "/database_or_writer",
        }),
        expect.objectContaining({
          code: "auth_session_readiness.runtime_or_deploy_forbidden",
          path: "/runtime_or_deploy",
        }),
      ]),
    );
  });

  it("fails closed on unexpected fields, raw secrets, and nonempty side effects", () => {
    const result = createAuthSessionReadinessContract({
      ...defaultAuthSessionReadiness,
      source_refs: [
        ...defaultAuthSessionReadinessSourceRefs,
        {
          source_ref: "docs/reference/CONTRACT_PROVENANCE.md",
          summary: "PASSWORD=not-allowed",
        },
      ],
      side_effects: ["created-user"],
      unexpected_auth_field: true,
    } as unknown as AuthSessionReadinessRequest);

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected unsafe auth readiness request failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "auth_session_readiness.unexpected_field",
          path: "/unexpected_auth_field",
        }),
        expect.objectContaining({
          code: "auth_session_readiness.invalid_source_ref",
          path: "/source_refs/10",
        }),
        expect.objectContaining({
          code: "auth_session_readiness.secret_value_forbidden",
          path: "/",
        }),
        expect.objectContaining({
          code: "auth_session_readiness.side_effects_forbidden",
          path: "/side_effects",
        }),
      ]),
    );
  });

  it("keeps every blocked capability false in default no-live posture", () => {
    const result = createAuthSessionReadinessContract();

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected auth session readiness success");
    }

    expect(Object.keys(result.auth_session_readiness.no_live_posture).sort()).toEqual(
      [...authSessionReadinessBlockedCapabilityFlags].sort(),
    );
    expect(
      Object.values(result.auth_session_readiness.no_live_posture).every(
        (value) => value === false,
      ),
    ).toBe(true);
  });
});
