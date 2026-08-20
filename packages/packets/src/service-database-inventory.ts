export const SERVICE_DATABASE_INVENTORY_STATUS = "source_only";

export const serviceDatabaseInventoryContract = {
  contract_id: "lnsat.platform.service_database_inventory_migration_planner.v0_1",
  authority: [
    "@lnsat/packets",
    "source-backed-service-database-inventory-migration-planner",
  ],
  inventory_version: "0.1",
  resource_kinds: ["service", "database", "queue", "tunnel"],
  migration_plan_kinds: [
    "schema_migration",
    "data_migration",
    "service_cutover",
    "queue_drain",
    "tunnel_routing_change",
  ],
  source_docs: [
    "docs/architecture/PACKET_MODEL.md",
    "docs/architecture/POLICY_AND_AUDIT.md",
    "docs/architecture/SYSTEM_ARCHITECTURE.md",
    "docs/architecture/SUBSTRATES_AND_NODES.md",
    "docs/architecture/DATA_MODEL.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
  ],
  live_database_write_allowed: false,
  live_service_mutation_allowed: false,
  side_effects: [],
  status: "source_only",
} as const;

export type InventoryResourceKind =
  (typeof serviceDatabaseInventoryContract.resource_kinds)[number];
export type MigrationPlanKind =
  (typeof serviceDatabaseInventoryContract.migration_plan_kinds)[number];

export type ServiceDatabaseInventorySourceInput = {
  source_ref: string;
  summary: string;
};

export type InventoryOwnershipInput = {
  owner_ref: string;
  steward_ref: string;
  approval_group: string;
  escalation_ref: string;
};

export type InventoryDependencyRelationship =
  "depends_on" | "backs" | "publishes_to" | "consumes_from" | "routes_through";

export type InventoryDependencyInput = {
  resource_ref: string;
  relationship: InventoryDependencyRelationship;
  required: boolean;
  source_ref: string;
};

export type InventoryMutationBoundaryInput = {
  observation_allowed: true;
  proposal_allowed: true;
  live_mutation_allowed: false;
  secret_values_allowed: false;
};

export type InventoryItemInput = {
  resource_ref: string;
  resource_kind: InventoryResourceKind;
  name: string;
  environment: "local" | "dev" | "staging" | "production" | "shared";
  ownership: InventoryOwnershipInput;
  dependencies: InventoryDependencyInput[];
  mutation_boundary: InventoryMutationBoundaryInput;
  source_refs: ServiceDatabaseInventorySourceInput[];
  live_service_mutation_allowed?: false;
  live_database_write_allowed?: false;
  side_effects?: [];
};

export type RollbackEvidenceInput = {
  rollback_ref: string;
  summary: string;
  evidence_refs: string[];
  owner_ref: string;
};

export type MigrationPlanInput = {
  plan_ref: string;
  plan_kind: MigrationPlanKind;
  summary: string;
  target_resource_refs: string[];
  risk_level: number;
  dry_run_required: true;
  dry_run_evidence_refs: string[];
  rollback: RollbackEvidenceInput;
  required_approvals: string[];
  secret_refs?: string[];
  live_database_write_allowed?: false;
  live_service_mutation_allowed?: false;
  side_effects?: [];
};

export type InventoryOwnershipEvidence = InventoryOwnershipInput;
export type InventoryDependencyEvidence = InventoryDependencyInput;
export type InventoryMutationBoundaryEvidence = InventoryMutationBoundaryInput;

export type InventoryItemEvidence = {
  resource_ref: string;
  resource_kind: InventoryResourceKind;
  name: string;
  environment: InventoryItemInput["environment"];
  ownership: InventoryOwnershipEvidence;
  dependencies: InventoryDependencyEvidence[];
  mutation_boundary: InventoryMutationBoundaryEvidence;
  source_refs: string[];
  live_service_mutation_allowed: false;
  live_database_write_allowed: false;
  side_effects: [];
};

export type RollbackEvidence = RollbackEvidenceInput;

export type MigrationPlanEvidence = {
  plan_ref: string;
  plan_kind: MigrationPlanKind;
  summary: string;
  target_resource_refs: string[];
  risk_level: number;
  dry_run_required: true;
  dry_run_evidence_refs: string[];
  rollback: RollbackEvidence;
  required_approvals: string[];
  secret_refs: string[];
  secret_posture: "references_only_no_values";
  live_database_write_allowed: false;
  live_service_mutation_allowed: false;
  side_effects: [];
};

export type ServiceDatabaseInventoryRequest = {
  inventory_version?: typeof serviceDatabaseInventoryContract.inventory_version;
  inventory_items?: InventoryItemInput[] | InventoryItemEvidence[];
  migration_plan?: MigrationPlanInput | MigrationPlanEvidence;
  source_refs?: ServiceDatabaseInventorySourceInput[];
  live_database_write_allowed?: false;
  live_service_mutation_allowed?: false;
  side_effects?: [];
};

export type ServiceDatabaseInventoryErrorCode =
  | "service_database_inventory.invalid_request"
  | "service_database_inventory.unexpected_field"
  | "service_database_inventory.invalid_version"
  | "service_database_inventory.inventory_required"
  | "service_database_inventory.inventory_item_required"
  | "service_database_inventory.unknown_resource_kind"
  | "service_database_inventory.invalid_inventory_item"
  | "service_database_inventory.invalid_ownership"
  | "service_database_inventory.invalid_dependency"
  | "service_database_inventory.invalid_boundary"
  | "service_database_inventory.migration_plan_required"
  | "service_database_inventory.invalid_migration_plan"
  | "service_database_inventory.rollback_evidence_required"
  | "service_database_inventory.dry_run_evidence_required"
  | "service_database_inventory.approval_required"
  | "service_database_inventory.secret_value_forbidden"
  | "service_database_inventory.invalid_source_ref"
  | "service_database_inventory.live_database_write_forbidden"
  | "service_database_inventory.live_service_mutation_forbidden"
  | "service_database_inventory.side_effects_forbidden";

