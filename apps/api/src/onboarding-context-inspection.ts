import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import {
  createAuditLedgerRecordFromOnboardingContextPreview,
  createOnboardingContextInspectionAuditPreview,
  validateAuditLedgerRecord,
  type AuditLedgerRecord,
  type AuditLedgerRecordValidationResult,
  type OnboardingContextInspectionAuditPreviewInput,
  type OnboardingContextInspectionAuditPreviewRecord,
} from "@lnsat/audit";
import {
  compileOnboardingContextPacket,
  type OnboardingContextCompilerError,
  type OnboardingContextProfileValidationError,
  type PacketValidationResult,
  type UniversalPacket,
} from "@lnsat/packets";

export const ONBOARDING_CONTEXT_INSPECTION_GATEWAY_STATUS = "contract_only";

export const onboardingContextInspectionGatewayContract = {
  contract_id: "lnsat.gateway.onboarding_context_packet_inspection.v0_1",
  method: "POST",
  path: "/v1/onboarding/context/inspect",
  authority: ["@lnsat/packets", "repo-local-valid-onboarding-fixtures"],
  source_docs: [
    "docs/architecture/PACKET_MODEL.md",
    "docs/architecture/POLICY_AND_AUDIT.md",
    "docs/onboarding/PROJECT_ONBOARDING.md",
    "docs/onboarding/AGENT_ONBOARDING.md",
    "packages/packets/fixtures/project-profiles/valid/lnsat-project-profile.json",
    "packages/packets/fixtures/agent-profiles/valid/codex-observer-profile.json",
    "docs/reference/CONTRACT_PROVENANCE.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
  ],
  side_effects: [],
  status: "contract_only",
} as const;

export type OnboardingContextInspectionGatewayRequest = {
  request_id?: string;
  session_id?: string;
  created_at?: string;
};

export type OnboardingContextInspectionErrorCode =
  | "onboarding_context_inspection.invalid_request"
  | "onboarding_context_inspection.unexpected_field"
  | "onboarding_context_inspection.invalid_request_id"
  | "onboarding_context_inspection.source_unavailable";

export type OnboardingContextInspectionError = {
  code: OnboardingContextInspectionErrorCode;
  path: string;
  message: string;
  severity: "error";
};

export type OnboardingContextInspectionGatewayResponse =
  | {
      ok: true;
      contract_id: typeof onboardingContextInspectionGatewayContract.contract_id;
      request_id: string | null;
      inspected_at: string;
      source_docs: string[];
      trusted_source_refs: string[];
      profile_refs: {
        project_profile_ref: string;
        agent_profile_ref: string;
      };
      packet_ref: {
        packet_id: string;
        packet_type: "ContextPacket";
        packet_hash: string;
      };
      validation: PacketValidationResult & { ok: true };
      policy_envelope: UniversalPacket["permission_envelope"];
      budget: UniversalPacket["budget"];
      ttl_seconds: number;
      audit_event_preview: OnboardingContextInspectionAuditPreviewRecord[];
      audit_ledger_record_preview: AuditLedgerRecordPreviewEvidence[];
      side_effects: [];
    }
  | {
      ok: false;
      contract_id: typeof onboardingContextInspectionGatewayContract.contract_id;
      request_id: string | null;
      inspected_at: string;
      source_docs: string[];
      request_errors: OnboardingContextInspectionError[];
      compiler_errors: OnboardingContextCompilerError[];
      profile_errors: OnboardingContextProfileValidationError[];
      trusted_source_refs: [];
      packet_ref: null;
      validation: null;
      policy_envelope: null;
      budget: null;
      ttl_seconds: null;
      raw_input_content: "withheld";
      audit_event_preview: OnboardingContextInspectionAuditPreviewRecord[];
      audit_ledger_record_preview: AuditLedgerRecordPreviewEvidence[];
      side_effects: [];
    };

export type AuditLedgerRecordPreviewEvidence = {
  source_event_id: string;
  persistence: "not_persisted";
  record: AuditLedgerRecord;
  validation: AuditLedgerRecordValidationResult;
};

type NormalizedOnboardingContextInspectionRequest =
  | {
      ok: true;
      request_id: string | null;
      session_id?: string;
      created_at?: string;
    }
  | {
      ok: false;
      request_id: string | null;
      errors: OnboardingContextInspectionError[];
    };

