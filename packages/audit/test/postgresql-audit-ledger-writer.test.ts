import { describe, expect, it, vi } from "vitest";
import {
  AUDIT_LEDGER_WRITER_APPROVAL_REQUEST_CONTRACT_ID,
  AUDIT_LEDGER_WRITER_CAPABILITY,
  AUDIT_LEDGER_WRITER_INTERFACE_CONTRACT_ID,
  AUDIT_LEDGER_WRITER_POLICY_GATE_CONTRACT_ID,
  POSTGRESQL_AUDIT_LEDGER_INSERT_SQL,
  POSTGRESQL_AUDIT_LEDGER_REPLAY_SQL,
  POSTGRESQL_AUDIT_LEDGER_RECORD_DIGEST_ATTESTATION_CONTRACT_ID,
  POSTGRESQL_AUDIT_LEDGER_WRITER_GRANT_PROOF_CONTRACT_ID,
  appendPostgreSqlAuditLedgerRecord,
  type AuditLedgerRecord,
  type AuditLedgerWriterInterfaceContract,
  type PostgreSqlAuditLedgerAuthorizationVerifier,
  type PostgreSqlAuditLedgerGrantBinding,
  type PostgreSqlAuditLedgerRecordDigestVerifier,
  type PostgreSqlAuditLedgerTransaction,
  type PostgreSqlAuditLedgerTransactionExecutor,
  type PostgreSqlAuditLedgerVerifiedGrant,
} from "../src/index.js";

