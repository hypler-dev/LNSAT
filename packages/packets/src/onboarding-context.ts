import { hashUniversalPacket, type PacketHash } from "./canonical.js";
import {
  validateUniversalPacket,
  type PacketValidationResult,
  type UniversalPacket,
} from "./validator.js";
import {
  validateAgentProfile,
  type AgentProfile,
  type AgentProfileValidationError,
} from "./agent-profile.js";
import {
  validateProjectProfile,
  type ProjectProfile,
  type ProjectProfileValidationError,
} from "./project-profile.js";

export const ONBOARDING_CONTEXT_COMPILER_STATUS = "contract_only";

export const onboardingContextCompilerContract = {
  contract_id: "lnsat.onboarding.context_packet_compiler.v0_1",
  packet_type: "ContextPacket",
  authority: ["@lnsat/packets", "repo-local-onboarding-profiles"],
  source_docs: [
    "docs/architecture/PACKET_MODEL.md",
    "docs/architecture/POLICY_AND_AUDIT.md",
    "docs/onboarding/PROJECT_ONBOARDING.md",
    "docs/onboarding/AGENT_ONBOARDING.md",
    "packages/packets/fixtures/project-profiles/valid/lnsat-project-profile.json",
    "packages/packets/fixtures/agent-profiles/valid/codex-observer-profile.json",
    "docs/reference/CONTRACT_PROVENANCE.md",
  ],
  side_effects: [],
  status: "contract_only",
} as const;

export type OnboardingContextCompilerRequest = {
  request_id?: string;
  project_profile_ref: string;
  agent_profile_ref: string;
  project_profile: unknown;
  agent_profile: unknown;
  session_id?: string;
  created_at?: string;
};

export type OnboardingContextCompilerErrorCode =
  | "onboarding_context.invalid_request"
  | "onboarding_context.unexpected_field"
  | "onboarding_context.invalid_request_id"
  | "onboarding_context.invalid_profile_ref"
  | "onboarding_context.invalid_session_id"
  | "onboarding_context.invalid_created_at"
  | "onboarding_context.project_profile_rejected"
  | "onboarding_context.agent_profile_rejected"
  | "onboarding_context.project_scope_rejected"
  | "onboarding_context.packet_validation_failed";

export type OnboardingContextCompilerError = {
  code: OnboardingContextCompilerErrorCode;
  path: string;
  message: string;
  severity: "error";
};

export type OnboardingContextProfileValidationError =
  ProjectProfileValidationError | AgentProfileValidationError;

export type OnboardingContextCompilerResponse =
  | {
      ok: true;
      contract_id: typeof onboardingContextCompilerContract.contract_id;
      request_id: string | null;
      compiled_at: string;
      trusted_source_refs: string[];
      profile_refs: {
        project_profile_ref: string;
        agent_profile_ref: string;
      };
      packet_ref: {
        packet_id: string;
        packet_type: "ContextPacket";
        packet_hash: PacketHash;
      };
      context_packet: UniversalPacket;
      validation: PacketValidationResult & { ok: true };
      side_effects: [];
    }
  | {
      ok: false;
      contract_id: typeof onboardingContextCompilerContract.contract_id;
      request_id: string | null;
      compiled_at: string;
      errors: OnboardingContextCompilerError[];
      profile_errors: OnboardingContextProfileValidationError[];
      trusted_source_refs: [];
      packet_ref: null;
      context_packet: null;
      validation: null;
      raw_input_content: "withheld";
      side_effects: [];
    };

type NormalizedOnboardingContextCompilerRequest =
  | {
      ok: true;
      request_id: string | null;
      project_profile_ref: string;
      agent_profile_ref: string;
      project_profile: unknown;
      agent_profile: unknown;
      session_id: string;
      created_at: string;
    }
  | {
      ok: false;
      request_id: string | null;
      compiled_at: string;
      errors: OnboardingContextCompilerError[];
    };

const requestKeys = new Set([
  "request_id",
  "project_profile_ref",
  "agent_profile_ref",
  "project_profile",
  "agent_profile",
  "session_id",
  "created_at",
]);

