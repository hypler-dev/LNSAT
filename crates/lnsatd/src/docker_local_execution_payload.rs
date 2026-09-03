//! Closed Docker-local executable-payload binding.
//!
//! P11-D4A wraps the P11-D3 control frame with the exact canonical approved
//! execution request, profile-selected repository mount path, and target and
//! Git tool-argument digests. It closes the payload gap before any Docker
//! process, image, mount, consequence, receipt, served route, or runtime support
//! is opened.

use crate::adapter_process_protocol::{
    DockerLocalAdapterProcessRequestFrameV1, DockerLocalAdapterProcessRequestInputV1,
    DockerLocalAdapterProcessRequestV1, build_docker_local_adapter_process_request_v1,
    canonical_json_value_v1, parse_docker_local_adapter_process_request_frame_v1,
    parse_unique_canonical_frame_value_v1,
};
use crate::runtime_profile::valid_container_path_v1;
use lnsat_contracts::{
    CONTRACT_VERSION_V1_0, DerivedExecutionRequestV1, parse_canonical_execution_request_v1,
};
use lnsat_store::phase7_git_tool_arguments_digest_v1;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sha2::{Digest, Sha256};
use std::fmt;
use zeroize::Zeroizing;

/// Exact executable-payload wrapper contract.
pub const DOCKER_LOCAL_EXECUTION_PAYLOAD_CONTRACT_ID_V1: &str =
    "lnsat.adapter_execution_payload.docker_local.v1";
/// Exact request message type.
pub const DOCKER_LOCAL_EXECUTION_PAYLOAD_REQUEST_TYPE_V1: &str = "execution_request";
/// Maximum canonical payload frame including one trailing LF.
///
/// This safely contains the existing one-MiB UTF-8 patch ceiling after
/// canonical JSON escaping plus bounded target and metadata fields.
pub const MAX_DOCKER_LOCAL_EXECUTION_PAYLOAD_BYTES_V1: usize = 8 * 1024 * 1024;

const PAYLOAD_REQUEST_DIGEST_DOMAIN_V1: &[u8] = b"lnsat.docker-local-execution-payload-request.v1";

#[derive(Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
struct DockerLocalExecutionPayloadWireV1 {
    contract_id: String,
    contract_version: String,
    schema_version: u32,
    message_type: String,
    control: DockerLocalAdapterProcessRequestV1,
    execution_request: Value,
    repository_mount_path: String,
    target_digest: String,
    tool_arguments_digest: String,
}

/// Validated executable payload. Deliberately has no `Debug` implementation:
/// the retained frame contains approved action arguments and source bytes.
pub struct DockerLocalExecutionPayloadRequestFrameV1 {
    control: DockerLocalAdapterProcessRequestFrameV1,
    derived_request: DerivedExecutionRequestV1,
    repository_mount_path: String,
    tool_arguments_digest: [u8; 32],
    frame: Zeroizing<Vec<u8>>,
    request_digest: [u8; 32],
}

impl DockerLocalExecutionPayloadRequestFrameV1 {
    /// Returns exact bounded stdin bytes for a later D4B supervisor.
    #[must_use]
    pub fn frame(&self) -> &[u8] {
        &self.frame
    }

    /// Returns the validated P11-D3 control request.
    #[must_use]
    pub const fn control(&self) -> &DockerLocalAdapterProcessRequestFrameV1 {
        &self.control
    }

    /// Returns the reconstructed canonical approved request.
    #[must_use]
    pub const fn derived_request(&self) -> &DerivedExecutionRequestV1 {
        &self.derived_request
    }

    /// Returns exact profile-bound repository mount path supplied to the adapter.
    #[must_use]
    pub fn repository_mount_path(&self) -> &str {
        &self.repository_mount_path
    }

    /// Returns exact shared Git tool-argument digest.
    #[must_use]
    pub const fn tool_arguments_digest(&self) -> [u8; 32] {
        self.tool_arguments_digest
    }

    /// Returns domain-separated payload-frame digest.
    #[must_use]
    pub const fn request_digest(&self) -> [u8; 32] {
        self.request_digest
    }

    /// Returns stable prefixed payload-frame digest text.
    #[must_use]
    pub fn request_digest_text(&self) -> String {
        prefixed_sha256_v1(&self.request_digest)
    }
}

