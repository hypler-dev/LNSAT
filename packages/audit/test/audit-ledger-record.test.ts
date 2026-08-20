import { describe, expect, it } from "vitest";
import {
  createAuditLedgerRecordFromOnboardingContextPreview,
  createOnboardingContextInspectionAuditPreview,
  validateAuditLedgerRecord,
  type AuditLedgerRecord,
  type AuditLedgerRecordValidationResult,
} from "../src/index.js";

describe("@lnsat/audit ledger record contract", () => {
  it("accepts sanitized ledger records derived from successful preview events", () => {
    const [preview] = createOnboardingContextInspectionAuditPreview({
      ok: true,
      contract_id: "lnsat.gateway.onboarding_context_packet_inspection.v0_1",
      request_id: "req_bp0036_valid",
      inspected_at: "2026-05-04T00:00:00.000Z",
      source_docs: ["docs/reference/CONTRACT_PROVENANCE.md"],
      trusted_source_refs: [
        "fixture:packages/packets/fixtures/project-profiles/valid/lnsat-project-profile.json",
        "fixture:packages/packets/fixtures/agent-profiles/valid/codex-observer-profile.json",
      ],
      profile_refs: {
        project_profile_ref:
          "packages/packets/fixtures/project-profiles/valid/lnsat-project-profile.json",
        agent_profile_ref:
          "packages/packets/fixtures/agent-profiles/valid/codex-observer-profile.json",
      },
      packet_ref: {
        packet_id: "pkt_onboarding_context_lnsat_agent_codex",
        packet_type: "ContextPacket",
        packet_hash:
          "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      },
      side_effects: [],
    });

    const record = createAuditLedgerRecordFromOnboardingContextPreview({
      ledger_record_id: "alr_bp0036_success_0001",
      preview,
      actor_ref: "agent.codex",
      session_ref: "sess_bp0036_0001",
      resource_refs: ["repo:lnsat"],
    });

    expect(validateAuditLedgerRecord(record)).toEqual({
      ok: true,
      record,
      errors: [],
    });
    expect(record).toMatchObject({
      event_type: "context_packet_compiled",
      result_status: "success",
      idempotency_key: `audit:${preview.event_type}:${preview.event_id}`,
      retention_class: "preview",
      redaction: {
        raw_rejected_command: "not_present",
        raw_rejected_value: "not_present",
        raw_invalid_payload_content: "not_present",
        secret_like_values: "not_present",
      },
      side_effects: [],
    });
  });

  it("accepts sanitized fail-closed preview records with redaction summary", () => {
    const [preview] = createOnboardingContextInspectionAuditPreview({
      ok: false,
      contract_id: "lnsat.gateway.onboarding_context_packet_inspection.v0_1",
      request_id: "req_bp0036_compiler_failure",
      inspected_at: "2026-05-04T00:00:00.000Z",
      source_docs: ["docs/reference/CONTRACT_PROVENANCE.md"],
      trusted_source_refs: [],
      packet_ref: null,
      request_errors: [],
      compiler_errors: [{ code: "onboarding_context.invalid_created_at" }],
      profile_errors: [{ code: "agent_profile.secret_value_embedded" }],
      side_effects: [],
    });

    const record = createAuditLedgerRecordFromOnboardingContextPreview({
      ledger_record_id: "alr_bp0036_failure_0001",
      preview,
    });

    expect(validateAuditLedgerRecord(record)).toEqual({
      ok: true,
      record,
      errors: [],
    });
    expect(record).toMatchObject({
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
    });
    expect(JSON.stringify(record)).not.toContain("redacted-inline-agent-secret");
  });

  it("rejects raw command, raw value, raw invalid payload, and secret-like persistence attempts", () => {
    const badRecord = {
      ...validRecord(),
      source_refs: ["contract:lnsat.gateway.onboarding_context_packet_inspection.v0_1"],
      raw_rejected_command: "rm -rf /",
      raw_rejected_value: "unsupported_profile_kind:root",
      raw_invalid_payload_content:
        '{"constraints":{"secret_value":"do-not-store-secret-values"}}',
      resource_refs: ["secret:lnsat/demo/api-token"],
    };

    const result = validateAuditLedgerRecord(badRecord);

    expect(result.ok).toBe(false);
    expect(errorCodes(result)).toEqual(
      expect.arrayContaining([
        "audit_ledger.raw_content_embedded",
        "audit_ledger.secret_like_value_embedded",
        "audit_ledger.unexpected_field",
      ]),
    );
    expect(JSON.stringify(result.errors)).not.toContain("rm -rf /");
    expect(JSON.stringify(result.errors)).not.toContain("unsupported_profile_kind");
    expect(JSON.stringify(result.errors)).not.toContain("do-not-store-secret-values");
    expect(JSON.stringify(result.errors)).not.toContain("secret:lnsat/demo/api-token");
  });

  it("validates idempotency key, source refs, retention class, redaction summary, and side effects", () => {
    const badRecord = {
      ...validRecord(),
      idempotency_key: "rm -rf /",
      source_refs: [],
      retention_class: "forever",
      redaction: {
        raw_rejected_command: "withheld",
      },
      side_effects: [
        {
          effect_type: "file_write",
          resource_ref: "repo:lnsat",
          status: "done",
        },
      ],
    };

    const result = validateAuditLedgerRecord(badRecord);

    expect(result.ok).toBe(false);
    expect(errorCodes(result)).toEqual(
      expect.arrayContaining([
        "audit_ledger.invalid_field",
        "audit_ledger.missing_required_field",
        "audit_ledger.raw_content_embedded",
      ]),
    );
  });
});

function validRecord(): AuditLedgerRecord {
  return {
    ledger_record_id: "alr_bp0036_valid_0001",
    event_id:
      "evt_pkt_onboarding_context_lnsat_agent_codex_context_packet_compiled_2026_05_04t00_00_00_000z",
    event_type: "context_packet_compiled",
    result_status: "success",
    actor_ref: "agent.codex",
    session_ref: "sess_bp0036_0001",
    packet_ref: {
      packet_id: "pkt_onboarding_context_lnsat_agent_codex",
      packet_type: "ContextPacket",
      packet_hash:
        "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    },
    policy_ref: null,
    approval_ref: null,
    adapter_ref: {
      adapter_type: "gateway",
      adapter_id: "lnsat.gateway.onboarding_context_packet_inspection.v0_1",
      contract_id: "lnsat.gateway.onboarding_context_packet_inspection.v0_1",
    },
    resource_refs: ["repo:lnsat"],
    capability: "context.compile",
    risk_level: 1,
    source_refs: [
      "contract:lnsat.gateway.onboarding_context_packet_inspection.v0_1",
      "fixture:packages/packets/fixtures/project-profiles/valid/lnsat-project-profile.json",
    ],
    reason_codes: [],
    redaction: {
      raw_rejected_command: "not_present",
      raw_rejected_value: "not_present",
      raw_invalid_payload_content: "not_present",
      secret_like_values: "not_present",
    },
    idempotency_key:
      "audit:context_packet_compiled:evt_pkt_onboarding_context_lnsat_agent_codex_context_packet_compiled_2026_05_04t00_00_00_000z",
    created_at: "2026-05-04T00:00:00.000Z",
    observed_at: "2026-05-04T00:00:00.000Z",
    retention_class: "preview",
    side_effects: [],
  };
}

function errorCodes(result: AuditLedgerRecordValidationResult): string[] {
  return result.ok ? [] : result.errors.map((error) => error.code);
}
