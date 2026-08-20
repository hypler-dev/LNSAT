# Rust Core and TypeScript Control Center Architecture

LNSAT uses TypeScript for current control-plane packages and console surfaces.
Rust owns the versioned deterministic contract foundation plus the first
embedded SQLite durability foundation. Rust adoption remains incremental and
evidence-driven.

## Current Ownership

| Area                          | Current owner                   |
| ----------------------------- | ------------------------------- |
| Packet and evidence contracts | TypeScript packages             |
| Gateway, API, MCP, CLI        | TypeScript packages and apps    |
| Console                       | TypeScript/React                |
| Shared contract foundation    | `crates/lnsat-contracts`        |
| Local credential foundation   | `crates/lnsat-auth`             |
| Embedded SQLite foundation    | `crates/lnsat-store`            |
| Loopback daemon foundation    | `crates/lnsatd`                 |
| Cross-language truth          | fixtures plus conformance tests |

All Rust crates are `publish = false`. The auth crate defines one exact
Argon2id verifier profile plus independent random bearer/anti-CSRF secret
profiles. The store introduces secure local
database bootstrap, migrations, integrity, transaction, online-backup, and
inert-restore evidence plus an exact-one immutable human-owner bootstrap and
hash-only absolute-expiry session/revocation evidence. The
daemon opens and verifies that store before binding one numeric loopback
address, then serves only bounded read-only readiness. No crate introduces
stable `/v1`, HTTP authentication, authenticated Gateway writers, runtime dispatch,
backup/restore commands, automatic activation, remote access, or deployment
behavior.

## Migration Rule

Move a contract into shared Rust ownership only when:

1. semantics and version are stable;
2. TypeScript fixtures cover positive and negative behavior;
3. Rust produces equivalent parse, validation, and serialization results;
4. callers can migrate without weakening fail-closed behavior;
5. compatibility and MSRV policy are documented.

TypeScript remains supported during migration. A language rewrite is not a
reason to change a public contract.

## Toolchain Policy

`rust-toolchain.toml` pins the exact Rust release. Workspace metadata declares
the matching minimum supported version. The approved toolchain source,
checksums, target, user-local roots, and no-root proof are recorded in
`docs/RUST_TOOLCHAIN.md`.

CI installs the exact pin explicitly. Repository scripts never install a
toolchain as a side effect.

## Future Boundary

Stable runtime APIs, product record writers, operator recovery commands,
activation, removable-family cleanup, mobile workers, and adapter dispatch each
require separate architecture and authorization. Loopback readiness does not
open any of them.
