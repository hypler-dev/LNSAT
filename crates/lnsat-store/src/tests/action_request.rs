use super::*;
use crate::action_request::{ActionRequestErrorV1, ActionRequestRecordV1};
use serde_json::json;

const AT: &str = "2026-07-22T20:00:30Z";
const READ_AT: &str = "2026-07-22T20:01:00Z";
const PASSWORD: &str = "bounded action request fixture password";

struct Fixture {
    database: TestDatabase,
    store: SqliteStore,
    owner: LocalSessionIssueResultV1,
    packet: PacketEnvelopeV1,
}
impl Fixture {
    fn new() -> Self {
        let database = TestDatabase::new("action-request");
        let mut store = SqliteStore::open(&database.path).expect("fixture store");
        store
            .bootstrap_local_owner_v1(&LocalOwnerBootstrapInputV1 {
                created_at: "2026-07-22T19:00:00Z",
                ..owner_bootstrap_input(PASSWORD)
            })
            .expect("owner");
        let owner = store
            .issue_local_owner_session_v1(&local_session_input(
                "identity:human:owner",
                PASSWORD,
                "2026-07-22T19:55:00Z",
                "2026-07-22T20:55:00Z",
            ))
            .expect("session");
        let mut packet = packet_fixture();
        packet.actor_ref = owner.session.identity_ref.clone();
        packet.session_ref = format!("session:local:{}", owner.session.session_id);
        packet.permission_allow = vec!["deploy.request".to_owned()];
        packet.requires_approval = true;
        packet.expires_at = "2026-07-22T20:20:00Z".to_owned();
        add_execution_proposal(&mut packet);
        Self {
            database,
            store,
            owner,
            packet,
        }
    }
    fn submit(&mut self) -> crate::action_request::ActionRequestSubmissionV1 {
        self.store
            .append_authenticated_action_request_v1(
                &self.packet,
                &self.owner.raw_session_token,
                &self.owner.raw_csrf_token,
                AT,
            )
            .expect("submission")
    }
    fn read(&mut self, id: &str) -> ActionRequestRecordV1 {
        self.store
            .read_authenticated_action_request_v1(
                id,
                &self.owner.raw_session_token,
                &self.owner.raw_csrf_token,
                READ_AT,
            )
            .expect("read")
            .expect("record")
    }
    fn count(&self, table: &str) -> i64 {
        self.store
            .connection
            .query_row(&format!("SELECT count(*) FROM {table}"), [], |r| r.get(0))
            .expect("count")
    }
    fn identity(&mut self, name: &str, role: LocalIdentityRoleV1) -> LocalSessionIssueResultV1 {
        let reference = format!("identity:human:{name}");
        self.store
            .create_local_identity_v1(
                &local_identity_create_input(
                    &reference,
                    name,
                    role,
                    PASSWORD,
                    "2026-07-22T20:00:00Z",
                ),
                &self.owner.raw_session_token,
                &self.owner.raw_csrf_token,
                "2026-07-22T20:00:00Z",
            )
            .expect("identity");
        self.store
            .issue_local_session_v1(&local_session_input(
                &reference,
                PASSWORD,
                "2026-07-22T20:00:00Z",
                "2026-07-22T21:00:00Z",
            ))
            .expect("role session")
    }
}

#[test]
fn action_request_root_policy_reopen_and_exact_replay() {
    let mut f = Fixture::new();
    let first = f.submit();
    assert_eq!(first.disposition, "created");
    assert_eq!(first.evaluation_state, "policy_recorded");
    let first_read = f.read(&first.request_id);
    assert_eq!(first_read.status, "complete");
    assert_eq!(first_read.evaluation.as_ref().unwrap().status, "recorded");
    drop(f.store);
    f.store = SqliteStore::open(&f.database.path).expect("reopen");
    let replay = f
        .store
        .append_authenticated_action_request_v1(
            &f.packet,
            &f.owner.raw_session_token,
            &f.owner.raw_csrf_token,
            READ_AT,
        )
        .expect("retry");
    assert_eq!(replay.request_id, first.request_id);
    assert_eq!(replay.disposition, "replay");
    assert_eq!(f.count("lnsat_action_requests"), 1);
    assert_eq!(f.count("lnsat_policy_decisions"), 1);
    let record = f.read(&first.request_id);
    assert_eq!(record.observations.len(), 1);
    assert_eq!(record.request, first_read.request);
}

