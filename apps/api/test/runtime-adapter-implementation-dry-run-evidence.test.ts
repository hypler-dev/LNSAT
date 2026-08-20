import {
  defaultRuntimeAdapterImplementationDryRunEvidence,
  runtimeAdapterImplementationApprovalGateContract,
  runtimeAdapterImplementationAuthorizationRequestContract,
  runtimeAdapterImplementationDryRunEvidenceContract,
  runtimeAdapterImplementationPlanContract,
  runtimeAdapterImplementationScopeContract,
  runtimeAdapterReadinessGateContract,
} from "@lnsat/packets";
import { describe, expect, it } from "vitest";
import {
  buildApiGateway,
  inspectRuntimeAdapterImplementationDryRunEvidenceGatewayRequest,
  runtimeAdapterImplementationDryRunEvidenceGatewayContract,
} from "../src/index.js";

const now = new Date("2026-05-10T00:00:00.000Z");

describe("@lnsat/api BP-0164 runtime adapter implementation dry-run evidence Gateway contract", () => {
  it("returns BP-0163 source-only dry-run evidence through Gateway", async () => {
    const response =
      await inspectRuntimeAdapterImplementationDryRunEvidenceGatewayRequest(
        {
          request_id: "req_bp0164_runtime_adapter_implementation_dry_run_evidence",
          dry_run_evidence_request: {},
        },
        { now },
      );

    expect(response).toMatchObject({
      ok: true,
      contract_id:
        runtimeAdapterImplementationDryRunEvidenceGatewayContract.contract_id,
      request_id: "req_bp0164_runtime_adapter_implementation_dry_run_evidence",
      inspected_at: "2026-05-10T00:00:00.000Z",
      dry_run_evidence_version: "0.1",
      implementation_dry_run_evidence_authority:
        "implementation_dry_run_evidence_only_no_runtime_adapter",
      runtime_adapter_implementation_allowed: false,
      runtime_adapter_dispatch_allowed: false,
      live_adapter_invocation_allowed: false,
      live_broker_dispatch_allowed: false,
      live_execution_allowed: false,
      side_effects: [],
    });

    if (!response.ok) {
      throw new Error("expected Gateway dry-run evidence success");
    }

    expect(response.runtime_adapter_implementation_dry_run_evidence).toMatchObject({
      contract_id: runtimeAdapterImplementationDryRunEvidenceContract.contract_id,
      dry_run_evidence_version: "0.1",
      runtime_adapter_implementation_allowed: false,
      runtime_adapter_dispatch_allowed: false,
      live_adapter_invocation_allowed: false,
      live_broker_dispatch_allowed: false,
      live_execution_allowed: false,
      side_effects: [],
    });
    expect(response.packet_selection_refs).toEqual([
      {
        packet_selection_ref:
          "packet_selection:bp0162-runtime-adapter-implementation-packet-selection",
        packet_ref: "packet:BP-0162",
        evidence_ref: "evidence:bp0162-runtime-adapter-implementation-packet-selection",
        summary: "BP-0162 selected BP-0163 dry-run evidence before implementation",
      },
    ]);
    expect(response.approval_gate_chain_review_refs).toEqual([
      {
        chain_review_ref:
          "chain_review:bp0161-runtime-adapter-approval-gate-chain-review",
        packet_ref: "packet:BP-0161",
        evidence_ref: "evidence:bp0161-runtime-adapter-approval-gate-chain-review",
        summary: "BP-0161 reviewed BP-0156 through BP-0160 approval gate chain",
      },
    ]);
    expect(response.approval_gate_refs[0]?.contract_id).toBe(
      runtimeAdapterImplementationApprovalGateContract.contract_id,
    );
    expect(response.authorization_request_refs[0]?.contract_id).toBe(
      runtimeAdapterImplementationAuthorizationRequestContract.contract_id,
    );
    expect(response.implementation_plan_refs[0]?.contract_id).toBe(
      runtimeAdapterImplementationPlanContract.contract_id,
    );
    expect(response.runtime_adapter_implementation_scope_refs[0]?.contract_id).toBe(
      runtimeAdapterImplementationScopeContract.contract_id,
    );
    expect(response.runtime_adapter_readiness_gate_refs[0]?.contract_id).toBe(
      runtimeAdapterReadinessGateContract.contract_id,
    );
    expect(response.validation_command_refs).toEqual(
      expect.arrayContaining([
        {
          validation_ref:
            "validation:packets-runtime-adapter-implementation-dry-run-evidence",
          command_ref:
            "script:npm-workspace-packets-test-runtime-adapter-implementation-dry-run-evidence",
          expected_artifact_ref: "artifact:bp0163-packets-test-output",
          summary: "Run BP-0163 packet workspace test through named package script",
        },
      ]),
    );
    expect(response.dry_run_artifact_refs).toEqual([
      {
        artifact_ref: "artifact:bp0163-dry-run-evidence-contract-output",
        evidence_ref: "evidence:bp0163-runtime-adapter-implementation-dry-run-evidence",
        summary:
          "Source-only dry-run evidence artifact exists before adapter implementation opens",
      },
    ]);
    expect(response.required_policy_gates).toContain(
      "substrate.adapter.implementation_dry_run_evidence.review",
    );
    expect(response.packet_selection_snapshot).toMatchObject({
      packet_ref: "packet:BP-0162",
      selected_next_packet_ref: "packet:BP-0163",
      selected_contract_id:
        runtimeAdapterImplementationDryRunEvidenceContract.contract_id,
      side_effects: [],
    });
    expect(response.approval_gate_chain_review_snapshot).toMatchObject({
      packet_ref: "packet:BP-0161",
      reviewed_source_contract_id:
        runtimeAdapterImplementationApprovalGateContract.contract_id,
      reviewed_mcp_tool:
        "lnsat.platform.runtime_adapter_implementation_approval_gate.inspect",
      registered_read_only_tool_count: 22,
      side_effects: [],
    });
    expect(response.approval_gate_evidence_snapshot).toMatchObject({
      contract_id: runtimeAdapterImplementationApprovalGateContract.contract_id,
      implementation_approval_gate_authority:
        "implementation_approval_gate_only_no_runtime_adapter",
      runtime_adapter_implementation_allowed: false,
      runtime_adapter_dispatch_allowed: false,
      live_adapter_invocation_allowed: false,
      live_broker_dispatch_allowed: false,
      live_execution_allowed: false,
      side_effects: [],
    });
    expect(response.denied_runtime_behavior).toEqual(
      expect.arrayContaining([
        "dry-run evidence does not create runtime adapter implementation",
        "dry-run evidence does not register dispatcher",
        "dry-run evidence does not dispatch broker request",
        "dry-run evidence does not invoke adapter",
        "dry-run evidence does not execute live runtime path",
      ]),
    );
    expect(response.source_docs).toEqual(
      expect.arrayContaining([
        "docs/reference/CONTRACT_PROVENANCE.md",
        "docs/reference/CONTRACT_PROVENANCE.md",
        "packages/packets/src/runtime-adapter-implementation-dry-run-evidence.ts",
        "apps/api/src/runtime-adapter-implementation-dry-run-evidence.ts",
      ]),
    );
  });

  it("preserves explicit source refs without runtime implementation authority", async () => {
    const response =
      await inspectRuntimeAdapterImplementationDryRunEvidenceGatewayRequest(
        {
          request_id: "req_bp0164_named_dry_run_evidence",
          dry_run_evidence_request: {
            source_refs: [
              {
                source_ref: "doc:docs/reference/CONTRACT_PROVENANCE.md",
                summary:
                  "Gateway wraps explicit runtime adapter implementation dry-run evidence",
              },
            ],
          },
        },
        { now },
      );

    expect(response).toMatchObject({
      ok: true,
      request_id: "req_bp0164_named_dry_run_evidence",
      source_refs: ["doc:docs/reference/CONTRACT_PROVENANCE.md"],
      implementation_dry_run_evidence_authority:
        "implementation_dry_run_evidence_only_no_runtime_adapter",
      runtime_adapter_implementation_allowed: false,
      runtime_adapter_dispatch_allowed: false,
      live_adapter_invocation_allowed: false,
      live_broker_dispatch_allowed: false,
      live_execution_allowed: false,
      side_effects: [],
    });
  });

  it("fails closed for malformed Gateway requests without raw rejected value echo", async () => {
    const response =
      await inspectRuntimeAdapterImplementationDryRunEvidenceGatewayRequest(
        {
          request_id: 164,
          raw_rejected_value:
            "runtime_adapter.implementation.execute TOKEN=inline-secret",
        },
        { now },
      );

    expect(response).toMatchObject({
      ok: false,
      request_id: null,
      request_errors: [
        {
          code: "runtime_adapter_implementation_dry_run_evidence_gateway.unexpected_field",
          path: "/raw_rejected_value",
        },
        {
          code: "runtime_adapter_implementation_dry_run_evidence_gateway.invalid_request_id",
          path: "/request_id",
        },
        {
          code: "runtime_adapter_implementation_dry_run_evidence_gateway.missing_dry_run_evidence_request",
          path: "/dry_run_evidence_request",
        },
      ],
      dry_run_evidence_errors: [],
      runtime_adapter_implementation_dry_run_evidence: null,
      runtime_adapter_implementation_allowed: false,
      runtime_adapter_dispatch_allowed: false,
      live_adapter_invocation_allowed: false,
      live_broker_dispatch_allowed: false,
      live_execution_allowed: false,
      raw_input_content: "withheld",
      side_effects: [],
    });
    expect(JSON.stringify(response)).not.toContain("runtime_adapter.implementation");
    expect(JSON.stringify(response)).not.toContain("TOKEN=inline-secret");
  });

  it("fails closed for invalid delegated BP-0163 evidence without raw echo", async () => {
    const response =
      await inspectRuntimeAdapterImplementationDryRunEvidenceGatewayRequest(
        {
          request_id: "req_bp0164_invalid_delegated_dry_run_evidence",
          dry_run_evidence_request: {
            implementation_dry_run_evidence_authority: "runtime_adapter_implementation",
            validation_command_refs: [
              {
                validation_ref: "validation:unsafe",
                command_ref: "script:unsafe",
                expected_artifact_ref: "artifact:unsafe",
                summary: "run npm test",
              },
            ],
            runtime_adapter_implementation_allowed: true,
            runtime_adapter_dispatch_allowed: true,
            live_adapter_invocation_allowed: true,
            live_broker_dispatch_allowed: true,
            live_execution_allowed: true,
            source_refs: [
              {
                source_ref: "doc:docs/reference/CONTRACT_PROVENANCE.md",
                summary:
                  "read DATABASE_URL and dispatch raw runtime adapter implementation",
              },
            ],
            future_implementation_packet_refs: [
              {
                packet_ref: "packet:future-runtime-adapter-implementation",
                packet_name: "Future Runtime Adapter Implementation Packet",
                owner_ref: "owner:lnsat-platform",
                summary: "Grant runtime_adapter_implementation now",
              },
            ],
            denied_runtime_behavior: [
              ...defaultRuntimeAdapterImplementationDryRunEvidence.denied_runtime_behavior,
              "runtime_adapter.implementation.execute",
            ],
            side_effects: [{ effect_type: "runtime_adapter_implementation" }],
            command: "rm -rf /",
          },
        },
        { now },
      );

    expect(response).toMatchObject({
      ok: false,
      request_errors: [],
      dry_run_evidence_errors: expect.arrayContaining([
        expect.objectContaining({
          code: "runtime_adapter_implementation_dry_run_evidence.unsafe_dry_run_authority",
          path: "/implementation_dry_run_evidence_authority",
        }),
        expect.objectContaining({
          code: "runtime_adapter_implementation_dry_run_evidence.unsafe_dry_run_authority",
          path: "/validation_command_refs",
        }),
        expect.objectContaining({
          code: "runtime_adapter_implementation_dry_run_evidence.runtime_adapter_implementation_forbidden",
          path: "/runtime_adapter_implementation_allowed",
        }),
        expect.objectContaining({
          code: "runtime_adapter_implementation_dry_run_evidence.runtime_adapter_dispatch_forbidden",
          path: "/runtime_adapter_dispatch_allowed",
        }),
        expect.objectContaining({
          code: "runtime_adapter_implementation_dry_run_evidence.live_adapter_invocation_forbidden",
          path: "/live_adapter_invocation_allowed",
        }),
        expect.objectContaining({
          code: "runtime_adapter_implementation_dry_run_evidence.live_broker_dispatch_forbidden",
          path: "/live_broker_dispatch_allowed",
        }),
        expect.objectContaining({
          code: "runtime_adapter_implementation_dry_run_evidence.live_execution_forbidden",
          path: "/live_execution_allowed",
        }),
        expect.objectContaining({
          code: "runtime_adapter_implementation_dry_run_evidence.secret_value_forbidden",
          path: "/source_refs/0",
        }),
        expect.objectContaining({
          code: "runtime_adapter_implementation_dry_run_evidence.unexpected_field",
          path: "/denied_runtime_behavior",
        }),
        expect.objectContaining({
          code: "runtime_adapter_implementation_dry_run_evidence.unexpected_field",
          path: "/command",
        }),
        expect.objectContaining({
          code: "runtime_adapter_implementation_dry_run_evidence.side_effects_forbidden",
          path: "/side_effects",
        }),
      ]),
      runtime_adapter_implementation_allowed: false,
      runtime_adapter_dispatch_allowed: false,
      live_adapter_invocation_allowed: false,
      live_broker_dispatch_allowed: false,
      live_execution_allowed: false,
      raw_input_content: "withheld",
      side_effects: [],
    });
    expect(JSON.stringify(response)).not.toContain("DATABASE_URL");
    expect(JSON.stringify(response)).not.toContain("rm -rf");
    expect(JSON.stringify(response)).not.toContain("npm test");
    expect(JSON.stringify(response)).not.toContain("dispatch raw runtime adapter");
    expect(JSON.stringify(response)).not.toContain(
      "Grant runtime_adapter_implementation",
    );
  });

  it("exposes BP-0164 Gateway evidence through the BP-0165 read-only Fastify route", async () => {
    const gateway = buildApiGateway({ now: () => now });

    const response = await gateway.inject({
      method: runtimeAdapterImplementationDryRunEvidenceGatewayContract.method,
      url: runtimeAdapterImplementationDryRunEvidenceGatewayContract.path,
      payload: {
        request_id: "req_bp0164_route_probe",
        dry_run_evidence_request: {},
      },
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toMatchObject({
      ok: true,
      contract_id:
        runtimeAdapterImplementationDryRunEvidenceGatewayContract.contract_id,
      request_id: "req_bp0164_route_probe",
      inspected_at: "2026-05-10T00:00:00.000Z",
      dry_run_evidence_version: "0.1",
      implementation_dry_run_evidence_authority:
        "implementation_dry_run_evidence_only_no_runtime_adapter",
      runtime_adapter_implementation_allowed: false,
      runtime_adapter_dispatch_allowed: false,
      live_adapter_invocation_allowed: false,
      live_broker_dispatch_allowed: false,
      live_execution_allowed: false,
      side_effects: [],
    });
    await gateway.close();
  });

  it("returns fail-closed 400 for malformed BP-0165 route requests without raw echo", async () => {
    const gateway = buildApiGateway({ now: () => now });

    const response = await gateway.inject({
      method: runtimeAdapterImplementationDryRunEvidenceGatewayContract.method,
      url: runtimeAdapterImplementationDryRunEvidenceGatewayContract.path,
      payload: {
        request_id: 165,
        raw_rejected_value:
          "runtime_adapter.implementation.execute TOKEN=inline-secret",
      },
    });

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body)).toMatchObject({
      ok: false,
      request_id: null,
      request_errors: [
        {
          code: "runtime_adapter_implementation_dry_run_evidence_gateway.unexpected_field",
          path: "/raw_rejected_value",
        },
        {
          code: "runtime_adapter_implementation_dry_run_evidence_gateway.invalid_request_id",
          path: "/request_id",
        },
        {
          code: "runtime_adapter_implementation_dry_run_evidence_gateway.missing_dry_run_evidence_request",
          path: "/dry_run_evidence_request",
        },
      ],
      dry_run_evidence_errors: [],
      runtime_adapter_implementation_dry_run_evidence: null,
      runtime_adapter_implementation_allowed: false,
      runtime_adapter_dispatch_allowed: false,
      live_adapter_invocation_allowed: false,
      live_broker_dispatch_allowed: false,
      live_execution_allowed: false,
      raw_input_content: "withheld",
      side_effects: [],
    });
    expect(response.body).not.toContain("runtime_adapter.implementation");
    expect(response.body).not.toContain("TOKEN=inline-secret");
    await gateway.close();
  });

  it("returns fail-closed 400 for invalid delegated BP-0163 evidence without raw echo", async () => {
    const gateway = buildApiGateway({ now: () => now });

    const response = await gateway.inject({
      method: runtimeAdapterImplementationDryRunEvidenceGatewayContract.method,
      url: runtimeAdapterImplementationDryRunEvidenceGatewayContract.path,
      payload: {
        request_id: "req_bp0165_invalid_delegated_dry_run_evidence",
        dry_run_evidence_request: {
          implementation_dry_run_evidence_authority: "runtime_adapter_implementation",
          runtime_adapter_implementation_allowed: true,
          runtime_adapter_dispatch_allowed: true,
          live_adapter_invocation_allowed: true,
          live_broker_dispatch_allowed: true,
          live_execution_allowed: true,
          source_refs: [
            {
              source_ref: "doc:docs/reference/CONTRACT_PROVENANCE.md",
              summary:
                "read DATABASE_URL and dispatch raw runtime adapter implementation",
            },
          ],
          side_effects: [{ effect_type: "runtime_adapter_implementation" }],
          command: "rm -rf /",
        },
      },
    });

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body)).toMatchObject({
      ok: false,
      request_errors: [],
      dry_run_evidence_errors: expect.arrayContaining([
        expect.objectContaining({
          code: "runtime_adapter_implementation_dry_run_evidence.unsafe_dry_run_authority",
          path: "/implementation_dry_run_evidence_authority",
        }),
        expect.objectContaining({
          code: "runtime_adapter_implementation_dry_run_evidence.runtime_adapter_implementation_forbidden",
          path: "/runtime_adapter_implementation_allowed",
        }),
        expect.objectContaining({
          code: "runtime_adapter_implementation_dry_run_evidence.runtime_adapter_dispatch_forbidden",
          path: "/runtime_adapter_dispatch_allowed",
        }),
        expect.objectContaining({
          code: "runtime_adapter_implementation_dry_run_evidence.live_adapter_invocation_forbidden",
          path: "/live_adapter_invocation_allowed",
        }),
        expect.objectContaining({
          code: "runtime_adapter_implementation_dry_run_evidence.live_broker_dispatch_forbidden",
          path: "/live_broker_dispatch_allowed",
        }),
        expect.objectContaining({
          code: "runtime_adapter_implementation_dry_run_evidence.live_execution_forbidden",
          path: "/live_execution_allowed",
        }),
        expect.objectContaining({
          code: "runtime_adapter_implementation_dry_run_evidence.secret_value_forbidden",
          path: "/source_refs/0",
        }),
        expect.objectContaining({
          code: "runtime_adapter_implementation_dry_run_evidence.unexpected_field",
          path: "/command",
        }),
        expect.objectContaining({
          code: "runtime_adapter_implementation_dry_run_evidence.side_effects_forbidden",
          path: "/side_effects",
        }),
      ]),
      runtime_adapter_implementation_allowed: false,
      runtime_adapter_dispatch_allowed: false,
      live_adapter_invocation_allowed: false,
      live_broker_dispatch_allowed: false,
      live_execution_allowed: false,
      raw_input_content: "withheld",
      side_effects: [],
    });
    expect(response.body).not.toContain("DATABASE_URL");
    expect(response.body).not.toContain("rm -rf");
    expect(response.body).not.toContain("dispatch raw runtime adapter");
    await gateway.close();
  });
});
