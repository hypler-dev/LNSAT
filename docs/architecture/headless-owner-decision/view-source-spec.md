<!-- intent-driven-delivery:spec:v1 -->

# Specification: HCFG-5C C2 Complete Comparison View Prerequisite

Status: accepted
Intent: [Accepted exact owner-decision contract](https://github.com/hypler-dev/LNSAT/blob/0d5db17a1de7fdbd40abcfe4ddf901a39e89e160/docs/architecture/headless-owner-decision/spec.md)
Authority: [Project Status](../../PROJECT_STATUS.md#hcfg-4b4c-and-hcfg-5-contracts)
Owner: LNSAT maintainers
Accepted baseline: human owner on 2026-09-30 at exact HCFG-5C head `0d5db17a1de7fdbd40abcfe4ddf901a39e89e160`
Last updated: 2026-10-03

## Behavior

The accepted owner-decision design requires a complete bounded view of every
change before exact digest confirmation. C2 implements only the structural
view prerequisite over the accepted HCFG-5A pure comparison model. Project
Status owns acceptance and implementation truth; this specification does not
accept a new authority or declare a complete authenticated owner view.

The model already normalizes both supplied sides, seals their declaration,
envelope, evidence and shared context, and derives a sorted complete change
summary. Its public diagnostic deliberately omits those details. C2 adds an
explicit in-memory sensitive view with a distinct model schema and digest.
It preserves the existing comparison commitment, classifications, summary and
redacted diagnostic. The model remains conditional on supplied evidence.

## Interfaces and contracts

Production ownership is `crates/lnsat-contracts/src/headless_config/comparison.rs`,
its private `comparison_view.rs` child, and the export lists in
`headless_config/mod.rs` and `src/lib.rs`. Dedicated
`comparison_view_tests.rs` tests exercise construction and the bounded serializer. No migration, store, daemon, CLI, route, dependency or
product-surface change is included.

`HeadlessComparisonResultV1::view_model()` returns an optional borrowed
`HeadlessComparisonViewModelV1`. Only successful normalization and comparison
may construct that value. Its fields and constructor are private. It has no
deserializer, `Serialize`, public JSON constructor or authority conversion.
Its explicit canonical byte accessor is sensitive in-memory model material,
not a transport permission. `Debug` exposes only bounded byte length; it
never prints references, context or canonical bytes. The existing result
diagnostic remains byte-equivalent and does not expose view bytes or digest.

Equal, narrowing and widening/mixed mathematical results may have a complete
view. An unverifiable result has none. A view does not change challenge
eligibility: the future trusted decision flow still permits only a verified
widening/mixed candidate to request a challenge.

## Complete content and identity

The closed JSON object contains exactly:

- `schema_id`: `lnsat.headless_config.comparison_view_model.v1`;
- `model_commitment` and `model_class`, unchanged from the sealed comparison;
- `context`: all eight existing asserted context fields: installation
  reference, current generation reference and digest, policy-floor version and
  digest, active-stop flag, stop/revocation epoch and enforcement profile;
- `old_declaration_digest` and `candidate_declaration_digest`;
- `resource_changes`: every sorted resource change, including reference and
  nullable old/candidate state; each state includes reachability, kind and
  declared identity, canonical identity and evidence digests;
- `rule_changes`: every sorted principal/resource/capability change, with
  complete old/candidate mode and all five limits: tokens, runtime seconds,
  cost micro-USD, CPU millicores and memory bytes;
- `authority_comparison: unverifiable`, `identity_verified: false`,
  `activation_available: false` and `grants_action_authority: false`.

The old and candidate declaration digests bind the normalized source content;
the existing model commitment additionally binds both complete envelopes and
evidence sets. A removed resource uses JSON null on the absent side, never an
invented identity. Denied missing rule sides retain the model's explicit zero
limits and deny mode. Every change is included; there is no filtering,
pagination, abbreviated digest, omitted dimension or ellipsis.

Current-generation context remains an assertion. C2 creates no installation,
active generation or candidate generation, and invents no candidate-generation
reference. The future authenticated comparison must derive actual current
state and any allocated candidate identity through its trusted store boundary.

## Encoding and bounds

Canonical JSON uses recursively sorted fixed ASCII object keys, compact
separators, unchanged sorted change arrays, JSON string escaping and unsigned
safe-integer values. For this closed shape it must be byte-identical to the
existing contract canonicalizer. No floating number or caller-selected key
enters the view. Canonical bytes have no trailing LF.

The view digest is SHA-256 over ASCII
`lnsat.headless_config.comparison_view_model.v1`, one LF byte, then the exact
canonical JSON bytes. It is a distinct model-view commitment; it is never
renamed as authenticated `comparison.v1`, a human confirmation, challenge,
decision, validated crypto profile or grant.

Canonical JSON has an inclusive 131,072-byte ceiling. A private bounded writer
rejects before retaining any write that exceeds the remaining ceiling; an
incomplete buffer never escapes. The input and intermediate value remain
bounded by the existing per-side and union resource/rule/reference limits.
The serializer does not reserve or retain a larger output allocation.
Serialization or size failure leaves the mathematical result and summary
unchanged but exposes no view. The future challenge must deny when a complete
view is unavailable; it may never use a truncated substitute.

This per-view cap is below the accepted 1 MiB aggregate live-candidate budget.
It does not enforce that quota: declaration, comparison, view, live-count,
durable rate and lifetime accounting remain future authoritative transaction
requirements.

## States and failure handling

The result either carries one complete immutable model view or no view.
Unverifiable input and over-limit serialization expose no sensitive partial
output or success substitute. No row, counter, audit event, decision or
candidate allocation is created. Dropping the value discards the view; it is
not a secret credential or a reusable step-up permit.

## Data, privacy, and permissions

Explicit view access contains owner-sensitive references and asserted context.
It must not be logged, emitted by public diagnostics or treated as a generic
stored-row response. Future Gateway integration requires owner-session and
independent-proof authentication, a closed protected projection and complete
current-state rederivation. This source model supplies none of those gates.

## Compatibility and migration

The existing comparison model commitment, golden vector, supported asserted
profile, redacted diagnostic and classifications remain unchanged. No schema
or public wire version moves. The view-model schema is source-only and has no
route or parser. Full HCFG-5C still needs authoritative candidate/challenge/
decision state, credential/session rechecks, atomic audit linkage and apply;
HCFG-6 and separately accepted HCFG-5A apply remain activation prerequisites.

## Acceptance mapping

- Independent literal canonical golden vector matches a real nonempty model
  result and a separately computed SHA-256 digest.
- Exact resource/rule changes, modes, every budget dimension, nullable states,
  both declaration digests and every context field appear completely.
- Object member order cannot alter canonical output; invalid collection order
  denies. Changed bindings or view fields change the model/view commitment or
  deny normalization.
- Equal/narrowing/widening views remain non-authorizing; unverifiable input has
  no view. The existing diagnostic contains no view or sensitive fields.
- Inclusive byte-boundary and oversized valid-model tests prove no partial
  view escapes, while existing mathematical comparison remains unchanged.
- Strict pinned Rust tests/format/Clippy, docs/public/inventory, proportional
  broad source check, installed local source/secret scans and fresh independent
  read-only review gate handoff.

## Non-goals and open questions

No authenticated owner view, current-state trust, transport, credential input,
challenge, confirmation, decision, storage, migration or mutation is opened.
No Docker, host ACL/config change, kernel pressure probe, package/image build,
merge, release, deployment or production action is authorized. Full V1 and
enterprise/government security assurance remain incomplete. The exact later
authenticated `comparison.v1` and protected view schema must compose this
prerequisite with real server-derived state; no model digest substitutes for it.
