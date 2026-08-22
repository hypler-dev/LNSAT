# Contributing

Contributions should preserve LNSAT's execution-authorization, evidence, and
fail-closed boundary.

LNSAT is pre-release source. A successful source build does not create a
supported package, service, production workflow, or compatibility promise. Read
[project status](docs/PROJECT_STATUS.md) and
[claims and maturity vocabulary](docs/CLAIMS_AND_MATURITY.md) before changing a
public contract or product claim.

## First Contribution

Small documentation fixes, test clarifications, and narrowly scoped bug fixes
may go directly to a focused pull request with clear rationale. Open an issue
first for changes that affect public contracts, runtime authority, persistence,
security boundaries, compatibility, packaging, release behavior, or broad
architecture.

Use the [issue chooser](https://github.com/hypler-dev/LNSAT/issues/new/choose)
for bugs and feature proposals. Use the
[community support form](https://github.com/hypler-dev/LNSAT/issues/new?template=community_support.yml)
for documentation, build, source-evaluation, or compatibility questions. Never
place secrets, private data, or vulnerability details in either channel.

Before editing:

1. choose one bounded problem and identify its owning package or document;
2. read nearby tests and the relevant architecture or contract guide;
3. state current behavior, expected behavior, and claim or compatibility impact;
4. run the smallest relevant package check while developing;
5. run the full source gate before requesting review.

See [local development](docs/LOCAL_DEVELOPMENT.md) for workspace-specific
commands and troubleshooting.

## Development Flow

1. Open an issue when required above or explain rationale in the pull request.
2. Create focused branch from current `main`.
3. Install dependencies with `npm ci`; never edit generated dependency trees.
4. Make one bounded change with tests and documentation.
5. Run focused checks, then `npm run source:check`.
6. Document contract, migration, security, and compatibility impact.

Public-facing claims must use vocabulary in
[`docs/CLAIMS_AND_MATURITY.md`](docs/CLAIMS_AND_MATURITY.md). Source
implementation, repository visibility, artifact publication, production
deployment, and support are separate states.

## Pull Requests

Pull requests should be reviewable, independently testable, and free of
unrelated formatting or generated-output changes. Include:

- problem and rationale;
- source and documentation scope;
- validation commands and results;
- compatibility or migration impact;
- security and data-handling impact;
- rollback notes when behavior or persisted state changes.

Do not commit secrets, generated output, local state, marketing source,
deployment configuration, or private operational evidence.

Do not describe planned work as available. Claims using `secure`,
`production-ready`, `supported`, `certified`, `compliant`, or `guaranteed` must
name exact evidence and pass maintainer review.

## Security-Boundary Review Evidence

Security-boundary packets require an independent adversarial review artifact.
Maintainers must record a disposition for every finding and cite the artifact
path plus its SHA-256 digest in the pull request.

Completion evidence must include the repository's Git-bound review manifest.
Formal GitHub approval may supplement the manifest, but does not replace it:
the local validator does not query or authenticate GitHub review state. The
manifest validator checks structure, reviewed Git objects and diff bytes,
attestation topology, and manifest immutability. Reviewer identity and
independence remain recorded claims; they are not externally machine-verified.
Never fabricate, infer, or backfill GitHub approval or reviewer claims. Preserve
the recorded reviewer identity, findings, dispositions, and reviewed revision.

## Upstream and Downstream Changes

Public LNSAT owns authority semantics, portable interoperability contracts, OS
CLI conventions, essential security, conformance, and canonical release
verification. Contributions affecting those concerns belong upstream.

Commercial management, certified connector implementations, model packs, and
commercial composition live in separate private repositories. Do not place
proprietary implementation on a hidden branch in public core. Do not move a
security fix, portable format, or Gateway enforcement behind entitlement.

Changes to module, connector, profile, skill, instruction, context, graph,
model-overlay, CLI, or edition boundaries must cite
[ADR-0003](docs/architecture/ADR-0003_OPEN_CORE_EXTENSIONS_AND_MANAGEMENT_PLANE.md)
and update product-direction alignment where ownership changes.

Contributors certify they have the right to submit work under Apache-2.0. Use a
Developer Certificate of Origin sign-off on commits:

```sh
git commit -s
```

Report vulnerabilities through private channel described in `SECURITY.md`, not
through public issues or pull requests.
