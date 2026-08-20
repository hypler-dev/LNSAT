import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createMcpHandler,
  legacyStatelessFallback,
  McpServer,
  type CallToolResult,
  type McpRequestContext,
} from "@modelcontextprotocol/server";
import { serveStdio, StdioServerTransport } from "@modelcontextprotocol/server/stdio";
import { z } from "zod";
import {
  inspectPacketGatewayRequest,
  packetInspectionGatewayContract,
  type PacketInspectionGatewayResponse,
} from "@lnsat/gateway";
import {
  agentContextFirewallGatewayContract,
  auditLedgerDatabaseSecurityPreflightGatewayContract,
  auditLedgerMigrationApprovalPreviewGatewayContract,
  auditLedgerPersistenceReadinessGatewayContract,
  auditLedgerPersistenceScopeRequestGatewayContract,
  auditLedgerWriterInterfaceGatewayContract,
  auditLedgerWriterPersistencePreflightGatewayContract,
  adapterInvocationResultGatewayContract,
  adapterInvocationAuthorizationBundleGatewayContract,
  adapterInvocationPreflightGatewayContract,
  capabilityBrokerRequestGatewayContract,
  inspectAgentContextFirewallGatewayRequest,
  inspectAuditLedgerDatabaseSecurityPreflightGatewayRequest,
  inspectAuditLedgerMigrationApprovalPreviewGatewayRequest,
  inspectAuditLedgerPersistenceReadinessGatewayRequest,
  inspectAuditLedgerPersistenceScopeRequestGatewayRequest,
  inspectAuditLedgerWriterInterfaceGatewayRequest,
  inspectAuditLedgerWriterPersistencePreflightGatewayRequest,
  inspectAdapterInvocationResultGatewayRequest,
  inspectAdapterInvocationAuthorizationBundleGatewayRequest,
  inspectAdapterInvocationPreflightGatewayRequest,
  inspectCapabilityBrokerRequestGatewayRequest,
  inspectHardwareInventoryGatewayRequest,
  inspectHardwareAllocationRecommendationGatewayRequest,
  inspectPerformanceTelemetryGatewayRequest,
  inspectProjectStateGatewayRequest,
  inspectKnowledgeGatewayContextCompileRequest,
  inspectKnowledgeGatewaySearchRequest,
  inspectKnowledgeGatewaySourcesRequest,
  inspectRuntimeAdapterImplementationDryRunEvidenceGatewayRequest,
  inspectRuntimeAdapterImplementationScopeGatewayRequest,
  inspectRuntimeAdapterImplementationAuthorizationRequestGatewayRequest,
  inspectRuntimeAdapterImplementationApprovalGateGatewayRequest,
  inspectRuntimeAdapterImplementationPlanGatewayRequest,
  inspectRuntimeAdapterReadinessGateGatewayRequest,
  inspectServiceDatabaseInventoryGatewayRequest,
  inspectSubstrateAdapterManifestGatewayRequest,
  inspectSubstrateControlIntentGatewayRequest,
  knowledgeGatewayContextCompileContract,
  knowledgeGatewaySearchContract,
  knowledgeGatewaySourcesContract,
  hardwareInventoryInspectionGatewayContract,
  hardwareAllocationRecommendationInspectionGatewayContract,
  performanceTelemetryInspectionGatewayContract,
  projectStateGatewayContract,
  inspectOnboardingContextGatewayRequest,
  inspectOnboardingProfileGatewayRequest,
  onboardingContextInspectionGatewayContract,
  onboardingProfileInspectionGatewayContract,
  runtimeAdapterReadinessGateGatewayContract,
  runtimeAdapterImplementationDryRunEvidenceGatewayContract,
  runtimeAdapterImplementationScopeGatewayContract,
  runtimeAdapterImplementationAuthorizationRequestGatewayContract,
  runtimeAdapterImplementationApprovalGateGatewayContract,
  runtimeAdapterImplementationPlanGatewayContract,
  serviceDatabaseInventoryGatewayContract,
  substrateAdapterManifestGatewayContract,
  substrateControlIntentGatewayContract,
  type AuditLedgerDatabaseSecurityPreflightGatewayResponse,
  type AuditLedgerMigrationApprovalPreviewGatewayResponse,
  type AuditLedgerPersistenceReadinessGatewayResponse,
  type AuditLedgerPersistenceScopeRequestGatewayResponse,
  type AuditLedgerWriterInterfaceGatewayResponse,
  type AuditLedgerWriterPersistencePreflightGatewayResponse,
  type AdapterInvocationResultGatewayResponse,
  type AdapterInvocationAuthorizationBundleGatewayResponse,
  type AdapterInvocationPreflightGatewayResponse,
  type CapabilityBrokerRequestGatewayResponse,
  type AgentContextFirewallGatewayResponse,
  type KnowledgeGatewayContextCompileResponse,
  type KnowledgeGatewaySearchResponse,
  type KnowledgeGatewaySourcesResponse,
  type HardwareInventoryInspectionGatewayRequest,
  type HardwareInventoryInspectionGatewayResponse,
  type HardwareAllocationRecommendationInspectionGatewayResponse,
  type PerformanceTelemetryInspectionGatewayRequest,
  type PerformanceTelemetryInspectionGatewayResponse,
  type ProjectStateGatewayResponse,
  type RuntimeAdapterImplementationDryRunEvidenceGatewayResponse,
  type RuntimeAdapterImplementationScopeGatewayResponse,
  type RuntimeAdapterImplementationAuthorizationRequestGatewayResponse,
  type RuntimeAdapterImplementationApprovalGateGatewayResponse,
  type RuntimeAdapterImplementationPlanGatewayResponse,
  type RuntimeAdapterReadinessGateGatewayResponse,
  type OnboardingContextInspectionGatewayResponse,
  type OnboardingProfileInspectionGatewayResponse,
  type ServiceDatabaseInventoryGatewayResponse,
  type SubstrateAdapterManifestGatewayResponse,
  type SubstrateControlIntentGatewayResponse,
} from "@lnsat/api";
import { MCP_MODERN_PROTOCOL_VERSION, type McpProtocolMode } from "./negotiation.js";
import {
  authenticateMcpHttpAccess,
  mcpAccessAdmissionFailureResponse,
  type McpAccessPrincipal,
  type McpHttpAccessPolicy,
} from "./oauth-security.js";
import { validateMcpJsonOutput } from "./schema-security.js";
import {
  MCP_STDIO_MAX_BUFFER_BYTES,
  MCP_STDIO_MAX_SUBSCRIPTIONS,
  prepareLnsatMcpHttpRequest,
} from "./transport-security.js";

export {
  MCP_MODERN_PROTOCOL_VERSION,
  McpNegotiationCache,
  negotiateMcpEndpoint,
} from "./negotiation.js";
export type {
  McpNegotiatedProtocol,
  McpNegotiationFailure,
  McpNegotiationProbeOutcome,
  McpNegotiationResult,
  McpProtocolEra,
  McpProtocolMode,
} from "./negotiation.js";
export * from "./schema-security.js";
export * from "./transport-security.js";
export * from "./oauth-security.js";

export const MCP_ADAPTER_STATUS = "read_only";
export const MCP_SERVER_STATUS = "read_only";
export const MCP_STDIO_SMOKE_STATUS = "read_only";
export const MCP_OFFICIAL_STDIO_STATUS = "read_only";
export const MCP_BUILD_PACKET_STATE_STATUS = "read_only";
export const MCP_ONBOARDING_PROFILE_INSPECTION_STATUS = "read_only";
export const MCP_ONBOARDING_PROFILE_SERVER_REGISTRATION_STATUS = "read_only";
export const MCP_ONBOARDING_CONTEXT_INSPECTION_STATUS = "read_only";
export const MCP_ONBOARDING_CONTEXT_SERVER_REGISTRATION_STATUS = "read_only";
export const MCP_AUDIT_LEDGER_MIGRATION_APPROVAL_PREVIEW_INSPECTION_STATUS =
  "read_only";
export const MCP_AUDIT_LEDGER_MIGRATION_APPROVAL_PREVIEW_SERVER_REGISTRATION_STATUS =
  "read_only";
export const MCP_AUDIT_LEDGER_WRITER_INTERFACE_INSPECTION_STATUS = "read_only";
export const MCP_AUDIT_LEDGER_WRITER_INTERFACE_SERVER_REGISTRATION_STATUS = "read_only";
export const MCP_AUDIT_LEDGER_WRITER_PERSISTENCE_PREFLIGHT_INSPECTION_STATUS =
  "read_only";
export const MCP_AUDIT_LEDGER_WRITER_PERSISTENCE_PREFLIGHT_SERVER_REGISTRATION_STATUS =
  "read_only";
export const MCP_AUDIT_LEDGER_DATABASE_SECURITY_PREFLIGHT_INSPECTION_STATUS =
  "read_only";
export const MCP_AUDIT_LEDGER_DATABASE_SECURITY_PREFLIGHT_SERVER_REGISTRATION_STATUS =
  "read_only";
export const MCP_AUDIT_LEDGER_PERSISTENCE_READINESS_INSPECTION_STATUS = "read_only";
export const MCP_AUDIT_LEDGER_PERSISTENCE_READINESS_SERVER_REGISTRATION_STATUS =
  "read_only";
export const MCP_AUDIT_LEDGER_PERSISTENCE_SCOPE_REQUEST_INSPECTION_STATUS = "read_only";
export const MCP_AUDIT_LEDGER_PERSISTENCE_SCOPE_REQUEST_SERVER_REGISTRATION_STATUS =
  "read_only";
export const MCP_SERVICE_DATABASE_INVENTORY_INSPECTION_STATUS = "read_only";
export const MCP_SERVICE_DATABASE_INVENTORY_SERVER_REGISTRATION_STATUS = "read_only";
export const MCP_HARDWARE_INVENTORY_INSPECTION_STATUS = "read_only";
export const MCP_HARDWARE_INVENTORY_SERVER_REGISTRATION_STATUS = "read_only";
export const MCP_HARDWARE_ALLOCATION_RECOMMENDATION_INSPECTION_STATUS = "read_only";
export const MCP_HARDWARE_ALLOCATION_RECOMMENDATION_SERVER_REGISTRATION_STATUS =
  "read_only";
export const MCP_PERFORMANCE_TELEMETRY_INSPECTION_STATUS = "read_only";
export const MCP_PERFORMANCE_TELEMETRY_SERVER_REGISTRATION_STATUS = "read_only";
export const MCP_SUBSTRATE_CONTROL_INTENT_INSPECTION_STATUS = "read_only";
export const MCP_SUBSTRATE_CONTROL_INTENT_SERVER_REGISTRATION_STATUS = "read_only";
export const MCP_AGENT_CONTEXT_FIREWALL_INSPECTION_STATUS = "read_only";
export const MCP_AGENT_CONTEXT_FIREWALL_SERVER_REGISTRATION_STATUS = "read_only";
export const MCP_CAPABILITY_BROKER_REQUEST_INSPECTION_STATUS = "read_only";
export const MCP_CAPABILITY_BROKER_REQUEST_SERVER_REGISTRATION_STATUS = "read_only";
export const MCP_SUBSTRATE_ADAPTER_MANIFEST_INSPECTION_STATUS = "read_only";
export const MCP_SUBSTRATE_ADAPTER_MANIFEST_SERVER_REGISTRATION_STATUS = "read_only";
export const MCP_ADAPTER_INVOCATION_PREFLIGHT_INSPECTION_STATUS = "read_only";
export const MCP_ADAPTER_INVOCATION_PREFLIGHT_SERVER_REGISTRATION_STATUS = "read_only";
export const MCP_ADAPTER_INVOCATION_RESULT_INSPECTION_STATUS = "read_only";
export const MCP_ADAPTER_INVOCATION_RESULT_SERVER_REGISTRATION_STATUS = "read_only";
export const MCP_ADAPTER_INVOCATION_AUTHORIZATION_BUNDLE_INSPECTION_STATUS =
  "read_only";
export const MCP_ADAPTER_INVOCATION_AUTHORIZATION_BUNDLE_SERVER_REGISTRATION_STATUS =
  "read_only";
export const MCP_RUNTIME_ADAPTER_READINESS_GATE_INSPECTION_STATUS = "read_only";
export const MCP_RUNTIME_ADAPTER_READINESS_GATE_SERVER_REGISTRATION_STATUS =
  "read_only";
export const MCP_RUNTIME_ADAPTER_IMPLEMENTATION_SCOPE_INSPECTION_STATUS = "read_only";
export const MCP_RUNTIME_ADAPTER_IMPLEMENTATION_SCOPE_SERVER_REGISTRATION_STATUS =
  "read_only";
export const MCP_RUNTIME_ADAPTER_IMPLEMENTATION_PLAN_INSPECTION_STATUS = "read_only";
export const MCP_RUNTIME_ADAPTER_IMPLEMENTATION_PLAN_SERVER_REGISTRATION_STATUS =
  "read_only";
export const MCP_RUNTIME_ADAPTER_IMPLEMENTATION_AUTHORIZATION_REQUEST_INSPECTION_STATUS =
  "read_only";
export const MCP_RUNTIME_ADAPTER_IMPLEMENTATION_AUTHORIZATION_REQUEST_SERVER_REGISTRATION_STATUS =
  "read_only";
export const MCP_RUNTIME_ADAPTER_IMPLEMENTATION_APPROVAL_GATE_INSPECTION_STATUS =
  "read_only";
export const MCP_RUNTIME_ADAPTER_IMPLEMENTATION_APPROVAL_GATE_SERVER_REGISTRATION_STATUS =
  "read_only";
export const MCP_RUNTIME_ADAPTER_IMPLEMENTATION_DRY_RUN_EVIDENCE_INSPECTION_STATUS =
  "read_only";
export const MCP_RUNTIME_ADAPTER_IMPLEMENTATION_DRY_RUN_EVIDENCE_SERVER_REGISTRATION_STATUS =
  "read_only";
export const MCP_KNOWLEDGE_SURFACE_INSPECTION_STATUS = "read_only";
export const MCP_KNOWLEDGE_SURFACE_SERVER_REGISTRATION_STATUS = "read_only";

const legacyMcpWireStatus = {
  MCP_SERVER_STATUS: "bp-0013-read-only-server-registration",
  MCP_STDIO_SMOKE_STATUS: "bp-0014-stdio-smoke-gate",
  MCP_OFFICIAL_STDIO_STATUS: "bp-0015-official-sdk-local-stdio-transport",
  PROJECT_STATE_STATUS: "bp-0017-read-only-build-packet-state-contract",
  MCP_ONBOARDING_PROFILE_SERVER_REGISTRATION_STATUS:
    "bp-0026-read-only-onboarding-profile-server-registration",
  MCP_ONBOARDING_CONTEXT_SERVER_REGISTRATION_STATUS:
    "bp-0032-read-only-onboarding-context-server-registration",
  MCP_AUDIT_LEDGER_MIGRATION_APPROVAL_PREVIEW_SERVER_REGISTRATION_STATUS:
    "bp-0051-read-only-audit-ledger-migration-approval-preview-registration",
  MCP_AUDIT_LEDGER_WRITER_INTERFACE_SERVER_REGISTRATION_STATUS:
    "bp-0057-read-only-audit-ledger-writer-interface-registration",
  MCP_AUDIT_LEDGER_WRITER_PERSISTENCE_PREFLIGHT_SERVER_REGISTRATION_STATUS:
    "bp-0064-read-only-audit-ledger-writer-persistence-preflight-registration",
  MCP_AUDIT_LEDGER_DATABASE_SECURITY_PREFLIGHT_SERVER_REGISTRATION_STATUS:
    "bp-0070-read-only-audit-ledger-database-security-preflight-registration",
  MCP_AUDIT_LEDGER_PERSISTENCE_READINESS_SERVER_REGISTRATION_STATUS:
    "bp-0076-read-only-audit-ledger-persistence-readiness-registration",
  MCP_AUDIT_LEDGER_PERSISTENCE_SCOPE_REQUEST_SERVER_REGISTRATION_STATUS:
    "bp-0080-read-only-audit-ledger-persistence-scope-request-registration",
  MCP_SERVICE_DATABASE_INVENTORY_SERVER_REGISTRATION_STATUS:
    "bp-0094-read-only-service-database-inventory-registration",
  MCP_HARDWARE_INVENTORY_INSPECTION_STATUS:
    "bp-0851-read-only-hardware-inventory-mcp-adapter",
  MCP_HARDWARE_INVENTORY_SERVER_REGISTRATION_STATUS:
    "bp-0851-read-only-hardware-inventory-mcp-registration",
  MCP_HARDWARE_ALLOCATION_RECOMMENDATION_INSPECTION_STATUS:
    "bp-0857-read-only-hardware-allocation-recommendation-mcp-adapter",
  MCP_HARDWARE_ALLOCATION_RECOMMENDATION_SERVER_REGISTRATION_STATUS:
    "bp-0857-read-only-hardware-allocation-recommendation-mcp-registration",
  MCP_PERFORMANCE_TELEMETRY_INSPECTION_STATUS:
    "bp-0854-read-only-performance-telemetry-mcp-adapter",
  MCP_PERFORMANCE_TELEMETRY_SERVER_REGISTRATION_STATUS:
    "bp-0854-read-only-performance-telemetry-mcp-registration",
  MCP_SUBSTRATE_CONTROL_INTENT_SERVER_REGISTRATION_STATUS:
    "bp-0100-read-only-substrate-control-intent-registration",
  MCP_AGENT_CONTEXT_FIREWALL_SERVER_REGISTRATION_STATUS:
    "bp-0505-read-only-agent-context-firewall-registration",
  MCP_CAPABILITY_BROKER_REQUEST_SERVER_REGISTRATION_STATUS:
    "bp-0106-read-only-capability-broker-request-registration",
  MCP_SUBSTRATE_ADAPTER_MANIFEST_SERVER_REGISTRATION_STATUS:
    "bp-0112-read-only-substrate-adapter-manifest-registration",
  MCP_ADAPTER_INVOCATION_PREFLIGHT_SERVER_REGISTRATION_STATUS:
    "bp-0118-read-only-adapter-invocation-preflight-registration",
  MCP_ADAPTER_INVOCATION_RESULT_SERVER_REGISTRATION_STATUS:
    "bp-0124-read-only-adapter-invocation-result-registration",
  MCP_ADAPTER_INVOCATION_AUTHORIZATION_BUNDLE_SERVER_REGISTRATION_STATUS:
    "bp-0130-read-only-adapter-invocation-authorization-bundle-registration",
  MCP_RUNTIME_ADAPTER_READINESS_GATE_SERVER_REGISTRATION_STATUS:
    "bp-0136-read-only-runtime-adapter-readiness-gate-registration",
  MCP_RUNTIME_ADAPTER_IMPLEMENTATION_SCOPE_SERVER_REGISTRATION_STATUS:
    "bp-0142-read-only-runtime-adapter-implementation-scope-registration",
  MCP_RUNTIME_ADAPTER_IMPLEMENTATION_PLAN_SERVER_REGISTRATION_STATUS:
    "bp-0148-read-only-runtime-adapter-implementation-plan-registration",
  MCP_RUNTIME_ADAPTER_IMPLEMENTATION_AUTHORIZATION_REQUEST_SERVER_REGISTRATION_STATUS:
    "bp-0154-read-only-runtime-adapter-implementation-authorization-request-registration",
  MCP_RUNTIME_ADAPTER_IMPLEMENTATION_APPROVAL_GATE_SERVER_REGISTRATION_STATUS:
    "bp-0160-read-only-runtime-adapter-implementation-approval-gate-registration",
  MCP_RUNTIME_ADAPTER_IMPLEMENTATION_DRY_RUN_EVIDENCE_SERVER_REGISTRATION_STATUS:
    "bp-0167-read-only-runtime-adapter-implementation-dry-run-evidence-registration",
  MCP_KNOWLEDGE_SURFACE_SERVER_REGISTRATION_STATUS:
    "bp-0195-read-only-knowledge-surface-registration",
} as const;

export const mcpStdioTransportDecision = {
  status: legacyMcpWireStatus.MCP_STDIO_SMOKE_STATUS,
  official_sdk_track: "v2.x",
  official_sdk_package: "@modelcontextprotocol/server",
  target_transport_import: "@modelcontextprotocol/server/stdio",
  target_server_import: "@modelcontextprotocol/server",
  dependency_step: {
    approval_required: true,
    approved_in_bp0014: false,
    package_install_performed: true,
    reason:
      "Historical BP-0014 smoke remains local while the approved MCP 2026 packet supplies the split v2 SDK serving path.",
  },
  local_smoke_gate:
    "newline JSON request/response smoke over BP-0013 server registration; not an official MCP protocol transport",
  side_effects: [],
} as const;

export const mcpOfficialStdioTransportDecision = {
  status: legacyMcpWireStatus.MCP_OFFICIAL_STDIO_STATUS,
  official_sdk_track: "v2.x",
  official_sdk_package: "@modelcontextprotocol/server",
  official_sdk_version_checked: "2.0.0",
  protocol_version: MCP_MODERN_PROTOCOL_VERSION,
  protocol_modes: ["legacy", "auto", MCP_MODERN_PROTOCOL_VERSION],
  target_transport_import: "@modelcontextprotocol/server/stdio",
  target_server_import: "@modelcontextprotocol/server",
  dependency_step: {
    approval_required: true,
    approved_in_bp0015: true,
    package_install_performed: true,
    peer_packages: [
      "@modelcontextprotocol/core",
      "@modelcontextprotocol/node",
      "zod",
      "@cfworker/json-schema",
    ],
    reason:
      "Approved MCP 2026 migration pins official split v2 packages and retains bounded legacy compatibility.",
  },
  local_transport:
    "official StdioServerTransport over BP-0013 read-only server registration; no network listener or live deployment",
  side_effects: [],
} as const;

export const mcpPacketInspectionToolContract = {
  tool: "lnsat.packet.inspect",
  status: "contract_only",
  gateway_contract_id: packetInspectionGatewayContract.contract_id,
  gateway_method: packetInspectionGatewayContract.method,
  gateway_path: packetInspectionGatewayContract.path,
  authority: ["lnsat.gateway.packet_inspection.v0_1"],
  side_effects: [],
} as const;

export const mcpPacketInspectionToolRegistration = {
  name: mcpPacketInspectionToolContract.tool,
  title: "Inspect LNSAT packet",
  description:
    "Read-only packet inspection through the LNSAT Gateway packet inspection contract.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    required: ["packet"],
    properties: {
      request_id: {
        type: "string",
      },
      packet: {
        type: "object",
      },
    },
  },
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  gateway_contract_id: packetInspectionGatewayContract.contract_id,
  authority: ["lnsat.gateway.packet_inspection.v0_1"],
  side_effects: [],
} as const;

export const mcpBuildPacketStateToolContract = {
  tool: "lnsat.build.packet.read",
  status: "contract_only",
  deprecated: true,
  replacement: "lnsat.project.state.inspect.v0_1",
  removal: "not before 2.0.0 after one supported-release deprecation window",
  authority: ["synthetic-project-state-fixtures"],
  source_docs: [
    "fixtures/project-state/status.json",
    "fixtures/project-state/board.md",
    "fixtures/project-state/packet-log.md",
    "fixtures/project-state/packets/*.json",
  ],
  side_effects: [],
} as const;

export const mcpBuildPacketStateToolRegistration = {
  name: mcpBuildPacketStateToolContract.tool,
  title: "Read LNSAT build packet state",
  description: "Read-only project state sourced from synthetic public fixtures.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      request_id: {
        type: "string",
      },
      packet_id: {
        type: "string",
      },
    },
  },
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  authority: ["synthetic-project-state-fixtures"],
  source_docs: mcpBuildPacketStateToolContract.source_docs,
  side_effects: [],
} as const;

export const mcpProjectStateToolContract = {
  tool: "lnsat.project.state.inspect.v0_1",
  status: "contract_only",
  request_version: projectStateGatewayContract.request_version,
  response_version: projectStateGatewayContract.response_version,
  gateway_contract_id: projectStateGatewayContract.contract_id,
  gateway_method: projectStateGatewayContract.method,
  gateway_path: projectStateGatewayContract.path,
  authority: projectStateGatewayContract.authority,
  source_docs: projectStateGatewayContract.source_docs,
  side_effects: [],
} as const;

export const mcpProjectStateToolRegistration = {
  name: mcpProjectStateToolContract.tool,
  title: "Inspect LNSAT project state",
  description:
    "Versioned read-only project-state inspection sourced from synthetic public fixtures.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      request_id: {
        type: "string",
      },
      item_id: {
        type: "string",
      },
    },
  },
  annotations: mcpBuildPacketStateToolRegistration.annotations,
  authority: mcpProjectStateToolContract.authority,
  source_docs: mcpProjectStateToolContract.source_docs,
  side_effects: [],
} as const;

export const mcpOnboardingProfileInspectionToolContract = {
  tool: "lnsat.onboarding.profiles.inspect",
  status: "contract_only",
  gateway_contract_id: onboardingProfileInspectionGatewayContract.contract_id,
  gateway_method: onboardingProfileInspectionGatewayContract.method,
  gateway_path: onboardingProfileInspectionGatewayContract.path,
  authority: ["lnsat.gateway.onboarding_profile_inspection.v0_1"],
  source_docs: onboardingProfileInspectionGatewayContract.source_docs,
  side_effects: [],
} as const;

export const mcpOnboardingProfileInspectionToolRegistration = {
  name: mcpOnboardingProfileInspectionToolContract.tool,
  title: "Inspect LNSAT onboarding profiles",
  description:
    "Read-only onboarding profile inspection through the LNSAT Gateway onboarding profile inspection contract.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      request_id: {
        type: "string",
      },
      profile_kind: {
        type: "string",
        enum: ["project", "agent"],
      },
    },
  },
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  gateway_contract_id: onboardingProfileInspectionGatewayContract.contract_id,
  authority: ["lnsat.gateway.onboarding_profile_inspection.v0_1"],
  source_docs: mcpOnboardingProfileInspectionToolContract.source_docs,
  side_effects: [],
} as const;

export const mcpOnboardingContextInspectionToolContract = {
  tool: "lnsat.onboarding.context.inspect",
  status: "contract_only",
  gateway_contract_id: onboardingContextInspectionGatewayContract.contract_id,
  gateway_method: onboardingContextInspectionGatewayContract.method,
  gateway_path: onboardingContextInspectionGatewayContract.path,
  authority: ["lnsat.gateway.onboarding_context_packet_inspection.v0_1"],
  source_docs: onboardingContextInspectionGatewayContract.source_docs,
  side_effects: [],
} as const;

export const mcpOnboardingContextInspectionToolRegistration = {
  name: mcpOnboardingContextInspectionToolContract.tool,
  title: "Inspect LNSAT onboarding ContextPacket",
  description:
    "Read-only onboarding ContextPacket inspection through the LNSAT Gateway onboarding ContextPacket inspection contract.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      request_id: {
        type: "string",
      },
      session_id: {
        type: "string",
      },
      created_at: {
        type: "string",
      },
    },
  },
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  gateway_contract_id: onboardingContextInspectionGatewayContract.contract_id,
  authority: ["lnsat.gateway.onboarding_context_packet_inspection.v0_1"],
  source_docs: mcpOnboardingContextInspectionToolContract.source_docs,
  side_effects: [],
} as const;

export const mcpAuditLedgerMigrationApprovalPreviewToolContract = {
  tool: "lnsat.audit.ledger.migration.approval_preview.inspect",
  status: "contract_only",
  gateway_contract_id: auditLedgerMigrationApprovalPreviewGatewayContract.contract_id,
  gateway_method: auditLedgerMigrationApprovalPreviewGatewayContract.method,
  gateway_path: auditLedgerMigrationApprovalPreviewGatewayContract.path,
  authority: ["lnsat.gateway.audit_ledger_migration_approval_preview.v0_1"],
  source_docs: auditLedgerMigrationApprovalPreviewGatewayContract.source_docs,
  live_execution_allowed: false,
  side_effects: [],
} as const;

export const mcpAuditLedgerMigrationApprovalPreviewToolRegistration = {
  name: mcpAuditLedgerMigrationApprovalPreviewToolContract.tool,
  title: "Inspect audit ledger migration approval preview",
  description:
    "Read-only audit ledger migration approval preview inspection through the LNSAT Gateway contract.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      request_id: {
        type: "string",
      },
      actor_id: {
        type: "string",
      },
      session_id: {
        type: "string",
      },
    },
  },
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  gateway_contract_id: auditLedgerMigrationApprovalPreviewGatewayContract.contract_id,
  authority: ["lnsat.gateway.audit_ledger_migration_approval_preview.v0_1"],
  source_docs: mcpAuditLedgerMigrationApprovalPreviewToolContract.source_docs,
  live_execution_allowed: false,
  side_effects: [],
} as const;

export const mcpAuditLedgerWriterInterfaceToolContract = {
  tool: "lnsat.audit.ledger.writer_interface.inspect",
  status: "contract_only",
  gateway_contract_id: auditLedgerWriterInterfaceGatewayContract.contract_id,
  gateway_method: auditLedgerWriterInterfaceGatewayContract.method,
  gateway_path: auditLedgerWriterInterfaceGatewayContract.path,
  authority: ["lnsat.gateway.audit_ledger_writer_interface.v0_1"],
  source_docs: auditLedgerWriterInterfaceGatewayContract.source_docs,
  live_execution_allowed: false,
  side_effects: [],
} as const;

