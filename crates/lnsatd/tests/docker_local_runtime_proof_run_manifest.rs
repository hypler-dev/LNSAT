#![forbid(unsafe_code)]

use lnsatd::docker_local_runtime_proof::{
    DockerLocalRuntimeProofPlanOutputV1, build_docker_local_runtime_proof_plan_v1,
};
use lnsatd::docker_local_runtime_proof_evidence::{
    DockerLocalRuntimeProofEvidenceRequirementsOutputV1,
    build_docker_local_runtime_proof_evidence_requirements_v1,
};
use lnsatd::docker_local_runtime_proof_execution_harness::{
    DockerLocalRuntimeProofExecutionHarnessOutputV1,
    build_docker_local_runtime_proof_execution_harness_v1,
};
use lnsatd::docker_local_runtime_proof_run_manifest::{
    DOCKER_LOCAL_RUNTIME_PROOF_RUN_MANIFEST_EXECUTION_PERMISSIONS_V1,
    DOCKER_LOCAL_RUNTIME_PROOF_RUN_MANIFEST_OBSERVATION_PERMISSIONS_V1,
    DockerLocalRuntimeProofDaemonDeclarationV1, DockerLocalRuntimeProofImageDeclarationV1,
    DockerLocalRuntimeProofPathIdentityV1, DockerLocalRuntimeProofPrivateEvidenceDeclarationV1,
    DockerLocalRuntimeProofRunManifestErrorV1, DockerLocalRuntimeProofRunManifestSourceBindingV1,
    DockerLocalRuntimeProofRunManifestSourceInputV1, DockerLocalRuntimeProofRunWindowV1,
    DockerLocalRuntimeProofTargetDeclarationV1, build_docker_local_runtime_proof_run_manifest_v1,
    parse_docker_local_runtime_proof_run_manifest_v1,
};
use lnsatd::runtime_profile::{
    LoadedDockerLocalRuntimeProfileV1, parse_docker_local_runtime_profile_v1,
};
use serde_json::{Value, json};

const PROFILE_FIXTURE: &[u8] =
    include_bytes!("../../../fixtures/contracts/phase11-docker-local-profile-v1.json");
const MANIFEST_FIXTURE: &str = include_str!(
    "../../../fixtures/contracts/phase11-docker-local-runtime-proof-run-manifest-v1.json"
);

#[test]
fn fixture_locks_private_source_only_boundary() {
    let fixture: Value = serde_json::from_str(MANIFEST_FIXTURE).expect("fixture JSON");
    assert_eq!(
        fixture["fixture_id"],
        "phase11-docker-local-runtime-proof-run-manifest-v1"
    );
    for field in [
        "phase11_complete",
        "execution_authorized",
        "real_docker_proof",
        "production_supported",
    ] {
        assert_eq!(fixture[field], false, "{field}");
    }
    assert_eq!(fixture["contract"]["runtime_execution"], false);
    assert_eq!(fixture["contract"]["proves_human_authority"], false);
}

#[test]
fn build_and_canonical_parse_bind_closed_metadata_without_runtime_io() {
    let (plan, requirements, harness) = inputs();
    let source = source();
    let built = build_docker_local_runtime_proof_run_manifest_v1(
        &plan,
        &requirements,
        &harness,
        &source,
        declarations(),
    )
    .expect("manifest");
    let parsed = parse_docker_local_runtime_proof_run_manifest_v1(
        &plan,
        &requirements,
        &harness,
        &source,
        built.canonical_json().as_bytes(),
    )
    .expect("canonical parse");
    assert_eq!(parsed.manifest(), built.manifest());
    assert_eq!(parsed.digest(), built.digest());
    assert_eq!(
        parsed.manifest().bindings.proof_plan_digest,
        plan.digest_text()
    );
    assert_eq!(
        parsed.manifest().bindings.evidence_requirements_digest,
        requirements.digest_text()
    );
    assert_eq!(
        parsed.manifest().bindings.execution_harness_digest,
        harness.digest_text()
    );
    assert_no_runtime_surface(parsed.canonical_json());
}

