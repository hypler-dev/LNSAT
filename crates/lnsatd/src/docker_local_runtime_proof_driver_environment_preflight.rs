//! Private source-only filesystem guard for a later Phase 11 proof driver.
//!
//! This module reads filesystem metadata and bytes only. It neither starts a
//! process nor contacts Docker, Git, a socket, or any evidence destination.

use crate::docker_local_runtime_proof_driver_admission::prefixed_sha256_v1;
use crate::docker_local_runtime_proof_run_manifest::DockerLocalRuntimeProofRunManifestOutputV1;
use crate::docker_local_supervisor::MAX_DOCKER_LOCAL_SUPERVISOR_EXECUTABLE_BYTES_V1;
use sha2::{Digest, Sha256};
use std::fmt;
use std::fs::{self, File};
use std::io::Read as _;
#[cfg(unix)]
use std::os::unix::fs::MetadataExt as _;
use std::path::{Component, Path, PathBuf};

const PATH_IDENTITY_DIGEST_DOMAIN_V1: &[u8] = b"lnsat.docker-local-runtime-proof-path-identity.v1";
const ENVIRONMENT_GUARD_DIGEST_DOMAIN_V1: &[u8] =
    b"lnsat.docker-local-runtime-proof-environment-guard.v1";

/// Stable, non-path-bearing failures for environment validation.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub(crate) enum DockerLocalRuntimeProofEnvironmentErrorV1 {
    Rejected,
}

impl DockerLocalRuntimeProofEnvironmentErrorV1 {
    #[must_use]
    pub(crate) const fn code(self) -> &'static str {
        match self {
            Self::Rejected => "docker_local_runtime_proof_environment_preflight.rejected",
        }
    }
}

impl fmt::Display for DockerLocalRuntimeProofEnvironmentErrorV1 {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(self.code())
    }
}

impl std::error::Error for DockerLocalRuntimeProofEnvironmentErrorV1 {}

/// Opaque binding to one manifest and one unchanged local filesystem view.
///
/// Passing this guard neither authorizes a launch nor proves any runtime fact.
pub(crate) struct DockerLocalRuntimeProofEnvironmentGuardV1 {
    manifest_digest: [u8; 32],
    proof_driver: ExecutableSnapshotV1,
    source_root: DirectorySnapshotV1,
    private_evidence_root: DirectorySnapshotV1,
    disposable_root: DirectorySnapshotV1,
    guard_digest: [u8; 32],
}

impl DockerLocalRuntimeProofEnvironmentGuardV1 {
    /// Repeats every filesystem check and requires the original binding view.
    ///
    /// # Errors
    ///
    /// Returns a non-disclosing rejection when any declared path, identity,
    /// ownership, mode, content, manifest, or separation check changed.
    pub(crate) fn revalidate(
        &self,
        manifest: &DockerLocalRuntimeProofRunManifestOutputV1,
        proof_driver_executable: &Path,
        source_root: &Path,
        private_evidence_root: &Path,
        disposable_root: &Path,
    ) -> Result<(), DockerLocalRuntimeProofEnvironmentErrorV1> {
        let current = collect_environment_v1(
            manifest,
            proof_driver_executable,
            source_root,
            private_evidence_root,
            disposable_root,
        )?;
        if !guard_matches_environment_v1(self, manifest.digest(), &current) {
            return Err(DockerLocalRuntimeProofEnvironmentErrorV1::Rejected);
        }
        Ok(())
    }
}

/// Binds a private manifest to exact, local filesystem identities.
///
/// No path is created, changed, opened for writing, executed, or sent to a
/// process. The result must be revalidated immediately before any later gate.
///
/// # Errors
///
/// Returns one stable rejection for malformed, aliased, changed, unsafe, or
/// non-Unix filesystem inputs without exposing private path details.
pub(crate) fn preflight_docker_local_runtime_proof_environment_v1(
    manifest: &DockerLocalRuntimeProofRunManifestOutputV1,
    proof_driver_executable: &Path,
    source_root: &Path,
    private_evidence_root: &Path,
    disposable_root: &Path,
) -> Result<DockerLocalRuntimeProofEnvironmentGuardV1, DockerLocalRuntimeProofEnvironmentErrorV1> {
    collect_environment_v1(
        manifest,
        proof_driver_executable,
        source_root,
        private_evidence_root,
        disposable_root,
    )
}

