CREATE TABLE lnsat_store_metadata_v18 (
  singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
  contract_version TEXT NOT NULL CHECK (
    contract_version = 'lnsat.contracts.v1_0'
  ),
  schema_version INTEGER NOT NULL CHECK (schema_version = 18),
  storage_kind TEXT NOT NULL CHECK (
    storage_kind = 'sqlite_single_node'
  )
) STRICT;

INSERT INTO lnsat_store_metadata_v18 (
  singleton,
  contract_version,
  schema_version,
  storage_kind
)
SELECT
  singleton,
  contract_version,
  18,
  storage_kind
FROM lnsat_store_metadata;

DROP TABLE lnsat_store_metadata;
ALTER TABLE lnsat_store_metadata_v18 RENAME TO lnsat_store_metadata;

CREATE TABLE lnsat_authority_order (
  sequence INTEGER PRIMARY KEY AUTOINCREMENT,
  record_family TEXT NOT NULL CHECK (
    record_family IN (
      'verification_material',
      'key_status_event',
      'nonce_identity',
      'nonce_event',
      'signed_approval_evidence',
      'verification_attempt',
      'nonce_consumption'
    )
  ),
  record_id TEXT NOT NULL CHECK (
    length(record_id) BETWEEN 1 AND 128
    AND record_id NOT GLOB '*[^a-z0-9._:-]*'
    AND substr(record_id, 1, 1) GLOB '[a-z0-9]'
    AND substr(record_id, -1, 1) GLOB '[a-z0-9]'
  ),
  content_digest BLOB NOT NULL CHECK (
    typeof(content_digest) = 'blob'
    AND length(content_digest) = 32
  ),
  chain_digest BLOB NOT NULL UNIQUE CHECK (
    typeof(chain_digest) = 'blob'
    AND length(chain_digest) = 32
  ),
  prior_chain_digest BLOB CHECK (
    prior_chain_digest IS NULL
    OR (
      typeof(prior_chain_digest) = 'blob'
      AND length(prior_chain_digest) = 32
    )
  ),
  committed_at TEXT NOT NULL CHECK (
    length(committed_at) = 24
    AND committed_at GLOB '????-??-??T??:??:??.???Z'
    AND strftime('%Y-%m-%dT%H:%M:%fZ', committed_at) = committed_at
  ),
  UNIQUE (record_family, record_id)
) STRICT;

CREATE TABLE lnsat_signed_approval_verification_materials (
  material_ref TEXT PRIMARY KEY CHECK (
    length(material_ref) BETWEEN 1 AND 128
    AND material_ref NOT GLOB '*[^a-z0-9._:-]*'
    AND substr(material_ref, 1, 1) GLOB '[a-z0-9]'
    AND substr(material_ref, -1, 1) GLOB '[a-z0-9]'
  ),
  key_id TEXT NOT NULL CHECK (
    length(key_id) BETWEEN 1 AND 128
    AND key_id NOT GLOB '*[^a-z0-9._:-]*'
    AND substr(key_id, 1, 1) GLOB '[a-z0-9]'
    AND substr(key_id, -1, 1) GLOB '[a-z0-9]'
  ),
  key_version INTEGER NOT NULL CHECK (key_version > 0),
  algorithm TEXT NOT NULL CHECK (algorithm = 'Ed25519'),
  spki_der BLOB NOT NULL UNIQUE CHECK (
    typeof(spki_der) = 'blob'
    AND length(spki_der) = 44
    AND hex(substr(spki_der, 1, 12)) = '302A300506032B6570032100'
  ),
  valid_from TEXT NOT NULL CHECK (
    length(valid_from) = 24
    AND valid_from GLOB '????-??-??T??:??:??.???Z'
    AND strftime('%Y-%m-%dT%H:%M:%fZ', valid_from) = valid_from
  ),
  valid_until TEXT NOT NULL CHECK (
    length(valid_until) = 24
    AND valid_until GLOB '????-??-??T??:??:??.???Z'
    AND strftime('%Y-%m-%dT%H:%M:%fZ', valid_until) = valid_until
    AND valid_until > valid_from
  ),
  supersedes_material_ref TEXT,
  authority_sequence INTEGER NOT NULL UNIQUE,
  UNIQUE (key_id, key_version),
  CHECK (
    (
      key_version = 1
      AND supersedes_material_ref IS NULL
    )
    OR (
      key_version > 1
      AND supersedes_material_ref IS NOT NULL
    )
  ),
  FOREIGN KEY (supersedes_material_ref)
    REFERENCES lnsat_signed_approval_verification_materials (material_ref)
    ON UPDATE RESTRICT
    ON DELETE RESTRICT,
  FOREIGN KEY (authority_sequence)
    REFERENCES lnsat_authority_order (sequence)
    ON UPDATE RESTRICT
    ON DELETE RESTRICT
) STRICT;

