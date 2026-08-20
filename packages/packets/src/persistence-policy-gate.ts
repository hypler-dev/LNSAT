export const PERSISTENCE_POLICY_GATE_STATUS = "source_only";

export const persistencePolicyGateIds = [
  "G01_SOURCE_BASELINE",
  "G02_SCHEMA_CONTRACT",
  "G03_MIGRATION_ARTIFACT_STATIC",
  "G04_WRITER_PREFLIGHT",
  "G05_DATABASE_SECURITY",
  "G06_POLICY_GATE",
  "G07_APPROVAL_REQUEST",
  "G08_PERSISTENCE_READINESS",
  "G09_IMPLEMENTATION_PACKET",
  "G10_LIVE_REQUEST",
] as const;

export const persistencePolicyScopeKeys = [
  "DB_CONNECTION_WRITE",
  "WRITER_IMPLEMENTATION",
  "MIGRATION_EXECUTION",
  "APPROVAL_MUTATION",
  "AUTH_SESSION_STORE",
  "INTEGRATION_SETUP_WRITES",
  "RUNTIME_ADAPTER_IMPLEMENTATION",
  "OS_LEVEL_CONNECTOR_PACKAGE",
  "EXTERNAL_SERVICE_OR_LIVE_CONNECTOR",
] as const;

export const persistencePolicyBlockedCapabilityFlags = [
  "database_connection_allowed",
  "database_write_allowed",
  "migration_execution_allowed",
  "writer_implementation_allowed",
  "approval_mutation_allowed",
  "settings_mutation_allowed",
  "auth_session_store_allowed",
  "auth_provider_wiring_allowed",
  "credential_field_allowed",
  "credential_storage_allowed",
  "integration_setup_write_allowed",
  "runtime_dispatcher_allowed",
  "runtime_adapter_implementation_allowed",
  "live_broker_dispatch_allowed",
  "live_adapter_invocation_allowed",
  "live_execution_allowed",
  "queue_mutation_allowed",
  "docker_runner_allowed",
  "node_agent_allowed",
  "ssh_allowed",
  "raw_shell_allowed",
  "root_helper_allowed",
  "service_mutation_allowed",
  "package_install_allowed",
  "host_service_install_allowed",
  "git_activity_allowed",
  "deploy_allowed",
  "dns_cloudflare_mutation_allowed",
  "infrastructure_mutation_allowed",
  "external_service_call_allowed",
  "python_runtime_required",
  "os_specific_binary_required",
] as const;

export const persistencePolicyGateContract = {
  contract_id: "lnsat.platform.persistence_policy_gate.v0_1",
  authority: ["@lnsat/packets", "source-backed-persistence-policy-gate"],
  gate_version: "0.1",
  source_docs: [
    "docs/architecture/PERSISTENCE_AND_POLICY_GATE_REVIEW.md",
    "docs/architecture/PERSISTENCE_SCHEMA_PLAN.md",
    "docs/architecture/AUTH_AND_INTEGRATION_POSTURE.md",
    "docs/architecture/POLICY_AND_AUDIT.md",
    "docs/architecture/MANAGEMENT_UI_INFORMATION_ARCHITECTURE.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
  ],
  gate_ids: persistencePolicyGateIds,
  scope_keys: persistencePolicyScopeKeys,
  blocked_capability_flags: persistencePolicyBlockedCapabilityFlags,
  contract_authority: "source_only_persistence_gate_no_live_scope",
  gateway_security_boundary: true,
  policy_required_before_mutation: true,
  approval_required_before_mutation: true,
  append_only_audit_required_before_live_state_change: true,
  tenant_project_isolation_required_before_live_data: true,
  secret_posture: "references_only_no_values",
  source_only_contract_allowed: true,
  live_execution_allowed: false,
  python_runtime_required: false,
  os_specific_binary_required: false,
  side_effects: [],
  status: "source_only",
} as const;

export type PersistencePolicyGateId = (typeof persistencePolicyGateIds)[number];
export type PersistencePolicyScopeKey = (typeof persistencePolicyScopeKeys)[number];
export type PersistencePolicyBlockedCapabilityFlag =
  (typeof persistencePolicyBlockedCapabilityFlags)[number];

export type PersistencePolicyGateInput = {
  order: number;
  gate_id: PersistencePolicyGateId;
  gate_name: string;
  required_evidence_refs: string[];
  opens_now: "read-only" | "none";
  opens_later: string[];
};

export type PersistencePolicyScopeOwnershipInput = {
  scope_key: PersistencePolicyScopeKey;
  owning_gate_ids: PersistencePolicyGateId[];
  required_later_packet_evidence: string[];
  current_state: "blocked";
};

export type PersistencePolicySourceRefInput = {
  source_ref: string;
  summary: string;
};

