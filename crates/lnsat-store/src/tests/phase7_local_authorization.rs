use super::*;
use std::sync::{Arc, Barrier};

const OWNER_PASSWORD: &str = "owner password for phase seven local authorization";
const REQUESTER_PASSWORD: &str = "requester password for phase seven local authorization";
const REQUESTER_REF: &str = "identity:human:requester";
const AUTHORIZATION_ISSUED_AT: &str = "2026-07-22T20:03:02.000Z";
const AUTHORIZATION_TTL_EXPIRES_AT: &str = "2026-07-22T20:04:02.000Z";
const OPERATION_IDEMPOTENCY_KEY: &str = "phase7-operation:local-authorization-0001";

struct LocalAuthorizationFixture {
    project_ref: String,
    resource_ref: String,
    authorization_attempt_id: String,
    nonce_id: String,
    requester_session_token: String,
    requester_csrf_token: String,
    approver_session_token: String,
    approver_csrf_token: String,
}

impl LocalAuthorizationFixture {
    fn issue_input(&self) -> Phase7ExecutionAuthorizationIssueInputV1<'_> {
        Phase7ExecutionAuthorizationIssueInputV1 {
            project_ref: &self.project_ref,
            resource_ref: &self.resource_ref,
            authorization_attempt_id: &self.authorization_attempt_id,
            nonce_id: &self.nonce_id,
            operation_idempotency_key: OPERATION_IDEMPOTENCY_KEY,
        }
    }

    fn transition_input<'a>(
        &'a self,
        authorization_id: &'a str,
    ) -> Phase7ExecutionAuthorizationTransitionInputV1<'a> {
        Phase7ExecutionAuthorizationTransitionInputV1 {
            project_ref: &self.project_ref,
            resource_ref: &self.resource_ref,
            authorization_id,
        }
    }
}

fn seed_local_authorization_source(
    store: &mut SqliteStore,
    sequence: u64,
) -> LocalAuthorizationFixture {
    seed_local_authorization_source_with_owner_activity(
        store,
        sequence,
        "2026-07-22T19:50:00Z",
        "2026-07-22T19:51:00Z",
        "2026-07-22T19:52:00Z",
        "audience:gateway:local",
        "2026-07-22T20:15:00Z",
        "2026-07-22T20:08:01.000Z",
    )
}

#[allow(clippy::too_many_arguments)]
fn seed_local_authorization_source_with_owner_activity(
    store: &mut SqliteStore,
    sequence: u64,
    owner_created_at: &str,
    owner_issued_at: &str,
    requester_created_at: &str,
    audience: &str,
    packet_expires_at: &str,
    nonce_expires_at: &str,
) -> LocalAuthorizationFixture {
    store
        .bootstrap_local_owner_v1(&LocalOwnerBootstrapInputV1 {
            identity_ref: "identity:human:owner",
            display_name: "Local Owner",
            password: OWNER_PASSWORD,
            created_at: owner_created_at,
        })
        .expect("owner must bootstrap");
    let owner = store
        .issue_local_session_v1(&LocalSessionIssueInputV1 {
            identity_ref: "identity:human:owner",
            password: OWNER_PASSWORD,
            issued_at: owner_issued_at,
            expires_at: "2026-07-22T20:31:00Z",
        })
        .expect("owner session must issue");
    store
        .create_local_identity_v1(
            &LocalIdentityCreateInputV1 {
                identity_ref: REQUESTER_REF,
                display_name: "Phase Seven Requester",
                role: LocalIdentityRoleV1::Operator,
                password: REQUESTER_PASSWORD,
                created_at: requester_created_at,
            },
            &owner.raw_session_token,
            &owner.raw_csrf_token,
            requester_created_at,
        )
        .expect("requester must create");
    let requester = store
        .issue_local_session_v1(&LocalSessionIssueInputV1 {
            identity_ref: REQUESTER_REF,
            password: REQUESTER_PASSWORD,
            issued_at: "2026-07-22T19:53:00Z",
            expires_at: "2026-07-22T20:33:00Z",
        })
        .expect("requester session must issue");

    let mut packet = packet_fixture();
    packet.permission_allow = vec!["deploy.request".to_owned()];
    packet.actor_ref = REQUESTER_REF.to_owned();
    packet.session_ref = format!("session:local:{}", requester.session.session_id);
    packet.packet_id = format!("pkt_{sequence:064x}");
    packet.idempotency_key = format!("idem_{sequence:064x}");
    packet.expires_at = packet_expires_at.to_owned();
    add_execution_proposal(&mut packet);
    packet
        .constraints
        .get_mut("execution_proposal")
        .and_then(serde_json::Value::as_object_mut)
        .expect("execution proposal must be an object")
        .insert("audience".to_owned(), serde_json::json!(audience));
    let policy = policy_fixture(&packet);
    let request = create_approval_request_v1(&policy, "2026-07-22T20:01:00Z")
        .expect("approval request must derive");
    let decision = decide_approval_request_v1(
        &request,
        &ApprovalDecisionV1Input {
            approver_ref: "identity:human:owner".to_owned(),
            approver_session_ref: format!("session:local:{}", owner.session.session_id),
            decision: ApprovalDecisionV1Kind::Approved,
            reason: ApprovalDecisionV1Reason::OperatorApproved,
            decided_at: "2026-07-22T20:02:00Z".to_owned(),
        },
    )
    .expect("approval decision must derive");
    let attempt = persist_phase7_attempt(store, &packet, &policy, &request, &decision, sequence);
    let nonce = issue_phase7_nonce_at(
        store,
        &attempt,
        u8::try_from(sequence).unwrap_or(0x71),
        "2026-07-22T20:03:01.000Z",
        nonce_expires_at,
    );
    drop(nonce.nonce);

    LocalAuthorizationFixture {
        project_ref: attempt.project_ref,
        resource_ref: attempt.resource_ref,
        authorization_attempt_id: attempt.authorization_attempt_id,
        nonce_id: nonce.record.nonce_id,
        requester_session_token: requester.raw_session_token,
        requester_csrf_token: requester.raw_csrf_token,
        approver_session_token: owner.raw_session_token,
        approver_csrf_token: owner.raw_csrf_token,
    }
}

