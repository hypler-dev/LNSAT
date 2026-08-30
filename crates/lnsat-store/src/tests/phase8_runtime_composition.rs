use super::phase7_git_adapter::{
    GIT_EXECUTABLE, PATCH, create_git_repository, hex_digest, patch_digest,
};
use super::*;
use lnsat_contracts::{
    ApprovalDecisionV1Input, ApprovalDecisionV1Kind, ApprovalDecisionV1Reason,
    ExecutionRequestV1Input, decide_approval_request_v1, decide_packet_envelope_policy_v1,
    derive_execution_request_v1,
};
use std::io::Write as _;
use std::path::Path;
use std::process::{Command, Stdio};
use std::sync::{Arc, Barrier};
use std::thread;
use std::time::{Duration, SystemTime};

const OWNER_PASSWORD: &str = "owner password for phase eight runtime tests";
const REQUESTER_PASSWORD: &str = "requester password for phase eight runtime tests";
const REQUESTER_REF: &str = "identity:human:phase8-requester";

struct Phase8Fixture {
    database: TestDatabase,
    repository: phase7_git_adapter::GitRepositoryFixture,
    store: SqliteStore,
    derived: lnsat_contracts::DerivedExecutionRequestV1,
    project_ref: String,
    resource_ref: String,
    authorization_id: String,
    operation_id: String,
    requester_session_token: String,
    requester_csrf_token: String,
    capability_wire: String,
}

impl Phase8Fixture {
    fn capability(&self) -> Phase7CapabilitySecretV1 {
        let mut wire = self.capability_wire.clone();
        Phase7CapabilitySecretV1::take_from_canonical_wire_v1(&mut wire)
            .expect("synthetic capability must decode")
    }
}

fn timestamp(offset_seconds: i64) -> String {
    let now = SystemTime::now();
    let value = if offset_seconds >= 0 {
        now.checked_add(Duration::from_secs(offset_seconds.unsigned_abs()))
    } else {
        now.checked_sub(Duration::from_secs(offset_seconds.unsigned_abs()))
    }
    .expect("test time must remain representable");
    crate::phase7_nonce::canonical_system_time_v1(value).expect("test time must encode")
}

#[allow(clippy::too_many_lines)]
fn phase8_fixture(sequence: u64) -> Phase8Fixture {
    let executable_digest = phase7_git_executable_digest_v1(Path::new(GIT_EXECUTABLE))
        .expect("Git executable must hash");
    runtime_fixture(
        sequence,
        PHASE7_GIT_ADAPTER_REF_V1,
        phase7_git_adapter_configuration_digest_v1(),
        executable_digest,
    )
}

fn phase11_docker_fixture(sequence: u64) -> Phase8Fixture {
    runtime_fixture(
        sequence,
        PHASE11_DOCKER_GIT_ADAPTER_REF_V1,
        [0x91; 32],
        [0xd4; 32],
    )
}

