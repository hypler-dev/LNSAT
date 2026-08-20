import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  createApprovalRequestV1,
  decideApprovalRequestV1,
  decidePacketEnvelopePolicyV1,
  deriveApprovalVerificationMaterialRefV1,
  deriveSignedApprovalEvidenceIdentityV1,
  signedApprovalVerificationErrorCodes,
} from "../packages/policy/dist/index.js";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const packetFixture = JSON.parse(
  await readFile(
    join(repoRoot, "fixtures/contracts/packet-envelope-v1_0.json"),
    "utf8",
  ),
);
const approvalFixture = JSON.parse(
  await readFile(
    join(repoRoot, "fixtures/contracts/approval-evidence-v1_0.json"),
    "utf8",
  ),
);
const approvalVector = approvalFixture.vectors[0];
const sourcePacket = packetFixture.vectors.find(
  ({ case_id: caseId }) => caseId === approvalVector.packet_vector.case_id,
)?.packet;
if (sourcePacket === undefined) throw new Error("approval packet vector missing");

const packet = structuredClone(sourcePacket);
packet.permission_envelope.allow = [
  ...approvalVector.packet_vector.permission_allow_override,
];
const policyResult = await decidePacketEnvelopePolicyV1(packet, {
  evaluated_at: approvalVector.policy_evaluated_at,
});
if (!policyResult.ok) throw new Error("policy vector must validate");
const requestResult = await createApprovalRequestV1(policyResult.policy_decision, {
  requested_at: approvalVector.requested_at,
});
if (!requestResult.ok) throw new Error("request vector must validate");
const decisionResult = await decideApprovalRequestV1(requestResult.approval_request, {
  approver_ref: approvalVector.approver_ref,
  approver_session_ref: approvalVector.approver_session_ref,
  decision: approvalVector.decision,
  reason_code: approvalVector.reason_code,
  decided_at: approvalVector.decided_at,
});
if (!decisionResult.ok) throw new Error("decision vector must validate");

const publicKeyHex = "d75a980182b10ab7d54bfed3c964073a0ee172f3daa62325af021a68f707511a";
const publicSpkiHex = `302a300506032b6570032100${publicKeyHex}`;
const publicSignatureHex =
  "e5564300c360ac729086e2cc806e828a84877f1eb8e5d974d873e06522490155" +
  "5fb8821590a33bacc61e39701cf9b46bd25bf5f0595bbe24655141438e7a100b";
const base64urlFromHex = (value) => Buffer.from(value, "hex").toString("base64url");

const materialWithoutRef = {
  contract_version: "lnsat.contracts.v1_0",
  schema_id: "lnsat.approval_verification_material.schema.v1_0",
  verification_material_ref: `avm_${"0".repeat(64)}`,
  signing_key_id: "key:approval-signing:phase7b-conformance",
  signing_key_version: "2",
  signature_profile: "lnsat.signed_approval_signature.ed25519.v1_0",
  public_key_spki_base64url: base64urlFromHex(publicSpkiHex),
  valid_from: "2026-07-22T19:00:00Z",
  sign_until: "2026-07-22T20:10:00Z",
  verify_until: "2026-07-22T21:00:00Z",
  supersedes_key_version: "1",
  side_effects: [],
};
const material = {
  ...materialWithoutRef,
  verification_material_ref:
    await deriveApprovalVerificationMaterialRefV1(materialWithoutRef),
};
const payload = {
  packet,
  packet_hash: policyResult.policy_decision.packet_ref.packet_hash,
  policy_decision: policyResult.policy_decision,
  approval_request: requestResult.approval_request,
  approval_decision: decisionResult.approval_decision,
  issued_at: "2026-07-22T20:03:00Z",
  expires_at: decisionResult.approval_decision.expires_at,
  nonce_id: `nonce_${"a".repeat(64)}`,
  signing_key_id: material.signing_key_id,
  signing_key_version: material.signing_key_version,
  verification_material_ref: material.verification_material_ref,
  approval_gate_satisfied: decisionResult.approval_decision.approval_gate_satisfied,
  server_signed: true,
  execution_authorized: false,
  session_authority_state_changed: false,
  mutation_authority: false,
};
const identity = await deriveSignedApprovalEvidenceIdentityV1(payload);
const evidence = {
  contract_version: "lnsat.contracts.v1_0",
  schema_id: "lnsat.signed_approval_evidence.schema.v1_0",
  signed_approval_evidence_id: identity.signed_approval_evidence_id,
  payload,
  payload_digest: identity.payload_digest,
  signature: {
    signature_profile: "lnsat.signed_approval_signature.ed25519.v1_0",
    signature_base64url: base64urlFromHex(publicSignatureHex),
  },
  side_effects: [],
};

