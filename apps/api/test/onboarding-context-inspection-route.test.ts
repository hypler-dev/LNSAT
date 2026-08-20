import { afterAll, describe, expect, it } from "vitest";
import {
  buildApiGateway,
  onboardingContextInspectionGatewayContract,
} from "../src/index.js";

const now = new Date("2026-05-04T00:00:00.000Z");

describe("@lnsat/api BP-0030 onboarding ContextPacket inspection route", () => {
  const gateway = buildApiGateway({
    now: () => now,
  });

  afterAll(async () => {
    await gateway.close();
  });

  it("inspects onboarding ContextPacket proposals through the read-only Fastify route", async () => {
    const response = await gateway.inject({
      method: onboardingContextInspectionGatewayContract.method,
      url: onboardingContextInspectionGatewayContract.path,
      payload: {
        request_id: "req_bp0030_valid",
        session_id: "sess_onboarding_context_0001",
        created_at: "2026-05-04T00:00:00.000Z",
      },
    });

    const body = response.json();

    expect(response.statusCode).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      contract_id: onboardingContextInspectionGatewayContract.contract_id,
      request_id: "req_bp0030_valid",
      inspected_at: "2026-05-04T00:00:00.000Z",
      trusted_source_refs: expect.arrayContaining([
        "fixture:packages/packets/fixtures/project-profiles/valid/lnsat-project-profile.json",
        "fixture:packages/packets/fixtures/agent-profiles/valid/codex-observer-profile.json",
      ]),
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
        block: expect.arrayContaining(["secret.read.never", "raw_shell"]),
      },
      budget: {
        tokens: 120000,
        runtime_seconds: 7200,
        cost_usd: 10,
        cpu: 0,
        memory_mb: 0,
      },
      ttl_seconds: 7200,
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
          record: expect.objectContaining({
            ledger_record_id: "alr_context_packet_compiled_req_bp0030_valid",
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
  });

  it("rejects malformed Gateway route requests without raw rejected command echo", async () => {
    const response = await gateway.inject({
      method: onboardingContextInspectionGatewayContract.method,
      url: onboardingContextInspectionGatewayContract.path,
      payload: {
        request_id: "req_bp0030_bad_shape",
        command: "rm -rf /",
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      ok: false,
      contract_id: onboardingContextInspectionGatewayContract.contract_id,
      request_id: "req_bp0030_bad_shape",
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
              "alr_context_packet_inspection_rejected_req_bp0030_bad_shape",
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
    expect(response.body).not.toContain("rm -rf /");
  });

  it("returns compiler failures as HTTP 422 without secret-like value echo", async () => {
    const response = await gateway.inject({
      method: onboardingContextInspectionGatewayContract.method,
      url: onboardingContextInspectionGatewayContract.path,
      payload: {
        request_id: "req_bp0030_bad_created_at",
        created_at: "secret:lnsat/demo/api-token",
      },
    });

    expect(response.statusCode).toBe(422);
    expect(response.json()).toMatchObject({
      ok: false,
      contract_id: onboardingContextInspectionGatewayContract.contract_id,
      request_id: "req_bp0030_bad_created_at",
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
      policy_envelope: null,
      budget: null,
      ttl_seconds: null,
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
    expect(response.body).not.toContain("secret:lnsat/demo/api-token");
    expect(response.body).not.toContain("redacted-inline-agent-secret");
  });

  it("withholds raw invalid payload content from route ledger preview evidence", async () => {
    const response = await gateway.inject({
      method: onboardingContextInspectionGatewayContract.method,
      url: onboardingContextInspectionGatewayContract.path,
      payload: {
        request_id: "req_bp0037_invalid_payload",
        payload: '<script>alert("x")</script>',
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
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
    expect(response.body).not.toContain("<script>");
    expect(response.body).not.toContain("alert");
  });
});
