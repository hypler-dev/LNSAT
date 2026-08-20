import {
  createServiceDatabaseInventory,
  serviceDatabaseInventoryContract,
  type ServiceDatabaseInventoryContractEvidence,
  type ServiceDatabaseInventoryError,
} from "@lnsat/packets";

export const SERVICE_DATABASE_INVENTORY_GATEWAY_STATUS = "contract_only";

export const serviceDatabaseInventoryGatewayContract = {
  contract_id: "lnsat.gateway.service_database_inventory_migration_planner.v0_1",
  method: "POST",
  path: "/v1/platform/service-database-inventory/inspect",
  authority: [
    "@lnsat/packets",
    "source-backed-service-database-inventory-migration-planner",
    "LNSAT Gateway",
  ],
  source_docs: [
    "docs/architecture/PACKET_MODEL.md",
    "docs/architecture/POLICY_AND_AUDIT.md",
    "docs/architecture/SYSTEM_ARCHITECTURE.md",
    "docs/architecture/SUBSTRATES_AND_NODES.md",
    "docs/architecture/DATA_MODEL.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
    "packages/packets/src/service-database-inventory.ts",
    "apps/api/src/service-database-inventory.ts",
  ],
  side_effects: [],
  status: "contract_only",
} as const;

export type ServiceDatabaseInventoryGatewayRequest = {
  request_id?: string;
  inventory_request: unknown;
};

export type ServiceDatabaseInventoryGatewayErrorCode =
  | "service_database_inventory_gateway.invalid_request"
  | "service_database_inventory_gateway.unexpected_field"
  | "service_database_inventory_gateway.invalid_request_id"
  | "service_database_inventory_gateway.missing_inventory_request";

export type ServiceDatabaseInventoryGatewayError = {
  code: ServiceDatabaseInventoryGatewayErrorCode;
  path: string;
  message: string;
  severity: "error";
};

export type ServiceDatabaseInventoryGatewayResponse =
  | {
      ok: true;
      contract_id: typeof serviceDatabaseInventoryGatewayContract.contract_id;
      request_id: string | null;
      inspected_at: string;
      source_docs: string[];
      service_database_inventory: ServiceDatabaseInventoryContractEvidence;
      inventory_version: ServiceDatabaseInventoryContractEvidence["inventory_version"];
      resource_kinds: ServiceDatabaseInventoryContractEvidence["resource_kinds"];
      migration_plan_kinds: ServiceDatabaseInventoryContractEvidence["migration_plan_kinds"];
      inventory_items: ServiceDatabaseInventoryContractEvidence["inventory_items"];
      migration_plan: ServiceDatabaseInventoryContractEvidence["migration_plan"];
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
    }
  | {
      ok: false;
      contract_id: typeof serviceDatabaseInventoryGatewayContract.contract_id;
      request_id: string | null;
      inspected_at: string;
      source_docs: string[];
      request_errors: ServiceDatabaseInventoryGatewayError[];
      inventory_errors: ServiceDatabaseInventoryError[];
      service_database_inventory: null;
      inventory_version: typeof serviceDatabaseInventoryContract.inventory_version;
      resource_kinds: typeof serviceDatabaseInventoryContract.resource_kinds;
      migration_plan_kinds: typeof serviceDatabaseInventoryContract.migration_plan_kinds;
      inventory_items: [];
      migration_plan: null;
      ownership_refs: [];
      dependency_refs: [];
      blocked_live_actions: [];
      required_approvals: [];
      rollback_evidence_refs: [];
      dry_run_requirements: [];
      missing_evidence: [];
      secret_posture: "references_only_no_values";
      source_refs: [];
      live_database_write_allowed: false;
      live_service_mutation_allowed: false;
      raw_input_content: "withheld";
      side_effects: [];
    };

type NormalizedServiceDatabaseInventoryGatewayRequest =
  | {
      ok: true;
      request_id: string | null;
      inventory_request: unknown;
    }
  | {
      ok: false;
      request_id: string | null;
      errors: ServiceDatabaseInventoryGatewayError[];
    };

const requestKeys = new Set(["request_id", "inventory_request"]);
const safeRequestIdPattern = /^[a-z][a-z0-9_.:-]{1,95}$/;

