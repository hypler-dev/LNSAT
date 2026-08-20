import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { evaluateNpmAudit } from "./npm-audit-rules.mjs";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const result = spawnSync(npm, ["audit", "--json"], {
  cwd: repoRoot,
  encoding: "utf8",
});

if (result.error) {
  throw result.error;
}

let report;
try {
  report = JSON.parse(result.stdout);
} catch (error) {
  if (result.stderr) process.stderr.write(result.stderr);
  throw new Error(`npm audit did not return valid JSON: ${error.message}`);
}

const lock = JSON.parse(await readFile(join(repoRoot, "package-lock.json"), "utf8"));
const evaluation = evaluateNpmAudit(report, lock);

if (!evaluation.ok) {
  for (const error of evaluation.errors) process.stderr.write(`${error}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(
    `${JSON.stringify({
      ok: true,
      unexpected_vulnerabilities: 0,
      allowed_advisories: evaluation.allowedAdvisories,
    })}\n`,
  );
}
