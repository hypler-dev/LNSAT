import { isIPv4 } from "node:net";

export const PRODUCT_SITE_OPERATIONAL_ENDPOINT_BOUNDARY_CONTRACT_STATUS = "source_only";

export const productSiteOperationalEndpointBoundaryPurposeKinds = [
  "gateway",
  "control_center",
  "worker_api",
  "enrollment",
  "relay",
] as const;

export type ProductSiteOperationalEndpointPurpose =
  (typeof productSiteOperationalEndpointBoundaryPurposeKinds)[number];

export const productSiteOperationalEndpointBoundaryContract = {
  contract_id: "lnsat.platform.product_site_operational_endpoint_boundary.v0_1",
  packet_ref: "BP-0882",
  selected_after_packet_ref: "BP-0881",
  contract_authority:
    "source_only_operational_endpoint_boundary_with_product_namespace_blocked_and_origin_only_validation",
  source_docs: [
    "docs/architecture/PRODUCT_SITE_AND_OPERATIONAL_ENDPOINT_BOUNDARY.md",
    "docs/architecture/SELF_CONTAINED_INSTALLATION_AND_ADAPTIVE_SETUP.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
  ],
  architecture_framing_superseded_by_packet_ref: "BP-0883",
  current_architecture_authority:
    "docs/architecture/SELF_CONTAINED_INSTALLATION_AND_ADAPTIVE_SETUP.md",
  side_effects: [],
  status: "source_only",
} as const;

export type ProductSiteOperationalEndpointBoundaryEvidence = {
  contract_id: typeof productSiteOperationalEndpointBoundaryContract.contract_id;
  operational_endpoint: {
    origin: string;
    deployment_owner_ref: string;
    purpose: ProductSiteOperationalEndpointPurpose;
    product_site_namespace_used: false;
    protocol: "http" | "https";
    allowed_host_class: "loopback" | "private_network" | "owner_managed_domain";
  };
  side_effects: [];
};

export type ProductSiteOperationalEndpointBoundaryRequest = {
  deployment_owner_ref: string;
  endpoint_origin: string;
  purpose: ProductSiteOperationalEndpointPurpose;
  product_site_namespace_used: false;
  side_effects?: string[];
  [key: string]: unknown;
};

export type ProductSiteOperationalEndpointBoundaryErrorCode =
  | "product_site_operational_endpoint_boundary.invalid_request"
  | "product_site_operational_endpoint_boundary.unexpected_field"
  | "product_site_operational_endpoint_boundary.endpoint_required"
  | "product_site_operational_endpoint_boundary.endpoint_invalid"
  | "product_site_operational_endpoint_boundary.endpoint_not_origin_only"
  | "product_site_operational_endpoint_boundary.path_forbidden"
  | "product_site_operational_endpoint_boundary.query_or_fragment_forbidden"
  | "product_site_operational_endpoint_boundary.protocol_forbidden"
  | "product_site_operational_endpoint_boundary.credentials_forbidden"
  | "product_site_operational_endpoint_boundary.product_site_namespace_forbidden"
  | "product_site_operational_endpoint_boundary.deployment_owner_ref_required"
  | "product_site_operational_endpoint_boundary.purpose_invalid"
  | "product_site_operational_endpoint_boundary.product_site_namespace_used_required"
  | "product_site_operational_endpoint_boundary.product_site_namespace_used_forbidden"
  | "product_site_operational_endpoint_boundary.side_effects_forbidden"
  | "product_site_operational_endpoint_boundary.secrets_forbidden";

export type ProductSiteOperationalEndpointBoundaryError = {
  code: ProductSiteOperationalEndpointBoundaryErrorCode;
  path: string;
  message: string;
};

export type ProductSiteOperationalEndpointBoundaryResult =
  | {
      ok: true;
      product_site_operational_endpoint_boundary: ProductSiteOperationalEndpointBoundaryEvidence;
      side_effects: [];
    }
  | {
      ok: false;
      errors: ProductSiteOperationalEndpointBoundaryError[];
      raw_input_content: "withheld";
      side_effects: [];
    };

const expectedKeys = new Set<
  keyof ProductSiteOperationalEndpointBoundaryRequest | string
>([
  "deployment_owner_ref",
  "endpoint_origin",
  "purpose",
  "product_site_namespace_used",
  "side_effects",
]);

const productSiteNamespacePatterns = [/^([a-z0-9-]+\.)*lnsat\.com$/i];

const secretPattern =
  /\b(secret|token|password|api[_-]?key|private[_-]?key|Bearer\s+[A-Za-z0-9._-]+)\b/i;

