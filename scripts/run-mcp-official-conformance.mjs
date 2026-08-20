import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createLnsatMcpHttpHandler } from "../packages/mcp/dist/index.js";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const packageJson = JSON.parse(
  await readFile(
    join(repoRoot, "node_modules/@modelcontextprotocol/conformance/package.json"),
    "utf8",
  ),
);

if (packageJson.version !== "0.1.16") {
  throw new Error(
    `Expected @modelcontextprotocol/conformance 0.1.16, found ${String(packageJson.version)}.`,
  );
}

const outputDirectory = await mkdtemp(join(tmpdir(), "lnsat-mcp-conformance-"));
const handler = createLnsatMcpHttpHandler({}, "auto");
const server = createServer(async (request, response) => {
  try {
    const chunks = [];
    let bytes = 0;
    for await (const chunk of request) {
      bytes += chunk.length;
      if (bytes > 1_048_576) {
        response.writeHead(413, { "content-type": "application/json" });
        response.end('{"error":"request_too_large"}');
        return;
      }
      chunks.push(chunk);
    }
    const headers = new Headers();
    for (const [name, value] of Object.entries(request.headers)) {
      if (typeof value === "string") headers.set(name, value);
      else if (Array.isArray(value))
        value.forEach((item) => headers.append(name, item));
    }
    const method = request.method ?? "GET";
    const fetchRequest = new Request(
      `http://${request.headers.host ?? "127.0.0.1"}${request.url ?? "/mcp"}`,
      {
        method,
        headers,
        body: method === "GET" || method === "HEAD" ? undefined : Buffer.concat(chunks),
        duplex: "half",
      },
    );
    const fetchResponse = await handler.fetch(fetchRequest);
    response.writeHead(fetchResponse.status, Object.fromEntries(fetchResponse.headers));
    response.end(Buffer.from(await fetchResponse.arrayBuffer()));
  } catch {
    response.writeHead(500, { "content-type": "application/json" });
    response.end('{"error":"bounded_conformance_bridge_failure"}');
  }
});

try {
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (address === null || typeof address === "string") {
    throw new Error("Could not resolve loopback conformance port.");
  }
  await run(join(repoRoot, "node_modules/.bin/conformance"), [
    "server",
    "--url",
    `http://127.0.0.1:${address.port}/mcp`,
    "--scenario",
    "server-initialize",
    "--spec-version",
    "2025-11-25",
    "--output-dir",
    outputDirectory,
  ]);
  process.stdout.write(
    `${JSON.stringify({
      ok: true,
      framework: "@modelcontextprotocol/conformance",
      framework_version: packageJson.version,
      transport: "loopback_http",
      protocol_version: "2025-11-25",
      scenario: "server-initialize",
      modern_2026_framework_coverage: "upstream_not_available",
      stdio_framework_coverage: "upstream_not_available",
      runtime_activation: false,
      side_effects: [],
    })}\n`,
  );
} finally {
  await handler.close();
  await new Promise((resolve) => server.close(() => resolve()));
  await rm(outputDirectory, { recursive: true, force: true });
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: repoRoot,
      env: process.env,
      stdio: "inherit",
    });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) resolve();
      else
        reject(
          new Error(`Official conformance exited ${String(code)} (${String(signal)}).`),
        );
    });
  });
}
