CREATE TABLE lnsat_store_metadata_v9 (
  singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
  contract_version TEXT NOT NULL CHECK (
    contract_version = 'lnsat.contracts.v1_0'
  ),
  schema_version INTEGER NOT NULL CHECK (schema_version = 9),
  storage_kind TEXT NOT NULL CHECK (
    storage_kind = 'sqlite_single_node'
  )
) STRICT;

INSERT INTO lnsat_store_metadata_v9 (
  singleton,
  contract_version,
  schema_version,
  storage_kind
)
SELECT
  singleton,
  contract_version,
  9,
  storage_kind
FROM lnsat_store_metadata;

DROP TABLE lnsat_store_metadata;
ALTER TABLE lnsat_store_metadata_v9 RENAME TO lnsat_store_metadata;

CREATE TABLE lnsat_retention_policies_v9 (
  record_family TEXT PRIMARY KEY CHECK (
    record_family IN (
      'approval_decision',
      'approval_request',
      'audit_event',
      'audit_event_reason_code',
      'local_identity',
      'local_password_credential',
      'packet_envelope',
      'packet_resource_ref',
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

INSERT INTO lnsat_retention_policies_v9 (
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

INSERT INTO lnsat_retention_policies_v9 (
  record_family,
  retention_class,
  disposition,
  cleanup_eligible,
  minimum_retention_seconds
)
VALUES
  ('local_identity', 'control_plane', 'preserve', 0, NULL),
  ('local_password_credential', 'control_plane', 'preserve', 0, NULL);

DROP TABLE lnsat_retention_policies;
ALTER TABLE lnsat_retention_policies_v9 RENAME TO lnsat_retention_policies;

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

CREATE TABLE lnsat_local_identities (
  identity_ref TEXT PRIMARY KEY CHECK (
    length(identity_ref) BETWEEN 16 AND 128
    AND substr(identity_ref, 1, 15) = 'identity:human:'
  ),
  display_name TEXT NOT NULL CHECK (
    length(display_name) BETWEEN 1 AND 128
  ),
  role TEXT NOT NULL CHECK (
    role IN ('owner', 'operator', 'auditor')
  ),
  owner_singleton INTEGER UNIQUE CHECK (
    (role = 'owner' AND owner_singleton = 1)
    OR (role != 'owner' AND owner_singleton IS NULL)
  ),
  status TEXT NOT NULL CHECK (status = 'active'),
  created_at TEXT NOT NULL
) STRICT;

CREATE TRIGGER lnsat_local_identities_reject_update
BEFORE UPDATE ON lnsat_local_identities
BEGIN
  SELECT RAISE(ABORT, 'local identities are immutable');
END;

CREATE TRIGGER lnsat_local_identities_reject_delete
BEFORE DELETE ON lnsat_local_identities
BEGIN
  SELECT RAISE(ABORT, 'local identities are immutable');
END;

CREATE TABLE lnsat_local_password_credentials (
  credential_id TEXT PRIMARY KEY CHECK (
    length(credential_id) = 71
    AND substr(credential_id, 1, 7) = 'sha256:'
    AND substr(credential_id, 8) NOT GLOB '*[^0-9a-f]*'
  ),
  identity_ref TEXT NOT NULL,
  credential_version INTEGER NOT NULL CHECK (credential_version = 1),
  verifier_profile TEXT NOT NULL CHECK (
    verifier_profile = 'lnsat.argon2id.v1'
  ),
  password_verifier TEXT NOT NULL CHECK (
    length(password_verifier) BETWEEN 64 AND 512
    AND substr(password_verifier, 1, 31) = '$argon2id$v=19$m=19456,t=2,p=1$'
  ),
  created_at TEXT NOT NULL,
  UNIQUE (identity_ref, credential_version),
  FOREIGN KEY (identity_ref)
    REFERENCES lnsat_local_identities (identity_ref)
    ON UPDATE RESTRICT
    ON DELETE RESTRICT
) STRICT;

CREATE TRIGGER lnsat_local_password_credentials_reject_update
BEFORE UPDATE ON lnsat_local_password_credentials
BEGIN
  SELECT RAISE(ABORT, 'local password credentials are immutable');
END;

CREATE TRIGGER lnsat_local_password_credentials_reject_delete
BEFORE DELETE ON lnsat_local_password_credentials
BEGIN
  SELECT RAISE(ABORT, 'local password credentials are immutable');
END;
