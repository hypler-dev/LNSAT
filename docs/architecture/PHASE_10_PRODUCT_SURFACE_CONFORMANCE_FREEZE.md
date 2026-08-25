# Phase 10 Product-Surface Conformance Freeze

- Status: complete experimental source conformance
- Packet: `P10-X1`
- Runtime effect: none beyond P10-A1 through P10-A4
- New mutation authority: none
- Phase 11 status: closed; separate authorization required
- Package, target, service, deployment, production, or support claim: none

## Exit Decision

Phase 10 source exit passes when the closed fixture
`fixtures/contracts/phase10-product-surface-conformance-v1.json` validates and
its listed commands pass. It records 13 product-surface evidence rows, 13
required negative cases, eight compatibility guarantees, exact validation
commands, and explicit exclusions. `npm run phase10:exit:test` runs the
fail-closed validator tests plus the complete Rust product-surface test profile.

This is a source-conformance decision only. It does not select a target, bind a
source revision to an artifact, produce a package, install a service, prove a
target lifecycle, authorize production use, or open Phase 11 implementation.
Phase 14 still owns every later-selected target/package lifecycle row.

## Frozen Product Surface

- `lnsatd`, `lnsatctl`, and `lnsat` expose the same target-neutral manifest.
- Explicit daemon configuration is closed JSON with exact identity, bounded
  bytes, duplicate/unknown-field refusal, no secret fields, and no ambient
  discovery. Existing direct daemon arguments remain a separate compatible
  mode; mixed direct/config input remains invalid.
- `lnsatctl health` and `status` require one explicit owner-controlled Unix
  socket and protected-stdin session token. Client and daemon prove local
  socket/peer identity before accepting bearer material. GET and HEAD have
  equal authentication; HEAD is bodyless.
- JSON remains default. Text, JSON, JSONL, and YAML share deterministic output
  contracts and stable exit families.
- Recovery inspection remains read-only. Backup and owner recovery require
  exclusive offline lease. Restore creates one fresh inert file. Owner recovery
  accepts password only through protected stdin, appends credential/audit
  evidence, and revokes all owner sessions.
- Daemon bind and offline recovery mutations refuse effective UID zero on
  macOS/Linux. No privilege escalation helper exists.
- Packet inspection retains equal CLI/API/MCP decision and evidence. Offline
  recovery mutation remains CLI-only; API, MCP, and Control Center expose
  unavailable posture with no route, tool, or rendered action.
- Bash, zsh, fish completion and `lnsat`, `lnsatctl`, `lnsatd` man source remain
  stdout-only source generation.

## Compatibility Freeze

P10-X1 preserves existing default JSON, packet behavior, direct daemon
arguments, stable exit families, target-neutral manifest posture, and Phase 14
lifecycle ownership. New Phase 10 commands occupy previously invalid command
shapes. System/user paths remain unselected. Reserved command groups remain
unavailable and grant no hidden pass-through authority.

Daemon status now reports Phase 10 `complete`, implemented packets through
`P10-X1`, `next_packet: none_authorized`, and `phase11_open: false`. This status
is evidence that Phase 10 source conformance passed. It is not authority to
start Phase 11. Field shape and contract version remain unchanged; terminal
status value and packet list transition intentionally from in-progress evidence
to completed Phase 10 evidence.

## Negative Evidence

The closed ledger requires negatives for ambient authority or secret-bearing
arguments, mixed configuration precedence, TCP bearer fallback, token input
before endpoint validation, insecure or symlinked socket identity, GET/HEAD
authentication drift, restore overwrite/activation, owner-secret reflection,
root execution, served API/MCP/UI recovery actions, and early Phase 10 target
lifecycle claims.

Unknown, missing, reordered, duplicated, unreadable, or marker-drifted evidence
fails closed. Migration `0018` remains unregistered. Every product manifest
hard stop must remain `false`.

## Validation

```sh
npm run phase10:exit:test
npm run phase10:exit:check
npm run docs:direction:check
npm run security:conformance:check
npm run audit:migrations:check
npm run public:check
npm run check
git diff --check
```

## Closed Lanes After Exit

Phase 11 remains closed after P10-X1. No served or public consequence route,
production or user-repository execution, migration `0018`, key/provider work,
system/user/target/package path selection, artifact build, install, service
registration/start, target lifecycle proof, tag, release, publication, deploy,
production write, or later-phase implementation is authorized by this freeze.