CREATE TABLE lnsat_signed_approval_key_status_events (
  status_event_id TEXT PRIMARY KEY CHECK (
    length(status_event_id) BETWEEN 1 AND 128
    AND status_event_id NOT GLOB '*[^a-z0-9._:-]*'
    AND substr(status_event_id, 1, 1) GLOB '[a-z0-9]'
    AND substr(status_event_id, -1, 1) GLOB '[a-z0-9]'
  ),
  material_ref TEXT NOT NULL,
  revision INTEGER NOT NULL CHECK (revision > 0),
  status TEXT NOT NULL CHECK (
    status IN ('active', 'retired', 'revoked')
  ),
  effective_at TEXT NOT NULL CHECK (
    length(effective_at) = 24
    AND effective_at GLOB '????-??-??T??:??:??.???Z'
    AND strftime('%Y-%m-%dT%H:%M:%fZ', effective_at) = effective_at
  ),
  recorded_at TEXT NOT NULL CHECK (
    length(recorded_at) = 24
    AND recorded_at GLOB '????-??-??T??:??:??.???Z'
    AND strftime('%Y-%m-%dT%H:%M:%fZ', recorded_at) = recorded_at
  ),
  reason_code TEXT NOT NULL CHECK (
    reason_code IN (
      'activated',
      'rotated',
      'expired',
      'compromised',
      'operator_action'
    )
  ),
  prior_status_event_id TEXT,
  authority_sequence INTEGER NOT NULL UNIQUE,
  UNIQUE (material_ref, revision),
  CHECK (
    (
      revision = 1
      AND prior_status_event_id IS NULL
      AND status = 'active'
      AND reason_code = 'activated'
    )
    OR (
      revision > 1
      AND prior_status_event_id IS NOT NULL
      AND (
        (
          status = 'retired'
          AND reason_code IN ('rotated', 'expired', 'operator_action')
        )
        OR (
          status = 'revoked'
          AND reason_code IN ('compromised', 'operator_action')
        )
      )
    )
  ),
  FOREIGN KEY (material_ref)
    REFERENCES lnsat_signed_approval_verification_materials (material_ref)
    ON UPDATE RESTRICT
    ON DELETE RESTRICT,
  FOREIGN KEY (prior_status_event_id)
    REFERENCES lnsat_signed_approval_key_status_events (status_event_id)
    ON UPDATE RESTRICT
    ON DELETE RESTRICT,
  FOREIGN KEY (authority_sequence)
    REFERENCES lnsat_authority_order (sequence)
    ON UPDATE RESTRICT
    ON DELETE RESTRICT
) STRICT;

CREATE UNIQUE INDEX lnsat_approval_decisions_nonce_binding_idx
ON lnsat_approval_decisions (
  approval_decision_id,
  project_ref
);

CREATE TABLE lnsat_signed_approval_nonce_identities (
  nonce_id TEXT PRIMARY KEY CHECK (
    length(nonce_id) = 70
    AND substr(nonce_id, 1, 6) = 'nonce_'
    AND substr(nonce_id, 7) NOT GLOB '*[^0-9a-f]*'
  ),
  project_ref TEXT NOT NULL CHECK (
    length(project_ref) BETWEEN 9 AND 256
    AND substr(project_ref, 1, 8) = 'project:'
  ),
  decision_id TEXT NOT NULL CHECK (
    length(decision_id) = 68
    AND substr(decision_id, 1, 4) = 'apd_'
    AND substr(decision_id, 5) NOT GLOB '*[^0-9a-f]*'
  ),
  nonce_digest BLOB NOT NULL UNIQUE CHECK (
    typeof(nonce_digest) = 'blob'
    AND length(nonce_digest) = 32
  ),
  issued_at TEXT NOT NULL CHECK (
    length(issued_at) = 24
    AND issued_at GLOB '????-??-??T??:??:??.???Z'
    AND strftime('%Y-%m-%dT%H:%M:%fZ', issued_at) = issued_at
  ),
  expires_at TEXT NOT NULL CHECK (
    length(expires_at) = 24
    AND expires_at GLOB '????-??-??T??:??:??.???Z'
    AND strftime('%Y-%m-%dT%H:%M:%fZ', expires_at) = expires_at
    AND expires_at > issued_at
  ),
  authority_sequence INTEGER NOT NULL UNIQUE,
  UNIQUE (project_ref, decision_id),
  UNIQUE (nonce_id, project_ref),
  FOREIGN KEY (decision_id, project_ref)
    REFERENCES lnsat_approval_decisions (
      approval_decision_id,
      project_ref
    )
    ON UPDATE RESTRICT
    ON DELETE RESTRICT,
  FOREIGN KEY (authority_sequence)
    REFERENCES lnsat_authority_order (sequence)
    ON UPDATE RESTRICT
    ON DELETE RESTRICT
) STRICT;

CREATE TABLE lnsat_signed_approval_nonce_events (
  nonce_event_id TEXT PRIMARY KEY CHECK (
    length(nonce_event_id) BETWEEN 1 AND 128
    AND nonce_event_id NOT GLOB '*[^a-z0-9._:-]*'
    AND substr(nonce_event_id, 1, 1) GLOB '[a-z0-9]'
    AND substr(nonce_event_id, -1, 1) GLOB '[a-z0-9]'
  ),
  nonce_id TEXT NOT NULL,
  revision INTEGER NOT NULL CHECK (revision > 0),
  event_kind TEXT NOT NULL CHECK (
    event_kind IN ('issued', 'cancelled', 'expired', 'consumed')
  ),
  effective_at TEXT NOT NULL CHECK (
    length(effective_at) = 24
    AND effective_at GLOB '????-??-??T??:??:??.???Z'
    AND strftime('%Y-%m-%dT%H:%M:%fZ', effective_at) = effective_at
  ),
  recorded_at TEXT NOT NULL CHECK (
    length(recorded_at) = 24
    AND recorded_at GLOB '????-??-??T??:??:??.???Z'
    AND strftime('%Y-%m-%dT%H:%M:%fZ', recorded_at) = recorded_at
    AND recorded_at >= effective_at
  ),
  prior_nonce_event_id TEXT,
  authority_sequence INTEGER NOT NULL UNIQUE,
  UNIQUE (nonce_id, revision),
  CHECK (
    (
      revision = 1
      AND prior_nonce_event_id IS NULL
      AND event_kind = 'issued'
    )
    OR (
      revision = 2
      AND prior_nonce_event_id IS NOT NULL
      AND event_kind IN ('cancelled', 'expired', 'consumed')
    )
  ),
  FOREIGN KEY (nonce_id)
    REFERENCES lnsat_signed_approval_nonce_identities (nonce_id)
    ON UPDATE RESTRICT
    ON DELETE RESTRICT,
  FOREIGN KEY (prior_nonce_event_id)
    REFERENCES lnsat_signed_approval_nonce_events (nonce_event_id)
    ON UPDATE RESTRICT
    ON DELETE RESTRICT,
  FOREIGN KEY (authority_sequence)
    REFERENCES lnsat_authority_order (sequence)
    ON UPDATE RESTRICT
    ON DELETE RESTRICT
) STRICT;

