import { describe, expect, it } from "vitest";
import {
  P1_PUBLIC_TRUST_STATUS,
  SIGNER_PROVIDER_STATUS,
  createSignerProviderAuditEvent,
  inspectSignerProviderReadiness,
  inspectSignerProviderSignRequest,
  inspectSignerProviderSignatureResult,
  planSignerKeyLifecycleChange,
  signerProviderContract,
  validateOperatorP1Bundle,
  type SignerKeyReadback,
  type SignerProviderCapabilities,
  type SignerProviderDescriptor,
  type SignerProviderHealth,
  type SignerProviderProfile,
  type SignerProviderSignatureResult,
  type SignerProviderSignRequest,
} from "../src/index.js";

const now = new Date("2026-08-04T00:05:00.000Z");

describe("signer-provider interface readiness", () => {
  it("keeps signing, provider calls, key generation, activation, and P1 closed", () => {
    expect(SIGNER_PROVIDER_STATUS).toBe("interface_only");
    expect(P1_PUBLIC_TRUST_STATUS).toBe("unset");
    expect(signerProviderContract).toEqual({
      contract_id: "lnsat.signer_provider.v0_1",
      status: "interface_only",
      p1_public_trust_status: "unset",
      runtime_signing: false,
      provider_calls_enabled: false,
      private_key_input_allowed: false,
      key_generation_allowed: false,
      signer_activation_allowed: false,
      production_verification_enabled: false,
      universal_master_key: false,
      side_effects: [],
    });
  });

  it.each([
    ["software_vault", null],
    ["pkcs11_3_2", "3.2"],
    ["cloud_kms_hsm", null],
  ] as const)(
    "accepts bounded %s interface while blocking activation",
    (profile, pkcs) => {
      const result = inspectSignerProviderReadiness({
        descriptor: descriptor(profile, pkcs),
        capabilities: capabilities(),
        key: key(),
        health: health(),
        now,
      });

      expect(result).toEqual({
        ok: true,
        status: "interface_ready_activation_blocked",
        profile,
        p1_public_trust_status: "unset",
        provider_calls_enabled: false,
        signer_activation_allowed: false,
        execution_authorized: false,
        private_material_present: false,
        side_effects: [],
      });
    },
  );

  it("requires exact lifecycle controls, key-reference custody, and FIPS evidence refs", () => {
    const base = descriptor("software_vault", null);
    expect(
      inspectSignerProviderReadiness({
        descriptor: {
          ...base,
          lifecycle_contract: { ...base.lifecycle_contract, recovery: false as true },
        },
        capabilities: capabilities(),
        key: key(),
        health: health(),
        now,
      }),
    ).toMatchObject({ ok: false, error_code: "signer.provider.invalid_contract" });
    expect(
      inspectSignerProviderReadiness({
        descriptor: {
          ...base,
          fips_140_3: {
            claim: "validated_module_configuration",
            validation_certificate_ref: null,
            module_configuration_ref: null,
          },
        },
        capabilities: capabilities(),
        key: key(),
        health: health(),
        now,
      }),
    ).toMatchObject({ ok: false, error_code: "signer.provider.invalid_contract" });
    expect(
      inspectSignerProviderReadiness({
        descriptor: {
          ...base,
          universal_master_key: true as false,
        },
        capabilities: capabilities(),
        key: key(),
        health: health(),
        now,
      }),
    ).toMatchObject({ ok: false, error_code: "signer.provider.invalid_contract" });
  });

  it.each(["degraded", "unavailable", "unknown"] as const)(
    "fails closed when provider health is %s",
    (status) => {
      expect(
        inspectSignerProviderReadiness({
          descriptor: descriptor("software_vault", null),
          capabilities: capabilities(),
          key: key(),
          health: { ...health(), status },
          now,
        }),
      ).toEqual({
        ok: false,
        error_code: "signer.provider.unavailable",
        fail_closed: true,
        signer_activation_allowed: false,
        side_effects: [],
      });
    },
  );

  it.each(["retired", "revoked", "compromised", "unknown"] as const)(
    "fails closed for %s key state",
    (state) => {
      expect(
        inspectSignerProviderReadiness({
          descriptor: descriptor("software_vault", null),
          capabilities: capabilities(),
          key: { ...key(), state },
          health: health(),
          now,
        }),
      ).toMatchObject({
        ok: false,
        error_code: "signer.provider.key_inactive",
        signer_activation_allowed: false,
      });
    },
  );

  it("rejects provider, algorithm, validity, and private-material substitution", () => {
    const base = {
      descriptor: descriptor("software_vault", null),
      capabilities: capabilities(),
      key: key(),
      health: health(),
      now,
    };
    expect(
      inspectSignerProviderReadiness({
        ...base,
        key: { ...base.key, provider_id: "provider:substituted" },
      }),
    ).toMatchObject({ ok: false, error_code: "signer.provider.invalid_contract" });
    expect(
      inspectSignerProviderReadiness({
        ...base,
        capabilities: { ...base.capabilities, algorithms: ["rsa_pss_sha256"] },
      }),
    ).toMatchObject({ ok: false, error_code: "signer.provider.invalid_contract" });
    expect(
      inspectSignerProviderReadiness({
        ...base,
        key: { ...base.key, sign_until: "2026-08-04T00:05:00.000Z" },
      }),
    ).toMatchObject({ ok: false, error_code: "signer.provider.key_inactive" });
    expect(
      inspectSignerProviderReadiness({
        ...base,
        key: { ...base.key, private_key: "forbidden" } as SignerKeyReadback,
      }),
    ).toMatchObject({ ok: false, error_code: "signer.provider.invalid_contract" });
  });

  it("binds future sign request exactly but never dispatches provider call", () => {
    const request = signRequest();
    expect(
      inspectSignerProviderSignRequest({
        request,
        expected: expectedBinding(request),
        now,
      }),
    ).toEqual({
      ok: true,
      status: "valid_but_dispatch_blocked",
      exact_digest_bound: true,
      provider_call_performed: false,
      signer_activation_allowed: false,
      side_effects: [],
    });
  });

  it("rejects sign-request digest, key, issuer, audience, purpose, and expiry drift", () => {
    const request = signRequest();
    for (const changed of [
      { ...request, canonical_digest: `sha256:${"b".repeat(64)}` },
      { ...request, key_version: "2" },
      { ...request, issuer: "issuer:mallory" },
      { ...request, audience: "audience:other" },
    ]) {
      expect(
        inspectSignerProviderSignRequest({
          request: changed,
          expected: expectedBinding(request),
          now,
        }),
      ).toMatchObject({
        ok: false,
        error_code: "signer.request.binding_mismatch",
        provider_call_performed: false,
      });
    }
    expect(
      inspectSignerProviderSignRequest({
        request: {
          ...request,
          purpose: "other" as SignerProviderSignRequest["purpose"],
        },
        expected: expectedBinding(request),
        now,
      }),
    ).toMatchObject({ ok: false, error_code: "signer.request.invalid" });
    expect(
      inspectSignerProviderSignRequest({
        request: { ...request, expires_at: now.toISOString() },
        expected: expectedBinding(request),
        now,
      }),
    ).toMatchObject({ ok: false, error_code: "signer.request.invalid" });
  });

  it("bounds future signature result and keeps it untrusted, unconsumable, and non-authorizing", () => {
    const request = signRequest();
    const result = signatureResult(request);
    expect(inspectSignerProviderSignatureResult({ request, result })).toEqual({
      ok: true,
      status: "bounded_result_untrusted_until_verification",
      cryptographically_verified: false,
      consumable: false,
      execution_authorized: false,
      side_effects: [],
    });
    expect(
      inspectSignerProviderSignatureResult({
        request,
        result: { ...result, canonical_digest: `sha256:${"b".repeat(64)}` },
      }),
    ).toMatchObject({ ok: false, error_code: "signer.result.binding_mismatch" });
    expect(
      inspectSignerProviderSignatureResult({
        request,
        result: { ...result, signature_base64url: "x".repeat(16_385) },
      }),
    ).toMatchObject({ ok: false, error_code: "signer.result.invalid" });
  });

  it.each(["rotate", "revoke", "report_compromise", "recover", "backup"] as const)(
    "keeps %s lifecycle action behind separate operator authorization",
    (action) => {
      expect(
        planSignerKeyLifecycleChange({
          action,
          provider_id: "provider:local-vault",
          key_ref: "vault-key-ref:approval-signing",
          reason_ref: "reason:operator-review-required",
        }),
      ).toMatchObject({
        ok: true,
        status: "operator_authorization_required",
        action,
        authorization_present: false,
        action_executed: false,
        signer_activation_allowed: false,
        side_effects: [],
      });
    },
  );

  it("creates public-safe audit metadata without executing lifecycle or signer work", () => {
    expect(
      createSignerProviderAuditEvent({
        event_id: "signer-event:0001",
        provider_id: "provider:local-vault",
        event_type: "sign_rejected",
        actor_ref: "identity:operator:alice",
        key_ref: "vault-key-ref:approval-signing",
        request_digest: `sha256:${"a".repeat(64)}`,
        observed_at: now.toISOString(),
      }),
    ).toEqual({
      event_id: "signer-event:0001",
      provider_id: "provider:local-vault",
      event_type: "sign_rejected",
      actor_ref: "identity:operator:alice",
      key_ref: "vault-key-ref:approval-signing",
      request_digest: `sha256:${"a".repeat(64)}`,
      observed_at: now.toISOString(),
      contains_private_material: false,
      action_executed: false,
      side_effects: [],
    });
  });

  it("keeps P1 unset and rejects private or self-declared material without generation", async () => {
    const expected = {
      bundle_digest: `sha256:${"a".repeat(64)}`,
      verification_material_ref: `avm_${"b".repeat(64)}`,
      signing_key_id: "key:approval-signing:operator",
      signing_key_version: "1",
      operator_signature_ref: "operator-signature-ref:0001",
      lineage_ref: "lineage-ref:0001",
    };
    await expect(validateOperatorP1Bundle({ bundle: null, expected })).resolves.toEqual(
      {
        ok: false,
        error_code: "signer.p1.unset",
        generated_material: false,
        signer_activation_allowed: false,
        side_effects: [],
      },
    );
    await expect(
      validateOperatorP1Bundle({
        bundle: {
          bundle_digest: expected.bundle_digest,
          verification_material: { private_key: "forbidden" },
          operator_signature_ref: "operator-signature-ref:0001",
          lineage_ref: "lineage-ref:0001",
          side_effects: [],
        },
        expected,
      }),
    ).resolves.toMatchObject({
      ok: false,
      error_code: "signer.p1.invalid",
      generated_material: false,
      signer_activation_allowed: false,
    });
  });
});

