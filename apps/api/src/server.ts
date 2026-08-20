import Fastify, { type FastifyInstance } from "fastify";
import { registerControlCenterOperationReadbackRoute } from "./control-center-operation-readback.js";
import { registerLocalControlPlanePacketIntakeRoutes } from "./local-control-plane-packet-routes.js";
import type { LocalControlPlanePacketIntakeService } from "./local-control-plane-packet-intake.js";
import { registerLocalControlPlaneApprovalRequestRoutes } from "./local-control-plane-approval-routes.js";
import type { LocalControlPlaneApprovalRequestService } from "./local-control-plane-approval-request.js";
import { registerLocalControlPlanePolicyDecisionRoutes } from "./local-control-plane-policy-routes.js";
import type { LocalControlPlanePolicyDecisionService } from "./local-control-plane-policy-decision.js";
import { registerLocalControlPlaneAuthRoutes } from "./local-control-plane-routes.js";
import type { LocalControlPlaneSessionService } from "./local-control-plane-session.js";
import {
  inspectRuntimeAdapterImplementationDryRunEvidenceGatewayRequest,
  runtimeAdapterImplementationDryRunEvidenceGatewayContract,
} from "./runtime-adapter-implementation-dry-run-evidence.js";
import {
  inspectRuntimeAdapterImplementationApprovalGateGatewayRequest,
  runtimeAdapterImplementationApprovalGateGatewayContract,
} from "./runtime-adapter-implementation-approval-gate.js";
import {
  inspectRuntimeAdapterImplementationAuthorizationRequestGatewayRequest,
  runtimeAdapterImplementationAuthorizationRequestGatewayContract,
} from "./runtime-adapter-implementation-authorization-request.js";
import {
  inspectRuntimeAdapterImplementationPlanGatewayRequest,
  runtimeAdapterImplementationPlanGatewayContract,
} from "./runtime-adapter-implementation-plan.js";
import {
  adapterInvocationAuthorizationBundleGatewayContract,
  inspectAdapterInvocationAuthorizationBundleGatewayRequest,
} from "./adapter-invocation-authorization-bundle.js";
import {
  inspectRuntimeAdapterImplementationScopeGatewayRequest,
  runtimeAdapterImplementationScopeGatewayContract,
} from "./runtime-adapter-implementation-scope.js";
import {
  inspectRuntimeAdapterReadinessGateGatewayRequest,
  runtimeAdapterReadinessGateGatewayContract,
} from "./runtime-adapter-readiness-gate.js";
import {
  adapterInvocationResultGatewayContract,
  inspectAdapterInvocationResultGatewayRequest,
} from "./adapter-invocation-result.js";
import {
  adapterInvocationPreflightGatewayContract,
  inspectAdapterInvocationPreflightGatewayRequest,
} from "./adapter-invocation-preflight.js";
import {
  capabilityBrokerRequestGatewayContract,
  inspectCapabilityBrokerRequestGatewayRequest,
} from "./capability-broker-request.js";
import {
  inspectSubstrateAdapterManifestGatewayRequest,
  substrateAdapterManifestGatewayContract,
} from "./substrate-adapter-manifest.js";
import {
  inspectSubstrateControlIntentGatewayRequest,
  substrateControlIntentGatewayContract,
} from "./substrate-control-intent.js";
import {
  agentContextFirewallGatewayContract,
  inspectAgentContextFirewallGatewayRequest,
} from "./agent-context-firewall.js";
import {
  inspectServiceDatabaseInventoryGatewayRequest,
  serviceDatabaseInventoryGatewayContract,
} from "./service-database-inventory.js";
import {
  hardwareInventoryInspectionGatewayContract,
  inspectHardwareInventoryGatewayRequest,
} from "./hardware-inventory-inspection.js";
import {
  inspectPerformanceTelemetryGatewayRequest,
  performanceTelemetryInspectionGatewayContract,
} from "./performance-telemetry-inspection.js";
import {
  hardwareAllocationRecommendationInspectionGatewayContract,
  inspectHardwareAllocationRecommendationGatewayRequest,
} from "./hardware-allocation-recommendation-inspection.js";
import {
  auditLedgerDatabaseSecurityPreflightGatewayContract,
  inspectAuditLedgerDatabaseSecurityPreflightGatewayRequest,
} from "./audit-ledger-database-security-preflight.js";
import {
  auditLedgerPersistenceReadinessGatewayContract,
  inspectAuditLedgerPersistenceReadinessGatewayRequest,
} from "./audit-ledger-persistence-readiness-gate.js";
import {
  auditLedgerPersistenceScopeRequestGatewayContract,
  inspectAuditLedgerPersistenceScopeRequestGatewayRequest,
} from "./audit-ledger-persistence-scope-request.js";
import {
  auditLedgerMigrationApprovalPreviewGatewayContract,
  inspectAuditLedgerMigrationApprovalPreviewGatewayRequest,
} from "./audit-ledger-migration-approval-preview.js";
import {
  auditLedgerWriterInterfaceGatewayContract,
  inspectAuditLedgerWriterInterfaceGatewayRequest,
} from "./audit-ledger-writer-interface.js";
import {
  auditLedgerWriterPersistencePreflightGatewayContract,
  inspectAuditLedgerWriterPersistencePreflightGatewayRequest,
} from "./audit-ledger-writer-persistence-preflight.js";
import {
  buildPacketStateGatewayContract,
  inspectBuildPacketStateGatewayRequest,
} from "./build-packet-state.js";
import {
  inspectProjectStateGatewayRequest,
  projectStateGatewayContract,
} from "./project-state.js";
import {
  inspectKnowledgeGatewayContextCompileRequest,
  inspectKnowledgeGatewaySearchRequest,
  inspectKnowledgeGatewaySourcesRequest,
  knowledgeGatewayContextCompileContract,
  knowledgeGatewaySearchContract,
  knowledgeGatewaySourcesContract,
} from "./knowledge-gateway.js";
import {
  inspectOnboardingProfileGatewayRequest,
  onboardingProfileInspectionGatewayContract,
} from "./onboarding-profile-inspection.js";
import {
  inspectOnboardingContextGatewayRequest,
  onboardingContextInspectionGatewayContract,
} from "./onboarding-context-inspection.js";
import {
  inspectPacketGatewayRequest,
  packetInspectionGatewayContract,
} from "./packet-inspection.js";

