export const SUBSTRATE_TAXONOMY_STATUS = "contract_only";

export const substrateTaxonomyContract = {
  contract_id: "lnsat.platform.substrate_taxonomy.v0_1",
  authority: ["@lnsat/packets", "source-backed-substrate-taxonomy"],
  taxonomy_version: "0.1",
  required_substrate_kinds: [
    "repos",
    "hosts",
    "containers",
    "services",
    "databases",
    "queues",
    "tunnels",
    "cloud_accounts",
    "agents",
    "models",
  ],
  control_modes: [
    "observation",
    "proposal",
    "approval_gated_mutation",
    "forbidden_mutation",
  ],
  source_docs: [
    "docs/architecture/PACKET_MODEL.md",
    "docs/architecture/POLICY_AND_AUDIT.md",
    "docs/architecture/SYSTEM_ARCHITECTURE.md",
    "docs/architecture/SUBSTRATES_AND_NODES.md",
    "docs/architecture/DATA_MODEL.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
  ],
  live_mutation_allowed: false,
  side_effects: [],
  status: "contract_only",
} as const;

export type SubstrateKind =
  (typeof substrateTaxonomyContract.required_substrate_kinds)[number];

export type SubstrateControlMode =
  (typeof substrateTaxonomyContract.control_modes)[number];

export type SubstrateTaxonomySourceInput = {
  source_ref: string;
  summary: string;
};

export type SubstrateModeBoundaryInput = {
  controls: string[];
  policy_gate?: string;
  rationale: string;
};

export type SubstrateKindDefinitionInput = {
  kind: SubstrateKind;
  summary: string;
  mode_boundaries: Record<SubstrateControlMode, SubstrateModeBoundaryInput>;
  source_refs: SubstrateTaxonomySourceInput[];
};

export type SubstrateModeBoundaryEvidence = {
  mode: SubstrateControlMode;
  controls: string[];
  policy_gate: string | null;
  rationale: string;
  live_mutation_allowed: false;
};

export type SubstrateKindEvidence = {
  kind: SubstrateKind;
  summary: string;
  mode_boundaries: SubstrateModeBoundaryEvidence[];
  denied_controls: string[];
  required_policy_gates: string[];
  source_refs: string[];
};

export type SubstrateKindMap = Record<SubstrateKind, SubstrateKindEvidence>;

export type SubstrateTaxonomyRequest = {
  taxonomy_version?: typeof substrateTaxonomyContract.taxonomy_version;
  substrate_map?: Partial<
    Record<SubstrateKind, SubstrateKindDefinitionInput | SubstrateKindEvidence>
  >;
  source_refs?: SubstrateTaxonomySourceInput[];
  live_mutation_allowed?: false;
  side_effects?: [];
};

export type SubstrateTaxonomyErrorCode =
  | "substrate_taxonomy.invalid_request"
  | "substrate_taxonomy.unexpected_field"
  | "substrate_taxonomy.invalid_taxonomy_version"
  | "substrate_taxonomy.substrate_map_required"
  | "substrate_taxonomy.unknown_substrate_kind"
  | "substrate_taxonomy.substrate_kind_required"
  | "substrate_taxonomy.invalid_substrate_kind"
  | "substrate_taxonomy.invalid_mode_boundary"
  | "substrate_taxonomy.mode_boundary_required"
  | "substrate_taxonomy.unsafe_substrate_authority"
  | "substrate_taxonomy.policy_gate_required"
  | "substrate_taxonomy.invalid_source_ref"
  | "substrate_taxonomy.live_mutation_forbidden"
  | "substrate_taxonomy.side_effects_forbidden";

export type SubstrateTaxonomyError = {
  code: SubstrateTaxonomyErrorCode;
  path: string;
  message: string;
  severity: "error";
};

export type SubstrateTaxonomyEvidence = {
  contract_id: typeof substrateTaxonomyContract.contract_id;
  taxonomy_version: typeof substrateTaxonomyContract.taxonomy_version;
  substrate_kind_map: SubstrateKindMap;
  substrate_kinds: SubstrateKind[];
  control_modes: SubstrateControlMode[];
  denied_controls: string[];
  required_policy_gates: string[];
  source_refs: string[];
  live_mutation_allowed: false;
  side_effects: [];
};

