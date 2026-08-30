//! Source-only P11-D4B1 Docker-local supervisor boundary.
//!
//! This module launches one exact schema-2 Docker-local profile against one
//! already-approved, marked disposable Git target. It never discovers an
//! endpoint, pulls/builds an image, accepts ambient environment or credentials,
//! opens a served route, persists a receipt, or targets a production repository.

use crate::adapter_process_protocol::{
    DockerLocalAdapterProcessRequestInputV1, validate_docker_local_adapter_process_exchange_v1,
};
use crate::docker_local_execution_payload::{
    DockerLocalExecutionPayloadRequestFrameV1, build_docker_local_execution_payload_request_v1,
    parse_docker_local_execution_payload_request_v1,
};
use crate::runtime_profile::{DOCKER_LOCAL_ADAPTER_REF_V1, LoadedDockerLocalRuntimeProfileV1};
use lnsat_store::{
    Phase7GitExecutionResultV1, inspect_phase11_disposable_git_result_v1,
    validate_phase11_disposable_git_target_v1,
};
use sha2::{Digest, Sha256};
use std::ffi::OsString;
use std::fmt;
use std::fs::{self, File, Metadata, OpenOptions};
use std::io::{Read, Write};
#[cfg(unix)]
use std::os::fd::AsFd;
#[cfg(unix)]
use std::os::unix::fs::{
    DirBuilderExt as _, FileTypeExt as _, MetadataExt as _, OpenOptionsExt as _,
};
use std::path::{Component, Path, PathBuf};
use std::process::{Child, Command, ExitStatus, Stdio};
use std::time::{Duration, Instant};
use zeroize::Zeroizing;

/// Domain identity for one host-revalidated adapter result.
pub const DOCKER_LOCAL_SUPERVISED_RESULT_CONTRACT_ID_V1: &str =
    "lnsat.docker_local_supervised_git_result.v1";
/// Maximum host executable accepted for digest verification.
pub const MAX_DOCKER_LOCAL_SUPERVISOR_EXECUTABLE_BYTES_V1: u64 = 512 * 1024 * 1024;
/// Cleanup command deadline after any ambiguous launched exchange.
pub const DOCKER_LOCAL_SUPERVISOR_CLEANUP_MILLIS_V1: u64 = 5_000;

const RESULT_DIGEST_DOMAIN_V1: &[u8] = b"lnsat.docker-local-supervised-git-result.v1";

/// Exact inputs for one supervised isolated Docker exchange.
#[derive(Clone, Copy)]
pub struct DockerLocalSupervisorInputV1<'a> {
    pub payload: &'a DockerLocalExecutionPayloadRequestFrameV1,
    pub loaded_profile: &'a LoadedDockerLocalRuntimeProfileV1,
    pub docker_executable: &'a Path,
    pub verifier_git_executable: &'a Path,
    pub disposable_root: &'a Path,
}

/// Receipt-ready semantic result. Persistence remains a later D4B2 boundary.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct DockerLocalSupervisedGitResultV1 {
    pub semantic_result: Phase7GitExecutionResultV1,
    pub adapter_result_digest: [u8; 32],
    pub elapsed_millis: u64,
}

/// Stable code-only failures. No variant stores paths, payloads, output, or secrets.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum DockerLocalSupervisorErrorV1 {
    InputInvalid,
    ProfileBindingInvalid,
    DockerExecutableInvalid,
    VerifierExecutableInvalid,
    DockerEndpointInvalid,
    TargetRejected,
    RuntimeUnavailable,
    OutcomeUnknown,
}

impl DockerLocalSupervisorErrorV1 {
    #[must_use]
    pub const fn code(self) -> &'static str {
        match self {
            Self::InputInvalid => "docker_local_supervisor.input_invalid",
            Self::ProfileBindingInvalid => "docker_local_supervisor.profile_binding_invalid",
            Self::DockerExecutableInvalid => "docker_local_supervisor.docker_executable_invalid",
            Self::VerifierExecutableInvalid => {
                "docker_local_supervisor.verifier_executable_invalid"
            }
            Self::DockerEndpointInvalid => "docker_local_supervisor.docker_endpoint_invalid",
            Self::TargetRejected => "docker_local_supervisor.target_rejected",
            Self::RuntimeUnavailable => "docker_local_supervisor.runtime_unavailable",
            Self::OutcomeUnknown => "docker_local_supervisor.outcome_unknown",
        }
    }
}

