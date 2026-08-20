import {
  persistencePolicyBlockedCapabilityFlags,
  persistencePolicyGateIds,
  type PersistencePolicyBlockedCapabilityFlag,
  type PersistencePolicyGateId,
} from "./persistence-policy-gate.js";
import {
  persistenceSchemaBlockedCapabilityFlags,
  persistenceSchemaContract,
  persistenceSchemaEntityNames,
  type PersistenceSchemaBlockedCapabilityFlag,
  type PersistenceSchemaEntityName,
} from "./persistence-schema-contract.js";

export const MIGRATION_ARTIFACT_STATIC_REVIEW_STATUS = "source_only";

export const migrationArtifactStaticReviewTargetGate =
  "G03_MIGRATION_ARTIFACT_STATIC" satisfies PersistencePolicyGateId;

export const migrationArtifactStaticReviewArtifactKinds = [
  "migration_manifest_ref",
  "sql_artifact_ref",
  "rollback_ref",
  "static_check_ref",
] as const;

export const migrationArtifactStaticReviewCheckIds = [
  "GATE_ORDER_COVERAGE",
  "SCHEMA_ENTITY_COVERAGE",
  "MIGRATION_MANIFEST_REF_PRESENT",
  "SQL_ARTIFACT_REF_PRESENT_NO_CONTENT",
  "ROLLBACK_REF_PRESENT",
  "FORBIDDEN_TOKEN_SCAN",
  "NO_CONNECTION_STRING",
  "NO_MIGRATION_RUNNER",
  "NO_SECRET_VALUE",
] as const;

export const migrationArtifactStaticReviewForbiddenTokens = [
  "DATABASE_URL",
  "postgres://",
  "postgresql://",
  "mysql://",
  "sqlite://",
  "connection_string",
  "password=",
  "api_key",
  "secret-token",
  "psql ",
  "prisma migrate deploy",
  "drizzle-kit migrate",
  "typeorm migration:run",
  "dbmate up",
  "supabase db push",
] as const;

export const migrationArtifactStaticReviewAdditionalBlockedCapabilityFlags = [
  "sql_artifact_content_allowed",
  "sql_execution_allowed",
  "live_sql_execution_allowed",
  "migration_artifact_content_allowed",
  "migration_artifact_execution_allowed",
  "migration_manifest_execution_allowed",
  "migration_runner_allowed",
  "auth_session_runtime_allowed",
] as const;

export const migrationArtifactStaticReviewBlockedCapabilityFlags = [
  ...persistenceSchemaBlockedCapabilityFlags,
  ...migrationArtifactStaticReviewAdditionalBlockedCapabilityFlags,
] as const;

export const migrationArtifactStaticReviewContract = {
  contract_id: "lnsat.platform.migration_artifact_static_review.v0_1",
  authority: ["@lnsat/packets", "source-backed-migration-static-review"],
  review_version: "0.1",
  source_docs: [
    "docs/architecture/PERSISTENCE_AND_POLICY_GATE_REVIEW.md",
    "docs/architecture/PERSISTENCE_SCHEMA_PLAN.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
  ],
  schema_contract_id: persistenceSchemaContract.contract_id,
  target_gate: migrationArtifactStaticReviewTargetGate,
  gate_ids: persistencePolicyGateIds,
  required_entity_names: persistenceSchemaEntityNames,
  artifact_kinds: migrationArtifactStaticReviewArtifactKinds,
  static_check_ids: migrationArtifactStaticReviewCheckIds,
  forbidden_tokens: migrationArtifactStaticReviewForbiddenTokens,
  blocked_capability_flags: migrationArtifactStaticReviewBlockedCapabilityFlags,
  contract_authority: "source_only_migration_artifact_static_review_no_db_no_runner",
  source_only_static_review_allowed: true,
  migration_manifest_refs_allowed: true,
  sql_artifact_refs_allowed: true,
  rollback_refs_allowed: true,
  static_check_refs_allowed: true,
  sql_artifact_content_allowed: false,
  sql_execution_allowed: false,
  live_sql_execution_allowed: false,
  migration_execution_allowed: false,
  migration_runner_allowed: false,
  database_connection_allowed: false,
  database_write_allowed: false,
  writer_implementation_allowed: false,
  live_storage_allowed: false,
  live_execution_allowed: false,
  python_runtime_required: false,
  os_specific_binary_required: false,
  side_effects: [],
  status: "source_only",
} as const;

export type MigrationArtifactStaticReviewArtifactKind =
  (typeof migrationArtifactStaticReviewArtifactKinds)[number];
export type MigrationArtifactStaticReviewCheckId =
  (typeof migrationArtifactStaticReviewCheckIds)[number];
export type MigrationArtifactStaticReviewForbiddenToken =
  (typeof migrationArtifactStaticReviewForbiddenTokens)[number];
export type MigrationArtifactStaticReviewAdditionalBlockedCapabilityFlag =
  (typeof migrationArtifactStaticReviewAdditionalBlockedCapabilityFlags)[number];
export type MigrationArtifactStaticReviewBlockedCapabilityFlag =
  | PersistenceSchemaBlockedCapabilityFlag
  | PersistencePolicyBlockedCapabilityFlag
  | MigrationArtifactStaticReviewAdditionalBlockedCapabilityFlag;

export type MigrationArtifactStaticReviewSourceRefInput = {
  source_ref: string;
  summary: string;
};

export type MigrationArtifactStaticReviewArtifactRefInput = {
  artifact_ref: string;
  artifact_kind: MigrationArtifactStaticReviewArtifactKind;
  summary: string;
  current_state: "source_ref_only_no_sql_content";
  repo_local: true;
  contains_sql_content: false;
  connection_required: false;
  execution_allowed: false;
};

export type MigrationArtifactStaticReviewEntityCoverageInput = {
  entity_name: PersistenceSchemaEntityName;
  schema_contract_ref: string;
  migration_manifest_ref: string;
  coverage_state: "covered_by_source_only_static_review";
  target_gate: typeof migrationArtifactStaticReviewTargetGate;
  live_storage_allowed: false;
};

export type MigrationArtifactStaticReviewRollbackRefInput = {
  rollback_ref: string;
  summary: string;
  current_state: "source_ref_only";
  execution_allowed: false;
};

export type MigrationArtifactStaticReviewStaticCheckRefInput = {
  check_id: MigrationArtifactStaticReviewCheckId;
  check_kind:
    | "gate_order"
    | "schema_coverage"
    | "manifest_ref"
    | "sql_ref"
    | "rollback_ref"
    | "forbidden_token"
    | "no_connection"
    | "no_runner"
    | "no_secret";
  source_ref: string;
  required_gate: typeof migrationArtifactStaticReviewTargetGate;
  current_state: "source_ref_only";
  external_execution_allowed: false;
};

export type MigrationArtifactStaticReviewForbiddenTokenCheckInput = {
  token: MigrationArtifactStaticReviewForbiddenToken;
  token_kind:
    "connection_string" | "secret_value" | "migration_runner" | "database_url";
  action: "reject_if_present";
  current_state: "static_check_only";
};

export type MigrationArtifactStaticReviewNoConnectionPostureInput = {
  database_url_allowed: false;
  connection_string_allowed: false;
  database_connection_allowed: false;
  database_write_allowed: false;
  sql_execution_allowed: false;
  live_sql_execution_allowed: false;
  migration_runner_allowed: false;
  migration_execution_allowed: false;
  environment_secret_lookup_allowed: false;
};

