-- BP-0044 source-reviewed draft for audit_events.v0_1.
-- No live execution is approved by this artifact.
-- Future execution requires BP-0039 writer.migrate policy gate evidence and
-- BP-0040 approval request evidence.

CREATE TABLE audit_events (
  ledger_record_id text NOT NULL,
  event_id text NOT NULL,
  event_type text NOT NULL,
  result_status text NOT NULL,
  actor_ref text,
  session_ref text,
  packet_ref jsonb,
  policy_ref jsonb,
  approval_ref jsonb,
  adapter_ref jsonb,
  resource_refs jsonb NOT NULL,
  capability text,
  risk_level integer,
  source_refs jsonb NOT NULL,
  reason_codes jsonb NOT NULL,
  redaction jsonb NOT NULL,
  idempotency_key text NOT NULL,
  canonical_record_digest text NOT NULL,
  created_at timestamptz NOT NULL,
  observed_at timestamptz NOT NULL,
  retention_class text NOT NULL,
  side_effects jsonb NOT NULL,
  schema_version text NOT NULL DEFAULT 'audit_events.v0_1',
  inserted_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT audit_events_pkey PRIMARY KEY (ledger_record_id),
  CONSTRAINT audit_events_event_id_key UNIQUE (event_id),
  CONSTRAINT audit_events_idempotency_key_key UNIQUE (idempotency_key),
  CONSTRAINT audit_events_ledger_record_id_shape CHECK (
    ledger_record_id ~ '^alr_[a-z0-9][a-z0-9_-]{7,95}$'
  ),
  CONSTRAINT audit_events_event_id_shape CHECK (
    event_id ~ '^evt_[a-z0-9][a-z0-9_-]{7,180}$'
  ),
  CONSTRAINT audit_events_event_type_known CHECK (
    event_type IN (
      'packet_validated',
      'packet_rejected',
      'policy_checked',
      'context_packet_compiled',
      'context_packet_inspection_rejected',
      'gateway_request_rejected',
      'mcp_adapter_request_rejected',
      'approval_requested',
      'approval_granted',
      'approval_denied',
      'adapter_call_requested',
      'adapter_call_completed',
      'adapter_failed'
    )
  ),
  CONSTRAINT audit_events_result_status_known CHECK (
    result_status IN (
      'success',
      'failure',
      'allow',
      'deny',
      'approval_required'
    )
  ),
  CONSTRAINT audit_events_packet_ref_object CHECK (
    packet_ref IS NULL OR jsonb_typeof(packet_ref) = 'object'
  ),
  CONSTRAINT audit_events_policy_ref_object CHECK (
    policy_ref IS NULL OR jsonb_typeof(policy_ref) = 'object'
  ),
  CONSTRAINT audit_events_approval_ref_object CHECK (
    approval_ref IS NULL OR jsonb_typeof(approval_ref) = 'object'
  ),
  CONSTRAINT audit_events_adapter_ref_object CHECK (
    adapter_ref IS NULL OR jsonb_typeof(adapter_ref) = 'object'
  ),
  CONSTRAINT audit_events_resource_refs_array CHECK (
    jsonb_typeof(resource_refs) = 'array'
  ),
  CONSTRAINT audit_events_source_refs_non_empty_array CHECK (
    jsonb_typeof(source_refs) = 'array' AND jsonb_array_length(source_refs) > 0
  ),
  CONSTRAINT audit_events_reason_codes_array CHECK (
    jsonb_typeof(reason_codes) = 'array'
  ),
  CONSTRAINT audit_events_redaction_object CHECK (
    jsonb_typeof(redaction) = 'object'
  ),
  CONSTRAINT audit_events_redaction_required_states CHECK (
    redaction ? 'raw_rejected_command'
    AND redaction ? 'raw_rejected_value'
    AND redaction ? 'raw_invalid_payload_content'
    AND redaction ? 'secret_like_values'
    AND redaction ->> 'raw_rejected_command' IN ('not_present', 'withheld')
    AND redaction ->> 'raw_rejected_value' IN ('not_present', 'withheld')
    AND redaction ->> 'raw_invalid_payload_content' IN (
      'not_present',
      'withheld'
    )
    AND redaction ->> 'secret_like_values' IN ('not_present', 'withheld')
  ),
  CONSTRAINT audit_events_idempotency_key_shape CHECK (
    idempotency_key ~ '^audit:[a-z0-9_]+:[a-z0-9_:.@/-]+$'
  ),
  CONSTRAINT audit_events_canonical_record_digest_shape CHECK (
    canonical_record_digest ~ '^sha256:[a-f0-9]{64}$'
  ),
  CONSTRAINT audit_events_risk_level_range CHECK (
    risk_level IS NULL OR risk_level BETWEEN 0 AND 8
  ),
  CONSTRAINT audit_events_retention_class_known CHECK (
    retention_class IN (
      'control_plane',
      'inspection',
      'preview',
      'security',
      'debug'
    )
  ),
  CONSTRAINT audit_events_side_effects_array CHECK (
    jsonb_typeof(side_effects) = 'array'
  ),
  CONSTRAINT audit_events_schema_version_v0_1 CHECK (
    schema_version = 'audit_events.v0_1'
  )
);
