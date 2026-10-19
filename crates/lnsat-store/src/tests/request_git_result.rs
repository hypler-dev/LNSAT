//! Synthetic receipt tests for the closed request-bound Git-result adapter.
//!
//! These fixtures model only verifier-owned test observations. They never
//! create a repository, invoke Git, or claim a real consequence.

use super::*;
use crate::phase7_consumption::request_admission::RequestLaunchReservationV1;
use crate::phase7_git_adapter::request_result::{
    ADAPTER_REF, ADAPTER_VERSION, PROTOCOL, VerifiedRequestGitResultV1,
};
use crate::tests::request_execution_admission::AdmissionFixture;
use std::sync::{
    Arc, Barrier,
    atomic::{AtomicUsize, Ordering},
};
use std::thread;

const RESERVED_AT: &str = "2026-07-22T20:03:30.000Z";
const DISPATCHED_AT: &str = "2026-07-22T20:03:31.000Z";
const RESULT_AT: &str = "2026-07-22T20:03:32.000Z";
const LATER_RESULT_AT: &str = "2026-07-22T20:03:40.000Z";
const EXPIRED_RESULT_AT: &str = "2026-07-22T20:04:01.000Z";
const RECOVERED_AFTER_UNKNOWN_AT: &str = "9999-12-31T23:59:59.999Z";

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

fn git_fixture(sequence: u64) -> AdmissionFixture {
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
                "adapter": { "ref": ADAPTER_REF, "version": ADAPTER_VERSION },
                "executable_digest": digest('e'),
                "audience": "audience:gateway:local"
            }),
        );
    })
}

fn dispatch_success(
    fixture: &mut AdmissionFixture,
    reservation: RequestLaunchReservationV1,
    calls: &AtomicUsize,
) {
    let token = fixture.requester_token.clone();
    let csrf = fixture.requester_csrf.clone();
    let derived = fixture.derived.clone();
    fixture
        .store
        .dispatch_request_git_fake_with_sources_v1(
            reservation,
            &derived,
            (&token, &csrf),
            || Ok(DISPATCHED_AT.to_owned()),
            |_| {
                calls.fetch_add(1, Ordering::SeqCst);
                Ok(())
            },
        )
        .expect("trusted callback must succeed without persisting a result");
}

fn observe(
    fixture: &AdmissionFixture,
    sequence: u64,
) -> Result<VerifiedRequestGitResultV1, Phase7GitAdapterErrorV1> {
    fixture.store.verify_request_git_result_for_test_v1(
        &fixture.request_id,
        &fixture.derived,
        &fixture.operation_id,
        &target(sequence),
        &result(sequence),
    )
}

fn persist(
    fixture: &mut AdmissionFixture,
    proof: VerifiedRequestGitResultV1,
    at: &str,
) -> Result<Phase8OperationReadbackV1, Phase7GitAdapterErrorV1> {
    fixture
        .store
        .persist_request_git_result_with_sources_v1(proof, at, || Ok(()), || Ok(()))
}

fn count(store: &SqliteStore, table: &str) -> i64 {
    store
        .connection
        .query_row(&format!("SELECT count(*) FROM {table}"), [], |row| {
            row.get(0)
        })
        .expect("synthetic fixture table must count")
}

type LedgerRows = Vec<Vec<rusqlite::types::Value>>;

fn result_ledger(store: &SqliteStore) -> Vec<(String, LedgerRows)> {
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
            .expect("fixture ledger table reads");
        let columns = statement.column_count();
        let rows = statement
            .query_map([], |row| {
                (0..columns)
                    .map(|index| row.get::<_, rusqlite::types::Value>(index))
                    .collect::<Result<Vec<_>, _>>()
            })
            .expect("fixture ledger queries")
            .collect::<Result<Vec<_>, _>>()
            .expect("fixture ledger rows read");
        (table.to_owned(), rows)
    })
    .collect()
}

fn assert_unknown_without_receipt(fixture: &AdmissionFixture) {
    let operation = fixture
        .store
        .read_phase8_operation_v1(&fixture.operation_id)
        .expect("operation must read")
        .expect("operation must exist");
    assert_eq!(operation.state, "outcome_unknown");
    assert_eq!(count(&fixture.store, "lnsat_operation_receipts"), 0);
    assert_eq!(count(&fixture.store, "lnsat_operation_reconciliations"), 0);
}