describe("@lnsat/audit PostgreSQL audit ledger writer", () => {
  it("uses static parameterized insert SQL and never interpolates record values", async () => {
    const marker = "private-record-marker";
    const input = validInput({
      record: { ...validRecord(), actor_ref: marker },
    });
    const executor = fakeExecutor([{ rows: [storedRef()] }]);

    const result = await appendPostgreSqlAuditLedgerRecord(
      input,
      validDependencies(executor),
    );

    expect(result).toMatchObject({
      ok: true,
      outcome: "appended",
      write_attempted: true,
      write_performed: true,
      execution_authorized: true,
      executor_invoked: true,
      transaction_callback_invoked: true,
      execution_mode: "injected_transaction_executor",
      write_outcome: "performed",
      side_effects: [{ status: "completed" }],
    });
    expect(executor.queries).toHaveLength(1);
    expect(executor.queries[0]?.sql).toBe(POSTGRESQL_AUDIT_LEDGER_INSERT_SQL);
    expect(executor.queries[0]?.sql).not.toContain(marker);
    expect(executor.queries[0]?.values).toContain(marker);
    expect(POSTGRESQL_AUDIT_LEDGER_INSERT_SQL).toContain("$22");
    expect(POSTGRESQL_AUDIT_LEDGER_INSERT_SQL).toContain(
      "ON CONFLICT (idempotency_key) DO NOTHING",
    );
    expect(POSTGRESQL_AUDIT_LEDGER_INSERT_SQL).not.toMatch(
      /\b(?:UPDATE|DELETE|TRUNCATE)\b/i,
    );
    expect(POSTGRESQL_AUDIT_LEDGER_INSERT_SQL).not.toContain("schema_version");
    expect(POSTGRESQL_AUDIT_LEDGER_INSERT_SQL).not.toContain("inserted_at");
  });

  it("maps all 22 parameters and explicitly encodes JSONB values", async () => {
    const record = validRecord();
    const executor = fakeExecutor([{ rows: [storedRef()] }]);

    await appendPostgreSqlAuditLedgerRecord(
      validInput({ record }),
      validDependencies(executor),
    );

    const values = executor.queries[0]?.values;
    expect(values).toEqual([
      record.ledger_record_id,
      record.event_id,
      record.event_type,
      record.result_status,
      record.actor_ref,
      record.session_ref,
      null,
      JSON.stringify(record.policy_ref),
      JSON.stringify(record.approval_ref),
      null,
      JSON.stringify(record.resource_refs),
      record.capability,
      record.risk_level,
      JSON.stringify(record.source_refs),
      JSON.stringify(record.reason_codes),
      JSON.stringify(record.redaction),
      record.idempotency_key,
      digest("a"),
      record.created_at,
      record.observed_at,
      record.retention_class,
      JSON.stringify(record.side_effects),
    ]);
    expect(values).toHaveLength(22);
    expect(values?.[6]).toBeNull();
    expect(values?.[9]).toBeNull();
    expect(JSON.parse(String(values?.[7]))).toEqual(record.policy_ref);
    expect(JSON.parse(String(values?.[8]))).toEqual(record.approval_ref);
    expect(JSON.parse(String(values?.[10]))).toEqual(record.resource_refs);
    expect(JSON.parse(String(values?.[13]))).toEqual(record.source_refs);
    expect(JSON.parse(String(values?.[14]))).toEqual(record.reason_codes);
    expect(JSON.parse(String(values?.[15]))).toEqual(record.redaction);
    expect(JSON.parse(String(values?.[21]))).toEqual(record.side_effects);
  });

  it("returns exact existing ref for same-key/same-digest replay", async () => {
    const executor = fakeExecutor([{ rows: [] }, { rows: [storedRef()] }]);

    const result = await appendPostgreSqlAuditLedgerRecord(
      validInput(),
      validDependencies(executor),
    );

    expect(result).toMatchObject({
      ok: true,
      outcome: "exact_replay",
      record_ref: storedRef(),
      write_attempted: true,
      write_outcome: "not_performed",
      write_performed: false,
    });
    expect(executor.queries[1]).toEqual({
      sql: POSTGRESQL_AUDIT_LEDGER_REPLAY_SQL,
      values: [validRecord().idempotency_key],
    });
    expect(executor.commits).toBe(1);
    expect(executor.rollbacks).toBe(0);
  });

  it("preserves BP-0843 exact replay ref when same key/digest has prior record refs", async () => {
    const existing = {
      ...storedRef(),
      ledger_record_id: "alr_bp0845_prior_0001",
      event_id: "evt_bp0845_prior_0001",
    };
    const executor = fakeExecutor([{ rows: [] }, { rows: [existing] }]);

    const result = await appendPostgreSqlAuditLedgerRecord(
      validInput(),
      validDependencies(executor),
    );

    expect(result).toMatchObject({
      ok: true,
      outcome: "exact_replay",
      record_ref: existing,
      write_performed: false,
    });
  });

  it("fails closed and rolls back same-key/different-digest collision", async () => {
    const executor = fakeExecutor([
      { rows: [] },
      { rows: [{ ...storedRef(), canonical_record_digest: digest("b") }] },
    ]);

    const result = await appendPostgreSqlAuditLedgerRecord(
      validInput(),
      validDependencies(executor),
    );

    expect(errorCode(result)).toBe(
      "postgresql_audit_ledger_writer.idempotency_collision",
    );
    expect(result).toMatchObject({
      write_attempted: true,
      write_outcome: "not_performed",
      write_performed: false,
      raw_error_content: "withheld",
      side_effects: [{ status: "failed" }],
    });
    expect(executor.rollbacks).toBe(1);
  });

  it("withholds other DB constraint errors and rolls back", async () => {
    const executor = fakeExecutor([new Error("duplicate event private-db-marker")]);

    const result = await appendPostgreSqlAuditLedgerRecord(
      validInput(),
      validDependencies(executor),
    );

    expect(errorCode(result)).toBe("postgresql_audit_ledger_writer.executor_failed");
    expect(JSON.stringify(result)).not.toContain("private-db-marker");
    expect(result).toMatchObject({
      write_outcome: "indeterminate",
      write_performed: "unknown",
      side_effects: [{ status: "indeterminate" }],
    });
    expect(executor.rollbacks).toBe(1);
  });

  it.each([
    {
      name: "insert query",
      responses: [new Error("insert-raw-marker")],
    },
    {
      name: "replay read",
      responses: [{ rows: [] }, new Error("replay-raw-marker")],
    },
  ])("rolls back $name failure", async ({ responses }) => {
    const executor = fakeExecutor(responses);
    const result = await appendPostgreSqlAuditLedgerRecord(
      validInput(),
      validDependencies(executor),
    );

    expect(errorCode(result)).toBe("postgresql_audit_ledger_writer.executor_failed");
    expect(result).toMatchObject({
      write_outcome: "indeterminate",
      write_performed: "unknown",
      side_effects: [{ status: "indeterminate" }],
    });
    expect(executor.rollbacks).toBe(1);
    expect(executor.commits).toBe(0);
  });

  it("withholds injected transaction adapter failure", async () => {
    const transaction_executor: PostgreSqlAuditLedgerTransactionExecutor = {
      transaction: async () => {
        throw new Error("adapter-secret-marker");
      },
    };

    const result = await appendPostgreSqlAuditLedgerRecord(
      validInput(),
      validDependencies(transaction_executor),
    );

    expect(errorCode(result)).toBe("postgresql_audit_ledger_writer.executor_failed");
    expect(JSON.stringify(result)).not.toContain("adapter-secret-marker");
    expect(result).toMatchObject({
      write_outcome: "not_performed",
      write_performed: false,
      transaction_callback_invoked: false,
    });
  });

  it("fails missing verifier and structural grant claim before executor use", async () => {
    const executor = fakeExecutor([{ rows: [storedRef()] }]);
    const input = validInput({
      authorization_claim: {
        grant_status: "granted",
        verification_status: "verified",
      },
    });

    const result = await appendPostgreSqlAuditLedgerRecord(input, {
      record_digest_verifier: matchingDigestVerifier(),
      transaction_executor: executor,
    });

    expect(errorCode(result)).toBe(
      "postgresql_audit_ledger_writer.authorization_verifier_required",
    );
    expect(executor.transactions).toBe(0);
  });

  it("requires injected record digest verifier before auth or executor", async () => {
    const executor = fakeExecutor([{ rows: [storedRef()] }]);
    const authorization_verifier = vi.fn(grantingVerifier());

    const result = await appendPostgreSqlAuditLedgerRecord(validInput(), {
      authorization_verifier,
      transaction_executor: executor,
    });

    expect(errorCode(result)).toBe(
      "postgresql_audit_ledger_writer.record_digest_verifier_required",
    );
    expect(authorization_verifier).not.toHaveBeenCalled();
    expect(executor.transactions).toBe(0);
  });

  it("requires trusted digest match before authorization or transaction", async () => {
    const executor = fakeExecutor([{ rows: [storedRef()] }]);
    const authorization_verifier = vi.fn(grantingVerifier());
    const record_digest_verifier: PostgreSqlAuditLedgerRecordDigestVerifier = async (
      _record,
      expected,
    ) => ({
      verified: true,
      attestation: {
        contract_id: POSTGRESQL_AUDIT_LEDGER_RECORD_DIGEST_ATTESTATION_CONTRACT_ID,
        verification_status: "verified",
        binding_status: "matched",
        ...expected,
        canonical_record_digest: digest("b"),
      },
    });

    const result = await appendPostgreSqlAuditLedgerRecord(validInput(), {
      record_digest_verifier,
      authorization_verifier,
      transaction_executor: executor,
    });

    expect(errorCode(result)).toBe(
      "postgresql_audit_ledger_writer.record_digest_mismatch",
    );
    expect(result).toMatchObject({
      execution_authorized: false,
      executor_invoked: false,
      transaction_callback_invoked: false,
      write_attempted: false,
      write_outcome: "not_performed",
      write_performed: false,
      side_effects: [],
    });
    expect(authorization_verifier).not.toHaveBeenCalled();
    expect(executor.transactions).toBe(0);
  });

  it("validates complete dependency shape before invoking any verifier", async () => {
    const record_digest_verifier = vi.fn(matchingDigestVerifier());
    const authorization_verifier = vi.fn(grantingVerifier());

    const result = await appendPostgreSqlAuditLedgerRecord(validInput(), {
      record_digest_verifier,
      authorization_verifier,
      transaction_executor: {},
    });

    expect(errorCode(result)).toBe(
      "postgresql_audit_ledger_writer.invalid_dependencies",
    );
    expect(record_digest_verifier).not.toHaveBeenCalled();
    expect(authorization_verifier).not.toHaveBeenCalled();
  });

  it.each([
    ["denied", { verified: false, reason_code: "denied" }],
    ["requested", { verified: false, reason_code: "requested_only" }],
    ["expired", { verified: false, reason_code: "expired" }],
  ] as const)(
    "fails %s verifier result before executor use",
    async (_name, verified) => {
      const executor = fakeExecutor([{ rows: [storedRef()] }]);
      const verifier = vi.fn(async () => verified);

      const result = await appendPostgreSqlAuditLedgerRecord(validInput(), {
        record_digest_verifier: matchingDigestVerifier(),
        authorization_verifier: verifier,
        transaction_executor: executor,
      });

      expect(errorCode(result)).toBe(
        "postgresql_audit_ledger_writer.authorization_rejected",
      );
      expect(executor.transactions).toBe(0);
    },
  );

  it("fails verifier throw and mismatched verified grant before executor use", async () => {
    const executor = fakeExecutor([{ rows: [storedRef()] }]);
    const rejected = await appendPostgreSqlAuditLedgerRecord(validInput(), {
      record_digest_verifier: matchingDigestVerifier(),
      authorization_verifier: async () => {
        throw new Error("verifier-private-marker");
      },
      transaction_executor: executor,
    });
    expect(errorCode(rejected)).toBe(
      "postgresql_audit_ledger_writer.authorization_rejected",
    );
    expect(JSON.stringify(rejected)).not.toContain("verifier-private-marker");

    const mismatched = await appendPostgreSqlAuditLedgerRecord(validInput(), {
      record_digest_verifier: matchingDigestVerifier(),
      authorization_verifier: grantingVerifier({ tenant_ref: "tenant:other" }),
      transaction_executor: executor,
    });
    expect(errorCode(mismatched)).toBe(
      "postgresql_audit_ledger_writer.authorization_binding_mismatch",
    );
    expect(executor.transactions).toBe(0);
  });

  it("fails inactive structurally verified grant before executor use", async () => {
    const executor = fakeExecutor([{ rows: [storedRef()] }]);
    const verifier: PostgreSqlAuditLedgerAuthorizationVerifier = async (
      _claim,
      expected,
    ) => ({
      verified: true,
      grant: {
        ...verifiedGrant(expected),
        validity: "expired",
      } as unknown as PostgreSqlAuditLedgerVerifiedGrant,
    });

    const result = await appendPostgreSqlAuditLedgerRecord(validInput(), {
      record_digest_verifier: matchingDigestVerifier(),
      authorization_verifier: verifier,
      transaction_executor: executor,
    });

    expect(errorCode(result)).toBe(
      "postgresql_audit_ledger_writer.authorization_binding_mismatch",
    );
    expect(executor.transactions).toBe(0);
  });

  it("rejects verifier grant expired at checked_at before executor use", async () => {
    const executor = fakeExecutor([{ rows: [storedRef()] }]);
    const verifier: PostgreSqlAuditLedgerAuthorizationVerifier = async (
      _claim,
      expected,
    ) => ({
      verified: true,
      grant: {
        ...verifiedGrant(expected),
        checked_at: "2026-07-11T00:05:00.000Z",
        expires_at: "2026-07-11T00:05:00.000Z",
      },
    });

    const result = await appendPostgreSqlAuditLedgerRecord(validInput(), {
      record_digest_verifier: matchingDigestVerifier(),
      authorization_verifier: verifier,
      transaction_executor: executor,
    });

    expect(errorCode(result)).toBe(
      "postgresql_audit_ledger_writer.authorization_binding_mismatch",
    );
    expect(result).toMatchObject({
      execution_authorized: false,
      executor_invoked: false,
      write_outcome: "not_performed",
      write_performed: false,
    });
    expect(executor.transactions).toBe(0);
  });

  it("binds verifier proof to operation, capability, request, refs, scope, policy, approval, and obligations", async () => {
    const executor = fakeExecutor([{ rows: [storedRef()] }]);
    const verifier = vi.fn(grantingVerifier());

    await appendPostgreSqlAuditLedgerRecord(validInput(), {
      record_digest_verifier: matchingDigestVerifier(),
      authorization_verifier: verifier,
      transaction_executor: executor,
    });

    expect(verifier).toHaveBeenCalledWith(
      { opaque_claim_ref: "claim:bp0845:test" },
      {
        operation: "ledger.record.append",
        capability: AUDIT_LEDGER_WRITER_CAPABILITY,
        request_id: "req_bp0845_append_0001",
        ledger_record_id: validRecord().ledger_record_id,
        event_id: validRecord().event_id,
        idempotency_key: validRecord().idempotency_key,
        canonical_record_digest: digest("a"),
        tenant_ref: "tenant:lnsat-test",
        project_ref: "project:lnsat",
        policy_decision_id: "pol_bp0845_append_0001",
        approval_request_id: "apr_bp0845_append_0001",
        source_refs: ["packet:BP-0845", "contract:BP-0052"],
        audit_obligation_refs: ["audit-obligation:append-ledger-record"],
      },
    );
  });

  it("rejects executor that skips callback or fabricates callback result", async () => {
    const skipped: PostgreSqlAuditLedgerTransactionExecutor = {
      transaction: async () => ({ outcome: "appended", record_ref: storedRef() }),
    };
    const skippedResult = await appendPostgreSqlAuditLedgerRecord(
      validInput(),
      validDependencies(skipped),
    );
    expect(errorCode(skippedResult)).toBe(
      "postgresql_audit_ledger_writer.executor_failed",
    );
    expect(skippedResult).toMatchObject({
      execution_authorized: true,
      executor_invoked: true,
      transaction_callback_invoked: false,
      write_attempted: false,
    });

    const fabricated: PostgreSqlAuditLedgerTransactionExecutor = {
      async transaction<T>(work: (tx: PostgreSqlAuditLedgerTransaction) => Promise<T>) {
        await work({
          query: async () => ({ rows: [storedRef()] }),
        });
        return {
          outcome: "exact_replay",
          record_ref: storedRef(),
        } as T;
      },
    };
    const fabricatedResult = await appendPostgreSqlAuditLedgerRecord(
      validInput(),
      validDependencies(fabricated),
    );
    expect(errorCode(fabricatedResult)).toBe(
      "postgresql_audit_ledger_writer.executor_failed",
    );
    expect(fabricatedResult).toMatchObject({
      transaction_callback_invoked: true,
      write_attempted: true,
      write_outcome: "indeterminate",
      write_performed: "unknown",
      side_effects: [{ status: "indeterminate" }],
    });
  });

  it("loads direct ESM writer entry through index cycle without initialization failure", async () => {
    const module = await import("../src/postgresql-audit-ledger-writer.js");
    expect(module.appendPostgreSqlAuditLedgerRecord).toBeTypeOf("function");
  });

  it("fails malformed record, contract, or ref mismatch before verifier and executor", async () => {
    const executor = fakeExecutor([{ rows: [storedRef()] }]);
    const verifier = vi.fn(grantingVerifier());

    const invalidRecord = await appendPostgreSqlAuditLedgerRecord(
      validInput({
        record: { ...validRecord(), raw_body: "private-record" } as AuditLedgerRecord,
      }),
      {
        record_digest_verifier: matchingDigestVerifier(),
        authorization_verifier: verifier,
        transaction_executor: executor,
      },
    );
    expect(errorCode(invalidRecord)).toBe(
      "postgresql_audit_ledger_writer.invalid_record",
    );

    const badContract = validWriterContract();
    badContract.operation = "ledger.record.correct";
    const invalidContract = await appendPostgreSqlAuditLedgerRecord(
      validInput({ writer_interface_contract: badContract }),
      {
        record_digest_verifier: matchingDigestVerifier(),
        authorization_verifier: verifier,
        transaction_executor: executor,
      },
    );
    expect(errorCode(invalidContract)).toBe(
      "postgresql_audit_ledger_writer.invalid_writer_contract",
    );

    const mismatch = validWriterContract();
    mismatch.record_ref.event_id = "evt_bp0845_other_0001";
    mismatch.idempotency.idempotency_key = mismatch.record_ref.idempotency_key;
    const mismatched = await appendPostgreSqlAuditLedgerRecord(
      validInput({ writer_interface_contract: mismatch }),
      {
        record_digest_verifier: matchingDigestVerifier(),
        authorization_verifier: verifier,
        transaction_executor: executor,
      },
    );
    expect(errorCode(mismatched)).toBe(
      "postgresql_audit_ledger_writer.record_contract_mismatch",
    );

    expect(verifier).not.toHaveBeenCalled();
    expect(executor.transactions).toBe(0);
    expect(JSON.stringify(invalidRecord)).not.toContain("private-record");
  });
});

