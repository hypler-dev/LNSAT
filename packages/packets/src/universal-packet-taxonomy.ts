import { universalPacketTypes, type UniversalPacketType } from "./validator.js";

export const UNIVERSAL_PACKET_TAXONOMY_STATUS = "contract_only";

export const universalPacketTaxonomyContract = {
  contract_id: "lnsat.platform.universal_packet_taxonomy.v0_1",
  authority: ["@lnsat/packets", "source-backed-packet-taxonomy"],
  taxonomy_version: "0.1",
  required_families: [
    "context",
    "policy",
    "audit",
    "capability",
    "execution",
    "environment",
    "resources",
    "results",
    "patches",
    "secrets",
    "telemetry",
  ],
  current_universal_packet_types: universalPacketTypes,
  source_docs: [
    "docs/architecture/PACKET_MODEL.md",
    "docs/architecture/POLICY_AND_AUDIT.md",
    "docs/architecture/SYSTEM_ARCHITECTURE.md",
    "docs/architecture/DATA_MODEL.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
  ],
  live_dispatch_allowed: false,
  side_effects: [],
  status: "contract_only",
} as const;

export type UniversalPacketFamily =
  (typeof universalPacketTaxonomyContract.required_families)[number];

export type UniversalPacketTaxonomySourceInput = {
  source_ref: string;
  summary: string;
};

export type UniversalPacketFamilyDefinitionInput = {
  family: UniversalPacketFamily;
  summary: string;
  lifecycle_intents: string[];
  current_packet_types: UniversalPacketType[];
  reserved_packet_types: string[];
  source_refs: UniversalPacketTaxonomySourceInput[];
};

export type UniversalPacketFamilyEvidence = {
  family: UniversalPacketFamily;
  summary: string;
  lifecycle_intents: string[];
  current_packet_types: UniversalPacketType[];
  reserved_packet_types: string[];
  source_refs: string[];
};

export type UniversalPacketFamilyMap = Record<
  UniversalPacketFamily,
  UniversalPacketFamilyEvidence
>;

export type UniversalPacketTaxonomyRequest = {
  taxonomy_version?: typeof universalPacketTaxonomyContract.taxonomy_version;
  family_map?: Partial<
    Record<
      UniversalPacketFamily,
      UniversalPacketFamilyDefinitionInput | UniversalPacketFamilyEvidence
    >
  >;
  source_refs?: UniversalPacketTaxonomySourceInput[];
  live_dispatch_allowed?: false;
  side_effects?: [];
};

export type UniversalPacketTaxonomyErrorCode =
  | "universal_packet_taxonomy.invalid_request"
  | "universal_packet_taxonomy.unexpected_field"
  | "universal_packet_taxonomy.invalid_taxonomy_version"
  | "universal_packet_taxonomy.family_map_required"
  | "universal_packet_taxonomy.unknown_family"
  | "universal_packet_taxonomy.family_required"
  | "universal_packet_taxonomy.invalid_family"
  | "universal_packet_taxonomy.overlapping_packet_type"
  | "universal_packet_taxonomy.unsafe_family"
  | "universal_packet_taxonomy.invalid_source_ref"
  | "universal_packet_taxonomy.live_dispatch_forbidden"
  | "universal_packet_taxonomy.side_effects_forbidden";

export type UniversalPacketTaxonomyError = {
  code: UniversalPacketTaxonomyErrorCode;
  path: string;
  message: string;
  severity: "error";
};

export type UniversalPacketTaxonomyEvidence = {
  contract_id: typeof universalPacketTaxonomyContract.contract_id;
  taxonomy_version: typeof universalPacketTaxonomyContract.taxonomy_version;
  packet_family_map: UniversalPacketFamilyMap;
  universal_packet_schema_compatibility: {
    schema_version: "0.1";
    accepted_packet_types: UniversalPacketType[];
    validator_unchanged: true;
  };
  source_refs: string[];
  live_dispatch_allowed: false;
  side_effects: [];
};

export type UniversalPacketTaxonomyResult =
  | {
      ok: true;
      taxonomy: UniversalPacketTaxonomyEvidence;
      errors: [];
      side_effects: [];
    }
  | {
      ok: false;
      taxonomy: null;
      errors: UniversalPacketTaxonomyError[];
      raw_input_content: "withheld";
      side_effects: [];
    };

type NormalizedUniversalPacketTaxonomyRequest =
  | {
      ok: true;
      family_map: UniversalPacketFamilyMap;
      source_refs: string[];
    }
  | {
      ok: false;
      errors: UniversalPacketTaxonomyError[];
    };