/// Stable secret-free payload errors. No variant stores source bytes or paths.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum DockerLocalExecutionPayloadErrorV1 {
    InputInvalid,
    ControlInvalid,
    ExecutionRequestInvalid,
    BindingInvalid,
    RequestTooLarge,
    RequestFramingInvalid,
    CanonicalizationFailed,
}

impl DockerLocalExecutionPayloadErrorV1 {
    #[must_use]
    pub const fn code(self) -> &'static str {
        match self {
            Self::InputInvalid => "docker_local_execution_payload.input_invalid",
            Self::ControlInvalid => "docker_local_execution_payload.control_invalid",
            Self::ExecutionRequestInvalid => {
                "docker_local_execution_payload.execution_request_invalid"
            }
            Self::BindingInvalid => "docker_local_execution_payload.binding_invalid",
            Self::RequestTooLarge => "docker_local_execution_payload.request_too_large",
            Self::RequestFramingInvalid => "docker_local_execution_payload.request_framing_invalid",
            Self::CanonicalizationFailed => {
                "docker_local_execution_payload.canonicalization_failed"
            }
        }
    }
}

impl fmt::Display for DockerLocalExecutionPayloadErrorV1 {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(self.code())
    }
}

impl std::error::Error for DockerLocalExecutionPayloadErrorV1 {}

/// Builds one canonical payload-bound request without launching a process.
///
/// # Errors
///
/// Rejects authority drift, malformed Git action/target payloads, digest
/// substitution, or frame overflow.
pub fn build_docker_local_execution_payload_request_v1(
    input: &DockerLocalAdapterProcessRequestInputV1<'_>,
) -> Result<DockerLocalExecutionPayloadRequestFrameV1, DockerLocalExecutionPayloadErrorV1> {
    let control = build_docker_local_adapter_process_request_v1(input)
        .map_err(|_| DockerLocalExecutionPayloadErrorV1::ControlInvalid)?;
    let execution_request: Value =
        serde_json::from_str(&input.derived_request.canonical_request)
            .map_err(|_| DockerLocalExecutionPayloadErrorV1::ExecutionRequestInvalid)?;
    let tool_arguments_digest = phase7_git_tool_arguments_digest_v1(input.derived_request)
        .map_err(|_| DockerLocalExecutionPayloadErrorV1::ExecutionRequestInvalid)?;
    let wire = DockerLocalExecutionPayloadWireV1 {
        contract_id: DOCKER_LOCAL_EXECUTION_PAYLOAD_CONTRACT_ID_V1.to_owned(),
        contract_version: CONTRACT_VERSION_V1_0.to_owned(),
        schema_version: 1,
        message_type: DOCKER_LOCAL_EXECUTION_PAYLOAD_REQUEST_TYPE_V1.to_owned(),
        control: control.request().clone(),
        execution_request,
        repository_mount_path: input
            .loaded_profile
            .profile()
            .filesystem
            .target_mount_path
            .clone(),
        target_digest: prefixed_sha256_v1(&input.derived_request.target_digest),
        tool_arguments_digest: prefixed_sha256_v1(&tool_arguments_digest),
    };
    encode_and_validate_v1(&wire)
}

/// Parses one exact canonical payload frame without granting authority.
///
/// # Errors
///
/// Rejects oversize, malformed, duplicate, noncanonical, unknown-field, or
/// digest-substituted payloads.
pub fn parse_docker_local_execution_payload_request_v1(
    frame: &[u8],
) -> Result<DockerLocalExecutionPayloadRequestFrameV1, DockerLocalExecutionPayloadErrorV1> {
    if frame.len() > MAX_DOCKER_LOCAL_EXECUTION_PAYLOAD_BYTES_V1 {
        return Err(DockerLocalExecutionPayloadErrorV1::RequestTooLarge);
    }
    let value =
        parse_unique_canonical_frame_value_v1(frame, MAX_DOCKER_LOCAL_EXECUTION_PAYLOAD_BYTES_V1)
            .map_err(|()| DockerLocalExecutionPayloadErrorV1::RequestFramingInvalid)?;
    let wire: DockerLocalExecutionPayloadWireV1 = serde_json::from_value(value)
        .map_err(|_| DockerLocalExecutionPayloadErrorV1::InputInvalid)?;
    let parsed = encode_and_validate_v1(&wire)?;
    if parsed.frame.as_slice() != frame {
        return Err(DockerLocalExecutionPayloadErrorV1::RequestFramingInvalid);
    }
    Ok(parsed)
}