fn issue_at(
    store: &mut SqliteStore,
    fixture: &LocalAuthorizationFixture,
    entropy: u8,
) -> Result<Phase7ExecutionAuthorizationIssueV1, Phase7PersistenceErrorV1> {
    store.issue_phase7_local_execution_authorization_with_sources_v1(
        &fixture.issue_input(),
        &fixture.requester_session_token,
        &fixture.requester_csrf_token,
        || {
            Ok((
                AUTHORIZATION_ISSUED_AT.to_owned(),
                AUTHORIZATION_TTL_EXPIRES_AT.to_owned(),
            ))
        },
        |bytes| {
            bytes.fill(entropy);
            Ok(())
        },
        || Ok(()),
        || Ok(()),
    )
}

fn table_count(store: &SqliteStore, table: &str) -> i64 {
    store
        .connection
        .query_row(&format!("SELECT count(*) FROM {table}"), [], |row| {
            row.get::<_, i64>(0)
        })
        .expect("table count must read")
}

fn file_contains(path: &Path, needle: &[u8]) -> bool {
    fs::read(path).is_ok_and(|bytes| bytes.windows(needle.len()).any(|window| window == needle))
}

#[test]
#[allow(clippy::too_many_lines)]
fn phase7_local_authorization_issues_once_replays_metadata_and_freezes_wire() {
    let database = TestDatabase::new("phase7-local-authorization-issue");
    let backup = TestDatabase::new("phase7-local-authorization-issue-backup");
    let mut store = SqliteStore::open(&database.path).expect("database must bootstrap");
    let fixture = seed_local_authorization_source(&mut store, 111);
    let mut first = issue_at(&mut store, &fixture, 0x41).expect("authorization must issue");
    assert!(first.created);
    assert!(first.record.active);
    assert_eq!(first.record.state, "active");
    assert_eq!(first.record.issued_at, AUTHORIZATION_ISSUED_AT);
    assert_eq!(first.record.expires_at, AUTHORIZATION_TTL_EXPIRES_AT);
    assert_eq!(first.record.requester_ref, REQUESTER_REF);
    assert_eq!(first.record.audience, "audience:gateway:local");
    let attempt = store
        .read_phase7_authorization_attempt_v1(
            &fixture.project_ref,
            &fixture.resource_ref,
            &fixture.authorization_attempt_id,
        )
        .expect("attempt evidence must read")
        .expect("attempt must exist");
    assert_eq!(first.record.project_ref, attempt.project_ref);
    assert_eq!(first.record.resource_ref, attempt.resource_ref);
    assert_eq!(
        first.record.authorization_attempt_id,
        attempt.authorization_attempt_id
    );
    assert_eq!(first.record.nonce_id, fixture.nonce_id);
    assert_eq!(first.record.binding_digest, attempt.binding_digest);
    assert_eq!(
        first.record.approval_decision_id,
        attempt.approval_decision_id
    );
    assert_eq!(first.record.policy_decision_id, attempt.policy_decision_id);
    assert_eq!(first.record.packet_id, attempt.packet_id);
    assert_eq!(first.record.packet_sha256, attempt.packet_sha256);
    assert_eq!(first.record.requester_ref, attempt.requester_ref);
    assert_eq!(
        first.record.requester_session_ref,
        attempt.requester_session_ref
    );
    assert_eq!(first.record.approver_ref, attempt.approver_ref);
    assert_eq!(
        first.record.approver_session_ref,
        attempt.approver_session_ref
    );
    assert_eq!(first.record.action_digest, attempt.action_digest);
    assert_eq!(first.record.target_digest, attempt.target_digest);
    assert_eq!(
        first.record.configuration_digest,
        attempt.configuration_digest
    );
    assert_eq!(first.record.adapter_ref, attempt.adapter_ref);
    assert_eq!(first.record.executable_digest, attempt.executable_digest);
    assert_eq!(first.record.audience, attempt.audience);
    assert_eq!(table_count(&store, "lnsat_execution_authorizations"), 1);
    assert_eq!(table_count(&store, "lnsat_operations"), 1);
    assert_eq!(table_count(&store, "lnsat_operation_attempts"), 0);
    assert_eq!(table_count(&store, "lnsat_operation_receipts"), 0);
    assert_eq!(table_count(&store, "lnsat_operation_reconciliations"), 0);

    let capability = first
        .capability
        .take()
        .expect("first issue returns capability");
    assert_eq!(
        format!("{capability:?}"),
        "Phase7ExecutionCapabilityV1(<redacted>)"
    );
    let mut wire = capability.into_canonical_wire_v1();
    assert_eq!(
        format!("{wire:?}"),
        "Phase7ExecutionCapabilityWireV1(<redacted>)"
    );
    let exposed = wire.expose_for_authenticated_response_v1();
    assert_eq!(exposed.len(), PHASE7_CAPABILITY_WIRE_HEX_BYTES_V1);
    assert!(
        exposed
            .bytes()
            .all(|byte| byte.is_ascii_digit() || (b'a'..=b'f').contains(&byte))
    );
    let secret = wire.take_secret_v1().expect("canonical wire must decode");
    assert!(wire.expose_for_authenticated_response_v1().is_empty());
    drop(secret);

    let replay = issue_at(&mut store, &fixture, 0x99).expect("exact replay must read");
    assert!(!replay.created);
    assert!(replay.capability.is_none());
    assert_eq!(replay.record, first.record);
    assert!(
        store
            .revoke_local_session_v1(
                &fixture.approver_session_token,
                &fixture.approver_csrf_token,
                "2026-07-22T20:03:10.000Z",
                LocalSessionRevocationReasonV1::SignOut,
            )
            .expect("approver session must revoke after committed issue")
    );
    let replay_after_approver_revocation = store
        .issue_phase7_local_execution_authorization_with_sources_v1(
            &fixture.issue_input(),
            &fixture.requester_session_token,
            &fixture.requester_csrf_token,
            || {
                Ok((
                    "2026-07-22T20:03:11.000Z".to_owned(),
                    "2026-07-22T20:04:11.000Z".to_owned(),
                ))
            },
            |_| Err(Phase7PersistenceErrorV1::EntropyUnavailable),
            || Ok(()),
            || Ok(()),
        )
        .expect("committed replay must return stable metadata");
    assert!(!replay_after_approver_revocation.created);
    assert!(replay_after_approver_revocation.capability.is_none());
    assert_eq!(replay_after_approver_revocation.record, first.record);
    let raw_capability = [0x41; PHASE7_CAPABILITY_BYTES_V1];
    assert!(!file_contains(&database.path, &raw_capability));
    let wal_path = PathBuf::from(format!("{}-wal", database.path.display()));
    assert!(!file_contains(&wal_path, &raw_capability));
    store
        .create_online_backup_v1(&backup.path)
        .expect("authorization metadata must back up");
    assert!(!file_contains(&backup.path, &raw_capability));

    let conflict_input = Phase7ExecutionAuthorizationIssueInputV1 {
        operation_idempotency_key: "phase7-operation:changed-request",
        ..fixture.issue_input()
    };
    assert!(matches!(
        store.issue_phase7_local_execution_authorization_with_sources_v1(
            &conflict_input,
            &fixture.requester_session_token,
            &fixture.requester_csrf_token,
            || Ok((
                AUTHORIZATION_ISSUED_AT.to_owned(),
                AUTHORIZATION_TTL_EXPIRES_AT.to_owned()
            )),
            |_| Err(Phase7PersistenceErrorV1::EntropyUnavailable),
            || Ok(()),
            || Ok(()),
        ),
        Err(Phase7PersistenceErrorV1::IdempotencyConflict)
    ));

    for invalid in ["41", &"A".repeat(PHASE7_CAPABILITY_WIRE_HEX_BYTES_V1)] {
        let mut invalid = invalid.to_owned();
        assert_eq!(
            Phase7CapabilitySecretV1::take_from_canonical_wire_v1(&mut invalid).unwrap_err(),
            Phase7PersistenceErrorV1::InvalidInput
        );
        assert!(invalid.is_empty());
    }
}

