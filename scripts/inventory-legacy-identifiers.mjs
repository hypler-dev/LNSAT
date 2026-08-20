import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, extname, posix } from "node:path";

import prettier from "prettier";
import ts from "typescript";

const outputPath = "docs/reference/legacy-identifier-inventory.json";
const reportPath = "docs/reference/LEGACY_IDENTIFIER_INVENTORY.md";
const scriptPath = "scripts/inventory-legacy-identifiers.mjs";
const excludedPaths = new Set([outputPath, reportPath, scriptPath]);
const baselineRevision = "a827ce7a4f4f239e8b9986b619eca6ae37b62441";
const verifiedBaseline = {
  milestone_identifier: { occurrences: 2205, files: 326 },
  build_packet_terminology: { occurrences: 59, files: 24 },
};

const patterns = [
  {
    kind: "milestone_identifier",
    expression: "BP-[0-9]{4}",
    regex: /BP-[0-9]{4}/giu,
  },
  {
    kind: "build_packet_terminology",
    expression: "build[-_. ]packet",
    regex: /build[-_. ]packet/giu,
  },
  {
    kind: "lifecycle_status_symbol",
    expression: "BuildPhase|currentBuildPhase",
    regex: /\b(?:BuildPhase|currentBuildPhase)\b/gu,
  },
];

const migrationOrder = [
  "01_core_lifecycle",
  "02_packets",
  "03_policy",
  "04_audit",
  "05_api",
  "06_mcp",
  "07_cli",
  "08_console",
  "09_shared_fixtures",
  "10_rust_conformance",
  "11_root_tooling",
  "12_docs_and_examples",
];
const inventoryCategories = [
  "exported_public_source_constant",
  "internal_runtime_source_constant",
  "api_or_mcp_response_value",
  "test_only_label",
  "fixture_identifier_or_path",
  "documentation_or_example_reference",
];
const migrationLanes = [
  "phase_2_core_lifecycle",
  "phase_2_neutral_status_vocabulary",
  "phase_3_project_state_compatibility",
  "future_versioned_contract_identifier_compatibility",
  "future_terminology_cleanup",
];

function runGit(args) {
  const result = spawnSync("git", args, { encoding: "utf8" });
  if (result.status !== 0) {
    process.stderr.write(result.stderr);
    process.exit(result.status ?? 1);
  }
  return result.stdout;
}

function trackedFiles() {
  return runGit(["ls-files", "-z"])
    .split("\0")
    .filter(Boolean)
    .filter((file) => !excludedPaths.has(file))
    .sort();
}

function baselineCount(expression, filesOnly = false) {
  const args = ["grep", "-I", "-i", "-E", filesOnly ? "-l" : "-o", expression];
  args.push(baselineRevision, "--");
  return runGit(args).split("\n").filter(Boolean).length;
}

function baselineEvidence() {
  const revisionAvailable =
    spawnSync("git", ["cat-file", "-e", `${baselineRevision}^{commit}`], {
      stdio: "ignore",
    }).status === 0;
  if (revisionAvailable) {
    const reproduced = {
      milestone_identifier: {
        occurrences: baselineCount("BP-[0-9]{4}"),
        files: baselineCount("BP-[0-9]{4}", true),
      },
      build_packet_terminology: {
        occurrences: baselineCount("build[-_. ]packet"),
        files: baselineCount("build[-_. ]packet", true),
      },
    };
    if (JSON.stringify(reproduced) !== JSON.stringify(verifiedBaseline)) {
      throw new Error(
        "Legacy inventory baseline revision no longer reproduces verified counts.",
      );
    }
  }
  return {
    revision: baselineRevision,
    verification_policy:
      "replay_when_revision_is_available; otherwise use committed_verified_counts",
    ...verifiedBaseline,
  };
}

function isText(source) {
  return !source.includes("\0");
}

function lineStarts(source) {
  const starts = [0];
  for (let index = 0; index < source.length; index += 1) {
    if (source.charCodeAt(index) === 10) starts.push(index + 1);
  }
  return starts;
}

function locationFor(starts, offset) {
  let low = 0;
  let high = starts.length - 1;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    if (starts[middle] <= offset) low = middle + 1;
    else high = middle - 1;
  }
  return { line: high + 1, column: offset - starts[high] + 1 };
}

