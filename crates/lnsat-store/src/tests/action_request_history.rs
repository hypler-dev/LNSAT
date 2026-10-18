use super::*;
use crate::action_request::ActionRequestRecordV1;
use crate::phase7_consumption::{Phase7ExecutionSeedInputV1, Phase7ExecutionSeedRecordV1};
use crate::phase7_nonce::insert_entity_and_audit;
use crate::phase7_persistence::digest_fields;
use rusqlite::params;

const ROOT_AT: &str = "2026-07-22T20:00:30Z";
const READ_AT: &str = "2026-07-22T20:03:30Z";
const PASSWORD: &str = "action request history fixture password";

struct HistoryFixture {
    database: TestDatabase,
    store: SqliteStore,
    owner: LocalSessionIssueResultV1,
    approver: LocalSessionIssueResultV1,
    packet: PacketEnvelopeV1,
}

impl HistoryFixture {
    fn new() -> Self {
        let database = TestDatabase::new("action-request-history");
        let mut store = SqliteStore::open(&database.path).expect("fixture store must open");
        store
            .bootstrap_local_owner_v1(&LocalOwnerBootstrapInputV1 {
                created_at: "2026-07-22T19:00:00Z",
                ..owner_bootstrap_input(PASSWORD)
            })
            .expect("owner must bootstrap");
        let owner = store
            .issue_local_owner_session_v1(&local_session_input(
                "identity:human:owner",
                PASSWORD,
                "2026-07-22T19:55:00Z",
                "2026-07-22T20:55:00Z",
            ))
            .expect("owner session must issue");
        store
            .create_local_identity_v1(
                &local_identity_create_input(
                    "identity:human:approver",
                    "Approver",
                    LocalIdentityRoleV1::Operator,
                    PASSWORD,
                    "2026-07-22T19:56:00Z",
                ),
                &owner.raw_session_token,
                &owner.raw_csrf_token,
                "2026-07-22T19:56:00Z",
            )
            .expect("synthetic approver identity must create");
        let approver = store
            .issue_local_session_v1(&local_session_input(
                "identity:human:approver",
                PASSWORD,
                "2026-07-22T19:57:00Z",
                "2026-07-22T20:55:00Z",
            ))
            .expect("synthetic approver session must issue");
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
            approver,
            packet,
        }
    }

    fn submit(&mut self) -> crate::action_request::ActionRequestSubmissionV1 {
        self.store
            .append_authenticated_action_request_v1(
                &self.packet,
                &self.owner.raw_session_token,
                &self.owner.raw_csrf_token,
                ROOT_AT,
            )
            .expect("root and policy must persist")
    }

    fn read(&mut self, request_id: &str) -> ActionRequestRecordV1 {
        self.store
            .read_authenticated_action_request_v1(
                request_id,
                &self.owner.raw_session_token,
                &self.owner.raw_csrf_token,
                READ_AT,
            )
            .expect("record read must succeed")
            .expect("requester record must exist")
    }
}

fn append_approved_chain(
    fixture: &mut HistoryFixture,
    requested_at: &str,
    decided_at: &str,
) -> (PolicyDecisionV1, ApprovalRequestV1, ApprovalDecisionV1) {
    let policy = decide_packet_envelope_policy_v1(&fixture.packet, ROOT_AT)
        .expect("synthetic policy must derive");
    let request = create_approval_request_v1(&policy, requested_at)
        .expect("synthetic approval request must derive");
    fixture
        .store
        .append_approval_request_v1(&request)
        .expect("approval request must append");
    let decision = decide_approval_request_v1(
        &request,
        &ApprovalDecisionV1Input {
            approver_ref: fixture.approver.session.identity_ref.clone(),
            approver_session_ref: format!("session:local:{}", fixture.approver.session.session_id),
            decision: ApprovalDecisionV1Kind::Approved,
            reason: ApprovalDecisionV1Reason::OperatorApproved,
            decided_at: decided_at.to_owned(),
        },
    )
    .expect("synthetic approval decision must derive");
    fixture
        .store
        .append_approval_decision_evidence_for_test_v1(&decision)
        .expect("approval decision must append");
    (policy, request, decision)
}

