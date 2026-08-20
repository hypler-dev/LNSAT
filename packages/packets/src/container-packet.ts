export const CONTAINER_PACKET_STATUS = "source_only";

export const containerPacketContract = {
  contract_id: "lnsat.platform.container_packet_contract.v0_1",
  authority: ["@lnsat/packets", "source-backed-container-packet-contract"],
  container_packet_version: "0.1",
  packet_kinds: ["sandbox_test", "sandbox_build", "package_trial"],
  mount_types: ["workspace_overlay", "tmpfs", "artifact_output", "readonly_cache"],
  network_profiles: ["disabled"],
  source_docs: [
    "docs/architecture/PACKET_MODEL.md",
    "docs/architecture/POLICY_AND_AUDIT.md",
    "docs/architecture/SYSTEM_ARCHITECTURE.md",
    "docs/architecture/SUBSTRATES_AND_NODES.md",
    "docs/architecture/DATA_MODEL.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
  ],
  live_container_execution_allowed: false,
  side_effects: [],
  status: "source_only",
} as const;

export type ContainerPacketKind = (typeof containerPacketContract.packet_kinds)[number];
export type ContainerMountType = (typeof containerPacketContract.mount_types)[number];
export type ContainerNetworkProfile =
  (typeof containerPacketContract.network_profiles)[number];

export type ContainerPacketSourceInput = {
  source_ref: string;
  summary: string;
};

export type ContainerResourceLimitsInput = {
  cpu_cores: number;
  memory_mb: number;
  disk_mb: number;
  pids: number;
  runtime_seconds: number;
};

export type ContainerMountRuleInput = {
  mount_type: ContainerMountType;
  target: string;
  source_ref?: string | null;
  readonly: boolean;
  host_mutation_allowed: false;
};

export type ContainerNetworkRulesInput = {
  profile: ContainerNetworkProfile;
  outbound_allowlist: [];
  inbound_ports: [];
  dns_allowed: false;
};

export type ContainerArtifactOutputInput = {
  name: string;
  path: string;
  retention: "ephemeral" | "audit_artifact" | "operator_review";
  required: boolean;
};

export type ContainerBoundaryInput = {
  no_secrets: true;
  no_host_mutation: true;
  no_privileged: true;
  no_host_network: true;
  no_docker_socket: true;
  no_root: true;
};

export type ContainerPacketDefinitionInput = {
  packet_kind: ContainerPacketKind;
  summary: string;
  image_ref: string;
  command_ref: string;
  resource_limits: ContainerResourceLimitsInput;
  mount_rules: ContainerMountRuleInput[];
  network_rules: ContainerNetworkRulesInput;
  artifact_outputs: ContainerArtifactOutputInput[];
  boundaries: ContainerBoundaryInput;
  denied_runtime_behavior?: string[];
  required_approvals?: string[];
  secret_refs?: [];
  source_refs: ContainerPacketSourceInput[];
  live_container_execution_allowed?: false;
  side_effects?: [];
};

export type ContainerResourceLimitsEvidence = ContainerResourceLimitsInput;

export type ContainerMountRuleEvidence = {
  mount_type: ContainerMountType;
  target: string;
  source_ref: string | null;
  readonly: boolean;
  host_mutation_allowed: false;
};

export type ContainerNetworkRulesEvidence = ContainerNetworkRulesInput;
export type ContainerArtifactOutputEvidence = ContainerArtifactOutputInput;
export type ContainerBoundaryEvidence = ContainerBoundaryInput;

export type ContainerPacketEvidence = {
  packet_kind: ContainerPacketKind;
  summary: string;
  image_ref: string;
  command_ref: string;
  resource_limits: ContainerResourceLimitsEvidence;
  mount_rules: ContainerMountRuleEvidence[];
  network_rules: ContainerNetworkRulesEvidence;
  artifact_outputs: ContainerArtifactOutputEvidence[];
  boundaries: ContainerBoundaryEvidence;
  denied_runtime_behavior: string[];
  required_approvals: string[];
  source_refs: string[];
  live_container_execution_allowed: false;
  side_effects: [];
};

export type ContainerPacketRequest = {
  container_packet_version?: typeof containerPacketContract.container_packet_version;
  container_packet?: ContainerPacketDefinitionInput | ContainerPacketEvidence;
  source_refs?: ContainerPacketSourceInput[];
  live_container_execution_allowed?: false;
  side_effects?: [];
};

