//! Source-only P11 Docker-local runtime-proof execution-harness contract.
//!
//! This module binds already closed proof-plan and evidence-requirements
//! metadata for later human authorization. It performs no runtime work.

use crate::adapter_process_protocol::canonical_json_value_v1;
use crate::docker_local_runtime_proof::{
    DOCKER_LOCAL_RUNTIME_PROOF_NEXT_GATE_V1, DOCKER_LOCAL_RUNTIME_PROOF_REQUIRED_BINDINGS_V1,
    DockerLocalRuntimeProofPlanOutputV1,
};
use crate::docker_local_runtime_proof_evidence::{
    DOCKER_LOCAL_RUNTIME_PROOF_EVIDENCE_REQUIRED_CASE_IDS_V1,
    DOCKER_LOCAL_RUNTIME_PROOF_FORBIDDEN_PUBLIC_EVIDENCE_FIELDS_V1,
    DOCKER_LOCAL_RUNTIME_PROOF_POSTSPAWN_OUTCOME_UNKNOWN_IDS_V1,
    DOCKER_LOCAL_RUNTIME_PROOF_PREFLIGHT_REJECTION_IDS_V1,
    DOCKER_LOCAL_RUNTIME_PROOF_REQUIRED_OBSERVATION_COMMITMENT_IDS_V1,
    DockerLocalRuntimeProofEvidenceRequirementsOutputV1,
};
use lnsat_contracts::CONTRACT_VERSION_V1_0;
use serde::de::{MapAccess, SeqAccess, Visitor};
use serde::{Deserialize, Deserializer, Serialize};
use serde_json::{Map, Number, Value};
use sha2::{Digest, Sha256};
use std::fmt;

/// Exact source-only execution-harness contract identity.
pub const DOCKER_LOCAL_RUNTIME_PROOF_EXECUTION_HARNESS_CONTRACT_ID_V1: &str =
    "lnsat.docker_local_runtime_proof_execution_harness.v1";
/// Exact schema identity for canonical execution-harness metadata.
pub const DOCKER_LOCAL_RUNTIME_PROOF_EXECUTION_HARNESS_SCHEMA_ID_V1: &str =
    "lnsat.phase11_docker_local_runtime_proof_execution_harness.schema.v1_0";
/// Maximum canonical execution-harness bytes.
pub const MAX_DOCKER_LOCAL_RUNTIME_PROOF_EXECUTION_HARNESS_BYTES_V1: usize = 16 * 1024;
/// Maximum accepted JSON object or array nesting.
pub const MAX_DOCKER_LOCAL_RUNTIME_PROOF_EXECUTION_HARNESS_JSON_NESTING_V1: usize = 64;

/// Exact inherited proof-plan binding identities.
pub const DOCKER_LOCAL_RUNTIME_PROOF_EXECUTION_HARNESS_REQUIRED_PLAN_BINDING_IDS_V1: [&str; 7] =
    DOCKER_LOCAL_RUNTIME_PROOF_REQUIRED_BINDINGS_V1;
/// Exact execution declarations a later authority must name.
pub const DOCKER_LOCAL_RUNTIME_PROOF_EXECUTION_HARNESS_AUTHORITY_DECLARATION_IDS_V1: [&str; 10] = [
    "execution_host_and_run_window",
    "docker_client_path_and_digest",
    "docker_endpoint_local_unix_identity",
    "expected_daemon_identity_api_version_platform_security_posture",
    "prepositioned_image_digest_platform_provenance_configuration_entrypoint_adapter_executable_pull_never",
    "fresh_owner_only_disposable_root_and_marked_repository_identity",
    "host_git_verifier_path_and_digest",
    "served_gateway_d4b2a_d3_d4a_supervisor_chain_identity",
    "case_ids_evidence_location_redaction_cleanup_rollback_reviewer",
    "named_observation_and_execution_permissions",
];
/// Exact conditions that stop later authority.
pub const DOCKER_LOCAL_RUNTIME_PROOF_EXECUTION_HARNESS_STOP_IDS_V1: [&str; 7] = [
    "missing_identity",
    "base_or_source_movement",
    "mutable_image_resolution",
    "unexpected_network_need",
    "unsafe_target_state",
    "evidence_custody_ambiguity",
    "action_outside_named_run",
];

const EXECUTION_HARNESS_DIGEST_DOMAIN_V1: &[u8] =
    b"lnsat.docker-local-runtime-proof-execution-harness.v1";
const PROPOSED_SOURCE_ONLY_STATUS_V1: &str = "proposed_source_only_no_runtime_evidence";

