import { generateKeyPairSync, sign, type KeyObject } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  canonicalizeMobileLeaseStatusPayload,
  canonicalizeMobileResultEvidencePayload,
  canonicalizeMobileWorkloadLeasePayload,
  hashMobileCapabilityManifestPayload,
  hashMobileLeaseStatusPayload,
  hashMobilePolicyDecisionPayload,
  hashMobileResultEvidencePayload,
  hashMobileWorkloadLeasePayload,
  mobileEdgeContract,
  validateMobileCapabilityManifest,
  validateMobileEdgeContractChain,
  validateMobileLeaseStatusEvidence,
  validateMobilePolicyDecision,
  validateMobileResultEvidence,
  validateMobileSignedWorkloadLease,
  verifyMobileLeaseStatusSignature,
  verifyMobileResultEvidenceSignature,
  verifyMobileWorkloadLeaseSignature,
  type MobileCapabilityManifest,
  type MobileEdgeContractChain,
  type MobileEdgeTrustBundle,
  type MobileLeaseStatusEvidence,
  type MobileLeaseTrustKey,
  type MobilePolicyDecision,
  type MobileResultEvidence,
  type MobileSignedWorkloadLease,
  type MobileWorkloadConstraints,
} from "../src/index.js";

const digest = (character: string) => `sha256:${character.repeat(64)}` as const;

const constraints: MobileWorkloadConstraints = {
  resource_limits: {
    max_duration_ms: 120_000,
    max_ram_mb: 2_048,
    max_storage_mb: 512,
    battery_floor_percent: 60,
    charging_required: true,
    max_thermal_state: "fair",
    network: "wifi_only",
    background: "os_scheduled",
    retry_limit: 1,
  },
  data_policy: {
    allowed_data_classes: ["internal"],
    allowed_sensors: ["camera"],
    egress: "local_only",
    result_destination_ref: "result_store:local-only",
    input_retention_seconds: 0,
    output_retention_seconds: 300,
  },
};

const manifestFixture: MobileCapabilityManifest = {
  contract_id: "lnsat.mobile_edge.capability_manifest.v0_1",
  manifest_version: "0.1",
  manifest_ref: "manifest:mobile-device-01",
  manifest_digest: digest("0"),
  device_ref: "device:mobile-01",
  owner_ref: "owner:local-lab",
  tenant_ref: "tenant:local-lab",
  substrate_kind: "mobile_edge",
  management_mode: "lab",
  platform: "ios",
  os_version: "17.5",
  patch_level: "2026-07",
  app_version: "0.1.0",
  architecture: "arm64",
  soc_family: "A17 Pro",
  result_signing_key: {
    key_ref: "key:mobile-result-device-01",
    key_version: "1",
    attestation_evidence_ref: "evidence:device-key-attestation-01",
  },
  compute: {
    accelerator: "gpu_npu",
    supported_precisions: ["fp16", "int8"],
    runtimes: [
      {
        runtime_ref: "runtime:core-ml-v1",
        runtime_digest: digest("c"),
        model_formats: ["Core ML"],
      },
    ],
    ram_budget_mb: 4_096,
    storage_budget_mb: 2_048,
  },
  power: {
    battery_percent: 85,
    charging: true,
    thermal_state: "nominal",
    low_power_mode: false,
    background_posture: "os_scheduled",
  },
  network: {
    transport: "wifi",
    metered: false,
    roaming: false,
    outbound_only: true,
    inbound_listener_allowed: false,
    peer_mesh_allowed: false,
  },
  sensors: [
    { sensor: "camera", os_permission: "granted", policy_allowed: true },
    { sensor: "microphone", os_permission: "denied", policy_allowed: false },
  ],
  supported_workload_classes: ["ocr", "redaction"],
  forbidden_capabilities: ["raw shell", "inbound listener", "peer mesh"],
  model_cache: [{ model_digest: digest("b"), runtime_digest: digest("c") }],
  policy_version: "mobile-policy-1",
  revoked: false,
  quarantined: false,
  observed_at: "2026-07-16T12:00:00.000Z",
  expires_at: "2026-07-16T13:00:00.000Z",
  evidence_refs: ["evidence:manifest-device-01"],
  side_effects: [],
};

