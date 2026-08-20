# Phase 10 Product-Surface Contract Spine

- Status: experimental source implementation; Phase 10 remains in progress
- Gate: `P10_A1_PRODUCT_SURFACE_CONTRACT_SPINE`
- Runtime effect: read-only operator diagnostics and recovery inspection
- Mutation effect: none
- Package, binary, service, or production support claim: none

## Scope

P10-A1 establishes one target-neutral source contract shared by `lnsatd`,
`lnsatctl`, `lnsat`, and a read-only Control Center projection. It freezes
command ownership, configuration precedence, diagnostic and exit-code families,
machine-output identity, recovery and service boundaries, generated completion
and man-page source, version/build posture, non-root requirements, and existing
packet-inspection parity.

The canonical manifest is
`fixtures/contracts/phase10-product-surface-v1.json` with contract
`lnsat.product_surface.v1`. It is embedded or loaded from repository source. It
is not an artifact manifest and contains no selected target, source-revision
binding, component digest, package row, or support claim.

## Current Source Truth

| Surface          | Implemented source                                                                                                                                             | Remaining Phase 10 work                                                                                                                            |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lnsatd`         | `DaemonConfigV1`, strict explicit arguments, loopback bind, public-safe `DaemonErrorV1`, `--help`, `--version`, and new `--manifest`                           | stable configuration-file loading, selected user/system paths, full output-format handling, target-neutral non-root enforcement evidence           |
| `lnsatctl`       | Rust source entry point in `crates/lnsatd/src/bin/lnsatctl.rs`; `doctor`, read-only `recovery inspect`, `manifest`, completion, man, help, and version         | authenticated daemon health/status, offline backup/restore/owner-recovery commands, service/update/audit commands only after their authority gates |
| `lnsat`          | TypeScript dispatcher in `packages/cli/src/index.ts`; packet validate/hash/inspect plus manifest, completion, man, help, and version                           | later Gateway-client workflow groups only when owning phases open them                                                                             |
| command taxonomy | canonical implemented and reserved groups in Phase 10 manifest                                                                                                 | each reserved command needs its owning phase, exact authority, and conformance before exposure                                                     |
| configuration    | fixed precedence and explicit-only current source profile                                                                                                      | system/user path selection and operational config loading                                                                                          |
| diagnostics      | `lnsat.cli.output.v1`, public-safe JSON, stdout/stderr separation, stable exit families                                                                        | text/JSONL/YAML format implementations and compatibility negotiation                                                                               |
| recovery         | exact database classification through `SqliteStore::inspect_recovery_state_v1`; no path reflection                                                             | offline backup, inert restore, and owner recovery remain unexposed                                                                                 |
| service managers | metadata-only boundary; install/start/auto-start/sudo/helper all false                                                                                         | target-specific metadata and lifecycle proof remain Phase 14                                                                                       |
| completion/man   | bash, zsh, fish and three source man pages generated to stdout                                                                                                 | installation and target integration remain Phase 14                                                                                                |
| version/build    | source version plus unbound target-neutral manifest                                                                                                            | source revision, target, recipe, digests, SBOM, provenance, and artifact binding remain Phase 13/14                                                |
| non-root         | required contract; no sudo or privileged helper                                                                                                                | target-specific enforcement and lifecycle proof remain Phase 14                                                                                    |
| parity           | CLI/API/MCP packet-inspection equality retained; Control Center projection preserves exact Gateway response, policy decision, audit preview, and empty effects | rendered product workflow parity follows only with later owned commands                                                                            |

## Source Ownership

- `fixtures/contracts/phase10-product-surface-v1.json` owns canonical manifest.
- `crates/lnsatd/src/product_surface.rs` owns Rust exit families, manifest,
  doctor/recovery projection, generated completion, and man source.
- `crates/lnsatd/src/bin/lnsatctl.rs` owns current operator entry point.
- `crates/lnsatd/src/lib.rs` and `crates/lnsatd/src/main.rs` own daemon manifest
  dispatch without storage or listener use.
- `packages/cli/src/product-surface.ts` owns current `lnsat` product dispatch.
- `apps/console/src/lib/packet-inspection-evidence.ts` owns read-only UI parity
  projection.

## Stable Exit Families

| Family                   | Code | Meaning                                                  |
| ------------------------ | ---- | -------------------------------------------------------- |
| `success`                | 0    | requested operation completed                            |
| `refused`                | 1    | valid request refused by contract or policy evidence     |
| `usage_or_configuration` | 2    | arguments, input, or configuration invalid               |
| `authentication`         | 3    | authentication failed or required                        |
| `unavailable`            | 4    | command or capability unavailable in current profile     |
| `conflict`               | 5    | immutable or concurrent state conflict                   |
| `temporary_failure`      | 6    | bounded temporary failure; retry still requires evidence |
| `outcome_unknown`        | 7    | consequence outcome not proven                           |
| `internal_failure`       | 70   | internal source failure                                  |

No exit code proves execution or non-execution. Consequential commands remain
unavailable in this packet.

## Security Properties

- `lnsat` and `lnsatctl` do not receive direct infrastructure authority.
- Operator commands use no ambient environment for target or secret selection.
- No secret is accepted in process arguments or reflected in diagnostics.
- Recovery inspection opens one explicit database read-only and returns no raw
  path, migration, repair, quarantine, credential, or activation action.
- Completion and man generation write requested source only to stdout.
- Service install/start, automatic start, `sudo`, and privileged helpers remain
  unavailable.
- Control Center parity projection copies exact Gateway evidence; it does not
  decide, mutate, execute, retry, reconcile, or submit receipts.

## Compatibility Risks

- Existing `lnsat` packet JSON and exit behavior remain unchanged. New global
  commands occupy previously invalid argument shapes.
- `lnsatd --manifest` occupies one previously invalid flag and opens no store or
  listener.
- `lnsatctl` is new experimental source. Its contract may change before support,
  but exit families and machine schema now require explicit versioned changes.
- System/user paths remain deliberately unselected. Downstream code must not
  infer Linux, Homebrew, XDG, OCI, or Windows paths from this source manifest.
- Reserved command names are not availability claims and must not become hidden
  pass-throughs to connectors, providers, service managers, or shell commands.

## Acceptance Evidence

- exact shared manifest equality across `lnsatd`, `lnsatctl`, and `lnsat`;
- source-only/package-closed/service-closed hard-stop assertions;
- `lnsatctl doctor` JSON and stable usage failures;
- real read-only recovery inspection with raw-path non-reflection;
- bash/zsh/fish completion and `lnsat`/`lnsatctl`/`lnsatd` man source;
- existing packet CLI/API/MCP equality plus exact Control Center projection;
- focused TypeScript typecheck/tests and Rust format/clippy/tests;
- repository-wide `npm run check` and `npm run public:check` before delivery.

## Remaining Phase 10 Gates

P10-A1 does not complete Phase 10. A separately bounded continuation must close:

1. operational configuration loading with explicit schema and visible resolved
   precedence;
2. selected-path behavior without claiming Phase 14 target paths;
3. authenticated `status`/`health` transport and stable text/JSONL/YAML outputs;
4. offline backup, inert restore, and protected owner-recovery command contracts
   with non-argument secret intake;
5. target-neutral non-root enforcement proof;
6. full CLI/API/MCP/UI fixtures for every newly exposed command.

Phase 11 remains closed until Phase 10 exit evidence passes. Required sequence
remains Phase 10 -> Phase 11 -> Phase 13 -> Phase 14; Phase 12 remains optional.

## Hard Stops

P10-A1 grants no served recovery mutation, production/user-repository
consequence, migration `0018`, key/provider work, package or supported-binary
claim, filesystem installation, service registration/start, tag, release,
publication, deployment, Phase 11+ implementation, or automatic promotion.
