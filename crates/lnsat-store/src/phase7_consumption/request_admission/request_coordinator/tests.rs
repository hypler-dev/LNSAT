//! Private synthetic coordinator tests. Fixture setup is narrowly copied from
//! `request_execution_admission.rs`; no existing test bodies are imported.

use super::*;
use crate::action_request::{ACTION_REQUEST_RECORD_MAX_BYTES_V1, ActionRequestErrorV1};
use crate::*;
use lnsat_contracts::{
    ApprovalDecisionV1Input, ApprovalDecisionV1Kind, ApprovalDecisionV1Reason,
    ExecutionRequestV1Input, derive_execution_request_v1, hash_packet_envelope_v1,
};
use serde_json::Value;
use std::fs;
use std::path::PathBuf;
use std::sync::{
    Arc, Mutex,
    atomic::{AtomicBool, AtomicU64, AtomicUsize, Ordering},
};

static NEXT_TEST_DATABASE: AtomicU64 = AtomicU64::new(1);
const PACKET_FIXTURE: &str =
    include_str!("../../../../../../fixtures/contracts/packet-envelope-v1_0.json");

struct TestDatabase {
    path: PathBuf,
}

impl TestDatabase {
    fn new(name: &str) -> Self {
        let sequence = NEXT_TEST_DATABASE.fetch_add(1, Ordering::Relaxed);
        let path = std::env::temp_dir().join(format!(
            "lnsat-store-{}-{name}-{sequence}.sqlite3",
            std::process::id()
        ));
        Self { path }
    }
}

impl Drop for TestDatabase {
    fn drop(&mut self) {
        for suffix in ["", "-shm", "-wal", ".lnsat.lock"] {
            let target = PathBuf::from(format!("{}{suffix}", self.path.display()));
            let _ = fs::remove_file(target);
        }
    }
}

fn packet_fixture() -> PacketEnvelopeV1 {
    let fixture: Value = serde_json::from_str(PACKET_FIXTURE).expect("packet fixture must be JSON");
    let encoded =
        serde_json::to_vec(&fixture["vectors"][0]["packet"]).expect("packet must serialize");
    parse_packet_envelope_v1(&encoded).expect("packet fixture must parse")
}

fn local_identity_create_input<'a>(
    identity_ref: &'a str,
    display_name: &'a str,
    role: LocalIdentityRoleV1,
    password: &'a str,
    created_at: &'a str,
) -> LocalIdentityCreateInputV1<'a> {
    LocalIdentityCreateInputV1 {
        identity_ref,
        display_name,
        role,
        password,
        created_at,
    }
}

fn local_session_input<'a>(
    identity_ref: &'a str,
    password: &'a str,
    issued_at: &'a str,
    expires_at: &'a str,
) -> LocalSessionIssueInputV1<'a> {
    LocalSessionIssueInputV1 {
        identity_ref,
        password,
        issued_at,
        expires_at,
    }
}

fn add_execution_proposal(packet: &mut PacketEnvelopeV1) {
    let resource_ref = packet.resource_refs[0].clone();
    packet.constraints.insert(
        "execution_proposal".to_owned(),
        serde_json::json!({
            "schema_id": "lnsat.execution_proposal.schema.v1_0",
            "derivation_profile": "lnsat.execution_request.packet_embedded.v1",
            "action": {"kind": "git.commit", "arguments": {"message": "bounded fixture commit", "path": "fixture.txt"}},
            "target": {"resource_ref": resource_ref, "identity": {"repository": "fixture", "base": "fixture-base"}},
            "configuration_digest": format!("sha256:{}", "c".repeat(64)),
            "adapter": {"ref": "adapter:local:git-commit", "version": "v1"},
            "executable_digest": format!("sha256:{}", "e".repeat(64)),
            "audience": "audience:gateway:local"
        }),
    );
}

const PASSWORD: &str = "request execution admission source fixture password";
const ROOT_AT: &str = "2026-07-22T20:00:00.000Z";
const REQUESTED_AT: &str = "2026-07-22T20:01:00.000Z";
const DECIDED_AT: &str = "2026-07-22T20:02:00.000Z";
const ISSUED_AT: &str = "2026-07-22T20:03:00.000Z";
const EXPIRES_AT: &str = "2026-07-22T20:04:00.000Z";
const ADMITTED_AT: &str = "2026-07-22T20:03:30.000Z";

struct AdmissionFixture {
    pub(super) database: TestDatabase,
    pub(super) store: SqliteStore,
    pub(super) packet: PacketEnvelopeV1,
    pub(super) request_id: String,
    pub(super) derived: lnsat_contracts::DerivedExecutionRequestV1,
    pub(super) project_ref: String,
    pub(super) resource_ref: String,
    pub(super) authorization_id: String,
    pub(super) operation_id: String,
    pub(super) nonce_id: String,
    pub(super) requester_token: String,
    pub(super) requester_csrf: String,
    pub(super) approver_token: String,
    pub(super) approver_csrf: String,
    pub(super) capability_wire: String,
}

impl AdmissionFixture {
    #[allow(clippy::too_many_lines)] // Keep the complete authenticated fixture lineage visible.
    pub(super) fn new(sequence: u64) -> Self {
        Self::new_with_proposal(sequence, |packet| {
            add_execution_proposal(packet);
            let proposal = packet
                .constraints
                .get_mut("execution_proposal")
                .and_then(serde_json::Value::as_object_mut)
                .expect("execution proposal must be an object");
            proposal.insert(
                "adapter".to_owned(),
                serde_json::json!({
                    "ref": ADAPTER_REF,
                    "version": ADAPTER_VERSION,
                }),
            );
        })
    }

    #[allow(clippy::too_many_lines)] // Keep the complete authenticated fixture lineage visible.
    pub(super) fn new_with_proposal<F>(sequence: u64, proposal: F) -> Self
    where
        F: FnOnce(&mut PacketEnvelopeV1),
    {
        let database = TestDatabase::new("request-execution-admission");
        let mut store = SqliteStore::open(&database.path).expect("fixture store must open");
        store
            .bootstrap_local_owner_v1(&LocalOwnerBootstrapInputV1 {
                identity_ref: "identity:human:requester",
                display_name: "Requester",
                password: PASSWORD,
                created_at: "2026-07-22T19:40:00.000Z",
            })
            .expect("requester must bootstrap");
        let requester = store
            .issue_local_session_v1(&local_session_input(
                "identity:human:requester",
                PASSWORD,
                "2026-07-22T19:54:00.000Z",
                "2026-07-22T20:30:00.000Z",
            ))
            .expect("requester session must issue");
        store
            .create_local_identity_v1(
                &local_identity_create_input(
                    "identity:human:approver",
                    "Approver",
                    LocalIdentityRoleV1::Operator,
                    PASSWORD,
                    "2026-07-22T19:55:00.000Z",
                ),
                &requester.raw_session_token,
                &requester.raw_csrf_token,
                "2026-07-22T19:55:00.000Z",
            )
            .expect("approver must create");
        let approver = store
            .issue_local_session_v1(&local_session_input(
                "identity:human:approver",
                PASSWORD,
                "2026-07-22T19:56:00.000Z",
                "2026-07-22T20:30:00.000Z",
            ))
            .expect("approver session must issue");

        let mut packet = packet_fixture();
        packet.packet_id = format!("pkt_{sequence:064x}");
        packet.idempotency_key = format!("idem_{sequence:064x}");
        packet.actor_ref = requester.session.identity_ref.clone();
        packet.session_ref = format!("session:local:{}", requester.session.session_id);
        packet.permission_allow = vec!["deploy.request".to_owned()];
        packet.requires_approval = true;
        packet.created_at = "2026-07-22T19:59:00.000Z".to_owned();
        packet.expires_at = "2026-07-22T20:20:00.000Z".to_owned();
        proposal(&mut packet);

        let submission = store
            .append_authenticated_action_request_v1(
                &packet,
                &requester.raw_session_token,
                &requester.raw_csrf_token,
                ROOT_AT,
            )
            .expect("request root and evaluation must append");
        assert_eq!(submission.disposition, "created");
        assert_eq!(submission.evaluation_state, "policy_recorded");
        let policy =
            decide_packet_envelope_policy_v1(&packet, ROOT_AT).expect("root policy must rederive");
        let approval = store
            .append_authenticated_approval_request_v1(
                &policy.project_ref,
                &policy.decision_id,
                &requester.raw_session_token,
                &requester.raw_csrf_token,
                REQUESTED_AT,
            )
            .expect("approval request must append")
            .record
            .request;
        let decision = decide_approval_request_v1(
            &approval,
            &ApprovalDecisionV1Input {
                approver_ref: approver.session.identity_ref.clone(),
                approver_session_ref: format!("session:local:{}", approver.session.session_id),
                decision: ApprovalDecisionV1Kind::Approved,
                reason: ApprovalDecisionV1Reason::OperatorApproved,
                decided_at: DECIDED_AT.to_owned(),
            },
        )
        .expect("approval decision must derive");
        store
            .append_authenticated_approval_decision_v1(
                &decision,
                &approver.raw_session_token,
                &approver.raw_csrf_token,
                DECIDED_AT,
            )
            .expect("approval decision must append");
        let attempt = store
            .prepare_phase7_authorization_attempt_with_sources_v1(
                &Phase7AuthorizationAttemptPrepareInputV1 {
                    project_ref: &packet.project_ref,
                    approval_decision_id: &decision.approval_decision_id,
                },
                "2026-07-22T20:02:01.000Z",
                || Ok(()),
            )
            .expect("authorization attempt must append")
            .record;
        let nonce = store
            .issue_phase7_authorization_nonce_with_sources_v1(
                &Phase7AuthorizationNonceIssueInputV1 {
                    project_ref: &attempt.project_ref,
                    resource_ref: &attempt.resource_ref,
                    authorization_attempt_id: &attempt.authorization_attempt_id,
                },
                "2026-07-22T20:02:02.000Z",
                "2026-07-22T20:07:02.000Z",
                |bytes| {
                    bytes.fill(u8::try_from(sequence).unwrap_or(0x71));
                    Ok(())
                },
                || Ok(()),
            )
            .expect("nonce must issue");
        let nonce_id = nonce.record.nonce_id.clone();
        drop(nonce.nonce);
        let issued = store
            .issue_phase7_local_execution_authorization_with_sources_v1(
                &Phase7ExecutionAuthorizationIssueInputV1 {
                    project_ref: &attempt.project_ref,
                    resource_ref: &attempt.resource_ref,
                    authorization_attempt_id: &attempt.authorization_attempt_id,
                    nonce_id: &nonce_id,
                    operation_idempotency_key: &format!("request-admission-operation:{sequence}"),
                },
                &requester.raw_session_token,
                &requester.raw_csrf_token,
                || Ok((ISSUED_AT.to_owned(), EXPIRES_AT.to_owned())),
                |bytes| {
                    bytes.fill(u8::try_from(sequence).unwrap_or(0x31));
                    Ok(())
                },
                || Ok(()),
                || Ok(()),
            )
            .expect("local authorization must issue");
        let authorization_id = issued.record.authorization_id.clone();
        let operation_id = issued.record.operation_id.clone();
        let capability_wire = issued
            .capability
            .expect("new authorization must return capability")
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
        .expect("full approved request must derive");

        Self {
            database,
            store,
            packet,
            request_id: submission.request_id,
            derived,
            project_ref: attempt.project_ref,
            resource_ref: attempt.resource_ref,
            authorization_id,
            operation_id,
            nonce_id,
            requester_token: requester.raw_session_token,
            requester_csrf: requester.raw_csrf_token,
            approver_token: approver.raw_session_token,
            approver_csrf: approver.raw_csrf_token,
            capability_wire,
        }
    }

    pub(super) fn capability(&self) -> Phase7CapabilitySecretV1 {
        let mut wire = self.capability_wire.clone();
        Phase7CapabilitySecretV1::take_from_canonical_wire_v1(&mut wire)
            .expect("fixture capability must decode")
    }

    pub(super) fn database_path(&self) -> PathBuf {
        self.database.path.clone()
    }

    fn admit_pending_root(&mut self, sequence: u64) -> String {
        let mut packet = self.packet.clone();
        packet.packet_id = format!("pkt_{sequence:064x}");
        packet.idempotency_key = format!("idem_pending_{sequence:064x}");
        let (root, disposition) = self
            .store
            .admit_action_request_v1(
                &packet,
                &self.requester_token,
                &self.requester_csrf,
                ADMITTED_AT,
            )
            .expect("pending root must append");
        assert_eq!(disposition, "created");
        root.request_id
    }

    pub(super) fn append_denied_root(&mut self, sequence: u64) -> String {
        let mut packet = self.packet.clone();
        packet.packet_id = format!("pkt_{sequence:064x}");
        packet.idempotency_key = format!("idem_denied_{sequence:064x}");
        packet.permission_allow.clear();
        self.store
            .append_authenticated_action_request_v1(
                &packet,
                &self.requester_token,
                &self.requester_csrf,
                ADMITTED_AT,
            )
            .expect("denied root must record evaluation")
            .request_id
    }

