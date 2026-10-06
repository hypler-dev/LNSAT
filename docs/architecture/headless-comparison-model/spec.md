# HCFG-5A pure comparison model

Status: bounded pure-source design accepted; implementation status in Project Status
Owner: LNSAT maintainers
Last updated: 2026-10-03
Authority: [Product Build Sequence, HCFG-5](../../PRODUCT_BUILD_SEQUENCE.md#headless-source-packet-order)
Parent intent: [proposed HCFG-5A intent at PR #61 head 360c42cb](https://github.com/hypler-dev/LNSAT/blob/360c42cb10b4f615d6cf424a33eec714c1684b94/docs/architecture/headless-protected-control/intent.md)

## Outcome and boundary

Implement the deterministic comparison mathematics needed by the proposed
`lnsat.headless_config.comparison.v1` contract. The bounded source slice would
compare two supplied envelopes and report conditional semantic equality,
narrowing, or widening. It performs no resource inspection, authentication,
policy admission, store access, I/O, CLI operation, or activation.

This model does not produce an authenticated `comparison.v1` result or an owner
decision binding. Its inputs are assertions, including identity and policy
digests. A matching digest cannot establish that an identity was verified or
that an envelope is current effective authority. Even a well-formed model result
has `authority_comparison: unverifiable`, `identity_verified: false`,
`activation_available: false`, and `grants_action_authority: false`.

The parent activation design remains proposed. The owner accepted PR #67's
bounded design at `7166ee6d2ab0e213e7f565eedc3b86dd1204763f` in the
2026-09-30 development conversation. That acceptance authorizes only its pure
source implementation and tests. HCFG-5B bootstrap,
HCFG-5C owner decisions, authenticated active-generation derivation, HCFG-6
enforcement, merge, runtime proof, packaging, and release remain separate gates.
This proposal does not change any existing declaration or Gateway contract.

## Input model

Use internal Rust types with private fields and a structural constructor. Do
not add a wire parser, public JSON schema, route, permission, database table, or
CLI selector. Test builders cannot be reused as authenticated constructors.

Each side supplies the sealed parsed HCFG-3 declaration and a supplied effective
envelope. The model recomputes composition and its declaration digest internally
from that exact sealed declaration. It accepts no separate caller composition or
caller declaration digest, so a valid declaration cannot be paired with another
document's composition. An envelope contains a sorted
unique resource membership set and sorted unique
`(principal_ref, resource_ref, capability)` rules, with HCFG-3 modes and all five
budgets. Every non-denied rule belongs to its envelope's resource membership;
every referenced resource belongs to that side's declaration dictionary.
An effective envelope may only narrow its own composed declaration: no resource
addition, mode increase, or budget increase. Absent and denied rules have all
zero budgets. Unknown or compiled-forbidden capabilities reject even deny rows.

The shared asserted context includes installation reference, current generation
reference and digest, policy/floor version and digest, active-stop flag and
stop/revocation epoch,
and selected enforcement profile version. Both sides must use exactly that
context, and `context.installation_ref` must equal the installation reference in
each sealed declaration. A mismatch on either side is `unverifiable`.
Each side has its own evidence dictionary with exactly one record for every
resource in that side's declaration dictionary, including resources removed by
layering, and no extra records. Each dictionary has at most 128 records, at most
256 across both sides, sorted uniquely by resource reference. Enforce these caps
and reject duplicates before collecting, sorting, or hashing model evidence.
Each side binds resource reference, kind, declared identity digest,
asserted canonical identity digest, and asserted evidence digest. Missing,
duplicate, unsupported-profile, or inconsistent records are unverifiable.
Declared identity must match the asserted canonical identity for that side;
this checks consistency, not authenticity. Evidence records contain no paths,
credential values, raw platform objects, or executable instructions.

Use HCFG-3 reference and digest grammar. The current generation reference uses
the exact `generation:` prefix with the same bounded v1 opaque-reference grammar.
Policy/floor and enforcement profile versions use one to 128 ASCII characters
matching `^[a-z0-9][a-z0-9._:-]{0,127}$`; there is no implicit `latest`, fallback,
or version range. The initial implementation recognized exactly the existing
source profile contract `lnsat.runtime_profile.docker_local.v1`. The separately
reviewed compatibility source slice admits exactly that asserted contract and
`lnsat.runtime_profile.docker_local.v2`, the selected HCFG-6 profile identity.
The latter's native schema version 3 is not an input or validation claim of
this pure model. Both sides must assert the same exact profile string; mixed
v1/v2 contexts remain unverifiable. The actual string remains in canonical
model/view commitments; historical v1 bytes and commitments are unchanged.
A syntactically valid but unrecognized profile is unverifiable, with no
commitment, summary or view. Recognition does not prove platform support,
authenticate profile bytes or enforcement evidence, or authorize Docker use.
Each additional profile recognition requires a separately reviewed source
change; there is no caller-selected allowlist or fallback. The canonical
[compatibility source record](../../PROJECT_STATUS.md#hcfg-5a-exact-asserted-profile-compatibility)
owns current review and implementation evidence. Epochs and budgets are safe unsigned integers, at
most 9007199254740991. Zero never means unlimited. Preserve the existing 65536
byte declaration limit, 128 resources and five layers per declaration, and 256
rules per layer. Bound an effective envelope to 128 resources and 1280 rules;
bound unions to 256 resources and 2560 rule tuples before allocating summaries.
Reject limits before collecting, sorting, or hashing unbounded input.

## Conditional partial order

Compare resource reachability separately from agent action rules. A resource
can be reachable with no action grant; resource removal must still count as
narrowing. Compare resource membership and each tuple in the union, treating an
absent tuple as `deny` with five zero budgets.

- Mode order is `deny < approval_required < allow`.
- Compare `tokens`, `runtime_seconds`, `cost_microusd`, `cpu_millicores`, and
  `memory_bytes` independently. Never total, average, convert, or offset budgets.
- A new reachable resource is widening even if every action is denied.
- Removal of reachable resources is narrowing only with no other wider dimension.
- For a resource reachable on either side, a changed kind or asserted canonical
  identity is widening, including removal and replacement under another reference.
  An alias is not evidence that two references identify the same resource.
- A changed evidence digest with the same asserted canonical identity changes
  input identity but does not itself increase the modeled resource reachability.
  It always invalidates any earlier comparison binding in a future integration.
- New or substituted principals compare as different tuples; a newly non-denied
  tuple is widening. An explicit zero-budget denial and absence are equivalent.
- A lower mode and a higher budget, or any combination of lower and higher
  dimensions, is `widening_or_mixed`. No lower dimension cancels a higher one.

The model class is `equal` only when resource membership, the kind and asserted
canonical identity of every resource reachable on either side, tuple modes, and
all five budgets are equal. A changed kind or canonical identity for any such
resource contributes a wider dimension and forces `widening_or_mixed`, even if
membership, modes, and budgets are otherwise unchanged. The class is `narrowing`
only if no dimension rises and at least one falls; otherwise it is
`widening_or_mixed`. Malformed, inconsistent, unsupported, or
incomparable inputs return the fixed `unverifiable` result, with no partial
summary. An active asserted stop produces `unverifiable`; the model cannot clear
stop or revocation. The supplied effective envelopes must retain asserted
revocations; proving that they actually do is a future trusted-builder obligation.

Semantic equality is distinct from declaration equality. Changed layer lineage,
unused dictionary entries, or presentation can change declaration digests while
the modeled authority stays equal. A future audited no-op must still bind the
exact submitted declaration and context; this model chooses no active generation.

## Determinism and privacy

Sort resource arrays by UTF-8 reference bytes and tuple arrays lexicographically
by their three UTF-8 strings. Reuse the HCFG-3 canonical JSON writer for object
keys, safe integer encoding, string escaping, and compact output. Do not confuse
its UTF-16 object-key order with the UTF-8 ordering of reference arrays.

A model input commitment uses the UTF-8 domain
`lnsat.headless_config.comparison_model.v1` followed by one LF byte, then canonical
JSON containing the shared asserted context, both normalized declaration
digests, both complete effective envelopes, both evidence dictionaries, model
class, and sorted resource/rule changes with full old/new dimensions. Hash with
SHA-256 and encode `sha256:` plus 64 lowercase hexadecimal digits. This is a
content commitment to assertions, not the parent authenticated comparison
snapshot/summary digest and never an approval token.

The exact canonical object has only `context`, `old`, `candidate`, `model_class`,
`resource_changes`, and `rule_changes`. Each side has only `declaration_digest`,
`envelope`, and `evidence`. The envelope has `resource_allow` and `rules`; each
rule uses the exact HCFG-3 rule fields and limits. Evidence records use
`resource_ref`, `kind`, `declared_identity_digest`, `canonical_identity_digest`,
and `evidence_digest`, sorted uniquely by resource reference. Context fields are
`installation_ref`, `current_generation_ref`, `current_generation_digest`,
`policy_floor_version`, `policy_floor_digest`, `active_stop`,
`stop_revocation_epoch`, and `enforcement_profile_version`. Both sides share this
one context object; separate supplied contexts must match before construction.

Resource changes are sorted records with `resource_ref`, `old`, and `candidate`.
Each side is either `null` for absence from that declaration dictionary, or an
object containing `reachable`, `kind`, `declared_identity_digest`,
`canonical_identity_digest`, and `evidence_digest`. Include only unequal side
objects. Rule changes are sorted records with `principal_ref`, `resource_ref`,
`capability`, `old`, and `candidate`; the side objects contain `mode` and the
five-field `limits` object. Normalize absent rules to zero-budget denial before
comparison and omit equal side objects. The input objects above reject nulls;
the explicit resource-change absence marker is the only nullable field.

This schema is internal commitment material, not a public input/export contract.
The later source packet must record golden vectors for this exact schema before
code review. Consumers cannot infer the commitment from display prose. Different
canonical fields require a new model version and cannot silently alter v1.

The complete summary contains sensitive principal and resource references.
Keep it in memory for an explicit caller; do not automatically serialize, log,
trace, persist, or export it. Custom `Debug` and fixed errors expose only markers
and counts. A public-safe diagnostic may contain model class, count totals, the
model commitment, and the four non-authority markers above. It must omit
references, identities, evidence digests, full context, and declaration bytes.

## Later trusted integration

A future separately accepted Gateway builder must rederive both effective
envelopes from the exact current store generation and candidate under one current
policy/floor/revocation snapshot, authenticate the installation and owner,
verify resource identity and enforcement evidence, and check freshness and
stop state. It must not merely deserialize this model's inputs or trust its
markers. It recomputes the parent `comparison.v1` snapshot and summary digest
under the apply transaction and rechecks identities at use. Changed generation,
credentials, policy, epochs, evidence, or submitted declaration invalidates the
binding. A failed prerequisite denies; a model class never supplies admission.

Neither HCFG-3 nor the current repository provides this active-generation
builder. The bounded implementation must expose no conversion from a model
result to verified authority, approval eligibility, or activation permission.
Future integration needs new review; source math tests cannot prove it.

## Bounded source plan and acceptance

Following explicit human acceptance of this bounded design, assign
one writer the `crates/lnsat-contracts/src/headless_config/` comparison module,
its tests, and minimal module exports. Existing parser/composition APIs retain
their diagnostic semantics. No other production module is in scope. Update
documentation and deterministic inventory only for that exact slice.

Required cases: equality with changed content; each mode transition; each budget
dimension independently; mixed changes; zero bounds; missing rules; new/removal
of reachable resources with all actions denied; identity and kind substitution
with otherwise unchanged membership/rules/budgets classified as
`widening_or_mixed`;
principal substitution; aliases; evidence refresh; unmatched declaration and
effective envelope; refusal of a separate declaration/composition pairing;
missing/duplicate/extra/oversized evidence; context versus old installation,
context versus candidate installation, and old versus candidate installation
mismatches; different
context; asserted stop; unknown capability; overflow and collection limits;
canonical ordering; fixed redacted errors and `Debug`; stable golden commitments
and mutation of every bound field. A small exhaustive finite mode/budget model
must show that no wider dimension is classified as narrowing or equal.

Use focused pinned Rust tests, Rust format/clippy, `npm run check`,
`npm run public:check`, inventory check, and `git diff --check` for source.
Installed local audit tools follow repository policy. Fresh independent review
must verify conditional-model wording, limits, digest coverage, privacy, and the
absence of store/route/CLI effects. Design-only changes use focused docs/public/
inventory/format checks. Record exact results in the PR. Project Status remains
implementation authority and the Phase 11 operator packet remains runtime-proof
authority; this specification creates no competing implementation or runtime
status ledger.
