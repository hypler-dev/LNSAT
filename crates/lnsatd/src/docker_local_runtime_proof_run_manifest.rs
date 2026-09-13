//! Source-only P11 private run-manifest contract.
//!
//! This module binds reviewed proof metadata to exact declarations for a later
//! human-authorized run. It performs no process, socket, filesystem, Git,
//! environment, store, route, Docker, or runtime-evidence work.

use crate::adapter_process_protocol::canonical_json_value_v1;
use crate::docker_local_runtime_proof::{
    DOCKER_LOCAL_RUNTIME_PROOF_NEXT_GATE_V1, DockerLocalRuntimeProofPlanOutputV1,
};
use crate::docker_local_runtime_proof_evidence::{
    DOCKER_LOCAL_RUNTIME_PROOF_FORBIDDEN_PUBLIC_EVIDENCE_FIELDS_V1,
    DOCKER_LOCAL_RUNTIME_PROOF_POSTSPAWN_OUTCOME_UNKNOWN_IDS_V1,
    DOCKER_LOCAL_RUNTIME_PROOF_PREFLIGHT_REJECTION_IDS_V1,
    DOCKER_LOCAL_RUNTIME_PROOF_REQUIRED_OBSERVATION_COMMITMENT_IDS_V1,
    DockerLocalRuntimeProofEvidenceRequirementsOutputV1,
};
use crate::docker_local_runtime_proof_execution_harness::{
    DOCKER_LOCAL_RUNTIME_PROOF_EXECUTION_HARNESS_AUTHORITY_DECLARATION_IDS_V1,
    DOCKER_LOCAL_RUNTIME_PROOF_EXECUTION_HARNESS_REQUIRED_PLAN_BINDING_IDS_V1,
    DOCKER_LOCAL_RUNTIME_PROOF_EXECUTION_HARNESS_STOP_IDS_V1,
    DockerLocalRuntimeProofExecutionHarnessOutputV1,
};
use lnsat_contracts::CONTRACT_VERSION_V1_0;
use serde::de::{MapAccess, SeqAccess, Visitor};
use serde::{Deserialize, Deserializer, Serialize};
use serde_json::{Map, Number, Value};
use sha2::{Digest, Sha256};
use std::fmt::{self, Write as _};

/// Exact private run-manifest contract identity.
pub const DOCKER_LOCAL_RUNTIME_PROOF_RUN_MANIFEST_CONTRACT_ID_V1: &str =
    "lnsat.docker_local_runtime_proof_run_manifest.v1";
/// Exact schema identity for canonical private run manifests.
pub const DOCKER_LOCAL_RUNTIME_PROOF_RUN_MANIFEST_SCHEMA_ID_V1: &str =
    "lnsat.phase11_docker_local_runtime_proof_run_manifest.schema.v1_0";
/// Maximum accepted manifest bytes. Private evidence stays outside this source tree.
pub const MAX_DOCKER_LOCAL_RUNTIME_PROOF_RUN_MANIFEST_BYTES_V1: usize = 32 * 1024;
/// Maximum accepted JSON object or array nesting.
pub const MAX_DOCKER_LOCAL_RUNTIME_PROOF_RUN_MANIFEST_JSON_NESTING_V1: usize = 64;
/// Longest exact run window this source contract accepts.
pub const MAX_DOCKER_LOCAL_RUNTIME_PROOF_RUN_WINDOW_SECONDS_V1: u64 = 60 * 60;

const RUN_MANIFEST_DIGEST_DOMAIN_V1: &[u8] = b"lnsat.docker-local-runtime-proof-run-manifest.v1";
const PROPOSED_SOURCE_ONLY_STATUS_V1: &str = "proposed_source_only_no_runtime_evidence";

/// Exact private-only observation permissions a later authority may name.
pub const DOCKER_LOCAL_RUNTIME_PROOF_RUN_MANIFEST_OBSERVATION_PERMISSIONS_V1: [&str; 8] = [
    "docker_client_identity",
    "local_unix_endpoint_identity",
    "daemon_identity_api_platform_security_posture",
    "immutable_image_provenance_configuration_entrypoint_adapter_identity",
    "disposable_target_identity",
    "served_chain_identity",
    "host_git_verifier_identity",
    "private_evidence_custody",
];
/// Exact execution permissions a later authority may name. This source contract never exercises them.
pub const DOCKER_LOCAL_RUNTIME_PROOF_RUN_MANIFEST_EXECUTION_PERMISSIONS_V1: [&str; 5] = [
    "served_gateway_d4b2a_d3_d4a_supervisor_only",
    "pull_never",
    "owner_only_disposable_target",
    "daemon_client_endpoint_revalidated_launch_label_bound_inspect_before_remove",
    "host_git_inspection_only_reconciliation",
];

