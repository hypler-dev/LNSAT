export const AGENT_CORE_FEATURE_GRAPH_ALIGNMENT_STATUS = "source_only";

export const agentCoreFeatureGraphAlignmentContract = {
  contract_id: "lnsat.agent.core_feature_graph_alignment.v0_1",
  status: "source_only",
  alignment_node_kinds: [
    "agent_loop_graph_node",
    "agent_loop_graph_edge",
    "mcp_feature",
    "probe_target",
    "policy_graph_link",
    "approval_gate",
    "audit_event",
    "trace_context",
    "read_only_inspection_ref",
  ],
  alignment_relations: [
    "aligns_with",
    "describes",
    "bounded_by",
    "requires_approval",
    "emits_audit",
    "redacts",
    "observes",
    "blocks",
  ],
  inspection_kinds: [
    "mcp_tool_descriptor_readback",
    "mcp_resource_descriptor_readback",
    "mcp_prompt_descriptor_readback",
    "mcp_roots_boundary_readback",
    "hardware_inventory_read_only_probe_ref",
    "os_capability_read_only_probe_ref",
    "model_runtime_read_only_probe_ref",
    "sandbox_capability_read_only_probe_ref",
    "policy_graph_readback",
  ],
  policy_effects: ["allow", "preview_only", "approval_required", "block", "observe"],
  source_docs: [
    "docs/reference/CONTRACT_PROVENANCE.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
  ],
  provider_dispatch_allowed: false,
  provider_api_calls_allowed: false,
  inspection_execution_allowed: false,
  probe_execution_allowed: false,
  gateway_mcp_mutation_allowed: false,
  runtime_mutation_allowed: false,
  repo_write_allowed: false,
  local_model_start_allowed: false,
  local_model_install_allowed: false,
  secret_value_allowed: false,
  source_revision_blessing_allowed: false,
  release_execution_allowed: false,
  side_effects: [],
} as const;

export type AgentCoreFeatureAlignmentNodeKind =
  (typeof agentCoreFeatureGraphAlignmentContract.alignment_node_kinds)[number];
export type AgentCoreFeatureAlignmentRelation =
  (typeof agentCoreFeatureGraphAlignmentContract.alignment_relations)[number];
export type AgentCoreFeatureInspectionKind =
  (typeof agentCoreFeatureGraphAlignmentContract.inspection_kinds)[number];
export type AgentCoreFeatureAlignmentPolicyEffect =
  (typeof agentCoreFeatureGraphAlignmentContract.policy_effects)[number];

export type AgentCoreFeatureAlignmentNodeInput = {
  alignment_node_ref: string;
  source_ref: string;
  node_kind: AgentCoreFeatureAlignmentNodeKind;
  label: string;
  source_refs: string[];
};

export type AgentCoreFeatureAlignmentEdgeInput = {
  alignment_edge_ref: string;
  from_ref: string;
  to_ref: string;
  relation: AgentCoreFeatureAlignmentRelation;
  policy_effect: AgentCoreFeatureAlignmentPolicyEffect;
  source_refs: string[];
};

export type AgentCoreFeatureReadOnlyInspectionInput = {
  inspection_ref: string;
  inspection_kind: AgentCoreFeatureInspectionKind;
  target_ref: string;
  feature_ref: string;
  approval_ref: string;
  audit_event_ref: string;
  trace_context_ref: string;
  mode: "read_only_reference";
  inspection_execution_allowed?: false;
  probe_execution_allowed?: false;
  mutation_allowed?: false;
  provider_dispatch_allowed?: false;
  provider_api_calls_allowed?: false;
  uses_secret_value?: false;
  side_effects?: [];
  source_refs: string[];
};

export type AgentCoreFeatureGraphAlignmentRequest = {
  request_id?: string;
  alignment_ref: string;
  packet_ref: string;
  owner_ref: string;
  loop_ref: string;
  catalog_ref: string;
  alignment_nodes: AgentCoreFeatureAlignmentNodeInput[];
  alignment_edges: AgentCoreFeatureAlignmentEdgeInput[];
  read_only_inspections: AgentCoreFeatureReadOnlyInspectionInput[];
  approval_refs: string[];
  audit_event_refs: string[];
  trace_context_refs: string[];
  created_at?: string;
  provider_dispatch_allowed?: false;
  provider_api_calls_allowed?: false;
  inspection_execution_allowed?: false;
  probe_execution_allowed?: false;
  gateway_mcp_mutation_allowed?: false;
  runtime_mutation_allowed?: false;
  repo_write_allowed?: false;
  local_model_start_allowed?: false;
  local_model_install_allowed?: false;
  secret_value_allowed?: false;
  source_revision_blessing_allowed?: false;
  release_execution_allowed?: false;
  side_effects?: [];
};

