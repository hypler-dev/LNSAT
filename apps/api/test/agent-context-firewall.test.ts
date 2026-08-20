import { describe, expect, it } from "vitest";
import {
  agentContextFirewallGatewayContract,
  inspectAgentContextFirewallGatewayRequest,
} from "../src/index.js";

const now = new Date("2026-06-05T00:00:00.000Z");

describe("@lnsat/api BP-0504 agent context firewall Gateway contract", () => {
  it("returns read-only agent context firewall evidence through Gateway", async () => {
    const response = await inspectAgentContextFirewallGatewayRequest(
      {
        request_id: "req_bp0504_agent_context_firewall",
        firewall_bundle_request: validFirewallBundle(),
      },
      { now },
    );

    expect(response).toMatchObject({
      ok: true,
      contract_id: agentContextFirewallGatewayContract.contract_id,
      request_id: "req_bp0504_agent_context_firewall",
      inspected_at: "2026-06-05T00:00:00.000Z",
      firewall_contract_id: "lnsat.agent.context_firewall.v0_1",
      firewall_level: "guarded",
      provider_dispatch_allowed: false,
      runtime_mutation_allowed: false,
      raw_input_content: "withheld",
      side_effects: [],
    });

    if (!response.ok) {
      throw new Error("expected agent context firewall Gateway success");
    }

    expect(response.agent_profile_refs).toEqual([
      "agent.delegation_broker",
      "agent.source_reviewer",
    ]);
    expect(response.provider_profile_refs).toEqual([
      "provider.local.ollama",
      "provider.openai",
    ]);
    expect(response.permission_profile_refs).toEqual(["perm.guarded_default"]);
    expect(response.context_decisions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          item_ref: "ctx.public.packet_scope",
          decision: "include",
        }),
        expect.objectContaining({
          item_ref: "ctx.secret.ref",
          decision: "exclude",
          reason_codes: ["context.secret_like_content"],
        }),
      ]),
    );
    expect(response.excluded_context_refs).toEqual(["ctx.secret.ref"]);
    expect(response.audit_event_plan).toEqual(
      expect.arrayContaining([
        "agent_profile_selected",
        "firewall_policy_checked",
        "context_bundle_compiled",
      ]),
    );
    expect(response.source_docs).toEqual(
      expect.arrayContaining([
        "docs/reference/CONTRACT_PROVENANCE.md",
        "packages/packets/src/agent-context-firewall.ts",
        "apps/api/src/agent-context-firewall.ts",
      ]),
    );
  });

  it("fails closed for malformed Gateway requests without raw rejected value echo", async () => {
    const response = await inspectAgentContextFirewallGatewayRequest(
      {
        request_id: 504,
        raw_rejected_value: "sk-live-inline-secret",
      },
      { now },
    );

    expect(response).toMatchObject({
      ok: false,
      contract_id: agentContextFirewallGatewayContract.contract_id,
      request_id: null,
      request_errors: [
        {
          code: "agent_context_firewall_gateway.unexpected_field",
          path: "/raw_rejected_value",
        },
        {
          code: "agent_context_firewall_gateway.invalid_request_id",
          path: "/request_id",
        },
        {
          code: "agent_context_firewall_gateway.missing_firewall_bundle_request",
          path: "/firewall_bundle_request",
        },
      ],
      firewall_errors: [],
      agent_context_firewall_bundle: null,
      provider_dispatch_allowed: false,
      runtime_mutation_allowed: false,
      raw_input_content: "withheld",
      side_effects: [],
    });
    expect(JSON.stringify(response)).not.toContain("sk-live-inline-secret");
  });

  it("fails closed when delegated firewall evidence requests dispatch or mutation", async () => {
    const response = await inspectAgentContextFirewallGatewayRequest(
      {
        request_id: "req_bp0504_blocked_delegated_firewall",
        firewall_bundle_request: {
          ...validFirewallBundle(),
          provider_dispatch_allowed: true,
          runtime_mutation_allowed: true,
          side_effects: [{ effect_type: "provider_call" }],
        },
      },
      { now },
    );

    expect(response).toMatchObject({
      ok: false,
      request_id: "req_bp0504_blocked_delegated_firewall",
      request_errors: [],
      agent_context_firewall_bundle: null,
      provider_dispatch_allowed: false,
      runtime_mutation_allowed: false,
      raw_input_content: "withheld",
      side_effects: [],
    });
    expect(response.firewall_errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "agent_context_firewall.provider_dispatch_forbidden",
          path: "/provider_dispatch_allowed",
        }),
        expect.objectContaining({
          code: "agent_context_firewall.runtime_mutation_forbidden",
          path: "/runtime_mutation_allowed",
        }),
        expect.objectContaining({
          code: "agent_context_firewall.side_effects_forbidden",
          path: "/side_effects",
        }),
      ]),
    );
  });
});

