import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  inspectPacketGatewayRequest,
  packetInspectionGatewayContract,
} from "@lnsat/gateway";
import { projectPacketInspectionEvidence } from "./packet-inspection-evidence.js";

const repoRoot = join(process.cwd(), "../..");

describe("Phase 10 Control Center packet-inspection parity", () => {
  it("preserves exact Gateway decision and evidence without UI authority", async () => {
    const packet = JSON.parse(
      await readFile(
        join(repoRoot, "packages/packets/fixtures/valid/context-packet.json"),
        "utf8",
      ),
    );
    const gatewayResponse = await inspectPacketGatewayRequest(
      { request_id: "req_phase10_ui_parity", packet },
      { now: new Date("2026-08-16T00:00:00.000Z") },
    );
    const projection = projectPacketInspectionEvidence(gatewayResponse);

    expect(projection.gateway_contract_id).toBe(
      packetInspectionGatewayContract.contract_id,
    );
    expect(projection.gateway_response).toEqual(gatewayResponse);
    expect(projection.policy_decision).toEqual(gatewayResponse.policy_decision);
    expect(projection.audit_event_preview).toEqual(gatewayResponse.audit_event_preview);
    expect(projection).toMatchObject({
      source_kind: "gateway_fixture",
      side_effects: [],
      read_only: true,
      action_authority: false,
      mutation_authority: false,
    });
  });
});
