# CLI and OS Operator Interface

- Status: accepted direction with security-corrected experimental P10-A1 source
  contract spine and P10-A2 explicit daemon configuration plus withdrawn P10-A3
  Unix health/status commands and stable output formats plus P10-A4 offline recovery,
  non-root enforcement, and parity evidence; P11-D2 adds optional closed
  Docker-local profile selection and redacted config readback only
- Availability: packet inspection, direct/explicit-config daemon arguments,
  target-neutral manifest, operator doctor/config/recovery inspection, withdrawn
  legacy health/status errors, offline backup, inert restore, protected owner recovery,
  completion, and man source exist; stable supported product CLI does not

Product split and extension boundary are accepted by
[ADR-0003](ADR-0003_OPEN_CORE_EXTENSIONS_AND_MANAGEMENT_PLANE.md).
The LNSAT/downstream ownership boundary is defined by
[ADR-0008](ADR-0008_LNSAT_KERNEL_AND_DOWNSTREAM_USERLAND_BOUNDARY.md).

## Decision

OS-level command-line interfaces are mandatory. Browser UI cannot be only
management surface. Operators, CI, configuration management, recovery
environments, headless servers, air-gapped systems, and wrappers need stable,
scriptable commands. Online commands use the same Gateway authority and evidence
as UI, MCP, and API. The specifically enumerated offline recovery and bootstrap
commands use the local safeguards defined below instead of a Gateway route.

## Product Binaries

