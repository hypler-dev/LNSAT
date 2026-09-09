import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

export const PRODUCT_SURFACE_CONTRACT_ID = "lnsat.product_surface.v1";
export const PRODUCT_SURFACE_CONTRACT_ID_V2 = "lnsat.product_surface.v2";
export const CLI_OUTPUT_SCHEMA = "lnsat.cli.output.v1";
export const PRODUCT_SOURCE_VERSION = "0.1.0";

type ProductWriter = {
  write(chunk: string): void;
};

export type ProductSurfaceIo = {
  stdout: ProductWriter;
  stderr: ProductWriter;
};

const manifestPaths = new Map<string, string>([
  [
    PRODUCT_SURFACE_CONTRACT_ID,
    fileURLToPath(
      new URL(
        "../../../fixtures/contracts/phase10-product-surface-v1.json",
        import.meta.url,
      ),
    ),
  ],
  [
    PRODUCT_SURFACE_CONTRACT_ID_V2,
    fileURLToPath(
      new URL("../../../fixtures/contracts/product-surface-v2.json", import.meta.url),
    ),
  ],
]);

function manifestPathFor(contractId: string): string {
  const path = manifestPaths.get(contractId);
  if (path === undefined) {
    throw new Error("unsupported product surface manifest contract");
  }
  return path;
}

export async function loadProductSurfaceManifestRaw(
  contractId = PRODUCT_SURFACE_CONTRACT_ID,
): Promise<string> {
  const raw = await readFile(manifestPathFor(contractId), "utf8");
  const value = JSON.parse(raw) as unknown;
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    (value as Record<string, unknown>).contract_id !== contractId
  ) {
    throw new Error("product surface manifest is invalid");
  }
  return raw;
}

export async function loadProductSurfaceManifest(): Promise<Record<string, unknown>> {
  const value = JSON.parse(await loadProductSurfaceManifestRaw()) as unknown;
  return value as Record<string, unknown>;
}

export async function runProductSurfaceCommand(
  argv: string[],
  io: ProductSurfaceIo,
): Promise<number | null> {
  if (matches(argv, "--help") || matches(argv, "-h") || matches(argv, "help")) {
    io.stdout.write(lnsatUsage());
    return 0;
  }
  if (matches(argv, "--version") || matches(argv, "-V") || matches(argv, "version")) {
    io.stdout.write(`lnsat ${PRODUCT_SOURCE_VERSION} (source-only)\n`);
    return 0;
  }
  const manifestContract = manifestContractFromArgv(argv);
  if (manifestContract !== null) {
    io.stdout.write(await loadProductSurfaceManifestRaw(manifestContract));
    return 0;
  }
  if (argv.length === 2 && argv[0] === "completion") {
    const shell = argv[1];
    const source = shell === undefined ? null : completionSource(shell);
    if (source !== null) {
      io.stdout.write(source);
      return 0;
    }
  }
  if (matches(argv, "man")) {
    io.stdout.write(lnsatManPage());
    return 0;
  }
  return null;
}

export function lnsatUsage(): string {
  return [
    "Usage:",
    "  lnsat packet <validate|hash|inspect> <packet.json> [request_id]",
    "  lnsat manifest [--product-surface-contract <lnsat.product_surface.v1|lnsat.product_surface.v2>]",
    "  lnsat completion <bash|zsh|fish>",
    "  lnsat man",
    "  lnsat --help",
    "  lnsat --version",
    "",
  ].join("\n");
}

export function completionSource(shell: string): string | null {
  if (shell === "bash") {
    return "complete -W 'packet manifest completion man --product-surface-contract --help --version' lnsat\n";
  }
  if (shell === "zsh") {
    return "#compdef lnsat\n_arguments '1:command:(packet manifest completion man)' '--product-surface-contract' '*::argument:->args'\n";
  }
  if (shell === "fish") {
    return "complete -c lnsat -f -a 'packet manifest completion man'\ncomplete -c lnsat -f -l product-surface-contract\n";
  }
  return null;
}

export function lnsatManPage(): string {
  return [
    ".TH LNSAT 1",
    ".SH NAME",
    "lnsat - source-only LNSAT workflow dispatcher",
    ".SH SYNOPSIS",
    "lnsat packet <validate|hash|inspect> <packet.json> [request_id] | manifest [--product-surface-contract <lnsat.product_surface.v1|lnsat.product_surface.v2>]",
    ".SH SAFETY",
    "No command grants ambient authority. Current commands are read-only or pure local inspection.",
    "",
  ].join("\n");
}

function matches(argv: string[], argument: string): boolean {
  return argv.length === 1 && argv[0] === argument;
}

function manifestContractFromArgv(argv: string[]): string | null {
  if (matches(argv, "manifest")) return PRODUCT_SURFACE_CONTRACT_ID;
  if (
    argv.length === 3 &&
    argv[0] === "manifest" &&
    argv[1] === "--product-surface-contract" &&
    (argv[2] === PRODUCT_SURFACE_CONTRACT_ID ||
      argv[2] === PRODUCT_SURFACE_CONTRACT_ID_V2)
  ) {
    return argv[2];
  }
  return null;
}
