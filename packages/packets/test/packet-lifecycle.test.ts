import { describe, expect, it } from "vitest";
import {
  createPacketLifecycle,
  defaultPacketLifecycleMap,
  packetLifecycleContract,
  type PacketLifecycleMap,
} from "../src/index.js";

describe("packet lifecycle contract", () => {
  it("emits source-only CapabilityPacket ExecutionPacket and EnvironmentPacket lifecycle evidence", () => {
    const result = createPacketLifecycle();

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected packet lifecycle success");
    }

    expect(result.lifecycle).toMatchObject({
      contract_id: packetLifecycleContract.contract_id,
      lifecycle_version: "0.1",
      packet_types: ["CapabilityPacket", "ExecutionPacket", "EnvironmentPacket"],
      live_execution_allowed: false,
      side_effects: [],
    });
    expect(result.lifecycle.transition_map).toMatchObject({
      CapabilityPacket: expect.arrayContaining([
        "requested->policy_reviewed",
        "approval_required->approved",
        "approved->granted",
      ]),
      ExecutionPacket: expect.arrayContaining([
        "proposed->policy_reviewed",
        "approved->running",
        "running->completed",
      ]),
      EnvironmentPacket: expect.arrayContaining([
        "declared->policy_reviewed",
        "approved->prepared",
        "prepared->active",
      ]),
    });
    expect(result.lifecycle.forbidden_transitions).toMatchObject({
      CapabilityPacket: expect.arrayContaining(["requested->granted"]),
      ExecutionPacket: expect.arrayContaining(["proposed->running"]),
      EnvironmentPacket: expect.arrayContaining(["declared->active"]),
    });
    expect(result.lifecycle.required_policy_gates).toEqual(
      expect.arrayContaining([
        "capability.policy.review",
        "execution.approval.granted",
        "environment.activate.approved_scope",
      ]),
    );
    expect(result.lifecycle.approval_required_transitions).toEqual(
      expect.arrayContaining([
        "approved->granted",
        "approved->running",
        "prepared->active",
      ]),
    );
    expect(result.lifecycle.source_refs).toEqual(
      expect.arrayContaining([
        "doc:docs/architecture/PACKET_MODEL.md",
        "doc:docs/reference/CONTRACT_PROVENANCE.md",
      ]),
    );
    expect(result.side_effects).toEqual([]);
  });

  it("binds transitions to policy gates approval requirements and audit events", () => {
    const result = createPacketLifecycle({
      source_refs: [
        {
          source_ref: "ticket:BP-0086",
          summary: "packet lifecycle binds controlled transitions to approval",
        },
      ],
      side_effects: [],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected packet lifecycle success");
    }

    expect(result.lifecycle.lifecycle_map.ExecutionPacket.allowed_transitions).toEqual(
      expect.arrayContaining([
        {
          from: "approved",
          to: "running",
          policy_gate: "execution.run.approved_scope",
          approval_required: true,
          audit_event: "runbook_started",
          rationale: "running state is only valid after approved execution scope",
          side_effects: [],
        },
      ]),
    );
    expect(
      result.lifecycle.lifecycle_map.EnvironmentPacket.allowed_transitions,
    ).toEqual(
      expect.arrayContaining([
        {
          from: "prepared",
          to: "active",
          policy_gate: "environment.activate.approved_scope",
          approval_required: true,
          audit_event: "environment_created",
          rationale: "active environment requires prepared approved scope",
          side_effects: [],
        },
      ]),
    );
    expect(result.lifecycle.source_refs).toEqual(
      expect.arrayContaining([
        "ticket:BP-0086: packet lifecycle binds controlled transitions to approval",
      ]),
    );
  });

  it("fails closed for unknown packet types and missing required transitions", () => {
    const lifecycleMap = {
      ...defaultPacketLifecycleMap,
      RootShellPacket: {
        packet_type: "RootShellPacket",
        states: ["requested", "granted"],
        initial_state: "requested",
        terminal_states: ["granted"],
        allowed_transitions: [],
        forbidden_transitions: [],
        source_refs: [],
      },
      ExecutionPacket: {
        ...defaultPacketLifecycleMap.ExecutionPacket,
        allowed_transitions:
          defaultPacketLifecycleMap.ExecutionPacket.allowed_transitions.filter(
            (transition) =>
              transition.from !== "approved" || transition.to !== "running",
          ),
      },
    };
    const result = createPacketLifecycle({ lifecycle_map: lifecycleMap });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected packet lifecycle failure");
    }

    expect(result).toMatchObject({
      ok: false,
      lifecycle: null,
      raw_input_content: "withheld",
      side_effects: [],
    });
    expect(result.errors).toEqual(
      expect.arrayContaining([
        {
          code: "packet_lifecycle.unknown_packet_type",
          path: "/lifecycle_map/<unknown>",
          message: "Packet lifecycle packet type is unknown.",
          severity: "error",
        },
        {
          code: "packet_lifecycle.transition_required",
          path: "/lifecycle_map/ExecutionPacket/allowed_transitions/approved->running",
          message: "Packet lifecycle required transition is missing.",
          severity: "error",
        },
      ]),
    );
    expect(JSON.stringify(result)).not.toContain("RootShellPacket");
  });

  it("fails closed for approval bypass forbidden transitions live execution and side effects", () => {
    const lifecycleMap: PacketLifecycleMap = {
      ...defaultPacketLifecycleMap,
      CapabilityPacket: {
        ...defaultPacketLifecycleMap.CapabilityPacket,
        allowed_transitions: [
          ...defaultPacketLifecycleMap.CapabilityPacket.allowed_transitions,
          {
            from: "requested",
            to: "granted",
            policy_gate: "capability.grant.approved_scope",
            approval_required: true,
            audit_event: "tool_allowed",
            rationale: "direct grant should fail closed",
            side_effects: [],
          },
        ],
      },
      ExecutionPacket: {
        ...defaultPacketLifecycleMap.ExecutionPacket,
        allowed_transitions:
          defaultPacketLifecycleMap.ExecutionPacket.allowed_transitions.map(
            (transition) =>
              transition.from === "approved" && transition.to === "running"
                ? { ...transition, approval_required: false }
                : transition,
          ),
      },
      EnvironmentPacket: {
        ...defaultPacketLifecycleMap.EnvironmentPacket,
        allowed_transitions:
          defaultPacketLifecycleMap.EnvironmentPacket.allowed_transitions.map(
            (transition) =>
              transition.from === "prepared" && transition.to === "active"
                ? {
                    ...transition,
                    policy_gate: "environment.deploy.execute",
                    rationale: "read DATABASE_URL TOKEN and deploy",
                  }
                : transition,
          ),
      },
    };

    const result = createPacketLifecycle({
      lifecycle_map: lifecycleMap,
      live_execution_allowed: true,
      side_effects: [{ effect_type: "deploy" }],
      command: "rm -rf /",
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected packet lifecycle failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        {
          code: "packet_lifecycle.forbidden_transition",
          path: "/lifecycle_map/CapabilityPacket/forbidden_transitions/requested->granted",
          message: "Packet lifecycle allowed transition is explicitly forbidden.",
          severity: "error",
        },
        {
          code: "packet_lifecycle.approval_required",
          path: "/lifecycle_map/ExecutionPacket/allowed_transitions/4/approval_required",
          message: "Packet lifecycle transition to controlled state requires approval.",
          severity: "error",
        },
        {
          code: "packet_lifecycle.policy_gate_required",
          path: "/lifecycle_map/EnvironmentPacket/allowed_transitions/5/policy_gate",
          message: "Packet lifecycle transition requires a safe policy_gate.",
          severity: "error",
        },
        {
          code: "packet_lifecycle.invalid_transition",
          path: "/lifecycle_map/EnvironmentPacket/allowed_transitions/5/rationale",
          message: "Packet lifecycle transition rationale must be safe.",
          severity: "error",
        },
        {
          code: "packet_lifecycle.unexpected_field",
          path: "/command",
          message: "Unexpected packet lifecycle request field.",
          severity: "error",
        },
        {
          code: "packet_lifecycle.live_execution_forbidden",
          path: "/live_execution_allowed",
          message: "Packet lifecycle cannot enable live execution.",
          severity: "error",
        },
        {
          code: "packet_lifecycle.side_effects_forbidden",
          path: "/side_effects",
          message: "Packet lifecycle must preserve side_effects: [].",
          severity: "error",
        },
      ]),
    );
    expect(JSON.stringify(result)).not.toContain("DATABASE_URL");
    expect(JSON.stringify(result)).not.toContain("TOKEN");
    expect(JSON.stringify(result)).not.toContain("rm -rf");
  });
});
