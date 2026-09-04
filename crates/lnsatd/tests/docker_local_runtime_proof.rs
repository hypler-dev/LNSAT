#![forbid(unsafe_code)]

use lnsatd::docker_local_runtime_proof::{
    DOCKER_LOCAL_RUNTIME_PROOF_HARD_STOPS_V1, DOCKER_LOCAL_RUNTIME_PROOF_REQUIRED_BINDINGS_V1,
    DOCKER_LOCAL_RUNTIME_PROOF_REQUIRED_CASE_IDS_V1, DockerLocalRuntimeProofPlanErrorV1,
    build_docker_local_runtime_proof_plan_v1, parse_docker_local_runtime_proof_plan_v1,
};
use lnsatd::docker_local_supervisor::{
    DOCKER_LOCAL_DAEMON_IDENTITY_CONTRACT_ID_V1, DOCKER_LOCAL_DAEMON_IDENTITY_FORMAT_V1,
    DOCKER_LOCAL_DAEMON_ROOTLESS_SECURITY_OPTION_V1,
    DOCKER_LOCAL_DAEMON_VERSION_IDENTITY_FORMAT_V1, DOCKER_LOCAL_LAUNCH_CONTRACT_ID_V1,
    DOCKER_LOCAL_LAUNCH_PROCESS_INVARIANTS_V1, docker_local_launch_contract_argv_template_v1,
    docker_local_launch_contract_digest_v1,
};
use lnsatd::runtime_profile::{
    LoadedDockerLocalRuntimeProfileV1, parse_docker_local_runtime_profile_v1,
};
use serde_json::{Value, json};
use std::fmt::Write as _;

const PROFILE_FIXTURE: &[u8] =
    include_bytes!("../../../fixtures/contracts/phase11-docker-local-profile-v1.json");
const PROOF_FIXTURE: &str =
    include_str!("../../../fixtures/contracts/phase11-docker-local-runtime-proof-plan-v1.json");

#[test]
fn fixture_locks_readiness_boundary_and_exact_arrays() {
    let fixture: Value = serde_json::from_str(PROOF_FIXTURE).expect("proof fixture JSON");
    assert_eq!(
        fixture["schema_id"],
        "lnsat.phase11_docker_local_runtime_proof_plan_fixture.schema.v1_0"
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
            "contract_id": "lnsat.docker_local_runtime_proof_plan.v1",
            "output": "canonical_source_only_proof_plan_digest",
            "side_effects": [],
            "runtime_execution": false,
        })
    );
    assert_eq!(
        string_array(&fixture["required_bindings"]),
        DOCKER_LOCAL_RUNTIME_PROOF_REQUIRED_BINDINGS_V1
    );
    assert_eq!(
        string_array(&fixture["required_case_ids"]),
        DOCKER_LOCAL_RUNTIME_PROOF_REQUIRED_CASE_IDS_V1
    );
    assert_eq!(
        string_array(&fixture["hard_stops"]),
        DOCKER_LOCAL_RUNTIME_PROOF_HARD_STOPS_V1
    );
}

#[test]
fn schema2_plan_builds_canonical_roundtrip_and_profile_bound_digest() {
    let loaded = schema2_profile();
    let built = build_docker_local_runtime_proof_plan_v1(&loaded).expect("schema2 plan");
    let parsed =
        parse_docker_local_runtime_proof_plan_v1(&loaded, built.canonical_json().as_bytes())
            .expect("exact canonical plan");

    assert_eq!(parsed.plan(), built.plan());
    assert_eq!(parsed.canonical_json(), built.canonical_json());
    assert_eq!(parsed.digest(), built.digest());
    assert_eq!(
        parsed.plan().bindings.profile_digest,
        loaded.profile_digest_text()
    );
    assert_plan_has_no_runtime_surface(parsed.canonical_json());
}

#[test]
fn schema1_profile_cannot_build_or_parse_runtime_proof_plan() {
    let schema1 = parse_docker_local_runtime_profile_v1(PROFILE_FIXTURE).expect("schema1 fixture");
    assert_eq!(
        build_docker_local_runtime_proof_plan_v1(&schema1),
        Err(DockerLocalRuntimeProofPlanErrorV1::InputInvalid)
    );
    assert_eq!(
        parse_docker_local_runtime_proof_plan_v1(&schema1, b"{}"),
        Err(DockerLocalRuntimeProofPlanErrorV1::InputInvalid)
    );
}

