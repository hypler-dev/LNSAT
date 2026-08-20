import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { Pool } from "pg";

export const LOCAL_OPERATOR_ID = "operator.local.synthetic";
export const LOCAL_OPERATOR_CAPABILITY = "control_plane.operator";
export const LOCAL_SESSION_COOKIE = "lnsat_local_session";
export const LOCAL_SESSION_PROOF_HEADER = "x-lnsat-local-session-proof";

const credentialPattern = /^[A-Za-z0-9_-]{43}$/;
const sessionIdPattern = /^ses_[a-f0-9]{32}$/;
const sessionTokenPattern = /^(ses_[a-f0-9]{32})\.([A-Za-z0-9_-]{43})$/;
const capabilityPattern = /^[a-z][a-z0-9._:-]{2,95}$/;

export type LocalOperatorRecord = {
  operatorId: string;
  credentialDigest: string;
  capabilities: string[];
  disabledAt: Date | null;
};

export type LocalSessionRecord = {
  sessionId: string;
  operatorId: string;
  tokenDigest: string;
  proofDigest: string;
  capabilities: string[];
  issuedAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
};

export interface LocalSessionRepository {
  getOperator(operatorId: string): Promise<LocalOperatorRecord | null>;
  createSession(record: LocalSessionRecord): Promise<void>;
  getSession(sessionId: string): Promise<LocalSessionRecord | null>;
  revokeSession(sessionId: string, revokedAt: Date): Promise<boolean>;
  close(): Promise<void>;
}

export type LocalSessionPublicView = {
  session_id: string;
  operator_id: string;
  capabilities: string[];
  issued_at: string;
  expires_at: string;
  revoked_at: string | null;
};

export type LocalSessionFailureCode =
  | "local_auth.invalid_credential"
  | "local_auth.invalid_session"
  | "local_auth.expired_session"
  | "local_auth.revoked_session"
  | "local_auth.capability_denied"
  | "local_auth.invalid_ttl";

type LocalSessionFailure = {
  ok: false;
  code: LocalSessionFailureCode;
};

export type LocalSessionIssueResult =
  | {
      ok: true;
      session: LocalSessionPublicView;
      rawToken: string;
      rawClientProof: string;
      maxAgeSeconds: number;
    }
  | LocalSessionFailure;

export type LocalSessionVerifyResult =
  | {
      ok: true;
      session: LocalSessionPublicView;
    }
  | LocalSessionFailure;

export interface LocalControlPlaneSessionService {
  issue(credential: string, ttlSeconds?: number): Promise<LocalSessionIssueResult>;
  verify(token: string, clientProof: string): Promise<LocalSessionVerifyResult>;
  authorize(
    token: string,
    clientProof: string,
    capability: string,
  ): Promise<LocalSessionVerifyResult>;
  revoke(token: string, clientProof: string): Promise<LocalSessionVerifyResult>;
}

export type LocalControlPlaneSessionServiceOptions = {
  now?: () => Date;
  random?: (size: number) => Uint8Array;
};

