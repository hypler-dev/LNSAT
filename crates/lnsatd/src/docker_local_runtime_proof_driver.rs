//! Private Phase 11 served-chain composition for a marked disposable Git target.
//!
//! This module joins the existing atomic claim, one-shot durable handle,
//! canonical payload, final supervisor guard, and independently verified
//! receipt. Only the crate-test fake runtime selects it. A later real proof
//! driver still needs the operator packet's runtime, image, evidence, and
//! authority gates before any Docker observation or process is permitted.

use crate::adapter_process_protocol::DockerLocalAdapterProcessRequestInputV1;
use crate::docker_local_execution_payload::build_docker_local_execution_payload_request_v1;
use crate::docker_local_runtime_proof_driver_environment_preflight::preflight_docker_local_runtime_proof_environment_v1;
use crate::docker_local_runtime_proof_driver_pre_supervisor_guard::{
    DockerLocalProofEnvironmentFinalInputV1,
    DockerLocalRuntimeProofDriverPreSupervisorGuardInputV1,
    supervise_docker_local_runtime_proof_with_final_guard_v1,
};
use crate::docker_local_runtime_proof_run_manifest::DockerLocalRuntimeProofRunManifestOutputV1;
use crate::docker_local_runtime_proof_source_git_guard::{
    DockerLocalRuntimeProofSourceGitGuardV1, preflight_phase11_proof_source_git_v1,
};
use crate::docker_local_supervisor::DockerLocalSupervisorInputV1;
use crate::runtime_profile::LoadedDockerLocalRuntimeProfileV1;
use lnsat_store::{
    Phase7CapabilitySecretV1, Phase8RuntimeCompositionWriteV1,
    Phase11DockerRuntimeCompositionClaimOutcomeV1, Phase11DockerRuntimeCompositionInputV1,
    SqliteStore,
};
use std::path::Path;

/// All server-owned inputs for one private served proof composition.
pub(crate) struct DockerLocalRuntimeProofDriverInputV1<'a> {
    pub docker_input: Phase11DockerRuntimeCompositionInputV1<'a>,
    pub capability: Phase7CapabilitySecretV1,
    pub raw_session_token: &'a str,
    pub raw_csrf_token: &'a str,
    pub loaded_profile: &'a LoadedDockerLocalRuntimeProfileV1,
    pub run_manifest: &'a DockerLocalRuntimeProofRunManifestOutputV1,
    pub docker_executable: &'a Path,
    pub proof_driver_executable: &'a Path,
    pub source_root: &'a Path,
    pub expected_source_revision: &'a str,
    pub expected_source_tree_oid: &'a str,
    pub private_evidence_root: &'a Path,
}

/// Closed, secret-free driver failure families.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub(crate) enum DockerLocalRuntimeProofDriverErrorV1 {
    PayloadRejected,
    ClaimRejected,
    OutcomeUnknown,
}

fn preflight_source_git_guard_v1(
    run_manifest: &DockerLocalRuntimeProofRunManifestOutputV1,
    source_root: &Path,
    git_executable: &Path,
    expected_source_revision: &str,
    expected_source_tree_oid: &str,
) -> Result<DockerLocalRuntimeProofSourceGitGuardV1, ()> {
    let manifest = run_manifest.manifest();
    if manifest.source.revision != expected_source_revision
        || git_executable.to_str()
            != Some(
                manifest
                    .declarations
                    .host_git_verifier
                    .absolute_path
                    .as_str(),
            )
    {
        return Err(());
    }
    preflight_phase11_proof_source_git_v1(
        source_root,
        git_executable,
        &manifest.declarations.host_git_verifier.digest,
        expected_source_revision,
        expected_source_tree_oid,
    )
    .map_err(|_| ())
}