struct FullHistory {
    request_id: String,
    operation_id: String,
    authorization_id: String,
    consumption_id: String,
    project_ref: String,
    resource_ref: String,
}

fn derived_id(prefix: &str, domain: &str, fields: &[&[u8]]) -> String {
    let digest = digest_fields(domain, fields);
    let mut value = String::with_capacity(prefix.len() + 64);
    value.push_str(prefix);
    for byte in digest {
        write!(value, "{byte:02x}").expect("identifier must encode");
    }
    value
}

#[allow(clippy::too_many_arguments)] // Explicit immutable synthetic state inputs.
fn insert_operation_attempt_state(
    transaction: &rusqlite::Transaction<'_>,
    project_ref: &str,
    resource_ref: &str,
    attempt_id: &str,
    state: &str,
    sequence: i64,
    prior: Option<(&str, i64)>,
    effective_at: &str,
) {
    let sequence_bytes = sequence.to_be_bytes();
    let prior_sequence = prior.map_or(0_i64, |(_, value)| value);
    let prior_sequence_bytes = prior_sequence.to_be_bytes();
    let prior_id = prior.map_or("", |(value, _)| value);
    let state_id = derived_id(
        "ste_",
        "lnsat.phase7.git-state-event-id.v1",
        &[attempt_id.as_bytes(), state.as_bytes(), &sequence_bytes],
    );
    let audit_id = derived_id(
        "p7a_",
        "lnsat.phase7.git-state-audit-id.v1",
        &[state_id.as_bytes()],
    );
    let state_digest = digest_fields(
        "lnsat.phase7.git-state.v1",
        &[
            attempt_id.as_bytes(),
            b"operation_attempt",
            state.as_bytes(),
            &sequence_bytes,
            prior_id.as_bytes(),
            &prior_sequence_bytes,
            effective_at.as_bytes(),
        ],
    );
    let record_digest = digest_fields(
        "lnsat.phase7.git-state-record.v1",
        &[
            state_id.as_bytes(),
            audit_id.as_bytes(),
            project_ref.as_bytes(),
            resource_ref.as_bytes(),
            attempt_id.as_bytes(),
            b"operation_attempt",
            &sequence_bytes,
            state.as_bytes(),
            &state_digest,
            effective_at.as_bytes(),
        ],
    );
    let effect = if state == "completed" {
        "receipt_bound"
    } else {
        "none"
    };
    insert_entity_and_audit(
        transaction,
        &state_id,
        "phase7_state_event",
        project_ref,
        resource_ref,
        &audit_id,
        &record_digest,
        "operation_attempt_state_recorded",
        effect,
        effective_at,
    )
    .expect("synthetic operation-attempt state entity must append");
    transaction
        .execute(
            "INSERT INTO lnsat_phase7_state_events (
               state_event_id, entity_kind, project_ref, resource_ref,
               target_entity_id, target_entity_kind, state_sequence, state,
               prior_state_event_id, prior_state_sequence, effective_at, state_digest
             ) VALUES (?1, 'phase7_state_event', ?2, ?3, ?4, 'operation_attempt',
               ?5, ?6, ?7, ?8, ?9, ?10)",
            params![
                state_id,
                project_ref,
                resource_ref,
                attempt_id,
                sequence,
                state,
                prior.map(|(value, _)| value),
                prior.map(|(_, value)| value),
                effective_at,
                state_digest.as_slice(),
            ],
        )
        .expect("synthetic operation-attempt state must append");
}

