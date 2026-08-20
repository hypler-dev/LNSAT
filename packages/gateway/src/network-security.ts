import { isIP } from "node:net";

export type PublicHttpsTargetResult =
  | {
      ok: true;
      url: string;
      dns_revalidation_required: true;
      redirects_allowed: false;
      credentials_forwarded: false;
      side_effects: [];
    }
  | {
      ok: false;
      error_code: "gateway.network.invalid_target" | "gateway.network.ssrf_blocked";
      side_effects: [];
    };

export function validatePublicHttpsTarget(input: {
  url: string;
  resolved_ips: string[];
  redirect_chain: string[];
}): PublicHttpsTargetResult {
  let url: URL;
  try {
    url = new URL(input.url);
  } catch {
    return invalidTarget();
  }
  if (
    url.protocol !== "https:" ||
    url.username !== "" ||
    url.password !== "" ||
    url.search !== "" ||
    url.hash !== "" ||
    !Array.isArray(input.resolved_ips) ||
    input.resolved_ips.length < 1 ||
    input.resolved_ips.length > 16 ||
    !Array.isArray(input.redirect_chain) ||
    input.redirect_chain.length !== 0
  ) {
    return invalidTarget();
  }
  if (
    isForbiddenHostname(url.hostname) ||
    !input.resolved_ips.every(isPublicIpAddress)
  ) {
    return { ok: false, error_code: "gateway.network.ssrf_blocked", side_effects: [] };
  }
  return {
    ok: true,
    url: url.href,
    dns_revalidation_required: true,
    redirects_allowed: false,
    credentials_forwarded: false,
    side_effects: [],
  };
}

function invalidTarget(): PublicHttpsTargetResult {
  return { ok: false, error_code: "gateway.network.invalid_target", side_effects: [] };
}

function isForbiddenHostname(hostname: string): boolean {
  const normalizedHost = hostname.toLowerCase();
  const unwrapped =
    normalizedHost.startsWith("[") && normalizedHost.endsWith("]")
      ? normalizedHost.slice(1, -1)
      : normalizedHost;
  const version = isIP(unwrapped);
  return (
    normalizedHost === "localhost" ||
    normalizedHost.endsWith(".localhost") ||
    normalizedHost.endsWith(".local") ||
    normalizedHost.endsWith(".internal") ||
    (version !== 0 && !isPublicIpAddress(unwrapped))
  );
}

function isPublicIpAddress(value: string): boolean {
  const version = isIP(value);
  if (version === 4) {
    const octets = value.split(".").map(Number);
    const a = octets[0]!;
    const b = octets[1]!;
    const c = octets[2]!;
    return !(
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 0 && [0, 2].includes(c)) ||
      (a === 192 && b === 168) ||
      (a === 198 && [18, 19].includes(b)) ||
      (a === 198 && b === 51 && c === 100) ||
      (a === 203 && b === 0 && c === 113) ||
      a >= 224
    );
  }
  if (version === 6) {
    const normalized = value.toLowerCase();
    return !(
      normalized === "::" ||
      normalized === "::1" ||
      normalized.startsWith("fc") ||
      normalized.startsWith("fd") ||
      /^fe[89ab]/.test(normalized) ||
      normalized.startsWith("ff") ||
      normalized === "2001:db8::" ||
      normalized.startsWith("2001:db8:") ||
      normalized.startsWith("::ffff:")
    );
  }
  return false;
}
