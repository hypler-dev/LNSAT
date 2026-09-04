//! Source-only P11 Docker-local runtime-proof evidence requirements contract.
//!
//! This module derives and verifies canonical requirements for a separately
//! authorized future Docker proof. It performs no process, socket, filesystem,
//! Git, store, route, receipt, Docker, or runtime-evidence work.

use crate::adapter_process_protocol::canonical_json_value_v1;
use crate::docker_local_runtime_proof::{
    DOCKER_LOCAL_RUNTIME_PROOF_NEXT_GATE_V1, DOCKER_LOCAL_RUNTIME_PROOF_REQUIRED_BINDINGS_V1,
    DOCKER_LOCAL_RUNTIME_PROOF_REQUIRED_CASE_IDS_V1, DockerLocalRuntimeProofPlanOutputV1,
};
use lnsat_contracts::CONTRACT_VERSION_V1_0;
use serde::de::{MapAccess, SeqAccess, Visitor};
use serde::{Deserialize, Deserializer, Serialize};
use serde_json::{Map, Number, Value};
use sha2::{Digest, Sha256};
use std::fmt;

/// Exact source-only evidence-requirements contract identity.
pub const DOCKER_LOCAL_RUNTIME_PROOF_EVIDENCE_REQUIREMENTS_CONTRACT_ID_V1: &str =
    "lnsat.docker_local_runtime_proof_evidence_requirements.v1";
/// Exact schema identity for canonical evidence requirements.
pub const DOCKER_LOCAL_RUNTIME_PROOF_EVIDENCE_REQUIREMENTS_SCHEMA_ID_V1: &str =
    "lnsat.phase11_docker_local_runtime_proof_evidence_requirements.schema.v1_0";
/// Maximum canonical evidence-requirements bytes.
pub const MAX_DOCKER_LOCAL_RUNTIME_PROOF_EVIDENCE_REQUIREMENTS_BYTES_V1: usize = 16 * 1024;
/// Maximum JSON object/array nesting accepted before typed or canonical parsing.
pub const MAX_DOCKER_LOCAL_RUNTIME_PROOF_EVIDENCE_REQUIREMENTS_JSON_NESTING_V1: usize = 64;

/// Exact current proof-plan bindings that requirements inherit without widening.
pub const DOCKER_LOCAL_RUNTIME_PROOF_EVIDENCE_REQUIRED_PLAN_BINDING_IDS_V1: [&str; 7] =
    DOCKER_LOCAL_RUNTIME_PROOF_REQUIRED_BINDINGS_V1;
/// Exact future cases inherited from the current proof plan.
pub const DOCKER_LOCAL_RUNTIME_PROOF_EVIDENCE_REQUIRED_CASE_IDS_V1: [&str; 8] =
    DOCKER_LOCAL_RUNTIME_PROOF_REQUIRED_CASE_IDS_V1;

/// Exact redacted commitment identities required from a later external proof.
pub const DOCKER_LOCAL_RUNTIME_PROOF_REQUIRED_OBSERVATION_COMMITMENT_IDS_V1: [&str; 15] = [
    "proof_plan_digest",
    "docker_cli_identity",
    "verifier_git_identity",
    "endpoint_file_identity",
    "daemon_version_api_security_posture",
    "immutable_image_provenance_platform",
    "in_image_adapter_executable_entrypoint",
    "disposable_root_repository_git_directory_identity",
    "gateway_d4b2a_d3_d4a_launch_identity_chain",
    "runtime_isolation_lifecycle",
    "host_git_adapter_result_binding",
    "receipt_or_outcome_unknown_transition",
    "restart_reconciliation",
    "operation_bound_cleanup",
    "independent_review",
];

/// Exact preflight failures that a later proof must record as rejected.
pub const DOCKER_LOCAL_RUNTIME_PROOF_PREFLIGHT_REJECTION_IDS_V1: [&str; 7] = [
    "endpoint_or_daemon_swap_or_drift",
    "unsafe_disposable_target_ownership_mode_or_replacement",
    "image_provenance_or_adapter_mismatch",
    "gateway_chain_bypass",
    "security_posture_drift",
    "cleanup_policy_or_label_contract_invalid",
    "public_evidence_redaction_failure",
];

