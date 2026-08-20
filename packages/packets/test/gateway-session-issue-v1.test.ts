import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  createGatewaySessionIssueFailureV1,
  gatewaySessionIssueV1Contract,
} from "../src/index.js";

const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)));

describe("@lnsat/packets Gateway session-issue v1 contract", () => {
  it("freezes the bounded secret-handling and replay contract", () => {
    expect(gatewaySessionIssueV1Contract).toEqual({
      contract_id: "lnsat.gateway.session_issue.v1_0",
      contract_version: "lnsat.contracts.v1_0",
      path: "/v1/session",
      method: "POST",
      authentication: "local password credential",
      identity_scope: "requested_local_human_identity",
      identity_ref_semantics:
        "stable reference grammar, identity:human: prefix, 240-character remainder, 256 UTF-16 code units",
      intent_header: "X-LNSAT-Session-Intent: lnsat.session.issue.v1",
      csrf: "not_applicable_before_session",
      request_fields: ["identity_ref", "password", "lifetime_seconds"],
      secret_fields: ["password"],
      secret_persistence: "forbidden",
      roles: ["owner", "operator", "auditor"],
      lifetime_seconds: { minimum: 60, maximum: 3_600 },
      replay_semantics: "fresh_session_per_success",
      caller_idempotency_key: "forbidden",
      failure_oracle: "one generic denial",
      failure_code: "gateway.session_issue.denied",
      success_side_effects: [
        "authentication_limiter_advanced",
        "session_evidence_appended",
        "session_security_event_appended",
        "session_cookies_set",
      ],
      failure_side_effects: ["authentication_limiter_may_advance"],
      execution_authority: false,
      mutation_authority: false,
    });
  });

  it("creates one denial that discloses only possible limiter change", () => {
    expect(createGatewaySessionIssueFailureV1()).toEqual({
      contract: "lnsat.gateway.session_issue.v1_0",
      contract_version: "lnsat.contracts.v1_0",
      ok: false,
      session: null,
      errors: [
        {
          code: "gateway.session_issue.denied",
          path: "/session",
          message: "Session issue denied.",
          severity: "error",
        },
      ],
      side_effects: ["authentication_limiter_may_advance"],
      session_state_changed: false,
      execution_authority: false,
      mutation_authority: false,
    });
  });

  it("publishes separate closed request and response schemas", async () => {
    const requestSchema = JSON.parse(
      await readFile(
        join(packageRoot, "schemas", "gateway-session-issue-request-v1.schema.json"),
        "utf8",
      ),
    ) as Record<string, unknown>;
    const responseSchema = JSON.parse(
      await readFile(
        join(packageRoot, "schemas", "gateway-session-issue-response-v1.schema.json"),
        "utf8",
      ),
    ) as Record<string, unknown>;

    expect(requestSchema).toMatchObject({
      additionalProperties: false,
      required: ["identity_ref", "password", "lifetime_seconds"],
    });
    expect(requestSchema).toHaveProperty("properties.password.minLength", 15);
    expect(requestSchema).toHaveProperty("properties.password.maxLength", 128);
    expect(requestSchema).toHaveProperty("properties.lifetime_seconds.minimum", 60);
    expect(requestSchema).toHaveProperty("properties.lifetime_seconds.maximum", 3_600);
    expect(responseSchema.oneOf).toHaveLength(2);
    expect(responseSchema).toHaveProperty("$defs.success.additionalProperties", false);
    expect(responseSchema).toHaveProperty("$defs.failure.additionalProperties", false);
    expect(responseSchema).toHaveProperty(
      "$defs.success.properties.replay_semantics.const",
      "fresh_session_per_success",
    );
    expect(responseSchema).toHaveProperty(
      "$defs.failure.properties.side_effects.prefixItems.0.const",
      "authentication_limiter_may_advance",
    );
  });
});
