# Enterprise and Government Security Requirements

Status: requested product direction; detailed implementation contracts and
deployment-specific assurance remain pending. On 2026-10-03 the human owner
required advanced security for enterprise and government use. The
[Project Status security record](../PROJECT_STATUS.md#enterprise-and-government-security-direction)
owns current requirement/implementation truth. This supporting document adds
testable work to the existing Phase 13/14 gates; it supplies no certification,
runtime authorization or successful security assessment.

LNSAT remains a neutral, embeddable authority runtime and package. Gateway
owns authorization. Protocol adapters do not gain infrastructure authority.
Hosted SaaS, fleet/HA and multi-tenancy are not implicitly opened by this
requirement. Console remains fixture-backed until deliberately integrated.

## Current evidence and missing assurance

Local source already includes password verification, random session/CSRF
credentials, scoped owner/operator/auditor roles, policy and distinct approval,
exact one-time consumption, security events and offline recovery foundations.
The local authentication crate uses Argon2id and domain-separated SHA-256
session commitments. Optional signed-approval Ed25519 verification remains a
primitive without activated custody/authority. See
[local authentication](../../crates/lnsat-auth/README.md) and
[security policy](../../SECURITY.md).

Inspected source does not establish phishing-resistant MFA/federated identity,
a FIPS-validated crypto provider, externally anchored audit history or a
completed signed update/artifact pipeline. Source tests are not selected-target
OS proof. HCFG-6 native enforcement, atomic bootstrap, protected control,
monitoring and actual runtime remain required alongside these security tasks.

The private headless preparation source includes a strict journal codec and
Linux descriptor-based file custody under the actual selected-store lease.
Finite bounds, immutable revisions, retained stat/content baselines and failure
denial address this source seam only. It does not establish encrypted storage,
external audit anchoring, observation truth, rollback resistance across restart,
complete native enforcement or certification. See the
[canonical implementation record](../PROJECT_STATUS.md#stage-a-private-linux-journal-custody-candidate).

The [crypto operation/provider inventory](CRYPTO_OPERATION_PROVIDER_INVENTORY.md)
records named application operations and their source/provider boundaries at one
immutable source revision. Its manual blob bindings prepare provider design;
they are not a compiled crypto census, strict-profile activation or assurance
evidence. [Project Status](../PROJECT_STATUS.md#crypto-operation-provider-source-inventory)
owns that work record.

The [proposed strict crypto admission design](STRICT_CRYPTO_ADMISSION_DESIGN.md)
defines the required complete operation coverage and exact module/environment,
approved-mode, validation, health and key evidence boundary. It selects no
provider or deployment and implements no guard. Its
[Project Status record](../PROJECT_STATUS.md#proposed-strict-crypto-admission-design)
retains pending owner acceptance and implementation.

The [proposed human authentication design](HUMAN_AUTHENTICATION_ASSURANCE_DESIGN.md)
defines the human/session/decision assurance boundary and compares local WebAuthn
with selected OIDC federation. Numeric-loopback origin compatibility, exact
trust/enrollment/recovery, revocation and privacy contracts remain unresolved.
It implements no MFA or federation; its
[Project Status record](../PROJECT_STATUS.md#proposed-human-authentication-assurance-design)
owns pending acceptance and implementation.

The [proposed audit/privacy and custody design](AUDIT_PRIVACY_AND_EVIDENCE_CUSTODY_DESIGN.md)
separates private authority data, authorized disclosure, optional diagnostics
and independently verified history custody. It defines failure, retention and
inert restore requirements without selecting or implementing a collector,
encryption provider or export permission. Its
[Project Status record](../PROJECT_STATUS.md#proposed-audit-privacy-and-evidence-custody-design)
owns pending acceptance and exact implementation contracts.

## Required work and acceptance evidence

These are proposed implementation requirements, not implemented capabilities.
Each protected/public-contract change needs an exact accepted spec, focused
tests and fresh independent review before its behavior is integrated.

| Area                     | Required behavior                                                                                                                                                                                                                                                                                                                                                                              | Evidence before a supported claim                                                                                                                                                                           |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Human identity           | Explicit identity trust, phishing-resistant MFA for the selected enterprise/government assurance profile, reauthentication for consequential approval, and safe enrollment/recovery. Federation, if selected, validates issuer, audience, signature, nonce, expiry and assurance before creating a local identity/session binding.                                                             | Forged/stale/wrong-audience/replayed assertion denials, enrollment and recovery tests, credential/session/epoch revocation, and actual selected authenticator proof.                                        |
| Authorization            | Gateway remains the single authority boundary; identity, scoped role, policy, distinct-human approval, installation/generation/epoch, stop/revocation and exact consumed attempt agree immediately before release.                                                                                                                                                                             | Unauthorized role/action/resource negatives, all-writer serialization tests, no redispatch on ambiguity, and actual nonempty runtime proof.                                                                 |
| Host and runtime         | Non-root controller, authenticated private daemon/channel, held resource identity, exact mounts/namespaces/capabilities and enforceable cgroup/output/deadline limits. Unsupported or unverifiable control denies.                                                                                                                                                                             | Complete HCFG-6 source freeze, independent native review, hostile input tests and later separately authorized selected-target positive/negative proof.                                                      |
| Crypto and keys          | Inventory password derivation, randomness, digest, signature, transport, storage and artifact-signing operations. An explicitly selected strict crypto profile binds the exact approved backend/module/version/operating environment; unavailable required evidence or unavailable/unapproved mode denies without downgrade. Keys remain explicit references with rotation/revocation/custody. | Reviewed operation/provider inventory, exact module certificate/security-policy/environment evidence where required, self-test/error-state and key-lifecycle proof; no library or algorithm-name inference. |
| Audit integrity          | Bind actor/session/action/resource/configuration/attempt/outcome and security events; preserve consumed/unknown state. Provide bounded redacted export, retention policy and explicit tamper detection/collection boundary. Trusted-host-owner anti-tamper claims require separately proven protected collection or anchoring.                                                                 | Modified/missing/reordered event negatives, export privacy tests, retention/recovery tests and verified collector/anchor proof if claimed.                                                                  |
| Data and transport       | No ambient secret inheritance or telemetry by default. Explicit data classification, redaction, export/retention and crypto-at-rest boundary. Remote transport or external services require a separately reviewed authenticated transport/privacy contract.                                                                                                                                    | Secret canaries, no-sensitive-output tests, key/storage custody and explicit transport/export proof. A loopback listener or backup checksum alone is not encryption evidence.                               |
| Supply chain             | Reproducible selected-target artifacts, verified signatures, SPDX JSON SBOM, SLSA v1 provenance, dependency/advisory/license policy, vulnerability response, supported update/revocation and rollback.                                                                                                                                                                                         | Exact Phase 13 RC source and Phase 14 immutable artifact identity, signature/SBOM/provenance verification and update/rollback rehearsals.                                                                   |
| Resilience and assurance | Fuzz bounded parsers, test crashes/races/outages/resource pressure, rehearse backup/restore/credential recovery and incident response; perform independent security review.                                                                                                                                                                                                                    | Named tests, targeted threat-model coverage, exact restored-state inertness, failure injection and documented residual limits/operational ownership.                                                        |

## Standards mapping and claim boundary

The first mapping provisionally uses U.S. standards while jurisdiction,
agency/customer, information class and deployment boundary are clarified.
These references guide design; they do not automatically make every control
applicable or prove its implementation.

- [NIST SP 800-53 release 5.2.0](https://csrc.nist.gov/News/2025/nist-releases-revision-to-sp-800-53-controls)
  supplies a security/privacy control catalog for the deployment control matrix.
  Customer/agency tailoring and assessment remain necessary.
- [NIST SP 800-63B-4](https://pages.nist.gov/800-63-4/sp800-63b/aal/)
  distinguishes authentication assurance. AAL2 offers a phishing-resistant
  option; AAL3 requires phishing-resistant authentication. LNSAT has no current
  AAL claim, and a password-only path is not labeled as MFA.
- [NIST CMVP](https://csrc.nist.gov/Projects/cryptographic-module-validation-program/validated-modules)
  validates exact crypto modules/configurations. An approved algorithm or
  algorithm certificate alone does not validate the application or module.
  Current LNSAT source supplies no FIPS validation claim.
- [NIST SP 800-171 Rev. 3](https://csrc.nist.gov/pubs/sp/800/171/r3/final)
  addresses CUI protection in nonfederal systems. The actual agency/contract
  must determine applicable revision, scope and assessment; no CMMC conformity
  or CUI-handling authorization is inferred here.
- [NIST SSDF 1.1](https://csrc.nist.gov/pubs/sp/800/218/final)
  guides the secure development and vulnerability-response lifecycle.
- [FedRAMP scope guidance](https://www.fedramp.gov/2026/scope/)
  concerns cloud use cases and agency determination. A package, an agency's
  deployed system and a hosted cloud service have different evidence
  boundaries. LNSAT currently claims no FedRAMP status or agency authorization.

The control matrix must separate package behavior, host/daemon requirements,
identity/key providers, customer operations and agency authorization. Physical,
personnel, procurement and organizational controls are not satisfied by source
code alone. Classified use is not claimed.

## Independent scrutiny and future certification

On 2026-10-03 the owner required rigorous independent scrutiny and preparation
for future third-party ISO and government assessment. Each claimed security
property needs a traceable requirement, exact implementation identity, explicit
trust assumptions, nonempty positive proof, hostile/failure/race negatives,
independently reproducible evidence and recorded residual limits. Assertions,
test counts and a reviewer's credential alone cannot establish a property.
Formal models or proofs must state their covered semantics and assumptions;
source tests cannot be labeled a proof of untested native behavior.

[ISO/IEC 27001:2022](https://www.iso.org/standard/27001) addresses an
organization's information security management system. Product security
evaluation under [Common Criteria](https://www.commoncriteriaportal.org/)
requires a selected evaluation scope, security claims, configuration and
independent scheme/laboratory process. Future scheme, protection profile,
assurance package, jurisdiction and government procurement controls remain
unselected. No ISO certificate, Common Criteria level, government approval or
universal deployment fitness is claimed. Certification and organizational
operations cannot be completed by changing this repository alone.

## Delivery order

Complete the accepted HCFG/native/store/control runtime work. In parallel,
finish the control/crypto inventory, exact identity/provider design and audit
privacy contract. Implement reviewed bounded source slices, then complete
Phase 13 reliability/security/recovery freeze. Phase 14 selected-target build,
artifact/assurance proof and final publication retain separate gates.

Security requirements constrain the build now. A strict deployment profile
cannot activate while its required evidence is absent. No generic successful
observer, dynamic plugin, diagnostic-to-authority conversion, automatic weaker
provider fallback or empty-only initializer can close these requirements.
