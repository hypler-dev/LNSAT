import { offlineRecoveryUnavailablePostureV1 } from "@lnsat/gateway";

export const CONTROL_CENTER_OFFLINE_RECOVERY_STATUS = "contract_only";

export function projectOfflineRecoveryPostureV1() {
  return {
    ...offlineRecoveryUnavailablePostureV1("ui"),
    rendered_actions: [] as [],
    action_authority: false as const,
  };
}
