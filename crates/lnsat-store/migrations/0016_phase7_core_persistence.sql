CREATE TABLE lnsat_store_metadata_v16 (
  singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
  contract_version TEXT NOT NULL CHECK (
    contract_version = 'lnsat.contracts.v1_0'
  ),
  schema_version INTEGER NOT NULL CHECK (schema_version = 16),
  storage_kind TEXT NOT NULL CHECK (
    storage_kind = 'sqlite_single_node'
  )
) STRICT;

INSERT INTO lnsat_store_metadata_v16 (
  singleton,
  contract_version,
  schema_version,
  storage_kind
)
SELECT
  singleton,
  contract_version,
  16,
  storage_kind
FROM lnsat_store_metadata;

DROP TABLE lnsat_store_metadata;
ALTER TABLE lnsat_store_metadata_v16 RENAME TO lnsat_store_metadata;

DROP TRIGGER lnsat_retention_policies_reject_update;
DROP TRIGGER lnsat_retention_policies_reject_delete;

CREATE TABLE lnsat_retention_policies_v16 (
  record_family TEXT PRIMARY KEY CHECK (
    record_family IN (
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

INSERT INTO lnsat_retention_policies_v16 (
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

INSERT INTO lnsat_retention_policies_v16 (
  record_family,
  retention_class,
  disposition,
  cleanup_eligible,
  minimum_retention_seconds
)
VALUES
  ('authorization_attempt', 'control_plane', 'preserve', 0, NULL),
  ('authorization_nonce', 'control_plane', 'preserve', 0, NULL),
  ('capability_consumption', 'control_plane', 'preserve', 0, NULL),
  ('execution_authorization', 'control_plane', 'preserve', 0, NULL),
  ('operation', 'control_plane', 'preserve', 0, NULL),
  ('operation_attempt', 'control_plane', 'preserve', 0, NULL),
  ('operation_receipt', 'control_plane', 'preserve', 0, NULL),
  ('operation_reconciliation', 'control_plane', 'preserve', 0, NULL),
  ('phase7_audit_binding', 'control_plane', 'preserve', 0, NULL),
  ('phase7_entity', 'control_plane', 'preserve', 0, NULL),
  ('phase7_state_event', 'control_plane', 'preserve', 0, NULL);

DROP TABLE lnsat_retention_policies;
ALTER TABLE lnsat_retention_policies_v16 RENAME TO lnsat_retention_policies;

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

CREATE UNIQUE INDEX lnsat_approval_decisions_phase7_binding_idx
  ON lnsat_approval_decisions (
    approval_decision_id,
    approval_request_id,
    policy_decision_id,
    project_ref
  );

CREATE UNIQUE INDEX lnsat_policy_decisions_phase7_binding_idx
  ON lnsat_policy_decisions (
    decision_id,
    packet_id,
    packet_sha256,
    project_ref
  );

CREATE UNIQUE INDEX lnsat_packet_resource_phase7_binding_idx
  ON lnsat_packet_resource_refs (
    packet_id,
    project_ref,
    resource_ref
  );

CREATE TABLE lnsat_phase7_entities (
  entity_id TEXT PRIMARY KEY CHECK (
    length(entity_id) = 68
    AND substr(entity_id, 5) NOT GLOB '*[^0-9a-f]*'
  ),
  entity_kind TEXT NOT NULL CHECK (
    entity_kind IN (
      'authorization_attempt',
      'authorization_nonce',
      'execution_authorization',
      'capability_consumption',
      'operation',
      'operation_attempt',
      'operation_receipt',
      'operation_reconciliation',
      'phase7_state_event'
    )
    AND (
      (entity_kind = 'authorization_attempt' AND substr(entity_id, 1, 4) = 'aat_')
      OR (entity_kind = 'authorization_nonce' AND substr(entity_id, 1, 4) = 'non_')
      OR (entity_kind = 'execution_authorization' AND substr(entity_id, 1, 4) = 'xau_')
      OR (entity_kind = 'capability_consumption' AND substr(entity_id, 1, 4) = 'cpc_')
      OR (entity_kind = 'operation' AND substr(entity_id, 1, 4) = 'opn_')
      OR (entity_kind = 'operation_attempt' AND substr(entity_id, 1, 4) = 'opa_')
      OR (entity_kind = 'operation_receipt' AND substr(entity_id, 1, 4) = 'rcp_')
      OR (entity_kind = 'operation_reconciliation' AND substr(entity_id, 1, 4) = 'rec_')
      OR (entity_kind = 'phase7_state_event' AND substr(entity_id, 1, 4) = 'ste_')
    )
  ),
  project_ref TEXT NOT NULL CHECK (
    length(project_ref) BETWEEN 1 AND 256
  ),
  resource_ref TEXT NOT NULL CHECK (
    length(resource_ref) BETWEEN 1 AND 256
  ),
  audit_binding_id TEXT NOT NULL UNIQUE CHECK (
    length(audit_binding_id) = 68
    AND substr(audit_binding_id, 1, 4) = 'p7a_'
    AND substr(audit_binding_id, 5) NOT GLOB '*[^0-9a-f]*'
  ),
  record_digest BLOB NOT NULL CHECK (length(record_digest) = 32),
  created_at TEXT NOT NULL CHECK (
    length(created_at) IN (20, 24)
    AND strftime('%Y-%m-%dT%H:%M:%fZ', created_at, '+0 days') IS NOT NULL
    AND (
      created_at = strftime('%Y-%m-%dT%H:%M:%SZ', created_at, '+0 days')
      OR created_at = strftime('%Y-%m-%dT%H:%M:%fZ', created_at, '+0 days')
    )
  ),
  UNIQUE (
    entity_id,
    entity_kind,
    project_ref,
    resource_ref
  ),
  UNIQUE (
    entity_id,
    entity_kind,
    project_ref,
    resource_ref,
    record_digest
  ),
  FOREIGN KEY (
    audit_binding_id,
    entity_id,
    entity_kind,
    project_ref,
    resource_ref,
    record_digest
  )
    REFERENCES lnsat_phase7_audit_bindings (
      audit_binding_id,
      record_id,
      record_family,
      project_ref,
      resource_ref,
      record_digest
    )
    ON UPDATE RESTRICT
    ON DELETE RESTRICT
    DEFERRABLE INITIALLY DEFERRED
) STRICT;

CREATE TABLE lnsat_phase7_audit_bindings (
  audit_binding_id TEXT PRIMARY KEY CHECK (
    length(audit_binding_id) = 68
    AND substr(audit_binding_id, 1, 4) = 'p7a_'
    AND substr(audit_binding_id, 5) NOT GLOB '*[^0-9a-f]*'
  ),
  record_id TEXT NOT NULL UNIQUE,
  record_family TEXT NOT NULL CHECK (
    record_family IN (
      'authorization_attempt',
      'authorization_nonce',
      'execution_authorization',
      'capability_consumption',
      'operation',
      'operation_attempt',
      'operation_receipt',
      'operation_reconciliation',
      'phase7_state_event'
    )
  ),
  project_ref TEXT NOT NULL CHECK (
    length(project_ref) BETWEEN 1 AND 256
  ),
  resource_ref TEXT NOT NULL CHECK (
    length(resource_ref) BETWEEN 1 AND 256
  ),
  record_digest BLOB NOT NULL CHECK (length(record_digest) = 32),
  event_kind TEXT NOT NULL CHECK (
    event_kind IN (
      'persistence_prepared',
      'nonce_state_recorded',
      'authorization_state_recorded',
      'capability_consumption_recorded',
      'operation_state_recorded',
      'operation_attempt_state_recorded',
      'receipt_recorded',
      'reconciliation_recorded'
    )
  ),
  authority_effect TEXT NOT NULL CHECK (
    authority_effect IN (
      'none',
      'nonce_active',
      'authorization_active',
      'capability_consumed',
      'adapter_executed',
      'receipt_bound'
    )
  ),
  recorded_at TEXT NOT NULL CHECK (
    length(recorded_at) IN (20, 24)
    AND strftime('%Y-%m-%dT%H:%M:%fZ', recorded_at, '+0 days') IS NOT NULL
    AND (
      recorded_at = strftime('%Y-%m-%dT%H:%M:%SZ', recorded_at, '+0 days')
      OR recorded_at = strftime('%Y-%m-%dT%H:%M:%fZ', recorded_at, '+0 days')
    )
  ),
  UNIQUE (
    audit_binding_id,
    record_id,
    record_family,
    project_ref,
    resource_ref,
    record_digest
  ),
  UNIQUE (
    record_id,
    record_family,
    project_ref,
    resource_ref,
    record_digest
  ),
  FOREIGN KEY (
    record_id,
    record_family,
    project_ref,
    resource_ref,
    record_digest
  )
    REFERENCES lnsat_phase7_entities (
      entity_id,
      entity_kind,
      project_ref,
      resource_ref,
      record_digest
    )
    ON UPDATE RESTRICT
    ON DELETE RESTRICT
    DEFERRABLE INITIALLY DEFERRED
) STRICT;

CREATE TABLE lnsat_authorization_attempts (
  authorization_attempt_id TEXT PRIMARY KEY,
  entity_kind TEXT NOT NULL CHECK (
    entity_kind = 'authorization_attempt'
  ),
  project_ref TEXT NOT NULL,
  resource_ref TEXT NOT NULL,
  approval_decision_id TEXT NOT NULL,
  approval_request_id TEXT NOT NULL,
  policy_decision_id TEXT NOT NULL,
  packet_id TEXT NOT NULL,
  packet_sha256 TEXT NOT NULL CHECK (
    length(packet_sha256) = 71
    AND substr(packet_sha256, 1, 7) = 'sha256:'
    AND substr(packet_sha256, 8) NOT GLOB '*[^0-9a-f]*'
  ),
  requester_ref TEXT NOT NULL,
  requester_session_ref TEXT NOT NULL,
  approver_ref TEXT NOT NULL,
  approver_session_ref TEXT NOT NULL,
  idempotency_key TEXT NOT NULL CHECK (
    length(idempotency_key) BETWEEN 1 AND 256
  ),
  request_digest BLOB NOT NULL CHECK (length(request_digest) = 32),
  binding_digest BLOB NOT NULL CHECK (length(binding_digest) = 32),
  action_digest BLOB NOT NULL CHECK (length(action_digest) = 32),
  target_digest BLOB NOT NULL CHECK (length(target_digest) = 32),
  configuration_digest BLOB NOT NULL CHECK (length(configuration_digest) = 32),
  adapter_ref TEXT NOT NULL CHECK (
    length(adapter_ref) BETWEEN 1 AND 256
  ),
  executable_digest BLOB NOT NULL CHECK (length(executable_digest) = 32),
  audience TEXT NOT NULL CHECK (
    length(audience) BETWEEN 1 AND 256
  ),
  requested_at TEXT NOT NULL CHECK (
    length(requested_at) IN (20, 24)
    AND strftime('%Y-%m-%dT%H:%M:%fZ', requested_at, '+0 days') IS NOT NULL
    AND (
      requested_at = strftime('%Y-%m-%dT%H:%M:%SZ', requested_at, '+0 days')
      OR requested_at = strftime('%Y-%m-%dT%H:%M:%fZ', requested_at, '+0 days')
    )
  ),
  expires_at TEXT NOT NULL CHECK (
    length(expires_at) IN (20, 24)
    AND strftime('%Y-%m-%dT%H:%M:%fZ', expires_at, '+0 days') IS NOT NULL
    AND (
      expires_at = strftime('%Y-%m-%dT%H:%M:%SZ', expires_at, '+0 days')
      OR expires_at = strftime('%Y-%m-%dT%H:%M:%fZ', expires_at, '+0 days')
    )
    AND julianday(expires_at) > julianday(requested_at)
  ),
  result_status TEXT NOT NULL CHECK (
    result_status IN ('persistence_prepared', 'rejected', 'failed')
  ),
  execution_authorized INTEGER NOT NULL CHECK (
    execution_authorized = 0
  ),
  UNIQUE (project_ref, idempotency_key),
  UNIQUE (
    authorization_attempt_id,
    project_ref,
    resource_ref
  ),
  UNIQUE (
    authorization_attempt_id,
    project_ref,
    resource_ref,
    binding_digest
  ),
  FOREIGN KEY (
    authorization_attempt_id,
    entity_kind,
    project_ref,
    resource_ref
  )
    REFERENCES lnsat_phase7_entities (
      entity_id,
      entity_kind,
      project_ref,
      resource_ref
    )
    ON UPDATE RESTRICT
    ON DELETE RESTRICT,
  FOREIGN KEY (
    approval_decision_id,
    approval_request_id,
    policy_decision_id,
    project_ref
  )
    REFERENCES lnsat_approval_decisions (
      approval_decision_id,
      approval_request_id,
      policy_decision_id,
      project_ref
    )
    ON UPDATE RESTRICT
    ON DELETE RESTRICT,
  FOREIGN KEY (
    policy_decision_id,
    packet_id,
    packet_sha256,
    project_ref
  )
    REFERENCES lnsat_policy_decisions (
      decision_id,
      packet_id,
      packet_sha256,
      project_ref
    )
    ON UPDATE RESTRICT
    ON DELETE RESTRICT,
  FOREIGN KEY (
    packet_id,
    project_ref,
    resource_ref
  )
    REFERENCES lnsat_packet_resource_refs (
      packet_id,
      project_ref,
      resource_ref
    )
    ON UPDATE RESTRICT
    ON DELETE RESTRICT
) STRICT;

CREATE TABLE lnsat_authorization_nonces (
  nonce_id TEXT PRIMARY KEY,
  entity_kind TEXT NOT NULL CHECK (
    entity_kind = 'authorization_nonce'
  ),
  project_ref TEXT NOT NULL,
  resource_ref TEXT NOT NULL,
  authorization_attempt_id TEXT NOT NULL UNIQUE,
  binding_digest BLOB NOT NULL CHECK (length(binding_digest) = 32),
  nonce_digest BLOB NOT NULL CHECK (length(nonce_digest) = 32),
  issued_at TEXT NOT NULL CHECK (
    length(issued_at) IN (20, 24)
    AND strftime('%Y-%m-%dT%H:%M:%fZ', issued_at, '+0 days') IS NOT NULL
    AND (
      issued_at = strftime('%Y-%m-%dT%H:%M:%SZ', issued_at, '+0 days')
      OR issued_at = strftime('%Y-%m-%dT%H:%M:%fZ', issued_at, '+0 days')
    )
  ),
  expires_at TEXT NOT NULL CHECK (
    length(expires_at) IN (20, 24)
    AND strftime('%Y-%m-%dT%H:%M:%fZ', expires_at, '+0 days') IS NOT NULL
    AND (
      expires_at = strftime('%Y-%m-%dT%H:%M:%SZ', expires_at, '+0 days')
      OR expires_at = strftime('%Y-%m-%dT%H:%M:%fZ', expires_at, '+0 days')
    )
    AND julianday(expires_at) > julianday(issued_at)
  ),
  UNIQUE (project_ref, nonce_digest),
  UNIQUE (nonce_id, project_ref, resource_ref),
  UNIQUE (nonce_id, project_ref, resource_ref, binding_digest),
  FOREIGN KEY (
    nonce_id,
    entity_kind,
    project_ref,
    resource_ref
  )
    REFERENCES lnsat_phase7_entities (
      entity_id,
      entity_kind,
      project_ref,
      resource_ref
    )
    ON UPDATE RESTRICT
    ON DELETE RESTRICT,
  FOREIGN KEY (
    authorization_attempt_id,
    project_ref,
    resource_ref,
    binding_digest
  )
    REFERENCES lnsat_authorization_attempts (
      authorization_attempt_id,
      project_ref,
      resource_ref,
      binding_digest
    )
    ON UPDATE RESTRICT
    ON DELETE RESTRICT
) STRICT;

CREATE TABLE lnsat_execution_authorizations (
  authorization_id TEXT PRIMARY KEY,
  entity_kind TEXT NOT NULL CHECK (
    entity_kind = 'execution_authorization'
  ),
  project_ref TEXT NOT NULL,
  resource_ref TEXT NOT NULL,
  authorization_attempt_id TEXT NOT NULL UNIQUE,
  nonce_id TEXT NOT NULL UNIQUE,
  binding_digest BLOB NOT NULL CHECK (length(binding_digest) = 32),
  approval_decision_id TEXT NOT NULL,
  policy_decision_id TEXT NOT NULL,
  packet_id TEXT NOT NULL,
  packet_sha256 TEXT NOT NULL CHECK (
    length(packet_sha256) = 71
    AND substr(packet_sha256, 1, 7) = 'sha256:'
    AND substr(packet_sha256, 8) NOT GLOB '*[^0-9a-f]*'
  ),
  requester_ref TEXT NOT NULL,
  requester_session_ref TEXT NOT NULL,
  approver_ref TEXT NOT NULL,
  approver_session_ref TEXT NOT NULL,
  action_digest BLOB NOT NULL CHECK (length(action_digest) = 32),
  target_digest BLOB NOT NULL CHECK (length(target_digest) = 32),
  configuration_digest BLOB NOT NULL CHECK (length(configuration_digest) = 32),
  adapter_ref TEXT NOT NULL CHECK (
    length(adapter_ref) BETWEEN 1 AND 256
  ),
  executable_digest BLOB NOT NULL CHECK (length(executable_digest) = 32),
  audience TEXT NOT NULL CHECK (
    length(audience) BETWEEN 1 AND 256
  ),
  capability_digest BLOB NOT NULL CHECK (length(capability_digest) = 32),
  authorization_profile TEXT NOT NULL CHECK (
    authorization_profile = 'server_record_plus_digest_stored_one_time_capability'
  ),
  issued_at TEXT NOT NULL CHECK (
    length(issued_at) IN (20, 24)
    AND strftime('%Y-%m-%dT%H:%M:%fZ', issued_at, '+0 days') IS NOT NULL
    AND (
      issued_at = strftime('%Y-%m-%dT%H:%M:%SZ', issued_at, '+0 days')
      OR issued_at = strftime('%Y-%m-%dT%H:%M:%fZ', issued_at, '+0 days')
    )
  ),
  expires_at TEXT NOT NULL CHECK (
    length(expires_at) IN (20, 24)
    AND strftime('%Y-%m-%dT%H:%M:%fZ', expires_at, '+0 days') IS NOT NULL
    AND (
      expires_at = strftime('%Y-%m-%dT%H:%M:%SZ', expires_at, '+0 days')
      OR expires_at = strftime('%Y-%m-%dT%H:%M:%fZ', expires_at, '+0 days')
    )
    AND julianday(expires_at) > julianday(issued_at)
  ),
  UNIQUE (project_ref, capability_digest),
  UNIQUE (authorization_id, project_ref, resource_ref),
  UNIQUE (
    authorization_id,
    project_ref,
    resource_ref,
    binding_digest
  ),
  UNIQUE (
    authorization_id,
    project_ref,
    resource_ref,
    binding_digest,
    capability_digest
  ),
  FOREIGN KEY (
    authorization_id,
    entity_kind,
    project_ref,
    resource_ref
  )
    REFERENCES lnsat_phase7_entities (
      entity_id,
      entity_kind,
      project_ref,
      resource_ref
    )
    ON UPDATE RESTRICT
    ON DELETE RESTRICT,
  FOREIGN KEY (
    authorization_attempt_id,
    project_ref,
    resource_ref,
    binding_digest
  )
    REFERENCES lnsat_authorization_attempts (
      authorization_attempt_id,
      project_ref,
      resource_ref,
      binding_digest
    )
    ON UPDATE RESTRICT
    ON DELETE RESTRICT,
  FOREIGN KEY (
    nonce_id,
    project_ref,
    resource_ref,
    binding_digest
  )
    REFERENCES lnsat_authorization_nonces (
      nonce_id,
      project_ref,
      resource_ref,
      binding_digest
    )
    ON UPDATE RESTRICT
    ON DELETE RESTRICT
) STRICT;

CREATE TABLE lnsat_operations (
  operation_id TEXT PRIMARY KEY,
  entity_kind TEXT NOT NULL CHECK (entity_kind = 'operation'),
  project_ref TEXT NOT NULL,
  resource_ref TEXT NOT NULL,
  authorization_id TEXT NOT NULL UNIQUE,
  binding_digest BLOB NOT NULL CHECK (length(binding_digest) = 32),
  idempotency_key TEXT NOT NULL CHECK (
    length(idempotency_key) BETWEEN 1 AND 256
  ),
  request_digest BLOB NOT NULL CHECK (length(request_digest) = 32),
  requested_action_digest BLOB NOT NULL CHECK (
    length(requested_action_digest) = 32
  ),
  approved_action_digest BLOB NOT NULL CHECK (
    length(approved_action_digest) = 32
  ),
  authorized_action_digest BLOB NOT NULL CHECK (
    length(authorized_action_digest) = 32
  ),
  target_digest BLOB NOT NULL CHECK (length(target_digest) = 32),
  configuration_digest BLOB NOT NULL CHECK (length(configuration_digest) = 32),
  adapter_ref TEXT NOT NULL CHECK (
    length(adapter_ref) BETWEEN 1 AND 256
  ),
  executable_digest BLOB NOT NULL CHECK (length(executable_digest) = 32),
  audience TEXT NOT NULL CHECK (
    length(audience) BETWEEN 1 AND 256
  ),
  created_at TEXT NOT NULL CHECK (
    length(created_at) IN (20, 24)
    AND strftime('%Y-%m-%dT%H:%M:%fZ', created_at, '+0 days') IS NOT NULL
    AND (
      created_at = strftime('%Y-%m-%dT%H:%M:%SZ', created_at, '+0 days')
      OR created_at = strftime('%Y-%m-%dT%H:%M:%fZ', created_at, '+0 days')
    )
  ),
  expires_at TEXT NOT NULL CHECK (
    length(expires_at) IN (20, 24)
    AND strftime('%Y-%m-%dT%H:%M:%fZ', expires_at, '+0 days') IS NOT NULL
    AND (
      expires_at = strftime('%Y-%m-%dT%H:%M:%SZ', expires_at, '+0 days')
      OR expires_at = strftime('%Y-%m-%dT%H:%M:%fZ', expires_at, '+0 days')
    )
    AND julianday(expires_at) > julianday(created_at)
  ),
  UNIQUE (project_ref, idempotency_key),
  UNIQUE (operation_id, project_ref, resource_ref),
  UNIQUE (
    operation_id,
    authorization_id,
    project_ref,
    resource_ref,
    binding_digest
  ),
  UNIQUE (
    operation_id,
    project_ref,
    resource_ref,
    requested_action_digest,
    approved_action_digest,
    authorized_action_digest
  ),
  CHECK (
    requested_action_digest = approved_action_digest
    AND approved_action_digest = authorized_action_digest
  ),
  FOREIGN KEY (
    operation_id,
    entity_kind,
    project_ref,
    resource_ref
  )
    REFERENCES lnsat_phase7_entities (
      entity_id,
      entity_kind,
      project_ref,
      resource_ref
    )
    ON UPDATE RESTRICT
    ON DELETE RESTRICT,
  FOREIGN KEY (
    authorization_id,
    project_ref,
    resource_ref,
    binding_digest
  )
    REFERENCES lnsat_execution_authorizations (
      authorization_id,
      project_ref,
      resource_ref,
      binding_digest
    )
    ON UPDATE RESTRICT
    ON DELETE RESTRICT
) STRICT;

CREATE TABLE lnsat_capability_consumptions (
  consumption_id TEXT PRIMARY KEY,
  entity_kind TEXT NOT NULL CHECK (
    entity_kind = 'capability_consumption'
  ),
  project_ref TEXT NOT NULL,
  resource_ref TEXT NOT NULL,
  authorization_id TEXT NOT NULL UNIQUE,
  operation_id TEXT NOT NULL UNIQUE,
  binding_digest BLOB NOT NULL CHECK (length(binding_digest) = 32),
  capability_digest BLOB NOT NULL CHECK (length(capability_digest) = 32),
  idempotency_key TEXT NOT NULL CHECK (
    length(idempotency_key) BETWEEN 1 AND 256
  ),
  request_digest BLOB NOT NULL CHECK (length(request_digest) = 32),
  consumed_at TEXT NOT NULL CHECK (
    length(consumed_at) IN (20, 24)
    AND strftime('%Y-%m-%dT%H:%M:%fZ', consumed_at, '+0 days') IS NOT NULL
    AND (
      consumed_at = strftime('%Y-%m-%dT%H:%M:%SZ', consumed_at, '+0 days')
      OR consumed_at = strftime('%Y-%m-%dT%H:%M:%fZ', consumed_at, '+0 days')
    )
  ),
  UNIQUE (project_ref, idempotency_key),
  UNIQUE (consumption_id, project_ref, resource_ref),
  UNIQUE (
    consumption_id,
    operation_id,
    authorization_id,
    project_ref,
    resource_ref
  ),
  FOREIGN KEY (
    consumption_id,
    entity_kind,
    project_ref,
    resource_ref
  )
    REFERENCES lnsat_phase7_entities (
      entity_id,
      entity_kind,
      project_ref,
      resource_ref
    )
    ON UPDATE RESTRICT
    ON DELETE RESTRICT,
  FOREIGN KEY (
    authorization_id,
    project_ref,
    resource_ref,
    binding_digest,
    capability_digest
  )
    REFERENCES lnsat_execution_authorizations (
      authorization_id,
      project_ref,
      resource_ref,
      binding_digest,
      capability_digest
    )
    ON UPDATE RESTRICT
    ON DELETE RESTRICT,
  FOREIGN KEY (
    operation_id,
    authorization_id,
    project_ref,
    resource_ref,
    binding_digest
  )
    REFERENCES lnsat_operations (
      operation_id,
      authorization_id,
      project_ref,
      resource_ref,
      binding_digest
    )
    ON UPDATE RESTRICT
    ON DELETE RESTRICT
) STRICT;

CREATE TABLE lnsat_operation_attempts (
  operation_attempt_id TEXT PRIMARY KEY,
  entity_kind TEXT NOT NULL CHECK (entity_kind = 'operation_attempt'),
  project_ref TEXT NOT NULL,
  resource_ref TEXT NOT NULL,
  operation_id TEXT NOT NULL,
  attempt_sequence INTEGER NOT NULL CHECK (
    attempt_sequence BETWEEN 1 AND 64
  ),
  adapter_ref TEXT NOT NULL CHECK (
    length(adapter_ref) BETWEEN 1 AND 256
  ),
  protocol_version TEXT NOT NULL CHECK (
    length(protocol_version) BETWEEN 1 AND 64
  ),
  tool_arguments_digest BLOB NOT NULL CHECK (
    length(tool_arguments_digest) = 32
  ),
  created_at TEXT NOT NULL CHECK (
    length(created_at) IN (20, 24)
    AND strftime('%Y-%m-%dT%H:%M:%fZ', created_at, '+0 days') IS NOT NULL
    AND (
      created_at = strftime('%Y-%m-%dT%H:%M:%SZ', created_at, '+0 days')
      OR created_at = strftime('%Y-%m-%dT%H:%M:%fZ', created_at, '+0 days')
    )
  ),
  UNIQUE (operation_id, attempt_sequence),
  UNIQUE (operation_attempt_id, project_ref, resource_ref),
  UNIQUE (
    operation_attempt_id,
    operation_id,
    project_ref,
    resource_ref
  ),
  FOREIGN KEY (
    operation_attempt_id,
    entity_kind,
    project_ref,
    resource_ref
  )
    REFERENCES lnsat_phase7_entities (
      entity_id,
      entity_kind,
      project_ref,
      resource_ref
    )
    ON UPDATE RESTRICT
    ON DELETE RESTRICT,
  FOREIGN KEY (
    operation_id,
    project_ref,
    resource_ref
  )
    REFERENCES lnsat_operations (
      operation_id,
      project_ref,
      resource_ref
    )
    ON UPDATE RESTRICT
    ON DELETE RESTRICT
) STRICT;

CREATE TABLE lnsat_operation_receipts (
  receipt_id TEXT PRIMARY KEY,
  entity_kind TEXT NOT NULL CHECK (entity_kind = 'operation_receipt'),
  project_ref TEXT NOT NULL,
  resource_ref TEXT NOT NULL,
  operation_id TEXT NOT NULL UNIQUE,
  operation_attempt_id TEXT NOT NULL UNIQUE,
  authorization_id TEXT NOT NULL UNIQUE,
  consumption_id TEXT NOT NULL UNIQUE,
  requested_action_digest BLOB NOT NULL CHECK (
    length(requested_action_digest) = 32
  ),
  approved_action_digest BLOB NOT NULL CHECK (
    length(approved_action_digest) = 32
  ),
  authorized_action_digest BLOB NOT NULL CHECK (
    length(authorized_action_digest) = 32
  ),
  executed_action_digest BLOB NOT NULL CHECK (
    length(executed_action_digest) = 32
  ),
  result_digest BLOB NOT NULL CHECK (length(result_digest) = 32),
  receipt_authentication_profile TEXT NOT NULL CHECK (
    receipt_authentication_profile = 'local_authenticated_adapter_channel'
  ),
  verification_status TEXT NOT NULL CHECK (
    verification_status IN ('accepted', 'rejected')
  ),
  digest_bound INTEGER NOT NULL CHECK (
    digest_bound IN (0, 1)
    AND (
      (
        verification_status = 'accepted'
        AND digest_bound = 1
        AND requested_action_digest = approved_action_digest
        AND approved_action_digest = authorized_action_digest
        AND authorized_action_digest = executed_action_digest
      )
      OR (
        verification_status = 'rejected'
        AND digest_bound = 0
      )
    )
  ),
  received_at TEXT NOT NULL CHECK (
    length(received_at) IN (20, 24)
    AND strftime('%Y-%m-%dT%H:%M:%fZ', received_at, '+0 days') IS NOT NULL
    AND (
      received_at = strftime('%Y-%m-%dT%H:%M:%SZ', received_at, '+0 days')
      OR received_at = strftime('%Y-%m-%dT%H:%M:%fZ', received_at, '+0 days')
    )
  ),
  UNIQUE (receipt_id, project_ref, resource_ref),
  FOREIGN KEY (
    receipt_id,
    entity_kind,
    project_ref,
    resource_ref
  )
    REFERENCES lnsat_phase7_entities (
      entity_id,
      entity_kind,
      project_ref,
      resource_ref
    )
    ON UPDATE RESTRICT
    ON DELETE RESTRICT,
  FOREIGN KEY (
    operation_id,
    project_ref,
    resource_ref,
    requested_action_digest,
    approved_action_digest,
    authorized_action_digest
  )
    REFERENCES lnsat_operations (
      operation_id,
      project_ref,
      resource_ref,
      requested_action_digest,
      approved_action_digest,
      authorized_action_digest
    )
    ON UPDATE RESTRICT
    ON DELETE RESTRICT,
  FOREIGN KEY (
    operation_attempt_id,
    operation_id,
    project_ref,
    resource_ref
  )
    REFERENCES lnsat_operation_attempts (
      operation_attempt_id,
      operation_id,
      project_ref,
      resource_ref
    )
    ON UPDATE RESTRICT
    ON DELETE RESTRICT,
  FOREIGN KEY (
    consumption_id,
    operation_id,
    authorization_id,
    project_ref,
    resource_ref
  )
    REFERENCES lnsat_capability_consumptions (
      consumption_id,
      operation_id,
      authorization_id,
      project_ref,
      resource_ref
    )
    ON UPDATE RESTRICT
    ON DELETE RESTRICT
) STRICT;

CREATE TABLE lnsat_operation_reconciliations (
  reconciliation_id TEXT PRIMARY KEY,
  entity_kind TEXT NOT NULL CHECK (
    entity_kind = 'operation_reconciliation'
  ),
  project_ref TEXT NOT NULL,
  resource_ref TEXT NOT NULL,
  operation_id TEXT NOT NULL,
  operation_attempt_id TEXT NOT NULL,
  receipt_id TEXT,
  reconciliation_sequence INTEGER NOT NULL CHECK (
    reconciliation_sequence BETWEEN 1 AND 64
  ),
  status TEXT NOT NULL CHECK (
    status IN ('pending', 'matched', 'mismatch', 'unresolved')
  ),
  observed_result_digest BLOB CHECK (
    observed_result_digest IS NULL
    OR length(observed_result_digest) = 32
  ),
  recorded_at TEXT NOT NULL CHECK (
    length(recorded_at) IN (20, 24)
    AND strftime('%Y-%m-%dT%H:%M:%fZ', recorded_at, '+0 days') IS NOT NULL
    AND (
      recorded_at = strftime('%Y-%m-%dT%H:%M:%SZ', recorded_at, '+0 days')
      OR recorded_at = strftime('%Y-%m-%dT%H:%M:%fZ', recorded_at, '+0 days')
    )
  ),
  UNIQUE (operation_id, reconciliation_sequence),
  UNIQUE (reconciliation_id, project_ref, resource_ref),
  CHECK (
    (status IN ('pending', 'unresolved') AND observed_result_digest IS NULL)
    OR (status IN ('matched', 'mismatch') AND observed_result_digest IS NOT NULL)
  ),
  FOREIGN KEY (
    reconciliation_id,
    entity_kind,
    project_ref,
    resource_ref
  )
    REFERENCES lnsat_phase7_entities (
      entity_id,
      entity_kind,
      project_ref,
      resource_ref
    )
    ON UPDATE RESTRICT
    ON DELETE RESTRICT,
  FOREIGN KEY (
    operation_id,
    project_ref,
    resource_ref
  )
    REFERENCES lnsat_operations (
      operation_id,
      project_ref,
      resource_ref
    )
    ON UPDATE RESTRICT
    ON DELETE RESTRICT,
  FOREIGN KEY (
    operation_attempt_id,
    operation_id,
    project_ref,
    resource_ref
  )
    REFERENCES lnsat_operation_attempts (
      operation_attempt_id,
      operation_id,
      project_ref,
      resource_ref
    )
    ON UPDATE RESTRICT
    ON DELETE RESTRICT,
  FOREIGN KEY (
    receipt_id,
    project_ref,
    resource_ref
  )
    REFERENCES lnsat_operation_receipts (
      receipt_id,
      project_ref,
      resource_ref
    )
    ON UPDATE RESTRICT
    ON DELETE RESTRICT
) STRICT;

CREATE TABLE lnsat_phase7_state_events (
  state_event_id TEXT PRIMARY KEY,
  entity_kind TEXT NOT NULL CHECK (entity_kind = 'phase7_state_event'),
  project_ref TEXT NOT NULL,
  resource_ref TEXT NOT NULL,
  target_entity_id TEXT NOT NULL,
  target_entity_kind TEXT NOT NULL CHECK (
    target_entity_kind IN (
      'authorization_nonce',
      'execution_authorization',
      'operation',
      'operation_attempt'
    )
  ),
  state_sequence INTEGER NOT NULL CHECK (
    state_sequence BETWEEN 1 AND 64
  ),
  state TEXT NOT NULL CHECK (
    (
      target_entity_kind = 'authorization_nonce'
      AND state IN ('reserved', 'active', 'cancelled', 'expired')
    )
    OR (
      target_entity_kind = 'execution_authorization'
      AND state IN ('prepared', 'active', 'cancelled', 'revoked', 'expired', 'consumed')
    )
    OR (
      target_entity_kind = 'operation'
      AND state IN (
        'prepared',
        'authorized',
        'dispatching',
        'outcome_unknown',
        'completed',
        'failed',
        'cancel_requested',
        'expired',
        'orphaned'
      )
    )
    OR (
      target_entity_kind = 'operation_attempt'
      AND state IN (
        'prepared',
        'dispatching',
        'accepted',
        'working',
        'input_required',
        'completed',
        'failed',
        'transport_unavailable',
        'outcome_unknown',
        'cancel_requested',
        'expired',
        'orphaned'
      )
    )
  ),
  prior_state_event_id TEXT,
  prior_state_sequence INTEGER,
  effective_at TEXT NOT NULL CHECK (
    length(effective_at) IN (20, 24)
    AND strftime('%Y-%m-%dT%H:%M:%fZ', effective_at, '+0 days') IS NOT NULL
    AND (
      effective_at = strftime('%Y-%m-%dT%H:%M:%SZ', effective_at, '+0 days')
      OR effective_at = strftime('%Y-%m-%dT%H:%M:%fZ', effective_at, '+0 days')
    )
  ),
  state_digest BLOB NOT NULL CHECK (length(state_digest) = 32),
  UNIQUE (target_entity_id, state_sequence),
  UNIQUE (
    state_event_id,
    target_entity_id,
    target_entity_kind,
    state_sequence
  ),
  CHECK (
    (
      state_sequence = 1
      AND prior_state_event_id IS NULL
      AND prior_state_sequence IS NULL
    )
    OR (
      state_sequence > 1
      AND prior_state_event_id IS NOT NULL
      AND prior_state_sequence = state_sequence - 1
    )
  ),
  FOREIGN KEY (
    state_event_id,
    entity_kind,
    project_ref,
    resource_ref
  )
    REFERENCES lnsat_phase7_entities (
      entity_id,
      entity_kind,
      project_ref,
      resource_ref
    )
    ON UPDATE RESTRICT
    ON DELETE RESTRICT,
  FOREIGN KEY (
    target_entity_id,
    target_entity_kind,
    project_ref,
    resource_ref
  )
    REFERENCES lnsat_phase7_entities (
      entity_id,
      entity_kind,
      project_ref,
      resource_ref
    )
    ON UPDATE RESTRICT
    ON DELETE RESTRICT,
  FOREIGN KEY (
    prior_state_event_id,
    target_entity_id,
    target_entity_kind,
    prior_state_sequence
  )
    REFERENCES lnsat_phase7_state_events (
      state_event_id,
      target_entity_id,
      target_entity_kind,
      state_sequence
    )
    ON UPDATE RESTRICT
    ON DELETE RESTRICT
) STRICT;

CREATE INDEX lnsat_authorization_attempts_scope_idx
  ON lnsat_authorization_attempts (
    project_ref,
    resource_ref,
    requested_at,
    authorization_attempt_id
  );

CREATE INDEX lnsat_authorization_nonces_expiry_idx
  ON lnsat_authorization_nonces (
    project_ref,
    expires_at,
    nonce_id
  );

CREATE INDEX lnsat_execution_authorizations_expiry_idx
  ON lnsat_execution_authorizations (
    project_ref,
    expires_at,
    authorization_id
  );

CREATE INDEX lnsat_capability_consumptions_scope_idx
  ON lnsat_capability_consumptions (
    project_ref,
    consumed_at,
    consumption_id
  );

CREATE INDEX lnsat_operations_scope_idx
  ON lnsat_operations (
    project_ref,
    resource_ref,
    created_at,
    operation_id
  );

CREATE INDEX lnsat_operation_attempts_operation_idx
  ON lnsat_operation_attempts (
    operation_id,
    attempt_sequence,
    operation_attempt_id
  );

CREATE INDEX lnsat_operation_receipts_operation_idx
  ON lnsat_operation_receipts (
    operation_id,
    received_at,
    receipt_id
  );

CREATE INDEX lnsat_operation_reconciliations_operation_idx
  ON lnsat_operation_reconciliations (
    operation_id,
    reconciliation_sequence,
    reconciliation_id
  );

CREATE INDEX lnsat_phase7_entities_scope_idx
  ON lnsat_phase7_entities (
    project_ref,
    resource_ref,
    entity_kind,
    created_at,
    entity_id
  );

CREATE INDEX lnsat_phase7_audit_bindings_scope_idx
  ON lnsat_phase7_audit_bindings (
    project_ref,
    resource_ref,
    recorded_at,
    audit_binding_id
  );

CREATE INDEX lnsat_phase7_state_events_target_idx
  ON lnsat_phase7_state_events (
    target_entity_id,
    state_sequence DESC,
    state_event_id
  );

CREATE UNIQUE INDEX lnsat_phase7_state_events_nonce_terminal_idx
  ON lnsat_phase7_state_events (target_entity_id)
  WHERE target_entity_kind = 'authorization_nonce'
    AND state IN ('cancelled', 'expired');

CREATE UNIQUE INDEX lnsat_phase7_state_events_authorization_terminal_idx
  ON lnsat_phase7_state_events (target_entity_id)
  WHERE target_entity_kind = 'execution_authorization'
    AND state IN ('cancelled', 'revoked', 'expired', 'consumed');

CREATE UNIQUE INDEX lnsat_phase7_state_events_operation_terminal_idx
  ON lnsat_phase7_state_events (target_entity_id)
  WHERE target_entity_kind = 'operation'
    AND state IN ('completed', 'failed', 'expired', 'orphaned');

CREATE UNIQUE INDEX lnsat_phase7_state_events_attempt_terminal_idx
  ON lnsat_phase7_state_events (target_entity_id)
  WHERE target_entity_kind = 'operation_attempt'
    AND state IN ('completed', 'failed', 'expired', 'orphaned');

CREATE TRIGGER lnsat_phase7_entities_reject_update
BEFORE UPDATE ON lnsat_phase7_entities
BEGIN
  SELECT RAISE(ABORT, 'phase7 entities are immutable');
END;

CREATE TRIGGER lnsat_phase7_entities_reject_delete
BEFORE DELETE ON lnsat_phase7_entities
BEGIN
  SELECT RAISE(ABORT, 'phase7 entities are immutable');
END;

CREATE TRIGGER lnsat_phase7_audit_bindings_reject_update
BEFORE UPDATE ON lnsat_phase7_audit_bindings
BEGIN
  SELECT RAISE(ABORT, 'phase7 audit bindings are immutable');
END;

CREATE TRIGGER lnsat_phase7_audit_bindings_reject_delete
BEFORE DELETE ON lnsat_phase7_audit_bindings
BEGIN
  SELECT RAISE(ABORT, 'phase7 audit bindings are immutable');
END;

CREATE TRIGGER lnsat_authorization_attempts_reject_update
BEFORE UPDATE ON lnsat_authorization_attempts
BEGIN
  SELECT RAISE(ABORT, 'authorization attempts are immutable');
END;

CREATE TRIGGER lnsat_authorization_attempts_reject_delete
BEFORE DELETE ON lnsat_authorization_attempts
BEGIN
  SELECT RAISE(ABORT, 'authorization attempts are immutable');
END;

CREATE TRIGGER lnsat_authorization_nonces_reject_update
BEFORE UPDATE ON lnsat_authorization_nonces
BEGIN
  SELECT RAISE(ABORT, 'authorization nonces are immutable');
END;

CREATE TRIGGER lnsat_authorization_nonces_reject_delete
BEFORE DELETE ON lnsat_authorization_nonces
BEGIN
  SELECT RAISE(ABORT, 'authorization nonces are immutable');
END;

CREATE TRIGGER lnsat_execution_authorizations_reject_update
BEFORE UPDATE ON lnsat_execution_authorizations
BEGIN
  SELECT RAISE(ABORT, 'execution authorizations are immutable');
END;

CREATE TRIGGER lnsat_execution_authorizations_reject_delete
BEFORE DELETE ON lnsat_execution_authorizations
BEGIN
  SELECT RAISE(ABORT, 'execution authorizations are immutable');
END;

CREATE TRIGGER lnsat_capability_consumptions_reject_update
BEFORE UPDATE ON lnsat_capability_consumptions
BEGIN
  SELECT RAISE(ABORT, 'capability consumptions are immutable');
END;

CREATE TRIGGER lnsat_capability_consumptions_reject_delete
BEFORE DELETE ON lnsat_capability_consumptions
BEGIN
  SELECT RAISE(ABORT, 'capability consumptions are immutable');
END;

CREATE TRIGGER lnsat_operations_reject_update
BEFORE UPDATE ON lnsat_operations
BEGIN
  SELECT RAISE(ABORT, 'operations are immutable');
END;

CREATE TRIGGER lnsat_operations_reject_delete
BEFORE DELETE ON lnsat_operations
BEGIN
  SELECT RAISE(ABORT, 'operations are immutable');
END;

CREATE TRIGGER lnsat_operation_attempts_reject_update
BEFORE UPDATE ON lnsat_operation_attempts
BEGIN
  SELECT RAISE(ABORT, 'operation attempts are immutable');
END;

CREATE TRIGGER lnsat_operation_attempts_reject_delete
BEFORE DELETE ON lnsat_operation_attempts
BEGIN
  SELECT RAISE(ABORT, 'operation attempts are immutable');
END;

CREATE TRIGGER lnsat_operation_receipts_reject_update
BEFORE UPDATE ON lnsat_operation_receipts
BEGIN
  SELECT RAISE(ABORT, 'operation receipts are immutable');
END;

CREATE TRIGGER lnsat_operation_receipts_reject_delete
BEFORE DELETE ON lnsat_operation_receipts
BEGIN
  SELECT RAISE(ABORT, 'operation receipts are immutable');
END;

CREATE TRIGGER lnsat_operation_reconciliations_reject_update
BEFORE UPDATE ON lnsat_operation_reconciliations
BEGIN
  SELECT RAISE(ABORT, 'operation reconciliations are immutable');
END;

CREATE TRIGGER lnsat_operation_reconciliations_reject_delete
BEFORE DELETE ON lnsat_operation_reconciliations
BEGIN
  SELECT RAISE(ABORT, 'operation reconciliations are immutable');
END;

CREATE TRIGGER lnsat_phase7_state_events_reject_update
BEFORE UPDATE ON lnsat_phase7_state_events
BEGIN
  SELECT RAISE(ABORT, 'phase7 state events are immutable');
END;

CREATE TRIGGER lnsat_phase7_state_events_reject_delete
BEFORE DELETE ON lnsat_phase7_state_events
BEGIN
  SELECT RAISE(ABORT, 'phase7 state events are immutable');
END;

PRAGMA user_version = 16;
