# Docker AI and LNSAT Technical Comparison

- Status: public technical snapshot
- Reviewed: 2026-08-20
- Runtime effect: none
- Support effect: none

This document explains where LNSAT overlaps with, differs from, and can
integrate with Docker's public agent, MCP, sandbox, and governance work. It is
not a benchmark, certification, security audit, or claim about unpublished
Docker systems.

## Review Boundary

The source review used these exact public revisions:

- [`docker/docker-agent` at `191414145972bc0bb939884b92a3b3d6e2228168`](https://github.com/docker/docker-agent/tree/191414145972bc0bb939884b92a3b3d6e2228168);
- [`docker/mcp-gateway` at `24b028f4f9aac85ce1a1057c5e8d739836e7c18d`](https://github.com/docker/mcp-gateway/tree/24b028f4f9aac85ce1a1057c5e8d739836e7c18d);
- Docker's public documentation for Docker Agent, Sandboxes, MCP Gateway,
  access policy, and governance.

Review covered architecture, configuration, policy evaluation, approvals,
tool dispatch, sandbox boundaries, authentication, audit paths, persistence,
and failure behavior. It was a targeted architecture and security review, not
a line-by-line formal audit of every file. Docker AI Governance includes
service-side behavior that is not present in these two public repositories, so
no source-only conclusion is made about unpublished implementation.

LNSAT truth in this comparison is limited to current tracked source and tests.
Future architecture appears in a separate column and is never counted as a
current capability.

## Different Primary Jobs

| System                             | Primary job today                                                                                                                                         |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Docker Agent                       | Build and run agents: model routing, multi-agent orchestration, tools, sessions, hooks, configuration, and optional sandbox execution.                    |
| Docker MCP Gateway                 | Discover, configure, authenticate, start, and route MCP servers and tools across container, local-process, and remote transports.                         |
| Docker Sandboxes and AI Governance | Isolate agent execution in microVMs and centrally govern sandbox network, filesystem, and MCP access.                                                     |
| LNSAT current source               | Define and test versioned authority, approval, one-time authorization, receipt, audit, durability, and recovery contracts with bounded local foundations. |
| LNSAT target                       | Provide a runtime-neutral authority and evidence boundary for consequential actions proposed through MCP, A2A, REST, CLI, browser, or later adapters.     |

Docker products are not merely container wrappers. Docker Agent can run on the
host or in a Docker Sandbox, and its MCP tool layer supports Docker MCP,
local-stdio, and remote servers. Docker Sandboxes use microVMs. LNSAT therefore
must not position itself as broader only because it names more runtime types.

## Docker Technical Strengths

Docker Agent is a much more complete agent runtime than LNSAT. Its public
source includes mature model/provider support, multi-agent execution, session
persistence, hooks, tool installation, safety modes, user settings, HCL/YAML,
and schema migrations through configuration version 15. Parsing is strict and
older versions migrate to the current schema. Its permission dispatcher also
keeps explicit deny rules effective under autonomous mode.

Docker MCP Gateway is a much more complete MCP operations layer. It handles
catalogs, profiles, local and remote servers, container execution, OAuth,
secrets, telemetry, code-mode, and tool routing. When a policy client is
active, invocation errors deny instead of allowing, batch policy failures
remove all eligible servers and tools, and direct, `mcp-exec`, and code-mode
dispatch paths perform policy checks.

Docker Sandboxes add a real microVM boundary, default-deny network controls,
filesystem controls, credential proxying, organization policy, and a large MCP
catalog and distribution surface. LNSAT currently has no equivalent shipped
isolation, catalog, installer, or fleet experience.

Useful primary evidence:

- [Docker Agent strict versioned configuration loader](https://github.com/docker/docker-agent/blob/191414145972bc0bb939884b92a3b3d6e2228168/pkg/config/config.go)
  and [safety/permission model](https://github.com/docker/docker-agent/blob/191414145972bc0bb939884b92a3b3d6e2228168/pkg/runtime/toolexec/permissions.go);
- [Docker Agent sandbox mode](https://docs.docker.com/ai/docker-agent/configuration/sandbox/)
  and [MCP tool modes](https://docs.docker.com/ai/docker-agent/tools/mcp/);
- [MCP Gateway fail-closed invocation check](https://github.com/docker/mcp-gateway/blob/24b028f4f9aac85ce1a1057c5e8d739836e7c18d/pkg/gateway/handlers.go)
  and [batch configuration filtering](https://github.com/docker/mcp-gateway/blob/24b028f4f9aac85ce1a1057c5e8d739836e7c18d/pkg/gateway/configuration.go);
- [Docker Sandbox security model](https://docs.docker.com/ai/sandboxes/security/)
  and [governance precedence](https://docs.docker.com/ai/sandboxes/governance/concepts/).

## Remaining Authority Gap

Reviewed Docker surfaces leave room for an independent authority and evidence
layer. This is the viable LNSAT boundary.

### Configuration is not the same as non-bypassable authority

Docker Agent intentionally treats agent-authored runtime settings as defaults.
Explicit CLI or user settings can select another safety mode, and
`--sandbox=false` can override an agent-authored sandbox default. Explicit deny
permission rules still win, and Docker organization governance can impose
stronger sandbox controls. The distinction is that Docker Agent configuration
primarily governs one agent runtime; it is not a separate role-managed
authorization service.

LNSAT's target is different: resolved configuration, policy, approval,
adapter, target, and runtime identities become inputs to one server-owned
authorization decision. A client may request narrower behavior but cannot
replace a managed ceiling or mint execution authority.

### Confirmation is not separation of duties

Docker MCP Governance can require same-session MCP elicitation and re-evaluate
the approved request with a digest. Docker explicitly documents that this is a
confirmation guardrail, not administrator approval or separation of duties,
and that an autonomous MCP client can answer programmatically.

LNSAT's target approval model uses a distinct authenticated human
identity/session when policy requires it, binds that decision to exact request
and policy evidence, and still treats approval as non-authorizing. Gateway must
create a separate, scoped, expiring, one-time execution authorization.

### Policy decision is not complete consequence evidence

The public MCP Gateway policy result is an allow/reason/error decision. Its
open-source audit queue is bounded, ignores submission errors, and drops events
under backpressure. Docker's licensed organization-governance service provides
additional centralized audit records; this comparison does not equate those
service records with the open-source queue.

No reviewed public Docker source or documentation exposes the complete LNSAT
chain of exact intent digest, policy evidence, distinct approval evidence,
server authorization, atomic one-time consumption, executed-target receipt,
requested/approved/executed digest equality, `outcome_unknown`, and
reconciliation. Absence from reviewed public material is not proof that Docker
will never add it.

### Gateway scope is narrower than cross-runtime authority

Docker MCP policy governs activity routed through Docker's governed MCP path.
Official documentation also distinguishes direct agent MCP configuration and
warns that local stdio servers run on the host outside sandbox isolation.
Docker organization governance adds network and filesystem controls around
sandboxes, but it does not present itself as a general authorization protocol
for every consequential REST, CLI, A2A, database, deployment, or business
action outside that environment.

LNSAT's target is one authority lifecycle above several transports and
execution substrates. That broader boundary is useful only when every real
consequence path is forced through an authenticated LNSAT adapter. A bypassable
sidecar or optional SDK call provides no guarantee.

### Current public MCP policy limits matter

Docker's public documentation currently states:

- if MCP policy enforcement is not active for a user, MCP activity is
  permitted;
- Cedar principal attributes such as role or tenant do not match; organization
  or team scope supplies policy scope;
- tool and resource listing are not Cedar-gated;
- registration policy does not remove an existing registration;
- server groups are unsupported;
- tool annotations are advisory;
- approval is same-session elicitation, not out-of-band approval.

The public `docker/mcp-gateway` default policy client also returns allow when
the process is outside Docker Desktop or the `MCPGovernance` feature is not
enabled. These are bounded observations about reviewed versions, not claims
that Docker is insecure.

See [Docker MCP access policies](https://docs.docker.com/ai/sandboxes/governance/access-controls/mcp/),
[MCP policy reference](https://docs.docker.com/ai/sandboxes/governance/reference/mcp-policy/),
and [public default policy client](https://github.com/docker/mcp-gateway/blob/24b028f4f9aac85ce1a1057c5e8d739836e7c18d/pkg/policy/policy.go).

## LNSAT Multi-Mode Truth

LNSAT does not depend on Docker at the architecture level. Current substrate
taxonomy names source repositories, containers, virtual machines, hosts,
accelerators, data systems, remote services, and devices. MCP, A2A, REST, CLI,
and browser input must map to the same authority contract. Docker can be one
adapter or execution substrate without becoming the root of authority.

That is target architecture, not current support. Current LNSAT source proves a
loopback daemon, local SQLite authority state, read-only protocol surfaces,
and bounded disposable local-Git conformance. It does not ship a Docker
adapter, VM executor, microVM, remote executor, bare-metal hardening profile,
Kubernetes integration, fleet control plane, high availability, or supported
package. See [substrates and nodes](../architecture/SUBSTRATES_AND_NODES.md),
[project status](../PROJECT_STATUS.md), and
[distribution plan](../architecture/DISTRIBUTION_AND_CLIENT_INSTALLERS.md).

Future support must be claimed row by row:

1. one versioned runtime-target profile;
2. exact adapter, artifact, configuration, policy, and target digests;
3. authenticated and confidential transport where execution is remote;
4. isolation and least-privilege evidence for that runtime;
5. atomic authorization consumption before consequence;
6. bound receipt plus ambiguous-outcome reconciliation;
7. install, update, rollback, revocation, and support proof.

Native host or bare-metal operation may be one selected substrate. LNSAT must
not claim that its binary can safely lock down an arbitrary operating system.
Operators should combine LNSAT authority with OS accounts, mandatory access
controls, network policy, process isolation, containers, or VMs appropriate to
the threat model.

## Viable Product Direction

LNSAT remains viable if it avoids rebuilding Docker Agent, Docker Sandboxes,
or the MCP catalog.

```text
agent runtime (Docker Agent or another client)
  -> proposed consequential action
  -> LNSAT policy + distinct approval + one-time authorization
  -> adapter (Docker, VM, native host, remote service, or product connector)
  -> bound receipt / outcome_unknown / reconciliation
  -> durable evidence
```

Best integration posture:

- use Docker Agent for agent orchestration when it fits;
- use Docker Sandboxes for microVM isolation when it fits;
- use Docker MCP Gateway for MCP server lifecycle and routing when it fits;
- use LNSAT for cross-runtime action authorization and consequence evidence;
- require every adapter to consume LNSAT authority and return a bound result;
- never make Docker, MCP, or an agent's local configuration the only possible
  LNSAT execution path.

## Competitive Risks and Build Priority

Docker can close product gaps quickly. Contract depth alone is not a durable
advantage. LNSAT must prove one usable, forced, end-to-end path.

Priority remains:

1. finish Phase 10 operational configuration, visible precedence,
   authenticated diagnostics, and stable operator behavior;
2. finish one bounded Phase 11 consequential workflow through the real Gateway
   authority path;
3. freeze Phase 13 recovery, revocation, update, and compatibility behavior;
4. select and prove only one or two Phase 14 native/package rows for initial
   `v1.0.0`;
5. add Docker or another runtime as a reference adapter after the core executor
   boundary is stable.

Public source, transparent conformance, and runtime-neutral contracts can build
trust now. They are not substitutes for a supported binary, forced integration
path, operations proof, or production security review.
