CREATE TABLE lnsat_store_metadata_v17 (
  singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
  contract_version TEXT NOT NULL CHECK (
    contract_version = 'lnsat.contracts.v1_0'
  ),
  schema_version INTEGER NOT NULL CHECK (schema_version = 17),
  storage_kind TEXT NOT NULL CHECK (
    storage_kind = 'sqlite_single_node'
  )
) STRICT;

INSERT INTO lnsat_store_metadata_v17 (
  singleton,
  contract_version,
  schema_version,
  storage_kind
)
SELECT
  singleton,
  contract_version,
  17,
  storage_kind
FROM lnsat_store_metadata;

DROP TABLE lnsat_store_metadata;
ALTER TABLE lnsat_store_metadata_v17 RENAME TO lnsat_store_metadata;

CREATE TABLE lnsat_migration_0017_legacy_phase7_guard (
  singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
  existing_phase7_record_count INTEGER NOT NULL CHECK (
    existing_phase7_record_count = 0
  )
) STRICT;

INSERT INTO lnsat_migration_0017_legacy_phase7_guard (
  singleton,
  existing_phase7_record_count
)
SELECT
  1,
  (SELECT count(*) FROM lnsat_authorization_attempts)
    + (SELECT count(*) FROM lnsat_authorization_nonces)
    + (SELECT count(*) FROM lnsat_capability_consumptions)
    + (SELECT count(*) FROM lnsat_execution_authorizations)
    + (SELECT count(*) FROM lnsat_operation_attempts)
    + (SELECT count(*) FROM lnsat_operation_receipts)
    + (SELECT count(*) FROM lnsat_operation_reconciliations)
    + (SELECT count(*) FROM lnsat_operations)
    + (SELECT count(*) FROM lnsat_phase7_audit_bindings)
    + (SELECT count(*) FROM lnsat_phase7_entities)
    + (SELECT count(*) FROM lnsat_phase7_state_events);

DROP TABLE lnsat_migration_0017_legacy_phase7_guard;

DROP TRIGGER lnsat_recovery_inspection_events_reject_update;
DROP TRIGGER lnsat_recovery_inspection_events_reject_delete;

ALTER TABLE lnsat_recovery_inspection_events
  RENAME TO lnsat_recovery_inspection_events_v16;

CREATE TABLE lnsat_recovery_inspection_events (
  event_id TEXT PRIMARY KEY CHECK (
    length(event_id) = 71
    AND substr(event_id, 1, 7) = 'sha256:'
    AND substr(event_id, 8) NOT GLOB '*[^0-9a-f]*'
  ),
  schema_id TEXT NOT NULL CHECK (
    schema_id = 'lnsat.sqlite_recovery_inspection_event.schema.v1_0'
  ),
  deployment_ref TEXT NOT NULL,
  target_ref TEXT NOT NULL,
  target_path_sha256 TEXT NOT NULL CHECK (
    length(target_path_sha256) = 71
    AND substr(target_path_sha256, 1, 7) = 'sha256:'
    AND substr(target_path_sha256, 8) NOT GLOB '*[^0-9a-f]*'
  ),
  idempotency_key TEXT NOT NULL,
  observed_at TEXT NOT NULL,
  disposition TEXT NOT NULL CHECK (
    disposition IN (
      'ready',
      'bootstrap_candidate',
      'migration_pending',
      'legacy_phase7_evidence',
      'unsupported_schema_version',
      'unrecognized_database',
      'migration_drift',
      'integrity_failure',
      'unreadable'
    )
  ),
  observed_schema_version INTEGER CHECK (
    observed_schema_version IS NULL OR observed_schema_version >= 0
  ),
  observed_migration_count INTEGER CHECK (
    observed_migration_count IS NULL OR observed_migration_count >= 0
  ),
  integrity_ok INTEGER NOT NULL CHECK (integrity_ok IN (0, 1)),
  quarantine_recommended INTEGER NOT NULL CHECK (
    quarantine_recommended IN (0, 1)
  ),
  inspection_mode TEXT NOT NULL CHECK (inspection_mode = 'read_only'),
  automatic_action TEXT NOT NULL CHECK (automatic_action = 'none'),
  activation_authorized INTEGER NOT NULL CHECK (activation_authorized = 0),
  UNIQUE (deployment_ref, idempotency_key)
) STRICT;