const statusSnapshot = {
  verification_material_ref: material.verification_material_ref,
  signing_key_id: material.signing_key_id,
  signing_key_version: material.signing_key_version,
  lifecycle_state: "active",
  status_revision: "2",
  designated_signing_key_version: "2",
  as_of: "2026-07-22T20:03:30Z",
  next_update: "2026-07-22T20:10:00Z",
  revoked_at: null,
  requester_session_active: true,
  approver_session_active: true,
  policy_active: true,
  approval_active: true,
  nonce_replayed: false,
  decision_evidence_conflict: false,
};

const rejectedResult = (code, path) => ({
  contract: "lnsat.signed_approval_verification.v1_0",
  contract_version: "lnsat.contracts.v1_0",
  ok: false,
  status: "rejected",
  signed_approval_evidence_id: null,
  payload_digest: null,
  signing_key_id: null,
  signing_key_version: null,
  verification_material_ref: null,
  verified_at: "2026-07-22T20:04:00Z",
  cryptographic_signature_valid: false,
  chain_valid: false,
  current_status_valid: false,
  approval_gate_satisfied: false,
  server_signed: false,
  execution_authorized: false,
  session_authority_state_changed: false,
  mutation_authority: false,
  errors: [
    {
      code,
      path,
      message: "Conformance rejection.",
      severity: "error",
    },
  ],
  side_effects: [],
});

async function makeVector({
  caseId,
  expectedError,
  expectedPath,
  mutateEvidence,
  mutateMaterial,
  recomputeIdentity = false,
  rawTransform,
}) {
  const vectorEvidence = structuredClone(evidence);
  const vectorMaterial = structuredClone(material);
  mutateEvidence?.(vectorEvidence);
  mutateMaterial?.(vectorMaterial);
  if (recomputeIdentity) {
    const derived = await deriveSignedApprovalEvidenceIdentityV1(
      vectorEvidence.payload,
    );
    vectorEvidence.payload_digest = derived.payload_digest;
    vectorEvidence.signed_approval_evidence_id = derived.signed_approval_evidence_id;
  }
  const derived = await deriveSignedApprovalEvidenceIdentityV1(vectorEvidence.payload);
  const raw =
    rawTransform?.(JSON.stringify(vectorEvidence)) ?? JSON.stringify(vectorEvidence);
  return {
    case_id: caseId,
    vector_kind: "negative",
    raw_evidence_json: raw,
    verification_material: vectorMaterial,
    status_snapshot: statusSnapshot,
    verified_at: "2026-07-22T20:04:00Z",
    expected_validation: expectedError,
    expected_result: rejectedResult(expectedError, expectedPath),
    expected_canonical_payload_base64url: derived.canonical_payload_base64url,
    expected_preimage_base64url: derived.preimage_base64url,
    expected_payload_digest: derived.payload_digest,
    expected_evidence_id: derived.signed_approval_evidence_id,
  };
}

