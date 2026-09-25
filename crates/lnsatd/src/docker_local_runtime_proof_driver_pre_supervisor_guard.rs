//! Private authenticated durable-store guard for a later Phase 11 supervisor.
//!
//! The base guard consumes one store-created claim handle after the separate
//! source-only structural admission without process or Docker access. A private
//! composition seam can invoke that guard from the supervisor's final callback,
//! but no route, CLI, daemon configuration, package, or release selects it.

use crate::adapter_process_protocol::DOCKER_LOCAL_ADAPTER_PROCESS_PROTOCOL_CONTRACT_ID_V1;
use crate::docker_local_execution_payload::DockerLocalExecutionPayloadRequestFrameV1;
use crate::docker_local_runtime_proof_driver_admission::{
    DockerLocalRuntimeProofDriverAdmissionInputV1, DockerLocalRuntimeProofDriverAdmissionOutputV1,
    admit_docker_local_runtime_proof_driver_v1, prefixed_sha256_v1,
};
use crate::docker_local_runtime_proof_driver_environment_preflight::DockerLocalRuntimeProofEnvironmentGuardV1;
use crate::docker_local_runtime_proof_run_manifest::{
    DockerLocalRuntimeProofPathIdentityV1, DockerLocalRuntimeProofRunManifestOutputV1,
    DockerLocalRuntimeProofTargetDeclarationV1,
};
use crate::docker_local_runtime_proof_source_git_guard::DockerLocalRuntimeProofSourceGitGuardV1;
use crate::docker_local_supervisor::{
    DockerLocalSupervisedGitResultV1, DockerLocalSupervisorErrorV1,
    DockerLocalSupervisorFinalAuthorizationContextV1, DockerLocalSupervisorInputV1,
    supervise_docker_local_git_execution_with_final_authorization_v1,
};
use crate::runtime_profile::LoadedDockerLocalRuntimeProfileV1;
use lnsat_store::{
    PHASE7_GIT_FIXTURE_MARKER_V1, PHASE11_DOCKER_GIT_ADAPTER_REF_V1,
    PHASE11_DOCKER_GIT_ADAPTER_VERSION_V1, Phase7GitRepositoryIdentityV1,
    Phase11DockerPreSupervisorBindingV1, Phase11DockerPreSupervisorProofV1,
    Phase11DockerRuntimeCompositionClaimHandleV1, Phase11DockerRuntimeCompositionClaimV1,
    SqliteStore,
};
use sha2::{Digest, Sha256};
use std::fmt;
use std::fs;
#[cfg(unix)]
use std::os::unix::fs::{FileTypeExt as _, MetadataExt as _};
use std::path::Path;

const PATH_IDENTITY_DIGEST_DOMAIN_V1: &[u8] = b"lnsat.docker-local-runtime-proof-path-identity.v1";
const TARGET_OWNERSHIP_DIGEST_DOMAIN_V1: &[u8] =
    b"lnsat.docker-local-runtime-proof-target-ownership.v1";
const REPOSITORY_IDENTITY_DIGEST_DOMAIN_V1: &[u8] =
    b"lnsat.docker-local-runtime-proof-repository-identity.v1";
const TARGET_IDENTITY_DIGEST_DOMAIN_V1: &[u8] =
    b"lnsat.docker-local-runtime-proof-target-identity.v1";

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

/// Filesystem-only source, proof-driver, and evidence identities carried from
/// pre-claim preflight to the supervisor's final process boundary.
#[derive(Clone, Copy)]
pub(crate) struct DockerLocalProofEnvironmentFinalInputV1<'a> {
    pub guard: &'a DockerLocalRuntimeProofEnvironmentGuardV1,
    pub source_git_guard: &'a DockerLocalRuntimeProofSourceGitGuardV1,
    pub proof_driver_executable: &'a Path,
    pub source_root: &'a Path,
    pub expected_source_revision: &'a str,
    pub expected_source_tree_oid: &'a str,
    pub private_evidence_root: &'a Path,
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

