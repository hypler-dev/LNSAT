import { describe, expect, it } from "vitest";
import {
  API_OFFLINE_RECOVERY_STATUS,
  apiOfflineRecoveryPostureV1,
} from "../src/index.js";

describe("Phase 10 API offline-recovery boundary", () => {
  it("exposes posture only and grants no served command", () => {
    expect(API_OFFLINE_RECOVERY_STATUS).toBe("contract_only");
    expect(apiOfflineRecoveryPostureV1()).toEqual({
      contract_id: "lnsat.operator_recovery.parity.v1",
      channel: "api",
      available_commands: [],
      unavailable_commands: ["backup", "restore", "recovery.owner"],
      mutation_authority: false,
      side_effects: [],
    });
  });
});
