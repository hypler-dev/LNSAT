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
use serde::Deserialize;
use sha2::{Digest, Sha256};
use std::collections::BTreeMap;
use std::collections::HashSet;
use std::ffi::{OsStr, OsString};
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
/// Exact contract identity for canonical source-only Docker launch invariants.
pub const DOCKER_LOCAL_LAUNCH_CONTRACT_ID_V1: &str = "lnsat.docker_local_launch_contract.v1";
/// Fixed contract for one bounded Docker daemon identity observation.
pub const DOCKER_LOCAL_DAEMON_IDENTITY_CONTRACT_ID_V1: &str =
    "lnsat.docker_local_daemon_identity.v1";
/// Exact `docker info` security-option marker used to derive rootless posture.
pub const DOCKER_LOCAL_DAEMON_ROOTLESS_SECURITY_OPTION_V1: &str = "name=rootless";
/// Controlled Docker CLI template for a non-secret client/server observation.
///
/// This exact template is itself part of the launch-contract digest. The
/// runtime value is parsed as strict canonical JSON before it is hashed.
pub const DOCKER_LOCAL_DAEMON_VERSION_IDENTITY_FORMAT_V1: &str = r#"{"client_version":{{json .Client.Version}},"client_api_version":{{json .Client.APIVersion}},"server_version":{{json .Server.Version}},"server_api_version":{{json .Server.APIVersion}},"server_min_api_version":{{json .Server.MinAPIVersion}},"server_os":{{json .Server.Os}},"server_architecture":{{json .Server.Arch}},"server_kernel_version":{{json .Server.KernelVersion}},"server_experimental":{{json .Server.Experimental}}}"#;
/// Controlled Docker CLI template for a bounded source-selected daemon observation.
///
/// `Runtimes` may contain host runtime paths or arguments. Its raw value stays
/// internal only long enough for bounded canonical parsing and hashing; it is
/// never logged, returned, or persisted by this source-only supervisor.
pub const DOCKER_LOCAL_DAEMON_IDENTITY_FORMAT_V1: &str = r#"{"id":{{json .ID}},"server_version":{{json .ServerVersion}},"os_type":{{json .OSType}},"architecture":{{json .Architecture}},"kernel_version":{{json .KernelVersion}},"driver":{{json .Driver}},"cgroup_driver":{{json .CgroupDriver}},"cgroup_version":{{json .CgroupVersion}},"security_options":{{json .SecurityOptions}},"default_runtime":{{json .DefaultRuntime}},"runtimes":{{json .Runtimes}}}"#;
/// Sole argument identifying the profile-bound repository mount inside the adapter.
pub const DOCKER_LOCAL_ADAPTER_REPOSITORY_ARGUMENT_V1: &str = "--repository";
/// Maximum host executable accepted for digest verification.
pub const MAX_DOCKER_LOCAL_SUPERVISOR_EXECUTABLE_BYTES_V1: u64 = 512 * 1024 * 1024;
/// Cleanup command deadline after any ambiguous launched exchange.
pub const DOCKER_LOCAL_SUPERVISOR_CLEANUP_MILLIS_V1: u64 = 5_000;

const RESULT_DIGEST_DOMAIN_V1: &[u8] = b"lnsat.docker-local-supervised-git-result.v1";
const LAUNCH_CONTRACT_DIGEST_DOMAIN_V1: &[u8] = b"lnsat.docker-local-launch-contract.v1";
const DAEMON_IDENTITY_DIGEST_DOMAIN_V1: &[u8] = b"lnsat.docker-local-daemon-identity.v1";
const LAUNCH_TEMPLATE_DOCKER_HOST_V1: &str = "{docker_host}";
const LAUNCH_TEMPLATE_DOCKER_CONFIG_V1: &str = "{private_docker_config_path}";
const LAUNCH_TEMPLATE_CID_PATH_V1: &str = "{private_cidfile_path}";
const LAUNCH_TEMPLATE_REPOSITORY_V1: &str = "{disposable_repository_path}";
const LAUNCH_TEMPLATE_CONTAINER_NAME_V1: &str = "{container_name}";
const LAUNCH_TEMPLATE_OPERATION_ID_V1: &str = "{operation_id}";
const LAUNCH_TEMPLATE_DIGEST_V1: &str = "{launch_contract_digest}";
/// Exact Docker label key binding one cleanup to its approved operation.
pub const DOCKER_LOCAL_OPERATION_ID_LABEL_V1: &str = "io.lnsat.phase11.operation-id";
/// Exact Docker label key binding one cleanup to the frozen launch contract.
pub const DOCKER_LOCAL_LAUNCH_CONTRACT_DIGEST_LABEL_V1: &str =
    "io.lnsat.phase11.launch-contract-digest";