/// Exact post-spawn outcomes that remain unknown until a later proof resolves them.
pub const DOCKER_LOCAL_RUNTIME_PROOF_POSTSPAWN_OUTCOME_UNKNOWN_IDS_V1: [&str; 8] = [
    "timeout_or_disconnect",
    "output_or_result_anomaly",
    "runtime_or_target_identity_drift",
    "adapter_or_host_git_mismatch",
    "receipt_persistence_uncertainty",
    "container_identity_or_label_mismatch",
    "inspection_or_removal_uncertainty",
    "incomplete_or_redaction_invalid_evidence",
];

/// Exact field names forbidden from public proof evidence.
pub const DOCKER_LOCAL_RUNTIME_PROOF_FORBIDDEN_PUBLIC_EVIDENCE_FIELDS_V1: [&str; 20] = [
    "host_path",
    "socket_path",
    "docker_config_path",
    "repository_path",
    "git_directory_path",
    "raw_container_id",
    "raw_command",
    "raw_arguments",
    "raw_stdout",
    "raw_stderr",
    "canonical_request_frame",
    "canonical_result_frame",
    "source_bytes",
    "patch_bytes",
    "credential",
    "capability_value",
    "session_value",
    "csrf_value",
    "environment_value",
    "private_registry_configuration",
];

const EVIDENCE_REQUIREMENTS_DIGEST_DOMAIN_V1: &[u8] =
    b"lnsat.docker-local-runtime-proof-evidence-requirements.v1";
const PROPOSED_SOURCE_ONLY_STATUS_V1: &str = "proposed_source_only_no_runtime_evidence";

/// Closed source-plan bindings copied exactly from a current proof plan.
#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct DockerLocalRuntimeProofEvidenceRequirementsBindingsV1 {
    pub proof_plan_digest: String,
    pub profile_digest: String,
    pub authority_configuration_digest: String,
    pub adapter_ref: String,
    pub adapter_version: String,
    pub adapter_executable_digest: String,
    pub image_digest: String,
    pub launch_contract_digest: String,
}

/// Closed descriptive contract. It carries requirements, never runtime evidence.
#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct DockerLocalRuntimeProofEvidenceContractV1 {
    pub contract_id: String,
    pub output: String,
    pub side_effects: Vec<String>,
    pub runtime_execution: bool,
}

/// Canonical requirements for later externally held proof evidence.
#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
#[allow(clippy::struct_excessive_bools)]
pub struct DockerLocalRuntimeProofEvidenceRequirementsV1 {
    pub schema_id: String,
    pub contract_version: String,
    pub schema_version: u32,
    pub status: String,
    pub phase11_complete: bool,
    pub execution_authorized: bool,
    pub real_docker_proof: bool,
    pub production_supported: bool,
    pub contract: DockerLocalRuntimeProofEvidenceContractV1,
    pub bindings: DockerLocalRuntimeProofEvidenceRequirementsBindingsV1,
    pub required_case_ids: Vec<String>,
    pub required_observation_commitment_ids: Vec<String>,
    pub preflight_rejection_ids: Vec<String>,
    pub postspawn_outcome_unknown_ids: Vec<String>,
    pub forbidden_public_evidence_fields: Vec<String>,
    pub next_gate: String,
}

/// Parsed canonical requirements plus opaque deterministic digest.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct DockerLocalRuntimeProofEvidenceRequirementsOutputV1 {
    requirements: DockerLocalRuntimeProofEvidenceRequirementsV1,
    canonical_json: String,
    digest: [u8; 32],
}

impl DockerLocalRuntimeProofEvidenceRequirementsOutputV1 {
    /// Returns closed source-only requirements for inspection.
    #[must_use]
    pub const fn requirements(&self) -> &DockerLocalRuntimeProofEvidenceRequirementsV1 {
        &self.requirements
    }

    /// Returns exact canonical requirements JSON without a frame delimiter.
    #[must_use]
    pub fn canonical_json(&self) -> &str {
        &self.canonical_json
    }

    /// Returns opaque domain-separated requirements digest bytes.
    #[must_use]
    pub const fn digest(&self) -> [u8; 32] {
        self.digest
    }

    /// Returns stable prefixed opaque requirements digest text.
    #[must_use]
    pub fn digest_text(&self) -> String {
        prefixed_sha256_v1(&self.digest)
    }
}

