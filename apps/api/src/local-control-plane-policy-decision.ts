import {
  canonicalizeUniversalPacket,
  hashUniversalPacket,
  validateUniversalPacket,
  type UniversalPacket,
} from "@lnsat/packets";
import { decideUniversalPacketPolicy, type PolicyDecision } from "@lnsat/policy";
import { isDeepStrictEqual } from "node:util";
import { Pool, type PoolClient } from "pg";
import type { LocalPacketIntakeAuth } from "./local-control-plane-packet-intake.js";
import { parseLocalBetaPostgreSqlUrl } from "./local-control-plane-session.js";

export const LOCAL_PACKET_POLICY_EVALUATE_CAPABILITY =
  "control_plane.packet.policy.evaluate";
export const LOCAL_PACKET_POLICY_STATUS = "local_only";

const packetIdPattern = /^pkt_[a-z0-9][a-z0-9_-]{7,63}$/;
const digestPattern = /^sha256:[a-f0-9]{64}$/;

export type LocalPacketPolicyInput = {
  packetId: string;
  packetDigest: string;
  canonicalPacket: unknown;
  acceptedAt: Date;
};

export type LocalPacketPolicyDecisionRecord = {
  decisionId: string;
  packetId: string;
  packetDigest: string;
  decision: PolicyDecision;
  operatorId: string;
  authenticatedSessionId: string;
  policyCreatedAt: Date;
  evaluatedAt: Date;
  input: LocalPacketPolicyInput;
};

export type LocalPacketPolicyDecisionPublicView = {
  packet_id: string;
  packet_digest: string;
  policy_decision: PolicyDecision;
  operator_id: string;
  authenticated_session_id: string;
  evaluated_at: string;
};

export interface LocalPacketPolicyDecisionRepository {
  loadInput(
    packetId: string,
    auth: LocalPacketIntakeAuth,
  ): Promise<LocalPacketPolicyInput | null>;
  put(
    record: Omit<LocalPacketPolicyDecisionRecord, "evaluatedAt">,
    auth: LocalPacketIntakeAuth,
  ): Promise<{ created: boolean; record: LocalPacketPolicyDecisionRecord }>;
  get(
    packetId: string,
    auth: LocalPacketIntakeAuth,
  ): Promise<LocalPacketPolicyDecisionRecord | null>;
  close(): Promise<void>;
}

export type LocalPacketPolicyFailureCode =
  | "packet_policy.invalid_request"
  | "packet_policy.not_found"
  | "packet_policy.authorization_changed"
  | "packet_policy.conflict";

type LocalPacketPolicyFailure = {
  ok: false;
  code: LocalPacketPolicyFailureCode;
};

export type LocalPacketPolicyEvaluateResult =
  | {
      ok: true;
      created: boolean;
      policy: LocalPacketPolicyDecisionPublicView;
    }
  | LocalPacketPolicyFailure;

export type LocalPacketPolicyReadResult =
  | {
      ok: true;
      policy: LocalPacketPolicyDecisionPublicView;
    }
  | LocalPacketPolicyFailure;

export interface LocalControlPlanePolicyDecisionService {
  evaluate(
    packetId: unknown,
    body: unknown,
    auth: LocalPacketIntakeAuth,
  ): Promise<LocalPacketPolicyEvaluateResult>;
  read(
    packetId: unknown,
    auth: LocalPacketIntakeAuth,
  ): Promise<LocalPacketPolicyReadResult>;
}

export function createPostgreSqlLocalPacketPolicyDecisionRepository(
  connectionString: string,
): LocalPacketPolicyDecisionRepository {
  const config = parseLocalBetaPostgreSqlUrl(connectionString);
  const pool = new Pool({
    ...config,
    max: 4,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 5_000,
  });

  return {
    async loadInput(packetId, auth) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await assertCurrentPolicyAuthorization(client, auth);
        const input = await selectInput(client, packetId, auth.operatorId);
        await client.query("COMMIT");
        return input;
      } catch (error) {
        await rollback(client);
        throw error;
      } finally {
        client.release();
      }
    },

    async put(record, auth) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query(
          "SELECT pg_advisory_xact_lock(hashtextextended($1::text, 876))",
          [record.packetId],
        );
        await assertCurrentPolicyAuthorization(client, auth);
        const currentInput = await selectInput(
          client,
          record.packetId,
          auth.operatorId,
        );
        if (
          currentInput === null ||
          currentInput.packetDigest !== record.packetDigest
        ) {
          throw new LocalPacketPolicyConflictError();
        }
        const existing = await selectDecision(client, record.packetId);
        if (existing !== null) {
          await client.query("COMMIT");
          return { created: false, record: existing };
        }
        const inserted = await client.query<LocalPacketPolicyDecisionRow>(
          `INSERT INTO local_packet_policy_decisions (
             decision_id, packet_id, packet_digest, policy_decision,
             decision_kind, requires_approval, reason_codes, operator_id,
             authenticated_session_id, policy_created_at
           ) VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7::jsonb, $8, $9, $10)
           RETURNING decision_id, packet_id, packet_digest, policy_decision,
                     decision_kind, requires_approval, reason_codes, operator_id,
                     authenticated_session_id, policy_created_at, evaluated_at`,
          [
            record.decisionId,
            record.packetId,
            record.packetDigest,
            JSON.stringify(record.decision),
            record.decision.decision,
            record.decision.requires_approval,
            JSON.stringify(record.decision.reason_codes),
            record.operatorId,
            record.authenticatedSessionId,
            record.policyCreatedAt,
          ],
        );
        const saved = parseDecisionRow(inserted.rows[0], currentInput);
        await client.query("COMMIT");
        return { created: true, record: saved };
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
        await assertCurrentPolicyAuthorization(client, auth);
        const input = await selectInput(client, packetId, auth.operatorId);
        const record =
          input === null ? null : await selectDecision(client, packetId, input);
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