#[test]
fn action_request_changed_content_keeps_original_and_first_observations() {
    let mut f = Fixture::new();
    let first = f.submit();
    for n in 0..4 {
        let mut changed = f.packet.clone();
        changed.intent = format!("changed submission {n}");
        let result = f
            .store
            .append_authenticated_action_request_v1(
                &changed,
                &f.owner.raw_session_token,
                &f.owner.raw_csrf_token,
                READ_AT,
            )
            .expect("conflict evidence");
        assert_eq!(result.disposition, "conflict");
        assert_eq!(result.request_id, first.request_id);
    }
    for _ in 0..4 {
        f.store
            .append_authenticated_action_request_v1(
                &f.packet,
                &f.owner.raw_session_token,
                &f.owner.raw_csrf_token,
                READ_AT,
            )
            .expect("replay");
    }
    let record = f.read(&first.request_id);
    assert_eq!(record.observations.len(), 2);
    assert_eq!(f.count("lnsat_policy_decisions"), 1);
    assert_eq!(
        record.request.unwrap().packet_sha256,
        hash_packet_envelope_v1(&f.packet).unwrap()
    );
}

#[test]
fn action_request_expired_valid_intake_preserves_failed_root() {
    let mut f = Fixture::new();
    f.packet.expires_at = "2026-07-22T20:00:15Z".to_owned();
    let first = f.submit();
    assert_eq!(first.evaluation_state, "evaluation_failed");
    assert_eq!(f.count("lnsat_packet_envelopes"), 0);
    assert_eq!(f.count("lnsat_policy_decisions"), 0);
    let record = f.read(&first.request_id);
    assert_eq!(record.status, "complete");
    assert_eq!(
        record.evaluation.unwrap().reason_code,
        "evaluation_rejected"
    );
    let replay = f
        .store
        .append_authenticated_action_request_v1(
            &f.packet,
            &f.owner.raw_session_token,
            &f.owner.raw_csrf_token,
            READ_AT,
        )
        .unwrap();
    assert_eq!(replay.evaluation_state, "evaluation_failed");
}

#[test]
fn action_request_policy_rollback_does_not_rollback_root_or_retry() {
    let mut f = Fixture::new();
    f.store.connection.execute_batch("CREATE TEMP TRIGGER reject_request_policy BEFORE INSERT ON lnsat_policy_decisions BEGIN SELECT RAISE(ABORT,'private fixture failure'); END;").unwrap();
    let first = f.submit();
    assert_eq!(first.evaluation_state, "evaluation_failed");
    assert_eq!(f.count("lnsat_packet_envelopes"), 0);
    f.store
        .connection
        .execute_batch("DROP TRIGGER reject_request_policy;")
        .unwrap();
    let replay = f
        .store
        .append_authenticated_action_request_v1(
            &f.packet,
            &f.owner.raw_session_token,
            &f.owner.raw_csrf_token,
            READ_AT,
        )
        .unwrap();
    assert_eq!(replay.evaluation_state, "evaluation_failed");
    assert_eq!(f.count("lnsat_policy_decisions"), 0);
}

#[test]
fn action_request_interrupted_after_root_stays_unknown_after_reopen() {
    let mut f = Fixture::new();
    let (root, kind) = f
        .store
        .admit_action_request_v1(
            &f.packet,
            &f.owner.raw_session_token,
            &f.owner.raw_csrf_token,
            AT,
        )
        .unwrap();
    assert_eq!(kind, "created");
    drop(f.store);
    f.store = SqliteStore::open(&f.database.path).unwrap();
    let replay = f
        .store
        .append_authenticated_action_request_v1(
            &f.packet,
            &f.owner.raw_session_token,
            &f.owner.raw_csrf_token,
            READ_AT,
        )
        .unwrap();
    assert_eq!(replay.evaluation_state, "evaluation_unknown");
    assert_eq!(f.count("lnsat_policy_decisions"), 0);
    assert_eq!(
        f.read(&root.request_id).evaluation_state,
        "evaluation_unknown"
    );
}

