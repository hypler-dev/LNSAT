//! Private source-only Git identity guard for a later Phase 11 proof driver.
//!
//! This module verifies a local checkout with a declared host Git binary. It
//! does not fetch, mutate Git state, start Docker, or authorize an execution.

use sha2::{Digest, Sha256};
use std::ffi::OsString;
use std::fmt;
use std::fs::{self, File, Metadata};
use std::io::Read;
#[cfg(unix)]
use std::os::unix::fs::MetadataExt as _;
use std::path::{Component, Path, PathBuf};
use std::process::{Command, Stdio};
use std::thread;
use std::time::{Duration, Instant};

const MAX_GIT_EXECUTABLE_BYTES_V1: u64 = 64 * 1024 * 1024;
const MAX_GIT_CONFIG_BYTES_V1: u64 = 1024 * 1024;
const MAX_GIT_STORAGE_ENTRIES_V1: usize = 16 * 1024;
const MAX_GIT_COMMAND_OUTPUT_BYTES_V1: usize = 8 * 1024;
const MAX_GIT_INDEX_LIST_BYTES_V1: usize = 16 * 1024 * 1024;
const GIT_COMMAND_TIMEOUT_V1: Duration = Duration::from_secs(2);
const GIT_COMMAND_POLL_INTERVAL_V1: Duration = Duration::from_millis(5);

/// Stable, non-disclosing source Git guard failure.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub(crate) enum DockerLocalRuntimeProofSourceGitGuardErrorV1 {
    Rejected,
}

impl DockerLocalRuntimeProofSourceGitGuardErrorV1 {
    #[must_use]
    pub(crate) const fn code(self) -> &'static str {
        match self {
            Self::Rejected => "docker_local_runtime_proof_source_git_guard.rejected",
        }
    }
}

impl fmt::Display for DockerLocalRuntimeProofSourceGitGuardErrorV1 {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(self.code())
    }
}

impl std::error::Error for DockerLocalRuntimeProofSourceGitGuardErrorV1 {}

/// Opaque binding to one exact clean local Git checkout and host Git binary.
///
/// Passing this guard grants neither process launch authority nor runtime proof.
pub(crate) struct DockerLocalRuntimeProofSourceGitGuardV1 {
    source_root: DirectorySnapshotV1,
    git_storage: GitStorageSnapshotV1,
    git_executable: ExecutableSnapshotV1,
    revision: String,
    tree: String,
}

impl DockerLocalRuntimeProofSourceGitGuardV1 {
    /// Repeats the complete source and host-Git verification.
    ///
    /// # Errors
    ///
    /// Returns one stable rejection if a declared input, Git storage safety
    /// condition, source identity, executable, revision, tree, or cleanliness
    /// property no longer matches this guard.
    pub(crate) fn revalidate(
        &self,
        source_root: &Path,
        git_executable: &Path,
        expected_git_sha256: &str,
        expected_revision: &str,
        expected_tree: &str,
    ) -> Result<(), DockerLocalRuntimeProofSourceGitGuardErrorV1> {
        let current = collect_guard_v1(
            source_root,
            git_executable,
            expected_git_sha256,
            expected_revision,
            expected_tree,
        )?;
        if self.source_root != current.source_root
            || self.git_storage != current.git_storage
            || self.git_executable != current.git_executable
            || self.revision != current.revision
            || self.tree != current.tree
        {
            return Err(DockerLocalRuntimeProofSourceGitGuardErrorV1::Rejected);
        }
        Ok(())
    }
}

/// Authenticates an exact clean checkout against declared Git and object IDs.
///
/// The function invokes only bounded, read-only local Git queries after it has
/// verified the executable and rejected unsafe repository storage. Its child
/// environment is cleared and isolated from Git config, helper, and trace
/// injection. It never fetches, creates a lock, writes Git state, or contacts
/// a network endpoint.
///
/// # Errors
///
/// Returns one stable rejection for malformed declarations, unsafe paths or
/// storage, host environment injection, executable drift, command timeout or
/// output overflow, dirty or untracked work, or an exact object-ID mismatch.
pub(crate) fn preflight_phase11_proof_source_git_v1(
    source_root: &Path,
    git_executable: &Path,
    expected_git_sha256: &str,
    expected_revision: &str,
    expected_tree: &str,
) -> Result<DockerLocalRuntimeProofSourceGitGuardV1, DockerLocalRuntimeProofSourceGitGuardErrorV1> {
    collect_guard_v1(
        source_root,
        git_executable,
        expected_git_sha256,
        expected_revision,
        expected_tree,
    )
}

