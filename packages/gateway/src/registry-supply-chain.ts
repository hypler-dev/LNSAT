import { createHash } from "node:crypto";
import { validatePublicHttpsTarget } from "./network-security.js";

const quarantinedRegistryEntryBrand = Symbol("lnsat.registry.quarantined_entry");

export type RegistryServerMetadata = {
  registry_profile: "official_preview" | "private";
  namespace: string;
  server_name: string;
  version: string;
  package_ref: string;
  package_digest: string;
  source_url: string;
  permissions: string[];
  environment_refs: string[];
  network_targets: string[];
  sbom_ref: string;
  provenance_ref: string;
  signature_ref: string;
  vulnerability_inventory_ref: string;
  published_at: string;
};

export interface RegistryNamespaceVerifier {
  verifyNamespace(input: {
    registry_profile: "official_preview" | "private";
    namespace: string;
  }): Promise<{ ok: true; publisher_ref: string } | { ok: false }>;
}

export type QuarantinedRegistryEntry = {
  status: "quarantined";
  metadata: RegistryServerMetadata;
  metadata_digest: string;
  publisher_ref: string;
  namespace_verified: true;
  namespace_verification_grants_authority: false;
  auto_install: false;
  auto_enable: false;
  auto_authorize: false;
  auto_execute: false;
  action_authorized: false;
  side_effects: [];
  readonly [quarantinedRegistryEntryBrand]: true;
};

export async function quarantineRegistryEntry(input: {
  metadata: RegistryServerMetadata;
  source_resolved_ips: string[];
  source_redirect_chain: string[];
  namespace_verifier: RegistryNamespaceVerifier;
}): Promise<
  | { ok: true; entry: QuarantinedRegistryEntry; side_effects: [] }
  | {
      ok: false;
      error_code:
        | "gateway.registry.invalid_metadata"
        | "gateway.registry.source_blocked"
        | "gateway.registry.namespace_unverified";
      side_effects: [];
    }
> {
  if (!isValidRegistryMetadata(input.metadata)) {
    return registryFailure("gateway.registry.invalid_metadata");
  }
  const source = validatePublicHttpsTarget({
    url: input.metadata.source_url,
    resolved_ips: input.source_resolved_ips,
    redirect_chain: input.source_redirect_chain,
  });
  if (!source.ok) return registryFailure("gateway.registry.source_blocked");
  let namespace: Awaited<ReturnType<RegistryNamespaceVerifier["verifyNamespace"]>>;
  try {
    namespace = await input.namespace_verifier.verifyNamespace({
      registry_profile: input.metadata.registry_profile,
      namespace: input.metadata.namespace,
    });
  } catch {
    namespace = { ok: false };
  }
  if (!namespace.ok || !safeLabel(namespace.publisher_ref, 512)) {
    return registryFailure("gateway.registry.namespace_unverified");
  }
  return {
    ok: true,
    entry: {
      status: "quarantined",
      metadata: structuredClone(input.metadata),
      metadata_digest: digestCanonical(input.metadata),
      publisher_ref: namespace.publisher_ref,
      namespace_verified: true,
      namespace_verification_grants_authority: false,
      auto_install: false,
      auto_enable: false,
      auto_authorize: false,
      auto_execute: false,
      action_authorized: false,
      side_effects: [],
      [quarantinedRegistryEntryBrand]: true,
    },
    side_effects: [],
  };
}

export type RegistryReviewEvidence = {
  reviewer_ref: string;
  reviewed_package_version: string;
  reviewed_package_digest: string;
  source_reviewed: boolean;
  permissions_reviewed: boolean;
  environment_refs_reviewed: boolean;
  network_behavior_reviewed: boolean;
  sbom_reviewed: boolean;
  provenance_reviewed: boolean;
  signature_reviewed: boolean;
  vulnerabilities_reviewed: boolean;
};