export type ContainerPacketErrorCode =
  | "container_packet.invalid_request"
  | "container_packet.unexpected_field"
  | "container_packet.invalid_version"
  | "container_packet.packet_required"
  | "container_packet.invalid_packet_kind"
  | "container_packet.invalid_packet"
  | "container_packet.invalid_resource_limit"
  | "container_packet.invalid_mount_rule"
  | "container_packet.host_mount_forbidden"
  | "container_packet.host_mutation_forbidden"
  | "container_packet.privileged_container_forbidden"
  | "container_packet.network_open_forbidden"
  | "container_packet.secret_boundary_required"
  | "container_packet.secret_value_forbidden"
  | "container_packet.invalid_artifact_output"
  | "container_packet.invalid_source_ref"
  | "container_packet.live_execution_forbidden"
  | "container_packet.side_effects_forbidden";

export type ContainerPacketError = {
  code: ContainerPacketErrorCode;
  path: string;
  message: string;
  severity: "error";
};

export type ContainerPacketContractEvidence = {
  contract_id: typeof containerPacketContract.contract_id;
  container_packet_version: typeof containerPacketContract.container_packet_version;
  packet_kinds: ContainerPacketKind[];
  container_packet: ContainerPacketEvidence;
  resource_limits: ContainerResourceLimitsEvidence;
  mount_rules: ContainerMountRuleEvidence[];
  network_rules: ContainerNetworkRulesEvidence;
  artifact_outputs: ContainerArtifactOutputEvidence[];
  boundaries: ContainerBoundaryEvidence;
  denied_runtime_behavior: string[];
  required_approvals: string[];
  source_refs: string[];
  live_container_execution_allowed: false;
  side_effects: [];
};

export type ContainerPacketResult =
  | {
      ok: true;
      container_packet: ContainerPacketContractEvidence;
      errors: [];
      side_effects: [];
    }
  | {
      ok: false;
      container_packet: null;
      errors: ContainerPacketError[];
      raw_input_content: "withheld";
      side_effects: [];
    };

type NormalizedContainerPacketRequest =
  | {
      ok: true;
      container_packet: ContainerPacketEvidence;
      source_refs: string[];
    }
  | {
      ok: false;
      errors: ContainerPacketError[];
    };

const requestKeys = new Set([
  "container_packet_version",
  "container_packet",
  "source_refs",
  "live_container_execution_allowed",
  "side_effects",
]);
const packetKeys = new Set([
  "packet_kind",
  "summary",
  "image_ref",
  "command_ref",
  "resource_limits",
  "mount_rules",
  "network_rules",
  "artifact_outputs",
  "boundaries",
  "denied_runtime_behavior",
  "required_approvals",
  "secret_refs",
  "source_refs",
  "live_container_execution_allowed",
  "side_effects",
]);
const resourceLimitKeys = new Set([
  "cpu_cores",
  "memory_mb",
  "disk_mb",
  "pids",
  "runtime_seconds",
]);
const mountRuleKeys = new Set([
  "mount_type",
  "target",
  "source_ref",
  "readonly",
  "host_mutation_allowed",
]);
const networkRuleKeys = new Set([
  "profile",
  "outbound_allowlist",
  "inbound_ports",
  "dns_allowed",
]);
const artifactOutputKeys = new Set(["name", "path", "retention", "required"]);
const boundaryKeys = new Set([
  "no_secrets",
  "no_host_mutation",
  "no_privileged",
  "no_host_network",
  "no_docker_socket",
  "no_root",
]);
const sourceKeys = new Set(["source_ref", "summary"]);
const packetKinds = new Set<ContainerPacketKind>(containerPacketContract.packet_kinds);
const mountTypes = new Set<ContainerMountType>(containerPacketContract.mount_types);
const artifactRetentions = new Set(["ephemeral", "audit_artifact", "operator_review"]);
const safeStringPattern = /^[\w .,:;@/()[\]#_+=-]{3,240}$/;
const capabilityPattern = /^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*){1,6}$/;
const pathPattern = /^\/[\w./_-]{1,160}$/;
const secretLikePattern =
  /(postgres:\/\/|mysql:\/\/|mongodb:\/\/|DATABASE_URL|API_KEY|SECRET|TOKEN|PASSWORD|PRIVATE KEY|BEGIN [A-Z ]*PRIVATE KEY|sk-[A-Za-z0-9]|AKIA[A-Z0-9]|secret:)/i;
const capabilitySecretValuePattern =
  /(postgres:\/\/|mysql:\/\/|mongodb:\/\/|DATABASE_URL|API_KEY|TOKEN|PASSWORD|PRIVATE KEY|BEGIN [A-Z ]*PRIVATE KEY|sk-[A-Za-z0-9]|AKIA[A-Z0-9]|secret:)/i;
