-- BP-0871 local isolated synthetic beta control-plane schema.
-- Loopback disposable PostgreSQL only. No production/customer data.

CREATE TABLE control_plane_packets (
  packet_id text PRIMARY KEY,
  canonical_input_digest text NOT NULL,
  packet_body jsonb NOT NULL,
  policy_decision jsonb NOT NULL,
  workflow_status text NOT NULL,
  source_refs jsonb NOT NULL,
  created_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  raw_input_content text NOT NULL DEFAULT 'withheld',
  side_effects jsonb NOT NULL DEFAULT '[]'::jsonb,
  row_version integer NOT NULL DEFAULT 1,

  CONSTRAINT control_plane_packets_id_shape CHECK (
    packet_id ~ '^pkt_[a-z0-9][a-z0-9_-]{7,95}$'
  ),
  CONSTRAINT control_plane_packets_digest_shape CHECK (
    canonical_input_digest ~ '^sha256:[a-f0-9]{64}$'
  ),
  CONSTRAINT control_plane_packets_body_object CHECK (
    jsonb_typeof(packet_body) = 'object'
  ),
  CONSTRAINT control_plane_packets_policy_object CHECK (
    jsonb_typeof(policy_decision) = 'object'
  ),
  CONSTRAINT control_plane_packets_status_known CHECK (
    workflow_status IN (
      'approval_required',
      'approved',
      'denied',
      'executing',
      'executed',
      'failed',
      'expired'
    )
  ),
  CONSTRAINT control_plane_packets_sources_non_empty CHECK (
    jsonb_typeof(source_refs) = 'array' AND jsonb_array_length(source_refs) > 0
  ),
  CONSTRAINT control_plane_packets_time_order CHECK (
    created_at <= updated_at AND created_at < expires_at
  ),
  CONSTRAINT control_plane_packets_raw_withheld CHECK (
    raw_input_content = 'withheld'
  ),
  CONSTRAINT control_plane_packets_side_effects_array CHECK (
    jsonb_typeof(side_effects) = 'array'
  ),
  CONSTRAINT control_plane_packets_version_positive CHECK (row_version > 0)
);

