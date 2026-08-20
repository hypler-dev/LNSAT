import { validate, type Schema } from "@cfworker/json-schema";

export const MCP_JSON_SCHEMA_DRAFT = "2020-12" as const;
export const MCP_JSON_SCHEMA_URI =
  "https://json-schema.org/draft/2020-12/schema" as const;
export const MCP_SCHEMA_MAX_DOCUMENT_BYTES = 262_144;
export const MCP_SCHEMA_MAX_DEPTH = 64;
export const MCP_SCHEMA_MAX_REF_DEPTH = 32;
export const MCP_SCHEMA_MAX_NODES = 25_000;
export const MCP_SCHEMA_MAX_VALIDATION_MS = 250;
export const MCP_SCHEMA_MAX_VALUE_BYTES = 1_048_576;

export type McpSchemaSecurityErrorCode =
  | "mcp.schema.invalid_json_value"
  | "mcp.schema.document_too_large"
  | "mcp.schema.too_deep"
  | "mcp.schema.too_many_nodes"
  | "mcp.schema.wrong_draft"
  | "mcp.schema.input_root_not_object"
  | "mcp.schema.external_ref_forbidden"
  | "mcp.schema.invalid_local_ref"
  | "mcp.schema.ref_depth_exceeded"
  | "mcp.schema.regex_forbidden"
  | "mcp.schema.value_too_large"
  | "mcp.schema.validation_timeout"
  | "mcp.schema.validation_failed";

export type McpSchemaSecurityResult =
  | {
      ok: true;
      draft: typeof MCP_JSON_SCHEMA_DRAFT;
      document_bytes: number;
      value_bytes?: number;
      validation_ms?: number;
      side_effects: [];
    }
  | {
      ok: false;
      error: {
        code: McpSchemaSecurityErrorCode;
        message: string;
        keyword?: string;
        instance_location?: string;
        schema_location?: string;
      };
      side_effects: [];
    };

export function inspectMcpJsonSchema202012(
  schema: unknown,
  root: "object" | "any" = "object",
): McpSchemaSecurityResult {
  const serialized = serializeJson(schema);
  if (!serialized.ok) {
    return schemaFailure("mcp.schema.invalid_json_value", "Schema must be JSON.");
  }
  const documentBytes = Buffer.byteLength(serialized.value);
  if (documentBytes > MCP_SCHEMA_MAX_DOCUMENT_BYTES) {
    return schemaFailure(
      "mcp.schema.document_too_large",
      "Schema document exceeds limit.",
    );
  }
  if (!isPlainObject(schema)) {
    return schemaFailure(
      "mcp.schema.invalid_json_value",
      "Schema root must be an object.",
    );
  }
  if (schema.$schema !== undefined && schema.$schema !== MCP_JSON_SCHEMA_URI) {
    return schemaFailure("mcp.schema.wrong_draft", "Schema must use draft 2020-12.");
  }
  if (root === "object" && schema.type !== "object") {
    return schemaFailure(
      "mcp.schema.input_root_not_object",
      "Input schema root type must be object.",
    );
  }

  const structure = inspectStructure(schema);
  if (!structure.ok) {
    return structure;
  }
  const refs = inspectLocalReferences(schema, structure.refs);
  if (!refs.ok) {
    return refs;
  }
  return {
    ok: true,
    draft: MCP_JSON_SCHEMA_DRAFT,
    document_bytes: documentBytes,
    side_effects: [],
  };
}

export function validateMcpJsonValue202012(input: {
  schema: unknown;
  value: unknown;
  schema_root?: "object" | "any";
}): McpSchemaSecurityResult {
  const inspected = inspectMcpJsonSchema202012(input.schema, input.schema_root);
  if (!inspected.ok) {
    return inspected;
  }
  const serialized = serializeJson(input.value);
  if (!serialized.ok) {
    return schemaFailure("mcp.schema.invalid_json_value", "Value must be JSON.");
  }
  const valueBytes = Buffer.byteLength(serialized.value);
  if (valueBytes > MCP_SCHEMA_MAX_VALUE_BYTES) {
    return schemaFailure("mcp.schema.value_too_large", "JSON value exceeds limit.");
  }
  const valueStructure = inspectStructure(input.value, false);
  if (!valueStructure.ok) {
    return valueStructure;
  }

  const started = performance.now();
  let validation: ReturnType<typeof validate>;
  try {
    validation = validate(input.value, input.schema as Schema, MCP_JSON_SCHEMA_DRAFT);
  } catch {
    return schemaFailure(
      "mcp.schema.validation_failed",
      "Schema validation failed closed.",
    );
  }
  const validationMs = performance.now() - started;
  if (validationMs > MCP_SCHEMA_MAX_VALIDATION_MS) {
    return schemaFailure(
      "mcp.schema.validation_timeout",
      "Schema validation exceeded limit.",
    );
  }
  if (!validation.valid) {
    const first = validation.errors[0];
    return {
      ok: false,
      error: {
        code: "mcp.schema.validation_failed",
        message: "JSON value does not match schema.",
        ...(first === undefined
          ? {}
          : {
              keyword: safePath(first.keyword),
              instance_location: safePath(first.instanceLocation),
              schema_location: safePath(first.keywordLocation),
            }),
      },
      side_effects: [],
    };
  }
  return {
    ok: true,
    draft: MCP_JSON_SCHEMA_DRAFT,
    document_bytes: inspected.document_bytes,
    value_bytes: valueBytes,
    validation_ms: validationMs,
    side_effects: [],
  };
}

