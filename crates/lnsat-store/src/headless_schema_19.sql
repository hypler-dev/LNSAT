-- Selected-only headless schema. Never register with ordinary MIGRATIONS.
CREATE TABLE lnsat_migration_0019_authority_empty_guard (
  singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
  occupied INTEGER NOT NULL CHECK (occupied = 0)
) STRICT;

INSERT INTO lnsat_migration_0019_authority_empty_guard (singleton, occupied)
SELECT 1,
  (EXISTS (SELECT 1 FROM lnsat_action_request_evaluations))
  + (EXISTS (SELECT 1 FROM lnsat_action_request_observations))
  + (EXISTS (SELECT 1 FROM lnsat_action_requests))
  + (EXISTS (SELECT 1 FROM lnsat_approval_decisions))
  + (EXISTS (SELECT 1 FROM lnsat_approval_requests))
  + (EXISTS (SELECT 1 FROM lnsat_audit_event_reason_codes))
  + (EXISTS (SELECT 1 FROM lnsat_audit_events))
  + (EXISTS (SELECT 1 FROM lnsat_authorization_attempts))
  + (EXISTS (SELECT 1 FROM lnsat_authorization_nonces))
  + (EXISTS (SELECT 1 FROM lnsat_capability_consumptions))
  + (EXISTS (SELECT 1 FROM lnsat_execution_authorizations))
  + (EXISTS (SELECT 1 FROM lnsat_local_identities))
  + (EXISTS (SELECT 1 FROM lnsat_local_identity_events))
  + (EXISTS (SELECT 1 FROM lnsat_local_identity_status_events))
  + (EXISTS (SELECT 1 FROM lnsat_local_password_credentials))
  + (EXISTS (SELECT 1 FROM lnsat_local_session_activity_events))
  + (EXISTS (SELECT 1 FROM lnsat_local_session_events))
  + (EXISTS (SELECT 1 FROM lnsat_local_session_revocations))
  + (EXISTS (SELECT 1 FROM lnsat_local_session_rotations))
  + (EXISTS (SELECT 1 FROM lnsat_local_sessions))
  + (EXISTS (SELECT 1 FROM lnsat_operation_attempts))
  + (EXISTS (SELECT 1 FROM lnsat_operation_receipts))
  + (EXISTS (SELECT 1 FROM lnsat_operation_reconciliations))
  + (EXISTS (SELECT 1 FROM lnsat_operations))
  + (EXISTS (SELECT 1 FROM lnsat_packet_envelopes))
  + (EXISTS (SELECT 1 FROM lnsat_packet_resource_refs))
  + (EXISTS (SELECT 1 FROM lnsat_phase7_audit_bindings))
  + (EXISTS (SELECT 1 FROM lnsat_phase7_entities))
  + (EXISTS (SELECT 1 FROM lnsat_phase7_state_events))
  + (EXISTS (SELECT 1 FROM lnsat_policy_decisions))
  + (EXISTS (SELECT 1 FROM lnsat_recovery_inspection_events));

DROP TABLE lnsat_migration_0019_authority_empty_guard;

CREATE TABLE lnsat_store_metadata_v19 (
  singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
  contract_version TEXT NOT NULL CHECK (contract_version = 'lnsat.contracts.v1_0'),
  schema_version INTEGER NOT NULL CHECK (schema_version = 19),
  storage_kind TEXT NOT NULL CHECK (storage_kind = 'sqlite_single_node')
) STRICT;
INSERT INTO lnsat_store_metadata_v19
  SELECT singleton, contract_version, 19, storage_kind FROM lnsat_store_metadata;
DROP TABLE lnsat_store_metadata;
ALTER TABLE lnsat_store_metadata_v19 RENAME TO lnsat_store_metadata;

DROP TRIGGER lnsat_retention_policies_reject_update;
DROP TRIGGER lnsat_retention_policies_reject_delete;

