# HCFG-6 Docker Metadata Custody Source Proposal

Status: proposed supporting source contract; no complete-freeze, implementation,
provisioning or runtime approval. [Project Status](../../PROJECT_STATUS.md#hcfg-6-resource-and-runtime-enforcement-design)
owns acceptance. The pending [staging amendment](source-freeze-staging-decision.md)
is unchanged. This companion supplies a conditional non-root method for the
accepted rootful daemon; it does not claim a current host satisfies it.

## Exact source constraint

Moby commit `8af9fe3a36bab3e039862a2ab1cef1880c9b4d03` creates the container
repository and each container directory as daemon-owned `0710`. With rootful
no-remapping, that owner/group is root. Generated hostname, hosts and resolver
files request `0644`. Their unreadable ancestors prevent ordinary non-root
directory-read custody. Same-UID access to rootful dockerd is not a solution.

Docker's daemon-root setup also changes an existing data root to `0711`, then
normalizes it through `MkdirAllAndChown(..., 0710, root, root)`. A preprovisioned
`0750` access mode does not survive that sequence. Default ACLs and effective
access, rather than a promised original mode, must be checked after startup.

Linux v6.8 `fgetxattr` uses `fdget`, which rejects `FMODE_PATH`. An `O_PATH`
handle cannot be its argument. POSIX ACL names in `getxattr`, `lgetxattr` and
`fgetxattr` use `do_get_acl` and the LSM-aware `vfs_get_acl` path, not the generic
file-data `MAY_READ` xattr predicate. Named reads still require ancestor search.
No descriptor-bound ACL read or pathname-free `getxattrat` is claimed here.

## Future root provisioning predicate

The root operator must supply this exact layout before the later authorized
daemon activation. LNSAT never creates it, calls an ACL setter, changes a mode,
chowns a path or requests a privileged helper. Missing or mismatched state
denies. Provisioning itself requires a separate concrete operator decision.

The selected daemon data root is dedicated to this LNSAT engineering backend.
Root attests that it is not a shared workload/service data root. Inheritance
below its container repository grants the controller metadata access beyond a
single newly-created directory; this scope must be explicit. No directory
inventory or foreign-container read is allowed to the LNSAT implementation.
Root can violate this assertion within the existing trusted-root boundary;
no hostile-root or independently measured exclusivity claim is made.

Only the selected nonzero controller UID receives a named access entry. No
other named UID/GID, controller write, effective group access or other access
is admitted on these directories. Root owns all three directory classes;
observed UID/GID are zero. Access/default ACLs use standard Linux order:

| Object                                  | Required access ACL                                                     | Required default ACL                                                    | Observed mode |
| --------------------------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------- | ------------- |
| Daemon data root                        | `USER_OBJ:rwx, USER:controller:r-x, GROUP_OBJ:---, MASK:--x, OTHER:---` | Absent after authenticated ext4 classification                          | `0710`        |
| Container repository                    | Same access ACL as data root                                            | `USER_OBJ:rwx, USER:controller:r-x, GROUP_OBJ:---, MASK:r-x, OTHER:---` | `0710`        |
| Exact newly-created container directory | Same access ACL as data root                                            | Same default ACL as container repository                                | `0710`        |

The controller's effective directory rights are search only. The raw named
entry's read bit is masked away. The separate inherited default ACL preserves
`r-x` for descendants; it is not the access ACL's `--x` mask. A default ACL on
the data root is deliberately excluded, avoiding inheritance into unrelated
engine storage subtrees.

For each generated regular file, default-ACL inheritance of requested `0644`
creates this access ACL and observed mode `0640`:

```text
USER_OBJ:rw-, USER:controller:r-x, GROUP_OBJ:---, MASK:r--, OTHER:---
```

The raw named execute bit is ineffective. Require UID/GID zero, one link,
regular-file type, this exact access ACL, absent default ACL and observed
`0640`; do not compare requested Go creation mode with observed inode mode.
No generic world-readable or root-only alternative is admitted by this recipe.

Linux ext4's new-inode path installs inherited default/access ACLs. Chmod
updates access ACL base/mask entries; it does not rewrite named entries or
remove the separate directory default ACL. Root-to-root chown and ordinary
in-place truncate/write do not introduce an ACL-removal path in the selected
source. These facts support the proposed mode/ACL construction, subject to
the exact authenticated filesystem/kernel/LSM recipe and observed current
state. They are not evidence of actual provisioning.

## Current daemon-root association

The root implementation manifest adds `instance.metadata_roots` with exactly:

```text
policy_id, dedicated, daemon_root, container_repository
```

`policy_id` is `lnsat.hcfg_docker_metadata_acl.v1`; `dedicated` is true.
Each directory record has exactly `path,device_major,device_minor,inode` and
uses the existing bounded canonical-path/u32/positive-u64 grammar. Root attests
these current identities to the same boot, daemon PID/start ticks, endpoint and
host mount namespace already named by the manifest. It does not attest a
caller-selected replacement.

The authenticated API `Info.DockerRootDir` must exactly equal
`daemon_root.path`, which is the evaluated canonical root from Moby setup.
`container_repository.path` must be that path plus the literal `/containers`,
and both held directory identities must match the current records. Total paths
including generated suffixes fit the existing 4,096-byte bound. The finite
metadata ACL policy and root association method belong in the immutable recipe
commitment; actual roots and inode tokens remain current-instance facts.
Every path/ancestor mount is covered by the manifest's ext4 host-mount records.

Only a container ID authenticated through this attempt's own create/journal/
Inspect lineage may supply the next literal component: 64 lowercase hex.
Construct exactly `<root>/containers/<id>/hosts`, `hostname`, `resolv.conf`.
For post-start generated-file reads, Inspect's three generated paths must equal
those constructed paths before opening the files. No response-selected arbitrary path, prefix match, pathname
normalization fallback, container listing or foreign ID is accepted.

Custody follows lifecycle state. Before create, only the attested daemon root
and container repository exist. After successful own create/journal binding,
the new container directory must exist with the inherited directory ACLs.
Generated files need not exist until start creates them; do not demand them or
nonempty Inspect generated paths in the created state. After start and before
startup observation or action release, require all three files and exact paths.
No missing-file fallback is permitted at that boundary. Removal/cleanup uses
the existing own-object state/label/journal contract; expected terminal absence
does not preserve an actionable metadata guard.

## Held identity and named ACL observations

After root-manifest/kernel/LSM authentication, acquire owned `O_PATH`,
close-on-exec, no-follow directory handles for the three search-only classes.
Use safe pinned `nix 0.31.3` `openat2` with `BENEATH`, `NO_SYMLINKS`,
`NO_MAGICLINKS` and the existing explicit mount-transition policy. Check held
type is directory; even a final `O_PATH|O_NOFOLLOW` symlink handle denies.
The existing 128-ancestor bound remains global, not per metadata query.
Use genuine `fstat`, `fstatfs`, fdinfo/mountinfo association and current host
namespace identity; `O_PATH` does not provide directory enumeration or ACL
reads through `fgetxattr`.

Read each search-only directory's two exact ACL names with safe pinned
`rustix 1.1.5` `lgetxattr` on its constructed canonical absolute path. The
existing fixed 8,196-byte buffer, closed Linux ACL decoder, no grow/retry,
permission/error denials and authenticated ext4 absence classification apply.
Access ACLs must be present. Default ACL presence/absence is exactly the matrix
above. No `/proc/self/fd` reopen, magic link, `chdir`, raw FFI or shell utility.

Bracket every named ACL call with descriptor-relative no-follow lookup of the
same name under the retained chain and `fstat` of every involved held object.
Compare type/device/inode/UID/GID/mode/link-count/ctime and mount association;
compare raw ACL bytes again at the closing observation. Root-controlled
ancestors cannot be written by the controller or untrusted identities.
Any substitution, changed ACL, namespace/mount movement, syscall error or
deadline expiry denies. This is sampled named-path evidence under trusted
root/daemon ancestry, not an atomic fd-bound snapshot. Root-mediated transient
replacement between samples is outside the accepted trusted-root claim.

Open only the three generated regular files with the existing readable
descriptor-relative no-follow method. Verify each named/opened association,
exact effective ACL/mode and mount identity before and after bounded `fgetxattr`.
No file contents, resolver sidecars, `config.v2.json`, `hostconfig.json`, logs,
directory listing or engine storage files are read. These file descriptors and
directory handles remain controller-private and never reach an adapter.

Compare host file device/inode identity to challenged native observations of
the corresponding container `/etc` bind. Namespace-local mount IDs need not
equal host IDs; use the existing separate host/container association method.
Inspect paths and configured bind options alone do not prove actual mounts.
Recheck extant metadata custody at each applicable own-object daemon boundary
and at startup/release without resetting any budget. Create/start use the
earlier lifecycle predicates above; successful remove must prove the expected
terminal absence rather than requiring stable deleted files. No transition or
cleanup observation creates an action-ready guard.

## Rewrites, denials and proof boundary

Exact Moby writes `hostname` and `hosts` directly with `os.WriteFile`; resolver
source explicitly writes in place because the file is bind-mounted. Existing
inode ACLs are retained through the selected normal write path. First creation
must inherit the exact parent default ACL. The resolver hash sidecar uses a
temporary file and rename; it is excluded from the readable set and is not
identity evidence for `resolv.conf`. Unexpected metadata replacement denies;
it never triggers permission repair or an automatic fresh attempt.

Source tests must distinguish search-only directory custody from readable-file
custody, O_PATH `fgetxattr` denial from named ACL reads, raw/masked ACL rights,
new/in-place/replaced inode semantics and arbitrary Inspect-path rejection.
Tests also cover cross-attempt IDs, foreign root/current namespace, missing or
extra ACL grants, unset pins, inherited default-ACL scope, drift and finite
query/deadline bounds. Source fixtures supply no live permit.

Complete native source-freeze review still must examine this method with the
full registry, wire, daemon, journal, store, cleanup and revocation contracts.
Actual provisioning/current association, controlled runtime positives and
negatives, artifact capture, integration, merge and release remain later gates.
No O_PATH support, default ACL inference or documentation PASS completes HCFG-6.

## Primary source references

- [Moby root setup](https://github.com/moby/moby/blob/8af9fe3a36bab3e039862a2ab1cef1880c9b4d03/daemon/daemon_unix.go),
  `setupDaemonRoot`; [canonical root creation](https://github.com/moby/moby/blob/8af9fe3a36bab3e039862a2ab1cef1880c9b4d03/daemon/daemon.go),
  `CreateDaemonRoot` and container-repository initialization.
- [Moby container creation](https://github.com/moby/moby/blob/8af9fe3a36bab3e039862a2ab1cef1880c9b4d03/daemon/create.go),
  `MkdirAndChown`; [generated paths](https://github.com/moby/moby/blob/8af9fe3a36bab3e039862a2ab1cef1880c9b4d03/daemon/container_operations_unix.go).
- [Hostname and mount construction](https://github.com/moby/moby/blob/8af9fe3a36bab3e039862a2ab1cef1880c9b4d03/daemon/container/container_unix.go),
  [hosts writes](https://github.com/moby/moby/blob/8af9fe3a36bab3e039862a2ab1cef1880c9b4d03/daemon/libnetwork/etchosts/etchosts.go),
  [resolver writes](https://github.com/moby/moby/blob/8af9fe3a36bab3e039862a2ab1cef1880c9b4d03/daemon/libnetwork/internal/resolvconf/resolvconf.go).
- [Linux ACL inheritance, chmod and read routing](https://github.com/torvalds/linux/blob/v6.8/fs/posix_acl.c),
  [ext4 ACL installation](https://github.com/torvalds/linux/blob/v6.8/fs/ext4/acl.c),
  [xattr syscalls](https://github.com/torvalds/linux/blob/v6.8/fs/xattr.c),
  [FMODE_PATH rejection](https://github.com/torvalds/linux/blob/v6.8/fs/file.c),
  [chmod/chown/truncate](https://github.com/torvalds/linux/blob/v6.8/fs/open.c).
- [Safe rustix xattr APIs](https://github.com/bytecodealliance/rustix/blob/v1.1.5/src/fs/xattr.rs)
  and pinned `nix 0.31.3` `openat2`/`fstat`/`fstatfs` APIs. No dependency is
  added or installed by this proposal.