const hostMountPattern =
  /(^\/Users\/|^\/home\/|^\/var\/|^\/etc\/|^\/private\/|docker\.sock|docker_socket|host_bind|host\.mount|host_path|hostpath|bind_mount)/i;
const privilegedPattern =
  /\b(privileged|root|sudo|docker\.socket|docker_socket|host\.network|host_network|cap_add|security_unconfined|unrestricted|node_agent\.exec)\b/i;
const runtimeMutationPattern =
  /\b(start|build|pull|run|exec|mutate|mutation|inject|write|delete|destroy|deploy|restart|ssh|database\.write|queue\.purge|dns\.write|cloudflare\.write|secret\.read)\b/i;

const defaultDeniedRuntimeBehavior = [
  "container.start.execute",
  "container.build.execute",
  "container.pull.execute",
  "container.run.execute",
  "container.privileged.run",
  "container.host_mount.write",
  "container.host_network.open",
  "container.docker_socket.mount",
  "container.secret.inject",
  "host.mutation.execute",
];

const defaultRequiredApprovals = [
  "container.sandbox.policy_review",
  "container.resource_limit.approval",
  "container.artifact_output.approval",
];

export const defaultContainerPacket = containerPacket({
  packet_kind: "sandbox_test",
  summary: "source-only container packet for isolated tests builds and package trials",
  image_ref: "oci:source-only-project-test-base",
  command_ref: "command_ref:package-test-command-source-only",
  resource_limits: {
    cpu_cores: 2,
    memory_mb: 4096,
    disk_mb: 8192,
    pids: 256,
    runtime_seconds: 900,
  },
  mount_rules: [
    {
      mount_type: "workspace_overlay",
      target: "/workspace",
      source_ref: "repo:working-tree-source-ref-only",
      readonly: false,
      host_mutation_allowed: false,
    },
    {
      mount_type: "tmpfs",
      target: "/tmp",
      source_ref: null,
      readonly: false,
      host_mutation_allowed: false,
    },
    {
      mount_type: "artifact_output",
      target: "/artifacts",
      source_ref: "artifact:ephemeral-output-directory",
      readonly: false,
      host_mutation_allowed: false,
    },
  ],
  network_rules: {
    profile: "disabled",
    outbound_allowlist: [],
    inbound_ports: [],
    dns_allowed: false,
  },
  artifact_outputs: [
    {
      name: "test_logs",
      path: "/artifacts/test-logs",
      retention: "operator_review",
      required: true,
    },
    {
      name: "result_summary",
      path: "/artifacts/result-summary.json",
      retention: "audit_artifact",
      required: true,
    },
  ],
  boundaries: {
    no_secrets: true,
    no_host_mutation: true,
    no_privileged: true,
    no_host_network: true,
    no_docker_socket: true,
    no_root: true,
  },
  denied_runtime_behavior: defaultDeniedRuntimeBehavior,
  required_approvals: defaultRequiredApprovals,
  source_refs: ["ticket:BP-0089: source-only container packet contract"],
});

export function createContainerPacket(input: unknown = {}): ContainerPacketResult {
  const normalized = normalizeContainerPacketRequest(input);

  if (!normalized.ok) {
    return failContainerPacket(normalized.errors);
  }

  return {
    ok: true,
    container_packet: {
      contract_id: containerPacketContract.contract_id,
      container_packet_version: containerPacketContract.container_packet_version,
      packet_kinds: [...containerPacketContract.packet_kinds],
      container_packet: normalized.container_packet,
      resource_limits: normalized.container_packet.resource_limits,
      mount_rules: normalized.container_packet.mount_rules,
      network_rules: normalized.container_packet.network_rules,
      artifact_outputs: normalized.container_packet.artifact_outputs,
      boundaries: normalized.container_packet.boundaries,
      denied_runtime_behavior: normalized.container_packet.denied_runtime_behavior,
      required_approvals: normalized.container_packet.required_approvals,
      source_refs: sourceRefs(normalized.source_refs),
      live_container_execution_allowed: false,
      side_effects: [],
    },
    errors: [],
    side_effects: [],
  };
}

