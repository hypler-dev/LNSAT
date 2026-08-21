# Why LNSAT Became Public Now

- Status: maintainer publication context
- Public cutover: 2026-08-20
- Product status: pre-release source only
- Runtime, artifact, and support effect: none

LNSAT did not begin with its August 20 public root. Selected private Git
milestones show that the current architecture foundation and packet runtime
foundation existed on May 3, 2026. API-facing and MCP packet-inspection
primitives were checkpointed by May 6. Later private milestones added local
authorization, conformance, bounded runtime composition, evidence readback, and
the daemon and CLI product-surface spine. Exact revisions and current public
paths are recorded in the root [provenance timeline](../PROVENANCE.md).

## Independent Market Convergence

Docker [introduced AI Governance on May 12, 2026](https://www.docker.com/blog/docker-ai-governance-unlock-agent-autonomy-safely/),
describing runtime enforcement over network, filesystem, credential, and MCP
access plus policy-decision audit events. On August 3, Docker
[expanded centralized audit-log and SIEM access](https://www.docker.com/blog/docker-ai-governance-audit-logs-now-where-your-security-team-already-works/).
On August 12, Docker
[described Agent Baseline](https://www.docker.com/blog/a-new-security-baseline-for-enterprise-agentic-adoption/),
a `v1.0-draft` published July 30 with six outcomes: discover, constrain,
authorize, observe, validate, and respond.

Those developments provided visible evidence that agent authorization,
runtime enforcement, and correlated consequence evidence were becoming
foundational infrastructure concerns. They do not imply copying, coordination,
or exclusive priority by either project.

## Why Publication Accelerated

LNSAT had already been developing a broader, runtime-neutral authority model:
bind exact intent to deterministic policy, require distinct human approval
when policy demands it, issue narrow one-time authorization, consume it before
consequence, bind the resulting receipt, and reconcile ambiguous outcomes.

Market convergence made public scrutiny more valuable than continued private
development. The maintainer therefore published the audited source earlier
than originally planned, with a fresh public root that excludes the private
commit ancestry while preserving an exact tracked-tree mapping. Public
development now lets contributors inspect the contracts, challenge the threat
model, and build replayable evidence in the same history that must support a
future release.

## Complement Docker; Do Not Rebuild It

Docker can provide container execution, sandboxed agent runtimes, MCP Gateway
controls, microVM isolation, organization policy, and fleet controls. LNSAT's
intended job is narrower at each execution point but broader across runtimes:
authorize one exact consequential action and preserve evidence that the
requested, approved, authorized, and executed operation matched.

The first planned runtime proof is therefore Docker-backed. It must demonstrate
the authority properties that running a container alone does not establish:

- canonical intent digest;
- deterministic policy evidence;
- distinct approval evidence when required;
- exact target and argument binding;
- one-use authorization and atomic consumption;
- adapter receipt;
- executed-target digest equality;
- explicit `outcome_unknown` handling;
- reconciliation without blind retry.

That workflow is planned after the remaining core operator gates. No Docker
adapter, image, installer, or supported Docker deployment exists today. Docker
is the first reference runtime, not LNSAT's only intended substrate. See the
[Docker-first runtime decision](architecture/ADR-0007_DOCKER_FIRST_RUNTIME_NEUTRAL_ENFORCEMENT.md)
and [technical comparison](reference/DOCKER_AI_TECHNICAL_COMPARISON.md).

## What Public Means Today

LNSAT remains source-only pre-release software for evaluation and
contribution. Public visibility does not create a supported package, container,
installer, hosted service, production guarantee, or release provenance claim.
The strict supported-release gate intentionally remains closed until exact
public-history-native review evidence and later lifecycle, signing, SBOM, and
provenance requirements pass.