const defaultSessionId = "sess_onboarding_context_0001";
const isoDateTimePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;
const sessionIdPattern = /^sess_[a-z0-9][a-z0-9_-]{7,63}$/;
const repoLocalProfileRefPattern =
  /^packages\/packets\/fixtures\/(project|agent)-profiles\/valid\/[a-z0-9][a-z0-9_.-]*\.json$/;

export async function compileOnboardingContextPacket(
  input: unknown,
  options: { now?: Date } = {},
): Promise<OnboardingContextCompilerResponse> {
  const compiledAt = (options.now ?? new Date()).toISOString();
  const normalized = normalizeOnboardingContextCompilerRequest(input, compiledAt);

  if (!normalized.ok) {
    return onboardingContextCompilerFailure(
      normalized.request_id,
      normalized.compiled_at,
      normalized.errors,
      [],
    );
  }

  const projectValidation = validateProjectProfile(normalized.project_profile);
  const agentValidation = validateAgentProfile(normalized.agent_profile);
  const errors: OnboardingContextCompilerError[] = [];
  const profileErrors: OnboardingContextProfileValidationError[] = [];

  if (!projectValidation.ok) {
    profileErrors.push(...projectValidation.errors);
    errors.push(
      compilerError(
        "onboarding_context.project_profile_rejected",
        "/project_profile",
        "Project profile failed closed validation.",
      ),
    );
  }

  if (!agentValidation.ok) {
    profileErrors.push(...agentValidation.errors);
    errors.push(
      compilerError(
        "onboarding_context.agent_profile_rejected",
        "/agent_profile",
        "Agent profile failed closed validation.",
      ),
    );
  }

  if (errors.length > 0) {
    return onboardingContextCompilerFailure(
      normalized.request_id,
      normalized.created_at,
      errors,
      profileErrors,
    );
  }

  if (!projectValidation.ok || !agentValidation.ok) {
    return onboardingContextCompilerFailure(
      normalized.request_id,
      normalized.created_at,
      errors,
      profileErrors,
    );
  }

  if (
    !agentValidation.profile.projects_allowed.includes(
      projectValidation.profile.project_id,
    )
  ) {
    return onboardingContextCompilerFailure(
      normalized.request_id,
      normalized.created_at,
      [
        compilerError(
          "onboarding_context.project_scope_rejected",
          "/agent_profile/projects_allowed",
          "Agent profile is not scoped to the requested project.",
        ),
      ],
      [],
    );
  }

  const contextPacket = buildContextPacket(
    projectValidation.profile,
    agentValidation.profile,
    normalized,
  );
  const validation = validateUniversalPacket(contextPacket);

  if (!validation.ok) {
    return onboardingContextCompilerFailure(
      normalized.request_id,
      normalized.created_at,
      [
        compilerError(
          "onboarding_context.packet_validation_failed",
          "/context_packet",
          "Compiled ContextPacket failed closed packet validation.",
        ),
      ],
      [],
    );
  }

  const packetHash = await hashUniversalPacket(validation.packet);

  return {
    ok: true,
    contract_id: onboardingContextCompilerContract.contract_id,
    request_id: normalized.request_id,
    compiled_at: normalized.created_at,
    trusted_source_refs: trustedSourceRefs(
      projectValidation.profile,
      agentValidation.profile,
      normalized,
    ),
    profile_refs: {
      project_profile_ref: normalized.project_profile_ref,
      agent_profile_ref: normalized.agent_profile_ref,
    },
    packet_ref: {
      packet_id: validation.packet.packet_id,
      packet_type: "ContextPacket",
      packet_hash: packetHash,
    },
    context_packet: validation.packet,
    validation: { ...validation, ok: true },
    side_effects: [],
  };
}

