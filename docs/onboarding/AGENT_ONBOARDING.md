# Agent Onboarding

- Status: planned workflow; no onboarding command or active agent profile exists

Agent profiles bind identity, provider kind, role, project scope, capabilities,
budgets, session TTL, approval rules, and output contract.

## Expanded Product Boundary

Every agent in a chain should eventually bind:

- immutable universal and model-specific configuration digests;
- role/capability ceiling, allowed delegation, escalation, audience, and depth;
- work-context identity and project/environment/resource scope;
- instruction, skill, context, provider, model, and framework provenance;
- expiry, revocation, compatibility, evaluation, and rollback evidence.

Gatekeeper/delegator models may classify or route but cannot approve, grant
roles, sign evidence, issue authorization, or suppress audit. Unknown,
conflicting, stale, or low-confidence state denies or escalates.

Recommended flow:

1. Create bounded agent profile.
2. Attach one or more project scopes.
3. Resolve exact effective configuration and work context when supported.
4. Compile source-grounded context packet.
5. Show allowed, approval-required, blocked, and escalation capabilities.
6. Route capability and delegation requests through Gateway policy.
7. Require authenticated human approval where policy says
   `approval_required`.
8. Produce audit evidence for every decision, assignment, correction, and
   revocation.

Profiles never contain raw secrets, private keys, production credentials,
unbounded shell, direct deploy access, or bypassed authentication.
