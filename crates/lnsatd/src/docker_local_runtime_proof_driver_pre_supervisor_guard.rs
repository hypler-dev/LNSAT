//! Private authenticated durable-store guard for a later Phase 11 supervisor.
//!
//! This module consumes one store-created claim handle after the separate
//! source-only structural admission. It performs no runtime selection, process
//! creation, Docker access, receipt persistence, or launch authorization.

use crate::adapter_process_protocol::DOCKER_LOCAL_ADAPTER_PROCESS_PROTOCOL_CONTRACT_ID_V1;
use crate::docker_local_execution_payload::DockerLocalExecutionPayloadRequestFrameV1;
use crate::docker_local_runtime_proof_driver_admission::{
    DockerLocalRuntimeProofDriverAdmissionInputV1, DockerLocalRuntimeProofDriverAdmissionOutputV1,
    admit_docker_local_runtime_proof_driver_v1, prefixed_sha256_v1,
};
use crate::docker_local_runtime_proof_run_manifest::DockerLocalRuntimeProofRunManifestOutputV1;
use crate::runtime_profile::LoadedDockerLocalRuntimeProfileV1;
use lnsat_store::{
    PHASE11_DOCKER_GIT_ADAPTER_REF_V1, PHASE11_DOCKER_GIT_ADAPTER_VERSION_V1,
    Phase11DockerPreSupervisorBindingV1, Phase11DockerPreSupervisorProofV1,
    Phase11DockerRuntimeCompositionClaimHandleV1, Phase11DockerRuntimeCompositionClaimV1,
    SqliteStore,
};
use std::fmt;

/// One-shot inputs for the private pre-supervisor guard.
///
/// The caller transfers the store-created handle. This guard repeats the
/// source-only structural admission over that handle's original claim, then
/// consumes the handle for an authenticated durable-store re-read.
pub struct DockerLocalRuntimeProofDriverPreSupervisorGuardInputV1<'a> {
    pub run_manifest: &'a DockerLocalRuntimeProofRunManifestOutputV1,
    pub payload: &'a DockerLocalExecutionPayloadRequestFrameV1,
    pub loaded_profile: &'a LoadedDockerLocalRuntimeProfileV1,
    pub claim_handle: Phase11DockerRuntimeCompositionClaimHandleV1,
    pub raw_session_token: &'a str,
    pub raw_csrf_token: &'a str,
}

/// Private source-only guard after structural admission and durable re-read.
///
/// This type has no public constructor, `Clone`, or serialization. Its private
/// fields retain both proof objects so a later supervisor boundary cannot obtain
/// only one half of the required check. The result remains evidence for a later
/// gate, never launch permission or runtime evidence.
pub struct DockerLocalRuntimeProofDriverPreSupervisorGuardV1 {
    admission: DockerLocalRuntimeProofDriverAdmissionOutputV1,
    durable_proof: Phase11DockerPreSupervisorProofV1,
    configuration_digest: [u8; 32],
}

impl DockerLocalRuntimeProofDriverPreSupervisorGuardV1 {
    /// Returns the exact structural binding evaluated from current driver inputs.
    #[must_use]
    pub const fn admission(&self) -> &DockerLocalRuntimeProofDriverAdmissionOutputV1 {
        &self.admission
    }

    /// Returns the authenticated durable-store proof paired with this admission.
    #[must_use]
    pub const fn durable_proof(&self) -> &Phase11DockerPreSupervisorProofV1 {
        &self.durable_proof
    }

    /// Returns the configuration digest bound by this exact payload and profile.
    #[must_use]
    pub const fn configuration_digest(&self) -> [u8; 32] {
        self.configuration_digest
    }
}

/// Stable failures for the private pre-supervisor guard.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum DockerLocalRuntimeProofDriverPreSupervisorGuardErrorV1 {
    StructuralBindingInvalid,
    DurableProofRejected,
    DurableProofBindingInvalid,
}

impl DockerLocalRuntimeProofDriverPreSupervisorGuardErrorV1 {
    #[must_use]
    pub const fn code(self) -> &'static str {
        match self {
            Self::StructuralBindingInvalid => {
                "docker_local_runtime_proof_driver_pre_supervisor_guard.structural_binding_invalid"
            }
            Self::DurableProofRejected => {
                "docker_local_runtime_proof_driver_pre_supervisor_guard.durable_proof_rejected"
            }
            Self::DurableProofBindingInvalid => {
                "docker_local_runtime_proof_driver_pre_supervisor_guard.durable_proof_binding_invalid"
            }
        }
    }
}

impl fmt::Display for DockerLocalRuntimeProofDriverPreSupervisorGuardErrorV1 {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(self.code())
    }
}

impl std::error::Error for DockerLocalRuntimeProofDriverPreSupervisorGuardErrorV1 {}