export function reviewQuarantinedRegistryEntry(input: {
  entry: QuarantinedRegistryEntry;
  evidence: RegistryReviewEvidence;
}):
  | {
      ok: true;
      status: "catalog_eligible_disabled";
      metadata_digest: string;
      reviewer_ref: string;
      installed: false;
      enabled: false;
      action_authorized: false;
      executable: false;
      side_effects: [];
    }
  | {
      ok: false;
      error_code:
        "gateway.registry.review_incomplete" | "gateway.registry.version_substitution";
      side_effects: [];
    } {
  if (input.entry[quarantinedRegistryEntryBrand] !== true) {
    return registryReviewFailure("gateway.registry.review_incomplete");
  }
  const evidence = input.evidence;
  if (!isPlainObject(evidence)) {
    return registryReviewFailure("gateway.registry.review_incomplete");
  }
  if (
    evidence.reviewed_package_version !== input.entry.metadata.version ||
    evidence.reviewed_package_digest !== input.entry.metadata.package_digest
  ) {
    return registryReviewFailure("gateway.registry.version_substitution");
  }
  if (
    !safeLabel(evidence.reviewer_ref, 512) ||
    ![
      evidence.source_reviewed,
      evidence.permissions_reviewed,
      evidence.environment_refs_reviewed,
      evidence.network_behavior_reviewed,
      evidence.sbom_reviewed,
      evidence.provenance_reviewed,
      evidence.signature_reviewed,
      evidence.vulnerabilities_reviewed,
    ].every((value) => value === true)
  ) {
    return registryReviewFailure("gateway.registry.review_incomplete");
  }
  return {
    ok: true,
    status: "catalog_eligible_disabled",
    metadata_digest: input.entry.metadata_digest,
    reviewer_ref: evidence.reviewer_ref,
    installed: false,
    enabled: false,
    action_authorized: false,
    executable: false,
    side_effects: [],
  };
}

export function compareRegistryEntryVersion(input: {
  expected: QuarantinedRegistryEntry;
  observed: RegistryServerMetadata;
}): {
  matches: boolean;
  quarantine_required: true;
  authority_widened: false;
  side_effects: [];
} {
  const matches =
    input.expected[quarantinedRegistryEntryBrand] === true &&
    isValidRegistryMetadata(input.observed) &&
    input.expected.metadata.package_ref === input.observed.package_ref &&
    input.expected.metadata.version === input.observed.version &&
    input.expected.metadata.package_digest === input.observed.package_digest &&
    input.expected.metadata_digest === digestCanonical(input.observed);
  return {
    matches,
    quarantine_required: true,
    authority_widened: false,
    side_effects: [],
  };
}

export interface RegistryCatalogProvider {
  readonly profile: "official_preview" | "private";
  fetch(ref: string): Promise<RegistryServerMetadata>;
}

export async function fetchRegistryCatalogMetadata(input: {
  provider: RegistryCatalogProvider;
  ref: string;
}): Promise<
  | { ok: true; metadata: RegistryServerMetadata; trusted: false; side_effects: [] }
  | {
      ok: false;
      error_code: "gateway.registry.invalid_ref" | "gateway.registry.unavailable";
      authority_widened: false;
      side_effects: [];
    }
> {
  if (!safeLabel(input.ref, 512)) {
    return {
      ok: false,
      error_code: "gateway.registry.invalid_ref",
      authority_widened: false,
      side_effects: [],
    };
  }
  try {
    const metadata = await input.provider.fetch(input.ref);
    if (
      !isValidRegistryMetadata(metadata) ||
      metadata.registry_profile !== input.provider.profile
    ) {
      throw new Error("invalid metadata");
    }
    return {
      ok: true,
      metadata: structuredClone(metadata),
      trusted: false,
      side_effects: [],
    };
  } catch {
    return {
      ok: false,
      error_code: "gateway.registry.unavailable",
      authority_widened: false,
      side_effects: [],
    };
  }
}

export type RegistryCacheRecord = {
  metadata: RegistryServerMetadata;
  cached_at: string;
};