fn collect_environment_v1(
    manifest: &DockerLocalRuntimeProofRunManifestOutputV1,
    proof_driver_executable: &Path,
    source_root: &Path,
    private_evidence_root: &Path,
    disposable_root: &Path,
) -> Result<DockerLocalRuntimeProofEnvironmentGuardV1, DockerLocalRuntimeProofEnvironmentErrorV1> {
    #[cfg(not(unix))]
    {
        let _ = (
            manifest,
            proof_driver_executable,
            source_root,
            private_evidence_root,
            disposable_root,
        );
        return Err(DockerLocalRuntimeProofEnvironmentErrorV1::Rejected);
    }
    #[cfg(unix)]
    {
        let declared = &manifest.manifest().declarations;
        let proof_driver = executable_snapshot_v1(
            proof_driver_executable,
            &manifest.manifest().source.proof_driver_executable_digest,
        )?;
        let source = directory_snapshot_v1(source_root, false)?;
        let evidence = directory_snapshot_v1(private_evidence_root, true)?;
        let disposable = directory_snapshot_v1(disposable_root, true)?;
        if source.canonical_path != manifest.manifest().source.repository_absolute_path
            || source.stable_identity_digest
                != manifest.manifest().source.repository_identity_digest
            || evidence.canonical_path != declared.private_evidence.absolute_location
            || disposable.canonical_path != declared.disposable_target.owner_only_disposable_root
            || !directories_disjoint_v1(&source, &evidence)
            || !directories_disjoint_v1(&source, &disposable)
            || !directories_disjoint_v1(&evidence, &disposable)
        {
            return Err(DockerLocalRuntimeProofEnvironmentErrorV1::Rejected);
        }
        let guard_digest = environment_guard_digest_v1(
            manifest.digest(),
            &proof_driver,
            &source,
            &evidence,
            &disposable,
        );
        Ok(DockerLocalRuntimeProofEnvironmentGuardV1 {
            manifest_digest: manifest.digest(),
            proof_driver,
            source_root: source,
            private_evidence_root: evidence,
            disposable_root: disposable,
            guard_digest,
        })
    }
}

#[derive(Clone, Debug, Eq, PartialEq)]
struct FileIdentityV1 {
    device: u64,
    inode: u64,
    uid: u32,
    gid: u32,
    mode: u32,
    size: u64,
}

#[derive(Clone, Debug, Eq, PartialEq)]
struct ExecutableSnapshotV1 {
    canonical_path: String,
    identity: FileIdentityV1,
    stable_identity_digest: String,
    content_digest: String,
}

#[derive(Clone, Debug, Eq, PartialEq)]
struct DirectorySnapshotV1 {
    canonical_path: String,
    identity: FileIdentityV1,
    stable_identity_digest: String,
}

