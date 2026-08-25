# Phase 10 Product-Surface Contract Spine

- Status: experimental source implementation; Phase 10 source conformance complete
- Gates: `P10_A1_PRODUCT_SURFACE_CONTRACT_SPINE`,
  `P10_A2_EXPLICIT_CONFIGURATION`, `P10_A3_STATUS_HEALTH_OUTPUT`,
  `P10_A4_RECOVERY_NON_ROOT_PARITY`, `P10_X1_PRODUCT_SURFACE_CONFORMANCE`
- Runtime effect: explicit configuration loading, authenticated read-only local
  health/status, operator configuration/recovery inspection, and explicit
  offline local backup, inert restore, and owner-password recovery
- Mutation effect: local backup or fresh inert restore file creation; offline
  owner credential/audit evidence append and all-owner-session revocation
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

P10-A3 adds exact authenticated `GET|HEAD /v1/health` and
`GET|HEAD /v1/status` routes while preserving unauthenticated `GET /healthz`
bytes. Authenticated `lnsatctl` reads use one explicit owner-controlled Unix
socket on macOS/Linux. Client proves private parent, socket type/mode/owner,
stable device/inode identity, and peer effective UID before transmitting bearer
material; daemon applies the equal-UID check to accepted clients. Numeric
loopback HTTP remains the browser/API Gateway transport but is not a CLI bearer
transport. One shared deterministic `text|json|jsonl|yaml` renderer covers
`doctor`, config and recovery inspection, health, and status. JSON remains
default; manifest remains canonical JSON only.

P10-A4 adds three explicit non-root offline commands:
`lnsatctl backup --database <path> --destination <fresh-path>`,
`lnsatctl restore --backup <path> --destination <fresh-path>`, and
`lnsatctl recovery owner --database <path> --expected-owner <identity-ref>
--recovered-at <timestamp> --new-password-stdin`. Backup and owner recovery
prove daemon quiescence through the shared exclusive database lease. Restore
creates only a fresh inert database and never activates or replaces a live
store. Owner recovery preflights database, lease, schema, and expected owner
before reading one bounded UTF-8 password from protected stdin; it appends
credential and audit evidence and revokes every owner session atomically. Root
is refused for daemon bind and all offline recovery mutations on macOS/Linux.
API, MCP, and Control Center expose only unavailable posture evidence: no route,
tool, or rendered action exists.

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

P10-A3 fixtures are `phase10-health-v1.json`, `phase10-status-v1.json`, and
`phase10-output-v1.json`. They contain no session, identity, path, host, or
operator data.

P10-A4 parity fixture is `phase10-recovery-parity-v1.json`. It fixes CLI-only
availability, API/MCP/UI unavailability, exact mutation evidence, protected
stdin, non-root refusal, no-clobber restore, and closed activation/served lanes.

## Current Source Truth

| Surface          | Implemented source                                                                                                                                                                                                                          | Later separately owned work                                                                         |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `lnsatd`         | direct/config arguments, non-root macOS/Linux bind enforcement, loopback Gateway bind, optional authenticated Unix control socket, preserved `/healthz`, read-only `/v1/health` and `/v1/status`, public-safe errors, help/version/manifest | selected user/system paths and target lifecycle proof in Phase 14                                   |
| `lnsatctl`       | `doctor`, server-authenticated Unix-socket `health`/`status`, config/recovery inspection, offline backup, inert restore, offline owner recovery, text/JSON/JSONL/YAML, manifest, completion, man, help, version                             | service/update/audit commands only after their owning authority gates                               |
| `lnsat`          | TypeScript dispatcher in `packages/cli/src/index.ts`; packet validate/hash/inspect plus manifest, completion, man, help, and version                                                                                                        | later Gateway-client workflow groups only when owning phases open them                              |
| command taxonomy | canonical implemented and reserved groups in Phase 10 manifest                                                                                                                                                                              | each reserved command needs its owning phase, exact authority, and conformance before exposure      |
| configuration    | bounded explicit UTF-8 JSON, recursive duplicate/unknown-key rejection, exact-byte digest, visible applied layers, no environment discovery                                                                                                 | system/user path selection remains deliberately unimplemented                                       |
| diagnostics      | `lnsat.cli.output.v1`, deterministic text/JSON/JSONL/YAML, stdout/stderr separation, stable exit families                                                                                                                                   | later command schemas require their own compatibility gates                                         |
| recovery         | exact read-only classification, non-root offline backup, fresh inert restore, and protected-stdin owner recovery with credential/audit append plus all-owner-session revocation; no path or secret reflection                               | activation and served recovery remain closed                                                        |
| service managers | metadata-only boundary; install/start/auto-start/sudo/helper all false                                                                                                                                                                      | target-specific metadata and lifecycle proof remain Phase 14                                        |
| completion/man   | bash, zsh, fish and three source man pages generated to stdout                                                                                                                                                                              | installation and target integration remain Phase 14                                                 |
| version/build    | source version plus unbound target-neutral manifest                                                                                                                                                                                         | source revision, target, recipe, digests, SBOM, provenance, and artifact binding remain Phase 13/14 |
| non-root         | daemon bind plus offline recovery entry points refuse effective UID zero on macOS/Linux; no sudo or privileged helper                                                                                                                       | target-specific service/package lifecycle proof remains Phase 14                                    |
| parity           | CLI/API/MCP packet-inspection equality retained; recovery fixture proves CLI-only mutation with API/MCP/UI unavailable; Control Center recovery projection renders no actions                                                               | later owned commands require their own parity rows                                                  |