export function createPostgreSqlLocalSessionRepository(
  connectionString: string,
): LocalSessionRepository {
  const config = parseLocalBetaPostgreSqlUrl(connectionString);
  const pool = new Pool({
    ...config,
    max: 4,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 5_000,
  });

  return {
    async getOperator(operatorId) {
      const result = await pool.query<{
        operator_id: string;
        credential_digest: string;
        capabilities: unknown;
        disabled_at: Date | null;
      }>(
        `SELECT operator_id, credential_digest, capabilities, disabled_at
         FROM local_operators
         WHERE operator_id = $1`,
        [operatorId],
      );
      const row = result.rows[0];
      if (row === undefined) return null;
      return {
        operatorId: row.operator_id,
        credentialDigest: row.credential_digest,
        capabilities: parseCapabilities(row.capabilities),
        disabledAt: row.disabled_at,
      };
    },

    async createSession(record) {
      await pool.query(
        `INSERT INTO local_sessions (
           session_id, operator_id, token_digest, proof_digest,
           capability_snapshot, issued_at, expires_at, revoked_at
         ) VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8)`,
        [
          record.sessionId,
          record.operatorId,
          record.tokenDigest,
          record.proofDigest,
          JSON.stringify(record.capabilities),
          record.issuedAt,
          record.expiresAt,
          record.revokedAt,
        ],
      );
    },

    async getSession(sessionId) {
      const result = await pool.query<{
        session_id: string;
        operator_id: string;
        token_digest: string;
        proof_digest: string;
        capability_snapshot: unknown;
        issued_at: Date;
        expires_at: Date;
        revoked_at: Date | null;
      }>(
        `SELECT session.session_id, session.operator_id, session.token_digest,
                session.proof_digest, session.capability_snapshot, session.issued_at,
                session.expires_at, session.revoked_at
         FROM local_sessions AS session
         JOIN local_operators AS operator
           ON operator.operator_id = session.operator_id
          AND operator.disabled_at IS NULL
         WHERE session.session_id = $1`,
        [sessionId],
      );
      const row = result.rows[0];
      if (row === undefined) return null;
      return {
        sessionId: row.session_id,
        operatorId: row.operator_id,
        tokenDigest: row.token_digest,
        proofDigest: row.proof_digest,
        capabilities: parseCapabilities(row.capability_snapshot),
        issuedAt: row.issued_at,
        expiresAt: row.expires_at,
        revokedAt: row.revoked_at,
      };
    },

    async revokeSession(sessionId, revokedAt) {
      const result = await pool.query(
        `UPDATE local_sessions
         SET revoked_at = $2, row_version = row_version + 1
         WHERE session_id = $1 AND revoked_at IS NULL`,
        [sessionId, revokedAt],
      );
      return result.rowCount === 1;
    },

    async close() {
      await pool.end();
    },
  };
}

export function parseLocalBetaPostgreSqlUrl(connectionString: string): {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl: false;
} {
  if (connectionString.length > 512) {
    throw new Error("Local beta database URL exceeds committed bounds.");
  }
  let url: URL;
  let pathname: string;
  let password: string;
  try {
    url = new URL(connectionString);
    pathname = decodeURIComponent(url.pathname);
    password = decodeURIComponent(url.password);
  } catch {
    throw new Error("Local beta database URL is invalid.");
  }
  if (
    url.protocol !== "postgresql:" ||
    url.hostname !== "127.0.0.1" ||
    url.username !== "lnsat_local" ||
    pathname !== "/lnsat_local_beta" ||
    url.search !== "" ||
    url.hash !== "" ||
    !credentialPattern.test(password) ||
    !/^\d{4,5}$/.test(url.port)
  ) {
    throw new Error("Local beta database URL must use the bounded loopback target.");
  }
  const port = Number(url.port);
  if (!Number.isSafeInteger(port) || port < 1024 || port > 65535) {
    throw new Error("Local beta database URL port is invalid.");
  }
  return {
    host: url.hostname,
    port,
    database: "lnsat_local_beta",
    user: "lnsat_local",
    password,
    ssl: false,
  };
}

