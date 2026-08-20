# Pinned Rust Toolchain

LNSAT pins Rust `1.97.1` with the `minimal` profile plus `clippy` and `rustfmt`
for `aarch64-apple-darwin`.

## Official sources

- Rustup metadata: `https://static.rust-lang.org/rustup/release-stable.toml`
- Rustup installer: `https://static.rust-lang.org/rustup/archive/1.29.0/aarch64-apple-darwin/rustup-init`
- Rust manifest: `https://static.rust-lang.org/dist/channel-rust-1.97.1.toml`

## Recorded SHA-256 checksums

| Artifact         | SHA-256                                                            |
| ---------------- | ------------------------------------------------------------------ |
| rustup-init      | `aeb4105778ca1bd3c6b0e75768f581c656633cd51368fa61289b6a71696ac7e1` |
| Rust manifest    | `03569b1886ceb5c05276b50c8431ab111de944cd6140fe1fa7d821dd8e0f29cf` |
| rustc archive    | `6076cad38ccabaa24325f26a74080a363a2633a9cd34c473a8977255d8a593cb` |
| rust-std archive | `a4895f5c6995e83cab8687e46b14324592398049def71ce75ca308c981cf200d` |
| cargo archive    | `2d84a74e9558192a7de674aca6aa3ab7464bed2df97e0377156ddb7e09a0fd7a` |
| rustfmt archive  | `358bbba5d0c7c37116ec15f67cfd3ac4da5d3c319cddb49389c26d3a0c65747a` |
| clippy archive   | `5e44c0ac5ca9b6f14a3c9031a61f583348b902f908f46e95717aef1dbd2807db` |

## User-local installation

- `RUSTUP_HOME`: `$HOME/.local/share/lnsat-rustup`
- `CARGO_HOME`: `$HOME/.local/share/lnsat-cargo`
- Installed toolchain: `1.97.1-aarch64-apple-darwin`
- Verified compiler: `rustc 1.97.1 (8bab26f4f 2026-07-14)`
- Verified Cargo: `cargo 1.97.1 (c980f4866 2026-06-30)`

Both install roots were absent before installation and were created beneath an
existing user-owned directory. Installation used no `sudo`, root-owned target,
system package manager, or system `PATH` mutation. The installed roots and
Cargo proxy remain owned by the invoking non-root user. Repository scripts set
`RUSTUP_AUTO_INSTALL=0` and `CARGO_NET_OFFLINE=true` during validation.

The Rust crate uses locked crates.io parser dependencies. A clean environment
must explicitly run `cargo fetch --locked --config net.offline=false` before
the source gate. CI performs that named fetch step after installing the pinned
toolchain. Repository Rust validation remains forced offline afterward, and the
core crate performs no runtime networking.