export const mcpAuditLedgerWriterInterfaceToolRegistration = {
  name: mcpAuditLedgerWriterInterfaceToolContract.tool,
  title: "Inspect audit ledger writer interface",
  description:
    "Read-only audit ledger writer interface inspection through the LNSAT Gateway contract.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      request_id: {
        type: "string",
      },
      actor_id: {
        type: "string",
      },
      session_id: {
        type: "string",
      },
      approval_evidence: {
        type: "object",
      },
    },
  },
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  gateway_contract_id: auditLedgerWriterInterfaceGatewayContract.contract_id,
  authority: ["lnsat.gateway.audit_ledger_writer_interface.v0_1"],
  source_docs: mcpAuditLedgerWriterInterfaceToolContract.source_docs,
  live_execution_allowed: false,
  side_effects: [],
} as const;

export const mcpAuditLedgerWriterPersistencePreflightToolContract = {
  tool: "lnsat.audit.ledger.writer_persistence_preflight.inspect",
  status: "contract_only",
  gateway_contract_id: auditLedgerWriterPersistencePreflightGatewayContract.contract_id,
  gateway_method: auditLedgerWriterPersistencePreflightGatewayContract.method,
  gateway_path: auditLedgerWriterPersistencePreflightGatewayContract.path,
  authority: ["lnsat.gateway.audit_ledger_writer_persistence_preflight.v0_1"],
  source_docs: [
    ...auditLedgerWriterPersistencePreflightGatewayContract.source_docs,
    "docs/reference/CONTRACT_PROVENANCE.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
    "packages/mcp/src/index.ts",
  ],
  live_execution_allowed: false,
  side_effects: [],
} as const;

export const mcpAuditLedgerWriterPersistencePreflightToolRegistration = {
  name: mcpAuditLedgerWriterPersistencePreflightToolContract.tool,
  title: "Inspect audit writer persistence preflight",
  description:
    "Read-only audit writer persistence preflight inspection through the LNSAT Gateway contract.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      request_id: {
        type: "string",
      },
      actor_id: {
        type: "string",
      },
      session_id: {
        type: "string",
      },
      approval_evidence: {
        type: "object",
      },
      preflight_evidence: {
        type: "object",
      },
    },
  },
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  gateway_contract_id: auditLedgerWriterPersistencePreflightGatewayContract.contract_id,
  authority: ["lnsat.gateway.audit_ledger_writer_persistence_preflight.v0_1"],
  source_docs: mcpAuditLedgerWriterPersistencePreflightToolContract.source_docs,
  live_execution_allowed: false,
  side_effects: [],
} as const;

export const mcpAuditLedgerDatabaseSecurityPreflightToolContract = {
  tool: "lnsat.audit.ledger.database_security_preflight.inspect",
  status: "contract_only",
  gateway_contract_id: auditLedgerDatabaseSecurityPreflightGatewayContract.contract_id,
  gateway_method: auditLedgerDatabaseSecurityPreflightGatewayContract.method,
  gateway_path: auditLedgerDatabaseSecurityPreflightGatewayContract.path,
  authority: ["lnsat.gateway.audit_ledger_database_security_preflight.v0_1"],
  source_docs: [
    ...auditLedgerDatabaseSecurityPreflightGatewayContract.source_docs,
    "docs/reference/CONTRACT_PROVENANCE.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
    "packages/mcp/src/index.ts",
  ],
  live_execution_allowed: false,
  side_effects: [],
} as const;

export const mcpAuditLedgerDatabaseSecurityPreflightToolRegistration = {
  name: mcpAuditLedgerDatabaseSecurityPreflightToolContract.tool,
  title: "Inspect audit ledger database security preflight",
  description:
    "Read-only audit ledger database security preflight inspection through the LNSAT Gateway contract.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      request_id: {
        type: "string",
      },
      actor_id: {
        type: "string",
      },
      session_id: {
        type: "string",
      },
      approval_evidence: {
        type: "object",
      },
      security_evidence: {
        type: "object",
      },
    },
  },
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  gateway_contract_id: auditLedgerDatabaseSecurityPreflightGatewayContract.contract_id,
  authority: ["lnsat.gateway.audit_ledger_database_security_preflight.v0_1"],
  source_docs: mcpAuditLedgerDatabaseSecurityPreflightToolContract.source_docs,
  live_execution_allowed: false,
  side_effects: [],
} as const;

export const mcpAuditLedgerPersistenceReadinessToolContract = {
  tool: "lnsat.audit.ledger.persistence_readiness.inspect",
  status: "contract_only",
  gateway_contract_id: auditLedgerPersistenceReadinessGatewayContract.contract_id,
  gateway_method: auditLedgerPersistenceReadinessGatewayContract.method,
  gateway_path: auditLedgerPersistenceReadinessGatewayContract.path,
  authority: ["lnsat.gateway.audit_ledger_persistence_readiness_gate.v0_1"],
  source_docs: [
    ...auditLedgerPersistenceReadinessGatewayContract.source_docs,
    "docs/reference/CONTRACT_PROVENANCE.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
    "packages/mcp/src/index.ts",
  ],
  live_execution_allowed: false,
  side_effects: [],
} as const;

export const mcpAuditLedgerPersistenceReadinessToolRegistration = {
  name: mcpAuditLedgerPersistenceReadinessToolContract.tool,
  title: "Inspect audit ledger persistence readiness",
  description:
    "Read-only audit ledger persistence readiness inspection through the LNSAT Gateway contract.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      request_id: {
        type: "string",
      },
      actor_id: {
        type: "string",
      },
      session_id: {
        type: "string",
      },
      approval_evidence: {
        type: "object",
      },
      persistence_evidence: {
        type: "object",
      },
      security_evidence: {
        type: "object",
      },
      readiness_evidence: {
        type: "object",
      },
    },
  },
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  gateway_contract_id: auditLedgerPersistenceReadinessGatewayContract.contract_id,
  authority: ["lnsat.gateway.audit_ledger_persistence_readiness_gate.v0_1"],
  source_docs: mcpAuditLedgerPersistenceReadinessToolContract.source_docs,
  live_execution_allowed: false,
  side_effects: [],
} as const;

export const mcpAuditLedgerPersistenceScopeRequestToolContract = {
  tool: "lnsat.audit.ledger.persistence_scope_request.inspect",
  status: "contract_only",
  gateway_contract_id: auditLedgerPersistenceScopeRequestGatewayContract.contract_id,
  gateway_method: auditLedgerPersistenceScopeRequestGatewayContract.method,
  gateway_path: auditLedgerPersistenceScopeRequestGatewayContract.path,
  authority: ["lnsat.gateway.audit_ledger_persistence_scope_request.v0_1"],
  source_docs: Array.from(
    new Set([
      ...auditLedgerPersistenceScopeRequestGatewayContract.source_docs,
      "docs/reference/CONTRACT_PROVENANCE.md",
      "docs/reference/CONTRACT_PROVENANCE.md",
      "packages/mcp/src/index.ts",
    ]),
  ),
  live_execution_allowed: false,
  side_effects: [],
} as const;

export const mcpAuditLedgerPersistenceScopeRequestToolRegistration = {
  name: mcpAuditLedgerPersistenceScopeRequestToolContract.tool,
  title: "Inspect audit ledger persistence scope request",
  description:
    "Read-only audit ledger persistence scope request inspection through the LNSAT Gateway contract.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      request_id: {
        type: "string",
      },
      actor_id: {
        type: "string",
      },
      session_id: {
        type: "string",
      },
      approval_evidence: {
        type: "object",
      },
      readiness_source: {
        type: "object",
      },
      readiness_evidence: {
        type: "object",
      },
      scope_evidence: {
        type: "object",
      },
    },
  },
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  gateway_contract_id: auditLedgerPersistenceScopeRequestGatewayContract.contract_id,
  authority: ["lnsat.gateway.audit_ledger_persistence_scope_request.v0_1"],
  source_docs: mcpAuditLedgerPersistenceScopeRequestToolContract.source_docs,
  live_execution_allowed: false,
  side_effects: [],
} as const;

export const mcpHardwareInventoryInspectionToolContract = Object.freeze({
  tool: "lnsat.hardware.inventory.inspect",
  status: legacyMcpWireStatus.MCP_HARDWARE_INVENTORY_INSPECTION_STATUS,
  gateway_contract_id: hardwareInventoryInspectionGatewayContract.contract_id,
  gateway_method: hardwareInventoryInspectionGatewayContract.method,
  gateway_path: hardwareInventoryInspectionGatewayContract.path,
  authority: Object.freeze([
    hardwareInventoryInspectionGatewayContract.contract_id,
  ] as const),
  source_docs: Object.freeze([
    ...hardwareInventoryInspectionGatewayContract.source_docs,
    "docs/reference/CONTRACT_PROVENANCE.md",
    "packages/mcp/src/index.ts",
  ] as const),
  supplied_inventory_only: true,
  read_only: true,
  recommendation_only: true,
  live_collection_allowed: false,
  hardware_probe_allowed: false,
  node_agent_allowed: false,
  benchmark_allowed: false,
  placement_allowed: false,
  telemetry_collection_allowed: false,
  runtime_allowed: false,
  database_write_allowed: false,
  network_access_allowed: false,
  side_effects: Object.freeze([] as const),
} as const);

export const mcpHardwareInventoryInspectionToolRegistration = Object.freeze({
  name: mcpHardwareInventoryInspectionToolContract.tool,
  title: "Inspect caller-supplied hardware inventory",
  description:
    "Read-only caller-supplied hardware inventory inspection through the LNSAT Gateway contract.",
  input_schema: Object.freeze({
    type: "object",
    additionalProperties: false,
    properties: Object.freeze({
      request_id: Object.freeze({ type: "string" }),
      inventory_request: Object.freeze({ type: "object" }),
      live_collection_allowed: Object.freeze({ type: "boolean" }),
      hardware_probe_allowed: Object.freeze({ type: "boolean" }),
      node_agent_allowed: Object.freeze({ type: "boolean" }),
      benchmark_allowed: Object.freeze({ type: "boolean" }),
      placement_allowed: Object.freeze({ type: "boolean" }),
      telemetry_collection_allowed: Object.freeze({ type: "boolean" }),
      runtime_allowed: Object.freeze({ type: "boolean" }),
      side_effects: Object.freeze({ type: "array" }),
    }),
    required: Object.freeze(["inventory_request"] as const),
  }),
  annotations: Object.freeze({
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  }),
  gateway_contract_id: hardwareInventoryInspectionGatewayContract.contract_id,
  authority: mcpHardwareInventoryInspectionToolContract.authority,
  source_docs: mcpHardwareInventoryInspectionToolContract.source_docs,
  supplied_inventory_only: true,
  read_only: true,
  recommendation_only: true,
  live_collection_allowed: false,
  hardware_probe_allowed: false,
  node_agent_allowed: false,
  benchmark_allowed: false,
  placement_allowed: false,
  telemetry_collection_allowed: false,
  runtime_allowed: false,
  database_write_allowed: false,
  network_access_allowed: false,
  side_effects: Object.freeze([] as const),
} as const);

export const mcpHardwareAllocationRecommendationInspectionToolContract = Object.freeze({
  tool: "lnsat.hardware.allocation.recommendation.inspect",
  status: legacyMcpWireStatus.MCP_HARDWARE_ALLOCATION_RECOMMENDATION_INSPECTION_STATUS,
  gateway_contract_id:
    hardwareAllocationRecommendationInspectionGatewayContract.contract_id,
  gateway_method: hardwareAllocationRecommendationInspectionGatewayContract.method,
  gateway_path: hardwareAllocationRecommendationInspectionGatewayContract.path,
  authority: Object.freeze([
    hardwareAllocationRecommendationInspectionGatewayContract.contract_id,
  ] as const),
  source_docs: Object.freeze([
    ...hardwareAllocationRecommendationInspectionGatewayContract.source_docs,
    "docs/reference/CONTRACT_PROVENANCE.md",
    "packages/mcp/src/index.ts",
  ] as const),
  caller_supplied_hae_only: true,
  read_only: true,
  recommendation_only: true,
  simulation_only: true,
  hardware_probe_allowed: false,
  telemetry_collection_allowed: false,
  benchmark_execution_allowed: false,
  placement_allowed: false,
  drain_allowed: false,
  runtime_allowed: false,
  database_write_allowed: false,
  network_access_allowed: false,
  side_effects: Object.freeze([] as const),
} as const);

export const mcpHardwareAllocationRecommendationInspectionToolRegistration =
  Object.freeze({
    name: mcpHardwareAllocationRecommendationInspectionToolContract.tool,
    title: "Inspect caller-supplied hardware allocation recommendation request",
    description:
      "Read-only caller-supplied HAE recommendation inspection through the LNSAT Gateway contract.",
    input_schema: Object.freeze({
      type: "object",
      additionalProperties: false,
      properties: Object.freeze({
        request_id: Object.freeze({ type: "string" }),
        hae_request: Object.freeze({ type: "object" }),
        hardware_probe_allowed: Object.freeze({ type: "boolean" }),
        telemetry_collection_allowed: Object.freeze({ type: "boolean" }),
        benchmark_execution_allowed: Object.freeze({ type: "boolean" }),
        placement_allowed: Object.freeze({ type: "boolean" }),
        drain_allowed: Object.freeze({ type: "boolean" }),
        runtime_allowed: Object.freeze({ type: "boolean" }),
        database_write_allowed: Object.freeze({ type: "boolean" }),
        network_access_allowed: Object.freeze({ type: "boolean" }),
        side_effects: Object.freeze({ type: "array" }),
      }),
      required: Object.freeze(["hae_request"] as const),
    }),
    annotations: Object.freeze({
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    }),
    ...mcpHardwareAllocationRecommendationInspectionToolContract,
  } as const);

export const mcpPerformanceTelemetryInspectionToolContract = Object.freeze({
  tool: "lnsat.performance.telemetry.inspect",
  status: legacyMcpWireStatus.MCP_PERFORMANCE_TELEMETRY_INSPECTION_STATUS,
  gateway_contract_id: performanceTelemetryInspectionGatewayContract.contract_id,
  gateway_method: performanceTelemetryInspectionGatewayContract.method,
  gateway_path: performanceTelemetryInspectionGatewayContract.path,
  authority: Object.freeze([
    performanceTelemetryInspectionGatewayContract.contract_id,
  ] as const),
  source_docs: Object.freeze([
    ...performanceTelemetryInspectionGatewayContract.source_docs,
    "docs/reference/CONTRACT_PROVENANCE.md",
    "packages/mcp/src/index.ts",
  ] as const),
  supplied_telemetry_only: true,
  read_only: true,
  recommendation_only: true,
  collector_allowed: false,
  node_agent_allowed: false,
  hardware_probe_allowed: false,
  benchmark_execution_allowed: false,
  placement_allowed: false,
  alert_dispatch_allowed: false,
  runtime_allowed: false,
  database_write_allowed: false,
  network_access_allowed: false,
  side_effects: Object.freeze([] as const),
} as const);

export const mcpPerformanceTelemetryInspectionToolRegistration = Object.freeze({
  name: mcpPerformanceTelemetryInspectionToolContract.tool,
  title: "Inspect caller-supplied performance telemetry",
  description:
    "Read-only caller-supplied performance telemetry inspection through the LNSAT Gateway contract.",
  input_schema: Object.freeze({
    type: "object",
    additionalProperties: false,
    properties: Object.freeze({
      request_id: Object.freeze({ type: "string" }),
      telemetry_request: Object.freeze({ type: "object" }),
      collector_allowed: Object.freeze({ type: "boolean" }),
      node_agent_allowed: Object.freeze({ type: "boolean" }),
      hardware_probe_allowed: Object.freeze({ type: "boolean" }),
      benchmark_execution_allowed: Object.freeze({ type: "boolean" }),
      placement_allowed: Object.freeze({ type: "boolean" }),
      alert_dispatch_allowed: Object.freeze({ type: "boolean" }),
      runtime_allowed: Object.freeze({ type: "boolean" }),
      database_write_allowed: Object.freeze({ type: "boolean" }),
      network_access_allowed: Object.freeze({ type: "boolean" }),
      side_effects: Object.freeze({ type: "array" }),
    }),
    required: Object.freeze(["telemetry_request"] as const),
  }),
  annotations: Object.freeze({
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  }),
  gateway_contract_id: performanceTelemetryInspectionGatewayContract.contract_id,
  authority: mcpPerformanceTelemetryInspectionToolContract.authority,
  source_docs: mcpPerformanceTelemetryInspectionToolContract.source_docs,
  supplied_telemetry_only: true,
  read_only: true,
  recommendation_only: true,
  collector_allowed: false,
  node_agent_allowed: false,
  hardware_probe_allowed: false,
  benchmark_execution_allowed: false,
  placement_allowed: false,
  alert_dispatch_allowed: false,
  runtime_allowed: false,
  database_write_allowed: false,
  network_access_allowed: false,
  side_effects: Object.freeze([] as const),
} as const);

export const mcpServiceDatabaseInventoryToolContract = {
  tool: "lnsat.platform.service_database_inventory.inspect",
  status: "contract_only",
  gateway_contract_id: serviceDatabaseInventoryGatewayContract.contract_id,
  gateway_method: serviceDatabaseInventoryGatewayContract.method,
  gateway_path: serviceDatabaseInventoryGatewayContract.path,
  authority: ["lnsat.gateway.service_database_inventory_migration_planner.v0_1"],
  source_docs: Array.from(
    new Set([
      ...serviceDatabaseInventoryGatewayContract.source_docs,
      "docs/reference/CONTRACT_PROVENANCE.md",
      "docs/reference/CONTRACT_PROVENANCE.md",
      "packages/mcp/src/index.ts",
    ]),
  ),
  live_database_write_allowed: false,
  live_service_mutation_allowed: false,
  side_effects: [],
} as const;

export const mcpServiceDatabaseInventoryToolRegistration = {
  name: mcpServiceDatabaseInventoryToolContract.tool,
  title: "Inspect service and database inventory",
  description:
    "Read-only service and database inventory inspection through the LNSAT Gateway contract.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      request_id: {
        type: "string",
      },
      inventory_request: {
        type: "object",
      },
    },
  },
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  gateway_contract_id: serviceDatabaseInventoryGatewayContract.contract_id,
  authority: ["lnsat.gateway.service_database_inventory_migration_planner.v0_1"],
  source_docs: mcpServiceDatabaseInventoryToolContract.source_docs,
  live_database_write_allowed: false,
  live_service_mutation_allowed: false,
  side_effects: [],
} as const;

export const mcpSubstrateControlIntentToolContract = {
  tool: "lnsat.platform.substrate_control_intent.inspect",
  status: "contract_only",
  gateway_contract_id: substrateControlIntentGatewayContract.contract_id,
  gateway_method: substrateControlIntentGatewayContract.method,
  gateway_path: substrateControlIntentGatewayContract.path,
  authority: ["lnsat.gateway.substrate_control_intent.v0_1"],
  source_docs: Array.from(
    new Set([
      ...substrateControlIntentGatewayContract.source_docs,
      "docs/reference/CONTRACT_PROVENANCE.md",
      "docs/reference/CONTRACT_PROVENANCE.md",
      "packages/mcp/src/index.ts",
    ]),
  ),
  live_substrate_mutation_allowed: false,
  live_execution_allowed: false,
  side_effects: [],
} as const;

export const mcpSubstrateControlIntentToolRegistration = {
  name: mcpSubstrateControlIntentToolContract.tool,
  title: "Inspect substrate control intent",
  description:
    "Read-only substrate control intent inspection through the LNSAT Gateway contract.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      request_id: {
        type: "string",
      },
      intent_request: {
        type: "object",
      },
    },
  },
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  gateway_contract_id: substrateControlIntentGatewayContract.contract_id,
  authority: ["lnsat.gateway.substrate_control_intent.v0_1"],
  source_docs: mcpSubstrateControlIntentToolContract.source_docs,
  live_substrate_mutation_allowed: false,
  live_execution_allowed: false,
  side_effects: [],
} as const;

export const mcpAgentContextFirewallToolContract = {
  tool: "lnsat.agent.context_firewall.inspect",
  status: "contract_only",
  gateway_contract_id: agentContextFirewallGatewayContract.contract_id,
  gateway_method: agentContextFirewallGatewayContract.method,
  gateway_path: agentContextFirewallGatewayContract.path,
  authority: ["lnsat.gateway.agent_context_firewall.v0_1"],
  source_docs: Array.from(
    new Set([
      ...agentContextFirewallGatewayContract.source_docs,
      "packages/mcp/src/index.ts",
    ]),
  ),
  provider_dispatch_allowed: false,
  runtime_mutation_allowed: false,
  side_effects: [],
} as const;

export const mcpAgentContextFirewallToolRegistration = {
  name: mcpAgentContextFirewallToolContract.tool,
  title: "Inspect agent context firewall",
  description:
    "Read-only agent context firewall inspection through the LNSAT Gateway contract.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      request_id: {
        type: "string",
      },
      firewall_bundle_request: {
        type: "object",
      },
    },
  },
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  gateway_contract_id: agentContextFirewallGatewayContract.contract_id,
  authority: ["lnsat.gateway.agent_context_firewall.v0_1"],
  source_docs: mcpAgentContextFirewallToolContract.source_docs,
  provider_dispatch_allowed: false,
  runtime_mutation_allowed: false,
  side_effects: [],
} as const;

export const mcpCapabilityBrokerRequestToolContract = {
  tool: "lnsat.platform.capability_broker_request.inspect",
  status: "contract_only",
  gateway_contract_id: capabilityBrokerRequestGatewayContract.contract_id,
  gateway_method: capabilityBrokerRequestGatewayContract.method,
  gateway_path: capabilityBrokerRequestGatewayContract.path,
  authority: ["lnsat.gateway.capability_broker_request.v0_1"],
  source_docs: Array.from(
    new Set([
      ...capabilityBrokerRequestGatewayContract.source_docs,
      "docs/reference/CONTRACT_PROVENANCE.md",
      "docs/reference/CONTRACT_PROVENANCE.md",
      "packages/mcp/src/index.ts",
    ]),
  ),
  live_broker_dispatch_allowed: false,
  live_execution_allowed: false,
  side_effects: [],
} as const;

export const mcpCapabilityBrokerRequestToolRegistration = {
  name: mcpCapabilityBrokerRequestToolContract.tool,
  title: "Inspect capability broker request",
  description:
    "Read-only capability broker request inspection through the LNSAT Gateway contract.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      request_id: {
        type: "string",
      },
      broker_request: {
        type: "object",
      },
    },
  },
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  gateway_contract_id: capabilityBrokerRequestGatewayContract.contract_id,
  authority: ["lnsat.gateway.capability_broker_request.v0_1"],
  source_docs: mcpCapabilityBrokerRequestToolContract.source_docs,
  live_broker_dispatch_allowed: false,
  live_execution_allowed: false,
  side_effects: [],
} as const;

export const mcpSubstrateAdapterManifestToolContract = {
  tool: "lnsat.platform.substrate_adapter_manifest.inspect",
  status: "contract_only",
  gateway_contract_id: substrateAdapterManifestGatewayContract.contract_id,
  gateway_method: substrateAdapterManifestGatewayContract.method,
  gateway_path: substrateAdapterManifestGatewayContract.path,
  authority: ["lnsat.gateway.substrate_adapter_manifest.v0_1"],
  source_docs: Array.from(
    new Set([
      ...substrateAdapterManifestGatewayContract.source_docs,
      "docs/reference/CONTRACT_PROVENANCE.md",
      "docs/reference/CONTRACT_PROVENANCE.md",
      "packages/mcp/src/index.ts",
    ]),
  ),
  live_adapter_invocation_allowed: false,
  live_broker_dispatch_allowed: false,
  live_execution_allowed: false,
  side_effects: [],
} as const;

export const mcpSubstrateAdapterManifestToolRegistration = {
  name: mcpSubstrateAdapterManifestToolContract.tool,
  title: "Inspect substrate adapter manifest",
  description:
    "Read-only substrate adapter manifest inspection through the LNSAT Gateway contract.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      request_id: {
        type: "string",
      },
      manifest_request: {
        type: "object",
      },
    },
  },
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  gateway_contract_id: substrateAdapterManifestGatewayContract.contract_id,
  authority: ["lnsat.gateway.substrate_adapter_manifest.v0_1"],
  source_docs: mcpSubstrateAdapterManifestToolContract.source_docs,
  live_adapter_invocation_allowed: false,
  live_broker_dispatch_allowed: false,
  live_execution_allowed: false,
  side_effects: [],
} as const;

export const mcpAdapterInvocationPreflightToolContract = {
  tool: "lnsat.platform.adapter_invocation_preflight.inspect",
  status: "contract_only",
  gateway_contract_id: adapterInvocationPreflightGatewayContract.contract_id,
  gateway_method: adapterInvocationPreflightGatewayContract.method,
  gateway_path: adapterInvocationPreflightGatewayContract.path,
  authority: ["lnsat.gateway.adapter_invocation_preflight.v0_1"],
  source_docs: Array.from(
    new Set([
      ...adapterInvocationPreflightGatewayContract.source_docs,
      "docs/reference/CONTRACT_PROVENANCE.md",
      "docs/reference/CONTRACT_PROVENANCE.md",
      "packages/mcp/src/index.ts",
    ]),
  ),
  live_adapter_invocation_allowed: false,
  live_broker_dispatch_allowed: false,
  live_execution_allowed: false,
  side_effects: [],
} as const;

export const mcpAdapterInvocationPreflightToolRegistration = {
  name: mcpAdapterInvocationPreflightToolContract.tool,
  title: "Inspect adapter invocation preflight",
  description:
    "Read-only adapter invocation preflight inspection through the LNSAT Gateway contract.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      request_id: {
        type: "string",
      },
      preflight_request: {
        type: "object",
      },
    },
  },
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  gateway_contract_id: adapterInvocationPreflightGatewayContract.contract_id,
  authority: ["lnsat.gateway.adapter_invocation_preflight.v0_1"],
  source_docs: mcpAdapterInvocationPreflightToolContract.source_docs,
  live_adapter_invocation_allowed: false,
  live_broker_dispatch_allowed: false,
  live_execution_allowed: false,
  side_effects: [],
} as const;

export const mcpAdapterInvocationResultToolContract = {
  tool: "lnsat.platform.adapter_invocation_result.inspect",
  status: "contract_only",
  gateway_contract_id: adapterInvocationResultGatewayContract.contract_id,
  gateway_method: adapterInvocationResultGatewayContract.method,
  gateway_path: adapterInvocationResultGatewayContract.path,
  authority: ["lnsat.gateway.adapter_invocation_result.v0_1"],
  source_docs: Array.from(
    new Set([
      ...adapterInvocationResultGatewayContract.source_docs,
      "docs/reference/CONTRACT_PROVENANCE.md",
      "docs/reference/CONTRACT_PROVENANCE.md",
      "packages/mcp/src/index.ts",
    ]),
  ),
  live_adapter_invocation_allowed: false,
  live_broker_dispatch_allowed: false,
  live_execution_allowed: false,
  side_effects: [],
} as const;

export const mcpAdapterInvocationResultToolRegistration = {
  name: mcpAdapterInvocationResultToolContract.tool,
  title: "Inspect adapter invocation result",
  description:
    "Read-only adapter invocation result inspection through the LNSAT Gateway contract.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      request_id: {
        type: "string",
      },
      result_request: {
        type: "object",
      },
    },
  },
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  gateway_contract_id: adapterInvocationResultGatewayContract.contract_id,
  authority: ["lnsat.gateway.adapter_invocation_result.v0_1"],
  source_docs: mcpAdapterInvocationResultToolContract.source_docs,
  live_adapter_invocation_allowed: false,
  live_broker_dispatch_allowed: false,
  live_execution_allowed: false,
  side_effects: [],
} as const;

export const mcpAdapterInvocationAuthorizationBundleToolContract = {
  tool: "lnsat.platform.adapter_invocation_authorization_bundle.inspect",
  status: "contract_only",
  gateway_contract_id: adapterInvocationAuthorizationBundleGatewayContract.contract_id,
  gateway_method: adapterInvocationAuthorizationBundleGatewayContract.method,
  gateway_path: adapterInvocationAuthorizationBundleGatewayContract.path,
  authority: ["lnsat.gateway.adapter_invocation_authorization_bundle.v0_1"],
  source_docs: Array.from(
    new Set([
      ...adapterInvocationAuthorizationBundleGatewayContract.source_docs,
      "docs/reference/CONTRACT_PROVENANCE.md",
      "docs/reference/CONTRACT_PROVENANCE.md",
      "packages/mcp/src/index.ts",
    ]),
  ),
  live_adapter_invocation_allowed: false,
  live_broker_dispatch_allowed: false,
  live_execution_allowed: false,
  side_effects: [],
} as const;

export const mcpAdapterInvocationAuthorizationBundleToolRegistration = {
  name: mcpAdapterInvocationAuthorizationBundleToolContract.tool,
  title: "Inspect adapter invocation authorization bundle",
  description:
    "Read-only adapter invocation authorization bundle inspection through the LNSAT Gateway contract.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      request_id: {
        type: "string",
      },
      bundle_request: {
        type: "object",
      },
    },
  },
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  gateway_contract_id: adapterInvocationAuthorizationBundleGatewayContract.contract_id,
  authority: ["lnsat.gateway.adapter_invocation_authorization_bundle.v0_1"],
  source_docs: mcpAdapterInvocationAuthorizationBundleToolContract.source_docs,
  live_adapter_invocation_allowed: false,
  live_broker_dispatch_allowed: false,
  live_execution_allowed: false,
  side_effects: [],
} as const;