#[test]
fn parser_rejects_noncanonical_duplicate_unknown_deep_and_oversize() {
    let (plan, requirements, harness) = inputs();
    let source = source();
    let built = build_docker_local_runtime_proof_run_manifest_v1(
        &plan,
        &requirements,
        &harness,
        &source,
        declarations(),
    )
    .expect("manifest");
    reject(
        &plan,
        &requirements,
        &harness,
        &source,
        &serde_json::to_string_pretty(built.manifest()).expect("pretty"),
    );
    reject(
        &plan,
        &requirements,
        &harness,
        &source,
        &format!(
            "{{\"schema_id\":\"duplicate\",{}",
            &built.canonical_json()[1..]
        ),
    );
    reject(
        &plan,
        &requirements,
        &harness,
        &source,
        &format!(
            "{},\"unknown\":false}}",
            &built.canonical_json()[..built.canonical_json().len() - 1]
        ),
    );
    assert_eq!(
        parse_docker_local_runtime_proof_run_manifest_v1(
            &plan,
            &requirements,
            &harness,
            &source,
            format!("{}0{}", "[".repeat(65), "]".repeat(65)).as_bytes()
        ),
        Err(DockerLocalRuntimeProofRunManifestErrorV1::ManifestTooDeep)
    );
    assert_eq!(
        parse_docker_local_runtime_proof_run_manifest_v1(
            &plan,
            &requirements,
            &harness,
            &source,
            &vec![b'x'; 32 * 1024 + 1]
        ),
        Err(DockerLocalRuntimeProofRunManifestErrorV1::ManifestTooLarge)
    );
}

#[test]
fn parser_rejects_identity_path_time_digest_and_permission_drift() {
    let (plan, requirements, harness) = inputs();
    let source = source();
    let built = build_docker_local_runtime_proof_run_manifest_v1(
        &plan,
        &requirements,
        &harness,
        &source,
        declarations(),
    )
    .expect("manifest");
    for (path, value) in [
        ("source.revision", json!("g".repeat(40))),
        (
            "source.repository_absolute_path",
            json!("/private/synthetic/substituted-source"),
        ),
        (
            "declarations.run_window.not_before_utc",
            json!("2026-99-99T99:99:99Z"),
        ),
        (
            "declarations.run_window.not_after_utc",
            json!("2026-09-12T12:00:01Z"),
        ),
        ("declarations.run_nonce", json!("short")),
        (
            "declarations.docker_client.absolute_path",
            json!("relative/docker"),
        ),
        (
            "declarations.local_unix_endpoint.digest",
            json!("sha256:bad"),
        ),
        ("declarations.image.pull_policy", json!("always")),
        ("declarations.image.immutable_digest", json!(sha('7'))),
        (
            "declarations.image.in_image_adapter_digest",
            json!(sha('7')),
        ),
        (
            "declarations.disposable_target.repository_absolute_path",
            json!("/private/foreign/repository"),
        ),
        (
            "declarations.disposable_target.marker_absolute_path",
            json!("/private/synthetic/target/foreign-marker"),
        ),
        (
            "declarations.private_evidence.absolute_location",
            json!("/private/synthetic/target/repository/private-evidence"),
        ),
        (
            "declarations.private_evidence.absolute_location",
            json!("/private/synthetic/target/private-evidence"),
        ),
        (
            "declarations.private_evidence.absolute_location",
            json!("/private/synthetic/source/private-evidence"),
        ),
        (
            "declarations.independent_reviewer_reference",
            json!("reviewer\nforged"),
        ),
        ("declarations.observation_permissions.0", json!("drift")),
        ("declarations.execution_permissions.0", json!("drift")),
        (
            "bindings.execution_harness_digest",
            json!(format!("sha256:{}", "0".repeat(64))),
        ),
    ] {
        let mut value_json: Value =
            serde_json::from_str(built.canonical_json()).expect("canonical");
        set_value(&mut value_json, path, value);
        reject(
            &plan,
            &requirements,
            &harness,
            &source,
            &serde_json::to_string(&value_json).expect("drift"),
        );
    }
}