#[test]
#[allow(clippy::too_many_lines)]
fn phase7_local_authorization_redeem_requires_exact_live_requester_session() {
    let database = TestDatabase::new("phase7-local-authorization-redeem-session");
    let mut store = SqliteStore::open(&database.path).expect("database must bootstrap");
    let fixture = seed_local_authorization_source(&mut store, 119);
    let mut issued = issue_at(&mut store, &fixture, 0x51).expect("authorization must issue");
    let authorization_id = issued.record.authorization_id.clone();
    let operation_id = issued.record.operation_id.clone();
    let mut wire = issued
        .capability
        .take()
        .expect("capability must exist")
        .into_canonical_wire_v1();
    let input = Phase7CapabilityRedemptionInputV1 {
        project_ref: &fixture.project_ref,
        resource_ref: &fixture.resource_ref,
        authorization_id: &authorization_id,
        operation_id: &operation_id,
        idempotency_key: "phase7-consume:local-session-bound",
    };

    let mut wrong_bytes = [0x51; PHASE7_CAPABILITY_BYTES_V1];
    assert_eq!(
        store.redeem_phase7_local_execution_capability_with_sources_v1(
            &input,
            Phase7CapabilitySecretV1::take_from_bytes(&mut wrong_bytes),
            &fixture.approver_session_token,
            &fixture.approver_csrf_token,
            || Ok("2026-07-22T20:03:30.000Z".to_owned()),
            || Ok(()),
            || Ok(()),
        ),
        Err(Phase7PersistenceErrorV1::RedemptionRejected)
    );
    assert_eq!(wrong_bytes, [0; PHASE7_CAPABILITY_BYTES_V1]);
    assert_eq!(table_count(&store, "lnsat_capability_consumptions"), 0);

    let secret = wire.take_secret_v1().expect("wire must decode");
    let consumed = store
        .redeem_phase7_local_execution_capability_with_sources_v1(
            &input,
            secret,
            &fixture.requester_session_token,
            &fixture.requester_csrf_token,
            || Ok("2026-07-22T20:03:31.000Z".to_owned()),
            || Ok(()),
            || Ok(()),
        )
        .expect("exact requester session must redeem");
    assert!(wire.expose_for_authenticated_response_v1().is_empty());
    assert!(consumed.created);
    assert_eq!(consumed.record.consumed_at, "2026-07-22T20:03:31.000Z");
    let terminal = store
        .read_phase7_execution_authorization_at_v1(
            &fixture.project_ref,
            &fixture.resource_ref,
            &authorization_id,
            "2026-07-22T20:03:32.000Z",
            || Ok(()),
        )
        .expect("consumed authorization must read")
        .expect("authorization must exist");
    assert_eq!(terminal.state, "consumed");
    assert!(!terminal.active);
    assert_eq!(table_count(&store, "lnsat_capability_consumptions"), 1);
    assert_eq!(table_count(&store, "lnsat_operation_attempts"), 0);
    assert_eq!(table_count(&store, "lnsat_operation_receipts"), 0);
    assert_eq!(table_count(&store, "lnsat_operation_reconciliations"), 0);

    let revoked_database = TestDatabase::new("phase7-local-authorization-redeem-revoked");
    let mut revoked_store =
        SqliteStore::open(&revoked_database.path).expect("database must bootstrap");
    let revoked_fixture = seed_local_authorization_source(&mut revoked_store, 126);
    let mut revoked_issue =
        issue_at(&mut revoked_store, &revoked_fixture, 0x58).expect("authorization must issue");
    let mut revoked_wire = revoked_issue
        .capability
        .take()
        .expect("capability must exist")
        .into_canonical_wire_v1();
    assert!(
        revoked_store
            .revoke_local_session_v1(
                &revoked_fixture.requester_session_token,
                &revoked_fixture.requester_csrf_token,
                "2026-07-22T20:03:20.000Z",
                LocalSessionRevocationReasonV1::SignOut,
            )
            .expect("requester session must revoke")
    );
    let revoked_secret = revoked_wire
        .take_secret_v1()
        .expect("capability wire must decode");
    assert_eq!(
        revoked_store.redeem_phase7_local_execution_capability_with_sources_v1(
            &Phase7CapabilityRedemptionInputV1 {
                project_ref: &revoked_fixture.project_ref,
                resource_ref: &revoked_fixture.resource_ref,
                authorization_id: &revoked_issue.record.authorization_id,
                operation_id: &revoked_issue.record.operation_id,
                idempotency_key: "phase7-consume:revoked-requester-session",
            },
            revoked_secret,
            &revoked_fixture.requester_session_token,
            &revoked_fixture.requester_csrf_token,
            || Ok("2026-07-22T20:03:30.000Z".to_owned()),
            || Ok(()),
            || Ok(()),
        ),
        Err(Phase7PersistenceErrorV1::RedemptionRejected)
    );
    assert_eq!(
        table_count(&revoked_store, "lnsat_capability_consumptions"),
        0
    );
}

