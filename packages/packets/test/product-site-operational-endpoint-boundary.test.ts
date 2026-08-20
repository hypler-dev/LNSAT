import { describe, expect, it } from "vitest";
import {
  createProductSiteOperationalEndpointBoundary,
  productSiteOperationalEndpointBoundaryContract,
  productSiteOperationalEndpointBoundaryPurposeKinds,
  type ProductSiteOperationalEndpointBoundaryRequest,
} from "../src/index.js";

describe("product-site operational endpoint boundary", () => {
  const baseRequest: ProductSiteOperationalEndpointBoundaryRequest = {
    deployment_owner_ref: "owner:acme",
    endpoint_origin: "https://control.acme.internal",
    purpose: productSiteOperationalEndpointBoundaryPurposeKinds[0],
    product_site_namespace_used: false,
  };

  it("emits BP-0882 source-only operational boundary evidence", () => {
    const result = createProductSiteOperationalEndpointBoundary({
      ...baseRequest,
      side_effects: [],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected operational boundary success");
    }

    expect(result.product_site_operational_endpoint_boundary).toMatchObject({
      contract_id: productSiteOperationalEndpointBoundaryContract.contract_id,
      operational_endpoint: {
        origin: "https://control.acme.internal",
        deployment_owner_ref: "owner:acme",
        purpose: "gateway",
        product_site_namespace_used: false,
        protocol: "https",
        allowed_host_class: "owner_managed_domain",
      },
    });
    expect(result.side_effects).toEqual([]);
    expect(result.product_site_operational_endpoint_boundary.side_effects).toEqual([]);
  });

  it("accepts localhost and 127.0.0.1 loopback over HTTP", () => {
    const result = createProductSiteOperationalEndpointBoundary({
      ...baseRequest,
      deployment_owner_ref: "owner:loopback-test",
      purpose: "control_center",
      endpoint_origin: "http://localhost:3000",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected localhost success");
    }
    expect(
      result.product_site_operational_endpoint_boundary.operational_endpoint.origin,
    ).toBe("http://localhost:3000");
    expect(
      result.product_site_operational_endpoint_boundary.operational_endpoint
        .allowed_host_class,
    ).toBe("loopback");

    const privateResult = createProductSiteOperationalEndpointBoundary({
      ...baseRequest,
      deployment_owner_ref: "owner:private-network-test",
      purpose: "worker_api",
      endpoint_origin: "https://10.0.0.10",
    });
    expect(privateResult.ok).toBe(true);
    if (!privateResult.ok) {
      throw new Error("expected private network success");
    }
    expect(
      privateResult.product_site_operational_endpoint_boundary.operational_endpoint
        .allowed_host_class,
    ).toBe("private_network");
    expect(
      privateResult.product_site_operational_endpoint_boundary.operational_endpoint
        .origin,
    ).toBe("https://10.0.0.10");

    const ipv6LoopbackResult = createProductSiteOperationalEndpointBoundary({
      ...baseRequest,
      endpoint_origin: "http://[::1]:3000",
    });
    expect(ipv6LoopbackResult.ok).toBe(true);
  });

  it("rejects product-site namespace hosts as invalid operational namespaces", () => {
    const hostList = [
      "https://lnsat.com",
      "https://www.lnsat.com",
      "https://api.lnsat.com",
    ];

    for (const endpoint_origin of hostList) {
      const result = createProductSiteOperationalEndpointBoundary({
        ...baseRequest,
        endpoint_origin,
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(
          result.errors.some(
            (error) =>
              error.code ===
              "product_site_operational_endpoint_boundary.product_site_namespace_forbidden",
          ),
        ).toBe(true);
        expect(result.raw_input_content).toBe("withheld");
        expect(result.side_effects).toEqual([]);
      }
    }
  });

  it("rejects path/query/fragment, credentials, and unknown side effects", () => {
    const pathFailure = createProductSiteOperationalEndpointBoundary({
      ...baseRequest,
      endpoint_origin: "https://control.acme.internal/status",
    });
    expect(pathFailure.ok).toBe(false);
    if (!pathFailure.ok) {
      expect(
        pathFailure.errors.some(
          (error) =>
            error.code === "product_site_operational_endpoint_boundary.path_forbidden",
        ),
      ).toBe(true);
    }

    const queryFailure = createProductSiteOperationalEndpointBoundary({
      ...baseRequest,
      endpoint_origin: "https://control.acme.internal?ping=1",
    });
    expect(queryFailure.ok).toBe(false);
    if (!queryFailure.ok) {
      expect(
        queryFailure.errors.some(
          (error) =>
            error.code ===
            "product_site_operational_endpoint_boundary.query_or_fragment_forbidden",
        ),
      ).toBe(true);
    }

    const hashFailure = createProductSiteOperationalEndpointBoundary({
      ...baseRequest,
      endpoint_origin: "https://control.acme.internal#status",
    });
    expect(hashFailure.ok).toBe(false);
    if (!hashFailure.ok) {
      expect(
        hashFailure.errors.some(
          (error) =>
            error.code ===
            "product_site_operational_endpoint_boundary.query_or_fragment_forbidden",
        ),
      ).toBe(true);
    }

    const credentialFailure = createProductSiteOperationalEndpointBoundary({
      ...baseRequest,
      endpoint_origin: "https://user:secret@control.acme.internal",
    });
    expect(credentialFailure.ok).toBe(false);
    if (!credentialFailure.ok) {
      expect(
        credentialFailure.errors.some(
          (error) =>
            error.code ===
            "product_site_operational_endpoint_boundary.credentials_forbidden",
        ),
      ).toBe(true);
    }

    const httpFailure = createProductSiteOperationalEndpointBoundary({
      ...baseRequest,
      endpoint_origin: "http://api.acme.internal",
    });
    expect(httpFailure.ok).toBe(false);
    if (!httpFailure.ok) {
      expect(
        httpFailure.errors.some(
          (error) =>
            error.code ===
            "product_site_operational_endpoint_boundary.protocol_forbidden",
        ),
      ).toBe(true);
    }

    const sideEffectsFailure = createProductSiteOperationalEndpointBoundary({
      ...baseRequest,
      side_effects: ["attach_domain"],
    });
    expect(sideEffectsFailure.ok).toBe(false);
    if (!sideEffectsFailure.ok) {
      expect(
        sideEffectsFailure.errors.some(
          (error) =>
            error.code ===
            "product_site_operational_endpoint_boundary.side_effects_forbidden",
        ),
      ).toBe(true);
      expect(sideEffectsFailure.raw_input_content).toBe("withheld");
    }

    const widenedSideEffectsFailure = createProductSiteOperationalEndpointBoundary({
      ...baseRequest,
      side_effects: "attach_domain" as unknown as string[],
    });
    expect(widenedSideEffectsFailure.ok).toBe(false);
    if (!widenedSideEffectsFailure.ok) {
      expect(
        widenedSideEffectsFailure.errors.some(
          (error) =>
            error.code ===
            "product_site_operational_endpoint_boundary.side_effects_forbidden",
        ),
      ).toBe(true);
    }
  });

  it("rejects product_site_namespace_used true, bad purpose, and unknown fields", () => {
    const namespaceFailure = createProductSiteOperationalEndpointBoundary({
      ...baseRequest,
      product_site_namespace_used: true,
    });
    expect(namespaceFailure.ok).toBe(false);
    if (!namespaceFailure.ok) {
      expect(
        namespaceFailure.errors.some(
          (error) =>
            error.code ===
            "product_site_operational_endpoint_boundary.product_site_namespace_used_forbidden",
        ),
      ).toBe(true);
    }

    const badPurpose = createProductSiteOperationalEndpointBoundary({
      ...baseRequest,
      purpose: "unknown" as unknown,
    });
    expect(badPurpose.ok).toBe(false);
    if (!badPurpose.ok) {
      expect(
        badPurpose.errors.some(
          (error) =>
            error.code === "product_site_operational_endpoint_boundary.purpose_invalid",
        ),
      ).toBe(true);
    }

    const extraField = createProductSiteOperationalEndpointBoundary({
      ...baseRequest,
      extra: "forbidden",
    } as unknown as ProductSiteOperationalEndpointBoundaryRequest);
    expect(extraField.ok).toBe(false);
    if (!extraField.ok) {
      expect(
        extraField.errors.some(
          (error) =>
            error.code ===
            "product_site_operational_endpoint_boundary.unexpected_field",
        ),
      ).toBe(true);
    }
  });

  it("rejects secret-like owner references without echoing raw input", () => {
    const result = createProductSiteOperationalEndpointBoundary({
      ...baseRequest,
      deployment_owner_ref: "api_key:forbidden-value",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(
        result.errors.some(
          (error) =>
            error.code ===
            "product_site_operational_endpoint_boundary.secrets_forbidden",
        ),
      ).toBe(true);
      expect(result.raw_input_content).toBe("withheld");
      expect(result.side_effects).toEqual([]);
    }
  });
});