#[allow(clippy::too_many_lines)]
fn runtime_fixture(
    sequence: u64,
    adapter_ref: &str,
    configuration_digest: [u8; 32],
    executable_digest: [u8; 32],
) -> Phase8Fixture {
    let repository = create_git_repository(sequence);
    let database = TestDatabase::new("phase8-runtime-composition");
    let mut store = SqliteStore::open(&database.path).expect("Phase 8 store must open");

    store
        .bootstrap_local_owner_v1(&LocalOwnerBootstrapInputV1 {
            identity_ref: "identity:human:owner",
            display_name: "Local Owner",
            password: OWNER_PASSWORD,
            created_at: &timestamp(-120),
        })
        .expect("owner must bootstrap");
    let owner = store
        .issue_local_session_v1(&LocalSessionIssueInputV1 {
            identity_ref: "identity:human:owner",
            password: OWNER_PASSWORD,
            issued_at: &timestamp(-110),
            expires_at: &timestamp(600),
        })
        .expect("owner session must issue");
    let requester_created_at = timestamp(-100);
    store
        .create_local_identity_v1(
            &LocalIdentityCreateInputV1 {
                identity_ref: REQUESTER_REF,
                display_name: "Phase 8 Requester",
                role: LocalIdentityRoleV1::Operator,
                password: REQUESTER_PASSWORD,
                created_at: &requester_created_at,
            },
            &owner.raw_session_token,
            &owner.raw_csrf_token,
            &requester_created_at,
        )
        .expect("requester must create");
    let requester = store
        .issue_local_session_v1(&LocalSessionIssueInputV1 {
            identity_ref: REQUESTER_REF,
            password: REQUESTER_PASSWORD,
            issued_at: &timestamp(-90),
            expires_at: &timestamp(600),
        })
        .expect("requester session must issue");

    let mut packet = packet_fixture();
    packet.permission_allow = vec!["deploy.request".to_owned()];
    packet.actor_ref = REQUESTER_REF.to_owned();
    packet.session_ref = format!("session:local:{}", requester.session.session_id);
    packet.packet_id = format!("pkt_{sequence:064x}");
    packet.idempotency_key = format!("idem_{sequence:064x}");
    packet.created_at = timestamp(-80);
    packet.expires_at = timestamp(300);
    let resource_ref = packet.resource_refs[0].clone();
    packet.constraints.insert(
        "execution_proposal".to_owned(),
        serde_json::json!({
            "schema_id": "lnsat.execution_proposal.schema.v1_0",
            "derivation_profile": "lnsat.execution_request.packet_embedded.v1",
            "action": {
                "kind": "git.commit",
                "arguments": {
                    "schema_id": "lnsat.git_commit_action.schema.v1",
                    "base_commit_oid": repository.identity.base_commit_oid,
                    "head_ref": repository.identity.head_ref,
                    "allowed_paths": ["fixture.txt"],
                    "patch_sha256": patch_digest(),
                    "patch": String::from_utf8(PATCH.to_vec()).expect("patch must be UTF-8"),
                    "expected_tree_oid": repository.expected_tree_oid,
                    "commit_metadata": {
                        "message": "bounded Phase 8 fixture commit\n",
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
                "resource_ref": resource_ref,
                "identity": {
                    "schema_id": "lnsat.disposable_git_repository.schema.v1",
                    "repository_path": repository.identity.repository_path,
                    "git_dir_path": repository.identity.git_dir_path,
                    "object_format": repository.identity.object_format,
                    "head_ref": repository.identity.head_ref,
                    "base_commit_oid": repository.identity.base_commit_oid,
                    "fixture_marker_sha256": repository.identity.fixture_marker_sha256
                }
            },
            "configuration_digest": hex_digest(&configuration_digest),
            "adapter": {
                "ref": adapter_ref,
                "version": PHASE7_GIT_ADAPTER_VERSION_V1
            },
            "executable_digest": hex_digest(&executable_digest),
            "audience": "audience:gateway:local"
        }),
    );
    let policy =
        decide_packet_envelope_policy_v1(&packet, &timestamp(-70)).expect("policy must derive");
    store
        .append_packet_envelope_v1(&packet)
        .expect("packet must persist");
    store
        .append_policy_decision_v1(&policy)
        .expect("policy must persist");
    let request = store
        .append_authenticated_approval_request_v1(
            &policy.project_ref,
            &policy.decision_id,
            &requester.raw_session_token,
            &requester.raw_csrf_token,
            &timestamp(-60),
        )
        .expect("request must persist")
        .record
        .request;
    let decided_at = timestamp(-50);
    let decision = decide_approval_request_v1(
        &request,
        &ApprovalDecisionV1Input {
            approver_ref: "identity:human:owner".to_owned(),
            approver_session_ref: format!("session:local:{}", owner.session.session_id),
            decision: ApprovalDecisionV1Kind::Approved,
            reason: ApprovalDecisionV1Reason::OperatorApproved,
            decided_at: decided_at.clone(),
        },
    )
    .expect("decision must derive");
    store
        .append_authenticated_approval_decision_v1(
            &decision,
            &owner.raw_session_token,
            &owner.raw_csrf_token,
            &decided_at,
        )
        .expect("decision must persist");
    let attempt = store
        .prepare_phase7_authorization_attempt_v1(&Phase7AuthorizationAttemptPrepareInputV1 {
            project_ref: &packet.project_ref,
            approval_decision_id: &decision.approval_decision_id,
        })
        .expect("attempt must prepare")
        .record;
    let nonce = store
        .issue_phase7_authorization_nonce_v1(&Phase7AuthorizationNonceIssueInputV1 {
            project_ref: &attempt.project_ref,
            resource_ref: &attempt.resource_ref,
            authorization_attempt_id: &attempt.authorization_attempt_id,
        })
        .expect("nonce must issue");
    let nonce_id = nonce.record.nonce_id.clone();
    drop(nonce);
    let issued = store
        .issue_phase7_local_execution_authorization_v1(
            &Phase7ExecutionAuthorizationIssueInputV1 {
                project_ref: &attempt.project_ref,
                resource_ref: &attempt.resource_ref,
                authorization_attempt_id: &attempt.authorization_attempt_id,
                nonce_id: &nonce_id,
                operation_idempotency_key: &format!("phase8-operation:{sequence:04}"),
            },
            &requester.raw_session_token,
            &requester.raw_csrf_token,
        )
        .expect("authorization must issue");
    let authorization_id = issued.record.authorization_id.clone();
    let operation_id = issued.record.operation_id.clone();
    let capability_wire = issued
        .capability
        .expect("first issue must return capability")
        .into_canonical_wire_v1()
        .expose_for_authenticated_response_v1()
        .to_owned();
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
    .expect("execution request must rederive");

    Phase8Fixture {
        database,
        repository,
        store,
        derived,
        project_ref: attempt.project_ref,
        resource_ref: attempt.resource_ref,
        authorization_id,
        operation_id,
        requester_session_token: requester.raw_session_token,
        requester_csrf_token: requester.raw_csrf_token,
        capability_wire,
    }
}

fn table_count(store: &SqliteStore, table: &str) -> i64 {
    store
        .connection
        .query_row(&format!("SELECT count(*) FROM {table}"), [], |row| {
            row.get(0)
        })
        .expect("table count must read")
}

fn create_phase11_docker_consequence(fixture: &Phase8Fixture) -> Phase7GitExecutionResultV1 {
    let repository = &fixture.repository.path;
    let identity = &fixture.repository.identity;
    let index = repository.join(format!(
        ".git/lnsat-phase11-docker-index-{}",
        std::process::id()
    ));
    let git = |arguments: &[&str]| {
        let output = Command::new(GIT_EXECUTABLE)
            .current_dir(repository)
            .env("GIT_CONFIG_NOSYSTEM", "1")
            .env("GIT_CONFIG_GLOBAL", "/dev/null")
            .env("GIT_INDEX_FILE", &index)
            .args(arguments)
            .output()
            .expect("Docker fixture Git command must start");
        assert!(
            output.status.success(),
            "Docker fixture Git command failed: {}",
            String::from_utf8_lossy(&output.stderr)
        );
        output.stdout
    };
    git(&["read-tree", &identity.base_commit_oid]);
    let mut apply = Command::new(GIT_EXECUTABLE)
        .current_dir(repository)
        .env("GIT_CONFIG_NOSYSTEM", "1")
        .env("GIT_CONFIG_GLOBAL", "/dev/null")
        .env("GIT_INDEX_FILE", &index)
        .args(["apply", "--cached", "--recount", "--whitespace=nowarn", "-"])
        .stdin(Stdio::piped())
        .spawn()
        .expect("Docker fixture patch process must start");
    apply
        .stdin
        .take()
        .expect("Docker fixture patch stdin must exist")
        .write_all(PATCH)
        .expect("Docker fixture patch must write");
    assert!(
        apply
            .wait()
            .expect("Docker fixture patch must finish")
            .success()
    );
    let tree_oid = String::from_utf8(git(&["write-tree"]))
        .expect("Docker fixture tree must encode")
        .trim()
        .to_owned();
    assert_eq!(tree_oid, fixture.repository.expected_tree_oid);
    let mut commit = Command::new(GIT_EXECUTABLE)
        .current_dir(repository)
        .env("GIT_CONFIG_NOSYSTEM", "1")
        .env("GIT_CONFIG_GLOBAL", "/dev/null")
        .env("GIT_AUTHOR_NAME", "LNSAT Adapter")
        .env("GIT_AUTHOR_EMAIL", "adapter@lnsat.invalid")
        .env("GIT_AUTHOR_DATE", "1786500000 +0000")
        .env("GIT_COMMITTER_NAME", "LNSAT Adapter")
        .env("GIT_COMMITTER_EMAIL", "adapter@lnsat.invalid")
        .env("GIT_COMMITTER_DATE", "1786500000 +0000")
        .args(["commit-tree", &tree_oid, "-p", &identity.base_commit_oid])
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .spawn()
        .expect("Docker fixture commit process must start");
    commit
        .stdin
        .take()
        .expect("Docker fixture commit stdin must exist")
        .write_all(b"bounded Phase 8 fixture commit\n")
        .expect("Docker fixture commit message must write");
    let output = commit
        .wait_with_output()
        .expect("Docker fixture commit must finish");
    assert!(output.status.success());
    let commit_oid = String::from_utf8(output.stdout)
        .expect("Docker fixture commit must encode")
        .trim()
        .to_owned();
    let update = Command::new(GIT_EXECUTABLE)
        .current_dir(repository)
        .env("GIT_CONFIG_NOSYSTEM", "1")
        .env("GIT_CONFIG_GLOBAL", "/dev/null")
        .args([
            "update-ref",
            &identity.head_ref,
            &commit_oid,
            &identity.base_commit_oid,
        ])
        .status()
        .expect("Docker fixture ref update must start");
    assert!(update.success());
    fs::remove_file(&index).expect("Docker fixture index must remove");
    inspect_phase11_disposable_git_result_v1(
        &fixture.derived,
        &std::env::temp_dir(),
        Path::new(GIT_EXECUTABLE),
        PHASE11_DOCKER_GIT_ADAPTER_REF_V1,
    )
    .expect("Docker fixture consequence must verify")
}

fn phase11_docker_input<'a>(
    project_ref: &'a str,
    resource_ref: &'a str,
    authorization_id: &'a str,
    operation_id: &'a str,
    derived_request: &'a lnsat_contracts::DerivedExecutionRequestV1,
    disposable_root: &'a Path,
    idempotency_key: &'a str,
) -> Phase11DockerRuntimeCompositionInputV1<'a> {
    Phase11DockerRuntimeCompositionInputV1 {
        redemption: Phase7CapabilityRedemptionInputV1 {
            project_ref,
            resource_ref,
            authorization_id,
            operation_id,
            idempotency_key,
        },
        derived_request,
        disposable_root,
        verifier_git_executable: Path::new(GIT_EXECUTABLE),
    }
}