CREATE TABLE lnsat_signed_approval_evidence (
  evidence_id TEXT PRIMARY KEY CHECK (
    length(evidence_id) = 68
    AND substr(evidence_id, 1, 4) = 'sae_'
    AND substr(evidence_id, 5) NOT GLOB '*[^0-9a-f]*'
  ),
  project_ref TEXT NOT NULL CHECK (
    length(project_ref) BETWEEN 9 AND 256
    AND substr(project_ref, 1, 8) = 'project:'
  ),
  decision_id TEXT NOT NULL CHECK (
    length(decision_id) = 68
    AND substr(decision_id, 1, 4) = 'apd_'
    AND substr(decision_id, 5) NOT GLOB '*[^0-9a-f]*'
  ),
  material_ref TEXT NOT NULL CHECK (
    length(material_ref) = 68
    AND substr(material_ref, 1, 4) = 'avm_'
    AND substr(material_ref, 5) NOT GLOB '*[^0-9a-f]*'
  ),
  nonce_id TEXT NOT NULL UNIQUE CHECK (
    length(nonce_id) = 70
    AND substr(nonce_id, 1, 6) = 'nonce_'
    AND substr(nonce_id, 7) NOT GLOB '*[^0-9a-f]*'
  ),
  canonical_payload BLOB NOT NULL CHECK (
    typeof(canonical_payload) = 'blob'
    AND length(canonical_payload) BETWEEN 2 AND 1048576
  ),
  payload_digest BLOB NOT NULL UNIQUE CHECK (
    typeof(payload_digest) = 'blob'
    AND length(payload_digest) = 32
  ),
  signature BLOB NOT NULL CHECK (
    typeof(signature) = 'blob'
    AND length(signature) = 64
  ),
  issued_at TEXT NOT NULL CHECK (
    length(issued_at) = 24
    AND issued_at GLOB '????-??-??T??:??:??.???Z'
    AND strftime('%Y-%m-%dT%H:%M:%fZ', issued_at) = issued_at
  ),
  expires_at TEXT NOT NULL CHECK (
    length(expires_at) = 24
    AND expires_at GLOB '????-??-??T??:??:??.???Z'
    AND strftime('%Y-%m-%dT%H:%M:%fZ', expires_at) = expires_at
    AND expires_at > issued_at
  ),
  approval_gate_satisfied INTEGER NOT NULL CHECK (
    approval_gate_satisfied = 1
  ),
  server_signed INTEGER NOT NULL CHECK (server_signed = 1),
  execution_authorized INTEGER NOT NULL CHECK (
    execution_authorized = 0
  ),
  session_authority_state_changed INTEGER NOT NULL CHECK (
    session_authority_state_changed = 0
  ),
  mutation_authority INTEGER NOT NULL CHECK (
    mutation_authority = 0
  ),
  authority_sequence INTEGER NOT NULL UNIQUE,
  UNIQUE (project_ref, decision_id),
  UNIQUE (evidence_id, project_ref),
  UNIQUE (evidence_id, material_ref),
  UNIQUE (evidence_id, nonce_id, project_ref),
  CHECK (
    evidence_id = 'sae_' || lower(hex(payload_digest))
  ),
  FOREIGN KEY (decision_id, project_ref)
    REFERENCES lnsat_approval_decisions (
      approval_decision_id,
      project_ref
    )
    ON UPDATE RESTRICT
    ON DELETE RESTRICT,
  FOREIGN KEY (material_ref)
    REFERENCES lnsat_signed_approval_verification_materials (material_ref)
    ON UPDATE RESTRICT
    ON DELETE RESTRICT,
  FOREIGN KEY (nonce_id)
    REFERENCES lnsat_signed_approval_nonce_identities (nonce_id)
    ON UPDATE RESTRICT
    ON DELETE RESTRICT,
  FOREIGN KEY (authority_sequence)
    REFERENCES lnsat_authority_order (sequence)
    ON UPDATE RESTRICT
    ON DELETE RESTRICT
) STRICT;

CREATE TABLE lnsat_signed_approval_evidence_issue_idempotency (
  project_ref TEXT NOT NULL CHECK (
    length(project_ref) BETWEEN 9 AND 256
    AND substr(project_ref, 1, 8) = 'project:'
  ),
  idempotency_key TEXT NOT NULL CHECK (
    length(idempotency_key) BETWEEN 13 AND 133
    AND substr(idempotency_key, 1, 5) = 'idem_'
    AND substr(idempotency_key, 6, 1) GLOB '[a-z0-9]'
    AND substr(idempotency_key, 6) NOT GLOB '*[^a-z0-9_-]*'
  ),
  request_digest BLOB NOT NULL CHECK (
    typeof(request_digest) = 'blob'
    AND length(request_digest) = 32
  ),
  evidence_id TEXT NOT NULL UNIQUE CHECK (
    length(evidence_id) = 68
    AND substr(evidence_id, 1, 4) = 'sae_'
    AND substr(evidence_id, 5) NOT GLOB '*[^0-9a-f]*'
  ),
  created_at TEXT NOT NULL CHECK (
    length(created_at) = 24
    AND created_at GLOB '????-??-??T??:??:??.???Z'
    AND strftime('%Y-%m-%dT%H:%M:%fZ', created_at) = created_at
  ),
  PRIMARY KEY (project_ref, idempotency_key),
  FOREIGN KEY (evidence_id, project_ref)
    REFERENCES lnsat_signed_approval_evidence (
      evidence_id,
      project_ref
    )
    ON UPDATE RESTRICT
    ON DELETE RESTRICT
) STRICT;