    fn append_failed_root(&mut self, sequence: u64) -> String {
        let mut packet = self.packet.clone();
        packet.packet_id = format!("pkt_{sequence:064x}");
        packet.idempotency_key = format!("idem_failed_{sequence:064x}");
        self.store
            .connection
            .execute_batch("CREATE TEMP TRIGGER reject_request_policy BEFORE INSERT ON lnsat_policy_decisions BEGIN SELECT RAISE(ABORT, 'fixture failure'); END;")
            .expect("failure trigger must install");
        let submission = self
            .store
            .append_authenticated_action_request_v1(
                &packet,
                &self.requester_token,
                &self.requester_csrf,
                ADMITTED_AT,
            )
            .expect("failed evaluation must preserve root");
        self.store
            .connection
            .execute_batch("DROP TRIGGER reject_request_policy;")
            .expect("failure trigger must remove");
        assert_eq!(submission.evaluation_state, "evaluation_failed");
        submission.request_id
    }

    #[allow(clippy::too_many_lines)] // Exercise the full public approval/authorization path.
    pub(super) fn reserve_second_approval_authorization(
        &mut self,
    ) -> Result<RequestLaunchReservationV1, Phase7PersistenceErrorV1> {
        let policy_id = self.derived.request.policy_decision_id.clone();
        let project_ref = self.project_ref.clone();
        let requester_token = self.requester_token.clone();
        let requester_csrf = self.requester_csrf.clone();
        let approver_token = self.approver_token.clone();
        let approver_csrf = self.approver_csrf.clone();
        let approval = self
            .store
            .append_authenticated_approval_request_v1(
                &project_ref,
                &policy_id,
                &requester_token,
                &requester_csrf,
                "2026-07-22T20:03:31.000Z",
            )
            .expect("second approval request must append")
            .record
            .request;
        let decision = decide_approval_request_v1(
            &approval,
            &ApprovalDecisionV1Input {
                approver_ref: "identity:human:approver".to_owned(),
                approver_session_ref: self.derived.request.approver_session_ref.clone(),
                decision: ApprovalDecisionV1Kind::Approved,
                reason: ApprovalDecisionV1Reason::OperatorApproved,
                decided_at: "2026-07-22T20:03:32.000Z".to_owned(),
            },
        )
        .expect("second approval decision must derive");
        self.store
            .append_authenticated_approval_decision_v1(
                &decision,
                &approver_token,
                &approver_csrf,
                "2026-07-22T20:03:32.000Z",
            )
            .expect("second approval decision must append");
        let attempt = self
            .store
            .prepare_phase7_authorization_attempt_with_sources_v1(
                &Phase7AuthorizationAttemptPrepareInputV1 {
                    project_ref: &project_ref,
                    approval_decision_id: &decision.approval_decision_id,
                },
                "2026-07-22T20:03:33.000Z",
                || Ok(()),
            )
            .expect("second authorization attempt must append")
            .record;
        let nonce = self
            .store
            .issue_phase7_authorization_nonce_with_sources_v1(
                &Phase7AuthorizationNonceIssueInputV1 {
                    project_ref: &attempt.project_ref,
                    resource_ref: &attempt.resource_ref,
                    authorization_attempt_id: &attempt.authorization_attempt_id,
                },
                "2026-07-22T20:03:34.000Z",
                "2026-07-22T20:08:34.000Z",
                |bytes| {
                    bytes.fill(0x82);
                    Ok(())
                },
                || Ok(()),
            )
            .expect("second nonce must issue");
        let nonce_id = nonce.record.nonce_id.clone();
        drop(nonce.nonce);
        let issued = self
            .store
            .issue_phase7_local_execution_authorization_with_sources_v1(
                &Phase7ExecutionAuthorizationIssueInputV1 {
                    project_ref: &attempt.project_ref,
                    resource_ref: &attempt.resource_ref,
                    authorization_attempt_id: &attempt.authorization_attempt_id,
                    nonce_id: &nonce_id,
                    operation_idempotency_key: "request-admission-operation:second",
                },
                &requester_token,
                &requester_csrf,
                || {
                    Ok((
                        "2026-07-22T20:03:35.000Z".to_owned(),
                        "2026-07-22T20:04:35.000Z".to_owned(),
                    ))
                },
                |bytes| {
                    bytes.fill(0x83);
                    Ok(())
                },
                || Ok(()),
                || Ok(()),
            )
            .expect("second authorization must issue");
        let mut capability_wire = issued
            .capability
            .expect("second authorization must return capability")
            .into_canonical_wire_v1();
        let derived = derive_execution_request_v1(&ExecutionRequestV1Input {
            packet: &self.packet,
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
        .expect("second request must derive");
        let input = Phase7CapabilityRedemptionInputV1 {
            project_ref: &attempt.project_ref,
            resource_ref: &attempt.resource_ref,
            authorization_id: &issued.record.authorization_id,
            operation_id: &issued.record.operation_id,
            idempotency_key: "request-execution-admission:second",
        };
        if derived.request.adapter.adapter_ref
            == crate::phase7_git_adapter::request_result::ADAPTER_REF
        {
            return self.store.reserve_request_git_execution_with_sources_v1(
                &self.request_id,
                &derived,
                &input,
                capability_wire
                    .take_secret_v1()
                    .expect("second capability must decode"),
                (&requester_token, &requester_csrf),
                (
                    || Ok("2026-07-22T20:03:36.000Z".to_owned()),
                    || Ok(()),
                    || Ok(()),
                ),
            );
        }
        self.store.reserve_request_execution_with_sources_v1(
            &self.request_id,
            &derived,
            &input,
            capability_wire
                .take_secret_v1()
                .expect("second capability must decode"),
            (&requester_token, &requester_csrf),
            (
                || Ok("2026-07-22T20:03:36.000Z".to_owned()),
                || Ok(()),
                || Ok(()),
            ),
        )
    }
}

const LATER_RESULT_AT: &str = "2026-07-22T20:03:40.000Z";
const EXPIRED_RESULT_AT: &str = "2026-07-22T20:04:01.000Z";
const RECOVERED_AFTER_UNKNOWN_AT: &str = "9999-12-31T23:59:59.999Z";
const RECONCILED_AT: &str = "9999-12-31T23:58:00.000Z";
const READ_AFTER_RECONCILIATION_AT: &str = "9999-12-31T23:58:02.000Z";
const RECONCILIATION_SESSION_EXPIRES_AT: &str = "9999-12-31T23:59:59.000Z";
const ADMISSION_FIXTURE_PASSWORD: &str = "request execution admission source fixture password";

fn oid(sequence: u64) -> String {
    format!("{sequence:040x}")
}

fn digest(byte: char) -> String {
    format!("sha256:{}", byte.to_string().repeat(64))
}

fn metadata() -> Phase7GitCommitMetadataV1 {
    Phase7GitCommitMetadataV1 {
        message: "synthetic request-bound fixture commit\n".to_owned(),
        author_name: "LNSAT Fixture".to_owned(),
        author_email: "fixture@lnsat.invalid".to_owned(),
        author_time: "1786500000 +0000".to_owned(),
        committer_name: "LNSAT Fixture".to_owned(),
        committer_email: "fixture@lnsat.invalid".to_owned(),
        committer_time: "1786500000 +0000".to_owned(),
    }
}

fn target(sequence: u64) -> Phase7GitRepositoryIdentityV1 {
    Phase7GitRepositoryIdentityV1 {
        repository_path: format!("/synthetic/request-bound-git-result/{sequence}/repository")
            .into(),
        git_dir_path: format!("/synthetic/request-bound-git-result/{sequence}/repository/.git")
            .into(),
        object_format: "sha1".to_owned(),
        head_ref: "refs/heads/main".to_owned(),
        base_commit_oid: oid(sequence),
        fixture_marker_sha256: digest('c'),
    }
}

fn result(sequence: u64) -> Phase7GitExecutionResultV1 {
    Phase7GitExecutionResultV1 {
        commit_oid: oid(sequence + 10_000),
        tree_oid: oid(sequence + 20_000),
        changed_paths: vec!["fixture.txt".to_owned()],
        patch_sha256: digest('b'),
        metadata: metadata(),
    }
}

fn git_fixture_c01(sequence: u64) -> AdmissionFixture {
    AdmissionFixture::new_with_proposal(sequence, move |packet| {
        let identity = target(sequence);
        let resource_ref = packet.resource_refs[0].clone();
        let action_base_commit_oid = identity.base_commit_oid.clone();
        let action_head_ref = identity.head_ref.clone();
        packet.constraints.insert(
            "execution_proposal".to_owned(),
            serde_json::json!({
                "schema_id": "lnsat.execution_proposal.schema.v1_0",
                "derivation_profile": "lnsat.execution_request.packet_embedded.v1",
                "action": {
                    "kind": "git.commit",
                    "arguments": {
                        "schema_id": "lnsat.git_commit_action.schema.v1",
                        "base_commit_oid": action_base_commit_oid,
                        "head_ref": action_head_ref,
                        "allowed_paths": ["fixture.txt"],
                        "patch_sha256": digest('b'),
                        "expected_tree_oid": oid(sequence + 20_000),
                        "commit_metadata": {
                            "message": "synthetic request-bound fixture commit\n",
                            "author_name": "LNSAT Fixture",
                            "author_email": "fixture@lnsat.invalid",
                            "author_time": "1786500000 +0000",
                            "committer_name": "LNSAT Fixture",
                            "committer_email": "fixture@lnsat.invalid",
                            "committer_time": "1786500000 +0000"
                        }
                    }
                },
                "target": {
                    "resource_ref": resource_ref,
                    "identity": {
                        "schema_id": "lnsat.disposable_git_repository.schema.v1",
                        "repository_path": identity.repository_path,
                        "git_dir_path": identity.git_dir_path,
                        "object_format": identity.object_format,
                        "head_ref": identity.head_ref,
                        "base_commit_oid": identity.base_commit_oid,
                        "fixture_marker_sha256": identity.fixture_marker_sha256
                    }
                },
                "configuration_digest": digest('d'),
                "adapter": {
                    "ref": crate::phase7_git_adapter::request_result::ADAPTER_REF,
                    "version": crate::phase7_git_adapter::request_result::ADAPTER_VERSION
                },
                "executable_digest": digest('e'),
                "audience": "audience:gateway:local"
            }),
        );
    })
}

const COORDINATOR_SOURCE: &str = include_str!("../request_coordinator.rs");

struct CoordinatorFixture {
    pub(super) database: TestDatabase,
    pub(super) store: Arc<Mutex<SqliteStore>>,
    pub(super) packet: PacketEnvelopeV1,
    pub(super) request_id: String,
    pub(super) derived: lnsat_contracts::DerivedExecutionRequestV1,
    pub(super) project_ref: String,
    pub(super) resource_ref: String,
    pub(super) authorization_id: String,
    pub(super) operation_id: String,
    pub(super) requester_token: String,
    pub(super) requester_csrf: String,
    pub(super) approver_token: String,
    pub(super) approver_csrf: String,
    pub(super) nonce_id: String,
    pub(super) capability_wire: String,
}

impl CoordinatorFixture {
    fn new(sequence: u64) -> Self {
        let fixture = git_fixture_c01(sequence);
        Self {
            database: fixture.database,
            store: Arc::new(Mutex::new(fixture.store)),
            packet: fixture.packet,
            request_id: fixture.request_id,
            derived: fixture.derived,
            project_ref: fixture.project_ref,
            resource_ref: fixture.resource_ref,
            authorization_id: fixture.authorization_id,
            operation_id: fixture.operation_id,
            requester_token: fixture.requester_token,
            requester_csrf: fixture.requester_csrf,
            approver_token: fixture.approver_token,
            approver_csrf: fixture.approver_csrf,
            nonce_id: fixture.nonce_id,
            capability_wire: fixture.capability_wire,
        }
    }

    fn reserve(
        &self,
        idempotency_key: &str,
    ) -> Result<CoordinatedReservationV1, CoordinatorOutcomeV1> {
        let mut wire = self.capability_wire.clone();
        let capability = Phase7CapabilitySecretV1::take_from_canonical_wire_v1(&mut wire)
            .expect("coordinator fixture capability must decode");
        let redemption = Phase7CapabilityRedemptionInputV1 {
            project_ref: &self.project_ref,
            resource_ref: &self.resource_ref,
            authorization_id: &self.authorization_id,
            operation_id: &self.operation_id,
            idempotency_key,
        };
        reserve_request_git_for_coordinator_v1(
            &self.store,
            &self.request_id,
            &self.derived,
            &redemption,
            capability,
            (&self.requester_token, &self.requester_csrf),
            (
                || Ok("2026-07-22T20:03:30.000Z".to_owned()),
                || Ok(()),
                || Ok(()),
            ),
        )
    }

    fn readback(&self) -> Phase8OperationReadbackV1 {
        self.store
            .lock()
            .expect("coordinator fixture lock")
            .read_phase8_operation_v1(&self.operation_id)
            .expect("coordinator fixture read")
            .expect("coordinator fixture operation")
    }

    fn database_path(&self) -> PathBuf {
        self.database.path.clone()
    }
}

fn count_rows(store: &SqliteStore, table: &str) -> i64 {
    store
        .connection
        .query_row(&format!("SELECT count(*) FROM {table}"), [], |row| {
            row.get(0)
        })
        .expect("coordinator fixture table must count")
}

fn coordinator_ledger_counts(fixture: &CoordinatorFixture) -> (i64, i64, i64, i64) {
    let store = fixture.store.lock().expect("coordinator fixture lock");
    (
        count_rows(&store, "lnsat_capability_consumptions"),
        count_rows(&store, "lnsat_operation_attempts"),
        count_rows(&store, "lnsat_operation_receipts"),
        count_rows(&store, "lnsat_operation_reconciliations"),
    )
}

fn assert_coordinator_ledger(fixture: &CoordinatorFixture, expected: (i64, i64, i64, i64)) {
    assert_eq!(coordinator_ledger_counts(fixture), expected);
}

fn assert_coordinator_ledger_after_poison(
    fixture: &CoordinatorFixture,
    expected: (i64, i64, i64, i64),
) {
    let reopened = SqliteStore::open(fixture.database_path())
        .expect("poisoned coordinator store must reopen for durable readback");
    assert_eq!(
        (
            count_rows(&reopened, "lnsat_capability_consumptions"),
            count_rows(&reopened, "lnsat_operation_attempts"),
            count_rows(&reopened, "lnsat_operation_receipts"),
            count_rows(&reopened, "lnsat_operation_reconciliations"),
        ),
        expected
    );
}

fn changed_derived(
    fixture: &CoordinatorFixture,
    changed_field: &str,
) -> lnsat_contracts::DerivedExecutionRequestV1 {
    let mut packet = fixture.packet.clone();
    let proposal = packet
        .constraints
        .get_mut("execution_proposal")
        .and_then(Value::as_object_mut)
        .expect("execution proposal must remain an object");
    match changed_field {
        "request" => {
            let action = proposal
                .get_mut("action")
                .and_then(Value::as_object_mut)
                .expect("action must remain an object");
            let arguments = action
                .get_mut("arguments")
                .and_then(Value::as_object_mut)
                .expect("action arguments must remain an object");
            arguments.insert(
                "commit_metadata".to_owned(),
                serde_json::json!({
                    "message": "different synthetic request\n",
                    "author_name": "LNSAT Fixture",
                    "author_email": "fixture@lnsat.invalid",
                    "author_time": "1786500000 +0000",
                    "committer_name": "LNSAT Fixture",
                    "committer_email": "fixture@lnsat.invalid",
                    "committer_time": "1786500000 +0000"
                }),
            );
        }
        "target" => {
            let target = proposal
                .get_mut("target")
                .and_then(Value::as_object_mut)
                .expect("target must remain an object");
            let identity = target
                .get_mut("identity")
                .and_then(Value::as_object_mut)
                .expect("target identity must remain an object");
            identity.insert(
                "head_ref".to_owned(),
                Value::String("refs/heads/changed".to_owned()),
            );
        }
        "configuration" => {
            proposal.insert(
                "configuration_digest".to_owned(),
                Value::String(digest('a')),
            );
        }
        "executable" => {
            proposal.insert("executable_digest".to_owned(), Value::String(digest('f')));
        }
        "adapter" => {
            let adapter = proposal
                .get_mut("adapter")
                .and_then(Value::as_object_mut)
                .expect("adapter must remain an object");
            adapter.insert(
                "ref".to_owned(),
                Value::String("adapter:local:request-bound-git-commit-alt".to_owned()),
            );
        }
        "audience" => {
            proposal.insert(
                "audience".to_owned(),
                Value::String("audience:gateway:changed".to_owned()),
            );
        }
        _ => panic!("unknown changed-field fixture"),
    }
    let packet_sha256 = hash_packet_envelope_v1(&packet).expect("changed packet must hash");
    let request = &fixture.derived.request;
    derive_execution_request_v1(&ExecutionRequestV1Input {
        packet: &packet,
        packet_sha256: &packet_sha256,
        policy_decision_id: &request.policy_decision_id,
        approval_request_id: &request.approval_request_id,
        approval_decision_id: &request.approval_decision_id,
        requester_ref: &request.requester_ref,
        requester_session_ref: &request.requester_session_ref,
        approver_ref: &request.approver_ref,
        approver_session_ref: &request.approver_session_ref,
        prepared_at: &request.prepared_at,
        expires_at: &request.expires_at,
    })
    .expect("changed packet must rederive a valid request")
}

fn assert_guard_rejected_after<F>(fixture: &CoordinatorFixture, local_auth: (&str, &str), mutate: F)
where
    F: FnOnce(&CoordinatorFixture),
{
    let reservation = fixture
        .reserve("request-coordinator:guard-drift")
        .expect("guard-drift reservation must commit");
    mutate(fixture);
    let dispatches = Arc::new(AtomicUsize::new(0));
    let observations = Arc::new(AtomicUsize::new(0));
    let dispatch_count = Arc::clone(&dispatches);
    let observation_count = Arc::clone(&observations);
    let outcome = run_request_git_coordinator_v1(
        &fixture.store,
        reservation,
        &fixture.derived,
        local_auth,
        || Ok("2026-07-22T20:03:31.000Z".to_owned()),
        move |_| {
            dispatch_count.fetch_add(1, Ordering::SeqCst);
            Ok(())
        },
        move || {
            observation_count.fetch_add(1, Ordering::SeqCst);
            SyntheticObservationV1::Uncertain
        },
        "2026-07-22T20:03:32.000Z",
        (|| Ok(()), || Ok(())),
    );
    assert!(matches!(outcome, CoordinatorOutcomeV1::Rejected));
    assert_eq!(dispatches.load(Ordering::SeqCst), 0);
    assert_eq!(observations.load(Ordering::SeqCst), 0);
    assert_eq!(fixture.readback().state, "outcome_unknown");
    assert_coordinator_ledger(fixture, (1, 1, 0, 0));
    assert!(matches!(
        fixture.reserve("request-coordinator:guard-drift-replay"),
        Err(CoordinatorOutcomeV1::Rejected)
    ));
    assert_coordinator_ledger(fixture, (1, 1, 0, 0));
}

fn poison_store(store: &Arc<Mutex<SqliteStore>>) {
    let store = Arc::clone(store);
    let joined = std::thread::spawn(move || {
        let _guard = store.lock().expect("fixture mutex must lock before poison");
        panic!("coordinator fixture poison");
    })
    .join();
    assert!(joined.is_err());
}

fn counted_dispatch(
    calls: &AtomicUsize,
) -> impl FnOnce(RequestFakeDispatchGuardV1) -> Result<(), ()> + '_ {
    move |_| {
        calls.fetch_add(1, Ordering::SeqCst);
        Ok(())
    }
}

fn counted_uncertain(calls: &AtomicUsize) -> impl FnOnce() -> SyntheticObservationV1 + '_ {
    move || {
        calls.fetch_add(1, Ordering::SeqCst);
        SyntheticObservationV1::Uncertain
    }
}