function normalizeOnboardingContextCompilerRequest(
  input: unknown,
  compiledAt: string,
): NormalizedOnboardingContextCompilerRequest {
  if (!isPlainObject(input)) {
    return {
      ok: false,
      request_id: null,
      compiled_at: compiledAt,
      errors: [
        compilerError(
          "onboarding_context.invalid_request",
          "",
          "Onboarding ContextPacket compiler request must be an object.",
        ),
      ],
    };
  }

  const errors: OnboardingContextCompilerError[] = [];
  for (const key of Object.keys(input)) {
    if (!requestKeys.has(key)) {
      errors.push(
        compilerError(
          "onboarding_context.unexpected_field",
          jsonPointer(key),
          "Unexpected onboarding ContextPacket compiler request field.",
        ),
      );
    }
  }

  const requestId = typeof input.request_id === "string" ? input.request_id : null;
  if (Object.hasOwn(input, "request_id") && typeof input.request_id !== "string") {
    errors.push(
      compilerError(
        "onboarding_context.invalid_request_id",
        "/request_id",
        "Compiler request_id must be a string when provided.",
      ),
    );
  }

  validateProfileRef(input.project_profile_ref, "project_profile_ref", errors);
  validateProfileRef(input.agent_profile_ref, "agent_profile_ref", errors);

  const sessionId =
    typeof input.session_id === "string" ? input.session_id : defaultSessionId;
  if (
    Object.hasOwn(input, "session_id") &&
    (typeof input.session_id !== "string" || !sessionIdPattern.test(input.session_id))
  ) {
    errors.push(
      compilerError(
        "onboarding_context.invalid_session_id",
        "/session_id",
        "Compiler session_id must use sess_ prefix and stable lowercase id.",
      ),
    );
  }

  const createdAt =
    typeof input.created_at === "string" && isoDateTimePattern.test(input.created_at)
      ? input.created_at
      : compiledAt;
  if (
    Object.hasOwn(input, "created_at") &&
    (typeof input.created_at !== "string" || !isoDateTimePattern.test(input.created_at))
  ) {
    errors.push(
      compilerError(
        "onboarding_context.invalid_created_at",
        "/created_at",
        "Compiler created_at must be an ISO UTC timestamp.",
      ),
    );
  }

  if (errors.length > 0) {
    return { ok: false, request_id: requestId, compiled_at: createdAt, errors };
  }

  return {
    ok: true,
    request_id: requestId,
    project_profile_ref: input.project_profile_ref as string,
    agent_profile_ref: input.agent_profile_ref as string,
    project_profile: input.project_profile,
    agent_profile: input.agent_profile,
    session_id: sessionId,
    created_at: createdAt,
  };
}

function validateProfileRef(
  value: unknown,
  label: "project_profile_ref" | "agent_profile_ref",
  errors: OnboardingContextCompilerError[],
): void {
  if (
    typeof value !== "string" ||
    !repoLocalProfileRefPattern.test(value) ||
    (label === "project_profile_ref" && !value.includes("/project-profiles/")) ||
    (label === "agent_profile_ref" && !value.includes("/agent-profiles/"))
  ) {
    errors.push(
      compilerError(
        "onboarding_context.invalid_profile_ref",
        jsonPointer(label),
        "Profile refs must point to supported repo-local valid onboarding fixtures.",
      ),
    );
  }
}

