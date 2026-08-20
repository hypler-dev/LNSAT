import { migrationArtifactStaticReviewContract } from "./migration-artifact-static-review.js";
import {
  persistencePolicyGateIds,
  type PersistencePolicyGateId,
} from "./persistence-policy-gate.js";
import {
  persistenceSchemaContract,
  persistenceSchemaEntityNames,
  type PersistenceSchemaEntityName,
} from "./persistence-schema-contract.js";
import {
  writerPreflightBlockedCapabilityFlags,
  writerPreflightContract,
  type WriterPreflightBlockedCapabilityFlag,
} from "./writer-preflight-contract.js";

export const DATABASE_SECURITY_PREFLIGHT_CONTRACT_STATUS = "source_only";

export const databaseSecurityPreflightTargetGate =
  "G05_DATABASE_SECURITY" satisfies PersistencePolicyGateId;

export const databaseSecurityIsolationRefKinds = [
  "tenant_project_scope_ref",
  "row_level_policy_or_equivalent_ref",
  "writer_select_filter_ref",
] as const;

export const databaseSecurityRoleBoundaryKinds = [
  "writer_role_ref",
  "select_role_ref",
  "migration_role_ref",
] as const;

export const databaseSecurityGrantRefKinds = [
  "deny_by_default_grant_ref",
  "insert_only_writer_grant_ref",
  "scoped_select_grant_ref",
  "migration_approval_grant_ref",
  "no_update_delete_truncate_grant_ref",
] as const;

export const databaseSecurityStaticCheckIds = [
  "TENANT_PROJECT_ISOLATION",
  "ROLE_BOUNDARY_SEPARATION",
  "DENY_BY_DEFAULT_GRANTS",
  "NO_BROAD_AUDIT_MUTATION",
  "NO_CONNECTION_STRING",
  "NO_ROLE_GRANT_EXECUTION",
  "NO_SECRET_VALUE",
  "NO_SQL_OR_DDL_EXECUTION",
] as const;

export const databaseSecurityPreflightAdditionalBlockedCapabilityFlags = [
  "ddl_execution_allowed",
  "policy_ddl_execution_allowed",
  "role_grant_mutation_allowed",
  "role_grant_execution_allowed",
  "grant_application_allowed",
  "database_role_connection_allowed",
  "broad_audit_mutation_allowed",
  "superuser_role_allowed",
  "bypass_rls_allowed",
  "database_security_runtime_allowed",
] as const;

export const databaseSecurityPreflightBlockedCapabilityFlags = [
  ...writerPreflightBlockedCapabilityFlags,
  ...databaseSecurityPreflightAdditionalBlockedCapabilityFlags,
] as const;

export const databaseSecurityPreflightContract = {
  contract_id: "lnsat.platform.database_security_preflight.v0_1",
  authority: ["@lnsat/packets", "source-backed-database-security-preflight"],
  security_version: "0.1",
  source_docs: [
    "docs/architecture/PERSISTENCE_AND_POLICY_GATE_REVIEW.md",
    "docs/architecture/PERSISTENCE_SCHEMA_PLAN.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
  ],
  persistence_schema_contract_id: persistenceSchemaContract.contract_id,
  migration_static_review_contract_id:
    migrationArtifactStaticReviewContract.contract_id,
  writer_preflight_contract_id: writerPreflightContract.contract_id,
  target_gate: databaseSecurityPreflightTargetGate,
  gate_ids: persistencePolicyGateIds,
  required_entity_names: persistenceSchemaEntityNames,
  isolation_ref_kinds: databaseSecurityIsolationRefKinds,
  role_boundary_kinds: databaseSecurityRoleBoundaryKinds,
  grant_ref_kinds: databaseSecurityGrantRefKinds,
  static_check_ids: databaseSecurityStaticCheckIds,
  blocked_capability_flags: databaseSecurityPreflightBlockedCapabilityFlags,
  contract_authority: "source_only_database_security_preflight_no_db_no_grants",
  source_only_database_security_preflight_allowed: true,
  tenant_project_isolation_refs_allowed: true,
  role_boundary_refs_allowed: true,
  deny_by_default_grant_refs_allowed: true,
  static_check_refs_allowed: true,
  database_connection_allowed: false,
  database_write_allowed: false,
  sql_execution_allowed: false,
  ddl_execution_allowed: false,
  role_grant_mutation_allowed: false,
  role_grant_execution_allowed: false,
  grant_application_allowed: false,
  writer_implementation_allowed: false,
  migration_execution_allowed: false,
  live_storage_allowed: false,
  live_execution_allowed: false,
  python_runtime_required: false,
  os_specific_binary_required: false,
  side_effects: [],
  status: "source_only",
} as const;

export type DatabaseSecurityIsolationRefKind =
  (typeof databaseSecurityIsolationRefKinds)[number];
export type DatabaseSecurityRoleBoundaryKind =
  (typeof databaseSecurityRoleBoundaryKinds)[number];
export type DatabaseSecurityGrantRefKind =
  (typeof databaseSecurityGrantRefKinds)[number];
export type DatabaseSecurityStaticCheckId =
  (typeof databaseSecurityStaticCheckIds)[number];
export type DatabaseSecurityPreflightAdditionalBlockedCapabilityFlag =
  (typeof databaseSecurityPreflightAdditionalBlockedCapabilityFlags)[number];
export type DatabaseSecurityPreflightBlockedCapabilityFlag =
  | WriterPreflightBlockedCapabilityFlag
  | DatabaseSecurityPreflightAdditionalBlockedCapabilityFlag;

export type DatabaseSecuritySourceRefInput = {
  source_ref: string;
  summary: string;
};

export type DatabaseSecuritySchemaEntityRefInput = {
  entity_name: PersistenceSchemaEntityName;
  schema_contract_ref: string;
  writer_preflight_ref: string;
  database_security_ref: string;
  current_state: "source_ref_only_no_db_connection";
  target_gate: typeof databaseSecurityPreflightTargetGate;
  tenant_project_scope_required: true;
  live_storage_allowed: false;
};

export type DatabaseSecurityIsolationRefInput = {
  isolation_ref: string;
  isolation_kind: DatabaseSecurityIsolationRefKind;
  summary: string;
  current_state: "source_ref_only_no_policy_execution";
  target_gate: typeof databaseSecurityPreflightTargetGate;
  tenant_project_scope_required: true;
  database_policy_execution_allowed: false;
  live_storage_allowed: false;
};

export type DatabaseSecurityRoleBoundaryRefInput = {
  role_ref: string;
  role_kind: DatabaseSecurityRoleBoundaryKind;
  summary: string;
  current_state: "source_ref_only_no_role_or_grant_mutation";
  database_role_connection_allowed: false;
  grant_mutation_allowed: false;
  sql_execution_allowed: false;
  superuser_role_allowed: false;
  bypass_rls_allowed: false;
};

export type DatabaseSecurityGrantRefInput = {
  grant_ref: string;
  grant_kind: DatabaseSecurityGrantRefKind;
  summary: string;
  current_state: "source_ref_only_deny_by_default";
  deny_by_default: true;
  grant_application_allowed: false;
  role_grant_mutation_allowed: false;
  broad_audit_mutation_allowed: false;
};

export type DatabaseSecurityStaticCheckInput = {
  check_id: DatabaseSecurityStaticCheckId;
  check_kind:
    | "tenant_project_isolation"
    | "role_boundary"
    | "deny_by_default_grant"
    | "broad_audit_mutation"
    | "no_connection"
    | "no_role_grant_execution"
    | "no_secret"
    | "no_sql_or_ddl";
  source_ref: string;
  required_gate: typeof databaseSecurityPreflightTargetGate;
  current_state: "static_check_ref_only";
  execution_allowed: false;
  raw_sql_allowed: false;
};

