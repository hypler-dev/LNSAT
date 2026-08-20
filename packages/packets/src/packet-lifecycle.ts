import type { UniversalPacketType } from "./validator.js";

export const PACKET_LIFECYCLE_STATUS = "contract_only";

export const packetLifecycleContract = {
  contract_id: "lnsat.platform.packet_lifecycle.v0_1",
  authority: ["@lnsat/packets", "source-backed-packet-lifecycle"],
  lifecycle_version: "0.1",
  packet_types: ["CapabilityPacket", "ExecutionPacket", "EnvironmentPacket"],
  source_docs: [
    "docs/architecture/PACKET_MODEL.md",
    "docs/architecture/POLICY_AND_AUDIT.md",
    "docs/architecture/SYSTEM_ARCHITECTURE.md",
    "docs/architecture/SUBSTRATES_AND_NODES.md",
    "docs/architecture/DATA_MODEL.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
  ],
  live_execution_allowed: false,
  side_effects: [],
  status: "contract_only",
} as const;

export type LifecyclePacketType = Extract<
  UniversalPacketType,
  "CapabilityPacket" | "ExecutionPacket" | "EnvironmentPacket"
>;

export type CapabilityLifecycleState =
  | "requested"
  | "policy_reviewed"
  | "approval_required"
  | "approved"
  | "denied"
  | "granted"
  | "revoked";

export type ExecutionLifecycleState =
  | "proposed"
  | "policy_reviewed"
  | "approval_required"
  | "approved"
  | "running"
  | "completed"
  | "failed"
  | "cancelled"
  | "denied";

export type EnvironmentLifecycleState =
  | "declared"
  | "policy_reviewed"
  | "approval_required"
  | "approved"
  | "prepared"
  | "active"
  | "teardown_requested"
  | "destroyed"
  | "denied";

export type LifecycleState =
  CapabilityLifecycleState | ExecutionLifecycleState | EnvironmentLifecycleState;

export type PacketLifecycleSourceInput = {
  source_ref: string;
  summary: string;
};

export type PacketLifecycleTransitionInput = {
  from: LifecycleState;
  to: LifecycleState;
  policy_gate: string;
  approval_required: boolean;
  audit_event: string;
  rationale: string;
  side_effects?: [];
};

export type PacketLifecycleForbiddenTransitionInput = {
  from: LifecycleState;
  to: LifecycleState;
  reason: string;
};

export type PacketLifecycleDefinitionInput = {
  packet_type: LifecyclePacketType;
  states: LifecycleState[];
  initial_state: LifecycleState;
  terminal_states: LifecycleState[];
  allowed_transitions: PacketLifecycleTransitionInput[];
  forbidden_transitions: PacketLifecycleForbiddenTransitionInput[];
  source_refs: PacketLifecycleSourceInput[];
};

export type PacketLifecycleTransitionEvidence = {
  from: LifecycleState;
  to: LifecycleState;
  policy_gate: string;
  approval_required: boolean;
  audit_event: string;
  rationale: string;
  side_effects: [];
};

export type PacketLifecycleForbiddenTransitionEvidence = {
  from: LifecycleState;
  to: LifecycleState;
  reason: string;
};

export type PacketLifecycleEvidence = {
  packet_type: LifecyclePacketType;
  states: LifecycleState[];
  initial_state: LifecycleState;
  terminal_states: LifecycleState[];
  allowed_transitions: PacketLifecycleTransitionEvidence[];
  forbidden_transitions: PacketLifecycleForbiddenTransitionEvidence[];
  required_policy_gates: string[];
  approval_required_transitions: string[];
  source_refs: string[];
};

export type PacketLifecycleMap = Record<LifecyclePacketType, PacketLifecycleEvidence>;

export type PacketLifecycleRequest = {
  lifecycle_version?: typeof packetLifecycleContract.lifecycle_version;
  lifecycle_map?: Partial<
    Record<
      LifecyclePacketType,
      PacketLifecycleDefinitionInput | PacketLifecycleEvidence
    >
  >;
  source_refs?: PacketLifecycleSourceInput[];
  live_execution_allowed?: false;
  side_effects?: [];
};

export type PacketLifecycleErrorCode =
  | "packet_lifecycle.invalid_request"
  | "packet_lifecycle.unexpected_field"
  | "packet_lifecycle.invalid_lifecycle_version"
  | "packet_lifecycle.lifecycle_map_required"
  | "packet_lifecycle.unknown_packet_type"
  | "packet_lifecycle.packet_type_required"
  | "packet_lifecycle.invalid_packet_type"
  | "packet_lifecycle.invalid_state"
  | "packet_lifecycle.state_required"
  | "packet_lifecycle.initial_state_required"
  | "packet_lifecycle.terminal_state_required"
  | "packet_lifecycle.transition_required"
  | "packet_lifecycle.invalid_transition"
  | "packet_lifecycle.forbidden_transition"
  | "packet_lifecycle.policy_gate_required"
  | "packet_lifecycle.approval_required"
  | "packet_lifecycle.invalid_source_ref"
  | "packet_lifecycle.live_execution_forbidden"
  | "packet_lifecycle.side_effects_forbidden";