export type AgentCoreFeatureGraphAlignmentErrorCode =
  | "agent_core_feature_graph_alignment.invalid_request"
  | "agent_core_feature_graph_alignment.unexpected_field"
  | "agent_core_feature_graph_alignment.invalid_ref"
  | "agent_core_feature_graph_alignment.invalid_packet_ref"
  | "agent_core_feature_graph_alignment.node_required"
  | "agent_core_feature_graph_alignment.invalid_node"
  | "agent_core_feature_graph_alignment.edge_required"
  | "agent_core_feature_graph_alignment.invalid_edge"
  | "agent_core_feature_graph_alignment.inspection_required"
  | "agent_core_feature_graph_alignment.invalid_inspection"
  | "agent_core_feature_graph_alignment.missing_loop_graph_alignment"
  | "agent_core_feature_graph_alignment.missing_catalog_feature_alignment"
  | "agent_core_feature_graph_alignment.missing_probe_target_alignment"
  | "agent_core_feature_graph_alignment.missing_read_only_inspection"
  | "agent_core_feature_graph_alignment.secret_value_embedded"
  | "agent_core_feature_graph_alignment.provider_dispatch_forbidden"
  | "agent_core_feature_graph_alignment.provider_api_calls_forbidden"
  | "agent_core_feature_graph_alignment.inspection_execution_forbidden"
  | "agent_core_feature_graph_alignment.probe_execution_forbidden"
  | "agent_core_feature_graph_alignment.gateway_mcp_mutation_forbidden"
  | "agent_core_feature_graph_alignment.runtime_mutation_forbidden"
  | "agent_core_feature_graph_alignment.repo_write_forbidden"
  | "agent_core_feature_graph_alignment.local_model_start_forbidden"
  | "agent_core_feature_graph_alignment.local_model_install_forbidden"
  | "agent_core_feature_graph_alignment.secret_value_forbidden"
  | "agent_core_feature_graph_alignment.source_revision_blessing_forbidden"
  | "agent_core_feature_graph_alignment.release_execution_forbidden"
  | "agent_core_feature_graph_alignment.side_effects_forbidden";

export type AgentCoreFeatureGraphAlignmentError = {
  code: AgentCoreFeatureGraphAlignmentErrorCode;
  path: string;
  message: string;
  severity: "error";
};

export type AgentCoreFeatureGraphAlignmentEvidence = {
  contract_id: typeof agentCoreFeatureGraphAlignmentContract.contract_id;
  request_id: string | null;
  alignment_ref: string;
  packet_ref: string;
  owner_ref: string;
  loop_ref: string;
  catalog_ref: string;
  created_at: string;
  alignment_node_refs: string[];
  alignment_node_kinds: AgentCoreFeatureAlignmentNodeKind[];
  alignment_edge_refs: string[];
  alignment_relations: AgentCoreFeatureAlignmentRelation[];
  read_only_inspection_refs: string[];
  read_only_inspection_kinds: AgentCoreFeatureInspectionKind[];
  approval_refs: string[];
  audit_event_refs: string[];
  trace_context_refs: string[];
  source_refs: string[];
  coverage: {
    loop_graph_nodes: true;
    loop_graph_edges: true;
    catalog_features: true;
    probe_targets: true;
    policy_graph_links: true;
    read_only_inspections: true;
  };
  denied_runtime_behavior: string[];
  provider_dispatch_allowed: false;
  provider_api_calls_allowed: false;
  inspection_execution_allowed: false;
  probe_execution_allowed: false;
  gateway_mcp_mutation_allowed: false;
  runtime_mutation_allowed: false;
  repo_write_allowed: false;
  local_model_start_allowed: false;
  local_model_install_allowed: false;
  secret_value_allowed: false;
  source_revision_blessing_allowed: false;
  release_execution_allowed: false;
  side_effects: [];
};

export type AgentCoreFeatureGraphAlignmentResult =
  | {
      ok: true;
      alignment: AgentCoreFeatureGraphAlignmentEvidence;
      errors: [];
      side_effects: [];
    }
  | {
      ok: false;
      alignment: null;
      errors: AgentCoreFeatureGraphAlignmentError[];
      raw_input_content: "withheld";
      side_effects: [];
    };

