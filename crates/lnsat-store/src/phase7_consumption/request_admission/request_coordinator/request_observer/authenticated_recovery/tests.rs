// Private synthetic observer tests. Fixture setup is narrowly copied from
// the coordinator fixture; no inherited test bodies are imported.

use super::super::super::*;
use super::*;
use crate::*;
use lnsat_contracts::{
    ApprovalDecisionV1Input, ApprovalDecisionV1Kind, ApprovalDecisionV1Reason,
    ExecutionRequestV1Input, derive_execution_request_v1,
};
use serde_json::Value;
use std::collections::VecDeque;
use std::fs;
use std::path::PathBuf;
use std::sync::{
    Arc, Mutex,
    atomic::{AtomicU64, Ordering},
};

static NEXT_TEST_DATABASE: AtomicU64 = AtomicU64::new(1);
const PACKET_FIXTURE: &str =
    include_str!("../../../../../../../../fixtures/contracts/packet-envelope-v1_0.json");

struct TestDatabase {
    path: PathBuf,
}

impl TestDatabase {
    fn new(name: &str) -> Self {
        let sequence = NEXT_TEST_DATABASE.fetch_add(1, Ordering::Relaxed);
        let path = std::env::temp_dir().join(format!(
            "lnsat-store-authenticated-recovery-{}-{name}-{sequence}.sqlite3",
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
    pub(super) request_id: String,
    pub(super) derived: lnsat_contracts::DerivedExecutionRequestV1,
    pub(super) project_ref: String,
    pub(super) resource_ref: String,
    pub(super) authorization_id: String,
    pub(super) operation_id: String,
    pub(super) requester_token: String,
    pub(super) requester_csrf: String,
    pub(super) capability_wire: String,
}

impl AdmissionFixture {
    #[allow(clippy::too_many_lines)] // Keep the complete authenticated fixture lineage visible.
    pub(super) fn new_with_proposal<F>(sequence: u64, non_owner: bool, proposal: F) -> Self
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
        let mut requester = store
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

        if non_owner {
            store
                .create_local_identity_v1(
                    &local_identity_create_input(
                        "identity:human:original-requester",
                        "Original requester",
                        LocalIdentityRoleV1::Operator,
                        PASSWORD,
                        "2026-07-22T19:57:00.000Z",
                    ),
                    &requester.raw_session_token,
                    &requester.raw_csrf_token,
                    "2026-07-22T19:57:00.000Z",
                )
                .unwrap();
            requester = store
                .issue_local_session_v1(&local_session_input(
                    "identity:human:original-requester",
                    PASSWORD,
                    "2026-07-22T19:58:00.000Z",
                    "2026-07-22T20:30:00.000Z",
                ))
                .unwrap();
        }

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
            request_id: submission.request_id,
            derived,
            project_ref: attempt.project_ref,
            resource_ref: attempt.resource_ref,
            authorization_id,
            operation_id,
            requester_token: requester.raw_session_token,
            requester_csrf: requester.raw_csrf_token,
            capability_wire,
        }
    }
}

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

fn git_fixture_c01(sequence: u64, non_owner: bool) -> AdmissionFixture {
    git_fixture_with_paths(sequence, non_owner, vec!["fixture.txt".to_owned()])
}

fn git_fixture_with_paths(sequence: u64, non_owner: bool, paths: Vec<String>) -> AdmissionFixture {
    AdmissionFixture::new_with_proposal(sequence, non_owner, move |packet| {
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
                        "allowed_paths": paths,
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

struct CoordinatorFixture {
    pub(super) database: TestDatabase,
    pub(super) store: Arc<Mutex<SqliteStore>>,
    pub(super) request_id: String,
    pub(super) derived: lnsat_contracts::DerivedExecutionRequestV1,
    pub(super) project_ref: String,
    pub(super) resource_ref: String,
    pub(super) authorization_id: String,
    pub(super) operation_id: String,
    pub(super) requester_token: String,
    pub(super) requester_csrf: String,
    pub(super) capability_wire: String,
}

impl CoordinatorFixture {
    fn new(sequence: u64, non_owner: bool) -> Self {
        Self::from_admission(git_fixture_c01(sequence, non_owner))
    }

    fn from_admission(fixture: AdmissionFixture) -> Self {
        Self {
            database: fixture.database,
            store: Arc::new(Mutex::new(fixture.store)),
            request_id: fixture.request_id,
            derived: fixture.derived,
            project_ref: fixture.project_ref,
            resource_ref: fixture.resource_ref,
            authorization_id: fixture.authorization_id,
            operation_id: fixture.operation_id,
            requester_token: fixture.requester_token,
            requester_csrf: fixture.requester_csrf,
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
}

const NOW: &str = "9999-12-31T23:50:30.000Z";
const RESULT_AT: &str = "9999-12-31T23:50:33.000Z";
const SESSION_AT: &str = "9999-12-31T23:50:00.000Z";
const SESSION_END: &str = "9999-12-31T23:59:59.000Z";
type Ledger = Vec<(String, Vec<Vec<rusqlite::types::Value>>)>;

fn rows(connection: &Connection, table: &str) -> Vec<Vec<rusqlite::types::Value>> {
    let mut statement = connection
        .prepare(&format!("SELECT * FROM {table} ORDER BY 1,2"))
        .unwrap();
    let columns = statement.column_count();
    statement
        .query_map([], |row| {
            (0..columns)
                .map(|i| row.get(i))
                .collect::<Result<Vec<_>, _>>()
        })
        .unwrap()
        .collect::<Result<Vec<_>, _>>()
        .unwrap()
}

fn ledger(f: &CoordinatorFixture) -> Ledger {
    let store = f.store.lock().unwrap();
    [
        "lnsat_phase7_entities",
        "lnsat_phase7_audit_bindings",
        "lnsat_phase7_state_events",
        "lnsat_operations",
        "lnsat_operation_attempts",
        "lnsat_operation_receipts",
        "lnsat_operation_reconciliations",
        "lnsat_capability_consumptions",
    ]
    .into_iter()
    .map(|table| (table.to_owned(), rows(&store.connection, table)))
    .collect()
}

fn activity(f: &CoordinatorFixture) -> Vec<Vec<rusqlite::types::Value>> {
    rows(
        &f.store.lock().unwrap().connection,
        "lnsat_local_session_activity_events",
    )
}

fn number(f: &CoordinatorFixture, table: &str) -> i64 {
    f.store
        .lock()
        .unwrap()
        .connection
        .query_row(&format!("SELECT count(*) FROM {table}"), [], |r| r.get(0))
        .unwrap()
}

fn credentials(f: &CoordinatorFixture) -> RecoveryCredentialsV1<'_> {
    RecoveryCredentialsV1 {
        token: &f.requester_token,
        csrf: &f.requester_csrf,
    }
}

fn fresh(f: &CoordinatorFixture, identity: &str, at: &str, end: &str) -> (String, String) {
    let session = f
        .store
        .lock()
        .unwrap()
        .issue_local_session_v1(&local_session_input(identity, PASSWORD, at, end))
        .unwrap();
    (session.raw_session_token, session.raw_csrf_token)
}

fn replace_session(f: &mut CoordinatorFixture) {
    let session = fresh(f, &f.derived.request.requester_ref, SESSION_AT, SESSION_END);
    f.requester_token = session.0;
    f.requester_csrf = session.1;
}

fn reserved(sequence: u64, non_owner: bool) -> CoordinatorFixture {
    let f = CoordinatorFixture::new(sequence, non_owner);
    drop(f.reserve("authenticated-recovery-fixture").unwrap());
    f
}

fn unknown(sequence: u64, non_owner: bool) -> CoordinatorFixture {
    let mut f = reserved(sequence, non_owner);
    let readback = f.readback();
    let attempt = readback
        .attempt
        .as_ref()
        .unwrap()
        .operation_attempt_id
        .clone();
    let launch = verify_binding_v1(&f.store.lock().unwrap().connection, &f.operation_id)
        .unwrap()
        .launch_digest;
    f.store
        .lock()
        .unwrap()
        .mark_request_git_outcome_unknown_v1(&f.operation_id, &attempt, &launch)
        .unwrap();
    assert_eq!(f.readback().state, "outcome_unknown");
    replace_session(&mut f);
    f
}

fn attempt(f: &CoordinatorFixture) -> String {
    f.readback().attempt.unwrap().operation_attempt_id
}

fn capture(sequence: u64, expected: ObserverExpectationV1) -> SyntheticObserverResultV1 {
    SyntheticObserverResultV1::Captured(Box::new(
        UnverifiedSyntheticCaptureV1::complete_for_expectation(
            expected,
            target(sequence),
            result(sequence),
        ),
    ))
}

fn assert_counts(c: &ObserverInvocationCountsV1, observations: usize, proofs: usize) {
    assert_eq!(
        (c.dispatches(), c.observers(), c.proof_constructor_calls()),
        (0, observations, proofs)
    );
}

#[allow(clippy::too_many_arguments)] // Keep the three clock phases and exact selector assertions explicit.
fn invoke<C, O, P, A>(
    f: &CoordinatorFixture,
    mode: RecoveryModeV1,
    auth: RecoveryCredentialsV1<'_>,
    clock: C,
    observer: O,
    hooks: (P, A),
    counts: &ObserverInvocationCountsV1,
) -> AuthenticatedRecoveryOutcomeV1
where
    C: FnMut() -> Result<String, ()>,
    O: FnOnce(ObserverExpectationV1) -> SyntheticObserverResultV1,
    P: FnOnce() -> Result<(), Phase7GitAdapterErrorV1>,
    A: FnOnce() -> Result<(), Phase7GitAdapterErrorV1>,
{
    recover_authenticated_request_v1(
        &f.store,
        &f.request_id,
        &f.derived,
        &f.operation_id,
        &attempt(f),
        mode,
        auth,
        clock,
        trusted_synthetic_observer_policy_v1(),
        observer,
        RESULT_AT,
        hooks,
        counts,
    )
}

fn inspect(
    f: &CoordinatorFixture,
    auth: RecoveryCredentialsV1<'_>,
    at: &str,
    counts: &ObserverInvocationCountsV1,
) -> AuthenticatedRecoveryOutcomeV1 {
    invoke(
        f,
        RecoveryModeV1::InspectOnly,
        auth,
        || Ok(at.to_owned()),
        |_| panic!("inspection must not observe"),
        (
            || panic!("inspection must not write"),
            || panic!("inspection must not commit result"),
        ),
        counts,
    )
}

fn inspect_frozen_attempt(
    f: &CoordinatorFixture,
    aid: &str,
    counts: &ObserverInvocationCountsV1,
) -> AuthenticatedRecoveryOutcomeV1 {
    recover_authenticated_request_v1(
        &f.store,
        &f.request_id,
        &f.derived,
        &f.operation_id,
        aid,
        RecoveryModeV1::InspectOnly,
        credentials(f),
        || Ok(NOW.to_owned()),
        trusted_synthetic_observer_policy_v1(),
        |_| panic!("denied fixture cannot observe"),
        RESULT_AT,
        (|| panic!(), || panic!()),
        counts,
    )
}

fn reconcile<O>(
    f: &CoordinatorFixture,
    observer: O,
    counts: &ObserverInvocationCountsV1,
) -> AuthenticatedRecoveryOutcomeV1
where
    O: FnOnce(ObserverExpectationV1) -> SyntheticObserverResultV1,
{
    invoke(
        f,
        RecoveryModeV1::ReconcileUnknown,
        credentials(f),
        || Ok(NOW.to_owned()),
        observer,
        (|| Ok(()), || Ok(())),
        counts,
    )
}

fn completed(sequence: u64) -> CoordinatorFixture {
    let f = unknown(sequence, false);
    let counts = ObserverInvocationCountsV1::default();
    assert!(matches!(
        reconcile(&f, |e| capture(sequence, e), &counts),
        AuthenticatedRecoveryOutcomeV1::ReconciledProjection(_)
    ));
    assert_counts(&counts, 1, 1);
    f
}

/// Trusted fixture corruption only. Restore every exact immutable trigger before
/// invoking product reads; admission never repairs the deliberately corrupt row.
fn inject_fixture_fault(
    connection: &Connection,
    table: &str,
    sql: &str,
    values: &[&dyn rusqlite::ToSql],
) {
    let tx = Transaction::new_unchecked(connection, TransactionBehavior::Immediate).unwrap();
    let triggers: Vec<(String, String)> = {
        let mut statement=tx.prepare("SELECT name,sql FROM sqlite_schema WHERE type='trigger' AND tbl_name=?1 ORDER BY name").unwrap();
        statement
            .query_map([table], |r| Ok((r.get(0)?, r.get(1)?)))
            .unwrap()
            .collect::<Result<Vec<_>, _>>()
            .unwrap()
    };
    for (name, _) in &triggers {
        tx.execute_batch(&format!("DROP TRIGGER \"{}\"", name.replace('"', "\"\"")))
            .unwrap();
    }
    tx.execute(sql, values).unwrap();
    for (_, definition) in &triggers {
        tx.execute_batch(definition).unwrap();
    }
    tx.commit().unwrap();
}

#[test]
fn authenticated_recovery_ar01_owner_unknown_positive() {
    let sequence = 171_001;
    let f = unknown(sequence, false);
    let counts = ObserverInvocationCountsV1::default();
    let out = reconcile(&f, |e| capture(sequence, e), &counts);
    let AuthenticatedRecoveryOutcomeV1::ReconciledProjection(record) = out else {
        panic!("exact Owner unknown must reconcile")
    };
    assert_eq!(record.status, "complete");
    assert_eq!(record.request_id, f.request_id);
    assert_eq!(f.readback().state, "completed");
    assert_eq!(number(&f, "lnsat_operation_receipts"), 1);
    assert_eq!(number(&f, "lnsat_operation_reconciliations"), 1);
    assert_counts(&counts, 1, 1);
}

#[test]
fn authenticated_recovery_ar02_owner_inspection() {
    let f = unknown(171_002, false);
    let before = ledger(&f);
    let counts = ObserverInvocationCountsV1::default();
    assert!(matches!(
        inspect(&f, credentials(&f), NOW, &counts),
        AuthenticatedRecoveryOutcomeV1::ReadOnlyProjection(_)
    ));
    assert_eq!(ledger(&f), before);
    assert_counts(&counts, 0, 0);
}

#[test]
fn authenticated_recovery_ar03_requester_fresh_session_inspection() {
    let f = unknown(171_003, true);
    let before = ledger(&f);
    // Execution used its old 2026 session; recovery uses a fresh same-identity Operator session.
    assert_eq!(
        f.derived.request.requester_ref,
        "identity:human:original-requester"
    );
    let counts = ObserverInvocationCountsV1::default();
    let AuthenticatedRecoveryOutcomeV1::ReadOnlyProjection(record) =
        inspect(&f, credentials(&f), NOW, &counts)
    else {
        panic!("original Operator requester may inspect")
    };
    assert_eq!(
        record.request.unwrap().requester_ref,
        f.derived.request.requester_ref
    );
    assert_eq!(ledger(&f), before);
    assert_counts(&counts, 0, 0);
}

#[test]
fn authenticated_recovery_ar04_foreign_identity() {
    let f = unknown(171_004, false);
    let before = ledger(&f);
    let approver = fresh(&f, "identity:human:approver", SESSION_AT, SESSION_END);
    let counts = ObserverInvocationCountsV1::default();
    assert!(matches!(
        inspect(
            &f,
            RecoveryCredentialsV1 {
                token: &approver.0,
                csrf: &approver.1
            },
            NOW,
            &counts
        ),
        AuthenticatedRecoveryOutcomeV1::Denied
    ));
    // A genuine foreign Auditor has ReadEvidence but no root identity scope.
    f.store
        .lock()
        .unwrap()
        .create_local_identity_v1(
            &local_identity_create_input(
                "identity:human:auditor",
                "Auditor",
                LocalIdentityRoleV1::Auditor,
                PASSWORD,
                NOW,
            ),
            &f.requester_token,
            &f.requester_csrf,
            NOW,
        )
        .unwrap();
    let auditor = fresh(&f, "identity:human:auditor", NOW, SESSION_END);
    assert!(matches!(
        inspect(
            &f,
            RecoveryCredentialsV1 {
                token: &auditor.0,
                csrf: &auditor.1
            },
            NOW,
            &counts
        ),
        AuthenticatedRecoveryOutcomeV1::Denied
    ));
    assert_eq!(ledger(&f), before);
    assert_counts(&counts, 0, 0);
}

#[test]
fn authenticated_recovery_ar05_non_owner_write_denial() {
    let f = unknown(171_005, true);
    let before = ledger(&f);
    let counts = ObserverInvocationCountsV1::default();
    assert!(matches!(
        reconcile(
            &f,
            |_| panic!("request/read/decide permissions do not reconcile"),
            &counts
        ),
        AuthenticatedRecoveryOutcomeV1::Denied
    ));
    assert_eq!(ledger(&f), before);
    assert_counts(&counts, 0, 0);
    assert!(matches!(
        inspect(&f, credentials(&f), NOW, &counts),
        AuthenticatedRecoveryOutcomeV1::ReadOnlyProjection(_)
    ));
}

#[test]
fn authenticated_recovery_ar06_absent_wrong_and_cross_session_proof() {
    let f = unknown(171_006, false);
    let before = ledger(&f);
    let other = fresh(
        &f,
        &f.derived.request.requester_ref,
        SESSION_AT,
        SESSION_END,
    );
    for proof in ["", "wrong-csrf", other.1.as_str()] {
        let counts = ObserverInvocationCountsV1::default();
        assert!(matches!(
            inspect(
                &f,
                RecoveryCredentialsV1 {
                    token: &f.requester_token,
                    csrf: proof
                },
                NOW,
                &counts
            ),
            AuthenticatedRecoveryOutcomeV1::Denied
        ));
        assert_counts(&counts, 0, 0);
        assert_eq!(ledger(&f), before);
    }
}

#[test]
fn authenticated_recovery_ar07_invalid_token_and_disabled_principal() {
    let f = unknown(171_007, true);
    let before = ledger(&f);
    let mut shaped_wrong = f.requester_token.clone();
    let last = shaped_wrong.pop().unwrap();
    shaped_wrong.push(if last == 'a' { 'b' } else { 'a' });
    for token in [
        "",
        "malformed",
        "ses_invalid.invalid",
        shaped_wrong.as_str(),
    ] {
        let counts = ObserverInvocationCountsV1::default();
        assert!(matches!(
            inspect(
                &f,
                RecoveryCredentialsV1 {
                    token,
                    csrf: &f.requester_csrf
                },
                NOW,
                &counts
            ),
            AuthenticatedRecoveryOutcomeV1::Denied
        ));
        assert_counts(&counts, 0, 0);
    }
    let owner = fresh(&f, "identity:human:requester", SESSION_AT, SESSION_END);
    f.store
        .lock()
        .unwrap()
        .disable_local_identity_v1(&f.derived.request.requester_ref, &owner.0, &owner.1, NOW)
        .unwrap()
        .unwrap();
    let counts = ObserverInvocationCountsV1::default();
    assert!(matches!(
        inspect(&f, credentials(&f), NOW, &counts),
        AuthenticatedRecoveryOutcomeV1::Denied
    ));
    assert_eq!(ledger(&f), before);
    assert_counts(&counts, 0, 0);
}

#[test]
fn authenticated_recovery_ar08_session_lifetime_boundaries() {
    let f = unknown(171_008, false);
    let before = ledger(&f);
    let cases = [
        (
            "9999-12-31T23:51:00.000Z",
            "9999-12-31T23:52:00.000Z",
            NOW,
            false,
        ),
        ("9999-12-31T23:49:00.000Z", NOW, NOW, false),
        (
            "9999-12-31T23:49:00.000Z",
            NOW,
            "9999-12-31T23:50:29.999Z",
            true,
        ),
        (
            "9999-12-31T23:30:00.000Z",
            SESSION_END,
            "9999-12-31T23:45:00.000Z",
            false,
        ),
        (
            "9999-12-31T23:30:00.000Z",
            SESSION_END,
            "9999-12-31T23:44:59.999Z",
            true,
        ),
    ];
    for (issued, end, checked, allowed) in cases {
        let auth = fresh(&f, &f.derived.request.requester_ref, issued, end);
        let counts = ObserverInvocationCountsV1::default();
        let result = inspect(
            &f,
            RecoveryCredentialsV1 {
                token: &auth.0,
                csrf: &auth.1,
            },
            checked,
            &counts,
        );
        assert_eq!(
            matches!(
                result,
                AuthenticatedRecoveryOutcomeV1::ReadOnlyProjection(_)
            ),
            allowed
        );
        assert_counts(&counts, 0, 0);
        assert_eq!(ledger(&f), before);
    }
    assert!(
        f.store
            .lock()
            .unwrap()
            .revoke_local_session_v1(
                &f.requester_token,
                &f.requester_csrf,
                NOW,
                LocalSessionRevocationReasonV1::SignOut
            )
            .unwrap()
    );
    let counts = ObserverInvocationCountsV1::default();
    assert!(matches!(
        inspect(&f, credentials(&f), NOW, &counts),
        AuthenticatedRecoveryOutcomeV1::Denied
    ));
    assert_counts(&counts, 0, 0);
}

#[test]
fn authenticated_recovery_ar09_exact_request_and_policy() {
    let f = unknown(171_009, false);
    let before = ledger(&f);
    let frozen_attempt = attempt(&f);
    for missing in [true, false] {
        let mut derived = f.derived.clone();
        if !missing {
            derived.request.policy_decision_id = "pol_foreign".to_owned();
        }
        let counts = ObserverInvocationCountsV1::default();
        let out = recover_authenticated_request_v1(
            &f.store,
            if missing {
                "areq_missing"
            } else {
                &f.request_id
            },
            &derived,
            &f.operation_id,
            &attempt(&f),
            RecoveryModeV1::InspectOnly,
            credentials(&f),
            || Ok(NOW.to_owned()),
            trusted_synthetic_observer_policy_v1(),
            |_| panic!(),
            RESULT_AT,
            (|| panic!(), || panic!()),
            &counts,
        );
        assert!(matches!(out, AuthenticatedRecoveryOutcomeV1::Denied));
        assert_counts(&counts, 0, 0);
        assert_eq!(ledger(&f), before);
    }
    inject_fixture_fault(
        &f.store.lock().unwrap().connection,
        "lnsat_action_request_evaluations",
        "UPDATE lnsat_action_request_evaluations SET evidence_digest=?1 WHERE request_id=?2",
        &[&digest('f'), &f.request_id],
    );
    let corrupt = ledger(&f);
    let counts = ObserverInvocationCountsV1::default();
    assert!(matches!(
        inspect_frozen_attempt(&f, &frozen_attempt, &counts),
        AuthenticatedRecoveryOutcomeV1::Denied
    ));
    assert_eq!(ledger(&f), corrupt);
    assert_counts(&counts, 0, 0);
}

#[test]
fn authenticated_recovery_ar10_exact_operation_attempt_and_commitments() {
    let f = unknown(171_010, false);
    let before = ledger(&f);
    let frozen_attempt = attempt(&f);
    for kind in 0..7 {
        let mut derived = f.derived.clone();
        let mut operation = f.operation_id.clone();
        let mut aid = attempt(&f);
        match kind {
            0 => operation = "opn_foreign".to_owned(),
            1 => aid = "opa_foreign".to_owned(),
            2 => derived.request.project_ref = "project:foreign".to_owned(),
            3 => derived.request.resource_ref = "resource:foreign".to_owned(),
            4 => derived.request.adapter.version = "v2".to_owned(),
            5 => derived.request_digest = [0x42; 32],
            _ => {
                derived.request.action.arguments["patch_sha256"] =
                    serde_json::Value::String(digest('f'));
            }
        }
        let counts = ObserverInvocationCountsV1::default();
        let out = recover_authenticated_request_v1(
            &f.store,
            &f.request_id,
            &derived,
            &operation,
            &aid,
            RecoveryModeV1::InspectOnly,
            credentials(&f),
            || Ok(NOW.to_owned()),
            trusted_synthetic_observer_policy_v1(),
            |_| panic!(),
            RESULT_AT,
            (|| panic!(), || panic!()),
            &counts,
        );
        assert!(matches!(out, AuthenticatedRecoveryOutcomeV1::Denied));
        assert_counts(&counts, 0, 0);
        assert_eq!(ledger(&f), before);
    }
    for column in ["protocol_version", "tool_arguments_digest"] {
        let old: rusqlite::types::Value = f
            .store
            .lock()
            .unwrap()
            .connection
            .query_row(
                &format!("SELECT {column} FROM lnsat_operation_attempts WHERE operation_id=?1"),
                [&f.operation_id],
                |r| r.get(0),
            )
            .unwrap();
        let changed = if column == "protocol_version" {
            rusqlite::types::Value::Text("foreign.protocol.v1".to_owned())
        } else {
            rusqlite::types::Value::Blob(vec![9; 32])
        };
        let update =
            format!("UPDATE lnsat_operation_attempts SET {column}=?1 WHERE operation_id=?2");
        inject_fixture_fault(
            &f.store.lock().unwrap().connection,
            "lnsat_operation_attempts",
            &update,
            &[&changed, &f.operation_id],
        );
        let corrupt = ledger(&f);
        let counts = ObserverInvocationCountsV1::default();
        assert!(matches!(
            inspect_frozen_attempt(&f, &frozen_attempt, &counts),
            AuthenticatedRecoveryOutcomeV1::Denied
        ));
        assert_counts(&counts, 0, 0);
        assert_eq!(ledger(&f), corrupt);
        // Only fixture control restores its seed for the next independent mutation.
        inject_fixture_fault(
            &f.store.lock().unwrap().connection,
            "lnsat_operation_attempts",
            &update,
            &[&old, &f.operation_id],
        );
        assert_eq!(ledger(&f), before);
    }
}

#[test]
fn authenticated_recovery_ar11_original_store_and_reopen() {
    let sequence = 171_011;
    let f = unknown(sequence, false);
    let before = ledger(&f);
    let counts = ObserverInvocationCountsV1::default();
    let foreign_database = TestDatabase::new("foreign-authenticated-recovery-scope");
    let out = reconcile(
        &f,
        |e| {
            assert!(
                SqliteStore::open(&f.database.path).is_err(),
                "held lease forbids second full store"
            );
            let memory = SqliteStore::open(&foreign_database.path).unwrap();
            let prior = std::mem::replace(&mut *f.store.lock().unwrap(), memory);
            drop(prior);
            capture(sequence, e)
        },
        &counts,
    );
    assert!(matches!(out, AuthenticatedRecoveryOutcomeV1::Unconfirmed));
    assert_counts(&counts, 1, 0);
    *f.store.lock().unwrap() = SqliteStore::open(&f.database.path).unwrap();
    assert_eq!(ledger(&f), before);
    let fresh_counts = ObserverInvocationCountsV1::default();
    assert!(matches!(
        reconcile(&f, |e| capture(sequence, e), &fresh_counts),
        AuthenticatedRecoveryOutcomeV1::ReconciledProjection(_)
    ));
    assert_counts(&fresh_counts, 1, 1);
}

#[test]
fn authenticated_recovery_ar12_completed_entry_bypass() {
    let f = completed(171_012);
    let before = ledger(&f);
    let counts = ObserverInvocationCountsV1::default();
    assert!(matches!(
        reconcile(&f, |_| panic!("completed must not observe"), &counts),
        AuthenticatedRecoveryOutcomeV1::ReadOnlyProjection(_)
    ));
    assert_counts(&counts, 0, 0);
    assert_eq!(ledger(&f), before);
}

#[test]
fn authenticated_recovery_ar13_failed_terminal_bypass() {
    let mut f = reserved(171_013, false);
    f.store
        .lock()
        .unwrap()
        .fail_request_git_for_test_v1(&f.operation_id, "2026-07-22T20:03:32.000Z")
        .unwrap();
    replace_session(&mut f);
    let before = ledger(&f);
    let counts = ObserverInvocationCountsV1::default();
    assert!(matches!(
        reconcile(&f, |_| panic!(), &counts),
        AuthenticatedRecoveryOutcomeV1::Denied
    ));
    assert!(matches!(
        inspect(&f, credentials(&f), NOW, &counts),
        AuthenticatedRecoveryOutcomeV1::ReadOnlyProjection(_)
    ));
    assert_counts(&counts, 0, 0);
    assert_eq!(ledger(&f), before);
}

#[test]
fn authenticated_recovery_ar14_dispatching_restriction() {
    let mut f = reserved(171_014, false);
    replace_session(&mut f);
    let before = ledger(&f);
    let counts = ObserverInvocationCountsV1::default();
    assert!(matches!(
        reconcile(&f, |_| panic!(), &counts),
        AuthenticatedRecoveryOutcomeV1::Denied
    ));
    assert!(matches!(
        inspect(&f, credentials(&f), NOW, &counts),
        AuthenticatedRecoveryOutcomeV1::ReadOnlyProjection(_)
    ));
    assert_counts(&counts, 0, 0);
    assert_eq!(ledger(&f), before);
}

#[test]
fn authenticated_recovery_ar15_unlocked_single_observation() {
    let sequence = 171_015;
    let f = unknown(sequence, false);
    let counts = ObserverInvocationCountsV1::default();
    assert!(matches!(
        reconcile(
            &f,
            |e| {
                let s = f
                    .store
                    .try_lock()
                    .expect("observer can take original mutex");
                assert!(s.connection.is_autocommit(), "no transaction crosses port");
                assert_eq!(e.request_id(), f.request_id);
                assert_eq!(e.operation_id(), f.operation_id);
                assert_eq!(
                    e.operation_attempt_id(),
                    attempt_from_readback(&s, &f.operation_id)
                );
                assert_eq!(e.target(), &target(sequence));
                drop(s);
                capture(sequence, e)
            },
            &counts
        ),
        AuthenticatedRecoveryOutcomeV1::ReconciledProjection(_)
    ));
    assert_counts(&counts, 1, 1);
}

fn attempt_from_readback(store: &SqliteStore, operation: &str) -> String {
    store
        .read_phase8_operation_v1(operation)
        .unwrap()
        .unwrap()
        .attempt
        .unwrap()
        .operation_attempt_id
}

#[test]
fn authenticated_recovery_ar16_missing_uncertain_and_panic() {
    let f = unknown(171_016, false);
    let before = ledger(&f);
    for kind in 0..3 {
        let counts = ObserverInvocationCountsV1::default();
        assert!(matches!(
            reconcile(
                &f,
                |_| match kind {
                    0 => SyntheticObserverResultV1::Missing,
                    1 => SyntheticObserverResultV1::Uncertain,
                    _ => panic!("synthetic acquisition panic"),
                },
                &counts
            ),
            AuthenticatedRecoveryOutcomeV1::Unconfirmed
        ));
        assert_counts(&counts, 1, 0);
        assert_eq!(ledger(&f), before);
    }
}

#[test]
fn authenticated_recovery_ar17_capture_bounds_stamp_and_context() {
    let sequence = 171_017;
    let f = unknown(sequence, false);
    let before = ledger(&f);
    for kind in 0..8 {
        let counts = ObserverInvocationCountsV1::default();
        let out = reconcile(
            &f,
            |mut e| {
                let mut reported = result(sequence);
                let mut identity = target(sequence);
                match kind {
                    0 => {
                        return SyntheticObserverResultV1::Captured(Box::new(
                            UnverifiedSyntheticCaptureV1::incomplete_for_expectation(
                                e, identity, reported,
                            ),
                        ));
                    }
                    1 => reported.changed_paths = vec!["fixture.txt".to_owned(); 65],
                    2 => reported.metadata.message = "x".repeat(2049),
                    3 => e.invocation_stamp = Arc::new(()),
                    4 => identity.base_commit_oid = oid(9),
                    5 => e.launch_digest = [8; 32],
                    6 => e.tool_arguments_digest = [7; 32],
                    _ => reported.tree_oid = oid(999_999),
                }
                SyntheticObserverResultV1::Captured(Box::new(
                    UnverifiedSyntheticCaptureV1::complete_for_expectation(e, identity, reported),
                ))
            },
            &counts,
        );
        assert!(matches!(out, AuthenticatedRecoveryOutcomeV1::Unconfirmed));
        assert_counts(&counts, 1, usize::from(kind == 7));
        assert_eq!(ledger(&f), before);
    }
}

#[test]
fn authenticated_recovery_ar18_current_auth_drift() {
    for kind in 0..3 {
        let sequence = 171_180 + kind;
        let f = unknown(sequence, false);
        let counts = ObserverInvocationCountsV1::default();
        let before = ledger(&f);
        let mut clock_calls = 0;
        let out = invoke(
            &f,
            RecoveryModeV1::ReconcileUnknown,
            credentials(&f),
            || {
                clock_calls += 1;
                Ok(if kind == 1 && clock_calls > 1 {
                    SESSION_END
                } else {
                    NOW
                }
                .to_owned())
            },
            |e| {
                let mut store = f.store.lock().unwrap();
                if kind == 0 {
                    assert!(
                        store
                            .revoke_local_session_v1(
                                &f.requester_token,
                                &f.requester_csrf,
                                NOW,
                                LocalSessionRevocationReasonV1::SignOut
                            )
                            .unwrap()
                    );
                } else if kind == 2 {
                    inject_fixture_fault(
                        &store.connection,
                        "lnsat_local_identities",
                        "UPDATE lnsat_local_identities SET role='operator',owner_singleton=NULL WHERE identity_ref=?1",
                        &[&f.derived.request.requester_ref],
                    );
                }
                drop(store);
                capture(sequence, e)
            },
            (|| Ok(()), || Ok(())),
            &counts,
        );
        assert!(!matches!(
            out,
            AuthenticatedRecoveryOutcomeV1::ReconciledProjection(_)
        ));
        assert_counts(&counts, 1, 0);
        assert_eq!(ledger(&f), before);
    }
}

#[test]
fn authenticated_recovery_ar19_no_session_substitution() {
    let sequence = 171_019;
    let f = unknown(sequence, false);
    let before = ledger(&f);
    let counts = ObserverInvocationCountsV1::default();
    let another = fresh(
        &f,
        &f.derived.request.requester_ref,
        SESSION_AT,
        SESSION_END,
    );
    assert_ne!(another.0, f.requester_token);
    let out = reconcile(
        &f,
        |e| {
            f.store
                .lock()
                .unwrap()
                .revoke_local_session_v1(
                    &f.requester_token,
                    &f.requester_csrf,
                    NOW,
                    LocalSessionRevocationReasonV1::SignOut,
                )
                .unwrap();
            capture(sequence, e)
        },
        &counts,
    );
    assert!(matches!(out, AuthenticatedRecoveryOutcomeV1::Unconfirmed));
    assert_counts(&counts, 1, 0);
    assert_eq!(ledger(&f), before);
    let retry = ObserverInvocationCountsV1::default();
    assert!(matches!(
        inspect(
            &f,
            RecoveryCredentialsV1 {
                token: &another.0,
                csrf: &another.1
            },
            NOW,
            &retry
        ),
        AuthenticatedRecoveryOutcomeV1::ReadOnlyProjection(_)
    ));
}

#[test]
fn authenticated_recovery_ar20_full_readback_drift_across_observation() {
    let sequence = 171_020;
    let f = unknown(sequence, false);
    let counts = ObserverInvocationCountsV1::default();
    let out = reconcile(
        &f,
        |e| {
            // Trusted control interference models a different writer; the port API itself supplies no store.
            let mut s = f.store.lock().unwrap();
            let proof = s
                .verify_request_git_result_for_test_v1(
                    &f.request_id,
                    &f.derived,
                    &f.operation_id,
                    &target(sequence),
                    &result(sequence),
                )
                .unwrap();
            s.persist_request_git_result_with_sources_v1(proof, RESULT_AT, || Ok(()), || Ok(()))
                .unwrap();
            drop(s);
            capture(sequence, e)
        },
        &counts,
    );
    assert!(matches!(out, AuthenticatedRecoveryOutcomeV1::Unconfirmed));
    assert_counts(&counts, 1, 0);
    assert_eq!(f.readback().state, "completed");
    assert_eq!(number(&f, "lnsat_operation_receipts"), 1);
    assert_eq!(number(&f, "lnsat_operation_reconciliations"), 1);
}

#[test]
fn authenticated_recovery_ar21_same_actual_immediate_transaction() {
    let sequence = 171_021;
    let f = unknown(sequence, false);
    let before = ledger(&f);
    let aid = attempt(&f);
    let mut s = f.store.lock().unwrap();
    let ptr = std::ptr::from_ref(&s.connection);
    let proof = s
        .verify_request_git_result_for_test_v1(
            &f.request_id,
            &f.derived,
            &f.operation_id,
            &target(sequence),
            &result(sequence),
        )
        .unwrap();
    let mut called = 0;
    let mut fence = |tx: &Transaction<'_>| {
        called += 1;
        assert!(!tx.is_autocommit());
        assert!(std::ptr::eq(std::ptr::from_ref(&**tx), ptr));
        let entry = read_phase8_operation_v1(tx, &f.operation_id)
            .unwrap()
            .unwrap();
        assert_eq!(entry.state, "outcome_unknown");
        assert_eq!(entry.attempt.unwrap().operation_attempt_id, aid);
        assert_eq!(
            tx.query_row("SELECT count(*) FROM lnsat_operation_receipts", [], |r| r
                .get::<_, i64>(
                0
            ))
            .unwrap(),
            0
        );
        // Same transaction owns the auth touch; denial must roll it back with all result rows.
        authenticate_v1(
            tx,
            &credentials(&f),
            "9999-12-31T23:51:01.000Z",
            &f.derived.request.requester_ref,
            RecoveryModeV1::ReconcileUnknown,
            None,
        )
        .unwrap();
        Err(Phase7GitAdapterErrorV1::EvidenceDrift)
    };
    assert!(
        s.persist_authenticated_request_git_result_v1(
            proof,
            RESULT_AT,
            &mut fence,
            || panic!("denial precedes all result mutation"),
            || panic!()
        )
        .is_err()
    );
    assert_eq!(called, 1);
    drop(s);
    assert_eq!(ledger(&f), before);
}

#[test]
fn authenticated_recovery_ar22_logical_clock_authority() {
    let sequence = 171_022;
    let f = unknown(sequence, false);
    let before = ledger(&f);
    let schedules = [
        vec!["bad"],
        vec![NOW, "bad"],
        vec![NOW, NOW, "bad"],
        vec![NOW, "9999-12-31T23:50:29.999Z"],
        vec![NOW, NOW, "9999-12-31T23:50:29.999Z"],
        vec![NOW, NOW, SESSION_END],
        vec![NOW, SESSION_END],
    ];
    for schedule in schedules {
        let mut samples = VecDeque::from(schedule);
        let counts = ObserverInvocationCountsV1::default();
        let out = invoke(
            &f,
            RecoveryModeV1::ReconcileUnknown,
            credentials(&f),
            || samples.pop_front().map(str::to_owned).ok_or(()),
            |e| capture(sequence, e),
            (|| Ok(()), || Ok(())),
            &counts,
        );
        assert!(!matches!(
            out,
            AuthenticatedRecoveryOutcomeV1::ReconciledProjection(_)
        ));
        assert_eq!(counts.dispatches(), 0);
        assert_eq!(ledger(&f), before);
    }
    // No authority clock is inferred from the valid result persistence timestamp.
    let counts = ObserverInvocationCountsV1::default();
    assert!(matches!(
        invoke(
            &f,
            RecoveryModeV1::ReconcileUnknown,
            credentials(&f),
            || Err(()),
            |_| panic!(),
            (|| panic!(), || panic!()),
            &counts
        ),
        AuthenticatedRecoveryOutcomeV1::Denied
    ));
    assert_counts(&counts, 0, 0);
}

#[test]
fn authenticated_recovery_ar23_atomic_result_and_auth_rollback() {
    let sequence = 171_023;
    let f = unknown(sequence, false);
    let before = ledger(&f);
    let auth_before = activity(&f);
    let counts = ObserverInvocationCountsV1::default();
    let mut samples = VecDeque::from([NOW, NOW, "9999-12-31T23:51:01.000Z"]);
    assert!(matches!(
        invoke(
            &f,
            RecoveryModeV1::ReconcileUnknown,
            credentials(&f),
            || samples.pop_front().map(str::to_owned).ok_or(()),
            |e| capture(sequence, e),
            (
                || Err(Phase7GitAdapterErrorV1::PersistenceFailed),
                || panic!("rollback never reaches acknowledgement")
            ),
            &counts
        ),
        AuthenticatedRecoveryOutcomeV1::Unconfirmed
    ));
    assert_eq!(ledger(&f), before);
    assert_eq!(activity(&f), auth_before);
    assert_counts(&counts, 1, 1);
}

#[test]
fn authenticated_recovery_ar24_lost_ack_and_postcommit_auth_denial() {
    let sequence = 171_024;
    let f = unknown(sequence, false);
    let counts = ObserverInvocationCountsV1::default();
    let out = invoke(
        &f,
        RecoveryModeV1::ReconcileUnknown,
        credentials(&f),
        || Ok(NOW.to_owned()),
        |e| capture(sequence, e),
        (
            || Ok(()),
            || Err(Phase7GitAdapterErrorV1::PersistenceFailed),
        ),
        &counts,
    );
    assert!(matches!(out, AuthenticatedRecoveryOutcomeV1::Unconfirmed));
    assert_counts(&counts, 1, 1);
    assert_eq!(f.readback().state, "completed");
    let before = ledger(&f);
    let replay = ObserverInvocationCountsV1::default();
    assert!(matches!(
        inspect(&f, credentials(&f), NOW, &replay),
        AuthenticatedRecoveryOutcomeV1::ReadOnlyProjection(_)
    ));
    assert_counts(&replay, 0, 0);
    assert_eq!(ledger(&f), before);
    let next = unknown(171_240, false);
    let counts = ObserverInvocationCountsV1::default();
    let out = invoke(
        &next,
        RecoveryModeV1::ReconcileUnknown,
        credentials(&next),
        || Ok(NOW.to_owned()),
        |e| capture(171_240, e),
        (
            || Ok(()),
            || {
                let conn = Connection::open(&next.database.path).unwrap();
                let LocalSessionVerificationV1::Verified(session) =
                    verify_local_session_on_connection_v1(
                        &conn,
                        &next.requester_token,
                        Some(&next.requester_csrf),
                        NOW,
                    )
                    .unwrap()
                else {
                    panic!()
                };
                insert_local_session_revocation_v1(
                    &conn,
                    &session,
                    Some(&session.session_id),
                    NOW,
                    LocalSessionRevocationReasonV1::SignOut,
                )
                .unwrap();
                Ok(())
            },
        ),
        &counts,
    );
    assert!(matches!(out, AuthenticatedRecoveryOutcomeV1::Unconfirmed));
    assert_eq!(next.readback().state, "completed");
    assert_eq!(number(&next, "lnsat_operation_receipts"), 1);
    let replacement = fresh(&next, &next.derived.request.requester_ref, NOW, SESSION_END);
    let again = ObserverInvocationCountsV1::default();
    assert!(matches!(
        inspect(
            &next,
            RecoveryCredentialsV1 {
                token: &replacement.0,
                csrf: &replacement.1
            },
            NOW,
            &again
        ),
        AuthenticatedRecoveryOutcomeV1::ReadOnlyProjection(_)
    ));
    assert_counts(&again, 0, 0);
}

#[test]
fn authenticated_recovery_ar25_replay_conflict_and_repeated_unknown() {
    let sequence = 171_025;
    let f = unknown(sequence, false);
    let before = ledger(&f);
    for _ in 0..2 {
        let c = ObserverInvocationCountsV1::default();
        assert!(matches!(
            reconcile(&f, |_| SyntheticObserverResultV1::Missing, &c),
            AuthenticatedRecoveryOutcomeV1::Unconfirmed
        ));
        assert_counts(&c, 1, 0);
        assert_eq!(ledger(&f), before);
    }
    let c = ObserverInvocationCountsV1::default();
    assert!(matches!(
        reconcile(&f, |e| capture(sequence, e), &c),
        AuthenticatedRecoveryOutcomeV1::ReconciledProjection(_)
    ));
    let committed = ledger(&f);
    let replay = ObserverInvocationCountsV1::default();
    assert!(matches!(
        reconcile(&f, |_| panic!(), &replay),
        AuthenticatedRecoveryOutcomeV1::ReadOnlyProjection(_)
    ));
    assert_counts(&replay, 0, 0);
    assert_eq!(ledger(&f), committed);
    let mut changed = result(sequence);
    changed.commit_oid = oid(999_999);
    let mut store = f.store.lock().unwrap();
    let proof = store
        .verify_request_git_result_for_test_v1(
            &f.request_id,
            &f.derived,
            &f.operation_id,
            &target(sequence),
            &changed,
        )
        .unwrap();
    assert!(
        store
            .persist_request_git_result_with_sources_v1(
                proof,
                RESULT_AT,
                || panic!("conflict precedes mutation"),
                || panic!()
            )
            .is_err()
    );
    drop(store);
    assert_eq!(ledger(&f), committed);
}

#[test]
fn authenticated_recovery_ar26_projection_bounds_secrets_and_degradation() {
    let f = completed(171_026);
    let c = ObserverInvocationCountsV1::default();
    let AuthenticatedRecoveryOutcomeV1::ReadOnlyProjection(record) =
        inspect(&f, credentials(&f), NOW, &c)
    else {
        panic!()
    };
    let encoded = serde_json::to_string(&record).unwrap();
    assert!(encoded.len() <= 65_536);
    assert!(!encoded.contains(&f.requester_token));
    assert!(!encoded.contains(&f.requester_csrf));
    assert!(!encoded.contains("canonical_packet"));
    assert!(!encoded.contains("invocation_stamp"));
    assert_counts(&c, 0, 0);
    let next = unknown(171_260, false);
    let frozen_attempt = attempt(&next);
    let c = ObserverInvocationCountsV1::default();
    let out = invoke(
        &next,
        RecoveryModeV1::ReconcileUnknown,
        credentials(&next),
        || Ok(NOW.to_owned()),
        |e| capture(171_260, e),
        (
            || Ok(()),
            || {
                let conn = Connection::open(&next.database.path).unwrap();
                inject_fixture_fault(
                    &conn,
                    "lnsat_operation_receipts",
                    "UPDATE lnsat_operation_receipts SET result_digest=zeroblob(32)",
                    &[],
                );
                Ok(())
            },
        ),
        &c,
    );
    assert!(matches!(out, AuthenticatedRecoveryOutcomeV1::Unconfirmed));
    assert_counts(&c, 1, 1);
    let before = ledger(&next);
    let retry = ObserverInvocationCountsV1::default();
    assert!(!matches!(
        inspect_frozen_attempt(&next, &frozen_attempt, &retry),
        AuthenticatedRecoveryOutcomeV1::ReadOnlyProjection(_)
    ));
    assert_eq!(ledger(&next), before);
    assert_counts(&retry, 0, 0);
}

#[test]
fn authenticated_recovery_ar27_activity_accounting() {
    let sequence = 171_027;
    let f = unknown(sequence, false);
    let c = ObserverInvocationCountsV1::default();
    let auth_before = activity(&f).len();
    let mut samples = VecDeque::from([
        NOW,
        "9999-12-31T23:51:00.000Z",
        "9999-12-31T23:51:01.000Z",
        "9999-12-31T23:51:01.000Z",
    ]);
    let AuthenticatedRecoveryOutcomeV1::ReconciledProjection(record) = invoke(
        &f,
        RecoveryModeV1::ReconcileUnknown,
        credentials(&f),
        || samples.pop_front().map(str::to_owned).ok_or(()),
        |e| capture(sequence, e),
        (|| Ok(()), || Ok(())),
        &c,
    ) else {
        panic!("early committed touch must not prevent completion")
    };
    assert!(record.security_activity_touched);
    assert_eq!(activity(&f).len(), auth_before + 1);
    assert_counts(&c, 1, 1);
    let next = unknown(171_270, false);
    let before = ledger(&next);
    let c = ObserverInvocationCountsV1::default();
    let AuthenticatedRecoveryOutcomeV1::ReadOnlyProjection(record) =
        inspect(&next, credentials(&next), "9999-12-31T23:51:01.000Z", &c)
    else {
        panic!()
    };
    assert!(record.security_activity_touched);
    assert_eq!(ledger(&next), before);
    assert_counts(&c, 0, 0);
    let final_only = unknown(171_271, false);
    let initial = activity(&final_only).len();
    let c = ObserverInvocationCountsV1::default();
    let mut samples = VecDeque::from([
        NOW,
        NOW,
        "9999-12-31T23:51:01.000Z",
        "9999-12-31T23:51:01.000Z",
    ]);
    let AuthenticatedRecoveryOutcomeV1::ReconciledProjection(record) = invoke(
        &final_only,
        RecoveryModeV1::ReconcileUnknown,
        credentials(&final_only),
        || samples.pop_front().map(str::to_owned).ok_or(()),
        |e| capture(171_271, e),
        (|| Ok(()), || Ok(())),
        &c,
    ) else {
        panic!("final-fence-only touch must project")
    };
    assert!(record.security_activity_touched);
    assert_eq!(activity(&final_only).len(), initial + 1);
    assert_counts(&c, 1, 1);
    let rejected = unknown(171_272, false);
    let before = activity(&rejected);
    let result_before = ledger(&rejected);
    let c = ObserverInvocationCountsV1::default();
    let out = recover_authenticated_request_v1(
        &rejected.store,
        "areq_missing",
        &rejected.derived,
        &rejected.operation_id,
        &attempt(&rejected),
        RecoveryModeV1::InspectOnly,
        credentials(&rejected),
        || Ok("9999-12-31T23:51:01.000Z".to_owned()),
        trusted_synthetic_observer_policy_v1(),
        |_| panic!(),
        RESULT_AT,
        (|| panic!(), || panic!()),
        &c,
    );
    assert!(matches!(out, AuthenticatedRecoveryOutcomeV1::Denied));
    assert_eq!(activity(&rejected), before);
    assert_eq!(ledger(&rejected), result_before);
    assert_counts(&c, 0, 0);
}

#[test]
fn authenticated_recovery_ar28_structural_production_closure() {
    let parent = include_str!("../../request_observer.rs");
    let source = include_str!("../authenticated_recovery.rs");
    let writer = include_str!("../../../../../phase7_git_adapter/request_result.rs");
    assert!(parent.contains("#[cfg(test)]\nmod authenticated_recovery;"));
    assert!(
        writer.contains(
            "#[cfg(test)]\n    pub(crate) fn persist_authenticated_request_git_result_v1"
        )
    );
    assert!(writer.contains("#[cfg(test)]\n        if let Some(fence) = recovery_fence"));
    assert!(writer.contains("recovery_fence: Option<RecoveryFenceV1<'_>>"));
    assert!(!source.contains("pub fn "));
    assert!(!source.contains("pub(crate) fn recover"));
    assert!(!source.contains("guard_request_dispatch"));
    assert!(!source.contains("mark_request_git_outcome_unknown"));
    assert!(!source.contains("persist_request_git_result_with_sources_v1"));
}