const DOCKER_LOCAL_CLEANUP_INSPECT_STDOUT_BYTES_V1: usize = 4 * 1024;
const DOCKER_LOCAL_CLEANUP_REMOVE_STDOUT_BYTES_V1: usize = 256;
const DOCKER_LOCAL_CLEANUP_STDERR_BYTES_V1: usize = 1024;
const DOCKER_LOCAL_DAEMON_IDENTITY_STDOUT_BYTES_V1: usize = 8 * 1024;
const DOCKER_LOCAL_DAEMON_IDENTITY_STDERR_BYTES_V1: usize = 1024;
const DOCKER_LOCAL_OBSERVATION_JSON_MAX_DEPTH_V1: usize = 16;
const DOCKER_LOCAL_OBSERVATION_STRING_BYTES_V1: usize = 1024;

/// Exact process invariants outside argv, bound into every launch digest.
pub const DOCKER_LOCAL_LAUNCH_PROCESS_INVARIANTS_V1: [&str; 6] = [
    "environment=clear",
    "stdin=piped",
    "stdout=piped",
    "stderr=piped",
    "daemon_identity=controlled_version_and_info_json",
    "daemon_identity_revalidation=after_run_before_inspect_before_remove_after_remove",
];

/// Exact inputs for one supervised isolated Docker exchange.
#[derive(Clone, Copy)]
pub struct DockerLocalSupervisorInputV1<'a> {
    pub payload: &'a DockerLocalExecutionPayloadRequestFrameV1,
    pub loaded_profile: &'a LoadedDockerLocalRuntimeProfileV1,
    pub docker_executable: &'a Path,
    pub verifier_git_executable: &'a Path,
    pub disposable_root: &'a Path,
}

/// Receipt-ready semantic result. Separate P11-D4B2A store APIs own persistence;
/// this supervisor never opens storage or writes a receipt.
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

/// Computes opaque, deterministic launch-contract identity without runtime I/O.
///
/// The digest binds one already-loaded schema-2 profile and its supervisor
/// executable identities. It does not expose the Docker host, inspect files,
/// open sockets, create configuration, or launch a process.
///
/// # Errors
///
/// Rejects profiles that are not the exact schema-2 supervisor shape.
pub fn docker_local_launch_contract_digest_v1(
    loaded: &LoadedDockerLocalRuntimeProfileV1,
) -> Result<[u8; 32], DockerLocalSupervisorErrorV1> {
    let profile = loaded.profile();
    let supervisor = loaded
        .supervisor()
        .filter(|_| profile.schema_version == 2)
        .ok_or(DockerLocalSupervisorErrorV1::InputInvalid)?;
    let argv = docker_local_launch_contract_argv_template_v1(loaded)?;
    let process_invariants = DOCKER_LOCAL_LAUNCH_PROCESS_INVARIANTS_V1
        .iter()
        .map(|invariant| invariant.as_bytes())
        .collect::<Vec<_>>();
    let profile_digest = loaded.profile_digest();
    let authority_configuration_digest = loaded.authority_configuration_digest();
    let mut fields = vec![
        DOCKER_LOCAL_LAUNCH_CONTRACT_ID_V1.as_bytes(),
        DOCKER_LOCAL_SUPERVISED_RESULT_CONTRACT_ID_V1.as_bytes(),
        DOCKER_LOCAL_DAEMON_IDENTITY_CONTRACT_ID_V1.as_bytes(),
        DOCKER_LOCAL_DAEMON_VERSION_IDENTITY_FORMAT_V1.as_bytes(),
        DOCKER_LOCAL_DAEMON_IDENTITY_FORMAT_V1.as_bytes(),
        profile.contract_id.as_bytes(),
        profile.contract_version.as_bytes(),
        profile.profile_id.as_bytes(),
        profile.profile_family.as_bytes(),
        &profile_digest,
        &authority_configuration_digest,
        profile.adapter.adapter_ref.as_bytes(),
        profile.adapter.version.as_bytes(),
        profile.adapter_executable_digest.as_bytes(),
        supervisor.docker_executable_digest.as_bytes(),
        supervisor.verifier_git_executable_digest.as_bytes(),
        supervisor.docker_host.as_bytes(),
    ];
    fields.extend(process_invariants);
    fields.extend(argv.iter().map(String::as_bytes));
    Ok(digest_fields_v1(LAUNCH_CONTRACT_DIGEST_DOMAIN_V1, &fields))
}

