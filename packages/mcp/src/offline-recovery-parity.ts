import { offlineRecoveryUnavailablePostureV1 } from "@lnsat/gateway";

export const MCP_OFFLINE_RECOVERY_STATUS = "read_only";
export const MCP_OFFLINE_RECOVERY_TOOL_REGISTERED = false;

export function mcpOfflineRecoveryPostureV1() {
  return offlineRecoveryUnavailablePostureV1("mcp");
}