/// Stable code-only evidence-requirements failures.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum DockerLocalRuntimeProofEvidenceRequirementsErrorV1 {
    InputInvalid,
    RequirementsTooLarge,
    RequirementsTooDeep,
    RequirementsInvalid,
    CanonicalizationFailed,
}

impl DockerLocalRuntimeProofEvidenceRequirementsErrorV1 {
    /// Returns stable machine-safe error code.
    #[must_use]
    pub const fn code(self) -> &'static str {
        match self {
            Self::InputInvalid => "docker_local_runtime_proof_evidence.input_invalid",
            Self::RequirementsTooLarge => {
                "docker_local_runtime_proof_evidence.requirements_too_large"
            }
            Self::RequirementsTooDeep => {
                "docker_local_runtime_proof_evidence.requirements_too_deep"
            }
            Self::RequirementsInvalid => "docker_local_runtime_proof_evidence.requirements_invalid",
            Self::CanonicalizationFailed => {
                "docker_local_runtime_proof_evidence.canonicalization_failed"
            }
        }
    }
}

impl fmt::Display for DockerLocalRuntimeProofEvidenceRequirementsErrorV1 {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(self.code())
    }
}

impl std::error::Error for DockerLocalRuntimeProofEvidenceRequirementsErrorV1 {}

/// Builds canonical source-only evidence requirements from one current proof plan.
///
/// Success does not authorize execution, collect evidence, access Docker, or
/// claim a runtime result, receipt, completion, or support.
///
/// # Errors
///
/// Rejects plans that do not retain the exact closed readiness boundary.
pub fn build_docker_local_runtime_proof_evidence_requirements_v1(
    proof_plan: &DockerLocalRuntimeProofPlanOutputV1,
) -> Result<
    DockerLocalRuntimeProofEvidenceRequirementsOutputV1,
    DockerLocalRuntimeProofEvidenceRequirementsErrorV1,
> {
    let plan = proof_plan.plan();
    let requirements = DockerLocalRuntimeProofEvidenceRequirementsV1 {
        schema_id: DOCKER_LOCAL_RUNTIME_PROOF_EVIDENCE_REQUIREMENTS_SCHEMA_ID_V1.to_owned(),
        contract_version: CONTRACT_VERSION_V1_0.to_owned(),
        schema_version: 1,
        status: PROPOSED_SOURCE_ONLY_STATUS_V1.to_owned(),
        phase11_complete: false,
        execution_authorized: false,
        real_docker_proof: false,
        production_supported: false,
        contract: DockerLocalRuntimeProofEvidenceContractV1 {
            contract_id: DOCKER_LOCAL_RUNTIME_PROOF_EVIDENCE_REQUIREMENTS_CONTRACT_ID_V1.to_owned(),
            output: "canonical_source_only_evidence_requirements_digest".to_owned(),
            side_effects: Vec::new(),
            runtime_execution: false,
        },
        bindings: DockerLocalRuntimeProofEvidenceRequirementsBindingsV1 {
            proof_plan_digest: proof_plan.digest_text(),
            profile_digest: plan.bindings.profile_digest.clone(),
            authority_configuration_digest: plan.bindings.authority_configuration_digest.clone(),
            adapter_ref: plan.bindings.adapter_ref.clone(),
            adapter_version: plan.bindings.adapter_version.clone(),
            adapter_executable_digest: plan.bindings.adapter_executable_digest.clone(),
            image_digest: plan.bindings.image_digest.clone(),
            launch_contract_digest: plan.bindings.launch_contract_digest.clone(),
        },
        required_case_ids: DOCKER_LOCAL_RUNTIME_PROOF_EVIDENCE_REQUIRED_CASE_IDS_V1
            .iter()
            .map(|value| (*value).to_owned())
            .collect(),
        required_observation_commitment_ids:
            DOCKER_LOCAL_RUNTIME_PROOF_REQUIRED_OBSERVATION_COMMITMENT_IDS_V1
                .iter()
                .map(|value| (*value).to_owned())
                .collect(),
        preflight_rejection_ids: DOCKER_LOCAL_RUNTIME_PROOF_PREFLIGHT_REJECTION_IDS_V1
            .iter()
            .map(|value| (*value).to_owned())
            .collect(),
        postspawn_outcome_unknown_ids: DOCKER_LOCAL_RUNTIME_PROOF_POSTSPAWN_OUTCOME_UNKNOWN_IDS_V1
            .iter()
            .map(|value| (*value).to_owned())
            .collect(),
        forbidden_public_evidence_fields:
            DOCKER_LOCAL_RUNTIME_PROOF_FORBIDDEN_PUBLIC_EVIDENCE_FIELDS_V1
                .iter()
                .map(|value| (*value).to_owned())
                .collect(),
        next_gate: DOCKER_LOCAL_RUNTIME_PROOF_NEXT_GATE_V1.to_owned(),
    };
    finalize_requirements_v1(proof_plan, requirements)
}