type NormalizedAgentCoreFeatureGraphAlignmentRequest = Omit<
  AgentCoreFeatureGraphAlignmentRequest,
  "request_id" | "created_at"
> & {
  request_id: string | null;
  created_at: string;
};

const requestKeys = new Set([
  "request_id",
  "alignment_ref",
  "packet_ref",
  "owner_ref",
  "loop_ref",
  "catalog_ref",
  "alignment_nodes",
  "alignment_edges",
  "read_only_inspections",
  "approval_refs",
  "audit_event_refs",
  "trace_context_refs",
  "created_at",
  "provider_dispatch_allowed",
  "provider_api_calls_allowed",
  "inspection_execution_allowed",
  "probe_execution_allowed",
  "gateway_mcp_mutation_allowed",
  "runtime_mutation_allowed",
  "repo_write_allowed",
  "local_model_start_allowed",
  "local_model_install_allowed",
  "secret_value_allowed",
  "source_revision_blessing_allowed",
  "release_execution_allowed",
  "side_effects",
]);

const nodeKeys = new Set([
  "alignment_node_ref",
  "source_ref",
  "node_kind",
  "label",
  "source_refs",
]);
const edgeKeys = new Set([
  "alignment_edge_ref",
  "from_ref",
  "to_ref",
  "relation",
  "policy_effect",
  "source_refs",
]);
const inspectionKeys = new Set([
  "inspection_ref",
  "inspection_kind",
  "target_ref",
  "feature_ref",
  "approval_ref",
  "audit_event_ref",
  "trace_context_ref",
  "mode",
  "inspection_execution_allowed",
  "probe_execution_allowed",
  "mutation_allowed",
  "provider_dispatch_allowed",
  "provider_api_calls_allowed",
  "uses_secret_value",
  "side_effects",
  "source_refs",
]);