#[test]
fn phase11_docker_claim_receipt_and_replay_are_durable_and_single_attempt() {
    let mut fixture = phase11_docker_fixture(11_401);
    let project_ref = fixture.project_ref.clone();
    let resource_ref = fixture.resource_ref.clone();
    let authorization_id = fixture.authorization_id.clone();
    let operation_id = fixture.operation_id.clone();
    let derived = fixture.derived.clone();
    let disposable_root = std::env::temp_dir();
    let session = fixture.requester_session_token.clone();
    let csrf = fixture.requester_csrf_token.clone();
    let input = phase11_docker_input(
        &project_ref,
        &resource_ref,
        &authorization_id,
        &operation_id,
        &derived,
        &disposable_root,
        "idempotency:phase11:docker:11401",
    );
    let capability = fixture.capability();
    let claim = fixture
        .store
        .claim_phase11_docker_runtime_composition_v1(&input, capability, &session, &csrf)
        .expect("Docker attempt must claim");
    assert!(claim.created);
    let attempt = claim
        .operation
        .attempt
        .as_ref()
        .expect("attempt must exist");
    assert_eq!(attempt.state, "dispatching");
    assert_eq!(attempt.attempt_sequence, 1);
    assert_eq!(
        attempt.adapter_ref,
        format!("{PHASE11_DOCKER_GIT_ADAPTER_REF_V1}@{PHASE11_DOCKER_GIT_ADAPTER_VERSION_V1}")
    );
    assert_eq!(
        attempt.protocol_version,
        "lnsat.adapter_process_protocol.docker_local.v1"
    );
    assert_eq!(table_count(&fixture.store, "lnsat_operation_attempts"), 1);
    assert_eq!(table_count(&fixture.store, "lnsat_operation_receipts"), 0);

    let result = create_phase11_docker_consequence(&fixture);
    let completed = fixture
        .store
        .persist_phase11_docker_runtime_result_v1(&input, &result)
        .expect("verified Docker result must persist");
    assert_eq!(completed.state, "completed");
    assert_eq!(
        completed.attempt.as_ref().map(|value| value.state.as_str()),
        Some("completed")
    );
    assert!(completed.receipt_id.is_some());
    assert_eq!(table_count(&fixture.store, "lnsat_operation_receipts"), 1);
    assert_eq!(
        table_count(&fixture.store, "lnsat_operation_reconciliations"),
        0
    );

    let replay_capability = fixture.capability();
    let replay = fixture
        .store
        .claim_phase11_docker_runtime_composition_v1(&input, replay_capability, &session, &csrf)
        .expect("exact Docker replay must read metadata");
    assert!(!replay.created);
    assert_eq!(replay.operation.receipt_id, completed.receipt_id);
    assert_eq!(table_count(&fixture.store, "lnsat_operation_attempts"), 1);
    assert_eq!(table_count(&fixture.store, "lnsat_operation_receipts"), 1);
    fixture.store.state().expect("durable chain must verify");
}