impl fmt::Display for DockerLocalSupervisorErrorV1 {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(self.code())
    }
}

impl std::error::Error for DockerLocalSupervisorErrorV1 {}

/// Runs one exact isolated Docker adapter exchange.
///
/// Every authority, runtime, and target check before `spawn` is read-only; only
/// a private empty client-config file is created. After process creation, any
/// timeout, I/O failure, nonzero exit, output anomaly, runtime identity drift,
/// protocol error, target ambiguity, or semantic-digest mismatch returns only
/// `outcome_unknown` and triggers best-effort forced container cleanup.
///
/// # Errors
///
/// Rejects any profile/payload/target/runtime drift before launch. Any anomaly
/// after launch becomes [`DockerLocalSupervisorErrorV1::OutcomeUnknown`].
#[allow(clippy::too_many_lines)]
pub fn supervise_docker_local_git_execution_v1(
    input: &DockerLocalSupervisorInputV1<'_>,
) -> Result<DockerLocalSupervisedGitResultV1, DockerLocalSupervisorErrorV1> {
    let supervisor = input
        .loaded_profile
        .supervisor()
        .ok_or(DockerLocalSupervisorErrorV1::InputInvalid)?;
    let parsed = parse_docker_local_execution_payload_request_v1(input.payload.frame())
        .map_err(|_| DockerLocalSupervisorErrorV1::InputInvalid)?;
    let operation = &parsed.control().request().operation;
    let rebuilt =
        build_docker_local_execution_payload_request_v1(&DockerLocalAdapterProcessRequestInputV1 {
            operation_id: &operation.operation_id,
            authorization_id: &operation.authorization_id,
            idempotency_key: &operation.idempotency_key,
            attempt_sequence: operation.attempt_sequence,
            loaded_profile: input.loaded_profile,
            derived_request: parsed.derived_request(),
        })
        .map_err(|_| DockerLocalSupervisorErrorV1::ProfileBindingInvalid)?;
    if rebuilt.frame() != parsed.frame() {
        return Err(DockerLocalSupervisorErrorV1::ProfileBindingInvalid);
    }

    let docker_identity = validate_executable_v1(
        input.docker_executable,
        &supervisor.docker_executable_digest,
    )
    .map_err(|()| DockerLocalSupervisorErrorV1::DockerExecutableInvalid)?;
    let verifier_identity = validate_executable_v1(
        input.verifier_git_executable,
        &supervisor.verifier_git_executable_digest,
    )
    .map_err(|()| DockerLocalSupervisorErrorV1::VerifierExecutableInvalid)?;
    let endpoint_path = docker_host_path_v1(&supervisor.docker_host)
        .ok_or(DockerLocalSupervisorErrorV1::DockerEndpointInvalid)?;
    let endpoint_identity = validate_endpoint_v1(&endpoint_path)
        .map_err(|()| DockerLocalSupervisorErrorV1::DockerEndpointInvalid)?;

    let repository = validate_phase11_disposable_git_target_v1(
        parsed.derived_request(),
        input.disposable_root,
        input.verifier_git_executable,
        DOCKER_LOCAL_ADAPTER_REF_V1,
    )
    .map_err(|_| DockerLocalSupervisorErrorV1::TargetRejected)?;
    if !safe_mount_source_v1(&repository.repository_path) {
        return Err(DockerLocalSupervisorErrorV1::TargetRejected);
    }

    let docker_config = PrivateDockerConfigV1::create(&operation.operation_id)
        .map_err(|()| DockerLocalSupervisorErrorV1::RuntimeUnavailable)?;
    let container_name = container_name_v1(&operation.operation_id)
        .ok_or(DockerLocalSupervisorErrorV1::InputInvalid)?;
    let args = docker_run_arguments_v1(
        input.loaded_profile,
        &supervisor.docker_host,
        docker_config.path(),
        docker_config.cid_path(),
        &repository.repository_path,
        &container_name,
    )?;
    let cleanup = DockerCleanupV1 {
        docker_executable: input.docker_executable,
        docker_identity: &docker_identity,
        expected_docker_digest: &supervisor.docker_executable_digest,
        endpoint_path: &endpoint_path,
        endpoint_identity: &endpoint_identity,
        docker_host: &supervisor.docker_host,
        docker_config: docker_config.path(),
        cid_path: docker_config.cid_path(),
    };

    let repository_immediately_before_spawn = validate_phase11_disposable_git_target_v1(
        parsed.derived_request(),
        input.disposable_root,
        input.verifier_git_executable,
        DOCKER_LOCAL_ADAPTER_REF_V1,
    )
    .map_err(|_| DockerLocalSupervisorErrorV1::TargetRejected)?;
    let docker_immediately_before_spawn = validate_executable_v1(
        input.docker_executable,
        &supervisor.docker_executable_digest,
    )
    .map_err(|()| DockerLocalSupervisorErrorV1::DockerExecutableInvalid)?;
    let verifier_immediately_before_spawn = validate_executable_v1(
        input.verifier_git_executable,
        &supervisor.verifier_git_executable_digest,
    )
    .map_err(|()| DockerLocalSupervisorErrorV1::VerifierExecutableInvalid)?;
    let endpoint_immediately_before_spawn = validate_endpoint_v1(&endpoint_path)
        .map_err(|()| DockerLocalSupervisorErrorV1::DockerEndpointInvalid)?;
    if repository_immediately_before_spawn != repository {
        return Err(DockerLocalSupervisorErrorV1::TargetRejected);
    }
    if docker_immediately_before_spawn != docker_identity {
        return Err(DockerLocalSupervisorErrorV1::DockerExecutableInvalid);
    }
    if verifier_immediately_before_spawn != verifier_identity {
        return Err(DockerLocalSupervisorErrorV1::VerifierExecutableInvalid);
    }
    if endpoint_immediately_before_spawn != endpoint_identity {
        return Err(DockerLocalSupervisorErrorV1::DockerEndpointInvalid);
    }

    let started = Instant::now();
    let mut command = Command::new(input.docker_executable);
    command
        .env_clear()
        .args(&args)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    let mut child = command
        .spawn()
        .map_err(|_| DockerLocalSupervisorErrorV1::RuntimeUnavailable)?;
    let launched = run_launched_process_v1(
        &mut child,
        parsed.frame(),
        started,
        Duration::from_millis(parsed.control().request().limits.deadline_millis),
        usize::try_from(parsed.control().request().limits.stdout_bytes)
            .unwrap_or(crate::adapter_process_protocol::MAX_DOCKER_LOCAL_ADAPTER_STDOUT_BYTES_V1),
    );
    let elapsed = started.elapsed();

    let Ok(launched) = launched else {
        let _ = child.kill();
        let _ = child.wait();
        best_effort_remove_container_v1(&cleanup);
        return Err(DockerLocalSupervisorErrorV1::OutcomeUnknown);
    };

    let runtime_stable = validate_executable_v1(
        input.docker_executable,
        &supervisor.docker_executable_digest,
    )
    .is_ok_and(|current| current == docker_identity)
        && validate_executable_v1(
            input.verifier_git_executable,
            &supervisor.verifier_git_executable_digest,
        )
        .is_ok_and(|current| current == verifier_identity)
        && validate_endpoint_v1(&endpoint_path).is_ok_and(|current| current == endpoint_identity);
    if !runtime_stable || !launched.status.success() {
        best_effort_remove_container_v1(&cleanup);
        return Err(DockerLocalSupervisorErrorV1::OutcomeUnknown);
    }

    let validated = (|| {
        let protocol_result = validate_docker_local_adapter_process_exchange_v1(
            parsed.control(),
            &launched.stdout,
            &launched.stderr,
            launched.elapsed,
        )
        .map_err(|_| DockerLocalSupervisorErrorV1::OutcomeUnknown)?;
        let semantic_result = inspect_phase11_disposable_git_result_v1(
            parsed.derived_request(),
            input.disposable_root,
            input.verifier_git_executable,
            DOCKER_LOCAL_ADAPTER_REF_V1,
        )
        .map_err(|_| DockerLocalSupervisorErrorV1::OutcomeUnknown)?;
        let adapter_result_digest =
            docker_local_supervised_git_result_digest_v1(&parsed, &semantic_result);
        if protocol_result.result_digest() != adapter_result_digest {
            return Err(DockerLocalSupervisorErrorV1::OutcomeUnknown);
        }
        Ok(DockerLocalSupervisedGitResultV1 {
            semantic_result,
            adapter_result_digest,
            elapsed_millis: u64::try_from(elapsed.as_millis()).unwrap_or(u64::MAX),
        })
    })();
    if validated.is_err() {
        best_effort_remove_container_v1(&cleanup);
    }
    validated
}

