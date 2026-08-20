import type { FastifyReply, FastifyRequest } from "fastify";
import { LOCAL_SESSION_COOKIE } from "./local-control-plane-session.js";

export function hasBoundedLoopbackTransport(request: FastifyRequest): boolean {
  if (!["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(request.ip)) return false;
  const origin = singleBoundedHeader(request.headers.origin);
  if (origin === null && request.headers.origin !== undefined) return false;
  if (origin === null) return true;
  try {
    const url = new URL(origin);
    const requestHost = singleBoundedHeader(request.headers.host);
    return (
      requestHost !== null &&
      url.protocol === "http:" &&
      (url.hostname === "127.0.0.1" || url.hostname === "localhost") &&
      url.host === requestHost.toLowerCase() &&
      url.username === "" &&
      url.password === "" &&
      url.pathname === "/" &&
      url.search === "" &&
      url.hash === ""
    );
  } catch {
    return false;
  }
}

export function readLocalSessionCookie(header: string | undefined): string | null {
  if (header === undefined || header.length > 2048) return null;
  const values = header
    .split(";")
    .map((part) => part.trim())
    .filter((part) => part.startsWith(`${LOCAL_SESSION_COOKIE}=`))
    .map((part) => part.slice(LOCAL_SESSION_COOKIE.length + 1));
  if (values.length !== 1 || values[0] === "") return null;
  return values[0] ?? null;
}

export function singleBoundedHeader(
  value: string | string[] | undefined,
): string | null {
  return typeof value === "string" && value.length > 0 && value.length <= 512
    ? value
    : null;
}

export function noStore(reply: FastifyReply): FastifyReply {
  return reply.header("cache-control", "no-store");
}