fn denied_root_and_derived(
    fixture: &mut AdmissionFixture,
    sequence: u64,
) -> (String, DerivedExecutionRequestV1) {
    let mut packet = fixture.packet.clone();
    packet.packet_id = format!("pkt_{sequence:064x}");
    packet.idempotency_key = format!("idem_denied_{sequence:064x}");
    packet.permission_allow.clear();
    let submission = fixture
        .store
        .append_authenticated_action_request_v1(
            &packet,
            &fixture.requester_token,
            &fixture.requester_csrf,
            ADMITTED_AT,
        )
        .expect("denied root appends");
    let policy =
        decide_packet_envelope_policy_v1(&packet, ADMITTED_AT).expect("denied policy rederives");
    assert_eq!(policy.decision.as_str(), "deny");
    let record = fixture
        .store
        .read_authenticated_action_request_v1(
            &submission.request_id,
            &fixture.requester_token,
            &fixture.requester_csrf,
            ADMITTED_AT,
        )
        .expect("denied record authenticates")
        .expect("denied root exists");
    assert_eq!(
        record.evidence.as_ref().expect("denied policy evidence")["policy"]["decision"].as_str(),
        Some("deny")
    );
    let packet_sha256 = hash_packet_envelope_v1(&packet).expect("denied packet hashes");
    assert_eq!(
        record.request.as_ref().expect("denied root").packet_sha256,
        packet_sha256
    );
    let original = &fixture.derived.request;
    let derived = derive_execution_request_v1(&ExecutionRequestV1Input {
        packet: &packet,
        packet_sha256: &packet_sha256,
        policy_decision_id: &policy.decision_id,
        approval_request_id: &original.approval_request_id,
        approval_decision_id: &original.approval_decision_id,
        requester_ref: &original.requester_ref,
        requester_session_ref: &original.requester_session_ref,
        approver_ref: &original.approver_ref,
        approver_session_ref: &original.approver_session_ref,
        prepared_at: ADMITTED_AT,
        expires_at: &original.expires_at,
    })
    .expect("matching denied-root request derives without granting approval");
    lnsat_contracts::verify_derived_execution_request_v1(&derived)
        .expect("denied derived is canonical");
    assert_eq!(derived.request.packet_sha256, packet_sha256);
    (submission.request_id, derived)
}

#[test]
fn request_coordinator_c01_approved() {
    let fixture = CoordinatorFixture::new(90_001);
    let reservation = fixture
        .reserve("request-coordinator:c01")
        .expect("C01 reservation");
    let dispatch_calls = Arc::new(AtomicUsize::new(0));
    let observer_calls = Arc::new(AtomicUsize::new(0));
    let dispatch_probe = Arc::clone(&fixture.store);
    let observer_probe = Arc::clone(&fixture.store);
    let dispatch_count = Arc::clone(&dispatch_calls);
    let observer_count = Arc::clone(&observer_calls);
    let outcome = run_request_git_coordinator_v1(
        &fixture.store,
        reservation,
        &fixture.derived,
        (&fixture.requester_token, &fixture.requester_csrf),
        || Ok("2026-07-22T20:03:31.000Z".to_owned()),
        move |_| {
            dispatch_count.fetch_add(1, Ordering::SeqCst);
            assert!(dispatch_probe.try_lock().is_ok());
            Ok(())
        },
        move || {
            observer_count.fetch_add(1, Ordering::SeqCst);
            assert!(observer_probe.try_lock().is_ok());
            SyntheticObservationV1::Reported {
                target: target(90_001),
                result: Box::new(result(90_001)),
            }
        },
        "2026-07-22T20:03:32.000Z",
        (|| Ok(()), || Ok(())),
    );
    assert!(
        matches!(outcome, CoordinatorOutcomeV1::Completed(ref readback) if readback.state == "completed")
    );
    assert_eq!(dispatch_calls.load(Ordering::SeqCst), 1);
    assert_eq!(observer_calls.load(Ordering::SeqCst), 1);
    let readback = fixture.readback();
    assert_eq!(readback.state, "completed");
    assert!(readback.receipt_id.is_some());
    assert!(readback.reconciliation_id.is_none());
    assert_coordinator_ledger(&fixture, (1, 1, 1, 0));
}

#[test]
fn request_coordinator_c02_denied() {
    let mut fixture = git_fixture_c01(90_002);
    let (denied_request, derived) = denied_root_and_derived(&mut fixture, 90_102);
    let capability = fixture.capability();
    let project_ref = fixture.project_ref.clone();
    let resource_ref = fixture.resource_ref.clone();
    let authorization_id = fixture.authorization_id.clone();
    let operation_id = fixture.operation_id.clone();
    let token = fixture.requester_token.clone();
    let csrf = fixture.requester_csrf.clone();
    let store = Arc::new(Mutex::new(fixture.store));
    let redemption = Phase7CapabilityRedemptionInputV1 {
        project_ref: &project_ref,
        resource_ref: &resource_ref,
        authorization_id: &authorization_id,
        operation_id: &operation_id,
        idempotency_key: "request-coordinator:c02",
    };
    let outcome = reserve_request_git_for_coordinator_v1(
        &store,
        &denied_request,
        &derived,
        &redemption,
        capability,
        (&token, &csrf),
        (
            || Ok("2026-07-22T20:03:30.000Z".to_owned()),
            || Ok(()),
            || Ok(()),
        ),
    );
    assert!(matches!(outcome, Err(CoordinatorOutcomeV1::Rejected)));
    let readback = store
        .lock()
        .expect("C02 lock")
        .read_phase8_operation_v1(&operation_id)
        .expect("C02 read")
        .expect("C02 operation");
    assert!(readback.attempt.is_none());
    assert!(readback.receipt_id.is_none());
    assert_eq!(
        count_rows(
            &store.lock().expect("C02 final lock"),
            "lnsat_capability_consumptions"
        ),
        0
    );
    assert_eq!(
        count_rows(
            &store.lock().expect("C02 final lock"),
            "lnsat_operation_attempts"
        ),
        0
    );
    assert_eq!(
        count_rows(
            &store.lock().expect("C02 final lock"),
            "lnsat_operation_receipts"
        ),
        0
    );
}

