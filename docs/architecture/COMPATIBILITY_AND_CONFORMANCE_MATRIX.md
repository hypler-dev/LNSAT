# Compatibility and Conformance Matrix

- Status: accepted Phase 14 evidence contract
- Availability: source plan only
- Current supported rows: none

No row becomes supported because it appears here. Later release packet selects
one or two exact initial rows. Selected row is supported only when exact release
candidate records all mandatory evidence and passes tests. Unknown, unselected,
missing, partial, or untested rows are unsupported and do not block a narrower
claim.

## Mandatory Evidence Columns

Every selected OS, architecture, and artifact-family row must record:

| Dimension      | Required evidence                                                             |
| -------------- | ----------------------------------------------------------------------------- |
| Identity       | release version, source revision, build recipe, target triple                 |
| Platform       | OS/version, architecture, artifact family, install path                       |
| Runtime        | service mode, runtime user/group, config/data/log paths                       |
| CLI            | command/schema version, exit-code family, local transport, shell/man evidence |
| Components     | canonical `lnsatd`, `lnsatctl`, `lnsat`, Control Center digests               |
| Trust          | SHA-256, signature bundle, SPDX JSON SBOM, SLSA v1 provenance                 |
| Lifecycle      | clean install, upgrade, rollback, uninstall, purge if applicable              |
| Service safety | installed state, disabled-by-default, explicit start, no auto-start           |
| Recovery       | config/data preservation, backup/restore, revocation/disablement              |
| Result         | test refs, known limitations, support status                                  |

## Candidate Canonical Target Rows

| Target                      | Required canonical bundle             | Current status       |
| --------------------------- | ------------------------------------- | -------------------- |
| `aarch64-apple-darwin`      | `.tar.gz` with complete component map | unsupported; unbuilt |
| `x86_64-apple-darwin`       | `.tar.gz` with complete component map | unsupported; unbuilt |
| `x86_64-unknown-linux-gnu`  | `.tar.gz` with complete component map | unsupported; unbuilt |
| `aarch64-unknown-linux-gnu` | `.tar.gz` with complete component map | unsupported; unbuilt |

## Candidate Wrapper Rows

| OS                        | Architecture    | Artifact/install path         | Service mode                    | Current status       |
| ------------------------- | --------------- | ----------------------------- | ------------------------------- | -------------------- |
| macOS                     | ARM64           | Homebrew dedicated tap/bottle | `brew services`, explicit start | unsupported; unbuilt |
| macOS                     | x86_64          | Homebrew dedicated tap/bottle | `brew services`, explicit start | unsupported; unbuilt |
| Ubuntu 24.04              | x86_64          | Linuxbrew                     | `brew services`, explicit start | unsupported; unbuilt |
| macOS                     | ARM64/x86_64    | direct tarball                | operator-managed                | unsupported; unbuilt |
| Ubuntu 24.04              | x86_64/arm64    | direct tarball and `.deb`     | disabled systemd                | unsupported; unbuilt |
| Debian 13                 | x86_64/arm64    | direct tarball and `.deb`     | disabled systemd                | unsupported; unbuilt |
| Rocky Linux 9             | x86_64/aarch64  | direct tarball and `.rpm`     | disabled systemd                | unsupported; unbuilt |
| macOS/Linux selected rows | matching target | verified install script       | no implicit start               | unsupported; unbuilt |
| OCI Linux                 | amd64/arm64     | multi-arch image              | non-root foreground             | unsupported; unbuilt |
| Cargo-supported host      | matching target | bootstrap plus explicit setup | no implicit start               | unsupported; unbuilt |

Architecture variants are required only where canonical target and package
runner evidence both exist. Missing architecture runner evidence leaves that
wrapper row unsupported and blocks a broad package-family support claim.

## Path Contract

| Family                        | Config                          | Data                       | Logs                              |
| ----------------------------- | ------------------------------- | -------------------------- | --------------------------------- |
| Linux deb/rpm                 | `/etc/lnsat`                    | `/var/lib/lnsat`           | journald or documented fixed path |
| Homebrew macOS                | documented Homebrew-prefix path | documented user-owned path | documented user-owned path        |
| Direct tarball/install script | explicit operator config        | explicit operator data     | stderr or explicit path           |
| OCI                           | injected config                 | persistent mounted volume  | stdout/stderr                     |