export type ServiceDatabaseInventoryError = {
  code: ServiceDatabaseInventoryErrorCode;
  path: string;
  message: string;
  severity: "error";
};

export type ServiceDatabaseInventoryContractEvidence = {
  contract_id: typeof serviceDatabaseInventoryContract.contract_id;
  inventory_version: typeof serviceDatabaseInventoryContract.inventory_version;
  resource_kinds: InventoryResourceKind[];
  migration_plan_kinds: MigrationPlanKind[];
  inventory_items: InventoryItemEvidence[];
  migration_plan: MigrationPlanEvidence;
  ownership_refs: string[];
  dependency_refs: string[];
  blocked_live_actions: string[];
  required_approvals: string[];
  rollback_evidence_refs: string[];
  dry_run_requirements: string[];
  missing_evidence: [];
  secret_posture: "references_only_no_values";
  source_refs: string[];
  live_database_write_allowed: false;
  live_service_mutation_allowed: false;
  side_effects: [];
};

export type ServiceDatabaseInventoryResult =
  | {
      ok: true;
      service_database_inventory: ServiceDatabaseInventoryContractEvidence;
      errors: [];
      side_effects: [];
    }
  | {
      ok: false;
      service_database_inventory: null;
      errors: ServiceDatabaseInventoryError[];
      raw_input_content: "withheld";
      side_effects: [];
    };

type NormalizedServiceDatabaseInventoryRequest =
  | {
      ok: true;
      inventory_items: InventoryItemEvidence[];
      migration_plan: MigrationPlanEvidence;
      source_refs: string[];
    }
  | {
      ok: false;
      errors: ServiceDatabaseInventoryError[];
    };