function validInput(
  overrides: Partial<{
    record: AuditLedgerRecord;
    writer_interface_contract: AuditLedgerWriterInterfaceContract;
    authorization_claim: unknown;
  }> = {},
) {
  return {
    record: validRecord(),
    writer_interface_contract: validWriterContract(),
    tenant_ref: "tenant:lnsat-test",
    project_ref: "project:lnsat",
    audit_obligation_refs: ["audit-obligation:append-ledger-record"],
    authorization_claim: { opaque_claim_ref: "claim:bp0845:test" },
    ...overrides,
  };
}

function validRecord(): AuditLedgerRecord {
  return {
    ledger_record_id: "alr_bp0845_append_0001",
    event_id: "evt_bp0845_append_0001",
    event_type: "policy_checked",
    result_status: "allow",
    actor_ref: "agent.codex",
    session_ref: "session:bp0845",
    packet_ref: null,
    policy_ref: {
      decision_id: "pol_bp0845_append_0001",
      decision: "approval_required",
      requires_approval: true,
    },
    approval_ref: {
      approval_id: "apr_bp0845_append_0001",
      decision: "requested",
    },
    adapter_ref: null,
    resource_refs: ["repo:lnsat"],
    capability: AUDIT_LEDGER_WRITER_CAPABILITY,
    risk_level: 4,
    source_refs: ["packet:BP-0845", "contract:BP-0052"],
    reason_codes: ["policy.audit_ledger_state_change_requires_approval"],
    redaction: {
      raw_rejected_command: "not_present",
      raw_rejected_value: "not_present",
      raw_invalid_payload_content: "not_present",
      secret_like_values: "not_present",
    },
    idempotency_key: "audit:policy_checked:evt_bp0845_append_0001",
    created_at: "2026-07-11T00:00:00.000Z",
    observed_at: "2026-07-11T00:00:00.000Z",
    retention_class: "control_plane",
    side_effects: [],
  };
}

