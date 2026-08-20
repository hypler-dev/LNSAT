import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { validateProjectProfile } from "../src/index.js";

const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const fixtureRoot = join(packageRoot, "fixtures", "project-profiles");

describe("project profile fixtures", () => {
  it("loads source-backed valid project profiles", async () => {
    const validFixtures = await loadFixtures("valid");

    expect(validFixtures.map((fixture) => fixture.name)).toEqual([
      "lnsat-project-profile.json",
    ]);

    for (const fixture of validFixtures) {
      const result = validateProjectProfile(fixture.value);

      expect(result).toMatchObject({ ok: true, errors: [] });
      expect(result.ok && result.profile.source_refs).toEqual(
        expect.arrayContaining([
          "doc:docs/onboarding/PROJECT_ONBOARDING.md",
          "doc:packages/packets/fixtures/project-profiles/valid/lnsat-project-profile.json",
        ]),
      );
      expect(result.ok && result.profile.secrets.refs_only).toEqual([]);
    }
  });

  it("rejects invalid project profiles fail-closed", async () => {
    const invalidFixtures = await loadFixtures("invalid");

    expect(invalidFixtures.map((fixture) => fixture.name)).toEqual([
      "missing-required-field.json",
      "rejects-repo-without-source.json",
      "rejects-secret-value.json",
    ]);

    for (const fixture of invalidFixtures) {
      const result = validateProjectProfile(fixture.value);
      expect(result.ok, fixture.name).toBe(false);
      expect(result.errors.length, fixture.name).toBeGreaterThan(0);
      expect(result.errors[0]).toEqual(
        expect.objectContaining({
          code: expect.stringMatching(/^project_profile\./),
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
        validateProjectProfile(fixture.value).errors,
      ]),
    );

    expect(errorsByFixture.get("missing-required-field.json")).toContainEqual({
      code: "project_profile.missing_required_field",
      path: "/policies",
      message: "Missing required field 'policies'.",
      severity: "error",
    });
    expect(errorsByFixture.get("rejects-repo-without-source.json")).toContainEqual({
      code: "project_profile.invalid_field",
      path: "/repos/0",
      message: "repo profile must include a repo path or remote.",
      severity: "error",
    });
    expect(errorsByFixture.get("rejects-secret-value.json")).toContainEqual({
      code: "project_profile.secret_value_embedded",
      path: "/secrets/secret_value",
      message: "Project profile secrets must use references only.",
      severity: "error",
    });

    const secretErrors = JSON.stringify(
      errorsByFixture.get("rejects-secret-value.json"),
    );
    expect(secretErrors).not.toContain("redacted-inline-secret-placeholder");
    expect(secretErrors).not.toContain("secret:lnsat/demo/api-token");
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
