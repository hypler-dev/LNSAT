export const OFFLINE_RECOVERY_PARITY_STATUS = "cli_offline_only";

export const offlineRecoveryParityContract = {
  contract_id: "lnsat.operator_recovery.parity.v1",
  operator_contract_id: "lnsat.operator_recovery.v1",
  schema_version: 1,
  commands: [
    {
      command: "backup",
      cli: "implemented_offline",
      api: "unavailable",
      mcp: "unavailable",
      ui: "unavailable",
      served_mutation: false,
      automatic_activation: false,
    },
    {
      command: "restore",
      cli: "implemented_inert",
      api: "unavailable",
      mcp: "unavailable",
      ui: "unavailable",
      served_mutation: false,
      automatic_activation: false,
    },
    {
      command: "recovery.owner",
      cli: "implemented_offline_protected_stdin",
      api: "unavailable",
      mcp: "unavailable",
      ui: "unavailable",
      served_mutation: false,
      automatic_activation: false,
    },
  ],
  non_root: {
    daemon_runtime_enforced: true,
    offline_recovery_enforced: true,
    effective_uid_zero: "refused",
    automatic_privilege_escalation: false,
  },
  secret_intake: {
    owner_password: "protected_stdin_only",
    process_argument: false,
    environment_variable: false,
    config_field: false,
    output_reflection: false,
  },
  hard_stops: {
    served_api_route: false,
    mcp_tool: false,
    ui_action: false,
    existing_file_replacement: false,
    restore_activation: false,
    schema_change: false,
    phase11: false,
    deploy_or_production_use: false,
  },
} as const;

export type OfflineRecoveryChannelV1 = "api" | "mcp" | "ui";

export type OfflineRecoveryUnavailablePostureV1 = {
  contract_id: typeof offlineRecoveryParityContract.contract_id;
  channel: OfflineRecoveryChannelV1;
  available_commands: [];
  unavailable_commands: Array<
    (typeof offlineRecoveryParityContract.commands)[number]["command"]
  >;
  mutation_authority: false;
  side_effects: [];
};

export function offlineRecoveryUnavailablePostureV1(
  channel: OfflineRecoveryChannelV1,
): OfflineRecoveryUnavailablePostureV1 {
  return {
    contract_id: offlineRecoveryParityContract.contract_id,
    channel,
    available_commands: [],
    unavailable_commands: offlineRecoveryParityContract.commands.map(
      ({ command }) => command,
    ),
    mutation_authority: false,
    side_effects: [],
  };
}
