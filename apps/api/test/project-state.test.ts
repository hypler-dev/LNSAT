import { describe, expect, it } from "vitest";

import {
  inspectProjectStateGatewayRequest,
  projectStateGatewayContract,
} from "../src/index.js";

describe("@lnsat/api project-state inspection", () => {
  it("reads neutral fixture ids and response vocabulary", async () => {
    const response = await inspectProjectStateGatewayRequest({
      request_id: "req_project_state",
      item_id: "state-item-mcp-inspection",
    });

    expect(response).toMatchObject({
      ok: true,
      contract_id: projectStateGatewayContract.contract_id,
      schema_version: "0.1",
      request_id: "req_project_state",
      project_state: {
        project: "example-agent-project",
        current_stage: "Evaluation",
        next_item: null,
        completed_items: ["state-item-mcp-inspection", "state-item-api-inspection"],
      },
      items: {
        completed_items: expect.arrayContaining([
          expect.objectContaining({ item_id: "state-item-mcp-inspection" }),
          expect.objectContaining({ item_id: "state-item-api-inspection" }),
        ]),
      },
      activity: {
        completed_items: expect.arrayContaining([
          expect.objectContaining({ item_id: "state-item-mcp-inspection" }),
          expect.objectContaining({ item_id: "state-item-api-inspection" }),
        ]),
      },
      selected_item: {
        item_id: "state-item-mcp-inspection",
        source_path: "fixtures/project-state/items/state-item-mcp-inspection.json",
        stage: "MCP",
        side_effects: [],
      },
      side_effects: [],
    });
  });

  it("fails closed for unknown neutral item ids", async () => {
    const response = await inspectProjectStateGatewayRequest({
      request_id: "req_missing_item",
      item_id: "state-item-missing",
    });

    expect(response).toMatchObject({
      ok: false,
      contract_id: projectStateGatewayContract.contract_id,
      schema_version: "0.1",
      errors: [
        {
          code: "project_state.item_not_found",
          path: "/item_id",
          severity: "error",
        },
      ],
      side_effects: [],
    });
  });

  it("rejects legacy request fields on canonical contract", async () => {
    const response = await inspectProjectStateGatewayRequest({
      request_id: "req_legacy_field",
      packet_id: "legacy-value",
    });

    expect(response).toMatchObject({
      ok: false,
      errors: [
        {
          code: "project_state.unexpected_field",
          path: "/packet_id",
          severity: "error",
        },
      ],
      side_effects: [],
    });
  });
});
