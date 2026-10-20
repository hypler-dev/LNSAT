// Private synthetic observer tests. Fixture setup is narrowly copied from
// the coordinator fixture; no inherited test bodies are imported.

use super::super::*;
use super::*;
use crate::*;
use lnsat_contracts::{
    ApprovalDecisionV1Input, ApprovalDecisionV1Kind, ApprovalDecisionV1Reason,
    ExecutionRequestV1Input, derive_execution_request_v1,
};
use serde_json::Value;
use std::fs;
use std::path::PathBuf;
use std::sync::{
    Arc, Mutex,
    atomic::{AtomicU64, Ordering},
};

static NEXT_TEST_DATABASE: AtomicU64 = AtomicU64::new(1);
const PACKET_FIXTURE: &str =
    include_str!("../../../../../../../fixtures/contracts/packet-envelope-v1_0.json");

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

fn git_fixture_c01(sequence: u64) -> AdmissionFixture {
    git_fixture_with_paths(sequence, vec!["fixture.txt".to_owned()])
}

fn git_fixture_with_paths(sequence: u64, paths: Vec<String>) -> AdmissionFixture {
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

const COORDINATOR_SOURCE: &str = include_str!("../../request_coordinator.rs");

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
    fn new(sequence: u64) -> Self {
        Self::from_admission(git_fixture_c01(sequence))
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

    fn database_path(&self) -> PathBuf {
        self.database.path.clone()
    }
}

const DISPATCHED_AT: &str = "2026-07-22T20:03:31.000Z";
const RECORDED_AT: &str = "2026-07-22T20:03:32.000Z";
const RECOVERED_AT: &str = "9999-12-31T23:58:00.000Z";
type Ledger = Vec<(String, Vec<Vec<rusqlite::types::Value>>)>;

fn ledger(store: &SqliteStore) -> Ledger {
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
    .map(|table| {
        let mut query = store
            .connection
            .prepare(&format!("SELECT * FROM {table} ORDER BY 1"))
            .unwrap();
        let columns = query.column_count();
        let rows = query
            .query_map([], |row| {
                (0..columns)
                    .map(|i| row.get(i))
                    .collect::<Result<Vec<rusqlite::types::Value>, _>>()
            })
            .unwrap()
            .collect::<Result<Vec<_>, _>>()
            .unwrap();
        (table.to_owned(), rows)
    })
    .collect()
}

fn count(store: &SqliteStore, table: &str) -> i64 {
    store
        .connection
        .query_row(&format!("SELECT count(*) FROM {table}"), [], |row| {
            row.get(0)
        })
        .unwrap()
}

fn snapshot(f: &CoordinatorFixture) -> Ledger {
    ledger(&f.store.lock().unwrap())
}
fn assert_counts(c: &ObserverInvocationCountsV1, d: usize, o: usize, p: usize) {
    assert_eq!(
        (c.dispatches(), c.observers(), c.proof_constructor_calls()),
        (d, o, p)
    );
}
fn capture(sequence: u64, e: ObserverExpectationV1) -> SyntheticObserverResultV1 {
    SyntheticObserverResultV1::Captured(Box::new(
        UnverifiedSyntheticCaptureV1::complete_for_expectation(
            e,
            target(sequence),
            result(sequence),
        ),
    ))
}

#[allow(clippy::too_many_arguments)] // Preserve explicit dispatch, observation and persistence ports.
fn run_ports<D, O, P, A>(
    f: &CoordinatorFixture,
    reservation: CoordinatedReservationV1,
    dispatch: D,
    observer: O,
    at: &str,
    hooks: (P, A),
    counts: &ObserverInvocationCountsV1,
) -> CoordinatorOutcomeV1
where
    D: FnOnce(RequestFakeDispatchGuardV1) -> Result<(), ()>,
    O: FnOnce(ObserverExpectationV1) -> SyntheticObserverResultV1,
    P: FnOnce() -> Result<(), Phase7GitAdapterErrorV1>,
    A: FnOnce() -> Result<(), Phase7GitAdapterErrorV1>,
{
    run_request_git_observer_v1(
        &f.store,
        reservation,
        &f.derived,
        (&f.requester_token, &f.requester_csrf),
        || Ok(DISPATCHED_AT.to_owned()),
        trusted_synthetic_observer_policy_v1(),
        dispatch,
        observer,
        at,
        hooks,
        counts,
    )
}
fn run_case<O>(
    f: &CoordinatorFixture,
    observer: O,
) -> (CoordinatorOutcomeV1, ObserverInvocationCountsV1)
where
    O: FnOnce(ObserverExpectationV1) -> SyntheticObserverResultV1,
{
    let c = ObserverInvocationCountsV1::default();
    let outcome = run_ports(
        f,
        f.reserve("request-observer:normal").unwrap(),
        |_| Ok(()),
        observer,
        RECORDED_AT,
        (|| Ok(()), || Ok(())),
        &c,
    );
    (outcome, c)
}
fn complete(f: &CoordinatorFixture, sequence: u64) {
    let (outcome, c) = run_case(f, |e| capture(sequence, e));
    assert!(matches!(outcome, CoordinatorOutcomeV1::Completed(_)));
    assert_counts(&c, 1, 1, 1);
    assert_eq!(f.readback().state, "completed");
}
fn no_receipt(f: &CoordinatorFixture) {
    let store = f.store.lock().unwrap();
    assert_eq!(count(&store, "lnsat_operation_receipts"), 0);
    assert_eq!(count(&store, "lnsat_operation_reconciliations"), 0);
}
fn corrupt_fixture_row<P: rusqlite::Params>(
    store: &SqliteStore,
    trigger: &str,
    sql: &str,
    params: P,
) -> usize {
    // Corruption is confined to this disposable fixture. Restore the exact
    // trigger before returning so schema omission is not the rejection oracle.
    let restore: String = store
        .connection
        .query_row(
            "SELECT sql FROM sqlite_master WHERE type='trigger' AND name=?1",
            [trigger],
            |row| row.get(0),
        )
        .unwrap();
    store
        .connection
        .execute_batch(&format!("DROP TRIGGER {trigger}"))
        .unwrap();
    let changed = store.connection.execute(sql, params);
    store.connection.execute_batch(&(restore + ";")).unwrap();
    changed.unwrap()
}
fn rejected_capture<O>(f: &CoordinatorFixture, observer: O, proof_calls: usize)
where
    O: FnOnce(ObserverExpectationV1) -> SyntheticObserverResultV1,
{
    let returned = std::cell::Cell::new(false);
    let (outcome, c) = run_case(f, |expected| {
        let capture = observer(expected);
        returned.set(true);
        capture
    });
    assert!(
        returned.get(),
        "a fixture assertion panic cannot stand in for capture rejection"
    );
    assert!(matches!(
        outcome,
        CoordinatorOutcomeV1::AttemptedUnconfirmed
    ));
    assert_counts(&c, 1, 1, proof_calls);
    no_receipt(f);
}
fn unknown(f: &CoordinatorFixture) {
    rejected_capture(f, |_| SyntheticObserverResultV1::Missing, 0);
    assert_eq!(f.readback().state, "outcome_unknown");
}
fn recover<O, P, A>(
    f: &CoordinatorFixture,
    store: &Arc<Mutex<SqliteStore>>,
    observer: O,
    hooks: (P, A),
    c: &ObserverInvocationCountsV1,
) -> CoordinatorOutcomeV1
where
    O: FnOnce(ObserverExpectationV1) -> SyntheticObserverResultV1,
    P: FnOnce() -> Result<(), Phase7GitAdapterErrorV1>,
    A: FnOnce() -> Result<(), Phase7GitAdapterErrorV1>,
{
    let attempt = store
        .lock()
        .unwrap()
        .read_phase8_operation_v1(&f.operation_id)
        .unwrap()
        .unwrap()
        .attempt
        .unwrap();
    recover_request_git_observer_v1(
        store,
        &f.request_id,
        &f.derived,
        &f.operation_id,
        &attempt.operation_attempt_id,
        trusted_synthetic_observer_policy_v1(),
        observer,
        RECOVERED_AT,
        hooks,
        c,
    )
}

#[test]
fn request_observer_g01_independent_assembly() {
    let f = CoordinatorFixture::new(91_001);
    let (outcome, c) = run_case(&f, |e| {
        assert_eq!(e.request_id(), f.request_id);
        assert_eq!(e.operation_id(), f.operation_id);
        assert!(!e.operation_attempt_id().is_empty());
        assert_eq!(e.target(), &target(91_001));
        capture(91_001, e)
    });
    assert!(matches!(outcome, CoordinatorOutcomeV1::Completed(_)));
    assert_counts(&c, 1, 1, 1);
    let ack_only = CoordinatorFixture::new(92_001);
    rejected_capture(&ack_only, |_| SyntheticObserverResultV1::Missing, 0);
    assert!(ack_only.reserve("cannot-retry-after-ack").is_err());
}

#[test]
fn request_observer_g02_immutable_expectation() {
    for n in 0..3 {
        let sequence = 91_020 + n;
        let f = CoordinatorFixture::new(sequence);
        rejected_capture(
            &f,
            |mut e| {
                match n {
                    0 => e.request_id.push('x'),
                    1 => e.target.head_ref.push('x'),
                    _ => e.invocation_stamp = Arc::new(()),
                }
                capture(sequence, e)
            },
            0,
        );
    }
}

#[test]
fn request_observer_g03_request_identity() {
    for n in 0..2 {
        let sequence = 91_030 + n;
        let f = CoordinatorFixture::new(sequence);
        rejected_capture(
            &f,
            |mut e| {
                if n == 0 {
                    e.request_id = "arq_neighbor".to_owned();
                } else {
                    e.request_digest = [9; 32];
                }
                capture(sequence, e)
            },
            0,
        );
    }
}

#[test]
fn request_observer_g04_parent_lineage() {
    let f = CoordinatorFixture::new(91_004);
    let probe = Arc::clone(&f.store);
    let authorization = f.authorization_id.clone();
    rejected_capture(
        &f,
        move |e| {
            let store = probe.try_lock().unwrap();
            assert_eq!(
                corrupt_fixture_row(
                    &store,
                    "lnsat_phase7_audit_bindings_reject_update",
                    "UPDATE lnsat_phase7_audit_bindings SET event_kind='receipt_recorded' WHERE record_id=?1",
                    [authorization]
                ),
                1
            );
            capture(91_004, e)
        },
        0,
    );
}

#[test]
fn request_observer_g05_exact_attempt() {
    for n in 0..2 {
        let sequence = 91_050 + n;
        let f = CoordinatorFixture::new(sequence);
        rejected_capture(
            &f,
            |mut e| {
                if n == 0 {
                    e.operation_id.push('x');
                } else {
                    e.operation_attempt_id.push('x');
                }
                capture(sequence, e)
            },
            0,
        );
    }
}

#[test]
fn request_observer_g06_commitment_domains() {
    for n in 0..3 {
        let sequence = 91_060 + n;
        let f = CoordinatorFixture::new(sequence);
        rejected_capture(
            &f,
            |mut e| {
                assert_ne!(e.launch_digest, e.tool_arguments_digest);
                match n {
                    0 => e.launch_digest = e.tool_arguments_digest,
                    1 => e.tool_arguments_digest = e.request_digest,
                    _ => e.request_digest = e.launch_digest,
                }
                capture(sequence, e)
            },
            0,
        );
    }
    let f = CoordinatorFixture::new(92_006);
    let reservation = f.reserve("domain-stored-attempt").unwrap();
    let tool = phase7_git_tool_arguments_digest_v1(&f.derived).unwrap();
    let stored: Vec<u8> = f
        .store
        .lock()
        .unwrap()
        .connection
        .query_row(
            "SELECT tool_arguments_digest FROM lnsat_operation_attempts",
            [],
            |row| row.get(0),
        )
        .unwrap();
    assert_ne!(stored, tool);
    drop(reservation);
}

#[test]
fn request_observer_g07_protocol_adapter() {
    for (n, sql) in [
        "UPDATE lnsat_operation_attempts SET protocol_version='other'",
        "UPDATE lnsat_operation_attempts SET adapter_ref='adapter:other'",
    ]
    .into_iter()
    .enumerate()
    {
        let sequence = 91_070 + n as u64;
        let f = CoordinatorFixture::new(sequence);
        let probe = Arc::clone(&f.store);
        rejected_capture(
            &f,
            move |e| {
                assert_eq!(
                    corrupt_fixture_row(
                        &probe.try_lock().unwrap(),
                        "lnsat_operation_attempts_reject_update",
                        sql,
                        []
                    ),
                    1
                );
                capture(sequence, e)
            },
            0,
        );
    }
    let f = CoordinatorFixture::new(92_007);
    let reservation = f.reserve("wrong-version").unwrap();
    let mut derived = f.derived.clone();
    derived.request.adapter.version = "v2".to_owned();
    let c = ObserverInvocationCountsV1::default();
    let outcome = run_request_git_observer_v1(
        &f.store,
        reservation,
        &derived,
        (&f.requester_token, &f.requester_csrf),
        || Ok(DISPATCHED_AT.to_owned()),
        trusted_synthetic_observer_policy_v1(),
        |_| panic!("no dispatch"),
        |_| panic!("no observation"),
        RECORDED_AT,
        (|| Ok(()), || Ok(())),
        &c,
    );
    assert!(matches!(outcome, CoordinatorOutcomeV1::Rejected));
    assert_counts(&c, 0, 0, 0);
    no_receipt(&f);
}

#[test]
fn request_observer_g08_store_scope() {
    let f = CoordinatorFixture::new(91_008);
    let reservation = f.reserve("inner-replaced").unwrap();
    *f.store.lock().unwrap() = SqliteStore::open(f.database_path()).unwrap();
    let c = ObserverInvocationCountsV1::default();
    let outcome = run_ports(
        &f,
        reservation,
        |_| panic!("no dispatch"),
        |_| panic!("no observation"),
        RECORDED_AT,
        (|| Ok(()), || Ok(())),
        &c,
    );
    assert!(matches!(outcome, CoordinatorOutcomeV1::Unconfirmed));
    assert_counts(&c, 0, 0, 0);
    no_receipt(&f);
    let proof = f
        .store
        .lock()
        .unwrap()
        .verify_request_git_result_for_test_v1(
            &f.request_id,
            &f.derived,
            &f.operation_id,
            &target(91_008),
            &result(91_008),
        )
        .unwrap();
    let mut reopened = SqliteStore::open(f.database_path()).unwrap();
    let before = ledger(&reopened);
    assert!(
        reopened
            .persist_request_git_result_with_sources_v1(
                proof,
                RECORDED_AT,
                || panic!("no write"),
                || panic!("no write")
            )
            .is_err()
    );
    assert_eq!(ledger(&reopened), before);
}

#[test]
fn request_observer_g09_unlocked_ports() {
    let f = CoordinatorFixture::new(91_009);
    let dispatch_probe = Arc::clone(&f.store);
    let observe_probe = Arc::clone(&f.store);
    let c = ObserverInvocationCountsV1::default();
    let outcome = run_ports(
        &f,
        f.reserve("unlocked").unwrap(),
        move |_| {
            let mut store = dispatch_probe.try_lock().unwrap();
            let tx = store.connection.transaction().unwrap();
            tx.commit().unwrap();
            Ok(())
        },
        move |e| {
            let mut store = observe_probe.try_lock().unwrap();
            let tx = store.connection.transaction().unwrap();
            tx.commit().unwrap();
            capture(91_009, e)
        },
        RECORDED_AT,
        (|| Ok(()), || Ok(())),
        &c,
    );
    assert!(matches!(outcome, CoordinatorOutcomeV1::Completed(_)));
    assert_counts(&c, 1, 1, 1);
}

#[test]
#[allow(clippy::too_many_lines)] // Keep normal/recovery transition variants and their no-extra-write oracles together.
fn request_observer_g10_post_acquisition_drift() {
    let f = CoordinatorFixture::new(91_010);
    let probe = Arc::clone(&f.store);
    rejected_capture(
        &f,
        move |e| {
            assert_eq!(
                corrupt_fixture_row(
                    &probe.try_lock().unwrap(),
                    "lnsat_operation_attempts_reject_update",
                    "UPDATE lnsat_operation_attempts SET tool_arguments_digest=zeroblob(32)",
                    []
                ),
                1
            );
            capture(91_010, e)
        },
        0,
    );
    // A valid concurrent state transition is drift even when every immutable
    // request/target/attempt field still matches.
    for n in 0..3 {
        let sequence = 92_100 + n;
        let f = CoordinatorFixture::new(sequence);
        let probe = Arc::clone(&f.store);
        let durable = Mutex::new(None);
        let (outcome, c) = run_case(&f, |e| {
            let mut store = probe.try_lock().unwrap();
            match n {
                0 => store.mark_request_unknown_for_mode_v1(
                    RequestModeV1::GitResult,
                    &e.operation_id,
                    &e.operation_attempt_id,
                    &e.launch_digest,
                ),
                1 => {
                    // This lower-API call models a different actor. The boundary
                    // counter below measures only this invocation's constructor.
                    let proof = store
                        .verify_request_git_result_for_test_v1(
                            &f.request_id,
                            &f.derived,
                            &f.operation_id,
                            &target(sequence),
                            &result(sequence),
                        )
                        .unwrap();
                    store
                        .persist_request_git_result_with_sources_v1(
                            proof,
                            RECORDED_AT,
                            || Ok(()),
                            || Ok(()),
                        )
                        .unwrap();
                }
                _ => store
                    .fail_request_git_for_test_v1(&f.operation_id, RECORDED_AT)
                    .unwrap(),
            }
            *durable.lock().unwrap() = Some(ledger(&store));
            capture(sequence, e)
        });
        assert!(matches!(
            outcome,
            CoordinatorOutcomeV1::AttemptedUnconfirmed
        ));
        assert_counts(&c, 1, 1, 0);
        assert_eq!(snapshot(&f), durable.lock().unwrap().take().unwrap());
    }
    for n in 0..2 {
        let sequence = 93_100 + n;
        let f = CoordinatorFixture::new(sequence);
        if n == 0 {
            unknown(&f);
        } else {
            drop(f.reserve("concurrent-failure").unwrap());
        }
        let probe = Arc::clone(&f.store);
        let durable = Mutex::new(None);
        let c = ObserverInvocationCountsV1::default();
        let outcome = recover(
            &f,
            &f.store,
            |e| {
                let mut store = probe.try_lock().unwrap();
                if n == 0 {
                    let proof = store
                        .verify_request_git_result_for_test_v1(
                            &f.request_id,
                            &f.derived,
                            &f.operation_id,
                            &target(sequence),
                            &result(sequence),
                        )
                        .unwrap();
                    store
                        .persist_request_git_result_with_sources_v1(
                            proof,
                            RECOVERED_AT,
                            || Ok(()),
                            || Ok(()),
                        )
                        .unwrap();
                } else {
                    store
                        .fail_request_git_for_test_v1(&f.operation_id, RECOVERED_AT)
                        .unwrap();
                }
                *durable.lock().unwrap() = Some(ledger(&store));
                capture(sequence, e)
            },
            (
                || panic!("drift must reject before persistence"),
                || panic!("no persistence"),
            ),
            &c,
        );
        assert!(matches!(outcome, CoordinatorOutcomeV1::Rejected));
        assert_counts(&c, 0, 1, 0);
        assert_eq!(snapshot(&f), durable.lock().unwrap().take().unwrap());
    }
}

#[test]
fn request_observer_g11_target_identity() {
    for n in 0..6 {
        let sequence = 91_110 + n;
        let f = CoordinatorFixture::new(sequence);
        rejected_capture(
            &f,
            |e| {
                let mut t = target(sequence);
                match n {
                    0 => t.repository_path.push("other"),
                    1 => t.git_dir_path.push("other"),
                    2 => t.object_format = "sha256".to_owned(),
                    3 => t.head_ref.push('x'),
                    4 => t.base_commit_oid = oid(1),
                    _ => t.fixture_marker_sha256 = digest('a'),
                }
                SyntheticObserverResultV1::Captured(Box::new(
                    UnverifiedSyntheticCaptureV1::complete_for_expectation(e, t, result(sequence)),
                ))
            },
            0,
        );
    }
}

#[test]
fn request_observer_g12_commit_tree() {
    for n in 0..3 {
        let sequence = 91_120 + n;
        let f = CoordinatorFixture::new(sequence);
        rejected_capture(
            &f,
            |e| {
                let mut r = result(sequence);
                match n {
                    0 => r.commit_oid = "not-an-oid".to_owned(),
                    1 => r.commit_oid = target(sequence).base_commit_oid,
                    _ => r.tree_oid = oid(1),
                }
                SyntheticObserverResultV1::Captured(Box::new(
                    UnverifiedSyntheticCaptureV1::complete_for_expectation(e, target(sequence), r),
                ))
            },
            1,
        );
    }
}

#[test]
fn request_observer_g13_paths_patch() {
    for n in 0..4 {
        let sequence = 91_130 + n;
        let f = CoordinatorFixture::new(sequence);
        rejected_capture(
            &f,
            |e| {
                let mut r = result(sequence);
                match n {
                    0 => r.changed_paths.clear(),
                    1 => r.changed_paths.push("extra.txt".to_owned()),
                    2 => r.changed_paths = vec!["other.txt".to_owned()],
                    _ => r.patch_sha256 = digest('a'),
                }
                SyntheticObserverResultV1::Captured(Box::new(
                    UnverifiedSyntheticCaptureV1::complete_for_expectation(e, target(sequence), r),
                ))
            },
            1,
        );
    }
    for n in 0..2 {
        let sequence = 92_130 + n;
        let f = CoordinatorFixture::from_admission(git_fixture_with_paths(
            sequence,
            vec!["a.txt".to_owned(), "b.txt".to_owned()],
        ));
        let (outcome, c) = run_case(&f, |e| {
            let mut r = result(sequence);
            r.changed_paths = if n == 0 {
                vec!["a.txt".to_owned(), "b.txt".to_owned()]
            } else {
                vec!["b.txt".to_owned(), "a.txt".to_owned()]
            };
            SyntheticObserverResultV1::Captured(Box::new(
                UnverifiedSyntheticCaptureV1::complete_for_expectation(e, target(sequence), r),
            ))
        });
        assert_counts(&c, 1, 1, 1);
        if n == 0 {
            assert!(matches!(outcome, CoordinatorOutcomeV1::Completed(_)));
        } else {
            assert!(matches!(
                outcome,
                CoordinatorOutcomeV1::AttemptedUnconfirmed
            ));
            no_receipt(&f);
        }
    }
}

#[test]
fn request_observer_g14_commit_metadata() {
    for n in 0..7 {
        let sequence = 91_140 + n;
        let f = CoordinatorFixture::new(sequence);
        rejected_capture(
            &f,
            |e| {
                let mut r = result(sequence);
                let field = match n {
                    0 => &mut r.metadata.message,
                    1 => &mut r.metadata.author_name,
                    2 => &mut r.metadata.author_email,
                    3 => &mut r.metadata.author_time,
                    4 => &mut r.metadata.committer_name,
                    5 => &mut r.metadata.committer_email,
                    _ => &mut r.metadata.committer_time,
                };
                field.push('x');
                SyntheticObserverResultV1::Captured(Box::new(
                    UnverifiedSyntheticCaptureV1::complete_for_expectation(e, target(sequence), r),
                ))
            },
            1,
        );
    }
}

#[test]
fn request_observer_g15_complete_capture() {
    for n in 0..5 {
        let sequence = 91_150 + n;
        let f = CoordinatorFixture::new(sequence);
        rejected_capture(
            &f,
            |e| {
                let mut cap = UnverifiedSyntheticCaptureV1::complete_for_expectation(
                    e,
                    target(sequence),
                    result(sequence),
                );
                match n {
                    0 => {
                        cap = UnverifiedSyntheticCaptureV1::incomplete_for_expectation(
                            cap.expectation,
                            cap.target,
                            cap.result,
                        );
                    }
                    1 => cap.result.changed_paths = vec!["a".to_owned(); 65],
                    2 => cap.result.changed_paths = vec!["a".repeat(1025)],
                    3 => cap.result.metadata.message = "m".repeat(2049),
                    _ => cap.result.changed_paths = vec!["p".repeat(1024); 16],
                }
                SyntheticObserverResultV1::Captured(Box::new(cap))
            },
            0,
        );
    }
    let f = CoordinatorFixture::new(92_015);
    unknown(&f);
    let retained = Mutex::new(None);
    let c = ObserverInvocationCountsV1::default();
    assert!(matches!(
        recover(
            &f,
            &f.store,
            |e| {
                *retained.lock().unwrap() =
                    Some(UnverifiedSyntheticCaptureV1::complete_for_expectation(
                        e,
                        target(92_015),
                        result(92_015),
                    ));
                SyntheticObserverResultV1::Uncertain
            },
            (|| Ok(()), || Ok(())),
            &c
        ),
        CoordinatorOutcomeV1::Unconfirmed
    ));
    assert_counts(&c, 0, 1, 0);
    let c = ObserverInvocationCountsV1::default();
    let before = snapshot(&f);
    assert!(matches!(
        recover(
            &f,
            &f.store,
            |_| SyntheticObserverResultV1::Captured(Box::new(
                retained.lock().unwrap().take().unwrap()
            )),
            (|| Ok(()), || Ok(())),
            &c
        ),
        CoordinatorOutcomeV1::Rejected
    ));
    assert_counts(&c, 0, 1, 0);
    assert_eq!(snapshot(&f), before);
}

#[test]
fn request_observer_g16_no_observation() {
    for n in 0..3 {
        let f = CoordinatorFixture::new(91_160 + n);
        if n < 2 {
            rejected_capture(
                &f,
                |_| {
                    if n == 0 {
                        SyntheticObserverResultV1::Missing
                    } else {
                        SyntheticObserverResultV1::Uncertain
                    }
                },
                0,
            );
        } else {
            let (outcome, c) = run_case(&f, |_| panic!("synthetic observer panic"));
            assert!(matches!(
                outcome,
                CoordinatorOutcomeV1::AttemptedUnconfirmed
            ));
            assert_counts(&c, 1, 1, 0);
            no_receipt(&f);
        }
        assert_eq!(f.readback().state, "outcome_unknown");
        assert!(f.reserve("no-redispatch").is_err());
    }
    let f = CoordinatorFixture::new(92_016);
    let panic = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        rejected_capture(&f, |_| panic!("deliberate fixture assertion failure"), 0);
    }))
    .expect_err("the rejection helper must reject a swallowed fixture panic");
    let message = panic
        .downcast_ref::<&str>()
        .copied()
        .or_else(|| panic.downcast_ref::<String>().map(String::as_str))
        .unwrap_or("");
    assert!(message.contains("a fixture assertion panic cannot stand in for capture rejection"));
}

