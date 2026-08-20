import { describe, expect, it } from "vitest";
import {
  createInstallationControlProfile,
  installationControlProfileContract,
  type ControlAuthority,
  type ControlSurface,
} from "../src/index.js";

const createdAt = new Date("2026-05-06T00:00:00.000Z");

describe("installation control profile contract", () => {
  it("creates a source-only profile for local observer-only mode", () => {
    const result = createInstallationControlProfile(validProfile(), {
      now: createdAt,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected installation control profile success");
    }

    expect(result.profile).toMatchObject({
      contract_id: installationControlProfileContract.contract_id,
      profile_id: "install_profile_local_001",
      project_id: "lnsat",
      actor_id: "agent.codex",
      created_at: "2026-05-06T00:00:00.000Z",
      profile_summary: {
        installation_mode: "local",
        control_mode: "observer_only",
        live_control_allowed: false,
        boundary_count:
          installationControlProfileContract.required_control_surfaces.length,
      },
      required_approval_gates: [],
      side_effects: [],
    });
    expect(result.profile.boundaries).toHaveLength(
      installationControlProfileContract.required_control_surfaces.length,
    );
    expect(result.profile.boundaries).toEqual(
      expect.arrayContaining([
        {
          surface: "execution",
          authority: "observe",
          approval_gate: null,
          rationale: "local profile may inspect declared execution posture only",
          live_control_allowed: false,
        },
        {
          surface: "secrets",
          authority: "none",
          approval_gate: null,
          rationale: "credential values are never exposed by install profile",
          live_control_allowed: false,
        },
        {
          surface: "ssh",
          authority: "none",
          approval_gate: null,
          rationale: "raw ssh is outside this contract",
          live_control_allowed: false,
        },
      ]),
    );
    expect(result.profile.denied_control_surfaces).toEqual(
      installationControlProfileContract.required_control_surfaces,
    );
    expect(result.profile.source_refs).toEqual(
      expect.arrayContaining([
        "doc:docs/architecture/SUBSTRATES_AND_NODES.md",
        "ticket:BP-0083: build packet defines installation control mode profile",
      ]),
    );
    expect(result.side_effects).toEqual([]);
  });

  it("keeps approval-gated profiles contract-only with explicit gates", () => {
    const profile = validProfile({
      installation_mode: "hybrid",
      control_mode: "approval_gated",
      boundaryAuthorities: {
        execution: "approval_required",
        docker: "approval_required",
        node_agent: "approval_required",
        database: "approval_required",
        service_mutation: "approval_required",
        dns_cloudflare: "approval_required",
        deploy: "approval_required",
      },
    });
    const result = createInstallationControlProfile(profile, { now: createdAt });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected approval-gated profile success");
    }

    expect(result.profile.profile_summary).toMatchObject({
      installation_mode: "hybrid",
      control_mode: "approval_gated",
      live_control_allowed: false,
    });
    expect(result.profile.required_approval_gates).toEqual([
      "database.approval",
      "deploy.approval",
      "dns_cloudflare.approval",
      "docker.approval",
      "execution.approval",
      "node_agent.approval",
      "service_mutation.approval",
    ]);
    expect(result.profile.side_effects).toEqual([]);
    expect(JSON.stringify(result.profile)).not.toContain('live_control_allowed":true');
  });

  it("fails closed when a required control surface is missing", () => {
    const profile = validProfile();
    delete profile.boundaries.database;

    const result = createInstallationControlProfile(profile, { now: createdAt });

    expect(result).toMatchObject({
      ok: false,
      profile: null,
      raw_input_content: "withheld",
      side_effects: [],
      errors: [
        {
          code: "installation_control_profile.boundary_required",
          path: "/boundaries/database",
          message: "Installation control profile requires explicit database boundary.",
          severity: "error",
        },
      ],
    });
  });

  it("fails closed for unsafe live-control and raw authority requests", () => {
    const result = createInstallationControlProfile(
      {
        ...validProfile(),
        control_mode: "root_shell",
        live_control_allowed: true,
        side_effects: [{ effect_type: "deploy" }],
        command: "rm -rf /",
        boundaries: {
          ...validProfile().boundaries,
          secrets: {
            authority: "observe",
            rationale: "read DATABASE_URL and TOKEN before deploy",
          },
          ssh: {
            authority: "propose",
            rationale: "prepare rm -rf command",
          },
        },
      },
      { now: createdAt },
    );

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected installation control profile failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        {
          code: "installation_control_profile.invalid_control_mode",
          path: "/control_mode",
          message: "Control mode is unsupported.",
          severity: "error",
        },
        {
          code: "installation_control_profile.unexpected_field",
          path: "/command",
          message: "Unexpected installation control profile request field.",
          severity: "error",
        },
        {
          code: "installation_control_profile.unsafe_control_authority",
          path: "/boundaries/secrets/authority",
          message: "Installation control boundary requests unsafe control authority.",
          severity: "error",
        },
        {
          code: "installation_control_profile.invalid_boundary",
          path: "/boundaries/secrets/rationale",
          message:
            "Installation control boundary rationale must be a safe non-secret string.",
          severity: "error",
        },
        {
          code: "installation_control_profile.unsafe_control_authority",
          path: "/boundaries/ssh/authority",
          message: "Installation control boundary requests unsafe control authority.",
          severity: "error",
        },
        {
          code: "installation_control_profile.invalid_boundary",
          path: "/boundaries/ssh/rationale",
          message:
            "Installation control boundary rationale must be a safe non-secret string.",
          severity: "error",
        },
        {
          code: "installation_control_profile.live_control_forbidden",
          path: "/live_control_allowed",
          message: "Installation control profile cannot enable live control.",
          severity: "error",
        },
        {
          code: "installation_control_profile.side_effects_forbidden",
          path: "/side_effects",
          message: "Installation control profile must preserve side_effects: [].",
          severity: "error",
        },
      ]),
    );
    expect(JSON.stringify(result)).not.toContain("DATABASE_URL");
    expect(JSON.stringify(result)).not.toContain("TOKEN");
    expect(JSON.stringify(result)).not.toContain("rm -rf");
  });
});

