//! Closed source-only Docker-local adapter process protocol.
//!
//! P11-D3 freezes canonical stdin/stdout framing and exact identity binding for
//! a later adapter process. This module never selects or launches an
//! executable, opens Docker, mounts a repository, dispatches a consequence, or
//! creates a receipt. P11-D4 owns any real Docker execution.

use crate::runtime_profile::{
    DOCKER_LOCAL_ADAPTER_REF_V1, DOCKER_LOCAL_ADAPTER_VERSION_V1, DOCKER_LOCAL_AUDIENCE_V1,
    DOCKER_LOCAL_PROFILE_FAMILY_V1, DOCKER_LOCAL_PROFILE_ID_V1, LoadedDockerLocalRuntimeProfileV1,
    validate_docker_local_authority_binding_v1,
};
use lnsat_contracts::{CONTRACT_VERSION_V1_0, DerivedExecutionRequestV1, is_valid_reference_v1};
use serde::de::{MapAccess, SeqAccess, Visitor};
use serde::{Deserialize, Deserializer, Serialize};
use serde_json::{Map, Number, Value};
use sha2::{Digest, Sha256};
use std::cmp::Ordering;
use std::fmt;
use std::time::Duration;

/// Exact protocol contract for one Docker-local adapter process exchange.
pub const DOCKER_LOCAL_ADAPTER_PROCESS_PROTOCOL_CONTRACT_ID_V1: &str =
    "lnsat.adapter_process_protocol.docker_local.v1";
/// Exact request message type.
pub const DOCKER_LOCAL_ADAPTER_PROCESS_REQUEST_TYPE_V1: &str = "request";
/// Exact result message type.
pub const DOCKER_LOCAL_ADAPTER_PROCESS_RESULT_TYPE_V1: &str = "result";
/// Maximum canonical request frame, including its single trailing LF.
pub const MAX_DOCKER_LOCAL_ADAPTER_STDIN_BYTES_V1: usize = 64 * 1024;
/// Maximum canonical result frame, including its single trailing LF.
pub const MAX_DOCKER_LOCAL_ADAPTER_STDOUT_BYTES_V1: usize = 64 * 1024;
/// Maximum stderr bytes a later supervisor may retain before terminating it.
/// Accepted protocol exchanges require stderr to be empty.
pub const MAX_DOCKER_LOCAL_ADAPTER_STDERR_BYTES_V1: usize = 16 * 1024;
/// Compiled maximum monotonic process deadline.
pub const MAX_DOCKER_LOCAL_ADAPTER_DEADLINE_MILLIS_V1: u64 = 30_000;

const REQUEST_DIGEST_DOMAIN_V1: &[u8] = b"lnsat.docker-local-adapter-process-request.v1";

/// Exact caller-owned operation identities bound into one request frame.
#[derive(Clone, Copy, Debug)]
pub struct DockerLocalAdapterProcessRequestInputV1<'a> {
    pub operation_id: &'a str,
    pub authorization_id: &'a str,
    pub idempotency_key: &'a str,
    pub attempt_sequence: u32,
    pub loaded_profile: &'a LoadedDockerLocalRuntimeProfileV1,
    pub derived_request: &'a DerivedExecutionRequestV1,
}

/// Closed operation and authority identity carried on request and result.
#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct DockerLocalAdapterProcessOperationV1 {
    pub operation_id: String,
    pub execution_request_digest: String,
    pub action_digest: String,
    pub authorization_id: String,
    pub idempotency_key: String,
    pub attempt_sequence: u32,
}

/// Closed runtime identity carried on request and result.
#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct DockerLocalAdapterProcessRuntimeV1 {
    pub profile_id: String,
    pub profile_family: String,
    pub profile_digest: String,
    pub authority_configuration_digest: String,
    pub adapter_ref: String,
    pub adapter_version: String,
    pub adapter_executable_digest: String,
    pub image_digest: String,
    pub audience: String,
}

/// Digest-bound wire limits. Later execution may narrow them, never widen.
#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct DockerLocalAdapterProcessLimitsV1 {
    pub stdin_bytes: u64,
    pub stdout_bytes: u64,
    pub stderr_bytes: u64,
    pub deadline_millis: u64,
}