#[test]
fn request_git_result_completes_once_and_duplicate_is_metadata_only() {
    let mut fixture = git_fixture(10_001);
    let calls = AtomicUsize::new(0);
    let reservation = fixture
        .reserve_git_at(RESERVED_AT)
        .expect("Git result must reserve");
    dispatch_success(&mut fixture, reservation, &calls);
    assert_eq!(calls.load(Ordering::SeqCst), 1);

    let dispatching = fixture
        .store
        .read_phase8_operation_v1(&fixture.operation_id)
        .expect("operation must read")
        .expect("operation must exist");
    assert_eq!(dispatching.state, "dispatching");
    assert_eq!(count(&fixture.store, "lnsat_operation_receipts"), 0);

    let audit_before = count(&fixture.store, "lnsat_phase7_audit_bindings");
    let proof = observe(&fixture, 10_001).expect("observation must verify");
    let completed = persist(&mut fixture, proof, RESULT_AT).expect("first receipt must persist");
    assert_eq!(completed.state, "completed");
    assert_eq!(count(&fixture.store, "lnsat_operation_receipts"), 1);
    assert_eq!(count(&fixture.store, "lnsat_operation_reconciliations"), 0);
    let audit_after_first = count(&fixture.store, "lnsat_phase7_audit_bindings");
    assert_eq!(
        audit_after_first,
        audit_before + 3,
        "receipt and two completion states must audit"
    );

    let ledger_before_duplicate = result_ledger(&fixture.store);
    let proof = observe(&fixture, 10_001).expect("fresh duplicate observation must verify");
    let replay = persist(&mut fixture, proof, LATER_RESULT_AT).expect("equal result must replay");
    assert_eq!(
        replay, completed,
        "duplicate returns the original complete readback"
    );
    assert_eq!(result_ledger(&fixture.store), ledger_before_duplicate);
    assert_eq!(count(&fixture.store, "lnsat_operation_receipts"), 1);
    assert_eq!(count(&fixture.store, "lnsat_operation_reconciliations"), 0);
    assert_eq!(
        count(&fixture.store, "lnsat_phase7_audit_bindings"),
        audit_after_first
    );
}

#[test]
fn request_git_result_reconciles_unknown_after_reopen_without_dispatch_retry() {
    let mut fixture = git_fixture(10_002);
    let reservation = fixture
        .reserve_git_at(RESERVED_AT)
        .expect("Git result must reserve");
    let token = fixture.requester_token.clone();
    let csrf = fixture.requester_csrf.clone();
    let derived = fixture.derived.clone();
    assert!(
        fixture
            .store
            .dispatch_request_git_fake_with_sources_v1(
                reservation,
                &derived,
                (&token, &csrf),
                || Ok(DISPATCHED_AT.to_owned()),
                |_| Err(()),
            )
            .is_err()
    );
    assert_unknown_without_receipt(&fixture);

    let path = fixture.database_path();
    let retry_capability = fixture.capability();
    let retry_project_ref = fixture.project_ref.clone();
    let retry_resource_ref = fixture.resource_ref.clone();
    let retry_authorization_id = fixture.authorization_id.clone();
    let retry_requester_token = fixture.requester_token.clone();
    let retry_requester_csrf = fixture.requester_csrf.clone();
    drop(fixture.store);
    let mut restarted = SqliteStore::open(&path).expect("reopen must preserve unknown result");
    let request_id = fixture.request_id.clone();
    let derived = fixture.derived.clone();
    let operation_id = fixture.operation_id.clone();
    let audit_before = count(&restarted, "lnsat_phase7_audit_bindings");
    let proof = restarted
        .verify_request_git_result_for_test_v1(
            &request_id,
            &derived,
            &operation_id,
            &target(10_002),
            &result(10_002),
        )
        .expect("fresh post-reopen observation must verify");
    // The synthetic time is deliberately after the SystemTime-driven unknown
    // transition. It is not a new admission or a consequence timestamp.
    let readback = restarted
        .persist_request_git_result_with_sources_v1(
            proof,
            RECOVERED_AFTER_UNKNOWN_AT,
            || Ok(()),
            || Ok(()),
        )
        .expect("unknown outcome must reconcile once");
    assert_eq!(readback.state, "completed");
    assert_eq!(count(&restarted, "lnsat_operation_receipts"), 1);
    assert_eq!(count(&restarted, "lnsat_operation_reconciliations"), 1);
    assert_eq!(
        count(&restarted, "lnsat_phase7_audit_bindings"),
        audit_before + 4
    );

    assert!(matches!(
        restarted.reserve_request_git_execution_with_sources_v1(
            &request_id,
            &derived,
            &Phase7CapabilityRedemptionInputV1 {
                project_ref: &retry_project_ref,
                resource_ref: &retry_resource_ref,
                authorization_id: &retry_authorization_id,
                operation_id: &operation_id,
                idempotency_key: "request-git-result:reopen-retry",
            },
            retry_capability,
            (&retry_requester_token, &retry_requester_csrf),
            (|| Ok(LATER_RESULT_AT.to_owned()), || Ok(()), || Ok(())),
        ),
        Err(Phase7PersistenceErrorV1::RedemptionRejected)
    ));
}

