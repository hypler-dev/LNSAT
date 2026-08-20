import { canonicalizeJsonValue, type JsonObject } from "./canonical.js";
import { hashPacketEnvelopeV1, type PacketEnvelopeV1 } from "./packet-envelope-v1.js";

export const EXECUTION_REQUEST_V1_STATUS = "contract_only";
export const EXECUTION_PROPOSAL_SCHEMA_V1_0 = "lnsat.execution_proposal.schema.v1_0";
export const EXECUTION_REQUEST_SCHEMA_V1_0 = "lnsat.execution_request.schema.v1_0";
export const EXECUTION_REQUEST_DERIVATION_PROFILE_V1 =
  "lnsat.execution_request.packet_embedded.v1";

const CONTRACT_VERSION_V1_0 = "lnsat.contracts.v1_0";
const PACKET_ENVELOPE_SCHEMA_V1_0 = "lnsat.packet_envelope.schema.v1_0";
const POLICY_DECISION_SCHEMA_V1_0 = "lnsat.policy_decision.schema.v1_0";
const APPROVAL_REQUEST_SCHEMA_V1_0 = "lnsat.approval_request.schema.v1_0";
const APPROVAL_DECISION_SCHEMA_V1_0 = "lnsat.approval_decision.schema.v1_0";
const ACTION_DIGEST_DOMAIN_V1 = "lnsat.execution-request.action.v1";
const TARGET_DIGEST_DOMAIN_V1 = "lnsat.execution-request.target.v1";

export type Sha256DigestV1 = `sha256:${string}`;

export type ExecutionActionV1 = {
  kind: string;
  arguments: JsonObject;
};

export type ExecutionTargetV1 = {
  resource_ref: string;
  identity: JsonObject;
};

export type ExecutionAdapterV1 = {
  ref: string;
  version: string;
};

export type ExecutionProposalV1 = {
  schema_id: typeof EXECUTION_PROPOSAL_SCHEMA_V1_0;
  derivation_profile: typeof EXECUTION_REQUEST_DERIVATION_PROFILE_V1;
  action: ExecutionActionV1;
  target: ExecutionTargetV1;
  configuration_digest: Sha256DigestV1;
  adapter: ExecutionAdapterV1;
  executable_digest: Sha256DigestV1;
  audience: string;
};

export type ExecutionRequestV1Input = {
  packet: PacketEnvelopeV1;
  packet_sha256: Sha256DigestV1;
  policy_decision_id: string;
  approval_request_id: string;
  approval_decision_id: string;
  requester_ref: string;
  requester_session_ref: string;
  approver_ref: string;
  approver_session_ref: string;
  prepared_at: string;
  expires_at: string;
};

/** Canonical post-approval request. This contract grants no authority itself. */
export type ExecutionRequestV1 = {
  contract_version: typeof CONTRACT_VERSION_V1_0;
  schema_id: typeof EXECUTION_REQUEST_SCHEMA_V1_0;
  derivation_profile: typeof EXECUTION_REQUEST_DERIVATION_PROFILE_V1;
  packet_ref: {
    schema_id: typeof PACKET_ENVELOPE_SCHEMA_V1_0;
    packet_id: string;
    packet_sha256: Sha256DigestV1;
  };
  policy_decision_ref: {
    schema_id: typeof POLICY_DECISION_SCHEMA_V1_0;
    decision_id: string;
  };
  approval_request_ref: {
    schema_id: typeof APPROVAL_REQUEST_SCHEMA_V1_0;
    approval_request_id: string;
  };
  approval_decision_ref: {
    schema_id: typeof APPROVAL_DECISION_SCHEMA_V1_0;
    approval_decision_id: string;
  };
  requester_ref: string;
  requester_session_ref: string;
  approver_ref: string;
  approver_session_ref: string;
  project_ref: string;
  resource_ref: string;
  action: ExecutionActionV1;
  target: ExecutionTargetV1;
  configuration_digest: Sha256DigestV1;
  adapter: ExecutionAdapterV1;
  executable_digest: Sha256DigestV1;
  audience: string;
  prepared_at: string;
  expires_at: string;
};

export type DerivedExecutionRequestV1 = {
  request: ExecutionRequestV1;
  canonical_request: string;
  request_digest: Sha256DigestV1;
  action_digest: Sha256DigestV1;
  target_digest: Sha256DigestV1;
  configuration_digest: Sha256DigestV1;
  executable_digest: Sha256DigestV1;
};