/// Computes exact semantic adapter-result identity for later receipt binding.
#[must_use]
pub fn docker_local_supervised_git_result_digest_v1(
    payload: &DockerLocalExecutionPayloadRequestFrameV1,
    result: &Phase7GitExecutionResultV1,
) -> [u8; 32] {
    let paths = result.changed_paths.join("\0");
    let metadata = &result.metadata;
    digest_fields_v1(
        RESULT_DIGEST_DOMAIN_V1,
        &[
            DOCKER_LOCAL_SUPERVISED_RESULT_CONTRACT_ID_V1.as_bytes(),
            &payload.request_digest(),
            &payload.control().request_digest(),
            &payload.tool_arguments_digest(),
            result.commit_oid.as_bytes(),
            result.tree_oid.as_bytes(),
            paths.as_bytes(),
            result.patch_sha256.as_bytes(),
            metadata.message.as_bytes(),
            metadata.author_name.as_bytes(),
            metadata.author_email.as_bytes(),
            metadata.author_time.as_bytes(),
            metadata.committer_name.as_bytes(),
            metadata.committer_email.as_bytes(),
            metadata.committer_time.as_bytes(),
        ],
    )
}

struct LaunchedProcessV1 {
    status: ExitStatus,
    stdout: Zeroizing<Vec<u8>>,
    stderr: Zeroizing<Vec<u8>>,
    elapsed: Duration,
}

