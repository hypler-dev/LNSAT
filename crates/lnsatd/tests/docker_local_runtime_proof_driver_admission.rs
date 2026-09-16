#![forbid(unsafe_code)]

use lnsat_contracts::{
    CONTRACT_VERSION_V1_0, DerivedExecutionRequestV1, EXECUTION_PROPOSAL_SCHEMA_V1_0,
    EXECUTION_REQUEST_DERIVATION_PROFILE_V1, ExecutionRequestV1Input, PacketBudgetV1,
    PacketEnvelopeV1, derive_execution_request_v1, hash_packet_envelope_v1,
};
use lnsat_store::{
    Phase7CapabilityConsumptionRecordV1, Phase8OperationAttemptReadbackV1,
    Phase8OperationReadbackV1, Phase11DockerRuntimeCompositionClaimV1,
};
use lnsatd::adapter_process_protocol::DockerLocalAdapterProcessRequestInputV1;
use lnsatd::docker_local_execution_payload::{
    DockerLocalExecutionPayloadRequestFrameV1, build_docker_local_execution_payload_request_v1,
    parse_docker_local_execution_payload_request_v1,
};
use lnsatd::docker_local_runtime_proof::build_docker_local_runtime_proof_plan_v1;
use lnsatd::docker_local_runtime_proof_driver_admission::{
    DOCKER_LOCAL_RUNTIME_PROOF_DRIVER_ADMISSION_CONTRACT_ID_V1,
    DOCKER_LOCAL_RUNTIME_PROOF_DRIVER_ADMISSION_STATUS_V1,
    DockerLocalRuntimeProofDriverAdmissionErrorV1, DockerLocalRuntimeProofDriverAdmissionInputV1,
    admit_docker_local_runtime_proof_driver_v1,
};
use lnsatd::docker_local_runtime_proof_evidence::build_docker_local_runtime_proof_evidence_requirements_v1;
use lnsatd::docker_local_runtime_proof_execution_harness::build_docker_local_runtime_proof_execution_harness_v1;
use lnsatd::docker_local_runtime_proof_run_manifest::{
    DOCKER_LOCAL_RUNTIME_PROOF_RUN_MANIFEST_EXECUTION_PERMISSIONS_V1,
    DOCKER_LOCAL_RUNTIME_PROOF_RUN_MANIFEST_OBSERVATION_PERMISSIONS_V1,
    DockerLocalRuntimeProofDaemonDeclarationV1, DockerLocalRuntimeProofImageDeclarationV1,
    DockerLocalRuntimeProofPathIdentityV1, DockerLocalRuntimeProofPrivateEvidenceDeclarationV1,
    DockerLocalRuntimeProofRunManifestOutputV1, DockerLocalRuntimeProofRunManifestSourceBindingV1,
    DockerLocalRuntimeProofRunManifestSourceInputV1, DockerLocalRuntimeProofRunWindowV1,
    DockerLocalRuntimeProofTargetDeclarationV1, build_docker_local_runtime_proof_run_manifest_v1,
};
use lnsatd::runtime_profile::{
    DOCKER_LOCAL_ADAPTER_REF_V1, DOCKER_LOCAL_ADAPTER_VERSION_V1, DOCKER_LOCAL_AUDIENCE_V1,
    LoadedDockerLocalRuntimeProfileV1, parse_docker_local_runtime_profile_v1,
};
use serde_json::{Value, json};
use sha2::{Digest, Sha256};

const PROFILE_FIXTURE: &[u8] =
    include_bytes!("../../../fixtures/contracts/phase11-docker-local-profile-v1.json");
const ADMISSION_FIXTURE: &str = include_str!(
    "../../../fixtures/contracts/phase11-docker-local-runtime-proof-driver-admission-v1.json"
);

struct AdmissionFixture {
    profile: LoadedDockerLocalRuntimeProfileV1,
    manifest: DockerLocalRuntimeProofRunManifestOutputV1,
    payload: DockerLocalExecutionPayloadRequestFrameV1,
    claim: Phase11DockerRuntimeCompositionClaimV1,
}

impl AdmissionFixture {
    fn input(&self) -> DockerLocalRuntimeProofDriverAdmissionInputV1<'_> {
        DockerLocalRuntimeProofDriverAdmissionInputV1 {
            run_manifest: &self.manifest,
            claim: &self.claim,
            payload: &self.payload,
            loaded_profile: &self.profile,
        }
    }
}