function validWriterContract(): AuditLedgerWriterInterfaceContract {
  const record = validRecord();
  return {
    contract_id: AUDIT_LEDGER_WRITER_INTERFACE_CONTRACT_ID,
    request_id: "req_bp0845_append_0001",
    operation: "ledger.record.append",
    record_ref: { ...storedRef() },
    policy_gate_ref: {
      contract_id: AUDIT_LEDGER_WRITER_POLICY_GATE_CONTRACT_ID,
      decision_id: "pol_bp0845_append_0001",
      decision: "approval_required",
      requires_approval: true,
      reason_codes: ["policy.audit_ledger_state_change_requires_approval"],
    },
    approval_ref: {
      contract_id: AUDIT_LEDGER_WRITER_APPROVAL_REQUEST_CONTRACT_ID,
      approval_request_id: "apr_bp0845_append_0001",
      approval_status: "requested",
      approval_kind: "ledger_state_change",
      policy_gate_decision_id: "pol_bp0845_append_0001",
    },
    append_only: {
      mode: "insert_only",
      correction_model: "append_new_record_referencing_prior_record",
      forbidden_mutations: ["update", "delete", "truncate", "in_place_redaction"],
    },
    idempotency: {
      idempotency_key: record.idempotency_key,
      canonical_record_digest: digest("a"),
      duplicate_behavior: "exact_replay_returns_existing_ref",
      collision_behavior: "fail_closed",
    },
    redaction: { ...record.redaction },
    source_refs: [...record.source_refs],
    live_execution_allowed: false,
    side_effects: [],
  };
}

