# `lnsatd`

Source-only loopback daemon foundation for one local LNSAT deployment.

Current behavior:

- requires an explicit file-backed SQLite path;
- accepts either existing direct daemon arguments or one
  `--config <absolute-path>` using closed `lnsat.daemon.config.v1`;
- bounds explicit configuration to one regular, non-symlinked UTF-8 JSON file
  of at most 64 KiB, rejects recursive duplicate/unknown keys, and reads no
  environment configuration or secret fields;
- exposes the target-neutral Phase 10 source manifest with `--manifest` without
  opening storage or a listener;
- acquires and holds an owner-only exclusive database-sidecar lease before
  opening SQLite, blocking offline owner recovery while live;
- opens, migrates, and verifies `lnsat-store` before binding;
- binds `127.0.0.1:7447` by default;
- accepts only numeric loopback addresses and rejects port zero;
- serves at most eight bounded requests concurrently;
- exposes readiness at `GET /healthz`;
- preserves unauthenticated `GET /healthz` bytes and adds authenticated,
  read-only `GET|HEAD /v1/health` and `GET|HEAD /v1/status` for active
  owner/operator/auditor sessions with `ReadEvidence`; both use exact Host,
  contract-version, same-origin fetch metadata, and existing session-cookie
  transport, expose no identity or target data, grant no mutation authority,
  and declare only `session_activity_evidence_may_append`;
- exposes static loopback `GET|HEAD /v1` contract negotiation requiring one
  exact `LNSAT-Contract-Version: lnsat.contracts.v1_0` header, with no
  downgrade, storage access, side effect, or authority;
- requires that same exact header on every `/v1/` subroute after loopback/Host
  validation but before route, authentication, policy, store, or mutation work,
  and repeats the accepted version on every routed response;
- serves same-origin `POST /v1/session` through a closed JSON schema, exact
  custom intent header, process-wide rate limit, Argon2id verification, and
  two host-only strict same-site cookies under stable
  `lnsat.gateway.session_issue.v1_0`, with explicit non-idempotent replay and
  limiter/session/cookie side-effect semantics;
- serves authenticated same-origin `GET|HEAD /v1/session` using active SQLite
  session proof under stable `lnsat.gateway.session_read.v1_0`, returns one
  generic public denial, declares that bounded activity evidence may append,
  and keeps output secret-free;
- serves authenticated same-origin `PATCH /v1/session` as exact zero-length
  JSON mutation transport, atomically revokes the current bearer/CSRF pair,
  preserves absolute expiry, and returns fresh host-only cookies once under
  stable `lnsat.gateway.session_rotation.v1_0`, with one generic denial and
  explicit activity/revocation/replacement/rotation/event/cookie effects;
- serves authenticated same-origin `DELETE /v1/session` as exact zero-length
  JSON mutation transport, atomically revokes every active same-identity
  session, clears both host-only cookies, and forces reauthentication once
  under stable `lnsat.gateway.session_family_sign_out.v1_0`, with one generic
  denial and explicit activity/revocation/event/cookie effects;
- serves authenticated same-origin `PATCH /v1/identity/password` through a
  closed JSON body and per-session rate limit, reverifies the latest password,
  appends a new credential generation, revokes every same-identity session,
  clears both cookies, and requires login with the new password under stable
  `lnsat.gateway.identity_password_rotation.v1_0`, with exact limiter,
  activity, credential, identity-event, revocation, session-event, and cookie
  side-effect disclosure;
- serves owner-only same-origin `POST /v1/identities` through a closed JSON
  body, creates one immutable operator or auditor credential, and returns only
  secret-free identity/credential/authorization evidence under stable
  `lnsat.gateway.identity_creation.v1_0`, with create-once identity scope, one
  generic denial, and exact limiter/activity/identity/credential/event effects;
- serves owner-only same-origin `DELETE /v1/identities/{identity_ref}` with
  exact empty framing, permanently disables one non-owner identity, atomically
  revokes its active sessions, and returns secret-free evidence;
- serves authenticated same-origin
  `GET|HEAD /v1/identities/{identity_ref}/events` under stable
  `lnsat.gateway.identity_event_read.v1_0`, using one exact route-only target,
  existing owner/operator/auditor `ReadEvidence` permission, stable sequence
  order, nullable bootstrap/recovery actors, one generic identity-existence
  denial, and exact bodyless `HEAD`; authentication activity is disclosed and
  all identity/session/execution mutation authority remains false;
- serves authenticated same-origin
  `GET|HEAD /v1/sessions/{session_id}/events` under stable
  `lnsat.gateway.session_event_read.v1_0`, using exact lowercase session-id
  grammar, existing owner/operator/auditor `ReadEvidence` permission, stable
  sequence order, one generic session-existence denial, and bodyless `HEAD`;
  authentication activity is disclosed and all packet/action/execution
  mutation authority remains false;
