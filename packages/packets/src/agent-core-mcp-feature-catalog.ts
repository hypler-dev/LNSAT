export const AGENT_CORE_MCP_FEATURE_CATALOG_STATUS = "source_only";

export const agentCoreMcpFeatureCatalogContract = {
  contract_id: "lnsat.agent.core_mcp_feature_catalog.v0_1",
  status: "source_only",
  feature_kinds: [
    "mcp_tool_descriptor",
    "mcp_resource_descriptor",
    "mcp_prompt_descriptor",
    "mcp_roots_boundary",
    "hardware_inventory_probe",
    "os_capability_probe",
    "model_runtime_probe",
    "sandbox_capability_probe",
    "filesystem_boundary_probe",
    "network_capability_probe",
    "container_runtime_probe",
    "package_manager_probe",
    "service_manager_probe",
    "policy_graph_ref",
    "approval_gate_ref",
    "audit_event_ref",
    "trace_context_ref",
    "budget_ref",
    "context_firewall_ref",
  ],
  target_kinds: [
    "local_machine",
    "remote_node",
    "container",
    "sandbox",
    "cloud_runner",
    "mcp_server",
    "model_runtime",
    "human_operator",
  ],
  operating_systems: [
    "macos",
    "linux",
    "windows",
    "wsl",
    "container_linux",
    "cloud_worker",
    "unknown",
  ],
  discovery_modes: [
    "declared_static",
    "read_only_probe_planned",
    "operator_supplied",
    "mcp_descriptor_ref",
    "runtime_manifest_ref",
  ],
  policy_effects: ["allow", "preview_only", "approval_required", "block", "observe"],
  source_docs: [
    "docs/reference/CONTRACT_PROVENANCE.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
    "docs/architecture/POLICY_AND_AUDIT.md",
    "docs/architecture/SUBSTRATES_AND_NODES.md",
  ],
  provider_dispatch_allowed: false,
  provider_api_calls_allowed: false,
  probe_execution_allowed: false,
  hardware_probe_execution_allowed: false,
  local_model_start_allowed: false,
  local_model_install_allowed: false,
  gateway_mcp_mutation_allowed: false,
  runtime_mutation_allowed: false,
  repo_write_allowed: false,
  secret_value_allowed: false,
  side_effects: [],
} as const;

export type AgentCoreMcpFeatureKind =
  (typeof agentCoreMcpFeatureCatalogContract.feature_kinds)[number];
export type AgentCoreMcpTargetKind =
  (typeof agentCoreMcpFeatureCatalogContract.target_kinds)[number];
export type AgentCoreMcpOperatingSystem =
  (typeof agentCoreMcpFeatureCatalogContract.operating_systems)[number];
export type AgentCoreMcpDiscoveryMode =
  (typeof agentCoreMcpFeatureCatalogContract.discovery_modes)[number];
export type AgentCoreMcpPolicyEffect =
  (typeof agentCoreMcpFeatureCatalogContract.policy_effects)[number];

export type AgentCoreMcpFeatureInput = {
  feature_ref: string;
  display_name: string;
  feature_kind: AgentCoreMcpFeatureKind;
  discovery_mode: AgentCoreMcpDiscoveryMode;
  target_refs: string[];
  descriptor_refs: string[];
  data_classes_allowed: string[];
  policy_effect: AgentCoreMcpPolicyEffect;
  read_only: true;
  execution_allowed?: false;
  mutation_allowed?: false;
  secret_value_allowed?: false;
  source_refs: string[];
};

export type AgentCoreMcpProbeTargetInput = {
  target_ref: string;
  target_kind: AgentCoreMcpTargetKind;
  display_name: string;
  operating_system: AgentCoreMcpOperatingSystem;
  architecture_ref: string;
  ownership_ref: string;
  capability_manifest_ref: string;
  source_refs: string[];
};

