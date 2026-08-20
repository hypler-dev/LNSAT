import { describe, expect, it } from "vitest";
import {
  createDomainCloudflareRunbook,
  defaultDomainCloudflareRunbookNoLivePosture,
  defaultDomainCloudflareRunbookRefs,
  domainCloudflareRunbookBlockedFlags,
  domainCloudflareRunbookContract,
  domainCloudflareRunbookRequiredRefs,
  trustCenterIaContract,
  type DomainCloudflareRunbookRequest,
} from "../src/index.js";

describe("domain Cloudflare runbook contract", () => {
  it("emits BP-0243 source-only domain and Cloudflare runbook evidence", () => {
    const result = createDomainCloudflareRunbook();

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected domain Cloudflare runbook success");
    }

    expect(result.domain_cloudflare_runbook).toMatchObject({
      contract_id: domainCloudflareRunbookContract.contract_id,
      extends_contract_id: trustCenterIaContract.contract_id,
      identity: {
        packet_ref: "BP-0243",
        selected_after_packet_ref: "BP-0242",
        public_domain: "lnsat.com",
        hosted_domain: "cloud.lnsat.com",
        runbook_mode: "planned_not_executed",
        implementation_allowed: false,
      },
      runbook_summary: {
        pages_state: "lnsat_pages_dev_active_custom_domain_not_attached",
        public_domain_state: "lnsat_com_planned_not_attached",
        hosted_domain_state: "cloud_lnsat_reserved_not_routed",
        tunnel_state: "planned_not_created",
        dns_state: "planned_not_mutated",
        ssl_state: "planned_not_verified",
        live_scope_state: "closed_requires_explicit_approval",
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
      cloudflare_api_mutations: [],
      wrangler_mutations: [],
      external_service_calls: [],
      git_pushes: [],
      deploys: [],
      side_effects: [],
    });
    expect(
      result.domain_cloudflare_runbook.runbook_refs.map((ref) => ref.ref_kind),
    ).toEqual([...domainCloudflareRunbookRequiredRefs]);
    expect(result.domain_cloudflare_runbook.blocked_capabilities).toEqual([
      ...domainCloudflareRunbookBlockedFlags,
    ]);
    expect(result.side_effects).toEqual([]);
    expect(domainCloudflareRunbookContract).toMatchObject({
      historical_only: true,
      superseded_by_contract_id:
        "lnsat.platform.product_site_operational_endpoint_boundary.v0_1",
    });
  });

  it("fails closed when required runbook refs are missing", () => {
    const result = createDomainCloudflareRunbook({
      runbook_refs: defaultDomainCloudflareRunbookRefs.filter(
        (ref) => ref.ref_kind !== "tunnel_public_hostname_plan",
      ),
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected missing runbook ref failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "domain_cloudflare_runbook.ref_required",
        }),
      ]),
    );
    expect(result.raw_input_content).toBe("withheld");
  });

  it("fails closed on Pages, DNS, tunnel, hosted runtime, deploy, and side effects", () => {
    const result = createDomainCloudflareRunbook({
      runbook_summary: {
        pages_state: "lnsat_pages_dev_active_custom_domain_not_attached",
        public_domain_state: "lnsat_com_planned_not_attached",
        hosted_domain_state: "cloud_lnsat_reserved_not_routed",
        tunnel_state: "planned_not_created",
        dns_state: "planned_not_mutated",
        ssl_state: "planned_not_verified",
        live_scope_state: "closed_requires_explicit_approval",
      },
      runbook_refs: defaultDomainCloudflareRunbookRefs.map((ref) =>
        ref.ref_kind === "pages_custom_domain"
          ? { ...ref, mutation_allowed: true }
          : ref,
      ),
      no_live_posture: {
        ...defaultDomainCloudflareRunbookNoLivePosture,
        pages_custom_domain_attachment_allowed: true,
        dns_record_mutation_allowed: true,
        tunnel_create_allowed: true,
        cloud_lnsat_route_allowed: true,
        hosted_runtime_allowed: true,
      } as typeof defaultDomainCloudflareRunbookNoLivePosture,
      deploy_allowed: true,
      side_effects: ["attach custom domain"],
    } as unknown as DomainCloudflareRunbookRequest);

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected blocked domain Cloudflare runbook failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "domain_cloudflare_runbook.ref_invalid",
        }),
        expect.objectContaining({
          code: "domain_cloudflare_runbook.no_live_posture_drift",
        }),
        expect.objectContaining({
          code: "domain_cloudflare_runbook.blocked_capability_drift",
        }),
        expect.objectContaining({
          code: "domain_cloudflare_runbook.side_effects_forbidden",
        }),
      ]),
    );
  });

  it("rejects unsafe Cloudflare commands and unexpected fields without echoing raw input", () => {
    const result = createDomainCloudflareRunbook({
      runbook_refs: defaultDomainCloudflareRunbookRefs.map((ref) =>
        ref.ref_kind === "tunnel_public_hostname_plan"
          ? { ...ref, source_ref: "cloudflared tunnel route dns cloud.lnsat.com" }
          : ref,
      ),
      unexpected_secret_value: true,
    } as unknown as DomainCloudflareRunbookRequest);

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected unsafe Cloudflare command failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "domain_cloudflare_runbook.ref_invalid",
        }),
        expect.objectContaining({
          code: "domain_cloudflare_runbook.unexpected_field",
        }),
      ]),
    );
    expect(result.raw_input_content).toBe("withheld");
    expect(result.side_effects).toEqual([]);
  });
});