#[test]
fn phase7_local_authorization_expiry_is_capped_by_approver_idle_window() {
    let database = TestDatabase::new("phase7-local-authorization-idle-cap");
    let mut store = SqliteStore::open(&database.path).expect("database must bootstrap");
    let fixture = seed_local_authorization_source_with_owner_activity(
        &mut store,
        120,
        "2026-07-22T19:45:00Z",
        "2026-07-22T19:46:00Z",
        "2026-07-22T19:48:30.000Z",
        "audience:gateway:local",
        "2026-07-22T20:15:00Z",
        "2026-07-22T20:08:01.000Z",
    );
    let issued = issue_at(&mut store, &fixture, 0x52).expect("authorization must issue");
    assert_eq!(issued.record.expires_at, "2026-07-22T20:03:30.000Z");
    let expired = store
        .read_phase7_execution_authorization_at_v1(
            &fixture.project_ref,
            &fixture.resource_ref,
            &issued.record.authorization_id,
            "2026-07-22T20:03:30.000Z",
            || Ok(()),
        )
        .expect("idle-capped expiry must materialize")
        .expect("authorization must exist");
    assert_eq!(expired.state, "expired");
    assert!(!expired.active);
}

#[test]
#[allow(clippy::too_many_lines)]
fn phase7_local_authorization_rejects_wrong_session_revocation_and_nonce_terminal() {
    let database = TestDatabase::new("phase7-local-authorization-source-denials");
    let mut store = SqliteStore::open(&database.path).expect("database must bootstrap");
    let fixture = seed_local_authorization_source(&mut store, 112);
    assert!(matches!(
        store.issue_phase7_local_execution_authorization_with_sources_v1(
            &fixture.issue_input(),
            &fixture.approver_session_token,
            &fixture.approver_csrf_token,
            || Ok((
                AUTHORIZATION_ISSUED_AT.to_owned(),
                AUTHORIZATION_TTL_EXPIRES_AT.to_owned()
            )),
            |bytes| {
                bytes.fill(0x42);
                Ok(())
            },
            || Ok(()),
            || Ok(()),
        ),
        Err(Phase7PersistenceErrorV1::SourceNotApproved)
    ));
    assert_eq!(table_count(&store, "lnsat_execution_authorizations"), 0);

    assert!(
        store
            .revoke_local_session_v1(
                &fixture.requester_session_token,
                &fixture.requester_csrf_token,
                "2026-07-22T20:03:01.500Z",
                LocalSessionRevocationReasonV1::SignOut,
            )
            .expect("session revoke must persist")
    );
    assert!(matches!(
        issue_at(&mut store, &fixture, 0x43),
        Err(Phase7PersistenceErrorV1::SourceNotApproved)
    ));

    let second_database = TestDatabase::new("phase7-local-authorization-nonce-terminal");
    let mut second = SqliteStore::open(&second_database.path).expect("database must bootstrap");
    let second_fixture = seed_local_authorization_source(&mut second, 113);
    second
        .cancel_phase7_authorization_nonce_at_v1(
            &Phase7AuthorizationNonceCancelInputV1 {
                project_ref: &second_fixture.project_ref,
                resource_ref: &second_fixture.resource_ref,
                nonce_id: &second_fixture.nonce_id,
            },
            "2026-07-22T20:03:01.500Z",
            || Ok(()),
        )
        .expect("nonce cancellation must persist");
    assert!(matches!(
        issue_at(&mut second, &second_fixture, 0x44),
        Err(Phase7PersistenceErrorV1::SourceNotApproved)
    ));
    assert_eq!(table_count(&second, "lnsat_execution_authorizations"), 0);

    let scope_database = TestDatabase::new("phase7-local-authorization-scope-denials");
    let mut scope_store = SqliteStore::open(&scope_database.path).expect("database must bootstrap");
    let scope_fixture = seed_local_authorization_source(&mut scope_store, 121);
    let wrong_scope = Phase7ExecutionAuthorizationIssueInputV1 {
        resource_ref: "repo:wrong-scope",
        ..scope_fixture.issue_input()
    };
    assert!(matches!(
        scope_store.issue_phase7_local_execution_authorization_with_sources_v1(
            &wrong_scope,
            &scope_fixture.requester_session_token,
            &scope_fixture.requester_csrf_token,
            || Ok((
                AUTHORIZATION_ISSUED_AT.to_owned(),
                AUTHORIZATION_TTL_EXPIRES_AT.to_owned()
            )),
            |bytes| {
                bytes.fill(0x53);
                Ok(())
            },
            || Ok(()),
            || Ok(()),
        ),
        Err(Phase7PersistenceErrorV1::SourceNotApproved)
    ));
    assert_eq!(
        table_count(&scope_store, "lnsat_execution_authorizations"),
        0
    );

    let audience_database = TestDatabase::new("phase7-local-authorization-audience-denial");
    let mut audience_store =
        SqliteStore::open(&audience_database.path).expect("database must bootstrap");
    let audience_fixture = seed_local_authorization_source_with_owner_activity(
        &mut audience_store,
        122,
        "2026-07-22T19:50:00Z",
        "2026-07-22T19:51:00Z",
        "2026-07-22T19:52:00Z",
        "audience:gateway:other",
        "2026-07-22T20:15:00Z",
        "2026-07-22T20:08:01.000Z",
    );
    assert!(matches!(
        issue_at(&mut audience_store, &audience_fixture, 0x54),
        Err(Phase7PersistenceErrorV1::SourceNotApproved)
    ));
    assert_eq!(
        table_count(&audience_store, "lnsat_execution_authorizations"),
        0
    );

    let expired_database = TestDatabase::new("phase7-local-authorization-expired-source");
    let mut expired_store =
        SqliteStore::open(&expired_database.path).expect("database must bootstrap");
    let expired_fixture = seed_local_authorization_source_with_owner_activity(
        &mut expired_store,
        125,
        "2026-07-22T19:50:00Z",
        "2026-07-22T19:51:00Z",
        "2026-07-22T19:52:00Z",
        "audience:gateway:local",
        "2026-07-22T20:03:30.000Z",
        "2026-07-22T20:08:01.000Z",
    );
    assert!(matches!(
        expired_store.issue_phase7_local_execution_authorization_with_sources_v1(
            &expired_fixture.issue_input(),
            &expired_fixture.requester_session_token,
            &expired_fixture.requester_csrf_token,
            || {
                Ok((
                    "2026-07-22T20:03:30.000Z".to_owned(),
                    "2026-07-22T20:04:30.000Z".to_owned(),
                ))
            },
            |bytes| {
                bytes.fill(0x57);
                Ok(())
            },
            || Ok(()),
            || Ok(()),
        ),
        Err(Phase7PersistenceErrorV1::SourceNotApproved)
    ));
    assert_eq!(
        table_count(&expired_store, "lnsat_execution_authorizations"),
        0
    );
}