export type SubstrateTaxonomyResult =
  | {
      ok: true;
      taxonomy: SubstrateTaxonomyEvidence;
      errors: [];
      side_effects: [];
    }
  | {
      ok: false;
      taxonomy: null;
      errors: SubstrateTaxonomyError[];
      raw_input_content: "withheld";
      side_effects: [];
    };

type NormalizedSubstrateTaxonomyRequest =
  | {
      ok: true;
      substrate_map: SubstrateKindMap;
      source_refs: string[];
    }
  | {
      ok: false;
      errors: SubstrateTaxonomyError[];
    };

const requestKeys = new Set([
  "taxonomy_version",
  "substrate_map",
  "source_refs",
  "live_mutation_allowed",
  "side_effects",
]);
const substrateDefinitionKeys = new Set([
  "kind",
  "summary",
  "mode_boundaries",
  "source_refs",
]);
const boundaryKeys = new Set([
  "mode",
  "controls",
  "policy_gate",
  "rationale",
  "live_mutation_allowed",
]);
const sourceKeys = new Set(["source_ref", "summary"]);
const substrateKinds = new Set<SubstrateKind>(
  substrateTaxonomyContract.required_substrate_kinds,
);
const controlModes = new Set<SubstrateControlMode>(
  substrateTaxonomyContract.control_modes,
);
const safeStringPattern = /^[\w .,:;@/()[\]#_+=-]{3,240}$/;
const controlPattern = /^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*){1,5}$/;
const secretLikePattern =
  /(postgres:\/\/|mysql:\/\/|mongodb:\/\/|DATABASE_URL|SECRET|TOKEN|PASSWORD|PRIVATE KEY|sk-[A-Za-z0-9]|secret:)/i;
const forbiddenAuthorityPattern =
  /\b(root|sudo|shell|ssh\.raw|secret\.read|credential\.read|write|delete|drop|destroy|restart\.execute|deploy\.execute|dns\.write|cloudflare\.write|database\.write|queue\.purge|docker\.socket|docker_socket|privileged|unrestricted|node_agent\.exec)\b/i;
const forbiddenMutationPattern =
  /\b(write|delete|drop|destroy|restart\.execute|deploy\.execute|dns\.write|cloudflare\.write|database\.write|queue\.purge|ssh\.raw|root|sudo|secret\.read|docker\.socket|docker_socket|privileged|unrestricted|node_agent\.exec)\b/i;

