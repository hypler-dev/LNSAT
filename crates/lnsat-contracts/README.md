# `lnsat-contracts`

Rust representation of exact-match LNSAT contract-version validation, stable
packet JSON parsing/schema validation, canonical serialization, hashing,
policy evaluation, approval evidence, and cross-language golden-vector evidence.
Stable audit-event source-chain validation and deterministic audit idempotency
classification are included.

Phase 7b also parses the closed signed-approval wrapper, rederives its complete
stable source chain, validates immutable public Ed25519 SPKI material, and
derives the exact canonical payload, domain-separated preimage, digest, and
evidence identity shared with TypeScript.

Phase 7c adds a separate public-only pure Ed25519 primitive. It accepts only the
exact RFC 8410 SPKI envelope and canonical base64url fields, extracts 32 public
key bytes, rejects weak keys, and uses `ed25519-dalek` `3.0.0`
`verify_strict` with default features disabled. Verification messages are
bounded to 1 MiB before decoding. The 28-case shared fixture has 4 accepted and
24 rejected cases and matches Node 22 classification exactly.
This primitive does not verify the operational signed-approval wrapper. The
crate does not sign, generate keys, persist nonce/status state, or authorize
execution.

Crate exists for cross-language conformance and remains unpublished. TypeScript
contracts remain broader than current Rust surface. The crate also verifies
SHA-256 identities for the stable packet-policy-approval-audit evidence chain
from exact shared UTF-8 preimages. Packet parsing and canonical serialization
are deterministic and side-effect free. Canonical output recursively sorts
object keys by UTF-16 code units, preserves array order and Unicode, and permits
safe integers only. Packet hashing uses SHA-256 over those exact UTF-8 bytes and
returns `sha256:<lowercase_hex>`. Permission envelopes require sorted, unique,
non-overlapping allow/block sets. Policy evaluation is deny-first,
validity-window-bound, deterministic, and side-effect free. Approval request
and human-decision evidence is content-bound and never authorizes execution.
Public reference and canonical UTC checks expose the same bounded grammar used
by packet validation for other Rust product records.
Audit evidence rebuilds the exact packet-policy-approval chain, enforces
observation ordering, and produces deterministic content identities. Audit
idempotency proposes append for unseen keys, returns exact existing refs for
same-key/same-event replay, and fails closed on collisions or malformed prior
state without writing. Stable Rust failures map to the same six-family
public-safe error envelope as TypeScript, including exact null result fields,
code/path identity, nonempty messages, and empty side effects. Audit
idempotency keeps its distinct closed result shape. Audit persistence,
authentication, networking, and daemon authority remain outside implemented
surface.

The stable target is `lnsat.contracts.v1_0`. Deprecated `v0_1` remains accepted
only for its documented compatibility window. Unknown versions and noncanonical
syntax fail closed; no implicit downgrade or range negotiation exists.

## Verify

Run from repository root with pinned Rust toolchain already installed:

```sh
npm run rust:check
```

Scripts disable implicit toolchain installation and Cargo network access. See
[Rust toolchain policy](../../docs/RUST_TOOLCHAIN.md) and
[conformance guide](../../docs/sdk/conformance.md).