fn run_launched_process_v1(
    child: &mut Child,
    stdin: &[u8],
    started: Instant,
    deadline: Duration,
    stdout_limit: usize,
) -> Result<LaunchedProcessV1, ()> {
    run_launched_process_unix_v1(child, stdin, started, deadline, stdout_limit)
}

#[cfg(not(unix))]
fn run_launched_process_unix_v1(
    child: &mut Child,
    stdin: &[u8],
    started: Instant,
    deadline: Duration,
    stdout_limit: usize,
) -> Result<LaunchedProcessV1, ()> {
    let _ = (child, stdin, started, deadline, stdout_limit);
    Err(())
}

#[cfg(unix)]
fn run_launched_process_unix_v1(
    child: &mut Child,
    stdin: &[u8],
    started: Instant,
    deadline: Duration,
    stdout_limit: usize,
) -> Result<LaunchedProcessV1, ()> {
    let mut child_stdin = Some(child.stdin.take().ok_or(())?);
    let mut stdout = child.stdout.take().ok_or(())?;
    let mut stderr = child.stderr.take().ok_or(())?;
    set_nonblocking_v1(child_stdin.as_ref().ok_or(())?)?;
    set_nonblocking_v1(&stdout)?;
    set_nonblocking_v1(&stderr)?;

    let payload = Zeroizing::new(stdin.to_vec());
    let mut written = 0_usize;
    let mut stdout_open = true;
    let mut stderr_open = true;
    let mut retained_stdout = Zeroizing::new(Vec::new());
    let mut retained_stderr = Zeroizing::new(Vec::new());
    let mut status = None;

    loop {
        let elapsed = started.elapsed();
        if elapsed >= deadline {
            let _ = child.kill();
            let _ = child.wait();
            return Err(());
        }

        if let Some(writer) = child_stdin.as_mut() {
            match writer.write(&payload[written..]) {
                Ok(0) => return Err(()),
                Ok(count) => {
                    written = written.checked_add(count).ok_or(())?;
                    if written == payload.len() {
                        child_stdin = None;
                    }
                }
                Err(error) if error.kind() == std::io::ErrorKind::WouldBlock => {}
                Err(error) if error.kind() == std::io::ErrorKind::Interrupted => continue,
                Err(_) => return Err(()),
            }
        }

        if stdout_open {
            stdout_open = !drain_nonblocking_v1(&mut stdout, &mut retained_stdout, stdout_limit)?;
        }
        if stderr_open {
            stderr_open = !drain_nonblocking_v1(
                &mut stderr,
                &mut retained_stderr,
                crate::adapter_process_protocol::MAX_DOCKER_LOCAL_ADAPTER_STDERR_BYTES_V1,
            )?;
        }
        if status.is_none() {
            status = child.try_wait().map_err(|_| ())?;
        }
        if let Some(status) = status
            && !stdout_open
            && !stderr_open
        {
            return Ok(LaunchedProcessV1 {
                status,
                stdout: retained_stdout,
                stderr: retained_stderr,
                elapsed: started.elapsed(),
            });
        }

        std::thread::sleep(
            deadline
                .checked_sub(started.elapsed())
                .unwrap_or_default()
                .min(Duration::from_millis(1)),
        );
    }
}