function normalizeContainerPacketRequest(
  input: unknown,
): NormalizedContainerPacketRequest {
  if (!isPlainObject(input)) {
    return {
      ok: false,
      errors: [
        containerError(
          "container_packet.invalid_request",
          "",
          "Container packet request must be an object.",
        ),
      ],
    };
  }

  const errors: ContainerPacketError[] = [];
  for (const key of Object.keys(input)) {
    if (!requestKeys.has(key)) {
      errors.push(
        containerError(
          "container_packet.unexpected_field",
          jsonPointer(key),
          "Unexpected container packet request field.",
        ),
      );
    }
  }

  if (
    Object.hasOwn(input, "container_packet_version") &&
    input.container_packet_version !== containerPacketContract.container_packet_version
  ) {
    errors.push(
      containerError(
        "container_packet.invalid_version",
        "/container_packet_version",
        "Container packet version is unsupported.",
      ),
    );
  }

  const packet =
    Object.hasOwn(input, "container_packet") && input.container_packet !== undefined
      ? normalizeContainerPacket(input.container_packet, errors)
      : defaultContainerPacket;
  const refs = Object.hasOwn(input, "source_refs")
    ? normalizeSourceRefs(input.source_refs, "/source_refs", errors)
    : [];

  if (
    Object.hasOwn(input, "live_container_execution_allowed") &&
    input.live_container_execution_allowed !== false
  ) {
    errors.push(
      containerError(
        "container_packet.live_execution_forbidden",
        "/live_container_execution_allowed",
        "Container packet contract cannot enable live container execution.",
      ),
    );
  }

  if (
    Object.hasOwn(input, "side_effects") &&
    (!Array.isArray(input.side_effects) || input.side_effects.length !== 0)
  ) {
    errors.push(
      containerError(
        "container_packet.side_effects_forbidden",
        "/side_effects",
        "Container packet contract must preserve side_effects: [].",
      ),
    );
  }

  if (errors.length > 0) {
    return { ok: false, errors: dedupeErrors(errors) };
  }

  return { ok: true, container_packet: packet, source_refs: refs };
}

function normalizeContainerPacket(
  value: unknown,
  errors: ContainerPacketError[],
): ContainerPacketEvidence {
  const path = "/container_packet";
  if (!isPlainObject(value)) {
    errors.push(
      containerError(
        "container_packet.packet_required",
        path,
        "Container packet definition is required.",
      ),
    );
    return defaultContainerPacket;
  }

  for (const key of Object.keys(value)) {
    if (!packetKeys.has(key)) {
      errors.push(
        containerError(
          "container_packet.unexpected_field",
          `${path}/${escapeJsonPointerSegment(key)}`,
          "Unexpected container packet definition field.",
        ),
      );
    }
  }

  if (
    typeof value.packet_kind !== "string" ||
    !packetKinds.has(value.packet_kind as ContainerPacketKind)
  ) {
    errors.push(
      containerError(
        "container_packet.invalid_packet_kind",
        `${path}/packet_kind`,
        "Container packet kind is unsupported.",
      ),
    );
  }

  if (typeof value.summary !== "string" || !safeString(value.summary)) {
    errors.push(
      containerError(
        "container_packet.invalid_packet",
        `${path}/summary`,
        "Container packet summary must be a safe non-secret string.",
      ),
    );
  }

  if (typeof value.image_ref !== "string" || !safeString(value.image_ref)) {
    errors.push(
      containerError(
        "container_packet.invalid_packet",
        `${path}/image_ref`,
        "Container image_ref must be a safe source reference, not a live pull.",
      ),
    );
  }

  if (typeof value.command_ref !== "string" || !safeString(value.command_ref)) {
    errors.push(
      containerError(
        "container_packet.invalid_packet",
        `${path}/command_ref`,
        "Container command_ref must be a safe source reference.",
      ),
    );
  }

  const resourceLimits = normalizeResourceLimits(
    value.resource_limits,
    `${path}/resource_limits`,
    errors,
  );
  const mountRules = normalizeMountRules(
    value.mount_rules,
    `${path}/mount_rules`,
    errors,
  );
  const networkRules = normalizeNetworkRules(
    value.network_rules,
    `${path}/network_rules`,
    errors,
  );
  const artifactOutputs = normalizeArtifactOutputs(
    value.artifact_outputs,
    `${path}/artifact_outputs`,
    errors,
  );
  const boundaries = normalizeBoundaries(
    value.boundaries,
    `${path}/boundaries`,
    errors,
  );
  const deniedRuntimeBehavior = normalizeRuntimeBehaviors(
    value.denied_runtime_behavior ?? defaultDeniedRuntimeBehavior,
    `${path}/denied_runtime_behavior`,
    errors,
  );
  const requiredApprovals = normalizeApprovals(
    value.required_approvals ?? defaultRequiredApprovals,
    `${path}/required_approvals`,
    errors,
  );
  const refs = normalizeSourceRefs(value.source_refs, `${path}/source_refs`, errors);

  if (
    Object.hasOwn(value, "secret_refs") &&
    (!Array.isArray(value.secret_refs) || value.secret_refs.length !== 0)
  ) {
    errors.push(
      containerError(
        "container_packet.secret_value_forbidden",
        `${path}/secret_refs`,
        "Container packet cannot carry secrets or secret values.",
      ),
    );
  }

  if (
    Object.hasOwn(value, "live_container_execution_allowed") &&
    value.live_container_execution_allowed !== false
  ) {
    errors.push(
      containerError(
        "container_packet.live_execution_forbidden",
        `${path}/live_container_execution_allowed`,
        "Container packet definition cannot enable live execution.",
      ),
    );
  }

  if (
    Object.hasOwn(value, "side_effects") &&
    (!Array.isArray(value.side_effects) || value.side_effects.length !== 0)
  ) {
    errors.push(
      containerError(
        "container_packet.side_effects_forbidden",
        `${path}/side_effects`,
        "Container packet definition must preserve side_effects: [].",
      ),
    );
  }

  if (
    typeof value.packet_kind === "string" &&
    packetKinds.has(value.packet_kind as ContainerPacketKind) &&
    typeof value.summary === "string" &&
    safeString(value.summary) &&
    typeof value.image_ref === "string" &&
    safeString(value.image_ref) &&
    typeof value.command_ref === "string" &&
    safeString(value.command_ref) &&
    mountRules.length > 0 &&
    artifactOutputs.length > 0 &&
    refs.length > 0
  ) {
    return {
      packet_kind: value.packet_kind as ContainerPacketKind,
      summary: value.summary,
      image_ref: value.image_ref,
      command_ref: value.command_ref,
      resource_limits: resourceLimits,
      mount_rules: mountRules,
      network_rules: networkRules,
      artifact_outputs: artifactOutputs,
      boundaries,
      denied_runtime_behavior: deniedRuntimeBehavior,
      required_approvals: requiredApprovals,
      source_refs: refs,
      live_container_execution_allowed: false,
      side_effects: [],
    };
  }

  return defaultContainerPacket;
}

