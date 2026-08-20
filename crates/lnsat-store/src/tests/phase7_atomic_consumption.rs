use super::*;
use crate::phase7_consumption::{Phase7ExecutionSeedInputV1, Phase7ExecutionSeedRecordV1};

const CAPABILITY: [u8; PHASE7_CAPABILITY_BYTES_V1] = [
    0x91, 0x04, 0xc7, 0x5a, 0x2d, 0xe8, 0x33, 0xb6, 0x79, 0x1c, 0xdf, 0x42, 0xa5, 0x68, 0x0b, 0xce,
    0x31, 0xf4, 0x57, 0x9a, 0x0d, 0xc0, 0x83, 0x46, 0xe9, 0xac, 0x6f, 0x12, 0xd5, 0x98, 0x3b, 0xfe,
];
const AUTHORIZATION_ISSUED_AT: &str = "2026-07-22T20:03:02.000Z";
const AUTHORIZATION_EXPIRES_AT: &str = "2026-07-22T20:08:00.000Z";
const CONSUMED_AT: &str = "2026-07-22T20:04:00.000Z";
const IDEMPOTENCY_KEY: &str = "phase7-consume:0001";

#[derive(Clone)]
struct ConsumptionFixture {
    project_ref: String,
    resource_ref: String,
    authorization_id: String,
    operation_id: String,
    capability: [u8; PHASE7_CAPABILITY_BYTES_V1],
}

impl ConsumptionFixture {
    fn input<'a>(&'a self, idempotency_key: &'a str) -> Phase7CapabilityRedemptionInputV1<'a> {
        Phase7CapabilityRedemptionInputV1 {
            project_ref: &self.project_ref,
            resource_ref: &self.resource_ref,
            authorization_id: &self.authorization_id,
            operation_id: &self.operation_id,
            idempotency_key,
        }
    }

    fn secret(&self) -> Phase7CapabilitySecretV1 {
        let mut source = self.capability;
        let secret = Phase7CapabilitySecretV1::take_from_bytes(&mut source);
        assert_eq!(source, [0; PHASE7_CAPABILITY_BYTES_V1]);
        secret
    }
}

fn seed_consumption_fixture(store: &mut SqliteStore, sequence: u64) -> ConsumptionFixture {
    let (packet, policy, request, decision) = approval_decision_fixture();
    let attempt = persist_phase7_attempt(store, &packet, &policy, &request, &decision, sequence);
    let nonce = issue_phase7_nonce_at(
        store,
        &attempt,
        0x62,
        "2026-07-22T20:03:01.000Z",
        "2026-07-22T20:08:01.000Z",
    );
    finish_consumption_fixture(store, &attempt, &nonce, sequence, CAPABILITY)
}

fn finish_consumption_fixture(
    store: &mut SqliteStore,
    attempt: &Phase7AttemptFixture,
    nonce: &Phase7AuthorizationNonceIssueV1,
    sequence: u64,
    capability: [u8; PHASE7_CAPABILITY_BYTES_V1],
) -> ConsumptionFixture {
    let operation_idempotency_key = format!("phase7-operation:{sequence:04}");
    let Phase7ExecutionSeedRecordV1 {
        authorization_id,
        operation_id,
    } = store
        .seed_phase7_execution_authorization_and_operation_v1(
            &Phase7ExecutionSeedInputV1 {
                project_ref: &attempt.project_ref,
                resource_ref: &attempt.resource_ref,
                authorization_attempt_id: &attempt.authorization_attempt_id,
                nonce_id: &nonce.record.nonce_id,
                operation_idempotency_key: &operation_idempotency_key,
                issued_at: AUTHORIZATION_ISSUED_AT,
                expires_at: AUTHORIZATION_EXPIRES_AT,
            },
            &capability,
        )
        .expect("test-only authorization and operation must seed");
    store
        .verify_schema()
        .expect("seeded Phase 7 chain must verify");
    ConsumptionFixture {
        project_ref: attempt.project_ref.clone(),
        resource_ref: attempt.resource_ref.clone(),
        authorization_id,
        operation_id,
        capability,
    }
}

fn seed_distinct_consumption_fixture(store: &mut SqliteStore, sequence: u64) -> ConsumptionFixture {
    let (packet, policy, request, decision) = distinct_approval_decision_fixture(sequence);
    let attempt = persist_phase7_attempt(store, &packet, &policy, &request, &decision, sequence);
    let nonce = issue_phase7_nonce_at(
        store,
        &attempt,
        0x63,
        "2026-07-22T20:03:01.000Z",
        "2026-07-22T20:08:01.000Z",
    );
    let mut capability = CAPABILITY;
    capability[PHASE7_CAPABILITY_BYTES_V1 - 1] ^= 0x55;
    finish_consumption_fixture(store, &attempt, &nonce, sequence, capability)
}

