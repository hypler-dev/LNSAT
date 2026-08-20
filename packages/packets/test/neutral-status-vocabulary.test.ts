import { describe, expect, it } from "vitest";

import * as packetExports from "../src/index.js";

describe("packet source status vocabulary", () => {
  it("uses neutral values without milestone chronology", () => {
    const statusEntries = Object.entries(packetExports).filter(
      ([name, value]) => name.endsWith("_STATUS") && typeof value === "string",
    );

    expect(statusEntries).toHaveLength(97);
    expect(statusEntries).toContainEqual(["PACKET_RUNTIME_STATUS", "source_only"]);
    expect(statusEntries).toContainEqual(["CONTRACT_VERSION_STATUS", "contract_only"]);
    expect(statusEntries).toContainEqual([
      "CONTRACT_ERROR_ENVELOPE_V1_STATUS",
      "contract_only",
    ]);
    expect(statusEntries).toContainEqual([
      "GATEWAY_SESSION_READ_V1_STATUS",
      "contract_only",
    ]);
    expect(statusEntries).toContainEqual([
      "GATEWAY_SESSION_EVENT_READ_V1_STATUS",
      "contract_only",
    ]);
    expect(statusEntries).toContainEqual([
      "GATEWAY_SESSION_ISSUE_V1_STATUS",
      "contract_only",
    ]);
    expect(statusEntries).toContainEqual([
      "GATEWAY_SESSION_ROTATION_V1_STATUS",
      "contract_only",
    ]);
    expect(statusEntries).toContainEqual([
      "GATEWAY_SESSION_FAMILY_SIGN_OUT_V1_STATUS",
      "contract_only",
    ]);
    expect(statusEntries).toContainEqual([
      "GATEWAY_APPROVAL_DECISION_V1_STATUS",
      "contract_only",
    ]);
    expect(statusEntries).toContainEqual([
      "GATEWAY_APPROVAL_REQUEST_V1_STATUS",
      "contract_only",
    ]);
    expect(statusEntries).toContainEqual([
      "GATEWAY_IDENTITY_PASSWORD_ROTATION_V1_STATUS",
      "contract_only",
    ]);
    expect(statusEntries).toContainEqual([
      "GATEWAY_IDENTITY_CREATION_V1_STATUS",
      "contract_only",
    ]);
    expect(statusEntries).toContainEqual([
      "GATEWAY_IDENTITY_DISABLEMENT_V1_STATUS",
      "contract_only",
    ]);
    expect(statusEntries).toContainEqual([
      "GATEWAY_IDENTITY_EVENT_READ_V1_STATUS",
      "contract_only",
    ]);
    expect(statusEntries).toContainEqual([
      "CONTRACT_COMPATIBILITY_MATRIX_V1_STATUS",
      "contract_only",
    ]);
    expect(statusEntries).toContainEqual([
      "PACKET_ENVELOPE_V1_STATUS",
      "contract_only",
    ]);
    expect(statusEntries).toContainEqual([
      "EXECUTION_REQUEST_V1_STATUS",
      "contract_only",
    ]);
    expect(statusEntries).toContainEqual([
      "INSTALLATION_CONTROL_PROFILE_STATUS",
      "contract_only",
    ]);
    expect(statusEntries).toContainEqual([
      "V1_AUTHORITY_LAYER_PLAN_STATUS",
      "source_only",
    ]);
    expect(statusEntries).toContainEqual([
      "AGENT_CONTEXT_FIREWALL_STATUS",
      "read_only_inspection",
    ]);
    expect(statusEntries.filter(([, value]) => /bp-[0-9]{4}/iu.test(value))).toEqual(
      [],
    );
  });
});
