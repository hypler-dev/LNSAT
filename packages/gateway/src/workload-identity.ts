export type SpiffeSvidEvidence = {
  credential_ref: string;
  svid_type: "x509-svid" | "jwt-svid";
  spiffe_id: string;
  trust_domain: string;
  expires_at: string;
  status: "active" | "revoked" | "expired";
};

export interface SpiffeCredentialVerifier {
  verifyCredentialReference(
    credentialRef: string,
  ): Promise<{ ok: true; evidence: SpiffeSvidEvidence } | { ok: false }>;
}

export type SpiffeWorkloadAuthentication =
  | {
      ok: true;
      principal: {
        kind: "workload";
        principal_ref: string;
        trust_domain: string;
        svid_type: "x509-svid" | "jwt-svid";
      };
      access_authenticated: true;
      action_authorized: false;
      human_approval_satisfied: false;
      credential_value_exposed: false;
      spire_dependency_required: false;
      side_effects: [];
    }
  | {
      ok: false;
      error_code:
        | "gateway.spiffe.invalid_config"
        | "gateway.spiffe.verification_failed"
        | "gateway.spiffe.identity_mismatch"
        | "gateway.spiffe.credential_inactive";
      action_authorized: false;
      side_effects: [];
    };

export async function authenticateSpiffeWorkload(input: {
  credential_ref: string;
  expected_trust_domain: string;
  now: Date;
  verifier: SpiffeCredentialVerifier;
}): Promise<SpiffeWorkloadAuthentication> {
  if (
    !/^spiffe-credential-ref:[a-z0-9][a-z0-9_.:/-]{7,255}$/.test(
      input.credential_ref,
    ) ||
    !isTrustDomain(input.expected_trust_domain) ||
    !Number.isFinite(input.now.getTime()) ||
    typeof input.verifier?.verifyCredentialReference !== "function"
  ) {
    return spiffeFailure("gateway.spiffe.invalid_config");
  }
  let verified: Awaited<
    ReturnType<SpiffeCredentialVerifier["verifyCredentialReference"]>
  >;
  try {
    verified = await input.verifier.verifyCredentialReference(input.credential_ref);
  } catch {
    verified = { ok: false };
  }
  if (!verified.ok) return spiffeFailure("gateway.spiffe.verification_failed");
  const evidence = verified.evidence;
  if (!isPlainObject(evidence)) {
    return spiffeFailure("gateway.spiffe.verification_failed");
  }
  const identity = parseSpiffeId(evidence.spiffe_id);
  if (
    evidence.credential_ref !== input.credential_ref ||
    identity === null ||
    identity.trust_domain !== input.expected_trust_domain ||
    evidence.trust_domain !== input.expected_trust_domain ||
    !["x509-svid", "jwt-svid"].includes(evidence.svid_type) ||
    !validIso(evidence.expires_at)
  ) {
    return spiffeFailure("gateway.spiffe.identity_mismatch");
  }
  if (
    evidence.status !== "active" ||
    Date.parse(evidence.expires_at) <= input.now.getTime()
  ) {
    return spiffeFailure("gateway.spiffe.credential_inactive");
  }
  return {
    ok: true,
    principal: {
      kind: "workload",
      principal_ref: evidence.spiffe_id,
      trust_domain: evidence.trust_domain,
      svid_type: evidence.svid_type,
    },
    access_authenticated: true,
    action_authorized: false,
    human_approval_satisfied: false,
    credential_value_exposed: false,
    spire_dependency_required: false,
    side_effects: [],
  };
}

function parseSpiffeId(value: unknown): { trust_domain: string; path: string } | null {
  if (typeof value !== "string" || value.length > 2048) return null;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (
    url.protocol !== "spiffe:" ||
    url.username !== "" ||
    url.password !== "" ||
    url.port !== "" ||
    url.search !== "" ||
    url.hash !== "" ||
    !isTrustDomain(url.hostname) ||
    !/^\/(?:[A-Za-z0-9._~-]+\/?)+$/.test(url.pathname)
  ) {
    return null;
  }
  return { trust_domain: url.hostname, path: url.pathname };
}

function isTrustDomain(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length >= 1 &&
    value.length <= 253 &&
    value
      .split(".")
      .every((label) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))
  );
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validIso(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    return new Date(value).toISOString() === value;
  } catch {
    return false;
  }
}

function spiffeFailure(
  error_code: Extract<SpiffeWorkloadAuthentication, { ok: false }>["error_code"],
): Extract<SpiffeWorkloadAuthentication, { ok: false }> {
  return { ok: false, error_code, action_authorized: false, side_effects: [] };
}