CREATE TABLE lnsat_signed_approval_verification_attempts (
  attempt_id TEXT PRIMARY KEY CHECK (
    length(attempt_id) = 68
    AND substr(attempt_id, 1, 4) = 'vat_'
    AND substr(attempt_id, 5) NOT GLOB '*[^0-9a-f]*'
  ),
  project_scope_digest BLOB NOT NULL CHECK (
    typeof(project_scope_digest) = 'blob'
    AND length(project_scope_digest) = 32
  ),
  input_digest BLOB NOT NULL CHECK (
    typeof(input_digest) = 'blob'
    AND length(input_digest) = 32
  ),
  result_code TEXT NOT NULL CHECK (
    result_code IN ('verified', 'rejected')
  ),
  reason_code TEXT NOT NULL CHECK (
    reason_code IN (
      'verified',
      'signed_approval.invalid_json',
      'signed_approval.invalid_type',
      'signed_approval.unexpected_field',
      'signed_approval.missing_field',
      'signed_approval.input_too_large',
      'signed_approval.input_too_deep',
      'signed_approval.unsupported_contract',
      'signed_approval.unsupported_schema',
      'signed_approval.unsupported_canonicalization',
      'signed_approval.unsupported_digest',
      'signed_approval.unsupported_signature_profile',
      'signed_approval.invalid_field',
      'signed_approval.invalid_time_window',
      'signed_approval.invalid_nonce',
      'signed_approval.chain_invalid',
      'signed_approval.chain_substitution',
      'signed_approval.payload_digest_mismatch',
      'signed_approval.evidence_id_mismatch',
      'signed_approval.verification_material_unavailable',
      'signed_approval.verification_material_stale',
      'signed_approval.key_unknown',
      'signed_approval.key_version_downgrade',
      'signed_approval.key_inactive',
      'signed_approval.key_retired',
      'signed_approval.key_revoked',
      'signed_approval.signature_malformed',
      'signed_approval.signature_invalid',
      'signed_approval.nonce_replayed',
      'signed_approval.requester_session_revoked',
      'signed_approval.approver_session_revoked',
      'signed_approval.policy_revoked',
      'signed_approval.approval_revoked',
      'signed_approval.evidence_expired',
      'signed_approval.verification_unavailable'
    )
  ),
  observed_at TEXT NOT NULL CHECK (
    length(observed_at) = 24
    AND observed_at GLOB '????-??-??T??:??:??.???Z'
    AND strftime('%Y-%m-%dT%H:%M:%fZ', observed_at) = observed_at
  ),
  authority_sequence INTEGER NOT NULL UNIQUE,
  CHECK (
    (
      result_code = 'verified'
      AND reason_code = 'verified'
    )
    OR (
      result_code = 'rejected'
      AND reason_code != 'verified'
    )
  ),
  FOREIGN KEY (authority_sequence)
    REFERENCES lnsat_authority_order (sequence)
    ON UPDATE RESTRICT
    ON DELETE RESTRICT
) STRICT;

CREATE TABLE lnsat_signed_approval_verification_attempt_subjects (
  attempt_id TEXT PRIMARY KEY,
  evidence_id TEXT NOT NULL CHECK (
    length(evidence_id) = 68
    AND substr(evidence_id, 1, 4) = 'sae_'
    AND substr(evidence_id, 5) NOT GLOB '*[^0-9a-f]*'
  ),
  material_ref TEXT NOT NULL CHECK (
    length(material_ref) = 68
    AND substr(material_ref, 1, 4) = 'avm_'
    AND substr(material_ref, 5) NOT GLOB '*[^0-9a-f]*'
  ),
  FOREIGN KEY (attempt_id)
    REFERENCES lnsat_signed_approval_verification_attempts (attempt_id)
    ON UPDATE RESTRICT
    ON DELETE RESTRICT,
  FOREIGN KEY (evidence_id, material_ref)
    REFERENCES lnsat_signed_approval_evidence (
      evidence_id,
      material_ref
    )
    ON UPDATE RESTRICT
    ON DELETE RESTRICT,
  FOREIGN KEY (material_ref)
    REFERENCES lnsat_signed_approval_verification_materials (material_ref)
    ON UPDATE RESTRICT
    ON DELETE RESTRICT
) STRICT;

CREATE TABLE lnsat_signed_approval_nonce_consumptions (
  consumption_id TEXT PRIMARY KEY CHECK (
    length(consumption_id) = 68
    AND substr(consumption_id, 1, 4) = 'nsc_'
    AND substr(consumption_id, 5) NOT GLOB '*[^0-9a-f]*'
  ),
  project_ref TEXT NOT NULL CHECK (
    length(project_ref) BETWEEN 9 AND 256
    AND substr(project_ref, 1, 8) = 'project:'
  ),
  nonce_id TEXT NOT NULL UNIQUE CHECK (
    length(nonce_id) = 70
    AND substr(nonce_id, 1, 6) = 'nonce_'
    AND substr(nonce_id, 7) NOT GLOB '*[^0-9a-f]*'
  ),
  evidence_id TEXT NOT NULL UNIQUE CHECK (
    length(evidence_id) = 68
    AND substr(evidence_id, 1, 4) = 'sae_'
    AND substr(evidence_id, 5) NOT GLOB '*[^0-9a-f]*'
  ),
  authorization_ref TEXT NOT NULL UNIQUE CHECK (
    length(authorization_ref) BETWEEN 5 AND 240
    AND authorization_ref NOT GLOB '*[^a-z0-9._:/@#-]*'
    AND substr(authorization_ref, 1, 1) GLOB '[a-z]'
    AND instr(authorization_ref, ':') BETWEEN 2 AND 60
    AND substr(authorization_ref, -1, 1) GLOB '[a-z0-9]'
  ),
  authorization_digest BLOB NOT NULL CHECK (
    typeof(authorization_digest) = 'blob'
    AND length(authorization_digest) = 32
  ),
  consumed_at TEXT NOT NULL CHECK (
    length(consumed_at) = 24
    AND consumed_at GLOB '????-??-??T??:??:??.???Z'
    AND strftime('%Y-%m-%dT%H:%M:%fZ', consumed_at) = consumed_at
  ),
  authority_sequence INTEGER NOT NULL UNIQUE,
  UNIQUE (consumption_id, project_ref),
  FOREIGN KEY (nonce_id, project_ref)
    REFERENCES lnsat_signed_approval_nonce_identities (
      nonce_id,
      project_ref
    )
    ON UPDATE RESTRICT
    ON DELETE RESTRICT,
  FOREIGN KEY (evidence_id, nonce_id, project_ref)
    REFERENCES lnsat_signed_approval_evidence (
      evidence_id,
      nonce_id,
      project_ref
    )
    ON UPDATE RESTRICT
    ON DELETE RESTRICT,
  FOREIGN KEY (authority_sequence)
    REFERENCES lnsat_authority_order (sequence)
    ON UPDATE RESTRICT
    ON DELETE RESTRICT
) STRICT;

