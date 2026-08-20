import { describe, expect, it } from "vitest";
import {
  createSbomProvenanceExecutionApprovalReview,
  defaultSbomProvenanceExecutionApprovalEvidenceRefs,
  defaultSbomProvenanceExecutionApprovalNoLivePosture,
  sbomProvenanceExecutionApprovalBlockedFlags,
  sbomProvenanceExecutionApprovalEvidenceKinds,
  sbomProvenanceExecutionApprovalReviewContract,
  signingExecutionApprovalReviewContract,
  type SbomProvenanceExecutionApprovalRequest,
} from "../src/index.js";

describe("SBOM provenance execution approval review", () => {
  it("emits BP-0261 source-only SBOM/provenance approval evidence", () => {
    const result = createSbomProvenanceExecutionApprovalReview();

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected SBOM/provenance approval success");
    }

    expect(result.sbom_provenance_execution_approval).toMatchObject({
      contract_id: sbomProvenanceExecutionApprovalReviewContract.contract_id,
      extends_contract_id: signingExecutionApprovalReviewContract.contract_id,
      identity: {
        packet_ref: "BP-0261",
        selected_after_packet_ref: "BP-0260",
        release_version: "0.1.0-source-plan",
        candidate_lane: "source_archive",
        gate_state: "sbom_provenance_execution_approval_not_approved",
        approval_state: "not_approved",
        sbom_provenance_execution_allowed: false,
      },
      approval_summary: {
        source_archive_state: "not_created",
        checksum_state: "planned_not_generated",
        signature_status: "planned_not_signed",
        sbom_status: "required_not_generated",
        sbom_index_state: "planned_not_written",
        provenance_status: "required_not_generated",
        provenance_index_state: "planned_not_written",
        attestation_state: "not_created",
        github_release_state: "not_created",
        current_allowed_output: "source_only_sbom_provenance_execution_approval_review",
      },
      generated_sboms: [],
      generated_provenance: [],
      created_attestations: [],
      calculated_artifact_digests: [],
      signatures: [],
      checksum_executions: [],
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
      result.sbom_provenance_execution_approval.evidence_refs.map(
        (ref) => ref.evidence_kind,
      ),
    ).toEqual([...sbomProvenanceExecutionApprovalEvidenceKinds]);
    expect(result.sbom_provenance_execution_approval.blocked_capabilities).toEqual([
      ...sbomProvenanceExecutionApprovalBlockedFlags,
    ]);
    expect(result.side_effects).toEqual([]);
  });

  it("fails closed when required explicit approval evidence is missing", () => {
    const result = createSbomProvenanceExecutionApprovalReview({
      evidence_refs: defaultSbomProvenanceExecutionApprovalEvidenceRefs.filter(
        (ref) => ref.evidence_kind !== "explicit_execution_approval_ref",
      ),
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected missing SBOM/provenance approval failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "sbom_provenance_execution_approval.ref_required",
        }),
      ]),
    );
    expect(result.raw_input_content).toBe("withheld");
  });

  it("fails closed on approval drift, execution scope, and side effects", () => {
    const result = createSbomProvenanceExecutionApprovalReview({
      identity: {
        packet_ref: "BP-0261",
        selected_after_packet_ref: "BP-0260",
        release_version: "0.1.0-source-plan",
        candidate_lane: "source_archive",
        gate_state: "sbom_provenance_execution_approval_not_approved",
        approval_state: "not_approved",
        sbom_provenance_execution_allowed: true,
      },
      evidence_refs: defaultSbomProvenanceExecutionApprovalEvidenceRefs.map((ref) =>
        ref.evidence_kind === "explicit_execution_approval_ref"
          ? { ...ref, approved: true, execution_allowed: true }
          : ref,
      ),
      no_live_posture: {
        ...defaultSbomProvenanceExecutionApprovalNoLivePosture,
        sbom_generation_allowed: true,
        attestation_creation_allowed: true,
      } as typeof defaultSbomProvenanceExecutionApprovalNoLivePosture,
      sbom_generation_allowed: true,
      side_effects: ["sbom generated"],
    } as unknown as SbomProvenanceExecutionApprovalRequest);

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected SBOM/provenance approval drift failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "sbom_provenance_execution_approval.identity_invalid",
        }),
        expect.objectContaining({
          code: "sbom_provenance_execution_approval.ref_invalid",
        }),
        expect.objectContaining({
          code: "sbom_provenance_execution_approval.no_live_posture_drift",
        }),
        expect.objectContaining({
          code: "sbom_provenance_execution_approval.blocked_capability_drift",
        }),
        expect.objectContaining({
          code: "sbom_provenance_execution_approval.side_effects_forbidden",
        }),
      ]),
    );
  });

  it("rejects unsafe refs and unexpected fields without echoing raw input", () => {
    const result = createSbomProvenanceExecutionApprovalReview({
      evidence_refs: defaultSbomProvenanceExecutionApprovalEvidenceRefs.map((ref) =>
        ref.evidence_kind === "sbom_tool_plan_ref"
          ? { ...ref, source_ref: "syft generate sbom with token" }
          : ref,
      ),
      unexpected_secret_value: true,
    } as unknown as SbomProvenanceExecutionApprovalRequest);

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected unsafe SBOM/provenance refs failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "sbom_provenance_execution_approval.ref_invalid",
        }),
        expect.objectContaining({
          code: "sbom_provenance_execution_approval.unexpected_field",
        }),
      ]),
    );
    expect(result.raw_input_content).toBe("withheld");
    expect(result.side_effects).toEqual([]);
  });
});
