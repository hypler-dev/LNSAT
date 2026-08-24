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
advisory. Current lock resolves top-level `@hono/node-server` 2.0.11 and
MCP-nested 1.19.17. The updated
[GitHub advisory](https://github.com/advisories/GHSA-frvp-7c67-39w9) identifies
2.0.5 and 1.19.15 as first patched versions. Current registry audit reports no
vulnerability or active allowance.

The obsolete compatibility allowance has been removed. The evaluator rejects
every package in any nonempty vulnerability object, always returns an empty
`allowedAdvisories` list, and does not load `package-lock.json` for exception
matching. The former advisory remains only as a negative test fixture that must
reject both `@hono/node-server` and `@modelcontextprotocol/node`. Any new
advisory fails CI.

CI also runs `npm run audit:signatures:check` after a lifecycle-script-disabled
clean install. The wrapper validates npm's signature-audit JSON schema and
rejects every invalid or missing registry signature before source checks run.

Audit subprocess output is untrusted input. The wrapper does not reflect raw
registry stderr, package names, signature-report values, or process-start
details. Malformed JSON, unsupported schemas, nonzero npm exits, process-start
failures, any vulnerability, and any invalid or missing signature fail with a
bounded public-safe diagnostic.

## Local Control-Socket Security

The experimental P10-A3 `lnsatctl health` and `lnsatctl status` source uses an
explicit Unix-domain socket on macOS and Linux. It does not select a default
socket or send its bearer through TCP, HTTP URLs, DNS, proxies, redirects,
discovery, retries, or remote transports.

Before transmitting request bytes or the bearer, the client requires:

- one absolute, bounded, normalized UTF-8 socket path;
- a canonical parent path with no symlink traversal;
- parent mode `0700` and socket mode `0600`;
- parent and socket ownership by the effective user;
- a non-symlink socket file with stable device, inode, owner, and mode; and
- a connected peer whose effective user matches the client.

The daemon independently rejects an unequal peer effective user before reading
request bytes. The session token is accepted only through stdin and is
zeroized after request construction. `GET` and `HEAD` use equal authentication
and authorization; `HEAD` returns the same declared content length without a
body. Missing, malformed, expired, revoked, unreadable, or unauthorized session
evidence produces one generic denial and does not reflect secrets or paths.

These are scoped source-and-test claims. Windows named pipes, remote
administration, supported installation paths, service lifecycle, and production
deployment remain unimplemented and unsupported.

## Public Development Security

Public development does not weaken review or release boundaries. Protected
`main` changes require a pull request, configured source checks, an eligible
independent approval, and resolved review conversations. Green CI is evidence,
not merge authority. Maintainers do not bypass branch protection, force-push
protected history, or treat repository visibility as release approval.

GitHub-hosted settings live outside this source tree and must be reverified at
each consequential gate. At this document update, the public repository has
vulnerability alerts, Dependabot security updates, dependency-graph generation,
secret scanning, and push protection enabled. Those settings provide defense in
depth; source checks remain fail-closed when provider state is unavailable or
cannot be proven.

## Supply-Chain Status And Remaining Gates

Current and planned controls are deliberately distinct:

| Area                  | Current source or repository control                                                                                                                                                       | Remaining gate before supported release                                                                                                                |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| npm                   | Exact Node/npm engines, lockfile installs, lifecycle scripts disabled in CI, strict peer dependencies, SHA-512 registry integrity, signature audit, and zero-tolerance vulnerability audit | Keep registry audit schemas and trusted-publishing/provenance policy current                                                                           |
| Cargo                 | Pinned Rust toolchain, `Cargo.lock`, crates.io checksums, no Git dependencies, and locked fetch                                                                                            | Add pinned, checksum-verified `cargo-deny` advisory, license, and source-policy enforcement plus an expiring exception ledger                          |
| FastMCP/Python        | Exact direct FastMCP 3 and 4 profile pins, isolated disposable virtual environments, and no production dependency claim                                                                    | Select an exact Python patch and OS/architecture matrix, then commit complete transitive `--require-hashes` locks for both profiles                    |
| Dependency automation | Vulnerability alerts and security updates enabled in the public repository                                                                                                                 | Add bounded weekly npm, Cargo, pip, and GitHub Actions update configuration without auto-merge, private registries, or broad grouping                  |
| Package publication   | Every npm workspace is private and no source claim grants namespace ownership or publication authority                                                                                     | Prove authenticated `@lnsat/*` namespace ownership, package-name availability, 2FA or trusted publishing, provenance, and release approval in Phase 14 |

Until the Cargo and Python gates are implemented, lockfile review and current
advisory checks are evidence snapshots, not continuous proof. Exceptions must
be exact, owned, time-bounded, removal-triggered, and fail closed on expiry or
schema drift. No dependency tool may install globally, mutate a production
environment, consume unreviewed credentials, or download and execute an
unverified installer.

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
