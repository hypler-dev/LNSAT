import { describe, expect, it } from "vitest";
import {
  createReleaseSigningRevocation,
  defaultReleaseSigningRevocationNoLivePosture,
  defaultReleaseSigningRevocationRefs,
  releaseGithubWorkflowContract,
  releaseSigningRevocationBlockedFlags,
  releaseSigningRevocationContract,
  releaseSigningRevocationRequiredRefs,
  type ReleaseSigningRevocationRequest,
} from "../src/index.js";

describe("release signing revocation contract", () => {
  it("emits BP-0235 source-only signing and revocation evidence", () => {
    const result = createReleaseSigningRevocation();

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected signing/revocation contract success");
    }

    expect(result.release_signing_revocation).toMatchObject({
      contract_id: releaseSigningRevocationContract.contract_id,
      extends_contract_id: releaseGithubWorkflowContract.contract_id,
      identity: {
        packet_ref: "BP-0235",
        selected_after_packet_ref: "BP-0234",
        manifest_ref: "fixtures/release/source-plan.json",
        signing_mode: "planned_not_signed",
        implementation_allowed: false,
      },
      signing_summary: {
        release_version: "0.1.0-source-plan",
        signature_status: "planned_not_signed",
        signing_identity_status: "planned_reference_only",
        certificate_status: "planned_reference_only",
        transparency_log_status: "planned_reference_only",
        notarization_status: "planned_not_notarized",
        revocation_status: "planned_policy_only",
        emergency_disablement_status: "planned_policy_only",
        approval_required_before_signing: true,
      },
      signatures: [],
      certificate_requests: [],
      issued_certificates: [],
      generated_keys: [],
      stored_keys: [],
      notarizations: [],
      signature_files: [],
      uploaded_artifacts: [],
      github_releases: [],
      release_uploads: [],
      network_fetches: [],
      external_service_calls: [],
      registry_publications: [],
      dns_cloudflare_mutations: [],
      side_effects: [],
    });
    expect(
      result.release_signing_revocation.signing_refs.map((ref) => ref.ref_kind),
    ).toEqual([...releaseSigningRevocationRequiredRefs]);
    expect(result.release_signing_revocation.blocked_capabilities).toEqual([
      ...releaseSigningRevocationBlockedFlags,
    ]);
    expect(result.side_effects).toEqual([]);
  });

  it("fails closed when required signing or revocation refs are missing", () => {
    const result = createReleaseSigningRevocation({
      signing_refs: defaultReleaseSigningRevocationRefs.filter(
        (ref) => ref.ref_kind !== "revocation_policy",
      ),
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected missing signing refs failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "release_signing_revocation.ref_required" }),
      ]),
    );
    expect(result.raw_input_content).toBe("withheld");
  });

  it("fails closed on signing, certificate issue, key storage, notarization, upload, and side effects", () => {
    const result = createReleaseSigningRevocation({
      signing_summary: {
        release_version: "0.1.0-source-plan",
        signature_status: "planned_not_signed",
        signing_identity_status: "planned_reference_only",
        certificate_status: "planned_reference_only",
        transparency_log_status: "planned_reference_only",
        notarization_status: "planned_not_notarized",
        revocation_status: "planned_policy_only",
        emergency_disablement_status: "planned_policy_only",
        approval_required_before_signing: false,
      },
      signing_refs: defaultReleaseSigningRevocationRefs.map((ref) =>
        ref.ref_kind === "signing_identity" ? { ...ref, execution_allowed: true } : ref,
      ),
      no_live_posture: {
        ...defaultReleaseSigningRevocationNoLivePosture,
        signing_execution_allowed: true,
        certificate_issue_allowed: true,
        key_storage_allowed: true,
        notarization_allowed: true,
      } as typeof defaultReleaseSigningRevocationNoLivePosture,
      artifact_upload_allowed: true,
      side_effects: ["sign artifact"],
    } as unknown as ReleaseSigningRevocationRequest);

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected blocked signing/revocation failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "release_signing_revocation.summary_invalid",
        }),
        expect.objectContaining({ code: "release_signing_revocation.ref_invalid" }),
        expect.objectContaining({
          code: "release_signing_revocation.no_live_posture_drift",
        }),
        expect.objectContaining({
          code: "release_signing_revocation.blocked_capability_drift",
        }),
        expect.objectContaining({
          code: "release_signing_revocation.side_effects_forbidden",
        }),
      ]),
    );
  });

  it("rejects unsafe refs and unexpected fields without echoing raw input", () => {
    const result = createReleaseSigningRevocation({
      signing_refs: defaultReleaseSigningRevocationRefs.map((ref) =>
        ref.ref_kind === "certificate_identity"
          ? { ...ref, source_ref: "raw private key material for cosign" }
          : ref,
      ),
      unexpected_secret_key: true,
    } as unknown as ReleaseSigningRevocationRequest);

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected unsafe signing refs failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "release_signing_revocation.ref_invalid" }),
        expect.objectContaining({
          code: "release_signing_revocation.unexpected_field",
        }),
      ]),
    );
    expect(result.raw_input_content).toBe("withheld");
    expect(result.side_effects).toEqual([]);
  });
});