CREATE TABLE control_plane_approvals (
  approval_id text PRIMARY KEY,
  packet_id text NOT NULL,
  approval_status text NOT NULL,
  requested_by text NOT NULL,
  decided_by text,
  reason_codes jsonb NOT NULL,
  requested_at timestamptz NOT NULL,
  decided_at timestamptz,
  expires_at timestamptz NOT NULL,
  row_version integer NOT NULL DEFAULT 1,

  CONSTRAINT control_plane_approvals_packet_unique UNIQUE (packet_id),
  CONSTRAINT control_plane_approvals_binding_unique UNIQUE (
    approval_id,
    packet_id,
    approval_status
  ),
  CONSTRAINT control_plane_approvals_packet_fk FOREIGN KEY (packet_id)
    REFERENCES control_plane_packets(packet_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,

  CONSTRAINT control_plane_approvals_id_shape CHECK (
    approval_id ~ '^apr_[a-z0-9][a-z0-9_-]{7,95}$'
  ),
  CONSTRAINT control_plane_approvals_status_known CHECK (
    approval_status IN ('requested', 'approved', 'denied', 'expired')
  ),
  CONSTRAINT control_plane_approvals_actor_bounds CHECK (
    length(requested_by) BETWEEN 1 AND 256
    AND (decided_by IS NULL OR length(decided_by) BETWEEN 1 AND 256)
  ),
  CONSTRAINT control_plane_approvals_reasons_array CHECK (
    jsonb_typeof(reason_codes) = 'array'
  ),
  CONSTRAINT control_plane_approvals_time_order CHECK (
    requested_at < expires_at
    AND (decided_at IS NULL OR requested_at <= decided_at)
  ),
  CONSTRAINT control_plane_approvals_decision_shape CHECK (
    (approval_status = 'requested' AND decided_by IS NULL AND decided_at IS NULL)
    OR
    (approval_status <> 'requested' AND decided_by IS NOT NULL AND decided_at IS NOT NULL)
  ),
  CONSTRAINT control_plane_approvals_version_positive CHECK (row_version > 0)
);

CREATE TABLE control_plane_executions (
  execution_id text PRIMARY KEY,
  packet_id text NOT NULL,
  approval_id text NOT NULL,
  approval_status text NOT NULL,
  adapter_ref text NOT NULL,
  execution_status text NOT NULL,
  input_digest text NOT NULL,
  result_evidence jsonb,
  side_effects jsonb NOT NULL DEFAULT '[]'::jsonb,
  started_at timestamptz NOT NULL,
  completed_at timestamptz,

  CONSTRAINT control_plane_executions_packet_unique UNIQUE (packet_id),
  CONSTRAINT control_plane_executions_approval_unique UNIQUE (approval_id),
  CONSTRAINT control_plane_executions_approval_binding_fk FOREIGN KEY (
    approval_id,
    packet_id,
    approval_status
  ) REFERENCES control_plane_approvals (
    approval_id,
    packet_id,
    approval_status
  ) ON UPDATE RESTRICT ON DELETE RESTRICT,

  CONSTRAINT control_plane_executions_id_shape CHECK (
    execution_id ~ '^exe_[a-z0-9][a-z0-9_-]{7,95}$'
  ),
  CONSTRAINT control_plane_executions_adapter_bound CHECK (
    adapter_ref = 'adapter.local.synthetic_deterministic.v0_1'
  ),
  CONSTRAINT control_plane_executions_approved_only CHECK (
    approval_status = 'approved'
  ),
  CONSTRAINT control_plane_executions_status_known CHECK (
    execution_status IN ('running', 'succeeded', 'failed')
  ),
  CONSTRAINT control_plane_executions_digest_shape CHECK (
    input_digest ~ '^sha256:[a-f0-9]{64}$'
  ),
  CONSTRAINT control_plane_executions_result_object CHECK (
    result_evidence IS NULL OR jsonb_typeof(result_evidence) = 'object'
  ),
  CONSTRAINT control_plane_executions_side_effects_array CHECK (
    jsonb_typeof(side_effects) = 'array'
  ),
  CONSTRAINT control_plane_executions_completion_shape CHECK (
    (execution_status = 'running' AND completed_at IS NULL AND result_evidence IS NULL)
    OR
    (execution_status <> 'running' AND completed_at IS NOT NULL AND result_evidence IS NOT NULL)
  ),
  CONSTRAINT control_plane_executions_time_order CHECK (
    completed_at IS NULL OR started_at <= completed_at
  )
);

CREATE FUNCTION enforce_control_plane_execution_authorization()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  packet_digest text;
  packet_status text;
  packet_created_at timestamptz;
  packet_expires_at timestamptz;
  approval_status_value text;
  approval_decided_at timestamptz;
  approval_expires_at timestamptz;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.execution_id IS DISTINCT FROM OLD.execution_id
      OR NEW.packet_id IS DISTINCT FROM OLD.packet_id
      OR NEW.approval_id IS DISTINCT FROM OLD.approval_id
      OR NEW.approval_status IS DISTINCT FROM OLD.approval_status
      OR NEW.adapter_ref IS DISTINCT FROM OLD.adapter_ref
      OR NEW.input_digest IS DISTINCT FROM OLD.input_digest
      OR NEW.started_at IS DISTINCT FROM OLD.started_at
    THEN
      RAISE EXCEPTION USING
        ERRCODE = '23514',
        MESSAGE = 'execution authorization fields are immutable';
    END IF;

    RETURN NEW;
  END IF;

  SELECT
    packet.canonical_input_digest,
    packet.workflow_status,
    packet.created_at,
    packet.expires_at,
    approval.approval_status,
    approval.decided_at,
    approval.expires_at
  INTO
    packet_digest,
    packet_status,
    packet_created_at,
    packet_expires_at,
    approval_status_value,
    approval_decided_at,
    approval_expires_at
  FROM control_plane_packets AS packet
  JOIN control_plane_approvals AS approval
    ON approval.packet_id = packet.packet_id
  WHERE packet.packet_id = NEW.packet_id
    AND approval.approval_id = NEW.approval_id
  FOR SHARE OF packet, approval;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING
      ERRCODE = '23503',
      MESSAGE = 'execution authorization binding missing';
  END IF;

  IF packet_status <> 'approved'
    OR approval_status_value <> 'approved'
    OR NEW.approval_status <> 'approved'
    OR NEW.input_digest <> packet_digest
    OR approval_decided_at IS NULL
    OR statement_timestamp() < packet_created_at
    OR statement_timestamp() < approval_decided_at
    OR statement_timestamp() >= packet_expires_at
    OR statement_timestamp() >= approval_expires_at
    OR NEW.started_at < packet_created_at
    OR NEW.started_at < approval_decided_at
    OR NEW.started_at >= packet_expires_at
    OR NEW.started_at >= approval_expires_at
  THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'execution authorization binding rejected';
  END IF;

  RETURN NEW;
END;
$function$;

CREATE TRIGGER control_plane_executions_authorization_trigger
BEFORE INSERT OR UPDATE ON control_plane_executions
FOR EACH ROW
EXECUTE FUNCTION enforce_control_plane_execution_authorization();

CREATE INDEX control_plane_packets_workflow_status_idx
  ON control_plane_packets (workflow_status, updated_at DESC);

CREATE INDEX control_plane_approvals_status_idx
  ON control_plane_approvals (approval_status, requested_at DESC);

CREATE INDEX control_plane_executions_status_idx
  ON control_plane_executions (execution_status, started_at DESC);