#[test]
fn builder_and_canonical_parser_reject_source_target_overlap() {
    let (plan, requirements, harness) = inputs();
    let source = source();
    for target_root in [
        "/private/synthetic/source/target",
        "/private/synthetic/source",
        "/private/synthetic",
    ] {
        let mut overlapping = declarations();
        overlapping.disposable_target.owner_only_disposable_root = target_root.to_owned();
        overlapping.disposable_target.repository_absolute_path =
            format!("{target_root}/repository");
        overlapping.disposable_target.marker_absolute_path =
            format!("{target_root}/repository/marker");
        assert_eq!(
            build_docker_local_runtime_proof_run_manifest_v1(
                &plan,
                &requirements,
                &harness,
                &source,
                overlapping,
            ),
            Err(DockerLocalRuntimeProofRunManifestErrorV1::ManifestInvalid),
            "overlapping target root {target_root}",
        );
    }

    let built = build_docker_local_runtime_proof_run_manifest_v1(
        &plan,
        &requirements,
        &harness,
        &source,
        declarations(),
    )
    .expect("manifest");
    for target_root in [
        "/private/synthetic/source/target",
        "/private/synthetic/source",
        "/private/synthetic",
    ] {
        let mut value: Value = serde_json::from_str(built.canonical_json()).expect("canonical");
        set_value(
            &mut value,
            "declarations.disposable_target.owner_only_disposable_root",
            json!(target_root),
        );
        set_value(
            &mut value,
            "declarations.disposable_target.repository_absolute_path",
            json!(format!("{target_root}/repository")),
        );
        set_value(
            &mut value,
            "declarations.disposable_target.marker_absolute_path",
            json!(format!("{target_root}/repository/marker")),
        );
        reject(
            &plan,
            &requirements,
            &harness,
            &source,
            &serde_json::to_string(&value).expect("canonical source-target overlap"),
        );
    }
}

fn inputs() -> (
    DockerLocalRuntimeProofPlanOutputV1,
    DockerLocalRuntimeProofEvidenceRequirementsOutputV1,
    DockerLocalRuntimeProofExecutionHarnessOutputV1,
) {
    let mut value: Value = serde_json::from_slice(PROFILE_FIXTURE).expect("profile");
    value["schema_version"] = json!(2);
    value["supervisor"] = json!({"docker_executable_digest": sha('c'), "verifier_git_executable_digest": sha('d'), "docker_host": "unix:///private/tmp/synthetic.sock"});
    let profile: LoadedDockerLocalRuntimeProfileV1 =
        parse_docker_local_runtime_profile_v1(&serde_json::to_vec(&value).expect("bytes"))
            .expect("profile");
    let plan = build_docker_local_runtime_proof_plan_v1(&profile).expect("plan");
    let requirements =
        build_docker_local_runtime_proof_evidence_requirements_v1(&plan).expect("requirements");
    let harness = build_docker_local_runtime_proof_execution_harness_v1(&plan, &requirements)
        .expect("harness");
    (plan, requirements, harness)
}