const requestKeys = new Set([
  "inventory_version",
  "inventory_items",
  "migration_plan",
  "source_refs",
  "live_database_write_allowed",
  "live_service_mutation_allowed",
  "side_effects",
]);
const inventoryItemKeys = new Set([
  "resource_ref",
  "resource_kind",
  "name",
  "environment",
  "ownership",
  "dependencies",
  "mutation_boundary",
  "source_refs",
  "live_service_mutation_allowed",
  "live_database_write_allowed",
  "side_effects",
]);
const ownershipKeys = new Set([
  "owner_ref",
  "steward_ref",
  "approval_group",
  "escalation_ref",
]);
const dependencyKeys = new Set([
  "resource_ref",
  "relationship",
  "required",
  "source_ref",
]);
const mutationBoundaryKeys = new Set([
  "observation_allowed",
  "proposal_allowed",
  "live_mutation_allowed",
  "secret_values_allowed",
]);
const migrationPlanKeys = new Set([
  "plan_ref",
  "plan_kind",
  "summary",
  "target_resource_refs",
  "risk_level",
  "dry_run_required",
  "dry_run_evidence_refs",
  "rollback",
  "required_approvals",
  "secret_refs",
  "secret_posture",
  "live_database_write_allowed",
  "live_service_mutation_allowed",
  "side_effects",
]);
const rollbackKeys = new Set(["rollback_ref", "summary", "evidence_refs", "owner_ref"]);
const sourceKeys = new Set(["source_ref", "summary"]);
const resourceKinds = new Set<InventoryResourceKind>(
  serviceDatabaseInventoryContract.resource_kinds,
);
const migrationPlanKinds = new Set<MigrationPlanKind>(
  serviceDatabaseInventoryContract.migration_plan_kinds,
);
const environments = new Set(["local", "dev", "staging", "production", "shared"]);
const relationships = new Set<InventoryDependencyRelationship>([
  "depends_on",
  "backs",
  "publishes_to",
  "consumes_from",
  "routes_through",
]);
const safeStringPattern = /^[\w .,:;@/()[\]#_+=-]{3,240}$/;
const resourceRefPattern = /^[a-z][a-z0-9_-]*:[\w./:@#_-]{3,180}$/;
const approvalPattern = /^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*){1,7}$/;
const secretRefPattern = /^secret_ref:[\w./:@#_-]{3,180}$/;
const secretLikePattern =
  /(postgres:\/\/|mysql:\/\/|mongodb:\/\/|DATABASE_URL|API_KEY|SECRET=|TOKEN=|PASSWORD|PRIVATE KEY|BEGIN [A-Z ]*PRIVATE KEY|sk-[A-Za-z0-9]|AKIA[A-Z0-9]|secret:)/i;
const liveDatabaseWritePattern =
  /\b(database\.write|database\.migration\.execute|db\.write|sql\.execute|migration\.run|migrate\.up|insert|update|delete|drop|truncate|alter table|create table)\b/i;
const serviceMutationPattern =
  /\b(service\.restart|service\.config\.write|restart|restart\.execute|systemctl|launchctl|deploy\.execute|queue\.worker\.start|queue\.purge|dns\.write|cloudflare\.write|ssh\.raw)\b/i;

const defaultBlockedLiveActions = [
  "database.write.execute",
  "database.migration.execute",
  "service.restart.execute",
  "service.config.write",
  "queue.worker.start",
  "queue.purge.execute",
  "tunnel.dns.write",
  "cloudflare.mutation.execute",
  "ssh.raw.execute",
];

const defaultRequiredApprovals = [
  "database.migration.approval",
  "service.mutation.approval",
  "rollback.plan.approval",
  "dry_run.evidence.approval",
];

export const defaultInventoryItems: InventoryItemEvidence[] = [
  inventoryItem("service:lnsat-gateway", "service", {
    name: "LNSAT Gateway source-only service record",
    environment: "shared",
    ownership: {
      owner_ref: "owner:lnsat-platform",
      steward_ref: "steward:gateway-operator",
      approval_group: "approval:lnsat-platform-owners",
      escalation_ref: "runbook:service-change-review",
    },
    dependencies: [
      {
        resource_ref: "database:audit-ledger-postgresql",
        relationship: "depends_on",
        required: true,
        source_ref: "doc:docs/architecture/DATA_MODEL.md",
      },
      {
        resource_ref: "queue:audit-ledger-review",
        relationship: "publishes_to",
        required: false,
        source_ref: "doc:docs/architecture/SUBSTRATES_AND_NODES.md",
      },
    ],
  }),
  inventoryItem("database:audit-ledger-postgresql", "database", {
    name: "Audit ledger PostgreSQL source-only target",
    environment: "shared",
    ownership: {
      owner_ref: "owner:lnsat-platform",
      steward_ref: "steward:audit-ledger",
      approval_group: "approval:audit-ledger-owners",
      escalation_ref: "runbook:database-migration-review",
    },
    dependencies: [],
  }),
  inventoryItem("queue:audit-ledger-review", "queue", {
    name: "Audit ledger review queue source-only placeholder",
    environment: "shared",
    ownership: {
      owner_ref: "owner:lnsat-platform",
      steward_ref: "steward:audit-ledger",
      approval_group: "approval:audit-ledger-owners",
      escalation_ref: "runbook:queue-worker-review",
    },
    dependencies: [
      {
        resource_ref: "service:lnsat-gateway",
        relationship: "consumes_from",
        required: false,
        source_ref: "doc:docs/architecture/SYSTEM_ARCHITECTURE.md",
      },
    ],
  }),
  inventoryItem("tunnel:lnsat-example-invalid", "tunnel", {
    name: "lnsat.example.invalid tunnel source-only surface",
    environment: "production",
    ownership: {
      owner_ref: "owner:hypler",
      steward_ref: "steward:lnsat-platform",
      approval_group: "approval:network-change-review",
      escalation_ref: "runbook:tunnel-routing-review",
    },
    dependencies: [
      {
        resource_ref: "service:lnsat-gateway",
        relationship: "routes_through",
        required: true,
        source_ref: "doc:docs/ROADMAP.md",
      },
    ],
  }),
];

export const defaultMigrationPlan: MigrationPlanEvidence = migrationPlan({
  plan_ref: "migration_plan:audit-ledger-schema-v0-1-source-only",
  plan_kind: "schema_migration",
  summary:
    "source-only migration plan requiring dry-run and rollback evidence before live database action",
  target_resource_refs: ["database:audit-ledger-postgresql"],
  risk_level: 7,
  dry_run_required: true,
  dry_run_evidence_refs: [
    "review:fixtures/audit/migration-review.md",
    "check:npm-run-audit-migrations-check",
  ],
  rollback: {
    rollback_ref: "rollback:forward-repair-or-disable-writer-access",
    summary:
      "rollback requires forward repair migration or disabling unapproved writer access",
    evidence_refs: [
      "doc:docs/architecture/DATA_MODEL.md",
      "doc:docs/reference/CONTRACT_PROVENANCE.md",
    ],
    owner_ref: "owner:audit-ledger-owners",
  },
  required_approvals: defaultRequiredApprovals,
  secret_refs: [],
});

export function createServiceDatabaseInventory(
  input: unknown = {},
): ServiceDatabaseInventoryResult {
  const normalized = normalizeServiceDatabaseInventoryRequest(input);

  if (!normalized.ok) {
    return failServiceDatabaseInventory(normalized.errors);
  }

  return {
    ok: true,
    service_database_inventory: {
      contract_id: serviceDatabaseInventoryContract.contract_id,
      inventory_version: serviceDatabaseInventoryContract.inventory_version,
      resource_kinds: [...serviceDatabaseInventoryContract.resource_kinds],
      migration_plan_kinds: [...serviceDatabaseInventoryContract.migration_plan_kinds],
      inventory_items: normalized.inventory_items,
      migration_plan: normalized.migration_plan,
      ownership_refs: uniqueStrings(
        normalized.inventory_items.flatMap((item) => [
          item.ownership.owner_ref,
          item.ownership.steward_ref,
          item.ownership.approval_group,
        ]),
      ),
      dependency_refs: uniqueStrings(
        normalized.inventory_items.flatMap((item) =>
          item.dependencies.map((dependency) => dependency.resource_ref),
        ),
      ),
      blocked_live_actions: defaultBlockedLiveActions,
      required_approvals: uniqueStrings([
        ...defaultRequiredApprovals,
        ...normalized.migration_plan.required_approvals,
      ]),
      rollback_evidence_refs: normalized.migration_plan.rollback.evidence_refs,
      dry_run_requirements: normalized.migration_plan.dry_run_evidence_refs,
      missing_evidence: [],
      secret_posture: "references_only_no_values",
      source_refs: sourceRefs(normalized.source_refs),
      live_database_write_allowed: false,
      live_service_mutation_allowed: false,
      side_effects: [],
    },
    errors: [],
    side_effects: [],
  };
}

function normalizeServiceDatabaseInventoryRequest(
  input: unknown,
): NormalizedServiceDatabaseInventoryRequest {
  if (!isPlainObject(input)) {
    return {
      ok: false,
      errors: [
        serviceDatabaseInventoryError(
          "service_database_inventory.invalid_request",
          "",
          "Service/database inventory request must be an object.",
        ),
      ],
    };
  }

  const errors: ServiceDatabaseInventoryError[] = [];
  for (const key of Object.keys(input)) {
    if (!requestKeys.has(key)) {
      errors.push(
        serviceDatabaseInventoryError(
          "service_database_inventory.unexpected_field",
          jsonPointer(key),
          "Unexpected service/database inventory request field.",
        ),
      );
    }
  }

  if (
    Object.hasOwn(input, "inventory_version") &&
    input.inventory_version !== serviceDatabaseInventoryContract.inventory_version
  ) {
    errors.push(
      serviceDatabaseInventoryError(
        "service_database_inventory.invalid_version",
        "/inventory_version",
        "Service/database inventory version is unsupported.",
      ),
    );
  }

  const inventoryItems =
    Object.hasOwn(input, "inventory_items") && input.inventory_items !== undefined
      ? normalizeInventoryItems(input.inventory_items, errors)
      : defaultInventoryItems;
  const migrationPlan =
    Object.hasOwn(input, "migration_plan") && input.migration_plan !== undefined
      ? normalizeMigrationPlan(input.migration_plan, inventoryItems, errors)
      : defaultMigrationPlan;
  const refs = Object.hasOwn(input, "source_refs")
    ? normalizeSourceRefs(input.source_refs, "/source_refs", errors)
    : [];

  if (
    Object.hasOwn(input, "live_database_write_allowed") &&
    input.live_database_write_allowed !== false
  ) {
    errors.push(
      serviceDatabaseInventoryError(
        "service_database_inventory.live_database_write_forbidden",
        "/live_database_write_allowed",
        "Service/database inventory contract cannot enable live database writes.",
      ),
    );
  }

  if (
    Object.hasOwn(input, "live_service_mutation_allowed") &&
    input.live_service_mutation_allowed !== false
  ) {
    errors.push(
      serviceDatabaseInventoryError(
        "service_database_inventory.live_service_mutation_forbidden",
        "/live_service_mutation_allowed",
        "Service/database inventory contract cannot enable live service mutation.",
      ),
    );
  }

  if (
    Object.hasOwn(input, "side_effects") &&
    (!Array.isArray(input.side_effects) || input.side_effects.length !== 0)
  ) {
    errors.push(
      serviceDatabaseInventoryError(
        "service_database_inventory.side_effects_forbidden",
        "/side_effects",
        "Service/database inventory contract must preserve side_effects: [].",
      ),
    );
  }

  if (errors.length > 0) {
    return { ok: false, errors: dedupeErrors(errors) };
  }

  return {
    ok: true,
    inventory_items: inventoryItems,
    migration_plan: migrationPlan,
    source_refs: refs,
  };
}

function normalizeInventoryItems(
  value: unknown,
  errors: ServiceDatabaseInventoryError[],
): InventoryItemEvidence[] {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push(
      serviceDatabaseInventoryError(
        "service_database_inventory.inventory_required",
        "/inventory_items",
        "Service/database inventory requires one or more inventory items.",
      ),
    );
    return defaultInventoryItems;
  }

  const items: InventoryItemEvidence[] = [];
  value.forEach((item, index) => {
    const normalized = normalizeInventoryItem(
      item,
      `/inventory_items/${index}`,
      errors,
    );
    if (normalized !== null) {
      items.push(normalized);
    }
  });

  return items.length > 0 ? items : defaultInventoryItems;
}

function normalizeInventoryItem(
  value: unknown,
  path: string,
  errors: ServiceDatabaseInventoryError[],
): InventoryItemEvidence | null {
  if (!isPlainObject(value)) {
    errors.push(
      serviceDatabaseInventoryError(
        "service_database_inventory.inventory_item_required",
        path,
        "Inventory item must be an object.",
      ),
    );
    return null;
  }

  for (const key of Object.keys(value)) {
    if (!inventoryItemKeys.has(key)) {
      errors.push(
        serviceDatabaseInventoryError(
          "service_database_inventory.unexpected_field",
          `${path}/${escapeJsonPointerSegment(key)}`,
          "Unexpected inventory item field.",
        ),
      );
    }
  }

  if (
    typeof value.resource_kind !== "string" ||
    !resourceKinds.has(value.resource_kind as InventoryResourceKind)
  ) {
    errors.push(
      serviceDatabaseInventoryError(
        "service_database_inventory.unknown_resource_kind",
        `${path}/resource_kind`,
        "Inventory item resource_kind is unsupported.",
      ),
    );
  }

  if (typeof value.resource_ref !== "string" || !safeResourceRef(value.resource_ref)) {
    errors.push(
      serviceDatabaseInventoryError(
        "service_database_inventory.invalid_inventory_item",
        `${path}/resource_ref`,
        "Inventory item resource_ref must be a safe source-backed resource reference.",
      ),
    );
  }

  if (typeof value.name !== "string" || !safeString(value.name)) {
    errors.push(
      serviceDatabaseInventoryError(
        "service_database_inventory.invalid_inventory_item",
        `${path}/name`,
        "Inventory item name must be a safe non-secret string.",
      ),
    );
  }

  if (typeof value.environment !== "string" || !environments.has(value.environment)) {
    errors.push(
      serviceDatabaseInventoryError(
        "service_database_inventory.invalid_inventory_item",
        `${path}/environment`,
        "Inventory item environment is unsupported.",
      ),
    );
  }

  const ownership = normalizeOwnership(value.ownership, `${path}/ownership`, errors);
  const dependencies = normalizeDependencies(
    value.dependencies,
    `${path}/dependencies`,
    errors,
  );
  const mutationBoundary = normalizeMutationBoundary(
    value.mutation_boundary,
    `${path}/mutation_boundary`,
    errors,
  );
  const refs = normalizeSourceRefs(value.source_refs, `${path}/source_refs`, errors);

  if (
    Object.hasOwn(value, "live_database_write_allowed") &&
    value.live_database_write_allowed !== false
  ) {
    errors.push(
      serviceDatabaseInventoryError(
        "service_database_inventory.live_database_write_forbidden",
        `${path}/live_database_write_allowed`,
        "Inventory item cannot enable live database writes.",
      ),
    );
  }

  if (
    Object.hasOwn(value, "live_service_mutation_allowed") &&
    value.live_service_mutation_allowed !== false
  ) {
    errors.push(
      serviceDatabaseInventoryError(
        "service_database_inventory.live_service_mutation_forbidden",
        `${path}/live_service_mutation_allowed`,
        "Inventory item cannot enable live service mutation.",
      ),
    );
  }

  if (
    Object.hasOwn(value, "side_effects") &&
    (!Array.isArray(value.side_effects) || value.side_effects.length !== 0)
  ) {
    errors.push(
      serviceDatabaseInventoryError(
        "service_database_inventory.side_effects_forbidden",
        `${path}/side_effects`,
        "Inventory item must preserve side_effects: [].",
      ),
    );
  }

  if (
    typeof value.resource_ref === "string" &&
    safeResourceRef(value.resource_ref) &&
    typeof value.resource_kind === "string" &&
    resourceKinds.has(value.resource_kind as InventoryResourceKind) &&
    typeof value.name === "string" &&
    safeString(value.name) &&
    typeof value.environment === "string" &&
    environments.has(value.environment) &&
    ownership !== null &&
    mutationBoundary !== null &&
    refs.length > 0
  ) {
    return {
      resource_ref: value.resource_ref,
      resource_kind: value.resource_kind as InventoryResourceKind,
      name: value.name,
      environment: value.environment as InventoryItemEvidence["environment"],
      ownership,
      dependencies,
      mutation_boundary: mutationBoundary,
      source_refs: refs,
      live_service_mutation_allowed: false,
      live_database_write_allowed: false,
      side_effects: [],
    };
  }

  return null;
}

function normalizeOwnership(
  value: unknown,
  path: string,
  errors: ServiceDatabaseInventoryError[],
): InventoryOwnershipEvidence | null {
  if (!isPlainObject(value)) {
    errors.push(
      serviceDatabaseInventoryError(
        "service_database_inventory.invalid_ownership",
        path,
        "Inventory ownership must be an object.",
      ),
    );
    return null;
  }

  for (const key of Object.keys(value)) {
    if (!ownershipKeys.has(key)) {
      errors.push(
        serviceDatabaseInventoryError(
          "service_database_inventory.unexpected_field",
          `${path}/${escapeJsonPointerSegment(key)}`,
          "Unexpected inventory ownership field.",
        ),
      );
    }
  }

  const ownership = {
    owner_ref: value.owner_ref,
    steward_ref: value.steward_ref,
    approval_group: value.approval_group,
    escalation_ref: value.escalation_ref,
  };
  const invalid = Object.entries(ownership).filter(
    ([, field]) => typeof field !== "string" || !safeResourceRef(field),
  );
  for (const [field] of invalid) {
    errors.push(
      serviceDatabaseInventoryError(
        "service_database_inventory.invalid_ownership",
        `${path}/${field}`,
        "Inventory ownership refs must be safe source-backed refs.",
      ),
    );
  }

  if (invalid.length > 0) {
    return null;
  }

  return ownership as InventoryOwnershipEvidence;
}

function normalizeDependencies(
  value: unknown,
  path: string,
  errors: ServiceDatabaseInventoryError[],
): InventoryDependencyEvidence[] {
  if (!Array.isArray(value)) {
    errors.push(
      serviceDatabaseInventoryError(
        "service_database_inventory.invalid_dependency",
        path,
        "Inventory dependencies must be an array.",
      ),
    );
    return [];
  }

  const dependencies: InventoryDependencyEvidence[] = [];
  value.forEach((dependency, index) => {
    const dependencyPath = `${path}/${index}`;
    if (!isPlainObject(dependency)) {
      errors.push(
        serviceDatabaseInventoryError(
          "service_database_inventory.invalid_dependency",
          dependencyPath,
          "Inventory dependency must be an object.",
        ),
      );
      return;
    }

    for (const key of Object.keys(dependency)) {
      if (!dependencyKeys.has(key)) {
        errors.push(
          serviceDatabaseInventoryError(
            "service_database_inventory.unexpected_field",
            `${dependencyPath}/${escapeJsonPointerSegment(key)}`,
            "Unexpected inventory dependency field.",
          ),
        );
      }
    }

    if (
      typeof dependency.resource_ref !== "string" ||
      !safeResourceRef(dependency.resource_ref)
    ) {
      errors.push(
        serviceDatabaseInventoryError(
          "service_database_inventory.invalid_dependency",
          `${dependencyPath}/resource_ref`,
          "Inventory dependency resource_ref must be safe.",
        ),
      );
    }

    if (
      typeof dependency.relationship !== "string" ||
      !relationships.has(dependency.relationship as InventoryDependencyRelationship)
    ) {
      errors.push(
        serviceDatabaseInventoryError(
          "service_database_inventory.invalid_dependency",
          `${dependencyPath}/relationship`,
          "Inventory dependency relationship is unsupported.",
        ),
      );
    }

    if (typeof dependency.required !== "boolean") {
      errors.push(
        serviceDatabaseInventoryError(
          "service_database_inventory.invalid_dependency",
          `${dependencyPath}/required`,
          "Inventory dependency required must be boolean.",
        ),
      );
    }

    if (
      typeof dependency.source_ref !== "string" ||
      !safeSourceRef(dependency.source_ref)
    ) {
      errors.push(
        serviceDatabaseInventoryError(
          "service_database_inventory.invalid_dependency",
          `${dependencyPath}/source_ref`,
          "Inventory dependency source_ref must be safe.",
        ),
      );
    }

    if (
      typeof dependency.resource_ref === "string" &&
      safeResourceRef(dependency.resource_ref) &&
      typeof dependency.relationship === "string" &&
      relationships.has(dependency.relationship as InventoryDependencyRelationship) &&
      typeof dependency.required === "boolean" &&
      typeof dependency.source_ref === "string" &&
      safeSourceRef(dependency.source_ref)
    ) {
      dependencies.push({
        resource_ref: dependency.resource_ref,
        relationship: dependency.relationship as InventoryDependencyRelationship,
        required: dependency.required,
        source_ref: dependency.source_ref,
      });
    }
  });

  return dependencies;
}

function normalizeMutationBoundary(
  value: unknown,
  path: string,
  errors: ServiceDatabaseInventoryError[],
): InventoryMutationBoundaryEvidence | null {
  if (!isPlainObject(value)) {
    errors.push(
      serviceDatabaseInventoryError(
        "service_database_inventory.invalid_boundary",
        path,
        "Inventory mutation boundary must be an object.",
      ),
    );
    return null;
  }

  for (const key of Object.keys(value)) {
    if (!mutationBoundaryKeys.has(key)) {
      errors.push(
        serviceDatabaseInventoryError(
          "service_database_inventory.unexpected_field",
          `${path}/${escapeJsonPointerSegment(key)}`,
          "Unexpected inventory mutation boundary field.",
        ),
      );
    }
  }

  if (value.observation_allowed !== true || value.proposal_allowed !== true) {
    errors.push(
      serviceDatabaseInventoryError(
        "service_database_inventory.invalid_boundary",
        path,
        "Inventory boundary must allow observation and proposal only.",
      ),
    );
  }

  if (value.live_mutation_allowed !== false) {
    errors.push(
      serviceDatabaseInventoryError(
        "service_database_inventory.live_service_mutation_forbidden",
        `${path}/live_mutation_allowed`,
        "Inventory boundary cannot allow live mutation.",
      ),
    );
  }

  if (value.secret_values_allowed !== false) {
    errors.push(
      serviceDatabaseInventoryError(
        "service_database_inventory.secret_value_forbidden",
        `${path}/secret_values_allowed`,
        "Inventory boundary cannot allow secret values.",
      ),
    );
  }

  if (
    value.observation_allowed === true &&
    value.proposal_allowed === true &&
    value.live_mutation_allowed === false &&
    value.secret_values_allowed === false
  ) {
    return {
      observation_allowed: true,
      proposal_allowed: true,
      live_mutation_allowed: false,
      secret_values_allowed: false,
    };
  }

  return null;
}

function normalizeMigrationPlan(
  value: unknown,
  inventoryItems: InventoryItemEvidence[],
  errors: ServiceDatabaseInventoryError[],
): MigrationPlanEvidence {
  const path = "/migration_plan";
  if (!isPlainObject(value)) {
    errors.push(
      serviceDatabaseInventoryError(
        "service_database_inventory.migration_plan_required",
        path,
        "Migration plan evidence is required.",
      ),
    );
    return defaultMigrationPlan;
  }

  for (const key of Object.keys(value)) {
    if (!migrationPlanKeys.has(key)) {
      errors.push(
        serviceDatabaseInventoryError(
          "service_database_inventory.unexpected_field",
          `${path}/${escapeJsonPointerSegment(key)}`,
          "Unexpected migration plan field.",
        ),
      );
    }
  }

  if (typeof value.plan_ref !== "string" || !safeResourceRef(value.plan_ref)) {
    errors.push(
      serviceDatabaseInventoryError(
        "service_database_inventory.invalid_migration_plan",
        `${path}/plan_ref`,
        "Migration plan_ref must be a safe source-backed reference.",
      ),
    );
  }

  if (
    typeof value.plan_kind !== "string" ||
    !migrationPlanKinds.has(value.plan_kind as MigrationPlanKind)
  ) {
    errors.push(
      serviceDatabaseInventoryError(
        "service_database_inventory.invalid_migration_plan",
        `${path}/plan_kind`,
        "Migration plan kind is unsupported.",
      ),
    );
  }

  if (typeof value.summary !== "string" || !safeString(value.summary)) {
    errors.push(
      serviceDatabaseInventoryError(
        "service_database_inventory.invalid_migration_plan",
        `${path}/summary`,
        "Migration plan summary must be a safe non-secret string.",
      ),
    );
  }

  const targetResourceRefs = normalizeTargetResourceRefs(
    value.target_resource_refs,
    `${path}/target_resource_refs`,
    inventoryItems,
    errors,
  );
  const dryRunEvidenceRefs = normalizeStringRefs(
    value.dry_run_evidence_refs,
    `${path}/dry_run_evidence_refs`,
    "service_database_inventory.dry_run_evidence_required",
    "Migration plan requires dry-run evidence refs.",
    errors,
  );
  const rollback = normalizeRollbackEvidence(
    value.rollback,
    `${path}/rollback`,
    errors,
  );
  const requiredApprovals = normalizeApprovals(
    value.required_approvals,
    `${path}/required_approvals`,
    errors,
  );
  const secretRefs = Object.hasOwn(value, "secret_refs")
    ? normalizeSecretRefs(value.secret_refs, `${path}/secret_refs`, errors)
    : [];
  const riskLevel =
    typeof value.risk_level === "number" ? value.risk_level : Number.NaN;

  if (!Number.isInteger(riskLevel) || riskLevel < 0 || riskLevel > 8) {
    errors.push(
      serviceDatabaseInventoryError(
        "service_database_inventory.invalid_migration_plan",
        `${path}/risk_level`,
        "Migration plan risk_level must be an integer from 0 to 8.",
      ),
    );
  }

  if (value.dry_run_required !== true) {
    errors.push(
      serviceDatabaseInventoryError(
        "service_database_inventory.dry_run_evidence_required",
        `${path}/dry_run_required`,
        "Migration plan must require a dry run before live action.",
      ),
    );
  }

  if (
    Object.hasOwn(value, "secret_posture") &&
    value.secret_posture !== "references_only_no_values"
  ) {
    errors.push(
      serviceDatabaseInventoryError(
        "service_database_inventory.secret_value_forbidden",
        `${path}/secret_posture`,
        "Migration plan secret posture must be references_only_no_values.",
      ),
    );
  }

  if (
    Object.hasOwn(value, "live_database_write_allowed") &&
    value.live_database_write_allowed !== false
  ) {
    errors.push(
      serviceDatabaseInventoryError(
        "service_database_inventory.live_database_write_forbidden",
        `${path}/live_database_write_allowed`,
        "Migration plan cannot enable live database writes.",
      ),
    );
  }

  if (
    Object.hasOwn(value, "live_service_mutation_allowed") &&
    value.live_service_mutation_allowed !== false
  ) {
    errors.push(
      serviceDatabaseInventoryError(
        "service_database_inventory.live_service_mutation_forbidden",
        `${path}/live_service_mutation_allowed`,
        "Migration plan cannot enable live service mutation.",
      ),
    );
  }

  if (
    Object.hasOwn(value, "side_effects") &&
    (!Array.isArray(value.side_effects) || value.side_effects.length !== 0)
  ) {
    errors.push(
      serviceDatabaseInventoryError(
        "service_database_inventory.side_effects_forbidden",
        `${path}/side_effects`,
        "Migration plan must preserve side_effects: [].",
      ),
    );
  }

  if (
    typeof value.plan_ref === "string" &&
    safeResourceRef(value.plan_ref) &&
    typeof value.plan_kind === "string" &&
    migrationPlanKinds.has(value.plan_kind as MigrationPlanKind) &&
    typeof value.summary === "string" &&
    safeString(value.summary) &&
    targetResourceRefs.length > 0 &&
    Number.isInteger(riskLevel) &&
    riskLevel >= 0 &&
    riskLevel <= 8 &&
    value.dry_run_required === true &&
    dryRunEvidenceRefs.length > 0 &&
    rollback !== null &&
    requiredApprovals.length > 0
  ) {
    return {
      plan_ref: value.plan_ref,
      plan_kind: value.plan_kind as MigrationPlanKind,
      summary: value.summary,
      target_resource_refs: targetResourceRefs,
      risk_level: riskLevel,
      dry_run_required: true,
      dry_run_evidence_refs: dryRunEvidenceRefs,
      rollback,
      required_approvals: requiredApprovals,
      secret_refs: secretRefs,
      secret_posture: "references_only_no_values",
      live_database_write_allowed: false,
      live_service_mutation_allowed: false,
      side_effects: [],
    };
  }

  return defaultMigrationPlan;
}

function normalizeTargetResourceRefs(
  value: unknown,
  path: string,
  inventoryItems: InventoryItemEvidence[],
  errors: ServiceDatabaseInventoryError[],
): string[] {
  const refs = normalizeStringRefs(
    value,
    path,
    "service_database_inventory.invalid_migration_plan",
    "Migration plan requires safe target resource refs.",
    errors,
  );
  const knownRefs = new Set(inventoryItems.map((item) => item.resource_ref));
  refs.forEach((ref, index) => {
    if (!knownRefs.has(ref)) {
      errors.push(
        serviceDatabaseInventoryError(
          "service_database_inventory.invalid_migration_plan",
          `${path}/${index}`,
          "Migration plan target resource must exist in inventory evidence.",
        ),
      );
    }
  });
  return refs;
}

function normalizeRollbackEvidence(
  value: unknown,
  path: string,
  errors: ServiceDatabaseInventoryError[],
): RollbackEvidence | null {
  if (!isPlainObject(value)) {
    errors.push(
      serviceDatabaseInventoryError(
        "service_database_inventory.rollback_evidence_required",
        path,
        "Migration plan requires rollback evidence.",
      ),
    );
    return null;
  }

  for (const key of Object.keys(value)) {
    if (!rollbackKeys.has(key)) {
      errors.push(
        serviceDatabaseInventoryError(
          "service_database_inventory.unexpected_field",
          `${path}/${escapeJsonPointerSegment(key)}`,
          "Unexpected rollback evidence field.",
        ),
      );
    }
  }

  if (typeof value.rollback_ref !== "string" || !safeResourceRef(value.rollback_ref)) {
    errors.push(
      serviceDatabaseInventoryError(
        "service_database_inventory.rollback_evidence_required",
        `${path}/rollback_ref`,
        "Rollback evidence requires a safe rollback_ref.",
      ),
    );
  }

  if (typeof value.summary !== "string" || !safeString(value.summary)) {
    errors.push(
      serviceDatabaseInventoryError(
        "service_database_inventory.rollback_evidence_required",
        `${path}/summary`,
        "Rollback evidence summary must be a safe non-secret string.",
      ),
    );
  }

  const evidenceRefs = normalizeStringRefs(
    value.evidence_refs,
    `${path}/evidence_refs`,
    "service_database_inventory.rollback_evidence_required",
    "Rollback evidence requires evidence refs.",
    errors,
  );

  if (typeof value.owner_ref !== "string" || !safeResourceRef(value.owner_ref)) {
    errors.push(
      serviceDatabaseInventoryError(
        "service_database_inventory.rollback_evidence_required",
        `${path}/owner_ref`,
        "Rollback evidence requires a safe owner_ref.",
      ),
    );
  }

  if (
    typeof value.rollback_ref === "string" &&
    safeResourceRef(value.rollback_ref) &&
    typeof value.summary === "string" &&
    safeString(value.summary) &&
    evidenceRefs.length > 0 &&
    typeof value.owner_ref === "string" &&
    safeResourceRef(value.owner_ref)
  ) {
    return {
      rollback_ref: value.rollback_ref,
      summary: value.summary,
      evidence_refs: evidenceRefs,
      owner_ref: value.owner_ref,
    };
  }

  return null;
}

function normalizeApprovals(
  value: unknown,
  path: string,
  errors: ServiceDatabaseInventoryError[],
): string[] {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push(
      serviceDatabaseInventoryError(
        "service_database_inventory.approval_required",
        path,
        "Migration plan requires approval gates.",
      ),
    );
    return [];
  }

  const approvals: string[] = [];
  value.forEach((approval, index) => {
    if (typeof approval !== "string" || !approvalPattern.test(approval)) {
      errors.push(
        serviceDatabaseInventoryError(
          "service_database_inventory.approval_required",
          `${path}/${index}`,
          "Approval gate must be a safe dotted capability string.",
        ),
      );
      return;
    }
    approvals.push(approval);
  });
  return uniqueStrings(approvals);
}