/// Executes one created claim through the exact final guard and persists its
/// independently host-verified result. Exact replay returns metadata only.
///
/// No public route or configuration selects this function. The only current
/// caller is the crate-test fake runtime. Any failure after claim creation
/// marks or preserves `outcome_unknown` and cannot redispatch.
///
/// # Errors
///
/// Rejects invalid payload, claim, final guard, supervisor exchange, or
/// receipt persistence without exposing private inputs.
pub(crate) fn execute_docker_local_runtime_proof_driver_v1(
    store: &mut SqliteStore,
    input: DockerLocalRuntimeProofDriverInputV1<'_>,
) -> Result<Phase8RuntimeCompositionWriteV1, DockerLocalRuntimeProofDriverErrorV1> {
    let redemption = input.docker_input.redemption;
    let payload =
        build_docker_local_execution_payload_request_v1(&DockerLocalAdapterProcessRequestInputV1 {
            operation_id: redemption.operation_id,
            authorization_id: redemption.authorization_id,
            idempotency_key: redemption.idempotency_key,
            attempt_sequence: 1,
            loaded_profile: input.loaded_profile,
            derived_request: input.docker_input.derived_request,
        })
        .map_err(|_| DockerLocalRuntimeProofDriverErrorV1::PayloadRejected)?;
    let claim = store
        .claim_phase11_docker_runtime_composition_handle_or_replay_v1(
            &input.docker_input,
            input.capability,
            input.raw_session_token,
            input.raw_csrf_token,
        )
        .map_err(|_| DockerLocalRuntimeProofDriverErrorV1::ClaimRejected)?;
    let handle = match claim {
        Phase11DockerRuntimeCompositionClaimOutcomeV1::Replay(claim) => {
            return Ok(Phase8RuntimeCompositionWriteV1 {
                created: false,
                consumption: claim.consumption,
                operation: claim.operation,
            });
        }
        Phase11DockerRuntimeCompositionClaimOutcomeV1::Created(handle) => handle,
    };
    let consumption = handle.claim().consumption.clone();
    let operation_id = redemption.operation_id;
    let environment_guard = preflight_docker_local_runtime_proof_environment_v1(
        input.run_manifest,
        input.proof_driver_executable,
        input.source_root,
        input.private_evidence_root,
        input.docker_input.disposable_root,
    )
    .map_err(|_| {
        let _ = store.mark_phase11_docker_outcome_unknown_v1(operation_id);
        DockerLocalRuntimeProofDriverErrorV1::OutcomeUnknown
    })?;
    let source_git_guard = preflight_source_git_guard_v1(
        input.run_manifest,
        input.source_root,
        input.docker_input.verifier_git_executable,
        input.expected_source_revision,
        input.expected_source_tree_oid,
    )
    .map_err(|()| {
        let _ = store.mark_phase11_docker_outcome_unknown_v1(operation_id);
        DockerLocalRuntimeProofDriverErrorV1::OutcomeUnknown
    })?;
    let supervised = supervise_docker_local_runtime_proof_with_final_guard_v1(
        store,
        DockerLocalRuntimeProofDriverPreSupervisorGuardInputV1 {
            run_manifest: input.run_manifest,
            payload: &payload,
            loaded_profile: input.loaded_profile,
            claim_handle: *handle,
            raw_session_token: input.raw_session_token,
            raw_csrf_token: input.raw_csrf_token,
        },
        &DockerLocalSupervisorInputV1 {
            payload: &payload,
            loaded_profile: input.loaded_profile,
            docker_executable: input.docker_executable,
            verifier_git_executable: input.docker_input.verifier_git_executable,
            disposable_root: input.docker_input.disposable_root,
        },
        DockerLocalProofEnvironmentFinalInputV1 {
            guard: &environment_guard,
            source_git_guard: &source_git_guard,
            proof_driver_executable: input.proof_driver_executable,
            source_root: input.source_root,
            expected_source_revision: input.expected_source_revision,
            expected_source_tree_oid: input.expected_source_tree_oid,
            private_evidence_root: input.private_evidence_root,
        },
    );
    let Ok(supervised) = supervised else {
        let _ = store.mark_phase11_docker_outcome_unknown_v1(operation_id);
        return Err(DockerLocalRuntimeProofDriverErrorV1::OutcomeUnknown);
    };
    let operation = store
        .persist_phase11_docker_runtime_result_v1(&input.docker_input, &supervised.semantic_result)
        .map_err(|_| {
            let _ = store.mark_phase11_docker_outcome_unknown_v1(operation_id);
            DockerLocalRuntimeProofDriverErrorV1::OutcomeUnknown
        })?;
    Ok(Phase8RuntimeCompositionWriteV1 {
        created: true,
        consumption,
        operation,
    })
}