export type MigrationArtifactStaticReviewAllowedStateInput = {
  source_only_static_review_allowed: true;
  migration_manifest_refs_allowed: true;
  sql_artifact_refs_allowed: true;
  rollback_refs_allowed: true;
  static_check_refs_allowed: true;
  sql_artifact_content_allowed: false;
  sql_execution_allowed: false;
  live_sql_execution_allowed: false;
  migration_execution_allowed: false;
  migration_runner_allowed: false;
  database_connection_allowed: false;
  database_write_allowed: false;
  writer_implementation_allowed: false;
  auth_session_runtime_allowed: false;
  integration_setup_write_allowed: false;
  runtime_adapter_implementation_allowed: false;
  os_connector_package_allowed: false;
  live_storage_allowed: false;
  live_execution_allowed: false;
  python_runtime_required: false;
  os_specific_binary_required: false;
  secret_posture: "references_only_no_values";
};

export type MigrationArtifactStaticReviewRequest = Partial<
  Record<MigrationArtifactStaticReviewBlockedCapabilityFlag, false>
> & {
  review_version?: typeof migrationArtifactStaticReviewContract.review_version;
  gate_sequence?: PersistencePolicyGateId[];
  schema_entity_coverage?: MigrationArtifactStaticReviewEntityCoverageInput[];
  artifact_refs?: MigrationArtifactStaticReviewArtifactRefInput[];
  rollback_refs?: MigrationArtifactStaticReviewRollbackRefInput[];
  static_check_refs?: MigrationArtifactStaticReviewStaticCheckRefInput[];
  forbidden_token_checks?: MigrationArtifactStaticReviewForbiddenTokenCheckInput[];
  no_connection_posture?: MigrationArtifactStaticReviewNoConnectionPostureInput;
  source_refs?: MigrationArtifactStaticReviewSourceRefInput[];
  allowed_state?: MigrationArtifactStaticReviewAllowedStateInput;
  contract_authority?: typeof migrationArtifactStaticReviewContract.contract_authority;
  side_effects?: [];
};

export type MigrationArtifactStaticReviewErrorCode =
  | "migration_artifact_static_review.invalid_request"
  | "migration_artifact_static_review.unexpected_field"
  | "migration_artifact_static_review.invalid_version"
  | "migration_artifact_static_review.gate_sequence_required"
  | "migration_artifact_static_review.gate_order_drift"
  | "migration_artifact_static_review.entity_coverage_required"
  | "migration_artifact_static_review.entity_coverage_drift"
  | "migration_artifact_static_review.artifact_ref_required"
  | "migration_artifact_static_review.invalid_artifact_ref"
  | "migration_artifact_static_review.rollback_ref_required"
  | "migration_artifact_static_review.invalid_rollback_ref"
  | "migration_artifact_static_review.static_check_ref_required"
  | "migration_artifact_static_review.invalid_static_check_ref"
  | "migration_artifact_static_review.forbidden_token_check_required"
  | "migration_artifact_static_review.invalid_forbidden_token_check"
  | "migration_artifact_static_review.no_connection_posture_required"
  | "migration_artifact_static_review.no_connection_posture_drift"
  | "migration_artifact_static_review.source_ref_required"
  | "migration_artifact_static_review.invalid_source_ref"
  | "migration_artifact_static_review.allowed_state_required"
  | "migration_artifact_static_review.allowed_state_drift"
  | "migration_artifact_static_review.unsafe_contract_authority"
  | "migration_artifact_static_review.secret_value_forbidden"
  | "migration_artifact_static_review.connection_string_forbidden"
  | "migration_artifact_static_review.migration_runner_forbidden"
  | "migration_artifact_static_review.blocked_capability_forbidden"
  | "migration_artifact_static_review.live_execution_forbidden"
  | "migration_artifact_static_review.python_runtime_requirement_forbidden"
  | "migration_artifact_static_review.os_specific_binary_requirement_forbidden"
  | "migration_artifact_static_review.side_effects_forbidden";

export type MigrationArtifactStaticReviewError = {
  code: MigrationArtifactStaticReviewErrorCode;
  path: string;
  message: string;
  severity: "error";
};

export type MigrationArtifactStaticReviewEvidence = {
  contract_id: typeof migrationArtifactStaticReviewContract.contract_id;
  review_version: typeof migrationArtifactStaticReviewContract.review_version;
  target_gate: typeof migrationArtifactStaticReviewTargetGate;
  schema_contract_id: typeof persistenceSchemaContract.contract_id;
  required_gate_ids: PersistencePolicyGateId[];
  required_entity_names: PersistenceSchemaEntityName[];
  schema_entity_coverage: MigrationArtifactStaticReviewEntityCoverageInput[];
  artifact_refs: MigrationArtifactStaticReviewArtifactRefInput[];
  rollback_refs: MigrationArtifactStaticReviewRollbackRefInput[];
  static_check_refs: MigrationArtifactStaticReviewStaticCheckRefInput[];
  forbidden_token_checks: MigrationArtifactStaticReviewForbiddenTokenCheckInput[];
  no_connection_posture: MigrationArtifactStaticReviewNoConnectionPostureInput;
  source_refs: string[];
  allowed_state: MigrationArtifactStaticReviewAllowedStateInput;
  blocked_capabilities: MigrationArtifactStaticReviewBlockedCapabilityFlag[];
  implementation_artifacts: [];
  migration_execution_artifacts: [];
  database_connection_allowed: false;
  migration_execution_allowed: false;
  live_storage_allowed: false;
  live_execution_allowed: false;
  python_runtime_required: false;
  os_specific_binary_required: false;
  side_effects: [];
};

export type MigrationArtifactStaticReviewResult =
  | {
      ok: true;
      migration_artifact_static_review: MigrationArtifactStaticReviewEvidence;
      errors: [];
      side_effects: [];
    }
  | {
      ok: false;
      migration_artifact_static_review: null;
      errors: MigrationArtifactStaticReviewError[];
      raw_input_content: "withheld";
      side_effects: [];
    };

type NormalizedMigrationArtifactStaticReviewRequest =
  | {
      ok: true;
      gate_sequence: PersistencePolicyGateId[];
      schema_entity_coverage: MigrationArtifactStaticReviewEntityCoverageInput[];
      artifact_refs: MigrationArtifactStaticReviewArtifactRefInput[];
      rollback_refs: MigrationArtifactStaticReviewRollbackRefInput[];
      static_check_refs: MigrationArtifactStaticReviewStaticCheckRefInput[];
      forbidden_token_checks: MigrationArtifactStaticReviewForbiddenTokenCheckInput[];
      no_connection_posture: MigrationArtifactStaticReviewNoConnectionPostureInput;
      source_refs: string[];
      allowed_state: MigrationArtifactStaticReviewAllowedStateInput;
    }
  | {
      ok: false;
      errors: MigrationArtifactStaticReviewError[];
    };

const requestKeys = new Set([
  "review_version",
  "gate_sequence",
  "schema_entity_coverage",
  "artifact_refs",
  "rollback_refs",
  "static_check_refs",
  "forbidden_token_checks",
  "no_connection_posture",
  "source_refs",
  "allowed_state",
  "contract_authority",
  "side_effects",
  ...migrationArtifactStaticReviewBlockedCapabilityFlags,
]);