export type PersistencePolicyAllowedStateInput = {
  source_only_contract_allowed: true;
  gateway_security_boundary: true;
  policy_required_before_mutation: true;
  approval_required_before_mutation: true;
  append_only_audit_required_before_live_state_change: true;
  tenant_project_isolation_required_before_live_data: true;
  secret_posture: typeof persistencePolicyGateContract.secret_posture;
  live_execution_allowed: false;
  python_runtime_required: false;
  os_specific_binary_required: false;
};

export type PersistencePolicyGateRequest = Partial<
  Record<PersistencePolicyBlockedCapabilityFlag, false>
> & {
  gate_version?: typeof persistencePolicyGateContract.gate_version;
  gate_sequence?: PersistencePolicyGateInput[];
  scope_ownership?: PersistencePolicyScopeOwnershipInput[];
  source_refs?: PersistencePolicySourceRefInput[];
  allowed_state?: PersistencePolicyAllowedStateInput;
  contract_authority?: typeof persistencePolicyGateContract.contract_authority;
  side_effects?: [];
};

export type PersistencePolicyGateErrorCode =
  | "persistence_policy_gate.invalid_request"
  | "persistence_policy_gate.unexpected_field"
  | "persistence_policy_gate.invalid_version"
  | "persistence_policy_gate.gate_sequence_required"
  | "persistence_policy_gate.gate_order_drift"
  | "persistence_policy_gate.invalid_gate"
  | "persistence_policy_gate.scope_ownership_required"
  | "persistence_policy_gate.scope_ownership_drift"
  | "persistence_policy_gate.invalid_scope_ownership"
  | "persistence_policy_gate.source_ref_required"
  | "persistence_policy_gate.invalid_source_ref"
  | "persistence_policy_gate.allowed_state_required"
  | "persistence_policy_gate.allowed_state_drift"
  | "persistence_policy_gate.unsafe_contract_authority"
  | "persistence_policy_gate.secret_value_forbidden"
  | "persistence_policy_gate.blocked_capability_forbidden"
  | "persistence_policy_gate.live_execution_forbidden"
  | "persistence_policy_gate.python_runtime_requirement_forbidden"
  | "persistence_policy_gate.os_specific_binary_requirement_forbidden"
  | "persistence_policy_gate.side_effects_forbidden";

export type PersistencePolicyGateError = {
  code: PersistencePolicyGateErrorCode;
  path: string;
  message: string;
  severity: "error";
};

export type PersistencePolicyGateEvidence = {
  contract_id: typeof persistencePolicyGateContract.contract_id;
  gate_version: typeof persistencePolicyGateContract.gate_version;
  gate_sequence: PersistencePolicyGateInput[];
  scope_ownership: PersistencePolicyScopeOwnershipInput[];
  required_gate_ids: PersistencePolicyGateId[];
  required_scope_keys: PersistencePolicyScopeKey[];
  source_refs: string[];
  allowed_state: PersistencePolicyAllowedStateInput;
  blocked_capabilities: PersistencePolicyBlockedCapabilityFlag[];
  implementation_artifacts: [];
  live_execution_allowed: false;
  python_runtime_required: false;
  os_specific_binary_required: false;
  side_effects: [];
};

export type PersistencePolicyGateResult =
  | {
      ok: true;
      persistence_policy_gate: PersistencePolicyGateEvidence;
      errors: [];
      side_effects: [];
    }
  | {
      ok: false;
      persistence_policy_gate: null;
      errors: PersistencePolicyGateError[];
      raw_input_content: "withheld";
      side_effects: [];
    };

type NormalizedPersistencePolicyGateRequest =
  | {
      ok: true;
      gate_sequence: PersistencePolicyGateInput[];
      scope_ownership: PersistencePolicyScopeOwnershipInput[];
      source_refs: string[];
      allowed_state: PersistencePolicyAllowedStateInput;
    }
  | {
      ok: false;
      errors: PersistencePolicyGateError[];
    };

const requestKeys = new Set([
  "gate_version",
  "gate_sequence",
  "scope_ownership",
  "source_refs",
  "allowed_state",
  "contract_authority",
  "side_effects",
  ...persistencePolicyBlockedCapabilityFlags,
]);

const gateKeys = new Set([
  "order",
  "gate_id",
  "gate_name",
  "required_evidence_refs",
  "opens_now",
  "opens_later",
]);

const scopeOwnershipKeys = new Set([
  "scope_key",
  "owning_gate_ids",
  "required_later_packet_evidence",
  "current_state",
]);

const sourceRefKeys = new Set(["source_ref", "summary"]);

const allowedStateKeys = new Set([
  "source_only_contract_allowed",
  "gateway_security_boundary",
  "policy_required_before_mutation",
  "approval_required_before_mutation",
  "append_only_audit_required_before_live_state_change",
  "tenant_project_isolation_required_before_live_data",
  "secret_posture",
  "live_execution_allowed",
  "python_runtime_required",
  "os_specific_binary_required",
]);

const gateIds = new Set<PersistencePolicyGateId>(persistencePolicyGateIds);
const scopeKeys = new Set<PersistencePolicyScopeKey>(persistencePolicyScopeKeys);