export type AgentCoreMcpPolicyGraphLinkInput = {
  graph_link_ref: string;
  from_ref: string;
  to_ref: string;
  relation:
    | "describes"
    | "bounded_by"
    | "requires_approval"
    | "emits_audit"
    | "redacts"
    | "observes"
    | "blocks";
  policy_effect: AgentCoreMcpPolicyEffect;
  source_refs: string[];
};

export type AgentCoreMcpFeatureCatalogRequest = {
  request_id?: string;
  catalog_ref: string;
  packet_ref: string;
  owner_ref: string;
  features: AgentCoreMcpFeatureInput[];
  probe_targets: AgentCoreMcpProbeTargetInput[];
  policy_graph_links: AgentCoreMcpPolicyGraphLinkInput[];
  approval_refs: string[];
  audit_event_refs: string[];
  trace_context_refs: string[];
  created_at?: string;
  provider_dispatch_allowed?: false;
  provider_api_calls_allowed?: false;
  probe_execution_allowed?: false;
  hardware_probe_execution_allowed?: false;
  local_model_start_allowed?: false;
  local_model_install_allowed?: false;
  gateway_mcp_mutation_allowed?: false;
  runtime_mutation_allowed?: false;
  repo_write_allowed?: false;
  secret_value_allowed?: false;
  side_effects?: [];
};

export type AgentCoreMcpFeatureCatalogErrorCode =
  | "agent_core_mcp_feature_catalog.invalid_request"
  | "agent_core_mcp_feature_catalog.unexpected_field"
  | "agent_core_mcp_feature_catalog.invalid_ref"
  | "agent_core_mcp_feature_catalog.invalid_packet_ref"
  | "agent_core_mcp_feature_catalog.feature_required"
  | "agent_core_mcp_feature_catalog.invalid_feature"
  | "agent_core_mcp_feature_catalog.target_required"
  | "agent_core_mcp_feature_catalog.invalid_target"
  | "agent_core_mcp_feature_catalog.graph_link_required"
  | "agent_core_mcp_feature_catalog.invalid_graph_link"
  | "agent_core_mcp_feature_catalog.secret_value_embedded"
  | "agent_core_mcp_feature_catalog.provider_dispatch_forbidden"
  | "agent_core_mcp_feature_catalog.provider_api_calls_forbidden"
  | "agent_core_mcp_feature_catalog.probe_execution_forbidden"
  | "agent_core_mcp_feature_catalog.hardware_probe_execution_forbidden"
  | "agent_core_mcp_feature_catalog.local_model_start_forbidden"
  | "agent_core_mcp_feature_catalog.local_model_install_forbidden"
  | "agent_core_mcp_feature_catalog.gateway_mcp_mutation_forbidden"
  | "agent_core_mcp_feature_catalog.runtime_mutation_forbidden"
  | "agent_core_mcp_feature_catalog.repo_write_forbidden"
  | "agent_core_mcp_feature_catalog.secret_value_forbidden"
  | "agent_core_mcp_feature_catalog.side_effects_forbidden";

export type AgentCoreMcpFeatureCatalogError = {
  code: AgentCoreMcpFeatureCatalogErrorCode;
  path: string;
  message: string;
  severity: "error";
};

export type AgentCoreMcpFeatureCatalogEvidence = {
  contract_id: typeof agentCoreMcpFeatureCatalogContract.contract_id;
  request_id: string | null;
  catalog_ref: string;
  packet_ref: string;
  owner_ref: string;
  created_at: string;
  feature_refs: string[];
  feature_kinds: AgentCoreMcpFeatureKind[];
  probe_target_refs: string[];
  target_kinds: AgentCoreMcpTargetKind[];
  operating_systems: AgentCoreMcpOperatingSystem[];
  policy_graph_link_refs: string[];
  approval_refs: string[];
  audit_event_refs: string[];
  trace_context_refs: string[];
  source_refs: string[];
  denied_runtime_behavior: string[];
  provider_dispatch_allowed: false;
  provider_api_calls_allowed: false;
  probe_execution_allowed: false;
  hardware_probe_execution_allowed: false;
  local_model_start_allowed: false;
  local_model_install_allowed: false;
  gateway_mcp_mutation_allowed: false;
  runtime_mutation_allowed: false;
  repo_write_allowed: false;
  secret_value_allowed: false;
  side_effects: [];
};

