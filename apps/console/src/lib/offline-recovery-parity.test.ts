import { describe, expect, it } from "vitest";
import {
  CONTROL_CENTER_OFFLINE_RECOVERY_STATUS,
  projectOfflineRecoveryPostureV1,
} from "./offline-recovery-parity.js";

describe("Phase 10 Control Center offline-recovery boundary", () => {
  it("renders no recovery action and grants no authority", () => {
    expect(CONTROL_CENTER_OFFLINE_RECOVERY_STATUS).toBe("contract_only");
    expect(projectOfflineRecoveryPostureV1()).toEqual({
      contract_id: "lnsat.operator_recovery.parity.v1",
      channel: "ui",
      available_commands: [],
      unavailable_commands: ["backup", "restore", "recovery.owner"],
      mutation_authority: false,
      side_effects: [],
      rendered_actions: [],
      action_authority: false,
    });
  });
});