export const defaultPersistencePolicyGateSequence: PersistencePolicyGateInput[] = [
  {
    order: 1,
    gate_id: "G01_SOURCE_BASELINE",
    gate_name: "Source evidence baseline",
    required_evidence_refs: [
      "docs/architecture/PERSISTENCE_AND_POLICY_GATE_REVIEW.md",
      "docs/reference/CONTRACT_PROVENANCE.md",
    ],
    opens_now: "read-only",
    opens_later: ["none"],
  },
  {
    order: 2,
    gate_id: "G02_SCHEMA_CONTRACT",
    gate_name: "Schema and data contract packet",
    required_evidence_refs: ["docs/architecture/PERSISTENCE_SCHEMA_PLAN.md"],
    opens_now: "read-only",
    opens_later: ["future schema artifact request"],
  },
  {
    order: 3,
    gate_id: "G03_MIGRATION_ARTIFACT_STATIC",
    gate_name: "Migration artifact and static review",
    required_evidence_refs: [
      "repo-local migration artifact",
      "static checker",
      "rollback notes",
    ],
    opens_now: "read-only",
    opens_later: ["future migration approval request"],
  },
  {
    order: 4,
    gate_id: "G04_WRITER_PREFLIGHT",
    gate_name: "Writer interface and preflight",
    required_evidence_refs: [
      "append-only writer interface",
      "idempotency evidence",
      "redaction checks",
    ],
    opens_now: "read-only",
    opens_later: ["future writer implementation request"],
  },
  {
    order: 5,
    gate_id: "G05_DATABASE_SECURITY",
    gate_name: "Database security preflight",
    required_evidence_refs: [
      "tenant/project scope",
      "RLS or approved equivalent",
      "deny-by-default grants",
    ],
    opens_now: "read-only",
    opens_later: ["future DB scope request"],
  },
  {
    order: 6,
    gate_id: "G06_POLICY_GATE",
    gate_name: "Gateway policy gate",
    required_evidence_refs: [
      "BP-0039 or successor policy decision",
      "exact operation policy evidence",
    ],
    opens_now: "read-only",
    opens_later: ["approval request evidence"],
  },
  {
    order: 7,
    gate_id: "G07_APPROVAL_REQUEST",
    gate_name: "Human approval request evidence",
    required_evidence_refs: [
      "BP-0040 or successor approval request",
      "approver scope",
      "rollback obligations",
    ],
    opens_now: "read-only",
    opens_later: ["readiness gate evidence"],
  },
  {
    order: 8,
    gate_id: "G08_PERSISTENCE_READINESS",
    gate_name: "Persistence readiness gate",
    required_evidence_refs: [
      "BP-0071/BP-0077 or successor readiness evidence",
      "required tests",
      "side_effects: []",
    ],
    opens_now: "read-only",
    opens_later: ["explicit implementation packet selection"],
  },
  {
    order: 9,
    gate_id: "G09_IMPLEMENTATION_PACKET",
    gate_name: "Explicit implementation packet",
    required_evidence_refs: [
      "exact write scope",
      "rollback",
      "validation",
      "approval refs",
      "audit refs",
    ],
    opens_now: "none",
    opens_later: [
      "source-only implementation contract",
      "separately approved live request",
    ],
  },
  {
    order: 10,
    gate_id: "G10_LIVE_REQUEST",
    gate_name: "Separate live execution request",
    required_evidence_refs: [
      "environment",
      "operator approval",
      "policy decision",
      "audit write path",
      "rollback",
      "secret refs",
    ],
    opens_now: "none",
    opens_later: ["narrowly approved live request"],
  },
];