function exportedRanges(file, source) {
  if (!file.endsWith(".ts") && !file.endsWith(".tsx")) return [];
  const sourceFile = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const ranges = [];
  for (const statement of sourceFile.statements) {
    const exported = statement.modifiers?.some(
      (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
    );
    if (!exported) continue;
    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        ranges.push({
          start: declaration.getStart(sourceFile),
          end: declaration.getEnd(),
          symbol: declaration.name.getText(sourceFile),
        });
      }
      continue;
    }
    if (ts.isTypeAliasDeclaration(statement) || ts.isEnumDeclaration(statement)) {
      ranges.push({
        start: statement.getStart(sourceFile),
        end: statement.getEnd(),
        symbol: statement.name?.getText(sourceFile) ?? "default-export",
      });
    }
  }
  return ranges;
}

function exportedSymbolAt(ranges, offset) {
  return ranges.find((range) => range.start <= offset && offset < range.end)?.symbol;
}

function categoryFor(file, symbol) {
  if (file.startsWith("fixtures/") || file.includes("/fixtures/")) {
    return "fixture_identifier_or_path";
  }
  if (file.includes("/test/") || file.includes("/tests/") || file.includes(".test.")) {
    return "test_only_label";
  }
  if (file.startsWith("docs/") || extname(file) === ".md") {
    return "documentation_or_example_reference";
  }
  if (file.startsWith("apps/api/src/") || file.startsWith("packages/mcp/src/")) {
    return "api_or_mcp_response_value";
  }
  if (symbol) return "exported_public_source_constant";
  return "internal_runtime_source_constant";
}

function ownerFor(file) {
  if (file.startsWith("apps/api/")) return "@lnsat/api";
  if (file.startsWith("apps/console/")) return "@lnsat/console";
  if (file.startsWith("packages/")) {
    const workspace = file.split("/")[1];
    return `@lnsat/${workspace}`;
  }
  if (file.startsWith("crates/lnsat-contracts/")) return "lnsat-contracts";
  if (file.startsWith("fixtures/")) return "shared-fixtures";
  if (file.startsWith("docs/")) return "public-docs";
  if (file.startsWith("scripts/")) return "root-tooling";
  return "repository-root";
}

function migrationFamilyFor(file) {
  if (file.startsWith("packages/core/")) return "01_core_lifecycle";
  if (file.startsWith("packages/packets/")) return "02_packets";
  if (file.startsWith("packages/policy/")) return "03_policy";
  if (file.startsWith("packages/audit/")) return "04_audit";
  if (file.startsWith("apps/api/")) return "05_api";
  if (file.startsWith("packages/mcp/")) return "06_mcp";
  if (file.startsWith("packages/cli/")) return "07_cli";
  if (file.startsWith("apps/console/")) return "08_console";
  if (file.startsWith("fixtures/")) return "09_shared_fixtures";
  if (file.startsWith("crates/")) return "10_rust_conformance";
  if (file.startsWith("scripts/")) return "11_root_tooling";
  return "12_docs_and_examples";
}

function migrationLaneFor(file, kind, match) {
  if (kind === "lifecycle_status_symbol") return "phase_2_core_lifecycle";
  if (
    file.includes("build-packet-state") ||
    file.startsWith("fixtures/project-state/") ||
    match.toLowerCase() === "build.packet"
  ) {
    return "phase_3_project_state_compatibility";
  }
  if (
    kind === "milestone_identifier" &&
    match === match.toLowerCase() &&
    ((file.startsWith("apps/api/src/local-control-plane-") &&
      file.endsWith("-routes.ts")) ||
      file.startsWith("apps/api/test/local-control-plane-"))
  ) {
    return "future_versioned_contract_identifier_compatibility";
  }
  if (
    kind === "milestone_identifier" &&
    match === match.toLowerCase() &&
    (file === "packages/mcp/src/index.ts" || file.startsWith("packages/mcp/test/"))
  ) {
    return "future_versioned_contract_identifier_compatibility";
  }
  if (
    kind === "milestone_identifier" &&
    match === match.toLowerCase() &&
    (file === "scripts/local-beta-approval-request.integration.test.mjs" ||
      file === "scripts/public-readiness-rules.test.mjs")
  ) {
    return "future_versioned_contract_identifier_compatibility";
  }
  if (kind === "milestone_identifier" && match === match.toLowerCase()) {
    return "phase_2_neutral_status_vocabulary";
  }
  if (kind === "build_packet_terminology") return "future_terminology_cleanup";
  return "future_versioned_contract_identifier_compatibility";
}

function countBy(
  items,
  key,
  values = [...new Set(items.map((item) => item[key]))].sort(),
) {
  return Object.fromEntries(
    values.map((value) => [value, items.filter((item) => item[key] === value).length]),
  );
}

function fileCountsBy(
  items,
  key,
  values = [...new Set(items.map((item) => item[key]))].sort(),
) {
  return Object.fromEntries(
    values.map((value) => [
      value,
      new Set(items.filter((item) => item[key] === value).map((item) => item.path))
        .size,
    ]),
  );
}

