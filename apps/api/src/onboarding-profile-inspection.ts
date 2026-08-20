import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  validateAgentProfile,
  validateProjectProfile,
  type AgentProfile,
  type AgentProfileValidationError,
  type ProjectProfile,
  type ProjectProfileValidationError,
} from "@lnsat/packets";

export const ONBOARDING_PROFILE_INSPECTION_GATEWAY_STATUS = "contract_only";

export const onboardingProfileInspectionGatewayContract = {
  contract_id: "lnsat.gateway.onboarding_profile_inspection.v0_1",
  method: "POST",
  path: "/v1/onboarding/profiles/inspect",
  authority: ["@lnsat/packets", "repo-local-onboarding-fixtures"],
  source_docs: [
    "docs/onboarding/PROJECT_ONBOARDING.md",
    "docs/onboarding/AGENT_ONBOARDING.md",
    "packages/packets/fixtures/project-profiles/valid/lnsat-project-profile.json",
    "packages/packets/fixtures/agent-profiles/valid/codex-observer-profile.json",
    "docs/reference/CONTRACT_PROVENANCE.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
  ],
  side_effects: [],
  status: "contract_only",
} as const;

export type OnboardingProfileKind = "project" | "agent";

export type OnboardingProfileInspectionGatewayRequest = {
  request_id?: string;
  profile_kind?: OnboardingProfileKind;
};

export type OnboardingProfileInspectionErrorCode =
  | "onboarding_profile.invalid_request"
  | "onboarding_profile.unexpected_field"
  | "onboarding_profile.invalid_request_id"
  | "onboarding_profile.invalid_profile_kind"
  | "onboarding_profile.source_unavailable";

export type OnboardingProfileInspectionError = {
  code: OnboardingProfileInspectionErrorCode;
  path: string;
  message: string;
  severity: "error";
};

export type OnboardingProfileValidationError =
  ProjectProfileValidationError | AgentProfileValidationError;

export type OnboardingProfileInspection =
  ValidOnboardingProfileInspection | InvalidOnboardingProfileInspection;

export type ValidOnboardingProfileInspection = {
  id: string;
  kind: OnboardingProfileKind;
  name: string;
  path: string;
  trusted_source_refs: string[];
  validation: {
    ok: true;
    errors: [];
  };
  profile_ref: OnboardingProfileRef;
  evidence: {
    source_docs: string[];
    side_effects: [];
    inspected_at: string;
  };
};

export type InvalidOnboardingProfileInspection = {
  id: string;
  kind: OnboardingProfileKind;
  name: string;
  path: string;
  trusted_source_refs: [];
  validation: {
    ok: false;
    errors: OnboardingProfileValidationError[];
  };
  profile_ref: null;
  evidence: {
    source_docs: string[];
    side_effects: [];
    inspected_at: string;
    raw_profile_content: "withheld";
  };
};

export type OnboardingProfileRef =
  | {
      kind: "project";
      profile_id: ProjectProfile["project_id"];
      display_name: string;
      owner: string;
      status: ProjectProfile["status"];
      repos: number;
      docs: string[];
      domains: string[];
      allowed_capabilities: string[];
      blocked_capabilities: string[];
    }
  | {
      kind: "agent";
      profile_id: AgentProfile["actor_id"];
      display_name: string;
      provider: string;
      role: AgentProfile["role"];
      status: AgentProfile["status"];
      projects_allowed: string[];
      allowed_capabilities: string[];
      blocked_capabilities: string[];
      approval_required_for: string[];
      ttl_seconds: number;
    };

export type OnboardingProfileInspectionGatewayResponse =
  | {
      ok: true;
      contract_id: typeof onboardingProfileInspectionGatewayContract.contract_id;
      request_id: string | null;
      inspected_at: string;
      source_docs: string[];
      summary: {
        total: number;
        valid: number;
        rejected: number;
        side_effects: [];
      };
      profiles: OnboardingProfileInspection[];
      side_effects: [];
    }
  | {
      ok: false;
      contract_id: typeof onboardingProfileInspectionGatewayContract.contract_id;
      request_id: string | null;
      inspected_at: string;
      source_docs: string[];
      errors: OnboardingProfileInspectionError[];
      side_effects: [];
    };

type NormalizedOnboardingProfileInspectionRequest =
  | {
      ok: true;
      request_id: string | null;
      profile_kind: OnboardingProfileKind | null;
    }
  | {
      ok: false;
      request_id: string | null;
      errors: OnboardingProfileInspectionError[];
    };

const LNSAT_REPO_ROOT = fileURLToPath(new URL("../../..", import.meta.url));
const fixtureRoot = join(LNSAT_REPO_ROOT, "packages/packets/fixtures");

const projectProfileFiles = [
  "valid/lnsat-project-profile.json",
  "invalid/missing-required-field.json",
  "invalid/rejects-repo-without-source.json",
  "invalid/rejects-secret-value.json",
] as const;

const agentProfileFiles = [
  "valid/codex-observer-profile.json",
  "invalid/missing-required-field.json",
  "invalid/rejects-conflicting-capabilities.json",
  "invalid/rejects-empty-project-scope.json",
  "invalid/rejects-secret-value.json",
] as const;

