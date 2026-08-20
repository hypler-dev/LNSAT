import {
  createContractErrorV1,
  hashPacketEnvelopeV1,
  validatePacketEnvelopeV1,
  type ContractErrorV1,
  type PacketEnvelopeV1,
} from "@lnsat/packets";

import {
  createApprovalRequestV1,
  decideApprovalRequestV1,
  type ApprovalDecisionV1,
  type ApprovalDecisionV1Kind,
  type ApprovalDecisionV1ReasonCode,
  type ApprovalRequestV1,
} from "./approval-evidence-v1.js";
import {
  decidePacketEnvelopePolicyV1,
  type PolicyDecisionV1,
} from "./policy-decision-v1.js";

export const SIGNED_APPROVAL_EVIDENCE_V1_STATUS = "verification_contract_foundation";

export const signedApprovalEvidenceV1Contract = {
  contract_id: "lnsat.signed_approval_evidence.v1_0",
  contract_version: "lnsat.contracts.v1_0",
  schema_id: "lnsat.signed_approval_evidence.schema.v1_0",
  payload_profile: "lnsat.signed_approval_payload.v1_0",
  canonicalization_profile: "lnsat.canonical_json.v1_0",
  digest_profile: "lnsat.signed_approval_digest.sha256.v1_0",
  signature_profile: "lnsat.signed_approval_signature.ed25519.v1_0",
  verification_result_contract: "lnsat.signed_approval_verification.v1_0",
  verification_material_contract: "lnsat.approval_verification_material.v1_0",
  verification_material_schema: "lnsat.approval_verification_material.schema.v1_0",
  verification_result_schema: "lnsat.signed_approval_verification.schema.v1_0",
  domain_prefix: "LNSAT-SIGNED-APPROVAL-EVIDENCE-V1",
  runtime_signing: false,
  production_signature_verification: false,
  execution_authorized: false,
  side_effects: [],
} as const;

export type SignedApprovalSignatureV1 = {
  signature_profile: "lnsat.signed_approval_signature.ed25519.v1_0";
  signature_base64url: string;
};

export type SignedApprovalPayloadV1 = {
  packet: PacketEnvelopeV1;
  packet_hash: string;
  policy_decision: PolicyDecisionV1;
  approval_request: ApprovalRequestV1;
  approval_decision: ApprovalDecisionV1;
  issued_at: string;
  expires_at: string;
  nonce_id: string;
  signing_key_id: string;
  signing_key_version: string;
  verification_material_ref: string;
  approval_gate_satisfied: boolean;
  server_signed: true;
  execution_authorized: false;
  session_authority_state_changed: false;
  mutation_authority: false;
};

export type SignedApprovalEvidenceV1 = {
  contract_version: "lnsat.contracts.v1_0";
  schema_id: "lnsat.signed_approval_evidence.schema.v1_0";
  signed_approval_evidence_id: string;
  payload: SignedApprovalPayloadV1;
  payload_digest: string;
  signature: SignedApprovalSignatureV1;
  side_effects: [];
};

export type ApprovalVerificationMaterialV1 = {
  contract_version: "lnsat.contracts.v1_0";
  schema_id: "lnsat.approval_verification_material.schema.v1_0";
  verification_material_ref: string;
  signing_key_id: string;
  signing_key_version: string;
  signature_profile: "lnsat.signed_approval_signature.ed25519.v1_0";
  public_key_spki_base64url: string;
  valid_from: string;
  sign_until: string;
  verify_until: string;
  supersedes_key_version: string | null;
  side_effects: [];
};

export const signedApprovalVerificationErrorCodes = [
  "signed_approval.invalid_json",
  "signed_approval.invalid_type",
  "signed_approval.unexpected_field",
  "signed_approval.missing_field",
  "signed_approval.input_too_large",
  "signed_approval.input_too_deep",
  "signed_approval.unsupported_contract",
  "signed_approval.unsupported_schema",
  "signed_approval.unsupported_canonicalization",
  "signed_approval.unsupported_digest",
  "signed_approval.unsupported_signature_profile",
  "signed_approval.invalid_field",
  "signed_approval.invalid_time_window",
  "signed_approval.invalid_nonce",
  "signed_approval.chain_invalid",
  "signed_approval.chain_substitution",
  "signed_approval.payload_digest_mismatch",
  "signed_approval.evidence_id_mismatch",
  "signed_approval.verification_material_unavailable",
  "signed_approval.verification_material_stale",
  "signed_approval.key_unknown",
  "signed_approval.key_version_downgrade",
  "signed_approval.key_inactive",
  "signed_approval.key_retired",
  "signed_approval.key_revoked",
  "signed_approval.signature_malformed",
  "signed_approval.signature_invalid",
  "signed_approval.nonce_replayed",
  "signed_approval.requester_session_revoked",
  "signed_approval.approver_session_revoked",
  "signed_approval.policy_revoked",
  "signed_approval.approval_revoked",
  "signed_approval.evidence_expired",
  "signed_approval.verification_unavailable",
] as const;

export type SignedApprovalVerificationErrorCode =
  (typeof signedApprovalVerificationErrorCodes)[number];

export type SignedApprovalVerificationError =
  ContractErrorV1<SignedApprovalVerificationErrorCode>;

