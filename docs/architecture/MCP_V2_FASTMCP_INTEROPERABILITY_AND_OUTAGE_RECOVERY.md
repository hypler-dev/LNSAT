# MCP 2026-07-28, Framework Interoperability, and Outage Recovery

- Status: experimental source implemented; no runtime authority
- Verified upstream baseline: 2026-08-05
- Current implementation: canonical MCP 2026-07-28 read-only handlers plus temporary legacy compatibility
- Canonical source protocol: MCP 2026-07-28

This record separates protocol support, framework compatibility, transport
admission, LNSAT authorization, durable operation recovery, and production
support. Checked-in source and tests establish experimental implementation only;
they do not establish production support.

## Upstream Baseline

Dependency selection is evidence-gated. Versions below were checked against
official project documentation and package registries on 2026-08-04. Before any
install or lockfile change, recheck version, integrity, license, support state,
security advisories, and repository identity.

| Component                      | Verified version                   | Integrity                                                                                             | License/support posture                                                           | Planned LNSAT lane                         |
| ------------------------------ | ---------------------------------- | ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------ |
| MCP specification              | `2026-07-28`                       | Versioned official specification                                                                      | Current modern protocol                                                           | Canonical experimental source protocol     |
| `@modelcontextprotocol/server` | `2.0.0`                            | npm `sha512-YhHWdHfpFMQfd0prsEnxKeS3Qz3ytIGmsS0sth4KDjnacIT7hxk6hXHkJ9KysxlkvTM+WZAtQbbcUhdoP4Hvtw==` | MIT; Node 20+                                                                     | Native TypeScript modern server            |
| `@modelcontextprotocol/client` | `2.0.0`                            | npm `sha512-8f1OghQ2rjzIOfqgUCP+8GiUWqRs89njoWLNqAe8kWmDePv3s1fZXseej+QXemssEuuOvLLmLO/kqM3IQHtISw==` | MIT; Node 20+                                                                     | Conformance client only when needed        |
| `@modelcontextprotocol/core`   | `2.0.0`                            | npm `sha512-pJCEwGG7Lfr/+PQp9ZTwKXNeO5wzbfKL7H3MYpCorM4oFBoQrdjnBgEoqG+RjhsvS1FKrDbKux+M1HhlnGWqcA==` | MIT; Node 20+                                                                     | Shared modern protocol types               |
| `@modelcontextprotocol/node`   | `2.0.0`                            | npm `sha512-Y4hAC2XdGDUdDOCbLDOCA4+aL3NUldjsOWlDL/YwpAxrPhRm1xHd7lZ+mLacvZ9t3PaH28wgNoaLQGrIk1P2pg==` | MIT; Node 20+                                                                     | Node HTTP wrapper if HTTP opens            |
| `@modelcontextprotocol/sdk`    | `1.30.0`                           | npm `sha512-xKd8OIzlqNzcqcNumGAa6g+PW2kjD5vrpcKOnfldAUPP3j7lnqMPwlTXQm8gF+UwH72z0lqaRbjr9hqGz0eITA==` | MIT; transitive through conformance tool                                          | Test-only transitive dependency            |
| MCP conformance                | `0.1.16`                           | npm `sha512-GI7qiN0r39/MH2srVUR3AXaEN0YLCro20lIBbnvc1frBhszenxvUifBuTzxeVQVagILfBzCIcnungUOma8OrgA==` | MIT; stable conformance release; framework supports 2025-06-18/2025-11-25 only    | Loopback legacy scenario plus declared gap |
| FastMCP                        | `3.4.5`                            | wheel SHA-256 `5d3d438eb2917e63e6faf53e8cb8fe26d887ec3232f848093a4eecad7fa34861`                      | Apache-2.0 classifier; Python 3.10+; stable maintenance                           | Optional legacy-era interop                |
| FastMCP                        | `4.0.0b1`                          | wheel SHA-256 `d66eb7b0763ffff2ae0fc573778ea25604dcb7e59769e5afaf9851a806eb1129`                      | Beta; modern/sessionless and dual-era features; not production-supported by LNSAT | Experimental modern interop                |
| A2A                            | protocol `1.0`, spec patch `1.0.1` | Signed upstream source tag/release evidence required before vendoring                                 | Stable protocol; independent transport                                            | Read-only delegation-envelope conformance  |

