<!-- intent-driven-delivery:spec:v1 -->

# Specification: Headless configuration declaration composition

Status: implemented in experimental source
Intent: [HCFG-3A work record](../../PROJECT_STATUS.md#hcfg-3a-core-declaration-composition)
Owner: LNSAT maintainers
Last updated: 2026-09-10

## Behavior

HCFG-3A supplies a pure Rust composition primitive for the accepted headless
configuration requirement. Resource reachability declarations and agent action
ceilings are separate. This is a dependency for later `config effective` and
`config export` diagnostics, not either completed command or active authority.
[ADR-0007](../ADR-0007_DOCKER_FIRST_RUNTIME_NEUTRAL_ENFORCEMENT.md)
controls inheritance. The existing packet policy table supplies the compiled
capability floor; neither this contract nor a caller can override that table.

The first supplied layer declares the baseline resource, action, and budget
ceiling (organization when present, otherwise project). It is bounded by the
compiled capability floor but is not authenticated owner authority. Subsequent
layers may only narrow this baseline. The digest covers this baseline and all
subsequent layers.

Layers are complete ceilings, not patches. Organization (optional), project
(required), runtime (optional), operator (optional), and request (optional)
resolve in this exact order. Each stage and layer reference appears once.
Resource allow sets narrow by subset. A later layer cannot introduce a resource,
restore a removed action, weaken approval, or increase any budget. Such attempted
widening rejects the whole composition. Missing actions become denied; explicit
and inherited denials remain in the composed declaration, even if their resource
is removed. A layer may introduce a new denial but cannot turn a denial into a
grant. Denial budgets are zero. Effective non-denied rules must reference the
current resource allow set. An empty allow set or empty rule set grants nothing.

Resource identity declarations are immutable within a document. A different
identity digest requires a different document; composing two documents or
activating either is outside this primitive. Input identity digests are not
verified identity or ownership evidence. No resource is opened or inspected.

## Interfaces and contracts

`parse_headless_config_declaration_v1` accepts at most 65536 UTF-8 JSON bytes.
Every field is required; unknown and duplicate fields, nulls, trailing data,
noncanonical collections, unsupported enum values and invalid bounds fail closed.
The document uses exact `schema_id: lnsat.headless_config.declaration.v1` and
`contract_version: lnsat.contracts.v1_0`. There is no fallback or range.

Top-level fields are `schema_id`, `contract_version`, `installation_ref`,
`resources`, and `layers`. References use the existing bounded v1 opaque-reference
grammar and the exact `installation:`, `resource:`, `layer:`, or `identity:`
prefix for their role. References identify declarations, not authenticated actors.

`resources` contains at most 128 records, sorted uniquely by `resource_ref`.
Each has `resource_ref`, `kind`, and `identity_digest`. Kinds are `folder`,
`repository`, `service`, `connector`, `runtime_profile`, and `os_resource`.
Digests are lowercase `sha256:` plus 64 hexadecimal digits. The first layer's
resource allow set must exactly enumerate this dictionary. Later layers select
subsets; they cannot substitute dictionary identities.

`layers` contains one to five records with `layer_ref`, `stage`,
`resource_allow`, and `action_rules`. Resource references are sorted and unique. Every resource allow entry and every
action-rule resource (including deny rows) must exist in the root dictionary.
Each rule has `principal_ref`, `resource_ref`, `capability`, `mode`, and `limits`.
At most 256 rules per layer are sorted uniquely by the first three fields.
Reference arrays and resource dictionaries use lexicographic UTF-8 byte order;
rule tuples compare each of their three strings in that same order.
Modes are `allow`, `approval_required`, and `deny`. Only capabilities supported
by the existing packet policy table may appear. A capability whose compiled
floor requires approval cannot be declared `allow`, even in the first layer.
Unknown and forbidden capabilities reject the declaration, including deny rows.

Limits contain `tokens`, `runtime_seconds`, `cost_microusd`, `cpu_millicores`,
and `memory_bytes`: unsigned integers no greater than 9007199254740991. Zero
is a bound, not an unlimited sentinel. All five limits must be zero for a denial.
Each non-denied child limit must be at most its parent's limit.

The parser returns a sealed validated declaration. Composition consumes that
validated type and returns a sealed declaration result or a fixed error code.
Diagnostic query methods report declared resource membership, declared mode,
and declared budgets. They are not action-admission or authorization APIs.
The redacted diagnostic includes only fixed schema/scope markers, counts, and a
SHA-256 digest over the normalized parsed input (including ordered layer lineage).
The preimage is UTF-8 `lnsat.headless_config.declaration.v1` followed by one LF
byte and canonical JSON of the complete parsed document. Canonical JSON reuses
the packet-v1 core writer: object keys sorted by UTF-16 code units, arrays in
validated order, safe integers in decimal, compact JSON with no whitespace, and
the same JSON string escaping. Output is `sha256:` plus 64 lowercase hex digits.
Object field order, insignificant whitespace, and equivalent JSON string escapes
do not change the digest. Layer, installation, identity, rule, or budget changes
do change the committed declaration content.
It excludes installation/principal/resource/layer references, identity digests,
and raw input. This digest provides content identity, not authenticity.

`lnsatctl config effective --declaration <absolute-path>` and `lnsatctl config
export --declaration <absolute-path>` require the exact
`--product-surface-contract lnsat.product_surface.v2` selector. Both read one
explicit absolute, regular, non-symlink declaration file, verify stable file
identity across the bounded read, parse and compose it in the core, and emit one
deterministic result through the existing text, JSON, JSONL, or YAML renderer.
The declaration input is distinct from `lnsat.daemon.config.v1`; neither command
loads daemon configuration or selects an active configuration.
The current stable file-identity loader is enabled only on Linux and macOS.
Other targets fail with `headless_config.platform_unsupported` until an exact
platform file identity and reparse-safe open boundary is implemented and proven.

`config effective` reports the redacted composed declaration as an unverified
declared ceiling. It states that declaration composition completed, while
identity, enforcement, admission, and activation remain unverified or
unavailable. `config export` emits the same redacted content identity and counts
under `lnsat.headless_config.redacted_export.v1`. That export is explicitly
non-applicable and non-reimportable: it contains no declaration source, resource,
principal, layer, installation, identity-digest, path, or secret value. It cannot
be passed to either command as a declaration and cannot be used for backup,
restore, activation, or authority transfer.

## States and failure handling

Parsing and composition are synchronous, bounded, and side-effect free. There
is no loading, retry, timeout, persistence, or partial-commit state. Any failure
returns no composed result. Missing query tuples return a declared denial with
zero budget. Error codes never reflect supplied values. Diagnostics cannot be
parsed as a declaration and are not an applicable backup or activation request.

## Data, privacy, and permissions

Inputs may contain sensitive resource and principal references. They stay in
memory, are not logged, and do not appear in debug or redacted diagnostic output.
There is no secret-value field, credential intake, filesystem, network, process,
environment, database, or audit write. The caller owns input retention. Public
safe-output claims cover the dedicated diagnostic, not arbitrary caller logging.

Activation remains unavailable. Real resource grants must bind authenticated
installation/owner decisions to canonical identities, verify grant/use identity
against symlink, reparse, mount, and target replacement, and enforce OS coverage.
Persisted emergency-stop and revocation state cannot come from this untrusted
configuration. A later admission path must intersect these declared ceilings
with the full current authenticated policy (including profile, packet approval
flags, and dynamic risk), approvals, obligations, runtime restrictions,
identity evidence, and authority-managed stop/revocation state. Missing or
unsupported proof must deny activation/admission.

## Compatibility and migration

This additive contract does not change daemon configuration, packet policy, or
frozen v1 product-surface bytes. The explicit v2 CLI manifest adds only the two
diagnostic commands and their declaration/redaction posture. No migration or
stored state exists. Removing the source module and command branches reverts
this packet. Merge remains a separate owner decision. This packet builds on the
merged HCFG-2 source without changing its diagnostics.

## Acceptance mapping

- Parser tests: closed shapes, escaped duplicate keys, collection order/duplicates,
  stage order, required project layer, reference/digest bounds, safe integer
  limits, unsupported capabilities, and compiled approval floor.
- Composition tests: resource subset, action omission, deny union, removed-resource
  denials, impossible restoration, principal/resource/capability substitution,
  every budget dimension, strongest approval, deterministic lineage identity,
  default deny, and redacted canaries.
- CLI tests: absolute regular-file and stable-identity loading, exact v2
  selection, fixed failures, deterministic multi-format output, effective/export
  separation, non-reimportable export, redacted canaries, and no side effects.
- Repository gates: pinned Rust tests/format/clippy, `npm run source:check`,
  dependency/signature audits, installed local security scanners, source inventory,
  and `git diff --check`.
- Fresh independent review assesses the exact contract, source, tests, and evidence.
  The canonical work record records completed source acceptance and its limits.

## Non-goals and open questions

This packet does not complete headless control, applicable or round-trippable
configuration export, resource enforcement, organization policy distribution,
runtime restrictions, new evidence obligations, emergency disablement,
apply/bootstrap, authenticated human configuration decisions, audit/atomic
activation, race/revocation/rollback semantics, selected-platform proof, or
release. Those remain required V1 work; this diagnostic model does not substitute
for them. New activation authority requires its separately reviewed exact
contract and owner authorization.
