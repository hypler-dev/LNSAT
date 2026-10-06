# Agent Standards and V1 Gap Review

- Status: research and proposed follow-up scope
- Research date: 2026-09-30
- Source baseline: public `main` at `e09a6b02634b04a46f861ed8b092acc2c2e50fe8`
- Runtime, release, and support effect: none

This review connects current agent standards to the accepted LNSAT V1 outcome.
It does not accept pending designs or create another readiness ledger.
[Project status](../PROJECT_STATUS.md) owns implementation truth,
[the build sequence](../PRODUCT_BUILD_SEQUENCE.md) owns the V1 critical path,
and the [Phase 11 operator packet](../architecture/PHASE_11_REAL_DISPOSABLE_DOCKER_PROOF_OPERATOR_RUN_PACKET.md)
owns runtime-proof status. The [standalone V1 decision](../architecture/ADR-0008_LNSAT_STANDALONE_V1_SCOPE.md)
continues to define the product boundary.

## Research Findings

The standards below address different parts of agent operation. The LNSAT
implications are engineering recommendations, not claims of certification,
complete interoperability, or supported operation.

| Area                | Primary evidence checked on 2026-09-30                                                                                                                                                                                                                                                                                          | Implication for LNSAT                                                                                                                                                                                             |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tool transport      | [MCP 2026-07-28](https://modelcontextprotocol.io/specification/2026-07-28) defines a stateless core and versioned extensions. Its [tool specification](https://modelcontextprotocol.io/specification/2026-07-28/server/tools) treats annotations from untrusted servers as untrusted.                                           | Maintain the existing pinned source profile. A tool name, annotation, or connection cannot establish the identity and authority of an executable action.                                                          |
| Agent collaboration | [A2A 1.0](https://a2a-protocol.org/v1.0.0/specification/) defines versioned task interaction and authenticated access. Cancellation is an attempt and is not guaranteed to succeed.                                                                                                                                             | Preserve the existing internal mapping boundary. Remote task status, message IDs, and cancellation acknowledgements cannot replace LNSAT operation identity or consequence evidence.                              |
| Runtime controls    | [OWASP Agent Control Standard](https://genai.owasp.org/resource/agent-control-standard-acs/) describes portable middleware hooks and runtime policy controls.                                                                                                                                                                   | Assess a bounded adapter after the core workflow is proven. A cooperative hook cannot establish coverage for an agent that retains direct resource access.                                                        |
| Identity            | The [NIST AI Agent Standards Initiative](https://www.nist.gov/artificial-intelligence/ai-agent-standards-initiative) prioritizes agent interoperability, authentication, and identity research. [SPIFFE](https://spiffe.io/docs/latest/spiffe-about/spiffe-concepts/) defines workload identity and assumes workload isolation. | Keep authenticated human, requesting agent, executing workload, and approver identities distinct. Live identity-provider integration remains a separate profile; identity evidence cannot grant action authority. |
| Observability       | [OpenTelemetry GenAI guidance](https://opentelemetry.io/blog/2026/genai-observability/) describes agent and tool tracing with optional content capture. [GenAI conventions](https://opentelemetry.io/docs/specs/semconv/gen-ai/) have moved to a dedicated repository.                                                          | Correlate evidence through a pinned, redacted export profile. Preserve durable audit when telemetry is unavailable; do not capture prompts, tool arguments, credentials, or customer content by default.          |
| Container identity  | The [OCI image specification](https://specs.opencontainers.org/image-spec/) distinguishes configuration, manifest, optional index, and layers. [Descriptors](https://specs.opencontainers.org/image-spec/descriptor/) bind content type, digest, and byte size.                                                                 | Complete Phase 11 image and byte-custody proof using its owning contracts. A mutable tag or a digest string alone cannot prove the bytes observed or executed.                                                    |
| Artifact trust      | [SLSA 1.2 artifact verification](https://slsa.dev/spec/v1.2/verifying-artifacts) compares authenticated provenance with expected builder and build inputs.                                                                                                                                                                      | Preserve Phase 14 verification of exact canonical artifacts. Build provenance and a valid signature cannot prove runtime isolation, approval, or successful execution. No SLSA level is asserted here.            |

[MCP security guidance](https://modelcontextprotocol.io/docs/2026-07-28/tutorials/security/security_best_practices)
also identifies token passthrough, confused-deputy, SSRF, and local-server risks.
Compatibility work must retain audience separation, bounded discovery, endpoint
validation, and explicit client consent where applicable. These are transport
and access controls; the Gateway must still decide each concrete action.

## Preserve the V1 Critical Path

The research strengthens the existing goal: a usable, embeddable authority
runtime with a stable API, complete headless operator control, one proven
approved-action loop, and selected canonical artifacts. More protocol surface
does not close these requirements. Current gate results belong in their owning
records, not this dated review.

| Existing gate                      | Work needed for the accepted outcome                                                                                                                                     | Evidence that closes the gap                                                                                                                                                                                 |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Headless configuration and control | Complete bounded monitoring, protected configuration and owner decisions, then observed enforcement coverage. Keep resource access separate from agent action authority. | Accepted packet implementation, authenticated positive and denial cases, restart and revocation behavior, and proof that a declared restriction is actually enforced on the selected platform.               |
| Phase 11 reference workflow        | Finish the authenticated proof driver, image identity and byte custody, bounded launch, ambiguity handling, and independent cleanup verification.                        | Separately authorized disposable runtime proof against exact identities, with one consequence, bound receipt, rejection cases, restart/reconciliation, and cleanup evidence required by the operator packet. |
| Phase 13 source freeze             | Close the existing security, reliability, migration, recovery, emergency control, update, rollback, revocation, and dependency gates.                                    | Independent review and the complete required source evidence for one frozen RC revision. Passing source tests alone does not prove the selected artifact.                                                    |
| Phase 14 core artifacts            | Select the minimal supported OS/architecture rows and prove the canonical components and their lifecycle.                                                                | Exact artifact identities, reproducibility, SBOM/provenance, verification, installation and headless operations, recovery, update, rollback, and revocation evidence for every selected row.                 |

The initial integration example should exercise the same approved disposable
Git action through the versioned Gateway contracts. It must show approval
denial, changed-request rejection, duplicate submission, uncertain outcome,
authenticated evidence readback, and recovery. A runnable example using the
proven components is more useful than additional disconnected protocol
fixtures. Its runtime and artifact steps remain owned by Phases 11 and 14.

## Proposed Expansion After Core Proof

These candidates preserve the existing optional-lane boundary. They do not add
V1 exit gates or authorize new mutation paths. Each selected candidate needs a
bounded intent/specification, compatibility and privacy review, focused tests,
independent review, and an explicit supported profile before a support claim.

| Candidate                    | Smallest useful scope                                                                                              | Required admission and failure evidence                                                                                                                                                                                                                                               |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework or ACS adapter     | Translate one exact action request into the existing Gateway lifecycle and return its evidence references.         | Authenticate the caller; preserve exact arguments and resource identity; deny unavailable authority; invalidate approval after action/schema changes; identify direct-access bypass coverage. An altered action requires a new request.                                               |
| A2A wire interoperability    | Adapt one selected 1.0 binding to the current internal mapping and exact Gateway operation.                        | Official wire-schema fixtures and real peer interoperability; version mismatch and identity denial; scoped task readback; duplicate, out-of-order, reconnect, and cancellation cases without fabricated consequence status. Current internal mapping is not a wire-conformance claim. |
| Redacted OTel export         | Export allowlisted operation correlation and decision/attempt/result metadata to an operator-selected sink.        | Pin convention and schema versions; test forbidden content and bounded labels; preserve audit and operation state on sink failure; disclose external destinations. No exporter or new external transfer is opened by this review.                                                     |
| Workload identity profile    | Verify one explicitly selected credential provider and trust domain through the existing authentication interface. | Credential expiry, rotation, revocation, wrong audience/trust domain, verifier outage, and issuer substitution cases; no credential values in agents or telemetry; authentication never satisfies human approval.                                                                     |
| Connector trust and coverage | Admit one immutable connector definition with explicit resource and credential boundaries.                         | Pin executable and schema identities; quarantine substitutions; revalidate before dispatch; verify whether each permitted resource path is mediated or constrained. Unknown coverage must remain visible.                                                                             |

MCP Tasks, generic delegation engines, broad hosted/fleet topology, hardware
attestation, and rich management UI remain separate lanes. They should be
selected only when a concrete integration requires them and their owning
decisions permit them. The current headless and disposable-action requirements
remain the next product work.

## Maintenance Triggers

Review a selected compatibility profile when its upstream specification or SDK
changes security requirements, deprecates a feature, or changes schemas. Record
the exact supported revision and migration evidence; do not follow a rolling
`latest` document as a runtime contract or silently accept a downgrade.

A review should name the changed upstream requirement, affected LNSAT contract,
current test coverage, smallest necessary patch, privacy implications, and
supported-row effect. Unsupported protocols remain unsupported until evidence
exists. Research, design acceptance, implementation, runtime proof, and release
authorization remain distinct states.
