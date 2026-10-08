# Local Development

This guide covers source-only development. Commands below do not publish
packages, deploy services, install system toolchains, or connect production
infrastructure.

## Prerequisites

| Tool       | Required version | Source of truth                            |
| ---------- | ---------------- | ------------------------------------------ |
| Node.js    | 22.22.3          | `package.json#engines` and CI              |
| npm        | 10.9.8           | `package.json#packageManager`              |
| Rust       | 1.97.1           | `rust-toolchain.toml`                      |
| PostgreSQL | Optional         | Disposable loopback integration tests only |

Confirm active versions before installing dependencies:

```sh
node --version
npm --version
rustc --version
cargo --version
```

Rust installation is explicit operator work. Recorded official sources,
checksums, target, user-local roots, and no-root proof live in
[Pinned Rust Toolchain](RUST_TOOLCHAIN.md).

Rust source checks require a configuration-free selected Cargo home and physical
repository ancestors. They reject either `config` or `config.toml` at the selected
home, ancestor `.cargo` configuration, legacy repository `.cargo/config`, and
named compiler, target, source, registry, profile and configuration overrides
before invoking Cargo or rustc. The repository's regular, non-symlink
`.cargo/config.toml` must match the reviewed offline SQLite FILESTAT configuration.
The scripts never edit or remove operator configuration. A trusted developer
host and toolchain remain prerequisites; this gate does not attest a release.

## Install

From repository root:

```sh
npm ci
```

Use `npm ci`, not `npm install`, for reproducible work from `package-lock.json`.
Do not edit `node_modules`, generated `dist`, Next.js output, Cargo `target`, or
local database state.

## Common Commands

| Command                              | Purpose                                                           |
| ------------------------------------ | ----------------------------------------------------------------- |
| `npm run format:check`               | Check repository formatting                                       |
| `npm run typecheck:workspaces`       | Typecheck all npm workspaces                                      |
| `npm run test:workspaces`            | Build contract dependencies and run workspace tests               |
| `npm run build`                      | Build every buildable workspace                                   |
| `npm run rust:check`                 | Rust format, clippy, tests, metadata, and TS/Rust conformance     |
| `npm run public:check`               | Check paths, docs links, licenses, secrets, and source boundaries |
| `npm run docs:direction:check`       | Check product direction across every tracked Markdown file        |
| `npm run mcp:official-conformance`   | Run available official MCP conformance plus SDK tests             |
| `npm run security:conformance:check` | Verify security negative-case ledger coverage                     |
| `npm run phase7d:truth:check`        | Verify closed signing/runtime/migration authority gates           |
| `npm run check`                      | Run public, migration, type, test, and Rust gates                 |
| `npm run source:check`               | Run complete public-source validation and builds                  |
| `npm run release:check`              | Add strict supported-release evidence; currently expected to fail |

Use workspace commands for focused iteration:

```sh
npm run test -w @lnsat/packets
npm run test -w @lnsat/policy
npm run test -w @lnsat/audit
npm run test -w @lnsat/api
npm run test -w @lnsat/mcp
npm run typecheck -w @lnsat/console
npm run mcp:negotiation:test
npm run operation:recovery:test
npm run control-center:readback:test
```

Run root checks before submitting a pull request because contract packages are
shared by API, MCP, CLI, and console workspaces.

## Professional testing workflow