#[test]
fn exact_fixture_emits_one_structural_binding_without_runtime_claims() {
    let fixture_json: Value = serde_json::from_str(ADMISSION_FIXTURE).expect("fixture JSON");
    let expected_runtime_gate_checks = fixture_json["required_runtime_gate_checks"]
        .as_array()
        .expect("runtime gate checks")
        .iter()
        .map(|value| {
            value
                .as_str()
                .expect("runtime gate check string")
                .to_owned()
        })
        .collect::<Vec<_>>();
    assert_eq!(
        fixture_json["contract"]["contract_id"],
        DOCKER_LOCAL_RUNTIME_PROOF_DRIVER_ADMISSION_CONTRACT_ID_V1
    );
    for field in [
        "phase11_complete",
        "execution_authorized",
        "claim_snapshot_authenticated",
        "durable_claim_state_revalidated",
        "launch_permission_granted",
        "runtime_launch_performed",
        "real_docker_proof",
        "receipt_persisted",
        "production_supported",
    ] {
        assert_eq!(fixture_json[field], false, "{field}");
    }

    let fixture = admission_fixture();
    let admitted = admit_docker_local_runtime_proof_driver_v1(&fixture.input())
        .expect("exact structural snapshot must bind");
    let repeated = admit_docker_local_runtime_proof_driver_v1(&fixture.input())
        .expect("pure evaluation must be deterministic");
    assert_eq!(admitted, repeated);
    assert_eq!(
        admitted.admission().status,
        DOCKER_LOCAL_RUNTIME_PROOF_DRIVER_ADMISSION_STATUS_V1
    );
    assert!(!admitted.admission().phase11_complete);
    assert!(!admitted.admission().execution_authorized);
    assert!(!admitted.admission().claim_snapshot_authenticated);
    assert!(!admitted.admission().durable_claim_state_revalidated);
    assert!(!admitted.admission().launch_permission_granted);
    assert!(!admitted.admission().runtime_launch_performed);
    assert!(!admitted.admission().real_docker_proof);
    assert!(!admitted.admission().receipt_persisted);
    assert!(!admitted.admission().production_supported);
    assert!(admitted.admission().contract.side_effects.is_empty());
    assert!(!admitted.admission().contract.runtime_execution);
    assert!(!admitted.admission().contract.proves_human_authority);
    assert_eq!(
        admitted.admission().required_runtime_gate_checks,
        expected_runtime_gate_checks
    );
    assert_eq!(
        admitted.admission().run_manifest_digest,
        fixture.manifest.digest_text()
    );
    assert_eq!(
        admitted.admission().request.payload_digest,
        fixture.payload.request_digest_text()
    );
    assert_eq!(admitted.admission().claim.operation_state, "dispatching");
    assert_eq!(admitted.admission().claim.attempt_state, "dispatching");
    assert_eq!(admitted.admission().claim.attempt_sequence, 1);
    assert!(!admitted.canonical_json().contains("bounded payload"));
    assert!(!admitted.canonical_json().contains("/private/synthetic"));
    assert!(admitted.digest_text().starts_with("sha256:"));
}

#[test]
fn caller_constructed_claim_snapshot_never_becomes_launch_permission() {
    let fixture = admission_fixture();
    let structural = admit_docker_local_runtime_proof_driver_v1(&fixture.input())
        .expect("caller-constructed structurally valid snapshot must bind");

    assert_eq!(
        structural.admission().claim.consumption_id,
        fixture.claim.consumption.consumption_id
    );
    assert_eq!(
        structural.admission().claim.operation_id,
        fixture.claim.operation.operation_id
    );
    assert_eq!(
        structural.admission().claim.operation_attempt_id,
        fixture
            .claim
            .operation
            .attempt
            .as_ref()
            .expect("attempt")
            .operation_attempt_id
    );
    assert!(!structural.admission().claim_snapshot_authenticated);
    assert!(!structural.admission().durable_claim_state_revalidated);
    assert!(!structural.admission().launch_permission_granted);
    assert!(!structural.admission().execution_authorized);
    assert!(!structural.admission().runtime_launch_performed);
}