const requestKeys = new Set([
  "taxonomy_version",
  "family_map",
  "source_refs",
  "live_dispatch_allowed",
  "side_effects",
]);

const familyDefinitionKeys = new Set([
  "family",
  "summary",
  "lifecycle_intents",
  "current_packet_types",
  "reserved_packet_types",
  "source_refs",
]);
const sourceKeys = new Set(["source_ref", "summary"]);
const familySet = new Set<UniversalPacketFamily>(
  universalPacketTaxonomyContract.required_families,
);
const currentPacketTypeSet = new Set<UniversalPacketType>(universalPacketTypes);
const safeStringPattern = /^[\w .,:;@/()[\]#_+=-]{3,240}$/;
const reservedPacketTypePattern = /^[A-Z][A-Za-z0-9]{2,64}Packet$/;
const secretLikePattern =
  /(postgres:\/\/|mysql:\/\/|mongodb:\/\/|DATABASE_URL|TOKEN|PASSWORD|PRIVATE KEY|sk-[A-Za-z0-9]|secret:)/i;
const unsafeLifecyclePattern =
  /\b(shell|ssh|deploy|write|delete|execute|exec|root|sudo|secret\.read|database\.write|db\.write)\b/i;

export const defaultUniversalPacketFamilyMap = {
  context: packetFamily("context", {
    summary: "task context, working set, source refs, warnings, and handoff shape",
    lifecycle_intents: ["compile", "inspect", "synthesize"],
    current_packet_types: ["ContextPacket"],
    reserved_packet_types: ["ContextAtomPacket", "WorkingSetPacket"],
  }),
  policy: packetFamily("policy", {
    summary: "policy preview, decision, approval request, and policy evidence",
    lifecycle_intents: ["preview", "decide", "request_approval"],
    current_packet_types: [],
    reserved_packet_types: ["PolicyPacket", "ApprovalPacket"],
  }),
  audit: packetFamily("audit", {
    summary: "immutable audit attempts, decisions, records, and ledger evidence",
    lifecycle_intents: ["preview", "record", "link_result"],
    current_packet_types: ["AuditPacket"],
    reserved_packet_types: ["AuditLedgerRecordPacket"],
  }),
  capability: packetFamily("capability", {
    summary: "capability request, permission envelope, target, and risk evidence",
    lifecycle_intents: ["request", "scope", "review"],
    current_packet_types: ["CapabilityPacket"],
    reserved_packet_types: ["CapabilityGrantPacket"],
  }),
  execution: packetFamily("execution", {
    summary: "bounded task proposal and later approved run evidence",
    lifecycle_intents: ["propose", "plan", "result_link"],
    current_packet_types: ["ExecutionPacket"],
    reserved_packet_types: ["RunbookPacket"],
  }),
  environment: packetFamily("environment", {
    summary: "container, runner, host, service, and environment boundary evidence",
    lifecycle_intents: ["describe", "prepare", "teardown_plan"],
    current_packet_types: ["EnvironmentPacket"],
    reserved_packet_types: ["ContainerPacket"],
  }),
  resources: packetFamily("resources", {
    summary: "normalized projects, repos, machines, services, databases, and refs",
    lifecycle_intents: ["describe", "relate", "inventory"],
    current_packet_types: ["ResourcePacket"],
    reserved_packet_types: ["ResourceRelationshipPacket"],
  }),
  results: packetFamily("results", {
    summary: "status, logs, artifacts, metrics, errors, and rollback pointers",
    lifecycle_intents: ["summarize", "attach_artifact", "close_loop"],
    current_packet_types: ["ResultPacket"],
    reserved_packet_types: ["ArtifactPacket"],
  }),
  patches: packetFamily("patches", {
    summary: "source-backed diff proposal, tests run, risks, and rollback plan",
    lifecycle_intents: ["propose", "review", "apply_plan"],
    current_packet_types: ["PatchPacket"],
    reserved_packet_types: ["RepoZonePacket"],
  }),
  secrets: packetFamily("secrets", {
    summary: "secret-use request by reference only with no exposed values",
    lifecycle_intents: ["request_brokered_use", "redact", "audit_reference"],
    current_packet_types: ["SecretUsePacket"],
    reserved_packet_types: ["SecretBrokerPacket"],
  }),
  telemetry: packetFamily("telemetry", {
    summary: "node, service, runtime, metric, heartbeat, and observation evidence",
    lifecycle_intents: ["observe", "heartbeat", "report_status"],
    current_packet_types: ["NodeTelemetryPacket"],
    reserved_packet_types: ["TelemetryPacket"],
  }),
} satisfies Record<UniversalPacketFamily, UniversalPacketFamilyEvidence>;

export function createUniversalPacketTaxonomy(
  input: unknown = {},
): UniversalPacketTaxonomyResult {
  const normalized = normalizeUniversalPacketTaxonomyRequest(input);

  if (!normalized.ok) {
    return failUniversalPacketTaxonomy(normalized.errors);
  }

  return {
    ok: true,
    taxonomy: {
      contract_id: universalPacketTaxonomyContract.contract_id,
      taxonomy_version: universalPacketTaxonomyContract.taxonomy_version,
      packet_family_map: normalized.family_map,
      universal_packet_schema_compatibility: {
        schema_version: "0.1",
        accepted_packet_types: [...universalPacketTypes],
        validator_unchanged: true,
      },
      source_refs: sourceRefs(normalized.source_refs),
      live_dispatch_allowed: false,
      side_effects: [],
    },
    errors: [],
    side_effects: [],
  };
}

function normalizeUniversalPacketTaxonomyRequest(
  input: unknown,
): NormalizedUniversalPacketTaxonomyRequest {
  if (!isPlainObject(input)) {
    return {
      ok: false,
      errors: [
        taxonomyError(
          "universal_packet_taxonomy.invalid_request",
          "",
          "Universal packet taxonomy request must be an object.",
        ),
      ],
    };
  }

  const errors: UniversalPacketTaxonomyError[] = [];
  for (const key of Object.keys(input)) {
    if (!requestKeys.has(key)) {
      errors.push(
        taxonomyError(
          "universal_packet_taxonomy.unexpected_field",
          jsonPointer(key),
          "Unexpected universal packet taxonomy request field.",
        ),
      );
    }
  }

  if (
    Object.hasOwn(input, "taxonomy_version") &&
    input.taxonomy_version !== universalPacketTaxonomyContract.taxonomy_version
  ) {
    errors.push(
      taxonomyError(
        "universal_packet_taxonomy.invalid_taxonomy_version",
        "/taxonomy_version",
        "Universal packet taxonomy version is unsupported.",
      ),
    );
  }

  const familyMap =
    Object.hasOwn(input, "family_map") && input.family_map !== undefined
      ? normalizeFamilyMap(input.family_map, errors)
      : defaultUniversalPacketFamilyMap;
  const refs = Object.hasOwn(input, "source_refs")
    ? normalizeSourceRefs(input.source_refs, "/source_refs", errors)
    : [];

  if (
    Object.hasOwn(input, "live_dispatch_allowed") &&
    input.live_dispatch_allowed !== false
  ) {
    errors.push(
      taxonomyError(
        "universal_packet_taxonomy.live_dispatch_forbidden",
        "/live_dispatch_allowed",
        "Universal packet taxonomy cannot enable live dispatch.",
      ),
    );
  }

  if (
    Object.hasOwn(input, "side_effects") &&
    (!Array.isArray(input.side_effects) || input.side_effects.length !== 0)
  ) {
    errors.push(
      taxonomyError(
        "universal_packet_taxonomy.side_effects_forbidden",
        "/side_effects",
        "Universal packet taxonomy must preserve side_effects: [].",
      ),
    );
  }

  if (errors.length > 0) {
    return { ok: false, errors: dedupeErrors(errors) };
  }

  return { ok: true, family_map: familyMap, source_refs: refs };
}

function normalizeFamilyMap(
  value: unknown,
  errors: UniversalPacketTaxonomyError[],
): UniversalPacketFamilyMap {
  if (!isPlainObject(value)) {
    errors.push(
      taxonomyError(
        "universal_packet_taxonomy.family_map_required",
        "/family_map",
        "Universal packet taxonomy requires a family map object.",
      ),
    );
    return defaultUniversalPacketFamilyMap;
  }

  for (const key of Object.keys(value)) {
    if (!familySet.has(key as UniversalPacketFamily)) {
      errors.push(
        taxonomyError(
          "universal_packet_taxonomy.unknown_family",
          `/family_map/${escapeJsonPointerSegment(key)}`,
          "Universal packet taxonomy family is unknown.",
        ),
      );
    }
  }

  const familyMap = {} as UniversalPacketFamilyMap;
  for (const family of universalPacketTaxonomyContract.required_families) {
    const definition = value[family];
    if (!isPlainObject(definition)) {
      errors.push(
        taxonomyError(
          "universal_packet_taxonomy.family_required",
          `/family_map/${family}`,
          `Universal packet taxonomy requires ${family} family definition.`,
        ),
      );
      continue;
    }

    const evidence = normalizeFamilyDefinition(family, definition, errors);
    if (evidence !== null) {
      familyMap[family] = evidence;
    }
  }

  validatePacketTypeOwnership(familyMap, errors);
  return familyMap;
}

function normalizeFamilyDefinition(
  expectedFamily: UniversalPacketFamily,
  definition: Record<string, unknown>,
  errors: UniversalPacketTaxonomyError[],
): UniversalPacketFamilyEvidence | null {
  const path = `/family_map/${expectedFamily}`;
  for (const key of Object.keys(definition)) {
    if (!familyDefinitionKeys.has(key)) {
      errors.push(
        taxonomyError(
          "universal_packet_taxonomy.unexpected_field",
          `${path}/${escapeJsonPointerSegment(key)}`,
          "Unexpected universal packet family field.",
        ),
      );
    }
  }

  if (definition.family !== expectedFamily) {
    errors.push(
      taxonomyError(
        "universal_packet_taxonomy.invalid_family",
        `${path}/family`,
        "Universal packet family key and family value must match.",
      ),
    );
  }

  if (typeof definition.summary !== "string" || !safeString(definition.summary)) {
    errors.push(
      taxonomyError(
        "universal_packet_taxonomy.unsafe_family",
        `${path}/summary`,
        "Universal packet family summary must be a safe non-secret string.",
      ),
    );
  }

  const lifecycleIntents = normalizeLifecycleIntents(
    definition.lifecycle_intents,
    `${path}/lifecycle_intents`,
    errors,
  );
  const currentPacketTypes = normalizeCurrentPacketTypes(
    definition.current_packet_types,
    `${path}/current_packet_types`,
    errors,
  );
  const reservedPacketTypes = normalizeReservedPacketTypes(
    definition.reserved_packet_types,
    `${path}/reserved_packet_types`,
    errors,
  );
  const refs = normalizeSourceRefs(
    definition.source_refs,
    `${path}/source_refs`,
    errors,
  );

  if (
    definition.family === expectedFamily &&
    typeof definition.summary === "string" &&
    safeString(definition.summary) &&
    lifecycleIntents.length > 0 &&
    refs.length > 0
  ) {
    return {
      family: expectedFamily,
      summary: definition.summary,
      lifecycle_intents: lifecycleIntents,
      current_packet_types: currentPacketTypes,
      reserved_packet_types: reservedPacketTypes,
      source_refs: refs,
    };
  }

  return null;
}

function normalizeLifecycleIntents(
  value: unknown,
  path: string,
  errors: UniversalPacketTaxonomyError[],
): string[] {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push(
      taxonomyError(
        "universal_packet_taxonomy.invalid_family",
        path,
        "Universal packet family requires lifecycle intents.",
      ),
    );
    return [];
  }

  const intents: string[] = [];
  value.forEach((item, index) => {
    const itemPath = `${path}/${index}`;
    if (
      typeof item !== "string" ||
      !safeString(item) ||
      unsafeLifecyclePattern.test(item)
    ) {
      errors.push(
        taxonomyError(
          "universal_packet_taxonomy.unsafe_family",
          itemPath,
          "Universal packet lifecycle intent must be safe and non-executing.",
        ),
      );
      return;
    }
    intents.push(item);
  });
  return uniqueStrings(intents);
}

