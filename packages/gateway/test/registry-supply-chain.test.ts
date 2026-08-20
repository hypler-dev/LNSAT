import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  assessSupplyChainEvidence,
  compareRegistryEntryVersion,
  fetchRegistryCatalogMetadata,
  quarantineRegistryEntry,
  resolveRegistryOutageFallback,
  reviewQuarantinedRegistryEntry,
  type QuarantinedRegistryEntry,
  type RegistryReviewEvidence,
  type RegistryServerMetadata,
  type SupplyChainEvidence,
} from "../src/index.js";

const now = new Date("2026-08-04T00:00:00.000Z");
const fixturePath = join(
  process.cwd(),
  "../../fixtures/contracts/registry-supply-chain-v0_1.json",
);

describe("registry quarantine and supply-chain trust", () => {
  it("quarantines private-registry discovery without granting authority", async () => {
    const metadata = await readMetadata();
    const result = await quarantine(metadata);

    expect(result).toMatchObject({
      ok: true,
      entry: {
        status: "quarantined",
        metadata,
        metadata_digest: expect.stringMatching(/^sha256:[a-f0-9]{64}$/),
        publisher_ref: "publisher-ref:example",
        namespace_verified: true,
        namespace_verification_grants_authority: false,
        auto_install: false,
        auto_enable: false,
        auto_authorize: false,
        auto_execute: false,
        action_authorized: false,
        side_effects: [],
      },
      side_effects: [],
    });
  });

  it("supports official-preview provider profile without trusting metadata", async () => {
    const metadata = {
      ...(await readMetadata()),
      registry_profile: "official_preview" as const,
    };
    const result = await fetchRegistryCatalogMetadata({
      provider: {
        profile: "official_preview",
        fetch: async () => metadata,
      },
      ref: metadata.package_ref,
    });

    expect(result).toEqual({
      ok: true,
      metadata,
      trusted: false,
      side_effects: [],
    });
  });

  it("rejects provider-profile substitution, invalid refs, and provider outage", async () => {
    const metadata = await readMetadata();
    const provider = {
      profile: "official_preview" as const,
      fetch: async () => metadata,
    };

    await expect(
      fetchRegistryCatalogMetadata({ provider, ref: metadata.package_ref }),
    ).resolves.toMatchObject({
      ok: false,
      error_code: "gateway.registry.unavailable",
      authority_widened: false,
    });
    await expect(
      fetchRegistryCatalogMetadata({ provider, ref: "bad\nref" }),
    ).resolves.toMatchObject({
      ok: false,
      error_code: "gateway.registry.invalid_ref",
      authority_widened: false,
    });
    await expect(
      fetchRegistryCatalogMetadata({
        provider: {
          profile: "private",
          fetch: async () => Promise.reject(new Error("registry offline: secret")),
        },
        ref: metadata.package_ref,
      }),
    ).resolves.toEqual({
      ok: false,
      error_code: "gateway.registry.unavailable",
      authority_widened: false,
      side_effects: [],
    });
  });

  it("blocks source SSRF, credentials, query secrets, redirects, and verifier failure", async () => {
    const metadata = await readMetadata();
    for (const candidate of [
      { source_url: "http://source.example.test/package", resolved: ["8.8.8.8"] },
      {
        source_url: "https://user:secret@source.example.test/package",
        resolved: ["8.8.8.8"],
      },
      {
        source_url: "https://source.example.test/package?token=secret",
        resolved: ["8.8.8.8"],
      },
      { source_url: "https://source.example.test/package", resolved: ["10.0.0.1"] },
    ]) {
      await expect(
        quarantineRegistryEntry({
          metadata: { ...metadata, source_url: candidate.source_url },
          source_resolved_ips: candidate.resolved,
          source_redirect_chain: [],
          namespace_verifier: namespaceVerifier(),
        }),
      ).resolves.toMatchObject({
        ok: false,
        error_code: "gateway.registry.source_blocked",
      });
    }

    await expect(
      quarantineRegistryEntry({
        metadata,
        source_resolved_ips: ["8.8.8.8"],
        source_redirect_chain: ["https://redirect.example.test/package"],
        namespace_verifier: namespaceVerifier(),
      }),
    ).resolves.toMatchObject({
      ok: false,
      error_code: "gateway.registry.source_blocked",
    });
    await expect(
      quarantineRegistryEntry({
        metadata,
        source_resolved_ips: ["8.8.8.8"],
        source_redirect_chain: [],
        namespace_verifier: {
          verifyNamespace: async () => Promise.reject(new Error("raw verifier detail")),
        },
      }),
    ).resolves.toEqual({
      ok: false,
      error_code: "gateway.registry.namespace_unverified",
      side_effects: [],
    });
  });

  it("requires every manual review dimension and exact package version", async () => {
    const entry = await quarantinedEntry();
    expect(
      reviewQuarantinedRegistryEntry({ entry, evidence: reviewEvidence(entry) }),
    ).toEqual({
      ok: true,
      status: "catalog_eligible_disabled",
      metadata_digest: entry.metadata_digest,
      reviewer_ref: "reviewer:alice",
      installed: false,
      enabled: false,
      action_authorized: false,
      executable: false,
      side_effects: [],
    });

    expect(
      reviewQuarantinedRegistryEntry({
        entry,
        evidence: { ...reviewEvidence(entry), network_behavior_reviewed: false },
      }),
    ).toMatchObject({ ok: false, error_code: "gateway.registry.review_incomplete" });
    expect(
      reviewQuarantinedRegistryEntry({
        entry,
        evidence: { ...reviewEvidence(entry), reviewed_package_version: "1.2.4" },
      }),
    ).toMatchObject({ ok: false, error_code: "gateway.registry.version_substitution" });
  });

  it("rejects forged quarantine handles and malformed review evidence", async () => {
    const entry = await quarantinedEntry();
    const forged = JSON.parse(JSON.stringify(entry)) as QuarantinedRegistryEntry;

    expect(
      reviewQuarantinedRegistryEntry({
        entry: forged,
        evidence: reviewEvidence(entry),
      }),
    ).toMatchObject({ ok: false, error_code: "gateway.registry.review_incomplete" });
    expect(
      reviewQuarantinedRegistryEntry({
        entry,
        evidence: null as unknown as RegistryReviewEvidence,
      }),
    ).toMatchObject({ ok: false, error_code: "gateway.registry.review_incomplete" });
  });

  it("detects version, digest, metadata, and malformed substitution", async () => {
    const entry = await quarantinedEntry();
    expect(
      compareRegistryEntryVersion({ expected: entry, observed: entry.metadata }),
    ).toEqual({
      matches: true,
      quarantine_required: true,
      authority_widened: false,
      side_effects: [],
    });

    for (const observed of [
      { ...entry.metadata, version: "1.2.4" },
      { ...entry.metadata, package_digest: `sha256:${"b".repeat(64)}` },
      { ...entry.metadata, permissions: ["packet.read", "admin.write"] },
      { ...entry.metadata, package_ref: "" },
    ]) {
      expect(compareRegistryEntryVersion({ expected: entry, observed }).matches).toBe(
        false,
      );
    }
  });

  it("keeps fresh cache quarantined and rejects stale, missing, future, or malformed cache", async () => {
    const metadata = await readMetadata();
    expect(
      resolveRegistryOutageFallback({
        record: { metadata, cached_at: "2026-08-03T23:55:00.000Z" },
        now,
        max_age_ms: 10 * 60 * 1_000,
      }),
    ).toMatchObject({
      ok: true,
      status: "quarantined_cache_only",
      trusted: false,
      auto_install: false,
      auto_enable: false,
      auto_authorize: false,
      auto_execute: false,
      authority_widened: false,
    });
    expect(
      resolveRegistryOutageFallback({
        record: { metadata, cached_at: "2026-08-03T00:00:00.000Z" },
        now,
        max_age_ms: 10 * 60 * 1_000,
      }),
    ).toMatchObject({ ok: false, cache_state: "stale", authority_widened: false });
    expect(
      resolveRegistryOutageFallback({ record: null, now, max_age_ms: 1_000 }),
    ).toMatchObject({ ok: false, cache_state: "missing", authority_widened: false });
    expect(
      resolveRegistryOutageFallback({
        record: { metadata, cached_at: "2026-08-05T00:00:00.000Z" },
        now,
        max_age_ms: 1_000,
      }),
    ).toMatchObject({ ok: false, cache_state: "invalid", authority_widened: false });
    expect(
      resolveRegistryOutageFallback({
        record: { metadata, cached_at: "not-a-date" },
        now,
        max_age_ms: 1_000,
      }),
    ).toMatchObject({ ok: false, cache_state: "invalid", authority_widened: false });
  });

  it.each(["CycloneDX", "SPDX"] as const)(
    "verifies %s SBOM, SLSA provenance, and signature evidence for manual review only",
    async (format) => {
      const evidence = supplyChainEvidence(format);
      const verifier = {
        verifySbom: vi.fn(async () => ({ ok: true })),
        verifyProvenance: vi.fn(async () => ({ ok: true })),
        verifySignaturePlan: vi.fn(async () => ({ ok: true })),
      };
      const result = await assessSupplyChainEvidence({ evidence, verifier });

      expect(result).toEqual({
        ok: true,
        status: "verified_for_manual_catalog_review",
        sbom_format: format,
        provenance_profile: "slsa_v1_in_toto",
        signature_profile: "sigstore_cosign_compatible_verification_only",
        signing_performed: false,
        publishing_performed: false,
        install_authorized: false,
        action_authorized: false,
        side_effects: [],
      });
      expect(verifier.verifySbom).toHaveBeenCalledWith(evidence.sbom);
    },
  );

  it("rejects high vulnerabilities, mismatched provenance, missing license inventory, and verifier failure", async () => {
    const valid = supplyChainEvidence("CycloneDX");
    const verifier = {
      verifySbom: async () => ({ ok: true }),
      verifyProvenance: async () => ({ ok: true }),
      verifySignaturePlan: async () => ({ ok: true }),
    };
    await expect(
      assessSupplyChainEvidence({
        evidence: {
          ...valid,
          vulnerabilities: [{ advisory_id: "CVE-EXAMPLE-0001", severity: "high" }],
        },
        verifier,
      }),
    ).resolves.toMatchObject({
      ok: false,
      error_code: "gateway.supply_chain.vulnerability_blocked",
    });
    await expect(
      assessSupplyChainEvidence({
        evidence: {
          ...valid,
          provenance: {
            ...valid.provenance,
            subject_digest: `sha256:${"c".repeat(64)}`,
          },
        },
        verifier,
      }),
    ).resolves.toMatchObject({
      ok: false,
      error_code: "gateway.supply_chain.invalid_evidence",
    });
    await expect(
      assessSupplyChainEvidence({
        evidence: {
          ...valid,
          sbom: { ...valid.sbom, license_inventory_present: false },
        },
        verifier,
      }),
    ).resolves.toMatchObject({
      ok: false,
      error_code: "gateway.supply_chain.invalid_evidence",
    });
    await expect(
      assessSupplyChainEvidence({
        evidence: valid,
        verifier: {
          ...verifier,
          verifySignaturePlan: async () =>
            Promise.reject(new Error("verifier offline")),
        },
      }),
    ).resolves.toEqual({
      ok: false,
      error_code: "gateway.supply_chain.verification_failed",
      side_effects: [],
    });
  });
});

