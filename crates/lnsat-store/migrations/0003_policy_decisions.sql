CREATE TABLE lnsat_store_metadata_v3 (
  singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
  contract_version TEXT NOT NULL CHECK (
    contract_version = 'lnsat.contracts.v1_0'
  ),
  schema_version INTEGER NOT NULL CHECK (schema_version = 3),
  storage_kind TEXT NOT NULL CHECK (
    storage_kind = 'sqlite_single_node'
  )
) STRICT;

INSERT INTO lnsat_store_metadata_v3 (
  singleton,
  contract_version,
  schema_version,
  storage_kind
)
SELECT
  singleton,
  contract_version,
  3,
  storage_kind
FROM lnsat_store_metadata;

DROP TABLE lnsat_store_metadata;
ALTER TABLE lnsat_store_metadata_v3 RENAME TO lnsat_store_metadata;

CREATE UNIQUE INDEX lnsat_packet_envelopes_binding_idx
  ON lnsat_packet_envelopes (packet_id, packet_sha256, project_ref);

CREATE TABLE lnsat_policy_decisions (
  decision_id TEXT PRIMARY KEY CHECK (
    length(decision_id) = 68
    AND substr(decision_id, 1, 4) = 'pol_'
    AND substr(decision_id, 5) NOT GLOB '*[^0-9a-f]*'
  ),
  schema_id TEXT NOT NULL CHECK (
    schema_id = 'lnsat.policy_decision.schema.v1_0'
  ),
  packet_id TEXT NOT NULL,
  packet_sha256 TEXT NOT NULL CHECK (
    length(packet_sha256) = 71
    AND substr(packet_sha256, 1, 7) = 'sha256:'
    AND substr(packet_sha256, 8) NOT GLOB '*[^0-9a-f]*'
  ),
  project_ref TEXT NOT NULL,
  evaluated_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  decision TEXT NOT NULL CHECK (
    decision IN ('allow', 'deny', 'approval_required')
  ),
  requires_approval INTEGER NOT NULL CHECK (
    requires_approval IN (0, 1)
    AND requires_approval = (decision = 'approval_required')
  ),
  UNIQUE (packet_id, evaluated_at),
  FOREIGN KEY (packet_id, packet_sha256, project_ref)
    REFERENCES lnsat_packet_envelopes (
      packet_id,
      packet_sha256,
      project_ref
    )
    ON UPDATE RESTRICT
    ON DELETE RESTRICT
) STRICT;

CREATE INDEX lnsat_policy_decisions_project_idx
  ON lnsat_policy_decisions (project_ref, decision_id);

CREATE TRIGGER lnsat_policy_decisions_reject_update
BEFORE UPDATE ON lnsat_policy_decisions
BEGIN
  SELECT RAISE(ABORT, 'policy decisions are immutable');
END;

CREATE TRIGGER lnsat_policy_decisions_reject_delete
BEFORE DELETE ON lnsat_policy_decisions
BEGIN
  SELECT RAISE(ABORT, 'policy decisions are immutable');
END;