function storedRef() {
  const record = validRecord();
  return {
    ledger_record_id: record.ledger_record_id,
    event_id: record.event_id,
    idempotency_key: record.idempotency_key,
    canonical_record_digest: digest("a"),
  };
}

function grantingVerifier(
  overrides: Partial<PostgreSqlAuditLedgerVerifiedGrant> = {},
): PostgreSqlAuditLedgerAuthorizationVerifier {
  return async (_claim, expected) => ({
    verified: true,
    grant: { ...verifiedGrant(expected), ...overrides },
  });
}

function matchingDigestVerifier(): PostgreSqlAuditLedgerRecordDigestVerifier {
  return async (_record, expected) => ({
    verified: true,
    attestation: {
      contract_id: POSTGRESQL_AUDIT_LEDGER_RECORD_DIGEST_ATTESTATION_CONTRACT_ID,
      verification_status: "verified",
      binding_status: "matched",
      ...expected,
    },
  });
}

function validDependencies(
  transaction_executor: PostgreSqlAuditLedgerTransactionExecutor,
) {
  return {
    record_digest_verifier: matchingDigestVerifier(),
    authorization_verifier: grantingVerifier(),
    transaction_executor,
  };
}

function verifiedGrant(
  expected: PostgreSqlAuditLedgerGrantBinding,
): PostgreSqlAuditLedgerVerifiedGrant {
  return {
    contract_id: POSTGRESQL_AUDIT_LEDGER_WRITER_GRANT_PROOF_CONTRACT_ID,
    grant_id: "grant_bp0845_test_0001",
    verification_status: "verified",
    grant_status: "granted",
    validity: "active",
    verified_at: "2026-07-11T00:00:00.000Z",
    checked_at: "2026-07-11T00:01:00.000Z",
    expires_at: "2026-07-11T00:05:00.000Z",
    ...expected,
    source_refs: [...expected.source_refs],
    audit_obligation_refs: [...expected.audit_obligation_refs],
  };
}

