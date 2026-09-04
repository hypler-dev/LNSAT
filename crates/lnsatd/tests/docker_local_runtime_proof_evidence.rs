#![forbid(unsafe_code)]

use lnsatd::docker_local_runtime_proof::{
    DockerLocalRuntimeProofPlanErrorV1, DockerLocalRuntimeProofPlanOutputV1,
    build_docker_local_runtime_proof_plan_v1,
};
use lnsatd::docker_local_runtime_proof_evidence::{
    DOCKER_LOCAL_RUNTIME_PROOF_EVIDENCE_REQUIRED_CASE_IDS_V1,
    DOCKER_LOCAL_RUNTIME_PROOF_EVIDENCE_REQUIRED_PLAN_BINDING_IDS_V1,
    DOCKER_LOCAL_RUNTIME_PROOF_FORBIDDEN_PUBLIC_EVIDENCE_FIELDS_V1,
    DOCKER_LOCAL_RUNTIME_PROOF_POSTSPAWN_OUTCOME_UNKNOWN_IDS_V1,
    DOCKER_LOCAL_RUNTIME_PROOF_PREFLIGHT_REJECTION_IDS_V1,
    DOCKER_LOCAL_RUNTIME_PROOF_REQUIRED_OBSERVATION_COMMITMENT_IDS_V1,
    DockerLocalRuntimeProofEvidenceRequirementsErrorV1,
    MAX_DOCKER_LOCAL_RUNTIME_PROOF_EVIDENCE_REQUIREMENTS_JSON_NESTING_V1,
    build_docker_local_runtime_proof_evidence_requirements_v1,
    parse_docker_local_runtime_proof_evidence_requirements_v1,
};
use lnsatd::runtime_profile::{
    LoadedDockerLocalRuntimeProfileV1, parse_docker_local_runtime_profile_v1,
};
use serde_json::{Value, json};
use std::fmt::Write as _;

const PROFILE_FIXTURE: &[u8] =
    include_bytes!("../../../fixtures/contracts/phase11-docker-local-profile-v1.json");
const EVIDENCE_FIXTURE: &str = include_str!(
    "../../../fixtures/contracts/phase11-docker-local-runtime-proof-evidence-requirements-v1.json"
);

#[test]
fn fixture_locks_source_only_evidence_requirements() {
    let fixture: Value = serde_json::from_str(EVIDENCE_FIXTURE).expect("evidence fixture JSON");
    assert_eq!(
        fixture["schema_id"],
        "lnsat.phase11_docker_local_runtime_proof_evidence_requirements_fixture.schema.v1_0"
    );
    assert_eq!(
        fixture["fixture_id"],
        "phase11-docker-local-runtime-proof-evidence-requirements-v1"
    );
    assert_eq!(
        fixture["status"],
        "proposed_source_only_no_runtime_evidence"
    );
    for flag in [
        "phase11_complete",
        "execution_authorized",
        "real_docker_proof",
        "production_supported",
    ] {
        assert_eq!(fixture[flag], false, "{flag}");
    }
    assert_eq!(
        fixture["contract"],
        json!({
            "contract_id": "lnsat.docker_local_runtime_proof_evidence_requirements.v1",
            "output": "canonical_source_only_evidence_requirements_digest",
            "side_effects": [],
            "runtime_execution": false,
        })
    );
    assert_eq!(
        string_array(&fixture["required_plan_binding_ids"]),
        DOCKER_LOCAL_RUNTIME_PROOF_EVIDENCE_REQUIRED_PLAN_BINDING_IDS_V1
    );
    assert_eq!(
        string_array(&fixture["required_case_ids"]),
        DOCKER_LOCAL_RUNTIME_PROOF_EVIDENCE_REQUIRED_CASE_IDS_V1
    );
    assert_eq!(
        string_array(&fixture["required_observation_commitment_ids"]),
        DOCKER_LOCAL_RUNTIME_PROOF_REQUIRED_OBSERVATION_COMMITMENT_IDS_V1
    );
    assert_eq!(
        string_array(&fixture["preflight_rejection_ids"]),
        DOCKER_LOCAL_RUNTIME_PROOF_PREFLIGHT_REJECTION_IDS_V1
    );
    assert_eq!(
        string_array(&fixture["postspawn_outcome_unknown_ids"]),
        DOCKER_LOCAL_RUNTIME_PROOF_POSTSPAWN_OUTCOME_UNKNOWN_IDS_V1
    );
    assert_eq!(
        string_array(&fixture["forbidden_public_evidence_fields"]),
        DOCKER_LOCAL_RUNTIME_PROOF_FORBIDDEN_PUBLIC_EVIDENCE_FIELDS_V1
    );
    assert_eq!(
        fixture["next_gate"],
        "separately_authorized_real_disposable_docker_image_and_runtime_proof"
    );
}