## Source Ownership

- `fixtures/contracts/phase10-product-surface-v1.json` owns canonical manifest.
- `fixtures/contracts/phase10-product-surface-conformance-v1.json` and
  `scripts/check-phase10-product-surface-conformance.mjs` own P10-X1 exit
  evidence and fail-closed validation.
- `fixtures/contracts/phase10-daemon-config-v1.json` owns canonical explicit
  configuration fixture.
- `crates/lnsatd/src/product_config.rs` owns bounded file loading, recursive
  duplicate-key rejection, closed-schema parsing, explicit seam mapping, and
  exact-byte SHA-256 evidence.
- `crates/lnsatd/src/product_surface.rs` owns Rust exit families, manifest,
  doctor/config/recovery plus authenticated health/status projection, generated
  completion, and man source.
- `crates/lnsatd/src/product_output.rs` owns closed deterministic output
  rendering.
- `crates/lnsatd/src/local_unix_socket.rs` owns bounded connect, private
  path/metadata identity, exact socket cleanup, and macOS/Linux peer-credential
  checks through the pinned safe `nix` wrapper.
- `crates/lnsatd/src/product_transport.rs` owns explicit socket-path parsing,
  stdin-token intake, bounded HTTP framing, response validation, and read-only
  exit mapping.
- `crates/lnsatd/src/product_recovery.rs` owns non-root checks, offline lease
  preflight, backup/restore orchestration, protected password input, and
  secret-free recovery result evidence.
- `crates/lnsatd/src/bin/lnsatctl.rs` owns current operator entry point.
- `crates/lnsatd/src/lib.rs` and `crates/lnsatd/src/main.rs` own daemon manifest
  dispatch without storage or listener use.
- `packages/cli/src/product-surface.ts` owns current `lnsat` product dispatch.
- `apps/console/src/lib/packet-inspection-evidence.ts` owns read-only UI parity
  projection.
- `fixtures/contracts/phase10-recovery-parity-v1.json` plus the
  `offline-recovery-parity` Gateway, API, MCP, and Control Center modules own
  exact cross-surface unavailability evidence.

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

No exit code alone proves execution or non-execution. Offline recovery results
carry explicit side-effect evidence and require post-operation readback where
applicable. Served consequential commands remain unavailable in this packet.

## Security Properties

- `lnsat` and `lnsatctl` do not receive direct infrastructure authority.
- Health/status require one explicit absolute Unix-socket path and an opaque
  session token supplied only through stdin. No default socket, TCP bearer
  transport, hostname, DNS, proxy environment, redirect, retry, discovery,
  remote target, TLS, URL secret, file secret, or secret process argument exists.
- Client validates parent mode `0700`, socket mode `0600`, owner effective UID,
  non-symlink socket type, stable device/inode/owner/mode, and connected peer
  effective UID before request construction or bearer transmission. Daemon
  rejects unequal peer UID before request bytes are read.
- Health/status use exact Unix-framing Host `lnsatd`, contract version,
  same-origin fetch metadata, existing session cookie, active-session
  verification, and `ReadEvidence`. GET and HEAD require equal auth; HEAD emits
  no body.