function normalizeSecretRefs(
  value: unknown,
  path: string,
  errors: ServiceDatabaseInventoryError[],
): string[] {
  if (!Array.isArray(value)) {
    errors.push(
      serviceDatabaseInventoryError(
        "service_database_inventory.secret_value_forbidden",
        path,
        "Secret refs must be an array of secret_ref references only.",
      ),
    );
    return [];
  }

  const refs: string[] = [];
  value.forEach((ref, index) => {
    if (typeof ref !== "string" || !secretRefPattern.test(ref) || !safeSecretRef(ref)) {
      errors.push(
        serviceDatabaseInventoryError(
          "service_database_inventory.secret_value_forbidden",
          `${path}/${index}`,
          "Secret values are forbidden; only secret_ref references are allowed.",
        ),
      );
      return;
    }
    refs.push(ref);
  });
  return uniqueStrings(refs);
}

function normalizeStringRefs(
  value: unknown,
  path: string,
  code: ServiceDatabaseInventoryErrorCode,
  message: string,
  errors: ServiceDatabaseInventoryError[],
): string[] {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push(serviceDatabaseInventoryError(code, path, message));
    return [];
  }

  const refs: string[] = [];
  value.forEach((ref, index) => {
    if (typeof ref !== "string" || !safeResourceRef(ref)) {
      errors.push(serviceDatabaseInventoryError(code, `${path}/${index}`, message));
      return;
    }
    refs.push(ref);
  });
  return uniqueStrings(refs);
}

