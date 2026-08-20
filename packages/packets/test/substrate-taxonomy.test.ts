import { describe, expect, it } from "vitest";
import {
  createSubstrateTaxonomy,
  defaultSubstrateKindMap,
  substrateTaxonomyContract,
  type SubstrateKindMap,
} from "../src/index.js";

describe("substrate taxonomy contract", () => {
  it("emits source-only substrate taxonomy evidence", () => {
    const result = createSubstrateTaxonomy();

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected substrate taxonomy success");
    }

    expect(result.taxonomy).toMatchObject({
      contract_id: substrateTaxonomyContract.contract_id,
      taxonomy_version: "0.1",
      substrate_kinds: [
        "repos",
        "hosts",
        "containers",
        "services",
        "databases",
        "queues",
        "tunnels",
        "cloud_accounts",
        "agents",
        "models",
      ],
      control_modes: [
        "observation",
        "proposal",
        "approval_gated_mutation",
        "forbidden_mutation",
      ],
      live_mutation_allowed: false,
      side_effects: [],
    });
    expect(Object.keys(result.taxonomy.substrate_kind_map).sort()).toEqual([
      "agents",
      "cloud_accounts",
      "containers",
      "databases",
      "hosts",
      "models",
      "queues",
      "repos",
      "services",
      "tunnels",
    ]);
    expect(result.taxonomy.substrate_kind_map).toMatchObject({
      repos: {
        kind: "repos",
        denied_controls: ["repo.force_push.write", "repo.history.delete"],
        required_policy_gates: ["repos.mutation.approval"],
      },
      databases: {
        kind: "databases",
        denied_controls: ["database.drop", "database.write"],
        required_policy_gates: ["databases.mutation.approval"],
      },
      cloud_accounts: {
        kind: "cloud_accounts",
        denied_controls: ["cloud.delete", "cloudflare.write"],
        required_policy_gates: ["cloud_accounts.mutation.approval"],
      },
    });
    expect(result.taxonomy.denied_controls).toEqual(
      expect.arrayContaining([
        "database.write",
        "service.restart.execute",
        "cloudflare.write",
        "node_agent.exec",
      ]),
    );
    expect(result.taxonomy.required_policy_gates).toEqual(
      expect.arrayContaining([
        "databases.mutation.approval",
        "services.mutation.approval",
        "cloud_accounts.mutation.approval",
      ]),
    );
    expect(result.taxonomy.source_refs).toEqual(
      expect.arrayContaining([
        "doc:docs/architecture/SUBSTRATES_AND_NODES.md",
        "doc:docs/reference/CONTRACT_PROVENANCE.md",
      ]),
    );
    expect(result.side_effects).toEqual([]);
  });

  it("distinguishes observation proposal approval-gated and forbidden modes", () => {
    const result = createSubstrateTaxonomy({
      source_refs: [
        {
          source_ref: "ticket:BP-0085",
          summary: "substrate taxonomy separates safe and unsafe authority",
        },
      ],
      side_effects: [],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected substrate taxonomy success");
    }

    const serviceModes = result.taxonomy.substrate_kind_map.services.mode_boundaries;
    expect(serviceModes).toEqual(
      expect.arrayContaining([
        {
          mode: "observation",
          controls: ["service.logs.read", "service.status.read"],
          policy_gate: null,
          rationale: "services observation is read-only evidence collection",
          live_mutation_allowed: false,
        },
        {
          mode: "proposal",
          controls: ["service.config.propose", "service.restart.plan"],
          policy_gate: null,
          rationale: "services proposal emits plans without mutation",
          live_mutation_allowed: false,
        },
        {
          mode: "approval_gated_mutation",
          controls: ["service.restart.request"],
          policy_gate: "services.mutation.approval",
          rationale:
            "services mutation request requires Gateway policy and human approval",
          live_mutation_allowed: false,
        },
        {
          mode: "forbidden_mutation",
          controls: ["service.config.write", "service.restart.execute"],
          policy_gate: null,
          rationale: "services direct mutation remains forbidden by this contract",
          live_mutation_allowed: false,
        },
      ]),
    );
    expect(result.taxonomy.source_refs).toEqual(
      expect.arrayContaining([
        "ticket:BP-0085: substrate taxonomy separates safe and unsafe authority",
      ]),
    );
  });

  it("fails closed for unknown substrate kinds", () => {
    const result = createSubstrateTaxonomy({
      substrate_map: {
        ...defaultSubstrateKindMap,
        root_shells: {
          kind: "root_shells",
          summary: "unsafe substrate should fail closed",
          mode_boundaries: {},
          source_refs: [],
        },
      },
    });

    expect(result).toMatchObject({
      ok: false,
      taxonomy: null,
      raw_input_content: "withheld",
      side_effects: [],
      errors: [
        {
          code: "substrate_taxonomy.unknown_substrate_kind",
          path: "/substrate_map/root_shells",
          message: "Substrate kind is unknown.",
          severity: "error",
        },
      ],
    });
    expect(JSON.stringify(result)).not.toContain("unsafe substrate should fail closed");
  });

  it("fails closed when a control mode boundary is missing", () => {
    const substrateMap: SubstrateKindMap = {
      ...defaultSubstrateKindMap,
      services: {
        ...defaultSubstrateKindMap.services,
        mode_boundaries: defaultSubstrateKindMap.services.mode_boundaries.filter(
          (boundary) => boundary.mode !== "forbidden_mutation",
        ),
      },
    };
    const result = createSubstrateTaxonomy({ substrate_map: substrateMap });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected substrate taxonomy failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        {
          code: "substrate_taxonomy.mode_boundary_required",
          path: "/substrate_map/services/mode_boundaries/forbidden_mutation",
          message: "Substrate taxonomy requires forbidden_mutation boundary.",
          severity: "error",
        },
      ]),
    );
  });

  it("fails closed for unsafe substrate authority, live mutation, and side effects", () => {
    const substrateMap: SubstrateKindMap = {
      ...defaultSubstrateKindMap,
      databases: {
        ...defaultSubstrateKindMap.databases,
        summary: "read DATABASE_URL TOKEN and run migration",
        mode_boundaries: defaultSubstrateKindMap.databases.mode_boundaries.map(
          (boundary) =>
            boundary.mode === "observation"
              ? { ...boundary, controls: ["database.write"] }
              : boundary.mode === "approval_gated_mutation"
                ? { ...boundary, controls: ["database.write"] }
                : boundary,
        ),
      },
      hosts: {
        ...defaultSubstrateKindMap.hosts,
        mode_boundaries: defaultSubstrateKindMap.hosts.mode_boundaries.map(
          (boundary) =>
            boundary.mode === "proposal"
              ? { ...boundary, controls: ["host.root.shell"] }
              : boundary,
        ),
      },
    };
    const result = createSubstrateTaxonomy({
      substrate_map: substrateMap,
      live_mutation_allowed: true,
      side_effects: [{ effect_type: "deploy" }],
      command: "rm -rf /",
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected substrate taxonomy failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        {
          code: "substrate_taxonomy.unexpected_field",
          path: "/command",
          message: "Unexpected substrate taxonomy request field.",
          severity: "error",
        },
        {
          code: "substrate_taxonomy.unsafe_substrate_authority",
          path: "/substrate_map/databases/summary",
          message: "Substrate summary must be a safe non-secret string.",
          severity: "error",
        },
        {
          code: "substrate_taxonomy.unsafe_substrate_authority",
          path: "/substrate_map/databases/mode_boundaries/observation/controls/0",
          message: "Substrate authority is unsafe outside forbidden mutation mode.",
          severity: "error",
        },
        {
          code: "substrate_taxonomy.unsafe_substrate_authority",
          path: "/substrate_map/databases/mode_boundaries/approval_gated_mutation/controls/0",
          message: "Substrate authority is unsafe outside forbidden mutation mode.",
          severity: "error",
        },
        {
          code: "substrate_taxonomy.unsafe_substrate_authority",
          path: "/substrate_map/hosts/mode_boundaries/proposal/controls/0",
          message: "Substrate authority is unsafe outside forbidden mutation mode.",
          severity: "error",
        },
        {
          code: "substrate_taxonomy.live_mutation_forbidden",
          path: "/live_mutation_allowed",
          message: "Substrate taxonomy cannot enable live mutation.",
          severity: "error",
        },
        {
          code: "substrate_taxonomy.side_effects_forbidden",
          path: "/side_effects",
          message: "Substrate taxonomy must preserve side_effects: [].",
          severity: "error",
        },
      ]),
    );
    expect(JSON.stringify(result)).not.toContain("DATABASE_URL");
    expect(JSON.stringify(result)).not.toContain("TOKEN");
    expect(JSON.stringify(result)).not.toContain("rm -rf");
  });
});