export type PacketLifecycleError = {
  code: PacketLifecycleErrorCode;
  path: string;
  message: string;
  severity: "error";
};

export type PacketLifecycleContractEvidence = {
  contract_id: typeof packetLifecycleContract.contract_id;
  lifecycle_version: typeof packetLifecycleContract.lifecycle_version;
  lifecycle_map: PacketLifecycleMap;
  packet_types: LifecyclePacketType[];
  transition_map: Record<LifecyclePacketType, string[]>;
  forbidden_transitions: Record<LifecyclePacketType, string[]>;
  required_policy_gates: string[];
  approval_required_transitions: string[];
  source_refs: string[];
  live_execution_allowed: false;
  side_effects: [];
};

export type PacketLifecycleResult =
  | {
      ok: true;
      lifecycle: PacketLifecycleContractEvidence;
      errors: [];
      side_effects: [];
    }
  | {
      ok: false;
      lifecycle: null;
      errors: PacketLifecycleError[];
      raw_input_content: "withheld";
      side_effects: [];
    };

type NormalizedPacketLifecycleRequest =
  | {
      ok: true;
      lifecycle_map: PacketLifecycleMap;
      source_refs: string[];
    }
  | {
      ok: false;
      errors: PacketLifecycleError[];
    };

const requestKeys = new Set([
  "lifecycle_version",
  "lifecycle_map",
  "source_refs",
  "live_execution_allowed",
  "side_effects",
]);
const lifecycleDefinitionKeys = new Set([
  "packet_type",
  "states",
  "initial_state",
  "terminal_states",
  "allowed_transitions",
  "forbidden_transitions",
  "source_refs",
  "required_policy_gates",
  "approval_required_transitions",
]);
const transitionKeys = new Set([
  "from",
  "to",
  "policy_gate",
  "approval_required",
  "audit_event",
  "rationale",
  "side_effects",
]);
const forbiddenTransitionKeys = new Set(["from", "to", "reason"]);
const sourceKeys = new Set(["source_ref", "summary"]);
const lifecyclePacketTypes = new Set<LifecyclePacketType>(
  packetLifecycleContract.packet_types,
);
const safeStringPattern = /^[\w .,:;@/()[\]#_+=-]{3,240}$/;
const policyGatePattern = /^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*){1,6}$/;
const auditEventPattern = /^[a-z][a-z0-9_]{2,80}$/;
const secretLikePattern =
  /(postgres:\/\/|mysql:\/\/|mongodb:\/\/|DATABASE_URL|SECRET|TOKEN|PASSWORD|PRIVATE KEY|sk-[A-Za-z0-9]|secret:)/i;
const unsafeLifecyclePattern =
  /\b(shell|ssh|sudo|root|secret\.read|credential\.read|database\.write|db\.write|drop|delete|destroy\.execute|deploy\.execute|dns\.write|cloudflare\.write|queue\.purge|docker\.socket|docker_socket|privileged|unrestricted|node_agent\.exec|rm -rf)\b/i;

const stateSets: Record<LifecyclePacketType, Set<LifecycleState>> = {
  CapabilityPacket: new Set([
    "requested",
    "policy_reviewed",
    "approval_required",
    "approved",
    "denied",
    "granted",
    "revoked",
  ]),
  ExecutionPacket: new Set([
    "proposed",
    "policy_reviewed",
    "approval_required",
    "approved",
    "running",
    "completed",
    "failed",
    "cancelled",
    "denied",
  ]),
  EnvironmentPacket: new Set([
    "declared",
    "policy_reviewed",
    "approval_required",
    "approved",
    "prepared",
    "active",
    "teardown_requested",
    "destroyed",
    "denied",
  ]),
};

const approvalStates = new Set<LifecycleState>([
  "approval_required",
  "approved",
  "granted",
  "revoked",
  "running",
  "prepared",
  "active",
  "teardown_requested",
  "destroyed",
]);

const requiredTransitions: Record<LifecyclePacketType, string[]> = {
  CapabilityPacket: [
    "requested->policy_reviewed",
    "policy_reviewed->approval_required",
    "approval_required->approved",
    "policy_reviewed->denied",
    "approved->granted",
    "granted->revoked",
  ],
  ExecutionPacket: [
    "proposed->policy_reviewed",
    "policy_reviewed->approval_required",
    "approval_required->approved",
    "policy_reviewed->denied",
    "approved->running",
    "running->completed",
    "running->failed",
    "running->cancelled",
  ],
  EnvironmentPacket: [
    "declared->policy_reviewed",
    "policy_reviewed->approval_required",
    "approval_required->approved",
    "policy_reviewed->denied",
    "approved->prepared",
    "prepared->active",
    "active->teardown_requested",
    "teardown_requested->destroyed",
  ],
};

