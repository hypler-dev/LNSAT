import { describe, expect, it } from "vitest";
import {
  MCP_OFFLINE_RECOVERY_STATUS,
  MCP_OFFLINE_RECOVERY_TOOL_REGISTERED,
  mcpOfflineRecoveryPostureV1,
} from "../src/index.js";

describe("Phase 10 MCP offline-recovery boundary", () => {
  it("registers no recovery tool and grants no command", () => {
    expect(MCP_OFFLINE_RECOVERY_STATUS).toBe("read_only");
    expect(MCP_OFFLINE_RECOVERY_TOOL_REGISTERED).toBe(false);
    expect(mcpOfflineRecoveryPostureV1()).toEqual({
      contract_id: "lnsat.operator_recovery.parity.v1",
      channel: "mcp",
      available_commands: [],
      unavailable_commands: ["backup", "restore", "recovery.owner"],
      mutation_authority: false,
      side_effects: [],
    });
  });
});