#[test]
fn requirements_build_canonical_roundtrip_and_derive_from_proof_plan() {
    let proof_plan = schema2_proof_plan();
    let built = build_docker_local_runtime_proof_evidence_requirements_v1(&proof_plan)
        .expect("evidence requirements");
    let parsed = parse_docker_local_runtime_proof_evidence_requirements_v1(
        &proof_plan,
        built.canonical_json().as_bytes(),
    )
    .expect("exact canonical requirements");

    assert_eq!(parsed.requirements(), built.requirements());
    assert_eq!(parsed.canonical_json(), built.canonical_json());
    assert_eq!(parsed.digest(), built.digest());
    assert_eq!(
        parsed.requirements().bindings.proof_plan_digest,
        proof_plan.digest_text()
    );
    assert_no_runtime_evidence_surface(parsed.canonical_json());
}

#[test]
fn schema1_profile_cannot_derive_evidence_requirements() {
    let schema1 = parse_docker_local_runtime_profile_v1(PROFILE_FIXTURE).expect("schema1 fixture");
    assert_eq!(
        build_docker_local_runtime_proof_plan_v1(&schema1),
        Err(DockerLocalRuntimeProofPlanErrorV1::InputInvalid)
    );
}

#[test]
fn parser_rejects_noncanonical_duplicate_unknown_and_oversize_requirements() {
    let proof_plan = schema2_proof_plan();
    let requirements = build_docker_local_runtime_proof_evidence_requirements_v1(&proof_plan)
        .expect("evidence requirements");
    let noncanonical =
        serde_json::to_string_pretty(requirements.requirements()).expect("pretty requirements");
    assert_rejected(&proof_plan, "noncanonical", &noncanonical);

    let duplicate = format!(
        "{{\"schema_id\":\"duplicate\",{}",
        &requirements.canonical_json()[1..]
    );
    assert_rejected(&proof_plan, "duplicate", &duplicate);

    let unknown = format!(
        "{},\"unknown_field\":false}}",
        &requirements.canonical_json()[..requirements.canonical_json().len() - 1]
    );
    assert_rejected(&proof_plan, "unknown", &unknown);

    let oversize = vec![b'x'; 16 * 1024 + 1];
    assert_eq!(
        parse_docker_local_runtime_proof_evidence_requirements_v1(&proof_plan, &oversize),
        Err(DockerLocalRuntimeProofEvidenceRequirementsErrorV1::RequirementsTooLarge)
    );
}

#[test]
fn parser_rejects_deep_arrays_and_objects_before_typed_acceptance() {
    let proof_plan = schema2_proof_plan();
    let too_deep_array = format!(
        "{}0{}",
        "[".repeat(MAX_DOCKER_LOCAL_RUNTIME_PROOF_EVIDENCE_REQUIREMENTS_JSON_NESTING_V1 + 1),
        "]".repeat(MAX_DOCKER_LOCAL_RUNTIME_PROOF_EVIDENCE_REQUIREMENTS_JSON_NESTING_V1 + 1),
    );
    let mut too_deep_object = String::new();
    for depth in 0..=MAX_DOCKER_LOCAL_RUNTIME_PROOF_EVIDENCE_REQUIREMENTS_JSON_NESTING_V1 {
        write!(&mut too_deep_object, "{{\"depth_{depth}\":").expect("object construction");
    }
    too_deep_object.push('0');
    too_deep_object.push_str(
        &"}".repeat(MAX_DOCKER_LOCAL_RUNTIME_PROOF_EVIDENCE_REQUIREMENTS_JSON_NESTING_V1 + 1),
    );
    for (label, text) in [("array", too_deep_array), ("object", too_deep_object)] {
        assert_eq!(
            parse_docker_local_runtime_proof_evidence_requirements_v1(&proof_plan, text.as_bytes()),
            Err(DockerLocalRuntimeProofEvidenceRequirementsErrorV1::RequirementsTooDeep),
            "{label}"
        );
    }

    let boundary_array = format!(
        "{}0{}",
        "[".repeat(MAX_DOCKER_LOCAL_RUNTIME_PROOF_EVIDENCE_REQUIREMENTS_JSON_NESTING_V1),
        "]".repeat(MAX_DOCKER_LOCAL_RUNTIME_PROOF_EVIDENCE_REQUIREMENTS_JSON_NESTING_V1),
    );
    assert_eq!(
        parse_docker_local_runtime_proof_evidence_requirements_v1(
            &proof_plan,
            boundary_array.as_bytes()
        ),
        Err(DockerLocalRuntimeProofEvidenceRequirementsErrorV1::RequirementsInvalid)
    );
}

