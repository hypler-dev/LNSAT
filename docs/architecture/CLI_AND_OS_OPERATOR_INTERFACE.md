# CLI and OS Operator Interface

- Status: accepted direction with experimental P10-A1 source contract spine
- Availability: packet inspection, source-only daemon arguments, target-neutral
  manifest, operator doctor/read-only recovery inspection, completion, and man
  source exist; stable supported product CLI does not

Product split and extension boundary are accepted by
[ADR-0003](ADR-0003_OPEN_CORE_EXTENSIONS_AND_MANAGEMENT_PLANE.md).

## Decision

OS-level command-line interfaces are mandatory. Browser UI cannot be only
management surface. Operators, CI, configuration management, recovery
environments, headless servers, air-gapped systems, and wrappers need stable,
scriptable commands with same Gateway authority and evidence as UI, MCP, and
API.

## Product Binaries

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

Current P10-A1 implemented subset:

```text
lnsat packet validate|hash|inspect ...
lnsat manifest|completion|man|--help|--version
lnsatctl doctor
lnsatctl recovery inspect --database <path>
lnsatctl manifest|completion|man|--help|--version
lnsatd --database ... | --manifest | --help | --version
```

All other listed groups remain reserved and unavailable. Current recovery
inspection is read-only, reflects no raw path, and grants no repair, migration,
quarantine, credential, or activation authority.

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

- macOS/Linux: owner-controlled Unix domain socket where packaging and runtime
  support it, with loopback HTTP as explicit compatible local transport;
- Windows later lane: named pipe or loopback transport after threat model and
  compatibility evidence;
- remote administration: disabled by default; later authenticated TLS/mTLS
  endpoint with explicit bind, identity, network, and policy configuration.

Socket or loopback possession is not action authority. Client still
authenticates; Gateway applies role/capability policy and records evidence.

## Privilege and Service Separation

- `lnsatd` runs as non-root.
- Installer may place files and service metadata but never starts service
  automatically.
- `systemd`, launchd, and Homebrew service management require explicit operator
  action.
- CLI does not silently invoke `sudo`.
- Privileged helper, if ever required, is separate, minimal, capability-bound,
  deny-by-default, and covered by dedicated threat model.
- Recovery runs through explicit offline or service-stopped workflow with exact
  store, owner, and lease proof.

## Configuration, Data, and Logs

Paths are compatibility contracts, not hidden implementation choices:

| Environment         | Config                                                  | Data                                    | Logs                                      |
| ------------------- | ------------------------------------------------------- | --------------------------------------- | ----------------------------------------- |
| Linux package       | `/etc/lnsat`                                            | `/var/lib/lnsat`                        | journald or documented package path       |
| macOS/Homebrew      | Homebrew-prefix or user config path declared by formula | declared non-root state path            | unified logging or declared path          |
| direct user install | XDG-compatible or explicit `--config`                   | XDG-compatible or explicit `--data-dir` | stderr/structured file by explicit choice |
| OCI                 | read-only config injection                              | explicit persistent volume              | stdout/stderr structured events           |

Final paths require Phase 14 compatibility rows. CLI exposes resolved paths with
`lnsatctl doctor` and never writes outside declared scope.

Configuration precedence must be visible:

```text
compiled safe defaults < system config < user config < explicit config file
```

Environment variables and command arguments may select references and safe
options. Secrets use file descriptor, protected stdin, OS credential broker, or
secret-store reference—not process arguments, shell history, config export, or
diagnostic output.

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
