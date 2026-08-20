import { describe, expect, it } from "vitest";
import {
  createReleaseExecutionPreflight,
  defaultReleaseExecutionPreflightGateRefs,
  defaultReleaseExecutionPreflightLanes,
  defaultReleaseExecutionPreflightNoLivePosture,
  releaseExecutionPreflightBlockedFlags,
  releaseExecutionPreflightGateKinds,
  releaseExecutionPreflightLanes,
  releaseExecutionPreflightMatrixContract,
  type ReleaseExecutionPreflightRequest,
} from "../src/index.js";

describe("release execution preflight matrix", () => {
  it("emits BP-0248 source-only release execution preflight evidence", () => {
    const result = createReleaseExecutionPreflight();

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected release execution preflight success");
    }

    expect(result.release_execution_preflight).toMatchObject({
      contract_id: releaseExecutionPreflightMatrixContract.contract_id,
      identity: {
        packet_ref: "BP-0248",
        selected_after_packet_ref: "BP-0247",
        release_version: "0.1.0-source-plan",
        execution_state: "release_execution_not_ready_source_only",
        artifacts_downloadable: false,
        implementation_allowed: false,
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
    expect(result.release_execution_preflight.lanes.map((lane) => lane.lane)).toEqual([
      ...releaseExecutionPreflightLanes,
    ]);
    expect(
      result.release_execution_preflight.gate_refs.filter(
        (ref) => ref.lane === "canonical_linux_x64_bundle",
      ).length,
    ).toBe(releaseExecutionPreflightGateKinds.length);
    expect(result.release_execution_preflight.blocked_capabilities).toEqual([
      ...releaseExecutionPreflightBlockedFlags,
    ]);
    expect(result.side_effects).toEqual([]);
  });

  it("fails closed when a release lane or gate ref is missing", () => {
    const result = createReleaseExecutionPreflight({
      lanes: defaultReleaseExecutionPreflightLanes.filter(
        (lane) => lane.lane !== "homebrew_tap",
      ),
      gate_refs: defaultReleaseExecutionPreflightGateRefs.filter(
        (ref) =>
          !(
            ref.lane === "canonical_linux_x64_bundle" &&
            ref.gate_kind === "checksum_ref"
          ),
      ),
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected missing lane/gate failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "release_execution_preflight.lane_required" }),
        expect.objectContaining({
          code: "release_execution_preflight.gate_ref_required",
        }),
      ]),
    );
    expect(result.raw_input_content).toBe("withheld");
  });

  it("fails closed on downloadable artifacts, build/upload scope, and side effects", () => {
    const result = createReleaseExecutionPreflight({
      identity: {
        packet_ref: "BP-0248",
        selected_after_packet_ref: "BP-0247",
        release_version: "0.1.0-source-plan",
        execution_state: "release_execution_not_ready_source_only",
        artifacts_downloadable: true,
        implementation_allowed: false,
      },
      lanes: defaultReleaseExecutionPreflightLanes.map((lane) =>
        lane.lane === "canonical_macos_arm64_bundle"
          ? { ...lane, build_allowed: true }
          : lane,
      ),
      gate_refs: defaultReleaseExecutionPreflightGateRefs.map((ref) =>
        ref.lane === "source_archive" && ref.gate_kind === "source_ref"
          ? { ...ref, ready: true }
          : ref,
      ),
      no_live_posture: {
        ...defaultReleaseExecutionPreflightNoLivePosture,
        binary_build_allowed: true,
        release_upload_allowed: true,
      } as typeof defaultReleaseExecutionPreflightNoLivePosture,
      github_release_creation_allowed: true,
      side_effects: ["release upload"],
    } as unknown as ReleaseExecutionPreflightRequest);

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected release execution drift failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "release_execution_preflight.identity_invalid",
        }),
        expect.objectContaining({ code: "release_execution_preflight.lane_invalid" }),
        expect.objectContaining({
          code: "release_execution_preflight.gate_ref_invalid",
        }),
        expect.objectContaining({
          code: "release_execution_preflight.no_live_posture_drift",
        }),
        expect.objectContaining({
          code: "release_execution_preflight.blocked_capability_drift",
        }),
        expect.objectContaining({
          code: "release_execution_preflight.side_effects_forbidden",
        }),
      ]),
    );
  });

  it("rejects unsafe command refs and unexpected fields without echoing raw input", () => {
    const result = createReleaseExecutionPreflight({
      gate_refs: defaultReleaseExecutionPreflightGateRefs.map((ref) =>
        ref.lane === "oci_amd64" && ref.gate_kind === "build_recipe_ref"
          ? { ...ref, source_ref: "docker build && docker push" }
          : ref,
      ),
      unexpected_secret_value: true,
    } as unknown as ReleaseExecutionPreflightRequest);

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected unsafe command ref failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "release_execution_preflight.gate_ref_invalid",
        }),
        expect.objectContaining({
          code: "release_execution_preflight.unexpected_field",
        }),
      ]),
    );
    expect(result.raw_input_content).toBe("withheld");
    expect(result.side_effects).toEqual([]);
  });
});