export const defaultPersistencePolicyScopeOwnership: PersistencePolicyScopeOwnershipInput[] =
  [
    {
      scope_key: "DB_CONNECTION_WRITE",
      owning_gate_ids: [
        "G05_DATABASE_SECURITY",
        "G08_PERSISTENCE_READINESS",
        "G10_LIVE_REQUEST",
      ],
      required_later_packet_evidence: [
        "schema contract",
        "migration artifact",
        "tenant/project isolation",
        "policy gate",
        "approval request",
        "secret refs",
      ],
      current_state: "blocked",
    },
    {
      scope_key: "WRITER_IMPLEMENTATION",
      owning_gate_ids: [
        "G04_WRITER_PREFLIGHT",
        "G06_POLICY_GATE",
        "G07_APPROVAL_REQUEST",
        "G09_IMPLEMENTATION_PACKET",
      ],
      required_later_packet_evidence: [
        "append-only writer contract",
        "idempotency",
        "redaction",
        "audit obligations",
        "fail-closed tests",
      ],
      current_state: "blocked",
    },
    {
      scope_key: "MIGRATION_EXECUTION",
      owning_gate_ids: [
        "G03_MIGRATION_ARTIFACT_STATIC",
        "G06_POLICY_GATE",
        "G07_APPROVAL_REQUEST",
        "G10_LIVE_REQUEST",
      ],
      required_later_packet_evidence: [
        "static migration checker",
        "reviewed manifest",
        "migration approval request",
        "live environment approval",
      ],
      current_state: "blocked",
    },
    {
      scope_key: "APPROVAL_MUTATION",
      owning_gate_ids: [
        "G06_POLICY_GATE",
        "G07_APPROVAL_REQUEST",
        "G08_PERSISTENCE_READINESS",
        "G09_IMPLEMENTATION_PACKET",
      ],
      required_later_packet_evidence: [
        "persisted approval request model",
        "policy gate",
        "audit append path",
        "state transition contract",
      ],
      current_state: "blocked",
    },
    {
      scope_key: "AUTH_SESSION_STORE",
      owning_gate_ids: [
        "G02_SCHEMA_CONTRACT",
        "G05_DATABASE_SECURITY",
        "G06_POLICY_GATE",
        "G09_IMPLEMENTATION_PACKET",
      ],
      required_later_packet_evidence: [
        "auth mode selection",
        "session data model",
        "secret refs",
        "provider adapter boundary",
      ],
      current_state: "blocked",
    },
    {
      scope_key: "INTEGRATION_SETUP_WRITES",
      owning_gate_ids: [
        "G02_SCHEMA_CONTRACT",
        "G06_POLICY_GATE",
        "G07_APPROVAL_REQUEST",
        "G09_IMPLEMENTATION_PACKET",
      ],
      required_later_packet_evidence: [
        "integration descriptor store",
        "user-owned setup flow",
        "secret references only",
        "live connector disabled by default",
      ],
      current_state: "blocked",
    },
    {
      scope_key: "RUNTIME_ADAPTER_IMPLEMENTATION",
      owning_gate_ids: ["G08_PERSISTENCE_READINESS", "G09_IMPLEMENTATION_PACKET"],
      required_later_packet_evidence: [
        "runtime adapter readiness gate",
        "implementation scope",
        "approval gate",
        "dry-run evidence",
      ],
      current_state: "blocked",
    },
    {
      scope_key: "OS_LEVEL_CONNECTOR_PACKAGE",
      owning_gate_ids: [
        "G06_POLICY_GATE",
        "G07_APPROVAL_REQUEST",
        "G09_IMPLEMENTATION_PACKET",
      ],
      required_later_packet_evidence: [
        "adapter/package manifest",
        "platform target",
        "least-privilege install/uninstall design",
        "deployment-owner opt-in",
        "no core binary requirement",
      ],
      current_state: "blocked",
    },
    {
      scope_key: "EXTERNAL_SERVICE_OR_LIVE_CONNECTOR",
      owning_gate_ids: [
        "G06_POLICY_GATE",
        "G07_APPROVAL_REQUEST",
        "G09_IMPLEMENTATION_PACKET",
      ],
      required_later_packet_evidence: [
        "user-owned integration descriptor",
        "connector adapter",
        "secret refs",
        "disablement",
        "fail-closed tests",
      ],
      current_state: "blocked",
    },
  ];

export const defaultPersistencePolicySourceRefs: PersistencePolicySourceRefInput[] = [
  {
    source_ref: "docs/architecture/PERSISTENCE_AND_POLICY_GATE_REVIEW.md",
    summary: "BP-0202 source-only gate sequence and scope ownership map.",
  },
  {
    source_ref: "docs/architecture/PERSISTENCE_SCHEMA_PLAN.md",
    summary: "Future schema targets, isolation rules, and migration workflow.",
  },
  {
    source_ref: "docs/architecture/AUTH_AND_INTEGRATION_POSTURE.md",
    summary: "Independent open source, user-owned auth and integration posture.",
  },
  {
    source_ref: "docs/reference/CONTRACT_PROVENANCE.md",
    summary: "Completed read-only persistence and policy gate review.",
  },
  {
    source_ref: "docs/reference/CONTRACT_PROVENANCE.md",
    summary: "Source-only persistence gate contract packet.",
  },
];

export const defaultPersistencePolicyAllowedState: PersistencePolicyAllowedStateInput =
  {
    source_only_contract_allowed: true,
    gateway_security_boundary: true,
    policy_required_before_mutation: true,
    approval_required_before_mutation: true,
    append_only_audit_required_before_live_state_change: true,
    tenant_project_isolation_required_before_live_data: true,
    secret_posture: "references_only_no_values",
    live_execution_allowed: false,
    python_runtime_required: false,
    os_specific_binary_required: false,
  };

export function createPersistencePolicyGateContract(
  request: PersistencePolicyGateRequest = {},
): PersistencePolicyGateResult {
  const normalized = normalizeRequest(request);

  if (!normalized.ok) {
    return {
      ok: false,
      persistence_policy_gate: null,
      errors: normalized.errors,
      raw_input_content: "withheld",
      side_effects: [],
    };
  }

  return {
    ok: true,
    persistence_policy_gate: {
      contract_id: persistencePolicyGateContract.contract_id,
      gate_version: persistencePolicyGateContract.gate_version,
      gate_sequence: normalized.gate_sequence,
      scope_ownership: normalized.scope_ownership,
      required_gate_ids: [...persistencePolicyGateIds],
      required_scope_keys: [...persistencePolicyScopeKeys],
      source_refs: normalized.source_refs,
      allowed_state: normalized.allowed_state,
      blocked_capabilities: [...persistencePolicyBlockedCapabilityFlags],
      implementation_artifacts: [],
      live_execution_allowed: false,
      python_runtime_required: false,
      os_specific_binary_required: false,
      side_effects: [],
    },
    errors: [],
    side_effects: [],
  };
}

