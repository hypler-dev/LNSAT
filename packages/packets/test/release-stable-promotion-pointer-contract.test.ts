import { describe, expect, it } from "vitest";
import {
  createReleaseStablePromotionPointer,
  defaultReleaseStablePromotionPointerNoLivePosture,
  defaultReleaseStablePromotionPointerRefs,
  releaseSigningRevocationContract,
  releaseStablePromotionPointerBlockedFlags,
  releaseStablePromotionPointerContract,
  releaseStablePromotionPointerRequiredRefs,
  type ReleaseStablePromotionPointerRequest,
} from "../src/index.js";

describe("release stable promotion pointer contract", () => {
  it("emits BP-0236 source-only stable promotion pointer evidence", () => {
    const result = createReleaseStablePromotionPointer();

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected stable promotion pointer contract success");
    }

    expect(result.release_stable_promotion_pointer).toMatchObject({
      contract_id: releaseStablePromotionPointerContract.contract_id,
      extends_contract_id: releaseSigningRevocationContract.contract_id,
      identity: {
        packet_ref: "BP-0236",
        selected_after_packet_ref: "BP-0235",
        manifest_ref: "fixtures/release/source-plan.json",
        promotion_mode: "planned_not_promoted",
        implementation_allowed: false,
      },
      promotion_summary: {
        release_version: "0.1.0-source-plan",
        promotion_state: "source_only_planned",
        stable_status: "planned_not_promoted",
        latest_pointer_status: "planned_not_updated",
        binary_latest_status: "planned_not_updated",
        approval_required_before_stable: true,
        signed_artifacts_required: true,
        revocation_policy_required: true,
      },
      stable_promotions: [],
      latest_pointer_updates: [],
      binary_latest_updates: [],
      release_manifest_writes: [],
      github_releases: [],
      release_uploads: [],
      git_pushes: [],
      github_api_mutations: [],
      registry_publications: [],
      dns_cloudflare_mutations: [],
      side_effects: [],
    });
    expect(
      result.release_stable_promotion_pointer.promotion_refs.map((ref) => ref.ref_kind),
    ).toEqual([...releaseStablePromotionPointerRequiredRefs]);
    expect(result.release_stable_promotion_pointer.blocked_capabilities).toEqual([
      ...releaseStablePromotionPointerBlockedFlags,
    ]);
    expect(result.side_effects).toEqual([]);
  });

  it("fails closed when required pointer refs are missing", () => {
    const result = createReleaseStablePromotionPointer({
      promotion_refs: defaultReleaseStablePromotionPointerRefs.filter(
        (ref) => ref.ref_kind !== "latest_pointer",
      ),
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected missing pointer refs failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "release_stable_promotion_pointer.ref_required",
        }),
      ]),
    );
    expect(result.raw_input_content).toBe("withheld");
  });

  it("fails closed on stable promotion, latest writes, release writes, GitHub mutation, and side effects", () => {
    const result = createReleaseStablePromotionPointer({
      promotion_summary: {
        release_version: "0.1.0-source-plan",
        promotion_state: "source_only_planned",
        stable_status: "planned_not_promoted",
        latest_pointer_status: "planned_not_updated",
        binary_latest_status: "planned_not_updated",
        approval_required_before_stable: false,
        signed_artifacts_required: true,
        revocation_policy_required: true,
      },
      promotion_refs: defaultReleaseStablePromotionPointerRefs.map((ref) =>
        ref.ref_kind === "latest_pointer" ? { ...ref, write_allowed: true } : ref,
      ),
      no_live_posture: {
        ...defaultReleaseStablePromotionPointerNoLivePosture,
        stable_promotion_allowed: true,
        latest_pointer_write_allowed: true,
        release_manifest_write_allowed: true,
        github_api_mutation_allowed: true,
      } as typeof defaultReleaseStablePromotionPointerNoLivePosture,
      git_push_allowed: true,
      side_effects: ["write latest pointer"],
    } as unknown as ReleaseStablePromotionPointerRequest);

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected blocked stable promotion pointer failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "release_stable_promotion_pointer.summary_invalid",
        }),
        expect.objectContaining({
          code: "release_stable_promotion_pointer.ref_invalid",
        }),
        expect.objectContaining({
          code: "release_stable_promotion_pointer.no_live_posture_drift",
        }),
        expect.objectContaining({
          code: "release_stable_promotion_pointer.blocked_capability_drift",
        }),
        expect.objectContaining({
          code: "release_stable_promotion_pointer.side_effects_forbidden",
        }),
      ]),
    );
  });

  it("rejects unsafe refs and unexpected fields without echoing raw input", () => {
    const result = createReleaseStablePromotionPointer({
      promotion_refs: defaultReleaseStablePromotionPointerRefs.map((ref) =>
        ref.ref_kind === "version_pointer"
          ? { ...ref, source_ref: "gh release upload and write latest" }
          : ref,
      ),
      unexpected_secret_key: true,
    } as unknown as ReleaseStablePromotionPointerRequest);

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected unsafe stable promotion pointer refs failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "release_stable_promotion_pointer.ref_invalid",
        }),
        expect.objectContaining({
          code: "release_stable_promotion_pointer.unexpected_field",
        }),
      ]),
    );
    expect(result.raw_input_content).toBe("withheld");
    expect(result.side_effects).toEqual([]);
  });
});