/// Runs the private source-only proof composition through the supervisor's
/// exact final authorization callback.
///
/// The one-shot durable handle is authenticated and re-read only after the
/// supervisor has repeated every target, executable, and endpoint check. The
/// callback also binds the run-manifest Docker client, Git verifier, local
/// endpoint, and disposable-target declarations to those exact revalidated
/// paths and domain-separated filesystem identities. The returned opaque guard
/// stays alive across `spawn` and the complete exchange. Any rejection after
/// the claim committed preserves or marks the operation as `outcome_unknown`.
/// This seam is not selected by any route, CLI, daemon configuration, package,
/// or release surface.
///
/// # Errors
///
/// Rejects cross-input substitution, a failed fresh durable guard, supervisor
/// preflight drift, runtime ambiguity, or result validation failure. Every
/// failure occurs after a durable claim and therefore marks or preserves
/// `outcome_unknown`.
pub(crate) fn supervise_docker_local_runtime_proof_with_final_guard_v1(
    store: &mut SqliteStore,
    guard_input: DockerLocalRuntimeProofDriverPreSupervisorGuardInputV1<'_>,
    supervisor_input: &DockerLocalSupervisorInputV1<'_>,
    environment: DockerLocalProofEnvironmentFinalInputV1<'_>,
) -> Result<DockerLocalSupervisedGitResultV1, DockerLocalSupervisorErrorV1> {
    let operation_id = guard_input
        .claim_handle
        .claim()
        .operation
        .operation_id
        .clone();
    if guard_input.payload.frame() != supervisor_input.payload.frame()
        || guard_input.loaded_profile.profile_digest()
            != supervisor_input.loaded_profile.profile_digest()
        || guard_input.loaded_profile.authority_configuration_digest()
            != supervisor_input
                .loaded_profile
                .authority_configuration_digest()
    {
        let _ = store.mark_phase11_docker_outcome_unknown_v1(&operation_id);
        return Err(DockerLocalSupervisorErrorV1::OutcomeUnknown);
    }

    let result = supervise_docker_local_git_execution_with_final_authorization_v1(
        supervisor_input,
        |context| {
            environment
                .guard
                .revalidate(
                    guard_input.run_manifest,
                    environment.proof_driver_executable,
                    environment.source_root,
                    environment.private_evidence_root,
                    &context.disposable_root,
                )
                .map_err(|_| DockerLocalSupervisorErrorV1::OutcomeUnknown)?;
            if guard_input.run_manifest.manifest().source.revision
                != environment.expected_source_revision
                || context.verifier_git_executable.to_str()
                    != Some(
                        guard_input
                            .run_manifest
                            .manifest()
                            .declarations
                            .host_git_verifier
                            .absolute_path
                            .as_str(),
                    )
            {
                return Err(DockerLocalSupervisorErrorV1::OutcomeUnknown);
            }
            environment
                .source_git_guard
                .revalidate(
                    environment.source_root,
                    &context.verifier_git_executable,
                    &guard_input
                        .run_manifest
                        .manifest()
                        .declarations
                        .host_git_verifier
                        .digest,
                    environment.expected_source_revision,
                    environment.expected_source_tree_oid,
                )
                .map_err(|_| DockerLocalSupervisorErrorV1::OutcomeUnknown)?;
            if !run_manifest_matches_final_supervisor_v1(
                guard_input.run_manifest,
                guard_input.loaded_profile,
                context,
            ) {
                return Err(DockerLocalSupervisorErrorV1::OutcomeUnknown);
            }
            let durable_guard =
                guard_docker_local_runtime_proof_pre_supervisor_v1(store, guard_input)
                    .map_err(|_| DockerLocalSupervisorErrorV1::OutcomeUnknown)?;
            Ok((
                environment.guard,
                environment.source_git_guard,
                durable_guard,
            ))
        },
    );
    if result.is_err() {
        let _ = store.mark_phase11_docker_outcome_unknown_v1(&operation_id);
    }
    result
}

fn run_manifest_matches_final_supervisor_v1(
    run_manifest: &DockerLocalRuntimeProofRunManifestOutputV1,
    loaded_profile: &LoadedDockerLocalRuntimeProfileV1,
    context: &DockerLocalSupervisorFinalAuthorizationContextV1,
) -> bool {
    let Some(supervisor) = loaded_profile.supervisor() else {
        return false;
    };
    let declarations = &run_manifest.manifest().declarations;
    runtime_path_identity_declaration_v1(
        &context.docker_executable,
        Some(&supervisor.docker_executable_digest),
    )
    .is_ok_and(|expected| expected == declarations.docker_client)
        && runtime_path_identity_declaration_v1(&context.endpoint_path, None)
            .is_ok_and(|expected| expected == declarations.local_unix_endpoint)
        && runtime_path_identity_declaration_v1(
            &context.verifier_git_executable,
            Some(&supervisor.verifier_git_executable_digest),
        )
        .is_ok_and(|expected| expected == declarations.host_git_verifier)
        && runtime_target_identity_declaration_v1(&context.disposable_root, &context.repository)
            .is_ok_and(|expected| expected == declarations.disposable_target)
}

pub(crate) fn runtime_path_identity_declaration_v1(
    path: &Path,
    content_digest: Option<&str>,
) -> Result<DockerLocalRuntimeProofPathIdentityV1, ()> {
    let absolute_path = canonical_utf8_path_v1(path)?;
    let stable_identity_digest = stable_path_identity_digest_v1(path)?;
    Ok(DockerLocalRuntimeProofPathIdentityV1 {
        absolute_path,
        digest: content_digest.unwrap_or(&stable_identity_digest).to_owned(),
        stable_identity_digest,
    })
}

