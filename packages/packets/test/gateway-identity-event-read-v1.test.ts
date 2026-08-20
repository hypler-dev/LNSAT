import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  createGatewayIdentityEventReadFailureV1,
  gatewayIdentityEventReadV1Contract,
} from "../src/index.js";

const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)));

describe("@lnsat/packets Gateway identity-event read v1 contract", () => {
  it("freezes authenticated route-only evidence-read scope", () => {
    expect(gatewayIdentityEventReadV1Contract).toEqual({
      contract_id: "lnsat.gateway.identity_event_read.v1_0",
      contract_version: "lnsat.contracts.v1_0",
      path: "/v1/identities/{identity_ref}/events",
      methods: ["GET", "HEAD"],
      authentication: "active local browser session",
      authorization_permission: "read_evidence",
      scope: "validated_target_identity",
      roles: ["owner", "operator", "auditor"],
      target_source: "validated_route_identity_ref",
      request_body: "forbidden",
      query_string: "forbidden",
      caller_idempotency_key: "forbidden",
      event_order: "event_sequence_ascending",
      recovery_actor_semantics:
        "nullable_only_for_owner_bootstrap_and_offline_owner_recovery",
      failure_oracle: "one generic denial",
      failure_code: "gateway.identity_event_read.denied",
      raw_secret_reflection: "forbidden",
      success_side_effects: ["session_activity_evidence_may_append"],
      failure_side_effects: ["session_activity_evidence_may_append"],
      identity_state_changed: false,
      session_authority_state_changed: false,
      execution_authority: false,
      mutation_authority: false,
    });
  });

  it("creates one oracle-neutral public-safe denial", () => {
    expect(createGatewayIdentityEventReadFailureV1()).toEqual({
      contract: "lnsat.gateway.identity_event_read.v1_0",
      contract_version: "lnsat.contracts.v1_0",
      ok: false,
      identity_ref: null,
      events: null,
      errors: [
        {
          code: "gateway.identity_event_read.denied",
          path: "/identities/{identity_ref}/events",
          message: "Identity event read denied.",
          severity: "error",
        },
      ],
      side_effects: ["session_activity_evidence_may_append"],
      identity_state_changed: false,
      session_authority_state_changed: false,
      execution_authority: false,
      mutation_authority: false,
    });
  });

  it("publishes closed ordered event and denial schemas", async () => {
    const schema = JSON.parse(
      await readFile(
        join(packageRoot, "schemas", "gateway-identity-event-read-v1.schema.json"),
        "utf8",
      ),
    ) as Record<string, unknown>;

    expect(schema.oneOf).toHaveLength(2);
    expect(schema).toHaveProperty("$defs.success.additionalProperties", false);
    expect(schema).toHaveProperty("$defs.failure.additionalProperties", false);
    expect(schema).toHaveProperty("$defs.event.additionalProperties", false);
    expect(schema).toHaveProperty(
      "$defs.success.properties.event_order.const",
      "event_sequence_ascending",
    );
    expect(schema).toHaveProperty(
      "$defs.event.properties.actor_session_id.oneOf.0.type",
      "string",
    );
    expect(schema).toHaveProperty(
      "$defs.event.properties.actor_session_id.oneOf.1.type",
      "null",
    );
    expect(schema).toHaveProperty(
      "$defs.failure.properties.errors.prefixItems.0.$ref",
      "#/$defs/error",
    );
    expect(schema).toHaveProperty(
      "$defs.error.properties.code.const",
      "gateway.identity_event_read.denied",
    );
  });
});
