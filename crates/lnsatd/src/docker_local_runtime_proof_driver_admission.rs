//! Private source-only structural binding for a later Phase 11 proof driver.
//!
//! This evaluator binds one validated run manifest to fields in a caller-supplied
//! D4B2A claim snapshot, its D3/D4A payload, and the exact supervisor launch
//! identity. It neither authenticates that snapshot nor proves current durable
//! store state, and its output is never launch permission. It performs no store
//! write, route handling, filesystem access, process launch, Docker access,
//! receipt creation, or evidence persistence.

use crate::adapter_process_protocol::{
    DOCKER_LOCAL_ADAPTER_PROCESS_PROTOCOL_CONTRACT_ID_V1, MAX_DOCKER_LOCAL_ADAPTER_STDIN_BYTES_V1,
    MAX_DOCKER_LOCAL_ADAPTER_STDOUT_BYTES_V1, canonical_json_value_v1,
};
use crate::docker_local_execution_payload::DockerLocalExecutionPayloadRequestFrameV1;
use crate::docker_local_runtime_proof_run_manifest::DockerLocalRuntimeProofRunManifestOutputV1;
use crate::docker_local_supervisor::docker_local_launch_contract_digest_v1;
use crate::runtime_profile::LoadedDockerLocalRuntimeProfileV1;
use lnsat_contracts::CONTRACT_VERSION_V1_0;
use lnsat_store::{
    PHASE11_DOCKER_GIT_ADAPTER_REF_V1, PHASE11_DOCKER_GIT_ADAPTER_VERSION_V1,
    Phase11DockerRuntimeCompositionClaimV1,
};
use serde::Serialize;
use sha2::{Digest, Sha256};
use std::fmt::{self, Write as _};

/// Exact private proof-driver admission contract.
pub const DOCKER_LOCAL_RUNTIME_PROOF_DRIVER_ADMISSION_CONTRACT_ID_V1: &str =
    "lnsat.docker_local_runtime_proof_driver_admission.v1";
/// Closed source-only status emitted after every structural binding passes.
pub const DOCKER_LOCAL_RUNTIME_PROOF_DRIVER_ADMISSION_STATUS_V1: &str =
    "structural_binding_only_private_source_only";
/// Next gate remains separately authorized real Docker proof execution.
pub const DOCKER_LOCAL_RUNTIME_PROOF_DRIVER_ADMISSION_NEXT_GATE_V1: &str =
    "separately_authorized_real_disposable_docker_proof";
/// Live checks a later runnable driver must complete after this structural seam.
pub const DOCKER_LOCAL_RUNTIME_PROOF_DRIVER_REQUIRED_RUNTIME_GATE_CHECKS_V1: [&str; 6] = [
    "authenticate_created_claim_result",
    "re_read_bound_consumption_operation_attempt_from_durable_store_immediately_before_process_creation",
    "operation_dispatching_immediately_before_process_creation",
    "attempt_dispatching_immediately_before_process_creation",
    "receipt_absent_immediately_before_process_creation",
    "reconciliation_absent_immediately_before_process_creation",
];

const DRIVER_ADMISSION_DIGEST_DOMAIN_V1: &[u8] =
    b"lnsat.docker-local-runtime-proof-driver-admission.v1";