export const defaultSubstrateKindMap = {
  repos: substrateKind("repos", {
    summary: "source repositories, mirrors, worktrees, branches, and patch zones",
    observation: ["repo.status.read", "repo.diff.read", "repo.refs.read"],
    proposal: ["repo.patch.propose", "repo.branch.plan"],
    approval_gated_mutation: ["repo.branch.request", "repo.merge.request"],
    forbidden_mutation: ["repo.force_push.write", "repo.history.delete"],
  }),
  hosts: substrateKind("hosts", {
    summary: "bare metal or virtual hosts, launchd/systemd units, and host facts",
    observation: ["host.status.read", "host.process.read", "host.disk.read"],
    proposal: ["host.diagnostic.propose", "host.runbook.propose"],
    approval_gated_mutation: ["host.runbook.request"],
    forbidden_mutation: ["host.root.shell", "host.package.write"],
  }),
  containers: substrateKind("containers", {
    summary: "container images, sandboxes, compose stacks, and runtime boundaries",
    observation: ["container.status.read", "container.logs.read"],
    proposal: ["container.build.propose", "container.run.plan"],
    approval_gated_mutation: ["container.sandbox.request"],
    forbidden_mutation: ["container.privileged.run", "container.docker_socket.mount"],
  }),
  services: substrateKind("services", {
    summary: "application services, health checks, service configs, and restarts",
    observation: ["service.status.read", "service.logs.read"],
    proposal: ["service.config.propose", "service.restart.plan"],
    approval_gated_mutation: ["service.restart.request"],
    forbidden_mutation: ["service.restart.execute", "service.config.write"],
  }),
  databases: substrateKind("databases", {
    summary: "schemas, migrations, read-only queries, and data stores",
    observation: ["database.schema.read", "database.health.read"],
    proposal: ["database.migration.propose", "database.query.plan"],
    approval_gated_mutation: ["database.migration.request"],
    forbidden_mutation: ["database.write", "database.drop"],
  }),
  queues: substrateKind("queues", {
    summary: "job queues, topics, pending counts, and worker visibility",
    observation: ["queue.status.read", "queue.depth.read"],
    proposal: ["queue.worker.plan", "queue.replay.propose"],
    approval_gated_mutation: ["queue.replay.request"],
    forbidden_mutation: ["queue.purge", "queue.message.write"],
  }),
  tunnels: substrateKind("tunnels", {
    summary: "network tunnels, public routes, ingress state, and exposure plans",
    observation: ["tunnel.status.read", "tunnel.route.read"],
    proposal: ["tunnel.route.propose", "tunnel.exposure.plan"],
    approval_gated_mutation: ["tunnel.route.request"],
    forbidden_mutation: ["tunnel.route.write", "tunnel.secret.read"],
  }),
  cloud_accounts: substrateKind("cloud_accounts", {
    summary: "cloud accounts, projects, managed services, billing, and DNS scope",
    observation: ["cloud.account.read", "cloud.resource.read"],
    proposal: ["cloud.change.propose", "cloud.cost.plan"],
    approval_gated_mutation: ["cloud.change.request"],
    forbidden_mutation: ["cloud.delete", "cloudflare.write"],
  }),
  agents: substrateKind("agents", {
    summary: "human supervised seats, coding agents, workers, and MCP clients",
    observation: ["agent.status.read", "agent.session.read"],
    proposal: ["agent.task.propose", "agent.capability.plan"],
    approval_gated_mutation: ["agent.capability.request"],
    forbidden_mutation: ["agent.unrestricted.enable", "node_agent.exec"],
  }),
  models: substrateKind("models", {
    summary: "local models, hosted models, routing profiles, and availability",
    observation: ["model.status.read", "model.catalog.read"],
    proposal: ["model.route.propose", "model.budget.plan"],
    approval_gated_mutation: ["model.route.request"],
    forbidden_mutation: ["model.secret.read", "model.billing.write"],
  }),
} satisfies Record<SubstrateKind, SubstrateKindEvidence>;

export function createSubstrateTaxonomy(input: unknown = {}): SubstrateTaxonomyResult {
  const normalized = normalizeSubstrateTaxonomyRequest(input);

  if (!normalized.ok) {
    return failSubstrateTaxonomy(normalized.errors);
  }

  const deniedControls = uniqueStrings(
    Object.values(normalized.substrate_map).flatMap((kind) => kind.denied_controls),
  );
  const requiredPolicyGates = uniqueStrings(
    Object.values(normalized.substrate_map).flatMap(
      (kind) => kind.required_policy_gates,
    ),
  );

  return {
    ok: true,
    taxonomy: {
      contract_id: substrateTaxonomyContract.contract_id,
      taxonomy_version: substrateTaxonomyContract.taxonomy_version,
      substrate_kind_map: normalized.substrate_map,
      substrate_kinds: [...substrateTaxonomyContract.required_substrate_kinds],
      control_modes: [...substrateTaxonomyContract.control_modes],
      denied_controls: deniedControls,
      required_policy_gates: requiredPolicyGates,
      source_refs: sourceRefs(normalized.source_refs),
      live_mutation_allowed: false,
      side_effects: [],
    },
    errors: [],
    side_effects: [],
  };
}

