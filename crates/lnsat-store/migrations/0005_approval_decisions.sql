CREATE TABLE lnsat_store_metadata_v5 (
  singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
  contract_version TEXT NOT NULL CHECK (
    contract_version = 'lnsat.contracts.v1_0'
  ),
  schema_version INTEGER NOT NULL CHECK (schema_version = 5),
  storage_kind TEXT NOT NULL CHECK (
    storage_kind = 'sqlite_single_node'
  )
) STRICT;

INSERT INTO lnsat_store_metadata_v5 (
  singleton,
  contract_version,
  schema_version,
  storage_kind
)
SELECT
  singleton,
  contract_version,
  5,
  storage_kind
FROM lnsat_store_metadata;

DROP TABLE lnsat_store_metadata;
ALTER TABLE lnsat_store_metadata_v5 RENAME TO lnsat_store_metadata;

CREATE UNIQUE INDEX lnsat_approval_requests_binding_idx
  ON lnsat_approval_requests (
    approval_request_id,
    policy_decision_id,
    project_ref
  );

CREATE TABLE lnsat_approval_decisions (
  approval_decision_id TEXT PRIMARY KEY CHECK (
    length(approval_decision_id) = 68
    AND substr(approval_decision_id, 1, 4) = 'apd_'
    AND substr(approval_decision_id, 5) NOT GLOB '*[^0-9a-f]*'
  ),
  schema_id TEXT NOT NULL CHECK (
    schema_id = 'lnsat.approval_decision.schema.v1_0'
  ),
  approval_request_id TEXT NOT NULL UNIQUE,
  policy_decision_id TEXT NOT NULL,
  approver_ref TEXT NOT NULL CHECK (
    substr(approver_ref, 1, 15) = 'identity:human:'
  ),
  approver_session_ref TEXT NOT NULL,
  project_ref TEXT NOT NULL,
  decision TEXT NOT NULL CHECK (
    decision IN ('approved', 'denied')
  ),
  reason TEXT NOT NULL CHECK (
    reason IN (
      'approval.operator_approved',
      'approval.operator_denied',
      'approval.scope_rejected',
      'approval.evidence_insufficient',
      'approval.request_superseded'
    )
    AND (
      (decision = 'approved' AND reason = 'approval.operator_approved')
      OR
      (decision = 'denied' AND reason != 'approval.operator_approved')
    )
  ),
  decided_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  approval_gate_satisfied INTEGER NOT NULL CHECK (
    approval_gate_satisfied IN (0, 1)
    AND approval_gate_satisfied = (decision = 'approved')
  ),
  execution_authorized INTEGER NOT NULL CHECK (
    execution_authorized = 0
  ),
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
    ON DELETE RESTRICT
) STRICT;

CREATE INDEX lnsat_approval_decisions_project_idx
  ON lnsat_approval_decisions (project_ref, approval_decision_id);

CREATE TRIGGER lnsat_approval_decisions_reject_update
BEFORE UPDATE ON lnsat_approval_decisions
BEGIN
  SELECT RAISE(ABORT, 'approval decisions are immutable');
END;

CREATE TRIGGER lnsat_approval_decisions_reject_delete
BEFORE DELETE ON lnsat_approval_decisions
BEGIN
  SELECT RAISE(ABORT, 'approval decisions are immutable');
END;
