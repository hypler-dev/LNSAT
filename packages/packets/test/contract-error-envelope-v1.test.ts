import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  contractErrorEnvelopeV1Contract,
  createContractErrorV1,
} from "../src/index.js";

const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)));

describe("@lnsat/packets v1 contract error envelope", () => {
  it("freezes the common fail-closed envelope", () => {
    expect(contractErrorEnvelopeV1Contract).toEqual({
      contract_id: "lnsat.error_envelope.v1_0",
      contract_version: "lnsat.contracts.v1_0",
      schema_id: "lnsat.error_envelope.schema.v1_0",
      required_fields: ["ok", "errors", "side_effects"],
      family_result_fields: [
        "version",
        "packet",
        "policy_decision",
        "approval_request",
        "approval_decision",
        "audit_event",
      ],
      family_result_behavior: "exactly one documented family result field is null",
      error_item_fields: ["code", "path", "message", "severity"],
      code_identity: "stable namespaced identifier",
      path_identity: "RFC 6901 JSON Pointer rooted at /",
      message_stability: "public-safe human summary; not compatibility identity",
      raw_input_reflection: "forbidden",
      severity: "error",
      minimum_errors: 1,
      side_effects: [],
    });
  });

  it("creates the exact public-safe error item shape", () => {
    expect(
      createContractErrorV1(
        "packet_envelope.invalid_field",
        "/packet_id",
        "packet_id must satisfy the stable v1 format.",
      ),
    ).toEqual({
      code: "packet_envelope.invalid_field",
      path: "/packet_id",
      message: "packet_id must satisfy the stable v1 format.",
      severity: "error",
    });
  });

  it("publishes a closed schema for all frozen family result fields", async () => {
    const schema = JSON.parse(
      await readFile(
        join(packageRoot, "schemas", "contract-error-envelope-v1.schema.json"),
        "utf8",
      ),
    ) as Record<string, unknown>;

    expect(schema).toMatchObject({
      type: "object",
      additionalProperties: false,
      required: ["ok", "errors", "side_effects"],
    });
    expect(schema.oneOf).toHaveLength(6);
    expect(schema).toHaveProperty("$defs.error.additionalProperties", false);
    expect(schema).toHaveProperty("$defs.error.required", [
      "code",
      "path",
      "message",
      "severity",
    ]);
    expect(schema).toHaveProperty("properties.errors.minItems", 1);
    expect(schema).toHaveProperty("properties.side_effects.maxItems", 0);
  });
});
