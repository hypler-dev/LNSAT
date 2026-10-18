-- Additive request evidence. Existing authority rows are neither adopted nor rewritten.
CREATE TABLE lnsat_store_metadata_v18 (
  singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
  contract_version TEXT NOT NULL CHECK (contract_version = 'lnsat.contracts.v1_0'),
  schema_version INTEGER NOT NULL CHECK (schema_version = 18),
  storage_kind TEXT NOT NULL CHECK (storage_kind = 'sqlite_single_node')
) STRICT;
INSERT INTO lnsat_store_metadata_v18
  SELECT singleton, contract_version, 18, storage_kind FROM lnsat_store_metadata;
DROP TABLE lnsat_store_metadata;
ALTER TABLE lnsat_store_metadata_v18 RENAME TO lnsat_store_metadata;

CREATE TABLE lnsat_action_requests (
  request_id TEXT PRIMARY KEY CHECK (length(request_id) = 68 AND substr(request_id,1,4) = 'arq_' AND substr(request_id,5) NOT GLOB '*[^0-9a-f]*'),
  contract TEXT NOT NULL CHECK (contract = 'lnsat.action_request.v1'),
  requester_ref TEXT NOT NULL,
  session_id TEXT NOT NULL,
  project_ref TEXT NOT NULL,
  resource_ref TEXT NOT NULL,
  idempotency_key TEXT NOT NULL CHECK (length(idempotency_key) BETWEEN 1 AND 256),
  packet_id TEXT NOT NULL,
  packet_sha256 TEXT NOT NULL CHECK (length(packet_sha256) = 71 AND substr(packet_sha256,1,7) = 'sha256:' AND substr(packet_sha256,8) NOT GLOB '*[^0-9a-f]*'),
  action_digest TEXT NOT NULL CHECK (length(action_digest) = 71 AND substr(action_digest,1,7) = 'sha256:' AND substr(action_digest,8) NOT GLOB '*[^0-9a-f]*'),
  target_digest TEXT NOT NULL CHECK (length(target_digest) = 71 AND substr(target_digest,1,7) = 'sha256:' AND substr(target_digest,8) NOT GLOB '*[^0-9a-f]*'),
  configuration_digest TEXT NOT NULL CHECK (length(configuration_digest) = 71 AND substr(configuration_digest,1,7) = 'sha256:' AND substr(configuration_digest,8) NOT GLOB '*[^0-9a-f]*'),
  created_at TEXT NOT NULL,
  evidence_digest TEXT NOT NULL CHECK (length(evidence_digest) = 71 AND substr(evidence_digest,1,7) = 'sha256:' AND substr(evidence_digest,8) NOT GLOB '*[^0-9a-f]*'),
  UNIQUE (requester_ref, project_ref, resource_ref, idempotency_key),
  UNIQUE (request_id, packet_id, packet_sha256, project_ref, resource_ref),
  FOREIGN KEY (requester_ref) REFERENCES lnsat_local_identities(identity_ref) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (session_id) REFERENCES lnsat_local_sessions(session_id) ON UPDATE RESTRICT ON DELETE RESTRICT
) STRICT;

CREATE UNIQUE INDEX lnsat_policy_decisions_request_binding_idx
  ON lnsat_policy_decisions(decision_id, packet_id, packet_sha256, project_ref);

CREATE TABLE lnsat_action_request_evaluations (
  request_id TEXT PRIMARY KEY,
  packet_id TEXT NOT NULL,
  packet_sha256 TEXT NOT NULL,
  project_ref TEXT NOT NULL,
  resource_ref TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('recorded', 'failed')),
  policy_decision_id TEXT UNIQUE,
  reason_code TEXT NOT NULL CHECK (reason_code IN ('policy_recorded', 'evaluation_rejected', 'persistence_failed')),
  recorded_at TEXT NOT NULL,
  evidence_digest TEXT NOT NULL CHECK (length(evidence_digest) = 71 AND substr(evidence_digest,1,7) = 'sha256:' AND substr(evidence_digest,8) NOT GLOB '*[^0-9a-f]*'),
  CHECK ((status = 'recorded' AND policy_decision_id IS NOT NULL AND reason_code = 'policy_recorded') OR (status = 'failed' AND policy_decision_id IS NULL AND reason_code != 'policy_recorded')),
  FOREIGN KEY (request_id, packet_id, packet_sha256, project_ref, resource_ref)
    REFERENCES lnsat_action_requests(request_id, packet_id, packet_sha256, project_ref, resource_ref) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (policy_decision_id, packet_id, packet_sha256, project_ref)
    REFERENCES lnsat_policy_decisions(decision_id, packet_id, packet_sha256, project_ref) ON UPDATE RESTRICT ON DELETE RESTRICT
) STRICT;

