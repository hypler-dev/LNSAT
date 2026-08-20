CREATE TABLE lnsat_schema_migrations (
  schema_version INTEGER PRIMARY KEY CHECK (schema_version > 0),
  migration_id TEXT NOT NULL UNIQUE,
  migration_sha256 TEXT NOT NULL UNIQUE,
  applied_order INTEGER NOT NULL UNIQUE CHECK (applied_order > 0)
) STRICT;

CREATE TABLE lnsat_store_metadata (
  singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
  contract_version TEXT NOT NULL CHECK (
    contract_version = 'lnsat.contracts.v1_0'
  ),
  schema_version INTEGER NOT NULL CHECK (schema_version = 1),
  storage_kind TEXT NOT NULL CHECK (
    storage_kind = 'sqlite_single_node'
  )
) STRICT;

INSERT INTO lnsat_store_metadata (
  singleton,
  contract_version,
  schema_version,
  storage_kind
) VALUES (
  1,
  'lnsat.contracts.v1_0',
  1,
  'sqlite_single_node'
);
