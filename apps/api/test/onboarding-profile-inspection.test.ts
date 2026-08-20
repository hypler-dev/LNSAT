import { describe, expect, it } from "vitest";
import {
  inspectOnboardingProfileGatewayRequest,
  onboardingProfileInspectionGatewayContract,
} from "../src/index.js";

const now = new Date("2026-05-03T00:00:00.000Z");

describe("@lnsat/api BP-0023 onboarding profile inspection gateway contract", () => {
  it("inspects repo-local project and agent profile fixtures without side effects", async () => {
    const response = await inspectOnboardingProfileGatewayRequest(
      { request_id: "req_bp0023_all" },
      { now },
    );

    expect(response).toMatchObject({
      ok: true,
      contract_id: onboardingProfileInspectionGatewayContract.contract_id,
      request_id: "req_bp0023_all",
      inspected_at: "2026-05-03T00:00:00.000Z",
      summary: {
        total: 9,
        valid: 2,
        rejected: 7,
        side_effects: [],
      },
      side_effects: [],
    });

    expect(response.ok && response.source_docs).toEqual(
      expect.arrayContaining([
        "docs/onboarding/PROJECT_ONBOARDING.md",
        "docs/onboarding/AGENT_ONBOARDING.md",
        "packages/packets/fixtures/project-profiles/valid/lnsat-project-profile.json",
        "packages/packets/fixtures/agent-profiles/valid/codex-observer-profile.json",
        "packages/packets/fixtures/project-profiles/valid/lnsat-project-profile.json",
        "packages/packets/fixtures/agent-profiles/valid/codex-observer-profile.json",
      ]),
    );

    if (!response.ok) {
      throw new Error("expected successful onboarding profile inspection");
    }

    expect(response.profiles).toHaveLength(9);
    expect(response.profiles.map((profile) => profile.path)).toEqual(
      expect.arrayContaining([
        "packages/packets/fixtures/project-profiles/valid/lnsat-project-profile.json",
        "packages/packets/fixtures/agent-profiles/valid/codex-observer-profile.json",
      ]),
    );
  });

  it("returns trusted source refs only for valid profiles", async () => {
    const response = await inspectOnboardingProfileGatewayRequest(
      { request_id: "req_bp0023_valid_refs" },
      { now },
    );

    if (!response.ok) {
      throw new Error("expected successful onboarding profile inspection");
    }

    const validProfiles = response.profiles.filter((profile) => profile.validation.ok);
    const invalidProfiles = response.profiles.filter(
      (profile) => !profile.validation.ok,
    );

    expect(validProfiles).toHaveLength(2);
    expect(validProfiles).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "project",
          trusted_source_refs: expect.arrayContaining([
            "doc:docs/onboarding/PROJECT_ONBOARDING.md",
          ]),
          profile_ref: expect.objectContaining({
            kind: "project",
            profile_id: "lnsat",
          }),
        }),
        expect.objectContaining({
          kind: "agent",
          trusted_source_refs: expect.arrayContaining([
            "doc:docs/onboarding/AGENT_ONBOARDING.md",
          ]),
          profile_ref: expect.objectContaining({
            kind: "agent",
            profile_id: "agent.codex",
          }),
        }),
      ]),
    );

    expect(
      invalidProfiles.every((profile) => profile.trusted_source_refs.length === 0),
    ).toBe(true);
    expect(invalidProfiles.every((profile) => profile.profile_ref === null)).toBe(true);
  });

  it("withholds raw invalid profile content and secret-like values", async () => {
    const response = await inspectOnboardingProfileGatewayRequest(
      { request_id: "req_bp0023_invalid_profiles" },
      { now },
    );

    if (!response.ok) {
      throw new Error("expected successful onboarding profile inspection");
    }

    const invalidProfiles = response.profiles.filter(
      (profile) => !profile.validation.ok,
    );
    expect(invalidProfiles).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "packages/packets/fixtures/project-profiles/invalid/rejects-secret-value.json",
          evidence: expect.objectContaining({
            raw_profile_content: "withheld",
          }),
        }),
        expect.objectContaining({
          path: "packages/packets/fixtures/agent-profiles/invalid/rejects-secret-value.json",
          evidence: expect.objectContaining({
            raw_profile_content: "withheld",
          }),
        }),
      ]),
    );

    const serialized = JSON.stringify(response);
    expect(serialized).not.toContain("redacted-inline-secret-placeholder");
    expect(serialized).not.toContain("redacted-inline-agent-secret");
  });

  it("can inspect only one profile kind", async () => {
    const response = await inspectOnboardingProfileGatewayRequest(
      { request_id: "req_bp0023_agents", profile_kind: "agent" },
      { now },
    );

    expect(response).toMatchObject({
      ok: true,
      request_id: "req_bp0023_agents",
      summary: {
        total: 5,
        valid: 1,
        rejected: 4,
      },
      side_effects: [],
    });

    if (!response.ok) {
      throw new Error("expected successful onboarding profile inspection");
    }

    expect(response.profiles.every((profile) => profile.kind === "agent")).toBe(true);
  });

  it("fails closed for malformed gateway requests without raw command echo", async () => {
    const response = await inspectOnboardingProfileGatewayRequest(
      {
        request_id: "req_bp0023_bad_shape",
        command: "npm test -- --runInBand",
      },
      { now },
    );

    expect(response).toEqual({
      ok: false,
      contract_id: onboardingProfileInspectionGatewayContract.contract_id,
      request_id: "req_bp0023_bad_shape",
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
    expect(JSON.stringify(response)).not.toContain("npm test -- --runInBand");
  });

  it("fails closed for unsupported profile kinds without raw rejected value echo", async () => {
    const response = await inspectOnboardingProfileGatewayRequest(
      {
        request_id: "req_bp0023_bad_kind",
        profile_kind: "agent; npm test",
      },
      { now },
    );

    expect(response).toMatchObject({
      ok: false,
      contract_id: onboardingProfileInspectionGatewayContract.contract_id,
      request_id: "req_bp0023_bad_kind",
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
    expect(JSON.stringify(response)).not.toContain("agent; npm test");
  });
});