function validProfile(
  overrides: {
    installation_mode?: "local" | "self_hosted" | "hybrid" | "saas";
    control_mode?:
      "observer_only" | "proposal_only" | "approval_gated" | "live_control_disabled";
    boundaryAuthorities?: Partial<Record<ControlSurface, ControlAuthority>>;
  } = {},
) {
  const boundaries = boundaryMap(overrides.boundaryAuthorities ?? {});
  return {
    profile_id: "install_profile_local_001",
    project_id: "lnsat",
    actor_id: "agent.codex",
    installation_mode: overrides.installation_mode ?? "local",
    control_mode: overrides.control_mode ?? "observer_only",
    created_at: createdAt.toISOString(),
    boundaries,
    source_refs: [
      {
        source_ref: "ticket:BP-0083",
        summary: "build packet defines installation control mode profile",
      },
      {
        source_ref: "doc:docs/architecture/SUBSTRATES_AND_NODES.md",
        summary: "substrate doc names docker node agent and host boundaries",
      },
    ],
    live_control_allowed: false,
    side_effects: [],
  };
}

function boundaryMap(overrides: Partial<Record<ControlSurface, ControlAuthority>>) {
  const surfaces = installationControlProfileContract.required_control_surfaces;
  return Object.fromEntries(
    surfaces.map((surface) => {
      const authority = overrides[surface] ?? defaultAuthority(surface);
      return [
        surface,
        {
          authority,
          ...(authority === "approval_required"
            ? { approval_gate: `${surface}.approval` }
            : {}),
          rationale: rationaleFor(surface, authority),
        },
      ];
    }),
  ) as Record<
    ControlSurface,
    { authority: ControlAuthority; approval_gate?: string; rationale: string }
  >;
}

function defaultAuthority(surface: ControlSurface): ControlAuthority {
  if (surface === "secrets" || surface === "ssh") {
    return "none";
  }
  return "observe";
}

function rationaleFor(surface: ControlSurface, authority: ControlAuthority): string {
  if (surface === "execution") {
    return authority === "approval_required"
      ? "execution requires explicit approval gate before later live scope"
      : "local profile may inspect declared execution posture only";
  }
  if (surface === "secrets") {
    return authority === "approval_required"
      ? "credential use requires brokered approval and never exposes values"
      : "credential values are never exposed by install profile";
  }
  if (surface === "ssh") {
    return authority === "approval_required"
      ? "ssh requires explicit approval gate and no raw shell path"
      : "raw ssh is outside this contract";
  }
  if (authority === "approval_required") {
    return `${surface} authority requires explicit approval gate`;
  }
  return `${surface} remains observation only in this profile`;
}