const nodeKinds = new Set<AgentCoreFeatureAlignmentNodeKind>(
  agentCoreFeatureGraphAlignmentContract.alignment_node_kinds,
);
const relations = new Set<AgentCoreFeatureAlignmentRelation>(
  agentCoreFeatureGraphAlignmentContract.alignment_relations,
);
const inspectionKinds = new Set<AgentCoreFeatureInspectionKind>(
  agentCoreFeatureGraphAlignmentContract.inspection_kinds,
);
const policyEffects = new Set<AgentCoreFeatureAlignmentPolicyEffect>(
  agentCoreFeatureGraphAlignmentContract.policy_effects,
);
const refPattern = /^[a-z][a-z0-9_.:-]{1,127}$/;
const bpRefPattern = /^BP-\d{4}$/;
const isoDateTimePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;
const safeStringPattern = /^[\w .,:;@/()[\]#_+=-]{2,320}$/;
const secretLikePattern =
  /(postgres:\/\/|mysql:\/\/|mongodb:\/\/|DATABASE_URL|PASSWORD=|PRIVATE KEY|BEGIN [A-Z ]*KEY|sk-[A-Za-z0-9]|bearer\s+[A-Za-z0-9]|api[_-]?key\s*[:=])/i;

export function createAgentCoreFeatureGraphAlignment(
  input: unknown,
  options: { now?: Date } = {},
): AgentCoreFeatureGraphAlignmentResult {
  const normalized = normalizeAgentCoreFeatureGraphAlignment(
    input,
    options.now ?? new Date(),
  );
  if (!normalized.ok) {
    return fail(normalized.errors);
  }

  const request = normalized.request;
  return {
    ok: true,
    alignment: {
      contract_id: agentCoreFeatureGraphAlignmentContract.contract_id,
      request_id: request.request_id,
      alignment_ref: request.alignment_ref,
      packet_ref: request.packet_ref,
      owner_ref: request.owner_ref,
      loop_ref: request.loop_ref,
      catalog_ref: request.catalog_ref,
      created_at: request.created_at,
      alignment_node_refs: unique(
        request.alignment_nodes.map((node) => node.alignment_node_ref),
      ),
      alignment_node_kinds: unique(
        request.alignment_nodes.map((node) => node.node_kind),
      ),
      alignment_edge_refs: unique(
        request.alignment_edges.map((edge) => edge.alignment_edge_ref),
      ),
      alignment_relations: unique(request.alignment_edges.map((edge) => edge.relation)),
      read_only_inspection_refs: unique(
        request.read_only_inspections.map((inspection) => inspection.inspection_ref),
      ),
      read_only_inspection_kinds: unique(
        request.read_only_inspections.map((inspection) => inspection.inspection_kind),
      ),
      approval_refs: unique(request.approval_refs),
      audit_event_refs: unique(request.audit_event_refs),
      trace_context_refs: unique(request.trace_context_refs),
      source_refs: unique([
        ...agentCoreFeatureGraphAlignmentContract.source_docs,
        ...request.alignment_nodes.flatMap((node) => node.source_refs),
        ...request.alignment_edges.flatMap((edge) => edge.source_refs),
        ...request.read_only_inspections.flatMap(
          (inspection) => inspection.source_refs,
        ),
      ]),
      coverage: {
        loop_graph_nodes: true,
        loop_graph_edges: true,
        catalog_features: true,
        probe_targets: true,
        policy_graph_links: true,
        read_only_inspections: true,
      },
      denied_runtime_behavior: [
        "provider_dispatch",
        "provider_api_calls",
        "inspection_execution",
        "probe_execution",
        "gateway_mcp_mutation",
        "runtime_mutation",
        "repo_write_from_runtime",
        "local_model_start",
        "local_model_install",
        "secret_value_use",
        "source_revision_blessing",
        "release_execution",
      ],
      provider_dispatch_allowed: false,
      provider_api_calls_allowed: false,
      inspection_execution_allowed: false,
      probe_execution_allowed: false,
      gateway_mcp_mutation_allowed: false,
      runtime_mutation_allowed: false,
      repo_write_allowed: false,
      local_model_start_allowed: false,
      local_model_install_allowed: false,
      secret_value_allowed: false,
      source_revision_blessing_allowed: false,
      release_execution_allowed: false,
      side_effects: [],
    },
    errors: [],
    side_effects: [],
  };
}

function normalizeAgentCoreFeatureGraphAlignment(
  input: unknown,
  now: Date,
):
  | { ok: true; request: NormalizedAgentCoreFeatureGraphAlignmentRequest }
  | { ok: false; errors: AgentCoreFeatureGraphAlignmentError[] } {
  if (!isPlainObject(input)) {
    return {
      ok: false,
      errors: [
        error(
          "agent_core_feature_graph_alignment.invalid_request",
          "",
          "Agent core feature graph alignment request must be an object.",
        ),
      ],
    };
  }

  const errors: AgentCoreFeatureGraphAlignmentError[] = [];
  appendSecretValueErrors(input, "", errors);
  assertKnownKeys(input, requestKeys, "", errors);
  requireRef(input.alignment_ref, "/alignment_ref", errors);
  requireRef(input.owner_ref, "/owner_ref", errors);
  requireRef(input.loop_ref, "/loop_ref", errors);
  requireRef(input.catalog_ref, "/catalog_ref", errors);

  if (typeof input.packet_ref !== "string" || !bpRefPattern.test(input.packet_ref)) {
    errors.push(
      error(
        "agent_core_feature_graph_alignment.invalid_packet_ref",
        "/packet_ref",
        "Graph alignment packet_ref must be a build packet id.",
      ),
    );
  }

  const createdAt =
    typeof input.created_at === "string" && isoDateTimePattern.test(input.created_at)
      ? input.created_at
      : now.toISOString();
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
  const alignmentNodes = normalizeNodes(input.alignment_nodes, errors);
  const nodeRefs = new Set(alignmentNodes.map((node) => node.alignment_node_ref));
  const sourceRefsByNodeRef = new Map(
    alignmentNodes.map((node) => [node.alignment_node_ref, node.source_ref]),
  );
  const alignmentEdges = normalizeEdges(input.alignment_edges, nodeRefs, errors);
  const readOnlyInspections = normalizeInspections(
    input.read_only_inspections,
    sourceRefsByNodeRef,
    new Set(approvalRefs),
    new Set(auditEventRefs),
    new Set(traceContextRefs),
    errors,
  );

  assertCoverage(alignmentNodes, alignmentEdges, readOnlyInspections, errors);

  for (const key of [
    "provider_dispatch_allowed",
    "provider_api_calls_allowed",
    "inspection_execution_allowed",
    "probe_execution_allowed",
    "gateway_mcp_mutation_allowed",
    "runtime_mutation_allowed",
    "repo_write_allowed",
    "local_model_start_allowed",
    "local_model_install_allowed",
    "secret_value_allowed",
    "source_revision_blessing_allowed",
    "release_execution_allowed",
  ]) {
    assertFalseFlag(input, key, errors);
  }

  if (
    Object.hasOwn(input, "side_effects") &&
    (!Array.isArray(input.side_effects) || input.side_effects.length !== 0)
  ) {
    errors.push(
      error(
        "agent_core_feature_graph_alignment.side_effects_forbidden",
        "/side_effects",
        "Graph alignment must preserve side_effects: [].",
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
      alignment_ref: input.alignment_ref as string,
      packet_ref: input.packet_ref as string,
      owner_ref: input.owner_ref as string,
      loop_ref: input.loop_ref as string,
      catalog_ref: input.catalog_ref as string,
      alignment_nodes: alignmentNodes,
      alignment_edges: alignmentEdges,
      read_only_inspections: readOnlyInspections,
      approval_refs: approvalRefs,
      audit_event_refs: auditEventRefs,
      trace_context_refs: traceContextRefs,
      created_at: createdAt,
      provider_dispatch_allowed: false,
      provider_api_calls_allowed: false,
      inspection_execution_allowed: false,
      probe_execution_allowed: false,
      gateway_mcp_mutation_allowed: false,
      runtime_mutation_allowed: false,
      repo_write_allowed: false,
      local_model_start_allowed: false,
      local_model_install_allowed: false,
      secret_value_allowed: false,
      source_revision_blessing_allowed: false,
      release_execution_allowed: false,
      side_effects: [],
    },
  };
}

function normalizeNodes(
  value: unknown,
  errors: AgentCoreFeatureGraphAlignmentError[],
): AgentCoreFeatureAlignmentNodeInput[] {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push(
      error(
        "agent_core_feature_graph_alignment.node_required",
        "/alignment_nodes",
        "Graph alignment requires nodes.",
      ),
    );
    return [];
  }
  return value.flatMap((node, index) => {
    const path = `/alignment_nodes/${index}`;
    if (!isPlainObject(node)) {
      errors.push(
        error(
          "agent_core_feature_graph_alignment.invalid_node",
          path,
          "Graph alignment node must be an object.",
        ),
      );
      return [];
    }
    assertKnownKeys(node, nodeKeys, path, errors);
    requireRef(node.alignment_node_ref, `${path}/alignment_node_ref`, errors);
    requireRef(node.source_ref, `${path}/source_ref`, errors);
    requireKnown(node.node_kind, nodeKinds, `${path}/node_kind`, errors);
    requireSafeString(node.label, `${path}/label`, errors);
    requireStringArray(node.source_refs, `${path}/source_refs`, errors);
    return [node as AgentCoreFeatureAlignmentNodeInput];
  });
}

function normalizeEdges(
  value: unknown,
  nodeRefs: Set<string>,
  errors: AgentCoreFeatureGraphAlignmentError[],
): AgentCoreFeatureAlignmentEdgeInput[] {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push(
      error(
        "agent_core_feature_graph_alignment.edge_required",
        "/alignment_edges",
        "Graph alignment requires edges.",
      ),
    );
    return [];
  }
  return value.flatMap((edge, index) => {
    const path = `/alignment_edges/${index}`;
    if (!isPlainObject(edge)) {
      errors.push(
        error(
          "agent_core_feature_graph_alignment.invalid_edge",
          path,
          "Graph alignment edge must be an object.",
        ),
      );
      return [];
    }
    assertKnownKeys(edge, edgeKeys, path, errors);
    requireRef(edge.alignment_edge_ref, `${path}/alignment_edge_ref`, errors);
    requireRef(edge.from_ref, `${path}/from_ref`, errors);
    requireRef(edge.to_ref, `${path}/to_ref`, errors);
    requireKnown(edge.relation, relations, `${path}/relation`, errors);
    requireKnown(edge.policy_effect, policyEffects, `${path}/policy_effect`, errors);
    requireStringArray(edge.source_refs, `${path}/source_refs`, errors);
    for (const key of ["from_ref", "to_ref"]) {
      const ref = edge[key];
      if (typeof ref === "string" && !nodeRefs.has(ref)) {
        errors.push(
          error(
            "agent_core_feature_graph_alignment.invalid_ref",
            `${path}/${key}`,
            "Graph alignment edges must reference alignment nodes.",
          ),
        );
      }
    }
    return [edge as AgentCoreFeatureAlignmentEdgeInput];
  });
}