function normalizeResourceLimits(
  value: unknown,
  path: string,
  errors: ContainerPacketError[],
): ContainerResourceLimitsEvidence {
  if (!isPlainObject(value)) {
    errors.push(
      containerError(
        "container_packet.invalid_resource_limit",
        path,
        "Container packet requires explicit resource limits.",
      ),
    );
    return defaultContainerPacket.resource_limits;
  }

  for (const key of Object.keys(value)) {
    if (!resourceLimitKeys.has(key)) {
      errors.push(
        containerError(
          "container_packet.unexpected_field",
          `${path}/${escapeJsonPointerSegment(key)}`,
          "Unexpected resource limit field.",
        ),
      );
    }
  }

  const limits: ContainerResourceLimitsEvidence = {
    cpu_cores: normalizeLimit(value.cpu_cores, `${path}/cpu_cores`, 1, 16, errors),
    memory_mb: normalizeLimit(value.memory_mb, `${path}/memory_mb`, 128, 65536, errors),
    disk_mb: normalizeLimit(value.disk_mb, `${path}/disk_mb`, 128, 262144, errors),
    pids: normalizeLimit(value.pids, `${path}/pids`, 16, 4096, errors),
    runtime_seconds: normalizeLimit(
      value.runtime_seconds,
      `${path}/runtime_seconds`,
      1,
      7200,
      errors,
    ),
  };
  return limits;
}