#[cfg(unix)]
fn set_nonblocking_v1(file: &impl AsFd) -> Result<(), ()> {
    use nix::fcntl::{FcntlArg, OFlag, fcntl};

    let current = fcntl(file, FcntlArg::F_GETFL).map_err(|_| ())?;
    let flags = OFlag::from_bits_truncate(current) | OFlag::O_NONBLOCK;
    fcntl(file, FcntlArg::F_SETFL(flags)).map_err(|_| ())?;
    Ok(())
}

#[cfg(unix)]
fn drain_nonblocking_v1(
    reader: &mut impl Read,
    retained: &mut Zeroizing<Vec<u8>>,
    limit: usize,
) -> Result<bool, ()> {
    let mut buffer = Zeroizing::new([0_u8; 8 * 1024]);
    loop {
        match reader.read(buffer.as_mut()) {
            Ok(0) => return Ok(true),
            Ok(count) => {
                let remaining = limit.saturating_sub(retained.len());
                let retain = remaining.min(count);
                retained.extend_from_slice(&buffer[..retain]);
                if retain != count {
                    return Err(());
                }
            }
            Err(error) if error.kind() == std::io::ErrorKind::WouldBlock => return Ok(false),
            Err(error) if error.kind() == std::io::ErrorKind::Interrupted => {}
            Err(_) => return Err(()),
        }
    }
}

fn wait_for_child_v1(child: &mut Child, deadline: Duration) -> Result<ExitStatus, ()> {
    let started = Instant::now();
    wait_for_child_until_v1(child, started, deadline)
}

fn wait_for_child_until_v1(
    child: &mut Child,
    started: Instant,
    deadline: Duration,
) -> Result<ExitStatus, ()> {
    loop {
        match child.try_wait() {
            Ok(Some(status)) => return Ok(status),
            Ok(None) => {}
            Err(_) => {
                let _ = child.kill();
                let _ = child.wait();
                return Err(());
            }
        }
        let elapsed = started.elapsed();
        if elapsed >= deadline {
            let _ = child.kill();
            let _ = child.wait();
            return Err(());
        }
        std::thread::sleep(
            deadline
                .checked_sub(elapsed)
                .unwrap_or_default()
                .min(Duration::from_millis(5)),
        );
    }
}

fn docker_run_arguments_v1(
    loaded: &LoadedDockerLocalRuntimeProfileV1,
    docker_host: &str,
    docker_config: &Path,
    cid_path: &Path,
    repository: &Path,
    container_name: &str,
) -> Result<Vec<OsString>, DockerLocalSupervisorErrorV1> {
    let profile = loaded.profile();
    let limits = &profile.limits;
    let isolation = &profile.isolation;
    let filesystem = &profile.filesystem;
    let mount = format!(
        "type=bind,source={},target={},rw,bind-propagation=rprivate",
        repository
            .to_str()
            .ok_or(DockerLocalSupervisorErrorV1::TargetRejected)?,
        filesystem.target_mount_path,
    );
    let cpu_quota = u64::from(limits.cpu_millis) * 100;
    Ok(vec![
        "--host".into(),
        docker_host.into(),
        "--config".into(),
        docker_config.as_os_str().to_owned(),
        "run".into(),
        "--interactive".into(),
        "--cidfile".into(),
        cid_path.as_os_str().to_owned(),
        "--pull=never".into(),
        "--rm".into(),
        "--name".into(),
        container_name.into(),
        "--network=none".into(),
        "--ipc=none".into(),
        "--read-only".into(),
        "--log-driver=none".into(),
        format!("--user={}:{}", isolation.run_as_uid, isolation.run_as_gid).into(),
        format!("--workdir={}", filesystem.workdir).into(),
        "--cap-drop=ALL".into(),
        "--security-opt=no-new-privileges:true".into(),
        format!("--pids-limit={}", limits.pids).into(),
        format!("--memory={}", limits.memory_bytes).into(),
        format!("--memory-swap={}", limits.memory_bytes).into(),
        "--cpu-period=100000".into(),
        format!("--cpu-quota={cpu_quota}").into(),
        "--mount".into(),
        mount.into(),
        "--entrypoint".into(),
        profile.entrypoint.clone().into(),
        profile.image_digest.clone().into(),
    ])
}