export function createProductSiteOperationalEndpointBoundary(
  request: unknown = {},
): ProductSiteOperationalEndpointBoundaryResult {
  const errors: ProductSiteOperationalEndpointBoundaryError[] = [];

  if (!isRequestObject(request)) {
    return {
      ok: false,
      errors: [
        {
          code: "product_site_operational_endpoint_boundary.invalid_request",
          path: "/",
          message: "Product-site operational endpoint request must be an object.",
        },
      ],
      raw_input_content: "withheld",
      side_effects: [],
    };
  }

  for (const key of Object.keys(request)) {
    if (!expectedKeys.has(key as keyof ProductSiteOperationalEndpointBoundaryRequest)) {
      errors.push({
        code: "product_site_operational_endpoint_boundary.unexpected_field",
        path: `/${key}`,
        message: "Unexpected field is not allowed.",
      });
    }
  }

  const deploymentOwnerRef = request.deployment_owner_ref;
  if (typeof deploymentOwnerRef !== "string" || !safeShortText(deploymentOwnerRef)) {
    errors.push({
      code: "product_site_operational_endpoint_boundary.deployment_owner_ref_required",
      path: "/deployment_owner_ref",
      message: "deployment_owner_ref must be a safe explicit owner reference.",
    });
  }

  if (
    typeof request.product_site_namespace_used !== "boolean" ||
    request.product_site_namespace_used !== false
  ) {
    errors.push({
      code:
        request.product_site_namespace_used === undefined
          ? "product_site_operational_endpoint_boundary.product_site_namespace_used_required"
          : "product_site_operational_endpoint_boundary.product_site_namespace_used_forbidden",
      path: "/product_site_namespace_used",
      message: "product_site_namespace_used must be false for operational endpoints.",
    });
  }

  if (
    typeof request.purpose !== "string" ||
    !productSiteOperationalEndpointBoundaryPurposeKinds.includes(
      request.purpose as ProductSiteOperationalEndpointPurpose,
    )
  ) {
    errors.push({
      code: "product_site_operational_endpoint_boundary.purpose_invalid",
      path: "/purpose",
      message: "purpose must be one of the defined operational endpoint kinds.",
    });
  }

  const endpointValidation = validateEndpointOrigin(request.endpoint_origin);
  if (!endpointValidation.ok) {
    errors.push(...endpointValidation.errors);
  }

  if (
    request.side_effects !== undefined &&
    (!Array.isArray(request.side_effects) || request.side_effects.length > 0)
  ) {
    errors.push({
      code: "product_site_operational_endpoint_boundary.side_effects_forbidden",
      path: "/side_effects",
      message: "Operational endpoint boundary must preserve side_effects: [].",
    });
  }

  if (secretPattern.test(JSON.stringify(request))) {
    errors.push({
      code: "product_site_operational_endpoint_boundary.secrets_forbidden",
      path: "/",
      message: "Request contains blocked secret-like value.",
    });
  }

  if (errors.length > 0 || !endpointValidation.ok) {
    return {
      ok: false,
      errors,
      raw_input_content: "withheld",
      side_effects: [],
    };
  }

  return {
    ok: true,
    product_site_operational_endpoint_boundary: {
      contract_id: productSiteOperationalEndpointBoundaryContract.contract_id,
      operational_endpoint: {
        origin: endpointValidation.result.origin,
        deployment_owner_ref: deploymentOwnerRef,
        purpose: request.purpose,
        product_site_namespace_used: false,
        protocol: endpointValidation.result.protocol,
        allowed_host_class: endpointValidation.result.allowedHostClass,
      },
      side_effects: [],
    },
    side_effects: [],
  };
}

