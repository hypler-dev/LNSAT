# CLI and OS Operator Interface

- Status: accepted direction with experimental P10-A1 source contract spine and
  P10-A2 explicit daemon configuration plus P10-A3 authenticated local
  health/status and stable output formats plus P10-A4 offline recovery,
  non-root enforcement, and parity evidence; P11-D2 adds optional closed
  Docker-local profile selection and redacted config readback only
- Availability: packet inspection, direct/explicit-config daemon arguments,
  target-neutral manifest, operator doctor/health/status/config/recovery
  inspection, offline backup, inert restore, protected owner recovery,
  completion, and man source exist; stable supported product CLI does not

Product split and extension boundary are accepted by
[ADR-0003](ADR-0003_OPEN_CORE_EXTENSIONS_AND_MANAGEMENT_PLANE.md).

## Decision

OS-level command-line interfaces are mandatory. Browser UI cannot be only
management surface. Operators, CI, configuration management, recovery
environments, headless servers, air-gapped systems, and wrappers need stable,
scriptable commands with same Gateway authority and evidence as UI, MCP, and
API.

## Product Binaries

The pending
[standalone setup and access-management gate](../PRODUCT_BUILD_SEQUENCE.md#standalone-setup-and-access-management)
also requires headless/operator parity: CLI and wizard must expose the same
effective resource/agent-authority boundaries, preset differences, unsupported
OS controls, and protected change semantics. Neither client may widen authority
through configuration precedence or bypass Gateway. This is planned product work,
not an expansion of the implemented commands listed above.

| Binary     | Audience                           | Responsibility                                                                              |
| ---------- | ---------------------------------- | ------------------------------------------------------------------------------------------- |
| `lnsat`    | users, agents, scripts, developers | primary workflow command and convenience dispatcher                                         |
| `lnsatctl` | owners and operators               | administration, diagnostics, service, recovery, update, quarantine, and evidence operations |
| `lnsatd`   | OS/service manager                 | local server daemon and bundled Control Center                                              |

`lnsat` and `lnsatctl` are clients. They do not duplicate policy or bypass
Gateway. `lnsatd` owns validation, local authentication, policy, approval,
authorization, receipt, storage, and audit boundaries.

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
lnsatctl status|health|doctor
lnsatctl identity|role|session|revoke
lnsatctl policy|connector|module|model
lnsatctl service install|status|start|stop|restart
lnsatctl backup|restore|recovery
lnsatctl update check|verify|apply|rollback
lnsatctl audit verify|export
lnsatctl emergency-disable
```

Commands ship only when owning roadmap phase implements and tests authority.
Documentation of a name does not authorize implementation or runtime mutation.

Current P10-A1/P10-A2/P10-A3/P10-A4 implemented subset:

```text
lnsat packet validate|hash|inspect ...
lnsat manifest|completion|man|--help|--version
lnsatctl doctor
lnsatctl health --socket <absolute-path> --session-token-stdin [--output <text|json|jsonl|yaml>]
lnsatctl status --socket <absolute-path> --session-token-stdin [--output <text|json|jsonl|yaml>]
lnsatctl config inspect --config <absolute-path>
lnsatctl recovery inspect --database <path>
lnsatctl backup --database <path> --destination <fresh-path> [--output <text|json|jsonl|yaml>]
lnsatctl restore --backup <path> --destination <fresh-path> [--output <text|json|jsonl|yaml>]
lnsatctl recovery owner --database <path> --expected-owner <identity-ref> --recovered-at <timestamp> --new-password-stdin [--output <text|json|jsonl|yaml>]
lnsatctl manifest|completion|man|--help|--version
lnsatd --config <absolute-path>
lnsatd --database ... | --manifest | --help | --version
```

All other listed groups remain reserved and unavailable. Recovery inspection
is read-only. Backup creates one non-root offline snapshot. Restore creates one
fresh inert database without replacing or activating existing state. Owner
recovery accepts its replacement password only from protected stdin, appends
credential/audit evidence, and revokes every owner session. None reflects raw
paths or secret material. No repair, migration, quarantine, served recovery,
or activation authority exists.

P10-A3 health/status accept no default target. macOS/Linux accept one explicit
absolute, bounded, normalized UTF-8 Unix-socket path. One opaque session token
is read only from stdin and zeroized after request construction. Client proves
private parent mode `0700`, non-symlink socket type, socket mode `0600`, owner,
stable device/inode identity, and connected peer effective UID before bearer
transmission. Daemon verifies accepted client effective UID before request read.
TCP bearer, hostname, DNS, TLS, userinfo, query, fragment, proxy environment,
redirect, retry, discovery, secret argument/file/URL, and remote transport
behavior are absent. Invalid arguments, path syntax, and stdin fail before
connect. Unsafe path or server identity fails before request bytes are written.

P10-A4 recovery commands accept no default store or destination. Backup and
owner recovery acquire the daemon-shared exclusive database lease. Owner
recovery validates current schema and expected owner before reading password
stdin. Password input is one bounded UTF-8 value, rejects embedded line breaks
and NUL, and is zeroized after use. Daemon bind and offline recovery mutations
refuse effective UID zero on macOS/Linux. API exposes no recovery route, MCP
registers no recovery tool, and Control Center renders no recovery action.

## Command Safety Contract

State-changing commands follow:

```text
parse -> resolve exact target -> validate -> show plan/diff
      -> Gateway policy -> approval when required
      -> one-time authorization -> execute
      -> receipt -> audit reference
```

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

Default v1 client/server path:

- macOS/Linux authenticated CLI reads: owner-controlled Unix domain socket with
  strict path and peer-credential proof before bearer transmission;
- macOS/Linux browser/API Gateway: numeric-loopback HTTP remains compatible,
  but `lnsatctl` never sends its bearer through that lane;
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
runtime paths, invalid control-socket paths, unsafe console manifests, and mixed
direct/config input. Optional `control_socket_path` enables authenticated CLI
reads; inspection validates syntax only and opens no listener.
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

P10-A3/P10-A4 implement `text`, `json`, `jsonl`, and `yaml` for `doctor`, config
and recovery inspection, health, status, backup, restore, and owner recovery.
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