function normalizeSubstrateTaxonomyRequest(
  input: unknown,
): NormalizedSubstrateTaxonomyRequest {
  if (!isPlainObject(input)) {
    return {
      ok: false,
      errors: [
        taxonomyError(
          "substrate_taxonomy.invalid_request",
          "",
          "Substrate taxonomy request must be an object.",
        ),
      ],
    };
  }

  const errors: SubstrateTaxonomyError[] = [];
  for (const key of Object.keys(input)) {
    if (!requestKeys.has(key)) {
      errors.push(
        taxonomyError(
          "substrate_taxonomy.unexpected_field",
          jsonPointer(key),
          "Unexpected substrate taxonomy request field.",
        ),
      );
    }
  }

  if (
    Object.hasOwn(input, "taxonomy_version") &&
    input.taxonomy_version !== substrateTaxonomyContract.taxonomy_version
  ) {
    errors.push(
      taxonomyError(
        "substrate_taxonomy.invalid_taxonomy_version",
        "/taxonomy_version",
        "Substrate taxonomy version is unsupported.",
      ),
    );
  }

  const substrateMap =
    Object.hasOwn(input, "substrate_map") && input.substrate_map !== undefined
      ? normalizeSubstrateMap(input.substrate_map, errors)
      : defaultSubstrateKindMap;
  const refs = Object.hasOwn(input, "source_refs")
    ? normalizeSourceRefs(input.source_refs, "/source_refs", errors)
    : [];

  if (
    Object.hasOwn(input, "live_mutation_allowed") &&
    input.live_mutation_allowed !== false
  ) {
    errors.push(
      taxonomyError(
        "substrate_taxonomy.live_mutation_forbidden",
        "/live_mutation_allowed",
        "Substrate taxonomy cannot enable live mutation.",
      ),
    );
  }

  if (
    Object.hasOwn(input, "side_effects") &&
    (!Array.isArray(input.side_effects) || input.side_effects.length !== 0)
  ) {
    errors.push(
      taxonomyError(
        "substrate_taxonomy.side_effects_forbidden",
        "/side_effects",
        "Substrate taxonomy must preserve side_effects: [].",
      ),
    );
  }

  if (errors.length > 0) {
    return { ok: false, errors: dedupeErrors(errors) };
  }

  return { ok: true, substrate_map: substrateMap, source_refs: refs };
}

function normalizeSubstrateMap(
  value: unknown,
  errors: SubstrateTaxonomyError[],
): SubstrateKindMap {
  if (!isPlainObject(value)) {
    errors.push(
      taxonomyError(
        "substrate_taxonomy.substrate_map_required",
        "/substrate_map",
        "Substrate taxonomy requires a substrate map object.",
      ),
    );
    return defaultSubstrateKindMap;
  }

  for (const key of Object.keys(value)) {
    if (!substrateKinds.has(key as SubstrateKind)) {
      errors.push(
        taxonomyError(
          "substrate_taxonomy.unknown_substrate_kind",
          `/substrate_map/${escapeJsonPointerSegment(key)}`,
          "Substrate kind is unknown.",
        ),
      );
    }
  }

  const substrateMap = {} as SubstrateKindMap;
  for (const kind of substrateTaxonomyContract.required_substrate_kinds) {
    const definition = value[kind];
    const path = `/substrate_map/${kind}`;
    if (!isPlainObject(definition)) {
      errors.push(
        taxonomyError(
          "substrate_taxonomy.substrate_kind_required",
          path,
          `Substrate taxonomy requires ${kind} definition.`,
        ),
      );
      continue;
    }

    const evidence = normalizeSubstrateDefinition(kind, definition, errors);
    if (evidence !== null) {
      substrateMap[kind] = evidence;
    }
  }

  return substrateMap;
}

