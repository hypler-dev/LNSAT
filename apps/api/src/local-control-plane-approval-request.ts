import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { Pool, type PoolClient } from "pg";
import type { LocalPacketIntakeAuth } from "./local-control-plane-packet-intake.js";
import { parseLocalBetaPostgreSqlUrl } from "./local-control-plane-session.js";

export const LOCAL_PACKET_APPROVAL_REQUEST_CAPABILITY =
  "control_plane.packet.approval.request";
export const LOCAL_PACKET_APPROVAL_REQUEST_STATUS = "local_only";
export const LOCAL_PACKET_APPROVAL_REQUEST_ACTION = "packet.approve";

const packetIdPattern = /^pkt_[a-z0-9][a-z0-9_-]{7,63}$/;
const digestPattern = /^sha256:[a-f0-9]{64}$/;
const decisionIdPattern = /^pol_[a-z0-9][a-z0-9_-]{7,95}$/;
const reasonCodePattern = /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/;

export type LocalPacketApprovalRequestBody = {
  packet_digest: string;
  policy_decision_id: string;
  requested_action: typeof LOCAL_PACKET_APPROVAL_REQUEST_ACTION;
  reason_codes: string[];
};

export type LocalPacketApprovalRequestRecord = {
  approvalRequestId: string;
  packetId: string;
  packetDigest: string;
  policyDecisionId: string;
  requestStatus: "pending";
  requestedAction: typeof LOCAL_PACKET_APPROVAL_REQUEST_ACTION;
  reasonCodes: string[];
  operatorId: string;
  authenticatedSessionId: string;
  requestedAt: Date;
};

export type LocalPacketApprovalRequestPublicView = {
  approval_request_id: string;
  packet_id: string;
  packet_digest: string;
  policy_decision_id: string;
  request_status: "pending";
  requested_action: typeof LOCAL_PACKET_APPROVAL_REQUEST_ACTION;
  reason_codes: string[];
  operator_id: string;
  authenticated_session_id: string;
  requested_at: string;
};

type ApprovalRequestCreate = Omit<LocalPacketApprovalRequestRecord, "requestedAt">;

export type LocalPacketApprovalRepositoryPutResult =
  | {
      outcome: "created" | "existing";
      record: LocalPacketApprovalRequestRecord;
    }
  | { outcome: "not_found" }
  | { outcome: "not_reviewable" }
  | { outcome: "conflict" };

export interface LocalPacketApprovalRequestRepository {
  put(
    record: ApprovalRequestCreate,
    auth: LocalPacketIntakeAuth,
  ): Promise<LocalPacketApprovalRepositoryPutResult>;
  get(
    packetId: string,
    auth: LocalPacketIntakeAuth,
  ): Promise<LocalPacketApprovalRequestRecord | null>;
  close(): Promise<void>;
}

export type LocalPacketApprovalRequestFailureCode =
  | "approval_request.invalid_request"
  | "approval_request.not_found"
  | "approval_request.not_reviewable"
  | "approval_request.authorization_changed"
  | "approval_request.conflict";

type LocalPacketApprovalRequestFailure = {
  ok: false;
  code: LocalPacketApprovalRequestFailureCode;
};

export type LocalPacketApprovalRequestCreateResult =
  | {
      ok: true;
      created: boolean;
      approval_request: LocalPacketApprovalRequestPublicView;
    }
  | LocalPacketApprovalRequestFailure;

export type LocalPacketApprovalRequestReadResult =
  | {
      ok: true;
      approval_request: LocalPacketApprovalRequestPublicView;
    }
  | LocalPacketApprovalRequestFailure;

export interface LocalControlPlaneApprovalRequestService {
  create(
    packetId: unknown,
    body: unknown,
    auth: LocalPacketIntakeAuth,
  ): Promise<LocalPacketApprovalRequestCreateResult>;
  read(
    packetId: unknown,
    auth: LocalPacketIntakeAuth,
  ): Promise<LocalPacketApprovalRequestReadResult>;
}