FastMCP `3.4.5` sdist SHA-256 is
`a95f2bc876bef42e8b50f7872f24f3f2fe3b1d37408c734e8b9d9e03014b72d3`.
FastMCP `4.0.0b1` sdist SHA-256 is
`f98d69588a73e1672840558641d5d0f111e207baffe001f3465713a53ebb6b4c`.
FastMCP 2.x is outside target scope.

`@modelcontextprotocol/node` 2.0.0 still pins `@hono/node-server` 1.19.x.
Upstream advisory `GHSA-frvp-7c67-39w9` concerns the Windows `serveStatic`
path; LNSAT imports `toNodeHandler` only and never imports or exposes
`serveStatic`. `npm run audit:dependencies:check` accepts only that exact
moderate advisory at the pinned package, dependency path, range, source, and
lock versions. Any advisory or dependency drift fails closed.

## Support Matrix

Definitions:

- **planned**: accepted direction, not source proof;
- **implemented**: checked-in source exists;
- **tested**: repository validation covers named behavior;
- **experimental**: source may change and has no compatibility commitment;
- **production-supported**: published, maintained support claim;
- **deprecated**: retained only for bounded migration.

| Surface                                     | Planned              | Implemented | Tested | Experimental | Production-supported | Deprecated     |
| ------------------------------------------- | -------------------- | ----------- | ------ | ------------ | -------------------- | -------------- |
| Legacy MCP local stdio read-only inspection | yes                  | yes         | yes    | yes          | no                   | yes, temporary |
| MCP 2026-07-28 read-only stdio              | yes                  | yes         | yes    | yes          | no                   | no             |
| MCP 2026-07-28 stateless HTTP handler       | yes                  | yes         | yes    | yes          | no                   | no             |
| Dual-era legacy/modern negotiation          | yes                  | yes         | yes    | yes          | no                   | no             |
| FastMCP 3.4.5 interop                       | yes                  | yes         | yes    | yes          | no                   | no             |
| FastMCP 4.0.0b1 interop                     | yes                  | yes         | yes    | yes, beta    | no                   | no             |
| MCP Tasks extension                         | optional             | no          | no     | planned      | no                   | no             |
| A2A 1.0 read-only mapping                   | yes                  | yes         | yes    | yes          | no                   | no             |
| MCP OAuth protected-resource admission      | yes                  | yes         | yes    | yes          | no                   | no             |
| OTel protocol correlation                   | yes                  | yes         | yes    | yes          | no                   | no             |
| SPIFFE workload authentication interface    | yes                  | yes         | yes    | yes          | no                   | no             |
| Registry quarantine and supply-chain checks | yes                  | yes         | yes    | yes          | no                   | no             |
| Signer-provider interface                   | yes                  | yes         | yes    | yes          | no                   | no             |
| Control Center operation readback           | yes                  | yes         | yes    | yes          | no                   | no             |
| State-changing MCP/A2A tools                | separate future gate | no          | no     | no           | no                   | no             |

HTTP implementation is a Fetch-compatible handler exercised on loopback; no
production or public listener exists. SPIFFE, Registry, and signer rows are
closed interfaces/test doubles, not live infrastructure integrations.

## Standards Disposition

- Required source lanes: JSON-RPC 2.0, MCP 2026-07-28 plus bounded legacy
  negotiation, official TypeScript v2 split packages, stdio/HTTP-handler
  semantics, JSON Schema 2020-12, OAuth admission, cross-interface schema
  parity, durable operation recovery, OTel/W3C Trace Context, security
  negatives, and SBOM/provenance contracts.
- Bounded adapters: FastMCP 3.4.5, FastMCP 4.0.0b1, A2A 1.0, optional SPIFFE,
  Registry quarantine, and PKCS#11/cloud KMS/HSM signer-provider interfaces.
- Optional presentation/export only: AG-UI, MCP Apps, CloudEvents, and
  OPA/Rego advisory policy input. None grants action authority.
- Watch only: MCP Tasks, Skills over MCP, Agent Network Protocol drafts,
  AP2/UCP payment protocols, and a future stable FastMCP 4 release.
- Excluded: separate IBM ACP support after its A2A merge, new Roots/Sampling
  dependencies, protocol Logging as an observability substitute, generic agent
  frameworks/schedulers, and a proprietary policy language.

## Conformance Evidence and Upstream Gap