export const mcpRuntimeAdapterReadinessGateToolContract = {
  tool: "lnsat.platform.runtime_adapter_readiness_gate.inspect",
  status: "contract_only",
  gateway_contract_id: runtimeAdapterReadinessGateGatewayContract.contract_id,
  gateway_method: runtimeAdapterReadinessGateGatewayContract.method,
  gateway_path: runtimeAdapterReadinessGateGatewayContract.path,
  authority: ["lnsat.gateway.runtime_adapter_readiness_gate.v0_1"],
  source_docs: Array.from(
    new Set([
      ...runtimeAdapterReadinessGateGatewayContract.source_docs,
      "docs/reference/CONTRACT_PROVENANCE.md",
      "docs/reference/CONTRACT_PROVENANCE.md",
      "packages/mcp/src/index.ts",
    ]),
  ),
  runtime_adapter_dispatch_allowed: false,
  live_adapter_invocation_allowed: false,
  live_broker_dispatch_allowed: false,
  live_execution_allowed: false,
  side_effects: [],
} as const;

export const mcpRuntimeAdapterReadinessGateToolRegistration = {
  name: mcpRuntimeAdapterReadinessGateToolContract.tool,
  title: "Inspect runtime adapter readiness gate",
  description:
    "Read-only runtime adapter readiness gate inspection through the LNSAT Gateway contract.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      request_id: {
        type: "string",
      },
      readiness_request: {
        type: "object",
      },
    },
  },
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  gateway_contract_id: runtimeAdapterReadinessGateGatewayContract.contract_id,
  authority: ["lnsat.gateway.runtime_adapter_readiness_gate.v0_1"],
  source_docs: mcpRuntimeAdapterReadinessGateToolContract.source_docs,
  runtime_adapter_dispatch_allowed: false,
  live_adapter_invocation_allowed: false,
  live_broker_dispatch_allowed: false,
  live_execution_allowed: false,
  side_effects: [],
} as const;

export const mcpRuntimeAdapterImplementationScopeToolContract = {
  tool: "lnsat.platform.runtime_adapter_implementation_scope.inspect",
  status: "contract_only",
  gateway_contract_id: runtimeAdapterImplementationScopeGatewayContract.contract_id,
  gateway_method: runtimeAdapterImplementationScopeGatewayContract.method,
  gateway_path: runtimeAdapterImplementationScopeGatewayContract.path,
  authority: ["lnsat.gateway.runtime_adapter_implementation_scope.v0_1"],
  source_docs: Array.from(
    new Set([
      ...runtimeAdapterImplementationScopeGatewayContract.source_docs,
      "docs/reference/CONTRACT_PROVENANCE.md",
      "docs/reference/CONTRACT_PROVENANCE.md",
      "docs/reference/CONTRACT_PROVENANCE.md",
      "packages/mcp/src/index.ts",
    ]),
  ),
  implementation_authority: "implementation_scope_only_no_runtime_adapter",
  runtime_adapter_implementation_allowed: false,
  runtime_adapter_dispatch_allowed: false,
  live_adapter_invocation_allowed: false,
  live_broker_dispatch_allowed: false,
  live_execution_allowed: false,
  mcp_registration: false,
  state_changing_tool: false,
  runtime_dispatcher: false,
  runtime_adapter_implementation: false,
  side_effects: [],
} as const;

export const mcpRuntimeAdapterImplementationScopeToolRegistration = {
  name: mcpRuntimeAdapterImplementationScopeToolContract.tool,
  title: "Inspect runtime adapter implementation scope",
  description:
    "Read-only runtime adapter implementation scope inspection through the LNSAT Gateway contract.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      request_id: {
        type: "string",
      },
      implementation_scope_request: {
        type: "object",
      },
    },
  },
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  gateway_contract_id: runtimeAdapterImplementationScopeGatewayContract.contract_id,
  authority: ["lnsat.gateway.runtime_adapter_implementation_scope.v0_1"],
  source_docs: mcpRuntimeAdapterImplementationScopeToolContract.source_docs,
  implementation_authority: "implementation_scope_only_no_runtime_adapter",
  runtime_adapter_implementation_allowed: false,
  runtime_adapter_dispatch_allowed: false,
  live_adapter_invocation_allowed: false,
  live_broker_dispatch_allowed: false,
  live_execution_allowed: false,
  state_changing_tool: false,
  runtime_dispatcher: false,
  runtime_adapter_implementation: false,
  side_effects: [],
} as const;

export const mcpRuntimeAdapterImplementationPlanToolContract = {
  tool: "lnsat.platform.runtime_adapter_implementation_plan.inspect",
  status: "contract_only",
  gateway_contract_id: runtimeAdapterImplementationPlanGatewayContract.contract_id,
  gateway_method: runtimeAdapterImplementationPlanGatewayContract.method,
  gateway_path: runtimeAdapterImplementationPlanGatewayContract.path,
  authority: ["lnsat.gateway.runtime_adapter_implementation_plan.v0_1"],
  source_docs: Array.from(
    new Set([
      ...runtimeAdapterImplementationPlanGatewayContract.source_docs,
      "docs/reference/CONTRACT_PROVENANCE.md",
      "docs/reference/CONTRACT_PROVENANCE.md",
      "packages/mcp/src/index.ts",
    ]),
  ),
  implementation_authority: "implementation_plan_only_no_runtime_adapter",
  runtime_adapter_implementation_allowed: false,
  runtime_adapter_dispatch_allowed: false,
  live_adapter_invocation_allowed: false,
  live_broker_dispatch_allowed: false,
  live_execution_allowed: false,
  mcp_registration: false,
  state_changing_tool: false,
  runtime_dispatcher: false,
  runtime_adapter_implementation: false,
  side_effects: [],
} as const;

export const mcpRuntimeAdapterImplementationPlanToolRegistration = {
  name: mcpRuntimeAdapterImplementationPlanToolContract.tool,
  title: "Inspect runtime adapter implementation plan",
  description:
    "Read-only runtime adapter implementation plan inspection through the LNSAT Gateway contract.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      request_id: {
        type: "string",
      },
      implementation_plan_request: {
        type: "object",
      },
    },
  },
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  gateway_contract_id: runtimeAdapterImplementationPlanGatewayContract.contract_id,
  authority: ["lnsat.gateway.runtime_adapter_implementation_plan.v0_1"],
  source_docs: mcpRuntimeAdapterImplementationPlanToolContract.source_docs,
  implementation_authority: "implementation_plan_only_no_runtime_adapter",
  runtime_adapter_implementation_allowed: false,
  runtime_adapter_dispatch_allowed: false,
  live_adapter_invocation_allowed: false,
  live_broker_dispatch_allowed: false,
  live_execution_allowed: false,
  state_changing_tool: false,
  runtime_dispatcher: false,
  runtime_adapter_implementation: false,
  side_effects: [],
} as const;

export const mcpRuntimeAdapterImplementationAuthorizationRequestToolContract = {
  tool: "lnsat.platform.runtime_adapter_implementation_authorization_request.inspect",
  status: "contract_only",
  gateway_contract_id:
    runtimeAdapterImplementationAuthorizationRequestGatewayContract.contract_id,
  gateway_method:
    runtimeAdapterImplementationAuthorizationRequestGatewayContract.method,
  gateway_path: runtimeAdapterImplementationAuthorizationRequestGatewayContract.path,
  authority: [
    "lnsat.gateway.runtime_adapter_implementation_authorization_request.v0_1",
  ],
  source_docs: Array.from(
    new Set([
      ...runtimeAdapterImplementationAuthorizationRequestGatewayContract.source_docs,
      "docs/reference/CONTRACT_PROVENANCE.md",
      "docs/reference/CONTRACT_PROVENANCE.md",
      "packages/mcp/src/index.ts",
    ]),
  ),
  implementation_authority:
    "implementation_authorization_request_only_no_runtime_adapter",
  runtime_adapter_implementation_allowed: false,
  runtime_adapter_dispatch_allowed: false,
  live_adapter_invocation_allowed: false,
  live_broker_dispatch_allowed: false,
  live_execution_allowed: false,
  mcp_registration: false,
  state_changing_tool: false,
  runtime_dispatcher: false,
  runtime_adapter_implementation: false,
  side_effects: [],
} as const;

export const mcpRuntimeAdapterImplementationAuthorizationRequestToolRegistration = {
  name: mcpRuntimeAdapterImplementationAuthorizationRequestToolContract.tool,
  title: "Inspect runtime adapter implementation authorization request",
  description:
    "Read-only runtime adapter implementation authorization request inspection through the LNSAT Gateway contract.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      request_id: {
        type: "string",
      },
      authorization_request: {
        type: "object",
      },
    },
  },
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  gateway_contract_id:
    runtimeAdapterImplementationAuthorizationRequestGatewayContract.contract_id,
  authority: [
    "lnsat.gateway.runtime_adapter_implementation_authorization_request.v0_1",
  ],
  source_docs: Array.from(
    new Set([
      ...mcpRuntimeAdapterImplementationAuthorizationRequestToolContract.source_docs,
      "docs/reference/CONTRACT_PROVENANCE.md",
    ]),
  ),
  implementation_authority:
    "implementation_authorization_request_only_no_runtime_adapter",
  runtime_adapter_implementation_allowed: false,
  runtime_adapter_dispatch_allowed: false,
  live_adapter_invocation_allowed: false,
  live_broker_dispatch_allowed: false,
  live_execution_allowed: false,
  state_changing_tool: false,
  runtime_dispatcher: false,
  runtime_adapter_implementation: false,
  side_effects: [],
} as const;

export const mcpRuntimeAdapterImplementationApprovalGateToolContract = {
  tool: "lnsat.platform.runtime_adapter_implementation_approval_gate.inspect",
  status: "contract_only",
  gateway_contract_id:
    runtimeAdapterImplementationApprovalGateGatewayContract.contract_id,
  gateway_method: runtimeAdapterImplementationApprovalGateGatewayContract.method,
  gateway_path: runtimeAdapterImplementationApprovalGateGatewayContract.path,
  authority: ["lnsat.gateway.runtime_adapter_implementation_approval_gate.v0_1"],
  source_docs: Array.from(
    new Set([
      ...runtimeAdapterImplementationApprovalGateGatewayContract.source_docs,
      "docs/reference/CONTRACT_PROVENANCE.md",
      "docs/reference/CONTRACT_PROVENANCE.md",
      "packages/mcp/src/index.ts",
    ]),
  ),
  implementation_authority: "implementation_approval_gate_only_no_runtime_adapter",
  runtime_adapter_implementation_allowed: false,
  runtime_adapter_dispatch_allowed: false,
  live_adapter_invocation_allowed: false,
  live_broker_dispatch_allowed: false,
  live_execution_allowed: false,
  mcp_registration: false,
  state_changing_tool: false,
  runtime_dispatcher: false,
  runtime_adapter_implementation: false,
  side_effects: [],
} as const;

export const mcpRuntimeAdapterImplementationApprovalGateToolRegistration = {
  name: mcpRuntimeAdapterImplementationApprovalGateToolContract.tool,
  title: "Inspect runtime adapter implementation approval gate",
  description:
    "Read-only runtime adapter implementation approval gate inspection through the LNSAT Gateway contract.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      request_id: {
        type: "string",
      },
      approval_gate_request: {
        type: "object",
      },
    },
  },
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  gateway_contract_id:
    runtimeAdapterImplementationApprovalGateGatewayContract.contract_id,
  authority: ["lnsat.gateway.runtime_adapter_implementation_approval_gate.v0_1"],
  source_docs: Array.from(
    new Set([
      ...mcpRuntimeAdapterImplementationApprovalGateToolContract.source_docs,
      "docs/reference/CONTRACT_PROVENANCE.md",
    ]),
  ),
  implementation_authority: "implementation_approval_gate_only_no_runtime_adapter",
  runtime_adapter_implementation_allowed: false,
  runtime_adapter_dispatch_allowed: false,
  live_adapter_invocation_allowed: false,
  live_broker_dispatch_allowed: false,
  live_execution_allowed: false,
  state_changing_tool: false,
  runtime_dispatcher: false,
  runtime_adapter_implementation: false,
  side_effects: [],
} as const;

export const mcpRuntimeAdapterImplementationDryRunEvidenceToolContract = {
  tool: "lnsat.platform.runtime_adapter_implementation_dry_run_evidence.inspect",
  status: "contract_only",
  gateway_contract_id:
    runtimeAdapterImplementationDryRunEvidenceGatewayContract.contract_id,
  gateway_method: runtimeAdapterImplementationDryRunEvidenceGatewayContract.method,
  gateway_path: runtimeAdapterImplementationDryRunEvidenceGatewayContract.path,
  authority: ["lnsat.gateway.runtime_adapter_implementation_dry_run_evidence.v0_1"],
  source_docs: Array.from(
    new Set([
      ...runtimeAdapterImplementationDryRunEvidenceGatewayContract.source_docs,
      "docs/reference/CONTRACT_PROVENANCE.md",
      "docs/reference/CONTRACT_PROVENANCE.md",
      "packages/mcp/src/index.ts",
    ]),
  ),
  implementation_authority: "implementation_dry_run_evidence_only_no_runtime_adapter",
  runtime_adapter_implementation_allowed: false,
  runtime_adapter_dispatch_allowed: false,
  live_adapter_invocation_allowed: false,
  live_broker_dispatch_allowed: false,
  live_execution_allowed: false,
  mcp_registration: false,
  state_changing_tool: false,
  runtime_dispatcher: false,
  runtime_adapter_implementation: false,
  side_effects: [],
} as const;

export const mcpRuntimeAdapterImplementationDryRunEvidenceToolRegistration = {
  name: mcpRuntimeAdapterImplementationDryRunEvidenceToolContract.tool,
  title: "Inspect runtime adapter implementation dry-run evidence",
  description:
    "Read-only runtime adapter implementation dry-run evidence inspection through the LNSAT Gateway contract.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      request_id: {
        type: "string",
      },
      dry_run_evidence_request: {
        type: "object",
      },
    },
  },
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  gateway_contract_id:
    runtimeAdapterImplementationDryRunEvidenceGatewayContract.contract_id,
  authority: ["lnsat.gateway.runtime_adapter_implementation_dry_run_evidence.v0_1"],
  source_docs: Array.from(
    new Set([
      ...mcpRuntimeAdapterImplementationDryRunEvidenceToolContract.source_docs,
      "docs/reference/CONTRACT_PROVENANCE.md",
    ]),
  ),
  implementation_authority: "implementation_dry_run_evidence_only_no_runtime_adapter",
  runtime_adapter_implementation_allowed: false,
  runtime_adapter_dispatch_allowed: false,
  live_adapter_invocation_allowed: false,
  live_broker_dispatch_allowed: false,
  live_execution_allowed: false,
  state_changing_tool: false,
  runtime_dispatcher: false,
  runtime_adapter_implementation: false,
  side_effects: [],
} as const;

export const mcpKnowledgeSurfaceToolContract = {
  tool: "lnsat.knowledge.surface.inspect",
  status: "contract_only",
  gateway_contract_ids: [
    knowledgeGatewaySourcesContract.contract_id,
    knowledgeGatewaySearchContract.contract_id,
    knowledgeGatewayContextCompileContract.contract_id,
  ],
  gateway_endpoints: [
    {
      contract_id: knowledgeGatewaySourcesContract.contract_id,
      method: knowledgeGatewaySourcesContract.method,
      path: knowledgeGatewaySourcesContract.path,
    },
    {
      contract_id: knowledgeGatewaySearchContract.contract_id,
      method: knowledgeGatewaySearchContract.method,
      path: knowledgeGatewaySearchContract.path,
    },
    {
      contract_id: knowledgeGatewayContextCompileContract.contract_id,
      method: knowledgeGatewayContextCompileContract.method,
      path: knowledgeGatewayContextCompileContract.path,
    },
  ],
  authority: [
    "lnsat.gateway.knowledge.sources.v0_1",
    "lnsat.gateway.knowledge.search.v0_1",
    "lnsat.gateway.knowledge.context_compile.v0_1",
  ],
  source_docs: Array.from(
    new Set([
      ...knowledgeGatewaySourcesContract.source_docs,
      "docs/reference/CONTRACT_PROVENANCE.md",
      "packages/mcp/src/index.ts",
    ]),
  ),
  source_search_context_only: true,
  read_only: true,
  local_index_only: true,
  open_source_self_deploy_evidence_required: true,
  user_owned_integration_evidence_required: true,
  auth_provider_unlocked_evidence_required: true,
  live_auth_provider_allowed: false,
  live_collection_allowed: false,
  mutation_allowed: false,
  db_allowed: false,
  queue_allowed: false,
  runtime_allowed: false,
  state_changing_tool: false,
  side_effects: [],
} as const;

export const mcpKnowledgeSurfaceToolRegistration = {
  name: mcpKnowledgeSurfaceToolContract.tool,
  title: "Inspect LNSAT knowledge surface",
  description:
    "Read-only source, search, and context inspection through LNSAT Gateway knowledge contracts.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    required: ["operation"],
    properties: {
      request_id: {
        type: "string",
      },
      operation: {
        type: "string",
        enum: ["sources", "search", "context"],
      },
      query: {
        type: "string",
      },
      path: {
        type: "string",
      },
      packet_id: {
        type: "string",
      },
      decision_id: {
        type: "string",
      },
      limit: {
        type: "number",
      },
      search: {
        type: "object",
      },
      bundle_id: {
        type: "string",
      },
      objective: {
        type: "string",
      },
      max_tokens: {
        type: "number",
      },
      created_at: {
        type: "string",
      },
      live_collection_allowed: {
        type: "boolean",
      },
      side_effects: {
        type: "array",
      },
    },
  },
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  gateway_contract_ids: mcpKnowledgeSurfaceToolContract.gateway_contract_ids,
  gateway_endpoints: mcpKnowledgeSurfaceToolContract.gateway_endpoints,
  authority: mcpKnowledgeSurfaceToolContract.authority,
  source_docs: mcpKnowledgeSurfaceToolContract.source_docs,
  source_search_context_only: true,
  read_only: true,
  local_index_only: true,
  open_source_self_deploy_evidence_required: true,
  user_owned_integration_evidence_required: true,
  auth_provider_unlocked_evidence_required: true,
  live_auth_provider_allowed: false,
  live_collection_allowed: false,
  mutation_allowed: false,
  db_allowed: false,
  queue_allowed: false,
  runtime_allowed: false,
  state_changing_tool: false,
  side_effects: [],
} as const;

export type McpPacketInspectionAdapterResponse = {
  ok: boolean;
  tool: typeof mcpPacketInspectionToolContract.tool;
  gateway_contract_id: typeof packetInspectionGatewayContract.contract_id;
  gateway_response: PacketInspectionGatewayResponse;
  side_effects: [];
};

export type McpOnboardingProfileInspectionAdapterResponse = {
  ok: boolean;
  tool: typeof mcpOnboardingProfileInspectionToolContract.tool;
  gateway_contract_id: typeof onboardingProfileInspectionGatewayContract.contract_id;
  gateway_response: OnboardingProfileInspectionGatewayResponse;
  side_effects: [];
};

export type McpOnboardingContextInspectionAdapterResponse = {
  ok: boolean;
  tool: typeof mcpOnboardingContextInspectionToolContract.tool;
  gateway_contract_id: typeof onboardingContextInspectionGatewayContract.contract_id;
  gateway_response: OnboardingContextInspectionGatewayResponse;
  side_effects: [];
};

export type McpAuditLedgerMigrationApprovalPreviewAdapterResponse = {
  ok: boolean;
  tool: typeof mcpAuditLedgerMigrationApprovalPreviewToolContract.tool;
  gateway_contract_id: typeof auditLedgerMigrationApprovalPreviewGatewayContract.contract_id;
  gateway_response: AuditLedgerMigrationApprovalPreviewGatewayResponse;
  live_execution_allowed: false;
  side_effects: [];
};

export type McpAuditLedgerWriterInterfaceAdapterResponse = {
  ok: boolean;
  tool: typeof mcpAuditLedgerWriterInterfaceToolContract.tool;
  gateway_contract_id: typeof auditLedgerWriterInterfaceGatewayContract.contract_id;
  gateway_response: AuditLedgerWriterInterfaceGatewayResponse;
  live_execution_allowed: false;
  side_effects: [];
};

export type McpAuditLedgerWriterPersistencePreflightAdapterResponse = {
  ok: boolean;
  tool: typeof mcpAuditLedgerWriterPersistencePreflightToolContract.tool;
  gateway_contract_id: typeof auditLedgerWriterPersistencePreflightGatewayContract.contract_id;
  gateway_response: AuditLedgerWriterPersistencePreflightGatewayResponse;
  live_execution_allowed: false;
  side_effects: [];
};

export type McpAuditLedgerDatabaseSecurityPreflightAdapterResponse = {
  ok: boolean;
  tool: typeof mcpAuditLedgerDatabaseSecurityPreflightToolContract.tool;
  gateway_contract_id: typeof auditLedgerDatabaseSecurityPreflightGatewayContract.contract_id;
  gateway_response: AuditLedgerDatabaseSecurityPreflightGatewayResponse;
  live_execution_allowed: false;
  side_effects: [];
};

export type McpAuditLedgerPersistenceReadinessAdapterResponse = {
  ok: boolean;
  tool: typeof mcpAuditLedgerPersistenceReadinessToolContract.tool;
  gateway_contract_id: typeof auditLedgerPersistenceReadinessGatewayContract.contract_id;
  gateway_response: AuditLedgerPersistenceReadinessGatewayResponse;
  live_execution_allowed: false;
  side_effects: [];
};

export type McpAuditLedgerPersistenceScopeRequestAdapterResponse = {
  ok: boolean;
  tool: typeof mcpAuditLedgerPersistenceScopeRequestToolContract.tool;
  gateway_contract_id: typeof auditLedgerPersistenceScopeRequestGatewayContract.contract_id;
  gateway_response: AuditLedgerPersistenceScopeRequestGatewayResponse;
  live_execution_allowed: false;
  side_effects: [];
};

export type McpHardwareInventoryInspectionAdapterRequest =
  HardwareInventoryInspectionGatewayRequest;

export type McpHardwareInventoryInspectionAdapterResponse = {
  ok: boolean;
  tool: typeof mcpHardwareInventoryInspectionToolContract.tool;
  gateway_contract_id: typeof hardwareInventoryInspectionGatewayContract.contract_id;
  gateway_response: HardwareInventoryInspectionGatewayResponse;
  supplied_inventory_only: true;
  read_only: true;
  recommendation_only: true;
  live_collection_allowed: false;
  hardware_probe_allowed: false;
  node_agent_allowed: false;
  benchmark_allowed: false;
  placement_allowed: false;
  telemetry_collection_allowed: false;
  runtime_allowed: false;
  database_write_allowed: false;
  network_access_allowed: false;
  side_effects: [];
};

export type McpPerformanceTelemetryInspectionAdapterRequest =
  PerformanceTelemetryInspectionGatewayRequest;

export type McpHardwareAllocationRecommendationInspectionAdapterResponse = {
  ok: boolean;
  tool: typeof mcpHardwareAllocationRecommendationInspectionToolContract.tool;
  gateway_contract_id: typeof hardwareAllocationRecommendationInspectionGatewayContract.contract_id;
  gateway_response: HardwareAllocationRecommendationInspectionGatewayResponse;
  caller_supplied_hae_only: true;
  read_only: true;
  recommendation_only: true;
  simulation_only: true;
  hardware_probe_allowed: false;
  telemetry_collection_allowed: false;
  benchmark_execution_allowed: false;
  placement_allowed: false;
  drain_allowed: false;
  runtime_allowed: false;
  database_write_allowed: false;
  network_access_allowed: false;
  side_effects: [];
};

export type McpPerformanceTelemetryInspectionAdapterResponse = {
  ok: boolean;
  tool: typeof mcpPerformanceTelemetryInspectionToolContract.tool;
  gateway_contract_id: typeof performanceTelemetryInspectionGatewayContract.contract_id;
  gateway_response: PerformanceTelemetryInspectionGatewayResponse;
  supplied_telemetry_only: true;
  read_only: true;
  recommendation_only: true;
  collector_allowed: false;
  node_agent_allowed: false;
  hardware_probe_allowed: false;
  benchmark_execution_allowed: false;
  placement_allowed: false;
  alert_dispatch_allowed: false;
  runtime_allowed: false;
  database_write_allowed: false;
  network_access_allowed: false;
  side_effects: [];
};

export type McpServiceDatabaseInventoryAdapterResponse = {
  ok: boolean;
  tool: typeof mcpServiceDatabaseInventoryToolContract.tool;
  gateway_contract_id: typeof serviceDatabaseInventoryGatewayContract.contract_id;
  gateway_response: ServiceDatabaseInventoryGatewayResponse;
  live_database_write_allowed: false;
  live_service_mutation_allowed: false;
  side_effects: [];
};

export type McpSubstrateControlIntentAdapterResponse = {
  ok: boolean;
  tool: typeof mcpSubstrateControlIntentToolContract.tool;
  gateway_contract_id: typeof substrateControlIntentGatewayContract.contract_id;
  gateway_response: SubstrateControlIntentGatewayResponse;
  live_substrate_mutation_allowed: false;
  live_execution_allowed: false;
  side_effects: [];
};

export type McpAgentContextFirewallAdapterResponse = {
  ok: boolean;
  tool: typeof mcpAgentContextFirewallToolContract.tool;
  gateway_contract_id: typeof agentContextFirewallGatewayContract.contract_id;
  gateway_response: AgentContextFirewallGatewayResponse;
  provider_dispatch_allowed: false;
  runtime_mutation_allowed: false;
  side_effects: [];
};

export type McpCapabilityBrokerRequestAdapterResponse = {
  ok: boolean;
  tool: typeof mcpCapabilityBrokerRequestToolContract.tool;
  gateway_contract_id: typeof capabilityBrokerRequestGatewayContract.contract_id;
  gateway_response: CapabilityBrokerRequestGatewayResponse;
  live_broker_dispatch_allowed: false;
  live_execution_allowed: false;
  side_effects: [];
};

export type McpSubstrateAdapterManifestAdapterResponse = {
  ok: boolean;
  tool: typeof mcpSubstrateAdapterManifestToolContract.tool;
  gateway_contract_id: typeof substrateAdapterManifestGatewayContract.contract_id;
  gateway_response: SubstrateAdapterManifestGatewayResponse;
  live_adapter_invocation_allowed: false;
  live_broker_dispatch_allowed: false;
  live_execution_allowed: false;
  side_effects: [];
};

export type McpAdapterInvocationPreflightAdapterResponse = {
  ok: boolean;
  tool: typeof mcpAdapterInvocationPreflightToolContract.tool;
  gateway_contract_id: typeof adapterInvocationPreflightGatewayContract.contract_id;
  gateway_response: AdapterInvocationPreflightGatewayResponse;
  live_adapter_invocation_allowed: false;
  live_broker_dispatch_allowed: false;
  live_execution_allowed: false;
  side_effects: [];
};

export type McpAdapterInvocationResultAdapterResponse = {
  ok: boolean;
  tool: typeof mcpAdapterInvocationResultToolContract.tool;
  gateway_contract_id: typeof adapterInvocationResultGatewayContract.contract_id;
  gateway_response: AdapterInvocationResultGatewayResponse;
  live_adapter_invocation_allowed: false;
  live_broker_dispatch_allowed: false;
  live_execution_allowed: false;
  side_effects: [];
};

export type McpAdapterInvocationAuthorizationBundleAdapterResponse = {
  ok: boolean;
  tool: typeof mcpAdapterInvocationAuthorizationBundleToolContract.tool;
  gateway_contract_id: typeof adapterInvocationAuthorizationBundleGatewayContract.contract_id;
  gateway_response: AdapterInvocationAuthorizationBundleGatewayResponse;
  live_adapter_invocation_allowed: false;
  live_broker_dispatch_allowed: false;
  live_execution_allowed: false;
  side_effects: [];
};

export type McpRuntimeAdapterReadinessGateAdapterResponse = {
  ok: boolean;
  tool: typeof mcpRuntimeAdapterReadinessGateToolContract.tool;
  gateway_contract_id: typeof runtimeAdapterReadinessGateGatewayContract.contract_id;
  gateway_response: RuntimeAdapterReadinessGateGatewayResponse;
  runtime_adapter_dispatch_allowed: false;
  live_adapter_invocation_allowed: false;
  live_broker_dispatch_allowed: false;
  live_execution_allowed: false;
  side_effects: [];
};

export type McpRuntimeAdapterImplementationScopeAdapterResponse = {
  ok: boolean;
  tool: typeof mcpRuntimeAdapterImplementationScopeToolContract.tool;
  gateway_contract_id: typeof runtimeAdapterImplementationScopeGatewayContract.contract_id;
  gateway_response: RuntimeAdapterImplementationScopeGatewayResponse;
  implementation_authority: "implementation_scope_only_no_runtime_adapter";
  runtime_adapter_implementation_allowed: false;
  runtime_adapter_dispatch_allowed: false;
  live_adapter_invocation_allowed: false;
  live_broker_dispatch_allowed: false;
  live_execution_allowed: false;
  mcp_registration: false;
  state_changing_tool: false;
  runtime_dispatcher: false;
  runtime_adapter_implementation: false;
  side_effects: [];
};

export type McpRuntimeAdapterImplementationPlanAdapterResponse = {
  ok: boolean;
  tool: typeof mcpRuntimeAdapterImplementationPlanToolContract.tool;
  gateway_contract_id: typeof runtimeAdapterImplementationPlanGatewayContract.contract_id;
  gateway_response: RuntimeAdapterImplementationPlanGatewayResponse;
  implementation_authority: "implementation_plan_only_no_runtime_adapter";
  runtime_adapter_implementation_allowed: false;
  runtime_adapter_dispatch_allowed: false;
  live_adapter_invocation_allowed: false;
  live_broker_dispatch_allowed: false;
  live_execution_allowed: false;
  mcp_registration: false;
  state_changing_tool: false;
  runtime_dispatcher: false;
  runtime_adapter_implementation: false;
  side_effects: [];
};

