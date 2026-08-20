import { describe, expect, it } from "vitest";
import {
  checksumExecutionApprovalBlockedFlags,
  checksumExecutionApprovalEvidenceKinds,
  checksumExecutionApprovalReviewContract,
  createChecksumExecutionApprovalReview,
  defaultChecksumExecutionApprovalEvidenceRefs,
  defaultChecksumExecutionApprovalNoLivePosture,
  sourceArchiveExecutionApprovalReviewContract,
  type ChecksumExecutionApprovalRequest,
} from "../src/index.js";

describe("checksum execution approval review", () => {
  it("emits BP-0259 source-only checksum execution approval evidence", () => {
    const result = createChecksumExecutionApprovalReview();

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected checksum execution approval success");
    }

    expect(result.checksum_execution_approval).toMatchObject({
      contract_id: checksumExecutionApprovalReviewContract.contract_id,
      extends_contract_id: sourceArchiveExecutionApprovalReviewContract.contract_id,
      identity: {
        packet_ref: "BP-0259",
        selected_after_packet_ref: "BP-0258",
        release_version: "0.1.0-source-plan",
        candidate_lane: "source_archive",
        gate_state: "checksum_execution_approval_not_approved",
        approval_state: "not_approved",
        checksum_execution_allowed: false,
      },
      approval_summary: {
        source_archive_state: "not_created",
        checksum_state: "planned_not_generated",
        checksum_index_state: "planned_not_written",
        manifest_alignment_state: "planned_not_verified",
        github_release_state: "not_created",
        current_allowed_output: "source_only_checksum_execution_approval_review",
      },
      checksum_executions: [],
      checksum_generations: [],
      checksum_file_writes: [],
      checksum_index_writes: [],
      source_archives_created: [],
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
      result.checksum_execution_approval.evidence_refs.map((ref) => ref.evidence_kind),
    ).toEqual([...checksumExecutionApprovalEvidenceKinds]);
    expect(result.checksum_execution_approval.blocked_capabilities).toEqual([
      ...checksumExecutionApprovalBlockedFlags,
    ]);
    expect(result.side_effects).toEqual([]);
  });

  it("fails closed when required checksum approval evidence is missing", () => {
    const result = createChecksumExecutionApprovalReview({
      evidence_refs: defaultChecksumExecutionApprovalEvidenceRefs.filter(
        (ref) => ref.evidence_kind !== "explicit_execution_approval_ref",
      ),
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected missing checksum approval evidence failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "checksum_execution_approval.ref_required",
        }),
      ]),
    );
    expect(result.raw_input_content).toBe("withheld");
  });

  it("fails closed on approval drift, execution scope, and side effects", () => {
    const result = createChecksumExecutionApprovalReview({
      identity: {
        packet_ref: "BP-0259",
        selected_after_packet_ref: "BP-0258",
        release_version: "0.1.0-source-plan",
        candidate_lane: "source_archive",
        gate_state: "checksum_execution_approval_not_approved",
        approval_state: "not_approved",
        checksum_execution_allowed: true,
      },
      evidence_refs: defaultChecksumExecutionApprovalEvidenceRefs.map((ref) =>
        ref.evidence_kind === "explicit_execution_approval_ref"
          ? { ...ref, approved: true, execution_allowed: true }
          : ref,
      ),
      no_live_posture: {
        ...defaultChecksumExecutionApprovalNoLivePosture,
        checksum_generation_allowed: true,
        checksum_index_write_allowed: true,
      } as typeof defaultChecksumExecutionApprovalNoLivePosture,
      checksum_execution_allowed: true,
      side_effects: ["checksum generated"],
    } as unknown as ChecksumExecutionApprovalRequest);

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected checksum execution approval drift failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "checksum_execution_approval.identity_invalid",
        }),
        expect.objectContaining({
          code: "checksum_execution_approval.ref_invalid",
        }),
        expect.objectContaining({
          code: "checksum_execution_approval.no_live_posture_drift",
        }),
        expect.objectContaining({
          code: "checksum_execution_approval.blocked_capability_drift",
        }),
        expect.objectContaining({
          code: "checksum_execution_approval.side_effects_forbidden",
        }),
      ]),
    );
  });

  it("rejects unsafe refs and unexpected fields without echoing raw input", () => {
    const result = createChecksumExecutionApprovalReview({
      evidence_refs: defaultChecksumExecutionApprovalEvidenceRefs.map((ref) =>
        ref.evidence_kind === "checksum_command_plan_ref"
          ? { ...ref, source_ref: "sha256sum artifact with token" }
          : ref,
      ),
      unexpected_secret_value: true,
    } as unknown as ChecksumExecutionApprovalRequest);

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected unsafe checksum approval refs failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "checksum_execution_approval.ref_invalid",
        }),
        expect.objectContaining({
          code: "checksum_execution_approval.unexpected_field",
        }),
      ]),
    );
    expect(result.raw_input_content).toBe("withheld");
    expect(result.side_effects).toEqual([]);
  });
});
