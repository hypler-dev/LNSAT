import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { validateUniversalPacket } from "../src/index.js";

const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const fixtureRoot = join(packageRoot, "fixtures");
const schemaRoot = join(packageRoot, "schemas");

describe("universal packet schemas", () => {
  it("ships schema files as loadable JSON", async () => {
    const schemaFiles = await jsonFiles(schemaRoot);

    expect(schemaFiles).toEqual([
      "agent-profile.schema.json",
      "contract-error-envelope-v1.schema.json",
      "gateway-approval-decision-request-v1.schema.json",
      "gateway-approval-decision-response-v1.schema.json",
      "gateway-approval-request-request-v1.schema.json",
      "gateway-approval-request-response-v1.schema.json",
      "gateway-identity-creation-request-v1.schema.json",
      "gateway-identity-creation-response-v1.schema.json",
      "gateway-identity-disablement-v1.schema.json",
      "gateway-identity-event-read-v1.schema.json",
      "gateway-identity-password-rotation-request-v1.schema.json",
      "gateway-identity-password-rotation-response-v1.schema.json",
      "gateway-session-event-read-v1.schema.json",
      "gateway-session-family-sign-out-v1.schema.json",
      "gateway-session-issue-request-v1.schema.json",
      "gateway-session-issue-response-v1.schema.json",
      "gateway-session-read-v1.schema.json",
      "gateway-session-rotation-v1.schema.json",
      "packet-envelope-v1.schema.json",
      "project-profile.schema.json",
      "universal-packet-definitions.schema.json",
      "universal-packet.schema.json",
    ]);

    for (const schemaFile of schemaFiles) {
      const schema = await readJson(join(schemaRoot, schemaFile));
      expect(schema).toMatchObject({
        $schema: "https://json-schema.org/draft/2020-12/schema",
      });
    }
  });
});

describe("universal packet fixtures", () => {
  it("loads all valid fixtures and accepts their packet shape", async () => {
    const validFixtures = await loadFixtures("valid");

    expect(validFixtures.map((fixture) => fixture.name)).toEqual([
      "context-packet.json",
      "execution-packet.json",
    ]);

    for (const fixture of validFixtures) {
      const result = validateUniversalPacket(fixture.value);
      expect(result).toMatchObject({ ok: true, errors: [] });
    }
  });

  it("loads all invalid fixtures and rejects them fail-closed", async () => {
    const invalidFixtures = await loadFixtures("invalid");

    expect(invalidFixtures.map((fixture) => fixture.name)).toEqual([
      "missing-required-field.json",
      "rejects-risk-out-of-range.json",
      "rejects-secret-value.json",
      "rejects-unknown-field.json",
    ]);

    for (const fixture of invalidFixtures) {
      const result = validateUniversalPacket(fixture.value);
      expect(result.ok, fixture.name).toBe(false);
      expect(result.errors.length, fixture.name).toBeGreaterThan(0);
      expect(result.errors[0]).toEqual(
        expect.objectContaining({
          code: expect.stringMatching(/^packet\./),
          path: expect.any(String),
          message: expect.any(String),
          severity: "error",
        }),
      );
    }
  });

  it("returns structured validation errors for audit-ready rejection paths", async () => {
    const invalidFixtures = await loadFixtures("invalid");
    const errorsByFixture = new Map(
      invalidFixtures.map((fixture) => [
        fixture.name,
        validateUniversalPacket(fixture.value).errors,
      ]),
    );

    expect(errorsByFixture.get("missing-required-field.json")).toContainEqual({
      code: "packet.missing_required_field",
      path: "/intent",
      message: "Missing required field 'intent'.",
      severity: "error",
    });
    expect(errorsByFixture.get("rejects-risk-out-of-range.json")).toContainEqual({
      code: "packet.invalid_field",
      path: "/risk_level",
      message: "risk_level must be an integer from 0 through 8.",
      severity: "error",
    });
    expect(errorsByFixture.get("rejects-secret-value.json")).toContainEqual({
      code: "packet.secret_value_embedded",
      path: "/constraints/secret_value",
      message: "Packet constraints must not contain embedded secret values.",
      severity: "error",
    });
    expect(errorsByFixture.get("rejects-unknown-field.json")).toContainEqual({
      code: "packet.unexpected_field",
      path: "/shell",
      message: "Unexpected root field 'shell'.",
      severity: "error",
    });
  });
});

async function loadFixtures(
  kind: "valid" | "invalid",
): Promise<Array<{ name: string; value: unknown }>> {
  const root = join(fixtureRoot, kind);
  const files = await jsonFiles(root);
  return Promise.all(
    files.map(async (file) => ({
      name: file,
      value: await readJson(join(root, file)),
    })),
  );
}

async function jsonFiles(root: string): Promise<string[]> {
  const files = await readdir(root);
  return files.filter((file) => file.endsWith(".json")).sort();
}

async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, "utf8"));
}
