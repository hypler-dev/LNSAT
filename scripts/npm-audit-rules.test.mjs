import assert from "node:assert/strict";
import test from "node:test";

import { evaluateNpmAudit, evaluateNpmSignatures } from "./npm-audit-rules.mjs";
import { runNpmAuditCheckV1 } from "./check-npm-audit.mjs";

const advisoryUrl = "https://github.com/advisories/GHSA-frvp-7c67-39w9";

test("rejects the obsolete upstream MCP Node static-serving advisory", () => {
  const result = evaluateNpmAudit(obsoleteAdvisoryReport());

  assert.equal(result.ok, false);
  assert.deepEqual(result.errors, ["npm audit reported 2 vulnerable package(s)."]);
  assert.deepEqual(result.allowedAdvisories, []);
});

test("accepts a clean audit report", () => {
  const result = evaluateNpmAudit({ auditReportVersion: 2, vulnerabilities: {} });

  assert.equal(result.ok, true);
  assert.deepEqual(result.allowedAdvisories, []);
});

test("rejects every unexpected vulnerable package", () => {
  const report = {
    auditReportVersion: 2,
    vulnerabilities: {
      fast_uri: {
        name: "fast_uri",
        severity: "high",
      },
    },
  };

  const result = evaluateNpmAudit(report);

  assert.equal(result.ok, false);
  assert.deepEqual(result.errors, ["npm audit reported 1 vulnerable package(s)."]);
  assert.deepEqual(result.allowedAdvisories, []);
  assert.doesNotMatch(result.errors.join("\n"), /fast_uri/);
});

test("rejects unsupported npm audit schema with no allowance", () => {
  const result = evaluateNpmAudit({ auditReportVersion: 1, vulnerabilities: {} });

  assert.equal(result.ok, false);
  assert.deepEqual(result.errors, ["Unsupported npm audit JSON schema."]);
  assert.deepEqual(result.allowedAdvisories, []);
});

test("accepts a signature report with no invalid or missing entries", () => {
  const result = evaluateNpmSignatures({ invalid: [], missing: [] });

  assert.equal(result.ok, true);
  assert.deepEqual(result.errors, []);
});

test("rejects invalid and missing npm signatures", () => {
  const result = evaluateNpmSignatures({
    invalid: [{ keyid: "SHA256:invalid" }],
    missing: [{ name: "unsigned-package" }],
  });

  assert.equal(result.ok, false);
  assert.deepEqual(result.errors, [
    "npm signature audit reported 1 invalid signature(s).",
    "npm signature audit reported 1 missing signature(s).",
  ]);
});

test("rejects npm signature schema drift", () => {
  const result = evaluateNpmSignatures({ message: "registry unavailable" });

  assert.equal(result.ok, false);
  assert.deepEqual(result.errors, ["Unsupported npm signature audit JSON schema."]);
});

test("rejects each missing npm signature array", () => {
  for (const report of [{ invalid: [] }, { missing: [] }]) {
    const result = evaluateNpmSignatures(report);
    assert.equal(result.ok, false);
    assert.deepEqual(result.errors, ["Unsupported npm signature audit JSON schema."]);
  }
});

test("wrapper rejects malformed JSON without reflecting registry stderr", () => {
  const result = runNpmAuditCheckV1(true, () => ({
    error: undefined,
    status: 1,
    stdout: "not-json",
    stderr: "registry-private-value",
  }));

  assert.equal(result.ok, false);
  assert.equal(result.stderr, "npm audit did not return valid JSON.\n");
  assert.doesNotMatch(result.stderr, /registry-private-value/);
});

test("wrapper rejects clean-looking JSON from nonzero npm exit", () => {
  const result = runNpmAuditCheckV1(true, () => ({
    error: undefined,
    status: 1,
    stdout: JSON.stringify({ invalid: [], missing: [] }),
    stderr: "registry-private-value",
  }));

  assert.equal(result.ok, false);
  assert.equal(result.stderr, "npm audit exited with nonzero status.\n");
  assert.doesNotMatch(result.stderr, /registry-private-value/);
});

test("wrapper rejects process-spawn failure without reflecting process details", () => {
  const result = runNpmAuditCheckV1(false, () => ({
    error: new Error("private executable path"),
    status: null,
    stdout: "",
    stderr: "",
  }));

  assert.equal(result.ok, false);
  assert.equal(result.stderr, "npm audit process could not be started.\n");
  assert.doesNotMatch(result.stderr, /private executable path/);
});

test("wrapper never reflects untrusted signature report values", () => {
  const result = runNpmAuditCheckV1(true, () => ({
    error: undefined,
    status: 1,
    stdout: JSON.stringify({
      invalid: [{ name: "registry-private-value" }],
      missing: [],
    }),
    stderr: "registry-private-stderr",
  }));

  assert.equal(result.ok, false);
  assert.equal(result.stderr, "npm signature audit reported 1 invalid signature(s).\n");
  assert.doesNotMatch(result.stderr, /registry-private/);
});

function obsoleteAdvisoryReport() {
  return {
    auditReportVersion: 2,
    vulnerabilities: {
      "@hono/node-server": {
        name: "@hono/node-server",
        severity: "moderate",
        isDirect: false,
        via: [
          {
            source: 1124006,
            name: "@hono/node-server",
            dependency: "@hono/node-server",
            title:
              "Node.js Adapter for Hono: Path traversal in serve-static on Windows",
            url: advisoryUrl,
            severity: "moderate",
            range: "<2.0.5",
          },
        ],
        effects: ["@modelcontextprotocol/node"],
        range: "<2.0.5",
        nodes: [
          "node_modules/@modelcontextprotocol/node/node_modules/@hono/node-server",
        ],
        fixAvailable: false,
      },
      "@modelcontextprotocol/node": {
        name: "@modelcontextprotocol/node",
        severity: "moderate",
        isDirect: true,
        via: ["@hono/node-server"],
        effects: [],
        range: "*",
        nodes: ["node_modules/@modelcontextprotocol/node"],
        fixAvailable: false,
      },
    },
  };
}
