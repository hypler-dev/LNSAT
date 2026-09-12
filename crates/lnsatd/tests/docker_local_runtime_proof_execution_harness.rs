#![forbid(unsafe_code)]

use lnsatd::docker_local_runtime_proof::{
    DockerLocalRuntimeProofPlanOutputV1, build_docker_local_runtime_proof_plan_v1,
};
use lnsatd::docker_local_runtime_proof_evidence::{
    DockerLocalRuntimeProofEvidenceRequirementsOutputV1,
    build_docker_local_runtime_proof_evidence_requirements_v1,
};
use lnsatd::docker_local_runtime_proof_execution_harness::{
    DOCKER_LOCAL_RUNTIME_PROOF_EXECUTION_HARNESS_AUTHORITY_DECLARATION_IDS_V1,
    DOCKER_LOCAL_RUNTIME_PROOF_EXECUTION_HARNESS_REQUIRED_PLAN_BINDING_IDS_V1,
    DOCKER_LOCAL_RUNTIME_PROOF_EXECUTION_HARNESS_STOP_IDS_V1,
    DockerLocalRuntimeProofExecutionHarnessErrorV1,
    build_docker_local_runtime_proof_execution_harness_v1,
    parse_docker_local_runtime_proof_execution_harness_v1,
};
use lnsatd::runtime_profile::{
    LoadedDockerLocalRuntimeProfileV1, parse_docker_local_runtime_profile_v1,
};
use serde_json::{Value, json};

const PROFILE_FIXTURE: &[u8] =
    include_bytes!("../../../fixtures/contracts/phase11-docker-local-profile-v1.json");
const HARNESS_FIXTURE: &str = include_str!(
    "../../../fixtures/contracts/phase11-docker-local-runtime-proof-execution-harness-v1.json"
);

#[test]
fn fixture_locks_source_only_harness_boundary() {
    let fixture: Value = serde_json::from_str(HARNESS_FIXTURE).expect("harness fixture JSON");
    assert_eq!(
        fixture["schema_id"],
        "lnsat.phase11_docker_local_runtime_proof_execution_harness_fixture.schema.v1_0"
    );
    assert_eq!(
        fixture["fixture_id"],
        "phase11-docker-local-runtime-proof-execution-harness-v1"
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
            "contract_id": "lnsat.docker_local_runtime_proof_execution_harness.v1",
            "output": "canonical_source_only_execution_harness_digest",
            "side_effects": [],
            "runtime_execution": false,
        })
    );
    assert_eq!(
        string_array(&fixture["required_plan_binding_ids"]),
        DOCKER_LOCAL_RUNTIME_PROOF_EXECUTION_HARNESS_REQUIRED_PLAN_BINDING_IDS_V1
    );
    assert_eq!(
        string_array(&fixture["authority_declaration_ids"]),
        DOCKER_LOCAL_RUNTIME_PROOF_EXECUTION_HARNESS_AUTHORITY_DECLARATION_IDS_V1
    );
    assert_eq!(
        string_array(&fixture["authority_stop_ids"]),
        DOCKER_LOCAL_RUNTIME_PROOF_EXECUTION_HARNESS_STOP_IDS_V1
    );
}

#[test]
fn schema2_harness_builds_canonical_roundtrip_and_binds_both_inputs() {
    let (plan, requirements) = schema2_inputs();
    let built = build_docker_local_runtime_proof_execution_harness_v1(&plan, &requirements)
        .expect("harness");
    let parsed = parse_docker_local_runtime_proof_execution_harness_v1(
        &plan,
        &requirements,
        built.canonical_json().as_bytes(),
    )
    .expect("canonical harness");

    assert_eq!(parsed.harness(), built.harness());
    assert_eq!(parsed.canonical_json(), built.canonical_json());
    assert_eq!(parsed.digest(), built.digest());
    assert_eq!(
        parsed.harness().bindings.proof_plan_digest,
        plan.digest_text()
    );
    assert_eq!(
        parsed.harness().bindings.evidence_requirements_digest,
        requirements.digest_text()
    );
    assert_no_runtime_surface(parsed.canonical_json());
}

#[test]
fn parser_rejects_noncanonical_duplicate_unknown_deep_and_oversize_inputs() {
    let (plan, requirements) = schema2_inputs();
    let harness = build_docker_local_runtime_proof_execution_harness_v1(&plan, &requirements)
        .expect("harness");
    assert_rejected(
        &plan,
        &requirements,
        &serde_json::to_string_pretty(harness.harness()).expect("pretty harness"),
    );
    assert_rejected(
        &plan,
        &requirements,
        &format!(
            "{{\"schema_id\":\"duplicate\",{}",
            &harness.canonical_json()[1..]
        ),
    );
    assert_rejected(
        &plan,
        &requirements,
        &format!(
            "{},\"unknown_field\":false}}",
            &harness.canonical_json()[..harness.canonical_json().len() - 1]
        ),
    );
    assert_eq!(
        parse_docker_local_runtime_proof_execution_harness_v1(
            &plan,
            &requirements,
            format!("{}0{}", "[".repeat(65), "]".repeat(65)).as_bytes(),
        ),
        Err(DockerLocalRuntimeProofExecutionHarnessErrorV1::HarnessTooDeep)
    );
    assert_eq!(
        parse_docker_local_runtime_proof_execution_harness_v1(
            &plan,
            &requirements,
            &vec![b'x'; 16 * 1024 + 1],
        ),
        Err(DockerLocalRuntimeProofExecutionHarnessErrorV1::HarnessTooLarge)
    );
}