type SignedApprovalVerificationBaseV1 = {
  contract: "lnsat.signed_approval_verification.v1_0";
  contract_version: "lnsat.contracts.v1_0";
  signed_approval_evidence_id: string | null;
  payload_digest: string | null;
  signing_key_id: string | null;
  signing_key_version: string | null;
  verification_material_ref: string | null;
  verified_at: string;
  cryptographic_signature_valid: boolean;
  chain_valid: boolean;
  current_status_valid: boolean;
  approval_gate_satisfied: boolean;
  server_signed: boolean;
  execution_authorized: false;
  session_authority_state_changed: false;
  mutation_authority: false;
  side_effects: [];
};

export type SignedApprovalVerificationV1 =
  | (SignedApprovalVerificationBaseV1 & {
      ok: true;
      status: "verified";
      signed_approval_evidence_id: string;
      payload_digest: string;
      signing_key_id: string;
      signing_key_version: string;
      verification_material_ref: string;
      cryptographic_signature_valid: true;
      chain_valid: true;
      current_status_valid: true;
      server_signed: true;
      errors: [];
    })
  | (SignedApprovalVerificationBaseV1 & {
      ok: false;
      status: "rejected";
      errors: SignedApprovalVerificationError[];
    });

export type SignedApprovalEvidenceV1ValidationSuccess = {
  ok: true;
  evidence: SignedApprovalEvidenceV1;
  verification_material: ApprovalVerificationMaterialV1 | null;
  canonical_payload_base64url: string;
  preimage_base64url: string;
  payload_digest: string;
  signed_approval_evidence_id: string;
  errors: [];
  side_effects: [];
};

export type SignedApprovalEvidenceV1ValidationFailure = {
  ok: false;
  evidence: null;
  verification_material: null;
  canonical_payload_base64url: null;
  preimage_base64url: null;
  payload_digest: null;
  signed_approval_evidence_id: null;
  errors: SignedApprovalVerificationError[];
  side_effects: [];
};

export type SignedApprovalEvidenceV1ValidationResult =
  SignedApprovalEvidenceV1ValidationSuccess | SignedApprovalEvidenceV1ValidationFailure;

export type SignedApprovalEvidenceIdentityV1 = {
  canonical_payload: string;
  canonical_payload_base64url: string;
  preimage: Uint8Array;
  preimage_base64url: string;
  payload_digest: string;
  signed_approval_evidence_id: string;
};

export const ed25519VerificationRejectionClassesV1 = [
  "none",
  "public_key_encoding",
  "message_encoding",
  "signature_encoding",
  "cryptographic_reject",
] as const;

export type Ed25519VerificationRejectionClassV1 =
  (typeof ed25519VerificationRejectionClassesV1)[number];

export type Ed25519VerificationPrimitiveInputV1 = {
  public_key: string;
  message: string;
  signature: string;
};

export type Ed25519PublicVerificationInputV1 = {
  public_key_spki_der: Uint8Array;
  message: Uint8Array;
  signature: Uint8Array;
};

export type Ed25519VerificationProviderV1 = (
  input: Readonly<Ed25519PublicVerificationInputV1>,
) => boolean | Promise<boolean>;

export type Ed25519VerificationPrimitiveResultV1 =
  | {
      accepted: true;
      rejection_class: "none";
    }
  | {
      accepted: false;
      rejection_class: Exclude<Ed25519VerificationRejectionClassV1, "none">;
    };

const rootKeys = [
  "contract_version",
  "schema_id",
  "signed_approval_evidence_id",
  "payload",
  "payload_digest",
  "signature",
  "side_effects",
] as const;
const payloadKeys = [
  "packet",
  "packet_hash",
  "policy_decision",
  "approval_request",
  "approval_decision",
  "issued_at",
  "expires_at",
  "nonce_id",
  "signing_key_id",
  "signing_key_version",
  "verification_material_ref",
  "approval_gate_satisfied",
  "server_signed",
  "execution_authorized",
  "session_authority_state_changed",
  "mutation_authority",
] as const;
const signatureKeys = ["signature_profile", "signature_base64url"] as const;
const materialKeys = [
  "contract_version",
  "schema_id",
  "verification_material_ref",
  "signing_key_id",
  "signing_key_version",
  "signature_profile",
  "public_key_spki_base64url",
  "valid_from",
  "sign_until",
  "verify_until",
  "supersedes_key_version",
  "side_effects",
] as const;
const materialBodyKeys = materialKeys.filter(
  (key) => key !== "verification_material_ref",
);
const canonicalTimestampPattern =
  /^(?!0000)(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d{1,3}))?Z$/u;
const digestPattern = /^sha256:[0-9a-f]{64}$/u;
const evidenceIdPattern = /^sae_[0-9a-f]{64}$/u;
const noncePattern = /^nonce_[0-9a-f]{64}$/u;
const keyIdPattern = /^key:approval-signing:[^\s\u0000-\u001f\u007f]{1,216}$/u;
const keyVersionPattern = /^[1-9][0-9]{0,9}$/u;
const materialRefPattern = /^avm_[0-9a-f]{64}$/u;
const base64UrlPattern = /^[A-Za-z0-9_-]+$/u;
const forbiddenFieldPattern =
  /^(?:(?:.*_)?(?:private_key|seed|password|bearer|csrf|credential|secret|token)(?:_.*)?)$/iu;
const maxInputBytes = 1_048_576;
const maxInputDepth = 64;
const domainPrefix = "LNSAT-SIGNED-APPROVAL-EVIDENCE-V1";
const ed25519SpkiPrefix = Uint8Array.from([
  0x30, 0x2a, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x70, 0x03, 0x21, 0x00,
]);
const ed25519SpkiBase64UrlLength = 59;
const ed25519SignatureBase64UrlLength = 86;
const maxEd25519MessageBase64UrlLength = Math.ceil((maxInputBytes * 4) / 3);

