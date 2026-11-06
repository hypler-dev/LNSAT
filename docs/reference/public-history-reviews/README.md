# Public source review evidence

This pre-release registry binds independent reviews to exact public source
commits and direct metadata-only attestation children. It grants no execution,
runtime, merge, deployment or release authority. Archived security-review
records remain immutable and separate.

The ordinary reviewed-source lane permits additions and modifications. One
closed relocation also moves exactly the fifteen private `headless_native`
module/test files from `crates/lnsatd/src` to `crates/lnsat-store/src`.
The validator requires every old member to be deleted and every corresponding
new member to be added, with regular mode `100644` on both sides. Partial moves,
pre-existing destinations, symlinks and unrelated deletions are rejected. The
fixed inventory lives in `scripts/check-public-history-review-evidence.mjs`.

For this exact relocation, a deleted path's `protected_files` SHA-256 binds its
blob at `base_revision`; each added destination separately binds its blob at
`reviewed_revision`. Destination content may contain independently reviewed
integration changes. Exact canonical diff, reviewed tree, complete sorted path
inventory, pending registry state, independent review, direct attestation
child and descendant immutability checks remain required. This is neither a
general deletion allowance nor a byte-identical-copy claim.