export async function inspectServiceDatabaseInventoryGatewayRequest(
  input: unknown,
  options: { now?: Date } = {},
): Promise<ServiceDatabaseInventoryGatewayResponse> {
  const inspectedAt = (options.now ?? new Date()).toISOString();
  const normalized = normalizeServiceDatabaseInventoryGatewayRequest(input);

  if (!normalized.ok) {
    return serviceDatabaseInventoryGatewayFailure(
      normalized.request_id,
      inspectedAt,
      normalized.errors,
    );
  }

  const inventoryResult = createServiceDatabaseInventory(normalized.inventory_request);

  if (!inventoryResult.ok) {
    return serviceDatabaseInventoryGatewayFailure(
      normalized.request_id,
      inspectedAt,
      [],
      inventoryResult.errors,
    );
  }

  return {
    ok: true,
    contract_id: serviceDatabaseInventoryGatewayContract.contract_id,
    request_id: normalized.request_id,
    inspected_at: inspectedAt,
    source_docs: serviceDatabaseInventoryGatewaySourceDocs(),
    service_database_inventory: inventoryResult.service_database_inventory,
    inventory_version: inventoryResult.service_database_inventory.inventory_version,
    resource_kinds: inventoryResult.service_database_inventory.resource_kinds,
    migration_plan_kinds:
      inventoryResult.service_database_inventory.migration_plan_kinds,
    inventory_items: inventoryResult.service_database_inventory.inventory_items,
    migration_plan: inventoryResult.service_database_inventory.migration_plan,
    ownership_refs: inventoryResult.service_database_inventory.ownership_refs,
    dependency_refs: inventoryResult.service_database_inventory.dependency_refs,
    blocked_live_actions:
      inventoryResult.service_database_inventory.blocked_live_actions,
    required_approvals: inventoryResult.service_database_inventory.required_approvals,
    rollback_evidence_refs:
      inventoryResult.service_database_inventory.rollback_evidence_refs,
    dry_run_requirements:
      inventoryResult.service_database_inventory.dry_run_requirements,
    missing_evidence: inventoryResult.service_database_inventory.missing_evidence,
    secret_posture: inventoryResult.service_database_inventory.secret_posture,
    source_refs: inventoryResult.service_database_inventory.source_refs,
    live_database_write_allowed:
      inventoryResult.service_database_inventory.live_database_write_allowed,
    live_service_mutation_allowed:
      inventoryResult.service_database_inventory.live_service_mutation_allowed,
    side_effects: inventoryResult.side_effects,
  };
}

function normalizeServiceDatabaseInventoryGatewayRequest(
  input: unknown,
): NormalizedServiceDatabaseInventoryGatewayRequest {
  if (!isPlainObject(input)) {
    return {
      ok: false,
      request_id: null,
      errors: [
        gatewayError(
          "service_database_inventory_gateway.invalid_request",
          "",
          "Service/database inventory Gateway request must be an object.",
        ),
      ],
    };
  }

  const errors: ServiceDatabaseInventoryGatewayError[] = [];
  for (const key of Object.keys(input)) {
    if (!requestKeys.has(key)) {
      errors.push(
        gatewayError(
          "service_database_inventory_gateway.unexpected_field",
          jsonPointer(key),
          "Unexpected service/database inventory Gateway request field.",
        ),
      );
    }
  }

  const requestId =
    typeof input.request_id === "string" && safeRequestIdPattern.test(input.request_id)
      ? input.request_id
      : null;
  if (
    Object.hasOwn(input, "request_id") &&
    (typeof input.request_id !== "string" ||
      !safeRequestIdPattern.test(input.request_id))
  ) {
    errors.push(
      gatewayError(
        "service_database_inventory_gateway.invalid_request_id",
        "/request_id",
        "Service/database inventory Gateway request_id must be a safe stable id.",
      ),
    );
  }

  if (!Object.hasOwn(input, "inventory_request")) {
    errors.push(
      gatewayError(
        "service_database_inventory_gateway.missing_inventory_request",
        "/inventory_request",
        "Service/database inventory Gateway request must include inventory_request.",
      ),
    );
  }

  if (errors.length > 0) {
    return { ok: false, request_id: requestId, errors };
  }

  return {
    ok: true,
    request_id: requestId,
    inventory_request: input.inventory_request,
  };
}

function serviceDatabaseInventoryGatewayFailure(
  requestId: string | null,
  inspectedAt: string,
  requestErrors: ServiceDatabaseInventoryGatewayError[],
  inventoryErrors: ServiceDatabaseInventoryError[] = [],
): ServiceDatabaseInventoryGatewayResponse {
  return {
    ok: false,
    contract_id: serviceDatabaseInventoryGatewayContract.contract_id,
    request_id: requestId,
    inspected_at: inspectedAt,
    source_docs: serviceDatabaseInventoryGatewaySourceDocs(),
    request_errors: requestErrors,
    inventory_errors: inventoryErrors,
    service_database_inventory: null,
    inventory_version: serviceDatabaseInventoryContract.inventory_version,
    resource_kinds: serviceDatabaseInventoryContract.resource_kinds,
    migration_plan_kinds: serviceDatabaseInventoryContract.migration_plan_kinds,
    inventory_items: [],
    migration_plan: null,
    ownership_refs: [],
    dependency_refs: [],
    blocked_live_actions: [],
    required_approvals: [],
    rollback_evidence_refs: [],
    dry_run_requirements: [],
    missing_evidence: [],
    secret_posture: "references_only_no_values",
    source_refs: [],
    live_database_write_allowed: false,
    live_service_mutation_allowed: false,
    raw_input_content: "withheld",
    side_effects: [],
  };
}

function serviceDatabaseInventoryGatewaySourceDocs(): string[] {
  return [...serviceDatabaseInventoryGatewayContract.source_docs];
}

function gatewayError(
  code: ServiceDatabaseInventoryGatewayErrorCode,
  path: string,
  message: string,
): ServiceDatabaseInventoryGatewayError {
  return {
    code,
    path,
    message,
    severity: "error",
  };
}

function jsonPointer(segment: string): string {
  return `/${segment.replace(/~/g, "~0").replace(/\//g, "~1")}`;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}
