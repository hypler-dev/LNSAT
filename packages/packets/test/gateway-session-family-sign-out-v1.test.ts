import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  createGatewaySessionFamilySignOutFailureV1,
  gatewaySessionFamilySignOutV1Contract,
} from "../src/index.js";

const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)));

describe("@lnsat/packets Gateway session-family sign-out v1 contract", () => {
  it("freezes identity-family scope, one-time replay, and exact effects", () => {
    expect(gatewaySessionFamilySignOutV1Contract).toEqual({
      contract_id: "lnsat.gateway.session_family_sign_out.v1_0",
      contract_version: "lnsat.contracts.v1_0",
      path: "/v1/session",
      method: "DELETE",
      authentication: "active local browser session plus double-submit CSRF",
      scope: "authenticated_identity_session_family",
      roles: ["owner", "operator", "auditor"],
      request_body: "exact_empty_json_framing",
      csrf: "required_double_submit",
      replay_semantics: "one_time_active_session_family",
      failure_oracle: "one generic denial",
      failure_code: "gateway.session_family_sign_out.denied",
      success_side_effects: [
        "session_activity_evidence_may_append",
        "session_family_revocations_appended",
        "session_security_events_appended",
        "session_cookies_cleared",
      ],
      failure_side_effects: [],
      execution_authority: false,
      mutation_authority: false,
    });
  });

  it("creates one zero-side-effect denial without family evidence", () => {
    expect(createGatewaySessionFamilySignOutFailureV1()).toEqual({
      contract: "lnsat.gateway.session_family_sign_out.v1_0",
      contract_version: "lnsat.contracts.v1_0",
      ok: false,
      identity_ref: null,
      family_session_count: null,
      newly_revoked_session_count: null,
      revoked_at: null,
      errors: [
        {
          code: "gateway.session_family_sign_out.denied",
          path: "/session",
          message: "Session family sign-out denied.",
          severity: "error",
        },
      ],
      side_effects: [],
      session_state_changed: false,
      execution_authority: false,
      mutation_authority: false,
    });
  });

  it("publishes a closed success-or-failure response schema", async () => {
    const schema = JSON.parse(
      await readFile(
        join(packageRoot, "schemas", "gateway-session-family-sign-out-v1.schema.json"),
        "utf8",
      ),
    ) as Record<string, unknown>;

    expect(schema.oneOf).toHaveLength(2);
    expect(schema).toHaveProperty("$defs.success.additionalProperties", false);
    expect(schema).toHaveProperty("$defs.failure.additionalProperties", false);
    expect(schema).toHaveProperty(
      "$defs.success.properties.replay_semantics.const",
      "one_time_active_session_family",
    );
    expect(schema).toHaveProperty(
      "$defs.success.properties.reauthentication_required.const",
      true,
    );
    expect(schema).toHaveProperty(
      "$defs.transport.properties.csrf_verified.const",
      true,
    );
    expect(schema).toHaveProperty("$defs.failure.properties.side_effects.maxItems", 0);
  });
});
