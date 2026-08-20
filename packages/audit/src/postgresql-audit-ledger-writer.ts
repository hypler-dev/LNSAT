import {
  AUDIT_LEDGER_WRITER_CAPABILITY,
  evaluateAuditLedgerAppendSemantics,
  validateAuditLedgerRecord,
  type AuditLedgerRecord,
  type AuditLedgerWriterInterfaceContract,
} from "./index.js";

export const POSTGRESQL_AUDIT_LEDGER_WRITER_STATUS = "source_only";
export const POSTGRESQL_AUDIT_LEDGER_WRITER_GRANT_PROOF_CONTRACT_ID =
  "lnsat.audit.postgresql_audit_ledger_writer_grant_proof.v0_1";
export const POSTGRESQL_AUDIT_LEDGER_RECORD_DIGEST_ATTESTATION_CONTRACT_ID =
  "lnsat.audit.postgresql_audit_ledger_record_digest_attestation.v0_1";

export const POSTGRESQL_AUDIT_LEDGER_INSERT_SQL = `INSERT INTO audit_events (
  ledger_record_id,
  event_id,
  event_type,
  result_status,
  actor_ref,
  session_ref,
  packet_ref,
  policy_ref,
  approval_ref,
  adapter_ref,
  resource_refs,
  capability,
  risk_level,
  source_refs,
  reason_codes,
  redaction,
  idempotency_key,
  canonical_record_digest,
  created_at,
  observed_at,
  retention_class,
  side_effects
) VALUES (
  $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
  $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22
)
ON CONFLICT (idempotency_key) DO NOTHING
RETURNING ledger_record_id, event_id, idempotency_key, canonical_record_digest`;

export const POSTGRESQL_AUDIT_LEDGER_REPLAY_SQL = `SELECT
  ledger_record_id,
  event_id,
  idempotency_key,
  canonical_record_digest
FROM audit_events
WHERE idempotency_key = $1`;

export type PostgreSqlAuditLedgerGrantBinding = {
  operation: "ledger.record.append";
  capability: typeof AUDIT_LEDGER_WRITER_CAPABILITY;
  request_id: string;
  ledger_record_id: string;
  event_id: string;
  idempotency_key: string;
  canonical_record_digest: string;
  tenant_ref: string;
  project_ref: string;
  policy_decision_id: string;
  approval_request_id: string;
  source_refs: string[];
  audit_obligation_refs: string[];
};

export type PostgreSqlAuditLedgerVerifiedGrant = PostgreSqlAuditLedgerGrantBinding & {
  contract_id: typeof POSTGRESQL_AUDIT_LEDGER_WRITER_GRANT_PROOF_CONTRACT_ID;
  grant_id: string;
  verification_status: "verified";
  grant_status: "granted";
  validity: "active";
  verified_at: string;
  checked_at: string;
  expires_at: string;
};

export type PostgreSqlAuditLedgerRecordDigestBinding = {
  ledger_record_id: string;
  event_id: string;
  idempotency_key: string;
  canonical_record_digest: string;
};

export type PostgreSqlAuditLedgerRecordDigestAttestation =
  PostgreSqlAuditLedgerRecordDigestBinding & {
    contract_id: typeof POSTGRESQL_AUDIT_LEDGER_RECORD_DIGEST_ATTESTATION_CONTRACT_ID;
    verification_status: "verified";
    binding_status: "matched";
  };

export type PostgreSqlAuditLedgerRecordDigestVerificationResult =
  | { verified: true; attestation: PostgreSqlAuditLedgerRecordDigestAttestation }
  | { verified: false; reason_code: string };

/** Composition root must inject a trusted canonical serializer/digest verifier. */
export type PostgreSqlAuditLedgerRecordDigestVerifier = (
  record: AuditLedgerRecord,
  expected: PostgreSqlAuditLedgerRecordDigestBinding,
) =>
  | PostgreSqlAuditLedgerRecordDigestVerificationResult
  | Promise<PostgreSqlAuditLedgerRecordDigestVerificationResult>;

