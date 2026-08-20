import { describe, expect, it } from "vitest";
import {
  inspectOnboardingProfilesThroughMcpAdapterContract,
  mcpOnboardingProfileInspectionToolContract,
  mcpOnboardingProfileInspectionToolRegistration,
} from "../src/index.js";

const now = new Date("2026-05-04T00:00:00.000Z");

describe("@lnsat/mcp BP-0025 onboarding profile inspection adapter contract", () => {
  it("exposes read-only onboarding profile inspection metadata without side effects", () => {
    expect(mcpOnboardingProfileInspectionToolContract).toEqual({
      tool: "lnsat.onboarding.profiles.inspect",
      status: "contract_only",
      gateway_contract_id: "lnsat.gateway.onboarding_profile_inspection.v0_1",
      gateway_method: "POST",
      gateway_path: "/v1/onboarding/profiles/inspect",
      authority: ["lnsat.gateway.onboarding_profile_inspection.v0_1"],
      source_docs: [
        "docs/onboarding/PROJECT_ONBOARDING.md",
        "docs/onboarding/AGENT_ONBOARDING.md",
        "packages/packets/fixtures/project-profiles/valid/lnsat-project-profile.json",
        "packages/packets/fixtures/agent-profiles/valid/codex-observer-profile.json",
        "docs/reference/CONTRACT_PROVENANCE.md",
        "docs/reference/CONTRACT_PROVENANCE.md",
        "docs/reference/CONTRACT_PROVENANCE.md",
      ],
      side_effects: [],
    });
    expect(mcpOnboardingProfileInspectionToolRegistration).toMatchObject({
      name: "lnsat.onboarding.profiles.inspect",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      side_effects: [],
    });
  });

  it("delegates valid onboarding profile inspection to the Gateway contract", async () => {
    const response = await inspectOnboardingProfilesThroughMcpAdapterContract(
      {
        request_id: "req_bp0025_all_profiles",
      },
      { now },
    );

    expect(response).toMatchObject({
      ok: true,
      tool: mcpOnboardingProfileInspectionToolContract.tool,
      gateway_contract_id: "lnsat.gateway.onboarding_profile_inspection.v0_1",
      gateway_response: {
        ok: true,
        request_id: "req_bp0025_all_profiles",
        inspected_at: "2026-05-04T00:00:00.000Z",
        summary: {
          total: 9,
          valid: 2,
          rejected: 7,
          side_effects: [],
        },
        profiles: expect.arrayContaining([
          expect.objectContaining({
            kind: "project",
            validation: { ok: true, errors: [] },
            profile_ref: expect.objectContaining({
              kind: "project",
              profile_id: "lnsat",
            }),
          }),
          expect.objectContaining({
            kind: "agent",
            validation: { ok: true, errors: [] },
            profile_ref: expect.objectContaining({
              kind: "agent",
              profile_id: "agent.codex",
            }),
          }),
        ]),
        side_effects: [],
      },
      side_effects: [],
    });
  });

  it("supports Gateway profile-kind filtering without registering a live MCP tool", async () => {
    const response = await inspectOnboardingProfilesThroughMcpAdapterContract(
      {
        request_id: "req_bp0025_project_profiles",
        profile_kind: "project",
      },
      { now },
    );

    expect(response).toMatchObject({
      ok: true,
      gateway_response: {
        ok: true,
        request_id: "req_bp0025_project_profiles",
        summary: {
          total: 4,
          valid: 1,
          rejected: 3,
          side_effects: [],
        },
        profiles: expect.arrayContaining([
          expect.objectContaining({
            kind: "project",
          }),
        ]),
        side_effects: [],
      },
      side_effects: [],
    });
    expect(
      response.gateway_response.ok &&
        response.gateway_response.profiles.every(
          (profile) => profile.kind === "project",
        ),
    ).toBe(true);
  });

  it("fails closed for malformed adapter input without raw rejected command echo", async () => {
    const response = await inspectOnboardingProfilesThroughMcpAdapterContract(
      {
        request_id: "req_bp0025_bad_shape",
        shell: "npm test -- --runInBand",
      },
      { now },
    );

    expect(response).toMatchObject({
      ok: false,
      tool: mcpOnboardingProfileInspectionToolContract.tool,
      gateway_response: {
        ok: false,
        request_id: "req_bp0025_bad_shape",
        inspected_at: "2026-05-04T00:00:00.000Z",
        errors: [
          expect.objectContaining({
            code: "onboarding_profile.unexpected_field",
            path: "/shell",
          }),
        ],
        side_effects: [],
      },
      side_effects: [],
    });
    expect(JSON.stringify(response)).not.toContain("npm test -- --runInBand");
  });

  it("fails closed for unsupported profile kinds without raw value echo", async () => {
    const response = await inspectOnboardingProfilesThroughMcpAdapterContract(
      {
        request_id: "req_bp0025_bad_kind",
        profile_kind: "agent; shell.exec npm test",
      },
      { now },
    );

    expect(response).toMatchObject({
      ok: false,
      gateway_response: {
        ok: false,
        request_id: "req_bp0025_bad_kind",
        errors: [
          expect.objectContaining({
            code: "onboarding_profile.invalid_profile_kind",
            path: "/profile_kind",
          }),
        ],
        side_effects: [],
      },
      side_effects: [],
    });
    expect(JSON.stringify(response)).not.toContain("agent; shell.exec npm test");
    expect(JSON.stringify(response)).not.toContain("shell.exec");
  });
});