function normalizeSubstrateDefinition(
  expectedKind: SubstrateKind,
  definition: Record<string, unknown>,
  errors: SubstrateTaxonomyError[],
): SubstrateKindEvidence | null {
  const path = `/substrate_map/${expectedKind}`;
  for (const key of Object.keys(definition)) {
    if (
      !substrateDefinitionKeys.has(key) &&
      key !== "denied_controls" &&
      key !== "required_policy_gates"
    ) {
      errors.push(
        taxonomyError(
          "substrate_taxonomy.unexpected_field",
          `${path}/${escapeJsonPointerSegment(key)}`,
          "Unexpected substrate definition field.",
        ),
      );
    }
  }

  if (definition.kind !== expectedKind) {
    errors.push(
      taxonomyError(
        "substrate_taxonomy.invalid_substrate_kind",
        `${path}/kind`,
        "Substrate map key and kind value must match.",
      ),
    );
  }

  if (typeof definition.summary !== "string" || !safeString(definition.summary)) {
    errors.push(
      taxonomyError(
        "substrate_taxonomy.unsafe_substrate_authority",
        `${path}/summary`,
        "Substrate summary must be a safe non-secret string.",
      ),
    );
  }

  const boundaries = normalizeModeBoundaries(
    expectedKind,
    definition.mode_boundaries,
    `${path}/mode_boundaries`,
    errors,
  );
  const refs = normalizeSourceRefs(
    definition.source_refs,
    `${path}/source_refs`,
    errors,
  );

  if (
    definition.kind === expectedKind &&
    typeof definition.summary === "string" &&
    safeString(definition.summary) &&
    boundaries.length === substrateTaxonomyContract.control_modes.length &&
    refs.length > 0
  ) {
    return substrateEvidence(expectedKind, definition.summary, boundaries, refs);
  }

  return null;
}

function normalizeModeBoundaries(
  kind: SubstrateKind,
  value: unknown,
  path: string,
  errors: SubstrateTaxonomyError[],
): SubstrateModeBoundaryEvidence[] {
  const boundaryMap = Array.isArray(value)
    ? Object.fromEntries(
        value
          .filter(
            (boundary): boundary is Record<string, unknown> =>
              isPlainObject(boundary) && typeof boundary.mode === "string",
          )
          .map((boundary) => [boundary.mode, boundary]),
      )
    : value;

  if (!isPlainObject(boundaryMap)) {
    errors.push(
      taxonomyError(
        "substrate_taxonomy.invalid_mode_boundary",
        path,
        "Substrate taxonomy requires explicit mode boundaries.",
      ),
    );
    return [];
  }

  for (const key of Object.keys(boundaryMap)) {
    if (!controlModes.has(key as SubstrateControlMode)) {
      errors.push(
        taxonomyError(
          "substrate_taxonomy.unexpected_field",
          `${path}/${escapeJsonPointerSegment(key)}`,
          "Unexpected substrate control mode.",
        ),
      );
    }
  }

  const boundaries: SubstrateModeBoundaryEvidence[] = [];
  for (const mode of substrateTaxonomyContract.control_modes) {
    const boundary = boundaryMap[mode];
    const boundaryPath = `${path}/${mode}`;
    if (!isPlainObject(boundary)) {
      errors.push(
        taxonomyError(
          "substrate_taxonomy.mode_boundary_required",
          boundaryPath,
          `Substrate taxonomy requires ${mode} boundary.`,
        ),
      );
      continue;
    }

    for (const key of Object.keys(boundary)) {
      if (!boundaryKeys.has(key)) {
        errors.push(
          taxonomyError(
            "substrate_taxonomy.unexpected_field",
            `${boundaryPath}/${escapeJsonPointerSegment(key)}`,
            "Unexpected substrate mode boundary field.",
          ),
        );
      }
    }

    const controls = normalizeControls(
      kind,
      mode,
      boundary.controls,
      `${boundaryPath}/controls`,
      errors,
    );
    const policyGate = boundary.policy_gate;
    const rationale = boundary.rationale;

    if (Object.hasOwn(boundary, "mode") && boundary.mode !== mode) {
      errors.push(
        taxonomyError(
          "substrate_taxonomy.invalid_mode_boundary",
          `${boundaryPath}/mode`,
          "Substrate mode key and mode value must match.",
        ),
      );
    }

    if (
      Object.hasOwn(boundary, "live_mutation_allowed") &&
      boundary.live_mutation_allowed !== false
    ) {
      errors.push(
        taxonomyError(
          "substrate_taxonomy.live_mutation_forbidden",
          `${boundaryPath}/live_mutation_allowed`,
          "Substrate mode boundary cannot enable live mutation.",
        ),
      );
    }

    if (
      mode === "approval_gated_mutation" &&
      (typeof policyGate !== "string" || !safeString(policyGate))
    ) {
      errors.push(
        taxonomyError(
          "substrate_taxonomy.policy_gate_required",
          `${boundaryPath}/policy_gate`,
          "Approval-gated substrate mutation requires a safe policy_gate.",
        ),
      );
    }

    if (
      Object.hasOwn(boundary, "policy_gate") &&
      policyGate !== undefined &&
      policyGate !== null &&
      (typeof policyGate !== "string" || !safeString(policyGate))
    ) {
      errors.push(
        taxonomyError(
          "substrate_taxonomy.invalid_mode_boundary",
          `${boundaryPath}/policy_gate`,
          "Substrate policy_gate must be a safe non-secret string.",
        ),
      );
    }

    if (typeof rationale !== "string" || !safeString(rationale)) {
      errors.push(
        taxonomyError(
          "substrate_taxonomy.invalid_mode_boundary",
          `${boundaryPath}/rationale`,
          "Substrate mode rationale must be a safe non-secret string.",
        ),
      );
    }

    if (
      controls.length > 0 &&
      typeof rationale === "string" &&
      safeString(rationale) &&
      (policyGate === undefined ||
        (typeof policyGate === "string" && safeString(policyGate)))
    ) {
      boundaries.push({
        mode,
        controls,
        policy_gate: typeof policyGate === "string" ? policyGate : null,
        rationale,
        live_mutation_allowed: false,
      });
    }
  }

  return boundaries;
}