fn executable_snapshot_v1(
    path: &Path,
    expected_digest: &str,
) -> Result<ExecutableSnapshotV1, DockerLocalRuntimeProofEnvironmentErrorV1> {
    #[cfg(not(unix))]
    {
        let _ = (path, expected_digest);
        Err(DockerLocalRuntimeProofEnvironmentErrorV1::Rejected)
    }
    #[cfg(unix)]
    {
        let canonical_path = canonical_utf8_path_without_symlink_ancestors_v1(path)?;
        let before = fs::symlink_metadata(path)
            .map_err(|_| DockerLocalRuntimeProofEnvironmentErrorV1::Rejected)?;
        if before.file_type().is_symlink()
            || !before.file_type().is_file()
            || before.len() == 0
            || before.len() > MAX_DOCKER_LOCAL_SUPERVISOR_EXECUTABLE_BYTES_V1
            || !owner_is_root_or_current_euid_v1(&before)
            || (before.uid() != 0 && before.nlink() != 1)
            || before.mode() & 0o022 != 0
            || before.mode() & 0o111 == 0
        {
            return Err(DockerLocalRuntimeProofEnvironmentErrorV1::Rejected);
        }
        let before_identity = file_identity_v1(&before);
        let mut file =
            File::open(path).map_err(|_| DockerLocalRuntimeProofEnvironmentErrorV1::Rejected)?;
        let opened = file
            .metadata()
            .map_err(|_| DockerLocalRuntimeProofEnvironmentErrorV1::Rejected)?;
        if before_identity != file_identity_v1(&opened) {
            return Err(DockerLocalRuntimeProofEnvironmentErrorV1::Rejected);
        }
        let mut hasher = Sha256::new();
        let mut buffer = [0_u8; 8 * 1024];
        loop {
            let count = file
                .read(&mut buffer)
                .map_err(|_| DockerLocalRuntimeProofEnvironmentErrorV1::Rejected)?;
            if count == 0 {
                break;
            }
            hasher.update(&buffer[..count]);
        }
        buffer.fill(0);
        let content_digest = prefixed_sha256_v1(&hasher.finalize().into());
        let after = fs::symlink_metadata(path)
            .map_err(|_| DockerLocalRuntimeProofEnvironmentErrorV1::Rejected)?;
        if before_identity != file_identity_v1(&after)
            || content_digest != expected_digest
            || canonical_utf8_path_without_symlink_ancestors_v1(path)? != canonical_path
        {
            return Err(DockerLocalRuntimeProofEnvironmentErrorV1::Rejected);
        }
        Ok(ExecutableSnapshotV1 {
            stable_identity_digest: stable_path_identity_digest_v1(&canonical_path, &after),
            canonical_path,
            identity: file_identity_v1(&after),
            content_digest,
        })
    }
}

fn directory_snapshot_v1(
    path: &Path,
    owner_only: bool,
) -> Result<DirectorySnapshotV1, DockerLocalRuntimeProofEnvironmentErrorV1> {
    #[cfg(not(unix))]
    {
        let _ = (path, owner_only);
        Err(DockerLocalRuntimeProofEnvironmentErrorV1::Rejected)
    }
    #[cfg(unix)]
    {
        let canonical_path = canonical_utf8_path_without_symlink_ancestors_v1(path)?;
        let metadata = fs::symlink_metadata(path)
            .map_err(|_| DockerLocalRuntimeProofEnvironmentErrorV1::Rejected)?;
        if metadata.file_type().is_symlink()
            || !metadata.file_type().is_dir()
            || (owner_only
                && (metadata.mode() & 0o077 != 0
                    || metadata.uid() != nix::unistd::geteuid().as_raw()))
            || (!owner_only
                && (metadata.mode() & 0o022 != 0 || !owner_is_root_or_current_euid_v1(&metadata)))
        {
            return Err(DockerLocalRuntimeProofEnvironmentErrorV1::Rejected);
        }
        let identity = file_identity_v1(&metadata);
        if canonical_utf8_path_without_symlink_ancestors_v1(path)? != canonical_path
            || identity
                != file_identity_v1(
                    &fs::symlink_metadata(path)
                        .map_err(|_| DockerLocalRuntimeProofEnvironmentErrorV1::Rejected)?,
                )
        {
            return Err(DockerLocalRuntimeProofEnvironmentErrorV1::Rejected);
        }
        Ok(DirectorySnapshotV1 {
            stable_identity_digest: stable_path_identity_digest_v1(&canonical_path, &metadata),
            canonical_path,
            identity,
        })
    }
}

