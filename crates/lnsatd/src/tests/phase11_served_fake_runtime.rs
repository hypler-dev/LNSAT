use super::*;
use crate::adapter_process_protocol::{
    DockerLocalAdapterProcessRequestInputV1, DockerLocalAdapterProcessResultOutcomeV1,
    encode_docker_local_adapter_process_result_frame_v1,
};
use crate::docker_local_execution_payload::build_docker_local_execution_payload_request_v1;
use crate::docker_local_runtime_proof::build_docker_local_runtime_proof_plan_v1;
use crate::docker_local_runtime_proof_driver_pre_supervisor_guard::{
    DockerLocalRuntimeProofDriverPreSupervisorGuardErrorV1,
    DockerLocalRuntimeProofDriverPreSupervisorGuardInputV1,
    guard_docker_local_runtime_proof_pre_supervisor_v1, runtime_path_identity_declaration_v1,
    runtime_target_identity_declaration_v1,
    supervise_docker_local_runtime_proof_with_final_guard_v1,
};
use crate::docker_local_runtime_proof_evidence::build_docker_local_runtime_proof_evidence_requirements_v1;
use crate::docker_local_runtime_proof_execution_harness::build_docker_local_runtime_proof_execution_harness_v1;
use crate::docker_local_runtime_proof_run_manifest::{
    DOCKER_LOCAL_RUNTIME_PROOF_RUN_MANIFEST_EXECUTION_PERMISSIONS_V1,
    DOCKER_LOCAL_RUNTIME_PROOF_RUN_MANIFEST_OBSERVATION_PERMISSIONS_V1,
    DockerLocalRuntimeProofDaemonDeclarationV1, DockerLocalRuntimeProofImageDeclarationV1,
    DockerLocalRuntimeProofPathIdentityV1, DockerLocalRuntimeProofPrivateEvidenceDeclarationV1,
    DockerLocalRuntimeProofRunManifestOutputV1, DockerLocalRuntimeProofRunManifestSourceBindingV1,
    DockerLocalRuntimeProofRunManifestSourceInputV1, DockerLocalRuntimeProofRunWindowV1,
    DockerLocalRuntimeProofTargetDeclarationV1, build_docker_local_runtime_proof_run_manifest_v1,
};
use crate::docker_local_supervisor::{
    DockerLocalSupervisorErrorV1, DockerLocalSupervisorInputV1,
    docker_local_supervised_git_result_digest_v1,
};
use crate::runtime_profile::{
    DOCKER_LOCAL_ADAPTER_REF_V1, DOCKER_LOCAL_ADAPTER_VERSION_V1, DOCKER_LOCAL_AUDIENCE_V1,
    LoadedDockerLocalRuntimeProfileV1, load_docker_local_runtime_profile_v1,
};
use lnsat_contracts::{
    ExecutionRequestV1Input, decide_packet_envelope_policy_v1, derive_execution_request_v1,
};
use lnsat_store::{
    PHASE7_GIT_FIXTURE_MARKER_V1, Phase7CapabilityRedemptionInputV1, Phase7CapabilitySecretV1,
    Phase7GitExecutionResultV1, Phase7GitRepositoryIdentityV1,
    Phase11DockerRuntimeCompositionInputV1,
};
use serde_json::json;
use sha2::{Digest as _, Sha256};
use std::os::unix::fs::PermissionsExt as _;
use std::os::unix::net::UnixListener;
use std::process::{Command, Stdio};

const GIT_EXECUTABLE: &str = "/usr/bin/git";
const PATCH: &[u8] = b"diff --git a/fixture.txt b/fixture.txt\n--- a/fixture.txt\n+++ b/fixture.txt\n@@ -1 +1 @@\n-before\n+after\n";
const OWNER_REF: &str = "identity:human:phase11-d4b2b-owner";
const REQUESTER_REF: &str = "identity:human:phase11-d4b2b-requester";
const OWNER_PASSWORD: &str = "phase eleven d4b2b owner password";
const REQUESTER_PASSWORD: &str = "phase eleven d4b2b requester password";
const EXECUTE_IDEMPOTENCY: &str = "idempotency:phase11:d4b2b-execute";
const COMMIT_MESSAGE: &str = "bounded Phase 11 fake-runtime commit\n";

#[derive(Clone, Copy)]
enum FakeMode {
    Success,
    ConsequenceThenStderr,
    NoConsequence,
}

struct GitFixture {
    root: PathBuf,
    repository: PathBuf,
    identity: Phase7GitRepositoryIdentityV1,
    expected_tree_oid: String,
    expected_commit_oid: String,
}

struct ServedDaemon {
    address: SocketAddr,
    shutdown: DaemonShutdownV1,
    thread: Option<thread::JoinHandle<Result<(), DaemonErrorV1>>>,
}

impl ServedDaemon {
    fn start(config: &DaemonConfigV1) -> Self {
        let server = DaemonServerV1::bind(config).expect("fake-runtime daemon must bind");
        let address = server.local_addr();
        let shutdown = server.shutdown_handle();
        let thread = thread::spawn(move || server.serve());
        Self {
            address,
            shutdown,
            thread: Some(thread),
        }
    }

    fn stop(mut self) {
        self.shutdown.request_shutdown();
        self.thread
            .take()
            .expect("daemon thread")
            .join()
            .expect("daemon join")
            .expect("daemon clean stop");
    }
}

impl Drop for ServedDaemon {
    fn drop(&mut self) {
        self.shutdown.request_shutdown();
        if let Some(thread) = self.thread.take() {
            let _ = thread.join();
        }
    }
}

struct ServedFakeRuntimeFixture {
    directory: TestDirectory,
    database_path: PathBuf,
    _socket_listener: UnixListener,
    config: DaemonConfigV1,
    git: GitFixture,
    fake_docker_executable: PathBuf,
    docker_socket: PathBuf,
    invocation_log: PathBuf,
    requester_cookie: String,
    requester_session_token: String,
    requester_csrf: String,
    packet_project_ref: String,
    resource_ref: String,
    authorization_id: String,
    operation_id: String,
    capability: String,
    profile: LoadedDockerLocalRuntimeProfileV1,
    payload: crate::docker_local_execution_payload::DockerLocalExecutionPayloadRequestFrameV1,
}