function normalizeControls(
  kind: SubstrateKind,
  mode: SubstrateControlMode,
  value: unknown,
  path: string,
  errors: SubstrateTaxonomyError[],
): string[] {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push(
      taxonomyError(
        "substrate_taxonomy.invalid_mode_boundary",
        path,
        "Substrate mode controls must be a non-empty array.",
      ),
    );
    return [];
  }

  const controls: string[] = [];
  value.forEach((control, index) => {
    const controlPath = `${path}/${index}`;
    if (typeof control !== "string" || !safeControl(control)) {
      errors.push(
        taxonomyError(
          "substrate_taxonomy.unsafe_substrate_authority",
          controlPath,
          "Substrate control must be a safe non-secret capability string.",
        ),
      );
      return;
    }
    if (mode !== "forbidden_mutation" && forbiddenAuthorityPattern.test(control)) {
      errors.push(
        taxonomyError(
          "substrate_taxonomy.unsafe_substrate_authority",
          controlPath,
          "Substrate authority is unsafe outside forbidden mutation mode.",
        ),
      );
      return;
    }
    if (mode === "forbidden_mutation" && !forbiddenMutationPattern.test(control)) {
      errors.push(
        taxonomyError(
          "substrate_taxonomy.invalid_mode_boundary",
          controlPath,
          "Forbidden mutation controls must name blocked mutation authority.",
        ),
      );
      return;
    }
    if (
      mode !== "forbidden_mutation" &&
      !control.startsWith(`${controlNamespace(kind)}.`)
    ) {
      errors.push(
        taxonomyError(
          "substrate_taxonomy.invalid_mode_boundary",
          controlPath,
          "Substrate control must use the substrate namespace.",
        ),
      );
      return;
    }
    controls.push(control);
  });
  return uniqueStrings(controls);
}