/// Returns exact normalized argv template hashed by the launch contract.
///
/// Runtime-only endpoint, private-path, repository, and container values use
/// fixed placeholders. All fixed security flags and profile-controlled values
/// come from the same argument builder used by supervised execution.
///
/// # Errors
///
/// Rejects profiles that are not the exact schema-2 supervisor shape.
pub fn docker_local_launch_contract_argv_template_v1(
    loaded: &LoadedDockerLocalRuntimeProfileV1,
) -> Result<Vec<String>, DockerLocalSupervisorErrorV1> {
    if loaded.profile().schema_version != 2 || loaded.supervisor().is_none() {
        return Err(DockerLocalSupervisorErrorV1::InputInvalid);
    }
    docker_run_argument_values_v1(
        loaded,
        &DockerRunArgumentBindingsV1 {
            docker_host: OsStr::new(LAUNCH_TEMPLATE_DOCKER_HOST_V1),
            docker_config: OsStr::new(LAUNCH_TEMPLATE_DOCKER_CONFIG_V1),
            cid_path: OsStr::new(LAUNCH_TEMPLATE_CID_PATH_V1),
            repository: LAUNCH_TEMPLATE_REPOSITORY_V1,
            container_name: OsStr::new(LAUNCH_TEMPLATE_CONTAINER_NAME_V1),
            operation_id: LAUNCH_TEMPLATE_OPERATION_ID_V1,
            launch_contract_digest: LAUNCH_TEMPLATE_DIGEST_V1,
        },
    )
    .into_iter()
    .map(|argument| {
        argument
            .into_string()
            .map_err(|_| DockerLocalSupervisorErrorV1::InputInvalid)
    })
    .collect()
}