export type AgentCoreMcpFeatureCatalogResult =
  | {
      ok: true;
      catalog: AgentCoreMcpFeatureCatalogEvidence;
      errors: [];
      side_effects: [];
    }
  | {
      ok: false;
      catalog: null;
      errors: AgentCoreMcpFeatureCatalogError[];
      raw_input_content: "withheld";
      side_effects: [];
    };

const requestKeys = new Set([
  "request_id",
  "catalog_ref",
  "packet_ref",
  "owner_ref",
  "features",
  "probe_targets",
  "policy_graph_links",
  "approval_refs",
  "audit_event_refs",
  "trace_context_refs",
  "created_at",
  "provider_dispatch_allowed",
  "provider_api_calls_allowed",
  "probe_execution_allowed",
  "hardware_probe_execution_allowed",
  "local_model_start_allowed",
  "local_model_install_allowed",
  "gateway_mcp_mutation_allowed",
  "runtime_mutation_allowed",
  "repo_write_allowed",
  "secret_value_allowed",
  "side_effects",
]);

const featureKeys = new Set([
  "feature_ref",
  "display_name",
  "feature_kind",
  "discovery_mode",
  "target_refs",
  "descriptor_refs",
  "data_classes_allowed",
  "policy_effect",
  "read_only",
  "execution_allowed",
  "mutation_allowed",
  "secret_value_allowed",
  "source_refs",
]);

const targetKeys = new Set([
  "target_ref",
  "target_kind",
  "display_name",
  "operating_system",
  "architecture_ref",
  "ownership_ref",
  "capability_manifest_ref",
  "source_refs",
]);

const linkKeys = new Set([
  "graph_link_ref",
  "from_ref",
  "to_ref",
  "relation",
  "policy_effect",
  "source_refs",
]);

const featureKinds = new Set<AgentCoreMcpFeatureKind>(
  agentCoreMcpFeatureCatalogContract.feature_kinds,
);
const targetKinds = new Set<AgentCoreMcpTargetKind>(
  agentCoreMcpFeatureCatalogContract.target_kinds,
);
const operatingSystems = new Set<AgentCoreMcpOperatingSystem>(
  agentCoreMcpFeatureCatalogContract.operating_systems,
);
const discoveryModes = new Set<AgentCoreMcpDiscoveryMode>(
  agentCoreMcpFeatureCatalogContract.discovery_modes,
);
const policyEffects = new Set<AgentCoreMcpPolicyEffect>(
  agentCoreMcpFeatureCatalogContract.policy_effects,
);
const relations = new Set([
  "describes",
  "bounded_by",
  "requires_approval",
  "emits_audit",
  "redacts",
  "observes",
  "blocks",
]);

