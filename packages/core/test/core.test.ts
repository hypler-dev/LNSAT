import { describe, expect, it } from "vitest";
import {
  LNSAT_CORE_VERSION,
  LNSAT_PRODUCT_NAME,
  currentProductLifecycleStatus,
} from "../src/index.js";

describe("@lnsat/core", () => {
  it("exposes the current product identity and lifecycle status", () => {
    expect(LNSAT_PRODUCT_NAME).toBe("LNSAT");
    expect(LNSAT_CORE_VERSION).toBe("0.1.0");
    expect(currentProductLifecycleStatus).toBe("active_development");
  });
});