export type PostgreSqlAuditLedgerAuthorizationVerificationResult =
  | { verified: true; grant: PostgreSqlAuditLedgerVerifiedGrant }
  | { verified: false; reason_code: string };

export type PostgreSqlAuditLedgerAuthorizationVerifier = (
  claim: unknown,
  expected: PostgreSqlAuditLedgerGrantBinding,
) =>
  | PostgreSqlAuditLedgerAuthorizationVerificationResult
  | Promise<PostgreSqlAuditLedgerAuthorizationVerificationResult>;

export type PostgreSqlAuditLedgerQueryResult = {
  rows: unknown[];
};

export type PostgreSqlAuditLedgerTransaction = {
  query(
    sql: string,
    values: readonly unknown[],
  ): Promise<PostgreSqlAuditLedgerQueryResult>;
};

export type PostgreSqlAuditLedgerTransactionExecutor = {
  transaction<T>(
    work: (transaction: PostgreSqlAuditLedgerTransaction) => Promise<T>,
  ): Promise<T>;
};

export type PostgreSqlAuditLedgerWriterInput = {
  record: AuditLedgerRecord;
  writer_interface_contract: AuditLedgerWriterInterfaceContract;
  tenant_ref: string;
  project_ref: string;
  audit_obligation_refs: string[];
  authorization_claim: unknown;
};

export type PostgreSqlAuditLedgerWriterErrorCode =
  | "postgresql_audit_ledger_writer.invalid_request"
  | "postgresql_audit_ledger_writer.invalid_record"
  | "postgresql_audit_ledger_writer.invalid_writer_contract"
  | "postgresql_audit_ledger_writer.record_contract_mismatch"
  | "postgresql_audit_ledger_writer.invalid_dependencies"
  | "postgresql_audit_ledger_writer.record_digest_verifier_required"
  | "postgresql_audit_ledger_writer.record_digest_verification_failed"
  | "postgresql_audit_ledger_writer.record_digest_mismatch"
  | "postgresql_audit_ledger_writer.authorization_verifier_required"
  | "postgresql_audit_ledger_writer.authorization_rejected"
  | "postgresql_audit_ledger_writer.authorization_binding_mismatch"
  | "postgresql_audit_ledger_writer.idempotency_collision"
  | "postgresql_audit_ledger_writer.executor_failed";

export type PostgreSqlAuditLedgerWriterResult =
  | {
      ok: true;
      outcome: "appended" | "exact_replay";
      record_ref: StoredAuditLedgerRecordRef;
      execution_authorized: true;
      executor_invoked: true;
      transaction_callback_invoked: true;
      execution_mode: "injected_transaction_executor";
      write_attempted: true;
      write_outcome: "performed" | "not_performed";
      write_performed: boolean;
      errors: [];
      side_effects: [PostgreSqlAuditLedgerWriterSideEffect];
    }
  | {
      ok: false;
      record_ref: null;
      execution_authorized: boolean;
      executor_invoked: boolean;
      transaction_callback_invoked: boolean;
      execution_mode: "injected_transaction_executor";
      write_attempted: boolean;
      write_outcome: "not_performed" | "indeterminate";
      write_performed: false | "unknown";
      raw_error_content: "withheld";
      errors: [PostgreSqlAuditLedgerWriterError];
      side_effects: [] | [PostgreSqlAuditLedgerWriterSideEffect];
    };

export type PostgreSqlAuditLedgerWriterError = {
  code: PostgreSqlAuditLedgerWriterErrorCode;
  message: string;
  severity: "error";
};

export type PostgreSqlAuditLedgerWriterSideEffect = {
  effect_type: "postgresql.audit_events.append_attempt";
  resource_ref: "postgresql:audit_events";
  status: "completed" | "failed" | "indeterminate";
};

export type StoredAuditLedgerRecordRef = {
  ledger_record_id: string;
  event_id: string;
  idempotency_key: string;
  canonical_record_digest: string;
};

type WriterDependencies = {
  record_digest_verifier: PostgreSqlAuditLedgerRecordDigestVerifier;
  authorization_verifier: PostgreSqlAuditLedgerAuthorizationVerifier;
  transaction_executor: PostgreSqlAuditLedgerTransactionExecutor;
};