fn encode_and_validate_v1(
    wire: &DockerLocalExecutionPayloadWireV1,
) -> Result<DockerLocalExecutionPayloadRequestFrameV1, DockerLocalExecutionPayloadErrorV1> {
    if wire.contract_id != DOCKER_LOCAL_EXECUTION_PAYLOAD_CONTRACT_ID_V1
        || wire.contract_version != CONTRACT_VERSION_V1_0
        || wire.schema_version != 1
        || wire.message_type != DOCKER_LOCAL_EXECUTION_PAYLOAD_REQUEST_TYPE_V1
        || !valid_container_path_v1(&wire.repository_mount_path)
    {
        return Err(DockerLocalExecutionPayloadErrorV1::InputInvalid);
    }

    let control_value = serde_json::to_value(&wire.control)
        .map_err(|_| DockerLocalExecutionPayloadErrorV1::CanonicalizationFailed)?;
    let mut control_frame = canonical_json_value_v1(&control_value)
        .map_err(|()| DockerLocalExecutionPayloadErrorV1::CanonicalizationFailed)?
        .into_bytes();
    control_frame.push(b'\n');
    let control = parse_docker_local_adapter_process_request_frame_v1(&control_frame)
        .map_err(|_| DockerLocalExecutionPayloadErrorV1::ControlInvalid)?;

    let canonical_execution_request = canonical_json_value_v1(&wire.execution_request)
        .map_err(|()| DockerLocalExecutionPayloadErrorV1::ExecutionRequestInvalid)?;
    let derived_request = parse_canonical_execution_request_v1(&canonical_execution_request)
        .map_err(|_| DockerLocalExecutionPayloadErrorV1::ExecutionRequestInvalid)?;
    let tool_arguments_digest = phase7_git_tool_arguments_digest_v1(&derived_request)
        .map_err(|_| DockerLocalExecutionPayloadErrorV1::ExecutionRequestInvalid)?;

    let operation = &control.request().operation;
    let runtime = &control.request().runtime;
    if operation.execution_request_digest != prefixed_sha256_v1(&derived_request.request_digest)
        || operation.action_digest != prefixed_sha256_v1(&derived_request.action_digest)
        || wire.target_digest != prefixed_sha256_v1(&derived_request.target_digest)
        || wire.tool_arguments_digest != prefixed_sha256_v1(&tool_arguments_digest)
        || runtime.authority_configuration_digest
            != prefixed_sha256_v1(&derived_request.configuration_digest)
        || runtime.adapter_executable_digest
            != prefixed_sha256_v1(&derived_request.executable_digest)
        || runtime.adapter_ref != derived_request.request.adapter.adapter_ref
        || runtime.adapter_version != derived_request.request.adapter.version
        || runtime.audience != derived_request.request.audience
    {
        return Err(DockerLocalExecutionPayloadErrorV1::BindingInvalid);
    }

    let value = serde_json::to_value(wire)
        .map_err(|_| DockerLocalExecutionPayloadErrorV1::CanonicalizationFailed)?;
    let mut frame = canonical_json_value_v1(&value)
        .map_err(|()| DockerLocalExecutionPayloadErrorV1::CanonicalizationFailed)?
        .into_bytes();
    frame.push(b'\n');
    if frame.len() > MAX_DOCKER_LOCAL_EXECUTION_PAYLOAD_BYTES_V1 {
        return Err(DockerLocalExecutionPayloadErrorV1::RequestTooLarge);
    }
    let request_digest = digest_fields_v1(PAYLOAD_REQUEST_DIGEST_DOMAIN_V1, &[&frame]);
    Ok(DockerLocalExecutionPayloadRequestFrameV1 {
        control,
        derived_request,
        repository_mount_path: wire.repository_mount_path.clone(),
        tool_arguments_digest,
        frame: Zeroizing::new(frame),
        request_digest,
    })
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