export async function parseSignedApprovalEvidenceV1Json(
  input: string,
  verificationMaterial?: unknown,
): Promise<SignedApprovalEvidenceV1ValidationResult> {
  const bytes = encodeUtf8(input);
  if (bytes.length > maxInputBytes) {
    return validationFailure(
      "signed_approval.input_too_large",
      "",
      "Signed approval evidence exceeds the maximum UTF-8 size.",
    );
  }

  let scan: JsonScanResult;
  try {
    scan = scanJson(input);
  } catch (error) {
    if (error instanceof JsonDepthError) {
      return validationFailure(
        "signed_approval.input_too_deep",
        "",
        "Signed approval evidence exceeds the maximum JSON depth.",
      );
    }
    return validationFailure(
      "signed_approval.invalid_json",
      "",
      "Signed approval evidence must be syntactically valid JSON.",
    );
  }
  if (scan.maxDepth > maxInputDepth) {
    return validationFailure(
      "signed_approval.input_too_deep",
      "",
      "Signed approval evidence exceeds the maximum JSON depth.",
    );
  }
  if (scan.duplicateKey) {
    return validationFailure(
      "signed_approval.invalid_json",
      "",
      "Signed approval evidence must not contain duplicate object keys.",
    );
  }

  let value: unknown;
  try {
    value = JSON.parse(input) as unknown;
  } catch {
    return validationFailure(
      "signed_approval.invalid_json",
      "",
      "Signed approval evidence must be syntactically valid JSON.",
    );
  }
  return validateSignedApprovalEvidenceV1(value, verificationMaterial);
}

export async function validateSignedApprovalEvidenceV1(
  value: unknown,
  verificationMaterial?: unknown,
): Promise<SignedApprovalEvidenceV1ValidationResult> {
  const domainError = validateCanonicalJsonDomain(value, "", 0);
  if (domainError !== null) return domainError;
  if (!isPlainObject(value)) {
    return validationFailure(
      "signed_approval.invalid_type",
      "",
      "Signed approval evidence must be one closed object.",
    );
  }
  const keyError = validateExactKeys(value, rootKeys, "");
  if (keyError !== null) return keyError;
  if (value.contract_version !== signedApprovalEvidenceV1Contract.contract_version) {
    return validationFailure(
      "signed_approval.unsupported_contract",
      "/contract_version",
      "Signed approval evidence contract version is unsupported.",
    );
  }
  if (value.schema_id !== signedApprovalEvidenceV1Contract.schema_id) {
    return validationFailure(
      "signed_approval.unsupported_schema",
      "/schema_id",
      "Signed approval evidence schema is unsupported.",
    );
  }
  if (
    typeof value.signed_approval_evidence_id !== "string" ||
    !evidenceIdPattern.test(value.signed_approval_evidence_id) ||
    typeof value.payload_digest !== "string" ||
    !digestPattern.test(value.payload_digest) ||
    !isEmptyArray(value.side_effects)
  ) {
    return validationFailure(
      "signed_approval.invalid_field",
      "",
      "Signed approval evidence identity, digest, or side effects are invalid.",
    );
  }

  const signatureResult = validateSignature(value.signature);
  if (!signatureResult.ok) return signatureResult.failure;
  const payloadResult = await validatePayload(value.payload);
  if (!payloadResult.ok) return payloadResult.failure;

  const identity = await deriveSignedApprovalEvidenceIdentityV1(payloadResult.payload);
  if (value.payload_digest !== identity.payload_digest) {
    return validationFailure(
      "signed_approval.payload_digest_mismatch",
      "/payload_digest",
      "Payload digest does not match the canonical signed payload.",
    );
  }
  if (value.signed_approval_evidence_id !== identity.signed_approval_evidence_id) {
    return validationFailure(
      "signed_approval.evidence_id_mismatch",
      "/signed_approval_evidence_id",
      "Evidence identity does not match the canonical signed payload.",
    );
  }

  let material: ApprovalVerificationMaterialV1 | null = null;
  if (verificationMaterial !== undefined) {
    const materialResult =
      await validateApprovalVerificationMaterialV1(verificationMaterial);
    if (!materialResult.ok) return materialResult.failure;
    material = materialResult.material;
    const bindingFailure = validateMaterialBinding(payloadResult.payload, material);
    if (bindingFailure !== null) return bindingFailure;
  }

  return {
    ok: true,
    evidence: value as SignedApprovalEvidenceV1,
    verification_material: material,
    canonical_payload_base64url: identity.canonical_payload_base64url,
    preimage_base64url: identity.preimage_base64url,
    payload_digest: identity.payload_digest,
    signed_approval_evidence_id: identity.signed_approval_evidence_id,
    errors: [],
    side_effects: [],
  };
}

export async function validateApprovalVerificationMaterialV1(
  value: unknown,
): Promise<
  | { ok: true; material: ApprovalVerificationMaterialV1 }
  | { ok: false; failure: SignedApprovalEvidenceV1ValidationFailure }
