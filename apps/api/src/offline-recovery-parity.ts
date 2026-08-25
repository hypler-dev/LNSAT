import { offlineRecoveryUnavailablePostureV1 } from "@lnsat/gateway";

export const API_OFFLINE_RECOVERY_STATUS = "contract_only";

export function apiOfflineRecoveryPostureV1() {
  return offlineRecoveryUnavailablePostureV1("api");
}