export const API_GATEWAY_STATUS = "read_only";

export type ApiGatewayOptions = {
  now?: () => Date;
  localApprovalRequestService?: LocalControlPlaneApprovalRequestService;
  localPacketIntakeService?: LocalControlPlanePacketIntakeService;
  localPolicyDecisionService?: LocalControlPlanePolicyDecisionService;
  localSessionService?: LocalControlPlaneSessionService;
};

export function buildApiGateway(options: ApiGatewayOptions = {}): FastifyInstance {
  const gateway = Fastify({
    logger: false,
  });

  registerPacketInspectionRoute(gateway, options);
  registerControlCenterOperationReadbackRoute(gateway);
  registerProjectStateRoute(gateway);
  registerBuildPacketStateRoute(gateway);
  registerKnowledgeGatewaySourcesRoute(gateway);
  registerKnowledgeGatewaySearchRoute(gateway);
  registerKnowledgeGatewayContextCompileRoute(gateway);
  registerOnboardingProfileInspectionRoute(gateway, options);
  registerOnboardingContextInspectionRoute(gateway, options);
  registerAuditLedgerMigrationApprovalPreviewRoute(gateway, options);
  registerAuditLedgerWriterInterfaceRoute(gateway, options);
  registerAuditLedgerWriterPersistencePreflightRoute(gateway, options);
  registerAuditLedgerDatabaseSecurityPreflightRoute(gateway, options);
  registerAuditLedgerPersistenceReadinessRoute(gateway, options);
  registerAuditLedgerPersistenceScopeRequestRoute(gateway, options);
  registerServiceDatabaseInventoryRoute(gateway, options);
  registerHardwareInventoryInspectionRoute(gateway, options);
  registerPerformanceTelemetryInspectionRoute(gateway, options);
  registerHardwareAllocationRecommendationInspectionRoute(gateway, options);
  registerSubstrateControlIntentRoute(gateway, options);
  registerAgentContextFirewallRoute(gateway, options);
  registerCapabilityBrokerRequestRoute(gateway, options);
  registerSubstrateAdapterManifestRoute(gateway, options);
  registerAdapterInvocationPreflightRoute(gateway, options);
  registerAdapterInvocationResultRoute(gateway, options);
  registerAdapterInvocationAuthorizationBundleRoute(gateway, options);
  registerRuntimeAdapterReadinessGateRoute(gateway, options);
  registerRuntimeAdapterImplementationScopeRoute(gateway, options);
  registerRuntimeAdapterImplementationPlanRoute(gateway, options);
  registerRuntimeAdapterImplementationAuthorizationRequestRoute(gateway, options);
  registerRuntimeAdapterImplementationApprovalGateRoute(gateway, options);
  registerRuntimeAdapterImplementationDryRunEvidenceRoute(gateway, options);
  if (options.localSessionService !== undefined) {
    registerLocalControlPlaneAuthRoutes(gateway, options.localSessionService);
  }
  if (
    options.localPacketIntakeService !== undefined &&
    options.localSessionService === undefined
  ) {
    throw new Error("Local packet intake requires the local session service.");
  }
  if (
    options.localApprovalRequestService !== undefined &&
    options.localSessionService === undefined
  ) {
    throw new Error("Local approval requests require the local session service.");
  }
  if (
    options.localPolicyDecisionService !== undefined &&
    options.localSessionService === undefined
  ) {
    throw new Error("Local policy decisions require the local session service.");
  }
  if (
    options.localApprovalRequestService !== undefined &&
    options.localSessionService !== undefined
  ) {
    registerLocalControlPlaneApprovalRequestRoutes(
      gateway,
      options.localSessionService,
      options.localApprovalRequestService,
    );
  }
  if (
    options.localPolicyDecisionService !== undefined &&
    options.localSessionService !== undefined
  ) {
    registerLocalControlPlanePolicyDecisionRoutes(
      gateway,
      options.localSessionService,
      options.localPolicyDecisionService,
    );
  }
  if (
    options.localPacketIntakeService !== undefined &&
    options.localSessionService !== undefined
  ) {
    registerLocalControlPlanePacketIntakeRoutes(
      gateway,
      options.localSessionService,
      options.localPacketIntakeService,
    );
  }

  return gateway;
}