fn full_history_fixture(fixture: &mut HistoryFixture) -> FullHistory {
    let submission = fixture.submit();
    assert_eq!(submission.disposition, "created");

    let (policy, request, decision) =
        append_approved_chain(fixture, "2026-07-22T20:00:35Z", "2026-07-22T20:00:36Z");
    let second = append_approved_chain(fixture, "2026-07-22T20:00:37Z", "2026-07-22T20:00:38Z");

    let mut attempt = phase7_attempt_fixture(&fixture.packet, &policy, &request, &decision, 1);
    let prepared =
        prepare_phase7_attempt(&mut fixture.store, &attempt).expect("first attempt must append");
    attempt.apply_record(&prepared.record);
    let second_attempt =
        phase7_attempt_fixture(&fixture.packet, &second.0, &second.1, &second.2, 2);
    prepare_phase7_attempt(&mut fixture.store, &second_attempt)
        .expect("second attempt must append");

    let nonce = issue_phase7_nonce_at(
        &mut fixture.store,
        &attempt,
        0x51,
        "2026-07-22T20:03:01.000Z",
        "2026-07-22T20:08:01.000Z",
    );
    let capability = [0x72; PHASE7_CAPABILITY_BYTES_V1];
    let Phase7ExecutionSeedRecordV1 {
        authorization_id,
        operation_id,
    } = fixture
        .store
        .seed_phase7_execution_authorization_and_operation_v1(
            &Phase7ExecutionSeedInputV1 {
                project_ref: &attempt.project_ref,
                resource_ref: &attempt.resource_ref,
                authorization_attempt_id: &attempt.authorization_attempt_id,
                nonce_id: &nonce.record.nonce_id,
                operation_idempotency_key: "action-request-history-operation",
                issued_at: "2026-07-22T20:03:02.000Z",
                expires_at: "2026-07-22T20:04:02.000Z",
            },
            &capability,
        )
        .expect("test-only authorization and operation must seed");
    let mut raw_capability = capability;
    let consumption = fixture
        .store
        .redeem_phase7_execution_capability_with_sources_v1(
            &Phase7CapabilityRedemptionInputV1 {
                project_ref: &attempt.project_ref,
                resource_ref: &attempt.resource_ref,
                authorization_id: &authorization_id,
                operation_id: &operation_id,
                idempotency_key: "action-request-history-consumption",
            },
            Phase7CapabilitySecretV1::take_from_bytes(&mut raw_capability),
            || Ok("2026-07-22T20:03:05.000Z".to_owned()),
            || Ok(()),
            || Ok(()),
        )
        .expect("synthetic capability must consume");
    assert_eq!(raw_capability, [0; PHASE7_CAPABILITY_BYTES_V1]);

    FullHistory {
        request_id: submission.request_id,
        operation_id,
        authorization_id,
        consumption_id: consumption.record.consumption_id,
        project_ref: attempt.project_ref,
        resource_ref: attempt.resource_ref,
    }
}

