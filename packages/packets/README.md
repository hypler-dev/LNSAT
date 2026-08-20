# `@lnsat/packets`

Versioned packet and governance contracts for LNSAT.

This workspace owns schema types, validators, identifiers, permission
envelopes, approval evidence, release evidence, knowledge records, substrate
records, and related fail-closed contract families.

Packets describe intent and evidence; they do not grant authority.

The stable v1 packet envelope is exported through `parsePacketEnvelopeV1Json`,
`validatePacketEnvelopeV1`, `canonicalizePacketEnvelopeV1`, and
`hashPacketEnvelopeV1`. It uses exact contract/schema identities, shared
positive/negative parser vectors, and a shared digest vector. The pre-release
`version: "0.1"` parser remains separate; neither shape is converted implicitly.

The stable v1 error envelope is exported through
`contractErrorEnvelopeV1Contract`, `ContractErrorEnvelopeV1`,
`ContractErrorV1`, and `createContractErrorV1`. Version, packet, policy,
approval, and audit failures share its code/path/message/severity shape, null
family result, and empty side effects. Codes and paths are compatibility
identity; human messages may improve without reflecting rejected raw input.
The Rust deterministic core maps the same six shared family vectors and keeps
audit-idempotency errors in their separate closed result contract.

`contractCompatibilityMatrixV1` is the authoritative seven-family compatibility
map. It freezes exact-match negotiation, closed-shape posture, evidence
identity, replay/idempotency, stale-evidence behavior, and explicit audited
migration requirements without granting runtime authority.

Exported source-status metadata uses neutral values: `source_only`,
`contract_only`, or `read_only_inspection`. Earlier milestone-coded values had
no repository consumers beyond the package barrel, so no compatibility aliases
are retained. Existing versioned contract identifiers and serialized evidence
references remain unchanged; the v1 envelope is a new parallel family.

## Develop

```sh
npm run typecheck -w @lnsat/packets
npm run test -w @lnsat/packets
npm run build -w @lnsat/packets
```

Contract changes require versioning review, negative tests, shared fixture
updates when applicable, and documentation. See
[packet model](../../docs/architecture/PACKET_MODEL.md) and
[contract versioning](../../docs/reference/CONTRACT_VERSIONING.md).