#[test]
fn request_coordinator_c03_changed() {
    for (offset, field) in [
        (0, "request"),
        (1, "target"),
        (2, "configuration"),
        (3, "executable"),
        (4, "adapter"),
        (5, "audience"),
    ] {
        let fixture = CoordinatorFixture::new(90_003 + offset);
        let changed = changed_derived(&fixture, field);
        let mut wire = fixture.capability_wire.clone();
        let capability = Phase7CapabilitySecretV1::take_from_canonical_wire_v1(&mut wire)
            .expect("C03 capability must decode");
        let redemption = Phase7CapabilityRedemptionInputV1 {
            project_ref: &fixture.project_ref,
            resource_ref: &fixture.resource_ref,
            authorization_id: &fixture.authorization_id,
            operation_id: &fixture.operation_id,
            idempotency_key: "request-coordinator:c03",
        };
        assert!(matches!(
            reserve_request_git_for_coordinator_v1(
                &fixture.store,
                &fixture.request_id,
                &changed,
                &redemption,
                capability,
                (&fixture.requester_token, &fixture.requester_csrf),
                (
                    || Ok("2026-07-22T20:03:30.000Z".to_owned()),
                    || Ok(()),
                    || Ok(())
                ),
            ),
            Err(CoordinatorOutcomeV1::Rejected)
        ));
        assert_eq!(
            fixture.readback().attempt,
            None,
            "{field} drift must not claim"
        );
        assert_coordinator_ledger(&fixture, (0, 0, 0, 0));
    }
}

#[test]
fn request_coordinator_c04_replay() {
    let fixture = CoordinatorFixture::new(90_004);
    assert!(fixture.reserve("request-coordinator:c04").is_ok());
    assert!(matches!(
        fixture.reserve("request-coordinator:c04"),
        Err(CoordinatorOutcomeV1::Rejected)
    ));
    let readback = fixture.readback();
    assert_eq!(readback.state, "dispatching");
    assert!(readback.attempt.is_some());
    assert!(readback.receipt_id.is_none());
    assert_coordinator_ledger(&fixture, (1, 1, 0, 0));
}

#[test]
fn request_coordinator_c05_guard_auth_drift() {
    let bad_bearer = CoordinatorFixture::new(90_005);
    assert_guard_rejected_after(
        &bad_bearer,
        ("bad-bearer", &bad_bearer.requester_csrf),
        |_| {},
    );

    let bad_csrf = CoordinatorFixture::new(90_006);
    assert_guard_rejected_after(&bad_csrf, (&bad_csrf.requester_token, "bad-csrf"), |_| {});

    let requester_csrf = CoordinatorFixture::new(90_007);
    assert_guard_rejected_after(
        &requester_csrf,
        (
            &requester_csrf.requester_token,
            &requester_csrf.requester_csrf,
        ),
        |fixture| {
            let mut store = fixture.store.lock().expect("C05 bad-CSRF lock");
            assert!(
                store
                    .revoke_local_session_v1(
                        &fixture.requester_token,
                        &fixture.requester_csrf,
                        "2026-07-22T20:03:31.000Z",
                        LocalSessionRevocationReasonV1::SignOut,
                    )
                    .expect("C05 requester session must revoke")
            );
        },
    );

    let approver_session = CoordinatorFixture::new(90_008);
    assert_guard_rejected_after(
        &approver_session,
        (
            &approver_session.requester_token,
            &approver_session.requester_csrf,
        ),
        |fixture| {
            let mut store = fixture.store.lock().expect("C05 approver-session lock");
            assert!(
                store
                    .revoke_local_session_v1(
                        &fixture.approver_token,
                        &fixture.approver_csrf,
                        "2026-07-22T20:03:31.000Z",
                        LocalSessionRevocationReasonV1::SignOut,
                    )
                    .expect("C05 approver session must revoke")
            );
        },
    );

    let approver_identity = CoordinatorFixture::new(90_009);
    assert_guard_rejected_after(
        &approver_identity,
        (
            &approver_identity.requester_token,
            &approver_identity.requester_csrf,
        ),
        |fixture| {
            let mut store = fixture.store.lock().expect("C05 approver-identity lock");
            store
                .disable_local_identity_v1(
                    "identity:human:approver",
                    &fixture.requester_token,
                    &fixture.requester_csrf,
                    "2026-07-22T20:03:31.000Z",
                )
                .expect("C05 owner disablement must persist")
                .expect("C05 approver must disable");
        },
    );

    let nonce = CoordinatorFixture::new(90_010);
    assert_guard_rejected_after(
        &nonce,
        (&nonce.requester_token, &nonce.requester_csrf),
        |fixture| {
            let mut store = fixture.store.lock().expect("C05 nonce lock");
            store
                .cancel_phase7_authorization_nonce_at_v1(
                    &Phase7AuthorizationNonceCancelInputV1 {
                        project_ref: &fixture.project_ref,
                        resource_ref: &fixture.resource_ref,
                        nonce_id: &fixture.nonce_id,
                    },
                    "2026-07-22T20:03:31.000Z",
                    || Ok(()),
                )
                .expect("C05 nonce must cancel");
        },
    );
}

#[test]
fn request_coordinator_c06_guard_time() {
    let fixture = CoordinatorFixture::new(90_011);
    let reservation = fixture
        .reserve("request-coordinator:c06-error")
        .expect("C06 reserve");
    let dispatches = Arc::new(AtomicUsize::new(0));
    let observations = Arc::new(AtomicUsize::new(0));
    let dispatch_count = Arc::clone(&dispatches);
    let observation_count = Arc::clone(&observations);
    let outcome = run_request_git_coordinator_v1(
        &fixture.store,
        reservation,
        &fixture.derived,
        (&fixture.requester_token, &fixture.requester_csrf),
        || Err(Phase7PersistenceErrorV1::OutcomeAmbiguous),
        move |_| {
            dispatch_count.fetch_add(1, Ordering::SeqCst);
            Ok(())
        },
        move || {
            observation_count.fetch_add(1, Ordering::SeqCst);
            SyntheticObservationV1::Uncertain
        },
        "2026-07-22T20:03:32.000Z",
        (|| Ok(()), || Ok(())),
    );
    assert!(matches!(outcome, CoordinatorOutcomeV1::Rejected));
    assert_eq!(dispatches.load(Ordering::SeqCst), 0);
    assert_eq!(observations.load(Ordering::SeqCst), 0);
    assert_eq!(fixture.readback().state, "outcome_unknown");
    assert_coordinator_ledger(&fixture, (1, 1, 0, 0));

    for (sequence, first, second) in [
        (
            90_012,
            "2026-07-22T20:03:31.000Z",
            "2026-07-22T20:03:30.000Z",
        ),
        (90_013, EXPIRES_AT, EXPIRES_AT),
    ] {
        let fixture = CoordinatorFixture::new(sequence);
        let reservation = fixture
            .reserve("request-coordinator:c06-clock")
            .expect("C06 reserve");
        let mut clock = [first, second].into_iter();
        let dispatches = Arc::new(AtomicUsize::new(0));
        let observations = Arc::new(AtomicUsize::new(0));
        let dispatch_count = Arc::clone(&dispatches);
        let observation_count = Arc::clone(&observations);
        let outcome = run_request_git_coordinator_v1(
            &fixture.store,
            reservation,
            &fixture.derived,
            (&fixture.requester_token, &fixture.requester_csrf),
            move || Ok(clock.next().expect("C06 clock sample").to_owned()),
            move |_| {
                dispatch_count.fetch_add(1, Ordering::SeqCst);
                Ok(())
            },
            move || {
                observation_count.fetch_add(1, Ordering::SeqCst);
                SyntheticObservationV1::Uncertain
            },
            "2026-07-22T20:03:32.000Z",
            (|| Ok(()), || Ok(())),
        );
        assert!(matches!(outcome, CoordinatorOutcomeV1::Rejected));
        assert_eq!(dispatches.load(Ordering::SeqCst), 0);
        assert_eq!(observations.load(Ordering::SeqCst), 0);
        assert_eq!(fixture.readback().state, "outcome_unknown");
        assert_coordinator_ledger(&fixture, (1, 1, 0, 0));
    }
}

#[test]
fn request_coordinator_c07_phase_order() {
    let fixture = CoordinatorFixture::new(90_014);
    let reservation = fixture
        .reserve("request-coordinator:c07")
        .expect("C07 reserve");
    let trace = Arc::new(Mutex::new(Vec::new()));
    let guard_trace = Arc::clone(&trace);
    let dispatch_trace = Arc::clone(&trace);
    let observer_trace = Arc::clone(&trace);
    let dispatch_probe = Arc::clone(&fixture.store);
    let observer_probe = Arc::clone(&fixture.store);
    let outcome = run_request_git_coordinator_v1(
        &fixture.store,
        reservation,
        &fixture.derived,
        (&fixture.requester_token, &fixture.requester_csrf),
        move || {
            guard_trace.lock().expect("C07 trace").push("guard");
            Ok("2026-07-22T20:03:31.000Z".to_owned())
        },
        move |_| {
            dispatch_trace.lock().expect("C07 trace").push("dispatch");
            assert!(
                dispatch_probe
                    .try_lock()
                    .expect("port must be unlocked")
                    .connection
                    .is_autocommit()
            );
            Ok(())
        },
        move || {
            observer_trace.lock().expect("C07 trace").push("observer");
            assert!(
                observer_probe
                    .try_lock()
                    .expect("port must be unlocked")
                    .connection
                    .is_autocommit()
            );
            SyntheticObservationV1::Reported {
                target: target(90_014),
                result: Box::new(result(90_014)),
            }
        },
        "2026-07-22T20:03:32.000Z",
        (|| Ok(()), || Ok(())),
    );
    assert!(matches!(outcome, CoordinatorOutcomeV1::Completed(_)));
    assert_eq!(
        *trace.lock().expect("C07 trace"),
        ["guard", "guard", "dispatch", "observer"]
    );
    assert_coordinator_ledger(&fixture, (1, 1, 1, 0));
}

#[test]
fn request_coordinator_c08_unlocked_dispatch() {
    let fixture = CoordinatorFixture::new(90_015);
    let reservation = fixture
        .reserve("request-coordinator:c08")
        .expect("C08 reserve");
    let probe = Arc::clone(&fixture.store);
    let calls = Arc::new(AtomicUsize::new(0));
    let dispatch_count = Arc::clone(&calls);
    let outcome = run_request_git_coordinator_v1(
        &fixture.store,
        reservation,
        &fixture.derived,
        (&fixture.requester_token, &fixture.requester_csrf),
        || Ok("2026-07-22T20:03:31.000Z".to_owned()),
        move |_| {
            dispatch_count.fetch_add(1, Ordering::SeqCst);
            assert!(
                probe
                    .try_lock()
                    .expect("port must be unlocked")
                    .connection
                    .is_autocommit()
            );
            Ok(())
        },
        || SyntheticObservationV1::NoObservation,
        "2026-07-22T20:03:32.000Z",
        (|| Ok(()), || Ok(())),
    );
    assert!(matches!(
        outcome,
        CoordinatorOutcomeV1::AttemptedUnconfirmed
    ));
    assert_eq!(calls.load(Ordering::SeqCst), 1);
    assert_eq!(fixture.readback().state, "outcome_unknown");
    assert_coordinator_ledger(&fixture, (1, 1, 0, 0));
}

#[test]
fn request_coordinator_c09_unlocked_observer() {
    let fixture = CoordinatorFixture::new(90_016);
    let reservation = fixture
        .reserve("request-coordinator:c09")
        .expect("C09 reserve");
    let probe = Arc::clone(&fixture.store);
    let calls = Arc::new(AtomicUsize::new(0));
    let observation_count = Arc::clone(&calls);
    let outcome = run_request_git_coordinator_v1(
        &fixture.store,
        reservation,
        &fixture.derived,
        (&fixture.requester_token, &fixture.requester_csrf),
        || Ok("2026-07-22T20:03:31.000Z".to_owned()),
        |_| Ok(()),
        move || {
            observation_count.fetch_add(1, Ordering::SeqCst);
            assert!(
                probe
                    .try_lock()
                    .expect("port must be unlocked")
                    .connection
                    .is_autocommit()
            );
            SyntheticObservationV1::NoObservation
        },
        "2026-07-22T20:03:32.000Z",
        (|| Ok(()), || Ok(())),
    );
    assert!(matches!(
        outcome,
        CoordinatorOutcomeV1::AttemptedUnconfirmed
    ));
    assert_eq!(calls.load(Ordering::SeqCst), 1);
    assert_eq!(fixture.readback().state, "outcome_unknown");
    assert_coordinator_ledger(&fixture, (1, 1, 0, 0));
}

#[test]
fn request_coordinator_c10_foreign_store() {
    let fixture = CoordinatorFixture::new(90_017);
    let reservation = fixture
        .reserve("request-coordinator:c10")
        .expect("C10 reserve");
    let foreign = Arc::new(Mutex::new(
        SqliteStore::open(fixture.database_path()).expect("C10 foreign store"),
    ));
    let dispatches = Arc::new(AtomicUsize::new(0));
    let observations = Arc::new(AtomicUsize::new(0));
    let dispatch_count = Arc::clone(&dispatches);
    let observation_count = Arc::clone(&observations);
    let outcome = run_request_git_coordinator_v1(
        &foreign,
        reservation,
        &fixture.derived,
        (&fixture.requester_token, &fixture.requester_csrf),
        || Ok("2026-07-22T20:03:31.000Z".to_owned()),
        move |_| {
            dispatch_count.fetch_add(1, Ordering::SeqCst);
            Ok(())
        },
        move || {
            observation_count.fetch_add(1, Ordering::SeqCst);
            SyntheticObservationV1::Uncertain
        },
        "2026-07-22T20:03:32.000Z",
        (|| Ok(()), || Ok(())),
    );
    assert!(matches!(outcome, CoordinatorOutcomeV1::Unconfirmed));
    assert_eq!(dispatches.load(Ordering::SeqCst), 0);
    assert_eq!(observations.load(Ordering::SeqCst), 0);
    assert_eq!(fixture.readback().state, "dispatching");
    assert_coordinator_ledger(&fixture, (1, 1, 0, 0));
}

