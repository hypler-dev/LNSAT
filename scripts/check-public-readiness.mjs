import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, resolve } from "node:path";
import { spawnSync } from "node:child_process";

import { containsForbiddenInternalBuildPacketIdentifier } from "./public-readiness-rules.mjs";

const listed = spawnSync(
  "git",
  ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
  { encoding: "utf8" },
);
if (listed.status !== 0) {
  process.stderr.write(listed.stderr);
  process.exit(listed.status ?? 1);
}

const files = listed.stdout.split("\0").filter(Boolean);
const errors = [];
const requiredPaths = [
  ".github/ISSUE_TEMPLATE/config.yml",
  ".github/PULL_REQUEST_TEMPLATE.md",
  ".github/workflows/ci.yml",
  "LICENSE",
  "NOTICE",
  "README.md",
  "SECURITY.md",
  "SUPPORT.md",
  "CONTRIBUTING.md",
  "CODE_OF_CONDUCT.md",
  "GOVERNANCE.md",
  "MAINTAINERS.md",
  ".env.example",
  "apps/console/package.json",
  "apps/api/README.md",
  "apps/console/README.md",
  "crates/lnsat-contracts/README.md",
  "crates/lnsat-store/README.md",
  "crates/lnsatd/README.md",
  "docs/LOCAL_DEVELOPMENT.md",
  "docs/CLAIMS_AND_MATURITY.md",
  "docs/PROJECT_STATUS.md",
  "docs/README.md",
  "docs/DOCS_INDEX.md",
  "docs/RELEASING.md",
  "docs/architecture/README.md",
  "packages/audit/README.md",
  "packages/cli/README.md",
  "packages/core/README.md",
  "packages/mcp/README.md",
  "packages/packets/README.md",
  "packages/policy/README.md",
];

for (const path of requiredPaths) {
  if (!files.includes(path)) errors.push(`missing required public path: ${path}`);
}
const deniedPaths = [
  /^(?:NEXT_SESSION\.md|apps\/web\/)/u,
  /^(?:binary|design|deploy|prototypes|release-manifests)\//u,
  /^docs\/(?:agent-wiki|build|commercial|deploy|memory|owner-inputs|prompts|releases|reviews|templates)\//u,
  /(?:^|\/)(?:\.codex|graphify-out)\//u,
  /(?:^|\/)\.DS_Store$/u,
];

for (const file of files) {
  if (deniedPaths.some((pattern) => pattern.test(file))) {
    errors.push(`denied path: ${file}`);
  }
  if (file.endsWith("AGENTS.md") && file !== "AGENTS.md") {
    errors.push(`nested agent instructions: ${file}`);
  }
}

const textExtensions = new Set([
  "",
  ".css",
  ".html",
  ".js",
  ".json",
  ".jsx",
  ".md",
  ".mjs",
  ".sql",
  ".toml",
  ".ts",
  ".tsx",
  ".txt",
  ".yml",
  ".yaml",
]);
const contentRules = [
  {
    label: "absolute user path",
    pattern: /(?:\/Users\/jeff\/|\/home\/[A-Za-z0-9._-]+\/|[A-Za-z]:\\Users\\)/u,
  },
  {
    label: "private key",
    pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/u,
  },
  { label: "GitHub token", pattern: /(?:ghp_|github_pat_)[A-Za-z0-9_]{20,}/u },
  { label: "AWS access key", pattern: /AKIA[0-9A-Z]{16}/u },
  { label: "OpenAI secret", pattern: /sk-(?:proj-)?[A-Za-z0-9_-]{20,}/u },
  { label: "marketing app source", pattern: /apps\/web\//u },
  { label: "internal handoff", pattern: /NEXT_SESSION\.md/u },
  { label: "internal build ledger", pattern: /docs\/build\//u },
  {
    label: "internal operational reference",
    pattern:
      /(?:docs\/(?:agent-wiki|commercial|deploy|memory|owner-inputs|product|prompts|releases|reviews|templates)\/|release-manifests\/|binary\/(?:latest\/|v[0-9]))/u,
  },
  { label: "Cloudflare deploy command", pattern: /wrangler pages deploy/u },
];

for (const file of files) {
  if (
    file === "scripts/check-public-readiness.mjs" ||
    !textExtensions.has(extname(file))
  )
    continue;
  let stat;
  try {
    stat = statSync(file);
  } catch {
    continue;
  }
  if (!stat.isFile() || stat.size > 2_000_000) continue;
  const source = readFileSync(file, "utf8");
  for (const rule of contentRules) {
    if (
      file === "docs/PUBLIC_READINESS.md" &&
      [
        "marketing app source",
        "internal build ledger",
        "internal operational reference",
      ].includes(rule.label)
    ) {
      continue;
    }
    if (rule.pattern.test(source)) errors.push(`${rule.label}: ${file}`);
  }

  if (extname(file) === ".md") {
    if (containsForbiddenInternalBuildPacketIdentifier(file, source)) {
      errors.push(`internal build-packet identifier in public Markdown: ${file}`);
    }
    for (const match of source.matchAll(/!?\[[^\]]*\]\(([^)]+)\)/gu)) {
      const target = match[1].trim().split(/\s+/u)[0];
      if (/^(?:#|https?:|mailto:|tel:)/u.test(target)) continue;
      const localTarget = decodeURIComponent(target.split("#", 1)[0]);
      if (localTarget && !existsSync(resolve(dirname(file), localTarget))) {
        errors.push(`broken documentation link: ${file} -> ${target}`);
      }
    }
  }
}

for (const workspace of [
  "apps/api",
  "apps/console",
  "packages/audit",
  "packages/cli",
  "packages/core",
  "packages/mcp",
  "packages/packets",
  "packages/policy",
]) {
  const manifest = JSON.parse(readFileSync(`${workspace}/package.json`, "utf8"));
  if (manifest.license !== "Apache-2.0")
    errors.push(`missing Apache-2.0 package license: ${workspace}`);
}

if (errors.length > 0) {
  console.error(`Public readiness failed (${errors.length}):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Public readiness passed: ${files.length} tracked/project files checked.`);
