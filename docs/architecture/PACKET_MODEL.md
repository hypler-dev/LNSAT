# Packet Model

Packets are LNSAT's versioned boundary between requested intent and controlled
execution. A packet describes what is requested; it never grants authority by
itself.

## Envelope

Every packet has a stable identity, versioned type, actor and project context,
intent, resource references, risk, policy profile, permission envelope, and
evidence needed for evaluation. Exact executable schemas live in
`packages/packets/src` and are the source of truth.

The stable v1 envelope uses exact contract and schema identities:

```json
{
  "contract_version": "lnsat.contracts.v1_0",
  "schema_id": "lnsat.packet_envelope.schema.v1_0",
  "packet_id": "pkt_example_0001",
  "packet_type": "ExecutionPacket",
  "actor_ref": "identity:agent:example",
  "session_ref": "session:local:example",
  "project_ref": "project:example",
  "intent": "inspect repository state",
  "risk_level": 1,
  "source_refs": ["repo:example"],
  "resource_refs": ["repo:example"],
  "policy_profile_ref": "policy:read_only",
  "permission_envelope": {
    "allow": ["repository.read"],
    "block": ["repository.write"]
  },
  "budget": {
    "tokens": 1000,
    "runtime_seconds": 60,
    "cost_microusd": 0,
    "cpu_millicores": 1000,
    "memory_bytes": 536870912
  },
  "constraints": {},
  "requires_approval": false,
  "idempotency_key": "idem_example_0001",
  "created_at": "2026-07-22T20:00:00Z",
  "expires_at": "2026-07-22T20:01:00Z"
}
```

`validatePacketEnvelopeV1` rejects unknown fields, versions, schemas, packet
types, malformed references, unsorted or duplicate set-like arrays, overlapping
permissions, non-integer budget values, embedded credential values, and invalid
time windows. Validated envelopes canonicalize with sorted object keys,
preserved array order, no Unicode normalization, safe integers only, and UTF-8
encoding. `hashPacketEnvelopeV1` hashes those bytes with SHA-256 and returns
`sha256:<lowercase_hex>`.

The earlier `version: "0.1"` universal-packet parser remains a separate
pre-release compatibility surface. v1 never upgrades or downgrades that shape
implicitly. The authoritative v1 vector is
`fixtures/contracts/packet-envelope-v1_0.json`.

Examples explain structure only. Use exported validators and fixtures when
building integrations.

## Contract Families

- intent and execution packets;
- policy, approval, and authorization evidence;
- audit ledger records and append attestations;
- knowledge records, source references, search results, and context bundles;
- substrate inventory, capability, adapter, and readiness evidence;
- onboarding, session, hardware, and telemetry inspection records.

## Validation Rules

- Reject unknown schema versions and packet types.
- Reject malformed identifiers, unsupported enum values, and invalid bounds.
- Keep source, resource, and citation references explicit.
- Never accept raw credentials in fields intended for references.
- Preserve immutable packet identity through decisions and audit records.
- Treat absence of approval as denial when approval is required.
- Do not infer execution permission from a successful parse.

## Lifecycle

```text
draft -> validated -> policy evaluated -> approved or blocked -> audited
```

An adapter invocation may follow only when an authorization bundle proves each
required gate. Inspection-only packets end after evidence is returned.

## Evolution

Contract changes must update:

1. TypeScript types and validators;
2. shared fixtures and negative cases;
3. Rust contract representation when applicable;
4. conformance tests;
5. documentation and changelog.

Do not repurpose an existing field with new semantics. Introduce a versioned
field or contract instead.
