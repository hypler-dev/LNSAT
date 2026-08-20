import type { AuditLedgerEventType } from "@lnsat/audit";
import {
  controlCenterOperationFixture,
  projectControlCenterSyntheticFixtureV1,
  type ControlCenterOperationReadback,
  type ControlCenterSyntheticFixtureProjectionV1,
} from "@lnsat/gateway";
import type { UniversalPacket } from "@lnsat/packets";
import type { PolicyDecisionKind } from "@lnsat/policy";

export const consoleSectionSlugs = [
  "knowledge",
  "packets",
  "agents",
  "approvals",
  "audit",
  "operations",
  "substrates",
  "readiness",
  "settings",
] as const;

export type ConsoleSectionSlug = (typeof consoleSectionSlugs)[number];

export type ConsoleSection = {
  slug: ConsoleSectionSlug;
  title: string;
  summary: string;
  signals: readonly string[];
  status: "fixture_preview";
  mutation_controls: [];
  side_effects: [];
};

export type ConsoleFixtureContracts = {
  packet_type: UniversalPacket["packet_type"];
  policy_decision: PolicyDecisionKind;
  audit_event_type: AuditLedgerEventType;
};

export const consoleFixtureContracts: ConsoleFixtureContracts = {
  packet_type: "CapabilityPacket",
  policy_decision: "approval_required",
  audit_event_type: "approval_requested",
};

export const consoleOperationReadback: ControlCenterOperationReadback =
  controlCenterOperationFixture;

export const consoleSyntheticOperationProjection: ControlCenterSyntheticFixtureProjectionV1 =
  projectControlCenterSyntheticFixtureV1(consoleOperationReadback);

export const consoleSections: readonly ConsoleSection[] = [
  {
    slug: "knowledge",
    title: "Knowledge",
    summary: "Inspect cited, bounded context without external retrieval.",
    signals: ["Source references", "Freshness warnings", "Context boundaries"],
    status: "fixture_preview",
    mutation_controls: [],
    side_effects: [],
  },
  {
    slug: "packets",
    title: "Packets",
    summary: "Review explicit intent, scope, risk, and permission envelopes.",
    signals: ["CapabilityPacket", "Risk level", "Approval requirement"],
    status: "fixture_preview",
    mutation_controls: [],
    side_effects: [],
  },
  {
    slug: "agents",
    title: "Agents",
    summary: "See identities, assignments, capabilities, and context posture.",
    signals: ["Agent identity", "Capability profile", "Human supervision"],
    status: "fixture_preview",
    mutation_controls: [],
    side_effects: [],
  },
  {
    slug: "approvals",
    title: "Approvals",
    summary: "Preview decisions requiring human review; no mutation controls.",
    signals: ["approval_required", "Evidence requirements", "Bounded grant shape"],
    status: "fixture_preview",
    mutation_controls: [],
    side_effects: [],
  },
  {
    slug: "audit",
    title: "Audit",
    summary: "Inspect planned evidence linkage and append-only contract posture.",
    signals: ["approval_requested", "Result status", "Evidence references"],
    status: "fixture_preview",
    mutation_controls: [],
    side_effects: [],
  },
  {
    slug: "operations",
    title: "Operations",
    summary:
      "Inspect reconciliation and receipt posture without dispatch or retry mutation.",
    signals: ["Outcome ambiguity", "Reconciliation", "Receipt gating"],
    status: "fixture_preview",
    mutation_controls: [],
    side_effects: [],
  },
  {
    slug: "substrates",
    title: "Substrates",
    summary: "Map systems and adapters without probing or connecting to them.",
    signals: ["Repositories", "Services", "Adapter boundaries"],
    status: "fixture_preview",
    mutation_controls: [],
    side_effects: [],
  },
  {
    slug: "readiness",
    title: "Readiness",
    summary: "Show missing gates before runtime authority can exist.",
    signals: ["Policy gate", "Approval gate", "Audit gate"],
    status: "fixture_preview",
    mutation_controls: [],
    side_effects: [],
  },
  {
    slug: "settings",
    title: "Settings",
    summary: "Display policy defaults and blocked live configuration.",
    signals: ["Fail closed", "Root rare", "Secrets by reference"],
    status: "fixture_preview",
    mutation_controls: [],
    side_effects: [],
  },
] as const;

export function findConsoleSection(slug: string): ConsoleSection | undefined {
  return consoleSections.find((section) => section.slug === slug);
}
