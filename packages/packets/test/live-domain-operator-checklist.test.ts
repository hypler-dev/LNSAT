import { describe, expect, it } from "vitest";
import {
  cloudflareLiveApprovalContract,
  createLiveDomainOperatorChecklist,
  defaultLiveDomainOperatorChecklistRefs,
  defaultLiveDomainOperatorNoLivePosture,
  defaultLiveDomainOperatorRoleRefs,
  liveDomainOperatorBlockedFlags,
  liveDomainOperatorChecklistContract,
  liveDomainOperatorHostedChecklistItems,
  liveDomainOperatorPublicChecklistItems,
  liveDomainOperatorRoles,
  type LiveDomainOperatorChecklistRequest,
} from "../src/index.js";

describe("live domain operator checklist", () => {
  it("emits BP-0251 source-only live-domain operator checklist evidence", () => {
    const result = createLiveDomainOperatorChecklist();

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected live-domain operator checklist success");
    }

    expect(result.live_domain_operator_checklist).toMatchObject({
      contract_id: liveDomainOperatorChecklistContract.contract_id,
      extends_contract_id: cloudflareLiveApprovalContract.contract_id,
      identity: {
        packet_ref: "BP-0251",
        selected_after_packet_ref: "BP-0250",
        public_domain: "lnsat.com",
        hosted_domain: "cloud.lnsat.com",
        checklist_state: "operator_checklist_staged_not_approved",
        implementation_allowed: false,
      },
      operator_state: {
        public_site_state: "checklist_staged_not_approved",
        hosted_cloud_state: "reserved_future_packet_required",
        fallback_url: null,
        public_site_scope: "lnsat_com_only_requires_explicit_dns_cloudflare_approval",
        hosted_cloud_scope: "closed_no_tunnel_or_customer_data",
      },
      pages_custom_domain_attachments: [],
      dns_record_mutations: [],
      ssl_certificate_mutations: [],
      tunnel_creations: [],
      tunnel_dns_routes: [],
      tunnel_public_hostnames: [],
      cloudflared_service_installs: [],
      cloud_lnsat_routes: [],
      hosted_runtimes: [],
      customer_data_events: [],
      cloudflare_api_mutations: [],
      wrangler_mutations: [],
      external_service_calls: [],
      git_pushes: [],
      deploys: [],
      side_effects: [],
    });
    expect(
      result.live_domain_operator_checklist.checklist_refs
        .filter((ref) => ref.lane === "public_site")
        .map((ref) => ref.item),
    ).toEqual([...liveDomainOperatorPublicChecklistItems]);
    expect(
      result.live_domain_operator_checklist.checklist_refs
        .filter((ref) => ref.lane === "hosted_cloud")
        .map((ref) => ref.item),
    ).toEqual([...liveDomainOperatorHostedChecklistItems]);
    expect(
      result.live_domain_operator_checklist.role_refs.map((ref) => ref.role),
    ).toEqual([...liveDomainOperatorRoles]);
    expect(result.live_domain_operator_checklist.blocked_capabilities).toEqual([
      ...liveDomainOperatorBlockedFlags,
    ]);
    expect(result.side_effects).toEqual([]);
    expect(liveDomainOperatorChecklistContract).toMatchObject({
      historical_only: true,
      superseded_by_contract_id:
        "lnsat.platform.product_site_operational_endpoint_boundary.v0_1",
    });
  });

  it("fails closed when public or hosted checklist refs are missing", () => {
    const result = createLiveDomainOperatorChecklist({
      checklist_refs: defaultLiveDomainOperatorChecklistRefs.filter(
        (ref) =>
          ref.item !== "dns_change_evidence" && ref.item !== "gateway_runtime_evidence",
      ),
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected missing checklist refs failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "live_domain_operator_checklist.ref_required",
        }),
      ]),
    );
    expect(result.raw_input_content).toBe("withheld");
  });

  it("fails closed when roles are missing or assigned before live approval", () => {
    const result = createLiveDomainOperatorChecklist({
      role_refs: defaultLiveDomainOperatorRoleRefs
        .filter((ref) => ref.role !== "rollback_owner")
        .map((ref) => (ref.role === "approver" ? { ...ref, assigned: true } : ref)),
    } as unknown as LiveDomainOperatorChecklistRequest);

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected role failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "live_domain_operator_checklist.role_required",
        }),
        expect.objectContaining({
          code: "live_domain_operator_checklist.role_invalid",
        }),
      ]),
    );
  });

  it("fails closed on DNS/Tunnel mutation flags, unsafe refs, unexpected fields, and side effects", () => {
    const result = createLiveDomainOperatorChecklist({
      checklist_refs: defaultLiveDomainOperatorChecklistRefs.map((ref) =>
        ref.item === "tunnel_evidence"
          ? { ...ref, source_ref: "cloudflared route cloud.lnsat.com" }
          : ref,
      ),
      no_live_posture: {
        ...defaultLiveDomainOperatorNoLivePosture,
        dns_record_mutation_allowed: true,
        pages_custom_domain_attachment_allowed: true,
        tunnel_create_allowed: true,
        cloud_lnsat_route_allowed: true,
      } as typeof defaultLiveDomainOperatorNoLivePosture,
      deploy_allowed: true,
      unexpected_secret_value: true,
      side_effects: ["attach custom domain"],
    } as unknown as LiveDomainOperatorChecklistRequest);

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected blocked live-domain checklist failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "live_domain_operator_checklist.ref_invalid",
        }),
        expect.objectContaining({
          code: "live_domain_operator_checklist.no_live_posture_drift",
        }),
        expect.objectContaining({
          code: "live_domain_operator_checklist.blocked_capability_drift",
        }),
        expect.objectContaining({
          code: "live_domain_operator_checklist.unexpected_field",
        }),
        expect.objectContaining({
          code: "live_domain_operator_checklist.side_effects_forbidden",
        }),
      ]),
    );
    expect(result.raw_input_content).toBe("withheld");
    expect(result.side_effects).toEqual([]);
  });
});