#[test]
#[allow(clippy::too_many_lines)]
fn phase7_local_authorization_cancel_revoke_and_c1_handoff_are_atomic() {
    let database = TestDatabase::new("phase7-local-authorization-cancel");
    let mut store = SqliteStore::open(&database.path).expect("database must bootstrap");
    let fixture = seed_local_authorization_source(&mut store, 114);
    let mut issued = issue_at(&mut store, &fixture, 0x45).expect("authorization must issue");
    let authorization_id = issued.record.authorization_id.clone();
    let operation_id = issued.record.operation_id.clone();
    let mut wire = issued
        .capability
        .take()
        .expect("capability must exist")
        .into_canonical_wire_v1();

    assert!(matches!(
        store.transition_phase7_local_execution_authorization_with_sources_v1(
            &fixture.transition_input(&authorization_id),
            &fixture.approver_session_token,
            &fixture.approver_csrf_token,
            "cancelled",
            || Ok("2026-07-22T20:03:20.000Z".to_owned()),
            || Ok(()),
        ),
        Err(Phase7PersistenceErrorV1::SourceNotApproved)
    ));
    let cancelled = store
        .transition_phase7_local_execution_authorization_with_sources_v1(
            &fixture.transition_input(&authorization_id),
            &fixture.requester_session_token,
            &fixture.requester_csrf_token,
            "cancelled",
            || Ok("2026-07-22T20:03:20.000Z".to_owned()),
            || Ok(()),
        )
        .expect("requester cancellation must persist")
        .expect("authorization must exist");
    assert!(cancelled.changed);
    assert_eq!(cancelled.record.state, "cancelled");
    assert!(!cancelled.record.active);
    let replay = store
        .transition_phase7_local_execution_authorization_with_sources_v1(
            &fixture.transition_input(&authorization_id),
            &fixture.requester_session_token,
            &fixture.requester_csrf_token,
            "cancelled",
            || Ok("2026-07-22T20:03:21.000Z".to_owned()),
            || Ok(()),
        )
        .expect("terminal replay must read")
        .expect("authorization must exist");
    assert!(!replay.changed);

    let secret = wire.take_secret_v1().expect("wire must decode");
    assert_eq!(
        store.redeem_phase7_local_execution_capability_with_sources_v1(
            &Phase7CapabilityRedemptionInputV1 {
                project_ref: &fixture.project_ref,
                resource_ref: &fixture.resource_ref,
                authorization_id: &authorization_id,
                operation_id: &operation_id,
                idempotency_key: "phase7-consume:cancelled",
            },
            secret,
            &fixture.requester_session_token,
            &fixture.requester_csrf_token,
            || Ok("2026-07-22T20:03:22.000Z".to_owned()),
            || Ok(()),
            || Ok(()),
        ),
        Err(Phase7PersistenceErrorV1::RedemptionRejected)
    );
    assert_eq!(table_count(&store, "lnsat_capability_consumptions"), 0);
    assert_eq!(table_count(&store, "lnsat_operation_attempts"), 0);
    assert_eq!(table_count(&store, "lnsat_operation_receipts"), 0);

    let revoke_database = TestDatabase::new("phase7-local-authorization-revoke");
    let mut revoke_store =
        SqliteStore::open(&revoke_database.path).expect("database must bootstrap");
    let revoke_fixture = seed_local_authorization_source(&mut revoke_store, 115);
    let revoked_issue =
        issue_at(&mut revoke_store, &revoke_fixture, 0x46).expect("authorization must issue");
    assert!(matches!(
        revoke_store.transition_phase7_local_execution_authorization_with_sources_v1(
            &revoke_fixture.transition_input(&revoked_issue.record.authorization_id),
            &revoke_fixture.requester_session_token,
            &revoke_fixture.requester_csrf_token,
            "revoked",
            || Ok("2026-07-22T20:03:20.000Z".to_owned()),
            || Ok(()),
        ),
        Err(Phase7PersistenceErrorV1::SourceNotApproved)
    ));
    let revoked = revoke_store
        .transition_phase7_local_execution_authorization_with_sources_v1(
            &revoke_fixture.transition_input(&revoked_issue.record.authorization_id),
            &revoke_fixture.approver_session_token,
            &revoke_fixture.approver_csrf_token,
            "revoked",
            || Ok("2026-07-22T20:03:20.000Z".to_owned()),
            || Ok(()),
        )
        .expect("approver revocation must persist")
        .expect("authorization must exist");
    assert!(revoked.changed);
    assert_eq!(revoked.record.state, "revoked");
}

