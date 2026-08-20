import type { UniversalPacket } from "@lnsat/packets";

export {
  P1_PUBLIC_TRUST_STATUS,
  SIGNER_PROVIDER_STATUS,
  createSignerProviderAuditEvent,
  inspectSignerProviderReadiness,
  inspectSignerProviderSignRequest,
  inspectSignerProviderSignatureResult,
  planSignerKeyLifecycleChange,
  signerProviderContract,
  validateOperatorP1Bundle,
} from "./signer-provider.js";

export type {
  SignerAlgorithm,
  SignerKeyReadback,
  SignerProvider,
  SignerProviderAuditEvent,
  SignerProviderCapabilities,
  SignerProviderDescriptor,
  SignerProviderHealth,
  SignerProviderProfile,
  SignerProviderSignatureResult,
  SignerProviderSignRequest,
} from "./signer-provider.js";

export {
  APPROVAL_EVIDENCE_V1_STATUS,
  approvalEvidenceV1Contract,
  createApprovalRequestV1,
  decideApprovalRequestV1,
} from "./approval-evidence-v1.js";

export type {
  ApprovalDecisionV1,
  ApprovalDecisionV1Kind,
  ApprovalDecisionV1ReasonCode,
  ApprovalDecisionV1Result,
  ApprovalEvidenceV1Error,
  ApprovalEvidenceV1ErrorCode,
  ApprovalRequestV1,
  ApprovalRequestV1PolicyReasonCode,
  ApprovalRequestV1Result,
  CreateApprovalRequestV1Options,
  DecideApprovalRequestV1Options,
} from "./approval-evidence-v1.js";

export {
  SIGNED_APPROVAL_EVIDENCE_V1_STATUS,
  deriveApprovalVerificationMaterialRefV1,
  deriveSignedApprovalEvidenceIdentityV1,
  ed25519VerificationRejectionClassesV1,
  encodeBase64Url,
  parseSignedApprovalEvidenceV1Json,
  signedApprovalEvidenceV1Contract,
  signedApprovalVerificationErrorCodes,
  validateApprovalVerificationMaterialV1,
  validateSignedApprovalEvidenceV1,
  verifyEd25519SignaturePrimitiveV1,
} from "./signed-approval-evidence-v1.js";

export type {
  ApprovalVerificationMaterialV1,
  Ed25519PublicVerificationInputV1,
  Ed25519VerificationPrimitiveInputV1,
  Ed25519VerificationPrimitiveResultV1,
  Ed25519VerificationProviderV1,
  Ed25519VerificationRejectionClassV1,
  SignedApprovalEvidenceIdentityV1,
  SignedApprovalEvidenceV1,
  SignedApprovalEvidenceV1ValidationFailure,
  SignedApprovalEvidenceV1ValidationResult,
  SignedApprovalEvidenceV1ValidationSuccess,
  SignedApprovalPayloadV1,
  SignedApprovalSignatureV1,
  SignedApprovalVerificationError,
  SignedApprovalVerificationErrorCode,
  SignedApprovalVerificationV1,
} from "./signed-approval-evidence-v1.js";

export {
  POLICY_DECISION_V1_STATUS,
  decidePacketEnvelopePolicyV1,
  policyDecisionV1Contract,
} from "./policy-decision-v1.js";

export type {
  PolicyCapabilityDecisionV1,
  PolicyDecisionV1,
  PolicyDecisionV1Error,
  PolicyDecisionV1ErrorCode,
  PolicyDecisionV1Kind,
  PolicyDecisionV1Options,
  PolicyDecisionV1ReasonCode,
  PolicyDecisionV1Result,
} from "./policy-decision-v1.js";

