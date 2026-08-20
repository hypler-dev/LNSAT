-- BP-0875 immutable synthetic packet intake for the loopback local beta.

CREATE TABLE local_packet_intakes (
  packet_id text PRIMARY KEY,
  packet_digest text NOT NULL,
  packet_type text NOT NULL,
  canonical_packet jsonb NOT NULL,
  intake_status text NOT NULL DEFAULT 'accepted',
  operator_id text NOT NULL,
  authenticated_session_id text NOT NULL,
  accepted_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  raw_input_content text NOT NULL DEFAULT 'withheld',
  side_effects jsonb NOT NULL DEFAULT '[]'::jsonb,
  row_version integer NOT NULL DEFAULT 1,

  CONSTRAINT local_packet_intakes_operator_fk FOREIGN KEY (operator_id)
    REFERENCES local_operators(operator_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT local_packet_intakes_session_fk FOREIGN KEY (authenticated_session_id)
    REFERENCES local_sessions(session_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT local_packet_intakes_id_shape CHECK (
    packet_id ~ '^pkt_[a-z0-9][a-z0-9_-]{7,63}$'
  ),
  CONSTRAINT local_packet_intakes_digest_shape CHECK (
    packet_digest ~ '^sha256:[a-f0-9]{64}$'
  ),
  CONSTRAINT local_packet_intakes_type_known CHECK (
    packet_type IN (
      'ContextPacket',
      'CapabilityPacket',
      'ExecutionPacket',
      'EnvironmentPacket',
      'ResourcePacket',
      'ResultPacket',
      'AuditPacket',
      'PatchPacket',
      'SecretUsePacket',
      'NodeTelemetryPacket'
    )
  ),
  CONSTRAINT local_packet_intakes_body_object CHECK (
    jsonb_typeof(canonical_packet) = 'object'
  ),
  CONSTRAINT local_packet_intakes_body_binding CHECK (
    canonical_packet ->> 'packet_id' = packet_id
    AND canonical_packet ->> 'packet_type' = packet_type
  ),
  CONSTRAINT local_packet_intakes_synthetic_only CHECK (
    canonical_packet #>> '{constraints,synthetic}' = 'true'
  ),
  CONSTRAINT local_packet_intakes_status_known CHECK (
    intake_status = 'accepted'
  ),
  CONSTRAINT local_packet_intakes_operator_shape CHECK (
    operator_id ~ '^operator\.[a-z0-9][a-z0-9._-]{7,95}$'
  ),
  CONSTRAINT local_packet_intakes_session_shape CHECK (
    authenticated_session_id ~ '^ses_[a-f0-9]{32}$'
  ),
  CONSTRAINT local_packet_intakes_raw_withheld CHECK (
    raw_input_content = 'withheld'
  ),
  CONSTRAINT local_packet_intakes_side_effects_empty CHECK (
    side_effects = '[]'::jsonb
  ),
  CONSTRAINT local_packet_intakes_version_fixed CHECK (row_version = 1)
);

CREATE FUNCTION enforce_local_packet_intake_authorization()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM 1
  FROM local_sessions AS session
  JOIN local_operators AS operator
    ON operator.operator_id = session.operator_id
  WHERE session.session_id = NEW.authenticated_session_id
    AND session.operator_id = NEW.operator_id
    AND operator.disabled_at IS NULL
    AND session.revoked_at IS NULL
    AND statement_timestamp() >= session.issued_at
    AND statement_timestamp() < session.expires_at
    AND session.capability_snapshot @> '["control_plane.packet.submit"]'::jsonb
  FOR SHARE OF session, operator;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'local packet intake authorization rejected'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

CREATE FUNCTION reject_local_packet_intake_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'local packet intake rows are immutable'
    USING ERRCODE = '55000';
END;
$$;

CREATE TRIGGER local_packet_intakes_authorization_trigger
BEFORE INSERT ON local_packet_intakes
FOR EACH ROW
EXECUTE FUNCTION enforce_local_packet_intake_authorization();

CREATE TRIGGER local_packet_intakes_immutable_trigger
BEFORE UPDATE OR DELETE ON local_packet_intakes
FOR EACH ROW
EXECUTE FUNCTION reject_local_packet_intake_mutation();

CREATE INDEX local_packet_intakes_operator_id_idx
  ON local_packet_intakes (operator_id, accepted_at);

CREATE INDEX local_packet_intakes_session_id_idx
  ON local_packet_intakes (authenticated_session_id);
