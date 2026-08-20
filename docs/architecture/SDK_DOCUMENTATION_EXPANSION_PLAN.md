# SDK Documentation Coverage

SDK documentation is organized as a maintained public reference, not a release
backlog.

## Current Surfaces

- `docs/sdk/README.md`: navigation and audience guide;
- `docs/sdk/typescript-reference.md`: exported TypeScript contracts;
- `docs/sdk/mcp.md`: MCP inspection adapter;
- `docs/sdk/agent.md`: agent context and policy profiles;
- `docs/sdk/extensions.md`: connector and extension manifests;
- `docs/sdk/conformance.md`: compatibility fixtures and checks;
- `docs/sdk/examples.md`: safe source examples;
- `docs/sdk/migration.md`: version and boundary changes;
- `docs/sdk/release.md`: package and publication gates.

## Maintenance Rules

- Source exports and validators remain authoritative.
- Examples use synthetic data and fail-closed defaults.
- Each contract page states version, ownership, authority, and side effects.
- Breaking changes include migration guidance.
- Package publication remains separate from source readiness.

Documentation coverage is checked through link and public-readiness validators.
