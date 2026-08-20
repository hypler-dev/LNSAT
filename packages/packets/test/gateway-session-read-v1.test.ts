import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  createGatewaySessionReadFailureV1,
  gatewaySessionReadV1Contract,
} from "../src/index.js";

const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)));

describe("@lnsat/packets Gateway session-read v1 contract", () => {
  it("freezes authenticated current-session read scope", () => {
    expect(gatewaySessionReadV1Contract).toEqual({
      contract_id: "lnsat.gateway.session_read.v1_0",
      contract_version: "lnsat.contracts.v1_0",
      path: "/v1/session",
      methods: ["GET", "HEAD"],
      authentication: "active local browser session",
      scope: "current_session_only",
      roles: ["owner", "operator", "auditor"],
      failure_oracle: "one generic denial",
      failure_code: "gateway.session_read.denied",
      raw_secret_reflection: "forbidden",
      success_side_effects: ["session_activity_evidence_may_append"],
      failure_side_effects: [],
      execution_authority: false,
      mutation_authority: false,
    });
  });

  it("creates one closed public-safe denial", () => {
    expect(createGatewaySessionReadFailureV1()).toEqual({
      contract: "lnsat.gateway.session_read.v1_0",
      contract_version: "lnsat.contracts.v1_0",
      ok: false,
      session: null,
      errors: [
        {
          code: "gateway.session_read.denied",
          path: "/session",
          message: "Session read denied.",
          severity: "error",
        },
      ],
      side_effects: [],
      mutation_authority: false,
    });
  });

  it("publishes closed success and failure schemas", async () => {
    const schema = JSON.parse(
      await readFile(
        join(packageRoot, "schemas", "gateway-session-read-v1.schema.json"),
        "utf8",
      ),
    ) as Record<string, unknown>;

    expect(schema.oneOf).toHaveLength(2);
    expect(schema).toHaveProperty("$defs.success.additionalProperties", false);
    expect(schema).toHaveProperty("$defs.failure.additionalProperties", false);
    expect(schema).toHaveProperty("$defs.session.additionalProperties", false);
    expect(schema).toHaveProperty(
      "$defs.success.properties.side_effects.prefixItems.0.const",
      "session_activity_evidence_may_append",
    );
    expect(schema).toHaveProperty(
      "$defs.failure.properties.errors.prefixItems.0.$ref",
      "#/$defs/error",
    );
    expect(schema).toHaveProperty(
      "$defs.error.properties.code.const",
      "gateway.session_read.denied",
    );
  });
});