#[test]
fn phase11_docker_restart_materializes_unknown_then_reconciles_without_retry() {
    let mut fixture = phase11_docker_fixture(11_402);
    let project_ref = fixture.project_ref.clone();
    let resource_ref = fixture.resource_ref.clone();
    let authorization_id = fixture.authorization_id.clone();
    let operation_id = fixture.operation_id.clone();
    let derived = fixture.derived.clone();
    let disposable_root = std::env::temp_dir();
    let session = fixture.requester_session_token.clone();
    let csrf = fixture.requester_csrf_token.clone();
    let input = phase11_docker_input(
        &project_ref,
        &resource_ref,
        &authorization_id,
        &operation_id,
        &derived,
        &disposable_root,
        "idempotency:phase11:docker:11402",
    );
    let capability = fixture.capability();
    let claim = fixture
        .store
        .claim_phase11_docker_runtime_composition_v1(&input, capability, &session, &csrf)
        .expect("Docker attempt must claim before simulated crash");
    assert!(claim.created);
    let result = create_phase11_docker_consequence(&fixture);
    let mut restarted = SqliteStore::open(&fixture.database.path)
        .expect("simulated restarted store must reopen durable claim");

    assert_eq!(
        restarted
            .materialize_phase8_interrupted_dispatches_v1()
            .expect("startup must materialize interrupted Docker attempt"),
        1
    );
    let unknown = restarted
        .read_phase8_operation_v1(&fixture.operation_id)
        .expect("unknown operation must read")
        .expect("unknown operation must exist");
    assert_eq!(unknown.state, "outcome_unknown");
    assert_eq!(
        unknown.attempt.as_ref().map(|value| value.state.as_str()),
        Some("outcome_unknown")
    );
    assert_eq!(table_count(&restarted, "lnsat_operation_receipts"), 0);

    let reconciled = restarted
        .reconcile_phase11_docker_runtime_composition_v1(&input)
        .expect("host evidence must reconcile without Docker retry");
    assert_eq!(reconciled.state, "completed");
    assert!(reconciled.receipt_id.is_some());
    assert!(reconciled.reconciliation_id.is_some());
    assert_eq!(table_count(&restarted, "lnsat_operation_receipts"), 1);
    assert_eq!(
        table_count(&restarted, "lnsat_operation_reconciliations"),
        1
    );
    assert_eq!(
        result,
        inspect_phase11_disposable_git_result_v1(
            &fixture.derived,
            &std::env::temp_dir(),
            Path::new(GIT_EXECUTABLE),
            PHASE11_DOCKER_GIT_ADAPTER_REF_V1,
        )
        .expect("reconciliation must not alter consequence")
    );
    assert_eq!(
        restarted
            .materialize_phase8_interrupted_dispatches_v1()
            .expect("second startup scan must be stable"),
        0
    );
    restarted.state().expect("reconciled chain must verify");
}