impl ServedFakeRuntimeFixture {
    #[allow(clippy::too_many_lines)]
    fn new(label: &str, mode: FakeMode) -> Self {
        let directory = TestDirectory::new(label);
        let git = create_git_fixture(&directory);
        let result_frame = directory.path.join("adapter-result.json");
        let invocation_log = directory.path.join("fake-docker-invocations.txt");
        let fake_docker_executable = directory.path.join("fake-docker");
        fs::write(
            &fake_docker_executable,
            fake_docker_script(
                mode,
                &git.repository,
                &git.identity.base_commit_oid,
                &git.expected_commit_oid,
                &result_frame,
                &invocation_log,
            ),
        )
        .expect("fake Docker executable");
        fs::set_permissions(&fake_docker_executable, fs::Permissions::from_mode(0o700))
            .expect("fake Docker mode");
        let fake_docker_executable =
            fs::canonicalize(&fake_docker_executable).expect("canonical fake Docker path");

        let docker_socket = directory.path.join("d.sock");
        let socket_listener = UnixListener::bind(&docker_socket).expect("disposable Unix socket");
        fs::set_permissions(&docker_socket, fs::Permissions::from_mode(0o600))
            .expect("disposable socket mode");
        let docker_socket = fs::canonicalize(&docker_socket).expect("canonical socket path");
        let profile = load_schema2_profile(&directory, &fake_docker_executable, &docker_socket);
        let run_manifest = final_supervisor_guard_manifest_from_parts(
            &profile,
            &fake_docker_executable,
            &docker_socket,
            &git,
        );

        let packet;
        let policy;
        let owner_session;
        let requester_session;
        {
            let mut store = SqliteStore::open(directory.database_path()).expect("bootstrap store");
            store
                .bootstrap_local_owner_v1(&lnsat_store::LocalOwnerBootstrapInputV1 {
                    identity_ref: OWNER_REF,
                    display_name: "Phase 11 D4B2B Owner",
                    password: OWNER_PASSWORD,
                    created_at: &timestamp(-120),
                })
                .expect("owner bootstrap");
            owner_session = store
                .issue_local_session_v1(&LocalSessionIssueInputV1 {
                    identity_ref: OWNER_REF,
                    password: OWNER_PASSWORD,
                    issued_at: &timestamp(-110),
                    expires_at: &timestamp(600),
                })
                .expect("owner session");
            let requester_created_at = timestamp(-100);
            store
                .create_local_identity_v1(
                    &LocalIdentityCreateInputV1 {
                        identity_ref: REQUESTER_REF,
                        display_name: "Phase 11 D4B2B Requester",
                        role: LocalIdentityRoleV1::Operator,
                        password: REQUESTER_PASSWORD,
                        created_at: &requester_created_at,
                    },
                    &owner_session.raw_session_token,
                    &owner_session.raw_csrf_token,
                    &requester_created_at,
                )
                .expect("requester identity");
            requester_session = store
                .issue_local_session_v1(&LocalSessionIssueInputV1 {
                    identity_ref: REQUESTER_REF,
                    password: REQUESTER_PASSWORD,
                    issued_at: &timestamp(-90),
                    expires_at: &timestamp(600),
                })
                .expect("requester session");

            let fixture: serde_json::Value = serde_json::from_str(include_str!(
                "../../../../fixtures/contracts/packet-envelope-v1_0.json"
            ))
            .expect("packet fixture");
            let packet_json = serde_json::to_vec(&fixture["vectors"][0]["packet"])
                .expect("packet fixture serialization");
            let mut seeded = lnsat_contracts::parse_packet_envelope_v1(&packet_json)
                .expect("packet fixture parse");
            seeded.packet_id = format!("pkt_{}", "1".repeat(64));
            seeded.idempotency_key = format!("idem_{}", "2".repeat(64));
            seeded.actor_ref = REQUESTER_REF.to_owned();
            seeded.session_ref = format!("session:local:{}", requester_session.session.session_id);
            seeded.resource_refs = vec![format!("resource:repository:d4b2b-{label}")];
            seeded.permission_allow = vec!["deploy.request".to_owned()];
            seeded.requires_approval = true;
            seeded.created_at = timestamp(-80);
            seeded.expires_at = timestamp(300);
            let patch_digest: [u8; 32] = Sha256::digest(PATCH).into();
            seeded.constraints.insert(
                "execution_proposal".to_owned(),
                json!({
                    "schema_id": "lnsat.execution_proposal.schema.v1_0",
                    "derivation_profile": "lnsat.execution_request.packet_embedded.v1",
                    "action": {
                        "kind": "git.commit",
                        "arguments": {
                            "schema_id": "lnsat.git_commit_action.schema.v1",
                            "base_commit_oid": git.identity.base_commit_oid,
                            "head_ref": git.identity.head_ref,
                            "allowed_paths": ["fixture.txt"],
                            "patch_sha256": digest_text(&patch_digest),
                            "patch": String::from_utf8(PATCH.to_vec()).expect("UTF-8 patch"),
                            "expected_tree_oid": git.expected_tree_oid,
                            "commit_metadata": commit_metadata_value()
                        }
                    },
                    "target": {
                        "resource_ref": seeded.resource_refs[0],
                        "identity": {
                            "schema_id": "lnsat.disposable_git_repository.schema.v1",
                            "repository_path": git.identity.repository_path,
                            "git_dir_path": git.identity.git_dir_path,
                            "object_format": git.identity.object_format,
                            "head_ref": git.identity.head_ref,
                            "base_commit_oid": git.identity.base_commit_oid,
                            "fixture_marker_sha256": git.identity.fixture_marker_sha256
                        }
                    },
                    "configuration_digest": profile.authority_configuration_digest_text(),
                    "adapter": {
                        "ref": DOCKER_LOCAL_ADAPTER_REF_V1,
                        "version": DOCKER_LOCAL_ADAPTER_VERSION_V1
                    },
                    "executable_digest": profile.profile().adapter_executable_digest,
                    "audience": DOCKER_LOCAL_AUDIENCE_V1
                }),
            );
            let decided = decide_packet_envelope_policy_v1(&seeded, &timestamp(-70))
                .expect("policy derivation");
            store
                .append_packet_envelope_v1(&seeded)
                .expect("packet persistence");
            store
                .append_policy_decision_v1(&decided)
                .expect("policy persistence");
            packet = seeded;
            policy = decided;
        }

        let config = DaemonConfigV1::for_test(directory.database_path())
            .with_phase8_runtime(&git.root, Path::new(GIT_EXECUTABLE))
            .expect("Phase 8 runtime")
            .with_docker_local_runtime_profile(profile.clone())
            .expect("D2 profile selection")
            .with_phase11_served_fake_docker_runtime(&fake_docker_executable, run_manifest)
            .expect("fake-only served runtime");
        let daemon = ServedDaemon::start(&config);
        let owner_cookie = cookie(&owner_session);
        let requester_cookie = cookie(&requester_session);

        let approval_request = response_json(
            &served_request_at(
                daemon.address,
                mutation_request(
                    daemon.address,
                    "/v1/approval-requests",
                    &requester_cookie,
                    &requester_session.raw_csrf_token,
                    &json!({
                        "project_ref": policy.project_ref,
                        "policy_decision_id": policy.decision_id,
                    })
                    .to_string(),
                )
                .as_bytes(),
            ),
            "HTTP/1.1 201 Created\r\n",
        );
        let approval_request_id = approval_request["approval_request"]["approval_request_id"]
            .as_str()
            .expect("approval request id")
            .to_owned();
        let decision = response_json(
            &served_request_at(
                daemon.address,
                mutation_request(
                    daemon.address,
                    &format!("/v1/approval-requests/{approval_request_id}/decision"),
                    &owner_cookie,
                    &owner_session.raw_csrf_token,
                    &json!({
                        "project_ref": packet.project_ref,
                        "decision": "approved",
                        "reason": "approval.operator_approved",
                    })
                    .to_string(),
                )
                .as_bytes(),
            ),
            "HTTP/1.1 201 Created\r\n",
        );
        let approval_decision_id = decision["decision"]["approval_decision_id"]
            .as_str()
            .expect("approval decision id")
            .to_owned();
        let authorization = response_json(
            &served_request_at(
                daemon.address,
                mutation_request(
                    daemon.address,
                    "/v1/execution-authorizations",
                    &requester_cookie,
                    &requester_session.raw_csrf_token,
                    &json!({
                        "project_ref": packet.project_ref,
                        "approval_decision_id": approval_decision_id,
                        "operation_idempotency_key": format!("idempotency:phase11:d4b2b-{label}"),
                    })
                    .to_string(),
                )
                .as_bytes(),
            ),
            "HTTP/1.1 201 Created\r\n",
        );
        assert_eq!(
            authorization["authorization"]["adapter_ref"],
            format!("{DOCKER_LOCAL_ADAPTER_REF_V1}@{DOCKER_LOCAL_ADAPTER_VERSION_V1}")
        );
        let authorization_id = authorization["authorization"]["authorization_id"]
            .as_str()
            .expect("authorization id")
            .to_owned();
        let operation_id = authorization["authorization"]["operation_id"]
            .as_str()
            .expect("operation id")
            .to_owned();
        let resource_ref = authorization["authorization"]["resource_ref"]
            .as_str()
            .expect("resource ref")
            .to_owned();
        let capability = authorization["capability"]
            .as_str()
            .expect("capability")
            .to_owned();
        daemon.stop();

        let mut store = SqliteStore::open(directory.database_path()).expect("payload read store");
        let authorization_record = store
            .read_phase7_execution_authorization_v1(
                &packet.project_ref,
                &resource_ref,
                &authorization_id,
            )
            .expect("authorization read")
            .expect("authorization exists");
        let attempt = store
            .read_phase7_authorization_attempt_v1(
                &packet.project_ref,
                &resource_ref,
                &authorization_record.authorization_attempt_id,
            )
            .expect("authorization attempt read")
            .expect("authorization attempt exists");
        let derived = derive_execution_request_v1(&ExecutionRequestV1Input {
            packet: &packet,
            packet_sha256: &attempt.packet_sha256,
            policy_decision_id: &attempt.policy_decision_id,
            approval_request_id: &attempt.approval_request_id,
            approval_decision_id: &attempt.approval_decision_id,
            requester_ref: &attempt.requester_ref,
            requester_session_ref: &attempt.requester_session_ref,
            approver_ref: &attempt.approver_ref,
            approver_session_ref: &attempt.approver_session_ref,
            prepared_at: &attempt.requested_at,
            expires_at: &attempt.expires_at,
        })
        .expect("derived request");
        lnsat_store::phase7_git_tool_arguments_digest_v1(&derived)
            .expect("shared Git tool arguments");
        lnsat_contracts::parse_canonical_execution_request_v1(&derived.canonical_request)
            .expect("canonical execution request reparses");
        crate::adapter_process_protocol::build_docker_local_adapter_process_request_v1(
            &DockerLocalAdapterProcessRequestInputV1 {
                operation_id: &operation_id,
                authorization_id: &authorization_id,
                idempotency_key: EXECUTE_IDEMPOTENCY,
                attempt_sequence: 1,
                loaded_profile: &profile,
                derived_request: &derived,
            },
        )
        .expect("D3 control request");
        let payload = build_docker_local_execution_payload_request_v1(
            &DockerLocalAdapterProcessRequestInputV1 {
                operation_id: &operation_id,
                authorization_id: &authorization_id,
                idempotency_key: EXECUTE_IDEMPOTENCY,
                attempt_sequence: 1,
                loaded_profile: &profile,
                derived_request: &derived,
            },
        )
        .expect("D3/D4A payload");
        let semantic_result = Phase7GitExecutionResultV1 {
            commit_oid: git.expected_commit_oid.clone(),
            tree_oid: git.expected_tree_oid.clone(),
            changed_paths: vec!["fixture.txt".to_owned()],
            patch_sha256: digest_text(&Sha256::digest(PATCH).into()),
            metadata: commit_metadata(),
        };
        let result_digest =
            docker_local_supervised_git_result_digest_v1(&payload, &semantic_result);
        fs::write(
            &result_frame,
            encode_docker_local_adapter_process_result_frame_v1(
                payload.control(),
                DockerLocalAdapterProcessResultOutcomeV1::Completed(result_digest),
            )
            .expect("D3 result frame"),
        )
        .expect("result frame write");
        drop(store);
        let database_path = directory.database_path().clone();

        Self {
            directory,
            database_path,
            _socket_listener: socket_listener,
            config,
            git,
            fake_docker_executable,
            docker_socket,
            invocation_log,
            requester_cookie,
            requester_session_token: requester_session.raw_session_token,
            requester_csrf: requester_session.raw_csrf_token.clone(),
            packet_project_ref: packet.project_ref,
            resource_ref,
            authorization_id,
            operation_id,
            capability,
            profile,
            payload,
        }
    }