fn container_name_v1(operation_id: &str) -> Option<String> {
    let suffix = operation_id.strip_prefix("opn_")?;
    if suffix.len() != 64
        || !suffix
            .bytes()
            .all(|byte| byte.is_ascii_digit() || (b'a'..=b'f').contains(&byte))
    {
        return None;
    }
    Some(format!("lnsat-{}", &suffix[..32]))
}

fn docker_host_path_v1(value: &str) -> Option<PathBuf> {
    let raw = value.strip_prefix("unix://")?;
    if !valid_absolute_path_text_v1(raw, 512) {
        return None;
    }
    Some(PathBuf::from(raw))
}

fn safe_mount_source_v1(path: &Path) -> bool {
    path.to_str().is_some_and(|value| {
        valid_absolute_path_text_v1(value, 2_048) && !value.contains(',') && !value.contains('=')
    })
}

fn valid_absolute_path_text_v1(value: &str, max_bytes: usize) -> bool {
    if value.is_empty()
        || value.len() > max_bytes
        || value.as_bytes().contains(&0)
        || value.contains('\\')
        || value.contains("//")
        || (value.len() > 1 && value.ends_with('/'))
        || value.bytes().any(|byte| byte.is_ascii_control())
    {
        return false;
    }
    let path = Path::new(value);
    path.is_absolute()
        && path
            .components()
            .all(|component| matches!(component, Component::RootDir | Component::Normal(_)))
        && path.file_name().is_some()
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
struct FileIdentityV1 {
    device: u64,
    inode: u64,
    uid: u32,
    gid: u32,
    mode: u32,
    size: u64,
}

fn validate_executable_v1(path: &Path, expected_digest: &str) -> Result<FileIdentityV1, ()> {
    #[cfg(not(unix))]
    {
        let _ = (path, expected_digest);
        Err(())
    }
    #[cfg(unix)]
    {
        if !path.is_absolute() || decode_prefixed_sha256_v1(expected_digest).is_none() {
            return Err(());
        }
        let before = fs::symlink_metadata(path).map_err(|_| ())?;
        let canonical = fs::canonicalize(path).map_err(|_| ())?;
        if before.file_type().is_symlink()
            || !before.file_type().is_file()
            || canonical != path
            || before.len() == 0
            || before.len() > MAX_DOCKER_LOCAL_SUPERVISOR_EXECUTABLE_BYTES_V1
            || (before.uid() != 0 && before.nlink() != 1)
            || before.mode() & 0o6_022 != 0
            || before.mode() & 0o111 == 0
            || (before.uid() != 0 && before.uid() != nix::unistd::geteuid().as_raw())
        {
            return Err(());
        }
        let mut file = File::open(path).map_err(|_| ())?;
        let opened = file.metadata().map_err(|_| ())?;
        if file_identity_v1(&before) != file_identity_v1(&opened) {
            return Err(());
        }
        let mut hasher = Sha256::new();
        let mut buffer = [0_u8; 8 * 1024];
        loop {
            let count = file.read(&mut buffer).map_err(|_| ())?;
            if count == 0 {
                break;
            }
            hasher.update(&buffer[..count]);
        }
        buffer.fill(0);
        let digest: [u8; 32] = hasher.finalize().into();
        let after = fs::symlink_metadata(path).map_err(|_| ())?;
        if file_identity_v1(&opened) != file_identity_v1(&after)
            || prefixed_sha256_v1(&digest) != expected_digest
        {
            return Err(());
        }
        Ok(file_identity_v1(&after))
    }
}

fn validate_endpoint_v1(path: &Path) -> Result<FileIdentityV1, ()> {
    #[cfg(not(unix))]
    {
        let _ = path;
        Err(())
    }
    #[cfg(unix)]
    {
        if !path.is_absolute() {
            return Err(());
        }
        let metadata = fs::symlink_metadata(path).map_err(|_| ())?;
        let canonical = fs::canonicalize(path).map_err(|_| ())?;
        if metadata.file_type().is_symlink()
            || !metadata.file_type().is_socket()
            || canonical != path
            || metadata.mode() & 0o002 != 0
            || (metadata.uid() != 0 && metadata.uid() != nix::unistd::geteuid().as_raw())
        {
            return Err(());
        }
        Ok(file_identity_v1(&metadata))
    }
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
    }
}

