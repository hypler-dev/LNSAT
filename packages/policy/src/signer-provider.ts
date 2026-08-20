import { validateApprovalVerificationMaterialV1 } from "./signed-approval-evidence-v1.js";

export const SIGNER_PROVIDER_STATUS = "interface_only";
export const P1_PUBLIC_TRUST_STATUS = "unset";

export const signerProviderContract = {
  contract_id: "lnsat.signer_provider.v0_1",
  status: SIGNER_PROVIDER_STATUS,
  p1_public_trust_status: P1_PUBLIC_TRUST_STATUS,
  runtime_signing: false,
  provider_calls_enabled: false,
  private_key_input_allowed: false,
  key_generation_allowed: false,
  signer_activation_allowed: false,
  production_verification_enabled: false,
  universal_master_key: false,
  side_effects: [],
} as const;

export type SignerProviderProfile = "software_vault" | "pkcs11_3_2" | "cloud_kms_hsm";

export type SignerAlgorithm = "ed25519" | "ecdsa_p256_sha256" | "rsa_pss_sha256";

export type SignerProviderDescriptor = {
  provider_id: string;
  provider_version: string;
  profile: SignerProviderProfile;
  implementation_ref: string;
  customer_owned_key_supported: true;
  customer_signed_deployment_supported: true;
  private_key_exportable: false;
  universal_master_key: false;
  encrypted_key_reference_storage: boolean;
  pkcs11_version: "3.2" | null;
  lifecycle_contract: {
    backup: true;
    rotation: true;
    revocation: true;
    compromise: true;
    recovery: true;
  };
  fips_140_3: {
    claim: "none" | "validated_module_configuration";
    validation_certificate_ref: string | null;
    module_configuration_ref: string | null;
  };
};

export type SignerProviderCapabilities = {
  algorithms: SignerAlgorithm[];
  digest_algorithms: ["sha256"];
  public_key_readback: true;
  lineage_readback: true;
  bounded_signature_result: true;
  health_readiness: true;
  rotation: true;
  revocation: true;
  compromise_state: true;
  audit_events: true;
};

export type SignerKeyReadback = {
  provider_id: string;
  key_ref: string;
  key_id: string;
  key_version: string;
  lineage_ref: string;
  algorithm: SignerAlgorithm;
  public_key_ref: string;
  public_key_spki_base64url: string;
  valid_from: string;
  sign_until: string;
  verify_until: string;
  state: "active" | "retired" | "revoked" | "compromised" | "unknown";
  private_key_included: false;
};

export type SignerProviderHealth = {
  provider_id: string;
  observed_at: string;
  status: "ready" | "degraded" | "unavailable" | "unknown";
  readiness_revision: string;
};

export type SignerProviderSignRequest = {
  request_id: string;
  provider_id: string;
  key_ref: string;
  key_id: string;
  key_version: string;
  algorithm: SignerAlgorithm;
  canonical_digest: string;
  digest_algorithm: "sha256";
  purpose: "lnsat.signed_approval_evidence.v1";
  issuer: string;
  audience: string;
  created_at: string;
  expires_at: string;
};

export type SignerProviderSignatureResult = {
  request_id: string;
  provider_id: string;
  key_ref: string;
  key_id: string;
  key_version: string;
  algorithm: SignerAlgorithm;
  canonical_digest: string;
  signature_base64url: string;
  signature_ref: string;
  created_at: string;
};

export type SignerProviderAuditEvent = {
  event_id: string;
  provider_id: string;
  event_type:
    | "health_observed"
    | "sign_requested"
    | "sign_rejected"
    | "rotation_requested"
    | "revocation_requested"
    | "compromise_reported";
  actor_ref: string;
  key_ref: string | null;
  request_digest: string;
  observed_at: string;
  contains_private_material: false;
  action_executed: false;
  side_effects: [];
};

export interface SignerProvider {
  describe(): Promise<SignerProviderDescriptor>;
  discoverCapabilities(): Promise<SignerProviderCapabilities>;
  readPublicKey(key_ref: string): Promise<SignerKeyReadback>;
  health(): Promise<SignerProviderHealth>;
  sign(request: SignerProviderSignRequest): Promise<SignerProviderSignatureResult>;
  rotate(input: { key_ref: string; authorization_ref: string }): Promise<unknown>;
  revoke(input: { key_ref: string; authorization_ref: string }): Promise<unknown>;
  reportCompromise(input: {
    key_ref: string;
    authorization_ref: string;
  }): Promise<unknown>;
}