export function registerRuntimeAdapterImplementationDryRunEvidenceRoute(
  gateway: FastifyInstance,
  options: ApiGatewayOptions = {},
): void {
  gateway.post(
    runtimeAdapterImplementationDryRunEvidenceGatewayContract.path,
    async (request, reply) => {
      const inspectionOptions = options.now === undefined ? {} : { now: options.now() };
      const response =
        await inspectRuntimeAdapterImplementationDryRunEvidenceGatewayRequest(
          request.body,
          inspectionOptions,
        );

      return reply
        .status(runtimeAdapterImplementationDryRunEvidenceHttpStatus(response))
        .send(response);
    },
  );
}

export function registerRuntimeAdapterImplementationApprovalGateRoute(
  gateway: FastifyInstance,
  options: ApiGatewayOptions = {},
): void {
  gateway.post(
    runtimeAdapterImplementationApprovalGateGatewayContract.path,
    async (request, reply) => {
      const inspectionOptions = options.now === undefined ? {} : { now: options.now() };
      const response =
        await inspectRuntimeAdapterImplementationApprovalGateGatewayRequest(
          request.body,
          inspectionOptions,
        );

      return reply
        .status(runtimeAdapterImplementationApprovalGateHttpStatus(response))
        .send(response);
    },
  );
}

export function registerRuntimeAdapterImplementationAuthorizationRequestRoute(
  gateway: FastifyInstance,
  options: ApiGatewayOptions = {},
): void {
  gateway.post(
    runtimeAdapterImplementationAuthorizationRequestGatewayContract.path,
    async (request, reply) => {
      const inspectionOptions = options.now === undefined ? {} : { now: options.now() };
      const response =
        await inspectRuntimeAdapterImplementationAuthorizationRequestGatewayRequest(
          request.body,
          inspectionOptions,
        );

      return reply
        .status(runtimeAdapterImplementationAuthorizationRequestHttpStatus(response))
        .send(response);
    },
  );
}

export function registerRuntimeAdapterImplementationPlanRoute(
  gateway: FastifyInstance,
  options: ApiGatewayOptions = {},
): void {
  gateway.post(
    runtimeAdapterImplementationPlanGatewayContract.path,
    async (request, reply) => {
      const inspectionOptions = options.now === undefined ? {} : { now: options.now() };
      const response = await inspectRuntimeAdapterImplementationPlanGatewayRequest(
        request.body,
        inspectionOptions,
      );

      return reply
        .status(runtimeAdapterImplementationPlanHttpStatus(response))
        .send(response);
    },
  );
}

export function registerRuntimeAdapterImplementationScopeRoute(
  gateway: FastifyInstance,
  options: ApiGatewayOptions = {},
): void {
  gateway.post(
    runtimeAdapterImplementationScopeGatewayContract.path,
    async (request, reply) => {
      const inspectionOptions = options.now === undefined ? {} : { now: options.now() };
      const response = await inspectRuntimeAdapterImplementationScopeGatewayRequest(
        request.body,
        inspectionOptions,
      );

      return reply
        .status(runtimeAdapterImplementationScopeHttpStatus(response))
        .send(response);
    },
  );
}

export function registerRuntimeAdapterReadinessGateRoute(
  gateway: FastifyInstance,
  options: ApiGatewayOptions = {},
): void {
  gateway.post(
    runtimeAdapterReadinessGateGatewayContract.path,
    async (request, reply) => {
      const inspectionOptions = options.now === undefined ? {} : { now: options.now() };
      const response = await inspectRuntimeAdapterReadinessGateGatewayRequest(
        request.body,
        inspectionOptions,
      );

      return reply
        .status(runtimeAdapterReadinessGateHttpStatus(response))
        .send(response);
    },
  );
}

export function registerAdapterInvocationAuthorizationBundleRoute(
  gateway: FastifyInstance,
  options: ApiGatewayOptions = {},
): void {
  gateway.post(
    adapterInvocationAuthorizationBundleGatewayContract.path,
    async (request, reply) => {
      const inspectionOptions = options.now === undefined ? {} : { now: options.now() };
      const response = await inspectAdapterInvocationAuthorizationBundleGatewayRequest(
        request.body,
        inspectionOptions,
      );

      return reply
        .status(adapterInvocationAuthorizationBundleHttpStatus(response))
        .send(response);
    },
  );
}