fn redeem_at(
    store: &mut SqliteStore,
    fixture: &ConsumptionFixture,
    idempotency_key: &str,
    checked_at: &str,
) -> Result<Phase7CapabilityConsumptionWriteV1, Phase7PersistenceErrorV1> {
    store.redeem_phase7_execution_capability_with_sources_v1(
        &fixture.input(idempotency_key),
        fixture.secret(),
        || Ok(checked_at.to_owned()),
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
        .expect("table count must inspect")
}

fn file_contains(path: &Path, needle: &[u8]) -> bool {
    fs::read(path).is_ok_and(|bytes| bytes.windows(needle.len()).any(|window| window == needle))
}

fn hex_bytes(bytes: &[u8]) -> String {
    let mut encoded = String::with_capacity(bytes.len() * 2);
    for byte in bytes {
        write!(&mut encoded, "{byte:02x}").expect("writing test vector cannot fail");
    }
    encoded
}

fn audit_record_digest(store: &SqliteStore, record_id: &str) -> Vec<u8> {
    store
        .connection
        .query_row(
            "SELECT record_digest FROM lnsat_phase7_audit_bindings WHERE record_id = ?1",
            [record_id],
            |row| row.get::<_, Vec<u8>>(0),
        )
        .expect("golden audit digest must read")
}

fn state_event_vector(store: &SqliteStore, target_id: &str, state: &str) -> (String, Vec<u8>) {
    store
        .connection
        .query_row(
            "SELECT state_event_id, record_digest
             FROM lnsat_phase7_state_events
             JOIN lnsat_phase7_audit_bindings ON record_id = state_event_id
             WHERE target_entity_id = ?1 AND state = ?2",
            [target_id, state],
            |row| Ok((row.get::<_, String>(0)?, row.get::<_, Vec<u8>>(1)?)),
        )
        .expect("golden state event must read")
}

fn assert_digest_only_and_never_dispatched(store: &SqliteStore) {
    assert_eq!(table_count(store, "lnsat_operation_attempts"), 0);
    assert_eq!(table_count(store, "lnsat_operation_receipts"), 0);
    assert_eq!(table_count(store, "lnsat_operation_reconciliations"), 0);
    for table in [
        "lnsat_execution_authorizations",
        "lnsat_capability_consumptions",
        "lnsat_phase7_audit_bindings",
    ] {
        let mut columns = store
            .connection
            .prepare(&format!("PRAGMA table_info({table})"))
            .expect("capability evidence columns must prepare");
        let names = columns
            .query_map([], |row| row.get::<_, String>(1))
            .expect("capability evidence columns must query")
            .collect::<rusqlite::Result<Vec<_>>>()
            .expect("capability evidence columns must decode");
        assert!(names.iter().all(|name| {
            !name.contains("raw") && !name.contains("secret") && !name.contains("token")
        }));
    }
}

fn assert_wrong_replay_is_non_oracular(
    store: &mut SqliteStore,
    fixture: &ConsumptionFixture,
    entity_count: i64,
    audit_count: i64,
    state_count: i64,
) {
    let mut wrong_replay_bytes = fixture.capability;
    wrong_replay_bytes[0] ^= 1;
    let wrong_replay = store.redeem_phase7_execution_capability_with_sources_v1(
        &fixture.input(IDEMPOTENCY_KEY),
        Phase7CapabilitySecretV1::take_from_bytes(&mut wrong_replay_bytes),
        || Ok("2026-07-22T20:09:00.001Z".to_owned()),
        || Ok(()),
        || Ok(()),
    );
    assert_eq!(
        wrong_replay,
        Err(Phase7PersistenceErrorV1::RedemptionRejected)
    );
    assert_eq!(wrong_replay_bytes, [0; PHASE7_CAPABILITY_BYTES_V1]);
    assert_eq!(table_count(store, "lnsat_phase7_entities"), entity_count);
    assert_eq!(
        table_count(store, "lnsat_phase7_audit_bindings"),
        audit_count
    );
    assert_eq!(table_count(store, "lnsat_phase7_state_events"), state_count);
}

fn assert_stable_consumption_error_codes() {
    assert_eq!(
        Phase7PersistenceErrorV1::RedemptionRejected.code(),
        "phase7_persistence.redemption_rejected"
    );
    assert_eq!(
        Phase7PersistenceErrorV1::OutcomeAmbiguous.code(),
        "phase7_persistence.outcome_ambiguous"
    );
}

#[test]
fn phase7_atomic_consumption_golden_vectors_lock_framing_and_field_order() {
    let database = TestDatabase::new("phase7-capability-vectors");
    let mut store = SqliteStore::open(&database.path).expect("database must bootstrap");
    let fixture = seed_consumption_fixture(&mut store, 90);
    let result = redeem_at(&mut store, &fixture, IDEMPOTENCY_KEY, CONSUMED_AT)
        .expect("vector capability must consume");
    let capability_digest = store
        .connection
        .query_row(
            "SELECT capability_digest FROM lnsat_capability_consumptions",
            [],
            |row| row.get::<_, Vec<u8>>(0),
        )
        .expect("vector digest must read");
    let consumption_record_digest = audit_record_digest(&store, &result.record.consumption_id);
    let state_record_digest =
        audit_record_digest(&store, &result.record.authorization_state_event_id);
    let authorization_record_digest = audit_record_digest(&store, &fixture.authorization_id);
    let operation_record_digest = audit_record_digest(&store, &fixture.operation_id);
    let (authorization_active_event_id, authorization_active_record_digest) =
        state_event_vector(&store, &fixture.authorization_id, "active");
    let (operation_prepared_event_id, operation_prepared_record_digest) =
        state_event_vector(&store, &fixture.operation_id, "prepared");
    assert_eq!(
        fixture.authorization_id,
        "xau_6bd41143f23cbfd9ead89abf1af75ec6b581a56b81bb19e6e58bd7152275b457"
    );
    assert_eq!(
        fixture.operation_id,
        "opn_15cad2a60a87a3853159b22b0f1bacdf931a96df4638f7b7ee9737e65b0c0cd8"
    );
    assert_eq!(
        hex_bytes(&capability_digest),
        "451f9c3d9087c6f5b7c64aa2c6a889d9faff1e4320716f68a05e97422873ae16"
    );
    assert_eq!(
        hex_bytes(&result.record.binding_digest),
        "03606405e598142582914ed2eee62b3d0426dea3cbec96f6aa2b162ed1bef511"
    );
    assert_eq!(
        hex_bytes(&result.record.request_digest),
        "062d29778e333cdcd09455d0f6d14d4bfdffac8333b25e25448f8806eb6a7be8"
    );
    assert_eq!(
        result.record.consumption_id,
        "cpc_b534441a9fe91e12a37e72144ff4cc6adb5ccb9060d14ae3233191943fe0f0e3"
    );
    assert_eq!(
        result.record.audit_binding_id,
        "p7a_9503aaca4a9a2004bb2c909562bf0a0ef6e1e2db4b2e4b52add5b4353e8d73f1"
    );
    assert_eq!(
        result.record.authorization_state_event_id,
        "ste_f7a58aa176cfd1e2ec2811bbf0a28da558945785544f38c345001d6f2822a8c7"
    );
    assert_eq!(
        result.record.authorization_state_audit_binding_id,
        "p7a_2eb14a36732c76f386695091564f290f205ed5a15c7f3d77eb6ff13f0e80fd10"
    );
    assert_eq!(
        hex_bytes(&consumption_record_digest),
        "907e534968bd3f27c4e12c1dbb76e3556b91d51df6c5e122f34a27cbbcedf317"
    );
    assert_eq!(
        hex_bytes(&state_record_digest),
        "aed14e5048f578fde87140c5767049bd67642bed9b323981e43db357bdce8c11"
    );
    assert_eq!(
        hex_bytes(&authorization_record_digest),
        "1e38e87b96d61cee7b16651c17a9adccfc6c6a086d6f64132be83ff0ec5c11e6"
    );
    assert_eq!(
        hex_bytes(&operation_record_digest),
        "af9f357b96af58bddd7bde6ddf6915e9cf3a5acd9a0c30b4ebeb53da407e9741"
    );
    assert_eq!(
        authorization_active_event_id,
        "ste_263db40ae57a239817e02e6067f28976ed55ed20abc83d4ec71401647108fd2b"
    );
    assert_eq!(
        hex_bytes(&authorization_active_record_digest),
        "4b89cac6d20759921e6576e391218a0e0110d0d7d51df677aa08234a9c7fbca6"
    );
    assert_eq!(
        operation_prepared_event_id,
        "ste_3ab0be1a5e8719eabe8e7bfa4b82d94083a6dd5b003c7a3d0255e5e2eb024983"
    );
    assert_eq!(
        hex_bytes(&operation_prepared_record_digest),
        "49e7be5974e1fc6f02931ef10c401a4bc3eb29b62de3ff7402482312164022a4"
    );
}

#[test]
fn phase7_atomic_consumption_commits_once_replays_and_never_dispatches() {
    assert_stable_consumption_error_codes();
    let database = TestDatabase::new("phase7-capability-consume");
    let mut store = SqliteStore::open(&database.path).expect("database must bootstrap");
    let fixture = seed_consumption_fixture(&mut store, 90);
    let secret = fixture.secret();
    assert_eq!(
        format!("{secret:?}"),
        "Phase7CapabilitySecretV1(<redacted>)"
    );
    let first = store
        .redeem_phase7_execution_capability_with_sources_v1(
            &fixture.input(IDEMPOTENCY_KEY),
            secret,
            || Ok(CONSUMED_AT.to_owned()),
            || Ok(()),
            || Ok(()),
        )
        .expect("correct capability must consume");
    assert!(first.created);
    assert_eq!(first.record.authorization_state_sequence, 2);
    assert_eq!(first.record.consumed_at, CONSUMED_AT);
    assert_eq!(table_count(&store, "lnsat_capability_consumptions"), 1);
    assert_digest_only_and_never_dispatched(&store);
    let entity_count = table_count(&store, "lnsat_phase7_entities");
    let audit_count = table_count(&store, "lnsat_phase7_audit_bindings");
    let state_count = table_count(&store, "lnsat_phase7_state_events");

    let replay = redeem_at(
        &mut store,
        &fixture,
        IDEMPOTENCY_KEY,
        "2026-07-22T20:09:00.000Z",
    )
    .expect("exact replay must return original after expiry");
    assert!(!replay.created);
    assert_eq!(replay.record, first.record);
    assert_eq!(table_count(&store, "lnsat_capability_consumptions"), 1);
    assert_eq!(table_count(&store, "lnsat_phase7_entities"), entity_count);
    assert_eq!(
        table_count(&store, "lnsat_phase7_audit_bindings"),
        audit_count
    );
    assert_eq!(
        table_count(&store, "lnsat_phase7_state_events"),
        state_count
    );
    assert_wrong_replay_is_non_oracular(
        &mut store,
        &fixture,
        entity_count,
        audit_count,
        state_count,
    );
    assert_eq!(
        redeem_at(
            &mut store,
            &fixture,
            IDEMPOTENCY_KEY,
            "2026-07-22T20:03:59.999Z",
        ),
        Err(Phase7PersistenceErrorV1::ClockRejected)
    );

    let conflicting_operation = format!("opn_{}", "f".repeat(64));
    let conflicting = Phase7CapabilityRedemptionInputV1 {
        project_ref: &fixture.project_ref,
        resource_ref: &fixture.resource_ref,
        authorization_id: &fixture.authorization_id,
        operation_id: &conflicting_operation,
        idempotency_key: IDEMPOTENCY_KEY,
    };
    assert_eq!(
        store.redeem_phase7_execution_capability_with_sources_v1(
            &conflicting,
            fixture.secret(),
            || Ok("2026-07-22T20:09:01.000Z".to_owned()),
            || Ok(()),
            || Ok(()),
        ),
        Err(Phase7PersistenceErrorV1::IdempotencyConflict)
    );
    assert_eq!(
        redeem_at(
            &mut store,
            &fixture,
            "phase7-consume:different-key",
            "2026-07-22T20:09:01.000Z",
        ),
        Err(Phase7PersistenceErrorV1::RedemptionRejected)
    );
    store
        .verify_schema()
        .expect("committed consumption must verify");
}

#[test]
fn phase7_atomic_consumption_collapses_wrong_missing_and_cross_scope_denials() {
    let database = TestDatabase::new("phase7-capability-denials");
    let mut store = SqliteStore::open(&database.path).expect("database must bootstrap");
    let fixture = seed_consumption_fixture(&mut store, 91);
    let mut first_bit = fixture.capability;
    first_bit[0] ^= 1;
    let mut last_bit = fixture.capability;
    last_bit[PHASE7_CAPABILITY_BYTES_V1 - 1] ^= 1;

    for wrong in [first_bit, last_bit] {
        let mut source = wrong;
        let result = store.redeem_phase7_execution_capability_with_sources_v1(
            &fixture.input(IDEMPOTENCY_KEY),
            Phase7CapabilitySecretV1::take_from_bytes(&mut source),
            || Ok(CONSUMED_AT.to_owned()),
            || Ok(()),
            || Ok(()),
        );
        assert_eq!(result, Err(Phase7PersistenceErrorV1::RedemptionRejected));
        assert_eq!(source, [0; PHASE7_CAPABILITY_BYTES_V1]);
    }

    let missing_authorization = format!("xau_{}", "f".repeat(64));
    let missing = Phase7CapabilityRedemptionInputV1 {
        project_ref: &fixture.project_ref,
        resource_ref: &fixture.resource_ref,
        authorization_id: &missing_authorization,
        operation_id: &fixture.operation_id,
        idempotency_key: IDEMPOTENCY_KEY,
    };
    let cross_scope = Phase7CapabilityRedemptionInputV1 {
        project_ref: &fixture.project_ref,
        resource_ref: "resource:other",
        authorization_id: &fixture.authorization_id,
        operation_id: &fixture.operation_id,
        idempotency_key: IDEMPOTENCY_KEY,
    };
    for input in [missing, cross_scope] {
        assert_eq!(
            store.redeem_phase7_execution_capability_with_sources_v1(
                &input,
                fixture.secret(),
                || Ok(CONSUMED_AT.to_owned()),
                || Ok(()),
                || Ok(()),
            ),
            Err(Phase7PersistenceErrorV1::RedemptionRejected)
        );
    }
    let other = seed_distinct_consumption_fixture(&mut store, 191);
    let mismatched_operation = Phase7CapabilityRedemptionInputV1 {
        project_ref: &fixture.project_ref,
        resource_ref: &fixture.resource_ref,
        authorization_id: &fixture.authorization_id,
        operation_id: &other.operation_id,
        idempotency_key: IDEMPOTENCY_KEY,
    };
    assert_eq!(
        store.redeem_phase7_execution_capability_with_sources_v1(
            &mismatched_operation,
            fixture.secret(),
            || Ok(CONSUMED_AT.to_owned()),
            || Ok(()),
            || Ok(()),
        ),
        Err(Phase7PersistenceErrorV1::RedemptionRejected)
    );
    assert_eq!(table_count(&store, "lnsat_capability_consumptions"), 0);
    assert_eq!(
        store
            .connection
            .query_row(
                "SELECT count(*) FROM lnsat_phase7_state_events
                 WHERE target_entity_kind = 'execution_authorization'",
                [],
                |row| row.get::<_, i64>(0),
            )
            .expect("authorization state count must inspect"),
        2
    );
}

#[test]
fn phase7_atomic_consumption_rejects_cancelled_revoked_and_expired_authorizations() {
    let boundary_database = TestDatabase::new("phase7-capability-expiry-boundary");
    let mut boundary_store =
        SqliteStore::open(&boundary_database.path).expect("database must bootstrap");
    let boundary = seed_consumption_fixture(&mut boundary_store, 194);
    assert_eq!(
        redeem_at(
            &mut boundary_store,
            &boundary,
            IDEMPOTENCY_KEY,
            AUTHORIZATION_EXPIRES_AT,
        ),
        Err(Phase7PersistenceErrorV1::RedemptionRejected),
        "expiry boundary must be half-open"
    );

    for (sequence, state, effective_at, checked_at) in [
        (92, "cancelled", "2026-07-22T20:03:30.000Z", CONSUMED_AT),
        (93, "revoked", "2026-07-22T20:03:31.000Z", CONSUMED_AT),
        (
            94,
            "expired",
            AUTHORIZATION_EXPIRES_AT,
            AUTHORIZATION_EXPIRES_AT,
        ),
    ] {
        let database = TestDatabase::new(&format!("phase7-capability-{state}"));
        let mut store = SqliteStore::open(&database.path).expect("database must bootstrap");
        let fixture = seed_consumption_fixture(&mut store, sequence);
        store
            .append_phase7_authorization_terminal_for_test_v1(
                &fixture.project_ref,
                &fixture.resource_ref,
                &fixture.authorization_id,
                state,
                effective_at,
            )
            .expect("terminal authorization state must append");
        assert_eq!(
            redeem_at(&mut store, &fixture, IDEMPOTENCY_KEY, checked_at),
            Err(Phase7PersistenceErrorV1::RedemptionRejected),
            "{state} must share non-oracular rejection"
        );
        assert_eq!(table_count(&store, "lnsat_capability_consumptions"), 0);
        store
            .verify_schema()
            .expect("terminal authorization evidence must verify");
    }
}

#[test]
fn phase7_atomic_consumption_rolls_back_precommit_and_required_audit_failures() {
    let database = TestDatabase::new("phase7-capability-rollback");
    let mut store = SqliteStore::open(&database.path).expect("database must bootstrap");
    let fixture = seed_consumption_fixture(&mut store, 95);
    let entity_count = table_count(&store, "lnsat_phase7_entities");
    let audit_count = table_count(&store, "lnsat_phase7_audit_bindings");
    assert_eq!(
        store.redeem_phase7_execution_capability_with_sources_v1(
            &fixture.input(IDEMPOTENCY_KEY),
            fixture.secret(),
            || Ok(CONSUMED_AT.to_owned()),
            || Err(Phase7PersistenceErrorV1::PersistenceFailed),
            || Ok(()),
        ),
        Err(Phase7PersistenceErrorV1::PersistenceFailed)
    );
    assert_eq!(table_count(&store, "lnsat_capability_consumptions"), 0);
    assert_eq!(table_count(&store, "lnsat_phase7_entities"), entity_count);
    assert_eq!(
        table_count(&store, "lnsat_phase7_audit_bindings"),
        audit_count
    );

    store
        .connection
        .execute_batch(
            "CREATE TEMP TRIGGER phase7_test_reject_consumption_audit
             BEFORE INSERT ON lnsat_phase7_audit_bindings
             WHEN NEW.event_kind = 'capability_consumption_recorded'
             BEGIN
               SELECT RAISE(ABORT, 'required consumption audit unavailable');
             END;",
        )
        .expect("isolated audit failure trigger must install");
    assert_eq!(
        redeem_at(&mut store, &fixture, IDEMPOTENCY_KEY, CONSUMED_AT),
        Err(Phase7PersistenceErrorV1::PersistenceFailed)
    );
    assert_eq!(table_count(&store, "lnsat_capability_consumptions"), 0);
    assert_eq!(table_count(&store, "lnsat_phase7_entities"), entity_count);
    assert_eq!(
        table_count(&store, "lnsat_phase7_audit_bindings"),
        audit_count
    );
    store
        .connection
        .execute_batch("DROP TRIGGER phase7_test_reject_consumption_audit;")
        .expect("isolated audit failure trigger must drop");
    store
        .verify_schema()
        .expect("rolled-back chain must remain valid");
}

#[test]
fn phase7_atomic_consumption_ambiguous_response_reopens_and_backup_restores_consumed() {
    let database = TestDatabase::new("phase7-capability-ambiguous");
    let backup = TestDatabase::new("phase7-capability-backup");
    let restored = TestDatabase::new("phase7-capability-restored");
    let mut store = SqliteStore::open(&database.path).expect("database must bootstrap");
    let fixture = seed_consumption_fixture(&mut store, 96);
    assert_eq!(
        store.redeem_phase7_execution_capability_with_sources_v1(
            &fixture.input(IDEMPOTENCY_KEY),
            fixture.secret(),
            || Ok(CONSUMED_AT.to_owned()),
            || Ok(()),
            || Err(Phase7PersistenceErrorV1::PersistenceFailed),
        ),
        Err(Phase7PersistenceErrorV1::OutcomeAmbiguous)
    );
    assert_eq!(table_count(&store, "lnsat_capability_consumptions"), 1);
    assert!(!file_contains(&database.path, &fixture.capability));
    let wal_path = PathBuf::from(format!("{}-wal", database.path.display()));
    assert!(!file_contains(&wal_path, &fixture.capability));
    drop(store);

    let mut reopened = SqliteStore::open(&database.path).expect("database must reopen");
    let replay = redeem_at(
        &mut reopened,
        &fixture,
        IDEMPOTENCY_KEY,
        "2026-07-22T20:04:01.000Z",
    )
    .expect("reconciliation retry must return committed record");
    assert!(!replay.created);
    reopened
        .create_online_backup_v1(&backup.path)
        .expect("consumed database must back up");
    assert!(!file_contains(&backup.path, &fixture.capability));
    SqliteStore::restore_backup_v1(&backup.path, &restored.path)
        .expect("consumed backup must restore inertly");
    assert!(!file_contains(&restored.path, &fixture.capability));
    let mut restored_store =
        SqliteStore::open(&restored.path).expect("restored database must verify");
    let restored_replay = redeem_at(
        &mut restored_store,
        &fixture,
        IDEMPOTENCY_KEY,
        "2026-07-22T20:04:02.000Z",
    )
    .expect("restored consumed state must reconcile");
    assert!(!restored_replay.created);
    assert_eq!(restored_replay.record, replay.record);
}

#[test]
fn phase7_atomic_consumption_blocks_replace_and_detects_digest_tamper() {
    let database = TestDatabase::new("phase7-capability-replace");
    let mut store = SqliteStore::open(&database.path).expect("database must bootstrap");
    let fixture = seed_consumption_fixture(&mut store, 97);
    let committed = redeem_at(&mut store, &fixture, IDEMPOTENCY_KEY, CONSUMED_AT)
        .expect("capability must consume");
    assert_eq!(
        pragma_i64(&store.connection, "recursive_triggers")
            .expect("recursive trigger mode must inspect"),
        1
    );
    let replace = store
        .connection
        .execute(
            "INSERT OR REPLACE INTO lnsat_capability_consumptions
             SELECT * FROM lnsat_capability_consumptions
             WHERE consumption_id = ?1",
            [&committed.record.consumption_id],
        )
        .expect_err("replacement must not erase immutable consumption");
    assert!(
        replace
            .to_string()
            .contains("capability consumptions are immutable")
    );
    assert_eq!(table_count(&store, "lnsat_capability_consumptions"), 1);
    let stored_id = store
        .connection
        .query_row(
            "SELECT consumption_id FROM lnsat_capability_consumptions",
            [],
            |row| row.get::<_, String>(0),
        )
        .expect("original consumption must remain");
    assert_eq!(stored_id, committed.record.consumption_id);
    store
        .verify_schema()
        .expect("replacement rejection must preserve evidence");

    store
        .connection
        .execute_batch(
            "DROP TRIGGER lnsat_capability_consumptions_reject_update;
             UPDATE lnsat_capability_consumptions
             SET request_digest = zeroblob(32);
             CREATE TRIGGER lnsat_capability_consumptions_reject_update
             BEFORE UPDATE ON lnsat_capability_consumptions
             BEGIN
               SELECT RAISE(ABORT, 'capability consumptions are immutable');
             END;",
        )
        .expect("isolated digest tamper must inject and restore trigger");
    assert_eq!(
        store.verify_schema(),
        Err(SqliteStoreError::MigrationDrift),
        "request/idempotency evidence drift must fail closed"
    );
}

#[test]
fn phase7_atomic_consumption_reopen_rejects_authorization_nonce_chain_mismatch() {
    let database = TestDatabase::new("phase7-capability-nonce-mismatch");
    let mut store = SqliteStore::open(&database.path).expect("database must bootstrap");
    let fixture = seed_consumption_fixture(&mut store, 192);
    let mismatched_nonce_id = format!("non_{}", "f".repeat(64));
    store
        .connection
        .pragma_update(None, "foreign_keys", false)
        .expect("isolated mismatch test must disable foreign keys");
    store
        .connection
        .execute_batch("DROP TRIGGER lnsat_execution_authorizations_reject_update;")
        .expect("isolated mismatch test must remove update guard");
    store
        .connection
        .execute(
            "UPDATE lnsat_execution_authorizations
             SET nonce_id = ?1
             WHERE authorization_id = ?2",
            params![&mismatched_nonce_id, &fixture.authorization_id],
        )
        .expect("isolated nonce mismatch must inject");
    store
        .connection
        .execute_batch(
            "CREATE TRIGGER lnsat_execution_authorizations_reject_update
             BEFORE UPDATE ON lnsat_execution_authorizations
             BEGIN
               SELECT RAISE(ABORT, 'execution authorizations are immutable');
             END;",
        )
        .expect("authorization update guard must restore");
    store
        .connection
        .pragma_update(None, "foreign_keys", true)
        .expect("foreign keys must restore");
    assert_eq!(
        store.verify_schema(),
        Err(SqliteStoreError::MigrationDrift),
        "full authorization/nonce/attempt chain must be rederived"
    );
}

#[test]
fn phase7_atomic_consumption_rejects_authorization_seeded_after_nonce_cancellation() {
    let database = TestDatabase::new("phase7-capability-cancelled-nonce-source");
    let mut store = SqliteStore::open(&database.path).expect("database must bootstrap");
    let (packet, policy, request, decision) = approval_decision_fixture();
    let attempt = persist_phase7_attempt(&mut store, &packet, &policy, &request, &decision, 198);
    let nonce = issue_phase7_nonce_at(
        &mut store,
        &attempt,
        0x64,
        "2026-07-22T20:03:01.000Z",
        "2026-07-22T20:08:01.000Z",
    );
    store
        .cancel_phase7_authorization_nonce_at_v1(
            &Phase7AuthorizationNonceCancelInputV1 {
                project_ref: &attempt.project_ref,
                resource_ref: &attempt.resource_ref,
                nonce_id: &nonce.record.nonce_id,
            },
            "2026-07-22T20:03:01.500Z",
            || Ok(()),
        )
        .expect("nonce must cancel before authorization issue");
    assert!(matches!(
        store.seed_phase7_execution_authorization_and_operation_v1(
            &Phase7ExecutionSeedInputV1 {
                project_ref: &attempt.project_ref,
                resource_ref: &attempt.resource_ref,
                authorization_attempt_id: &attempt.authorization_attempt_id,
                nonce_id: &nonce.record.nonce_id,
                operation_idempotency_key: "phase7-operation:cancelled-nonce",
                issued_at: AUTHORIZATION_ISSUED_AT,
                expires_at: AUTHORIZATION_EXPIRES_AT,
            },
            &CAPABILITY,
        ),
        Err(Phase7PersistenceErrorV1::EvidenceDrift)
    ));
    assert_eq!(table_count(&store, "lnsat_execution_authorizations"), 0);
    assert_eq!(table_count(&store, "lnsat_operations"), 0);
    store
        .verify_schema()
        .expect("rejected authorization seed must leave no residue");
}

#[test]
fn phase7_atomic_consumption_reopen_rejects_operation_audit_and_idempotency_tamper() {
    for (sequence, kind) in [(195, "operation"), (196, "audit"), (197, "idempotency")] {
        let database = TestDatabase::new(&format!("phase7-capability-{kind}-tamper"));
        let mut store = SqliteStore::open(&database.path).expect("database must bootstrap");
        let fixture = seed_consumption_fixture(&mut store, sequence);
        redeem_at(&mut store, &fixture, IDEMPOTENCY_KEY, CONSUMED_AT)
            .expect("capability must consume before tamper");
        match kind {
            "operation" => store
                .connection
                .execute_batch(
                    "DROP TRIGGER lnsat_operations_reject_update;
                     UPDATE lnsat_operations SET request_digest = zeroblob(32);
                     CREATE TRIGGER lnsat_operations_reject_update
                     BEFORE UPDATE ON lnsat_operations
                     BEGIN
                       SELECT RAISE(ABORT, 'operations are immutable');
                     END;",
                )
                .expect("isolated operation tamper must inject"),
            "audit" => store
                .connection
                .execute_batch(
                    "DROP TRIGGER lnsat_phase7_audit_bindings_reject_update;
                     UPDATE lnsat_phase7_audit_bindings
                     SET authority_effect = 'none'
                     WHERE event_kind = 'capability_consumption_recorded';
                     CREATE TRIGGER lnsat_phase7_audit_bindings_reject_update
                     BEFORE UPDATE ON lnsat_phase7_audit_bindings
                     BEGIN
                       SELECT RAISE(ABORT, 'phase7 audit bindings are immutable');
                     END;",
                )
                .expect("isolated audit tamper must inject"),
            "idempotency" => store
                .connection
                .execute_batch(
                    "DROP TRIGGER lnsat_capability_consumptions_reject_update;
                     UPDATE lnsat_capability_consumptions
                     SET idempotency_key = 'phase7-consume:tampered';
                     CREATE TRIGGER lnsat_capability_consumptions_reject_update
                     BEFORE UPDATE ON lnsat_capability_consumptions
                     BEGIN
                       SELECT RAISE(ABORT, 'capability consumptions are immutable');
                     END;",
                )
                .expect("isolated idempotency tamper must inject"),
            _ => unreachable!(),
        }
        assert_eq!(
            store.verify_schema(),
            Err(SqliteStoreError::MigrationDrift),
            "{kind} tamper must fail closed"
        );
    }
}

#[test]
fn phase7_atomic_consumption_32_exact_writers_converge_on_one_commit() {
    let database = TestDatabase::new("phase7-capability-exact-race");
    let mut seed_store = SqliteStore::open(&database.path).expect("database must bootstrap");
    let fixture = Arc::new(seed_consumption_fixture(&mut seed_store, 98));
    drop(seed_store);
    let barrier = Arc::new(Barrier::new(32));
    let mut writers = Vec::new();
    for _ in 0..32 {
        let path = database.path.clone();
        let fixture = Arc::clone(&fixture);
        let barrier = Arc::clone(&barrier);
        writers.push(std::thread::spawn(move || {
            let mut store = SqliteStore::open(path).expect("writer database must open");
            barrier.wait();
            redeem_at(&mut store, &fixture, IDEMPOTENCY_KEY, CONSUMED_AT)
        }));
    }
    let results = writers
        .into_iter()
        .map(|writer| writer.join().expect("writer must not panic"))
        .collect::<Vec<_>>();
    assert!(results.iter().all(Result::is_ok));
    assert_eq!(
        results
            .iter()
            .filter(|result| result.as_ref().is_ok_and(|write| write.created))
            .count(),
        1
    );
    assert_eq!(
        results
            .iter()
            .filter(|result| result.as_ref().is_ok_and(|write| !write.created))
            .count(),
        31
    );
    let records = results
        .iter()
        .map(|result| &result.as_ref().expect("exact writer must succeed").record)
        .collect::<Vec<_>>();
    assert!(records.windows(2).all(|pair| pair[0] == pair[1]));
    let store = SqliteStore::open(&database.path).expect("database must reopen");
    assert_eq!(table_count(&store, "lnsat_capability_consumptions"), 1);
    store.verify_schema().expect("race winner must verify");
}

#[test]
fn phase7_atomic_consumption_32_conflicting_writers_choose_one_winner() {
    let database = TestDatabase::new("phase7-capability-conflict-race");
    let mut seed_store = SqliteStore::open(&database.path).expect("database must bootstrap");
    let fixture = Arc::new(seed_consumption_fixture(&mut seed_store, 99));
    drop(seed_store);
    let barrier = Arc::new(Barrier::new(32));
    let mut writers = Vec::new();
    for sequence in 0..32 {
        let path = database.path.clone();
        let fixture = Arc::clone(&fixture);
        let barrier = Arc::clone(&barrier);
        writers.push(std::thread::spawn(move || {
            let mut store = SqliteStore::open(path).expect("writer database must open");
            let idempotency_key = format!("phase7-consume:conflict:{sequence:02}");
            barrier.wait();
            redeem_at(&mut store, &fixture, &idempotency_key, CONSUMED_AT)
        }));
    }
    let mut created = 0;
    let mut rejected = 0;
    for writer in writers {
        match writer.join().expect("writer must not panic") {
            Ok(write) if write.created => created += 1,
            Err(Phase7PersistenceErrorV1::RedemptionRejected) => rejected += 1,
            result => panic!("unexpected conflicting writer result: {result:?}"),
        }
    }
    assert_eq!(created, 1);
    assert_eq!(rejected, 31);
    let store = SqliteStore::open(&database.path).expect("database must reopen");
    assert_eq!(table_count(&store, "lnsat_capability_consumptions"), 1);
    store.verify_schema().expect("race winner must verify");
}