const onboardingProfileRequestKeys = new Set(["request_id", "profile_kind"]);
const onboardingProfileKinds = new Set(["project", "agent"]);

export async function inspectOnboardingProfileGatewayRequest(
  input: unknown,
  options: { now?: Date } = {},
): Promise<OnboardingProfileInspectionGatewayResponse> {
  const inspectedAt = (options.now ?? new Date()).toISOString();
  const normalized = normalizeOnboardingProfileInspectionRequest(input);

  if (!normalized.ok) {
    return onboardingProfileInspectionFailure(
      normalized.request_id,
      inspectedAt,
      normalized.errors,
    );
  }

  try {
    const profiles = await inspectProfiles(normalized.profile_kind, inspectedAt);
    const valid = profiles.filter((profile) => profile.validation.ok).length;

    return {
      ok: true,
      contract_id: onboardingProfileInspectionGatewayContract.contract_id,
      request_id: normalized.request_id,
      inspected_at: inspectedAt,
      source_docs: onboardingProfileSourceDocs(),
      summary: {
        total: profiles.length,
        valid,
        rejected: profiles.length - valid,
        side_effects: [],
      },
      profiles,
      side_effects: [],
    };
  } catch {
    return onboardingProfileInspectionFailure(normalized.request_id, inspectedAt, [
      onboardingProfileInspectionError(
        "onboarding_profile.source_unavailable",
        "",
        "Onboarding profile source fixtures could not be read.",
      ),
    ]);
  }
}

function normalizeOnboardingProfileInspectionRequest(
  input: unknown,
): NormalizedOnboardingProfileInspectionRequest {
  if (!isPlainObject(input)) {
    return {
      ok: false,
      request_id: null,
      errors: [
        onboardingProfileInspectionError(
          "onboarding_profile.invalid_request",
          "",
          "Onboarding profile inspection request must be an object.",
        ),
      ],
    };
  }

  const errors: OnboardingProfileInspectionError[] = [];
  for (const key of Object.keys(input)) {
    if (!onboardingProfileRequestKeys.has(key)) {
      errors.push(
        onboardingProfileInspectionError(
          "onboarding_profile.unexpected_field",
          jsonPointer(key),
          "Unexpected onboarding profile inspection request field.",
        ),
      );
    }
  }

  const requestId = typeof input.request_id === "string" ? input.request_id : null;
  if (Object.hasOwn(input, "request_id") && typeof input.request_id !== "string") {
    errors.push(
      onboardingProfileInspectionError(
        "onboarding_profile.invalid_request_id",
        "/request_id",
        "Onboarding profile inspection request_id must be a string when provided.",
      ),
    );
  }

  const profileKind =
    typeof input.profile_kind === "string" &&
    onboardingProfileKinds.has(input.profile_kind)
      ? (input.profile_kind as OnboardingProfileKind)
      : null;

  if (
    Object.hasOwn(input, "profile_kind") &&
    (typeof input.profile_kind !== "string" ||
      !onboardingProfileKinds.has(input.profile_kind))
  ) {
    errors.push(
      onboardingProfileInspectionError(
        "onboarding_profile.invalid_profile_kind",
        "/profile_kind",
        "profile_kind must be project or agent when provided.",
      ),
    );
  }

  if (errors.length > 0) {
    return { ok: false, request_id: requestId, errors };
  }

  return {
    ok: true,
    request_id: requestId,
    profile_kind: profileKind,
  };
}

async function inspectProfiles(
  profileKind: OnboardingProfileKind | null,
  inspectedAt: string,
): Promise<OnboardingProfileInspection[]> {
  const profileSets = await Promise.all([
    profileKind === "agent"
      ? Promise.resolve([])
      : Promise.all(
          projectProfileFiles.map((file) =>
            inspectProjectProfileFixture(file, inspectedAt),
          ),
        ),
    profileKind === "project"
      ? Promise.resolve([])
      : Promise.all(
          agentProfileFiles.map((file) =>
            inspectAgentProfileFixture(file, inspectedAt),
          ),
        ),
  ]);

  return profileSets.flat();
}

async function inspectProjectProfileFixture(
  fixtureFile: (typeof projectProfileFiles)[number],
  inspectedAt: string,
): Promise<OnboardingProfileInspection> {
  const path = `packages/packets/fixtures/project-profiles/${fixtureFile}`;
  const value = await readJson(path);
  const validation = validateProjectProfile(value);
  const base = baseInspection("project", fixtureFile, path);

  if (!validation.ok) {
    return {
      ...base,
      trusted_source_refs: [],
      validation: {
        ok: false,
        errors: validation.errors,
      },
      profile_ref: null,
      evidence: invalidEvidence(projectSourceDocs(path), inspectedAt),
    };
  }

  return {
    ...base,
    trusted_source_refs: validation.profile.source_refs,
    validation: {
      ok: true,
      errors: [],
    },
    profile_ref: {
      kind: "project",
      profile_id: validation.profile.project_id,
      display_name: validation.profile.display_name,
      owner: validation.profile.owner,
      status: validation.profile.status,
      repos: validation.profile.repos.length,
      docs: validation.profile.docs.entrypoints,
      domains: validation.profile.resources.domains,
      allowed_capabilities: validation.profile.policies.allowed_capabilities,
      blocked_capabilities: validation.profile.policies.blocked_capabilities,
    },
    evidence: validEvidence(projectSourceDocs(path), inspectedAt),
  };
}