function isRequestObject(
  value: unknown,
): value is ProductSiteOperationalEndpointBoundaryRequest {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function safeShortText(value: string): boolean {
  return (
    value.trim().length >= 2 && value.trim().length <= 240 && !secretPattern.test(value)
  );
}

function isProductSiteNamespaceHost(host: string): boolean {
  return productSiteNamespacePatterns.some((pattern) => pattern.test(host));
}

function isPrivateIPv4(host: string): boolean {
  if (!isIPv4(host)) {
    return false;
  }
  const octetValues = host.split(".");
  if (octetValues.length !== 4) {
    return false;
  }
  const first = Number(octetValues[0]);
  const second = Number(octetValues[1]);
  if (Number.isNaN(first) || Number.isNaN(second)) {
    return false;
  }
  if (first === 10) {
    return true;
  }
  if (first === 127) {
    return true;
  }
  if (first === 172 && second >= 16 && second <= 31) {
    return true;
  }
  if (first === 192 && second === 168) {
    return true;
  }
  if (first === 100 && second >= 64 && second <= 127) {
    return true;
  }
  return false;
}

function isPrivateIPv6(host: string): boolean {
  const lowercase = stripIpv6Brackets(host).toLowerCase();
  return (
    lowercase === "::1" ||
    lowercase.startsWith("fc") ||
    lowercase.startsWith("fd") ||
    lowercase.startsWith("fe80:")
  );
}

function isPrivateHost(host: string): boolean {
  if (
    host === "localhost" ||
    host === "127.0.0.1" ||
    isPrivateIPv4(host) ||
    isPrivateIPv6(host)
  ) {
    return true;
  }
  return false;
}

function isLoopbackHost(host: string): boolean {
  const normalized = stripIpv6Brackets(host);
  return (
    normalized === "localhost" || normalized === "127.0.0.1" || normalized === "::1"
  );
}

function stripIpv6Brackets(host: string): string {
  return host.startsWith("[") && host.endsWith("]") ? host.slice(1, -1) : host;
}

function validateEndpointOrigin(value: unknown): {
  ok: boolean;
  errors: ProductSiteOperationalEndpointBoundaryError[];
  result: {
    origin: string;
    protocol: "http" | "https";
    allowedHostClass: "loopback" | "private_network" | "owner_managed_domain";
  };
} {
  const fail = (
    code: ProductSiteOperationalEndpointBoundaryErrorCode,
    path: string,
    message: string,
  ): {
    ok: false;
    errors: ProductSiteOperationalEndpointBoundaryError[];
    result: {
      origin: string;
      protocol: "http" | "https";
      allowedHostClass: "loopback" | "private_network" | "owner_managed_domain";
    };
  } => ({
    ok: false,
    errors: [{ code, path, message }],
    result: {
      origin: "",
      protocol: "https",
      allowedHostClass: "owner_managed_domain",
    },
  });

  if (typeof value !== "string") {
    return {
      ...fail(
        "product_site_operational_endpoint_boundary.endpoint_required",
        "/endpoint_origin",
        "endpoint_origin must be a string.",
      ),
    };
  }

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return {
      ...fail(
        "product_site_operational_endpoint_boundary.endpoint_invalid",
        "/endpoint_origin",
        "endpoint_origin must be a valid URL.",
      ),
    };
  }

  if (parsed.username || parsed.password) {
    return {
      ...fail(
        "product_site_operational_endpoint_boundary.credentials_forbidden",
        "/endpoint_origin",
        "Do not include credentials in endpoint_origin.",
      ),
    };
  }

  if (parsed.pathname && parsed.pathname !== "/") {
    return {
      ...fail(
        "product_site_operational_endpoint_boundary.path_forbidden",
        "/endpoint_origin",
        "endpoint_origin must be origin-only.",
      ),
    };
  }

  if (parsed.search || parsed.hash) {
    return {
      ...fail(
        "product_site_operational_endpoint_boundary.query_or_fragment_forbidden",
        "/endpoint_origin",
        "Query and fragment are not allowed in operational endpoint origin.",
      ),
    };
  }

  if (parsed.hostname && isProductSiteNamespaceHost(parsed.hostname)) {
    return {
      ...fail(
        "product_site_operational_endpoint_boundary.product_site_namespace_forbidden",
        "/endpoint_origin",
        "Product-site namespace endpoints are forbidden for operational endpoints.",
      ),
    };
  }

  if (parsed.protocol === "http:") {
    if (!isLoopbackHost(parsed.hostname)) {
      return {
        ...fail(
          "product_site_operational_endpoint_boundary.protocol_forbidden",
          "/endpoint_origin",
          "HTTP is allowed only for localhost/loopback endpoints.",
        ),
      };
    }

    return {
      ok: true,
      errors: [],
      result: {
        origin: parsed.origin,
        protocol: "http",
        allowedHostClass: "loopback",
      },
    };
  }

  if (parsed.protocol !== "https:") {
    return {
      ...fail(
        "product_site_operational_endpoint_boundary.protocol_forbidden",
        "/endpoint_origin",
        "Operational endpoint must use http (loopback) or https.",
      ),
    };
  }

  if (parsed.hostname && isPrivateHost(parsed.hostname)) {
    return {
      ok: true,
      errors: [],
      result: {
        origin: parsed.origin,
        protocol: "https",
        allowedHostClass: "private_network",
      },
    };
  }

  return {
    ok: true,
    errors: [],
    result: {
      origin: parsed.origin,
      protocol: "https",
      allowedHostClass: "owner_managed_domain",
    },
  };
}