#[test]
fn action_request_legacy_packet_is_not_adopted() {
    let mut f = Fixture::new();
    f.store
        .append_authenticated_packet_intake_v1(
            &f.packet,
            &f.owner.raw_session_token,
            &f.owner.raw_csrf_token,
            AT,
        )
        .unwrap();
    let first = f.submit();
    assert_eq!(first.evaluation_state, "evaluation_failed");
    assert_eq!(f.count("lnsat_policy_decisions"), 1);
    assert!(f.read(&first.request_id).evidence.is_none());
}

#[test]
fn action_request_rejects_auth_actor_session_and_invalid_proposal_before_root() {
    let mut f = Fixture::new();
    for which in 0..5 {
        let mut p = f.packet.clone();
        if which == 0 {
            p.actor_ref = "identity:human:other".to_owned();
        }
        if which == 1 {
            p.session_ref = "session:local:other".to_owned();
        }
        if which == 2 {
            p.constraints.remove("execution_proposal");
        }
        let token = if which == 3 {
            "not-a-session"
        } else {
            &f.owner.raw_session_token
        };
        let csrf = if which == 4 {
            "wrong-csrf"
        } else {
            &f.owner.raw_csrf_token
        };
        assert!(
            f.store
                .append_authenticated_action_request_v1(&p, token, csrf, AT)
                .is_err()
        );
    }
    assert_eq!(f.count("lnsat_action_requests"), 0);
}

#[test]
fn action_request_owner_requester_read_gate_and_auditor_no_intake() {
    let mut f = Fixture::new();
    let operator = f.identity("operator", LocalIdentityRoleV1::Operator);
    let other = f.identity("other", LocalIdentityRoleV1::Operator);
    let auditor = f.identity("auditor", LocalIdentityRoleV1::Auditor);
    let mut p = f.packet.clone();
    p.actor_ref = operator.session.identity_ref.clone();
    p.session_ref = format!("session:local:{}", operator.session.session_id);
    let result = f
        .store
        .append_authenticated_action_request_v1(
            &p,
            &operator.raw_session_token,
            &operator.raw_csrf_token,
            AT,
        )
        .unwrap();
    assert!(
        f.store
            .read_authenticated_action_request_v1(
                &result.request_id,
                &operator.raw_session_token,
                &operator.raw_csrf_token,
                READ_AT
            )
            .unwrap()
            .is_some()
    );
    assert!(
        f.store
            .read_authenticated_action_request_v1(
                &result.request_id,
                &f.owner.raw_session_token,
                &f.owner.raw_csrf_token,
                READ_AT
            )
            .unwrap()
            .is_some()
    );
    for session in [&other, &auditor] {
        let token = &session.raw_session_token;
        let proof = &session.raw_csrf_token;
        assert!(
            f.store
                .read_authenticated_action_request_v1(&result.request_id, token, proof, READ_AT)
                .unwrap()
                .is_none()
        );
        assert!(
            f.store
                .read_authenticated_action_request_v1(
                    &format!("arq_{}", "f".repeat(64)),
                    token,
                    proof,
                    READ_AT
                )
                .unwrap()
                .is_none()
        );
    }
    p.actor_ref = auditor.session.identity_ref.clone();
    p.session_ref = format!("session:local:{}", auditor.session.session_id);
    assert_eq!(
        f.store.append_authenticated_action_request_v1(
            &p,
            &auditor.raw_session_token,
            &auditor.raw_csrf_token,
            AT
        ),
        Err(ActionRequestErrorV1::AuthorizationRejected)
    );
}

