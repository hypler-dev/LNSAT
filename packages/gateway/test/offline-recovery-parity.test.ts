import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  offlineRecoveryParityContract,
  offlineRecoveryUnavailablePostureV1,
} from "../src/index.js";

const repoRoot = join(process.cwd(), "../..");

describe("Phase 10 offline recovery parity", () => {
  it("matches frozen fixture and keeps served channels unavailable", async () => {
    const fixture = JSON.parse(
      await readFile(
        join(repoRoot, "fixtures/contracts/phase10-recovery-parity-v1.json"),
        "utf8",
      ),
    ) as unknown;

    expect(offlineRecoveryParityContract).toEqual(fixture);
    for (const channel of ["api", "mcp", "ui"] as const) {
      expect(offlineRecoveryUnavailablePostureV1(channel)).toEqual({
        contract_id: "lnsat.operator_recovery.parity.v1",
        channel,
        available_commands: [],
        unavailable_commands: ["backup", "restore", "recovery.owner"],
        mutation_authority: false,
        side_effects: [],
      });
    }
  });
});
