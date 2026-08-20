import { describe, expect, it } from "vitest";
import {
  createRuntimeAdapterImplementationDryRunEvidence,
  defaultRuntimeAdapterImplementationDryRunEvidence,
  runtimeAdapterImplementationApprovalGateContract,
  runtimeAdapterImplementationAuthorizationRequestContract,
  runtimeAdapterImplementationDryRunEvidenceContract,
  runtimeAdapterImplementationPlanContract,
  runtimeAdapterImplementationScopeContract,
  runtimeAdapterReadinessGateContract,
} from "../src/index.js";

describe("runtime adapter implementation dry-run evidence contract", () => {
  it("emits source-only runtime adapter implementation dry-run evidence", () => {
    const result = createRuntimeAdapterImplementationDryRunEvidence();

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected dry-run evidence success");
    }

    expect(result.runtime_adapter_implementation_dry_run_evidence).toMatchObject({
      contract_id: runtimeAdapterImplementationDryRunEvidenceContract.contract_id,
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
    expect(
      result.runtime_adapter_implementation_dry_run_evidence.packet_selection_refs,
    ).toEqual([
      {
        packet_selection_ref:
          "packet_selection:bp0162-runtime-adapter-implementation-packet-selection",
        packet_ref: "packet:BP-0162",
        evidence_ref: "evidence:bp0162-runtime-adapter-implementation-packet-selection",
        summary: "BP-0162 selected BP-0163 dry-run evidence before implementation",
      },
    ]);
    expect(
      result.runtime_adapter_implementation_dry_run_evidence
        .approval_gate_chain_review_refs,
    ).toEqual([
      {
        chain_review_ref:
          "chain_review:bp0161-runtime-adapter-approval-gate-chain-review",
        packet_ref: "packet:BP-0161",
        evidence_ref: "evidence:bp0161-runtime-adapter-approval-gate-chain-review",
        summary: "BP-0161 reviewed BP-0156 through BP-0160 approval gate chain",
      },
    ]);
    expect(
      result.runtime_adapter_implementation_dry_run_evidence.approval_gate_refs[0]
        ?.contract_id,
    ).toBe(runtimeAdapterImplementationApprovalGateContract.contract_id);
    expect(
      result.runtime_adapter_implementation_dry_run_evidence
        .authorization_request_refs[0]?.contract_id,
    ).toBe(runtimeAdapterImplementationAuthorizationRequestContract.contract_id);
    expect(
      result.runtime_adapter_implementation_dry_run_evidence.implementation_plan_refs[0]
        ?.contract_id,
    ).toBe(runtimeAdapterImplementationPlanContract.contract_id);
    expect(
      result.runtime_adapter_implementation_dry_run_evidence
        .runtime_adapter_implementation_scope_refs[0]?.contract_id,
    ).toBe(runtimeAdapterImplementationScopeContract.contract_id);
    expect(
      result.runtime_adapter_implementation_dry_run_evidence
        .runtime_adapter_readiness_gate_refs[0]?.contract_id,
    ).toBe(runtimeAdapterReadinessGateContract.contract_id);
    expect(
      result.runtime_adapter_implementation_dry_run_evidence.validation_command_refs,
    ).toEqual(
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
    expect(
      result.runtime_adapter_implementation_dry_run_evidence.dry_run_artifact_refs,
    ).toEqual([
      {
        artifact_ref: "artifact:bp0163-dry-run-evidence-contract-output",
        evidence_ref: "evidence:bp0163-runtime-adapter-implementation-dry-run-evidence",
        summary:
          "Source-only dry-run evidence artifact exists before adapter implementation opens",
      },
    ]);
    expect(
      result.runtime_adapter_implementation_dry_run_evidence.required_policy_gates,
    ).toContain("substrate.adapter.implementation_dry_run_evidence.review");
    expect(
      result.runtime_adapter_implementation_dry_run_evidence.packet_selection_snapshot,
    ).toMatchObject({
      packet_ref: "packet:BP-0162",
      selected_next_packet_ref: "packet:BP-0163",
      selected_contract_id:
        runtimeAdapterImplementationDryRunEvidenceContract.contract_id,
      side_effects: [],
    });
    expect(
      result.runtime_adapter_implementation_dry_run_evidence
        .approval_gate_chain_review_snapshot,
    ).toMatchObject({
      packet_ref: "packet:BP-0161",
      reviewed_source_contract_id:
        runtimeAdapterImplementationApprovalGateContract.contract_id,
      reviewed_mcp_tool:
        "lnsat.platform.runtime_adapter_implementation_approval_gate.inspect",
      registered_read_only_tool_count: 22,
      side_effects: [],
    });
    expect(
      result.runtime_adapter_implementation_dry_run_evidence
        .approval_gate_evidence_snapshot,
    ).toMatchObject({
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
    expect(result.side_effects).toEqual([]);
  });

  it("fails closed for runtime adapter implementation, dispatch, live invocation, broker dispatch, and live execution", () => {
    const result = createRuntimeAdapterImplementationDryRunEvidence({
      runtime_adapter_implementation_allowed: true,
      runtime_adapter_dispatch_allowed: true,
      live_adapter_invocation_allowed: true,
      live_broker_dispatch_allowed: true,
      live_execution_allowed: true,
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected dry-run evidence failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        {
          code: "runtime_adapter_implementation_dry_run_evidence.runtime_adapter_implementation_forbidden",
          path: "/runtime_adapter_implementation_allowed",
          message:
            "Runtime adapter implementation dry-run evidence cannot enable runtime adapter implementation.",
          severity: "error",
        },
        {
          code: "runtime_adapter_implementation_dry_run_evidence.runtime_adapter_dispatch_forbidden",
          path: "/runtime_adapter_dispatch_allowed",
          message:
            "Runtime adapter implementation dry-run evidence cannot enable runtime adapter dispatch.",
          severity: "error",
        },
        {
          code: "runtime_adapter_implementation_dry_run_evidence.live_adapter_invocation_forbidden",
          path: "/live_adapter_invocation_allowed",
          message:
            "Runtime adapter implementation dry-run evidence cannot enable live adapter invocation.",
          severity: "error",
        },
        {
          code: "runtime_adapter_implementation_dry_run_evidence.live_broker_dispatch_forbidden",
          path: "/live_broker_dispatch_allowed",
          message:
            "Runtime adapter implementation dry-run evidence cannot enable live broker dispatch.",
          severity: "error",
        },
        {
          code: "runtime_adapter_implementation_dry_run_evidence.live_execution_forbidden",
          path: "/live_execution_allowed",
          message:
            "Runtime adapter implementation dry-run evidence cannot enable live execution.",
          severity: "error",
        },
      ]),
    );
  });

  it("fails closed for missing refs and artifacts", () => {
    const result = createRuntimeAdapterImplementationDryRunEvidence({
      packet_selection_refs: [],
      approval_gate_chain_review_refs: [],
      approval_gate_refs: [],
      authorization_request_refs: [],
      implementation_plan_refs: [],
      runtime_adapter_implementation_scope_refs: [],
      runtime_adapter_readiness_gate_refs: [],
      validation_command_refs: [],
      dry_run_artifact_refs: [],
      rollback_refs: [],
      policy_gate_refs: [],
      human_approval_refs: [],
      audit_event_refs: [],
      source_refs: [],
      future_implementation_packet_refs: [],
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected dry-run evidence failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        {
          code: "runtime_adapter_implementation_dry_run_evidence.packet_selection_ref_required",
          path: "/packet_selection_refs",
          message:
            "Runtime adapter implementation dry-run evidence requires BP-0162 packet selection refs.",
          severity: "error",
        },
        {
          code: "runtime_adapter_implementation_dry_run_evidence.chain_review_ref_required",
          path: "/approval_gate_chain_review_refs",
          message:
            "Runtime adapter implementation dry-run evidence requires BP-0161 chain review refs.",
          severity: "error",
        },
        {
          code: "runtime_adapter_implementation_dry_run_evidence.approval_gate_ref_required",
          path: "/approval_gate_refs",
          message:
            "Runtime adapter implementation dry-run evidence requires BP-0156 approval gate refs.",
          severity: "error",
        },
        {
          code: "runtime_adapter_implementation_dry_run_evidence.authorization_request_ref_required",
          path: "/authorization_request_refs",
          message:
            "Runtime adapter implementation dry-run evidence requires BP-0150 authorization request refs.",
          severity: "error",
        },
        {
          code: "runtime_adapter_implementation_dry_run_evidence.validation_command_ref_required",
          path: "/validation_command_refs",
          message:
            "Runtime adapter implementation dry-run evidence requires validation command refs.",
          severity: "error",
        },
        {
          code: "runtime_adapter_implementation_dry_run_evidence.dry_run_artifact_ref_required",
          path: "/dry_run_artifact_refs",
          message:
            "Runtime adapter implementation dry-run evidence requires dry-run artifact refs.",
          severity: "error",
        },
        {
          code: "runtime_adapter_implementation_dry_run_evidence.future_packet_ref_required",
          path: "/future_implementation_packet_refs",
          message:
            "Runtime adapter implementation dry-run evidence requires future implementation packet refs.",
          severity: "error",
        },
      ]),
    );
  });

  it("fails closed without raw rejected value echo for unsafe authority, secrets, commands, and side effects", () => {
    const result = createRuntimeAdapterImplementationDryRunEvidence({
      implementation_dry_run_evidence_authority: "runtime_adapter_implementation",
      validation_command_refs: [
        {
          validation_ref: "validation:unsafe",
          command_ref: "script:unsafe",
          expected_artifact_ref: "artifact:unsafe",
          summary: "run npm test",
        },
      ],
      source_refs: [
        {
          source_ref: "doc:docs/reference/CONTRACT_PROVENANCE.md",
          summary: "read DATABASE_URL TOKEN",
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
      side_effects: [{ effect_type: "runtime_adapter_implementation" }],
      command: "rm -rf /",
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected dry-run evidence failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        {
          code: "runtime_adapter_implementation_dry_run_evidence.unsafe_dry_run_authority",
          path: "/implementation_dry_run_evidence_authority",
          message:
            "Runtime adapter implementation dry-run evidence cannot grant runtime adapter authority.",
          severity: "error",
        },
        {
          code: "runtime_adapter_implementation_dry_run_evidence.unsafe_dry_run_authority",
          path: "/validation_command_refs",
          message: "Validation command refs cannot echo raw commands.",
          severity: "error",
        },
        {
          code: "runtime_adapter_implementation_dry_run_evidence.secret_value_forbidden",
          path: "/source_refs/0",
          message: "Source refs cannot contain secret-like values.",
          severity: "error",
        },
        {
          code: "runtime_adapter_implementation_dry_run_evidence.unexpected_field",
          path: "/command",
          message: "Unexpected runtime adapter implementation dry-run evidence field.",
          severity: "error",
        },
        {
          code: "runtime_adapter_implementation_dry_run_evidence.side_effects_forbidden",
          path: "/side_effects",
          message:
            "Runtime adapter implementation dry-run evidence must preserve side_effects: [].",
          severity: "error",
        },
      ]),
    );
    expect(JSON.stringify(result)).not.toContain("DATABASE_URL");
    expect(JSON.stringify(result)).not.toContain("TOKEN");
    expect(JSON.stringify(result)).not.toContain("rm -rf");
    expect(JSON.stringify(result)).not.toContain("npm test");
    expect(JSON.stringify(result)).not.toContain(
      "Grant runtime_adapter_implementation",
    );
  });

  it("keeps default evidence reusable for source-only dry-run consumers", () => {
    expect(defaultRuntimeAdapterImplementationDryRunEvidence).toMatchObject({
      contract_id: runtimeAdapterImplementationDryRunEvidenceContract.contract_id,
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
  });
});