> {
  const domainError = validateCanonicalJsonDomain(value, "", 0);
  if (domainError !== null) return { ok: false, failure: domainError };
  if (!isPlainObject(value)) {
    return {
      ok: false,
      failure: validationFailure(
        "signed_approval.invalid_type",
        "/verification_material",
        "Verification material must be one closed object.",
      ),
    };
  }
  const keyError = validateExactKeys(value, materialKeys, "/verification_material");
  if (keyError !== null) return { ok: false, failure: keyError };
  if (value.contract_version !== "lnsat.contracts.v1_0") {
    return {
      ok: false,
      failure: validationFailure(
        "signed_approval.unsupported_contract",
        "/verification_material/contract_version",
        "Verification material contract version is unsupported.",
      ),
    };
  }
  if (value.schema_id !== "lnsat.approval_verification_material.schema.v1_0") {
    return {
      ok: false,
      failure: validationFailure(
        "signed_approval.unsupported_schema",
        "/verification_material/schema_id",
        "Verification material schema is unsupported.",
      ),
    };
  }
  if (value.signature_profile !== signedApprovalEvidenceV1Contract.signature_profile) {
    return {
      ok: false,
      failure: validationFailure(
        "signed_approval.unsupported_signature_profile",
        "/verification_material/signature_profile",
        "Verification material signature profile is unsupported.",
      ),
    };
  }
  if (
    typeof value.verification_material_ref !== "string" ||
    !materialRefPattern.test(value.verification_material_ref) ||
    typeof value.signing_key_id !== "string" ||
    !keyIdPattern.test(value.signing_key_id) ||
    typeof value.signing_key_version !== "string" ||
    !keyVersionPattern.test(value.signing_key_version) ||
    typeof value.public_key_spki_base64url !== "string" ||
    !validEd25519Spki(value.public_key_spki_base64url) ||
    typeof value.valid_from !== "string" ||
    typeof value.sign_until !== "string" ||
    typeof value.verify_until !== "string" ||
    !validTimestamp(value.valid_from) ||
    !validTimestamp(value.sign_until) ||
    !validTimestamp(value.verify_until) ||
    !(
      value.supersedes_key_version === null ||
      (typeof value.supersedes_key_version === "string" &&
        keyVersionPattern.test(value.supersedes_key_version))
    ) ||
    !isEmptyArray(value.side_effects)
  ) {
    return {
      ok: false,
      failure: validationFailure(
        "signed_approval.invalid_field",
        "/verification_material",
        "Verification material fields are malformed.",
      ),
    };
  }
  const validFrom = timestampMillis(value.valid_from);
  const signUntil = timestampMillis(value.sign_until);
  const verifyUntil = timestampMillis(value.verify_until);
  if (
    validFrom === null ||
    signUntil === null ||
    verifyUntil === null ||
    validFrom >= signUntil ||
    signUntil > verifyUntil ||
    (value.supersedes_key_version !== null &&
      Number(value.supersedes_key_version) >= Number(value.signing_key_version))
  ) {
    return {
      ok: false,
      failure: validationFailure(
        "signed_approval.invalid_field",
        "/verification_material",
        "Verification material lifecycle window or lineage is invalid.",
      ),
    };
  }

  const material = value as ApprovalVerificationMaterialV1;
  const expectedRef = await deriveApprovalVerificationMaterialRefV1(material);
  if (material.verification_material_ref !== expectedRef) {
    return {
      ok: false,
      failure: validationFailure(
        "signed_approval.chain_substitution",
        "/verification_material/verification_material_ref",
        "Verification material reference does not match its immutable body.",
      ),
    };
  }
  return { ok: true, material };
}

export async function deriveSignedApprovalEvidenceIdentityV1(
  payload: SignedApprovalPayloadV1,
): Promise<SignedApprovalEvidenceIdentityV1> {
  const canonicalPayload = canonicalizeJsonValue(payload);
  const canonicalBytes = encodeUtf8(canonicalPayload);
  const prefix = encodeUtf8(domainPrefix);
  const preimage = new Uint8Array(prefix.length + 1 + 8 + canonicalBytes.length);
  preimage.set(prefix, 0);
  preimage[prefix.length] = 0;
  new DataView(preimage.buffer).setBigUint64(
    prefix.length + 1,
    BigInt(canonicalBytes.length),
    false,
  );
  preimage.set(canonicalBytes, prefix.length + 9);
  const digestHex = await sha256Hex(preimage);
  return {
    canonical_payload: canonicalPayload,
    canonical_payload_base64url: encodeBase64Url(canonicalBytes),
    preimage,
    preimage_base64url: encodeBase64Url(preimage),
    payload_digest: `sha256:${digestHex}`,
    signed_approval_evidence_id: `sae_${digestHex}`,
  };
}

export async function deriveApprovalVerificationMaterialRefV1(
  material: ApprovalVerificationMaterialV1,
): Promise<string> {
  const body = Object.fromEntries(materialBodyKeys.map((key) => [key, material[key]]));
  return `avm_${await sha256Hex(encodeUtf8(canonicalizeJsonValue(body)))}`;
}

export function encodeBase64Url(bytes: Uint8Array): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  let output = "";
  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index] ?? 0;
    const second = bytes[index + 1];
    const third = bytes[index + 2];
    const combined = (first << 16) | ((second ?? 0) << 8) | (third ?? 0);
    output += alphabet[(combined >>> 18) & 63];
    output += alphabet[(combined >>> 12) & 63];
    if (second !== undefined) output += alphabet[(combined >>> 6) & 63];
    if (third !== undefined) output += alphabet[combined & 63];
  }
  return output;
}