export type McpRuntimeAdapterImplementationAuthorizationRequestAdapterResponse = {
  ok: boolean;
  tool: typeof mcpRuntimeAdapterImplementationAuthorizationRequestToolContract.tool;
  gateway_contract_id: typeof runtimeAdapterImplementationAuthorizationRequestGatewayContract.contract_id;
  gateway_response: RuntimeAdapterImplementationAuthorizationRequestGatewayResponse;
  implementation_authority: "implementation_authorization_request_only_no_runtime_adapter";
  runtime_adapter_implementation_allowed: false;
  runtime_adapter_dispatch_allowed: false;
  live_adapter_invocation_allowed: false;
  live_broker_dispatch_allowed: false;
  live_execution_allowed: false;
  mcp_registration: false;
  state_changing_tool: false;
  runtime_dispatcher: false;
  runtime_adapter_implementation: false;
  side_effects: [];
};

export type McpRuntimeAdapterImplementationApprovalGateAdapterResponse = {
  ok: boolean;
  tool: typeof mcpRuntimeAdapterImplementationApprovalGateToolContract.tool;
  gateway_contract_id: typeof runtimeAdapterImplementationApprovalGateGatewayContract.contract_id;
  gateway_response: RuntimeAdapterImplementationApprovalGateGatewayResponse;
  implementation_authority: "implementation_approval_gate_only_no_runtime_adapter";
  runtime_adapter_implementation_allowed: false;
  runtime_adapter_dispatch_allowed: false;
  live_adapter_invocation_allowed: false;
  live_broker_dispatch_allowed: false;
  live_execution_allowed: false;
  mcp_registration: false;
  state_changing_tool: false;
  runtime_dispatcher: false;
  runtime_adapter_implementation: false;
  side_effects: [];
};

export type McpRuntimeAdapterImplementationDryRunEvidenceAdapterResponse = {
  ok: boolean;
  tool: typeof mcpRuntimeAdapterImplementationDryRunEvidenceToolContract.tool;
  gateway_contract_id: typeof runtimeAdapterImplementationDryRunEvidenceGatewayContract.contract_id;
  gateway_response: RuntimeAdapterImplementationDryRunEvidenceGatewayResponse;
  implementation_authority: "implementation_dry_run_evidence_only_no_runtime_adapter";
  runtime_adapter_implementation_allowed: false;
  runtime_adapter_dispatch_allowed: false;
  live_adapter_invocation_allowed: false;
  live_broker_dispatch_allowed: false;
  live_execution_allowed: false;
  mcp_registration: false;
  state_changing_tool: false;
  runtime_dispatcher: false;
  runtime_adapter_implementation: false;
  side_effects: [];
};

export type KnowledgeSurfaceOperation = "sources" | "search" | "context";

export type KnowledgeSurfaceAdapterErrorCode =
  "knowledge_surface.invalid_request" | "knowledge_surface.invalid_operation";

export type KnowledgeSurfaceAdapterError = {
  code: KnowledgeSurfaceAdapterErrorCode;
  path: string;
  message: string;
  severity: "error";
};

export type McpKnowledgeSurfaceAdapterResponse = {
  ok: boolean;
  tool: typeof mcpKnowledgeSurfaceToolContract.tool;
  operation: KnowledgeSurfaceOperation | null;
  gateway_contract_id:
    | typeof knowledgeGatewaySourcesContract.contract_id
    | typeof knowledgeGatewaySearchContract.contract_id
    | typeof knowledgeGatewayContextCompileContract.contract_id
    | null;
  gateway_response:
    | KnowledgeGatewaySourcesResponse
    | KnowledgeGatewaySearchResponse
    | KnowledgeGatewayContextCompileResponse
    | null;
  adapter_errors: KnowledgeSurfaceAdapterError[];
  raw_input_content?: "withheld";
  mcp_registration: true;
  source_search_context_only: true;
  read_only: true;
  local_index_only: true;
  open_source_self_deploy_evidence_required: true;
  user_owned_integration_evidence_required: true;
  auth_provider_unlocked_evidence_required: true;
  live_auth_provider_allowed: false;
  live_collection_allowed: false;
  mutation_allowed: false;
  db_allowed: false;
  queue_allowed: false;
  runtime_allowed: false;
  state_changing_tool: false;
  side_effects: [];
};

export type BuildPacketStateErrorCode =
  | "build_state.invalid_request"
  | "build_state.unexpected_field"
  | "build_state.invalid_request_id"
  | "build_state.invalid_packet_id"
  | "build_state.packet_not_found"
  | "build_state.source_unavailable";

export type BuildPacketStateError = {
  code: BuildPacketStateErrorCode;
  path: string;
  message: string;
  severity: "error";
};

export type BuildPacketStateSummary = {
  project: string | null;
  name: string | null;
  current_phase: string | null;
  active_packet: string | null;
  next_packet: string | null;
  build_state: string | null;
  last_verified: string | null;
  completed_packets: string[];
  last_checks: string[];
};

export type BoardPacketRow = {
  packet_id: string;
  phase: string;
  status: string;
  objective: string;
};

export type PacketLogEntry = {
  packet_id: string;
  title: string;
};

export type BuildPacketBoardSummary = {
  active_packet: string | null;
  queued_packets: BoardPacketRow[];
  done_packets: BoardPacketRow[];
};

export type SelectedBuildPacketState = {
  packet_id: string;
  source_path: string;
  phase: string | null;
  status: string | null;
  objective: string | null;
  acceptance_checks: string[];
  verification_commands: string[];
  side_effects: unknown;
};

export type McpBuildPacketStateAdapterResponse =
  | {
      ok: true;
      tool: typeof mcpBuildPacketStateToolContract.tool;
      request_id: string | null;
      source_docs: string[];
      build_state: BuildPacketStateSummary;
      board: BuildPacketBoardSummary;
      packet_log: {
        completed_packets: PacketLogEntry[];
      };
      selected_packet: SelectedBuildPacketState | null;
      side_effects: [];
    }
  | {
      ok: false;
      tool: typeof mcpBuildPacketStateToolContract.tool;
      request_id: string | null;
      source_docs: string[];
      errors: BuildPacketStateError[];
      side_effects: [];
    };

export type McpProjectStateAdapterResponse = {
  ok: ProjectStateGatewayResponse["ok"];
  tool: typeof mcpProjectStateToolContract.tool;
  gateway_contract_id: typeof projectStateGatewayContract.contract_id;
  gateway_response: ProjectStateGatewayResponse;
  side_effects: [];
};

export async function inspectPacketThroughMcpAdapterContract(
  input: unknown,
  options: { now?: Date } = {},
): Promise<McpPacketInspectionAdapterResponse> {
  const gatewayResponse = await inspectPacketGatewayRequest(input, options);

  return {
    ok: gatewayResponse.ok,
    tool: mcpPacketInspectionToolContract.tool,
    gateway_contract_id: packetInspectionGatewayContract.contract_id,
    gateway_response: gatewayResponse,
    side_effects: [],
  };
}

export async function inspectOnboardingProfilesThroughMcpAdapterContract(
  input: unknown,
  options: { now?: Date } = {},
): Promise<McpOnboardingProfileInspectionAdapterResponse> {
  const gatewayResponse = await inspectOnboardingProfileGatewayRequest(input, options);

  return {
    ok: gatewayResponse.ok,
    tool: mcpOnboardingProfileInspectionToolContract.tool,
    gateway_contract_id: onboardingProfileInspectionGatewayContract.contract_id,
    gateway_response: gatewayResponse,
    side_effects: [],
  };
}

export async function inspectOnboardingContextThroughMcpAdapterContract(
  input: unknown,
  options: { now?: Date } = {},
): Promise<McpOnboardingContextInspectionAdapterResponse> {
  const gatewayResponse = await inspectOnboardingContextGatewayRequest(input, options);

  return {
    ok: gatewayResponse.ok,
    tool: mcpOnboardingContextInspectionToolContract.tool,
    gateway_contract_id: onboardingContextInspectionGatewayContract.contract_id,
    gateway_response: gatewayResponse,
    side_effects: [],
  };
}

export async function inspectAuditLedgerMigrationApprovalPreviewThroughMcpAdapterContract(
  input: unknown,
  options: { now?: Date } = {},
): Promise<McpAuditLedgerMigrationApprovalPreviewAdapterResponse> {
  const gatewayResponse = inspectAuditLedgerMigrationApprovalPreviewGatewayRequest(
    input,
    options,
  );

  return {
    ok: gatewayResponse.ok,
    tool: mcpAuditLedgerMigrationApprovalPreviewToolContract.tool,
    gateway_contract_id: auditLedgerMigrationApprovalPreviewGatewayContract.contract_id,
    gateway_response: gatewayResponse,
    live_execution_allowed: false,
    side_effects: [],
  };
}

export async function inspectAuditLedgerWriterInterfaceThroughMcpAdapterContract(
  input: unknown,
  options: { now?: Date } = {},
): Promise<McpAuditLedgerWriterInterfaceAdapterResponse> {
  const gatewayResponse = await inspectAuditLedgerWriterInterfaceGatewayRequest(
    input,
    options,
  );

  return {
    ok: gatewayResponse.ok,
    tool: mcpAuditLedgerWriterInterfaceToolContract.tool,
    gateway_contract_id: auditLedgerWriterInterfaceGatewayContract.contract_id,
    gateway_response: gatewayResponse,
    live_execution_allowed: false,
    side_effects: [],
  };
}

export async function inspectAuditLedgerWriterPersistencePreflightThroughMcpAdapterContract(
  input: unknown,
  options: { now?: Date } = {},
): Promise<McpAuditLedgerWriterPersistencePreflightAdapterResponse> {
  const gatewayResponse =
    await inspectAuditLedgerWriterPersistencePreflightGatewayRequest(input, options);

  return {
    ok: gatewayResponse.ok,
    tool: mcpAuditLedgerWriterPersistencePreflightToolContract.tool,
    gateway_contract_id:
      auditLedgerWriterPersistencePreflightGatewayContract.contract_id,
    gateway_response: gatewayResponse,
    live_execution_allowed: false,
    side_effects: [],
  };
}

export async function inspectAuditLedgerDatabaseSecurityPreflightThroughMcpAdapterContract(
  input: unknown,
  options: { now?: Date } = {},
): Promise<McpAuditLedgerDatabaseSecurityPreflightAdapterResponse> {
  const gatewayResponse =
    await inspectAuditLedgerDatabaseSecurityPreflightGatewayRequest(input, options);

  return {
    ok: gatewayResponse.ok,
    tool: mcpAuditLedgerDatabaseSecurityPreflightToolContract.tool,
    gateway_contract_id:
      auditLedgerDatabaseSecurityPreflightGatewayContract.contract_id,
    gateway_response: gatewayResponse,
    live_execution_allowed: false,
    side_effects: [],
  };
}

export async function inspectAuditLedgerPersistenceReadinessThroughMcpAdapterContract(
  input: unknown,
  options: { now?: Date } = {},
): Promise<McpAuditLedgerPersistenceReadinessAdapterResponse> {
  const gatewayResponse = await inspectAuditLedgerPersistenceReadinessGatewayRequest(
    input,
    options,
  );

  return {
    ok: gatewayResponse.ok,
    tool: mcpAuditLedgerPersistenceReadinessToolContract.tool,
    gateway_contract_id: auditLedgerPersistenceReadinessGatewayContract.contract_id,
    gateway_response: gatewayResponse,
    live_execution_allowed: false,
    side_effects: [],
  };
}

export async function inspectAuditLedgerPersistenceScopeRequestThroughMcpAdapterContract(
  input: unknown,
  options: { now?: Date } = {},
): Promise<McpAuditLedgerPersistenceScopeRequestAdapterResponse> {
  const gatewayResponse = await inspectAuditLedgerPersistenceScopeRequestGatewayRequest(
    input,
    options,
  );

  return {
    ok: gatewayResponse.ok,
    tool: mcpAuditLedgerPersistenceScopeRequestToolContract.tool,
    gateway_contract_id: auditLedgerPersistenceScopeRequestGatewayContract.contract_id,
    gateway_response: gatewayResponse,
    live_execution_allowed: false,
    side_effects: [],
  };
}

export async function inspectHardwareInventoryThroughMcpAdapterContract(
  input: unknown,
  options: { now?: Date } = {},
): Promise<McpHardwareInventoryInspectionAdapterResponse> {
  const gatewayResponse = await inspectHardwareInventoryGatewayRequest(input, options);

  return {
    ok: gatewayResponse.ok,
    tool: mcpHardwareInventoryInspectionToolContract.tool,
    gateway_contract_id: hardwareInventoryInspectionGatewayContract.contract_id,
    gateway_response: gatewayResponse,
    supplied_inventory_only: true,
    read_only: true,
    recommendation_only: true,
    live_collection_allowed: false,
    hardware_probe_allowed: false,
    node_agent_allowed: false,
    benchmark_allowed: false,
    placement_allowed: false,
    telemetry_collection_allowed: false,
    runtime_allowed: false,
    database_write_allowed: false,
    network_access_allowed: false,
    side_effects: [],
  };
}

export async function inspectPerformanceTelemetryThroughMcpAdapterContract(
  input: unknown,
  options: { now?: Date } = {},
): Promise<McpPerformanceTelemetryInspectionAdapterResponse> {
  const gatewayResponse = await inspectPerformanceTelemetryGatewayRequest(
    input,
    options,
  );

  return {
    ok: gatewayResponse.ok,
    tool: mcpPerformanceTelemetryInspectionToolContract.tool,
    gateway_contract_id: performanceTelemetryInspectionGatewayContract.contract_id,
    gateway_response: gatewayResponse,
    supplied_telemetry_only: true,
    read_only: true,
    recommendation_only: true,
    collector_allowed: false,
    node_agent_allowed: false,
    hardware_probe_allowed: false,
    benchmark_execution_allowed: false,
    placement_allowed: false,
    alert_dispatch_allowed: false,
    runtime_allowed: false,
    database_write_allowed: false,
    network_access_allowed: false,
    side_effects: [],
  };
}

export async function inspectHardwareAllocationRecommendationThroughMcpAdapterContract(
  input: unknown,
  options: { now?: Date } = {},
): Promise<McpHardwareAllocationRecommendationInspectionAdapterResponse> {
  const gatewayResponse = await inspectHardwareAllocationRecommendationGatewayRequest(
    input,
    options,
  );
  return {
    ok: gatewayResponse.ok,
    tool: mcpHardwareAllocationRecommendationInspectionToolContract.tool,
    gateway_contract_id:
      hardwareAllocationRecommendationInspectionGatewayContract.contract_id,
    gateway_response: gatewayResponse,
    caller_supplied_hae_only: true,
    read_only: true,
    recommendation_only: true,
    simulation_only: true,
    hardware_probe_allowed: false,
    telemetry_collection_allowed: false,
    benchmark_execution_allowed: false,
    placement_allowed: false,
    drain_allowed: false,
    runtime_allowed: false,
    database_write_allowed: false,
    network_access_allowed: false,
    side_effects: [],
  };
}

export async function inspectServiceDatabaseInventoryThroughMcpAdapterContract(
  input: unknown,
  options: { now?: Date } = {},
): Promise<McpServiceDatabaseInventoryAdapterResponse> {
  const gatewayResponse = await inspectServiceDatabaseInventoryGatewayRequest(
    input,
    options,
  );

  return {
    ok: gatewayResponse.ok,
    tool: mcpServiceDatabaseInventoryToolContract.tool,
    gateway_contract_id: serviceDatabaseInventoryGatewayContract.contract_id,
    gateway_response: gatewayResponse,
    live_database_write_allowed: false,
    live_service_mutation_allowed: false,
    side_effects: [],
  };
}

export async function inspectSubstrateControlIntentThroughMcpAdapterContract(
  input: unknown,
  options: { now?: Date } = {},
): Promise<McpSubstrateControlIntentAdapterResponse> {
  const gatewayResponse = await inspectSubstrateControlIntentGatewayRequest(
    input,
    options,
  );

  return {
    ok: gatewayResponse.ok,
    tool: mcpSubstrateControlIntentToolContract.tool,
    gateway_contract_id: substrateControlIntentGatewayContract.contract_id,
    gateway_response: gatewayResponse,
    live_substrate_mutation_allowed: false,
    live_execution_allowed: false,
    side_effects: [],
  };
}

export async function inspectAgentContextFirewallThroughMcpAdapterContract(
  input: unknown,
  options: { now?: Date } = {},
): Promise<McpAgentContextFirewallAdapterResponse> {
  const gatewayResponse = await inspectAgentContextFirewallGatewayRequest(
    input,
    options,
  );

  return {
    ok: gatewayResponse.ok,
    tool: mcpAgentContextFirewallToolContract.tool,
    gateway_contract_id: agentContextFirewallGatewayContract.contract_id,
    gateway_response: gatewayResponse,
    provider_dispatch_allowed: false,
    runtime_mutation_allowed: false,
    side_effects: [],
  };
}

export async function inspectCapabilityBrokerRequestThroughMcpAdapterContract(
  input: unknown,
  options: { now?: Date } = {},
): Promise<McpCapabilityBrokerRequestAdapterResponse> {
  const gatewayResponse = await inspectCapabilityBrokerRequestGatewayRequest(
    input,
    options,
  );

  return {
    ok: gatewayResponse.ok,
    tool: mcpCapabilityBrokerRequestToolContract.tool,
    gateway_contract_id: capabilityBrokerRequestGatewayContract.contract_id,
    gateway_response: gatewayResponse,
    live_broker_dispatch_allowed: false,
    live_execution_allowed: false,
    side_effects: [],
  };
}

export async function inspectSubstrateAdapterManifestThroughMcpAdapterContract(
  input: unknown,
  options: { now?: Date } = {},
): Promise<McpSubstrateAdapterManifestAdapterResponse> {
  const gatewayResponse = await inspectSubstrateAdapterManifestGatewayRequest(
    input,
    options,
  );

  return {
    ok: gatewayResponse.ok,
    tool: mcpSubstrateAdapterManifestToolContract.tool,
    gateway_contract_id: substrateAdapterManifestGatewayContract.contract_id,
    gateway_response: gatewayResponse,
    live_adapter_invocation_allowed: false,
    live_broker_dispatch_allowed: false,
    live_execution_allowed: false,
    side_effects: [],
  };
}

export async function inspectAdapterInvocationPreflightThroughMcpAdapterContract(
  input: unknown,
  options: { now?: Date } = {},
): Promise<McpAdapterInvocationPreflightAdapterResponse> {
  const gatewayResponse = await inspectAdapterInvocationPreflightGatewayRequest(
    input,
    options,
  );

  return {
    ok: gatewayResponse.ok,
    tool: mcpAdapterInvocationPreflightToolContract.tool,
    gateway_contract_id: adapterInvocationPreflightGatewayContract.contract_id,
    gateway_response: gatewayResponse,
    live_adapter_invocation_allowed: false,
    live_broker_dispatch_allowed: false,
    live_execution_allowed: false,
    side_effects: [],
  };
}

export async function inspectAdapterInvocationResultThroughMcpAdapterContract(
  input: unknown,
  options: { now?: Date } = {},
): Promise<McpAdapterInvocationResultAdapterResponse> {
  const gatewayResponse = await inspectAdapterInvocationResultGatewayRequest(
    input,
    options,
  );

  return {
    ok: gatewayResponse.ok,
    tool: mcpAdapterInvocationResultToolContract.tool,
    gateway_contract_id: adapterInvocationResultGatewayContract.contract_id,
    gateway_response: gatewayResponse,
    live_adapter_invocation_allowed: false,
    live_broker_dispatch_allowed: false,
    live_execution_allowed: false,
    side_effects: [],
  };
}

export async function inspectAdapterInvocationAuthorizationBundleThroughMcpAdapterContract(
  input: unknown,
  options: { now?: Date } = {},
): Promise<McpAdapterInvocationAuthorizationBundleAdapterResponse> {
  const gatewayResponse =
    await inspectAdapterInvocationAuthorizationBundleGatewayRequest(input, options);

  return {
    ok: gatewayResponse.ok,
    tool: mcpAdapterInvocationAuthorizationBundleToolContract.tool,
    gateway_contract_id:
      adapterInvocationAuthorizationBundleGatewayContract.contract_id,
    gateway_response: gatewayResponse,
    live_adapter_invocation_allowed: false,
    live_broker_dispatch_allowed: false,
    live_execution_allowed: false,
    side_effects: [],
  };
}

export async function inspectRuntimeAdapterReadinessGateThroughMcpAdapterContract(
  input: unknown,
  options: { now?: Date } = {},
): Promise<McpRuntimeAdapterReadinessGateAdapterResponse> {
  const gatewayResponse = await inspectRuntimeAdapterReadinessGateGatewayRequest(
    input,
    options,
  );

  return {
    ok: gatewayResponse.ok,
    tool: mcpRuntimeAdapterReadinessGateToolContract.tool,
    gateway_contract_id: runtimeAdapterReadinessGateGatewayContract.contract_id,
    gateway_response: gatewayResponse,
    runtime_adapter_dispatch_allowed: false,
    live_adapter_invocation_allowed: false,
    live_broker_dispatch_allowed: false,
    live_execution_allowed: false,
    side_effects: [],
  };
}

export async function inspectRuntimeAdapterImplementationScopeThroughMcpAdapterContract(
  input: unknown,
  options: { now?: Date } = {},
): Promise<McpRuntimeAdapterImplementationScopeAdapterResponse> {
  const gatewayResponse = await inspectRuntimeAdapterImplementationScopeGatewayRequest(
    input,
    options,
  );

  return {
    ok: gatewayResponse.ok,
    tool: mcpRuntimeAdapterImplementationScopeToolContract.tool,
    gateway_contract_id: runtimeAdapterImplementationScopeGatewayContract.contract_id,
    gateway_response: gatewayResponse,
    implementation_authority: "implementation_scope_only_no_runtime_adapter",
    runtime_adapter_implementation_allowed: false,
    runtime_adapter_dispatch_allowed: false,
    live_adapter_invocation_allowed: false,
    live_broker_dispatch_allowed: false,
    live_execution_allowed: false,
    mcp_registration: false,
    state_changing_tool: false,
    runtime_dispatcher: false,
    runtime_adapter_implementation: false,
    side_effects: [],
  };
}

export async function inspectRuntimeAdapterImplementationPlanThroughMcpAdapterContract(
  input: unknown,
  options: { now?: Date } = {},
): Promise<McpRuntimeAdapterImplementationPlanAdapterResponse> {
  const gatewayResponse = await inspectRuntimeAdapterImplementationPlanGatewayRequest(
    input,
    options,
  );

  return {
    ok: gatewayResponse.ok,
    tool: mcpRuntimeAdapterImplementationPlanToolContract.tool,
    gateway_contract_id: runtimeAdapterImplementationPlanGatewayContract.contract_id,
    gateway_response: gatewayResponse,
    implementation_authority: "implementation_plan_only_no_runtime_adapter",
    runtime_adapter_implementation_allowed: false,
    runtime_adapter_dispatch_allowed: false,
    live_adapter_invocation_allowed: false,
    live_broker_dispatch_allowed: false,
    live_execution_allowed: false,
    mcp_registration: false,
    state_changing_tool: false,
    runtime_dispatcher: false,
    runtime_adapter_implementation: false,
    side_effects: [],
  };
}

export async function inspectRuntimeAdapterImplementationAuthorizationRequestThroughMcpAdapterContract(
  input: unknown,
  options: { now?: Date } = {},
): Promise<McpRuntimeAdapterImplementationAuthorizationRequestAdapterResponse> {
  const gatewayResponse =
    await inspectRuntimeAdapterImplementationAuthorizationRequestGatewayRequest(
      input,
      options,
    );

  return {
    ok: gatewayResponse.ok,
    tool: mcpRuntimeAdapterImplementationAuthorizationRequestToolContract.tool,
    gateway_contract_id:
      runtimeAdapterImplementationAuthorizationRequestGatewayContract.contract_id,
    gateway_response: gatewayResponse,
    implementation_authority:
      "implementation_authorization_request_only_no_runtime_adapter",
    runtime_adapter_implementation_allowed: false,
    runtime_adapter_dispatch_allowed: false,
    live_adapter_invocation_allowed: false,
    live_broker_dispatch_allowed: false,
    live_execution_allowed: false,
    mcp_registration: false,
    state_changing_tool: false,
    runtime_dispatcher: false,
    runtime_adapter_implementation: false,
    side_effects: [],
  };
}

export async function inspectRuntimeAdapterImplementationApprovalGateThroughMcpAdapterContract(
  input: unknown,
  options: { now?: Date } = {},
): Promise<McpRuntimeAdapterImplementationApprovalGateAdapterResponse> {
  const gatewayResponse =
    await inspectRuntimeAdapterImplementationApprovalGateGatewayRequest(input, options);

  return {
    ok: gatewayResponse.ok,
    tool: mcpRuntimeAdapterImplementationApprovalGateToolContract.tool,
    gateway_contract_id:
      runtimeAdapterImplementationApprovalGateGatewayContract.contract_id,
    gateway_response: gatewayResponse,
    implementation_authority: "implementation_approval_gate_only_no_runtime_adapter",
    runtime_adapter_implementation_allowed: false,
    runtime_adapter_dispatch_allowed: false,
    live_adapter_invocation_allowed: false,
    live_broker_dispatch_allowed: false,
    live_execution_allowed: false,
    mcp_registration: false,
    state_changing_tool: false,
    runtime_dispatcher: false,
    runtime_adapter_implementation: false,
    side_effects: [],
  };
}

export async function inspectRuntimeAdapterImplementationDryRunEvidenceThroughMcpAdapterContract(
  input: unknown,
  options: { now?: Date } = {},
): Promise<McpRuntimeAdapterImplementationDryRunEvidenceAdapterResponse> {
  const gatewayResponse =
    await inspectRuntimeAdapterImplementationDryRunEvidenceGatewayRequest(
      input,
      options,
    );

  return {
    ok: gatewayResponse.ok,
    tool: mcpRuntimeAdapterImplementationDryRunEvidenceToolContract.tool,
    gateway_contract_id:
      runtimeAdapterImplementationDryRunEvidenceGatewayContract.contract_id,
    gateway_response: gatewayResponse,
    implementation_authority: "implementation_dry_run_evidence_only_no_runtime_adapter",
    runtime_adapter_implementation_allowed: false,
    runtime_adapter_dispatch_allowed: false,
    live_adapter_invocation_allowed: false,
    live_broker_dispatch_allowed: false,
    live_execution_allowed: false,
    mcp_registration: false,
    state_changing_tool: false,
    runtime_dispatcher: false,
    runtime_adapter_implementation: false,
    side_effects: [],
  };
}

export async function inspectKnowledgeSurfaceThroughMcpAdapterContract(
  input: unknown,
): Promise<McpKnowledgeSurfaceAdapterResponse> {
  const normalized = normalizeKnowledgeSurfaceRequest(input);
  if (!normalized.ok) {
    return knowledgeSurfaceAdapterFailure(null, normalized.errors);
  }

  if (normalized.operation === "sources") {
    const gatewayResponse = await inspectKnowledgeGatewaySourcesRequest(
      normalized.gateway_input,
    );
    return knowledgeSurfaceAdapterResponse(
      normalized.operation,
      knowledgeGatewaySourcesContract.contract_id,
      gatewayResponse,
    );
  }

  if (normalized.operation === "search") {
    const gatewayResponse = await inspectKnowledgeGatewaySearchRequest(
      normalized.gateway_input,
    );
    return knowledgeSurfaceAdapterResponse(
      normalized.operation,
      knowledgeGatewaySearchContract.contract_id,
      gatewayResponse,
    );
  }

  const gatewayResponse = await inspectKnowledgeGatewayContextCompileRequest(
    normalized.gateway_input,
  );
  return knowledgeSurfaceAdapterResponse(
    normalized.operation,
    knowledgeGatewayContextCompileContract.contract_id,
    gatewayResponse,
  );
}

export async function readBuildPacketStateThroughMcpAdapterContract(
  input: unknown,
): Promise<McpBuildPacketStateAdapterResponse> {
  const normalized = normalizeBuildPacketStateRequest(input);
  if (!normalized.ok) {
    return buildPacketStateFailure(normalized.request_id, normalized.errors);
  }

  let statusJson: BuildStatusJson;
  let boardMarkdown: string;
  let packetLogMarkdown: string;
  try {
    [statusJson, boardMarkdown, packetLogMarkdown] = await Promise.all([
      readRepoJson<BuildStatusJson>("fixtures/project-state/status.json"),
      readRepoText("fixtures/project-state/board.md"),
      readRepoText("fixtures/project-state/packet-log.md"),
    ]);
  } catch {
    return buildPacketStateFailure(normalized.request_id, [
      buildPacketStateError(
        "build_state.source_unavailable",
        "",
        "Build packet state source docs could not be read.",
      ),
    ]);
  }

  const requestedPacketId = normalized.packet_id;
  const selectedPacketId =
    requestedPacketId ??
    stringOrNull(statusJson.active_packet) ??
    stringOrNull(statusJson.next_packet);
  const selectedPacket =
    selectedPacketId === null
      ? null
      : await readSelectedBuildPacket(selectedPacketId, requestedPacketId !== null);

  if (selectedPacket !== null && "errors" in selectedPacket) {
    return buildPacketStateFailure(normalized.request_id, selectedPacket.errors);
  }

  const completedPackets = parsePacketLogEntries(packetLogMarkdown);
  if (selectedPacket?.status === "done") {
    for (const packetId of [
      previousBuildPacketId(selectedPacket.packet_id),
      selectedPacket.packet_id,
    ]) {
      if (
        packetId !== null &&
        !completedPackets.some((entry) => entry.packet_id === packetId)
      ) {
        completedPackets.push({
          packet_id: packetId,
          title:
            packetId === selectedPacket.packet_id
              ? (selectedPacket.objective ?? "Completed packet")
              : "Previous completed packet",
        });
      }
    }
  }

  return {
    ok: true,
    tool: mcpBuildPacketStateToolContract.tool,
    request_id: normalized.request_id,
    source_docs: buildPacketStateSourceDocs(selectedPacket?.source_path ?? null),
    build_state: summarizeBuildStatus(statusJson),
    board: summarizeBoard(boardMarkdown, statusJson.active_packet),
    packet_log: {
      completed_packets: completedPackets,
    },
    selected_packet: selectedPacket,
    side_effects: [],
  };
}