#[test]
fn request_observer_g17_dispatch_uncertainty() {
    for n in 0..2 {
        let f = CoordinatorFixture::new(91_170 + n);
        let c = ObserverInvocationCountsV1::default();
        let outcome = run_ports(
            &f,
            f.reserve("dispatch-uncertain").unwrap(),
            |_| {
                if n == 0 {
                    Err(())
                } else {
                    panic!("synthetic dispatch panic")
                }
            },
            |_| panic!("must skip observation"),
            RECORDED_AT,
            (|| Ok(()), || Ok(())),
            &c,
        );
        assert!(matches!(
            outcome,
            CoordinatorOutcomeV1::AttemptedUnconfirmed
        ));
        assert_counts(&c, 1, 0, 0);
        no_receipt(&f);
        assert!(f.reserve("no-effect-retry").is_err());
    }
}

#[test]
fn request_observer_g18_marker_uncertainty() {
    let f = CoordinatorFixture::new(91_018);
    f.store.lock().unwrap().connection.execute_batch("CREATE TEMP TRIGGER reject_unknown BEFORE INSERT ON lnsat_phase7_state_events WHEN NEW.state='outcome_unknown' BEGIN SELECT RAISE(ABORT,'controlled failure'); END;").unwrap();
    rejected_capture(&f, |_| SyntheticObserverResultV1::Missing, 0);
    assert_eq!(f.readback().state, "dispatching");
    let f = CoordinatorFixture::new(92_018);
    let probe = Arc::clone(&f.store);
    let held = Mutex::new(None);
    let (outcome, c) = run_case(&f, |_| {
        *held.lock().unwrap() = Some(probe.lock().unwrap());
        SyntheticObserverResultV1::Missing
    });
    assert!(matches!(outcome, CoordinatorOutcomeV1::Unconfirmed));
    assert_counts(&c, 1, 1, 0);
    held.lock().unwrap().take();
    assert_eq!(f.readback().state, "dispatching");
    no_receipt(&f);
}

