import { describe, expect, it } from "vitest";
import {
  AUDIT_LEDGER_APPEND_SEMANTICS_CONFORMANCE_CONTRACT_ID,
  AUDIT_LEDGER_WRITER_APPROVAL_REQUEST_CONTRACT_ID,
  AUDIT_LEDGER_WRITER_INTERFACE_CONTRACT_ID,
  AUDIT_LEDGER_WRITER_POLICY_GATE_CONTRACT_ID,
  evaluateAuditLedgerAppendSemantics,
  type AuditLedgerAppendSemanticsConformanceEntry,
  type AuditLedgerWriterInterfaceContract,
} from "../src/index.js";

describe("@lnsat/audit ledger append semantics conformance", () => {
  it("deterministically proposes a new immutable-state entry without execution authority", () => {
    const input = {
      prior_state: [existingEntry()],
      writer_interface_contract: validWriterContract(),
    };
    const before = structuredClone(input);

    const first = evaluateAuditLedgerAppendSemantics(input);
    const second = evaluateAuditLedgerAppendSemantics(input);

    expect(first).toEqual(second);
    expect(first).toEqual({
      ok: true,
      conformance: {
        contract_id: AUDIT_LEDGER_APPEND_SEMANTICS_CONFORMANCE_CONTRACT_ID,
        outcome: "append_proposed",
        record_ref: candidateEntry(),
        previous_state_count: 1,
        next_state_count: 2,
        proposed_state: [existingEntry(), candidateEntry()],
        approval_status: "requested",
        execution_authority: "none_conformance_only",
        write_performed: false,
        live_execution_allowed: false,
        side_effects: [],
      },
      errors: [],
      side_effects: [],
    });
    expect(input).toEqual(before);
  });

  it("returns exact existing ref and unchanged proposed state for exact replay", () => {
    const existing = candidateEntry({
      ledger_record_id: "alr_bp0843_existing_0001",
      event_id: "evt_bp0843_existing_0001",
    });

    const result = evaluateAuditLedgerAppendSemantics({
      prior_state: [existing],
      writer_interface_contract: validWriterContract(),
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected exact replay conformance");
    expect(result.conformance).toMatchObject({
      outcome: "exact_replay",
      record_ref: existing,
      previous_state_count: 1,
      next_state_count: 1,
      proposed_state: [existing],
      write_performed: false,
      live_execution_allowed: false,
      side_effects: [],
    });
  });

  it("fails closed on same idempotency key with different digest", () => {
    const input = {
      prior_state: [
        candidateEntry({
          canonical_record_digest: digest("b"),
          ledger_record_id: "alr_bp0843_collision_0001",
          event_id: "evt_bp0843_collision_0001",
        }),
      ],
      writer_interface_contract: validWriterContract(),
    };
    const before = structuredClone(input);

    const result = evaluateAuditLedgerAppendSemantics(input);

    expect(result).toMatchObject({
      ok: false,
      conformance: null,
      errors: [{ code: "audit_ledger_append_semantics.idempotency_collision" }],
      state_unchanged: true,
      write_performed: false,
      raw_input_content: "withheld",
      live_execution_allowed: false,
      side_effects: [],
    });
    expect(input).toEqual(before);
  });

  it("rejects malformed and duplicate prior state", () => {
    const malformed = evaluateAuditLedgerAppendSemantics({
      prior_state: [{ ...existingEntry(), raw_body: "must-not-survive" }],
      writer_interface_contract: validWriterContract(),
    });
    expect(errorCodes(malformed)).toEqual([
      "audit_ledger_append_semantics.invalid_prior_state",
    ]);
    expect(JSON.stringify(malformed)).not.toContain("must-not-survive");

    const duplicate = evaluateAuditLedgerAppendSemantics({
      prior_state: [existingEntry(), existingEntry()],
      writer_interface_contract: validWriterContract(),
    });
    expect(errorCodes(duplicate)).toEqual([
      "audit_ledger_append_semantics.duplicate_idempotency_key",
    ]);
  });

  it("rejects non-append or approval-granted writer contracts", () => {
    const nonAppend = validWriterContract();
    nonAppend.operation = "ledger.record.correct";
    expect(
      errorCodes(
        evaluateAuditLedgerAppendSemantics({
          prior_state: [],
          writer_interface_contract: nonAppend,
        }),
      ),
    ).toEqual(["audit_ledger_append_semantics.invalid_writer_contract"]);

    const approvalGranted = structuredClone(validWriterContract()) as unknown as {
      approval_ref: { approval_status: string };
    };
    approvalGranted.approval_ref.approval_status = "granted";
    expect(
      errorCodes(
        evaluateAuditLedgerAppendSemantics({
          prior_state: [],
          writer_interface_contract: approvalGranted,
        }),
      ),
    ).toEqual(["audit_ledger_append_semantics.invalid_writer_contract"]);
  });

  it("rejects embedded raw record content and withholds it from errors", () => {
    const writer = {
      ...validWriterContract(),
      raw_record: { raw_body: "private-payload-marker" },
    };

    const result = evaluateAuditLedgerAppendSemantics({
      prior_state: [],
      writer_interface_contract: writer,
    });

    expect(errorCodes(result)).toEqual([
      "audit_ledger_append_semantics.invalid_writer_contract",
    ]);
    expect(JSON.stringify(result)).not.toContain("private-payload-marker");
  });
});

function validWriterContract(): AuditLedgerWriterInterfaceContract {
  const recordRef = candidateEntry();
  return {
    contract_id: AUDIT_LEDGER_WRITER_INTERFACE_CONTRACT_ID,
    request_id: "req_bp0843_append_0001",
    operation: "ledger.record.append",
    record_ref: recordRef,
    policy_gate_ref: {
      contract_id: AUDIT_LEDGER_WRITER_POLICY_GATE_CONTRACT_ID,
      decision_id: "pol_bp0843_append_0001",
      decision: "approval_required",
      requires_approval: true,
      reason_codes: ["policy.audit_ledger_state_change_requires_approval"],
    },
    approval_ref: {
      contract_id: AUDIT_LEDGER_WRITER_APPROVAL_REQUEST_CONTRACT_ID,
      approval_request_id: "apr_bp0843_append_0001",
      approval_status: "requested",
      approval_kind: "ledger_state_change",
      policy_gate_decision_id: "pol_bp0843_append_0001",
    },
    append_only: {
      mode: "insert_only",
      correction_model: "append_new_record_referencing_prior_record",
      forbidden_mutations: ["update", "delete", "truncate", "in_place_redaction"],
    },
    idempotency: {
      idempotency_key: recordRef.idempotency_key,
      canonical_record_digest: recordRef.canonical_record_digest,
      duplicate_behavior: "exact_replay_returns_existing_ref",
      collision_behavior: "fail_closed",
    },
    redaction: {
      raw_rejected_command: "not_present",
      raw_rejected_value: "not_present",
      raw_invalid_payload_content: "not_present",
      secret_like_values: "not_present",
    },
    source_refs: ["packet:BP-0843", "contract:BP-0052"],
    live_execution_allowed: false,
    side_effects: [],
  };
}

function existingEntry(): AuditLedgerAppendSemanticsConformanceEntry {
  return {
    idempotency_key: "audit:policy_checked:evt_bp0843_existing_0001",
    canonical_record_digest: digest("c"),
    ledger_record_id: "alr_bp0843_existing_0001",
    event_id: "evt_bp0843_existing_0001",
  };
}

function candidateEntry(
  overrides: Partial<AuditLedgerAppendSemanticsConformanceEntry> = {},
): AuditLedgerAppendSemanticsConformanceEntry {
  return {
    idempotency_key: "audit:policy_checked:evt_bp0843_candidate_0001",
    canonical_record_digest: digest("a"),
    ledger_record_id: "alr_bp0843_candidate_0001",
    event_id: "evt_bp0843_candidate_0001",
    ...overrides,
  };
}

function digest(character: string): string {
  return `sha256:${character.repeat(64)}`;
}

function errorCodes(result: ReturnType<typeof evaluateAuditLedgerAppendSemantics>) {
  return result.ok ? [] : result.errors.map((error) => error.code);
}