export const POLICY_ENGINE_STATUS = "source_only";
export const AUDIT_LEDGER_WRITER_POLICY_GATE_STATUS = "source_only";
export const AUDIT_LEDGER_WRITER_APPROVAL_REQUEST_STATUS = "source_only";
export const AUDIT_LEDGER_MIGRATION_APPROVAL_PREVIEW_STATUS = "source_only";
export const AUDIT_LEDGER_WRITER_CAPABILITY = "audit.ledger.writer.append_only";
export const AUDIT_LEDGER_WRITER_POLICY_GATE_CONTRACT_ID =
  "lnsat.policy.audit_ledger_writer_gate.v0_1";
export const AUDIT_LEDGER_WRITER_APPROVAL_REQUEST_CONTRACT_ID =
  "lnsat.policy.audit_ledger_writer_approval_request.v0_1";
export const AUDIT_LEDGER_MIGRATION_APPROVAL_PREVIEW_CONTRACT_ID =
  "lnsat.policy.audit_ledger_migration_approval_preview.v0_1";

export type PolicyDecisionKind = "allow" | "deny" | "approval_required";

export type PolicyReasonCode =
  | "policy.capability_blocked"
  | "policy.capability_forbidden"
  | "policy.capability_requires_approval"
  | "policy.packet_requires_approval"
  | "policy.risk_requires_approval";

export type PolicyDecision = {
  decision_id: string;
  packet_id: string;
  actor_id: string;
  session_id: string;
  resource_refs: string[];
  capability: string;
  risk_level: number;
  decision: PolicyDecisionKind;
  requires_approval: boolean;
  reason_codes: PolicyReasonCode[];
  created_at: string;
};

export type PolicyDecisionOptions = {
  now?: Date;
};

export type AuditLedgerWriterPolicyGateOperation =
  | "writer.create"
  | "writer.migrate"
  | "retention.change"
  | "ledger.record.append"
  | "ledger.record.correct"
  | "ledger.record.retry"
  | "preview.read"
  | "preview.validate"
  | "ui.preview.render";

export type AuditLedgerWriterPolicyGateReasonCode =
  | "policy.audit_ledger_writer_creation_requires_approval"
  | "policy.audit_ledger_migration_requires_approval"
  | "policy.audit_ledger_retention_change_requires_approval"
  | "policy.audit_ledger_state_change_requires_approval";

export type AuditLedgerWriterPolicyGateInput = {
  request_id: string;
  actor_id: string;
  session_id: string;
  operation: AuditLedgerWriterPolicyGateOperation;
  resource_refs: string[];
  requested_capability?: string;
  risk_level?: number;
};

export type AuditLedgerWriterPolicyGateDecision = {
  contract_id: typeof AUDIT_LEDGER_WRITER_POLICY_GATE_CONTRACT_ID;
  decision_id: string;
  request_id: string;
  actor_id: string;
  session_id: string;
  operation: AuditLedgerWriterPolicyGateOperation;
  resource_refs: string[];
  capability: string;
  writer_capability: typeof AUDIT_LEDGER_WRITER_CAPABILITY;
  risk_level: number;
  decision: PolicyDecisionKind;
  requires_approval: boolean;
  reason_codes: AuditLedgerWriterPolicyGateReasonCode[];
  side_effects: [];
  created_at: string;
};

export type AuditLedgerWriterApprovalRequestKind =
  | "writer_creation"
  | "audit_ledger_migration"
  | "retention_policy_change"
  | "ledger_state_change";

export type AuditLedgerWriterApprovalRequestReasonCode =
  | AuditLedgerWriterPolicyGateReasonCode
  | "approval.audit_ledger_writer_policy_gate_required"
  | "approval.audit_ledger_writer_not_required";

