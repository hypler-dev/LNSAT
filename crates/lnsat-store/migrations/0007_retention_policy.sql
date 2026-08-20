CREATE TABLE lnsat_store_metadata_v7 (
  singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
  contract_version TEXT NOT NULL CHECK (
    contract_version = 'lnsat.contracts.v1_0'
  ),
  schema_version INTEGER NOT NULL CHECK (schema_version = 7),
  storage_kind TEXT NOT NULL CHECK (
    storage_kind = 'sqlite_single_node'
  )
) STRICT;

INSERT INTO lnsat_store_metadata_v7 (
  singleton,
  contract_version,
  schema_version,
  storage_kind
)
SELECT
  singleton,
  contract_version,
  7,
  storage_kind
FROM lnsat_store_metadata;

DROP TABLE lnsat_store_metadata;
ALTER TABLE lnsat_store_metadata_v7 RENAME TO lnsat_store_metadata;

CREATE TABLE lnsat_retention_policies (
  record_family TEXT PRIMARY KEY CHECK (
    record_family IN (
      'approval_decision',
      'approval_request',
      'audit_event',
      'audit_event_reason_code',
      'packet_envelope',
      'packet_resource_ref',
      'policy_decision'
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

INSERT INTO lnsat_retention_policies (
  record_family,
  retention_class,
  disposition,
  cleanup_eligible,
  minimum_retention_seconds
)
VALUES
  ('approval_decision', 'control_plane', 'preserve', 0, NULL),
  ('approval_request', 'control_plane', 'preserve', 0, NULL),
  ('audit_event', 'control_plane', 'preserve', 0, NULL),
  ('audit_event_reason_code', 'control_plane', 'preserve', 0, NULL),
  ('packet_envelope', 'control_plane', 'preserve', 0, NULL),
  ('packet_resource_ref', 'control_plane', 'preserve', 0, NULL),
  ('policy_decision', 'control_plane', 'preserve', 0, NULL);

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