export type ExecutionRequestV1ErrorCode =
  | "execution_request.invalid_packet"
  | "execution_request.proposal_missing"
  | "execution_request.proposal_invalid"
  | "execution_request.chain_invalid"
  | "execution_request.time_invalid"
  | "execution_request.canonicalization_failed";

export class ExecutionRequestV1Error extends TypeError {
  readonly code: ExecutionRequestV1ErrorCode;

  constructor(code: ExecutionRequestV1ErrorCode) {
    super(code);
    this.name = "ExecutionRequestV1Error";
    this.code = code;
  }
}

/** Parses exact proposal embedded at `constraints.execution_proposal`. */
export function parseExecutionProposalV1(
  packet: PacketEnvelopeV1,
): ExecutionProposalV1 {
  if (!Object.hasOwn(packet.constraints, "execution_proposal")) {
    throw new ExecutionRequestV1Error("execution_request.proposal_missing");
  }

  const proposal = asObject(packet.constraints.execution_proposal);
  if (
    proposal === null ||
    !hasExactKeys(proposal, [
      "schema_id",
      "derivation_profile",
      "action",
      "target",
      "configuration_digest",
      "adapter",
      "executable_digest",
      "audience",
    ]) ||
    proposal.schema_id !== EXECUTION_PROPOSAL_SCHEMA_V1_0 ||
    proposal.derivation_profile !== EXECUTION_REQUEST_DERIVATION_PROFILE_V1
  ) {
    throw proposalInvalid();
  }

  const action = asObject(proposal.action);
  const target = asObject(proposal.target);
  const adapter = asObject(proposal.adapter);
  if (
    action === null ||
    !hasExactKeys(action, ["kind", "arguments"]) ||
    !isBoundedString(action.kind, 256) ||
    target === null ||
    !hasExactKeys(target, ["resource_ref", "identity"]) ||
    typeof target.resource_ref !== "string" ||
    !isValidReferenceV1(target.resource_ref) ||
    !packet.resource_refs.includes(target.resource_ref) ||
    adapter === null ||
    !hasExactKeys(adapter, ["ref", "version"]) ||
    typeof adapter.ref !== "string" ||
    !isValidReferenceV1(adapter.ref) ||
    adapter.ref.includes("@") ||
    !isAdapterVersion(adapter.version) ||
    adapter.ref.length + adapter.version.length + 1 > 256 ||
    !isLowercaseSha256(proposal.configuration_digest) ||
    !isLowercaseSha256(proposal.executable_digest) ||
    typeof proposal.audience !== "string" ||
    !isValidReferenceV1(proposal.audience)
  ) {
    throw proposalInvalid();
  }

  const argumentsValue = asObject(action.arguments);
  const identity = asObject(target.identity);
  if (
    argumentsValue === null ||
    identity === null ||
    !isCanonicalJsonObject(argumentsValue) ||
    !isCanonicalJsonObject(identity)
  ) {
    throw proposalInvalid();
  }

  let canonicalArguments: JsonObject;
  let canonicalIdentity: JsonObject;
  try {
    canonicalArguments = cloneCanonicalObject(argumentsValue);
    canonicalIdentity = cloneCanonicalObject(identity);
  } catch {
    throw proposalInvalid();
  }

  return {
    schema_id: EXECUTION_PROPOSAL_SCHEMA_V1_0,
    derivation_profile: EXECUTION_REQUEST_DERIVATION_PROFILE_V1,
    action: {
      kind: action.kind,
      arguments: canonicalArguments,
    },
    target: {
      resource_ref: target.resource_ref,
      identity: canonicalIdentity,
    },
    configuration_digest: proposal.configuration_digest,
    adapter: {
      ref: adapter.ref,
      version: adapter.version,
    },
    executable_digest: proposal.executable_digest,
    audience: proposal.audience,
  };
}

/**
 * Derives inert canonical request evidence from approved packet bytes and exact
 * persisted approval-chain identities. No execution authority is created.
 */