    fn execute(&self, daemon: &ServedDaemon, idempotency_key: &str) -> String {
        served_request_at(
            daemon.address,
            mutation_request(
                daemon.address,
                &format!(
                    "/v1/execution-authorizations/{}/execute",
                    self.authorization_id
                ),
                &self.requester_cookie,
                &self.requester_csrf,
                &json!({
                    "project_ref": self.packet_project_ref,
                    "resource_ref": self.resource_ref,
                    "operation_id": self.operation_id,
                    "idempotency_key": idempotency_key,
                    "capability": self.capability,
                })
                .to_string(),
            )
            .as_bytes(),
        )
    }

    fn operation(&self, daemon: &ServedDaemon) -> String {
        served_request_at(
            daemon.address,
            read_request(
                daemon.address,
                &format!("/v1/operations/{}", self.operation_id),
                &self.requester_cookie,
                &self.requester_csrf,
            )
            .as_bytes(),
        )
    }

    fn reconcile(&self, daemon: &ServedDaemon) -> String {
        served_request_at(
            daemon.address,
            mutation_request(
                daemon.address,
                &format!("/v1/operations/{}/reconcile", self.operation_id),
                &self.requester_cookie,
                &self.requester_csrf,
                "{}",
            )
            .as_bytes(),
        )
    }

    fn run_count(&self) -> usize {
        fs::read_to_string(&self.invocation_log)
            .unwrap_or_default()
            .lines()
            .filter(|line| *line == "run")
            .count()
    }

    fn assert_public_safe(&self, response: &str) {
        for forbidden in [
            self.capability.as_str(),
            self.git.repository.to_str().expect("repository UTF-8"),
            self.fake_docker_executable
                .to_str()
                .expect("fake executable UTF-8"),
            self.docker_socket.to_str().expect("socket UTF-8"),
        ] {
            assert!(
                !response.contains(forbidden),
                "response reflected private input"
            );
        }
    }
}

#[test]
fn phase11_served_fake_runtime_executes_once_and_exact_replay_never_redispatches() {
    let contract: serde_json::Value = serde_json::from_str(include_str!(
        "../../../../fixtures/contracts/phase11-docker-local-served-fake-runtime-v1.json"
    ))
    .expect("D4B2B contract fixture");
    assert_eq!(contract["packet_id"], "P11-D4B2B");
    assert_eq!(contract["served_boundary"]["new_routes"], json!([]));
    let phase8: serde_json::Value = serde_json::from_str(include_str!(
        "../../../../fixtures/contracts/phase8-runtime-composition-v1.json"
    ))
    .expect("Phase 8 contract fixture");
    assert_eq!(phase8["routes"].as_array().map(Vec::len), Some(8));

    let fixture = ServedFakeRuntimeFixture::new("d4s", FakeMode::Success);
    let daemon = ServedDaemon::start(&fixture.config);
    let first_response = fixture.execute(&daemon, EXECUTE_IDEMPOTENCY);
    let first = response_json(&first_response, "HTTP/1.1 200 OK\r\n");
    assert_eq!(
        first.as_object().map(serde_json::Map::len),
        Some(5),
        "public Phase 8 response top-level shape must remain frozen"
    );
    assert_eq!(first["created"], true);
    assert_eq!(first["operation"]["state"], "completed");
    assert_eq!(first["operation"]["attempt"]["attempt_sequence"], 1);
    assert_eq!(
        first["operation"]["attempt"]["adapter_ref"],
        format!("{DOCKER_LOCAL_ADAPTER_REF_V1}@{DOCKER_LOCAL_ADAPTER_VERSION_V1}")
    );
    let receipt_id = first["operation"]["receipt"]["receipt_id"]
        .as_str()
        .expect("receipt id")
        .to_owned();
    assert_eq!(fixture.run_count(), 1);
    assert_eq!(
        git_text(&fixture.git.repository, &["rev-parse", "HEAD"]),
        fixture.git.expected_commit_oid
    );
    fixture.assert_public_safe(&first_response);

    let drift_response = fixture.execute(&daemon, "idempotency:phase11:d4b2b-drift");
    response_json(&drift_response, "HTTP/1.1 403 Forbidden\r\n");
    assert_eq!(fixture.run_count(), 1);
    fixture.assert_public_safe(&drift_response);

    let replay_response = fixture.execute(&daemon, EXECUTE_IDEMPOTENCY);
    let replay = response_json(&replay_response, "HTTP/1.1 200 OK\r\n");
    assert_eq!(replay["created"], false);
    assert_eq!(replay["operation"]["attempt"]["attempt_sequence"], 1);
    assert_eq!(replay["operation"]["receipt"]["receipt_id"], receipt_id);
    assert_eq!(fixture.run_count(), 1);
    fixture.assert_public_safe(&replay_response);

    let reconciled = response_json(&fixture.reconcile(&daemon), "HTTP/1.1 200 OK\r\n");
    assert_eq!(reconciled["operation"]["receipt"]["receipt_id"], receipt_id);
    assert_eq!(fixture.run_count(), 1);
    daemon.stop();
}