#[test]
fn request_coordinator_c11_inner_replacement() {
    let fixture = CoordinatorFixture::new(90_018);
    let reservation = fixture
        .reserve("request-coordinator:c11")
        .expect("C11 reserve");
    let replacement = SqliteStore::open(fixture.database_path()).expect("C11 replacement store");
    *fixture.store.lock().expect("C11 outer mutex") = replacement;
    let calls = Arc::new(AtomicUsize::new(0));
    let dispatch_count = Arc::clone(&calls);
    let observer_calls = AtomicUsize::new(0);
    let outcome = run_request_git_coordinator_v1(
        &fixture.store,
        reservation,
        &fixture.derived,
        (&fixture.requester_token, &fixture.requester_csrf),
        || Ok("2026-07-22T20:03:31.000Z".to_owned()),
        move |_| {
            dispatch_count.fetch_add(1, Ordering::SeqCst);
            Ok(())
        },
        counted_uncertain(&observer_calls),
        "2026-07-22T20:03:32.000Z",
        (|| Ok(()), || Ok(())),
    );
    assert!(matches!(outcome, CoordinatorOutcomeV1::Unconfirmed));
    assert_eq!(calls.load(Ordering::SeqCst), 0);
    assert_eq!(observer_calls.load(Ordering::SeqCst), 0);
    assert_eq!(fixture.readback().state, "dispatching");
    assert_coordinator_ledger(&fixture, (1, 1, 0, 0));
}

#[test]
fn request_coordinator_c12_lock_contention() {
    let fixture = CoordinatorFixture::new(90_019);
    let held = fixture.store.lock().expect("C12 before-reserve lock");
    assert!(matches!(
        fixture.reserve("request-coordinator:c12-before"),
        Err(CoordinatorOutcomeV1::Unconfirmed)
    ));
    drop(held);
    assert_coordinator_ledger(&fixture, (0, 0, 0, 0));
    let reservation = fixture
        .reserve("request-coordinator:c12-after")
        .expect("C12 reserve");
    let held = fixture.store.lock().expect("C12 after-claim lock");
    let dispatch_calls = AtomicUsize::new(0);
    let observer_calls = AtomicUsize::new(0);
    let outcome = run_request_git_coordinator_v1(
        &fixture.store,
        reservation,
        &fixture.derived,
        (&fixture.requester_token, &fixture.requester_csrf),
        || Ok("2026-07-22T20:03:31.000Z".to_owned()),
        counted_dispatch(&dispatch_calls),
        counted_uncertain(&observer_calls),
        "2026-07-22T20:03:32.000Z",
        (|| Ok(()), || Ok(())),
    );
    drop(held);
    assert_eq!(dispatch_calls.load(Ordering::SeqCst), 0);
    assert_eq!(observer_calls.load(Ordering::SeqCst), 0);
    assert!(matches!(outcome, CoordinatorOutcomeV1::Unconfirmed));
    assert_eq!(fixture.readback().state, "dispatching");
    assert_coordinator_ledger(&fixture, (1, 1, 0, 0));
}

#[test]
fn request_coordinator_c13_poison() {
    let before_reserve = CoordinatorFixture::new(90_020);
    poison_store(&before_reserve.store);
    assert!(matches!(
        before_reserve.reserve("request-coordinator:c13-before"),
        Err(CoordinatorOutcomeV1::Unconfirmed)
    ));
    assert!(before_reserve.store.is_poisoned());
    assert_coordinator_ledger_after_poison(&before_reserve, (0, 0, 0, 0));

    let guard = CoordinatorFixture::new(90_021);
    let reservation = guard
        .reserve("request-coordinator:c13-guard")
        .expect("C13 reserve");
    poison_store(&guard.store);
    let guard_dispatches = AtomicUsize::new(0);
    let guard_observers = AtomicUsize::new(0);
    let guard_outcome = run_request_git_coordinator_v1(
        &guard.store,
        reservation,
        &guard.derived,
        (&guard.requester_token, &guard.requester_csrf),
        || Ok("2026-07-22T20:03:31.000Z".to_owned()),
        counted_dispatch(&guard_dispatches),
        counted_uncertain(&guard_observers),
        "2026-07-22T20:03:32.000Z",
        (|| Ok(()), || Ok(())),
    );
    assert!(matches!(guard_outcome, CoordinatorOutcomeV1::Unconfirmed));
    assert_eq!(guard_dispatches.load(Ordering::SeqCst), 0);
    assert_eq!(guard_observers.load(Ordering::SeqCst), 0);
    assert!(guard.store.is_poisoned());
    assert_coordinator_ledger_after_poison(&guard, (1, 1, 0, 0));

    let cleanup = CoordinatorFixture::new(90_022);
    let reservation = cleanup
        .reserve("request-coordinator:c13-cleanup")
        .expect("C13 reserve");
    let cleanup_store = Arc::clone(&cleanup.store);
    let cleanup_dispatches = AtomicUsize::new(0);
    let cleanup_observers = AtomicUsize::new(0);
    let cleanup_count = &cleanup_dispatches;
    let cleanup_outcome = run_request_git_coordinator_v1(
        &cleanup.store,
        reservation,
        &cleanup.derived,
        (&cleanup.requester_token, &cleanup.requester_csrf),
        || Ok("2026-07-22T20:03:31.000Z".to_owned()),
        move |_| {
            cleanup_count.fetch_add(1, Ordering::SeqCst);
            poison_store(&cleanup_store);
            Err(())
        },
        counted_uncertain(&cleanup_observers),
        "2026-07-22T20:03:32.000Z",
        (|| Ok(()), || Ok(())),
    );
    assert!(matches!(cleanup_outcome, CoordinatorOutcomeV1::Unconfirmed));
    assert_eq!(cleanup_dispatches.load(Ordering::SeqCst), 1);
    assert_eq!(cleanup_observers.load(Ordering::SeqCst), 0);
    assert!(cleanup.store.is_poisoned());
    assert_coordinator_ledger_after_poison(&cleanup, (1, 1, 0, 0));

    let result_fixture = CoordinatorFixture::new(90_023);
    let reservation = result_fixture
        .reserve("request-coordinator:c13-result")
        .expect("C13 reserve");
    let result_store = Arc::clone(&result_fixture.store);
    let result_dispatches = AtomicUsize::new(0);
    let result_observers = AtomicUsize::new(0);
    let result_count = &result_observers;
    let result_outcome = run_request_git_coordinator_v1(
        &result_fixture.store,
        reservation,
        &result_fixture.derived,
        (
            &result_fixture.requester_token,
            &result_fixture.requester_csrf,
        ),
        || Ok("2026-07-22T20:03:31.000Z".to_owned()),
        counted_dispatch(&result_dispatches),
        move || {
            result_count.fetch_add(1, Ordering::SeqCst);
            poison_store(&result_store);
            SyntheticObservationV1::Reported {
                target: target(90_023),
                result: Box::new(result(90_023)),
            }
        },
        "2026-07-22T20:03:32.000Z",
        (|| Ok(()), || Ok(())),
    );
    assert!(matches!(result_outcome, CoordinatorOutcomeV1::Unconfirmed));
    assert_eq!(result_dispatches.load(Ordering::SeqCst), 1);
    assert_eq!(result_observers.load(Ordering::SeqCst), 1);
    assert!(result_fixture.store.is_poisoned());
    assert_coordinator_ledger_after_poison(&result_fixture, (1, 1, 0, 0));
}

#[test]
fn request_coordinator_c14_ack_not_proof() {
    let fixture = CoordinatorFixture::new(90_014);
    let reservation = fixture
        .reserve("request-coordinator:c14")
        .expect("C14 reserve");
    let dispatches = Arc::new(AtomicUsize::new(0));
    let observations = Arc::new(AtomicUsize::new(0));
    let dispatch_count = Arc::clone(&dispatches);
    let observation_count = Arc::clone(&observations);
    let outcome = run_request_git_coordinator_v1(
        &fixture.store,
        reservation,
        &fixture.derived,
        (&fixture.requester_token, &fixture.requester_csrf),
        || Ok("2026-07-22T20:03:31.000Z".to_owned()),
        move |_| {
            dispatch_count.fetch_add(1, Ordering::SeqCst);
            Ok(())
        },
        move || {
            observation_count.fetch_add(1, Ordering::SeqCst);
            SyntheticObservationV1::NoObservation
        },
        "2026-07-22T20:03:32.000Z",
        (|| Ok(()), || Ok(())),
    );
    assert!(matches!(
        outcome,
        CoordinatorOutcomeV1::AttemptedUnconfirmed
    ));
    assert_eq!(dispatches.load(Ordering::SeqCst), 1);
    assert_eq!(observations.load(Ordering::SeqCst), 1);
    let readback = fixture.readback();
    assert_eq!(readback.state, "outcome_unknown");
    assert!(readback.receipt_id.is_none());
    assert_coordinator_ledger(&fixture, (1, 1, 0, 0));
}

#[test]
#[allow(clippy::too_many_lines)] // Keep each complete scenario and its causal readback oracles together.
fn request_coordinator_c15_observer_binding() {
    let direct = CoordinatorFixture::new(90_015);
    let reservation = direct
        .reserve("request-coordinator:c15-direct")
        .expect("C15 reserve");
    let operation_id = direct.operation_id.clone();
    let mut changed_request = direct.derived.clone();
    changed_request.request.audience = "audience:gateway:changed".to_owned();
    assert!(
        direct
            .store
            .lock()
            .expect("C15 direct lock")
            .verify_request_git_result_for_test_v1(
                "arq_0000000000000000000000000000000000000000000000000000000000000000",
                &direct.derived,
                &operation_id,
                &target(90_015),
                &result(90_015),
            )
            .is_err()
    );
    assert!(
        direct
            .store
            .lock()
            .expect("C15 direct lock")
            .verify_request_git_result_for_test_v1(
                &direct.request_id,
                &changed_request,
                &operation_id,
                &target(90_015),
                &result(90_015),
            )
            .is_err()
    );
    assert!(
        direct
            .store
            .lock()
            .expect("C15 direct lock")
            .verify_request_git_result_for_test_v1(
                &direct.request_id,
                &direct.derived,
                "opn_0000000000000000000000000000000000000000000000000000000000000000",
                &target(90_015),
                &result(90_015),
            )
            .is_err()
    );
    drop(reservation);
    assert_coordinator_ledger(&direct, (1, 1, 0, 0));

    for (sequence, observation) in [
        (
            90_016,
            SyntheticObservationV1::Reported {
                target: Phase7GitRepositoryIdentityV1 {
                    head_ref: "refs/heads/changed".to_owned(),
                    ..target(90_016)
                },
                result: Box::new(result(90_016)),
            },
        ),
        (
            90_017,
            SyntheticObservationV1::Reported {
                target: target(90_017),
                result: Box::new(Phase7GitExecutionResultV1 {
                    changed_paths: vec!["other.txt".to_owned()],
                    ..result(90_017)
                }),
            },
        ),
    ] {
        let fixture = CoordinatorFixture::new(sequence);
        let reservation = fixture
            .reserve("request-coordinator:c15")
            .expect("C15 reserve");
        let dispatches = Arc::new(AtomicUsize::new(0));
        let observations = Arc::new(AtomicUsize::new(0));
        let dispatch_count = Arc::clone(&dispatches);
        let observation_count = Arc::clone(&observations);
        let outcome = run_request_git_coordinator_v1(
            &fixture.store,
            reservation,
            &fixture.derived,
            (&fixture.requester_token, &fixture.requester_csrf),
            || Ok("2026-07-22T20:03:31.000Z".to_owned()),
            move |_| {
                dispatch_count.fetch_add(1, Ordering::SeqCst);
                Ok(())
            },
            move || {
                observation_count.fetch_add(1, Ordering::SeqCst);
                observation
            },
            "2026-07-22T20:03:32.000Z",
            (|| Ok(()), || Ok(())),
        );
        assert!(matches!(
            outcome,
            CoordinatorOutcomeV1::AttemptedUnconfirmed
        ));
        assert_eq!(dispatches.load(Ordering::SeqCst), 1);
        assert_eq!(observations.load(Ordering::SeqCst), 1);
        assert_eq!(fixture.readback().state, "outcome_unknown");
        assert_coordinator_ledger(&fixture, (1, 1, 0, 0));
    }
}

#[test]
fn request_coordinator_c16_independent_ports() {
    let fixture = CoordinatorFixture::new(90_018);
    let reservation = fixture
        .reserve("request-coordinator:c16")
        .expect("C16 reserve");
    let dispatches = Arc::new(AtomicUsize::new(0));
    let observations = Arc::new(AtomicUsize::new(0));
    let dispatch_count = Arc::clone(&dispatches);
    let observation_count = Arc::clone(&observations);
    let outcome = run_request_git_coordinator_v1(
        &fixture.store,
        reservation,
        &fixture.derived,
        (&fixture.requester_token, &fixture.requester_csrf),
        || Ok("2026-07-22T20:03:31.000Z".to_owned()),
        move |_| {
            dispatch_count.fetch_add(1, Ordering::SeqCst);
            Ok(())
        },
        move || {
            observation_count.fetch_add(1, Ordering::SeqCst);
            SyntheticObservationV1::NoObservation
        },
        "2026-07-22T20:03:32.000Z",
        (|| Ok(()), || Ok(())),
    );
    assert!(matches!(
        outcome,
        CoordinatorOutcomeV1::AttemptedUnconfirmed
    ));
    assert_eq!(dispatches.load(Ordering::SeqCst), 1);
    assert_eq!(observations.load(Ordering::SeqCst), 1);
    assert_eq!(fixture.readback().state, "outcome_unknown");
    assert_coordinator_ledger(&fixture, (1, 1, 0, 0));
}

