# `@lnsat/core`

Product identity and shared source constants for LNSAT.

This workspace is intentionally small. Domain contracts belong in their owning
packet, policy, audit, API, or adapter workspaces.

## Exports

- `LNSAT_CORE_VERSION` and `LNSAT_PRODUCT_NAME` identify the unpublished
  workspace package.
- `ProductLifecycleStatus` defines neutral product maturity states without
  encoding internal milestones.
- `currentProductLifecycleStatus` is `active_development` for the current
  pre-release source tree.

The removed build-phase names had no repository source consumers, so no legacy
alias is retained. This status is maintainer metadata, not a serialized API or
schema value.

## Develop

```sh
npm run typecheck -w @lnsat/core
npm run test -w @lnsat/core
npm run build -w @lnsat/core
```

See [architecture and developer guide](../../docs/architecture/ARCHITECTURE_AND_DEVELOPER_GUIDE.md).