export function registerAdapterInvocationResultRoute(
  gateway: FastifyInstance,
  options: ApiGatewayOptions = {},
): void {
  gateway.post(adapterInvocationResultGatewayContract.path, async (request, reply) => {
    const inspectionOptions = options.now === undefined ? {} : { now: options.now() };
    const response = await inspectAdapterInvocationResultGatewayRequest(
      request.body,
      inspectionOptions,
    );

    return reply.status(adapterInvocationResultHttpStatus(response)).send(response);
  });
}

export function registerAdapterInvocationPreflightRoute(
  gateway: FastifyInstance,
  options: ApiGatewayOptions = {},
): void {
  gateway.post(
    adapterInvocationPreflightGatewayContract.path,
    async (request, reply) => {
      const inspectionOptions = options.now === undefined ? {} : { now: options.now() };
      const response = await inspectAdapterInvocationPreflightGatewayRequest(
        request.body,
        inspectionOptions,
      );

      return reply
        .status(adapterInvocationPreflightHttpStatus(response))
        .send(response);
    },
  );
}

export function registerSubstrateAdapterManifestRoute(
  gateway: FastifyInstance,
  options: ApiGatewayOptions = {},
): void {
  gateway.post(substrateAdapterManifestGatewayContract.path, async (request, reply) => {
    const inspectionOptions = options.now === undefined ? {} : { now: options.now() };
    const response = await inspectSubstrateAdapterManifestGatewayRequest(
      request.body,
      inspectionOptions,
    );

    return reply.status(substrateAdapterManifestHttpStatus(response)).send(response);
  });
}

export function registerCapabilityBrokerRequestRoute(
  gateway: FastifyInstance,
  options: ApiGatewayOptions = {},
): void {
  gateway.post(capabilityBrokerRequestGatewayContract.path, async (request, reply) => {
    const inspectionOptions = options.now === undefined ? {} : { now: options.now() };
    const response = await inspectCapabilityBrokerRequestGatewayRequest(
      request.body,
      inspectionOptions,
    );

    return reply.status(capabilityBrokerRequestHttpStatus(response)).send(response);
  });
}

export function registerSubstrateControlIntentRoute(
  gateway: FastifyInstance,
  options: ApiGatewayOptions = {},
): void {
  gateway.post(substrateControlIntentGatewayContract.path, async (request, reply) => {
    const inspectionOptions = options.now === undefined ? {} : { now: options.now() };
    const response = await inspectSubstrateControlIntentGatewayRequest(
      request.body,
      inspectionOptions,
    );

    return reply.status(substrateControlIntentHttpStatus(response)).send(response);
  });
}

export function registerAgentContextFirewallRoute(
  gateway: FastifyInstance,
  options: ApiGatewayOptions = {},
): void {
  gateway.post(agentContextFirewallGatewayContract.path, async (request, reply) => {
    const inspectionOptions = options.now === undefined ? {} : { now: options.now() };
    const response = await inspectAgentContextFirewallGatewayRequest(
      request.body,
      inspectionOptions,
    );

    return reply.status(agentContextFirewallHttpStatus(response)).send(response);
  });
}

export function registerServiceDatabaseInventoryRoute(
  gateway: FastifyInstance,
  options: ApiGatewayOptions = {},
): void {
  gateway.post(serviceDatabaseInventoryGatewayContract.path, async (request, reply) => {
    const inspectionOptions = options.now === undefined ? {} : { now: options.now() };
    const response = await inspectServiceDatabaseInventoryGatewayRequest(
      request.body,
      inspectionOptions,
    );

    return reply.status(serviceDatabaseInventoryHttpStatus(response)).send(response);
  });
}

export function registerHardwareInventoryInspectionRoute(
  gateway: FastifyInstance,
  options: ApiGatewayOptions = {},
): void {
  gateway.post(
    hardwareInventoryInspectionGatewayContract.path,
    async (request, reply) => {
      let inspectionOptions: { now?: Date } = {};
      if (options.now !== undefined) {
        try {
          inspectionOptions = { now: options.now() };
        } catch {
          inspectionOptions = { now: new Date(Number.NaN) };
        }
      }
      const response = await inspectHardwareInventoryGatewayRequest(
        request.body,
        inspectionOptions,
      );

      return reply
        .status(hardwareInventoryInspectionHttpStatus(response))
        .send(response);
    },
  );
}

export function registerPerformanceTelemetryInspectionRoute(
  gateway: FastifyInstance,
  options: ApiGatewayOptions = {},
): void {
  gateway.post(
    performanceTelemetryInspectionGatewayContract.path,
    async (request, reply) => {
      let inspectionOptions: { now?: Date } = {};
      if (options.now !== undefined) {
        try {
          inspectionOptions = { now: options.now() };
        } catch {
          inspectionOptions = { now: new Date(Number.NaN) };
        }
      }
      const response = await inspectPerformanceTelemetryGatewayRequest(
        request.body,
        inspectionOptions,
      );

      return reply
        .status(performanceTelemetryInspectionHttpStatus(response))
        .send(response);
    },
  );
}