/// Exact canonical stdin request.
#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct DockerLocalAdapterProcessRequestV1 {
    pub contract_id: String,
    pub contract_version: String,
    pub schema_version: u32,
    pub message_type: String,
    pub operation: DockerLocalAdapterProcessOperationV1,
    pub runtime: DockerLocalAdapterProcessRuntimeV1,
    pub limits: DockerLocalAdapterProcessLimitsV1,
}

/// Canonical request frame plus domain-separated digest evidence.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct DockerLocalAdapterProcessRequestFrameV1 {
    request: DockerLocalAdapterProcessRequestV1,
    canonical_json: String,
    frame: Vec<u8>,
    request_digest: [u8; 32],
}

impl DockerLocalAdapterProcessRequestFrameV1 {
    /// Returns closed request fields. Parsed wire data never grants authority.
    #[must_use]
    pub const fn request(&self) -> &DockerLocalAdapterProcessRequestV1 {
        &self.request
    }

    /// Returns exact canonical JSON without trailing frame delimiter.
    #[must_use]
    pub fn canonical_json(&self) -> &str {
        &self.canonical_json
    }

    /// Returns exact canonical stdin bytes with one trailing LF.
    #[must_use]
    pub fn frame(&self) -> &[u8] {
        &self.frame
    }

    /// Returns domain-separated request digest bytes.
    #[must_use]
    pub const fn request_digest(&self) -> [u8; 32] {
        self.request_digest
    }

    /// Returns stable prefixed request digest text.
    #[must_use]
    pub fn request_digest_text(&self) -> String {
        prefixed_sha256_v1(&self.request_digest)
    }
}

/// Exact result outcome. `OutcomeUnknown` is valid framing but never success.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum DockerLocalAdapterProcessResultOutcomeV1 {
    Completed([u8; 32]),
    OutcomeUnknown,
}

/// Exact canonical stdout result.
#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct DockerLocalAdapterProcessResultV1 {
    pub contract_id: String,
    pub contract_version: String,
    pub schema_version: u32,
    pub message_type: String,
    pub request_digest: String,
    pub operation: DockerLocalAdapterProcessOperationV1,
    pub runtime: DockerLocalAdapterProcessRuntimeV1,
    pub outcome: String,
    pub result_digest: Option<String>,
}

/// Completed result validated against one exact request frame.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ValidatedDockerLocalAdapterProcessResultV1 {
    result: DockerLocalAdapterProcessResultV1,
    result_digest: [u8; 32],
}

impl ValidatedDockerLocalAdapterProcessResultV1 {
    /// Returns exact validated result fields.
    #[must_use]
    pub const fn result(&self) -> &DockerLocalAdapterProcessResultV1 {
        &self.result
    }

    /// Returns decoded adapter-result digest bytes.
    #[must_use]
    pub const fn result_digest(&self) -> [u8; 32] {
        self.result_digest
    }
}

/// Stable secret-free protocol errors. No variant stores paths or source bytes.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum DockerLocalAdapterProcessProtocolErrorV1 {
    InputInvalid,
    AuthorityBindingInvalid,
    RequestTooLarge,
    RequestFramingInvalid,
    RequestInvalid,
    ResultTooLarge,
    ResultFramingInvalid,
    ResultInvalid,
    BindingInvalid,
    StderrTooLarge,
    AdapterRejected,
    OutcomeUnknown,
}

impl DockerLocalAdapterProcessProtocolErrorV1 {
    #[must_use]
    pub const fn code(self) -> &'static str {
        match self {
            Self::InputInvalid => "docker_local_adapter_process.input_invalid",
            Self::AuthorityBindingInvalid => {
                "docker_local_adapter_process.authority_binding_invalid"
            }
            Self::RequestTooLarge => "docker_local_adapter_process.request_too_large",
            Self::RequestFramingInvalid => "docker_local_adapter_process.request_framing_invalid",
            Self::RequestInvalid => "docker_local_adapter_process.request_invalid",
            Self::ResultTooLarge => "docker_local_adapter_process.result_too_large",
            Self::ResultFramingInvalid => "docker_local_adapter_process.result_framing_invalid",
            Self::ResultInvalid => "docker_local_adapter_process.result_invalid",
            Self::BindingInvalid => "docker_local_adapter_process.binding_invalid",
            Self::StderrTooLarge => "docker_local_adapter_process.stderr_too_large",
            Self::AdapterRejected => "docker_local_adapter_process.adapter_rejected",
            Self::OutcomeUnknown => "docker_local_adapter_process.outcome_unknown",
        }
    }
}