export type AuditLedgerWriterApprovalRequest = {
  contract_id: typeof AUDIT_LEDGER_WRITER_APPROVAL_REQUEST_CONTRACT_ID;
  approval_request_id: string;
  approval_status: "requested";
  approval_kind: AuditLedgerWriterApprovalRequestKind;
  request_id: string;
  actor_id: string;
  session_id: string;
  operation: AuditLedgerWriterPolicyGateOperation;
  resource_refs: string[];
  requested_capability: string;
  writer_capability: typeof AUDIT_LEDGER_WRITER_CAPABILITY;
  risk_level: number;
  policy_gate_ref: {
    contract_id: typeof AUDIT_LEDGER_WRITER_POLICY_GATE_CONTRACT_ID;
    decision_id: string;
    decision: "approval_required";
    requires_approval: true;
    reason_codes: AuditLedgerWriterPolicyGateReasonCode[];
  };
  approver_scope: "owner_or_admin";
  evidence_refs: string[];
  reason_codes: AuditLedgerWriterApprovalRequestReasonCode[];
  side_effects: [];
  created_at: string;
};

export type AuditLedgerWriterApprovalRequestResult =
  | {
      ok: true;
      approval_request: AuditLedgerWriterApprovalRequest;
      reason_codes: AuditLedgerWriterApprovalRequestReasonCode[];
      side_effects: [];
    }
  | {
      ok: false;
      approval_request: null;
      reason_codes: ["approval.audit_ledger_writer_not_required"];
      side_effects: [];
    };

export type AuditLedgerMigrationApprovalPreviewArtifactRefs = {
  sql_artifact: string;
  manifest_artifact: string;
  static_checker: string;
  review_evidence_refs: string[];
  source_packet_refs: string[];
};

export type AuditLedgerMigrationApprovalPreviewInput = {
  request_id: string;
  actor_id: string;
  session_id: string;
  resource_refs?: string[];
  risk_level?: number;
  artifact_refs?: Partial<AuditLedgerMigrationApprovalPreviewArtifactRefs>;
};

export type AuditLedgerMigrationApprovalEvidencePreview = {
  contract_id: typeof AUDIT_LEDGER_MIGRATION_APPROVAL_PREVIEW_CONTRACT_ID;
  preview_id: string;
  request_id: string;
  actor_id: string;
  session_id: string;
  operation: "writer.migrate";
  artifact_refs: AuditLedgerMigrationApprovalPreviewArtifactRefs;
  policy_gate_decision: AuditLedgerWriterPolicyGateDecision & {
    operation: "writer.migrate";
    decision: "approval_required";
    requires_approval: true;
  };
  approval_request: AuditLedgerWriterApprovalRequest & {
    operation: "writer.migrate";
    approval_kind: "audit_ledger_migration";
  };
  static_checker_required: {
    command: "npm run audit:migrations:check";
    source_ref: "scripts/check-audit-ledger-migrations.mjs";
    side_effects: [];
  };
  live_execution_allowed: false;
  source_refs: string[];
  reason_codes: AuditLedgerWriterApprovalRequestReasonCode[];
  side_effects: [];
  created_at: string;
};

const defaultAuditLedgerMigrationApprovalPreviewArtifactRefs: AuditLedgerMigrationApprovalPreviewArtifactRefs =
  {
    sql_artifact: "packages/audit/migrations/postgresql/0001_audit_events_v0_1.sql",
    manifest_artifact:
      "packages/audit/migrations/postgresql/0001_audit_events_v0_1.manifest.json",
    static_checker: "scripts/check-audit-ledger-migrations.mjs",
    review_evidence_refs: [
      "fixtures/audit/migration-review.md",
      "fixtures/audit/migration-review.md",
      "fixtures/audit/migration-review.md",
    ],
    source_packet_refs: ["BP-0039", "BP-0040", "BP-0044", "BP-0045"],
  };

const forbiddenCapabilities = new Set([
  "secret.read.never",
  "ssh",
  "root",
  "database.write",
  "database.prod.write",
  "billing.write",
  "security.write",
  "destructive.execute",
]);

const approvalGatedCapabilities = new Set([
  "service.restart.request",
  "runbook.execute.approved",
  "secret.use.brokered",
  "deploy.request",
  "deploy.execute.approved",
  "database.migration.approved",
]);

const readOnlyAuditLedgerPreviewCapabilitiesByOperation: Record<
  Extract<
    AuditLedgerWriterPolicyGateOperation,
    "preview.read" | "preview.validate" | "ui.preview.render"
  >,
  string