CREATE TABLE lnsat_signed_approval_nonce_consume_idempotency (
  project_ref TEXT NOT NULL CHECK (
    length(project_ref) BETWEEN 9 AND 256
    AND substr(project_ref, 1, 8) = 'project:'
  ),
  idempotency_key TEXT NOT NULL CHECK (
    length(idempotency_key) BETWEEN 13 AND 133
    AND substr(idempotency_key, 1, 5) = 'idem_'
    AND substr(idempotency_key, 6, 1) GLOB '[a-z0-9]'
    AND substr(idempotency_key, 6) NOT GLOB '*[^a-z0-9_-]*'
  ),
  request_digest BLOB NOT NULL CHECK (
    typeof(request_digest) = 'blob'
    AND length(request_digest) = 32
  ),
  consumption_id TEXT NOT NULL UNIQUE CHECK (
    length(consumption_id) = 68
    AND substr(consumption_id, 1, 4) = 'nsc_'
    AND substr(consumption_id, 5) NOT GLOB '*[^0-9a-f]*'
  ),
  created_at TEXT NOT NULL CHECK (
    length(created_at) = 24
    AND created_at GLOB '????-??-??T??:??:??.???Z'
    AND strftime('%Y-%m-%dT%H:%M:%fZ', created_at) = created_at
  ),
  PRIMARY KEY (project_ref, idempotency_key),
  FOREIGN KEY (consumption_id, project_ref)
    REFERENCES lnsat_signed_approval_nonce_consumptions (
      consumption_id,
      project_ref
    )
    ON UPDATE RESTRICT
    ON DELETE RESTRICT
) STRICT;

CREATE INDEX lnsat_signed_approval_verification_materials_key_lineage_idx
ON lnsat_signed_approval_verification_materials (
  key_id,
  key_version DESC,
  material_ref
);

CREATE INDEX lnsat_signed_approval_key_status_events_latest_idx
ON lnsat_signed_approval_key_status_events (
  material_ref,
  revision DESC,
  status_event_id
);

CREATE INDEX lnsat_signed_approval_nonce_events_latest_idx
ON lnsat_signed_approval_nonce_events (
  nonce_id,
  revision DESC,
  nonce_event_id
);

CREATE UNIQUE INDEX lnsat_signed_approval_nonce_events_terminal_idx
ON lnsat_signed_approval_nonce_events (nonce_id)
WHERE event_kind IN ('cancelled', 'expired', 'consumed');

CREATE INDEX lnsat_signed_approval_evidence_material_idx
ON lnsat_signed_approval_evidence (
  material_ref,
  issued_at,
  evidence_id
);

CREATE INDEX lnsat_signed_approval_verification_attempts_scope_timeline_idx
ON lnsat_signed_approval_verification_attempts (
  project_scope_digest,
  observed_at,
  authority_sequence,
  attempt_id
);

CREATE INDEX lnsat_signed_approval_nonce_consumptions_project_timeline_idx
ON lnsat_signed_approval_nonce_consumptions (
  project_ref,
  consumed_at,
  authority_sequence,
  consumption_id
);

CREATE TRIGGER lnsat_authority_order_validate_insert
AFTER INSERT ON lnsat_authority_order
BEGIN
  SELECT CASE
    WHEN EXISTS (
      SELECT 1
      FROM lnsat_authority_order
      WHERE sequence > NEW.sequence
    )
    THEN RAISE(ABORT, 'authority sequence cannot be backfilled')
  END;
  SELECT CASE
    WHEN NOT EXISTS (
      SELECT 1
      FROM lnsat_authority_order
      WHERE sequence < NEW.sequence
    )
    AND (
      NEW.sequence != 1
      OR NEW.prior_chain_digest IS NOT NULL
    )
    THEN RAISE(ABORT, 'authority genesis is invalid')
  END;
  SELECT CASE
    WHEN EXISTS (
      SELECT 1
      FROM lnsat_authority_order
      WHERE sequence < NEW.sequence
    )
    AND (
      NEW.prior_chain_digest IS NULL
      OR NOT EXISTS (
        SELECT 1
        FROM lnsat_authority_order AS previous
        WHERE previous.sequence = (
          SELECT max(sequence)
          FROM lnsat_authority_order
          WHERE sequence < NEW.sequence
        )
        AND previous.chain_digest = NEW.prior_chain_digest
      )
    )
    THEN RAISE(ABORT, 'authority prior chain is invalid')
  END;
END;

CREATE TRIGGER lnsat_authority_order_reject_update
BEFORE UPDATE ON lnsat_authority_order
BEGIN
  SELECT RAISE(ABORT, 'authority order is immutable');
END;

CREATE TRIGGER lnsat_authority_order_reject_delete
BEFORE DELETE ON lnsat_authority_order
BEGIN
  SELECT RAISE(ABORT, 'authority order is immutable');
END;

CREATE TRIGGER lnsat_signed_approval_verification_materials_validate_insert
AFTER INSERT ON lnsat_signed_approval_verification_materials
BEGIN
  SELECT CASE
    WHEN NOT EXISTS (
      SELECT 1
      FROM lnsat_authority_order
      WHERE sequence = NEW.authority_sequence
        AND record_family = 'verification_material'
        AND record_id = NEW.material_ref
    )
    THEN RAISE(ABORT, 'verification material authority reference is invalid')
  END;
  SELECT CASE
    WHEN NEW.key_version > 1
    AND NOT EXISTS (
      SELECT 1
      FROM lnsat_signed_approval_verification_materials AS previous
      WHERE previous.material_ref = NEW.supersedes_material_ref
        AND previous.key_id = NEW.key_id
        AND previous.key_version = NEW.key_version - 1
    )
    THEN RAISE(ABORT, 'verification material predecessor is invalid')
  END;
END;