export function registerHardwareAllocationRecommendationInspectionRoute(
  gateway: FastifyInstance,
  options: ApiGatewayOptions = {},
): void {
  gateway.post(
    hardwareAllocationRecommendationInspectionGatewayContract.path,
    async (request, reply) => {
      let inspectionOptions: { now?: Date } = {};
      if (options.now !== undefined) {
        try {
          inspectionOptions = { now: options.now() };
        } catch {
          inspectionOptions = { now: new Date(Number.NaN) };
        }
      }
      const response = await inspectHardwareAllocationRecommendationGatewayRequest(
        request.body,
        inspectionOptions,
      );
      return reply
        .status(hardwareAllocationRecommendationInspectionHttpStatus(response))
        .send(response);
    },
  );
}

export function registerPacketInspectionRoute(
  gateway: FastifyInstance,
  options: ApiGatewayOptions = {},
): void {
  gateway.post(packetInspectionGatewayContract.path, async (request, reply) => {
    const inspectionOptions = options.now === undefined ? {} : { now: options.now() };
    const response = await inspectPacketGatewayRequest(request.body, inspectionOptions);

    return reply.status(packetInspectionHttpStatus(response)).send(response);
  });
}

export function registerBuildPacketStateRoute(gateway: FastifyInstance): void {
  gateway.post(buildPacketStateGatewayContract.path, async (request, reply) => {
    const response = await inspectBuildPacketStateGatewayRequest(request.body);

    return reply.status(buildPacketStateHttpStatus(response)).send(response);
  });
}

export function registerProjectStateRoute(gateway: FastifyInstance): void {
  gateway.post(projectStateGatewayContract.path, async (request, reply) => {
    const response = await inspectProjectStateGatewayRequest(request.body);

    return reply.status(projectStateHttpStatus(response)).send(response);
  });
}

export function registerKnowledgeGatewaySourcesRoute(gateway: FastifyInstance): void {
  gateway.get(knowledgeGatewaySourcesContract.path, async (request, reply) => {
    const response = await inspectKnowledgeGatewaySourcesRequest(request.query);

    return reply.status(knowledgeGatewaySourcesHttpStatus(response)).send(response);
  });
}

export function registerKnowledgeGatewaySearchRoute(gateway: FastifyInstance): void {
  gateway.get(knowledgeGatewaySearchContract.path, async (request, reply) => {
    const response = await inspectKnowledgeGatewaySearchRequest(request.query);

    return reply.status(knowledgeGatewaySearchHttpStatus(response)).send(response);
  });
}

export function registerKnowledgeGatewayContextCompileRoute(
  gateway: FastifyInstance,
): void {
  gateway.post(knowledgeGatewayContextCompileContract.path, async (request, reply) => {
    const response = await inspectKnowledgeGatewayContextCompileRequest(request.body);

    return reply
      .status(knowledgeGatewayContextCompileHttpStatus(response))
      .send(response);
  });
}

export function registerOnboardingProfileInspectionRoute(
  gateway: FastifyInstance,
  options: ApiGatewayOptions = {},
): void {
  gateway.post(
    onboardingProfileInspectionGatewayContract.path,
    async (request, reply) => {
      const inspectionOptions = options.now === undefined ? {} : { now: options.now() };
      const response = await inspectOnboardingProfileGatewayRequest(
        request.body,
        inspectionOptions,
      );

      return reply
        .status(onboardingProfileInspectionHttpStatus(response))
        .send(response);
    },
  );
}

export function registerOnboardingContextInspectionRoute(
  gateway: FastifyInstance,
  options: ApiGatewayOptions = {},
): void {
  gateway.post(
    onboardingContextInspectionGatewayContract.path,
    async (request, reply) => {
      const inspectionOptions = options.now === undefined ? {} : { now: options.now() };
      const response = await inspectOnboardingContextGatewayRequest(
        request.body,
        inspectionOptions,
      );

      return reply
        .status(onboardingContextInspectionHttpStatus(response))
        .send(response);
    },
  );
}

export function registerAuditLedgerMigrationApprovalPreviewRoute(
  gateway: FastifyInstance,
  options: ApiGatewayOptions = {},
): void {
  gateway.post(
    auditLedgerMigrationApprovalPreviewGatewayContract.path,
    async (request, reply) => {
      const inspectionOptions = options.now === undefined ? {} : { now: options.now() };
      const response = inspectAuditLedgerMigrationApprovalPreviewGatewayRequest(
        request.body,
        inspectionOptions,
      );

      return reply
        .status(auditLedgerMigrationApprovalPreviewHttpStatus(response))
        .send(response);
    },
  );
}

