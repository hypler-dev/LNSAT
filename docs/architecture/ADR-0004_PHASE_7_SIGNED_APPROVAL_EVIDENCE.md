# ADR-0004: Phase 7 Signed Approval Evidence

- Status: accepted verification-contract foundation; local-v1 sequencing and
  custody superseded by ADR-0006
- Date: 2026-07-26
- Decision owners: LNSAT maintainers
- Extends: ADR-0002 without opening execution authorization
- Superseded by:
  [ADR-0006](ADR-0006_PHASE_7_LOCAL_V1_TRUST_AND_OPTIONAL_SIGNED_EVIDENCE.md)
  for approval-proof optionality, user-owned key custody, hybrid signer
  transport, human-presence classification, schema sequencing, and local-v1
  critical-path dependencies
- Depends on: `lnsat.packet_envelope.v1_0`,
  `lnsat.policy_decision.v1_0`, `lnsat.approval_request.v1_0`, and
  `lnsat.approval_decision.v1_0`
- Implementation state: Phase 7c verification-primitive conformance;
  Phase 7b schemas, TypeScript/Rust structural validation, exact byte
  derivation, public-material binding, and wrapper vectors remain. A separate
  public-only pure Ed25519 primitive and shared strict vectors now exist. No
  operational wrapper verification, signing, key custody, nonce
  issuance/persistence, status source, endpoint, or execution authority exists.

## Context

Phase 6 records one authenticated, distinct-human approval decision and
rederives its packet, policy, request, and decision chain before persistence.
That stable decision is deterministic evidence, not an authenticated
signature. Existing Gateway approval-decision responses therefore correctly
preserve:

- `server_signed: false`;
- `execution_authorized: false`;
- `session_authority_state_changed: false`;
- `mutation_authority: false`.

The optional signed-evidence lane needs an independently verifiable external
signature without changing the stable decision identity or implying that
approval can execute an action. Local v1 may instead use authenticated local
session evidence under ADR-0006. LNSAT never holds the user's private key.
The design must bind actual v1 packet fields. Current v1 packets do not have
independent `action`, `target`, `environment`, or `artifact` fields. Their
present equivalents are the exact packet snapshot: `packet_type`, `intent`,
`project_ref`, `resource_refs`, `source_refs`, `policy_profile_ref`,
`permission_envelope`, `constraints`, and canonical packet hash. Introducing
parallel unbound labels would create substitution risk.

The mobile-edge Ed25519 source contract is a separate, pre-v1 source-only
profile. Its algorithm choice is useful evidence of platform feasibility, but
its payload, trust, domain-separation, key-lifecycle, and authority semantics
do not define approval evidence.

## Decision

### Parallel Immutable Wrapper

Keep `lnsat.approval_decision.v1_0` and
`lnsat.approval_decision.schema.v1_0` byte-for-byte and semantically unchanged.
Define a new immutable wrapper in a later implementation slice:

| Identity            | Proposed exact value                           |
| ------------------- | ---------------------------------------------- |
| Contract            | `lnsat.signed_approval_evidence.v1_0`          |
| Schema              | `lnsat.signed_approval_evidence.schema.v1_0`   |
| Payload profile     | `lnsat.signed_approval_payload.v1_0`           |
| Canonicalization    | `lnsat.canonical_json.v1_0`                    |
| Digest profile      | `lnsat.signed_approval_digest.sha256.v1_0`     |
| Signature profile   | `lnsat.signed_approval_signature.ed25519.v1_0` |
| Verification result | `lnsat.signed_approval_verification.v1_0`      |
| Public material     | `lnsat.approval_verification_material.v1_0`    |

These names now identify checked-in pre-release source contracts. They remain
unpublished and grant no compatibility alias or runtime authority. Phase 7b
adds their schemas, TypeScript/Rust models, and wrapper conformance vectors.
Phase 7c adds only a separate public-key/message/signature verification
primitive; it does not connect that primitive to this wrapper.

The wrapper contains:

```text
contract_version
schema_id
signed_approval_evidence_id
payload
payload_digest
signature
side_effects: []
```

`payload` contains the complete validated snapshots of:

