import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { contractCompatibilityMatrixV1 } from "../src/index.js";

const repoRoot = dirname(dirname(dirname(dirname(fileURLToPath(import.meta.url)))));

describe("@lnsat/packets stable v1 compatibility matrix", () => {
  it("matches the authoritative stable-family fixture exactly", async () => {
    const fixture = JSON.parse(
      await readFile(
        join(repoRoot, "fixtures/contracts/compatibility-matrix-v1_0.json"),
        "utf8",
      ),
    ) as unknown;

    expect(contractCompatibilityMatrixV1).toEqual(fixture);
  });

  it("freezes fail-closed negotiation and migration posture", () => {
    expect(contractCompatibilityMatrixV1).toMatchObject({
      contract_version: "lnsat.contracts.v1_0",
      negotiation: "exact_match_only",
      reader_compatibility: "exact_declared_contract_and_family_schema",
      writer_compatibility: "emit_exact_selected_contract_and_family_schema",
      unknown_version: "reject_before_policy_or_mutation",
      implicit_upgrade_allowed: false,
      implicit_downgrade_allowed: false,
      deprecated_compatibility: {
        contract_versions: ["lnsat.contracts.v0_1"],
        implicit_entry_allowed: false,
        removal_floor: "product_2_0_0_and_90_days_and_one_supported_minor",
      },
      migration: "parallel_version_and_explicit_audited_migration_only",
      side_effects: [],
    });
    expect(contractCompatibilityMatrixV1.families).toHaveLength(7);
    expect(contractCompatibilityMatrixV1.families.map(({ family }) => family)).toEqual([
      "contract_version",
      "packet_envelope",
      "policy_decision",
      "approval_request",
      "approval_decision",
      "audit_event",
      "error_envelope",
    ]);
  });

  it("requires closed shapes and rejection of unknown fields where applicable", () => {
    for (const family of contractCompatibilityMatrixV1.families) {
      if (family.family === "contract_version") {
        expect(family.shape).toBe("canonical_scalar");
        expect(family.unknown_fields).toBe("not_applicable");
        continue;
      }
      expect(family.shape, family.family).toBe("closed");
      expect(family.unknown_fields, family.family).toBe("reject");
    }
  });
});
