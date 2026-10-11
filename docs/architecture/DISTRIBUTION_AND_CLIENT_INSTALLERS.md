# Phase 14 Core Artifacts and Installer Plan

- Status: accepted core-artifact plan
- Availability: source contract only
- Current artifacts: none

This plan implements [ADR-0002](ADR-0002_AUTHORITY_LAYER_AND_V1_DISTRIBUTION.md).
Cross-phase order follows [product build sequence](../PRODUCT_BUILD_SEQUENCE.md).
Phase 14 proof for any selected LNSAT core target is required before a supported
core release; unselected installer/platform breadth is outside LNSAT V1.
Only after required Phases 8, 9, 10, 11, and 13 pass may one explicit
candidate-build authorization select exact LNSAT core OS/architecture rows.
Unselected rows stay unsupported and do not block LNSAT V1. LNSAT selects any
final package/installer rows through an explicit release packet. This plan
authorizes planning and tests, not binary builds, package creation, production
signing, publication, installation, service start, deployment, or live mutation.

## Canonical-Artifact Invariant

LNSAT distribution must work independently through its core, API, and `lnsatctl`;
graphical surfaces are optional and must not be required for headless operation.
The headless setup gate
[headless configuration gate](../PRODUCT_BUILD_SEQUENCE.md#headless-configuration-and-control)
must pass before RC freeze, with per-selected-core-target proof in Phase 14.
Installing files must not implicitly start the service or activate permissions.
Installers consume verified, pinned canonical LNSAT components; they cannot replace
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
- no required graphical console assets;
- empty configuration templates;
- licenses and notices;
- version/build manifest with source revision, target, recipe, and canonical
  component digests.

Homebrew, direct tarball, install-script, deb, rpm, OCI, MSI, or Cargo formats
may consume those exact versioned components, but none is an LNSAT V1 exit
blocker until selected. Any future package must not rebuild product behavior and
must verify core identity against its canonical manifest.

## Candidate Distribution Matrix

No family below is selected yet. A future release packet may name exact rows and
one install path per target. These rows are not LNSAT V1 exit requirements.

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

## Additional Linux Candidate Families

The requested Linux support candidates also include Red Hat Enterprise Linux
(RHEL), Fedora, SUSE Linux Enterprise, openSUSE, AlmaLinux and Amazon Linux 2023.
SUSE enterprise and community releases require distinct rows; none inherits
another distribution's result.
Exact release, support window, architecture, kernel/configuration, required LSM
and policy, runtime/backend and package format must be explicitly selected and
proven. No release numbers or successful compatibility results are assigned here.

These candidates expand planning breadth only. They do not select an initial V1
release row, imply that every LSM-capable distribution is supported, or make all
families new V1 blockers. Rocky evidence cannot certify RHEL or Fedora; SUSE Linux
Enterprise evidence cannot certify openSUSE. Distribution updates require the
selected compatibility and lifecycle evidence to be refreshed as applicable.
The same headless capability checks and no-auto-start contract apply to every
selected row, with no Rangoon-specific enforcement behavior.

## Professional And Prosumer Headless Linux

The Linux scope is professional enterprise/server deployment and advanced
headless/prosumer operation with server-first installation defaults. Candidate
qualification must select exact editions and service configurations where relevant.
A GUI may be installed on a qualified host; its presence alone neither denies
compatibility nor proves readiness. LNSAT remains headless and CLI-managed, with
no required desktop session or graphical configuration. Fedora and openSUSE remain
candidates for this service scope; desktop environments, GUI packaging and
desktop-specific integrations are not feature acceptance requirements. Actual
controls and native associations still require proof on the selected configuration.
Linux Mint, Pop!_OS and EndeavourOS are not selected candidates in this scope.

[Arch Linux](https://archlinux.org/about/) is an owner-selected planning candidate
for advanced operators running the standalone headless service. Its rolling
release model requires an explicitly tested package snapshot, kernel/configuration
baseline and compatibility freshness/update policy. A result for one baseline
does not certify every future rolling update. Arch requires the same real LSM,
policy, non-root runtime and recovery evidence as enterprise candidates; technical
user experience cannot replace required controls.

A future Arch package format is a separate unselected wrapper lane, consuming
canonical components without rebuilding authority behavior. Its dependency and
install/upgrade/rollback/removal semantics must be frozen and proven before
support; DEB/RPM proof does not qualify it. No distro/kernel/package build or host
change is opened here. Arch and all other candidate families remain outside
initial V1 blockers unless an exact release packet selects their rows.

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

## Planned Direction: Governed Dependency Installation

Owner direction permits scoped development dependency restoration from verified
repositories. This permission applies to the current contributor workflow;
LNSAT does not yet implement a general package-install operation. Project Status
owns implementation truth. A future engine contract must be frozen before any
adapter can request installation. Rangoon may present the workflow through an
ordinary adapter; the engine retains policy, approval and evidence decisions.

The proposed contract must bind an exact package/version and complete dependency
closure to approved registry origins, integrity hashes and required signature or
provenance evidence. Download into quarantine with lifecycle scripts disabled;
reject unexpected origins, dependency drift, advisory findings and unavailable
required verification. Registry approval alone cannot authenticate every package
or prove safe code. Never treat a package's repository field as sufficient trust.

Installation approval must separately bind destination, privilege, network,
filesystem and resource limits, expiry and one-use authority. The default lane is
an isolated disposable environment without host administration or credentials.
Packages requiring lifecycle scripts or elevation need a separately frozen,
explicitly authorized operation; never silently enable them. Record bounded
verification, execution and cleanup outcomes without retaining credentials.
Approval to install does not authorize running the installed tool or expanding
its permissions. No installer, sandbox implementation, public API, operation
receipt contract or production capability is added by this direction.

## Planned Feature: Linux Compatibility Qualification

Owner-approved product direction includes the Linux families named in this plan.
The feature is planned, not implemented or supported. Project Status owns its
implementation truth. This plan owns the supporting Phase 14 requirements;
Phase 11 retains runtime-proof authority. Selecting a candidate family is not
selection of an exact release/kernel/package row or authorization to build,
install, change host controls, start a service or publish artifacts.

Compatibility work must cover these independently proven dimensions:

| Dimension                 | Required compatibility work                                                                                                                                                                                                    |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Distribution and release  | Define exact release/update policy, architecture and supported kernel/configuration range. Unknown and untested combinations cannot inherit support from a related distro.                                                     |
| Binary and dependency ABI | Prove canonical component compatibility with the selected libc/dynamic-loader and system-library baseline. Dependency closure and minimum versions belong in the selected build/target evidence.                               |
| Security policy           | Specify the exact required LSM modules, policy and action coverage; verify active and enforcing behavior as the real runtime identity. Review distro-specific policy provisioning separately.                                  |
| Isolation and runtime     | Prove cgroup, namespace, mount/filesystem, seccomp, device and selected runtime/backend controls required by the complete recipe. Resolve real kernel/artifact/provenance pins and genuine native acquisition.                 |
| Service and paths         | Qualify service account, systemd integration, config/data/log ownership and disabled installation state. No implicit daemon start or granted authority.                                                                        |
| Packaging                 | Qualify dependencies, package hooks, immutable component parity and install/upgrade/rollback/uninstall/purge behavior for each selected DEB/RPM row. Freeze offline/chroot and unavailable-observation behavior.               |
| Diagnostics and clients   | Freeze bounded versioned results, redaction, stable reason/exit mappings and CLI rendering in LNSAT; applications consume the same engine contract. Human remediation must not become automatic permission or policy mutation. |
| Drift and recovery        | Recheck current requirements after relevant kernel/policy/runtime changes; prove denial, retained evidence and recovery for unsupported or unverifiable state without retrying an ambiguous consequence.                       |

Security modules and policies are not interchangeable implementations of an
assumed universal restriction. A reviewed SELinux policy and an AppArmor profile
need separate coverage/equivalence evidence for the selected consequence; a
common module name across distributions does not prove identical policy.
Release-sensitive defaults illustrate why selection must include configuration:
[SUSE documents SLES 15 AppArmor versus SLES 16 SELinux enforcing](https://www.suse.com/partners/isv/porting_and_migration/sles16/),
[openSUSE documents SELinux for new Tumbleweed installations](https://news.opensuse.org/2025/02/27/tw-monthly-update-february/),
and [AWS documents AL2023 SELinux permissive by default](https://docs.aws.amazon.com/linux/al2023/ug/selinux.html).
These upstream defaults are planning inputs, not current-host observations or
LNSAT support results. Existing installations and customized images require
actual bounded observation. No installer automatically switches security modules
or treats permissive/logging-only operation as required policy enforcement.

The first source slice must freeze a closed engine-owned capability/diagnostic
contract against the selected complete recipe and existing native readers. A
static distro-name classifier or synthetic LSM list cannot substitute for genuine
control observations. No arbitrary plugin, shell probe, unknown-field fallback
or candidate-provided expected policy is admitted. Exact observation scheduling,
error precedence, result freshness and operation binding need review before
implementation. Reuse existing configuration diagnostics and native acquisition
instead of adding an independent installer authority layer.

After that freeze, implement and independently validate engine diagnostics and
headless setup/startup integration, then package adapters consuming that contract.
Actual supported-positive and denial/recovery evidence requires the separately
authorized target environments and runtime proof. Candidate package builds wait
for the accepted preceding product/RC gates. Each selected row closes only after
its full canonical artifact, lifecycle and security proof; source tests alone
cannot complete this feature. Rangoon uses ordinary adapters and does not select
policy, supply trusted observations or override denial.

## Linux Capability Checks Across Lifecycle

Product direction: support explicitly selected Linux distribution releases only
within their proven architecture, kernel/configuration, security-policy and
runtime/backend scope. LSM availability alone is insufficient. The candidate
Ubuntu, Debian and Rocky rows above remain unselected and unsupported until
required product and per-row proof pass. DEB and RPM are packaging formats, not
security-capability evidence or release authorization.

LNSAT owns the capability definitions, observations and diagnostic meanings.
Package wrappers and Rangoon adapters consume those definitions rather than
maintaining separate policy or accepting an application's claim of enforcement.
The exact diagnostic schema, command mapping, package-hook behavior and supported
configuration values remain a future source-contract freeze; this section adds
requirements, not an implemented checker or new public API.

| Stage                            | Required check and effect                                                                                                                                                                                                                       |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Package installation/upgrade     | Verify selected canonical component identity and report available target/kernel/security prerequisites. Install files without starting the service or activating permissions. Installation success is not configuration or execution readiness. |
| Explicit headless setup          | Validate selected recipe, owner/configuration custody and required actual security controls before protected activation. Missing or unverifiable required controls block the affected capability.                                               |
| Explicit service startup/restart | Recheck current kernel/configuration, required active LSM and enforcing policy, selected runtime and required isolation controls. A prior installation report cannot satisfy current readiness.                                                 |
| Consequential operation          | Recheck operation-specific current authority and required native/control association under the accepted enforcement lifetime. Startup or installer success cannot replace one-use authorization or current evidence.                            |

Kernel support, active-module presence, policy enforcement and coverage of the
selected action are distinct facts. Diagnostics must distinguish missing,
disabled, not enforcing and unverifiable requirements, and explain the affected
capability and reviewed remediation. Unknown observation cannot become success.
A distro name, LSM list, parser result or package-manager exit status cannot prove
complete enforcement. Kernel upgrades, reboot, policy changes and runtime drift
invalidate reuse of earlier observations under the selected lifecycle contract.

Package hooks may run in an offline image, chroot or a context that does not expose
the eventual running host. Such observations must be reported as unavailable or
non-authoritative for that host; they must not label a container builder's kernel
as the installed system's supported kernel. Diagnostic unavailability leaves
runtime activation closed. Exact package-manager failure/rollback behavior must
be frozen per selected format before implementation, including usable diagnostics
without a partially activated service or damaged existing configuration.

An installer running with elevated privileges does not prove the non-root daemon
or workload can observe or enforce the same controls. Setup/startup proof must use
the actual selected runtime identities. Package scripts must not silently enable
LSMs, rewrite kernel boot parameters or security policy, mount securityfs, or alter
host ACLs to make a check pass. Required privileged provisioning needs its own
explicit owner-controlled contract and authority.

Per selected row, proof must cover supported positive configuration; missing or
disabled required modules; required policy not enforcing; inaccessible observation;
unsupported kernel/backend; offline installation; install versus runtime identity;
and loss of required capability after upgrade/reboot/policy change. Existing
install/upgrade/rollback/uninstall/purge and no-auto-start requirements still apply.
No such lifecycle proof or supported row is claimed by this source plan.

## OCI Contract

- amd64 and arm64 manifest;
- same canonical LNSAT core component digests; optional UI digests are separate;
- non-root UID/GID;
- read-only root filesystem compatibility;
- explicit persistent data volume;
- explicit config injection;
- no credentials, customer state, preconnected integration, or hidden seed;
- health/readiness behavior without implicit external connection.

## Trust Evidence

Every selected canonical core artifact requires the evidence below:

- SHA-256 checksum;
- non-production signature rehearsal and verification bundle;
- SPDX JSON SBOM;
- SLSA v1 provenance;
- exact source revision and build recipe;
- canonical component digest map;
- license and notice references;
- reproducibility evidence;
- core backup/restore, rollback, and revocation evidence;
- non-root runtime, headless configuration, and explicit-start/no-auto-start
  `lnsatd` behavior.

Install, package upgrade/rollback, uninstall, and package-managed service
lifecycle evidence applies to each selected LNSAT V1 package target and gates
its support claim. Unselected installer formats do not gate LNSAT V1. Package
lifecycle proof does not replace the core-target evidence above.

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

- `lnsatd`: optional local API host/reference sidecar;
- `lnsatctl`: operator diagnostics and governed operation;
- `lnsat`: stable convenience dispatcher.

Command, local transport, privilege, output, recovery, and service behavior is
defined in [CLI and OS operator interface](CLI_AND_OS_OPERATOR_INTERFACE.md).

MCP extensions, host helpers, SDK packages, and integrations remain separate
artifacts and never become installer trust shortcuts.

## Package composition

Future package variants must pin exact canonical core components plus
separately signed module, connector, UI, policy-pack, or model-package digests.
Package manifests record compatibility, license/notice, SBOM, provenance,
support, entitlement, update, rollback, and revocation evidence.

Package composition may wrap canonical core but cannot rebuild different
authority behavior. Module installation, enablement, capability grant, and
service start remain separate. Core release and publication
have independent go/no-go gates.

## Later Platform Lanes

Winget, Scoop, MSI, Chocolatey, signed/notarized macOS `.pkg`, and every
unselected matrix row are later lanes, not initial local-v1 blockers.

## Phase 14 Exit

All selected LNSAT core-target compatibility rows, required trust evidence,
canonical component digest parity, non-root checks, headless configuration,
monitoring, docs, recovery, rollback, and revocation evidence pass. Unknown,
unselected, or untested core-target rows stay unsupported. Cross-wrapper digest
parity and lifecycle tests gate every selected LNSAT V1 package target. Optional
wrappers and unselected installer formats do not gate LNSAT V1.

Publication remains a separate explicit go/no-go gate after Phase 14.