#[test]
#[allow(clippy::too_many_lines)] // Keep every drift case beside the shared zero-write oracle.
fn request_git_result_rejects_binding_and_result_drift_without_rows() {
    let mut fixture = git_fixture(10_003);
    let calls = AtomicUsize::new(0);
    let reservation = fixture
        .reserve_git_at(RESERVED_AT)
        .expect("Git result must reserve");
    dispatch_success(&mut fixture, reservation, &calls);
    let baseline_receipts = count(&fixture.store, "lnsat_operation_receipts");
    let baseline_audit = count(&fixture.store, "lnsat_phase7_audit_bindings");

    let wrong_root = format!("arq_{}", "0".repeat(64));
    assert!(
        fixture
            .store
            .verify_request_git_result_for_test_v1(
                &wrong_root,
                &fixture.derived,
                &fixture.operation_id,
                &target(10_003),
                &result(10_003),
            )
            .is_err()
    );
    let wrong_operation = format!("opn_{}", "1".repeat(64));
    assert!(
        fixture
            .store
            .verify_request_git_result_for_test_v1(
                &fixture.request_id,
                &fixture.derived,
                &wrong_operation,
                &target(10_003),
                &result(10_003),
            )
            .is_err()
    );
    let mut wrong_derived = fixture.derived.clone();
    wrong_derived.request_digest = [0; 32];
    assert!(
        fixture
            .store
            .verify_request_git_result_for_test_v1(
                &fixture.request_id,
                &wrong_derived,
                &fixture.operation_id,
                &target(10_003),
                &result(10_003),
            )
            .is_err()
    );
    let mut wrong_target = target(10_003);
    wrong_target.head_ref = "refs/heads/other".to_owned();
    assert!(
        fixture
            .store
            .verify_request_git_result_for_test_v1(
                &fixture.request_id,
                &fixture.derived,
                &fixture.operation_id,
                &wrong_target,
                &result(10_003),
            )
            .is_err()
    );
    for observed in [
        Phase7GitExecutionResultV1 {
            tree_oid: oid(9),
            ..result(10_003)
        },
        Phase7GitExecutionResultV1 {
            changed_paths: vec!["other.txt".to_owned()],
            ..result(10_003)
        },
        Phase7GitExecutionResultV1 {
            patch_sha256: digest('a'),
            ..result(10_003)
        },
        Phase7GitExecutionResultV1 {
            metadata: Phase7GitCommitMetadataV1 {
                message: "different\n".to_owned(),
                ..metadata()
            },
            ..result(10_003)
        },
    ] {
        assert!(
            fixture
                .store
                .verify_request_git_result_for_test_v1(
                    &fixture.request_id,
                    &fixture.derived,
                    &fixture.operation_id,
                    &target(10_003),
                    &observed,
                )
                .is_err()
        );
    }
    assert_eq!(calls.load(Ordering::SeqCst), 1);
    assert_eq!(
        count(&fixture.store, "lnsat_operation_receipts"),
        baseline_receipts
    );
    assert_eq!(
        count(&fixture.store, "lnsat_phase7_audit_bindings"),
        baseline_audit
    );
}

