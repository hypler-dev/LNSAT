import {
  canonicalizeUniversalPacket,
  hashUniversalPacket,
  validateUniversalPacket,
  type UniversalPacket,
} from "@lnsat/packets";
import { Pool, type PoolClient } from "pg";
import { parseLocalBetaPostgreSqlUrl } from "./local-control-plane-session.js";

export const LOCAL_PACKET_SUBMIT_CAPABILITY = "control_plane.packet.submit";
export const LOCAL_PACKET_INTAKE_STATUS = "local_only";

const packetIdPattern = /^pkt_[a-z0-9][a-z0-9_-]{7,63}$/;
const maxRequestBytes = 65_536;
const maxDepth = 12;
const maxNodes = 2_048;
const maxObjectKeys = 64;
const maxArrayItems = 128;
const maxKeyBytes = 128;
const maxStringBytes = 2_048;

export type LocalPacketIntakeAuth = {
  operatorId: string;
  sessionId: string;
};

export type LocalPacketIntakeRecord = {
  packetId: string;
  packetDigest: string;
  packetType: string;
  canonicalPacket: string;
  intakeStatus: "accepted";
  operatorId: string;
  authenticatedSessionId: string;
  acceptedAt: Date;
};

export type LocalPacketIntakePublicView = {
  packet_id: string;
  packet_digest: string;
  packet_type: string;
  intake_status: "accepted";
  operator_id: string;
  authenticated_session_id: string;
  accepted_at: string;
};

export interface LocalPacketIntakeRepository {
  put(record: Omit<LocalPacketIntakeRecord, "acceptedAt">): Promise<{
    created: boolean;
    record: LocalPacketIntakeRecord;
  }>;
  get(
    packetId: string,
    auth: LocalPacketIntakeAuth,
  ): Promise<LocalPacketIntakeRecord | null>;
  close(): Promise<void>;
}

export type LocalPacketIntakeFailureCode =
  | "packet_intake.invalid_request"
  | "packet_intake.request_too_large"
  | "packet_intake.invalid_packet"
  | "packet_intake.synthetic_required"
  | "packet_intake.authorization_changed"
  | "packet_intake.conflict"
  | "packet_intake.not_found";

type LocalPacketIntakeFailure = {
  ok: false;
  code: LocalPacketIntakeFailureCode;
};

export type LocalPacketIntakeSubmitResult =
  | {
      ok: true;
      created: boolean;
      packet: LocalPacketIntakePublicView;
    }
  | LocalPacketIntakeFailure;

export type LocalPacketIntakeReadResult =
  | {
      ok: true;
      packet: LocalPacketIntakePublicView;
    }
  | LocalPacketIntakeFailure;

export interface LocalControlPlanePacketIntakeService {
  submit(
    body: unknown,
    auth: LocalPacketIntakeAuth,
  ): Promise<LocalPacketIntakeSubmitResult>;
  read(
    packetId: unknown,
    auth: LocalPacketIntakeAuth,
  ): Promise<LocalPacketIntakeReadResult>;
}