- Owner, operator, and auditor may read. Missing, malformed, expired, revoked,
  unreadable, or unauthorized evidence maps to one generic denial. Only
  `session_activity_evidence_may_append` may change during authentication.
- Operator commands use no ambient environment for target or secret selection.
- No secret is accepted in process arguments or reflected in diagnostics.
- Explicit configuration accepts no secret fields, reads no environment
  variables, and never reflects rejected paths or bytes.
- Configuration may select only an absolute database path, numeric-loopback
  listen address, optional absolute control-socket path, paired Phase 8
  disposable Git root/executable, and an exact existing console-root manifest
  seam. Filesystem identity checks occur only at daemon bind, never inspection.
- `lnsatctl config inspect` opens no database or listener and emits only public
  contract identity, exact-byte digest, applied layers, safe booleans, and
  empty effects.
- Recovery inspection opens one explicit database read-only and returns no raw
  path, migration, repair, quarantine, credential, or activation action.
- Daemon bind and every offline recovery mutation refuse effective UID zero on
  macOS/Linux. No `sudo`, privileged helper, or privilege transition exists.
- Offline backup and owner recovery acquire the daemon-shared exclusive
  database lease before mutation. Owner recovery completes database, schema,
  and expected-owner preflight before reading password stdin.
- Owner password is accepted only as one bounded UTF-8 protected-stdin value,
  zeroized after use, and never accepted through an argument, environment,
  configuration, file reference, or output field.
- Backup emits digest, byte length, and schema evidence without raw path
  reflection. Restore writes one fresh inert destination, never overwrites an
  existing file, starts no daemon, and grants no activation authority.
- API has no recovery route, MCP has no recovery tool, and Control Center has
  no recovery action. Their parity modules expose unavailable posture only.
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
- Earlier experimental `--endpoint <numeric-loopback-http-url>` health/status
  syntax is intentionally rejected before stdin or connect. Sending a bearer to
  an unauthenticated loopback listener violated the socket-spoofing threat model.
- Existing default JSON for doctor/config/recovery remains compatible. New
  backup, restore, and owner-recovery commands occupy previously invalid
  argument shapes and use the same versioned output envelope.
  `--output` is accepted only once in documented final position. Read-only
  transport failure maps to unavailable/temporary failure, never
  outcome-unknown.
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
- exact health/status GET/HEAD, all fixed local roles, generic auth denial,
  preserved `/healthz`, secret-free fixtures, authenticated Unix client
  transport, path/mode/owner/inode/peer negatives, old-TCP-syntax and
  input-before-connect refusal, exact cleanup, response caps, and timeout/exit
  mapping;
- exact text/JSON/JSONL/YAML golden bytes plus existing default JSON
  compatibility and formatted failures;
- real read-only recovery inspection with raw-path non-reflection;
- end-to-end offline backup and fresh inert restore with equal content digest,
  no overwrite, no activation, and no raw-path reflection;
- owner recovery with preflight-before-stdin, old-password rejection,
  new-password authentication, all-owner-session revocation, credential/audit
  evidence, forbidden secret-argument rejection, and no secret reflection;
- effective-UID-zero refusal for daemon and offline mutation entry points;
- exact recovery parity proving CLI implementation and absent API route, MCP
  tool, and Control Center action;
- bash/zsh/fish completion and `lnsat`/`lnsatctl`/`lnsatd` man source;
- existing packet CLI/API/MCP equality plus exact Control Center projection;
- focused TypeScript typecheck/tests and Rust format/clippy/tests;
- repository-wide `npm run check` and `npm run public:check` before delivery.

## Phase 10 Exit

P10-X1 completes target-neutral Phase 10 source conformance. Its closed ledger
proves all required product surfaces and compatibility negatives while keeping
target/package lifecycle proof in Phase 14. See the
[Phase 10 product-surface conformance freeze](PHASE_10_PRODUCT_SURFACE_CONFORMANCE_FREEZE.md).

Phase 11 remains closed and requires separate authorization. Required sequence
remains Phase 10 -> Phase 11 -> Phase 13 -> Phase 14; Phase 12 remains optional.

## Hard Stops

P10-A1/P10-A2/P10-A3/P10-A4/P10-X1 grant no served recovery mutation, recovery
activation, production/user-repository consequence, schema change, migration
`0018`, key/provider work, package or supported-binary claim, filesystem
installation, service registration/start, tag, release, publication,
deployment, Phase 11+ implementation, or automatic promotion.
