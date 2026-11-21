import { describe, expect, it } from "vitest";
import {
  LNSAT_CORE_VERSION,
  LNSAT_PRODUCT_NAME,
  currentBuildPhase,
} from "../src/index.js";

describe("@lnsat/core", () => {
  it("exposes the current product identity and phase", () => {
    expect(LNSAT_PRODUCT_NAME).toBe("Layered Network Substrate for Agent Telemetry");
    expect(LNSAT_CORE_VERSION).toBe("0.1.0");
    expect(currentBuildPhase).toBe("Phase 2: Policy And Audit Skeleton");
  });
});