#[cfg(unix)]
fn canonical_utf8_path_without_symlink_ancestors_v1(
    path: &Path,
) -> Result<String, DockerLocalRuntimeProofEnvironmentErrorV1> {
    if !path.is_absolute() || path.as_os_str().is_empty() {
        return Err(DockerLocalRuntimeProofEnvironmentErrorV1::Rejected);
    }
    let canonical =
        fs::canonicalize(path).map_err(|_| DockerLocalRuntimeProofEnvironmentErrorV1::Rejected)?;
    if canonical != path
        || path
            .components()
            .any(|component| !matches!(component, Component::RootDir | Component::Normal(_)))
    {
        return Err(DockerLocalRuntimeProofEnvironmentErrorV1::Rejected);
    }
    let mut ancestor = PathBuf::from("/");
    for component in path.components() {
        if let Component::Normal(part) = component {
            ancestor.push(part);
            if fs::symlink_metadata(&ancestor)
                .map_err(|_| DockerLocalRuntimeProofEnvironmentErrorV1::Rejected)?
                .file_type()
                .is_symlink()
            {
                return Err(DockerLocalRuntimeProofEnvironmentErrorV1::Rejected);
            }
        }
    }
    canonical
        .into_os_string()
        .into_string()
        .map_err(|_| DockerLocalRuntimeProofEnvironmentErrorV1::Rejected)
}

#[cfg(unix)]
fn owner_is_root_or_current_euid_v1(metadata: &fs::Metadata) -> bool {
    metadata.uid() == 0 || metadata.uid() == nix::unistd::geteuid().as_raw()
}

#[cfg(unix)]
fn file_identity_v1(metadata: &fs::Metadata) -> FileIdentityV1 {
    FileIdentityV1 {
        device: metadata.dev(),
        inode: metadata.ino(),
        uid: metadata.uid(),
        gid: metadata.gid(),
        mode: metadata.mode(),
        size: metadata.size(),
    }
}

#[cfg(unix)]
fn stable_path_identity_digest_v1(canonical_path: &str, metadata: &fs::Metadata) -> String {
    digest_text_fields_v1(
        PATH_IDENTITY_DIGEST_DOMAIN_V1,
        &[
            canonical_path.as_bytes(),
            &metadata.dev().to_be_bytes(),
            &metadata.ino().to_be_bytes(),
            &metadata.uid().to_be_bytes(),
            &metadata.gid().to_be_bytes(),
            &metadata.mode().to_be_bytes(),
            &metadata.size().to_be_bytes(),
        ],
    )
}

fn directories_disjoint_v1(left: &DirectorySnapshotV1, right: &DirectorySnapshotV1) -> bool {
    (left.identity.device != right.identity.device || left.identity.inode != right.identity.inode)
        && !path_is_ancestor_or_same_v1(&left.canonical_path, &right.canonical_path)
        && !path_is_ancestor_or_same_v1(&right.canonical_path, &left.canonical_path)
}

fn path_is_ancestor_or_same_v1(ancestor: &str, candidate: &str) -> bool {
    ancestor == candidate
        || candidate
            .strip_prefix(ancestor)
            .is_some_and(|rest| rest.starts_with('/'))
}

fn guard_matches_environment_v1(
    guard: &DockerLocalRuntimeProofEnvironmentGuardV1,
    manifest_digest: [u8; 32],
    current: &DockerLocalRuntimeProofEnvironmentGuardV1,
) -> bool {
    guard.manifest_digest == manifest_digest
        && guard.proof_driver == current.proof_driver
        && guard.source_root == current.source_root
        && guard.private_evidence_root == current.private_evidence_root
        && guard.disposable_root == current.disposable_root
        && guard.guard_digest == current.guard_digest
}

fn environment_guard_digest_v1(
    manifest_digest: [u8; 32],
    executable: &ExecutableSnapshotV1,
    source: &DirectorySnapshotV1,
    evidence: &DirectorySnapshotV1,
    disposable: &DirectorySnapshotV1,
) -> [u8; 32] {
    let fields: [&[u8]; 10] = [
        &manifest_digest,
        executable.canonical_path.as_bytes(),
        executable.stable_identity_digest.as_bytes(),
        executable.content_digest.as_bytes(),
        source.canonical_path.as_bytes(),
        source.stable_identity_digest.as_bytes(),
        evidence.canonical_path.as_bytes(),
        evidence.stable_identity_digest.as_bytes(),
        disposable.canonical_path.as_bytes(),
        disposable.stable_identity_digest.as_bytes(),
    ];
    digest_fields_v1(ENVIRONMENT_GUARD_DIGEST_DOMAIN_V1, &fields)
}