type ExecutionState = {
  execution_authorized: boolean;
  executor_invoked: boolean;
  transaction_callback_invoked: boolean;
  write_attempted: boolean;
};

type TransactionOutcome = {
  outcome: "appended" | "exact_replay";
  record_ref: StoredAuditLedgerRecordRef;
};

class IdempotencyCollisionError extends Error {}

export async function appendPostgreSqlAuditLedgerRecord(
  input: unknown,
  dependencies: unknown,
): Promise<PostgreSqlAuditLedgerWriterResult> {
  const initialState = executionState();
  if (!isWriterInput(input)) {
    return failure("postgresql_audit_ledger_writer.invalid_request", initialState);
  }

  const recordValidation = validateAuditLedgerRecord(input.record);
  if (!recordValidation.ok) {
    return failure("postgresql_audit_ledger_writer.invalid_record", initialState);
  }

  const contractValidation = evaluateAuditLedgerAppendSemantics({
    prior_state: [],
    writer_interface_contract: input.writer_interface_contract,
  });
  if (!contractValidation.ok) {
    return failure(
      "postgresql_audit_ledger_writer.invalid_writer_contract",
      initialState,
    );
  }

  const record = structuredClone(recordValidation.record);
  const contract = structuredClone(input.writer_interface_contract);
  if (!recordMatchesContract(record, contract)) {
    return failure(
      "postgresql_audit_ledger_writer.record_contract_mismatch",
      initialState,
    );
  }

  const dependencyError = validateDependencies(dependencies);
  if (dependencyError !== null) {
    return failure(dependencyError, initialState);
  }
  const writerDependencies = dependencies as WriterDependencies;

  const digestBinding = recordDigestBinding(record, contract);
  let digestVerification: PostgreSqlAuditLedgerRecordDigestVerificationResult;
  try {
    digestVerification = await writerDependencies.record_digest_verifier(
      record,
      digestBinding,
    );
  } catch {
    return failure(
      "postgresql_audit_ledger_writer.record_digest_verification_failed",
      initialState,
    );
  }
  if (!isDigestVerificationResult(digestVerification) || !digestVerification.verified) {
    return failure(
      "postgresql_audit_ledger_writer.record_digest_verification_failed",
      initialState,
    );
  }
  if (!digestAttestationMatches(digestVerification.attestation, digestBinding)) {
    return failure(
      "postgresql_audit_ledger_writer.record_digest_mismatch",
      initialState,
    );
  }

  const expected = grantBinding(input, record, contract);
  let verification: PostgreSqlAuditLedgerAuthorizationVerificationResult;
  try {
    verification = await writerDependencies.authorization_verifier(
      input.authorization_claim,
      cloneGrantBinding(expected),
    );
  } catch {
    return failure(
      "postgresql_audit_ledger_writer.authorization_rejected",
      initialState,
    );
  }

  if (!isVerificationResult(verification) || !verification.verified) {
    return failure(
      "postgresql_audit_ledger_writer.authorization_rejected",
      initialState,
    );
  }
  if (!verifiedGrantMatches(verification.grant, expected)) {
    return failure(
      "postgresql_audit_ledger_writer.authorization_binding_mismatch",
      initialState,
    );
  }

  const state = executionState({ execution_authorized: true });
  let callbackResult: TransactionOutcome | null = null;

  try {
    state.executor_invoked = true;
    const result: unknown = await writerDependencies.transaction_executor.transaction(
      async (transaction) => {
        if (state.transaction_callback_invoked) {
          throw new Error("transaction callback invoked more than once");
        }
        state.transaction_callback_invoked = true;
        state.write_attempted = true;
        const insert = await transaction.query(
          POSTGRESQL_AUDIT_LEDGER_INSERT_SQL,
          recordValues(record, contract.record_ref.canonical_record_digest),
        );
        if (!isQueryResult(insert)) throw new Error("invalid query result");

        if (insert.rows.length === 1) {
          const inserted = storedRef(insert.rows[0]);
          if (inserted === null || !sameStoredRef(inserted, contract.record_ref)) {
            throw new Error("invalid inserted ref");
          }
          callbackResult = { outcome: "appended", record_ref: inserted };
          return callbackResult;
        }
        if (insert.rows.length !== 0) throw new Error("invalid inserted row count");

        const replay = await transaction.query(POSTGRESQL_AUDIT_LEDGER_REPLAY_SQL, [
          record.idempotency_key,
        ]);
        if (!isQueryResult(replay) || replay.rows.length !== 1) {
          throw new Error("missing replay ref");
        }
        const existing = storedRef(replay.rows[0]);
        if (existing === null) throw new Error("invalid replay ref");
        if (
          existing.idempotency_key !== record.idempotency_key ||
          existing.canonical_record_digest !==
            contract.record_ref.canonical_record_digest
        ) {
          throw new IdempotencyCollisionError();
        }
        callbackResult = { outcome: "exact_replay", record_ref: existing };
        return callbackResult;
      },
    );

    if (
      callbackResult === null ||
      !state.transaction_callback_invoked ||
      !sameTransactionOutcome(result, callbackResult)
    ) {
      return failure("postgresql_audit_ledger_writer.executor_failed", state);
    }

    return {
      ok: true,
      outcome: result.outcome,
      record_ref: result.record_ref,
      execution_authorized: true,
      executor_invoked: true,
      transaction_callback_invoked: true,
      execution_mode: "injected_transaction_executor",
      write_attempted: true,
      write_outcome: result.outcome === "appended" ? "performed" : "not_performed",
      write_performed: result.outcome === "appended",
      errors: [],
      side_effects: [sideEffect("completed")],
    };
  } catch (error) {
    return failure(
      error instanceof IdempotencyCollisionError
        ? "postgresql_audit_ledger_writer.idempotency_collision"
        : "postgresql_audit_ledger_writer.executor_failed",
      state,
    );
  }
}