#[test]
fn replay_and_later_unknown_receipt_or_reconciliation_snapshots_fail_closed() {
    let fixture = admission_fixture();
    let prior = admit_docker_local_runtime_proof_driver_v1(&fixture.input())
        .expect("initial structural snapshot must bind");
    assert!(!prior.admission().launch_permission_granted);
    assert!(!prior.admission().durable_claim_state_revalidated);

    let mut fixture = admission_fixture();
    fixture.claim.created = false;
    assert_eq!(
        admission_error(&fixture),
        DockerLocalRuntimeProofDriverAdmissionErrorV1::ReplayRejected
    );

    for invalid_sequence in [1, 3] {
        let mut fixture = admission_fixture();
        fixture.claim.operation.state_sequence = invalid_sequence;
        assert_eq!(
            admission_error(&fixture),
            DockerLocalRuntimeProofDriverAdmissionErrorV1::AttemptStateInvalid,
            "operation state sequence {invalid_sequence} must fail closed"
        );
    }

    let mut fixture = admission_fixture();
    fixture.claim.operation.state = "outcome_unknown".to_owned();
    assert_eq!(
        admission_error(&fixture),
        DockerLocalRuntimeProofDriverAdmissionErrorV1::AttemptStateInvalid
    );

    let mut fixture = admission_fixture();
    fixture
        .claim
        .operation
        .attempt
        .as_mut()
        .expect("attempt")
        .state = "completed".to_owned();
    assert_eq!(
        admission_error(&fixture),
        DockerLocalRuntimeProofDriverAdmissionErrorV1::AttemptStateInvalid
    );

    let mut fixture = admission_fixture();
    fixture.claim.operation.receipt_id = Some(format!("rcp_{}", "9".repeat(64)));
    assert_eq!(
        admission_error(&fixture),
        DockerLocalRuntimeProofDriverAdmissionErrorV1::AttemptStateInvalid
    );

    let mut fixture = admission_fixture();
    fixture.claim.operation.reconciliation_status = Some("completed".to_owned());
    assert_eq!(
        admission_error(&fixture),
        DockerLocalRuntimeProofDriverAdmissionErrorV1::AttemptStateInvalid
    );
}

#[test]
fn claim_payload_and_runtime_substitution_fail_closed() {
    let mut fixture = admission_fixture();
    fixture.claim.consumption.idempotency_key = "idempotency:substituted".to_owned();
    assert_eq!(
        admission_error(&fixture),
        DockerLocalRuntimeProofDriverAdmissionErrorV1::ClaimBindingInvalid
    );

    let mut fixture = admission_fixture();
    fixture
        .claim
        .operation
        .attempt
        .as_mut()
        .expect("attempt")
        .tool_arguments_digest = [9_u8; 32];
    assert_eq!(
        admission_error(&fixture),
        DockerLocalRuntimeProofDriverAdmissionErrorV1::ClaimBindingInvalid
    );

    let mut fixture = admission_fixture();
    fixture.claim.consumption.request_digest = [8_u8; 32];
    assert!(admit_docker_local_runtime_proof_driver_v1(&fixture.input()).is_ok());

    let mut fixture = admission_fixture();
    fixture.claim.execution_request_digest = [8_u8; 32];
    assert_eq!(
        admission_error(&fixture),
        DockerLocalRuntimeProofDriverAdmissionErrorV1::ClaimBindingInvalid
    );

    let mut fixture = admission_fixture();
    let mut payload_value: Value =
        serde_json::from_slice(fixture.payload.frame()).expect("payload JSON");
    payload_value["control"]["limits"]["deadline_millis"] = json!(29_000);
    let mut payload_frame = serde_json::to_vec(&payload_value).expect("canonical payload JSON");
    payload_frame.push(b'\n');
    fixture.payload = parse_docker_local_execution_payload_request_v1(&payload_frame)
        .expect("protocol-valid drifted limits payload");
    assert_eq!(
        admission_error(&fixture),
        DockerLocalRuntimeProofDriverAdmissionErrorV1::PayloadBindingInvalid
    );

    let mut fixture = admission_fixture();
    fixture.profile = schema2_profile(&sha('a'), "/workspace/substituted-repository");
    assert_eq!(
        admission_error(&fixture),
        DockerLocalRuntimeProofDriverAdmissionErrorV1::PayloadBindingInvalid
    );

    let mut fixture = admission_fixture();
    fixture.profile = schema2_profile_with_image(&sha('7'));
    assert_eq!(
        admission_error(&fixture),
        DockerLocalRuntimeProofDriverAdmissionErrorV1::RuntimeBindingInvalid
    );
}

