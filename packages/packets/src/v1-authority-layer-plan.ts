export const V1_AUTHORITY_LAYER_PLAN_STATUS = "source_only";

export const v1AuthorityLayerRoles = {
  mcp: "agent_tool_transport",
  a2a: "agent_agent_transport",
  agent_sdks: "orchestration_model_loop",
  oidc_spiffe: "human_workload_identity",
  opa: "external_policy_decision_point",
  hardware_runtime_attestations: "environmental_policy_facts",
  lnsat: "packet_authority_approval_execution_binding_receipt_audit",
  opentelemetry_cloudevents: "observability_export_envelopes",
} as const;

export const v1AuthorityReferenceFlow = [
  "agent_deployment_proposal",
  "versioned_action_packet",
  "authenticated_gateway",
  "opa_compatible_policy_input",
  "scoped_human_approval",
  "server_signed_approval_evidence",
  "one_time_execution_authorization",
  "local_sandbox_adapter",
  "execution_receipt",
  "requested_approved_executed_audit_proof",
] as const;

export const v1AuthoritySecurityInvariants = [
  "transport_never_grants_authority",
  "requester_and_approver_are_distinct_authenticated_sessions",
  "approval_evidence_is_server_signed_scoped_expiring_and_non_executable",
  "execution_authorization_is_server_signed_short_lived_and_one_time",
  "requested_digest_equals_approved_digest_equals_executed_digest",
  "receipt_binds_authorization_adapter_target_action_artifacts_and_result",
  "unknown_stale_replayed_revoked_or_substituted_evidence_fails_closed",
] as const;

export const v1AuthorityNonGoals = [
  "replace_mcp_or_a2a",
  "generic_agent_framework",
  "proprietary_general_policy_language",
  "replace_kubernetes_or_nomad",
  "generic_scheduler",
  "unrestricted_shell_ssh_provider_or_infrastructure_control",
] as const;

export const v1AuthorityHardwareProfiles = [
  "apple_silicon_local_sandbox",
  "linux_accelerator_sandbox",
] as const;

export const v1AuthorityLayerPlanContract = {
  contract_id: "lnsat.platform.v1_authority_layer_plan.v1_0",
  contract_version: "1.0",
  status: V1_AUTHORITY_LAYER_PLAN_STATUS,
  positioning: "Execution authorization and evidence for consequential agent actions.",
  comparison:
    "MCP exposes tools. LNSAT determines whether a proposed action may execute and records proof.",
  gateway_is_security_boundary: true,
  transport_neutral: true,
  opa_optional: true,
  reference_execution: "local_disposable_synthetic_non_production",
  approval_grants_execution_authority: false,
  production_adapter_allowed: false,
  live_execution_allowed: false,
  side_effects: [],
  source_docs: [
    "docs/architecture/ADR-0002_AUTHORITY_LAYER_AND_V1_DISTRIBUTION.md",
    "docs/architecture/AUTHORITY_LAYER_AND_REFERENCE_WORKFLOW.md",
    "docs/architecture/THREAT_MODEL.md",
    "docs/ROADMAP.md",
  ],
} as const;

export type V1AuthorityLayerPlan = {
  roles: typeof v1AuthorityLayerRoles;
  flow: typeof v1AuthorityReferenceFlow;
  security_invariants: typeof v1AuthoritySecurityInvariants;
  non_goals: typeof v1AuthorityNonGoals;
  hardware_profiles: typeof v1AuthorityHardwareProfiles;
  side_effects: [];
};

export function createV1AuthorityLayerPlan(): V1AuthorityLayerPlan {
  return {
    roles: v1AuthorityLayerRoles,
    flow: v1AuthorityReferenceFlow,
    security_invariants: v1AuthoritySecurityInvariants,
    non_goals: v1AuthorityNonGoals,
    hardware_profiles: v1AuthorityHardwareProfiles,
    side_effects: [],
  };
}
