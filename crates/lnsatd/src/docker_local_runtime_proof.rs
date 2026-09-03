//! Source-only P11 Docker-local real-runtime proof-plan contract.
//!
//! This module derives and verifies deterministic readiness metadata for a
//! separately authorized future disposable Docker proof. It performs no Docker,
//! process, socket, Git, `SQLite`, filesystem, route, store, or receipt work.

use crate::adapter_process_protocol::canonical_json_value_v1;
use crate::docker_local_supervisor::docker_local_launch_contract_digest_v1;
use crate::runtime_profile::LoadedDockerLocalRuntimeProfileV1;
use lnsat_contracts::CONTRACT_VERSION_V1_0;
use serde::de::{MapAccess, SeqAccess, Visitor};
use serde::{Deserialize, Deserializer, Serialize};
use serde_json::{Map, Number, Value};
use sha2::{Digest, Sha256};
use std::fmt;

/// Exact source-only proof-plan contract identity.
pub const DOCKER_LOCAL_RUNTIME_PROOF_PLAN_CONTRACT_ID_V1: &str =
    "lnsat.docker_local_runtime_proof_plan.v1";
/// Exact schema identity for descriptive readiness fixtures and canonical plans.
pub const DOCKER_LOCAL_RUNTIME_PROOF_PLAN_SCHEMA_ID_V1: &str =
    "lnsat.phase11_docker_local_runtime_proof_plan.schema.v1_0";
/// Exact future gate. This module does not open it.
pub const DOCKER_LOCAL_RUNTIME_PROOF_NEXT_GATE_V1: &str =
    "separately_authorized_real_disposable_docker_image_and_runtime_proof";
/// Maximum canonical source-only proof plan bytes.
pub const MAX_DOCKER_LOCAL_RUNTIME_PROOF_PLAN_BYTES_V1: usize = 8 * 1024;

/// Exact binding names required before future runtime evidence may be assessed.
pub const DOCKER_LOCAL_RUNTIME_PROOF_REQUIRED_BINDINGS_V1: [&str; 7] = [
    "profile_digest",
    "authority_configuration_digest",
    "adapter_ref",
    "adapter_version",
    "adapter_executable_digest",
    "image_digest",
    "launch_contract_digest",
];

/// Exact future case identities. These describe gates; none is executed here.
pub const DOCKER_LOCAL_RUNTIME_PROOF_REQUIRED_CASE_IDS_V1: [&str; 8] = [
    "real_runtime_one_consequence_and_bound_receipt",
    "exact_replay_metadata_only_no_redispatch",
    "post_consequence_unknown_survives_restart",
    "reconciliation_host_git_inspection_only",
    "unchanged_target_unknown_without_receipt",
    "isolation_no_socket_credentials_or_network",
    "cleanup_verified_container_id_only",
    "runtime_and_image_identity_stable",
];

/// Exact fail-closed boundaries for this source-only readiness plan.
pub const DOCKER_LOCAL_RUNTIME_PROOF_HARD_STOPS_V1: [&str; 9] = [
    "no_docker_access_or_image_operation_in_readiness_packet",
    "no_agent_docker_socket_access",
    "no_production_or_user_repository",
    "no_git_push_fetch_remote_hook_or_unrestricted_shell",
    "no_runtime_retry_from_outcome_unknown",
    "no_route_config_or_public_selector",
    "no_receipt_or_runtime_result_persistence",
    "no_package_release_deploy_publication_or_support_claim",
    "no_phase11_completion_claim",
];

const PROOF_PLAN_DIGEST_DOMAIN_V1: &[u8] = b"lnsat.docker-local-runtime-proof-plan.v1";
const PROPOSED_SOURCE_ONLY_STATUS_V1: &str = "proposed_source_only_no_runtime_evidence";

/// Closed sensitive-free plan bindings.
#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct DockerLocalRuntimeProofPlanBindingsV1 {
    pub profile_digest: String,
    pub authority_configuration_digest: String,
    pub adapter_ref: String,
    pub adapter_version: String,
    pub adapter_executable_digest: String,
    pub image_digest: String,
    pub launch_contract_digest: String,
}

/// Closed canonical proof plan. It carries no runtime request, result, receipt,
/// host path, endpoint, configuration, container, or credential fields.
#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
#[allow(clippy::struct_excessive_bools)]
pub struct DockerLocalRuntimeProofPlanV1 {
    pub schema_id: String,
    pub contract_id: String,
    pub contract_version: String,
    pub schema_version: u32,
    pub status: String,
    pub phase11_complete: bool,
    pub execution_authorized: bool,
    pub real_docker_proof: bool,
    pub production_supported: bool,
    pub bindings: DockerLocalRuntimeProofPlanBindingsV1,
    pub required_case_ids: Vec<String>,
    pub hard_stops: Vec<String>,
    pub next_gate: String,
}