The pending
[headless configuration and control gate](../PRODUCT_BUILD_SEQUENCE.md#headless-configuration-and-control)
requires `lnsatctl` to expose secure monitoring/control, machine-readable
output, headless automation, and complex declarative configuration without a
UI. Configuration layering/composition, validate/diff/effective/apply,
watch/status/health/operations/approvals/audit/recovery, and emergency control
are part of the LNSAT V1 CLI contract. The core computes effective authority;
for online commands, the CLI is a client and never bypasses Gateway. The bounded
offline exceptions do not create an agent, API, MCP, or UI authority path.

HCFG-0/HCFG-1 add exact `--product-surface-contract` selection to the three
manifest commands. Earlier `lnsatctl status` selector forms remain recognized
only to return the withdrawn Unix transport error. v2
adds only source diagnostics: `lnsatctl config schema --product-surface-contract
lnsat.product_surface.v2` and `lnsatctl config validate --config <absolute-path>
--product-surface-contract lnsat.product_surface.v2`. Validation may read the
selected config and a referenced runtime profile, but opens no database,
listener, process, or action authority. No range or fallback exists. This
negotiation seam does not complete headless configuration/control.

HCFG-2 adds `config show --config <absolute-path>` and
`config diff --config <baseline-absolute-path> --against <candidate-absolute-path>`,
each followed by `--product-surface-contract lnsat.product_surface.v2` and
optional final `--output <text|json|jsonl|yaml>`. Both use the existing loader.
`show` emits only fixed redacted setting summaries and whole-source evidence;
`diff` emits fixed changed-field names after comparing validated values in the
core. `--config` is the baseline and `--against` is the candidate. Exact-byte
change is distinct from normalized-setting change. Referenced profile evidence
is included; loads are sequential, not an atomic pair or live-state inspection.
No raw paths, addresses, console keys, profile identifiers, or source bytes are
returned. These diagnostics grant no activation, compute no effective authority,
and are not round-trippable exports. See the
[canonical HCFG-2 record](../PROJECT_STATUS.md#hcfg-2-redacted-explicit-configuration-comparison).

HCFG-3B adds v2-only `config effective --declaration <absolute-path>` and
`config export --declaration <absolute-path>`. They load the distinct
`lnsat.headless_config.declaration.v1` contract through a bounded regular-file
identity boundary and compose its complete narrowing layers in the core.
`effective` reports an unverified declared ceiling. `export` emits only a
deterministic redacted content commitment and counts under
`lnsat.headless_config.redacted_export.v1`; it is non-applicable,
non-reimportable, and contains no source references, identity digests, raw
bytes, paths, or secrets. Neither command loads active daemon configuration,
verifies identity or OS enforcement, grants action authority, or activates,
persists, or mutates anything.
The declaration loader currently accepts Linux and macOS only. Other targets
return `headless_config.platform_unsupported` until their stable file identity
and reparse-safe open boundary is proven.

| Binary     | Audience                           | Responsibility                                                                              |
| ---------- | ---------------------------------- | ------------------------------------------------------------------------------------------- |
| `lnsat`    | users, agents, scripts, developers | primary workflow command and convenience dispatcher                                         |
| `lnsatctl` | owners and operators               | administration, diagnostics, service, recovery, update, quarantine, and evidence operations |
| `lnsatd`   | optional reference host/sidecar    | local API host for consumers that need a service boundary                                   |

`lnsat` and `lnsatctl` are clients for online flows. They do not duplicate policy
or bypass Gateway. `lnsatctl` additionally implements only the bounded offline
procedures defined below. The LNSAT core owns validation, authentication, policy,
approval, authorization, receipt, storage, and audit boundaries; `lnsatd` hosts
that core when a local service is desired.

The complete declarative surface includes `config schema`, `config show`,
`config validate`, `config diff`, `config effective`, `config apply`, and
`config export`, with layering and composition resolved by the core. Monitoring
includes `watch`, `status`, `health`, and `operations`; operational controls
include approvals, audit, recovery, and emergency disablement. Machine-readable
JSON/JSONL output is required for automation. `watch` consumes server-sourced,
versioned events with cursor/resume, deterministic ordering, bounded retention,
backpressure, and explicit disconnect behavior; it never infers an outcome from
transport loss or a missing event. Secrets remain references and are redacted.
Mutations are authenticated, atomically applied, and fail closed on unknown
fields or unsupported OS capabilities. The current source truth remains limited
to the documented experimental commands; this is the V1 target contract.

## Core Command Taxonomy

Planned `lnsat` groups:

```text
lnsat context ...
lnsat request ...
lnsat packet validate|hash|inspect ...
lnsat policy explain|simulate ...
lnsat approval list|show|decide ...
lnsat execute ...
lnsat receipt ...
lnsat audit ...
lnsat agent ...
lnsat profile ...
lnsat instruction ...
lnsat skill ...
lnsat connector ...
lnsat graph ...
lnsat completion ...
```

Planned `lnsatctl` groups:

```text
lnsatctl config schema|show|validate|diff|effective|apply|export
lnsatctl watch|status|health|operations
lnsatctl approvals list|show|approve|deny
lnsatctl audit verify|export
lnsatctl recovery inspect|backup|restore
lnsatctl doctor
lnsatctl identity|role|session|revoke
lnsatctl policy|connector|module|model
lnsatctl service status|start|stop|restart
lnsatctl emergency-disable
```

Commands ship only when owning roadmap phase implements and tests authority.
Documentation of a name does not authorize implementation or runtime mutation.

Current P10-A1/P10-A2/P10-A3/P10-A4 implemented subset:

```text
lnsat packet validate|hash|inspect ...
lnsat manifest [--product-surface-contract <lnsat.product_surface.v1|lnsat.product_surface.v2>]|completion|man|--help|--version
lnsatctl doctor
lnsatctl config inspect --config <absolute-path>
lnsatctl config schema --product-surface-contract lnsat.product_surface.v2
lnsatctl config validate --config <absolute-path> --product-surface-contract lnsat.product_surface.v2
lnsatctl config show --config <absolute-path> --product-surface-contract lnsat.product_surface.v2
lnsatctl config diff --config <baseline-absolute-path> --against <candidate-absolute-path> --product-surface-contract lnsat.product_surface.v2
lnsatctl recovery inspect --database <path>
lnsatctl backup --database <path> --destination <fresh-path> [--output <text|json|jsonl|yaml>]
lnsatctl restore --backup <path> --destination <fresh-path> [--output <text|json|jsonl|yaml>]
lnsatctl recovery owner --database <path> --expected-owner <identity-ref> --recovered-at <timestamp> --new-password-stdin [--output <text|json|jsonl|yaml>]
lnsatctl manifest [--product-surface-contract <lnsat.product_surface.v1|lnsat.product_surface.v2>]|completion|man|--help|--version
lnsatd --config <absolute-path>
lnsatd --database ... | --manifest [--product-surface-contract <lnsat.product_surface.v1|lnsat.product_surface.v2>] | --help | --version
```

Exact v2 manifest output is
`fixtures/contracts/product-surface-v2.json`. `config schema` returns
`command: config.schema`, the embedded closed config schema, and
`activation_authority: false`; `config validate` returns
`command: config.validate`, its exact config digest, `valid: true`, and
`side_effects: []`. Missing, range, duplicate, v1, or unsupported selectors for
the v2 config commands fail with `lnsatctl.arguments.invalid`, exit `2`, and
empty stdout. Legacy health/status selector forms return
`lnsatctl.unix_transport.withdrawn`, exit `2`, before protected stdin, Unix
connection, or request bytes.

All other listed groups remain reserved and unavailable. Recovery inspection
is read-only. Backup creates one non-root offline snapshot. Restore creates one
fresh inert database without replacing or activating existing state. Owner
recovery accepts its replacement password only from protected stdin, appends
credential/audit evidence, and revokes every owner session. None reflects raw
paths or secret material. No repair, migration, quarantine, served recovery,
or activation authority exists.

The accepted [local authentication availability and UDS withdrawal](SECURITY_LOCAL_AUTH_AVAILABILITY_AND_UDS_WITHDRAWAL.md)
withdraws P10-A3 Unix health/status before the first supported release. Legacy
command forms remain parse-compatible only to return
`lnsatctl.unix_transport.withdrawn`, exit `2`, before protected stdin, Unix
connection, or request bytes. They never send a bearer or browser proof over
Unix transport. A future CLI transport requires separately accepted mutual
live-daemon authentication; same-UID path and peer-UID checks are insufficient.
The browser/API numeric-loopback header-pair flow remains unchanged.

P10-A4 recovery commands accept no default store or destination. Backup and
owner recovery acquire the daemon-shared exclusive database lease. Owner
recovery validates current schema and expected owner before reading password
stdin. Password input is one bounded UTF-8 value, rejects embedded line breaks
and NUL, and is zeroized after use. Daemon bind and offline recovery mutations
refuse effective UID zero on macOS/Linux. API exposes no recovery route, MCP
registers no recovery tool, and Control Center renders no recovery action.

## Command Safety Contract

Online state-changing commands follow:

```text
parse -> resolve exact target -> validate -> show plan/diff
      -> Gateway policy -> approval when required
      -> one-time authorization -> execute
      -> receipt -> audit reference
```

Offline backup, inert restore, owner recovery, and initial bootstrap are local
exceptions to that Gateway flow. They have no agent, API, MCP, or UI route and
must retain their command-specific host-owner proof, non-root execution, exact
targets, daemon-shared exclusive lease where applicable, one-time semantics,
and durable evidence.

Requirements:

- dry-run and explain before consequential mutation;
- exact scope, environment, target, artifact/config digest, and idempotency;
- explicit non-interactive flag for automation;
- confirmation is usability protection, not authorization;
- approval cannot be supplied as a command-line boolean;
- no implicit target, environment, profile, or “current production” guess;
- no direct connector/provider mode that bypasses Gateway;
- timeout, cancellation, partial-failure, retry, and receipt behavior defined;
- public-safe errors with stable codes and no secret reflection.

CLI timeout, disconnect, or cancellation cannot prove execution or
non-execution. Any future consequential command must preserve durable operation
identity, authorization expiry, idempotency, attempt count, and reconciliation
state. CLI may request retry only after Gateway proves retry eligibility; it
cannot infer safety from transport failure. Read-only packet inspection must
stay result-equivalent to direct Gateway, REST, and MCP fixtures.

## Local OS Transport

Current source transport path:

- macOS/Linux legacy CLI health/status: withdrawn before stdin, Unix connection,
  or request bytes; no bearer or browser proof is sent;
- macOS/Linux browser/API Gateway: numeric-loopback HTTP remains compatible with
  its existing header-pair authentication;
- Windows later lane: named pipe or loopback transport after threat model and
  compatibility evidence;
- remote administration: disabled by default; later authenticated TLS/mTLS
  endpoint with explicit bind, identity, network, and policy configuration.

Socket or loopback possession is not action authority. Client still
authenticates; Gateway applies role/capability policy and records evidence.

## Privilege and Service Separation

- `lnsatd` bind refuses effective UID zero on macOS/Linux.
- Installer may place files and service metadata but never starts service
  automatically.
- `systemd`, launchd, and Homebrew service management require explicit operator
  action.
- CLI does not silently invoke `sudo`.
- Privileged helper, if ever required, is separate, minimal, capability-bound,
  deny-by-default, and covered by dedicated threat model.
- Recovery runs through explicit offline or service-stopped workflow with exact
  store, owner, and lease proof.
- Offline backup and owner recovery prove quiescence with an exclusive database
  lease. Inert restore requires a fresh destination and never starts a daemon.

## Configuration, Data, and Logs

Paths are compatibility contracts, not hidden implementation choices:

| Environment         | Config                                                  | Data                                    | Logs                                      |
| ------------------- | ------------------------------------------------------- | --------------------------------------- | ----------------------------------------- |
| Linux package       | `/etc/lnsat`                                            | `/var/lib/lnsat`                        | journald or documented package path       |
| macOS/Homebrew      | Homebrew-prefix or user config path declared by formula | declared non-root state path            | unified logging or declared path          |
| direct user install | XDG-compatible or explicit `--config`                   | XDG-compatible or explicit `--data-dir` | stderr/structured file by explicit choice |
| OCI                 | read-only config injection                              | explicit persistent volume              | stdout/stderr structured events           |

Final paths require Phase 14 compatibility rows. Current `lnsatctl doctor`
reports system/user paths as unselected and never reflects raw configured paths.

Current P10-A2 source deliberately selects none of the system/user paths above.
`lnsatd --config` accepts only one operator-supplied absolute path to a regular,
non-symlinked UTF-8 JSON file no larger than 64 KiB. Contract
`lnsat.daemon.config.v1` is schema-closed and rejects duplicate keys, unknown
fields, wrong versions, secret fields, non-loopback listeners, unpaired Phase 8
runtime paths, non-null control-socket paths, unsafe console manifests, and
mixed direct/config input. `control_socket_path` remains a recognized schema
property only when absent or `null`; a non-null value returns
`lnsatd.control_socket.withdrawn` before a listener is bound.
`lnsatctl config inspect` returns only exact-byte SHA-256 and applied-layer
evidence; configured and rejected paths/bytes are never reflected.

P11-D2 adds optional `runtime_profile` with exact `docker_local` family and one
absolute profile path. It requires paired Phase 8 disposable Git paths and
loads the selected profile through the P11-D1 file/schema/isolation/digest
boundary. Config inspection may open that profile file and returns only its
contract/profile identities, profile digest, authority-configuration digest,
and applied-layer/file-opened evidence. It reflects no profile path, source
bytes, image or adapter-executable digest, container path, or runtime argument.
No Docker endpoint, socket, process, mount, route, dispatch, or receipt opens.

Configuration precedence must be visible:

```text
compiled safe defaults < system config < user config < explicit config file
```

Current P10-A2 source reads no environment variables for authority, secrets,
configuration, target, or path discovery. Future approved profiles may define
safe reference selection. Secrets use file descriptor, protected stdin, OS
credential broker, or secret-store reference—not process arguments, shell
history, config export, or diagnostic output.

## Output and Automation

Human output is concise. Automation has versioned closed schemas:

- `--output text|json|jsonl|yaml`;
- stable exit-code families;
- stdout for requested result, stderr for diagnostics;
- `--quiet` and `--no-color`;
- input from closed JSON/YAML file or stdin;
- deterministic `diff`, `plan`, `verify`, and `audit` output;
- correlation, packet, approval, authorization, receipt, and audit identifiers;
- pagination, timeout, and cancellation controls;
- compatibility negotiation and actionable upgrade errors.

P10-A4 implements `text`, `json`, `jsonl`, and `yaml` for `doctor`, config and
recovery inspection, backup, restore, and owner recovery. Legacy health/status
withdrawal uses its stable JSON error before output parsing or secret input.
JSON remains default and preserves existing doctor/config/recovery semantics.
JSONL emits one compact object line for these single-result commands. YAML is
one deterministic plain document without tags, anchors, aliases, or multiple
documents. `--output` appears at most once in documented final position.
Manifest remains canonical JSON only. Success uses stdout; formatted
public-safe failures use stderr. Read-only transport failure never maps to
outcome-unknown. Recovery output identifies exact side-effect classes but
never includes raw paths, password material, or password-derived values.

Shell completion for bash, zsh, and fish plus generated man pages are Phase 10
deliverables. Commands should remain wrapper-friendly so third parties can
build interfaces without parsing human text.

## Extension Commands

Modules and connectors may add namespaced commands through signed manifests and
versioned client/Gateway APIs. They do not inject native code into `lnsat` or
`lnsatd`, shadow core commands, alter exit-code meaning, or receive ambient
credentials.

Examples:

```text
lnsat connector <provider> ...
lnsat module <publisher>/<name> ...
```

Extension install, enable, capability grant, and execution remain distinct.

## Acceptance Evidence

Phase 10 and Phase 14 require:

- command help, version, compatibility, and schema tests;
- UI/API/MCP/CLI transport-neutral decision/evidence fixtures;
- negative tests for bypass, replay, substitution, wrong environment, secret
  echo, and ambiguous target;
- non-root, socket/path ownership, and service-manager tests;
- shell completion and man-page generation tests;
- install, explicit start, upgrade, rollback, uninstall, purge, and recovery
  behavior;
- macOS ARM64/x86_64 and Linux x86_64/aarch64 compatibility rows;
- later Windows PowerShell/cmd/terminal and named-pipe rows before support.