#[test]
fn parser_rejects_noncanonical_duplicate_unknown_and_oversize_inputs() {
    let loaded = schema2_profile();
    let plan = build_docker_local_runtime_proof_plan_v1(&loaded).expect("plan");
    let noncanonical = serde_json::to_string_pretty(plan.plan()).expect("pretty plan");
    assert_rejected(&loaded, "noncanonical", &noncanonical);

    let duplicate = format!(
        "{{\"schema_id\":\"duplicate\",{}",
        &plan.canonical_json()[1..]
    );
    assert_rejected(&loaded, "duplicate", &duplicate);

    let unknown = format!(
        "{},\"unknown_field\":false}}",
        &plan.canonical_json()[..plan.canonical_json().len() - 1]
    );
    assert_rejected(&loaded, "unknown", &unknown);

    let oversize = vec![b'x'; 8 * 1024 + 1];
    assert_eq!(
        parse_docker_local_runtime_proof_plan_v1(&loaded, &oversize),
        Err(DockerLocalRuntimeProofPlanErrorV1::PlanTooLarge)
    );
}

#[test]
fn parser_rejects_every_closed_plan_drift() {
    let loaded = schema2_profile();
    let plan = build_docker_local_runtime_proof_plan_v1(&loaded).expect("plan");
    let canonical = plan.canonical_json();

    for field in [
        "schema_id",
        "contract_id",
        "contract_version",
        "schema_version",
    ] {
        assert_rejected(
            &loaded,
            field,
            &replace_once(
                canonical,
                &format!("\"{field}\":"),
                &format!("\"{field}_drift\":"),
            ),
        );
    }
    for flag in [
        "phase11_complete",
        "execution_authorized",
        "real_docker_proof",
        "production_supported",
    ] {
        assert_rejected(
            &loaded,
            flag,
            &replace_once(
                canonical,
                &format!("\"{flag}\":false"),
                &format!("\"{flag}\":true"),
            ),
        );
    }
    assert_rejected(
        &loaded,
        "status",
        &replace_once(
            canonical,
            "proposed_source_only_no_runtime_evidence",
            "drifted_source_only_status",
        ),
    );
    for binding in DOCKER_LOCAL_RUNTIME_PROOF_REQUIRED_BINDINGS_V1 {
        assert_rejected(
            &loaded,
            binding,
            &replace_once(
                canonical,
                &format!("\"{binding}\":"),
                &format!("\"{binding}_drift\":"),
            ),
        );
    }
    for case_id in DOCKER_LOCAL_RUNTIME_PROOF_REQUIRED_CASE_IDS_V1 {
        assert_rejected(
            &loaded,
            case_id,
            &replace_once(canonical, case_id, "drifted_case"),
        );
    }
    for hard_stop in DOCKER_LOCAL_RUNTIME_PROOF_HARD_STOPS_V1 {
        assert_rejected(
            &loaded,
            hard_stop,
            &replace_once(canonical, hard_stop, "drifted_hard_stop"),
        );
    }
    assert_rejected(
        &loaded,
        "next_gate",
        &replace_once(
            canonical,
            "separately_authorized_real_disposable_docker_image_and_runtime_proof",
            "drifted_next_gate",
        ),
    );
}