/// Parses one exact canonical source-only evidence-requirements document.
///
/// # Errors
///
/// Rejects oversize, malformed, duplicate-key, unknown-field, noncanonical,
/// status, binding, case, commitment, rejection, forbidden-field, or gate drift.
pub fn parse_docker_local_runtime_proof_evidence_requirements_v1(
    proof_plan: &DockerLocalRuntimeProofPlanOutputV1,
    bytes: &[u8],
) -> Result<
    DockerLocalRuntimeProofEvidenceRequirementsOutputV1,
    DockerLocalRuntimeProofEvidenceRequirementsErrorV1,
> {
    if bytes.len() > MAX_DOCKER_LOCAL_RUNTIME_PROOF_EVIDENCE_REQUIREMENTS_BYTES_V1 {
        return Err(DockerLocalRuntimeProofEvidenceRequirementsErrorV1::RequirementsTooLarge);
    }
    let expected = build_docker_local_runtime_proof_evidence_requirements_v1(proof_plan)?;
    let text = std::str::from_utf8(bytes)
        .map_err(|_| DockerLocalRuntimeProofEvidenceRequirementsErrorV1::RequirementsInvalid)?;
    validate_json_nesting_v1(text)?;
    let unique: UniqueJsonValueV1 = serde_json::from_str(text)
        .map_err(|_| DockerLocalRuntimeProofEvidenceRequirementsErrorV1::RequirementsInvalid)?;
    let requirements: DockerLocalRuntimeProofEvidenceRequirementsV1 =
        serde_json::from_value(unique.0)
            .map_err(|_| DockerLocalRuntimeProofEvidenceRequirementsErrorV1::RequirementsInvalid)?;
    if text != expected.canonical_json() || requirements != *expected.requirements() {
        return Err(DockerLocalRuntimeProofEvidenceRequirementsErrorV1::RequirementsInvalid);
    }
    Ok(expected)
}

fn finalize_requirements_v1(
    proof_plan: &DockerLocalRuntimeProofPlanOutputV1,
    requirements: DockerLocalRuntimeProofEvidenceRequirementsV1,
) -> Result<
    DockerLocalRuntimeProofEvidenceRequirementsOutputV1,
    DockerLocalRuntimeProofEvidenceRequirementsErrorV1,
> {
    validate_requirements_v1(proof_plan, &requirements)?;
    let value = serde_json::to_value(&requirements)
        .map_err(|_| DockerLocalRuntimeProofEvidenceRequirementsErrorV1::CanonicalizationFailed)?;
    let canonical_json = canonical_json_value_v1(&value)
        .map_err(|()| DockerLocalRuntimeProofEvidenceRequirementsErrorV1::CanonicalizationFailed)?;
    let digest = digest_fields_v1(
        EVIDENCE_REQUIREMENTS_DIGEST_DOMAIN_V1,
        &[canonical_json.as_bytes()],
    );
    Ok(DockerLocalRuntimeProofEvidenceRequirementsOutputV1 {
        requirements,
        canonical_json,
        digest,
    })
}

