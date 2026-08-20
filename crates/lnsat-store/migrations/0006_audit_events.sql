CREATE TABLE lnsat_store_metadata_v6 (
  singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
  contract_version TEXT NOT NULL CHECK (
    contract_version = 'lnsat.contracts.v1_0'
  ),
  schema_version INTEGER NOT NULL CHECK (schema_version = 6),
  storage_kind TEXT NOT NULL CHECK (
    storage_kind = 'sqlite_single_node'
  )
) STRICT;

INSERT INTO lnsat_store_metadata_v6 (
  singleton,
  contract_version,
  schema_version,
  storage_kind
)
SELECT
  singleton,
  contract_version,
  6,
  storage_kind
FROM lnsat_store_metadata;

DROP TABLE lnsat_store_metadata;
ALTER TABLE lnsat_store_metadata_v6 RENAME TO lnsat_store_metadata;

CREATE UNIQUE INDEX lnsat_approval_decisions_binding_idx
  ON lnsat_approval_decisions (
    approval_decision_id,
    approval_request_id,
    project_ref
  );

CREATE TABLE lnsat_audit_events (
  event_id TEXT PRIMARY KEY CHECK (
    length(event_id) = 68
    AND substr(event_id, 1, 4) = 'aud_'
    AND substr(event_id, 5) NOT GLOB '*[^0-9a-f]*'
  ),
  schema_id TEXT NOT NULL CHECK (
    schema_id = 'lnsat.audit_event.schema.v1_0'
  ),
  event_type TEXT NOT NULL CHECK (
    event_type IN (
      'policy.decision_recorded',
      'approval.request_recorded',
      'approval.decision_recorded'
    )
  ),
  result_status TEXT NOT NULL CHECK (
    result_status IN (
      'allow',
      'deny',
      'approval_required',
      'requested',
      'approved',
      'denied'
    )
    AND (
      (
        event_type = 'policy.decision_recorded'
        AND result_status IN ('allow', 'deny', 'approval_required')
      )
      OR (
        event_type = 'approval.request_recorded'
        AND result_status = 'requested'
      )
      OR (
        event_type = 'approval.decision_recorded'
        AND result_status IN ('approved', 'denied')
      )
    )
  ),
  packet_id TEXT NOT NULL,
  packet_sha256 TEXT NOT NULL CHECK (
    length(packet_sha256) = 71
    AND substr(packet_sha256, 1, 7) = 'sha256:'
    AND substr(packet_sha256, 8) NOT GLOB '*[^0-9a-f]*'
  ),
  policy_decision_id TEXT NOT NULL,
  approval_request_id TEXT,
  approval_decision_id TEXT,
  actor_ref TEXT NOT NULL,
  session_ref TEXT NOT NULL,
  project_ref TEXT NOT NULL,
  source_evidence_hash TEXT NOT NULL CHECK (
    length(source_evidence_hash) = 71
    AND substr(source_evidence_hash, 1, 7) = 'sha256:'
    AND substr(source_evidence_hash, 8) NOT GLOB '*[^0-9a-f]*'
  ),
  idempotency_key TEXT NOT NULL,
  event_at TEXT NOT NULL,
  observed_at TEXT NOT NULL,
  retention_class TEXT NOT NULL CHECK (
    retention_class = 'control_plane'
  ),
  raw_rejected_command TEXT NOT NULL CHECK (
    raw_rejected_command = 'not_present'
  ),
  raw_rejected_value TEXT NOT NULL CHECK (
    raw_rejected_value = 'not_present'
  ),
  raw_invalid_payload_content TEXT NOT NULL CHECK (
    raw_invalid_payload_content = 'not_present'
  ),
  secret_like_values TEXT NOT NULL CHECK (
    secret_like_values = 'not_present'
  ),
  authenticated_provenance INTEGER NOT NULL CHECK (
    authenticated_provenance = 0
  ),
  persistence_requested INTEGER NOT NULL CHECK (
    persistence_requested = 0
  ),
  execution_authorized INTEGER NOT NULL CHECK (
    execution_authorized = 0
  ),
  CHECK (
    (
      event_type = 'policy.decision_recorded'
      AND approval_request_id IS NULL
      AND approval_decision_id IS NULL
    )
    OR (
      event_type = 'approval.request_recorded'
      AND approval_request_id IS NOT NULL
      AND approval_decision_id IS NULL
    )
    OR (
      event_type = 'approval.decision_recorded'
      AND approval_request_id IS NOT NULL
      AND approval_decision_id IS NOT NULL
    )
  ),
  UNIQUE (event_id, project_ref),
  UNIQUE (project_ref, idempotency_key),
  FOREIGN KEY (packet_id, packet_sha256, project_ref)
    REFERENCES lnsat_packet_envelopes (
      packet_id,
      packet_sha256,
      project_ref
    )
    ON UPDATE RESTRICT
    ON DELETE RESTRICT,
  FOREIGN KEY (policy_decision_id, packet_sha256, project_ref)
    REFERENCES lnsat_policy_decisions (
      decision_id,
      packet_sha256,
      project_ref
    )
    ON UPDATE RESTRICT
    ON DELETE RESTRICT,
  FOREIGN KEY (
    approval_request_id,
    policy_decision_id,
    project_ref
  )
    REFERENCES lnsat_approval_requests (
      approval_request_id,
      policy_decision_id,
      project_ref
    )
    ON UPDATE RESTRICT
    ON DELETE RESTRICT,
  FOREIGN KEY (
    approval_decision_id,
    approval_request_id,
    project_ref
  )
    REFERENCES lnsat_approval_decisions (
      approval_decision_id,
      approval_request_id,
      project_ref
    )
    ON UPDATE RESTRICT
    ON DELETE RESTRICT
) STRICT;

CREATE TABLE lnsat_audit_event_reason_codes (
  event_id TEXT NOT NULL,
  project_ref TEXT NOT NULL,
  ordinal INTEGER NOT NULL CHECK (ordinal >= 0),
  reason_code TEXT NOT NULL CHECK (length(reason_code) > 0),
  PRIMARY KEY (event_id, ordinal),
  UNIQUE (event_id, reason_code),
  FOREIGN KEY (event_id, project_ref)
    REFERENCES lnsat_audit_events (event_id, project_ref)
    ON UPDATE RESTRICT
    ON DELETE RESTRICT
) STRICT;

CREATE INDEX lnsat_audit_events_project_idx
  ON lnsat_audit_events (project_ref, event_id);

CREATE INDEX lnsat_audit_events_resource_chain_idx
  ON lnsat_audit_events (project_ref, packet_id, event_id);

CREATE TRIGGER lnsat_audit_events_reject_update
BEFORE UPDATE ON lnsat_audit_events
BEGIN
  SELECT RAISE(ABORT, 'audit events are immutable');
END;

CREATE TRIGGER lnsat_audit_events_reject_delete
BEFORE DELETE ON lnsat_audit_events
BEGIN
  SELECT RAISE(ABORT, 'audit events are immutable');
END;

CREATE TRIGGER lnsat_audit_event_reason_codes_reject_update
BEFORE UPDATE ON lnsat_audit_event_reason_codes
BEGIN
  SELECT RAISE(ABORT, 'audit event reason codes are immutable');
END;

CREATE TRIGGER lnsat_audit_event_reason_codes_reject_delete
BEFORE DELETE ON lnsat_audit_event_reason_codes
BEGIN
  SELECT RAISE(ABORT, 'audit event reason codes are immutable');
END;