fn digest_text_fields_v1(domain: &[u8], fields: &[&[u8]]) -> String {
    prefixed_sha256_v1(&digest_fields_v1(domain, fields))
}

fn digest_fields_v1(domain: &[u8], fields: &[&[u8]]) -> [u8; 32] {
    let mut hasher = Sha256::new();
    hasher.update((domain.len() as u64).to_be_bytes());
    hasher.update(domain);
    for field in fields {
        hasher.update((field.len() as u64).to_be_bytes());
        hasher.update(field);
    }
    hasher.finalize().into()
}

#[cfg(all(test, unix))]
mod tests {
    use super::*;
    use std::fs;
    use std::os::unix::fs::{PermissionsExt as _, symlink};

    fn temp_directory_v1(name: &str) -> PathBuf {
        let root = std::env::temp_dir().join(format!(
            "lnsat-phase11-environment-preflight-{name}-{}",
            std::process::id()
        ));
        let _ = fs::remove_dir_all(&root);
        fs::create_dir_all(&root).expect("temporary test root");
        fs::set_permissions(&root, fs::Permissions::from_mode(0o700)).expect("test root mode");
        fs::canonicalize(root).expect("canonical temporary test root")
    }

    #[test]
    fn directory_snapshot_accepts_owner_only_canonical_directory() {
        let root = temp_directory_v1("directory-success");
        let directory = root.join("evidence");
        fs::create_dir(&directory).expect("evidence directory");
        fs::set_permissions(&directory, fs::Permissions::from_mode(0o700)).expect("evidence mode");
        assert!(directory_snapshot_v1(&directory, true).is_ok());
        fs::remove_dir_all(root).expect("cleanup");
    }

    #[test]
    fn directory_snapshot_rejects_non_owner_only_or_symlink_directory() {
        let root = temp_directory_v1("directory-reject");
        let directory = root.join("evidence");
        fs::create_dir(&directory).expect("evidence directory");
        fs::set_permissions(&directory, fs::Permissions::from_mode(0o755))
            .expect("unsafe evidence mode");
        assert_eq!(
            directory_snapshot_v1(&directory, true).unwrap_err(),
            DockerLocalRuntimeProofEnvironmentErrorV1::Rejected
        );
        fs::set_permissions(&directory, fs::Permissions::from_mode(0o700))
            .expect("safe evidence mode");
        let link = root.join("evidence-link");
        symlink(&directory, &link).expect("directory symlink");
        assert!(directory_snapshot_v1(&link, true).is_err());
        fs::remove_dir_all(root).expect("cleanup");
    }

    #[test]
    fn executable_snapshot_rejects_digest_mode_and_replacement_drift() {
        let root = temp_directory_v1("executable-reject");
        let executable = root.join("driver");
        fs::write(&executable, b"#!/bin/sh\nexit 0\n").expect("driver bytes");
        fs::set_permissions(&executable, fs::Permissions::from_mode(0o700)).expect("driver mode");
        let digest =
            prefixed_sha256_v1(&Sha256::digest(fs::read(&executable).expect("driver read")).into());
        assert!(executable_snapshot_v1(&executable, &digest).is_ok());
        assert!(
            executable_snapshot_v1(
                &executable,
                "sha256:0000000000000000000000000000000000000000000000000000000000000000"
            )
            .is_err()
        );
        fs::set_permissions(&executable, fs::Permissions::from_mode(0o722))
            .expect("unsafe driver mode");
        assert!(executable_snapshot_v1(&executable, &digest).is_err());
        fs::set_permissions(&executable, fs::Permissions::from_mode(0o700))
            .expect("safe driver mode");
        let before =
            executable_snapshot_v1(&executable, &digest).expect("initial executable snapshot");
        fs::write(&executable, b"#!/bin/sh\nexit 1\n").expect("replacement bytes");
        let after_digest = prefixed_sha256_v1(
            &Sha256::digest(fs::read(&executable).expect("replacement read")).into(),
        );
        let after =
            executable_snapshot_v1(&executable, &after_digest).expect("replacement snapshot");
        assert_ne!(before, after);
        fs::remove_dir_all(root).expect("cleanup");
    }