#[test]
fn request_observer_g19_durable_histories() {
    let f = CoordinatorFixture::new(91_019);
    complete(&f, 91_019);
    let store = f.store.lock().unwrap();
    assert_eq!(count(&store, "lnsat_operation_receipts"), 1);
    assert!(
        store
            .connection
            .execute(
                "INSERT INTO lnsat_operation_receipts SELECT * FROM lnsat_operation_receipts",
                []
            )
            .is_err()
    );
    assert_eq!(count(&store, "lnsat_operation_receipts"), 1);
    drop(store);
    let f = CoordinatorFixture::new(92_019);
    let probe = Arc::clone(&f.store);
    rejected_capture(
        &f,
        move |e| {
            assert!(
                corrupt_fixture_row(
                    &probe.try_lock().unwrap(),
                    "lnsat_phase7_state_events_reject_update",
                    "UPDATE lnsat_phase7_state_events SET state='failed' WHERE target_entity_kind='operation_attempt' AND state='dispatching'",
                    []
                ) > 0
            );
            capture(92_019, e)
        },
        0,
    );
}

#[test]
fn request_observer_g20_recording_time() {
    for (n, at) in [
        "bad-time",
        "2026-07-22T20:03:29.000Z",
        "2026-07-22T20:03:32+00:00",
    ]
    .into_iter()
    .enumerate()
    {
        let sequence = 91_200 + n as u64;
        let f = CoordinatorFixture::new(sequence);
        let reservation = f.reserve("time").unwrap();
        let before = snapshot(&f);
        let c = ObserverInvocationCountsV1::default();
        assert!(matches!(
            run_ports(
                &f,
                reservation,
                |_| Ok(()),
                |e| capture(sequence, e),
                at,
                (|| panic!("time rejection before hook"), || Ok(())),
                &c
            ),
            CoordinatorOutcomeV1::Unconfirmed
        ));
        assert_counts(&c, 1, 1, 1);
        assert_eq!(snapshot(&f), before);
        no_receipt(&f);
    }
}