/// Closed digest bindings inherited from the proof plan and evidence requirements.
#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct DockerLocalRuntimeProofExecutionHarnessBindingsV1 {
    pub proof_plan_digest: String,
    pub evidence_requirements_digest: String,
    pub profile_digest: String,
    pub authority_configuration_digest: String,
    pub adapter_ref: String,
    pub adapter_version: String,
    pub adapter_executable_digest: String,
    pub image_digest: String,
    pub launch_contract_digest: String,
}

/// Closed descriptive execution-harness contract.
#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct DockerLocalRuntimeProofExecutionHarnessContractV1 {
    pub contract_id: String,
    pub output: String,
    pub side_effects: Vec<String>,
    pub runtime_execution: bool,
}

/// Canonical execution-harness metadata for later separate authority only.
#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
#[allow(clippy::struct_excessive_bools)]
pub struct DockerLocalRuntimeProofExecutionHarnessV1 {
    pub schema_id: String,
    pub contract_version: String,
    pub schema_version: u32,
    pub status: String,
    pub phase11_complete: bool,
    pub execution_authorized: bool,
    pub real_docker_proof: bool,
    pub production_supported: bool,
    pub contract: DockerLocalRuntimeProofExecutionHarnessContractV1,
    pub bindings: DockerLocalRuntimeProofExecutionHarnessBindingsV1,
    pub required_plan_binding_ids: Vec<String>,
    pub required_case_ids: Vec<String>,
    pub required_observation_commitment_ids: Vec<String>,
    pub preflight_rejection_ids: Vec<String>,
    pub postspawn_outcome_unknown_ids: Vec<String>,
    pub forbidden_public_evidence_fields: Vec<String>,
    pub authority_declaration_ids: Vec<String>,
    pub authority_stop_ids: Vec<String>,
    pub next_gate: String,
}

/// Parsed canonical harness plus opaque deterministic digest.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct DockerLocalRuntimeProofExecutionHarnessOutputV1 {
    harness: DockerLocalRuntimeProofExecutionHarnessV1,
    canonical_json: String,
    digest: [u8; 32],
}

impl DockerLocalRuntimeProofExecutionHarnessOutputV1 {
    /// Returns closed source-only harness fields for inspection.
    #[must_use]
    pub const fn harness(&self) -> &DockerLocalRuntimeProofExecutionHarnessV1 {
        &self.harness
    }

    /// Returns exact canonical harness JSON without a frame delimiter.
    #[must_use]
    pub fn canonical_json(&self) -> &str {
        &self.canonical_json
    }

    /// Returns opaque domain-separated harness digest bytes.
    #[must_use]
    pub const fn digest(&self) -> [u8; 32] {
        self.digest
    }

    /// Returns stable prefixed opaque harness digest text.
    #[must_use]
    pub fn digest_text(&self) -> String {
        prefixed_sha256_v1(&self.digest)
    }
}

/// Stable machine-safe execution-harness failures.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum DockerLocalRuntimeProofExecutionHarnessErrorV1 {
    HarnessTooLarge,
    HarnessTooDeep,
    HarnessInvalid,
    CanonicalizationFailed,
}

impl DockerLocalRuntimeProofExecutionHarnessErrorV1 {
    /// Returns stable machine-safe error code.
    #[must_use]
    pub const fn code(self) -> &'static str {
        match self {
            Self::HarnessTooLarge => {
                "docker_local_runtime_proof_execution_harness.harness_too_large"
            }
            Self::HarnessTooDeep => "docker_local_runtime_proof_execution_harness.harness_too_deep",
            Self::HarnessInvalid => "docker_local_runtime_proof_execution_harness.harness_invalid",
            Self::CanonicalizationFailed => {
                "docker_local_runtime_proof_execution_harness.canonicalization_failed"
            }
        }
    }
}

impl fmt::Display for DockerLocalRuntimeProofExecutionHarnessErrorV1 {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(self.code())
    }
}

impl std::error::Error for DockerLocalRuntimeProofExecutionHarnessErrorV1 {}

/// Builds canonical source-only execution-harness metadata from closed inputs.
///
/// Success does not authorize execution, collect evidence, or claim a result,
/// receipt, completion, or support.
///
/// # Errors
///
/// Returns a closed validation or canonicalization error when either input
/// drifts from the reviewed proof-plan and evidence-requirements contracts.
pub fn build_docker_local_runtime_proof_execution_harness_v1(
    proof_plan: &DockerLocalRuntimeProofPlanOutputV1,
    evidence_requirements: &DockerLocalRuntimeProofEvidenceRequirementsOutputV1,
) -> Result<
    DockerLocalRuntimeProofExecutionHarnessOutputV1,
    DockerLocalRuntimeProofExecutionHarnessErrorV1,