Stable command `npm run mcp:official-conformance` runs
`@modelcontextprotocol/conformance` 0.1.16 against one temporary loopback HTTP
server and passes its supported 2025-11-25 `server-initialize` scenario. It then
runs official v2 SDK stdio/client and MCP 2026-07-28 HTTP tests.

Conformance 0.1.16 exposes server scenarios only for 2025-06-18 and
2025-11-25 and exposes no stdio server runner. Therefore modern 2026-07-28 and
stdio coverage is accurately labeled `official_sdk_tests`, not upstream
framework coverage. `fixtures/contracts/security-conformance-ledger-v0_1.json`
records that gap plus 25 required security negatives.

## Authority Invariants

```text
MCP / A2A / REST / CLI / UI
              |
              v
      Gateway contract handler
              |
 validation -> policy -> approval -> authorization -> dispatch -> receipt
```

- Gateway is sole LNSAT security and action-authority boundary.
- Protocol or framework authentication admits caller; it does not authorize an
  action.
- Packet, prompt, OAuth token, MCP task, A2A task, FastMCP context, registry
  metadata, OTel span, or SPIFFE identity never grants action authority.
- Every transport must produce same decision and evidence for same canonical
  request, identity, policy facts, and time.
- Unknown versions, methods, capabilities, fields, tools, state transitions,
  identity bindings, or evidence fail closed.
- Adapter responses cannot widen Gateway output, hide denial, or synthesize
  approval, completion, receipt, rollback, or cancellation evidence.

## Modern MCP and Dual-Era Negotiation

MCP 2026-07-28 changes protocol shape. Modern entrypoints may operate without
legacy `initialize`, use `server/discover`, support per-request metadata, use
JSON Schema 2020-12, and support stateless Streamable HTTP. Legacy clients and
servers use handshake/session-era behavior.

Required negotiation behavior:

1. Detect modern or legacy protocol from explicit protocol evidence only.
2. Never infer downgrade permission from timeout, parse failure, or transport
   error.
3. Return protocol-defined unsupported-version error `-32022` when applicable.
4. Permit fallback only under explicit configured compatibility policy.
5. Record selected era and server identity in correlation evidence.
6. Route both eras to same Gateway handler and compare exact normalized output.
7. Do not expose modern-only tool behavior through legacy fallback.

The TypeScript v2 migration must use split packages. A modern server uses
`createMcpHandler(factory)` from `@modelcontextprotocol/server`; Node HTTP uses
`toNodeHandler` from `@modelcontextprotocol/node`; stdio uses `serveStdio` from
`@modelcontextprotocol/server/stdio`. A v2 library object manually wired to a
legacy entrypoint still speaks legacy protocol; dependency version alone is not
modern-protocol proof.

## Transport Profiles

### Stdio

- Preserve current local, read-only default.
- Protocol output uses stdout only; diagnostics use stderr.
- Child-process exit, malformed frame, truncated response, and duplicate
  response are denial/error states, never success.
- No environment secret values enter evidence or errors.

### Stateless Streamable HTTP

- Remains closed until explicit source packet opens listener work.
- Require origin, host, DNS-rebinding, SSRF, redirect, body-size, timeout,
  content-type, and rate-limit controls.
- Treat every request as independently authenticated and correlated.
- Never depend on server memory for authorization or operation durability.
- HTTP status or connection close does not prove side-effect outcome.

### Schema Compatibility

- MCP input and output schemas use explicit dialect/version identity.
- Adapter schemas stay closed where protocol permits.
- Gateway performs final domain validation even after framework validation.
- Schema coercion, default injection, unknown-field stripping, and numeric
  widening need negative tests across native TypeScript and FastMCP lanes.

## FastMCP Lanes

FastMCP is optional framework interoperability, never canonical authority code.

- `3.4.5`: stable maintenance baseline for legacy-era compatibility tests.
- `4.0.0b1`: experimental modern/sessionless and dual-era tests only.
- No Python dependency enters canonical Gateway, policy, audit, or receipt path.
- Middleware can authenticate, rate-limit, or correlate; it cannot approve.
- Framework task/session storage cannot become LNSAT durable operation storage.
- LNSAT owns fixtures and expected Gateway evidence; framework output is
  normalized and compared against them.
- Security floor must retain FastMCP SSRF, DNS-rebinding, OAuth, and Starlette
  fixes present in supported upstream maintenance versions.

