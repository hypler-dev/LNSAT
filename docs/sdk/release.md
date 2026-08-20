# SDK Package Release Scope Review

Status: source-release scope reviewed. This guide describes release and package
approval structure only. It does not create SDK packages, publish packages,
install dependencies, refresh lockfiles, run workflows, mutate GitHub, create
releases, generate artifacts, call external services, or open live side effects.

## Source Basis

- `docs/architecture/SDK_DOCUMENTATION_EXPANSION_PLAN.md`
- `docs/architecture/SDK_DOCUMENTATION_INVENTORY.md`
- `docs/architecture/SDK_INFORMATION_ARCHITECTURE.md`
- `docs/architecture/RELEASE_EXECUTION_PREFLIGHT_MATRIX.md`
- `CHANGELOG.md`
- `fixtures/release/source-plan.json`
- `docs/sdk/README.md`
- `docs/sdk/typescript-reference.md`
- `docs/sdk/migration.md`
- `docs/sdk/extensions.md`
- `docs/sdk/conformance.md`

## Current Package State

Current workspace packages are unpublished. They are documented as source refs
and review inputs, not as public SDK packages.

| Package          | Current release posture                         | Future review need                                      |
| ---------------- | ----------------------------------------------- | ------------------------------------------------------- |
| `@lnsat/mcp`     | Read-only MCP inspection source package.        | Public SDK package name, semver, conformance, examples. |
| `@lnsat/packets` | Packet, policy, startup, release, and contracts | Export grouping, API stability review, schema policy.   |
| `@lnsat/policy`  | Policy decision and approval helpers.           | Human approval boundary and fail-closed API review.     |
| `@lnsat/audit`   | Audit and ledger source contracts.              | Audit evidence package boundary review.                 |
| `@lnsat/core`    | Product/version/build-phase constants.          | Maintainer-only reference review.                       |
| `@lnsat/cli`     | Local packet validate/hash command source.      | CLI artifact lane review before distribution.           |

No current package may be described as installable, published, marketplace
listed, or release-ready. Import examples stay source-only and must not include
package manager commands.

## Release Lane Scope

The release manifest and preflight matrix list planned lanes only. Each lane is
`planned_not_ready` until a later packet opens that single lane and proves all
required evidence.

| Lane                                 | Current state          | Review if selected for claimed Phase 14 profile                     |
| ------------------------------------ | ---------------------- | ------------------------------------------------------------------- |
| canonical macOS ARM64/x86_64 bundles | planned, not built     | component map, checksum, signature bundle, SBOM, provenance         |
| canonical Linux x86_64/arm64 bundles | planned, not built     | component map, checksum, signature bundle, SBOM, provenance         |
| dedicated Homebrew tap               | planned, not created   | pinned canonical artifacts, bottles, service/no-auto-start evidence |
| verified install script              | planned, not created   | target selection and verification before replacement                |
| deb packages                         | planned, not built     | Ubuntu 24.04/Debian 13 lifecycle and disabled systemd evidence      |
| rpm packages                         | planned, not built     | Rocky Linux 9 lifecycle and disabled systemd evidence               |
| OCI amd64/arm64                      | planned, not built     | canonical digest equality, non-root, read-only-root evidence        |
| Cargo bootstrap/verifier             | planned, not published | explicit canonical download; no product-core rebuild                |

MCP extensions, connector SDKs, and host helpers remain separate future lanes.
Winget, Scoop, MSI, Chocolatey, and signed/notarized macOS `.pkg` are later-only
platform lanes.

Release docs may name lanes, evidence, and gates. They must not claim that any
lane is downloadable, built, signed, packaged, pushed, uploaded, or published.

## Required Approval Gates

Gates are staged. Requiring artifact evidence before a candidate exists is
circular; allowing publication gates to authorize candidate build is unsafe.
This guide records gates only.

Before candidate build:

| Gate                    | Required evidence                                                                  | Still closed                            |
| ----------------------- | ---------------------------------------------------------------------------------- | --------------------------------------- |
| Required phases         | Phases 8, 9, 10, 11, and 13 passed                                                 | Phase 14 build, publication             |
| RC source identity      | exact commit, version, changelog, support profile, source review                   | tag creation, Git push                  |
| Build recipe and rows   | exact platform/arch/package selection, reproducible recipe, privilege/install tier | unselected rows, host install           |
| Candidate authorization | named human approval, audit refs, exact outputs and disposable builders            | agent self-approval, production signing |
| Secrets and credentials | reference-only policy; no raw values                                               | secret capture, production-key use      |