function isWriterInput(value: unknown): value is PostgreSqlAuditLedgerWriterInput {
  return (
    isPlainObject(value) &&
    hasExactKeys(value, [
      "record",
      "writer_interface_contract",
      "tenant_ref",
      "project_ref",
      "audit_obligation_refs",
      "authorization_claim",
    ]) &&
    isBoundedString(value.tenant_ref, 256) &&
    isBoundedString(value.project_ref, 256) &&
    isBoundedStringArray(value.audit_obligation_refs, 100, 512) &&
    value.audit_obligation_refs.length > 0
  );
}

function validateDependencies(
  value: unknown,
): PostgreSqlAuditLedgerWriterErrorCode | null {
  if (!isPlainObject(value)) {
    return "postgresql_audit_ledger_writer.invalid_dependencies";
  }
  if (typeof value.record_digest_verifier !== "function") {
    return "postgresql_audit_ledger_writer.record_digest_verifier_required";
  }
  if (typeof value.authorization_verifier !== "function") {
    return "postgresql_audit_ledger_writer.authorization_verifier_required";
  }
  if (
    !isPlainObject(value.transaction_executor) ||
    typeof value.transaction_executor.transaction !== "function"
  ) {
    return "postgresql_audit_ledger_writer.invalid_dependencies";
  }
  if (
    !hasExactKeys(value, [
      "record_digest_verifier",
      "authorization_verifier",
      "transaction_executor",
    ])
  ) {
    return "postgresql_audit_ledger_writer.invalid_dependencies";
  }
  return null;
}

function recordDigestBinding(
  record: AuditLedgerRecord,
  contract: AuditLedgerWriterInterfaceContract,
): PostgreSqlAuditLedgerRecordDigestBinding {
  return {
    ledger_record_id: record.ledger_record_id,
    event_id: record.event_id,
    idempotency_key: record.idempotency_key,
    canonical_record_digest: contract.record_ref.canonical_record_digest,
  };
}

