import {
  persistencePolicyBlockedCapabilityFlags,
  type PersistencePolicyBlockedCapabilityFlag,
} from "./persistence-policy-gate.js";

export const PERSISTENCE_SCHEMA_CONTRACT_STATUS = "source_only";

export const persistenceSchemaEntityNames = [
  "knowledge_sources",
  "knowledge_source_refs",
  "knowledge_source_snapshots",
  "knowledge_records",
  "knowledge_record_source_refs",
  "knowledge_record_tags",
  "knowledge_chunks",
  "knowledge_context_bundles",
  "knowledge_context_bundle_records",
  "knowledge_citation_refs",
  "knowledge_eval_runs",
  "knowledge_eval_question_results",
  "knowledge_embeddings",
  "audit_events",
  "approval_requests",
  "agent_sessions",
  "packet_runs",
  "auth_identity_descriptors",
  "auth_session_descriptors",
  "integration_descriptors",
  "authorization_role_bindings",
] as const;

export const persistenceSchemaRetentionClasses = [
  "build_state",
  "source_snapshot",
  "audit_hot",
  "approval_preview",
  "eval_evidence",
  "embedding_cache",
  "auth_integration_reference",
] as const;

export const persistenceSchemaTenantProjectScopeModes = [
  "direct",
  "inherited",
  "approved_equivalent_required",
] as const;

export const persistenceSchemaRoleBoundaryRefs = [
  "reader_select_scoped",
  "writer_append_only",
  "migration_approval_only",
  "gateway_policy_boundary",
  "approval_reviewer_boundary",
  "deployment_owner_auth_integration",
  "runtime_blocked_boundary",
] as const;

export const persistenceSchemaMigrationReadinessRefs = [
  "G02_SCHEMA_CONTRACT",
  "G03_MIGRATION_ARTIFACT_STATIC",
  "G04_WRITER_PREFLIGHT",
  "G05_DATABASE_SECURITY",
  "G06_POLICY_GATE",
  "G07_APPROVAL_REQUEST",
  "G08_PERSISTENCE_READINESS",
  "G09_IMPLEMENTATION_PACKET",
  "BP-0039_POLICY_DECISION",
  "BP-0040_APPROVAL_REQUEST",
  "BP-0071_READINESS_GATE",
  "BP-0077_SCOPE_REQUEST",
  "BP-0080_SCOPE_METADATA",
] as const;

export const persistenceSchemaAdditionalBlockedCapabilityFlags = [
  "schema_sql_artifact_allowed",
  "database_url_allowed",
  "connection_string_allowed",
  "live_storage_allowed",
  "embedding_generation_allowed",
  "schema_migration_runner_allowed",
] as const;

export const persistenceSchemaBlockedCapabilityFlags = [
  ...persistencePolicyBlockedCapabilityFlags,
  ...persistenceSchemaAdditionalBlockedCapabilityFlags,
] as const;

export const persistenceSchemaContract = {
  contract_id: "lnsat.platform.persistence_schema_contract.v0_1",
  authority: ["@lnsat/packets", "source-backed-persistence-schema-contract"],
  schema_version: "0.1",
  source_docs: [
    "docs/architecture/PERSISTENCE_SCHEMA_PLAN.md",
    "docs/architecture/PERSISTENCE_AND_POLICY_GATE_REVIEW.md",
    "docs/architecture/AUTH_AND_INTEGRATION_POSTURE.md",
    "docs/architecture/DATA_MODEL.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
  ],
  entity_names: persistenceSchemaEntityNames,
  retention_classes: persistenceSchemaRetentionClasses,
  tenant_project_scope_modes: persistenceSchemaTenantProjectScopeModes,
  role_boundary_refs: persistenceSchemaRoleBoundaryRefs,
  migration_readiness_refs: persistenceSchemaMigrationReadinessRefs,
  blocked_capability_flags: persistenceSchemaBlockedCapabilityFlags,
  contract_authority: "source_only_schema_contract_no_db_no_migration",
  source_only_contract_allowed: true,
  schema_sql_artifact_allowed: false,
  database_connection_allowed: false,
  database_write_allowed: false,
  migration_execution_allowed: false,
  writer_implementation_allowed: false,
  auth_session_runtime_allowed: false,
  integration_setup_write_allowed: false,
  runtime_adapter_implementation_allowed: false,
  os_connector_package_allowed: false,
  live_storage_allowed: false,
  live_execution_allowed: false,
  python_runtime_required: false,
  os_specific_binary_required: false,
  side_effects: [],
  status: "source_only",
} as const;

export type PersistenceSchemaEntityName = (typeof persistenceSchemaEntityNames)[number];
export type PersistenceSchemaRetentionClass =
  (typeof persistenceSchemaRetentionClasses)[number];
export type PersistenceSchemaTenantProjectScopeMode =
  (typeof persistenceSchemaTenantProjectScopeModes)[number];
export type PersistenceSchemaRoleBoundaryRef =
  (typeof persistenceSchemaRoleBoundaryRefs)[number];
export type PersistenceSchemaMigrationReadinessRef =
  (typeof persistenceSchemaMigrationReadinessRefs)[number];
export type PersistenceSchemaAdditionalBlockedCapabilityFlag =
  (typeof persistenceSchemaAdditionalBlockedCapabilityFlags)[number];
