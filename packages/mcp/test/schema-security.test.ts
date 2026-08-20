import { afterEach, describe, expect, it, vi } from "vitest";
import {
  MCP_JSON_SCHEMA_URI,
  MCP_SCHEMA_MAX_DOCUMENT_BYTES,
  MCP_SCHEMA_MAX_REF_DEPTH,
  MCP_SCHEMA_MAX_VALUE_BYTES,
  inspectMcpJsonSchema202012,
  validateMcpJsonOutput,
  validateMcpJsonValue202012,
} from "../src/index.js";

afterEach(() => vi.restoreAllMocks());

describe("MCP JSON Schema 2020-12 security", () => {
  it("accepts bounded object input schemas and validates values", () => {
    const schema = {
      $schema: MCP_JSON_SCHEMA_URI,
      type: "object",
      required: ["name"],
      properties: { name: { type: "string", maxLength: 32 } },
      additionalProperties: false,
    };

    expect(inspectMcpJsonSchema202012(schema)).toMatchObject({
      ok: true,
      draft: "2020-12",
      side_effects: [],
    });
    expect(
      validateMcpJsonValue202012({ schema, value: { name: "safe" } }),
    ).toMatchObject({
      ok: true,
      value_bytes: 15,
      side_effects: [],
    });
    expect(validateMcpJsonValue202012({ schema, value: { name: 7 } })).toMatchObject({
      ok: false,
      error: { code: "mcp.schema.validation_failed" },
      side_effects: [],
    });
  });

  it("requires draft 2020-12 and object input roots", () => {
    expect(
      inspectMcpJsonSchema202012({
        $schema: "http://json-schema.org/draft-07/schema#",
        type: "object",
      }),
    ).toMatchObject({ ok: false, error: { code: "mcp.schema.wrong_draft" } });
    expect(inspectMcpJsonSchema202012({ type: "array" })).toMatchObject({
      ok: false,
      error: { code: "mcp.schema.input_root_not_object" },
    });
  });

  it("rejects external, missing, cyclic, and over-deep refs", () => {
    expect(
      inspectMcpJsonSchema202012({
        type: "object",
        $ref: "https://evil.example/schema",
      }),
    ).toMatchObject({
      ok: false,
      error: { code: "mcp.schema.external_ref_forbidden" },
    });
    expect(
      inspectMcpJsonSchema202012({ type: "object", $ref: "#/$defs/missing" }),
    ).toMatchObject({ ok: false, error: { code: "mcp.schema.invalid_local_ref" } });
    expect(
      inspectMcpJsonSchema202012({
        type: "object",
        $ref: "#/$defs/a",
        $defs: { a: { $ref: "#/$defs/a" } },
      }),
    ).toMatchObject({ ok: false, error: { code: "mcp.schema.ref_depth_exceeded" } });

    const definitions: Record<string, unknown> = {};
    for (let index = 0; index <= MCP_SCHEMA_MAX_REF_DEPTH + 1; index += 1) {
      definitions[`n${index}`] =
        index === MCP_SCHEMA_MAX_REF_DEPTH + 1
          ? { type: "string" }
          : { $ref: `#/$defs/n${index + 1}` };
    }
    expect(
      inspectMcpJsonSchema202012({
        type: "object",
        $ref: "#/$defs/n0",
        $defs: definitions,
      }),
    ).toMatchObject({ ok: false, error: { code: "mcp.schema.ref_depth_exceeded" } });
  });

  it("rejects dynamic regular expressions and oversized schema documents", () => {
    expect(
      inspectMcpJsonSchema202012({
        type: "object",
        properties: { value: { type: "string", pattern: "(a+)+$" } },
      }),
    ).toMatchObject({ ok: false, error: { code: "mcp.schema.regex_forbidden" } });
    expect(
      inspectMcpJsonSchema202012({
        type: "object",
        description: "x".repeat(MCP_SCHEMA_MAX_DOCUMENT_BYTES),
      }),
    ).toMatchObject({ ok: false, error: { code: "mcp.schema.document_too_large" } });
  });

  it("enforces nesting and rejects non-JSON cycles", () => {
    let nested: Record<string, unknown> = { type: "string" };
    for (let index = 0; index < 70; index += 1) {
      nested = { child: nested };
    }
    expect(inspectMcpJsonSchema202012({ type: "object", nested })).toMatchObject({
      ok: false,
      error: { code: "mcp.schema.too_deep" },
    });

    const cycle: Record<string, unknown> = { type: "object" };
    cycle.self = cycle;
    expect(inspectMcpJsonSchema202012(cycle)).toMatchObject({
      ok: false,
      error: { code: "mcp.schema.invalid_json_value" },
    });
    expect(validateMcpJsonOutput({ value: undefined })).toMatchObject({
      ok: false,
      error: { code: "mcp.schema.invalid_json_value" },
    });
    expect(validateMcpJsonOutput({ value: Number.NaN })).toMatchObject({
      ok: false,
      error: { code: "mcp.schema.invalid_json_value" },
    });
    expect(validateMcpJsonOutput({ value: new Date(0) })).toMatchObject({
      ok: false,
      error: { code: "mcp.schema.invalid_json_value" },
    });
  });

  it("allows any JSON output root but bounds output bytes", () => {
    expect(validateMcpJsonOutput(["ok", 1, false])).toMatchObject({
      ok: true,
      side_effects: [],
    });
    expect(validateMcpJsonOutput("x".repeat(MCP_SCHEMA_MAX_VALUE_BYTES))).toMatchObject(
      {
        ok: false,
        error: { code: "mcp.schema.value_too_large" },
      },
    );
  });

  it("fails closed when validation exceeds time budget", () => {
    vi.spyOn(performance, "now").mockReturnValueOnce(0).mockReturnValueOnce(251);
    expect(
      validateMcpJsonValue202012({
        schema: { type: "object" },
        value: {},
      }),
    ).toMatchObject({ ok: false, error: { code: "mcp.schema.validation_timeout" } });
  });
});
