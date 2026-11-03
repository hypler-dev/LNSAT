const AUDIT_REPORT_KEYS = ["auditReportVersion", "vulnerabilities", "metadata"];
const AUDIT_METADATA_KEYS = ["vulnerabilities", "dependencies"];
const AUDIT_VULNERABILITY_COUNT_KEYS = [
  "info",
  "low",
  "moderate",
  "high",
  "critical",
  "total",
];
const AUDIT_DEPENDENCY_COUNT_KEYS = [
  "prod",
  "dev",
  "optional",
  "peer",
  "peerOptional",
  "total",
];
const SIGNATURE_REPORT_KEYS = ["invalid", "missing"];

export function evaluateNpmAudit(report) {
  const errors = [];

  const vulnerabilityCount = isRecord(report?.vulnerabilities)
    ? Object.keys(report.vulnerabilities).length
    : null;
  if (
    !hasExactKeys(report, AUDIT_REPORT_KEYS) ||
    report.auditReportVersion !== 2 ||
    vulnerabilityCount === null ||
    !hasSupportedAuditMetadata(report.metadata, vulnerabilityCount)
  ) {
    return {
      ok: false,
      errors: ["Unsupported npm audit JSON schema."],
      allowedAdvisories: [],
    };
  }

  if (vulnerabilityCount > 0) {
    errors.push(`npm audit reported ${vulnerabilityCount} vulnerable package(s).`);
    const identifiers = boundedAdvisoryIdentifiers(report.vulnerabilities);
    if (identifiers.length > 0) {
      errors.push(`Public advisory identifiers (up to 32): ${identifiers.join(", ")}.`);
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    allowedAdvisories: [],
  };
}

// Report only canonical public identifiers. Names, paths, titles and raw URLs
// may contain private or attacker-controlled text and must not reach CI logs.
function boundedAdvisoryIdentifiers(vulnerabilities) {
  const identifiers = new Set();
  const canonical =
    /^https:\/\/github\.com\/advisories\/(GHSA-[23456789cfghjmpqrvwx]{4}-[23456789cfghjmpqrvwx]{4}-[23456789cfghjmpqrvwx]{4})$/u;
  for (const vulnerability of Object.values(vulnerabilities)) {
    if (!Array.isArray(vulnerability?.via)) continue;
    for (const source of vulnerability.via) {
      if (typeof source?.url !== "string") continue;
      const match = canonical.exec(source.url);
      if (!match) continue;
      identifiers.add(match[1]);
      if (identifiers.size > 32) {
        // Keep the lexicographically first 32 independently of input order.
        identifiers.delete([...identifiers].sort().at(-1));
      }
    }
  }
  return [...identifiers].sort();
}

export function evaluateNpmSignatures(report) {
  const errors = [];

  if (
    !hasExactKeys(report, SIGNATURE_REPORT_KEYS) ||
    !Array.isArray(report.invalid) ||
    !Array.isArray(report.missing)
  ) {
    return {
      ok: false,
      errors: ["Unsupported npm signature audit JSON schema."],
    };
  }

  if (report.invalid.length > 0) {
    errors.push(
      `npm signature audit reported ${report.invalid.length} invalid signature(s).`,
    );
  }
  if (report.missing.length > 0) {
    errors.push(
      `npm signature audit reported ${report.missing.length} missing signature(s).`,
    );
  }

  return { ok: errors.length === 0, errors };
}

function hasExactKeys(value, expected) {
  if (!isRecord(value)) return false;
  const keys = Object.keys(value);
  return (
    keys.length === expected.length &&
    expected.every((key) => Object.hasOwn(value, key))
  );
}

function hasSupportedAuditMetadata(metadata, vulnerabilityCount) {
  if (!hasExactKeys(metadata, AUDIT_METADATA_KEYS)) return false;
  if (
    !hasExactNonnegativeIntegerCounts(
      metadata.vulnerabilities,
      AUDIT_VULNERABILITY_COUNT_KEYS,
    ) ||
    !hasExactNonnegativeIntegerCounts(
      metadata.dependencies,
      AUDIT_DEPENDENCY_COUNT_KEYS,
    )
  ) {
    return false;
  }

  const severityTotal = ["info", "low", "moderate", "high", "critical"].reduce(
    (total, key) => total + metadata.vulnerabilities[key],
    0,
  );
  if (
    !Number.isSafeInteger(severityTotal) ||
    severityTotal !== metadata.vulnerabilities.total ||
    vulnerabilityCount !== metadata.vulnerabilities.total
  ) {
    return false;
  }

  const dependencyTotal = metadata.dependencies.total;
  return ["prod", "dev", "optional", "peer", "peerOptional"].every(
    (key) => metadata.dependencies[key] <= dependencyTotal,
  );
}

function hasExactNonnegativeIntegerCounts(value, expected) {
  return (
    hasExactKeys(value, expected) &&
    expected.every((key) => Number.isSafeInteger(value[key]) && value[key] >= 0)
  );
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
