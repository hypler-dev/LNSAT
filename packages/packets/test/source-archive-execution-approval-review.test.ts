import { describe, expect, it } from "vitest";
import {
  createSourceArchiveExecutionApprovalReview,
  defaultSourceArchiveExecutionApprovalEvidenceRefs,
  defaultSourceArchiveExecutionApprovalNoLivePosture,
  sourceArchiveExecutionApprovalBlockedFlags,
  sourceArchiveExecutionApprovalEvidenceKinds,
  sourceArchiveExecutionApprovalReviewContract,
  sourceRevisionTagApprovalReviewContract,
  type SourceArchiveExecutionApprovalRequest,
} from "../src/index.js";

describe("source archive execution approval review", () => {
  it("emits BP-0258 source-only archive execution approval evidence", () => {
    const result = createSourceArchiveExecutionApprovalReview();

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected source archive execution approval success");
    }

    expect(result.source_archive_execution_approval).toMatchObject({
      contract_id: sourceArchiveExecutionApprovalReviewContract.contract_id,
      extends_contract_id: sourceRevisionTagApprovalReviewContract.contract_id,
      identity: {
        packet_ref: "BP-0258",
        selected_after_packet_ref: "BP-0257",
        release_version: "0.1.0-source-plan",
        candidate_lane: "source_archive",
        gate_state: "source_archive_execution_approval_not_approved",
        approval_state: "not_approved",
        archive_execution_allowed: false,
      },
      approval_summary: {
        source_revision_state: "candidate_ref_required",
        tag_state: "planned_not_created",
        archive_state: "not_created",
        checksum_state: "planned_not_generated",
        github_release_state: "not_created",
        current_allowed_output: "source_only_archive_execution_approval_review",
      },
      source_archive_executions: [],
      source_archives_created: [],
      source_tags_created: [],
      checksum_generations: [],
      github_releases: [],
      release_uploads: [],
      pointer_mutations: [],
      download_page_mutations: [],
      git_commits: [],
      git_pushes: [],
      dns_cloudflare_mutations: [],
      side_effects: [],
    });
    expect(
      result.source_archive_execution_approval.evidence_refs.map(
        (ref) => ref.evidence_kind,
      ),
    ).toEqual([...sourceArchiveExecutionApprovalEvidenceKinds]);
    expect(result.source_archive_execution_approval.blocked_capabilities).toEqual([
      ...sourceArchiveExecutionApprovalBlockedFlags,
    ]);
    expect(result.side_effects).toEqual([]);
  });

  it("fails closed when required archive approval evidence is missing", () => {
    const result = createSourceArchiveExecutionApprovalReview({
      evidence_refs: defaultSourceArchiveExecutionApprovalEvidenceRefs.filter(
        (ref) => ref.evidence_kind !== "explicit_execution_approval_ref",
      ),
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected missing archive approval evidence failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "source_archive_execution_approval.ref_required",
        }),
      ]),
    );
    expect(result.raw_input_content).toBe("withheld");
  });

  it("fails closed on approval drift, execution scope, and side effects", () => {
    const result = createSourceArchiveExecutionApprovalReview({
      identity: {
        packet_ref: "BP-0258",
        selected_after_packet_ref: "BP-0257",
        release_version: "0.1.0-source-plan",
        candidate_lane: "source_archive",
        gate_state: "source_archive_execution_approval_not_approved",
        approval_state: "not_approved",
        archive_execution_allowed: true,
      },
      evidence_refs: defaultSourceArchiveExecutionApprovalEvidenceRefs.map((ref) =>
        ref.evidence_kind === "explicit_execution_approval_ref"
          ? { ...ref, approved: true, execution_allowed: true }
          : ref,
      ),
      no_live_posture: {
        ...defaultSourceArchiveExecutionApprovalNoLivePosture,
        source_archive_creation_allowed: true,
        release_upload_allowed: true,
      } as typeof defaultSourceArchiveExecutionApprovalNoLivePosture,
      source_archive_execution_allowed: true,
      side_effects: ["archive created"],
    } as unknown as SourceArchiveExecutionApprovalRequest);

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected source archive execution approval drift failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "source_archive_execution_approval.identity_invalid",
        }),
        expect.objectContaining({
          code: "source_archive_execution_approval.ref_invalid",
        }),
        expect.objectContaining({
          code: "source_archive_execution_approval.no_live_posture_drift",
        }),
        expect.objectContaining({
          code: "source_archive_execution_approval.blocked_capability_drift",
        }),
        expect.objectContaining({
          code: "source_archive_execution_approval.side_effects_forbidden",
        }),
      ]),
    );
  });

  it("rejects unsafe refs and unexpected fields without echoing raw input", () => {
    const result = createSourceArchiveExecutionApprovalReview({
      evidence_refs: defaultSourceArchiveExecutionApprovalEvidenceRefs.map((ref) =>
        ref.evidence_kind === "archive_format_ref"
          ? { ...ref, source_ref: "create archive with token" }
          : ref,
      ),
      unexpected_secret_value: true,
    } as unknown as SourceArchiveExecutionApprovalRequest);

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected unsafe archive approval refs failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "source_archive_execution_approval.ref_invalid",
        }),
        expect.objectContaining({
          code: "source_archive_execution_approval.unexpected_field",
        }),
      ]),
    );
    expect(result.raw_input_content).toBe("withheld");
    expect(result.side_effects).toEqual([]);
  });
});