#[test]
fn phase11_served_fake_runtime_manifest_drift_never_spawns() {
    let fixture = ServedFakeRuntimeFixture::new("served-final-guard-drift", FakeMode::Success);
    let mut declarations = final_supervisor_guard_declarations(&fixture);
    declarations.docker_client.absolute_path = "/private/substituted/docker".to_owned();
    let drifted_manifest =
        pre_supervisor_guard_manifest_with_declarations(&fixture.profile, declarations);
    let config = fixture
        .config
        .clone()
        .with_phase11_served_fake_docker_runtime(&fixture.fake_docker_executable, drifted_manifest)
        .expect("fake-only runtime selection");
    let daemon = ServedDaemon::start(&config);
    let response = fixture.execute(&daemon, EXECUTE_IDEMPOTENCY);
    response_json(&response, "HTTP/1.1 403 Forbidden\r\n");
    assert_eq!(fixture.run_count(), 0);
    fixture.assert_public_safe(&response);
    let operation = response_json(&fixture.operation(&daemon), "HTTP/1.1 200 OK\r\n");
    assert_eq!(operation["operation"]["state"], "outcome_unknown");
    assert!(operation["operation"]["receipt"].is_null());
    daemon.stop();
}

#[test]
fn phase11_served_fake_runtime_unknown_survives_restart_and_reconciles_without_runtime_retry() {
    let fixture = ServedFakeRuntimeFixture::new("d4u", FakeMode::ConsequenceThenStderr);
    let daemon = ServedDaemon::start(&fixture.config);
    let execute_response = fixture.execute(&daemon, EXECUTE_IDEMPOTENCY);
    response_json(&execute_response, "HTTP/1.1 403 Forbidden\r\n");
    assert_eq!(fixture.run_count(), 1);
    assert_eq!(
        git_text(&fixture.git.repository, &["rev-parse", "HEAD"]),
        fixture.git.expected_commit_oid
    );
    fixture.assert_public_safe(&execute_response);
    daemon.stop();

    let daemon = ServedDaemon::start(&fixture.config);
    let unknown_response = fixture.operation(&daemon);
    let unknown = response_json(&unknown_response, "HTTP/1.1 200 OK\r\n");
    assert_eq!(unknown["operation"]["state"], "outcome_unknown");
    assert_eq!(unknown["operation"]["attempt"]["state"], "outcome_unknown");
    assert!(unknown["operation"]["receipt"].is_null());
    assert_eq!(fixture.run_count(), 1);
    fixture.assert_public_safe(&unknown_response);

    let reconcile_response = fixture.reconcile(&daemon);
    let reconciled = response_json(&reconcile_response, "HTTP/1.1 200 OK\r\n");
    assert_eq!(reconciled["operation"]["state"], "completed");
    assert!(reconciled["operation"]["receipt"]["receipt_id"].is_string());
    assert_eq!(
        reconciled["operation"]["reconciliation"]["status"],
        "matched"
    );
    assert_eq!(fixture.run_count(), 1);
    fixture.assert_public_safe(&reconcile_response);

    let replay = response_json(
        &fixture.execute(&daemon, EXECUTE_IDEMPOTENCY),
        "HTTP/1.1 200 OK\r\n",
    );
    assert_eq!(replay["created"], false);
    assert_eq!(replay["operation"]["state"], "completed");
    assert_eq!(fixture.run_count(), 1);
    daemon.stop();
}

#[test]
fn phase11_served_fake_runtime_unchanged_target_stays_unknown_without_retry_or_receipt() {
    let fixture = ServedFakeRuntimeFixture::new("d4n", FakeMode::NoConsequence);
    let daemon = ServedDaemon::start(&fixture.config);
    let execute_response = fixture.execute(&daemon, EXECUTE_IDEMPOTENCY);
    response_json(&execute_response, "HTTP/1.1 403 Forbidden\r\n");
    assert_eq!(fixture.run_count(), 1);
    assert_eq!(
        git_text(&fixture.git.repository, &["rev-parse", "HEAD"]),
        fixture.git.identity.base_commit_oid
    );
    daemon.stop();

    let daemon = ServedDaemon::start(&fixture.config);
    let reconcile_response = fixture.reconcile(&daemon);
    response_json(&reconcile_response, "HTTP/1.1 403 Forbidden\r\n");
    assert_eq!(fixture.run_count(), 1);
    fixture.assert_public_safe(&reconcile_response);

    let operation_response = fixture.operation(&daemon);
    let operation = response_json(&operation_response, "HTTP/1.1 200 OK\r\n");
    assert_eq!(operation["operation"]["state"], "outcome_unknown");
    assert!(operation["operation"]["receipt"].is_null());
    assert_eq!(fixture.run_count(), 1);

    let replay = response_json(
        &fixture.execute(&daemon, EXECUTE_IDEMPOTENCY),
        "HTTP/1.1 200 OK\r\n",
    );
    assert_eq!(replay["created"], false);
    assert_eq!(replay["operation"]["state"], "outcome_unknown");
    assert!(replay["operation"]["receipt"].is_null());
    assert_eq!(fixture.run_count(), 1);
    daemon.stop();
}

fn load_schema2_profile(
    directory: &TestDirectory,
    fake_docker_executable: &Path,
    docker_socket: &Path,
) -> LoadedDockerLocalRuntimeProfileV1 {
    let mut profile: serde_json::Value = serde_json::from_str(include_str!(
        "../../../../fixtures/contracts/phase11-docker-local-profile-v1.json"
    ))
    .expect("D1 profile fixture");
    profile["schema_version"] = json!(2);
    profile["supervisor"] = json!({
        "docker_executable_digest": file_digest(fake_docker_executable),
        "verifier_git_executable_digest": file_digest(Path::new(GIT_EXECUTABLE)),
        "docker_host": format!("unix://{}", docker_socket.display()),
    });
    profile["limits"]["wall_clock_seconds"] = json!(2);
    let profile_path = directory.path.join("docker-local-profile.json");
    fs::write(
        &profile_path,
        serde_json::to_vec(&profile).expect("profile serialization"),
    )
    .expect("profile write");
    fs::set_permissions(&profile_path, fs::Permissions::from_mode(0o600)).expect("profile mode");
    load_docker_local_runtime_profile_v1(&profile_path).expect("D2 profile loader")
}

#[test]
fn pre_supervisor_guard_rebinds_structural_inputs_and_fresh_durable_claim() {
    let fixture = ServedFakeRuntimeFixture::new("pre-supervisor-guard-positive", FakeMode::Success);
    let mut store = SqliteStore::open(&fixture.database_path).expect("guard store must open");
    let handle = claim_pre_supervisor_guard_handle(&mut store, &fixture);
    let manifest = pre_supervisor_guard_manifest(&fixture.profile);
    let guard = guard_docker_local_runtime_proof_pre_supervisor_v1(
        &mut store,
        DockerLocalRuntimeProofDriverPreSupervisorGuardInputV1 {
            run_manifest: &manifest,
            payload: &fixture.payload,
            loaded_profile: &fixture.profile,
            claim_handle: handle,
            raw_session_token: &fixture.requester_session_token,
            raw_csrf_token: &fixture.requester_csrf,
        },
    )
    .expect("exact structural and durable bindings must produce guard");
    assert!(!guard.admission().admission().launch_permission_granted);
    assert!(!guard.admission().admission().runtime_launch_performed);
    assert_eq!(
        guard.configuration_digest(),
        fixture.profile.authority_configuration_digest()
    );
    assert_eq!(guard.durable_proof().claim().operation.state, "dispatching");
    store
        .state()
        .expect("guard must preserve dispatching durable state");
}