export function createPostgreSqlLocalPacketApprovalRequestRepository(
  connectionString: string,
): LocalPacketApprovalRequestRepository {
  const pool = new Pool({
    ...parseLocalBetaPostgreSqlUrl(connectionString),
    max: 4,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 5_000,
  });

  return {
    async put(record, auth) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query(
          "SELECT pg_advisory_xact_lock(hashtextextended($1::text, 877))",
          [record.packetId],
        );
        await assertCurrentApprovalAuthorization(client, auth);
        const policy = await selectReviewablePolicy(
          client,
          record.packetId,
          auth.operatorId,
        );
        if (policy === null) {
          await client.query("COMMIT");
          return { outcome: "not_found" };
        }
        if (policy.decisionKind !== "approval_required" || !policy.requiresApproval) {
          await client.query("COMMIT");
          return { outcome: "not_reviewable" };
        }
        if (
          policy.packetDigest !== record.packetDigest ||
          policy.policyDecisionId !== record.policyDecisionId ||
          !isDeepStrictEqual(policy.reasonCodes, record.reasonCodes)
        ) {
          await client.query("COMMIT");
          return { outcome: "conflict" };
        }
        const existing = await selectRequest(client, record.packetId);
        if (existing !== null) {
          await client.query("COMMIT");
          return { outcome: "existing", record: existing };
        }
        const inserted = await client.query<LocalPacketApprovalRequestRow>(
          `INSERT INTO local_packet_approval_requests (
             approval_request_id, packet_id, packet_digest, policy_decision_id,
             request_status, requested_action, reason_codes, operator_id,
             authenticated_session_id
           ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9)
           RETURNING approval_request_id, packet_id, packet_digest,
                     policy_decision_id, request_status, requested_action,
                     reason_codes, operator_id, authenticated_session_id,
                     requested_at`,
          [
            record.approvalRequestId,
            record.packetId,
            record.packetDigest,
            record.policyDecisionId,
            record.requestStatus,
            record.requestedAction,
            JSON.stringify(record.reasonCodes),
            record.operatorId,
            record.authenticatedSessionId,
          ],
        );
        const saved = parseRequestRow(inserted.rows[0]);
        await client.query("COMMIT");
        return { outcome: "created", record: saved };
      } catch (error) {
        await rollback(client);
        throw error;
      } finally {
        client.release();
      }
    },

    async get(packetId, auth) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await assertCurrentApprovalAuthorization(client, auth);
        const record = await selectRequest(client, packetId, auth.operatorId);
        await client.query("COMMIT");
        return record;
      } catch (error) {
        await rollback(client);
        throw error;
      } finally {
        client.release();
      }
    },

    async close() {
      await pool.end();
    },
  };
}

export function createLocalControlPlaneApprovalRequestService(
  repository: LocalPacketApprovalRequestRepository,
): LocalControlPlaneApprovalRequestService {
  return {
    async create(packetId, body, auth) {
      if (!isPacketId(packetId)) {
        return failure("approval_request.invalid_request");
      }
      const parsed = parseRequestBody(body);
      if (parsed === null) return failure("approval_request.invalid_request");
      const record: ApprovalRequestCreate = {
        approvalRequestId: approvalRequestId(packetId, parsed, auth),
        packetId,
        packetDigest: parsed.packet_digest,
        policyDecisionId: parsed.policy_decision_id,
        requestStatus: "pending",
        requestedAction: parsed.requested_action,
        reasonCodes: parsed.reason_codes,
        operatorId: auth.operatorId,
        authenticatedSessionId: auth.sessionId,
      };
      let saved: LocalPacketApprovalRepositoryPutResult;
      try {
        saved = await repository.put(record, auth);
      } catch (error) {
        if (error instanceof LocalPacketApprovalAuthorizationChangedError) {
          return failure("approval_request.authorization_changed");
        }
        throw error;
      }
      if (saved.outcome === "not_found") {
        return failure("approval_request.not_found");
      }
      if (saved.outcome === "not_reviewable") {
        return failure("approval_request.not_reviewable");
      }
      if (saved.outcome === "conflict") {
        return failure("approval_request.conflict");
      }
      if (!verifyRequestRecord(saved.record, record)) {
        return failure("approval_request.conflict");
      }
      return {
        ok: true,
        created: saved.outcome === "created",
        approval_request: publicView(saved.record),
      };
    },

    async read(packetId, auth) {
      if (!isPacketId(packetId)) {
        return failure("approval_request.invalid_request");
      }
      let record: LocalPacketApprovalRequestRecord | null;
      try {
        record = await repository.get(packetId, auth);
      } catch (error) {
        if (error instanceof LocalPacketApprovalAuthorizationChangedError) {
          return failure("approval_request.authorization_changed");
        }
        throw error;
      }
      if (record === null) return failure("approval_request.not_found");
      if (
        record.packetId !== packetId ||
        record.operatorId !== auth.operatorId ||
        record.requestStatus !== "pending" ||
        record.requestedAction !== LOCAL_PACKET_APPROVAL_REQUEST_ACTION ||
        !isReasonCodes(record.reasonCodes)
      ) {
        return failure("approval_request.conflict");
      }
      return { ok: true, approval_request: publicView(record) };
    },
  };
}

