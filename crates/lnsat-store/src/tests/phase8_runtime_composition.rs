use super::phase7_git_adapter::{
    GIT_EXECUTABLE, PATCH, create_git_repository, hex_digest, patch_digest,
};
use super::*;
use lnsat_contracts::{
    ApprovalDecisionV1Input, ApprovalDecisionV1Kind, ApprovalDecisionV1Reason,
    ExecutionRequestV1Input, decide_approval_request_v1, decide_packet_envelope_policy_v1,
    derive_execution_request_v1,
};
use std::path::Path;
use std::process::{Command, Stdio};
use std::thread;
use std::time::{Duration, SystemTime};

const OWNER_PASSWORD: &str = "owner password for phase eight runtime tests";
const REQUESTER_PASSWORD: &str = "requester password for phase eight runtime tests";
const REQUESTER_REF: &str = "identity:human:phase8-requester";

struct Phase8Fixture {
    _database: TestDatabase,
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
    let executable_digest = phase7_git_executable_digest_v1(Path::new(GIT_EXECUTABLE))
        .expect("Git executable must hash");
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
            "configuration_digest": hex_digest(&phase7_git_adapter_configuration_digest_v1()),
            "adapter": {
                "ref": PHASE7_GIT_ADAPTER_REF_V1,
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
        _database: database,
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