#[test]
fn launch_digest_is_deterministic_and_binds_profile_launch_identities() {
    let profile = schema2_profile();
    let first = docker_local_launch_contract_digest_v1(&profile).expect("launch digest");
    let second = docker_local_launch_contract_digest_v1(&profile).expect("launch digest");
    assert_eq!(first, second);
    assert_eq!(
        DOCKER_LOCAL_LAUNCH_CONTRACT_ID_V1,
        "lnsat.docker_local_launch_contract.v1"
    );
    assert_eq!(
        DOCKER_LOCAL_LAUNCH_PROCESS_INVARIANTS_V1,
        [
            "environment=clear",
            "stdin=piped",
            "stdout=piped",
            "stderr=piped",
            "daemon_identity=controlled_version_and_info_json",
            "daemon_identity_revalidation=after_run_before_inspect_before_remove_after_remove"
        ]
    );
    assert_eq!(
        DOCKER_LOCAL_DAEMON_IDENTITY_CONTRACT_ID_V1,
        "lnsat.docker_local_daemon_identity.v1"
    );
    assert!(DOCKER_LOCAL_DAEMON_VERSION_IDENTITY_FORMAT_V1.contains(".Client.APIVersion"));
    assert!(DOCKER_LOCAL_DAEMON_IDENTITY_FORMAT_V1.contains(".SecurityOptions"));
    assert!(DOCKER_LOCAL_DAEMON_IDENTITY_FORMAT_V1.contains(".Runtimes"));
    assert_eq!(
        DOCKER_LOCAL_DAEMON_ROOTLESS_SECURITY_OPTION_V1,
        "name=rootless"
    );
    assert_eq!(
        docker_local_launch_contract_argv_template_v1(&profile).expect("argv template"),
        expected_launch_argv_template()
    );
    assert!(
        !docker_local_launch_contract_argv_template_v1(&profile)
            .expect("argv template")
            .iter()
            .any(|argument| argument == "--rm")
    );
    assert_eq!(
        hex_digest(first),
        "3e3aea4acfc33a718f361a211a244ae0d17d12ba8f8454c29230cdde90439ca5"
    );

    let image_drift = schema2_profile_with(|value| {
        value["image_digest"] = json!(format!("sha256:{}", "c".repeat(64)));
    });
    let entrypoint_drift = schema2_profile_with(|value| {
        value["entrypoint"] = json!("/usr/local/bin/lnsat-git-reference-v2");
    });
    let mount_target_drift = schema2_profile_with(|value| {
        value["filesystem"]["target_mount_path"] = json!("/workspace/disposable-repository");
    });
    let docker_executable_drift = schema2_profile_with(|value| {
        value["supervisor"]["docker_executable_digest"] =
            json!(format!("sha256:{}", "e".repeat(64)));
    });
    let verifier_git_executable_drift = schema2_profile_with(|value| {
        value["supervisor"]["verifier_git_executable_digest"] =
            json!(format!("sha256:{}", "f".repeat(64)));
    });
    let docker_host_drift = schema2_profile_with(|value| {
        value["supervisor"]["docker_host"] =
            json!("unix:///private/tmp/lnsat-runtime-proof-alternate.sock");
    });
    let limit_drift = schema2_profile_with(|value| {
        value["limits"]["cpu_millis"] = json!(999);
    });
    let isolation_drift = schema2_profile_with(|value| {
        value["isolation"]["run_as_uid"] = json!(65531);
    });
    assert_ne!(
        first,
        docker_local_launch_contract_digest_v1(&image_drift).expect("image drift digest")
    );
    assert_ne!(
        first,
        docker_local_launch_contract_digest_v1(&entrypoint_drift).expect("entrypoint drift digest")
    );
    for drift in [
        mount_target_drift,
        docker_executable_drift,
        verifier_git_executable_drift,
        docker_host_drift,
        limit_drift,
        isolation_drift,
    ] {
        assert_ne!(
            first,
            docker_local_launch_contract_digest_v1(&drift).expect("bound launch drift digest")
        );
    }
}

fn expected_launch_argv_template() -> Vec<String> {
    [
        "--host",
        "{docker_host}",
        "--config",
        "{private_docker_config_path}",
        "run",
        "--interactive",
        "--cidfile",
        "{private_cidfile_path}",
        "--pull=never",
        "--label",
        "io.lnsat.phase11.operation-id={operation_id}",
        "--label",
        "io.lnsat.phase11.launch-contract-digest={launch_contract_digest}",
        "--name",
        "{container_name}",
        "--network=none",
        "--ipc=none",
        "--read-only",
        "--log-driver=none",
        "--user=65532:65532",
        "--workdir=/workspace",
        "--cap-drop=ALL",
        "--security-opt=no-new-privileges:true",
        "--pids-limit=64",
        "--memory=268435456",
        "--memory-swap=268435456",
        "--cpu-period=100000",
        "--cpu-quota=100000",
        "--mount",
        "type=bind,source={disposable_repository_path},target=/workspace/repository,rw,bind-propagation=rprivate",
        "--entrypoint",
        "/usr/local/bin/lnsat-git-reference",
        "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        "--repository",
        "/workspace/repository",
    ]
    .into_iter()
    .map(str::to_owned)
    .collect()
}

fn hex_digest(digest: [u8; 32]) -> String {
    let mut encoded = String::with_capacity(digest.len() * 2);
    for byte in digest {
        write!(&mut encoded, "{byte:02x}").expect("writing to String cannot fail");
    }
    encoded
}

fn schema2_profile() -> LoadedDockerLocalRuntimeProfileV1 {
    schema2_profile_with(|_| {})
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

fn assert_rejected(loaded: &LoadedDockerLocalRuntimeProfileV1, label: &str, text: &str) {
    assert_eq!(
        parse_docker_local_runtime_proof_plan_v1(loaded, text.as_bytes()),
        Err(DockerLocalRuntimeProofPlanErrorV1::PlanInvalid),
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

fn assert_plan_has_no_runtime_surface(canonical: &str) {
    let value: Value = serde_json::from_str(canonical).expect("canonical plan JSON");
    assert_eq!(value["execution_authorized"], false);
    for field in [
        "docker_host",
        "path",
        "config",
        "container",
        "credential",
        "request",
        "result",
        "receipt",
        "authorization",
        "target",
    ] {
        assert!(
            !canonical.contains(&format!("\"{field}\"")),
            "forbidden exact field {field}"
        );
    }
}