#[test]
fn phase11_docker_unknown_without_consequence_never_creates_receipt() {
    let mut fixture = phase11_docker_fixture(11_403);
    let project_ref = fixture.project_ref.clone();
    let resource_ref = fixture.resource_ref.clone();
    let authorization_id = fixture.authorization_id.clone();
    let operation_id = fixture.operation_id.clone();
    let derived = fixture.derived.clone();
    let disposable_root = std::env::temp_dir();
    let session = fixture.requester_session_token.clone();
    let csrf = fixture.requester_csrf_token.clone();
    let input = phase11_docker_input(
        &project_ref,
        &resource_ref,
        &authorization_id,
        &operation_id,
        &derived,
        &disposable_root,
        "idempotency:phase11:docker:11403",
    );
    let capability = fixture.capability();
    fixture
        .store
        .claim_phase11_docker_runtime_composition_v1(&input, capability, &session, &csrf)
        .expect("Docker attempt must claim");
    let unknown = fixture
        .store
        .mark_phase11_docker_outcome_unknown_v1(&fixture.operation_id)
        .expect("claimed Docker attempt must become unknown");
    assert_eq!(unknown.state, "outcome_unknown");
    assert!(matches!(
        fixture
            .store
            .reconcile_phase11_docker_runtime_composition_v1(&input),
        Err(Phase7GitAdapterErrorV1::OutcomeUnknown)
    ));
    assert_eq!(table_count(&fixture.store, "lnsat_operation_receipts"), 0);
    assert_eq!(
        table_count(&fixture.store, "lnsat_operation_reconciliations"),
        0
    );
    fixture.store.state().expect("unknown chain must verify");
}