export function inspectSignerProviderReadiness(input: {
  descriptor: SignerProviderDescriptor;
  capabilities: SignerProviderCapabilities;
  key: SignerKeyReadback;
  health: SignerProviderHealth;
  now: Date;
}):
  | {
      ok: true;
      status: "interface_ready_activation_blocked";
      profile: SignerProviderProfile;
      p1_public_trust_status: "unset";
      provider_calls_enabled: false;
      signer_activation_allowed: false;
      execution_authorized: false;
      private_material_present: false;
      side_effects: [];
    }
  | {
      ok: false;
      error_code:
        | "signer.provider.invalid_contract"
        | "signer.provider.unavailable"
        | "signer.provider.key_inactive";
      fail_closed: true;
      signer_activation_allowed: false;
      side_effects: [];
    } {
  if (
    !isValidDescriptor(input.descriptor) ||
    !isValidCapabilities(input.capabilities) ||
    !isValidKey(input.key) ||
    !isValidHealth(input.health) ||
    !(input.now instanceof Date) ||
    Number.isNaN(input.now.getTime()) ||
    input.descriptor.provider_id !== input.key.provider_id ||
    input.descriptor.provider_id !== input.health.provider_id ||
    !input.capabilities.algorithms.includes(input.key.algorithm)
  ) {
    return readinessFailure("signer.provider.invalid_contract");
  }
  if (input.health.status !== "ready") {
    return readinessFailure("signer.provider.unavailable");
  }
  const current = input.now.getTime();
  if (
    input.key.state !== "active" ||
    current < Date.parse(input.key.valid_from) ||
    current >= Date.parse(input.key.sign_until) ||
    current >= Date.parse(input.key.verify_until)
  ) {
    return readinessFailure("signer.provider.key_inactive");
  }
  return {
    ok: true,
    status: "interface_ready_activation_blocked",
    profile: input.descriptor.profile,
    p1_public_trust_status: P1_PUBLIC_TRUST_STATUS,
    provider_calls_enabled: false,
    signer_activation_allowed: false,
    execution_authorized: false,
    private_material_present: false,
    side_effects: [],
  };
}

export function inspectSignerProviderSignRequest(input: {
  request: SignerProviderSignRequest;
  expected: {
    provider_id: string;
    key_ref: string;
    key_id: string;
    key_version: string;
    algorithm: SignerAlgorithm;
    canonical_digest: string;
    issuer: string;
    audience: string;
  };
  now: Date;
}):
  | {
      ok: true;
      status: "valid_but_dispatch_blocked";
      exact_digest_bound: true;
      provider_call_performed: false;
      signer_activation_allowed: false;
      side_effects: [];
    }
  | {
      ok: false;
      error_code: "signer.request.invalid" | "signer.request.binding_mismatch";
      provider_call_performed: false;
      side_effects: [];
    } {
  const request = input.request;
  if (!isValidSignRequest(request) || !validNow(input.now)) {
    return requestFailure("signer.request.invalid");
  }
  if (
    request.provider_id !== input.expected.provider_id ||
    request.key_ref !== input.expected.key_ref ||
    request.key_id !== input.expected.key_id ||
    request.key_version !== input.expected.key_version ||
    request.algorithm !== input.expected.algorithm ||
    request.canonical_digest !== input.expected.canonical_digest ||
    request.issuer !== input.expected.issuer ||
    request.audience !== input.expected.audience
  ) {
    return requestFailure("signer.request.binding_mismatch");
  }
  const current = input.now.getTime();
  if (
    current < Date.parse(request.created_at) ||
    current >= Date.parse(request.expires_at)
  ) {
    return requestFailure("signer.request.invalid");
  }
  return {
    ok: true,
    status: "valid_but_dispatch_blocked",
    exact_digest_bound: true,
    provider_call_performed: false,
    signer_activation_allowed: false,
    side_effects: [],
  };
}

