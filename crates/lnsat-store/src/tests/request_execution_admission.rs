use super::*;
use crate::phase7_consumption::request_admission::{
    ADAPTER_REF, ADAPTER_VERSION, PROTOCOL, RequestLaunchReservationV1,
    verify_reservation_binding_v1,
};
use lnsat_contracts::{
    ApprovalDecisionV1Input, ApprovalDecisionV1Kind, ApprovalDecisionV1Reason,
    ExecutionRequestV1Input, derive_execution_request_v1, hash_packet_envelope_v1,
};
use std::sync::{
    Arc, Barrier,
    atomic::{AtomicUsize, Ordering},
};
use std::thread;

const PASSWORD: &str = "request execution admission source fixture password";
const ROOT_AT: &str = "2026-07-22T20:00:00.000Z";
const REQUESTED_AT: &str = "2026-07-22T20:01:00.000Z";
const DECIDED_AT: &str = "2026-07-22T20:02:00.000Z";
const ISSUED_AT: &str = "2026-07-22T20:03:00.000Z";
const EXPIRES_AT: &str = "2026-07-22T20:04:00.000Z";
const ADMITTED_AT: &str = "2026-07-22T20:03:30.000Z";

struct AdmissionFixture {
    database: TestDatabase,
    store: SqliteStore,
    packet: PacketEnvelopeV1,
    request_id: String,
    derived: lnsat_contracts::DerivedExecutionRequestV1,
    project_ref: String,
    resource_ref: String,
    authorization_id: String,
    operation_id: String,
    nonce_id: String,
    requester_token: String,
    requester_csrf: String,
    approver_token: String,
    approver_csrf: String,
    capability_wire: String,
}

