import { describe, expect, it } from "vitest";
import {
  consoleFixtureContracts,
  consoleSections,
  findConsoleSection,
} from "../src/lib/console-model.js";

describe("public console model", () => {
  it("exposes eight stable sections plus dashboard", () => {
    expect(consoleSections.map((section) => section.slug)).toEqual([
      "knowledge",
      "packets",
      "agents",
      "approvals",
      "audit",
      "operations",
      "substrates",
      "readiness",
      "settings",
    ]);
    expect(new Set(consoleSections.map((section) => section.slug)).size).toBe(9);
  });

  it("uses exported packet, policy, and audit contract values", () => {
    expect(consoleFixtureContracts).toEqual({
      packet_type: "CapabilityPacket",
      policy_decision: "approval_required",
      audit_event_type: "approval_requested",
    });
  });

  it("keeps every fixture read-only and side-effect free", () => {
    for (const section of consoleSections) {
      expect(section.status).toBe("fixture_preview");
      expect(section.mutation_controls).toEqual([]);
      expect(section.side_effects).toEqual([]);
      expect(findConsoleSection(section.slug)).toBe(section);
    }
    expect(findConsoleSection("unknown")).toBeUndefined();
  });
});