#[test]
fn pre_supervisor_guard_structural_or_durable_reject_marks_unknown() {
    let fixture =
        ServedFakeRuntimeFixture::new("pre-supervisor-guard-structural", FakeMode::Success);
    let mut store = SqliteStore::open(&fixture.database_path).expect("guard store must open");
    let handle = claim_pre_supervisor_guard_handle(&mut store, &fixture);
    let drifted_profile = drifted_profile(&fixture);
    let manifest = pre_supervisor_guard_manifest(&drifted_profile);
    assert!(matches!(
        guard_docker_local_runtime_proof_pre_supervisor_v1(
            &mut store,
            DockerLocalRuntimeProofDriverPreSupervisorGuardInputV1 {
                run_manifest: &manifest,
                payload: &fixture.payload,
                loaded_profile: &fixture.profile,
                claim_handle: handle,
                raw_session_token: &fixture.requester_session_token,
                raw_csrf_token: &fixture.requester_csrf,
            },
        ),
        Err(DockerLocalRuntimeProofDriverPreSupervisorGuardErrorV1::StructuralBindingInvalid)
    ));
    assert_phase11_unknown(&store, &fixture.operation_id);

    let fixture = ServedFakeRuntimeFixture::new("pre-supervisor-guard-durable", FakeMode::Success);
    let mut store = SqliteStore::open(&fixture.database_path).expect("guard store must open");
    let handle = claim_pre_supervisor_guard_handle(&mut store, &fixture);
    let manifest = pre_supervisor_guard_manifest(&fixture.profile);
    assert!(matches!(
        guard_docker_local_runtime_proof_pre_supervisor_v1(
            &mut store,
            DockerLocalRuntimeProofDriverPreSupervisorGuardInputV1 {
                run_manifest: &manifest,
                payload: &fixture.payload,
                loaded_profile: &fixture.profile,
                claim_handle: handle,
                raw_session_token: &fixture.requester_session_token,
                raw_csrf_token: "wrong csrf proof",
            },
        ),
        Err(DockerLocalRuntimeProofDriverPreSupervisorGuardErrorV1::DurableProofRejected)
    ));
    assert_phase11_unknown(&store, &fixture.operation_id);
}

#[test]
fn final_supervisor_guard_re_reads_durable_state_at_process_boundary() {
    let fixture = ServedFakeRuntimeFixture::new("final-supervisor-guard", FakeMode::Success);
    let mut store = SqliteStore::open(&fixture.database_path).expect("guard store must open");
    let handle = claim_pre_supervisor_guard_handle(&mut store, &fixture);
    let manifest = final_supervisor_guard_manifest(&fixture);
    let supervised = supervise_docker_local_runtime_proof_with_final_guard_v1(
        &mut store,
        DockerLocalRuntimeProofDriverPreSupervisorGuardInputV1 {
            run_manifest: &manifest,
            payload: &fixture.payload,
            loaded_profile: &fixture.profile,
            claim_handle: handle,
            raw_session_token: &fixture.requester_session_token,
            raw_csrf_token: &fixture.requester_csrf,
        },
        &DockerLocalSupervisorInputV1 {
            payload: &fixture.payload,
            loaded_profile: &fixture.profile,
            docker_executable: &fixture.fake_docker_executable,
            verifier_git_executable: Path::new(GIT_EXECUTABLE),
            disposable_root: &fixture.git.root,
        },
    )
    .expect("fresh durable guard must cross exact fake process boundary");
    assert_eq!(
        supervised.semantic_result.commit_oid,
        fixture.git.expected_commit_oid
    );
    assert_eq!(fixture.run_count(), 1);
    assert_eq!(
        store
            .read_phase8_operation_v1(&fixture.operation_id)
            .expect("operation read")
            .expect("operation exists")
            .state,
        "dispatching"
    );
}

#[test]
fn final_supervisor_guard_rejects_auth_or_cross_input_drift_without_spawn() {
    let fixture = ServedFakeRuntimeFixture::new("final-guard-auth-reject", FakeMode::Success);
    let mut store = SqliteStore::open(&fixture.database_path).expect("guard store must open");
    let handle = claim_pre_supervisor_guard_handle(&mut store, &fixture);
    let manifest = final_supervisor_guard_manifest(&fixture);
    assert_eq!(
        supervise_docker_local_runtime_proof_with_final_guard_v1(
            &mut store,
            DockerLocalRuntimeProofDriverPreSupervisorGuardInputV1 {
                run_manifest: &manifest,
                payload: &fixture.payload,
                loaded_profile: &fixture.profile,
                claim_handle: handle,
                raw_session_token: &fixture.requester_session_token,
                raw_csrf_token: "wrong csrf proof",
            },
            &DockerLocalSupervisorInputV1 {
                payload: &fixture.payload,
                loaded_profile: &fixture.profile,
                docker_executable: &fixture.fake_docker_executable,
                verifier_git_executable: Path::new(GIT_EXECUTABLE),
                disposable_root: &fixture.git.root,
            },
        ),
        Err(DockerLocalSupervisorErrorV1::OutcomeUnknown)
    );
    assert_eq!(fixture.run_count(), 0);
    assert_phase11_unknown(&store, &fixture.operation_id);

    let fixture = ServedFakeRuntimeFixture::new("final-guard-binding-reject", FakeMode::Success);
    let mut store = SqliteStore::open(&fixture.database_path).expect("guard store must open");
    let handle = claim_pre_supervisor_guard_handle(&mut store, &fixture);
    let manifest = final_supervisor_guard_manifest(&fixture);
    let drifted_profile = drifted_profile(&fixture);
    assert_eq!(
        supervise_docker_local_runtime_proof_with_final_guard_v1(
            &mut store,
            DockerLocalRuntimeProofDriverPreSupervisorGuardInputV1 {
                run_manifest: &manifest,
                payload: &fixture.payload,
                loaded_profile: &fixture.profile,
                claim_handle: handle,
                raw_session_token: &fixture.requester_session_token,
                raw_csrf_token: &fixture.requester_csrf,
            },
            &DockerLocalSupervisorInputV1 {
                payload: &fixture.payload,
                loaded_profile: &drifted_profile,
                docker_executable: &fixture.fake_docker_executable,
                verifier_git_executable: Path::new(GIT_EXECUTABLE),
                disposable_root: &fixture.git.root,
            },
        ),
        Err(DockerLocalSupervisorErrorV1::OutcomeUnknown)
    );
    assert_eq!(fixture.run_count(), 0);
    assert_phase11_unknown(&store, &fixture.operation_id);

    let fixture = ServedFakeRuntimeFixture::new("final-guard-preflight-reject", FakeMode::Success);
    let mut store = SqliteStore::open(&fixture.database_path).expect("guard store must open");
    let handle = claim_pre_supervisor_guard_handle(&mut store, &fixture);
    let manifest = final_supervisor_guard_manifest(&fixture);
    let missing_docker = fixture.directory.path.join("missing-docker");
    assert_eq!(
        supervise_docker_local_runtime_proof_with_final_guard_v1(
            &mut store,
            DockerLocalRuntimeProofDriverPreSupervisorGuardInputV1 {
                run_manifest: &manifest,
                payload: &fixture.payload,
                loaded_profile: &fixture.profile,
                claim_handle: handle,
                raw_session_token: &fixture.requester_session_token,
                raw_csrf_token: "wrong csrf proof",
            },
            &DockerLocalSupervisorInputV1 {
                payload: &fixture.payload,
                loaded_profile: &fixture.profile,
                docker_executable: &missing_docker,
                verifier_git_executable: Path::new(GIT_EXECUTABLE),
                disposable_root: &fixture.git.root,
            },
        ),
        Err(DockerLocalSupervisorErrorV1::DockerExecutableInvalid)
    );
    assert_eq!(fixture.run_count(), 0);
    assert_phase11_unknown(&store, &fixture.operation_id);
}

