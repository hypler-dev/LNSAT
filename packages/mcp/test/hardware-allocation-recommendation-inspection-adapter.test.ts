import { Client } from "@modelcontextprotocol/client";
import { InMemoryTransport } from "@modelcontextprotocol/server";
import { afterEach, describe, expect, it } from "vitest";
import {
  createLnsatOfficialMcpSdkServer,
  createLnsatReadOnlyMcpServer,
  inspectHardwareAllocationRecommendationThroughMcpAdapterContract,
  mcpHardwareAllocationRecommendationInspectionToolContract,
  mcpHardwareAllocationRecommendationInspectionToolRegistration,
} from "../src/index.js";

const now = new Date("2026-07-12T18:00:00.000Z");
let cleanup: (() => Promise<void>) | null = null;

afterEach(async () => {
  await cleanup?.();
  cleanup = null;
});

describe("@lnsat/mcp BP-0857 hardware allocation recommendation inspection", () => {
  it("exposes immutable read-only metadata", () => {
    expect(mcpHardwareAllocationRecommendationInspectionToolContract).toMatchObject({
      tool: "lnsat.hardware.allocation.recommendation.inspect",
      status: "bp-0857-read-only-hardware-allocation-recommendation-mcp-adapter",
      gateway_contract_id:
        "lnsat.gateway.hardware_allocation_recommendation.inspect.v0_1",
      gateway_path: "/v1/hardware/allocation/recommendation/inspect",
      caller_supplied_hae_only: true,
      read_only: true,
      recommendation_only: true,
      simulation_only: true,
      hardware_probe_allowed: false,
      telemetry_collection_allowed: false,
      benchmark_execution_allowed: false,
      placement_allowed: false,
      drain_allowed: false,
      runtime_allowed: false,
      database_write_allowed: false,
      network_access_allowed: false,
      side_effects: [],
    });
    expect(mcpHardwareAllocationRecommendationInspectionToolRegistration).toMatchObject(
      {
        name: "lnsat.hardware.allocation.recommendation.inspect",
        annotations: { readOnlyHint: true, destructiveHint: false },
        side_effects: [],
      },
    );
    expect(
      Object.isFrozen(mcpHardwareAllocationRecommendationInspectionToolContract),
    ).toBe(true);
    expect(
      Object.isFrozen(mcpHardwareAllocationRecommendationInspectionToolRegistration),
    ).toBe(true);
  });

  it("delegates caller-supplied HAE request through BP-0856", async () => {
    const response =
      await inspectHardwareAllocationRecommendationThroughMcpAdapterContract(
        request(),
        { now },
      );
    expect(response).toMatchObject({
      ok: true,
      tool: "lnsat.hardware.allocation.recommendation.inspect",
      caller_supplied_hae_only: true,
      simulation_only: true,
      gateway_response: {
        ok: true,
        request_id: "req_bp0857",
        hae_source: "caller_supplied",
        recommendation_status: "recommended",
        constraints: { placement_allowed: false, drain_allowed: false },
        side_effects: [],
      },
      side_effects: [],
    });
  });

  it("registers and calls local and official MCP servers", async () => {
    const local = createLnsatReadOnlyMcpServer({ now: () => now });
    expect(local.listTools().tools).toHaveLength(29);
    expect(local.listTools().tools.map((tool) => tool.name)).toContain(
      mcpHardwareAllocationRecommendationInspectionToolContract.tool,
    );
    expect(
      await local.callTool({
        name: mcpHardwareAllocationRecommendationInspectionToolContract.tool,
        arguments: request(),
      }),
    ).toMatchObject({ ok: true, is_error: false });

    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const server = createLnsatOfficialMcpSdkServer({ now: () => now });
    const client = new Client({ name: "lnsat-bp0857-test", version: "0.1.0" });
    await Promise.all([
      server.connect(serverTransport),
      client.connect(clientTransport),
    ]);
    cleanup = async () => {
      await client.close();
      await server.close();
    };
    expect((await client.listTools()).tools.map((tool) => tool.name)).toContain(
      mcpHardwareAllocationRecommendationInspectionToolContract.tool,
    );
    const result = await client.callTool({
      name: mcpHardwareAllocationRecommendationInspectionToolContract.tool,
      arguments: request(),
    });
    expect(result.isError).toBe(false);
    expect(result.structuredContent).toMatchObject({
      ok: true,
      gateway_response: { recommendation_status: "recommended" },
    });
  });

  it("fails closed and withholds rejected raw input", async () => {
    const response =
      await inspectHardwareAllocationRecommendationThroughMcpAdapterContract(
        { ...request(), placement_allowed: true, command: "curl secret" },
        { now },
      );
    expect(response).toMatchObject({
      ok: false,
      gateway_response: {
        ok: false,
        raw_input_content: "withheld",
        request_errors: expect.arrayContaining([
          expect.objectContaining({
            code: "hardware_allocation_gateway.unexpected_field",
          }),
          expect.objectContaining({
            code: "hardware_allocation_gateway.placement_forbidden",
          }),
        ]),
      },
      side_effects: [],
    });
    expect(JSON.stringify(response)).not.toContain("curl secret");
  });
});