function importerMapFor(textByFile) {
  const importers = new Map();
  const importPattern = /(?:from\s+|import\s*\()\s*["']([^"']+)["']/gu;
  for (const [file, source] of textByFile) {
    for (const match of source.matchAll(new RegExp(importPattern))) {
      const specifier = match[1];
      if (!specifier.startsWith(".")) continue;
      const base = posix.normalize(posix.join(dirname(file), specifier));
      const candidates = [
        base,
        base.replace(/\.js$/u, ".ts"),
        base.replace(/\.js$/u, ".tsx"),
        `${base}.ts`,
        `${base}.tsx`,
        posix.join(base, "index.ts"),
      ];
      const target = candidates.find((candidate) => textByFile.has(candidate));
      if (!target) continue;
      const current = importers.get(target) ?? new Set();
      current.add(file);
      importers.set(target, current);
    }
  }
  return importers;
}

function transitiveImporters(declarationPath, importerMap) {
  const seen = new Set();
  const queue = [...(importerMap.get(declarationPath) ?? [])];
  while (queue.length > 0) {
    const file = queue.shift();
    if (seen.has(file)) continue;
    seen.add(file);
    queue.push(...(importerMap.get(file) ?? []));
  }
  return [...seen];
}

function consumerFilesFor(symbol, declarationPath, textByFile, importerMap) {
  const consumers = new Set(
    symbol ? [] : transitiveImporters(declarationPath, importerMap),
  );
  if (symbol && /^[A-Za-z_$][A-Za-z0-9_$]*$/u.test(symbol)) {
    const escaped = symbol.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
    const pattern = new RegExp(`\\b${escaped}\\b`, "u");
    for (const [file, source] of textByFile) {
      if (file !== declarationPath && pattern.test(source)) consumers.add(file);
    }
  }
  return [...consumers].sort();
}

function compatibilityDecision(category) {
  if (category === "exported_public_source_constant") {
    return "add_neutral_export_then_deprecate_legacy_export";
  }
  return "add_versioned_neutral_value_or_tool_and_retain_deprecated_legacy_alias";
}

function isFixtureOrConformanceFile(file) {
  return (
    file.startsWith("fixtures/") ||
    file.includes("/fixtures/") ||
    file.includes("/test/") ||
    file.includes("/tests/") ||
    file.includes(".test.")
  );
}

function buildInventory() {
  const files = trackedFiles();
  const textByFile = new Map();
  const treeHash = createHash("sha256");
  for (const file of files) {
    const source = readFileSync(file, "utf8");
    if (!isText(source)) continue;
    textByFile.set(file, source);
    treeHash.update(file).update("\0").update(source).update("\0");
  }
  const importerMap = importerMapFor(textByFile);

  const occurrences = [];
  for (const [file, source] of textByFile) {
    const starts = lineStarts(source);
    const ranges = exportedRanges(file, source);
    for (const pattern of patterns) {
      for (const match of source.matchAll(new RegExp(pattern.regex))) {
        const offset = match.index;
        const symbol = exportedSymbolAt(ranges, offset) ?? null;
        const location = locationFor(starts, offset);
        const category = categoryFor(file, symbol);
        occurrences.push({
          occurrence_id: "",
          kind: pattern.kind,
          path: file,
          line: location.line,
          column: location.column,
          match: match[0],
          normalized_match: match[0].toLowerCase(),
          category,
          owner: ownerFor(file),
          exported_symbol: symbol,
          migration_family: migrationFamilyFor(file),
          migration_lane: migrationLaneFor(file, pattern.kind, match[0]),
        });
      }
    }
  }

  occurrences.sort(
    (left, right) =>
      left.path.localeCompare(right.path) ||
      left.line - right.line ||
      left.column - right.column ||
      left.kind.localeCompare(right.kind),
  );
  occurrences.forEach((occurrence, index) => {
    occurrence.occurrence_id = `legacy-${String(index + 1).padStart(5, "0")}`;
  });

  const publicSurfaceOccurrences = occurrences.filter((occurrence) =>
    ["exported_public_source_constant", "api_or_mcp_response_value"].includes(
      occurrence.category,
    ),
  );
  const surfaceMap = new Map();
  for (const occurrence of publicSurfaceOccurrences) {
    const key = `${occurrence.path}::${occurrence.exported_symbol ?? "file-surface"}`;
    const current = surfaceMap.get(key) ?? {
      path: occurrence.path,
      exported_symbol: occurrence.exported_symbol,
      category: occurrence.category,
      owner: occurrence.owner,
      migration_family: occurrence.migration_family,
      migration_lanes: new Set(),
      occurrence_ids: [],
    };
    current.migration_lanes.add(occurrence.migration_lane);
    current.occurrence_ids.push(occurrence.occurrence_id);
    surfaceMap.set(key, current);
  }

  const compatibilitySurfaces = [...surfaceMap.values()]
    .map((surface) => {
      const consumerFiles = consumerFilesFor(
        surface.exported_symbol,
        surface.path,
        textByFile,
        importerMap,
      );
      return {
        path: surface.path,
        exported_symbol: surface.exported_symbol,
        category: surface.category,
        owner: surface.owner,
        migration_family: surface.migration_family,
        migration_lanes: [...surface.migration_lanes].sort(),
        occurrence_ids: surface.occurrence_ids,
        consumer_files: consumerFiles,
        consumer_evidence:
          consumerFiles.length > 0
            ? "named_repo_consumers"
            : "no_repo_local_consumer_found_by_symbol_or_import_graph",
        fixture_or_conformance_consumers: consumerFiles.filter(
          isFixtureOrConformanceFile,
        ),
        schema_version_impact:
          "preserve_current_schema_version_until_serialized_value_changes_are_explicitly_versioned",
        compatibility_decision: compatibilityDecision(surface.category),
        rollback_plan:
          "revert_the_owning_family_commit_and_restore_legacy_value_aliases_and_fixtures",
      };
    })
    .sort(
      (left, right) =>
        migrationOrder.indexOf(left.migration_family) -
          migrationOrder.indexOf(right.migration_family) ||
        left.path.localeCompare(right.path) ||
        (left.exported_symbol ?? "").localeCompare(right.exported_symbol ?? ""),
    );

  const patternKinds = patterns.map((pattern) => pattern.kind);
  const byKind = countBy(occurrences, "kind", patternKinds);
  const filesByKind = fileCountsBy(occurrences, "kind", patternKinds);
  const inventory = {
    schema_version: "1.0",
    source_tree_sha256: treeHash.digest("hex"),
    scope: {
      tracked_text_files_only: true,
      excluded_inventory_mechanics: [...excludedPaths].sort(),
      patterns: Object.fromEntries(
        patterns.map((pattern) => [pattern.kind, pattern.expression]),
      ),
    },
    reproduced_pre_phase_zero_baseline: baselineEvidence(),
    current_counts: {
      total_occurrences: occurrences.length,
      total_files: new Set(occurrences.map((occurrence) => occurrence.path)).size,
      occurrences_by_kind: byKind,
      files_by_kind: filesByKind,
      occurrences_by_category: countBy(occurrences, "category", inventoryCategories),
      files_by_category: fileCountsBy(occurrences, "category", inventoryCategories),
      occurrences_by_owner: countBy(occurrences, "owner"),
      files_by_owner: fileCountsBy(occurrences, "owner"),
      occurrences_by_migration_family: countBy(
        occurrences,
        "migration_family",
        migrationOrder,
      ),
      files_by_migration_family: fileCountsBy(
        occurrences,
        "migration_family",
        migrationOrder,
      ),
      occurrences_by_migration_lane: countBy(
        occurrences,
        "migration_lane",
        migrationLanes,
      ),
      files_by_migration_lane: fileCountsBy(
        occurrences,
        "migration_lane",
        migrationLanes,
      ),
    },
    migration_order: migrationOrder,
    compatibility_surfaces: compatibilitySurfaces,
    occurrences,
  };
  validateInventory(inventory);
  return inventory;
}

function validateInventory(inventory) {
  const baseline = inventory.reproduced_pre_phase_zero_baseline;
  if (
    baseline.milestone_identifier.occurrences !==
      verifiedBaseline.milestone_identifier.occurrences ||
    baseline.milestone_identifier.files !==
      verifiedBaseline.milestone_identifier.files ||
    baseline.build_packet_terminology.occurrences !==
      verifiedBaseline.build_packet_terminology.occurrences ||
    baseline.build_packet_terminology.files !==
      verifiedBaseline.build_packet_terminology.files
  ) {
    throw new Error("Legacy inventory baseline does not match verified Phase 1 input.");
  }

  const allowedCategories = new Set(inventoryCategories);
  const ids = new Set();
  for (const occurrence of inventory.occurrences) {
    if (ids.has(occurrence.occurrence_id)) {
      throw new Error(`Duplicate occurrence id: ${occurrence.occurrence_id}`);
    }
    ids.add(occurrence.occurrence_id);
    if (!allowedCategories.has(occurrence.category)) {
      throw new Error(`Unknown category: ${occurrence.category}`);
    }
    if (!occurrence.owner || !migrationOrder.includes(occurrence.migration_family)) {
      throw new Error(`Unowned occurrence: ${occurrence.occurrence_id}`);
    }
  }
  if (ids.size !== inventory.current_counts.total_occurrences) {
    throw new Error("Occurrence total does not match inventory rows.");
  }
  for (const surface of inventory.compatibility_surfaces) {
    if (
      !surface.schema_version_impact ||
      !surface.compatibility_decision ||
      !surface.rollback_plan ||
      !surface.consumer_evidence
    ) {
      throw new Error(`Incomplete compatibility surface: ${surface.path}`);
    }
  }
}

function validateReportSummary(inventory) {
  const report = readFileSync(reportPath, "utf8");
  const baseline = inventory.reproduced_pre_phase_zero_baseline;
  const counts = inventory.current_counts;
  const rows = [
    [
      "Milestone identifiers",
      baseline.milestone_identifier.occurrences,
      baseline.milestone_identifier.files,
    ],
    [
      "Build-packet terminology",
      baseline.build_packet_terminology.occurrences,
      baseline.build_packet_terminology.files,
    ],
    [
      "Milestone identifiers",
      counts.occurrences_by_kind.milestone_identifier,
      counts.files_by_kind.milestone_identifier,
    ],
    [
      "Build-packet terminology",
      counts.occurrences_by_kind.build_packet_terminology,
      counts.files_by_kind.build_packet_terminology,
    ],
    [
      "Lifecycle source symbols",
      counts.occurrences_by_kind.lifecycle_status_symbol,
      counts.files_by_kind.lifecycle_status_symbol,
    ],
    ["Combined inventory", counts.total_occurrences, counts.total_files],
    [
      "Exported public source constant",
      counts.occurrences_by_category.exported_public_source_constant,
      counts.files_by_category.exported_public_source_constant,
    ],
    [
      "Internal runtime/source constant",
      counts.occurrences_by_category.internal_runtime_source_constant,
      counts.files_by_category.internal_runtime_source_constant,
    ],
    [
      "API or MCP response value",
      counts.occurrences_by_category.api_or_mcp_response_value,
      counts.files_by_category.api_or_mcp_response_value,
    ],
    [
      "Test-only label",
      counts.occurrences_by_category.test_only_label,
      counts.files_by_category.test_only_label,
    ],
    [
      "Fixture identifier or path",
      counts.occurrences_by_category.fixture_identifier_or_path,
      counts.files_by_category.fixture_identifier_or_path,
    ],
    [
      "Documentation or example reference",
      counts.occurrences_by_category.documentation_or_example_reference,
      counts.files_by_category.documentation_or_example_reference,
    ],
  ];
  for (const [label, occurrences, files] of rows) {
    const rowPattern = new RegExp(
      `\\|\\s*${label.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")}\\s*\\|\\s*${occurrences.toLocaleString("en-US")}\\s*\\|\\s*${files.toLocaleString("en-US")}\\s*\\|`,
      "u",
    );
    if (!rowPattern.test(report)) {
      throw new Error(`Legacy inventory report row is stale: ${label}`);
    }
  }
  const surfaceStatement = `Inventory records ${inventory.compatibility_surfaces.length.toLocaleString("en-US")} exported or API/MCP compatibility surfaces.`;
  if (!report.includes(surfaceStatement)) {
    throw new Error("Legacy inventory compatibility surface summary is stale.");
  }
}

const inventory = buildInventory();
const prettierConfig = (await prettier.resolveConfig(outputPath)) ?? {};
const serialized = await prettier.format(JSON.stringify(inventory), {
  ...prettierConfig,
  filepath: outputPath,
});
const mode = process.argv[2] ?? "--summary";

if (mode === "--write") {
  writeFileSync(outputPath, serialized);
  console.log(
    `Legacy inventory wrote ${inventory.current_counts.total_occurrences} occurrences across ${inventory.current_counts.total_files} files to ${outputPath}.`,
  );
} else if (mode === "--check") {
  const current = readFileSync(outputPath, "utf8");
  if (current !== serialized) {
    console.error(`Legacy inventory is stale: run node ${scriptPath} --write.`);
    process.exit(1);
  }
  validateReportSummary(inventory);
  console.log(
    `Legacy inventory current: ${inventory.current_counts.total_occurrences} occurrences across ${inventory.current_counts.total_files} files.`,
  );
} else if (mode === "--summary") {
  console.log(JSON.stringify(inventory.current_counts, null, 2));
} else {
  console.error(`Unknown mode: ${mode}`);
  process.exit(2);
}