function normalizeRequest(
  request: PersistencePolicyGateRequest,
): NormalizedPersistencePolicyGateRequest {
  if (!isPlainObject(request)) {
    return {
      ok: false,
      errors: [
        persistencePolicyGateError(
          "persistence_policy_gate.invalid_request",
          "",
          "Persistence policy gate request must be an object.",
        ),
      ],
    };
  }

  const errors: PersistencePolicyGateError[] = [];

  for (const key of Object.keys(request)) {
    if (!requestKeys.has(key)) {
      errors.push(
        persistencePolicyGateError(
          "persistence_policy_gate.unexpected_field",
          `/${escapeJsonPointerSegment(key)}`,
          "Unexpected persistence policy gate field.",
        ),
      );
    }
  }

  if (
    Object.hasOwn(request, "gate_version") &&
    request.gate_version !== persistencePolicyGateContract.gate_version
  ) {
    errors.push(
      persistencePolicyGateError(
        "persistence_policy_gate.invalid_version",
        "/gate_version",
        "Persistence policy gate version is unsupported.",
      ),
    );
  }

  if (
    Object.hasOwn(request, "contract_authority") &&
    request.contract_authority !== persistencePolicyGateContract.contract_authority
  ) {
    errors.push(
      persistencePolicyGateError(
        "persistence_policy_gate.unsafe_contract_authority",
        "/contract_authority",
        "Persistence policy gate authority must stay source-only and no-live.",
      ),
    );
  }

  const gateSequence = Object.hasOwn(request, "gate_sequence")
    ? normalizeGateSequence(request.gate_sequence, errors)
    : defaultPersistencePolicyGateSequence;
  const scopeOwnership = Object.hasOwn(request, "scope_ownership")
    ? normalizeScopeOwnership(request.scope_ownership, errors)
    : defaultPersistencePolicyScopeOwnership;
  const sourceRefs = Object.hasOwn(request, "source_refs")
    ? normalizeSourceRefs(request.source_refs, "/source_refs", errors)
    : defaultPersistencePolicySourceRefs.map((source) => source.source_ref);
  const allowedState = Object.hasOwn(request, "allowed_state")
    ? normalizeAllowedState(request.allowed_state, errors)
    : defaultPersistencePolicyAllowedState;

  for (const flag of persistencePolicyBlockedCapabilityFlags) {
    if (Object.hasOwn(request, flag) && request[flag] !== false) {
      errors.push(forbiddenCapabilityError(flag));
    }
  }

  if (
    Object.hasOwn(request, "side_effects") &&
    (!Array.isArray(request.side_effects) || request.side_effects.length !== 0)
  ) {
    errors.push(
      persistencePolicyGateError(
        "persistence_policy_gate.side_effects_forbidden",
        "/side_effects",
        "Persistence policy gate contract must preserve side_effects: [].",
      ),
    );
  }

  if (errors.length > 0) {
    return { ok: false, errors: dedupeErrors(errors) };
  }

  return {
    ok: true,
    gate_sequence: gateSequence,
    scope_ownership: scopeOwnership,
    source_refs: sourceRefs,
    allowed_state: allowedState,
  };
}

function normalizeGateSequence(
  value: unknown,
  errors: PersistencePolicyGateError[],
): PersistencePolicyGateInput[] {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push(
      persistencePolicyGateError(
        "persistence_policy_gate.gate_sequence_required",
        "/gate_sequence",
        "Persistence policy gate sequence is required.",
      ),
    );
    return defaultPersistencePolicyGateSequence;
  }

  const gates: PersistencePolicyGateInput[] = [];
  value.forEach((gate, index) => {
    const normalized = normalizeGate(gate, `/gate_sequence/${index}`, errors);
    if (normalized !== null) {
      gates.push(normalized);
    }
  });

  validateGateOrder(gates, errors);

  return gates.length > 0 ? gates : defaultPersistencePolicyGateSequence;
}

