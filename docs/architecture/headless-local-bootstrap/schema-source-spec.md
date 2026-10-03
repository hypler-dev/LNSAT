<!-- intent-driven-delivery:spec:v1 -->

# Specification: HCFG-5B B5 Headless Schema and Verification Contract

Status: proposed
Intent: [Accepted atomic local bootstrap](intent.md)
Authority: [Project Status](../../PROJECT_STATUS.md#hcfg-5b-b5-schema-and-verification-contract)
Owner: LNSAT maintainers
Accepted baseline: HCFG-5B 662fc5f489d70d735d9d612e9f8cce6ed3a2b593; HCFG-6 0dbe0a2874428721b1a4ba6bad1708ec5fdbb572
Last updated: 2026-10-03

## Behavior

This proposal specifies the schema portion of the B4 durable-state contract.
It is documentation, not a migration file, registered version, SQL fixture,
initializer, current-state reader or activation. No new SQL was executed to
produce this document. Complete source freeze and the pending Stage-A owner
decision remain controlling. Current source, migration registry and schema 17
are unchanged.

The proposed candidate migration is version 18, with ID
0018_headless_installation_state. It is different from the historical
unregistered Phase 7d signed-evidence SQL18. Actual registration must reconcile
version/schema/truth records; optional signing stays closed. The SQL block
below is the exact proposed migration body: UTF-8 with LF line endings and one
terminal LF. It excludes ledger insertion, user_version and transaction
control, which belong to the existing private migration transaction contract.
It must never be copied into the global registry to bypass the source gate.

The migration is limited to a verified pristine schema-17 store. Its first
statement creates a transaction-local main-schema guard; the insert rejects
any of the 28 existing non-seed tables containing a row. A failed guard rolls
back all SQL under the caller's immediate transaction. Populated owner-only,
historical, restored or otherwise occupied stores remain inert and require a
separately accepted migration or recovery decision. There is no force, repair,
row import, destructive disposal or automatic authority conversion.

Schema/retention seeds are the only existing rows changed. The metadata table
must be rebuilt because its current CHECK permits only version 17. Retention
must retain all 28 exact existing preserve-only families and add four equally
preserve-only headless families. Existing authority/evidence tables, indexes,
triggers and rows are not rewritten. Four new headless tables remain empty
until a later separately gated atomic initialization transaction.

## Interfaces and contracts

Implementation ownership stays private lnsat-store migration/schema/custody
code. The existing ordinary SqliteStore::open migrates on open; registering
this candidate there would make it reachable without the selected-store
boundary. It remains absent from the global MIGRATIONS array. The later
integration packet must freeze explicit selected-custody migration admission
and deny unbound ordinary stores access to headless mutation or authority.
Do not change current ordinary opens or the B1/B3B read-only diagnostics here.

### Structural checks and semantic checks

SQL uses STRICT tables, NOT NULL text primary keys, bounded UTF-8 text lengths,
canonical digest/UUID shape, fixed singleton keys, unique indexes, explicit
foreign keys and immutable history protections. Cyclic root/generation/audit
links are deferred; insert owner rows, root, generation, bootstrap audit and
then the pointer in that order in one immediate transaction. The pointer's
insert trigger requires the complete structural genesis links already present.
Foreign keys must be enabled before the transaction; integrity and deferred
foreign-key checks must succeed before commit.

SQL shape checks do not replace the existing reference/time parsers or B4's
canonical rederivation. The reference ceiling of 1,024 UTF-8 bytes is only a
SQL allocation guard; the existing exact UTF-16/remainder grammar remains
mandatory. Timestamp shape is not calendar validity. Separate foreign keys
for an owner event ID and its evidence digest do not prove they name the same
event or the same owner; the transaction reader must join and rederive that
exact event, credential generation and owner chain before returning success.
Every canonical JSON/digest pair, policy floor and bootstrap payload must be
rederived by the private reader; no SQL row is a resource or execution permit.

The audit SQL permits only bootstrap at sequence 1 and requires nonnull prior
digest at later sequences. Later event-kind text is structurally bounded, not
an accepted variant. The current semantic allowlist is bootstrap only;
unknown kind, payload, sequence or transition denies. No later writer exists
by virtue of a structurally insertable row. Each later closed payload/writer
must pass its own accepted contract and review before integration.

The active-pointer trigger rejects physical-root changes, nonincreasing
authority epoch, decreasing stop/revocation floor, a changed stop flag without
a new floor, generation rollback and nonadvancing audit head. These are
structural guards. They do not authenticate the owner, check a release mutex,
validate a new audit payload or authorize clearing stop. Any future explicit
stop-clear contract must distinguish it from rollback, retain the revocation
floor and prove the exact authenticated decision. Current stop/apply writers
and authority remain closed.

### Physical profile identity and conditional model compatibility

The HCFG-6 native proposal selects profile contract
lnsat.runtime_profile.docker_local.v2 with schema_version 3. Persist that actual
verified contract identity without mapping it to a v1 label. The exact
schema, recipe and observed profile bytes must independently
match the native proof; the version string alone proves none of those facts.
SQL bounds version syntax; the private native/reader allowlist admits only the
exact selected backend. Schema2 or a caller-selected version cannot fall back.

At the B5 design checkpoint pure comparison recognized only asserted v1.
The separately recorded [pure comparison compatibility slice](../../PROJECT_STATUS.md#hcfg-5a-exact-asserted-profile-compatibility)
adds exact asserted v2 recognition while retaining every false
authority/identity claim. This is conditional mathematics, not native
schema-3 verification or authenticated comparison. The latter still requires
the private verified-native/current-state builder. Do not map v2 back to v1
or reinterpret a historical generation/profile. No comparison source change
is part of B5's SQL contract. These dependencies are required for a functioning
engine and full source freeze; an always-denying authenticated comparison
cannot satisfy them.

### Exact proposed migration body

```sql
CREATE TABLE lnsat_migration_0018_authority_empty_guard (
  singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
  occupied INTEGER NOT NULL CHECK (occupied = 0)
) STRICT;

INSERT INTO lnsat_migration_0018_authority_empty_guard (singleton, occupied)
SELECT 1,
(EXISTS (SELECT 1 FROM lnsat_approval_decisions))
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

DROP TABLE lnsat_migration_0018_authority_empty_guard;

CREATE TABLE lnsat_store_metadata_v18 (
  singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
  contract_version TEXT NOT NULL CHECK (contract_version = 'lnsat.contracts.v1_0'),
  schema_version INTEGER NOT NULL CHECK (schema_version = 18),
  storage_kind TEXT NOT NULL CHECK (storage_kind = 'sqlite_single_node')
) STRICT;

INSERT INTO lnsat_store_metadata_v18
  (singleton, contract_version, schema_version, storage_kind)
SELECT singleton, contract_version, 18, storage_kind FROM lnsat_store_metadata;
DROP TABLE lnsat_store_metadata;
ALTER TABLE lnsat_store_metadata_v18 RENAME TO lnsat_store_metadata;

DROP TRIGGER lnsat_retention_policies_reject_update;
DROP TRIGGER lnsat_retention_policies_reject_delete;
CREATE TABLE lnsat_retention_policies_v18 (
  record_family TEXT PRIMARY KEY NOT NULL CHECK (record_family IN (
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
  )),
  retention_class TEXT NOT NULL CHECK (retention_class = 'control_plane'),
  disposition TEXT NOT NULL CHECK (disposition = 'preserve'),
  cleanup_eligible INTEGER NOT NULL CHECK (cleanup_eligible = 0),
  minimum_retention_seconds INTEGER CHECK (minimum_retention_seconds IS NULL)
) STRICT;

INSERT INTO lnsat_retention_policies_v18
  (record_family, retention_class, disposition, cleanup_eligible, minimum_retention_seconds)
SELECT record_family, retention_class, disposition, cleanup_eligible,
  minimum_retention_seconds FROM lnsat_retention_policies;
INSERT INTO lnsat_retention_policies_v18
  (record_family, retention_class, disposition, cleanup_eligible, minimum_retention_seconds)
VALUES
  ('headless_active', 'control_plane', 'preserve', 0, NULL),
  ('headless_config_audit', 'control_plane', 'preserve', 0, NULL),
  ('headless_generation', 'control_plane', 'preserve', 0, NULL),
  ('headless_installation', 'control_plane', 'preserve', 0, NULL);
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
```

Proposed migration-text SHA-256: 73d86de8eeb6a388874477220a860bac6c50de39004d7d4d549c15e29c80cfc6. This commits only the exact SQL
text shown above; it is not a SQLite object-manifest digest or execution result.

### Proposed final object inventory

The final main-schema names retain the existing 31 tables and add exactly
headless_active, headless_config_audit, headless_generations and
headless_installations: 35 tables, of which 32 non-seed tables must be empty
before initialization. Seed exceptions remain exactly lnsat_schema_migrations,
lnsat_store_metadata and lnsat_retention_policies. Retention has exactly 32
preserve-only families; the new names are headless_active,
headless_config_audit, headless_generation and headless_installation.

The proposal adds nine named unique indexes:

- headless_installations_installation_id_idx
- headless_installations_store_instance_id_idx
- headless_installations_root_binding_idx
- headless_installations_first_generation_idx
- headless_installations_bootstrap_audit_idx
- headless_generations_sequence_idx
- headless_generations_pointer_binding_idx
- headless_config_audit_sequence_idx
- headless_config_audit_pointer_binding_idx

The ordinary-rowid TEXT primary keys additionally produce the proposed implicit
indexes sqlite_autoindex_headless_generations_1 and
sqlite_autoindex_headless_config_audit_1, with null SQL. Integer singleton
primary keys add no separate index. No view, virtual table, attached database,
temporary object, helper table or alternate namespace may remain.

Nine new triggers are required:

- headless_active_reject_delete
- headless_active_reject_regression
- headless_active_require_genesis
- headless_config_audit_reject_delete
- headless_config_audit_reject_update
- headless_generations_reject_delete
- headless_generations_reject_update
- headless_installations_reject_delete
- headless_installations_reject_update

The proposed delta is four tables, eleven indexes and nine triggers: 24 objects.
The existing 218-object schema would therefore become 242 objects, below B1's
256-object cap. These are static expectations, not observed SQLite output.
The future candidate tests must measure exact emitted object names and raw
SQL using the pinned bundled SQLite 3.53.2; any difference requires contract
reconciliation, not silent normalization or ignored objects. Recreated metadata
and retention have the same final names; their changed SQL is part of the new
full manifest. Existing Phase 7 schema checks remain mandatory.

## States and failure handling

The private schema verifier must check the complete ordered main-schema
manifest, including every explicit/implicit index and exact table/trigger SQL.
Reuse bounded tuples [type, name, tbl_name, sql-or-null] sorted by type/name,
256 objects, 65,536 bytes per SQL definition, 1,024 bytes per object identifier,
262,144 aggregate text bytes, main/temp namespace checks and no extra databases.
Use the new exact domain lnsat.headless_bootstrap.schema.v18 followed by LF.
The actual schema-manifest digest is UNSET_BLOCKING until permitted candidate
execution captures and independently verifies the pinned SQLite output.
The migration-text hash below is a different identity and cannot replace it.

Before any later registration, update the entire compiled table/trigger/index
and retention manifests, version dispatch, migration ledger expectation,
headless eligibility version/domain/hash and schema integrity checks together.
Do not use the existing normal schema verifier's table/trigger checks alone as
complete headless DDL/index verification. B1's schema-17 digest remains valid
only for its original schema-17 inspection; it is never relabeled as version 18.
Every added table is authority/evidence, not a new seed exception.

Selected-store custody and the installation-wide mutex precede migration and
bootstrap immediate transactions. B5 does not grant a writable connection;
future selected-write custody must retain actual SQLite main-descriptor and
lease identity. No OS mutation or native probe occurs inside SQL transactions.
Migration ledger row/version publication, exact post-write schema/seed checks
and foreign-key/integrity checks commit atomically or roll back. Only then may
separately prepared bootstrap evidence enter the larger owner/root transaction.
A lost commit result is unknown until exact held-store readback; no blind retry
or cleanup of existing evidence follows.

If migration succeeds but initialization never commits, all 32 authority tables
remain empty. The four new retention policies are metadata only. A failed
bootstrap leaves no owner/root/generation/audit/pointer unless the whole atomic
transaction committed. Partial, unsupported, copied or malformed state denies;
no fallback to a prior pointer, schema version, generation or audit head occurs.

## Data, privacy, and permissions

The SQL and schema manifests contain no credentials, live host paths, daemon
observations or production data. Future stored declaration/binding text is
sensitive; use B4's closed protected projections and bounded row reads, with
no generic row serializer or log. Immutable SQL history and local digests are
under the trusted host-owner boundary. They are not an external anti-rollback
anchor, FIPS validation, cryptographic-provider proof or government assurance.

## Compatibility and migration

Current product/wire/profile identifiers, schema 17, source fixtures and the
Phase 11 packet are unchanged. The candidate belongs only to the future
selected headless store, under the complete integration gate. Existing legacy
or official restored authority cannot acquire installation state through
migration. Optional signed-evidence SQL18 remains historical test-only source
and must target the then-current schema if its own later lane is opened.

Metadata and retention rebuilding is an explicit migration mechanic, not a
license to rewrite other legacy tables, weaken prior triggers, delete evidence
or apply historical signed SQL. Current B1/B2/B3B and ordinary-open behavior
remain unchanged by this design-only proposal.

## Acceptance mapping

- Static documentation evidence compares all 20/19/9/9 B4 column names and
  ordering, exact digest/null/text/counter caps, foreign-key parents, singleton
  and named-index/trigger sets. It does not execute or validate SQL syntax.
- Future permitted candidate tests apply only the exact migration under the
  selected private immediate transaction, with an empty schema-17 baseline;
  check exact 35-table/242-object output and independent v18 manifest digest.
- Insert a row into each of the 28 existing non-seed tables independently:
  migration must refuse before any lasting seed/headless change. Corrupted
  seed/schema, unknown objects, wrong namespaces or legacy signed SQL deny.
- Inject guard, metadata/retention, every table/index/trigger, ledger and
  precommit failures: the original schema17 and every original row remain.
- Future bootstrap uses structurally valid complete positive owner/root/genesis
  links, then injects all inserts, deferred-FK checks and commit failures to
  prove all-or-nothing state. A positive SQL fixture is not native proof.
- Mutate digest pairs, column types, UTF-8 byte caps, missing/nonmatching FKs,
  previous/null/genesis rules, unknown audit variants, pointer epoch/floor/root,
  stop-clear, generation rollback and audit-head order. SQL rejection or
  private-reader denial must occur before authority escapes.
- Source registration and candidate execution require the controlling
  source-order decision, exact integration contracts, focused pinned Rust,
  proportional broad checks, installed audits and independent source review.
  No such execution or source test result is claimed by this document.

## Non-goals and open questions

No migration file, registry entry, user_version change, live schema, new SQL
execution, selected write opener, current-state reader, initializer, candidate,
challenge, apply/stop writer, API or CLI is implemented. The actual pinned
SQLite manifest digest/object output, selected-write integration and later
closed audit/writer variants remain blocking parts of the full source freeze.
The pending source-order amendment retains its explicit human gate. Docker,
real kernel probes, host permission/config mutation, tool install, artifact/
image construction, merge, signing, release, deployment and production remain
closed. V1 and enterprise/government readiness remain incomplete.