/// Runs one exact isolated Docker adapter exchange.
///
/// Every authority, runtime, and target check before `spawn` is read-only; only
/// a private empty client-config file is created. After process creation, any
/// timeout, I/O failure, nonzero exit, output anomaly, runtime identity drift,
/// protocol error, target ambiguity, semantic-digest mismatch, or cleanup
/// binding failure returns only `outcome_unknown`. Cleanup only removes a
/// container after revalidated executable/endpoint and exact CID/name/label
/// binding checks; success also requires that verified cleanup.
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
    let launch_contract_digest = prefixed_sha256_v1(&docker_local_launch_contract_digest_v1(
        input.loaded_profile,
    )?);
    let repository_path = repository
        .repository_path
        .to_str()
        .ok_or(DockerLocalSupervisorErrorV1::TargetRejected)?;
    let args = docker_run_argument_values_v1(
        input.loaded_profile,
        &DockerRunArgumentBindingsV1 {
            docker_host: OsStr::new(&supervisor.docker_host),
            docker_config: docker_config.path().as_os_str(),
            cid_path: docker_config.cid_path().as_os_str(),
            repository: repository_path,
            container_name: OsStr::new(&container_name),
            operation_id: &operation.operation_id,
            launch_contract_digest: &launch_contract_digest,
        },
    );
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
    let daemon_identity_digest = observe_docker_daemon_identity_v1(
        input.docker_executable,
        &supervisor.docker_host,
        docker_config.path(),
        Duration::from_millis(DOCKER_LOCAL_SUPERVISOR_CLEANUP_MILLIS_V1),
    )
    .map_err(|()| DockerLocalSupervisorErrorV1::RuntimeUnavailable)?;
    let docker_after_daemon_observation = validate_executable_v1(
        input.docker_executable,
        &supervisor.docker_executable_digest,
    )
    .map_err(|()| DockerLocalSupervisorErrorV1::DockerExecutableInvalid)?;
    let endpoint_after_daemon_observation = validate_endpoint_v1(&endpoint_path)
        .map_err(|()| DockerLocalSupervisorErrorV1::DockerEndpointInvalid)?;
    if docker_after_daemon_observation != docker_identity {
        return Err(DockerLocalSupervisorErrorV1::DockerExecutableInvalid);
    }
    if endpoint_after_daemon_observation != endpoint_identity {
        return Err(DockerLocalSupervisorErrorV1::DockerEndpointInvalid);
    }
    // Daemon observations run child processes and may consume their full deadline.
    // Bind the verifier again before using it to recheck the mount source.
    let verifier_after_daemon_observation = validate_executable_v1(
        input.verifier_git_executable,
        &supervisor.verifier_git_executable_digest,
    )
    .map_err(|()| DockerLocalSupervisorErrorV1::VerifierExecutableInvalid)?;
    if verifier_after_daemon_observation != verifier_identity {
        return Err(DockerLocalSupervisorErrorV1::VerifierExecutableInvalid);
    }
    let repository_after_daemon_observation = validate_phase11_disposable_git_target_v1(
        parsed.derived_request(),
        input.disposable_root,
        input.verifier_git_executable,
        DOCKER_LOCAL_ADAPTER_REF_V1,
    )
    .map_err(|_| DockerLocalSupervisorErrorV1::TargetRejected)?;
    if repository_after_daemon_observation != repository {
        return Err(DockerLocalSupervisorErrorV1::TargetRejected);
    }
    let cleanup = DockerCleanupV1 {
        docker_executable: input.docker_executable,
        docker_identity: &docker_identity,
        expected_docker_digest: &supervisor.docker_executable_digest,
        endpoint_path: &endpoint_path,
        endpoint_identity: &endpoint_identity,
        docker_host: &supervisor.docker_host,
        docker_config: docker_config.path(),
        cid_path: docker_config.cid_path(),
        container_name: &container_name,
        operation_id: &operation.operation_id,
        launch_contract_digest: &launch_contract_digest,
        daemon_identity_digest,
    };

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
        crate::adapter_process_protocol::MAX_DOCKER_LOCAL_ADAPTER_STDERR_BYTES_V1,
    );
    let elapsed = started.elapsed();

    let Ok(launched) = launched else {
        let _ = child.kill();
        let _ = child.wait();
        let _ = remove_bound_container_v1(&cleanup);
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
        && validate_endpoint_v1(&endpoint_path).is_ok_and(|current| current == endpoint_identity)
        && cleanup_runtime_stable_v1(
            &cleanup,
            Instant::now(),
            Duration::from_millis(DOCKER_LOCAL_SUPERVISOR_CLEANUP_MILLIS_V1),
        )
        .is_ok();
    if !runtime_stable || !launched.status.success() {
        let _ = remove_bound_container_v1(&cleanup);
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
    let cleanup_result = remove_bound_container_v1(&cleanup);
    match (validated, cleanup_result) {
        (Ok(result), Ok(())) => Ok(result),
        _ => Err(DockerLocalSupervisorErrorV1::OutcomeUnknown),
    }
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
    stderr_limit: usize,
) -> Result<LaunchedProcessV1, ()> {
    run_launched_process_unix_v1(child, stdin, started, deadline, stdout_limit, stderr_limit)
}

#[cfg(not(unix))]
fn run_launched_process_unix_v1(
    child: &mut Child,
    stdin: &[u8],
    started: Instant,
    deadline: Duration,
    stdout_limit: usize,
    stderr_limit: usize,
) -> Result<LaunchedProcessV1, ()> {
    let _ = (child, stdin, started, deadline, stdout_limit, stderr_limit);
    Err(())
}

#[cfg(unix)]
fn run_launched_process_unix_v1(
    child: &mut Child,
    stdin: &[u8],
    started: Instant,
    deadline: Duration,
    stdout_limit: usize,
    stderr_limit: usize,
) -> Result<LaunchedProcessV1, ()> {
    let raw_stdin = child.stdin.take().ok_or(())?;
    let mut child_stdin = if stdin.is_empty() {
        None
    } else {
        Some(raw_stdin)
    };
    let mut stdout = child.stdout.take().ok_or(())?;
    let mut stderr = child.stderr.take().ok_or(())?;
    if let Some(writer) = child_stdin.as_ref() {
        set_nonblocking_v1(writer)?;
    }
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
            stderr_open = !drain_nonblocking_v1(&mut stderr, &mut retained_stderr, stderr_limit)?;
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

struct DockerRunArgumentBindingsV1<'a> {
    docker_host: &'a OsStr,
    docker_config: &'a OsStr,
    cid_path: &'a OsStr,
    repository: &'a str,
    container_name: &'a OsStr,
    operation_id: &'a str,
    launch_contract_digest: &'a str,
}

fn docker_run_argument_values_v1(
    loaded: &LoadedDockerLocalRuntimeProfileV1,
    bindings: &DockerRunArgumentBindingsV1<'_>,
) -> Vec<OsString> {
    let profile = loaded.profile();
    let limits = &profile.limits;
    let isolation = &profile.isolation;
    let filesystem = &profile.filesystem;
    let mount = format!(
        "type=bind,source={},target={},rw,bind-propagation=rprivate",
        bindings.repository, filesystem.target_mount_path,
    );
    let cpu_quota = u64::from(limits.cpu_millis) * 100;
    vec![
        "--host".into(),
        bindings.docker_host.to_owned(),
        "--config".into(),
        bindings.docker_config.to_owned(),
        "run".into(),
        "--interactive".into(),
        "--cidfile".into(),
        bindings.cid_path.to_owned(),
        "--pull=never".into(),
        "--label".into(),
        format!(
            "{DOCKER_LOCAL_OPERATION_ID_LABEL_V1}={}",
            bindings.operation_id
        )
        .into(),
        "--label".into(),
        format!(
            "{DOCKER_LOCAL_LAUNCH_CONTRACT_DIGEST_LABEL_V1}={}",
            bindings.launch_contract_digest
        )
        .into(),
        "--name".into(),
        bindings.container_name.to_owned(),
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
        DOCKER_LOCAL_ADAPTER_REPOSITORY_ARGUMENT_V1.into(),
        filesystem.target_mount_path.clone().into(),
    ]
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
    container_name: &'a str,
    operation_id: &'a str,
    launch_contract_digest: &'a str,
    daemon_identity_digest: [u8; 32],
}

#[derive(Deserialize, serde::Serialize)]
#[serde(deny_unknown_fields)]
struct DockerDaemonVersionIdentityV1 {
    client_version: String,
    client_api_version: String,
    server_version: String,
    server_api_version: String,
    server_min_api_version: String,
    server_os: String,
    server_architecture: String,
    server_kernel_version: String,
    server_experimental: bool,
}

#[derive(Deserialize, serde::Serialize)]
#[serde(deny_unknown_fields)]
struct DockerDaemonIdentityV1 {
    id: String,
    server_version: String,
    os_type: String,
    architecture: String,
    kernel_version: String,
    driver: String,
    cgroup_driver: String,
    cgroup_version: String,
    security_options: Vec<String>,
    default_runtime: String,
    runtimes: BTreeMap<String, serde_json::Value>,
}

#[derive(Deserialize, serde::Serialize)]
#[serde(deny_unknown_fields)]
struct DockerCleanupInspectionV1 {
    container_id: String,
    container_name: String,
    operation_id: String,
    launch_contract_digest: String,
}

/// Removes exactly one Docker container only after its private CID and frozen
/// operation/launch labels have been independently re-bound by `docker inspect`.
/// A CID is discovery material, never authorization to remove a container.
fn remove_bound_container_v1(cleanup: &DockerCleanupV1<'_>) -> Result<(), ()> {
    let started = Instant::now();
    let deadline = Duration::from_millis(DOCKER_LOCAL_SUPERVISOR_CLEANUP_MILLIS_V1);
    let container_id = read_container_id_v1(cleanup.cid_path).ok_or(())?;
    cleanup_runtime_stable_v1(cleanup, started, deadline)?;

    let inspect_format = [
        r#"{"container_id":{{json .Id}},"container_name":{{json .Name}},"operation_id":{{json (index .Config.Labels "#,
        DOCKER_LOCAL_OPERATION_ID_LABEL_V1,
        r#"")}},"launch_contract_digest":{{json (index .Config.Labels "#,
        DOCKER_LOCAL_LAUNCH_CONTRACT_DIGEST_LABEL_V1,
        r#"")}}}"#,
    ]
    .concat();
    let inspected = run_cleanup_command_v1(
        cleanup,
        [
            "inspect",
            "--type",
            "container",
            "--format",
            inspect_format.as_str(),
            "--",
            container_id.as_str(),
        ],
        DOCKER_LOCAL_CLEANUP_INSPECT_STDOUT_BYTES_V1,
        cleanup_remaining_deadline_v1(started, deadline)?,
    )?;
    if !inspected.status.success() || !inspected.stderr.is_empty() {
        return Err(());
    }
    if !json_record_precheck_v1(
        &inspected.stdout,
        DOCKER_LOCAL_OBSERVATION_JSON_MAX_DEPTH_V1,
    ) {
        return Err(());
    }
    let inspection: DockerCleanupInspectionV1 =
        serde_json::from_slice(&inspected.stdout).map_err(|_| ())?;
    let canonical = Zeroizing::new(serde_json::to_vec(&inspection).map_err(|_| ())?);
    if !is_exact_canonical_json_line_v1(&inspected.stdout, &canonical)
        || inspection.container_id != container_id
        || inspection.container_name != format!("/{}", cleanup.container_name)
        || inspection.operation_id != cleanup.operation_id
        || inspection.launch_contract_digest != cleanup.launch_contract_digest
    {
        return Err(());
    }

    cleanup_runtime_stable_v1(cleanup, started, deadline)?;
    let removed = run_cleanup_command_v1(
        cleanup,
        ["rm", "--force", "--volumes", "--", container_id.as_str()],
        DOCKER_LOCAL_CLEANUP_REMOVE_STDOUT_BYTES_V1,
        cleanup_remaining_deadline_v1(started, deadline)?,
    )?;
    if !removed.status.success()
        || !removed.stderr.is_empty()
        || removed.stdout.as_slice() != format!("{container_id}\n").as_bytes()
    {
        return Err(());
    }
    cleanup_runtime_stable_v1(cleanup, started, deadline)
}

fn cleanup_runtime_stable_v1(
    cleanup: &DockerCleanupV1<'_>,
    started: Instant,
    deadline: Duration,
) -> Result<(), ()> {
    let executable =
        validate_executable_v1(cleanup.docker_executable, cleanup.expected_docker_digest)?;
    let endpoint = validate_endpoint_v1(cleanup.endpoint_path)?;
    if executable != *cleanup.docker_identity || endpoint != *cleanup.endpoint_identity {
        return Err(());
    }
    if observe_docker_daemon_identity_v1(
        cleanup.docker_executable,
        cleanup.docker_host,
        cleanup.docker_config,
        cleanup_remaining_deadline_v1(started, deadline)?,
    )? != cleanup.daemon_identity_digest
    {
        return Err(());
    }
    let executable_after_observation =
        validate_executable_v1(cleanup.docker_executable, cleanup.expected_docker_digest)?;
    let endpoint_after_observation = validate_endpoint_v1(cleanup.endpoint_path)?;
    if executable_after_observation != *cleanup.docker_identity
        || endpoint_after_observation != *cleanup.endpoint_identity
    {
        return Err(());
    }
    let _ = cleanup_remaining_deadline_v1(started, deadline)?;
    Ok(())
}

fn cleanup_remaining_deadline_v1(started: Instant, deadline: Duration) -> Result<Duration, ()> {
    deadline.checked_sub(started.elapsed()).ok_or(())
}

/// Observes bounded source-selected Docker client/server identity through an
/// environment-cleared, exact-endpoint CLI. Both records must be canonical
/// one-line JSON and are combined into one opaque identity digest; raw output
/// stays internal and is never logged, returned, or persisted.
fn observe_docker_daemon_identity_v1(
    docker_executable: &Path,
    docker_host: &str,
    docker_config: &Path,
    deadline: Duration,
) -> Result<[u8; 32], ()> {
    let started = Instant::now();
    let version = run_docker_command_v1(
        docker_executable,
        docker_host,
        docker_config,
        [
            "version",
            "--format",
            DOCKER_LOCAL_DAEMON_VERSION_IDENTITY_FORMAT_V1,
        ],
        DOCKER_LOCAL_DAEMON_IDENTITY_STDOUT_BYTES_V1,
        DOCKER_LOCAL_DAEMON_IDENTITY_STDERR_BYTES_V1,
        deadline,
    )?;
    let version =
        parse_canonical_docker_daemon_record_v1::<DockerDaemonVersionIdentityV1>(&version)?;
    if !daemon_version_identity_is_bounded_v1(&version) {
        return Err(());
    }
    let remaining = deadline.checked_sub(started.elapsed()).ok_or(())?;
    let info = run_docker_command_v1(
        docker_executable,
        docker_host,
        docker_config,
        ["info", "--format", DOCKER_LOCAL_DAEMON_IDENTITY_FORMAT_V1],
        DOCKER_LOCAL_DAEMON_IDENTITY_STDOUT_BYTES_V1,
        DOCKER_LOCAL_DAEMON_IDENTITY_STDERR_BYTES_V1,
        remaining,
    )?;
    let info = parse_canonical_docker_daemon_record_v1::<DockerDaemonIdentityV1>(&info)?;
    if !daemon_identity_is_bounded_v1(&info) {
        return Err(());
    }
    let rootless_marker = if daemon_identity_is_rootless_v1(&info) {
        "rootless"
    } else {
        "not_rootless"
    };
    let version = Zeroizing::new(serde_json::to_vec(&version).map_err(|_| ())?);
    let info = Zeroizing::new(serde_json::to_vec(&info).map_err(|_| ())?);
    Ok(digest_fields_v1(
        DAEMON_IDENTITY_DIGEST_DOMAIN_V1,
        &[
            DOCKER_LOCAL_DAEMON_IDENTITY_CONTRACT_ID_V1.as_bytes(),
            DOCKER_LOCAL_DAEMON_VERSION_IDENTITY_FORMAT_V1.as_bytes(),
            version.as_slice(),
            DOCKER_LOCAL_DAEMON_IDENTITY_FORMAT_V1.as_bytes(),
            info.as_slice(),
            rootless_marker.as_bytes(),
        ],
    ))
}

fn parse_canonical_docker_daemon_record_v1<T>(launched: &LaunchedProcessV1) -> Result<T, ()>
where
    T: serde::de::DeserializeOwned + serde::Serialize,
{
    if !launched.status.success() || !launched.stderr.is_empty() {
        return Err(());
    }
    if !json_record_precheck_v1(&launched.stdout, DOCKER_LOCAL_OBSERVATION_JSON_MAX_DEPTH_V1) {
        return Err(());
    }
    let record = serde_json::from_slice(&launched.stdout).map_err(|_| ())?;
    let canonical = Zeroizing::new(serde_json::to_vec(&record).map_err(|_| ())?);
    if !is_exact_canonical_json_line_v1(&launched.stdout, &canonical) {
        return Err(());
    }
    Ok(record)
}

fn is_exact_canonical_json_line_v1(raw: &[u8], canonical: &[u8]) -> bool {
    raw.len() == canonical.len().saturating_add(1)
        && raw.starts_with(canonical)
        && raw.last() == Some(&b'\n')
}

fn daemon_version_identity_is_bounded_v1(identity: &DockerDaemonVersionIdentityV1) -> bool {
    [
        &identity.client_version,
        &identity.client_api_version,
        &identity.server_version,
        &identity.server_api_version,
        &identity.server_min_api_version,
        &identity.server_os,
        &identity.server_architecture,
        &identity.server_kernel_version,
    ]
    .into_iter()
    .all(|field| !field.is_empty() && field.len() <= DOCKER_LOCAL_OBSERVATION_STRING_BYTES_V1)
}

fn daemon_identity_is_bounded_v1(identity: &DockerDaemonIdentityV1) -> bool {
    [
        &identity.id,
        &identity.server_version,
        &identity.os_type,
        &identity.architecture,
        &identity.kernel_version,
        &identity.driver,
        &identity.cgroup_driver,
        &identity.cgroup_version,
        &identity.default_runtime,
    ]
    .into_iter()
    .all(|field| !field.is_empty() && field.len() <= DOCKER_LOCAL_OBSERVATION_STRING_BYTES_V1)
        && !identity.security_options.is_empty()
        && identity.security_options.len() <= 32
        && identity.security_options.iter().all(|option| {
            !option.is_empty() && option.len() <= DOCKER_LOCAL_OBSERVATION_STRING_BYTES_V1
        })
        && !identity.runtimes.is_empty()
        && identity.runtimes.len() <= 32
        && identity.runtimes.iter().all(|(name, value)| {
            !name.is_empty()
                && name.len() <= DOCKER_LOCAL_OBSERVATION_STRING_BYTES_V1
                && value.is_object()
                && json_value_is_bounded_v1(value, DOCKER_LOCAL_OBSERVATION_JSON_MAX_DEPTH_V1)
        })
}

fn daemon_identity_is_rootless_v1(identity: &DockerDaemonIdentityV1) -> bool {
    identity
        .security_options
        .iter()
        .any(|option| option == DOCKER_LOCAL_DAEMON_ROOTLESS_SECURITY_OPTION_V1)
}

fn json_value_is_bounded_v1(value: &serde_json::Value, remaining_depth: usize) -> bool {
    if remaining_depth == 0 {
        return false;
    }
    match value {
        serde_json::Value::Null | serde_json::Value::Bool(_) | serde_json::Value::Number(_) => true,
        serde_json::Value::String(value) => value.len() <= DOCKER_LOCAL_OBSERVATION_STRING_BYTES_V1,
        serde_json::Value::Array(values) => {
            values.len() <= 32
                && values
                    .iter()
                    .all(|value| json_value_is_bounded_v1(value, remaining_depth - 1))
        }
        serde_json::Value::Object(values) => {
            values.len() <= 32
                && values.iter().all(|(key, value)| {
                    key.len() <= DOCKER_LOCAL_OBSERVATION_STRING_BYTES_V1
                        && json_value_is_bounded_v1(value, remaining_depth - 1)
                })
        }
    }
}

/// Rejects oversized nesting and every duplicate object member before serde
/// sees a record. Contract member names are ASCII, so escaped keys are denied
/// fail-closed rather than risking equivalent Unicode escape aliases.
fn json_record_precheck_v1(bytes: &[u8], maximum_depth: usize) -> bool {
    let mut scanner = JsonRecordPrecheckV1 { bytes, offset: 0 };
    scanner.skip_whitespace();
    scanner.parse_value(maximum_depth) && {
        scanner.skip_whitespace();
        scanner.offset == bytes.len()
    }
}

struct JsonRecordPrecheckV1<'a> {
    bytes: &'a [u8],
    offset: usize,
}

