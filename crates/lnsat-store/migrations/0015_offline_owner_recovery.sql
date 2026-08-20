CREATE TABLE lnsat_store_metadata_v15 (
  singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
  contract_version TEXT NOT NULL CHECK (
    contract_version = 'lnsat.contracts.v1_0'
  ),
  schema_version INTEGER NOT NULL CHECK (schema_version = 15),
  storage_kind TEXT NOT NULL CHECK (
    storage_kind = 'sqlite_single_node'
  )
) STRICT;

INSERT INTO lnsat_store_metadata_v15 (
  singleton,
  contract_version,
  schema_version,
  storage_kind
)
SELECT
  singleton,
  contract_version,
  15,
  storage_kind
FROM lnsat_store_metadata;

DROP TABLE lnsat_store_metadata;
ALTER TABLE lnsat_store_metadata_v15 RENAME TO lnsat_store_metadata;

DROP TRIGGER lnsat_local_identity_events_reject_update;
DROP TRIGGER lnsat_local_identity_events_reject_delete;

CREATE TABLE lnsat_local_identity_events_v15 (
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
      'identity_disabled',
      'owner_recovered'
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
    OR (
      event_kind = 'owner_recovered'
      AND actor_session_id IS NULL
      AND credential_version BETWEEN 2 AND 64
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

INSERT INTO lnsat_local_identity_events_v15 (
  event_id,
  identity_ref,
  event_sequence,
  event_kind,
  actor_session_id,
  credential_version,
  source_evidence_digest,
  occurred_at,
  event_evidence_digest
)
SELECT
  event_id,
  identity_ref,
  event_sequence,
  event_kind,
  actor_session_id,
  credential_version,
  source_evidence_digest,
  occurred_at,
  event_evidence_digest
FROM lnsat_local_identity_events;

DROP TABLE lnsat_local_identity_events;
ALTER TABLE lnsat_local_identity_events_v15 RENAME TO lnsat_local_identity_events;

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

DROP TRIGGER lnsat_local_session_events_reject_update;
DROP TRIGGER lnsat_local_session_events_reject_delete;

CREATE TABLE lnsat_local_session_events_v15 (
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
      AND revocation_reason != 'recovery'
    )
    OR (
      event_kind = 'revoked'
      AND actor_session_id IS NULL
      AND related_session_id IS NULL
      AND revocation_reason = 'recovery'
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

INSERT INTO lnsat_local_session_events_v15 (
  event_id,
  session_id,
  event_sequence,
  event_kind,
  actor_session_id,
  related_session_id,
  revocation_reason,
  source_evidence_digest,
  occurred_at,
  event_evidence_digest
)
SELECT
  event_id,
  session_id,
  event_sequence,
  event_kind,
  actor_session_id,
  related_session_id,
  revocation_reason,
  source_evidence_digest,
  occurred_at,
  event_evidence_digest
FROM lnsat_local_session_events;

DROP TABLE lnsat_local_session_events;
ALTER TABLE lnsat_local_session_events_v15 RENAME TO lnsat_local_session_events;

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

PRAGMA user_version = 15;