export function resolveRegistryOutageFallback(input: {
  record: RegistryCacheRecord | null;
  now: Date;
  max_age_ms: number;
}):
  | {
      ok: true;
      status: "quarantined_cache_only";
      metadata: RegistryServerMetadata;
      trusted: false;
      auto_install: false;
      auto_enable: false;
      auto_authorize: false;
      auto_execute: false;
      authority_widened: false;
      side_effects: [];
    }
  | {
      ok: false;
      error_code: "gateway.registry.invalid_cache" | "gateway.registry.unavailable";
      cache_state: "missing" | "stale" | "invalid";
      authority_widened: false;
      side_effects: [];
    } {
  if (
    !(input.now instanceof Date) ||
    Number.isNaN(input.now.getTime()) ||
    !Number.isSafeInteger(input.max_age_ms) ||
    input.max_age_ms < 0 ||
    input.max_age_ms > 30 * 24 * 60 * 60 * 1_000
  ) {
    return registryCacheFailure("gateway.registry.invalid_cache", "invalid");
  }
  if (input.record === null) {
    return registryCacheFailure("gateway.registry.unavailable", "missing");
  }
  if (
    !isPlainObject(input.record) ||
    !isValidRegistryMetadata(input.record.metadata) ||
    !validIso(input.record.cached_at)
  ) {
    return registryCacheFailure("gateway.registry.invalid_cache", "invalid");
  }
  const ageMs = input.now.getTime() - new Date(input.record.cached_at).getTime();
  if (ageMs < 0) {
    return registryCacheFailure("gateway.registry.invalid_cache", "invalid");
  }
  if (ageMs > input.max_age_ms) {
    return registryCacheFailure("gateway.registry.unavailable", "stale");
  }
  return {
    ok: true,
    status: "quarantined_cache_only",
    metadata: structuredClone(input.record.metadata),
    trusted: false,
    auto_install: false,
    auto_enable: false,
    auto_authorize: false,
    auto_execute: false,
    authority_widened: false,
    side_effects: [],
  };
}

export type SupplyChainEvidence = {
  package_ref: string;
  package_digest: string;
  sbom: {
    format: "CycloneDX" | "SPDX";
    document_ref: string;
    document_digest: string;
    dependency_count: number;
    license_inventory_present: boolean;
  };
  provenance: {
    envelope: "in-toto";
    predicate: "https://slsa.dev/provenance/v1";
    document_ref: string;
    subject_digest: string;
    source_ref: string;
    builder_id: string;
  };
  signature: {
    profile: "sigstore-cosign-compatible";
    signature_ref: string;
    identity_ref: string;
  };
  vulnerabilities: Array<{
    advisory_id: string;
    severity: "none" | "low" | "moderate" | "high" | "critical";
  }>;
};

export interface SupplyChainEvidenceVerifier {
  verifySbom(evidence: SupplyChainEvidence["sbom"]): Promise<{ ok: boolean }>;
  verifyProvenance(
    evidence: SupplyChainEvidence["provenance"],
  ): Promise<{ ok: boolean }>;
  verifySignaturePlan(
    evidence: SupplyChainEvidence["signature"],
  ): Promise<{ ok: boolean }>;
}

export async function assessSupplyChainEvidence(input: {
  evidence: SupplyChainEvidence;
  verifier: SupplyChainEvidenceVerifier;
}): Promise<
  | {
      ok: true;
      status: "verified_for_manual_catalog_review";
      sbom_format: "CycloneDX" | "SPDX";
      provenance_profile: "slsa_v1_in_toto";
      signature_profile: "sigstore_cosign_compatible_verification_only";
      signing_performed: false;
      publishing_performed: false;
      install_authorized: false;
      action_authorized: false;
      side_effects: [];
    }
  | {
      ok: false;
      error_code:
        | "gateway.supply_chain.invalid_evidence"
        | "gateway.supply_chain.verification_failed"
        | "gateway.supply_chain.vulnerability_blocked";
      side_effects: [];
    }
> {
  if (!isValidSupplyChainEvidence(input.evidence)) {
    return supplyChainFailure("gateway.supply_chain.invalid_evidence");
  }
  if (
    input.evidence.vulnerabilities.some((item) =>
      ["high", "critical"].includes(item.severity),
    )
  ) {
    return supplyChainFailure("gateway.supply_chain.vulnerability_blocked");
  }
  let checks: Array<{ ok: boolean }>;
  try {
    checks = await Promise.all([
      input.verifier.verifySbom(input.evidence.sbom),
      input.verifier.verifyProvenance(input.evidence.provenance),
      input.verifier.verifySignaturePlan(input.evidence.signature),
    ]);
  } catch {
    checks = [{ ok: false }];
  }
  if (!checks.every((check) => check.ok === true)) {
    return supplyChainFailure("gateway.supply_chain.verification_failed");
  }
  return {
    ok: true,
    status: "verified_for_manual_catalog_review",
    sbom_format: input.evidence.sbom.format,
    provenance_profile: "slsa_v1_in_toto",
    signature_profile: "sigstore_cosign_compatible_verification_only",
    signing_performed: false,
    publishing_performed: false,
    install_authorized: false,
    action_authorized: false,
    side_effects: [],
  };
}