export async function verifyEd25519SignaturePrimitiveV1(
  input: Ed25519VerificationPrimitiveInputV1,
  provider: Ed25519VerificationProviderV1,
): Promise<Ed25519VerificationPrimitiveResultV1> {
  let publicKeyText: unknown;
  try {
    publicKeyText = input?.public_key;
  } catch {
    return primitiveRejection("cryptographic_reject");
  }
  if (
    typeof publicKeyText !== "string" ||
    publicKeyText.length !== ed25519SpkiBase64UrlLength
  ) {
    return primitiveRejection("public_key_encoding");
  }
  let publicKey: Uint8Array | null;
  try {
    publicKey = decodeCanonicalBase64Url(publicKeyText);
  } catch {
    return primitiveRejection("cryptographic_reject");
  }

  if (
    publicKey === null ||
    publicKey.length !== 44 ||
    !ed25519SpkiPrefix.every((byte, index) => publicKey[index] === byte)
  ) {
    return primitiveRejection("public_key_encoding");
  }

  let messageText: unknown;
  try {
    messageText = input.message;
  } catch {
    return primitiveRejection("cryptographic_reject");
  }
  if (
    typeof messageText !== "string" ||
    messageText.length > maxEd25519MessageBase64UrlLength
  ) {
    return primitiveRejection("message_encoding");
  }
  let message: Uint8Array | null;
  try {
    message = decodeCanonicalBase64Url(messageText);
  } catch {
    return primitiveRejection("cryptographic_reject");
  }
  if (message === null) {
    return primitiveRejection("message_encoding");
  }

  let signatureText: unknown;
  try {
    signatureText = input.signature;
  } catch {
    return primitiveRejection("cryptographic_reject");
  }
  if (
    typeof signatureText !== "string" ||
    signatureText.length !== ed25519SignatureBase64UrlLength
  ) {
    return primitiveRejection("signature_encoding");
  }
  let signature: Uint8Array | null;
  try {
    signature = decodeCanonicalBase64Url(signatureText);
  } catch {
    return primitiveRejection("cryptographic_reject");
  }
  if (signature === null || signature.length !== 64) {
    return primitiveRejection("signature_encoding");
  }

  try {
    if (
      await provider({
        public_key_spki_der: publicKey,
        message,
        signature,
      })
    ) {
      return { accepted: true, rejection_class: "none" };
    }
  } catch {
    // Provider failures are deliberately indistinguishable from bad signatures.
  }
  return primitiveRejection("cryptographic_reject");
}

function validateSignature(
  value: unknown,
):
  | { ok: true; signature: SignedApprovalSignatureV1 }
  | { ok: false; failure: SignedApprovalEvidenceV1ValidationFailure } {
  if (!isPlainObject(value)) {
    return {
      ok: false,
      failure: validationFailure(
        "signed_approval.signature_malformed",
        "/signature",
        "Signature must be one closed object.",
      ),
    };
  }
  const keyError = validateExactKeys(value, signatureKeys, "/signature");
  if (keyError !== null) return { ok: false, failure: keyError };
  if (value.signature_profile !== signedApprovalEvidenceV1Contract.signature_profile) {
    return {
      ok: false,
      failure: validationFailure(
        "signed_approval.unsupported_signature_profile",
        "/signature/signature_profile",
        "Signature profile is unsupported.",
      ),
    };
  }
  if (
    typeof value.signature_base64url !== "string" ||
    decodeCanonicalBase64Url(value.signature_base64url)?.length !== 64
  ) {
    return {
      ok: false,
      failure: validationFailure(
        "signed_approval.signature_malformed",
        "/signature/signature_base64url",
        "Signature must be exactly 64 canonical base64url octets.",
      ),
    };
  }
  return { ok: true, signature: value as SignedApprovalSignatureV1 };
}

async function validatePayload(
  value: unknown,
): Promise<
  | { ok: true; payload: SignedApprovalPayloadV1 }
  | { ok: false; failure: SignedApprovalEvidenceV1ValidationFailure }
