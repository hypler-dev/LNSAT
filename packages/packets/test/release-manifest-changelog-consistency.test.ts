import { describe, expect, it } from "vitest";
import {
  createReleaseConsistency,
  defaultReleaseConsistencyEvidenceRefs,
  defaultReleaseConsistencyNoLivePosture,
  releaseManifestChangelogConsistencyBlockedFlags,
  releaseManifestChangelogConsistencyContract,
  releaseManifestChangelogConsistencyEvidenceKinds,
  releaseNotesChangelogReadinessContract,
  type ReleaseConsistencyRequest,
} from "../src/index.js";

describe("release manifest changelog consistency gate", () => {
  it("emits BP-0255 source-only release consistency evidence", () => {
    const result = createReleaseConsistency();

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected release consistency success");
    }

    expect(result.release_consistency).toMatchObject({
      contract_id: releaseManifestChangelogConsistencyContract.contract_id,
      extends_contract_id: releaseNotesChangelogReadinessContract.contract_id,
      identity: {
        packet_ref: "BP-0255",
        selected_after_packet_ref: "BP-0254",
        release_version: "0.1.0-source-plan",
        gate_state: "release_manifest_changelog_consistency_not_approved",
        approval_state: "release_execution_approval_not_approved",
        publication_allowed: false,
      },
      consistency_summary: {
        manifest_ref: "fixtures/release/source-plan.json",
        changelog_ref: "CHANGELOG.md",
        release_notes_ref: "CHANGELOG.md",
        download_page_ref: "apps/console/src/app/page.tsx",
        current_allowed_output: "source_only_consistency_packet",
      },
      source_tags_created: [],
      source_archives_created: [],
      checksum_generations: [],
      signing_executions: [],
      sbom_generations: [],
      provenance_generations: [],
      github_release_creations: [],
      release_notes_publications: [],
      release_uploads: [],
      pointer_mutations: [],
      download_page_mutations: [],
      side_effects: [],
    });
    expect(
      result.release_consistency.evidence_refs.map((ref) => ref.evidence_kind),
    ).toEqual([...releaseManifestChangelogConsistencyEvidenceKinds]);
    expect(result.release_consistency.blocked_capabilities).toEqual([
      ...releaseManifestChangelogConsistencyBlockedFlags,
    ]);
    expect(result.side_effects).toEqual([]);
  });

  it("fails closed when required consistency evidence is missing", () => {
    const result = createReleaseConsistency({
      evidence_refs: defaultReleaseConsistencyEvidenceRefs.filter(
        (ref) => ref.evidence_kind !== "blocked_scope_match",
      ),
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected missing consistency evidence failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "release_consistency.evidence_required" }),
      ]),
    );
    expect(result.raw_input_content).toBe("withheld");
  });

  it("fails closed on approval drift, mutation scope, and side effects", () => {
    const result = createReleaseConsistency({
      identity: {
        packet_ref: "BP-0255",
        selected_after_packet_ref: "BP-0254",
        release_version: "0.1.0-source-plan",
        gate_state: "release_manifest_changelog_consistency_not_approved",
        approval_state: "release_execution_approval_not_approved",
        publication_allowed: true,
      },
      evidence_refs: defaultReleaseConsistencyEvidenceRefs.map((ref) =>
        ref.evidence_kind === "side_effects_match"
          ? { ...ref, consistent: true, approved: true, mutation_allowed: true }
          : ref,
      ),
      no_live_posture: {
        ...defaultReleaseConsistencyNoLivePosture,
        github_release_creation_allowed: true,
        stable_latest_pointer_mutation_allowed: true,
      } as typeof defaultReleaseConsistencyNoLivePosture,
      release_upload_allowed: true,
      side_effects: ["latest pointer changed"],
    } as unknown as ReleaseConsistencyRequest);

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected release consistency drift failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "release_consistency.identity_invalid" }),
        expect.objectContaining({ code: "release_consistency.evidence_invalid" }),
        expect.objectContaining({
          code: "release_consistency.no_live_posture_drift",
        }),
        expect.objectContaining({
          code: "release_consistency.blocked_capability_drift",
        }),
        expect.objectContaining({
          code: "release_consistency.side_effects_forbidden",
        }),
      ]),
    );
  });

  it("rejects unsafe refs and unexpected fields without echoing raw input", () => {
    const result = createReleaseConsistency({
      evidence_refs: defaultReleaseConsistencyEvidenceRefs.map((ref) =>
        ref.evidence_kind === "release_version_match"
          ? { ...ref, source_ref: "git push token" }
          : ref,
      ),
      unexpected_secret_value: true,
    } as unknown as ReleaseConsistencyRequest);

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected unsafe release consistency refs failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "release_consistency.evidence_invalid" }),
        expect.objectContaining({ code: "release_consistency.unexpected_field" }),
      ]),
    );
    expect(result.raw_input_content).toBe("withheld");
    expect(result.side_effects).toEqual([]);
  });
});
