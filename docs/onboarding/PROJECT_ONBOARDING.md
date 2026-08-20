# Project Onboarding

- Status: planned workflow over experimental source contracts

Project profiles describe owner, source, runtime, checks, risk boundaries,
allowed capabilities, and secret references. Validation fails closed.

## Product Direction

Project onboarding eventually binds exact organization/workspace profile,
universal instructions and skills, provider/model overlays, context rules,
connector/module compatibility, and assignment evidence. Portable identity and
conformance belong to public LNSAT; rich shared-library and visual management
may live downstream.

Current profile contracts do not activate these future systems. Read
[ADR-0003](../architecture/ADR-0003_OPEN_CORE_EXTENSIONS_AND_MANAGEMENT_PLANE.md),
[agent configuration management](../architecture/AGENT_CONFIGURATION_SKILL_AND_CONTEXT_MANAGEMENT.md),
and [project status](../PROJECT_STATUS.md).

Recommended flow:

1. Create project profile from public template or typed contract.
2. Declare trusted source references and local checks.
3. Attach policy profile and allowed agent roles.
4. Resolve exact instruction, skill, context, and overlay digests when
   supported.
5. Compile first context packet and explicit work-context identity.
6. Verify rejected secret values, conflicting capabilities, overlay downgrade,
   and cross-project assignment.
7. Inspect result through CLI, API, MCP, or Control Center.

Onboarding does not grant live connectors, deploy rights, database credentials,
model authority, commercial entitlement, or infrastructure control.