#[test]
fn request_git_result_rejects_old_source_protocol_and_conflicting_commit() {
    let mut old = AdmissionFixture::new(10_004);
    let reservation = old
        .reserve_at(RESERVED_AT)
        .expect("old source fixture must reserve");
    let token = old.requester_token.clone();
    let csrf = old.requester_csrf.clone();
    let derived = old.derived.clone();
    old.store
        .dispatch_request_fake_with_sources_v1(
            reservation,
            &derived,
            (&token, &csrf),
            || Ok(DISPATCHED_AT.to_owned()),
            |_| Ok(()),
        )
        .expect("old callback must dispatch");
    assert!(
        old.store
            .verify_request_git_result_for_test_v1(
                &old.request_id,
                &old.derived,
                &old.operation_id,
                &target(10_004),
                &result(10_004),
            )
            .is_err()
    );

    let mut fixture = git_fixture(10_005);
    let calls = AtomicUsize::new(0);
    let reservation = fixture
        .reserve_git_at(RESERVED_AT)
        .expect("Git result must reserve");
    dispatch_success(&mut fixture, reservation, &calls);
    let proof = observe(&fixture, 10_005).expect("first observation must verify");
    persist(&mut fixture, proof, RESULT_AT).expect("first receipt must persist");
    let ledger_before_conflict = result_ledger(&fixture.store);
    let mut conflict = result(10_005);
    conflict.commit_oid = oid(99_999);
    let proof = fixture
        .store
        .verify_request_git_result_for_test_v1(
            &fixture.request_id,
            &fixture.derived,
            &fixture.operation_id,
            &target(10_005),
            &conflict,
        )
        .expect("different commit can be checked against the same approved target");
    assert!(persist(&mut fixture, proof, LATER_RESULT_AT).is_err());
    assert_eq!(result_ledger(&fixture.store), ledger_before_conflict);
    assert_eq!(count(&fixture.store, "lnsat_operation_receipts"), 1);
    assert_eq!(count(&fixture.store, "lnsat_operation_reconciliations"), 0);
}

#[test]
#[allow(clippy::too_many_lines)] // Keep fault injection beside complete rollback and lost-ack ledgers.
fn request_git_result_callback_failure_panic_and_persist_hooks_never_create_second_use() {
    for (sequence, panic) in [(10_006, false), (10_007, true)] {
        let mut fixture = git_fixture(sequence);
        let reservation = fixture
            .reserve_git_at(RESERVED_AT)
            .expect("Git result must reserve");
        let token = fixture.requester_token.clone();
        let csrf = fixture.requester_csrf.clone();
        let derived = fixture.derived.clone();
        let outcome = fixture.store.dispatch_request_git_fake_with_sources_v1(
            reservation,
            &derived,
            (&token, &csrf),
            || Ok(DISPATCHED_AT.to_owned()),
            |_| {
                assert!(!panic, "synthetic callback panic");
                Err(())
            },
        );
        assert!(outcome.is_err());
        assert_unknown_without_receipt(&fixture);
        assert!(fixture.reserve_git_at(LATER_RESULT_AT).is_err());
    }

    let mut rollback = git_fixture(10_008);
    let calls = AtomicUsize::new(0);
    let reservation = rollback
        .reserve_git_at(RESERVED_AT)
        .expect("Git result must reserve");
    dispatch_success(&mut rollback, reservation, &calls);
    let ledger_before_rollback = result_ledger(&rollback.store);
    let proof = observe(&rollback, 10_008).expect("observation must verify");
    assert!(
        rollback
            .store
            .persist_request_git_result_with_sources_v1(
                proof,
                RESULT_AT,
                || Err(Phase7GitAdapterErrorV1::PersistenceFailed),
                || Ok(()),
            )
            .is_err()
    );
    assert_eq!(result_ledger(&rollback.store), ledger_before_rollback);
    assert_eq!(count(&rollback.store, "lnsat_operation_receipts"), 0);
    assert!(rollback.reserve_git_at(LATER_RESULT_AT).is_err());

    let mut acknowledgement_loss = git_fixture(10_009);
    let reservation = acknowledgement_loss
        .reserve_git_at(RESERVED_AT)
        .expect("Git result must reserve");
    dispatch_success(&mut acknowledgement_loss, reservation, &calls);
    let ack_audit_before = count(&acknowledgement_loss.store, "lnsat_phase7_audit_bindings");
    let ack_states_before = count(&acknowledgement_loss.store, "lnsat_phase7_state_events");
    let proof = observe(&acknowledgement_loss, 10_009).expect("observation must verify");
    assert!(
        acknowledgement_loss
            .store
            .persist_request_git_result_with_sources_v1(
                proof,
                RESULT_AT,
                || Ok(()),
                || Err(Phase7GitAdapterErrorV1::PersistenceFailed),
            )
            .is_err()
    );
    assert_eq!(
        count(&acknowledgement_loss.store, "lnsat_operation_receipts"),
        1
    );
    assert!(
        acknowledgement_loss
            .reserve_git_at(LATER_RESULT_AT)
            .is_err()
    );
    let completed = acknowledgement_loss
        .store
        .read_phase8_operation_v1(&acknowledgement_loss.operation_id)
        .expect("lost-ack operation reads")
        .expect("lost-ack operation exists");
    assert_eq!(completed.state, "completed");
    assert_eq!(
        count(&acknowledgement_loss.store, "lnsat_phase7_audit_bindings"),
        ack_audit_before + 3
    );
    assert_eq!(
        count(&acknowledgement_loss.store, "lnsat_phase7_state_events"),
        ack_states_before + 2
    );
    assert_eq!(
        count(
            &acknowledgement_loss.store,
            "lnsat_operation_reconciliations"
        ),
        0
    );
    let ledger_after_ack_loss = result_ledger(&acknowledgement_loss.store);
    let proof =
        observe(&acknowledgement_loss, 10_009).expect("lost-ack result can be observed again");
    let replay = persist(&mut acknowledgement_loss, proof, LATER_RESULT_AT)
        .expect("same lost-ack result replays");
    assert_eq!(replay, completed);
    assert_eq!(
        result_ledger(&acknowledgement_loss.store),
        ledger_after_ack_loss
    );
    assert_eq!(
        calls.load(Ordering::SeqCst),
        2,
        "one callback per fixture, no retry"
    );
}

