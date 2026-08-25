import { describe, expect, it } from "vitest";

import * as mcp from "../src/index.js";

describe("MCP status vocabulary", () => {
  it("exports only neutral read-only status metadata", () => {
    const statuses = Object.entries(mcp).filter(([name]) =>
      /^MCP_[A-Z0-9_]+_STATUS$/u.test(name),
    );

    expect(statuses).toHaveLength(58);
    expect(statuses.every(([, value]) => value === "read_only")).toBe(true);
    expect(statuses.every(([, value]) => !/^bp-\d{4}/u.test(String(value)))).toBe(true);
  });
});
