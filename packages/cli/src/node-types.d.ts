declare module "node:fs/promises" {
  export function readFile(path: string, encoding: "utf8"): Promise<string>;
}

declare module "node:path" {
  export function resolve(...paths: string[]): string;
}

declare module "node:url" {
  export function fileURLToPath(url: string): string;
}

declare const process: {
  argv: string[];
  pid: number;
  stdout: { write(chunk: string): void };
  stderr: { write(chunk: string): void };
  cwd(): string;
  exitCode?: number;
};

interface ImportMeta {
  url: string;
}
