import { createHash } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import {
  LOCAL_OPERATOR_CAPABILITY,
  LOCAL_OPERATOR_ID,
  LOCAL_SESSION_COOKIE,
  LOCAL_SESSION_PROOF_HEADER,
  buildApiGateway,
  createLocalControlPlaneSessionService,
  parseLocalBetaPostgreSqlUrl,
  type LocalOperatorRecord,
  type LocalSessionRecord,
  type LocalSessionRepository,
} from "../src/index.js";

const credential = "A".repeat(43);
const fixedNow = new Date("2026-07-14T00:00:00.000Z");

describe("BP-0872 local control-plane sessions", () => {
  const gateways: ReturnType<typeof buildApiGateway>[] = [];

  afterEach(async () => {
    await Promise.all(gateways.splice(0).map((gateway) => gateway.close()));
  });

  it("issues a digest-only session and never echoes the raw credential or token", async () => {
    const repository = memoryRepository();
    const service = createLocalControlPlaneSessionService(repository, {
      now: () => fixedNow,
    });
    const gateway = buildApiGateway({ localSessionService: service });
    gateways.push(gateway);

    const response = await gateway.inject({
      method: "POST",
      url: "/v1/local-beta/auth/session",
      headers: { "x-lnsat-local-operator-credential": credential },
      payload: { ttl_seconds: 300 },
    });

    expect(response.statusCode).toBe(201);
    expect(response.body).not.toContain(credential);
    const cookie = headerValue(response.headers["set-cookie"]);
    expect(cookie).toContain(`${LOCAL_SESSION_COOKIE}=ses_`);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Strict");
    const token = cookie.split(";")[0]?.split("=")[1];
    const clientProof = headerValue(response.headers[LOCAL_SESSION_PROOF_HEADER]);
    expect(token).toBeDefined();
    expect(response.body).not.toContain(token as string);
    expect(response.body).not.toContain(clientProof);
    expect(repository.sessions).toHaveLength(1);
    expect(repository.sessions[0]?.tokenDigest).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(repository.sessions[0]?.proofDigest).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(JSON.stringify(repository.sessions[0])).not.toContain(token as string);
    expect(JSON.stringify(repository.sessions[0])).not.toContain(clientProof);
  });

  it("fails closed for wrong credentials, malformed cookies, duplicate cookies, and non-loopback input", async () => {
    const repository = memoryRepository();
    const service = createLocalControlPlaneSessionService(repository, {
      now: () => fixedNow,
    });
    const gateway = buildApiGateway({ localSessionService: service });
    gateways.push(gateway);

    const wrong = await gateway.inject({
      method: "POST",
      url: "/v1/local-beta/auth/session",
      headers: { "x-lnsat-local-operator-credential": "B".repeat(43) },
    });
    expect(wrong.statusCode).toBe(401);
    expect(wrong.body).not.toContain("B".repeat(43));

    const duplicate = await gateway.inject({
      method: "GET",
      url: "/v1/local-beta/auth/session",
      headers: {
        cookie: `${LOCAL_SESSION_COOKIE}=bad; ${LOCAL_SESSION_COOKIE}=bad2`,
      },
    });
    expect(duplicate.statusCode).toBe(401);

    const hostileOrigin = await gateway.inject({
      method: "POST",
      url: "/v1/local-beta/auth/session",
      headers: {
        origin: "https://example.invalid",
        "x-lnsat-local-operator-credential": credential,
      },
    });
    expect(hostileOrigin.statusCode).toBe(403);

    const crossPortOrigin = await gateway.inject({
      method: "POST",
      url: "/v1/local-beta/auth/session",
      headers: {
        host: "127.0.0.1:4040",
        origin: "http://127.0.0.1:5050",
        "x-lnsat-local-operator-credential": credential,
      },
    });
    expect(crossPortOrigin.statusCode).toBe(403);

    const remote = await gateway.inject({
      method: "POST",
      url: "/v1/local-beta/auth/session",
      remoteAddress: "192.0.2.10",
      headers: { "x-lnsat-local-operator-credential": credential },
    });
    expect(remote.statusCode).toBe(403);
    expect(repository.sessions).toHaveLength(0);
  });

  it("authorizes the bounded operator readback, then persists revocation", async () => {
    const repository = memoryRepository();
    const service = createLocalControlPlaneSessionService(repository, {
      now: () => fixedNow,
    });
    const gateway = buildApiGateway({ localSessionService: service });
    gateways.push(gateway);
    const { cookie, clientProof } = await issueCookie(gateway);

    const publicInspection = await gateway.inject({
      method: "GET",
      url: "/v1/knowledge/sources",
    });
    expect(publicInspection.statusCode).not.toBe(401);

    const cookieOnlyReplay = await gateway.inject({
      method: "GET",
      url: "/v1/local-beta/operator/readback",
      headers: { cookie },
    });
    expect(cookieOnlyReplay.statusCode).toBe(401);

    const authorized = await gateway.inject({
      method: "GET",
      url: "/v1/local-beta/operator/readback",
      headers: { cookie, [LOCAL_SESSION_PROOF_HEADER]: clientProof },
    });
    expect(authorized.statusCode).toBe(200);
    expect(authorized.json()).toMatchObject({
      ok: true,
      status: "bp-0872-local-authenticated-session",
      operator: {
        operator_id: LOCAL_OPERATOR_ID,
        capabilities: [LOCAL_OPERATOR_CAPABILITY],
      },
      side_effects: [],
    });

    const revoked = await gateway.inject({
      method: "DELETE",
      url: "/v1/local-beta/auth/session",
      headers: { cookie, [LOCAL_SESSION_PROOF_HEADER]: clientProof },
    });
    expect(revoked.statusCode).toBe(200);
    expect(repository.sessions[0]?.revokedAt?.toISOString()).toBe(
      fixedNow.toISOString(),
    );

    const denied = await gateway.inject({
      method: "GET",
      url: "/v1/local-beta/operator/readback",
      headers: { cookie, [LOCAL_SESSION_PROOF_HEADER]: clientProof },
    });
    expect(denied.statusCode).toBe(401);
    expect(denied.json()).toMatchObject({
      errors: [{ code: "local_auth.revoked_session" }],
    });
  });

  it("expires at the exact boundary and denies missing capability", async () => {
    let clock = fixedNow;
    const repository = memoryRepository();
    const service = createLocalControlPlaneSessionService(repository, {
      now: () => clock,
    });
    const issued = await service.issue(credential, 60);
    expect(issued.ok).toBe(true);
    if (!issued.ok) return;

    clock = new Date(fixedNow.getTime() + 60_000);
    expect(await service.verify(issued.rawToken, issued.rawClientProof)).toEqual({
      ok: false,
      code: "local_auth.expired_session",
    });

    clock = fixedNow;
    const repositoryWithoutCapability = memoryRepository(["control_plane.viewer"]);
    const noCapabilityService = createLocalControlPlaneSessionService(
      repositoryWithoutCapability,
      { now: () => clock },
    );
    const noCapabilityIssue = await noCapabilityService.issue(credential, 60);
    expect(noCapabilityIssue.ok).toBe(true);
    if (!noCapabilityIssue.ok) return;
    expect(
      await noCapabilityService.authorize(
        noCapabilityIssue.rawToken,
        noCapabilityIssue.rawClientProof,
        LOCAL_OPERATOR_CAPABILITY,
      ),
    ).toEqual({ ok: false, code: "local_auth.capability_denied" });
  });

  it("rejects non-loopback, query-bearing, or wrong-database PostgreSQL URLs", () => {
    expect(
      parseLocalBetaPostgreSqlUrl(
        `postgresql://lnsat_local:${"A".repeat(43)}@127.0.0.1:55432/lnsat_local_beta`,
      ),
    ).toMatchObject({ host: "127.0.0.1", port: 55432, ssl: false });
    for (const url of [
      `postgresql://lnsat_local:${"A".repeat(43)}@192.0.2.1:55432/lnsat_local_beta`,
      `postgresql://lnsat_local:${"A".repeat(43)}@127.0.0.1:55432/production`,
      `postgresql://lnsat_local:${"A".repeat(43)}@127.0.0.1:55432/lnsat_local_beta?sslmode=require`,
      "postgresql://lnsat_local:%XX@127.0.0.1:55432/lnsat_local_beta",
      `postgresql://lnsat_local:${"A".repeat(513)}@127.0.0.1:55432/lnsat_local_beta`,
    ]) {
      expect(() => parseLocalBetaPostgreSqlUrl(url)).toThrow();
    }
  });
});