function normalizeGate(
  value: unknown,
  path: string,
  errors: PersistencePolicyGateError[],
): PersistencePolicyGateInput | null {
  if (!isPlainObject(value)) {
    errors.push(
      persistencePolicyGateError(
        "persistence_policy_gate.invalid_gate",
        path,
        "Persistence policy gate must be an object.",
      ),
    );
    return null;
  }

  for (const key of Object.keys(value)) {
    if (!gateKeys.has(key)) {
      errors.push(
        persistencePolicyGateError(
          "persistence_policy_gate.unexpected_field",
          `${path}/${escapeJsonPointerSegment(key)}`,
          "Unexpected persistence policy gate field.",
        ),
      );
    }
  }

  const gateId = value.gate_id;
  const order = value.order;
  if (typeof gateId !== "string" || !gateIds.has(gateId as PersistencePolicyGateId)) {
    errors.push(
      persistencePolicyGateError(
        "persistence_policy_gate.invalid_gate",
        `${path}/gate_id`,
        "Persistence policy gate_id is unsupported.",
      ),
    );
  }

  if (typeof order !== "number" || !Number.isInteger(order) || order < 1) {
    errors.push(
      persistencePolicyGateError(
        "persistence_policy_gate.invalid_gate",
        `${path}/order`,
        "Persistence policy gate order must be a positive integer.",
      ),
    );
  }

  if (typeof value.gate_name !== "string" || !safeString(value.gate_name)) {
    errors.push(
      persistencePolicyGateError(
        "persistence_policy_gate.invalid_gate",
        `${path}/gate_name`,
        "Persistence policy gate name must be a safe non-secret string.",
      ),
    );
  }

  const evidenceRefs = normalizeStringRefs(
    value.required_evidence_refs,
    `${path}/required_evidence_refs`,
    "persistence_policy_gate.invalid_gate",
    "Persistence policy gate requires source evidence refs.",
    errors,
  );

  if (value.opens_now !== "read-only" && value.opens_now !== "none") {
    errors.push(
      persistencePolicyGateError(
        "persistence_policy_gate.invalid_gate",
        `${path}/opens_now`,
        "Persistence policy gate opens_now must be read-only or none.",
      ),
    );
  }

  const opensLater = normalizeStringRefs(
    value.opens_later,
    `${path}/opens_later`,
    "persistence_policy_gate.invalid_gate",
    "Persistence policy gate requires opens_later refs.",
    errors,
  );

  if (
    typeof gateId === "string" &&
    gateIds.has(gateId as PersistencePolicyGateId) &&
    typeof order === "number" &&
    Number.isInteger(order) &&
    order > 0 &&
    typeof value.gate_name === "string" &&
    safeString(value.gate_name) &&
    evidenceRefs.length > 0 &&
    (value.opens_now === "read-only" || value.opens_now === "none") &&
    opensLater.length > 0
  ) {
    return {
      order,
      gate_id: gateId as PersistencePolicyGateId,
      gate_name: value.gate_name,
      required_evidence_refs: evidenceRefs,
      opens_now: value.opens_now,
      opens_later: opensLater,
    };
  }

  return null;
}

function validateGateOrder(
  gates: PersistencePolicyGateInput[],
  errors: PersistencePolicyGateError[],
): void {
  if (gates.length !== persistencePolicyGateIds.length) {
    errors.push(
      persistencePolicyGateError(
        "persistence_policy_gate.gate_sequence_required",
        "/gate_sequence",
        "Persistence policy gate sequence must include every required gate.",
      ),
    );
  }

  persistencePolicyGateIds.forEach((expectedGateId, index) => {
    const gate = gates[index];
    if (gate?.gate_id !== expectedGateId || gate.order !== index + 1) {
      errors.push(
        persistencePolicyGateError(
          "persistence_policy_gate.gate_order_drift",
          `/gate_sequence/${index}`,
          "Persistence policy gate order drifted from BP-0202 sequence.",
        ),
      );
    }
  });
}

function normalizeScopeOwnership(
  value: unknown,
  errors: PersistencePolicyGateError[],
): PersistencePolicyScopeOwnershipInput[] {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push(
      persistencePolicyGateError(
        "persistence_policy_gate.scope_ownership_required",
        "/scope_ownership",
        "Persistence policy gate requires scope ownership evidence.",
      ),
    );
    return defaultPersistencePolicyScopeOwnership;
  }

  const ownership: PersistencePolicyScopeOwnershipInput[] = [];
  value.forEach((scope, index) => {
    const normalized = normalizeScope(scope, `/scope_ownership/${index}`, errors);
    if (normalized !== null) {
      ownership.push(normalized);
    }
  });

  validateScopeOwnership(ownership, errors);

  return ownership.length > 0 ? ownership : defaultPersistencePolicyScopeOwnership;
}