function normalizeInspections(
  value: unknown,
  sourceRefsByNodeRef: Map<string, string>,
  approvalRefs: Set<string>,
  auditEventRefs: Set<string>,
  traceContextRefs: Set<string>,
  errors: AgentCoreFeatureGraphAlignmentError[],
): AgentCoreFeatureReadOnlyInspectionInput[] {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push(
      error(
        "agent_core_feature_graph_alignment.inspection_required",
        "/read_only_inspections",
        "Graph alignment requires read-only inspection refs.",
      ),
    );
    return [];
  }
  return value.flatMap((inspection, index) => {
    const path = `/read_only_inspections/${index}`;
    if (!isPlainObject(inspection)) {
      errors.push(
        error(
          "agent_core_feature_graph_alignment.invalid_inspection",
          path,
          "Read-only inspection ref must be an object.",
        ),
      );
      return [];
    }
    assertKnownKeys(inspection, inspectionKeys, path, errors);
    requireRef(inspection.inspection_ref, `${path}/inspection_ref`, errors);
    requireKnown(
      inspection.inspection_kind,
      inspectionKinds,
      `${path}/inspection_kind`,
      errors,
    );
    requireRef(inspection.target_ref, `${path}/target_ref`, errors);
    requireRef(inspection.feature_ref, `${path}/feature_ref`, errors);
    requireRef(inspection.approval_ref, `${path}/approval_ref`, errors);
    requireRef(inspection.audit_event_ref, `${path}/audit_event_ref`, errors);
    requireRef(inspection.trace_context_ref, `${path}/trace_context_ref`, errors);
    requireStringArray(inspection.source_refs, `${path}/source_refs`, errors);
    if (inspection.mode !== "read_only_reference") {
      errors.push(
        error(
          "agent_core_feature_graph_alignment.invalid_inspection",
          `${path}/mode`,
          "Inspection mode must be read_only_reference.",
        ),
      );
    }
    for (const [key, nodeRef] of [
      ["target_ref", inspection.target_ref],
      ["feature_ref", inspection.feature_ref],
    ] as const) {
      if (typeof nodeRef === "string" && !sourceRefsByNodeRef.has(nodeRef)) {
        errors.push(
          error(
            "agent_core_feature_graph_alignment.invalid_ref",
            `${path}/${key}`,
            "Inspection refs must point to alignment nodes.",
          ),
        );
      }
    }
    if (
      typeof inspection.approval_ref === "string" &&
      !approvalRefs.has(inspection.approval_ref)
    ) {
      errors.push(
        error(
          "agent_core_feature_graph_alignment.invalid_ref",
          `${path}/approval_ref`,
          "Inspection approval_ref must be declared in approval_refs.",
        ),
      );
    }
    if (
      typeof inspection.audit_event_ref === "string" &&
      !auditEventRefs.has(inspection.audit_event_ref)
    ) {
      errors.push(
        error(
          "agent_core_feature_graph_alignment.invalid_ref",
          `${path}/audit_event_ref`,
          "Inspection audit_event_ref must be declared in audit_event_refs.",
        ),
      );
    }
    if (
      typeof inspection.trace_context_ref === "string" &&
      !traceContextRefs.has(inspection.trace_context_ref)
    ) {
      errors.push(
        error(
          "agent_core_feature_graph_alignment.invalid_ref",
          `${path}/trace_context_ref`,
          "Inspection trace_context_ref must be declared in trace_context_refs.",
        ),
      );
    }
    for (const key of [
      "inspection_execution_allowed",
      "probe_execution_allowed",
      "mutation_allowed",
      "provider_dispatch_allowed",
      "provider_api_calls_allowed",
      "uses_secret_value",
    ]) {
      assertInspectionFalseFlag(inspection, key, path, errors);
    }
    if (
      Object.hasOwn(inspection, "side_effects") &&
      (!Array.isArray(inspection.side_effects) || inspection.side_effects.length !== 0)
    ) {
      errors.push(
        error(
          "agent_core_feature_graph_alignment.side_effects_forbidden",
          `${path}/side_effects`,
          "Inspection refs must preserve side_effects: [].",
        ),
      );
    }
    return [inspection as AgentCoreFeatureReadOnlyInspectionInput];
  });
}