#[allow(clippy::too_many_lines)] // One synthetic transaction and receipt/reconciliation history.
fn insert_synthetic_dispatch_history(
    fixture: &mut HistoryFixture,
    history: &FullHistory,
    reconciliation_count: u64,
) -> String {
    // Test-only readback fixture. It creates no adapter/runtime process.
    fixture
        .store
        .connection
        .pragma_update(None, "foreign_keys", false)
        .expect("fixture may isolate synthetic dispatch rows");
    if reconciliation_count > 64 {
        fixture
            .store
            .connection
            .pragma_update(None, "ignore_check_constraints", true)
            .expect("overflow fixture may exceed row bound");
    }
    let tool_arguments_digest = [0x44_u8; 32];
    let attempt_id = derived_id(
        "opa_",
        "lnsat.phase7.git-operation-attempt-id.v1",
        &[history.operation_id.as_bytes(), &tool_arguments_digest],
    );
    let attempt_audit_id = derived_id(
        "p7a_",
        "lnsat.phase7.git-operation-attempt-audit-id.v1",
        &[attempt_id.as_bytes()],
    );
    let attempt_record_digest = digest_fields(
        "lnsat.phase7.git-operation-attempt-record.v1",
        &[
            attempt_id.as_bytes(),
            attempt_audit_id.as_bytes(),
            history.project_ref.as_bytes(),
            history.resource_ref.as_bytes(),
            history.operation_id.as_bytes(),
            &1_i64.to_be_bytes(),
            b"adapter:local:git-commit",
            b"lnsat.git-reference-adapter.protocol.v1",
            &tool_arguments_digest,
            b"2026-07-22T20:03:06.000Z",
        ],
    );
    let transaction = fixture
        .store
        .connection
        .transaction()
        .expect("synthetic dispatch transaction must open");
    insert_entity_and_audit(
        &transaction,
        &attempt_id,
        "operation_attempt",
        &history.project_ref,
        &history.resource_ref,
        &attempt_audit_id,
        &attempt_record_digest,
        "persistence_prepared",
        "none",
        "2026-07-22T20:03:06.000Z",
    )
    .expect("synthetic attempt entity must append");
    transaction
        .execute(
            "INSERT INTO lnsat_operation_attempts (
               operation_attempt_id, entity_kind, project_ref, resource_ref,
               operation_id, attempt_sequence, adapter_ref, protocol_version,
               tool_arguments_digest, created_at
             ) VALUES (?1, 'operation_attempt', ?2, ?3, ?4, 1,
               'adapter:local:git-commit', 'lnsat.git-reference-adapter.protocol.v1', ?5,
               '2026-07-22T20:03:06.000Z')",
            params![
                &attempt_id,
                &history.project_ref,
                &history.resource_ref,
                &history.operation_id,
                tool_arguments_digest.as_slice(),
            ],
        )
        .expect("synthetic attempt must append");
    transaction
        .execute(
            "INSERT INTO lnsat_operation_receipts (
               receipt_id, entity_kind, project_ref, resource_ref, operation_id,
               operation_attempt_id, authorization_id, consumption_id,
               requested_action_digest, approved_action_digest,
               authorized_action_digest, executed_action_digest, result_digest,
               receipt_authentication_profile, verification_status, digest_bound,
               received_at
             )
             SELECT ?1, 'operation_receipt', project_ref, resource_ref, operation_id,
               ?2, authorization_id, ?3, requested_action_digest,
               approved_action_digest, authorized_action_digest, authorized_action_digest,
               ?4, 'local_authenticated_adapter_channel', 'accepted', 1,
               '2026-07-22T20:03:10.000Z'
             FROM lnsat_operations WHERE operation_id = ?5",
            params![
                format!("rcp_{:064x}", 92),
                &attempt_id,
                &history.consumption_id,
                vec![0x33_u8; 32],
                &history.operation_id,
            ],
        )
        .expect("synthetic receipt must append");
    let receipt_id = format!("rcp_{:064x}", 92);
    for sequence in 1..=reconciliation_count {
        let reconciliation_sequence = i64::try_from(sequence).expect("sequence must fit SQLite");
        let status = if sequence == reconciliation_count {
            "matched"
        } else {
            "pending"
        };
        let receipt = if status == "matched" {
            Some(&receipt_id)
        } else {
            None
        };
        let digest = if status == "matched" {
            Some(vec![0x33_u8; 32])
        } else {
            None
        };
        transaction
            .execute(
                "INSERT INTO lnsat_operation_reconciliations (
                   reconciliation_id, entity_kind, project_ref, resource_ref,
                   operation_id, operation_attempt_id, receipt_id,
                   reconciliation_sequence, status, observed_result_digest, recorded_at
                 ) VALUES (?1, 'operation_reconciliation', ?2, ?3, ?4, ?5, ?6,
                   ?7, ?8, ?9, '2026-07-22T20:03:11.000Z')",
                params![
                    format!("rec_{sequence:064x}"),
                    &history.project_ref,
                    &history.resource_ref,
                    &history.operation_id,
                    &attempt_id,
                    receipt,
                    reconciliation_sequence,
                    status,
                    digest,
                ],
            )
            .expect("synthetic reconciliation must append");
    }
    let initial_state_id = derived_id(
        "ste_",
        "lnsat.phase7.git-state-event-id.v1",
        &[attempt_id.as_bytes(), b"dispatching", &1_i64.to_be_bytes()],
    );
    insert_operation_attempt_state(
        &transaction,
        &history.project_ref,
        &history.resource_ref,
        &attempt_id,
        "dispatching",
        1,
        None,
        "2026-07-22T20:03:07.000Z",
    );
    insert_operation_attempt_state(
        &transaction,
        &history.project_ref,
        &history.resource_ref,
        &attempt_id,
        "completed",
        2,
        Some((&initial_state_id, 1)),
        "2026-07-22T20:03:12.000Z",
    );
    crate::phase7_consumption::append_phase7_operation_state_event_v1(
        &transaction,
        &history.project_ref,
        &history.resource_ref,
        &history.operation_id,
        "dispatching",
        "2026-07-22T20:03:07.000Z",
    )
    .expect("synthetic operation dispatching state must append");
    crate::phase7_consumption::append_phase7_operation_state_event_v1(
        &transaction,
        &history.project_ref,
        &history.resource_ref,
        &history.operation_id,
        "completed",
        "2026-07-22T20:03:12.000Z",
    )
    .expect("synthetic operation completion state must append");
    transaction
        .commit()
        .expect("synthetic dispatch transaction must commit");
    fixture
        .store
        .connection
        .pragma_update(None, "ignore_check_constraints", false)
        .expect("fixture check mode must restore");
    fixture
        .store
        .connection
        .pragma_update(None, "foreign_keys", true)
        .expect("fixture foreign-key mode must restore");
    attempt_id
}