export function inspectSignerProviderSignatureResult(input: {
  request: SignerProviderSignRequest;
  result: SignerProviderSignatureResult;
}):
  | {
      ok: true;
      status: "bounded_result_untrusted_until_verification";
      cryptographically_verified: false;
      consumable: false;
      execution_authorized: false;
      side_effects: [];
    }
  | {
      ok: false;
      error_code: "signer.result.invalid" | "signer.result.binding_mismatch";
      consumable: false;
      execution_authorized: false;
      side_effects: [];
    } {
  const { request, result } = input;
  if (!isValidSignRequest(request) || !isValidSignatureResult(result)) {
    return resultFailure("signer.result.invalid");
  }
  if (
    result.request_id !== request.request_id ||
    result.provider_id !== request.provider_id ||
    result.key_ref !== request.key_ref ||
    result.key_id !== request.key_id ||
    result.key_version !== request.key_version ||
    result.algorithm !== request.algorithm ||
    result.canonical_digest !== request.canonical_digest
  ) {
    return resultFailure("signer.result.binding_mismatch");
  }
  return {
    ok: true,
    status: "bounded_result_untrusted_until_verification",
    cryptographically_verified: false,
    consumable: false,
    execution_authorized: false,
    side_effects: [],
  };
}

export function planSignerKeyLifecycleChange(input: {
  action: "rotate" | "revoke" | "report_compromise" | "recover" | "backup";
  provider_id: string;
  key_ref: string;
  reason_ref: string;
}):
  | {
      ok: true;
      status: "operator_authorization_required";
      action: typeof input.action;
      provider_id: string;
      key_ref: string;
      authorization_present: false;
      action_executed: false;
      signer_activation_allowed: false;
      side_effects: [];
    }
  | {
      ok: false;
      error_code: "signer.lifecycle.invalid_request";
      action_executed: false;
      side_effects: [];
    } {
  if (
    !["rotate", "revoke", "report_compromise", "recover", "backup"].includes(
      input.action,
    ) ||
    !safeRef(input.provider_id, 256) ||
    !safeKeyRef(input.key_ref) ||
    !safeRef(input.reason_ref, 512)
  ) {
    return {
      ok: false,
      error_code: "signer.lifecycle.invalid_request",
      action_executed: false,
      side_effects: [],
    };
  }
  return {
    ok: true,
    status: "operator_authorization_required",
    action: input.action,
    provider_id: input.provider_id,
    key_ref: input.key_ref,
    authorization_present: false,
    action_executed: false,
    signer_activation_allowed: false,
    side_effects: [],
  };
}

export function createSignerProviderAuditEvent(
  input: Omit<
    SignerProviderAuditEvent,
    "contains_private_material" | "action_executed" | "side_effects"
  >,
): SignerProviderAuditEvent | null {
  if (
    !safeRef(input.event_id, 256) ||
    !safeRef(input.provider_id, 256) ||
    ![
      "health_observed",
      "sign_requested",
      "sign_rejected",
      "rotation_requested",
      "revocation_requested",
      "compromise_reported",
    ].includes(input.event_type) ||
    !safeRef(input.actor_ref, 512) ||
    (input.key_ref !== null && !safeKeyRef(input.key_ref)) ||
    !digest(input.request_digest) ||
    !validIso(input.observed_at)
  ) {
    return null;
  }
  return {
    ...input,
    contains_private_material: false,
    action_executed: false,
    side_effects: [],
  };
}

export async function validateOperatorP1Bundle(input: {
  bundle: unknown;
  expected: {
    bundle_digest: string;
    verification_material_ref: string;
    signing_key_id: string;
    signing_key_version: string;
    operator_signature_ref: string;
    lineage_ref: string;
  };
}): Promise<
  | {
      ok: true;
      status: "validated_for_separate_activation_review";
      public_only: true;
      generated_material: false;
      signer_activation_allowed: false;
      side_effects: [];
    }
  | {
      ok: false;
      error_code: "signer.p1.unset" | "signer.p1.invalid" | "signer.p1.mismatch";
      generated_material: false;
      signer_activation_allowed: false;
      side_effects: [];
    }
> {
  if (input.bundle === null || input.bundle === undefined) {
    return p1Failure("signer.p1.unset");
  }
  if (
    !isPlainObject(input.bundle) ||
    hasForbiddenPrivateField(input.bundle) ||
    !exactKeys(input.bundle, [
      "bundle_digest",
      "verification_material",
      "operator_signature_ref",
      "lineage_ref",
      "side_effects",
    ]) ||
    !digest(input.bundle.bundle_digest) ||
    !safeRef(input.bundle.operator_signature_ref, 512) ||
    !safeRef(input.bundle.lineage_ref, 512) ||
    !Array.isArray(input.bundle.side_effects) ||
    input.bundle.side_effects.length !== 0
  ) {
    return p1Failure("signer.p1.invalid");
  }
  const material = await validateApprovalVerificationMaterialV1(
    input.bundle.verification_material,
  );
  if (!material.ok) return p1Failure("signer.p1.invalid");
  if (
    input.bundle.bundle_digest !== input.expected.bundle_digest ||
    material.material.verification_material_ref !==
      input.expected.verification_material_ref ||
    material.material.signing_key_id !== input.expected.signing_key_id ||
    material.material.signing_key_version !== input.expected.signing_key_version ||
    input.bundle.operator_signature_ref !== input.expected.operator_signature_ref ||
    input.bundle.lineage_ref !== input.expected.lineage_ref
  ) {
    return p1Failure("signer.p1.mismatch");
  }
  return {
    ok: true,
    status: "validated_for_separate_activation_review",
    public_only: true,
    generated_material: false,
    signer_activation_allowed: false,
    side_effects: [],
  };
}

