# `@lnsat/mcp`

Read-only MCP adapter over LNSAT Gateway inspection contracts.

MCP is transport and translation, not security authority. Current source uses
official TypeScript v2 split packages for MCP 2026-07-28 read-only stdio and an
in-process stateless HTTP handler. Explicit negotiation retains 2025-11-25 as
temporary legacy compatibility. No network listener or hosted service is
enabled.

FastMCP 3.4.5 legacy-profile and FastMCP 4.0.0b1 modern-profile harnesses,
closed OAuth admission validation, JSON Schema 2020-12 checks, and downgrade
negatives provide experimental interoperability evidence. They add no runtime
authority or core Python dependency.

Future MCP exposure for profiles, skills, instructions, contexts, graphs,
modules, connectors, or models remains transport only. MCP install/discovery or
tool metadata cannot grant extension capability, content assignment, approval,
or execution authority.

Exported MCP status metadata uses the neutral `read_only` value. Existing
protocol-visible status fields retain their exact legacy values behind private
compatibility constants until a separately versioned contract migration.

Project-state inspection uses `lnsat.project.state.inspect.v0_1`. The legacy
`lnsat.build.packet.read` alias remains read-only and deprecated; removal is not
before `2.0.0` and requires at least one supported-release deprecation window.
The canonical tool accepts optional `request_id` and neutral `item_id`, delegates
to `lnsat.gateway.project_state.v0_1`, and returns its response under
`gateway_response`. The legacy alias retains its exact legacy payload and
fixture paths.

## Develop

```sh
npm run typecheck -w @lnsat/mcp
npm run test -w @lnsat/mcp
npm run build -w @lnsat/mcp
```

See [MCP SDK guide](../../docs/sdk/mcp.md) and
[adapter design](../../docs/architecture/MCP_ADAPTER_DESIGN.md).