function buildContextPacket(
  projectProfile: ProjectProfile,
  agentProfile: AgentProfile,
  request: NormalizedOnboardingContextCompilerRequest & { ok: true },
): UniversalPacket {
  const allowedCapabilities = readOnlyAllowedCapabilities(projectProfile, agentProfile);
  const blockedCapabilities = uniqueStrings([
    ...projectProfile.policies.blocked_capabilities,
    ...agentProfile.capabilities.block,
  ]);

  return {
    packet_id: stablePacketId(projectProfile, agentProfile),
    packet_type: "ContextPacket",
    version: "0.1",
    project_id: projectProfile.project_id,
    actor_id: agentProfile.actor_id,
    session_id: request.session_id,
    intent: `Compile read-only onboarding context for project ${projectProfile.project_id}.`,
    risk_level: 1,
    source_refs: trustedSourceRefs(projectProfile, agentProfile, request),
    resource_refs: resourceRefs(projectProfile, agentProfile),
    policy_profile: "onboarding_read_only",
    permission_envelope: {
      allow: allowedCapabilities,
      block: blockedCapabilities,
    },
    budget: {
      tokens: agentProfile.budgets.token_limit,
      runtime_seconds: Math.min(
        agentProfile.budgets.runtime_seconds,
        agentProfile.session.ttl_seconds,
      ),
      cost_usd: agentProfile.budgets.cost_usd,
      cpu: 0,
      memory_mb: 0,
    },
    constraints: {
      compiler_contract_id: onboardingContextCompilerContract.contract_id,
      project_profile_ref: request.project_profile_ref,
      agent_profile_ref: request.agent_profile_ref,
      profile_status: {
        project: projectProfile.status,
        agent: agentProfile.status,
      },
      docs_entrypoints: projectProfile.docs.entrypoints,
      output_contract: {
        required_sections: agentProfile.output_contract.required_sections,
        forbidden_actions: agentProfile.output_contract.forbidden_actions,
      },
      side_effects: [],
    },
    requires_approval: false,
    ttl_seconds: agentProfile.session.ttl_seconds,
    created_at: request.created_at,
  };
}

function readOnlyAllowedCapabilities(
  projectProfile: ProjectProfile,
  agentProfile: AgentProfile,
): string[] {
  const agentAllowed = new Set(agentProfile.capabilities.allow);
  return uniqueStrings(projectProfile.policies.allowed_capabilities)
    .filter((capability) => agentAllowed.has(capability))
    .filter(
      (capability) => capability.startsWith("context.") || capability === "repo.read",
    );
}

function trustedSourceRefs(
  projectProfile: ProjectProfile,
  agentProfile: AgentProfile,
  request: Pick<
    NormalizedOnboardingContextCompilerRequest & { ok: true },
    "project_profile_ref" | "agent_profile_ref"
  >,
): string[] {
  return uniqueStrings([
    `fixture:${request.project_profile_ref}`,
    `fixture:${request.agent_profile_ref}`,
    ...projectProfile.source_refs,
    ...agentProfile.source_refs,
    ...onboardingContextCompilerContract.source_docs.map((doc) => `doc:${doc}`),
  ]);
}

function resourceRefs(
  projectProfile: ProjectProfile,
  agentProfile: AgentProfile,
): string[] {
  return uniqueStrings([
    `project:${projectProfile.project_id}`,
    `actor:${agentProfile.actor_id}`,
    ...projectProfile.repos.map((repo) => `repo:${repo.id}`),
    ...projectProfile.resources.domains.map((domain) => `domain:${domain}`),
  ]);
}

function stablePacketId(
  projectProfile: ProjectProfile,
  agentProfile: AgentProfile,
): UniversalPacket["packet_id"] {
  return `pkt_onboarding_context_${stableId(projectProfile.project_id)}_${stableId(
    agentProfile.actor_id,
  )}`;
}

function stableId(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 24);
}

function onboardingContextCompilerFailure(
  requestId: string | null,
  compiledAt: string,
  errors: OnboardingContextCompilerError[],
  profileErrors: OnboardingContextProfileValidationError[],
): OnboardingContextCompilerResponse {
  return {
    ok: false,
    contract_id: onboardingContextCompilerContract.contract_id,
    request_id: requestId,
    compiled_at: compiledAt,
    errors,
    profile_errors: profileErrors,
    trusted_source_refs: [],
    packet_ref: null,
    context_packet: null,
    validation: null,
    raw_input_content: "withheld",
    side_effects: [],
  };
}

function compilerError(
  code: OnboardingContextCompilerErrorCode,
  path: string,
  message: string,
): OnboardingContextCompilerError {
  return { code, path, message, severity: "error" };
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)].filter((value) => value.length > 0).sort();
}

function jsonPointer(label: string): string {
  return `/${label
    .split(".")
    .map((segment) => escapeJsonPointerSegment(segment))
    .join("/")}`;
}

function escapeJsonPointerSegment(segment: string): string {
  return segment.replaceAll("~", "~0").replaceAll("/", "~1");
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