const gateIdSet = new Set<string>(persistencePolicyGateIds);
const entityNameSet = new Set<string>(persistenceSchemaEntityNames);
const artifactKindSet = new Set<string>(migrationArtifactStaticReviewArtifactKinds);
const staticCheckIdSet = new Set<string>(migrationArtifactStaticReviewCheckIds);
const forbiddenTokenSet = new Set<string>(migrationArtifactStaticReviewForbiddenTokens);

const defaultSourceRefs: MigrationArtifactStaticReviewSourceRefInput[] = [
  {
    source_ref: "docs/architecture/PERSISTENCE_AND_POLICY_GATE_REVIEW.md",
    summary: "Gate G03 requires source-only migration artifact static review.",
  },
  {
    source_ref: "docs/architecture/PERSISTENCE_SCHEMA_PLAN.md",
    summary: "Future persistence entity plan used for static coverage.",
  },
  {
    source_ref: "packages/packets/src/persistence-schema-contract.ts",
    summary: "BP-0204 source-only schema entity contract.",
  },
  {
    source_ref: "docs/reference/CONTRACT_PROVENANCE.md",
    summary: "Completed BP-0204 source-only schema contract packet.",
  },
  {
    source_ref: "docs/reference/CONTRACT_PROVENANCE.md",
    summary: "Queued BP-0205 migration static review packet.",
  },
];

export const defaultMigrationArtifactStaticReviewAllowedState: MigrationArtifactStaticReviewAllowedStateInput =
  {
    source_only_static_review_allowed: true,
    migration_manifest_refs_allowed: true,
    sql_artifact_refs_allowed: true,
    rollback_refs_allowed: true,
    static_check_refs_allowed: true,
    sql_artifact_content_allowed: false,
    sql_execution_allowed: false,
    live_sql_execution_allowed: false,
    migration_execution_allowed: false,
    migration_runner_allowed: false,
    database_connection_allowed: false,
    database_write_allowed: false,
    writer_implementation_allowed: false,
    auth_session_runtime_allowed: false,
    integration_setup_write_allowed: false,
    runtime_adapter_implementation_allowed: false,
    os_connector_package_allowed: false,
    live_storage_allowed: false,
    live_execution_allowed: false,
    python_runtime_required: false,
    os_specific_binary_required: false,
    secret_posture: "references_only_no_values",
  };

export const defaultMigrationArtifactStaticReviewNoConnectionPosture: MigrationArtifactStaticReviewNoConnectionPostureInput =
  {
    database_url_allowed: false,
    connection_string_allowed: false,
    database_connection_allowed: false,
    database_write_allowed: false,
    sql_execution_allowed: false,
    live_sql_execution_allowed: false,
    migration_runner_allowed: false,
    migration_execution_allowed: false,
    environment_secret_lookup_allowed: false,
  };

export const defaultMigrationArtifactStaticReviewEntityCoverage =
  persistenceSchemaEntityNames.map(
    (entityName): MigrationArtifactStaticReviewEntityCoverageInput => ({
      entity_name: entityName,
      schema_contract_ref: "packages/packets/src/persistence-schema-contract.ts",
      migration_manifest_ref: "docs/reference/CONTRACT_PROVENANCE.md",
      coverage_state: "covered_by_source_only_static_review",
      target_gate: migrationArtifactStaticReviewTargetGate,
      live_storage_allowed: false,
    }),
  );

export const defaultMigrationArtifactStaticReviewArtifactRefs: MigrationArtifactStaticReviewArtifactRefInput[] =
  [
    artifactRef(
      "docs/reference/CONTRACT_PROVENANCE.md",
      "migration_manifest_ref",
      "Source-only manifest reference for future migration artifact review.",
    ),
    artifactRef(
      "docs/architecture/PERSISTENCE_SCHEMA_PLAN.md",
      "sql_artifact_ref",
      "Future schema plan reference only; no raw SQL content is embedded.",
    ),
    artifactRef(
      "docs/reference/CONTRACT_PROVENANCE.md",
      "rollback_ref",
      "Packet rollback notes for removing this source-only review contract.",
    ),
    artifactRef(
      "packages/packets/test/migration-artifact-static-review.test.ts",
      "static_check_ref",
      "Deterministic static review tests for G03 source-only evidence.",
    ),
  ];

export const defaultMigrationArtifactStaticReviewRollbackRefs: MigrationArtifactStaticReviewRollbackRefInput[] =
  [
    {
      rollback_ref: "docs/reference/CONTRACT_PROVENANCE.md",
      summary: "Rollback removes BP-0205 source contract and tests.",
      current_state: "source_ref_only",
      execution_allowed: false,
    },
    {
      rollback_ref: "docs/architecture/PERSISTENCE_AND_POLICY_GATE_REVIEW.md",
      summary: "Gate review keeps live migration execution blocked.",
      current_state: "source_ref_only",
      execution_allowed: false,
    },
  ];

export const defaultMigrationArtifactStaticReviewStaticCheckRefs: MigrationArtifactStaticReviewStaticCheckRefInput[] =
  [
    staticCheckRef("GATE_ORDER_COVERAGE", "gate_order"),
    staticCheckRef("SCHEMA_ENTITY_COVERAGE", "schema_coverage"),
    staticCheckRef("MIGRATION_MANIFEST_REF_PRESENT", "manifest_ref"),
    staticCheckRef("SQL_ARTIFACT_REF_PRESENT_NO_CONTENT", "sql_ref"),
    staticCheckRef("ROLLBACK_REF_PRESENT", "rollback_ref"),
    staticCheckRef("FORBIDDEN_TOKEN_SCAN", "forbidden_token"),
    staticCheckRef("NO_CONNECTION_STRING", "no_connection"),
    staticCheckRef("NO_MIGRATION_RUNNER", "no_runner"),
    staticCheckRef("NO_SECRET_VALUE", "no_secret"),
  ];

export const defaultMigrationArtifactStaticReviewForbiddenTokenChecks =
  migrationArtifactStaticReviewForbiddenTokens.map(
    (token): MigrationArtifactStaticReviewForbiddenTokenCheckInput => ({
      token,
      token_kind: classifyForbiddenToken(token),
      action: "reject_if_present",
      current_state: "static_check_only",
    }),
  );

export function createMigrationArtifactStaticReview(
  request: MigrationArtifactStaticReviewRequest = {},
): MigrationArtifactStaticReviewResult {
  const normalized = normalizeRequest(request);

  if (!normalized.ok) {
    return {
      ok: false,
      migration_artifact_static_review: null,
      errors: normalized.errors,
      raw_input_content: "withheld",
      side_effects: [],
    };
  }

  return {
    ok: true,
    migration_artifact_static_review: {
      contract_id: migrationArtifactStaticReviewContract.contract_id,
      review_version: migrationArtifactStaticReviewContract.review_version,
      target_gate: migrationArtifactStaticReviewTargetGate,
      schema_contract_id: persistenceSchemaContract.contract_id,
      required_gate_ids: normalized.gate_sequence,
      required_entity_names: [...persistenceSchemaEntityNames],
      schema_entity_coverage: normalized.schema_entity_coverage,
      artifact_refs: normalized.artifact_refs,
      rollback_refs: normalized.rollback_refs,
      static_check_refs: normalized.static_check_refs,
      forbidden_token_checks: normalized.forbidden_token_checks,
      no_connection_posture: normalized.no_connection_posture,
      source_refs: normalized.source_refs,
      allowed_state: normalized.allowed_state,
      blocked_capabilities: [...migrationArtifactStaticReviewBlockedCapabilityFlags],
      implementation_artifacts: [],
      migration_execution_artifacts: [],
      database_connection_allowed: false,
      migration_execution_allowed: false,
      live_storage_allowed: false,
      live_execution_allowed: false,
      python_runtime_required: false,
      os_specific_binary_required: false,
      side_effects: [],
    },
    errors: [],
    side_effects: [],
  };
}

