import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  createGatewayIdentityPasswordRotationFailureV1,
  gatewayIdentityPasswordRotationV1Contract,
} from "../src/index.js";

const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)));

describe("@lnsat/packets Gateway identity password-rotation v1 contract", () => {
  it("freezes identity scope, secret handling, replay, and exact effects", () => {
    expect(gatewayIdentityPasswordRotationV1Contract).toEqual({
      contract_id: "lnsat.gateway.identity_password_rotation.v1_0",
      contract_version: "lnsat.contracts.v1_0",
      path: "/v1/identity/password",
      method: "PATCH",
      authentication:
        "active local browser session plus double-submit CSRF and latest password",
      scope: "authenticated_identity",
      roles: ["owner", "operator", "auditor"],
      request_fields: ["current_password", "new_password"],
      secret_fields: ["current_password", "new_password"],
      secret_persistence: "forbidden",
      password_profile: "lnsat.argon2id.v1",
      new_password_rule: "must differ from current password and match profile",
      caller_idempotency_key: "forbidden",
      replay_semantics: "one_time_active_session_family",
      failure_oracle: "one generic denial",
      failure_code: "gateway.identity_password_rotation.denied",
      success_side_effects: [
        "authentication_limiter_advanced",
        "session_activity_evidence_may_append",
        "password_credential_evidence_appended",
        "identity_security_event_appended",
        "session_family_revocations_appended",
        "session_security_events_appended",
        "session_cookies_cleared",
      ],
      failure_side_effects: ["authentication_limiter_may_advance"],
      execution_authority: false,
      mutation_authority: false,
    });
  });

  it("creates one denial exposing only possible limiter advancement", () => {
    expect(createGatewayIdentityPasswordRotationFailureV1()).toEqual({
      contract: "lnsat.gateway.identity_password_rotation.v1_0",
      contract_version: "lnsat.contracts.v1_0",
      ok: false,
      identity_ref: null,
      credential_version: null,
      rotated_at: null,
      revoked_session_count: null,
      errors: [
        {
          code: "gateway.identity_password_rotation.denied",
          path: "/identity/password",
          message: "Password rotation denied.",
          severity: "error",
        },
      ],
      side_effects: ["authentication_limiter_may_advance"],
      credential_state_changed: false,
      session_state_changed: false,
      execution_authority: false,
      mutation_authority: false,
    });
  });

  it("publishes separate closed request and response schemas", async () => {
    const requestSchema = JSON.parse(
      await readFile(
        join(
          packageRoot,
          "schemas",
          "gateway-identity-password-rotation-request-v1.schema.json",
        ),
        "utf8",
      ),
    ) as Record<string, unknown>;
    const responseSchema = JSON.parse(
      await readFile(
        join(
          packageRoot,
          "schemas",
          "gateway-identity-password-rotation-response-v1.schema.json",
        ),
        "utf8",
      ),
    ) as Record<string, unknown>;

    expect(requestSchema).toMatchObject({
      additionalProperties: false,
      required: ["current_password", "new_password"],
    });
    expect(requestSchema).toHaveProperty("properties.current_password.minLength", 15);
    expect(requestSchema).toHaveProperty("properties.current_password.maxLength", 128);
    expect(requestSchema).toHaveProperty("properties.new_password.minLength", 15);
    expect(requestSchema).toHaveProperty("properties.new_password.maxLength", 128);
    expect(responseSchema.oneOf).toHaveLength(2);
    expect(responseSchema).toHaveProperty("$defs.success.additionalProperties", false);
    expect(responseSchema).toHaveProperty("$defs.failure.additionalProperties", false);
    expect(responseSchema).toHaveProperty(
      "$defs.success.properties.replay_semantics.const",
      "one_time_active_session_family",
    );
    expect(responseSchema).toHaveProperty(
      "$defs.failure.properties.side_effects.prefixItems.0.const",
      "authentication_limiter_may_advance",
    );
  });
});