INSERT INTO lnsat_recovery_inspection_events (
  event_id,
  schema_id,
  deployment_ref,
  target_ref,
  target_path_sha256,
  idempotency_key,
  observed_at,
  disposition,
  observed_schema_version,
  observed_migration_count,
  integrity_ok,
  quarantine_recommended,
  inspection_mode,
  automatic_action,
  activation_authorized
)
SELECT
  event_id,
  schema_id,
  deployment_ref,
  target_ref,
  target_path_sha256,
  idempotency_key,
  observed_at,
  disposition,
  observed_schema_version,
  observed_migration_count,
  integrity_ok,
  quarantine_recommended,
  inspection_mode,
  automatic_action,
  activation_authorized
FROM lnsat_recovery_inspection_events_v16;

DROP TABLE lnsat_recovery_inspection_events_v16;

CREATE TRIGGER lnsat_recovery_inspection_events_reject_update
BEFORE UPDATE ON lnsat_recovery_inspection_events
BEGIN
  SELECT RAISE(ABORT, 'recovery inspection events are immutable');
END;

CREATE TRIGGER lnsat_recovery_inspection_events_reject_delete
BEFORE DELETE ON lnsat_recovery_inspection_events
BEGIN
  SELECT RAISE(ABORT, 'recovery inspection events are immutable');
END;

CREATE UNIQUE INDEX lnsat_execution_authorizations_approval_decision_unique_idx
  ON lnsat_execution_authorizations (approval_decision_id);

DROP TRIGGER lnsat_operation_receipts_reject_update;
DROP TRIGGER lnsat_operation_receipts_reject_delete;
DROP INDEX lnsat_operation_receipts_operation_idx;

DROP TABLE lnsat_operation_receipts;

CREATE TABLE lnsat_operation_receipts (
  receipt_id TEXT PRIMARY KEY,
  entity_kind TEXT NOT NULL CHECK (entity_kind = 'operation_receipt'),
  project_ref TEXT NOT NULL,
  resource_ref TEXT NOT NULL,
  operation_id TEXT NOT NULL UNIQUE,
  operation_attempt_id TEXT NOT NULL UNIQUE,
  authorization_id TEXT NOT NULL UNIQUE,
  consumption_id TEXT NOT NULL UNIQUE,
  requested_action_digest BLOB NOT NULL CHECK (
    length(requested_action_digest) = 32
  ),
  approved_action_digest BLOB NOT NULL CHECK (
    length(approved_action_digest) = 32
  ),
  authorized_action_digest BLOB NOT NULL CHECK (
    length(authorized_action_digest) = 32
  ),
  executed_action_digest BLOB NOT NULL CHECK (
    length(executed_action_digest) = 32
  ),
  result_digest BLOB NOT NULL CHECK (length(result_digest) = 32),
  receipt_authentication_profile TEXT NOT NULL CHECK (
    receipt_authentication_profile = 'local_authenticated_adapter_channel'
  ),
  verification_status TEXT NOT NULL CHECK (
    verification_status = 'accepted'
  ),
  digest_bound INTEGER NOT NULL CHECK (
    digest_bound = 1
    AND requested_action_digest = approved_action_digest
    AND approved_action_digest = authorized_action_digest
    AND authorized_action_digest = executed_action_digest
  ),
  received_at TEXT NOT NULL CHECK (
    length(received_at) IN (20, 24)
    AND strftime('%Y-%m-%dT%H:%M:%fZ', received_at, '+0 days') IS NOT NULL
    AND (
      received_at = strftime('%Y-%m-%dT%H:%M:%SZ', received_at, '+0 days')
      OR received_at = strftime('%Y-%m-%dT%H:%M:%fZ', received_at, '+0 days')
    )
  ),
  UNIQUE (receipt_id, project_ref, resource_ref),
  FOREIGN KEY (
    receipt_id,
    entity_kind,
    project_ref,
    resource_ref
  )
    REFERENCES lnsat_phase7_entities (
      entity_id,
      entity_kind,
      project_ref,
      resource_ref
    )
    ON UPDATE RESTRICT
    ON DELETE RESTRICT,
  FOREIGN KEY (
    operation_id,
    project_ref,
    resource_ref,
    requested_action_digest,
    approved_action_digest,
    authorized_action_digest
  )
    REFERENCES lnsat_operations (
      operation_id,
      project_ref,
      resource_ref,
      requested_action_digest,
      approved_action_digest,
      authorized_action_digest
    )
    ON UPDATE RESTRICT
    ON DELETE RESTRICT,
  FOREIGN KEY (
    operation_attempt_id,
    operation_id,
    project_ref,
    resource_ref
  )
    REFERENCES lnsat_operation_attempts (
      operation_attempt_id,
      operation_id,
      project_ref,
      resource_ref
    )
    ON UPDATE RESTRICT
    ON DELETE RESTRICT,
  FOREIGN KEY (
    consumption_id,
    operation_id,
    authorization_id,
    project_ref,
    resource_ref
  )
    REFERENCES lnsat_capability_consumptions (
      consumption_id,
      operation_id,
      authorization_id,
      project_ref,
      resource_ref
    )
    ON UPDATE RESTRICT
    ON DELETE RESTRICT
) STRICT;