CREATE TRIGGER lnsat_signed_approval_verification_materials_reject_update
BEFORE UPDATE ON lnsat_signed_approval_verification_materials
BEGIN
  SELECT RAISE(ABORT, 'verification materials are immutable');
END;

CREATE TRIGGER lnsat_signed_approval_verification_materials_reject_delete
BEFORE DELETE ON lnsat_signed_approval_verification_materials
BEGIN
  SELECT RAISE(ABORT, 'verification materials are immutable');
END;

CREATE TRIGGER lnsat_signed_approval_key_status_events_validate_insert
AFTER INSERT ON lnsat_signed_approval_key_status_events
BEGIN
  SELECT CASE
    WHEN NOT EXISTS (
      SELECT 1
      FROM lnsat_authority_order
      WHERE sequence = NEW.authority_sequence
        AND record_family = 'key_status_event'
        AND record_id = NEW.status_event_id
    )
    THEN RAISE(ABORT, 'key status authority reference is invalid')
  END;
  SELECT CASE
    WHEN NEW.revision > 1
    AND NOT EXISTS (
      SELECT 1
      FROM lnsat_signed_approval_key_status_events AS previous
      WHERE previous.status_event_id = NEW.prior_status_event_id
        AND previous.material_ref = NEW.material_ref
        AND previous.revision = NEW.revision - 1
    )
    THEN RAISE(ABORT, 'key status predecessor is invalid')
  END;
  SELECT CASE
    WHEN NEW.revision > 1
    AND NOT EXISTS (
      SELECT 1
      FROM lnsat_signed_approval_key_status_events AS previous
      WHERE previous.status_event_id = NEW.prior_status_event_id
        AND (
          (
            previous.status = 'active'
            AND NEW.status IN ('retired', 'revoked')
          )
          OR (
            previous.status = 'retired'
            AND NEW.status = 'revoked'
          )
        )
    )
    THEN RAISE(ABORT, 'key status transition is invalid')
  END;
  SELECT CASE
    WHEN NEW.status = 'active'
    AND EXISTS (
      SELECT 1
      FROM lnsat_signed_approval_verification_materials AS candidate_material
      JOIN lnsat_signed_approval_verification_materials AS existing_material
        ON existing_material.key_id = candidate_material.key_id
      JOIN lnsat_signed_approval_key_status_events AS existing_status
        ON existing_status.material_ref = existing_material.material_ref
      WHERE candidate_material.material_ref = NEW.material_ref
        AND existing_material.material_ref != NEW.material_ref
        AND existing_status.revision = (
          SELECT max(latest.revision)
          FROM lnsat_signed_approval_key_status_events AS latest
          WHERE latest.material_ref = existing_material.material_ref
        )
        AND existing_status.status = 'active'
    )
    THEN RAISE(ABORT, 'key lineage already has active material')
  END;
END;

CREATE TRIGGER lnsat_signed_approval_key_status_events_reject_update
BEFORE UPDATE ON lnsat_signed_approval_key_status_events
BEGIN
  SELECT RAISE(ABORT, 'key status events are immutable');
END;

CREATE TRIGGER lnsat_signed_approval_key_status_events_reject_delete
BEFORE DELETE ON lnsat_signed_approval_key_status_events
BEGIN
  SELECT RAISE(ABORT, 'key status events are immutable');
END;

CREATE TRIGGER lnsat_signed_approval_nonce_identities_validate_insert
AFTER INSERT ON lnsat_signed_approval_nonce_identities
BEGIN
  SELECT CASE
    WHEN NOT EXISTS (
      SELECT 1
      FROM lnsat_authority_order
      WHERE sequence = NEW.authority_sequence
        AND record_family = 'nonce_identity'
        AND record_id = NEW.nonce_id
    )
    THEN RAISE(ABORT, 'nonce identity authority reference is invalid')
  END;
  SELECT CASE
    WHEN NOT EXISTS (
      SELECT 1
      FROM lnsat_approval_decisions
      WHERE approval_decision_id = NEW.decision_id
        AND project_ref = NEW.project_ref
        AND decision = 'approved'
        AND approval_gate_satisfied = 1
        AND execution_authorized = 0
        AND NEW.issued_at >= strftime(
          '%Y-%m-%dT%H:%M:%fZ',
          decided_at
        )
        AND NEW.issued_at < strftime(
          '%Y-%m-%dT%H:%M:%fZ',
          expires_at
        )
        AND NEW.expires_at = strftime(
          '%Y-%m-%dT%H:%M:%fZ',
          expires_at
        )
    )
    THEN RAISE(ABORT, 'nonce approval-decision binding is invalid')
  END;
END;

CREATE TRIGGER lnsat_signed_approval_nonce_identities_reject_update
BEFORE UPDATE ON lnsat_signed_approval_nonce_identities
BEGIN
  SELECT RAISE(ABORT, 'nonce identities are immutable');
END;

CREATE TRIGGER lnsat_signed_approval_nonce_identities_reject_delete
BEFORE DELETE ON lnsat_signed_approval_nonce_identities
BEGIN
  SELECT RAISE(ABORT, 'nonce identities are immutable');
END;

