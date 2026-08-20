export const INSTALLATION_CONTROL_PROFILE_STATUS = "contract_only";

export const installationControlProfileContract = {
  contract_id: "lnsat.platform.installation_control_profile.v0_1",
  authority: ["@lnsat/packets", "source-backed-platform-profile"],
  installation_modes: ["local", "self_hosted", "hybrid", "saas"],
  control_modes: [
    "observer_only",
    "proposal_only",
    "approval_gated",
    "live_control_disabled",
  ],
  required_control_surfaces: [
    "execution",
    "secrets",
    "ssh",
    "docker",
    "node_agent",
    "database",
    "service_mutation",
    "dns_cloudflare",
    "deploy",
  ],
  source_docs: [
    "docs/architecture/PACKET_MODEL.md",
    "docs/architecture/POLICY_AND_AUDIT.md",
    "docs/architecture/SYSTEM_ARCHITECTURE.md",
    "docs/architecture/SUBSTRATES_AND_NODES.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
  ],
  live_control_allowed: false,
  side_effects: [],
  status: "contract_only",
} as const;

export type InstallationMode =
  (typeof installationControlProfileContract.installation_modes)[number];

export type ControlMode =
  (typeof installationControlProfileContract.control_modes)[number];

export type ControlSurface =
  (typeof installationControlProfileContract.required_control_surfaces)[number];

export type ControlAuthority = "none" | "observe" | "propose" | "approval_required";

export type InstallationControlBoundaryInput = {
  authority: ControlAuthority;
  approval_gate?: string;
  rationale: string;
};

export type InstallationControlProfileSourceInput = {
  source_ref: string;
  summary: string;
};

export type InstallationControlProfileRequest = {
  profile_id?: string;
  project_id: string;
  actor_id: string;
  installation_mode: InstallationMode;
  control_mode: ControlMode;
  boundaries: Record<ControlSurface, InstallationControlBoundaryInput>;
  source_refs: InstallationControlProfileSourceInput[];
  created_at?: string;
  live_control_allowed?: false;
  side_effects?: [];
};

export type InstallationControlProfileErrorCode =
  | "installation_control_profile.invalid_request"
  | "installation_control_profile.unexpected_field"
  | "installation_control_profile.invalid_profile_id"
  | "installation_control_profile.invalid_project_id"
  | "installation_control_profile.invalid_actor_id"
  | "installation_control_profile.invalid_installation_mode"
  | "installation_control_profile.invalid_control_mode"
  | "installation_control_profile.invalid_created_at"
  | "installation_control_profile.boundaries_required"
  | "installation_control_profile.boundary_required"
  | "installation_control_profile.invalid_boundary"
  | "installation_control_profile.unsafe_control_authority"
  | "installation_control_profile.approval_gate_required"
  | "installation_control_profile.source_refs_required"
  | "installation_control_profile.invalid_source_ref"
  | "installation_control_profile.live_control_forbidden"
  | "installation_control_profile.side_effects_forbidden";

export type InstallationControlProfileError = {
  code: InstallationControlProfileErrorCode;
  path: string;
  message: string;
  severity: "error";
};

export type InstallationControlBoundaryEvidence = {
  surface: ControlSurface;
  authority: ControlAuthority;
  approval_gate: string | null;
  rationale: string;
  live_control_allowed: false;
};

export type InstallationControlProfileEvidence = {
  contract_id: typeof installationControlProfileContract.contract_id;
  profile_id: string | null;
  project_id: string;
  actor_id: string;
  created_at: string;
  profile_summary: {
    installation_mode: InstallationMode;
    control_mode: ControlMode;
    live_control_allowed: false;
    boundary_count: number;
  };
  boundaries: InstallationControlBoundaryEvidence[];
  denied_control_surfaces: ControlSurface[];
  required_approval_gates: string[];
  source_refs: string[];
  side_effects: [];
};

export type InstallationControlProfileResult =
  | {
      ok: true;
      profile: InstallationControlProfileEvidence;
      errors: [];
      side_effects: [];
    }
  | {
      ok: false;
      profile: null;
      errors: InstallationControlProfileError[];
      raw_input_content: "withheld";
      side_effects: [];
    };

type NormalizedInstallationControlProfileRequest =
  | {
      ok: true;
      profile_id: string | null;
      project_id: string;
      actor_id: string;
      installation_mode: InstallationMode;
      control_mode: ControlMode;
      created_at: string;
      boundaries: InstallationControlBoundaryEvidence[];
      source_refs: string[];
    }
  | {
      ok: false;
      errors: InstallationControlProfileError[];
    };