export const defaultPacketLifecycleMap = {
  CapabilityPacket: lifecycle("CapabilityPacket", {
    states: [
      "requested",
      "policy_reviewed",
      "approval_required",
      "approved",
      "denied",
      "granted",
      "revoked",
    ],
    initial_state: "requested",
    terminal_states: ["denied", "revoked"],
    allowed: [
      transition(
        "requested",
        "policy_reviewed",
        "capability.policy.review",
        false,
        "policy_checked",
        "capability request must pass Gateway policy before scope can change",
      ),
      transition(
        "policy_reviewed",
        "approval_required",
        "capability.approval.required",
        true,
        "approval_requested",
        "capability grant path requires explicit approval evidence",
      ),
      transition(
        "approval_required",
        "approved",
        "capability.approval.granted",
        true,
        "approval_granted",
        "approved capability requires prior approval request",
      ),
      transition(
        "policy_reviewed",
        "denied",
        "capability.policy.deny",
        false,
        "tool_denied",
        "policy can deny capability request without mutation",
      ),
      transition(
        "approved",
        "granted",
        "capability.grant.approved_scope",
        true,
        "tool_allowed",
        "capability grant remains bound to approved scope",
      ),
      transition(
        "granted",
        "revoked",
        "capability.revoke.approved_scope",
        true,
        "decision_recorded",
        "capability revocation records approved scope closure",
      ),
    ],
    forbidden: [
      forbidden("requested", "granted", "capability grant cannot bypass policy"),
      forbidden("requested", "approved", "capability approval cannot bypass policy"),
      forbidden("approval_required", "granted", "capability grant needs approval"),
    ],
  }),
  ExecutionPacket: lifecycle("ExecutionPacket", {
    states: [
      "proposed",
      "policy_reviewed",
      "approval_required",
      "approved",
      "running",
      "completed",
      "failed",
      "cancelled",
      "denied",
    ],
    initial_state: "proposed",
    terminal_states: ["completed", "failed", "cancelled", "denied"],
    allowed: [
      transition(
        "proposed",
        "policy_reviewed",
        "execution.policy.review",
        false,
        "policy_checked",
        "execution proposal must pass Gateway policy before any run state",
      ),
      transition(
        "policy_reviewed",
        "approval_required",
        "execution.approval.required",
        true,
        "approval_requested",
        "execution run request requires approval before live scope",
      ),
      transition(
        "approval_required",
        "approved",
        "execution.approval.granted",
        true,
        "approval_granted",
        "approved execution requires human approval evidence",
      ),
      transition(
        "policy_reviewed",
        "denied",
        "execution.policy.deny",
        false,
        "tool_denied",
        "policy can deny execution proposal without runner activity",
      ),
      transition(
        "approved",
        "running",
        "execution.run.approved_scope",
        true,
        "runbook_started",
        "running state is only valid after approved execution scope",
      ),
      transition(
        "running",
        "completed",
        "execution.result.record",
        false,
        "runbook_completed",
        "completed execution links result evidence to approved run",
      ),
      transition(
        "running",
        "failed",
        "execution.result.record",
        false,
        "runbook_completed",
        "failed execution links error evidence to approved run",
      ),
      transition(
        "running",
        "cancelled",
        "execution.cancel.approved_scope",
        true,
        "decision_recorded",
        "cancellation remains bound to approved execution scope",
      ),
    ],
    forbidden: [
      forbidden("proposed", "running", "execution cannot start before policy"),
      forbidden("proposed", "completed", "execution cannot complete before run"),
      forbidden("approved", "completed", "execution result cannot bypass running"),
    ],
  }),
  EnvironmentPacket: lifecycle("EnvironmentPacket", {
    states: [
      "declared",
      "policy_reviewed",
      "approval_required",
      "approved",
      "prepared",
      "active",
      "teardown_requested",
      "destroyed",
      "denied",
    ],
    initial_state: "declared",
    terminal_states: ["destroyed", "denied"],
    allowed: [
      transition(
        "declared",
        "policy_reviewed",
        "environment.policy.review",
        false,
        "policy_checked",
        "environment declaration must pass Gateway policy before preparation",
      ),
      transition(
        "policy_reviewed",
        "approval_required",
        "environment.approval.required",
        true,
        "approval_requested",
        "environment activation requires approval before live scope",
      ),
      transition(
        "approval_required",
        "approved",
        "environment.approval.granted",
        true,
        "approval_granted",
        "approved environment requires human approval evidence",
      ),
      transition(
        "policy_reviewed",
        "denied",
        "environment.policy.deny",
        false,
        "tool_denied",
        "policy can deny environment request before preparation",
      ),
      transition(
        "approved",
        "prepared",
        "environment.prepare.approved_scope",
        true,
        "environment_created",
        "prepared environment remains bound to approved scope",
      ),
      transition(
        "prepared",
        "active",
        "environment.activate.approved_scope",
        true,
        "environment_created",
        "active environment requires prepared approved scope",
      ),
      transition(
        "active",
        "teardown_requested",
        "environment.teardown.approved_scope",
        true,
        "environment_destroyed",
        "teardown request is explicit and audited",
      ),
      transition(
        "teardown_requested",
        "destroyed",
        "environment.destroy.approved_scope",
        true,
        "environment_destroyed",
        "destroyed state requires prior teardown request",
      ),
    ],
    forbidden: [
      forbidden("declared", "active", "environment cannot activate before policy"),
      forbidden("declared", "destroyed", "environment cannot destroy before setup"),
      forbidden("active", "destroyed", "environment destroy needs teardown request"),
    ],
  }),
} satisfies Record<LifecyclePacketType, PacketLifecycleEvidence>;

