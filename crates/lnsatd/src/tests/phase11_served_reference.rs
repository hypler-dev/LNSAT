use super::*;
use lnsat_contracts::{
    ExecutionRequestV1Input, decide_packet_envelope_policy_v1, derive_execution_request_v1,
};
use lnsat_store::{
    PHASE7_GIT_ADAPTER_REF_V1, PHASE7_GIT_ADAPTER_VERSION_V1, PHASE7_GIT_FIXTURE_MARKER_V1,
    Phase7GitCommitDispatchInputV1,
};
use sha2::{Digest as _, Sha256};
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};

const GIT_EXECUTABLE: &str = "/usr/bin/git";
const PATCH: &[u8] = b"diff --git a/fixture.txt b/fixture.txt\n--- a/fixture.txt\n+++ b/fixture.txt\n@@ -1 +1 @@\n-before\n+after\n";
const OWNER_REF: &str = "identity:human:phase11-owner";
const REQUESTER_REF: &str = "identity:human:phase11-requester";
const OWNER_PASSWORD: &str = "phase eleven owner password value";
const REQUESTER_PASSWORD: &str = "phase eleven requester password value";

struct GitFixture {
    root: PathBuf,
    repository: PathBuf,
    identity: lnsat_store::Phase7GitRepositoryIdentityV1,
    expected_tree_oid: String,
}

struct ServedDaemon {
    address: SocketAddr,
    shutdown: DaemonShutdownV1,
    thread: Option<thread::JoinHandle<Result<(), DaemonErrorV1>>>,
}