const refPattern = /^[a-z][a-z0-9_.:-]{1,127}$/;
const bpRefPattern = /^BP-\d{4}$/;
const isoDateTimePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;
const safeStringPattern = /^[\w .,:;@/()[\]#_+=-]{2,320}$/;
const secretLikePattern =
  /(postgres:\/\/|mysql:\/\/|mongodb:\/\/|DATABASE_URL|PASSWORD=|PRIVATE KEY|BEGIN [A-Z ]*KEY|sk-[A-Za-z0-9]|bearer\s+[A-Za-z0-9]|api[_-]?key\s*[:=])/i;

export function createAgentCoreMcpFeatureCatalog(
  input: unknown,
  options: { now?: Date } = {},
): AgentCoreMcpFeatureCatalogResult {
  const normalized = normalizeCatalog(input, options.now ?? new Date());
  if (!normalized.ok) {
    return fail(normalized.errors);
  }

  const catalog = normalized.request;
  return {
    ok: true,
    catalog: {
      contract_id: agentCoreMcpFeatureCatalogContract.contract_id,
      request_id: catalog.request_id,
      catalog_ref: catalog.catalog_ref,
      packet_ref: catalog.packet_ref,
      owner_ref: catalog.owner_ref,
      created_at: catalog.created_at,
      feature_refs: unique(catalog.features.map((feature) => feature.feature_ref)),
      feature_kinds: unique(catalog.features.map((feature) => feature.feature_kind)),
      probe_target_refs: unique(
        catalog.probe_targets.map((target) => target.target_ref),
      ),
      target_kinds: unique(catalog.probe_targets.map((target) => target.target_kind)),
      operating_systems: unique(
        catalog.probe_targets.map((target) => target.operating_system),
      ),
      policy_graph_link_refs: unique(
        catalog.policy_graph_links.map((link) => link.graph_link_ref),
      ),
      approval_refs: unique(catalog.approval_refs),
      audit_event_refs: unique(catalog.audit_event_refs),
      trace_context_refs: unique(catalog.trace_context_refs),
      source_refs: unique([
        ...agentCoreMcpFeatureCatalogContract.source_docs,
        ...catalog.features.flatMap((feature) => feature.source_refs),
        ...catalog.probe_targets.flatMap((target) => target.source_refs),
        ...catalog.policy_graph_links.flatMap((link) => link.source_refs),
      ]),
      denied_runtime_behavior: [
        "provider_dispatch",
        "provider_api_calls",
        "probe_execution",
        "hardware_probe_execution",
        "local_model_start",
        "local_model_install",
        "gateway_mcp_mutation",
        "runtime_mutation",
        "repo_write_from_runtime",
        "secret_value_use",
      ],
      provider_dispatch_allowed: false,
      provider_api_calls_allowed: false,
      probe_execution_allowed: false,
      hardware_probe_execution_allowed: false,
      local_model_start_allowed: false,
      local_model_install_allowed: false,
      gateway_mcp_mutation_allowed: false,
      runtime_mutation_allowed: false,
      repo_write_allowed: false,
      secret_value_allowed: false,
      side_effects: [],
    },
    errors: [],
    side_effects: [],
  };
}

function normalizeCatalog(
  input: unknown,
  now: Date,
):
  | {
      ok: true;
      request: Omit<AgentCoreMcpFeatureCatalogRequest, "request_id" | "created_at"> & {
        request_id: string | null;
        created_at: string;
      };
    }
  | { ok: false; errors: AgentCoreMcpFeatureCatalogError[] } {
  if (!isPlainObject(input)) {
    return {
      ok: false,
      errors: [
        error(
          "agent_core_mcp_feature_catalog.invalid_request",
          "",
          "Agent core MCP feature catalog request must be an object.",
        ),
      ],
    };
  }

  const errors: AgentCoreMcpFeatureCatalogError[] = [];
  appendSecretValueErrors(input, "", errors);
  assertKnownKeys(input, requestKeys, "", errors);

  requireRef(input.catalog_ref, "/catalog_ref", errors);
  requireRef(input.owner_ref, "/owner_ref", errors);
  if (typeof input.packet_ref !== "string" || !bpRefPattern.test(input.packet_ref)) {
    errors.push(
      error(
        "agent_core_mcp_feature_catalog.invalid_packet_ref",
        "/packet_ref",
        "Feature catalog packet_ref must be a build packet id.",
      ),
    );
  }

  const createdAt =
    typeof input.created_at === "string" && isoDateTimePattern.test(input.created_at)
      ? input.created_at
      : now.toISOString();

  const probeTargets = normalizeTargets(input.probe_targets, errors);
  const targetRefs = new Set(probeTargets.map((target) => target.target_ref));
  const features = normalizeFeatures(input.features, targetRefs, errors);
  const featureRefs = new Set(features.map((feature) => feature.feature_ref));
  const graphRefs = new Set(
    [
      ...featureRefs,
      ...targetRefs,
      ...(Array.isArray(input.approval_refs) ? input.approval_refs : []),
      ...(Array.isArray(input.audit_event_refs) ? input.audit_event_refs : []),
      ...(Array.isArray(input.trace_context_refs) ? input.trace_context_refs : []),
    ].filter((value): value is string => typeof value === "string"),
  );
  const policyGraphLinks = normalizeGraphLinks(
    input.policy_graph_links,
    graphRefs,
    errors,
  );
  const approvalRefs = normalizeRefArray(input.approval_refs, "/approval_refs", errors);
  const auditEventRefs = normalizeRefArray(
    input.audit_event_refs,
    "/audit_event_refs",
    errors,
  );
  const traceContextRefs = normalizeRefArray(
    input.trace_context_refs,
    "/trace_context_refs",
    errors,
  );

  for (const key of [
    "provider_dispatch_allowed",
    "provider_api_calls_allowed",
    "probe_execution_allowed",
    "hardware_probe_execution_allowed",
    "local_model_start_allowed",
    "local_model_install_allowed",
    "gateway_mcp_mutation_allowed",
    "runtime_mutation_allowed",
    "repo_write_allowed",
    "secret_value_allowed",
  ]) {
    assertFalseFlag(input, key, errors);
  }

  if (
    Object.hasOwn(input, "side_effects") &&
    (!Array.isArray(input.side_effects) || input.side_effects.length !== 0)
  ) {
    errors.push(
      error(
        "agent_core_mcp_feature_catalog.side_effects_forbidden",
        "/side_effects",
        "Feature catalog must preserve side_effects: [].",
      ),
    );
  }

  if (errors.length > 0) {
    return { ok: false, errors: dedupe(errors) };
  }

  return {
    ok: true,
    request: {
      request_id:
        typeof input.request_id === "string" && safeString(input.request_id)
          ? input.request_id
          : null,
      catalog_ref: input.catalog_ref as string,
      packet_ref: input.packet_ref as string,
      owner_ref: input.owner_ref as string,
      features,
      probe_targets: probeTargets,
      policy_graph_links: policyGraphLinks,
      approval_refs: approvalRefs,
      audit_event_refs: auditEventRefs,
      trace_context_refs: traceContextRefs,
      created_at: createdAt,
      provider_dispatch_allowed: false,
      provider_api_calls_allowed: false,
      probe_execution_allowed: false,
      hardware_probe_execution_allowed: false,
      local_model_start_allowed: false,
      local_model_install_allowed: false,
      gateway_mcp_mutation_allowed: false,
      runtime_mutation_allowed: false,
      repo_write_allowed: false,
      secret_value_allowed: false,
      side_effects: [],
    },
  };
}

function normalizeFeatures(
  value: unknown,
  targetRefs: Set<string>,
  errors: AgentCoreMcpFeatureCatalogError[],
): AgentCoreMcpFeatureInput[] {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push(
      error(
        "agent_core_mcp_feature_catalog.feature_required",
        "/features",
        "Feature catalog requires features.",
      ),
    );
    return [];
  }
  return value.flatMap((feature, index) => {
    const path = `/features/${index}`;
    if (!isPlainObject(feature)) {
      errors.push(
        error(
          "agent_core_mcp_feature_catalog.invalid_feature",
          path,
          "Feature must be an object.",
        ),
      );
      return [];
    }
    assertKnownKeys(feature, featureKeys, path, errors);
    requireRef(feature.feature_ref, `${path}/feature_ref`, errors);
    requireSafeString(feature.display_name, `${path}/display_name`, errors);
    requireKnown(feature.feature_kind, featureKinds, `${path}/feature_kind`, errors);
    requireKnown(
      feature.discovery_mode,
      discoveryModes,
      `${path}/discovery_mode`,
      errors,
    );
    requireRefArray(feature.target_refs, `${path}/target_refs`, errors);
    requireRefArray(feature.descriptor_refs, `${path}/descriptor_refs`, errors);
    requireStringArray(
      feature.data_classes_allowed,
      `${path}/data_classes_allowed`,
      errors,
    );
    requireKnown(feature.policy_effect, policyEffects, `${path}/policy_effect`, errors);
    requireStringArray(feature.source_refs, `${path}/source_refs`, errors);
    if (feature.read_only !== true) {
      errors.push(
        error(
          "agent_core_mcp_feature_catalog.invalid_feature",
          `${path}/read_only`,
          "Feature records must be read_only: true.",
        ),
      );
    }
    for (const targetRef of Array.isArray(feature.target_refs)
      ? feature.target_refs
      : []) {
      if (typeof targetRef === "string" && !targetRefs.has(targetRef)) {
        errors.push(
          error(
            "agent_core_mcp_feature_catalog.invalid_ref",
            `${path}/target_refs`,
            "Feature target_refs must reference probe targets.",
          ),
        );
      }
    }
    assertFeatureFalseFlag(feature, "execution_allowed", path, errors);
    assertFeatureFalseFlag(feature, "mutation_allowed", path, errors);
    assertFeatureFalseFlag(feature, "secret_value_allowed", path, errors);
    return [feature as AgentCoreMcpFeatureInput];
  });
}

