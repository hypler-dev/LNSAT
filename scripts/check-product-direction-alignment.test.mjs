import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { collectBuildSequenceErrors } from "./product-direction-invariants.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const paths = [
  "README.md",
  "docs/PROJECT_STATUS.md",
  "docs/ROADMAP.md",
  "docs/PRODUCT_BUILD_SEQUENCE.md",
  "docs/RELEASING.md",
  "docs/PUBLIC_READINESS.md",
  "docs/CLAIMS_AND_MATURITY.md",
  "docs/reference/PRODUCT_DIRECTION_ALIGNMENT.md",
  "docs/architecture/DISTRIBUTION_AND_CLIENT_INSTALLERS.md",
];

function documents() {
  return new Map(
    paths.map((path) => [path, readFileSync(resolve(root, path), "utf8")]),
  );
}

function errors(values) {
  return collectBuildSequenceErrors((path) => values.get(path) ?? "");
}

test("current product/build direction passes", () => {
  assert.deepEqual(errors(documents()), []);
});

test("public source and supported release remain separate", () => {
  const values = documents();
  values.set(
    "docs/PUBLIC_READINESS.md",
    `${values.get("docs/PUBLIC_READINESS.md")}\nMaking repository public establishes a supported release.\n`,
  );
  assert.match(
    errors(values).join("\n"),
    /repository visibility\/source maturity contradiction/u,
  );
});

test("negative public-source maturity statement remains valid", () => {
  const values = documents();
  values.set(
    "docs/PUBLIC_READINESS.md",
    `${values.get("docs/PUBLIC_READINESS.md")}\nPublic repository visibility does not establish a supported release. Public source is not a supported product.\n`,
  );
  assert.deepEqual(errors(values), []);
});

test("public-source separation markers fail closed when removed", () => {
  const values = documents();
  values.set(
    "docs/RELEASING.md",
    values
      .get("docs/RELEASING.md")
      .replace(
        "Public repository source and supported release artifacts are separate events.",
        "Repository policy is documented elsewhere.",
      ),
  );
  assert.match(
    errors(values).join("\n"),
    /public repository source must remain separate/u,
  );
});

test("additive published maturity claim fails closed", () => {
  const values = documents();
  values.set(
    "docs/PROJECT_STATUS.md",
    `${values.get("docs/PROJECT_STATUS.md")}\nLNSAT 0.1.0 is supported and published. Hosted runtime is available.\n`,
  );
  assert.match(errors(values).join("\n"), /source-only\/unpublished/u);
});

test("early Phase 14 packaging fails closed", () => {
  const values = documents();
  values.set(
    "docs/ROADMAP.md",
    `${values.get("docs/ROADMAP.md")}\nPhase 14 package work may start before Phase 13.\n`,
  );
  assert.match(
    errors(values).join("\n"),
    /candidate\/package\/binary build contradiction/u,
  );
});

test("current Phase 14 packaging authorization fails closed", () => {
  const values = documents();
  values.set(
    "docs/ROADMAP.md",
    `${values.get("docs/ROADMAP.md")}\nPhase 14 package work is authorized now.\n`,
  );
  assert.match(
    errors(values).join("\n"),
    /current candidate\/package\/binary authorization contradiction/u,
  );
});

test("limited current Phase 14 authorization still fails closed", () => {
  const values = documents();
  values.set(
    "docs/ROADMAP.md",
    `${values.get("docs/ROADMAP.md")}\nPhase 14 package work is authorized now without production signing.\n`,
  );
  assert.match(
    errors(values).join("\n"),
    /current candidate\/package\/binary authorization contradiction/u,
  );
});

test("current build and publication timing synonyms fail closed", () => {
  const claims = [
    "Phase 14 package work may start immediately.",
    "Phase 14 package work can begin today.",
    "Phase 14 package work is currently allowed.",
    "Phase 14 package work is underway.",
    "Phase 14 package work has begun.",
    "Candidate artifacts can be built now.",
    "Release publication may proceed immediately.",
    "Release publication is underway.",
    "Release publication has begun.",
    "Packages may be published now.",
    "Publishing can proceed now.",
  ];
  for (const claim of claims) {
    const values = documents();
    values.set("docs/ROADMAP.md", `${values.get("docs/ROADMAP.md")}\n${claim}\n`);
    assert.notDeepEqual(errors(values), [], claim);
  }
});