pub(crate) fn runtime_target_identity_declaration_v1(
    disposable_root: &Path,
    repository: &Phase7GitRepositoryIdentityV1,
) -> Result<DockerLocalRuntimeProofTargetDeclarationV1, ()> {
    let owner_only_disposable_root = canonical_utf8_path_v1(disposable_root)?;
    let repository_absolute_path = canonical_utf8_path_v1(&repository.repository_path)?;
    let git_dir_path = canonical_utf8_path_v1(&repository.git_dir_path)?;
    let marker_path = repository
        .repository_path
        .join(PHASE7_GIT_FIXTURE_MARKER_V1);
    let marker_absolute_path = canonical_utf8_path_v1(&marker_path)?;
    let root_identity = stable_path_identity_digest_v1(disposable_root)?;
    let repository_file_identity = stable_path_identity_digest_v1(&repository.repository_path)?;
    let git_dir_identity = stable_path_identity_digest_v1(&repository.git_dir_path)?;
    let marker_file_identity = stable_path_identity_digest_v1(&marker_path)?;
    let ownership_mode_identity_digest = digest_text_fields_v1(
        TARGET_OWNERSHIP_DIGEST_DOMAIN_V1,
        &[
            owner_only_disposable_root.as_bytes(),
            root_identity.as_bytes(),
            repository_absolute_path.as_bytes(),
            repository_file_identity.as_bytes(),
            git_dir_path.as_bytes(),
            git_dir_identity.as_bytes(),
            marker_absolute_path.as_bytes(),
            marker_file_identity.as_bytes(),
        ],
    );
    let repository_identity_digest = digest_text_fields_v1(
        REPOSITORY_IDENTITY_DIGEST_DOMAIN_V1,
        &[
            repository_absolute_path.as_bytes(),
            git_dir_path.as_bytes(),
            repository.object_format.as_bytes(),
            repository.head_ref.as_bytes(),
            repository.base_commit_oid.as_bytes(),
            repository.fixture_marker_sha256.as_bytes(),
        ],
    );
    let target_identity_digest = digest_text_fields_v1(
        TARGET_IDENTITY_DIGEST_DOMAIN_V1,
        &[
            owner_only_disposable_root.as_bytes(),
            repository_absolute_path.as_bytes(),
            marker_absolute_path.as_bytes(),
            repository.base_commit_oid.as_bytes(),
            ownership_mode_identity_digest.as_bytes(),
            repository_identity_digest.as_bytes(),
            repository.fixture_marker_sha256.as_bytes(),
        ],
    );
    Ok(DockerLocalRuntimeProofTargetDeclarationV1 {
        owner_only_disposable_root,
        repository_absolute_path,
        marker_absolute_path,
        base_revision: repository.base_commit_oid.clone(),
        ownership_mode_identity_digest,
        repository_identity_digest,
        marker_digest: repository.fixture_marker_sha256.clone(),
        target_identity_digest,
    })
}

fn canonical_utf8_path_v1(path: &Path) -> Result<String, ()> {
    let canonical = fs::canonicalize(path).map_err(|_| ())?;
    if canonical != path {
        return Err(());
    }
    canonical.into_os_string().into_string().map_err(|_| ())
}

fn stable_path_identity_digest_v1(path: &Path) -> Result<String, ()> {
    #[cfg(not(unix))]
    {
        let _ = path;
        Err(())
    }
    #[cfg(unix)]
    {
        let absolute_path = canonical_utf8_path_v1(path)?;
        let metadata = fs::symlink_metadata(path).map_err(|_| ())?;
        if metadata.file_type().is_symlink()
            || !(metadata.file_type().is_file()
                || metadata.file_type().is_dir()
                || metadata.file_type().is_socket())
        {
            return Err(());
        }
        let device = metadata.dev().to_be_bytes();
        let inode = metadata.ino().to_be_bytes();
        let uid = metadata.uid().to_be_bytes();
        let gid = metadata.gid().to_be_bytes();
        let mode = metadata.mode().to_be_bytes();
        let size = metadata.size().to_be_bytes();
        Ok(digest_text_fields_v1(
            PATH_IDENTITY_DIGEST_DOMAIN_V1,
            &[
                absolute_path.as_bytes(),
                &device,
                &inode,
                &uid,
                &gid,
                &mode,
                &size,
            ],
        ))
    }
}

fn digest_text_fields_v1(domain: &[u8], fields: &[&[u8]]) -> String {
    let mut hasher = Sha256::new();
    hasher.update((domain.len() as u64).to_be_bytes());
    hasher.update(domain);
    for field in fields {
        hasher.update((field.len() as u64).to_be_bytes());
        hasher.update(field);
    }
    prefixed_sha256_v1(&hasher.finalize().into())
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