const policyFixture: MobilePolicyDecision = {
  contract_id: "lnsat.mobile_edge.policy_decision.v0_1",
  decision_version: "0.1",
  decision_ref: "policy_decision:mobile-01",
  decision_digest: digest("0"),
  packet_ref: "packet:mobile-workload-01",
  device_ref: manifestFixture.device_ref,
  owner_ref: manifestFixture.owner_ref,
  tenant_ref: manifestFixture.tenant_ref,
  operator_ref: "operator:mobile-lab-01",
  session_ref: "session:mobile-lab-01",
  manifest_ref: manifestFixture.manifest_ref,
  manifest_digest: manifestFixture.manifest_digest,
  policy_ref: "policy:mobile-edge-01",
  policy_digest: digest("e"),
  decision: "allow",
  lease_issuance: "eligible",
  required_approval_ref: null,
  approval_evidence_ref: null,
  approved_model_digests: [digest("b")],
  approved_runtime_digests: [digest("c")],
  allowed_workload_classes: ["ocr"],
  constraints,
  reasons: ["Device and workload meet bounded local policy"],
  evaluated_at: "2026-07-16T12:01:00.000Z",
  expires_at: "2026-07-16T12:50:00.000Z",
  evidence_refs: ["evidence:policy-mobile-01"],
  side_effects: [],
};

const leaseFixture: MobileSignedWorkloadLease = {
  contract_id: "lnsat.mobile_edge.signed_workload_lease.v0_1",
  lease_version: "0.1",
  lease_ref: "lease:mobile-workload-01",
  packet_ref: policyFixture.packet_ref,
  device_ref: manifestFixture.device_ref,
  owner_ref: policyFixture.owner_ref,
  tenant_ref: policyFixture.tenant_ref,
  operator_ref: policyFixture.operator_ref,
  session_ref: policyFixture.session_ref,
  manifest_ref: manifestFixture.manifest_ref,
  manifest_digest: manifestFixture.manifest_digest,
  policy_decision_ref: policyFixture.decision_ref,
  policy_decision_digest: policyFixture.decision_digest,
  approval_evidence_ref: null,
  model_digest: digest("b"),
  runtime_digest: digest("c"),
  workload_class: "ocr",
  input_refs: ["input:camera-frame-set-01"],
  constraints,
  issued_at: "2026-07-16T12:02:00.000Z",
  not_before: "2026-07-16T12:02:00.000Z",
  expires_at: "2026-07-16T12:40:00.000Z",
  cancellation_ref: "cancellation:mobile-workload-01",
  nonce: "nonce-mobile-workload-01",
  idempotency_key: "idempotency-mobile-workload-01",
  checkpoint_required: true,
  evidence_obligations: ["evidence:mobile-result", "evidence:resource-usage"],
  signature: {
    algorithm: "Ed25519",
    key_ref: "key:mobile-lease-issuer-01",
    key_version: "1",
    signed_payload_digest: digest("0"),
    signature_base64url: "A".repeat(86),
  },
  side_effects: [],
};

const statusFixture: MobileLeaseStatusEvidence = {
  contract_id: "lnsat.mobile_edge.lease_status_evidence.v0_1",
  status_version: "0.1",
  status_ref: "lease_status:mobile-workload-01-1",
  lease_ref: leaseFixture.lease_ref,
  cancellation_ref: leaseFixture.cancellation_ref,
  sequence: 1,
  status: "active",
  observed_at: "2026-07-16T12:02:30.000Z",
  expires_at: "2026-07-16T12:07:30.000Z",
  evidence_refs: ["evidence:lease-active-01"],
  signature: {
    algorithm: "Ed25519",
    key_ref: leaseFixture.signature.key_ref,
    key_version: leaseFixture.signature.key_version,
    signed_payload_digest: digest("0"),
    signature_base64url: "A".repeat(86),
  },
  side_effects: [],
};

