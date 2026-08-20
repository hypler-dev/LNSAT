import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { CLI_STATUS, runCli } from "../src/index.js";

const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const repoRoot = dirname(dirname(packageRoot));
const validFixtureRoot = join(repoRoot, "packages", "packets", "fixtures", "valid");
const invalidFixtureRoot = join(repoRoot, "packages", "packets", "fixtures", "invalid");

describe("@lnsat/cli packet smoke", () => {
  it("exports neutral source-only status metadata", () => {
    expect(CLI_STATUS).toBe("source_only");
    expect(CLI_STATUS).not.toMatch(/^bp-\d{4}/u);
  });

  it("validates a packet file and prints structured success JSON", async () => {
    const output = createBufferedWriter();
    const code = await runCli(
      ["packet", "validate", join(validFixtureRoot, "context-packet.json")],
      { stdout: output, stderr: createBufferedWriter(), cwd: repoRoot },
    );

    expect(code).toBe(0);
    expect(JSON.parse(output.text())).toEqual({
      ok: true,
      command: "packet.validate",
      packet_id: "pkt_context_0001",
      packet_type: "ContextPacket",
      errors: [],
    });
  });

  it("hashes a valid packet file with canonical sha256 output", async () => {
    const output = createBufferedWriter();
    const fixture = join(validFixtureRoot, "context-packet.json");
    const code = await runCli(["packet", "hash", fixture], {
      stdout: output,
      stderr: createBufferedWriter(),
      cwd: repoRoot,
    });

    const packet = JSON.parse(await readFile(fixture, "utf8")) as Record<
      string,
      unknown
    >;
    const canonicalPacket = JSON.stringify(sortJson(packet));
    const expectedHash = createHash("sha256").update(canonicalPacket).digest("hex");

    expect(code).toBe(0);
    expect(JSON.parse(output.text())).toEqual({
      ok: true,
      command: "packet.hash",
      packet_id: "pkt_context_0001",
      packet_type: "ContextPacket",
      hash: `sha256:${expectedHash}`,
      errors: [],
    });
  });

  it("fails closed with structured validation errors for invalid packets", async () => {
    const output = createBufferedWriter();
    const code = await runCli(
      ["packet", "validate", join(invalidFixtureRoot, "rejects-secret-value.json")],
      { stdout: output, stderr: createBufferedWriter(), cwd: repoRoot },
    );

    expect(code).toBe(1);
    expect(JSON.parse(output.text())).toEqual({
      ok: false,
      command: "packet.validate",
      errors: [
        {
          code: "packet.secret_value_embedded",
          path: "/constraints/secret_value",
          message: "Packet constraints must not contain embedded secret values.",
          severity: "error",
        },
      ],
    });
  });

  it("shows packet usage with transport-neutral inspection command and optional request id", async () => {
    const output = createBufferedWriter();
    const code = await runCli(
      ["packet", "unknown", "file.json", "req_does_not_matter"],
      {
        stdout: createBufferedWriter(),
        stderr: output,
        cwd: repoRoot,
      },
    );

    expect(code).toBe(2);
    expect(JSON.parse(output.text())).toEqual({
      ok: false,
      command: "usage",
      errors: [
        {
          code: "cli.usage",
          path: "",
          message:
            "Usage: lnsat packet <validate|hash|inspect> <packet.json> [request_id]",
          severity: "error",
        },
      ],
    });
  });

  it("rejects request ids on validate and hash commands", async () => {
    for (const command of ["validate", "hash"]) {
      const output = createBufferedWriter();
      const code = await runCli(
        [
          "packet",
          command,
          join(validFixtureRoot, "context-packet.json"),
          "req_only_valid_for_inspect",
        ],
        {
          stdout: createBufferedWriter(),
          stderr: output,
          cwd: repoRoot,
        },
      );

      expect(code).toBe(2);
      expect(JSON.parse(output.text())).toMatchObject({
        ok: false,
        command: "usage",
      });
    }
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

function sortJson(value: unknown): unknown {
  if (value === null || typeof value !== "object") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(sortJson);
  }

  return Object.fromEntries(
    Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => [key, sortJson(item)]),
  );
}