export function createPacketLifecycle(input: unknown = {}): PacketLifecycleResult {
  const normalized = normalizePacketLifecycleRequest(input);

  if (!normalized.ok) {
    return failPacketLifecycle(normalized.errors);
  }

  const transitionMap = Object.fromEntries(
    packetLifecycleContract.packet_types.map((packetType) => [
      packetType,
      normalized.lifecycle_map[packetType].allowed_transitions.map(transitionKey),
    ]),
  ) as Record<LifecyclePacketType, string[]>;
  const forbiddenTransitions = Object.fromEntries(
    packetLifecycleContract.packet_types.map((packetType) => [
      packetType,
      normalized.lifecycle_map[packetType].forbidden_transitions.map(
        forbiddenTransitionKey,
      ),
    ]),
  ) as Record<LifecyclePacketType, string[]>;
  const requiredPolicyGates = uniqueStrings(
    Object.values(normalized.lifecycle_map).flatMap(
      (lifecycle) => lifecycle.required_policy_gates,
    ),
  );
  const approvalRequiredTransitions = uniqueStrings(
    Object.values(normalized.lifecycle_map).flatMap(
      (lifecycle) => lifecycle.approval_required_transitions,
    ),
  );

  return {
    ok: true,
    lifecycle: {
      contract_id: packetLifecycleContract.contract_id,
      lifecycle_version: packetLifecycleContract.lifecycle_version,
      lifecycle_map: normalized.lifecycle_map,
      packet_types: [...packetLifecycleContract.packet_types],
      transition_map: transitionMap,
      forbidden_transitions: forbiddenTransitions,
      required_policy_gates: requiredPolicyGates,
      approval_required_transitions: approvalRequiredTransitions,
      source_refs: sourceRefs(normalized.source_refs),
      live_execution_allowed: false,
      side_effects: [],
    },
    errors: [],
    side_effects: [],
  };
}

function normalizePacketLifecycleRequest(
  input: unknown,
): NormalizedPacketLifecycleRequest {
  if (!isPlainObject(input)) {
    return {
      ok: false,
      errors: [
        lifecycleError(
          "packet_lifecycle.invalid_request",
          "",
          "Packet lifecycle request must be an object.",
        ),
      ],
    };
  }

  const errors: PacketLifecycleError[] = [];
  for (const key of Object.keys(input)) {
    if (!requestKeys.has(key)) {
      errors.push(
        lifecycleError(
          "packet_lifecycle.unexpected_field",
          jsonPointer(key),
          "Unexpected packet lifecycle request field.",
        ),
      );
    }
  }

  if (
    Object.hasOwn(input, "lifecycle_version") &&
    input.lifecycle_version !== packetLifecycleContract.lifecycle_version
  ) {
    errors.push(
      lifecycleError(
        "packet_lifecycle.invalid_lifecycle_version",
        "/lifecycle_version",
        "Packet lifecycle version is unsupported.",
      ),
    );
  }

  const lifecycleMap =
    Object.hasOwn(input, "lifecycle_map") && input.lifecycle_map !== undefined
      ? normalizeLifecycleMap(input.lifecycle_map, errors)
      : defaultPacketLifecycleMap;
  const refs = Object.hasOwn(input, "source_refs")
    ? normalizeSourceRefs(input.source_refs, "/source_refs", errors)
    : [];

  if (
    Object.hasOwn(input, "live_execution_allowed") &&
    input.live_execution_allowed !== false
  ) {
    errors.push(
      lifecycleError(
        "packet_lifecycle.live_execution_forbidden",
        "/live_execution_allowed",
        "Packet lifecycle cannot enable live execution.",
      ),
    );
  }

  if (
    Object.hasOwn(input, "side_effects") &&
    (!Array.isArray(input.side_effects) || input.side_effects.length !== 0)
  ) {
    errors.push(
      lifecycleError(
        "packet_lifecycle.side_effects_forbidden",
        "/side_effects",
        "Packet lifecycle must preserve side_effects: [].",
      ),
    );
  }

  if (errors.length > 0) {
    return { ok: false, errors: dedupeErrors(errors) };
  }

  return { ok: true, lifecycle_map: lifecycleMap, source_refs: refs };
}