#[test]
fn phase11_docker_concurrent_claim_has_one_creator_and_one_metadata_replay() {
    let fixture = phase11_docker_fixture(11_404);
    let database_path = fixture.database.path.clone();
    let start = Arc::new(Barrier::new(3));
    let mut workers = Vec::new();
    for _ in 0..2 {
        let database_path = database_path.clone();
        let start = Arc::clone(&start);
        let project_ref = fixture.project_ref.clone();
        let resource_ref = fixture.resource_ref.clone();
        let authorization_id = fixture.authorization_id.clone();
        let operation_id = fixture.operation_id.clone();
        let derived = fixture.derived.clone();
        let session = fixture.requester_session_token.clone();
        let csrf = fixture.requester_csrf_token.clone();
        let capability_wire = fixture.capability_wire.clone();
        workers.push(thread::spawn(move || {
            let mut store = SqliteStore::open(database_path).expect("racing store must open");
            let disposable_root = std::env::temp_dir();
            let input = phase11_docker_input(
                &project_ref,
                &resource_ref,
                &authorization_id,
                &operation_id,
                &derived,
                &disposable_root,
                "idempotency:phase11:docker:11404",
            );
            let mut wire = capability_wire;
            let capability = Phase7CapabilitySecretV1::take_from_canonical_wire_v1(&mut wire)
                .expect("racing capability must decode");
            start.wait();
            store
                .claim_phase11_docker_runtime_composition_v1(&input, capability, &session, &csrf)
                .expect("racing exact claim must resolve")
                .created
        }));
    }
    start.wait();
    let created = workers
        .into_iter()
        .map(|worker| worker.join().expect("racing claim must join"))
        .filter(|created| *created)
        .count();
    assert_eq!(created, 1);
    let store = SqliteStore::open(database_path).expect("racing evidence store must reopen");
    assert_eq!(table_count(&store, "lnsat_capability_consumptions"), 1);
    assert_eq!(table_count(&store, "lnsat_operation_attempts"), 1);
    assert_eq!(table_count(&store, "lnsat_operation_receipts"), 0);
    store.state().expect("racing claim chain must verify");
}

#[test]
fn phase11_docker_durable_dispatch_fixture_freezes_closed_boundary() {
    let fixture: serde_json::Value = serde_json::from_str(include_str!(
        "../../../../fixtures/contracts/phase11-docker-local-durable-dispatch-v1.json"
    ))
    .expect("Phase 11 Docker durability fixture must parse");
    assert_eq!(fixture["packet_id"], "P11-D4B2A");
    assert_eq!(fixture["phase11_complete"], false);
    assert_eq!(fixture["production_supported"], false);
    assert_eq!(
        fixture["authority_chain"]["capability_consumption"],
        "atomic_with_attempt_claim"
    );
    assert_eq!(
        fixture["restart_boundary"]["persisted_dispatching"],
        "materialize_outcome_unknown"
    );
    assert_eq!(fixture["restart_boundary"]["docker_retry"], false);
    assert_eq!(
        fixture["receipt_boundary"]["completed_requires_receipt"],
        true
    );
    assert!(
        fixture["hard_stops"]
            .as_array()
            .expect("hard stops must be array")
            .iter()
            .any(|value| value == "no_served_route")
    );
    assert!(
        fixture["hard_stops"]
            .as_array()
            .expect("hard stops must be array")
            .iter()
            .any(|value| value == "no_docker_configuration_or_invocation")
    );
}

