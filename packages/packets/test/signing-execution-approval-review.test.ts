import { describe, expect, it } from "vitest";
import {
  checksumExecutionApprovalReviewContract,
  createSigningExecutionApprovalReview,
  defaultSigningExecutionApprovalEvidenceRefs,
  defaultSigningExecutionApprovalNoLivePosture,
  signingExecutionApprovalBlockedFlags,
  signingExecutionApprovalEvidenceKinds,
  signingExecutionApprovalReviewContract,
  type SigningExecutionApprovalRequest,
} from "../src/index.js";

describe("signing execution approval review", () => {
  it("emits BP-0260 source-only signing execution approval evidence", () => {
    const result = createSigningExecutionApprovalReview();

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected signing execution approval success");
    }

    expect(result.signing_execution_approval).toMatchObject({
      contract_id: signingExecutionApprovalReviewContract.contract_id,
      extends_contract_id: checksumExecutionApprovalReviewContract.contract_id,
      identity: {
        packet_ref: "BP-0260",
        selected_after_packet_ref: "BP-0259",
        release_version: "0.1.0-source-plan",
        candidate_lane: "source_archive",
        gate_state: "signing_execution_approval_not_approved",
        approval_state: "not_approved",
        signing_execution_allowed: false,
      },
      approval_summary: {
        source_archive_state: "not_created",
        checksum_state: "planned_not_generated",
        checksum_index_state: "planned_not_written",
        signature_status: "planned_not_signed",
        signature_index_state: "planned_not_written",
        signing_identity_state: "planned_reference_only",
        certificate_state: "planned_reference_only",
        transparency_log_state: "planned_reference_only",
        notarization_state: "planned_not_notarized",
        revocation_state: "planned_policy_only",
        github_release_state: "not_created",
        current_allowed_output: "source_only_signing_execution_approval_review",
      },
      signing_executions: [],
      cosign_executions: [],
      certificate_requests: [],
      issued_certificates: [],
      generated_keys: [],
      stored_keys: [],
      signature_files: [],
      signature_index_writes: [],
      notarizations: [],
      checksum_executions: [],
      checksum_generations: [],
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
      result.signing_execution_approval.evidence_refs.map((ref) => ref.evidence_kind),
    ).toEqual([...signingExecutionApprovalEvidenceKinds]);
    expect(result.signing_execution_approval.blocked_capabilities).toEqual([
      ...signingExecutionApprovalBlockedFlags,
    ]);
    expect(result.side_effects).toEqual([]);
  });

  it("fails closed when required signing approval evidence is missing", () => {
    const result = createSigningExecutionApprovalReview({
      evidence_refs: defaultSigningExecutionApprovalEvidenceRefs.filter(
        (ref) => ref.evidence_kind !== "explicit_execution_approval_ref",
      ),
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected missing signing approval evidence failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "signing_execution_approval.ref_required",
        }),
      ]),
    );
    expect(result.raw_input_content).toBe("withheld");
  });

  it("fails closed on approval drift, execution scope, and side effects", () => {
    const result = createSigningExecutionApprovalReview({
      identity: {
        packet_ref: "BP-0260",
        selected_after_packet_ref: "BP-0259",
        release_version: "0.1.0-source-plan",
        candidate_lane: "source_archive",
        gate_state: "signing_execution_approval_not_approved",
        approval_state: "not_approved",
        signing_execution_allowed: true,
      },
      evidence_refs: defaultSigningExecutionApprovalEvidenceRefs.map((ref) =>
        ref.evidence_kind === "explicit_execution_approval_ref"
          ? { ...ref, approved: true, execution_allowed: true }
          : ref,
      ),
      no_live_posture: {
        ...defaultSigningExecutionApprovalNoLivePosture,
        signing_execution_allowed: true,
        signature_file_write_allowed: true,
      } as typeof defaultSigningExecutionApprovalNoLivePosture,
      signing_execution_allowed: true,
      side_effects: ["signature written"],
    } as unknown as SigningExecutionApprovalRequest);

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected signing execution approval drift failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "signing_execution_approval.identity_invalid",
        }),
        expect.objectContaining({
          code: "signing_execution_approval.ref_invalid",
        }),
        expect.objectContaining({
          code: "signing_execution_approval.no_live_posture_drift",
        }),
        expect.objectContaining({
          code: "signing_execution_approval.blocked_capability_drift",
        }),
        expect.objectContaining({
          code: "signing_execution_approval.side_effects_forbidden",
        }),
      ]),
    );
  });

  it("rejects unsafe refs and unexpected fields without echoing raw input", () => {
    const result = createSigningExecutionApprovalReview({
      evidence_refs: defaultSigningExecutionApprovalEvidenceRefs.map((ref) =>
        ref.evidence_kind === "signing_command_plan_ref"
          ? { ...ref, source_ref: "cosign sign artifact with token" }
          : ref,
      ),
      unexpected_secret_value: true,
    } as unknown as SigningExecutionApprovalRequest);

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected unsafe signing approval refs failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "signing_execution_approval.ref_invalid",
        }),
        expect.objectContaining({
          code: "signing_execution_approval.unexpected_field",
        }),
      ]),
    );
    expect(result.raw_input_content).toBe("withheld");
    expect(result.side_effects).toEqual([]);
  });
});
