# Strict Crypto Admission Design

Status: proposed design for the requested enterprise and government security
direction. Owner acceptance and implementation remain pending in the
[canonical work record](../PROJECT_STATUS.md#proposed-strict-crypto-admission-design).
This document specifies admission obligations before a later strict assurance
profile can activate. It selects no cryptographic module, provider, dependency,
algorithm, operating environment, certificate, key, deployment or supported
target. It defines no current configuration field, wire API, executable guard
or successful permit.

## Intent and product boundary

LNSAT must prevent an explicitly selected strict crypto requirement from being
satisfied by a library name, algorithm label, fixture, injected success value
or weaker fallback. A later implementation must support an independently
verified positive case with an actual selected module and environment. An
always-denying placeholder does not complete this requirement.

The accepted V1 runtime, headless configuration, SQLite authority store and
Gateway chain remain mandatory. This proposal adds neither a second authority
path nor private-key intake. Local source evaluation remains outside a strict
assurance claim; it does not become a downgrade target for a strict request.
Human identity/MFA/federation, encrypted storage/backup, authenticated transport,
protected audit and artifact assurance require their own implementation and
evidence. A crypto admission result cannot close those controls.

The existing [operation inventory](CRYPTO_OPERATION_PROVIDER_INVENTORY.md) binds
17 representative application/tooling operation classes to immutable source
`a92857ed762f28873990bd1f1a921b104363537e`. The documentation-only child
`87f4fcf85d6a443b6d847109b48d55d6e064edeb` changes no bound source blob.
The inventory is a starting point for a selected deployment's complete crypto
coverage analysis, not a transitive or compiled census.

## Evidence basis and non-claims

The [NIST CMVP validated-module guidance](https://csrc.nist.gov/Projects/cryptographic-module-validation-program/validated-modules)
distinguishes module validation from algorithm certificates, identifies module
version and operational environment, and explains certificate status and
security-policy evidence. This proposal derives conservative LNSAT admission
requirements from that guidance; it does not declare a module eligible or
certify the application. The exact selected profile must determine applicable
validation rules and transition dates from current authoritative evidence.

The [NIST authentication assurance guidance](https://pages.nist.gov/800-63-4/sp800-63b/aal/)
has distinct authenticator, verifier, channel and phishing-resistance
requirements. A validated crypto component alone cannot establish an AAL, MFA,
federation assurance or government deployment authorization. Jurisdiction,
customer/agency, information class and deployment boundary remain unresolved;
the U.S. references are provisional design inputs.

## Required profile decision

Before implementing a particular strict profile, the owner and reviewer must
accept its exact applicability, coverage, module/provider and source contracts.
The specification must also define how final source/artifact/module/environment
identities will be captured and verified. Those final identities follow reviewed
source and separately authorized construction/capture; they are required before
strict admission, not before their source implementation exists.

| Input              | Required exact decision                                                                                                                              |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Applicability      | Deployment boundary, information class, assurance requirements and the party responsible for tailoring them                                          |
| Product scope      | Selected core target, candidate source/component boundaries and active protocol paths; exact final source/artifact capture and verification contract |
| Crypto coverage    | Complete required operation inventory, including transitive/runtime crypto paths and external boundaries relevant to the selected deployment         |
| Module/provider    | Exact implementation/version, approved mode, permitted services and immutable binary/component capture contract                                      |
| Validation         | Applicable standard, certificate identity/status, authentic security-policy evidence, limitations and accepted operating environment                 |
| Environment        | Exact OS/architecture, build/link/load configuration and method that verifies actual module association at use                                       |
| Entropy and health | Applicable entropy/DRBG provenance, initialization, self-tests, error states and bounded health/freshness checks                                     |
| Keys               | Explicit owner/custody references, permitted uses, separation, rotation, revocation and recovery obligations                                         |
| Lifecycle          | Admission, change, stop/revocation, existing-attempt handling and audit/privacy requirements                                                         |

Actual final pins remain unset until captured and independently reviewed. A
provisional source/candidate identity cannot substitute for final association
evidence or enable admission. Construction/capture follows the existing build
sequence and exact later authorization; this design opens no earlier build.

None of these inputs is supplied by this proposal. The existing runtime-profile
identities and compatibility declarations are unchanged. A future crypto
profile must not be inferred from `docker_local.v1`, `docker_local.v2`, a build
flag, an operating-system label or a provider's marketing description.

## Complete operation coverage

The selected specification must bind every relevant operation to one reviewed
disposition. No unmatched operation may be implicitly exempted.

1. **Covered active operation:** exact invocation path and parameters are bound
   to an admitted implementation/module, permitted service and environment.
2. **Disabled operation:** the selected product has no reachable invocation
   path. Configuration and source tests must reject attempts to activate it.
3. **External boundary:** the selected specification identifies the independent
   component, channel, trust, cryptographic coverage, custody and evidence that
   it requires. An external or injected verifier is not an exemption from an
   applicable strict requirement.
4. **Unresolved operation:** missing, contradictory or unverifiable evidence
   blocks the affected profile. It cannot be relabeled disabled or external to
   obtain admission.

Rust daemon/SQLite, Node local-beta/PostgreSQL and Web Crypto paths require
separate actual-backend bindings if selected. A Rust module certificate does
not cover a Node/OpenSSL or browser implementation. Current Argon2id, `OsRng`,
SHA-256, Ed25519, browser headers and injected OAuth/SPIFFE seams supply no
strict module/environment evidence by themselves. The independent CSRF proof
is not a second human authentication factor.

The coverage review must include password derivation, random generation,
digests, signature verification, authenticated channels and storage/backup
crypto required by the selected profile. Artifact/update verification belongs
to its exact release lifecycle boundary. Optional signing/custody lanes remain
closed; a disabled signer seam neither activates signing nor satisfies future
artifact-signing evidence.

## Admission sequence

A later exact implementation contract must specify closed input types,
bounded decoding/canonicalization, private provenance, error classes and race
handling for this sequence. This document does not supply a caller-constructible
evidence object, JSON permit, generic observer trait or provider registry.

1. Resolve the protected selected profile and its exact approved specification
   under the existing installation/configuration/generation authority.
2. Verify complete coverage and immutable source/artifact/module/security-policy
   identities. Reject missing or ambiguous implementations and unapproved paths.
3. Authenticate the current module and operating-environment association using
   the selected specification's concrete trusted method. A caller assertion,
   environment variable, fixture, certificate URL or file hash alone is
   insufficient.
4. Verify eligible validation status, approved mode, permitted services,
   initialization, required self-tests and current bounded health/error state.
   Historical, revoked or otherwise disallowed evidence denies under the exact
   selected new-system policy. This is a proposed product admission rule,
   not a statement that every historical certificate is revoked.
5. Bind applicable key references and custody state, including current
   rotation/revocation policy. Never load a raw key from an agent request,
   ambient environment, command line, evidence JSON or public log.
6. Revalidate the required facts at their exact use points. The selected
   contract must define freshness bounds, observation provenance and the
   mechanism preventing substitution between admission and use.
7. Compose only with the existing Gateway policy, human approval where
   required, current installation/generation/epoch/stop/revocation and exact
   one-time attempt release. Successful crypto checks grant no action authority
   and cannot independently start a process or emit a consequence receipt.

No network discovery, module download, provider activation, key generation,
certificate trust-on-first-use, automatic mode change or fallback occurs during
admission. Obtaining or refreshing validation/provider evidence has its own
reviewed authenticated transport and custody procedure. Unavailable evidence
denies; it does not authorize an unreviewed fetch.

## Failure, change and recovery behavior

- Missing coverage, wrong identity/version/environment, unapproved mode,
  failed self-test, unhealthy entropy/provider, unknown validation status,
  revoked key or inaccessible required evidence rejects before the protected
  operation. No software/default provider or password-only path is substituted.
- The exact specification must treat relevant module, build/load, policy,
  certificate eligibility, custody or crypto-profile changes as reviewable
  protected changes. Cached admission cannot survive a bound identity change.
  Existing generation/epoch/stop serialization remains controlling; no parallel
  crypto authority counter is invented here.
- A provider failure after durable claim/consumption must retain consumed and
  uncertain state. It never implies that a consequence did not happen, refunds
  one-use authority or permits redispatch. If durable audit/state recording is
  itself unavailable, stop new release and preserve the uncertainty for the
  exact recovery contract; do not invent successful evidence.
- Recovery and rollback must prove the selected module, custody and evidence
  association again. Restoring a database or earlier binary cannot silently
  restore revoked keys, a disallowed provider/mode or broader authority.
- Public errors remain bounded and secret-safe. Later audit/privacy contracts
  must define allowed references and fields. Credentials, key material, token
  values, provider responses and private configuration do not enter public
  status, arguments, telemetry or evidence exports.

## Required acceptance tests and actual proof

The module-specific source contract must provide an independent positive
oracle and negative/race tests. It must not merely test its own flags.

| Case                      | Required evidence                                                                                                             |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Complete approved mapping | Actual selected module/environment and all required active operations; independent verifier confirms the mapping              |
| Missing or new operation  | Coverage gap rejects, including a newly reachable transitive/runtime path                                                     |
| Substitution              | Wrong binary, module version, load path, OS/architecture, build mode or security-policy identity rejects                      |
| Invalid validation        | Missing, stale under the selected freshness policy, revoked, historical/disallowed or mismatched certificate evidence rejects |
| Mode and health           | Unapproved mode, failed initialization/self-test or unknown/error health rejects without fallback                             |
| Entropy                   | Required entropy/DRBG provenance or health evidence missing/changed rejects                                                   |
| Key lifecycle             | Wrong custody/use, unavailable key, stale version, rotation, revocation and recovery substitutions reject                     |
| Adapter separation        | Injected claims/success, algorithm labels, another component's certificate and source fixtures cannot create admission        |
| Concurrency               | Bound module/profile/key changes and revocation concurrent with admission/use cannot release stale authority                  |
| Interrupted attempt       | Pre-release failures stop; post-claim ambiguity remains consumed/unknown and cannot redispatch                                |
| Privacy                   | Secret canaries and unexpected provider fields do not reach public errors, telemetry or exports                               |
| Recovery                  | Restored state remains inert until exact accepted revalidation; revoked/broader authority is not reinstated                   |

Source tests prove only their named contracts. Actual module association,
operating environment, positive services, self-tests/error states and key
custody require separately authorized selected-target evidence. Software
source, algorithm tests, a metadata inventory and green CI are not that proof.

## Delivery and approval gates

1. Independently review and obtain human acceptance of this proposed admission
   design. That acceptance would cover design only, without choosing a module,
   selecting a deployment or opening implementation/activation.
2. Select one exact deployment/profile and actual module/provider; create its
   detailed source, compatibility, custody, input/output and coverage contracts.
   Obtain acceptance before protected/public-contract implementation.
3. Implement real bounded source and positive/negative tests under those
   contracts. Review source and all integration dependencies; do not declare an
   inert skeleton or always-denying gate complete.
4. Independently review source integration only through the separately accepted
   protected configuration, authority/store and runtime boundaries. Review the
   concrete methods for future association checks; source integration does not
   need an already activated installation or grant strict admission. HCFG-6
   source-order, complete native freeze and activation gates remain separate
   engine requirements, with no bypass of their pin requirements.
5. Capture final application/module/build/load/environment identities and actual
   target/crypto/key evidence under the existing Phase 11/13/14 sequence and
   exact separate construction/observation authority. All required pins and
   positive association/health/custody proof must verify before strict admission.
   Complete the required source/security freeze, selected-target lifecycle and
   artifact assurance before supported claims or publication.

No Docker observation/execution, host mutation, install, candidate artifact,
private-key/provider call, merge, signing, release, deployment or production
action is authorized here. The Phase 11 operator packet remains runtime
authority, `PREPARED_SOURCE_ONLY_NOT_EXECUTION_READY`, with blocking pins unset.