> {
    validate_inputs_v1(proof_plan, evidence_requirements)?;
    let bindings = &evidence_requirements.requirements().bindings;
    finalize_harness_v1(DockerLocalRuntimeProofExecutionHarnessV1 {
        schema_id: DOCKER_LOCAL_RUNTIME_PROOF_EXECUTION_HARNESS_SCHEMA_ID_V1.to_owned(),
        contract_version: CONTRACT_VERSION_V1_0.to_owned(),
        schema_version: 1,
        status: PROPOSED_SOURCE_ONLY_STATUS_V1.to_owned(),
        phase11_complete: false,
        execution_authorized: false,
        real_docker_proof: false,
        production_supported: false,
        contract: DockerLocalRuntimeProofExecutionHarnessContractV1 {
            contract_id: DOCKER_LOCAL_RUNTIME_PROOF_EXECUTION_HARNESS_CONTRACT_ID_V1.to_owned(),
            output: "canonical_source_only_execution_harness_digest".to_owned(),
            side_effects: Vec::new(),
            runtime_execution: false,
        },
        bindings: DockerLocalRuntimeProofExecutionHarnessBindingsV1 {
            proof_plan_digest: proof_plan.digest_text(),
            evidence_requirements_digest: evidence_requirements.digest_text(),
            profile_digest: bindings.profile_digest.clone(),
            authority_configuration_digest: bindings.authority_configuration_digest.clone(),
            adapter_ref: bindings.adapter_ref.clone(),
            adapter_version: bindings.adapter_version.clone(),
            adapter_executable_digest: bindings.adapter_executable_digest.clone(),
            image_digest: bindings.image_digest.clone(),
            launch_contract_digest: bindings.launch_contract_digest.clone(),
        },
        required_plan_binding_ids: strings_v1(
            &DOCKER_LOCAL_RUNTIME_PROOF_EXECUTION_HARNESS_REQUIRED_PLAN_BINDING_IDS_V1,
        ),
        required_case_ids: strings_v1(&DOCKER_LOCAL_RUNTIME_PROOF_EVIDENCE_REQUIRED_CASE_IDS_V1),
        required_observation_commitment_ids: strings_v1(
            &DOCKER_LOCAL_RUNTIME_PROOF_REQUIRED_OBSERVATION_COMMITMENT_IDS_V1,
        ),
        preflight_rejection_ids: strings_v1(&DOCKER_LOCAL_RUNTIME_PROOF_PREFLIGHT_REJECTION_IDS_V1),
        postspawn_outcome_unknown_ids: strings_v1(
            &DOCKER_LOCAL_RUNTIME_PROOF_POSTSPAWN_OUTCOME_UNKNOWN_IDS_V1,
        ),
        forbidden_public_evidence_fields: strings_v1(
            &DOCKER_LOCAL_RUNTIME_PROOF_FORBIDDEN_PUBLIC_EVIDENCE_FIELDS_V1,
        ),
        authority_declaration_ids: strings_v1(
            &DOCKER_LOCAL_RUNTIME_PROOF_EXECUTION_HARNESS_AUTHORITY_DECLARATION_IDS_V1,
        ),
        authority_stop_ids: strings_v1(&DOCKER_LOCAL_RUNTIME_PROOF_EXECUTION_HARNESS_STOP_IDS_V1),
        next_gate: DOCKER_LOCAL_RUNTIME_PROOF_NEXT_GATE_V1.to_owned(),
    })
}

fn validate_inputs_v1(
    proof_plan: &DockerLocalRuntimeProofPlanOutputV1,
    evidence_requirements: &DockerLocalRuntimeProofEvidenceRequirementsOutputV1,
) -> Result<(), DockerLocalRuntimeProofExecutionHarnessErrorV1> {
    let plan = proof_plan.plan();
    let requirements = evidence_requirements.requirements();
    let bindings = &requirements.bindings;
    if requirements.status != PROPOSED_SOURCE_ONLY_STATUS_V1
        || requirements.phase11_complete
        || requirements.execution_authorized
        || requirements.real_docker_proof
        || requirements.production_supported
        || requirements.contract.side_effects != Vec::<String>::new()
        || requirements.contract.runtime_execution
        || bindings.proof_plan_digest != proof_plan.digest_text()
        || bindings.profile_digest != plan.bindings.profile_digest
        || bindings.authority_configuration_digest != plan.bindings.authority_configuration_digest
        || bindings.adapter_ref != plan.bindings.adapter_ref
        || bindings.adapter_version != plan.bindings.adapter_version
        || bindings.adapter_executable_digest != plan.bindings.adapter_executable_digest
        || bindings.image_digest != plan.bindings.image_digest
        || bindings.launch_contract_digest != plan.bindings.launch_contract_digest
        || requirements.required_case_ids != plan.required_case_ids
        || requirements.required_case_ids
            != strings_v1(&DOCKER_LOCAL_RUNTIME_PROOF_EVIDENCE_REQUIRED_CASE_IDS_V1)
        || requirements.required_observation_commitment_ids
            != strings_v1(&DOCKER_LOCAL_RUNTIME_PROOF_REQUIRED_OBSERVATION_COMMITMENT_IDS_V1)
        || requirements.preflight_rejection_ids
            != strings_v1(&DOCKER_LOCAL_RUNTIME_PROOF_PREFLIGHT_REJECTION_IDS_V1)
        || requirements.postspawn_outcome_unknown_ids
            != strings_v1(&DOCKER_LOCAL_RUNTIME_PROOF_POSTSPAWN_OUTCOME_UNKNOWN_IDS_V1)
        || requirements.forbidden_public_evidence_fields
            != strings_v1(&DOCKER_LOCAL_RUNTIME_PROOF_FORBIDDEN_PUBLIC_EVIDENCE_FIELDS_V1)
        || requirements.next_gate != plan.next_gate
        || requirements.next_gate != DOCKER_LOCAL_RUNTIME_PROOF_NEXT_GATE_V1
    {
        return Err(DockerLocalRuntimeProofExecutionHarnessErrorV1::HarnessInvalid);
    }
    Ok(())
}

