# Security Policy

## Supported Scope

LNSAT is pre-release. Security reports should target current source, Gateway
contracts, policy/audit contracts, local persistence, CLI behavior, dependency
integrity, and future distribution boundaries.

Security properties in this repository are scoped implementation and test
claims, not a warranty, certification, compliance claim, or production-use
guarantee. Planned architecture is not an implemented control.

No production hosted runtime is active from this repository. Public
documentation or binary distribution endpoints are not operational LNSAT
endpoints and grant no Gateway, Control Center, enrollment, or runtime authority.

## Reporting

Report suspected vulnerabilities through
[GitHub private vulnerability reporting](https://github.com/hypler-dev/LNSAT/security/advisories/new).
If that link is unavailable, contact repository maintainers privately and do
not open a public issue containing vulnerability details.

Do not include raw secrets, credentials, tokens, private keys, customer data, or
exploit payloads in public issues.

## Handling Posture

Pre-release security response is maintainer best-effort; no response-time or
remediation SLA exists. Maintainers will prioritize credible authority bypass,
secret exposure, evidence tampering, and dependency compromise, coordinate
privately while risk remains active, and publish an advisory or release note
after a fix when public users may be affected.

## Vulnerability Classes

High-priority classes:

- Gateway policy bypass;
- approval bypass;
- audit evidence suppression or tampering;
- raw secret echo or storage;
- tenant/project isolation failure;
- capability escalation in clients, modules, installers, or MCP adapters;
- managed instruction, skill, profile, or context substitution;
- universal/provider/model overlay downgrade or origin forgery;
- gatekeeper-model false allow or delegated-role escalation;
- request-context cross-project or tenant leakage;
- extension sandbox escape, ambient credential access, or authority minting;
- CLI/local IPC spoofing or secret exposure through process arguments;
- entitlement state confused with action authority;
- unsigned or unverified artifact promotion;
- hosted-cloud authentication, session, or data-boundary failure.
- protocol downgrade or legacy/modern capability confusion;
- retry, cancellation, outage, or receipt ambiguity treated as action success;
- OAuth, SPIFFE, OTel, Registry, or framework evidence treated as action
  authority;
- registry digest, provenance, namespace, version, or vulnerability
  substitution;
- signer-provider request, purpose, identity, algorithm, digest, or lifecycle
  widening.

Repository checks include a required negative-case ledger and closed-boundary
truth check:

```sh
npm run security:conformance:check
npm run phase7d:truth:check
```

## Dependency Audit Gate

Run `npm run audit:dependencies:check`. The gate rejects every unexpected npm
advisory. One exact upstream exception exists for
`GHSA-frvp-7c67-39w9`: `@modelcontextprotocol/node` 2.0.0 pins vulnerable
`@hono/node-server` 1.19.x, while no compatible upstream MCP Node release is
available. The advisory concerns Windows `serveStatic`; LNSAT imports
`toNodeHandler` only and never imports or exposes `serveStatic`.

The exception is fail-closed. Package names, dependency paths, directness,
severity, affected range, advisory source and URL, fix availability, and exact
lock versions must all match. Any new advisory or drift fails CI. Remove the
exception when upstream MCP Node accepts `@hono/node-server` 2.0.5 or newer.

## Safe Harbor

Good-faith testing is welcome when it does not access systems, accounts, data,
or infrastructure not owned by the reporter. Do not perform denial-of-service,
social engineering, destructive testing, persistence, exfiltration, or live
Cloudflare/GitHub/package-registry mutation.

## Release Security

Before stable artifact release, every promoted artifact must have:

- source ref;
- checksum;
- signing status;
- SBOM status;
- provenance status;
- support window;
- rollback or disablement path;
- approval evidence.

Public repository visibility alone does not satisfy any release-security item.
See [public source readiness](docs/PUBLIC_READINESS.md) for history, privacy,
license, GitHub metadata, and source-cutover gates.