#[test]
fn request_git_result_concurrent_equal_observations_and_expired_receipt_are_safe() {
    let mut fixture = git_fixture(10_010);
    let calls = AtomicUsize::new(0);
    let reservation = fixture
        .reserve_git_at(RESERVED_AT)
        .expect("Git result must reserve");
    dispatch_success(&mut fixture, reservation, &calls);
    let path = fixture.database_path();
    let request_id = fixture.request_id.clone();
    let derived = fixture.derived.clone();
    let operation_id = fixture.operation_id.clone();
    let barrier = Arc::new(Barrier::new(2));
    // Open both handles before the barrier, then mint one observation per
    // actual handle. No startup materialization is called in this direct
    // completion path; result persistence has no fresh authorization gate.
    let left_store = SqliteStore::open(&path).expect("left parallel store must open");
    let right_store = SqliteStore::open(&path).expect("right parallel store must open");
    let persist_from = |mut store: SqliteStore, barrier: Arc<Barrier>| {
        let request_id = request_id.clone();
        let derived = derived.clone();
        let operation_id = operation_id.clone();
        thread::spawn(move || {
            let proof = store
                .verify_request_git_result_for_test_v1(
                    &request_id,
                    &derived,
                    &operation_id,
                    &target(10_010),
                    &result(10_010),
                )
                .expect("parallel observation must verify");
            barrier.wait();
            store.persist_request_git_result_with_sources_v1(
                proof,
                EXPIRED_RESULT_AT,
                || Ok(()),
                || Ok(()),
            )
        })
    };
    let left = persist_from(left_store, Arc::clone(&barrier));
    let right = persist_from(right_store, barrier);
    assert!(left.join().expect("left writer must join").is_ok());
    assert!(right.join().expect("right writer must join").is_ok());
    assert_eq!(count(&fixture.store, "lnsat_operation_receipts"), 1);
    assert_eq!(count(&fixture.store, "lnsat_operation_reconciliations"), 0);
    let operation = fixture
        .store
        .read_phase8_operation_v1(&operation_id)
        .expect("operation must read")
        .expect("operation must exist");
    assert_eq!(operation.state, "completed");
    assert_eq!(calls.load(Ordering::SeqCst), 1);
}

