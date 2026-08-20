import { describe, expect, it } from "vitest";
import {
  createReleaseExecutionApproval,
  defaultReleaseExecutionApprovalEvidenceRefs,
  defaultReleaseExecutionApprovalNoLivePosture,
  releaseExecutionApprovalBlockedFlags,
  releaseExecutionApprovalCandidateLane,
  releaseExecutionApprovalEvidenceKinds,
  releaseExecutionApprovalPacketContract,
  releaseExecutionPreflightMatrixContract,
  type ReleaseExecutionApprovalRequest,
} from "../src/index.js";

describe("release execution approval packet", () => {
  it("emits BP-0252 source-only release execution approval evidence", () => {
    const result = createReleaseExecutionApproval();

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected release execution approval success");
    }

    expect(result.release_execution_approval).toMatchObject({
      contract_id: releaseExecutionApprovalPacketContract.contract_id,
      extends_contract_id: releaseExecutionPreflightMatrixContract.contract_id,
      identity: {
        packet_ref: "BP-0252",
        selected_after_packet_ref: "BP-0251",
        release_version: "0.1.0-source-plan",
        candidate_lane: releaseExecutionApprovalCandidateLane,
        approval_state: "release_execution_approval_not_approved",
        implementation_allowed: false,
      },
      approval_summary: {
        source_archive_state: "candidate_not_approved",
        later_lanes_state: "blocked_require_separate_approval",
        github_release_state: "draft_boundary_only_not_created",
        download_pointer_state: "impact_review_only_not_mutated",
        current_allowed_output: "source_only_approval_packet",
      },
      source_tags_created: [],
      source_archives_created: [],
      binary_builds: [],
      package_builds: [],
      container_builds: [],
      package_publishes: [],
      registry_publishes: [],
      checksum_generations: [],
      signing_executions: [],
      sbom_generations: [],
      provenance_generations: [],
      github_release_creations: [],
      release_uploads: [],
      pointer_mutations: [],
      download_page_mutations: [],
      side_effects: [],
    });
    expect(
      result.release_execution_approval.evidence_refs.map((ref) => ref.evidence_kind),
    ).toEqual([...releaseExecutionApprovalEvidenceKinds]);
    expect(result.release_execution_approval.blocked_capabilities).toEqual([
      ...releaseExecutionApprovalBlockedFlags,
    ]);
    expect(result.side_effects).toEqual([]);
  });

  it("fails closed when required approval evidence is missing", () => {
    const result = createReleaseExecutionApproval({
      evidence_refs: defaultReleaseExecutionApprovalEvidenceRefs.filter(
        (ref) => ref.evidence_kind !== "checksum_plan",
      ),
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected missing approval evidence failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "release_execution_approval.evidence_required",
        }),
      ]),
    );
    expect(result.raw_input_content).toBe("withheld");
  });

  it("fails closed on approval drift, build/upload scope, and side effects", () => {
    const result = createReleaseExecutionApproval({
      identity: {
        packet_ref: "BP-0252",
        selected_after_packet_ref: "BP-0251",
        release_version: "0.1.0-source-plan",
        candidate_lane: "source_archive",
        approval_state: "release_execution_approval_not_approved",
        implementation_allowed: true,
      },
      evidence_refs: defaultReleaseExecutionApprovalEvidenceRefs.map((ref) =>
        ref.evidence_kind === "explicit_source_archive_approval"
          ? { ...ref, approved: true, ready: true, execution_allowed: true }
          : ref,
      ),
      no_live_posture: {
        ...defaultReleaseExecutionApprovalNoLivePosture,
        source_archive_creation_allowed: true,
        github_release_creation_allowed: true,
        release_upload_allowed: true,
      } as typeof defaultReleaseExecutionApprovalNoLivePosture,
      stable_latest_pointer_mutation_allowed: true,
      side_effects: ["release upload"],
    } as unknown as ReleaseExecutionApprovalRequest);

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected release approval drift failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "release_execution_approval.identity_invalid",
        }),
        expect.objectContaining({
          code: "release_execution_approval.evidence_invalid",
        }),
        expect.objectContaining({
          code: "release_execution_approval.no_live_posture_drift",
        }),
        expect.objectContaining({
          code: "release_execution_approval.blocked_capability_drift",
        }),
        expect.objectContaining({
          code: "release_execution_approval.side_effects_forbidden",
        }),
      ]),
    );
  });

  it("rejects unsafe refs and unexpected fields without echoing raw input", () => {
    const result = createReleaseExecutionApproval({
      evidence_refs: defaultReleaseExecutionApprovalEvidenceRefs.map((ref) =>
        ref.evidence_kind === "github_release_draft_boundary"
          ? { ...ref, source_ref: "gh release create token" }
          : ref,
      ),
      unexpected_secret_value: true,
    } as unknown as ReleaseExecutionApprovalRequest);

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected unsafe release approval refs failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "release_execution_approval.evidence_invalid",
        }),
        expect.objectContaining({
          code: "release_execution_approval.unexpected_field",
        }),
      ]),
    );
    expect(result.raw_input_content).toBe("withheld");
    expect(result.side_effects).toEqual([]);
  });
});
