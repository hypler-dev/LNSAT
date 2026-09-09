import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  PRODUCT_SURFACE_CONTRACT_ID,
  PRODUCT_SURFACE_CONTRACT_ID_V2,
  completionSource,
  lnsatManPage,
  loadProductSurfaceManifest,
  loadProductSurfaceManifestRaw,
  runCli,
} from "../src/index.js";

const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const repoRoot = dirname(dirname(packageRoot));

describe("Phase 10 lnsat product surface", () => {
  it("loads exact shared target-neutral source manifest", async () => {
    const manifest = await loadProductSurfaceManifest();
    const fixture = JSON.parse(
      await readFile(
        join(repoRoot, "fixtures", "contracts", "phase10-product-surface-v1.json"),
        "utf8",
      ),
    );
    expect(manifest).toEqual(fixture);
    expect(manifest.contract_id).toBe(PRODUCT_SURFACE_CONTRACT_ID);
    expect(manifest).toMatchObject({
      supported_release: false,
      package_or_binary_claim: false,
      recovery: { served_mutation: false },
      service_manager: {
        install_implemented: false,
        start_implemented: false,
        automatic_start: false,
      },
    });
  });

  it("dispatches help, version, manifest, completion, and man without input reads", async () => {
    for (const argv of [
      ["--help"],
      ["--version"],
      ["manifest"],
      ["completion", "bash"],
      ["completion", "zsh"],
      ["completion", "fish"],
      ["man"],
    ]) {
      const stdout = createBufferedWriter();
      const stderr = createBufferedWriter();
      const code = await runCli(argv, { stdout, stderr, cwd: repoRoot });
      expect(code, argv.join(" ")).toBe(0);
      expect(stdout.text(), argv.join(" ")).not.toBe("");
      expect(stderr.text(), argv.join(" ")).toBe("");
    }
  });

  it("returns exact raw manifest bytes for default and exact selectors", async () => {
    for (const [argv, contractId, fixture] of [
      [["manifest"], PRODUCT_SURFACE_CONTRACT_ID, "phase10-product-surface-v1.json"],
      [
        ["manifest", "--product-surface-contract", PRODUCT_SURFACE_CONTRACT_ID],
        PRODUCT_SURFACE_CONTRACT_ID,
        "phase10-product-surface-v1.json",
      ],
      [
        ["manifest", "--product-surface-contract", PRODUCT_SURFACE_CONTRACT_ID_V2],
        PRODUCT_SURFACE_CONTRACT_ID_V2,
        "product-surface-v2.json",
      ],
    ] as const) {
      const stdout = createBufferedWriter();
      const stderr = createBufferedWriter();
      expect(await runCli(argv, { stdout, stderr }, repoRoot)).toBe(0);
      const rawFixture = await readFile(
        join(repoRoot, "fixtures", "contracts", fixture),
        "utf8",
      );
      expect(stdout.text()).toBe(rawFixture);
      expect(await loadProductSurfaceManifestRaw(contractId)).toBe(rawFixture);
      expect(stderr.text()).toBe("");
    }
  });

  it("rejects invalid, range, and duplicate manifest selectors", async () => {
    for (const argv of [
      ["manifest", "--product-surface-contract", "lnsat.product_surface.v9"],
      ["manifest", "--product-surface-contract", "lnsat.product_surface.v1,v2"],
      [
        "manifest",
        "--product-surface-contract",
        PRODUCT_SURFACE_CONTRACT_ID,
        "--product-surface-contract",
        PRODUCT_SURFACE_CONTRACT_ID_V2,
      ],
    ]) {
      const stdout = createBufferedWriter();
      expect(
        await runCli(argv, { stdout, stderr: createBufferedWriter() }, repoRoot),
      ).toBe(2);
      expect(stdout.text()).toBe("");
    }
  });

  it("generates only declared completion shells and source-only safe man text", () => {
    for (const shell of ["bash", "zsh", "fish"]) {
      expect(completionSource(shell)).toContain("lnsat");
    }
    expect(completionSource("powershell")).toBeNull();
    expect(lnsatManPage()).toContain("No command grants ambient authority");
    expect(lnsatManPage()).not.toContain("sudo");
  });
});

function createBufferedWriter(): { write(chunk: string): void; text(): string } {
  let value = "";
  return {
    write(chunk: string) {
      value += chunk;
    },
    text() {
      return value;
    },
  };
}