export function createLocalControlPlanePolicyDecisionService(
  repository: LocalPacketPolicyDecisionRepository,
): LocalControlPlanePolicyDecisionService {
  return {
    async evaluate(packetId, body, auth) {
      if (body !== undefined || !isPacketId(packetId)) {
        return failure("packet_policy.invalid_request");
      }
      let input: LocalPacketPolicyInput | null;
      try {
        input = await repository.loadInput(packetId, auth);
      } catch (error) {
        if (error instanceof LocalPacketPolicyAuthorizationChangedError) {
          return failure("packet_policy.authorization_changed");
        }
        throw error;
      }
      if (input === null) return failure("packet_policy.not_found");
      const packet = await verifyPolicyInput(input);
      if (packet === null) return failure("packet_policy.conflict");
      const decision = decideUniversalPacketPolicy(packet, { now: input.acceptedAt });
      let saved: Awaited<ReturnType<LocalPacketPolicyDecisionRepository["put"]>>;
      try {
        saved = await repository.put(
          {
            decisionId: decision.decision_id,
            packetId: input.packetId,
            packetDigest: input.packetDigest,
            decision,
            operatorId: auth.operatorId,
            authenticatedSessionId: auth.sessionId,
            policyCreatedAt: input.acceptedAt,
            input,
          },
          auth,
        );
      } catch (error) {
        if (error instanceof LocalPacketPolicyAuthorizationChangedError) {
          return failure("packet_policy.authorization_changed");
        }
        if (error instanceof LocalPacketPolicyConflictError) {
          return failure("packet_policy.conflict");
        }
        throw error;
      }
      return verifyDecisionRecord(saved.record, decision, auth)
        ? {
            ok: true,
            created: saved.created,
            policy: publicView(saved.record),
          }
        : failure("packet_policy.conflict");
    },

    async read(packetId, auth) {
      if (!isPacketId(packetId)) return failure("packet_policy.invalid_request");
      let record: LocalPacketPolicyDecisionRecord | null;
      try {
        record = await repository.get(packetId, auth);
      } catch (error) {
        if (error instanceof LocalPacketPolicyAuthorizationChangedError) {
          return failure("packet_policy.authorization_changed");
        }
        throw error;
      }
      if (record === null) return failure("packet_policy.not_found");
      const packet = await verifyPolicyInput(record.input);
      if (packet === null) return failure("packet_policy.conflict");
      const expected = decideUniversalPacketPolicy(packet, {
        now: record.input.acceptedAt,
      });
      return verifyDecisionRecord(record, expected, auth)
        ? { ok: true, policy: publicView(record) }
        : failure("packet_policy.conflict");
    },
  };
}

type LocalPacketPolicyDecisionRow = {
  decision_id: string;
  packet_id: string;
  packet_digest: string;
  policy_decision: unknown;
  decision_kind: string;
  requires_approval: boolean;
  reason_codes: unknown;
  operator_id: string;
  authenticated_session_id: string;
  policy_created_at: Date;
  evaluated_at: Date;
  canonical_packet?: unknown;
  accepted_at?: Date;
};

class LocalPacketPolicyAuthorizationChangedError extends Error {}
class LocalPacketPolicyConflictError extends Error {}