function normalizeSourceRefs(
  value: unknown,
  path: string,
  errors: SubstrateTaxonomyError[],
): string[] {
  if (!Array.isArray(value)) {
    errors.push(
      taxonomyError(
        "substrate_taxonomy.invalid_source_ref",
        path,
        "Substrate taxonomy source_refs must be an array.",
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
        taxonomyError(
          "substrate_taxonomy.invalid_source_ref",
          sourcePath,
          "Substrate taxonomy source ref must be an object.",
        ),
      );
      return;
    }

    for (const key of Object.keys(source)) {
      if (!sourceKeys.has(key)) {
        errors.push(
          taxonomyError(
            "substrate_taxonomy.unexpected_field",
            `${sourcePath}/${escapeJsonPointerSegment(key)}`,
            "Unexpected substrate taxonomy source ref field.",
          ),
        );
      }
    }

    if (typeof source.source_ref !== "string" || !safeString(source.source_ref)) {
      errors.push(
        taxonomyError(
          "substrate_taxonomy.invalid_source_ref",
          `${sourcePath}/source_ref`,
          "Substrate taxonomy source_ref must be a safe non-secret string.",
        ),
      );
    }

    if (typeof source.summary !== "string" || !safeString(source.summary)) {
      errors.push(
        taxonomyError(
          "substrate_taxonomy.invalid_source_ref",
          `${sourcePath}/summary`,
          "Substrate taxonomy source summary must be a safe non-secret string.",
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

function substrateKind(
  kind: SubstrateKind,
  controls: {
    summary: string;
    observation: string[];
    proposal: string[];
    approval_gated_mutation: string[];
    forbidden_mutation: string[];
  },
): SubstrateKindEvidence {
  const boundaries: SubstrateModeBoundaryEvidence[] = [
    substrateBoundary(
      "observation",
      controls.observation,
      null,
      `${kind} observation is read-only evidence collection`,
    ),
    substrateBoundary(
      "proposal",
      controls.proposal,
      null,
      `${kind} proposal emits plans without mutation`,
    ),
    substrateBoundary(
      "approval_gated_mutation",
      controls.approval_gated_mutation,
      `${kind}.mutation.approval`,
      `${kind} mutation request requires Gateway policy and human approval`,
    ),
    substrateBoundary(
      "forbidden_mutation",
      controls.forbidden_mutation,
      null,
      `${kind} direct mutation remains forbidden by this contract`,
    ),
  ];
  return substrateEvidence(kind, controls.summary, boundaries, [
    `ticket:BP-0085: source-only ${kind} substrate taxonomy`,
  ]);
}

function substrateBoundary(
  mode: SubstrateControlMode,
  controls: string[],
  policyGate: string | null,
  rationale: string,
): SubstrateModeBoundaryEvidence {
  return {
    mode,
    controls: uniqueStrings(controls),
    policy_gate: policyGate,
    rationale,
    live_mutation_allowed: false,
  };
}

function substrateEvidence(
  kind: SubstrateKind,
  summary: string,
  boundaries: SubstrateModeBoundaryEvidence[],
  refs: string[],
): SubstrateKindEvidence {
  const deniedControls = boundaries
    .filter((boundary) => boundary.mode === "forbidden_mutation")
    .flatMap((boundary) => boundary.controls);
  const requiredPolicyGates = boundaries
    .map((boundary) => boundary.policy_gate)
    .filter((gate): gate is string => typeof gate === "string");

  return {
    kind,
    summary,
    mode_boundaries: boundaries,
    denied_controls: uniqueStrings(deniedControls),
    required_policy_gates: uniqueStrings(requiredPolicyGates),
    source_refs: uniqueStrings(refs),
  };
}

function controlNamespace(kind: SubstrateKind): string {
  if (kind === "cloud_accounts") {
    return "cloud";
  }
  return kind.replace(/s$/, "");
}

function sourceRefs(sourceRefsInput: string[]): string[] {
  return uniqueStrings([
    ...sourceRefsInput,
    ...substrateTaxonomyContract.source_docs.map((doc) => `doc:${doc}`),
  ]);
}

function failSubstrateTaxonomy(
  errors: SubstrateTaxonomyError[],
): SubstrateTaxonomyResult {
  return {
    ok: false,
    taxonomy: null,
    errors,
    raw_input_content: "withheld",
    side_effects: [],
  };
}

function taxonomyError(
  code: SubstrateTaxonomyErrorCode,
  path: string,
  message: string,
): SubstrateTaxonomyError {
  return { code, path, message, severity: "error" };
}

function safeControl(value: string): boolean {
  return controlPattern.test(value);
}

function safeString(value: string): boolean {
  return (
    safeStringPattern.test(value) &&
    !secretLikePattern.test(value) &&
    !value.toLowerCase().includes("rm -rf")
  );
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)].filter((value) => value.length > 0).sort();
}

function dedupeErrors(errors: SubstrateTaxonomyError[]): SubstrateTaxonomyError[] {
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
