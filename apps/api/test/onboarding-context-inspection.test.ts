import { describe, expect, it } from "vitest";
import {
  inspectOnboardingContextGatewayRequest,
  onboardingContextInspectionGatewayContract,
} from "../src/index.js";

const now = new Date("2026-05-04T00:00:00.000Z");

describe("@lnsat/api BP-0029 onboarding ContextPacket inspection gateway contract", () => {
  it("compiles a read-only ContextPacket proposal from repo-local valid profiles", async () => {
    const response = await inspectOnboardingContextGatewayRequest(
      {
        request_id: "req_bp0029_valid",
        session_id: "sess_onboarding_context_0001",
        created_at: "2026-05-04T00:00:00.000Z",
      },
      { now },
    );

    expect(response).toMatchObject({
      ok: true,
      contract_id: onboardingContextInspectionGatewayContract.contract_id,
      request_id: "req_bp0029_valid",
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
      audit_event_preview: [
        {
          event_type: "context_packet_compiled",
          result_status: "success",
          reason_codes: [],
          side_effects: [],
        },
      ],
      audit_ledger_record_preview: [
        {
          source_event_id: expect.stringMatching(/^evt_/),
          persistence: "not_persisted",
          record: {
            ledger_record_id: "alr_context_packet_compiled_req_bp0029_valid",
            event_type: "context_packet_compiled",
            result_status: "success",
            retention_class: "preview",
            redaction: {
              raw_rejected_command: "not_present",
              raw_rejected_value: "not_present",
              raw_invalid_payload_content: "not_present",
              secret_like_values: "not_present",
            },
            side_effects: [],
          },
          validation: {
            ok: true,
            errors: [],
          },
        },
      ],
      side_effects: [],
    });

    if (!response.ok) {
      throw new Error("expected successful onboarding ContextPacket inspection");
    }

    expect(response.source_docs).toEqual(
      expect.arrayContaining([
        "docs/reference/CONTRACT_PROVENANCE.md",
        "packages/packets/fixtures/project-profiles/valid/lnsat-project-profile.json",
        "packages/packets/fixtures/agent-profiles/valid/codex-observer-profile.json",
      ]),
    );
    expect(response.trusted_source_refs).toEqual(
      expect.arrayContaining([
        "fixture:packages/packets/fixtures/project-profiles/valid/lnsat-project-profile.json",
        "fixture:packages/packets/fixtures/agent-profiles/valid/codex-observer-profile.json",
        "doc:docs/reference/CONTRACT_PROVENANCE.md",
      ]),
    );
  });

  it("returns policy envelope, budget, ttl, and no side effects", async () => {
    const response = await inspectOnboardingContextGatewayRequest(
      { request_id: "req_bp0029_evidence" },
      { now },
    );

    if (!response.ok) {
      throw new Error("expected successful onboarding ContextPacket inspection");
    }

    expect(response.policy_envelope).toEqual({
      allow: ["context.compile", "context.read", "repo.read"],
      block: expect.arrayContaining(["secret.read.never", "raw_shell", "deploy.prod"]),
    });
    expect(response.budget).toEqual({
      tokens: 120000,
      runtime_seconds: 7200,
      cost_usd: 10,
      cpu: 0,
      memory_mb: 0,
    });
    expect(response.ttl_seconds).toBe(7200);
    expect(response.side_effects).toEqual([]);
  });

  it("fails closed for malformed Gateway requests without raw command echo", async () => {
    const response = await inspectOnboardingContextGatewayRequest(
      {
        request_id: "req_bp0029_bad_shape",
        command: "rm -rf /",
      },
      { now },
    );

    expect(response).toEqual({
      ok: false,
      contract_id: onboardingContextInspectionGatewayContract.contract_id,
      request_id: "req_bp0029_bad_shape",
      inspected_at: "2026-05-04T00:00:00.000Z",
      source_docs: expect.any(Array),
      request_errors: [
        {
          code: "onboarding_context_inspection.unexpected_field",
          path: "/command",
          message: "Unexpected onboarding ContextPacket inspection request field.",
          severity: "error",
        },
      ],
      compiler_errors: [],
      profile_errors: [],
      trusted_source_refs: [],
      packet_ref: null,
      validation: null,
      policy_envelope: null,
      budget: null,
      ttl_seconds: null,
      raw_input_content: "withheld",
      audit_event_preview: expect.arrayContaining([
        expect.objectContaining({
          event_type: "context_packet_inspection_rejected",
          result_status: "failure",
          reason_codes: ["onboarding_context_inspection.unexpected_field"],
          side_effects: [],
        }),
      ]),
      audit_ledger_record_preview: [
        {
          source_event_id: expect.stringMatching(/^evt_/),
          persistence: "not_persisted",
          record: expect.objectContaining({
            ledger_record_id:
              "alr_context_packet_inspection_rejected_req_bp0029_bad_shape",
            event_type: "context_packet_inspection_rejected",
            result_status: "failure",
            packet_ref: null,
            redaction: {
              raw_rejected_command: "withheld",
              raw_rejected_value: "withheld",
              raw_invalid_payload_content: "withheld",
              secret_like_values: "withheld",
            },
            side_effects: [],
          }),
          validation: {
            ok: true,
            record: expect.any(Object),
            errors: [],
          },
        },
      ],
      side_effects: [],
    });
    expect(JSON.stringify(response)).not.toContain("rm -rf /");
  });

  it("fails closed for compiler errors without raw rejected values", async () => {
    const response = await inspectOnboardingContextGatewayRequest(
      {
        request_id: "req_bp0029_bad_created_at",
        created_at: "secret:lnsat/demo/api-token",
      },
      { now },
    );

    expect(response).toMatchObject({
      ok: false,
      contract_id: onboardingContextInspectionGatewayContract.contract_id,
      request_id: "req_bp0029_bad_created_at",
      request_errors: [],
      compiler_errors: [
        {
          code: "onboarding_context.invalid_created_at",
          path: "/created_at",
          message: "Compiler created_at must be an ISO UTC timestamp.",
          severity: "error",
        },
      ],
      trusted_source_refs: [],
      packet_ref: null,
      validation: null,
      raw_input_content: "withheld",
      audit_event_preview: [
        {
          event_type: "context_packet_inspection_rejected",
          result_status: "failure",
          reason_codes: ["onboarding_context.invalid_created_at"],
          side_effects: [],
        },
      ],
      audit_ledger_record_preview: [
        {
          source_event_id: expect.stringMatching(/^evt_/),
          persistence: "not_persisted",
          record: expect.objectContaining({
            event_type: "context_packet_inspection_rejected",
            result_status: "failure",
            packet_ref: null,
            reason_codes: ["onboarding_context.invalid_created_at"],
            redaction: {
              raw_rejected_command: "withheld",
              raw_rejected_value: "withheld",
              raw_invalid_payload_content: "withheld",
              secret_like_values: "withheld",
            },
            side_effects: [],
          }),
          validation: {
            ok: true,
            record: expect.any(Object),
            errors: [],
          },
        },
      ],
      side_effects: [],
    });
    expect(JSON.stringify(response)).not.toContain("secret:lnsat/demo/api-token");
    expect(JSON.stringify(response)).not.toContain("redacted-inline-agent-secret");
  });

  it("withholds raw invalid payload content from ledger preview evidence", async () => {
    const response = await inspectOnboardingContextGatewayRequest(
      {
        request_id: "req_bp0037_invalid_payload",
        payload: '<script>alert("x")</script>',
      },
      { now },
    );

    expect(response).toMatchObject({
      ok: false,
      raw_input_content: "withheld",
      audit_ledger_record_preview: [
        {
          persistence: "not_persisted",
          record: expect.objectContaining({
            event_type: "context_packet_inspection_rejected",
            result_status: "failure",
            redaction: {
              raw_rejected_command: "withheld",
              raw_rejected_value: "withheld",
              raw_invalid_payload_content: "withheld",
              secret_like_values: "withheld",
            },
          }),
          validation: {
            ok: true,
            record: expect.any(Object),
            errors: [],
          },
        },
      ],
    });
    expect(JSON.stringify(response)).not.toContain("<script>");
    expect(JSON.stringify(response)).not.toContain("alert");
  });
});