impl fmt::Display for DockerLocalAdapterProcessProtocolErrorV1 {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(self.code())
    }
}

impl std::error::Error for DockerLocalAdapterProcessProtocolErrorV1 {}

/// Builds one authority-bound canonical stdin request without launching a process.
///
/// # Errors
///
/// Rejects invalid operation identity, request/profile drift, oversized output,
/// or canonical framing failure.
pub fn build_docker_local_adapter_process_request_v1(
    input: &DockerLocalAdapterProcessRequestInputV1<'_>,
) -> Result<DockerLocalAdapterProcessRequestFrameV1, DockerLocalAdapterProcessProtocolErrorV1> {
    if !valid_prefixed_lower_hex_v1(input.operation_id, "opn_")
        || !valid_prefixed_lower_hex_v1(input.authorization_id, "xau_")
        || !is_valid_reference_v1(input.idempotency_key)
        || input.attempt_sequence != 1
    {
        return Err(DockerLocalAdapterProcessProtocolErrorV1::InputInvalid);
    }
    validate_docker_local_authority_binding_v1(input.loaded_profile, input.derived_request)
        .map_err(|_| DockerLocalAdapterProcessProtocolErrorV1::AuthorityBindingInvalid)?;
    let profile = input.loaded_profile.profile();
    let stdout_bytes = profile
        .limits
        .stdout_bytes
        .min(MAX_DOCKER_LOCAL_ADAPTER_STDOUT_BYTES_V1 as u64);
    let deadline_millis = u64::from(profile.limits.wall_clock_seconds) * 1_000;
    let request = DockerLocalAdapterProcessRequestV1 {
        contract_id: DOCKER_LOCAL_ADAPTER_PROCESS_PROTOCOL_CONTRACT_ID_V1.to_owned(),
        contract_version: CONTRACT_VERSION_V1_0.to_owned(),
        schema_version: 1,
        message_type: DOCKER_LOCAL_ADAPTER_PROCESS_REQUEST_TYPE_V1.to_owned(),
        operation: DockerLocalAdapterProcessOperationV1 {
            operation_id: input.operation_id.to_owned(),
            execution_request_digest: prefixed_sha256_v1(&input.derived_request.request_digest),
            action_digest: prefixed_sha256_v1(&input.derived_request.action_digest),
            authorization_id: input.authorization_id.to_owned(),
            idempotency_key: input.idempotency_key.to_owned(),
            attempt_sequence: input.attempt_sequence,
        },
        runtime: DockerLocalAdapterProcessRuntimeV1 {
            profile_id: profile.profile_id.clone(),
            profile_family: profile.profile_family.clone(),
            profile_digest: input.loaded_profile.profile_digest_text(),
            authority_configuration_digest: input
                .loaded_profile
                .authority_configuration_digest_text(),
            adapter_ref: profile.adapter.adapter_ref.clone(),
            adapter_version: profile.adapter.version.clone(),
            adapter_executable_digest: profile.adapter_executable_digest.clone(),
            image_digest: profile.image_digest.clone(),
            audience: profile.audience.clone(),
        },
        limits: DockerLocalAdapterProcessLimitsV1 {
            stdin_bytes: MAX_DOCKER_LOCAL_ADAPTER_STDIN_BYTES_V1 as u64,
            stdout_bytes,
            stderr_bytes: 0,
            deadline_millis,
        },
    };
    validate_request_v1(&request)?;
    let encoded = encode_request_frame_v1(request)?;
    encode_docker_local_adapter_process_result_frame_v1(
        &encoded,
        DockerLocalAdapterProcessResultOutcomeV1::Completed([0_u8; 32]),
    )?;
    encode_docker_local_adapter_process_result_frame_v1(
        &encoded,
        DockerLocalAdapterProcessResultOutcomeV1::OutcomeUnknown,
    )?;
    Ok(encoded)
}

