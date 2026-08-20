import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  createGatewaySessionRotationFailureV1,
  gatewaySessionRotationV1Contract,
} from "../src/index.js";

const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)));

describe("@lnsat/packets Gateway session-rotation v1 contract", () => {
  it("freezes current-session scope, one-time replay, and exact effects", () => {
    expect(gatewaySessionRotationV1Contract).toEqual({
      contract_id: "lnsat.gateway.session_rotation.v1_0",
      contract_version: "lnsat.contracts.v1_0",
      path: "/v1/session",
      method: "PATCH",
      authentication: "active local browser session plus double-submit CSRF",
      scope: "current_session_only",
      roles: ["owner", "operator", "auditor"],
      request_body: "exact_empty_json_framing",
      csrf: "required_double_submit",
      absolute_expiry: "preserve_original",
      replay_semantics: "one_time_current_session",
      failure_oracle: "one generic denial",
      failure_code: "gateway.session_rotation.denied",
      success_side_effects: [
        "session_activity_evidence_may_append",
        "prior_session_revocation_appended",
        "replacement_session_evidence_appended",
        "session_rotation_evidence_appended",
        "session_security_events_appended",
        "session_cookies_set",
      ],
      failure_side_effects: [],
      execution_authority: false,
      mutation_authority: false,
    });
  });

  it("creates one zero-side-effect denial without session evidence", () => {
    expect(createGatewaySessionRotationFailureV1()).toEqual({
      contract: "lnsat.gateway.session_rotation.v1_0",
      contract_version: "lnsat.contracts.v1_0",
      ok: false,
      prior_session_id: null,
      session: null,
      errors: [
        {
          code: "gateway.session_rotation.denied",
          path: "/session",
          message: "Session rotation denied.",
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
        join(packageRoot, "schemas", "gateway-session-rotation-v1.schema.json"),
        "utf8",
      ),
    ) as Record<string, unknown>;

    expect(schema.oneOf).toHaveLength(2);
    expect(schema).toHaveProperty("$defs.success.additionalProperties", false);
    expect(schema).toHaveProperty("$defs.failure.additionalProperties", false);
    expect(schema).toHaveProperty(
      "$defs.success.properties.replay_semantics.const",
      "one_time_current_session",
    );
    expect(schema).toHaveProperty(
      "$defs.success.properties.absolute_expiry_preserved.const",
      true,
    );
    expect(schema).toHaveProperty(
      "$defs.transport.properties.csrf_verified.const",
      true,
    );
    expect(schema).toHaveProperty("$defs.failure.properties.side_effects.maxItems", 0);
  });
});