function normalizeScope(
  value: unknown,
  path: string,
  errors: PersistencePolicyGateError[],
): PersistencePolicyScopeOwnershipInput | null {
  if (!isPlainObject(value)) {
    errors.push(
      persistencePolicyGateError(
        "persistence_policy_gate.invalid_scope_ownership",
        path,
        "Persistence policy scope ownership must be an object.",
      ),
    );
    return null;
  }

  for (const key of Object.keys(value)) {
    if (!scopeOwnershipKeys.has(key)) {
      errors.push(
        persistencePolicyGateError(
          "persistence_policy_gate.unexpected_field",
          `${path}/${escapeJsonPointerSegment(key)}`,
          "Unexpected persistence policy scope ownership field.",
        ),
      );
    }
  }

  const scopeKey = value.scope_key;
  if (
    typeof scopeKey !== "string" ||
    !scopeKeys.has(scopeKey as PersistencePolicyScopeKey)
  ) {
    errors.push(
      persistencePolicyGateError(
        "persistence_policy_gate.invalid_scope_ownership",
        `${path}/scope_key`,
        "Persistence policy scope key is unsupported.",
      ),
    );
  }

  const owningGateIds = normalizeGateIdRefs(
    value.owning_gate_ids,
    `${path}/owning_gate_ids`,
    errors,
  );
  const laterEvidence = normalizeStringRefs(
    value.required_later_packet_evidence,
    `${path}/required_later_packet_evidence`,
    "persistence_policy_gate.invalid_scope_ownership",
    "Persistence policy scope requires later packet evidence refs.",
    errors,
  );

  if (value.current_state !== "blocked") {
    errors.push(
      persistencePolicyGateError(
        "persistence_policy_gate.scope_ownership_drift",
        `${path}/current_state`,
        "Persistence policy scope must remain blocked.",
      ),
    );
  }

  if (
    typeof scopeKey === "string" &&
    scopeKeys.has(scopeKey as PersistencePolicyScopeKey) &&
    owningGateIds.length > 0 &&
    laterEvidence.length > 0 &&
    value.current_state === "blocked"
  ) {
    return {
      scope_key: scopeKey as PersistencePolicyScopeKey,
      owning_gate_ids: owningGateIds,
      required_later_packet_evidence: laterEvidence,
      current_state: "blocked",
    };
  }

  return null;
}

function validateScopeOwnership(
  ownership: PersistencePolicyScopeOwnershipInput[],
  errors: PersistencePolicyGateError[],
): void {
  const byKey = new Map(ownership.map((scope) => [scope.scope_key, scope]));

  for (const requiredScope of defaultPersistencePolicyScopeOwnership) {
    const scope = byKey.get(requiredScope.scope_key);
    if (scope === undefined) {
      errors.push(
        persistencePolicyGateError(
          "persistence_policy_gate.scope_ownership_required",
          "/scope_ownership",
          `Missing persistence policy scope ownership for ${requiredScope.scope_key}.`,
        ),
      );
      continue;
    }

    if (!sameStringArray(scope.owning_gate_ids, requiredScope.owning_gate_ids)) {
      errors.push(
        persistencePolicyGateError(
          "persistence_policy_gate.scope_ownership_drift",
          `/scope_ownership/${ownership.indexOf(scope)}/owning_gate_ids`,
          "Persistence policy scope owning gates drifted from BP-0202 map.",
        ),
      );
    }
  }
}

function normalizeAllowedState(
  value: unknown,
  errors: PersistencePolicyGateError[],
): PersistencePolicyAllowedStateInput {
  if (!isPlainObject(value)) {
    errors.push(
      persistencePolicyGateError(
        "persistence_policy_gate.allowed_state_required",
        "/allowed_state",
        "Persistence policy allowed state must be an object.",
      ),
    );
    return defaultPersistencePolicyAllowedState;
  }

  for (const key of Object.keys(value)) {
    if (!allowedStateKeys.has(key)) {
      errors.push(
        persistencePolicyGateError(
          "persistence_policy_gate.unexpected_field",
          `/allowed_state/${escapeJsonPointerSegment(key)}`,
          "Unexpected persistence policy allowed state field.",
        ),
      );
    }
  }

  const expected = defaultPersistencePolicyAllowedState;
  for (const [key, expectedValue] of Object.entries(expected)) {
    if (value[key] !== expectedValue) {
      errors.push(
        persistencePolicyGateError(
          key === "live_execution_allowed"
            ? "persistence_policy_gate.live_execution_forbidden"
            : key === "python_runtime_required"
              ? "persistence_policy_gate.python_runtime_requirement_forbidden"
              : key === "os_specific_binary_required"
                ? "persistence_policy_gate.os_specific_binary_requirement_forbidden"
                : key === "secret_posture"
                  ? "persistence_policy_gate.secret_value_forbidden"
                  : "persistence_policy_gate.allowed_state_drift",
          `/allowed_state/${key}`,
          "Persistence policy allowed state drifted from source-only no-live posture.",
        ),
      );
    }
  }

  return expected;
}

function normalizeGateIdRefs(
  value: unknown,
  path: string,
  errors: PersistencePolicyGateError[],
): PersistencePolicyGateId[] {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push(
      persistencePolicyGateError(
        "persistence_policy_gate.invalid_scope_ownership",
        path,
        "Persistence policy scope requires owning gate ids.",
      ),
    );
    return [];
  }

  const refs: PersistencePolicyGateId[] = [];
  value.forEach((ref, index) => {
    if (typeof ref !== "string" || !gateIds.has(ref as PersistencePolicyGateId)) {
      errors.push(
        persistencePolicyGateError(
          "persistence_policy_gate.invalid_scope_ownership",
          `${path}/${index}`,
          "Persistence policy scope owning gate id is unsupported.",
        ),
      );
      return;
    }
    refs.push(ref as PersistencePolicyGateId);
  });

  return refs;
}