/// Parses one exact canonical stdin frame without granting authority.
///
/// # Errors
///
/// Rejects oversize, missing/duplicate framing, malformed or duplicate-key
/// JSON, noncanonical bytes, unknown fields, or invalid identities and limits.
pub fn parse_docker_local_adapter_process_request_frame_v1(
    frame: &[u8],
) -> Result<DockerLocalAdapterProcessRequestFrameV1, DockerLocalAdapterProcessProtocolErrorV1> {
    let value = parse_frame_value_v1(
        frame,
        MAX_DOCKER_LOCAL_ADAPTER_STDIN_BYTES_V1,
        DockerLocalAdapterProcessProtocolErrorV1::RequestTooLarge,
        DockerLocalAdapterProcessProtocolErrorV1::RequestFramingInvalid,
        DockerLocalAdapterProcessProtocolErrorV1::RequestInvalid,
    )?;
    let request: DockerLocalAdapterProcessRequestV1 = serde_json::from_value(value)
        .map_err(|_| DockerLocalAdapterProcessProtocolErrorV1::RequestInvalid)?;
    validate_request_v1(&request)?;
    let encoded = encode_request_frame_v1(request)?;
    if encoded.frame != frame {
        return Err(DockerLocalAdapterProcessProtocolErrorV1::RequestInvalid);
    }
    Ok(encoded)
}

/// Encodes one exact canonical stdout result for a parsed request frame.
///
/// This helper creates protocol bytes only. `Completed` does not prove a
/// consequence or create a Gateway receipt.
///
/// # Errors
///
/// Rejects invalid request fields or result-frame overflow.
pub fn encode_docker_local_adapter_process_result_frame_v1(
    request: &DockerLocalAdapterProcessRequestFrameV1,
    outcome: DockerLocalAdapterProcessResultOutcomeV1,
) -> Result<Vec<u8>, DockerLocalAdapterProcessProtocolErrorV1> {
    validate_request_v1(&request.request)?;
    let (outcome, result_digest) = match outcome {
        DockerLocalAdapterProcessResultOutcomeV1::Completed(digest) => {
            ("completed".to_owned(), Some(prefixed_sha256_v1(&digest)))
        }
        DockerLocalAdapterProcessResultOutcomeV1::OutcomeUnknown => {
            ("outcome_unknown".to_owned(), None)
        }
    };
    let result = DockerLocalAdapterProcessResultV1 {
        contract_id: DOCKER_LOCAL_ADAPTER_PROCESS_PROTOCOL_CONTRACT_ID_V1.to_owned(),
        contract_version: CONTRACT_VERSION_V1_0.to_owned(),
        schema_version: 1,
        message_type: DOCKER_LOCAL_ADAPTER_PROCESS_RESULT_TYPE_V1.to_owned(),
        request_digest: request.request_digest_text(),
        operation: request.request.operation.clone(),
        runtime: request.request.runtime.clone(),
        outcome,
        result_digest,
    };
    validate_result_v1(&result)?;
    let canonical = canonical_json_v1(
        &serde_json::to_value(&result)
            .map_err(|_| DockerLocalAdapterProcessProtocolErrorV1::ResultInvalid)?,
    )
    .map_err(|()| DockerLocalAdapterProcessProtocolErrorV1::ResultInvalid)?;
    let mut frame = canonical.into_bytes();
    frame.push(b'\n');
    let limit = usize::try_from(request.request.limits.stdout_bytes)
        .unwrap_or(MAX_DOCKER_LOCAL_ADAPTER_STDOUT_BYTES_V1)
        .min(MAX_DOCKER_LOCAL_ADAPTER_STDOUT_BYTES_V1);
    if frame.len() > limit {
        return Err(DockerLocalAdapterProcessProtocolErrorV1::ResultTooLarge);
    }
    Ok(frame)
}

