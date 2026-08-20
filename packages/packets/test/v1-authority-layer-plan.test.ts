import { describe, expect, it } from "vitest";
import {
  createV1AuthorityLayerPlan,
  v1AuthorityHardwareProfiles,
  v1AuthorityLayerPlanContract,
  v1AuthorityLayerRoles,
  v1AuthorityNonGoals,
  v1AuthorityReferenceFlow,
  v1AuthoritySecurityInvariants,
} from "../src/index.js";

describe("v1 authority layer plan", () => {
  it("keeps transport, identity, policy, authority, and evidence roles separate", () => {
    const plan = createV1AuthorityLayerPlan();

    expect(plan.roles).toEqual(v1AuthorityLayerRoles);
    expect(plan.roles.mcp).toBe("agent_tool_transport");
    expect(plan.roles.a2a).toBe("agent_agent_transport");
    expect(plan.roles.opa).toBe("external_policy_decision_point");
    expect(plan.roles.lnsat).toBe(
      "packet_authority_approval_execution_binding_receipt_audit",
    );
    expect(v1AuthorityLayerPlanContract.transport_neutral).toBe(true);
    expect(v1AuthorityLayerPlanContract.gateway_is_security_boundary).toBe(true);
    expect(v1AuthorityLayerPlanContract.approval_grants_execution_authority).toBe(
      false,
    );
    expect(plan.side_effects).toEqual([]);
  });

  it("freezes complete synthetic flow and exact authority invariants", () => {
    const plan = createV1AuthorityLayerPlan();

    expect(plan.flow).toEqual(v1AuthorityReferenceFlow);
    expect(plan.security_invariants).toEqual(v1AuthoritySecurityInvariants);
    expect(plan.non_goals).toEqual(v1AuthorityNonGoals);
    expect(plan.hardware_profiles).toEqual(v1AuthorityHardwareProfiles);
    expect(plan.flow.at(0)).toBe("agent_deployment_proposal");
    expect(plan.flow.at(-1)).toBe("requested_approved_executed_audit_proof");
    expect(plan.security_invariants).toContain(
      "requested_digest_equals_approved_digest_equals_executed_digest",
    );
    expect(v1AuthorityLayerPlanContract.reference_execution).toBe(
      "local_disposable_synthetic_non_production",
    );
    expect(v1AuthorityLayerPlanContract.live_execution_allowed).toBe(false);
  });
});