function isValidRegistryMetadata(value: unknown): value is RegistryServerMetadata {
  if (!isPlainObject(value)) return false;
  return (
    (value.registry_profile === "official_preview" ||
      value.registry_profile === "private") &&
    safeLabel(value.namespace, 256) &&
    safeLabel(value.server_name, 256) &&
    safeLabel(value.version, 64) &&
    safeLabel(value.package_ref, 512) &&
    isDigest(value.package_digest) &&
    typeof value.source_url === "string" &&
    safeList(value.permissions, 128, 128) &&
    safeList(value.environment_refs, 128, 256) &&
    safeList(value.network_targets, 128, 512) &&
    safeLabel(value.sbom_ref, 512) &&
    safeLabel(value.provenance_ref, 512) &&
    safeLabel(value.signature_ref, 512) &&
    safeLabel(value.vulnerability_inventory_ref, 512) &&
    validIso(value.published_at)
  );
}

function isValidSupplyChainEvidence(value: unknown): value is SupplyChainEvidence {
  if (
    !isPlainObject(value) ||
    !isPlainObject(value.sbom) ||
    !isPlainObject(value.provenance) ||
    !isPlainObject(value.signature)
  ) {
    return false;
  }
  return (
    safeLabel(value.package_ref, 512) &&
    isDigest(value.package_digest) &&
    (value.sbom.format === "CycloneDX" || value.sbom.format === "SPDX") &&
    safeLabel(value.sbom.document_ref, 512) &&
    isDigest(value.sbom.document_digest) &&
    Number.isSafeInteger(value.sbom.dependency_count) &&
    (value.sbom.dependency_count as number) >= 0 &&
    (value.sbom.dependency_count as number) <= 1_000_000 &&
    value.sbom.license_inventory_present === true &&
    value.provenance.envelope === "in-toto" &&
    value.provenance.predicate === "https://slsa.dev/provenance/v1" &&
    safeLabel(value.provenance.document_ref, 512) &&
    value.provenance.subject_digest === value.package_digest &&
    safeLabel(value.provenance.source_ref, 512) &&
    safeLabel(value.provenance.builder_id, 512) &&
    value.signature.profile === "sigstore-cosign-compatible" &&
    safeLabel(value.signature.signature_ref, 512) &&
    safeLabel(value.signature.identity_ref, 512) &&
    Array.isArray(value.vulnerabilities) &&
    value.vulnerabilities.length <= 10_000 &&
    value.vulnerabilities.every(
      (item) =>
        isPlainObject(item) &&
        safeLabel(item.advisory_id, 256) &&
        ["none", "low", "moderate", "high", "critical"].includes(
          item.severity as string,
        ),
    )
  );
}

function digestCanonical(value: unknown): string {
  return `sha256:${createHash("sha256").update(canonicalJson(value)).digest("hex")}`;
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (isPlainObject(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function safeList(
  value: unknown,
  maxItems: number,
  maxLength: number,
): value is string[] {
  return (
    Array.isArray(value) &&
    value.length <= maxItems &&
    value.every((item) => safeLabel(item, maxLength))
  );
}

function safeLabel(value: unknown, maxLength: number): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= maxLength &&
    !/[\u0000-\u001f\u007f]/.test(value)
  );
}

function isDigest(value: unknown): value is string {
  return typeof value === "string" && /^sha256:[a-f0-9]{64}$/.test(value);
}

function validIso(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    return new Date(value).toISOString() === value;
  } catch {
    return false;
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function registryFailure(
  error_code:
    | "gateway.registry.invalid_metadata"
    | "gateway.registry.source_blocked"
    | "gateway.registry.namespace_unverified",
) {
  return { ok: false as const, error_code, side_effects: [] as [] };
}

function registryReviewFailure(
  error_code:
    "gateway.registry.review_incomplete" | "gateway.registry.version_substitution",
) {
  return { ok: false as const, error_code, side_effects: [] as [] };
}

function registryCacheFailure(
  error_code: "gateway.registry.invalid_cache" | "gateway.registry.unavailable",
  cache_state: "missing" | "stale" | "invalid",
) {
  return {
    ok: false as const,
    error_code,
    cache_state,
    authority_widened: false as const,
    side_effects: [] as [],
  };
}

function supplyChainFailure(
  error_code:
    | "gateway.supply_chain.invalid_evidence"
    | "gateway.supply_chain.verification_failed"
    | "gateway.supply_chain.vulnerability_blocked",
) {
  return { ok: false as const, error_code, side_effects: [] as [] };
}
