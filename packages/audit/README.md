# `@lnsat/audit`

Audit evidence, append semantics, idempotency, and PostgreSQL writer
foundations for LNSAT.

Migration and writer source support disposable loopback verification. They do
not create production roles, configure credentials, or grant database authority.

The parallel stable v1 audit-event contract rebuilds the full v1
packet-policy-approval source chain before producing evidence. It stores only
bounded references, result/reason fields, deterministic source/event digests,
idempotency, timestamps, and explicit redaction state. Content digests are not
signatures or authentication. Events request no persistence and authorize no
execution.

Stable idempotency conformance classifies unseen keys as append proposals,
same-key/same-event identities as exact replay, and same-key/different-event
identities as fail-closed collisions. It validates bounded prior refs, performs
no write, and returns no side effects. TypeScript and Rust consume same shared
vectors.

Exported source-status metadata uses neutral `source_only` and `contract_only`
values. Earlier milestone-coded values had no repository consumers, so no
compatibility aliases are retained. Existing pre-release contract IDs, ledger
records, digests, and persistence behavior remain unchanged.

## Develop

```sh
npm run typecheck -w @lnsat/audit
npm run test -w @lnsat/audit
npm run build -w @lnsat/audit
npm run audit:migrations:check
```

See [policy and audit](../../docs/architecture/POLICY_AND_AUDIT.md) and
[migration artifacts](../../docs/architecture/AUDIT_LEDGER_MIGRATION_ARTIFACTS.md).