#[test]
fn action_request_new_session_can_read_but_changed_packet_conflicts() {
    let mut f = Fixture::new();
    let first = f.submit();
    let next = f
        .store
        .issue_local_session_v1(&local_session_input(
            "identity:human:owner",
            PASSWORD,
            READ_AT,
            "2026-07-22T21:01:00Z",
        ))
        .unwrap();
    assert!(
        f.store
            .read_authenticated_action_request_v1(
                &first.request_id,
                &next.raw_session_token,
                &next.raw_csrf_token,
                READ_AT
            )
            .unwrap()
            .is_some()
    );
    f.packet.session_ref = format!("session:local:{}", next.session.session_id);
    let conflict = f
        .store
        .append_authenticated_action_request_v1(
            &f.packet,
            &next.raw_session_token,
            &next.raw_csrf_token,
            READ_AT,
        )
        .unwrap();
    assert_eq!(conflict.disposition, "conflict");
    assert_eq!(conflict.request_id, first.request_id);
}

#[test]
fn action_request_redacts_raw_content_keys_sessions_and_target_identity() {
    let mut f = Fixture::new();
    let canary = "private_request_canary_7d9f";
    f.packet.intent = canary.to_owned();
    f.packet.idempotency_key = format!("idem_{canary}");
    f.packet.constraints.get_mut("execution_proposal").unwrap()["target"]["identity"]["private_path"] =
        json!(canary);
    f.packet.constraints.get_mut("execution_proposal").unwrap()["action"]["arguments"]["secret"] =
        json!(canary);
    let first = f.submit();
    let record = f.read(&first.request_id);
    assert_eq!(record.status, "complete");
    let encoded = serde_json::to_string(&record).unwrap();
    for secret in [
        canary,
        f.owner.raw_session_token.as_str(),
        f.owner.raw_csrf_token.as_str(),
        f.owner.session.session_id.as_str(),
        PASSWORD,
    ] {
        assert!(!encoded.contains(secret));
    }
    assert!(encoded.len() <= 65_536);
}

#[test]
fn action_request_immutability_and_tamper_degrade_without_partial_data() {
    let mut f = Fixture::new();
    let first = f.submit();
    f.store
        .append_authenticated_action_request_v1(
            &f.packet,
            &f.owner.raw_session_token,
            &f.owner.raw_csrf_token,
            READ_AT,
        )
        .unwrap();
    for table in [
        "lnsat_action_requests",
        "lnsat_action_request_evaluations",
        "lnsat_action_request_observations",
    ] {
        assert!(
            f.store
                .connection
                .execute(&format!("DELETE FROM {table}"), [])
                .is_err()
        );
        assert!(
            f.store
                .connection
                .execute(
                    &format!(
                        "UPDATE {table} SET evidence_digest='sha256:{}'",
                        "f".repeat(64)
                    ),
                    []
                )
                .is_err()
        );
    }
    f.store
        .connection
        .execute_batch("DROP TRIGGER lnsat_action_request_evaluations_reject_update;")
        .unwrap();
    f.store
        .connection
        .execute(
            "UPDATE lnsat_action_request_evaluations SET evidence_digest=?1",
            [format!("sha256:{}", "f".repeat(64))],
        )
        .unwrap();
    let read = f.read(&first.request_id);
    assert_eq!(read.status, "degraded");
    assert!(read.request.is_none());
    assert!(read.evidence.is_none());
}

#[test]
fn action_request_observation_tamper_degrades_whole_record() {
    let mut f = Fixture::new();
    let first = f.submit();
    f.store
        .append_authenticated_action_request_v1(
            &f.packet,
            &f.owner.raw_session_token,
            &f.owner.raw_csrf_token,
            READ_AT,
        )
        .unwrap();
    f.store
        .connection
        .execute_batch("DROP TRIGGER lnsat_action_request_observations_reject_update;")
        .unwrap();
    let refreshed = crate::action_request::digest(
        "lnsat.action_request.observation.v1",
        &json!([
            first.request_id,
            "conflict",
            hash_packet_envelope_v1(&f.packet).unwrap(),
            READ_AT
        ]),
    )
    .unwrap();
    f.store
        .connection
        .execute(
            "UPDATE lnsat_action_request_observations SET kind='conflict', evidence_digest=?1",
            [refreshed],
        )
        .unwrap();
    let read = f.read(&first.request_id);
    assert_eq!(read.status, "degraded");
    assert!(read.request.is_none());
    assert!(read.evidence.is_none());
    assert!(read.observations.is_empty());
}