const LNSAT_REPO_ROOT = resolve(process.cwd(), "../..");
const fixtureRoot = join(LNSAT_REPO_ROOT, "packages/packets/fixtures");

const projectProfileRef =
  "packages/packets/fixtures/project-profiles/valid/lnsat-project-profile.json";
const agentProfileRef =
  "packages/packets/fixtures/agent-profiles/valid/codex-observer-profile.json";

const requestKeys = new Set(["request_id", "session_id", "created_at"]);

export async function inspectOnboardingContextGatewayRequest(
  input: unknown,
  options: { now?: Date } = {},
): Promise<OnboardingContextInspectionGatewayResponse> {
  const inspectedAt = (options.now ?? new Date()).toISOString();
  const normalized = normalizeOnboardingContextInspectionRequest(input);

  if (!normalized.ok) {
    return onboardingContextInspectionFailure(
      normalized.request_id,
      inspectedAt,
      normalized.errors,
      [],
      [],
    );
  }

  try {
    const [projectProfile, agentProfile] = await Promise.all([
      readJson(projectProfileRef),
      readJson(agentProfileRef),
    ]);

    const compilerRequest = {
      ...(normalized.request_id === null ? {} : { request_id: normalized.request_id }),
      project_profile_ref: projectProfileRef,
      agent_profile_ref: agentProfileRef,
      project_profile: projectProfile,
      agent_profile: agentProfile,
      ...(normalized.session_id === undefined
        ? {}
        : { session_id: normalized.session_id }),
      created_at: normalized.created_at ?? inspectedAt,
    };
    const compilerOptions = options.now === undefined ? {} : { now: options.now };
    const compilerResult = await compileOnboardingContextPacket(
      compilerRequest,
      compilerOptions,
    );

    if (!compilerResult.ok) {
      return onboardingContextInspectionFailure(
        compilerResult.request_id,
        inspectedAt,
        [],
        compilerResult.errors,
        compilerResult.profile_errors,
      );
    }

    const response = {
      ok: true,
      contract_id: onboardingContextInspectionGatewayContract.contract_id,
      request_id: compilerResult.request_id,
      inspected_at: inspectedAt,
      source_docs: onboardingContextInspectionSourceDocs(),
      trusted_source_refs: compilerResult.trusted_source_refs,
      profile_refs: compilerResult.profile_refs,
      packet_ref: compilerResult.packet_ref,
      validation: compilerResult.validation,
      policy_envelope: compilerResult.context_packet.permission_envelope,
      budget: compilerResult.context_packet.budget,
      ttl_seconds: compilerResult.context_packet.ttl_seconds,
      side_effects: [],
    } satisfies Omit<
      OnboardingContextInspectionGatewayResponse & { ok: true },
      "audit_event_preview" | "audit_ledger_record_preview"
    >;

    return {
      ...response,
      ...withAuditPreviews(response, {
        actor_ref: compilerResult.context_packet.actor_id,
        session_ref: compilerResult.context_packet.session_id,
        resource_refs: compilerResult.context_packet.resource_refs,
      }),
    };
  } catch {
    return onboardingContextInspectionFailure(
      normalized.request_id,
      inspectedAt,
      [
        inspectionError(
          "onboarding_context_inspection.source_unavailable",
          "",
          "Repo-local valid onboarding profile fixtures could not be read.",
        ),
      ],
      [],
      [],
    );
  }
}