> = {
  "preview.read": "audit.ledger.preview.read",
  "preview.validate": "audit.ledger.preview.validate",
  "ui.preview.render": "audit.ledger.preview.render",
};

const approvalRequiredAuditLedgerOperations: Record<
  Exclude<
    AuditLedgerWriterPolicyGateOperation,
    "preview.read" | "preview.validate" | "ui.preview.render"
  >,
  AuditLedgerWriterPolicyGateReasonCode
> = {
  "writer.create": "policy.audit_ledger_writer_creation_requires_approval",
  "writer.migrate": "policy.audit_ledger_migration_requires_approval",
  "retention.change": "policy.audit_ledger_retention_change_requires_approval",
  "ledger.record.append": "policy.audit_ledger_state_change_requires_approval",
  "ledger.record.correct": "policy.audit_ledger_state_change_requires_approval",
  "ledger.record.retry": "policy.audit_ledger_state_change_requires_approval",
};

export function decideUniversalPacketPolicy(
  packet: UniversalPacket,
  options: PolicyDecisionOptions = {},
): PolicyDecision {
  const requestedCapabilities = packet.permission_envelope.allow;
  const blockedCapabilities = new Set(packet.permission_envelope.block);
  const reasonCodes: PolicyReasonCode[] = [];

  if (requestedCapabilities.some((capability) => blockedCapabilities.has(capability))) {
    reasonCodes.push("policy.capability_blocked");
  }

  if (
    requestedCapabilities.some((capability) => forbiddenCapabilities.has(capability))
  ) {
    reasonCodes.push("policy.capability_forbidden");
  }

  if (reasonCodes.length === 0) {
    if (packet.requires_approval) {
      reasonCodes.push("policy.packet_requires_approval");
    }

    if (packet.risk_level >= 5) {
      reasonCodes.push("policy.risk_requires_approval");
    }

    if (
      requestedCapabilities.some((capability) =>
        approvalGatedCapabilities.has(capability),
      )
    ) {
      reasonCodes.push("policy.capability_requires_approval");
    }
  }

  const decision = selectDecision(reasonCodes);

  return {
    decision_id: policyDecisionId(packet.packet_id),
    packet_id: packet.packet_id,
    actor_id: packet.actor_id,
    session_id: packet.session_id,
    resource_refs: packet.resource_refs,
    capability: requestedCapabilities[0] ?? "none",
    risk_level: packet.risk_level,
    decision,
    requires_approval: decision === "approval_required",
    reason_codes: dedupeReasonCodes(reasonCodes),
    created_at: (options.now ?? new Date()).toISOString(),
  };
}

export function decideAuditLedgerWriterPolicyGate(
  input: AuditLedgerWriterPolicyGateInput,
  options: PolicyDecisionOptions = {},
): AuditLedgerWriterPolicyGateDecision {
  const readOnlyCapability =
    input.operation in readOnlyAuditLedgerPreviewCapabilitiesByOperation
      ? readOnlyAuditLedgerPreviewCapabilitiesByOperation[
          input.operation as keyof typeof readOnlyAuditLedgerPreviewCapabilitiesByOperation
        ]
      : undefined;
  const reasonCode =
    input.operation in approvalRequiredAuditLedgerOperations
      ? approvalRequiredAuditLedgerOperations[
          input.operation as keyof typeof approvalRequiredAuditLedgerOperations
        ]
      : undefined;
  const requiresApproval = reasonCode !== undefined;

  return {
    contract_id: AUDIT_LEDGER_WRITER_POLICY_GATE_CONTRACT_ID,
    decision_id: policyDecisionId(input.request_id),
    request_id: input.request_id,
    actor_id: input.actor_id,
    session_id: input.session_id,
    operation: input.operation,
    resource_refs: input.resource_refs,
    capability:
      input.requested_capability ??
      readOnlyCapability ??
      AUDIT_LEDGER_WRITER_CAPABILITY,
    writer_capability: AUDIT_LEDGER_WRITER_CAPABILITY,
    risk_level:
      input.risk_level ??
      (input.operation === "preview.read" ||
      input.operation === "preview.validate" ||
      input.operation === "ui.preview.render"
        ? 0
        : 7),
    decision: requiresApproval ? "approval_required" : "allow",
    requires_approval: requiresApproval,
    reason_codes: reasonCode === undefined ? [] : [reasonCode],
    side_effects: [],
    created_at: (options.now ?? new Date()).toISOString(),
  };
}