function assertCoverage(
  nodes: AgentCoreFeatureAlignmentNodeInput[],
  edges: AgentCoreFeatureAlignmentEdgeInput[],
  inspections: AgentCoreFeatureReadOnlyInspectionInput[],
  errors: AgentCoreFeatureGraphAlignmentError[],
): void {
  const nodeKindSet = new Set(nodes.map((node) => node.node_kind));
  if (!nodeKindSet.has("agent_loop_graph_node")) {
    errors.push(
      error(
        "agent_core_feature_graph_alignment.missing_loop_graph_alignment",
        "/alignment_nodes",
        "Graph alignment must include agent loop graph nodes.",
      ),
    );
  }
  if (!nodeKindSet.has("agent_loop_graph_edge")) {
    errors.push(
      error(
        "agent_core_feature_graph_alignment.missing_loop_graph_alignment",
        "/alignment_nodes",
        "Graph alignment must include agent loop graph edges.",
      ),
    );
  }
  if (!nodeKindSet.has("mcp_feature")) {
    errors.push(
      error(
        "agent_core_feature_graph_alignment.missing_catalog_feature_alignment",
        "/alignment_nodes",
        "Graph alignment must include MCP/catalog feature nodes.",
      ),
    );
  }
  if (!nodeKindSet.has("probe_target")) {
    errors.push(
      error(
        "agent_core_feature_graph_alignment.missing_probe_target_alignment",
        "/alignment_nodes",
        "Graph alignment must include probe target nodes.",
      ),
    );
  }
  if (!nodeKindSet.has("policy_graph_link")) {
    errors.push(
      error(
        "agent_core_feature_graph_alignment.missing_catalog_feature_alignment",
        "/alignment_nodes",
        "Graph alignment must include policy graph link nodes.",
      ),
    );
  }
  if (edges.every((edge) => edge.relation !== "aligns_with")) {
    errors.push(
      error(
        "agent_core_feature_graph_alignment.missing_loop_graph_alignment",
        "/alignment_edges",
        "Graph alignment must include aligns_with edges between loop and catalog refs.",
      ),
    );
  }
  if (inspections.length === 0) {
    errors.push(
      error(
        "agent_core_feature_graph_alignment.missing_read_only_inspection",
        "/read_only_inspections",
        "Graph alignment must include read-only inspection refs.",
      ),
    );
  }
}