function normalizeTargets(
  value: unknown,
  errors: AgentCoreMcpFeatureCatalogError[],
): AgentCoreMcpProbeTargetInput[] {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push(
      error(
        "agent_core_mcp_feature_catalog.target_required",
        "/probe_targets",
        "Feature catalog requires probe targets.",
      ),
    );
    return [];
  }
  return value.flatMap((target, index) => {
    const path = `/probe_targets/${index}`;
    if (!isPlainObject(target)) {
      errors.push(
        error(
          "agent_core_mcp_feature_catalog.invalid_target",
          path,
          "Probe target must be an object.",
        ),
      );
      return [];
    }
    assertKnownKeys(target, targetKeys, path, errors);
    requireRef(target.target_ref, `${path}/target_ref`, errors);
    requireKnown(target.target_kind, targetKinds, `${path}/target_kind`, errors);
    requireSafeString(target.display_name, `${path}/display_name`, errors);
    requireKnown(
      target.operating_system,
      operatingSystems,
      `${path}/operating_system`,
      errors,
    );
    requireRef(target.architecture_ref, `${path}/architecture_ref`, errors);
    requireRef(target.ownership_ref, `${path}/ownership_ref`, errors);
    requireRef(
      target.capability_manifest_ref,
      `${path}/capability_manifest_ref`,
      errors,
    );
    requireStringArray(target.source_refs, `${path}/source_refs`, errors);
    return [target as AgentCoreMcpProbeTargetInput];
  });
}