function normalizeCurrentPacketTypes(
  value: unknown,
  path: string,
  errors: UniversalPacketTaxonomyError[],
): UniversalPacketType[] {
  if (!Array.isArray(value)) {
    errors.push(
      taxonomyError(
        "universal_packet_taxonomy.invalid_family",
        path,
        "Universal packet family current_packet_types must be an array.",
      ),
    );
    return [];
  }

  const packetTypes: UniversalPacketType[] = [];
  value.forEach((item, index) => {
    if (typeof item !== "string" || !currentPacketTypeSet.has(item as never)) {
      errors.push(
        taxonomyError(
          "universal_packet_taxonomy.invalid_family",
          `${path}/${index}`,
          "Current packet type must be accepted by the universal packet schema.",
        ),
      );
      return;
    }
    packetTypes.push(item as UniversalPacketType);
  });
  return uniqueStrings(packetTypes) as UniversalPacketType[];
}

function normalizeReservedPacketTypes(
  value: unknown,
  path: string,
  errors: UniversalPacketTaxonomyError[],
): string[] {
  if (!Array.isArray(value)) {
    errors.push(
      taxonomyError(
        "universal_packet_taxonomy.invalid_family",
        path,
        "Universal packet family reserved_packet_types must be an array.",
      ),
    );
    return [];
  }

  const packetTypes: string[] = [];
  value.forEach((item, index) => {
    if (
      typeof item !== "string" ||
      currentPacketTypeSet.has(item as UniversalPacketType) ||
      !reservedPacketTypePattern.test(item) ||
      !safeString(item)
    ) {
      errors.push(
        taxonomyError(
          "universal_packet_taxonomy.unsafe_family",
          `${path}/${index}`,
          "Reserved packet type must be a safe future Packet name and cannot duplicate current schema types.",
        ),
      );
      return;
    }
    packetTypes.push(item);
  });
  return uniqueStrings(packetTypes);
}

