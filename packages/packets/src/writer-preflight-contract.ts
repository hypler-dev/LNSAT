import {
  migrationArtifactStaticReviewBlockedCapabilityFlags,
  migrationArtifactStaticReviewContract,
  type MigrationArtifactStaticReviewBlockedCapabilityFlag,
} from "./migration-artifact-static-review.js";
import {
  persistencePolicyGateIds,
  type PersistencePolicyGateId,
} from "./persistence-policy-gate.js";
import {
  persistenceSchemaEntityNames,
  type PersistenceSchemaEntityName,
} from "./persistence-schema-contract.js";

export const WRITER_PREFLIGHT_CONTRACT_STATUS = "source_only";

export const writerPreflightTargetGate =
  "G04_WRITER_PREFLIGHT" satisfies PersistencePolicyGateId;

export const writerPreflightInterfaceRefKinds = [
  "append_only_writer_interface_ref",
  "writer_persistence_preflight_ref",
  "gateway_inspection_ref",
] as const;

export const writerPreflightIdempotencyRefKinds = [
  "deterministic_key_ref",
  "exact_replay_ref",
  "digest_collision_ref",
] as const;

export const writerPreflightRedactionCheckIds = [
  "RAW_COMMAND_WITHHELD",
  "RAW_REJECTED_VALUE_WITHHELD",
  "SECRET_VALUE_WITHHELD",
  "RAW_PAYLOAD_ECHO_BLOCKED",
] as const;

export const writerPreflightAuditObligationKinds = [
  "policy_gate_ref",
  "approval_request_ref",
  "append_only_audit_ref",
  "rollback_ref",
] as const;

export const writerPreflightAdditionalBlockedCapabilityFlags = [
  "persisted_state_writer_allowed",
  "writer_interface_execution_allowed",
  "writer_preflight_execution_allowed",
  "idempotency_storage_lookup_allowed",
  "idempotency_mutation_allowed",
  "redaction_runtime_allowed",
  "audit_append_allowed",
  "environment_secret_lookup_allowed",
] as const;

export const writerPreflightBlockedCapabilityFlags = [
  ...migrationArtifactStaticReviewBlockedCapabilityFlags,
  ...writerPreflightAdditionalBlockedCapabilityFlags,
] as const;

export const writerPreflightContract = {
  contract_id: "lnsat.platform.writer_preflight_contract.v0_1",
  authority: ["@lnsat/packets", "source-backed-writer-preflight-contract"],
  preflight_version: "0.1",
  source_docs: [
    "docs/architecture/PERSISTENCE_AND_POLICY_GATE_REVIEW.md",
    "docs/architecture/PERSISTENCE_SCHEMA_PLAN.md",
    "docs/architecture/AUDIT_LEDGER_WRITER_PERSISTENCE_PREFLIGHT.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
  ],
  migration_static_review_contract_id:
    migrationArtifactStaticReviewContract.contract_id,
  target_gate: writerPreflightTargetGate,
  gate_ids: persistencePolicyGateIds,
  required_entity_names: persistenceSchemaEntityNames,
  interface_ref_kinds: writerPreflightInterfaceRefKinds,
  idempotency_ref_kinds: writerPreflightIdempotencyRefKinds,
  redaction_check_ids: writerPreflightRedactionCheckIds,
  audit_obligation_kinds: writerPreflightAuditObligationKinds,
  blocked_capability_flags: writerPreflightBlockedCapabilityFlags,
  contract_authority: "source_only_writer_preflight_no_storage_no_writer",
  source_only_writer_preflight_allowed: true,
  writer_interface_refs_allowed: true,
  idempotency_refs_allowed: true,
  redaction_checks_allowed: true,
  audit_obligation_refs_allowed: true,
  writer_implementation_allowed: false,
  persisted_state_writer_allowed: false,
  database_connection_allowed: false,
  database_write_allowed: false,
  migration_execution_allowed: false,
  queue_mutation_allowed: false,
  live_storage_allowed: false,
  live_execution_allowed: false,
  python_runtime_required: false,
  os_specific_binary_required: false,
  side_effects: [],
  status: "source_only",
} as const;

export type WriterPreflightInterfaceRefKind =
  (typeof writerPreflightInterfaceRefKinds)[number];
export type WriterPreflightIdempotencyRefKind =
  (typeof writerPreflightIdempotencyRefKinds)[number];
export type WriterPreflightRedactionCheckId =
  (typeof writerPreflightRedactionCheckIds)[number];
export type WriterPreflightAuditObligationKind =
  (typeof writerPreflightAuditObligationKinds)[number];
export type WriterPreflightAdditionalBlockedCapabilityFlag =
  (typeof writerPreflightAdditionalBlockedCapabilityFlags)[number];
export type WriterPreflightBlockedCapabilityFlag =
  | MigrationArtifactStaticReviewBlockedCapabilityFlag
  | WriterPreflightAdditionalBlockedCapabilityFlag;

export type WriterPreflightSourceRefInput = {
  source_ref: string;
  summary: string;
};

export type WriterPreflightSchemaEntityRefInput = {
  entity_name: PersistenceSchemaEntityName;
  schema_contract_ref: string;
  writer_preflight_ref: string;
  current_state: "source_ref_only";
  target_gate: typeof writerPreflightTargetGate;
  live_storage_allowed: false;
};

export type WriterPreflightWriterInterfaceRefInput = {
  interface_ref: string;
  interface_kind: WriterPreflightInterfaceRefKind;
  summary: string;
  current_state: "source_ref_only_no_writer_implementation";
  append_only: true;
  implementation_allowed: false;
  live_storage_allowed: false;
};

export type WriterPreflightIdempotencyRefInput = {
  idempotency_ref: string;
  idempotency_kind: WriterPreflightIdempotencyRefKind;
  behavior:
    | "deterministic_key_required"
    | "exact_replay_returns_existing_ref"
    | "digest_collision_fails_closed";
  current_state: "source_ref_only";
  storage_lookup_allowed: false;
  mutation_allowed: false;
};

export type WriterPreflightRedactionCheckInput = {
  check_id: WriterPreflightRedactionCheckId;
  check_kind: "raw_command" | "raw_rejected_value" | "secret_value" | "raw_payload";
  source_ref: string;
  action: "withhold_before_persistence";
  current_state: "source_ref_only";
  raw_value_echo_allowed: false;
};

export type WriterPreflightAuditObligationRefInput = {
  obligation_ref: string;
  obligation_kind: WriterPreflightAuditObligationKind;
  required_gate: typeof writerPreflightTargetGate;
  current_state: "source_ref_only";
  audit_write_allowed: false;
};