function normalizeGraphLinks(
  value: unknown,
  graphRefs: Set<string>,
  errors: AgentCoreMcpFeatureCatalogError[],
): AgentCoreMcpPolicyGraphLinkInput[] {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push(
      error(
        "agent_core_mcp_feature_catalog.graph_link_required",
        "/policy_graph_links",
        "Feature catalog requires policy graph links.",
      ),
    );
    return [];
  }
  return value.flatMap((link, index) => {
    const path = `/policy_graph_links/${index}`;
    if (!isPlainObject(link)) {
      errors.push(
        error(
          "agent_core_mcp_feature_catalog.invalid_graph_link",
          path,
          "Policy graph link must be an object.",
        ),
      );
      return [];
    }
    assertKnownKeys(link, linkKeys, path, errors);
    requireRef(link.graph_link_ref, `${path}/graph_link_ref`, errors);
    requireRef(link.from_ref, `${path}/from_ref`, errors);
    requireRef(link.to_ref, `${path}/to_ref`, errors);
    requireKnown(link.relation, relations, `${path}/relation`, errors);
    requireKnown(link.policy_effect, policyEffects, `${path}/policy_effect`, errors);
    requireStringArray(link.source_refs, `${path}/source_refs`, errors);
    for (const key of ["from_ref", "to_ref"]) {
      const ref = link[key];
      if (typeof ref === "string" && !graphRefs.has(ref)) {
        errors.push(
          error(
            "agent_core_mcp_feature_catalog.invalid_ref",
            `${path}/${key}`,
            "Policy graph link endpoints must reference catalog refs.",
          ),
        );
      }
    }
    return [link as AgentCoreMcpPolicyGraphLinkInput];
  });
}