The [professional testing strategy](PRODUCT_BUILD_SEQUENCE.md#professional-testing-strategy)
defines the accepted direction. Use focused positive/negative contract tests and
existing deterministic properties now; replay relevant retained regressions when
their component changes. Record exact commands and revisions, and run the normal
full source suite for meaningful source changes.

Coverage-guided tooling remains planned. The first candidate is an isolated
cargo-fuzz/libFuzzer execution-request parser and stale-evidence harness with a
reviewed local corpus, explicit oracles and bounded resources. Its dated
nightly/sanitizer runner and locked dependencies will be separate from the normal
Rust 1.97.1 lane. This documentation supplies no installation command, scheduled
job or executed campaign. Tool provisioning, CI activation and native qualification
require their own exact packets; validation scripts must never install implicitly.

When a harness exists, reproduce failures using the retained revision, seed/corpus,
toolchain and resource limits; minimize each failure and add a permanent regression
after correction. Keep state-machine, concurrency and crash/restart evidence
separate from parser fuzz results. Successful parsing is not approved execution,
and source tests are not real runtime or package qualification.

For applicable future packets, follow the
[standards-informed build requirements](PRODUCT_BUILD_SEQUENCE.md#standards-informed-build-requirements):
record risk/trust boundaries, accountable owner, accepted contract, exact
source/artifact identity, positive and denial checks, evidence, gaps and risk
disposition. Reuse existing contracts/tests and retain honest implementation states.
Review secret and PII handling, truthful CLI/API/SDK feedback, dependency/tool
integrity and recovery consequences within the owned scope. This is engineering
evidence planning; standards conformance, management systems and certification
require separate assessments. No standards tool installation, account creation,
external submission or runtime qualification is introduced here.

## Repository Ownership

| Path                     | Owns                                                            |
| ------------------------ | --------------------------------------------------------------- |
| `packages/packets`       | Versioned schemas, validators, and governance contracts         |
| `packages/policy`        | Deterministic decisions and approval requirements               |
| `packages/audit`         | Audit evidence, idempotency, migrations, and writer boundaries  |
| `packages/gateway`       | Transport-neutral Gateway packet-inspection handler             |
| `apps/api`               | Gateway inspection and loopback control-plane composition       |
| `packages/mcp`           | Read-only MCP translation and local stdio transport             |
| `packages/cli`           | Current packet CLI; future `lnsat` and `lnsatctl` client source |
| `apps/console`           | Static, fixture-backed product UI                               |
| `crates/lnsat-contracts` | Minimal Rust contract representation                            |
| `crates/lnsat-store`     | Embedded SQLite bootstrap, migration, and integrity foundation  |
| `crates/lnsatd`          | Loopback-only daemon and bounded readiness foundation           |
| `fixtures/contracts`     | Shared cross-language golden vectors                            |

## Changing Contracts

1. Change owning type and validator together.
2. Add positive, boundary, malformed, and unsupported-version tests.
3. Update shared fixtures when cross-language behavior changes.
4. Preserve existing versions or provide migration guidance.
5. Update architecture or SDK docs and `CHANGELOG.md`.
6. Run focused workspace tests, then `npm run source:check`.

Interfaces should translate input and output, not duplicate policy or
authorization logic.

## Control Center

```sh
npm run dev -w @lnsat/console
```

Current routes are dashboard, knowledge, packets, agents, approvals, audit,
operations, substrates, readiness, and settings. Operation reconciliation uses
synthetic evidence and keeps retry controls disabled. Views perform no network,
database, dispatch, or runtime mutation.

## Optional PostgreSQL Integration

Local-beta scripts target disposable loopback PostgreSQL only. Read script help
and test source before starting a database process. Never point them at shared,
production, or customer data. Database setup never runs as part of standard
`check` or `source:check`.

`.env.example` documents optional state-directory and port overrides. Scripts
do not load it automatically or accept production connection strings from it.

## Troubleshooting

### Node version mismatch

If tests use an unexpected Node runtime, fix shell `PATH` and confirm
`node --version` reports Node 22 before running npm commands.

### Missing Rollup optional binary

If Vitest reports a missing platform-specific Rollup module, confirm Node and
npm versions, then restore dependencies from lockfile:

```sh
npm ci
```

Do not delete or regenerate `package-lock.json` as a troubleshooting shortcut.

### Rust tool unavailable

Rust scripts disable implicit installation and network access. Install pinned
toolchain explicitly, or point `LNSAT_RUSTUP_HOME` and `LNSAT_CARGO_HOME` at
recorded user-local roots. See [Pinned Rust Toolchain](RUST_TOOLCHAIN.md).

## Before Pull Request

```sh
npm run source:check
npm run audit:dependencies:check
git diff --check
```

Record exact commands and results in pull request. Document compatibility,
security, data-handling, migration, and rollback impact.

The dependency and signature audit wrappers use a bounded private snapshot of
the root/workspace manifests, lockfile, installed dependency trees, and exact
project npm configuration. The audit child receives a fresh private cache and
an allowlisted environment; it cannot reuse the operator's npm cache or project
configuration through that environment. Snapshot construction rejects links
that escape the snapshot and fails before audit on unsupported input or size
limits. The wrapper removes its snapshot after the child completes.

The default snapshot requires a POSIX temporary-directory chain owned by root
or the current operator, without group/other write access except root-owned
sticky directories. The leaf identity is rechecked before launch. Workspace
staging and installed dependencies share entry, byte, and time limits. A Windows
snapshot remains denied until an equivalent directory-custody profile exists.
This protects audit inputs; it does not isolate arbitrary processes running as
the same operator.

These commands contact `https://registry.npmjs.org/` and send dependency
metadata. They do not provide an offline vulnerability verdict. Reviewers can
run `npm run audit:dependencies:test` without contacting the registry; passing
those wrapper tests does not establish a clean live audit.
