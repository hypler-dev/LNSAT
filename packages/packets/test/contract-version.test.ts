import { describe, expect, it } from "vitest";

import {
  GATEWAY_CONTRACT_VERSION_HEADER_NAME,
  GATEWAY_V1_ROOT_PATH,
  contractVersionPolicy,
  gatewayV1NegotiationPolicy,
  gatewayV1VersionGatePolicy,
  validateContractVersion,
  validateGatewayV1ContractVersion,
} from "../src/index.js";

describe("@lnsat/packets contract version policy", () => {
  it("accepts the exact stable v1 contract version", () => {
    expect(validateContractVersion("lnsat.contracts.v1_0")).toEqual({
      ok: true,
      version: "lnsat.contracts.v1_0",
      stability: "stable",
      side_effects: [],
    });
  });

  it("retains v0_1 only as deprecated compatibility", () => {
    expect(validateContractVersion("lnsat.contracts.v0_1")).toEqual({
      ok: true,
      version: "lnsat.contracts.v0_1",
      stability: "deprecated",
      side_effects: [],
    });
  });

  it("documents exact-match negotiation and denies implicit downgrade", () => {
    expect(contractVersionPolicy).toMatchObject({
      contract_id: "lnsat.contract_version_policy.v1_0",
      current_version: "lnsat.contracts.v1_0",
      negotiation: "exact_match",
      implicit_downgrade_allowed: false,
      version_ranges_allowed: false,
      side_effects: [],
    });
  });

  it("freezes the stable Gateway root and rejects deprecated compatibility", () => {
    expect(gatewayV1NegotiationPolicy).toEqual({
      contract_id: "lnsat.gateway.negotiation.v1_0",
      path: GATEWAY_V1_ROOT_PATH,
      methods: ["GET", "HEAD"],
      request_header: GATEWAY_CONTRACT_VERSION_HEADER_NAME,
      response_header: GATEWAY_CONTRACT_VERSION_HEADER_NAME,
      required_version: "lnsat.contracts.v1_0",
      deprecated_versions_allowed: false,
      authentication_required: false,
      stored_state_disclosed: false,
      side_effects: [],
      mutation_authority: false,
    });
    expect(validateGatewayV1ContractVersion("lnsat.contracts.v1_0")).toEqual({
      ok: true,
      version: "lnsat.contracts.v1_0",
      stability: "stable",
      side_effects: [],
    });
    expect(validateGatewayV1ContractVersion("lnsat.contracts.v0_1")).toMatchObject({
      ok: false,
      version: null,
      errors: [{ code: "contract.version.unsupported", path: "/version" }],
      side_effects: [],
    });
  });

  it("requires exact versioning before every Gateway subroute authority check", () => {
    expect(gatewayV1VersionGatePolicy).toEqual({
      contract_id: "lnsat.gateway.version_gate.v1_0",
      path_prefix: "/v1/",
      request_header: GATEWAY_CONTRACT_VERSION_HEADER_NAME,
      response_header: GATEWAY_CONTRACT_VERSION_HEADER_NAME,
      required_version: "lnsat.contracts.v1_0",
      deprecated_versions_allowed: false,
      accepted_version_repeated_on_routed_response: true,
      validation_order: [
        "loopback_peer",
        "http_framing_and_size",
        "numeric_bound_host",
        "contract_version",
        "route",
        "authentication",
        "policy",
        "mutation",
      ],
      side_effects: [],
      mutation_authority: false,
    });
  });

  it("rejects non-string values without reflecting input", () => {
    const response = validateContractVersion({
      version: "lnsat.contracts.v1_0",
      secret: "withheld",
    });

    expect(response).toMatchObject({
      ok: false,
      version: null,
      errors: [
        {
          code: "contract.version.invalid_type",
          path: "/version",
          severity: "error",
        },
      ],
      side_effects: [],
    });
    expect(JSON.stringify(response)).not.toContain("withheld");
  });

  it("rejects empty and noncanonical versions", () => {
    expect(validateContractVersion("")).toMatchObject({
      ok: false,
      errors: [{ code: "contract.version.required" }],
      side_effects: [],
    });
    expect(validateContractVersion("lnsat.contracts.v01_0")).toMatchObject({
      ok: false,
      errors: [{ code: "contract.version.malformed" }],
      side_effects: [],
    });
  });

  it("rejects well-formed unknown versions instead of negotiating a range", () => {
    expect(validateContractVersion("lnsat.contracts.v1_1")).toMatchObject({
      ok: false,
      version: null,
      errors: [{ code: "contract.version.unsupported" }],
      side_effects: [],
    });
  });
});