function normalizeSourceRefs(
  value: unknown,
  path: string,
  errors: ServiceDatabaseInventoryError[],
): string[] {
  if (!Array.isArray(value)) {
    errors.push(
      serviceDatabaseInventoryError(
        "service_database_inventory.invalid_source_ref",
        path,
        "Source refs must be an array.",
      ),
    );
    return [];
  }

  const refs: string[] = [];
  value.forEach((source, index) => {
    const sourcePath = `${path}/${index}`;
    if (typeof source === "string" && safeSourceRef(source)) {
      refs.push(source);
      return;
    }

    if (!isPlainObject(source)) {
      errors.push(
        serviceDatabaseInventoryError(
          "service_database_inventory.invalid_source_ref",
          sourcePath,
          "Source ref must be an object.",
        ),
      );
      return;
    }

    for (const key of Object.keys(source)) {
      if (!sourceKeys.has(key)) {
        errors.push(
          serviceDatabaseInventoryError(
            "service_database_inventory.unexpected_field",
            `${sourcePath}/${escapeJsonPointerSegment(key)}`,
            "Unexpected source ref field.",
          ),
        );
      }
    }

    if (
      typeof source.source_ref !== "string" ||
      !safeSourceRef(source.source_ref) ||
      typeof source.summary !== "string" ||
      !safeString(source.summary)
    ) {
      errors.push(
        serviceDatabaseInventoryError(
          "service_database_inventory.invalid_source_ref",
          sourcePath,
          "Source refs must include safe source_ref and summary strings.",
        ),
      );
      return;
    }

    refs.push(`${source.source_ref}: ${source.summary}`);
  });
  return uniqueStrings(refs);
}