function artifactRef(
  artifactRefPath: string,
  artifactKind: MigrationArtifactStaticReviewArtifactKind,
  summary: string,
): MigrationArtifactStaticReviewArtifactRefInput {
  return {
    artifact_ref: artifactRefPath,
    artifact_kind: artifactKind,
    summary,
    current_state: "source_ref_only_no_sql_content",
    repo_local: true,
    contains_sql_content: false,
    connection_required: false,
    execution_allowed: false,
  };
}

function staticCheckRef(
  checkId: MigrationArtifactStaticReviewCheckId,
  checkKind: MigrationArtifactStaticReviewStaticCheckRefInput["check_kind"],
): MigrationArtifactStaticReviewStaticCheckRefInput {
  return {
    check_id: checkId,
    check_kind: checkKind,
    source_ref: "packages/packets/test/migration-artifact-static-review.test.ts",
    required_gate: migrationArtifactStaticReviewTargetGate,
    current_state: "source_ref_only",
    external_execution_allowed: false,
  };
}

function normalizeRequest(
  request: MigrationArtifactStaticReviewRequest,
): NormalizedMigrationArtifactStaticReviewRequest {
  if (!isPlainObject(request)) {
    return {
      ok: false,
      errors: [
        migrationStaticReviewError(
          "migration_artifact_static_review.invalid_request",
          "",
          "Migration artifact static review request must be an object.",
        ),
      ],
    };
  }

  const errors: MigrationArtifactStaticReviewError[] = [];

  for (const key of Object.keys(request)) {
    if (!requestKeys.has(key)) {
      errors.push(
        migrationStaticReviewError(
          "migration_artifact_static_review.unexpected_field",
          `/${key}`,
          "Unexpected migration artifact static review field.",
        ),
      );
    }
  }

  if (
    request.review_version !== undefined &&
    request.review_version !== migrationArtifactStaticReviewContract.review_version
  ) {
    errors.push(
      migrationStaticReviewError(
        "migration_artifact_static_review.invalid_version",
        "/review_version",
        "Migration artifact static review version is unsupported.",
      ),
    );
  }

  if (
    request.contract_authority !== undefined &&
    request.contract_authority !==
      migrationArtifactStaticReviewContract.contract_authority
  ) {
    errors.push(
      migrationStaticReviewError(
        "migration_artifact_static_review.unsafe_contract_authority",
        "/contract_authority",
        "Migration artifact static review authority must remain source-only.",
      ),
    );
  }

  for (const flag of migrationArtifactStaticReviewBlockedCapabilityFlags) {
    if (request[flag] !== undefined && request[flag] !== false) {
      errors.push(blockedCapabilityError(flag, `/${flag}`));
    }
  }

  validateSideEffects(request.side_effects, "/side_effects", errors);

  const gateSequence = normalizeGateSequence(
    request.gate_sequence ?? [...persistencePolicyGateIds],
    errors,
  );
  const schemaEntityCoverage = normalizeEntityCoverage(
    request.schema_entity_coverage ??
      defaultMigrationArtifactStaticReviewEntityCoverage,
    errors,
  );
  const artifactRefs = normalizeArtifactRefs(
    request.artifact_refs ?? defaultMigrationArtifactStaticReviewArtifactRefs,
    errors,
  );
  const rollbackRefs = normalizeRollbackRefs(
    request.rollback_refs ?? defaultMigrationArtifactStaticReviewRollbackRefs,
    errors,
  );
  const staticCheckRefs = normalizeStaticCheckRefs(
    request.static_check_refs ?? defaultMigrationArtifactStaticReviewStaticCheckRefs,
    errors,
  );
  const forbiddenTokenChecks = normalizeForbiddenTokenChecks(
    request.forbidden_token_checks ??
      defaultMigrationArtifactStaticReviewForbiddenTokenChecks,
    errors,
  );
  const noConnectionPosture = normalizeNoConnectionPosture(
    request.no_connection_posture ??
      defaultMigrationArtifactStaticReviewNoConnectionPosture,
    errors,
  );
  const sourceRefs = normalizeSourceRefs(
    request.source_refs ?? defaultSourceRefs,
    errors,
  );
  const allowedState = normalizeAllowedState(
    request.allowed_state ?? defaultMigrationArtifactStaticReviewAllowedState,
    errors,
  );

  if (
    errors.length > 0 ||
    gateSequence === null ||
    schemaEntityCoverage === null ||
    artifactRefs === null ||
    rollbackRefs === null ||
    staticCheckRefs === null ||
    forbiddenTokenChecks === null ||
    noConnectionPosture === null ||
    sourceRefs === null ||
    allowedState === null
  ) {
    return {
      ok: false,
      errors,
    };
  }

  return {
    ok: true,
    gate_sequence: gateSequence,
    schema_entity_coverage: schemaEntityCoverage,
    artifact_refs: artifactRefs,
    rollback_refs: rollbackRefs,
    static_check_refs: staticCheckRefs,
    forbidden_token_checks: forbiddenTokenChecks,
    no_connection_posture: noConnectionPosture,
    source_refs: sourceRefs,
    allowed_state: allowedState,
  };
}

function normalizeGateSequence(
  value: unknown,
  errors: MigrationArtifactStaticReviewError[],
): PersistencePolicyGateId[] | null {
  if (!Array.isArray(value)) {
    errors.push(
      migrationStaticReviewError(
        "migration_artifact_static_review.gate_sequence_required",
        "/gate_sequence",
        "Migration artifact static review requires the full persistence gate order.",
      ),
    );
    return null;
  }

  const normalized: PersistencePolicyGateId[] = [];
  const seen = new Set<string>();

  for (let index = 0; index < value.length; index += 1) {
    const rawGateId = value[index];
    if (!isPersistencePolicyGateId(rawGateId)) {
      errors.push(
        migrationStaticReviewError(
          "migration_artifact_static_review.gate_order_drift",
          `/gate_sequence/${index}`,
          "Persistence gate id is unsupported.",
        ),
      );
      continue;
    }
    if (seen.has(rawGateId) || persistencePolicyGateIds[index] !== rawGateId) {
      errors.push(
        migrationStaticReviewError(
          "migration_artifact_static_review.gate_order_drift",
          `/gate_sequence/${index}`,
          "Persistence gate order must match BP-0203.",
        ),
      );
    }
    seen.add(rawGateId);
    normalized.push(rawGateId);
  }

  for (const requiredGateId of persistencePolicyGateIds) {
    if (!seen.has(requiredGateId)) {
      errors.push(
        migrationStaticReviewError(
          "migration_artifact_static_review.gate_sequence_required",
          "/gate_sequence",
          "Migration artifact static review is missing a required gate id.",
        ),
      );
    }
  }

  return normalized;
}

