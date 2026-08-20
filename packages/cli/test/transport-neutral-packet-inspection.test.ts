import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, describe, expect, it } from "vitest";
import { buildApiGateway } from "../../../apps/api/src/index.js";
import { packetInspectionGatewayContract } from "../../../packages/gateway/src/index.js";
import {
  inspectPacketThroughMcpAdapterContract,
  mcpPacketInspectionToolContract,
} from "../../../packages/mcp/src/index.js";
import { runCli } from "../src/index.js";

const now = new Date("2026-05-03T00:00:00.000Z");
const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const repoRoot = dirname(dirname(packageRoot));
const fixtureRoot = join(repoRoot, "packages", "packets", "fixtures");

describe("@lnsat/cli packet inspect transport-neutral contract", () => {
  const gateway = buildApiGateway({ now: () => now });

  afterAll(async () => {
    await gateway.close();
  });

  it("matches API and MCP behavior for valid packet inspection", async () => {
    const requestId = "req_tn1_valid";
    const packet = await readFixture("valid/context-packet.json");
    const cliOutput = createBufferedWriter();
    const cliCode = await runCli(
      [
        "packet",
        "inspect",
        join(fixtureRoot, "valid", "context-packet.json"),
        requestId,
      ],
      {
        stdout: cliOutput,
        stderr: createBufferedWriter(),
        cwd: repoRoot,
      },
      now,
    );

    const apiResponse = await gateway.inject({
      method: packetInspectionGatewayContract.method,
      url: packetInspectionGatewayContract.path,
      payload: {
        request_id: requestId,
        packet,
      },
    });
    const mcpResponse = await inspectPacketThroughMcpAdapterContract(
      { request_id: requestId, packet },
      { now },
    );
    const cliResult = JSON.parse(cliOutput.text());
    const apiJson = apiResponse.json();

    expect(cliCode).toBe(0);
    expect(apiResponse.statusCode).toBe(200);
    expect(cliResult).toEqual({
      ok: true,
      command: "packet.inspect",
      gateway_contract_id: packetInspectionGatewayContract.contract_id,
      gateway_response: apiJson,
      side_effects: [],
    });
    expect(mcpResponse).toMatchObject({
      ok: true,
      tool: mcpPacketInspectionToolContract.tool,
      gateway_contract_id: packetInspectionGatewayContract.contract_id,
      side_effects: [],
      gateway_response: {
        ok: true,
        contract_id: packetInspectionGatewayContract.contract_id,
        request_id: requestId,
      },
    });
    expect(mcpResponse.gateway_response).toEqual(apiJson);
  });

  it("rejects invalid packets identically and avoids raw secret echo", async () => {
    const requestId = "req_tn1_secret";
    const packet = await readFixture("invalid/rejects-secret-value.json");
    const cliOutput = createBufferedWriter();
    const cliCode = await runCli(
      [
        "packet",
        "inspect",
        join(fixtureRoot, "invalid", "rejects-secret-value.json"),
        requestId,
      ],
      {
        stdout: cliOutput,
        stderr: createBufferedWriter(),
        cwd: repoRoot,
      },
      now,
    );

    const apiResponse = await gateway.inject({
      method: packetInspectionGatewayContract.method,
      url: packetInspectionGatewayContract.path,
      payload: {
        request_id: requestId,
        packet,
      },
    });
    const mcpResponse = await inspectPacketThroughMcpAdapterContract(
      { request_id: requestId, packet },
      { now },
    );
    const cliResult = JSON.parse(cliOutput.text());
    const apiJson = apiResponse.json();

    expect(cliCode).toBe(1);
    expect(apiResponse.statusCode).toBe(422);
    expect(cliResult).toMatchObject({
      ok: false,
      command: "packet.inspect",
      gateway_contract_id: packetInspectionGatewayContract.contract_id,
      side_effects: [],
      gateway_response: {
        ok: false,
        contract_id: packetInspectionGatewayContract.contract_id,
        request_id: requestId,
        validation: {
          ok: false,
        },
      },
    });
    expect(cliResult.gateway_response).toEqual(apiJson);
    expect(mcpResponse.gateway_response).toEqual(apiJson);
    expect(mcpResponse).toMatchObject({
      ok: false,
      gateway_response: {
        ok: false,
        packet_ref: null,
        validation: {
          ok: false,
          errors: expect.arrayContaining([
            expect.objectContaining({
              code: "packet.secret_value_embedded",
              path: "/constraints/secret_value",
              severity: "error",
            }),
          ]),
        },
      },
    });
    expect(cliOutput.text()).not.toContain("do-not-store-secret-values");
    expect(JSON.stringify(apiJson)).not.toContain("do-not-store-secret-values");
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

async function readFixture(path: string): Promise<unknown> {
  return JSON.parse(await readFile(join(fixtureRoot, path), "utf8"));
}