CREATE INDEX lnsat_operation_receipts_operation_idx
  ON lnsat_operation_receipts (
    operation_id,
    received_at,
    receipt_id
  );

CREATE TRIGGER lnsat_operation_receipts_reject_update
BEFORE UPDATE ON lnsat_operation_receipts
BEGIN
  SELECT RAISE(ABORT, 'operation receipts are immutable');
END;

CREATE TRIGGER lnsat_operation_receipts_reject_delete
BEFORE DELETE ON lnsat_operation_receipts
BEGIN
  SELECT RAISE(ABORT, 'operation receipts are immutable');
END;

CREATE TRIGGER lnsat_execution_authorizations_enforce_attempt_binding
BEFORE INSERT ON lnsat_execution_authorizations
BEGIN
  SELECT RAISE(ABORT, 'execution authorization approval already bound')
  WHERE EXISTS (
    SELECT 1
    FROM lnsat_execution_authorizations AS existing
    WHERE existing.approval_decision_id = NEW.approval_decision_id
  );

  SELECT RAISE(ABORT, 'execution authorization binding mismatch')
  WHERE NOT EXISTS (
    SELECT 1
    FROM lnsat_authorization_attempts AS attempt
    JOIN lnsat_authorization_nonces AS nonce
      ON nonce.nonce_id = NEW.nonce_id
      AND nonce.authorization_attempt_id = attempt.authorization_attempt_id
      AND nonce.project_ref = attempt.project_ref
      AND nonce.resource_ref = attempt.resource_ref
      AND nonce.binding_digest = attempt.binding_digest
    WHERE attempt.authorization_attempt_id = NEW.authorization_attempt_id
      AND attempt.project_ref = NEW.project_ref
      AND attempt.resource_ref = NEW.resource_ref
      AND attempt.binding_digest = NEW.binding_digest
      AND attempt.approval_decision_id = NEW.approval_decision_id
      AND attempt.policy_decision_id = NEW.policy_decision_id
      AND attempt.packet_id = NEW.packet_id
      AND attempt.packet_sha256 = NEW.packet_sha256
      AND attempt.requester_ref = NEW.requester_ref
      AND attempt.requester_session_ref = NEW.requester_session_ref
      AND attempt.approver_ref = NEW.approver_ref
      AND attempt.approver_session_ref = NEW.approver_session_ref
      AND attempt.action_digest = NEW.action_digest
      AND attempt.target_digest = NEW.target_digest
      AND attempt.configuration_digest = NEW.configuration_digest
      AND attempt.adapter_ref = NEW.adapter_ref
      AND attempt.executable_digest = NEW.executable_digest
      AND attempt.audience = NEW.audience
  );
END;

PRAGMA user_version = 17;
