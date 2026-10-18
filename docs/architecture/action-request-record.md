# Action-Request Record Source Contract

- Status: experimental source implemented with bounded local fixture evidence
- Acceptance: direct human acceptance on 2026-10-18 authorized design
  reconciliation and source implementation
- Product effect: experimental authenticated request intake and evidence read
- Runtime effect: no dispatch or new authority

This source milestone gives authenticated action intake a durable, immutable
request record. It preserves failed intake and changed or repeated
submissions as evidence while keeping policy evaluation and execution
authority separate. It does not claim Phase 10 exit, Phase 11 runtime proof,
deployment, release, or support.

## Contract

`POST /v1/action-requests` accepts the existing authenticated packet envelope
with an execution proposal. It commits an `arq_` request root before policy
evaluation. Root commit and evaluation commit are separate. A recorded policy
decision links atomically to the request; a known rejection or confirmed
rollback may append one immutable failed evaluation. An unrecordable failure
leaves the evaluation state unknown. Retrying a committed root never
reevaluates it.

Idempotency is scoped to requester identity, project, resource, and key. An
exact canonical replay returns the same root and records at most the first
replay observation. Changed canonical packet bytes record at most the first
conflict observation. These observations are immutable evidence, not a
submission counter.

`GET /v1/action-requests/{request_id}/operator-record` returns the bounded
operator record after session-token and session-proof verification and
`ReadEvidence` authorization. An active Owner or the original requester identity
may read it. This is an
identity-scoped rule; no per-project ACL model is introduced. Missing and
cross-identity records remain indistinguishable after authentication.

Strict browser transport, CSRF, existing local-session verification, and the
current Owner/Operator `RequestAction` permission remain required. The
interface is read or record only. It does not dispatch actions, redeem
capabilities, or create execution authority.

## Projection and privacy

The operator projection uses a closed public-safe allowlist, at most 16 bounded
store queries including session verification, and at most 65,536 serialized
bytes including its envelope. Each linked evidence family has a 64-row bound
plus one overflow sentinel. Legitimate multiple approval requests,
authorization attempts, operation attempts, and reconciliations remain arrays.
Invalid lineage, missing required evidence, unknown states, ambiguous receipt
cardinality, oversize data, or overflow degrades the whole projection rather
than presenting partial linked data as complete.

Responses contain identifiers, references, timestamps, and digests needed to
reconcile evidence. Raw packet bodies, session identifiers, idempotency keys,
credentials, tokens, private target data, provider logs, and raw content are
excluded. Action and target commitments use distinct intake domains and are
not execution authorization digests.

## Schema and compatibility

Schema 18 migration `0018_action_requests.sql` adds request roots, evaluation
links, and first replay/conflict observations. It is additive: existing
schema-17 authority rows are preserved and no roots are backfilled. Selected
read-only inspection accepts exact original schema 17 and separately pinned
schema 18 evidence; it performs no migration or store activation. Downgrade
is unsupported; an independently managed pre-upgrade backup is the recovery
boundary.

Schema 18 is reserved for this request-record source milestone. The earlier
unimplemented headless-installation proposal is reconciled to future schema 19. Headless installation, signed-key-provider work, mutual-authentication
transport changes, private CLI ports, and host or runtime operations remain
closed.

## Validation boundary

On 2026-10-18, 86 bounded Rust tests passed: 51 focused store tests, 30
historical signed-candidate compatibility tests, four daemon classifier tests,
and one readiness serializer test. They used the existing local Rust 1.97.1
toolchain and offline dependencies. They
cover root/evaluation failures, replay/conflict, requester access, mismatched
session proofs, redaction, linked histories and corruption, query/row/byte
bounds, migration rollback, namespace collisions, and exact schema-17/18
read-only inspection. Daemon tests call classifiers without binding a server
or dispatching an action. Existing runtime and Git-adapter tests were excluded.

Full `npm run check` and `npm run public:check` stopped at the engine guard:
the available Node 24.21.0 differs from required Node 22.22.3. Direct public,
documentation, and Phase 7/10 source validators supply narrower evidence.
Security-conformance and public-history checks are additionally blocked by
missing installed MCP conformance and `smol-toml` dependencies. No dependencies
were installed to bypass these limits. Full repository validation, native
Linux compatibility, runtime operation, installation, Phase 10 exit, Phase 11
proof, deployment, and release remain unproven.