export function createAuditLedgerWriterApprovalRequest(
  policyGateDecision: AuditLedgerWriterPolicyGateDecision,
  options: PolicyDecisionOptions = {},
): AuditLedgerWriterApprovalRequestResult {
  if (!policyGateDecision.requires_approval) {
    return {
      ok: false,
      approval_request: null,
      reason_codes: ["approval.audit_ledger_writer_not_required"],
      side_effects: [],
    };
  }

  return {
    ok: true,
    approval_request: {
      contract_id: AUDIT_LEDGER_WRITER_APPROVAL_REQUEST_CONTRACT_ID,
      approval_request_id: approvalRequestId(policyGateDecision.request_id),
      approval_status: "requested",
      approval_kind: approvalKindForAuditLedgerOperation(policyGateDecision.operation),
      request_id: policyGateDecision.request_id,
      actor_id: policyGateDecision.actor_id,
      session_id: policyGateDecision.session_id,
      operation: policyGateDecision.operation,
      resource_refs: policyGateDecision.resource_refs,
      requested_capability: policyGateDecision.capability,
      writer_capability: AUDIT_LEDGER_WRITER_CAPABILITY,
      risk_level: policyGateDecision.risk_level,
      policy_gate_ref: {
        contract_id: AUDIT_LEDGER_WRITER_POLICY_GATE_CONTRACT_ID,
        decision_id: policyGateDecision.decision_id,
        decision: "approval_required",
        requires_approval: true,
        reason_codes: policyGateDecision.reason_codes,
      },
      approver_scope: "owner_or_admin",
      evidence_refs: [
        `policy:${policyGateDecision.decision_id}`,
        `contract:${AUDIT_LEDGER_WRITER_POLICY_GATE_CONTRACT_ID}`,
        `capability:${AUDIT_LEDGER_WRITER_CAPABILITY}`,
      ],
      reason_codes: [
        "approval.audit_ledger_writer_policy_gate_required",
        ...policyGateDecision.reason_codes,
      ],
      side_effects: [],
      created_at: (options.now ?? new Date()).toISOString(),
    },
    reason_codes: [
      "approval.audit_ledger_writer_policy_gate_required",
      ...policyGateDecision.reason_codes,
    ],
    side_effects: [],
  };
}

