import { describe, expect, it } from "vitest";
import {
  createReleaseSbomProvenanceDryRun,
  defaultReleaseSbomProvenanceDryRunNoLivePosture,
  defaultReleaseSbomProvenanceDryRunRefs,
  releaseChecksumSourceVerificationContract,
  releaseSbomProvenanceDryRunBlockedFlags,
  releaseSbomProvenanceDryRunContract,
  releaseSbomProvenanceDryRunRequiredRefs,
  type ReleaseSbomProvenanceDryRunRequest,
} from "../src/index.js";

describe("release SBOM provenance dry run", () => {
  it("emits BP-0233 source-only SBOM and provenance dry-run evidence", () => {
    const result = createReleaseSbomProvenanceDryRun();

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected SBOM/provenance dry-run success");
    }

    expect(result.release_sbom_provenance_dry_run).toMatchObject({
      contract_id: releaseSbomProvenanceDryRunContract.contract_id,
      extends_contract_id: releaseChecksumSourceVerificationContract.contract_id,
      identity: {
        packet_ref: "BP-0233",
        selected_after_packet_ref: "BP-0232",
        manifest_ref: "fixtures/release/source-plan.json",
        dry_run_mode: "static_source_only",
        implementation_allowed: false,
      },
      dry_run_summary: {
        manifest_version: "0.1",
        release_version: "0.1.0-source-plan",
        sbom_status: "required_not_generated",
        sbom_formats: ["CycloneDX", "SPDX"],
        provenance_status: "required_not_generated",
        provenance_standard: "SLSA-aligned",
        attestation_created: false,
        network_required: false,
      },
      generated_sboms: [],
      generated_provenance: [],
      created_attestations: [],
      calculated_artifact_digests: [],
      uploaded_artifacts: [],
      github_releases: [],
      release_uploads: [],
      network_fetches: [],
      external_service_calls: [],
      signatures: [],
      registry_publications: [],
      dns_cloudflare_mutations: [],
      side_effects: [],
    });
    expect(
      result.release_sbom_provenance_dry_run.dry_run_refs.map((ref) => ref.ref_kind),
    ).toEqual([...releaseSbomProvenanceDryRunRequiredRefs]);
    expect(result.release_sbom_provenance_dry_run.blocked_capabilities).toEqual([
      ...releaseSbomProvenanceDryRunBlockedFlags,
    ]);
    expect(result.side_effects).toEqual([]);
  });

  it("fails closed when required SBOM or provenance refs are missing", () => {
    const result = createReleaseSbomProvenanceDryRun({
      dry_run_refs: defaultReleaseSbomProvenanceDryRunRefs.filter(
        (ref) => ref.ref_kind !== "provenance_builder_plan",
      ),
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected missing SBOM/provenance refs failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "release_sbom_provenance.ref_required" }),
      ]),
    );
    expect(result.raw_input_content).toBe("withheld");
  });

  it("fails closed on SBOM generation, provenance generation, attestation, upload, network, and side effects", () => {
    const result = createReleaseSbomProvenanceDryRun({
      dry_run_summary: {
        manifest_version: "0.1",
        release_version: "0.1.0-source-plan",
        sbom_status: "required_not_generated",
        sbom_formats: ["CycloneDX", "SPDX"],
        provenance_status: "required_not_generated",
        provenance_standard: "SLSA-aligned",
        attestation_created: true,
        network_required: false,
      },
      dry_run_refs: defaultReleaseSbomProvenanceDryRunRefs.map((ref) =>
        ref.ref_kind === "sbom_tool_plan" ? { ...ref, generation_allowed: true } : ref,
      ),
      no_live_posture: {
        ...defaultReleaseSbomProvenanceDryRunNoLivePosture,
        sbom_generation_execution_allowed: true,
        provenance_generation_execution_allowed: true,
        network_fetch_allowed: true,
      } as typeof defaultReleaseSbomProvenanceDryRunNoLivePosture,
      artifact_upload_allowed: true,
      side_effects: ["generate sbom"],
    } as unknown as ReleaseSbomProvenanceDryRunRequest);

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected blocked SBOM/provenance dry-run failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "release_sbom_provenance.summary_invalid" }),
        expect.objectContaining({ code: "release_sbom_provenance.ref_invalid" }),
        expect.objectContaining({
          code: "release_sbom_provenance.no_live_posture_drift",
        }),
        expect.objectContaining({
          code: "release_sbom_provenance.blocked_capability_drift",
        }),
        expect.objectContaining({
          code: "release_sbom_provenance.side_effects_forbidden",
        }),
      ]),
    );
  });

  it("rejects unsafe refs and unexpected fields without echoing raw input", () => {
    const result = createReleaseSbomProvenanceDryRun({
      dry_run_refs: defaultReleaseSbomProvenanceDryRunRefs.map((ref) =>
        ref.ref_kind === "sbom_tool_plan"
          ? { ...ref, source_ref: "run syft and upload release artifact" }
          : ref,
      ),
      unexpected_attestation_secret: true,
    } as unknown as ReleaseSbomProvenanceDryRunRequest);

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected unsafe SBOM/provenance refs failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "release_sbom_provenance.ref_invalid" }),
        expect.objectContaining({
          code: "release_sbom_provenance.unexpected_field",
        }),
      ]),
    );
    expect(result.raw_input_content).toBe("withheld");
    expect(result.side_effects).toEqual([]);
  });
});