function validFirewallBundle() {
  return {
    request_id: "ctx_firewall_0504",
    project_id: "lnsat",
    actor_id: "agent.codex",
    packet_ref: "BP-0504",
    firewall_level: "guarded",
    created_at: now.toISOString(),
    agent_profiles: [
      {
        agent_id: "agent.delegation_broker",
        display_name: "Delegation Broker",
        agent_kind: "internal_delegation_broker",
        provider_kind: "human",
        provider_ref: "provider.human.owner",
        model_or_client_ref: "seat.owner",
        default_role: "approval_triage",
        default_skillsets: ["source-review", "approval-triage"],
        default_control_level: "managed_autonomy",
        default_firewall_level: "guarded",
        permission_profile_ref: "perm.guarded_default",
        context_policy_ref: "ctx.policy.guarded_default",
        secret_ref_policy: "secret_refs_only",
        audit_profile_ref: "audit.default",
        operator_owner_ref: "human.jeff",
        enabled: true,
        policy_authority: false,
        source_refs: [
          "doc:docs/architecture/AGENT_CONTEXT_FIREWALL_AND_PERMISSION_LEVELS.md",
        ],
      },
      {
        agent_id: "agent.source_reviewer",
        display_name: "Source Reviewer",
        agent_kind: "review_agent",
        provider_kind: "commercial_api",
        provider_ref: "provider.openai",
        model_or_client_ref: "model.gpt-review",
        default_role: "source_reviewer",
        default_skillsets: ["source-review"],
        default_control_level: "assist",
        default_firewall_level: "guarded",
        permission_profile_ref: "perm.guarded_default",
        context_policy_ref: "ctx.policy.guarded_default",
        secret_ref_policy: "secret_refs_only",
        audit_profile_ref: "audit.default",
        operator_owner_ref: "human.jeff",
        enabled: true,
        source_refs: [
          "doc:docs/architecture/AGENT_CONTEXT_FIREWALL_AND_PERMISSION_LEVELS.md",
        ],
      },
    ],
    provider_profiles: [
      {
        provider_ref: "provider.openai",
        display_name: "OpenAI",
        provider_kind: "commercial_api",
        allowed_data_classes: ["public", "internal"],
        secret_ref_policy: "secret_refs_only",
        live_dispatch_allowed: false,
        source_refs: [
          "doc:docs/architecture/AGENT_CONTEXT_FIREWALL_AND_PERMISSION_LEVELS.md",
        ],
      },
      {
        provider_ref: "provider.local.ollama",
        display_name: "Ollama Local",
        provider_kind: "local_model",
        allowed_data_classes: ["public", "internal", "sensitive"],
        secret_ref_policy: "none",
        live_dispatch_allowed: false,
        source_refs: [
          "doc:docs/architecture/AGENT_CONTEXT_FIREWALL_AND_PERMISSION_LEVELS.md",
        ],
      },
    ],
    permission_profiles: [
      {
        permission_profile_ref: "perm.guarded_default",
        display_name: "Guarded Default",
        default_mode: "preview_only",
        capability_modes: [
          {
            capability: "context.compile",
            mode: "allowed",
            resource_refs: ["repo:lnsat"],
          },
          {
            capability: "secret.read.never",
            mode: "blocked",
            resource_refs: ["secret.all"],
          },
        ],
        source_refs: [
          "doc:docs/architecture/POLICY_AND_AUDIT.md",
          "doc:docs/architecture/AGENT_CONTEXT_FIREWALL_AND_PERMISSION_LEVELS.md",
        ],
      },
    ],
    context_items: [
      {
        item_ref: "ctx.public.packet_scope",
        source_family: "packet_scope",
        source_ref: "packet:BP-0504",
        summary: "read-only Gateway and MCP inspection only",
        data_class: "public",
        trust_level: "source_backed",
      },
      {
        item_ref: "ctx.secret.ref",
        source_family: "provider_profile",
        source_ref: "secret-ref:provider.openai.api",
        summary: "credential reference only value withheld",
        data_class: "secret",
        trust_level: "operator_supplied",
      },
    ],
    provider_dispatch_allowed: false,
    runtime_mutation_allowed: false,
    side_effects: [],
  };
}