```text
packet
packet_hash
policy_decision
approval_request
approval_decision
issued_at
expires_at
nonce_id
signing_key_id
signing_key_version
verification_material_ref
approval_gate_satisfied
server_signed: true
execution_authorized: false
session_authority_state_changed: false
mutation_authority: false
```

The nested `approval_decision` is the unchanged stable record. The signed
wrapper's `server_signed: true` describes only authenticity of this new
wrapper. It does not alter the existing Gateway response or nested decision,
which remain unsigned.

Embedding the complete validated chain avoids lossy reconstruction and binds:

- `packet_id` and recomputed `packet_hash`;
- `policy_decision.decision_id`;
- `approval_request.approval_request_id`;
- `approval_decision.approval_decision_id`;
- packet `actor_ref` and `session_ref` as requester identity/session;
- decision `approver_ref` and `approver_session_ref`;
- packet `project_ref`, `resource_refs`, `policy_profile_ref`, and `intent`;
- exact policy `capability_decisions`, not a second capability model;
- packet `source_refs` and any digest references they already carry;
- packet `constraints`, `permission_envelope`, budget, risk, type, idempotency,
  and validity window;
- approval result, reason, issue time, expiry, nonce, and signer identity.

`source_refs` are not relabeled as artifact digests. A source reference counts
as an artifact digest only when its existing scheme and upstream validator
define that meaning. Phase 7a introduces no duplicate `action`, `target`,
`environment`, `artifact`, or configuration field. A future packet version may
add such fields through normal versioning; this wrapper then requires its own
compatible or parallel version.

### Chain Reconstruction

Before signing or accepting a signature, an implementation must:

1. parse every nested record through its exact closed v1 schema;
2. canonicalize and hash the packet, then match `packet_hash`;
3. rederive the policy decision from that packet at its recorded evaluation
   time and require exact canonical equality;
4. rederive the approval request from that policy decision at its recorded
   request time and require exact canonical equality;
5. rederive the approval decision from that request and recorded decision
   input/time and require exact canonical equality;
6. require packet actor/session, policy actor/session, and approval requester
   identity/session equality;
7. require distinct human requester and approver identities;
8. require exact project, resource, profile, capability, reason, source,
   constraint, time, and identifier equality through the chain;
9. require `approval_gate_satisfied` to equal the nested decision value;
10. require every authority-closure field to have its fixed value.

No reference may be trusted from identifier equality alone. Any missing
upstream record, hash drift, semantic mismatch, unsupported version, unknown
field, widened scope, or alternate rederivation fails closed.

### Canonical Payload And Domain Separation

The signed payload is a closed JSON object. It uses
`lnsat.canonical_json.v1_0`:

- recursive object-key order by ascending UTF-16 code units;
- preserved array order;
- UTF-8 output;
- no Unicode normalization;
- safe integers only;
- no duplicate keys, lone surrogates, non-finite numbers, fractions, unsafe
  integers, or negative zero.

Semantically set-valued v1 arrays must already be sorted and unique under their
own contracts. Canonicalization does not reorder arrays.

Let `C` be exact canonical UTF-8 payload bytes and `L` be `len(C)` encoded as
one unsigned 64-bit big-endian integer. The exact signature preimage is:

```text
ASCII("LNSAT-SIGNED-APPROVAL-EVIDENCE-V1") || 0x00 || L || C
```

The ASCII prefix is exactly 33 bytes, uppercase, with ASCII hyphens and no
newline. One zero octet follows it. The length covers only `C`. No BOM,
whitespace, alternate prefix, alternate length width/endianness, prehash mode,
or Unicode normalization is permitted.

`payload_digest` is:

```text
sha256:<lowercase hex SHA-256 of the complete preimage>
```

`signed_approval_evidence_id` is:

```text
sae_<same lowercase hex digest>
```

Neither identifier includes outer `payload_digest`, signature bytes, or
wrapper fields, avoiding a circular identity. All signer metadata and fixed
authority fields are inside `payload`, so substitution changes the digest and
signature preimage.

### Signature Profile

`lnsat.signed_approval_signature.ed25519.v1_0` means:

- pure Ed25519 from RFC 8032, not Ed25519ctx, Ed25519ph, Ed448, X25519, or a
  generic `EdDSA` selector;
- signature over the exact domain-separated preimage above;
- decoded verification message bounded to 1,048,576 octets before allocation or
  cryptographic work;