export type DatabaseSecurityNoConnectionPostureInput = {
  database_url_allowed: false;
  connection_string_allowed: false;
  database_connection_allowed: false;
  database_write_allowed: false;
  sql_execution_allowed: false;
  ddl_execution_allowed: false;
  policy_ddl_execution_allowed: false;
  role_grant_execution_allowed: false;
  role_grant_mutation_allowed: false;
  grant_application_allowed: false;
  live_storage_allowed: false;
  environment_secret_lookup_allowed: false;
};

export type DatabaseSecurityAllowedStateInput = {
  source_only_database_security_preflight_allowed: true;
  tenant_project_isolation_refs_allowed: true;
  role_boundary_refs_allowed: true;
  deny_by_default_grant_refs_allowed: true;
  static_check_refs_allowed: true;
  database_connection_allowed: false;
  database_write_allowed: false;
  sql_execution_allowed: false;
  ddl_execution_allowed: false;
  role_grant_mutation_allowed: false;
  role_grant_execution_allowed: false;
  grant_application_allowed: false;
  broad_audit_mutation_allowed: false;
  superuser_role_allowed: false;
  bypass_rls_allowed: false;
  writer_implementation_allowed: false;
  migration_execution_allowed: false;
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

export type DatabaseSecurityPreflightRequest = Partial<
  Record<DatabaseSecurityPreflightBlockedCapabilityFlag, false>
> & {
  security_version?: typeof databaseSecurityPreflightContract.security_version;
  gate_sequence?: PersistencePolicyGateId[];
  schema_entity_refs?: DatabaseSecuritySchemaEntityRefInput[];
  isolation_refs?: DatabaseSecurityIsolationRefInput[];
  role_boundary_refs?: DatabaseSecurityRoleBoundaryRefInput[];
  grant_refs?: DatabaseSecurityGrantRefInput[];
  static_checks?: DatabaseSecurityStaticCheckInput[];
  no_connection_posture?: DatabaseSecurityNoConnectionPostureInput;
  source_refs?: DatabaseSecuritySourceRefInput[];
  allowed_state?: DatabaseSecurityAllowedStateInput;
  contract_authority?: typeof databaseSecurityPreflightContract.contract_authority;
  side_effects?: [];
};

export type DatabaseSecurityPreflightErrorCode =
  | "database_security.invalid_request"
  | "database_security.unexpected_field"
  | "database_security.invalid_version"
  | "database_security.gate_sequence_required"
  | "database_security.gate_order_drift"
  | "database_security.schema_entity_ref_required"
  | "database_security.schema_entity_ref_drift"
  | "database_security.isolation_ref_required"
  | "database_security.invalid_isolation_ref"
  | "database_security.role_boundary_ref_required"
  | "database_security.invalid_role_boundary_ref"
  | "database_security.grant_ref_required"
  | "database_security.invalid_grant_ref"
  | "database_security.static_check_required"
  | "database_security.invalid_static_check"
  | "database_security.no_connection_posture_required"
  | "database_security.no_connection_posture_drift"
  | "database_security.source_ref_required"
  | "database_security.invalid_source_ref"
  | "database_security.allowed_state_required"
  | "database_security.allowed_state_drift"
  | "database_security.unsafe_contract_authority"
  | "database_security.secret_value_forbidden"
  | "database_security.connection_or_sql_forbidden"
  | "database_security.role_grant_forbidden"
  | "database_security.writer_implementation_forbidden"
  | "database_security.migration_execution_forbidden"
  | "database_security.live_execution_forbidden"
  | "database_security.python_runtime_requirement_forbidden"
  | "database_security.os_specific_binary_requirement_forbidden"
  | "database_security.blocked_capability_forbidden"
  | "database_security.side_effects_forbidden";

export type DatabaseSecurityPreflightError = {
  code: DatabaseSecurityPreflightErrorCode;
  path: string;
  message: string;
  severity: "error";
};

export type DatabaseSecurityPreflightEvidence = {
  contract_id: typeof databaseSecurityPreflightContract.contract_id;
  security_version: typeof databaseSecurityPreflightContract.security_version;
  target_gate: typeof databaseSecurityPreflightTargetGate;
  persistence_schema_contract_id: typeof persistenceSchemaContract.contract_id;
  migration_static_review_contract_id: typeof migrationArtifactStaticReviewContract.contract_id;
  writer_preflight_contract_id: typeof writerPreflightContract.contract_id;
  required_gate_ids: PersistencePolicyGateId[];
  required_entity_names: PersistenceSchemaEntityName[];
  schema_entity_refs: DatabaseSecuritySchemaEntityRefInput[];
  isolation_refs: DatabaseSecurityIsolationRefInput[];
  role_boundary_refs: DatabaseSecurityRoleBoundaryRefInput[];
  grant_refs: DatabaseSecurityGrantRefInput[];
  static_checks: DatabaseSecurityStaticCheckInput[];
  no_connection_posture: DatabaseSecurityNoConnectionPostureInput;
  source_refs: string[];
  allowed_state: DatabaseSecurityAllowedStateInput;
  blocked_capabilities: DatabaseSecurityPreflightBlockedCapabilityFlag[];
  implementation_artifacts: [];
  database_security_execution_artifacts: [];
  sql_artifacts: [];
  database_connection_allowed: false;
  database_write_allowed: false;
  sql_execution_allowed: false;
  ddl_execution_allowed: false;
  role_grant_mutation_allowed: false;
  role_grant_execution_allowed: false;
  grant_application_allowed: false;
  writer_implementation_allowed: false;
  migration_execution_allowed: false;
  live_storage_allowed: false;
  live_execution_allowed: false;
  python_runtime_required: false;
  os_specific_binary_required: false;
  side_effects: [];
};

export type DatabaseSecurityPreflightResult =
  | {
      ok: true;
      database_security_preflight_contract: DatabaseSecurityPreflightEvidence;
      errors: [];
      side_effects: [];
    }
  | {
      ok: false;
      database_security_preflight_contract: null;
      errors: DatabaseSecurityPreflightError[];
      raw_input_content: "withheld";
      side_effects: [];
    };

type NormalizedDatabaseSecurityRequest =
  | {
      ok: true;
      gate_sequence: PersistencePolicyGateId[];
      schema_entity_refs: DatabaseSecuritySchemaEntityRefInput[];
      isolation_refs: DatabaseSecurityIsolationRefInput[];
      role_boundary_refs: DatabaseSecurityRoleBoundaryRefInput[];
      grant_refs: DatabaseSecurityGrantRefInput[];
      static_checks: DatabaseSecurityStaticCheckInput[];
      no_connection_posture: DatabaseSecurityNoConnectionPostureInput;
      source_refs: string[];
      allowed_state: DatabaseSecurityAllowedStateInput;
    }
  | {
      ok: false;
      errors: DatabaseSecurityPreflightError[];
    };

const requestKeys = new Set([
  "security_version",
  "gate_sequence",
  "schema_entity_refs",
  "isolation_refs",
  "role_boundary_refs",
  "grant_refs",
  "static_checks",
  "no_connection_posture",
  "source_refs",
  "allowed_state",
  "contract_authority",
  "side_effects",
  ...databaseSecurityPreflightBlockedCapabilityFlags,
]);

const gateIdSet = new Set<string>(persistencePolicyGateIds);
const schemaEntitySet = new Set<string>(persistenceSchemaEntityNames);
const isolationKindSet = new Set<string>(databaseSecurityIsolationRefKinds);
const roleBoundaryKindSet = new Set<string>(databaseSecurityRoleBoundaryKinds);
const grantKindSet = new Set<string>(databaseSecurityGrantRefKinds);
const staticCheckIdSet = new Set<string>(databaseSecurityStaticCheckIds);

const defaultSourceRefs: DatabaseSecuritySourceRefInput[] = [
  {
    source_ref: "docs/architecture/PERSISTENCE_AND_POLICY_GATE_REVIEW.md",
    summary: "Gate G05 requires database security evidence before live storage.",
  },
  {
    source_ref: "docs/architecture/PERSISTENCE_SCHEMA_PLAN.md",
    summary: "Future tenant/project isolation and role boundary plan.",
  },
  {
    source_ref: "packages/packets/src/persistence-policy-gate.ts",
    summary: "BP-0203 source-only persistence gate order contract.",
  },
  {
    source_ref: "packages/packets/src/persistence-schema-contract.ts",
    summary: "BP-0204 source-only schema entity contract.",
  },
  {
    source_ref: "packages/packets/src/migration-artifact-static-review.ts",
    summary: "BP-0205 migration static review prerequisite contract.",
  },
  {
    source_ref: "packages/packets/src/writer-preflight-contract.ts",
    summary: "BP-0208 writer preflight prerequisite contract.",
  },
  {
    source_ref: "docs/reference/CONTRACT_PROVENANCE.md",
    summary: "BP-0208 source-only writer preflight packet.",
  },
  {
    source_ref: "docs/reference/CONTRACT_PROVENANCE.md",
    summary: "BP-0209 source-only database security preflight packet.",
  },
];

export const defaultDatabaseSecurityAllowedState: DatabaseSecurityAllowedStateInput = {
  source_only_database_security_preflight_allowed: true,
  tenant_project_isolation_refs_allowed: true,
  role_boundary_refs_allowed: true,
  deny_by_default_grant_refs_allowed: true,
  static_check_refs_allowed: true,
  database_connection_allowed: false,
  database_write_allowed: false,
  sql_execution_allowed: false,
  ddl_execution_allowed: false,
  role_grant_mutation_allowed: false,
  role_grant_execution_allowed: false,
  grant_application_allowed: false,
  broad_audit_mutation_allowed: false,
  superuser_role_allowed: false,
  bypass_rls_allowed: false,
  writer_implementation_allowed: false,
  migration_execution_allowed: false,
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

export const defaultDatabaseSecurityNoConnectionPosture: DatabaseSecurityNoConnectionPostureInput =
  {
    database_url_allowed: false,
    connection_string_allowed: false,
    database_connection_allowed: false,
    database_write_allowed: false,
    sql_execution_allowed: false,
    ddl_execution_allowed: false,
    policy_ddl_execution_allowed: false,
    role_grant_execution_allowed: false,
    role_grant_mutation_allowed: false,
    grant_application_allowed: false,
    live_storage_allowed: false,
    environment_secret_lookup_allowed: false,
  };

export const defaultDatabaseSecuritySchemaEntityRefs = persistenceSchemaEntityNames.map(
  (entityName): DatabaseSecuritySchemaEntityRefInput => ({
    entity_name: entityName,
    schema_contract_ref: "packages/packets/src/persistence-schema-contract.ts",
    writer_preflight_ref: "packages/packets/src/writer-preflight-contract.ts",
    database_security_ref: "docs/reference/CONTRACT_PROVENANCE.md",
    current_state: "source_ref_only_no_db_connection",
    target_gate: databaseSecurityPreflightTargetGate,
    tenant_project_scope_required: true,
    live_storage_allowed: false,
  }),
);

export const defaultDatabaseSecurityIsolationRefs: DatabaseSecurityIsolationRefInput[] =
  [
    isolationRef(
      "docs/architecture/PERSISTENCE_SCHEMA_PLAN.md",
      "tenant_project_scope_ref",
      "Future tenant/project scoping source reference.",
    ),
    isolationRef(
      "packages/packets/src/persistence-schema-contract.ts",
      "row_level_policy_or_equivalent_ref",
      "Source-only RLS or equivalent isolation requirement reference.",
    ),
    isolationRef(
      "packages/packets/src/writer-preflight-contract.ts",
      "writer_select_filter_ref",
      "Writer and select filters must preserve tenant/project scope.",
    ),
  ];

export const defaultDatabaseSecurityRoleBoundaryRefs: DatabaseSecurityRoleBoundaryRefInput[] =
  [
    roleBoundaryRef(
      "docs/architecture/PERSISTENCE_SCHEMA_PLAN.md",
      "writer_role_ref",
      "Future writer role remains append-only and scoped.",
    ),
    roleBoundaryRef(
      "docs/architecture/PERSISTENCE_SCHEMA_PLAN.md",
      "select_role_ref",
      "Future select role remains read-only and tenant/project scoped.",
    ),
    roleBoundaryRef(
      "docs/architecture/PERSISTENCE_SCHEMA_PLAN.md",
      "migration_role_ref",
      "Future migration role is approval-gated and separate.",
    ),
  ];

export const defaultDatabaseSecurityGrantRefs: DatabaseSecurityGrantRefInput[] = [
  grantRef(
    "docs/architecture/PERSISTENCE_SCHEMA_PLAN.md",
    "deny_by_default_grant_ref",
    "Future grants start denied by default.",
  ),
  grantRef(
    "docs/architecture/PERSISTENCE_SCHEMA_PLAN.md",
    "insert_only_writer_grant_ref",
    "Future writer grants are insert-only unless later policy opens more.",
  ),
  grantRef(
    "docs/architecture/PERSISTENCE_SCHEMA_PLAN.md",
    "scoped_select_grant_ref",
    "Future select grants require tenant/project scope.",
  ),
  grantRef(
    "docs/architecture/PERSISTENCE_SCHEMA_PLAN.md",
    "migration_approval_grant_ref",
    "Future migration grants require approval evidence.",
  ),
  grantRef(
    "docs/architecture/PERSISTENCE_SCHEMA_PLAN.md",
    "no_update_delete_truncate_grant_ref",
    "Future broad update/delete/truncate grants remain blocked for MVP evidence.",
  ),
];

export const defaultDatabaseSecurityStaticChecks: DatabaseSecurityStaticCheckInput[] = [
  staticCheck("TENANT_PROJECT_ISOLATION", "tenant_project_isolation"),
  staticCheck("ROLE_BOUNDARY_SEPARATION", "role_boundary"),
  staticCheck("DENY_BY_DEFAULT_GRANTS", "deny_by_default_grant"),
  staticCheck("NO_BROAD_AUDIT_MUTATION", "broad_audit_mutation"),
  staticCheck("NO_CONNECTION_STRING", "no_connection"),
  staticCheck("NO_ROLE_GRANT_EXECUTION", "no_role_grant_execution"),
  staticCheck("NO_SECRET_VALUE", "no_secret"),
  staticCheck("NO_SQL_OR_DDL_EXECUTION", "no_sql_or_ddl"),
];

export function createDatabaseSecurityPreflightContract(
  request: DatabaseSecurityPreflightRequest = {},
): DatabaseSecurityPreflightResult {
  const normalized = normalizeRequest(request);

  if (!normalized.ok) {
    return {
      ok: false,
      database_security_preflight_contract: null,
      errors: normalized.errors,
      raw_input_content: "withheld",
      side_effects: [],
    };
  }

  return {
    ok: true,
    database_security_preflight_contract: {
      contract_id: databaseSecurityPreflightContract.contract_id,
      security_version: databaseSecurityPreflightContract.security_version,
      target_gate: databaseSecurityPreflightTargetGate,
      persistence_schema_contract_id: persistenceSchemaContract.contract_id,
      migration_static_review_contract_id:
        migrationArtifactStaticReviewContract.contract_id,
      writer_preflight_contract_id: writerPreflightContract.contract_id,
      required_gate_ids: normalized.gate_sequence,
      required_entity_names: [...persistenceSchemaEntityNames],
      schema_entity_refs: normalized.schema_entity_refs,
      isolation_refs: normalized.isolation_refs,
      role_boundary_refs: normalized.role_boundary_refs,
      grant_refs: normalized.grant_refs,
      static_checks: normalized.static_checks,
      no_connection_posture: normalized.no_connection_posture,
      source_refs: normalized.source_refs,
      allowed_state: normalized.allowed_state,
      blocked_capabilities: [...databaseSecurityPreflightBlockedCapabilityFlags],
      implementation_artifacts: [],
      database_security_execution_artifacts: [],
      sql_artifacts: [],
      database_connection_allowed: false,
      database_write_allowed: false,
      sql_execution_allowed: false,
      ddl_execution_allowed: false,
      role_grant_mutation_allowed: false,
      role_grant_execution_allowed: false,
      grant_application_allowed: false,
      writer_implementation_allowed: false,
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

function isolationRef(
  isolationPath: string,
  isolationKind: DatabaseSecurityIsolationRefKind,
  summary: string,
): DatabaseSecurityIsolationRefInput {
  return {
    isolation_ref: isolationPath,
    isolation_kind: isolationKind,
    summary,
    current_state: "source_ref_only_no_policy_execution",
    target_gate: databaseSecurityPreflightTargetGate,
    tenant_project_scope_required: true,
    database_policy_execution_allowed: false,
    live_storage_allowed: false,
  };
}

function roleBoundaryRef(
  rolePath: string,
  roleKind: DatabaseSecurityRoleBoundaryKind,
  summary: string,
): DatabaseSecurityRoleBoundaryRefInput {
  return {
    role_ref: rolePath,
    role_kind: roleKind,
    summary,
    current_state: "source_ref_only_no_role_or_grant_mutation",
    database_role_connection_allowed: false,
    grant_mutation_allowed: false,
    sql_execution_allowed: false,
    superuser_role_allowed: false,
    bypass_rls_allowed: false,
  };
}

function grantRef(
  grantPath: string,
  grantKind: DatabaseSecurityGrantRefKind,
  summary: string,
): DatabaseSecurityGrantRefInput {
  return {
    grant_ref: grantPath,
    grant_kind: grantKind,
    summary,
    current_state: "source_ref_only_deny_by_default",
    deny_by_default: true,
    grant_application_allowed: false,
    role_grant_mutation_allowed: false,
    broad_audit_mutation_allowed: false,
  };
}

function staticCheck(
  checkId: DatabaseSecurityStaticCheckId,
  checkKind: DatabaseSecurityStaticCheckInput["check_kind"],
): DatabaseSecurityStaticCheckInput {
  return {
    check_id: checkId,
    check_kind: checkKind,
    source_ref: "docs/reference/CONTRACT_PROVENANCE.md",
    required_gate: databaseSecurityPreflightTargetGate,
    current_state: "static_check_ref_only",
    execution_allowed: false,
    raw_sql_allowed: false,
  };
}

function normalizeRequest(
  request: DatabaseSecurityPreflightRequest,
): NormalizedDatabaseSecurityRequest {
  if (!isPlainObject(request)) {
    return {
      ok: false,
      errors: [
        databaseSecurityError(
          "database_security.invalid_request",
          "",
          "Database security preflight request must be an object.",
        ),
      ],
    };
  }

  const errors: DatabaseSecurityPreflightError[] = [];

  for (const key of Object.keys(request)) {
    if (!requestKeys.has(key)) {
      errors.push(
        databaseSecurityError(
          "database_security.unexpected_field",
          `/${key}`,
          "Unexpected database security preflight field.",
        ),
      );
    }
  }

  if (
    request.security_version !== undefined &&
    request.security_version !== databaseSecurityPreflightContract.security_version
  ) {
    errors.push(
      databaseSecurityError(
        "database_security.invalid_version",
        "/security_version",
        "Database security preflight version is unsupported.",
      ),
    );
  }

  if (
    request.contract_authority !== undefined &&
    request.contract_authority !== databaseSecurityPreflightContract.contract_authority
  ) {
    errors.push(
      databaseSecurityError(
        "database_security.unsafe_contract_authority",
        "/contract_authority",
        "Database security preflight authority must remain source-only.",
      ),
    );
  }

  for (const flag of databaseSecurityPreflightBlockedCapabilityFlags) {
    if (request[flag] !== undefined && request[flag] !== false) {
      errors.push(blockedCapabilityError(flag, `/${flag}`));
    }
  }

  validateSideEffects(request.side_effects, "/side_effects", errors);

  const gateSequence = normalizeGateSequence(
    request.gate_sequence ?? [...persistencePolicyGateIds],
    errors,
  );
  const schemaEntityRefs = normalizeSchemaEntityRefs(
    request.schema_entity_refs ?? defaultDatabaseSecuritySchemaEntityRefs,
    errors,
  );
  const isolationRefs = normalizeIsolationRefs(
    request.isolation_refs ?? defaultDatabaseSecurityIsolationRefs,
    errors,
  );
  const roleBoundaryRefs = normalizeRoleBoundaryRefs(
    request.role_boundary_refs ?? defaultDatabaseSecurityRoleBoundaryRefs,
    errors,
  );
  const grantRefs = normalizeGrantRefs(
    request.grant_refs ?? defaultDatabaseSecurityGrantRefs,
    errors,
  );
  const staticChecks = normalizeStaticChecks(
    request.static_checks ?? defaultDatabaseSecurityStaticChecks,
    errors,
  );
  const noConnectionPosture = normalizeNoConnectionPosture(
    request.no_connection_posture ?? defaultDatabaseSecurityNoConnectionPosture,
    errors,
  );
  const sourceRefs = normalizeSourceRefs(
    request.source_refs ?? defaultSourceRefs,
    errors,
  );
  const allowedState = normalizeAllowedState(
    request.allowed_state ?? defaultDatabaseSecurityAllowedState,
    errors,
  );

  if (
    errors.length > 0 ||
    gateSequence === null ||
    schemaEntityRefs === null ||
    isolationRefs === null ||
    roleBoundaryRefs === null ||
    grantRefs === null ||
    staticChecks === null ||
    noConnectionPosture === null ||
    sourceRefs === null ||
    allowedState === null
  ) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    gate_sequence: gateSequence,
    schema_entity_refs: schemaEntityRefs,
    isolation_refs: isolationRefs,
    role_boundary_refs: roleBoundaryRefs,
    grant_refs: grantRefs,
    static_checks: staticChecks,
    no_connection_posture: noConnectionPosture,
    source_refs: sourceRefs,
    allowed_state: allowedState,
  };
}

function normalizeGateSequence(
  value: unknown,
  errors: DatabaseSecurityPreflightError[],
): PersistencePolicyGateId[] | null {
  if (!Array.isArray(value)) {
    errors.push(
      databaseSecurityError(
        "database_security.gate_sequence_required",
        "/gate_sequence",
        "Database security preflight requires the full persistence gate order.",
      ),
    );
    return null;
  }

  const normalized: PersistencePolicyGateId[] = [];
  const seen = new Set<string>();

  for (let index = 0; index < value.length; index += 1) {
    const gateId = value[index];
    if (!isPersistencePolicyGateId(gateId)) {
      errors.push(
        databaseSecurityError(
          "database_security.gate_order_drift",
          `/gate_sequence/${index}`,
          "Persistence gate id is unsupported.",
        ),
      );
      continue;
    }
    if (seen.has(gateId) || persistencePolicyGateIds[index] !== gateId) {
      errors.push(
        databaseSecurityError(
          "database_security.gate_order_drift",
          `/gate_sequence/${index}`,
          "Persistence gate order must match BP-0203.",
        ),
      );
    }
    seen.add(gateId);
    normalized.push(gateId);
  }

  for (const requiredGateId of persistencePolicyGateIds) {
    if (!seen.has(requiredGateId)) {
      errors.push(
        databaseSecurityError(
          "database_security.gate_sequence_required",
          "/gate_sequence",
          "Database security preflight is missing a required gate id.",
        ),
      );
    }
  }

  return normalized;
}

function normalizeSchemaEntityRefs(
  value: unknown,
  errors: DatabaseSecurityPreflightError[],
): DatabaseSecuritySchemaEntityRefInput[] | null {
  if (!Array.isArray(value)) {
    errors.push(
      databaseSecurityError(
        "database_security.schema_entity_ref_required",
        "/schema_entity_refs",
        "Database security preflight requires schema entity refs.",
      ),
    );
    return null;
  }

  const normalized: DatabaseSecuritySchemaEntityRefInput[] = [];
  const seen = new Set<string>();

  for (let index = 0; index < value.length; index += 1) {
    const rawRef = value[index];
    if (!isPlainObject(rawRef)) {
      errors.push(
        databaseSecurityError(
          "database_security.schema_entity_ref_drift",
          `/schema_entity_refs/${index}`,
          "Schema entity ref must be an object.",
        ),
      );
      continue;
    }

    const entityName = rawRef.entity_name;
    if (!isPersistenceSchemaEntityName(entityName)) {
      errors.push(
        databaseSecurityError(
          "database_security.schema_entity_ref_drift",
          `/schema_entity_refs/${index}/entity_name`,
          "Schema entity ref references an unsupported entity.",
        ),
      );
      continue;
    }

    if (seen.has(entityName) || persistenceSchemaEntityNames[index] !== entityName) {
      errors.push(
        databaseSecurityError(
          "database_security.schema_entity_ref_drift",
          `/schema_entity_refs/${index}/entity_name`,
          "Schema entity refs must match BP-0204 entity order.",
        ),
      );
    }
    seen.add(entityName);

    const schemaContractRef = normalizeRepoRef(
      rawRef.schema_contract_ref,
      `/schema_entity_refs/${index}/schema_contract_ref`,
      "database_security.schema_entity_ref_drift",
      errors,
    );
    const writerPreflightRef = normalizeRepoRef(
      rawRef.writer_preflight_ref,
      `/schema_entity_refs/${index}/writer_preflight_ref`,
      "database_security.schema_entity_ref_drift",
      errors,
    );
    const databaseSecurityRef = normalizeRepoRef(
      rawRef.database_security_ref,
      `/schema_entity_refs/${index}/database_security_ref`,
      "database_security.schema_entity_ref_drift",
      errors,
    );

    if (rawRef.current_state !== "source_ref_only_no_db_connection") {
      errors.push(
        databaseSecurityError(
          "database_security.schema_entity_ref_drift",
          `/schema_entity_refs/${index}/current_state`,
          "Schema entity refs must remain source-only with no DB connection.",
        ),
      );
    }
    if (rawRef.target_gate !== databaseSecurityPreflightTargetGate) {
      errors.push(
        databaseSecurityError(
          "database_security.schema_entity_ref_drift",
          `/schema_entity_refs/${index}/target_gate`,
          "Schema entity refs must target G05 database security.",
        ),
      );
    }
    if (rawRef.tenant_project_scope_required !== true) {
      errors.push(
        databaseSecurityError(
          "database_security.schema_entity_ref_drift",
          `/schema_entity_refs/${index}/tenant_project_scope_required`,
          "Schema entity refs must require tenant/project scope.",
        ),
      );
    }
    if (rawRef.live_storage_allowed !== false) {
      errors.push(
        blockedCapabilityError(
          "live_storage_allowed",
          `/schema_entity_refs/${index}/live_storage_allowed`,
        ),
      );
    }

    if (
      schemaContractRef === null ||
      writerPreflightRef === null ||
      databaseSecurityRef === null ||
      rawRef.current_state !== "source_ref_only_no_db_connection" ||
      rawRef.target_gate !== databaseSecurityPreflightTargetGate ||
      rawRef.tenant_project_scope_required !== true ||
      rawRef.live_storage_allowed !== false
    ) {
      continue;
    }

    normalized.push({
      entity_name: entityName,
      schema_contract_ref: schemaContractRef,
      writer_preflight_ref: writerPreflightRef,
      database_security_ref: databaseSecurityRef,
      current_state: "source_ref_only_no_db_connection",
      target_gate: databaseSecurityPreflightTargetGate,
      tenant_project_scope_required: true,
      live_storage_allowed: false,
    });
  }

  for (const requiredEntityName of persistenceSchemaEntityNames) {
    if (!seen.has(requiredEntityName)) {
      errors.push(
        databaseSecurityError(
          "database_security.schema_entity_ref_required",
          "/schema_entity_refs",
          "Database security preflight is missing required schema entity refs.",
        ),
      );
    }
  }

  return normalized;
}

function normalizeIsolationRefs(
  value: unknown,
  errors: DatabaseSecurityPreflightError[],
): DatabaseSecurityIsolationRefInput[] | null {
  if (!Array.isArray(value)) {
    errors.push(
      databaseSecurityError(
        "database_security.isolation_ref_required",
        "/isolation_refs",
        "Database security preflight requires isolation refs.",
      ),
    );
    return null;
  }

  const normalized: DatabaseSecurityIsolationRefInput[] = [];
  const seenKinds = new Set<string>();

  for (let index = 0; index < value.length; index += 1) {
    const rawRef = value[index];
    if (!isPlainObject(rawRef)) {
      errors.push(
        databaseSecurityError(
          "database_security.invalid_isolation_ref",
          `/isolation_refs/${index}`,
          "Isolation ref must be an object.",
        ),
      );
      continue;
    }

    const isolationKind = rawRef.isolation_kind;
    if (!isDatabaseSecurityIsolationRefKind(isolationKind)) {
      errors.push(
        databaseSecurityError(
          "database_security.invalid_isolation_ref",
          `/isolation_refs/${index}/isolation_kind`,
          "Isolation ref kind is unsupported.",
        ),
      );
      continue;
    }
    seenKinds.add(isolationKind);

    const isolationRefPath = normalizeRepoRef(
      rawRef.isolation_ref,
      `/isolation_refs/${index}/isolation_ref`,
      "database_security.invalid_isolation_ref",
      errors,
    );
    const summary = normalizeSafeSummary(
      rawRef.summary,
      `/isolation_refs/${index}/summary`,
      "database_security.invalid_isolation_ref",
      errors,
    );

    if (rawRef.current_state !== "source_ref_only_no_policy_execution") {
      errors.push(
        databaseSecurityError(
          "database_security.invalid_isolation_ref",
          `/isolation_refs/${index}/current_state`,
          "Isolation refs must remain source-only with no policy execution.",
        ),
      );
    }
    if (rawRef.target_gate !== databaseSecurityPreflightTargetGate) {
      errors.push(
        databaseSecurityError(
          "database_security.invalid_isolation_ref",
          `/isolation_refs/${index}/target_gate`,
          "Isolation refs must target G05 database security.",
        ),
      );
    }
    if (rawRef.tenant_project_scope_required !== true) {
      errors.push(
        databaseSecurityError(
          "database_security.invalid_isolation_ref",
          `/isolation_refs/${index}/tenant_project_scope_required`,
          "Isolation refs must require tenant/project scope.",
        ),
      );
    }
    if (rawRef.database_policy_execution_allowed !== false) {
      errors.push(
        blockedCapabilityError(
          "policy_ddl_execution_allowed",
          `/isolation_refs/${index}/database_policy_execution_allowed`,
        ),
      );
    }
    if (rawRef.live_storage_allowed !== false) {
      errors.push(
        blockedCapabilityError(
          "live_storage_allowed",
          `/isolation_refs/${index}/live_storage_allowed`,
        ),
      );
    }

    if (
      isolationRefPath === null ||
      summary === null ||
      rawRef.current_state !== "source_ref_only_no_policy_execution" ||
      rawRef.target_gate !== databaseSecurityPreflightTargetGate ||
      rawRef.tenant_project_scope_required !== true ||
      rawRef.database_policy_execution_allowed !== false ||
      rawRef.live_storage_allowed !== false
    ) {
      continue;
    }

    normalized.push({
      isolation_ref: isolationRefPath,
      isolation_kind: isolationKind,
      summary,
      current_state: "source_ref_only_no_policy_execution",
      target_gate: databaseSecurityPreflightTargetGate,
      tenant_project_scope_required: true,
      database_policy_execution_allowed: false,
      live_storage_allowed: false,
    });
  }

  for (const requiredKind of databaseSecurityIsolationRefKinds) {
    if (!seenKinds.has(requiredKind)) {
      errors.push(
        databaseSecurityError(
          "database_security.isolation_ref_required",
          "/isolation_refs",
          "Database security preflight is missing a required isolation ref kind.",
        ),
      );
    }
  }

  return normalized;
}

function normalizeRoleBoundaryRefs(
  value: unknown,
  errors: DatabaseSecurityPreflightError[],
): DatabaseSecurityRoleBoundaryRefInput[] | null {
  if (!Array.isArray(value)) {
    errors.push(
      databaseSecurityError(
        "database_security.role_boundary_ref_required",
        "/role_boundary_refs",
        "Database security preflight requires role boundary refs.",
      ),
    );
    return null;
  }

  const normalized: DatabaseSecurityRoleBoundaryRefInput[] = [];
  const seenKinds = new Set<string>();

  for (let index = 0; index < value.length; index += 1) {
    const rawRef = value[index];
    if (!isPlainObject(rawRef)) {
      errors.push(
        databaseSecurityError(
          "database_security.invalid_role_boundary_ref",
          `/role_boundary_refs/${index}`,
          "Role boundary ref must be an object.",
        ),
      );
      continue;
    }

    const roleKind = rawRef.role_kind;
    if (!isDatabaseSecurityRoleBoundaryKind(roleKind)) {
      errors.push(
        databaseSecurityError(
          "database_security.invalid_role_boundary_ref",
          `/role_boundary_refs/${index}/role_kind`,
          "Role boundary kind is unsupported.",
        ),
      );
      continue;
    }
    seenKinds.add(roleKind);

    const roleRef = normalizeRepoRef(
      rawRef.role_ref,
      `/role_boundary_refs/${index}/role_ref`,
      "database_security.invalid_role_boundary_ref",
      errors,
    );
    const summary = normalizeSafeSummary(
      rawRef.summary,
      `/role_boundary_refs/${index}/summary`,
      "database_security.invalid_role_boundary_ref",
      errors,
    );

    if (rawRef.current_state !== "source_ref_only_no_role_or_grant_mutation") {
      errors.push(
        databaseSecurityError(
          "database_security.invalid_role_boundary_ref",
          `/role_boundary_refs/${index}/current_state`,
          "Role boundary refs must remain source-only with no role or grant mutation.",
        ),
      );
    }
    if (rawRef.database_role_connection_allowed !== false) {
      errors.push(
        blockedCapabilityError(
          "database_role_connection_allowed",
          `/role_boundary_refs/${index}/database_role_connection_allowed`,
        ),
      );
    }
    if (rawRef.grant_mutation_allowed !== false) {
      errors.push(
        blockedCapabilityError(
          "role_grant_mutation_allowed",
          `/role_boundary_refs/${index}/grant_mutation_allowed`,
        ),
      );
    }
    if (rawRef.sql_execution_allowed !== false) {
      errors.push(
        blockedCapabilityError(
          "sql_execution_allowed",
          `/role_boundary_refs/${index}/sql_execution_allowed`,
        ),
      );
    }
    if (rawRef.superuser_role_allowed !== false) {
      errors.push(
        blockedCapabilityError(
          "superuser_role_allowed",
          `/role_boundary_refs/${index}/superuser_role_allowed`,
        ),
      );
    }
    if (rawRef.bypass_rls_allowed !== false) {
      errors.push(
        blockedCapabilityError(
          "bypass_rls_allowed",
          `/role_boundary_refs/${index}/bypass_rls_allowed`,
        ),
      );
    }

    if (
      roleRef === null ||
      summary === null ||
      rawRef.current_state !== "source_ref_only_no_role_or_grant_mutation" ||
      rawRef.database_role_connection_allowed !== false ||
      rawRef.grant_mutation_allowed !== false ||
      rawRef.sql_execution_allowed !== false ||
      rawRef.superuser_role_allowed !== false ||
      rawRef.bypass_rls_allowed !== false
    ) {
      continue;
    }

    normalized.push({
      role_ref: roleRef,
      role_kind: roleKind,
      summary,
      current_state: "source_ref_only_no_role_or_grant_mutation",
      database_role_connection_allowed: false,
      grant_mutation_allowed: false,
      sql_execution_allowed: false,
      superuser_role_allowed: false,
      bypass_rls_allowed: false,
    });
  }

  for (const requiredKind of databaseSecurityRoleBoundaryKinds) {
    if (!seenKinds.has(requiredKind)) {
      errors.push(
        databaseSecurityError(
          "database_security.role_boundary_ref_required",
          "/role_boundary_refs",
          "Database security preflight is missing a required role boundary kind.",
        ),
      );
    }
  }

  return normalized;
}

function normalizeGrantRefs(
  value: unknown,
  errors: DatabaseSecurityPreflightError[],
): DatabaseSecurityGrantRefInput[] | null {
  if (!Array.isArray(value)) {
    errors.push(
      databaseSecurityError(
        "database_security.grant_ref_required",
        "/grant_refs",
        "Database security preflight requires deny-by-default grant refs.",
      ),
    );
    return null;
  }

  const normalized: DatabaseSecurityGrantRefInput[] = [];
  const seenKinds = new Set<string>();

  for (let index = 0; index < value.length; index += 1) {
    const rawRef = value[index];
    if (!isPlainObject(rawRef)) {
      errors.push(
        databaseSecurityError(
          "database_security.invalid_grant_ref",
          `/grant_refs/${index}`,
          "Grant ref must be an object.",
        ),
      );
      continue;
    }

    const grantKind = rawRef.grant_kind;
    if (!isDatabaseSecurityGrantKind(grantKind)) {
      errors.push(
        databaseSecurityError(
          "database_security.invalid_grant_ref",
          `/grant_refs/${index}/grant_kind`,
          "Grant ref kind is unsupported.",
        ),
      );
      continue;
    }
    seenKinds.add(grantKind);

    const grantPath = normalizeRepoRef(
      rawRef.grant_ref,
      `/grant_refs/${index}/grant_ref`,
      "database_security.invalid_grant_ref",
      errors,
    );
    const summary = normalizeSafeSummary(
      rawRef.summary,
      `/grant_refs/${index}/summary`,
      "database_security.invalid_grant_ref",
      errors,
    );

    if (rawRef.current_state !== "source_ref_only_deny_by_default") {
      errors.push(
        databaseSecurityError(
          "database_security.invalid_grant_ref",
          `/grant_refs/${index}/current_state`,
          "Grant refs must remain source-only and deny-by-default.",
        ),
      );
    }
    if (rawRef.deny_by_default !== true) {
      errors.push(
        databaseSecurityError(
          "database_security.invalid_grant_ref",
          `/grant_refs/${index}/deny_by_default`,
          "Grant refs must preserve deny-by-default posture.",
        ),
      );
    }
    if (rawRef.grant_application_allowed !== false) {
      errors.push(
        blockedCapabilityError(
          "grant_application_allowed",
          `/grant_refs/${index}/grant_application_allowed`,
        ),
      );
    }
    if (rawRef.role_grant_mutation_allowed !== false) {
      errors.push(
        blockedCapabilityError(
          "role_grant_mutation_allowed",
          `/grant_refs/${index}/role_grant_mutation_allowed`,
        ),
      );
    }
    if (rawRef.broad_audit_mutation_allowed !== false) {
      errors.push(
        blockedCapabilityError(
          "broad_audit_mutation_allowed",
          `/grant_refs/${index}/broad_audit_mutation_allowed`,
        ),
      );
    }

    if (
      grantPath === null ||
      summary === null ||
      rawRef.current_state !== "source_ref_only_deny_by_default" ||
      rawRef.deny_by_default !== true ||
      rawRef.grant_application_allowed !== false ||
      rawRef.role_grant_mutation_allowed !== false ||
      rawRef.broad_audit_mutation_allowed !== false
    ) {
      continue;
    }

    normalized.push({
      grant_ref: grantPath,
      grant_kind: grantKind,
      summary,
      current_state: "source_ref_only_deny_by_default",
      deny_by_default: true,
      grant_application_allowed: false,
      role_grant_mutation_allowed: false,
      broad_audit_mutation_allowed: false,
    });
  }

  for (const requiredKind of databaseSecurityGrantRefKinds) {
    if (!seenKinds.has(requiredKind)) {
      errors.push(
        databaseSecurityError(
          "database_security.grant_ref_required",
          "/grant_refs",
          "Database security preflight is missing a required grant ref kind.",
        ),
      );
    }
  }

  return normalized;
}

function normalizeStaticChecks(
  value: unknown,
  errors: DatabaseSecurityPreflightError[],
): DatabaseSecurityStaticCheckInput[] | null {
  if (!Array.isArray(value)) {
    errors.push(
      databaseSecurityError(
        "database_security.static_check_required",
        "/static_checks",
        "Database security preflight requires static check refs.",
      ),
    );
    return null;
  }

  const normalized: DatabaseSecurityStaticCheckInput[] = [];
  const seenIds = new Set<string>();

  for (let index = 0; index < value.length; index += 1) {
    const rawCheck = value[index];
    if (!isPlainObject(rawCheck)) {
      errors.push(
        databaseSecurityError(
          "database_security.invalid_static_check",
          `/static_checks/${index}`,
          "Static check must be an object.",
        ),
      );
      continue;
    }

    const checkId = rawCheck.check_id;
    if (!isDatabaseSecurityStaticCheckId(checkId)) {
      errors.push(
        databaseSecurityError(
          "database_security.invalid_static_check",
          `/static_checks/${index}/check_id`,
          "Static check id is unsupported.",
        ),
      );
      continue;
    }
    seenIds.add(checkId);

    const sourceRef = normalizeRepoRef(
      rawCheck.source_ref,
      `/static_checks/${index}/source_ref`,
      "database_security.invalid_static_check",
      errors,
    );

    if (!isDatabaseSecurityCheckKind(rawCheck.check_kind)) {
      errors.push(
        databaseSecurityError(
          "database_security.invalid_static_check",
          `/static_checks/${index}/check_kind`,
          "Static check kind is unsupported.",
        ),
      );
    }
    if (rawCheck.required_gate !== databaseSecurityPreflightTargetGate) {
      errors.push(
        databaseSecurityError(
          "database_security.invalid_static_check",
          `/static_checks/${index}/required_gate`,
          "Static checks must target G05 database security.",
        ),
      );
    }
    if (rawCheck.current_state !== "static_check_ref_only") {
      errors.push(
        databaseSecurityError(
          "database_security.invalid_static_check",
          `/static_checks/${index}/current_state`,
          "Static checks must remain source refs only.",
        ),
      );
    }
    if (rawCheck.execution_allowed !== false) {
      errors.push(
        blockedCapabilityError(
          "database_security_runtime_allowed",
          `/static_checks/${index}/execution_allowed`,
        ),
      );
    }
    if (rawCheck.raw_sql_allowed !== false) {
      errors.push(
        blockedCapabilityError(
          "sql_execution_allowed",
          `/static_checks/${index}/raw_sql_allowed`,
        ),
      );
    }

    if (
      sourceRef === null ||
      !isDatabaseSecurityCheckKind(rawCheck.check_kind) ||
      rawCheck.required_gate !== databaseSecurityPreflightTargetGate ||
      rawCheck.current_state !== "static_check_ref_only" ||
      rawCheck.execution_allowed !== false ||
      rawCheck.raw_sql_allowed !== false
    ) {
      continue;
    }

    normalized.push({
      check_id: checkId,
      check_kind: rawCheck.check_kind,
      source_ref: sourceRef,
      required_gate: databaseSecurityPreflightTargetGate,
      current_state: "static_check_ref_only",
      execution_allowed: false,
      raw_sql_allowed: false,
    });
  }

  for (const requiredCheckId of databaseSecurityStaticCheckIds) {
    if (!seenIds.has(requiredCheckId)) {
      errors.push(
        databaseSecurityError(
          "database_security.static_check_required",
          "/static_checks",
          "Database security preflight is missing a required static check id.",
        ),
      );
    }
  }

  return normalized;
}

function normalizeNoConnectionPosture(
  value: unknown,
  errors: DatabaseSecurityPreflightError[],
): DatabaseSecurityNoConnectionPostureInput | null {
  if (!isPlainObject(value)) {
    errors.push(
      databaseSecurityError(
        "database_security.no_connection_posture_required",
        "/no_connection_posture",
        "Database security preflight requires a no-connection posture.",
      ),
    );
    return null;
  }

  const requiredFalseFields = [
    "database_url_allowed",
    "connection_string_allowed",
    "database_connection_allowed",
    "database_write_allowed",
    "sql_execution_allowed",
    "ddl_execution_allowed",
    "policy_ddl_execution_allowed",
    "role_grant_execution_allowed",
    "role_grant_mutation_allowed",
    "grant_application_allowed",
    "live_storage_allowed",
    "environment_secret_lookup_allowed",
  ] as const;

  let valid = true;
  for (const field of requiredFalseFields) {
    if (value[field] !== false) {
      errors.push(blockedCapabilityError(field, `/no_connection_posture/${field}`));
      valid = false;
    }
  }

  if (!valid) {
    return null;
  }

  return { ...defaultDatabaseSecurityNoConnectionPosture };
}

function normalizeSourceRefs(
  value: unknown,
  errors: DatabaseSecurityPreflightError[],
): string[] | null {
  if (!Array.isArray(value)) {
    errors.push(
      databaseSecurityError(
        "database_security.source_ref_required",
        "/source_refs",
        "Database security preflight requires source refs.",
      ),
    );
    return null;
  }

  const normalized: string[] = [];

  for (let index = 0; index < value.length; index += 1) {
    const rawRef = value[index];
    if (!isPlainObject(rawRef)) {
      errors.push(
        databaseSecurityError(
          "database_security.invalid_source_ref",
          `/source_refs/${index}`,
          "Source ref must be an object.",
        ),
      );
      continue;
    }

    const sourceRef = normalizeRepoRef(
      rawRef.source_ref,
      `/source_refs/${index}/source_ref`,
      "database_security.invalid_source_ref",
      errors,
    );
    const summary = normalizeSafeSummary(
      rawRef.summary,
      `/source_refs/${index}/summary`,
      "database_security.invalid_source_ref",
      errors,
    );

    if (sourceRef !== null && summary !== null) {
      normalized.push(sourceRef);
    }
  }

  if (normalized.length === 0) {
    errors.push(
      databaseSecurityError(
        "database_security.source_ref_required",
        "/source_refs",
        "Database security preflight needs at least one valid source ref.",
      ),
    );
    return null;
  }

  return [...new Set(normalized)];
}

function normalizeAllowedState(
  value: unknown,
  errors: DatabaseSecurityPreflightError[],
): DatabaseSecurityAllowedStateInput | null {
  if (!isPlainObject(value)) {
    errors.push(
      databaseSecurityError(
        "database_security.allowed_state_required",
        "/allowed_state",
        "Database security preflight requires allowed state evidence.",
      ),
    );
    return null;
  }

  const requiredTrueFields = [
    "source_only_database_security_preflight_allowed",
    "tenant_project_isolation_refs_allowed",
    "role_boundary_refs_allowed",
    "deny_by_default_grant_refs_allowed",
    "static_check_refs_allowed",
  ] as const;
  const requiredFalseFields = [
    "database_connection_allowed",
    "database_write_allowed",
    "sql_execution_allowed",
    "ddl_execution_allowed",
    "role_grant_mutation_allowed",
    "role_grant_execution_allowed",
    "grant_application_allowed",
    "broad_audit_mutation_allowed",
    "superuser_role_allowed",
    "bypass_rls_allowed",
    "writer_implementation_allowed",
    "migration_execution_allowed",
    "auth_session_runtime_allowed",
    "integration_setup_write_allowed",
    "runtime_adapter_implementation_allowed",
    "os_connector_package_allowed",
    "live_storage_allowed",
    "live_execution_allowed",
    "python_runtime_required",
    "os_specific_binary_required",
  ] as const;

  let valid = true;
  for (const field of requiredTrueFields) {
    if (value[field] !== true) {
      errors.push(
        databaseSecurityError(
          "database_security.allowed_state_drift",
          `/allowed_state/${field}`,
          "Database security source-only evidence must stay enabled.",
        ),
      );
      valid = false;
    }
  }

  for (const field of requiredFalseFields) {
    if (value[field] !== false) {
      errors.push(blockedCapabilityError(field, `/allowed_state/${field}`));
      valid = false;
    }
  }

  if (value.secret_posture !== "references_only_no_values") {
    errors.push(
      databaseSecurityError(
        "database_security.secret_value_forbidden",
        "/allowed_state/secret_posture",
        "Database security preflight stores only secret references, never values.",
      ),
    );
    valid = false;
  }

  if (!valid) {
    return null;
  }

  return { ...defaultDatabaseSecurityAllowedState };
}

function normalizeRepoRef(
  value: unknown,
  path: string,
  fallbackCode: DatabaseSecurityPreflightErrorCode,
  errors: DatabaseSecurityPreflightError[],
): string | null {
  if (typeof value !== "string" || !isSafeRepoPath(value)) {
    errors.push(
      databaseSecurityError(
        fallbackCode,
        path,
        "Reference must be a safe repo-local source path.",
      ),
    );
    return null;
  }

  const forbiddenCode = forbiddenContentCode(value);
  if (forbiddenCode !== null) {
    errors.push(
      databaseSecurityError(
        forbiddenCode,
        path,
        "Reference contains blocked DB, SQL, role/grant, or secret-like content.",
      ),
    );
    return null;
  }

  return value;
}

function normalizeSafeSummary(
  value: unknown,
  path: string,
  fallbackCode: DatabaseSecurityPreflightErrorCode,
  errors: DatabaseSecurityPreflightError[],
): string | null {
  if (typeof value !== "string" || value.trim().length === 0) {
    errors.push(
      databaseSecurityError(fallbackCode, path, "Summary must be a nonempty string."),
    );
    return null;
  }

  const forbiddenCode = forbiddenContentCode(value);
  if (forbiddenCode !== null) {
    errors.push(
      databaseSecurityError(
        forbiddenCode,
        path,
        "Summary contains blocked DB, SQL, role/grant, or secret-like content.",
      ),
    );
    return null;
  }

  return value.trim();
}

function validateSideEffects(
  sideEffects: unknown,
  path: string,
  errors: DatabaseSecurityPreflightError[],
): void {
  if (sideEffects === undefined) {
    return;
  }

  if (!Array.isArray(sideEffects) || sideEffects.length > 0) {
    errors.push(
      databaseSecurityError(
        "database_security.side_effects_forbidden",
        path,
        "Database security preflight must not produce side effects.",
      ),
    );
  }
}

function blockedCapabilityError(
  flag: string,
  path: string,
): DatabaseSecurityPreflightError {
  if (flag === "python_runtime_required") {
    return databaseSecurityError(
      "database_security.python_runtime_requirement_forbidden",
      path,
      "Python runtime is not required by core MVP database security evidence.",
    );
  }
  if (flag === "os_specific_binary_required") {
    return databaseSecurityError(
      "database_security.os_specific_binary_requirement_forbidden",
      path,
      "OS-specific binary is not required by core MVP database security evidence.",
    );
  }
  if (
    flag.includes("database") ||
    flag.includes("connection") ||
    flag.includes("sql") ||
    flag.includes("ddl")
  ) {
    return databaseSecurityError(
      "database_security.connection_or_sql_forbidden",
      path,
      "Database, SQL, DDL, and connection behavior remains blocked.",
    );
  }
  if (
    flag.includes("role") ||
    flag.includes("grant") ||
    flag.includes("broad_audit") ||
    flag.includes("superuser") ||
    flag.includes("bypass_rls")
  ) {
    return databaseSecurityError(
      "database_security.role_grant_forbidden",
      path,
      "Role, grant, broad audit mutation, superuser, and bypass RLS behavior remains blocked.",
    );
  }
  if (
    flag.includes("writer") ||
    flag.includes("idempotency") ||
    flag.includes("audit_append")
  ) {
    return databaseSecurityError(
      "database_security.writer_implementation_forbidden",
      path,
      "Writer implementation behavior remains blocked.",
    );
  }
  if (flag.includes("migration") || flag.includes("runner")) {
    return databaseSecurityError(
      "database_security.migration_execution_forbidden",
      path,
      "Migration execution behavior remains blocked.",
    );
  }
  if (flag.includes("live") || flag.includes("runtime") || flag.includes("queue")) {
    return databaseSecurityError(
      "database_security.live_execution_forbidden",
      path,
      "Live, runtime, and queue behavior remains blocked.",
    );
  }

  return databaseSecurityError(
    "database_security.blocked_capability_forbidden",
    path,
    "Blocked capability remains closed.",
  );
}

function databaseSecurityError(
  code: DatabaseSecurityPreflightErrorCode,
  path: string,
  message: string,
): DatabaseSecurityPreflightError {
  return {
    code,
    path,
    message,
    severity: "error",
  };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPersistencePolicyGateId(value: unknown): value is PersistencePolicyGateId {
  return typeof value === "string" && gateIdSet.has(value);
}

function isPersistenceSchemaEntityName(
  value: unknown,
): value is PersistenceSchemaEntityName {
  return typeof value === "string" && schemaEntitySet.has(value);
}

function isDatabaseSecurityIsolationRefKind(
  value: unknown,
): value is DatabaseSecurityIsolationRefKind {
  return typeof value === "string" && isolationKindSet.has(value);
}

function isDatabaseSecurityRoleBoundaryKind(
  value: unknown,
): value is DatabaseSecurityRoleBoundaryKind {
  return typeof value === "string" && roleBoundaryKindSet.has(value);
}

function isDatabaseSecurityGrantKind(
  value: unknown,
): value is DatabaseSecurityGrantRefKind {
  return typeof value === "string" && grantKindSet.has(value);
}

function isDatabaseSecurityStaticCheckId(
  value: unknown,
): value is DatabaseSecurityStaticCheckId {
  return typeof value === "string" && staticCheckIdSet.has(value);
}

function isDatabaseSecurityCheckKind(
  value: unknown,
): value is DatabaseSecurityStaticCheckInput["check_kind"] {
  return (
    value === "tenant_project_isolation" ||
    value === "role_boundary" ||
    value === "deny_by_default_grant" ||
    value === "broad_audit_mutation" ||
    value === "no_connection" ||
    value === "no_role_grant_execution" ||
    value === "no_secret" ||
    value === "no_sql_or_ddl"
  );
}

function isSafeRepoPath(value: string): boolean {
  if (value.length === 0 || value.length > 220) {
    return false;
  }
  if (
    value.startsWith("/") ||
    value.includes("..") ||
    value.includes("\0") ||
    value.includes("://")
  ) {
    return false;
  }
  return /^[A-Za-z0-9._/@#-]+$/.test(value);
}

function forbiddenContentCode(
  value: string,
): DatabaseSecurityPreflightErrorCode | null {
  if (
    /\b(DATABASE_URL|connection_string)\b|postgres(?:ql)?:\/\/|mysql:\/\/|sqlite:\/\/|password=/i.test(
      value,
    )
  ) {
    return "database_security.connection_or_sql_forbidden";
  }
  if (/\b(secret|api[_-]?key|token|private[_-]?key)\b|sk-[A-Za-z0-9]/i.test(value)) {
    return "database_security.secret_value_forbidden";
  }
  if (
    /\b(create\s+role|alter\s+role|grant\s+|revoke\s+|create\s+policy|alter\s+policy|drop\s+policy|bypassrls|superuser|psql\s|sql`)\b/i.test(
      value,
    )
  ) {
    return "database_security.role_grant_forbidden";
  }
  return null;
}
