import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import {
  buildApiGateway,
  controlCenterOperationReadbackContract,
} from "../src/index.js";

describe("local Control Center operation readback route", () => {
  const gateway = buildApiGateway();

  afterAll(async () => {
    await gateway.close();
  });

  it("returns exact deterministic fixture through loopback GET", async () => {
    const fixture = JSON.parse(
      await readFile(
        join(
          process.cwd(),
          "../../fixtures/console/operation-reconciliation-v0_1.json",
        ),
        "utf8",
      ),
    );
    const response = await gateway.inject({
      method: controlCenterOperationReadbackContract.method,
      url: controlCenterOperationReadbackContract.path,
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(response.json()).toEqual(fixture);
  });

  it("rejects non-loopback transport", async () => {
    const response = await gateway.inject({
      method: "GET",
      url: controlCenterOperationReadbackContract.path,
      remoteAddress: "203.0.113.7",
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({
      ok: false,
      errors: [{ code: "control_center.operation_readback.loopback_required" }],
      side_effects: [],
    });
  });

  it("rejects hostile Origin/Host and query scope injection", async () => {
    const hostileOrigin = await gateway.inject({
      method: "GET",
      url: controlCenterOperationReadbackContract.path,
      headers: { origin: "https://evil.example", host: "127.0.0.1" },
    });
    expect(hostileOrigin.statusCode).toBe(403);

    const query = await gateway.inject({
      method: "GET",
      url: `${controlCenterOperationReadbackContract.path}?tenant_ref=tenant:other`,
    });
    expect(query.statusCode).toBe(400);
    expect(query.json()).toMatchObject({
      ok: false,
      errors: [{ code: "control_center.operation_readback.invalid_request" }],
      side_effects: [],
    });
  });

  it("exposes no mutation method at readback path", async () => {
    for (const method of ["POST", "PUT", "PATCH", "DELETE"] as const) {
      const response = await gateway.inject({
        method,
        url: controlCenterOperationReadbackContract.path,
        payload: {},
      });
      expect(response.statusCode, method).toBe(404);
    }
  });
});