#[test]
fn final_supervisor_guard_rejects_manifest_identity_substitution_without_spawn() {
    assert_final_manifest_substitution_rejected("mfd", |declarations| {
        declarations.docker_client.absolute_path = "/private/substituted/docker".to_owned();
    });
    assert_final_manifest_substitution_rejected("mfe", |declarations| {
        declarations.local_unix_endpoint.absolute_path =
            "/private/substituted/docker.sock".to_owned();
    });
    assert_final_manifest_substitution_rejected("mfg", |declarations| {
        declarations.host_git_verifier.absolute_path = "/private/substituted/git".to_owned();
    });
    assert_final_manifest_substitution_rejected("mft", |declarations| {
        declarations.disposable_target.owner_only_disposable_root =
            "/private/substituted/root".to_owned();
        declarations.disposable_target.repository_absolute_path =
            "/private/substituted/root/repository".to_owned();
        declarations.disposable_target.marker_absolute_path =
            format!("/private/substituted/root/repository/{PHASE7_GIT_FIXTURE_MARKER_V1}");
    });
}

fn assert_final_manifest_substitution_rejected(
    label: &str,
    mutate: impl FnOnce(&mut DockerLocalRuntimeProofRunManifestSourceInputV1),
) {
    let fixture = ServedFakeRuntimeFixture::new(label, FakeMode::Success);
    let mut store = SqliteStore::open(&fixture.database_path).expect("guard store must open");
    let handle = claim_pre_supervisor_guard_handle(&mut store, &fixture);
    let mut declarations = final_supervisor_guard_declarations(&fixture);
    mutate(&mut declarations);
    let manifest = pre_supervisor_guard_manifest_with_declarations(&fixture.profile, declarations);
    assert_eq!(
        supervise_docker_local_runtime_proof_with_final_guard_v1(
            &mut store,
            DockerLocalRuntimeProofDriverPreSupervisorGuardInputV1 {
                run_manifest: &manifest,
                payload: &fixture.payload,
                loaded_profile: &fixture.profile,
                claim_handle: handle,
                raw_session_token: &fixture.requester_session_token,
                raw_csrf_token: &fixture.requester_csrf,
            },
            &DockerLocalSupervisorInputV1 {
                payload: &fixture.payload,
                loaded_profile: &fixture.profile,
                docker_executable: &fixture.fake_docker_executable,
                verifier_git_executable: Path::new(GIT_EXECUTABLE),
                disposable_root: &fixture.git.root,
            },
        ),
        Err(DockerLocalSupervisorErrorV1::OutcomeUnknown)
    );
    assert_eq!(fixture.run_count(), 0);
    assert_phase11_unknown(&store, &fixture.operation_id);
}

fn claim_pre_supervisor_guard_handle(
    store: &mut SqliteStore,
    fixture: &ServedFakeRuntimeFixture,
) -> lnsat_store::Phase11DockerRuntimeCompositionClaimHandleV1 {
    let mut capability = fixture.capability.clone();
    let capability = Phase7CapabilitySecretV1::take_from_canonical_wire_v1(&mut capability)
        .expect("fixture capability must decode");
    store
        .claim_phase11_docker_runtime_composition_handle_v1(
            &Phase11DockerRuntimeCompositionInputV1 {
                redemption: Phase7CapabilityRedemptionInputV1 {
                    project_ref: &fixture.packet_project_ref,
                    resource_ref: &fixture.resource_ref,
                    authorization_id: &fixture.authorization_id,
                    operation_id: &fixture.operation_id,
                    idempotency_key: EXECUTE_IDEMPOTENCY,
                },
                derived_request: fixture.payload.derived_request(),
                disposable_root: &fixture.git.root,
                verifier_git_executable: Path::new(GIT_EXECUTABLE),
            },
            capability,
            &fixture.requester_session_token,
            &fixture.requester_csrf,
        )
        .expect("fixture must create one handle")
}

fn assert_phase11_unknown(store: &SqliteStore, operation_id: &str) {
    assert_eq!(
        store
            .read_phase8_operation_v1(operation_id)
            .expect("operation read must work")
            .expect("operation must exist")
            .state,
        "outcome_unknown"
    );
}

fn drifted_profile(fixture: &ServedFakeRuntimeFixture) -> LoadedDockerLocalRuntimeProfileV1 {
    let mut profile: serde_json::Value = serde_json::from_str(include_str!(
        "../../../../fixtures/contracts/phase11-docker-local-profile-v1.json"
    ))
    .expect("profile fixture must parse");
    profile["schema_version"] = json!(2);
    profile["image_digest"] =
        json!("sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc");
    profile["supervisor"] = json!({
        "docker_executable_digest": file_digest(&fixture.fake_docker_executable),
        "verifier_git_executable_digest": file_digest(Path::new(GIT_EXECUTABLE)),
        "docker_host": format!("unix://{}", fixture.docker_socket.display()),
    });
    profile["limits"]["wall_clock_seconds"] = json!(2);
    let path = fixture
        .directory
        .path
        .join("drifted-docker-local-profile.json");
    fs::write(
        &path,
        serde_json::to_vec(&profile).expect("profile serialize"),
    )
    .expect("drifted profile write");
    fs::set_permissions(&path, fs::Permissions::from_mode(0o600)).expect("drifted profile mode");
    load_docker_local_runtime_profile_v1(&path).expect("drifted profile must load")
}

fn pre_supervisor_guard_manifest(
    profile: &LoadedDockerLocalRuntimeProfileV1,
) -> DockerLocalRuntimeProofRunManifestOutputV1 {
    pre_supervisor_guard_manifest_with_declarations(
        profile,
        pre_supervisor_guard_declarations(profile),
    )
}

fn final_supervisor_guard_manifest(
    fixture: &ServedFakeRuntimeFixture,
) -> DockerLocalRuntimeProofRunManifestOutputV1 {
    final_supervisor_guard_manifest_from_parts(
        &fixture.profile,
        &fixture.fake_docker_executable,
        &fixture.docker_socket,
        &fixture.git,
    )
}

fn final_supervisor_guard_manifest_from_parts(
    profile: &LoadedDockerLocalRuntimeProfileV1,
    fake_docker_executable: &Path,
    docker_socket: &Path,
    git: &GitFixture,
) -> DockerLocalRuntimeProofRunManifestOutputV1 {
    pre_supervisor_guard_manifest_with_declarations(
        profile,
        final_supervisor_guard_declarations_from_parts(
            profile,
            fake_docker_executable,
            docker_socket,
            git,
        ),
    )
}

fn final_supervisor_guard_declarations(
    fixture: &ServedFakeRuntimeFixture,
) -> DockerLocalRuntimeProofRunManifestSourceInputV1 {
    final_supervisor_guard_declarations_from_parts(
        &fixture.profile,
        &fixture.fake_docker_executable,
        &fixture.docker_socket,
        &fixture.git,
    )
}

fn final_supervisor_guard_declarations_from_parts(
    profile: &LoadedDockerLocalRuntimeProfileV1,
    fake_docker_executable: &Path,
    docker_socket: &Path,
    git: &GitFixture,
) -> DockerLocalRuntimeProofRunManifestSourceInputV1 {
    let supervisor = profile.supervisor().expect("schema-2 supervisor");
    let mut declarations = pre_supervisor_guard_declarations(profile);
    declarations.docker_client = runtime_path_identity_declaration_v1(
        fake_docker_executable,
        Some(&supervisor.docker_executable_digest),
    )
    .expect("fake Docker identity");
    declarations.local_unix_endpoint =
        runtime_path_identity_declaration_v1(docker_socket, None).expect("fake endpoint identity");
    declarations.host_git_verifier = runtime_path_identity_declaration_v1(
        Path::new(GIT_EXECUTABLE),
        Some(&supervisor.verifier_git_executable_digest),
    )
    .expect("host Git identity");
    let disposable_root = fs::canonicalize(&git.root).expect("canonical disposable root");
    declarations.disposable_target =
        runtime_target_identity_declaration_v1(&disposable_root, &git.identity)
            .expect("disposable target identity");
    declarations
}