#[test]
fn parser_rejects_closed_status_contract_and_binding_key_drift() {
    let proof_plan = schema2_proof_plan();
    let requirements = build_docker_local_runtime_proof_evidence_requirements_v1(&proof_plan)
        .expect("evidence requirements");
    let canonical = requirements.canonical_json();

    for flag in [
        "phase11_complete",
        "execution_authorized",
        "real_docker_proof",
        "production_supported",
    ] {
        assert_rejected(
            &proof_plan,
            flag,
            &replace_once(
                canonical,
                &format!("\"{flag}\":false"),
                &format!("\"{flag}\":true"),
            ),
        );
    }
    assert_rejected(
        &proof_plan,
        "runtime_execution",
        &replace_once(
            canonical,
            "\"runtime_execution\":false",
            "\"runtime_execution\":true",
        ),
    );
    assert_rejected(
        &proof_plan,
        "side_effects",
        &replace_once(
            canonical,
            "\"side_effects\":[]",
            "\"side_effects\":[\"drift\"]",
        ),
    );
    for binding in ["proof_plan_digest"]
        .into_iter()
        .chain(DOCKER_LOCAL_RUNTIME_PROOF_EVIDENCE_REQUIRED_PLAN_BINDING_IDS_V1)
    {
        assert_rejected(
            &proof_plan,
            binding,
            &replace_once(
                canonical,
                &format!("\"{binding}\":"),
                &format!("\"{binding}_drift\":"),
            ),
        );
    }
}

#[test]
fn parser_rejects_bound_value_and_required_list_substitution_drift() {
    let proof_plan = schema2_proof_plan();
    let requirements = build_docker_local_runtime_proof_evidence_requirements_v1(&proof_plan)
        .expect("evidence requirements");
    let canonical = requirements.canonical_json();
    for binding in ["proof_plan_digest"]
        .into_iter()
        .chain(DOCKER_LOCAL_RUNTIME_PROOF_EVIDENCE_REQUIRED_PLAN_BINDING_IDS_V1)
    {
        let mut substituted: Value =
            serde_json::from_str(canonical).expect("canonical requirements");
        let original = substituted["bindings"][binding]
            .as_str()
            .expect("binding text")
            .to_owned();
        let replacement = if original == format!("sha256:{}", "f".repeat(64)) {
            format!("sha256:{}", "e".repeat(64))
        } else {
            format!("sha256:{}", "f".repeat(64))
        };
        if binding == "adapter_ref" || binding == "adapter_version" {
            substituted["bindings"][binding] = json!("drifted_adapter_identity");
        } else {
            substituted["bindings"][binding] = json!(replacement);
        }
        assert_rejected(
            &proof_plan,
            binding,
            &serde_json::to_string(&substituted).expect("substituted requirements"),
        );
    }
    for id in DOCKER_LOCAL_RUNTIME_PROOF_EVIDENCE_REQUIRED_CASE_IDS_V1 {
        assert_rejected(
            &proof_plan,
            id,
            &replace_once(canonical, id, "drifted_case"),
        );
    }
    for id in DOCKER_LOCAL_RUNTIME_PROOF_REQUIRED_OBSERVATION_COMMITMENT_IDS_V1 {
        assert_rejected(
            &proof_plan,
            id,
            &replace_once(canonical, id, "drifted_observation"),
        );
    }
    for id in DOCKER_LOCAL_RUNTIME_PROOF_PREFLIGHT_REJECTION_IDS_V1 {
        assert_rejected(
            &proof_plan,
            id,
            &replace_once(canonical, id, "drifted_rejection"),
        );
    }
    for id in DOCKER_LOCAL_RUNTIME_PROOF_POSTSPAWN_OUTCOME_UNKNOWN_IDS_V1 {
        assert_rejected(
            &proof_plan,
            id,
            &replace_once(canonical, id, "drifted_postspawn_outcome_unknown"),
        );
    }
    for field in DOCKER_LOCAL_RUNTIME_PROOF_FORBIDDEN_PUBLIC_EVIDENCE_FIELDS_V1 {
        assert_rejected(
            &proof_plan,
            field,
            &replace_once(canonical, field, "drifted_forbidden_field"),
        );
    }
}

