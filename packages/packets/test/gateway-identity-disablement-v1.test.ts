import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  createGatewayIdentityDisablementFailureV1,
  gatewayIdentityDisablementV1Contract,
} from "../src/index.js";

const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)));

describe("@lnsat/packets Gateway identity-disablement v1 contract", () => {
  it("freezes actor/target scopes, one-time replay, and exact effects", () => {
    expect(gatewayIdentityDisablementV1Contract).toEqual({
      contract_id: "lnsat.gateway.identity_disablement.v1_0",
      contract_version: "lnsat.contracts.v1_0",
      path: "/v1/identities/{identity_ref}",
      method: "DELETE",
      authentication: "active owner session plus double-submit CSRF",
      scope: "active_non_owner_identity",
      actor_roles: ["owner"],
      target_roles: ["operator", "auditor"],
      target_source: "validated_route_identity_ref",
      request_body: "exact_empty_json_framing",
      csrf: "required_double_submit",
      caller_idempotency_key: "forbidden",
      replay_semantics: "one_time_active_target_identity",
      failure_oracle: "one generic denial",
      failure_code: "gateway.identity_disablement.denied",
      success_side_effects: [
        "session_activity_evidence_may_append",
        "identity_status_evidence_appended",
        "identity_security_event_appended",
        "target_session_revocations_may_append",
        "target_session_security_events_may_append",
      ],
      failure_side_effects: [],
      execution_authority: false,
      mutation_authority: false,
    });
  });

  it("creates one zero-side-effect denial with disabled response fields", () => {
    expect(createGatewayIdentityDisablementFailureV1()).toEqual({
      contract: "lnsat.gateway.identity_disablement.v1_0",
      contract_version: "lnsat.contracts.v1_0",
      ok: false,
      identity_ref: null,
      disabled_at: null,
      revoked_session_count: null,
      errors: [
        {
          code: "gateway.identity_disablement.denied",
          path: "/identities/{identity_ref}",
          message: "Identity disablement denied.",
          severity: "error",
        },
      ],
      side_effects: [],
      identity_state_changed: false,
      session_authority_state_changed: false,
      execution_authority: false,
      mutation_authority: false,
    });
  });

  it("publishes one closed response schema with no request framing", async () => {
    const schema = JSON.parse(
      await readFile(
        join(packageRoot, "schemas", "gateway-identity-disablement-v1.schema.json"),
        "utf8",
      ),
    ) as Record<string, unknown>;

    expect(schema.oneOf).toHaveLength(2);
    expect(schema).toHaveProperty("$defs.success.additionalProperties", false);
    expect(schema).toHaveProperty("$defs.failure.additionalProperties", false);
    expect(schema).toHaveProperty(
      "$defs.success.properties.scope.const",
      "non_owner_identity",
    );
    expect(schema).toHaveProperty(
      "$defs.success.properties.replay_semantics.const",
      "one_time_active_target_identity",
    );
    expect(schema).toHaveProperty(
      "$defs.success.properties.reenable_authority.const",
      false,
    );
    expect(schema).toHaveProperty("$defs.failure.properties.side_effects.maxItems", 0);
  });
});
