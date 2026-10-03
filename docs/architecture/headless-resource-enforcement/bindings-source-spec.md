# HCFG-6 S1 source specification: owner-binding declaration input

Status: source implementation draft
Authority: [HCFG-6 intent](intent.md) and [Project Status](../../PROJECT_STATUS.md#hcfg-6-resource-and-runtime-enforcement-design)
Contract basis: accepted HCFG-6 design at PR #72 head `0dbe0a2874428721b1a4ba6bad1708ec5fdbb572`; exact S1 grammar below
Last updated: 2026-10-02

This document records the S1 pure decoder prerequisite. It does not replace
the HCFG-6 intent, specification, plan, or Project Status authority. It does
not complete the full native, wire, daemon, or synchronization source freeze.
Behavioral integration remains closed until that complete freeze and its
independent review pass.

## Scope

S1 accepts caller bytes and an existing sealed HCFG-3 declaration. It returns
a sealed, unverified owner-binding declaration. It performs no file loading,
path resolution, OS or ACL observation, selected-store or owner proof,
persistence, CLI, route, generation, permission grant, or runtime work.

The implementation-owned source is:

- `crates/lnsat-contracts/src/headless_config/resource_bindings.rs`
- `crates/lnsat-contracts/src/headless_config/resource_bindings_tests.rs`
- `crates/lnsat-contracts/src/headless_config/mod.rs`
- `crates/lnsat-contracts/src/lib.rs`

The decoder is experimental source. Its output is input to a future trusted
verifier and is never a verified identity, permit, or action authority.

## Input grammar and bounds

The input is UTF-8 JSON with these top-level fields only:

- `schema_id: "lnsat.resource_bindings.v1"`
- `contract_version: "lnsat.contracts.v1_0"`
- `installation_ref`
- `bindings`

Each binding row contains only `resource_ref`, `kind`, and `source_path`.
Unknown fields, nulls, wrong types, malformed JSON, trailing input, duplicate
known keys, and duplicate escaped key spellings are denied by strict typed
decoding. Encoded input is bounded to 65,536 bytes; decoded paths are bounded
to 4,096 UTF-8 bytes; rows are bounded to 128. The row collection is strictly
sorted and unique by exact resource reference.

The installation reference and each resource reference use the existing exact
reference validation and required `installation:` or `resource:` prefix.
There is no normalization or case folding. The binding dictionary must match
the complete original HCFG-3 resource inventory, including resources narrowed
away by later layers. Installation reference, resource reference, kind, missing
row, extra row, ordering, and unsupported original kind substitutions deny.
The first backend accepts exactly one `repository` and one `runtime_profile`;
an empty declaration and all other kinds deny.

Each source path must use canonical Linux absolute syntax: leading `/`,
non-root, no trailing or repeated slash, no `.` or `..` component, no
backslash, and no relative, drive, or UNC form. C0, DEL, and C1 controls are
denied. Spaces, literal dollar or tilde characters, and other accepted
Unicode remain unchanged; environment expansion never occurs. The repository
and runtime-profile paths must differ and must not be lexical component
ancestors of one another. These checks do not prove physical identity,
existence, ownership, device or inode, mount identity, disjointness, or
enforcement.

## Output and commitments

The sealed result exposes only the unverified installation reference, rows,
binding digest, and separate recomposed HCFG declaration digest. Each row
retains the asserted identity digest from its matching HCFG-3 resource. That
assertion is not part of the binding-file grammar or binding commitment; a
future verifier must compare it with independently observed persistent
identity.

The binding digest is SHA-256 over the UTF-8 domain prefix
`lnsat.resource_bindings.v1` followed by one LF byte (U+000A), then canonical compact JSON with one tuple per sorted binding row:

```json
[
  "lnsat.resource_bindings.v1",
  "lnsat.contracts.v1_0",
  "<installation_ref>",
  [
    ["<repository_resource_ref>", "repository", "<repository_source_path>"],
    ["<profile_resource_ref>", "runtime_profile", "<profile_source_path>"]
  ]
]
```

It is represented as lowercase `sha256:` text. Whitespace and object-key
order do not change the digest; binding values do. The HCFG declaration
commitment remains separate.

Debug output reports count only. Per-row debug hides references, paths, and
asserted digests. The redacted diagnostic reports schema identity, binding
count, and fixed false values for identity verification, owner verification,
OS enforcement, initialization, activation, and action authority. Errors use
fixed `headless_resource_bindings.*` codes and contain no caller data.

## Acceptance evidence and remaining gate

The exact S1 contract provides focused coverage for positive two-resource
decoding, complete inventory matching, narrowed-layer preservation, malformed
and duplicate-key input, size/path/row boundaries, lexical path overlap,
literal path characters, digest stability, asserted-identity pairing, and
redaction. Fifteen focused Rust tests passed for this source draft, including a nonempty deny-all declaration that remains unverified input.

Strict Clippy, Rustfmt, the complete pinned `npm run check` and public/docs/inventory checks passed. Fresh independent OpenAI Terra xhigh review found no remaining actionable P1/P2/P3 after corrections. Local Semgrep `p/rust` ran eleven rules with zero findings or parse errors; Gitleaks reported zero worktree findings. The first broad check failed on sandbox-denied disposable sockets; the complete local-fixture rerun passed. Hosted exact-head CI remains pending for this source draft. S1 is a pure input prerequisite only. Full
HCFG-6 still requires the genuine descriptor/mount/effective-ACL verifier,
immutable probe, bounded daemon/native protocol, cleanup journal, atomic
bootstrap, protected generation and revocation control, monitoring, and
actual runtime/package evidence. The complete native, wire, daemon, and synchronization source freeze and independent review must precede behavioral integration; actual runtime and package proof follow source completion under their separate gates.