fn collect_guard_v1(
    source_root: &Path,
    git_executable: &Path,
    expected_git_sha256: &str,
    expected_revision: &str,
    expected_tree: &str,
) -> Result<DockerLocalRuntimeProofSourceGitGuardV1, DockerLocalRuntimeProofSourceGitGuardErrorV1> {
    #[cfg(not(unix))]
    {
        let _ = (
            source_root,
            git_executable,
            expected_git_sha256,
            expected_revision,
            expected_tree,
        );
        return Err(DockerLocalRuntimeProofSourceGitGuardErrorV1::Rejected);
    }
    #[cfg(unix)]
    {
        if hostile_environment_v1(std::env::vars_os())
            || !valid_prefixed_sha256_v1(expected_git_sha256)
            || !valid_object_id_v1(expected_revision)
            || !valid_object_id_v1(expected_tree)
        {
            return Err(DockerLocalRuntimeProofSourceGitGuardErrorV1::Rejected);
        }
        let source_root = directory_snapshot_v1(source_root)?;
        let git_storage_path = source_root.canonical_path.join(".git");
        let git_storage = git_storage_snapshot_v1(&git_storage_path)?;
        let git_executable = executable_snapshot_v1(git_executable, expected_git_sha256)?;

        let head = run_git_text_v1(
            &git_executable.canonical_path,
            &source_root.canonical_path,
            &["rev-parse", "--verify", "--quiet", "HEAD^{commit}"],
        )?;
        let head_tree = run_git_text_v1(
            &git_executable.canonical_path,
            &source_root.canonical_path,
            &["rev-parse", "--verify", "--quiet", "HEAD^{tree}"],
        )?;
        let expected_commit_tree = run_git_text_v1(
            &git_executable.canonical_path,
            &source_root.canonical_path,
            &[
                "rev-parse",
                "--verify",
                "--quiet",
                &format!("{expected_revision}^{{tree}}"),
            ],
        )?;
        let status = run_git_text_v1(
            &git_executable.canonical_path,
            &source_root.canonical_path,
            &[
                "status",
                "--porcelain=v1",
                "--untracked-files=all",
                "--ignored",
                "--ignore-submodules=none",
                "--no-ahead-behind",
            ],
        )?;
        let index_flags = run_git_bytes_v1(
            &git_executable.canonical_path,
            &source_root.canonical_path,
            &["ls-files", "-v", "-z"],
            MAX_GIT_INDEX_LIST_BYTES_V1,
        )?;
        if head != expected_revision
            || head_tree != expected_tree
            || expected_commit_tree != expected_tree
            || !status.is_empty()
            || !safe_index_flags_v1(&index_flags)
        {
            return Err(DockerLocalRuntimeProofSourceGitGuardErrorV1::Rejected);
        }

        let final_source_root = directory_snapshot_v1(&source_root.canonical_path)?;
        let final_git_storage = git_storage_snapshot_v1(&git_storage_path)?;
        let final_git_executable =
            executable_snapshot_v1(&git_executable.canonical_path, expected_git_sha256)?;
        if source_root != final_source_root
            || git_storage != final_git_storage
            || git_executable != final_git_executable
        {
            return Err(DockerLocalRuntimeProofSourceGitGuardErrorV1::Rejected);
        }
        Ok(DockerLocalRuntimeProofSourceGitGuardV1 {
            source_root,
            git_storage,
            git_executable,
            revision: expected_revision.to_owned(),
            tree: expected_tree.to_owned(),
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
    modified_seconds: i64,
    modified_nanoseconds: i64,
}

#[derive(Clone, Debug, Eq, PartialEq)]
struct DirectorySnapshotV1 {
    canonical_path: PathBuf,
    identity: FileIdentityV1,
}

#[derive(Clone, Debug, Eq, PartialEq)]
struct GitStorageSnapshotV1 {
    directory: DirectorySnapshotV1,
    config: FileIdentityV1,
    index: FileIdentityV1,
}

#[derive(Clone, Debug, Eq, PartialEq)]
struct ExecutableSnapshotV1 {
    canonical_path: PathBuf,
    identity: FileIdentityV1,
    digest: String,
}

fn directory_snapshot_v1(
    path: &Path,
) -> Result<DirectorySnapshotV1, DockerLocalRuntimeProofSourceGitGuardErrorV1> {
    let canonical_path = canonical_absolute_path_without_symlink_ancestors_v1(path)?;
    let metadata = fs::symlink_metadata(path)
        .map_err(|_| DockerLocalRuntimeProofSourceGitGuardErrorV1::Rejected)?;
    #[cfg(not(unix))]
    let _ = &metadata;
    #[cfg(unix)]
    if metadata.file_type().is_symlink()
        || !metadata.file_type().is_dir()
        || metadata.mode() & 0o022 != 0
        || !owned_by_root_or_effective_user_v1(&metadata)
    {
        return Err(DockerLocalRuntimeProofSourceGitGuardErrorV1::Rejected);
    }
    Ok(DirectorySnapshotV1 {
        canonical_path,
        identity: file_identity_v1(&metadata),
    })
}

fn git_storage_snapshot_v1(
    path: &Path,
) -> Result<GitStorageSnapshotV1, DockerLocalRuntimeProofSourceGitGuardErrorV1> {
    let snapshot = directory_snapshot_v1(path)?;
    let required_directories = [path.join("objects"), path.join("refs")];
    for directory in required_directories {
        let _ = directory_snapshot_v1(&directory)?;
    }
    let prohibited = [
        path.join("commondir"),
        path.join("shallow"),
        path.join("info").join("alternates"),
        path.join("info").join("grafts"),
        path.join("refs").join("replace"),
        path.join("index.lock"),
        path.join("HEAD.lock"),
        path.join("packed-refs.lock"),
        path.join("config.lock"),
        path.join("config.worktree"),
    ];
    if prohibited.iter().any(|candidate| candidate.exists()) {
        return Err(DockerLocalRuntimeProofSourceGitGuardErrorV1::Rejected);
    }
    let config = path.join("config");
    let config_metadata = fs::symlink_metadata(&config)
        .map_err(|_| DockerLocalRuntimeProofSourceGitGuardErrorV1::Rejected)?;
    #[cfg(unix)]
    let unsafe_config_owner_or_mode = config_metadata.mode() & 0o022 != 0
        || !owned_by_root_or_effective_user_v1(&config_metadata);
    #[cfg(not(unix))]
    let unsafe_config_owner_or_mode = true;
    if config_metadata.file_type().is_symlink()
        || !config_metadata.file_type().is_file()
        || config_metadata.len() > MAX_GIT_CONFIG_BYTES_V1
        || unsafe_config_owner_or_mode
    {
        return Err(DockerLocalRuntimeProofSourceGitGuardErrorV1::Rejected);
    }
    let mut config_file =
        File::open(&config).map_err(|_| DockerLocalRuntimeProofSourceGitGuardErrorV1::Rejected)?;
    let opened = config_file
        .metadata()
        .map_err(|_| DockerLocalRuntimeProofSourceGitGuardErrorV1::Rejected)?;
    if file_identity_v1(&opened) != file_identity_v1(&config_metadata) {
        return Err(DockerLocalRuntimeProofSourceGitGuardErrorV1::Rejected);
    }
    let mut config_bytes = Vec::new();
    (&mut config_file)
        .take(MAX_GIT_CONFIG_BYTES_V1 + 1)
        .read_to_end(&mut config_bytes)
        .map_err(|_| DockerLocalRuntimeProofSourceGitGuardErrorV1::Rejected)?;
    let after = fs::symlink_metadata(&config)
        .map_err(|_| DockerLocalRuntimeProofSourceGitGuardErrorV1::Rejected)?;
    if config_bytes.len() as u64 > MAX_GIT_CONFIG_BYTES_V1
        || file_identity_v1(&after) != file_identity_v1(&config_metadata)
    {
        return Err(DockerLocalRuntimeProofSourceGitGuardErrorV1::Rejected);
    }
    if hostile_local_config_v1(&config_bytes) {
        return Err(DockerLocalRuntimeProofSourceGitGuardErrorV1::Rejected);
    }
    let index = path.join("index");
    let index_metadata = fs::symlink_metadata(&index)
        .map_err(|_| DockerLocalRuntimeProofSourceGitGuardErrorV1::Rejected)?;
    #[cfg(unix)]
    let unsafe_index_owner_or_mode =
        index_metadata.mode() & 0o022 != 0 || !owned_by_root_or_effective_user_v1(&index_metadata);
    #[cfg(not(unix))]
    let unsafe_index_owner_or_mode = true;
    if !index_metadata.file_type().is_file()
        || unsafe_index_owner_or_mode
        || index_metadata.len() > MAX_GIT_INDEX_LIST_BYTES_V1 as u64
    {
        return Err(DockerLocalRuntimeProofSourceGitGuardErrorV1::Rejected);
    }
    reject_symlinked_storage_v1(path)?;
    Ok(GitStorageSnapshotV1 {
        directory: snapshot,
        config: file_identity_v1(&config_metadata),
        index: file_identity_v1(&index_metadata),
    })
}

fn reject_symlinked_storage_v1(
    root: &Path,
) -> Result<(), DockerLocalRuntimeProofSourceGitGuardErrorV1> {
    let mut pending = vec![root.to_owned()];
    let mut entries_seen = 0_usize;
    while let Some(directory) = pending.pop() {
        let entries = fs::read_dir(&directory)
            .map_err(|_| DockerLocalRuntimeProofSourceGitGuardErrorV1::Rejected)?;
        for entry in entries {
            let entry =
                entry.map_err(|_| DockerLocalRuntimeProofSourceGitGuardErrorV1::Rejected)?;
            entries_seen = entries_seen.saturating_add(1);
            if entries_seen > MAX_GIT_STORAGE_ENTRIES_V1 {
                return Err(DockerLocalRuntimeProofSourceGitGuardErrorV1::Rejected);
            }
            let metadata = entry
                .file_type()
                .map_err(|_| DockerLocalRuntimeProofSourceGitGuardErrorV1::Rejected)?;
            if metadata.is_symlink() {
                return Err(DockerLocalRuntimeProofSourceGitGuardErrorV1::Rejected);
            }
            if metadata.is_dir() {
                pending.push(entry.path());
            }
        }
    }
    Ok(())
}

fn executable_snapshot_v1(
    path: &Path,
    expected_digest: &str,
) -> Result<ExecutableSnapshotV1, DockerLocalRuntimeProofSourceGitGuardErrorV1> {
    if !path.is_absolute() || !valid_prefixed_sha256_v1(expected_digest) {
        return Err(DockerLocalRuntimeProofSourceGitGuardErrorV1::Rejected);
    }
    let canonical_path = canonical_absolute_path_without_symlink_ancestors_v1(path)?;
    let before = fs::symlink_metadata(path)
        .map_err(|_| DockerLocalRuntimeProofSourceGitGuardErrorV1::Rejected)?;
    #[cfg(unix)]
    if before.file_type().is_symlink()
        || !before.file_type().is_file()
        || before.len() == 0
        || before.len() > MAX_GIT_EXECUTABLE_BYTES_V1
        || before.mode() & 0o022 != 0
        || before.mode() & 0o111 == 0
        || !owned_by_root_or_effective_user_v1(&before)
    {
        return Err(DockerLocalRuntimeProofSourceGitGuardErrorV1::Rejected);
    }
    let before_identity = file_identity_v1(&before);
    let mut file =
        File::open(path).map_err(|_| DockerLocalRuntimeProofSourceGitGuardErrorV1::Rejected)?;
    let opened = file
        .metadata()
        .map_err(|_| DockerLocalRuntimeProofSourceGitGuardErrorV1::Rejected)?;
    if before_identity != file_identity_v1(&opened) {
        return Err(DockerLocalRuntimeProofSourceGitGuardErrorV1::Rejected);
    }
    let digest = digest_file_v1(&mut file)?;
    let after = fs::symlink_metadata(path)
        .map_err(|_| DockerLocalRuntimeProofSourceGitGuardErrorV1::Rejected)?;
    if before_identity != file_identity_v1(&after) || digest != expected_digest {
        return Err(DockerLocalRuntimeProofSourceGitGuardErrorV1::Rejected);
    }
    Ok(ExecutableSnapshotV1 {
        canonical_path,
        identity: before_identity,
        digest,
    })
}

fn digest_file_v1(file: &mut File) -> Result<String, DockerLocalRuntimeProofSourceGitGuardErrorV1> {
    let mut hasher = Sha256::new();
    let mut buffer = [0_u8; 8 * 1024];
    loop {
        let count = file
            .read(&mut buffer)
            .map_err(|_| DockerLocalRuntimeProofSourceGitGuardErrorV1::Rejected)?;
        if count == 0 {
            break;
        }
        hasher.update(&buffer[..count]);
    }
    buffer.fill(0);
    Ok(prefixed_sha256_v1(&hasher.finalize().into()))
}

fn run_git_text_v1(
    git_executable: &Path,
    source_root: &Path,
    arguments: &[&str],
) -> Result<String, DockerLocalRuntimeProofSourceGitGuardErrorV1> {
    let output = run_git_bytes_v1(
        git_executable,
        source_root,
        arguments,
        MAX_GIT_COMMAND_OUTPUT_BYTES_V1,
    )?;
    let output = String::from_utf8(output)
        .map_err(|_| DockerLocalRuntimeProofSourceGitGuardErrorV1::Rejected)?;
    let output = output.trim_end_matches(['\r', '\n']);
    if output.contains(['\r', '\n', '\0']) {
        return Err(DockerLocalRuntimeProofSourceGitGuardErrorV1::Rejected);
    }
    Ok(output.to_owned())
}

fn run_git_bytes_v1(
    git_executable: &Path,
    source_root: &Path,
    arguments: &[&str],
    output_limit: usize,
) -> Result<Vec<u8>, DockerLocalRuntimeProofSourceGitGuardErrorV1> {
    let mut command = Command::new(git_executable);
    command
        .env_clear()
        .env("GIT_CONFIG_NOSYSTEM", "1")
        .env("GIT_CONFIG_GLOBAL", "/dev/null")
        .env("GIT_CONFIG_SYSTEM", "/dev/null")
        .env("GIT_TERMINAL_PROMPT", "0")
        .env("GIT_OPTIONAL_LOCKS", "0")
        .env("HOME", "/nonexistent")
        .arg("--no-pager")
        .arg("--no-optional-locks")
        .arg("-c")
        .arg("core.hooksPath=/dev/null")
        .arg("-c")
        .arg("core.fsmonitor=false")
        .arg("-c")
        .arg("core.untrackedCache=false")
        .arg("-c")
        .arg("core.preloadIndex=false")
        .arg("-c")
        .arg("core.filemode=true")
        .arg("-c")
        .arg("core.ignorecase=false")
        .arg("-c")
        .arg("core.symlinks=true")
        .arg("-c")
        .arg("core.sparseCheckout=false")
        .arg("-c")
        .arg("core.ignoreStat=false")
        .arg("-c")
        .arg("core.autocrlf=false")
        .arg("-c")
        .arg("core.eol=lf")
        .arg("-c")
        .arg("core.trustctime=true")
        .arg("-c")
        .arg("core.checkStat=default")
        .arg("-c")
        .arg("core.pager=cat")
        .arg("-c")
        .arg("credential.helper=")
        .arg("-c")
        .arg("diff.external=")
        .arg("-c")
        .arg("core.sshCommand=")
        .arg("-c")
        .arg("core.gitProxy=")
        .arg("-c")
        .arg("core.askPass=")
        .arg("-C")
        .arg(source_root)
        .args(arguments)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    #[cfg(target_os = "macos")]
    command
        .env("TMPDIR", "/tmp")
        .env("DARWIN_USER_TEMP_DIR", "/tmp");
    let mut child = command
        .spawn()
        .map_err(|_| DockerLocalRuntimeProofSourceGitGuardErrorV1::Rejected)?;
    let stdout = child
        .stdout
        .take()
        .ok_or(DockerLocalRuntimeProofSourceGitGuardErrorV1::Rejected)?;
    let stderr = child
        .stderr
        .take()
        .ok_or(DockerLocalRuntimeProofSourceGitGuardErrorV1::Rejected)?;
    let stdout_reader = thread::spawn(move || read_bounded_output_v1(stdout, output_limit));
    let stderr_reader =
        thread::spawn(move || read_bounded_output_v1(stderr, MAX_GIT_COMMAND_OUTPUT_BYTES_V1));
    let started = Instant::now();
    let status = loop {
        match child.try_wait() {
            Ok(Some(status)) => break status,
            Ok(None) if started.elapsed() < GIT_COMMAND_TIMEOUT_V1 => {
                thread::sleep(GIT_COMMAND_POLL_INTERVAL_V1);
            }
            Ok(None) | Err(_) => {
                let _ = child.kill();
                let _ = child.wait();
                let _ = stdout_reader.join();
                let _ = stderr_reader.join();
                return Err(DockerLocalRuntimeProofSourceGitGuardErrorV1::Rejected);
            }
        }
    };
    let stdout = stdout_reader
        .join()
        .map_err(|_| DockerLocalRuntimeProofSourceGitGuardErrorV1::Rejected)??;
    let stderr = stderr_reader
        .join()
        .map_err(|_| DockerLocalRuntimeProofSourceGitGuardErrorV1::Rejected)??;
    if !status.success() || !stderr.is_empty() {
        return Err(DockerLocalRuntimeProofSourceGitGuardErrorV1::Rejected);
    }
    Ok(stdout)
}

fn read_bounded_output_v1<R: Read>(
    mut reader: R,
    output_limit: usize,
) -> Result<Vec<u8>, DockerLocalRuntimeProofSourceGitGuardErrorV1> {
    let mut result = Vec::new();
    let mut buffer = [0_u8; 1024];
    let mut overflow = false;
    loop {
        let count = reader
            .read(&mut buffer)
            .map_err(|_| DockerLocalRuntimeProofSourceGitGuardErrorV1::Rejected)?;
        if count == 0 {
            break;
        }
        let remaining = output_limit.saturating_sub(result.len());
        if count > remaining {
            overflow = true;
        }
        result.extend_from_slice(&buffer[..count.min(remaining)]);
    }
    buffer.fill(0);
    if overflow {
        return Err(DockerLocalRuntimeProofSourceGitGuardErrorV1::Rejected);
    }
    Ok(result)
}

fn canonical_absolute_path_without_symlink_ancestors_v1(
    path: &Path,
) -> Result<PathBuf, DockerLocalRuntimeProofSourceGitGuardErrorV1> {
    if !path.is_absolute()
        || path.as_os_str().is_empty()
        || path.components().any(|component| {
            matches!(
                component,
                Component::ParentDir | Component::CurDir | Component::Prefix(_)
            )
        })
    {
        return Err(DockerLocalRuntimeProofSourceGitGuardErrorV1::Rejected);
    }
    let mut current = PathBuf::new();
    for component in path.components() {
        current.push(component.as_os_str());
        let metadata = fs::symlink_metadata(&current)
            .map_err(|_| DockerLocalRuntimeProofSourceGitGuardErrorV1::Rejected)?;
        if metadata.file_type().is_symlink() {
            return Err(DockerLocalRuntimeProofSourceGitGuardErrorV1::Rejected);
        }
    }
    let canonical = fs::canonicalize(path)
        .map_err(|_| DockerLocalRuntimeProofSourceGitGuardErrorV1::Rejected)?;
    if canonical != path {
        return Err(DockerLocalRuntimeProofSourceGitGuardErrorV1::Rejected);
    }
    Ok(canonical)
}

#[cfg(unix)]
fn file_identity_v1(metadata: &Metadata) -> FileIdentityV1 {
    FileIdentityV1 {
        device: metadata.dev(),
        inode: metadata.ino(),
        uid: metadata.uid(),
        gid: metadata.gid(),
        mode: metadata.mode(),
        size: metadata.size(),
        modified_seconds: metadata.mtime(),
        modified_nanoseconds: metadata.mtime_nsec(),
    }
}

#[cfg(not(unix))]
fn file_identity_v1(metadata: &Metadata) -> FileIdentityV1 {
    let _ = metadata;
    FileIdentityV1 {
        device: 0,
        inode: 0,
        uid: 0,
        gid: 0,
        mode: 0,
        size: 0,
        modified_seconds: 0,
        modified_nanoseconds: 0,
    }
}

#[cfg(unix)]
fn owned_by_root_or_effective_user_v1(metadata: &Metadata) -> bool {
    metadata.uid() == 0 || metadata.uid() == nix::unistd::geteuid().as_raw()
}

fn hostile_environment_v1<I>(variables: I) -> bool
where
    I: IntoIterator<Item = (OsString, OsString)>,
{
    variables.into_iter().any(|(key, _)| {
        let key = key.to_string_lossy();
        key.starts_with("GIT_TRACE")
            || matches!(
                key.as_ref(),
                "GIT_CONFIG_COUNT"
                    | "GIT_CONFIG_GLOBAL"
                    | "GIT_CONFIG_NOSYSTEM"
                    | "GIT_CONFIG_PARAMETERS"
                    | "GIT_CONFIG_SYSTEM"
                    | "GIT_DIR"
                    | "GIT_WORK_TREE"
                    | "GIT_COMMON_DIR"
                    | "GIT_INDEX_FILE"
                    | "GIT_OBJECT_DIRECTORY"
                    | "GIT_ALTERNATE_OBJECT_DIRECTORIES"
                    | "GIT_EXTERNAL_DIFF"
                    | "GIT_ASKPASS"
                    | "GIT_SSH"
                    | "GIT_SSH_COMMAND"
                    | "GIT_PROXY_COMMAND"
                    | "GIT_CEILING_DIRECTORIES"
                    | "GIT_TEMPLATE_DIR"
                    | "GIT_ATTRIBUTES_FILE"
            )
    })
}

fn hostile_local_config_v1(config: &[u8]) -> bool {
    let Ok(config) = std::str::from_utf8(config) else {
        return true;
    };
    let config = config.to_ascii_lowercase();
    let unsafe_core_filemode = config
        .split("[core]")
        .skip(1)
        .map(|section| section.split('[').next().unwrap_or_default())
        .flat_map(str::lines)
        .filter_map(|line| line.trim().split_once('='))
        .any(|(key, value)| key.trim() == "filemode" && value.trim() != "true");
    unsafe_core_filemode
        || [
            "include",
            "alias",
            "helper",
            "hooks",
            "fsmonitor",
            "askpass",
            "sshcommand",
            "gitproxy",
            "pager",
            "external",
            "command",
            "filter",
            "credential",
            "trace",
            "worktree",
        ]
        .iter()
        .any(|needle| config.contains(needle))
}

fn safe_index_flags_v1(output: &[u8]) -> bool {
    output.last() == Some(&0)
        && output[..output.len() - 1]
            .split(|byte| *byte == 0)
            .all(|entry| entry.len() > 2 && entry[0] == b'H' && entry[1] == b' ')
}

fn valid_prefixed_sha256_v1(value: &str) -> bool {
    value
        .strip_prefix("sha256:")
        .is_some_and(|hex| hex.len() == 64 && hex.bytes().all(|byte| byte.is_ascii_hexdigit()))
}

fn valid_object_id_v1(value: &str) -> bool {
    matches!(value.len(), 40 | 64) && value.bytes().all(|byte| byte.is_ascii_hexdigit())
}

fn prefixed_sha256_v1(digest: &[u8; 32]) -> String {
    use std::fmt::Write as _;
    let mut result = String::with_capacity(71);
    result.push_str("sha256:");
    for byte in digest {
        let _ = write!(result, "{byte:02x}");
    }
    result
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write as _;
    use std::os::unix::fs::{PermissionsExt as _, symlink};
    use std::sync::{Mutex, OnceLock};
    use std::time::{SystemTime, UNIX_EPOCH};

    const GIT_EXECUTABLE_V1: &str = "/usr/bin/git";

    struct FixtureV1 {
        root: PathBuf,
        repository: PathBuf,
        git_digest: String,
        revision: String,
        tree: String,
    }

    fn git_test_lock_v1() -> &'static Mutex<()> {
        static LOCK: OnceLock<Mutex<()>> = OnceLock::new();
        LOCK.get_or_init(|| Mutex::new(()))
    }

    fn fixture_v1(name: &str) -> FixtureV1 {
        let temporary_root =
            fs::canonicalize(std::env::temp_dir()).expect("canonical temporary root");
        let root = temporary_root.join(format!(
            "lnsat-phase11-source-git-guard-{name}-{}-{}",
            std::process::id(),
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .expect("clock after epoch")
                .as_nanos()
        ));
        fs::create_dir_all(&root).expect("temporary root");
        fs::set_permissions(&root, fs::Permissions::from_mode(0o700)).expect("temporary mode");
        let repository = root.join("source");
        fs::create_dir(&repository).expect("repository directory");
        fs::set_permissions(&repository, fs::Permissions::from_mode(0o700))
            .expect("repository mode");
        git_v1(&repository, &["init"]);
        git_v1(&repository, &["config", "user.name", "LNSAT test"]);
        git_v1(
            &repository,
            &["config", "user.email", "lnsat@example.invalid"],
        );
        fs::write(repository.join("README.md"), b"phase 11 fixture\n").expect("fixture file");
        git_v1(&repository, &["add", "README.md"]);
        git_v1(&repository, &["commit", "-m", "fixture"]);
        let revision = git_text_v1(&repository, &["rev-parse", "HEAD"]);
        let tree = git_text_v1(&repository, &["rev-parse", "HEAD^{tree}"]);
        FixtureV1 {
            root,
            repository,
            git_digest: digest_path_v1(Path::new(GIT_EXECUTABLE_V1)),
            revision,
            tree,
        }
    }

    fn git_v1(repository: &Path, arguments: &[&str]) {
        let output = Command::new(GIT_EXECUTABLE_V1)
            .current_dir(repository)
            .env_clear()
            .env("GIT_CONFIG_NOSYSTEM", "1")
            .env("GIT_CONFIG_GLOBAL", "/dev/null")
            .env("GIT_TERMINAL_PROMPT", "0")
            .args(arguments)
            .output()
            .expect("Git starts");
        assert!(
            output.status.success(),
            "Git {arguments:?} failed: {}",
            String::from_utf8_lossy(&output.stderr)
        );
    }

    fn git_text_v1(repository: &Path, arguments: &[&str]) -> String {
        let output = Command::new(GIT_EXECUTABLE_V1)
            .current_dir(repository)
            .env_clear()
            .env("GIT_CONFIG_NOSYSTEM", "1")
            .env("GIT_CONFIG_GLOBAL", "/dev/null")
            .args(arguments)
            .output()
            .expect("Git starts");
        assert!(output.status.success(), "Git {arguments:?} succeeds");
        String::from_utf8(output.stdout)
            .expect("Git output UTF-8")
            .trim()
            .to_owned()
    }

    fn digest_path_v1(path: &Path) -> String {
        prefixed_sha256_v1(&Sha256::digest(fs::read(path).expect("digest source")).into())
    }

    fn preflight_v1(
        fixture: &FixtureV1,
    ) -> Result<DockerLocalRuntimeProofSourceGitGuardV1, DockerLocalRuntimeProofSourceGitGuardErrorV1>
    {
        preflight_phase11_proof_source_git_v1(
            &fixture.repository,
            Path::new(GIT_EXECUTABLE_V1),
            &fixture.git_digest,
            &fixture.revision,
            &fixture.tree,
        )
    }

    fn cleanup_v1(fixture: FixtureV1) {
        fs::remove_dir_all(fixture.root).expect("temporary cleanup");
    }

    #[test]
    fn preflight_accepts_exact_clean_source_and_revalidates() {
        let _guard = git_test_lock_v1()
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner);
        let fixture = fixture_v1("clean");
        let guard = preflight_v1(&fixture).expect("clean source accepts");
        guard
            .revalidate(
                &fixture.repository,
                Path::new(GIT_EXECUTABLE_V1),
                &fixture.git_digest,
                &fixture.revision,
                &fixture.tree,
            )
            .expect("unchanged source revalidates");
        cleanup_v1(fixture);
    }

    #[test]
    fn preflight_rejects_dirty_and_untracked_source() {
        let _guard = git_test_lock_v1()
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner);
        let fixture = fixture_v1("dirty");
        fs::write(fixture.repository.join("README.md"), b"changed\n").expect("dirty write");
        assert!(matches!(
            preflight_v1(&fixture),
            Err(DockerLocalRuntimeProofSourceGitGuardErrorV1::Rejected)
        ));
        git_v1(&fixture.repository, &["checkout", "--", "README.md"]);
        fs::write(fixture.repository.join("untracked.txt"), b"untracked\n")
            .expect("untracked write");
        assert!(preflight_v1(&fixture).is_err());
        fs::remove_file(fixture.repository.join("untracked.txt")).expect("untracked cleanup");
        fs::write(fixture.repository.join(".gitignore"), b"ignored.txt\n").expect("ignore rule");
        fs::write(fixture.repository.join("ignored.txt"), b"ignored\n").expect("ignored write");
        assert!(preflight_v1(&fixture).is_err());
        cleanup_v1(fixture);
    }

    #[test]
    fn revalidate_rejects_commit_drift() {
        let _guard = git_test_lock_v1()
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner);
        let fixture = fixture_v1("drift");
        let guard = preflight_v1(&fixture).expect("initial source accepts");
        fs::write(fixture.repository.join("README.md"), b"next commit\n").expect("drift write");
        git_v1(&fixture.repository, &["add", "README.md"]);
        git_v1(&fixture.repository, &["commit", "-m", "drift"]);
        assert!(
            guard
                .revalidate(
                    &fixture.repository,
                    Path::new(GIT_EXECUTABLE_V1),
                    &fixture.git_digest,
                    &fixture.revision,
                    &fixture.tree,
                )
                .is_err()
        );
        cleanup_v1(fixture);
    }

    #[test]
    fn preflight_rejects_malformed_or_wrong_revision_and_tree() {
        let _guard = git_test_lock_v1()
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner);
        let fixture = fixture_v1("objects");
        assert!(
            preflight_phase11_proof_source_git_v1(
                &fixture.repository,
                Path::new(GIT_EXECUTABLE_V1),
                &fixture.git_digest,
                "HEAD",
                &fixture.tree,
            )
            .is_err()
        );
        assert!(
            preflight_phase11_proof_source_git_v1(
                &fixture.repository,
                Path::new(GIT_EXECUTABLE_V1),
                &fixture.git_digest,
                &"0".repeat(fixture.revision.len()),
                &fixture.tree,
            )
            .is_err()
        );
        assert!(
            preflight_phase11_proof_source_git_v1(
                &fixture.repository,
                Path::new(GIT_EXECUTABLE_V1),
                &fixture.git_digest,
                &fixture.revision,
                &"0".repeat(fixture.tree.len()),
            )
            .is_err()
        );
        cleanup_v1(fixture);
    }

    #[test]
    fn preflight_rejects_hostile_environment_and_local_config() {
        let _guard = git_test_lock_v1()
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner);
        assert!(hostile_environment_v1([(
            OsString::from("GIT_TRACE"),
            OsString::from("/private/trace"),
        )]));
        assert!(!hostile_environment_v1([(
            OsString::from("PAGER"),
            OsString::from("evil"),
        )]));
        assert!(!hostile_environment_v1([(
            OsString::from("PATH"),
            OsString::from("/usr/bin"),
        )]));
        let fixture = fixture_v1("config");
        let mut config = fs::OpenOptions::new()
            .append(true)
            .open(fixture.repository.join(".git").join("config"))
            .expect("config opens");
        config
            .write_all(b"\n[alias]\nmalicious = !false\n")
            .expect("hostile config writes");
        assert!(preflight_v1(&fixture).is_err());
        cleanup_v1(fixture);
    }

    #[test]
    fn preflight_rejects_symlinked_git_storage() {
        let _guard = git_test_lock_v1()
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner);
        let fixture = fixture_v1("symlink");
        let storage = fixture.repository.join(".git");
        let objects = storage.join("objects");
        let replacement = storage.join("objects-real");
        fs::rename(&objects, &replacement).expect("objects relocate");
        symlink(&replacement, &objects).expect("objects symlink");
        assert!(preflight_v1(&fixture).is_err());
        cleanup_v1(fixture);
    }

    #[test]
    fn preflight_rejects_worktree_local_config() {
        let _guard = git_test_lock_v1()
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner);
        let fixture = fixture_v1("worktree-config");
        fs::write(
            fixture.repository.join(".git").join("config.worktree"),
            b"[core]\nhooksPath = /tmp/unsafe\n",
        )
        .expect("worktree config writes");
        assert!(preflight_v1(&fixture).is_err());
        cleanup_v1(fixture);
    }

    #[test]
    fn preflight_rejects_worktree_redirection_and_writable_config() {
        let _guard = git_test_lock_v1()
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner);
        let fixture = fixture_v1("worktree-redirect");
        let alternate = fixture.root.join("other-source");
        fs::create_dir(&alternate).expect("alternate source directory");
        git_v1(
            &fixture.repository,
            &[
                "config",
                "core.worktree",
                alternate.to_str().expect("alternate path UTF-8"),
            ],
        );
        fs::write(
            fixture.repository.join("README.md"),
            b"dirty declared source\n",
        )
        .expect("dirty source write");
        assert!(preflight_v1(&fixture).is_err());
        git_v1(&fixture.repository, &["config", "--unset", "core.worktree"]);
        git_v1(&fixture.repository, &["checkout", "--", "README.md"]);
        let config = fixture.repository.join(".git").join("config");
        fs::set_permissions(&config, fs::Permissions::from_mode(0o666))
            .expect("weaken config mode");
        assert!(preflight_v1(&fixture).is_err());
        cleanup_v1(fixture);
    }

    #[test]
    fn preflight_rejects_filemode_disabled_with_tracked_mode_drift() {
        let _guard = git_test_lock_v1()
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner);
        let fixture = fixture_v1("filemode-disabled");
        git_v1(&fixture.repository, &["config", "core.filemode", "false"]);
        let tracked_file = fixture.repository.join("README.md");
        fs::set_permissions(&tracked_file, fs::Permissions::from_mode(0o755))
            .expect("tracked file executable mode");
        assert!(preflight_v1(&fixture).is_err());
        cleanup_v1(fixture);
    }

    #[test]
    fn preflight_rejects_hidden_index_flags_and_writable_index() {
        let _guard = git_test_lock_v1()
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner);
        let fixture = fixture_v1("hidden-index-flags");
        let tracked_file = fixture.repository.join("README.md");
        git_v1(
            &fixture.repository,
            &["update-index", "--assume-unchanged", "README.md"],
        );
        fs::write(&tracked_file, b"hidden change\n").expect("tracked content drift");
        assert!(preflight_v1(&fixture).is_err());
        git_v1(
            &fixture.repository,
            &["update-index", "--no-assume-unchanged", "README.md"],
        );
        git_v1(&fixture.repository, &["checkout", "--", "README.md"]);
        git_v1(
            &fixture.repository,
            &["update-index", "--skip-worktree", "README.md"],
        );
        fs::write(&tracked_file, b"another hidden change\n").expect("tracked content drift");
        assert!(preflight_v1(&fixture).is_err());
        git_v1(
            &fixture.repository,
            &["update-index", "--no-skip-worktree", "README.md"],
        );
        git_v1(&fixture.repository, &["checkout", "--", "README.md"]);
        let index = fixture.repository.join(".git").join("index");
        fs::set_permissions(&index, fs::Permissions::from_mode(0o666)).expect("weaken index mode");
        assert!(preflight_v1(&fixture).is_err());
        cleanup_v1(fixture);
    }
}