/// Parsed canonical plan plus opaque deterministic digest.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct DockerLocalRuntimeProofPlanOutputV1 {
    plan: DockerLocalRuntimeProofPlanV1,
    canonical_json: String,
    digest: [u8; 32],
}

impl DockerLocalRuntimeProofPlanOutputV1 {
    /// Returns closed plan fields for source-only inspection.
    #[must_use]
    pub const fn plan(&self) -> &DockerLocalRuntimeProofPlanV1 {
        &self.plan
    }

    /// Returns exact canonical plan JSON without a frame delimiter.
    #[must_use]
    pub fn canonical_json(&self) -> &str {
        &self.canonical_json
    }

    /// Returns opaque domain-separated digest bytes.
    #[must_use]
    pub const fn digest(&self) -> [u8; 32] {
        self.digest
    }

    /// Returns stable prefixed opaque digest text.
    #[must_use]
    pub fn digest_text(&self) -> String {
        prefixed_sha256_v1(&self.digest)
    }
}

/// Stable secret-free proof-plan failures.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum DockerLocalRuntimeProofPlanErrorV1 {
    InputInvalid,
    PlanTooLarge,
    PlanInvalid,
    CanonicalizationFailed,
}

impl DockerLocalRuntimeProofPlanErrorV1 {
    /// Returns stable machine-safe error code.
    #[must_use]
    pub const fn code(self) -> &'static str {
        match self {
            Self::InputInvalid => "docker_local_runtime_proof.input_invalid",
            Self::PlanTooLarge => "docker_local_runtime_proof.plan_too_large",
            Self::PlanInvalid => "docker_local_runtime_proof.plan_invalid",
            Self::CanonicalizationFailed => "docker_local_runtime_proof.canonicalization_failed",
        }
    }
}

impl fmt::Display for DockerLocalRuntimeProofPlanErrorV1 {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(self.code())
    }
}

impl std::error::Error for DockerLocalRuntimeProofPlanErrorV1 {}

/// Builds one canonical proof plan from one loaded schema-2 runtime profile.
///
/// Success remains source-only metadata. It does not authorize execution or
/// claim Docker availability, a real proof, a consequence, a receipt, or
/// production support.
///
/// # Errors
///
/// Rejects any profile that cannot produce exact schema-2 launch identity.
pub fn build_docker_local_runtime_proof_plan_v1(
    loaded: &LoadedDockerLocalRuntimeProfileV1,
) -> Result<DockerLocalRuntimeProofPlanOutputV1, DockerLocalRuntimeProofPlanErrorV1> {
    let launch_contract_digest = docker_local_launch_contract_digest_v1(loaded)
        .map_err(|_| DockerLocalRuntimeProofPlanErrorV1::InputInvalid)?;
    let profile = loaded.profile();
    let plan = DockerLocalRuntimeProofPlanV1 {
        schema_id: DOCKER_LOCAL_RUNTIME_PROOF_PLAN_SCHEMA_ID_V1.to_owned(),
        contract_id: DOCKER_LOCAL_RUNTIME_PROOF_PLAN_CONTRACT_ID_V1.to_owned(),
        contract_version: CONTRACT_VERSION_V1_0.to_owned(),
        schema_version: 1,
        status: PROPOSED_SOURCE_ONLY_STATUS_V1.to_owned(),
        phase11_complete: false,
        execution_authorized: false,
        real_docker_proof: false,
        production_supported: false,
        bindings: DockerLocalRuntimeProofPlanBindingsV1 {
            profile_digest: loaded.profile_digest_text(),
            authority_configuration_digest: loaded.authority_configuration_digest_text(),
            adapter_ref: profile.adapter.adapter_ref.clone(),
            adapter_version: profile.adapter.version.clone(),
            adapter_executable_digest: profile.adapter_executable_digest.clone(),
            image_digest: profile.image_digest.clone(),
            launch_contract_digest: prefixed_sha256_v1(&launch_contract_digest),
        },
        required_case_ids: DOCKER_LOCAL_RUNTIME_PROOF_REQUIRED_CASE_IDS_V1
            .iter()
            .map(|value| (*value).to_owned())
            .collect(),
        hard_stops: DOCKER_LOCAL_RUNTIME_PROOF_HARD_STOPS_V1
            .iter()
            .map(|value| (*value).to_owned())
            .collect(),
        next_gate: DOCKER_LOCAL_RUNTIME_PROOF_NEXT_GATE_V1.to_owned(),
    };
    finalize_plan_v1(plan)
}

