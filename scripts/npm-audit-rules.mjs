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
  }

  return {
    ok: errors.length === 0,
    errors,
    allowedAdvisories: [],
  };
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
