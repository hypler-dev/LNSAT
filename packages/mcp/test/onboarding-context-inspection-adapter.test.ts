import { describe, expect, it } from "vitest";
import {
  inspectOnboardingContextThroughMcpAdapterContract,
  mcpOnboardingContextInspectionToolContract,
  mcpOnboardingContextInspectionToolRegistration,
} from "../src/index.js";

const now = new Date("2026-05-04T00:00:00.000Z");

describe("@lnsat/mcp BP-0031 onboarding ContextPacket inspection adapter contract", () => {
  it("exposes read-only onboarding ContextPacket inspection metadata without side effects", () => {
    expect(mcpOnboardingContextInspectionToolContract).toEqual({
      tool: "lnsat.onboarding.context.inspect",
      status: "contract_only",
      gateway_contract_id: "lnsat.gateway.onboarding_context_packet_inspection.v0_1",
      gateway_method: "POST",
      gateway_path: "/v1/onboarding/context/inspect",
      authority: ["lnsat.gateway.onboarding_context_packet_inspection.v0_1"],
      source_docs: [
        "docs/architecture/PACKET_MODEL.md",
        "docs/architecture/POLICY_AND_AUDIT.md",
        "docs/onboarding/PROJECT_ONBOARDING.md",
        "docs/onboarding/AGENT_ONBOARDING.md",
        "packages/packets/fixtures/project-profiles/valid/lnsat-project-profile.json",
        "packages/packets/fixtures/agent-profiles/valid/codex-observer-profile.json",
        "docs/reference/CONTRACT_PROVENANCE.md",
        "docs/reference/CONTRACT_PROVENANCE.md",
      ],
      side_effects: [],
    });
    expect(mcpOnboardingContextInspectionToolRegistration).toMatchObject({
      name: "lnsat.onboarding.context.inspect",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      side_effects: [],
    });
  });

  it("delegates valid onboarding ContextPacket inspection to the Gateway contract", async () => {
    const response = await inspectOnboardingContextThroughMcpAdapterContract(
      {
        request_id: "req_bp0031_valid_context",
        session_id: "sess_onboarding_context_0001",
        created_at: "2026-05-04T00:00:00.000Z",
      },
      { now },
    );

    expect(response).toMatchObject({
      ok: true,
      tool: mcpOnboardingContextInspectionToolContract.tool,
      gateway_contract_id: "lnsat.gateway.onboarding_context_packet_inspection.v0_1",
      gateway_response: {
        ok: true,
        request_id: "req_bp0031_valid_context",
        inspected_at: "2026-05-04T00:00:00.000Z",
        profile_refs: {
          project_profile_ref:
            "packages/packets/fixtures/project-profiles/valid/lnsat-project-profile.json",
          agent_profile_ref:
            "packages/packets/fixtures/agent-profiles/valid/codex-observer-profile.json",
        },
        packet_ref: {
          packet_id: "pkt_onboarding_context_lnsat_agent_codex",
          packet_type: "ContextPacket",
          packet_hash: expect.stringMatching(/^sha256:[a-f0-9]{64}$/),
        },
        validation: {
          ok: true,
          errors: [],
        },
        policy_envelope: {
          allow: ["context.compile", "context.read", "repo.read"],
          block: expect.arrayContaining([
            "secret.read.never",
            "raw_shell",
            "deploy.prod",
          ]),
        },
        budget: {
          tokens: 120000,
          runtime_seconds: 7200,
          cost_usd: 10,
          cpu: 0,
          memory_mb: 0,
        },
        ttl_seconds: 7200,
        side_effects: [],
      },
      side_effects: [],
    });
  });

  it("fails closed for malformed adapter input without raw rejected command echo", async () => {
    const response = await inspectOnboardingContextThroughMcpAdapterContract(
      {
        request_id: "req_bp0031_bad_shape",
        command: "rm -rf /",
      },
      { now },
    );

    expect(response).toMatchObject({
      ok: false,
      tool: mcpOnboardingContextInspectionToolContract.tool,
      gateway_response: {
        ok: false,
        request_id: "req_bp0031_bad_shape",
        inspected_at: "2026-05-04T00:00:00.000Z",
        request_errors: [
          expect.objectContaining({
            code: "onboarding_context_inspection.unexpected_field",
            path: "/command",
          }),
        ],
        compiler_errors: [],
        profile_errors: [],
        raw_input_content: "withheld",
        side_effects: [],
      },
      side_effects: [],
    });
    expect(JSON.stringify(response)).not.toContain("rm -rf /");
  });

  it("fails closed for compiler failures without raw value or secret-like echo", async () => {
    const response = await inspectOnboardingContextThroughMcpAdapterContract(
      {
        request_id: "req_bp0031_bad_created_at",
        created_at: "secret:lnsat/demo/api-token",
      },
      { now },
    );

    expect(response).toMatchObject({
      ok: false,
      gateway_response: {
        ok: false,
        request_id: "req_bp0031_bad_created_at",
        request_errors: [],
        compiler_errors: [
          expect.objectContaining({
            code: "onboarding_context.invalid_created_at",
            path: "/created_at",
          }),
        ],
        trusted_source_refs: [],
        packet_ref: null,
        validation: null,
        raw_input_content: "withheld",
        side_effects: [],
      },
      side_effects: [],
    });
    expect(JSON.stringify(response)).not.toContain("secret:lnsat/demo/api-token");
    expect(JSON.stringify(response)).not.toContain("redacted-inline-agent-secret");
  });
});