#[test]
fn request_observer_g21_exact_replay() {
    let f = CoordinatorFixture::new(91_021);
    complete(&f, 91_021);
    let mut store = f.store.lock().unwrap();
    let before = ledger(&store);
    let proof = store
        .verify_request_git_result_for_test_v1(
            &f.request_id,
            &f.derived,
            &f.operation_id,
            &target(91_021),
            &result(91_021),
        )
        .unwrap();
    let replay = store
        .persist_request_git_result_with_sources_v1(
            proof,
            RECOVERED_AT,
            || panic!("replay cannot run precommit"),
            || panic!("replay cannot run aftercommit"),
        )
        .unwrap();
    assert_eq!(
        replay,
        store
            .read_phase8_operation_v1(&f.operation_id)
            .unwrap()
            .unwrap()
    );
    assert_eq!(ledger(&store), before);
}

#[test]
fn request_observer_g22_conflicting_replay() {
    let f = CoordinatorFixture::new(91_022);
    complete(&f, 91_022);
    let mut store = f.store.lock().unwrap();
    let before = ledger(&store);
    let mut changed = result(91_022);
    changed.commit_oid = oid(99_999);
    let proof = store
        .verify_request_git_result_for_test_v1(
            &f.request_id,
            &f.derived,
            &f.operation_id,
            &target(91_022),
            &changed,
        )
        .unwrap();
    assert!(
        store
            .persist_request_git_result_with_sources_v1(
                proof,
                RECOVERED_AT,
                || panic!("conflict cannot run precommit"),
                || panic!("conflict cannot run aftercommit")
            )
            .is_err()
    );
    assert_eq!(ledger(&store), before);
}