export function createLocalControlPlaneSessionService(
  repository: LocalSessionRepository,
  options: LocalControlPlaneSessionServiceOptions = {},
): LocalControlPlaneSessionService {
  const now = options.now ?? (() => new Date());
  const secureRandom = options.random ?? ((size: number) => randomBytes(size));

  return {
    async issue(credential, ttlSeconds = 900) {
      if (!Number.isSafeInteger(ttlSeconds) || ttlSeconds < 60 || ttlSeconds > 3600) {
        return failure("local_auth.invalid_ttl");
      }
      if (!credentialPattern.test(credential)) {
        return failure("local_auth.invalid_credential");
      }
      const operator = await repository.getOperator(LOCAL_OPERATOR_ID);
      if (
        operator === null ||
        operator.disabledAt !== null ||
        !safeDigestEqual(sha256(credential), operator.credentialDigest)
      ) {
        return failure("local_auth.invalid_credential");
      }

      const capabilities = parseCapabilities(operator.capabilities);
      const issuedAt = now();
      const expiresAt = new Date(issuedAt.getTime() + ttlSeconds * 1000);
      const sessionId = `ses_${Buffer.from(secureRandom(16)).toString("hex")}`;
      const tokenSecret = Buffer.from(secureRandom(32)).toString("base64url");
      if (!sessionIdPattern.test(sessionId) || !credentialPattern.test(tokenSecret)) {
        throw new Error("Secure random provider returned an invalid length.");
      }
      const rawToken = `${sessionId}.${tokenSecret}`;
      const rawClientProof = Buffer.from(secureRandom(32)).toString("base64url");
      if (!credentialPattern.test(rawClientProof)) {
        throw new Error("Secure random provider returned an invalid length.");
      }
      await repository.createSession({
        sessionId,
        operatorId: operator.operatorId,
        tokenDigest: sha256(rawToken),
        proofDigest: sha256(rawClientProof),
        capabilities,
        issuedAt,
        expiresAt,
        revokedAt: null,
      });
      return {
        ok: true,
        session: publicView({
          sessionId,
          operatorId: operator.operatorId,
          tokenDigest: "withheld",
          proofDigest: "withheld",
          capabilities,
          issuedAt,
          expiresAt,
          revokedAt: null,
        }),
        rawToken,
        rawClientProof,
        maxAgeSeconds: ttlSeconds,
      };
    },

    async verify(token, clientProof) {
      return verifyToken(repository, token, clientProof, now());
    },

    async authorize(token, clientProof, capability) {
      if (!capabilityPattern.test(capability)) {
        return failure("local_auth.capability_denied");
      }
      const result = await verifyToken(repository, token, clientProof, now());
      if (!result.ok) return result;
      if (!result.session.capabilities.includes(capability)) {
        return failure("local_auth.capability_denied");
      }
      return result;
    },

    async revoke(token, clientProof) {
      const verified = await verifyToken(repository, token, clientProof, now());
      if (!verified.ok) return verified;
      const revokedAt = now();
      if (!(await repository.revokeSession(verified.session.session_id, revokedAt))) {
        return failure("local_auth.revoked_session");
      }
      return {
        ok: true,
        session: { ...verified.session, revoked_at: revokedAt.toISOString() },
      };
    },
  };
}

async function verifyToken(
  repository: LocalSessionRepository,
  token: string,
  clientProof: string,
  checkedAt: Date,
): Promise<LocalSessionVerifyResult> {
  const match = sessionTokenPattern.exec(token);
  const sessionId = match?.[1];
  if (sessionId === undefined || !credentialPattern.test(clientProof)) {
    return failure("local_auth.invalid_session");
  }
  const session = await repository.getSession(sessionId);
  if (
    session === null ||
    !safeDigestEqual(sha256(token), session.tokenDigest) ||
    !safeDigestEqual(sha256(clientProof), session.proofDigest)
  ) {
    return failure("local_auth.invalid_session");
  }
  if (session.revokedAt !== null) return failure("local_auth.revoked_session");
  if (checkedAt.getTime() >= session.expiresAt.getTime()) {
    return failure("local_auth.expired_session");
  }
  return { ok: true, session: publicView(session) };
}

function publicView(record: LocalSessionRecord): LocalSessionPublicView {
  return {
    session_id: record.sessionId,
    operator_id: record.operatorId,
    capabilities: [...record.capabilities],
    issued_at: record.issuedAt.toISOString(),
    expires_at: record.expiresAt.toISOString(),
    revoked_at: record.revokedAt?.toISOString() ?? null,
  };
}

function parseCapabilities(value: unknown): string[] {
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    value.length > 32 ||
    value.some((entry) => typeof entry !== "string" || !capabilityPattern.test(entry))
  ) {
    throw new Error("Local operator capability storage is invalid.");
  }
  return [...new Set(value)].sort();
}

function sha256(value: string): string {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

function safeDigestEqual(left: string, right: string): boolean {
  const leftBytes = Buffer.from(left, "utf8");
  const rightBytes = Buffer.from(right, "utf8");
  return (
    leftBytes.length === rightBytes.length && timingSafeEqual(leftBytes, rightBytes)
  );
}

function failure(code: LocalSessionFailureCode): LocalSessionFailure {
  return { ok: false, code };
}