function normalizeRefArray(
  value: unknown,
  path: string,
  errors: AgentCoreMcpFeatureCatalogError[],
): string[] {
  requireRefArray(value, path, errors);
  return Array.isArray(value)
    ? (value.filter((item) => typeof item === "string") as string[])
    : [];
}

function assertFalseFlag(
  input: Record<string, unknown>,
  key: string,
  errors: AgentCoreMcpFeatureCatalogError[],
): void {
  if (Object.hasOwn(input, key) && input[key] !== false) {
    errors.push(
      error(
        flagErrorCode(key),
        `/${key}`,
        "Feature catalog cannot enable hard-gated behavior.",
      ),
    );
  }
}

function assertFeatureFalseFlag(
  input: Record<string, unknown>,
  key: string,
  path: string,
  errors: AgentCoreMcpFeatureCatalogError[],
): void {
  if (Object.hasOwn(input, key) && input[key] !== false) {
    errors.push(
      error(
        key === "secret_value_allowed"
          ? "agent_core_mcp_feature_catalog.secret_value_forbidden"
          : "agent_core_mcp_feature_catalog.invalid_feature",
        `${path}/${key}`,
        "Feature cannot enable execution, mutation, or secret value use.",
      ),
    );
  }
}

function flagErrorCode(key: string): AgentCoreMcpFeatureCatalogErrorCode {
  const codeByKey: Record<string, AgentCoreMcpFeatureCatalogErrorCode> = {
    provider_dispatch_allowed:
      "agent_core_mcp_feature_catalog.provider_dispatch_forbidden",
    provider_api_calls_allowed:
      "agent_core_mcp_feature_catalog.provider_api_calls_forbidden",
    probe_execution_allowed: "agent_core_mcp_feature_catalog.probe_execution_forbidden",
    hardware_probe_execution_allowed:
      "agent_core_mcp_feature_catalog.hardware_probe_execution_forbidden",
    local_model_start_allowed:
      "agent_core_mcp_feature_catalog.local_model_start_forbidden",
    local_model_install_allowed:
      "agent_core_mcp_feature_catalog.local_model_install_forbidden",
    gateway_mcp_mutation_allowed:
      "agent_core_mcp_feature_catalog.gateway_mcp_mutation_forbidden",
    runtime_mutation_allowed:
      "agent_core_mcp_feature_catalog.runtime_mutation_forbidden",
    repo_write_allowed: "agent_core_mcp_feature_catalog.repo_write_forbidden",
    secret_value_allowed: "agent_core_mcp_feature_catalog.secret_value_forbidden",
  };
  return codeByKey[key] ?? "agent_core_mcp_feature_catalog.invalid_request";
}