function normalizeOnboardingContextInspectionRequest(
  input: unknown,
): NormalizedOnboardingContextInspectionRequest {
  if (!isPlainObject(input)) {
    return {
      ok: false,
      request_id: null,
      errors: [
        inspectionError(
          "onboarding_context_inspection.invalid_request",
          "",
          "Onboarding ContextPacket inspection request must be an object.",
        ),
      ],
    };
  }

  const errors: OnboardingContextInspectionError[] = [];
  for (const key of Object.keys(input)) {
    if (!requestKeys.has(key)) {
      errors.push(
        inspectionError(
          "onboarding_context_inspection.unexpected_field",
          jsonPointer(key),
          "Unexpected onboarding ContextPacket inspection request field.",
        ),
      );
    }
  }

  const requestId = typeof input.request_id === "string" ? input.request_id : null;
  if (Object.hasOwn(input, "request_id") && typeof input.request_id !== "string") {
    errors.push(
      inspectionError(
        "onboarding_context_inspection.invalid_request_id",
        "/request_id",
        "Onboarding ContextPacket inspection request_id must be a string when provided.",
      ),
    );
  }

  if (errors.length > 0) {
    return { ok: false, request_id: requestId, errors };
  }

  const normalized: {
    ok: true;
    request_id: string | null;
    session_id?: string;
    created_at?: string;
  } = {
    ok: true,
    request_id: requestId,
  };
  if (typeof input.session_id === "string") {
    normalized.session_id = input.session_id;
  }
  if (typeof input.created_at === "string") {
    normalized.created_at = input.created_at;
  }
  return normalized;
}

function onboardingContextInspectionFailure(
  requestId: string | null,
  inspectedAt: string,
  requestErrors: OnboardingContextInspectionError[],
  compilerErrors: OnboardingContextCompilerError[],
  profileErrors: OnboardingContextProfileValidationError[],
): OnboardingContextInspectionGatewayResponse {
  const response = {
    ok: false,
    contract_id: onboardingContextInspectionGatewayContract.contract_id,
    request_id: requestId,
    inspected_at: inspectedAt,
    source_docs: onboardingContextInspectionSourceDocs(),
    request_errors: requestErrors,
    compiler_errors: compilerErrors,
    profile_errors: profileErrors,
    trusted_source_refs: [],
    packet_ref: null,
    validation: null,
    policy_envelope: null,
    budget: null,
    ttl_seconds: null,
    raw_input_content: "withheld",
    side_effects: [],
  } satisfies Omit<
    OnboardingContextInspectionGatewayResponse & { ok: false },
    "audit_event_preview" | "audit_ledger_record_preview"
  >;

  return {
    ...response,
    ...withAuditPreviews(response),
  };
}

function withAuditPreviews(
  response: OnboardingContextInspectionAuditPreviewInput,
  options: {
    actor_ref?: string | null;
    session_ref?: string | null;
    resource_refs?: string[];
  } = {},
): {
  audit_event_preview: OnboardingContextInspectionAuditPreviewRecord[];
  audit_ledger_record_preview: AuditLedgerRecordPreviewEvidence[];
} {
  const auditEventPreview = createOnboardingContextInspectionAuditPreview(response);

  return {
    audit_event_preview: auditEventPreview,
    audit_ledger_record_preview: auditEventPreview.map((preview) => {
      const record = createAuditLedgerRecordFromOnboardingContextPreview({
        ledger_record_id: ledgerRecordPreviewId(preview),
        preview,
        ...(options.actor_ref === undefined ? {} : { actor_ref: options.actor_ref }),
        ...(options.session_ref === undefined
          ? {}
          : { session_ref: options.session_ref }),
        ...(options.resource_refs === undefined
          ? {}
          : { resource_refs: options.resource_refs }),
      });

      return {
        source_event_id: preview.event_id,
        persistence: "not_persisted",
        record,
        validation: validateAuditLedgerRecord(record),
      };
    }),
  };
}

function ledgerRecordPreviewId(
  preview: OnboardingContextInspectionAuditPreviewRecord,
): string {
  const stableRef = preview.request_id ?? preview.event_id;
  const body = `${preview.event_type}_${stableRef}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 90);

  return `alr_${body}`;
}

function onboardingContextInspectionSourceDocs(): string[] {
  return [
    ...onboardingContextInspectionGatewayContract.source_docs,
    projectProfileRef,
    agentProfileRef,
  ];
}

async function readJson(path: string): Promise<unknown> {
  const fixturePath = join(fixtureRoot, path.replace("packages/packets/fixtures/", ""));
  return JSON.parse(await readFile(fixturePath, "utf8"));
}

function inspectionError(
  code: OnboardingContextInspectionErrorCode,
  path: string,
  message: string,
): OnboardingContextInspectionError {
  return {
    code,
    path,
    message,
    severity: "error",
  };
}

function jsonPointer(label: string): string {
  return `/${label
    .split(".")
    .map((segment) => segment.replaceAll("~", "~0").replaceAll("/", "~1"))
    .join("/")}`;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