export async function inspectProjectStateThroughMcpAdapterContract(
  input: unknown,
): Promise<McpProjectStateAdapterResponse> {
  const gatewayResponse = await inspectProjectStateGatewayRequest(input);
  return {
    ok: gatewayResponse.ok,
    tool: mcpProjectStateToolContract.tool,
    gateway_contract_id: projectStateGatewayContract.contract_id,
    gateway_response: gatewayResponse,
    side_effects: [],
  };
}

export type LnsatMcpServerOptions = {
  now?: () => Date;
  onProtocolContext?: (context: LnsatMcpProtocolContext) => void;
};

export type LnsatMcpProtocolContext = {
  era: "legacy" | "modern";
  protocol_version: "legacy" | typeof MCP_MODERN_PROTOCOL_VERSION;
  server_info_trusted: false;
  discovery_trusted: false;
};

export type LnsatMcpServingOptions = LnsatMcpServerOptions & {
  onerror?: (error: Error) => void;
  access_authentication?: McpHttpAccessPolicy;
  onAccessPrincipal?: (principal: McpAccessPrincipal) => void;
};

export type McpRegisteredTool =
  | typeof mcpPacketInspectionToolRegistration
  | typeof mcpProjectStateToolRegistration
  | typeof mcpBuildPacketStateToolRegistration
  | typeof mcpOnboardingProfileInspectionToolRegistration
  | typeof mcpOnboardingContextInspectionToolRegistration
  | typeof mcpAuditLedgerMigrationApprovalPreviewToolRegistration
  | typeof mcpAuditLedgerWriterInterfaceToolRegistration
  | typeof mcpAuditLedgerWriterPersistencePreflightToolRegistration
  | typeof mcpAuditLedgerDatabaseSecurityPreflightToolRegistration
  | typeof mcpAuditLedgerPersistenceReadinessToolRegistration
  | typeof mcpAuditLedgerPersistenceScopeRequestToolRegistration
  | typeof mcpHardwareInventoryInspectionToolRegistration
  | typeof mcpHardwareAllocationRecommendationInspectionToolRegistration
  | typeof mcpPerformanceTelemetryInspectionToolRegistration
  | typeof mcpServiceDatabaseInventoryToolRegistration
  | typeof mcpSubstrateControlIntentToolRegistration
  | typeof mcpAgentContextFirewallToolRegistration
  | typeof mcpCapabilityBrokerRequestToolRegistration
  | typeof mcpSubstrateAdapterManifestToolRegistration
  | typeof mcpAdapterInvocationPreflightToolRegistration
  | typeof mcpAdapterInvocationResultToolRegistration
  | typeof mcpAdapterInvocationAuthorizationBundleToolRegistration
  | typeof mcpRuntimeAdapterReadinessGateToolRegistration
  | typeof mcpRuntimeAdapterImplementationScopeToolRegistration
  | typeof mcpRuntimeAdapterImplementationPlanToolRegistration
  | typeof mcpRuntimeAdapterImplementationAuthorizationRequestToolRegistration
  | typeof mcpRuntimeAdapterImplementationApprovalGateToolRegistration
  | typeof mcpRuntimeAdapterImplementationDryRunEvidenceToolRegistration
  | typeof mcpKnowledgeSurfaceToolRegistration;

export type McpToolListResponse = {
  ok: true;
  server_id: typeof LNSAT_MCP_SERVER_ID;
  status: typeof legacyMcpWireStatus.MCP_SERVER_STATUS;
  tools: McpRegisteredTool[];
  side_effects: [];
};

export type McpToolCallRequest = {
  name: string;
  arguments?: unknown;
};

export type McpServerErrorCode =
  "mcp.invalid_call" | "mcp.invalid_tool_name" | "mcp.unknown_tool";

export type McpServerError = {
  code: McpServerErrorCode;
  path: string;
  message: string;
  severity: "error";
};

export type McpToolCallResponse =
  | {
      ok: true;
      server_id: typeof LNSAT_MCP_SERVER_ID;
      tool: McpToolName;
      is_error: false;
      content: [
        {
          type: "json";
          json: McpToolJsonResponse;
        },
      ];
      side_effects: [];
    }
  | {
      ok: false;
      server_id: typeof LNSAT_MCP_SERVER_ID;
      tool: McpToolName | null;
      is_error: true;
      content:
        | []
        | [
            {
              type: "json";
              json: McpToolJsonResponse;
            },
          ];
      error: McpServerError | null;
      side_effects: [];
    };

export type LnsatReadOnlyMcpServer = {
  server_id: typeof LNSAT_MCP_SERVER_ID;
  status: typeof legacyMcpWireStatus.MCP_SERVER_STATUS;
  side_effects: [];
  listTools: () => McpToolListResponse;
  callTool: (request: unknown) => Promise<McpToolCallResponse>;
};

export type LocalStdioSmokeRequest = {
  request_id?: string;
  tool_call: McpToolCallRequest;
};

export type LocalStdioSmokeErrorCode =
  | "stdio.invalid_json"
  | "stdio.invalid_request"
  | "stdio.unexpected_field"
  | "stdio.missing_tool_call";

export type LocalStdioSmokeError = {
  code: LocalStdioSmokeErrorCode;
  path: string;
  message: string;
  severity: "error";
};

export type LocalStdioSmokeResponse =
  | {
      ok: true;
      transport: "local_stdio_smoke";
      status: typeof legacyMcpWireStatus.MCP_STDIO_SMOKE_STATUS;
      request_id: string | null;
      official_sdk_decision: typeof mcpStdioTransportDecision;
      mcp_response: McpToolCallResponse;
      side_effects: [];
    }
  | {
      ok: false;
      transport: "local_stdio_smoke";
      status: typeof legacyMcpWireStatus.MCP_STDIO_SMOKE_STATUS;
      request_id: string | null;
      official_sdk_decision: typeof mcpStdioTransportDecision;
      errors: LocalStdioSmokeError[];
      mcp_response: McpToolCallResponse | null;
      side_effects: [];
    };

const LNSAT_MCP_SERVER_ID = "lnsat.mcp.read_only.v0_1";
const LNSAT_OFFICIAL_MCP_SERVER_NAME = "lnsat.mcp.official.v0_2";
const LNSAT_OFFICIAL_MCP_SERVER_VERSION = "0.1.0";
const LNSAT_REPO_ROOT = fileURLToPath(new URL("../../..", import.meta.url));

type McpToolName =
  | typeof mcpPacketInspectionToolContract.tool
  | typeof mcpProjectStateToolContract.tool
  | typeof mcpBuildPacketStateToolContract.tool
  | typeof mcpOnboardingProfileInspectionToolContract.tool
  | typeof mcpOnboardingContextInspectionToolContract.tool
  | typeof mcpAuditLedgerMigrationApprovalPreviewToolContract.tool
  | typeof mcpAuditLedgerWriterInterfaceToolContract.tool
  | typeof mcpAuditLedgerWriterPersistencePreflightToolContract.tool
  | typeof mcpAuditLedgerDatabaseSecurityPreflightToolContract.tool
  | typeof mcpAuditLedgerPersistenceReadinessToolContract.tool
  | typeof mcpAuditLedgerPersistenceScopeRequestToolContract.tool
  | typeof mcpHardwareInventoryInspectionToolContract.tool
  | typeof mcpHardwareAllocationRecommendationInspectionToolContract.tool
  | typeof mcpPerformanceTelemetryInspectionToolContract.tool
  | typeof mcpServiceDatabaseInventoryToolContract.tool
  | typeof mcpSubstrateControlIntentToolContract.tool
  | typeof mcpAgentContextFirewallToolContract.tool
  | typeof mcpCapabilityBrokerRequestToolContract.tool
  | typeof mcpSubstrateAdapterManifestToolContract.tool
  | typeof mcpAdapterInvocationPreflightToolContract.tool
  | typeof mcpAdapterInvocationResultToolContract.tool
  | typeof mcpAdapterInvocationAuthorizationBundleToolContract.tool
  | typeof mcpRuntimeAdapterReadinessGateToolContract.tool
  | typeof mcpRuntimeAdapterImplementationScopeToolContract.tool
  | typeof mcpRuntimeAdapterImplementationPlanToolContract.tool
  | typeof mcpRuntimeAdapterImplementationAuthorizationRequestToolContract.tool
  | typeof mcpRuntimeAdapterImplementationApprovalGateToolContract.tool
  | typeof mcpRuntimeAdapterImplementationDryRunEvidenceToolContract.tool
  | typeof mcpKnowledgeSurfaceToolContract.tool;

type McpToolJsonResponse =
  | McpPacketInspectionAdapterResponse
  | McpProjectStateAdapterResponse
  | McpBuildPacketStateAdapterResponse
  | McpOnboardingProfileInspectionAdapterResponse
  | McpOnboardingContextInspectionAdapterResponse
  | McpAuditLedgerMigrationApprovalPreviewAdapterResponse
  | McpAuditLedgerWriterInterfaceAdapterResponse
  | McpAuditLedgerWriterPersistencePreflightAdapterResponse
  | McpAuditLedgerDatabaseSecurityPreflightAdapterResponse
  | McpAuditLedgerPersistenceReadinessAdapterResponse
  | McpAuditLedgerPersistenceScopeRequestAdapterResponse
  | McpHardwareInventoryInspectionAdapterResponse
  | McpHardwareAllocationRecommendationInspectionAdapterResponse
  | McpPerformanceTelemetryInspectionAdapterResponse
  | McpServiceDatabaseInventoryAdapterResponse
  | McpSubstrateControlIntentAdapterResponse
  | McpAgentContextFirewallAdapterResponse
  | McpCapabilityBrokerRequestAdapterResponse
  | McpSubstrateAdapterManifestAdapterResponse
  | McpAdapterInvocationPreflightAdapterResponse
  | McpAdapterInvocationResultAdapterResponse
  | McpAdapterInvocationAuthorizationBundleAdapterResponse
  | McpRuntimeAdapterReadinessGateAdapterResponse
  | McpRuntimeAdapterImplementationScopeAdapterResponse
  | McpRuntimeAdapterImplementationPlanAdapterResponse
  | McpRuntimeAdapterImplementationAuthorizationRequestAdapterResponse
  | McpRuntimeAdapterImplementationApprovalGateAdapterResponse
  | McpRuntimeAdapterImplementationDryRunEvidenceAdapterResponse
  | McpKnowledgeSurfaceAdapterResponse;

const officialPacketInspectionInputSchema = z
  .object({
    request_id: z.string().optional(),
    packet: z.unknown().optional(),
  })
  .passthrough();

const officialBuildPacketStateInputSchema = z
  .object({
    request_id: z.string().optional(),
    packet_id: z.string().optional(),
  })
  .passthrough();

const officialProjectStateInputSchema = z
  .object({
    request_id: z.string().optional(),
    item_id: z.string().optional(),
  })
  .passthrough();

const officialOnboardingProfileInspectionInputSchema = z
  .object({
    request_id: z.string().optional(),
    profile_kind: z.unknown().optional(),
  })
  .passthrough();

const officialOnboardingContextInspectionInputSchema = z
  .object({
    request_id: z.string().optional(),
    session_id: z.unknown().optional(),
    created_at: z.unknown().optional(),
  })
  .passthrough();

const officialAuditLedgerMigrationApprovalPreviewInputSchema = z
  .object({
    request_id: z.string().optional(),
    actor_id: z.unknown().optional(),
    session_id: z.unknown().optional(),
  })
  .passthrough();

const officialAuditLedgerWriterInterfaceInputSchema = z
  .object({
    request_id: z.string().optional(),
    actor_id: z.unknown().optional(),
    session_id: z.unknown().optional(),
    approval_evidence: z.unknown().optional(),
  })
  .passthrough();

const officialAuditLedgerWriterPersistencePreflightInputSchema = z
  .object({
    request_id: z.string().optional(),
    actor_id: z.unknown().optional(),
    session_id: z.unknown().optional(),
    approval_evidence: z.unknown().optional(),
    preflight_evidence: z.unknown().optional(),
  })
  .passthrough();

const officialAuditLedgerDatabaseSecurityPreflightInputSchema = z
  .object({
    request_id: z.string().optional(),
    actor_id: z.unknown().optional(),
    session_id: z.unknown().optional(),
    approval_evidence: z.unknown().optional(),
    security_evidence: z.unknown().optional(),
  })
  .passthrough();

const officialAuditLedgerPersistenceReadinessInputSchema = z
  .object({
    request_id: z.string().optional(),
    actor_id: z.unknown().optional(),
    session_id: z.unknown().optional(),
    approval_evidence: z.unknown().optional(),
    persistence_evidence: z.unknown().optional(),
    security_evidence: z.unknown().optional(),
    readiness_evidence: z.unknown().optional(),
  })
  .passthrough();

const officialAuditLedgerPersistenceScopeRequestInputSchema = z
  .object({
    request_id: z.string().optional(),
    actor_id: z.unknown().optional(),
    session_id: z.unknown().optional(),
    approval_evidence: z.unknown().optional(),
    readiness_source: z.unknown().optional(),
    readiness_evidence: z.unknown().optional(),
    scope_evidence: z.unknown().optional(),
  })
  .passthrough();

const officialHardwareInventoryInspectionInputSchema = z
  .object({
    request_id: z.unknown().optional(),
    inventory_request: z.unknown().optional(),
    live_collection_allowed: z.unknown().optional(),
    hardware_probe_allowed: z.unknown().optional(),
    node_agent_allowed: z.unknown().optional(),
    benchmark_allowed: z.unknown().optional(),
    placement_allowed: z.unknown().optional(),
    telemetry_collection_allowed: z.unknown().optional(),
    runtime_allowed: z.unknown().optional(),
    side_effects: z.unknown().optional(),
  })
  .passthrough();

const officialPerformanceTelemetryInspectionInputSchema = z
  .object({
    request_id: z.unknown().optional(),
    telemetry_request: z.unknown().optional(),
    collector_allowed: z.unknown().optional(),
    node_agent_allowed: z.unknown().optional(),
    hardware_probe_allowed: z.unknown().optional(),
    benchmark_execution_allowed: z.unknown().optional(),
    placement_allowed: z.unknown().optional(),
    alert_dispatch_allowed: z.unknown().optional(),
    runtime_allowed: z.unknown().optional(),
    database_write_allowed: z.unknown().optional(),
    network_access_allowed: z.unknown().optional(),
    side_effects: z.unknown().optional(),
  })
  .passthrough();

const officialHardwareAllocationRecommendationInspectionInputSchema = z
  .object({
    request_id: z.unknown().optional(),
    hae_request: z.unknown().optional(),
    hardware_probe_allowed: z.unknown().optional(),
    telemetry_collection_allowed: z.unknown().optional(),
    benchmark_execution_allowed: z.unknown().optional(),
    placement_allowed: z.unknown().optional(),
    drain_allowed: z.unknown().optional(),
    runtime_allowed: z.unknown().optional(),
    database_write_allowed: z.unknown().optional(),
    network_access_allowed: z.unknown().optional(),
    side_effects: z.unknown().optional(),
  })
  .passthrough();

const officialServiceDatabaseInventoryInputSchema = z
  .object({
    request_id: z.string().optional(),
    inventory_request: z.unknown().optional(),
  })
  .passthrough();

const officialSubstrateControlIntentInputSchema = z
  .object({
    request_id: z.string().optional(),
    intent_request: z.unknown().optional(),
  })
  .passthrough();

const officialAgentContextFirewallInputSchema = z
  .object({
    request_id: z.string().optional(),
    firewall_bundle_request: z.unknown().optional(),
  })
  .passthrough();

const officialCapabilityBrokerRequestInputSchema = z
  .object({
    request_id: z.string().optional(),
    broker_request: z.unknown().optional(),
  })
  .passthrough();

const officialSubstrateAdapterManifestInputSchema = z
  .object({
    request_id: z.string().optional(),
    manifest_request: z.unknown().optional(),
  })
  .passthrough();

const officialAdapterInvocationPreflightInputSchema = z
  .object({
    request_id: z.string().optional(),
    preflight_request: z.unknown().optional(),
  })
  .passthrough();

const officialAdapterInvocationResultInputSchema = z
  .object({
    request_id: z.string().optional(),
    result_request: z.unknown().optional(),
  })
  .passthrough();

const officialAdapterInvocationAuthorizationBundleInputSchema = z
  .object({
    request_id: z.string().optional(),
    bundle_request: z.unknown().optional(),
  })
  .passthrough();

const officialRuntimeAdapterReadinessGateInputSchema = z
  .object({
    request_id: z.string().optional(),
    readiness_request: z.unknown().optional(),
  })
  .passthrough();

const officialRuntimeAdapterImplementationScopeInputSchema = z
  .object({
    request_id: z.string().optional(),
    implementation_scope_request: z.unknown().optional(),
  })
  .passthrough();

const officialRuntimeAdapterImplementationPlanInputSchema = z
  .object({
    request_id: z.string().optional(),
    implementation_plan_request: z.unknown().optional(),
  })
  .passthrough();

const officialRuntimeAdapterImplementationAuthorizationRequestInputSchema = z
  .object({
    request_id: z.string().optional(),
    authorization_request: z.unknown().optional(),
  })
  .passthrough();

const officialRuntimeAdapterImplementationApprovalGateInputSchema = z
  .object({
    request_id: z.string().optional(),
    approval_gate_request: z.unknown().optional(),
  })
  .passthrough();

const officialRuntimeAdapterImplementationDryRunEvidenceInputSchema = z
  .object({
    request_id: z.string().optional(),
    dry_run_evidence_request: z.unknown().optional(),
  })
  .passthrough();

const officialKnowledgeSurfaceInputSchema = z
  .object({
    request_id: z.string().optional(),
    operation: z.enum(["sources", "search", "context"]).optional(),
    query: z.unknown().optional(),
    path: z.unknown().optional(),
    packet_id: z.unknown().optional(),
    decision_id: z.unknown().optional(),
    limit: z.unknown().optional(),
    search: z.unknown().optional(),
    bundle_id: z.unknown().optional(),
    objective: z.unknown().optional(),
    max_tokens: z.unknown().optional(),
    created_at: z.unknown().optional(),
    live_collection_allowed: z.unknown().optional(),
    side_effects: z.unknown().optional(),
  })
  .passthrough();

export function createMcpPacketInspectionEndpoint(
  options: LnsatMcpServerOptions = {},
): {
  registration: typeof mcpPacketInspectionToolRegistration;
  handle: (input: unknown) => Promise<McpPacketInspectionAdapterResponse>;
} {
  return {
    registration: mcpPacketInspectionToolRegistration,
    handle: (input) => {
      const adapterOptions = options.now === undefined ? {} : { now: options.now() };
      return inspectPacketThroughMcpAdapterContract(input, adapterOptions);
    },
  };
}

export function createMcpBuildPacketStateEndpoint(): {
  registration: typeof mcpBuildPacketStateToolRegistration;
  handle: (input: unknown) => Promise<McpBuildPacketStateAdapterResponse>;
} {
  return {
    registration: mcpBuildPacketStateToolRegistration,
    handle: readBuildPacketStateThroughMcpAdapterContract,
  };
}

export function createMcpProjectStateEndpoint(): {
  registration: typeof mcpProjectStateToolRegistration;
  handle: (input: unknown) => Promise<McpProjectStateAdapterResponse>;
} {
  return {
    registration: mcpProjectStateToolRegistration,
    handle: inspectProjectStateThroughMcpAdapterContract,
  };
}

export function createMcpOnboardingProfileInspectionEndpoint(
  options: LnsatMcpServerOptions = {},
): {
  registration: typeof mcpOnboardingProfileInspectionToolRegistration;
  handle: (input: unknown) => Promise<McpOnboardingProfileInspectionAdapterResponse>;
} {
  return {
    registration: mcpOnboardingProfileInspectionToolRegistration,
    handle: (input) => {
      const adapterOptions = options.now === undefined ? {} : { now: options.now() };
      return inspectOnboardingProfilesThroughMcpAdapterContract(input, adapterOptions);
    },
  };
}

export function createMcpOnboardingContextInspectionEndpoint(
  options: LnsatMcpServerOptions = {},
): {
  registration: typeof mcpOnboardingContextInspectionToolRegistration;
  handle: (input: unknown) => Promise<McpOnboardingContextInspectionAdapterResponse>;
} {
  return {
    registration: mcpOnboardingContextInspectionToolRegistration,
    handle: (input) => {
      const adapterOptions = options.now === undefined ? {} : { now: options.now() };
      return inspectOnboardingContextThroughMcpAdapterContract(input, adapterOptions);
    },
  };
}

export function createMcpAuditLedgerMigrationApprovalPreviewEndpoint(
  options: LnsatMcpServerOptions = {},
): {
  registration: typeof mcpAuditLedgerMigrationApprovalPreviewToolRegistration;
  handle: (
    input: unknown,
  ) => Promise<McpAuditLedgerMigrationApprovalPreviewAdapterResponse>;
} {
  return {
    registration: mcpAuditLedgerMigrationApprovalPreviewToolRegistration,
    handle: (input) => {
      const adapterOptions = options.now === undefined ? {} : { now: options.now() };
      return inspectAuditLedgerMigrationApprovalPreviewThroughMcpAdapterContract(
        input,
        adapterOptions,
      );
    },
  };
}

export function createMcpAuditLedgerWriterInterfaceEndpoint(
  options: LnsatMcpServerOptions = {},
): {
  registration: typeof mcpAuditLedgerWriterInterfaceToolRegistration;
  handle: (input: unknown) => Promise<McpAuditLedgerWriterInterfaceAdapterResponse>;
} {
  return {
    registration: mcpAuditLedgerWriterInterfaceToolRegistration,
    handle: (input) => {
      const adapterOptions = options.now === undefined ? {} : { now: options.now() };
      return inspectAuditLedgerWriterInterfaceThroughMcpAdapterContract(
        input,
        adapterOptions,
      );
    },
  };
}

export function createMcpAuditLedgerWriterPersistencePreflightEndpoint(
  options: LnsatMcpServerOptions = {},
): {
  registration: typeof mcpAuditLedgerWriterPersistencePreflightToolRegistration;
  handle: (
    input: unknown,
  ) => Promise<McpAuditLedgerWriterPersistencePreflightAdapterResponse>;
} {
  return {
    registration: mcpAuditLedgerWriterPersistencePreflightToolRegistration,
    handle: (input) => {
      const adapterOptions = options.now === undefined ? {} : { now: options.now() };
      return inspectAuditLedgerWriterPersistencePreflightThroughMcpAdapterContract(
        input,
        adapterOptions,
      );
    },
  };
}

export function createMcpAuditLedgerDatabaseSecurityPreflightEndpoint(
  options: LnsatMcpServerOptions = {},
): {
  registration: typeof mcpAuditLedgerDatabaseSecurityPreflightToolRegistration;
  handle: (
    input: unknown,
  ) => Promise<McpAuditLedgerDatabaseSecurityPreflightAdapterResponse>;
} {
  return {
    registration: mcpAuditLedgerDatabaseSecurityPreflightToolRegistration,
    handle: (input) => {
      const adapterOptions = options.now === undefined ? {} : { now: options.now() };
      return inspectAuditLedgerDatabaseSecurityPreflightThroughMcpAdapterContract(
        input,
        adapterOptions,
      );
    },
  };
}

export function createMcpAuditLedgerPersistenceReadinessEndpoint(
  options: LnsatMcpServerOptions = {},
): {
  registration: typeof mcpAuditLedgerPersistenceReadinessToolRegistration;
  handle: (
    input: unknown,
  ) => Promise<McpAuditLedgerPersistenceReadinessAdapterResponse>;
} {
  return {
    registration: mcpAuditLedgerPersistenceReadinessToolRegistration,
    handle: (input) => {
      const adapterOptions = options.now === undefined ? {} : { now: options.now() };
      return inspectAuditLedgerPersistenceReadinessThroughMcpAdapterContract(
        input,
        adapterOptions,
      );
    },
  };
}

export function createMcpAuditLedgerPersistenceScopeRequestEndpoint(
  options: LnsatMcpServerOptions = {},
): {
  registration: typeof mcpAuditLedgerPersistenceScopeRequestToolRegistration;
  handle: (
    input: unknown,
  ) => Promise<McpAuditLedgerPersistenceScopeRequestAdapterResponse>;
} {
  return {
    registration: mcpAuditLedgerPersistenceScopeRequestToolRegistration,
    handle: (input) => {
      const adapterOptions = options.now === undefined ? {} : { now: options.now() };
      return inspectAuditLedgerPersistenceScopeRequestThroughMcpAdapterContract(
        input,
        adapterOptions,
      );
    },
  };
}

function hardwareInventoryInspectionAdapterOptions(options: LnsatMcpServerOptions): {
  now?: Date;
} {
  if (options.now === undefined) {
    return {};
  }

  try {
    return { now: options.now() };
  } catch {
    return { now: new Date(Number.NaN) };
  }
}

function performanceTelemetryInspectionAdapterOptions(options: LnsatMcpServerOptions): {
  now?: Date;
} {
  if (options.now === undefined) return {};
  try {
    return { now: options.now() };
  } catch {
    return { now: new Date(Number.NaN) };
  }
}

export function createMcpHardwareInventoryInspectionEndpoint(
  options: LnsatMcpServerOptions = {},
): {
  registration: typeof mcpHardwareInventoryInspectionToolRegistration;
  handle: (input: unknown) => Promise<McpHardwareInventoryInspectionAdapterResponse>;
} {
  return {
    registration: mcpHardwareInventoryInspectionToolRegistration,
    handle: (input) =>
      inspectHardwareInventoryThroughMcpAdapterContract(
        input,
        hardwareInventoryInspectionAdapterOptions(options),
      ),
  };
}

export function createMcpPerformanceTelemetryInspectionEndpoint(
  options: LnsatMcpServerOptions = {},
): {
  registration: typeof mcpPerformanceTelemetryInspectionToolRegistration;
  handle: (input: unknown) => Promise<McpPerformanceTelemetryInspectionAdapterResponse>;
} {
  return {
    registration: mcpPerformanceTelemetryInspectionToolRegistration,
    handle: (input) =>
      inspectPerformanceTelemetryThroughMcpAdapterContract(
        input,
        performanceTelemetryInspectionAdapterOptions(options),
      ),
  };
}

export function createMcpHardwareAllocationRecommendationInspectionEndpoint(
  options: LnsatMcpServerOptions = {},
): {
  registration: typeof mcpHardwareAllocationRecommendationInspectionToolRegistration;
  handle: (
    input: unknown,
  ) => Promise<McpHardwareAllocationRecommendationInspectionAdapterResponse>;
} {
  return {
    registration: mcpHardwareAllocationRecommendationInspectionToolRegistration,
    handle: (input) =>
      inspectHardwareAllocationRecommendationThroughMcpAdapterContract(
        input,
        performanceTelemetryInspectionAdapterOptions(options),
      ),
  };
}

export function createMcpServiceDatabaseInventoryEndpoint(
  options: LnsatMcpServerOptions = {},
): {
  registration: typeof mcpServiceDatabaseInventoryToolRegistration;
  handle: (input: unknown) => Promise<McpServiceDatabaseInventoryAdapterResponse>;
} {
  return {
    registration: mcpServiceDatabaseInventoryToolRegistration,
    handle: (input) => {
      const adapterOptions = options.now === undefined ? {} : { now: options.now() };
      return inspectServiceDatabaseInventoryThroughMcpAdapterContract(
        input,
        adapterOptions,
      );
    },
  };
}

export function createMcpSubstrateControlIntentEndpoint(
  options: LnsatMcpServerOptions = {},
): {
  registration: typeof mcpSubstrateControlIntentToolRegistration;
  handle: (input: unknown) => Promise<McpSubstrateControlIntentAdapterResponse>;
} {
  return {
    registration: mcpSubstrateControlIntentToolRegistration,
    handle: (input) => {
      const adapterOptions = options.now === undefined ? {} : { now: options.now() };
      return inspectSubstrateControlIntentThroughMcpAdapterContract(
        input,
        adapterOptions,
      );
    },
  };
}

export function createMcpAgentContextFirewallEndpoint(
  options: LnsatMcpServerOptions = {},
): {
  registration: typeof mcpAgentContextFirewallToolRegistration;
  handle: (input: unknown) => Promise<McpAgentContextFirewallAdapterResponse>;
} {
  return {
    registration: mcpAgentContextFirewallToolRegistration,
    handle: (input) => {
      const adapterOptions = options.now === undefined ? {} : { now: options.now() };
      return inspectAgentContextFirewallThroughMcpAdapterContract(
        input,
        adapterOptions,
      );
    },
  };
}

