import { describe, expect, it } from "vitest";
import {
  AUDIT_LEDGER_RECORD_DIGEST_BINDING_MISMATCH_REASON,
  AUDIT_LEDGER_RECORD_DIGEST_INVALID_RECORD_REASON,
  AUDIT_LEDGER_WRITER_CAPABILITY,
  POSTGRESQL_AUDIT_LEDGER_RECORD_DIGEST_ATTESTATION_CONTRACT_ID,
  canonicalizeAuditLedgerRecord,
  createPostgreSqlAuditLedgerRecordDigestVerifier,
  hashAuditLedgerRecord,
  type AuditLedgerRecord,
} from "../src/index.js";

describe("@lnsat/audit canonical audit ledger record digest", () => {
  it("is deterministic across object insertion order", async () => {
    const record = validRecord();
    const reordered = Object.fromEntries(
      Object.entries(record).reverse(),
    ) as AuditLedgerRecord;
    reordered.redaction = Object.fromEntries(
      Object.entries(record.redaction).reverse(),
    ) as AuditLedgerRecord["redaction"];

    expect(canonicalizeAuditLedgerRecord(reordered)).toBe(
      canonicalizeAuditLedgerRecord(record),
    );
    await expect(hashAuditLedgerRecord(reordered)).resolves.toBe(
      await hashAuditLedgerRecord(record),
    );
  });

  it("changes digest when nested content or array order changes", async () => {
    const record = validRecord();
    const base = await hashAuditLedgerRecord(record);
    const nested = {
      ...record,
      redaction: { ...record.redaction, raw_invalid_payload_content: "withheld" },
    } satisfies AuditLedgerRecord;
    const reordered = {
      ...record,
      source_refs: [...record.source_refs].reverse(),
    };

    await expect(hashAuditLedgerRecord(nested)).resolves.not.toBe(base);
    await expect(hashAuditLedgerRecord(reordered)).resolves.not.toBe(base);
    expect(base).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  it("fails closed for invalid, non-finite, unsupported, and prototype values", async () => {
    const invalid = { ...validRecord(), event_id: "bad", private: "raw-marker" };
    const nonFinite = { ...validRecord(), risk_level: Number.NaN };
    const unsupported = { ...validRecord(), actor_ref: undefined };
    const prototypeRecord = Object.assign(
      Object.create({ inherited: true }),
      validRecord(),
    );

    expect(() => canonicalizeAuditLedgerRecord(invalid as AuditLedgerRecord)).toThrow(
      "Audit ledger record digest requires a valid record.",
    );
    expect(() => canonicalizeAuditLedgerRecord(nonFinite)).toThrow(
      "Audit ledger record contains a non-finite number.",
    );
    expect(() =>
      canonicalizeAuditLedgerRecord(unsupported as AuditLedgerRecord),
    ).toThrow("Audit ledger record contains an unsupported value.");
    expect(() => canonicalizeAuditLedgerRecord(prototypeRecord)).toThrow(
      "Audit ledger record contains an unsupported value.",
    );

    const verifier = createPostgreSqlAuditLedgerRecordDigestVerifier();
    const result = await verifier(invalid as AuditLedgerRecord, {
      ...binding(validRecord(), "0".repeat(64)),
      ledger_record_id: invalid.ledger_record_id,
      event_id: invalid.event_id,
      idempotency_key: invalid.idempotency_key,
    });
    expect(result).toEqual({
      verified: false,
      reason_code: AUDIT_LEDGER_RECORD_DIGEST_INVALID_RECORD_REASON,
    });
    expect(JSON.stringify(result)).not.toContain("raw-marker");

    await expect(
      verifier(prototypeRecord, binding(validRecord(), "0".repeat(64))),
    ).resolves.toEqual({
      verified: false,
      reason_code: AUDIT_LEDGER_RECORD_DIGEST_INVALID_RECORD_REASON,
    });
  });

  it("contains hostile record and binding inspection failures", async () => {
    const marker = "raw-secret-marker";
    const hostileRecord = new Proxy(validRecord(), {
      ownKeys() {
        throw new Error(marker);
      },
    });
    const hostileBinding = new Proxy(binding(validRecord(), "0".repeat(64)), {
      ownKeys() {
        throw new Error(marker);
      },
    });
    const verifier = createPostgreSqlAuditLedgerRecordDigestVerifier();

    const recordResult = await verifier(
      hostileRecord,
      binding(validRecord(), "0".repeat(64)),
    );
    expect(recordResult).toEqual({
      verified: false,
      reason_code: AUDIT_LEDGER_RECORD_DIGEST_INVALID_RECORD_REASON,
    });
    expect(JSON.stringify(recordResult)).not.toContain(marker);

    const bindingResult = await verifier(validRecord(), hostileBinding);
    expect(bindingResult).toEqual({
      verified: false,
      reason_code: AUDIT_LEDGER_RECORD_DIGEST_BINDING_MISMATCH_REASON,
    });
    expect(JSON.stringify(bindingResult)).not.toContain(marker);
  });

  it("snapshots stateful binding fields exactly once before verification", async () => {
    const record = validRecord();
    const digest = await hashAuditLedgerRecord(record);
    let digestReads = 0;
    const statefulBinding = {
      ledger_record_id: record.ledger_record_id,
      event_id: record.event_id,
      idempotency_key: record.idempotency_key,
      get canonical_record_digest() {
        digestReads += 1;
        return digestReads === 1 ? digest : `sha256:${"0".repeat(64)}`;
      },
    };
    const verifier = createPostgreSqlAuditLedgerRecordDigestVerifier();

    await expect(verifier(record, statefulBinding)).resolves.toEqual({
      verified: true,
      attestation: {
        contract_id: POSTGRESQL_AUDIT_LEDGER_RECORD_DIGEST_ATTESTATION_CONTRACT_ID,
        verification_status: "verified",
        binding_status: "matched",
        ledger_record_id: record.ledger_record_id,
        event_id: record.event_id,
        idempotency_key: record.idempotency_key,
        canonical_record_digest: digest,
      },
    });
    expect(digestReads).toBe(1);
  });

  it("snapshots stateful record fields once for validation, binding, and digest", async () => {
    const stableRecord = validRecord();
    const digest = await hashAuditLedgerRecord(stableRecord);
    let eventIdReads = 0;
    const statefulRecord = { ...stableRecord };
    Object.defineProperty(statefulRecord, "event_id", {
      enumerable: true,
      get() {
        eventIdReads += 1;
        return eventIdReads === 1 ? stableRecord.event_id : "evt_bp0848_changed_0001";
      },
    });
    const expected = binding(stableRecord, digest.slice(7));
    const verifier = createPostgreSqlAuditLedgerRecordDigestVerifier();

    await expect(verifier(statefulRecord, expected)).resolves.toEqual({
      verified: true,
      attestation: {
        contract_id: POSTGRESQL_AUDIT_LEDGER_RECORD_DIGEST_ATTESTATION_CONTRACT_ID,
        verification_status: "verified",
        binding_status: "matched",
        ...expected,
      },
    });
    expect(eventIdReads).toBe(1);
  });

  it("returns exact BP-0845 attestation only for matched digest and refs", async () => {
    const record = validRecord();
    const digest = await hashAuditLedgerRecord(record);
    const verifier = createPostgreSqlAuditLedgerRecordDigestVerifier();
    const expected = binding(record, digest.slice(7));

    await expect(verifier(record, expected)).resolves.toEqual({
      verified: true,
      attestation: {
        contract_id: POSTGRESQL_AUDIT_LEDGER_RECORD_DIGEST_ATTESTATION_CONTRACT_ID,
        verification_status: "verified",
        binding_status: "matched",
        ...expected,
      },
    });

    await expect(
      verifier(record, {
        ...expected,
        canonical_record_digest: `sha256:${"0".repeat(64)}`,
      }),
    ).resolves.toEqual({
      verified: false,
      reason_code: AUDIT_LEDGER_RECORD_DIGEST_BINDING_MISMATCH_REASON,
    });
    await expect(
      verifier(record, { ...expected, event_id: "evt_different_00000001" }),
    ).resolves.toEqual({
      verified: false,
      reason_code: AUDIT_LEDGER_RECORD_DIGEST_BINDING_MISMATCH_REASON,
    });
  });
});

function binding(record: AuditLedgerRecord, digestHex: string) {
  return {
    ledger_record_id: record.ledger_record_id,
    event_id: record.event_id,
    idempotency_key: record.idempotency_key,
    canonical_record_digest: `sha256:${digestHex}`,
  };
}

function validRecord(): AuditLedgerRecord {
  return {
    ledger_record_id: "alr_bp0848_digest_0001",
    event_id: "evt_bp0848_digest_0001",
    event_type: "policy_checked",
    result_status: "allow",
    actor_ref: "agent.codex",
    session_ref: "session:bp0848",
    packet_ref: null,
    policy_ref: {
      decision_id: "pol_bp0848_digest_0001",
      decision: "approval_required",
      requires_approval: true,
    },
    approval_ref: {
      approval_id: "apr_bp0848_digest_0001",
      decision: "requested",
    },
    adapter_ref: null,
    resource_refs: ["repo:lnsat"],
    capability: AUDIT_LEDGER_WRITER_CAPABILITY,
    risk_level: 4,
    source_refs: ["packet:BP-0848", "contract:BP-0845"],
    reason_codes: ["policy.audit_ledger_state_change_requires_approval"],
    redaction: {
      raw_rejected_command: "not_present",
      raw_rejected_value: "not_present",
      raw_invalid_payload_content: "not_present",
      secret_like_values: "not_present",
    },
    idempotency_key: "audit:policy_checked:evt_bp0848_digest_0001",
    created_at: "2026-07-11T00:00:00.000Z",
    observed_at: "2026-07-11T00:00:00.000Z",
    retention_class: "control_plane",
    side_effects: [],
  };
}
