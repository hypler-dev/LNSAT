# LNSAT Provenance

- Status: public pre-release provenance record
- Public root: `bcaebb1206f42bb0c73c03d7114f6abc82cf2e2f`
- Private export tip: `3d7ba4a3422a6934144d7aab3a1be20a54809e58`
- Shared tracked-source tree: `8f0419d47fc5e0b9926b04db5c3c2a57b5283c51`
- Release, artifact, and deployment authority: none

LNSAT's public Git history began on August 20, 2026. Development did not.
This record discloses selected earlier engineering milestones and binds the
fresh public root to the exact tracked source exported from the retained
private engineering archive.

Private revision identifiers below are provenance references. Their objects
are intentionally absent from the public repository, so a public clone cannot
independently replay their ancestry or inspect their contents. Current public
source and all work after the cutover remain authoritative and publicly
replayable.

## Public Cutover

Public source was prepared from private source-base revision
`cae4fbde070b35a4b84c2729617a17db3ef54be5`, followed by seven bounded
public-readiness commits. Final private export tip
`3d7ba4a3422a6934144d7aab3a1be20a54809e58` and fresh public root
`bcaebb1206f42bb0c73c03d7114f6abc82cf2e2f` both resolve to Git tree
`8f0419d47fc5e0b9926b04db5c3c2a57b5283c51`.

That tree equality proves byte-for-byte identity of every tracked path at
cutover. It does not import private commit ancestry, refs, reviews, CI records,
or other history-only metadata. The
[public snapshot marker](docs/reference/public-source-snapshot.json) records
the source base and keeps selected historical security records immutable in
public history.

## Selected Engineering Timeline

Dates are recorded committer timestamps. "Current public evidence" names the
present public paths that carry each milestone forward; it does not claim that
their current bytes are identical to the historical revision.

| Date                    | Private revision                                                                                                  | Class                 | Milestone                                                                                                    | Current public evidence                                                                                                                                                                                             |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-05-03 00:07 -07:00 | `083db4893c0301c6003b2c114255f99cc5dd5a37`                                                                        | Architecture          | Reset the current substrate and authority architecture foundation.                                           | [System architecture](docs/architecture/SYSTEM_ARCHITECTURE.md), [packet model](docs/architecture/PACKET_MODEL.md), [policy and audit](docs/architecture/POLICY_AND_AUDIT.md)                                       |
| 2026-05-03 09:55 -07:00 | `0c65a4da4ebb465944935f127c09393daf390940`                                                                        | Source implementation | Added packet validation and canonicalization plus policy, audit, and CLI foundations.                        | [`packages/packets`](packages/packets/src), [`packages/policy`](packages/policy/src/index.ts), [`packages/audit`](packages/audit/src/index.ts), [`packages/cli`](packages/cli/src/index.ts)                         |
| 2026-05-06 22:20 -07:00 | `878d8438a99a19f174cb30b14e0c38a7ceffe598`                                                                        | Source implementation | Checkpointed API-facing and MCP packet-inspection primitives and tests.                                      | [API packet inspection](apps/api/src/packet-inspection.ts), [MCP stdio](packages/mcp/src/stdio.ts), [inspection tests](packages/mcp/test/packet-inspection-server.test.ts)                                          |
| 2026-08-11 20:06 -07:00 | `8c3c3e59e65ee52b977fdbe404ddcf7cf915f6ae`                                                                        | Source implementation | Added Phase 7 local authorization and one-time consumption foundations.                                      | [Consumption source](crates/lnsat-store/src/phase7_consumption.rs), [authorization tests](crates/lnsat-store/src/tests/phase7_local_authorization.rs), [`lnsatd`](crates/lnsatd/src/lib.rs)                         |
| 2026-08-12 18:02 -07:00 | `29de82424b97ede36b96fa87d82f0b545be16d7f`                                                                        | Conformance           | Froze the Phase 7 local conformance fixture and validator.                                                   | [Fixture](fixtures/contracts/phase7-local-v1-conformance-v1.json), [validator](scripts/check-phase7-local-conformance.mjs), [freeze record](docs/architecture/PHASE_7_LOCAL_V1_CONFORMANCE_FREEZE.md)               |
| 2026-08-14 01:48 -07:00 | `d0534a4d61b98203226038957a090d8dc871711f`                                                                        | Runtime composition   | Composed the bounded Phase 8 authorization, execution, receipt, ambiguity, and reconciliation path.          | [Runtime tests](crates/lnsat-store/src/tests/phase8_runtime_composition.rs), [`lnsatd`](crates/lnsatd/src/lib.rs), [fixture](fixtures/contracts/phase8-runtime-composition-v1.json)                                 |
| 2026-08-15 12:49 -07:00 | `741bd8699302db9485e29dd76d1c205593dd3954`                                                                        | Source implementation | Added authenticated, read-only Phase 9 live evidence readback.                                               | [Console readback](apps/console/src/lib/control-center-live-readback.ts), [Gateway readback](packages/gateway/src/control-center-readback.ts), [fixture](fixtures/contracts/phase9-control-center-readback-v1.json) |
| 2026-08-16 16:57 -07:00 | `955b83e48d51aaf0a7d29414da87ab850a013bf7`                                                                        | Source implementation | Added the Phase 10 daemon, CLI, and product-surface spine.                                                   | [Product surface](crates/lnsatd/src/product_surface.rs), [`lnsatctl`](crates/lnsatd/src/bin/lnsatctl.rs), [fixture](fixtures/contracts/phase10-product-surface-v1.json)                                             |
| 2026-08-16 17:31 -07:00 | `cae4fbde070b35a4b84c2729617a17db3ef54be5`                                                                        | Public cutover input  | Froze the declared private source base used by the public snapshot process.                                  | [Snapshot marker](docs/reference/public-source-snapshot.json), [launch record](docs/PUBLIC_READINESS.md)                                                                                                            |
| 2026-08-20 14:03 -07:00 | Private export `3d7ba4a3422a6934144d7aab3a1be20a54809e58`; public root `bcaebb1206f42bb0c73c03d7114f6abc82cf2e2f` | Public cutover        | Published one fresh public root with the exact private export tree and no inherited private commit ancestry. | [Launch record](docs/PUBLIC_READINESS.md), [claims vocabulary](docs/CLAIMS_AND_MATURITY.md)                                                                                                                         |

## Why Private History Was Retained

The engineering archive remains private for security, privacy, provenance, and
incident-response reasons. Historical branches, reviews, CI metadata, internal
development context, and other records were not all prepared for permanent
public distribution. Keeping that object graph separate reduced disclosure
risk while preserving exact evidence for authorized investigation.

This is not a claim that private history has been publicly verified. The
disclosed hashes create durable identifiers that can be bound into later
signed provenance, but they do not replace public review evidence for an exact
release source.

## Release Provenance Remains Closed

Public source verification is not a supported release. A future release must
replace the temporary private-history snapshot exception with public-history
native review evidence for one exact source revision. Only after the strict
release gate passes and separate signing authority is granted may maintainers
create an annotated signed tag, checksums, SBOMs, provenance statements, or
release artifacts. See the [source release process](docs/RELEASING.md).

See [Why LNSAT became public now](docs/WHY_PUBLIC_NOW.md) for publication
context without priority or copying claims.