type LocalPacketApprovalRequestRow = {
  approval_request_id: string;
  packet_id: string;
  packet_digest: string;
  policy_decision_id: string;
  request_status: string;
  requested_action: string;
  reason_codes: unknown;
  operator_id: string;
  authenticated_session_id: string;
  requested_at: Date;
};

type ReviewablePolicy = {
  packetDigest: string;
  policyDecisionId: string;
  decisionKind: string;
  requiresApproval: boolean;
  reasonCodes: string[];
};

export class LocalPacketApprovalAuthorizationChangedError extends Error {}

async function assertCurrentApprovalAuthorization(
  client: PoolClient,
  auth: LocalPacketIntakeAuth,
): Promise<void> {
  const result = await client.query(
    `SELECT 1
     FROM local_sessions AS session
     JOIN local_operators AS operator
       ON operator.operator_id = session.operator_id
     WHERE session.session_id = $1
       AND session.operator_id = $2
       AND operator.disabled_at IS NULL
       AND session.revoked_at IS NULL
       AND statement_timestamp() >= session.issued_at
       AND statement_timestamp() < session.expires_at
       AND session.capability_snapshot @> '["control_plane.packet.approval.request"]'::jsonb
     FOR SHARE OF session, operator`,
    [auth.sessionId, auth.operatorId],
  );
  if (result.rowCount !== 1) {
    throw new LocalPacketApprovalAuthorizationChangedError();
  }
}

async function selectReviewablePolicy(
  client: PoolClient,
  packetId: string,
  operatorId: string,
): Promise<ReviewablePolicy | null> {
  const result = await client.query<{
    packet_digest: string;
    decision_id: string;
    decision_kind: string;
    requires_approval: boolean;
    reason_codes: unknown;
  }>(
    `SELECT intake.packet_digest, decision.decision_id,
            decision.decision_kind, decision.requires_approval,
            decision.reason_codes
     FROM local_packet_intakes AS intake
     JOIN local_packet_policy_decisions AS decision
       ON decision.packet_id = intake.packet_id
      AND decision.packet_digest = intake.packet_digest
     WHERE intake.packet_id = $1
       AND intake.operator_id = $2
       AND decision.operator_id = $2
       AND intake.intake_status = 'accepted'
     FOR SHARE OF intake, decision`,
    [packetId, operatorId],
  );
  const row = result.rows[0];
  if (row === undefined) return null;
  if (
    !digestPattern.test(row.packet_digest) ||
    !decisionIdPattern.test(row.decision_id) ||
    !isReasonCodes(row.reason_codes)
  ) {
    throw new Error("Local packet approval policy storage is invalid.");
  }
  return {
    packetDigest: row.packet_digest,
    policyDecisionId: row.decision_id,
    decisionKind: row.decision_kind,
    requiresApproval: row.requires_approval,
    reasonCodes: row.reason_codes,
  };
}

async function selectRequest(
  client: PoolClient,
  packetId: string,
  operatorId?: string,
): Promise<LocalPacketApprovalRequestRecord | null> {
  const values: string[] = [packetId];
  const ownerClause = operatorId === undefined ? "" : " AND operator_id = $2";
  if (operatorId !== undefined) values.push(operatorId);
  const result = await client.query<LocalPacketApprovalRequestRow>(
    `SELECT approval_request_id, packet_id, packet_digest,
            policy_decision_id, request_status, requested_action,
            reason_codes, operator_id, authenticated_session_id,
            requested_at
     FROM local_packet_approval_requests
     WHERE packet_id = $1${ownerClause}`,
    values,
  );
  return result.rows[0] === undefined ? null : parseRequestRow(result.rows[0]);
}

