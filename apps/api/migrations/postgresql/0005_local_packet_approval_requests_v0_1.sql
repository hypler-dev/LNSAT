-- BP-0877 immutable pending approval requests for reviewable local packets.

ALTER TABLE local_packet_policy_decisions
  ADD CONSTRAINT local_policy_decisions_approval_request_key
  UNIQUE (
    decision_id,
    packet_id,
    packet_digest,
    decision_kind,
    requires_approval
  );

CREATE TABLE local_packet_approval_requests (
  approval_request_id text PRIMARY KEY,
  packet_id text NOT NULL UNIQUE,
  packet_digest text NOT NULL,
  policy_decision_id text NOT NULL UNIQUE,
  decision_kind text NOT NULL DEFAULT 'approval_required',
  requires_approval boolean NOT NULL DEFAULT true,
  request_status text NOT NULL DEFAULT 'pending',
  requested_action text NOT NULL,
  reason_codes jsonb NOT NULL,
  operator_id text NOT NULL,
  authenticated_session_id text NOT NULL,
  requested_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  raw_input_content text NOT NULL DEFAULT 'withheld',
  side_effects jsonb NOT NULL DEFAULT '[]'::jsonb,
  row_version integer NOT NULL DEFAULT 1,

  CONSTRAINT local_packet_approval_requests_policy_fk FOREIGN KEY (
    policy_decision_id,
    packet_id,
    packet_digest,
    decision_kind,
    requires_approval
  ) REFERENCES local_packet_policy_decisions (
    decision_id,
    packet_id,
    packet_digest,
    decision_kind,
    requires_approval
  ) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT local_packet_approval_requests_operator_fk FOREIGN KEY (operator_id)
    REFERENCES local_operators(operator_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT local_packet_approval_requests_session_fk FOREIGN KEY (
    authenticated_session_id
  ) REFERENCES local_sessions(session_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT local_packet_approval_requests_id_shape CHECK (
    approval_request_id ~ '^apr_[a-f0-9]{32}$'
  ),
  CONSTRAINT local_packet_approval_requests_packet_shape CHECK (
    packet_id ~ '^pkt_[a-z0-9][a-z0-9_-]{7,63}$'
  ),
  CONSTRAINT local_packet_approval_requests_digest_shape CHECK (
    packet_digest ~ '^sha256:[a-f0-9]{64}$'
  ),
  CONSTRAINT local_packet_approval_requests_decision_shape CHECK (
    policy_decision_id ~ '^pol_[a-z0-9][a-z0-9_-]{7,95}$'
  ),
  CONSTRAINT local_packet_approval_requests_policy_required CHECK (
    decision_kind = 'approval_required' AND requires_approval = true
  ),
  CONSTRAINT local_packet_approval_requests_status_pending CHECK (
    request_status = 'pending'
  ),
  CONSTRAINT local_packet_approval_requests_action_fixed CHECK (
    requested_action = 'packet.approve'
  ),
  CONSTRAINT local_packet_approval_requests_reasons_array CHECK (
    jsonb_typeof(reason_codes) = 'array'
    AND jsonb_array_length(reason_codes) BETWEEN 1 AND 16
  ),
  CONSTRAINT local_packet_approval_requests_operator_shape CHECK (
    operator_id ~ '^operator\.[a-z0-9][a-z0-9._-]{7,95}$'
  ),
  CONSTRAINT local_packet_approval_requests_session_shape CHECK (
    authenticated_session_id ~ '^ses_[a-f0-9]{32}$'
  ),
  CONSTRAINT local_packet_approval_requests_raw_withheld CHECK (
    raw_input_content = 'withheld'
  ),
  CONSTRAINT local_packet_approval_requests_side_effects_empty CHECK (
    side_effects = '[]'::jsonb
  ),
  CONSTRAINT local_packet_approval_requests_version_fixed CHECK (row_version = 1)
);

CREATE FUNCTION enforce_local_packet_approval_request_authorization()
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
  JOIN local_packet_policy_decisions AS decision
    ON decision.decision_id = NEW.policy_decision_id
   AND decision.packet_id = NEW.packet_id
   AND decision.packet_digest = NEW.packet_digest
   AND decision.operator_id = NEW.operator_id
   AND decision.decision_kind = NEW.decision_kind
   AND decision.requires_approval = NEW.requires_approval
  WHERE session.session_id = NEW.authenticated_session_id
    AND session.operator_id = NEW.operator_id
    AND intake.operator_id = NEW.operator_id
    AND intake.intake_status = 'accepted'
    AND decision.reason_codes = NEW.reason_codes
    AND operator.disabled_at IS NULL
    AND session.revoked_at IS NULL
    AND statement_timestamp() >= session.issued_at
    AND statement_timestamp() < session.expires_at
    AND session.capability_snapshot @> '["control_plane.packet.approval.request"]'::jsonb
  FOR SHARE OF session, operator, intake, decision;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'local packet approval request authorization rejected'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

CREATE FUNCTION reject_local_packet_approval_request_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'local packet approval requests are immutable'
    USING ERRCODE = '55000';
END;
$$;

CREATE TRIGGER local_packet_approval_requests_authorization_trigger
BEFORE INSERT ON local_packet_approval_requests
FOR EACH ROW
EXECUTE FUNCTION enforce_local_packet_approval_request_authorization();

CREATE TRIGGER local_packet_approval_requests_immutable_trigger
BEFORE UPDATE OR DELETE ON local_packet_approval_requests
FOR EACH ROW
EXECUTE FUNCTION reject_local_packet_approval_request_mutation();

CREATE INDEX local_packet_approval_requests_operator_idx
  ON local_packet_approval_requests (operator_id, requested_at);

CREATE INDEX local_packet_approval_requests_status_idx
  ON local_packet_approval_requests (request_status, requested_at);
