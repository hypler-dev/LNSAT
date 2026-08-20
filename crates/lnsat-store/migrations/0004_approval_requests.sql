CREATE TABLE lnsat_store_metadata_v4 (
  singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
  contract_version TEXT NOT NULL CHECK (
    contract_version = 'lnsat.contracts.v1_0'
  ),
  schema_version INTEGER NOT NULL CHECK (schema_version = 4),
  storage_kind TEXT NOT NULL CHECK (
    storage_kind = 'sqlite_single_node'
  )
) STRICT;

INSERT INTO lnsat_store_metadata_v4 (
  singleton,
  contract_version,
  schema_version,
  storage_kind
)
SELECT
  singleton,
  contract_version,
  4,
  storage_kind
FROM lnsat_store_metadata;

DROP TABLE lnsat_store_metadata;
ALTER TABLE lnsat_store_metadata_v4 RENAME TO lnsat_store_metadata;

CREATE UNIQUE INDEX lnsat_policy_decisions_binding_idx
  ON lnsat_policy_decisions (decision_id, packet_sha256, project_ref);

CREATE TABLE lnsat_approval_requests (
  approval_request_id TEXT PRIMARY KEY CHECK (
    length(approval_request_id) = 68
    AND substr(approval_request_id, 1, 4) = 'apr_'
    AND substr(approval_request_id, 5) NOT GLOB '*[^0-9a-f]*'
  ),
  schema_id TEXT NOT NULL CHECK (
    schema_id = 'lnsat.approval_request.schema.v1_0'
  ),
  status TEXT NOT NULL CHECK (status = 'requested'),
  policy_decision_id TEXT NOT NULL,
  packet_sha256 TEXT NOT NULL CHECK (
    length(packet_sha256) = 71
    AND substr(packet_sha256, 1, 7) = 'sha256:'
    AND substr(packet_sha256, 8) NOT GLOB '*[^0-9a-f]*'
  ),
  requester_ref TEXT NOT NULL,
  session_ref TEXT NOT NULL,
  project_ref TEXT NOT NULL,
  requested_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  UNIQUE (policy_decision_id, requested_at),
  FOREIGN KEY (policy_decision_id, packet_sha256, project_ref)
    REFERENCES lnsat_policy_decisions (
      decision_id,
      packet_sha256,
      project_ref
    )
    ON UPDATE RESTRICT
    ON DELETE RESTRICT
) STRICT;

CREATE INDEX lnsat_approval_requests_project_idx
  ON lnsat_approval_requests (project_ref, approval_request_id);

CREATE TRIGGER lnsat_approval_requests_reject_update
BEFORE UPDATE ON lnsat_approval_requests
BEGIN
  SELECT RAISE(ABORT, 'approval requests are immutable');
END;

CREATE TRIGGER lnsat_approval_requests_reject_delete
BEFORE DELETE ON lnsat_approval_requests
BEGIN
  SELECT RAISE(ABORT, 'approval requests are immutable');
END;