function isDigestVerificationResult(
  value: unknown,
): value is PostgreSqlAuditLedgerRecordDigestVerificationResult {
  return (
    isPlainObject(value) &&
    ((value.verified === false && isBoundedString(value.reason_code, 256)) ||
      (value.verified === true && isPlainObject(value.attestation)))
  );
}

function digestAttestationMatches(
  attestation: PostgreSqlAuditLedgerRecordDigestAttestation,
  expected: PostgreSqlAuditLedgerRecordDigestBinding,
): boolean {
  return (
    isPlainObject(attestation) &&
    hasExactKeys(attestation, [
      "contract_id",
      "verification_status",
      "binding_status",
      "ledger_record_id",
      "event_id",
      "idempotency_key",
      "canonical_record_digest",
    ]) &&
    attestation.contract_id ===
      POSTGRESQL_AUDIT_LEDGER_RECORD_DIGEST_ATTESTATION_CONTRACT_ID &&
    attestation.verification_status === "verified" &&
    attestation.binding_status === "matched" &&
    attestation.ledger_record_id === expected.ledger_record_id &&
    attestation.event_id === expected.event_id &&
    attestation.idempotency_key === expected.idempotency_key &&
    attestation.canonical_record_digest === expected.canonical_record_digest
  );
}

function recordMatchesContract(
  record: AuditLedgerRecord,
  contract: AuditLedgerWriterInterfaceContract,
): boolean {
  return (
    contract.operation === "ledger.record.append" &&
    contract.record_ref.ledger_record_id === record.ledger_record_id &&
    contract.record_ref.event_id === record.event_id &&
    contract.record_ref.idempotency_key === record.idempotency_key &&
    contract.idempotency.idempotency_key === record.idempotency_key &&
    contract.idempotency.canonical_record_digest ===
      contract.record_ref.canonical_record_digest
  );
}

function grantBinding(
  input: PostgreSqlAuditLedgerWriterInput,
  record: AuditLedgerRecord,
  contract: AuditLedgerWriterInterfaceContract,
): PostgreSqlAuditLedgerGrantBinding {
  return {
    operation: "ledger.record.append",
    capability: AUDIT_LEDGER_WRITER_CAPABILITY,
    request_id: contract.request_id,
    ledger_record_id: record.ledger_record_id,
    event_id: record.event_id,
    idempotency_key: record.idempotency_key,
    canonical_record_digest: contract.record_ref.canonical_record_digest,
    tenant_ref: input.tenant_ref,
    project_ref: input.project_ref,
    policy_decision_id: contract.policy_gate_ref.decision_id,
    approval_request_id: contract.approval_ref.approval_request_id,
    source_refs: [...contract.source_refs],
    audit_obligation_refs: [...input.audit_obligation_refs],
  };
}

function cloneGrantBinding(
  binding: PostgreSqlAuditLedgerGrantBinding,
): PostgreSqlAuditLedgerGrantBinding {
  return {
    ...binding,
    source_refs: [...binding.source_refs],
    audit_obligation_refs: [...binding.audit_obligation_refs],
  };
}

function isVerificationResult(
  value: unknown,
): value is PostgreSqlAuditLedgerAuthorizationVerificationResult {
  return (
    isPlainObject(value) &&
    ((value.verified === false && isBoundedString(value.reason_code, 256)) ||
      (value.verified === true && isPlainObject(value.grant)))
  );
}