function parseRequestRow(
  row: LocalPacketApprovalRequestRow | undefined,
): LocalPacketApprovalRequestRecord {
  if (
    row === undefined ||
    !/^apr_[a-f0-9]{32}$/.test(row.approval_request_id) ||
    !isPacketId(row.packet_id) ||
    !digestPattern.test(row.packet_digest) ||
    !decisionIdPattern.test(row.policy_decision_id) ||
    row.request_status !== "pending" ||
    row.requested_action !== LOCAL_PACKET_APPROVAL_REQUEST_ACTION ||
    !isReasonCodes(row.reason_codes) ||
    !(row.requested_at instanceof Date) ||
    Number.isNaN(row.requested_at.getTime())
  ) {
    throw new Error("Local packet approval request storage is invalid.");
  }
  return {
    approvalRequestId: row.approval_request_id,
    packetId: row.packet_id,
    packetDigest: row.packet_digest,
    policyDecisionId: row.policy_decision_id,
    requestStatus: "pending",
    requestedAction: LOCAL_PACKET_APPROVAL_REQUEST_ACTION,
    reasonCodes: row.reason_codes,
    operatorId: row.operator_id,
    authenticatedSessionId: row.authenticated_session_id,
    requestedAt: row.requested_at,
  };
}

function parseRequestBody(body: unknown): LocalPacketApprovalRequestBody | null {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return null;
  }
  const keys = Object.keys(body).sort();
  if (
    !isDeepStrictEqual(keys, [
      "packet_digest",
      "policy_decision_id",
      "reason_codes",
      "requested_action",
    ])
  ) {
    return null;
  }
  const candidate = body as Record<string, unknown>;
  if (
    typeof candidate.packet_digest !== "string" ||
    !digestPattern.test(candidate.packet_digest) ||
    typeof candidate.policy_decision_id !== "string" ||
    !decisionIdPattern.test(candidate.policy_decision_id) ||
    candidate.requested_action !== LOCAL_PACKET_APPROVAL_REQUEST_ACTION ||
    !isReasonCodes(candidate.reason_codes)
  ) {
    return null;
  }
  return {
    packet_digest: candidate.packet_digest,
    policy_decision_id: candidate.policy_decision_id,
    requested_action: LOCAL_PACKET_APPROVAL_REQUEST_ACTION,
    reason_codes: candidate.reason_codes,
  };
}

function isReasonCodes(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.length >= 1 &&
    value.length <= 16 &&
    value.every(
      (code) =>
        typeof code === "string" && code.length <= 96 && reasonCodePattern.test(code),
    ) &&
    new Set(value).size === value.length
  );
}

function approvalRequestId(
  packetId: string,
  body: LocalPacketApprovalRequestBody,
  auth: LocalPacketIntakeAuth,
): string {
  const digest = createHash("sha256")
    .update(
      JSON.stringify({
        packet_id: packetId,
        packet_digest: body.packet_digest,
        policy_decision_id: body.policy_decision_id,
        requested_action: body.requested_action,
        reason_codes: body.reason_codes,
        operator_id: auth.operatorId,
        authenticated_session_id: auth.sessionId,
      }),
    )
    .digest("hex")
    .slice(0, 32);
  return `apr_${digest}`;
}

function verifyRequestRecord(
  actual: LocalPacketApprovalRequestRecord,
  expected: ApprovalRequestCreate,
): boolean {
  return (
    actual.approvalRequestId === expected.approvalRequestId &&
    actual.packetId === expected.packetId &&
    actual.packetDigest === expected.packetDigest &&
    actual.policyDecisionId === expected.policyDecisionId &&
    actual.requestStatus === expected.requestStatus &&
    actual.requestedAction === expected.requestedAction &&
    isDeepStrictEqual(actual.reasonCodes, expected.reasonCodes) &&
    actual.operatorId === expected.operatorId &&
    actual.authenticatedSessionId === expected.authenticatedSessionId
  );
}

function publicView(
  record: LocalPacketApprovalRequestRecord,
): LocalPacketApprovalRequestPublicView {
  return {
    approval_request_id: record.approvalRequestId,
    packet_id: record.packetId,
    packet_digest: record.packetDigest,
    policy_decision_id: record.policyDecisionId,
    request_status: record.requestStatus,
    requested_action: record.requestedAction,
    reason_codes: record.reasonCodes,
    operator_id: record.operatorId,
    authenticated_session_id: record.authenticatedSessionId,
    requested_at: record.requestedAt.toISOString(),
  };
}

function isPacketId(value: unknown): value is string {
  return typeof value === "string" && packetIdPattern.test(value);
}

async function rollback(client: PoolClient): Promise<void> {
  try {
    await client.query("ROLLBACK");
  } catch {
    // Preserve original storage failure.
  }
}

function failure(
  code: LocalPacketApprovalRequestFailureCode,
): LocalPacketApprovalRequestFailure {
  return { ok: false, code };
}