#[test]
fn action_request_rejects_observation_before_root_creation() {
    let mut f = Fixture::new();
    let first = f.submit();
    assert!(
        f.store
            .append_authenticated_action_request_v1(
                &f.packet,
                &f.owner.raw_session_token,
                &f.owner.raw_csrf_token,
                "2026-07-22T20:00:29Z"
            )
            .is_err()
    );
    assert_eq!(f.count("lnsat_action_request_observations"), 0);
    assert_eq!(f.read(&first.request_id).status, "complete");
}

#[test]
fn action_request_rehashed_root_cannot_substitute_packet_commitments() {
    for changed_field in 0..6 {
        let mut f = Fixture::new();
        let first = f.submit();
        let original = f.read(&first.request_id);
        let mut root = original.request.unwrap();
        let evaluation = original.evaluation.unwrap();
        match changed_field {
            0 => root.requester_ref = "identity:human:substituted".to_owned(),
            1 => root.session_id = "substituted-session".to_owned(),
            2 => root.idempotency_key = "idem_substituted".to_owned(),
            3 => root.action_digest = format!("sha256:{}", "1".repeat(64)),
            4 => root.target_digest = format!("sha256:{}", "2".repeat(64)),
            _ => root.configuration_digest = format!("sha256:{}", "3".repeat(64)),
        }
        let identity = crate::action_request::digest(
            "lnsat.action_request.id.v1",
            &json!([
                root.requester_ref,
                root.project_ref,
                root.resource_ref,
                root.idempotency_key,
                root.packet_sha256
            ]),
        )
        .unwrap();
        root.request_id = format!("arq_{}", &identity[7..]);
        root.evidence_digest = crate::action_request::digest(
            "lnsat.action_request.root.v1",
            &json!([
                "lnsat.action_request.v1",
                root.request_id,
                root.requester_ref,
                root.session_id,
                root.project_ref,
                root.resource_ref,
                root.idempotency_key,
                root.packet_id,
                root.packet_sha256,
                root.action_digest,
                root.target_digest,
                root.configuration_digest,
                root.created_at
            ]),
        )
        .unwrap();
        let evaluation_digest = crate::action_request::digest(
            "lnsat.action_request.evaluation.v1",
            &json!([
                root.request_id,
                root.packet_id,
                root.packet_sha256,
                root.project_ref,
                root.resource_ref,
                evaluation.status,
                evaluation.policy_decision_id,
                evaluation.reason_code,
                evaluation.recorded_at
            ]),
        )
        .unwrap();
        // A test-only corrupted database with refreshed outer checksums must not
        // turn inconsistent packet lineage into a complete operator record.
        f.store.connection.execute_batch("PRAGMA foreign_keys=OFF; DROP TRIGGER lnsat_action_requests_reject_update; DROP TRIGGER lnsat_action_request_evaluations_reject_update;").unwrap();
        f.store.connection.execute("UPDATE lnsat_action_requests SET request_id=?1,requester_ref=?2,session_id=?3,idempotency_key=?4,action_digest=?5,target_digest=?6,configuration_digest=?7,evidence_digest=?8 WHERE request_id=?9",
            params![root.request_id, root.requester_ref, root.session_id, root.idempotency_key, root.action_digest, root.target_digest, root.configuration_digest, root.evidence_digest, first.request_id]).unwrap();
        f.store.connection.execute("UPDATE lnsat_action_request_evaluations SET request_id=?1,evidence_digest=?2 WHERE request_id=?3",params![root.request_id,evaluation_digest,first.request_id]).unwrap();
        let read = f.read(&root.request_id);
        assert_eq!(read.status, "degraded", "field {changed_field}");
        assert!(read.request.is_none());
        assert!(read.evidence.is_none());
    }
}

