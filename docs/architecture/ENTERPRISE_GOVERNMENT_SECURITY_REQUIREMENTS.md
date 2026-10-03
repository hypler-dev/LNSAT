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

## Required work and acceptance evidence

These are proposed implementation requirements, not implemented capabilities.
Each protected/public-contract change needs an exact accepted spec, focused
tests and fresh independent review before its behavior is integrated.

| Area                     | Required behavior                                                                                                                                                                                                                                                                                                                                                       | Evidence before a supported claim                                                                                                                                                                           |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Human identity           | Explicit identity trust, phishing-resistant MFA for the selected enterprise/government assurance profile, reauthentication for consequential approval, and safe enrollment/recovery. Federation, if selected, validates issuer, audience, signature, nonce, expiry and assurance before creating a local identity/session binding.                                      | Forged/stale/wrong-audience/replayed assertion denials, enrollment and recovery tests, credential/session/epoch revocation, and actual selected authenticator proof.                                        |
| Authorization            | Gateway remains the single authority boundary; identity, scoped role, policy, distinct-human approval, installation/generation/epoch, stop/revocation and exact consumed attempt agree immediately before release.                                                                                                                                                      | Unauthorized role/action/resource negatives, all-writer serialization tests, no redispatch on ambiguity, and actual nonempty runtime proof.                                                                 |
| Host and runtime         | Non-root controller, authenticated private daemon/channel, held resource identity, exact mounts/namespaces/capabilities and enforceable cgroup/output/deadline limits. Unsupported or unverifiable control denies.                                                                                                                                                      | Complete HCFG-6 source freeze, independent native review, hostile input tests and later separately authorized selected-target positive/negative proof.                                                      |
| Crypto and keys          | Inventory password derivation, randomness, digest, signature, transport, storage and artifact-signing operations. An explicitly selected strict crypto profile binds the exact approved backend/module/version/operating environment; unavailable evidence or approved mode denies without downgrade. Keys remain explicit references with rotation/revocation/custody. | Reviewed operation/provider inventory, exact module certificate/security-policy/environment evidence where required, self-test/error-state and key-lifecycle proof; no library or algorithm-name inference. |
| Audit integrity          | Bind actor/session/action/resource/configuration/attempt/outcome and security events; preserve consumed/unknown state. Provide bounded redacted export, retention policy and explicit tamper detection/collection boundary. Trusted-host-owner anti-tamper claims require separately proven protected collection or anchoring.                                          | Modified/missing/reordered event negatives, export privacy tests, retention/recovery tests and verified collector/anchor proof if claimed.                                                                  |
| Data and transport       | No ambient secret inheritance or telemetry by default. Explicit data classification, redaction, export/retention and crypto-at-rest boundary. Remote transport or external services require a separately reviewed authenticated transport/privacy contract.                                                                                                             | Secret canaries, no-sensitive-output tests, key/storage custody and explicit transport/export proof. A loopback listener or backup checksum alone is not encryption evidence.                               |
| Supply chain             | Reproducible selected-target artifacts, verified signatures, SPDX JSON SBOM, SLSA v1 provenance, dependency/advisory/license policy, vulnerability response, supported update/revocation and rollback.                                                                                                                                                                  | Exact Phase 13 RC source and Phase 14 immutable artifact identity, signature/SBOM/provenance verification and update/rollback rehearsals.                                                                   |
| Resilience and assurance | Fuzz bounded parsers, test crashes/races/outages/resource pressure, rehearse backup/restore/credential recovery and incident response; perform independent security review.                                                                                                                                                                                             | Named tests, targeted threat-model coverage, exact restored-state inertness, failure injection and documented residual limits/operational ownership.                                                        |

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