#[test]
#[allow(clippy::too_many_lines)] // Preserve complete rollback, lost acknowledgement and reconciliation oracles.
fn request_observer_g23_transaction_uncertainty() {
    let f = CoordinatorFixture::new(91_023);
    let reservation = f.reserve("rollback").unwrap();
    let before = snapshot(&f);
    let c = ObserverInvocationCountsV1::default();
    assert!(matches!(
        run_ports(
            &f,
            reservation,
            |_| Ok(()),
            |e| capture(91_023, e),
            RECORDED_AT,
            (
                || Err(Phase7GitAdapterErrorV1::PersistenceFailed),
                || panic!("rollback has no aftercommit")
            ),
            &c
        ),
        CoordinatorOutcomeV1::Unconfirmed
    ));
    assert_counts(&c, 1, 1, 1);
    assert_eq!(snapshot(&f), before);
    no_receipt(&f);
    let f = CoordinatorFixture::new(92_023);
    let c = ObserverInvocationCountsV1::default();
    assert!(matches!(
        run_ports(
            &f,
            f.reserve("lost-ack").unwrap(),
            |_| Ok(()),
            |e| capture(92_023, e),
            RECORDED_AT,
            (
                || Ok(()),
                || Err(Phase7GitAdapterErrorV1::PersistenceFailed)
            ),
            &c
        ),
        CoordinatorOutcomeV1::Unconfirmed
    ));
    assert_counts(&c, 1, 1, 1);
    assert_eq!(f.readback().state, "completed");
    let before = snapshot(&f);
    let c = ObserverInvocationCountsV1::default();
    assert!(matches!(
        recover(
            &f,
            &f.store,
            |_| panic!("completed cannot observe"),
            (|| panic!("no write"), || panic!("no write")),
            &c
        ),
        CoordinatorOutcomeV1::Completed(_)
    ));
    assert_counts(&c, 0, 0, 0);
    assert_eq!(snapshot(&f), before);
    assert!(f.reserve("lost-ack-no-retry").is_err());
    let f = CoordinatorFixture::new(93_023);
    unknown(&f);
    let before = snapshot(&f);
    let c = ObserverInvocationCountsV1::default();
    assert!(matches!(
        recover(
            &f,
            &f.store,
            |e| capture(93_023, e),
            (
                || Err(Phase7GitAdapterErrorV1::PersistenceFailed),
                || panic!("no partial commit")
            ),
            &c
        ),
        CoordinatorOutcomeV1::Unconfirmed
    ));
    assert_eq!(snapshot(&f), before);
    no_receipt(&f);
    let c = ObserverInvocationCountsV1::default();
    assert!(matches!(
        recover(
            &f,
            &f.store,
            |e| capture(93_023, e),
            (|| Ok(()), || Ok(())),
            &c
        ),
        CoordinatorOutcomeV1::Completed(_)
    ));
    let store = f.store.lock().unwrap();
    assert_eq!(count(&store, "lnsat_operation_receipts"), 1);
    assert_eq!(count(&store, "lnsat_operation_reconciliations"), 1);
}