export type PersistenceSchemaBlockedCapabilityFlag =
  | PersistencePolicyBlockedCapabilityFlag
  | PersistenceSchemaAdditionalBlockedCapabilityFlag;

export type PersistenceSchemaSourceRefInput = {
  source_ref: string;
  summary: string;
};

export type PersistenceSchemaEntityInput = {
  entity_name: PersistenceSchemaEntityName;
  field_names: string[];
  source_refs: string[];
  tenant_project_scope: PersistenceSchemaTenantProjectScopeMode;
  retention_class: PersistenceSchemaRetentionClass;
  role_boundary_refs: PersistenceSchemaRoleBoundaryRef[];
  migration_readiness_refs: PersistenceSchemaMigrationReadinessRef[];
  current_state: "source_contract_only";
  live_storage_allowed: false;
};

export type PersistenceSchemaAllowedStateInput = {
  source_only_contract_allowed: true;
  schema_sql_artifact_allowed: false;
  database_connection_allowed: false;
  database_write_allowed: false;
  migration_execution_allowed: false;
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

export type PersistenceSchemaContractRequest = Partial<
  Record<PersistenceSchemaBlockedCapabilityFlag, false>
> & {
  schema_version?: typeof persistenceSchemaContract.schema_version;
  entities?: PersistenceSchemaEntityInput[];
  source_refs?: PersistenceSchemaSourceRefInput[];
  retention_classes?: PersistenceSchemaRetentionClass[];
  role_boundary_refs?: PersistenceSchemaRoleBoundaryRef[];
  migration_readiness_refs?: PersistenceSchemaMigrationReadinessRef[];
  allowed_state?: PersistenceSchemaAllowedStateInput;
  contract_authority?: typeof persistenceSchemaContract.contract_authority;
  side_effects?: [];
};

export type PersistenceSchemaContractErrorCode =
  | "persistence_schema_contract.invalid_request"
  | "persistence_schema_contract.unexpected_field"
  | "persistence_schema_contract.invalid_version"
  | "persistence_schema_contract.entity_required"
  | "persistence_schema_contract.entity_set_drift"
  | "persistence_schema_contract.invalid_entity"
  | "persistence_schema_contract.field_evidence_required"
  | "persistence_schema_contract.invalid_field"
  | "persistence_schema_contract.source_ref_required"
  | "persistence_schema_contract.invalid_source_ref"
  | "persistence_schema_contract.retention_class_required"
  | "persistence_schema_contract.role_boundary_ref_required"
  | "persistence_schema_contract.migration_readiness_ref_required"
  | "persistence_schema_contract.allowed_state_required"
  | "persistence_schema_contract.allowed_state_drift"
  | "persistence_schema_contract.unsafe_contract_authority"
  | "persistence_schema_contract.secret_value_forbidden"
  | "persistence_schema_contract.blocked_capability_forbidden"
  | "persistence_schema_contract.live_execution_forbidden"
  | "persistence_schema_contract.python_runtime_requirement_forbidden"
  | "persistence_schema_contract.os_specific_binary_requirement_forbidden"
  | "persistence_schema_contract.side_effects_forbidden";

export type PersistenceSchemaContractError = {
  code: PersistenceSchemaContractErrorCode;
  path: string;
  message: string;
  severity: "error";
};

export type PersistenceSchemaEntityEvidence = PersistenceSchemaEntityInput;

export type PersistenceSchemaContractEvidence = {
  contract_id: typeof persistenceSchemaContract.contract_id;
  schema_version: typeof persistenceSchemaContract.schema_version;
  required_entity_names: PersistenceSchemaEntityName[];
  entities: PersistenceSchemaEntityEvidence[];
  source_refs: string[];
  retention_classes: PersistenceSchemaRetentionClass[];
  role_boundary_refs: PersistenceSchemaRoleBoundaryRef[];
  migration_readiness_refs: PersistenceSchemaMigrationReadinessRef[];
  allowed_state: PersistenceSchemaAllowedStateInput;
  blocked_capabilities: PersistenceSchemaBlockedCapabilityFlag[];
  implementation_artifacts: [];
  migration_artifacts: [];
  live_storage_allowed: false;
  live_execution_allowed: false;
  python_runtime_required: false;
  os_specific_binary_required: false;
  side_effects: [];
};

export type PersistenceSchemaContractResult =
  | {
      ok: true;
      persistence_schema_contract: PersistenceSchemaContractEvidence;
      errors: [];
      side_effects: [];
    }
  | {
      ok: false;
      persistence_schema_contract: null;
      errors: PersistenceSchemaContractError[];
      raw_input_content: "withheld";
      side_effects: [];
    };

type NormalizedPersistenceSchemaContractRequest =
  | {
      ok: true;
      entities: PersistenceSchemaEntityEvidence[];
      source_refs: string[];
      retention_classes: PersistenceSchemaRetentionClass[];
      role_boundary_refs: PersistenceSchemaRoleBoundaryRef[];
      migration_readiness_refs: PersistenceSchemaMigrationReadinessRef[];
      allowed_state: PersistenceSchemaAllowedStateInput;
    }
  | {
      ok: false;
      errors: PersistenceSchemaContractError[];
    };

const requestKeys = new Set([
  "schema_version",
  "entities",
  "source_refs",
  "retention_classes",
  "role_boundary_refs",
  "migration_readiness_refs",
  "allowed_state",
  "contract_authority",
  "side_effects",
  ...persistenceSchemaBlockedCapabilityFlags,
]);

const entityNameSet = new Set<string>(persistenceSchemaEntityNames);
const retentionClassSet = new Set<string>(persistenceSchemaRetentionClasses);
const tenantProjectScopeSet = new Set<string>(persistenceSchemaTenantProjectScopeModes);
const roleBoundaryRefSet = new Set<string>(persistenceSchemaRoleBoundaryRefs);
const migrationReadinessRefSet = new Set<string>(
  persistenceSchemaMigrationReadinessRefs,
);

const defaultSourceRefs: PersistenceSchemaSourceRefInput[] = [
  {
    source_ref: "docs/architecture/PERSISTENCE_SCHEMA_PLAN.md",
    summary: "BP-0189 future persistence schema targets and retention plan.",
  },
  {
    source_ref: "docs/architecture/PERSISTENCE_AND_POLICY_GATE_REVIEW.md",
    summary: "BP-0202 gate sequence for schema, migration, writer, and live scope.",
  },
  {
    source_ref: "docs/architecture/AUTH_AND_INTEGRATION_POSTURE.md",
    summary: "Deployment-owner auth and integration descriptor posture.",
  },
  {
    source_ref: "docs/architecture/DATA_MODEL.md",
    summary: "Existing data model and audit relationship architecture.",
  },
  {
    source_ref: "docs/reference/CONTRACT_PROVENANCE.md",
    summary: "Completed persistence schema plan packet.",
  },
  {
    source_ref: "docs/reference/CONTRACT_PROVENANCE.md",
    summary: "Completed persistence gate contract packet.",
  },
  {
    source_ref: "docs/reference/CONTRACT_PROVENANCE.md",
    summary: "Source-only persistence schema contract packet.",
  },
];

export const defaultPersistenceSchemaAllowedState: PersistenceSchemaAllowedStateInput =
  {
    source_only_contract_allowed: true,
    schema_sql_artifact_allowed: false,
    database_connection_allowed: false,
    database_write_allowed: false,
    migration_execution_allowed: false,
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

const planRefs = ["docs/architecture/PERSISTENCE_SCHEMA_PLAN.md"];
const authRefs = ["docs/architecture/AUTH_AND_INTEGRATION_POSTURE.md"];
const gateRefs = ["docs/architecture/PERSISTENCE_AND_POLICY_GATE_REVIEW.md"];

export const defaultPersistenceSchemaEntities: PersistenceSchemaEntityInput[] = [
  entity("knowledge_sources", [
    "source_id",
    "tenant_id",
    "project_id",
    "source_kind",
    "path",
    "title",
    "owner_ref",
    "trust_level",
    "freshness",
    "allowlisted",
    "indexed_at",
    "source_mode",
    "created_at",
  ]),
  entity("knowledge_source_refs", [
    "source_ref_id",
    "source_id",
    "path",
    "heading",
    "line_start",
    "line_end",
    "content_hash",
    "commit_ref",
    "created_at",
  ]),
  entity("knowledge_source_snapshots", [
    "snapshot_id",
    "source_id",
    "path",
    "content_hash",
    "content_digest",
    "byte_size",
    "snapshot_kind",
    "snapshot_status",
    "captured_at",
    "retention_class",
    "source_ref_count",
  ]),
  entity("knowledge_records", [
    "record_id",
    "source_id",
    "source_kind",
    "source_path",
    "title",
    "summary",
    "excerpt_source_ref_id",
    "stale_status",
    "conflict_status",
    "last_indexed_at",
    "created_at",
  ]),
  entity("knowledge_record_source_refs", [
    "record_id",
    "source_ref_id",
    "relevance",
    "created_at",
  ]),
  entity("knowledge_record_tags", ["record_id", "tag_kind", "tag_value", "created_at"]),
  entity("knowledge_chunks", [
    "chunk_id",
    "record_id",
    "source_ref_id",
    "source_path",
    "file_kind",
    "title",
    "heading",
    "normalized_text_digest",
    "token_estimate",
    "created_at",
  ]),
  entity("knowledge_context_bundles", [
    "bundle_id",
    "objective",
    "created_at",
    "token_budget",
    "token_estimate",
    "stale_warnings",
    "conflict_warnings",
    "risk_flags",
    "side_effects_json",
  ]),
  entity("knowledge_context_bundle_records", [
    "bundle_id",
    "record_id",
    "relevance",
    "token_estimate",
    "created_at",
  ]),
  entity("knowledge_citation_refs", [
    "citation_id",
    "record_id",
    "source_ref_id",
    "summary",
    "created_at",
  ]),
  entity("knowledge_eval_runs", [
    "eval_run_id",
    "contract_id",
    "eval_version",
    "evaluated_at",
    "question_count",
    "passed_question_count",
    "failed_question_count",
    "constraints_json",
    "side_effects_json",
  ]),
  entity("knowledge_eval_question_results", [
    "eval_run_id",
    "question_id",
    "category",
    "passed",
    "retrieved_source_paths",
    "expected_source_paths",
    "missing_source_paths",
    "citation_count",
    "error_codes",
  ]),
  entity(
    "knowledge_embeddings",
    [
      "embedding_id",
      "record_id",
      "chunk_id",
      "source_ref_id",
      "embedding_model_ref",
      "embedding_version",
      "vector_dim",
      "vector",
      "text_digest",
      "created_at",
      "retention_class",
    ],
    "embedding_cache",
    ["reader_select_scoped", "runtime_blocked_boundary"],
    ["G02_SCHEMA_CONTRACT", "G06_POLICY_GATE", "G08_PERSISTENCE_READINESS"],
  ),
  entity(
    "audit_events",
    [
      "event_id",
      "tenant_id",
      "project_id",
      "idempotency_key",
      "event_type",
      "event_class",
      "actor_ref",
      "target_ref",
      "source_refs_json",
      "policy_ref",
      "approval_ref",
      "packet_id",
      "packet_run_id",
      "result_class",
      "result_digest",
      "retention_class",
      "occurred_at",
      "created_at",
    ],
    "audit_hot",
    ["writer_append_only", "reader_select_scoped", "gateway_policy_boundary"],
    ["G04_WRITER_PREFLIGHT", "G05_DATABASE_SECURITY", "G08_PERSISTENCE_READINESS"],
  ),
  entity(
    "approval_requests",
    [
      "approval_request_id",
      "tenant_id",
      "project_id",
      "requested_action",
      "requested_by_ref",
      "risk_rating",
      "policy_decision_ref",
      "source_refs_json",
      "rollback_plan_ref",
      "audit_obligations_json",
      "status",
      "created_at",
      "resolved_at",
    ],
    "approval_preview",
    ["approval_reviewer_boundary", "gateway_policy_boundary"],
    ["G06_POLICY_GATE", "G07_APPROVAL_REQUEST", "G08_PERSISTENCE_READINESS"],
  ),
  entity(
    "agent_sessions",
    [
      "agent_session_id",
      "tenant_id",
      "project_id",
      "agent_profile_ref",
      "objective",
      "status",
      "boundary_status",
      "context_bundle_id",
      "started_at",
      "closed_at",
      "handoff_prompt_ref",
    ],
    "build_state",
    ["reader_select_scoped", "runtime_blocked_boundary"],
  ),
  entity(
    "packet_runs",
    [
      "packet_run_id",
      "packet_id",
      "phase",
      "status",
      "objective",
      "acceptance_checks_json",
      "verification_commands_json",
      "verification_results_json",
      "scope_opened_json",
      "side_effects_json",
      "next_packet",
      "started_at",
      "completed_at",
    ],
    "build_state",
    ["reader_select_scoped", "gateway_policy_boundary"],
  ),
  entity(
    "auth_identity_descriptors",
    [
      "auth_identity_descriptor_id",
      "tenant_id",
      "project_id",
      "auth_mode",
      "deployment_owner_ref",
      "provider_ref",
      "secret_ref_required",
      "raw_secret_value_allowed",
      "live_provider_configured",
      "created_at",
    ],
    "auth_integration_reference",
    ["deployment_owner_auth_integration", "gateway_policy_boundary"],
    ["G02_SCHEMA_CONTRACT", "G06_POLICY_GATE", "G09_IMPLEMENTATION_PACKET"],
    authRefs,
  ),
  entity(
    "auth_session_descriptors",
    [
      "auth_session_descriptor_id",
      "tenant_id",
      "project_id",
      "auth_mode",
      "session_storage_policy",
      "role_mapping_ref",
      "secret_refs_only",
      "permission_mutation_allowed",
      "created_at",
    ],
    "auth_integration_reference",
    ["deployment_owner_auth_integration", "gateway_policy_boundary"],
    ["G02_SCHEMA_CONTRACT", "G05_DATABASE_SECURITY", "G09_IMPLEMENTATION_PACKET"],
    authRefs,
  ),
  entity(
    "integration_descriptors",
    [
      "integration_id",
      "tenant_id",
      "project_id",
      "display_name",
      "deployment_owner_ref",
      "substrate_kind",
      "auth_reference_kind",
      "secret_ref_required",
      "raw_secret_value_allowed",
      "capability_refs",
      "risk_level",
      "approval_required",
      "audit_required",
      "rollback_required",
      "disablement_required",
      "live_connector_enabled",
      "mutation_allowed",
      "created_at",
    ],
    "auth_integration_reference",
    ["deployment_owner_auth_integration", "gateway_policy_boundary"],
    ["G02_SCHEMA_CONTRACT", "G06_POLICY_GATE", "G07_APPROVAL_REQUEST"],
    authRefs,
  ),
  entity(
    "authorization_role_bindings",
    [
      "role_binding_id",
      "tenant_id",
      "project_id",
      "role_ref",
      "authorization_level",
      "identity_descriptor_ref",
      "approval_required",
      "audit_required",
      "permission_mutation_allowed",
      "created_at",
    ],
    "auth_integration_reference",
    ["deployment_owner_auth_integration", "approval_reviewer_boundary"],
    ["G02_SCHEMA_CONTRACT", "G06_POLICY_GATE", "G07_APPROVAL_REQUEST"],
    authRefs,
  ),
];

export function createPersistenceSchemaContract(
  request: PersistenceSchemaContractRequest = {},
): PersistenceSchemaContractResult {
  const normalized = normalizeRequest(request);

  if (!normalized.ok) {
    return {
      ok: false,
      persistence_schema_contract: null,
      errors: normalized.errors,
      raw_input_content: "withheld",
      side_effects: [],
    };
  }

  return {
    ok: true,
    persistence_schema_contract: {
      contract_id: persistenceSchemaContract.contract_id,
      schema_version: persistenceSchemaContract.schema_version,
      required_entity_names: [...persistenceSchemaEntityNames],
      entities: normalized.entities,
      source_refs: normalized.source_refs,
      retention_classes: normalized.retention_classes,
      role_boundary_refs: normalized.role_boundary_refs,
      migration_readiness_refs: normalized.migration_readiness_refs,
      allowed_state: normalized.allowed_state,
      blocked_capabilities: [...persistenceSchemaBlockedCapabilityFlags],
      implementation_artifacts: [],
      migration_artifacts: [],
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

function entity(
  entityName: PersistenceSchemaEntityName,
  fieldNames: string[],
  retentionClass: PersistenceSchemaRetentionClass = "source_snapshot",
  roleBoundaryRefs: PersistenceSchemaRoleBoundaryRef[] = ["reader_select_scoped"],
  migrationReadinessRefs: PersistenceSchemaMigrationReadinessRef[] = [
    "G02_SCHEMA_CONTRACT",
  ],
  sourceRefs: string[] = planRefs,
): PersistenceSchemaEntityInput {
  return {
    entity_name: entityName,
    field_names: fieldNames,
    source_refs: [...sourceRefs, ...gateRefs],
    tenant_project_scope: entityName.includes("_refs") ? "inherited" : "direct",
    retention_class: retentionClass,
    role_boundary_refs: roleBoundaryRefs,
    migration_readiness_refs: migrationReadinessRefs,
    current_state: "source_contract_only",
    live_storage_allowed: false,
  };
}

function normalizeRequest(
  request: PersistenceSchemaContractRequest,
): NormalizedPersistenceSchemaContractRequest {
  if (!isPlainObject(request)) {
    return {
      ok: false,
      errors: [
        persistenceSchemaError(
          "persistence_schema_contract.invalid_request",
          "",
          "Persistence schema contract request must be an object.",
        ),
      ],
    };
  }

  const errors: PersistenceSchemaContractError[] = [];

  for (const key of Object.keys(request)) {
    if (!requestKeys.has(key)) {
      errors.push(
        persistenceSchemaError(
          "persistence_schema_contract.unexpected_field",
          `/${key}`,
          "Unexpected persistence schema contract field.",
        ),
      );
    }
  }

  if (
    request.schema_version !== undefined &&
    request.schema_version !== persistenceSchemaContract.schema_version
  ) {
    errors.push(
      persistenceSchemaError(
        "persistence_schema_contract.invalid_version",
        "/schema_version",
        "Persistence schema contract version is unsupported.",
      ),
    );
  }

  if (
    request.contract_authority !== undefined &&
    request.contract_authority !== persistenceSchemaContract.contract_authority
  ) {
    errors.push(
      persistenceSchemaError(
        "persistence_schema_contract.unsafe_contract_authority",
        "/contract_authority",
        "Persistence schema contract authority must remain source-only.",
      ),
    );
  }

  for (const flag of persistenceSchemaBlockedCapabilityFlags) {
    if (request[flag] !== undefined && request[flag] !== false) {
      errors.push(blockedCapabilityError(flag, `/${flag}`));
    }
  }

  validateSideEffects(request.side_effects, "/side_effects", errors);

  const entities = normalizeEntities(
    request.entities ?? defaultPersistenceSchemaEntities,
    errors,
  );
  const sourceRefs = normalizeSourceRefs(
    request.source_refs ?? defaultSourceRefs,
    errors,
  );
  const retentionClasses = normalizeRequiredRefList(
    request.retention_classes ?? [...persistenceSchemaRetentionClasses],
    [...persistenceSchemaRetentionClasses],
    retentionClassSet,
    "/retention_classes",
    "persistence_schema_contract.retention_class_required",
    "Persistence schema contract must preserve all required retention classes.",
    errors,
  ) as PersistenceSchemaRetentionClass[] | null;
  const roleBoundaryRefs = normalizeRequiredRefList(
    request.role_boundary_refs ?? [...persistenceSchemaRoleBoundaryRefs],
    [...persistenceSchemaRoleBoundaryRefs],
    roleBoundaryRefSet,
    "/role_boundary_refs",
    "persistence_schema_contract.role_boundary_ref_required",
    "Persistence schema contract must preserve all required role boundary refs.",
    errors,
  ) as PersistenceSchemaRoleBoundaryRef[] | null;
  const migrationReadinessRefs = normalizeRequiredRefList(
    request.migration_readiness_refs ?? [...persistenceSchemaMigrationReadinessRefs],
    [...persistenceSchemaMigrationReadinessRefs],
    migrationReadinessRefSet,
    "/migration_readiness_refs",
    "persistence_schema_contract.migration_readiness_ref_required",
    "Persistence schema contract must preserve all migration readiness refs.",
    errors,
  ) as PersistenceSchemaMigrationReadinessRef[] | null;
  const allowedState = normalizeAllowedState(
    request.allowed_state ?? defaultPersistenceSchemaAllowedState,
    errors,
  );

  if (
    errors.length > 0 ||
    entities === null ||
    sourceRefs === null ||
    retentionClasses === null ||
    roleBoundaryRefs === null ||
    migrationReadinessRefs === null ||
    allowedState === null
  ) {
    return {
      ok: false,
      errors,
    };
  }

  return {
    ok: true,
    entities,
    source_refs: sourceRefs,
    retention_classes: retentionClasses,
    role_boundary_refs: roleBoundaryRefs,
    migration_readiness_refs: migrationReadinessRefs,
    allowed_state: allowedState,
  };
}

function normalizeEntities(
  value: unknown,
  errors: PersistenceSchemaContractError[],
): PersistenceSchemaEntityEvidence[] | null {
  if (!Array.isArray(value)) {
    errors.push(
      persistenceSchemaError(
        "persistence_schema_contract.entity_required",
        "/entities",
        "Persistence schema contract entities are required.",
      ),
    );
    return null;
  }

  const normalized: PersistenceSchemaEntityEvidence[] = [];
  const seen = new Set<string>();

  for (let index = 0; index < value.length; index += 1) {
    const rawEntity = value[index];
    if (!isPlainObject(rawEntity)) {
      errors.push(
        persistenceSchemaError(
          "persistence_schema_contract.invalid_entity",
          `/entities/${index}`,
          "Persistence schema entity must be an object.",
        ),
      );
      continue;
    }

    const entityName = rawEntity.entity_name;
    if (!isPersistenceSchemaEntityName(entityName)) {
      errors.push(
        persistenceSchemaError(
          "persistence_schema_contract.invalid_entity",
          `/entities/${index}/entity_name`,
          "Persistence schema entity name is unsupported.",
        ),
      );
      continue;
    }

    seen.add(entityName);
    if (persistenceSchemaEntityNames[index] !== entityName) {
      errors.push(
        persistenceSchemaError(
          "persistence_schema_contract.entity_set_drift",
          `/entities/${index}/entity_name`,
          "Persistence schema entity order must match required source contract.",
        ),
      );
    }

    const fieldNames = normalizeFieldNames(
      rawEntity.field_names,
      `/entities/${index}/field_names`,
      errors,
    );
    const sourceRefs = normalizeRepoPathList(
      rawEntity.source_refs,
      `/entities/${index}/source_refs`,
      "persistence_schema_contract.source_ref_required",
      errors,
    );
    const tenantProjectScope = normalizeEnumValue(
      rawEntity.tenant_project_scope,
      tenantProjectScopeSet,
      `/entities/${index}/tenant_project_scope`,
      "persistence_schema_contract.invalid_entity",
      "Persistence schema entity must declare tenant/project scope.",
      errors,
    ) as PersistenceSchemaTenantProjectScopeMode | null;
    const retentionClass = normalizeEnumValue(
      rawEntity.retention_class,
      retentionClassSet,
      `/entities/${index}/retention_class`,
      "persistence_schema_contract.retention_class_required",
      "Persistence schema entity must use a required retention class.",
      errors,
    ) as PersistenceSchemaRetentionClass | null;
    const roleBoundaryRefs = normalizeEnumList(
      rawEntity.role_boundary_refs,
      roleBoundaryRefSet,
      `/entities/${index}/role_boundary_refs`,
      "persistence_schema_contract.role_boundary_ref_required",
      "Persistence schema entity must include role boundary refs.",
      errors,
    ) as PersistenceSchemaRoleBoundaryRef[] | null;
    const migrationReadinessRefs = normalizeEnumList(
      rawEntity.migration_readiness_refs,
      migrationReadinessRefSet,
      `/entities/${index}/migration_readiness_refs`,
      "persistence_schema_contract.migration_readiness_ref_required",
      "Persistence schema entity must include migration readiness refs.",
      errors,
    ) as PersistenceSchemaMigrationReadinessRef[] | null;

    if (rawEntity.current_state !== "source_contract_only") {
      errors.push(
        persistenceSchemaError(
          "persistence_schema_contract.invalid_entity",
          `/entities/${index}/current_state`,
          "Persistence schema entity must remain source-contract-only.",
        ),
      );
    }

    if (rawEntity.live_storage_allowed !== false) {
      errors.push(
        blockedCapabilityError(
          "live_storage_allowed",
          `/entities/${index}/live_storage_allowed`,
        ),
      );
    }

    if (
      fieldNames === null ||
      sourceRefs === null ||
      tenantProjectScope === null ||
      retentionClass === null ||
      roleBoundaryRefs === null ||
      migrationReadinessRefs === null ||
      rawEntity.current_state !== "source_contract_only" ||
      rawEntity.live_storage_allowed !== false
    ) {
      continue;
    }

    normalized.push({
      entity_name: entityName,
      field_names: fieldNames,
      source_refs: sourceRefs,
      tenant_project_scope: tenantProjectScope,
      retention_class: retentionClass,
      role_boundary_refs: roleBoundaryRefs,
      migration_readiness_refs: migrationReadinessRefs,
      current_state: "source_contract_only",
      live_storage_allowed: false,
    });
  }

  for (const requiredEntityName of persistenceSchemaEntityNames) {
    if (!seen.has(requiredEntityName)) {
      errors.push(
        persistenceSchemaError(
          "persistence_schema_contract.entity_required",
          "/entities",
          "Persistence schema contract is missing a required entity.",
        ),
      );
    }
  }

  if (value.length !== persistenceSchemaEntityNames.length) {
    errors.push(
      persistenceSchemaError(
        "persistence_schema_contract.entity_set_drift",
        "/entities",
        "Persistence schema entity set must match required source contract.",
      ),
    );
  }

  return normalized;
}

function normalizeSourceRefs(
  value: unknown,
  errors: PersistenceSchemaContractError[],
): string[] | null {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push(
      persistenceSchemaError(
        "persistence_schema_contract.source_ref_required",
        "/source_refs",
        "Persistence schema contract requires source refs.",
      ),
    );
    return null;
  }

  const normalized: string[] = [];

  for (let index = 0; index < value.length; index += 1) {
    const sourceRef = value[index];
    if (!isPlainObject(sourceRef)) {
      errors.push(
        persistenceSchemaError(
          "persistence_schema_contract.invalid_source_ref",
          `/source_refs/${index}`,
          "Persistence schema source ref must be an object.",
        ),
      );
      continue;
    }

    const path = sourceRef.source_ref;
    if (!isSafeRepoPath(path) || pathContainsSecretLikeTerm(path)) {
      errors.push(
        persistenceSchemaError(
          "persistence_schema_contract.invalid_source_ref",
          `/source_refs/${index}/source_ref`,
          "Persistence schema source ref must be a safe repo-relative path.",
        ),
      );
      continue;
    }

    const summary = sourceRef.summary;
    if (typeof summary !== "string" || summary.trim().length === 0) {
      errors.push(
        persistenceSchemaError(
          "persistence_schema_contract.invalid_source_ref",
          `/source_refs/${index}/summary`,
          "Persistence schema source ref summary is required.",
        ),
      );
      continue;
    }

    if (containsCredentialLikeValue(summary)) {
      errors.push(
        persistenceSchemaError(
          "persistence_schema_contract.secret_value_forbidden",
          `/source_refs/${index}/summary`,
          "Persistence schema source ref summary cannot contain credential-like values.",
        ),
      );
      continue;
    }

    normalized.push(path);
  }

  for (const requiredSourceRef of persistenceSchemaContract.source_docs) {
    if (!normalized.includes(requiredSourceRef)) {
      errors.push(
        persistenceSchemaError(
          "persistence_schema_contract.source_ref_required",
          "/source_refs",
          "Persistence schema contract is missing a required source ref.",
        ),
      );
    }
  }

  return normalized;
}

function normalizeAllowedState(
  value: unknown,
  errors: PersistenceSchemaContractError[],
): PersistenceSchemaAllowedStateInput | null {
  if (!isPlainObject(value)) {
    errors.push(
      persistenceSchemaError(
        "persistence_schema_contract.allowed_state_required",
        "/allowed_state",
        "Persistence schema contract allowed state is required.",
      ),
    );
    return null;
  }

  const keys = Object.keys(defaultPersistenceSchemaAllowedState) as Array<
    keyof PersistenceSchemaAllowedStateInput
  >;
  let ok = true;

  for (const key of keys) {
    if (value[key] !== defaultPersistenceSchemaAllowedState[key]) {
      ok = false;
      const path = `/allowed_state/${String(key)}`;
      if (key === "live_execution_allowed" || key === "live_storage_allowed") {
        errors.push(blockedCapabilityError(key, path));
      } else if (key === "python_runtime_required") {
        errors.push(blockedCapabilityError("python_runtime_required", path));
      } else if (key === "os_specific_binary_required") {
        errors.push(blockedCapabilityError("os_specific_binary_required", path));
      } else if (key === "secret_posture") {
        errors.push(
          persistenceSchemaError(
            "persistence_schema_contract.secret_value_forbidden",
            path,
            "Persistence schema contract must keep secret references only.",
          ),
        );
      } else {
        errors.push(
          persistenceSchemaError(
            "persistence_schema_contract.allowed_state_drift",
            path,
            "Persistence schema contract allowed state drifted from no-live posture.",
          ),
        );
      }
    }
  }

  return ok ? { ...defaultPersistenceSchemaAllowedState } : null;
}

function normalizeRequiredRefList(
  value: unknown,
  requiredRefs: string[],
  allowedSet: Set<string>,
  path: string,
  code: PersistenceSchemaContractErrorCode,
  message: string,
  errors: PersistenceSchemaContractError[],
): string[] | null {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push(persistenceSchemaError(code, path, message));
    return null;
  }

  const normalized: string[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const item = value[index];
    if (typeof item !== "string" || !allowedSet.has(item)) {
      errors.push(persistenceSchemaError(code, `${path}/${index}`, message));
      continue;
    }
    normalized.push(item);
  }

  for (const requiredRef of requiredRefs) {
    if (!normalized.includes(requiredRef)) {
      errors.push(persistenceSchemaError(code, path, message));
    }
  }

  return normalized;
}

function normalizeFieldNames(
  value: unknown,
  path: string,
  errors: PersistenceSchemaContractError[],
): string[] | null {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push(
      persistenceSchemaError(
        "persistence_schema_contract.field_evidence_required",
        path,
        "Persistence schema entity requires field evidence.",
      ),
    );
    return null;
  }

  const normalized: string[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const fieldName = value[index];
    if (
      typeof fieldName !== "string" ||
      !/^[a-z][a-z0-9_]*$/.test(fieldName) ||
      containsCredentialLikeValue(fieldName)
    ) {
      errors.push(
        persistenceSchemaError(
          "persistence_schema_contract.invalid_field",
          `${path}/${index}`,
          "Persistence schema field name must be safe and credential-free.",
        ),
      );
      continue;
    }
    normalized.push(fieldName);
  }

  return normalized;
}

function normalizeRepoPathList(
  value: unknown,
  path: string,
  requiredCode: PersistenceSchemaContractErrorCode,
  errors: PersistenceSchemaContractError[],
): string[] | null {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push(
      persistenceSchemaError(
        requiredCode,
        path,
        "Persistence schema entity requires source refs.",
      ),
    );
    return null;
  }

  const normalized: string[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const sourceRef = value[index];
    if (!isSafeRepoPath(sourceRef) || pathContainsSecretLikeTerm(sourceRef)) {
      errors.push(
        persistenceSchemaError(
          "persistence_schema_contract.invalid_source_ref",
          `${path}/${index}`,
          "Persistence schema entity source ref must be a safe repo-relative path.",
        ),
      );
      continue;
    }
    normalized.push(sourceRef);
  }

  return normalized;
}

function normalizeEnumValue(
  value: unknown,
  allowedSet: Set<string>,
  path: string,
  code: PersistenceSchemaContractErrorCode,
  message: string,
  errors: PersistenceSchemaContractError[],
): string | null {
  if (typeof value !== "string" || !allowedSet.has(value)) {
    errors.push(persistenceSchemaError(code, path, message));
    return null;
  }
  return value;
}

function normalizeEnumList(
  value: unknown,
  allowedSet: Set<string>,
  path: string,
  code: PersistenceSchemaContractErrorCode,
  message: string,
  errors: PersistenceSchemaContractError[],
): string[] | null {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push(persistenceSchemaError(code, path, message));
    return null;
  }

  const normalized: string[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const item = value[index];
    if (typeof item !== "string" || !allowedSet.has(item)) {
      errors.push(persistenceSchemaError(code, `${path}/${index}`, message));
      continue;
    }
    normalized.push(item);
  }

  return normalized;
}

