# `@lnsat/console`

Read-only LNSAT Control Center built with Next.js.

Current routes cover dashboard, knowledge, packets, agents, approvals, audit,
operations, substrates, readiness, and settings. Most panels are synthetic
fixture previews. Operations also provides one explicit exact-ID, read-only
same-origin Gateway load beside a separately labeled synthetic panel. It does
not poll, retry, reconcile, cancel, submit receipts, or mutate state. No route
performs runtime dispatch or database mutation.

## Develop

Run from repository root:

```sh
npm run dev -w @lnsat/console
npm run typecheck -w @lnsat/console
npm run test -w @lnsat/console
npm run build -w @lnsat/console
```

See [Control Center architecture](../../docs/architecture/MANAGEMENT_UI_INFORMATION_ARCHITECTURE.md).

Future expanded surfaces may inspect work contexts, profiles, instructions,
skills, delegation, graphs, connectors, modules, models, libraries, and
organization policy. Inventory, node graph, workflow graph, source editor,
diff, and timeline views serve different relationships. None exists because it
is named here; visual edits must become versioned Gateway proposals.