export async function deriveExecutionRequestV1(
  input: ExecutionRequestV1Input,
): Promise<DerivedExecutionRequestV1> {
  let calculatedPacketHash: string;
  try {
    calculatedPacketHash = await hashPacketEnvelopeV1(input.packet);
  } catch {
    throw new ExecutionRequestV1Error("execution_request.invalid_packet");
  }

  if (
    calculatedPacketHash !== input.packet_sha256 ||
    !isLowercaseSha256(input.packet_sha256) ||
    !/^pol_[0-9a-f]{64}$/u.test(input.policy_decision_id) ||
    !/^apr_[0-9a-f]{64}$/u.test(input.approval_request_id) ||
    !/^apd_[0-9a-f]{64}$/u.test(input.approval_decision_id) ||
    !isValidReferenceV1(input.requester_ref) ||
    !isValidReferenceV1(input.requester_session_ref) ||
    !isValidReferenceV1(input.approver_ref) ||
    !isValidReferenceV1(input.approver_session_ref)
  ) {
    throw new ExecutionRequestV1Error("execution_request.chain_invalid");
  }

  const preparedAt = canonicalUtcTimestampMillisV1(input.prepared_at);
  const expiresAt = canonicalUtcTimestampMillisV1(input.expires_at);
  if (preparedAt === null || expiresAt === null || preparedAt >= expiresAt) {
    throw new ExecutionRequestV1Error("execution_request.time_invalid");
  }

  const proposal = parseExecutionProposalV1(input.packet);
  const request: ExecutionRequestV1 = {
    contract_version: CONTRACT_VERSION_V1_0,
    schema_id: EXECUTION_REQUEST_SCHEMA_V1_0,
    derivation_profile: proposal.derivation_profile,
    packet_ref: {
      schema_id: PACKET_ENVELOPE_SCHEMA_V1_0,
      packet_id: input.packet.packet_id,
      packet_sha256: input.packet_sha256,
    },
    policy_decision_ref: {
      schema_id: POLICY_DECISION_SCHEMA_V1_0,
      decision_id: input.policy_decision_id,
    },
    approval_request_ref: {
      schema_id: APPROVAL_REQUEST_SCHEMA_V1_0,
      approval_request_id: input.approval_request_id,
    },
    approval_decision_ref: {
      schema_id: APPROVAL_DECISION_SCHEMA_V1_0,
      approval_decision_id: input.approval_decision_id,
    },
    requester_ref: input.requester_ref,
    requester_session_ref: input.requester_session_ref,
    approver_ref: input.approver_ref,
    approver_session_ref: input.approver_session_ref,
    project_ref: input.packet.project_ref,
    resource_ref: proposal.target.resource_ref,
    action: proposal.action,
    target: proposal.target,
    configuration_digest: proposal.configuration_digest,
    adapter: proposal.adapter,
    executable_digest: proposal.executable_digest,
    audience: proposal.audience,
    prepared_at: input.prepared_at,
    expires_at: input.expires_at,
  };

  let canonicalRequest: string;
  let requestDigest: Sha256DigestV1;
  let actionDigest: Sha256DigestV1;
  let targetDigest: Sha256DigestV1;
  try {
    canonicalRequest = canonicalizeJsonValue(request);
    [requestDigest, actionDigest, targetDigest] = await Promise.all([
      sha256Text(canonicalRequest),
      domainDigest(ACTION_DIGEST_DOMAIN_V1, request.action),
      domainDigest(TARGET_DIGEST_DOMAIN_V1, request.target),
    ]);
  } catch {
    throw new ExecutionRequestV1Error("execution_request.canonicalization_failed");
  }

  return {
    request,
    canonical_request: canonicalRequest,
    request_digest: requestDigest,
    action_digest: actionDigest,
    target_digest: targetDigest,
    configuration_digest: proposal.configuration_digest,
    executable_digest: proposal.executable_digest,
  };
}

function proposalInvalid(): ExecutionRequestV1Error {
  return new ExecutionRequestV1Error("execution_request.proposal_invalid");
}

function asObject(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }
  const prototype = Object.getPrototypeOf(value) as unknown;
  return prototype === Object.prototype || prototype === null
    ? (value as Record<string, unknown>)
    : null;
}

function hasExactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
): boolean {
  const keys = Object.keys(value);
  return (
    keys.length === expected.length &&
    expected.every((key) => Object.hasOwn(value, key))
  );
}

function isBoundedString(value: unknown, maximumUtf16Length: number): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= maximumUtf16Length &&
    isWellFormedUnicode(value) &&
    !/\p{Cc}/u.test(value)
  );
}

function isLowercaseSha256(value: unknown): value is Sha256DigestV1 {
  return typeof value === "string" && /^sha256:[0-9a-f]{64}$/u.test(value);
}

function isAdapterVersion(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length <= 128 &&
    /^[A-Za-z0-9](?:[A-Za-z0-9._-]*[A-Za-z0-9])?$/u.test(value)
  );
}

function isValidReferenceV1(value: string): boolean {
  const separator = value.indexOf(":");
  if (separator <= 0 || value.length > 256 || !isWellFormedUnicode(value)) {
    return false;
  }
  const scheme = value.slice(0, separator);
  const remainder = value.slice(separator + 1);
  return (
    /^[a-z][a-z0-9+.-]*$/u.test(scheme) &&
    remainder.length > 0 &&
    [...remainder].length <= 240 &&
    !/\p{White_Space}/u.test(remainder) &&
    !/[\u0000-\u001f\u007f]/u.test(remainder)
  );
}

