import { describe, expect, it } from "vitest";
import {
  createSourceArchiveReadiness,
  defaultSourceArchiveReadinessEvidenceRefs,
  defaultSourceArchiveReadinessNoLivePosture,
  releaseExecutionApprovalPacketContract,
  sourceArchiveExecutionReadinessBlockedFlags,
  sourceArchiveExecutionReadinessContract,
  sourceArchiveExecutionReadinessEvidenceKinds,
  type SourceArchiveReadinessRequest,
} from "../src/index.js";

describe("source archive execution readiness", () => {
  it("emits BP-0253 source-only source archive readiness evidence", () => {
    const result = createSourceArchiveReadiness();

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected source archive readiness success");
    }

    expect(result.source_archive_readiness).toMatchObject({
      contract_id: sourceArchiveExecutionReadinessContract.contract_id,
      extends_contract_id: releaseExecutionApprovalPacketContract.contract_id,
      identity: {
        packet_ref: "BP-0253",
        selected_after_packet_ref: "BP-0252",
        release_version: "0.1.0-source-plan",
        candidate_lane: "source_archive",
        readiness_state: "source_archive_execution_readiness_not_ready",
        approval_state: "release_execution_approval_not_approved",
        execution_allowed: false,
      },
      readiness_summary: {
        source_revision_state: "candidate_ref_required",
        archive_state: "not_created",
        checksum_state: "planned_not_generated",
        github_release_state: "draft_boundary_only_not_created",
        pointer_state: "not_mutated",
        current_allowed_output: "source_only_readiness_packet",
      },
      source_tags_created: [],
      source_archives_created: [],
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
      result.source_archive_readiness.evidence_refs.map((ref) => ref.evidence_kind),
    ).toEqual([...sourceArchiveExecutionReadinessEvidenceKinds]);
    expect(result.source_archive_readiness.blocked_capabilities).toEqual([
      ...sourceArchiveExecutionReadinessBlockedFlags,
    ]);
    expect(result.side_effects).toEqual([]);
  });

  it("fails closed when required readiness evidence is missing", () => {
    const result = createSourceArchiveReadiness({
      evidence_refs: defaultSourceArchiveReadinessEvidenceRefs.filter(
        (ref) => ref.evidence_kind !== "archive_contents_policy",
      ),
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected missing readiness evidence failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "source_archive_readiness.evidence_required",
        }),
      ]),
    );
    expect(result.raw_input_content).toBe("withheld");
  });

  it("fails closed on readiness drift, execution scope, and side effects", () => {
    const result = createSourceArchiveReadiness({
      identity: {
        packet_ref: "BP-0253",
        selected_after_packet_ref: "BP-0252",
        release_version: "0.1.0-source-plan",
        candidate_lane: "source_archive",
        readiness_state: "source_archive_execution_readiness_not_ready",
        approval_state: "release_execution_approval_not_approved",
        execution_allowed: true,
      },
      evidence_refs: defaultSourceArchiveReadinessEvidenceRefs.map((ref) =>
        ref.evidence_kind === "approval_gate_ref"
          ? { ...ref, approved: true, ready: true, execution_allowed: true }
          : ref,
      ),
      no_live_posture: {
        ...defaultSourceArchiveReadinessNoLivePosture,
        source_tag_creation_allowed: true,
        checksum_generation_allowed: true,
      } as typeof defaultSourceArchiveReadinessNoLivePosture,
      github_release_creation_allowed: true,
      side_effects: ["tag create"],
    } as unknown as SourceArchiveReadinessRequest);

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected source archive readiness drift failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "source_archive_readiness.identity_invalid",
        }),
        expect.objectContaining({
          code: "source_archive_readiness.evidence_invalid",
        }),
        expect.objectContaining({
          code: "source_archive_readiness.no_live_posture_drift",
        }),
        expect.objectContaining({
          code: "source_archive_readiness.blocked_capability_drift",
        }),
        expect.objectContaining({
          code: "source_archive_readiness.side_effects_forbidden",
        }),
      ]),
    );
  });

  it("rejects unsafe refs and unexpected fields without echoing raw input", () => {
    const result = createSourceArchiveReadiness({
      evidence_refs: defaultSourceArchiveReadinessEvidenceRefs.map((ref) =>
        ref.evidence_kind === "source_revision_ref"
          ? { ...ref, source_ref: "git tag v0.1.0 token" }
          : ref,
      ),
      unexpected_secret_value: true,
    } as unknown as SourceArchiveReadinessRequest);

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected unsafe source archive readiness refs failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "source_archive_readiness.evidence_invalid",
        }),
        expect.objectContaining({
          code: "source_archive_readiness.unexpected_field",
        }),
      ]),
    );
    expect(result.raw_input_content).toBe("withheld");
    expect(result.side_effects).toEqual([]);
  });
});