impl JsonRecordPrecheckV1<'_> {
    fn skip_whitespace(&mut self) {
        while self
            .bytes
            .get(self.offset)
            .is_some_and(u8::is_ascii_whitespace)
        {
            self.offset += 1;
        }
    }

    fn parse_value(&mut self, remaining_depth: usize) -> bool {
        if remaining_depth == 0 {
            return false;
        }
        self.skip_whitespace();
        match self.bytes.get(self.offset) {
            Some(b'{') => self.parse_object(remaining_depth - 1),
            Some(b'[') => self.parse_array(remaining_depth - 1),
            Some(b'"') => self.parse_string(false).is_some(),
            Some(b't') => self.consume_literal(b"true"),
            Some(b'f') => self.consume_literal(b"false"),
            Some(b'n') => self.consume_literal(b"null"),
            Some(b'-' | b'0'..=b'9') => self.parse_number(),
            _ => false,
        }
    }

    fn parse_object(&mut self, remaining_depth: usize) -> bool {
        self.offset += 1;
        self.skip_whitespace();
        let mut members = HashSet::new();
        if self.consume_byte(b'}') {
            return true;
        }
        loop {
            let Some(member) = self.parse_string(true) else {
                return false;
            };
            if !members.insert(member) {
                return false;
            }
            self.skip_whitespace();
            if !self.consume_byte(b':') || !self.parse_value(remaining_depth) {
                return false;
            }
            self.skip_whitespace();
            if self.consume_byte(b'}') {
                return true;
            }
            if !self.consume_byte(b',') {
                return false;
            }
            self.skip_whitespace();
        }
    }

    fn parse_array(&mut self, remaining_depth: usize) -> bool {
        self.offset += 1;
        self.skip_whitespace();
        if self.consume_byte(b']') {
            return true;
        }
        loop {
            if !self.parse_value(remaining_depth) {
                return false;
            }
            self.skip_whitespace();
            if self.consume_byte(b']') {
                return true;
            }
            if !self.consume_byte(b',') {
                return false;
            }
            self.skip_whitespace();
        }
    }

    fn parse_string(&mut self, reject_escape: bool) -> Option<Vec<u8>> {
        if !self.consume_byte(b'"') {
            return None;
        }
        let mut value = Vec::new();
        loop {
            let byte = *self.bytes.get(self.offset)?;
            self.offset += 1;
            match byte {
                b'"' => return Some(value),
                b'\\' => {
                    if reject_escape {
                        return None;
                    }
                    let escaped = *self.bytes.get(self.offset)?;
                    self.offset += 1;
                    match escaped {
                        b'"' | b'\\' | b'/' | b'b' | b'f' | b'n' | b'r' | b't' => {
                            value.push(escaped);
                        }
                        b'u' => {
                            for _ in 0..4 {
                                let digit = *self.bytes.get(self.offset)?;
                                if !digit.is_ascii_hexdigit() {
                                    return None;
                                }
                                self.offset += 1;
                            }
                        }
                        _ => return None,
                    }
                }
                0..=0x1f => return None,
                _ => value.push(byte),
            }
        }
    }

    fn parse_number(&mut self) -> bool {
        let start = self.offset;
        while self
            .bytes
            .get(self.offset)
            .is_some_and(|byte| matches!(*byte, b'-' | b'+' | b'.' | b'e' | b'E' | b'0'..=b'9'))
        {
            self.offset += 1;
        }
        self.offset > start
    }

    fn consume_literal(&mut self, literal: &[u8]) -> bool {
        let Some(candidate) = self.bytes.get(self.offset..self.offset + literal.len()) else {
            return false;
        };
        if candidate != literal {
            return false;
        }
        self.offset += literal.len();
        true
    }

    fn consume_byte(&mut self, expected: u8) -> bool {
        if self.bytes.get(self.offset) != Some(&expected) {
            return false;
        }
        self.offset += 1;
        true
    }
}