struct DockerCleanupV1<'a> {
    docker_executable: &'a Path,
    docker_identity: &'a FileIdentityV1,
    expected_docker_digest: &'a str,
    endpoint_path: &'a Path,
    endpoint_identity: &'a FileIdentityV1,
    docker_host: &'a str,
    docker_config: &'a Path,
    cid_path: &'a Path,
}

fn best_effort_remove_container_v1(cleanup: &DockerCleanupV1<'_>) {
    let Some(container_id) = read_container_id_v1(cleanup.cid_path) else {
        return;
    };
    let executable_stable =
        validate_executable_v1(cleanup.docker_executable, cleanup.expected_docker_digest)
            .is_ok_and(|identity| identity == *cleanup.docker_identity);
    let endpoint_stable = validate_endpoint_v1(cleanup.endpoint_path)
        .is_ok_and(|identity| identity == *cleanup.endpoint_identity);
    if !executable_stable || !endpoint_stable {
        return;
    }
    let mut command = Command::new(cleanup.docker_executable);
    command
        .env_clear()
        .arg("--host")
        .arg(cleanup.docker_host)
        .arg("--config")
        .arg(cleanup.docker_config)
        .arg("rm")
        .arg("--force")
        .arg("--volumes")
        .arg(container_id)
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null());
    let Ok(mut child) = command.spawn() else {
        return;
    };
    let _ = wait_for_child_v1(
        &mut child,
        Duration::from_millis(DOCKER_LOCAL_SUPERVISOR_CLEANUP_MILLIS_V1),
    );
}

struct PrivateDockerConfigV1 {
    path: PathBuf,
    config_path: PathBuf,
    cid_path: PathBuf,
}

impl PrivateDockerConfigV1 {
    fn create(operation_id: &str) -> Result<Self, ()> {
        let root = fs::canonicalize(Path::new("/tmp")).map_err(|_| ())?;
        let root_metadata = fs::symlink_metadata(&root).map_err(|_| ())?;
        if !root.is_absolute()
            || !root_metadata.file_type().is_dir()
            || root_metadata.file_type().is_symlink()
            || !safe_temporary_root_v1(&root_metadata)
        {
            return Err(());
        }
        for _ in 0..8 {
            let mut entropy = [0_u8; 32];
            getrandom::getrandom(&mut entropy).map_err(|_| ())?;
            let suffix = prefixed_sha256_v1(&entropy);
            entropy.fill(0);
            let path = root.join(format!(
                "lnsat-docker-config-{}-{}",
                operation_id.strip_prefix("opn_").ok_or(())?,
                &suffix[7..],
            ));
            let mut builder = fs::DirBuilder::new();
            #[cfg(unix)]
            builder.mode(0o700);
            match builder.create(&path) {
                Ok(()) => {
                    let Ok(directory_metadata) = fs::symlink_metadata(&path) else {
                        let _ = fs::remove_dir(&path);
                        return Err(());
                    };
                    let Ok(canonical) = fs::canonicalize(&path) else {
                        let _ = fs::remove_dir(&path);
                        return Err(());
                    };
                    if !safe_private_directory_v1(&directory_metadata)
                        || canonical.parent() != Some(root.as_path())
                    {
                        let _ = fs::remove_dir(&path);
                        return Err(());
                    }
                    let config_path = path.join("config.json");
                    let mut options = OpenOptions::new();
                    options.write(true).create_new(true);
                    #[cfg(unix)]
                    options.mode(0o600);
                    let Ok(mut config) = options.open(&config_path) else {
                        let _ = fs::remove_dir(&path);
                        return Err(());
                    };
                    if config.write_all(b"{}\n").is_err() || config.sync_all().is_err() {
                        let _ = fs::remove_file(&config_path);
                        let _ = fs::remove_dir(&path);
                        return Err(());
                    }
                    let Ok(config_metadata) = config.metadata() else {
                        let _ = fs::remove_file(&config_path);
                        let _ = fs::remove_dir(&path);
                        return Err(());
                    };
                    if !safe_private_file_v1(&config_metadata) {
                        let _ = fs::remove_file(&config_path);
                        let _ = fs::remove_dir(&path);
                        return Err(());
                    }
                    let cid_path = path.join("container.cid");
                    return Ok(Self {
                        path,
                        config_path,
                        cid_path,
                    });
                }
                Err(error) if error.kind() == std::io::ErrorKind::AlreadyExists => {}
                Err(_) => return Err(()),
            }
        }
        Err(())
    }