const requestKeys = new Set([
  "profile_id",
  "project_id",
  "actor_id",
  "installation_mode",
  "control_mode",
  "boundaries",
  "source_refs",
  "created_at",
  "live_control_allowed",
  "side_effects",
]);

const boundaryKeys = new Set(["authority", "approval_gate", "rationale"]);
const sourceKeys = new Set(["source_ref", "summary"]);
const installationModes = new Set<InstallationMode>(
  installationControlProfileContract.installation_modes,
);
const controlModes = new Set<ControlMode>(
  installationControlProfileContract.control_modes,
);
const controlSurfaces = new Set<ControlSurface>(
  installationControlProfileContract.required_control_surfaces,
);
const controlAuthorities = new Set<ControlAuthority>([
  "none",
  "observe",
  "propose",
  "approval_required",
]);

const stableIdPattern = /^[a-z][a-z0-9_.:-]{1,95}$/;
const actorIdPattern = /^(agent|human|script|worker|mcp|cli)\.[a-z0-9_.:-]{2,95}$/;
const isoDateTimePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;
const safeStringPattern = /^[\w .,:;@/()[\]#_+=-]{3,240}$/;
const secretLikePattern =
  /(postgres:\/\/|mysql:\/\/|mongodb:\/\/|DATABASE_URL|SECRET|TOKEN|PASSWORD|PRIVATE KEY|sk-[A-Za-z0-9]|secret:)/i;

export function createInstallationControlProfile(
  input: unknown,
  options: { now?: Date } = {},
): InstallationControlProfileResult {
  const createdAt = (options.now ?? new Date()).toISOString();
  const normalized = normalizeInstallationControlProfileRequest(input, createdAt);

  if (!normalized.ok) {
    return failInstallationControlProfile(normalized.errors);
  }

  const deniedControlSurfaces = normalized.boundaries
    .filter((boundary) => boundary.live_control_allowed === false)
    .map((boundary) => boundary.surface);
  const requiredApprovalGates = uniqueStrings(
    normalized.boundaries
      .map((boundary) => boundary.approval_gate)
      .filter((gate): gate is string => typeof gate === "string"),
  );

  return {
    ok: true,
    profile: {
      contract_id: installationControlProfileContract.contract_id,
      profile_id: normalized.profile_id,
      project_id: normalized.project_id,
      actor_id: normalized.actor_id,
      created_at: normalized.created_at,
      profile_summary: {
        installation_mode: normalized.installation_mode,
        control_mode: normalized.control_mode,
        live_control_allowed: false,
        boundary_count: normalized.boundaries.length,
      },
      boundaries: normalized.boundaries,
      denied_control_surfaces: deniedControlSurfaces,
      required_approval_gates: requiredApprovalGates,
      source_refs: sourceRefs(normalized.source_refs),
      side_effects: [],
    },
    errors: [],
    side_effects: [],
  };
}

function normalizeInstallationControlProfileRequest(
  input: unknown,
  createdAt: string,
): NormalizedInstallationControlProfileRequest {
  if (!isPlainObject(input)) {
    return {
      ok: false,
      errors: [
        profileError(
          "installation_control_profile.invalid_request",
          "",
          "Installation control profile request must be an object.",
        ),
      ],
    };
  }

  const errors: InstallationControlProfileError[] = [];
  for (const key of Object.keys(input)) {
    if (!requestKeys.has(key)) {
      errors.push(
        profileError(
          "installation_control_profile.unexpected_field",
          jsonPointer(key),
          "Unexpected installation control profile request field.",
        ),
      );
    }
  }

  const profileId = typeof input.profile_id === "string" ? input.profile_id : null;
  if (
    Object.hasOwn(input, "profile_id") &&
    (typeof input.profile_id !== "string" || !safeString(input.profile_id))
  ) {
    errors.push(
      profileError(
        "installation_control_profile.invalid_profile_id",
        "/profile_id",
        "Installation control profile_id must be a safe string when provided.",
      ),
    );
  }

  if (typeof input.project_id !== "string" || !stableIdPattern.test(input.project_id)) {
    errors.push(
      profileError(
        "installation_control_profile.invalid_project_id",
        "/project_id",
        "Installation control project_id must be a stable lowercase id.",
      ),
    );
  }

  if (typeof input.actor_id !== "string" || !actorIdPattern.test(input.actor_id)) {
    errors.push(
      profileError(
        "installation_control_profile.invalid_actor_id",
        "/actor_id",
        "Installation control actor_id must be scoped to an actor namespace.",
      ),
    );
  }

  if (
    typeof input.installation_mode !== "string" ||
    !installationModes.has(input.installation_mode as InstallationMode)
  ) {
    errors.push(
      profileError(
        "installation_control_profile.invalid_installation_mode",
        "/installation_mode",
        "Installation mode is unsupported.",
      ),
    );
  }

  if (
    typeof input.control_mode !== "string" ||
    !controlModes.has(input.control_mode as ControlMode)
  ) {
    errors.push(
      profileError(
        "installation_control_profile.invalid_control_mode",
        "/control_mode",
        "Control mode is unsupported.",
      ),
    );
  }

  const timestamp =
    typeof input.created_at === "string" && isoDateTimePattern.test(input.created_at)
      ? input.created_at
      : createdAt;
  if (
    Object.hasOwn(input, "created_at") &&
    (typeof input.created_at !== "string" || !isoDateTimePattern.test(input.created_at))
  ) {
    errors.push(
      profileError(
        "installation_control_profile.invalid_created_at",
        "/created_at",
        "Installation control created_at must be an ISO UTC timestamp.",
      ),
    );
  }

  const boundaries = normalizeBoundaries(input.boundaries, errors);
  const refs = normalizeSourceRefs(input.source_refs, errors);

  if (
    Object.hasOwn(input, "live_control_allowed") &&
    input.live_control_allowed !== false
  ) {
    errors.push(
      profileError(
        "installation_control_profile.live_control_forbidden",
        "/live_control_allowed",
        "Installation control profile cannot enable live control.",
      ),
    );
  }

  if (
    Object.hasOwn(input, "side_effects") &&
    (!Array.isArray(input.side_effects) || input.side_effects.length !== 0)
  ) {
    errors.push(
      profileError(
        "installation_control_profile.side_effects_forbidden",
        "/side_effects",
        "Installation control profile must preserve side_effects: [].",
      ),
    );
  }

  if (errors.length > 0) {
    return { ok: false, errors: dedupeErrors(errors) };
  }

  return {
    ok: true,
    profile_id: profileId,
    project_id: input.project_id as string,
    actor_id: input.actor_id as string,
    installation_mode: input.installation_mode as InstallationMode,
    control_mode: input.control_mode as ControlMode,
    created_at: timestamp,
    boundaries,
    source_refs: refs,
  };
}

function normalizeBoundaries(
  value: unknown,
  errors: InstallationControlProfileError[],
): InstallationControlBoundaryEvidence[] {
  if (!isPlainObject(value)) {
    errors.push(
      profileError(
        "installation_control_profile.boundaries_required",
        "/boundaries",
        "Installation control profile requires explicit boundaries for every control surface.",
      ),
    );
    return [];
  }

  for (const key of Object.keys(value)) {
    if (!controlSurfaces.has(key as ControlSurface)) {
      errors.push(
        profileError(
          "installation_control_profile.unexpected_field",
          `/boundaries/${escapeJsonPointerSegment(key)}`,
          "Unexpected installation control boundary surface.",
        ),
      );
    }
  }

  const boundaries: InstallationControlBoundaryEvidence[] = [];
  for (const surface of installationControlProfileContract.required_control_surfaces) {
    const boundary = value[surface];
    const path = `/boundaries/${surface}`;
    if (!isPlainObject(boundary)) {
      errors.push(
        profileError(
          "installation_control_profile.boundary_required",
          path,
          `Installation control profile requires explicit ${surface} boundary.`,
        ),
      );
      continue;
    }

    for (const key of Object.keys(boundary)) {
      if (!boundaryKeys.has(key)) {
        errors.push(
          profileError(
            "installation_control_profile.unexpected_field",
            `${path}/${escapeJsonPointerSegment(key)}`,
            "Unexpected installation control boundary field.",
          ),
        );
      }
    }

    const authority = boundary.authority;
    const approvalGate = boundary.approval_gate;
    const rationale = boundary.rationale;

    if (
      typeof authority !== "string" ||
      !controlAuthorities.has(authority as ControlAuthority)
    ) {
      errors.push(
        profileError(
          "installation_control_profile.invalid_boundary",
          `${path}/authority`,
          "Installation control boundary authority is unsupported.",
        ),
      );
      continue;
    }

    if (unsafeAuthority(surface, authority as ControlAuthority)) {
      errors.push(
        profileError(
          "installation_control_profile.unsafe_control_authority",
          `${path}/authority`,
          "Installation control boundary requests unsafe control authority.",
        ),
      );
    }

    if (
      authority === "approval_required" &&
      (typeof approvalGate !== "string" || !safeString(approvalGate))
    ) {
      errors.push(
        profileError(
          "installation_control_profile.approval_gate_required",
          `${path}/approval_gate`,
          "Approval-gated control boundary requires a safe approval_gate.",
        ),
      );
    }

    if (
      Object.hasOwn(boundary, "approval_gate") &&
      approvalGate !== undefined &&
      (typeof approvalGate !== "string" || !safeString(approvalGate))
    ) {
      errors.push(
        profileError(
          "installation_control_profile.invalid_boundary",
          `${path}/approval_gate`,
          "Installation control approval_gate must be a safe non-secret string.",
        ),
      );
    }

    if (typeof rationale !== "string" || !safeString(rationale)) {
      errors.push(
        profileError(
          "installation_control_profile.invalid_boundary",
          `${path}/rationale`,
          "Installation control boundary rationale must be a safe non-secret string.",
        ),
      );
    }

    if (
      typeof rationale === "string" &&
      safeString(rationale) &&
      (approvalGate === undefined ||
        (typeof approvalGate === "string" && safeString(approvalGate)))
    ) {
      boundaries.push({
        surface,
        authority: authority as ControlAuthority,
        approval_gate:
          typeof approvalGate === "string" && approvalGate.length > 0
            ? approvalGate
            : null,
        rationale,
        live_control_allowed: false,
      });
    }
  }

  return boundaries;
}

function normalizeSourceRefs(
  value: unknown,
  errors: InstallationControlProfileError[],
): string[] {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push(
      profileError(
        "installation_control_profile.source_refs_required",
        "/source_refs",
        "Installation control profile requires source refs.",
      ),
    );
    return [];
  }

  const refs: string[] = [];
  value.forEach((source, index) => {
    const path = `/source_refs/${index}`;
    if (!isPlainObject(source)) {
      errors.push(
        profileError(
          "installation_control_profile.invalid_source_ref",
          path,
          "Installation control source ref must be an object.",
        ),
      );
      return;
    }

    for (const key of Object.keys(source)) {
      if (!sourceKeys.has(key)) {
        errors.push(
          profileError(
            "installation_control_profile.unexpected_field",
            `${path}/${escapeJsonPointerSegment(key)}`,
            "Unexpected installation control source ref field.",
          ),
        );
      }
    }

    if (typeof source.source_ref !== "string" || !safeString(source.source_ref)) {
      errors.push(
        profileError(
          "installation_control_profile.invalid_source_ref",
          `${path}/source_ref`,
          "Installation control source_ref must be a safe non-secret string.",
        ),
      );
    }

    if (typeof source.summary !== "string" || !safeString(source.summary)) {
      errors.push(
        profileError(
          "installation_control_profile.invalid_source_ref",
          `${path}/summary`,
          "Installation control source summary must be a safe non-secret string.",
        ),
      );
    }

    if (
      typeof source.source_ref === "string" &&
      typeof source.summary === "string" &&
      safeString(source.source_ref) &&
      safeString(source.summary)
    ) {
      refs.push(`${source.source_ref}: ${source.summary}`);
    }
  });

  return refs;
}