#[test]
fn parser_rejects_gate_and_required_list_order_drift() {
    let proof_plan = schema2_proof_plan();
    let requirements = build_docker_local_runtime_proof_evidence_requirements_v1(&proof_plan)
        .expect("evidence requirements");
    let canonical = requirements.canonical_json();
    assert_rejected(
        &proof_plan,
        "next_gate",
        &replace_once(
            canonical,
            "separately_authorized_real_disposable_docker_image_and_runtime_proof",
            "drifted_next_gate",
        ),
    );

    let mut reordered: Value = serde_json::from_str(canonical).expect("canonical requirements");
    reordered["required_observation_commitment_ids"]
        .as_array_mut()
        .expect("observation array")
        .reverse();
    assert_rejected(
        &proof_plan,
        "observation order",
        &serde_json::to_string(&reordered).expect("reordered requirements"),
    );
    for array in [
        "required_case_ids",
        "preflight_rejection_ids",
        "postspawn_outcome_unknown_ids",
        "forbidden_public_evidence_fields",
    ] {
        let mut reordered: Value = serde_json::from_str(canonical).expect("canonical requirements");
        reordered[array]
            .as_array_mut()
            .expect("ordered array")
            .reverse();
        assert_rejected(
            &proof_plan,
            array,
            &serde_json::to_string(&reordered).expect("reordered requirements"),
        );
    }
}

#[test]
fn requirements_reject_a_different_proof_plan() {
    let first = schema2_proof_plan();
    let requirements = build_docker_local_runtime_proof_evidence_requirements_v1(&first)
        .expect("first evidence requirements");
    let second = schema2_proof_plan_with(|value| {
        value["image_digest"] = json!(format!("sha256:{}", "e".repeat(64)));
    });
    assert_rejected(
        &second,
        "different proof plan",
        requirements.canonical_json(),
    );
}

fn schema2_proof_plan() -> DockerLocalRuntimeProofPlanOutputV1 {
    schema2_proof_plan_with(|_| {})
}

fn schema2_proof_plan_with(mutate: impl FnOnce(&mut Value)) -> DockerLocalRuntimeProofPlanOutputV1 {
    let mut value: Value = serde_json::from_slice(PROFILE_FIXTURE).expect("profile fixture JSON");
    value["schema_version"] = json!(2);
    value["supervisor"] = json!({
        "docker_executable_digest": format!("sha256:{}", "c".repeat(64)),
        "verifier_git_executable_digest": format!("sha256:{}", "d".repeat(64)),
        "docker_host": "unix:///private/tmp/lnsat-runtime-proof.sock",
    });
    mutate(&mut value);
    let profile: LoadedDockerLocalRuntimeProfileV1 =
        parse_docker_local_runtime_profile_v1(&serde_json::to_vec(&value).expect("profile bytes"))
            .expect("schema2 profile");
    build_docker_local_runtime_proof_plan_v1(&profile).expect("proof plan")
}

fn assert_rejected(proof_plan: &DockerLocalRuntimeProofPlanOutputV1, label: &str, text: &str) {
    assert_eq!(
        parse_docker_local_runtime_proof_evidence_requirements_v1(proof_plan, text.as_bytes()),
        Err(DockerLocalRuntimeProofEvidenceRequirementsErrorV1::RequirementsInvalid),
        "{label}"
    );
}

fn replace_once(text: &str, from: &str, to: &str) -> String {
    assert!(text.contains(from), "missing {from}");
    text.replacen(from, to, 1)
}

fn string_array(value: &Value) -> Vec<&str> {
    value
        .as_array()
        .expect("array")
        .iter()
        .map(Value::as_str)
        .collect::<Option<Vec<_>>>()
        .expect("string array")
}

fn assert_no_runtime_evidence_surface(canonical: &str) {
    let value: Value = serde_json::from_str(canonical).expect("canonical requirements JSON");
    assert_eq!(value["execution_authorized"], false);
    assert_eq!(value["contract"]["side_effects"], json!([]));
    assert_eq!(value["contract"]["runtime_execution"], false);
    for forbidden in DOCKER_LOCAL_RUNTIME_PROOF_FORBIDDEN_PUBLIC_EVIDENCE_FIELDS_V1 {
        assert!(
            value.get(forbidden).is_none(),
            "forbidden root field {forbidden}"
        );
        assert!(
            value["bindings"].get(forbidden).is_none(),
            "forbidden binding field {forbidden}"
        );
    }
    for field in [
        "runtime_evidence",
        "result",
        "receipt",
        "authorization",
        "operation",
        "container",
        "endpoint",
        "command",
        "stdout",
        "stderr",
    ] {
        assert!(
            value.get(field).is_none(),
            "forbidden runtime field {field}"
        );
    }
}