function verifiedGrantMatches(
  grant: PostgreSqlAuditLedgerVerifiedGrant,
  expected: PostgreSqlAuditLedgerGrantBinding,
): boolean {
  return (
    isPlainObject(grant) &&
    hasExactKeys(grant, [
      "contract_id",
      "grant_id",
      "verification_status",
      "grant_status",
      "validity",
      "verified_at",
      "checked_at",
      "expires_at",
      "operation",
      "capability",
      "request_id",
      "ledger_record_id",
      "event_id",
      "idempotency_key",
      "canonical_record_digest",
      "tenant_ref",
      "project_ref",
      "policy_decision_id",
      "approval_request_id",
      "source_refs",
      "audit_obligation_refs",
    ]) &&
    grant.contract_id === POSTGRESQL_AUDIT_LEDGER_WRITER_GRANT_PROOF_CONTRACT_ID &&
    isBoundedString(grant.grant_id, 256) &&
    grant.verification_status === "verified" &&
    grant.grant_status === "granted" &&
    grant.validity === "active" &&
    isIsoTimestamp(grant.verified_at) &&
    isIsoTimestamp(grant.checked_at) &&
    isIsoTimestamp(grant.expires_at) &&
    Date.parse(grant.verified_at) <= Date.parse(grant.checked_at) &&
    Date.parse(grant.checked_at) < Date.parse(grant.expires_at) &&
    grant.operation === expected.operation &&
    grant.capability === expected.capability &&
    grant.request_id === expected.request_id &&
    grant.ledger_record_id === expected.ledger_record_id &&
    grant.event_id === expected.event_id &&
    grant.idempotency_key === expected.idempotency_key &&
    grant.canonical_record_digest === expected.canonical_record_digest &&
    grant.tenant_ref === expected.tenant_ref &&
    grant.project_ref === expected.project_ref &&
    grant.policy_decision_id === expected.policy_decision_id &&
    grant.approval_request_id === expected.approval_request_id &&
    arraysEqual(grant.source_refs, expected.source_refs) &&
    arraysEqual(grant.audit_obligation_refs, expected.audit_obligation_refs)
  );
}

function recordValues(record: AuditLedgerRecord, digest: string): readonly unknown[] {
  return [
    record.ledger_record_id,
    record.event_id,
    record.event_type,
    record.result_status,
    record.actor_ref,
    record.session_ref,
    nullableJsonbValue(record.packet_ref),
    nullableJsonbValue(record.policy_ref),
    nullableJsonbValue(record.approval_ref),
    nullableJsonbValue(record.adapter_ref),
    JSON.stringify(record.resource_refs),
    record.capability,
    record.risk_level,
    JSON.stringify(record.source_refs),
    JSON.stringify(record.reason_codes),
    JSON.stringify(record.redaction),
    record.idempotency_key,
    digest,
    record.created_at,
    record.observed_at,
    record.retention_class,
    JSON.stringify(record.side_effects),
  ];
}

function nullableJsonbValue(value: object | null): string | null {
  return value === null ? null : JSON.stringify(value);
}

function storedRef(value: unknown): StoredAuditLedgerRecordRef | null {
  if (
    !isPlainObject(value) ||
    !hasExactKeys(value, [
      "ledger_record_id",
      "event_id",
      "idempotency_key",
      "canonical_record_digest",
    ]) ||
    !isBoundedString(value.ledger_record_id, 100) ||
    !isBoundedString(value.event_id, 184) ||
    !isBoundedString(value.idempotency_key, 256) ||
    !/^sha256:[a-f0-9]{64}$/.test(String(value.canonical_record_digest))
  ) {
    return null;
  }
  return value as StoredAuditLedgerRecordRef;
}

function sameStoredRef(
  actual: StoredAuditLedgerRecordRef,
  expected: AuditLedgerWriterInterfaceContract["record_ref"],
): boolean {
  return (
    actual.ledger_record_id === expected.ledger_record_id &&
    actual.event_id === expected.event_id &&
    actual.idempotency_key === expected.idempotency_key &&
    actual.canonical_record_digest === expected.canonical_record_digest
  );
}

function sameTransactionOutcome(
  actual: unknown,
  expected: TransactionOutcome,
): actual is TransactionOutcome {
  if (
    !isPlainObject(actual) ||
    !hasExactKeys(actual, ["outcome", "record_ref"]) ||
    (actual.outcome !== "appended" && actual.outcome !== "exact_replay")
  ) {
    return false;
  }
  const actualRef = storedRef(actual.record_ref);
  return (
    actual.outcome === expected.outcome &&
    actualRef !== null &&
    sameStoredRef(actualRef, expected.record_ref)
  );
}

function isQueryResult(value: unknown): value is PostgreSqlAuditLedgerQueryResult {
  return isPlainObject(value) && Array.isArray(value.rows);
}