#[test]
#[allow(clippy::too_many_lines)] // Full graph and privacy assertions share one bounded fixture.
fn action_request_history_projects_full_synthetic_phase7_chain_and_redacts_payload() {
    let mut fixture = HistoryFixture::new();
    let canary = "ACTION_REQUEST_HISTORY_PRIVATE_CANARY_6f8b";
    fixture.packet.intent = canary.to_owned();
    fixture
        .packet
        .constraints
        .get_mut("execution_proposal")
        .expect("proposal")["target"]["identity"]["unsupported_private_path"] =
        serde_json::json!(canary);
    let history = full_history_fixture(&mut fixture);
    let _attempt_id = insert_synthetic_dispatch_history(&mut fixture, &history, 64);

    let record = fixture.read(&history.request_id);
    assert_eq!(record.schema, "lnsat.action_request_record.v1");
    assert_eq!(record.status, "complete");
    assert_eq!(record.evaluation_state, "policy_recorded");
    let evidence = record
        .evidence
        .as_ref()
        .expect("complete record must expose evidence");
    let object = evidence.as_object().expect("evidence must be an object");
    for key in [
        "schema",
        "policy",
        "approvals",
        "approval_decisions",
        "authorization_attempts",
        "authorizations",
        "operations",
        "consumptions",
        "operation_attempts",
        "receipts",
        "reconciliations",
        "states",
    ] {
        assert!(object.contains_key(key), "projection must expose {key}");
    }
    assert_eq!(object["approvals"].as_array().expect("approvals").len(), 2);
    assert_eq!(
        object["approval_decisions"]
            .as_array()
            .expect("decisions")
            .len(),
        2
    );
    assert_eq!(
        object["authorization_attempts"]
            .as_array()
            .expect("attempts")
            .len(),
        2
    );
    assert_eq!(
        object["authorizations"]
            .as_array()
            .expect("authorizations")
            .len(),
        1
    );
    assert_eq!(
        object["operations"].as_array().expect("operations").len(),
        1
    );
    assert_eq!(
        object["consumptions"]
            .as_array()
            .expect("consumptions")
            .len(),
        1
    );
    assert_eq!(
        object["operation_attempts"]
            .as_array()
            .expect("operation attempts")
            .len(),
        1
    );
    assert_eq!(object["receipts"].as_array().expect("receipts").len(), 1);
    assert_eq!(
        object["receipts"][0]["authorization_id"].as_str(),
        Some(history.authorization_id.as_str())
    );
    let reconciliations = object["reconciliations"]
        .as_array()
        .expect("reconciliations");
    assert_eq!(reconciliations.len(), 64);
    for (index, reconciliation) in reconciliations.iter().enumerate() {
        assert_eq!(
            reconciliation["reconciliation_id"],
            format!("rec_{:064x}", index + 1),
            "reconciliations must preserve sequence order"
        );
    }
    assert!(!object["states"].as_array().expect("states").is_empty());

    let encoded = serde_json::to_string(&record).expect("record must serialize");
    for forbidden in [
        canary,
        fixture.owner.raw_session_token.as_str(),
        fixture.owner.raw_csrf_token.as_str(),
        fixture.owner.session.session_id.as_str(),
        PASSWORD,
    ] {
        assert!(
            !encoded.contains(forbidden),
            "projection must redact fixture secret"
        );
    }
    assert!(encoded.len() <= 65_536);
    assert!(fixture.database.path.exists());
}

