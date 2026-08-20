-- BP-0872 local operator and session storage.
-- Digest-only credentials/tokens for loopback disposable PostgreSQL.

CREATE TABLE local_operators (
  operator_id text PRIMARY KEY,
  credential_digest text NOT NULL,
  capabilities jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  disabled_at timestamptz,
  raw_credential_content text NOT NULL DEFAULT 'withheld',
  row_version integer NOT NULL DEFAULT 1,

  CONSTRAINT local_operators_id_shape CHECK (
    operator_id ~ '^operator\.[a-z0-9][a-z0-9._-]{7,95}$'
  ),
  CONSTRAINT local_operators_digest_shape CHECK (
    credential_digest ~ '^sha256:[a-f0-9]{64}$'
  ),
  CONSTRAINT local_operators_capabilities_non_empty CHECK (
    jsonb_typeof(capabilities) = 'array'
    AND jsonb_array_length(capabilities) > 0
  ),
  CONSTRAINT local_operators_raw_withheld CHECK (
    raw_credential_content = 'withheld'
  ),
  CONSTRAINT local_operators_disable_order CHECK (
    disabled_at IS NULL OR created_at <= disabled_at
  ),
  CONSTRAINT local_operators_version_positive CHECK (row_version > 0)
);

CREATE TABLE local_sessions (
  session_id text PRIMARY KEY,
  operator_id text NOT NULL,
  token_digest text NOT NULL,
  proof_digest text NOT NULL,
  capability_snapshot jsonb NOT NULL,
  issued_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  raw_token_content text NOT NULL DEFAULT 'withheld',
  row_version integer NOT NULL DEFAULT 1,

  CONSTRAINT local_sessions_operator_fk FOREIGN KEY (operator_id)
    REFERENCES local_operators(operator_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT local_sessions_token_unique UNIQUE (token_digest),
  CONSTRAINT local_sessions_id_shape CHECK (
    session_id ~ '^ses_[a-f0-9]{32}$'
  ),
  CONSTRAINT local_sessions_digest_shape CHECK (
    token_digest ~ '^sha256:[a-f0-9]{64}$'
  ),
  CONSTRAINT local_sessions_proof_digest_shape CHECK (
    proof_digest ~ '^sha256:[a-f0-9]{64}$'
  ),
  CONSTRAINT local_sessions_capabilities_non_empty CHECK (
    jsonb_typeof(capability_snapshot) = 'array'
    AND jsonb_array_length(capability_snapshot) > 0
  ),
  CONSTRAINT local_sessions_time_order CHECK (
    issued_at < expires_at
    AND expires_at <= issued_at + interval '1 hour'
    AND (revoked_at IS NULL OR issued_at <= revoked_at)
  ),
  CONSTRAINT local_sessions_raw_withheld CHECK (
    raw_token_content = 'withheld'
  ),
  CONSTRAINT local_sessions_version_positive CHECK (row_version > 0)
);

CREATE INDEX local_sessions_operator_id_idx
  ON local_sessions (operator_id);

CREATE INDEX local_sessions_active_expiry_idx
  ON local_sessions (expires_at)
  WHERE revoked_at IS NULL;
