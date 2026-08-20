# `@lnsat/policy`

Deterministic policy decisions and approval gates for LNSAT.

Current evaluation produces `allow`, `deny`, or `approval_required` decisions.
Unknown capability or incomplete evidence must fail closed. Policy code does
not execute adapters or synthesize approval.

The parallel stable v1 evaluator consumes a validated packet snapshot, binds its
canonical digest, applies deny-first capability and risk rules, rejects stale
evaluation, and returns side-effect-free decision evidence. Exact replays are
deterministic. Existing pre-release decision helpers remain unchanged.

Stable v1 approval evidence consumes only an exact approval-required v1 policy
decision. Requests bind its packet digest, requester, session, project,
resources, capabilities, reasons, and expiry. Decisions require a distinct
`identity:human:*` approver plus approver session, reject stale or tampered
requests, and record approved or denied without authorizing execution. Evidence
hashes are deterministic content identities, not signatures or authentication.

Phase 7b adds a parallel verification-only signed-approval evidence foundation:
closed wrapper/public-material/result models and schemas, full-chain structural
rederivation, exact canonical payload/domain-preimage/SHA-256 identity helpers,
and shared TypeScript/Rust wrapper vectors.

Phase 7c adds a separate public-only pure Ed25519 primitive. Generic policy code
accepts an explicit verification provider only; Node 22 conformance supplies
`crypto.verify(null, ...)` without making package source Node-only. Exact RFC
8410 SPKI, canonical base64url, and signature-length rejection occurs before
provider work; decoded messages are bounded to 1 MiB. The primitive is not
wired into signed-approval wrapper results:
`signed_approval.verification_unavailable`, false authority fields, and empty
side effects remain unchanged. No active signer, private material, nonce
persistence, operational status source, endpoint, or execution authorization
exists.

A separate provider-neutral signer interface models software-vault, PKCS#11
3.2, and cloud KMS/HSM profiles with public references, lifecycle/health
evidence, and closed request/result validation. Tests use doubles only. Provider
calls, signing, key creation/custody, activation, and P1 trust material remain
disabled; the P1 validation constant is unset.

Exported source-status metadata uses neutral `source_only` or `contract_only`
values. Earlier milestone-coded values had no repository consumers, so no
compatibility aliases are retained.

## Develop

```sh
npm run typecheck -w @lnsat/policy
npm run test -w @lnsat/policy
npm run build -w @lnsat/policy
```

See [policy and audit](../../docs/architecture/POLICY_AND_AUDIT.md).