function unsafeAuthority(
  surface: ControlSurface,
  authority: ControlAuthority,
): boolean {
  if (authority === "none") {
    return false;
  }

  if (surface === "secrets" || surface === "ssh") {
    return authority !== "approval_required";
  }

  return false;
}

function sourceRefs(sourceRefsInput: string[]): string[] {
  return uniqueStrings([
    ...sourceRefsInput,
    ...installationControlProfileContract.source_docs.map((doc) => `doc:${doc}`),
  ]);
}

function failInstallationControlProfile(
  errors: InstallationControlProfileError[],
): InstallationControlProfileResult {
  return {
    ok: false,
    profile: null,
    errors,
    raw_input_content: "withheld",
    side_effects: [],
  };
}

function profileError(
  code: InstallationControlProfileErrorCode,
  path: string,
  message: string,
): InstallationControlProfileError {
  return { code, path, message, severity: "error" };
}

function safeString(value: string): boolean {
  return (
    safeStringPattern.test(value) &&
    !secretLikePattern.test(value) &&
    !value.toLowerCase().includes("rm -rf")
  );
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)].filter((value) => value.length > 0).sort();
}

function dedupeErrors(
  errors: InstallationControlProfileError[],
): InstallationControlProfileError[] {
  const seen = new Set<string>();
  return errors.filter((error) => {
    const key = `${error.code}:${error.path}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function jsonPointer(label: string): string {
  return `/${escapeJsonPointerSegment(label)}`;
}

function escapeJsonPointerSegment(segment: string): string {
  return segment.replaceAll("~", "~0").replaceAll("/", "~1");
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
