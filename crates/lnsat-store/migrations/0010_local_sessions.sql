CREATE TABLE lnsat_store_metadata_v10 (
  singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
  contract_version TEXT NOT NULL CHECK (
    contract_version = 'lnsat.contracts.v1_0'
  ),
  schema_version INTEGER NOT NULL CHECK (schema_version = 10),
  storage_kind TEXT NOT NULL CHECK (
    storage_kind = 'sqlite_single_node'
  )
) STRICT;

INSERT INTO lnsat_store_metadata_v10 (
  singleton,
  contract_version,
  schema_version,
  storage_kind
)
SELECT
  singleton,
  contract_version,
  10,
  storage_kind
FROM lnsat_store_metadata;

DROP TABLE lnsat_store_metadata;
ALTER TABLE lnsat_store_metadata_v10 RENAME TO lnsat_store_metadata;

CREATE TABLE lnsat_retention_policies_v10 (
  record_family TEXT PRIMARY KEY CHECK (
    record_family IN (
      'approval_decision',
      'approval_request',
      'audit_event',
      'audit_event_reason_code',
      'local_identity',
      'local_password_credential',
      'local_session',
      'local_session_revocation',
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

INSERT INTO lnsat_retention_policies_v10 (
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

INSERT INTO lnsat_retention_policies_v10 (
  record_family,
  retention_class,
  disposition,
  cleanup_eligible,
  minimum_retention_seconds
)
VALUES
  ('local_session', 'control_plane', 'preserve', 0, NULL),
  ('local_session_revocation', 'control_plane', 'preserve', 0, NULL);

DROP TABLE lnsat_retention_policies;
ALTER TABLE lnsat_retention_policies_v10 RENAME TO lnsat_retention_policies;

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

CREATE TABLE lnsat_local_sessions (
  session_id TEXT PRIMARY KEY CHECK (
    length(session_id) = 36
    AND substr(session_id, 1, 4) = 'ses_'
    AND substr(session_id, 5) NOT GLOB '*[^0-9a-f]*'
  ),
  identity_ref TEXT NOT NULL,
  session_version INTEGER NOT NULL CHECK (session_version = 1),
  session_token_profile TEXT NOT NULL CHECK (
    session_token_profile = 'lnsat.session_token.sha256.v1'
  ),
  session_token_digest TEXT NOT NULL UNIQUE CHECK (
    length(session_token_digest) = 71
    AND substr(session_token_digest, 1, 7) = 'sha256:'
    AND substr(session_token_digest, 8) NOT GLOB '*[^0-9a-f]*'
  ),
  csrf_token_profile TEXT NOT NULL CHECK (
    csrf_token_profile = 'lnsat.session_csrf.sha256.v1'
  ),
  csrf_token_digest TEXT NOT NULL UNIQUE CHECK (
    length(csrf_token_digest) = 71
    AND substr(csrf_token_digest, 1, 7) = 'sha256:'
    AND substr(csrf_token_digest, 8) NOT GLOB '*[^0-9a-f]*'
  ),
  session_evidence_digest TEXT NOT NULL UNIQUE CHECK (
    length(session_evidence_digest) = 71
    AND substr(session_evidence_digest, 1, 7) = 'sha256:'
    AND substr(session_evidence_digest, 8) NOT GLOB '*[^0-9a-f]*'
  ),
  issued_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  FOREIGN KEY (identity_ref)
    REFERENCES lnsat_local_identities (identity_ref)
    ON UPDATE RESTRICT
    ON DELETE RESTRICT
) STRICT;

CREATE TRIGGER lnsat_local_sessions_reject_update
BEFORE UPDATE ON lnsat_local_sessions
BEGIN
  SELECT RAISE(ABORT, 'local sessions are immutable');
END;

CREATE TRIGGER lnsat_local_sessions_reject_delete
BEFORE DELETE ON lnsat_local_sessions
BEGIN
  SELECT RAISE(ABORT, 'local sessions are immutable');
END;

CREATE TABLE lnsat_local_session_revocations (
  session_id TEXT PRIMARY KEY,
  revoked_at TEXT NOT NULL,
  reason TEXT NOT NULL CHECK (
    reason IN ('sign_out', 'owner_revoke', 'credential_revoke', 'recovery')
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