#[test]
fn action_request_history_overflow_degrades_whole_record() {
    let mut fixture = HistoryFixture::new();
    let history = full_history_fixture(&mut fixture);
    let _attempt_id = insert_synthetic_dispatch_history(&mut fixture, &history, 65);

    let record = fixture.read(&history.request_id);
    assert_eq!(record.status, "degraded");
    assert_eq!(record.evaluation_state, "evaluation_unknown");
    assert!(record.request.is_none());
    assert!(record.evidence.is_none());
    assert!(record.observations.is_empty());
}

#[test]
fn action_request_history_missing_required_child_lineage_degrades_whole_record() {
    let mut fixture = HistoryFixture::new();
    let history = full_history_fixture(&mut fixture);
    let _attempt_id = insert_synthetic_dispatch_history(&mut fixture, &history, 1);
    fixture
        .store
        .connection
        .pragma_update(None, "foreign_keys", false)
        .expect("test-only lineage mutation may disable foreign keys");
    fixture
        .store
        .connection
        .execute_batch("DROP TRIGGER lnsat_approval_decisions_reject_delete;")
        .expect("test-only lineage mutation may remove immutable-row trigger");
    fixture
        .store
        .connection
        .execute(
            "DELETE FROM lnsat_approval_decisions WHERE approval_decision_id = (
               SELECT approval_decision_id FROM lnsat_authorization_attempts
               ORDER BY requested_at LIMIT 1
             )",
            [],
        )
        .expect("test-only missing-child mutation must apply");
    fixture
        .store
        .connection
        .pragma_update(None, "foreign_keys", true)
        .expect("test-only lineage mutation must restore foreign keys");

    let record = fixture.read(&history.request_id);
    assert_eq!(record.status, "degraded");
    assert!(record.request.is_none());
    assert!(record.evidence.is_none());
}

fn assert_degraded(record: &ActionRequestRecordV1) {
    assert_eq!(record.status, "degraded");
    assert!(record.request.is_none());
    assert!(record.evidence.is_none());
}

#[test]
fn action_request_history_foreign_reconciliation_receipt_degrades_whole_record() {
    let mut fixture = HistoryFixture::new();
    let history = full_history_fixture(&mut fixture);
    let _attempt_id = insert_synthetic_dispatch_history(&mut fixture, &history, 1);
    fixture
        .store
        .connection
        .execute_batch(
            "PRAGMA foreign_keys = OFF;
         DROP TRIGGER lnsat_operation_reconciliations_reject_update;
         UPDATE lnsat_operation_reconciliations
         SET receipt_id = 'rcp_ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
         PRAGMA foreign_keys = ON;",
        )
        .expect("test-only foreign receipt mutation must apply");
    assert_degraded(&fixture.read(&history.request_id));
}

#[test]
fn action_request_history_matched_reconciliation_wrong_result_degrades_whole_record() {
    let mut fixture = HistoryFixture::new();
    let history = full_history_fixture(&mut fixture);
    let _attempt_id = insert_synthetic_dispatch_history(&mut fixture, &history, 1);
    fixture
        .store
        .connection
        .execute_batch(
            "PRAGMA foreign_keys = OFF;
         DROP TRIGGER lnsat_operation_reconciliations_reject_update;
         UPDATE lnsat_operation_reconciliations SET observed_result_digest = zeroblob(32);
         PRAGMA foreign_keys = ON;",
        )
        .expect("test-only reconciliation-result mutation must apply");
    assert_degraded(&fixture.read(&history.request_id));
}

#[test]
fn action_request_history_missing_operation_attempt_state_degrades_whole_record() {
    let mut fixture = HistoryFixture::new();
    let history = full_history_fixture(&mut fixture);
    let attempt_id = insert_synthetic_dispatch_history(&mut fixture, &history, 1);
    fixture.store.connection.execute_batch(
        "PRAGMA foreign_keys = OFF;
         DROP TRIGGER lnsat_phase7_state_events_reject_delete;
         DELETE FROM lnsat_phase7_state_events
         WHERE target_entity_id = (SELECT operation_attempt_id FROM lnsat_operation_attempts LIMIT 1);
         PRAGMA foreign_keys = ON;",
    ).expect("test-only missing-state mutation must apply");
    assert!(attempt_id.starts_with("opa_"));
    assert_degraded(&fixture.read(&history.request_id));
}

