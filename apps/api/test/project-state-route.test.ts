import { afterAll, describe, expect, it } from "vitest";

import { buildApiGateway, projectStateGatewayContract } from "../src/index.js";

describe("@lnsat/api project-state route", () => {
  const gateway = buildApiGateway();

  afterAll(async () => {
    await gateway.close();
  });

  it("serves canonical project-state inspection", async () => {
    const response = await gateway.inject({
      method: projectStateGatewayContract.method,
      url: projectStateGatewayContract.path,
      payload: {
        request_id: "req_project_state_route",
        item_id: "state-item-api-inspection",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      ok: true,
      contract_id: projectStateGatewayContract.contract_id,
      schema_version: "0.1",
      selected_item: {
        item_id: "state-item-api-inspection",
        stage: "API",
      },
      side_effects: [],
    });
  });

  it("returns 404 for missing canonical items", async () => {
    const response = await gateway.inject({
      method: projectStateGatewayContract.method,
      url: projectStateGatewayContract.path,
      payload: { item_id: "state-item-missing" },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({
      ok: false,
      errors: [{ code: "project_state.item_not_found" }],
      side_effects: [],
    });
  });

  it("returns 400 for malformed canonical requests", async () => {
    const response = await gateway.inject({
      method: projectStateGatewayContract.method,
      url: projectStateGatewayContract.path,
      payload: { item_id: "../state-item-api-inspection" },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      ok: false,
      errors: [{ code: "project_state.invalid_item_id", path: "/item_id" }],
      side_effects: [],
    });
  });
});