#[test]
fn request_git_result_concurrent_conflict_keeps_one_immutable_receipt() {
    let mut fixture = git_fixture(10_012);
    let calls = AtomicUsize::new(0);
    let reservation = fixture
        .reserve_git_at(RESERVED_AT)
        .expect("Git result must reserve");
    dispatch_success(&mut fixture, reservation, &calls);
    let path = fixture.database_path();
    let request_id = fixture.request_id.clone();
    let derived = fixture.derived.clone();
    let operation_id = fixture.operation_id.clone();
    let barrier = Arc::new(Barrier::new(2));
    let left_store = SqliteStore::open(&path).expect("left parallel store must open");
    let right_store = SqliteStore::open(&path).expect("right parallel store must open");
    let persist_from = |mut store: SqliteStore, commit_sequence: u64, barrier: Arc<Barrier>| {
        let request_id = request_id.clone();
        let derived = derived.clone();
        let operation_id = operation_id.clone();
        thread::spawn(move || {
            let mut observed = result(10_012);
            observed.commit_oid = oid(commit_sequence);
            let proof = store
                .verify_request_git_result_for_test_v1(
                    &request_id,
                    &derived,
                    &operation_id,
                    &target(10_012),
                    &observed,
                )
                .expect("parallel observation must verify");
            barrier.wait();
            store.persist_request_git_result_with_sources_v1(
                proof,
                EXPIRED_RESULT_AT,
                || Ok(()),
                || Ok(()),
            )
        })
    };
    let left = persist_from(left_store, 90_001, Arc::clone(&barrier));
    let right = persist_from(right_store, 90_002, barrier);
    let results = [
        left.join().expect("left writer must join"),
        right.join().expect("right writer must join"),
    ];
    assert_eq!(results.iter().filter(|result| result.is_ok()).count(), 1);
    assert_eq!(results.iter().filter(|result| result.is_err()).count(), 1);
    assert_eq!(count(&fixture.store, "lnsat_operation_receipts"), 1);
    assert_eq!(count(&fixture.store, "lnsat_operation_reconciliations"), 0);
    assert_eq!(calls.load(Ordering::SeqCst), 1);
}

#[test]
fn request_git_result_stale_or_foreign_proof_and_corrupt_reopen_fail_closed() {
    let mut fixture = git_fixture(10_011);
    let calls = AtomicUsize::new(0);
    let reservation = fixture
        .reserve_git_at(RESERVED_AT)
        .expect("Git result must reserve");
    dispatch_success(&mut fixture, reservation, &calls);
    let stale = observe(&fixture, 10_011).expect("origin observation must verify");
    let path = fixture.database_path();
    drop(fixture.store);
    let mut reopened = SqliteStore::open(&path).expect("reopen must work before tamper");
    assert!(
        reopened
            .persist_request_git_result_with_sources_v1(
                stale,
                LATER_RESULT_AT,
                || Ok(()),
                || Ok(())
            )
            .is_err()
    );
    let minted = reopened
        .verify_request_git_result_for_test_v1(
            &fixture.request_id,
            &fixture.derived,
            &fixture.operation_id,
            &target(10_011),
            &result(10_011),
        )
        .expect("reopened store must mint a new test-only observation");
    reopened
        .persist_request_git_result_with_sources_v1(minted, LATER_RESULT_AT, || Ok(()), || Ok(()))
        .expect("new reopened observation must persist");

    let corrupt_path = path;
    drop(reopened);
    let corrupt = SqliteStore::open(&corrupt_path).expect("corruption setup store must open");
    let trigger: String = corrupt
        .connection
        .query_row(
            "SELECT sql FROM sqlite_schema WHERE name='lnsat_operation_attempts_reject_update'",
            [],
            |row| row.get(0),
        )
        .expect("fixture immutable trigger must exist");
    corrupt
        .connection
        .execute_batch("DROP TRIGGER lnsat_operation_attempts_reject_update")
        .expect("fixture corruption may remove the immutable trigger");
    corrupt.connection.execute(
        "UPDATE lnsat_operation_attempts SET protocol_version='lnsat.request-execution-admission.source.v1'",
        [],
    ).expect("synthetic durable corruption must write");
    corrupt
        .connection
        .execute_batch(&trigger)
        .expect("fixture corruption must restore the immutable trigger");
    drop(corrupt);
    assert!(
        SqliteStore::open(&corrupt_path).is_err(),
        "reopen must reject protocol corruption"
    );
    assert_eq!(PROTOCOL, "lnsat.request-bound-git.protocol.v1");
}

