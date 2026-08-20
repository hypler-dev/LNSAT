import { validateAuditLedgerRecord, type AuditLedgerRecord } from "./index.js";
import {
  POSTGRESQL_AUDIT_LEDGER_RECORD_DIGEST_ATTESTATION_CONTRACT_ID,
  type PostgreSqlAuditLedgerRecordDigestAttestation,
  type PostgreSqlAuditLedgerRecordDigestBinding,
  type PostgreSqlAuditLedgerRecordDigestVerificationResult,
  type PostgreSqlAuditLedgerRecordDigestVerifier,
} from "./postgresql-audit-ledger-writer.js";

export const AUDIT_LEDGER_RECORD_DIGEST_STATUS = "source_only";

export const AUDIT_LEDGER_RECORD_DIGEST_INVALID_RECORD_REASON =
  "audit_ledger_record_digest.invalid_record";
export const AUDIT_LEDGER_RECORD_DIGEST_BINDING_MISMATCH_REASON =
  "audit_ledger_record_digest.binding_mismatch";
export const AUDIT_LEDGER_RECORD_DIGEST_UNAVAILABLE_REASON =
  "audit_ledger_record_digest.unavailable";

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

type CryptoLike = {
  subtle: {
    digest(algorithm: "SHA-256", data: Uint8Array): Promise<ArrayBuffer>;
  };
};

type TextEncoderConstructorLike = new () => {
  encode(input: string): Uint8Array;
};

export function canonicalizeAuditLedgerRecord(record: AuditLedgerRecord): string {
  const snapshot = snapshotAuditLedgerRecord(record);
  const validation = validateAuditLedgerRecord(snapshot);
  if (!validation.ok) {
    throw new TypeError("Audit ledger record digest requires a valid record.");
  }

  return stringifyCanonicalJsonValue(snapshot as unknown as JsonValue);
}

export async function hashAuditLedgerRecord(
  record: AuditLedgerRecord,
): Promise<`sha256:${string}`> {
  return hashCanonicalAuditLedgerRecord(canonicalizeAuditLedgerRecord(record));
}

async function hashCanonicalAuditLedgerRecord(
  canonicalRecord: string,
): Promise<`sha256:${string}`> {
  const digest = await getWebCrypto().subtle.digest(
    "SHA-256",
    new (getTextEncoder())().encode(canonicalRecord),
  );
  return `sha256:${bytesToHex(new Uint8Array(digest))}`;
}

export function createPostgreSqlAuditLedgerRecordDigestVerifier(): PostgreSqlAuditLedgerRecordDigestVerifier {
  return verifyPostgreSqlAuditLedgerRecordDigest;
}

export async function verifyPostgreSqlAuditLedgerRecordDigest(
  record: AuditLedgerRecord,
  expected: PostgreSqlAuditLedgerRecordDigestBinding,
): Promise<PostgreSqlAuditLedgerRecordDigestVerificationResult> {
  let recordSnapshot: AuditLedgerRecord;
  try {
    recordSnapshot = snapshotAuditLedgerRecord(record);
  } catch {
    return {
      verified: false,
      reason_code: AUDIT_LEDGER_RECORD_DIGEST_INVALID_RECORD_REASON,
    };
  }

  let validation: ReturnType<typeof validateAuditLedgerRecord>;
  try {
    validation = validateAuditLedgerRecord(recordSnapshot);
  } catch {
    return {
      verified: false,
      reason_code: AUDIT_LEDGER_RECORD_DIGEST_INVALID_RECORD_REASON,
    };
  }
  if (!validation.ok) {
    return {
      verified: false,
      reason_code: AUDIT_LEDGER_RECORD_DIGEST_INVALID_RECORD_REASON,
    };
  }

  let bindingSnapshot: PostgreSqlAuditLedgerRecordDigestBinding | null = null;
  let bindingMatched = false;
  try {
    bindingSnapshot = snapshotBinding(expected);
    bindingMatched =
      bindingSnapshot !== null &&
      bindingReferencesRecord(bindingSnapshot, validation.record);
  } catch {
    // Hostile accessors and proxy traps fail closed below.
  }
  if (!bindingMatched || bindingSnapshot === null) {
    return {
      verified: false,
      reason_code: AUDIT_LEDGER_RECORD_DIGEST_BINDING_MISMATCH_REASON,
    };
  }

  let canonicalRecord: string;
  try {
    canonicalRecord = stringifyCanonicalJsonValue(
      recordSnapshot as unknown as JsonValue,
    );
  } catch {
    return {
      verified: false,
      reason_code: AUDIT_LEDGER_RECORD_DIGEST_INVALID_RECORD_REASON,
    };
  }

  try {
    const canonicalRecordDigest = await hashCanonicalAuditLedgerRecord(canonicalRecord);
    if (canonicalRecordDigest !== bindingSnapshot.canonical_record_digest) {
      return {
        verified: false,
        reason_code: AUDIT_LEDGER_RECORD_DIGEST_BINDING_MISMATCH_REASON,
      };
    }

    const attestation: PostgreSqlAuditLedgerRecordDigestAttestation = {
      contract_id: POSTGRESQL_AUDIT_LEDGER_RECORD_DIGEST_ATTESTATION_CONTRACT_ID,
      verification_status: "verified",
      binding_status: "matched",
      ledger_record_id: bindingSnapshot.ledger_record_id,
      event_id: bindingSnapshot.event_id,
      idempotency_key: bindingSnapshot.idempotency_key,
      canonical_record_digest: bindingSnapshot.canonical_record_digest,
    };
    return { verified: true, attestation };
  } catch {
    return {
      verified: false,
      reason_code: AUDIT_LEDGER_RECORD_DIGEST_UNAVAILABLE_REASON,
    };
  }
}