/// Typed inputs for structural evaluation.
///
/// The claim remains a caller-supplied snapshot. This type carries no proof of
/// authenticated store provenance or durable freshness.
pub struct DockerLocalRuntimeProofDriverAdmissionInputV1<'a> {
    pub run_manifest: &'a DockerLocalRuntimeProofRunManifestOutputV1,
    pub claim: &'a Phase11DockerRuntimeCompositionClaimV1,
    pub payload: &'a DockerLocalExecutionPayloadRequestFrameV1,
    pub loaded_profile: &'a LoadedDockerLocalRuntimeProfileV1,
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize)]
pub struct DockerLocalRuntimeProofDriverAdmissionContractV1 {
    pub contract_id: String,
    pub output: String,
    pub side_effects: Vec<String>,
    pub runtime_execution: bool,
    pub proves_human_authority: bool,
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize)]
pub struct DockerLocalRuntimeProofDriverClaimBindingV1 {
    pub consumption_id: String,
    pub operation_id: String,
    pub operation_attempt_id: String,
    pub authorization_id: String,
    pub idempotency_key: String,
    pub operation_state: String,
    pub attempt_state: String,
    pub attempt_sequence: u32,
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize)]
pub struct DockerLocalRuntimeProofDriverRequestBindingV1 {
    pub payload_digest: String,
    pub control_digest: String,
    pub execution_request_digest: String,
    pub action_digest: String,
    pub target_digest: String,
    pub tool_arguments_digest: String,
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize)]
pub struct DockerLocalRuntimeProofDriverRuntimeBindingV1 {
    pub profile_digest: String,
    pub authority_configuration_digest: String,
    pub adapter_ref: String,
    pub adapter_version: String,
    pub adapter_executable_digest: String,
    pub image_digest: String,
    pub launch_contract_digest: String,
}

/// Canonical private admission record. It is binding evidence, not authority or
/// runtime evidence.
#[derive(Clone, Debug, Eq, PartialEq, Serialize)]
#[allow(clippy::struct_excessive_bools)]
pub struct DockerLocalRuntimeProofDriverAdmissionV1 {
    pub contract_version: String,
    pub schema_version: u32,
    pub status: String,
    pub phase11_complete: bool,
    pub execution_authorized: bool,
    pub claim_snapshot_authenticated: bool,
    pub durable_claim_state_revalidated: bool,
    pub launch_permission_granted: bool,
    pub runtime_launch_performed: bool,
    pub real_docker_proof: bool,
    pub receipt_persisted: bool,
    pub production_supported: bool,
    pub contract: DockerLocalRuntimeProofDriverAdmissionContractV1,
    pub run_manifest_digest: String,
    pub source_revision: String,
    pub proof_driver_executable_digest: String,
    pub claim: DockerLocalRuntimeProofDriverClaimBindingV1,
    pub request: DockerLocalRuntimeProofDriverRequestBindingV1,
    pub runtime: DockerLocalRuntimeProofDriverRuntimeBindingV1,
    pub required_runtime_gate_checks: Vec<String>,
    pub next_gate: String,
}

/// Canonical private admission plus its domain-separated digest.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct DockerLocalRuntimeProofDriverAdmissionOutputV1 {
    admission: DockerLocalRuntimeProofDriverAdmissionV1,
    canonical_json: String,
    digest: [u8; 32],
}

impl DockerLocalRuntimeProofDriverAdmissionOutputV1 {
    #[must_use]
    pub const fn admission(&self) -> &DockerLocalRuntimeProofDriverAdmissionV1 {
        &self.admission
    }

    #[must_use]
    pub fn canonical_json(&self) -> &str {
        &self.canonical_json
    }

    #[must_use]
    pub const fn digest(&self) -> [u8; 32] {
        self.digest
    }

    #[must_use]
    pub fn digest_text(&self) -> String {
        prefixed_sha256_v1(&self.digest)
    }
}

/// Stable, secret-free admission failures.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum DockerLocalRuntimeProofDriverAdmissionErrorV1 {
    ManifestBindingInvalid,
    ReplayRejected,
    ClaimBindingInvalid,
    AttemptStateInvalid,
    PayloadBindingInvalid,
    RuntimeBindingInvalid,
    LaunchBindingInvalid,
    CanonicalizationFailed,
}