    #[test]
    fn guard_binding_rejects_revalidation_drift() {
        let root = temp_directory_v1("guard-drift");
        let executable = root.join("driver");
        let source = root.join("source");
        let evidence = root.join("evidence");
        let disposable = root.join("disposable");
        fs::write(&executable, b"#!/bin/sh\nexit 0\n").expect("driver bytes");
        fs::create_dir(&source).expect("source directory");
        fs::create_dir(&evidence).expect("evidence directory");
        fs::create_dir(&disposable).expect("disposable directory");
        fs::set_permissions(&executable, fs::Permissions::from_mode(0o700)).expect("driver mode");
        for path in [&source, &evidence, &disposable] {
            fs::set_permissions(path, fs::Permissions::from_mode(0o700)).expect("directory mode");
        }
        let digest =
            prefixed_sha256_v1(&Sha256::digest(fs::read(&executable).expect("driver read")).into());
        let guard = DockerLocalRuntimeProofEnvironmentGuardV1 {
            manifest_digest: [7; 32],
            proof_driver: executable_snapshot_v1(&executable, &digest).expect("driver snapshot"),
            source_root: directory_snapshot_v1(&source, false).expect("source snapshot"),
            private_evidence_root: directory_snapshot_v1(&evidence, true)
                .expect("evidence snapshot"),
            disposable_root: directory_snapshot_v1(&disposable, true).expect("disposable snapshot"),
            guard_digest: [9; 32],
        };
        fs::write(&executable, b"#!/bin/sh\nexit 1\n").expect("drifted driver bytes");
        let current = DockerLocalRuntimeProofEnvironmentGuardV1 {
            manifest_digest: [7; 32],
            proof_driver: executable_snapshot_v1(
                &executable,
                &prefixed_sha256_v1(
                    &Sha256::digest(fs::read(&executable).expect("drifted read")).into(),
                ),
            )
            .expect("drifted driver snapshot"),
            source_root: directory_snapshot_v1(&source, false).expect("source snapshot"),
            private_evidence_root: directory_snapshot_v1(&evidence, true)
                .expect("evidence snapshot"),
            disposable_root: directory_snapshot_v1(&disposable, true).expect("disposable snapshot"),
            guard_digest: [9; 32],
        };
        assert!(!guard_matches_environment_v1(&guard, [7; 32], &current));
        fs::remove_dir_all(root).expect("cleanup");
    }

    #[test]
    fn directory_overlap_uses_both_identity_and_ancestor_checks() {
        let root = temp_directory_v1("overlap");
        let source = root.join("source");
        let nested = source.join("private-evidence");
        let disposable = root.join("disposable");
        fs::create_dir(&source).expect("source directory");
        fs::create_dir(&nested).expect("nested directory");
        fs::create_dir(&disposable).expect("disposable directory");
        for path in [&source, &nested, &disposable] {
            fs::set_permissions(path, fs::Permissions::from_mode(0o700)).expect("directory mode");
        }
        let source_snapshot = directory_snapshot_v1(&source, false).expect("source snapshot");
        let nested_snapshot = directory_snapshot_v1(&nested, true).expect("nested snapshot");
        let disposable_snapshot =
            directory_snapshot_v1(&disposable, true).expect("disposable snapshot");
        assert!(!directories_disjoint_v1(&source_snapshot, &nested_snapshot));
        assert!(directories_disjoint_v1(
            &source_snapshot,
            &disposable_snapshot
        ));
        fs::remove_dir_all(root).expect("cleanup");
    }
}