async function issueCookie(
  gateway: ReturnType<typeof buildApiGateway>,
): Promise<{ cookie: string; clientProof: string }> {
  const response = await gateway.inject({
    method: "POST",
    url: "/v1/local-beta/auth/session",
    headers: { "x-lnsat-local-operator-credential": credential },
  });
  expect(response.statusCode).toBe(201);
  return {
    cookie: headerValue(response.headers["set-cookie"]).split(";")[0] as string,
    clientProof: headerValue(response.headers[LOCAL_SESSION_PROOF_HEADER]),
  };
}

function headerValue(value: string | string[] | undefined): string {
  expect(typeof value).toBe("string");
  return value as string;
}

function memoryRepository(
  capabilities: string[] = [LOCAL_OPERATOR_CAPABILITY],
): LocalSessionRepository & { sessions: LocalSessionRecord[] } {
  const operator: LocalOperatorRecord = {
    operatorId: LOCAL_OPERATOR_ID,
    credentialDigest: `sha256:${createHash("sha256").update(credential).digest("hex")}`,
    capabilities,
    disabledAt: null,
  };
  const sessions: LocalSessionRecord[] = [];
  return {
    sessions,
    async getOperator(operatorId) {
      return operatorId === operator.operatorId ? operator : null;
    },
    async createSession(record) {
      sessions.push({ ...record });
    },
    async getSession(sessionId) {
      return sessions.find((session) => session.sessionId === sessionId) ?? null;
    },
    async revokeSession(sessionId, revokedAt) {
      const session = sessions.find((candidate) => candidate.sessionId === sessionId);
      if (session === undefined || session.revokedAt !== null) return false;
      session.revokedAt = revokedAt;
      return true;
    },
    async close() {},
  };
}