After candidate build, before final publication:

| Gate                  | Required evidence                                                        | Still closed                                   |
| --------------------- | ------------------------------------------------------------------------ | ---------------------------------------------- |
| Candidate conformance | positive checks, fail-closed probes, canonical component equality        | changed artifact bytes                         |
| Artifact trust        | checksums, non-production signature rehearsal, SBOM, provenance, notices | production signing                             |
| Lifecycle             | clean install, explicit start, upgrade, recovery, rollback, uninstall    | user-host or production deployment             |
| Final go/no-go        | Phase 14 pass, unchanged digests, signing and publication approval       | tag/release/upload/publish/promotion until yes |

Production signing covers only unchanged Phase 14-proven digests. Any byte
change repeats affected candidate proof.

## Source-Only Review Envelope

Any package/release review example should use a documentation envelope like:

```json
{
  "review": "sdk_package_release_scope",
  "release_status": "source_only_planned",
  "candidate_lane": "connector_sdk_package",
  "package_creation_allowed": false,
  "package_install_allowed": false,
  "lockfile_refresh_allowed": false,
  "workflow_execution_allowed": false,
  "package_publication_allowed": false,
  "github_release_creation_allowed": false,
  "external_service_call_allowed": false,
  "runtime_live_behavior_allowed": false,
  "required_gates": [
    "source_revision_review",
    "version_semver_review",
    "conformance_review",
    "security_evidence_review",
    "human_approval_review",
    "publication_approval_review",
    "rollback_revocation_review"
  ],
  "source_refs": [
    "docs/architecture/RELEASE_EXECUTION_PREFLIGHT_MATRIX.md",
    "fixtures/release/source-plan.json",
    "docs/sdk/conformance.md"
  ],
  "side_effects": []
}
```

This envelope is documentation only. It is not a manifest writer, package
descriptor, registry payload, release draft, workflow input, or runtime
authorization.

## Fail-Closed Review Examples

| Attempt                                                           | Expected review result                                                              |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Add `npm install @lnsat/mcp` or package manager commands.         | Deny because package install/update and lockfile refresh remain closed.             |
| Mark `connector_sdk_package` as published or downloadable.        | Deny because no package artifact, approval, or publication exists.                  |
| Create a GitHub Release draft from docs review.                   | Deny because release creation and GitHub mutation are closed.                       |
| Run a workflow to build checksums, SBOM, provenance, or packages. | Deny because workflow execution and artifact generation are closed.                 |
| Capture registry token, signing key, or marketplace secret.       | Deny because secrets are references only and secret capture remains closed.         |
| Promote `binary/latest` or `/download/latest`.                    | Deny because stable/latest pointer and download page mutation remain closed.        |
| Treat extension manifest review as connector install approval.    | Deny because connector install, marketplace publication, and invocation are closed. |
| Return nonempty `side_effects`.                                   | Deny because package/release review must preserve `side_effects: []`.               |

## Future Release Boundary

A release candidate review must identify exact source revision and version
evidence before any tag, archive, checksum, signing, SBOM, provenance, GitHub
Release, upload, pointer mutation, package publication, deploy, or live side
effect.

Package/release work may open only through a later explicit packet that names
one lane and one output. That later packet must define:

- exact source revision and version scope;
- package or artifact name;
- build recipe and platform/architecture;
- conformance checks and fail-closed probes;
- changelog and release notes;
- checksum, signature/signing status, SBOM, and provenance plan;
- rollback, uninstall, revocation, and support policy;
- human approval authority and audit evidence;
- publication target and stable-promotion policy;
- closed scopes that remain unavailable.

Before any v1 publication, every local-v1-required roadmap phase and every
selected Phase 14 compatibility row must pass. Hardware attestation, optional
signed-evidence work, enterprise topology, and unselected package rows do not
block initial local support. Until exact release gate exists and is approved,
package creation, publication,
release creation, package install/update, lockfile refresh, workflows, runtime,
secrets, external calls, and live side effects remain closed.

## Boundary

This guide grants no package creation, package mutation/publication,
package install/update, lockfile refresh, connector install, marketplace
publication, release creation, GitHub mutation, workflow execution, generated
artifact, checksum, signature, SBOM, provenance, runtime behavior, DB, deploy,
Docker, SSH, node-agent, secrets, external calls, MCP mutation, auth provider
wiring, policy activation, storage/network mutation, Git push, or live side
effect was opened.
