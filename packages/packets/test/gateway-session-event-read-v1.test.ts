import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  createGatewaySessionEventReadFailureV1,
  gatewaySessionEventReadV1Contract,
} from "../src/index.js";

const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)));

describe("@lnsat/packets Gateway session-event read v1 contract", () => {
  it("freezes authenticated route-only evidence-read scope", () => {
    expect(gatewaySessionEventReadV1Contract).toEqual({
      contract_id: "lnsat.gateway.session_event_read.v1_0",
      contract_version: "lnsat.contracts.v1_0",
      path: "/v1/sessions/{session_id}/events",
      methods: ["GET", "HEAD"],
      authentication: "active local browser session",
      authorization_permission: "read_evidence",
      scope: "validated_target_session",
      roles: ["owner", "operator", "auditor"],
      target_source: "validated_route_session_id",
      session_id_grammar: "ses_ plus 32 lowercase hexadecimal characters",
      request_body: "forbidden",
      query_string: "forbidden",
      caller_idempotency_key: "forbidden",
      event_order: "event_sequence_ascending",
      actor_session_semantics: "nullable_for_issue_and_offline_owner_recovery",
      related_session_semantics: "present_only_for_rotation",
      revocation_reason_semantics: "present_only_for_revocation",
      failure_oracle: "one generic denial",
      failure_code: "gateway.session_event_read.denied",
      raw_secret_reflection: "forbidden",
      success_side_effects: ["session_activity_evidence_may_append"],
      failure_side_effects: ["session_activity_evidence_may_append"],
      identity_state_changed: false,
      session_authority_state_changed: false,
      packet_state_changed: false,
      action_state_changed: false,
      signing_authority: false,
      nonce_authority: false,
      consumption_authority: false,
      execution_authority: false,
      mutation_authority: false,
    });
  });

  it("creates one oracle-neutral public-safe denial", () => {
    expect(createGatewaySessionEventReadFailureV1()).toEqual({
      contract: "lnsat.gateway.session_event_read.v1_0",
      contract_version: "lnsat.contracts.v1_0",
      ok: false,
      session_id: null,
      events: null,
      errors: [
        {
          code: "gateway.session_event_read.denied",
          path: "/sessions/{session_id}/events",
          message: "Session event read denied.",
          severity: "error",
        },
      ],
      side_effects: ["session_activity_evidence_may_append"],
      identity_state_changed: false,
      session_authority_state_changed: false,
      packet_state_changed: false,
      action_state_changed: false,
      signing_authority: false,
      nonce_authority: false,
      consumption_authority: false,
      execution_authority: false,
      mutation_authority: false,
    });
  });

  it("publishes closed ordered event and denial schemas", async () => {
    const schema = JSON.parse(
      await readFile(
        join(packageRoot, "schemas", "gateway-session-event-read-v1.schema.json"),
        "utf8",
      ),
    ) as Record<string, unknown>;

    expect(schema.oneOf).toHaveLength(2);
    expect(schema).toHaveProperty("$defs.success.additionalProperties", false);
    expect(schema).toHaveProperty("$defs.failure.additionalProperties", false);
    expect(schema).toHaveProperty("$defs.event.additionalProperties", false);
    expect(schema).toHaveProperty("$defs.session_id.pattern", "^ses_[0-9a-f]{32}$");
    expect(schema).toHaveProperty("$defs.success.properties.events.maxItems", 3);
    expect(schema).toHaveProperty(
      "$defs.success.properties.event_order.const",
      "event_sequence_ascending",
    );
    expect(schema).toHaveProperty("$defs.event.properties.event_kind.enum", [
      "issued",
      "revoked",
      "rotated",
    ]);
    expect(schema).toHaveProperty(
      "$defs.event.properties.actor_session_id.oneOf.1.type",
      "null",
    );
    expect(schema).toHaveProperty(
      "$defs.event.properties.related_session_id.oneOf.1.type",
      "null",
    );
    expect(schema).toHaveProperty(
      "$defs.event.properties.revocation_reason.oneOf.1.type",
      "null",
    );
    expect(schema).toHaveProperty(
      "$defs.event.allOf.0.then.properties.actor_session_id.type",
      "null",
    );
    expect(schema).toHaveProperty(
      "$defs.event.allOf.1.then.properties.revocation_reason.enum",
      ["sign_out", "owner_revoke", "credential_revoke", "recovery", "rotation"],
    );
    expect(schema).toHaveProperty(
      "$defs.event.allOf.2.then.properties.related_session_id.$ref",
      "#/$defs/session_id",
    );
    expect(schema).toHaveProperty(
      "$defs.event.allOf.3.then.properties.actor_session_id.type",
      "null",
    );
    expect(schema).toHaveProperty(
      "$defs.event.allOf.4.then.properties.actor_session_id.$ref",
      "#/$defs/session_id",
    );
    expect(schema).toHaveProperty(
      "$defs.failure.properties.errors.prefixItems.0.$ref",
      "#/$defs/error",
    );
    expect(schema).toHaveProperty(
      "$defs.error.properties.code.const",
      "gateway.session_event_read.denied",
    );
    for (const property of [
      "identity_state_changed",
      "session_authority_state_changed",
      "packet_state_changed",
      "action_state_changed",
      "signing_authority",
      "nonce_authority",
      "consumption_authority",
      "execution_authority",
      "mutation_authority",
    ]) {
      expect(schema).toHaveProperty(
        `$defs.success.properties.${property}.const`,
        false,
      );
      expect(schema).toHaveProperty(
        `$defs.failure.properties.${property}.const`,
        false,
      );
    }
  });
});
