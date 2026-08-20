# Claims and Maturity Vocabulary

- Status: current documentation policy
- Runtime effect: none
- Release effect: none

This document defines how LNSAT describes current source, future plans, and
release support. [Project status](PROJECT_STATUS.md) remains canonical for what
is merged. [Roadmap](ROADMAP.md) remains canonical for ordered future work.

## Status Terms

| Term                                  | Meaning                                                                                                                                                                                  |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `implemented` or `source-implemented` | Code and tests exist in current tracked source. This does not imply packaging, support, deployment, or production suitability.                                                           |
| `experimental`                        | Source behavior exists and has automated coverage, but compatibility and operation may change before first supported release.                                                            |
| `source-only`                         | Behavior must be built or run from a repository checkout. No supported artifact or installation path exists.                                                                             |
| `contract-only`                       | A versioned schema, type, validator, fixture, or conformance rule exists; complete runtime composition does not.                                                                         |
| `verification-only`                   | Code can validate bounded evidence but is not wired into live authorization or execution.                                                                                                |
| `accepted design` or `accepted plan`  | Direction constrains future implementation. It is not evidence that behavior exists.                                                                                                     |
| `proposal` or `planned`               | Work is not implemented and may change before an implementation packet opens.                                                                                                            |
| `supported`                           | An exact version, target, package, lifecycle, security, and maintenance row has passed release gates and has a published support policy. No current LNSAT version meets this definition. |

## Public Source Is Not a Product Release

Repository visibility and artifact release are separate:

- **public source** means an audited source snapshot is readable and forkable
  under Apache-2.0;
- **source verification** means repository checks passed for one exact source
  revision;
- **candidate artifact** means a later Phase 14 build exists only for proof;
- **supported release** requires selected-target lifecycle evidence, final
  authorization, unchanged artifact digests, publication, and support terms.

Making source public does not publish `lnsatd`, `lnsatctl`, `lnsat`, an OCI
image, package, installer, hosted endpoint, or production guarantee.

## Claims Safe Today

Public descriptions may state that current source contains:

- versioned authority and evidence contracts;
- deterministic policy and approval foundations;
- local SQLite durability and loopback daemon foundations;
- experimental read-only MCP, CLI, API, and Control Center surfaces;
- source-level one-time authorization, bounded disposable Git consequence,
  receipt, ambiguity, and reconciliation conformance;
- tests, threat models, release gates, and public-safe fixtures.

Descriptions must also state that current source has no supported package,
stable operator workflow, hosted service, production connector, fleet/HA
topology, or production-use guarantee.

## Evidence Required for Stronger Claims

Before adding a broader claim, name:

1. exact source revision and owning contract;
2. implemented route, command, or package row;
3. positive and fail-closed tests;
4. security and compatibility boundary;
5. artifact or deployment evidence when claim concerns distribution;
6. support owner and maintenance window when claim uses `supported`.

Avoid unqualified `secure`, `tamper-proof`, `production-ready`, `enterprise`,
`compliant`, `certified`, `guaranteed`, `shipped`, or `available` language.
Security properties must name threat boundary and tested behavior. Plans must
use future tense and link to their owning roadmap or decision record.

## Documentation Reading Rule

Readers should resolve disagreements in this order:

1. current tracked source and tests;
2. [Project status](PROJECT_STATUS.md);
3. accepted ADRs for boundaries;
4. [Product build sequence](PRODUCT_BUILD_SEQUENCE.md) and
   [roadmap](ROADMAP.md) for future order;
5. proposals and historical snapshots.

Historical counts, old pull-request states, and private planning records are
not current product evidence.