impl ServedDaemon {
    fn start(config: &DaemonConfigV1) -> Self {
        let server = DaemonServerV1::bind(config).expect("Phase 11 daemon must bind");
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
            .expect("Phase 11 daemon thread must exist")
            .join()
            .expect("Phase 11 daemon thread must join")
            .expect("Phase 11 daemon must stop cleanly");
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

fn git_output(repository: &Path, arguments: &[&str]) -> Vec<u8> {
    let output = Command::new(GIT_EXECUTABLE)
        .current_dir(repository)
        .env("GIT_CONFIG_NOSYSTEM", "1")
        .env("GIT_CONFIG_GLOBAL", "/dev/null")
        .env("GIT_TERMINAL_PROMPT", "0")
        .args(arguments)
        .output()
        .expect("fixture Git command must start");
    assert!(
        output.status.success(),
        "fixture Git command failed: {}",
        String::from_utf8_lossy(&output.stderr)
    );
    output.stdout
}

fn git_text(repository: &Path, arguments: &[&str]) -> String {
    String::from_utf8(git_output(repository, arguments))
        .expect("fixture Git output must be UTF-8")
        .trim()
        .to_owned()
}

fn digest_text(digest: &[u8; 32]) -> String {
    let mut value = String::from("sha256:");
    for byte in digest {
        use std::fmt::Write as _;
        write!(&mut value, "{byte:02x}").expect("digest formatting cannot fail");
    }
    value
}

fn create_git_fixture(directory: &TestDirectory) -> GitFixture {
    let root = directory.path.join("disposable-git-root");
    let repository = root.join("reference-repository");
    fs::create_dir_all(&repository).expect("disposable repository must create");
    git_output(&repository, &["init", "-b", "main"]);
    fs::write(
        repository.join(PHASE7_GIT_FIXTURE_MARKER_V1),
        "lnsat.disposable_git_fixture.v1\nphase11-served-reference\n",
    )
    .expect("disposable marker must write");
    fs::write(repository.join("fixture.txt"), b"before\n").expect("fixture content must write");
    git_output(
        &repository,
        &["add", "--", PHASE7_GIT_FIXTURE_MARKER_V1, "fixture.txt"],
    );
    let status = Command::new(GIT_EXECUTABLE)
        .current_dir(&repository)
        .env("GIT_CONFIG_NOSYSTEM", "1")
        .env("GIT_CONFIG_GLOBAL", "/dev/null")
        .env("GIT_TERMINAL_PROMPT", "0")
        .env("GIT_AUTHOR_NAME", "LNSAT Fixture")
        .env("GIT_AUTHOR_EMAIL", "fixture@lnsat.invalid")
        .env("GIT_AUTHOR_DATE", "1786490000 +0000")
        .env("GIT_COMMITTER_NAME", "LNSAT Fixture")
        .env("GIT_COMMITTER_EMAIL", "fixture@lnsat.invalid")
        .env("GIT_COMMITTER_DATE", "1786490000 +0000")
        .args(["commit", "--no-gpg-sign", "-m", "fixture base"])
        .status()
        .expect("fixture base commit must start");
    assert!(status.success());

    let identity = lnsat_store::inspect_phase7_disposable_git_repository_v1(
        &repository,
        Path::new(GIT_EXECUTABLE),
    )
    .expect("disposable repository identity must inspect");
    let expected_index = repository.join(".git/lnsat-phase11-expected-index");
    let status = Command::new(GIT_EXECUTABLE)
        .current_dir(&repository)
        .env("GIT_CONFIG_NOSYSTEM", "1")
        .env("GIT_CONFIG_GLOBAL", "/dev/null")
        .env("GIT_TERMINAL_PROMPT", "0")
        .env("GIT_INDEX_FILE", &expected_index)
        .args(["read-tree", identity.base_commit_oid.as_str()])
        .status()
        .expect("expected index must initialize");
    assert!(status.success());
    let mut child = Command::new(GIT_EXECUTABLE)
        .current_dir(&repository)
        .env("GIT_CONFIG_NOSYSTEM", "1")
        .env("GIT_CONFIG_GLOBAL", "/dev/null")
        .env("GIT_TERMINAL_PROMPT", "0")
        .env("GIT_INDEX_FILE", &expected_index)
        .args(["apply", "--cached", "-"])
        .stdin(Stdio::piped())
        .spawn()
        .expect("expected patch must start");
    child
        .stdin
        .take()
        .expect("expected patch stdin must exist")
        .write_all(PATCH)
        .expect("expected patch must write");
    assert!(child.wait().expect("expected patch must finish").success());
    let expected_tree_oid = String::from_utf8(
        Command::new(GIT_EXECUTABLE)
            .current_dir(&repository)
            .env("GIT_CONFIG_NOSYSTEM", "1")
            .env("GIT_CONFIG_GLOBAL", "/dev/null")
            .env("GIT_TERMINAL_PROMPT", "0")
            .env("GIT_INDEX_FILE", &expected_index)
            .arg("write-tree")
            .output()
            .expect("expected tree must write")
            .stdout,
    )
    .expect("expected tree must encode")
    .trim()
    .to_owned();
    fs::remove_file(expected_index).expect("temporary expected index must remove");
    GitFixture {
        root,
        repository,
        identity,
        expected_tree_oid,
    }
}

fn timestamp(offset_seconds: i64) -> String {
    let now = SystemTime::now();
    let value = if offset_seconds >= 0 {
        now.checked_add(Duration::from_secs(offset_seconds.unsigned_abs()))
    } else {
        now.checked_sub(Duration::from_secs(offset_seconds.unsigned_abs()))
    }
    .expect("fixture time must remain representable");
    canonical_system_time_v1(value).expect("fixture time must encode")
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

fn mutation_request(
    address: SocketAddr,
    path: &str,
    cookie: &str,
    csrf: &str,
    body: &str,
) -> String {
    format!(
        concat!(
            "POST {path} HTTP/1.1\r\n",
            "Host: {address}\r\n",
            "{version_name}: {version}\r\n",
            "Origin: http://{address}\r\n",
            "Sec-Fetch-Site: same-origin\r\n",
            "Content-Type: application/json\r\n",
            "Content-Length: {content_length}\r\n",
            "Cookie: {cookie}\r\n",
            "{csrf_name}: {csrf}\r\n",
            "Connection: close\r\n\r\n",
            "{body}"
        ),
        path = path,
        address = address,
        version_name = GATEWAY_CONTRACT_VERSION_HEADER_NAME_V1,
        version = CONTRACT_VERSION_V1_0,
        content_length = body.len(),
        cookie = cookie,
        csrf_name = LOCAL_CSRF_HEADER_NAME_V1,
        csrf = csrf,
        body = body,
    )
}

fn read_request(address: SocketAddr, path: &str, cookie: &str) -> String {
    format!(
        concat!(
            "GET {path} HTTP/1.1\r\n",
            "Host: {address}\r\n",
            "{version_name}: {version}\r\n",
            "Sec-Fetch-Site: same-origin\r\n",
            "Cookie: {cookie}\r\n",
            "Connection: close\r\n\r\n"
        ),
        path = path,
        address = address,
        version_name = GATEWAY_CONTRACT_VERSION_HEADER_NAME_V1,
        version = CONTRACT_VERSION_V1_0,
        cookie = cookie,
    )
}

fn response_json(response: &str, expected_status: &str) -> serde_json::Value {
    assert!(
        response.starts_with(expected_status),
        "unexpected response: {response}"
    );
    assert!(response.contains("LNSAT-Contract-Version: lnsat.contracts.v1_0\r\n"));
    let (_, body) = response
        .split_once("\r\n\r\n")
        .expect("response must have one head boundary");
    serde_json::from_str(body).expect("response body must be JSON")
}

fn served_request_at(address: SocketAddr, request: &[u8]) -> String {
    let mut stream = TcpStream::connect(address).expect("Phase 11 client must connect");
    stream
        .set_read_timeout(Some(Duration::from_secs(30)))
        .expect("Phase 11 client timeout must configure");
    stream
        .write_all(request)
        .expect("Phase 11 request must write");
    let mut response = String::new();
    stream
        .read_to_string(&mut response)
        .expect("Phase 11 response must read");
    response
}

fn send_request_without_reading_response(address: SocketAddr, request: &[u8]) -> TcpStream {
    let mut stream = TcpStream::connect(address).expect("Phase 11 client must connect");
    stream
        .set_write_timeout(Some(Duration::from_secs(10)))
        .expect("Phase 11 client timeout must configure");
    stream
        .write_all(request)
        .expect("Phase 11 disconnected request must write");
    stream
        .flush()
        .expect("Phase 11 disconnected request must flush");
    stream
        .shutdown(std::net::Shutdown::Write)
        .expect("Phase 11 client request half must close");
    stream
}

fn disconnect_without_reading_response(stream: TcpStream) {
    #[cfg(any(target_os = "linux", target_os = "macos"))]
    nix::sys::socket::setsockopt(
        &stream,
        nix::sys::socket::sockopt::Linger,
        &nix::libc::linger {
            l_onoff: 1,
            l_linger: 0,
        },
    )
    .expect("Phase 11 disconnected client must reset without reading response bytes");
    drop(stream);
}

fn wait_for_head_advance(repository: &Path, approved_base: &str) -> String {
    let deadline = std::time::Instant::now() + Duration::from_secs(10);
    loop {
        let current = git_text(repository, &["rev-parse", "HEAD"]);
        if current != approved_base {
            return current;
        }
        assert!(
            std::time::Instant::now() < deadline,
            "Phase 11 disconnected execution must advance HEAD before deadline"
        );
        thread::sleep(Duration::from_millis(10));
    }
}

fn create_unexpected_commit(repository: &Path, tree_oid: &str, parent_oid: &str) -> String {
    let output = Command::new(GIT_EXECUTABLE)
        .current_dir(repository)
        .env("GIT_CONFIG_NOSYSTEM", "1")
        .env("GIT_CONFIG_GLOBAL", "/dev/null")
        .env("GIT_TERMINAL_PROMPT", "0")
        .env("GIT_AUTHOR_NAME", "Unexpected Fixture")
        .env("GIT_AUTHOR_EMAIL", "unexpected@lnsat.invalid")
        .env("GIT_AUTHOR_DATE", "1786500001 +0000")
        .env("GIT_COMMITTER_NAME", "Unexpected Fixture")
        .env("GIT_COMMITTER_EMAIL", "unexpected@lnsat.invalid")
        .env("GIT_COMMITTER_DATE", "1786500001 +0000")
        .args([
            "commit-tree",
            tree_oid,
            "-p",
            parent_oid,
            "-m",
            "unexpected",
        ])
        .output()
        .expect("unexpected commit must start");
    assert!(
        output.status.success(),
        "unexpected commit failed: {}",
        String::from_utf8_lossy(&output.stderr)
    );
    String::from_utf8(output.stdout)
        .expect("unexpected commit oid must encode")
        .trim()
        .to_owned()
}

#[test]
#[allow(clippy::too_many_lines)]
fn phase11_served_reference_intake_executes_once_and_reconciles_without_retry() {
    let contract: serde_json::Value = serde_json::from_str(include_str!(
        "../../../../fixtures/contracts/phase11-served-reference-intake-v1.json"
    ))
    .expect("Phase 11 fixture must parse");
    assert_eq!(contract["packet_id"], "P11-R1");
    assert_eq!(contract["phase11_complete"], false);
    assert_eq!(contract["production_supported"], false);
    assert_eq!(
        contract["fixture_boundary"]["new_routes"],
        serde_json::json!([])
    );
    assert_eq!(
        contract["required_results"],
        serde_json::json!({
            "consequences": 1,
            "attempts": 1,
            "receipts": 1,
            "terminal_state": "completed",
            "disconnected_client_outcome": "unresolved_until_authenticated_read_and_reconciliation",
            "daemon_restart": "required_before_readback",
            "replay": "metadata_only_no_dispatch",
            "reconciliation": "inspection_only_no_dispatch",
        })
    );

    let directory = TestDirectory::new("phase11-served-reference");
    let git_fixture = create_git_fixture(&directory);
    let base_commit_oid = git_fixture.identity.base_commit_oid.clone();
    let packet;
    let policy;
    let owner_session;
    let requester_session;
    {
        let mut store =
            SqliteStore::open(directory.database_path()).expect("Phase 11 store must bootstrap");
        store
            .bootstrap_local_owner_v1(&lnsat_store::LocalOwnerBootstrapInputV1 {
                identity_ref: OWNER_REF,
                display_name: "Phase 11 Owner",
                password: OWNER_PASSWORD,
                created_at: &timestamp(-120),
            })
            .expect("Phase 11 owner must bootstrap");
        owner_session = store
            .issue_local_session_v1(&LocalSessionIssueInputV1 {
                identity_ref: OWNER_REF,
                password: OWNER_PASSWORD,
                issued_at: &timestamp(-110),
                expires_at: &timestamp(600),
            })
            .expect("Phase 11 owner session must issue");
        let requester_created_at = timestamp(-100);
        store
            .create_local_identity_v1(
                &LocalIdentityCreateInputV1 {
                    identity_ref: REQUESTER_REF,
                    display_name: "Phase 11 Requester",
                    role: LocalIdentityRoleV1::Operator,
                    password: REQUESTER_PASSWORD,
                    created_at: &requester_created_at,
                },
                &owner_session.raw_session_token,
                &owner_session.raw_csrf_token,
                &requester_created_at,
            )
            .expect("Phase 11 requester must create");
        requester_session = store
            .issue_local_session_v1(&LocalSessionIssueInputV1 {
                identity_ref: REQUESTER_REF,
                password: REQUESTER_PASSWORD,
                issued_at: &timestamp(-90),
                expires_at: &timestamp(600),
            })
            .expect("Phase 11 requester session must issue");

        let fixture: serde_json::Value = serde_json::from_str(include_str!(
            "../../../../fixtures/contracts/packet-envelope-v1_0.json"
        ))
        .expect("packet fixture wrapper must parse");
        let packet_json = serde_json::to_vec(&fixture["vectors"][0]["packet"])
            .expect("packet fixture must serialize");
        let mut seeded = lnsat_contracts::parse_packet_envelope_v1(&packet_json)
            .expect("packet fixture must parse");
        seeded.packet_id = "pkt_phase11_served_reference_intake".to_owned();
        seeded.idempotency_key = "idem_phase11_served_reference_intake".to_owned();
        seeded.actor_ref = REQUESTER_REF.to_owned();
        seeded.session_ref = format!("session:local:{}", requester_session.session.session_id);
        seeded.resource_refs = vec!["resource:repository:phase11-reference".to_owned()];
        seeded.permission_allow = vec!["deploy.request".to_owned()];
        seeded.requires_approval = true;
        seeded.created_at = timestamp(-80);
        seeded.expires_at = timestamp(300);
        let executable_digest =
            lnsat_store::phase7_git_executable_digest_v1(Path::new(GIT_EXECUTABLE))
                .expect("Git executable must hash");
        let patch_digest: [u8; 32] = Sha256::digest(PATCH).into();
        seeded.constraints.insert(
            "execution_proposal".to_owned(),
            serde_json::json!({
                "schema_id": "lnsat.execution_proposal.schema.v1_0",
                "derivation_profile": "lnsat.execution_request.packet_embedded.v1",
                "action": {
                    "kind": "git.commit",
                    "arguments": {
                        "schema_id": "lnsat.git_commit_action.schema.v1",
                        "base_commit_oid": git_fixture.identity.base_commit_oid,
                        "head_ref": git_fixture.identity.head_ref,
                        "allowed_paths": ["fixture.txt"],
                        "patch_sha256": digest_text(&patch_digest),
                        "patch": String::from_utf8(PATCH.to_vec()).expect("patch must be UTF-8"),
                        "expected_tree_oid": git_fixture.expected_tree_oid,
                        "commit_metadata": {
                            "message": "bounded Phase 11 fixture commit\n",
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
                    "resource_ref": seeded.resource_refs[0],
                    "identity": {
                        "schema_id": "lnsat.disposable_git_repository.schema.v1",
                        "repository_path": git_fixture.identity.repository_path,
                        "git_dir_path": git_fixture.identity.git_dir_path,
                        "object_format": git_fixture.identity.object_format,
                        "head_ref": git_fixture.identity.head_ref,
                        "base_commit_oid": git_fixture.identity.base_commit_oid,
                        "fixture_marker_sha256": git_fixture.identity.fixture_marker_sha256
                    }
                },
                "configuration_digest": digest_text(
                    &lnsat_store::phase7_git_adapter_configuration_digest_v1()
                ),
                "adapter": {
                    "ref": PHASE7_GIT_ADAPTER_REF_V1,
                    "version": PHASE7_GIT_ADAPTER_VERSION_V1
                },
                "executable_digest": digest_text(&executable_digest),
                "audience": "audience:gateway:local"
            }),
        );
        let decided = decide_packet_envelope_policy_v1(&seeded, &timestamp(-70))
            .expect("Phase 11 policy must derive");
        store
            .append_packet_envelope_v1(&seeded)
            .expect("Phase 11 packet must persist");
        store
            .append_policy_decision_v1(&decided)
            .expect("Phase 11 policy must persist");
        packet = seeded;
        policy = decided;
    }

    let config = DaemonConfigV1::for_test(directory.database_path())
        .with_phase8_runtime(&git_fixture.root, Path::new(GIT_EXECUTABLE))
        .expect("Phase 11 runtime config must accept disposable root and Git");
    let daemon = ServedDaemon::start(&config);
    let owner_cookie = cookie(&owner_session);
    let requester_cookie = cookie(&requester_session);

    let approval_request_body = serde_json::json!({
        "project_ref": policy.project_ref,
        "policy_decision_id": policy.decision_id,
    })
    .to_string();
    let approval_request_response = served_request_at(
        daemon.address,
        mutation_request(
            daemon.address,
            "/v1/approval-requests",
            &requester_cookie,
            &requester_session.raw_csrf_token,
            &approval_request_body,
        )
        .as_bytes(),
    );
    let approval_request = response_json(&approval_request_response, "HTTP/1.1 201 Created\r\n");
    let approval_request_id = approval_request["approval_request"]["approval_request_id"]
        .as_str()
        .expect("approval request id must exist")
        .to_owned();
    assert_eq!(
        approval_request["approval_request"]["policy_decision_ref"]["decision_id"],
        policy.decision_id
    );
    assert_eq!(
        approval_request["approval_request"]["requester_ref"],
        REQUESTER_REF
    );
    assert_eq!(approval_request["execution_authorized"], false);

    let decision_body = serde_json::json!({
        "project_ref": packet.project_ref,
        "decision": "approved",
        "reason": "approval.operator_approved",
    })
    .to_string();
    let decision_response = served_request_at(
        daemon.address,
        mutation_request(
            daemon.address,
            &format!("/v1/approval-requests/{approval_request_id}/decision"),
            &owner_cookie,
            &owner_session.raw_csrf_token,
            &decision_body,
        )
        .as_bytes(),
    );
    let decision = response_json(&decision_response, "HTTP/1.1 201 Created\r\n");
    let approval_decision_id = decision["decision"]["approval_decision_id"]
        .as_str()
        .expect("approval decision id must exist")
        .to_owned();
    assert_eq!(decision["decision"]["approver_ref"], OWNER_REF);
    assert_eq!(decision["authorization"]["distinct_human"], true);
    assert_eq!(decision["execution_authorized"], false);

    let authorization_body = serde_json::json!({
        "project_ref": packet.project_ref,
        "approval_decision_id": approval_decision_id,
        "operation_idempotency_key": "idempotency:phase11:reference-operation",
    })
    .to_string();
    let authorization_response = served_request_at(
        daemon.address,
        mutation_request(
            daemon.address,
            "/v1/execution-authorizations",
            &requester_cookie,
            &requester_session.raw_csrf_token,
            &authorization_body,
        )
        .as_bytes(),
    );
    let authorization = response_json(&authorization_response, "HTTP/1.1 201 Created\r\n");
    let authorization_id = authorization["authorization"]["authorization_id"]
        .as_str()
        .expect("authorization id must exist")
        .to_owned();
    let operation_id = authorization["authorization"]["operation_id"]
        .as_str()
        .expect("operation id must exist")
        .to_owned();
    let resource_ref = authorization["authorization"]["resource_ref"]
        .as_str()
        .expect("resource ref must exist")
        .to_owned();
    let capability = authorization["capability"]
        .as_str()
        .expect("first authorization issue must return capability")
        .to_owned();
    assert_eq!(capability.len(), 64);
    assert_eq!(
        authorization["authorization"]["packet_id"],
        packet.packet_id
    );
    assert_eq!(
        authorization["authorization"]["policy_decision_id"],
        policy.decision_id
    );
    assert_eq!(
        authorization["authorization"]["approval_decision_id"],
        approval_decision_id
    );
    assert_eq!(
        authorization["authorization"]["adapter_ref"],
        format!("{PHASE7_GIT_ADAPTER_REF_V1}@{PHASE7_GIT_ADAPTER_VERSION_V1}")
    );

    let execute_body = serde_json::json!({
        "project_ref": packet.project_ref,
        "resource_ref": resource_ref,
        "operation_id": operation_id,
        "idempotency_key": "idempotency:phase11:reference-execute",
        "capability": capability,
    })
    .to_string();
    let execute_request = mutation_request(
        daemon.address,
        &format!("/v1/execution-authorizations/{authorization_id}/execute"),
        &requester_cookie,
        &requester_session.raw_csrf_token,
        &execute_body,
    );
    let disconnected_client =
        send_request_without_reading_response(daemon.address, execute_request.as_bytes());
    let committed_head = wait_for_head_advance(&git_fixture.repository, &base_commit_oid);
    disconnect_without_reading_response(disconnected_client);
    daemon.stop();

    let daemon = ServedDaemon::start(&config);
    assert_eq!(
        git_text(&git_fixture.repository, &["rev-parse", "HEAD^{tree}"]),
        git_fixture.expected_tree_oid
    );
    assert_eq!(
        git_text(
            &git_fixture.repository,
            &["diff-tree", "--no-commit-id", "--name-only", "-r", "HEAD"]
        ),
        "fixture.txt"
    );

    let operation_response = served_request_at(
        daemon.address,
        read_request(
            daemon.address,
            &format!("/v1/operations/{operation_id}"),
            &requester_cookie,
        )
        .as_bytes(),
    );
    let operation = response_json(&operation_response, "HTTP/1.1 200 OK\r\n");
    assert_eq!(operation["operation"]["state"], "completed");
    assert_eq!(operation["operation"]["attempt"]["attempt_sequence"], 1);
    assert_eq!(operation["operation"]["attempt"]["state"], "completed");
    assert_eq!(
        operation["operation"]["attempt"]["adapter_ref"],
        format!("{PHASE7_GIT_ADAPTER_REF_V1}@{PHASE7_GIT_ADAPTER_VERSION_V1}")
    );
    let attempt_id = operation["operation"]["attempt"]["operation_attempt_id"]
        .as_str()
        .expect("operation attempt id must exist after restart")
        .to_owned();
    let receipt_id = operation["operation"]["receipt"]["receipt_id"]
        .as_str()
        .expect("receipt id must exist after restart")
        .to_owned();
    assert!(!operation_response.contains(&capability));

    let attempt_response = served_request_at(
        daemon.address,
        read_request(
            daemon.address,
            &format!("/v1/operations/{operation_id}/attempts/{attempt_id}"),
            &requester_cookie,
        )
        .as_bytes(),
    );
    let attempt = response_json(&attempt_response, "HTTP/1.1 200 OK\r\n");
    assert_eq!(attempt["attempt"]["operation_id"], operation_id);
    assert_eq!(attempt["attempt"]["operation_attempt_id"], attempt_id);
    assert_eq!(attempt["attempt"]["attempt_sequence"], 1);
    assert!(!attempt_response.contains(&capability));

    let reconcile_response = served_request_at(
        daemon.address,
        mutation_request(
            daemon.address,
            &format!("/v1/operations/{operation_id}/reconcile"),
            &requester_cookie,
            &requester_session.raw_csrf_token,
            "{}",
        )
        .as_bytes(),
    );
    let reconciled = response_json(&reconcile_response, "HTTP/1.1 200 OK\r\n");
    assert_eq!(reconciled["operation"]["state"], "completed");
    assert_eq!(reconciled["operation"]["receipt"]["receipt_id"], receipt_id);
    assert_eq!(
        git_text(&git_fixture.repository, &["rev-parse", "HEAD"]),
        committed_head
    );

    let replay_response = served_request_at(
        daemon.address,
        mutation_request(
            daemon.address,
            &format!("/v1/execution-authorizations/{authorization_id}/execute"),
            &requester_cookie,
            &requester_session.raw_csrf_token,
            &execute_body,
        )
        .as_bytes(),
    );
    let replay = response_json(&replay_response, "HTTP/1.1 200 OK\r\n");
    assert_eq!(replay["created"], false);
    assert_eq!(replay["operation"]["state"], "completed");
    assert_eq!(replay["operation"]["attempt"]["attempt_sequence"], 1);
    assert_eq!(replay["operation"]["receipt"]["receipt_id"], receipt_id);
    assert_eq!(
        git_text(&git_fixture.repository, &["rev-parse", "HEAD"]),
        committed_head
    );
    assert!(!replay_response.contains(&capability));

    daemon.stop();
    let mut store =
        SqliteStore::open(directory.database_path()).expect("completed Phase 11 store must reopen");
    store
        .verify_integrity()
        .expect("completed Phase 11 store integrity must pass");
    let authorization_record = store
        .read_phase7_execution_authorization_v1(
            &packet.project_ref,
            &resource_ref,
            &authorization_id,
        )
        .expect("authorization read must work")
        .expect("authorization must exist");
    let authorization_attempt = store
        .read_phase7_authorization_attempt_v1(
            &packet.project_ref,
            &resource_ref,
            &authorization_record.authorization_attempt_id,
        )
        .expect("authorization attempt read must work")
        .expect("authorization attempt must exist");
    let derived = derive_execution_request_v1(&ExecutionRequestV1Input {
        packet: &packet,
        packet_sha256: &authorization_attempt.packet_sha256,
        policy_decision_id: &authorization_attempt.policy_decision_id,
        approval_request_id: &authorization_attempt.approval_request_id,
        approval_decision_id: &authorization_attempt.approval_decision_id,
        requester_ref: &authorization_attempt.requester_ref,
        requester_session_ref: &authorization_attempt.requester_session_ref,
        approver_ref: &authorization_attempt.approver_ref,
        approver_session_ref: &authorization_attempt.approver_session_ref,
        prepared_at: &authorization_attempt.requested_at,
        expires_at: &authorization_attempt.expires_at,
    })
    .expect("execution request must rederive");
    assert_eq!(authorization_attempt.request_digest, derived.request_digest);
    assert_eq!(authorization_attempt.action_digest, derived.action_digest);
    assert_eq!(authorization_record.action_digest, derived.action_digest);
    assert_eq!(authorization_record.target_digest, derived.target_digest);
    assert_eq!(
        authorization_record.configuration_digest,
        derived.configuration_digest
    );
    assert_eq!(
        authorization_record.executable_digest,
        derived.executable_digest
    );
    assert_ne!(authorization_record.operation_request_digest, [0; 32]);
    assert_eq!(authorization_record.operation_id, operation_id);
    assert_eq!(authorization_record.state, "consumed");

    let final_operation = store
        .read_phase8_operation_v1(&operation_id)
        .expect("operation read must work")
        .expect("operation must exist");
    assert_eq!(final_operation.state, "completed");
    assert_eq!(
        final_operation.receipt_id.as_deref(),
        Some(receipt_id.as_str())
    );
    assert_eq!(
        final_operation
            .attempt
            .as_ref()
            .map(|value| value.attempt_sequence),
        Some(1)
    );
    let receipt = store
        .reconcile_phase7_git_commit_v1(&Phase7GitCommitDispatchInputV1 {
            project_ref: &packet.project_ref,
            resource_ref: &resource_ref,
            authorization_id: &authorization_id,
            operation_id: &operation_id,
            consumption_id: final_operation
                .consumption_id
                .as_deref()
                .expect("consumption id must exist"),
            derived_request: &derived,
            repository_path: &git_fixture.repository,
            git_executable: Path::new(GIT_EXECUTABLE),
            patch: PATCH,
        })
        .expect("persisted receipt must revalidate exact Git objects");
    assert!(!receipt.created);
    assert_eq!(receipt.receipt.receipt_id, receipt_id);
    assert_eq!(receipt.receipt.commit_oid, committed_head);
    assert_eq!(receipt.receipt.tree_oid, git_fixture.expected_tree_oid);
    assert_eq!(receipt.receipt.changed_paths, ["fixture.txt"]);
    let patch_digest: [u8; 32] = Sha256::digest(PATCH).into();
    assert_eq!(receipt.receipt.patch_sha256, digest_text(&patch_digest));
    assert_eq!(
        receipt.receipt.metadata.message,
        "bounded Phase 11 fixture commit\n"
    );
    assert_eq!(
        git_text(&git_fixture.repository, &["rev-list", "--count", "HEAD"]),
        "2"
    );

    let unexpected_commit = create_unexpected_commit(
        &git_fixture.repository,
        &git_fixture.expected_tree_oid,
        &base_commit_oid,
    );
    git_output(
        &git_fixture.repository,
        &[
            "update-ref",
            &git_fixture.identity.head_ref,
            &unexpected_commit,
            &committed_head,
        ],
    );
    let unexpected_head_error = store
        .reconcile_phase8_runtime_composition_v1(
            &operation_id,
            &derived,
            &git_fixture.root,
            Path::new(GIT_EXECUTABLE),
        )
        .expect_err("unexpected advanced HEAD must reject exact reconciliation");
    assert_eq!(
        unexpected_head_error,
        lnsat_store::Phase7GitAdapterErrorV1::ReceiptRejected
    );
    git_output(
        &git_fixture.repository,
        &[
            "update-ref",
            &git_fixture.identity.head_ref,
            &committed_head,
            &unexpected_commit,
        ],
    );

    fs::write(git_fixture.repository.join("fixture.txt"), b"tampered\n")
        .expect("unexpected worktree drift must write");
    let drift_error = store
        .reconcile_phase8_runtime_composition_v1(
            &operation_id,
            &derived,
            &git_fixture.root,
            Path::new(GIT_EXECUTABLE),
        )
        .expect_err("unexpected post-commit worktree drift must reject");
    assert_eq!(
        drift_error,
        lnsat_store::Phase7GitAdapterErrorV1::TargetRejected
    );
    fs::write(git_fixture.repository.join("fixture.txt"), b"before\n")
        .expect("approved-base worktree must restore");
    let stable_reconciliation = store
        .reconcile_phase8_runtime_composition_v1(
            &operation_id,
            &derived,
            &git_fixture.root,
            Path::new(GIT_EXECUTABLE),
        )
        .expect("approved-base worktree must reconcile again");
    assert_eq!(stable_reconciliation.state, "completed");
    assert_eq!(
        stable_reconciliation.receipt_id.as_deref(),
        Some(receipt_id.as_str())
    );

    fs::write(
        git_fixture.repository.join("fixture.txt"),
        b"staged drift\n",
    )
    .expect("index-drift content must write");
    git_output(&git_fixture.repository, &["add", "--", "fixture.txt"]);
    fs::write(git_fixture.repository.join("fixture.txt"), b"before\n")
        .expect("worktree must restore while index stays drifted");
    let index_drift_error = store
        .reconcile_phase8_runtime_composition_v1(
            &operation_id,
            &derived,
            &git_fixture.root,
            Path::new(GIT_EXECUTABLE),
        )
        .expect_err("post-commit index drift must reject");
    assert_eq!(
        index_drift_error,
        lnsat_store::Phase7GitAdapterErrorV1::TargetRejected
    );
    git_output(
        &git_fixture.repository,
        &["read-tree", base_commit_oid.as_str()],
    );

    let exclude_path = git_fixture.repository.join(".git/info/exclude");
    let original_exclude = fs::read(&exclude_path).expect("fixture exclude file must read");
    let mut ignored_exclude = original_exclude.clone();
    ignored_exclude.extend_from_slice(b"\nphase11-ignored.tmp\n");
    fs::write(&exclude_path, ignored_exclude).expect("ignored pattern must write");
    let ignored_path = git_fixture.repository.join("phase11-ignored.tmp");
    fs::write(&ignored_path, b"ignored drift\n").expect("ignored drift must write");
    let ignored_drift_error = store
        .reconcile_phase8_runtime_composition_v1(
            &operation_id,
            &derived,
            &git_fixture.root,
            Path::new(GIT_EXECUTABLE),
        )
        .expect_err("ignored post-commit worktree drift must reject");
    assert_eq!(
        ignored_drift_error,
        lnsat_store::Phase7GitAdapterErrorV1::TargetRejected
    );
    fs::remove_file(ignored_path).expect("ignored drift must remove");
    fs::write(exclude_path, original_exclude).expect("fixture exclude file must restore");

    git_output(
        &git_fixture.repository,
        &["update-index", "--assume-unchanged", "--", "fixture.txt"],
    );
    fs::write(
        git_fixture.repository.join("fixture.txt"),
        b"assume-unchanged drift\n",
    )
    .expect("assume-unchanged drift must write");
    let assume_unchanged_error = store
        .reconcile_phase8_runtime_composition_v1(
            &operation_id,
            &derived,
            &git_fixture.root,
            Path::new(GIT_EXECUTABLE),
        )
        .expect_err("assume-unchanged post-commit drift must reject");
    assert_eq!(
        assume_unchanged_error,
        lnsat_store::Phase7GitAdapterErrorV1::TargetRejected
    );
    git_output(
        &git_fixture.repository,
        &["update-index", "--no-assume-unchanged", "--", "fixture.txt"],
    );
    fs::write(git_fixture.repository.join("fixture.txt"), b"before\n")
        .expect("assume-unchanged worktree must restore");

    git_output(
        &git_fixture.repository,
        &["update-index", "--skip-worktree", "--", "fixture.txt"],
    );
    fs::write(
        git_fixture.repository.join("fixture.txt"),
        b"skip-worktree drift\n",
    )
    .expect("skip-worktree drift must write");
    let skip_worktree_error = store
        .reconcile_phase8_runtime_composition_v1(
            &operation_id,
            &derived,
            &git_fixture.root,
            Path::new(GIT_EXECUTABLE),
        )
        .expect_err("skip-worktree post-commit drift must reject");
    assert_eq!(
        skip_worktree_error,
        lnsat_store::Phase7GitAdapterErrorV1::TargetRejected
    );
    git_output(
        &git_fixture.repository,
        &["update-index", "--no-skip-worktree", "--", "fixture.txt"],
    );
    fs::write(git_fixture.repository.join("fixture.txt"), b"before\n")
        .expect("skip-worktree worktree must restore");

    let final_reconciliation = store
        .reconcile_phase8_runtime_composition_v1(
            &operation_id,
            &derived,
            &git_fixture.root,
            Path::new(GIT_EXECUTABLE),
        )
        .expect("restored index and worktree must reconcile");
    assert_eq!(final_reconciliation.state, "completed");
}