async function readMetadata(): Promise<RegistryServerMetadata> {
  const fixture = JSON.parse(await readFile(fixturePath, "utf8")) as {
    metadata: RegistryServerMetadata;
  };
  return fixture.metadata;
}

function namespaceVerifier() {
  return {
    verifyNamespace: async (input: { namespace: string }) => ({
      ok: true as const,
      publisher_ref: `publisher-ref:${input.namespace}`,
    }),
  };
}

async function quarantine(metadata: RegistryServerMetadata) {
  return quarantineRegistryEntry({
    metadata,
    source_resolved_ips: ["8.8.8.8"],
    source_redirect_chain: [],
    namespace_verifier: namespaceVerifier(),
  });
}

async function quarantinedEntry(): Promise<QuarantinedRegistryEntry> {
  const result = await quarantine(await readMetadata());
  if (!result.ok) throw new Error(result.error_code);
  return result.entry;
}

function reviewEvidence(entry: QuarantinedRegistryEntry): RegistryReviewEvidence {
  return {
    reviewer_ref: "reviewer:alice",
    reviewed_package_version: entry.metadata.version,
    reviewed_package_digest: entry.metadata.package_digest,
    source_reviewed: true,
    permissions_reviewed: true,
    environment_refs_reviewed: true,
    network_behavior_reviewed: true,
    sbom_reviewed: true,
    provenance_reviewed: true,
    signature_reviewed: true,
    vulnerabilities_reviewed: true,
  };
}

function supplyChainEvidence(format: "CycloneDX" | "SPDX"): SupplyChainEvidence {
  const packageDigest = `sha256:${"a".repeat(64)}`;
  return {
    package_ref: "npm:@example/readonly-inspector@1.2.3",
    package_digest: packageDigest,
    sbom: {
      format,
      document_ref: "evidence:sbom:0001",
      document_digest: `sha256:${"b".repeat(64)}`,
      dependency_count: 42,
      license_inventory_present: true,
    },
    provenance: {
      envelope: "in-toto",
      predicate: "https://slsa.dev/provenance/v1",
      document_ref: "evidence:provenance:0001",
      subject_digest: packageDigest,
      source_ref: "git-ref:example/readonly-inspector@abcdef",
      builder_id: "builder:example:ci",
    },
    signature: {
      profile: "sigstore-cosign-compatible",
      signature_ref: "evidence:signature:0001",
      identity_ref: "publisher-ref:example",
    },
    vulnerabilities: [{ advisory_id: "CVE-EXAMPLE-LOW", severity: "low" }],
  };
}