impl AdmissionFixture {
    #[allow(clippy::too_many_lines)] // Keep the complete authenticated fixture lineage visible.
    fn new(sequence: u64) -> Self {
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
        add_execution_proposal(&mut packet);
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

    fn capability(&self) -> Phase7CapabilitySecretV1 {
        let mut wire = self.capability_wire.clone();
        Phase7CapabilitySecretV1::take_from_canonical_wire_v1(&mut wire)
            .expect("fixture capability must decode")
    }

    fn reserve_at(
        &mut self,
        at: &str,
    ) -> Result<RequestLaunchReservationV1, Phase7PersistenceErrorV1> {
        let request_id = self.request_id.clone();
        let derived = self.derived.clone();
        reserve_with_sources(
            self,
            &request_id,
            &derived,
            (|| Ok(at.to_owned()), || Ok(()), || Ok(())),
        )
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

    fn append_denied_root(&mut self, sequence: u64) -> String {
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
    fn reserve_second_approval_authorization(
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

fn reserve_with_sources<C, P, A>(
    fixture: &mut AdmissionFixture,
    request_id: &str,
    derived: &lnsat_contracts::DerivedExecutionRequestV1,
    sources: (C, P, A),
) -> Result<RequestLaunchReservationV1, Phase7PersistenceErrorV1>
where
    C: FnMut() -> Result<String, Phase7PersistenceErrorV1>,
    P: FnOnce() -> Result<(), Phase7PersistenceErrorV1>,
    A: FnOnce() -> Result<(), Phase7PersistenceErrorV1>,
{
    let project_ref = fixture.project_ref.clone();
    let resource_ref = fixture.resource_ref.clone();
    let authorization_id = fixture.authorization_id.clone();
    let operation_id = fixture.operation_id.clone();
    let requester_token = fixture.requester_token.clone();
    let requester_csrf = fixture.requester_csrf.clone();
    let capability = fixture.capability();
    let input = Phase7CapabilityRedemptionInputV1 {
        project_ref: &project_ref,
        resource_ref: &resource_ref,
        authorization_id: &authorization_id,
        operation_id: &operation_id,
        idempotency_key: "request-execution-admission:consume",
    };
    fixture.store.reserve_request_execution_with_sources_v1(
        request_id,
        derived,
        &input,
        capability,
        (&requester_token, &requester_csrf),
        sources,
    )
}

fn rederive(
    fixture: &AdmissionFixture,
    packet: &PacketEnvelopeV1,
) -> lnsat_contracts::DerivedExecutionRequestV1 {
    let packet_sha256 = hash_packet_envelope_v1(packet).expect("changed packet must hash");
    derive_execution_request_v1(&ExecutionRequestV1Input {
        packet,
        packet_sha256: &packet_sha256,
        policy_decision_id: &fixture.derived.request.policy_decision_id,
        approval_request_id: &fixture.derived.request.approval_request_id,
        approval_decision_id: &fixture.derived.request.approval_decision_id,
        requester_ref: &fixture.derived.request.requester_ref,
        requester_session_ref: &fixture.derived.request.requester_session_ref,
        approver_ref: &fixture.derived.request.approver_ref,
        approver_session_ref: &fixture.derived.request.approver_session_ref,
        prepared_at: &fixture.derived.request.prepared_at,
        expires_at: &fixture.derived.request.expires_at,
    })
    .expect("changed request must rederive")
}

fn table_count(store: &SqliteStore, table: &str) -> i64 {
    store
        .connection
        .query_row(&format!("SELECT count(*) FROM {table}"), [], |row| {
            row.get(0)
        })
        .expect("table count must read")
}

fn fake_adapter_once(reservation: RequestLaunchReservationV1, calls: &AtomicUsize) {
    assert!(reservation.request_id().starts_with("arq_"));
    assert!(reservation.operation_id().starts_with("opn_"));
    assert!(reservation.operation_attempt_id().starts_with("opa_"));
    assert_ne!(reservation.launch_digest(), &[0; 32]);
    assert_eq!(reservation.expires_at(), EXPIRES_AT);
    calls.fetch_add(1, Ordering::SeqCst);
    drop(reservation);
}

#[test]
fn request_execution_admission_reserves_exact_root_once_for_fake_adapter() {
    let mut fixture = AdmissionFixture::new(71);
    let calls = AtomicUsize::new(0);
    let reservation = fixture
        .reserve_at(ADMITTED_AT)
        .expect("exact request must reserve");
    let operation_id = reservation.operation_id().to_owned();
    let operation_attempt_id = reservation.operation_attempt_id().to_owned();
    let launch_digest = *reservation.launch_digest();
    verify_reservation_binding_v1(
        &fixture.store.connection,
        &fixture.project_ref,
        &fixture.resource_ref,
        &operation_id,
        &launch_digest,
        ADMITTED_AT,
    )
    .expect("stored reservation binding must verify");
    assert!(matches!(
        verify_reservation_binding_v1(
            &fixture.store.connection,
            &fixture.project_ref,
            &fixture.resource_ref,
            &operation_id,
            &[0; 32],
            ADMITTED_AT,
        ),
        Err(Phase7PersistenceErrorV1::EvidenceDrift)
    ));
    fake_adapter_once(reservation, &calls);
    assert_eq!(calls.load(Ordering::SeqCst), 1);
    assert_eq!(
        table_count(&fixture.store, "lnsat_capability_consumptions"),
        1
    );
    assert_eq!(table_count(&fixture.store, "lnsat_operation_attempts"), 1);
    let operation = fixture
        .store
        .read_phase8_operation_v1(&operation_id)
        .expect("reservation operation must read")
        .expect("reservation operation must exist");
    assert_eq!(operation.state, "dispatching");
    assert_eq!(
        operation
            .attempt
            .as_ref()
            .map(|attempt| attempt.operation_attempt_id.as_str()),
        Some(operation_attempt_id.as_str())
    );

    assert!(matches!(
        fixture.reserve_at(ADMITTED_AT),
        Err(Phase7PersistenceErrorV1::RedemptionRejected)
    ));
    assert_eq!(calls.load(Ordering::SeqCst), 1);
    assert_eq!(table_count(&fixture.store, "lnsat_operation_attempts"), 1);
    assert!(matches!(
        fixture.reserve_second_approval_authorization(),
        Err(Phase7PersistenceErrorV1::RedemptionRejected)
    ));
    assert_eq!(
        table_count(&fixture.store, "lnsat_capability_consumptions"),
        1
    );
    assert_eq!(table_count(&fixture.store, "lnsat_operation_attempts"), 1);
}

#[test]
fn request_execution_admission_persisted_attempt_tamper_fails_reopen_integrity() {
    let mut fixture = AdmissionFixture::new(711);
    let reservation = fixture
        .reserve_at(ADMITTED_AT)
        .expect("exact request must reserve");
    let operation_id = reservation.operation_id().to_owned();
    drop(reservation);
    let stored_digest = fixture
        .store
        .read_phase8_operation_v1(&operation_id)
        .expect("reserved operation must read")
        .expect("reserved operation must exist")
        .attempt
        .expect("reserved operation must have attempt")
        .tool_arguments_digest;
    fixture
        .store
        .connection
        .execute_batch("PRAGMA wal_checkpoint(TRUNCATE);")
        .expect("fixture checkpoint must persist attempt row");
    let path = fixture.database.path.clone();
    drop(fixture.store);
    let mut bytes = std::fs::read(&path).expect("checkpointed database must read");
    let offset = bytes
        .windows(stored_digest.len())
        .position(|window| window == stored_digest)
        .expect("stored attempt digest must occur in database bytes");
    bytes[offset] ^= 0x01;
    std::fs::write(&path, bytes).expect("fixture may corrupt one persisted digest byte");
    assert!(matches!(
        SqliteStore::open(&path),
        Err(SqliteStoreError::MigrationDrift)
    ));
}

#[test]
fn request_execution_admission_missing_root_lineage_fails_binding_and_reopen() {
    let mut fixture = AdmissionFixture::new(712);
    let reservation = fixture
        .reserve_at(ADMITTED_AT)
        .expect("request must reserve");
    let operation_id = reservation.operation_id().to_owned();
    let launch_digest = *reservation.launch_digest();
    drop(reservation);
    // Deliberately corrupt only fixture lineage. Restore the exact trigger so
    // reopen cannot reject merely because the schema changed. Generic attempt
    // IDs, digests, audit, authorization and consumption remain untouched.
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
        .expect("exact trigger must restore");
    assert_eq!(
        verify_reservation_binding_v1(
            &fixture.store.connection,
            &fixture.project_ref,
            &fixture.resource_ref,
            &operation_id,
            &launch_digest,
            ADMITTED_AT,
        ),
        Err(Phase7PersistenceErrorV1::EvidenceDrift)
    );
    let path = fixture.database.path.clone();
    drop(fixture.store);
    assert!(matches!(
        SqliteStore::open(path),
        Err(SqliteStoreError::MigrationDrift)
    ));
}

#[test]
#[allow(clippy::too_many_lines)] // Group denial cases with their zero-write assertions.
fn request_execution_admission_rejects_drift_and_terminal_sources_without_attempt() {
    let mut drift = AdmissionFixture::new(72);
    let mut changed_packet = drift.packet.clone();
    changed_packet
        .constraints
        .get_mut("execution_proposal")
        .expect("proposal")["configuration_digest"] =
        serde_json::json!(format!("sha256:{}", "d".repeat(64)));
    let changed = rederive(&drift, &changed_packet);
    let request_id = drift.request_id.clone();
    assert!(matches!(
        reserve_with_sources(
            &mut drift,
            &request_id,
            &changed,
            (|| Ok(ADMITTED_AT.to_owned()), || Ok(()), || Ok(())),
        ),
        Err(Phase7PersistenceErrorV1::SourceNotApproved)
    ));
    for (field, value) in [
        (
            "target",
            serde_json::json!({"resource_ref": drift.packet.resource_refs[0].clone(), "identity": {"repository":"other","base":"fixture-base"}}),
        ),
        (
            "adapter",
            serde_json::json!({"ref":"adapter:source-only:other","version":ADAPTER_VERSION}),
        ),
        (
            "executable_digest",
            serde_json::json!(format!("sha256:{}", "f".repeat(64))),
        ),
        ("audience", serde_json::json!("audience:gateway:other")),
    ] {
        let mut changed_packet = drift.packet.clone();
        changed_packet
            .constraints
            .get_mut("execution_proposal")
            .expect("proposal")[field] = value;
        let changed = rederive(&drift, &changed_packet);
        assert!(matches!(
            reserve_with_sources(
                &mut drift,
                &request_id,
                &changed,
                (|| Ok(ADMITTED_AT.to_owned()), || Ok(()), || Ok(())),
            ),
            Err(Phase7PersistenceErrorV1::SourceNotApproved)
        ));
    }
    assert_eq!(table_count(&drift.store, "lnsat_operation_attempts"), 0);

    let derived = drift.derived.clone();
    let pending = drift.admit_pending_root(721);
    assert!(matches!(
        reserve_with_sources(
            &mut drift,
            &pending,
            &derived,
            (|| Ok(ADMITTED_AT.to_owned()), || Ok(()), || Ok(())),
        ),
        Err(Phase7PersistenceErrorV1::SourceNotApproved)
    ));
    let denied = drift.append_denied_root(722);
    assert!(matches!(
        reserve_with_sources(
            &mut drift,
            &denied,
            &derived,
            (|| Ok(ADMITTED_AT.to_owned()), || Ok(()), || Ok(())),
        ),
        Err(Phase7PersistenceErrorV1::SourceNotApproved)
    ));
    let failed = drift.append_failed_root(723);
    assert!(matches!(
        reserve_with_sources(
            &mut drift,
            &failed,
            &derived,
            (|| Ok(ADMITTED_AT.to_owned()), || Ok(()), || Ok(())),
        ),
        Err(Phase7PersistenceErrorV1::SourceNotApproved)
    ));
    let valid_root = drift.request_id.clone();
    let bad_csrf = std::mem::replace(
        &mut drift.requester_csrf,
        "malformed-local-session-proof".to_owned(),
    );
    assert!(matches!(
        reserve_with_sources(
            &mut drift,
            &valid_root,
            &derived,
            (|| Ok(ADMITTED_AT.to_owned()), || Ok(()), || Ok(())),
        ),
        Err(Phase7PersistenceErrorV1::RedemptionRejected)
    ));
    drift.requester_csrf = bad_csrf;
    let mut malformed_capability = "A".repeat(PHASE7_CAPABILITY_WIRE_HEX_BYTES_V1);
    assert!(matches!(
        Phase7CapabilitySecretV1::take_from_canonical_wire_v1(&mut malformed_capability),
        Err(Phase7PersistenceErrorV1::InvalidInput)
    ));
    assert!(malformed_capability.is_empty());

    let mut missing = AdmissionFixture::new(73);
    let absent = format!("arq_{}", "0".repeat(64));
    let derived = missing.derived.clone();
    assert!(matches!(
        reserve_with_sources(
            &mut missing,
            &absent,
            &derived,
            (|| Ok(ADMITTED_AT.to_owned()), || Ok(()), || Ok(())),
        ),
        Err(Phase7PersistenceErrorV1::SourceNotApproved)
    ));

    let mut expired = AdmissionFixture::new(74);
    assert!(matches!(
        expired.reserve_at(EXPIRES_AT),
        Err(Phase7PersistenceErrorV1::RedemptionRejected)
    ));

    let mut crosses_expiry = AdmissionFixture::new(741);
    let request_id = crosses_expiry.request_id.clone();
    let derived = crosses_expiry.derived.clone();
    let mut timestamps = [ADMITTED_AT, EXPIRES_AT].into_iter();
    assert!(matches!(
        reserve_with_sources(
            &mut crosses_expiry,
            &request_id,
            &derived,
            (
                || Ok(timestamps
                    .next()
                    .expect("clock must have two values")
                    .to_owned()),
                || Ok(()),
                || Ok(()),
            ),
        ),
        Err(Phase7PersistenceErrorV1::SourceNotApproved)
    ));
    assert_eq!(
        table_count(&crosses_expiry.store, "lnsat_capability_consumptions"),
        0
    );
    assert_eq!(
        table_count(&crosses_expiry.store, "lnsat_operation_attempts"),
        0
    );

    let mut revoked_authorization = AdmissionFixture::new(75);
    revoked_authorization
        .store
        .transition_phase7_local_execution_authorization_with_sources_v1(
            &Phase7ExecutionAuthorizationTransitionInputV1 {
                project_ref: &revoked_authorization.project_ref,
                resource_ref: &revoked_authorization.resource_ref,
                authorization_id: &revoked_authorization.authorization_id,
            },
            &revoked_authorization.approver_token,
            &revoked_authorization.approver_csrf,
            "revoked",
            || Ok("2026-07-22T20:03:10.000Z".to_owned()),
            || Ok(()),
        )
        .expect("approver revocation must persist");
    assert!(matches!(
        revoked_authorization.reserve_at(ADMITTED_AT),
        Err(Phase7PersistenceErrorV1::RedemptionRejected)
    ));

    let mut cancelled_nonce = AdmissionFixture::new(76);
    cancelled_nonce
        .store
        .cancel_phase7_authorization_nonce_at_v1(
            &Phase7AuthorizationNonceCancelInputV1 {
                project_ref: &cancelled_nonce.project_ref,
                resource_ref: &cancelled_nonce.resource_ref,
                nonce_id: &cancelled_nonce.nonce_id,
            },
            "2026-07-22T20:03:10.000Z",
            || Ok(()),
        )
        .expect("nonce cancellation must persist");
    assert_eq!(
        cancelled_nonce.reserve_at(ADMITTED_AT).err(),
        Some(Phase7PersistenceErrorV1::SourceNotApproved)
    );

    let mut requester_revoked = AdmissionFixture::new(77);
    assert!(
        requester_revoked
            .store
            .revoke_local_session_v1(
                &requester_revoked.requester_token,
                &requester_revoked.requester_csrf,
                "2026-07-22T20:03:10.000Z",
                LocalSessionRevocationReasonV1::SignOut,
            )
            .expect("requester session must revoke")
    );
    assert!(matches!(
        requester_revoked.reserve_at(ADMITTED_AT),
        Err(Phase7PersistenceErrorV1::RedemptionRejected)
    ));

    let mut approver_revoked = AdmissionFixture::new(78);
    assert!(
        approver_revoked
            .store
            .revoke_local_session_v1(
                &approver_revoked.approver_token,
                &approver_revoked.approver_csrf,
                "2026-07-22T20:03:10.000Z",
                LocalSessionRevocationReasonV1::SignOut,
            )
            .expect("approver session must revoke")
    );
    assert!(matches!(
        approver_revoked.reserve_at(ADMITTED_AT),
        Err(Phase7PersistenceErrorV1::SourceNotApproved)
    ));
    for rejected in [
        &drift,
        &missing,
        &expired,
        &crosses_expiry,
        &revoked_authorization,
        &cancelled_nonce,
        &requester_revoked,
        &approver_revoked,
    ] {
        assert_eq!(
            table_count(&rejected.store, "lnsat_capability_consumptions"),
            0
        );
        assert_eq!(table_count(&rejected.store, "lnsat_operation_attempts"), 0);
    }
}

#[test]
fn request_execution_admission_rolls_back_or_preserves_ambiguous_one_use_latch() {
    let mut precommit = AdmissionFixture::new(79);
    let request_id = precommit.request_id.clone();
    let derived = precommit.derived.clone();
    assert!(matches!(
        reserve_with_sources(
            &mut precommit,
            &request_id,
            &derived,
            (
                || Ok(ADMITTED_AT.to_owned()),
                || Err(Phase7PersistenceErrorV1::PersistenceFailed),
                || Ok(()),
            ),
        ),
        Err(Phase7PersistenceErrorV1::PersistenceFailed)
    ));
    assert_eq!(
        table_count(&precommit.store, "lnsat_capability_consumptions"),
        0
    );
    assert_eq!(table_count(&precommit.store, "lnsat_operation_attempts"), 0);
    precommit
        .reserve_at(ADMITTED_AT)
        .expect("rolled-back capability must remain usable");

    let mut postcommit = AdmissionFixture::new(80);
    let request_id = postcommit.request_id.clone();
    let derived = postcommit.derived.clone();
    assert!(matches!(
        reserve_with_sources(
            &mut postcommit,
            &request_id,
            &derived,
            (
                || Ok(ADMITTED_AT.to_owned()),
                || Ok(()),
                || Err(Phase7PersistenceErrorV1::PersistenceFailed),
            ),
        ),
        Err(Phase7PersistenceErrorV1::OutcomeAmbiguous)
    ));
    assert_eq!(
        table_count(&postcommit.store, "lnsat_capability_consumptions"),
        1
    );
    assert_eq!(
        table_count(&postcommit.store, "lnsat_operation_attempts"),
        1
    );
    assert!(matches!(
        postcommit.reserve_at(ADMITTED_AT),
        Err(Phase7PersistenceErrorV1::RedemptionRejected)
    ));
}

#[test]
#[allow(clippy::too_many_lines)] // Keep concurrent ownership and restart evidence in one case.
fn request_execution_admission_concurrent_and_restart_paths_never_redispatch() {
    let fixture = AdmissionFixture::new(81);
    let database_path = fixture.database.path.clone();
    let request_id = fixture.request_id.clone();
    let derived = fixture.derived.clone();
    let project_ref = fixture.project_ref.clone();
    let resource_ref = fixture.resource_ref.clone();
    let authorization_id = fixture.authorization_id.clone();
    let operation_id = fixture.operation_id.clone();
    let requester_token = fixture.requester_token.clone();
    let requester_csrf = fixture.requester_csrf.clone();
    let capability_wire = fixture.capability_wire.clone();
    let barrier = Arc::new(Barrier::new(2));
    let left = SqliteStore::open(&database_path).expect("left connection must open before thread");
    let right =
        SqliteStore::open(&database_path).expect("right connection must open before thread");
    let reserve = |mut store: SqliteStore, barrier: Arc<Barrier>| {
        let request_id = request_id.clone();
        let derived = derived.clone();
        let project_ref = project_ref.clone();
        let resource_ref = resource_ref.clone();
        let authorization_id = authorization_id.clone();
        let operation_id = operation_id.clone();
        let requester_token = requester_token.clone();
        let requester_csrf = requester_csrf.clone();
        let mut wire = capability_wire.clone();
        thread::spawn(move || {
            barrier.wait();
            let input = Phase7CapabilityRedemptionInputV1 {
                project_ref: &project_ref,
                resource_ref: &resource_ref,
                authorization_id: &authorization_id,
                operation_id: &operation_id,
                idempotency_key: "request-execution-admission:concurrent",
            };
            store.reserve_request_execution_with_sources_v1(
                &request_id,
                &derived,
                &input,
                Phase7CapabilitySecretV1::take_from_canonical_wire_v1(&mut wire)
                    .expect("capability must decode"),
                (&requester_token, &requester_csrf),
                (|| Ok(ADMITTED_AT.to_owned()), || Ok(()), || Ok(())),
            )
        })
    };
    let left = reserve(left, Arc::clone(&barrier));
    let right = reserve(right, barrier);
    let results = [
        left.join().expect("left worker must join"),
        right.join().expect("right worker must join"),
    ];
    assert_eq!(results.iter().filter(|result| result.is_ok()).count(), 1);
    assert!(results.iter().all(|result| {
        result.is_ok() || matches!(result, Err(Phase7PersistenceErrorV1::RedemptionRejected))
    }));
    let reservation = results
        .into_iter()
        .find_map(Result::ok)
        .expect("one winner must reserve");
    let attempt_id = reservation.operation_attempt_id().to_owned();
    drop(reservation);
    drop(fixture.store);

    let mut restarted = SqliteStore::open(&database_path).expect("restart connection must open");
    assert_eq!(
        restarted
            .materialize_phase8_interrupted_dispatches_v1()
            .expect("startup reconciliation must materialize ambiguity"),
        1
    );
    let operation = restarted
        .read_phase8_operation_v1(&operation_id)
        .expect("operation must read after restart")
        .expect("operation must exist after restart");
    assert_eq!(operation.state, "outcome_unknown");
    assert_eq!(
        operation
            .attempt
            .as_ref()
            .map(|attempt| attempt.operation_attempt_id.as_str()),
        Some(attempt_id.as_str())
    );
    assert_eq!(table_count(&restarted, "lnsat_operation_receipts"), 0);
    assert_eq!(
        restarted
            .materialize_phase8_interrupted_dispatches_v1()
            .expect("second startup scan must remain stable"),
        0
    );
    let mut wire = capability_wire;
    let input = Phase7CapabilityRedemptionInputV1 {
        project_ref: &project_ref,
        resource_ref: &resource_ref,
        authorization_id: &authorization_id,
        operation_id: &operation_id,
        idempotency_key: "request-execution-admission:restart-replay",
    };
    assert!(matches!(
        restarted.reserve_request_execution_with_sources_v1(
            &request_id,
            &derived,
            &input,
            Phase7CapabilitySecretV1::take_from_canonical_wire_v1(&mut wire)
                .expect("capability must decode"),
            (&requester_token, &requester_csrf),
            (|| Ok(ADMITTED_AT.to_owned()), || Ok(()), || Ok(())),
        ),
        Err(Phase7PersistenceErrorV1::RedemptionRejected)
    ));
    assert_eq!(PROTOCOL, "lnsat.request-execution-admission.source.v1");
}