- serves authenticated same-origin `POST /v1/approval-requests` through a
  closed project/policy schema, requires an active owner/operator requester,
  binds the exact persisted policy actor and local session, supplies
  server-owned time, and stores pending evidence under stable
  `lnsat.gateway.approval_request.v1_0`; created/replayed responses declare
  exact outer limiter/activity/append effects while nested domain effects stay
  empty and approval/signing/execution authority stays false;
- serves authenticated same-origin
  `POST /v1/approval-requests/{approval_request_id}/decision` through a closed
  scope/outcome/reason schema, derives the approver from an active owner or
  operator session, enforces distinct-human review, and records/replays one
  immutable terminal decision under stable
  `lnsat.gateway.approval_decision.v1_0`; conditional outer effects remain
  separate from side-effect-free domain evidence and execution stays false;
- caps JSON bodies at 4 KiB, refuses duplicate fields/headers and body framing
  drift, and zeroizes transient request/password/cookie response buffers;
- denies `OPTIONS`, emits no CORS allow headers, and exposes no packet/action
  writer;
- fails excess connections fast with public-safe `503` capacity evidence;
- exposes an in-process idempotent shutdown handle that wakes blocked accept,
  stops new work, drains bounded workers, and supports clean database restart;
- installs one non-overwriting process handler for SIGINT, SIGTERM, and SIGHUP
  on Unix and Ctrl-C/Break on Windows, delegating to that same shutdown path;
- isolates peer request/response failures without hiding listener failure;
- reports verified schema state and explicit `mutation_authority: false`;
- rejects unknown routes, mutation methods, malformed requests, duplicate or
  absent/mismatched numeric `Host`, oversized request heads, and non-loopback
  peers;
- never reflects request bytes or configured paths in errors.

This crate also contains experimental `lnsatctl` source for `doctor`,
authenticated `health`/`status`, public-safe `config inspect`, read-only
`recovery inspect`, non-root offline `backup`, fresh inert `restore`, protected
`recovery owner`, manifest, completion, man, help, and version. Health/status
require one explicit owner-controlled macOS/Linux Unix-socket path and one
opaque session token from stdin. Transport proves path, socket, owner, stable
inode, and peer effective UID before bearer transmission and uses no proxy
environment, DNS, hostname, redirect, retry, discovery, TLS, remote target, or
secret argument. Commands share deterministic `text|json|jsonl|yaml` output;
JSON remains default and manifest remains canonical JSON only. Config
inspection returns exact-byte SHA-256 and applied-layer evidence without raw
paths or source bytes. Backup and owner recovery require the daemon-shared
exclusive database lease. Restore creates only one fresh inert file. Owner
recovery preflights current schema and expected owner before reading one
bounded UTF-8 password from protected stdin, then atomically appends
credential/audit evidence and revokes every owner session. Daemon bind and
offline recovery mutations refuse effective UID zero on macOS/Linux. No served
recovery route, activation, existing-file replacement, service install/start,
`sudo`, or automatic privilege escalation is exposed.

This crate exposes stable source-level `/v1` negotiation and authenticated
`POST|GET|HEAD|PATCH|DELETE /v1/session`, authenticated read-only
`GET|HEAD /v1/health` and `GET|HEAD /v1/status`, plus
`PATCH /v1/identity/password`, owner-only `POST /v1/identities`, and owner-only
`DELETE /v1/identities/{identity_ref}` disablement with
`lnsat.gateway.identity_disablement.v1_0`, authenticated
`GET|HEAD /v1/identities/{identity_ref}/events` with
`lnsat.gateway.identity_event_read.v1_0`, authenticated
`GET|HEAD /v1/sessions/{session_id}/events` with
`lnsat.gateway.session_event_read.v1_0`, plus authenticated
`POST /v1/approval-requests` with
`lnsat.gateway.approval_request.v1_0`, and authenticated
`POST /v1/approval-requests/{approval_request_id}/decision` with
`lnsat.gateway.approval_decision.v1_0`. It does not serve packet/action or
recovery mutation, sign or consume approval evidence, re-enable identities,
serve Control Center assets, activate recovery,
dispatch adapters, daemonize, install a service, restart automatically, or
authorize production use.

Developer invocation:

```sh
cargo run -p lnsatd -- --database ./local-state/lnsat.sqlite3
cargo run -p lnsatd -- --config /absolute/path/to/lnsatd.json
```

Parent directory must already exist. The source binary is not a published or
supported artifact.

Phase 10 P10-A1 establishes a target-neutral contract spine, P10-A2 adds
explicit-only configuration/path evidence, and P10-A3 adds authenticated local
health/status plus stable output formats. P10-A4 adds offline backup, inert
restore, protected owner recovery, non-root enforcement, and exact
CLI/API/MCP/UI unavailability parity. System/user paths and P10-X1 exit freeze
remain incomplete. Current source does not install, daemonize, register, or
automatically start an OS service. See
[CLI and OS operator interface](../../docs/architecture/CLI_AND_OS_OPERATOR_INTERFACE.md)
and [Phase 14 distribution](../../docs/architecture/DISTRIBUTION_AND_CLIENT_INSTALLERS.md).