function descriptor(
  profile: SignerProviderProfile,
  pkcs11Version: "3.2" | null,
): SignerProviderDescriptor {
  return {
    provider_id: "provider:local-vault",
    provider_version: "1.0.0",
    profile,
    implementation_ref: "implementation-ref:signer-interface-test-double",
    customer_owned_key_supported: true,
    customer_signed_deployment_supported: true,
    private_key_exportable: false,
    universal_master_key: false,
    encrypted_key_reference_storage: true,
    pkcs11_version: pkcs11Version,
    lifecycle_contract: {
      backup: true,
      rotation: true,
      revocation: true,
      compromise: true,
      recovery: true,
    },
    fips_140_3: {
      claim: "none",
      validation_certificate_ref: null,
      module_configuration_ref: null,
    },
  };
}

function capabilities(): SignerProviderCapabilities {
  return {
    algorithms: ["ed25519"],
    digest_algorithms: ["sha256"],
    public_key_readback: true,
    lineage_readback: true,
    bounded_signature_result: true,
    health_readiness: true,
    rotation: true,
    revocation: true,
    compromise_state: true,
    audit_events: true,
  };
}

function key(): SignerKeyReadback {
  return {
    provider_id: "provider:local-vault",
    key_ref: "vault-key-ref:approval-signing",
    key_id: "key:approval-signing:operator",
    key_version: "1",
    lineage_ref: "lineage-ref:operator",
    algorithm: "ed25519",
    public_key_ref: "public-key-ref:operator",
    public_key_spki_base64url: "publicOnlyReadbackValue",
    valid_from: "2026-08-04T00:00:00.000Z",
    sign_until: "2026-08-04T00:10:00.000Z",
    verify_until: "2026-08-04T01:00:00.000Z",
    state: "active",
    private_key_included: false,
  };
}