function normalizeMountRules(
  value: unknown,
  path: string,
  errors: ContainerPacketError[],
): ContainerMountRuleEvidence[] {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push(
      containerError(
        "container_packet.invalid_mount_rule",
        path,
        "Container packet requires explicit mount rules.",
      ),
    );
    return [];
  }

  const rules: ContainerMountRuleEvidence[] = [];
  value.forEach((rule, index) => {
    const rulePath = `${path}/${index}`;
    if (!isPlainObject(rule)) {
      errors.push(
        containerError(
          "container_packet.invalid_mount_rule",
          rulePath,
          "Container mount rule must be an object.",
        ),
      );
      return;
    }

    for (const key of Object.keys(rule)) {
      if (!mountRuleKeys.has(key)) {
        errors.push(
          containerError(
            "container_packet.unexpected_field",
            `${rulePath}/${escapeJsonPointerSegment(key)}`,
            "Unexpected mount rule field.",
          ),
        );
      }
    }

    if (
      typeof rule.mount_type !== "string" ||
      !mountTypes.has(rule.mount_type as ContainerMountType)
    ) {
      errors.push(
        containerError(
          hostMountPattern.test(String(rule.mount_type))
            ? "container_packet.host_mount_forbidden"
            : "container_packet.invalid_mount_rule",
          `${rulePath}/mount_type`,
          "Container mount type must be a safe ephemeral mount type.",
        ),
      );
    }

    if (typeof rule.target !== "string" || !safePath(rule.target)) {
      errors.push(
        containerError(
          "container_packet.invalid_mount_rule",
          `${rulePath}/target`,
          "Container mount target must be a safe container path.",
        ),
      );
    }

    if (
      typeof rule.source_ref === "string" &&
      (!safeString(rule.source_ref) || hostMountPattern.test(rule.source_ref))
    ) {
      errors.push(
        containerError(
          "container_packet.host_mount_forbidden",
          `${rulePath}/source_ref`,
          "Container mount source_ref cannot point at host paths or host sockets.",
        ),
      );
    }

    if (typeof rule.readonly !== "boolean") {
      errors.push(
        containerError(
          "container_packet.invalid_mount_rule",
          `${rulePath}/readonly`,
          "Container mount readonly flag must be boolean.",
        ),
      );
    }

    if (rule.host_mutation_allowed !== false) {
      errors.push(
        containerError(
          "container_packet.host_mutation_forbidden",
          `${rulePath}/host_mutation_allowed`,
          "Container mounts cannot allow host mutation.",
        ),
      );
    }

    if (
      typeof rule.mount_type === "string" &&
      mountTypes.has(rule.mount_type as ContainerMountType) &&
      typeof rule.target === "string" &&
      safePath(rule.target) &&
      (rule.source_ref === undefined ||
        rule.source_ref === null ||
        (typeof rule.source_ref === "string" &&
          safeString(rule.source_ref) &&
          !hostMountPattern.test(rule.source_ref))) &&
      typeof rule.readonly === "boolean" &&
      rule.host_mutation_allowed === false
    ) {
      rules.push({
        mount_type: rule.mount_type as ContainerMountType,
        target: rule.target,
        source_ref: typeof rule.source_ref === "string" ? rule.source_ref : null,
        readonly: rule.readonly,
        host_mutation_allowed: false,
      });
    }
  });

  return rules;
}

function normalizeNetworkRules(
  value: unknown,
  path: string,
  errors: ContainerPacketError[],
): ContainerNetworkRulesEvidence {
  if (!isPlainObject(value)) {
    errors.push(
      containerError(
        "container_packet.network_open_forbidden",
        path,
        "Container network rules must explicitly disable network access.",
      ),
    );
    return defaultContainerPacket.network_rules;
  }

  for (const key of Object.keys(value)) {
    if (!networkRuleKeys.has(key)) {
      errors.push(
        containerError(
          "container_packet.unexpected_field",
          `${path}/${escapeJsonPointerSegment(key)}`,
          "Unexpected network rule field.",
        ),
      );
    }
  }

  if (
    value.profile !== "disabled" ||
    !Array.isArray(value.outbound_allowlist) ||
    value.outbound_allowlist.length !== 0 ||
    !Array.isArray(value.inbound_ports) ||
    value.inbound_ports.length !== 0 ||
    value.dns_allowed !== false
  ) {
    errors.push(
      containerError(
        "container_packet.network_open_forbidden",
        path,
        "Container packet contract only permits disabled network rules.",
      ),
    );
  }

  return {
    profile: "disabled",
    outbound_allowlist: [],
    inbound_ports: [],
    dns_allowed: false,
  };
}