async function inspectAgentProfileFixture(
  fixtureFile: (typeof agentProfileFiles)[number],
  inspectedAt: string,
): Promise<OnboardingProfileInspection> {
  const path = `packages/packets/fixtures/agent-profiles/${fixtureFile}`;
  const value = await readJson(path);
  const validation = validateAgentProfile(value);
  const base = baseInspection("agent", fixtureFile, path);

  if (!validation.ok) {
    return {
      ...base,
      trusted_source_refs: [],
      validation: {
        ok: false,
        errors: validation.errors,
      },
      profile_ref: null,
      evidence: invalidEvidence(agentSourceDocs(path), inspectedAt),
    };
  }

  return {
    ...base,
    trusted_source_refs: validation.profile.source_refs,
    validation: {
      ok: true,
      errors: [],
    },
    profile_ref: {
      kind: "agent",
      profile_id: validation.profile.actor_id,
      display_name: validation.profile.display_name,
      provider: validation.profile.provider,
      role: validation.profile.role,
      status: validation.profile.status,
      projects_allowed: validation.profile.projects_allowed,
      allowed_capabilities: validation.profile.capabilities.allow,
      blocked_capabilities: validation.profile.capabilities.block,
      approval_required_for: validation.profile.approval.required_for,
      ttl_seconds: validation.profile.session.ttl_seconds,
    },
    evidence: validEvidence(agentSourceDocs(path), inspectedAt),
  };
}

function onboardingProfileInspectionFailure(
  requestId: string | null,
  inspectedAt: string,
  errors: OnboardingProfileInspectionError[],
): OnboardingProfileInspectionGatewayResponse {
  return {
    ok: false,
    contract_id: onboardingProfileInspectionGatewayContract.contract_id,
    request_id: requestId,
    inspected_at: inspectedAt,
    source_docs: onboardingProfileSourceDocs(),
    errors,
    side_effects: [],
  };
}

function onboardingProfileInspectionError(
  code: OnboardingProfileInspectionErrorCode,
  path: string,
  message: string,
): OnboardingProfileInspectionError {
  return {
    code,
    path,
    message,
    severity: "error",
  };
}

function baseInspection(
  kind: OnboardingProfileKind,
  fixtureFile: string,
  path: string,
) {
  return {
    id: `${kind}-${fixtureFile.replaceAll("/", "-").replace(/\.json$/, "")}`,
    kind,
    name: fixtureName(fixtureFile),
    path,
  };
}

function validEvidence(sourceDocs: string[], inspectedAt: string) {
  return {
    source_docs: sourceDocs,
    side_effects: [] as [],
    inspected_at: inspectedAt,
  };
}

function invalidEvidence(sourceDocs: string[], inspectedAt: string) {
  return {
    source_docs: sourceDocs,
    side_effects: [] as [],
    inspected_at: inspectedAt,
    raw_profile_content: "withheld" as const,
  };
}

async function readJson(path: string): Promise<unknown> {
  const fixturePath = join(fixtureRoot, path.replace("packages/packets/fixtures/", ""));
  return JSON.parse(await readFile(fixturePath, "utf8"));
}

function fixtureName(fixtureFile: string): string {
  return fixtureFile
    .replace(/\.json$/, "")
    .split("/")
    .at(-1)!
    .split("-")
    .map((part) => part[0]!.toUpperCase() + part.slice(1))
    .join(" ");
}

function onboardingProfileSourceDocs(): string[] {
  return [
    ...projectSourceDocs(),
    ...agentSourceDocs(),
    ...projectProfileFiles.map(
      (file) => `packages/packets/fixtures/project-profiles/${file}`,
    ),
    ...agentProfileFiles.map(
      (file) => `packages/packets/fixtures/agent-profiles/${file}`,
    ),
  ];
}

function projectSourceDocs(fixturePath?: string): string[] {
  return [
    "docs/onboarding/PROJECT_ONBOARDING.md",
    "packages/packets/fixtures/project-profiles/valid/lnsat-project-profile.json",
    "docs/reference/CONTRACT_PROVENANCE.md",
    ...(fixturePath === undefined ? [] : [fixturePath]),
  ];
}

function agentSourceDocs(fixturePath?: string): string[] {
  return [
    "docs/onboarding/AGENT_ONBOARDING.md",
    "packages/packets/fixtures/agent-profiles/valid/codex-observer-profile.json",
    "docs/reference/CONTRACT_PROVENANCE.md",
    ...(fixturePath === undefined ? [] : [fixturePath]),
  ];
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function jsonPointer(key: string): string {
  return `/${key.replaceAll("~", "~0").replaceAll("/", "~1")}`;
}
