# Source Release Process

LNSAT is pre-release. This process prepares and verifies a source revision; it
does not authorize package publication, artifact upload, signing, tagging,
repository creation or visibility changes, deployment, or production mutation.

Public repository source and supported release artifacts are separate events.
Audited fresh-history source is public before `v1.0.0` under
[public source readiness](PUBLIC_READINESS.md). That action does not alter
version, package, artifact, runtime, support, or production status.

## Public Source Cutover Record

Public-source cutover used its own exact revision, fresh-history decision,
secret/privacy/license scan, GitHub metadata review, public CI/settings proof,
and explicit owner authorization. It did not require Phase 13/14 because it
published source for scrutiny, not supported artifacts.

Existing private history must not become public by implication. Current-tree
validation cannot approve historical blobs, branches, pull requests, review
attachments, or Actions logs.

Initial public root preserves prior Phase 7 review manifests as immutable
archival records under the
[public snapshot marker](reference/public-source-snapshot.json). Their private
commit topology is intentionally not locally replayable. Snapshot mode is
source-visibility evidence only: it requires pre-`1.0.0` unpublished metadata,
zero tags, unchanged archival bytes, and false release/artifact/deployment
authority. It cannot satisfy any supported-release gate. Before `v1.0.0`, exact
release source needs new publicly replayable review and provenance evidence.
Snapshot validation does not independently verify historical reviewer identity,
private commit topology, exact diffs, tree IDs, or protected blobs.

## Release Inputs

- Clean checkout of intended source revision.
- Scope, target, package, support, and release criteria from
  [ADR-0002](architecture/ADR-0002_AUTHORITY_LAYER_AND_V1_DISTRIBUTION.md),
  downstream/interface boundaries from
  [ADR-0003](architecture/ADR-0003_OPEN_CORE_EXTENSIONS_AND_MANAGEMENT_PLANE.md),
  with retained local-first boundaries from
  [ADR-0001](architecture/ADR-0001_V1_SCOPE.md).
- Node.js 22+, npm 10.9+, and pinned npm dependencies from `package-lock.json`.
- Rust 1.97.1 with `rustfmt` and `clippy`, as declared by
  `rust-toolchain.toml`.
- Updated `CHANGELOG.md`, version metadata, compatibility notes, and security
  impact.

## Version Contract

Before a versioned source release:

1. Align root npm version, every workspace version, and Cargo workspace version.
2. Keep npm workspaces `private: true` and Rust crates `publish = false` until a
   separate publication review explicitly changes that boundary.
3. Document breaking API, schema, migration, CLI, and fixture changes.
4. Move relevant changelog entries from `Unreleased` to dated version heading.

## Normative Release Sequence

1. Complete required product/runtime Phases 8, 9, 10, and 11.
   This includes the pending
   [headless configuration and control gate](PRODUCT_BUILD_SEQUENCE.md#headless-configuration-and-control),
   not merely the historical P10-X1 source checkpoint. Each selected LNSAT core
   target must later prove component identity, trust, headless configuration,
   permission enforcement, and compatibility under Phase 14. Rangoon owns
   graphical setup and final distro/package lifecycle; its wrappers cannot
   replace or bypass LNSAT's versioned API, CLI, or Gateway authority.
2. Pass Phase 13 and freeze one exact release-candidate source identity,
   version, changelog, support profile, and build recipe.
3. Under explicit Phase 14 candidate-build authorization, select exact rows and
   build immutable canonical candidate components once per target.
4. Prove selected candidate artifacts and unchanged wrappers: digests,
   reproducibility, non-production signature rehearsal, SBOM, provenance,
   notices, install, start, upgrade, recovery, rollback, and uninstall.
5. After Phase 14 passes, obtain separate final go/no-go authorization.
6. Production-sign unchanged proven digests, verify them, then create tags,
   releases, uploads, publications, and stable/latest promotion.

Any artifact-byte change returns work to candidate build and repeats affected
Phase 14 proof. See [product build sequence](PRODUCT_BUILD_SEQUENCE.md).

## Verification

Run from clean checkout:

```sh
npm ci
npm run audit:dependencies:check
npm run source:check
```

`source:check` verifies formatting, public-source policy, release metadata,
product-direction alignment, migrations, TypeScript builds and tests, Rust
formatting/lints/tests/metadata, TypeScript/Rust conformance, and static
application builds.

`source:check` proves current pre-release source gates only. It must not be
described as supported-release approval. Future supported-release review must
also pass:

```sh
npm run release:check
```

`release:check` runs strict supported-release evidence before the complete
source gate. It intentionally fails in `public_source_snapshot` mode and while
the dedicated exact release-source review gate remains unimplemented. Do not
weaken or bypass it; replace archival private-history records with
public-history-native evidence and implement independently reviewable binding
for exact release source.

Record exact Node, npm, Rust, target triple, test counts, audit result, commit,
and clean-tree status in release notes. Never record secret values.

Source verification does not prove a supported platform. Before `v1.0.0`, all
local-v1-required roadmap phases must pass. Explicitly optional hardware
attestation, signed-evidence, enterprise, and unselected distribution lanes do
not block initial local support. Phase 14 requires every selected
target/package row, canonical component digest parity across wrappers,
clean-machine install, explicit service start, upgrade, backup/restore,
rollback, uninstall, non-root/no-auto-start proof, checksums, non-production
signature rehearsal/verification bundles, SPDX JSON SBOMs, and SLSA v1
provenance. Missing evidence blocks release; successful source build cannot
waive it.

## Maintainer Review

Maintainer confirms:

- source revision and changelog agree;
- license and notice files are present;
- dependency audit has no unresolved release-blocking findings;
- security and compatibility impacts are documented;
- generated output and local state are absent;
- rollback or revocation path is defined for any future artifact;
- no artifact publication or live side effect is implied by source verification.

## Publication Gate

Tag creation, GitHub Release creation, package/container publication,
production signing, and stable/latest promotion require separate explicit
authorization after Phase 14 passes. Production signing may cover only unchanged
Phase 14-proven digests. Failed or partial verification may preserve quarantined
candidate artifacts as evidence, but must not produce a final, publishable, or
promoted release.

## Downstream Release Separation

Commercial edition, connector, module, or model publication is separate from
public core release. Downstream manifest must pin exact public core version and
canonical component digests plus extension versions, trust evidence,
compatibility, lifecycle, entitlement, and support state.

Downstream packaging cannot rebuild alternate core authority behavior or delay
an upstream critical security fix. Public core success does not authorize
commercial publication; commercial success does not authorize public tag,
artifact release, or stable promotion.

## Post-Release

After an authorized release, verify tag immutability, published checksums and
signatures, release notes, support status, advisory links, and rollback or
revocation instructions. Open a fresh `Unreleased` changelog section for later
work.