function normalizeArtifactOutputs(
  value: unknown,
  path: string,
  errors: ContainerPacketError[],
): ContainerArtifactOutputEvidence[] {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push(
      containerError(
        "container_packet.invalid_artifact_output",
        path,
        "Container packet requires artifact output expectations.",
      ),
    );
    return [];
  }

  const outputs: ContainerArtifactOutputEvidence[] = [];
  value.forEach((output, index) => {
    const outputPath = `${path}/${index}`;
    if (!isPlainObject(output)) {
      errors.push(
        containerError(
          "container_packet.invalid_artifact_output",
          outputPath,
          "Container artifact output must be an object.",
        ),
      );
      return;
    }

    for (const key of Object.keys(output)) {
      if (!artifactOutputKeys.has(key)) {
        errors.push(
          containerError(
            "container_packet.unexpected_field",
            `${outputPath}/${escapeJsonPointerSegment(key)}`,
            "Unexpected artifact output field.",
          ),
        );
      }
    }

    if (typeof output.name !== "string" || !safeString(output.name)) {
      errors.push(
        containerError(
          "container_packet.invalid_artifact_output",
          `${outputPath}/name`,
          "Artifact output name must be safe non-secret text.",
        ),
      );
    }

    if (typeof output.path !== "string" || !safePath(output.path)) {
      errors.push(
        containerError(
          "container_packet.invalid_artifact_output",
          `${outputPath}/path`,
          "Artifact output path must be a safe container path.",
        ),
      );
    }

    if (
      typeof output.retention !== "string" ||
      !artifactRetentions.has(output.retention)
    ) {
      errors.push(
        containerError(
          "container_packet.invalid_artifact_output",
          `${outputPath}/retention`,
          "Artifact output retention is unsupported.",
        ),
      );
    }

    if (typeof output.required !== "boolean") {
      errors.push(
        containerError(
          "container_packet.invalid_artifact_output",
          `${outputPath}/required`,
          "Artifact output required flag must be boolean.",
        ),
      );
    }

    if (
      typeof output.name === "string" &&
      safeString(output.name) &&
      typeof output.path === "string" &&
      safePath(output.path) &&
      typeof output.retention === "string" &&
      artifactRetentions.has(output.retention) &&
      typeof output.required === "boolean"
    ) {
      outputs.push({
        name: output.name,
        path: output.path,
        retention: output.retention as ContainerArtifactOutputEvidence["retention"],
        required: output.required,
      });
    }
  });

  return outputs;
}

function normalizeBoundaries(
  value: unknown,
  path: string,
  errors: ContainerPacketError[],
): ContainerBoundaryEvidence {
  if (!isPlainObject(value)) {
    errors.push(
      containerError(
        "container_packet.secret_boundary_required",
        path,
        "Container packet requires explicit no-secret and no-host-mutation boundaries.",
      ),
    );
    return defaultContainerPacket.boundaries;
  }

  for (const key of Object.keys(value)) {
    if (!boundaryKeys.has(key)) {
      errors.push(
        containerError(
          "container_packet.unexpected_field",
          `${path}/${escapeJsonPointerSegment(key)}`,
          "Unexpected container boundary field.",
        ),
      );
    }
  }

  const boundaries = {
    no_secrets: normalizeBoundary(
      value.no_secrets,
      `${path}/no_secrets`,
      "container_packet.secret_boundary_required",
      "Container packet must explicitly forbid secrets.",
      errors,
    ),
    no_host_mutation: normalizeBoundary(
      value.no_host_mutation,
      `${path}/no_host_mutation`,
      "container_packet.host_mutation_forbidden",
      "Container packet must explicitly forbid host mutation.",
      errors,
    ),
    no_privileged: normalizeBoundary(
      value.no_privileged,
      `${path}/no_privileged`,
      "container_packet.privileged_container_forbidden",
      "Container packet must explicitly forbid privileged containers.",
      errors,
    ),
    no_host_network: normalizeBoundary(
      value.no_host_network,
      `${path}/no_host_network`,
      "container_packet.network_open_forbidden",
      "Container packet must explicitly forbid host networking.",
      errors,
    ),
    no_docker_socket: normalizeBoundary(
      value.no_docker_socket,
      `${path}/no_docker_socket`,
      "container_packet.host_mount_forbidden",
      "Container packet must explicitly forbid Docker socket mounts.",
      errors,
    ),
    no_root: normalizeBoundary(
      value.no_root,
      `${path}/no_root`,
      "container_packet.privileged_container_forbidden",
      "Container packet must explicitly forbid root execution.",
      errors,
    ),
  };

  return boundaries;
}

function normalizeRuntimeBehaviors(
  value: unknown,
  path: string,
  errors: ContainerPacketError[],
): string[] {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push(
      containerError(
        "container_packet.invalid_packet",
        path,
        "Container packet requires denied runtime behavior.",
      ),
    );
    return [];
  }

  const behaviors: string[] = [];
  value.forEach((behavior, index) => {
    const behaviorPath = `${path}/${index}`;
    if (
      typeof behavior !== "string" ||
      !safeCapability(behavior) ||
      !runtimeMutationPattern.test(behavior)
    ) {
      errors.push(
        containerError(
          "container_packet.invalid_packet",
          behaviorPath,
          "Denied runtime behavior must name safe blocked runtime authority.",
        ),
      );
      return;
    }
    behaviors.push(behavior);
  });
  return uniqueStrings(behaviors);
}