#[test]
fn stable_errors_match_fixture_and_do_not_disclose_private_input() {
    let fixture: Value = serde_json::from_str(ADMISSION_FIXTURE).expect("fixture JSON");
    let errors = [
        DockerLocalRuntimeProofDriverAdmissionErrorV1::ManifestBindingInvalid,
        DockerLocalRuntimeProofDriverAdmissionErrorV1::ReplayRejected,
        DockerLocalRuntimeProofDriverAdmissionErrorV1::ClaimBindingInvalid,
        DockerLocalRuntimeProofDriverAdmissionErrorV1::AttemptStateInvalid,
        DockerLocalRuntimeProofDriverAdmissionErrorV1::PayloadBindingInvalid,
        DockerLocalRuntimeProofDriverAdmissionErrorV1::RuntimeBindingInvalid,
        DockerLocalRuntimeProofDriverAdmissionErrorV1::LaunchBindingInvalid,
        DockerLocalRuntimeProofDriverAdmissionErrorV1::CanonicalizationFailed,
    ];
    for (expected, error) in fixture["error_codes"]
        .as_array()
        .expect("error codes")
        .iter()
        .zip(errors)
    {
        assert_eq!(expected, error.code());
        assert_eq!(error.to_string(), error.code());
        assert!(!error.to_string().contains("/private/synthetic"));
        assert!(!error.to_string().contains("bounded payload"));
    }
}

fn admission_error(fixture: &AdmissionFixture) -> DockerLocalRuntimeProofDriverAdmissionErrorV1 {
    match admit_docker_local_runtime_proof_driver_v1(&fixture.input()) {
        Ok(_) => panic!("admission must reject"),
        Err(error) => error,
    }
}

fn admission_fixture() -> AdmissionFixture {
    let profile = schema2_profile_with_image(&sha('a'));
    let plan = build_docker_local_runtime_proof_plan_v1(&profile).expect("plan");
    let requirements =
        build_docker_local_runtime_proof_evidence_requirements_v1(&plan).expect("requirements");
    let harness = build_docker_local_runtime_proof_execution_harness_v1(&plan, &requirements)
        .expect("harness");
    let source = source();
    let manifest = build_docker_local_runtime_proof_run_manifest_v1(
        &plan,
        &requirements,
        &harness,
        &source,
        declarations(&profile),
    )
    .expect("manifest");
    let derived = derived_request(&profile);
    let operation_id = format!("opn_{}", "1".repeat(64));
    let authorization_id = format!("xau_{}", "2".repeat(64));
    let idempotency_key = "idempotency:p11:driver-admission";
    let payload =
        build_docker_local_execution_payload_request_v1(&DockerLocalAdapterProcessRequestInputV1 {
            operation_id: &operation_id,
            authorization_id: &authorization_id,
            idempotency_key,
            attempt_sequence: 1,
            loaded_profile: &profile,
            derived_request: &derived,
        })
        .expect("payload");
    let claim = claim(
        &operation_id,
        &authorization_id,
        idempotency_key,
        &derived,
        &payload,
    );
    AdmissionFixture {
        profile,
        manifest,
        payload,
        claim,
    }
}

fn schema2_profile_with_image(image_digest: &str) -> LoadedDockerLocalRuntimeProfileV1 {
    schema2_profile(image_digest, "/workspace/repository")
}

fn schema2_profile(
    image_digest: &str,
    target_mount_path: &str,
) -> LoadedDockerLocalRuntimeProfileV1 {
    let mut value: Value = serde_json::from_slice(PROFILE_FIXTURE).expect("profile JSON");
    value["schema_version"] = json!(2);
    value["image_digest"] = json!(image_digest);
    value["filesystem"]["target_mount_path"] = json!(target_mount_path);
    value["supervisor"] = json!({
        "docker_executable_digest": sha('c'),
        "verifier_git_executable_digest": sha('d'),
        "docker_host": "unix:///private/tmp/synthetic.sock"
    });
    parse_docker_local_runtime_profile_v1(&serde_json::to_vec(&value).expect("profile bytes"))
        .expect("schema-2 profile")
}

fn derived_request(profile: &LoadedDockerLocalRuntimeProfileV1) -> DerivedExecutionRequestV1 {
    let packet = packet(profile);
    let packet_sha256 = hash_packet_envelope_v1(&packet).expect("packet digest");
    derive_execution_request_v1(&ExecutionRequestV1Input {
        packet: &packet,
        packet_sha256: &packet_sha256,
        policy_decision_id: &format!("pol_{}", "3".repeat(64)),
        approval_request_id: &format!("apr_{}", "4".repeat(64)),
        approval_decision_id: &format!("apd_{}", "5".repeat(64)),
        requester_ref: "identity:human:requester",
        requester_session_ref: "session:local:requester",
        approver_ref: "identity:human:approver",
        approver_session_ref: "session:local:approver",
        prepared_at: "2026-09-13T07:00:00.000Z",
        expires_at: "2026-09-13T07:01:00Z",
    })
    .expect("derived request")
}