function isValidDescriptor(value: unknown): value is SignerProviderDescriptor {
  if (
    !isPlainObject(value) ||
    !isPlainObject(value.lifecycle_contract) ||
    !isPlainObject(value.fips_140_3)
  ) {
    return false;
  }
  const profile = value.profile;
  const fips = value.fips_140_3;
  return (
    safeRef(value.provider_id, 256) &&
    semver(value.provider_version) &&
    ["software_vault", "pkcs11_3_2", "cloud_kms_hsm"].includes(profile as string) &&
    safeRef(value.implementation_ref, 512) &&
    value.customer_owned_key_supported === true &&
    value.customer_signed_deployment_supported === true &&
    value.private_key_exportable === false &&
    value.universal_master_key === false &&
    typeof value.encrypted_key_reference_storage === "boolean" &&
    (profile === "pkcs11_3_2"
      ? value.pkcs11_version === "3.2"
      : value.pkcs11_version === null) &&
    [
      value.lifecycle_contract.backup,
      value.lifecycle_contract.rotation,
      value.lifecycle_contract.revocation,
      value.lifecycle_contract.compromise,
      value.lifecycle_contract.recovery,
    ].every((item) => item === true) &&
    (fips.claim === "none"
      ? fips.validation_certificate_ref === null &&
        fips.module_configuration_ref === null
      : fips.claim === "validated_module_configuration" &&
        safeRef(fips.validation_certificate_ref, 512) &&
        safeRef(fips.module_configuration_ref, 512)) &&
    !hasForbiddenPrivateField(value)
  );
}

function isValidCapabilities(value: unknown): value is SignerProviderCapabilities {
  if (!isPlainObject(value)) return false;
  return (
    Array.isArray(value.algorithms) &&
    value.algorithms.length > 0 &&
    value.algorithms.length <= 3 &&
    new Set(value.algorithms).size === value.algorithms.length &&
    value.algorithms.every((item) =>
      ["ed25519", "ecdsa_p256_sha256", "rsa_pss_sha256"].includes(item as string),
    ) &&
    Array.isArray(value.digest_algorithms) &&
    value.digest_algorithms.length === 1 &&
    value.digest_algorithms[0] === "sha256" &&
    [
      value.public_key_readback,
      value.lineage_readback,
      value.bounded_signature_result,
      value.health_readiness,
      value.rotation,
      value.revocation,
      value.compromise_state,
      value.audit_events,
    ].every((item) => item === true)
  );
}

function isValidKey(value: unknown): value is SignerKeyReadback {
  return (
    isPlainObject(value) &&
    safeRef(value.provider_id, 256) &&
    safeKeyRef(value.key_ref) &&
    safeRef(value.key_id, 256) &&
    /^[1-9][0-9]{0,9}$/.test(value.key_version as string) &&
    safeRef(value.lineage_ref, 512) &&
    ["ed25519", "ecdsa_p256_sha256", "rsa_pss_sha256"].includes(
      value.algorithm as string,
    ) &&
    safeRef(value.public_key_ref, 512) &&
    base64url(value.public_key_spki_base64url, 16_384) &&
    validIso(value.valid_from) &&
    validIso(value.sign_until) &&
    validIso(value.verify_until) &&
    Date.parse(value.valid_from) < Date.parse(value.sign_until) &&
    Date.parse(value.sign_until) <= Date.parse(value.verify_until) &&
    ["active", "retired", "revoked", "compromised", "unknown"].includes(
      value.state as string,
    ) &&
    value.private_key_included === false &&
    !hasForbiddenPrivateField(value)
  );
}

function isValidHealth(value: unknown): value is SignerProviderHealth {
  return (
    isPlainObject(value) &&
    safeRef(value.provider_id, 256) &&
    validIso(value.observed_at) &&
    ["ready", "degraded", "unavailable", "unknown"].includes(value.status as string) &&
    safeRef(value.readiness_revision, 128)
  );
}

