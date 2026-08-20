import { describe, expect, it } from "vitest";
import {
  createReleaseGithubWorkflow,
  defaultReleaseGithubWorkflowAssetRefs,
  defaultReleaseGithubWorkflowNoLivePosture,
  defaultReleaseGithubWorkflowStepRefs,
  releaseGithubWorkflowAssetFamilies,
  releaseGithubWorkflowBlockedFlags,
  releaseGithubWorkflowContract,
  releaseGithubWorkflowRequiredSteps,
  releaseSbomProvenanceDryRunContract,
  type ReleaseGithubWorkflowRequest,
} from "../src/index.js";

describe("release GitHub workflow contract", () => {
  it("emits BP-0234 draft source-only GitHub Release workflow evidence", () => {
    const result = createReleaseGithubWorkflow();

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected GitHub Release workflow success");
    }

    expect(result.release_github_workflow).toMatchObject({
      contract_id: releaseGithubWorkflowContract.contract_id,
      extends_contract_id: releaseSbomProvenanceDryRunContract.contract_id,
      identity: {
        packet_ref: "BP-0234",
        selected_after_packet_ref: "BP-0233",
        manifest_ref: "fixtures/release/source-plan.json",
        workflow_mode: "draft_source_only",
        implementation_allowed: false,
      },
      workflow_summary: {
        release_version: "0.1.0-source-plan",
        github_repo: "https://github.com/hypler-dev/LNSAT",
        release_mode: "draft_planned_not_created",
        tag_status: "planned_not_created",
        release_notes_status: "planned_not_published",
        latest_pointer_status: "planned_not_promoted",
        approval_required_before_creation: true,
      },
      github_releases: [],
      release_uploads: [],
      uploaded_assets: [],
      created_tags: [],
      created_artifacts: [],
      github_api_mutations: [],
      git_pushes: [],
      generated_checksums: [],
      generated_sboms: [],
      generated_provenance: [],
      signatures: [],
      registry_publications: [],
      dns_cloudflare_mutations: [],
      side_effects: [],
    });
    expect(result.release_github_workflow.step_refs.map((ref) => ref.step)).toEqual([
      ...releaseGithubWorkflowRequiredSteps,
    ]);
    expect(
      result.release_github_workflow.asset_refs.map((ref) => ref.asset_family),
    ).toEqual([...releaseGithubWorkflowAssetFamilies]);
    expect(result.release_github_workflow.blocked_capabilities).toEqual([
      ...releaseGithubWorkflowBlockedFlags,
    ]);
    expect(result.side_effects).toEqual([]);
  });

  it("fails closed when required release workflow steps or asset refs are missing", () => {
    const result = createReleaseGithubWorkflow({
      step_refs: defaultReleaseGithubWorkflowStepRefs.filter(
        (ref) => ref.step !== "approval_gate_review",
      ),
      asset_refs: defaultReleaseGithubWorkflowAssetRefs.filter(
        (ref) => ref.asset_family !== "windows_package",
      ),
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected missing workflow refs failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "release_github_workflow.step_ref_required",
        }),
        expect.objectContaining({
          code: "release_github_workflow.asset_ref_required",
        }),
      ]),
    );
    expect(result.raw_input_content).toBe("withheld");
  });

  it("fails closed on release creation, upload, tag creation, publish, Git push, and side effects", () => {
    const result = createReleaseGithubWorkflow({
      workflow_summary: {
        release_version: "0.1.0-source-plan",
        github_repo: "https://github.com/hypler-dev/LNSAT",
        release_mode: "draft_planned_not_created",
        tag_status: "planned_not_created",
        release_notes_status: "planned_not_published",
        latest_pointer_status: "planned_not_promoted",
        approval_required_before_creation: false,
      },
      step_refs: defaultReleaseGithubWorkflowStepRefs.map((ref) =>
        ref.step === "draft_release_notes_review"
          ? { ...ref, execution_allowed: true }
          : ref,
      ),
      asset_refs: defaultReleaseGithubWorkflowAssetRefs.map((ref) =>
        ref.asset_family === "server_installer"
          ? { ...ref, upload_allowed: true, publish_allowed: true }
          : ref,
      ),
      no_live_posture: {
        ...defaultReleaseGithubWorkflowNoLivePosture,
        github_release_creation_allowed: true,
        release_upload_allowed: true,
        git_push_allowed: true,
      } as typeof defaultReleaseGithubWorkflowNoLivePosture,
      asset_upload_allowed: true,
      side_effects: ["create GitHub Release"],
    } as unknown as ReleaseGithubWorkflowRequest);

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected blocked GitHub workflow failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "release_github_workflow.summary_invalid" }),
        expect.objectContaining({ code: "release_github_workflow.step_ref_invalid" }),
        expect.objectContaining({ code: "release_github_workflow.asset_ref_invalid" }),
        expect.objectContaining({
          code: "release_github_workflow.no_live_posture_drift",
        }),
        expect.objectContaining({
          code: "release_github_workflow.blocked_capability_drift",
        }),
        expect.objectContaining({
          code: "release_github_workflow.side_effects_forbidden",
        }),
      ]),
    );
  });

  it("rejects unsafe refs and unexpected fields without echoing raw input", () => {
    const result = createReleaseGithubWorkflow({
      step_refs: defaultReleaseGithubWorkflowStepRefs.map((ref) =>
        ref.step === "draft_release_notes_review"
          ? { ...ref, source_ref: "gh release create with secret token" }
          : ref,
      ),
      unexpected_upload_secret: true,
    } as unknown as ReleaseGithubWorkflowRequest);

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected unsafe GitHub workflow refs failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "release_github_workflow.step_ref_invalid" }),
        expect.objectContaining({
          code: "release_github_workflow.unexpected_field",
        }),
      ]),
    );
    expect(result.raw_input_content).toBe("withheld");
    expect(result.side_effects).toEqual([]);
  });
});