const resultFixture: MobileResultEvidence = {
  contract_id: "lnsat.mobile_edge.result_evidence.v0_1",
  result_version: "0.1",
  result_ref: "result:mobile-workload-01",
  lease_ref: leaseFixture.lease_ref,
  packet_ref: leaseFixture.packet_ref,
  device_ref: leaseFixture.device_ref,
  owner_ref: leaseFixture.owner_ref,
  tenant_ref: leaseFixture.tenant_ref,
  operator_ref: leaseFixture.operator_ref,
  session_ref: leaseFixture.session_ref,
  manifest_digest: leaseFixture.manifest_digest,
  policy_decision_digest: leaseFixture.policy_decision_digest,
  model_digest: leaseFixture.model_digest,
  runtime_digest: leaseFixture.runtime_digest,
  input_refs: leaseFixture.input_refs,
  result_destination_ref: constraints.data_policy.result_destination_ref,
  egress: constraints.data_policy.egress,
  status: "completed",
  started_at: "2026-07-16T12:03:00.000Z",
  finished_at: "2026-07-16T12:04:00.000Z",
  output_refs: ["output:mobile-workload-01-redacted"],
  error_codes: [],
  resource_usage: {
    duration_ms: 60_000,
    peak_ram_mb: 1_024,
    storage_written_mb: 16,
    retry_count: 0,
  },
  verification: {
    lease_signature_verified: true,
    device_binding_verified: true,
    policy_valid_at_start: true,
    model_digest_verified: true,
    runtime_digest_verified: true,
    output_filter_passed: true,
  },
  evidence_refs: ["evidence:mobile-result", "evidence:resource-usage"],
  signature: {
    algorithm: "Ed25519",
    key_ref: manifestFixture.result_signing_key.key_ref,
    key_version: manifestFixture.result_signing_key.key_version,
    signed_payload_digest: digest("0"),
    signature_base64url: "A".repeat(86),
  },
  publication_performed: false,
  side_effects: [],
};

function trustKey(
  keyRef: string,
  keyVersion: string,
  publicKey: KeyObject,
): MobileLeaseTrustKey {
  return {
    key_ref: keyRef,
    key_version: keyVersion,
    public_key_spki_base64url: publicKey
      .export({ format: "der", type: "spki" })
      .toString("base64url"),
    valid_from: "2026-07-16T11:00:00.000Z",
    valid_until: "2026-07-16T14:00:00.000Z",
    revoked: false,
  };
}

async function signLease(value: MobileSignedWorkloadLease, privateKey: KeyObject) {
  value.signature.signed_payload_digest = await hashMobileWorkloadLeasePayload(value);
  value.signature.signature_base64url = sign(
    null,
    Buffer.from(canonicalizeMobileWorkloadLeasePayload(value)),
    privateKey,
  ).toString("base64url");
}

async function signStatus(value: MobileLeaseStatusEvidence, privateKey: KeyObject) {
  value.signature.signed_payload_digest = await hashMobileLeaseStatusPayload(value);
  value.signature.signature_base64url = sign(
    null,
    Buffer.from(canonicalizeMobileLeaseStatusPayload(value)),
    privateKey,
  ).toString("base64url");
}

async function signResult(value: MobileResultEvidence, privateKey: KeyObject) {
  value.signature.signed_payload_digest = await hashMobileResultEvidencePayload(value);
  value.signature.signature_base64url = sign(
    null,
    Buffer.from(canonicalizeMobileResultEvidencePayload(value)),
    privateKey,
  ).toString("base64url");
}

async function signedBundle(): Promise<{
  chain: MobileEdgeContractChain;
  trustBundle: MobileEdgeTrustBundle;
  issuerPrivateKey: KeyObject;
  devicePrivateKey: KeyObject;
}> {
  const issuer = generateKeyPairSync("ed25519");
  const device = generateKeyPairSync("ed25519");
  const manifest = structuredClone(manifestFixture);
  const policy = structuredClone(policyFixture);
  const lease = structuredClone(leaseFixture);
  const leaseStatus = structuredClone(statusFixture);
  const result = structuredClone(resultFixture);

  manifest.manifest_digest = await hashMobileCapabilityManifestPayload(manifest);
  policy.manifest_digest = manifest.manifest_digest;
  policy.decision_digest = await hashMobilePolicyDecisionPayload(policy);
  lease.manifest_digest = manifest.manifest_digest;
  lease.policy_decision_digest = policy.decision_digest;
  result.manifest_digest = manifest.manifest_digest;
  result.policy_decision_digest = policy.decision_digest;
  await signLease(lease, issuer.privateKey);
  await signStatus(leaseStatus, issuer.privateKey);
  await signResult(result, device.privateKey);

  return {
    chain: {
      manifest,
      policy_decision: policy,
      workload_lease: lease,
      lease_status: leaseStatus,
      result_evidence: result,
    },
    trustBundle: {
      lease_issuer: trustKey(
        lease.signature.key_ref,
        lease.signature.key_version,
        issuer.publicKey,
      ),
      device_result: trustKey(
        result.signature.key_ref,
        result.signature.key_version,
        device.publicKey,
      ),
      lease_status_head: {
        lease_ref: leaseStatus.lease_ref,
        status_ref: leaseStatus.status_ref,
        sequence: leaseStatus.sequence,
        status: leaseStatus.status,
        observed_at: leaseStatus.observed_at,
        evidence_ref: leaseStatus.evidence_refs[0]!,
      },
    },
    issuerPrivateKey: issuer.privateKey,
    devicePrivateKey: device.privateKey,
  };
}

