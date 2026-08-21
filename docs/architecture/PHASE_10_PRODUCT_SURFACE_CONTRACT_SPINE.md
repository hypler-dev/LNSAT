# Phase 10 Product-Surface Contract Spine

- Status: experimental source implementation; Phase 10 remains in progress
- Gates: `P10_A1_PRODUCT_SURFACE_CONTRACT_SPINE`,
  `P10_A2_EXPLICIT_CONFIGURATION`
- Runtime effect: explicit configuration loading plus read-only operator
  configuration/recovery inspection
- Mutation effect: none
- Package, binary, service, or production support claim: none

## Scope

P10-A1 establishes one target-neutral source contract shared by `lnsatd`,
`lnsatctl`, `lnsat`, and a read-only Control Center projection. It freezes
command ownership, configuration precedence, diagnostic and exit-code families,
machine-output identity, recovery and service boundaries, generated completion
and man-page source, version/build posture, non-root requirements, and existing
packet-inspection parity.

P10-A2 adds one target-neutral explicit-only daemon configuration contract. It
does not select system, user, OS, target, package, data, or log paths. Existing
direct daemon arguments remain an alternate compatible mode; mixing direct and
configuration-file values is rejected.

The canonical manifest is
`fixtures/contracts/phase10-product-surface-v1.json` with contract
`lnsat.product_surface.v1`. It is embedded or loaded from repository source. It
is not an artifact manifest and contains no selected target, source-revision
binding, component digest, package row, or support claim.

The canonical explicit configuration fixture is
`fixtures/contracts/phase10-daemon-config-v1.json` with contract
`lnsat.daemon.config.v1`. `lnsatd --config` requires one operator-supplied
absolute path to a regular, non-symlinked, UTF-8 closed JSON file no larger than
64 KiB. Duplicate keys, unknown fields, wrong identities/versions, and unsafe
values fail closed.

## Current Source Truth

