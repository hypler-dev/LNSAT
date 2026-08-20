import { describe, expect, it } from "vitest";
import {
  createUniversalPacketTaxonomy,
  defaultUniversalPacketFamilyMap,
  universalPacketTaxonomyContract,
  universalPacketTypes,
  type UniversalPacketFamilyMap,
} from "../src/index.js";

describe("universal packet taxonomy contract", () => {
  it("emits source-only universal packet family taxonomy evidence", () => {
    const result = createUniversalPacketTaxonomy();

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected universal packet taxonomy success");
    }

    expect(result.taxonomy).toMatchObject({
      contract_id: universalPacketTaxonomyContract.contract_id,
      taxonomy_version: "0.1",
      universal_packet_schema_compatibility: {
        schema_version: "0.1",
        accepted_packet_types: universalPacketTypes,
        validator_unchanged: true,
      },
      live_dispatch_allowed: false,
      side_effects: [],
    });
    expect(Object.keys(result.taxonomy.packet_family_map).sort()).toEqual([
      "audit",
      "capability",
      "context",
      "environment",
      "execution",
      "patches",
      "policy",
      "resources",
      "results",
      "secrets",
      "telemetry",
    ]);
    expect(result.taxonomy.packet_family_map).toMatchObject({
      context: {
        family: "context",
        current_packet_types: ["ContextPacket"],
      },
      policy: {
        family: "policy",
        current_packet_types: [],
        reserved_packet_types: ["PolicyPacket", "ApprovalPacket"],
      },
      audit: {
        family: "audit",
        current_packet_types: ["AuditPacket"],
      },
      capability: {
        family: "capability",
        current_packet_types: ["CapabilityPacket"],
      },
      execution: {
        family: "execution",
        current_packet_types: ["ExecutionPacket"],
      },
      environment: {
        family: "environment",
        current_packet_types: ["EnvironmentPacket"],
      },
      resources: {
        family: "resources",
        current_packet_types: ["ResourcePacket"],
      },
      results: {
        family: "results",
        current_packet_types: ["ResultPacket"],
      },
      patches: {
        family: "patches",
        current_packet_types: ["PatchPacket"],
      },
      secrets: {
        family: "secrets",
        current_packet_types: ["SecretUsePacket"],
      },
      telemetry: {
        family: "telemetry",
        current_packet_types: ["NodeTelemetryPacket"],
      },
    });
    expect(result.taxonomy.source_refs).toEqual(
      expect.arrayContaining([
        "doc:docs/architecture/PACKET_MODEL.md",
        "doc:docs/architecture/POLICY_AND_AUDIT.md",
        "doc:docs/reference/CONTRACT_PROVENANCE.md",
      ]),
    );
    expect(result.side_effects).toEqual([]);
  });

  it("preserves existing universal packet schema compatibility", () => {
    const result = createUniversalPacketTaxonomy({
      taxonomy_version: "0.1",
      source_refs: [
        {
          source_ref: "ticket:BP-0084",
          summary: "universal packet taxonomy must not widen packet schema",
        },
      ],
      side_effects: [],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected universal packet taxonomy success");
    }

    expect(result.taxonomy.universal_packet_schema_compatibility).toEqual({
      schema_version: "0.1",
      accepted_packet_types: universalPacketTypes,
      validator_unchanged: true,
    });
    expect(result.taxonomy.source_refs).toEqual(
      expect.arrayContaining([
        "ticket:BP-0084: universal packet taxonomy must not widen packet schema",
      ]),
    );
  });

  it("fails closed for unknown packet families", () => {
    const result = createUniversalPacketTaxonomy({
      family_map: {
        ...defaultUniversalPacketFamilyMap,
        root_shell: {
          family: "root_shell",
          summary: "unsafe family should fail closed",
          lifecycle_intents: ["execute"],
          current_packet_types: [],
          reserved_packet_types: ["RootShellPacket"],
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
          code: "universal_packet_taxonomy.unknown_family",
          path: "/family_map/root_shell",
          message: "Universal packet taxonomy family is unknown.",
          severity: "error",
        },
      ],
    });
    expect(JSON.stringify(result)).not.toContain("RootShellPacket");
  });

  it("fails closed for overlapping packet types", () => {
    const familyMap: UniversalPacketFamilyMap = {
      ...defaultUniversalPacketFamilyMap,
      audit: {
        ...defaultUniversalPacketFamilyMap.audit,
        current_packet_types: ["AuditPacket", "ContextPacket"],
      },
    };
    const result = createUniversalPacketTaxonomy({ family_map: familyMap });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected universal packet taxonomy failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        {
          code: "universal_packet_taxonomy.overlapping_packet_type",
          path: "/family_map/audit",
          message:
            "Universal packet taxonomy cannot assign one packet type to multiple families.",
          severity: "error",
        },
      ]),
    );
  });

  it("fails closed for unsafe packet families, live dispatch, and side effects", () => {
    const familyMap: UniversalPacketFamilyMap = {
      ...defaultUniversalPacketFamilyMap,
      secrets: {
        ...defaultUniversalPacketFamilyMap.secrets,
        summary: "read DATABASE_URL and TOKEN before deploy",
        lifecycle_intents: ["secret.read"],
        reserved_packet_types: ["SecretUsePacket"],
      },
    };
    const result = createUniversalPacketTaxonomy({
      family_map: familyMap,
      live_dispatch_allowed: true,
      side_effects: [{ effect_type: "deploy" }],
      command: "rm -rf /",
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected universal packet taxonomy failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        {
          code: "universal_packet_taxonomy.unexpected_field",
          path: "/command",
          message: "Unexpected universal packet taxonomy request field.",
          severity: "error",
        },
        {
          code: "universal_packet_taxonomy.unsafe_family",
          path: "/family_map/secrets/summary",
          message: "Universal packet family summary must be a safe non-secret string.",
          severity: "error",
        },
        {
          code: "universal_packet_taxonomy.unsafe_family",
          path: "/family_map/secrets/lifecycle_intents/0",
          message: "Universal packet lifecycle intent must be safe and non-executing.",
          severity: "error",
        },
        {
          code: "universal_packet_taxonomy.unsafe_family",
          path: "/family_map/secrets/reserved_packet_types/0",
          message:
            "Reserved packet type must be a safe future Packet name and cannot duplicate current schema types.",
          severity: "error",
        },
        {
          code: "universal_packet_taxonomy.live_dispatch_forbidden",
          path: "/live_dispatch_allowed",
          message: "Universal packet taxonomy cannot enable live dispatch.",
          severity: "error",
        },
        {
          code: "universal_packet_taxonomy.side_effects_forbidden",
          path: "/side_effects",
          message: "Universal packet taxonomy must preserve side_effects: [].",
          severity: "error",
        },
      ]),
    );
    expect(JSON.stringify(result)).not.toContain("DATABASE_URL");
    expect(JSON.stringify(result)).not.toContain("TOKEN");
    expect(JSON.stringify(result)).not.toContain("rm -rf");
  });
});