CREATE TABLE lnsat_action_request_observations (
  request_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('replay', 'conflict')),
  submitted_digest TEXT NOT NULL CHECK (length(submitted_digest) = 71 AND substr(submitted_digest,1,7) = 'sha256:' AND substr(submitted_digest,8) NOT GLOB '*[^0-9a-f]*'),
  observed_at TEXT NOT NULL,
  evidence_digest TEXT NOT NULL CHECK (length(evidence_digest) = 71 AND substr(evidence_digest,1,7) = 'sha256:' AND substr(evidence_digest,8) NOT GLOB '*[^0-9a-f]*'),
  PRIMARY KEY (request_id, kind),
  FOREIGN KEY (request_id) REFERENCES lnsat_action_requests(request_id) ON UPDATE RESTRICT ON DELETE RESTRICT
) STRICT;

CREATE TRIGGER lnsat_action_requests_reject_update BEFORE UPDATE ON lnsat_action_requests BEGIN SELECT RAISE(ABORT, 'action requests are immutable'); END;
CREATE TRIGGER lnsat_action_requests_reject_delete BEFORE DELETE ON lnsat_action_requests BEGIN SELECT RAISE(ABORT, 'action requests are immutable'); END;
CREATE TRIGGER lnsat_action_request_evaluations_reject_update BEFORE UPDATE ON lnsat_action_request_evaluations BEGIN SELECT RAISE(ABORT, 'request evaluations are immutable'); END;
CREATE TRIGGER lnsat_action_request_evaluations_reject_delete BEFORE DELETE ON lnsat_action_request_evaluations BEGIN SELECT RAISE(ABORT, 'request evaluations are immutable'); END;
CREATE TRIGGER lnsat_action_request_observations_reject_update BEFORE UPDATE ON lnsat_action_request_observations BEGIN SELECT RAISE(ABORT, 'request observations are immutable'); END;
CREATE TRIGGER lnsat_action_request_observations_reject_delete BEFORE DELETE ON lnsat_action_request_observations BEGIN SELECT RAISE(ABORT, 'request observations are immutable'); END;

DROP TRIGGER lnsat_retention_policies_reject_update;
DROP TRIGGER lnsat_retention_policies_reject_delete;

CREATE TABLE lnsat_retention_policies_v18 (
  record_family TEXT PRIMARY KEY CHECK (
    record_family IN (
      'action_request',
      'action_request_evaluation',
      'action_request_observation',
      'approval_decision',
      'approval_request',
      'audit_event',
      'audit_event_reason_code',
      'authorization_attempt',
      'authorization_nonce',
      'capability_consumption',
      'execution_authorization',
      'local_identity',
      'local_identity_event',
      'local_identity_status',
      'local_password_credential',
      'local_session',
      'local_session_activity',
      'local_session_event',
      'local_session_revocation',
      'local_session_rotation',
      'operation',
      'operation_attempt',
      'operation_receipt',
      'operation_reconciliation',
      'packet_envelope',
      'packet_resource_ref',
      'phase7_audit_binding',
      'phase7_entity',
      'phase7_state_event',
      'policy_decision',
      'recovery_inspection_event'
    )
  ),
  retention_class TEXT NOT NULL CHECK (retention_class = 'control_plane'),
  disposition TEXT NOT NULL CHECK (disposition = 'preserve'),
  cleanup_eligible INTEGER NOT NULL CHECK (cleanup_eligible = 0),
  minimum_retention_seconds INTEGER CHECK (minimum_retention_seconds IS NULL)
) STRICT;

INSERT INTO lnsat_retention_policies_v18 (
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

INSERT INTO lnsat_retention_policies_v18 (
  record_family,
  retention_class,
  disposition,
  cleanup_eligible,
  minimum_retention_seconds
)
VALUES
  ('action_request', 'control_plane', 'preserve', 0, NULL),
  ('action_request_evaluation', 'control_plane', 'preserve', 0, NULL),
  ('action_request_observation', 'control_plane', 'preserve', 0, NULL);

DROP TABLE lnsat_retention_policies;
ALTER TABLE lnsat_retention_policies_v18 RENAME TO lnsat_retention_policies;

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