All paths need ownership, permissions, backup, upgrade, rollback, uninstall,
and purge semantics.

## Cross-Installer Equality

For each release/target:

1. verify canonical manifest and trust evidence;
2. extract or inspect every wrapper;
3. map product components to canonical manifest;
4. compare exact component SHA-256 digests;
5. reject missing, extra-authoritative, rebuilt, or substituted components;
6. record result in release compatibility evidence.

Package metadata and service definitions may differ. Product binaries, bundled
Control Center assets, and version/build identity must not.

## Authority and Security Conformance

Before v1 support:

- transport-neutral MCP/REST/CLI fixtures produce equal canonical action and
  policy evidence;
- authenticated approval validates identity, scope, distinct approver, expiry,
  nonce, and selected `local_session`/external-signature proof requirement;
- replay, CSRF, confused-deputy, prompt-injection, delegation, and
  execution-substitution negatives pass;
- one-time authorization and receipt prove requested digest equals approved
  digest equals executed digest;
- hardware-attestation profiles pass only when claimed by selected support
  profile; they do not block initial local v1;
- adapter compromise cannot widen action, target, artifact, credentials, or
  host access.

Phase 8 adds protocol/framework rows without changing release support claims:

| Adapter profile                | Current evidence             | Support state                           |
| ------------------------------ | ---------------------------- | --------------------------------------- |
| REST packet inspection         | shared Gateway handler tests | experimental, not production-supported  |
| CLI packet inspection          | shared Gateway handler tests | experimental, not production-supported  |
| legacy MCP local stdio         | local/SDK/built-stdio tests  | experimental, not production-supported  |
| MCP 2026-07-28 stdio/HTTP      | official v2 SDK tests        | experimental, not production-supported  |
| FastMCP 3.4.5 / FastMCP 4 beta | isolated interop harnesses   | experimental, not production-supported  |
| A2A 1.0                        | Gateway contract tests       | experimental, not production-supported  |
| OAuth admission                | closed security tests        | experimental, no live provider/listener |
| OTel/SPIFFE evidence           | Gateway contract tests       | experimental, no live infrastructure    |
| Registry/supply-chain          | Gateway contract tests       | experimental, no install/authority      |
| Signer provider                | policy test doubles          | experimental, no signing/key custody    |
| Operation reconciliation       | fixture/API/browser equality | experimental, read-only                 |

Any current or future supported row records protocol/profile version,
dependency integrity, license, provenance, transport, schema dialect,
authentication profile, Gateway fixture equality, downgrade negatives,
outage/recovery results, known limitations, test date, and support owner. See
[Phase 8 adapter authority conformance](PHASE_8_ADAPTER_AUTHORITY_CONFORMANCE.md).

## Package Lifecycle Conformance

Each wrapper row tests:

- clean install from empty host state;
- upgrade with config/data preservation;
- rollback to supported prior version;
- uninstall without unintended state deletion;
- explicit purge where applicable;
- installed-but-disabled state;
- explicit operator service start;
- no install/post-install/upgrade auto-start;
- non-root runtime and least-privilege ownership;
- offline verification and revoked/tampered artifact denial.

## Downstream Compatibility Evidence

Downstream modules, connectors, models, and editions do not become v1 core
rows. Before their own support claim, each records:

- exact public core and contract versions;
- module/connector/model/edition version and component digests;
- capability, data, egress, secret-reference, and authority boundaries;
- universal and model-specific profile compatibility where relevant;
- CLI/API/UI/MCP mapping and canonical proposal/receipt parity;
- signature, SBOM, provenance, license, vulnerability, and publisher identity;
- install, enable, grant, execute, quarantine, update, rollback, remove, and
  revocation evidence;
- support owner, support window, known limitations, and test date.

Entitlement does not replace any compatibility or authority evidence.

## Later-Only Rows

Winget, Scoop, MSI, Chocolatey, and signed/notarized macOS `.pkg` remain
unsupported later lanes and do not block v1.

## Claim Rule

Support claims name exact OS/version, architecture, artifact, service mode, and
evidence revision. Family-wide or “cross-platform” claims are forbidden when
any required row is unknown or untested.

This matrix grants no build, package, signing, publication, installation,
service, deployment, provider, secret, network, storage, or live authority.