function normalizeApprovals(
  value: unknown,
  path: string,
  errors: ContainerPacketError[],
): string[] {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push(
      containerError(
        "container_packet.invalid_packet",
        path,
        "Container packet requires policy approval gates.",
      ),
    );
    return [];
  }

  const approvals: string[] = [];
  value.forEach((approval, index) => {
    const approvalPath = `${path}/${index}`;
    if (typeof approval !== "string" || !safeCapability(approval)) {
      errors.push(
        containerError(
          "container_packet.invalid_packet",
          approvalPath,
          "Container approval gate must be a safe policy gate string.",
        ),
      );
      return;
    }
    approvals.push(approval);
  });
  return uniqueStrings(approvals);
}

function normalizeSourceRefs(
  value: unknown,
  path: string,
  errors: ContainerPacketError[],
): string[] {
  if (!Array.isArray(value)) {
    errors.push(
      containerError(
        "container_packet.invalid_source_ref",
        path,
        "Container packet source_refs must be an array.",
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
        containerError(
          "container_packet.invalid_source_ref",
          sourcePath,
          "Container packet source ref must be an object.",
        ),
      );
      return;
    }

    for (const key of Object.keys(source)) {
      if (!sourceKeys.has(key)) {
        errors.push(
          containerError(
            "container_packet.unexpected_field",
            `${sourcePath}/${escapeJsonPointerSegment(key)}`,
            "Unexpected container packet source ref field.",
          ),
        );
      }
    }

    if (typeof source.source_ref !== "string" || !safeString(source.source_ref)) {
      errors.push(
        containerError(
          "container_packet.invalid_source_ref",
          `${sourcePath}/source_ref`,
          "Container packet source_ref must be a safe non-secret string.",
        ),
      );
    }

    if (typeof source.summary !== "string" || !safeString(source.summary)) {
      errors.push(
        containerError(
          "container_packet.invalid_source_ref",
          `${sourcePath}/summary`,
          "Container packet source summary must be a safe non-secret string.",
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

function normalizeLimit(
  value: unknown,
  path: string,
  min: number,
  max: number,
  errors: ContainerPacketError[],
): number {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < min ||
    value > max
  ) {
    errors.push(
      containerError(
        "container_packet.invalid_resource_limit",
        path,
        `Container resource limit must be an integer from ${min} to ${max}.`,
      ),
    );
    return min;
  }
  return value;
}

function normalizeBoundary(
  value: unknown,
  path: string,
  code: ContainerPacketErrorCode,
  message: string,
  errors: ContainerPacketError[],
): true {
  if (value !== true) {
    errors.push(containerError(code, path, message));
  }
  return true;
}

function containerPacket(
  input: Omit<
    ContainerPacketEvidence,
    "live_container_execution_allowed" | "side_effects"
  >,
): ContainerPacketEvidence {
  return {
    packet_kind: input.packet_kind,
    summary: input.summary,
    image_ref: input.image_ref,
    command_ref: input.command_ref,
    resource_limits: input.resource_limits,
    mount_rules: input.mount_rules,
    network_rules: input.network_rules,
    artifact_outputs: input.artifact_outputs,
    boundaries: input.boundaries,
    denied_runtime_behavior: uniqueStrings(input.denied_runtime_behavior),
    required_approvals: uniqueStrings(input.required_approvals),
    source_refs: uniqueStrings(input.source_refs),
    live_container_execution_allowed: false,
    side_effects: [],
  };
}

function sourceRefs(sourceRefsInput: string[]): string[] {
  return uniqueStrings([
    ...sourceRefsInput,
    ...defaultContainerPacket.source_refs,
    ...containerPacketContract.source_docs.map((doc) => `doc:${doc}`),
  ]);
}

function failContainerPacket(errors: ContainerPacketError[]): ContainerPacketResult {
  return {
    ok: false,
    container_packet: null,
    errors,
    raw_input_content: "withheld",
    side_effects: [],
  };
}

function containerError(
  code: ContainerPacketErrorCode,
  path: string,
  message: string,
): ContainerPacketError {
  return { code, path, message, severity: "error" };
}

function safeCapability(value: string): boolean {
  return capabilityPattern.test(value) && !capabilitySecretValuePattern.test(value);
}

function safePath(value: string): boolean {
  return (
    pathPattern.test(value) &&
    !value.includes("..") &&
    !hostMountPattern.test(value) &&
    !secretLikePattern.test(value)
  );
}

function safeString(value: string): boolean {
  return (
    safeStringPattern.test(value) &&
    !secretLikePattern.test(value) &&
    !privilegedPattern.test(value) &&
    !value.toLowerCase().includes("rm -rf")
  );
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)].filter((value) => value.length > 0).sort();
}

function dedupeErrors(errors: ContainerPacketError[]): ContainerPacketError[] {
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
