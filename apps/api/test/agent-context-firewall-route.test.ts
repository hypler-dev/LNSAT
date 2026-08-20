import { afterAll, describe, expect, it } from "vitest";
import { agentContextFirewallGatewayContract, buildApiGateway } from "../src/index.js";

const now = new Date("2026-06-05T00:00:00.000Z");

describe("@lnsat/api BP-0504 agent context firewall route", () => {
  const gateway = buildApiGateway({
    now: () => now,
  });

  afterAll(async () => {
    await gateway.close();
  });

  it("inspects agent context firewall evidence through the read-only Fastify route", async () => {
    const response = await gateway.inject({
      method: agentContextFirewallGatewayContract.method,
      url: agentContextFirewallGatewayContract.path,
      payload: {
        request_id: "req_bp0504_route_agent_context_firewall",
        firewall_bundle_request: validFirewallBundle(),
      },
    });

    const body = response.json();

    expect(response.statusCode).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      contract_id: agentContextFirewallGatewayContract.contract_id,
      request_id: "req_bp0504_route_agent_context_firewall",
      inspected_at: "2026-06-05T00:00:00.000Z",
      firewall_contract_id: "lnsat.agent.context_firewall.v0_1",
      firewall_level: "guarded",
      provider_dispatch_allowed: false,
      runtime_mutation_allowed: false,
      raw_input_content: "withheld",
      side_effects: [],
    });
    expect(body.context_decisions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          item_ref: "ctx.public.packet_scope",
          decision: "include",
        }),
        expect.objectContaining({
          item_ref: "ctx.secret.ref",
          decision: "exclude",
        }),
      ]),
    );
    expect(body.excluded_context_refs).toEqual(["ctx.secret.ref"]);
    expect(body.audit_event_plan).toEqual(
      expect.arrayContaining([
        "agent_profile_selected",
        "firewall_policy_checked",
        "context_bundle_compiled",
      ]),
    );
  });

  it("maps malformed route requests to 400 without raw rejected value echo", async () => {
    const response = await gateway.inject({
      method: agentContextFirewallGatewayContract.method,
      url: agentContextFirewallGatewayContract.path,
      payload: {
        request_id: 504,
        raw_rejected_value: "DATABASE_URL=postgres://inline-secret",
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
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
    expect(response.body).not.toContain("DATABASE_URL");
    expect(response.body).not.toContain("postgres://inline-secret");
  });
});

function validFirewallBundle() {
  return {
    request_id: "ctx_firewall_0504_route",
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
        default_skillsets: ["source-review"],
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
        ],
        source_refs: [
          "doc:docs/architecture/AGENT_CONTEXT_FIREWALL_AND_PERMISSION_LEVELS.md",
        ],
      },
    ],
    context_items: [
      {
        item_ref: "ctx.public.packet_scope",
        source_family: "packet_scope",
        source_ref: "packet:BP-0504",
        summary: "read-only Gateway inspection route",
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
