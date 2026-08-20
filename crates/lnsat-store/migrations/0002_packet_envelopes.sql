CREATE TABLE lnsat_store_metadata_v2 (
  singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
  contract_version TEXT NOT NULL CHECK (
    contract_version = 'lnsat.contracts.v1_0'
  ),
  schema_version INTEGER NOT NULL CHECK (schema_version = 2),
  storage_kind TEXT NOT NULL CHECK (
    storage_kind = 'sqlite_single_node'
  )
) STRICT;

INSERT INTO lnsat_store_metadata_v2 (
  singleton,
  contract_version,
  schema_version,
  storage_kind
)
SELECT
  singleton,
  contract_version,
  2,
  storage_kind
FROM lnsat_store_metadata;

DROP TABLE lnsat_store_metadata;
ALTER TABLE lnsat_store_metadata_v2 RENAME TO lnsat_store_metadata;

CREATE TABLE lnsat_packet_envelopes (
  packet_id TEXT PRIMARY KEY,
  packet_sha256 TEXT NOT NULL UNIQUE CHECK (
    length(packet_sha256) = 71
    AND substr(packet_sha256, 1, 7) = 'sha256:'
    AND substr(packet_sha256, 8) NOT GLOB '*[^0-9a-f]*'
  ),
  contract_version TEXT NOT NULL CHECK (
    contract_version = 'lnsat.contracts.v1_0'
  ),
  schema_id TEXT NOT NULL CHECK (
    schema_id = 'lnsat.packet_envelope.schema.v1_0'
  ),
  packet_type TEXT NOT NULL,
  actor_ref TEXT NOT NULL,
  session_ref TEXT NOT NULL,
  project_ref TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  canonical_packet TEXT NOT NULL CHECK (
    length(canonical_packet) > 0
  ),
  UNIQUE (packet_id, project_ref),
  UNIQUE (project_ref, idempotency_key)
) STRICT;

CREATE TABLE lnsat_packet_resource_refs (
  packet_id TEXT NOT NULL,
  project_ref TEXT NOT NULL,
  ordinal INTEGER NOT NULL CHECK (ordinal >= 0),
  resource_ref TEXT NOT NULL,
  PRIMARY KEY (packet_id, ordinal),
  UNIQUE (packet_id, resource_ref),
  FOREIGN KEY (packet_id, project_ref)
    REFERENCES lnsat_packet_envelopes (packet_id, project_ref)
    ON UPDATE RESTRICT
    ON DELETE RESTRICT
) STRICT;

CREATE INDEX lnsat_packet_envelopes_project_idx
  ON lnsat_packet_envelopes (project_ref, packet_id);

CREATE INDEX lnsat_packet_resource_scope_idx
  ON lnsat_packet_resource_refs (project_ref, resource_ref, packet_id);

CREATE TRIGGER lnsat_packet_envelopes_reject_update
BEFORE UPDATE ON lnsat_packet_envelopes
BEGIN
  SELECT RAISE(ABORT, 'packet envelopes are immutable');
END;

CREATE TRIGGER lnsat_packet_envelopes_reject_delete
BEFORE DELETE ON lnsat_packet_envelopes
BEGIN
  SELECT RAISE(ABORT, 'packet envelopes are immutable');
END;

CREATE TRIGGER lnsat_packet_resource_refs_reject_update
BEFORE UPDATE ON lnsat_packet_resource_refs
BEGIN
  SELECT RAISE(ABORT, 'packet resource references are immutable');
END;

CREATE TRIGGER lnsat_packet_resource_refs_reject_delete
BEFORE DELETE ON lnsat_packet_resource_refs
BEGIN
  SELECT RAISE(ABORT, 'packet resource references are immutable');
END;