#[test]
fn request_observer_g24_terminal_recovery() {
    for n in 0..2 {
        let sequence = 91_240 + n;
        let f = CoordinatorFixture::new(sequence);
        if n == 0 {
            complete(&f, sequence);
        } else {
            drop(f.reserve("terminal-failed").unwrap());
            f.store
                .lock()
                .unwrap()
                .fail_request_git_for_test_v1(&f.operation_id, RECORDED_AT)
                .unwrap();
        }
        let before = snapshot(&f);
        let c = ObserverInvocationCountsV1::default();
        let outcome = recover(
            &f,
            &f.store,
            |_| panic!("terminal cannot observe"),
            (
                || panic!("terminal cannot write"),
                || panic!("terminal cannot write"),
            ),
            &c,
        );
        if n == 0 {
            assert!(matches!(outcome, CoordinatorOutcomeV1::Completed(_)));
        } else {
            assert!(matches!(outcome, CoordinatorOutcomeV1::Rejected));
        }
        assert_counts(&c, 0, 0, 0);
        assert_eq!(snapshot(&f), before);
    }
}

#[test]
fn request_observer_g25_eligible_recovery() {
    let f = CoordinatorFixture::new(91_025);
    unknown(&f);
    let reopened = Arc::new(Mutex::new(SqliteStore::open(f.database_path()).unwrap()));
    let before = ledger(&reopened.lock().unwrap());
    for _ in 0..2 {
        let c = ObserverInvocationCountsV1::default();
        assert!(matches!(
            recover(
                &f,
                &reopened,
                |_| SyntheticObserverResultV1::Uncertain,
                (|| panic!("no proof"), || panic!("no proof")),
                &c
            ),
            CoordinatorOutcomeV1::Unconfirmed
        ));
        assert_counts(&c, 0, 1, 0);
        assert_eq!(ledger(&reopened.lock().unwrap()), before);
    }
    let c = ObserverInvocationCountsV1::default();
    assert!(matches!(
        recover(
            &f,
            &reopened,
            |e| capture(91_025, e),
            (|| Ok(()), || Ok(())),
            &c
        ),
        CoordinatorOutcomeV1::Completed(_)
    ));
    assert_counts(&c, 0, 1, 1);
    let store = reopened.lock().unwrap();
    assert_eq!(count(&store, "lnsat_capability_consumptions"), 1);
    assert_eq!(count(&store, "lnsat_operation_attempts"), 1);
    assert_eq!(count(&store, "lnsat_operation_receipts"), 1);
    assert_eq!(count(&store, "lnsat_operation_reconciliations"), 1);
}