#[test]
fn phase8_atomic_consume_claim_dispatch_and_replay_never_duplicate() {
    let mut fixture = phase8_fixture(8_001);
    let project_ref = fixture.project_ref.clone();
    let resource_ref = fixture.resource_ref.clone();
    let authorization_id = fixture.authorization_id.clone();
    let operation_id = fixture.operation_id.clone();
    let derived = fixture.derived.clone();
    let disposable_root = std::env::temp_dir();
    let requester_session_token = fixture.requester_session_token.clone();
    let requester_csrf_token = fixture.requester_csrf_token.clone();
    let input = Phase8RuntimeCompositionInputV1 {
        redemption: Phase7CapabilityRedemptionInputV1 {
            project_ref: &project_ref,
            resource_ref: &resource_ref,
            authorization_id: &authorization_id,
            operation_id: &operation_id,
            idempotency_key: "idempotency:phase8:execute:8001",
        },
        derived_request: &derived,
        disposable_root: &disposable_root,
        git_executable: Path::new(GIT_EXECUTABLE),
    };
    let capability = fixture.capability();
    let first = fixture
        .store
        .execute_phase8_runtime_composition_v1(
            &input,
            capability,
            &requester_session_token,
            &requester_csrf_token,
        )
        .expect("first composition must execute");
    assert!(first.created);
    assert_eq!(first.operation.state, "completed");
    assert_eq!(
        first
            .operation
            .attempt
            .as_ref()
            .map(|value| value.state.as_str()),
        Some("completed")
    );
    assert_eq!(
        table_count(&fixture.store, "lnsat_capability_consumptions"),
        1
    );
    assert_eq!(table_count(&fixture.store, "lnsat_operation_attempts"), 1);
    assert_eq!(table_count(&fixture.store, "lnsat_operation_receipts"), 1);

    let head_after_first =
        phase7_git_adapter::git(&fixture.repository.path, &["rev-parse", "HEAD"]);
    let replay_capability = fixture.capability();
    let replay = fixture
        .store
        .execute_phase8_runtime_composition_v1(
            &input,
            replay_capability,
            &requester_session_token,
            &requester_csrf_token,
        )
        .expect("exact replay must return metadata");
    assert!(!replay.created);
    assert_eq!(table_count(&fixture.store, "lnsat_operation_attempts"), 1);
    assert_eq!(table_count(&fixture.store, "lnsat_operation_receipts"), 1);
    assert_eq!(
        phase7_git_adapter::git(&fixture.repository.path, &["rev-parse", "HEAD"]),
        head_after_first
    );
}

#[test]
fn phase8_precommit_failure_rolls_back_consumption_claim_and_dispatch() {
    let mut fixture = phase8_fixture(8_002);
    let project_ref = fixture.project_ref.clone();
    let resource_ref = fixture.resource_ref.clone();
    let authorization_id = fixture.authorization_id.clone();
    let operation_id = fixture.operation_id.clone();
    let derived = fixture.derived.clone();
    let disposable_root = std::env::temp_dir();
    let requester_session_token = fixture.requester_session_token.clone();
    let requester_csrf_token = fixture.requester_csrf_token.clone();
    let input = Phase8RuntimeCompositionInputV1 {
        redemption: Phase7CapabilityRedemptionInputV1 {
            project_ref: &project_ref,
            resource_ref: &resource_ref,
            authorization_id: &authorization_id,
            operation_id: &operation_id,
            idempotency_key: "idempotency:phase8:execute:8002",
        },
        derived_request: &derived,
        disposable_root: &disposable_root,
        git_executable: Path::new(GIT_EXECUTABLE),
    };
    let capability = fixture.capability();
    let error = fixture
        .store
        .execute_phase8_runtime_composition_with_sources_v1(
            &input,
            capability,
            &requester_session_token,
            &requester_csrf_token,
            || Ok(timestamp(0)),
            || Err(Phase7PersistenceErrorV1::PersistenceFailed),
            || Ok(()),
            || Ok(()),
        )
        .expect_err("precommit failure must reject");
    assert_eq!(error, Phase7GitAdapterErrorV1::PersistenceFailed);
    assert_eq!(
        table_count(&fixture.store, "lnsat_capability_consumptions"),
        0
    );
    assert_eq!(table_count(&fixture.store, "lnsat_operation_attempts"), 0);
    let operation = fixture
        .store
        .read_phase8_operation_v1(&fixture.operation_id)
        .expect("operation read must work")
        .expect("operation must exist");
    assert_eq!(operation.state, "prepared");
    assert!(operation.attempt.is_none());
}