fn packet(profile: &LoadedDockerLocalRuntimeProfileV1) -> PacketEnvelopeV1 {
    let patch = "bounded payload\n";
    let patch_sha256 = prefixed_sha256(&Sha256::digest(patch.as_bytes()).into());
    PacketEnvelopeV1 {
        contract_version: CONTRACT_VERSION_V1_0.to_owned(),
        schema_id: "lnsat.packet_envelope.schema.v1_0".to_owned(),
        packet_id: format!("pkt_{}", "1".repeat(64)),
        packet_type: "ExecutionPacket".to_owned(),
        actor_ref: "identity:human:requester".to_owned(),
        session_ref: "session:local:requester".to_owned(),
        project_ref: "project:fixture".to_owned(),
        intent: "Bind one private source-only driver admission".to_owned(),
        risk_level: 5,
        source_refs: vec!["source:fixture".to_owned()],
        resource_refs: vec!["resource:repository:fixture".to_owned()],
        policy_profile_ref: "policy:local:default".to_owned(),
        permission_allow: vec!["deploy.request".to_owned()],
        permission_block: Vec::new(),
        budget: PacketBudgetV1 {
            tokens: 0,
            runtime_seconds: 30,
            cost_microusd: 0,
            cpu_millicores: 1_000,
            memory_bytes: 268_435_456,
        },
        constraints: json!({
            "execution_proposal": {
                "schema_id": EXECUTION_PROPOSAL_SCHEMA_V1_0,
                "derivation_profile": EXECUTION_REQUEST_DERIVATION_PROFILE_V1,
                "action": {
                    "kind": "git.commit",
                    "arguments": {
                        "schema_id": "lnsat.git_commit_action.schema.v1",
                        "base_commit_oid": "1111111111111111111111111111111111111111",
                        "head_ref": "refs/heads/main",
                        "allowed_paths": ["fixture.txt"],
                        "patch_sha256": patch_sha256,
                        "patch": patch,
                        "expected_tree_oid": "2222222222222222222222222222222222222222",
                        "commit_metadata": {
                            "message": "bounded fixture commit\n",
                            "author_name": "LNSAT Adapter",
                            "author_email": "adapter@lnsat.invalid",
                            "author_time": "1786500000 +0000",
                            "committer_name": "LNSAT Adapter",
                            "committer_email": "adapter@lnsat.invalid",
                            "committer_time": "1786500000 +0000"
                        }
                    }
                },
                "target": {
                    "resource_ref": "resource:repository:fixture",
                    "identity": {
                        "schema_id": "lnsat.disposable_git_repository.schema.v1",
                        "repository_path": "/private/tmp/lnsat-p11-driver/repository",
                        "git_dir_path": "/private/tmp/lnsat-p11-driver/repository/.git",
                        "object_format": "sha1",
                        "head_ref": "refs/heads/main",
                        "base_commit_oid": "1111111111111111111111111111111111111111",
                        "fixture_marker_sha256": sha('3')
                    }
                },
                "configuration_digest": profile.authority_configuration_digest_text(),
                "adapter": {
                    "ref": DOCKER_LOCAL_ADAPTER_REF_V1,
                    "version": DOCKER_LOCAL_ADAPTER_VERSION_V1
                },
                "executable_digest": profile.profile().adapter_executable_digest,
                "audience": DOCKER_LOCAL_AUDIENCE_V1
            }
        })
        .as_object()
        .expect("constraints")
        .clone(),
        requires_approval: true,
        idempotency_key: format!("idem_{}", "2".repeat(64)),
        created_at: "2026-09-13T06:59:00Z".to_owned(),
        expires_at: "2026-09-13T07:02:00Z".to_owned(),
    }
}