export function createMcpCapabilityBrokerRequestEndpoint(
  options: LnsatMcpServerOptions = {},
): {
  registration: typeof mcpCapabilityBrokerRequestToolRegistration;
  handle: (input: unknown) => Promise<McpCapabilityBrokerRequestAdapterResponse>;
} {
  return {
    registration: mcpCapabilityBrokerRequestToolRegistration,
    handle: (input) => {
      const adapterOptions = options.now === undefined ? {} : { now: options.now() };
      return inspectCapabilityBrokerRequestThroughMcpAdapterContract(
        input,
        adapterOptions,
      );
    },
  };
}

export function createMcpSubstrateAdapterManifestEndpoint(
  options: LnsatMcpServerOptions = {},
): {
  registration: typeof mcpSubstrateAdapterManifestToolRegistration;
  handle: (input: unknown) => Promise<McpSubstrateAdapterManifestAdapterResponse>;
} {
  return {
    registration: mcpSubstrateAdapterManifestToolRegistration,
    handle: (input) => {
      const adapterOptions = options.now === undefined ? {} : { now: options.now() };
      return inspectSubstrateAdapterManifestThroughMcpAdapterContract(
        input,
        adapterOptions,
      );
    },
  };
}

export function createMcpAdapterInvocationPreflightEndpoint(
  options: LnsatMcpServerOptions = {},
): {
  registration: typeof mcpAdapterInvocationPreflightToolRegistration;
  handle: (input: unknown) => Promise<McpAdapterInvocationPreflightAdapterResponse>;
} {
  return {
    registration: mcpAdapterInvocationPreflightToolRegistration,
    handle: (input) => {
      const adapterOptions = options.now === undefined ? {} : { now: options.now() };
      return inspectAdapterInvocationPreflightThroughMcpAdapterContract(
        input,
        adapterOptions,
      );
    },
  };
}

export function createMcpAdapterInvocationResultEndpoint(
  options: LnsatMcpServerOptions = {},
): {
  registration: typeof mcpAdapterInvocationResultToolRegistration;
  handle: (input: unknown) => Promise<McpAdapterInvocationResultAdapterResponse>;
} {
  return {
    registration: mcpAdapterInvocationResultToolRegistration,
    handle: (input) => {
      const adapterOptions = options.now === undefined ? {} : { now: options.now() };
      return inspectAdapterInvocationResultThroughMcpAdapterContract(
        input,
        adapterOptions,
      );
    },
  };
}

export function createMcpAdapterInvocationAuthorizationBundleEndpoint(
  options: LnsatMcpServerOptions = {},
): {
  registration: typeof mcpAdapterInvocationAuthorizationBundleToolRegistration;
  handle: (
    input: unknown,
  ) => Promise<McpAdapterInvocationAuthorizationBundleAdapterResponse>;
} {
  return {
    registration: mcpAdapterInvocationAuthorizationBundleToolRegistration,
    handle: (input) => {
      const adapterOptions = options.now === undefined ? {} : { now: options.now() };
      return inspectAdapterInvocationAuthorizationBundleThroughMcpAdapterContract(
        input,
        adapterOptions,
      );
    },
  };
}

export function createMcpRuntimeAdapterReadinessGateEndpoint(
  options: LnsatMcpServerOptions = {},
): {
  registration: typeof mcpRuntimeAdapterReadinessGateToolRegistration;
  handle: (input: unknown) => Promise<McpRuntimeAdapterReadinessGateAdapterResponse>;
} {
  return {
    registration: mcpRuntimeAdapterReadinessGateToolRegistration,
    handle: (input) => {
      const adapterOptions = options.now === undefined ? {} : { now: options.now() };
      return inspectRuntimeAdapterReadinessGateThroughMcpAdapterContract(
        input,
        adapterOptions,
      );
    },
  };
}

export function createMcpRuntimeAdapterImplementationScopeEndpoint(
  options: LnsatMcpServerOptions = {},
): {
  registration: typeof mcpRuntimeAdapterImplementationScopeToolRegistration;
  handle: (
    input: unknown,
  ) => Promise<McpRuntimeAdapterImplementationScopeAdapterResponse>;
} {
  return {
    registration: mcpRuntimeAdapterImplementationScopeToolRegistration,
    handle: (input) => {
      const adapterOptions = options.now === undefined ? {} : { now: options.now() };
      return inspectRuntimeAdapterImplementationScopeThroughMcpAdapterContract(
        input,
        adapterOptions,
      );
    },
  };
}

export function createMcpRuntimeAdapterImplementationPlanEndpoint(
  options: LnsatMcpServerOptions = {},
): {
  registration: typeof mcpRuntimeAdapterImplementationPlanToolRegistration;
  handle: (
    input: unknown,
  ) => Promise<McpRuntimeAdapterImplementationPlanAdapterResponse>;
} {
  return {
    registration: mcpRuntimeAdapterImplementationPlanToolRegistration,
    handle: (input) => {
      const adapterOptions = options.now === undefined ? {} : { now: options.now() };
      return inspectRuntimeAdapterImplementationPlanThroughMcpAdapterContract(
        input,
        adapterOptions,
      );
    },
  };
}

export function createMcpRuntimeAdapterImplementationAuthorizationRequestEndpoint(
  options: LnsatMcpServerOptions = {},
): {
  registration: typeof mcpRuntimeAdapterImplementationAuthorizationRequestToolRegistration;
  handle: (
    input: unknown,
  ) => Promise<McpRuntimeAdapterImplementationAuthorizationRequestAdapterResponse>;
} {
  return {
    registration: mcpRuntimeAdapterImplementationAuthorizationRequestToolRegistration,
    handle: (input) => {
      const adapterOptions = options.now === undefined ? {} : { now: options.now() };
      return inspectRuntimeAdapterImplementationAuthorizationRequestThroughMcpAdapterContract(
        input,
        adapterOptions,
      );
    },
  };
}

export function createMcpRuntimeAdapterImplementationApprovalGateEndpoint(
  options: LnsatMcpServerOptions = {},
): {
  registration: typeof mcpRuntimeAdapterImplementationApprovalGateToolRegistration;
  handle: (
    input: unknown,
  ) => Promise<McpRuntimeAdapterImplementationApprovalGateAdapterResponse>;
} {
  return {
    registration: mcpRuntimeAdapterImplementationApprovalGateToolRegistration,
    handle: (input) => {
      const adapterOptions = options.now === undefined ? {} : { now: options.now() };
      return inspectRuntimeAdapterImplementationApprovalGateThroughMcpAdapterContract(
        input,
        adapterOptions,
      );
    },
  };
}

export function createMcpRuntimeAdapterImplementationDryRunEvidenceEndpoint(
  options: LnsatMcpServerOptions = {},
): {
  registration: typeof mcpRuntimeAdapterImplementationDryRunEvidenceToolRegistration;
  handle: (
    input: unknown,
  ) => Promise<McpRuntimeAdapterImplementationDryRunEvidenceAdapterResponse>;
} {
  return {
    registration: mcpRuntimeAdapterImplementationDryRunEvidenceToolRegistration,
    handle: (input) => {
      const adapterOptions = options.now === undefined ? {} : { now: options.now() };
      return inspectRuntimeAdapterImplementationDryRunEvidenceThroughMcpAdapterContract(
        input,
        adapterOptions,
      );
    },
  };
}

export function createMcpKnowledgeSurfaceEndpoint(): {
  registration: typeof mcpKnowledgeSurfaceToolRegistration;
  handle: (input: unknown) => Promise<McpKnowledgeSurfaceAdapterResponse>;
} {
  return {
    registration: mcpKnowledgeSurfaceToolRegistration,
    handle: inspectKnowledgeSurfaceThroughMcpAdapterContract,
  };
}

type RegisteredMcpEndpoints = {
  packetInspectionEndpoint: ReturnType<typeof createMcpPacketInspectionEndpoint>;
  projectStateEndpoint: ReturnType<typeof createMcpProjectStateEndpoint>;
  buildPacketStateEndpoint: ReturnType<typeof createMcpBuildPacketStateEndpoint>;
  onboardingProfileInspectionEndpoint: ReturnType<
    typeof createMcpOnboardingProfileInspectionEndpoint
  >;
  onboardingContextInspectionEndpoint: ReturnType<
    typeof createMcpOnboardingContextInspectionEndpoint
  >;
  auditLedgerMigrationApprovalPreviewEndpoint: ReturnType<
    typeof createMcpAuditLedgerMigrationApprovalPreviewEndpoint
  >;
  auditLedgerWriterInterfaceEndpoint: ReturnType<
    typeof createMcpAuditLedgerWriterInterfaceEndpoint
  >;
  auditLedgerWriterPersistencePreflightEndpoint: ReturnType<
    typeof createMcpAuditLedgerWriterPersistencePreflightEndpoint
  >;
  auditLedgerDatabaseSecurityPreflightEndpoint: ReturnType<
    typeof createMcpAuditLedgerDatabaseSecurityPreflightEndpoint
  >;
  auditLedgerPersistenceReadinessEndpoint: ReturnType<
    typeof createMcpAuditLedgerPersistenceReadinessEndpoint
  >;
  auditLedgerPersistenceScopeRequestEndpoint: ReturnType<
    typeof createMcpAuditLedgerPersistenceScopeRequestEndpoint
  >;
  hardwareInventoryInspectionEndpoint: ReturnType<
    typeof createMcpHardwareInventoryInspectionEndpoint
  >;
  hardwareAllocationRecommendationInspectionEndpoint: ReturnType<
    typeof createMcpHardwareAllocationRecommendationInspectionEndpoint
  >;
  performanceTelemetryInspectionEndpoint: ReturnType<
    typeof createMcpPerformanceTelemetryInspectionEndpoint
  >;
  serviceDatabaseInventoryEndpoint: ReturnType<
    typeof createMcpServiceDatabaseInventoryEndpoint
  >;
  substrateControlIntentEndpoint: ReturnType<
    typeof createMcpSubstrateControlIntentEndpoint
  >;
  agentContextFirewallEndpoint: ReturnType<
    typeof createMcpAgentContextFirewallEndpoint
  >;
  capabilityBrokerRequestEndpoint: ReturnType<
    typeof createMcpCapabilityBrokerRequestEndpoint
  >;
  substrateAdapterManifestEndpoint: ReturnType<
    typeof createMcpSubstrateAdapterManifestEndpoint
  >;
  adapterInvocationPreflightEndpoint: ReturnType<
    typeof createMcpAdapterInvocationPreflightEndpoint
  >;
  adapterInvocationResultEndpoint: ReturnType<
    typeof createMcpAdapterInvocationResultEndpoint
  >;
  adapterInvocationAuthorizationBundleEndpoint: ReturnType<
    typeof createMcpAdapterInvocationAuthorizationBundleEndpoint
  >;
  runtimeAdapterReadinessGateEndpoint: ReturnType<
    typeof createMcpRuntimeAdapterReadinessGateEndpoint
  >;
  runtimeAdapterImplementationScopeEndpoint: ReturnType<
    typeof createMcpRuntimeAdapterImplementationScopeEndpoint
  >;
  runtimeAdapterImplementationPlanEndpoint: ReturnType<
    typeof createMcpRuntimeAdapterImplementationPlanEndpoint
  >;
  runtimeAdapterImplementationAuthorizationRequestEndpoint: ReturnType<
    typeof createMcpRuntimeAdapterImplementationAuthorizationRequestEndpoint
  >;
  runtimeAdapterImplementationApprovalGateEndpoint: ReturnType<
    typeof createMcpRuntimeAdapterImplementationApprovalGateEndpoint
  >;
  runtimeAdapterImplementationDryRunEvidenceEndpoint: ReturnType<
    typeof createMcpRuntimeAdapterImplementationDryRunEvidenceEndpoint
  >;
  knowledgeSurfaceEndpoint: ReturnType<typeof createMcpKnowledgeSurfaceEndpoint>;
};

async function dispatchRegisteredToolCall(
  name: McpToolName,
  input: unknown,
  endpoints: RegisteredMcpEndpoints,
): Promise<McpToolJsonResponse> {
  if (name === mcpPacketInspectionToolContract.tool) {
    return endpoints.packetInspectionEndpoint.handle(input);
  }

  if (name === mcpProjectStateToolContract.tool) {
    return endpoints.projectStateEndpoint.handle(input);
  }

  if (name === mcpBuildPacketStateToolContract.tool) {
    return endpoints.buildPacketStateEndpoint.handle(input);
  }

  if (name === mcpOnboardingProfileInspectionToolContract.tool) {
    return endpoints.onboardingProfileInspectionEndpoint.handle(input);
  }

  if (name === mcpOnboardingContextInspectionToolContract.tool) {
    return endpoints.onboardingContextInspectionEndpoint.handle(input);
  }

  if (name === mcpAuditLedgerMigrationApprovalPreviewToolContract.tool) {
    return endpoints.auditLedgerMigrationApprovalPreviewEndpoint.handle(input);
  }

  if (name === mcpAuditLedgerWriterInterfaceToolContract.tool) {
    return endpoints.auditLedgerWriterInterfaceEndpoint.handle(input);
  }

  if (name === mcpAuditLedgerWriterPersistencePreflightToolContract.tool) {
    return endpoints.auditLedgerWriterPersistencePreflightEndpoint.handle(input);
  }

  if (name === mcpAuditLedgerDatabaseSecurityPreflightToolContract.tool) {
    return endpoints.auditLedgerDatabaseSecurityPreflightEndpoint.handle(input);
  }

  if (name === mcpAuditLedgerPersistenceReadinessToolContract.tool) {
    return endpoints.auditLedgerPersistenceReadinessEndpoint.handle(input);
  }

  if (name === mcpAuditLedgerPersistenceScopeRequestToolContract.tool) {
    return endpoints.auditLedgerPersistenceScopeRequestEndpoint.handle(input);
  }

  if (name === mcpHardwareInventoryInspectionToolContract.tool) {
    return endpoints.hardwareInventoryInspectionEndpoint.handle(input);
  }

  if (name === mcpHardwareAllocationRecommendationInspectionToolContract.tool) {
    return endpoints.hardwareAllocationRecommendationInspectionEndpoint.handle(input);
  }

  if (name === mcpPerformanceTelemetryInspectionToolContract.tool) {
    return endpoints.performanceTelemetryInspectionEndpoint.handle(input);
  }

  if (name === mcpServiceDatabaseInventoryToolContract.tool) {
    return endpoints.serviceDatabaseInventoryEndpoint.handle(input);
  }

  if (name === mcpSubstrateControlIntentToolContract.tool) {
    return endpoints.substrateControlIntentEndpoint.handle(input);
  }

  if (name === mcpAgentContextFirewallToolContract.tool) {
    return endpoints.agentContextFirewallEndpoint.handle(input);
  }

  if (name === mcpCapabilityBrokerRequestToolContract.tool) {
    return endpoints.capabilityBrokerRequestEndpoint.handle(input);
  }

  if (name === mcpSubstrateAdapterManifestToolContract.tool) {
    return endpoints.substrateAdapterManifestEndpoint.handle(input);
  }

  if (name === mcpAdapterInvocationPreflightToolContract.tool) {
    return endpoints.adapterInvocationPreflightEndpoint.handle(input);
  }

  if (name === mcpAdapterInvocationResultToolContract.tool) {
    return endpoints.adapterInvocationResultEndpoint.handle(input);
  }

  if (name === mcpAdapterInvocationAuthorizationBundleToolContract.tool) {
    return endpoints.adapterInvocationAuthorizationBundleEndpoint.handle(input);
  }

  if (name === mcpRuntimeAdapterReadinessGateToolContract.tool) {
    return endpoints.runtimeAdapterReadinessGateEndpoint.handle(input);
  }

  if (name === mcpRuntimeAdapterImplementationScopeToolContract.tool) {
    return endpoints.runtimeAdapterImplementationScopeEndpoint.handle(input);
  }

  if (name === mcpRuntimeAdapterImplementationPlanToolContract.tool) {
    return endpoints.runtimeAdapterImplementationPlanEndpoint.handle(input);
  }

  if (name === mcpRuntimeAdapterImplementationAuthorizationRequestToolContract.tool) {
    return endpoints.runtimeAdapterImplementationAuthorizationRequestEndpoint.handle(
      input,
    );
  }

  if (name === mcpRuntimeAdapterImplementationApprovalGateToolContract.tool) {
    return endpoints.runtimeAdapterImplementationApprovalGateEndpoint.handle(input);
  }

  if (name === mcpRuntimeAdapterImplementationDryRunEvidenceToolContract.tool) {
    return endpoints.runtimeAdapterImplementationDryRunEvidenceEndpoint.handle(input);
  }

  return endpoints.knowledgeSurfaceEndpoint.handle(input);
}

export function createLnsatReadOnlyMcpServer(
  options: LnsatMcpServerOptions = {},
): LnsatReadOnlyMcpServer {
  const packetInspectionEndpoint = createMcpPacketInspectionEndpoint(options);
  const projectStateEndpoint = createMcpProjectStateEndpoint();
  const buildPacketStateEndpoint = createMcpBuildPacketStateEndpoint();
  const onboardingProfileInspectionEndpoint =
    createMcpOnboardingProfileInspectionEndpoint(options);
  const onboardingContextInspectionEndpoint =
    createMcpOnboardingContextInspectionEndpoint(options);
  const auditLedgerMigrationApprovalPreviewEndpoint =
    createMcpAuditLedgerMigrationApprovalPreviewEndpoint(options);
  const auditLedgerWriterInterfaceEndpoint =
    createMcpAuditLedgerWriterInterfaceEndpoint(options);
  const auditLedgerWriterPersistencePreflightEndpoint =
    createMcpAuditLedgerWriterPersistencePreflightEndpoint(options);
  const auditLedgerDatabaseSecurityPreflightEndpoint =
    createMcpAuditLedgerDatabaseSecurityPreflightEndpoint(options);
  const auditLedgerPersistenceReadinessEndpoint =
    createMcpAuditLedgerPersistenceReadinessEndpoint(options);
  const auditLedgerPersistenceScopeRequestEndpoint =
    createMcpAuditLedgerPersistenceScopeRequestEndpoint(options);
  const hardwareInventoryInspectionEndpoint =
    createMcpHardwareInventoryInspectionEndpoint(options);
  const hardwareAllocationRecommendationInspectionEndpoint =
    createMcpHardwareAllocationRecommendationInspectionEndpoint(options);
  const performanceTelemetryInspectionEndpoint =
    createMcpPerformanceTelemetryInspectionEndpoint(options);
  const serviceDatabaseInventoryEndpoint =
    createMcpServiceDatabaseInventoryEndpoint(options);
  const substrateControlIntentEndpoint =
    createMcpSubstrateControlIntentEndpoint(options);
  const agentContextFirewallEndpoint = createMcpAgentContextFirewallEndpoint(options);
  const capabilityBrokerRequestEndpoint =
    createMcpCapabilityBrokerRequestEndpoint(options);
  const substrateAdapterManifestEndpoint =
    createMcpSubstrateAdapterManifestEndpoint(options);
  const adapterInvocationPreflightEndpoint =
    createMcpAdapterInvocationPreflightEndpoint(options);
  const adapterInvocationResultEndpoint =
    createMcpAdapterInvocationResultEndpoint(options);
  const adapterInvocationAuthorizationBundleEndpoint =
    createMcpAdapterInvocationAuthorizationBundleEndpoint(options);
  const runtimeAdapterReadinessGateEndpoint =
    createMcpRuntimeAdapterReadinessGateEndpoint(options);
  const runtimeAdapterImplementationScopeEndpoint =
    createMcpRuntimeAdapterImplementationScopeEndpoint(options);
  const runtimeAdapterImplementationPlanEndpoint =
    createMcpRuntimeAdapterImplementationPlanEndpoint(options);
  const runtimeAdapterImplementationAuthorizationRequestEndpoint =
    createMcpRuntimeAdapterImplementationAuthorizationRequestEndpoint(options);
  const runtimeAdapterImplementationApprovalGateEndpoint =
    createMcpRuntimeAdapterImplementationApprovalGateEndpoint(options);
  const runtimeAdapterImplementationDryRunEvidenceEndpoint =
    createMcpRuntimeAdapterImplementationDryRunEvidenceEndpoint(options);
  const knowledgeSurfaceEndpoint = createMcpKnowledgeSurfaceEndpoint();
  const tools = [
    packetInspectionEndpoint.registration,
    projectStateEndpoint.registration,
    buildPacketStateEndpoint.registration,
    onboardingProfileInspectionEndpoint.registration,
    onboardingContextInspectionEndpoint.registration,
    auditLedgerMigrationApprovalPreviewEndpoint.registration,
    auditLedgerWriterInterfaceEndpoint.registration,
    auditLedgerWriterPersistencePreflightEndpoint.registration,
    auditLedgerDatabaseSecurityPreflightEndpoint.registration,
    auditLedgerPersistenceReadinessEndpoint.registration,
    auditLedgerPersistenceScopeRequestEndpoint.registration,
    hardwareInventoryInspectionEndpoint.registration,
    hardwareAllocationRecommendationInspectionEndpoint.registration,
    performanceTelemetryInspectionEndpoint.registration,
    serviceDatabaseInventoryEndpoint.registration,
    substrateControlIntentEndpoint.registration,
    capabilityBrokerRequestEndpoint.registration,
    substrateAdapterManifestEndpoint.registration,
    adapterInvocationPreflightEndpoint.registration,
    adapterInvocationResultEndpoint.registration,
    adapterInvocationAuthorizationBundleEndpoint.registration,
    runtimeAdapterReadinessGateEndpoint.registration,
    runtimeAdapterImplementationScopeEndpoint.registration,
    runtimeAdapterImplementationPlanEndpoint.registration,
    runtimeAdapterImplementationAuthorizationRequestEndpoint.registration,
    runtimeAdapterImplementationApprovalGateEndpoint.registration,
    runtimeAdapterImplementationDryRunEvidenceEndpoint.registration,
    knowledgeSurfaceEndpoint.registration,
    agentContextFirewallEndpoint.registration,
  ];

  return {
    server_id: LNSAT_MCP_SERVER_ID,
    status: legacyMcpWireStatus.MCP_SERVER_STATUS,
    side_effects: [],
    listTools: () => ({
      ok: true,
      server_id: LNSAT_MCP_SERVER_ID,
      status: legacyMcpWireStatus.MCP_SERVER_STATUS,
      tools,
      side_effects: [],
    }),
    callTool: async (request) => {
      const normalized = normalizeMcpToolCallRequest(request);
      if (!normalized.ok) {
        return mcpCallFailure(null, normalized.error);
      }

      if (
        normalized.name !== mcpPacketInspectionToolContract.tool &&
        normalized.name !== mcpProjectStateToolContract.tool &&
        normalized.name !== mcpBuildPacketStateToolContract.tool &&
        normalized.name !== mcpOnboardingProfileInspectionToolContract.tool &&
        normalized.name !== mcpOnboardingContextInspectionToolContract.tool &&
        normalized.name !== mcpAuditLedgerMigrationApprovalPreviewToolContract.tool &&
        normalized.name !== mcpAuditLedgerWriterInterfaceToolContract.tool &&
        normalized.name !== mcpAuditLedgerWriterPersistencePreflightToolContract.tool &&
        normalized.name !== mcpAuditLedgerDatabaseSecurityPreflightToolContract.tool &&
        normalized.name !== mcpAuditLedgerPersistenceReadinessToolContract.tool &&
        normalized.name !== mcpAuditLedgerPersistenceScopeRequestToolContract.tool &&
        normalized.name !== mcpHardwareInventoryInspectionToolContract.tool &&
        normalized.name !==
          mcpHardwareAllocationRecommendationInspectionToolContract.tool &&
        normalized.name !== mcpPerformanceTelemetryInspectionToolContract.tool &&
        normalized.name !== mcpServiceDatabaseInventoryToolContract.tool &&
        normalized.name !== mcpSubstrateControlIntentToolContract.tool &&
        normalized.name !== mcpAgentContextFirewallToolContract.tool &&
        normalized.name !== mcpCapabilityBrokerRequestToolContract.tool &&
        normalized.name !== mcpSubstrateAdapterManifestToolContract.tool &&
        normalized.name !== mcpAdapterInvocationPreflightToolContract.tool &&
        normalized.name !== mcpAdapterInvocationResultToolContract.tool &&
        normalized.name !== mcpAdapterInvocationAuthorizationBundleToolContract.tool &&
        normalized.name !== mcpRuntimeAdapterReadinessGateToolContract.tool &&
        normalized.name !== mcpRuntimeAdapterImplementationScopeToolContract.tool &&
        normalized.name !== mcpRuntimeAdapterImplementationPlanToolContract.tool &&
        normalized.name !==
          mcpRuntimeAdapterImplementationAuthorizationRequestToolContract.tool &&
        normalized.name !==
          mcpRuntimeAdapterImplementationApprovalGateToolContract.tool &&
        normalized.name !==
          mcpRuntimeAdapterImplementationDryRunEvidenceToolContract.tool &&
        normalized.name !== mcpKnowledgeSurfaceToolContract.tool
      ) {
        return mcpCallFailure(null, {
          code: "mcp.unknown_tool",
          path: "/name",
          message: "MCP tool is not registered on this read-only server.",
          severity: "error",
        });
      }

      const adapterResponse = await dispatchRegisteredToolCall(
        normalized.name,
        normalized.arguments,
        {
          packetInspectionEndpoint,
          projectStateEndpoint,
          buildPacketStateEndpoint,
          onboardingProfileInspectionEndpoint,
          onboardingContextInspectionEndpoint,
          auditLedgerMigrationApprovalPreviewEndpoint,
          auditLedgerWriterInterfaceEndpoint,
          auditLedgerWriterPersistencePreflightEndpoint,
          auditLedgerDatabaseSecurityPreflightEndpoint,
          auditLedgerPersistenceReadinessEndpoint,
          auditLedgerPersistenceScopeRequestEndpoint,
          hardwareInventoryInspectionEndpoint,
          hardwareAllocationRecommendationInspectionEndpoint,
          performanceTelemetryInspectionEndpoint,
          serviceDatabaseInventoryEndpoint,
          substrateControlIntentEndpoint,
          agentContextFirewallEndpoint,
          capabilityBrokerRequestEndpoint,
          substrateAdapterManifestEndpoint,
          adapterInvocationPreflightEndpoint,
          adapterInvocationResultEndpoint,
          adapterInvocationAuthorizationBundleEndpoint,
          runtimeAdapterReadinessGateEndpoint,
          runtimeAdapterImplementationScopeEndpoint,
          runtimeAdapterImplementationPlanEndpoint,
          runtimeAdapterImplementationAuthorizationRequestEndpoint,
          runtimeAdapterImplementationApprovalGateEndpoint,
          runtimeAdapterImplementationDryRunEvidenceEndpoint,
          knowledgeSurfaceEndpoint,
        },
      );

      if (!adapterResponse.ok) {
        return {
          ok: false,
          server_id: LNSAT_MCP_SERVER_ID,
          tool: normalized.name,
          is_error: true,
          content: [
            {
              type: "json",
              json: adapterResponse,
            },
          ],
          error: null,
          side_effects: [],
        };
      }

      return {
        ok: true,
        server_id: LNSAT_MCP_SERVER_ID,
        tool: normalized.name,
        is_error: false,
        content: [
          {
            type: "json",
            json: adapterResponse,
          },
        ],
        side_effects: [],
      };
    },
  };
}