export function registerAuditLedgerWriterInterfaceRoute(
  gateway: FastifyInstance,
  options: ApiGatewayOptions = {},
): void {
  gateway.post(
    auditLedgerWriterInterfaceGatewayContract.path,
    async (request, reply) => {
      const inspectionOptions = options.now === undefined ? {} : { now: options.now() };
      const response = await inspectAuditLedgerWriterInterfaceGatewayRequest(
        request.body,
        inspectionOptions,
      );

      return reply
        .status(auditLedgerWriterInterfaceHttpStatus(response))
        .send(response);
    },
  );
}

export function registerAuditLedgerWriterPersistencePreflightRoute(
  gateway: FastifyInstance,
  options: ApiGatewayOptions = {},
): void {
  gateway.post(
    auditLedgerWriterPersistencePreflightGatewayContract.path,
    async (request, reply) => {
      const inspectionOptions = options.now === undefined ? {} : { now: options.now() };
      const response = await inspectAuditLedgerWriterPersistencePreflightGatewayRequest(
        request.body,
        inspectionOptions,
      );

      return reply
        .status(auditLedgerWriterPersistencePreflightHttpStatus(response))
        .send(response);
    },
  );
}

export function registerAuditLedgerDatabaseSecurityPreflightRoute(
  gateway: FastifyInstance,
  options: ApiGatewayOptions = {},
): void {
  gateway.post(
    auditLedgerDatabaseSecurityPreflightGatewayContract.path,
    async (request, reply) => {
      const inspectionOptions = options.now === undefined ? {} : { now: options.now() };
      const response = await inspectAuditLedgerDatabaseSecurityPreflightGatewayRequest(
        request.body,
        inspectionOptions,
      );

      return reply
        .status(auditLedgerDatabaseSecurityPreflightHttpStatus(response))
        .send(response);
    },
  );
}

export function registerAuditLedgerPersistenceReadinessRoute(
  gateway: FastifyInstance,
  options: ApiGatewayOptions = {},
): void {
  gateway.post(
    auditLedgerPersistenceReadinessGatewayContract.path,
    async (request, reply) => {
      const inspectionOptions = options.now === undefined ? {} : { now: options.now() };
      const response = await inspectAuditLedgerPersistenceReadinessGatewayRequest(
        request.body,
        inspectionOptions,
      );

      return reply
        .status(auditLedgerPersistenceReadinessHttpStatus(response))
        .send(response);
    },
  );
}

export function registerAuditLedgerPersistenceScopeRequestRoute(
  gateway: FastifyInstance,
  options: ApiGatewayOptions = {},
): void {
  gateway.post(
    auditLedgerPersistenceScopeRequestGatewayContract.path,
    async (request, reply) => {
      const inspectionOptions = options.now === undefined ? {} : { now: options.now() };
      const response = await inspectAuditLedgerPersistenceScopeRequestGatewayRequest(
        request.body,
        inspectionOptions,
      );

      return reply
        .status(auditLedgerPersistenceScopeRequestHttpStatus(response))
        .send(response);
    },
  );
}

type PacketInspectionRouteResponse = Awaited<
  ReturnType<typeof inspectPacketGatewayRequest>
>;

type ServiceDatabaseInventoryRouteResponse = Awaited<
  ReturnType<typeof inspectServiceDatabaseInventoryGatewayRequest>
>;

type HardwareInventoryInspectionRouteResponse = Awaited<
  ReturnType<typeof inspectHardwareInventoryGatewayRequest>
>;

type PerformanceTelemetryInspectionRouteResponse = Awaited<
  ReturnType<typeof inspectPerformanceTelemetryGatewayRequest>
>;

type HardwareAllocationRecommendationInspectionRouteResponse = Awaited<
  ReturnType<typeof inspectHardwareAllocationRecommendationGatewayRequest>
>;

type SubstrateControlIntentRouteResponse = Awaited<
  ReturnType<typeof inspectSubstrateControlIntentGatewayRequest>
>;

type AgentContextFirewallRouteResponse = Awaited<
  ReturnType<typeof inspectAgentContextFirewallGatewayRequest>
>;

type CapabilityBrokerRequestRouteResponse = Awaited<
  ReturnType<typeof inspectCapabilityBrokerRequestGatewayRequest>
>;

type SubstrateAdapterManifestRouteResponse = Awaited<
  ReturnType<typeof inspectSubstrateAdapterManifestGatewayRequest>
>;

type AdapterInvocationPreflightRouteResponse = Awaited<
  ReturnType<typeof inspectAdapterInvocationPreflightGatewayRequest>
>;

type AdapterInvocationResultRouteResponse = Awaited<
  ReturnType<typeof inspectAdapterInvocationResultGatewayRequest>
>;

type AdapterInvocationAuthorizationBundleRouteResponse = Awaited<
  ReturnType<typeof inspectAdapterInvocationAuthorizationBundleGatewayRequest>
>;

type RuntimeAdapterReadinessGateRouteResponse = Awaited<
  ReturnType<typeof inspectRuntimeAdapterReadinessGateGatewayRequest>
>;