function normalizeRefArray(
  value: unknown,
  path: string,
  errors: AgentCoreFeatureGraphAlignmentError[],
): string[] {
  requireRefArray(value, path, errors);
  return Array.isArray(value)
    ? (value.filter((item) => typeof item === "string") as string[])
    : [];
}

function assertFalseFlag(
  input: Record<string, unknown>,
  key: string,
  errors: AgentCoreFeatureGraphAlignmentError[],
): void {
  if (Object.hasOwn(input, key) && input[key] !== false) {
    errors.push(
      error(
        flagErrorCode(key),
        `/${key}`,
        "Graph alignment cannot enable hard-gated behavior.",
      ),
    );
  }
}

function assertInspectionFalseFlag(
  input: Record<string, unknown>,
  key: string,
  path: string,
  errors: AgentCoreFeatureGraphAlignmentError[],
): void {
  if (Object.hasOwn(input, key) && input[key] !== false) {
    errors.push(
      error(
        key === "uses_secret_value"
          ? "agent_core_feature_graph_alignment.secret_value_forbidden"
          : flagErrorCode(key),
        `${path}/${key}`,
        "Read-only inspection cannot enable execution, mutation, dispatch, or secrets.",
      ),
    );
  }
}

function flagErrorCode(key: string): AgentCoreFeatureGraphAlignmentErrorCode {
  const codeByKey: Record<string, AgentCoreFeatureGraphAlignmentErrorCode> = {
    provider_dispatch_allowed:
      "agent_core_feature_graph_alignment.provider_dispatch_forbidden",
    provider_api_calls_allowed:
      "agent_core_feature_graph_alignment.provider_api_calls_forbidden",
    inspection_execution_allowed:
      "agent_core_feature_graph_alignment.inspection_execution_forbidden",
    probe_execution_allowed:
      "agent_core_feature_graph_alignment.probe_execution_forbidden",
    mutation_allowed: "agent_core_feature_graph_alignment.runtime_mutation_forbidden",
    gateway_mcp_mutation_allowed:
      "agent_core_feature_graph_alignment.gateway_mcp_mutation_forbidden",
    runtime_mutation_allowed:
      "agent_core_feature_graph_alignment.runtime_mutation_forbidden",
    repo_write_allowed: "agent_core_feature_graph_alignment.repo_write_forbidden",
    local_model_start_allowed:
      "agent_core_feature_graph_alignment.local_model_start_forbidden",
    local_model_install_allowed:
      "agent_core_feature_graph_alignment.local_model_install_forbidden",
    secret_value_allowed: "agent_core_feature_graph_alignment.secret_value_forbidden",
    uses_secret_value: "agent_core_feature_graph_alignment.secret_value_forbidden",
    source_revision_blessing_allowed:
      "agent_core_feature_graph_alignment.source_revision_blessing_forbidden",
    release_execution_allowed:
      "agent_core_feature_graph_alignment.release_execution_forbidden",
  };
  return codeByKey[key] ?? "agent_core_feature_graph_alignment.invalid_request";
}

