import { describe, expect, it } from "vitest";
import {
  createStableLatestPointerApprovalReview,
  defaultStableLatestPointerApprovalEvidenceRefs,
  defaultStableLatestPointerApprovalNoLivePosture,
  releaseManifestChangelogConsistencyContract,
  stableLatestPointerApprovalBlockedFlags,
  stableLatestPointerApprovalEvidenceKinds,
  stableLatestPointerApprovalReviewContract,
  type StableLatestPointerApprovalRequest,
} from "../src/index.js";

describe("stable latest pointer approval review", () => {
  it("emits BP-0256 source-only stable/latest pointer approval evidence", () => {
    const result = createStableLatestPointerApprovalReview();

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected stable/latest pointer approval success");
    }

    expect(result.stable_latest_pointer_approval).toMatchObject({
      contract_id: stableLatestPointerApprovalReviewContract.contract_id,
      extends_contract_id: releaseManifestChangelogConsistencyContract.contract_id,
      identity: {
        packet_ref: "BP-0256",
        selected_after_packet_ref: "BP-0255",
        release_version: "0.1.0-source-plan",
        gate_state: "stable_latest_pointer_approval_not_approved",
        approval_state: "not_approved",
        pointer_write_allowed: false,
      },
      pointer_summary: {
        stable_status: "planned_not_promoted",
        latest_pointer_status: "source_only_not_updated",
        binary_latest_status: "source_only_not_updated",
        current_allowed_output: "source_only_pointer_approval_review",
      },
      stable_promotions: [],
      latest_pointer_writes: [],
      version_pointer_writes: [],
      binary_latest_updates: [],
      release_manifest_writes: [],
      github_releases: [],
      release_uploads: [],
      pointer_mutations: [],
      download_page_mutations: [],
      git_pushes: [],
      dns_cloudflare_mutations: [],
      side_effects: [],
    });
    expect(
      result.stable_latest_pointer_approval.evidence_refs.map(
        (ref) => ref.evidence_kind,
      ),
    ).toEqual([...stableLatestPointerApprovalEvidenceKinds]);
    expect(result.stable_latest_pointer_approval.blocked_capabilities).toEqual([
      ...stableLatestPointerApprovalBlockedFlags,
    ]);
    expect(result.side_effects).toEqual([]);
  });

  it("fails closed when required pointer evidence is missing", () => {
    const result = createStableLatestPointerApprovalReview({
      evidence_refs: defaultStableLatestPointerApprovalEvidenceRefs.filter(
        (ref) => ref.evidence_kind !== "latest_pointer_ref",
      ),
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected missing pointer evidence failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "stable_latest_pointer_approval.ref_required",
        }),
      ]),
    );
    expect(result.raw_input_content).toBe("withheld");
  });

  it("fails closed on approval drift, mutation scope, and side effects", () => {
    const result = createStableLatestPointerApprovalReview({
      identity: {
        packet_ref: "BP-0256",
        selected_after_packet_ref: "BP-0255",
        release_version: "0.1.0-source-plan",
        gate_state: "stable_latest_pointer_approval_not_approved",
        approval_state: "not_approved",
        pointer_write_allowed: true,
      },
      pointer_summary: {
        stable_status: "planned_not_promoted",
        latest_pointer_status: "source_only_not_updated",
        binary_latest_status: "source_only_not_updated",
        current_allowed_output: "source_only_pointer_approval_review",
      },
      evidence_refs: defaultStableLatestPointerApprovalEvidenceRefs.map((ref) =>
        ref.evidence_kind === "latest_pointer_ref"
          ? { ...ref, approved: true, mutation_allowed: true }
          : ref,
      ),
      no_live_posture: {
        ...defaultStableLatestPointerApprovalNoLivePosture,
        latest_pointer_write_allowed: true,
        github_release_creation_allowed: true,
      } as typeof defaultStableLatestPointerApprovalNoLivePosture,
      stable_promotion_allowed: true,
      side_effects: ["latest pointer changed"],
    } as unknown as StableLatestPointerApprovalRequest);

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected pointer approval drift failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "stable_latest_pointer_approval.identity_invalid",
        }),
        expect.objectContaining({
          code: "stable_latest_pointer_approval.ref_invalid",
        }),
        expect.objectContaining({
          code: "stable_latest_pointer_approval.no_live_posture_drift",
        }),
        expect.objectContaining({
          code: "stable_latest_pointer_approval.blocked_capability_drift",
        }),
        expect.objectContaining({
          code: "stable_latest_pointer_approval.side_effects_forbidden",
        }),
      ]),
    );
  });

  it("rejects unsafe refs and unexpected fields without echoing raw input", () => {
    const result = createStableLatestPointerApprovalReview({
      evidence_refs: defaultStableLatestPointerApprovalEvidenceRefs.map((ref) =>
        ref.evidence_kind === "stable_approval_ref"
          ? { ...ref, source_ref: "promote stable with token" }
          : ref,
      ),
      unexpected_secret_value: true,
    } as unknown as StableLatestPointerApprovalRequest);

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected unsafe pointer approval refs failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "stable_latest_pointer_approval.ref_invalid",
        }),
        expect.objectContaining({
          code: "stable_latest_pointer_approval.unexpected_field",
        }),
      ]),
    );
    expect(result.raw_input_content).toBe("withheld");
    expect(result.side_effects).toEqual([]);
  });
});