CREATE TRIGGER lnsat_signed_approval_nonce_events_validate_insert
AFTER INSERT ON lnsat_signed_approval_nonce_events
BEGIN
  SELECT CASE
    WHEN NOT EXISTS (
      SELECT 1
      FROM lnsat_authority_order
      WHERE sequence = NEW.authority_sequence
        AND record_family = 'nonce_event'
        AND record_id = NEW.nonce_event_id
    )
    THEN RAISE(ABORT, 'nonce event authority reference is invalid')
  END;
  SELECT CASE
    WHEN NEW.revision = 1
    AND NOT EXISTS (
      SELECT 1
      FROM lnsat_signed_approval_nonce_identities AS nonce
      WHERE nonce.nonce_id = NEW.nonce_id
        AND NEW.effective_at = nonce.issued_at
    )
    THEN RAISE(ABORT, 'nonce issued event time is invalid')
  END;
  SELECT CASE
    WHEN NEW.revision = 2
    AND NOT EXISTS (
      SELECT 1
      FROM lnsat_signed_approval_nonce_events AS previous
      WHERE previous.nonce_event_id = NEW.prior_nonce_event_id
        AND previous.nonce_id = NEW.nonce_id
        AND previous.revision = 1
        AND previous.event_kind = 'issued'
    )
    THEN RAISE(ABORT, 'nonce event predecessor is invalid')
  END;
  SELECT CASE
    WHEN NEW.revision = 2
    AND NOT EXISTS (
      SELECT 1
      FROM lnsat_signed_approval_nonce_identities AS nonce
      WHERE nonce.nonce_id = NEW.nonce_id
        AND NEW.effective_at >= nonce.issued_at
        AND (
          (
            NEW.event_kind = 'expired'
            AND NEW.effective_at >= nonce.expires_at
          )
          OR (
            NEW.event_kind IN ('cancelled', 'consumed')
            AND NEW.effective_at < nonce.expires_at
          )
        )
    )
    THEN RAISE(ABORT, 'nonce terminal event time is invalid')
  END;
  SELECT CASE
    WHEN NEW.event_kind = 'consumed'
    AND NOT EXISTS (
      SELECT 1
      FROM lnsat_signed_approval_nonce_consumptions AS consumption
      WHERE consumption.nonce_id = NEW.nonce_id
        AND consumption.consumed_at = NEW.effective_at
        AND NEW.recorded_at = NEW.effective_at
        AND NEW.authority_sequence = consumption.authority_sequence + 1
    )
    THEN RAISE(ABORT, 'nonce consumed event binding is invalid')
  END;
END;

CREATE TRIGGER lnsat_signed_approval_nonce_events_reject_update
BEFORE UPDATE ON lnsat_signed_approval_nonce_events
BEGIN
  SELECT RAISE(ABORT, 'nonce events are immutable');
END;

CREATE TRIGGER lnsat_signed_approval_nonce_events_reject_delete
BEFORE DELETE ON lnsat_signed_approval_nonce_events
BEGIN
  SELECT RAISE(ABORT, 'nonce events are immutable');
END;

CREATE TRIGGER lnsat_signed_approval_evidence_validate_insert
AFTER INSERT ON lnsat_signed_approval_evidence
BEGIN
  SELECT CASE
    WHEN NOT EXISTS (
      SELECT 1
      FROM lnsat_authority_order
      WHERE sequence = NEW.authority_sequence
        AND record_family = 'signed_approval_evidence'
        AND record_id = NEW.evidence_id
    )
    THEN RAISE(ABORT, 'signed approval evidence authority reference is invalid')
  END;
  SELECT CASE
    WHEN NOT EXISTS (
      SELECT 1
      FROM lnsat_approval_decisions
      WHERE approval_decision_id = NEW.decision_id
        AND project_ref = NEW.project_ref
        AND decision = 'approved'
        AND approval_gate_satisfied = 1
        AND execution_authorized = 0
        AND NEW.issued_at >= strftime(
          '%Y-%m-%dT%H:%M:%fZ',
          decided_at
        )
        AND NEW.issued_at < strftime(
          '%Y-%m-%dT%H:%M:%fZ',
          expires_at
        )
        AND NEW.expires_at = strftime(
          '%Y-%m-%dT%H:%M:%fZ',
          expires_at
        )
    )
    THEN RAISE(ABORT, 'signed approval evidence decision binding is invalid')
  END;
  SELECT CASE
    WHEN NOT EXISTS (
      SELECT 1
      FROM lnsat_signed_approval_nonce_identities AS nonce
      JOIN lnsat_signed_approval_nonce_events AS issued
        ON issued.nonce_id = nonce.nonce_id
       AND issued.revision = 1
       AND issued.event_kind = 'issued'
      WHERE nonce.nonce_id = NEW.nonce_id
        AND nonce.project_ref = NEW.project_ref
        AND nonce.decision_id = NEW.decision_id
        AND nonce.issued_at = NEW.issued_at
        AND nonce.expires_at = NEW.expires_at
        AND NOT EXISTS (
          SELECT 1
          FROM lnsat_signed_approval_nonce_events AS terminal
          WHERE terminal.nonce_id = nonce.nonce_id
            AND terminal.event_kind IN (
              'cancelled',
              'expired',
              'consumed'
            )
        )
    )
    THEN RAISE(ABORT, 'signed approval evidence nonce binding is invalid')
  END;
  SELECT CASE
    WHEN NOT EXISTS (
      SELECT 1
      FROM lnsat_signed_approval_verification_materials AS material
      JOIN lnsat_signed_approval_key_status_events AS status
        ON status.material_ref = material.material_ref
      WHERE material.material_ref = NEW.material_ref
        AND material.valid_from <= NEW.issued_at
        AND NEW.expires_at <= material.valid_until
        AND status.revision = (
          SELECT max(latest.revision)
          FROM lnsat_signed_approval_key_status_events AS latest
          WHERE latest.material_ref = material.material_ref
        )
        AND status.status = 'active'
        AND status.effective_at <= NEW.issued_at
    )
    THEN RAISE(ABORT, 'signed approval evidence material binding is invalid')
  END;
END;

CREATE TRIGGER lnsat_signed_approval_evidence_reject_update
BEFORE UPDATE ON lnsat_signed_approval_evidence
BEGIN
  SELECT RAISE(ABORT, 'signed approval evidence is immutable');
END;

CREATE TRIGGER lnsat_signed_approval_evidence_reject_delete
BEFORE DELETE ON lnsat_signed_approval_evidence
BEGIN
  SELECT RAISE(ABORT, 'signed approval evidence is immutable');
END;

CREATE TRIGGER lnsat_signed_approval_evidence_issue_idempotency_reject_update
BEFORE UPDATE ON lnsat_signed_approval_evidence_issue_idempotency
BEGIN
  SELECT RAISE(ABORT, 'signed approval evidence issuance idempotency is immutable');
END;

