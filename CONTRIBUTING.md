# Contributing

Contributions should preserve LNSAT's execution-authorization, evidence, and
fail-closed boundary.

## Development Flow

1. Open an issue for substantial changes or explain rationale in pull request.
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