#[test]
fn request_observer_g26_structural_closure() {
    use sha2::{Digest, Sha256};
    fn pin(bytes: &[u8], expected: &str) {
        use std::fmt::Write;
        let digest: [u8; 32] = Sha256::digest(bytes).into();
        let mut actual = String::with_capacity(64);
        for byte in digest {
            write!(&mut actual, "{byte:02x}").expect("digest hex must format into a String");
        }
        assert_eq!(actual, expected);
    }
    // Exact ancestor bodies, constructor, protocol, schema and product entry
    // identities supplement final whole-checkout owned-file validation.
    let parent = COORDINATOR_SOURCE.replace("#[cfg(test)]\nmod request_observer;\n", "");
    pin(
        parent.as_bytes(),
        "2aadf88aa468e83e9063745500f116d1c2ac97ec1e04ebe015622be082d43525",
    );
    pin(
        include_bytes!("../../../request_admission.rs"),
        "0ab4e795323d55cc6a2d6560e2941e50b59246f9d4a5a770e6634f93774317a4",
    );
    pin(
        include_bytes!("../../../../phase7_consumption.rs"),
        "f4e56b7ab734eb29b682ec6b990f9ad0439fea983193eb1381c0749e9a9e31f8",
    );
    pin(
        include_bytes!("../../../../lib.rs"),
        "d01269a0531b37726beb57e466798e38af5b89ebbe1e5731e4989f4709195380",
    );
    pin(
        include_bytes!("../../../../phase7_git_adapter/request_result.rs"),
        "2ac4fef3d1fb5a49fdda0d031538a4a8c5e580d98b02a673fa3c7a37acbd9f9e",
    );
    pin(
        include_bytes!("../../../../../migrations/0018_action_requests.sql"),
        "39880bdc94d15dd81241a55abf4cf1b5a5b357bd1125ed8945b0c947aa384412",
    );
    pin(
        include_bytes!("../../../../../../lnsatd/src/lib.rs"),
        "832673d40fd917138e236d9f21b9f987fbbd0369d5daf0e65b60db7705aa0e57",
    );
    assert!(COORDINATOR_SOURCE.contains("#[cfg(test)]\nmod request_observer;"));
    let source = include_str!("../request_observer.rs");
    for forbidden in [
        "pub fn",
        "pub(crate)",
        "pub use",
        "std::process",
        "inspect_phase7_git",
        "extern \"C\"",
    ] {
        assert!(
            !source.contains(forbidden),
            "unexpected production/native surface: {forbidden}"
        );
    }
    assert!(
        include_str!("../../../request_admission.rs")
            .contains("#[cfg(test)]\nmod request_coordinator;")
    );
}