test("plain early-order and publication claims fail closed", () => {
  const claims = [
    "Packaging may begin before Phase 13.",
    "Phase 14 may precede Phase 13.",
    "We may publish before Phase 14.",
    "Packages may be published before Phase 14.",
  ];
  for (const claim of claims) {
    const values = documents();
    values.set("docs/ROADMAP.md", `${values.get("docs/ROADMAP.md")}\n${claim}\n`);
    assert.notDeepEqual(errors(values), [], claim);
  }
});

test("unrelated safe negation cannot hide early build claim", () => {
  for (const conjunction of [", while", "and"]) {
    const values = documents();
    values.set(
      "docs/ROADMAP.md",
      `${values.get("docs/ROADMAP.md")}\nPhase 14 package work may start before Phase 13 ${conjunction} release publication must not begin before Phase 14.\n`,
    );
    assert.match(
      errors(values).join("\n"),
      /candidate\/package\/binary build contradiction/u,
      conjunction,
    );
  }
});

test("missing required phase order fails closed", () => {
  const values = documents();
  values.set(
    "docs/PRODUCT_BUILD_SEQUENCE.md",
    values
      .get("docs/PRODUCT_BUILD_SEQUENCE.md")
      .replace("Phase 10 -> Phase 11 ->\nPhase 13", "Phase 10 -> Phase 13"),
  );
  assert.match(errors(values).join("\n"), /Phase 14 packaging must follow/u);
});

test("publication before Phase 14 fails closed", () => {
  const values = documents();
  values.set(
    "docs/ROADMAP.md",
    `${values.get("docs/ROADMAP.md")}\nRelease publication may begin prior to Phase 14.\n`,
  );
  assert.match(errors(values).join("\n"), /publication contradiction/u);
});

test("current publication authorization fails closed", () => {
  const values = documents();
  values.set(
    "docs/ROADMAP.md",
    `${values.get("docs/ROADMAP.md")}\nRelease publication is authorized now.\n`,
  );
  assert.match(
    errors(values).join("\n"),
    /current publication authorization contradiction/u,
  );
});

test("additively opening optional signed packets fails closed", () => {
  const values = documents();
  values.set(
    "docs/reference/PRODUCT_DIRECTION_ALIGNMENT.md",
    `${values.get("docs/reference/PRODUCT_DIRECTION_ALIGNMENT.md")}\nP7-K1 is required, open, granted, and release-blocking for local v1.\n`,
  );
  assert.match(errors(values).join("\n"), /optional signed packets/u);
});

test("optional-lane blocking synonyms fail closed", () => {
  const claims = [
    "P7-K1 is mandatory for local v1.",
    "P7-K1 now blocks initial local v1.",
    "P7-K1 is needed for initial local v1.",
    "P7-K1 is now enabled.",
    "Phase 12 is a prerequisite for local v1.",
    "Phase 12 is on the critical path for local v1.",
  ];
  for (const claim of claims) {
    const values = documents();
    values.set(
      "docs/reference/PRODUCT_DIRECTION_ALIGNMENT.md",
      `${values.get("docs/reference/PRODUCT_DIRECTION_ALIGNMENT.md")}\n${claim}\n`,
    );
    assert.match(errors(values).join("\n"), /optional signed packets/u, claim);
  }
});

test("unrelated selected condition cannot hide optional-lane opening", () => {
  for (const conjunction of [", while", "and"]) {
    const values = documents();
    values.set(
      "docs/reference/PRODUCT_DIRECTION_ALIGNMENT.md",
      `${values.get("docs/reference/PRODUCT_DIRECTION_ALIGNMENT.md")}\nP7-K1 is now open ${conjunction} P7-S1 may be required only if separately selected.\n`,
    );
    assert.match(errors(values).join("\n"), /optional signed packets/u, conjunction);
  }
});

test("published/runtime availability contradictions fail closed", () => {
  const values = documents();
  values.set(
    "docs/PROJECT_STATUS.md",
    values
      .get("docs/PROJECT_STATUS.md")
      .replace("| Distribution | Not available |", "| Distribution | Available |")
      .replace("| Hosted runtime | Not available |", "| Hosted runtime | Available |")
      .replace(
        "LNSAT `0.1.0` is pre-release, source-only software.",
        "LNSAT `0.1.0` is supported and published.",
      ),
  );
  assert.match(errors(values).join("\n"), /source-only\/unpublished/u);
});

test("production-ready maturity synonym fails closed", () => {
  for (const claim of [
    "LNSAT 0.1.0 is production-ready.",
    "LNSAT 0.1.0 is production ready.",
    "LNSAT 0.1.0 is generally available.",
  ]) {
    const values = documents();
    values.set(
      "docs/PROJECT_STATUS.md",
      `${values.get("docs/PROJECT_STATUS.md")}\n${claim}\n`,
    );
    assert.match(errors(values).join("\n"), /source-only\/unpublished/u, claim);
  }
});