function inventoryItem(
  resourceRef: string,
  resourceKind: InventoryResourceKind,
  input: Omit<
    InventoryItemInput,
    "resource_ref" | "resource_kind" | "mutation_boundary" | "source_refs"
  >,
): InventoryItemEvidence {
  return {
    resource_ref: resourceRef,
    resource_kind: resourceKind,
    name: input.name,
    environment: input.environment,
    ownership: input.ownership,
    dependencies: input.dependencies,
    mutation_boundary: {
      observation_allowed: true,
      proposal_allowed: true,
      live_mutation_allowed: false,
      secret_values_allowed: false,
    },
    source_refs: [
      "doc:docs/architecture/SUBSTRATES_AND_NODES.md",
      "doc:docs/architecture/DATA_MODEL.md",
      "doc:docs/reference/CONTRACT_PROVENANCE.md",
    ],
    live_service_mutation_allowed: false,
    live_database_write_allowed: false,
    side_effects: [],
  };
}

function migrationPlan(input: MigrationPlanInput): MigrationPlanEvidence {
  return {
    ...input,
    secret_refs: input.secret_refs ?? [],
    secret_posture: "references_only_no_values",
    live_database_write_allowed: false,
    live_service_mutation_allowed: false,
    side_effects: [],
  };
}

function sourceRefs(extraRefs: string[]): string[] {
  return uniqueStrings([
    "doc:docs/architecture/PACKET_MODEL.md",
    "doc:docs/architecture/POLICY_AND_AUDIT.md",
    "doc:docs/architecture/SYSTEM_ARCHITECTURE.md",
    "doc:docs/architecture/SUBSTRATES_AND_NODES.md",
    "doc:docs/architecture/DATA_MODEL.md",
    "doc:docs/reference/CONTRACT_PROVENANCE.md",
    "ticket:BP-0090: source-only service database inventory and migration planner contract",
    ...extraRefs,
  ]);
}