CREATE TRIGGER lnsat_signed_approval_evidence_issue_idempotency_reject_delete
BEFORE DELETE ON lnsat_signed_approval_evidence_issue_idempotency
BEGIN
  SELECT RAISE(ABORT, 'signed approval evidence issuance idempotency is immutable');
END;

CREATE TRIGGER lnsat_signed_approval_verification_attempts_validate_insert
AFTER INSERT ON lnsat_signed_approval_verification_attempts
BEGIN
  SELECT CASE
    WHEN NOT EXISTS (
      SELECT 1
      FROM lnsat_authority_order
      WHERE sequence = NEW.authority_sequence
        AND record_family = 'verification_attempt'
        AND record_id = NEW.attempt_id
    )
    THEN RAISE(ABORT, 'verification attempt authority reference is invalid')
  END;
END;

CREATE TRIGGER lnsat_signed_approval_verification_attempts_reject_update
BEFORE UPDATE ON lnsat_signed_approval_verification_attempts
BEGIN
  SELECT RAISE(ABORT, 'verification attempts are immutable');
END;

CREATE TRIGGER lnsat_signed_approval_verification_attempts_reject_delete
BEFORE DELETE ON lnsat_signed_approval_verification_attempts
BEGIN
  SELECT RAISE(ABORT, 'verification attempts are preserve-only');
END;

CREATE TRIGGER lnsat_signed_approval_verification_attempt_subjects_validate_insert
AFTER INSERT ON lnsat_signed_approval_verification_attempt_subjects
BEGIN
  SELECT CASE
    WHEN NOT EXISTS (
      SELECT 1
      FROM lnsat_signed_approval_verification_attempts AS attempt
      JOIN lnsat_signed_approval_evidence AS evidence
        ON evidence.evidence_id = NEW.evidence_id
       AND evidence.material_ref = NEW.material_ref
      WHERE attempt.attempt_id = NEW.attempt_id
        AND attempt.observed_at >= evidence.issued_at
        AND (
          attempt.result_code = 'rejected'
          OR attempt.observed_at < evidence.expires_at
        )
    )
    THEN RAISE(ABORT, 'verification attempt subject binding is invalid')
  END;
END;

CREATE TRIGGER lnsat_signed_approval_verification_attempt_subjects_reject_update
BEFORE UPDATE ON lnsat_signed_approval_verification_attempt_subjects
BEGIN
  SELECT RAISE(ABORT, 'verification attempt subjects are immutable');
END;

CREATE TRIGGER lnsat_signed_approval_verification_attempt_subjects_reject_delete
BEFORE DELETE ON lnsat_signed_approval_verification_attempt_subjects
BEGIN
  SELECT RAISE(ABORT, 'verification attempt subjects are preserve-only');
END;

CREATE TRIGGER lnsat_signed_approval_nonce_consumptions_validate_insert
AFTER INSERT ON lnsat_signed_approval_nonce_consumptions
BEGIN
  SELECT CASE
    WHEN NOT EXISTS (
      SELECT 1
      FROM lnsat_authority_order
      WHERE sequence = NEW.authority_sequence
        AND record_family = 'nonce_consumption'
        AND record_id = NEW.consumption_id
    )
    THEN RAISE(ABORT, 'nonce consumption authority reference is invalid')
  END;
  SELECT CASE
    WHEN NOT EXISTS (
      SELECT 1
      FROM lnsat_signed_approval_evidence AS evidence
      JOIN lnsat_signed_approval_nonce_identities AS nonce
        ON nonce.nonce_id = evidence.nonce_id
       AND nonce.project_ref = evidence.project_ref
      JOIN lnsat_signed_approval_verification_materials AS material
        ON material.material_ref = evidence.material_ref
      JOIN lnsat_signed_approval_key_status_events AS status
        ON status.material_ref = material.material_ref
      JOIN lnsat_signed_approval_nonce_events AS issued
        ON issued.nonce_id = nonce.nonce_id
       AND issued.revision = 1
       AND issued.event_kind = 'issued'
      WHERE evidence.evidence_id = NEW.evidence_id
        AND evidence.nonce_id = NEW.nonce_id
        AND evidence.project_ref = NEW.project_ref
        AND NEW.consumed_at >= evidence.issued_at
        AND NEW.consumed_at < evidence.expires_at
        AND material.valid_from <= NEW.consumed_at
        AND NEW.consumed_at < material.valid_until
        AND status.revision = (
          SELECT max(latest.revision)
          FROM lnsat_signed_approval_key_status_events AS latest
          WHERE latest.material_ref = material.material_ref
            AND latest.effective_at <= NEW.consumed_at
        )
        AND status.status = 'active'
        AND status.effective_at <= NEW.consumed_at
        AND NOT EXISTS (
          SELECT 1
          FROM lnsat_signed_approval_nonce_events AS terminal
          WHERE terminal.nonce_id = nonce.nonce_id
            AND terminal.event_kind IN (
              'cancelled',
              'expired',
              'consumed'
            )
        )
    )
    THEN RAISE(ABORT, 'nonce consumption evidence binding is invalid')
  END;
END;

CREATE TRIGGER lnsat_signed_approval_nonce_consumptions_reject_update
BEFORE UPDATE ON lnsat_signed_approval_nonce_consumptions
BEGIN
  SELECT RAISE(ABORT, 'nonce consumptions are immutable');
END;

CREATE TRIGGER lnsat_signed_approval_nonce_consumptions_reject_delete
BEFORE DELETE ON lnsat_signed_approval_nonce_consumptions
BEGIN
  SELECT RAISE(ABORT, 'nonce consumptions are preserve-only');
END;

CREATE TRIGGER lnsat_signed_approval_nonce_consume_idempotency_reject_update
BEFORE UPDATE ON lnsat_signed_approval_nonce_consume_idempotency
BEGIN
  SELECT RAISE(ABORT, 'nonce consumption idempotency is immutable');
END;

CREATE TRIGGER lnsat_signed_approval_nonce_consume_idempotency_reject_delete
BEFORE DELETE ON lnsat_signed_approval_nonce_consume_idempotency
BEGIN
  SELECT RAISE(ABORT, 'nonce consumption idempotency is preserve-only');
END;
