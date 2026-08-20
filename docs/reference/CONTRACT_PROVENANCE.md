# Contract Provenance

The stable common failure source is
`packages/packets/src/contract-error-envelope-v1.ts`. It exports
`contractErrorEnvelopeV1Contract`, `ContractErrorEnvelopeV1`,
`ContractErrorV1`, and `createContractErrorV1`; this shape grants no retry,
authority, or side effect. `crates/lnsat-contracts/src/error.rs` maps stable
Rust failures to the same six-family fixture without widening the separate
audit-idempotency result shape.

The stable compatibility source is
`packages/packets/src/contract-compatibility-matrix-v1.ts`. Its exported matrix
and `fixtures/contracts/compatibility-matrix-v1_0.json` freeze negotiation,
identity, replay, stale-evidence, and migration posture across all seven stable
families without granting migration or runtime authority.

The accepted authority-layer planning source is
`packages/packets/src/v1-authority-layer-plan.ts`. It freezes transport,
identity, policy, attestation, LNSAT authority, and evidence-export roles; the
complete synthetic reference flow; security invariants; two hardware profiles;
and explicit non-goals with `side_effects: []`.

Mandatory Phase 14 planning lives in
`packages/packets/src/distribution-client-installer-plan-contract.ts` and
`packages/packets/src/release-execution-preflight-matrix.ts`. These sources
freeze canonical targets/components, thin wrappers, trust evidence, and closed
build/publication gates. They do not create or publish artifacts.

Some source contracts retain historical internal packet identifiers as stable
provenance labels. Detailed private build ledgers are not published and are not
runtime dependencies.

Public contract authority comes from current TypeScript/Rust source, shared
fixtures, tests, and architecture documentation. Historical identifiers do not
grant runtime, deployment, or approval authority.

Initial fresh public history retains selected Phase 7 manifests and readiness
ledger as immutable archival bytes under
[`lnsat.public_source_snapshot.v1`](public-source-snapshot.json). Public
validators check current record shape and every descendant byte, but they do
not replay private commit ancestry, exact diffs, reviewed tree IDs, protected
blobs, completion commits, or reviewer identity. This pre-release exception
grants no release, artifact, deployment, runtime, or support authority and must
be retired before supported release evidence can pass.
