import { describe, expect, it } from "vitest";
import {
  createGithubReleasePublicationApprovalReview,
  defaultGithubReleasePublicationApprovalEvidenceRefs,
  defaultGithubReleasePublicationApprovalNoLivePosture,
  githubReleasePublicationApprovalBlockedFlags,
  githubReleasePublicationApprovalEvidenceKinds,
  githubReleasePublicationApprovalReviewContract,
  sbomProvenanceExecutionApprovalReviewContract,
  type GithubReleasePublicationApprovalRequest,
} from "../src/index.js";

describe("GitHub Release publication approval review", () => {
  it("emits BP-0263 source-only GitHub Release publication approval evidence", () => {
    const result = createGithubReleasePublicationApprovalReview();

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected GitHub Release publication approval success");
    }

    expect(result.github_release_publication_approval).toMatchObject({
      contract_id: githubReleasePublicationApprovalReviewContract.contract_id,
      extends_contract_id: sbomProvenanceExecutionApprovalReviewContract.contract_id,
      identity: {
        packet_ref: "BP-0263",
        selected_after_packet_ref: "BP-0262",
        release_version: "0.1.0-source-plan",
        candidate_lane: "source_archive",
        gate_state: "github_release_publication_approval_not_approved",
        approval_state: "not_approved",
        github_release_publication_allowed: false,
      },
      approval_summary: {
        release_notes_state: "draft_source_only",
        manifest_state: "source_plan_static",
        source_archive_state: "not_created",
        checksum_state: "planned_not_generated",
        signature_status: "planned_not_signed",
        sbom_status: "required_not_generated",
        provenance_status: "required_not_generated",
        github_release_state: "not_created",
        asset_upload_state: "not_uploaded",
        stable_pointer_state: "source_only_not_updated",
        current_allowed_output:
          "source_only_github_release_publication_approval_review",
      },
      github_releases: [],
      github_release_publications: [],
      release_uploads: [],
      asset_uploads: [],
      asset_publications: [],
      source_tags_created: [],
      source_archives_created: [],
      checksum_executions: [],
      signing_executions: [],
      generated_sboms: [],
      generated_provenance: [],
      created_attestations: [],
      pointer_mutations: [],
      download_page_mutations: [],
      git_commits: [],
      git_pushes: [],
      dns_cloudflare_mutations: [],
      side_effects: [],
    });
    expect(
      result.github_release_publication_approval.evidence_refs.map(
        (ref) => ref.evidence_kind,
      ),
    ).toEqual([...githubReleasePublicationApprovalEvidenceKinds]);
    expect(result.github_release_publication_approval.blocked_capabilities).toEqual([
      ...githubReleasePublicationApprovalBlockedFlags,
    ]);
    expect(result.side_effects).toEqual([]);
  });

  it("fails closed when explicit publication approval evidence is missing", () => {
    const result = createGithubReleasePublicationApprovalReview({
      evidence_refs: defaultGithubReleasePublicationApprovalEvidenceRefs.filter(
        (ref) => ref.evidence_kind !== "explicit_publication_approval_ref",
      ),
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected missing publication approval failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "github_release_publication_approval.ref_required",
        }),
      ]),
    );
    expect(result.raw_input_content).toBe("withheld");
  });

  it("fails closed on approval drift, publication scope, and side effects", () => {
    const result = createGithubReleasePublicationApprovalReview({
      identity: {
        packet_ref: "BP-0263",
        selected_after_packet_ref: "BP-0262",
        release_version: "0.1.0-source-plan",
        candidate_lane: "source_archive",
        gate_state: "github_release_publication_approval_not_approved",
        approval_state: "not_approved",
        github_release_publication_allowed: true,
      },
      evidence_refs: defaultGithubReleasePublicationApprovalEvidenceRefs.map((ref) =>
        ref.evidence_kind === "explicit_publication_approval_ref"
          ? { ...ref, approved: true, execution_allowed: true }
          : ref,
      ),
      no_live_posture: {
        ...defaultGithubReleasePublicationApprovalNoLivePosture,
        github_release_creation_allowed: true,
        asset_upload_allowed: true,
      } as typeof defaultGithubReleasePublicationApprovalNoLivePosture,
      github_release_creation_allowed: true,
      side_effects: ["release created"],
    } as unknown as GithubReleasePublicationApprovalRequest);

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected GitHub Release publication approval drift failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "github_release_publication_approval.identity_invalid",
        }),
        expect.objectContaining({
          code: "github_release_publication_approval.ref_invalid",
        }),
        expect.objectContaining({
          code: "github_release_publication_approval.no_live_posture_drift",
        }),
        expect.objectContaining({
          code: "github_release_publication_approval.blocked_capability_drift",
        }),
        expect.objectContaining({
          code: "github_release_publication_approval.side_effects_forbidden",
        }),
      ]),
    );
  });

  it("rejects unsafe refs and unexpected fields without echoing raw input", () => {
    const result = createGithubReleasePublicationApprovalReview({
      evidence_refs: defaultGithubReleasePublicationApprovalEvidenceRefs.map((ref) =>
        ref.evidence_kind === "asset_upload_plan_ref"
          ? { ...ref, source_ref: "gh release upload with token" }
          : ref,
      ),
      unexpected_secret_value: true,
    } as unknown as GithubReleasePublicationApprovalRequest);

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected unsafe GitHub Release publication refs failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "github_release_publication_approval.ref_invalid",
        }),
        expect.objectContaining({
          code: "github_release_publication_approval.unexpected_field",
        }),
      ]),
    );
    expect(result.raw_input_content).toBe("withheld");
    expect(result.side_effects).toEqual([]);
  });
});