- exactly 64 signature octets;
- RFC 4648 base64url without `=` padding or whitespace;
- canonical round-trip encoding with zero unused pad bits;
- public verification key encoded as DER SubjectPublicKeyInfo;
- SubjectPublicKeyInfo algorithm OID exactly `1.3.101.112` (`id-Ed25519`);
- AlgorithmIdentifier parameters absent;
- DER bytes encoded as canonical unpadded base64url.

Validators reject aliases, case variants, extra algorithm parameters, raw-key
substitution, PKCS#8/private material, PEM text, padded/noncanonical base64url,
wrong decoded lengths, trailing bytes, noncanonical `S`, invalid/small-order
points, and verification APIs that accept a weaker equation. Rust verification
must use strict RFC 8032-equivalent checks. `ed25519-dalek` `3.0.0` is approved
with `default-features = false`, explicit weak-key rejection, and
`VerifyingKey::verify_strict`. TypeScript remains runtime-neutral behind a
public-only provider boundary; Node 22 conformance uses
`crypto.verify(null, exact_message, public_spki, signature)`. Provider
exceptions collapse to a closed rejection, and structural failures never call
the provider.

`VerifyingKey::from_bytes` documents ZIP-215 point validation rather than
direct RFC 8032/NIST criteria. LNSAT therefore does not treat it or
`verify_strict` alone as universal proof. Acceptance requires the exact
structural profile above plus agreement on the pinned shared corpus. No custom
curve arithmetic, `legacy_compatibility`, `hazmat`, batch, prehash/context,
random, PEM, or PKCS#8 feature is approved.

Ed25519 is selected independently for broad Node/Web Cryptography and Rust
library support, fixed key/signature sizes, and the standardized RFC 8032
profile. The separate mobile-edge profile grants no compatibility alias and
shares no key namespace.

### Public Verification Material

Public material is an immutable, secret-free record:

```text
contract_version
schema_id
verification_material_ref
signing_key_id
signing_key_version
signature_profile
public_key_spki_base64url
valid_from
sign_until
verify_until
supersedes_key_version
side_effects: []
```

`signing_key_id` is a stable logical lineage reference matching:

```text
^key:approval-signing:[^\s\u0000-\u001F\u007F]{1,216}$
```

`signing_key_version` is a canonical positive decimal string matching:

```text
^[1-9][0-9]{0,9}$
```

Versions increase numerically without reuse within one `signing_key_id`.
`verification_material_ref` is:

```text
avm_<lowercase SHA-256 of canonical immutable public-material body>
```

The material body excludes only `verification_material_ref`. It contains no
private key, seed, recovery value, key handle with secret-bearing content, or
credential. Evidence pins all three of key id, version, and material ref.

Lifecycle status is separate append-only authoritative state with a monotonic
revision, trusted `as_of`, `next_update`, and exactly one state:
`preactive`, `active`, `retired`, or `revoked`. Cached state is acceptable only
while `verified_at < next_update` and its revision is not below the verifier's
pinned minimum. Missing, rolled-back, or stale status fails closed.

### Rotation, Retirement, And Compromise

- Exactly one key version may sign for a lineage at any instant.
- A new public version is published as `preactive` before cutover.
- At cutover, the new version becomes `active`; the prior version becomes
  `retired`. Verification overlap is allowed; signing overlap is not.
- Evidence must use the numerically designated active version at `issued_at`.
  A lower, retired, future, or substituted version is a downgrade and fails.
- Retired keys cannot sign new evidence. Existing evidence issued before
  retirement may verify until evidence expiry and `verify_until`.
- Revocation is immediate. A revoked key version invalidates all evidence
  under that version, including evidence issued before `revoked_at`; no trusted
  timestamp service exists to narrow compromise safely.
- A compromised lineage requires a new version, revocation evidence, operator
  incident handling, and new human approval. Existing decisions are not
  silently re-signed.
- Destruction, recovery, escrow, backup, HSM, OS key store, and custody
  mechanics require a separate implementation and operator ADR.

Verification material must be active at `issued_at`, permit signing through
`issued_at`, and permit verification through the signed evidence expiry.

### Issue Time, Expiry, Nonce, And Replay