#[test]
fn request_coordinator_c17_dispatch_error() {
    let fixture = CoordinatorFixture::new(90_017);
    let reservation = fixture
        .reserve("request-coordinator:c17")
        .expect("C17 reserve");
    let dispatches = Arc::new(AtomicUsize::new(0));
    let observations = Arc::new(AtomicUsize::new(0));
    let dispatch_count = Arc::clone(&dispatches);
    let observation_count = Arc::clone(&observations);
    let outcome = run_request_git_coordinator_v1(
        &fixture.store,
        reservation,
        &fixture.derived,
        (&fixture.requester_token, &fixture.requester_csrf),
        || Ok("2026-07-22T20:03:31.000Z".to_owned()),
        move |_| {
            dispatch_count.fetch_add(1, Ordering::SeqCst);
            Err(())
        },
        move || {
            observation_count.fetch_add(1, Ordering::SeqCst);
            SyntheticObservationV1::Uncertain
        },
        "2026-07-22T20:03:32.000Z",
        (|| Ok(()), || Ok(())),
    );
    assert!(matches!(
        outcome,
        CoordinatorOutcomeV1::AttemptedUnconfirmed
    ));
    assert_eq!(dispatches.load(Ordering::SeqCst), 1);
    assert_eq!(observations.load(Ordering::SeqCst), 0);
    assert_eq!(fixture.readback().state, "outcome_unknown");
    assert_coordinator_ledger(&fixture, (1, 1, 0, 0));
}

#[test]
fn request_coordinator_c18_dispatch_unwind() {
    let fixture = CoordinatorFixture::new(90_019);
    let reservation = fixture
        .reserve("request-coordinator:c18")
        .expect("C18 reserve");
    let dispatches = Arc::new(AtomicUsize::new(0));
    let observations = Arc::new(AtomicUsize::new(0));
    let dispatch_count = Arc::clone(&dispatches);
    let observation_count = Arc::clone(&observations);
    let outcome = run_request_git_coordinator_v1(
        &fixture.store,
        reservation,
        &fixture.derived,
        (&fixture.requester_token, &fixture.requester_csrf),
        || Ok("2026-07-22T20:03:31.000Z".to_owned()),
        move |_| {
            dispatch_count.fetch_add(1, Ordering::SeqCst);
            panic!("C18 synthetic dispatch unwind");
        },
        move || {
            observation_count.fetch_add(1, Ordering::SeqCst);
            SyntheticObservationV1::Uncertain
        },
        "2026-07-22T20:03:32.000Z",
        (|| Ok(()), || Ok(())),
    );
    assert!(matches!(
        outcome,
        CoordinatorOutcomeV1::AttemptedUnconfirmed
    ));
    assert_eq!(dispatches.load(Ordering::SeqCst), 1);
    assert_eq!(observations.load(Ordering::SeqCst), 0);
    assert_eq!(fixture.readback().state, "outcome_unknown");
    assert_coordinator_ledger(&fixture, (1, 1, 0, 0));
}

fn must_reserve(fixture: &CoordinatorFixture, idempotency_key: &str) -> CoordinatedReservationV1 {
    fixture
        .reserve(idempotency_key)
        .expect("coordinator fixture reservation must succeed")
}

const COORDINATOR_DISPATCHED_AT: &str = "2026-07-22T20:03:31.000Z";
const COORDINATOR_RECORDED_AT: &str = "2026-07-22T20:03:32.000Z";
const COORDINATOR_RECOVERED_AT: &str = "9999-12-31T23:58:00.000Z";

fn coordinator_result_ledger(
    store: &SqliteStore,
) -> Vec<(String, Vec<Vec<rusqlite::types::Value>>)> {
    [
        "lnsat_phase7_entities",
        "lnsat_phase7_audit_bindings",
        "lnsat_phase7_state_events",
        "lnsat_operations",
        "lnsat_operation_attempts",
        "lnsat_operation_receipts",
        "lnsat_operation_reconciliations",
    ]
    .into_iter()
    .map(|table| {
        let mut statement = store
            .connection
            .prepare(&format!("SELECT * FROM {table} ORDER BY 1"))
            .expect("coordinator ledger table must read");
        let columns = statement.column_count();
        let rows = statement
            .query_map([], |row| {
                (0..columns)
                    .map(|index| row.get::<_, rusqlite::types::Value>(index))
                    .collect::<Result<Vec<_>, _>>()
            })
            .expect("coordinator ledger query must run")
            .collect::<Result<Vec<_>, _>>()
            .expect("coordinator ledger rows must decode");
        (table.to_owned(), rows)
    })
    .collect()
}

fn coordinator_count(store: &SqliteStore, table: &str) -> i64 {
    store
        .connection
        .query_row(&format!("SELECT count(*) FROM {table}"), [], |row| {
            row.get(0)
        })
        .expect("coordinator table count must read")
}

fn run_fixture_coordinator<D, O, P, A>(
    fixture: &CoordinatorFixture,
    reservation: CoordinatedReservationV1,
    dispatch: D,
    observer: O,
    recorded_at: &str,
    hooks: (P, A),
) -> CoordinatorOutcomeV1
where
    D: FnOnce(RequestFakeDispatchGuardV1) -> Result<(), ()>,
    O: FnOnce() -> SyntheticObservationV1,
    P: FnOnce() -> Result<(), Phase7GitAdapterErrorV1>,
    A: FnOnce() -> Result<(), Phase7GitAdapterErrorV1>,
{
    run_request_git_coordinator_v1(
        &fixture.store,
        reservation,
        &fixture.derived,
        (&fixture.requester_token, &fixture.requester_csrf),
        || Ok(COORDINATOR_DISPATCHED_AT.to_owned()),
        dispatch,
        observer,
        recorded_at,
        hooks,
    )
}

fn force_unknown(fixture: &CoordinatorFixture, sequence: u64) {
    let calls = Arc::new(AtomicUsize::new(0));
    let dispatch_calls = Arc::clone(&calls);
    let outcome = run_fixture_coordinator(
        fixture,
        fixture
            .reserve(&format!("request-coordinator:c{sequence}:unknown"))
            .expect("must reserve"),
        move |_| {
            dispatch_calls.fetch_add(1, Ordering::SeqCst);
            Err(())
        },
        || panic!("dispatch error must not auto-observe"),
        COORDINATOR_RECORDED_AT,
        (|| Ok(()), || Ok(())),
    );
    assert!(matches!(
        outcome,
        CoordinatorOutcomeV1::AttemptedUnconfirmed
    ));
    assert_eq!(calls.load(Ordering::SeqCst), 1);
    let store = fixture.store.lock().expect("unknown state lock");
    assert_eq!(
        store
            .read_phase8_operation_v1(&fixture.operation_id)
            .expect("held-lock read")
            .expect("operation exists")
            .state,
        "outcome_unknown"
    );
    assert_eq!(coordinator_count(&store, "lnsat_operation_receipts"), 0);
    assert_eq!(
        coordinator_count(&store, "lnsat_operation_reconciliations"),
        0
    );
}

#[test]
fn request_coordinator_c19_observer_unwind_is_one_dispatch_one_observation_and_unknown() {
    let fixture = CoordinatorFixture::new(90_019);
    let dispatches = Arc::new(AtomicUsize::new(0));
    let observations = Arc::new(AtomicUsize::new(0));
    let dispatch_count = Arc::clone(&dispatches);
    let observation_count = Arc::clone(&observations);
    let outcome = run_fixture_coordinator(
        &fixture,
        fixture
            .reserve("request-coordinator:c19")
            .expect("C19 reserve"),
        move |_| {
            dispatch_count.fetch_add(1, Ordering::SeqCst);
            Ok(())
        },
        move || {
            observation_count.fetch_add(1, Ordering::SeqCst);
            panic!("controlled C19 observer unwind");
        },
        COORDINATOR_RECORDED_AT,
        (|| Ok(()), || Ok(())),
    );
    assert!(matches!(
        outcome,
        CoordinatorOutcomeV1::AttemptedUnconfirmed
    ));
    assert_eq!(dispatches.load(Ordering::SeqCst), 1);
    assert_eq!(observations.load(Ordering::SeqCst), 1);
    let store = fixture.store.lock().expect("C19 state lock");
    assert_eq!(
        store
            .read_phase8_operation_v1(&fixture.operation_id)
            .expect("held-lock read")
            .expect("operation exists")
            .state,
        "outcome_unknown"
    );
    assert_eq!(coordinator_count(&store, "lnsat_operation_receipts"), 0);
    assert_eq!(
        coordinator_count(&store, "lnsat_operation_reconciliations"),
        0
    );
}

#[test]
fn request_coordinator_c20_dropped_reservation_reopens_unknown_without_redispatch() {
    let fixture = CoordinatorFixture::new(90_020);
    let path = fixture.database_path();
    let operation_id = fixture.operation_id.clone();
    let request_id = fixture.request_id.clone();
    let derived = fixture.derived.clone();
    let reservation = fixture
        .reserve("request-coordinator:c20")
        .expect("C20 reserve");
    let original_attempt = fixture
        .readback()
        .attempt
        .expect("attempt exists")
        .operation_attempt_id;
    drop(reservation);
    let before_reopen = fixture.readback();
    assert_eq!(before_reopen.state, "dispatching");
    let mut reopened = SqliteStore::open(&path).expect("C20 must reopen selected store");
    assert_eq!(
        reopened
            .materialize_phase8_interrupted_dispatches_v1()
            .expect("C20 materialize"),
        1
    );
    let reopened = Arc::new(Mutex::new(reopened));
    let observations = Arc::new(AtomicUsize::new(0));
    let observation_count = Arc::clone(&observations);
    let outcome = recover_request_git_coordinator_v1(
        &reopened,
        &request_id,
        &derived,
        &operation_id,
        &original_attempt,
        move || {
            observation_count.fetch_add(1, Ordering::SeqCst);
            SyntheticObservationV1::NoObservation
        },
        COORDINATOR_RECOVERED_AT,
        (|| Ok(()), || Ok(())),
    );
    assert!(matches!(outcome, CoordinatorOutcomeV1::Unconfirmed));
    assert_eq!(observations.load(Ordering::SeqCst), 1);
    let store = reopened.lock().expect("C20 reopened lock");
    let readback = store
        .read_phase8_operation_v1(&operation_id)
        .expect("C20 read")
        .expect("C20 op");
    assert_eq!(readback.state, "outcome_unknown");
    assert_eq!(
        coordinator_count(&store, "lnsat_capability_consumptions"),
        1
    );
    assert_eq!(coordinator_count(&store, "lnsat_operation_attempts"), 1);
    assert_eq!(coordinator_count(&store, "lnsat_operation_receipts"), 0);
}

#[test]
fn request_coordinator_c21_unknown_marker_write_failure_is_unconfirmed_not_healed() {
    let fixture = CoordinatorFixture::new(90_021);
    fixture.store.lock().expect("C21 install trigger").connection.execute_batch(
        "CREATE TEMP TRIGGER reject_unknown BEFORE INSERT ON lnsat_phase7_state_events
         WHEN NEW.state='outcome_unknown' BEGIN SELECT RAISE(ABORT,'fixture unknown failure'); END;",
    ).expect("C21 controlled marker failure");
    let dispatches = Arc::new(AtomicUsize::new(0));
    let observations = Arc::new(AtomicUsize::new(0));
    let dispatch_count = Arc::clone(&dispatches);
    let observation_count = Arc::clone(&observations);
    let outcome = run_fixture_coordinator(
        &fixture,
        fixture
            .reserve("request-coordinator:c21")
            .expect("C21 reserve"),
        move |_| {
            dispatch_count.fetch_add(1, Ordering::SeqCst);
            Ok(())
        },
        move || {
            observation_count.fetch_add(1, Ordering::SeqCst);
            SyntheticObservationV1::NoObservation
        },
        COORDINATOR_RECORDED_AT,
        (|| Ok(()), || Ok(())),
    );
    assert!(matches!(
        outcome,
        CoordinatorOutcomeV1::AttemptedUnconfirmed
    ));
    assert_eq!(dispatches.load(Ordering::SeqCst), 1);
    assert_eq!(observations.load(Ordering::SeqCst), 1);
    let store = fixture.store.lock().expect("C21 state lock");
    store
        .connection
        .execute_batch("DROP TRIGGER reject_unknown")
        .expect("C21 remove trigger");
    assert_eq!(
        store
            .read_phase8_operation_v1(&fixture.operation_id)
            .expect("held-lock read")
            .expect("operation exists")
            .state,
        "dispatching"
    );
    assert_eq!(coordinator_count(&store, "lnsat_operation_receipts"), 0);
    assert_eq!(
        coordinator_count(&store, "lnsat_operation_reconciliations"),
        0
    );
}

