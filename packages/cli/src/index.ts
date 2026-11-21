#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  hashUniversalPacket,
  validateUniversalPacket,
  type PacketValidationError,
} from "@lnsat/packets";

export const CLI_STATUS = "bp-0005-packet-smoke";

type PacketCommand = "validate" | "hash";

type CliWriter = {
  write(chunk: string): void;
};

type CliIo = {
  stdout: CliWriter;
  stderr: CliWriter;
  cwd: string;
};

type CliError = {
  code: "cli.usage" | "cli.read_failed" | "cli.invalid_json";
  path: string;
  message: string;
  severity: "error";
};

type CliFailure = {
  ok: false;
  command: string;
  errors: Array<PacketValidationError | CliError>;
};

type CliSuccess =
  | {
      ok: true;
      command: "packet.validate";
      packet_id: string;
      packet_type: string;
      errors: [];
    }
  | {
      ok: true;
      command: "packet.hash";
      packet_id: string;
      packet_type: string;
      hash: string;
      errors: [];
    };

export async function runCli(
  argv = process.argv.slice(2),
  io: CliIo = {
    stdout: process.stdout,
    stderr: process.stderr,
    cwd: process.cwd(),
  },
): Promise<number> {
  const parsed = parseArgs(argv);
  if (!parsed.ok) {
    writeJson(io.stderr, parsed.result);
    return 2;
  }

  const { command, inputPath } = parsed;
  const value = await readPacketInput(inputPath, io.cwd, command);
  if (!value.ok) {
    writeJson(io.stderr, value.result);
    return 2;
  }

  const validation = validateUniversalPacket(value.value);
  if (!validation.ok) {
    writeJson(io.stdout, {
      ok: false,
      command: `packet.${command}`,
      errors: validation.errors,
    });
    return 1;
  }

  if (command === "validate") {
    writeJson(io.stdout, {
      ok: true,
      command: "packet.validate",
      packet_id: validation.packet.packet_id,
      packet_type: validation.packet.packet_type,
      errors: [],
    });
    return 0;
  }

  writeJson(io.stdout, {
    ok: true,
    command: "packet.hash",
    packet_id: validation.packet.packet_id,
    packet_type: validation.packet.packet_type,
    hash: await hashUniversalPacket(validation.packet),
    errors: [],
  });
  return 0;
}

function parseArgs(
  argv: string[],
):
  | { ok: true; command: PacketCommand; inputPath: string }
  | { ok: false; result: CliFailure } {
  const [domain, command, inputPath, extra] = argv;

  if (
    domain !== "packet" ||
    !isPacketCommand(command) ||
    inputPath === undefined ||
    extra !== undefined
  ) {
    return {
      ok: false,
      result: {
        ok: false,
        command: "usage",
        errors: [
          {
            code: "cli.usage",
            path: "",
            message: "Usage: lnsat packet <validate|hash> <packet.json>",
            severity: "error",
          },
        ],
      },
    };
  }

  return { ok: true, command, inputPath };
}

async function readPacketInput(
  inputPath: string,
  cwd: string,
  command: PacketCommand,
): Promise<{ ok: true; value: unknown } | { ok: false; result: CliFailure }> {
  let raw: string;
  const path = resolve(cwd, inputPath);

  try {
    raw = await readFile(path, "utf8");
  } catch {
    return cliReadFailure(command, "cli.read_failed", "Unable to read input file.");
  }

  try {
    return { ok: true, value: JSON.parse(raw) };
  } catch {
    return cliReadFailure(
      command,
      "cli.invalid_json",
      "Input file must contain valid JSON.",
    );
  }
}

function cliReadFailure(
  command: PacketCommand,
  code: CliError["code"],
  message: string,
): { ok: false; result: CliFailure } {
  return {
    ok: false,
    result: {
      ok: false,
      command: `packet.${command}`,
      errors: [{ code, path: "", message, severity: "error" }],
    },
  };
}

function isPacketCommand(value: unknown): value is PacketCommand {
  return value === "validate" || value === "hash";
}

function writeJson(writer: CliWriter, result: CliSuccess | CliFailure): void {
  writer.write(`${JSON.stringify(result, null, 2)}\n`);
}

function isDirectEntrypoint(): boolean {
  const entrypoint = process.argv[1];
  return entrypoint !== undefined && fileURLToPath(import.meta.url) === entrypoint;
}

if (isDirectEntrypoint()) {
  process.exitCode = await runCli();
}
