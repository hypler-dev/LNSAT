import assert from "node:assert/strict";
import test from "node:test";

import { evaluateNpmAudit } from "./npm-audit-rules.mjs";

const advisoryUrl = "https://github.com/advisories/GHSA-frvp-7c67-39w9";

test("accepts only the exact upstream MCP Node static-serving advisory", () => {
  const result = evaluateNpmAudit(allowedReport(), allowedLock());

  assert.equal(result.ok, true);
  assert.equal(result.errors.length, 0);
  assert.equal(result.allowedAdvisories[0].advisory, advisoryUrl);
});

test("accepts a clean audit report", () => {
  const result = evaluateNpmAudit(
    { auditReportVersion: 2, vulnerabilities: {} },
    { packages: {} },
  );

  assert.equal(result.ok, true);
  assert.deepEqual(result.allowedAdvisories, []);
});

test("rejects every unexpected vulnerable package", () => {
  const report = allowedReport();
  report.vulnerabilities.fast_uri = {
    name: "fast_uri",
    severity: "high",
  };

  const result = evaluateNpmAudit(report, allowedLock());

  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /Unexpected vulnerable package/);
});

test("rejects advisory, path, severity, or version drift", () => {
  const report = allowedReport();
  report.vulnerabilities["@hono/node-server"].severity = "high";
  report.vulnerabilities["@hono/node-server"].via[0].url =
    "https://github.com/advisories/GHSA-unexpected";
  report.vulnerabilities["@modelcontextprotocol/node"].via.push("hono");
  const lock = allowedLock();
  lock.packages[
    "node_modules/@modelcontextprotocol/node/node_modules/@hono/node-server"
  ].version = "1.19.18";

  const result = evaluateNpmAudit(report, lock);
  const errors = result.errors.join("\n");

  assert.equal(result.ok, false);
  assert.match(errors, /Hono Node severity changed/);
  assert.match(errors, /Hono Node advisory URL changed/);
  assert.match(errors, /MCP Node advisory path changed/);
  assert.match(errors, /Hono Node locked version changed/);
});

test("rejects one-sided propagated advisory state", () => {
  const report = allowedReport();
  delete report.vulnerabilities["@modelcontextprotocol/node"];

  const result = evaluateNpmAudit(report, allowedLock());

  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /must appear together/);
});

function allowedReport() {
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

function allowedLock() {
  return {
    packages: {
      "node_modules/@modelcontextprotocol/node": { version: "2.0.0" },
      "node_modules/@modelcontextprotocol/node/node_modules/@hono/node-server": {
        version: "1.19.17",
      },
    },
  };
}