function appendSecretValueErrors(
  value: unknown,
  path: string,
  errors: AgentCoreMcpFeatureCatalogError[],
): void {
  if (typeof value === "string") {
    if (secretLikePattern.test(value)) {
      errors.push(
        error(
          "agent_core_mcp_feature_catalog.secret_value_embedded",
          path || "",
          "Feature catalog must use refs only and must not embed secret-like values.",
        ),
      );
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      appendSecretValueErrors(item, `${path}/${index}`, errors),
    );
    return;
  }
  if (isPlainObject(value)) {
    for (const [key, child] of Object.entries(value)) {
      appendSecretValueErrors(
        child,
        `${path}/${escapeJsonPointerSegment(key)}`,
        errors,
      );
    }
  }
}

function requireRef(
  value: unknown,
  path: string,
  errors: AgentCoreMcpFeatureCatalogError[],
): void {
  if (typeof value !== "string" || !refPattern.test(value)) {
    errors.push(
      error(
        "agent_core_mcp_feature_catalog.invalid_ref",
        path,
        "Value must be a stable ref id.",
      ),
    );
  }
}

function requireRefArray(
  value: unknown,
  path: string,
  errors: AgentCoreMcpFeatureCatalogError[],
): void {
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    value.some((item) => typeof item !== "string" || !refPattern.test(item))
  ) {
    errors.push(
      error(
        "agent_core_mcp_feature_catalog.invalid_ref",
        path,
        "Value must be a non-empty ref array.",
      ),
    );
  }
}

function requireStringArray(
  value: unknown,
  path: string,
  errors: AgentCoreMcpFeatureCatalogError[],
): void {
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    value.some((item) => typeof item !== "string" || !safeString(item))
  ) {
    errors.push(
      error(
        "agent_core_mcp_feature_catalog.invalid_ref",
        path,
        "Value must be a non-empty safe string array.",
      ),
    );
  }
}

function requireSafeString(
  value: unknown,
  path: string,
  errors: AgentCoreMcpFeatureCatalogError[],
): void {
  if (typeof value !== "string" || !safeString(value)) {
    errors.push(
      error(
        "agent_core_mcp_feature_catalog.invalid_ref",
        path,
        "Value must be a safe string.",
      ),
    );
  }
}

function requireKnown(
  value: unknown,
  allowed: Set<string>,
  path: string,
  errors: AgentCoreMcpFeatureCatalogError[],
): void {
  if (typeof value !== "string" || !allowed.has(value)) {
    errors.push(
      error(
        "agent_core_mcp_feature_catalog.invalid_ref",
        path,
        "Value is not in allowed set.",
      ),
    );
  }
}

function assertKnownKeys(
  object: Record<string, unknown>,
  allowed: Set<string>,
  path: string,
  errors: AgentCoreMcpFeatureCatalogError[],
): void {
  for (const key of Object.keys(object)) {
    if (!allowed.has(key)) {
      errors.push(
        error(
          "agent_core_mcp_feature_catalog.unexpected_field",
          `${path}/${escapeJsonPointerSegment(key)}`,
          "Unexpected feature catalog field.",
        ),
      );
    }
  }
}

function fail(
  errors: AgentCoreMcpFeatureCatalogError[],
): AgentCoreMcpFeatureCatalogResult {
  return {
    ok: false,
    catalog: null,
    errors: dedupe(errors),
    raw_input_content: "withheld",
    side_effects: [],
  };
}

function error(
  code: AgentCoreMcpFeatureCatalogErrorCode,
  path: string,
  message: string,
): AgentCoreMcpFeatureCatalogError {
  return { code, path, message, severity: "error" };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function safeString(value: string): boolean {
  return safeStringPattern.test(value) && !secretLikePattern.test(value);
}

function unique<T extends string>(values: T[]): T[] {
  return [...new Set(values)];
}

function dedupe(
  errors: AgentCoreMcpFeatureCatalogError[],
): AgentCoreMcpFeatureCatalogError[] {
  const seen = new Set<string>();
  return errors.filter((item) => {
    const key = `${item.code}:${item.path}:${item.message}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function escapeJsonPointerSegment(value: string): string {
  return value.replace(/~/g, "~0").replace(/\//g, "~1");
}