    fn path(&self) -> &Path {
        &self.path
    }

    fn cid_path(&self) -> &Path {
        &self.cid_path
    }
}

fn read_container_id_v1(path: &Path) -> Option<String> {
    #[cfg(not(unix))]
    {
        let _ = path;
        None
    }
    #[cfg(unix)]
    {
        let before = fs::symlink_metadata(path).ok()?;
        if !before.file_type().is_file()
            || before.file_type().is_symlink()
            || before.uid() != nix::unistd::geteuid().as_raw()
            || before.nlink() != 1
            || before.mode() & 0o022 != 0
            || !(64..=65).contains(&before.len())
        {
            return None;
        }
        let file = File::open(path).ok()?;
        let opened = file.metadata().ok()?;
        if file_identity_v1(&before) != file_identity_v1(&opened) {
            return None;
        }
        let mut value = String::new();
        file.take(66).read_to_string(&mut value).ok()?;
        let after = fs::symlink_metadata(path).ok()?;
        if file_identity_v1(&opened) != file_identity_v1(&after) {
            return None;
        }
        let value = value.strip_suffix('\n').unwrap_or(&value);
        if value.len() != 64
            || !value
                .bytes()
                .all(|byte| byte.is_ascii_digit() || (b'a'..=b'f').contains(&byte))
        {
            return None;
        }
        Some(value.to_owned())
    }
}

fn safe_temporary_root_v1(metadata: &Metadata) -> bool {
    #[cfg(not(unix))]
    {
        let _ = metadata;
        false
    }
    #[cfg(unix)]
    {
        let mode = metadata.mode();
        let owner = metadata.uid();
        let euid = nix::unistd::geteuid().as_raw();
        (owner == euid && mode.trailing_zeros() >= 6)
            || (owner == 0 && mode & 0o1_000 != 0 && mode & 0o022 == 0o022)
    }
}

fn safe_private_directory_v1(metadata: &Metadata) -> bool {
    #[cfg(not(unix))]
    {
        let _ = metadata;
        false
    }
    #[cfg(unix)]
    {
        metadata.file_type().is_dir()
            && !metadata.file_type().is_symlink()
            && metadata.uid() == nix::unistd::geteuid().as_raw()
            && metadata.mode() & 0o777 == 0o700
    }
}

fn safe_private_file_v1(metadata: &Metadata) -> bool {
    #[cfg(not(unix))]
    {
        let _ = metadata;
        false
    }
    #[cfg(unix)]
    {
        metadata.file_type().is_file()
            && !metadata.file_type().is_symlink()
            && metadata.uid() == nix::unistd::geteuid().as_raw()
            && metadata.mode() & 0o777 == 0o600
            && metadata.nlink() == 1
    }
}

impl Drop for PrivateDockerConfigV1 {
    fn drop(&mut self) {
        let _ = fs::remove_file(&self.cid_path);
        let _ = fs::remove_file(&self.config_path);
        let _ = fs::remove_dir(&self.path);
    }
}

fn decode_prefixed_sha256_v1(value: &str) -> Option<[u8; 32]> {
    let hex = value.strip_prefix("sha256:")?;
    if hex.len() != 64
        || !hex
            .bytes()
            .all(|byte| byte.is_ascii_digit() || (b'a'..=b'f').contains(&byte))
    {
        return None;
    }
    let mut output = [0_u8; 32];
    for (index, byte) in output.iter_mut().enumerate() {
        let start = index * 2;
        *byte = u8::from_str_radix(&hex[start..start + 2], 16).ok()?;
    }
    Some(output)
}

fn prefixed_sha256_v1(digest: &[u8; 32]) -> String {
    let mut output = String::with_capacity(71);
    output.push_str("sha256:");
    for byte in digest {
        use std::fmt::Write as _;
        let _ = write!(output, "{byte:02x}");
    }
    output
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
