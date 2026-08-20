import { afterAll, describe, expect, it } from "vitest";
import {
  buildApiGateway,
  onboardingProfileInspectionGatewayContract,
} from "../src/index.js";

const now = new Date("2026-05-03T00:00:00.000Z");

describe("@lnsat/api BP-0024 onboarding profile inspection route", () => {
  const gateway = buildApiGateway({
    now: () => now,
  });

  afterAll(async () => {
    await gateway.close();
  });

  it("inspects onboarding profiles through the read-only Fastify route", async () => {
    const response = await gateway.inject({
      method: onboardingProfileInspectionGatewayContract.method,
      url: onboardingProfileInspectionGatewayContract.path,
      payload: {
        request_id: "req_bp0024_profiles",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      ok: true,
      contract_id: onboardingProfileInspectionGatewayContract.contract_id,
      request_id: "req_bp0024_profiles",
      inspected_at: "2026-05-03T00:00:00.000Z",
      summary: {
        total: 9,
        valid: 2,
        rejected: 7,
        side_effects: [],
      },
      side_effects: [],
    });
  });

  it("filters onboarding profile route reads by supported kind", async () => {
    const response = await gateway.inject({
      method: onboardingProfileInspectionGatewayContract.method,
      url: onboardingProfileInspectionGatewayContract.path,
      payload: {
        request_id: "req_bp0024_agent_profiles",
        profile_kind: "agent",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      ok: true,
      request_id: "req_bp0024_agent_profiles",
      summary: {
        total: 5,
        valid: 1,
        rejected: 4,
      },
      side_effects: [],
    });
  });

  it("rejects malformed route requests without raw rejected command echo", async () => {
    const response = await gateway.inject({
      method: onboardingProfileInspectionGatewayContract.method,
      url: onboardingProfileInspectionGatewayContract.path,
      payload: {
        request_id: "req_bp0024_bad_shape",
        command: "npm test -- --runInBand",
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      ok: false,
      contract_id: onboardingProfileInspectionGatewayContract.contract_id,
      request_id: "req_bp0024_bad_shape",
      inspected_at: "2026-05-03T00:00:00.000Z",
      source_docs: expect.any(Array),
      errors: [
        {
          code: "onboarding_profile.unexpected_field",
          path: "/command",
          message: "Unexpected onboarding profile inspection request field.",
          severity: "error",
        },
      ],
      side_effects: [],
    });
    expect(response.body).not.toContain("npm test -- --runInBand");
  });

  it("rejects unsupported profile kinds without raw rejected value echo", async () => {
    const response = await gateway.inject({
      method: onboardingProfileInspectionGatewayContract.method,
      url: onboardingProfileInspectionGatewayContract.path,
      payload: {
        request_id: "req_bp0024_bad_kind",
        profile_kind: "agent; npm test",
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      ok: false,
      contract_id: onboardingProfileInspectionGatewayContract.contract_id,
      request_id: "req_bp0024_bad_kind",
      inspected_at: "2026-05-03T00:00:00.000Z",
      errors: [
        {
          code: "onboarding_profile.invalid_profile_kind",
          path: "/profile_kind",
          message: "profile_kind must be project or agent when provided.",
          severity: "error",
        },
      ],
      side_effects: [],
    });
    expect(response.body).not.toContain("agent; npm test");
  });
});