function failServiceDatabaseInventory(
  errors: ServiceDatabaseInventoryError[],
): ServiceDatabaseInventoryResult {
  return {
    ok: false,
    service_database_inventory: null,
    errors,
    raw_input_content: "withheld",
    side_effects: [],
  };
}

function serviceDatabaseInventoryError(
  code: ServiceDatabaseInventoryErrorCode,
  path: string,
  message: string,
): ServiceDatabaseInventoryError {
  return { code, path, message, severity: "error" };
}

function safeString(value: string): boolean {
  return (
    safeStringPattern.test(value) &&
    !secretLikePattern.test(value) &&
    !liveDatabaseWritePattern.test(value) &&
    !serviceMutationPattern.test(value)
  );
}

function safeResourceRef(value: string): boolean {
  return resourceRefPattern.test(value) && !secretLikePattern.test(value);
}

function safeSourceRef(value: string): boolean {
  return safeResourceRef(value) && !liveDatabaseWritePattern.test(value);
}

function safeSecretRef(value: string): boolean {
  return secretRefPattern.test(value) && !secretLikePattern.test(value);
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)].sort();
}

function dedupeErrors(
  errors: ServiceDatabaseInventoryError[],
): ServiceDatabaseInventoryError[] {
  const seen = new Set<string>();
  const deduped: ServiceDatabaseInventoryError[] = [];
  for (const error of errors) {
    const key = `${error.code}:${error.path}:${error.message}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(error);
    }
  }
  return deduped;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function jsonPointer(key: string): string {
  return `/${escapeJsonPointerSegment(key)}`;
}

function escapeJsonPointerSegment(segment: string): string {
  return segment.replaceAll("~", "~0").replaceAll("/", "~1");
}
