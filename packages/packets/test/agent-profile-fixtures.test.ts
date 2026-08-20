import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { validateAgentProfile } from "../src/index.js";

const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const fixtureRoot = join(packageRoot, "fixtures", "agent-profiles");

describe("agent profile fixtures", () => {
  it("loads source-backed valid agent profiles", async () => {
    const validFixtures = await loadFixtures("valid");

    expect(validFixtures.map((fixture) => fixture.name)).toEqual([
      "codex-observer-profile.json",
    ]);

    for (const fixture of validFixtures) {
      const result = validateAgentProfile(fixture.value);

      expect(result).toMatchObject({ ok: true, errors: [] });
      expect(result.ok && result.profile.source_refs).toEqual(
        expect.arrayContaining([
          "doc:docs/onboarding/AGENT_ONBOARDING.md",
          "doc:packages/packets/fixtures/agent-profiles/valid/codex-observer-profile.json",
        ]),
      );
      expect(result.ok && result.profile.projects_allowed).toEqual(["lnsat"]);
      expect(result.ok && result.profile.capabilities.block).toEqual(
        expect.arrayContaining(["secret.read.never", "deploy.prod"]),
      );
    }
  });

  it("rejects invalid agent profiles fail-closed", async () => {
    const invalidFixtures = await loadFixtures("invalid");

    expect(invalidFixtures.map((fixture) => fixture.name)).toEqual([
      "missing-required-field.json",
      "rejects-conflicting-capabilities.json",
      "rejects-empty-project-scope.json",
      "rejects-secret-value.json",
    ]);

    for (const fixture of invalidFixtures) {
      const result = validateAgentProfile(fixture.value);
      expect(result.ok, fixture.name).toBe(false);
      expect(result.errors.length, fixture.name).toBeGreaterThan(0);
      expect(result.errors[0]).toEqual(
        expect.objectContaining({
          code: expect.stringMatching(/^agent_profile\./),
          path: expect.any(String),
          message: expect.any(String),
          severity: "error",
        }),
      );
    }
  });

  it("returns audit-ready errors without echoing secret values", async () => {
    const invalidFixtures = await loadFixtures("invalid");
    const errorsByFixture = new Map(
      invalidFixtures.map((fixture) => [
        fixture.name,
        validateAgentProfile(fixture.value).errors,
      ]),
    );

    expect(errorsByFixture.get("missing-required-field.json")).toContainEqual({
      code: "agent_profile.missing_required_field",
      path: "/output_contract",
      message: "Missing required field 'output_contract'.",
      severity: "error",
    });
    expect(errorsByFixture.get("rejects-conflicting-capabilities.json")).toContainEqual(
      {
        code: "agent_profile.capability_conflict",
        path: "/capabilities/allow/1",
        message: "capability cannot be both allowed and blocked.",
        severity: "error",
      },
    );
    expect(errorsByFixture.get("rejects-empty-project-scope.json")).toContainEqual({
      code: "agent_profile.invalid_field",
      path: "/projects_allowed",
      message: "projects_allowed must contain at least one entry.",
      severity: "error",
    });
    expect(errorsByFixture.get("rejects-secret-value.json")).toContainEqual({
      code: "agent_profile.secret_value_embedded",
      path: "/session/secret_value",
      message: "Agent profile secrets must use references only.",
      severity: "error",
    });

    const secretErrors = JSON.stringify(
      errorsByFixture.get("rejects-secret-value.json"),
    );
    expect(secretErrors).not.toContain("redacted-inline-agent-secret");
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