export function validateMcpJsonOutput(value: unknown): McpSchemaSecurityResult {
  const serialized = serializeJson(value);
  if (!serialized.ok) {
    return schemaFailure("mcp.schema.invalid_json_value", "Output must be JSON.");
  }
  const valueBytes = Buffer.byteLength(serialized.value);
  if (valueBytes > MCP_SCHEMA_MAX_VALUE_BYTES) {
    return schemaFailure("mcp.schema.value_too_large", "JSON output exceeds limit.");
  }
  const structure = inspectStructure(value, false);
  if (!structure.ok) {
    return structure;
  }
  return {
    ok: true,
    draft: MCP_JSON_SCHEMA_DRAFT,
    document_bytes: 0,
    value_bytes: valueBytes,
    side_effects: [],
  };
}

function inspectStructure(
  root: unknown,
  collectRefs = true,
): { ok: true; refs: string[] } | Extract<McpSchemaSecurityResult, { ok: false }> {
  const stack: Array<{ value: unknown; depth: number }> = [{ value: root, depth: 0 }];
  const refs: string[] = [];
  let nodes = 0;
  while (stack.length > 0) {
    const current = stack.pop()!;
    nodes += 1;
    if (nodes > MCP_SCHEMA_MAX_NODES) {
      return schemaFailure(
        "mcp.schema.too_many_nodes",
        "JSON node count exceeds limit.",
      );
    }
    if (current.depth > MCP_SCHEMA_MAX_DEPTH) {
      return schemaFailure("mcp.schema.too_deep", "JSON nesting exceeds limit.");
    }
    if (Array.isArray(current.value)) {
      for (const value of current.value) {
        stack.push({ value, depth: current.depth + 1 });
      }
      continue;
    }
    if (!isPlainObject(current.value)) {
      if (
        (typeof current.value === "object" && current.value !== null) ||
        current.value === undefined ||
        typeof current.value === "function" ||
        typeof current.value === "symbol" ||
        typeof current.value === "bigint" ||
        (typeof current.value === "number" && !Number.isFinite(current.value))
      ) {
        return schemaFailure(
          "mcp.schema.invalid_json_value",
          "Value must contain only JSON.",
        );
      }
      continue;
    }
    for (const [key, value] of Object.entries(current.value)) {
      if (collectRefs && key === "$ref") {
        if (typeof value !== "string" || !value.startsWith("#")) {
          return schemaFailure(
            "mcp.schema.external_ref_forbidden",
            "External schema references are forbidden.",
          );
        }
        refs.push(value);
      }
      if (collectRefs && (key === "pattern" || key === "patternProperties")) {
        return schemaFailure(
          "mcp.schema.regex_forbidden",
          "Dynamic schema regular expressions are forbidden.",
        );
      }
      stack.push({ value, depth: current.depth + 1 });
    }
  }
  return { ok: true, refs };
}

function inspectLocalReferences(
  root: Record<string, unknown>,
  refs: string[],
): { ok: true } | Extract<McpSchemaSecurityResult, { ok: false }> {
  for (const ref of refs) {
    let cursor: unknown = resolveJsonPointer(root, ref);
    if (cursor === undefined) {
      return schemaFailure(
        "mcp.schema.invalid_local_ref",
        "Local schema reference is invalid.",
      );
    }
    const seen = new Set<unknown>();
    let depth = 0;
    while (isPlainObject(cursor) && typeof cursor.$ref === "string") {
      depth += 1;
      if (depth > MCP_SCHEMA_MAX_REF_DEPTH || seen.has(cursor)) {
        return schemaFailure(
          "mcp.schema.ref_depth_exceeded",
          "Local schema reference depth exceeds limit.",
        );
      }
      seen.add(cursor);
      if (!cursor.$ref.startsWith("#")) {
        return schemaFailure(
          "mcp.schema.external_ref_forbidden",
          "External schema references are forbidden.",
        );
      }
      cursor = resolveJsonPointer(root, cursor.$ref);
      if (cursor === undefined) {
        return schemaFailure(
          "mcp.schema.invalid_local_ref",
          "Local schema reference is invalid.",
        );
      }
    }
  }
  return { ok: true };
}

function resolveJsonPointer(root: unknown, ref: string): unknown {
  if (ref === "#") {
    return root;
  }
  if (!ref.startsWith("#/")) {
    return undefined;
  }
  let cursor = root;
  for (const rawPart of ref.slice(2).split("/")) {
    const part = rawPart.replace(/~1/g, "/").replace(/~0/g, "~");
    if (!isPlainObject(cursor) && !Array.isArray(cursor)) {
      return undefined;
    }
    if (!Object.prototype.hasOwnProperty.call(cursor, part)) {
      return undefined;
    }
    cursor = (cursor as Record<string, unknown>)[part];
  }
  return cursor;
}

function serializeJson(value: unknown): { ok: true; value: string } | { ok: false } {
  try {
    const serialized = JSON.stringify(value);
    return serialized === undefined ? { ok: false } : { ok: true, value: serialized };
  } catch {
    return { ok: false };
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function safePath(value: string): string {
  return /^[A-Za-z0-9_#./~-]{0,256}$/.test(value) ? value : "";
}

function schemaFailure(
  code: McpSchemaSecurityErrorCode,
  message: string,
): Extract<McpSchemaSecurityResult, { ok: false }> {
  return { ok: false, error: { code, message }, side_effects: [] };
}