fn declarations() -> DockerLocalRuntimeProofRunManifestSourceInputV1 {
    let path = |name: &str, byte| DockerLocalRuntimeProofPathIdentityV1 {
        absolute_path: format!("/private/synthetic/{name}"),
        digest: sha(byte),
        stable_identity_digest: sha(byte),
    };
    DockerLocalRuntimeProofRunManifestSourceInputV1 {
        run_nonce: "synthetic-run-nonce-0001".to_owned(),
        run_window: DockerLocalRuntimeProofRunWindowV1 {
            not_before_utc: "2026-09-12T10:00:00Z".to_owned(),
            not_after_utc: "2026-09-12T10:15:00Z".to_owned(),
        },
        human_authority_reference: "private-owner-reference".to_owned(),
        host_identity_digest: sha('1'),
        docker_client: path("docker", '2'),
        local_unix_endpoint: path("docker.sock", '3'),
        daemon: DockerLocalRuntimeProofDaemonDeclarationV1 {
            identity_digest: sha('4'),
            api_version: "1.47".to_owned(),
            runtime_version: "27.3.1".to_owned(),
            platform_digest: sha('5'),
            security_posture_digest: sha('6'),
        },
        image: DockerLocalRuntimeProofImageDeclarationV1 {
            immutable_digest: sha('a'),
            provenance_digest: sha('8'),
            platform_digest: sha('9'),
            configuration_digest: sha('a'),
            entrypoint_digest: sha('b'),
            in_image_adapter_absolute_path: "/usr/local/bin/lnsat-git-reference".to_owned(),
            in_image_adapter_digest: sha('b'),
            pull_policy: "never".to_owned(),
        },
        disposable_target: DockerLocalRuntimeProofTargetDeclarationV1 {
            owner_only_disposable_root: "/private/synthetic/target".to_owned(),
            repository_absolute_path: "/private/synthetic/target/repository".to_owned(),
            marker_absolute_path: "/private/synthetic/target/repository/marker".to_owned(),
            base_revision: "b".repeat(40),
            ownership_mode_identity_digest: sha('c'),
            repository_identity_digest: sha('d'),
            marker_digest: sha('e'),
            target_identity_digest: sha('f'),
        },
        host_git_verifier: path("git", '0'),
        served_chain_digest: sha('1'),
        private_evidence: DockerLocalRuntimeProofPrivateEvidenceDeclarationV1 {
            absolute_location: "/private/synthetic/evidence".to_owned(),
            custody_digest: sha('2'),
            redaction_digest: sha('3'),
            cleanup_digest: sha('4'),
            rollback_digest: sha('5'),
        },
        independent_reviewer_reference: "private-independent-review".to_owned(),
        independent_reviewer_digest: sha('6'),
        observation_permissions: strings(
            &DOCKER_LOCAL_RUNTIME_PROOF_RUN_MANIFEST_OBSERVATION_PERMISSIONS_V1,
        ),
        execution_permissions: strings(
            &DOCKER_LOCAL_RUNTIME_PROOF_RUN_MANIFEST_EXECUTION_PERMISSIONS_V1,
        ),
    }
}
fn source() -> DockerLocalRuntimeProofRunManifestSourceBindingV1 {
    DockerLocalRuntimeProofRunManifestSourceBindingV1 {
        repository_absolute_path: "/private/synthetic/source".to_owned(),
        repository_identity_digest: sha('a'),
        revision: "a".repeat(40),
        proof_driver_executable_digest: sha('b'),
    }
}
fn sha(byte: char) -> String {
    format!("sha256:{}", byte.to_string().repeat(64))
}
fn strings(values: &[&str]) -> Vec<String> {
    values.iter().map(|value| (*value).to_owned()).collect()
}
fn reject(
    plan: &DockerLocalRuntimeProofPlanOutputV1,
    requirements: &DockerLocalRuntimeProofEvidenceRequirementsOutputV1,
    harness: &DockerLocalRuntimeProofExecutionHarnessOutputV1,
    source: &DockerLocalRuntimeProofRunManifestSourceBindingV1,
    text: &str,
) {
    assert_eq!(
        parse_docker_local_runtime_proof_run_manifest_v1(
            plan,
            requirements,
            harness,
            source,
            text.as_bytes()
        ),
        Err(DockerLocalRuntimeProofRunManifestErrorV1::ManifestInvalid)
    );
}
fn set_value(value: &mut Value, path: &str, replacement: Value) {
    let mut current = value;
    let mut parts = path.split('.').peekable();
    while let Some(part) = parts.next() {
        if parts.peek().is_none() {
            if let Ok(index) = part.parse::<usize>() {
                current.as_array_mut().expect("array")[index] = replacement;
            } else {
                current[part] = replacement;
            }
            return;
        }
        current = if let Ok(index) = part.parse::<usize>() {
            &mut current.as_array_mut().expect("array")[index]
        } else {
            current.get_mut(part).expect("field")
        };
    }
}
fn assert_no_runtime_surface(canonical: &str) {
    let value: Value = serde_json::from_str(canonical).expect("JSON");
    for field in [
        "phase11_complete",
        "execution_authorized",
        "real_docker_proof",
        "production_supported",
    ] {
        assert_eq!(value[field], false, "{field}");
    }
    assert_eq!(value["contract"]["side_effects"], json!([]));
    assert_eq!(value["contract"]["runtime_execution"], false);
    assert_eq!(value["contract"]["proves_human_authority"], false);
}
