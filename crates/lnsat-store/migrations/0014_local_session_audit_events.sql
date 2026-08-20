CREATE TABLE lnsat_store_metadata_v14 (
  singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
  contract_version TEXT NOT NULL CHECK (
    contract_version = 'lnsat.contracts.v1_0'
  ),
  schema_version INTEGER NOT NULL CHECK (schema_version = 14),
  storage_kind TEXT NOT NULL CHECK (
    storage_kind = 'sqlite_single_node'
  )
) STRICT;

INSERT INTO lnsat_store_metadata_v14 (
  singleton,
  contract_version,
  schema_version,
  storage_kind
)
SELECT
  singleton,
  contract_version,
  14,
  storage_kind
FROM lnsat_store_metadata;

DROP TABLE lnsat_store_metadata;
ALTER TABLE lnsat_store_metadata_v14 RENAME TO lnsat_store_metadata;

CREATE TABLE lnsat_retention_policies_v14 (
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
      'local_session_event',
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

INSERT INTO lnsat_retention_policies_v14 (
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

INSERT INTO lnsat_retention_policies_v14 (
  record_family,
  retention_class,
  disposition,
  cleanup_eligible,
  minimum_retention_seconds
)
VALUES
  ('local_session_event', 'control_plane', 'preserve', 0, NULL);

DROP TABLE lnsat_retention_policies;
ALTER TABLE lnsat_retention_policies_v14 RENAME TO lnsat_retention_policies;

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

CREATE TABLE lnsat_local_session_events (
  event_id TEXT PRIMARY KEY CHECK (
    length(event_id) = 71
    AND substr(event_id, 1, 7) = 'sha256:'
    AND substr(event_id, 8) NOT GLOB '*[^0-9a-f]*'
  ),
  session_id TEXT NOT NULL,
  event_sequence INTEGER NOT NULL CHECK (
    event_sequence BETWEEN 1 AND 3
  ),
  event_kind TEXT NOT NULL CHECK (
    event_kind IN (
      'issued',
      'revoked',
      'rotated'
    )
  ),
  actor_session_id TEXT,
  related_session_id TEXT,
  revocation_reason TEXT CHECK (
    revocation_reason IN (
      'sign_out',
      'owner_revoke',
      'credential_revoke',
      'recovery',
      'rotation'
    )
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
  UNIQUE (session_id, event_sequence),
  CHECK (
    (
      event_kind = 'issued'
      AND actor_session_id IS NULL
      AND related_session_id IS NULL
      AND revocation_reason IS NULL
    )
    OR (
      event_kind = 'revoked'
      AND actor_session_id IS NOT NULL
      AND related_session_id IS NULL
      AND revocation_reason IS NOT NULL
    )
    OR (
      event_kind = 'rotated'
      AND actor_session_id IS NOT NULL
      AND related_session_id IS NOT NULL
      AND revocation_reason IS NULL
    )
  ),
  FOREIGN KEY (session_id)
    REFERENCES lnsat_local_sessions (session_id)
    ON UPDATE RESTRICT
    ON DELETE RESTRICT,
  FOREIGN KEY (actor_session_id)
    REFERENCES lnsat_local_sessions (session_id)
    ON UPDATE RESTRICT
    ON DELETE RESTRICT,
  FOREIGN KEY (related_session_id)
    REFERENCES lnsat_local_sessions (session_id)
    ON UPDATE RESTRICT
    ON DELETE RESTRICT
) STRICT;

CREATE TRIGGER lnsat_local_session_events_reject_update
BEFORE UPDATE ON lnsat_local_session_events
BEGIN
  SELECT RAISE(ABORT, 'local session events are immutable');
END;

CREATE TRIGGER lnsat_local_session_events_reject_delete
BEFORE DELETE ON lnsat_local_session_events
BEGIN
  SELECT RAISE(ABORT, 'local session events are immutable');
END;