export function createAuditLedgerMigrationApprovalEvidencePreview(
  input: AuditLedgerMigrationApprovalPreviewInput,
  options: PolicyDecisionOptions = {},
): AuditLedgerMigrationApprovalEvidencePreview {
  const artifactRefs = mergeAuditLedgerMigrationArtifactRefs(input.artifact_refs);
  const resourceRefs = input.resource_refs ?? [
    "ledger:audit_events",
    `artifact:${artifactRefs.sql_artifact}`,
    `manifest:${artifactRefs.manifest_artifact}`,
    `checker:${artifactRefs.static_checker}`,
  ];
  const policyGateInput: AuditLedgerWriterPolicyGateInput = {
    request_id: input.request_id,
    actor_id: input.actor_id,
    session_id: input.session_id,
    operation: "writer.migrate",
    resource_refs: resourceRefs,
    requested_capability: AUDIT_LEDGER_WRITER_CAPABILITY,
  };

  if (input.risk_level !== undefined) {
    policyGateInput.risk_level = input.risk_level;
  }

  const policyGateDecision = decideAuditLedgerWriterPolicyGate(
    policyGateInput,
    options,
  );
  const approvalResult = createAuditLedgerWriterApprovalRequest(
    policyGateDecision,
    options,
  );

  if (!approvalResult.ok) {
    throw new Error("writer.migrate approval preview requires approval evidence.");
  }

  const approvalRequest = approvalResult.approval_request;

  return {
    contract_id: AUDIT_LEDGER_MIGRATION_APPROVAL_PREVIEW_CONTRACT_ID,
    preview_id: approvalPreviewId(input.request_id),
    request_id: input.request_id,
    actor_id: input.actor_id,
    session_id: input.session_id,
    operation: "writer.migrate",
    artifact_refs: artifactRefs,
    policy_gate_decision: {
      ...policyGateDecision,
      operation: "writer.migrate",
      decision: "approval_required",
      requires_approval: true,
    },
    approval_request: {
      ...approvalRequest,
      operation: "writer.migrate",
      approval_kind: "audit_ledger_migration",
    },
    static_checker_required: {
      command: "npm run audit:migrations:check",
      source_ref: "scripts/check-audit-ledger-migrations.mjs",
      side_effects: [],
    },
    live_execution_allowed: false,
    source_refs: [
      `contract:${AUDIT_LEDGER_WRITER_POLICY_GATE_CONTRACT_ID}`,
      `contract:${AUDIT_LEDGER_WRITER_APPROVAL_REQUEST_CONTRACT_ID}`,
      `artifact:${artifactRefs.sql_artifact}`,
      `manifest:${artifactRefs.manifest_artifact}`,
      `checker:${artifactRefs.static_checker}`,
      ...artifactRefs.review_evidence_refs.map((ref) => `review:${ref}`),
      ...artifactRefs.source_packet_refs.map((ref) => `packet:${ref}`),
    ],
    reason_codes: approvalResult.reason_codes,
    side_effects: [],
    created_at: (options.now ?? new Date()).toISOString(),
  };
}

function approvalKindForAuditLedgerOperation(
  operation: AuditLedgerWriterPolicyGateOperation,
): AuditLedgerWriterApprovalRequestKind {
  if (operation === "writer.create") {
    return "writer_creation";
  }

  if (operation === "writer.migrate") {
    return "audit_ledger_migration";
  }

  if (operation === "retention.change") {
    return "retention_policy_change";
  }

  return "ledger_state_change";
}

function selectDecision(reasonCodes: PolicyReasonCode[]): PolicyDecisionKind {
  if (
    reasonCodes.includes("policy.capability_blocked") ||
    reasonCodes.includes("policy.capability_forbidden")
  ) {
    return "deny";
  }

  if (reasonCodes.length > 0) {
    return "approval_required";
  }

  return "allow";
}

function policyDecisionId(packetId: string): string {
  return `pol_${packetId.replace(/^pkt_/, "")}`;
}

function approvalRequestId(requestId: string): string {
  return `apr_${requestId.replace(/^req_/, "")}`;
}

function approvalPreviewId(requestId: string): string {
  return `aprev_${requestId.replace(/^req_/, "")}`;
}

function mergeAuditLedgerMigrationArtifactRefs(
  overrides: Partial<AuditLedgerMigrationApprovalPreviewArtifactRefs> = {},
): AuditLedgerMigrationApprovalPreviewArtifactRefs {
  return {
    ...defaultAuditLedgerMigrationApprovalPreviewArtifactRefs,
    ...overrides,
    review_evidence_refs:
      overrides.review_evidence_refs ??
      defaultAuditLedgerMigrationApprovalPreviewArtifactRefs.review_evidence_refs,
    source_packet_refs:
      overrides.source_packet_refs ??
      defaultAuditLedgerMigrationApprovalPreviewArtifactRefs.source_packet_refs,
  };
}

function dedupeReasonCodes(reasonCodes: PolicyReasonCode[]): PolicyReasonCode[] {
  return [...new Set(reasonCodes)];
}
