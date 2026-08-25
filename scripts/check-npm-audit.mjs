import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

import { evaluateNpmAudit, evaluateNpmSignatures } from "./npm-audit-rules.mjs";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const npm = process.platform === "win32" ? "npm.cmd" : "npm";

export function runNpmAuditCheckV1(signatureMode, spawn = spawnSync) {
  const auditArgs = signatureMode
    ? ["audit", "signatures", "--json"]
    : ["audit", "--json"];
  const result = spawn(npm, auditArgs, {
    cwd: repoRoot,
    encoding: "utf8",
  });
  if (result.error) {
    return failed("npm audit process could not be started.");
  }

  let report;
  try {
    report = JSON.parse(result.stdout);
  } catch {
    return failed("npm audit did not return valid JSON.");
  }

  const evaluation = signatureMode
    ? evaluateNpmSignatures(report)
    : evaluateNpmAudit(report);
  if (!evaluation.ok) {
    return failed(evaluation.errors.join("\n"));
  }
  if (result.status !== 0) {
    return failed("npm audit exited with nonzero status.");
  }
  return {
    ok: true,
    stdout: signatureMode
      ? JSON.stringify({
          ok: true,
          invalid_signatures: 0,
          missing_signatures: 0,
        })
      : JSON.stringify({
          ok: true,
          unexpected_vulnerabilities: 0,
          allowed_advisories: evaluation.allowedAdvisories,
        }),
    stderr: "",
  };
}

function failed(message) {
  return { ok: false, stdout: "", stderr: `${message}\n` };
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.length > 1 || (args.length === 1 && args[0] !== "--signatures")) {
    process.stderr.write("Usage: check-npm-audit.mjs [--signatures]\n");
    process.exitCode = 1;
  } else {
    const result = runNpmAuditCheckV1(args[0] === "--signatures");
    if (result.stdout) process.stdout.write(`${result.stdout}\n`);
    if (result.stderr) process.stderr.write(result.stderr);
    if (!result.ok) process.exitCode = 1;
  }
}