> {
  if (!isPlainObject(value)) {
    return {
      ok: false,
      failure: validationFailure(
        "signed_approval.invalid_type",
        "/payload",
        "Signed approval payload must be one closed object.",
      ),
    };
  }
  const keyError = validateExactKeys(value, payloadKeys, "/payload");
  if (keyError !== null) return { ok: false, failure: keyError };

  if (
    typeof value.packet_hash !== "string" ||
    !digestPattern.test(value.packet_hash) ||
    typeof value.issued_at !== "string" ||
    typeof value.expires_at !== "string" ||
    !validTimestamp(value.issued_at) ||
    !validTimestamp(value.expires_at) ||
    typeof value.nonce_id !== "string" ||
    !noncePattern.test(value.nonce_id) ||
    typeof value.signing_key_id !== "string" ||
    !keyIdPattern.test(value.signing_key_id) ||
    typeof value.signing_key_version !== "string" ||
    !keyVersionPattern.test(value.signing_key_version) ||
    typeof value.verification_material_ref !== "string" ||
    !materialRefPattern.test(value.verification_material_ref) ||
    typeof value.approval_gate_satisfied !== "boolean" ||
    value.server_signed !== true ||
    value.execution_authorized !== false ||
    value.session_authority_state_changed !== false ||
    value.mutation_authority !== false
  ) {
    const code =
      typeof value.nonce_id !== "string" || !noncePattern.test(String(value.nonce_id))
        ? "signed_approval.invalid_nonce"
        : "signed_approval.invalid_field";
    return {
      ok: false,
      failure: validationFailure(
        code,
        "/payload",
        "Signed approval payload metadata or authority closure is invalid.",
      ),
    };
  }

  const packetResult = validatePacketEnvelopeV1(value.packet);
  if (!packetResult.ok) {
    return {
      ok: false,
      failure: validationFailure(
        "signed_approval.chain_invalid",
        "/payload/packet",
        "Embedded packet does not match its closed v1 contract.",
      ),
    };
  }
  if (!isPlainObject(value.policy_decision)) {
    return chainFailure("/payload/policy_decision");
  }
  const evaluatedAt = value.policy_decision.evaluated_at;
  if (typeof evaluatedAt !== "string") {
    return chainFailure("/payload/policy_decision/evaluated_at");
  }
  const policyResult = await decidePacketEnvelopePolicyV1(packetResult.packet, {
    evaluated_at: evaluatedAt,
  });
  if (
    !policyResult.ok ||
    !canonicalEqual(policyResult.policy_decision, value.policy_decision)
  ) {
    return chainFailure("/payload/policy_decision");
  }

  if (!isPlainObject(value.approval_request)) {
    return chainFailure("/payload/approval_request");
  }
  const requestedAt = value.approval_request.requested_at;
  if (typeof requestedAt !== "string") {
    return chainFailure("/payload/approval_request/requested_at");
  }
  const requestResult = await createApprovalRequestV1(policyResult.policy_decision, {
    requested_at: requestedAt,
  });
  if (
    !requestResult.ok ||
    !canonicalEqual(requestResult.approval_request, value.approval_request)
  ) {
    return chainFailure("/payload/approval_request");
  }

  if (!isPlainObject(value.approval_decision)) {
    return chainFailure("/payload/approval_decision");
  }
  const decisionInput = approvalDecisionInput(value.approval_decision);
  if (decisionInput === null) {
    return chainFailure("/payload/approval_decision");
  }
  const decisionResult = await decideApprovalRequestV1(
    requestResult.approval_request,
    decisionInput,
  );
  if (
    !decisionResult.ok ||
    !canonicalEqual(decisionResult.approval_decision, value.approval_decision)
  ) {
    return chainFailure("/payload/approval_decision");
  }

  let packetHash: string;
  try {
    packetHash = await hashPacketEnvelopeV1(packetResult.packet);
  } catch {
    return chainFailure("/payload/packet_hash");
  }
  if (
    value.packet_hash !== packetHash ||
    value.packet_hash !== policyResult.policy_decision.packet_ref.packet_hash ||
    value.approval_gate_satisfied !==
      decisionResult.approval_decision.approval_gate_satisfied
  ) {
    return chainFailure("/payload");
  }

  const issuedAt = timestampMillis(value.issued_at);
  const expiresAt = timestampMillis(value.expires_at);
  const decidedAt = timestampMillis(decisionResult.approval_decision.decided_at);
  if (
    issuedAt === null ||
    expiresAt === null ||
    decidedAt === null ||
    decidedAt > issuedAt ||
    issuedAt >= expiresAt ||
    value.expires_at !== decisionResult.approval_decision.expires_at
  ) {
    return {
      ok: false,
      failure: validationFailure(
        "signed_approval.invalid_time_window",
        "/payload",
        "Signed evidence issue or expiry window is invalid.",
      ),
    };
  }

  return { ok: true, payload: value as SignedApprovalPayloadV1 };
}

function approvalDecisionInput(decision: Record<string, unknown>): {
  approver_ref: string;
  approver_session_ref: string;
  decision: ApprovalDecisionV1Kind;
  reason_code: ApprovalDecisionV1ReasonCode;
  decided_at: string;
} | null {
  const decisionKinds = new Set(["approved", "denied"]);
  const reasonCodes = new Set([
    "approval.operator_approved",
    "approval.operator_denied",
    "approval.scope_rejected",
    "approval.evidence_insufficient",
    "approval.request_superseded",
  ]);
  if (
    typeof decision.approver_ref !== "string" ||
    typeof decision.approver_session_ref !== "string" ||
    typeof decision.decision !== "string" ||
    !decisionKinds.has(decision.decision) ||
    typeof decision.reason_code !== "string" ||
    !reasonCodes.has(decision.reason_code) ||
    typeof decision.decided_at !== "string"
  ) {
    return null;
  }
  return {
    approver_ref: decision.approver_ref,
    approver_session_ref: decision.approver_session_ref,
    decision: decision.decision as ApprovalDecisionV1Kind,
    reason_code: decision.reason_code as ApprovalDecisionV1ReasonCode,
    decided_at: decision.decided_at,
  };
}

function validateMaterialBinding(
  payload: SignedApprovalPayloadV1,
  material: ApprovalVerificationMaterialV1,
): SignedApprovalEvidenceV1ValidationFailure | null {
  if (payload.signing_key_id !== material.signing_key_id) {
    return validationFailure(
      "signed_approval.chain_substitution",
      "/payload/signing_key_id",
      "Signed payload key lineage does not match verification material.",
    );
  }
  if (payload.signing_key_version !== material.signing_key_version) {
    const payloadVersion = Number(payload.signing_key_version);
    const materialVersion = Number(material.signing_key_version);
    return validationFailure(
      payloadVersion < materialVersion
        ? "signed_approval.key_version_downgrade"
        : "signed_approval.chain_substitution",
      "/payload/signing_key_version",
      "Signed payload key version does not match verification material.",
    );
  }
  if (payload.verification_material_ref !== material.verification_material_ref) {
    return validationFailure(
      "signed_approval.chain_substitution",
      "/payload/verification_material_ref",
      "Signed payload verification-material reference does not match.",
    );
  }
  const issuedAt = timestampMillis(payload.issued_at);
  const expiresAt = timestampMillis(payload.expires_at);
  const validFrom = timestampMillis(material.valid_from);
  const signUntil = timestampMillis(material.sign_until);
  const verifyUntil = timestampMillis(material.verify_until);
  if (
    issuedAt === null ||
    expiresAt === null ||
    validFrom === null ||
    signUntil === null ||
    verifyUntil === null ||
    issuedAt < validFrom ||
    issuedAt >= signUntil ||
    expiresAt > verifyUntil
  ) {
    return validationFailure(
      "signed_approval.key_inactive",
      "/verification_material",
      "Verification material does not cover evidence issue and expiry times.",
    );
  }
  return null;
}