`issued_at` is trusted canonical Gateway time satisfying:

```text
approval_decision.decided_at <= issued_at < approval_decision.expires_at
```

The signed evidence `expires_at` must exactly equal the nested stable approval
decision `expires_at`. Signing cannot extend, refresh, or reset inherited
packet, policy, request, or decision expiry.

`nonce_id` has exact form:

```text
nonce_<64 lowercase hexadecimal characters>
```

It represents 256 bits generated by an approved operating-system CSPRNG. Phase
7a defines no generator. Future issuance must persist one globally unique
nonce and one `signed_approval_evidence_id` per
`approval_decision_id` atomically. Exact retry returns the same evidence,
nonce, digest, key version, and signature. A second evidence record for one
decision, nonce reuse, or one nonce mapped to another decision fails closed.

Signed approval evidence is immutable evidence, not a consumable token.
Repeated verification of the same record is idempotent, not authority replay.
Presentation after expiry/revocation or with any altered binding fails.
One-time execution consumption remains a separate future contract.

### Dynamic Revocation

Operational verification at trusted `verified_at` requires current local
authoritative status for:

- requester identity and requester session;
- approver identity and approver session;
- policy decision/profile;
- approval request and approval decision;
- signing key version and verification-material status;
- evidence nonce uniqueness and decision-to-evidence uniqueness.

Expiry or revocation of either identity/session, policy, approval, evidence,
or key makes `verified: false` for future authority use even when signature
math remains valid. Verification may retain bounded
`cryptographic_signature_valid: true` for audit diagnosis, but it must never
convert that fact into `approval_gate_satisfied` or execution authority.
Unavailable revocation truth fails closed.

### Closed Verification Result

Success shape:

```text
contract: lnsat.signed_approval_verification.v1_0
contract_version: lnsat.contracts.v1_0
ok: true
status: verified
signed_approval_evidence_id
payload_digest
signing_key_id
signing_key_version
verification_material_ref
verified_at
cryptographic_signature_valid: true
chain_valid: true
current_status_valid: true
approval_gate_satisfied
server_signed: true
execution_authorized: false
session_authority_state_changed: false
mutation_authority: false
errors: []
side_effects: []
```

Failure uses the same fixed authority fields with `ok: false`,
`status: rejected`, identifiers set to validated values or `null`,
`cryptographic_signature_valid`, `chain_valid`, and
`current_status_valid` defaulting false, and one or more closed errors. Error
codes are exactly:

```text
signed_approval.invalid_json
signed_approval.invalid_type
signed_approval.unexpected_field
signed_approval.missing_field
signed_approval.input_too_large
signed_approval.input_too_deep
signed_approval.unsupported_contract
signed_approval.unsupported_schema
signed_approval.unsupported_canonicalization
signed_approval.unsupported_digest
signed_approval.unsupported_signature_profile
signed_approval.invalid_field
signed_approval.invalid_time_window
signed_approval.invalid_nonce
signed_approval.chain_invalid
signed_approval.chain_substitution
signed_approval.payload_digest_mismatch
signed_approval.evidence_id_mismatch
signed_approval.verification_material_unavailable
signed_approval.verification_material_stale
signed_approval.key_unknown
signed_approval.key_version_downgrade
signed_approval.key_inactive
signed_approval.key_retired
signed_approval.key_revoked
signed_approval.signature_malformed
signed_approval.signature_invalid
signed_approval.nonce_replayed
signed_approval.requester_session_revoked
signed_approval.approver_session_revoked
signed_approval.policy_revoked
signed_approval.approval_revoked
signed_approval.evidence_expired
signed_approval.verification_unavailable
```

Phase 7b keeps this Phase 7a list canonical. Structural verification-material
failures use the existing general codes: missing and unknown fields use
`missing_field` and `unexpected_field`; unsupported contract, schema, and
signature profiles use their matching `unsupported_*` codes; malformed
remaining fields use `invalid_field`; immutable material or payload binding
drift uses `chain_substitution`; and a material window that does not cover
evidence issue and expiry uses `key_inactive`. Implementation-only aliases such
as `evidence_identity_mismatch`, `key_malformed`, `key_substituted`, or
`key_not_active` are not contract codes. Shared TypeScript/Rust conformance
freezes the exact ordered list above.