/// Validates one bounded result observation against one exact request.
///
/// `elapsed >= deadline`, explicit `outcome_unknown`, or untrusted transport
/// state returns `OutcomeUnknown`; it never becomes success or confirmed
/// non-execution.
///
/// # Errors
///
/// Rejects timeout/ambiguity, stderr, malformed or oversized result framing,
/// identity substitution, noncanonical output, and unknown outcomes.
pub fn validate_docker_local_adapter_process_exchange_v1(
    request: &DockerLocalAdapterProcessRequestFrameV1,
    stdout: &[u8],
    stderr: &[u8],
    elapsed: Duration,
) -> Result<ValidatedDockerLocalAdapterProcessResultV1, DockerLocalAdapterProcessProtocolErrorV1> {
    validate_request_v1(&request.request)?;
    let deadline = Duration::from_millis(request.request.limits.deadline_millis);
    if elapsed >= deadline {
        return Err(DockerLocalAdapterProcessProtocolErrorV1::OutcomeUnknown);
    }
    if stderr.len() > MAX_DOCKER_LOCAL_ADAPTER_STDERR_BYTES_V1 {
        return Err(DockerLocalAdapterProcessProtocolErrorV1::StderrTooLarge);
    }
    if !stderr.is_empty() {
        return Err(DockerLocalAdapterProcessProtocolErrorV1::AdapterRejected);
    }
    let stdout_limit = usize::try_from(request.request.limits.stdout_bytes)
        .unwrap_or(MAX_DOCKER_LOCAL_ADAPTER_STDOUT_BYTES_V1)
        .min(MAX_DOCKER_LOCAL_ADAPTER_STDOUT_BYTES_V1);
    let value = parse_frame_value_v1(
        stdout,
        stdout_limit,
        DockerLocalAdapterProcessProtocolErrorV1::ResultTooLarge,
        DockerLocalAdapterProcessProtocolErrorV1::ResultFramingInvalid,
        DockerLocalAdapterProcessProtocolErrorV1::ResultInvalid,
    )?;
    let result: DockerLocalAdapterProcessResultV1 = serde_json::from_value(value)
        .map_err(|_| DockerLocalAdapterProcessProtocolErrorV1::ResultInvalid)?;
    validate_result_v1(&result)?;
    let canonical = canonical_json_v1(
        &serde_json::to_value(&result)
            .map_err(|_| DockerLocalAdapterProcessProtocolErrorV1::ResultInvalid)?,
    )
    .map_err(|()| DockerLocalAdapterProcessProtocolErrorV1::ResultInvalid)?;
    let mut expected_frame = canonical.into_bytes();
    expected_frame.push(b'\n');
    if expected_frame != stdout {
        return Err(DockerLocalAdapterProcessProtocolErrorV1::ResultInvalid);
    }
    if result.request_digest != request.request_digest_text()
        || result.operation != request.request.operation
        || result.runtime != request.request.runtime
    {
        return Err(DockerLocalAdapterProcessProtocolErrorV1::BindingInvalid);
    }
    match result.outcome.as_str() {
        "outcome_unknown" => Err(DockerLocalAdapterProcessProtocolErrorV1::OutcomeUnknown),
        "completed" => {
            let result_digest = result
                .result_digest
                .as_deref()
                .and_then(decode_prefixed_sha256_v1)
                .ok_or(DockerLocalAdapterProcessProtocolErrorV1::ResultInvalid)?;
            Ok(ValidatedDockerLocalAdapterProcessResultV1 {
                result,
                result_digest,
            })
        }
        _ => Err(DockerLocalAdapterProcessProtocolErrorV1::ResultInvalid),
    }
}

fn encode_request_frame_v1(
    request: DockerLocalAdapterProcessRequestV1,
) -> Result<DockerLocalAdapterProcessRequestFrameV1, DockerLocalAdapterProcessProtocolErrorV1> {
    let canonical_json = canonical_json_v1(
        &serde_json::to_value(&request)
            .map_err(|_| DockerLocalAdapterProcessProtocolErrorV1::RequestInvalid)?,
    )
    .map_err(|()| DockerLocalAdapterProcessProtocolErrorV1::RequestInvalid)?;
    let request_digest = digest_fields_v1(REQUEST_DIGEST_DOMAIN_V1, &[canonical_json.as_bytes()]);
    let mut frame = canonical_json.as_bytes().to_vec();
    frame.push(b'\n');
    if frame.len() > MAX_DOCKER_LOCAL_ADAPTER_STDIN_BYTES_V1 {
        return Err(DockerLocalAdapterProcessProtocolErrorV1::RequestTooLarge);
    }
    Ok(DockerLocalAdapterProcessRequestFrameV1 {
        request,
        canonical_json,
        frame,
        request_digest,
    })
}

fn validate_request_v1(
    request: &DockerLocalAdapterProcessRequestV1,
) -> Result<(), DockerLocalAdapterProcessProtocolErrorV1> {
    let valid_deadline = (1_000..=MAX_DOCKER_LOCAL_ADAPTER_DEADLINE_MILLIS_V1)
        .contains(&request.limits.deadline_millis)
        && request.limits.deadline_millis.is_multiple_of(1_000);
    if request.contract_id != DOCKER_LOCAL_ADAPTER_PROCESS_PROTOCOL_CONTRACT_ID_V1
        || request.contract_version != CONTRACT_VERSION_V1_0
        || request.schema_version != 1
        || request.message_type != DOCKER_LOCAL_ADAPTER_PROCESS_REQUEST_TYPE_V1
        || !valid_operation_and_runtime_v1(&request.operation, &request.runtime)
        || request.limits.stdin_bytes != MAX_DOCKER_LOCAL_ADAPTER_STDIN_BYTES_V1 as u64
        || !(1..=MAX_DOCKER_LOCAL_ADAPTER_STDOUT_BYTES_V1 as u64)
            .contains(&request.limits.stdout_bytes)
        || request.limits.stderr_bytes != 0
        || !valid_deadline
    {
        return Err(DockerLocalAdapterProcessProtocolErrorV1::RequestInvalid);
    }
    Ok(())
}