type RuntimeAdapterImplementationScopeRouteResponse = Awaited<
  ReturnType<typeof inspectRuntimeAdapterImplementationScopeGatewayRequest>
>;

type RuntimeAdapterImplementationPlanRouteResponse = Awaited<
  ReturnType<typeof inspectRuntimeAdapterImplementationPlanGatewayRequest>
>;

type RuntimeAdapterImplementationAuthorizationRequestRouteResponse = Awaited<
  ReturnType<
    typeof inspectRuntimeAdapterImplementationAuthorizationRequestGatewayRequest
  >
>;

type RuntimeAdapterImplementationApprovalGateRouteResponse = Awaited<
  ReturnType<typeof inspectRuntimeAdapterImplementationApprovalGateGatewayRequest>
>;

type RuntimeAdapterImplementationDryRunEvidenceRouteResponse = Awaited<
  ReturnType<typeof inspectRuntimeAdapterImplementationDryRunEvidenceGatewayRequest>
>;

function runtimeAdapterImplementationDryRunEvidenceHttpStatus(
  response: RuntimeAdapterImplementationDryRunEvidenceRouteResponse,
): number {
  if (response.ok) {
    return 200;
  }

  return 400;
}

function runtimeAdapterImplementationApprovalGateHttpStatus(
  response: RuntimeAdapterImplementationApprovalGateRouteResponse,
): number {
  if (response.ok) {
    return 200;
  }

  return 400;
}

function runtimeAdapterImplementationAuthorizationRequestHttpStatus(
  response: RuntimeAdapterImplementationAuthorizationRequestRouteResponse,
): number {
  if (response.ok) {
    return 200;
  }

  return 400;
}

function runtimeAdapterImplementationPlanHttpStatus(
  response: RuntimeAdapterImplementationPlanRouteResponse,
): number {
  if (response.ok) {
    return 200;
  }

  return 400;
}

function runtimeAdapterImplementationScopeHttpStatus(
  response: RuntimeAdapterImplementationScopeRouteResponse,
): number {
  if (response.ok) {
    return 200;
  }

  return 400;
}

function runtimeAdapterReadinessGateHttpStatus(
  response: RuntimeAdapterReadinessGateRouteResponse,
): number {
  if (response.ok) {
    return 200;
  }

  return 400;
}

function adapterInvocationAuthorizationBundleHttpStatus(
  response: AdapterInvocationAuthorizationBundleRouteResponse,
): number {
  if (response.ok) {
    return 200;
  }

  return 400;
}

function adapterInvocationResultHttpStatus(
  response: AdapterInvocationResultRouteResponse,
): number {
  if (response.ok) {
    return 200;
  }

  return 400;
}

function adapterInvocationPreflightHttpStatus(
  response: AdapterInvocationPreflightRouteResponse,
): number {
  if (response.ok) {
    return 200;
  }

  return 400;
}

function substrateAdapterManifestHttpStatus(
  response: SubstrateAdapterManifestRouteResponse,
): number {
  if (response.ok) {
    return 200;
  }

  return 400;
}

function capabilityBrokerRequestHttpStatus(
  response: CapabilityBrokerRequestRouteResponse,
): number {
  if (response.ok) {
    return 200;
  }

  return 400;
}

function substrateControlIntentHttpStatus(
  response: SubstrateControlIntentRouteResponse,
): number {
  if (response.ok) {
    return 200;
  }

  return 400;
}

function agentContextFirewallHttpStatus(
  response: AgentContextFirewallRouteResponse,
): number {
  if (response.ok) {
    return 200;
  }

  return 400;
}

function serviceDatabaseInventoryHttpStatus(
  response: ServiceDatabaseInventoryRouteResponse,
): number {
  if (response.ok) {
    return 200;
  }

  return 400;
}

function hardwareInventoryInspectionHttpStatus(
  response: HardwareInventoryInspectionRouteResponse,
): number {
  return response.ok ? 200 : 400;
}

function performanceTelemetryInspectionHttpStatus(
  response: PerformanceTelemetryInspectionRouteResponse,
): number {
  return response.ok ? 200 : 400;
}

function hardwareAllocationRecommendationInspectionHttpStatus(
  response: HardwareAllocationRecommendationInspectionRouteResponse,
): number {
  return response.ok ? 200 : 400;
}

function packetInspectionHttpStatus(response: PacketInspectionRouteResponse): number {
  if (response.ok) {
    return 200;
  }

  if (response.request_errors.length > 0) {
    return 400;
  }

  return 422;
}

type BuildPacketStateRouteResponse = Awaited<
  ReturnType<typeof inspectBuildPacketStateGatewayRequest>
>;

function buildPacketStateHttpStatus(response: BuildPacketStateRouteResponse): number {
  if (response.ok) {
    return 200;
  }

  const errorCodes = response.errors.map((error) => error.code);
  if (
    errorCodes.some(
      (code) =>
        code === "build_state.invalid_request" ||
        code === "build_state.unexpected_field" ||
        code === "build_state.invalid_request_id" ||
        code === "build_state.invalid_packet_id",
    )
  ) {
    return 400;
  }

  return 404;
}

