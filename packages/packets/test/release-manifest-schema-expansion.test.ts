import { describe, expect, it } from "vitest";
import {
  createReleaseManifestSchemaExpansion,
  defaultReleaseManifestArtifactMatrixSchemaRefs,
  defaultReleaseManifestNoLivePosture,
  defaultReleaseManifestSchemaNoLivePosture,
  defaultReleaseManifestSchemaSectionRefs,
  defaultReleaseManifestSchemaSourceRefs,
  defaultReleaseManifestTrustIndexSchemaRefs,
  releaseManifestBlockedReleaseAutomationFlags,
  releaseManifestContract,
  releaseManifestPromotionStates,
  releaseManifestSchemaExpansionContract,
  releaseManifestV02ArtifactFamilies,
  releaseManifestV02Sections,
  type ReleaseManifestSchemaExpansionRequest,
} from "../src/index.js";

describe("release manifest schema expansion", () => {
  it("emits BP-0230 source-only manifest v0.2 schema expansion evidence", () => {
    const result = createReleaseManifestSchemaExpansion();

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected release manifest schema expansion success");
    }

    expect(result.release_manifest_schema_expansion).toMatchObject({
      contract_id: releaseManifestSchemaExpansionContract.contract_id,
      extends_contract_id: releaseManifestContract.contract_id,
      manifest_version_target: "0.2",
      schema_identity: {
        schema_ref: "release-manifest-schema:v0.2-source-only",
        packet_ref: "BP-0230",
        selected_after_packet_ref: "BP-0224",
        implementation_allowed: false,
      },
      release_artifacts: [],
      binary_artifacts: [],
      published_packages: [],
      generated_checksums: [],
      generated_sboms: [],
      generated_provenance: [],
      signatures: [],
      github_releases: [],
      registry_publications: [],
      dns_cloudflare_mutations: [],
      runtime_invocations: [],
      side_effects: [],
    });
    expect(
      result.release_manifest_schema_expansion.section_refs.map((ref) => ref.section),
    ).toEqual([...releaseManifestV02Sections]);
    expect(
      result.release_manifest_schema_expansion.artifact_matrix_schema_refs.map(
        (ref) => ref.artifact_family,
      ),
    ).toEqual([...releaseManifestV02ArtifactFamilies]);
    expect(
      result.release_manifest_schema_expansion.trust_index_schema_refs.map(
        (ref) => ref.artifact_family,
      ),
    ).toEqual([...releaseManifestV02ArtifactFamilies]);
    expect(
      result.release_manifest_schema_expansion.promotion_gate_schema_refs.map(
        (ref) => ref.state,
      ),
    ).toEqual([...releaseManifestPromotionStates]);
    expect(result.release_manifest_schema_expansion.blocked_capabilities).toEqual([
      ...releaseManifestBlockedReleaseAutomationFlags,
    ]);
    expect(result.side_effects).toEqual([]);
  });

  it("fails closed when required schema sections, artifact families, trust indexes, promotion states, or source refs are missing", () => {
    const result = createReleaseManifestSchemaExpansion({
      section_refs: defaultReleaseManifestSchemaSectionRefs.filter(
        (ref) => ref.section !== "provenance_index",
      ),
      artifact_matrix_schema_refs:
        defaultReleaseManifestArtifactMatrixSchemaRefs.filter(
          (ref) => ref.artifact_family !== "windows_package",
        ),
      trust_index_schema_refs: defaultReleaseManifestTrustIndexSchemaRefs.filter(
        (ref) => ref.artifact_family !== "container_image",
      ),
      promotion_gate_schema_refs: [
        {
          state: "source_only_planned",
          allowed_without_artifacts: true,
          approval_ref_required_for_stable: false,
          revocation_ref_required: false,
        },
      ],
      source_refs: defaultReleaseManifestSchemaSourceRefs.filter(
        (ref) =>
          ref.source_ref !== "docs/architecture/RELEASE_TRUST_AUTOMATION_PLAN.md",
      ),
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected missing schema evidence failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "release_manifest_schema.section_ref_required",
        }),
        expect.objectContaining({
          code: "release_manifest_schema.artifact_matrix_required",
        }),
        expect.objectContaining({
          code: "release_manifest_schema.trust_index_required",
        }),
        expect.objectContaining({
          code: "release_manifest_schema.promotion_gate_required",
        }),
        expect.objectContaining({
          code: "release_manifest_schema.source_ref_required",
        }),
      ]),
    );
    expect(result.raw_input_content).toBe("withheld");
  });

  it("fails closed on artifact creation, generation execution, stable approval drift, and live release scope", () => {
    const result = createReleaseManifestSchemaExpansion({
      artifact_matrix_schema_refs: defaultReleaseManifestArtifactMatrixSchemaRefs.map(
        (ref) =>
          ref.artifact_family === "server_installer"
            ? { ...ref, artifact_creation_allowed: true }
            : ref,
      ),
      trust_index_schema_refs: defaultReleaseManifestTrustIndexSchemaRefs.map((ref) =>
        ref.artifact_family === "server_installer"
          ? {
              ...ref,
              generation_execution_allowed: true,
              checksum_required: false,
            }
          : ref,
      ),
      promotion_gate_schema_refs: releaseManifestPromotionStates.map((state) => ({
        state,
        allowed_without_artifacts: state === "source_only_planned",
        approval_ref_required_for_stable: false,
        revocation_ref_required: false,
      })),
      no_live_posture: {
        ...defaultReleaseManifestSchemaNoLivePosture,
        github_release_creation_allowed: true,
        signing_execution_allowed: true,
      } as typeof defaultReleaseManifestSchemaNoLivePosture,
      release_upload_allowed: true,
      side_effects: ["create GitHub Release"],
    } as unknown as ReleaseManifestSchemaExpansionRequest);

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected schema blocked scope failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "release_manifest_schema.artifact_matrix_invalid",
        }),
        expect.objectContaining({
          code: "release_manifest_schema.trust_index_invalid",
        }),
        expect.objectContaining({
          code: "release_manifest_schema.promotion_gate_invalid",
        }),
        expect.objectContaining({
          code: "release_manifest_schema.no_live_posture_drift",
        }),
        expect.objectContaining({
          code: "release_manifest_schema.blocked_capability_drift",
        }),
        expect.objectContaining({
          code: "release_manifest_schema.side_effects_forbidden",
        }),
      ]),
    );
  });

  it("rejects unsafe refs and unexpected fields without echoing raw input", () => {
    const result = createReleaseManifestSchemaExpansion({
      section_refs: defaultReleaseManifestSchemaSectionRefs.map((ref) =>
        ref.section === "signature_index"
          ? { ...ref, source_ref: "run cosign sign with private key" }
          : ref,
      ),
      source_refs: [
        ...defaultReleaseManifestSchemaSourceRefs,
        {
          source_ref: "docs/reference/CONTRACT_PROVENANCE.md",
          summary: "create GitHub release with secret token",
        },
      ],
      unexpected_release_upload: true,
    } as unknown as ReleaseManifestSchemaExpansionRequest);

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected unsafe schema failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "release_manifest_schema.section_ref_invalid",
        }),
        expect.objectContaining({
          code: "release_manifest_schema.source_ref_invalid",
        }),
        expect.objectContaining({
          code: "release_manifest_schema.unexpected_field",
        }),
      ]),
    );
    expect(result.raw_input_content).toBe("withheld");
    expect(result.side_effects).toEqual([]);
  });

  it("keeps BP-0219 no-live posture available for existing release manifest contract", () => {
    expect(defaultReleaseManifestNoLivePosture.binary_build_allowed).toBe(false);
  });
});
