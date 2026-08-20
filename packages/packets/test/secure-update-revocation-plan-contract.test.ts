import { describe, expect, it } from "vitest";
import {
  complianceReadinessMapContract,
  createSecureUpdateRevocationPlan,
  defaultSecureUpdateRevocationNoLivePosture,
  defaultSecureUpdateRevocationRefs,
  secureUpdateRevocationBlockedFlags,
  secureUpdateRevocationPlanContract,
  secureUpdateRevocationRequiredRefs,
  type SecureUpdateRevocationRequest,
} from "../src/index.js";

describe("secure update revocation plan contract", () => {
  it("emits BP-0240 source-only secure update and revocation evidence", () => {
    const result = createSecureUpdateRevocationPlan();

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected secure update revocation plan success");
    }

    expect(result.secure_update_revocation).toMatchObject({
      contract_id: secureUpdateRevocationPlanContract.contract_id,
      extends_contract_id: complianceReadinessMapContract.contract_id,
      identity: {
        packet_ref: "BP-0240",
        selected_after_packet_ref: "BP-0239",
        manifest_ref: "fixtures/release/source-plan.json",
        update_mode: "planned_not_active",
        implementation_allowed: false,
      },
      update_summary: {
        release_version: "0.1.0-source-plan",
        update_state: "planned_not_active",
        revocation_state: "planned_not_published",
        rollback_state: "planned_not_executed",
        channel_state: "source_only_channels_defined",
        client_update_state: "client_owned_not_auto_update",
        emergency_state: "planned_not_activated",
        approval_required_before_update: true,
        signed_manifest_required: true,
      },
      update_manifest_writes: [],
      stable_pointer_updates: [],
      latest_pointer_updates: [],
      binary_latest_updates: [],
      signing_executions: [],
      revocation_publications: [],
      emergency_disablement_activations: [],
      rollback_executions: [],
      installer_executions: [],
      package_builds: [],
      release_uploads: [],
      github_releases: [],
      github_api_mutations: [],
      git_pushes: [],
      dns_cloudflare_mutations: [],
      external_service_calls: [],
      side_effects: [],
    });
    expect(
      result.secure_update_revocation.update_refs.map((ref) => ref.ref_kind),
    ).toEqual([...secureUpdateRevocationRequiredRefs]);
    expect(result.secure_update_revocation.blocked_capabilities).toEqual([
      ...secureUpdateRevocationBlockedFlags,
    ]);
    expect(result.side_effects).toEqual([]);
  });

  it("fails closed when required update refs are missing", () => {
    const result = createSecureUpdateRevocationPlan({
      update_refs: defaultSecureUpdateRevocationRefs.filter(
        (ref) => ref.ref_kind !== "revocation_list",
      ),
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected missing update refs failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "secure_update_revocation.ref_required",
        }),
      ]),
    );
    expect(result.raw_input_content).toBe("withheld");
  });

  it("fails closed on pointer writes, revocation publication, rollback execution, and side effects", () => {
    const result = createSecureUpdateRevocationPlan({
      update_summary: {
        release_version: "0.1.0-source-plan",
        update_state: "planned_not_active",
        revocation_state: "planned_not_published",
        rollback_state: "planned_not_executed",
        channel_state: "source_only_channels_defined",
        client_update_state: "client_owned_not_auto_update",
        emergency_state: "planned_not_activated",
        approval_required_before_update: false,
        signed_manifest_required: true,
      },
      update_refs: defaultSecureUpdateRevocationRefs.map((ref) =>
        ref.ref_kind === "download_page_pointer"
          ? { ...ref, mutation_allowed: true }
          : ref,
      ),
      no_live_posture: {
        ...defaultSecureUpdateRevocationNoLivePosture,
        latest_pointer_write_allowed: true,
        revocation_publication_allowed: true,
        rollback_execution_allowed: true,
        github_api_mutation_allowed: true,
      } as typeof defaultSecureUpdateRevocationNoLivePosture,
      git_push_allowed: true,
      side_effects: ["publish revocation"],
    } as unknown as SecureUpdateRevocationRequest);

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected blocked secure update revocation failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "secure_update_revocation.summary_invalid",
        }),
        expect.objectContaining({
          code: "secure_update_revocation.ref_invalid",
        }),
        expect.objectContaining({
          code: "secure_update_revocation.no_live_posture_drift",
        }),
        expect.objectContaining({
          code: "secure_update_revocation.blocked_capability_drift",
        }),
        expect.objectContaining({
          code: "secure_update_revocation.side_effects_forbidden",
        }),
      ]),
    );
  });

  it("rejects unsafe refs and unexpected fields without echoing raw input", () => {
    const result = createSecureUpdateRevocationPlan({
      update_refs: defaultSecureUpdateRevocationRefs.map((ref) =>
        ref.ref_kind === "revocation_policy"
          ? { ...ref, source_ref: "gh release upload and publish revocation" }
          : ref,
      ),
      unexpected_secret_value: true,
    } as unknown as SecureUpdateRevocationRequest);

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected unsafe secure update revocation refs failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "secure_update_revocation.ref_invalid",
        }),
        expect.objectContaining({
          code: "secure_update_revocation.unexpected_field",
        }),
      ]),
    );
    expect(result.raw_input_content).toBe("withheld");
    expect(result.side_effects).toEqual([]);
  });
});