#[test]
fn action_request_history_completed_operation_without_receipt_degrades_whole_record() {
    let mut fixture = HistoryFixture::new();
    let history = full_history_fixture(&mut fixture);
    let _attempt_id = insert_synthetic_dispatch_history(&mut fixture, &history, 1);
    fixture
        .store
        .connection
        .execute_batch(
            "PRAGMA foreign_keys = OFF;
         DROP TRIGGER lnsat_operation_receipts_reject_delete;
         DELETE FROM lnsat_operation_receipts;
         PRAGMA foreign_keys = ON;",
        )
        .expect("test-only missing-receipt mutation must apply");
    assert_degraded(&fixture.read(&history.request_id));
}

#[test]
fn action_request_history_hidden_wrong_policy_decision_degrades_whole_record() {
    let mut fixture = HistoryFixture::new();
    let history = full_history_fixture(&mut fixture);
    let (_, _, hidden) =
        append_approved_chain(&mut fixture, "2026-07-22T20:00:39Z", "2026-07-22T20:00:40Z");
    fixture.store.connection.execute_batch(
        "PRAGMA foreign_keys = OFF;
         DROP TRIGGER lnsat_approval_decisions_reject_update;
         UPDATE lnsat_approval_decisions
         SET policy_decision_id = 'pol_ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'
         WHERE approval_decision_id = (SELECT approval_decision_id FROM lnsat_approval_decisions ORDER BY decided_at DESC LIMIT 1);
         PRAGMA foreign_keys = ON;",
    ).expect("test-only hidden-decision mutation must apply");
    assert!(hidden.approval_decision_id.starts_with("apd_"));
    assert_degraded(&fixture.read(&history.request_id));
}

#[test]
fn action_request_history_generic_id_and_invalid_calendar_degrade_whole_record() {
    let mut fixture = HistoryFixture::new();
    let history = full_history_fixture(&mut fixture);
    let _attempt_id = insert_synthetic_dispatch_history(&mut fixture, &history, 1);
    fixture.store.connection.execute_batch(
        "PRAGMA foreign_keys = OFF;
         PRAGMA ignore_check_constraints = ON;
         DROP TRIGGER lnsat_operation_reconciliations_reject_update;
         UPDATE lnsat_operation_reconciliations
         SET reconciliation_id = 'generic_0000000000000000000000000000000000000000000000000000000000000000',
             recorded_at = '2026-02-30T20:03:11Z';
         PRAGMA ignore_check_constraints = OFF;
         PRAGMA foreign_keys = ON;",
    ).expect("test-only generic-id calendar mutation must apply");
    assert_degraded(&fixture.read(&history.request_id));
}

#[test]
fn action_request_history_wrong_child_scope_degrades_whole_record() {
    for (table, column, identifier) in [
        (
            "lnsat_approval_decisions",
            "project_ref",
            "approval_decision_id",
        ),
        (
            "lnsat_authorization_attempts",
            "resource_ref",
            "authorization_attempt_id",
        ),
    ] {
        let mut fixture = HistoryFixture::new();
        let history = full_history_fixture(&mut fixture);
        let (policy, request, decision) =
            append_approved_chain(&mut fixture, "2026-07-22T20:00:39Z", "2026-07-22T20:00:40Z");
        let hidden_id = if table == "lnsat_authorization_attempts" {
            let attempt = phase7_attempt_fixture(&fixture.packet, &policy, &request, &decision, 3);
            prepare_phase7_attempt(&mut fixture.store, &attempt)
                .expect("extra unconsumed attempt must append")
                .record
                .authorization_attempt_id
        } else {
            decision.approval_decision_id
        };
        fixture
            .store
            .connection
            .execute_batch(&format!(
                "PRAGMA foreign_keys = OFF; DROP TRIGGER {table}_reject_update;"
            ))
            .expect("test-only scope mutation may remove immutable guard");
        fixture
            .store
            .connection
            .execute(
                &format!("UPDATE {table} SET {column} = ?1 WHERE {identifier} = ?2"),
                rusqlite::params![format!("{column}:foreign"), hidden_id],
            )
            .expect("test-only child scope mutation must apply");
        fixture
            .store
            .connection
            .pragma_update(None, "foreign_keys", true)
            .expect("restore foreign key guard");
        assert_degraded(&fixture.read(&history.request_id));
    }
}