function failure(
  code: PostgreSqlAuditLedgerWriterErrorCode,
  state: ExecutionState,
): PostgreSqlAuditLedgerWriterResult {
  const writeOutcome =
    state.write_attempted &&
    code !== "postgresql_audit_ledger_writer.idempotency_collision"
      ? "indeterminate"
      : "not_performed";
  return {
    ok: false,
    record_ref: null,
    execution_authorized: state.execution_authorized,
    executor_invoked: state.executor_invoked,
    transaction_callback_invoked: state.transaction_callback_invoked,
    execution_mode: "injected_transaction_executor",
    write_attempted: state.write_attempted,
    write_outcome: writeOutcome,
    write_performed: writeOutcome === "indeterminate" ? "unknown" : false,
    raw_error_content: "withheld",
    errors: [
      {
        code,
        message: publicErrorMessage(code),
        severity: "error",
      },
    ],
    side_effects: state.executor_invoked
      ? [sideEffect(writeOutcome === "indeterminate" ? "indeterminate" : "failed")]
      : [],
  };
}

function publicErrorMessage(code: PostgreSqlAuditLedgerWriterErrorCode): string {
  switch (code) {
    case "postgresql_audit_ledger_writer.invalid_request":
      return "Writer request or injected dependencies are invalid.";
    case "postgresql_audit_ledger_writer.invalid_record":
      return "Audit ledger record validation failed.";
    case "postgresql_audit_ledger_writer.invalid_writer_contract":
      return "Append-only writer contract validation failed.";
    case "postgresql_audit_ledger_writer.record_contract_mismatch":
      return "Record refs do not match writer contract refs.";
    case "postgresql_audit_ledger_writer.invalid_dependencies":
      return "Injected writer dependencies are invalid.";
    case "postgresql_audit_ledger_writer.record_digest_verifier_required":
      return "Injected record digest verifier is required.";
    case "postgresql_audit_ledger_writer.record_digest_verification_failed":
      return "Canonical record digest verification failed.";
    case "postgresql_audit_ledger_writer.record_digest_mismatch":
      return "Verified canonical record digest is not bound to this record.";
    case "postgresql_audit_ledger_writer.authorization_verifier_required":
      return "Injected authorization verifier is required.";
    case "postgresql_audit_ledger_writer.authorization_rejected":
      return "Write authorization verification failed.";
    case "postgresql_audit_ledger_writer.authorization_binding_mismatch":
      return "Verified authorization is not bound to this append request.";
    case "postgresql_audit_ledger_writer.idempotency_collision":
      return "Idempotency key is bound to a different canonical digest.";
    case "postgresql_audit_ledger_writer.executor_failed":
      return "Injected transaction execution failed.";
  }
}

function executionState(overrides: Partial<ExecutionState> = {}): ExecutionState {
  return {
    execution_authorized: false,
    executor_invoked: false,
    transaction_callback_invoked: false,
    write_attempted: false,
    ...overrides,
  };
}

function sideEffect(
  status: PostgreSqlAuditLedgerWriterSideEffect["status"],
): PostgreSqlAuditLedgerWriterSideEffect {
  return {
    effect_type: "postgresql.audit_events.append_attempt",
    resource_ref: "postgresql:audit_events",
    status,
  };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function hasExactKeys(
  value: Record<string, unknown>,
  keys: readonly string[],
): boolean {
  const actual = Object.keys(value);
  return actual.length === keys.length && keys.every((key) => key in value);
}

function isBoundedString(value: unknown, maximumLength: number): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= maximumLength;
}

function isIsoTimestamp(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) &&
    Number.isFinite(Date.parse(value))
  );
}

function isBoundedStringArray(
  value: unknown,
  maximumItems: number,
  maximumItemLength: number,
): value is string[] {
  return (
    Array.isArray(value) &&
    value.length <= maximumItems &&
    value.every((item) => isBoundedString(item, maximumItemLength))
  );
}

function arraysEqual(actual: unknown, expected: readonly string[]): boolean {
  return (
    Array.isArray(actual) &&
    actual.length === expected.length &&
    actual.every((value, index) => value === expected[index])
  );
}