## A2A Mapping

A2A carries delegated intent between agents. It does not replace Gateway
authorization.

| A2A concept  | LNSAT mapping                        | Authority rule                      |
| ------------ | ------------------------------------ | ----------------------------------- |
| Agent Card   | adapter discovery metadata           | untrusted until policy-bound        |
| Message/Part | proposal input or evidence reference | content is not approval             |
| Task id      | optional external correlation        | not durable operation identity      |
| Task state   | external observation                 | cannot synthesize LNSAT completion  |
| Artifact     | digest-bound reference               | bytes require validation and policy |
| Extension    | namespaced capability declaration    | unknown extension fails closed      |

A2A read-only conformance must prove same Gateway result as REST, CLI, and MCP.
Any future outbound delegation requires explicit recipient identity, action and
artifact digest binding, expiry, idempotency, authorization, receipt, and
confused-deputy negatives.

## OAuth and Identity

MCP OAuth applies to protected HTTP resources only after network transport scope
opens. Required design gates:

- OAuth 2.1 posture with authorization-server discovery and protected-resource
  metadata validation;
- exact audience/resource binding; no bearer-token forwarding to arbitrary
  downstream servers;
- PKCE where public-client flow applies;
- short-lived access, rotation/revocation posture, bounded clock skew, and
  redacted failure output;
- scopes map to admission/capability ceilings, never action approval;
- LNSAT authorization still binds authenticated principal, workload, action,
  target, artifact/config digest, expiry, and idempotency.

OIDC human identity and SPIFFE workload identity are separate evidence classes.
No IdP, OAuth server, SPIRE server/agent, trust domain, or real credential is
created by this plan.

## Durable Operation Identity

Before any future consequential dispatch, persist:

- `operation_id`;
- canonical packet/action digest and exact tool-argument digest;
- authorization ID and expiry;
- idempotency key;
- adapter and remote server identities;
- negotiated protocol era/version;
- attempt number;
- optional external task ID;
- request, dispatch, observation, and completion timestamps;
- optional receipt and trace correlation IDs.

Required states:

`prepared`, `authorized`, `dispatching`, `accepted`, `working`,
`input_required`, `completed`, `failed`, `transport_unavailable`,
`outcome_unknown`, `reconciling`, `cancel_requested`, `expired`, `orphaned`.

Rules:

- `transport_unavailable`: dispatch not established; no execution claim.
- `outcome_unknown`: request may have crossed side-effect boundary.
- `cancel_requested`: intent only, not cancellation proof.
- external task completion with application error maps to failed outcome.
- LNSAT `completed` requires Gateway-sourced result and receipt evidence.
- retry uses same operation and idempotency key while authorization remains
  exact and valid.
- timeout, disconnect, lost task ID, stale status, redelivery, and worker restart
  reconcile before retry or terminal outcome.
- `request_state` is short-lived continuation only, never authorization,
  durable state, or audit evidence.

MCP Tasks is optional extension `io.modelcontextprotocol/tasks`, not core MCP
authority or exactly-once proof. Operation state must exist independently of an
external task ID.

## Observability and Workload Identity

- OTel traces/metrics/logs are correlation and operations signals only.
- Trace context may be recorded as bounded metadata but never hashed as
  approval or treated as durable receipt evidence.
- Sensitive packet, prompt, secret, token, approval, and artifact content stays
  out of attributes and baggage.
- SPIFFE IDs may identify authenticated workloads after trust deployment is
  separately approved; they do not grant actions.
- Workload identity, human identity, adapter identity, and remote server
  identity remain distinct and jointly policy-bound where required.
- Unknown trace headers or SPIFFE identities fail closed at their owned boundary
  without changing Gateway decision semantics.

## Registry and Supply Chain

Official MCP Registry is preview and cannot be treated as durable availability,
identity, trust, approval, or support evidence.

- Registry data is discovery input only.
- Pin package/repository identity, exact version, integrity digest, license,
  provenance, and review date independently.
- Reject mutable tags, digest drift, repository transfer ambiguity, typosquats,
  unsupported versions, yanked releases, and unknown licenses.
- Produce SBOM/provenance evidence before release eligibility.
- Registry outage or reset must not prevent use of already approved, locally
  pinned metadata; it must prevent unverified discovery/install.
