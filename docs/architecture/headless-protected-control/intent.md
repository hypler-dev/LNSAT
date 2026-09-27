<!-- intent-driven-delivery:intent:v1 -->

# Intent: HCFG-5A protected online configuration transitions

Status: proposed
Authority: [Product Build Sequence, HCFG-5](../../PRODUCT_BUILD_SEQUENCE.md#headless-source-packet-order)
Owner: LNSAT maintainers
Accepted by: pending
Last updated: 2026-09-27

## Problem and evidence

The accepted V1 headless requirement needs authenticated configuration changes, durable audit, rollback, revocation, and emergency disablement. HCFG-3 currently parses and composes untrusted declarations for diagnostics only. There is no active headless configuration generation or protected `config apply` route. The existing Gateway session, approval, owner-recovery, and transactional audit foundations do not themselves grant configuration mutation authority.

## Desired outcome

After a separately proven initial bootstrap, an installation owner can apply a bounded active configuration through `lnsatctl` and the versioned Gateway API. A change cannot widen resource access or agent action authority without an explicit decision by a different authorized human. Every accepted transition is bound to the exact installation, declaration, resource identities, prior generation, decision, and durable audit record. Disablement and revocation remain higher-priority authority state and cannot be cleared by apply.

## Users and systems

Local installation owners, designated human approvers, operators, `lnsatctl`, `lnsatd` Gateway, the SQLite authority store, and platform resource-enforcement adapters. The core remains product-neutral.

## Constraints

- Gateway is the sole online authority path. CLI and later UI clients use the same versioned API; neither computes or bypasses authority.
- Initial bootstrap, offline backup, inert restore, and owner recovery remain local-only host-owner-proof exceptions under the [accepted V1 requirement](../../PRODUCT_BUILD_SEQUENCE.md#headless-configuration-and-control). Their exact new authority contracts require separate decisions.
- HCFG-3 content identity is not authenticated ownership, resource identity, OS enforcement, or activation evidence.
- No activation occurs until HCFG-6 proves the selected platform's exact resource controls and grant/use identity checks. Unsupported or unverifiable controls deny activation.
- Apply must not clear a stop or revocation. A future activation implementation must prove clone and stale-restore refusal with a trusted store anchor outside SQLite; this packet cannot receive activation acceptance until that anchor contract is approved.
- New mutation authority needs a separately accepted security decision and source packet before implementation. Human acceptance of this intent does not authorize merge, Docker proof, production use, packaging, or release.

## Non-goals

This design packet implements no route, store migration, CLI mutation, local bootstrap, emergency stop/resume, offline recovery, OS control, runtime dispatch, graphical management, Docker operation, package, or release. Monitoring HCFG-4 and the remaining HCFG-5 controls remain separate dependencies.

## Assumptions and verified facts

- Verified: HCFG-3's parser and composition return an unverified declared ceiling and a content digest; its CLI loader checks stable regular-file identity on Linux and macOS. See the [HCFG-3 specification](../headless-configuration/spec.md).
- Verified: active local sessions and approval decisions already use independent proof and immediate SQLite transactions; the existing approval decision does not itself authorize execution. See [Gateway approval decision](../GATEWAY_V1_APPROVAL_DECISION.md).
- Verified: local owner recovery already uses an exclusive database-path lease and grants no browser or action authority. See [Local owner recovery](../LOCAL_OWNER_RECOVERY.md).
- Assumption for review: a designated second human can be enrolled before an online privilege increase. A single-owner installation may bootstrap an initial least-privilege configuration and narrow it, but cannot widen it online without that second human.

## Risks

Highest risks are self-approval, stale or substituted declarations, target replacement after validation, active-pointer races, rollback regrant, copied-store replay, loss of audit evidence, and false claims that cancelling in-flight work proves non-execution. Failure must leave no newly active authority; the remaining state must be inspectable and recoverable through separately authorized paths. The copied-store and restore threat cannot be closed by a SQLite row or content digest alone.

## Acceptance evidence

- Human owner acceptance of activation remains unavailable until separate exact records define the store-anchor lifecycle, initial bootstrap trust root, approver enrollment, and distinct-person proof. This design can be reviewed now; only the pure non-activating comparator is eligible for a later bounded source proposal.
- Contract review checks every transition class, denial case, generation comparison, audit atomicity, revocation, rollback, and in-flight outcome rule.
- Later source packets supply focused store/Gateway/CLI tests, race and platform identity tests, broad repo gates, and fresh independent review. HCFG-6 and selected-target runtime proof remain separate release gates.

## Source-of-truth links

[Product Build Sequence](../../PRODUCT_BUILD_SEQUENCE.md#headless-configuration-and-control) is the canonical V1 requirement and sequencing authority. This proposed packet specifies a possible HCFG-5A contract; [Project Status](../../PROJECT_STATUS.md#current-build-position) owns implementation and acceptance truth. The [Phase 11 operator packet](../PHASE_11_REAL_DISPOSABLE_DOCKER_PROOF_OPERATOR_RUN_PACKET.md) remains the authority for Phase 11 execution status.