#[test]
#[allow(clippy::too_many_lines)]
fn phase7_local_authorization_terminal_transition_races_redemption_atomically() {
    for (sequence, state, entropy) in [(123, "cancelled", 0x55), (124, "revoked", 0x56)] {
        let database = TestDatabase::new(state);
        let mut store = SqliteStore::open(&database.path).expect("database must bootstrap");
        let fixture = seed_local_authorization_source(&mut store, sequence);
        let mut issued = issue_at(&mut store, &fixture, entropy).expect("authorization must issue");
        let authorization_id = issued.record.authorization_id.clone();
        let operation_id = issued.record.operation_id.clone();
        let wire = issued
            .capability
            .take()
            .expect("capability must exist")
            .into_canonical_wire_v1();
        drop(store);

        let barrier = Arc::new(Barrier::new(2));
        let transition_barrier = Arc::clone(&barrier);
        let transition_path = database.path.clone();
        let transition_project = fixture.project_ref.clone();
        let transition_resource = fixture.resource_ref.clone();
        let transition_authorization = authorization_id.clone();
        let (transition_token, transition_csrf) = if state == "cancelled" {
            (
                fixture.requester_session_token.clone(),
                fixture.requester_csrf_token.clone(),
            )
        } else {
            (
                fixture.approver_session_token.clone(),
                fixture.approver_csrf_token.clone(),
            )
        };
        let transition_worker = std::thread::spawn(move || {
            let mut store =
                SqliteStore::open(&transition_path).expect("transition store must open");
            transition_barrier.wait();
            store.transition_phase7_local_execution_authorization_with_sources_v1(
                &Phase7ExecutionAuthorizationTransitionInputV1 {
                    project_ref: &transition_project,
                    resource_ref: &transition_resource,
                    authorization_id: &transition_authorization,
                },
                &transition_token,
                &transition_csrf,
                state,
                || Ok("2026-07-22T20:03:30.000Z".to_owned()),
                || Ok(()),
            )
        });

        let redemption_barrier = Arc::clone(&barrier);
        let redemption_path = database.path.clone();
        let redemption_project = fixture.project_ref.clone();
        let redemption_resource = fixture.resource_ref.clone();
        let redemption_authorization = authorization_id.clone();
        let redemption_operation = operation_id.clone();
        let redemption_token = fixture.requester_session_token.clone();
        let redemption_csrf = fixture.requester_csrf_token.clone();
        let redemption_worker = std::thread::spawn(move || {
            let mut store =
                SqliteStore::open(&redemption_path).expect("redemption store must open");
            let mut wire = wire;
            let capability = wire.take_secret_v1().expect("capability wire must decode");
            redemption_barrier.wait();
            store.redeem_phase7_local_execution_capability_with_sources_v1(
                &Phase7CapabilityRedemptionInputV1 {
                    project_ref: &redemption_project,
                    resource_ref: &redemption_resource,
                    authorization_id: &redemption_authorization,
                    operation_id: &redemption_operation,
                    idempotency_key: "phase7-consume:terminal-race",
                },
                capability,
                &redemption_token,
                &redemption_csrf,
                || Ok("2026-07-22T20:03:30.000Z".to_owned()),
                || Ok(()),
                || Ok(()),
            )
        });

        let transition = transition_worker
            .join()
            .expect("transition worker must join");
        let redemption = redemption_worker
            .join()
            .expect("redemption worker must join");
        match (&transition, &redemption) {
            (Ok(Some(transition)), Ok(redemption)) => {
                assert!(!transition.changed);
                assert_eq!(transition.record.state, "consumed");
                assert!(redemption.created);
            }
            (Ok(Some(transition)), Err(Phase7PersistenceErrorV1::RedemptionRejected)) => {
                assert!(transition.changed);
                assert_eq!(transition.record.state, state);
            }
            outcome => panic!("unexpected terminal/redemption race outcome: {outcome:?}"),
        }

        let mut verified = SqliteStore::open(&database.path).expect("database must reopen");
        let terminal = verified
            .read_phase7_execution_authorization_at_v1(
                &fixture.project_ref,
                &fixture.resource_ref,
                &authorization_id,
                "2026-07-22T20:03:31.000Z",
                || Ok(()),
            )
            .expect("terminal authorization must read")
            .expect("authorization must exist");
        assert!(matches!(
            terminal.state.as_str(),
            "cancelled" | "revoked" | "consumed"
        ));
        assert!(!terminal.active);
        assert_eq!(
            table_count(&verified, "lnsat_capability_consumptions"),
            i64::from(terminal.state == "consumed")
        );
        assert_eq!(table_count(&verified, "lnsat_operation_attempts"), 0);
        assert_eq!(table_count(&verified, "lnsat_operation_receipts"), 0);
        verified.verify_schema().expect("race winner must verify");
    }
}