export function createLnsatOfficialMcpSdkServer(
  options: LnsatMcpServerOptions = {},
): McpServer {
  const sdkServer = new McpServer({
    name: LNSAT_OFFICIAL_MCP_SERVER_NAME,
    version: LNSAT_OFFICIAL_MCP_SERVER_VERSION,
  });

  sdkServer.registerTool(
    mcpPacketInspectionToolRegistration.name,
    {
      title: mcpPacketInspectionToolRegistration.title,
      description: mcpPacketInspectionToolRegistration.description,
      inputSchema: officialPacketInspectionInputSchema,
      annotations: mcpPacketInspectionToolRegistration.annotations,
      _meta: {
        lnsat_status: legacyMcpWireStatus.MCP_OFFICIAL_STDIO_STATUS,
        lnsat_server_id: LNSAT_MCP_SERVER_ID,
        gateway_contract_id: packetInspectionGatewayContract.contract_id,
        authority: ["lnsat.gateway.packet_inspection.v0_1"],
        side_effects: [],
      },
    },
    async (input) => {
      const adapterOptions = options.now === undefined ? {} : { now: options.now() };
      const response = await inspectPacketThroughMcpAdapterContract(
        input,
        adapterOptions,
      );

      return officialMcpToolResult(response);
    },
  );

  sdkServer.registerTool(
    mcpProjectStateToolRegistration.name,
    {
      title: mcpProjectStateToolRegistration.title,
      description: mcpProjectStateToolRegistration.description,
      inputSchema: officialProjectStateInputSchema,
      annotations: mcpProjectStateToolRegistration.annotations,
      _meta: {
        lnsat_status: "read_only",
        lnsat_server_id: LNSAT_MCP_SERVER_ID,
        gateway_contract_id: projectStateGatewayContract.contract_id,
        authority: mcpProjectStateToolContract.authority,
        source_docs: mcpProjectStateToolContract.source_docs,
        request_version: mcpProjectStateToolContract.request_version,
        response_version: mcpProjectStateToolContract.response_version,
        side_effects: [],
      },
    },
    async (input) => {
      const response = await inspectProjectStateThroughMcpAdapterContract(input);
      return officialMcpToolResult(response);
    },
  );

  sdkServer.registerTool(
    mcpBuildPacketStateToolRegistration.name,
    {
      title: mcpBuildPacketStateToolRegistration.title,
      description: mcpBuildPacketStateToolRegistration.description,
      inputSchema: officialBuildPacketStateInputSchema,
      annotations: mcpBuildPacketStateToolRegistration.annotations,
      _meta: {
        lnsat_status: legacyMcpWireStatus.PROJECT_STATE_STATUS,
        lnsat_server_id: LNSAT_MCP_SERVER_ID,
        authority: ["repo-local-build-management-docs"],
        source_docs: mcpBuildPacketStateToolContract.source_docs,
        side_effects: [],
      },
    },
    async (input) => {
      const response = await readBuildPacketStateThroughMcpAdapterContract(input);
      return officialMcpToolResult(response);
    },
  );

  sdkServer.registerTool(
    mcpOnboardingProfileInspectionToolRegistration.name,
    {
      title: mcpOnboardingProfileInspectionToolRegistration.title,
      description: mcpOnboardingProfileInspectionToolRegistration.description,
      inputSchema: officialOnboardingProfileInspectionInputSchema,
      annotations: mcpOnboardingProfileInspectionToolRegistration.annotations,
      _meta: {
        lnsat_status:
          legacyMcpWireStatus.MCP_ONBOARDING_PROFILE_SERVER_REGISTRATION_STATUS,
        lnsat_server_id: LNSAT_MCP_SERVER_ID,
        gateway_contract_id: onboardingProfileInspectionGatewayContract.contract_id,
        authority: ["lnsat.gateway.onboarding_profile_inspection.v0_1"],
        source_docs: mcpOnboardingProfileInspectionToolContract.source_docs,
        side_effects: [],
      },
    },
    async (input) => {
      const adapterOptions = options.now === undefined ? {} : { now: options.now() };
      const response = await inspectOnboardingProfilesThroughMcpAdapterContract(
        input,
        adapterOptions,
      );

      return officialMcpToolResult(response);
    },
  );

  sdkServer.registerTool(
    mcpOnboardingContextInspectionToolRegistration.name,
    {
      title: mcpOnboardingContextInspectionToolRegistration.title,
      description: mcpOnboardingContextInspectionToolRegistration.description,
      inputSchema: officialOnboardingContextInspectionInputSchema,
      annotations: mcpOnboardingContextInspectionToolRegistration.annotations,
      _meta: {
        lnsat_status:
          legacyMcpWireStatus.MCP_ONBOARDING_CONTEXT_SERVER_REGISTRATION_STATUS,
        lnsat_server_id: LNSAT_MCP_SERVER_ID,
        gateway_contract_id: onboardingContextInspectionGatewayContract.contract_id,
        authority: ["lnsat.gateway.onboarding_context_packet_inspection.v0_1"],
        source_docs: mcpOnboardingContextInspectionToolContract.source_docs,
        side_effects: [],
      },
    },
    async (input) => {
      const adapterOptions = options.now === undefined ? {} : { now: options.now() };
      const response = await inspectOnboardingContextThroughMcpAdapterContract(
        input,
        adapterOptions,
      );

      return officialMcpToolResult(response);
    },
  );

  sdkServer.registerTool(
    mcpAuditLedgerMigrationApprovalPreviewToolRegistration.name,
    {
      title: mcpAuditLedgerMigrationApprovalPreviewToolRegistration.title,
      description: mcpAuditLedgerMigrationApprovalPreviewToolRegistration.description,
      inputSchema: officialAuditLedgerMigrationApprovalPreviewInputSchema,
      annotations: mcpAuditLedgerMigrationApprovalPreviewToolRegistration.annotations,
      _meta: {
        lnsat_status:
          legacyMcpWireStatus.MCP_AUDIT_LEDGER_MIGRATION_APPROVAL_PREVIEW_SERVER_REGISTRATION_STATUS,
        lnsat_server_id: LNSAT_MCP_SERVER_ID,
        gateway_contract_id:
          auditLedgerMigrationApprovalPreviewGatewayContract.contract_id,
        authority: ["lnsat.gateway.audit_ledger_migration_approval_preview.v0_1"],
        source_docs: mcpAuditLedgerMigrationApprovalPreviewToolContract.source_docs,
        live_execution_allowed: false,
        side_effects: [],
      },
    },
    async (input) => {
      const adapterOptions = options.now === undefined ? {} : { now: options.now() };
      const response =
        await inspectAuditLedgerMigrationApprovalPreviewThroughMcpAdapterContract(
          input,
          adapterOptions,
        );

      return officialMcpToolResult(response);
    },
  );

  sdkServer.registerTool(
    mcpAuditLedgerWriterInterfaceToolRegistration.name,
    {
      title: mcpAuditLedgerWriterInterfaceToolRegistration.title,
      description: mcpAuditLedgerWriterInterfaceToolRegistration.description,
      inputSchema: officialAuditLedgerWriterInterfaceInputSchema,
      annotations: mcpAuditLedgerWriterInterfaceToolRegistration.annotations,
      _meta: {
        lnsat_status:
          legacyMcpWireStatus.MCP_AUDIT_LEDGER_WRITER_INTERFACE_SERVER_REGISTRATION_STATUS,
        lnsat_server_id: LNSAT_MCP_SERVER_ID,
        gateway_contract_id: auditLedgerWriterInterfaceGatewayContract.contract_id,
        authority: ["lnsat.gateway.audit_ledger_writer_interface.v0_1"],
        source_docs: mcpAuditLedgerWriterInterfaceToolContract.source_docs,
        live_execution_allowed: false,
        side_effects: [],
      },
    },
    async (input) => {
      const adapterOptions = options.now === undefined ? {} : { now: options.now() };
      const response = await inspectAuditLedgerWriterInterfaceThroughMcpAdapterContract(
        input,
        adapterOptions,
      );

      return officialMcpToolResult(response);
    },
  );

  sdkServer.registerTool(
    mcpAuditLedgerWriterPersistencePreflightToolRegistration.name,
    {
      title: mcpAuditLedgerWriterPersistencePreflightToolRegistration.title,
      description: mcpAuditLedgerWriterPersistencePreflightToolRegistration.description,
      inputSchema: officialAuditLedgerWriterPersistencePreflightInputSchema,
      annotations: mcpAuditLedgerWriterPersistencePreflightToolRegistration.annotations,
      _meta: {
        lnsat_status:
          legacyMcpWireStatus.MCP_AUDIT_LEDGER_WRITER_PERSISTENCE_PREFLIGHT_SERVER_REGISTRATION_STATUS,
        lnsat_server_id: LNSAT_MCP_SERVER_ID,
        gateway_contract_id:
          auditLedgerWriterPersistencePreflightGatewayContract.contract_id,
        authority: ["lnsat.gateway.audit_ledger_writer_persistence_preflight.v0_1"],
        source_docs: mcpAuditLedgerWriterPersistencePreflightToolContract.source_docs,
        live_execution_allowed: false,
        side_effects: [],
      },
    },
    async (input) => {
      const adapterOptions = options.now === undefined ? {} : { now: options.now() };
      const response =
        await inspectAuditLedgerWriterPersistencePreflightThroughMcpAdapterContract(
          input,
          adapterOptions,
        );

      return officialMcpToolResult(response);
    },
  );

  sdkServer.registerTool(
    mcpAuditLedgerDatabaseSecurityPreflightToolRegistration.name,
    {
      title: mcpAuditLedgerDatabaseSecurityPreflightToolRegistration.title,
      description: mcpAuditLedgerDatabaseSecurityPreflightToolRegistration.description,
      inputSchema: officialAuditLedgerDatabaseSecurityPreflightInputSchema,
      annotations: mcpAuditLedgerDatabaseSecurityPreflightToolRegistration.annotations,
      _meta: {
        lnsat_status:
          legacyMcpWireStatus.MCP_AUDIT_LEDGER_DATABASE_SECURITY_PREFLIGHT_SERVER_REGISTRATION_STATUS,
        lnsat_server_id: LNSAT_MCP_SERVER_ID,
        gateway_contract_id:
          auditLedgerDatabaseSecurityPreflightGatewayContract.contract_id,
        authority: ["lnsat.gateway.audit_ledger_database_security_preflight.v0_1"],
        source_docs: mcpAuditLedgerDatabaseSecurityPreflightToolContract.source_docs,
        live_execution_allowed: false,
        side_effects: [],
      },
    },
    async (input) => {
      const adapterOptions = options.now === undefined ? {} : { now: options.now() };
      const response =
        await inspectAuditLedgerDatabaseSecurityPreflightThroughMcpAdapterContract(
          input,
          adapterOptions,
        );

      return officialMcpToolResult(response);
    },
  );

  sdkServer.registerTool(
    mcpAuditLedgerPersistenceReadinessToolRegistration.name,
    {
      title: mcpAuditLedgerPersistenceReadinessToolRegistration.title,
      description: mcpAuditLedgerPersistenceReadinessToolRegistration.description,
      inputSchema: officialAuditLedgerPersistenceReadinessInputSchema,
      annotations: mcpAuditLedgerPersistenceReadinessToolRegistration.annotations,
      _meta: {
        lnsat_status:
          legacyMcpWireStatus.MCP_AUDIT_LEDGER_PERSISTENCE_READINESS_SERVER_REGISTRATION_STATUS,
        lnsat_server_id: LNSAT_MCP_SERVER_ID,
        gateway_contract_id: auditLedgerPersistenceReadinessGatewayContract.contract_id,
        authority: ["lnsat.gateway.audit_ledger_persistence_readiness_gate.v0_1"],
        source_docs: mcpAuditLedgerPersistenceReadinessToolContract.source_docs,
        live_execution_allowed: false,
        side_effects: [],
      },
    },
    async (input) => {
      const adapterOptions = options.now === undefined ? {} : { now: options.now() };
      const response =
        await inspectAuditLedgerPersistenceReadinessThroughMcpAdapterContract(
          input,
          adapterOptions,
        );

      return officialMcpToolResult(response);
    },
  );

  sdkServer.registerTool(
    mcpAuditLedgerPersistenceScopeRequestToolRegistration.name,
    {
      title: mcpAuditLedgerPersistenceScopeRequestToolRegistration.title,
      description: mcpAuditLedgerPersistenceScopeRequestToolRegistration.description,
      inputSchema: officialAuditLedgerPersistenceScopeRequestInputSchema,
      annotations: mcpAuditLedgerPersistenceScopeRequestToolRegistration.annotations,
      _meta: {
        lnsat_status:
          legacyMcpWireStatus.MCP_AUDIT_LEDGER_PERSISTENCE_SCOPE_REQUEST_SERVER_REGISTRATION_STATUS,
        lnsat_server_id: LNSAT_MCP_SERVER_ID,
        gateway_contract_id:
          auditLedgerPersistenceScopeRequestGatewayContract.contract_id,
        authority: ["lnsat.gateway.audit_ledger_persistence_scope_request.v0_1"],
        source_docs: mcpAuditLedgerPersistenceScopeRequestToolContract.source_docs,
        live_execution_allowed: false,
        side_effects: [],
      },
    },
    async (input) => {
      const adapterOptions = options.now === undefined ? {} : { now: options.now() };
      const response =
        await inspectAuditLedgerPersistenceScopeRequestThroughMcpAdapterContract(
          input,
          adapterOptions,
        );

      return officialMcpToolResult(response);
    },
  );

  sdkServer.registerTool(
    mcpHardwareInventoryInspectionToolRegistration.name,
    {
      title: mcpHardwareInventoryInspectionToolRegistration.title,
      description: mcpHardwareInventoryInspectionToolRegistration.description,
      inputSchema: officialHardwareInventoryInspectionInputSchema,
      annotations: mcpHardwareInventoryInspectionToolRegistration.annotations,
      _meta: {
        lnsat_status:
          legacyMcpWireStatus.MCP_HARDWARE_INVENTORY_SERVER_REGISTRATION_STATUS,
        lnsat_server_id: LNSAT_MCP_SERVER_ID,
        gateway_contract_id: hardwareInventoryInspectionGatewayContract.contract_id,
        authority: mcpHardwareInventoryInspectionToolContract.authority,
        source_docs: mcpHardwareInventoryInspectionToolContract.source_docs,
        supplied_inventory_only: true,
        read_only: true,
        recommendation_only: true,
        live_collection_allowed: false,
        hardware_probe_allowed: false,
        node_agent_allowed: false,
        benchmark_allowed: false,
        placement_allowed: false,
        telemetry_collection_allowed: false,
        runtime_allowed: false,
        database_write_allowed: false,
        network_access_allowed: false,
        side_effects: [],
      },
    },
    async (input) => {
      const response = await inspectHardwareInventoryThroughMcpAdapterContract(
        input,
        hardwareInventoryInspectionAdapterOptions(options),
      );

      return officialMcpToolResult(response);
    },
  );

  sdkServer.registerTool(
    mcpHardwareAllocationRecommendationInspectionToolRegistration.name,
    {
      title: mcpHardwareAllocationRecommendationInspectionToolRegistration.title,
      description:
        mcpHardwareAllocationRecommendationInspectionToolRegistration.description,
      inputSchema: officialHardwareAllocationRecommendationInspectionInputSchema,
      annotations:
        mcpHardwareAllocationRecommendationInspectionToolRegistration.annotations,
      _meta: {
        lnsat_status:
          legacyMcpWireStatus.MCP_HARDWARE_ALLOCATION_RECOMMENDATION_SERVER_REGISTRATION_STATUS,
        lnsat_server_id: LNSAT_MCP_SERVER_ID,
        gateway_contract_id:
          hardwareAllocationRecommendationInspectionGatewayContract.contract_id,
        authority: mcpHardwareAllocationRecommendationInspectionToolContract.authority,
        source_docs:
          mcpHardwareAllocationRecommendationInspectionToolContract.source_docs,
        caller_supplied_hae_only: true,
        read_only: true,
        recommendation_only: true,
        simulation_only: true,
        hardware_probe_allowed: false,
        telemetry_collection_allowed: false,
        benchmark_execution_allowed: false,
        placement_allowed: false,
        drain_allowed: false,
        runtime_allowed: false,
        database_write_allowed: false,
        network_access_allowed: false,
        side_effects: [],
      },
    },
    async (input) => {
      const response =
        await inspectHardwareAllocationRecommendationThroughMcpAdapterContract(
          input,
          performanceTelemetryInspectionAdapterOptions(options),
        );
      return officialMcpToolResult(response);
    },
  );

  sdkServer.registerTool(
    mcpPerformanceTelemetryInspectionToolRegistration.name,
    {
      title: mcpPerformanceTelemetryInspectionToolRegistration.title,
      description: mcpPerformanceTelemetryInspectionToolRegistration.description,
      inputSchema: officialPerformanceTelemetryInspectionInputSchema,
      annotations: mcpPerformanceTelemetryInspectionToolRegistration.annotations,
      _meta: {
        lnsat_status:
          legacyMcpWireStatus.MCP_PERFORMANCE_TELEMETRY_SERVER_REGISTRATION_STATUS,
        lnsat_server_id: LNSAT_MCP_SERVER_ID,
        gateway_contract_id: performanceTelemetryInspectionGatewayContract.contract_id,
        authority: mcpPerformanceTelemetryInspectionToolContract.authority,
        source_docs: mcpPerformanceTelemetryInspectionToolContract.source_docs,
        supplied_telemetry_only: true,
        read_only: true,
        recommendation_only: true,
        collector_allowed: false,
        node_agent_allowed: false,
        hardware_probe_allowed: false,
        benchmark_execution_allowed: false,
        placement_allowed: false,
        alert_dispatch_allowed: false,
        runtime_allowed: false,
        database_write_allowed: false,
        network_access_allowed: false,
        side_effects: [],
      },
    },
    async (input) => {
      const response = await inspectPerformanceTelemetryThroughMcpAdapterContract(
        input,
        performanceTelemetryInspectionAdapterOptions(options),
      );

      return officialMcpToolResult(response);
    },
  );

  sdkServer.registerTool(
    mcpServiceDatabaseInventoryToolRegistration.name,
    {
      title: mcpServiceDatabaseInventoryToolRegistration.title,
      description: mcpServiceDatabaseInventoryToolRegistration.description,
      inputSchema: officialServiceDatabaseInventoryInputSchema,
      annotations: mcpServiceDatabaseInventoryToolRegistration.annotations,
      _meta: {
        lnsat_status:
          legacyMcpWireStatus.MCP_SERVICE_DATABASE_INVENTORY_SERVER_REGISTRATION_STATUS,
        lnsat_server_id: LNSAT_MCP_SERVER_ID,
        gateway_contract_id: serviceDatabaseInventoryGatewayContract.contract_id,
        authority: ["lnsat.gateway.service_database_inventory_migration_planner.v0_1"],
        source_docs: mcpServiceDatabaseInventoryToolContract.source_docs,
        live_database_write_allowed: false,
        live_service_mutation_allowed: false,
        side_effects: [],
      },
    },
    async (input) => {
      const adapterOptions = options.now === undefined ? {} : { now: options.now() };
      const response = await inspectServiceDatabaseInventoryThroughMcpAdapterContract(
        input,
        adapterOptions,
      );

      return officialMcpToolResult(response);
    },
  );

  sdkServer.registerTool(
    mcpSubstrateControlIntentToolRegistration.name,
    {
      title: mcpSubstrateControlIntentToolRegistration.title,
      description: mcpSubstrateControlIntentToolRegistration.description,
      inputSchema: officialSubstrateControlIntentInputSchema,
      annotations: mcpSubstrateControlIntentToolRegistration.annotations,
      _meta: {
        lnsat_status:
          legacyMcpWireStatus.MCP_SUBSTRATE_CONTROL_INTENT_SERVER_REGISTRATION_STATUS,
        lnsat_server_id: LNSAT_MCP_SERVER_ID,
        gateway_contract_id: substrateControlIntentGatewayContract.contract_id,
        authority: ["lnsat.gateway.substrate_control_intent.v0_1"],
        source_docs: mcpSubstrateControlIntentToolContract.source_docs,
        live_substrate_mutation_allowed: false,
        live_execution_allowed: false,
        side_effects: [],
      },
    },
    async (input) => {
      const adapterOptions = options.now === undefined ? {} : { now: options.now() };
      const response = await inspectSubstrateControlIntentThroughMcpAdapterContract(
        input,
        adapterOptions,
      );

      return officialMcpToolResult(response);
    },
  );

  sdkServer.registerTool(
    mcpCapabilityBrokerRequestToolRegistration.name,
    {
      title: mcpCapabilityBrokerRequestToolRegistration.title,
      description: mcpCapabilityBrokerRequestToolRegistration.description,
      inputSchema: officialCapabilityBrokerRequestInputSchema,
      annotations: mcpCapabilityBrokerRequestToolRegistration.annotations,
      _meta: {
        lnsat_status:
          legacyMcpWireStatus.MCP_CAPABILITY_BROKER_REQUEST_SERVER_REGISTRATION_STATUS,
        lnsat_server_id: LNSAT_MCP_SERVER_ID,
        gateway_contract_id: capabilityBrokerRequestGatewayContract.contract_id,
        authority: ["lnsat.gateway.capability_broker_request.v0_1"],
        source_docs: mcpCapabilityBrokerRequestToolContract.source_docs,
        live_broker_dispatch_allowed: false,
        live_execution_allowed: false,
        side_effects: [],
      },
    },
    async (input) => {
      const adapterOptions = options.now === undefined ? {} : { now: options.now() };
      const response = await inspectCapabilityBrokerRequestThroughMcpAdapterContract(
        input,
        adapterOptions,
      );

      return officialMcpToolResult(response);
    },
  );

  sdkServer.registerTool(
    mcpSubstrateAdapterManifestToolRegistration.name,
    {
      title: mcpSubstrateAdapterManifestToolRegistration.title,
      description: mcpSubstrateAdapterManifestToolRegistration.description,
      inputSchema: officialSubstrateAdapterManifestInputSchema,
      annotations: mcpSubstrateAdapterManifestToolRegistration.annotations,
      _meta: {
        lnsat_status:
          legacyMcpWireStatus.MCP_SUBSTRATE_ADAPTER_MANIFEST_SERVER_REGISTRATION_STATUS,
        lnsat_server_id: LNSAT_MCP_SERVER_ID,
        gateway_contract_id: substrateAdapterManifestGatewayContract.contract_id,
        authority: ["lnsat.gateway.substrate_adapter_manifest.v0_1"],
        source_docs: mcpSubstrateAdapterManifestToolContract.source_docs,
        live_adapter_invocation_allowed: false,
        live_broker_dispatch_allowed: false,
        live_execution_allowed: false,
        side_effects: [],
      },
    },
    async (input) => {
      const adapterOptions = options.now === undefined ? {} : { now: options.now() };
      const response = await inspectSubstrateAdapterManifestThroughMcpAdapterContract(
        input,
        adapterOptions,
      );

      return officialMcpToolResult(response);
    },
  );

  sdkServer.registerTool(
    mcpAdapterInvocationPreflightToolRegistration.name,
    {
      title: mcpAdapterInvocationPreflightToolRegistration.title,
      description: mcpAdapterInvocationPreflightToolRegistration.description,
      inputSchema: officialAdapterInvocationPreflightInputSchema,
      annotations: mcpAdapterInvocationPreflightToolRegistration.annotations,
      _meta: {
        lnsat_status:
          legacyMcpWireStatus.MCP_ADAPTER_INVOCATION_PREFLIGHT_SERVER_REGISTRATION_STATUS,
        lnsat_server_id: LNSAT_MCP_SERVER_ID,
        gateway_contract_id: adapterInvocationPreflightGatewayContract.contract_id,
        authority: ["lnsat.gateway.adapter_invocation_preflight.v0_1"],
        source_docs: mcpAdapterInvocationPreflightToolContract.source_docs,
        live_adapter_invocation_allowed: false,
        live_broker_dispatch_allowed: false,
        live_execution_allowed: false,
        side_effects: [],
      },
    },
    async (input) => {
      const adapterOptions = options.now === undefined ? {} : { now: options.now() };
      const response = await inspectAdapterInvocationPreflightThroughMcpAdapterContract(
        input,
        adapterOptions,
      );

      return officialMcpToolResult(response);
    },
  );

  sdkServer.registerTool(
    mcpAdapterInvocationResultToolRegistration.name,
    {
      title: mcpAdapterInvocationResultToolRegistration.title,
      description: mcpAdapterInvocationResultToolRegistration.description,
      inputSchema: officialAdapterInvocationResultInputSchema,
      annotations: mcpAdapterInvocationResultToolRegistration.annotations,
      _meta: {
        lnsat_status:
          legacyMcpWireStatus.MCP_ADAPTER_INVOCATION_RESULT_SERVER_REGISTRATION_STATUS,
        lnsat_server_id: LNSAT_MCP_SERVER_ID,
        gateway_contract_id: adapterInvocationResultGatewayContract.contract_id,
        authority: ["lnsat.gateway.adapter_invocation_result.v0_1"],
        source_docs: mcpAdapterInvocationResultToolContract.source_docs,
        live_adapter_invocation_allowed: false,
        live_broker_dispatch_allowed: false,
        live_execution_allowed: false,
        side_effects: [],
      },
    },
    async (input) => {
      const adapterOptions = options.now === undefined ? {} : { now: options.now() };
      const response = await inspectAdapterInvocationResultThroughMcpAdapterContract(
        input,
        adapterOptions,
      );

      return officialMcpToolResult(response);
    },
  );

  sdkServer.registerTool(
    mcpAdapterInvocationAuthorizationBundleToolRegistration.name,
    {
      title: mcpAdapterInvocationAuthorizationBundleToolRegistration.title,
      description: mcpAdapterInvocationAuthorizationBundleToolRegistration.description,
      inputSchema: officialAdapterInvocationAuthorizationBundleInputSchema,
      annotations: mcpAdapterInvocationAuthorizationBundleToolRegistration.annotations,
      _meta: {
        lnsat_status:
          legacyMcpWireStatus.MCP_ADAPTER_INVOCATION_AUTHORIZATION_BUNDLE_SERVER_REGISTRATION_STATUS,
        lnsat_server_id: LNSAT_MCP_SERVER_ID,
        gateway_contract_id:
          adapterInvocationAuthorizationBundleGatewayContract.contract_id,
        authority: ["lnsat.gateway.adapter_invocation_authorization_bundle.v0_1"],
        source_docs: mcpAdapterInvocationAuthorizationBundleToolContract.source_docs,
        live_adapter_invocation_allowed: false,
        live_broker_dispatch_allowed: false,
        live_execution_allowed: false,
        side_effects: [],
      },
    },
    async (input) => {
      const adapterOptions = options.now === undefined ? {} : { now: options.now() };
      const response =
        await inspectAdapterInvocationAuthorizationBundleThroughMcpAdapterContract(
          input,
          adapterOptions,
        );

      return officialMcpToolResult(response);
    },
  );

  sdkServer.registerTool(
    mcpRuntimeAdapterReadinessGateToolRegistration.name,
    {
      title: mcpRuntimeAdapterReadinessGateToolRegistration.title,
      description: mcpRuntimeAdapterReadinessGateToolRegistration.description,
      inputSchema: officialRuntimeAdapterReadinessGateInputSchema,
      annotations: mcpRuntimeAdapterReadinessGateToolRegistration.annotations,
      _meta: {
        lnsat_status:
          legacyMcpWireStatus.MCP_RUNTIME_ADAPTER_READINESS_GATE_SERVER_REGISTRATION_STATUS,
        lnsat_server_id: LNSAT_MCP_SERVER_ID,
        gateway_contract_id: runtimeAdapterReadinessGateGatewayContract.contract_id,
        authority: ["lnsat.gateway.runtime_adapter_readiness_gate.v0_1"],
        source_docs: mcpRuntimeAdapterReadinessGateToolContract.source_docs,
        runtime_adapter_dispatch_allowed: false,
        live_adapter_invocation_allowed: false,
        live_broker_dispatch_allowed: false,
        live_execution_allowed: false,
        side_effects: [],
      },
    },
    async (input) => {
      const adapterOptions = options.now === undefined ? {} : { now: options.now() };
      const response =
        await inspectRuntimeAdapterReadinessGateThroughMcpAdapterContract(
          input,
          adapterOptions,
        );

      return officialMcpToolResult(response);
    },
  );

  sdkServer.registerTool(
    mcpRuntimeAdapterImplementationScopeToolRegistration.name,
    {
      title: mcpRuntimeAdapterImplementationScopeToolRegistration.title,
      description: mcpRuntimeAdapterImplementationScopeToolRegistration.description,
      inputSchema: officialRuntimeAdapterImplementationScopeInputSchema,
      annotations: mcpRuntimeAdapterImplementationScopeToolRegistration.annotations,
      _meta: {
        lnsat_status:
          legacyMcpWireStatus.MCP_RUNTIME_ADAPTER_IMPLEMENTATION_SCOPE_SERVER_REGISTRATION_STATUS,
        lnsat_server_id: LNSAT_MCP_SERVER_ID,
        gateway_contract_id:
          runtimeAdapterImplementationScopeGatewayContract.contract_id,
        authority: ["lnsat.gateway.runtime_adapter_implementation_scope.v0_1"],
        source_docs: mcpRuntimeAdapterImplementationScopeToolContract.source_docs,
        implementation_authority: "implementation_scope_only_no_runtime_adapter",
        runtime_adapter_implementation_allowed: false,
        runtime_adapter_dispatch_allowed: false,
        live_adapter_invocation_allowed: false,
        live_broker_dispatch_allowed: false,
        live_execution_allowed: false,
        state_changing_tool: false,
        runtime_dispatcher: false,
        runtime_adapter_implementation: false,
        side_effects: [],
      },
    },
    async (input) => {
      const adapterOptions = options.now === undefined ? {} : { now: options.now() };
      const response =
        await inspectRuntimeAdapterImplementationScopeThroughMcpAdapterContract(
          input,
          adapterOptions,
        );

      return officialMcpToolResult(response);
    },
  );

  sdkServer.registerTool(
    mcpRuntimeAdapterImplementationPlanToolRegistration.name,
    {
      title: mcpRuntimeAdapterImplementationPlanToolRegistration.title,
      description: mcpRuntimeAdapterImplementationPlanToolRegistration.description,
      inputSchema: officialRuntimeAdapterImplementationPlanInputSchema,
      annotations: mcpRuntimeAdapterImplementationPlanToolRegistration.annotations,
      _meta: {
        lnsat_status:
          legacyMcpWireStatus.MCP_RUNTIME_ADAPTER_IMPLEMENTATION_PLAN_SERVER_REGISTRATION_STATUS,
        lnsat_server_id: LNSAT_MCP_SERVER_ID,
        gateway_contract_id:
          runtimeAdapterImplementationPlanGatewayContract.contract_id,
        authority: ["lnsat.gateway.runtime_adapter_implementation_plan.v0_1"],
        source_docs: mcpRuntimeAdapterImplementationPlanToolContract.source_docs,
        implementation_authority: "implementation_plan_only_no_runtime_adapter",
        runtime_adapter_implementation_allowed: false,
        runtime_adapter_dispatch_allowed: false,
        live_adapter_invocation_allowed: false,
        live_broker_dispatch_allowed: false,
        live_execution_allowed: false,
        state_changing_tool: false,
        runtime_dispatcher: false,
        runtime_adapter_implementation: false,
        side_effects: [],
      },
    },
    async (input) => {
      const adapterOptions = options.now === undefined ? {} : { now: options.now() };
      const response =
        await inspectRuntimeAdapterImplementationPlanThroughMcpAdapterContract(
          input,
          adapterOptions,
        );

      return officialMcpToolResult(response);
    },
  );

  sdkServer.registerTool(
    mcpRuntimeAdapterImplementationAuthorizationRequestToolRegistration.name,
    {
      title: mcpRuntimeAdapterImplementationAuthorizationRequestToolRegistration.title,
      description:
        mcpRuntimeAdapterImplementationAuthorizationRequestToolRegistration.description,
      inputSchema: officialRuntimeAdapterImplementationAuthorizationRequestInputSchema,
      annotations:
        mcpRuntimeAdapterImplementationAuthorizationRequestToolRegistration.annotations,
      _meta: {
        lnsat_status:
          legacyMcpWireStatus.MCP_RUNTIME_ADAPTER_IMPLEMENTATION_AUTHORIZATION_REQUEST_SERVER_REGISTRATION_STATUS,
        lnsat_server_id: LNSAT_MCP_SERVER_ID,
        gateway_contract_id:
          runtimeAdapterImplementationAuthorizationRequestGatewayContract.contract_id,
        authority: [
          "lnsat.gateway.runtime_adapter_implementation_authorization_request.v0_1",
        ],
        source_docs:
          mcpRuntimeAdapterImplementationAuthorizationRequestToolRegistration.source_docs,
        implementation_authority:
          "implementation_authorization_request_only_no_runtime_adapter",
        runtime_adapter_implementation_allowed: false,
        runtime_adapter_dispatch_allowed: false,
        live_adapter_invocation_allowed: false,
        live_broker_dispatch_allowed: false,
        live_execution_allowed: false,
        state_changing_tool: false,
        runtime_dispatcher: false,
        runtime_adapter_implementation: false,
        side_effects: [],
      },
    },
    async (input) => {
      const adapterOptions = options.now === undefined ? {} : { now: options.now() };
      const response =
        await inspectRuntimeAdapterImplementationAuthorizationRequestThroughMcpAdapterContract(
          input,
          adapterOptions,
        );

      return officialMcpToolResult(response);
    },
  );

  sdkServer.registerTool(
    mcpRuntimeAdapterImplementationApprovalGateToolRegistration.name,
    {
      title: mcpRuntimeAdapterImplementationApprovalGateToolRegistration.title,
      description:
        mcpRuntimeAdapterImplementationApprovalGateToolRegistration.description,
      inputSchema: officialRuntimeAdapterImplementationApprovalGateInputSchema,
      annotations:
        mcpRuntimeAdapterImplementationApprovalGateToolRegistration.annotations,
      _meta: {
        lnsat_status:
          legacyMcpWireStatus.MCP_RUNTIME_ADAPTER_IMPLEMENTATION_APPROVAL_GATE_SERVER_REGISTRATION_STATUS,
        lnsat_server_id: LNSAT_MCP_SERVER_ID,
        gateway_contract_id:
          runtimeAdapterImplementationApprovalGateGatewayContract.contract_id,
        authority: ["lnsat.gateway.runtime_adapter_implementation_approval_gate.v0_1"],
        source_docs:
          mcpRuntimeAdapterImplementationApprovalGateToolRegistration.source_docs,
        implementation_authority:
          "implementation_approval_gate_only_no_runtime_adapter",
        runtime_adapter_implementation_allowed: false,
        runtime_adapter_dispatch_allowed: false,
        live_adapter_invocation_allowed: false,
        live_broker_dispatch_allowed: false,
        live_execution_allowed: false,
        state_changing_tool: false,
        runtime_dispatcher: false,
        runtime_adapter_implementation: false,
        side_effects: [],
      },
    },
    async (input) => {
      const adapterOptions = options.now === undefined ? {} : { now: options.now() };
      const response =
        await inspectRuntimeAdapterImplementationApprovalGateThroughMcpAdapterContract(
          input,
          adapterOptions,
        );

      return officialMcpToolResult(response);
    },
  );

  sdkServer.registerTool(
    mcpRuntimeAdapterImplementationDryRunEvidenceToolRegistration.name,
    {
      title: mcpRuntimeAdapterImplementationDryRunEvidenceToolRegistration.title,
      description:
        mcpRuntimeAdapterImplementationDryRunEvidenceToolRegistration.description,
      inputSchema: officialRuntimeAdapterImplementationDryRunEvidenceInputSchema,
      annotations:
        mcpRuntimeAdapterImplementationDryRunEvidenceToolRegistration.annotations,
      _meta: {
        lnsat_status:
          legacyMcpWireStatus.MCP_RUNTIME_ADAPTER_IMPLEMENTATION_DRY_RUN_EVIDENCE_SERVER_REGISTRATION_STATUS,
        lnsat_server_id: LNSAT_MCP_SERVER_ID,
        gateway_contract_id:
          runtimeAdapterImplementationDryRunEvidenceGatewayContract.contract_id,
        authority: [
          "lnsat.gateway.runtime_adapter_implementation_dry_run_evidence.v0_1",
        ],
        source_docs:
          mcpRuntimeAdapterImplementationDryRunEvidenceToolRegistration.source_docs,
        implementation_authority:
          "implementation_dry_run_evidence_only_no_runtime_adapter",
        runtime_adapter_implementation_allowed: false,
        runtime_adapter_dispatch_allowed: false,
        live_adapter_invocation_allowed: false,
        live_broker_dispatch_allowed: false,
        live_execution_allowed: false,
        state_changing_tool: false,
        runtime_dispatcher: false,
        runtime_adapter_implementation: false,
        side_effects: [],
      },
    },
    async (input) => {
      const adapterOptions = options.now === undefined ? {} : { now: options.now() };
      const response =
        await inspectRuntimeAdapterImplementationDryRunEvidenceThroughMcpAdapterContract(
          input,
          adapterOptions,
        );

      return officialMcpToolResult(response);
    },
  );

  sdkServer.registerTool(
    mcpKnowledgeSurfaceToolRegistration.name,
    {
      title: mcpKnowledgeSurfaceToolRegistration.title,
      description: mcpKnowledgeSurfaceToolRegistration.description,
      inputSchema: officialKnowledgeSurfaceInputSchema,
      annotations: mcpKnowledgeSurfaceToolRegistration.annotations,
      _meta: {
        lnsat_status:
          legacyMcpWireStatus.MCP_KNOWLEDGE_SURFACE_SERVER_REGISTRATION_STATUS,
        lnsat_server_id: LNSAT_MCP_SERVER_ID,
        gateway_contract_ids: mcpKnowledgeSurfaceToolContract.gateway_contract_ids,
        gateway_endpoints: mcpKnowledgeSurfaceToolContract.gateway_endpoints,
        authority: mcpKnowledgeSurfaceToolContract.authority,
        source_docs: mcpKnowledgeSurfaceToolContract.source_docs,
        source_search_context_only: true,
        read_only: true,
        local_index_only: true,
        open_source_self_deploy_evidence_required: true,
        user_owned_integration_evidence_required: true,
        auth_provider_unlocked_evidence_required: true,
        live_auth_provider_allowed: false,
        live_collection_allowed: false,
        mutation_allowed: false,
        db_allowed: false,
        queue_allowed: false,
        runtime_allowed: false,
        state_changing_tool: false,
        side_effects: [],
      },
    },
    async (input) => {
      const response = await inspectKnowledgeSurfaceThroughMcpAdapterContract(input);
      return officialMcpToolResult(response);
    },
  );

  sdkServer.registerTool(
    mcpAgentContextFirewallToolRegistration.name,
    {
      title: mcpAgentContextFirewallToolRegistration.title,
      description: mcpAgentContextFirewallToolRegistration.description,
      inputSchema: officialAgentContextFirewallInputSchema,
      annotations: mcpAgentContextFirewallToolRegistration.annotations,
      _meta: {
        lnsat_status:
          legacyMcpWireStatus.MCP_AGENT_CONTEXT_FIREWALL_SERVER_REGISTRATION_STATUS,
        lnsat_server_id: LNSAT_MCP_SERVER_ID,
        gateway_contract_id: agentContextFirewallGatewayContract.contract_id,
        authority: ["lnsat.gateway.agent_context_firewall.v0_1"],
        source_docs: mcpAgentContextFirewallToolContract.source_docs,
        provider_dispatch_allowed: false,
        runtime_mutation_allowed: false,
        side_effects: [],
      },
    },
    async (input) => {
      const adapterOptions = options.now === undefined ? {} : { now: options.now() };
      const response = await inspectAgentContextFirewallThroughMcpAdapterContract(
        input,
        adapterOptions,
      );

      return officialMcpToolResult(response);
    },
  );

  return sdkServer;
}

