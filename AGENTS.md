# LNSAT Contributor Instructions

LNSAT provides execution authorization and evidence for consequential agent
actions. Keep changes bounded, reviewable, and fail-closed.

## Start

1. Run `git status --short --branch`.
2. Read `README.md`, `docs/DOCS_INDEX.md`, and relevant source/tests.
3. Use targeted search and focused validation before broad scans.

Graphify is optional. Use it when exact-symbol relationships help; never block
work on graph availability or generated graph output.

## Agent Routing

- Use Codex Spark High workers for bounded implementation, review, tests, and
  documentation when capacity exists.
- If Spark is unavailable or capacity-limited, keep work in the primary Codex
  session.
- Do not use Qwen, local-model, or other smaller-model fallbacks for LNSAT
  source, review, test, documentation, or log-summary work.
- Primary Codex retains architecture, security, database, authorization,
  deployment, and final-review judgment.

## Product Boundary

- Gateway is security boundary; MCP remains adapter layer.
- Secrets are references only. Never commit values.
- Agents never receive direct infrastructure control.
- New mutation authority requires explicit design, policy, approval, audit,
  rollback, and tests.
- Marketing site source lives outside this repository.

## Engineering

- Prefer small vertical changes with tests.
- Preserve public contracts or document compatibility changes.
- Use `rg` for search and repository-native checks for validation.
- Keep console fixture-backed and read-only until runtime integration is
  deliberately opened.
- Do not commit generated output, local state, credentials, or operator notes.

## Validation

Run focused checks while developing, then:

```sh
npm run check
npm run public:check
```

Rust checks use pinned `rust-toolchain.toml`. Toolchain installation remains an
explicit operator action; scripts never install implicitly.