type ProjectStateRouteResponse = Awaited<
  ReturnType<typeof inspectProjectStateGatewayRequest>
>;

function projectStateHttpStatus(response: ProjectStateRouteResponse): number {
  if (response.ok) {
    return 200;
  }

  return response.errors.some((error) =>
    [
      "project_state.invalid_request",
      "project_state.unexpected_field",
      "project_state.invalid_request_id",
      "project_state.invalid_item_id",
    ].includes(error.code),
  )
    ? 400
    : 404;
}

type KnowledgeGatewaySourcesRouteResponse = Awaited<
  ReturnType<typeof inspectKnowledgeGatewaySourcesRequest>
>;

function knowledgeGatewaySourcesHttpStatus(
  response: KnowledgeGatewaySourcesRouteResponse,
): number {
  if (response.ok) {
    return 200;
  }

  return 400;
}

type KnowledgeGatewaySearchRouteResponse = Awaited<
  ReturnType<typeof inspectKnowledgeGatewaySearchRequest>
>;

function knowledgeGatewaySearchHttpStatus(
  response: KnowledgeGatewaySearchRouteResponse,
): number {
  if (response.ok) {
    return 200;
  }

  if (response.request_errors.length > 0) {
    return 400;
  }

  return 422;
}

type KnowledgeGatewayContextCompileRouteResponse = Awaited<
  ReturnType<typeof inspectKnowledgeGatewayContextCompileRequest>
>;

function knowledgeGatewayContextCompileHttpStatus(
  response: KnowledgeGatewayContextCompileRouteResponse,
): number {
  if (response.ok) {
    return 200;
  }

  if (response.request_errors.length > 0) {
    return 400;
  }

  return 422;
}

type OnboardingProfileInspectionRouteResponse = Awaited<
  ReturnType<typeof inspectOnboardingProfileGatewayRequest>
>;

function onboardingProfileInspectionHttpStatus(
  response: OnboardingProfileInspectionRouteResponse,
): number {
  if (response.ok) {
    return 200;
  }

  return 400;
}

type OnboardingContextInspectionRouteResponse = Awaited<
  ReturnType<typeof inspectOnboardingContextGatewayRequest>
>;

function onboardingContextInspectionHttpStatus(
  response: OnboardingContextInspectionRouteResponse,
): number {
  if (response.ok) {
    return 200;
  }

  if (response.request_errors.length > 0) {
    return 400;
  }

  return 422;
}

type AuditLedgerMigrationApprovalPreviewRouteResponse = ReturnType<
  typeof inspectAuditLedgerMigrationApprovalPreviewGatewayRequest
>;

function auditLedgerMigrationApprovalPreviewHttpStatus(
  response: AuditLedgerMigrationApprovalPreviewRouteResponse,
): number {
  if (response.ok) {
    return 200;
  }

  return 400;
}

type AuditLedgerWriterInterfaceRouteResponse = Awaited<
  ReturnType<typeof inspectAuditLedgerWriterInterfaceGatewayRequest>
>;

function auditLedgerWriterInterfaceHttpStatus(
  response: AuditLedgerWriterInterfaceRouteResponse,
): number {
  if (response.ok) {
    return 200;
  }

  return 400;
}

type AuditLedgerWriterPersistencePreflightRouteResponse = Awaited<
  ReturnType<typeof inspectAuditLedgerWriterPersistencePreflightGatewayRequest>
>;

function auditLedgerWriterPersistencePreflightHttpStatus(
  response: AuditLedgerWriterPersistencePreflightRouteResponse,
): number {
  if (response.ok) {
    return 200;
  }

  return 400;
}

type AuditLedgerDatabaseSecurityPreflightRouteResponse = Awaited<
  ReturnType<typeof inspectAuditLedgerDatabaseSecurityPreflightGatewayRequest>
>;

function auditLedgerDatabaseSecurityPreflightHttpStatus(
  response: AuditLedgerDatabaseSecurityPreflightRouteResponse,
): number {
  if (response.ok) {
    return 200;
  }

  return 400;
}

type AuditLedgerPersistenceReadinessRouteResponse = Awaited<
  ReturnType<typeof inspectAuditLedgerPersistenceReadinessGatewayRequest>
>;

function auditLedgerPersistenceReadinessHttpStatus(
  response: AuditLedgerPersistenceReadinessRouteResponse,
): number {
  if (response.ok) {
    return 200;
  }

  return 400;
}

type AuditLedgerPersistenceScopeRequestRouteResponse = Awaited<
  ReturnType<typeof inspectAuditLedgerPersistenceScopeRequestGatewayRequest>
>;

function auditLedgerPersistenceScopeRequestHttpStatus(
  response: AuditLedgerPersistenceScopeRequestRouteResponse,
): number {
  if (response.ok) {
    return 200;
  }

  return 400;
}