fn claim(
    operation_id: &str,
    authorization_id: &str,
    idempotency_key: &str,
    derived: &DerivedExecutionRequestV1,
    payload: &DockerLocalExecutionPayloadRequestFrameV1,
) -> Phase11DockerRuntimeCompositionClaimV1 {
    let consumption_id = format!("cns_{}", "6".repeat(64));
    let attempt = Phase8OperationAttemptReadbackV1 {
        operation_attempt_id: format!("opa_{}", "7".repeat(64)),
        audit_binding_id: format!("p7a_{}", "8".repeat(64)),
        operation_id: operation_id.to_owned(),
        project_ref: derived.request.project_ref.clone(),
        resource_ref: derived.request.resource_ref.clone(),
        attempt_sequence: 1,
        adapter_ref: format!("{DOCKER_LOCAL_ADAPTER_REF_V1}@{DOCKER_LOCAL_ADAPTER_VERSION_V1}"),
        protocol_version: "lnsat.adapter_process_protocol.docker_local.v1".to_owned(),
        tool_arguments_digest: payload.tool_arguments_digest(),
        created_at: "2026-09-13T07:00:01.000Z".to_owned(),
        state_event_id: format!("ste_{}", "9".repeat(64)),
        state_audit_binding_id: format!("sta_{}", "a".repeat(64)),
        state_sequence: 1,
        state: "dispatching".to_owned(),
        state_effective_at: "2026-09-13T07:00:01.000Z".to_owned(),
    };
    Phase11DockerRuntimeCompositionClaimV1 {
        created: true,
        execution_request_digest: derived.request_digest,
        consumption: Phase7CapabilityConsumptionRecordV1 {
            consumption_id: consumption_id.clone(),
            audit_binding_id: format!("p7c_{}", "b".repeat(64)),
            project_ref: derived.request.project_ref.clone(),
            resource_ref: derived.request.resource_ref.clone(),
            authorization_id: authorization_id.to_owned(),
            operation_id: operation_id.to_owned(),
            binding_digest: [1_u8; 32],
            idempotency_key: idempotency_key.to_owned(),
            request_digest: [1_u8; 32],
            consumed_at: "2026-09-13T07:00:00.000Z".to_owned(),
            authorization_state_event_id: format!("ste_{}", "c".repeat(64)),
            authorization_state_audit_binding_id: format!("sta_{}", "d".repeat(64)),
            authorization_state_sequence: 3,
        },
        operation: Phase8OperationReadbackV1 {
            operation_id: operation_id.to_owned(),
            operation_audit_binding_id: format!("p8a_{}", "e".repeat(64)),
            authorization_id: authorization_id.to_owned(),
            consumption_id: Some(consumption_id),
            project_ref: derived.request.project_ref.clone(),
            resource_ref: derived.request.resource_ref.clone(),
            state_event_id: format!("ste_{}", "f".repeat(64)),
            state_audit_binding_id: format!("sta_{}", "0".repeat(64)),
            state_sequence: 2,
            state: "dispatching".to_owned(),
            state_effective_at: "2026-09-13T07:00:01.000Z".to_owned(),
            attempt: Some(attempt),
            receipt_id: None,
            receipt_received_at: None,
            reconciliation_id: None,
            reconciliation_status: None,
            reconciliation_recorded_at: None,
        },
    }
}

fn declarations(
    profile: &LoadedDockerLocalRuntimeProfileV1,
) -> DockerLocalRuntimeProofRunManifestSourceInputV1 {
    let path = |name: &str, byte| DockerLocalRuntimeProofPathIdentityV1 {
        absolute_path: format!("/private/synthetic/{name}"),
        digest: sha(byte),
        stable_identity_digest: sha(byte),
    };
    DockerLocalRuntimeProofRunManifestSourceInputV1 {
        run_nonce: "synthetic-run-nonce-0001".to_owned(),
        run_window: DockerLocalRuntimeProofRunWindowV1 {
            not_before_utc: "2026-09-13T10:00:00Z".to_owned(),
            not_after_utc: "2026-09-13T10:15:00Z".to_owned(),
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
            immutable_digest: profile.profile().image_digest.clone(),
            provenance_digest: sha('8'),
            platform_digest: sha('9'),
            configuration_digest: sha('a'),
            entrypoint_digest: sha('b'),
            in_image_adapter_absolute_path: "/usr/local/bin/lnsat-git-reference".to_owned(),
            in_image_adapter_digest: profile.profile().adapter_executable_digest.clone(),
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

fn prefixed_sha256(digest: &[u8; 32]) -> String {
    let mut output = String::from("sha256:");
    for byte in digest {
        use std::fmt::Write as _;
        let _ = write!(output, "{byte:02x}");
    }
    output
}