function normalizeEntityCoverage(
  value: unknown,
  errors: MigrationArtifactStaticReviewError[],
): MigrationArtifactStaticReviewEntityCoverageInput[] | null {
  if (!Array.isArray(value)) {
    errors.push(
      migrationStaticReviewError(
        "migration_artifact_static_review.entity_coverage_required",
        "/schema_entity_coverage",
        "Migration artifact static review requires schema entity coverage.",
      ),
    );
    return null;
  }

  const normalized: MigrationArtifactStaticReviewEntityCoverageInput[] = [];
  const seen = new Set<string>();

  for (let index = 0; index < value.length; index += 1) {
    const rawCoverage = value[index];
    if (!isPlainObject(rawCoverage)) {
      errors.push(
        migrationStaticReviewError(
          "migration_artifact_static_review.entity_coverage_drift",
          `/schema_entity_coverage/${index}`,
          "Schema entity coverage must be an object.",
        ),
      );
      continue;
    }

    const entityName = rawCoverage.entity_name;
    if (!isPersistenceSchemaEntityName(entityName)) {
      errors.push(
        migrationStaticReviewError(
          "migration_artifact_static_review.entity_coverage_drift",
          `/schema_entity_coverage/${index}/entity_name`,
          "Schema entity coverage references an unsupported entity.",
        ),
      );
      continue;
    }

    if (seen.has(entityName) || persistenceSchemaEntityNames[index] !== entityName) {
      errors.push(
        migrationStaticReviewError(
          "migration_artifact_static_review.entity_coverage_drift",
          `/schema_entity_coverage/${index}/entity_name`,
          "Schema entity coverage must match BP-0204 entity order.",
        ),
      );
    }
    seen.add(entityName);

    const schemaContractRef = normalizeRepoRef(
      rawCoverage.schema_contract_ref,
      `/schema_entity_coverage/${index}/schema_contract_ref`,
      "migration_artifact_static_review.entity_coverage_drift",
      errors,
    );
    const migrationManifestRef = normalizeRepoRef(
      rawCoverage.migration_manifest_ref,
      `/schema_entity_coverage/${index}/migration_manifest_ref`,
      "migration_artifact_static_review.entity_coverage_drift",
      errors,
    );

    if (rawCoverage.coverage_state !== "covered_by_source_only_static_review") {
      errors.push(
        migrationStaticReviewError(
          "migration_artifact_static_review.entity_coverage_drift",
          `/schema_entity_coverage/${index}/coverage_state`,
          "Schema entity coverage must remain source-only static review.",
        ),
      );
    }
    if (rawCoverage.target_gate !== migrationArtifactStaticReviewTargetGate) {
      errors.push(
        migrationStaticReviewError(
          "migration_artifact_static_review.entity_coverage_drift",
          `/schema_entity_coverage/${index}/target_gate`,
          "Schema entity coverage must target G03 static review.",
        ),
      );
    }
    if (rawCoverage.live_storage_allowed !== false) {
      errors.push(
        blockedCapabilityError(
          "live_storage_allowed",
          `/schema_entity_coverage/${index}/live_storage_allowed`,
        ),
      );
    }

    if (
      schemaContractRef === null ||
      migrationManifestRef === null ||
      rawCoverage.coverage_state !== "covered_by_source_only_static_review" ||
      rawCoverage.target_gate !== migrationArtifactStaticReviewTargetGate ||
      rawCoverage.live_storage_allowed !== false
    ) {
      continue;
    }

    normalized.push({
      entity_name: entityName,
      schema_contract_ref: schemaContractRef,
      migration_manifest_ref: migrationManifestRef,
      coverage_state: "covered_by_source_only_static_review",
      target_gate: migrationArtifactStaticReviewTargetGate,
      live_storage_allowed: false,
    });
  }

  for (const requiredEntityName of persistenceSchemaEntityNames) {
    if (!seen.has(requiredEntityName)) {
      errors.push(
        migrationStaticReviewError(
          "migration_artifact_static_review.entity_coverage_required",
          "/schema_entity_coverage",
          "Migration artifact static review is missing required schema entity coverage.",
        ),
      );
    }
  }

  return normalized;
}

function normalizeArtifactRefs(
  value: unknown,
  errors: MigrationArtifactStaticReviewError[],
): MigrationArtifactStaticReviewArtifactRefInput[] | null {
  if (!Array.isArray(value)) {
    errors.push(
      migrationStaticReviewError(
        "migration_artifact_static_review.artifact_ref_required",
        "/artifact_refs",
        "Migration artifact static review requires artifact refs.",
      ),
    );
    return null;
  }

  const normalized: MigrationArtifactStaticReviewArtifactRefInput[] = [];
  const seenKinds = new Set<string>();

  for (let index = 0; index < value.length; index += 1) {
    const rawArtifact = value[index];
    if (!isPlainObject(rawArtifact)) {
      errors.push(
        migrationStaticReviewError(
          "migration_artifact_static_review.invalid_artifact_ref",
          `/artifact_refs/${index}`,
          "Migration artifact ref must be an object.",
        ),
      );
      continue;
    }

    const artifactKind = rawArtifact.artifact_kind;
    if (!isMigrationArtifactKind(artifactKind)) {
      errors.push(
        migrationStaticReviewError(
          "migration_artifact_static_review.invalid_artifact_ref",
          `/artifact_refs/${index}/artifact_kind`,
          "Migration artifact kind is unsupported.",
        ),
      );
      continue;
    }
    seenKinds.add(artifactKind);

    const artifactRefPath = normalizeRepoRef(
      rawArtifact.artifact_ref,
      `/artifact_refs/${index}/artifact_ref`,
      "migration_artifact_static_review.invalid_artifact_ref",
      errors,
    );
    const summary = normalizeSafeSummary(
      rawArtifact.summary,
      `/artifact_refs/${index}/summary`,
      "migration_artifact_static_review.invalid_artifact_ref",
      errors,
    );

    if (rawArtifact.current_state !== "source_ref_only_no_sql_content") {
      errors.push(
        migrationStaticReviewError(
          "migration_artifact_static_review.invalid_artifact_ref",
          `/artifact_refs/${index}/current_state`,
          "Migration artifact refs must remain source refs only.",
        ),
      );
    }
    if (rawArtifact.repo_local !== true) {
      errors.push(
        migrationStaticReviewError(
          "migration_artifact_static_review.invalid_artifact_ref",
          `/artifact_refs/${index}/repo_local`,
          "Migration artifact refs must be repo-local.",
        ),
      );
    }
    if (rawArtifact.contains_sql_content !== false) {
      errors.push(
        blockedCapabilityError(
          "sql_artifact_content_allowed",
          `/artifact_refs/${index}/contains_sql_content`,
        ),
      );
    }
    if (rawArtifact.connection_required !== false) {
      errors.push(
        blockedCapabilityError(
          "database_connection_allowed",
          `/artifact_refs/${index}/connection_required`,
        ),
      );
    }
    if (rawArtifact.execution_allowed !== false) {
      errors.push(
        blockedCapabilityError(
          "migration_execution_allowed",
          `/artifact_refs/${index}/execution_allowed`,
        ),
      );
    }

    if (
      artifactRefPath === null ||
      summary === null ||
      rawArtifact.current_state !== "source_ref_only_no_sql_content" ||
      rawArtifact.repo_local !== true ||
      rawArtifact.contains_sql_content !== false ||
      rawArtifact.connection_required !== false ||
      rawArtifact.execution_allowed !== false
    ) {
      continue;
    }

    normalized.push({
      artifact_ref: artifactRefPath,
      artifact_kind: artifactKind,
      summary,
      current_state: "source_ref_only_no_sql_content",
      repo_local: true,
      contains_sql_content: false,
      connection_required: false,
      execution_allowed: false,
    });
  }

  for (const requiredKind of migrationArtifactStaticReviewArtifactKinds) {
    if (!seenKinds.has(requiredKind)) {
      errors.push(
        migrationStaticReviewError(
          "migration_artifact_static_review.artifact_ref_required",
          "/artifact_refs",
          "Migration artifact static review is missing a required artifact kind.",
        ),
      );
    }
  }

  return normalized;
}