#[test]
fn request_coordinator_c22_precommit_rollback_leaves_complete_result_ledger_equal() {
    let fixture = CoordinatorFixture::new(90_022);
    let reservation = must_reserve(&fixture, "request-coordinator:c22");
    let before = {
        let store = fixture.store.lock().expect("C22 before lock");
        coordinator_result_ledger(&store)
    };
    let dispatches = Arc::new(AtomicUsize::new(0));
    let observations = Arc::new(AtomicUsize::new(0));
    let dispatch_count = Arc::clone(&dispatches);
    let observation_count = Arc::clone(&observations);
    let outcome = run_fixture_coordinator(
        &fixture,
        reservation,
        move |_| {
            dispatch_count.fetch_add(1, Ordering::SeqCst);
            Ok(())
        },
        move || {
            observation_count.fetch_add(1, Ordering::SeqCst);
            SyntheticObservationV1::Reported {
                target: target(90_022),
                result: Box::new(result(90_022)),
            }
        },
        COORDINATOR_RECORDED_AT,
        (
            || Err(Phase7GitAdapterErrorV1::PersistenceFailed),
            || Ok(()),
        ),
    );
    assert!(matches!(outcome, CoordinatorOutcomeV1::Unconfirmed));
    assert_eq!(dispatches.load(Ordering::SeqCst), 1);
    assert_eq!(observations.load(Ordering::SeqCst), 1);
    let store = fixture.store.lock().expect("C22 after lock");
    assert_eq!(coordinator_result_ledger(&store), before);
    assert_eq!(coordinator_count(&store, "lnsat_operation_receipts"), 0);
    assert_eq!(
        coordinator_count(&store, "lnsat_operation_reconciliations"),
        0
    );
}

#[test]
fn request_coordinator_c23_lost_result_ack_is_durable_completed_once_without_redispatch() {
    let fixture = CoordinatorFixture::new(90_023);
    let dispatches = Arc::new(AtomicUsize::new(0));
    let observations = Arc::new(AtomicUsize::new(0));
    let dispatch_count = Arc::clone(&dispatches);
    let observation_count = Arc::clone(&observations);
    let outcome = run_fixture_coordinator(
        &fixture,
        fixture
            .reserve("request-coordinator:c23")
            .expect("C23 reserve"),
        move |_| {
            dispatch_count.fetch_add(1, Ordering::SeqCst);
            Ok(())
        },
        move || {
            observation_count.fetch_add(1, Ordering::SeqCst);
            SyntheticObservationV1::Reported {
                target: target(90_023),
                result: Box::new(result(90_023)),
            }
        },
        COORDINATOR_RECORDED_AT,
        (
            || Ok(()),
            || Err(Phase7GitAdapterErrorV1::PersistenceFailed),
        ),
    );
    assert!(matches!(outcome, CoordinatorOutcomeV1::Unconfirmed));
    assert_eq!(dispatches.load(Ordering::SeqCst), 1);
    assert_eq!(observations.load(Ordering::SeqCst), 1);
    let store = fixture.store.lock().expect("C23 readback lock");
    let completed = store
        .read_phase8_operation_v1(&fixture.operation_id)
        .expect("C23 read")
        .expect("C23 op");
    assert_eq!(completed.state, "completed");
    assert_eq!(coordinator_count(&store, "lnsat_operation_receipts"), 1);
    assert_eq!(
        coordinator_count(&store, "lnsat_operation_reconciliations"),
        0
    );
    let durable_ledger = coordinator_result_ledger(&store);
    drop(store);
    let recovery = recover_request_git_coordinator_v1(
        &fixture.store,
        &fixture.request_id,
        &fixture.derived,
        &fixture.operation_id,
        &completed.attempt.expect("C23 attempt").operation_attempt_id,
        || panic!("completed recovery must not observe"),
        COORDINATOR_RECOVERED_AT,
        (|| Ok(()), || Ok(())),
    );
    assert!(matches!(recovery, CoordinatorOutcomeV1::Completed(_)));
    let store = fixture.store.lock().expect("C23 recovery lock");
    assert_eq!(coordinator_result_ledger(&store), durable_ledger);
}

#[test]
fn request_coordinator_c24_exact_result_replay_is_read_only() {
    let fixture = CoordinatorFixture::new(90_024);
    let completed = run_fixture_coordinator(
        &fixture,
        fixture
            .reserve("request-coordinator:c24")
            .expect("C24 reserve"),
        |_| Ok(()),
        || SyntheticObservationV1::Reported {
            target: target(90_024),
            result: Box::new(result(90_024)),
        },
        COORDINATOR_RECORDED_AT,
        (|| Ok(()), || Ok(())),
    );
    assert!(matches!(completed, CoordinatorOutcomeV1::Completed(_)));
    let mut store = fixture.store.lock().expect("C24 replay lock");
    let before = coordinator_result_ledger(&store);
    let proof = store
        .verify_request_git_result_for_test_v1(
            &fixture.request_id,
            &fixture.derived,
            &fixture.operation_id,
            &target(90_024),
            &result(90_024),
        )
        .expect("C24 exact proof");
    let replay = store
        .persist_request_git_result_with_sources_v1(
            proof,
            COORDINATOR_RECOVERED_AT,
            || Ok(()),
            || Ok(()),
        )
        .expect("C24 exact replay");
    assert_eq!(replay.state, "completed");
    assert_eq!(coordinator_result_ledger(&store), before);
    assert_eq!(coordinator_count(&store, "lnsat_operation_receipts"), 1);
    assert_eq!(
        coordinator_count(&store, "lnsat_operation_reconciliations"),
        0
    );
}

#[test]
fn request_coordinator_c25_conflicting_result_rejects_without_ledger_refresh() {
    let fixture = CoordinatorFixture::new(90_025);
    let completed = run_fixture_coordinator(
        &fixture,
        fixture
            .reserve("request-coordinator:c25")
            .expect("C25 reserve"),
        |_| Ok(()),
        || SyntheticObservationV1::Reported {
            target: target(90_025),
            result: Box::new(result(90_025)),
        },
        COORDINATOR_RECORDED_AT,
        (|| Ok(()), || Ok(())),
    );
    assert!(matches!(completed, CoordinatorOutcomeV1::Completed(_)));
    let mut store = fixture.store.lock().expect("C25 conflict lock");
    let before = coordinator_result_ledger(&store);
    let mut conflict = result(90_025);
    conflict.commit_oid = oid(190_025);
    let proof = store
        .verify_request_git_result_for_test_v1(
            &fixture.request_id,
            &fixture.derived,
            &fixture.operation_id,
            &target(90_025),
            &conflict,
        )
        .expect("C25 conflicting report may be verified");
    assert!(
        store
            .persist_request_git_result_with_sources_v1(
                proof,
                COORDINATOR_RECOVERED_AT,
                || Ok(()),
                || Ok(())
            )
            .is_err()
    );
    assert_eq!(coordinator_result_ledger(&store), before);
    assert_eq!(coordinator_count(&store, "lnsat_operation_receipts"), 1);
}

#[test]
fn request_coordinator_c26_reopen_recovery_reconciles_once_without_dispatch() {
    let fixture = CoordinatorFixture::new(90_026);
    force_unknown(&fixture, 26);
    let operation_id = fixture.operation_id.clone();
    let attempt_id = fixture
        .readback()
        .attempt
        .expect("C26 attempt")
        .operation_attempt_id;
    let reopened = Arc::new(Mutex::new(
        SqliteStore::open(fixture.database_path()).expect("C26 reopen"),
    ));
    let observations = Arc::new(AtomicUsize::new(0));
    let observation_count = Arc::clone(&observations);
    let outcome = recover_request_git_coordinator_v1(
        &reopened,
        &fixture.request_id,
        &fixture.derived,
        &operation_id,
        &attempt_id,
        move || {
            observation_count.fetch_add(1, Ordering::SeqCst);
            SyntheticObservationV1::Reported {
                target: target(90_026),
                result: Box::new(result(90_026)),
            }
        },
        COORDINATOR_RECOVERED_AT,
        (|| Ok(()), || Ok(())),
    );
    assert!(
        matches!(outcome, CoordinatorOutcomeV1::Completed(ref readback) if readback.state == "completed")
    );
    assert_eq!(observations.load(Ordering::SeqCst), 1);
    let store = reopened.lock().expect("C26 read lock");
    assert_eq!(
        coordinator_count(&store, "lnsat_capability_consumptions"),
        1
    );
    assert_eq!(coordinator_count(&store, "lnsat_operation_attempts"), 1);
    assert_eq!(coordinator_count(&store, "lnsat_operation_receipts"), 1);
    assert_eq!(
        coordinator_count(&store, "lnsat_operation_reconciliations"),
        1
    );
}

#[test]
fn request_coordinator_c27_recovery_without_or_mismatched_proof_leaves_unknown() {
    for (sequence, observation) in [
        (90_027, SyntheticObservationV1::NoObservation),
        (90_127, SyntheticObservationV1::Uncertain),
        (
            90_227,
            SyntheticObservationV1::Reported {
                target: target(90_228),
                result: Box::new(result(90_228)),
            },
        ),
    ] {
        let fixture = CoordinatorFixture::new(sequence);
        force_unknown(&fixture, sequence);
        let attempt_id = fixture
            .readback()
            .attempt
            .expect("C27 attempt")
            .operation_attempt_id;
        let reopened = Arc::new(Mutex::new(
            SqliteStore::open(fixture.database_path()).expect("C27 reopen"),
        ));
        let observations = Arc::new(AtomicUsize::new(0));
        let observation_count = Arc::clone(&observations);
        let before = {
            let store = reopened.lock().expect("C27 before lock");
            coordinator_result_ledger(&store)
        };
        let outcome = recover_request_git_coordinator_v1(
            &reopened,
            &fixture.request_id,
            &fixture.derived,
            &fixture.operation_id,
            &attempt_id,
            move || {
                observation_count.fetch_add(1, Ordering::SeqCst);
                observation
            },
            COORDINATOR_RECOVERED_AT,
            (|| Ok(()), || Ok(())),
        );
        assert!(matches!(
            outcome,
            CoordinatorOutcomeV1::Unconfirmed | CoordinatorOutcomeV1::Rejected
        ));
        assert_eq!(observations.load(Ordering::SeqCst), 1);
        let store = reopened.lock().expect("C27 after lock");
        assert_eq!(
            store
                .read_phase8_operation_v1(&fixture.operation_id)
                .expect("C27 read")
                .expect("C27 op")
                .state,
            "outcome_unknown"
        );
        assert_eq!(coordinator_result_ledger(&store), before);
        assert_eq!(coordinator_count(&store, "lnsat_operation_receipts"), 0);
    }
}

#[test]
fn request_coordinator_c28_historical_auth_allows_only_existing_unknown_resolution() {
    let fixture = CoordinatorFixture::new(90_028);
    force_unknown(&fixture, 28);
    let attempt_id = fixture
        .readback()
        .attempt
        .expect("C28 attempt")
        .operation_attempt_id;
    let mut reopened = SqliteStore::open(fixture.database_path()).expect("C28 reopen");
    assert!(
        reopened
            .read_authenticated_action_request_v1(
                &fixture.request_id,
                &fixture.requester_token,
                &fixture.requester_csrf,
                COORDINATOR_RECOVERED_AT,
            )
            .is_err()
    );
    let reopened = Arc::new(Mutex::new(reopened));
    let outcome = recover_request_git_coordinator_v1(
        &reopened,
        &fixture.request_id,
        &fixture.derived,
        &fixture.operation_id,
        &attempt_id,
        || SyntheticObservationV1::Reported {
            target: target(90_028),
            result: Box::new(result(90_028)),
        },
        COORDINATOR_RECOVERED_AT,
        (|| Ok(()), || Ok(())),
    );
    assert!(
        matches!(outcome, CoordinatorOutcomeV1::Completed(ref readback) if readback.state == "completed")
    );
    let store = reopened.lock().expect("C28 final lock");
    assert_eq!(
        coordinator_count(&store, "lnsat_capability_consumptions"),
        1
    );
    assert_eq!(coordinator_count(&store, "lnsat_operation_attempts"), 1);
    assert_eq!(coordinator_count(&store, "lnsat_operation_receipts"), 1);
}

#[test]
fn request_coordinator_c29_old_source_only_protocol_cannot_enter_result_path() {
    let fixture = AdmissionFixture::new(90_029);
    let capability = fixture.capability();
    let store = Arc::new(Mutex::new(fixture.store));
    let redemption = Phase7CapabilityRedemptionInputV1 {
        project_ref: &fixture.project_ref,
        resource_ref: &fixture.resource_ref,
        authorization_id: &fixture.authorization_id,
        operation_id: &fixture.operation_id,
        idempotency_key: "request-coordinator:c29",
    };
    let reservation = reserve_request_git_for_coordinator_v1(
        &store,
        &fixture.request_id,
        &fixture.derived,
        &redemption,
        capability,
        (&fixture.requester_token, &fixture.requester_csrf),
        (
            || Ok("2026-07-22T20:03:30.000Z".to_owned()),
            || Ok(()),
            || Ok(()),
        ),
    );
    assert!(matches!(reservation, Err(CoordinatorOutcomeV1::Rejected)));
    let store = store.lock().expect("C29 lock");
    assert_eq!(coordinator_count(&store, "lnsat_operation_receipts"), 0);
    assert_eq!(
        coordinator_count(&store, "lnsat_operation_reconciliations"),
        0
    );
}

