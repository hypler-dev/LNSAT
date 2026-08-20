# `@lnsat/cli`

Local `lnsat` dispatcher source for packet inspection and Phase 10 source
contract introspection.

Current commands are `packet validate`, `packet hash`, `packet inspect`,
`manifest`, `completion`, `man`, `--help`, and `--version`. Workspace remains
private and unpublished; run built source from repository checkout.
Exported CLI status metadata uses the neutral `source_only` value.

## Develop

```sh
npm run typecheck -w @lnsat/cli
npm run test -w @lnsat/cli
npm run build -w @lnsat/cli
```

CLI remains thin over `@lnsat/packets` validators and does not grant execution
authority.

## Planned Product Split

Phase 10 separates:

- `lnsat` for user, agent, script, context, packet, approval, receipt, profile,
  skill, connector, and graph workflows;
- `lnsatctl` for owner/operator identity, service, recovery, backup, update,
  rollback, quarantine, and evidence administration;
- `lnsatd` for Gateway, local state, Control Center, policy, authorization, and
  receipt verification.

P10-A1 implements only the bounded source commands above. `lnsatctl` source lives
beside `lnsatd` in the Rust crate. Future commands remain
Gateway clients with closed machine-readable output, explicit targets, no
ambient authority, and no secret-bearing process arguments.

See [CLI and OS operator interface](../../docs/architecture/CLI_AND_OS_OPERATOR_INTERFACE.md).