function normalizeRollbackRefs(
  value: unknown,
  errors: MigrationArtifactStaticReviewError[],
): MigrationArtifactStaticReviewRollbackRefInput[] | null {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push(
      migrationStaticReviewError(
        "migration_artifact_static_review.rollback_ref_required",
        "/rollback_refs",
        "Migration artifact static review requires rollback refs.",
      ),
    );
    return null;
  }

  const normalized: MigrationArtifactStaticReviewRollbackRefInput[] = [];

  for (let index = 0; index < value.length; index += 1) {
    const rawRollback = value[index];
    if (!isPlainObject(rawRollback)) {
      errors.push(
        migrationStaticReviewError(
          "migration_artifact_static_review.invalid_rollback_ref",
          `/rollback_refs/${index}`,
          "Rollback ref must be an object.",
        ),
      );
      continue;
    }

    const rollbackRef = normalizeRepoRef(
      rawRollback.rollback_ref,
      `/rollback_refs/${index}/rollback_ref`,
      "migration_artifact_static_review.invalid_rollback_ref",
      errors,
    );
    const summary = normalizeSafeSummary(
      rawRollback.summary,
      `/rollback_refs/${index}/summary`,
      "migration_artifact_static_review.invalid_rollback_ref",
      errors,
    );

    if (rawRollback.current_state !== "source_ref_only") {
      errors.push(
        migrationStaticReviewError(
          "migration_artifact_static_review.invalid_rollback_ref",
          `/rollback_refs/${index}/current_state`,
          "Rollback refs must remain source refs only.",
        ),
      );
    }
    if (rawRollback.execution_allowed !== false) {
      errors.push(
        blockedCapabilityError(
          "migration_execution_allowed",
          `/rollback_refs/${index}/execution_allowed`,
        ),
      );
    }

    if (
      rollbackRef === null ||
      summary === null ||
      rawRollback.current_state !== "source_ref_only" ||
      rawRollback.execution_allowed !== false
    ) {
      continue;
    }

    normalized.push({
      rollback_ref: rollbackRef,
      summary,
      current_state: "source_ref_only",
      execution_allowed: false,
    });
  }

  return normalized;
}

function normalizeStaticCheckRefs(
  value: unknown,
  errors: MigrationArtifactStaticReviewError[],
): MigrationArtifactStaticReviewStaticCheckRefInput[] | null {
  if (!Array.isArray(value)) {
    errors.push(
      migrationStaticReviewError(
        "migration_artifact_static_review.static_check_ref_required",
        "/static_check_refs",
        "Migration artifact static review requires static check refs.",
      ),
    );
    return null;
  }

  const normalized: MigrationArtifactStaticReviewStaticCheckRefInput[] = [];
  const seen = new Set<string>();

  for (let index = 0; index < value.length; index += 1) {
    const rawCheck = value[index];
    if (!isPlainObject(rawCheck)) {
      errors.push(
        migrationStaticReviewError(
          "migration_artifact_static_review.invalid_static_check_ref",
          `/static_check_refs/${index}`,
          "Static check ref must be an object.",
        ),
      );
      continue;
    }

    const checkId = rawCheck.check_id;
    if (!isStaticCheckId(checkId)) {
      errors.push(
        migrationStaticReviewError(
          "migration_artifact_static_review.invalid_static_check_ref",
          `/static_check_refs/${index}/check_id`,
          "Static check id is unsupported.",
        ),
      );
      continue;
    }

    if (seen.has(checkId) || migrationArtifactStaticReviewCheckIds[index] !== checkId) {
      errors.push(
        migrationStaticReviewError(
          "migration_artifact_static_review.static_check_ref_required",
          `/static_check_refs/${index}/check_id`,
          "Static check refs must preserve required order.",
        ),
      );
    }
    seen.add(checkId);

    const sourceRef = normalizeRepoRef(
      rawCheck.source_ref,
      `/static_check_refs/${index}/source_ref`,
      "migration_artifact_static_review.invalid_static_check_ref",
      errors,
    );

    if (rawCheck.required_gate !== migrationArtifactStaticReviewTargetGate) {
      errors.push(
        migrationStaticReviewError(
          "migration_artifact_static_review.invalid_static_check_ref",
          `/static_check_refs/${index}/required_gate`,
          "Static check ref must target G03.",
        ),
      );
    }
    if (rawCheck.current_state !== "source_ref_only") {
      errors.push(
        migrationStaticReviewError(
          "migration_artifact_static_review.invalid_static_check_ref",
          `/static_check_refs/${index}/current_state`,
          "Static check refs must remain source refs only.",
        ),
      );
    }
    if (rawCheck.external_execution_allowed !== false) {
      errors.push(
        blockedCapabilityError(
          "external_service_call_allowed",
          `/static_check_refs/${index}/external_execution_allowed`,
        ),
      );
    }

    const checkKind = rawCheck.check_kind;
    if (!isStaticCheckKind(checkKind)) {
      errors.push(
        migrationStaticReviewError(
          "migration_artifact_static_review.invalid_static_check_ref",
          `/static_check_refs/${index}/check_kind`,
          "Static check kind is unsupported.",
        ),
      );
      continue;
    }

    if (
      sourceRef === null ||
      rawCheck.required_gate !== migrationArtifactStaticReviewTargetGate ||
      rawCheck.current_state !== "source_ref_only" ||
      rawCheck.external_execution_allowed !== false
    ) {
      continue;
    }

    normalized.push({
      check_id: checkId,
      check_kind: checkKind,
      source_ref: sourceRef,
      required_gate: migrationArtifactStaticReviewTargetGate,
      current_state: "source_ref_only",
      external_execution_allowed: false,
    });
  }

  for (const requiredCheckId of migrationArtifactStaticReviewCheckIds) {
    if (!seen.has(requiredCheckId)) {
      errors.push(
        migrationStaticReviewError(
          "migration_artifact_static_review.static_check_ref_required",
          "/static_check_refs",
          "Migration artifact static review is missing a required static check ref.",
        ),
      );
    }
  }

  return normalized;
}