CREATE TABLE lnsat_retention_policies_v19 (
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
      'headless_active',
      'headless_config_audit',
      'headless_generation',
      'headless_installation',
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

INSERT INTO lnsat_retention_policies_v19 (
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

INSERT INTO lnsat_retention_policies_v19 (
  record_family,
  retention_class,
  disposition,
  cleanup_eligible,
  minimum_retention_seconds
)
VALUES
  ('headless_active', 'control_plane', 'preserve', 0, NULL),
  ('headless_config_audit', 'control_plane', 'preserve', 0, NULL),
  ('headless_generation', 'control_plane', 'preserve', 0, NULL),
  ('headless_installation', 'control_plane', 'preserve', 0, NULL);

DROP TABLE lnsat_retention_policies;
ALTER TABLE lnsat_retention_policies_v19 RENAME TO lnsat_retention_policies;

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

CREATE TABLE headless_installations (
  singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
  installation_id TEXT NOT NULL CHECK (length(installation_id) = 36 AND substr(installation_id, 9, 1) = '-' AND substr(installation_id, 14, 1) = '-' AND substr(installation_id, 19, 1) = '-' AND substr(installation_id, 24, 1) = '-' AND length(replace(installation_id, '-', '')) = 32 AND replace(installation_id, '-', '') NOT GLOB '*[^0-9a-f]*'),
  store_instance_id TEXT NOT NULL CHECK (length(store_instance_id) = 36 AND substr(store_instance_id, 9, 1) = '-' AND substr(store_instance_id, 14, 1) = '-' AND substr(store_instance_id, 19, 1) = '-' AND substr(store_instance_id, 24, 1) = '-' AND length(replace(store_instance_id, '-', '')) = 32 AND replace(store_instance_id, '-', '') NOT GLOB '*[^0-9a-f]*'),
  declaration_installation_ref TEXT NOT NULL CHECK (length(CAST(declaration_installation_ref AS BLOB)) BETWEEN 14 AND 1024 AND substr(declaration_installation_ref, 1, 13) = 'installation:'),
  owner_identity_ref TEXT NOT NULL CHECK (length(CAST(owner_identity_ref AS BLOB)) BETWEEN 16 AND 1024 AND substr(owner_identity_ref, 1, 15) = 'identity:human:'),
  owner_identity_event_ref TEXT NOT NULL CHECK (length(CAST(owner_identity_event_ref AS BLOB)) = 71 AND substr(owner_identity_event_ref, 1, 7) = 'sha256:' AND substr(owner_identity_event_ref, 8) NOT GLOB '*[^0-9a-f]*'),
  owner_identity_event_digest TEXT NOT NULL CHECK (length(CAST(owner_identity_event_digest AS BLOB)) = 71 AND substr(owner_identity_event_digest, 1, 7) = 'sha256:' AND substr(owner_identity_event_digest, 8) NOT GLOB '*[^0-9a-f]*'),
  initial_credential_ref TEXT NOT NULL CHECK (length(CAST(initial_credential_ref AS BLOB)) = 71 AND substr(initial_credential_ref, 1, 7) = 'sha256:' AND substr(initial_credential_ref, 8) NOT GLOB '*[^0-9a-f]*'),
  initial_credential_generation INTEGER NOT NULL CHECK (initial_credential_generation = 1),
  store_binding_json TEXT NOT NULL CHECK (length(CAST(store_binding_json AS BLOB)) BETWEEN 2 AND 16384),
  store_binding_digest TEXT NOT NULL CHECK (length(CAST(store_binding_digest AS BLOB)) = 71 AND substr(store_binding_digest, 1, 7) = 'sha256:' AND substr(store_binding_digest, 8) NOT GLOB '*[^0-9a-f]*'),
  preparation_id TEXT NOT NULL CHECK (length(preparation_id) = 64 AND preparation_id NOT GLOB '*[^0-9a-f]*'),
  preparation_candidate_digest TEXT NOT NULL CHECK (length(CAST(preparation_candidate_digest AS BLOB)) = 71 AND substr(preparation_candidate_digest, 1, 7) = 'sha256:' AND substr(preparation_candidate_digest, 8) NOT GLOB '*[^0-9a-f]*'),
  preparation_store_digest TEXT NOT NULL CHECK (length(CAST(preparation_store_digest AS BLOB)) = 71 AND substr(preparation_store_digest, 1, 7) = 'sha256:' AND substr(preparation_store_digest, 8) NOT GLOB '*[^0-9a-f]*'),
  preparation_recipe_digest TEXT NOT NULL CHECK (length(CAST(preparation_recipe_digest AS BLOB)) = 71 AND substr(preparation_recipe_digest, 1, 7) = 'sha256:' AND substr(preparation_recipe_digest, 8) NOT GLOB '*[^0-9a-f]*'),
  cleanup_journal_digest TEXT NOT NULL CHECK (length(CAST(cleanup_journal_digest AS BLOB)) = 71 AND substr(cleanup_journal_digest, 1, 7) = 'sha256:' AND substr(cleanup_journal_digest, 8) NOT GLOB '*[^0-9a-f]*'),
  first_generation_ref TEXT NOT NULL CHECK (length(CAST(first_generation_ref AS BLOB)) BETWEEN 12 AND 1024 AND substr(first_generation_ref, 1, 11) = 'generation:'),
  bootstrap_audit_ref TEXT NOT NULL CHECK (length(CAST(bootstrap_audit_ref AS BLOB)) BETWEEN 14 AND 1024 AND substr(bootstrap_audit_ref, 1, 13) = 'config-audit:'),
  initialized_at TEXT NOT NULL CHECK (length(CAST(initialized_at AS BLOB)) = 24 AND substr(initialized_at, 24, 1) = 'Z'),
  installation_digest TEXT NOT NULL CHECK (length(CAST(installation_digest AS BLOB)) = 71 AND substr(installation_digest, 1, 7) = 'sha256:' AND substr(installation_digest, 8) NOT GLOB '*[^0-9a-f]*'),
  FOREIGN KEY (owner_identity_ref) REFERENCES lnsat_local_identities (identity_ref) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (owner_identity_event_ref) REFERENCES lnsat_local_identity_events (event_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (owner_identity_event_digest) REFERENCES lnsat_local_identity_events (event_evidence_digest) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (initial_credential_ref) REFERENCES lnsat_local_password_credentials (credential_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (first_generation_ref) REFERENCES headless_generations (generation_ref) DEFERRABLE INITIALLY DEFERRED,
  FOREIGN KEY (bootstrap_audit_ref) REFERENCES headless_config_audit (audit_ref) DEFERRABLE INITIALLY DEFERRED
) STRICT;

CREATE TRIGGER headless_installations_validate_owner
BEFORE INSERT ON headless_installations
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1
    FROM lnsat_local_identities AS i
    JOIN lnsat_local_password_credentials AS c ON c.identity_ref = i.identity_ref
    JOIN lnsat_local_identity_events AS e ON e.identity_ref = i.identity_ref
    WHERE i.identity_ref = NEW.owner_identity_ref
      AND i.role = 'owner' AND i.status = 'active'
      AND c.credential_id = NEW.initial_credential_ref
      AND c.credential_version = NEW.initial_credential_generation
      AND c.credential_version = 1
      AND e.event_id = NEW.owner_identity_event_ref
      AND e.event_evidence_digest = NEW.owner_identity_event_digest
      AND e.event_kind = 'owner_bootstrapped' AND e.event_sequence = 1
      AND e.actor_session_id IS NULL AND e.credential_version = 1
      AND e.source_evidence_digest = c.credential_id
      AND i.created_at = NEW.initialized_at
      AND c.created_at = NEW.initialized_at AND e.occurred_at = NEW.initialized_at
  ) THEN RAISE(ABORT, 'headless installation owner binding failed') END;
END;

CREATE UNIQUE INDEX headless_installations_installation_id_idx ON headless_installations (installation_id);

CREATE UNIQUE INDEX headless_installations_store_instance_id_idx ON headless_installations (store_instance_id);

CREATE UNIQUE INDEX headless_installations_root_binding_idx ON headless_installations (installation_id, installation_digest);

CREATE UNIQUE INDEX headless_installations_first_generation_idx ON headless_installations (first_generation_ref);

CREATE UNIQUE INDEX headless_installations_bootstrap_audit_idx ON headless_installations (bootstrap_audit_ref);

CREATE TABLE headless_generations (
  generation_ref TEXT PRIMARY KEY NOT NULL CHECK (length(CAST(generation_ref AS BLOB)) BETWEEN 12 AND 1024 AND substr(generation_ref, 1, 11) = 'generation:'),
  installation_id TEXT NOT NULL CHECK (length(installation_id) = 36 AND substr(installation_id, 9, 1) = '-' AND substr(installation_id, 14, 1) = '-' AND substr(installation_id, 19, 1) = '-' AND substr(installation_id, 24, 1) = '-' AND length(replace(installation_id, '-', '')) = 32 AND replace(installation_id, '-', '') NOT GLOB '*[^0-9a-f]*'),
  installation_digest TEXT NOT NULL CHECK (length(CAST(installation_digest AS BLOB)) = 71 AND substr(installation_digest, 1, 7) = 'sha256:' AND substr(installation_digest, 8) NOT GLOB '*[^0-9a-f]*'),
  generation_sequence INTEGER NOT NULL CHECK (generation_sequence BETWEEN 1 AND 9007199254740991),
  previous_generation_digest TEXT CHECK (previous_generation_digest IS NULL OR (length(CAST(previous_generation_digest AS BLOB)) = 71 AND substr(previous_generation_digest, 1, 7) = 'sha256:' AND substr(previous_generation_digest, 8) NOT GLOB '*[^0-9a-f]*')),
  declaration_json TEXT NOT NULL CHECK (length(CAST(declaration_json AS BLOB)) BETWEEN 2 AND 65536),
  declaration_digest TEXT NOT NULL CHECK (length(CAST(declaration_digest AS BLOB)) = 71 AND substr(declaration_digest, 1, 7) = 'sha256:' AND substr(declaration_digest, 8) NOT GLOB '*[^0-9a-f]*'),
  declared_composed_json TEXT NOT NULL CHECK (length(CAST(declared_composed_json AS BLOB)) BETWEEN 2 AND 262144),
  declared_composed_digest TEXT NOT NULL CHECK (length(CAST(declared_composed_digest AS BLOB)) = 71 AND substr(declared_composed_digest, 1, 7) = 'sha256:' AND substr(declared_composed_digest, 8) NOT GLOB '*[^0-9a-f]*'),
  effective_envelope_json TEXT NOT NULL CHECK (length(CAST(effective_envelope_json AS BLOB)) BETWEEN 2 AND 262144),
  effective_envelope_digest TEXT NOT NULL CHECK (length(CAST(effective_envelope_digest AS BLOB)) = 71 AND substr(effective_envelope_digest, 1, 7) = 'sha256:' AND substr(effective_envelope_digest, 8) NOT GLOB '*[^0-9a-f]*'),
  binding_declaration_json TEXT NOT NULL CHECK (length(CAST(binding_declaration_json AS BLOB)) BETWEEN 2 AND 65536),
  binding_declaration_digest TEXT NOT NULL CHECK (length(CAST(binding_declaration_digest AS BLOB)) = 71 AND substr(binding_declaration_digest, 1, 7) = 'sha256:' AND substr(binding_declaration_digest, 8) NOT GLOB '*[^0-9a-f]*'),
  resource_evidence_digest TEXT NOT NULL CHECK (length(CAST(resource_evidence_digest AS BLOB)) = 71 AND substr(resource_evidence_digest, 1, 7) = 'sha256:' AND substr(resource_evidence_digest, 8) NOT GLOB '*[^0-9a-f]*'),
  policy_floor_version TEXT NOT NULL CHECK (length(CAST(policy_floor_version AS BLOB)) BETWEEN 1 AND 128 AND policy_floor_version GLOB '[a-z0-9]*' AND policy_floor_version NOT GLOB '*[^a-z0-9._:-]*'),
  policy_floor_digest TEXT NOT NULL CHECK (length(CAST(policy_floor_digest AS BLOB)) = 71 AND substr(policy_floor_digest, 1, 7) = 'sha256:' AND substr(policy_floor_digest, 8) NOT GLOB '*[^0-9a-f]*'),
  enforcement_profile_version TEXT NOT NULL CHECK (length(CAST(enforcement_profile_version AS BLOB)) BETWEEN 1 AND 128 AND enforcement_profile_version GLOB '[a-z0-9]*' AND enforcement_profile_version NOT GLOB '*[^a-z0-9._:-]*'),
  created_at TEXT NOT NULL CHECK (length(CAST(created_at AS BLOB)) = 24 AND substr(created_at, 24, 1) = 'Z'),
  generation_digest TEXT NOT NULL CHECK (length(CAST(generation_digest AS BLOB)) = 71 AND substr(generation_digest, 1, 7) = 'sha256:' AND substr(generation_digest, 8) NOT GLOB '*[^0-9a-f]*'),
  CHECK ((generation_sequence = 1 AND previous_generation_digest IS NULL) OR (generation_sequence > 1 AND previous_generation_digest IS NOT NULL)),
  FOREIGN KEY (installation_id, installation_digest) REFERENCES headless_installations (installation_id, installation_digest) DEFERRABLE INITIALLY DEFERRED
) STRICT;

CREATE UNIQUE INDEX headless_generations_sequence_idx ON headless_generations (installation_id, generation_sequence);

CREATE UNIQUE INDEX headless_generations_pointer_binding_idx ON headless_generations (generation_ref, generation_digest);

CREATE TABLE headless_config_audit (
  audit_ref TEXT PRIMARY KEY NOT NULL CHECK (length(CAST(audit_ref AS BLOB)) BETWEEN 14 AND 1024 AND substr(audit_ref, 1, 13) = 'config-audit:'),
  installation_id TEXT NOT NULL CHECK (length(installation_id) = 36 AND substr(installation_id, 9, 1) = '-' AND substr(installation_id, 14, 1) = '-' AND substr(installation_id, 19, 1) = '-' AND substr(installation_id, 24, 1) = '-' AND length(replace(installation_id, '-', '')) = 32 AND replace(installation_id, '-', '') NOT GLOB '*[^0-9a-f]*'),
  audit_sequence INTEGER NOT NULL CHECK (audit_sequence BETWEEN 1 AND 9007199254740991),
  previous_audit_digest TEXT CHECK (previous_audit_digest IS NULL OR (length(CAST(previous_audit_digest AS BLOB)) = 71 AND substr(previous_audit_digest, 1, 7) = 'sha256:' AND substr(previous_audit_digest, 8) NOT GLOB '*[^0-9a-f]*')),
  event_kind TEXT NOT NULL CHECK (length(CAST(event_kind AS BLOB)) BETWEEN 1 AND 128),
  payload_json TEXT NOT NULL CHECK (length(CAST(payload_json AS BLOB)) BETWEEN 2 AND 16384),
  payload_digest TEXT NOT NULL CHECK (length(CAST(payload_digest AS BLOB)) = 71 AND substr(payload_digest, 1, 7) = 'sha256:' AND substr(payload_digest, 8) NOT GLOB '*[^0-9a-f]*'),
  recorded_at TEXT NOT NULL CHECK (length(CAST(recorded_at AS BLOB)) = 24 AND substr(recorded_at, 24, 1) = 'Z'),
  audit_digest TEXT NOT NULL CHECK (length(CAST(audit_digest AS BLOB)) = 71 AND substr(audit_digest, 1, 7) = 'sha256:' AND substr(audit_digest, 8) NOT GLOB '*[^0-9a-f]*'),
  CHECK ((audit_sequence = 1 AND previous_audit_digest IS NULL AND event_kind = 'headless_bootstrap.v1') OR (audit_sequence > 1 AND previous_audit_digest IS NOT NULL AND event_kind <> 'headless_bootstrap.v1')),
  FOREIGN KEY (installation_id) REFERENCES headless_installations (installation_id) DEFERRABLE INITIALLY DEFERRED
) STRICT;

CREATE UNIQUE INDEX headless_config_audit_sequence_idx ON headless_config_audit (installation_id, audit_sequence);

CREATE UNIQUE INDEX headless_config_audit_pointer_binding_idx ON headless_config_audit (audit_ref, audit_digest);

CREATE TABLE headless_active (
  singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
  installation_id TEXT NOT NULL CHECK (length(installation_id) = 36 AND substr(installation_id, 9, 1) = '-' AND substr(installation_id, 14, 1) = '-' AND substr(installation_id, 19, 1) = '-' AND substr(installation_id, 24, 1) = '-' AND length(replace(installation_id, '-', '')) = 32 AND replace(installation_id, '-', '') NOT GLOB '*[^0-9a-f]*'),
  generation_ref TEXT NOT NULL CHECK (length(CAST(generation_ref AS BLOB)) BETWEEN 12 AND 1024 AND substr(generation_ref, 1, 11) = 'generation:'),
  generation_digest TEXT NOT NULL CHECK (length(CAST(generation_digest AS BLOB)) = 71 AND substr(generation_digest, 1, 7) = 'sha256:' AND substr(generation_digest, 8) NOT GLOB '*[^0-9a-f]*'),
  authority_epoch INTEGER NOT NULL CHECK (authority_epoch BETWEEN 1 AND 9007199254740991),
  active_stop INTEGER NOT NULL CHECK (active_stop IN (0, 1)),
  stop_revocation_epoch INTEGER NOT NULL CHECK (stop_revocation_epoch BETWEEN 0 AND 9007199254740991),
  audit_head_ref TEXT NOT NULL CHECK (length(CAST(audit_head_ref AS BLOB)) BETWEEN 14 AND 1024 AND substr(audit_head_ref, 1, 13) = 'config-audit:'),
  audit_head_digest TEXT NOT NULL CHECK (length(CAST(audit_head_digest AS BLOB)) = 71 AND substr(audit_head_digest, 1, 7) = 'sha256:' AND substr(audit_head_digest, 8) NOT GLOB '*[^0-9a-f]*'),
  FOREIGN KEY (installation_id) REFERENCES headless_installations (installation_id) DEFERRABLE INITIALLY DEFERRED,
  FOREIGN KEY (generation_ref, generation_digest) REFERENCES headless_generations (generation_ref, generation_digest) DEFERRABLE INITIALLY DEFERRED,
  FOREIGN KEY (audit_head_ref, audit_head_digest) REFERENCES headless_config_audit (audit_ref, audit_digest) DEFERRABLE INITIALLY DEFERRED
) STRICT;

CREATE TRIGGER headless_installations_reject_update
BEFORE UPDATE ON headless_installations
BEGIN
  SELECT RAISE(ABORT, 'headless installations are immutable');
END;

CREATE TRIGGER headless_installations_reject_delete
BEFORE DELETE ON headless_installations
BEGIN
  SELECT RAISE(ABORT, 'headless installations are immutable');
END;

CREATE TRIGGER headless_generations_reject_update
BEFORE UPDATE ON headless_generations
BEGIN
  SELECT RAISE(ABORT, 'headless generations are immutable');
END;

CREATE TRIGGER headless_generations_reject_delete
BEFORE DELETE ON headless_generations
BEGIN
  SELECT RAISE(ABORT, 'headless generations are immutable');
END;

CREATE TRIGGER headless_config_audit_reject_update
BEFORE UPDATE ON headless_config_audit
BEGIN
  SELECT RAISE(ABORT, 'headless configuration audit is immutable');
END;

CREATE TRIGGER headless_config_audit_reject_delete
BEFORE DELETE ON headless_config_audit
BEGIN
  SELECT RAISE(ABORT, 'headless configuration audit is immutable');
END;

CREATE TRIGGER headless_active_reject_delete
BEFORE DELETE ON headless_active
BEGIN
  SELECT RAISE(ABORT, 'headless active pointer cannot be deleted');
END;

CREATE TRIGGER headless_active_require_genesis
BEFORE INSERT ON headless_active
BEGIN
  SELECT CASE WHEN
    NEW.authority_epoch <> 1 OR NEW.active_stop <> 0 OR NEW.stop_revocation_epoch <> 0
    OR NOT EXISTS (
      SELECT 1 FROM headless_installations AS i
      JOIN headless_generations AS g ON g.generation_ref = i.first_generation_ref
      JOIN headless_config_audit AS a ON a.audit_ref = i.bootstrap_audit_ref
      WHERE i.installation_id = NEW.installation_id
        AND g.installation_id = i.installation_id
        AND g.installation_digest = i.installation_digest
        AND g.generation_ref = NEW.generation_ref
        AND g.generation_digest = NEW.generation_digest
        AND g.generation_sequence = 1 AND g.previous_generation_digest IS NULL
        AND a.installation_id = i.installation_id
        AND a.audit_ref = NEW.audit_head_ref AND a.audit_digest = NEW.audit_head_digest
        AND a.audit_sequence = 1 AND a.previous_audit_digest IS NULL
        AND a.event_kind = 'headless_bootstrap.v1'
    )
  THEN RAISE(ABORT, 'headless active genesis binding failed') END;
END;

CREATE TRIGGER headless_active_reject_regression
BEFORE UPDATE ON headless_active
BEGIN
  SELECT CASE WHEN
    NEW.singleton IS NOT OLD.singleton
    OR NEW.installation_id IS NOT OLD.installation_id
    OR NEW.authority_epoch <= OLD.authority_epoch
    OR NEW.stop_revocation_epoch < OLD.stop_revocation_epoch
    OR (NEW.active_stop <> OLD.active_stop AND NEW.stop_revocation_epoch <= OLD.stop_revocation_epoch)
    OR NOT EXISTS (
      SELECT 1 FROM headless_generations AS old_g, headless_generations AS new_g
      WHERE old_g.generation_ref = OLD.generation_ref
        AND old_g.generation_digest = OLD.generation_digest
        AND new_g.generation_ref = NEW.generation_ref
        AND new_g.generation_digest = NEW.generation_digest
        AND old_g.installation_id = NEW.installation_id
        AND new_g.installation_id = NEW.installation_id
        AND new_g.generation_sequence >= old_g.generation_sequence
    )
    OR NOT EXISTS (
      SELECT 1 FROM headless_config_audit AS old_a, headless_config_audit AS new_a
      WHERE old_a.audit_ref = OLD.audit_head_ref AND old_a.audit_digest = OLD.audit_head_digest
        AND new_a.audit_ref = NEW.audit_head_ref AND new_a.audit_digest = NEW.audit_head_digest
        AND old_a.installation_id = NEW.installation_id
        AND new_a.installation_id = NEW.installation_id
        AND new_a.audit_sequence > old_a.audit_sequence
    )
  THEN RAISE(ABORT, 'headless active pointer regression') END;
END;
