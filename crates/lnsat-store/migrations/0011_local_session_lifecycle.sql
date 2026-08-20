CREATE TABLE lnsat_store_metadata_v11 (
  singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
  contract_version TEXT NOT NULL CHECK (
    contract_version = 'lnsat.contracts.v1_0'
  ),
  schema_version INTEGER NOT NULL CHECK (schema_version = 11),
  storage_kind TEXT NOT NULL CHECK (
    storage_kind = 'sqlite_single_node'
  )
) STRICT;

INSERT INTO lnsat_store_metadata_v11 (
  singleton,
  contract_version,
  schema_version,
  storage_kind
)
SELECT
  singleton,
  contract_version,
  11,
  storage_kind
FROM lnsat_store_metadata;

DROP TABLE lnsat_store_metadata;
ALTER TABLE lnsat_store_metadata_v11 RENAME TO lnsat_store_metadata;

CREATE TABLE lnsat_retention_policies_v11 (
  record_family TEXT PRIMARY KEY CHECK (
    record_family IN (
      'approval_decision',
      'approval_request',
      'audit_event',
      'audit_event_reason_code',
      'local_identity',
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

INSERT INTO lnsat_retention_policies_v11 (
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

INSERT INTO lnsat_retention_policies_v11 (
  record_family,
  retention_class,
  disposition,
  cleanup_eligible,
  minimum_retention_seconds
)
VALUES
  ('local_session_activity', 'control_plane', 'preserve', 0, NULL),
  ('local_session_rotation', 'control_plane', 'preserve', 0, NULL);

DROP TABLE lnsat_retention_policies;
ALTER TABLE lnsat_retention_policies_v11 RENAME TO lnsat_retention_policies;

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

DROP TRIGGER lnsat_local_session_revocations_reject_update;
DROP TRIGGER lnsat_local_session_revocations_reject_delete;

CREATE TABLE lnsat_local_session_revocations_v11 (
  session_id TEXT PRIMARY KEY,
  revoked_at TEXT NOT NULL,
  reason TEXT NOT NULL CHECK (
    reason IN (
      'sign_out',
      'owner_revoke',
      'credential_revoke',
      'recovery',
      'rotation'
    )
  ),
  revocation_evidence_digest TEXT NOT NULL UNIQUE CHECK (
    length(revocation_evidence_digest) = 71
    AND substr(revocation_evidence_digest, 1, 7) = 'sha256:'
    AND substr(revocation_evidence_digest, 8) NOT GLOB '*[^0-9a-f]*'
  ),
  FOREIGN KEY (session_id)
    REFERENCES lnsat_local_sessions (session_id)
    ON UPDATE RESTRICT
    ON DELETE RESTRICT
) STRICT;

INSERT INTO lnsat_local_session_revocations_v11 (
  session_id,
  revoked_at,
  reason,
  revocation_evidence_digest
)
SELECT
  session_id,
  revoked_at,
  reason,
  revocation_evidence_digest
FROM lnsat_local_session_revocations;

DROP TABLE lnsat_local_session_revocations;
ALTER TABLE lnsat_local_session_revocations_v11
  RENAME TO lnsat_local_session_revocations;

CREATE TRIGGER lnsat_local_session_revocations_reject_update
BEFORE UPDATE ON lnsat_local_session_revocations
BEGIN
  SELECT RAISE(ABORT, 'local session revocations are immutable');
END;

CREATE TRIGGER lnsat_local_session_revocations_reject_delete
BEFORE DELETE ON lnsat_local_session_revocations
BEGIN
  SELECT RAISE(ABORT, 'local session revocations are immutable');
END;

CREATE TABLE lnsat_local_session_activity_events (
  session_id TEXT NOT NULL,
  activity_sequence INTEGER NOT NULL CHECK (
    activity_sequence BETWEEN 1 AND 61
  ),
  observed_at TEXT NOT NULL,
  activity_evidence_digest TEXT NOT NULL UNIQUE CHECK (
    length(activity_evidence_digest) = 71
    AND substr(activity_evidence_digest, 1, 7) = 'sha256:'
    AND substr(activity_evidence_digest, 8) NOT GLOB '*[^0-9a-f]*'
  ),
  PRIMARY KEY (session_id, activity_sequence),
  FOREIGN KEY (session_id)
    REFERENCES lnsat_local_sessions (session_id)
    ON UPDATE RESTRICT
    ON DELETE RESTRICT
) STRICT;

CREATE TRIGGER lnsat_local_session_activity_events_reject_update
BEFORE UPDATE ON lnsat_local_session_activity_events
BEGIN
  SELECT RAISE(ABORT, 'local session activity events are immutable');
END;

CREATE TRIGGER lnsat_local_session_activity_events_reject_delete
BEFORE DELETE ON lnsat_local_session_activity_events
BEGIN
  SELECT RAISE(ABORT, 'local session activity events are immutable');
END;

CREATE TABLE lnsat_local_session_rotations (
  prior_session_id TEXT PRIMARY KEY,
  replacement_session_id TEXT NOT NULL UNIQUE,
  identity_ref TEXT NOT NULL,
  rotated_at TEXT NOT NULL,
  rotation_evidence_digest TEXT NOT NULL UNIQUE CHECK (
    length(rotation_evidence_digest) = 71
    AND substr(rotation_evidence_digest, 1, 7) = 'sha256:'
    AND substr(rotation_evidence_digest, 8) NOT GLOB '*[^0-9a-f]*'
  ),
  FOREIGN KEY (prior_session_id)
    REFERENCES lnsat_local_sessions (session_id)
    ON UPDATE RESTRICT
    ON DELETE RESTRICT,
  FOREIGN KEY (replacement_session_id)
    REFERENCES lnsat_local_sessions (session_id)
    ON UPDATE RESTRICT
    ON DELETE RESTRICT,
  FOREIGN KEY (identity_ref)
    REFERENCES lnsat_local_identities (identity_ref)
    ON UPDATE RESTRICT
    ON DELETE RESTRICT,
  CHECK (prior_session_id <> replacement_session_id)
) STRICT;

CREATE TRIGGER lnsat_local_session_rotations_reject_update
BEFORE UPDATE ON lnsat_local_session_rotations
BEGIN
  SELECT RAISE(ABORT, 'local session rotations are immutable');
END;

CREATE TRIGGER lnsat_local_session_rotations_reject_delete
BEFORE DELETE ON lnsat_local_session_rotations
BEGIN
  SELECT RAISE(ABORT, 'local session rotations are immutable');
END;
