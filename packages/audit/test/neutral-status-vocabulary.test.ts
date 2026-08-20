import { describe, expect, it } from "vitest";

import * as auditExports from "../src/index.js";

describe("audit source status vocabulary", () => {
  it("uses neutral metadata without milestone chronology", () => {
    const statusEntries = Object.entries(auditExports).filter(
      ([name, value]) => name.endsWith("_STATUS") && typeof value === "string",
    );

    expect(statusEntries).toHaveLength(11);
    expect(
      statusEntries.every(([, value]) =>
        ["source_only", "contract_only"].includes(value),
      ),
    ).toBe(true);
    expect(statusEntries.filter(([, value]) => /bp-[0-9]{4}/iu.test(value))).toEqual(
      [],
    );
  });
});