Detailed errors are local trusted evidence. Any future unauthenticated or
low-trust transport must collapse them to one route-specific generic denial.
Errors contain only fixed messages, bounded JSON Pointer paths, and codes;
they never echo hostile values, signature bytes, raw keys, session values, or
secret-bearing input.

### Hostile Input And Redaction

Future parsers must reject before cryptography:

- input above 1,048,576 UTF-8 bytes;
- nesting deeper than 64 containers;
- invalid UTF-8, duplicate keys, unknown fields, lone surrogates, negative
  zero, fractions, unsafe integers, or non-finite values;
- invalid nested v1 records, unsorted sets, oversized strings, and secret-like
  fields already forbidden by packet validation;
- private-key, seed, password, bearer, CSRF, credential, or raw secret fields
  anywhere in the wrapper or verification material.

Public evidence contains references and approved digests only. Logs and audit
errors record code, bounded path, evidence id, and key id/version when those
values validated; otherwise they record `null`. Cryptographic work occurs only
after structural, size, canonicalization, time, and key-profile validation.

### Conformance Vectors

Phase 7b must define deterministic JSONL vector manifests. Each case contains:

```text
case_id
raw_evidence_json
verification_material
status_snapshot
verified_at
expected_result
expected_canonical_payload_base64url
expected_preimage_base64url
expected_payload_digest
expected_evidence_id
```

Positive cases may include public SPKI bytes and signatures. They must not
include private keys, seeds, generated-key fixtures, credentials, or production
material. Negative cases cover at minimum:

- every chain-field substitution and self-approval;
- project/resource/capability/source/constraint widening or drift;
- packet/policy/request/decision identifier and digest substitution;
- expiry boundaries and revoked requester/approver/policy/approval;
- duplicate key, unknown field, lone surrogate, negative zero, unsafe number,
  depth, and size limits;
- canonical key-order and array-order disagreements;
- alternate domain prefix, length, encoding, normalization, or prehash;
- algorithm/profile confusion and mobile-profile substitution;
- wrong OID, present AlgorithmIdentifier parameters, raw/PKCS#8 key
  substitution, malformed DER, and trailing bytes;
- padded or noncanonical base64url, signature length, noncanonical scalar,
  invalid/small-order public key or `R`, and payload/signature malleability;
- unknown, stale, future, retired, downgraded, revoked, or substituted key
  material;
- nonce reuse and one-decision/multiple-evidence conflict.

TypeScript and Rust must consume identical bytes and produce the exact same
closed result. Verification-only implementation cannot ship until all positive
and negative vectors pass.

Phase 7c also defines
`fixtures/contracts/ed25519-verification-v1_0.jsonl`. Each line carries only:

```text
case_id
source
source_revision
public_key
message
signature
expected_result
rejection_class
```

It contains 28 public-only cases: 4 accepted and 24 rejected. RFC 8032 supplies
public pure, context, prehash, and Ed448 cases. Imported C2SP Wycheproof cases
pin commit `b61843a9a5115bb758134b6a1f5d5e502d445342`,
`ed25519_test.json` SHA-256
`70471c053c711731f2195ef4875b60ea7f5d6793939d99058ac12da810cb8e00`,
and Apache-2.0 `LICENSE` SHA-256
`58d1e17ffe5109a7ae296caafcadfdbe6a7d176f0bc4ab01e12a689b0499d8bd`.
Tests are network-free. No secret or generated signing material is included.

Dependency review also ran the complete pinned 150-case Wycheproof Ed25519
corpus against Node 22.22.0/OpenSSL 3.5.4 and
`ed25519-dalek` `3.0.0` `verify_strict`: both accepted 88 and rejected 62 with
no disagreement. The committed 28-case subset freezes required profile,
malleability, point, algorithm-confusion, and encoding boundaries; this
empirical agreement is not a claim that ZIP-215 and RFC 8032 are universally
identical.

Crate review approved exact `ed25519-dalek` `3.0.0` (BSD-3-Clause, MSRV 1.85)
under the Dalek Ed25519 maintainer team. Its 46-version crates.io history spans
2016-12-09 through the 2026-07-06 `3.0.0` release. The manifest disables
defaults and enables no optional feature. Lockfile additions are only
`ed25519-dalek`, `curve25519-dalek`, `curve25519-dalek-derive`, `ed25519`,
`signature`, `fiat-crypto`, `rustc_version`, and `semver`; existing locked
SHA-2/digest support is reused.