function appendSecretValueErrors(
  value: unknown,
  path: string,
  errors: AgentCoreFeatureGraphAlignmentError[],
): void {
  if (typeof value === "string") {
    if (secretLikePattern.test(value)) {
      errors.push(
        error(
          "agent_core_feature_graph_alignment.secret_value_embedded",
          path || "",
          "Graph alignment must use refs only and must not embed secret-like values.",
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
  errors: AgentCoreFeatureGraphAlignmentError[],
): void {
  if (typeof value !== "string" || !refPattern.test(value)) {
    errors.push(
      error(
        "agent_core_feature_graph_alignment.invalid_ref",
        path,
        "Value must be a stable ref id.",
      ),
    );
  }
}

function requireRefArray(
  value: unknown,
  path: string,
  errors: AgentCoreFeatureGraphAlignmentError[],
): void {
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    value.some((item) => typeof item !== "string" || !refPattern.test(item))
  ) {
    errors.push(
      error(
        "agent_core_feature_graph_alignment.invalid_ref",
        path,
        "Value must be a non-empty ref array.",
      ),
    );
  }
}

function requireStringArray(
  value: unknown,
  path: string,
  errors: AgentCoreFeatureGraphAlignmentError[],
): void {
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    value.some((item) => typeof item !== "string" || !safeString(item))
  ) {
    errors.push(
      error(
        "agent_core_feature_graph_alignment.invalid_ref",
        path,
        "Value must be a non-empty safe string array.",
      ),
    );
  }
}

function requireSafeString(
  value: unknown,
  path: string,
  errors: AgentCoreFeatureGraphAlignmentError[],
): void {
  if (typeof value !== "string" || !safeString(value)) {
    errors.push(
      error(
        "agent_core_feature_graph_alignment.invalid_ref",
        path,
        "Value must be a safe string.",
      ),
    );
  }
}

function requireKnown<T extends string>(
  value: unknown,
  allowed: Set<T>,
  path: string,
  errors: AgentCoreFeatureGraphAlignmentError[],
): void {
  if (typeof value !== "string" || !allowed.has(value as T)) {
    errors.push(
      error(
        "agent_core_feature_graph_alignment.invalid_ref",
        path,
        "Value is not in the allowed contract set.",
      ),
    );
  }
}

function assertKnownKeys(
  value: Record<string, unknown>,
  allowed: Set<string>,
  path: string,
  errors: AgentCoreFeatureGraphAlignmentError[],
): void {
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) {
      errors.push(
        error(
          "agent_core_feature_graph_alignment.unexpected_field",
          `${path}/${escapeJsonPointerSegment(key)}`,
          "Unexpected field in graph alignment request.",
        ),
      );
    }
  }
}

function fail(
  errors: AgentCoreFeatureGraphAlignmentError[],
): AgentCoreFeatureGraphAlignmentResult {
  return {
    ok: false,
    alignment: null,
    errors: dedupe(errors),
    raw_input_content: "withheld",
    side_effects: [],
  };
}

function error(
  code: AgentCoreFeatureGraphAlignmentErrorCode,
  path: string,
  message: string,
): AgentCoreFeatureGraphAlignmentError {
  return { code, path, message, severity: "error" };
}

function dedupe<T extends { code: string; path: string }>(errors: T[]): T[] {
  const seen = new Set<string>();
  return errors.filter((item) => {
    const key = `${item.code}:${item.path}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}

function safeString(value: string): boolean {
  return safeStringPattern.test(value) && !secretLikePattern.test(value);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function escapeJsonPointerSegment(value: string): string {
  return value.replaceAll("~", "~0").replaceAll("/", "~1");
}