fn validate_result_v1(
    result: &DockerLocalAdapterProcessResultV1,
) -> Result<(), DockerLocalAdapterProcessProtocolErrorV1> {
    let outcome_valid = match result.outcome.as_str() {
        "completed" => result
            .result_digest
            .as_deref()
            .is_some_and(valid_prefixed_sha256_text_v1),
        "outcome_unknown" => result.result_digest.is_none(),
        _ => false,
    };
    if result.contract_id != DOCKER_LOCAL_ADAPTER_PROCESS_PROTOCOL_CONTRACT_ID_V1
        || result.contract_version != CONTRACT_VERSION_V1_0
        || result.schema_version != 1
        || result.message_type != DOCKER_LOCAL_ADAPTER_PROCESS_RESULT_TYPE_V1
        || !valid_prefixed_sha256_text_v1(&result.request_digest)
        || !valid_operation_and_runtime_v1(&result.operation, &result.runtime)
        || !outcome_valid
    {
        return Err(DockerLocalAdapterProcessProtocolErrorV1::ResultInvalid);
    }
    Ok(())
}

fn valid_operation_and_runtime_v1(
    operation: &DockerLocalAdapterProcessOperationV1,
    runtime: &DockerLocalAdapterProcessRuntimeV1,
) -> bool {
    valid_prefixed_lower_hex_v1(&operation.operation_id, "opn_")
        && valid_prefixed_sha256_text_v1(&operation.execution_request_digest)
        && valid_prefixed_sha256_text_v1(&operation.action_digest)
        && valid_prefixed_lower_hex_v1(&operation.authorization_id, "xau_")
        && is_valid_reference_v1(&operation.idempotency_key)
        && operation.attempt_sequence == 1
        && runtime.profile_id == DOCKER_LOCAL_PROFILE_ID_V1
        && runtime.profile_family == DOCKER_LOCAL_PROFILE_FAMILY_V1
        && valid_prefixed_sha256_text_v1(&runtime.profile_digest)
        && valid_prefixed_sha256_text_v1(&runtime.authority_configuration_digest)
        && runtime.adapter_ref == DOCKER_LOCAL_ADAPTER_REF_V1
        && runtime.adapter_version == DOCKER_LOCAL_ADAPTER_VERSION_V1
        && valid_prefixed_sha256_text_v1(&runtime.adapter_executable_digest)
        && valid_prefixed_sha256_text_v1(&runtime.image_digest)
        && runtime.audience == DOCKER_LOCAL_AUDIENCE_V1
}

fn parse_frame_value_v1(
    frame: &[u8],
    limit: usize,
    too_large: DockerLocalAdapterProcessProtocolErrorV1,
    framing: DockerLocalAdapterProcessProtocolErrorV1,
    invalid: DockerLocalAdapterProcessProtocolErrorV1,
) -> Result<Value, DockerLocalAdapterProcessProtocolErrorV1> {
    if frame.len() > limit {
        return Err(too_large);
    }
    let Some(body) = frame.strip_suffix(b"\n") else {
        return Err(framing);
    };
    if body.is_empty() || body.contains(&b'\n') || body.contains(&b'\r') {
        return Err(framing);
    }
    let text = std::str::from_utf8(body).map_err(|_| invalid)?;
    let value: UniqueJsonValueV1 = serde_json::from_str(text).map_err(|_| invalid)?;
    Ok(value.0)
}

fn valid_prefixed_lower_hex_v1(value: &str, prefix: &str) -> bool {
    value.strip_prefix(prefix).is_some_and(|suffix| {
        suffix.len() == 64
            && suffix
                .bytes()
                .all(|byte| byte.is_ascii_digit() || (b'a'..=b'f').contains(&byte))
    })
}

