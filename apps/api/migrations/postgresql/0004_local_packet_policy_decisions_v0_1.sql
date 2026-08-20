-- BP-0876 immutable deterministic policy decisions for accepted local packets.

ALTER TABLE local_packet_intakes
  ADD CONSTRAINT local_packet_intakes_digest_binding_unique
  UNIQUE (packet_id, packet_digest);

CREATE TABLE local_packet_policy_decisions (
  decision_id text PRIMARY KEY,
  packet_id text NOT NULL UNIQUE,
  packet_digest text NOT NULL,
  policy_decision jsonb NOT NULL,
  decision_kind text NOT NULL,
  requires_approval boolean NOT NULL,
  reason_codes jsonb NOT NULL,
  operator_id text NOT NULL,
  authenticated_session_id text NOT NULL,
  policy_created_at timestamptz NOT NULL,
  evaluated_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  raw_input_content text NOT NULL DEFAULT 'withheld',
  side_effects jsonb NOT NULL DEFAULT '[]'::jsonb,
  row_version integer NOT NULL DEFAULT 1,

  CONSTRAINT local_packet_policy_decisions_packet_digest_fk FOREIGN KEY (
    packet_id,
    packet_digest
  ) REFERENCES local_packet_intakes (
    packet_id,
    packet_digest
  ) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT local_packet_policy_decisions_operator_fk FOREIGN KEY (operator_id)
    REFERENCES local_operators(operator_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT local_packet_policy_decisions_session_fk FOREIGN KEY (
    authenticated_session_id
  ) REFERENCES local_sessions(session_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT local_packet_policy_decisions_id_shape CHECK (
    decision_id ~ '^pol_[a-z0-9][a-z0-9_-]{7,95}$'
  ),
  CONSTRAINT local_packet_policy_decisions_packet_id_shape CHECK (
    packet_id ~ '^pkt_[a-z0-9][a-z0-9_-]{7,63}$'
  ),
  CONSTRAINT local_packet_policy_decisions_digest_shape CHECK (
    packet_digest ~ '^sha256:[a-f0-9]{64}$'
  ),
  CONSTRAINT local_packet_policy_decisions_body_object CHECK (
    jsonb_typeof(policy_decision) = 'object'
  ),
  CONSTRAINT local_packet_policy_decisions_body_binding CHECK (
    policy_decision ->> 'decision_id' = decision_id
    AND policy_decision ->> 'packet_id' = packet_id
    AND policy_decision ->> 'decision' = decision_kind
    AND (policy_decision ->> 'requires_approval')::boolean = requires_approval
    AND policy_decision -> 'reason_codes' = reason_codes
  ),
  CONSTRAINT local_packet_policy_decisions_kind_known CHECK (
    decision_kind IN ('allow', 'deny', 'approval_required')
  ),
  CONSTRAINT local_packet_policy_decisions_approval_binding CHECK (
    requires_approval = (decision_kind = 'approval_required')
  ),
  CONSTRAINT local_packet_policy_decisions_reasons_array CHECK (
    jsonb_typeof(reason_codes) = 'array'
  ),
  CONSTRAINT local_packet_policy_decisions_operator_shape CHECK (
    operator_id ~ '^operator\.[a-z0-9][a-z0-9._-]{7,95}$'
  ),
  CONSTRAINT local_packet_policy_decisions_session_shape CHECK (
    authenticated_session_id ~ '^ses_[a-f0-9]{32}$'
  ),
  CONSTRAINT local_packet_policy_decisions_time_order CHECK (
    policy_created_at <= evaluated_at
  ),
  CONSTRAINT local_packet_policy_decisions_raw_withheld CHECK (
    raw_input_content = 'withheld'
  ),
  CONSTRAINT local_packet_policy_decisions_side_effects_empty CHECK (
    side_effects = '[]'::jsonb
  ),
  CONSTRAINT local_packet_policy_decisions_version_fixed CHECK (row_version = 1)
);

CREATE FUNCTION enforce_local_packet_policy_decision_authorization()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM 1
  FROM local_sessions AS session
  JOIN local_operators AS operator
    ON operator.operator_id = session.operator_id
  JOIN local_packet_intakes AS intake
    ON intake.packet_id = NEW.packet_id
   AND intake.packet_digest = NEW.packet_digest
  WHERE session.session_id = NEW.authenticated_session_id
    AND session.operator_id = NEW.operator_id
    AND intake.operator_id = NEW.operator_id
    AND operator.disabled_at IS NULL
    AND session.revoked_at IS NULL
    AND statement_timestamp() >= session.issued_at
    AND statement_timestamp() < session.expires_at
    AND session.capability_snapshot @> '["control_plane.packet.policy.evaluate"]'::jsonb
  FOR SHARE OF session, operator, intake;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'local packet policy authorization rejected'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

CREATE FUNCTION reject_local_packet_policy_decision_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'local packet policy decisions are immutable'
    USING ERRCODE = '55000';
END;
$$;

CREATE TRIGGER local_packet_policy_decisions_authorization_trigger
BEFORE INSERT ON local_packet_policy_decisions
FOR EACH ROW
EXECUTE FUNCTION enforce_local_packet_policy_decision_authorization();

CREATE TRIGGER local_packet_policy_decisions_immutable_trigger
BEFORE UPDATE OR DELETE ON local_packet_policy_decisions
FOR EACH ROW
EXECUTE FUNCTION reject_local_packet_policy_decision_mutation();

CREATE INDEX local_packet_policy_decisions_kind_idx
  ON local_packet_policy_decisions (decision_kind, evaluated_at);

CREATE INDEX local_packet_policy_decisions_operator_id_idx
  ON local_packet_policy_decisions (operator_id, evaluated_at);