/// Rebinds current driver identities, then consumes one claim handle for an
/// authenticated durable-store re-read immediately before any later process
/// boundary.
///
/// No process is created here. Passing this guard neither grants launch
/// permission nor reports a Docker consequence. A later separately authorized
/// supervisor must retain the returned private guard until its own final checks.
///
/// # Errors
///
/// Returns a stable error for structural drift, durable authentication/readback
/// failure, replay, or a durable claim that no longer matches this exact source
/// binding.
pub fn guard_docker_local_runtime_proof_pre_supervisor_v1(
    store: &mut SqliteStore,
    input: DockerLocalRuntimeProofDriverPreSupervisorGuardInputV1<'_>,
) -> Result<
    DockerLocalRuntimeProofDriverPreSupervisorGuardV1,
    DockerLocalRuntimeProofDriverPreSupervisorGuardErrorV1,
> {
    let operation_id = input.claim_handle.claim().operation.operation_id.clone();
    let configuration_digest = input.payload.derived_request().configuration_digest;
    let Ok(admission) = admit_docker_local_runtime_proof_driver_v1(
        &DockerLocalRuntimeProofDriverAdmissionInputV1 {
            run_manifest: input.run_manifest,
            claim: input.claim_handle.claim(),
            payload: input.payload,
            loaded_profile: input.loaded_profile,
        },
    ) else {
        let _ = store.mark_phase11_docker_outcome_unknown_v1(&operation_id);
        return Err(
            DockerLocalRuntimeProofDriverPreSupervisorGuardErrorV1::StructuralBindingInvalid,
        );
    };
    if input.loaded_profile.authority_configuration_digest() != configuration_digest {
        let _ = store.mark_phase11_docker_outcome_unknown_v1(&operation_id);
        return Err(
            DockerLocalRuntimeProofDriverPreSupervisorGuardErrorV1::StructuralBindingInvalid,
        );
    }
    let expected = Phase11DockerPreSupervisorBindingV1 {
        execution_request_digest: input.payload.derived_request().request_digest,
        tool_arguments_digest: input.payload.tool_arguments_digest(),
    };
    let durable_proof = store
        .verify_phase11_docker_pre_supervisor_v1(
            input.claim_handle,
            input.raw_session_token,
            input.raw_csrf_token,
            &expected,
        )
        .map_err(|_| {
            DockerLocalRuntimeProofDriverPreSupervisorGuardErrorV1::DurableProofRejected
        })?;
    if !durable_claim_matches_admission_v1(durable_proof.claim(), &admission, input.payload) {
        let _ = store.mark_phase11_docker_outcome_unknown_v1(&operation_id);
        return Err(
            DockerLocalRuntimeProofDriverPreSupervisorGuardErrorV1::DurableProofBindingInvalid,
        );
    }
    Ok(DockerLocalRuntimeProofDriverPreSupervisorGuardV1 {
        admission,
        durable_proof,
        configuration_digest,
    })
}

fn durable_claim_matches_admission_v1(
    claim: &Phase11DockerRuntimeCompositionClaimV1,
    admission: &DockerLocalRuntimeProofDriverAdmissionOutputV1,
    payload: &DockerLocalExecutionPayloadRequestFrameV1,
) -> bool {
    let expected = admission.admission();
    let derived = payload.derived_request();
    let Some(attempt) = claim.operation.attempt.as_ref() else {
        return false;
    };
    claim.created
        && claim.consumption.consumption_id == expected.claim.consumption_id
        && claim.consumption.operation_id == expected.claim.operation_id
        && claim.consumption.authorization_id == expected.claim.authorization_id
        && claim.consumption.idempotency_key == expected.claim.idempotency_key
        && claim.consumption.project_ref == derived.request.project_ref
        && claim.consumption.resource_ref == derived.request.resource_ref
        && prefixed_sha256_v1(&claim.execution_request_digest)
            == expected.request.execution_request_digest
        && claim.operation.operation_id == expected.claim.operation_id
        && claim.operation.authorization_id == expected.claim.authorization_id
        && claim.operation.consumption_id.as_deref() == Some(expected.claim.consumption_id.as_str())
        && claim.operation.project_ref == derived.request.project_ref
        && claim.operation.resource_ref == derived.request.resource_ref
        && claim.operation.state == expected.claim.operation_state
        && claim.operation.state_sequence == 2
        && claim.operation.receipt_id.is_none()
        && claim.operation.receipt_received_at.is_none()
        && claim.operation.reconciliation_id.is_none()
        && claim.operation.reconciliation_status.is_none()
        && claim.operation.reconciliation_recorded_at.is_none()
        && attempt.operation_attempt_id == expected.claim.operation_attempt_id
        && attempt.operation_id == expected.claim.operation_id
        && attempt.project_ref == derived.request.project_ref
        && attempt.resource_ref == derived.request.resource_ref
        && attempt.attempt_sequence == expected.claim.attempt_sequence
        && attempt.adapter_ref
            == format!(
                "{PHASE11_DOCKER_GIT_ADAPTER_REF_V1}@{PHASE11_DOCKER_GIT_ADAPTER_VERSION_V1}"
            )
        && attempt.protocol_version == DOCKER_LOCAL_ADAPTER_PROCESS_PROTOCOL_CONTRACT_ID_V1
        && attempt.state == expected.claim.attempt_state
        && attempt.state_sequence == 1
        && prefixed_sha256_v1(&attempt.tool_arguments_digest)
            == expected.request.tool_arguments_digest
}