function normalizeLifecycleMap(
  value: unknown,
  errors: PacketLifecycleError[],
): PacketLifecycleMap {
  if (!isPlainObject(value)) {
    errors.push(
      lifecycleError(
        "packet_lifecycle.lifecycle_map_required",
        "/lifecycle_map",
        "Packet lifecycle requires a lifecycle map object.",
      ),
    );
    return defaultPacketLifecycleMap;
  }

  for (const key of Object.keys(value)) {
    if (!lifecyclePacketTypes.has(key as LifecyclePacketType)) {
      errors.push(
        lifecycleError(
          "packet_lifecycle.unknown_packet_type",
          "/lifecycle_map/<unknown>",
          "Packet lifecycle packet type is unknown.",
        ),
      );
    }
  }

  const lifecycleMap = {} as PacketLifecycleMap;
  for (const packetType of packetLifecycleContract.packet_types) {
    const definition = value[packetType];
    const path = `/lifecycle_map/${packetType}`;
    if (!isPlainObject(definition)) {
      errors.push(
        lifecycleError(
          "packet_lifecycle.packet_type_required",
          path,
          `Packet lifecycle requires ${packetType} definition.`,
        ),
      );
      continue;
    }

    const evidence = normalizeLifecycleDefinition(packetType, definition, errors);
    if (evidence !== null) {
      lifecycleMap[packetType] = evidence;
    }
  }

  return lifecycleMap;
}

function normalizeLifecycleDefinition(
  expectedPacketType: LifecyclePacketType,
  definition: Record<string, unknown>,
  errors: PacketLifecycleError[],
): PacketLifecycleEvidence | null {
  const path = `/lifecycle_map/${expectedPacketType}`;
  for (const key of Object.keys(definition)) {
    if (!lifecycleDefinitionKeys.has(key)) {
      errors.push(
        lifecycleError(
          "packet_lifecycle.unexpected_field",
          `${path}/${escapeJsonPointerSegment(key)}`,
          "Unexpected packet lifecycle definition field.",
        ),
      );
    }
  }

  if (definition.packet_type !== expectedPacketType) {
    errors.push(
      lifecycleError(
        "packet_lifecycle.invalid_packet_type",
        `${path}/packet_type`,
        "Lifecycle map key and packet_type value must match.",
      ),
    );
  }

  const states = normalizeStates(
    expectedPacketType,
    definition.states,
    `${path}/states`,
    errors,
  );
  const initialState = normalizeRequiredState(
    expectedPacketType,
    definition.initial_state,
    `${path}/initial_state`,
    "packet_lifecycle.initial_state_required",
    errors,
  );
  const terminalStates = normalizeTerminalStates(
    expectedPacketType,
    definition.terminal_states,
    `${path}/terminal_states`,
    errors,
  );
  const allowedTransitions = normalizeAllowedTransitions(
    expectedPacketType,
    definition.allowed_transitions,
    `${path}/allowed_transitions`,
    errors,
  );
  const forbiddenTransitions = normalizeForbiddenTransitions(
    expectedPacketType,
    definition.forbidden_transitions,
    `${path}/forbidden_transitions`,
    errors,
  );
  const refs = normalizeSourceRefs(
    definition.source_refs,
    `${path}/source_refs`,
    errors,
  );

  validateRequiredTransitions(
    expectedPacketType,
    allowedTransitions,
    `${path}/allowed_transitions`,
    errors,
  );
  validateForbiddenTransitions(
    allowedTransitions,
    forbiddenTransitions,
    `${path}/forbidden_transitions`,
    errors,
  );

  if (
    definition.packet_type === expectedPacketType &&
    states.length === stateSets[expectedPacketType].size &&
    initialState !== null &&
    terminalStates.length > 0 &&
    allowedTransitions.length >= requiredTransitions[expectedPacketType].length &&
    forbiddenTransitions.length > 0 &&
    refs.length > 0
  ) {
    return lifecycleEvidence(
      expectedPacketType,
      states,
      initialState,
      terminalStates,
      allowedTransitions,
      forbiddenTransitions,
      refs,
    );
  }

  return null;
}

function normalizeStates(
  packetType: LifecyclePacketType,
  value: unknown,
  path: string,
  errors: PacketLifecycleError[],
): LifecycleState[] {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push(
      lifecycleError(
        "packet_lifecycle.state_required",
        path,
        "Packet lifecycle states must be a non-empty array.",
      ),
    );
    return [];
  }

  const states: LifecycleState[] = [];
  value.forEach((state, index) => {
    const statePath = `${path}/${index}`;
    if (!validState(packetType, state)) {
      errors.push(
        lifecycleError(
          "packet_lifecycle.invalid_state",
          statePath,
          "Packet lifecycle state is invalid for packet type.",
        ),
      );
      return;
    }
    states.push(state);
  });

  for (const state of stateSets[packetType]) {
    if (!states.includes(state)) {
      errors.push(
        lifecycleError(
          "packet_lifecycle.state_required",
          `${path}/${state}`,
          "Packet lifecycle required state is missing.",
        ),
      );
    }
  }

  return uniqueStrings(states) as LifecycleState[];
}

function normalizeRequiredState(
  packetType: LifecyclePacketType,
  value: unknown,
  path: string,
  code: PacketLifecycleErrorCode,
  errors: PacketLifecycleError[],
): LifecycleState | null {
  if (!validState(packetType, value)) {
    errors.push(
      lifecycleError(code, path, "Packet lifecycle required state is invalid."),
    );
    return null;
  }

  return value;
}