impl DockerLocalRuntimeProofDriverAdmissionErrorV1 {
    #[must_use]
    pub const fn code(self) -> &'static str {
        match self {
            Self::ManifestBindingInvalid => {
                "docker_local_runtime_proof_driver_admission.manifest_binding_invalid"
            }
            Self::ReplayRejected => "docker_local_runtime_proof_driver_admission.replay_rejected",
            Self::ClaimBindingInvalid => {
                "docker_local_runtime_proof_driver_admission.claim_binding_invalid"
            }
            Self::AttemptStateInvalid => {
                "docker_local_runtime_proof_driver_admission.attempt_state_invalid"
            }
            Self::PayloadBindingInvalid => {
                "docker_local_runtime_proof_driver_admission.payload_binding_invalid"
            }
            Self::RuntimeBindingInvalid => {
                "docker_local_runtime_proof_driver_admission.runtime_binding_invalid"
            }
            Self::LaunchBindingInvalid => {
                "docker_local_runtime_proof_driver_admission.launch_binding_invalid"
            }
            Self::CanonicalizationFailed => {
                "docker_local_runtime_proof_driver_admission.canonicalization_failed"
            }
        }
    }
}

impl fmt::Display for DockerLocalRuntimeProofDriverAdmissionErrorV1 {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(self.code())
    }
}

impl std::error::Error for DockerLocalRuntimeProofDriverAdmissionErrorV1 {}

/// Structurally checks one claim/payload/manifest/launch binding without runtime I/O.
///
/// Only a snapshot whose fields describe a newly created, still-dispatching
/// D4B2A claim can pass. Metadata replay, completed or ambiguous state,
/// receipt/reconciliation presence, or identity substitution fails closed.
/// Passing never authenticates the snapshot, proves current durable state, or
/// grants launch permission. A later runnable driver must authenticate and
/// re-read the exact bound consumption, operation, and attempt from the durable
/// store immediately before process creation, then revalidate created,
/// dispatching, no-receipt, and no-reconciliation state.
///
/// # Errors
///
/// Returns a stable error for replay, state drift, cross-boundary substitution,
/// launch identity drift, or canonicalization failure.
#[allow(clippy::too_many_lines)] // Exact cross-boundary checks stay together for fail-closed review.
pub fn admit_docker_local_runtime_proof_driver_v1(
    input: &DockerLocalRuntimeProofDriverAdmissionInputV1<'_>,
) -> Result<
    DockerLocalRuntimeProofDriverAdmissionOutputV1,
    DockerLocalRuntimeProofDriverAdmissionErrorV1,