function request() {
  return {
    request_id: "req_bp0857",
    hae_request: {
      simulation_ref: "simulation:bp0857",
      hardware_request: {
        inventory: {
          node_id: "node:lab",
          observed_at: "2026-07-12T17:59:30.000Z",
          platform: "linux",
          architecture: "x86_64",
          cpu: { physical_cores: 16, logical_cores: 32 },
          memory: {
            total_bytes: 137438953472,
            ecc_status: "supported",
            uncorrectable_error_count: 0,
          },
          pcie: { present: true, max_generation: 4 },
          storage: [
            {
              device_ref: "disk:nvme0",
              medium: "nvme",
              role: "active_database",
              smart_health: "healthy",
            },
          ],
          network: [
            {
              interface_ref: "nic:eno1",
              speed_mbps: 10000,
              state: "up",
              error_count: 0,
            },
          ],
          thermal: "normal",
          integrity: "verified",
        },
        side_effects: [],
      },
      telemetry_request: {
        snapshot: {
          snapshot_id: "snapshot:bp0857",
          node_id: "node:lab",
          window_started_at: "2026-07-12T17:50:00.000Z",
          window_ended_at: "2026-07-12T17:59:00.000Z",
          signals: [
            signal("cpu", "cpu_numa", "cpu_utilization_pct", "percent", 50),
            signal("memory", "memory_ecc", "memory_utilization_pct", "percent", 60),
            signal("storage", "storage", "storage_utilization_pct", "percent", 50),
            signal("network", "network", "network_utilization_pct", "percent", 30),
            signal("thermal", "thermal_power", "thermal_celsius", "celsius", 60),
            signal(
              "workload",
              "workload_service",
              "workload_availability_pct",
              "percent",
              99.99,
            ),
          ],
        },
        evaluated_at: "2026-07-12T17:59:30.000Z",
        max_age_ms: 60000,
        collector_allowed: false,
        node_agent_allowed: false,
        hardware_probe_allowed: false,
        benchmark_execution_allowed: false,
        placement_allowed: false,
        alert_dispatch_allowed: false,
        runtime_allowed: false,
        database_write_allowed: false,
        network_access_allowed: false,
        side_effects: [],
      },
      side_effects: [],
    },
  };
}

function signal(
  id: string,
  domain: string,
  metric: string,
  unit: string,
  value: number,
) {
  return {
    signal_ref: `signal:${id}`,
    domain,
    metric,
    scope_ref: id === "workload" ? "service:gateway" : "node:lab",
    unit,
    aggregation: "gauge",
    value,
    quality: "observed",
  };
}