fn validate_requirements_v1(
    proof_plan: &DockerLocalRuntimeProofPlanOutputV1,
    requirements: &DockerLocalRuntimeProofEvidenceRequirementsV1,
) -> Result<(), DockerLocalRuntimeProofEvidenceRequirementsErrorV1> {
    let plan = proof_plan.plan();
    let bindings = &requirements.bindings;
    let exact_cases: Vec<String> = DOCKER_LOCAL_RUNTIME_PROOF_EVIDENCE_REQUIRED_CASE_IDS_V1
        .iter()
        .map(|value| (*value).to_owned())
        .collect();
    let exact_observations: Vec<String> =
        DOCKER_LOCAL_RUNTIME_PROOF_REQUIRED_OBSERVATION_COMMITMENT_IDS_V1
            .iter()
            .map(|value| (*value).to_owned())
            .collect();
    let exact_rejections: Vec<String> = DOCKER_LOCAL_RUNTIME_PROOF_PREFLIGHT_REJECTION_IDS_V1
        .iter()
        .map(|value| (*value).to_owned())
        .collect();
    let exact_postspawn_outcome_unknowns: Vec<String> =
        DOCKER_LOCAL_RUNTIME_PROOF_POSTSPAWN_OUTCOME_UNKNOWN_IDS_V1
            .iter()
            .map(|value| (*value).to_owned())
            .collect();
    let exact_forbidden: Vec<String> =
        DOCKER_LOCAL_RUNTIME_PROOF_FORBIDDEN_PUBLIC_EVIDENCE_FIELDS_V1
            .iter()
            .map(|value| (*value).to_owned())
            .collect();
    if requirements.schema_id != DOCKER_LOCAL_RUNTIME_PROOF_EVIDENCE_REQUIREMENTS_SCHEMA_ID_V1
        || requirements.contract_version != CONTRACT_VERSION_V1_0
        || requirements.schema_version != 1
        || requirements.status != PROPOSED_SOURCE_ONLY_STATUS_V1
        || requirements.phase11_complete
        || requirements.execution_authorized
        || requirements.real_docker_proof
        || requirements.production_supported
        || requirements.contract.contract_id
            != DOCKER_LOCAL_RUNTIME_PROOF_EVIDENCE_REQUIREMENTS_CONTRACT_ID_V1
        || requirements.contract.output != "canonical_source_only_evidence_requirements_digest"
        || !requirements.contract.side_effects.is_empty()
        || requirements.contract.runtime_execution
        || bindings.proof_plan_digest != proof_plan.digest_text()
        || !valid_sha256_v1(&bindings.proof_plan_digest)
        || bindings.profile_digest != plan.bindings.profile_digest
        || bindings.authority_configuration_digest != plan.bindings.authority_configuration_digest
        || bindings.adapter_ref != plan.bindings.adapter_ref
        || bindings.adapter_version != plan.bindings.adapter_version
        || bindings.adapter_executable_digest != plan.bindings.adapter_executable_digest
        || bindings.image_digest != plan.bindings.image_digest
        || bindings.launch_contract_digest != plan.bindings.launch_contract_digest
        || requirements.required_case_ids != exact_cases
        || requirements.required_case_ids != plan.required_case_ids
        || requirements.required_observation_commitment_ids != exact_observations
        || requirements.preflight_rejection_ids != exact_rejections
        || requirements.postspawn_outcome_unknown_ids != exact_postspawn_outcome_unknowns
        || requirements.forbidden_public_evidence_fields != exact_forbidden
        || requirements.next_gate != DOCKER_LOCAL_RUNTIME_PROOF_NEXT_GATE_V1
        || requirements.next_gate != plan.next_gate
    {
        return Err(DockerLocalRuntimeProofEvidenceRequirementsErrorV1::RequirementsInvalid);
    }
    Ok(())
}

fn valid_sha256_v1(value: &str) -> bool {
    value.strip_prefix("sha256:").is_some_and(|hex| {
        hex.len() == 64
            && hex
                .bytes()
                .all(|byte| byte.is_ascii_digit() || (b'a'..=b'f').contains(&byte))
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

fn validate_json_nesting_v1(
    text: &str,
) -> Result<(), DockerLocalRuntimeProofEvidenceRequirementsErrorV1> {
    let mut depth = 0_usize;
    let mut in_string = false;
    let mut escaped = false;
    for byte in text.bytes() {
        if in_string {
            if escaped {
                escaped = false;
            } else if byte == b'\\' {
                escaped = true;
            } else if byte == b'"' {
                in_string = false;
            }
            continue;
        }
        match byte {
            b'"' => in_string = true,
            b'{' | b'[' => {
                depth = depth.saturating_add(1);
                if depth > MAX_DOCKER_LOCAL_RUNTIME_PROOF_EVIDENCE_REQUIREMENTS_JSON_NESTING_V1 {
                    return Err(
                        DockerLocalRuntimeProofEvidenceRequirementsErrorV1::RequirementsTooDeep,
                    );
                }
            }
            b'}' | b']' => depth = depth.saturating_sub(1),
            _ => {}
        }
    }
    Ok(())
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