describe("mobile edge source-only contracts", () => {
  it("validates source-only manifest, policy, lease, status, and result shapes", async () => {
    const { chain } = await signedBundle();
    expect(mobileEdgeContract).toMatchObject({
      authority: "source_contract_only_no_runtime_dispatch",
      native_app_allowed: false,
      enrollment_allowed: false,
      network_allowed: false,
      model_transfer_allowed: false,
      inference_allowed: false,
      runtime_dispatch_allowed: false,
      side_effects: [],
    });
    for (const result of [
      validateMobileCapabilityManifest(chain.manifest),
      validateMobilePolicyDecision(chain.policy_decision),
      validateMobileSignedWorkloadLease(chain.workload_lease),
      validateMobileLeaseStatusEvidence(chain.lease_status),
      validateMobileResultEvidence(chain.result_evidence),
    ]) {
      expect(result.ok).toBe(true);
      expect(result.side_effects).toEqual([]);
      if (result.ok) expect(Object.isFrozen(result.value)).toBe(true);
    }
  });

  it("verifies issuer lease/status, device result, and historical binding chain", async () => {
    const { chain, trustBundle } = await signedBundle();
    const checks = await Promise.all([
      verifyMobileWorkloadLeaseSignature(
        chain.workload_lease,
        trustBundle.lease_issuer,
      ),
      verifyMobileLeaseStatusSignature(chain.lease_status, trustBundle.lease_issuer),
      verifyMobileResultEvidenceSignature(
        chain.result_evidence,
        trustBundle.device_result,
      ),
      validateMobileEdgeContractChain(chain, trustBundle, "2026-07-16T13:05:00.000Z"),
    ]);
    expect(checks.every((result) => result.ok)).toBe(true);
  });

  it("fails closed on unknown fields, secrets, cyclic input, unsafe arrays, and short signatures", () => {
    const unknown = structuredClone(manifestFixture) as MobileCapabilityManifest & {
      compute: MobileCapabilityManifest["compute"] & { hidden_override?: boolean };
    };
    unknown.compute.hidden_override = true;
    const secret = { ...manifestFixture, api_key: "sk-test-redacted" };
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    const symbolArray = structuredClone(manifestFixture);
    Reflect.defineProperty(symbolArray.compute.supported_precisions, Symbol("hidden"), {
      value: "fp32",
      enumerable: true,
    });
    const accessorArray = structuredClone(manifestFixture);
    Reflect.defineProperty(accessorArray.compute.supported_precisions, "0", {
      get: () => "fp16",
      enumerable: true,
      configurable: true,
    });
    const shortSignature = structuredClone(leaseFixture);
    shortSignature.signature.signature_base64url = "A".repeat(40);

    const results = [
      validateMobileCapabilityManifest(unknown),
      validateMobileCapabilityManifest(secret),
      validateMobileCapabilityManifest(cyclic),
      validateMobileCapabilityManifest(symbolArray),
      validateMobileCapabilityManifest(accessorArray),
      validateMobileSignedWorkloadLease(shortSignature),
    ];
    expect(results.every((result) => !result.ok)).toBe(true);
    for (const result of results) {
      if (!result.ok) expect(result.raw_input_content).toBe("withheld");
    }
  });

  it("rejects inconsistent policy, lease windows, and unfiltered publication", () => {
    const policy = structuredClone(policyFixture);
    policy.decision = "approval_required";
    policy.lease_issuance = "eligible";
    const lease = structuredClone(leaseFixture);
    lease.expires_at = lease.not_before;
    const result = structuredClone(resultFixture);
    result.output_refs = [];
    result.verification.output_filter_passed = false;
    result.publication_performed = true as false;

    expect(validateMobilePolicyDecision(policy).ok).toBe(false);
    expect(validateMobileSignedWorkloadLease(lease).ok).toBe(false);
    const resultValidation = validateMobileResultEvidence(result);
    expect(resultValidation.ok).toBe(false);
    if (!resultValidation.ok)
      expect(resultValidation.errors.map((item) => item.code)).toEqual(
        expect.arrayContaining([
          "mobile_edge.result.output_required",
          "mobile_edge.result.output_filter_required",
          "mobile_edge.result.publication_forbidden",
        ]),
      );
  });

  it("rejects content tampering, wrong key version, revoked key, and invalid signature", async () => {
    const { chain, trustBundle } = await signedBundle();
    const tampered = structuredClone(chain.workload_lease);
    tampered.model_digest = digest("f");
    const wrongVersion = {
      ...trustBundle.lease_issuer,
      key_version: "2",
    };
    const revoked = { ...trustBundle.lease_issuer, revoked: true };
    const invalidSignature = structuredClone(chain.workload_lease);
    invalidSignature.signature.signature_base64url = "A".repeat(86);

    const results = await Promise.all([
      verifyMobileWorkloadLeaseSignature(tampered, trustBundle.lease_issuer),
      verifyMobileWorkloadLeaseSignature(chain.workload_lease, wrongVersion),
      verifyMobileWorkloadLeaseSignature(chain.workload_lease, revoked),
      verifyMobileWorkloadLeaseSignature(invalidSignature, trustBundle.lease_issuer),
    ]);
    const codes = results.flatMap((result) =>
      result.ok ? [] : result.errors.map((item) => item.code),
    );
    expect(results.every((result) => !result.ok)).toBe(true);
    expect(codes).toEqual(
      expect.arrayContaining([
        "mobile_edge.lease.signed_payload_digest_mismatch",
        "mobile_edge.lease.signature_key_mismatch",
        "mobile_edge.lease.trust_key_revoked",
        "mobile_edge.lease.signature_invalid",
      ]),
    );
  });

  it("rejects stale manifest/policy digests and widened authenticated result evidence", async () => {
    const { chain, trustBundle, devicePrivateKey } = await signedBundle();
    const widened = structuredClone(chain);
    widened.manifest.power.charging = false;
    widened.policy_decision.allowed_workload_classes.push("redaction");
    widened.result_evidence.evidence_refs = ["evidence:mobile-result"];
    widened.result_evidence.result_destination_ref = "result_store:wrong";
    widened.result_evidence.egress = "approved_relay";
    widened.result_evidence.input_refs = ["input:wrong-frame-set"];
    widened.result_evidence.resource_usage.duration_ms = 1;
    await signResult(widened.result_evidence, devicePrivateKey);

    const result = await validateMobileEdgeContractChain(
      widened,
      trustBundle,
      "2026-07-16T13:05:00.000Z",
    );
    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(result.errors.map((item) => item.code)).toEqual(
        expect.arrayContaining([
          "mobile_edge.chain.manifest_content_digest_mismatch",
          "mobile_edge.chain.policy_content_digest_mismatch",
          "mobile_edge.chain.evidence_obligation_missing",
          "mobile_edge.chain.result_destination_mismatch",
          "mobile_edge.chain.egress_mismatch",
          "mobile_edge.chain.input_refs_mismatch",
          "mobile_edge.chain.result_budget_exceeded",
          "mobile_edge.chain.power_not_eligible",
        ]),
      );
  });

  it("rejects signed cancellation state and future completion evidence", async () => {
    const { chain, trustBundle, issuerPrivateKey } = await signedBundle();
    const cancelled = structuredClone(chain);
    cancelled.lease_status.status = "cancelled";
    await signStatus(cancelled.lease_status, issuerPrivateKey);
    trustBundle.lease_status_head.status = "cancelled";

    const result = await validateMobileEdgeContractChain(
      cancelled,
      trustBundle,
      "2026-07-16T12:03:30.000Z",
    );
    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(result.errors.map((item) => item.code)).toEqual(
        expect.arrayContaining([
          "mobile_edge.chain.lease_revoked_or_cancelled",
          "mobile_edge.chain.future_result_evidence",
        ]),
      );
  });

  it("rejects stale signed active status behind trusted cancellation head", async () => {
    const { chain, trustBundle } = await signedBundle();
    trustBundle.lease_status_head = {
      lease_ref: chain.lease_status.lease_ref,
      status_ref: "lease_status:mobile-workload-01-2",
      sequence: 2,
      status: "cancelled",
      observed_at: "2026-07-16T12:02:45.000Z",
      evidence_ref: "evidence:lease-cancelled-02",
    };

    const result = await validateMobileEdgeContractChain(
      chain,
      trustBundle,
      "2026-07-16T13:05:00.000Z",
    );
    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(result.errors.map((item) => item.code)).toContain(
        "mobile_edge.chain.stale_lease_status",
      );
  });
});