#[test]
fn phase7_local_authorization_rolls_back_and_postcommit_ambiguity_never_reissues() {
    let database = TestDatabase::new("phase7-local-authorization-ambiguity");
    let mut store = SqliteStore::open(&database.path).expect("database must bootstrap");
    let fixture = seed_local_authorization_source(&mut store, 116);
    assert!(matches!(
        store.issue_phase7_local_execution_authorization_with_sources_v1(
            &fixture.issue_input(),
            &fixture.requester_session_token,
            &fixture.requester_csrf_token,
            || Ok((
                AUTHORIZATION_ISSUED_AT.to_owned(),
                AUTHORIZATION_TTL_EXPIRES_AT.to_owned()
            )),
            |bytes| {
                bytes.fill(0x47);
                Ok(())
            },
            || Err(Phase7PersistenceErrorV1::PersistenceFailed),
            || Ok(()),
        ),
        Err(Phase7PersistenceErrorV1::PersistenceFailed)
    ));
    assert_eq!(table_count(&store, "lnsat_execution_authorizations"), 0);
    assert_eq!(table_count(&store, "lnsat_operations"), 0);

    assert!(matches!(
        store.issue_phase7_local_execution_authorization_with_sources_v1(
            &fixture.issue_input(),
            &fixture.requester_session_token,
            &fixture.requester_csrf_token,
            || Ok((
                AUTHORIZATION_ISSUED_AT.to_owned(),
                AUTHORIZATION_TTL_EXPIRES_AT.to_owned()
            )),
            |bytes| {
                bytes.fill(0x48);
                Ok(())
            },
            || Ok(()),
            || Err(Phase7PersistenceErrorV1::PersistenceFailed),
        ),
        Err(Phase7PersistenceErrorV1::OutcomeAmbiguous)
    ));
    assert_eq!(table_count(&store, "lnsat_execution_authorizations"), 1);
    assert_eq!(table_count(&store, "lnsat_operations"), 1);
    let replay = store
        .issue_phase7_local_execution_authorization_with_sources_v1(
            &fixture.issue_input(),
            &fixture.requester_session_token,
            &fixture.requester_csrf_token,
            || {
                Ok((
                    "2026-07-22T20:03:03.000Z".to_owned(),
                    "2026-07-22T20:04:03.000Z".to_owned(),
                ))
            },
            |_| Err(Phase7PersistenceErrorV1::EntropyUnavailable),
            || Ok(()),
            || Ok(()),
        )
        .expect("ambiguous retry must return metadata only");
    assert!(!replay.created);
    assert!(replay.capability.is_none());
}