/// Parses one exact canonical source-only proof plan.
///
/// # Errors
///
/// Rejects oversize, malformed, duplicate-key, unknown-field, noncanonical,
/// non-schema-2-ready, status, binding, case-order, or next-gate drift.
pub fn parse_docker_local_runtime_proof_plan_v1(
    loaded: &LoadedDockerLocalRuntimeProfileV1,
    bytes: &[u8],
) -> Result<DockerLocalRuntimeProofPlanOutputV1, DockerLocalRuntimeProofPlanErrorV1> {
    if bytes.len() > MAX_DOCKER_LOCAL_RUNTIME_PROOF_PLAN_BYTES_V1 {
        return Err(DockerLocalRuntimeProofPlanErrorV1::PlanTooLarge);
    }
    let expected = build_docker_local_runtime_proof_plan_v1(loaded)?;
    let text =
        std::str::from_utf8(bytes).map_err(|_| DockerLocalRuntimeProofPlanErrorV1::PlanInvalid)?;
    let unique: UniqueJsonValueV1 =
        serde_json::from_str(text).map_err(|_| DockerLocalRuntimeProofPlanErrorV1::PlanInvalid)?;
    let plan: DockerLocalRuntimeProofPlanV1 = serde_json::from_value(unique.0)
        .map_err(|_| DockerLocalRuntimeProofPlanErrorV1::PlanInvalid)?;
    if text != expected.canonical_json() || plan != *expected.plan() {
        return Err(DockerLocalRuntimeProofPlanErrorV1::PlanInvalid);
    }
    Ok(expected)
}

fn finalize_plan_v1(
    plan: DockerLocalRuntimeProofPlanV1,
) -> Result<DockerLocalRuntimeProofPlanOutputV1, DockerLocalRuntimeProofPlanErrorV1> {
    validate_plan_v1(&plan)?;
    let value = serde_json::to_value(&plan)
        .map_err(|_| DockerLocalRuntimeProofPlanErrorV1::CanonicalizationFailed)?;
    let canonical_json = canonical_json_value_v1(&value)
        .map_err(|()| DockerLocalRuntimeProofPlanErrorV1::CanonicalizationFailed)?;
    let digest = digest_fields_v1(PROOF_PLAN_DIGEST_DOMAIN_V1, &[canonical_json.as_bytes()]);
    Ok(DockerLocalRuntimeProofPlanOutputV1 {
        plan,
        canonical_json,
        digest,
    })
}

fn validate_plan_v1(
    plan: &DockerLocalRuntimeProofPlanV1,
) -> Result<(), DockerLocalRuntimeProofPlanErrorV1> {
    let bindings = &plan.bindings;
    let exact_cases: Vec<String> = DOCKER_LOCAL_RUNTIME_PROOF_REQUIRED_CASE_IDS_V1
        .iter()
        .map(|value| (*value).to_owned())
        .collect();
    let exact_hard_stops: Vec<String> = DOCKER_LOCAL_RUNTIME_PROOF_HARD_STOPS_V1
        .iter()
        .map(|value| (*value).to_owned())
        .collect();
    if plan.schema_id != DOCKER_LOCAL_RUNTIME_PROOF_PLAN_SCHEMA_ID_V1
        || plan.contract_id != DOCKER_LOCAL_RUNTIME_PROOF_PLAN_CONTRACT_ID_V1
        || plan.contract_version != CONTRACT_VERSION_V1_0
        || plan.schema_version != 1
        || plan.status != PROPOSED_SOURCE_ONLY_STATUS_V1
        || plan.phase11_complete
        || plan.execution_authorized
        || plan.real_docker_proof
        || plan.production_supported
        || !valid_sha256_v1(&bindings.profile_digest)
        || !valid_sha256_v1(&bindings.authority_configuration_digest)
        || bindings.adapter_ref != crate::runtime_profile::DOCKER_LOCAL_ADAPTER_REF_V1
        || bindings.adapter_version != crate::runtime_profile::DOCKER_LOCAL_ADAPTER_VERSION_V1
        || !valid_sha256_v1(&bindings.adapter_executable_digest)
        || !valid_sha256_v1(&bindings.image_digest)
        || !valid_sha256_v1(&bindings.launch_contract_digest)
        || plan.required_case_ids != exact_cases
        || plan.hard_stops != exact_hard_stops
        || plan.next_gate != DOCKER_LOCAL_RUNTIME_PROOF_NEXT_GATE_V1
    {
        return Err(DockerLocalRuntimeProofPlanErrorV1::PlanInvalid);
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