fn valid_prefixed_sha256_text_v1(value: &str) -> bool {
    decode_prefixed_sha256_v1(value).is_some()
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

fn canonical_json_v1(value: &Value) -> Result<String, ()> {
    let mut output = String::new();
    write_canonical_json_v1(value, &mut output)?;
    Ok(output)
}

fn write_canonical_json_v1(value: &Value, output: &mut String) -> Result<(), ()> {
    match value {
        Value::Null => output.push_str("null"),
        Value::Bool(value) => output.push_str(if *value { "true" } else { "false" }),
        Value::Number(value) => {
            if !value.is_u64() && !value.is_i64() {
                return Err(());
            }
            output.push_str(&value.to_string());
        }
        Value::String(value) => output.push_str(&serde_json::to_string(value).map_err(|_| ())?),
        Value::Array(values) => {
            output.push('[');
            for (index, value) in values.iter().enumerate() {
                if index > 0 {
                    output.push(',');
                }
                write_canonical_json_v1(value, output)?;
            }
            output.push(']');
        }
        Value::Object(values) => {
            let mut entries: Vec<_> = values.iter().collect();
            entries.sort_by(|(left, _), (right, _)| utf16_cmp_v1(left, right));
            output.push('{');
            for (index, (key, value)) in entries.into_iter().enumerate() {
                if index > 0 {
                    output.push(',');
                }
                output.push_str(&serde_json::to_string(key).map_err(|_| ())?);
                output.push(':');
                write_canonical_json_v1(value, output)?;
            }
            output.push('}');
        }
    }
    Ok(())
}

fn utf16_cmp_v1(left: &str, right: &str) -> Ordering {
    left.encode_utf16().cmp(right.encode_utf16())
}

struct UniqueJsonValueV1(Value);

impl<'de> Deserialize<'de> for UniqueJsonValueV1 {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        deserializer.deserialize_any(UniqueJsonVisitorV1)
    }
}

struct UniqueJsonVisitorV1;

impl<'de> Visitor<'de> for UniqueJsonVisitorV1 {
    type Value = UniqueJsonValueV1;

    fn expecting(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str("JSON without duplicate object keys")
    }

    fn visit_bool<E>(self, value: bool) -> Result<Self::Value, E> {
        Ok(UniqueJsonValueV1(Value::Bool(value)))
    }

    fn visit_i64<E>(self, value: i64) -> Result<Self::Value, E> {
        Ok(UniqueJsonValueV1(Value::Number(Number::from(value))))
    }

    fn visit_u64<E>(self, value: u64) -> Result<Self::Value, E> {
        Ok(UniqueJsonValueV1(Value::Number(Number::from(value))))
    }

    fn visit_f64<E>(self, _value: f64) -> Result<Self::Value, E>
    where
        E: serde::de::Error,
    {
        Err(E::custom("floating-point JSON is forbidden"))
    }

    fn visit_str<E>(self, value: &str) -> Result<Self::Value, E> {
        Ok(UniqueJsonValueV1(Value::String(value.to_owned())))
    }

    fn visit_string<E>(self, value: String) -> Result<Self::Value, E> {
        Ok(UniqueJsonValueV1(Value::String(value)))
    }

    fn visit_none<E>(self) -> Result<Self::Value, E> {
        Ok(UniqueJsonValueV1(Value::Null))
    }

    fn visit_unit<E>(self) -> Result<Self::Value, E> {
        Ok(UniqueJsonValueV1(Value::Null))
    }

    fn visit_some<D>(self, deserializer: D) -> Result<Self::Value, D::Error>
    where
        D: Deserializer<'de>,
    {
        UniqueJsonValueV1::deserialize(deserializer)
    }

    fn visit_seq<A>(self, mut sequence: A) -> Result<Self::Value, A::Error>
    where
        A: SeqAccess<'de>,
    {
        let mut values = Vec::new();
        while let Some(value) = sequence.next_element::<UniqueJsonValueV1>()? {
            values.push(value.0);
        }
        Ok(UniqueJsonValueV1(Value::Array(values)))
    }

    fn visit_map<A>(self, mut map: A) -> Result<Self::Value, A::Error>
    where
        A: MapAccess<'de>,
    {
        let mut values = Map::new();
        while let Some((key, value)) = map.next_entry::<String, UniqueJsonValueV1>()? {
            if values.contains_key(&key) {
                return Err(serde::de::Error::custom("duplicate JSON key"));
            }
            values.insert(key, value.0);
        }
        Ok(UniqueJsonValueV1(Value::Object(values)))
    }
}