#[test]
fn parser_rejects_digest_and_authority_drift() {
    let (plan, requirements) = schema2_inputs();
    let harness = build_docker_local_runtime_proof_execution_harness_v1(&plan, &requirements)
        .expect("harness");
    let canonical = harness.canonical_json();
    for field in ["proof_plan_digest", "evidence_requirements_digest"] {
        let mut drifted: Value = serde_json::from_str(canonical).expect("canonical harness JSON");
        drifted["bindings"][field] = json!(format!("sha256:{}", "0".repeat(64)));
        assert_rejected(
            &plan,
            &requirements,
            &serde_json::to_string(&drifted).expect("canonical drifted harness"),
        );
    }
    for id in DOCKER_LOCAL_RUNTIME_PROOF_EXECUTION_HARNESS_AUTHORITY_DECLARATION_IDS_V1 {
        assert_rejected(
            &plan,
            &requirements,
            &replace_once(canonical, id, "drifted_declaration"),
        );
    }
    for id in DOCKER_LOCAL_RUNTIME_PROOF_EXECUTION_HARNESS_STOP_IDS_V1 {
        assert_rejected(
            &plan,
            &requirements,
            &replace_once(canonical, id, "drifted_stop"),
        );
    }
}

#[test]
fn parser_rejects_every_inherited_requirement_set_drift() {
    let (plan, requirements) = schema2_inputs();
    let harness = build_docker_local_runtime_proof_execution_harness_v1(&plan, &requirements)
        .expect("harness");
    for field in [
        "required_plan_binding_ids",
        "required_case_ids",
        "required_observation_commitment_ids",
        "preflight_rejection_ids",
        "postspawn_outcome_unknown_ids",
        "forbidden_public_evidence_fields",
    ] {
        let mut drifted: Value =
            serde_json::from_str(harness.canonical_json()).expect("canonical harness JSON");
        drifted[field][0] = json!(format!("drifted_{field}"));
        assert_rejected(
            &plan,
            &requirements,
            &serde_json::to_string(&drifted).expect("canonical drifted harness"),
        );
    }
}

#[test]
fn harness_rejects_different_evidence_requirements() {
    let first_profile = schema2_profile_with(|_| {});
    let first_plan = build_docker_local_runtime_proof_plan_v1(&first_profile).expect("plan");
    let first_requirements = build_docker_local_runtime_proof_evidence_requirements_v1(&first_plan)
        .expect("requirements");
    let harness =
        build_docker_local_runtime_proof_execution_harness_v1(&first_plan, &first_requirements)
            .expect("harness");
    let second_profile = schema2_profile_with(|value| {
        value["image_digest"] = json!(format!("sha256:{}", "e".repeat(64)));
    });
    let second_plan = build_docker_local_runtime_proof_plan_v1(&second_profile).expect("plan");
    let second_requirements =
        build_docker_local_runtime_proof_evidence_requirements_v1(&second_plan)
            .expect("requirements");
    assert_eq!(
        build_docker_local_runtime_proof_execution_harness_v1(&second_plan, &first_requirements),
        Err(DockerLocalRuntimeProofExecutionHarnessErrorV1::HarnessInvalid)
    );
    assert_rejected(&second_plan, &second_requirements, harness.canonical_json());
}

fn schema2_inputs() -> (
    DockerLocalRuntimeProofPlanOutputV1,
    DockerLocalRuntimeProofEvidenceRequirementsOutputV1,
) {
    let profile = schema2_profile_with(|_| {});
    let plan = build_docker_local_runtime_proof_plan_v1(&profile).expect("plan");
    let requirements =
        build_docker_local_runtime_proof_evidence_requirements_v1(&plan).expect("requirements");
    (plan, requirements)
}

fn schema2_profile_with(mutate: impl FnOnce(&mut Value)) -> LoadedDockerLocalRuntimeProfileV1 {
    let mut value: Value = serde_json::from_slice(PROFILE_FIXTURE).expect("profile fixture JSON");
    value["schema_version"] = json!(2);
    value["supervisor"] = json!({
        "docker_executable_digest": format!("sha256:{}", "c".repeat(64)),
        "verifier_git_executable_digest": format!("sha256:{}", "d".repeat(64)),
        "docker_host": "unix:///private/tmp/lnsat-runtime-proof.sock",
    });
    mutate(&mut value);
    parse_docker_local_runtime_profile_v1(&serde_json::to_vec(&value).expect("profile bytes"))
        .expect("schema2 profile")
}

fn assert_rejected(
    plan: &DockerLocalRuntimeProofPlanOutputV1,
    requirements: &DockerLocalRuntimeProofEvidenceRequirementsOutputV1,
    text: &str,
) {
    assert_eq!(
        parse_docker_local_runtime_proof_execution_harness_v1(plan, requirements, text.as_bytes()),
        Err(DockerLocalRuntimeProofExecutionHarnessErrorV1::HarnessInvalid),
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

fn assert_no_runtime_surface(canonical: &str) {
    let value: Value = serde_json::from_str(canonical).expect("canonical harness JSON");
    assert_eq!(value["phase11_complete"], false);
    assert_eq!(value["execution_authorized"], false);
    assert_eq!(value["real_docker_proof"], false);
    assert_eq!(value["production_supported"], false);
    assert_eq!(value["contract"]["side_effects"], json!([]));
    assert_eq!(value["contract"]["runtime_execution"], false);
    for field in [
        "runtime_evidence",
        "result",
        "receipt",
        "authorization",
        "operation",
        "container",
        "endpoint",
        "command",
        "repository",
    ] {
        assert!(value.get(field).is_none(), "forbidden root field {field}");
        assert!(
            value["bindings"].get(field).is_none(),
            "forbidden binding field {field}"
        );
    }
}