async function assertCurrentPolicyAuthorization(
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
       AND session.capability_snapshot @> '["control_plane.packet.policy.evaluate"]'::jsonb
     FOR SHARE OF session, operator`,
    [auth.sessionId, auth.operatorId],
  );
  if (result.rowCount !== 1) {
    throw new LocalPacketPolicyAuthorizationChangedError();
  }
}

async function selectInput(
  client: PoolClient,
  packetId: string,
  operatorId: string,
): Promise<LocalPacketPolicyInput | null> {
  const result = await client.query<{
    packet_id: string;
    packet_digest: string;
    canonical_packet: unknown;
    accepted_at: Date;
  }>(
    `SELECT packet_id, packet_digest, canonical_packet, accepted_at
     FROM local_packet_intakes
     WHERE packet_id = $1 AND operator_id = $2 AND intake_status = 'accepted'
     FOR SHARE`,
    [packetId, operatorId],
  );
  const row = result.rows[0];
  if (row === undefined) return null;
  if (
    !isPacketId(row.packet_id) ||
    !digestPattern.test(row.packet_digest) ||
    !(row.accepted_at instanceof Date) ||
    Number.isNaN(row.accepted_at.getTime())
  ) {
    throw new Error("Local packet policy input storage is invalid.");
  }
  return {
    packetId: row.packet_id,
    packetDigest: row.packet_digest,
    canonicalPacket: row.canonical_packet,
    acceptedAt: row.accepted_at,
  };
}

async function selectDecision(
  client: PoolClient,
  packetId: string,
  knownInput?: LocalPacketPolicyInput,
): Promise<LocalPacketPolicyDecisionRecord | null> {
  const result = await client.query<LocalPacketPolicyDecisionRow>(
    `SELECT decision.decision_id, decision.packet_id, decision.packet_digest,
            decision.policy_decision, decision.decision_kind,
            decision.requires_approval, decision.reason_codes,
            decision.operator_id, decision.authenticated_session_id,
            decision.policy_created_at, decision.evaluated_at,
            intake.canonical_packet, intake.accepted_at
     FROM local_packet_policy_decisions AS decision
     JOIN local_packet_intakes AS intake
       ON intake.packet_id = decision.packet_id
      AND intake.packet_digest = decision.packet_digest
     WHERE decision.packet_id = $1`,
    [packetId],
  );
  const row = result.rows[0];
  if (row === undefined) return null;
  const input =
    knownInput ??
    ({
      packetId: row.packet_id,
      packetDigest: row.packet_digest,
      canonicalPacket: row.canonical_packet,
      acceptedAt: row.accepted_at,
    } as LocalPacketPolicyInput);
  return parseDecisionRow(row, input);
}

function parseDecisionRow(
  row: LocalPacketPolicyDecisionRow | undefined,
  input: LocalPacketPolicyInput,
): LocalPacketPolicyDecisionRecord {
  if (
    row === undefined ||
    !isPacketId(row.packet_id) ||
    !digestPattern.test(row.packet_digest) ||
    typeof row.policy_decision !== "object" ||
    row.policy_decision === null ||
    !(row.policy_created_at instanceof Date) ||
    !(row.evaluated_at instanceof Date)
  ) {
    throw new Error("Local packet policy decision storage is invalid.");
  }
  return {
    decisionId: row.decision_id,
    packetId: row.packet_id,
    packetDigest: row.packet_digest,
    decision: row.policy_decision as PolicyDecision,
    operatorId: row.operator_id,
    authenticatedSessionId: row.authenticated_session_id,
    policyCreatedAt: row.policy_created_at,
    evaluatedAt: row.evaluated_at,
    input,
  };
}

async function verifyPolicyInput(
  input: LocalPacketPolicyInput,
): Promise<UniversalPacket | null> {
  const validation = validateUniversalPacket(input.canonicalPacket);
  if (!validation.ok || validation.packet.constraints.synthetic !== true) return null;
  if (canonicalizeUniversalPacket(validation.packet).length > 65_536) return null;
  return (await hashUniversalPacket(validation.packet)) === input.packetDigest
    ? validation.packet
    : null;
}

function verifyDecisionRecord(
  record: LocalPacketPolicyDecisionRecord,
  expected: PolicyDecision,
  auth: LocalPacketIntakeAuth,
): boolean {
  return (
    record.packetId === expected.packet_id &&
    record.packetDigest === record.input.packetDigest &&
    record.decisionId === expected.decision_id &&
    record.operatorId === auth.operatorId &&
    record.policyCreatedAt.getTime() === record.input.acceptedAt.getTime() &&
    isDeepStrictEqual(record.decision, expected)
  );
}

function publicView(
  record: LocalPacketPolicyDecisionRecord,
): LocalPacketPolicyDecisionPublicView {
  return {
    packet_id: record.packetId,
    packet_digest: record.packetDigest,
    policy_decision: record.decision,
    operator_id: record.operatorId,
    authenticated_session_id: record.authenticatedSessionId,
    evaluated_at: record.evaluatedAt.toISOString(),
  };
}

function isPacketId(value: unknown): value is string {
  return typeof value === "string" && packetIdPattern.test(value);
}

async function rollback(client: PoolClient): Promise<void> {
  try {
    await client.query("ROLLBACK");
  } catch {
    // Preserve the original storage failure.
  }
}

function failure(code: LocalPacketPolicyFailureCode): LocalPacketPolicyFailure {
  return { ok: false, code };
}