fn pre_supervisor_guard_manifest_with_declarations(
    profile: &LoadedDockerLocalRuntimeProfileV1,
    declarations: DockerLocalRuntimeProofRunManifestSourceInputV1,
) -> DockerLocalRuntimeProofRunManifestOutputV1 {
    let plan = build_docker_local_runtime_proof_plan_v1(profile).expect("plan");
    let requirements =
        build_docker_local_runtime_proof_evidence_requirements_v1(&plan).expect("requirements");
    let harness = build_docker_local_runtime_proof_execution_harness_v1(&plan, &requirements)
        .expect("harness");
    build_docker_local_runtime_proof_run_manifest_v1(
        &plan,
        &requirements,
        &harness,
        &DockerLocalRuntimeProofRunManifestSourceBindingV1 {
            repository_absolute_path: "/private/guard/source".to_owned(),
            repository_identity_digest: guard_sha('a'),
            revision: "a".repeat(40),
            proof_driver_executable_digest: guard_sha('b'),
        },
        declarations,
    )
    .expect("guard manifest")
}

fn pre_supervisor_guard_declarations(
    profile: &LoadedDockerLocalRuntimeProfileV1,
) -> DockerLocalRuntimeProofRunManifestSourceInputV1 {
    let path = |name: &str, byte| DockerLocalRuntimeProofPathIdentityV1 {
        absolute_path: format!("/private/guard/{name}"),
        digest: guard_sha(byte),
        stable_identity_digest: guard_sha(byte),
    };
    DockerLocalRuntimeProofRunManifestSourceInputV1 {
        run_nonce: "private-guard-test-nonce".to_owned(),
        run_window: DockerLocalRuntimeProofRunWindowV1 {
            not_before_utc: "2026-09-16T10:00:00Z".to_owned(),
            not_after_utc: "2026-09-16T10:15:00Z".to_owned(),
        },
        human_authority_reference: "private-guard-test-owner".to_owned(),
        host_identity_digest: guard_sha('1'),
        docker_client: path("docker", '2'),
        local_unix_endpoint: path("socket", '3'),
        daemon: DockerLocalRuntimeProofDaemonDeclarationV1 {
            identity_digest: guard_sha('4'),
            api_version: "1.47".to_owned(),
            runtime_version: "27.3.1".to_owned(),
            platform_digest: guard_sha('5'),
            security_posture_digest: guard_sha('6'),
        },
        image: DockerLocalRuntimeProofImageDeclarationV1 {
            immutable_digest: profile.profile().image_digest.clone(),
            provenance_digest: guard_sha('8'),
            platform_digest: guard_sha('9'),
            configuration_digest: guard_sha('a'),
            entrypoint_digest: guard_sha('b'),
            in_image_adapter_absolute_path: "/usr/local/bin/lnsat-git-reference".to_owned(),
            in_image_adapter_digest: profile.profile().adapter_executable_digest.clone(),
            pull_policy: "never".to_owned(),
        },
        disposable_target: DockerLocalRuntimeProofTargetDeclarationV1 {
            owner_only_disposable_root: "/private/guard/target".to_owned(),
            repository_absolute_path: "/private/guard/target/repository".to_owned(),
            marker_absolute_path: "/private/guard/target/repository/marker".to_owned(),
            base_revision: "b".repeat(40),
            ownership_mode_identity_digest: guard_sha('c'),
            repository_identity_digest: guard_sha('d'),
            marker_digest: guard_sha('e'),
            target_identity_digest: guard_sha('f'),
        },
        host_git_verifier: path("git", '0'),
        served_chain_digest: guard_sha('1'),
        private_evidence: DockerLocalRuntimeProofPrivateEvidenceDeclarationV1 {
            absolute_location: "/private/guard/evidence".to_owned(),
            custody_digest: guard_sha('2'),
            redaction_digest: guard_sha('3'),
            cleanup_digest: guard_sha('4'),
            rollback_digest: guard_sha('5'),
        },
        independent_reviewer_reference: "private-guard-test-reviewer".to_owned(),
        independent_reviewer_digest: guard_sha('6'),
        observation_permissions: DOCKER_LOCAL_RUNTIME_PROOF_RUN_MANIFEST_OBSERVATION_PERMISSIONS_V1
            .iter()
            .map(|value| (*value).to_owned())
            .collect(),
        execution_permissions: DOCKER_LOCAL_RUNTIME_PROOF_RUN_MANIFEST_EXECUTION_PERMISSIONS_V1
            .iter()
            .map(|value| (*value).to_owned())
            .collect(),
    }
}

fn guard_sha(byte: char) -> String {
    format!("sha256:{}", byte.to_string().repeat(64))
}

fn create_git_fixture(directory: &TestDirectory) -> GitFixture {
    let root = directory.path.join("disposable-git-root");
    let repository = root.join("repository");
    fs::create_dir_all(&repository).expect("Git fixture directory");
    git_output(&repository, &["init", "-b", "main"], &[], &[]);
    fs::write(
        repository.join(PHASE7_GIT_FIXTURE_MARKER_V1),
        b"lnsat.disposable_git_fixture.v1\nphase11-d4b2b-served-fake-runtime\n",
    )
    .expect("fixture marker");
    fs::write(repository.join("fixture.txt"), b"before\n").expect("fixture content");
    git_output(
        &repository,
        &["add", "--", PHASE7_GIT_FIXTURE_MARKER_V1, "fixture.txt"],
        &[],
        &[],
    );
    git_output(
        &repository,
        &["commit", "--no-gpg-sign", "-m", "fixture base"],
        &[],
        &base_commit_environment(),
    );
    let identity = lnsat_store::inspect_phase7_disposable_git_repository_v1(
        &repository,
        Path::new(GIT_EXECUTABLE),
    )
    .expect("repository identity");
    let expected_index = root.join("expected-index");
    let index_environment = [("GIT_INDEX_FILE", expected_index.as_os_str())];
    git_output(
        &repository,
        &["read-tree", &identity.base_commit_oid],
        &[],
        &index_environment,
    );
    git_output(
        &repository,
        &["apply", "--cached", "-"],
        PATCH,
        &index_environment,
    );
    let expected_tree_oid =
        git_text_with_environment(&repository, &["write-tree"], &[], &index_environment);
    fs::remove_file(expected_index).expect("expected index cleanup");
    let expected_commit_oid = git_text_with_environment(
        &repository,
        &[
            "commit-tree",
            &expected_tree_oid,
            "-p",
            &identity.base_commit_oid,
            "-F",
            "-",
        ],
        COMMIT_MESSAGE.as_bytes(),
        &commit_environment(),
    );
    GitFixture {
        root,
        repository,
        identity,
        expected_tree_oid,
        expected_commit_oid,
    }
}

fn fake_docker_script(
    mode: FakeMode,
    repository: &Path,
    base_commit: &str,
    expected_commit: &str,
    result_frame: &Path,
    invocation_log: &Path,
) -> String {
    let behavior = match mode {
        FakeMode::Success => format!(
            "{git} -C {repository} update-ref refs/heads/main {expected_commit} {base_commit}\n{cat} {result_frame}\n",
            git = shell_quote(Path::new(GIT_EXECUTABLE)),
            repository = shell_quote(repository),
            cat = shell_quote(Path::new("/bin/cat")),
            result_frame = shell_quote(result_frame),
        ),
        FakeMode::ConsequenceThenStderr => format!(
            "{git} -C {repository} update-ref refs/heads/main {expected_commit} {base_commit}\nprintf '%s\\n' 'fake adapter diagnostic' >&2\n{cat} {result_frame}\n",
            git = shell_quote(Path::new(GIT_EXECUTABLE)),
            repository = shell_quote(repository),
            cat = shell_quote(Path::new("/bin/cat")),
            result_frame = shell_quote(result_frame),
        ),
        FakeMode::NoConsequence => "exit 1\n".to_owned(),
    };
    format!(
        "#!/bin/sh\n# lnsat.hermetic_fake_docker.v1\nset -eu\nprintf 'BEGIN\\n' >> {invocation_log}\nfor argument in \"$@\"; do printf '%s\\n' \"$argument\" >> {invocation_log}; done\nfor argument in \"$@\"; do if [ \"$argument\" = 'rm' ]; then exit 0; fi; done\n{cat} >/dev/null\n{behavior}",
        invocation_log = shell_quote(invocation_log),
        cat = shell_quote(Path::new("/bin/cat")),
    )
}

