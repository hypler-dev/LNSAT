import { describe, expect, it } from "vitest";
import {
  createSourceRevisionTagApprovalReview,
  defaultSourceRevisionTagApprovalEvidenceRefs,
  defaultSourceRevisionTagApprovalNoLivePosture,
  sourceRevisionTagApprovalBlockedFlags,
  sourceRevisionTagApprovalEvidenceKinds,
  sourceRevisionTagApprovalReviewContract,
  stableLatestPointerApprovalReviewContract,
  type SourceRevisionTagApprovalRequest,
} from "../src/index.js";

describe("source revision tag approval review", () => {
  it("emits BP-0257 source-only revision/tag approval evidence", () => {
    const result = createSourceRevisionTagApprovalReview();

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected source revision/tag approval success");
    }

    expect(result.source_revision_tag_approval).toMatchObject({
      contract_id: sourceRevisionTagApprovalReviewContract.contract_id,
      extends_contract_id: stableLatestPointerApprovalReviewContract.contract_id,
      identity: {
        packet_ref: "BP-0257",
        selected_after_packet_ref: "BP-0256",
        release_version: "0.1.0-source-plan",
        gate_state: "source_revision_tag_approval_not_approved",
        approval_state: "not_approved",
        tag_execution_allowed: false,
      },
      revision_summary: {
        source_revision_state: "candidate_ref_required",
        branch_state: "release_branch_not_selected",
        tag_name_state: "planned_not_created",
        archive_state: "not_created",
        current_allowed_output: "source_only_revision_tag_approval_review",
      },
      source_revisions_blessed: [],
      tags_created: [],
      git_commits: [],
      git_pushes: [],
      source_archives_created: [],
      checksum_generations: [],
      github_releases: [],
      release_uploads: [],
      pointer_mutations: [],
      download_page_mutations: [],
      dns_cloudflare_mutations: [],
      side_effects: [],
    });
    expect(
      result.source_revision_tag_approval.evidence_refs.map((ref) => ref.evidence_kind),
    ).toEqual([...sourceRevisionTagApprovalEvidenceKinds]);
    expect(result.source_revision_tag_approval.blocked_capabilities).toEqual([
      ...sourceRevisionTagApprovalBlockedFlags,
    ]);
    expect(result.side_effects).toEqual([]);
  });

  it("fails closed when required source revision evidence is missing", () => {
    const result = createSourceRevisionTagApprovalReview({
      evidence_refs: defaultSourceRevisionTagApprovalEvidenceRefs.filter(
        (ref) => ref.evidence_kind !== "source_revision_candidate_ref",
      ),
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected missing source revision evidence failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "source_revision_tag_approval.ref_required",
        }),
      ]),
    );
    expect(result.raw_input_content).toBe("withheld");
  });

  it("fails closed on approval drift, execution scope, and side effects", () => {
    const result = createSourceRevisionTagApprovalReview({
      identity: {
        packet_ref: "BP-0257",
        selected_after_packet_ref: "BP-0256",
        release_version: "0.1.0-source-plan",
        gate_state: "source_revision_tag_approval_not_approved",
        approval_state: "not_approved",
        tag_execution_allowed: true,
      },
      evidence_refs: defaultSourceRevisionTagApprovalEvidenceRefs.map((ref) =>
        ref.evidence_kind === "approval_ref"
          ? { ...ref, approved: true, execution_allowed: true }
          : ref,
      ),
      no_live_posture: {
        ...defaultSourceRevisionTagApprovalNoLivePosture,
        tag_creation_allowed: true,
        git_push_allowed: true,
      } as typeof defaultSourceRevisionTagApprovalNoLivePosture,
      source_revision_blessing_allowed: true,
      side_effects: ["tag created"],
    } as unknown as SourceRevisionTagApprovalRequest);

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected source revision/tag drift failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "source_revision_tag_approval.identity_invalid",
        }),
        expect.objectContaining({
          code: "source_revision_tag_approval.ref_invalid",
        }),
        expect.objectContaining({
          code: "source_revision_tag_approval.no_live_posture_drift",
        }),
        expect.objectContaining({
          code: "source_revision_tag_approval.blocked_capability_drift",
        }),
        expect.objectContaining({
          code: "source_revision_tag_approval.side_effects_forbidden",
        }),
      ]),
    );
  });

  it("rejects unsafe refs and unexpected fields without echoing raw input", () => {
    const result = createSourceRevisionTagApprovalReview({
      evidence_refs: defaultSourceRevisionTagApprovalEvidenceRefs.map((ref) =>
        ref.evidence_kind === "tag_name_policy_ref"
          ? { ...ref, source_ref: "create tag with token" }
          : ref,
      ),
      unexpected_secret_value: true,
    } as unknown as SourceRevisionTagApprovalRequest);

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected unsafe source revision/tag refs failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "source_revision_tag_approval.ref_invalid",
        }),
        expect.objectContaining({
          code: "source_revision_tag_approval.unexpected_field",
        }),
      ]),
    );
    expect(result.raw_input_content).toBe("withheld");
    expect(result.side_effects).toEqual([]);
  });
});
