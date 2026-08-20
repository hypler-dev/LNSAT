import { describe, expect, it } from "vitest";
import {
  createReleaseChecksumSourceVerification,
  defaultReleaseChecksumSourceNoLivePosture,
  defaultReleaseChecksumSourceVerificationRefs,
  releaseChecksumSourceVerificationBlockedFlags,
  releaseChecksumSourceVerificationContract,
  releaseChecksumSourceVerificationRequiredRefs,
  releaseManifestSchemaExpansionContract,
  type ReleaseChecksumSourceVerificationRequest,
} from "../src/index.js";

describe("release checksum source verification", () => {
  it("emits BP-0232 source-only checksum and source archive verification evidence", () => {
    const result = createReleaseChecksumSourceVerification();

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected checksum source verification success");
    }

    expect(result.release_checksum_source_verification).toMatchObject({
      contract_id: releaseChecksumSourceVerificationContract.contract_id,
      extends_contract_id: releaseManifestSchemaExpansionContract.contract_id,
      identity: {
        packet_ref: "BP-0232",
        selected_after_packet_ref: "BP-0231",
        manifest_ref: "fixtures/release/source-plan.json",
        verification_mode: "static_source_only",
        implementation_allowed: false,
      },
      manifest_summary: {
        manifest_version: "0.1",
        release_version: "0.1.0-source-plan",
        release_status: "source_only_planned",
        source_archive_status: "planned",
        checksum_status: "required_not_generated",
        network_required: false,
        archive_created: false,
      },
      generated_checksums: [],
      written_checksum_files: [],
      created_source_archives: [],
      created_binary_artifacts: [],
      github_releases: [],
      release_uploads: [],
      network_fetches: [],
      external_service_calls: [],
      signatures: [],
      generated_sboms: [],
      generated_provenance: [],
      registry_publications: [],
      dns_cloudflare_mutations: [],
      side_effects: [],
    });
    expect(
      result.release_checksum_source_verification.verification_refs.map(
        (ref) => ref.ref_kind,
      ),
    ).toEqual([...releaseChecksumSourceVerificationRequiredRefs]);
    expect(result.release_checksum_source_verification.blocked_capabilities).toEqual([
      ...releaseChecksumSourceVerificationBlockedFlags,
    ]);
    expect(result.side_effects).toEqual([]);
  });

  it("fails closed when required source archive or checksum refs are missing", () => {
    const result = createReleaseChecksumSourceVerification({
      verification_refs: defaultReleaseChecksumSourceVerificationRefs.filter(
        (ref) => ref.ref_kind !== "checksum_index",
      ),
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected missing verification refs failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "release_checksum_source.verification_ref_required",
        }),
      ]),
    );
    expect(result.raw_input_content).toBe("withheld");
  });

  it("fails closed on archive creation, checksum generation, network, release upload, and side effects", () => {
    const result = createReleaseChecksumSourceVerification({
      manifest_summary: {
        manifest_version: "0.1",
        release_version: "0.1.0-source-plan",
        release_status: "source_only_planned",
        source_archive_status: "planned",
        checksum_status: "required_not_generated",
        network_required: false,
        archive_created: true,
      },
      verification_refs: defaultReleaseChecksumSourceVerificationRefs.map((ref) =>
        ref.ref_kind === "source_archive" ? { ...ref, generation_allowed: true } : ref,
      ),
      no_live_posture: {
        ...defaultReleaseChecksumSourceNoLivePosture,
        checksum_generation_execution_allowed: true,
        network_fetch_allowed: true,
      } as typeof defaultReleaseChecksumSourceNoLivePosture,
      release_upload_allowed: true,
      side_effects: ["generate checksum"],
    } as unknown as ReleaseChecksumSourceVerificationRequest);

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected blocked checksum source verification failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "release_checksum_source.manifest_summary_invalid",
        }),
        expect.objectContaining({
          code: "release_checksum_source.verification_ref_invalid",
        }),
        expect.objectContaining({
          code: "release_checksum_source.no_live_posture_drift",
        }),
        expect.objectContaining({
          code: "release_checksum_source.blocked_capability_drift",
        }),
        expect.objectContaining({
          code: "release_checksum_source.side_effects_forbidden",
        }),
      ]),
    );
  });

  it("rejects unsafe refs and unexpected fields without echoing raw input", () => {
    const result = createReleaseChecksumSourceVerification({
      verification_refs: defaultReleaseChecksumSourceVerificationRefs.map((ref) =>
        ref.ref_kind === "verification_command"
          ? { ...ref, source_ref: "curl https://example.invalid/checksum" }
          : ref,
      ),
      unexpected_secret_upload: true,
    } as unknown as ReleaseChecksumSourceVerificationRequest);

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected unsafe refs failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "release_checksum_source.verification_ref_invalid",
        }),
        expect.objectContaining({
          code: "release_checksum_source.unexpected_field",
        }),
      ]),
    );
    expect(result.raw_input_content).toBe("withheld");
    expect(result.side_effects).toEqual([]);
  });
});