function validEd25519Spki(value: string): boolean {
  const bytes = decodeCanonicalBase64Url(value);
  if (bytes === null || bytes.length !== 44) return false;
  return ed25519SpkiPrefix.every((byte, index) => bytes[index] === byte);
}

function decodeCanonicalBase64Url(value: string): Uint8Array | null {
  if (value.length === 0) return new Uint8Array();
  if (value.includes("=") || !base64UrlPattern.test(value) || value.length % 4 === 1) {
    return null;
  }
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  const output: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const character of value) {
    const sextet = alphabet.indexOf(character);
    if (sextet < 0) return null;
    buffer = (buffer << 6) | sextet;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      output.push((buffer >>> bits) & 0xff);
      buffer &= (1 << bits) - 1;
    }
  }
  if (bits > 0 && buffer !== 0) return null;
  const decoded = Uint8Array.from(output);
  return encodeBase64Url(decoded) === value ? decoded : null;
}

function primitiveRejection(
  rejectionClass: Exclude<Ed25519VerificationRejectionClassV1, "none">,
): Ed25519VerificationPrimitiveResultV1 {
  return { accepted: false, rejection_class: rejectionClass };
}

function validateCanonicalJsonDomain(
  value: unknown,
  path: string,
  depth: number,
): SignedApprovalEvidenceV1ValidationFailure | null {
  if (depth > maxInputDepth) {
    return validationFailure(
      "signed_approval.input_too_deep",
      path,
      "Signed approval evidence exceeds the maximum JSON depth.",
    );
  }
  if (value === null || typeof value === "boolean") return null;
  if (typeof value === "string") {
    for (let index = 0; index < value.length; index += 1) {
      const code = value.charCodeAt(index);
      if (
        (code >= 0xd800 &&
          code <= 0xdbff &&
          !(
            index + 1 < value.length &&
            value.charCodeAt(index + 1) >= 0xdc00 &&
            value.charCodeAt(index + 1) <= 0xdfff
          )) ||
        (code >= 0xdc00 &&
          code <= 0xdfff &&
          !(
            index > 0 &&
            value.charCodeAt(index - 1) >= 0xd800 &&
            value.charCodeAt(index - 1) <= 0xdbff
          ))
      ) {
        return validationFailure(
          "signed_approval.invalid_field",
          path,
          "Signed approval evidence contains a lone Unicode surrogate.",
        );
      }
    }
    return null;
  }
  if (typeof value === "number") {
    return Number.isSafeInteger(value) && !Object.is(value, -0)
      ? null
      : validationFailure(
          "signed_approval.invalid_field",
          path,
          "Signed approval evidence numbers must be canonical safe integers.",
        );
  }
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      const failure = validateCanonicalJsonDomain(
        value[index],
        `${path}/${index}`,
        depth + 1,
      );
      if (failure !== null) return failure;
    }
    return null;
  }
  if (!isPlainObject(value)) {
    return validationFailure(
      "signed_approval.invalid_type",
      path,
      "Signed approval evidence contains a non-JSON value.",
    );
  }
  for (const [key, item] of Object.entries(value)) {
    if (forbiddenFieldPattern.test(key)) {
      return validationFailure(
        "signed_approval.invalid_field",
        `${path}/${escapePointer(key)}`,
        "Signed approval evidence contains a forbidden secret-bearing field.",
      );
    }
    const failure = validateCanonicalJsonDomain(
      item,
      `${path}/${escapePointer(key)}`,
      depth + 1,
    );
    if (failure !== null) return failure;
  }
  return null;
}

function validateExactKeys(
  value: Record<string, unknown>,
  required: readonly string[],
  path: string,
): SignedApprovalEvidenceV1ValidationFailure | null {
  const requiredSet = new Set(required);
  const unexpected = Object.keys(value).find((key) => !requiredSet.has(key));
  if (unexpected !== undefined) {
    return validationFailure(
      "signed_approval.unexpected_field",
      `${path}/${escapePointer(unexpected)}`,
      "Signed approval evidence contains an unexpected field.",
    );
  }
  const missing = required.find((key) => !Object.hasOwn(value, key));
  return missing === undefined
    ? null
    : validationFailure(
        "signed_approval.missing_field",
        `${path}/${escapePointer(missing)}`,
        "Signed approval evidence is missing a required field.",
      );
}

function validTimestamp(value: string): boolean {
  return timestampMillis(value) !== null;
}

