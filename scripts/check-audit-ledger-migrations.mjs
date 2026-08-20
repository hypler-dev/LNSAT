import { readFileSync } from "node:fs";

const expected = {
  sqlPath: "packages/audit/migrations/postgresql/0001_audit_events_v0_1.sql",
  manifestPath:
    "packages/audit/migrations/postgresql/0001_audit_events_v0_1.manifest.json",
  artifactId: "audit_events.postgresql.0001.v0_1",
  packetId: "BP-0044",
  schemaVersion: "audit_events.v0_1",
  targetStorage: "PostgreSQL",
  targetTable: "audit_events",
  policyGate: "lnsat.policy.audit_ledger_writer_gate.v0_1",
  approvalRequest: "lnsat.policy.audit_ledger_writer_approval_request.v0_1",
};

const requiredSourceContracts = [
  ["BP-0036", "AuditLedgerRecord"],
  ["BP-0039", expected.policyGate],
  ["BP-0040", expected.approvalRequest],
  ["BP-0041", "PostgreSQL audit_events hot storage choice"],
  ["BP-0042", "audit_events.v0_1 schema contract"],
  ["BP-0043", "repo-local no-live migration artifact plan"],
];

const requiredColumns = [
  ["ledger_record_id", /ledger_record_id\s+text\s+not\s+null/i],
  ["event_id", /event_id\s+text\s+not\s+null/i],
  ["event_type", /event_type\s+text\s+not\s+null/i],
  ["result_status", /result_status\s+text\s+not\s+null/i],
  ["actor_ref", /actor_ref\s+text\b/i],
  ["session_ref", /session_ref\s+text\b/i],
  ["packet_ref", /packet_ref\s+jsonb\b/i],
  ["policy_ref", /policy_ref\s+jsonb\b/i],
  ["approval_ref", /approval_ref\s+jsonb\b/i],
  ["adapter_ref", /adapter_ref\s+jsonb\b/i],
  ["resource_refs", /resource_refs\s+jsonb\s+not\s+null/i],
  ["capability", /capability\s+text\b/i],
  ["risk_level", /risk_level\s+integer\b/i],
  ["source_refs", /source_refs\s+jsonb\s+not\s+null/i],
  ["reason_codes", /reason_codes\s+jsonb\s+not\s+null/i],
  ["redaction", /redaction\s+jsonb\s+not\s+null/i],
  ["idempotency_key", /idempotency_key\s+text\s+not\s+null/i],
  ["canonical_record_digest", /canonical_record_digest\s+text\s+not\s+null/i],
  ["created_at", /created_at\s+timestamptz\s+not\s+null/i],
  ["observed_at", /observed_at\s+timestamptz\s+not\s+null/i],
  ["retention_class", /retention_class\s+text\s+not\s+null/i],
  ["side_effects", /side_effects\s+jsonb\s+not\s+null/i],
  [
    "schema_version",
    /schema_version\s+text\s+not\s+null\s+default\s+'audit_events\.v0_1'/i,
  ],
  ["inserted_at", /inserted_at\s+timestamptz\s+not\s+null\s+default\s+now\(\)/i],
];

const requiredConstraints = [
  "audit_events_pkey",
  "audit_events_event_id_key",
  "audit_events_idempotency_key_key",
  "audit_events_ledger_record_id_shape",
  "audit_events_event_id_shape",
  "audit_events_event_type_known",
  "audit_events_result_status_known",
  "audit_events_packet_ref_object",
  "audit_events_policy_ref_object",
  "audit_events_approval_ref_object",
  "audit_events_adapter_ref_object",
  "audit_events_resource_refs_array",
  "audit_events_source_refs_non_empty_array",
  "audit_events_reason_codes_array",
  "audit_events_redaction_object",
  "audit_events_redaction_required_states",
  "audit_events_idempotency_key_shape",
  "audit_events_canonical_record_digest_shape",
  "audit_events_risk_level_range",
  "audit_events_retention_class_known",
  "audit_events_side_effects_array",
  "audit_events_schema_version_v0_1",
];

const forbiddenSqlTokens = [
  /\binsert\s+into\b/i,
  /\bupdate\s+audit_events\b/i,
  /\bdelete\s+from\b/i,
  /\btruncate\b/i,
  /\bdrop\s+(table|database|schema|role|user)\b/i,
  /\balter\s+(table|database|schema|role|user)\b/i,
  /\bgrant\b/i,
  /\brevoke\b/i,
  /\bcreate\s+(role|user|database|extension|function|trigger|policy)\b/i,
  /\bcopy\s+audit_events\b/i,
  /\\connect\b/i,
  /\bpsql\b/i,
  /\bdatabase_url\b/i,
  /\bpassword\b/i,
  /\bsecret\b/i,
  /\bdocker\b/i,
  /\bssh\b/i,
  /\bcloudflare\b/i,
  /\bwrangler\b/i,
  /\bdeploy\b/i,
  /\bqueue\b/i,
  /\bseed\b/i,
  /\bbackfill\b/i,
];

const forbiddenManifestKeys = [
  "database_url",
  "connection",
  "credential",
  "secret",
  "password",
  "hostname",
  "host",
  "port",
  "username",
  "role",
  "environment",
  "runner",
  "writer",
];