function normalizeTerminalStates(
  packetType: LifecyclePacketType,
  value: unknown,
  path: string,
  errors: PacketLifecycleError[],
): LifecycleState[] {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push(
      lifecycleError(
        "packet_lifecycle.terminal_state_required",
        path,
        "Packet lifecycle terminal_states must be a non-empty array.",
      ),
    );
    return [];
  }

  const states: LifecycleState[] = [];
  value.forEach((state, index) => {
    if (!validState(packetType, state)) {
      errors.push(
        lifecycleError(
          "packet_lifecycle.terminal_state_required",
          `${path}/${index}`,
          "Packet lifecycle terminal state is invalid.",
        ),
      );
      return;
    }
    states.push(state);
  });
  return uniqueStrings(states) as LifecycleState[];
}

function normalizeAllowedTransitions(
  packetType: LifecyclePacketType,
  value: unknown,
  path: string,
  errors: PacketLifecycleError[],
): PacketLifecycleTransitionEvidence[] {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push(
      lifecycleError(
        "packet_lifecycle.transition_required",
        path,
        "Packet lifecycle allowed_transitions must be a non-empty array.",
      ),
    );
    return [];
  }

  const transitions: PacketLifecycleTransitionEvidence[] = [];
  value.forEach((transitionValue, index) => {
    const transitionPath = `${path}/${index}`;
    if (!isPlainObject(transitionValue)) {
      errors.push(
        lifecycleError(
          "packet_lifecycle.invalid_transition",
          transitionPath,
          "Packet lifecycle transition must be an object.",
        ),
      );
      return;
    }

    for (const key of Object.keys(transitionValue)) {
      if (!transitionKeys.has(key)) {
        errors.push(
          lifecycleError(
            "packet_lifecycle.unexpected_field",
            `${transitionPath}/${escapeJsonPointerSegment(key)}`,
            "Unexpected packet lifecycle transition field.",
          ),
        );
      }
    }

    const from = normalizeRequiredState(
      packetType,
      transitionValue.from,
      `${transitionPath}/from`,
      "packet_lifecycle.invalid_transition",
      errors,
    );
    const to = normalizeRequiredState(
      packetType,
      transitionValue.to,
      `${transitionPath}/to`,
      "packet_lifecycle.invalid_transition",
      errors,
    );
    const policyGate = transitionValue.policy_gate;
    const approvalRequired = transitionValue.approval_required;
    const auditEvent = transitionValue.audit_event;
    const rationale = transitionValue.rationale;

    if (from !== null && to !== null && from === to) {
      errors.push(
        lifecycleError(
          "packet_lifecycle.invalid_transition",
          `${transitionPath}/to`,
          "Packet lifecycle transition must change state.",
        ),
      );
    }

    if (typeof policyGate !== "string" || !safePolicyGate(policyGate)) {
      errors.push(
        lifecycleError(
          "packet_lifecycle.policy_gate_required",
          `${transitionPath}/policy_gate`,
          "Packet lifecycle transition requires a safe policy_gate.",
        ),
      );
    }

    if (approvalRequired !== true && approvalRequired !== false) {
      errors.push(
        lifecycleError(
          "packet_lifecycle.invalid_transition",
          `${transitionPath}/approval_required`,
          "Packet lifecycle transition approval_required must be boolean.",
        ),
      );
    }

    if (typeof auditEvent !== "string" || !safeAuditEvent(auditEvent)) {
      errors.push(
        lifecycleError(
          "packet_lifecycle.invalid_transition",
          `${transitionPath}/audit_event`,
          "Packet lifecycle transition requires a safe audit_event.",
        ),
      );
    }

    if (typeof rationale !== "string" || !safeString(rationale)) {
      errors.push(
        lifecycleError(
          "packet_lifecycle.invalid_transition",
          `${transitionPath}/rationale`,
          "Packet lifecycle transition rationale must be safe.",
        ),
      );
    }

    if (
      Object.hasOwn(transitionValue, "side_effects") &&
      (!Array.isArray(transitionValue.side_effects) ||
        transitionValue.side_effects.length !== 0)
    ) {
      errors.push(
        lifecycleError(
          "packet_lifecycle.side_effects_forbidden",
          `${transitionPath}/side_effects`,
          "Packet lifecycle transition must preserve side_effects: [].",
        ),
      );
    }

    if (to !== null && approvalStates.has(to) && approvalRequired !== true) {
      errors.push(
        lifecycleError(
          "packet_lifecycle.approval_required",
          `${transitionPath}/approval_required`,
          "Packet lifecycle transition to controlled state requires approval.",
        ),
      );
    }

    if (
      from !== null &&
      to !== null &&
      typeof policyGate === "string" &&
      safePolicyGate(policyGate) &&
      (approvalRequired === true || approvalRequired === false) &&
      typeof auditEvent === "string" &&
      safeAuditEvent(auditEvent) &&
      typeof rationale === "string" &&
      safeString(rationale)
    ) {
      transitions.push({
        from,
        to,
        policy_gate: policyGate,
        approval_required: approvalRequired,
        audit_event: auditEvent,
        rationale,
        side_effects: [],
      });
    }
  });

  return uniqueTransitions(transitions);
}

