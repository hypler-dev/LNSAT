import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

export const PRODUCT_SURFACE_CONTRACT_ID = "lnsat.product_surface.v1";
export const CLI_OUTPUT_SCHEMA = "lnsat.cli.output.v1";
export const PRODUCT_SOURCE_VERSION = "0.1.0";

type ProductWriter = {
  write(chunk: string): void;
};

export type ProductSurfaceIo = {
  stdout: ProductWriter;
  stderr: ProductWriter;
};

const manifestPath = fileURLToPath(
  new URL(
    "../../../fixtures/contracts/phase10-product-surface-v1.json",
    import.meta.url,
  ),
);

export async function loadProductSurfaceManifest(): Promise<Record<string, unknown>> {
  const value = JSON.parse(await readFile(manifestPath, "utf8")) as unknown;
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    (value as Record<string, unknown>).contract_id !== PRODUCT_SURFACE_CONTRACT_ID
  ) {
    throw new Error("phase10 product surface manifest is invalid");
  }
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
  if (matches(argv, "manifest")) {
    io.stdout.write(`${JSON.stringify(await loadProductSurfaceManifest(), null, 2)}\n`);
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
    "  lnsat manifest",
    "  lnsat completion <bash|zsh|fish>",
    "  lnsat man",
    "  lnsat --help",
    "  lnsat --version",
    "",
  ].join("\n");
}

export function completionSource(shell: string): string | null {
  if (shell === "bash") {
    return "complete -W 'packet manifest completion man --help --version' lnsat\n";
  }
  if (shell === "zsh") {
    return "#compdef lnsat\n_arguments '1:command:(packet manifest completion man)' '*::argument:->args'\n";
  }
  if (shell === "fish") {
    return "complete -c lnsat -f -a 'packet manifest completion man'\n";
  }
  return null;
}

export function lnsatManPage(): string {
  return [
    ".TH LNSAT 1",
    ".SH NAME",
    "lnsat - source-only LNSAT workflow dispatcher",
    ".SH SYNOPSIS",
    "lnsat packet <validate|hash|inspect> <packet.json> [request_id]",
    ".SH SAFETY",
    "No command grants ambient authority. Current commands are read-only or pure local inspection.",
    "",
  ].join("\n");
}

function matches(argv: string[], argument: string): boolean {
  return argv.length === 1 && argv[0] === argument;
}
