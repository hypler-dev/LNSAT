# Stage-A Private Mountinfo Byte Candidate

Status: exact inert candidate contract under the human-accepted source-order
amendment. [Project Status](../../PROJECT_STATUS.md) remains the sole
implementation and acceptance record. Fresh independent precode review gates
implementation. This does not complete native source/pin/feasibility freeze.

## Outcome and ownership

Decode a bounded supplied byte slice into private, untrusted mountinfo records.
The primary controller owns native/security semantics and implementation;
fresh independent read-only review covers this contract and resulting source.
Owned source is `crates/lnsatd/src/headless_native_mountinfo.rs`, its synthetic
test file and the module declaration in `headless_native.rs`. Supporting owned
docs are this contract, native specification, plan, README, docs index, Product
Build Sequence and Project Status. Inventory and source-review history follow
existing gates. No dependency, feature or lockfile changes are permitted.

This pure prerequisite performs no syscall, file/procfs read, descriptor
operation, clock/deadline work, path resolution or permission classification.
No public constructor, serialization, observer permit, store, profile/wire/
schema change, initializer, CLI/API or active product caller is introduced.
Results borrow immutable input where possible; decoded fields remain bytes.
They authenticate no path, mount membership, namespace, kernel, ACL, idmapping,
freshness or action authority. No trusted absence or successful observer follows
from any accepted row or option. Input is never mutated or silently truncated.

## Framing and field layout

All limits are inclusive. Check input size before allocating: nonempty, at most
1,048,576 bytes; at most 4,096 rows; each row at most 8,192 bytes including its
terminal LF. Input must end in LF. Empty rows, NUL, CR, other raw ASCII control
bytes and DEL reject; LF is only a row terminator. Bytes 128 through 255 remain
uninterpreted data. Single ASCII spaces separate nonempty tokens: leading,
trailing or repeated spaces reject. This is explicit bounded LNSAT policy,
not a claim to accept every filesystem-specific emitter or legal filename.

A row has six fixed leading fields, zero through 32 tagged optional fields,
one separator and three fixed tail fields. The minimum is ten tokens. With
at most 42 total tokens, locate the separator exactly four tokens from the
end and require it to equal `-`. A standalone `-` in the optional region
rejects. The tail source field may itself be `-`; it is not another separator.
The filesystem type, source and superblock options must all be present. No
row is discarded, no partial table is returned, and unknown data is preserved
under the explicit policy below.

## Numeric and escaped byte fields

- Mount and parent IDs are canonical decimal integers from 0 through
  2,147,483,647 inclusive. Zero is valid. Reject signs, nondigits, overflow,
  leading zeros other than the single `0`, and more than ten digits. These
  are the old signed-int mountinfo IDs, not the separate unique 64-bit ID.
- Device major and minor are canonical decimals from 0 through 4,294,967,295
  inclusive, separated by exactly one colon. This representation bound follows
  the unsigned emitter type; it asserts no valid Linux device or association.
- Mount IDs must be unique within one supplied input. Root self-parent, missing
  outside-process-root parent records and different IDs with equal mountpoint
  bytes are valid data. No parent graph, complete namespace or identity is
  inferred, and input row order is preserved.
- Root and mountpoint are nonempty absolute byte strings beginning `/`, each
  at most 4,096 encoded bytes. Decode only `\040`, `\011`, `\012` and `\134`.
  Raw `#` is allowed. No slash, dot component, trailing slash or Unicode
  normalization is performed; byte equality authenticates no object.
- Filesystem type is at most 256 encoded bytes; source is at most 4,096.
  Both are nonempty. Their supported generic-mangle grammar also decodes
  `\043`; raw `#` rejects. This deliberate supported encoding excludes other
  filesystem-specific source printers. No filesystem allowlist is inferred.
- Every backslash in those four fields must begin one exact supported four-byte
  escape. Truncated, nonoctal, unsupported or alternate encodings reject.
  Decoded space, tab, LF and backslash remain private byte values. Raw high
  bytes are preserved without UTF-8 conversion. Options and optional tags are
  retained separately; their opaque values are never path-unescaped.

## Options and optional tags

Per-mount and superblock option lists remain distinct borrowed byte slices.
Each has at most 4,096 bytes, one through 64 comma-separated nonempty tokens,
and at most 1,024 bytes per token. The first token must be exactly `ro` or `rw`;
neither may recur later. Exact duplicate tokens reject. Other tokens are
opaque bytes already subject to framing rules; repeated unknown keys with
different values are preserved, not interpreted as one security setting.
Backslashes in opaque option values remain literal. No option allowlist,
filesystem permission semantics, effective access or authority is computed.

`idmapped` is represented only as an exact token in the per-mount option
slice; the parser exposes no authenticated idmapping Boolean or absence
classification. The same spelling in superblock options or an unknown optional
tag remains data in that different field, never a per-mount observation.