const vectors = [
  {
    case_id: "valid_structure_crypto_unavailable",
    vector_kind: "positive_structure",
    raw_evidence_json: JSON.stringify(evidence),
    verification_material: material,
    status_snapshot: statusSnapshot,
    verified_at: "2026-07-22T20:04:00Z",
    expected_validation: "ok",
    expected_result: {
      ...rejectedResult("signed_approval.verification_unavailable", ""),
      signed_approval_evidence_id: evidence.signed_approval_evidence_id,
      payload_digest: evidence.payload_digest,
      signing_key_id: evidence.payload.signing_key_id,
      signing_key_version: evidence.payload.signing_key_version,
      verification_material_ref: evidence.payload.verification_material_ref,
      chain_valid: true,
      approval_gate_satisfied: true,
    },
    expected_canonical_payload_base64url: identity.canonical_payload_base64url,
    expected_preimage_base64url: identity.preimage_base64url,
    expected_payload_digest: identity.payload_digest,
    expected_evidence_id: identity.signed_approval_evidence_id,
  },
  await makeVector({
    caseId: "algorithm_profile_confusion",
    expectedError: "signed_approval.unsupported_signature_profile",
    expectedPath: "/signature/signature_profile",
    mutateEvidence: (value) => {
      value.signature.signature_profile = "lnsat.mobile_edge_signature.ed25519.v0_1";
    },
  }),
  await makeVector({
    caseId: "padded_signature_encoding",
    expectedError: "signed_approval.signature_malformed",
    expectedPath: "/signature/signature_base64url",
    mutateEvidence: (value) => {
      value.signature.signature_base64url += "=";
    },
  }),
  await makeVector({
    caseId: "signing_key_substitution",
    expectedError: "signed_approval.chain_substitution",
    expectedPath: "/payload/signing_key_id",
    mutateEvidence: (value) => {
      value.payload.signing_key_id = "key:approval-signing:substituted-lineage";
    },
    recomputeIdentity: true,
  }),
  await makeVector({
    caseId: "signing_key_version_downgrade",
    expectedError: "signed_approval.key_version_downgrade",
    expectedPath: "/payload/signing_key_version",
    mutateEvidence: (value) => {
      value.payload.signing_key_version = "1";
    },
    recomputeIdentity: true,
  }),
  await makeVector({
    caseId: "packet_array_order_drift",
    expectedError: "signed_approval.chain_invalid",
    expectedPath: "/payload/packet",
    mutateEvidence: (value) => {
      value.payload.packet.permission_envelope.block.reverse();
    },
  }),
  await makeVector({
    caseId: "packet_project_substitution",
    expectedError: "signed_approval.chain_substitution",
    expectedPath: "/payload/policy_decision",
    mutateEvidence: (value) => {
      value.payload.packet.project_ref = "project:substituted";
    },
  }),
  await makeVector({
    caseId: "expiry_extension_forbidden",
    expectedError: "signed_approval.invalid_time_window",
    expectedPath: "/payload",
    mutateEvidence: (value) => {
      value.payload.expires_at = "2026-07-22T20:16:00Z";
    },
  }),
  await makeVector({
    caseId: "nonce_encoding_malformed",
    expectedError: "signed_approval.invalid_nonce",
    expectedPath: "/payload",
    mutateEvidence: (value) => {
      value.payload.nonce_id = `nonce_${"A".repeat(64)}`;
    },
  }),
  await makeVector({
    caseId: "execution_authority_widening",
    expectedError: "signed_approval.invalid_field",
    expectedPath: "/payload",
    mutateEvidence: (value) => {
      value.payload.execution_authorized = true;
    },
  }),
  await makeVector({
    caseId: "payload_digest_substitution",
    expectedError: "signed_approval.payload_digest_mismatch",
    expectedPath: "/payload_digest",
    mutateEvidence: (value) => {
      value.payload.issued_at = "2026-07-22T20:03:01Z";
    },
  }),
  await makeVector({
    caseId: "verification_material_substitution",
    expectedError: "signed_approval.chain_substitution",
    expectedPath: "/verification_material/verification_material_ref",
    mutateMaterial: (value) => {
      const bytes = Buffer.from(value.public_key_spki_base64url, "base64url");
      bytes[bytes.length - 1] ^= 1;
      value.public_key_spki_base64url = bytes.toString("base64url");
    },
  }),
  await makeVector({
    caseId: "padded_public_key_encoding",
    expectedError: "signed_approval.invalid_field",
    expectedPath: "/verification_material",
    mutateMaterial: (value) => {
      value.public_key_spki_base64url += "=";
    },
  }),
  await makeVector({
    caseId: "unexpected_wrapper_field",
    expectedError: "signed_approval.unexpected_field",
    expectedPath: "/public_label",
    mutateEvidence: (value) => {
      value.public_label = "phase7b";
    },
  }),
  await makeVector({
    caseId: "duplicate_wrapper_schema_key",
    expectedError: "signed_approval.invalid_json",
    expectedPath: "",
    rawTransform: (raw) =>
      raw.replace(
        '"schema_id":',
        '"schema_id":"lnsat.signed_approval_evidence.schema.v1_0","schema_id":',
      ),
  }),
  await makeVector({
    caseId: "forbidden_db_password_field",
    expectedError: "signed_approval.invalid_field",
    expectedPath: "/db_password",
    mutateEvidence: (value) => {
      value.db_password = "forbidden";
    },
  }),
  await makeVector({
    caseId: "forbidden_api_token_field",
    expectedError: "signed_approval.invalid_field",
    expectedPath: "/payload/api_token",
    mutateEvidence: (value) => {
      value.payload.api_token = "forbidden";
    },
  }),
  await makeVector({
    caseId: "forbidden_client_secret_material_field",
    expectedError: "signed_approval.invalid_field",
    expectedPath: "/verification_material/client_secret",
    mutateMaterial: (value) => {
      value.client_secret = "forbidden";
    },
  }),
  await makeVector({
    caseId: "missing_verification_material_field",
    expectedError: "signed_approval.missing_field",
    expectedPath: "/verification_material/verify_until",
    mutateMaterial: (value) => {
      delete value.verify_until;
    },
  }),
  await makeVector({
    caseId: "unexpected_verification_material_field",
    expectedError: "signed_approval.unexpected_field",
    expectedPath: "/verification_material/public_label",
    mutateMaterial: (value) => {
      value.public_label = "phase7b";
    },
  }),
];

