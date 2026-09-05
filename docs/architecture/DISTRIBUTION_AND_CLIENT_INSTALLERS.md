# Phase 14 Distribution and Thin Installers

- Status: accepted staged v1 plan; initial support profile not selected
- Availability: source contract only
- Current artifacts: none

This plan implements [ADR-0002](ADR-0002_AUTHORITY_LAYER_AND_V1_DISTRIBUTION.md).
Downstream composition follows
[ADR-0003](ADR-0003_OPEN_CORE_EXTENSIONS_AND_MANAGEMENT_PLANE.md).
Cross-phase order follows [product build sequence](../PRODUCT_BUILD_SEQUENCE.md).
Phase 14 proof for every selected support row is required before `v1.0.0`.
Only after required Phases 8, 9, 10, 11, and 13 pass may one explicit
candidate-build authorization select one or two exact
OS/architecture/package rows. Unselected rows stay unsupported and do not block
initial local v1. This plan authorizes planning and tests, not
binary builds, package creation, production signing, publication, installation,
service start, deployment, or live mutation.

## Canonical-Artifact Invariant

LNSAT distribution must work independently of Rangoon. Its own planned wizard
and management UI must satisfy the
[standalone setup gate](../PRODUCT_BUILD_SEQUENCE.md#standalone-setup-and-access-management)
before RC freeze, with per-selected-platform lifecycle proof in Phase 14.
Installing files must not implicitly start the service or activate permissions.
Rangoon and other downstream installers may consume verified, pinned canonical
LNSAT components or use a compatible existing installation; they cannot replace
its ownership proof, approve their own access, or alter core authority behavior.

Canonical CI candidate targets follow. Only explicitly selected rows become
initial release blockers:

| Rust target                 | v1 operating-system evidence                                    |
| --------------------------- | --------------------------------------------------------------- |
| `aarch64-apple-darwin`      | macOS ARM64                                                     |
| `x86_64-apple-darwin`       | macOS Intel                                                     |
| `x86_64-unknown-linux-gnu`  | Ubuntu 24.04, Debian 13, Rocky Linux 9                          |
| `aarch64-unknown-linux-gnu` | Ubuntu 24.04, Debian 13, Rocky Linux 9 where package row exists |

Every canonical `.tar.gz` bundle contains:

- `lnsatd`;
- `lnsatctl`;
- `lnsat` convenience dispatcher;
- bundled Control Center assets;
- empty configuration templates;
- licenses and notices;
- version/build manifest with source revision, target, recipe, and canonical
  component digests.

Every claimed Homebrew, direct tarball, install script, deb, rpm, OCI, or Cargo
wrapper consumes or wraps those exact versioned components. Package managers
must not rebuild product behavior. Tests extract each claimed wrapper and
compare component digests with canonical manifest.

## Candidate Distribution Matrix

No family below is selected yet. Future release packet names exact rows and one
install path per claimed target. Unselected families remain later expansion.

| Family         | v1 contract                                                         |
| -------------- | ------------------------------------------------------------------- |
| Homebrew       | Dedicated tap; `brew install hypler-dev/tap/lnsat`                  |
| Direct         | macOS/Linux `.tar.gz` canonical bundles                             |
| Install script | Downloads target bundle, verifies trust evidence before replacement |
| Debian         | `.deb` validated on Ubuntu 24.04 and Debian 13                      |
| RPM            | `.rpm` validated on Rocky Linux 9                                   |
| OCI            | amd64/arm64 manifest containing canonical server components         |
| Cargo          | `cargo install lnsat` installs bootstrap/verifier only              |

Cargo bootstrap requires an explicit setup command. Setup downloads selected
signed canonical bundle, verifies target, checksum, signature bundle,
provenance, and component map, then installs it. Cargo never compiles product
core.

## Homebrew Contract

- dedicated `hypler-dev/tap`;
- SHA-256-pinned versioned artifacts;
- ARM64 and x86_64 macOS bottles;
- Ubuntu 24.04 Linuxbrew evidence before support claim;
- `brew services` metadata for `lnsatd`;
- no service start during install or upgrade;
- explicit `brew services start lnsat`;
- non-root runtime;
- documented config, data, and log paths;
- clean install, upgrade, rollback, uninstall, and explicit-start tests.

## Linux Package Contract

- `.deb`: Ubuntu 24.04 and Debian 13;
- `.rpm`: Rocky Linux 9;
- x86_64 and arm64/aarch64 only where canonical target/package evidence exists;
- non-root `lnsat` service account;
- configuration under `/etc/lnsat`;
- data under `/var/lib/lnsat`;
- logs through journald or one explicitly documented path;
- systemd unit installed disabled;
- no post-install or post-upgrade daemon start;
- explicit ownership and least-privilege permissions;
- configuration/data preserved on upgrade and uninstall;
- state removed only by explicit purge;
- clean install, upgrade, rollback, uninstall, purge, disabled-state, and
  explicit-start tests.

## OCI Contract

- amd64 and arm64 manifest;
- same canonical `lnsatd` and Control Center component digests;
- non-root UID/GID;
- read-only root filesystem compatibility;
- explicit persistent data volume;
- explicit config injection;
- no credentials, customer state, preconnected integration, or hidden seed;
- health/readiness behavior without implicit external connection.

## Trust Evidence

Every selected canonical and claimed wrapper artifact requires:

- SHA-256 checksum;
- non-production signature rehearsal and verification bundle;
- SPDX JSON SBOM;
- SLSA v1 provenance;
- exact source revision and build recipe;
- canonical component digest map;
- license and notice references;
- reproducibility evidence;
- install, upgrade, rollback, and uninstall evidence;
- non-root and no-auto-start proof.

Signature metadata must identify algorithm, key identity, trust root, issue
time, and revocation/rotation path. Checksums alone do not authenticate.
Production key use remains closed until final release authorization, then may
sign only unchanged Phase 14-proven digests. Any byte change repeats affected
artifact proof.

## Factory-Clean and Runtime Boundaries

Artifacts contain no customer data, credentials, tokens, preconnected
integrations, tenant assumptions, or automatic ingestion. Secrets remain
references. Install never creates provider authority, invokes adapters, changes
DNS/network/storage, or starts service automatically.

Runtime products:

- `lnsatd`: local server and bundled Control Center;
- `lnsatctl`: operator diagnostics and governed operation;
- `lnsat`: stable convenience dispatcher.

Command, local transport, privilege, output, recovery, and service behavior is
defined in [CLI and OS operator interface](CLI_AND_OS_OPERATOR_INTERFACE.md).

MCP extensions, host helpers, SDK packages, and integrations remain separate
artifacts and never become installer trust shortcuts.

## Downstream Composition

Official commercial editions pin exact canonical public-core components plus
separately signed module, connector, UI, policy-pack, or model-package digests.
Edition manifests record compatibility, license/notice, SBOM, provenance,
support, entitlement, update, rollback, and revocation evidence.

Downstream edition may wrap canonical core but cannot rebuild different
authority behavior. Module installation, enablement, capability grant, and
service start remain separate. Public core release and commercial publication
have independent go/no-go gates.

## Later Platform Lanes

Winget, Scoop, MSI, Chocolatey, signed/notarized macOS `.pkg`, and every
unselected matrix row are later lanes, not initial local-v1 blockers.

## Phase 14 Exit

All selected compatibility rows, required trust evidence, applicable
cross-wrapper digest parity, lifecycle tests, non-root checks,
disabled/no-auto-start checks, docs, recovery, rollback, and revocation evidence
pass. Unknown, unselected, or untested rows stay unsupported.

Publication remains a separate explicit go/no-go gate after Phase 14.