function normalizeSourceRefs(
  value: unknown,
  path: string,
  errors: UniversalPacketTaxonomyError[],
): string[] {
  if (!Array.isArray(value)) {
    errors.push(
      taxonomyError(
        "universal_packet_taxonomy.invalid_source_ref",
        path,
        "Universal packet taxonomy source_refs must be an array.",
      ),
    );
    return [];
  }

  const refs: string[] = [];
  value.forEach((source, index) => {
    const sourcePath = `${path}/${index}`;
    if (typeof source === "string" && safeString(source)) {
      refs.push(source);
      return;
    }

    if (!isPlainObject(source)) {
      errors.push(
        taxonomyError(
          "universal_packet_taxonomy.invalid_source_ref",
          sourcePath,
          "Universal packet taxonomy source ref must be an object.",
        ),
      );
      return;
    }

    for (const key of Object.keys(source)) {
      if (!sourceKeys.has(key)) {
        errors.push(
          taxonomyError(
            "universal_packet_taxonomy.unexpected_field",
            `${sourcePath}/${escapeJsonPointerSegment(key)}`,
            "Unexpected universal packet taxonomy source ref field.",
          ),
        );
      }
    }

    if (typeof source.source_ref !== "string" || !safeString(source.source_ref)) {
      errors.push(
        taxonomyError(
          "universal_packet_taxonomy.invalid_source_ref",
          `${sourcePath}/source_ref`,
          "Universal packet taxonomy source_ref must be a safe non-secret string.",
        ),
      );
    }

    if (typeof source.summary !== "string" || !safeString(source.summary)) {
      errors.push(
        taxonomyError(
          "universal_packet_taxonomy.invalid_source_ref",
          `${sourcePath}/summary`,
          "Universal packet taxonomy source summary must be a safe non-secret string.",
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

  return uniqueStrings(refs);
}

function validatePacketTypeOwnership(
  familyMap: Partial<UniversalPacketFamilyMap>,
  errors: UniversalPacketTaxonomyError[],
): void {
  const owners = new Map<string, UniversalPacketFamily>();
  for (const family of universalPacketTaxonomyContract.required_families) {
    const definition = familyMap[family];
    if (definition === undefined) {
      continue;
    }

    for (const packetType of [
      ...definition.current_packet_types,
      ...definition.reserved_packet_types,
    ]) {
      const currentOwner = owners.get(packetType);
      if (currentOwner !== undefined && currentOwner !== family) {
        errors.push(
          taxonomyError(
            "universal_packet_taxonomy.overlapping_packet_type",
            `/family_map/${family}`,
            "Universal packet taxonomy cannot assign one packet type to multiple families.",
          ),
        );
        continue;
      }
      owners.set(packetType, family);
    }
  }
}

function packetFamily(
  family: UniversalPacketFamily,
  input: Omit<UniversalPacketFamilyEvidence, "family" | "source_refs">,
): UniversalPacketFamilyEvidence {
  return {
    family,
    ...input,
    source_refs: sourceRefs([`ticket:BP-0084: ${family} packet family`]),
  };
}

function sourceRefs(sourceRefsInput: string[]): string[] {
  return uniqueStrings([
    ...sourceRefsInput,
    ...universalPacketTaxonomyContract.source_docs.map((doc) => `doc:${doc}`),
  ]);
}

function failUniversalPacketTaxonomy(
  errors: UniversalPacketTaxonomyError[],
): UniversalPacketTaxonomyResult {
  return {
    ok: false,
    taxonomy: null,
    errors,
    raw_input_content: "withheld",
    side_effects: [],
  };
}

function taxonomyError(
  code: UniversalPacketTaxonomyErrorCode,
  path: string,
  message: string,
): UniversalPacketTaxonomyError {
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
  errors: UniversalPacketTaxonomyError[],
): UniversalPacketTaxonomyError[] {
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