function isCanonicalJsonObject(value: Record<string, unknown>): boolean {
  return Object.entries(value).every(
    ([key, item]) => isWellFormedUnicode(key) && isCanonicalJsonValue(item),
  );
}

function isCanonicalJsonValue(value: unknown): boolean {
  if (value === null || typeof value === "boolean") return true;
  if (typeof value === "string") return isWellFormedUnicode(value);
  if (typeof value === "number") {
    return Number.isSafeInteger(value) && !Object.is(value, -0);
  }
  if (Array.isArray(value)) return value.every(isCanonicalJsonValue);
  const object = asObject(value);
  return object !== null && isCanonicalJsonObject(object);
}

function cloneCanonicalObject(value: Record<string, unknown>): JsonObject {
  return JSON.parse(canonicalizeJsonValue(value)) as JsonObject;
}

function isWellFormedUnicode(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const unit = value.charCodeAt(index);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return false;
      index += 1;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) {
      return false;
    }
  }
  return true;
}

function canonicalUtcTimestampMillisV1(value: string): number | null {
  const match =
    /^(?!0000)(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?Z$/u.exec(
      value,
    );
  if (match === null) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  const fraction = match[7] ?? "";
  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > daysInMonth(year, month) ||
    hour > 23 ||
    minute > 59 ||
    second > 59
  ) {
    return null;
  }

  const priorYear = year - 1;
  const daysBeforeYear =
    priorYear * 365 +
    Math.floor(priorYear / 4) -
    Math.floor(priorYear / 100) +
    Math.floor(priorYear / 400);
  const daysBeforeMonth =
    [0, 0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334][month]! +
    (month > 2 && isLeapYear(year) ? 1 : 0);
  const completeDays = daysBeforeYear + daysBeforeMonth + day - 1;
  const millisecond = fraction.length === 0 ? 0 : Number(fraction.padEnd(3, "0"));
  return (
    (((completeDays * 24 + hour) * 60 + minute) * 60 + second) * 1_000 + millisecond
  );
}

function daysInMonth(year: number, month: number): number {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

async function domainDigest(
  domain: string,
  value: ExecutionActionV1 | ExecutionTargetV1,
): Promise<Sha256DigestV1> {
  const encoder = new (getTextEncoder())();
  const domainBytes = encoder.encode(domain);
  const canonicalBytes = encoder.encode(canonicalizeJsonValue(value));
  const length = Math.min(canonicalBytes.length, 0xffffffff);
  const input = new Uint8Array(domainBytes.length + 1 + 4 + canonicalBytes.length);
  input.set(domainBytes, 0);
  const lengthOffset = domainBytes.length + 1;
  input[lengthOffset] = (length >>> 24) & 0xff;
  input[lengthOffset + 1] = (length >>> 16) & 0xff;
  input[lengthOffset + 2] = (length >>> 8) & 0xff;
  input[lengthOffset + 3] = length & 0xff;
  input.set(canonicalBytes, lengthOffset + 4);
  return sha256Bytes(input);
}

async function sha256Text(value: string): Promise<Sha256DigestV1> {
  return sha256Bytes(new (getTextEncoder())().encode(value));
}

async function sha256Bytes(value: Uint8Array): Promise<Sha256DigestV1> {
  const digest = await getWebCrypto().subtle.digest("SHA-256", value);
  return `sha256:${bytesToHex(new Uint8Array(digest))}`;
}

type CryptoLike = {
  subtle: {
    digest(algorithm: "SHA-256", data: Uint8Array): Promise<ArrayBuffer>;
  };
};

type TextEncoderConstructorLike = new () => {
  encode(input: string): Uint8Array;
};

function getWebCrypto(): CryptoLike {
  const runtime = globalThis as unknown as { crypto?: CryptoLike };
  if (runtime.crypto === undefined) {
    throw new TypeError(
      "Execution request hashing requires Web Crypto SHA-256 support.",
    );
  }
  return runtime.crypto;
}

function getTextEncoder(): TextEncoderConstructorLike {
  const runtime = globalThis as unknown as {
    TextEncoder?: TextEncoderConstructorLike;
  };
  if (runtime.TextEncoder === undefined) {
    throw new TypeError("Execution request hashing requires TextEncoder support.");
  }
  return runtime.TextEncoder;
}

function bytesToHex(bytes: Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
