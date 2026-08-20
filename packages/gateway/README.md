# `@lnsat/gateway`

Transport-neutral inspection, identity, recovery, and interoperability
contracts for LNSAT experimental source.

Gateway is authority boundary. HTTP, MCP, CLI, browser, A2A, and future runtime
adapters must preserve same decisions, bindings, errors, and evidence. An
adapter cannot grant authority by itself.

Current package is marked `private: true` and is not published or supported.
Current runtime behavior remains bounded to documented local experimental
surfaces.

## Develop

```sh
npm run typecheck -w @lnsat/gateway
npm run test -w @lnsat/gateway
npm run build -w @lnsat/gateway
```

See [system architecture](../../docs/architecture/SYSTEM_ARCHITECTURE.md) and
[authority workflow](../../docs/architecture/AUTHORITY_LAYER_AND_REFERENCE_WORKFLOW.md).