#[test]
fn request_git_result_new_mode_rejects_expiry_wrong_mode_and_alternate_approval() {
    let mut expired = git_fixture(10_013);
    assert!(expired.reserve_git_at(EXPIRED_RESULT_AT).is_err());
    assert_eq!(count(&expired.store, "lnsat_operation_attempts"), 0);
    assert_eq!(count(&expired.store, "lnsat_capability_consumptions"), 0);

    let mut fixture = git_fixture(10_014);
    assert!(
        fixture.reserve_at(RESERVED_AT).is_err(),
        "old admission mode must reject the new adapter"
    );
    assert_eq!(count(&fixture.store, "lnsat_operation_attempts"), 0);
    assert_eq!(count(&fixture.store, "lnsat_capability_consumptions"), 0);
    let reservation = fixture
        .reserve_git_at(RESERVED_AT)
        .expect("new mode must reserve");
    drop(reservation);
    assert!(matches!(
        fixture.reserve_second_approval_authorization(),
        Err(Phase7PersistenceErrorV1::RedemptionRejected)
    ));
    assert_eq!(count(&fixture.store, "lnsat_operation_attempts"), 1);
    assert_eq!(count(&fixture.store, "lnsat_capability_consumptions"), 1);
    assert_eq!(count(&fixture.store, "lnsat_operation_receipts"), 0);
}

#[test]
fn request_git_result_missing_root_rejects_observation_and_reopen() {
    let mut fixture = git_fixture(10_015);
    drop(
        fixture
            .reserve_git_at(RESERVED_AT)
            .expect("new mode must reserve"),
    );
    let trigger: String = fixture.store.connection.query_row(
        "SELECT sql FROM sqlite_schema WHERE name='lnsat_action_request_evaluations_reject_delete'",
        [], |row| row.get(0),
    ).expect("immutable trigger must exist");
    fixture
        .store
        .connection
        .execute_batch("DROP TRIGGER lnsat_action_request_evaluations_reject_delete;")
        .expect("fixture may remove delete guard");
    assert_eq!(
        fixture
            .store
            .connection
            .execute(
                "DELETE FROM lnsat_action_request_evaluations WHERE request_id=?1",
                [&fixture.request_id],
            )
            .expect("fixture may detach root policy"),
        1
    );
    fixture
        .store
        .connection
        .execute_batch(&trigger)
        .expect("exact schema trigger restored");
    assert!(observe(&fixture, 10_015).is_err());
    assert_eq!(count(&fixture.store, "lnsat_operation_receipts"), 0);
    let path = fixture.database_path();
    drop(fixture.store);
    assert!(SqliteStore::open(&path).is_err());
}

#[test]
fn request_git_result_startup_materializes_unknown_then_reconciles_without_callback() {
    let mut fixture = git_fixture(10_016);
    drop(
        fixture
            .reserve_git_at(RESERVED_AT)
            .expect("new mode must reserve"),
    );
    let path = fixture.database_path();
    drop(fixture.store);
    let mut restarted = SqliteStore::open(&path).expect("fixture must reopen");
    assert_eq!(
        restarted
            .materialize_phase8_interrupted_dispatches_v1()
            .expect("startup must mark ambiguity"),
        1
    );
    assert_eq!(
        restarted
            .materialize_phase8_interrupted_dispatches_v1()
            .expect("startup repeat must be inert"),
        0
    );
    let unknown = restarted
        .read_phase8_operation_v1(&fixture.operation_id)
        .expect("unknown reads")
        .expect("operation exists");
    assert_eq!(unknown.state, "outcome_unknown");
    assert_eq!(count(&restarted, "lnsat_operation_receipts"), 0);
    let proof = restarted
        .verify_request_git_result_for_test_v1(
            &fixture.request_id,
            &fixture.derived,
            &fixture.operation_id,
            &target(10_016),
            &result(10_016),
        )
        .expect("independent synthetic observation must verify after restart");
    let completed = restarted
        .persist_request_git_result_with_sources_v1(
            proof,
            RECOVERED_AFTER_UNKNOWN_AT,
            || Ok(()),
            || Ok(()),
        )
        .expect("startup unknown must reconcile");
    assert_eq!(completed.state, "completed");
    assert_eq!(count(&restarted, "lnsat_operation_attempts"), 1);
    assert_eq!(count(&restarted, "lnsat_operation_receipts"), 1);
    assert_eq!(count(&restarted, "lnsat_operation_reconciliations"), 1);
    drop(restarted);
    let reopened = SqliteStore::open(&path).expect("complete result history must reopen");
    assert_eq!(
        reopened
            .read_phase8_operation_v1(&fixture.operation_id)
            .expect("completed reads")
            .expect("operation exists")
            .state,
        "completed"
    );
}