fn mutation_request(
    address: SocketAddr,
    path: &str,
    cookie: &str,
    csrf: &str,
    body: &str,
) -> String {
    format!(
        "POST {path} HTTP/1.1\r\nHost: {address}\r\n{version_name}: {version}\r\nOrigin: http://{address}\r\nSec-Fetch-Site: same-origin\r\nContent-Type: application/json\r\nContent-Length: {content_length}\r\n{token_name}: {cookie}\r\n{csrf_name}: {csrf}\r\nConnection: close\r\n\r\n{body}",
        version_name = GATEWAY_CONTRACT_VERSION_HEADER_NAME_V1,
        version = CONTRACT_VERSION_V1_0,
        content_length = body.len(),
        token_name = LOCAL_BROWSER_SESSION_TOKEN_HEADER_NAME_V1,
        csrf_name = LOCAL_BROWSER_SESSION_PROOF_HEADER_NAME_V1,
    )
}

fn read_request(address: SocketAddr, path: &str, cookie: &str, proof: &str) -> String {
    let version_name = GATEWAY_CONTRACT_VERSION_HEADER_NAME_V1;
    let version = CONTRACT_VERSION_V1_0;
    format!(
        "GET {path} HTTP/1.1\r\nHost: {address}\r\n{version_name}: {version}\r\nSec-Fetch-Site: same-origin\r\n{LOCAL_BROWSER_SESSION_TOKEN_HEADER_NAME_V1}: {cookie}\r\n{LOCAL_BROWSER_SESSION_PROOF_HEADER_NAME_V1}: {proof}\r\nConnection: close\r\n\r\n",
    )
}

fn served_request_at(address: SocketAddr, request: &[u8]) -> String {
    let mut stream = TcpStream::connect(address).expect("served request connect");
    stream
        .set_read_timeout(Some(Duration::from_secs(30)))
        .expect("served request timeout");
    stream.write_all(request).expect("served request write");
    let mut response = String::new();
    stream
        .read_to_string(&mut response)
        .expect("served response read");
    response
}

fn response_json(response: &str, expected_status: &str) -> serde_json::Value {
    assert!(
        response.starts_with(expected_status),
        "unexpected response: {response}"
    );
    assert!(response.contains("LNSAT-Contract-Version: lnsat.contracts.v1_0\r\n"));
    let (_, body) = response.split_once("\r\n\r\n").expect("response boundary");
    serde_json::from_str(body).expect("response JSON")
}

fn cookie(session: &lnsat_store::LocalSessionIssueResultV1) -> String {
    session.raw_session_token.clone()
}

fn timestamp(offset_seconds: i64) -> String {
    let now = SystemTime::now();
    let value = if offset_seconds >= 0 {
        now.checked_add(Duration::from_secs(offset_seconds.unsigned_abs()))
    } else {
        now.checked_sub(Duration::from_secs(offset_seconds.unsigned_abs()))
    }
    .expect("fixture timestamp");
    canonical_system_time_v1(value).expect("canonical timestamp")
}

fn commit_metadata() -> lnsat_store::Phase7GitCommitMetadataV1 {
    lnsat_store::Phase7GitCommitMetadataV1 {
        message: COMMIT_MESSAGE.to_owned(),
        author_name: "LNSAT Adapter".to_owned(),
        author_email: "adapter@lnsat.invalid".to_owned(),
        author_time: "1786500000 +0000".to_owned(),
        committer_name: "LNSAT Adapter".to_owned(),
        committer_email: "adapter@lnsat.invalid".to_owned(),
        committer_time: "1786500000 +0000".to_owned(),
    }
}

fn commit_metadata_value() -> serde_json::Value {
    let metadata = commit_metadata();
    json!({
        "message": metadata.message,
        "author_name": metadata.author_name,
        "author_email": metadata.author_email,
        "author_time": metadata.author_time,
        "committer_name": metadata.committer_name,
        "committer_email": metadata.committer_email,
        "committer_time": metadata.committer_time,
    })
}

fn base_commit_environment() -> Vec<(&'static str, &'static std::ffi::OsStr)> {
    vec![
        ("GIT_AUTHOR_NAME", std::ffi::OsStr::new("LNSAT Fixture")),
        (
            "GIT_AUTHOR_EMAIL",
            std::ffi::OsStr::new("fixture@lnsat.invalid"),
        ),
        ("GIT_AUTHOR_DATE", std::ffi::OsStr::new("1786490000 +0000")),
        ("GIT_COMMITTER_NAME", std::ffi::OsStr::new("LNSAT Fixture")),
        (
            "GIT_COMMITTER_EMAIL",
            std::ffi::OsStr::new("fixture@lnsat.invalid"),
        ),
        (
            "GIT_COMMITTER_DATE",
            std::ffi::OsStr::new("1786490000 +0000"),
        ),
    ]
}

fn commit_environment() -> Vec<(&'static str, &'static std::ffi::OsStr)> {
    vec![
        ("GIT_AUTHOR_NAME", std::ffi::OsStr::new("LNSAT Adapter")),
        (
            "GIT_AUTHOR_EMAIL",
            std::ffi::OsStr::new("adapter@lnsat.invalid"),
        ),
        ("GIT_AUTHOR_DATE", std::ffi::OsStr::new("1786500000 +0000")),
        ("GIT_COMMITTER_NAME", std::ffi::OsStr::new("LNSAT Adapter")),
        (
            "GIT_COMMITTER_EMAIL",
            std::ffi::OsStr::new("adapter@lnsat.invalid"),
        ),
        (
            "GIT_COMMITTER_DATE",
            std::ffi::OsStr::new("1786500000 +0000"),
        ),
    ]
}

fn git_output(
    repository: &Path,
    arguments: &[&str],
    stdin: &[u8],
    extra_environment: &[(&str, &std::ffi::OsStr)],
) -> std::process::Output {
    let mut command = Command::new(GIT_EXECUTABLE);
    command
        .current_dir(repository)
        .env_clear()
        .env("GIT_CONFIG_NOSYSTEM", "1")
        .env("GIT_CONFIG_GLOBAL", "/dev/null")
        .env("GIT_TERMINAL_PROMPT", "0")
        .args(arguments)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    for (key, value) in extra_environment {
        command.env(key, value);
    }
    let mut child = command.spawn().expect("Git command spawn");
    child
        .stdin
        .take()
        .expect("Git stdin")
        .write_all(stdin)
        .expect("Git stdin write");
    let output = child.wait_with_output().expect("Git command wait");
    assert!(
        output.status.success(),
        "Git {arguments:?} failed: {}",
        String::from_utf8_lossy(&output.stderr)
    );
    output
}

fn git_text(repository: &Path, arguments: &[&str]) -> String {
    git_text_with_environment(repository, arguments, &[], &[])
}

fn git_text_with_environment(
    repository: &Path,
    arguments: &[&str],
    stdin: &[u8],
    extra_environment: &[(&str, &std::ffi::OsStr)],
) -> String {
    String::from_utf8(git_output(repository, arguments, stdin, extra_environment).stdout)
        .expect("Git stdout UTF-8")
        .trim()
        .to_owned()
}

fn file_digest(path: &Path) -> String {
    digest_text(&Sha256::digest(fs::read(path).expect("file digest read")).into())
}

fn digest_text(digest: &[u8; 32]) -> String {
    let mut output = String::from("sha256:");
    for byte in digest {
        use std::fmt::Write as _;
        write!(&mut output, "{byte:02x}").expect("digest formatting");
    }
    output
}

fn shell_quote(path: &Path) -> String {
    let value = path.to_str().expect("fixture path UTF-8");
    format!("'{}'", value.replace('\'', "'\\''"))
}
