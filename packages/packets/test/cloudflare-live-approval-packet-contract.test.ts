import { describe, expect, it } from "vitest";
import {
  cloudflareLiveApprovalBlockedFlags,
  cloudflareLiveApprovalContract,
  cloudflareLiveApprovalHostedCloudRefs,
  cloudflareLiveApprovalPublicSiteRefs,
  createCloudflareLiveApproval,
  defaultCloudflareLiveApprovalNoLivePosture,
  defaultCloudflareLiveApprovalRefs,
  domainCloudflareRunbookContract,
  type CloudflareLiveApprovalRequest,
} from "../src/index.js";

describe("Cloudflare live approval packet contract", () => {
  it("emits BP-0244 source-only approval checklist evidence", () => {
    const result = createCloudflareLiveApproval();

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected Cloudflare live approval success");
    }

    expect(result.cloudflare_live_approval).toMatchObject({
      contract_id: cloudflareLiveApprovalContract.contract_id,
      extends_contract_id: domainCloudflareRunbookContract.contract_id,
      identity: {
        packet_ref: "BP-0244",
        selected_after_packet_ref: "BP-0243",
        public_domain: "lnsat.com",
        hosted_domain: "cloud.lnsat.com",
        approval_packet_state: "not_approved",
        implementation_allowed: false,
      },
      approval_state: {
        public_site_approval: "not_approved",
        hosted_cloud_approval: "not_approved",
        public_site_scope_state: "closed_requires_explicit_dns_cloudflare_approval",
        hosted_cloud_scope_state: "closed_requires_future_gateway_auth_runtime_packet",
        current_allowed_output: "source_only_checklist",
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
      result.cloudflare_live_approval.approval_refs
        .filter((ref) => ref.lane === "public_site")
        .map((ref) => ref.ref_kind),
    ).toEqual([...cloudflareLiveApprovalPublicSiteRefs]);
    expect(
      result.cloudflare_live_approval.approval_refs
        .filter((ref) => ref.lane === "hosted_cloud")
        .map((ref) => ref.ref_kind),
    ).toEqual([...cloudflareLiveApprovalHostedCloudRefs]);
    expect(result.cloudflare_live_approval.blocked_capabilities).toEqual([
      ...cloudflareLiveApprovalBlockedFlags,
    ]);
    expect(result.side_effects).toEqual([]);
    expect(cloudflareLiveApprovalContract).toMatchObject({
      historical_only: true,
      superseded_by_contract_id:
        "lnsat.platform.product_site_operational_endpoint_boundary.v0_1",
    });
  });

  it("fails closed when required approval refs are missing", () => {
    const result = createCloudflareLiveApproval({
      approval_refs: defaultCloudflareLiveApprovalRefs.filter(
        (ref) => ref.ref_kind !== "ssl_tls_verification",
      ),
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected missing approval ref failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "cloudflare_live_approval.ref_required",
        }),
      ]),
    );
    expect(result.raw_input_content).toBe("withheld");
  });

  it("fails closed on approval drift, live Cloudflare scope, customer data, and side effects", () => {
    const result = createCloudflareLiveApproval({
      approval_state: {
        public_site_approval: "public_site_approval_ready",
        hosted_cloud_approval: "not_approved",
        public_site_scope_state: "closed_requires_explicit_dns_cloudflare_approval",
        hosted_cloud_scope_state: "closed_requires_future_gateway_auth_runtime_packet",
        current_allowed_output: "source_only_checklist",
      },
      approval_refs: defaultCloudflareLiveApprovalRefs.map((ref) =>
        ref.ref_kind === "explicit_human_approval_gate"
          ? { ...ref, approved: true }
          : ref,
      ),
      no_live_posture: {
        ...defaultCloudflareLiveApprovalNoLivePosture,
        dns_record_mutation_allowed: true,
        pages_custom_domain_attachment_allowed: true,
        cloud_lnsat_route_allowed: true,
        customer_data_handling_allowed: true,
      } as typeof defaultCloudflareLiveApprovalNoLivePosture,
      tunnel_create_allowed: true,
      side_effects: ["attach custom domain"],
    } as unknown as CloudflareLiveApprovalRequest);

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected Cloudflare live approval failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "cloudflare_live_approval.state_invalid",
        }),
        expect.objectContaining({
          code: "cloudflare_live_approval.ref_invalid",
        }),
        expect.objectContaining({
          code: "cloudflare_live_approval.no_live_posture_drift",
        }),
        expect.objectContaining({
          code: "cloudflare_live_approval.blocked_capability_drift",
        }),
        expect.objectContaining({
          code: "cloudflare_live_approval.side_effects_forbidden",
        }),
      ]),
    );
  });

  it("rejects unsafe Cloudflare command refs and unexpected fields without echoing raw input", () => {
    const result = createCloudflareLiveApproval({
      approval_refs: defaultCloudflareLiveApprovalRefs.map((ref) =>
        ref.ref_kind === "public_hostname_plan"
          ? { ...ref, source_ref: "cloudflared tunnel route dns cloud.lnsat.com" }
          : ref,
      ),
      unexpected_secret_value: true,
    } as unknown as CloudflareLiveApprovalRequest);

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected unsafe command failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "cloudflare_live_approval.ref_invalid",
        }),
        expect.objectContaining({
          code: "cloudflare_live_approval.unexpected_field",
        }),
      ]),
    );
    expect(result.raw_input_content).toBe("withheld");
    expect(result.side_effects).toEqual([]);
  });
});