test("safe negation is accepted as non-contradictory", () => {
  const values = documents();
  values.set(
    "docs/ROADMAP.md",
    `${values.get("docs/ROADMAP.md")} Phase 14 candidate-build must not begin before Phase 13. Release publication must not begin before Phase 14.\n`,
  );
  values.set(
    "docs/reference/PRODUCT_DIRECTION_ALIGNMENT.md",
    `${values.get("docs/reference/PRODUCT_DIRECTION_ALIGNMENT.md")}\nP7-K1 must not be required, open, granted, or release-blocking.\n`,
  );
  assert.deepEqual(errors(values), []);
});

test("separately selected optional lane may become required", () => {
  const values = documents();
  values.set(
    "docs/reference/PRODUCT_DIRECTION_ALIGNMENT.md",
    `${values.get("docs/reference/PRODUCT_DIRECTION_ALIGNMENT.md")}\nP7-K1 may be required only if separately selected.\n`,
  );
  assert.deepEqual(errors(values), []);
});

test("separately selected Phase 12 support profile may become required", () => {
  const values = documents();
  values.set(
    "docs/reference/PRODUCT_DIRECTION_ALIGNMENT.md",
    `${values.get("docs/reference/PRODUCT_DIRECTION_ALIGNMENT.md")}\nPhase 12 may be required only if a support profile is separately selected.\n`,
  );
  assert.deepEqual(errors(values), []);
});

test("Phase 10 lifecycle-proof ordering contradiction fails closed", () => {
  const values = documents();
  values.set(
    "docs/ROADMAP.md",
    `${values.get("docs/ROADMAP.md")}\nPhase 10 requires selected canonical-target lifecycle proof before Phase 14.\n`,
  );
  assert.match(
    errors(values).join("\n"),
    /Phase 10 lifecycle proof claims must not precede Phase 14 target selection/u,
  );
});

test("Phase 10 target-specific lifecycle ownership synonyms fail closed", () => {
  const claims = [
    "Phase 10 exit requires selected-target lifecycle proof.",
    "Phase 10 owns lifecycle proof on canonical targets.",
    "Phase 10 owns selected canonical-target lifecycle proof before Phase 14.",
  ];
  for (const claim of claims) {
    const values = documents();
    values.set("docs/ROADMAP.md", `${values.get("docs/ROADMAP.md")}\n${claim}\n`);
    assert.match(
      errors(values).join("\n"),
      /Phase 10 lifecycle proof claims must not precede Phase 14 target selection/u,
      claim,
    );
  }
});

test("safe Phase 10 lifecycle-proof negation is accepted", () => {
  const values = documents();
  values.set(
    "docs/ROADMAP.md",
    `${values.get("docs/ROADMAP.md")}\nPhase 10 must not require selected canonical-target lifecycle proof before Phase 14.\n`,
  );
  assert.deepEqual(errors(values), []);
});

test("unrelated safe negation cannot hide Phase 10 ordering violation", () => {
  const values = documents();
  values.set(
    "docs/ROADMAP.md",
    `${values.get("docs/ROADMAP.md")}\nPhase 10 requires selected canonical-target lifecycle proof before Phase 14, while publication must not begin before Phase 14.\n`,
  );
  assert.match(
    errors(values).join("\n"),
    /Phase 10 lifecycle proof claims must not precede Phase 14 target selection/u,
  );
});

test("leading no early-build negation is accepted", () => {
  const values = documents();
  values.set(
    "docs/ROADMAP.md",
    `${values.get("docs/ROADMAP.md")}\nNo Phase 14 candidate-build may begin before Phase 13.\n`,
  );
  assert.deepEqual(errors(values), []);
});

test("production signing before proof or for changed bytes fails closed", () => {
  const claims = [
    "Phase 14 candidate artifacts may be production-signed before proof.",
    "Final publication may production-sign rebuilt artifacts whose bytes differ from Phase 14 proof.",
    "Production signing is underway.",
    "Candidate artifacts may be production-signed now.",
    "Production signing may begin before Phase 14 proof.",
    "Production signing may cover changed digests after Phase 14 proof.",
  ];
  for (const claim of claims) {
    const values = documents();
    values.set("docs/RELEASING.md", `${values.get("docs/RELEASING.md")}\n${claim}\n`);
    assert.match(
      errors(values).join("\n"),
      /production-signing proof contradiction/u,
      claim,
    );
  }
});