function normalizeForbiddenTokenChecks(
  value: unknown,
  errors: MigrationArtifactStaticReviewError[],
): MigrationArtifactStaticReviewForbiddenTokenCheckInput[] | null {
  if (!Array.isArray(value)) {
    errors.push(
      migrationStaticReviewError(
        "migration_artifact_static_review.forbidden_token_check_required",
        "/forbidden_token_checks",
        "Migration artifact static review requires forbidden token checks.",
      ),
    );
    return null;
  }

  const normalized: MigrationArtifactStaticReviewForbiddenTokenCheckInput[] = [];
  const seen = new Set<string>();

  for (let index = 0; index < value.length; index += 1) {
    const rawCheck = value[index];
    if (!isPlainObject(rawCheck)) {
      errors.push(
        migrationStaticReviewError(
          "migration_artifact_static_review.invalid_forbidden_token_check",
          `/forbidden_token_checks/${index}`,
          "Forbidden token check must be an object.",
        ),
      );
      continue;
    }

    const token = rawCheck.token;
    if (!isForbiddenToken(token)) {
      errors.push(
        migrationStaticReviewError(
          "migration_artifact_static_review.invalid_forbidden_token_check",
          `/forbidden_token_checks/${index}/token`,
          "Forbidden token check references an unsupported token.",
        ),
      );
      continue;
    }

    if (
      seen.has(token) ||
      migrationArtifactStaticReviewForbiddenTokens[index] !== token
    ) {
      errors.push(
        migrationStaticReviewError(
          "migration_artifact_static_review.forbidden_token_check_required",
          `/forbidden_token_checks/${index}/token`,
          "Forbidden token checks must preserve required order.",
        ),
      );
    }
    seen.add(token);

    if (rawCheck.token_kind !== classifyForbiddenToken(token)) {
      errors.push(
        migrationStaticReviewError(
          "migration_artifact_static_review.invalid_forbidden_token_check",
          `/forbidden_token_checks/${index}/token_kind`,
          "Forbidden token kind does not match token classification.",
        ),
      );
    }
    if (rawCheck.action !== "reject_if_present") {
      errors.push(
        migrationStaticReviewError(
          "migration_artifact_static_review.invalid_forbidden_token_check",
          `/forbidden_token_checks/${index}/action`,
          "Forbidden token checks must reject matching content.",
        ),
      );
    }
    if (rawCheck.current_state !== "static_check_only") {
      errors.push(
        migrationStaticReviewError(
          "migration_artifact_static_review.invalid_forbidden_token_check",
          `/forbidden_token_checks/${index}/current_state`,
          "Forbidden token checks must remain static-check-only.",
        ),
      );
    }

    if (
      rawCheck.token_kind !== classifyForbiddenToken(token) ||
      rawCheck.action !== "reject_if_present" ||
      rawCheck.current_state !== "static_check_only"
    ) {
      continue;
    }

    normalized.push({
      token,
      token_kind: classifyForbiddenToken(token),
      action: "reject_if_present",
      current_state: "static_check_only",
    });
  }

  for (const requiredToken of migrationArtifactStaticReviewForbiddenTokens) {
    if (!seen.has(requiredToken)) {
      errors.push(
        migrationStaticReviewError(
          "migration_artifact_static_review.forbidden_token_check_required",
          "/forbidden_token_checks",
          "Migration artifact static review is missing a required forbidden token check.",
        ),
      );
    }
  }

  return normalized;
}

function normalizeNoConnectionPosture(
  value: unknown,
  errors: MigrationArtifactStaticReviewError[],
): MigrationArtifactStaticReviewNoConnectionPostureInput | null {
  if (!isPlainObject(value)) {
    errors.push(
      migrationStaticReviewError(
        "migration_artifact_static_review.no_connection_posture_required",
        "/no_connection_posture",
        "Migration artifact static review requires no-connection posture.",
      ),
    );
    return null;
  }

  const expected = defaultMigrationArtifactStaticReviewNoConnectionPosture;
  for (const key of Object.keys(expected) as Array<keyof typeof expected>) {
    if (value[key] !== expected[key]) {
      errors.push(
        noConnectionPostureError(key, `/no_connection_posture/${String(key)}`),
      );
    }
  }

  return errors.length > 0
    ? null
    : {
        ...defaultMigrationArtifactStaticReviewNoConnectionPosture,
      };
}

function normalizeSourceRefs(
  value: unknown,
  errors: MigrationArtifactStaticReviewError[],
): string[] | null {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push(
      migrationStaticReviewError(
        "migration_artifact_static_review.source_ref_required",
        "/source_refs",
        "Migration artifact static review requires source refs.",
      ),
    );
    return null;
  }

  const normalized: string[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const rawSource = value[index];
    if (!isPlainObject(rawSource)) {
      errors.push(
        migrationStaticReviewError(
          "migration_artifact_static_review.invalid_source_ref",
          `/source_refs/${index}`,
          "Source ref must be an object.",
        ),
      );
      continue;
    }

    const sourceRef = normalizeRepoRef(
      rawSource.source_ref,
      `/source_refs/${index}/source_ref`,
      "migration_artifact_static_review.invalid_source_ref",
      errors,
    );
    normalizeSafeSummary(
      rawSource.summary,
      `/source_refs/${index}/summary`,
      "migration_artifact_static_review.invalid_source_ref",
      errors,
    );

    if (sourceRef !== null) {
      normalized.push(sourceRef);
    }
  }

  return normalized;
}

function normalizeAllowedState(
  value: unknown,
  errors: MigrationArtifactStaticReviewError[],
): MigrationArtifactStaticReviewAllowedStateInput | null {
  if (!isPlainObject(value)) {
    errors.push(
      migrationStaticReviewError(
        "migration_artifact_static_review.allowed_state_required",
        "/allowed_state",
        "Migration artifact static review requires allowed state evidence.",
      ),
    );
    return null;
  }

  const expected = defaultMigrationArtifactStaticReviewAllowedState;
  for (const key of Object.keys(expected) as Array<keyof typeof expected>) {
    if (value[key] !== expected[key]) {
      if (
        key === "live_execution_allowed" ||
        key === "live_storage_allowed" ||
        key === "live_sql_execution_allowed"
      ) {
        errors.push(blockedCapabilityError(key, `/allowed_state/${String(key)}`));
        continue;
      }
      if (key === "python_runtime_required") {
        errors.push(
          blockedCapabilityError(key, "/allowed_state/python_runtime_required"),
        );
        continue;
      }
      if (key === "os_specific_binary_required") {
        errors.push(
          blockedCapabilityError(key, "/allowed_state/os_specific_binary_required"),
        );
        continue;
      }
      if (key === "secret_posture") {
        errors.push(
          migrationStaticReviewError(
            "migration_artifact_static_review.secret_value_forbidden",
            "/allowed_state/secret_posture",
            "Migration artifact static review allows secret references only.",
          ),
        );
        continue;
      }
      errors.push(
        migrationStaticReviewError(
          "migration_artifact_static_review.allowed_state_drift",
          `/allowed_state/${String(key)}`,
          "Migration artifact static review allowed state drifted from source-only posture.",
        ),
      );
    }
  }

  return errors.length > 0
    ? null
    : {
        ...defaultMigrationArtifactStaticReviewAllowedState,
      };
}

function normalizeRepoRef(
  value: unknown,
  path: string,
  code: MigrationArtifactStaticReviewErrorCode,
  errors: MigrationArtifactStaticReviewError[],
): string | null {
  if (typeof value !== "string" || value.trim().length === 0) {
    errors.push(
      migrationStaticReviewError(
        code,
        path,
        "Migration artifact static review references must be nonempty strings.",
      ),
    );
    return null;
  }

  const trimmedValue = value.trim();
  if (!isRepoLocalPath(trimmedValue)) {
    errors.push(
      migrationStaticReviewError(
        code,
        path,
        "Migration artifact static review references must be repo-local paths.",
      ),
    );
    return null;
  }

  validateUnsafeString(trimmedValue, path, errors);
  return trimmedValue;
}