function normalizeForbiddenTransitions(
  packetType: LifecyclePacketType,
  value: unknown,
  path: string,
  errors: PacketLifecycleError[],
): PacketLifecycleForbiddenTransitionEvidence[] {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push(
      lifecycleError(
        "packet_lifecycle.forbidden_transition",
        path,
        "Packet lifecycle forbidden_transitions must be a non-empty array.",
      ),
    );
    return [];
  }

  const transitions: PacketLifecycleForbiddenTransitionEvidence[] = [];
  value.forEach((transitionValue, index) => {
    const transitionPath = `${path}/${index}`;
    if (!isPlainObject(transitionValue)) {
      errors.push(
        lifecycleError(
          "packet_lifecycle.forbidden_transition",
          transitionPath,
          "Packet lifecycle forbidden transition must be an object.",
        ),
      );
      return;
    }

    for (const key of Object.keys(transitionValue)) {
      if (!forbiddenTransitionKeys.has(key)) {
        errors.push(
          lifecycleError(
            "packet_lifecycle.unexpected_field",
            `${transitionPath}/${escapeJsonPointerSegment(key)}`,
            "Unexpected packet lifecycle forbidden transition field.",
          ),
        );
      }
    }

    const from = normalizeRequiredState(
      packetType,
      transitionValue.from,
      `${transitionPath}/from`,
      "packet_lifecycle.forbidden_transition",
      errors,
    );
    const to = normalizeRequiredState(
      packetType,
      transitionValue.to,
      `${transitionPath}/to`,
      "packet_lifecycle.forbidden_transition",
      errors,
    );
    const reason = transitionValue.reason;

    if (typeof reason !== "string" || !safeString(reason)) {
      errors.push(
        lifecycleError(
          "packet_lifecycle.forbidden_transition",
          `${transitionPath}/reason`,
          "Packet lifecycle forbidden transition reason must be safe.",
        ),
      );
    }

    if (
      from !== null &&
      to !== null &&
      typeof reason === "string" &&
      safeString(reason)
    ) {
      transitions.push({ from, to, reason });
    }
  });

  return uniqueForbiddenTransitions(transitions);
}