#[test]
fn action_request_concurrent_first_submission_evaluates_once() {
    let f = Fixture::new();
    let path = f.database.path.clone();
    let packet = f.packet.clone();
    let token = f.owner.raw_session_token.clone();
    let csrf = f.owner.raw_csrf_token.clone();
    drop(f.store);
    let barrier = Arc::new(Barrier::new(2));
    let handles = (0..2)
        .map(|_| {
            let path = path.clone();
            let packet = packet.clone();
            let token = token.clone();
            let csrf = csrf.clone();
            let barrier = Arc::clone(&barrier);
            std::thread::spawn(move || {
                let mut store = SqliteStore::open(path).unwrap();
                barrier.wait();
                store
                    .append_authenticated_action_request_v1(&packet, &token, &csrf, AT)
                    .unwrap()
            })
        })
        .collect::<Vec<_>>();
    let results = handles
        .into_iter()
        .map(|h| h.join().unwrap())
        .collect::<Vec<_>>();
    assert_eq!(
        results
            .iter()
            .filter(|r| r.disposition == "created")
            .count(),
        1
    );
    assert_eq!(results[0].request_id, results[1].request_id);
    let store = SqliteStore::open(&path).unwrap();
    let count: i64 = store
        .connection
        .query_row("SELECT count(*) FROM lnsat_policy_decisions", [], |r| {
            r.get(0)
        })
        .unwrap();
    assert_eq!(count, 1);
}

thread_local! { static READ_QUERIES: std::cell::Cell<usize> = const { std::cell::Cell::new(0) }; }
#[allow(clippy::needless_pass_by_value)] // rusqlite trace_v2 requires this callback signature.
fn count_read(event: rusqlite::trace::TraceEvent<'_>) {
    let rusqlite::trace::TraceEvent::Stmt(_, sql) = event else {
        return;
    };
    let sql = sql.trim_start().to_ascii_uppercase();
    if sql.starts_with("SELECT") || sql.starts_with("WITH") {
        READ_QUERIES.with(|n| n.set(n.get() + 1));
    }
}
#[test]
fn action_request_read_query_budget_includes_session_verification() {
    let mut f = Fixture::new();
    let first = f.submit();
    f.store.connection.trace_v2(
        rusqlite::trace::TraceEventCodes::SQLITE_TRACE_STMT,
        Some(count_read),
    );
    READ_QUERIES.with(|n| n.set(0));
    let record = f.read(&first.request_id);
    let count = READ_QUERIES.with(std::cell::Cell::get);
    f.store
        .connection
        .trace_v2(rusqlite::trace::TraceEventCodes::empty(), None);
    assert_eq!(record.status, "complete");
    assert!(count <= 16, "query count {count}");
    assert!(count >= 10);
}

#[test]
fn action_request_multiple_approvals_are_not_silently_collapsed() {
    let mut f = Fixture::new();
    let first = f.submit();
    let policy = decide_packet_envelope_policy_v1(&f.packet, AT).unwrap();
    for at in ["2026-07-22T20:00:40Z", "2026-07-22T20:00:45Z"] {
        let request = create_approval_request_v1(&policy, at).unwrap();
        f.store.append_approval_request_v1(&request).unwrap();
    }
    let record = f.read(&first.request_id);
    assert_eq!(record.status, "complete");
    assert_eq!(
        record.evidence.unwrap()["approvals"]
            .as_array()
            .unwrap()
            .len(),
        2
    );
}

#[test]
fn action_request_approval_overflow_degrades_whole_record() {
    let mut f = Fixture::new();
    let first = f.submit();
    let policy = decide_packet_envelope_policy_v1(&f.packet, AT).unwrap();
    for n in 0..65 {
        let at = format!("2026-07-22T20:02:{:02}.{:03}Z", n / 10, n % 10);
        let request = create_approval_request_v1(&policy, &at).unwrap();
        f.store.append_approval_request_v1(&request).unwrap();
    }
    let record = f.read(&first.request_id);
    assert_eq!(record.status, "degraded");
    assert!(record.evidence.is_none());
    assert!(record.request.is_none());
}

#[test]
fn action_request_read_rejects_valid_token_with_another_sessions_proof() {
    let mut f = Fixture::new();
    let other = f.identity("proof-other", LocalIdentityRoleV1::Operator);
    let first = f.submit();
    assert_eq!(
        f.store.read_authenticated_action_request_v1(
            &first.request_id,
            &f.owner.raw_session_token,
            &other.raw_csrf_token,
            READ_AT,
        ),
        Err(ActionRequestErrorV1::AuthorizationRejected)
    );
    assert_eq!(f.read(&first.request_id).status, "complete");
}
