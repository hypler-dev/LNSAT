import { describe, expect, it } from "vitest";

import * as apiExports from "../src/index.js";

describe("Gateway source status vocabulary", () => {
  it("uses neutral metadata outside the legacy project-state alias", () => {
    const statusEntries = Object.entries(apiExports).filter(
      ([name, value]) => name.endsWith("_STATUS") && typeof value === "string",
    );
    const projectStateStatusName = [
      "BUILD",
      "PACKET",
      "STATE",
      "GATEWAY",
      "STATUS",
    ].join("_");
    const supportedStatusEntries = statusEntries.filter(
      ([name]) => name !== projectStateStatusName,
    );

    expect(supportedStatusEntries).toHaveLength(35);
    expect(
      supportedStatusEntries.every(([, value]) =>
        ["contract_only", "local_only", "read_only"].includes(value),
      ),
    ).toBe(true);
    expect(
      supportedStatusEntries.filter(([, value]) => /bp-[0-9]{4}/iu.test(value)),
    ).toEqual([]);
    expect(
      statusEntries.find(([name]) => name === projectStateStatusName)?.[1],
    ).toMatch(/^bp-\d{4}-/u);
  });
});
