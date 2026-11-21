export const LNSAT_CORE_VERSION = "0.1.0";

export const LNSAT_PRODUCT_NAME = "Layered Network Substrate for Agent Telemetry";

export type BuildPhase =
  | "Phase 0: Documentation Baseline"
  | "Phase 1: Universal Packet Runtime"
  | "Phase 2: Policy And Audit Skeleton"
  | "Phase 3: Context Atoms And Repo/Docs Indexing"
  | "Phase 4: Read-Only Interfaces";

export const currentBuildPhase: BuildPhase = "Phase 2: Policy And Audit Skeleton";
