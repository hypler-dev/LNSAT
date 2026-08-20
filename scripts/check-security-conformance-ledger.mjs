import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const ledgerPath = join(
  repoRoot,
  "fixtures/contracts/security-conformance-ledger-v0_1.json",
);
const ledger = JSON.parse(await readFile(ledgerPath, "utf8"));
const requiredIds = [
  "protocol_downgrade_confusion",
  "malformed_capability_envelope",
  "unsupported_version_fallback_abuse",
  "token_passthrough",
  "audience_issuer_resource_mismatch",
  "pkce_downgrade",
  "oauth_mixup_confused_deputy",
  "redirect_metadata_ssrf",
  "dns_rebinding",
  "schema_external_ref_ssrf",
  "schema_response_resource_exhaustion",
  "registry_rug_pull_version_substitution",
  "agent_card_substitution",
  "prompt_tool_metadata_injection",
  "approval_bypass",
  "policy_widening",
  "cross_tenant_operation_lookup",
  "idempotency_collision",
  "blind_retry",
  "receipt_substitution",
  "trace_baggage_as_authority",
  "secret_raw_input_echo",
  "stale_cache_as_trust",
  "hsm_software_provider_substitution",
  "m2m_token_as_human_approval",
];

assert(ledger.schema_version === "lnsat.security_conformance_ledger.v0_1");
assert(ledger.production_runtime_started === false);
assert(ledger.publication_performed === false);
assert(Array.isArray(ledger.side_effects) && ledger.side_effects.length === 0);
assert(ledger.official_conformance.package === "@modelcontextprotocol/conformance");
assert(ledger.official_conformance.version === "0.1.16");
assert(
  ledger.official_conformance.modern_2026_framework_coverage ===
    "upstream_not_available",
);
assert(
  ledger.official_conformance.stdio_framework_coverage === "upstream_not_available",
);
assert(ledger.deprecated_mcp_rules.roots_dependency === false);
assert(ledger.deprecated_mcp_rules.sampling_dependency === false);

const packageJson = JSON.parse(
  await readFile(
    join(repoRoot, "node_modules/@modelcontextprotocol/conformance/package.json"),
    "utf8",
  ),
);
assert(packageJson.version === ledger.official_conformance.version);

assert(Array.isArray(ledger.required_negatives));
assert(ledger.required_negatives.length === requiredIds.length);
assert(
  JSON.stringify(ledger.required_negatives.map(({ id }) => id)) ===
    JSON.stringify(requiredIds),
);
assert(new Set(requiredIds).size === requiredIds.length);

for (const row of ledger.required_negatives) {
  assert(typeof row.evidence_file === "string" && row.evidence_file.length > 0);
  assert(typeof row.evidence_marker === "string" && row.evidence_marker.length > 0);
  assert(typeof row.command === "string" && row.command.startsWith("npm "));
  const source = await readFile(join(repoRoot, row.evidence_file), "utf8");
  assert(source.includes(row.evidence_marker), `${row.id}: evidence marker missing`);
}

const mcpSource = await readFile(join(repoRoot, "packages/mcp/src/index.ts"), "utf8");
assert(!/\b(?:Roots|Sampling)(?:Request|Result|Capability)\b/.test(mcpSource));
assert(!/console\.log\s*\(/.test(mcpSource));

process.stdout.write(
  `${JSON.stringify({
    ok: true,
    required_negative_cases: requiredIds.length,
    official_conformance_version: packageJson.version,
    roots_dependency: false,
    sampling_dependency: false,
    production_runtime_started: false,
    publication_performed: false,
  })}\n`,
);

function assert(condition, message = "Security conformance ledger mismatch.") {
  if (!condition) throw new Error(message);
}
