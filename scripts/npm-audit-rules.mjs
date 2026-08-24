export function evaluateNpmAudit(report) {
  const errors = [];
  const vulnerabilities = report?.vulnerabilities;

  if (report?.auditReportVersion !== 2 || !isRecord(vulnerabilities)) {
    return {
      ok: false,
      errors: ["Unsupported npm audit JSON schema."],
      allowedAdvisories: [],
    };
  }

  const vulnerabilityCount = Object.keys(vulnerabilities).length;
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
  const invalid = report?.invalid;
  const missing = report?.missing;

  if (!isRecord(report) || !Array.isArray(invalid) || !Array.isArray(missing)) {
    return {
      ok: false,
      errors: ["Unsupported npm signature audit JSON schema."],
    };
  }

  if (invalid.length > 0) {
    errors.push(`npm signature audit reported ${invalid.length} invalid signature(s).`);
  }
  if (missing.length > 0) {
    errors.push(`npm signature audit reported ${missing.length} missing signature(s).`);
  }

  return { ok: errors.length === 0, errors };
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