const fixture = {
  schema: "lnsat.signed_approval_evidence.conformance_vectors.v1_0",
  provenance: {
    packet_vector: "fixtures/contracts/packet-envelope-v1_0.json",
    approval_vector: "fixtures/contracts/approval-evidence-v1_0.json",
    public_ed25519_bytes: "RFC 8032 section 7.1 test 1 public key and signature only",
    signature_semantics:
      "Structural encoding fixture only; not a signature over the LNSAT preimage",
    private_material_included: false,
    runtime_signing_performed: false,
    production_signature_verification_performed: false,
    error_codes: signedApprovalVerificationErrorCodes,
  },
  vectors,
  operational_threat_expectations: [
    {
      case_id: "nonce_already_seen",
      status_mutation: "nonce_replayed",
      expected_error: "signed_approval.nonce_replayed",
    },
    {
      case_id: "signing_key_revoked",
      status_mutation: "key_revoked",
      expected_error: "signed_approval.key_revoked",
    },
    {
      case_id: "requester_session_revoked",
      status_mutation: "requester_session_revoked",
      expected_error: "signed_approval.requester_session_revoked",
    },
    {
      case_id: "approver_session_revoked",
      status_mutation: "approver_session_revoked",
      expected_error: "signed_approval.approver_session_revoked",
    },
    {
      case_id: "policy_revoked",
      status_mutation: "policy_revoked",
      expected_error: "signed_approval.policy_revoked",
    },
    {
      case_id: "approval_revoked",
      status_mutation: "approval_revoked",
      expected_error: "signed_approval.approval_revoked",
    },
  ],
};

const jsonlRecords = [
  ...vectors.map((vector) => ({
    schema: fixture.schema,
    provenance: fixture.provenance,
    ...vector,
  })),
  ...fixture.operational_threat_expectations.map((expectation) => {
    const status = structuredClone(statusSnapshot);
    if (expectation.status_mutation === "nonce_replayed") {
      status.nonce_replayed = true;
    } else if (expectation.status_mutation === "key_revoked") {
      status.lifecycle_state = "revoked";
      status.revoked_at = "2026-07-22T20:03:45Z";
    } else if (expectation.status_mutation === "requester_session_revoked") {
      status.requester_session_active = false;
    } else if (expectation.status_mutation === "approver_session_revoked") {
      status.approver_session_active = false;
    } else if (expectation.status_mutation === "policy_revoked") {
      status.policy_active = false;
    } else if (expectation.status_mutation === "approval_revoked") {
      status.approval_active = false;
    }
    return {
      schema: fixture.schema,
      provenance: fixture.provenance,
      case_id: expectation.case_id,
      vector_kind: "future_operational_negative",
      raw_evidence_json: JSON.stringify(evidence),
      verification_material: material,
      status_snapshot: status,
      verified_at: "2026-07-22T20:04:00Z",
      expected_validation: "future_operational_verifier",
      expected_result: rejectedResult(expectation.expected_error, ""),
      expected_canonical_payload_base64url: identity.canonical_payload_base64url,
      expected_preimage_base64url: identity.preimage_base64url,
      expected_payload_digest: identity.payload_digest,
      expected_evidence_id: identity.signed_approval_evidence_id,
    };
  }),
];
await writeFile(
  join(repoRoot, "fixtures/contracts/signed-approval-evidence-v1_0.jsonl"),
  `${jsonlRecords.map((record) => JSON.stringify(record)).join("\n")}\n`,
  "utf8",
);