const failures = [];

function fail(message) {
  failures.push(message);
}

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

function assert(condition, message) {
  if (!condition) {
    fail(message);
  }
}

function stripSqlComments(sql) {
  return sql.replaceAll(/--.*$/gm, "").replaceAll(/\/\*[\s\S]*?\*\//g, "");
}

function collectKeys(value, path = "$", keys = []) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectKeys(item, `${path}[${index}]`, keys));
    return keys;
  }

  if (value !== null && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      keys.push([path, key]);
      collectKeys(item, `${path}.${key}`, keys);
    }
  }

  return keys;
}

function collectColumnNames(sql) {
  const tableStart = sql.match(/create\s+table\s+audit_events\s*\(/i);
  if (tableStart?.index === undefined) {
    return [];
  }

  const tableBody = sql.slice(tableStart.index + tableStart[0].length);
  const columns = [];

  for (const line of tableBody.split("\n")) {
    const trimmed = line.trim();
    if (/^constraint\b/i.test(trimmed) || trimmed === ");") {
      break;
    }

    const match = trimmed.match(/^([a-z_]+)\s+(text|jsonb|integer|timestamptz)\b/i);
    if (match?.[1]) {
      columns.push(match[1]);
    }
  }

  return columns;
}

const sql = read(expected.sqlPath);
const sqlWithoutComments = stripSqlComments(sql);
const manifestText = read(expected.manifestPath);
const manifest = JSON.parse(manifestText);

assert(
  expected.sqlPath.endsWith("0001_audit_events_v0_1.sql"),
  "SQL artifact path must use BP-0043 naming.",
);
assert(
  expected.manifestPath.endsWith("0001_audit_events_v0_1.manifest.json"),
  "Manifest artifact path must use BP-0043 naming.",
);
assert(
  /create\s+table\s+audit_events\s*\(/i.test(sqlWithoutComments),
  "SQL must create only the audit_events table.",
);
assert(
  !/create\s+table\s+(?!audit_events\b)/i.test(sqlWithoutComments),
  "SQL must not create non-audit_events tables.",
);

assert(manifest.artifact_id === expected.artifactId, "Manifest artifact_id mismatch.");
assert(manifest.packet_id === expected.packetId, "Manifest packet_id mismatch.");
assert(
  manifest.schema_version === expected.schemaVersion,
  "Manifest schema_version mismatch.",
);
assert(
  manifest.target_storage === expected.targetStorage,
  "Manifest target_storage mismatch.",
);
assert(
  manifest.target_table === expected.targetTable,
  "Manifest target_table mismatch.",
);
assert(manifest.sql_artifact === expected.sqlPath, "Manifest sql_artifact mismatch.");
assert(
  manifest.policy_gate_required === expected.policyGate,
  "Manifest policy_gate_required mismatch.",
);
assert(
  manifest.approval_request_required === expected.approvalRequest,
  "Manifest approval_request_required mismatch.",
);
assert(
  manifest.live_execution_allowed === false,
  "Manifest live_execution_allowed must be false.",
);
assert(
  Array.isArray(manifest.side_effects) && manifest.side_effects.length === 0,
  "Manifest side_effects must be [].",
);

for (const [packetId, contract] of requiredSourceContracts) {
  const found = manifest.source_contract_refs?.some(
    (ref) => ref?.packet_id === packetId && ref?.contract === contract,
  );
  assert(found, `Manifest source_contract_refs missing ${packetId} ${contract}.`);
}

for (const [name, pattern] of requiredColumns) {
  assert(pattern.test(sqlWithoutComments), `SQL column contract missing ${name}.`);
}

const allowedColumnNames = new Set(requiredColumns.map(([name]) => name));
for (const column of collectColumnNames(sqlWithoutComments)) {
  assert(
    allowedColumnNames.has(column),
    `SQL contains column outside BP-0036/BP-0042 contract: ${column}.`,
  );
}

for (const constraint of requiredConstraints) {
  assert(
    new RegExp(`constraint\\s+${constraint}\\b`, "i").test(sqlWithoutComments),
    `SQL constraint missing ${constraint}.`,
  );
}

for (const pattern of forbiddenSqlTokens) {
  assert(!pattern.test(sqlWithoutComments), `SQL contains forbidden token ${pattern}.`);
}

for (const [path, key] of collectKeys(manifest)) {
  const normalized = key.toLowerCase();
  assert(
    !forbiddenManifestKeys.includes(normalized),
    `Manifest contains forbidden live/runtime key ${path}.${key}.`,
  );
}

const hasFutureGateReview = manifest.review_checks?.some(
  (check) =>
    typeof check === "string" && check.includes("BP-0039") && check.includes("BP-0040"),
);
assert(
  hasFutureGateReview,
  "Manifest review_checks must require BP-0039 and BP-0040 before future live work.",
);

if (failures.length > 0) {
  console.error(
    `audit ledger migration static check failed:\n${failures
      .map((failure) => `- ${failure}`)
      .join("\n")}`,
  );
  process.exit(1);
}

console.log("audit ledger migration static check passed");
