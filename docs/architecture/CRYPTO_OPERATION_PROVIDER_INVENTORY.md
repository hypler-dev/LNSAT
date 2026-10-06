# Crypto Operation And Provider Inventory

Status: source inventory for the requested enterprise and government security
direction. This document records observed operations and boundaries at source
HEAD `a92857ed762f28873990bd1f1a921b104363537e`. It does not select a strict
profile, provider, module, operating environment, key owner, or deployment
configuration. The canonical status record is
[Project Status](../PROJECT_STATUS.md#crypto-operation-provider-source-inventory);
requirements remain in
[Enterprise And Government Security Requirements](ENTERPRISE_GOVERNMENT_SECURITY_REQUIREMENTS.md).

The inventory is based on the secret-free Rust and TypeScript evidence reports
prepared from that exact source basis. It is a bounded source inventory, not an
exhaustive transitive dependency census, runtime inspection, certification,
security assessment, or supported-product claim.

## Scope and maturity

LNSAT is pre-release `0.1.0` source-only software. Gateway remains the
authorization boundary. Protocol adapters do not gain infrastructure authority;
the console remains an experimental read-only preview. Hosted SaaS, fleet/HA,
and multi-tenancy remain outside the selected local V1 scope. This inventory supplies evidence for later strict-profile work and does
not open the Phase 11 execution-closed packet, Docker, host, merge, release,
artifact, deployment, or production actions.

The inventory separates:

- integrated Rust local daemon/store source;
- active Node and Web Crypto local-beta/application and adapter source;
- optional pure verification primitives;
- interface-only provider seams; and
- planned capabilities and unproven runtime or operating-environment facts.

## Rust local daemon and store

### Password derivation and verification

- `crates/lnsat-auth/src/lib.rs:18-40` freezes profile
  `lnsat.argon2id.v1`: Argon2id version 19, 19,456 KiB, two passes, one lane,
  and 32-byte output. Password bounds are 15-128 Unicode scalars and 512 UTF-8
  bytes.
- `crates/lnsat-auth/src/lib.rs:577-592` validates bounds, obtains a random
  `SaltString` from `OsRng`, and produces an Argon2id PHC verifier.
- `crates/lnsat-auth/src/lib.rs:594-640` rejects wrong profile, algorithm,
  version, work factors, missing salt, or wrong output length before verification.
- `crates/lnsat-store/src/owner_bootstrap.rs:17-46,49-118` stores only the PHC
  verifier and profile metadata in the existing SQLite transaction; the prepared
  verifier is owned by `Zeroizing<String>`.
- `crates/lnsatd/src/lib.rs:756-838` composes identity creation and password rotation
  through the auth and store crates.

The observed backend is the Argon2 crate plus its OS salt source. Module
validation, FIPS status, OS crypto-module identity, deployment configuration,
self-tests, and strict-profile binding are unknown.

### Randomness and secret lifecycle

- `crates/lnsat-auth/src/lib.rs:469-517` fills independent 16-byte session ID,
  32-byte bearer secret, and 32-byte CSRF secret values through the
  `rand_core::OsRng` re-export used by Argon2 password-hash support.
  Temporary arrays and the intermediate bearer hex value use zeroizing owners.
- `crates/lnsat-auth/src/lib.rs:530-575,716-748` returns raw session/CSRF
  values once to callers, persists only domain-separated digests, and compares
  verification values with constant-time equality.
- `crates/lnsat-store/src/phase7_nonce.rs:151-180,204-222` obtains a 32-byte
  Phase 7 nonce through `getrandom::getrandom`, then stores SHA-256 state inside
  an immediate transaction.
- `crates/lnsat-store/src/phase7_consumption.rs:27-58,92-220,3594-3600`
  models a 32-byte one-time capability, zeroizes raw wrappers on drop, stores
  digests, and redeems with constant-time comparison.
- `crates/lnsatd/src/lib.rs:982-1034,1135-1174` composes nonce issue and capability
  redemption through the named store paths. Those crypto operations do not
  independently grant dispatch authority; the existing Gateway chain owns it.

Entropy source/module identity, health/self-test evidence, failure
observability, and approved strict-profile binding are not represented by these
APIs.

### Digests and commitments

- Session and CSRF commitments use `domain + NUL + value`, SHA-256, and
  lowercase `sha256:` hex in `crates/lnsat-auth/src/lib.rs:716-748`.
- Store operation, nonce, authorization, consumption, audit, and binding
  records use domain-separated SHA-256. Representative helpers and callers are
  `crates/lnsat-store/src/phase7_persistence.rs:1347-1407`,
  `crates/lnsat-store/src/phase7_nonce.rs:22-28,1171-1255`, and
  `crates/lnsat-store/src/phase7_consumption.rs:33-55,3345-3610`.
- Canonical signed-approval payload and evidence identities use SHA-256 in
  `crates/lnsat-contracts/src/signed_approval.rs:509-529`.
- Runtime/config/payload identity digests include
  `crates/lnsatd/src/runtime_profile.rs:178-205,320-340,520-529` and
  `crates/lnsatd/src/docker_local_execution_payload.rs:260-286`.

These are identity or integrity commitments. They do not establish encryption,
authentication, anti-tamper collection, trusted-host ownership, or a remote
anchor.

### Signature, key references, and custody

- `crates/lnsat-contracts/src/signed_approval.rs:73-155` defines signed-
  approval evidence, public verification material, key IDs/versions, validity
  windows, and references as closed data models.
- `crates/lnsat-contracts/src/signed_approval.rs:531-592` parses RFC 8410
  Ed25519 SPKI, canonical base64url, a 64-byte signature, and weak-key
  rejection, then performs strict public verification.
- [Project Status](../PROJECT_STATUS.md) records this Ed25519 primitive as
  `implemented_not_wired`; it supplies no signer, private material, custody,
  provider call, or runtime authority.

No private-key generation, signing function, KMS/HSM/PKCS#11 call, key import,
custody store, rotation executor, or revocation provider appears in the named
Rust source. Key fields are references and metadata only.

### Transport and storage

- `crates/lnsat-auth/src/lib.rs:125-241,429-467` defines numeric-loopback
  origin, Host/Origin/Fetch Metadata, and CSRF preflight checks; it does not
  open an HTTP route.
- `crates/lnsatd/src/lib.rs:678-838,841-930` composes the local daemon browser/API
  calls. This is source composition, not deployed transport proof.
- `crates/lnsatd/src/product_transport.rs:70-93` rejects every Unix-socket client
  endpoint because live-daemon authentication is absent.
- No TLS crate, configuration, handshake, or certificate validation appears in
  the named Rust manifests or source. Loopback HTTP/TCP is not encrypted-
  transport evidence.
- `crates/lnsat-store/Cargo.toml:16-21` selects bundled SQLite with backup;
  the locked `rusqlite` and `libsqlite3-sys` entries are at
  `Cargo.lock:338-346,516-529`.
- `crates/lnsatd/src/product_recovery.rs:125-199` creates an online-consistent backup
  snapshot and returns SHA-256 file evidence; restore copies to a fresh inert
  destination and verifies bytes.
- `crates/lnsat-store/src/selected_store.rs:38-55,95-105,113-150,188-224`
  proves file ownership, mode, lease, and custody checks.

No SQLite codec, page encryption, backup/envelope encryption, backup-key
reference, or remote backup transport appears in the named Rust source. File
mode, loopback, restore behavior, and backup checksum are not encryption or
FIPS evidence.

## Node, Web Crypto, local-beta, and adapters

### Active local session source

`apps/api/src/local-control-plane-session.ts:1,246-281` uses Node built-in
`createHash`, `randomBytes`, and `timingSafeEqual`. It creates a 16-byte hex
session ID, 32-byte base64url token secret, and 32-byte base64url client proof,
then stores SHA-256 digests and verifies with constant-time comparison at
`:283-287,342-365,391-400`. This is the TypeScript local-beta/PostgreSQL API source. It is distinct from
the Rust daemon/SQLite authentication path; this inventory proves neither token
interoperability nor a shared deployed backend.

### Web Crypto identities and audit integrity

Web Crypto `globalThis.crypto.subtle` SHA-256 derives deterministic policy,
approval, audit, ledger, and request identities in:

- `packages/policy/src/policy-decision-v1.ts:210,357-374`;
- `packages/policy/src/approval-evidence-v1.ts:293-326,424-441,838-854`;
- `packages/audit/src/audit-event-v1.ts:297-304,651-667`;
- `packages/audit/src/audit-ledger-record-digest.ts:42-55,259-264`; and
- `packages/gateway/src/packet-inspection.ts:254-255`.

The ledger digest status is `source_only`. Node `createHash("sha256")` also
appears in `packages/gateway/src/a2a-contract.ts:1,102` and
`packages/gateway/src/registry-supply-chain.ts:1,487-499`. These hashes are
content identity/integrity operations, not encryption, anchoring, or attestation.

### OAuth, PKCE, JWT/JWK, and SPIFFE boundaries

- `packages/mcp/src/oauth-security.ts:21-29,83-232` defines an injected
  `McpBearerTokenVerifier.verifyBearerToken` interface. The adapter receives
  already verified claims and checks bearer location, issuer, audience,
  resource, time, scope, and principal. It does not parse or cryptographically
  verify JWTs, JWKs, or JWKS and does not authorize an action.
- The same file at `:236-330` requires PKCE method `S256`, exact redirect URI,
  and exact state. PKCE S256 here is callback-validation policy; it is not a
  token-signature or provider verification claim.
- `packages/gateway/src/workload-identity.ts:1-13,43-104` defines an injected
  SPIFFE credential verifier for `x509-svid` or `jwt-svid` evidence. It does not
  implement JWT/X.509 cryptographic validation; `spire_dependency_required` is
  false.
- `package-lock.json:1462-1464,1482-1484,1554-1556` contains upstream
  `jose` and `pkce-challenge` entries. No inspected application manifest or
  source import establishes active use. Lockfile presence is not proof of an
  upstream crypto or PKCE provider.

### Approval verification and provider seams

- `packages/policy/src/signed-approval-evidence-v1.ts:627-715` validates
  canonical Ed25519 SPKI, message, and 64-byte signature encoding, then calls
  an injected `Ed25519VerificationProviderV1`. Provider failure becomes
  cryptographic rejection. This is a primitive seam, not a wired production
  verifier.
- `packages/policy/src/signed-approval-evidence-v1.ts:1262-1276` hashes
  approval preimages with Web Crypto SHA-256; no provider identity or FIPS mode
  is selected.
- `packages/policy/src/signer-provider.ts:3-22,133-138,188-210,241-315`
  declares interface-only signer/provider states. Proposed profile labels
  `software_vault`, `pkcs11_3_2`, and `cloud_kms_hsm`, and algorithm labels
  Ed25519, ECDSA P-256 SHA-256, and RSA-PSS SHA-256, are type-level proposals.
  Calls, private-key input, generation, activation, production verification,
  and authority remain disabled; returned signatures are untrusted,
  unverified, unconsumable, and non-authorizing.

### Remote and supply-chain boundaries

- `packages/gateway/src/registry-supply-chain.ts:1-3,47-117` validates public
  HTTPS URL/redirect/resolved-IP evidence and quarantines registry material.
  It does not establish TLS implementation, certificate pinning, mTLS, or
  provider credentials.
- `packages/gateway/src/registry-supply-chain.ts:450-474` checks metadata shapes
  for SPDX/CycloneDX, in-toto/SLSA v1, subject digest equality, and a
  `sigstore-cosign-compatible` profile. These checks do not verify a real
  signature, SBOM, or provenance document.
- `scripts/check-public-history-review-evidence.mjs:780-796,837-881` hashes
  reviewed diff bytes and binds listed raw commit blobs to SHA-256 entries.
  This is source-review evidence, not an artifact-signing operation.
- `docs/RELEASING.md:79-87,125-136` requires future reproducibility,
  signatures, SPDX SBOM, and SLSA v1 provenance. Those artifacts are not
  evidenced here; publication and signing remain separately gated.

## Operation/provider classification

| Operation                        | Observed profile or parameters                             | Direct backend/runtime                                    | Source status and boundary                                          |
| -------------------------------- | ---------------------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------- |
| Password derivation              | Argon2id v19; 19,456 KiB; 2 passes; 1 lane; 32-byte output | Rust `argon2` + OS salt source                            | Integrated local auth/store source                                  |
| Session entropy                  | 16/32/32-byte values                                       | Rust `OsRng`; Node `node:crypto.randomBytes`              | Integrated local source; environment/module unknown                 |
| Phase 7 nonce/capability entropy | 32-byte values                                             | Rust `getrandom::getrandom`                               | Integrated store composition; source-only/not public authority      |
| Credential/session equality      | SHA-256 digests; constant-time compare                     | Rust `sha2`/`subtle`; Node `createHash`/`timingSafeEqual` | Integrated source                                                   |
| Contract/audit identity          | SHA-256                                                    | Web Crypto `subtle.digest`; Rust `sha2`                   | Integrated source; runtime/provider profile unselected              |
| Approval verification            | Ed25519; RFC 8410 SPKI and 64-byte signature checks        | Rust pure verifier; TS injected provider callback         | Optional primitive; not wired/activated                             |
| JWT/JWK/X.509 verification       | Claims and SVID evidence contracts                         | Injected bearer/SPIFFE verifiers                          | Adapter validation; cryptographic verification external/unspecified |
| Signing/custody                  | Proposed Ed25519/ECDSA/RSA-PSS labels                      | Interface-only software vault/PKCS#11/KMS-HSM types       | Planned capability; no calls, keys, custody, or activation          |
| Remote transport                 | Public HTTPS target policy                                 | Existing runtime/network boundary                         | URL policy evidence only; TLS/channel proof absent                  |
| Storage/backup                   | Bundled SQLite; SHA-256 file evidence                      | `rusqlite`/`libsqlite3-sys`; filesystem checks            | Active local store; encryption boundary absent                      |
| Artifact assurance               | SPDX/CycloneDX; in-toto/SLSA; Cosign-compatible shape      | Metadata checks and source blob hashing                   | Shape/source-review checks; no signed artifact proof                |

## Explicit unknowns and later evidence needs

The source reports do not establish a selected strict profile; approved
backend/module/version; FIPS certificate or security policy; operating-system
module and compiled backend; self-test or error-state behavior; entropy health;
MFA or federation provider; TLS/mTLS and certificate policy; SQLite/backup
encryption and key boundary; key owner, custody, rotation, or revocation;
external audit collection or anchoring; signed artifacts, SBOM, provenance,
transparency log, or artifact-signing provider; selected-target OS proof; or
deployed-service configuration.

The Rust report is limited to named manifests/source and its locked package
inventory. The TypeScript report is limited to application/adapters and does
not prove transitive package behavior, Rust/native daemon behavior, Docker,
generated artifacts, production configuration, or deployed services. No
universal absence claim is made from these bounded reads.

## Baseline metadata boundary

The [manual baseline metadata](../reference/crypto-operation-provider-inventory.json)
records immutable source facts tied to the named revision. It is not runtime control,
status truth, provider selection, or an exhaustive transitive crypto census.
`PROJECT_STATUS.md` remains the sole status authority. This document records
only the observed facts and limits above; it creates no new authority or
approval.