function normalizeSourceRefs(
  value: unknown,
  path: string,
  errors: PacketLifecycleError[],
): string[] {
  if (!Array.isArray(value)) {
    errors.push(
      lifecycleError(
        "packet_lifecycle.invalid_source_ref",
        path,
        "Packet lifecycle source_refs must be an array.",
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
        lifecycleError(
          "packet_lifecycle.invalid_source_ref",
          sourcePath,
          "Packet lifecycle source ref must be an object.",
        ),
      );
      return;
    }

    for (const key of Object.keys(source)) {
      if (!sourceKeys.has(key)) {
        errors.push(
          lifecycleError(
            "packet_lifecycle.unexpected_field",
            `${sourcePath}/${escapeJsonPointerSegment(key)}`,
            "Unexpected packet lifecycle source ref field.",
          ),
        );
      }
    }

    if (typeof source.source_ref !== "string" || !safeString(source.source_ref)) {
      errors.push(
        lifecycleError(
          "packet_lifecycle.invalid_source_ref",
          `${sourcePath}/source_ref`,
          "Packet lifecycle source_ref must be a safe non-secret string.",
        ),
      );
    }

    if (typeof source.summary !== "string" || !safeString(source.summary)) {
      errors.push(
        lifecycleError(
          "packet_lifecycle.invalid_source_ref",
          `${sourcePath}/summary`,
          "Packet lifecycle source summary must be a safe non-secret string.",
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

function validateRequiredTransitions(
  packetType: LifecyclePacketType,
  transitions: PacketLifecycleTransitionEvidence[],
  path: string,
  errors: PacketLifecycleError[],
): void {
  const transitionSet = new Set(transitions.map(transitionKey));
  for (const requiredTransition of requiredTransitions[packetType]) {
    if (!transitionSet.has(requiredTransition)) {
      errors.push(
        lifecycleError(
          "packet_lifecycle.transition_required",
          `${path}/${requiredTransition}`,
          "Packet lifecycle required transition is missing.",
        ),
      );
    }
  }
}

function validateForbiddenTransitions(
  allowedTransitions: PacketLifecycleTransitionEvidence[],
  forbiddenTransitions: PacketLifecycleForbiddenTransitionEvidence[],
  path: string,
  errors: PacketLifecycleError[],
): void {
  const forbiddenSet = new Set(forbiddenTransitions.map(forbiddenTransitionKey));
  for (const transitionItem of allowedTransitions) {
    const key = transitionKey(transitionItem);
    if (forbiddenSet.has(key)) {
      errors.push(
        lifecycleError(
          "packet_lifecycle.forbidden_transition",
          `${path}/${key}`,
          "Packet lifecycle allowed transition is explicitly forbidden.",
        ),
      );
    }
  }
}

function lifecycle(
  packetType: LifecyclePacketType,
  input: {
    states: LifecycleState[];
    initial_state: LifecycleState;
    terminal_states: LifecycleState[];
    allowed: PacketLifecycleTransitionEvidence[];
    forbidden: PacketLifecycleForbiddenTransitionEvidence[];
  },
): PacketLifecycleEvidence {
  return lifecycleEvidence(
    packetType,
    input.states,
    input.initial_state,
    input.terminal_states,
    input.allowed,
    input.forbidden,
    [`ticket:BP-0086: source-only ${packetType} lifecycle contract`],
  );
}

function lifecycleEvidence(
  packetType: LifecyclePacketType,
  states: LifecycleState[],
  initialState: LifecycleState,
  terminalStates: LifecycleState[],
  allowedTransitions: PacketLifecycleTransitionEvidence[],
  forbiddenTransitions: PacketLifecycleForbiddenTransitionEvidence[],
  sourceRefs: string[],
): PacketLifecycleEvidence {
  return {
    packet_type: packetType,
    states: uniqueStrings(states) as LifecycleState[],
    initial_state: initialState,
    terminal_states: uniqueStrings(terminalStates) as LifecycleState[],
    allowed_transitions: uniqueTransitions(allowedTransitions),
    forbidden_transitions: uniqueForbiddenTransitions(forbiddenTransitions),
    required_policy_gates: uniqueStrings(
      allowedTransitions.map((transitionItem) => transitionItem.policy_gate),
    ),
    approval_required_transitions: uniqueStrings(
      allowedTransitions
        .filter((transitionItem) => transitionItem.approval_required)
        .map(transitionKey),
    ),
    source_refs: sourceRefs,
  };
}

function transition(
  from: LifecycleState,
  to: LifecycleState,
  policyGate: string,
  approvalRequired: boolean,
  auditEvent: string,
  rationale: string,
): PacketLifecycleTransitionEvidence {
  return {
    from,
    to,
    policy_gate: policyGate,
    approval_required: approvalRequired,
    audit_event: auditEvent,
    rationale,
    side_effects: [],
  };
}

function forbidden(
  from: LifecycleState,
  to: LifecycleState,
  reason: string,
): PacketLifecycleForbiddenTransitionEvidence {
  return { from, to, reason };
}

function validState(
  packetType: LifecyclePacketType,
  value: unknown,
): value is LifecycleState {
  return (
    typeof value === "string" && stateSets[packetType].has(value as LifecycleState)
  );
}

function transitionKey(transitionItem: {
  from: LifecycleState;
  to: LifecycleState;
}): string {
  return `${transitionItem.from}->${transitionItem.to}`;
}

function forbiddenTransitionKey(transitionItem: {
  from: LifecycleState;
  to: LifecycleState;
}): string {
  return transitionKey(transitionItem);
}

function sourceRefs(extraRefs: string[]): string[] {
  return uniqueStrings([
    ...packetLifecycleContract.source_docs.map((source) => `doc:${source}`),
    ...extraRefs,
  ]);
}

function failPacketLifecycle(errors: PacketLifecycleError[]): PacketLifecycleResult {
  return {
    ok: false,
    lifecycle: null,
    errors: dedupeErrors(errors),
    raw_input_content: "withheld",
    side_effects: [],
  };
}

function lifecycleError(
  code: PacketLifecycleErrorCode,
  path: string,
  message: string,
): PacketLifecycleError {
  return { code, path, message, severity: "error" };
}

function safeString(value: string): boolean {
  return (
    safeStringPattern.test(value) &&
    !secretLikePattern.test(value) &&
    !unsafeLifecyclePattern.test(value)
  );
}

function safePolicyGate(value: string): boolean {
  return policyGatePattern.test(value) && safeString(value);
}

function safeAuditEvent(value: string): boolean {
  return auditEventPattern.test(value) && safeString(value);
}

function uniqueStrings<T extends string>(items: T[]): T[] {
  return [...new Set(items)].sort();
}

function uniqueTransitions(
  transitions: PacketLifecycleTransitionEvidence[],
): PacketLifecycleTransitionEvidence[] {
  const seen = new Set<string>();
  return transitions.filter((transitionItem) => {
    const key = transitionKey(transitionItem);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function uniqueForbiddenTransitions(
  transitions: PacketLifecycleForbiddenTransitionEvidence[],
): PacketLifecycleForbiddenTransitionEvidence[] {
  const seen = new Set<string>();
  return transitions.filter((transitionItem) => {
    const key = forbiddenTransitionKey(transitionItem);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function dedupeErrors(errors: PacketLifecycleError[]): PacketLifecycleError[] {
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

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.prototype.toString.call(value) === "[object Object]"
  );
}

function jsonPointer(key: string): string {
  return `/${escapeJsonPointerSegment(key)}`;
}

function escapeJsonPointerSegment(segment: string): string {
  return segment.replace(/~/g, "~0").replace(/\//g, "~1");
}