Each optional token is at most 256 bytes. Its tag is one through 32 ASCII
bytes, begins with a lowercase letter, and continues with lowercase letters,
digits or underscores. A tag may have a nonempty opaque value after its first
colon. Duplicate tag names reject even if values differ. Known `shared`,
`master` and `propagate_from` tags require one canonical decimal value from
1 through 2,147,483,647; `unbindable` must have no value. Other tags and their
values are retained in the complete borrowed optional region. They are not
silently dropped or interpreted as security evidence. Known tags are validated
independently; no propagation topology or compatibility claim is inferred.
This finite unknown-tag policy is LNSAT policy, not universal emitter grammar.

## Storage, errors and work bounds

Preflight all framing, row lengths and row counts before allocating row storage.
Use a fixed stack array of at most 42 borrowed token slices per row. The result
owns only the row vector and the four decoded byte fields per row; option lists
and the entire optional region borrow the original immutable input. No token
vectors, strings, serialization, raw-input diagnostics or derived Debug for
records/table are permitted. Duplicate IDs use one bounded numeric scratch
vector sorted separately; output row order remains unchanged.

Requested decoded-byte capacities sum to at most the input length. Requested
row capacity is at most 4,096 times the native row size; ID scratch is at most
4,096 times four bytes. At most four field allocations per row plus two vector
allocations are requested. These are logical/requested allocation bounds,
not an allocator metadata, resident-memory or wall-clock guarantee. Fallible
reservation failure returns a fixed error, with no partial output. Numeric
values never select allocation sizes. Bounded option/tag duplicate checks and
ID sorting introduce no retry, unbounded recursion or input-driven I/O.

Private errors are fixed data-free codes: `native_mountinfo.limit_exceeded`,
`invalid_framing`, `invalid_row`, `invalid_number`, `invalid_escape`,
`invalid_options`, `invalid_optional_field`, `duplicate_mount_id` and
`storage_unavailable`, each with the same `native_mountinfo.` prefix. No supplied
path, option, ID, source or byte value enters a diagnostic. Existing ACL error
vocabulary is unchanged. Any denial drops accumulated private rows.

## Validation, rollback and closed gates

Synthetic positives cover ID zero and maxima, literal `-` source, self-parent,
missing parent, stacked mountpoints, row order, all supported escapes, raw
non-UTF-8 bytes, distinct option positions, known/unknown tags and exact inclusive
input/row/count/token/field bounds. Negatives cover every framing and limit
excess, wrong separator/tail, malformed/overflow/noncanonical numbers/devices,
duplicate IDs/tags/options, invalid known tags and malformed/truncated escapes.
Tests verify unchanged input, borrowed opaque regions, decoded storage bounds
and fixed data-free error codes. An explicit per-field matrix accepts raw `#`
and rejects `\043` in root/mountpoint, and rejects raw `#` and accepts `\043`
in filesystem type/source; high-byte preservation is exercised in each decoded
field. A thread-local, scoped, test-only reservation-denial hook deterministically
fails each row-vector, ID-vector and decoded-field reservation in turn. It is
compiled out of non-test builds, can only deny storage, and provides no successful
observer or allocation/authority override. Tests require the exact fixed storage
error, unchanged input, no partial success and automatic hook reset, including
unwind cleanup. Actual allocator exhaustion is not claimed as observed. All positives prove byte representation only.
No test reads genuine mountinfo or manufactures a live observer permit.

Run pinned focused Rust tests, formatting and strict Clippy, docs direction,
Phase 11 readiness, public/inventory/history checks, complete `npm run check`,
and installed named Semgrep and redacted Gitleaks. With no dependency delta,
OSV's previous dependency evidence is not claimed as a new scan. Fresh exact
source and direct-child attestation reviews precede commits/push; exact-head
Linux source CI compiles and runs the same pure tests. A source revert removes
this disconnected module without migration or runtime effects.

The later genuine reader needs separately reviewed filesystem origin, held
root/descriptor association, no-follow lookup, finite deadlines, current drift
checks and actual Linux positive evidence. Present/absent ACL classification,
ancestry, selected SQLite/socket/O_PATH custody, authenticated idmapping and
complete native feasibility remain open. Docker, host/ACL changes, privileged
helpers, tool installation, actual pins, package/image construction, SQL18,
initialization, activation, merge, signing, release, deploy and production remain
closed. The Phase 11 packet and proof lock are unchanged.

## Primary source basis

The selected public Linux v6.8 sources are factual encoding references, not
proof of an installed kernel. This contract's bounds and rejection policies
are explicitly narrower than a universal filesystem parser.

- [Mountinfo emitter and generic mangle](https://github.com/torvalds/linux/blob/v6.8/fs/proc_namespace.c): fixed fields, distinct options and tagged fields,
  per-mount idmapped emission, path/mangle escape sets and filesystem-specific
  source hooks.
- [Mount and peer-group ID allocation and show_path](https://github.com/torvalds/linux/blob/v6.8/fs/namespace.c): old mount ID allocation permits zero;
  peer groups start at one; filesystem-specific path hooks remain separate.
- [Mountinfo field documentation](https://github.com/torvalds/linux/blob/v6.8/Documentation/filesystems/proc.rst): process-root-relative records and
  unknown optional fields.
