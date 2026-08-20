# `@lnsat/api`

Gateway inspection and loopback local-control-plane source.

## Responsibilities

- validate requests at Gateway boundary;
- expose bounded inspection contracts;
- compose policy, approval, and audit foundations;
- support authenticated loopback integration tests.

This workspace does not provide production hosting, unrestricted dispatch,
external provider access, or production database configuration.

Future agent-content, context-grouping, module, connector, model, entitlement,
and graph APIs remain Gateway contracts. They cannot delegate authority to UI,
CLI, MCP, framework adapter, model classifier, or downstream service.

Exported Gateway source-status metadata uses neutral `contract_only`,
`local_only`, or `read_only` values. Local-beta HTTP responses retain four
legacy wire-status values until a separately versioned response contract opens;
compatibility assertions prevent accidental drift.

`GET /v1/local-beta/operations/reconciliation` projects the shared synthetic
operation-reconciliation fixture through a loopback-only, Host/Origin-checked,
read-only route. It accepts no query scope and exposes no mutation method.

Canonical project-state inspection uses
`POST /v1/project-state/inspect`, contract
`lnsat.gateway.project_state.v0_1`, optional `request_id` and `item_id`, and
neutral synthetic fixtures under `fixtures/project-state/items/`. The legacy
`POST /v1/build/packets/inspect` route remains available with its exact request,
response, error, fixture, and path contract during the documented compatibility
window.

## Develop

Run from repository root:

```sh
npm run typecheck -w @lnsat/api
npm run test -w @lnsat/api
npm run build -w @lnsat/api
```

See [system architecture](../../docs/architecture/SYSTEM_ARCHITECTURE.md) and
[local development](../../docs/LOCAL_DEVELOPMENT.md).