export function createLnsatMcpServerFactory(
  options: LnsatMcpServerOptions = {},
): (context: McpRequestContext) => McpServer {
  return (context) => {
    options.onProtocolContext?.({
      era: context.era,
      protocol_version:
        context.era === "modern" ? MCP_MODERN_PROTOCOL_VERSION : "legacy",
      server_info_trusted: false,
      discovery_trusted: false,
    });
    return createLnsatOfficialMcpSdkServer(options);
  };
}

export type LnsatMcpHttpHandler = {
  mode: McpProtocolMode;
  fetch(request: Request): Promise<Response>;
  close(): Promise<void>;
  side_effects: [];
};

export function createLnsatMcpHttpHandler(
  options: LnsatMcpServingOptions = {},
  mode: McpProtocolMode = "auto",
): LnsatMcpHttpHandler {
  const factory = createLnsatMcpServerFactory(options);
  const prepareRequest = async (request: Request): Promise<Request | Response> => {
    const prepared = await prepareLnsatMcpHttpRequest(request);
    if (!prepared.ok) {
      return prepared.response;
    }
    if (options.access_authentication !== undefined) {
      const admission = await authenticateMcpHttpAccess({
        request: prepared.request,
        policy: options.access_authentication,
        now: options.now?.() ?? new Date(),
      });
      if (!admission.ok) {
        return mcpAccessAdmissionFailureResponse(admission);
      }
      options.onAccessPrincipal?.(admission.principal);
    }
    return prepared.request;
  };
  if (mode === "legacy") {
    const fetch = legacyStatelessFallback(factory, options.onerror);
    return {
      mode,
      fetch: async (request) => {
        const prepared = await prepareRequest(request);
        return prepared instanceof Response ? prepared : fetch(prepared);
      },
      close: async () => undefined,
      side_effects: [],
    };
  }

  const handler = createMcpHandler(factory, {
    legacy: mode === "auto" ? "stateless" : "reject",
    responseMode: "auto",
    ...(options.onerror === undefined ? {} : { onerror: options.onerror }),
  });
  return {
    mode,
    fetch: async (request) => {
      const prepared = await prepareRequest(request);
      return prepared instanceof Response ? prepared : handler.fetch(prepared);
    },
    close: handler.close,
    side_effects: [],
  };
}

export function createLnsatOfficialStdioTransport(): StdioServerTransport {
  return new StdioServerTransport(process.stdin, process.stdout, {
    maxBufferSize: MCP_STDIO_MAX_BUFFER_BYTES,
  });
}

export async function startLnsatOfficialMcpStdioServer(
  options: LnsatMcpServingOptions = {},
  mode: McpProtocolMode = "auto",
  transport: StdioServerTransport = createLnsatOfficialStdioTransport(),
): Promise<{
  status: typeof legacyMcpWireStatus.MCP_OFFICIAL_STDIO_STATUS;
  mode: McpProtocolMode;
  transport: StdioServerTransport;
  close(): Promise<void>;
  official_sdk_decision: typeof mcpOfficialStdioTransportDecision;
  side_effects: [];
}> {
  if (mode === "legacy") {
    const server = createLnsatOfficialMcpSdkServer(options);
    await server.connect(transport);
    return {
      status: legacyMcpWireStatus.MCP_OFFICIAL_STDIO_STATUS,
      mode,
      transport,
      close: () => server.close(),
      official_sdk_decision: mcpOfficialStdioTransportDecision,
      side_effects: [],
    };
  }

  const handle = serveStdio(createLnsatMcpServerFactory(options), {
    legacy: mode === "auto" ? "serve" : "reject",
    transport,
    maxSubscriptions: MCP_STDIO_MAX_SUBSCRIPTIONS,
    ...(options.onerror === undefined ? {} : { onerror: options.onerror }),
  });
  return {
    status: legacyMcpWireStatus.MCP_OFFICIAL_STDIO_STATUS,
    mode,
    transport,
    close: () => handle.close(),
    official_sdk_decision: mcpOfficialStdioTransportDecision,
    side_effects: [],
  };
}

export async function connectLnsatOfficialStdioTransport(
  options: LnsatMcpServerOptions = {},
): Promise<{
  status: typeof legacyMcpWireStatus.MCP_OFFICIAL_STDIO_STATUS;
  server: McpServer;
  transport: StdioServerTransport;
  official_sdk_decision: typeof mcpOfficialStdioTransportDecision;
  side_effects: [];
}> {
  const server = createLnsatOfficialMcpSdkServer(options);
  const transport = createLnsatOfficialStdioTransport();
  await server.connect(transport);

  return {
    status: legacyMcpWireStatus.MCP_OFFICIAL_STDIO_STATUS,
    server,
    transport,
    official_sdk_decision: mcpOfficialStdioTransportDecision,
    side_effects: [],
  };
}

function officialMcpToolResult(response: McpToolJsonResponse): CallToolResult {
  const outputValidation = validateMcpJsonOutput(response);
  if (!outputValidation.ok) {
    const boundedFailure = {
      ok: false,
      error: {
        code: "mcp.output.rejected",
        message: "MCP tool output failed bounded JSON validation.",
      },
      side_effects: [],
    };
    return {
      content: [{ type: "text", text: JSON.stringify(boundedFailure) }],
      structuredContent: boundedFailure,
      isError: true,
    };
  }
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(response),
      },
    ],
    structuredContent: response as unknown as Record<string, unknown>,
    isError: !response.ok,
  };
}

export async function handleLocalStdioSmokeLine(
  line: string,
  options: LnsatMcpServerOptions = {},
): Promise<string> {
  const response = await handleLocalStdioSmokeRequestLine(line, options);
  return `${JSON.stringify(response)}\n`;
}

export async function handleLocalStdioSmokeRequestLine(
  line: string,
  options: LnsatMcpServerOptions = {},
): Promise<LocalStdioSmokeResponse> {
  const parsed = parseLocalStdioSmokeLine(line);
  if (!parsed.ok) {
    return stdioSmokeFailure(parsed.request_id, parsed.errors, null);
  }

  const server = createLnsatReadOnlyMcpServer(options);
  const mcpResponse = await server.callTool(parsed.request.tool_call);
  if (!mcpResponse.ok) {
    return stdioSmokeFailure(parsed.request_id, [], mcpResponse);
  }

  return {
    ok: true,
    transport: "local_stdio_smoke",
    status: legacyMcpWireStatus.MCP_STDIO_SMOKE_STATUS,
    request_id: parsed.request_id,
    official_sdk_decision: mcpStdioTransportDecision,
    mcp_response: mcpResponse,
    side_effects: [],
  };
}

type ParsedLocalStdioSmokeLine =
  | {
      ok: true;
      request_id: string | null;
      request: LocalStdioSmokeRequest;
    }
  | {
      ok: false;
      request_id: string | null;
      errors: LocalStdioSmokeError[];
    };

const localStdioSmokeRequestKeys = new Set(["request_id", "tool_call"]);

function parseLocalStdioSmokeLine(line: string): ParsedLocalStdioSmokeLine {
  let input: unknown;
  try {
    input = JSON.parse(line);
  } catch {
    return {
      ok: false,
      request_id: null,
      errors: [
        stdioSmokeError(
          "stdio.invalid_json",
          "",
          "Local stdio smoke input must be one JSON object per line.",
        ),
      ],
    };
  }

  if (!isPlainObject(input)) {
    return {
      ok: false,
      request_id: null,
      errors: [
        stdioSmokeError(
          "stdio.invalid_request",
          "",
          "Local stdio smoke request must be an object.",
        ),
      ],
    };
  }

  const errors: LocalStdioSmokeError[] = [];
  for (const key of Object.keys(input)) {
    if (!localStdioSmokeRequestKeys.has(key)) {
      errors.push(
        stdioSmokeError(
          "stdio.unexpected_field",
          jsonPointer(key),
          `Unexpected local stdio smoke field '${key}'.`,
        ),
      );
    }
  }

  if (!Object.hasOwn(input, "tool_call")) {
    errors.push(
      stdioSmokeError(
        "stdio.missing_tool_call",
        "/tool_call",
        "Local stdio smoke request must include tool_call.",
      ),
    );
  }

  const requestId = typeof input.request_id === "string" ? input.request_id : null;
  if (errors.length > 0) {
    return { ok: false, request_id: requestId, errors };
  }

  return {
    ok: true,
    request_id: requestId,
    request: {
      ...(requestId === null ? {} : { request_id: requestId }),
      tool_call: input.tool_call as McpToolCallRequest,
    },
  };
}

function stdioSmokeFailure(
  requestId: string | null,
  errors: LocalStdioSmokeError[],
  mcpResponse: McpToolCallResponse | null,
): LocalStdioSmokeResponse {
  return {
    ok: false,
    transport: "local_stdio_smoke",
    status: legacyMcpWireStatus.MCP_STDIO_SMOKE_STATUS,
    request_id: requestId,
    official_sdk_decision: mcpStdioTransportDecision,
    errors,
    mcp_response: mcpResponse,
    side_effects: [],
  };
}

function stdioSmokeError(
  code: LocalStdioSmokeErrorCode,
  path: string,
  message: string,
): LocalStdioSmokeError {
  return {
    code,
    path,
    message,
    severity: "error",
  };
}

type NormalizedMcpToolCallRequest =
  | {
      ok: true;
      name: string;
      arguments: unknown;
    }
  | {
      ok: false;
      error: McpServerError;
    };

function normalizeMcpToolCallRequest(request: unknown): NormalizedMcpToolCallRequest {
  if (!isPlainObject(request)) {
    return {
      ok: false,
      error: mcpServerError(
        "mcp.invalid_call",
        "",
        "MCP tool call request must be an object.",
      ),
    };
  }

  if (typeof request.name !== "string") {
    return {
      ok: false,
      error: mcpServerError(
        "mcp.invalid_tool_name",
        "/name",
        "MCP tool call request name must be a string.",
      ),
    };
  }

  return {
    ok: true,
    name: request.name,
    arguments: request.arguments ?? {},
  };
}

function mcpCallFailure(
  tool: McpToolName | null,
  error: McpServerError,
): McpToolCallResponse {
  return {
    ok: false,
    server_id: LNSAT_MCP_SERVER_ID,
    tool,
    is_error: true,
    content: [],
    error,
    side_effects: [],
  };
}

function mcpServerError(
  code: McpServerErrorCode,
  path: string,
  message: string,
): McpServerError {
  return {
    code,
    path,
    message,
    severity: "error",
  };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function jsonPointer(key: string): string {
  return `/${key.replaceAll("~", "~0").replaceAll("/", "~1")}`;
}

type NormalizedKnowledgeSurfaceRequest =
  | {
      ok: true;
      operation: KnowledgeSurfaceOperation;
      gateway_input: Record<string, unknown>;
    }
  | {
      ok: false;
      errors: KnowledgeSurfaceAdapterError[];
    };

const knowledgeSurfaceOperations = new Set<KnowledgeSurfaceOperation>([
  "sources",
  "search",
  "context",
]);

function normalizeKnowledgeSurfaceRequest(
  input: unknown,
): NormalizedKnowledgeSurfaceRequest {
  if (!isPlainObject(input)) {
    return {
      ok: false,
      errors: [
        knowledgeSurfaceAdapterError(
          "knowledge_surface.invalid_request",
          "",
          "Knowledge surface MCP request must be an object.",
        ),
      ],
    };
  }

  const operation =
    typeof input.operation === "string" &&
    knowledgeSurfaceOperations.has(input.operation as KnowledgeSurfaceOperation)
      ? (input.operation as KnowledgeSurfaceOperation)
      : null;
  if (operation === null) {
    return {
      ok: false,
      errors: [
        knowledgeSurfaceAdapterError(
          "knowledge_surface.invalid_operation",
          "/operation",
          "Knowledge surface MCP request operation must be sources, search, or context.",
        ),
      ],
    };
  }

  const gatewayInput = { ...input };
  delete gatewayInput.operation;
  return {
    ok: true,
    operation,
    gateway_input: gatewayInput,
  };
}

function knowledgeSurfaceAdapterResponse(
  operation: KnowledgeSurfaceOperation,
  gatewayContractId:
    | typeof knowledgeGatewaySourcesContract.contract_id
    | typeof knowledgeGatewaySearchContract.contract_id
    | typeof knowledgeGatewayContextCompileContract.contract_id,
  gatewayResponse:
    | KnowledgeGatewaySourcesResponse
    | KnowledgeGatewaySearchResponse
    | KnowledgeGatewayContextCompileResponse,
): McpKnowledgeSurfaceAdapterResponse {
  return {
    ok: gatewayResponse.ok,
    tool: mcpKnowledgeSurfaceToolContract.tool,
    operation,
    gateway_contract_id: gatewayContractId,
    gateway_response: gatewayResponse,
    adapter_errors: [],
    mcp_registration: true,
    source_search_context_only: true,
    read_only: true,
    local_index_only: true,
    open_source_self_deploy_evidence_required: true,
    user_owned_integration_evidence_required: true,
    auth_provider_unlocked_evidence_required: true,
    live_auth_provider_allowed: false,
    live_collection_allowed: false,
    mutation_allowed: false,
    db_allowed: false,
    queue_allowed: false,
    runtime_allowed: false,
    state_changing_tool: false,
    side_effects: [],
  };
}

function knowledgeSurfaceAdapterFailure(
  operation: KnowledgeSurfaceOperation | null,
  errors: KnowledgeSurfaceAdapterError[],
): McpKnowledgeSurfaceAdapterResponse {
  return {
    ok: false,
    tool: mcpKnowledgeSurfaceToolContract.tool,
    operation,
    gateway_contract_id: null,
    gateway_response: null,
    adapter_errors: errors,
    raw_input_content: "withheld",
    mcp_registration: true,
    source_search_context_only: true,
    read_only: true,
    local_index_only: true,
    open_source_self_deploy_evidence_required: true,
    user_owned_integration_evidence_required: true,
    auth_provider_unlocked_evidence_required: true,
    live_auth_provider_allowed: false,
    live_collection_allowed: false,
    mutation_allowed: false,
    db_allowed: false,
    queue_allowed: false,
    runtime_allowed: false,
    state_changing_tool: false,
    side_effects: [],
  };
}

function knowledgeSurfaceAdapterError(
  code: KnowledgeSurfaceAdapterErrorCode,
  path: string,
  message: string,
): KnowledgeSurfaceAdapterError {
  return {
    code,
    path,
    message,
    severity: "error",
  };
}

type NormalizedBuildPacketStateRequest =
  | {
      ok: true;
      request_id: string | null;
      packet_id: string | null;
    }
  | {
      ok: false;
      request_id: string | null;
      errors: BuildPacketStateError[];
    };

type BuildStatusJson = {
  project?: unknown;
  name?: unknown;
  current_phase?: unknown;
  active_packet?: unknown;
  next_packet?: unknown;
  build_state?: unknown;
  last_verified?: unknown;
  completed_packets?: unknown;
  last_checks?: unknown;
};

const buildPacketStateRequestKeys = new Set(["request_id", "packet_id"]);

function normalizeBuildPacketStateRequest(
  input: unknown,
): NormalizedBuildPacketStateRequest {
  if (!isPlainObject(input)) {
    return {
      ok: false,
      request_id: null,
      errors: [
        buildPacketStateError(
          "build_state.invalid_request",
          "",
          "Build packet state request must be an object.",
        ),
      ],
    };
  }

  const errors: BuildPacketStateError[] = [];
  for (const key of Object.keys(input)) {
    if (!buildPacketStateRequestKeys.has(key)) {
      errors.push(
        buildPacketStateError(
          "build_state.unexpected_field",
          jsonPointer(key),
          "Unexpected build packet state request field.",
        ),
      );
    }
  }

  const requestId = typeof input.request_id === "string" ? input.request_id : null;
  if (Object.hasOwn(input, "request_id") && typeof input.request_id !== "string") {
    errors.push(
      buildPacketStateError(
        "build_state.invalid_request_id",
        "/request_id",
        "Build packet state request_id must be a string when provided.",
      ),
    );
  }

  const packetId = typeof input.packet_id === "string" ? input.packet_id : null;
  if (Object.hasOwn(input, "packet_id") && typeof input.packet_id !== "string") {
    errors.push(
      buildPacketStateError(
        "build_state.invalid_packet_id",
        "/packet_id",
        "Build packet id must be a string when provided.",
      ),
    );
  } else if (
    typeof input.packet_id === "string" &&
    !/^(BP|UI|DOC)-\d{4}$/.test(input.packet_id)
  ) {
    errors.push(
      buildPacketStateError(
        "build_state.invalid_packet_id",
        "/packet_id",
        "Build packet id must match the repo-local packet id format.",
      ),
    );
  }

  if (errors.length > 0) {
    return { ok: false, request_id: requestId, errors };
  }

  return {
    ok: true,
    request_id: requestId,
    packet_id: packetId,
  };
}

function buildPacketStateFailure(
  requestId: string | null,
  errors: BuildPacketStateError[],
): McpBuildPacketStateAdapterResponse {
  return {
    ok: false,
    tool: mcpBuildPacketStateToolContract.tool,
    request_id: requestId,
    source_docs: buildPacketStateSourceDocs(null),
    errors,
    side_effects: [],
  };
}

function buildPacketStateError(
  code: BuildPacketStateErrorCode,
  path: string,
  message: string,
): BuildPacketStateError {
  return {
    code,
    path,
    message,
    severity: "error",
  };
}

async function readRepoText(path: string): Promise<string> {
  return readFile(join(LNSAT_REPO_ROOT, path), "utf8");
}

async function readRepoJson<T>(path: string): Promise<T> {
  return JSON.parse(await readRepoText(path)) as T;
}

async function readSelectedBuildPacket(
  packetId: string,
  requested: boolean,
): Promise<SelectedBuildPacketState | { errors: BuildPacketStateError[] } | null> {
  const sourcePath = `fixtures/project-state/packets/${packetId}.json`;
  let packetDoc: {
    id?: unknown;
    phase?: unknown;
    status?: unknown;
    objective?: unknown;
    acceptance_checks?: unknown;
    verification_commands?: unknown;
    result?: unknown;
  };
  try {
    packetDoc = await readRepoJson(sourcePath);
  } catch {
    if (!requested) {
      return null;
    }

    return {
      errors: [
        buildPacketStateError(
          "build_state.packet_not_found",
          "/packet_id",
          "Requested build packet doc was not found.",
        ),
      ],
    };
  }

  return {
    packet_id: stringOrNull(packetDoc.id) ?? packetId,
    source_path: sourcePath,
    phase: stringOrNull(packetDoc.phase),
    status: stringOrNull(packetDoc.status),
    objective: stringOrNull(packetDoc.objective),
    acceptance_checks: stringArray(packetDoc.acceptance_checks),
    verification_commands: stringArray(packetDoc.verification_commands),
    side_effects: extractPacketSideEffects(packetDoc.result),
  };
}

function buildPacketStateSourceDocs(selectedPacketPath: string | null): string[] {
  return [
    "fixtures/project-state/status.json",
    "fixtures/project-state/board.md",
    "fixtures/project-state/packet-log.md",
    ...(selectedPacketPath === null ? [] : [selectedPacketPath]),
  ];
}

function summarizeBuildStatus(statusJson: BuildStatusJson): BuildPacketStateSummary {
  return {
    project: stringOrNull(statusJson.project),
    name: stringOrNull(statusJson.name),
    current_phase: stringOrNull(statusJson.current_phase),
    active_packet: stringOrNull(statusJson.active_packet),
    next_packet: stringOrNull(statusJson.next_packet),
    build_state: stringOrNull(statusJson.build_state),
    last_verified: stringOrNull(statusJson.last_verified),
    completed_packets: stringArray(statusJson.completed_packets),
    last_checks: stringArray(statusJson.last_checks),
  };
}

function summarizeBoard(
  boardMarkdown: string,
  activePacket: unknown,
): BuildPacketBoardSummary {
  const rows = parseBoardPacketRows(boardMarkdown);
  return {
    active_packet: stringOrNull(activePacket),
    queued_packets: rows.filter((row) => row.status === "queued"),
    done_packets: rows.filter((row) => row.status === "done"),
  };
}

function parseBoardPacketRows(markdown: string): BoardPacketRow[] {
  return markdown
    .split("\n")
    .filter((line) => /^\| (BP|UI|DOC)-\d{4} /.test(line))
    .map((line) =>
      line
        .split("|")
        .slice(1, -1)
        .map((cell) => cell.trim()),
    )
    .filter((cells) => cells.length >= 4)
    .map(([packetId, phase, status, objective]) => ({
      packet_id: packetId ?? "",
      phase: phase ?? "",
      status: status ?? "",
      objective: objective ?? "",
    }));
}

function parsePacketLogEntries(markdown: string): PacketLogEntry[] {
  const entries: PacketLogEntry[] = [];
  const headingPattern = /^## ((?:BP|UI|DOC)-\d{4})(?::|\s+Closeout:)\s+(.+)$/gm;
  let match: RegExpExecArray | null;
  while ((match = headingPattern.exec(markdown)) !== null) {
    entries.push({
      packet_id: match[1] ?? "",
      title: match[2] ?? "",
    });
  }

  return entries;
}

function previousBuildPacketId(packetId: string): string | null {
  const match = /^(BP|UI|DOC)-(\d{4})$/.exec(packetId);
  if (match === null) {
    return null;
  }
  const previous = Number.parseInt(match[2] ?? "", 10) - 1;
  if (!Number.isInteger(previous) || previous < 0) {
    return null;
  }
  return `${match[1]}-${previous.toString().padStart(4, "0")}`;
}

function extractPacketSideEffects(result: unknown): unknown {
  if (isPlainObject(result) && Object.hasOwn(result, "side_effects")) {
    return result.side_effects;
  }

  return [];
}

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}
