#![forbid(unsafe_code)]

//! Source-only P11-D4C1 Docker-local Git reference adapter.
//!
//! This binary accepts one canonical D4A payload on stdin and one
//! supervisor-supplied repository mount argument. It never opens Docker,
//! discovers a target, persists a receipt, retries a consequence, or emits
//! diagnostics. Validation or execution failure before result output exits
//! nonzero with empty stdout and stderr. A later output transport failure may
//! leave only a partial invalid frame; the host supervisor preserves
//! `outcome_unknown` in every failure case.

use lnsat_store::{
    execute_phase11_mapped_disposable_git_commit_v1, phase7_git_executable_digest_v1,
};
use lnsatd::adapter_process_protocol::{
    DockerLocalAdapterProcessResultOutcomeV1, encode_docker_local_adapter_process_result_frame_v1,
};
use lnsatd::docker_local_execution_payload::{
    MAX_DOCKER_LOCAL_EXECUTION_PAYLOAD_BYTES_V1, parse_docker_local_execution_payload_request_v1,
};
use lnsatd::docker_local_supervisor::{
    DOCKER_LOCAL_ADAPTER_REPOSITORY_ARGUMENT_V1, docker_local_supervised_git_result_digest_v1,
};
use std::ffi::OsStr;
use std::io::{Read as _, Write as _};
use std::path::{Path, PathBuf};
use std::process::ExitCode;
use zeroize::Zeroizing;

const CONTAINER_GIT_EXECUTABLE_V1: &str = "/usr/bin/git";

fn main() -> ExitCode {
    run().map_or(ExitCode::FAILURE, |()| ExitCode::SUCCESS)
}

fn run() -> Result<(), ()> {
    let repository = repository_argument_v1().ok_or(())?;
    let mut input = Zeroizing::new(Vec::new());
    let limit = u64::try_from(MAX_DOCKER_LOCAL_EXECUTION_PAYLOAD_BYTES_V1)
        .map_err(|_| ())?
        .checked_add(1)
        .ok_or(())?;
    std::io::stdin()
        .lock()
        .take(limit)
        .read_to_end(&mut input)
        .map_err(|_| ())?;
    if input.len() > MAX_DOCKER_LOCAL_EXECUTION_PAYLOAD_BYTES_V1 {
        return Err(());
    }
    let payload = parse_docker_local_execution_payload_request_v1(&input).map_err(|_| ())?;
    if repository.as_os_str() != OsStr::new(payload.repository_mount_path()) {
        return Err(());
    }
    let executable = std::env::current_exe()
        .map_err(|_| ())?
        .canonicalize()
        .map_err(|_| ())?;
    let executable_digest = phase7_git_executable_digest_v1(&executable).map_err(|_| ())?;
    if payload
        .control()
        .request()
        .runtime
        .adapter_executable_digest
        != prefixed_sha256_v1(&executable_digest)
    {
        return Err(());
    }
    let operation_id = &payload.control().request().operation.operation_id;
    let result = execute_phase11_mapped_disposable_git_commit_v1(
        payload.derived_request(),
        &repository,
        Path::new(CONTAINER_GIT_EXECUTABLE_V1),
        operation_id,
    )
    .map_err(|_| ())?;
    let result_digest = docker_local_supervised_git_result_digest_v1(&payload, &result);
    let frame = encode_docker_local_adapter_process_result_frame_v1(
        payload.control(),
        DockerLocalAdapterProcessResultOutcomeV1::Completed(result_digest),
    )
    .map_err(|_| ())?;
    let mut stdout = std::io::stdout().lock();
    stdout.write_all(&frame).map_err(|_| ())?;
    stdout.flush().map_err(|_| ())?;
    Ok(())
}

fn repository_argument_v1() -> Option<PathBuf> {
    let mut arguments = std::env::args_os();
    arguments.next()?;
    if arguments.next()?.as_os_str() != OsStr::new(DOCKER_LOCAL_ADAPTER_REPOSITORY_ARGUMENT_V1) {
        return None;
    }
    let repository = PathBuf::from(arguments.next()?);
    if arguments.next().is_some() {
        return None;
    }
    Some(repository)
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