#[test]
#[allow(clippy::too_many_lines)]
fn phase7_local_authorization_restart_read_expiry_and_concurrency_hold() {
    let database = TestDatabase::new("phase7-local-authorization-restart");
    let mut store = SqliteStore::open(&database.path).expect("database must bootstrap");
    let fixture = seed_local_authorization_source(&mut store, 117);
    let mut issued = issue_at(&mut store, &fixture, 0x49).expect("authorization must issue");
    let authorization_id = issued.record.authorization_id.clone();
    let raw_wire = issued
        .capability
        .take()
        .expect("capability must exist")
        .into_canonical_wire_v1();
    drop(raw_wire);
    drop(store);

    let mut reopened = SqliteStore::open(&database.path).expect("database must reopen");
    let active = reopened
        .read_phase7_execution_authorization_at_v1(
            &fixture.project_ref,
            &fixture.resource_ref,
            &authorization_id,
            "2026-07-22T20:03:30.000Z",
            || Ok(()),
        )
        .expect("metadata must read")
        .expect("authorization must exist");
    assert!(active.active);
    let expired = reopened
        .read_phase7_execution_authorization_at_v1(
            &fixture.project_ref,
            &fixture.resource_ref,
            &authorization_id,
            AUTHORIZATION_TTL_EXPIRES_AT,
            || Ok(()),
        )
        .expect("expiry must materialize")
        .expect("authorization must exist");
    assert_eq!(expired.state, "expired");
    assert!(!expired.active);
    reopened.verify_schema().expect("expired chain must verify");
    drop(reopened);

    let concurrent_database = TestDatabase::new("phase7-local-authorization-concurrency");
    let mut seed_store =
        SqliteStore::open(&concurrent_database.path).expect("database must bootstrap");
    let concurrent_fixture = seed_local_authorization_source(&mut seed_store, 118);
    drop(seed_store);
    let barrier = Arc::new(Barrier::new(8));
    let mut workers = Vec::new();
    for index in 0..8_u8 {
        let path = concurrent_database.path.clone();
        let barrier = Arc::clone(&barrier);
        let project_ref = concurrent_fixture.project_ref.clone();
        let resource_ref = concurrent_fixture.resource_ref.clone();
        let attempt_id = concurrent_fixture.authorization_attempt_id.clone();
        let nonce_id = concurrent_fixture.nonce_id.clone();
        let token = concurrent_fixture.requester_session_token.clone();
        let csrf = concurrent_fixture.requester_csrf_token.clone();
        workers.push(std::thread::spawn(move || {
            let mut worker = SqliteStore::open(&path).expect("worker store must open");
            barrier.wait();
            let result = worker
                .issue_phase7_local_execution_authorization_with_sources_v1(
                    &Phase7ExecutionAuthorizationIssueInputV1 {
                        project_ref: &project_ref,
                        resource_ref: &resource_ref,
                        authorization_attempt_id: &attempt_id,
                        nonce_id: &nonce_id,
                        operation_idempotency_key: OPERATION_IDEMPOTENCY_KEY,
                    },
                    &token,
                    &csrf,
                    || {
                        Ok((
                            AUTHORIZATION_ISSUED_AT.to_owned(),
                            AUTHORIZATION_TTL_EXPIRES_AT.to_owned(),
                        ))
                    },
                    |bytes| {
                        bytes.fill(0x50_u8.wrapping_add(index));
                        Ok(())
                    },
                    || Ok(()),
                    || Ok(()),
                )
                .expect("concurrent issue must create or replay");
            (
                result.created,
                result.capability.is_some(),
                result.record.authorization_id,
            )
        }));
    }
    let results = workers
        .into_iter()
        .map(|worker| worker.join().expect("worker must join"))
        .collect::<Vec<_>>();
    assert_eq!(results.iter().filter(|result| result.0).count(), 1);
    assert_eq!(results.iter().filter(|result| result.1).count(), 1);
    assert!(results.iter().all(|result| result.2 == results[0].2));
    let verified = SqliteStore::open(&concurrent_database.path).expect("database must reopen");
    assert_eq!(table_count(&verified, "lnsat_execution_authorizations"), 1);
    assert_eq!(table_count(&verified, "lnsat_operations"), 1);
    verified
        .verify_schema()
        .expect("concurrent chain must verify");
}