function normalizeSourceRefs(
  value: unknown,
  path: string,
  errors: PersistencePolicyGateError[],
): string[] {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push(
      persistencePolicyGateError(
        "persistence_policy_gate.source_ref_required",
        path,
        "Persistence policy gate requires source refs.",
      ),
    );
    return [];
  }

  const refs: string[] = [];
  value.forEach((source, index) => {
    const sourcePath = `${path}/${index}`;
    if (!isPlainObject(source)) {
      errors.push(
        persistencePolicyGateError(
          "persistence_policy_gate.invalid_source_ref",
          sourcePath,
          "Persistence policy source ref must be an object.",
        ),
      );
      return;
    }

    for (const key of Object.keys(source)) {
      if (!sourceRefKeys.has(key)) {
        errors.push(
          persistencePolicyGateError(
            "persistence_policy_gate.unexpected_field",
            `${sourcePath}/${escapeJsonPointerSegment(key)}`,
            "Unexpected persistence policy source ref field.",
          ),
        );
      }
    }

    if (typeof source.source_ref !== "string" || !safeSourceRef(source.source_ref)) {
      errors.push(
        persistencePolicyGateError(
          "persistence_policy_gate.invalid_source_ref",
          `${sourcePath}/source_ref`,
          "Persistence policy source_ref must be a safe repo-local ref.",
        ),
      );
      return;
    }

    if (typeof source.summary !== "string" || !safeString(source.summary)) {
      errors.push(
        persistencePolicyGateError(
          "persistence_policy_gate.invalid_source_ref",
          `${sourcePath}/summary`,
          "Persistence policy source ref summary must be safe.",
        ),
      );
      return;
    }

    refs.push(source.source_ref);
  });

  return refs;
}

function normalizeStringRefs(
  value: unknown,
  path: string,
  code: PersistencePolicyGateErrorCode,
  message: string,
  errors: PersistencePolicyGateError[],
): string[] {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push(persistencePolicyGateError(code, path, message));
    return [];
  }

  const refs: string[] = [];
  value.forEach((ref, index) => {
    if (typeof ref !== "string" || !safeString(ref)) {
      errors.push(persistencePolicyGateError(code, `${path}/${index}`, message));
      return;
    }
    refs.push(ref);
  });

  return refs;
}

function forbiddenCapabilityError(
  flag: PersistencePolicyBlockedCapabilityFlag,
): PersistencePolicyGateError {
  if (flag === "live_execution_allowed") {
    return persistencePolicyGateError(
      "persistence_policy_gate.live_execution_forbidden",
      `/${flag}`,
      "Persistence policy gate cannot enable live execution.",
    );
  }

  if (flag === "python_runtime_required") {
    return persistencePolicyGateError(
      "persistence_policy_gate.python_runtime_requirement_forbidden",
      `/${flag}`,
      "Persistence policy gate cannot require Python for core MVP.",
    );
  }

  if (flag === "os_specific_binary_required") {
    return persistencePolicyGateError(
      "persistence_policy_gate.os_specific_binary_requirement_forbidden",
      `/${flag}`,
      "Persistence policy gate cannot require OS-specific binaries for core MVP.",
    );
  }

  return persistencePolicyGateError(
    "persistence_policy_gate.blocked_capability_forbidden",
    `/${flag}`,
    "Persistence policy gate cannot open blocked live, mutation, runtime, credential, deploy, Git, queue, OS, or external-service scope.",
  );
}

function persistencePolicyGateError(
  code: PersistencePolicyGateErrorCode,
  path: string,
  message: string,
): PersistencePolicyGateError {
  return {
    code,
    path,
    message,
    severity: "error",
  };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    (Object.getPrototypeOf(value) === Object.prototype ||
      Object.getPrototypeOf(value) === null)
  );
}

function safeSourceRef(value: string): boolean {
  return (
    safeString(value) &&
    (/^(docs|packages|apps|scripts)\//u.test(value) || value === "docs/ROADMAP.md")
  );
}

function safeString(value: string): boolean {
  const normalized = value.trim();
  return (
    normalized.length > 0 &&
    normalized.length <= 240 &&
    !/secret|token|password|DATABASE_URL|postgres:\/\//iu.test(normalized)
  );
}

function sameStringArray(left: readonly string[], right: readonly string[]): boolean {
  return (
    left.length === right.length && left.every((value, index) => value === right[index])
  );
}

function dedupeErrors(
  errors: PersistencePolicyGateError[],
): PersistencePolicyGateError[] {
  const seen = new Set<string>();
  return errors.filter((error) => {
    const key = `${error.code}:${error.path}:${error.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function escapeJsonPointerSegment(segment: string): string {
  return segment.replaceAll("~", "~0").replaceAll("/", "~1");
}