function toStrictJsonValue(value: unknown): JsonValue {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new TypeError("Audit ledger record contains a non-finite number.");
    }
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => toStrictJsonValue(item));
  }
  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, toStrictJsonValue(item)]),
    );
  }
  throw new TypeError("Audit ledger record contains an unsupported value.");
}

function snapshotAuditLedgerRecord(value: unknown): AuditLedgerRecord {
  const snapshot = toStrictJsonValue(value);
  if (typeof snapshot !== "object" || snapshot === null || Array.isArray(snapshot)) {
    throw new TypeError("Audit ledger record must be a plain JSON object.");
  }
  deepFreezeJsonValue(snapshot);
  return snapshot as unknown as AuditLedgerRecord;
}

function deepFreezeJsonValue(value: JsonValue): void {
  if (value === null || typeof value !== "object") return;
  if (Array.isArray(value)) {
    for (const item of value) deepFreezeJsonValue(item);
  } else {
    for (const item of Object.values(value)) deepFreezeJsonValue(item);
  }
  Object.freeze(value);
}

function stringifyCanonicalJsonValue(value: JsonValue): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((item) => stringifyCanonicalJsonValue(item)).join(",")}]`;
  }
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stringifyCanonicalJsonValue(value[key]!)}`)
    .join(",")}}`;
}

function snapshotBinding(
  value: unknown,
): PostgreSqlAuditLedgerRecordDigestBinding | null {
  if (!isPlainObject(value)) return null;
  const keys = Object.keys(value);
  if (
    keys.length !== 4 ||
    !keys.every((key) =>
      [
        "ledger_record_id",
        "event_id",
        "idempotency_key",
        "canonical_record_digest",
      ].includes(key),
    )
  ) {
    return null;
  }

  const ledgerRecordId = value.ledger_record_id;
  const eventId = value.event_id;
  const idempotencyKey = value.idempotency_key;
  const canonicalRecordDigest = value.canonical_record_digest;
  if (
    typeof ledgerRecordId !== "string" ||
    typeof eventId !== "string" ||
    typeof idempotencyKey !== "string" ||
    typeof canonicalRecordDigest !== "string" ||
    !/^sha256:[a-f0-9]{64}$/.test(canonicalRecordDigest)
  ) {
    return null;
  }

  return Object.freeze({
    ledger_record_id: ledgerRecordId,
    event_id: eventId,
    idempotency_key: idempotencyKey,
    canonical_record_digest: canonicalRecordDigest,
  });
}

function bindingReferencesRecord(
  binding: PostgreSqlAuditLedgerRecordDigestBinding,
  record: AuditLedgerRecord,
): boolean {
  return (
    binding.ledger_record_id === record.ledger_record_id &&
    binding.event_id === record.event_id &&
    binding.idempotency_key === record.idempotency_key
  );
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function getWebCrypto(): CryptoLike {
  const runtime = globalThis as unknown as { crypto?: CryptoLike };
  if (runtime.crypto === undefined) {
    throw new TypeError("Audit ledger record digest requires Web Crypto SHA-256.");
  }
  return runtime.crypto;
}

function getTextEncoder(): TextEncoderConstructorLike {
  const runtime = globalThis as unknown as {
    TextEncoder?: TextEncoderConstructorLike;
  };
  if (runtime.TextEncoder === undefined) {
    throw new TypeError("Audit ledger record digest requires TextEncoder.");
  }
  return runtime.TextEncoder;
}

function bytesToHex(bytes: Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
