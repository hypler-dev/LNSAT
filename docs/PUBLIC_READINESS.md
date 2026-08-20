# Public Source Launch Record

- Status: public pre-release source
- Launch authorization: repository owner, 2026-08-20
- History strategy: fresh audited root snapshot
- Historical engineering repository: retained privately
- Package, binary, container, installer, hosted-runtime, and production status:
  unavailable

LNSAT develops in public under Apache-2.0. This record defines what that
visibility means and keeps it separate from any supported release.

## Separate Decisions

Two publication events must not be confused:

1. **Public source:** audited source is readable and forkable for evaluation and
   contribution.
2. **Supported release:** selected immutable artifacts pass later signing,
   lifecycle, compatibility, platform, publication, and support gates.

Public source may precede `v1.0.0`. It grants no package, binary, container,
installer, hosted endpoint, production-use, compatibility, or support claim.
See [claims and maturity vocabulary](CLAIMS_AND_MATURITY.md).

## Public Source Position

Public product name is **LNSAT**. It is not expanded into a longer public name.

Allowed public description:

> LNSAT is open-source, pre-release source for policy-governed AI-agent
> authorization, scoped human approval, audit evidence, and read-only MCP
> adapters. Current repository contains experimental contracts, tests, and local
> foundations for evaluation and contribution.

Read-only MCP stdio and stateless HTTP-handler adapter source exists. It grants
no mutation or execution authority.

Do not claim production readiness, tamper-proof enforcement, certification,
compliance, enterprise support, runtime mobility, supported platforms,
production connectors, or hosted operation until exact gates pass.

Docker and OCI are first planned runtime profile. No Docker adapter, image,
installation path, or support claim exists yet. See the
[Docker-first runtime ADR](architecture/ADR-0007_DOCKER_FIRST_RUNTIME_NEUTRAL_ENFORCEMENT.md)
and [technical comparison](reference/DOCKER_AI_TECHNICAL_COMPARISON.md).

## History and Provenance

Public repository begins from one audited root snapshot derived from private
`origin/main` revision `cae4fbde070b35a4b84c2729617a17db3ef54be5` plus the
bounded public-readiness changes documented in that snapshot. Public Git
history is authoritative for all later work.

Private engineering history, branches, pull requests, tags, Actions logs, and
reviews are not imported. They remain private for provenance and incident
response. Fresh public root prevents old private refs from becoming part of
the public object graph.

Completed Phase 7 Git-bound records remain as immutable archival bytes, but
their private revisions are not locally replayable in public history. The
[public snapshot marker](reference/public-source-snapshot.json) opens a narrow
pre-`1.0.0` validator mode that locks those records and the Phase 7 ledger to
public root, forbids tags and publication metadata, and grants no release,
artifact, or deployment authority. Supported release work must retire that
mode and establish publicly replayable provenance for exact release source.

Snapshot validation checks current manifest and ledger shapes plus byte-for-byte
root immutability. It explicitly skips private commit existence, ancestry,
attestation topology, exact-diff replay, reviewed-tree replay, protected-blob
replay, completion-commit replay, and reviewer-identity verification. Command
output names `public_source_snapshot`, lists skipped checks, and reports source
as ineligible for supported release evidence.

## Visibility Blockers

Public push must stop unless all conditions hold against exact exported tree:

- at least two independent secret scanners report no publishable credential;
- repository-native public, dependency, documentation, test, build, formatting,
  lint, and Rust conformance gates pass;
- candidate contains one `main` root, no inherited branches, tags, releases,
  pull requests, Actions history, packages, environments, or secrets;
- description, homepage, topics, contribution settings, security reporting,
  default branch, and protection rules match factual current state;
- anonymous clone exposes only intended source and required license/community
  files.

Real credentials must be revoked or rotated before publication. Deleting a
secret from history is not remediation.

## Repository Metadata

Description:

> Open-source, pre-release source for policy-governed AI-agent authorization,
> scoped human approval, audit evidence, and read-only MCP adapters.

Homepage stays blank until a dedicated factual LNSAT page exists. Initial topics,
ranked by fit and public search intent, are `ai-agents`, `agent-security`,
`authorization`, `mcp`, `model-context-protocol`, `policy-engine`,
`human-in-the-loop`, `audit-trail`, `access-control`, `ai-governance`,
`ai-security`, `agentic-ai`, `rust`, `typescript`, and `open-source`. Add `docker`
only after Docker adapter source exists.

Issues are enabled. Projects, wiki, and discussions stay disabled until they
have an owned public workflow. Default branch is `main`; merged branches are
deleted. Tags and releases stay empty before an authorized release.

## Recommended Public Cutover

1. Export exact tracked source into isolated fresh Git history.
2. Run independent secret scans and repository-native gates on that candidate.
3. Preserve old repository as private read-only archive.
4. Create public repository with one protected `main` root and factual metadata.
5. Verify security settings, anonymous clone, public CI, refs, tags, and releases.
6. Continue work through public branches and reviewed pull requests.
7. Keep artifacts, packages, containers, deployment, and stable support closed
   until separately authorized and proven.

## Public Operating Model

- Maintainers accept DCO-signed contributions under [CONTRIBUTING.md](../CONTRIBUTING.md).
- Security reports use private channels in [SECURITY.md](../SECURITY.md), never a
  public issue.
- Support is best-effort and pre-release as defined by [SUPPORT.md](../SUPPORT.md).
- Roadmap priorities express direction, not delivery dates or implemented scope.
- Issue and pull-request evidence may become public permanently; contributors
  must not include secrets, customer data, private topology, or exploit details.

## Incident Response

If unintended material becomes public: stop further publication, preserve exact
evidence privately, revoke or rotate affected credentials, disable exposed
access, assess forks and caches, notify affected parties, remove material using
GitHub-supported procedures, and publish a bounded security notice when safe.
Rewriting Git history alone is insufficient.

## Go/No-Go Record

Cutover closeout must record public root commit, scanner names and results,
validation results, repository settings, anonymous-clone proof, public-CI
result, remaining limitations, retained private archive, and explicit owner
authorization. Public visibility grants no tag, release, package, deployment,
production write, or supported-runtime authority.