function health(): SignerProviderHealth {
  return {
    provider_id: "provider:local-vault",
    observed_at: now.toISOString(),
    status: "ready",
    readiness_revision: "revision:1",
  };
}

function signRequest(): SignerProviderSignRequest {
  return {
    request_id: "sign-request:0001",
    provider_id: "provider:local-vault",
    key_ref: "vault-key-ref:approval-signing",
    key_id: "key:approval-signing:operator",
    key_version: "1",
    algorithm: "ed25519",
    canonical_digest: `sha256:${"a".repeat(64)}`,
    digest_algorithm: "sha256",
    purpose: "lnsat.signed_approval_evidence.v1",
    issuer: "issuer:lnsat-gateway",
    audience: "audience:lnsat-verifier",
    created_at: "2026-08-04T00:00:00.000Z",
    expires_at: "2026-08-04T00:10:00.000Z",
  };
}

function expectedBinding(request: SignerProviderSignRequest) {
  return {
    provider_id: request.provider_id,
    key_ref: request.key_ref,
    key_id: request.key_id,
    key_version: request.key_version,
    algorithm: request.algorithm,
    canonical_digest: request.canonical_digest,
    issuer: request.issuer,
    audience: request.audience,
  };
}

function signatureResult(
  request: SignerProviderSignRequest,
): SignerProviderSignatureResult {
  return {
    request_id: request.request_id,
    provider_id: request.provider_id,
    key_ref: request.key_ref,
    key_id: request.key_id,
    key_version: request.key_version,
    algorithm: request.algorithm,
    canonical_digest: request.canonical_digest,
    signature_base64url: "testDoubleSignatureOnly",
    signature_ref: "test-double-signature-ref:0001",
    created_at: now.toISOString(),
  };
}