function isValidSignRequest(value: unknown): value is SignerProviderSignRequest {
  return (
    isPlainObject(value) &&
    safeRef(value.request_id, 256) &&
    safeRef(value.provider_id, 256) &&
    safeKeyRef(value.key_ref) &&
    safeRef(value.key_id, 256) &&
    /^[1-9][0-9]{0,9}$/.test(value.key_version as string) &&
    ["ed25519", "ecdsa_p256_sha256", "rsa_pss_sha256"].includes(
      value.algorithm as string,
    ) &&
    digest(value.canonical_digest) &&
    value.digest_algorithm === "sha256" &&
    value.purpose === "lnsat.signed_approval_evidence.v1" &&
    safeRef(value.issuer, 512) &&
    safeRef(value.audience, 512) &&
    validIso(value.created_at) &&
    validIso(value.expires_at) &&
    Date.parse(value.created_at) < Date.parse(value.expires_at) &&
    !hasForbiddenPrivateField(value)
  );
}

function isValidSignatureResult(
  value: unknown,
): value is SignerProviderSignatureResult {
  return (
    isPlainObject(value) &&
    safeRef(value.request_id, 256) &&
    safeRef(value.provider_id, 256) &&
    safeKeyRef(value.key_ref) &&
    safeRef(value.key_id, 256) &&
    /^[1-9][0-9]{0,9}$/.test(value.key_version as string) &&
    ["ed25519", "ecdsa_p256_sha256", "rsa_pss_sha256"].includes(
      value.algorithm as string,
    ) &&
    digest(value.canonical_digest) &&
    base64url(value.signature_base64url, 16_384) &&
    safeRef(value.signature_ref, 512) &&
    validIso(value.created_at) &&
    !hasForbiddenPrivateField(value)
  );
}

function readinessFailure(
  error_code:
    | "signer.provider.invalid_contract"
    | "signer.provider.unavailable"
    | "signer.provider.key_inactive",
) {
  return {
    ok: false as const,
    error_code,
    fail_closed: true as const,
    signer_activation_allowed: false as const,
    side_effects: [] as [],
  };
}

function requestFailure(
  error_code: "signer.request.invalid" | "signer.request.binding_mismatch",
) {
  return {
    ok: false as const,
    error_code,
    provider_call_performed: false as const,
    side_effects: [] as [],
  };
}

function resultFailure(
  error_code: "signer.result.invalid" | "signer.result.binding_mismatch",
) {
  return {
    ok: false as const,
    error_code,
    consumable: false as const,
    execution_authorized: false as const,
    side_effects: [] as [],
  };
}

function p1Failure(
  error_code: "signer.p1.unset" | "signer.p1.invalid" | "signer.p1.mismatch",
) {
  return {
    ok: false as const,
    error_code,
    generated_material: false as const,
    signer_activation_allowed: false as const,
    side_effects: [] as [],
  };
}

function hasForbiddenPrivateField(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(hasForbiddenPrivateField);
  if (!isPlainObject(value)) return false;
  return Object.entries(value).some(
    ([key, child]) =>
      (/(?:^|_)(?:private_key|seed|password|credential|secret|token)(?:_|$)/iu.test(
        key,
      ) &&
        !(
          (key === "private_key_exportable" || key === "private_key_included") &&
          child === false
        )) ||
      hasForbiddenPrivateField(child),
  );
}

function exactKeys(value: Record<string, unknown>, keys: string[]): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return (
    actual.length === expected.length &&
    actual.every((key, index) => key === expected[index])
  );
}

function safeKeyRef(value: unknown): value is string {
  return safeRef(value, 512) && /^(?:vault|pkcs11|kms|hsm)-key-ref:/.test(value);
}

function safeRef(value: unknown, maxLength: number): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= maxLength &&
    !/[\u0000-\u001f\u007f]/.test(value)
  );
}

function semver(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)$/.test(value)
  );
}

function digest(value: unknown): value is string {
  return typeof value === "string" && /^sha256:[a-f0-9]{64}$/.test(value);
}

function base64url(value: unknown, maxLength: number): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= maxLength &&
    /^[A-Za-z0-9_-]+$/.test(value)
  );
}

function validIso(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    return new Date(value).toISOString() === value;
  } catch {
    return false;
  }
}

function validNow(value: unknown): value is Date {
  return value instanceof Date && !Number.isNaN(value.getTime());
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