RustSec advisory database commit
`29638ff054fdbb83d2844240f7ef7e576cb52629` reports three matching historical
advisories in the complete verifier dependency subtree:
`RUSTSEC-2022-0093` is patched by `ed25519-dalek >=2`,
`RUSTSEC-2024-0344` is patched by `curve25519-dalek >=4.1.3`, and
`RUSTSEC-2021-0100` affected only `sha2 0.9.7`. Pinned versions `3.0.0`,
`5.0.0`, and `0.11.0` are outside those ranges. `cargo-audit` was not installed
and was not installed implicitly.

## Standards And Implementation Evidence

Sources reviewed 2026-07-27:

- [RFC 8032](https://www.rfc-editor.org/rfc/rfc8032.html) defines pure Ed25519,
  64-byte signatures, encodings, and verification requirements.
- [RFC 8410](https://www.rfc-editor.org/rfc/rfc8410.html) defines Ed25519
  SubjectPublicKeyInfo OID and requires absent algorithm parameters.
- [RFC 8785](https://www.rfc-editor.org/rfc/rfc8785.html) documents deterministic
  JSON serialization, UTF-16 property sorting, preserved strings, and UTF-8
  output. LNSAT keeps its stricter safe-integer input subset.
- [RFC 4648](https://www.rfc-editor.org/rfc/rfc4648.html) defines base64url and
  canonical pad-bit requirements.
- [FIPS 186-5](https://csrc.nist.gov/pubs/fips/186-5/final) includes EdDSA in
  the Digital Signature Standard and documents signature assurance goals.
- [NIST SP 800-57 Part 1 Revision 5](https://csrc.nist.gov/pubs/sp/800/57/pt1/r5/final)
  supplies key-lifecycle, metadata-protection, cryptoperiod, and compromise
  guidance.
- [Node.js 22.22 Crypto](https://nodejs.org/download/release/v22.22.0/docs/api/crypto.html)
  documents `crypto.verify`, `null` digest semantics for Ed25519, and SPKI
  public-key import.
- [`ed25519-dalek` `VerifyingKey`](https://docs.rs/ed25519-dalek/latest/ed25519_dalek/struct.VerifyingKey.html)
  documents ZIP-215 key parsing, weak-key detection, and strict verification.
- [C2SP Wycheproof](https://github.com/C2SP/wycheproof) supplies pinned public
  verification vectors and Apache-2.0 provenance.
- [EdDSA validation-criteria research](https://eprint.iacr.org/2020/1244)
  documents interoperability and malleability differences among verification
  equations.

## Threat Decisions

| Threat                                      | Required rejection or control                                                |
| ------------------------------------------- | ---------------------------------------------------------------------------- |
| Forged signature                            | Exact Ed25519 strict verification over exact preimage                        |
| Algorithm confusion                         | One literal signature profile; all aliases and alternate modes rejected      |
| Key substitution                            | Signed key id/version/material ref plus exact SPKI profile                   |
| Key-version downgrade                       | Numeric lineage version must be designated signer at `issued_at`             |
| Revoked or retired key                      | Revoked always fails; retired verifies only eligible pre-retirement evidence |
| Stale verification material                 | Monotonic status revision and unexpired `next_update` required               |
| Canonicalization mismatch                   | One canonical profile, exact bytes, cross-language vectors                   |
| Signature/payload malleability              | Canonical encodings, strict point/scalar checks, fixed wrapper               |
| Packet/policy/request/decision substitution | Full chain rederivation and canonical equality                               |
| Requester/approver/session substitution     | Exact chain equality plus current session status                             |
| Self-approval                               | Distinct human references required during rederivation and verification      |
| Project/resource/capability widening        | Exact packet/policy/request equality                                         |
| Artifact/source/constraint drift            | Exact packet snapshot/hash; no invented alias fields                         |
| Nonce replay                                | Unique persisted nonce and one evidence per decision                         |
| Approval replay                             | Exact idempotent evidence only; expiry/revocation/scope checks               |
| Expiry boundary                             | `issued_at < expires_at`; verification requires `verified_at < expires_at`   |
| Confused deputy                             | Exact requester, project, resources, profile, capability, and key audience   |
| Hostile error-oracle input                  | Pre-crypto bounds; fixed local errors; generic transport denial              |
| Secret/private-key leakage                  | Public material only; forbidden private/credential fields                    |
| Signed evidence mistaken for authority      | Fixed false authority fields; separate future execution contract             |

## Compatibility

- Existing approval request, approval decision, Gateway response, database,
  fixtures, and hashes remain unchanged.
- No existing `server_signed: false` field changes.
- No implicit unsigned-to-signed upgrade exists.
- No signed-to-unsigned downgrade, fallback, compatibility alias, or mobile
  profile alias exists.
- Unknown wrapper, canonicalization, digest, signature, key-material, or
  verification-result versions fail closed.
- An unsigned decision may be input to a future explicitly authorized signer
  only after full live chain/status validation. It is not signed evidence by
  itself.
- A signed wrapper never authorizes execution, consumption, adapter dispatch,
  mutation, or receipt acceptance.

## Key Custody And Operator Gates

Before runtime signing, a separate approved design must define private-key
generation, import, non-exportability, storage, process access, least
privilege, backup/recovery posture, rotation ceremony, compromise response,
destruction, audit, operator separation of duties, and rollback. Signing must
remain unavailable unless those controls, public-material publication,
revocation freshness, nonce persistence, and tests are all active.

This ADR contains no private material and authorizes none of those operations.

Future provider-neutral signer interfaces do not open these gates. MCP, A2A,
OAuth, SPIFFE, OTel, registry, HSM, or KMS metadata cannot substitute for
approved verification material, authenticated signatures, or execution
authorization. Interoperability planning authorizes no real key, trust root,
signer call, or production verifier.

## Consequences

- Phase 7a freezes one verifiable wrapper without mutating stable decision
  evidence.
- Full-chain embedding increases evidence size but removes ambiguous external
  field reconstruction.
- Current session, policy, approval, key, and nonce state remain required for
  operational acceptance; a mathematically valid signature is insufficient.
- Planned rotation preserves old verification without permitting old-key
  signing.
- Compromise revocation intentionally invalidates all evidence for one key
  version because no trusted timestamp service narrows exposure.

## Deferred Work And Hard Stops

Phase 7b implements verification-only contracts, schemas, public verification
material, exact byte derivation, and shared TypeScript/Rust wrapper vectors.
Phase 7c implements a separate public-only pure Ed25519 primitive and strict
cross-language conformance fixture. Structural wrapper positives deliberately
end in
`signed_approval.verification_unavailable`: their public RFC key/signature bytes
prove encoding and byte parity only, never cryptographic validity over the
LNSAT preimage. Phase 7c does not fabricate that missing signature and does not
wire primitive output into wrapper results.

Still closed:

- runtime signing and signing endpoints;
- private-key generation, values, fixtures, seeds, import, storage, custody,
  rotation, recovery, or destruction;
- npm cryptographic dependencies or Rust verifier-feature widening;
- nonce issuance or persistence;
- production verification or database migrations;
- Gateway response changes;
- approval consumption or execution authorization;
- authorization tokens, atomic consumption, adapters, receipts, packet/action
  writers, policy widening, UI, MCP, CLI, service, provider, infrastructure,
  deployment, release, publication, secrets, production data, or customer
  data.

Any later local persistence design must be reviewed before implementation as
authority-grade storage, not prototype state. It must specify relational
invariants, append-only status history, uniqueness/idempotency and revocation
ordering, transaction isolation/boundaries, indexes, retention,
migration/rollback, backup/recovery, and concurrency/failure tests. No
provisional local database or fixture store may become an authoritative source.
Phase 7d now proposes that docs-only design in
[ADR-0005](ADR-0005_PHASE_7D_ENTERPRISE_LOCAL_PERSISTENCE.md). ADR-0005 changes
no Phase 7 contract or runtime result and authorizes no schema or store work.

`approval_gate_satisfied` remains evidence only.
`execution_authorized`, `session_authority_state_changed`, and
`mutation_authority` remain false. Signed approval evidence grants no execution
capability.
