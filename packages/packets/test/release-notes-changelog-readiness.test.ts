import { describe, expect, it } from "vitest";
import {
  createReleaseNotesReadiness,
  defaultReleaseNotesReadinessEvidenceRefs,
  defaultReleaseNotesReadinessNoLivePosture,
  releaseNotesChangelogReadinessBlockedFlags,
  releaseNotesChangelogReadinessContract,
  releaseNotesChangelogReadinessEvidenceKinds,
  sourceArchiveExecutionReadinessContract,
  type ReleaseNotesReadinessRequest,
} from "../src/index.js";

describe("release notes changelog readiness", () => {
  it("emits BP-0254 source-only release notes readiness evidence", () => {
    const result = createReleaseNotesReadiness();

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected release notes readiness success");
    }

    expect(result.release_notes_readiness).toMatchObject({
      contract_id: releaseNotesChangelogReadinessContract.contract_id,
      extends_contract_id: sourceArchiveExecutionReadinessContract.contract_id,
      identity: {
        packet_ref: "BP-0254",
        selected_after_packet_ref: "BP-0253",
        release_version: "0.1.0-source-plan",
        notes_state: "release_notes_publication_not_ready",
        changelog_state: "draft_source_only",
        publication_allowed: false,
      },
      readiness_summary: {
        changelog_ref: "CHANGELOG.md",
        release_notes_ref: "CHANGELOG.md",
        github_release_state: "not_created",
        support_state: "source_plan_no_support_window",
        current_allowed_output: "source_only_release_notes_packet",
      },
      github_release_creations: [],
      release_notes_publications: [],
      source_tags_created: [],
      source_archives_created: [],
      checksum_generations: [],
      signing_executions: [],
      sbom_generations: [],
      provenance_generations: [],
      release_uploads: [],
      pointer_mutations: [],
      download_page_mutations: [],
      side_effects: [],
    });
    expect(
      result.release_notes_readiness.evidence_refs.map((ref) => ref.evidence_kind),
    ).toEqual([...releaseNotesChangelogReadinessEvidenceKinds]);
    expect(result.release_notes_readiness.blocked_capabilities).toEqual([
      ...releaseNotesChangelogReadinessBlockedFlags,
    ]);
    expect(result.side_effects).toEqual([]);
  });

  it("fails closed when required release notes evidence is missing", () => {
    const result = createReleaseNotesReadiness({
      evidence_refs: defaultReleaseNotesReadinessEvidenceRefs.filter(
        (ref) => ref.evidence_kind !== "release_notes_ref",
      ),
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected missing release notes evidence failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "release_notes_readiness.evidence_required",
        }),
      ]),
    );
    expect(result.raw_input_content).toBe("withheld");
  });

  it("fails closed on publication drift and side effects", () => {
    const result = createReleaseNotesReadiness({
      identity: {
        packet_ref: "BP-0254",
        selected_after_packet_ref: "BP-0253",
        release_version: "0.1.0-source-plan",
        notes_state: "release_notes_publication_not_ready",
        changelog_state: "draft_source_only",
        publication_allowed: true,
      },
      evidence_refs: defaultReleaseNotesReadinessEvidenceRefs.map((ref) =>
        ref.evidence_kind === "approval_ref"
          ? { ...ref, approved: true, ready: true, publication_allowed: true }
          : ref,
      ),
      no_live_posture: {
        ...defaultReleaseNotesReadinessNoLivePosture,
        github_release_creation_allowed: true,
        release_notes_publication_allowed: true,
      } as typeof defaultReleaseNotesReadinessNoLivePosture,
      source_tag_creation_allowed: true,
      side_effects: ["release notes published"],
    } as unknown as ReleaseNotesReadinessRequest);

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected release notes drift failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "release_notes_readiness.identity_invalid",
        }),
        expect.objectContaining({
          code: "release_notes_readiness.evidence_invalid",
        }),
        expect.objectContaining({
          code: "release_notes_readiness.no_live_posture_drift",
        }),
        expect.objectContaining({
          code: "release_notes_readiness.blocked_capability_drift",
        }),
        expect.objectContaining({
          code: "release_notes_readiness.side_effects_forbidden",
        }),
      ]),
    );
  });

  it("rejects unsafe refs and unexpected fields without echoing raw input", () => {
    const result = createReleaseNotesReadiness({
      evidence_refs: defaultReleaseNotesReadinessEvidenceRefs.map((ref) =>
        ref.evidence_kind === "release_notes_ref"
          ? { ...ref, source_ref: "gh release create token" }
          : ref,
      ),
      unexpected_secret_value: true,
    } as unknown as ReleaseNotesReadinessRequest);

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected unsafe release notes refs failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "release_notes_readiness.evidence_invalid",
        }),
        expect.objectContaining({
          code: "release_notes_readiness.unexpected_field",
        }),
      ]),
    );
    expect(result.raw_input_content).toBe("withheld");
    expect(result.side_effects).toEqual([]);
  });
});
