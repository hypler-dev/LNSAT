import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { collectBuildSequenceErrors } from "./product-direction-invariants.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const projectMarkdown = execFileSync(
  "git",
  ["ls-files", "--cached", "--others", "--exclude-standard", "-z", "--", "*.md"],
  { cwd: root, encoding: "utf8" },
)
  .split("\0")
  .filter(Boolean);

const errors = [];
const sourceCache = new Map();

function source(path) {
  if (!sourceCache.has(path)) {
    try {
      sourceCache.set(path, readFileSync(resolve(root, path), "utf8"));
    } catch {
      errors.push(`missing direction document: ${path}`);
      sourceCache.set(path, "");
    }
  }
  return sourceCache.get(path);
}

function requireMarkers(path, markers) {
  const value = source(path);
  for (const marker of markers) {
    if (!value.includes(marker)) {
      errors.push(`missing direction marker in ${path}: ${marker}`);
    }
  }
}

if (projectMarkdown.length < 100) {
  errors.push(
    `project Markdown inventory unexpectedly small: ${projectMarkdown.length}`,
  );
}

const requiredMarkers = {
  "README.md": [
    "Execution authorization and evidence for consequential agent actions.",
    "## Product Ecosystem",
    "docs/CLAIMS_AND_MATURITY.md",
    "CLI_AND_OS_OPERATOR_INTERFACE.md",
    "docs/PRODUCT_BUILD_SEQUENCE.md",
  ],
  "docs/README.md": ["## Product Direction", "CLAIMS_AND_MATURITY.md"],
  "docs/DOCS_INDEX.md": [
    "ADR-0003_OPEN_CORE_EXTENSIONS_AND_MANAGEMENT_PLANE.md",
    "ADR-0006_PHASE_7_LOCAL_V1_TRUST_AND_OPTIONAL_SIGNED_EVIDENCE.md",
    "CLAIMS_AND_MATURITY.md",
    "PRODUCT_DIRECTION_ALIGNMENT.md",
  ],
  "docs/ROADMAP.md": [
    "ADR-0003_OPEN_CORE_EXTENSIONS_AND_MANAGEMENT_PLANE.md",
    "ADR-0006_PHASE_7_LOCAL_V1_TRUST_AND_OPTIONAL_SIGNED_EVIDENCE.md",
    "## Downstream Product Sequence",
    "PRODUCT_BUILD_SEQUENCE.md",
  ],
  "docs/PROJECT_STATUS.md": [
    "## Expanded Product Direction",
    "## Current Build Position",
    "ADR-0006_PHASE_7_LOCAL_V1_TRUST_AND_OPTIONAL_SIGNED_EVIDENCE.md",
  ],
  "docs/PRODUCT_BUILD_SEQUENCE.md": [
    "## Preserved Product Goal",
    "## Required Critical Path",
    "## Documentation Ownership And Drift Control",
    "Public repository source is separate from release publication.",
  ],
  "docs/CLAIMS_AND_MATURITY.md": [
    "## Public Source Is Not a Product Release",
    "## Claims Safe Today",
    "## Evidence Required for Stronger Claims",
  ],
  "docs/architecture/README.md": [
    "ADR-0003_OPEN_CORE_EXTENSIONS_AND_MANAGEMENT_PLANE.md",
    "ADR-0006_PHASE_7_LOCAL_V1_TRUST_AND_OPTIONAL_SIGNED_EVIDENCE.md",
  ],
  "docs/architecture/ADR-0003_OPEN_CORE_EXTENSIONS_AND_MANAGEMENT_PLANE.md": [
    "### Public Core",
    "### Managed Agent Content",
    "### Gatekeeper Models",
    "### Management Interfaces",
    "### Module and Connector Isolation",
  ],
  "docs/architecture/ADR-0006_PHASE_7_LOCAL_V1_TRUST_AND_OPTIONAL_SIGNED_EVIDENCE.md": [
    "local_session_and_external_signature",
    "Private keys remain user/operator owned",
    "P7-X1` does not depend on `P7-K1",
    "bounded local Git commit",
  ],
  "docs/architecture/ARCHITECTURE_AND_DEVELOPER_GUIDE.md": [
    "execution authorization and evidence",
    "## Product Planes",
  ],
  "docs/architecture/AUTHORITY_LAYER_AND_REFERENCE_WORKFLOW.md": [
    "## Managed Agent Content and Advisory Models",
  ],
  "docs/architecture/THREAT_MODEL.md": [
    "Instruction/profile/skill substitution",
    "Gatekeeper-model false allow",
    "CLI or local IPC abuse",
    "local_session_and_external_signature",
  ],
  "docs/architecture/AGENT_CONTEXT_FIREWALL_AND_PERMISSION_LEVELS.md": [
    "## Resolved Configuration Chain",
  ],
  "docs/architecture/CONTEXT_SYNTHESIS.md": ["## Work Context and Request Grouping"],
  "docs/architecture/AUTH_AND_INTEGRATION_POSTURE.md": ["## Delegated Agent Roles"],
  "docs/architecture/MANAGEMENT_UI_INFORMATION_ARCHITECTURE.md": [
    "## Expanded Management Surfaces",
    "## Relationship Views",
  ],
  "docs/architecture/UI_AND_FRAMEWORK.md": ["## Relationship Views"],
  "docs/architecture/AGENT_FRAMEWORK_ADAPTER_INCLUSION.md": [
    "## Universal and Model-Specific Configuration",
  ],
  "docs/sdk/README.md": ["## Product Expansion Contracts"],
  "docs/sdk/agent.md": ["## Managed Configuration Boundary"],
  "docs/sdk/extensions.md": ["## Open-Core and Downstream Boundary"],
  "docs/onboarding/PROJECT_ONBOARDING.md": ["## Product Direction"],
  "docs/onboarding/AGENT_ONBOARDING.md": ["## Expanded Product Boundary"],
  "packages/cli/README.md": ["## Planned Product Split"],
  "crates/lnsatd/README.md": ["CLI_AND_OS_OPERATOR_INTERFACE.md"],
  "CONTRIBUTING.md": ["## Upstream and Downstream Changes"],
  "GOVERNANCE.md": [
    "ADR-0003_OPEN_CORE_EXTENSIONS_AND_MANAGEMENT_PLANE.md",
    "docs/PUBLIC_READINESS.md",
  ],
  "SECURITY.md": ["managed instruction, skill, profile, or context substitution"],
  "docs/PUBLIC_READINESS.md": [
    "## Separate Decisions",
    "## Visibility Blockers",
    "## Recommended Public Cutover",
  ],
  "docs/RELEASING.md": [
    "ADR-0003_OPEN_CORE_EXTENSIONS_AND_MANAGEMENT_PLANE.md",
    "## Public Source Cutover",
    "## Normative Release Sequence",
    "## Downstream Release Separation",
  ],
  "docs/reference/PRODUCT_DIRECTION_ALIGNMENT.md": [
    "## Canonical Decisions",
    "## Documentation Coverage",
    "## Executable Check",
  ],
};

for (const [path, markers] of Object.entries(requiredMarkers)) {
  requireMarkers(path, markers);
}

errors.push(...collectBuildSequenceErrors(source));

const phaseNumbers = [...source("docs/ROADMAP.md").matchAll(/^### ([0-9]+)\. /gmu)].map(
  (match) => Number(match[1]),
);
const expectedPhases = Array.from({ length: 14 }, (_, index) => index + 1);
if (JSON.stringify(phaseNumbers) !== JSON.stringify(expectedPhases)) {
  errors.push(`roadmap phases must be exactly 1..14; found ${phaseNumbers.join(",")}`);
}

const retiredPrimaryFraming =
  /LNSAT is a policy-governed, audit-first substrate for controlled AI-agent operations\./iu;
for (const path of projectMarkdown) {
  if (retiredPrimaryFraming.test(source(path))) {
    errors.push(`retired primary framing: ${path}`);
  }
}

if (errors.length > 0) {
  console.error(`Product direction alignment failed (${errors.length}):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  `Product direction aligned: ${projectMarkdown.length} tracked/unignored Markdown files inventoried, 14 roadmap phases verified, ${Object.keys(requiredMarkers).length} critical documents checked.`,
);