/// Parses one exact canonical source-only execution-harness document.
///
/// # Errors
///
/// Rejects oversize, malformed, duplicate-key, over-nested, unknown-field,
/// noncanonical, binding, requirement, declaration, stop, or gate drift.
pub fn parse_docker_local_runtime_proof_execution_harness_v1(
    proof_plan: &DockerLocalRuntimeProofPlanOutputV1,
    evidence_requirements: &DockerLocalRuntimeProofEvidenceRequirementsOutputV1,
    bytes: &[u8],
) -> Result<
    DockerLocalRuntimeProofExecutionHarnessOutputV1,
    DockerLocalRuntimeProofExecutionHarnessErrorV1,
> {
    if bytes.len() > MAX_DOCKER_LOCAL_RUNTIME_PROOF_EXECUTION_HARNESS_BYTES_V1 {
        return Err(DockerLocalRuntimeProofExecutionHarnessErrorV1::HarnessTooLarge);
    }
    let expected =
        build_docker_local_runtime_proof_execution_harness_v1(proof_plan, evidence_requirements)?;
    let text = std::str::from_utf8(bytes)
        .map_err(|_| DockerLocalRuntimeProofExecutionHarnessErrorV1::HarnessInvalid)?;
    validate_json_nesting_v1(text)?;
    let unique: UniqueJsonValueV1 = serde_json::from_str(text)
        .map_err(|_| DockerLocalRuntimeProofExecutionHarnessErrorV1::HarnessInvalid)?;
    let harness: DockerLocalRuntimeProofExecutionHarnessV1 = serde_json::from_value(unique.0)
        .map_err(|_| DockerLocalRuntimeProofExecutionHarnessErrorV1::HarnessInvalid)?;
    if text != expected.canonical_json() || harness != *expected.harness() {
        return Err(DockerLocalRuntimeProofExecutionHarnessErrorV1::HarnessInvalid);
    }
    Ok(expected)
}

fn finalize_harness_v1(
    harness: DockerLocalRuntimeProofExecutionHarnessV1,
) -> Result<
    DockerLocalRuntimeProofExecutionHarnessOutputV1,
    DockerLocalRuntimeProofExecutionHarnessErrorV1,
> {
    let value = serde_json::to_value(&harness)
        .map_err(|_| DockerLocalRuntimeProofExecutionHarnessErrorV1::CanonicalizationFailed)?;
    let canonical_json = canonical_json_value_v1(&value)
        .map_err(|()| DockerLocalRuntimeProofExecutionHarnessErrorV1::CanonicalizationFailed)?;
    let digest = digest_fields_v1(
        EXECUTION_HARNESS_DIGEST_DOMAIN_V1,
        &[canonical_json.as_bytes()],
    );
    Ok(DockerLocalRuntimeProofExecutionHarnessOutputV1 {
        harness,
        canonical_json,
        digest,
    })
}

fn strings_v1(values: &[&str]) -> Vec<String> {
    values.iter().map(|value| (*value).to_owned()).collect()
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

fn validate_json_nesting_v1(
    text: &str,
) -> Result<(), DockerLocalRuntimeProofExecutionHarnessErrorV1> {
    let mut depth = 0usize;
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
                if depth > MAX_DOCKER_LOCAL_RUNTIME_PROOF_EXECUTION_HARNESS_JSON_NESTING_V1 {
                    return Err(DockerLocalRuntimeProofExecutionHarnessErrorV1::HarnessTooDeep);
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