> {
    let manifest = input.run_manifest.manifest();
    if manifest.phase11_complete
        || manifest.execution_authorized
        || manifest.real_docker_proof
        || manifest.production_supported
        || !manifest.contract.side_effects.is_empty()
        || manifest.contract.runtime_execution
        || manifest.contract.proves_human_authority
    {
        return Err(DockerLocalRuntimeProofDriverAdmissionErrorV1::ManifestBindingInvalid);
    }
    if !input.claim.created {
        return Err(DockerLocalRuntimeProofDriverAdmissionErrorV1::ReplayRejected);
    }

    let consumption = &input.claim.consumption;
    let operation = &input.claim.operation;
    let Some(attempt) = operation.attempt.as_ref() else {
        return Err(DockerLocalRuntimeProofDriverAdmissionErrorV1::AttemptStateInvalid);
    };
    if operation.state != "dispatching"
        || operation.state_sequence != 2
        || attempt.state != "dispatching"
        || attempt.attempt_sequence != 1
        || attempt.state_sequence != 1
        || operation.receipt_id.is_some()
        || operation.receipt_received_at.is_some()
        || operation.reconciliation_id.is_some()
        || operation.reconciliation_status.is_some()
        || operation.reconciliation_recorded_at.is_some()
    {
        return Err(DockerLocalRuntimeProofDriverAdmissionErrorV1::AttemptStateInvalid);
    }

    let control = input.payload.control();
    let control_request = control.request();
    let derived = input.payload.derived_request();
    let expected_attempt_adapter =
        format!("{PHASE11_DOCKER_GIT_ADAPTER_REF_V1}@{PHASE11_DOCKER_GIT_ADAPTER_VERSION_V1}");
    if operation.consumption_id.as_deref() != Some(consumption.consumption_id.as_str())
        || consumption.operation_id != operation.operation_id
        || consumption.authorization_id != operation.authorization_id
        || consumption.project_ref != operation.project_ref
        || consumption.resource_ref != operation.resource_ref
        || consumption.operation_id != control_request.operation.operation_id
        || consumption.authorization_id != control_request.operation.authorization_id
        || consumption.idempotency_key != control_request.operation.idempotency_key
        || consumption.request_digest != derived.request_digest
        || operation.project_ref != derived.request.project_ref
        || operation.resource_ref != derived.request.resource_ref
        || attempt.operation_id != operation.operation_id
        || attempt.project_ref != operation.project_ref
        || attempt.resource_ref != operation.resource_ref
        || attempt.attempt_sequence != control_request.operation.attempt_sequence
        || attempt.adapter_ref != expected_attempt_adapter
        || attempt.protocol_version != DOCKER_LOCAL_ADAPTER_PROCESS_PROTOCOL_CONTRACT_ID_V1
        || attempt.tool_arguments_digest != input.payload.tool_arguments_digest()
    {
        return Err(DockerLocalRuntimeProofDriverAdmissionErrorV1::ClaimBindingInvalid);
    }

    if control_request.operation.execution_request_digest
        != prefixed_sha256_v1(&derived.request_digest)
        || control_request.operation.action_digest != prefixed_sha256_v1(&derived.action_digest)
        || input.payload.repository_mount_path()
            != input.loaded_profile.profile().filesystem.target_mount_path
        || control_request.limits.stdin_bytes != MAX_DOCKER_LOCAL_ADAPTER_STDIN_BYTES_V1 as u64
        || control_request.limits.stdout_bytes
            != input
                .loaded_profile
                .profile()
                .limits
                .stdout_bytes
                .min(MAX_DOCKER_LOCAL_ADAPTER_STDOUT_BYTES_V1 as u64)
        || control_request.limits.stderr_bytes != 0
        || control_request.limits.deadline_millis
            != u64::from(input.loaded_profile.profile().limits.wall_clock_seconds) * 1_000
    {
        return Err(DockerLocalRuntimeProofDriverAdmissionErrorV1::PayloadBindingInvalid);
    }

    let profile = input.loaded_profile.profile();
    let runtime = &control_request.runtime;
    let bindings = &manifest.bindings;
    let profile_digest = input.loaded_profile.profile_digest_text();
    let authority_configuration_digest = input.loaded_profile.authority_configuration_digest_text();
    if runtime.profile_id != profile.profile_id
        || runtime.profile_family != profile.profile_family
        || runtime.profile_digest != profile_digest
        || runtime.authority_configuration_digest != authority_configuration_digest
        || runtime.adapter_ref != profile.adapter.adapter_ref
        || runtime.adapter_version != profile.adapter.version
        || runtime.adapter_executable_digest != profile.adapter_executable_digest
        || runtime.image_digest != profile.image_digest
        || runtime.audience != profile.audience
        || bindings.profile_digest != runtime.profile_digest
        || bindings.authority_configuration_digest != runtime.authority_configuration_digest
        || bindings.adapter_ref != runtime.adapter_ref
        || bindings.adapter_version != runtime.adapter_version
        || bindings.adapter_executable_digest != runtime.adapter_executable_digest
        || bindings.image_digest != runtime.image_digest
        || manifest.declarations.image.immutable_digest != runtime.image_digest
        || manifest.declarations.image.in_image_adapter_digest != runtime.adapter_executable_digest
    {
        return Err(DockerLocalRuntimeProofDriverAdmissionErrorV1::RuntimeBindingInvalid);
    }

    let launch_contract_digest = docker_local_launch_contract_digest_v1(input.loaded_profile)
        .map_err(|_| DockerLocalRuntimeProofDriverAdmissionErrorV1::LaunchBindingInvalid)?;
    let launch_contract_digest = prefixed_sha256_v1(&launch_contract_digest);
    if bindings.launch_contract_digest != launch_contract_digest {
        return Err(DockerLocalRuntimeProofDriverAdmissionErrorV1::LaunchBindingInvalid);
    }

    let admission = DockerLocalRuntimeProofDriverAdmissionV1 {
        contract_version: CONTRACT_VERSION_V1_0.to_owned(),
        schema_version: 1,
        status: DOCKER_LOCAL_RUNTIME_PROOF_DRIVER_ADMISSION_STATUS_V1.to_owned(),
        phase11_complete: false,
        execution_authorized: false,
        claim_snapshot_authenticated: false,
        durable_claim_state_revalidated: false,
        launch_permission_granted: false,
        runtime_launch_performed: false,
        real_docker_proof: false,
        receipt_persisted: false,
        production_supported: false,
        contract: DockerLocalRuntimeProofDriverAdmissionContractV1 {
            contract_id: DOCKER_LOCAL_RUNTIME_PROOF_DRIVER_ADMISSION_CONTRACT_ID_V1.to_owned(),
            output: "canonical_private_structural_binding_digest".to_owned(),
            side_effects: Vec::new(),
            runtime_execution: false,
            proves_human_authority: false,
        },
        run_manifest_digest: input.run_manifest.digest_text(),
        source_revision: manifest.source.revision.clone(),
        proof_driver_executable_digest: manifest.source.proof_driver_executable_digest.clone(),
        claim: DockerLocalRuntimeProofDriverClaimBindingV1 {
            consumption_id: consumption.consumption_id.clone(),
            operation_id: operation.operation_id.clone(),
            operation_attempt_id: attempt.operation_attempt_id.clone(),
            authorization_id: operation.authorization_id.clone(),
            idempotency_key: consumption.idempotency_key.clone(),
            operation_state: operation.state.clone(),
            attempt_state: attempt.state.clone(),
            attempt_sequence: attempt.attempt_sequence,
        },
        request: DockerLocalRuntimeProofDriverRequestBindingV1 {
            payload_digest: input.payload.request_digest_text(),
            control_digest: control.request_digest_text(),
            execution_request_digest: prefixed_sha256_v1(&derived.request_digest),
            action_digest: prefixed_sha256_v1(&derived.action_digest),
            target_digest: prefixed_sha256_v1(&derived.target_digest),
            tool_arguments_digest: prefixed_sha256_v1(&input.payload.tool_arguments_digest()),
        },
        runtime: DockerLocalRuntimeProofDriverRuntimeBindingV1 {
            profile_digest,
            authority_configuration_digest,
            adapter_ref: runtime.adapter_ref.clone(),
            adapter_version: runtime.adapter_version.clone(),
            adapter_executable_digest: runtime.adapter_executable_digest.clone(),
            image_digest: runtime.image_digest.clone(),
            launch_contract_digest,
        },
        required_runtime_gate_checks:
            DOCKER_LOCAL_RUNTIME_PROOF_DRIVER_REQUIRED_RUNTIME_GATE_CHECKS_V1
                .iter()
                .map(|value| (*value).to_owned())
                .collect(),
        next_gate: DOCKER_LOCAL_RUNTIME_PROOF_DRIVER_ADMISSION_NEXT_GATE_V1.to_owned(),
    };
    let value = serde_json::to_value(&admission)
        .map_err(|_| DockerLocalRuntimeProofDriverAdmissionErrorV1::CanonicalizationFailed)?;
    let canonical_json = canonical_json_value_v1(&value)
        .map_err(|()| DockerLocalRuntimeProofDriverAdmissionErrorV1::CanonicalizationFailed)?;
    let digest = digest_fields_v1(
        DRIVER_ADMISSION_DIGEST_DOMAIN_V1,
        &[canonical_json.as_bytes()],
    );
    Ok(DockerLocalRuntimeProofDriverAdmissionOutputV1 {
        admission,
        canonical_json,
        digest,
    })
}

fn prefixed_sha256_v1(digest: &[u8; 32]) -> String {
    let mut output = String::from("sha256:");
    for byte in digest {
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