#[test]
fn request_git_result_valid_failed_history_rejects_observation_and_existing_proof() {
    let mut fixture = git_fixture(10_017);
    drop(
        fixture
            .reserve_git_at(RESERVED_AT)
            .expect("new mode must reserve"),
    );
    let proof = observe(&fixture, 10_017).expect("proof can exist before terminal failure");
    fixture
        .store
        .fail_request_git_for_test_v1(&fixture.operation_id, RESULT_AT)
        .expect("fixture must have complete valid failed history");
    let failed = fixture
        .store
        .read_phase8_operation_v1(&fixture.operation_id)
        .expect("valid failed history reads")
        .expect("operation exists");
    assert_eq!(failed.state, "failed");
    let before = result_ledger(&fixture.store);
    assert!(observe(&fixture, 10_017).is_err());
    assert!(persist(&mut fixture, proof, LATER_RESULT_AT).is_err());
    assert_eq!(result_ledger(&fixture.store), before);
    assert_eq!(count(&fixture.store, "lnsat_operation_receipts"), 0);
    assert_eq!(count(&fixture.store, "lnsat_operation_reconciliations"), 0);
    let path = fixture.database_path();
    drop(fixture.store);
    let reopened = SqliteStore::open(&path).expect("valid failed history must reopen");
    assert_eq!(
        reopened
            .read_phase8_operation_v1(&fixture.operation_id)
            .expect("failed readback works")
            .expect("operation exists"),
        failed
    );
}

#[test]
fn request_git_result_denied_and_revoked_admission_preserves_zero_attempts() {
    let mut denied = git_fixture(10_018);
    denied.request_id = denied.append_denied_root(10_118);
    let denied_decision: (String, String) = denied.store.connection.query_row(
        "SELECT evaluation.status, policy.decision FROM lnsat_action_request_evaluations AS evaluation
         JOIN lnsat_policy_decisions AS policy ON policy.decision_id=evaluation.policy_decision_id
         WHERE evaluation.request_id=?1", [&denied.request_id], |row| Ok((row.get(0)?, row.get(1)?)),
    ).expect("denied root must have a durable evaluated policy");
    assert_eq!(denied_decision, ("recorded".to_owned(), "deny".to_owned()));
    assert!(matches!(
        denied.reserve_git_at(RESERVED_AT),
        Err(Phase7PersistenceErrorV1::SourceNotApproved)
    ));

    let mut revoked = git_fixture(10_019);
    revoked
        .store
        .transition_phase7_local_execution_authorization_with_sources_v1(
            &Phase7ExecutionAuthorizationTransitionInputV1 {
                project_ref: &revoked.project_ref,
                resource_ref: &revoked.resource_ref,
                authorization_id: &revoked.authorization_id,
            },
            &revoked.approver_token,
            &revoked.approver_csrf,
            "revoked",
            || Ok("2026-07-22T20:03:10.000Z".to_owned()),
            || Ok(()),
        )
        .expect("authorization revocation persists");
    assert!(matches!(
        revoked.reserve_git_at(RESERVED_AT),
        Err(Phase7PersistenceErrorV1::RedemptionRejected)
    ));

    let mut session = git_fixture(10_020);
    assert!(
        session
            .store
            .revoke_local_session_v1(
                &session.requester_token,
                &session.requester_csrf,
                "2026-07-22T20:03:10.000Z",
                LocalSessionRevocationReasonV1::SignOut,
            )
            .expect("requester session revokes")
    );
    assert!(matches!(
        session.reserve_git_at(RESERVED_AT),
        Err(Phase7PersistenceErrorV1::RedemptionRejected)
    ));
    for fixture in [&denied, &revoked, &session] {
        assert_eq!(count(&fixture.store, "lnsat_capability_consumptions"), 0);
        assert_eq!(count(&fixture.store, "lnsat_operation_attempts"), 0);
        assert_eq!(count(&fixture.store, "lnsat_operation_receipts"), 0);
    }
}
