use super::*;
use crate::adapter_process_protocol::{
    DockerLocalAdapterProcessRequestInputV1, DockerLocalAdapterProcessResultOutcomeV1,
    encode_docker_local_adapter_process_result_frame_v1,
};
use crate::docker_local_execution_payload::build_docker_local_execution_payload_request_v1;
use crate::docker_local_supervisor::docker_local_supervised_git_result_digest_v1;
use crate::runtime_profile::{
    DOCKER_LOCAL_ADAPTER_REF_V1, DOCKER_LOCAL_ADAPTER_VERSION_V1, DOCKER_LOCAL_AUDIENCE_V1,
    LoadedDockerLocalRuntimeProfileV1, load_docker_local_runtime_profile_v1,
};
use lnsat_contracts::{
    ExecutionRequestV1Input, decide_packet_envelope_policy_v1, derive_execution_request_v1,
};
use lnsat_store::{
    PHASE7_GIT_FIXTURE_MARKER_V1, Phase7GitExecutionResultV1, Phase7GitRepositoryIdentityV1,
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
    _directory: TestDirectory,
    _socket_listener: UnixListener,
    config: DaemonConfigV1,
    git: GitFixture,
    fake_docker_executable: PathBuf,
    docker_socket: PathBuf,
    invocation_log: PathBuf,
    requester_cookie: String,
    requester_csrf: String,
    packet_project_ref: String,
    resource_ref: String,
    authorization_id: String,
    operation_id: String,
    capability: String,
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
            .with_phase11_served_fake_docker_runtime(&fake_docker_executable)
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

        Self {
            _directory: directory,
            _socket_listener: socket_listener,
            config,
            git,
            fake_docker_executable,
            docker_socket,
            invocation_log,
            requester_cookie,
            requester_csrf: requester_session.raw_csrf_token.clone(),
            packet_project_ref: packet.project_ref,
            resource_ref,
            authorization_id,
            operation_id,
            capability,
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
        "POST {path} HTTP/1.1\r\nHost: {address}\r\n{version_name}: {version}\r\nOrigin: http://{address}\r\nSec-Fetch-Site: same-origin\r\nContent-Type: application/json\r\nContent-Length: {content_length}\r\nCookie: {cookie}\r\n{csrf_name}: {csrf}\r\nConnection: close\r\n\r\n{body}",
        version_name = GATEWAY_CONTRACT_VERSION_HEADER_NAME_V1,
        version = CONTRACT_VERSION_V1_0,
        content_length = body.len(),
        csrf_name = LOCAL_CSRF_HEADER_NAME_V1,
    )
}

fn read_request(address: SocketAddr, path: &str, cookie: &str) -> String {
    let version_name = GATEWAY_CONTRACT_VERSION_HEADER_NAME_V1;
    let version = CONTRACT_VERSION_V1_0;
    format!(
        "GET {path} HTTP/1.1\r\nHost: {address}\r\n{version_name}: {version}\r\nSec-Fetch-Site: same-origin\r\nCookie: {cookie}\r\nConnection: close\r\n\r\n"
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
    format!(
        "{}={}; {}={}",
        lnsat_auth::LOCAL_SESSION_COOKIE_NAME_V1,
        session.raw_session_token,
        lnsat_auth::LOCAL_CSRF_COOKIE_NAME_V1,
        session.raw_csrf_token,
    )
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