function fakeExecutor(
  responses: Array<{ rows: unknown[] } | Error>,
): PostgreSqlAuditLedgerTransactionExecutor & {
  queries: Array<{ sql: string; values: readonly unknown[] }>;
  transactions: number;
  commits: number;
  rollbacks: number;
} {
  const executor = {
    queries: [] as Array<{ sql: string; values: readonly unknown[] }>,
    transactions: 0,
    commits: 0,
    rollbacks: 0,
    async transaction<T>(
      work: (transaction: PostgreSqlAuditLedgerTransaction) => Promise<T>,
    ): Promise<T> {
      executor.transactions += 1;
      let index = 0;
      try {
        const result = await work({
          async query(sql, values) {
            executor.queries.push({ sql, values });
            const response = responses[index];
            index += 1;
            if (response instanceof Error) throw response;
            if (response === undefined) throw new Error("missing fake response");
            return response;
          },
        });
        executor.commits += 1;
        return result;
      } catch (error) {
        executor.rollbacks += 1;
        throw error;
      }
    },
  };
  return executor;
}

function digest(character: string): string {
  return `sha256:${character.repeat(64)}`;
}

function errorCode(
  result: Awaited<ReturnType<typeof appendPostgreSqlAuditLedgerRecord>>,
): string | null {
  return result.ok ? null : result.errors[0].code;
}