export type WriterPreflightNoStoragePostureInput = {
  database_url_allowed: false;
  connection_string_allowed: false;
  database_connection_allowed: false;
  database_write_allowed: false;
  writer_implementation_allowed: false;
  persisted_state_writer_allowed: false;
  queue_mutation_allowed: false;
  live_storage_allowed: false;
  environment_secret_lookup_allowed: false;
};

export type WriterPreflightAllowedStateInput = {
  source_only_writer_preflight_allowed: true;
  writer_interface_refs_allowed: true;
  idempotency_refs_allowed: true;
  redaction_checks_allowed: true;
  audit_obligation_refs_allowed: true;
  writer_implementation_allowed: false;
  persisted_state_writer_allowed: false;
  database_connection_allowed: false;
  database_write_allowed: false;
  migration_execution_allowed: false;
  queue_mutation_allowed: false;
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

export type WriterPreflightContractRequest = Partial<
  Record<WriterPreflightBlockedCapabilityFlag, false>
> & {
  preflight_version?: typeof writerPreflightContract.preflight_version;
  gate_sequence?: PersistencePolicyGateId[];
  schema_entity_refs?: WriterPreflightSchemaEntityRefInput[];
  writer_interface_refs?: WriterPreflightWriterInterfaceRefInput[];
  idempotency_refs?: WriterPreflightIdempotencyRefInput[];
  redaction_checks?: WriterPreflightRedactionCheckInput[];
  audit_obligation_refs?: WriterPreflightAuditObligationRefInput[];
  no_storage_posture?: WriterPreflightNoStoragePostureInput;
  source_refs?: WriterPreflightSourceRefInput[];
  allowed_state?: WriterPreflightAllowedStateInput;
  contract_authority?: typeof writerPreflightContract.contract_authority;
  side_effects?: [];
};

export type WriterPreflightContractErrorCode =
  | "writer_preflight.invalid_request"
  | "writer_preflight.unexpected_field"
  | "writer_preflight.invalid_version"
  | "writer_preflight.gate_sequence_required"
  | "writer_preflight.gate_order_drift"
  | "writer_preflight.schema_entity_ref_required"
  | "writer_preflight.schema_entity_ref_drift"
  | "writer_preflight.writer_interface_ref_required"
  | "writer_preflight.invalid_writer_interface_ref"
  | "writer_preflight.idempotency_ref_required"
  | "writer_preflight.invalid_idempotency_ref"
  | "writer_preflight.redaction_check_required"
  | "writer_preflight.invalid_redaction_check"
  | "writer_preflight.audit_obligation_ref_required"
  | "writer_preflight.invalid_audit_obligation_ref"
  | "writer_preflight.no_storage_posture_required"
  | "writer_preflight.no_storage_posture_drift"
  | "writer_preflight.source_ref_required"
  | "writer_preflight.invalid_source_ref"
  | "writer_preflight.allowed_state_required"
  | "writer_preflight.allowed_state_drift"
  | "writer_preflight.unsafe_contract_authority"
  | "writer_preflight.secret_value_forbidden"
  | "writer_preflight.connection_string_forbidden"
  | "writer_preflight.writer_implementation_forbidden"
  | "writer_preflight.migration_execution_forbidden"
  | "writer_preflight.live_execution_forbidden"
  | "writer_preflight.python_runtime_requirement_forbidden"
  | "writer_preflight.os_specific_binary_requirement_forbidden"
  | "writer_preflight.blocked_capability_forbidden"
  | "writer_preflight.side_effects_forbidden";

export type WriterPreflightContractError = {
  code: WriterPreflightContractErrorCode;
  path: string;
  message: string;
  severity: "error";
};

export type WriterPreflightContractEvidence = {
  contract_id: typeof writerPreflightContract.contract_id;
  preflight_version: typeof writerPreflightContract.preflight_version;
  target_gate: typeof writerPreflightTargetGate;
  migration_static_review_contract_id: typeof migrationArtifactStaticReviewContract.contract_id;
  required_gate_ids: PersistencePolicyGateId[];
  required_entity_names: PersistenceSchemaEntityName[];
  schema_entity_refs: WriterPreflightSchemaEntityRefInput[];
  writer_interface_refs: WriterPreflightWriterInterfaceRefInput[];
  idempotency_refs: WriterPreflightIdempotencyRefInput[];
  redaction_checks: WriterPreflightRedactionCheckInput[];
  audit_obligation_refs: WriterPreflightAuditObligationRefInput[];
  no_storage_posture: WriterPreflightNoStoragePostureInput;
  source_refs: string[];
  allowed_state: WriterPreflightAllowedStateInput;
  blocked_capabilities: WriterPreflightBlockedCapabilityFlag[];
  implementation_artifacts: [];
  writer_execution_artifacts: [];
  database_connection_allowed: false;
  database_write_allowed: false;
  writer_implementation_allowed: false;
  persisted_state_writer_allowed: false;
  live_storage_allowed: false;
  live_execution_allowed: false;
  python_runtime_required: false;
  os_specific_binary_required: false;
  side_effects: [];
};

export type WriterPreflightContractResult =
  | {
      ok: true;
      writer_preflight_contract: WriterPreflightContractEvidence;
      errors: [];
      side_effects: [];
    }
  | {
      ok: false;
      writer_preflight_contract: null;
      errors: WriterPreflightContractError[];
      raw_input_content: "withheld";
      side_effects: [];
    };

type NormalizedWriterPreflightRequest =
  | {
      ok: true;
      gate_sequence: PersistencePolicyGateId[];
      schema_entity_refs: WriterPreflightSchemaEntityRefInput[];
      writer_interface_refs: WriterPreflightWriterInterfaceRefInput[];
      idempotency_refs: WriterPreflightIdempotencyRefInput[];
      redaction_checks: WriterPreflightRedactionCheckInput[];
      audit_obligation_refs: WriterPreflightAuditObligationRefInput[];
      no_storage_posture: WriterPreflightNoStoragePostureInput;
      source_refs: string[];
      allowed_state: WriterPreflightAllowedStateInput;
    }
  | {
      ok: false;
      errors: WriterPreflightContractError[];
    };

const requestKeys = new Set([
  "preflight_version",
  "gate_sequence",
  "schema_entity_refs",
  "writer_interface_refs",
  "idempotency_refs",
  "redaction_checks",
  "audit_obligation_refs",
  "no_storage_posture",
  "source_refs",
  "allowed_state",
  "contract_authority",
  "side_effects",
  ...writerPreflightBlockedCapabilityFlags,
]);

const gateIdSet = new Set<string>(persistencePolicyGateIds);
const schemaEntitySet = new Set<string>(persistenceSchemaEntityNames);
const interfaceKindSet = new Set<string>(writerPreflightInterfaceRefKinds);
const idempotencyKindSet = new Set<string>(writerPreflightIdempotencyRefKinds);
const redactionCheckIdSet = new Set<string>(writerPreflightRedactionCheckIds);
const auditObligationKindSet = new Set<string>(writerPreflightAuditObligationKinds);

const defaultSourceRefs: WriterPreflightSourceRefInput[] = [
  {
    source_ref: "docs/architecture/PERSISTENCE_AND_POLICY_GATE_REVIEW.md",
    summary: "Gate G04 requires writer interface and preflight evidence.",
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
    source_ref: "docs/architecture/AUDIT_LEDGER_WRITER_PERSISTENCE_PREFLIGHT.md",
    summary: "Existing source-only audit writer preflight evidence pattern.",
  },
  {
    source_ref: "docs/reference/CONTRACT_PROVENANCE.md",
    summary: "BP-0208 source-only writer preflight packet.",
  },
];

export const defaultWriterPreflightAllowedState: WriterPreflightAllowedStateInput = {
  source_only_writer_preflight_allowed: true,
  writer_interface_refs_allowed: true,
  idempotency_refs_allowed: true,
  redaction_checks_allowed: true,
  audit_obligation_refs_allowed: true,
  writer_implementation_allowed: false,
  persisted_state_writer_allowed: false,
  database_connection_allowed: false,
  database_write_allowed: false,
  migration_execution_allowed: false,
  queue_mutation_allowed: false,
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

export const defaultWriterPreflightNoStoragePosture: WriterPreflightNoStoragePostureInput =
  {
    database_url_allowed: false,
    connection_string_allowed: false,
    database_connection_allowed: false,
    database_write_allowed: false,
    writer_implementation_allowed: false,
    persisted_state_writer_allowed: false,
    queue_mutation_allowed: false,
    live_storage_allowed: false,
    environment_secret_lookup_allowed: false,
  };

export const defaultWriterPreflightSchemaEntityRefs = persistenceSchemaEntityNames.map(
  (entityName): WriterPreflightSchemaEntityRefInput => ({
    entity_name: entityName,
    schema_contract_ref: "packages/packets/src/persistence-schema-contract.ts",
    writer_preflight_ref: "docs/reference/CONTRACT_PROVENANCE.md",
    current_state: "source_ref_only",
    target_gate: writerPreflightTargetGate,
    live_storage_allowed: false,
  }),
);

export const defaultWriterPreflightWriterInterfaceRefs: WriterPreflightWriterInterfaceRefInput[] =
  [
    writerInterfaceRef(
      "packages/audit/src/index.ts",
      "append_only_writer_interface_ref",
      "Existing append-only audit writer interface contract source reference.",
    ),
    writerInterfaceRef(
      "docs/architecture/AUDIT_LEDGER_WRITER_PERSISTENCE_PREFLIGHT.md",
      "writer_persistence_preflight_ref",
      "Existing source-only writer persistence preflight evidence pattern.",
    ),
    writerInterfaceRef(
      "apps/api/src/audit-ledger-writer-interface.ts",
      "gateway_inspection_ref",
      "Read-only Gateway inspection wrapper for writer interface evidence.",
    ),
  ];

export const defaultWriterPreflightIdempotencyRefs: WriterPreflightIdempotencyRefInput[] =
  [
    idempotencyRef(
      "docs/architecture/AUDIT_LEDGER_WRITER_PERSISTENCE_PREFLIGHT.md",
      "deterministic_key_ref",
      "deterministic_key_required",
    ),
    idempotencyRef(
      "docs/architecture/AUDIT_LEDGER_WRITER_PERSISTENCE_PREFLIGHT.md",
      "exact_replay_ref",
      "exact_replay_returns_existing_ref",
    ),
    idempotencyRef(
      "docs/architecture/AUDIT_LEDGER_WRITER_PERSISTENCE_PREFLIGHT.md",
      "digest_collision_ref",
      "digest_collision_fails_closed",
    ),
  ];

export const defaultWriterPreflightRedactionChecks: WriterPreflightRedactionCheckInput[] =
  [
    redactionCheck("RAW_COMMAND_WITHHELD", "raw_command"),
    redactionCheck("RAW_REJECTED_VALUE_WITHHELD", "raw_rejected_value"),
    redactionCheck("SECRET_VALUE_WITHHELD", "secret_value"),
    redactionCheck("RAW_PAYLOAD_ECHO_BLOCKED", "raw_payload"),
  ];

export const defaultWriterPreflightAuditObligationRefs: WriterPreflightAuditObligationRefInput[] =
  [
    auditObligationRef(
      "docs/architecture/PERSISTENCE_AND_POLICY_GATE_REVIEW.md",
      "policy_gate_ref",
    ),
    auditObligationRef(
      "docs/architecture/PERSISTENCE_AND_POLICY_GATE_REVIEW.md",
      "approval_request_ref",
    ),
    auditObligationRef("packages/audit/src/index.ts", "append_only_audit_ref"),
    auditObligationRef("docs/reference/CONTRACT_PROVENANCE.md", "rollback_ref"),
  ];

export function createWriterPreflightContract(
  request: WriterPreflightContractRequest = {},
): WriterPreflightContractResult {
  const normalized = normalizeRequest(request);

  if (!normalized.ok) {
    return {
      ok: false,
      writer_preflight_contract: null,
      errors: normalized.errors,
      raw_input_content: "withheld",
      side_effects: [],
    };
  }

  return {
    ok: true,
    writer_preflight_contract: {
      contract_id: writerPreflightContract.contract_id,
      preflight_version: writerPreflightContract.preflight_version,
      target_gate: writerPreflightTargetGate,
      migration_static_review_contract_id:
        migrationArtifactStaticReviewContract.contract_id,
      required_gate_ids: normalized.gate_sequence,
      required_entity_names: [...persistenceSchemaEntityNames],
      schema_entity_refs: normalized.schema_entity_refs,
      writer_interface_refs: normalized.writer_interface_refs,
      idempotency_refs: normalized.idempotency_refs,
      redaction_checks: normalized.redaction_checks,
      audit_obligation_refs: normalized.audit_obligation_refs,
      no_storage_posture: normalized.no_storage_posture,
      source_refs: normalized.source_refs,
      allowed_state: normalized.allowed_state,
      blocked_capabilities: [...writerPreflightBlockedCapabilityFlags],
      implementation_artifacts: [],
      writer_execution_artifacts: [],
      database_connection_allowed: false,
      database_write_allowed: false,
      writer_implementation_allowed: false,
      persisted_state_writer_allowed: false,
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

function writerInterfaceRef(
  interfaceRef: string,
  interfaceKind: WriterPreflightInterfaceRefKind,
  summary: string,
): WriterPreflightWriterInterfaceRefInput {
  return {
    interface_ref: interfaceRef,
    interface_kind: interfaceKind,
    summary,
    current_state: "source_ref_only_no_writer_implementation",
    append_only: true,
    implementation_allowed: false,
    live_storage_allowed: false,
  };
}

function idempotencyRef(
  idempotencyRefPath: string,
  idempotencyKind: WriterPreflightIdempotencyRefKind,
  behavior: WriterPreflightIdempotencyRefInput["behavior"],
): WriterPreflightIdempotencyRefInput {
  return {
    idempotency_ref: idempotencyRefPath,
    idempotency_kind: idempotencyKind,
    behavior,
    current_state: "source_ref_only",
    storage_lookup_allowed: false,
    mutation_allowed: false,
  };
}

function redactionCheck(
  checkId: WriterPreflightRedactionCheckId,
  checkKind: WriterPreflightRedactionCheckInput["check_kind"],
): WriterPreflightRedactionCheckInput {
  return {
    check_id: checkId,
    check_kind: checkKind,
    source_ref: "docs/architecture/AUDIT_LEDGER_WRITER_PERSISTENCE_PREFLIGHT.md",
    action: "withhold_before_persistence",
    current_state: "source_ref_only",
    raw_value_echo_allowed: false,
  };
}

function auditObligationRef(
  obligationRef: string,
  obligationKind: WriterPreflightAuditObligationKind,
): WriterPreflightAuditObligationRefInput {
  return {
    obligation_ref: obligationRef,
    obligation_kind: obligationKind,
    required_gate: writerPreflightTargetGate,
    current_state: "source_ref_only",
    audit_write_allowed: false,
  };
}

function normalizeRequest(
  request: WriterPreflightContractRequest,
): NormalizedWriterPreflightRequest {
  if (!isPlainObject(request)) {
    return {
      ok: false,
      errors: [
        writerPreflightError(
          "writer_preflight.invalid_request",
          "",
          "Writer preflight request must be an object.",
        ),
      ],
    };
  }

  const errors: WriterPreflightContractError[] = [];

  for (const key of Object.keys(request)) {
    if (!requestKeys.has(key)) {
      errors.push(
        writerPreflightError(
          "writer_preflight.unexpected_field",
          `/${key}`,
          "Unexpected writer preflight field.",
        ),
      );
    }
  }

  if (
    request.preflight_version !== undefined &&
    request.preflight_version !== writerPreflightContract.preflight_version
  ) {
    errors.push(
      writerPreflightError(
        "writer_preflight.invalid_version",
        "/preflight_version",
        "Writer preflight version is unsupported.",
      ),
    );
  }

  if (
    request.contract_authority !== undefined &&
    request.contract_authority !== writerPreflightContract.contract_authority
  ) {
    errors.push(
      writerPreflightError(
        "writer_preflight.unsafe_contract_authority",
        "/contract_authority",
        "Writer preflight authority must remain source-only.",
      ),
    );
  }

  for (const flag of writerPreflightBlockedCapabilityFlags) {
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
    request.schema_entity_refs ?? defaultWriterPreflightSchemaEntityRefs,
    errors,
  );
  const writerInterfaceRefs = normalizeWriterInterfaceRefs(
    request.writer_interface_refs ?? defaultWriterPreflightWriterInterfaceRefs,
    errors,
  );
  const idempotencyRefs = normalizeIdempotencyRefs(
    request.idempotency_refs ?? defaultWriterPreflightIdempotencyRefs,
    errors,
  );
  const redactionChecks = normalizeRedactionChecks(
    request.redaction_checks ?? defaultWriterPreflightRedactionChecks,
    errors,
  );
  const auditObligationRefs = normalizeAuditObligationRefs(
    request.audit_obligation_refs ?? defaultWriterPreflightAuditObligationRefs,
    errors,
  );
  const noStoragePosture = normalizeNoStoragePosture(
    request.no_storage_posture ?? defaultWriterPreflightNoStoragePosture,
    errors,
  );
  const sourceRefs = normalizeSourceRefs(
    request.source_refs ?? defaultSourceRefs,
    errors,
  );
  const allowedState = normalizeAllowedState(
    request.allowed_state ?? defaultWriterPreflightAllowedState,
    errors,
  );

  if (
    errors.length > 0 ||
    gateSequence === null ||
    schemaEntityRefs === null ||
    writerInterfaceRefs === null ||
    idempotencyRefs === null ||
    redactionChecks === null ||
    auditObligationRefs === null ||
    noStoragePosture === null ||
    sourceRefs === null ||
    allowedState === null
  ) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    gate_sequence: gateSequence,
    schema_entity_refs: schemaEntityRefs,
    writer_interface_refs: writerInterfaceRefs,
    idempotency_refs: idempotencyRefs,
    redaction_checks: redactionChecks,
    audit_obligation_refs: auditObligationRefs,
    no_storage_posture: noStoragePosture,
    source_refs: sourceRefs,
    allowed_state: allowedState,
  };
}

function normalizeGateSequence(
  value: unknown,
  errors: WriterPreflightContractError[],
): PersistencePolicyGateId[] | null {
  if (!Array.isArray(value)) {
    errors.push(
      writerPreflightError(
        "writer_preflight.gate_sequence_required",
        "/gate_sequence",
        "Writer preflight requires the full persistence gate order.",
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
        writerPreflightError(
          "writer_preflight.gate_order_drift",
          `/gate_sequence/${index}`,
          "Persistence gate id is unsupported.",
        ),
      );
      continue;
    }
    if (seen.has(gateId) || persistencePolicyGateIds[index] !== gateId) {
      errors.push(
        writerPreflightError(
          "writer_preflight.gate_order_drift",
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
        writerPreflightError(
          "writer_preflight.gate_sequence_required",
          "/gate_sequence",
          "Writer preflight is missing a required gate id.",
        ),
      );
    }
  }

  return normalized;
}

function normalizeSchemaEntityRefs(
  value: unknown,
  errors: WriterPreflightContractError[],
): WriterPreflightSchemaEntityRefInput[] | null {
  if (!Array.isArray(value)) {
    errors.push(
      writerPreflightError(
        "writer_preflight.schema_entity_ref_required",
        "/schema_entity_refs",
        "Writer preflight requires schema entity refs.",
      ),
    );
    return null;
  }

  const normalized: WriterPreflightSchemaEntityRefInput[] = [];
  const seen = new Set<string>();

  for (let index = 0; index < value.length; index += 1) {
    const rawRef = value[index];
    if (!isPlainObject(rawRef)) {
      errors.push(
        writerPreflightError(
          "writer_preflight.schema_entity_ref_drift",
          `/schema_entity_refs/${index}`,
          "Schema entity ref must be an object.",
        ),
      );
      continue;
    }

    const entityName = rawRef.entity_name;
    if (!isPersistenceSchemaEntityName(entityName)) {
      errors.push(
        writerPreflightError(
          "writer_preflight.schema_entity_ref_drift",
          `/schema_entity_refs/${index}/entity_name`,
          "Schema entity ref references an unsupported entity.",
        ),
      );
      continue;
    }

    if (seen.has(entityName) || persistenceSchemaEntityNames[index] !== entityName) {
      errors.push(
        writerPreflightError(
          "writer_preflight.schema_entity_ref_drift",
          `/schema_entity_refs/${index}/entity_name`,
          "Schema entity refs must match BP-0204 entity order.",
        ),
      );
    }
    seen.add(entityName);

    const schemaContractRef = normalizeRepoRef(
      rawRef.schema_contract_ref,
      `/schema_entity_refs/${index}/schema_contract_ref`,
      "writer_preflight.schema_entity_ref_drift",
      errors,
    );
    const writerPreflightRef = normalizeRepoRef(
      rawRef.writer_preflight_ref,
      `/schema_entity_refs/${index}/writer_preflight_ref`,
      "writer_preflight.schema_entity_ref_drift",
      errors,
    );

    if (rawRef.current_state !== "source_ref_only") {
      errors.push(
        writerPreflightError(
          "writer_preflight.schema_entity_ref_drift",
          `/schema_entity_refs/${index}/current_state`,
          "Schema entity refs must remain source refs only.",
        ),
      );
    }
    if (rawRef.target_gate !== writerPreflightTargetGate) {
      errors.push(
        writerPreflightError(
          "writer_preflight.schema_entity_ref_drift",
          `/schema_entity_refs/${index}/target_gate`,
          "Schema entity refs must target G04 writer preflight.",
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
      rawRef.current_state !== "source_ref_only" ||
      rawRef.target_gate !== writerPreflightTargetGate ||
      rawRef.live_storage_allowed !== false
    ) {
      continue;
    }

    normalized.push({
      entity_name: entityName,
      schema_contract_ref: schemaContractRef,
      writer_preflight_ref: writerPreflightRef,
      current_state: "source_ref_only",
      target_gate: writerPreflightTargetGate,
      live_storage_allowed: false,
    });
  }

  for (const requiredEntityName of persistenceSchemaEntityNames) {
    if (!seen.has(requiredEntityName)) {
      errors.push(
        writerPreflightError(
          "writer_preflight.schema_entity_ref_required",
          "/schema_entity_refs",
          "Writer preflight is missing required schema entity refs.",
        ),
      );
    }
  }

  return normalized;
}

function normalizeWriterInterfaceRefs(
  value: unknown,
  errors: WriterPreflightContractError[],
): WriterPreflightWriterInterfaceRefInput[] | null {
  if (!Array.isArray(value)) {
    errors.push(
      writerPreflightError(
        "writer_preflight.writer_interface_ref_required",
        "/writer_interface_refs",
        "Writer preflight requires writer interface refs.",
      ),
    );
    return null;
  }

  const normalized: WriterPreflightWriterInterfaceRefInput[] = [];
  const seenKinds = new Set<string>();

  for (let index = 0; index < value.length; index += 1) {
    const rawRef = value[index];
    if (!isPlainObject(rawRef)) {
      errors.push(
        writerPreflightError(
          "writer_preflight.invalid_writer_interface_ref",
          `/writer_interface_refs/${index}`,
          "Writer interface ref must be an object.",
        ),
      );
      continue;
    }

    const interfaceKind = rawRef.interface_kind;
    if (!isWriterInterfaceKind(interfaceKind)) {
      errors.push(
        writerPreflightError(
          "writer_preflight.invalid_writer_interface_ref",
          `/writer_interface_refs/${index}/interface_kind`,
          "Writer interface ref kind is unsupported.",
        ),
      );
      continue;
    }
    seenKinds.add(interfaceKind);

    const interfaceRef = normalizeRepoRef(
      rawRef.interface_ref,
      `/writer_interface_refs/${index}/interface_ref`,
      "writer_preflight.invalid_writer_interface_ref",
      errors,
    );
    const summary = normalizeSafeSummary(
      rawRef.summary,
      `/writer_interface_refs/${index}/summary`,
      "writer_preflight.invalid_writer_interface_ref",
      errors,
    );

    if (rawRef.current_state !== "source_ref_only_no_writer_implementation") {
      errors.push(
        writerPreflightError(
          "writer_preflight.invalid_writer_interface_ref",
          `/writer_interface_refs/${index}/current_state`,
          "Writer interface refs must remain source refs only.",
        ),
      );
    }
    if (rawRef.append_only !== true) {
      errors.push(
        writerPreflightError(
          "writer_preflight.invalid_writer_interface_ref",
          `/writer_interface_refs/${index}/append_only`,
          "Writer interface refs must preserve append-only posture.",
        ),
      );
    }
    if (rawRef.implementation_allowed !== false) {
      errors.push(
        blockedCapabilityError(
          "writer_implementation_allowed",
          `/writer_interface_refs/${index}/implementation_allowed`,
        ),
      );
    }
    if (rawRef.live_storage_allowed !== false) {
      errors.push(
        blockedCapabilityError(
          "live_storage_allowed",
          `/writer_interface_refs/${index}/live_storage_allowed`,
        ),
      );
    }

    if (
      interfaceRef === null ||
      summary === null ||
      rawRef.current_state !== "source_ref_only_no_writer_implementation" ||
      rawRef.append_only !== true ||
      rawRef.implementation_allowed !== false ||
      rawRef.live_storage_allowed !== false
    ) {
      continue;
    }

    normalized.push({
      interface_ref: interfaceRef,
      interface_kind: interfaceKind,
      summary,
      current_state: "source_ref_only_no_writer_implementation",
      append_only: true,
      implementation_allowed: false,
      live_storage_allowed: false,
    });
  }

  for (const requiredKind of writerPreflightInterfaceRefKinds) {
    if (!seenKinds.has(requiredKind)) {
      errors.push(
        writerPreflightError(
          "writer_preflight.writer_interface_ref_required",
          "/writer_interface_refs",
          "Writer preflight is missing a required writer interface ref kind.",
        ),
      );
    }
  }

  return normalized;
}

function normalizeIdempotencyRefs(
  value: unknown,
  errors: WriterPreflightContractError[],
): WriterPreflightIdempotencyRefInput[] | null {
  if (!Array.isArray(value)) {
    errors.push(
      writerPreflightError(
        "writer_preflight.idempotency_ref_required",
        "/idempotency_refs",
        "Writer preflight requires idempotency refs.",
      ),
    );
    return null;
  }

  const normalized: WriterPreflightIdempotencyRefInput[] = [];
  const seenKinds = new Set<string>();

  for (let index = 0; index < value.length; index += 1) {
    const rawRef = value[index];
    if (!isPlainObject(rawRef)) {
      errors.push(
        writerPreflightError(
          "writer_preflight.invalid_idempotency_ref",
          `/idempotency_refs/${index}`,
          "Idempotency ref must be an object.",
        ),
      );
      continue;
    }

    const idempotencyKind = rawRef.idempotency_kind;
    if (!isIdempotencyKind(idempotencyKind)) {
      errors.push(
        writerPreflightError(
          "writer_preflight.invalid_idempotency_ref",
          `/idempotency_refs/${index}/idempotency_kind`,
          "Idempotency ref kind is unsupported.",
        ),
      );
      continue;
    }
    seenKinds.add(idempotencyKind);

    const idempotencyRefPath = normalizeRepoRef(
      rawRef.idempotency_ref,
      `/idempotency_refs/${index}/idempotency_ref`,
      "writer_preflight.invalid_idempotency_ref",
      errors,
    );

    if (rawRef.behavior !== expectedIdempotencyBehavior(idempotencyKind)) {
      errors.push(
        writerPreflightError(
          "writer_preflight.invalid_idempotency_ref",
          `/idempotency_refs/${index}/behavior`,
          "Idempotency behavior does not match the ref kind.",
        ),
      );
    }
    if (rawRef.current_state !== "source_ref_only") {
      errors.push(
        writerPreflightError(
          "writer_preflight.invalid_idempotency_ref",
          `/idempotency_refs/${index}/current_state`,
          "Idempotency refs must remain source refs only.",
        ),
      );
    }
    if (rawRef.storage_lookup_allowed !== false) {
      errors.push(
        blockedCapabilityError(
          "idempotency_storage_lookup_allowed",
          `/idempotency_refs/${index}/storage_lookup_allowed`,
        ),
      );
    }
    if (rawRef.mutation_allowed !== false) {
      errors.push(
        blockedCapabilityError(
          "idempotency_mutation_allowed",
          `/idempotency_refs/${index}/mutation_allowed`,
        ),
      );
    }

    if (
      idempotencyRefPath === null ||
      rawRef.behavior !== expectedIdempotencyBehavior(idempotencyKind) ||
      rawRef.current_state !== "source_ref_only" ||
      rawRef.storage_lookup_allowed !== false ||
      rawRef.mutation_allowed !== false
    ) {
      continue;
    }

    normalized.push({
      idempotency_ref: idempotencyRefPath,
      idempotency_kind: idempotencyKind,
      behavior: expectedIdempotencyBehavior(idempotencyKind),
      current_state: "source_ref_only",
      storage_lookup_allowed: false,
      mutation_allowed: false,
    });
  }

  for (const requiredKind of writerPreflightIdempotencyRefKinds) {
    if (!seenKinds.has(requiredKind)) {
      errors.push(
        writerPreflightError(
          "writer_preflight.idempotency_ref_required",
          "/idempotency_refs",
          "Writer preflight is missing a required idempotency ref kind.",
        ),
      );
    }
  }

  return normalized;
}

function normalizeRedactionChecks(
  value: unknown,
  errors: WriterPreflightContractError[],
): WriterPreflightRedactionCheckInput[] | null {
  if (!Array.isArray(value)) {
    errors.push(
      writerPreflightError(
        "writer_preflight.redaction_check_required",
        "/redaction_checks",
        "Writer preflight requires redaction checks.",
      ),
    );
    return null;
  }

  const normalized: WriterPreflightRedactionCheckInput[] = [];
  const seen = new Set<string>();

  for (let index = 0; index < value.length; index += 1) {
    const rawCheck = value[index];
    if (!isPlainObject(rawCheck)) {
      errors.push(
        writerPreflightError(
          "writer_preflight.invalid_redaction_check",
          `/redaction_checks/${index}`,
          "Redaction check must be an object.",
        ),
      );
      continue;
    }

    const checkId = rawCheck.check_id;
    if (!isRedactionCheckId(checkId)) {
      errors.push(
        writerPreflightError(
          "writer_preflight.invalid_redaction_check",
          `/redaction_checks/${index}/check_id`,
          "Redaction check id is unsupported.",
        ),
      );
      continue;
    }

    if (seen.has(checkId) || writerPreflightRedactionCheckIds[index] !== checkId) {
      errors.push(
        writerPreflightError(
          "writer_preflight.redaction_check_required",
          `/redaction_checks/${index}/check_id`,
          "Redaction checks must preserve required order.",
        ),
      );
    }
    seen.add(checkId);

    const sourceRef = normalizeRepoRef(
      rawCheck.source_ref,
      `/redaction_checks/${index}/source_ref`,
      "writer_preflight.invalid_redaction_check",
      errors,
    );

    if (rawCheck.check_kind !== expectedRedactionCheckKind(checkId)) {
      errors.push(
        writerPreflightError(
          "writer_preflight.invalid_redaction_check",
          `/redaction_checks/${index}/check_kind`,
          "Redaction check kind does not match check id.",
        ),
      );
    }
    if (rawCheck.action !== "withhold_before_persistence") {
      errors.push(
        writerPreflightError(
          "writer_preflight.invalid_redaction_check",
          `/redaction_checks/${index}/action`,
          "Redaction checks must withhold raw values before persistence.",
        ),
      );
    }
    if (rawCheck.current_state !== "source_ref_only") {
      errors.push(
        writerPreflightError(
          "writer_preflight.invalid_redaction_check",
          `/redaction_checks/${index}/current_state`,
          "Redaction checks must remain source refs only.",
        ),
      );
    }
    if (rawCheck.raw_value_echo_allowed !== false) {
      errors.push(
        blockedCapabilityError(
          "redaction_runtime_allowed",
          `/redaction_checks/${index}/raw_value_echo_allowed`,
        ),
      );
    }

    if (
      sourceRef === null ||
      rawCheck.check_kind !== expectedRedactionCheckKind(checkId) ||
      rawCheck.action !== "withhold_before_persistence" ||
      rawCheck.current_state !== "source_ref_only" ||
      rawCheck.raw_value_echo_allowed !== false
    ) {
      continue;
    }

    normalized.push({
      check_id: checkId,
      check_kind: expectedRedactionCheckKind(checkId),
      source_ref: sourceRef,
      action: "withhold_before_persistence",
      current_state: "source_ref_only",
      raw_value_echo_allowed: false,
    });
  }

  for (const requiredCheckId of writerPreflightRedactionCheckIds) {
    if (!seen.has(requiredCheckId)) {
      errors.push(
        writerPreflightError(
          "writer_preflight.redaction_check_required",
          "/redaction_checks",
          "Writer preflight is missing a required redaction check.",
        ),
      );
    }
  }

  return normalized;
}

function normalizeAuditObligationRefs(
  value: unknown,
  errors: WriterPreflightContractError[],
): WriterPreflightAuditObligationRefInput[] | null {
  if (!Array.isArray(value)) {
    errors.push(
      writerPreflightError(
        "writer_preflight.audit_obligation_ref_required",
        "/audit_obligation_refs",
        "Writer preflight requires audit obligation refs.",
      ),
    );
    return null;
  }

  const normalized: WriterPreflightAuditObligationRefInput[] = [];
  const seenKinds = new Set<string>();

  for (let index = 0; index < value.length; index += 1) {
    const rawRef = value[index];
    if (!isPlainObject(rawRef)) {
      errors.push(
        writerPreflightError(
          "writer_preflight.invalid_audit_obligation_ref",
          `/audit_obligation_refs/${index}`,
          "Audit obligation ref must be an object.",
        ),
      );
      continue;
    }

    const obligationKind = rawRef.obligation_kind;
    if (!isAuditObligationKind(obligationKind)) {
      errors.push(
        writerPreflightError(
          "writer_preflight.invalid_audit_obligation_ref",
          `/audit_obligation_refs/${index}/obligation_kind`,
          "Audit obligation ref kind is unsupported.",
        ),
      );
      continue;
    }
    seenKinds.add(obligationKind);

    const obligationRef = normalizeRepoRef(
      rawRef.obligation_ref,
      `/audit_obligation_refs/${index}/obligation_ref`,
      "writer_preflight.invalid_audit_obligation_ref",
      errors,
    );

    if (rawRef.required_gate !== writerPreflightTargetGate) {
      errors.push(
        writerPreflightError(
          "writer_preflight.invalid_audit_obligation_ref",
          `/audit_obligation_refs/${index}/required_gate`,
          "Audit obligation refs must target G04.",
        ),
      );
    }
    if (rawRef.current_state !== "source_ref_only") {
      errors.push(
        writerPreflightError(
          "writer_preflight.invalid_audit_obligation_ref",
          `/audit_obligation_refs/${index}/current_state`,
          "Audit obligation refs must remain source refs only.",
        ),
      );
    }
    if (rawRef.audit_write_allowed !== false) {
      errors.push(
        blockedCapabilityError(
          "audit_append_allowed",
          `/audit_obligation_refs/${index}/audit_write_allowed`,
        ),
      );
    }

    if (
      obligationRef === null ||
      rawRef.required_gate !== writerPreflightTargetGate ||
      rawRef.current_state !== "source_ref_only" ||
      rawRef.audit_write_allowed !== false
    ) {
      continue;
    }

    normalized.push({
      obligation_ref: obligationRef,
      obligation_kind: obligationKind,
      required_gate: writerPreflightTargetGate,
      current_state: "source_ref_only",
      audit_write_allowed: false,
    });
  }

  for (const requiredKind of writerPreflightAuditObligationKinds) {
    if (!seenKinds.has(requiredKind)) {
      errors.push(
        writerPreflightError(
          "writer_preflight.audit_obligation_ref_required",
          "/audit_obligation_refs",
          "Writer preflight is missing a required audit obligation ref kind.",
        ),
      );
    }
  }

  return normalized;
}

function normalizeNoStoragePosture(
  value: unknown,
  errors: WriterPreflightContractError[],
): WriterPreflightNoStoragePostureInput | null {
  if (!isPlainObject(value)) {
    errors.push(
      writerPreflightError(
        "writer_preflight.no_storage_posture_required",
        "/no_storage_posture",
        "Writer preflight requires no-storage posture.",
      ),
    );
    return null;
  }

  const expected = defaultWriterPreflightNoStoragePosture;
  const startCount = errors.length;
  for (const key of Object.keys(expected) as Array<keyof typeof expected>) {
    if (value[key] !== expected[key]) {
      errors.push(noStoragePostureError(key, `/no_storage_posture/${String(key)}`));
    }
  }

  return errors.length > startCount
    ? null
    : { ...defaultWriterPreflightNoStoragePosture };
}

function normalizeSourceRefs(
  value: unknown,
  errors: WriterPreflightContractError[],
): string[] | null {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push(
      writerPreflightError(
        "writer_preflight.source_ref_required",
        "/source_refs",
        "Writer preflight requires source refs.",
      ),
    );
    return null;
  }

  const normalized: string[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const rawSource = value[index];
    if (!isPlainObject(rawSource)) {
      errors.push(
        writerPreflightError(
          "writer_preflight.invalid_source_ref",
          `/source_refs/${index}`,
          "Source ref must be an object.",
        ),
      );
      continue;
    }

    const sourceRef = normalizeRepoRef(
      rawSource.source_ref,
      `/source_refs/${index}/source_ref`,
      "writer_preflight.invalid_source_ref",
      errors,
    );
    normalizeSafeSummary(
      rawSource.summary,
      `/source_refs/${index}/summary`,
      "writer_preflight.invalid_source_ref",
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
  errors: WriterPreflightContractError[],
): WriterPreflightAllowedStateInput | null {
  if (!isPlainObject(value)) {
    errors.push(
      writerPreflightError(
        "writer_preflight.allowed_state_required",
        "/allowed_state",
        "Writer preflight requires allowed state evidence.",
      ),
    );
    return null;
  }

  const expected = defaultWriterPreflightAllowedState;
  const startCount = errors.length;
  for (const key of Object.keys(expected) as Array<keyof typeof expected>) {
    if (value[key] !== expected[key]) {
      if (key === "secret_posture") {
        errors.push(
          writerPreflightError(
            "writer_preflight.secret_value_forbidden",
            "/allowed_state/secret_posture",
            "Writer preflight allows secret references only.",
          ),
        );
        continue;
      }
      errors.push(blockedCapabilityError(key, `/allowed_state/${String(key)}`));
    }
  }

  return errors.length > startCount ? null : { ...defaultWriterPreflightAllowedState };
}

function normalizeRepoRef(
  value: unknown,
  path: string,
  code: WriterPreflightContractErrorCode,
  errors: WriterPreflightContractError[],
): string | null {
  if (typeof value !== "string" || value.trim().length === 0) {
    errors.push(
      writerPreflightError(
        code,
        path,
        "Writer preflight references must be nonempty strings.",
      ),
    );
    return null;
  }

  const trimmedValue = value.trim();
  if (!isRepoLocalPath(trimmedValue)) {
    errors.push(
      writerPreflightError(
        code,
        path,
        "Writer preflight references must be repo-local paths.",
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
  code: WriterPreflightContractErrorCode,
  errors: WriterPreflightContractError[],
): string | null {
  if (typeof value !== "string" || value.trim().length === 0) {
    errors.push(
      writerPreflightError(
        code,
        path,
        "Writer preflight summaries must be nonempty strings.",
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
  errors: WriterPreflightContractError[],
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
      writerPreflightError(
        "writer_preflight.connection_string_forbidden",
        path,
        "Writer preflight cannot contain connection strings.",
      ),
    );
  }
  if (
    lowerValue.includes("password=") ||
    lowerValue.includes("api_key") ||
    lowerValue.includes("secret-token") ||
    lowerValue.includes("private_key")
  ) {
    errors.push(
      writerPreflightError(
        "writer_preflight.secret_value_forbidden",
        path,
        "Writer preflight cannot contain secret-like values.",
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
      writerPreflightError(
        "writer_preflight.migration_execution_forbidden",
        path,
        "Writer preflight cannot contain migration runner commands.",
      ),
    );
  }
}

function validateSideEffects(
  value: unknown,
  path: string,
  errors: WriterPreflightContractError[],
): void {
  if (value !== undefined && (!Array.isArray(value) || value.length !== 0)) {
    errors.push(
      writerPreflightError(
        "writer_preflight.side_effects_forbidden",
        path,
        "Writer preflight must not declare side effects.",
      ),
    );
  }
}

function noStoragePostureError(
  key: keyof WriterPreflightNoStoragePostureInput,
  path: string,
): WriterPreflightContractError {
  return blockedCapabilityError(key, path);
}

function blockedCapabilityError(
  flag: string,
  path: string,
): WriterPreflightContractError {
  if (flag === "python_runtime_required") {
    return writerPreflightError(
      "writer_preflight.python_runtime_requirement_forbidden",
      path,
      "Writer preflight must not require Python runtime.",
    );
  }
  if (flag === "os_specific_binary_required") {
    return writerPreflightError(
      "writer_preflight.os_specific_binary_requirement_forbidden",
      path,
      "Writer preflight must not require OS-specific binaries.",
    );
  }
  if (
    flag === "live_execution_allowed" ||
    flag === "live_storage_allowed" ||
    flag === "live_sql_execution_allowed"
  ) {
    return writerPreflightError(
      "writer_preflight.live_execution_forbidden",
      path,
      "Writer preflight must not allow live execution or storage.",
    );
  }
  if (
    flag === "database_url_allowed" ||
    flag === "connection_string_allowed" ||
    flag === "database_connection_allowed" ||
    flag === "database_write_allowed"
  ) {
    return writerPreflightError(
      "writer_preflight.connection_string_forbidden",
      path,
      "Writer preflight must not allow database connections or writes.",
    );
  }
  if (
    flag === "migration_execution_allowed" ||
    flag === "migration_runner_allowed" ||
    flag === "schema_migration_runner_allowed" ||
    flag === "migration_artifact_execution_allowed" ||
    flag === "migration_manifest_execution_allowed"
  ) {
    return writerPreflightError(
      "writer_preflight.migration_execution_forbidden",
      path,
      "Writer preflight must not allow migration execution.",
    );
  }
  if (
    flag === "writer_implementation_allowed" ||
    flag === "persisted_state_writer_allowed" ||
    flag === "writer_interface_execution_allowed" ||
    flag === "writer_preflight_execution_allowed" ||
    flag === "idempotency_storage_lookup_allowed" ||
    flag === "idempotency_mutation_allowed" ||
    flag === "redaction_runtime_allowed" ||
    flag === "audit_append_allowed"
  ) {
    return writerPreflightError(
      "writer_preflight.writer_implementation_forbidden",
      path,
      "Writer preflight must not implement or execute a writer.",
    );
  }
  return writerPreflightError(
    "writer_preflight.blocked_capability_forbidden",
    path,
    "Writer preflight blocked capability must remain false.",
  );
}

function writerPreflightError(
  code: WriterPreflightContractErrorCode,
  path: string,
  message: string,
): WriterPreflightContractError {
  return {
    code,
    path,
    message,
    severity: "error",
  };
}

function expectedIdempotencyBehavior(
  kind: WriterPreflightIdempotencyRefKind,
): WriterPreflightIdempotencyRefInput["behavior"] {
  if (kind === "deterministic_key_ref") {
    return "deterministic_key_required";
  }
  if (kind === "exact_replay_ref") {
    return "exact_replay_returns_existing_ref";
  }
  return "digest_collision_fails_closed";
}

function expectedRedactionCheckKind(
  checkId: WriterPreflightRedactionCheckId,
): WriterPreflightRedactionCheckInput["check_kind"] {
  if (checkId === "RAW_COMMAND_WITHHELD") {
    return "raw_command";
  }
  if (checkId === "RAW_REJECTED_VALUE_WITHHELD") {
    return "raw_rejected_value";
  }
  if (checkId === "SECRET_VALUE_WITHHELD") {
    return "secret_value";
  }
  return "raw_payload";
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
  return typeof value === "string" && schemaEntitySet.has(value);
}

function isWriterInterfaceKind(
  value: unknown,
): value is WriterPreflightInterfaceRefKind {
  return typeof value === "string" && interfaceKindSet.has(value);
}

function isIdempotencyKind(value: unknown): value is WriterPreflightIdempotencyRefKind {
  return typeof value === "string" && idempotencyKindSet.has(value);
}

function isRedactionCheckId(value: unknown): value is WriterPreflightRedactionCheckId {
  return typeof value === "string" && redactionCheckIdSet.has(value);
}

function isAuditObligationKind(
  value: unknown,
): value is WriterPreflightAuditObligationKind {
  return typeof value === "string" && auditObligationKindSet.has(value);
}