function normalizeSafeSummary(
  value: unknown,
  path: string,
  code: MigrationArtifactStaticReviewErrorCode,
  errors: MigrationArtifactStaticReviewError[],
): string | null {
  if (typeof value !== "string" || value.trim().length === 0) {
    errors.push(
      migrationStaticReviewError(
        code,
        path,
        "Migration artifact static review summaries must be nonempty strings.",
      ),
    );
    return null;
  }

  const trimmedValue = value.trim();
  validateUnsafeString(trimmedValue, path, errors);
  return trimmedValue;
}

function validateUnsafeString(
  value: string,
  path: string,
  errors: MigrationArtifactStaticReviewError[],
): void {
  const lowerValue = value.toLowerCase();
  if (
    lowerValue.includes("postgres://") ||
    lowerValue.includes("postgresql://") ||
    lowerValue.includes("mysql://") ||
    lowerValue.includes("sqlite://") ||
    lowerValue.includes("database_url") ||
    lowerValue.includes("connection_string")
  ) {
    errors.push(
      migrationStaticReviewError(
        "migration_artifact_static_review.connection_string_forbidden",
        path,
        "Migration artifact static review cannot contain connection strings.",
      ),
    );
  }
  if (
    lowerValue.includes("password=") ||
    lowerValue.includes("api_key") ||
    lowerValue.includes("secret-token")
  ) {
    errors.push(
      migrationStaticReviewError(
        "migration_artifact_static_review.secret_value_forbidden",
        path,
        "Migration artifact static review cannot contain secret-like values.",
      ),
    );
  }
  if (
    lowerValue.includes("psql ") ||
    lowerValue.includes("prisma migrate deploy") ||
    lowerValue.includes("drizzle-kit migrate") ||
    lowerValue.includes("typeorm migration:run") ||
    lowerValue.includes("dbmate up") ||
    lowerValue.includes("supabase db push")
  ) {
    errors.push(
      migrationStaticReviewError(
        "migration_artifact_static_review.migration_runner_forbidden",
        path,
        "Migration artifact static review cannot contain migration runner commands.",
      ),
    );
  }
}

function validateSideEffects(
  value: unknown,
  path: string,
  errors: MigrationArtifactStaticReviewError[],
): void {
  if (value !== undefined && (!Array.isArray(value) || value.length !== 0)) {
    errors.push(
      migrationStaticReviewError(
        "migration_artifact_static_review.side_effects_forbidden",
        path,
        "Migration artifact static review must not declare side effects.",
      ),
    );
  }
}

function noConnectionPostureError(
  key: keyof MigrationArtifactStaticReviewNoConnectionPostureInput,
  path: string,
): MigrationArtifactStaticReviewError {
  if (key === "database_url_allowed" || key === "connection_string_allowed") {
    return migrationStaticReviewError(
      "migration_artifact_static_review.connection_string_forbidden",
      path,
      "Migration artifact static review forbids database URLs and connection strings.",
    );
  }
  if (key === "migration_runner_allowed" || key === "migration_execution_allowed") {
    return migrationStaticReviewError(
      "migration_artifact_static_review.migration_runner_forbidden",
      path,
      "Migration artifact static review forbids migration runners and execution.",
    );
  }
  return blockedCapabilityError(key, path);
}

function blockedCapabilityError(
  flag: string,
  path: string,
): MigrationArtifactStaticReviewError {
  if (
    flag === "live_execution_allowed" ||
    flag === "live_storage_allowed" ||
    flag === "live_sql_execution_allowed"
  ) {
    return migrationStaticReviewError(
      "migration_artifact_static_review.live_execution_forbidden",
      path,
      "Migration artifact static review must not allow live execution.",
    );
  }
  if (flag === "python_runtime_required") {
    return migrationStaticReviewError(
      "migration_artifact_static_review.python_runtime_requirement_forbidden",
      path,
      "Migration artifact static review must not require Python runtime.",
    );
  }
  if (flag === "os_specific_binary_required") {
    return migrationStaticReviewError(
      "migration_artifact_static_review.os_specific_binary_requirement_forbidden",
      path,
      "Migration artifact static review must not require OS-specific binaries.",
    );
  }
  if (
    flag === "database_url_allowed" ||
    flag === "connection_string_allowed" ||
    flag === "database_connection_allowed"
  ) {
    return migrationStaticReviewError(
      "migration_artifact_static_review.connection_string_forbidden",
      path,
      "Migration artifact static review must not allow database connections.",
    );
  }
  if (
    flag === "migration_execution_allowed" ||
    flag === "migration_runner_allowed" ||
    flag === "schema_migration_runner_allowed" ||
    flag === "migration_artifact_execution_allowed" ||
    flag === "migration_manifest_execution_allowed"
  ) {
    return migrationStaticReviewError(
      "migration_artifact_static_review.migration_runner_forbidden",
      path,
      "Migration artifact static review must not allow migration execution.",
    );
  }
  return migrationStaticReviewError(
    "migration_artifact_static_review.blocked_capability_forbidden",
    path,
    "Migration artifact static review blocked capability must remain false.",
  );
}

function migrationStaticReviewError(
  code: MigrationArtifactStaticReviewErrorCode,
  path: string,
  message: string,
): MigrationArtifactStaticReviewError {
  return {
    code,
    path,
    message,
    severity: "error",
  };
}

function classifyForbiddenToken(
  token: MigrationArtifactStaticReviewForbiddenToken,
): MigrationArtifactStaticReviewForbiddenTokenCheckInput["token_kind"] {
  if (token === "DATABASE_URL") {
    return "database_url";
  }
  if (
    token === "postgres://" ||
    token === "postgresql://" ||
    token === "mysql://" ||
    token === "sqlite://" ||
    token === "connection_string"
  ) {
    return "connection_string";
  }
  if (token === "password=" || token === "api_key" || token === "secret-token") {
    return "secret_value";
  }
  return "migration_runner";
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isRepoLocalPath(value: string): boolean {
  return (
    !value.startsWith("/") &&
    !value.includes("..") &&
    !value.includes("://") &&
    !value.includes("\0")
  );
}

function isPersistencePolicyGateId(value: unknown): value is PersistencePolicyGateId {
  return typeof value === "string" && gateIdSet.has(value);
}

function isPersistenceSchemaEntityName(
  value: unknown,
): value is PersistenceSchemaEntityName {
  return typeof value === "string" && entityNameSet.has(value);
}

function isMigrationArtifactKind(
  value: unknown,
): value is MigrationArtifactStaticReviewArtifactKind {
  return typeof value === "string" && artifactKindSet.has(value);
}

function isStaticCheckId(
  value: unknown,
): value is MigrationArtifactStaticReviewCheckId {
  return typeof value === "string" && staticCheckIdSet.has(value);
}

function isStaticCheckKind(
  value: unknown,
): value is MigrationArtifactStaticReviewStaticCheckRefInput["check_kind"] {
  return (
    value === "gate_order" ||
    value === "schema_coverage" ||
    value === "manifest_ref" ||
    value === "sql_ref" ||
    value === "rollback_ref" ||
    value === "forbidden_token" ||
    value === "no_connection" ||
    value === "no_runner" ||
    value === "no_secret"
  );
}

function isForbiddenToken(
  value: unknown,
): value is MigrationArtifactStaticReviewForbiddenToken {
  return typeof value === "string" && forbiddenTokenSet.has(value);
}