#[test]
fn request_coordinator_c30_production_surface_remains_closed() {
    const REQUEST_ADMISSION_SOURCE: &str = include_str!("../../request_admission.rs");
    const STORE_LIB_SOURCE: &str = include_str!("../../../lib.rs");
    assert!(REQUEST_ADMISSION_SOURCE.contains("#[cfg(test)]\nmod request_coordinator;"));
    assert!(!STORE_LIB_SOURCE.contains("request_coordinator"));
    assert!(!COORDINATOR_SOURCE.contains("pub fn"));
    assert!(!COORDINATOR_SOURCE.contains("pub(crate) fn"));
}

#[test]
fn request_coordinator_c31_post_guard_mutation_records_temporal_gap_without_containment_claim() {
    let fixture = CoordinatorFixture::new(90_031);
    let mutated = Arc::new(AtomicBool::new(false));
    let mutation_flag = Arc::clone(&mutated);
    let store_probe = Arc::clone(&fixture.store);
    let token = fixture.requester_token.clone();
    let csrf = fixture.requester_csrf.clone();
    let outcome = run_fixture_coordinator(
        &fixture,
        fixture
            .reserve("request-coordinator:c31")
            .expect("C31 reserve"),
        move |_| {
            let mut store = store_probe
                .try_lock()
                .expect("guard must release outer mutex");
            assert!(
                store
                    .revoke_local_session_v1(
                        &token,
                        &csrf,
                        "2026-07-22T20:03:33.000Z",
                        LocalSessionRevocationReasonV1::SignOut
                    )
                    .expect("controlled post-guard revoke")
            );
            mutation_flag.store(true, Ordering::SeqCst);
            Ok(())
        },
        || SyntheticObservationV1::NoObservation,
        COORDINATOR_RECORDED_AT,
        (|| Ok(()), || Ok(())),
    );
    assert!(mutated.load(Ordering::SeqCst));
    assert!(matches!(
        outcome,
        CoordinatorOutcomeV1::AttemptedUnconfirmed
    ));
    let store = fixture.store.lock().expect("C31 read lock");
    assert_eq!(coordinator_count(&store, "lnsat_operation_receipts"), 0);
    assert_eq!(
        store
            .read_phase8_operation_v1(&fixture.operation_id)
            .expect("held-lock read")
            .expect("operation exists")
            .state,
        "outcome_unknown"
    );
}

#[test]
#[allow(clippy::too_many_lines)] // Keep each complete scenario and its causal readback oracles together.
fn request_coordinator_c32_existing_authenticated_readback_stays_redacted_and_bounded() {
    let fixture = CoordinatorFixture::new(90_032);
    force_unknown(&fixture, 32);
    let attempt_id = fixture
        .readback()
        .attempt
        .expect("C32 attempt")
        .operation_attempt_id;
    let reopened = Arc::new(Mutex::new(
        SqliteStore::open(fixture.database_path()).expect("C32 reopen"),
    ));
    let outcome = recover_request_git_coordinator_v1(
        &reopened,
        &fixture.request_id,
        &fixture.derived,
        &fixture.operation_id,
        &attempt_id,
        || SyntheticObservationV1::Reported {
            target: target(90_032),
            result: Box::new(result(90_032)),
        },
        COORDINATOR_RECOVERED_AT,
        (|| Ok(()), || Ok(())),
    );
    let CoordinatorOutcomeV1::Completed(operation) = outcome else {
        panic!("C32 recovery must complete exactly once");
    };
    let mut store = reopened.lock().expect("C32 readback lock");
    let owner = store
        .issue_local_session_v1(&local_session_input(
            "identity:human:requester",
            PASSWORD,
            "9999-12-31T23:58:01.000Z",
            "9999-12-31T23:59:59.000Z",
        ))
        .expect("C32 fresh owner reader");
    let other = store
        .issue_local_session_v1(&local_session_input(
            "identity:human:approver",
            PASSWORD,
            "9999-12-31T23:58:01.000Z",
            "9999-12-31T23:59:59.000Z",
        ))
        .expect("C32 fresh other-identity reader");
    let before = coordinator_result_ledger(&store);
    let record = store
        .read_authenticated_action_request_v1(
            &fixture.request_id,
            &owner.raw_session_token,
            &owner.raw_csrf_token,
            "9999-12-31T23:58:02.000Z",
        )
        .expect("C32 owner read must authenticate")
        .expect("C32 record exists");
    assert!(
        store
            .read_authenticated_action_request_v1(
                &fixture.request_id,
                &other.raw_session_token,
                &other.raw_csrf_token,
                "9999-12-31T23:58:02.000Z",
            )
            .expect("C32 other identity has generic denial")
            .is_none()
    );
    assert_eq!(
        store.read_authenticated_action_request_v1(
            &fixture.request_id,
            &owner.raw_session_token,
            &other.raw_csrf_token,
            "9999-12-31T23:58:02.000Z",
        ),
        Err(ActionRequestErrorV1::AuthorizationRejected)
    );
    assert_eq!(record.status, "complete");
    assert_eq!(record.request_id, fixture.request_id);
    let evidence = record.evidence.as_ref().expect("C32 completed evidence");
    let attempt = operation.attempt.as_ref().expect("C32 readback attempt");
    assert_eq!(
        evidence["operations"][0]["operation_id"].as_str(),
        Some(operation.operation_id.as_str())
    );
    assert_eq!(
        evidence["operation_attempts"][0]["operation_attempt_id"].as_str(),
        Some(attempt.operation_attempt_id.as_str())
    );
    assert_eq!(
        evidence["receipts"][0]["receipt_id"].as_str(),
        operation.receipt_id.as_deref()
    );
    assert_eq!(
        evidence["reconciliations"][0]["reconciliation_id"].as_str(),
        operation.reconciliation_id.as_deref()
    );
    let encoded = serde_json::to_vec(&record).expect("C32 record serializes");
    for forbidden in [
        fixture.requester_token.as_bytes(),
        fixture.requester_csrf.as_bytes(),
        fixture.capability_wire.as_bytes(),
    ] {
        assert!(
            !encoded
                .windows(forbidden.len())
                .any(|window| window == forbidden)
        );
    }
    assert!(encoded.len() <= ACTION_REQUEST_RECORD_MAX_BYTES_V1);
    assert_eq!(coordinator_result_ledger(&store), before);
}

#[test]
fn request_coordinator_c33_each_explicit_unknown_inspection_observes_once_without_dispatch() {
    let fixture = CoordinatorFixture::new(90_033);
    force_unknown(&fixture, 33);
    let attempt_id = fixture
        .readback()
        .attempt
        .expect("C33 attempt")
        .operation_attempt_id;
    let reopened = Arc::new(Mutex::new(
        SqliteStore::open(fixture.database_path()).expect("C33 reopen"),
    ));
    let observations = Arc::new(AtomicUsize::new(0));
    for invocation in 0..2 {
        let observation_count = Arc::clone(&observations);
        let before = {
            let store = reopened.lock().expect("C33 before lock");
            coordinator_result_ledger(&store)
        };
        let outcome = recover_request_git_coordinator_v1(
            &reopened,
            &fixture.request_id,
            &fixture.derived,
            &fixture.operation_id,
            &attempt_id,
            move || {
                observation_count.fetch_add(1, Ordering::SeqCst);
                SyntheticObservationV1::NoObservation
            },
            COORDINATOR_RECOVERED_AT,
            (|| Ok(()), || Ok(())),
        );
        assert!(
            matches!(outcome, CoordinatorOutcomeV1::Unconfirmed),
            "inspection {invocation}"
        );
        let store = reopened.lock().expect("C33 after lock");
        assert_eq!(
            coordinator_result_ledger(&store),
            before,
            "inspection {invocation}"
        );
    }
    assert_eq!(observations.load(Ordering::SeqCst), 2);
    let store = reopened.lock().expect("C33 final lock");
    assert_eq!(
        coordinator_count(&store, "lnsat_capability_consumptions"),
        1
    );
    assert_eq!(coordinator_count(&store, "lnsat_operation_attempts"), 1);
    assert_eq!(coordinator_count(&store, "lnsat_operation_receipts"), 0);
}

#[test]
fn request_coordinator_c34_completed_recovery_fast_path_does_not_observe_or_write() {
    let fixture = CoordinatorFixture::new(90_034);
    let completed = run_fixture_coordinator(
        &fixture,
        fixture
            .reserve("request-coordinator:c34")
            .expect("C34 reserve"),
        |_| Ok(()),
        || SyntheticObservationV1::Reported {
            target: target(90_034),
            result: Box::new(result(90_034)),
        },
        COORDINATOR_RECORDED_AT,
        (|| Ok(()), || Ok(())),
    );
    assert!(matches!(completed, CoordinatorOutcomeV1::Completed(_)));
    let attempt_id = fixture
        .readback()
        .attempt
        .expect("C34 attempt")
        .operation_attempt_id;
    let before = {
        let store = fixture.store.lock().expect("C34 before lock");
        coordinator_result_ledger(&store)
    };
    let observations = Arc::new(AtomicUsize::new(0));
    let observation_count = Arc::clone(&observations);
    let outcome = recover_request_git_coordinator_v1(
        &fixture.store,
        &fixture.request_id,
        &fixture.derived,
        &fixture.operation_id,
        &attempt_id,
        move || {
            observation_count.fetch_add(1, Ordering::SeqCst);
            panic!("completed recovery must not observe")
        },
        COORDINATOR_RECOVERED_AT,
        (|| Ok(()), || Ok(())),
    );
    assert!(matches!(outcome, CoordinatorOutcomeV1::Completed(_)));
    assert_eq!(observations.load(Ordering::SeqCst), 0);
    let store = fixture.store.lock().expect("C34 after lock");
    assert_eq!(coordinator_result_ledger(&store), before);
}

#[test]
fn request_coordinator_c35_failed_terminal_recovery_rejects_before_observer_or_write() {
    let fixture = CoordinatorFixture::new(90_035);
    let reservation = fixture
        .reserve("request-coordinator:c35")
        .expect("C35 reserve");
    drop(reservation);
    fixture
        .store
        .lock()
        .expect("C35 fail lock")
        .fail_request_git_for_test_v1(&fixture.operation_id, COORDINATOR_RECORDED_AT)
        .expect("C35 valid terminal history");
    let attempt_id = fixture
        .readback()
        .attempt
        .expect("C35 attempt")
        .operation_attempt_id;
    let before = {
        let store = fixture.store.lock().expect("C35 before lock");
        coordinator_result_ledger(&store)
    };
    let observations = Arc::new(AtomicUsize::new(0));
    let observation_count = Arc::clone(&observations);
    let outcome = recover_request_git_coordinator_v1(
        &fixture.store,
        &fixture.request_id,
        &fixture.derived,
        &fixture.operation_id,
        &attempt_id,
        move || {
            observation_count.fetch_add(1, Ordering::SeqCst);
            panic!("failed recovery must not observe")
        },
        COORDINATOR_RECOVERED_AT,
        (|| Ok(()), || Ok(())),
    );
    assert!(matches!(outcome, CoordinatorOutcomeV1::Rejected));
    assert_eq!(observations.load(Ordering::SeqCst), 0);
    let store = fixture.store.lock().expect("C35 after lock");
    assert_eq!(coordinator_result_ledger(&store), before);
    assert_eq!(coordinator_count(&store, "lnsat_operation_receipts"), 0);
}

#[test]
fn request_coordinator_c36_terminal_entry_uses_one_coherent_read_snapshot() {
    let fixture = CoordinatorFixture::new(90_036);
    let reservation = fixture
        .reserve("request-coordinator:c36")
        .expect("C36 reserve");
    drop(reservation);
    let attempt_id = fixture
        .readback()
        .attempt
        .expect("C36 attempt")
        .operation_attempt_id;
    let path = fixture.database_path();
    let store = fixture.store.lock().expect("C36 original lock");
    let transaction = Transaction::new_unchecked(&store.connection, TransactionBehavior::Deferred)
        .expect("C36 read transaction");
    let parents = super::super::read_git_request_parents_v1(
        &transaction,
        &fixture.derived.request.project_ref,
        &fixture.derived.request.resource_ref,
        &fixture.operation_id,
    )
    .expect("C36 parent establishes snapshot");
    let mut writer = SqliteStore::open(path).expect("C36 separate writer opens");
    writer
        .fail_request_git_for_test_v1(&fixture.operation_id, COORDINATOR_RECORDED_AT)
        .expect("C36 writer terminal mutation commits");
    let entry = super::read_recovery_entry_v1(
        &store,
        &transaction,
        &fixture.request_id,
        &fixture.derived,
        &fixture.operation_id,
        &attempt_id,
    )
    .expect("C36 must see coherent established snapshot");
    assert_eq!(parents.request_id, fixture.request_id);
    assert_eq!(entry.readback.state, "dispatching");
    assert_eq!(
        entry
            .readback
            .attempt
            .expect("C36 snapshot attempt")
            .operation_attempt_id,
        attempt_id
    );
    transaction.commit().expect("C36 snapshot commits");
    drop(store);
    assert_eq!(fixture.readback().state, "failed");
}