- No package publish, release, marketplace listing, or external registration is
  authorized here.

## Signer and Trust Interfaces

Signer interfaces remain source-only contracts until explicit P1 authorization
opens real trust work.

- Define provider-neutral sign/verify metadata and public-safe error contracts.
- Keep private material outside packets, logs, traces, fixtures, docs, and agent
  context.
- Bind algorithm, key/reference identity, action/evidence digest, purpose,
  issuer, audience, creation time, expiry, and revocation status.
- Separate local test doubles from HSM/KMS/SPIRE/IdP integrations.
- Unknown algorithm, key, issuer, audience, or revocation state fails closed.

Current interfaces do not authorize keys, certificates, signatures, trust
roots, HSM/KMS calls, SPIRE deployment, production verifier behavior, or signed
approval activation.

## Control Center Presentation

Current fixture-backed UI displays operation identity, state, attempt count,
authorization expiry, last observation, degraded/stale state, receipt posture,
and disabled reconciliation controls. UI must:

- distinguish transport failure from action failure;
- distinguish requested cancellation from confirmed terminal state;
- prevent blind retry;
- show unsupported/experimental status from support matrix;
- never label OTel span, task state, OAuth admission, or registry record as
  approval or execution proof;
- remain fixture-backed and read-only until runtime integration is explicitly
  opened.

## Required Conformance and Negative Tests

- legacy/modern negotiation, explicit fallback, and downgrade denial;
- native TypeScript v2 entrypoint behavior;
- FastMCP 3 stable and FastMCP 4 beta wire/schema parity;
- stdio framing and stateless HTTP behavior;
- OAuth resource/audience/redirect/issuer failures;
- MCP Tasks absent, lost, stale, errored, and duplicate states;
- A2A task/artifact/extension identity failures;
- worker restart, lost response after effect, duplicate retry, redelivery,
  cancellation ambiguity, authorization expiry, orphaning, reconciliation;
- OTel baggage/attribute redaction and non-authority;
- SPIFFE identity mismatch and non-authority;
- registry outage, digest drift, yanked/unsupported package, license/provenance
  failure;
- signer unknown/revoked/mismatched identities with no real key material;
- exact REST/MCP/A2A/CLI Gateway decision and evidence equality.

See
[Phase 8 adapter authority conformance](PHASE_8_ADAPTER_AUTHORITY_CONFORMANCE.md)
for test ownership and claim gates.

## Implemented Packet Sequence

1. Frozen docs, upstream evidence, support matrix, and authority invariants.
2. Added protocol-neutral fixtures and legacy/modern negotiation contracts.
3. Migrated native TypeScript read-only adapter to v2 split packages.
4. Added legacy compatibility and dual-era conformance.
5. Added optional FastMCP 3/4 and A2A read-only test lanes.
6. Added durable/test-only operation state/recovery contracts and tests.
7. Added OAuth, OTel, SPIFFE, Registry, supply-chain, and signer interfaces as
   closed source-only contracts.
8. Added fixture-backed read-only Control Center operation presentation.
9. Added official-framework/SDK checks and 25-case security ledger.

Separate authorization remains required before any network listener, DB
migration, real identity/trust, runtime dispatch, mutation, deploy, or release.

## Closed Scope

No production runtime, optional DB migration `0018` or new runtime migration,
cloud/IdP/SPIRE/HSM/KMS mutation,
real key or trust material, package publish, release, merge, PR, or deployment
is authorized by this document. No adapter gains state-changing authority.

## Official References

- [MCP 2026-07-28 specification](https://modelcontextprotocol.io/specification/2026-07-28)
- [MCP 2026-07-28 changelog](https://modelcontextprotocol.io/specification/2026-07-28/changelog)
- [MCP version negotiation](https://modelcontextprotocol.io/specification/2026-07-28/basic/versioning)
- [TypeScript SDK v2 migration](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/migration/support-2026-07-28.md)
- [MCP Tasks extension](https://modelcontextprotocol.io/extensions/tasks/overview)
- [MCP Registry](https://modelcontextprotocol.io/registry/about)
- [FastMCP updates](https://gofastmcp.com/updates)
- [A2A protocol 1.0 announcement](https://a2a-protocol.org/latest/announcing-1.0/)
- [A2A specification](https://github.com/a2aproject/A2A/blob/main/docs/specification.md)
