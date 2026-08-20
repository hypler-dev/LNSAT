CREATE TABLE lnsat_store_metadata_v8 (
  singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
  contract_version TEXT NOT NULL CHECK (
    contract_version = 'lnsat.contracts.v1_0'
  ),
  schema_version INTEGER NOT NULL CHECK (schema_version = 8),
  storage_kind TEXT NOT NULL CHECK (
    storage_kind = 'sqlite_single_node'
  )
) STRICT;

INSERT INTO lnsat_store_metadata_v8 (
  singleton,
  contract_version,
  schema_version,
  storage_kind
)
SELECT
  singleton,
  contract_version,
  8,
  storage_kind
FROM lnsat_store_metadata;

DROP TABLE lnsat_store_metadata;
ALTER TABLE lnsat_store_metadata_v8 RENAME TO lnsat_store_metadata;

CREATE TABLE lnsat_retention_policies_v8 (
  record_family TEXT PRIMARY KEY CHECK (
    record_family IN (
      'approval_decision',
      'approval_request',
      'audit_event',
      'audit_event_reason_code',
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

INSERT INTO lnsat_retention_policies_v8 (
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

INSERT INTO lnsat_retention_policies_v8 (
  record_family,
  retention_class,
  disposition,
  cleanup_eligible,
  minimum_retention_seconds
)
VALUES (
  'recovery_inspection_event',
  'control_plane',
  'preserve',
  0,
  NULL
);

DROP TABLE lnsat_retention_policies;
ALTER TABLE lnsat_retention_policies_v8 RENAME TO lnsat_retention_policies;

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
