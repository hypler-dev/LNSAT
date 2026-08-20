CREATE TABLE lnsat_store_metadata_v13 (
  singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
  contract_version TEXT NOT NULL CHECK (
    contract_version = 'lnsat.contracts.v1_0'
  ),
  schema_version INTEGER NOT NULL CHECK (schema_version = 13),
  storage_kind TEXT NOT NULL CHECK (
    storage_kind = 'sqlite_single_node'
  )
) STRICT;

INSERT INTO lnsat_store_metadata_v13 (
  singleton,
  contract_version,
  schema_version,
  storage_kind
)
SELECT
  singleton,
  contract_version,
  13,
  storage_kind
FROM lnsat_store_metadata;

DROP TABLE lnsat_store_metadata;
ALTER TABLE lnsat_store_metadata_v13 RENAME TO lnsat_store_metadata;

CREATE TABLE lnsat_retention_policies_v13 (
  record_family TEXT PRIMARY KEY CHECK (
    record_family IN (
      'approval_decision',
      'approval_request',
      'audit_event',
      'audit_event_reason_code',
      'local_identity',
      'local_identity_event',
      'local_identity_status',
      'local_password_credential',
      'local_session',
      'local_session_activity',
      'local_session_revocation',
      'local_session_rotation',
      'packet_envelope',
      'packet_resource_ref',
      'policy_decision',
      'recovery_inspection_event'
    )
  ),
  retention_class TEXT NOT NULL CHECK (
    retention_class = 'control_plane'
  ),
  disposition TEXT NOT NULL CHECK (
    disposition = 'preserve'
  ),
  cleanup_eligible INTEGER NOT NULL CHECK (
    cleanup_eligible = 0
  ),
  minimum_retention_seconds INTEGER CHECK (
    minimum_retention_seconds IS NULL
  )
) STRICT;

INSERT INTO lnsat_retention_policies_v13 (
  record_family,
  retention_class,
  disposition,
  cleanup_eligible,
  minimum_retention_seconds
)
SELECT
  record_family,
  retention_class,
  disposition,
  cleanup_eligible,
  minimum_retention_seconds
FROM lnsat_retention_policies;

INSERT INTO lnsat_retention_policies_v13 (
  record_family,
  retention_class,
  disposition,
  cleanup_eligible,
  minimum_retention_seconds
)
VALUES
  ('local_identity_event', 'control_plane', 'preserve', 0, NULL);

DROP TABLE lnsat_retention_policies;
ALTER TABLE lnsat_retention_policies_v13 RENAME TO lnsat_retention_policies;

CREATE TRIGGER lnsat_retention_policies_reject_update
BEFORE UPDATE ON lnsat_retention_policies
BEGIN
  SELECT RAISE(ABORT, 'retention policies are immutable');
END;

CREATE TRIGGER lnsat_retention_policies_reject_delete
BEFORE DELETE ON lnsat_retention_policies
BEGIN
  SELECT RAISE(ABORT, 'retention policies are immutable');
END;

CREATE TABLE lnsat_local_identity_events (
  event_id TEXT PRIMARY KEY CHECK (
    length(event_id) = 71
    AND substr(event_id, 1, 7) = 'sha256:'
    AND substr(event_id, 8) NOT GLOB '*[^0-9a-f]*'
  ),
  identity_ref TEXT NOT NULL,
  event_sequence INTEGER NOT NULL CHECK (
    event_sequence BETWEEN 1 AND 65
  ),
  event_kind TEXT NOT NULL CHECK (
    event_kind IN (
      'owner_bootstrapped',
      'identity_created',
      'password_rotated',
      'identity_disabled'
    )
  ),
  actor_session_id TEXT,
  credential_version INTEGER CHECK (
    credential_version BETWEEN 1 AND 64
  ),
  source_evidence_digest TEXT NOT NULL CHECK (
    length(source_evidence_digest) = 71
    AND substr(source_evidence_digest, 1, 7) = 'sha256:'
    AND substr(source_evidence_digest, 8) NOT GLOB '*[^0-9a-f]*'
  ),
  occurred_at TEXT NOT NULL,
  event_evidence_digest TEXT NOT NULL UNIQUE CHECK (
    length(event_evidence_digest) = 71
    AND substr(event_evidence_digest, 1, 7) = 'sha256:'
    AND substr(event_evidence_digest, 8) NOT GLOB '*[^0-9a-f]*'
  ),
  UNIQUE (identity_ref, event_sequence),
  CHECK (
    (
      event_kind = 'owner_bootstrapped'
      AND actor_session_id IS NULL
      AND credential_version = 1
    )
    OR (
      event_kind = 'identity_created'
      AND actor_session_id IS NOT NULL
      AND credential_version = 1
    )
    OR (
      event_kind = 'password_rotated'
      AND actor_session_id IS NOT NULL
      AND credential_version BETWEEN 2 AND 64
    )
    OR (
      event_kind = 'identity_disabled'
      AND actor_session_id IS NOT NULL
      AND credential_version IS NULL
    )
  ),
  FOREIGN KEY (identity_ref)
    REFERENCES lnsat_local_identities (identity_ref)
    ON UPDATE RESTRICT
    ON DELETE RESTRICT,
  FOREIGN KEY (actor_session_id)
    REFERENCES lnsat_local_sessions (session_id)
    ON UPDATE RESTRICT
    ON DELETE RESTRICT
) STRICT;

CREATE TRIGGER lnsat_local_identity_events_reject_update
BEFORE UPDATE ON lnsat_local_identity_events
BEGIN
  SELECT RAISE(ABORT, 'local identity events are immutable');
END;

CREATE TRIGGER lnsat_local_identity_events_reject_delete
BEFORE DELETE ON lnsat_local_identity_events
BEGIN
  SELECT RAISE(ABORT, 'local identity events are immutable');
END;