export function createPostgreSqlLocalPacketIntakeRepository(
  connectionString: string,
): LocalPacketIntakeRepository {
  const config = parseLocalBetaPostgreSqlUrl(connectionString);
  const pool = new Pool({
    ...config,
    max: 4,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 5_000,
  });

  return {
    async put(record) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query(
          "SELECT pg_advisory_xact_lock(hashtextextended($1::text, 875))",
          [record.packetId],
        );
        await assertCurrentAuthorization(
          client,
          record.operatorId,
          record.authenticatedSessionId,
        );
        const existing = await selectRecord(client, record.packetId);
        if (existing !== null) {
          await client.query("COMMIT");
          return { created: false, record: existing };
        }
        const inserted = await client.query<LocalPacketIntakeRow>(
          `INSERT INTO local_packet_intakes (
             packet_id, packet_digest, packet_type, canonical_packet,
             intake_status, operator_id, authenticated_session_id
           ) VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7)
           RETURNING packet_id, packet_digest, packet_type, canonical_packet,
                     intake_status, operator_id, authenticated_session_id,
                     accepted_at`,
          [
            record.packetId,
            record.packetDigest,
            record.packetType,
            record.canonicalPacket,
            record.intakeStatus,
            record.operatorId,
            record.authenticatedSessionId,
          ],
        );
        const saved = await parseRow(inserted.rows[0]);
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
        await assertCurrentAuthorization(client, auth.operatorId, auth.sessionId);
        const result = await client.query<LocalPacketIntakeRow>(
          `SELECT packet_id, packet_digest, packet_type, canonical_packet,
                  intake_status, operator_id, authenticated_session_id, accepted_at
           FROM local_packet_intakes
           WHERE packet_id = $1 AND operator_id = $2`,
          [packetId, auth.operatorId],
        );
        const record =
          result.rows[0] === undefined ? null : await parseRow(result.rows[0]);
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

export function createLocalControlPlanePacketIntakeService(
  repository: LocalPacketIntakeRepository,
): LocalControlPlanePacketIntakeService {
  return {
    async submit(body, auth) {
      const bounded = inspectBoundedRequest(body);
      if (!bounded.ok) return bounded;
      const validation = validateUniversalPacket(bounded.packet);
      if (!validation.ok) return failure("packet_intake.invalid_packet");
      if (validation.packet.constraints.synthetic !== true) {
        return failure("packet_intake.synthetic_required");
      }
      const canonicalPacket = canonicalizeUniversalPacket(validation.packet);
      const packetDigest = await hashUniversalPacket(validation.packet);
      let saved: Awaited<ReturnType<LocalPacketIntakeRepository["put"]>>;
      try {
        saved = await repository.put({
          packetId: validation.packet.packet_id,
          packetDigest,
          packetType: validation.packet.packet_type,
          canonicalPacket,
          intakeStatus: "accepted",
          operatorId: auth.operatorId,
          authenticatedSessionId: auth.sessionId,
        });
      } catch (error) {
        if (error instanceof LocalPacketIntakeAuthorizationChangedError) {
          return failure("packet_intake.authorization_changed");
        }
        throw error;
      }
      if (
        saved.record.packetDigest !== packetDigest ||
        saved.record.operatorId !== auth.operatorId
      ) {
        return failure("packet_intake.conflict");
      }
      return {
        ok: true,
        created: saved.created,
        packet: publicView(saved.record),
      };
    },

    async read(packetId, auth) {
      if (typeof packetId !== "string" || !packetIdPattern.test(packetId)) {
        return failure("packet_intake.invalid_request");
      }
      let record: LocalPacketIntakeRecord | null;
      try {
        record = await repository.get(packetId, auth);
      } catch (error) {
        if (error instanceof LocalPacketIntakeAuthorizationChangedError) {
          return failure("packet_intake.authorization_changed");
        }
        throw error;
      }
      return record === null
        ? failure("packet_intake.not_found")
        : { ok: true, packet: publicView(record) };
    },
  };
}

type LocalPacketIntakeRow = {
  packet_id: string;
  packet_digest: string;
  packet_type: string;
  canonical_packet: unknown;
  intake_status: string;
  operator_id: string;
  authenticated_session_id: string;
  accepted_at: Date;
};

class LocalPacketIntakeAuthorizationChangedError extends Error {
  constructor() {
    super("Local packet intake authorization changed.");
    this.name = "LocalPacketIntakeAuthorizationChangedError";
  }
}

async function assertCurrentAuthorization(
  client: PoolClient,
  operatorId: string,
  sessionId: string,
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
       AND session.capability_snapshot @> '["control_plane.packet.submit"]'::jsonb
     FOR SHARE OF session, operator`,
    [sessionId, operatorId],
  );
  if (result.rowCount !== 1) {
    throw new LocalPacketIntakeAuthorizationChangedError();
  }
}

async function selectRecord(
  client: PoolClient,
  packetId: string,
): Promise<LocalPacketIntakeRecord | null> {
  const result = await client.query<LocalPacketIntakeRow>(
    `SELECT packet_id, packet_digest, packet_type, canonical_packet,
            intake_status, operator_id, authenticated_session_id, accepted_at
     FROM local_packet_intakes
     WHERE packet_id = $1`,
    [packetId],
  );
  return result.rows[0] === undefined ? null : await parseRow(result.rows[0]);
}

async function parseRow(
  row: LocalPacketIntakeRow | undefined,
): Promise<LocalPacketIntakeRecord> {
  if (
    row === undefined ||
    !packetIdPattern.test(row.packet_id) ||
    !/^sha256:[a-f0-9]{64}$/.test(row.packet_digest) ||
    row.intake_status !== "accepted" ||
    !(row.accepted_at instanceof Date) ||
    Number.isNaN(row.accepted_at.getTime())
  ) {
    throw new Error("Local packet intake storage is invalid.");
  }
  const stored = canonicalizeStoredPacket(row.canonical_packet);
  if ((await hashUniversalPacket(stored.packet)) !== row.packet_digest) {
    throw new Error("Local packet intake digest binding is invalid.");
  }
  return {
    packetId: row.packet_id,
    packetDigest: row.packet_digest,
    packetType: row.packet_type,
    canonicalPacket: stored.canonicalPacket,
    intakeStatus: "accepted",
    operatorId: row.operator_id,
    authenticatedSessionId: row.authenticated_session_id,
    acceptedAt: row.accepted_at,
  };
}

function canonicalizeStoredPacket(value: unknown): {
  packet: UniversalPacket;
  canonicalPacket: string;
} {
  const validation = validateUniversalPacket(value);
  if (!validation.ok || validation.packet.constraints.synthetic !== true) {
    throw new Error("Stored local packet intake is invalid.");
  }
  return {
    packet: validation.packet,
    canonicalPacket: canonicalizeUniversalPacket(validation.packet),
  };
}

function publicView(record: LocalPacketIntakeRecord): LocalPacketIntakePublicView {
  return {
    packet_id: record.packetId,
    packet_digest: record.packetDigest,
    packet_type: record.packetType,
    intake_status: record.intakeStatus,
    operator_id: record.operatorId,
    authenticated_session_id: record.authenticatedSessionId,
    accepted_at: record.acceptedAt.toISOString(),
  };
}

function inspectBoundedRequest(
  body: unknown,
): { ok: true; packet: unknown } | LocalPacketIntakeFailure {
  const state = { nodes: 0, seen: new Set<object>(), tooLarge: false };
  if (!inspectJsonValue(body, 0, state)) {
    return failure(
      state.tooLarge
        ? "packet_intake.request_too_large"
        : "packet_intake.invalid_request",
    );
  }
  if (!isPlainObject(body) || Object.keys(body).length !== 1 || !("packet" in body)) {
    return failure("packet_intake.invalid_request");
  }
  let serialized: string;
  try {
    serialized = JSON.stringify(body);
  } catch {
    return failure("packet_intake.invalid_request");
  }
  if (Buffer.byteLength(serialized, "utf8") > maxRequestBytes) {
    return failure("packet_intake.request_too_large");
  }
  return { ok: true, packet: body.packet };
}

function inspectJsonValue(
  value: unknown,
  depth: number,
  state: { nodes: number; seen: Set<object>; tooLarge: boolean },
): boolean {
  state.nodes += 1;
  if (state.nodes > maxNodes || depth > maxDepth) {
    state.tooLarge = true;
    return false;
  }
  if (value === null || typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value === "string") {
    if (Buffer.byteLength(value, "utf8") > maxStringBytes) state.tooLarge = true;
    return !state.tooLarge;
  }
  if (typeof value !== "object" || state.seen.has(value)) return false;
  state.seen.add(value);
  if (Array.isArray(value)) {
    if (value.length > maxArrayItems) {
      state.tooLarge = true;
      return false;
    }
    return value.every((item) => inspectJsonValue(item, depth + 1, state));
  }
  if (!isPlainObject(value)) return false;
  const ownKeys = Reflect.ownKeys(value);
  if (ownKeys.some((key) => typeof key !== "string")) return false;
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const keys = ownKeys as string[];
  if (keys.length > maxObjectKeys) {
    state.tooLarge = true;
    return false;
  }
  for (const key of keys) {
    if (Buffer.byteLength(key, "utf8") > maxKeyBytes) {
      state.tooLarge = true;
      return false;
    }
    const descriptor = descriptors[key];
    if (descriptor === undefined || !("value" in descriptor)) return false;
    if (!inspectJsonValue(descriptor.value, depth + 1, state)) return false;
  }
  return true;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

async function rollback(client: PoolClient): Promise<void> {
  try {
    await client.query("ROLLBACK");
  } catch {
    // Preserve the original storage failure.
  }
}

function failure(code: LocalPacketIntakeFailureCode): LocalPacketIntakeFailure {
  return { ok: false, code };
}