#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct DockerLocalRuntimeProofRunManifestBindingsV1 {
    pub proof_plan_digest: String,
    pub evidence_requirements_digest: String,
    pub execution_harness_digest: String,
    pub profile_digest: String,
    pub authority_configuration_digest: String,
    pub adapter_ref: String,
    pub adapter_version: String,
    pub adapter_executable_digest: String,
    pub image_digest: String,
    pub launch_contract_digest: String,
}

/// Expected source/build identity supplied separately from untrusted manifest bytes.
#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct DockerLocalRuntimeProofRunManifestSourceBindingV1 {
    pub repository_absolute_path: String,
    pub repository_identity_digest: String,
    pub revision: String,
    pub proof_driver_executable_digest: String,
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct DockerLocalRuntimeProofRunWindowV1 {
    pub not_before_utc: String,
    pub not_after_utc: String,
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct DockerLocalRuntimeProofPathIdentityV1 {
    pub absolute_path: String,
    pub digest: String,
    pub stable_identity_digest: String,
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct DockerLocalRuntimeProofDaemonDeclarationV1 {
    pub identity_digest: String,
    pub api_version: String,
    pub runtime_version: String,
    pub platform_digest: String,
    pub security_posture_digest: String,
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct DockerLocalRuntimeProofImageDeclarationV1 {
    pub immutable_digest: String,
    pub provenance_digest: String,
    pub platform_digest: String,
    pub configuration_digest: String,
    pub entrypoint_digest: String,
    pub in_image_adapter_absolute_path: String,
    pub in_image_adapter_digest: String,
    pub pull_policy: String,
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct DockerLocalRuntimeProofTargetDeclarationV1 {
    pub owner_only_disposable_root: String,
    pub repository_absolute_path: String,
    pub marker_absolute_path: String,
    pub base_revision: String,
    pub ownership_mode_identity_digest: String,
    pub repository_identity_digest: String,
    pub marker_digest: String,
    pub target_identity_digest: String,
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct DockerLocalRuntimeProofPrivateEvidenceDeclarationV1 {
    pub absolute_location: String,
    pub custody_digest: String,
    pub redaction_digest: String,
    pub cleanup_digest: String,
    pub rollback_digest: String,
}

/// Exact private declarations. Their presence does not prove authority or identity.
#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct DockerLocalRuntimeProofRunManifestSourceInputV1 {
    pub run_nonce: String,
    pub run_window: DockerLocalRuntimeProofRunWindowV1,
    pub human_authority_reference: String,
    pub host_identity_digest: String,
    pub docker_client: DockerLocalRuntimeProofPathIdentityV1,
    pub local_unix_endpoint: DockerLocalRuntimeProofPathIdentityV1,
    pub daemon: DockerLocalRuntimeProofDaemonDeclarationV1,
    pub image: DockerLocalRuntimeProofImageDeclarationV1,
    pub disposable_target: DockerLocalRuntimeProofTargetDeclarationV1,
    pub host_git_verifier: DockerLocalRuntimeProofPathIdentityV1,
    pub served_chain_digest: String,
    pub private_evidence: DockerLocalRuntimeProofPrivateEvidenceDeclarationV1,
    pub independent_reviewer_reference: String,
    pub independent_reviewer_digest: String,
    pub observation_permissions: Vec<String>,
    pub execution_permissions: Vec<String>,
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct DockerLocalRuntimeProofRunManifestContractV1 {
    pub contract_id: String,
    pub output: String,
    pub side_effects: Vec<String>,
    pub runtime_execution: bool,
    pub proves_human_authority: bool,
}

/// Canonical private manifest that prepares, but never grants, later authority.
#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
#[allow(clippy::struct_excessive_bools)]
pub struct DockerLocalRuntimeProofRunManifestV1 {
    pub schema_id: String,
    pub contract_version: String,
    pub schema_version: u32,
    pub status: String,
    pub phase11_complete: bool,
    pub execution_authorized: bool,
    pub real_docker_proof: bool,
    pub production_supported: bool,
    pub contract: DockerLocalRuntimeProofRunManifestContractV1,
    pub bindings: DockerLocalRuntimeProofRunManifestBindingsV1,
    pub source: DockerLocalRuntimeProofRunManifestSourceBindingV1,
    pub required_plan_binding_ids: Vec<String>,
    pub required_case_ids: Vec<String>,
    pub required_observation_commitment_ids: Vec<String>,
    pub preflight_rejection_ids: Vec<String>,
    pub postspawn_outcome_unknown_ids: Vec<String>,
    pub forbidden_public_evidence_fields: Vec<String>,
    pub authority_declaration_ids: Vec<String>,
    pub authority_stop_ids: Vec<String>,
    pub declarations: DockerLocalRuntimeProofRunManifestSourceInputV1,
    pub next_gate: String,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct DockerLocalRuntimeProofRunManifestOutputV1 {
    manifest: DockerLocalRuntimeProofRunManifestV1,
    canonical_json: String,
    digest: [u8; 32],
}

impl DockerLocalRuntimeProofRunManifestOutputV1 {
    #[must_use]
    pub const fn manifest(&self) -> &DockerLocalRuntimeProofRunManifestV1 {
        &self.manifest
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

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum DockerLocalRuntimeProofRunManifestErrorV1 {
    InputInvalid,
    ManifestTooLarge,
    ManifestTooDeep,
    ManifestInvalid,
    CanonicalizationFailed,
}

impl DockerLocalRuntimeProofRunManifestErrorV1 {
    #[must_use]
    pub const fn code(self) -> &'static str {
        match self {
            Self::InputInvalid => "docker_local_runtime_proof_run_manifest.input_invalid",
            Self::ManifestTooLarge => "docker_local_runtime_proof_run_manifest.manifest_too_large",
            Self::ManifestTooDeep => "docker_local_runtime_proof_run_manifest.manifest_too_deep",
            Self::ManifestInvalid => "docker_local_runtime_proof_run_manifest.manifest_invalid",
            Self::CanonicalizationFailed => {
                "docker_local_runtime_proof_run_manifest.canonicalization_failed"
            }
        }
    }
}
impl fmt::Display for DockerLocalRuntimeProofRunManifestErrorV1 {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(self.code())
    }
}
impl std::error::Error for DockerLocalRuntimeProofRunManifestErrorV1 {}

/// Builds one canonical private manifest from closed metadata and exact declarations.
///
/// Success only binds and validates declarations. It does not inspect the
/// filesystem, prove human approval, or contact Docker, the daemon, endpoint,
/// image, target, verifier, or evidence store.
///
/// # Errors
///
/// Returns a stable run-manifest error when inherited metadata, source identity,
/// declarations, canonicalization, or a closed authority boundary is invalid.
pub fn build_docker_local_runtime_proof_run_manifest_v1(
    proof_plan: &DockerLocalRuntimeProofPlanOutputV1,
    requirements: &DockerLocalRuntimeProofEvidenceRequirementsOutputV1,
    harness: &DockerLocalRuntimeProofExecutionHarnessOutputV1,
    source: &DockerLocalRuntimeProofRunManifestSourceBindingV1,
    declarations: DockerLocalRuntimeProofRunManifestSourceInputV1,
) -> Result<DockerLocalRuntimeProofRunManifestOutputV1, DockerLocalRuntimeProofRunManifestErrorV1> {
    let expected =
        manifest_from_inputs_v1(proof_plan, requirements, harness, source, declarations)?;
    finalize_manifest_v1(proof_plan, requirements, harness, expected)
}

/// Parses and revalidates one exact canonical private manifest without runtime I/O.
///
/// # Errors
///
/// Returns a stable run-manifest error when the input is oversized, too deeply
/// nested, noncanonical, malformed, or inconsistent with the expected inputs.
pub fn parse_docker_local_runtime_proof_run_manifest_v1(
    proof_plan: &DockerLocalRuntimeProofPlanOutputV1,
    requirements: &DockerLocalRuntimeProofEvidenceRequirementsOutputV1,
    harness: &DockerLocalRuntimeProofExecutionHarnessOutputV1,
    expected_source: &DockerLocalRuntimeProofRunManifestSourceBindingV1,
    bytes: &[u8],
) -> Result<DockerLocalRuntimeProofRunManifestOutputV1, DockerLocalRuntimeProofRunManifestErrorV1> {
    if bytes.len() > MAX_DOCKER_LOCAL_RUNTIME_PROOF_RUN_MANIFEST_BYTES_V1 {
        return Err(DockerLocalRuntimeProofRunManifestErrorV1::ManifestTooLarge);
    }
    let text = std::str::from_utf8(bytes)
        .map_err(|_| DockerLocalRuntimeProofRunManifestErrorV1::ManifestInvalid)?;
    validate_json_nesting_v1(text)?;
    let unique: UniqueJsonValueV1 = serde_json::from_str(text)
        .map_err(|_| DockerLocalRuntimeProofRunManifestErrorV1::ManifestInvalid)?;
    let manifest: DockerLocalRuntimeProofRunManifestV1 = serde_json::from_value(unique.0)
        .map_err(|_| DockerLocalRuntimeProofRunManifestErrorV1::ManifestInvalid)?;
    let expected = manifest_from_inputs_v1(
        proof_plan,
        requirements,
        harness,
        expected_source,
        manifest.declarations.clone(),
    )?;
    let output = finalize_manifest_v1(proof_plan, requirements, harness, expected)?;
    if text != output.canonical_json {
        return Err(DockerLocalRuntimeProofRunManifestErrorV1::ManifestInvalid);
    }
    Ok(output)
}

fn manifest_from_inputs_v1(
    proof_plan: &DockerLocalRuntimeProofPlanOutputV1,
    requirements: &DockerLocalRuntimeProofEvidenceRequirementsOutputV1,
    harness: &DockerLocalRuntimeProofExecutionHarnessOutputV1,
    source: &DockerLocalRuntimeProofRunManifestSourceBindingV1,
    declarations: DockerLocalRuntimeProofRunManifestSourceInputV1,
) -> Result<DockerLocalRuntimeProofRunManifestV1, DockerLocalRuntimeProofRunManifestErrorV1> {
    let h = harness.harness();
    if h.bindings.proof_plan_digest != proof_plan.digest_text()
        || h.bindings.evidence_requirements_digest != requirements.digest_text()
        || h.required_case_ids != requirements.requirements().required_case_ids
        || h.required_observation_commitment_ids
            != requirements
                .requirements()
                .required_observation_commitment_ids
        || h.preflight_rejection_ids != requirements.requirements().preflight_rejection_ids
        || h.postspawn_outcome_unknown_ids
            != requirements.requirements().postspawn_outcome_unknown_ids
        || h.forbidden_public_evidence_fields
            != requirements.requirements().forbidden_public_evidence_fields
    {
        return Err(DockerLocalRuntimeProofRunManifestErrorV1::InputInvalid);
    }
    let manifest = DockerLocalRuntimeProofRunManifestV1 {
        schema_id: DOCKER_LOCAL_RUNTIME_PROOF_RUN_MANIFEST_SCHEMA_ID_V1.to_owned(),
        contract_version: CONTRACT_VERSION_V1_0.to_owned(),
        schema_version: 1,
        status: PROPOSED_SOURCE_ONLY_STATUS_V1.to_owned(),
        phase11_complete: false,
        execution_authorized: false,
        real_docker_proof: false,
        production_supported: false,
        contract: DockerLocalRuntimeProofRunManifestContractV1 {
            contract_id: DOCKER_LOCAL_RUNTIME_PROOF_RUN_MANIFEST_CONTRACT_ID_V1.to_owned(),
            output: "canonical_private_run_manifest_digest".to_owned(),
            side_effects: Vec::new(),
            runtime_execution: false,
            proves_human_authority: false,
        },
        bindings: DockerLocalRuntimeProofRunManifestBindingsV1 {
            proof_plan_digest: proof_plan.digest_text(),
            evidence_requirements_digest: requirements.digest_text(),
            execution_harness_digest: harness.digest_text(),
            profile_digest: h.bindings.profile_digest.clone(),
            authority_configuration_digest: h.bindings.authority_configuration_digest.clone(),
            adapter_ref: h.bindings.adapter_ref.clone(),
            adapter_version: h.bindings.adapter_version.clone(),
            adapter_executable_digest: h.bindings.adapter_executable_digest.clone(),
            image_digest: h.bindings.image_digest.clone(),
            launch_contract_digest: h.bindings.launch_contract_digest.clone(),
        },
        source: source.clone(),
        required_plan_binding_ids: strings_v1(
            &DOCKER_LOCAL_RUNTIME_PROOF_EXECUTION_HARNESS_REQUIRED_PLAN_BINDING_IDS_V1,
        ),
        required_case_ids: h.required_case_ids.clone(),
        required_observation_commitment_ids: h.required_observation_commitment_ids.clone(),
        preflight_rejection_ids: h.preflight_rejection_ids.clone(),
        postspawn_outcome_unknown_ids: h.postspawn_outcome_unknown_ids.clone(),
        forbidden_public_evidence_fields: h.forbidden_public_evidence_fields.clone(),
        authority_declaration_ids: strings_v1(
            &DOCKER_LOCAL_RUNTIME_PROOF_EXECUTION_HARNESS_AUTHORITY_DECLARATION_IDS_V1,
        ),
        authority_stop_ids: strings_v1(&DOCKER_LOCAL_RUNTIME_PROOF_EXECUTION_HARNESS_STOP_IDS_V1),
        declarations,
        next_gate: DOCKER_LOCAL_RUNTIME_PROOF_NEXT_GATE_V1.to_owned(),
    };
    validate_manifest_v1(&manifest)?;
    Ok(manifest)
}

fn finalize_manifest_v1(
    proof_plan: &DockerLocalRuntimeProofPlanOutputV1,
    requirements: &DockerLocalRuntimeProofEvidenceRequirementsOutputV1,
    harness: &DockerLocalRuntimeProofExecutionHarnessOutputV1,
    manifest: DockerLocalRuntimeProofRunManifestV1,
) -> Result<DockerLocalRuntimeProofRunManifestOutputV1, DockerLocalRuntimeProofRunManifestErrorV1> {
    if manifest.bindings.proof_plan_digest != proof_plan.digest_text()
        || manifest.bindings.evidence_requirements_digest != requirements.digest_text()
        || manifest.bindings.execution_harness_digest != harness.digest_text()
    {
        return Err(DockerLocalRuntimeProofRunManifestErrorV1::ManifestInvalid);
    }
    validate_manifest_v1(&manifest)?;
    let value = serde_json::to_value(&manifest)
        .map_err(|_| DockerLocalRuntimeProofRunManifestErrorV1::CanonicalizationFailed)?;
    let canonical_json = canonical_json_value_v1(&value)
        .map_err(|()| DockerLocalRuntimeProofRunManifestErrorV1::CanonicalizationFailed)?;
    let digest = digest_fields_v1(RUN_MANIFEST_DIGEST_DOMAIN_V1, &[canonical_json.as_bytes()]);
    Ok(DockerLocalRuntimeProofRunManifestOutputV1 {
        manifest,
        canonical_json,
        digest,
    })
}

fn validate_manifest_v1(
    manifest: &DockerLocalRuntimeProofRunManifestV1,
) -> Result<(), DockerLocalRuntimeProofRunManifestErrorV1> {
    let b = &manifest.bindings;
    let source = &manifest.source;
    let d = &manifest.declarations;
    let exact = |values: &[&str]| strings_v1(values);
    if manifest.schema_id != DOCKER_LOCAL_RUNTIME_PROOF_RUN_MANIFEST_SCHEMA_ID_V1
        || manifest.contract_version != CONTRACT_VERSION_V1_0
        || manifest.schema_version != 1
        || manifest.status != PROPOSED_SOURCE_ONLY_STATUS_V1
        || manifest.phase11_complete
        || manifest.execution_authorized
        || manifest.real_docker_proof
        || manifest.production_supported
        || manifest.contract.contract_id != DOCKER_LOCAL_RUNTIME_PROOF_RUN_MANIFEST_CONTRACT_ID_V1
        || manifest.contract.output != "canonical_private_run_manifest_digest"
        || !manifest.contract.side_effects.is_empty()
        || manifest.contract.runtime_execution
        || manifest.contract.proves_human_authority
        || !valid_sha256_v1(&b.proof_plan_digest)
        || !valid_sha256_v1(&b.evidence_requirements_digest)
        || !valid_sha256_v1(&b.execution_harness_digest)
        || !valid_sha256_v1(&b.profile_digest)
        || !valid_sha256_v1(&b.authority_configuration_digest)
        || !valid_sha256_v1(&b.adapter_executable_digest)
        || !valid_sha256_v1(&b.image_digest)
        || !valid_sha256_v1(&b.launch_contract_digest)
        || !valid_absolute_path_v1(&source.repository_absolute_path)
        || !valid_sha256_v1(&source.repository_identity_digest)
        || !valid_git_revision_v1(&source.revision)
        || !valid_sha256_v1(&source.proof_driver_executable_digest)
        || d.image.immutable_digest != b.image_digest
        || d.image.in_image_adapter_digest != b.adapter_executable_digest
        || manifest.required_plan_binding_ids
            != exact(&DOCKER_LOCAL_RUNTIME_PROOF_EXECUTION_HARNESS_REQUIRED_PLAN_BINDING_IDS_V1)
        || manifest.required_case_ids
            != exact(
                &crate::docker_local_runtime_proof::DOCKER_LOCAL_RUNTIME_PROOF_REQUIRED_CASE_IDS_V1,
            )
        || manifest.required_observation_commitment_ids
            != exact(&DOCKER_LOCAL_RUNTIME_PROOF_REQUIRED_OBSERVATION_COMMITMENT_IDS_V1)
        || manifest.preflight_rejection_ids
            != exact(&DOCKER_LOCAL_RUNTIME_PROOF_PREFLIGHT_REJECTION_IDS_V1)
        || manifest.postspawn_outcome_unknown_ids
            != exact(&DOCKER_LOCAL_RUNTIME_PROOF_POSTSPAWN_OUTCOME_UNKNOWN_IDS_V1)
        || manifest.forbidden_public_evidence_fields
            != exact(&DOCKER_LOCAL_RUNTIME_PROOF_FORBIDDEN_PUBLIC_EVIDENCE_FIELDS_V1)
        || manifest.authority_declaration_ids
            != exact(&DOCKER_LOCAL_RUNTIME_PROOF_EXECUTION_HARNESS_AUTHORITY_DECLARATION_IDS_V1)
        || manifest.authority_stop_ids
            != exact(&DOCKER_LOCAL_RUNTIME_PROOF_EXECUTION_HARNESS_STOP_IDS_V1)
        || manifest.next_gate != DOCKER_LOCAL_RUNTIME_PROOF_NEXT_GATE_V1
        || !valid_declarations_v1(d)
        || path_is_within_v1(
            &d.private_evidence.absolute_location,
            &source.repository_absolute_path,
        )
    {
        return Err(DockerLocalRuntimeProofRunManifestErrorV1::ManifestInvalid);
    }
    Ok(())
}

fn valid_declarations_v1(d: &DockerLocalRuntimeProofRunManifestSourceInputV1) -> bool {
    let Some(run_window_start) = utc_epoch_seconds_v1(&d.run_window.not_before_utc) else {
        return false;
    };
    let Some(run_window_end) = utc_epoch_seconds_v1(&d.run_window.not_after_utc) else {
        return false;
    };
    valid_nonce_v1(&d.run_nonce)
        && run_window_end > run_window_start
        && run_window_end - run_window_start <= MAX_DOCKER_LOCAL_RUNTIME_PROOF_RUN_WINDOW_SECONDS_V1
        && valid_bounded_text_v1(&d.human_authority_reference)
        && valid_sha256_v1(&d.host_identity_digest)
        && valid_path_identity_v1(&d.docker_client)
        && valid_path_identity_v1(&d.local_unix_endpoint)
        && valid_sha256_v1(&d.daemon.identity_digest)
        && valid_bounded_text_v1(&d.daemon.api_version)
        && valid_bounded_text_v1(&d.daemon.runtime_version)
        && valid_sha256_v1(&d.daemon.platform_digest)
        && valid_sha256_v1(&d.daemon.security_posture_digest)
        && valid_sha256_v1(&d.image.immutable_digest)
        && valid_sha256_v1(&d.image.provenance_digest)
        && valid_sha256_v1(&d.image.platform_digest)
        && valid_sha256_v1(&d.image.configuration_digest)
        && valid_sha256_v1(&d.image.entrypoint_digest)
        && valid_absolute_path_v1(&d.image.in_image_adapter_absolute_path)
        && valid_sha256_v1(&d.image.in_image_adapter_digest)
        && d.image.pull_policy == "never"
        && valid_absolute_path_v1(&d.disposable_target.owner_only_disposable_root)
        && valid_absolute_path_v1(&d.disposable_target.repository_absolute_path)
        && valid_absolute_path_v1(&d.disposable_target.marker_absolute_path)
        && path_is_strict_descendant_v1(
            &d.disposable_target.repository_absolute_path,
            &d.disposable_target.owner_only_disposable_root,
        )
        && path_is_strict_descendant_v1(
            &d.disposable_target.marker_absolute_path,
            &d.disposable_target.repository_absolute_path,
        )
        && valid_git_revision_v1(&d.disposable_target.base_revision)
        && valid_sha256_v1(&d.disposable_target.ownership_mode_identity_digest)
        && valid_sha256_v1(&d.disposable_target.repository_identity_digest)
        && valid_sha256_v1(&d.disposable_target.marker_digest)
        && valid_sha256_v1(&d.disposable_target.target_identity_digest)
        && valid_path_identity_v1(&d.host_git_verifier)
        && valid_sha256_v1(&d.served_chain_digest)
        && valid_absolute_path_v1(&d.private_evidence.absolute_location)
        && !path_is_within_v1(
            &d.private_evidence.absolute_location,
            &d.disposable_target.repository_absolute_path,
        )
        && valid_sha256_v1(&d.private_evidence.custody_digest)
        && valid_sha256_v1(&d.private_evidence.redaction_digest)
        && valid_sha256_v1(&d.private_evidence.cleanup_digest)
        && valid_sha256_v1(&d.private_evidence.rollback_digest)
        && valid_bounded_text_v1(&d.independent_reviewer_reference)
        && valid_sha256_v1(&d.independent_reviewer_digest)
        && d.observation_permissions
            == strings_v1(&DOCKER_LOCAL_RUNTIME_PROOF_RUN_MANIFEST_OBSERVATION_PERMISSIONS_V1)
        && d.execution_permissions
            == strings_v1(&DOCKER_LOCAL_RUNTIME_PROOF_RUN_MANIFEST_EXECUTION_PERMISSIONS_V1)
}

fn valid_path_identity_v1(value: &DockerLocalRuntimeProofPathIdentityV1) -> bool {
    valid_absolute_path_v1(&value.absolute_path)
        && valid_sha256_v1(&value.digest)
        && valid_sha256_v1(&value.stable_identity_digest)
}
fn valid_absolute_path_v1(value: &str) -> bool {
    value.len() > 1
        && value.starts_with('/')
        && !value.ends_with('/')
        && !value.contains("//")
        && !value
            .bytes()
            .any(|byte| byte == 0 || byte.is_ascii_control())
        && !value[1..]
            .split('/')
            .any(|part| part.is_empty() || part == "." || part == "..")
}
fn path_is_strict_descendant_v1(candidate: &str, parent: &str) -> bool {
    candidate.len() > parent.len()
        && candidate.starts_with(parent)
        && candidate.as_bytes().get(parent.len()) == Some(&b'/')
}
fn path_is_within_v1(candidate: &str, parent: &str) -> bool {
    candidate == parent || path_is_strict_descendant_v1(candidate, parent)
}
fn valid_bounded_text_v1(value: &str) -> bool {
    !value.trim().is_empty()
        && value.len() <= 512
        && !value
            .bytes()
            .any(|byte| byte == 0 || byte.is_ascii_control())
}
fn valid_nonce_v1(value: &str) -> bool {
    value.len() >= 16
        && value.len() <= 128
        && value
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || byte == b'-' || byte == b'_')
}
fn valid_git_revision_v1(value: &str) -> bool {
    value.len() == 40
        && value
            .bytes()
            .all(|byte| byte.is_ascii_digit() || (b'a'..=b'f').contains(&byte))
}
fn utc_epoch_seconds_v1(value: &str) -> Option<u64> {
    if value.len() != 20
        || value.as_bytes().get(4) != Some(&b'-')
        || value.as_bytes().get(7) != Some(&b'-')
        || value.as_bytes().get(10) != Some(&b'T')
        || value.as_bytes().get(13) != Some(&b':')
        || value.as_bytes().get(16) != Some(&b':')
        || !value.ends_with('Z')
    {
        return None;
    }
    let parse = |start, end| {
        value
            .get(start..end)
            .and_then(|piece| piece.parse::<u32>().ok())
    };
    let (Some(year), Some(month), Some(day), Some(hour), Some(minute), Some(second)) = (
        parse(0, 4),
        parse(5, 7),
        parse(8, 10),
        parse(11, 13),
        parse(14, 16),
        parse(17, 19),
    ) else {
        return None;
    };
    let leap = year % 4 == 0 && (year % 100 != 0 || year % 400 == 0);
    let days = match month {
        1 | 3 | 5 | 7 | 8 | 10 | 12 => 31,
        4 | 6 | 9 | 11 => 30,
        2 if leap => 29,
        2 => 28,
        _ => return None,
    };
    if year < 1970 || day < 1 || day > days || hour >= 24 || minute >= 60 || second >= 60 {
        return None;
    }
    let prior_year_days = (1970..year).map(days_in_year_v1).sum::<u64>();
    let prior_month_days = (1..month)
        .map(|prior_month| days_in_month_v1(year, prior_month))
        .sum::<Option<u64>>()?;
    let days_since_epoch = prior_year_days + prior_month_days + u64::from(day - 1);
    Some(
        days_since_epoch * 86_400
            + u64::from(hour) * 3_600
            + u64::from(minute) * 60
            + u64::from(second),
    )
}
fn days_in_year_v1(year: u32) -> u64 {
    if is_leap_year_v1(year) { 366 } else { 365 }
}
fn days_in_month_v1(year: u32, month: u32) -> Option<u64> {
    Some(match month {
        1 | 3 | 5 | 7 | 8 | 10 | 12 => 31,
        4 | 6 | 9 | 11 => 30,
        2 if is_leap_year_v1(year) => 29,
        2 => 28,
        _ => return None,
    })
}
fn is_leap_year_v1(year: u32) -> bool {
    year.is_multiple_of(4) && (!year.is_multiple_of(100) || year.is_multiple_of(400))
}
fn valid_sha256_v1(value: &str) -> bool {
    value.strip_prefix("sha256:").is_some_and(|hex| {
        hex.len() == 64
            && hex
                .bytes()
                .all(|byte| byte.is_ascii_digit() || (b'a'..=b'f').contains(&byte))
    })
}
fn strings_v1(values: &[&str]) -> Vec<String> {
    values.iter().map(|value| (*value).to_owned()).collect()
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
fn validate_json_nesting_v1(text: &str) -> Result<(), DockerLocalRuntimeProofRunManifestErrorV1> {
    let mut depth = 0_usize;
    let mut quoted = false;
    let mut escaped = false;
    for byte in text.bytes() {
        if quoted {
            if escaped {
                escaped = false;
            } else if byte == b'\\' {
                escaped = true;
            } else if byte == b'"' {
                quoted = false;
            }
            continue;
        }
        match byte {
            b'"' => quoted = true,
            b'{' | b'[' => {
                depth += 1;
                if depth > MAX_DOCKER_LOCAL_RUNTIME_PROOF_RUN_MANIFEST_JSON_NESTING_V1 {
                    return Err(DockerLocalRuntimeProofRunManifestErrorV1::ManifestTooDeep);
                }
            }
            b'}' | b']' => depth = depth.saturating_sub(1),
            _ => {}
        }
    }
    Ok(())
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
        formatter.write_str("unique JSON value")
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
    fn visit_f64<E>(self, value: f64) -> Result<Self::Value, E>
    where
        E: serde::de::Error,
    {
        Number::from_f64(value)
            .map(Value::Number)
            .map(UniqueJsonValueV1)
            .ok_or_else(|| E::custom("invalid number"))
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
            if values.insert(key.clone(), value.0).is_some() {
                return Err(serde::de::Error::custom(format!("duplicate key: {key}")));
            }
        }
        Ok(UniqueJsonValueV1(Value::Object(values)))
    }
}