#[test]
fn phase8_after_commit_ambiguity_is_consumed_claimed_unknown_and_never_runs_git() {
    let mut fixture = phase8_fixture(8_003);
    let base = fixture.repository.identity.base_commit_oid.clone();
    let project_ref = fixture.project_ref.clone();
    let resource_ref = fixture.resource_ref.clone();
    let authorization_id = fixture.authorization_id.clone();
    let operation_id = fixture.operation_id.clone();
    let derived = fixture.derived.clone();
    let disposable_root = std::env::temp_dir();
    let requester_session_token = fixture.requester_session_token.clone();
    let requester_csrf_token = fixture.requester_csrf_token.clone();
    let input = Phase8RuntimeCompositionInputV1 {
        redemption: Phase7CapabilityRedemptionInputV1 {
            project_ref: &project_ref,
            resource_ref: &resource_ref,
            authorization_id: &authorization_id,
            operation_id: &operation_id,
            idempotency_key: "idempotency:phase8:execute:8003",
        },
        derived_request: &derived,
        disposable_root: &disposable_root,
        git_executable: Path::new(GIT_EXECUTABLE),
    };
    let capability = fixture.capability();
    let error = fixture
        .store
        .execute_phase8_runtime_composition_with_sources_v1(
            &input,
            capability,
            &requester_session_token,
            &requester_csrf_token,
            || Ok(timestamp(0)),
            || Ok(()),
            || Err(Phase7PersistenceErrorV1::OutcomeAmbiguous),
            || Ok(()),
        )
        .expect_err("postcommit ambiguity must reject");
    assert_eq!(error, Phase7GitAdapterErrorV1::OutcomeUnknown);
    assert_eq!(
        table_count(&fixture.store, "lnsat_capability_consumptions"),
        1
    );
    assert_eq!(table_count(&fixture.store, "lnsat_operation_attempts"), 1);
    assert_eq!(table_count(&fixture.store, "lnsat_operation_receipts"), 0);
    let operation = fixture
        .store
        .read_phase8_operation_v1(&fixture.operation_id)
        .expect("operation read must work")
        .expect("operation must exist");
    assert_eq!(operation.state, "outcome_unknown");
    assert_eq!(
        String::from_utf8(phase7_git_adapter::git(
            &fixture.repository.path,
            &["rev-parse", "HEAD"]
        ))
        .expect("HEAD must encode")
        .trim(),
        base
    );
}

#[test]
fn phase8_git_supervisor_kills_at_deadline_and_caps_stdout_exactly() {
    assert_eq!(PHASE8_GIT_PROCESS_DEADLINE_SECONDS_V1, 30);
    assert_eq!(PHASE8_GIT_MAX_STDOUT_BYTES_V1, 1_048_576);
    let mut child = Command::new("/usr/bin/yes")
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .spawn()
        .expect("bounded-output child must start");
    let stdout = child.stdout.take().expect("stdout must be piped");
    let reader = thread::spawn(move || crate::phase7_git_adapter::read_bounded_stdout_v1(stdout));
    let error = crate::phase7_git_adapter::wait_for_child_deadline_v1(
        &mut child,
        Duration::from_millis(20),
    )
    .expect_err("deadline must kill running child");
    assert_eq!(error, Phase7GitAdapterErrorV1::OutcomeUnknown);
    let (stdout, overflowed) = reader
        .join()
        .expect("stdout reader must join")
        .expect("stdout reader must finish");
    assert!(overflowed);
    assert_eq!(stdout.len(), PHASE8_GIT_MAX_STDOUT_BYTES_V1);
}