| Surface          | Implemented source                                                                                                                                             | Remaining Phase 10 work                                                                                                                            |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lnsatd`         | `DaemonConfigV1`, direct arguments, `--config` with closed `lnsat.daemon.config.v1`, loopback bind, public-safe errors, help/version/manifest                  | selected user/system paths, full output-format handling, target-neutral non-root enforcement evidence                                              |
| `lnsatctl`       | `doctor`, public-safe `config inspect`, read-only `recovery inspect`, manifest, completion, man, help, and version                                             | authenticated daemon health/status, offline backup/restore/owner-recovery commands, service/update/audit commands only after their authority gates |
| `lnsat`          | TypeScript dispatcher in `packages/cli/src/index.ts`; packet validate/hash/inspect plus manifest, completion, man, help, and version                           | later Gateway-client workflow groups only when owning phases open them                                                                             |
| command taxonomy | canonical implemented and reserved groups in Phase 10 manifest                                                                                                 | each reserved command needs its owning phase, exact authority, and conformance before exposure                                                     |
| configuration    | bounded explicit UTF-8 JSON, recursive duplicate/unknown-key rejection, exact-byte digest, visible applied layers, no environment discovery                    | system/user path selection remains deliberately unimplemented                                                                                      |
| diagnostics      | `lnsat.cli.output.v1`, public-safe JSON, stdout/stderr separation, stable exit families                                                                        | text/JSONL/YAML format implementations and compatibility negotiation                                                                               |
| recovery         | exact database classification through `SqliteStore::inspect_recovery_state_v1`; no path reflection                                                             | offline backup, inert restore, and owner recovery remain unexposed                                                                                 |
| service managers | metadata-only boundary; install/start/auto-start/sudo/helper all false                                                                                         | target-specific metadata and lifecycle proof remain Phase 14                                                                                       |
| completion/man   | bash, zsh, fish and three source man pages generated to stdout                                                                                                 | installation and target integration remain Phase 14                                                                                                |
| version/build    | source version plus unbound target-neutral manifest                                                                                                            | source revision, target, recipe, digests, SBOM, provenance, and artifact binding remain Phase 13/14                                                |
| non-root         | required contract; no sudo or privileged helper                                                                                                                | target-specific enforcement and lifecycle proof remain Phase 14                                                                                    |
| parity           | CLI/API/MCP packet-inspection equality retained; Control Center projection preserves exact Gateway response, policy decision, audit preview, and empty effects | rendered product workflow parity follows only with later owned commands                                                                            |

## Source Ownership

- `fixtures/contracts/phase10-product-surface-v1.json` owns canonical manifest.
- `fixtures/contracts/phase10-daemon-config-v1.json` owns canonical explicit
  configuration fixture.
- `crates/lnsatd/src/product_config.rs` owns bounded file loading, recursive
  duplicate-key rejection, closed-schema parsing, explicit seam mapping, and
  exact-byte SHA-256 evidence.
- `crates/lnsatd/src/product_surface.rs` owns Rust exit families, manifest,
  doctor/config/recovery projection, generated completion, and man source.
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
- Explicit configuration accepts no secret fields, reads no environment
  variables, and never reflects rejected paths or bytes.
- Configuration may select only an absolute database path, numeric-loopback
  listen address, paired Phase 8 disposable Git root/executable, and an exact
  existing console-root manifest seam.
- `lnsatctl config inspect` opens no database or listener and emits only public
  contract identity, exact-byte digest, applied layers, safe booleans, and
  empty effects.
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
- `lnsatd --config` occupies one previously invalid argument shape. Existing
  direct `--database`, `--listen`, paired Phase 8 runtime arguments, help,
  version, and manifest behavior remain compatible. Mixed direct/config input
  is invalid rather than precedence-dependent.
- `lnsatctl` is new experimental source. Its contract may change before support,
  but exit families and machine schema now require explicit versioned changes.
- System/user paths remain deliberately unselected. Downstream code must not
  infer Linux, Homebrew, XDG, OCI, or Windows paths from this source manifest.
- Reserved command names are not availability claims and must not become hidden
  pass-throughs to connectors, providers, service managers, or shell commands.

## Acceptance Evidence

- exact shared manifest equality across `lnsatd`, `lnsatctl`, and `lnsat`;
- exact explicit-config fixture/parser equality and public-safe digest/layer
  evidence;
- malformed, duplicate-key, unknown-field, wrong-version, oversize,
  directory, symlink, non-loopback, port-zero, unpaired-runtime, unsafe-console,
  mixed-mode, secret-field, environment-discovery, and path-reflection negatives;
- source-only/package-closed/service-closed hard-stop assertions;
- `lnsatctl doctor` JSON and stable usage failures;
- real read-only recovery inspection with raw-path non-reflection;
- bash/zsh/fish completion and `lnsat`/`lnsatctl`/`lnsatd` man source;
- existing packet CLI/API/MCP equality plus exact Control Center projection;
- focused TypeScript typecheck/tests and Rust format/clippy/tests;
- repository-wide `npm run check` and `npm run public:check` before delivery.

## Remaining Phase 10 Gates

P10-A1 and P10-A2 do not complete Phase 10. Remaining bounded gates are:

1. **P10-A3 transport and output:** authenticated `status`/`health` transport
   plus stable text/JSONL/YAML output contracts without remote-default or
   ambient-target behavior;
2. **P10-A4 recovery, non-root, and parity:** offline backup, inert restore,
   protected owner recovery with non-argument secret intake, target-neutral
   non-root enforcement evidence, and full CLI/API/MCP/UI fixtures for every
   newly exposed command;
3. **P10-X1 exit freeze:** one exact Phase 10 conformance and compatibility
   freeze proving all required product surfaces while keeping target/package
   lifecycle proof in Phase 14.

Phase 11 remains closed until Phase 10 exit evidence passes. Required sequence
remains Phase 10 -> Phase 11 -> Phase 13 -> Phase 14; Phase 12 remains optional.

## Hard Stops

P10-A1/P10-A2 grant no served recovery mutation, production/user-repository
consequence, migration `0018`, key/provider work, package or supported-binary
claim, filesystem installation, service registration/start, tag, release,
publication, deployment, Phase 11+ implementation, or automatic promotion.