function timestampMillis(value: string): number | null {
  const match = canonicalTimestampPattern.exec(value);
  if (match === null) return null;
  const millis = Date.parse(value);
  if (!Number.isFinite(millis)) return null;
  const fraction = match[2];
  const expected =
    fraction === undefined
      ? new Date(millis).toISOString().replace(".000Z", "Z")
      : new Date(millis)
          .toISOString()
          .replace(/\.([0-9]{3})Z$/u, (_whole, digits: string) => {
            const width = fraction.length;
            return `.${digits.slice(0, width)}Z`;
          });
  return expected === value ? millis : null;
}

function canonicalEqual(left: unknown, right: unknown): boolean {
  try {
    return canonicalizeJsonValue(left) === canonicalizeJsonValue(right);
  } catch {
    return false;
  }
}

function canonicalizeJsonValue(value: unknown): string {
  if (value === null || typeof value === "boolean" || typeof value === "string") {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value) || Object.is(value, -0)) {
      throw new TypeError("Canonical JSON numbers must be safe integers.");
    }
    return String(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalizeJsonValue(item)).join(",")}]`;
  }
  if (isPlainObject(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalizeJsonValue(value[key])}`)
      .join(",")}}`;
  }
  throw new TypeError("Canonical JSON contains a non-JSON value.");
}

function chainFailure(path: string): {
  ok: false;
  failure: SignedApprovalEvidenceV1ValidationFailure;
} {
  return {
    ok: false,
    failure: validationFailure(
      "signed_approval.chain_substitution",
      path,
      "Embedded approval chain does not rederive exactly.",
    ),
  };
}

function validationFailure(
  code: SignedApprovalVerificationErrorCode,
  path: string,
  message: string,
): SignedApprovalEvidenceV1ValidationFailure {
  return {
    ok: false,
    evidence: null,
    verification_material: null,
    canonical_payload_base64url: null,
    preimage_base64url: null,
    payload_digest: null,
    signed_approval_evidence_id: null,
    errors: [createContractErrorV1(code, path, message)],
    side_effects: [],
  };
}

function isEmptyArray(value: unknown): value is [] {
  return Array.isArray(value) && value.length === 0;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function escapePointer(value: string): string {
  return value.replaceAll("~", "~0").replaceAll("/", "~1");
}

function encodeUtf8(value: string): Uint8Array {
  const runtime = globalThis as unknown as {
    TextEncoder?: new () => { encode(input: string): Uint8Array };
  };
  if (runtime.TextEncoder === undefined) {
    throw new TypeError("UTF-8 encoding support is unavailable.");
  }
  return new runtime.TextEncoder().encode(value);
}

async function sha256Hex(value: Uint8Array): Promise<string> {
  const runtime = globalThis as unknown as {
    crypto?: {
      subtle: {
        digest(algorithm: "SHA-256", data: Uint8Array): Promise<ArrayBuffer>;
      };
    };
  };
  if (runtime.crypto === undefined) {
    throw new TypeError("SHA-256 support is unavailable.");
  }
  const digest = await runtime.crypto.subtle.digest("SHA-256", value);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

type JsonScanResult = { duplicateKey: boolean; maxDepth: number };

class JsonDepthError extends SyntaxError {}

function scanJson(input: string): JsonScanResult {
  let index = 0;
  let duplicateKey = false;
  let maxDepth = 0;

  function whitespace(): void {
    while (/\s/u.test(input[index] ?? "")) index += 1;
  }

  function stringToken(): string {
    const start = index;
    if (input[index] !== '"') throw new SyntaxError("string expected");
    index += 1;
    while (index < input.length) {
      if (input[index] === "\\") {
        index += 2;
        continue;
      }
      if (input[index] === '"') {
        index += 1;
        return JSON.parse(input.slice(start, index)) as string;
      }
      index += 1;
    }
    throw new SyntaxError("unterminated string");
  }

  function primitive(): void {
    const start = index;
    while (index < input.length && !/[\s,\]}]/u.test(input[index] ?? "")) {
      index += 1;
    }
    if (start === index) throw new SyntaxError("value expected");
  }

  function value(depth: number): void {
    whitespace();
    if (depth > maxInputDepth) throw new JsonDepthError("JSON input too deep");
    maxDepth = Math.max(maxDepth, depth);
    if (input[index] === "{") {
      object(depth + 1);
    } else if (input[index] === "[") {
      array(depth + 1);
    } else if (input[index] === '"') {
      stringToken();
    } else {
      primitive();
    }
    whitespace();
  }

  function object(depth: number): void {
    index += 1;
    whitespace();
    const keys = new Set<string>();
    if (input[index] === "}") {
      index += 1;
      return;
    }
    while (index < input.length) {
      const key = stringToken();
      if (keys.has(key)) duplicateKey = true;
      keys.add(key);
      whitespace();
      if (input[index] !== ":") throw new SyntaxError("colon expected");
      index += 1;
      value(depth);
      if (input[index] === "}") {
        index += 1;
        return;
      }
      if (input[index] !== ",") throw new SyntaxError("comma expected");
      index += 1;
      whitespace();
    }
    throw new SyntaxError("unterminated object");
  }

  function array(depth: number): void {
    index += 1;
    whitespace();
    if (input[index] === "]") {
      index += 1;
      return;
    }
    while (index < input.length) {
      value(depth);
      if (input[index] === "]") {
        index += 1;
        return;
      }
      if (input[index] !== ",") throw new SyntaxError("comma expected");
      index += 1;
    }
    throw new SyntaxError("unterminated array");
  }

  value(0);
  whitespace();
  if (index !== input.length) throw new SyntaxError("trailing input");
  return { duplicateKey, maxDepth };
}