function validateSideEffects(
  value: unknown,
  path: string,
  errors: PersistenceSchemaContractError[],
): void {
  if (value === undefined) {
    return;
  }

  if (!Array.isArray(value) || value.length > 0) {
    errors.push(
      persistenceSchemaError(
        "persistence_schema_contract.side_effects_forbidden",
        path,
        "Persistence schema contract must preserve side_effects: [].",
      ),
    );
  }
}

function blockedCapabilityError(
  flag: PersistenceSchemaBlockedCapabilityFlag,
  path: string,
): PersistenceSchemaContractError {
  if (flag === "live_execution_allowed" || flag === "live_storage_allowed") {
    return persistenceSchemaError(
      "persistence_schema_contract.live_execution_forbidden",
      path,
      "Persistence schema contract cannot open live storage or execution.",
    );
  }

  if (flag === "python_runtime_required") {
    return persistenceSchemaError(
      "persistence_schema_contract.python_runtime_requirement_forbidden",
      path,
      "Persistence schema contract cannot require Python for core MVP.",
    );
  }

  if (flag === "os_specific_binary_required") {
    return persistenceSchemaError(
      "persistence_schema_contract.os_specific_binary_requirement_forbidden",
      path,
      "Persistence schema contract cannot require OS-specific binaries for core MVP.",
    );
  }

  return persistenceSchemaError(
    "persistence_schema_contract.blocked_capability_forbidden",
    path,
    "Persistence schema contract cannot open blocked DB, migration, writer, runtime, auth, integration, OS, deploy, queue, Git, or external-service scope.",
  );
}

function persistenceSchemaError(
  code: PersistenceSchemaContractErrorCode,
  path: string,
  message: string,
): PersistenceSchemaContractError {
  return {
    code,
    path,
    message,
    severity: "error",
  };
}

function isPersistenceSchemaEntityName(
  value: unknown,
): value is PersistenceSchemaEntityName {
  return typeof value === "string" && entityNameSet.has(value);
}

function isSafeRepoPath(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= 240 &&
    !value.startsWith("/") &&
    !value.includes("..") &&
    !value.includes("\\") &&
    !value.includes("://") &&
    !value.includes("\0")
  );
}

function pathContainsSecretLikeTerm(value: string): boolean {
  return /(^|[/_.-])(secret|token|password|credential|private-key)([/_.-]|$)/i.test(
    value,
  );
}

function containsCredentialLikeValue(value: string): boolean {
  return /DATABASE_URL|postgres:\/\/|mysql:\/\/|PRIVATE KEY|BEGIN [A-Z ]*KEY|token value|password=|api[_-]?key|bearer\s+[a-z0-9._-]+/i.test(
    value,
  );
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
