import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  createGatewayIdentityCreationFailureV1,
  gatewayIdentityCreationV1Contract,
} from "../src/index.js";

const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)));

describe("@lnsat/packets Gateway identity-creation v1 contract", () => {
  it("freezes owner scope, non-owner roles, replay, and exact effects", () => {
    expect(gatewayIdentityCreationV1Contract).toEqual({
      contract_id: "lnsat.gateway.identity_creation.v1_0",
      contract_version: "lnsat.contracts.v1_0",
      path: "/v1/identities",
      method: "POST",
      authentication: "active owner session plus double-submit CSRF",
      scope: "new_non_owner_identity",
      actor_roles: ["owner"],
      created_roles: ["operator", "auditor"],
      request_fields: ["identity_ref", "display_name", "role", "password"],
      secret_fields: ["password"],
      secret_persistence: "forbidden",
      password_profile: "lnsat.argon2id.v1",
      caller_idempotency_key: "forbidden",
      replay_semantics: "create_once_identity_ref",
      duplicate_semantics: "generic_denial",
      failure_oracle: "one generic denial",
      failure_code: "gateway.identity_creation.denied",
      success_side_effects: [
        "authentication_limiter_advanced",
        "session_activity_evidence_may_append",
        "identity_evidence_appended",
        "password_credential_evidence_appended",
        "identity_security_event_appended",
      ],
      failure_side_effects: ["authentication_limiter_may_advance"],
      execution_authority: false,
      mutation_authority: false,
    });
  });

  it("creates one denial exposing only possible limiter advancement", () => {
    expect(createGatewayIdentityCreationFailureV1()).toEqual({
      contract: "lnsat.gateway.identity_creation.v1_0",
      contract_version: "lnsat.contracts.v1_0",
      ok: false,
      identity: null,
      credential: null,
      errors: [
        {
          code: "gateway.identity_creation.denied",
          path: "/identities",
          message: "Identity creation denied.",
          severity: "error",
        },
      ],
      side_effects: ["authentication_limiter_may_advance"],
      identity_state_changed: false,
      credential_state_changed: false,
      session_authority_state_changed: false,
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
          "gateway-identity-creation-request-v1.schema.json",
        ),
        "utf8",
      ),
    ) as Record<string, unknown>;
    const responseSchema = JSON.parse(
      await readFile(
        join(
          packageRoot,
          "schemas",
          "gateway-identity-creation-response-v1.schema.json",
        ),
        "utf8",
      ),
    ) as Record<string, unknown>;

    expect(requestSchema).toMatchObject({
      additionalProperties: false,
      required: ["identity_ref", "display_name", "role", "password"],
    });
    expect(requestSchema).toHaveProperty(
      "properties.identity_ref.pattern",
      "^identity:human:[^\\s\\u0000-\\u001F\\u007F]{1,240}$",
    );
    expect(requestSchema).toHaveProperty("properties.display_name.maxLength", 128);
    expect(requestSchema).toHaveProperty("properties.role.enum", [
      "operator",
      "auditor",
    ]);
    expect(requestSchema).toHaveProperty("properties.password.minLength", 15);
    expect(requestSchema).toHaveProperty("properties.password.maxLength", 128);
    expect(responseSchema.oneOf).toHaveLength(2);
    expect(responseSchema).toHaveProperty("$defs.success.additionalProperties", false);
    expect(responseSchema).toHaveProperty("$defs.failure.additionalProperties", false);
    expect(responseSchema).toHaveProperty(
      "$defs.success.properties.replay_semantics.const",
      "create_once_identity_ref",
    );
    expect(responseSchema).toHaveProperty(
      "$defs.failure.properties.side_effects.prefixItems.0.const",
      "authentication_limiter_may_advance",
    );
  });
});