fn run_cleanup_command_v1<'a, I>(
    cleanup: &DockerCleanupV1<'_>,
    arguments: I,
    stdout_limit: usize,
    deadline: Duration,
) -> Result<LaunchedProcessV1, ()>
where
    I: IntoIterator<Item = &'a str>,
{
    run_docker_command_v1(
        cleanup.docker_executable,
        cleanup.docker_host,
        cleanup.docker_config,
        arguments,
        stdout_limit,
        DOCKER_LOCAL_CLEANUP_STDERR_BYTES_V1,
        deadline,
    )
}

fn run_docker_command_v1<'a, I>(
    docker_executable: &Path,
    docker_host: &str,
    docker_config: &Path,
    arguments: I,
    stdout_limit: usize,
    stderr_limit: usize,
    deadline: Duration,
) -> Result<LaunchedProcessV1, ()>
where
    I: IntoIterator<Item = &'a str>,
{
    let mut command = Command::new(docker_executable);
    command
        .env_clear()
        .arg("--host")
        .arg(docker_host)
        .arg("--config")
        .arg(docker_config)
        .args(arguments)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    let mut child = command.spawn().map_err(|_| ())?;
    let launched = run_launched_process_v1(
        &mut child,
        &[],
        Instant::now(),
        deadline,
        stdout_limit,
        stderr_limit,
    );
    if launched.is_err() {
        let _ = child.kill();
        let _ = child.wait();
    }
    launched
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

#[cfg(all(test, unix))]
mod launch_argument_tests_v1 {
    use super::*;
    use crate::runtime_profile::parse_docker_local_runtime_profile_v1;
    use serde_json::{Value, json};
    use std::os::unix::ffi::OsStringExt as _;

    const PROFILE_FIXTURE: &[u8] =
        include_bytes!("../../../fixtures/contracts/phase11-docker-local-profile-v1.json");

    #[test]
    fn runtime_argv_preserves_non_utf8_private_paths() {
        let mut value: Value =
            serde_json::from_slice(PROFILE_FIXTURE).expect("profile fixture JSON");
        value["schema_version"] = json!(2);
        value["supervisor"] = json!({
            "docker_executable_digest": format!("sha256:{}", "c".repeat(64)),
            "verifier_git_executable_digest": format!("sha256:{}", "d".repeat(64)),
            "docker_host": "unix:///private/tmp/lnsat-runtime-proof.sock",
        });
        let loaded = parse_docker_local_runtime_profile_v1(
            &serde_json::to_vec(&value).expect("profile bytes"),
        )
        .expect("schema2 profile");
        let docker_config = OsString::from_vec(b"/private/tmp/config-\x80".to_vec());
        let cid_path = OsString::from_vec(b"/private/tmp/cid-\x81".to_vec());
        let args = docker_run_argument_values_v1(
            &loaded,
            &DockerRunArgumentBindingsV1 {
                docker_host: OsStr::new("unix:///private/tmp/lnsat-runtime-proof.sock"),
                docker_config: &docker_config,
                cid_path: &cid_path,
                repository: "/private/tmp/disposable-repository",
                container_name: OsStr::new("lnsat-test-container"),
                operation_id: "opn_placeholder",
                launch_contract_digest: "sha256:placeholder",
            },
        );

        assert_eq!(args[3], docker_config);
        assert_eq!(args[7], cid_path);
    }
}
