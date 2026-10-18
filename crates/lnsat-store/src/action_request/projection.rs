//! Bounded, read-only projection of evidence linked to one action request.

use super::{ActionRequestErrorV1, ActionRequestEvaluationV1, ActionRequestRootV1};
use lnsat_contracts::{
    canonical_utc_timestamp_millis_v1, parse_execution_proposal_v1, parse_packet_envelope_v1,
};
use rusqlite::{Connection, named_params};
use serde_json::{Map, Value, json};
use std::collections::BTreeMap;

const KIND_LIMIT: usize = 64;
const QUERY_ROW_LIMIT: usize = 513;

/// Reads every public-safe linked record with one bounded SQL statement.
///
/// Intake commitments are deliberately not compared with Phase 7 execution
/// commitments: they use distinct domains and do not grant execution authority.
#[allow(clippy::too_many_lines)] // Keep bounded row collection and whole-record rejection together.
pub(super) fn project(
    connection: &Connection,
    root: &ActionRequestRootV1,
    evaluation: &ActionRequestEvaluationV1,
) -> Result<Value, ActionRequestErrorV1> {
    let policy_decision_id = evaluation.policy_decision_id.as_deref();
    let mut statement = connection
        .prepare(PROJECTION_SQL)
        .map_err(|_| ActionRequestErrorV1::PersistenceFailed)?;
    let mut rows = statement
        .query(named_params! {
            ":request_id": &root.request_id,
            ":requester_ref": &root.requester_ref,
            ":session_id": &root.session_id,
            ":project_ref": &root.project_ref,
            ":resource_ref": &root.resource_ref,
            ":idempotency_key": &root.idempotency_key,
            ":packet_id": &root.packet_id,
            ":packet_sha256": &root.packet_sha256,
            ":action_digest": &root.action_digest,
            ":target_digest": &root.target_digest,
            ":configuration_digest": &root.configuration_digest,
            ":created_at": &root.created_at,
            ":root_evidence_digest": &root.evidence_digest,
            ":evaluation_status": &evaluation.status,
            ":policy_decision_id": policy_decision_id,
            ":reason_code": &evaluation.reason_code,
            ":recorded_at": &evaluation.recorded_at,
            ":evaluation_evidence_digest": &evaluation.evidence_digest,
        })
        .map_err(|_| ActionRequestErrorV1::PersistenceFailed)?;

    let mut grouped = BTreeMap::<String, Vec<Value>>::new();
    let mut row_count = 0_usize;
    let mut encoded_bytes = 0_usize;
    let mut private_policy_seen = false;
    while let Some(row) = rows
        .next()
        .map_err(|_| ActionRequestErrorV1::PersistenceFailed)?
    {
        row_count += 1;
        if row_count >= QUERY_ROW_LIMIT {
            return Err(ActionRequestErrorV1::ResponseLimit);
        }
        let kind = row
            .get::<_, String>(0)
            .map_err(|_| ActionRequestErrorV1::PersistenceFailed)?;
        let payload = row
            .get::<_, String>(2)
            .map_err(|_| ActionRequestErrorV1::PersistenceFailed)?;
        if kind == "response_limit" {
            return Err(ActionRequestErrorV1::ResponseLimit);
        }
        if kind == "invalid" {
            return Err(ActionRequestErrorV1::EvidenceDrift);
        }
        let value: Value =
            serde_json::from_str(&payload).map_err(|_| ActionRequestErrorV1::EvidenceDrift)?;
        if kind == "private_policy" {
            if private_policy_seen {
                return Err(ActionRequestErrorV1::EvidenceDrift);
            }
            validate_private_policy(&value, root, evaluation)?;
            private_policy_seen = true;
            continue;
        }
        encoded_bytes = encoded_bytes
            .checked_add(payload.len())
            .ok_or(ActionRequestErrorV1::ResponseLimit)?;
        if encoded_bytes > 65_536 {
            return Err(ActionRequestErrorV1::ResponseLimit);
        }
        validate_value(&kind, &value)?;
        let entries = grouped.entry(kind).or_default();
        entries.push(value);
        if entries.len() > KIND_LIMIT {
            return Err(ActionRequestErrorV1::ResponseLimit);
        }
    }
    drop(rows);
    drop(statement);

    if !private_policy_seen {
        return Err(ActionRequestErrorV1::EvidenceDrift);
    }
    validate_state_lineage(
        grouped.get("states").map(Vec::as_slice).unwrap_or_default(),
        grouped
            .get("authorizations")
            .map(Vec::as_slice)
            .unwrap_or_default(),
        grouped
            .get("operations")
            .map(Vec::as_slice)
            .unwrap_or_default(),
        grouped
            .get("consumptions")
            .map(Vec::as_slice)
            .unwrap_or_default(),
        grouped
            .get("operation_attempts")
            .map(Vec::as_slice)
            .unwrap_or_default(),
        grouped
            .get("receipts")
            .map(Vec::as_slice)
            .unwrap_or_default(),
    )?;
    let policy = take_singleton(&mut grouped, "policy")?.unwrap_or(Value::Null);
    Ok(json!({
        "schema": "lnsat.action_request_linked_evidence.v1",
        "policy": policy,
        "approvals": take_many(&mut grouped, "approvals"),
        "approval_decisions": take_many(&mut grouped, "approval_decisions"),
        "authorization_attempts": take_many(&mut grouped, "authorization_attempts"),
        "authorizations": take_many(&mut grouped, "authorizations"),
        "operations": take_many(&mut grouped, "operations"),
        "consumptions": take_many(&mut grouped, "consumptions"),
        "operation_attempts": take_many(&mut grouped, "operation_attempts"),
        "receipts": take_many(&mut grouped, "receipts"),
        "reconciliations": take_many(&mut grouped, "reconciliations"),
        "states": take_many(&mut grouped, "states"),
    }))
}

fn validate_private_policy(
    value: &Value,
    root: &ActionRequestRootV1,
    evaluation: &ActionRequestEvaluationV1,
) -> Result<(), ActionRequestErrorV1> {
    let object = value
        .as_object()
        .ok_or(ActionRequestErrorV1::EvidenceDrift)?;
    let canonical_packet = field(object, "canonical_packet")?;
    let packet = parse_packet_envelope_v1(canonical_packet.as_bytes())
        .map_err(|_| ActionRequestErrorV1::EvidenceDrift)?;
    let proposal =
        parse_execution_proposal_v1(&packet).map_err(|_| ActionRequestErrorV1::EvidenceDrift)?;
    let canonical = super::canonicalize_packet_envelope_v1(&packet)
        .map_err(|_| ActionRequestErrorV1::EvidenceDrift)?;
    let expected_hash =
        super::hash_packet_envelope_v1(&packet).map_err(|_| ActionRequestErrorV1::EvidenceDrift)?;
    let expected = super::decide_packet_envelope_policy_v1(&packet, &evaluation.recorded_at)
        .map_err(|_| ActionRequestErrorV1::EvidenceDrift)?;
    let requires_approval = object.get("requires_approval").and_then(Value::as_i64);
    if canonical != canonical_packet
        || packet.packet_id != root.packet_id
        || packet.actor_ref != root.requester_ref
        || packet.session_ref != format!("session:local:{}", root.session_id)
        || packet.idempotency_key != root.idempotency_key
        || packet.project_ref != root.project_ref
        || proposal.target.resource_ref != root.resource_ref
        || super::digest(
            "lnsat.action_request.action.v1",
            &json!({"kind":&proposal.action.kind,"arguments":&proposal.action.arguments}),
        )? != root.action_digest
        || super::digest(
            "lnsat.action_request.target.v1",
            &json!({"resource_ref":&proposal.target.resource_ref,"identity":&proposal.target.identity}),
        )? != root.target_digest
        || proposal.configuration_digest != root.configuration_digest
        || expected_hash != root.packet_sha256
        || expected.decision_id != evaluation.policy_decision_id.as_deref().unwrap_or_default()
        || expected.packet_ref.packet_hash != root.packet_sha256
        || expected.project_ref != root.project_ref
        || expected.decision.as_str() != field(object, "decision")?
        || expected.evaluated_at != field(object, "evaluated_at")?
        || expected.expires_at != field(object, "expires_at")?
        || requires_approval != Some(i64::from(expected.requires_approval))
    {
        return Err(ActionRequestErrorV1::EvidenceDrift);
    }
    Ok(())
}

fn take_many(grouped: &mut BTreeMap<String, Vec<Value>>, kind: &str) -> Vec<Value> {
    grouped.remove(kind).unwrap_or_default()
}

fn take_singleton(
    grouped: &mut BTreeMap<String, Vec<Value>>,
    kind: &str,
) -> Result<Option<Value>, ActionRequestErrorV1> {
    let mut values = grouped.remove(kind).unwrap_or_default();
    match values.len() {
        0 => Ok(None),
        1 => Ok(values.pop()),
        _ => Err(ActionRequestErrorV1::EvidenceDrift),
    }
}

#[allow(clippy::too_many_lines)] // One closed field/state allowlist for each public evidence family.
fn validate_value(kind: &str, value: &Value) -> Result<(), ActionRequestErrorV1> {
    let object = value
        .as_object()
        .ok_or(ActionRequestErrorV1::EvidenceDrift)?;
    let id = |name: &str, prefix: &str| -> Result<bool, ActionRequestErrorV1> {
        Ok(canonical_id(field(object, name)?, prefix))
    };
    let timestamp = |name: &str| -> Result<bool, ActionRequestErrorV1> {
        Ok(canonical_timestamp(field(object, name)?))
    };
    let digest = |name: &str| -> Result<bool, ActionRequestErrorV1> {
        Ok(canonical_digest(field(object, name)?))
    };
    let optional_id = |name: &str, prefix: &str| match object.get(name) {
        Some(Value::Null) => true,
        Some(Value::String(value)) => canonical_id(value, prefix),
        _ => false,
    };
    let optional_digest = |name: &str| match object.get(name) {
        Some(Value::Null) => true,
        Some(Value::String(value)) => canonical_digest(value),
        _ => false,
    };
    let valid = match kind {
        "policy" => {
            id("decision_id", "pol_")?
                && timestamp("evaluated_at")?
                && timestamp("expires_at")?
                && matches!(
                    field(object, "decision")?,
                    "allow" | "deny" | "approval_required"
                )
                && matches!(
                    (
                        field(object, "decision")?,
                        object.get("requires_approval").and_then(Value::as_i64)
                    ),
                    ("approval_required", Some(1)) | ("allow" | "deny", Some(0))
                )
        }
        "approvals" => {
            id("approval_request_id", "apr_")?
                && id("policy_decision_id", "pol_")?
                && timestamp("requested_at")?
                && timestamp("expires_at")?
                && field(object, "status")? == "requested"
        }
        "approval_decisions" => {
            id("approval_decision_id", "apd_")?
                && id("approval_request_id", "apr_")?
                && id("policy_decision_id", "pol_")?
                && timestamp("decided_at")?
                && timestamp("expires_at")?
                && matches!(field(object, "decision")?, "approved" | "denied")
                && matches!(
                    field(object, "reason")?,
                    "approval.operator_approved"
                        | "approval.operator_denied"
                        | "approval.scope_rejected"
                        | "approval.evidence_insufficient"
                        | "approval.request_superseded"
                )
                && matches!(
                    (
                        field(object, "decision")?,
                        field(object, "reason")?,
                        object
                            .get("approval_gate_satisfied")
                            .and_then(Value::as_i64)
                    ),
                    ("approved", "approval.operator_approved", Some(1))
                        | (
                            "denied",
                            "approval.operator_denied"
                                | "approval.scope_rejected"
                                | "approval.evidence_insufficient"
                                | "approval.request_superseded",
                            Some(0)
                        )
                )
        }
        "authorization_attempts" => {
            id("authorization_attempt_id", "aat_")?
                && id("approval_decision_id", "apd_")?
                && id("approval_request_id", "apr_")?
                && id("policy_decision_id", "pol_")?
                && timestamp("requested_at")?
                && timestamp("expires_at")?
                && matches!(
                    field(object, "result_status")?,
                    "persistence_prepared" | "rejected" | "failed"
                )
        }
        "authorizations" => {
            id("authorization_id", "xau_")?
                && id("authorization_attempt_id", "aat_")?
                && id("approval_decision_id", "apd_")?
                && id("policy_decision_id", "pol_")?
                && timestamp("issued_at")?
                && timestamp("expires_at")?
        }
        "operations" => {
            id("operation_id", "opn_")?
                && id("authorization_id", "xau_")?
                && timestamp("created_at")?
                && timestamp("expires_at")?
        }
        "consumptions" => {
            id("consumption_id", "cpc_")?
                && id("authorization_id", "xau_")?
                && id("operation_id", "opn_")?
                && timestamp("consumed_at")?
        }
        "operation_attempts" => {
            id("operation_attempt_id", "opa_")?
                && id("operation_id", "opn_")?
                && timestamp("created_at")?
                && object
                    .get("attempt_sequence")
                    .and_then(Value::as_i64)
                    .is_some_and(|value| (1..=64).contains(&value))
        }
        "receipts" => {
            id("receipt_id", "rcp_")?
                && id("operation_id", "opn_")?
                && id("operation_attempt_id", "opa_")?
                && id("authorization_id", "xau_")?
                && id("consumption_id", "cpc_")?
                && timestamp("received_at")?
                && digest("result_digest")?
                && field(object, "verification_status")? == "accepted"
        }
        "reconciliations" => {
            id("reconciliation_id", "rec_")?
                && id("operation_id", "opn_")?
                && id("operation_attempt_id", "opa_")?
                && optional_id("receipt_id", "rcp_")
                && timestamp("recorded_at")?
                && optional_digest("observed_result_digest")
                && matches!(
                    (
                        field(object, "status")?,
                        object.get("receipt_id"),
                        object.get("observed_result_digest")
                    ),
                    (
                        "pending" | "unresolved",
                        Some(Value::Null),
                        Some(Value::Null)
                    ) | (
                        "matched" | "mismatch",
                        Some(Value::String(_)),
                        Some(Value::String(_))
                    )
                )
        }
        "states" => {
            id("state_event_id", "ste_")?
                && target_id(object)?
                && optional_id("prior_state_event_id", "ste_")
                && timestamp("effective_at")?
                && digest("state_digest")?
                && object
                    .get("state_sequence")
                    .and_then(Value::as_i64)
                    .is_some_and(|value| (1..=64).contains(&value))
                && match object.get("prior_state_sequence") {
                    Some(Value::Null) => true,
                    Some(Value::Number(value)) => value
                        .as_i64()
                        .is_some_and(|value| (1..=63).contains(&value)),
                    _ => false,
                }
                && valid_state(object)
        }
        _ => false,
    };
    if valid {
        Ok(())
    } else {
        Err(ActionRequestErrorV1::EvidenceDrift)
    }
}

#[allow(clippy::too_many_lines)] // Validate the bounded state and receipt graph as one unit.
fn validate_state_lineage(
    states: &[Value],
    authorizations: &[Value],
    operations: &[Value],
    consumptions: &[Value],
    operation_attempts: &[Value],
    receipts: &[Value],
) -> Result<(), ActionRequestErrorV1> {
    let mut groups = BTreeMap::<(String, String), Vec<&Map<String, Value>>>::new();
    for state in states {
        let object = state
            .as_object()
            .ok_or(ActionRequestErrorV1::EvidenceDrift)?;
        let target = field(object, "target_entity_id")?.to_owned();
        let kind = field(object, "target_entity_kind")?.to_owned();
        groups.entry((kind, target)).or_default().push(object);
    }
    for events in groups.values() {
        let mut previous: Option<(&Map<String, Value>, u64)> = None;
        for event in events {
            let sequence = event
                .get("state_sequence")
                .and_then(Value::as_i64)
                .ok_or(ActionRequestErrorV1::EvidenceDrift)?;
            let effective_at = canonical_utc_timestamp_millis_v1(field(event, "effective_at")?)
                .ok_or(ActionRequestErrorV1::EvidenceDrift)?;
            match previous {
                None if sequence == 1
                    && matches!(event.get("prior_state_event_id"), Some(Value::Null))
                    && matches!(event.get("prior_state_sequence"), Some(Value::Null)) => {}
                Some((prior, prior_at))
                    if sequence
                        == prior
                            .get("state_sequence")
                            .and_then(Value::as_i64)
                            .unwrap_or_default()
                            + 1
                        && event.get("prior_state_event_id").and_then(Value::as_str)
                            == prior.get("state_event_id").and_then(Value::as_str)
                        && event.get("prior_state_sequence").and_then(Value::as_i64)
                            == prior.get("state_sequence").and_then(Value::as_i64)
                        && effective_at >= prior_at => {}
                _ => return Err(ActionRequestErrorV1::EvidenceDrift),
            }
            previous = Some((event, effective_at));
        }
    }

    let require_events =
        |id: &str, kind: &str| -> Result<&[&Map<String, Value>], ActionRequestErrorV1> {
            let key = (kind.to_owned(), id.to_owned());
            groups
                .get(&key)
                .map(Vec::as_slice)
                .ok_or(ActionRequestErrorV1::EvidenceDrift)
        };
    for authorization in authorizations {
        let object = authorization
            .as_object()
            .ok_or(ActionRequestErrorV1::EvidenceDrift)?;
        let authorization_id = field(object, "authorization_id")?;
        let events = require_events(authorization_id, "execution_authorization")?;
        let issued_at = canonical_utc_timestamp_millis_v1(field(object, "issued_at")?)
            .ok_or(ActionRequestErrorV1::EvidenceDrift)?;
        let expires_at = canonical_utc_timestamp_millis_v1(field(object, "expires_at")?)
            .ok_or(ActionRequestErrorV1::EvidenceDrift)?;
        if events.len() > 2
            || field(events[0], "state")? != "active"
            || canonical_utc_timestamp_millis_v1(field(events[0], "effective_at")?)
                != Some(issued_at)
        {
            return Err(ActionRequestErrorV1::EvidenceDrift);
        }
        let has_consumption = consumptions.iter().any(|value| {
            value.as_object().is_some_and(|consumption| {
                field(consumption, "authorization_id").ok() == Some(authorization_id)
            })
        });
        if let Some(terminal) = events.get(1) {
            let terminal_state = field(terminal, "state")?;
            let terminal_at = canonical_utc_timestamp_millis_v1(field(terminal, "effective_at")?)
                .ok_or(ActionRequestErrorV1::EvidenceDrift)?;
            if !matches!(
                terminal_state,
                "cancelled" | "revoked" | "expired" | "consumed"
            ) || terminal_at < issued_at
                || (terminal_state == "expired" && terminal_at != expires_at)
                || (terminal_state != "expired" && terminal_at >= expires_at)
                || (terminal_state == "consumed") != has_consumption
            {
                return Err(ActionRequestErrorV1::EvidenceDrift);
            }
        } else if has_consumption {
            return Err(ActionRequestErrorV1::EvidenceDrift);
        }
    }
    for operation in operations {
        let object = operation
            .as_object()
            .ok_or(ActionRequestErrorV1::EvidenceDrift)?;
        let operation_id = field(object, "operation_id")?;
        let events = require_events(operation_id, "operation")?;
        if field(events[0], "state")? != "prepared"
            || field(events[0], "effective_at")? != field(object, "created_at")?
        {
            return Err(ActionRequestErrorV1::EvidenceDrift);
        }
        if !valid_execution_transitions(events, "prepared")? {
            return Err(ActionRequestErrorV1::EvidenceDrift);
        }
        let completed = field(
            events.last().ok_or(ActionRequestErrorV1::EvidenceDrift)?,
            "state",
        )? == "completed";
        let linked_receipts = receipts
            .iter()
            .filter(|value| {
                value.as_object().is_some_and(|receipt| {
                    field(receipt, "operation_id").ok() == Some(operation_id)
                })
            })
            .count();
        if (completed && linked_receipts != 1) || (!completed && linked_receipts != 0) {
            return Err(ActionRequestErrorV1::EvidenceDrift);
        }
    }
    for attempt in operation_attempts {
        let object = attempt
            .as_object()
            .ok_or(ActionRequestErrorV1::EvidenceDrift)?;
        let attempt_id = field(object, "operation_attempt_id")?;
        let events = require_events(attempt_id, "operation_attempt")?;
        if field(events[0], "state")? != "dispatching"
            || !valid_execution_transitions(events, "dispatching")?
        {
            return Err(ActionRequestErrorV1::EvidenceDrift);
        }
        let completed = field(
            events.last().ok_or(ActionRequestErrorV1::EvidenceDrift)?,
            "state",
        )? == "completed";
        let linked_receipts = receipts
            .iter()
            .filter(|value| {
                value.as_object().is_some_and(|receipt| {
                    field(receipt, "operation_attempt_id").ok() == Some(attempt_id)
                })
            })
            .count();
        if (completed && linked_receipts != 1) || (!completed && linked_receipts != 0) {
            return Err(ActionRequestErrorV1::EvidenceDrift);
        }
    }
    Ok(())
}

fn valid_execution_transitions(
    events: &[&Map<String, Value>],
    initial: &str,
) -> Result<bool, ActionRequestErrorV1> {
    let mut prior = initial;
    for event in events.iter().skip(1) {
        let state = field(event, "state")?;
        if !matches!(
            (prior, state),
            ("prepared", "dispatching")
                | ("dispatching", "outcome_unknown" | "completed" | "failed")
                | ("outcome_unknown", "completed")
        ) {
            return Ok(false);
        }
        prior = state;
    }
    Ok(true)
}

fn valid_state(object: &Map<String, Value>) -> bool {
    let Ok(target) = field(object, "target_entity_kind") else {
        return false;
    };
    let Ok(state) = field(object, "state") else {
        return false;
    };
    matches!(
        (target, state),
        (
            "execution_authorization",
            "prepared" | "active" | "cancelled" | "revoked" | "expired" | "consumed"
        ) | (
            "operation",
            "prepared"
                | "authorized"
                | "dispatching"
                | "outcome_unknown"
                | "completed"
                | "failed"
                | "cancel_requested"
                | "expired"
                | "orphaned"
        ) | (
            "operation_attempt",
            "prepared"
                | "dispatching"
                | "accepted"
                | "working"
                | "input_required"
                | "completed"
                | "failed"
                | "transport_unavailable"
                | "outcome_unknown"
                | "cancel_requested"
                | "expired"
                | "orphaned"
        )
    )
}

fn target_id(object: &Map<String, Value>) -> Result<bool, ActionRequestErrorV1> {
    let prefix = match field(object, "target_entity_kind")? {
        "execution_authorization" => "xau_",
        "operation" => "opn_",
        "operation_attempt" => "opa_",
        _ => return Ok(false),
    };
    Ok(canonical_id(field(object, "target_entity_id")?, prefix))
}

fn field<'a>(object: &'a Map<String, Value>, name: &str) -> Result<&'a str, ActionRequestErrorV1> {
    object
        .get(name)
        .and_then(Value::as_str)
        .ok_or(ActionRequestErrorV1::EvidenceDrift)
}

fn canonical_id(value: &str, prefix: &str) -> bool {
    value.len() == 68
        && value.starts_with(prefix)
        && value[prefix.len()..]
            .bytes()
            .all(|byte| byte.is_ascii_digit() || matches!(byte, b'a'..=b'f'))
}

fn canonical_digest(value: &str) -> bool {
    value.len() == 71
        && value.starts_with("sha256:")
        && value[7..]
            .bytes()
            .all(|byte| byte.is_ascii_digit() || matches!(byte, b'a'..=b'f'))
}

fn canonical_timestamp(value: &str) -> bool {
    canonical_utc_timestamp_millis_v1(value).is_some()
}

const PROJECTION_SQL: &str = r"
WITH
input AS (
  SELECT :request_id AS request_id, :requester_ref AS requester_ref, :session_id AS session_id,
    :project_ref AS project_ref, :resource_ref AS resource_ref, :idempotency_key AS idempotency_key,
    :packet_id AS packet_id, :packet_sha256 AS packet_sha256, :action_digest AS action_digest,
    :target_digest AS target_digest, :configuration_digest AS configuration_digest,
    :created_at AS created_at, :root_evidence_digest AS root_evidence_digest,
    :evaluation_status AS evaluation_status, :policy_decision_id AS policy_decision_id,
    :reason_code AS reason_code, :recorded_at AS recorded_at,
    :evaluation_evidence_digest AS evaluation_evidence_digest
),
root_source AS (
  SELECT request.* FROM lnsat_action_requests AS request JOIN input AS input
    ON request.request_id=input.request_id AND request.requester_ref=input.requester_ref
   AND request.session_id=input.session_id AND request.project_ref=input.project_ref
   AND request.resource_ref=input.resource_ref AND request.idempotency_key=input.idempotency_key
   AND request.packet_id=input.packet_id AND request.packet_sha256=input.packet_sha256
   AND request.action_digest=input.action_digest AND request.target_digest=input.target_digest
   AND request.configuration_digest=input.configuration_digest AND request.created_at=input.created_at
   AND request.evidence_digest=input.root_evidence_digest
),
evaluation_source AS (
  SELECT evaluation.* FROM lnsat_action_request_evaluations AS evaluation
  JOIN root_source AS root ON root.request_id=evaluation.request_id
  JOIN input AS input ON evaluation.packet_id=input.packet_id AND evaluation.packet_sha256=input.packet_sha256
    AND evaluation.project_ref=input.project_ref AND evaluation.resource_ref=input.resource_ref
    AND evaluation.status=input.evaluation_status AND evaluation.policy_decision_id IS input.policy_decision_id
    AND evaluation.reason_code=input.reason_code AND evaluation.recorded_at=input.recorded_at
    AND evaluation.evidence_digest=input.evaluation_evidence_digest
),
packet_source AS (
  SELECT packet.packet_id, packet.packet_sha256, packet.project_ref, packet.canonical_packet
  FROM lnsat_packet_envelopes AS packet JOIN evaluation_source AS evaluation
    ON evaluation.packet_id=packet.packet_id AND evaluation.packet_sha256=packet.packet_sha256
   AND evaluation.project_ref=packet.project_ref
  JOIN lnsat_packet_resource_refs AS resource
    ON resource.packet_id=packet.packet_id AND resource.project_ref=packet.project_ref
   AND resource.resource_ref=evaluation.resource_ref
),
policy_source AS (
  SELECT policy.*, packet.canonical_packet FROM lnsat_policy_decisions AS policy JOIN evaluation_source AS evaluation
    ON policy.decision_id=evaluation.policy_decision_id AND policy.packet_id=evaluation.packet_id
   AND policy.packet_sha256=evaluation.packet_sha256 AND policy.project_ref=evaluation.project_ref
  JOIN packet_source AS packet ON packet.packet_id=policy.packet_id
   AND packet.packet_sha256=policy.packet_sha256 AND packet.project_ref=policy.project_ref
  WHERE evaluation.status='recorded'
),
approvals AS (
  SELECT approval.* FROM lnsat_approval_requests AS approval JOIN policy_source AS policy
    ON approval.policy_decision_id=policy.decision_id AND approval.packet_sha256=policy.packet_sha256
   AND approval.project_ref=policy.project_ref ORDER BY approval.requested_at, approval.approval_request_id LIMIT 65
),
approval_decisions AS (
  SELECT decision.* FROM lnsat_approval_decisions AS decision JOIN approvals AS approval
    ON decision.approval_request_id=approval.approval_request_id
   AND decision.policy_decision_id=approval.policy_decision_id AND decision.project_ref=approval.project_ref
  ORDER BY decision.decided_at, decision.approval_decision_id LIMIT 65
),
authorization_attempts AS (
  SELECT attempt.* FROM lnsat_authorization_attempts AS attempt
  JOIN approval_decisions AS decision ON decision.approval_decision_id=attempt.approval_decision_id
   AND decision.approval_request_id=attempt.approval_request_id
   AND decision.policy_decision_id=attempt.policy_decision_id AND decision.project_ref=attempt.project_ref
  JOIN policy_source AS policy ON policy.decision_id=attempt.policy_decision_id
   AND policy.packet_id=attempt.packet_id AND policy.packet_sha256=attempt.packet_sha256
   AND policy.project_ref=attempt.project_ref
  JOIN evaluation_source AS evaluation ON attempt.resource_ref=evaluation.resource_ref
  WHERE attempt.execution_authorized=0
  ORDER BY attempt.requested_at, attempt.authorization_attempt_id LIMIT 65
),
authorizations AS (
  SELECT authorization.* FROM lnsat_execution_authorizations AS authorization
  JOIN authorization_attempts AS attempt
    ON authorization.authorization_attempt_id=attempt.authorization_attempt_id
   AND authorization.project_ref=attempt.project_ref AND authorization.resource_ref=attempt.resource_ref
   AND authorization.binding_digest=attempt.binding_digest
   AND authorization.approval_decision_id=attempt.approval_decision_id
   AND authorization.policy_decision_id=attempt.policy_decision_id
   AND authorization.packet_id=attempt.packet_id AND authorization.packet_sha256=attempt.packet_sha256
   AND authorization.requester_ref=attempt.requester_ref AND authorization.requester_session_ref=attempt.requester_session_ref
   AND authorization.approver_ref=attempt.approver_ref AND authorization.approver_session_ref=attempt.approver_session_ref
   AND authorization.action_digest=attempt.action_digest AND authorization.target_digest=attempt.target_digest
   AND authorization.configuration_digest=attempt.configuration_digest
  JOIN lnsat_authorization_nonces AS nonce ON nonce.nonce_id=authorization.nonce_id
   AND nonce.authorization_attempt_id=attempt.authorization_attempt_id
   AND nonce.project_ref=attempt.project_ref AND nonce.resource_ref=attempt.resource_ref
   AND nonce.binding_digest=attempt.binding_digest
  ORDER BY authorization.issued_at, authorization.authorization_id LIMIT 65
),
operations AS (
  SELECT operation.* FROM lnsat_operations AS operation JOIN authorizations AS authorization
    ON operation.authorization_id=authorization.authorization_id
   AND operation.project_ref=authorization.project_ref AND operation.resource_ref=authorization.resource_ref
   AND operation.binding_digest=authorization.binding_digest
   AND operation.requested_action_digest=authorization.action_digest
   AND operation.approved_action_digest=authorization.action_digest
   AND operation.authorized_action_digest=authorization.action_digest
   AND operation.target_digest=authorization.target_digest
   AND operation.configuration_digest=authorization.configuration_digest
  ORDER BY operation.created_at, operation.operation_id LIMIT 65
),
consumptions AS (
  SELECT consumption.* FROM lnsat_capability_consumptions AS consumption
  JOIN authorizations AS authorization ON consumption.authorization_id=authorization.authorization_id
   AND consumption.project_ref=authorization.project_ref AND consumption.resource_ref=authorization.resource_ref
   AND consumption.binding_digest=authorization.binding_digest AND consumption.capability_digest=authorization.capability_digest
  JOIN operations AS operation ON consumption.operation_id=operation.operation_id
   AND consumption.authorization_id=operation.authorization_id
   AND consumption.project_ref=operation.project_ref AND consumption.resource_ref=operation.resource_ref
   AND consumption.binding_digest=operation.binding_digest
  ORDER BY consumption.consumed_at, consumption.consumption_id LIMIT 65
),
operation_attempts AS (
  SELECT attempt.* FROM lnsat_operation_attempts AS attempt JOIN operations AS operation
    ON attempt.operation_id=operation.operation_id AND attempt.project_ref=operation.project_ref
   AND attempt.resource_ref=operation.resource_ref
  ORDER BY attempt.operation_id, attempt.attempt_sequence, attempt.operation_attempt_id LIMIT 65
),
receipts AS (
  SELECT receipt.* FROM lnsat_operation_receipts AS receipt
  JOIN operations AS operation ON receipt.operation_id=operation.operation_id
   AND receipt.project_ref=operation.project_ref AND receipt.resource_ref=operation.resource_ref
   AND receipt.requested_action_digest=operation.requested_action_digest
   AND receipt.approved_action_digest=operation.approved_action_digest
   AND receipt.authorized_action_digest=operation.authorized_action_digest
  JOIN operation_attempts AS attempt ON receipt.operation_attempt_id=attempt.operation_attempt_id
   AND receipt.operation_id=attempt.operation_id AND receipt.project_ref=attempt.project_ref
   AND receipt.resource_ref=attempt.resource_ref
  JOIN consumptions AS consumption ON receipt.consumption_id=consumption.consumption_id
   AND receipt.operation_id=consumption.operation_id AND receipt.authorization_id=consumption.authorization_id
   AND receipt.project_ref=consumption.project_ref AND receipt.resource_ref=consumption.resource_ref
  WHERE receipt.verification_status='accepted' AND receipt.digest_bound=1
  ORDER BY receipt.received_at, receipt.receipt_id LIMIT 65
),
reconciliations AS (
  SELECT reconciliation.* FROM lnsat_operation_reconciliations AS reconciliation
  JOIN operations AS operation ON reconciliation.operation_id=operation.operation_id
   AND reconciliation.project_ref=operation.project_ref AND reconciliation.resource_ref=operation.resource_ref
  JOIN operation_attempts AS attempt ON reconciliation.operation_attempt_id=attempt.operation_attempt_id
   AND reconciliation.operation_id=attempt.operation_id AND reconciliation.project_ref=attempt.project_ref
   AND reconciliation.resource_ref=attempt.resource_ref
  LEFT JOIN receipts AS receipt ON reconciliation.receipt_id=receipt.receipt_id
   AND reconciliation.operation_id=receipt.operation_id
   AND reconciliation.operation_attempt_id=receipt.operation_attempt_id
   AND reconciliation.project_ref=receipt.project_ref AND reconciliation.resource_ref=receipt.resource_ref
  WHERE (reconciliation.status IN ('pending','unresolved')
           AND reconciliation.receipt_id IS NULL AND reconciliation.observed_result_digest IS NULL)
     OR (reconciliation.status='matched' AND receipt.receipt_id IS NOT NULL
           AND reconciliation.observed_result_digest=receipt.result_digest)
     OR (reconciliation.status='mismatch' AND receipt.receipt_id IS NOT NULL
           AND reconciliation.observed_result_digest!=receipt.result_digest)
  ORDER BY reconciliation.operation_id, reconciliation.reconciliation_sequence, reconciliation.reconciliation_id LIMIT 65
),
state_targets AS (
  SELECT authorization_id AS target_entity_id, 'execution_authorization' AS target_entity_kind, project_ref, resource_ref FROM authorizations
  UNION
  SELECT operation_id, 'operation', project_ref, resource_ref FROM operations
  UNION
  SELECT operation_attempt_id, 'operation_attempt', project_ref, resource_ref FROM operation_attempts
),
states AS (
  SELECT state.* FROM lnsat_phase7_state_events AS state JOIN state_targets AS target
    ON state.target_entity_id=target.target_entity_id AND state.target_entity_kind=target.target_entity_kind
   AND state.project_ref=target.project_ref AND state.resource_ref=target.resource_ref
  JOIN lnsat_phase7_entities AS entity ON entity.entity_id=state.state_event_id
   AND entity.entity_kind=state.entity_kind AND entity.project_ref=state.project_ref AND entity.resource_ref=state.resource_ref
  ORDER BY state.target_entity_kind, state.target_entity_id, state.state_sequence LIMIT 65
),
invalid AS (
  SELECT 1 AS bad WHERE NOT EXISTS (SELECT 1 FROM root_source)
  UNION ALL SELECT 1 WHERE NOT EXISTS (SELECT 1 FROM evaluation_source)
  UNION ALL SELECT 1 WHERE NOT EXISTS (SELECT 1 FROM packet_source)
  UNION ALL SELECT 1 WHERE EXISTS (SELECT 1 FROM evaluation_source WHERE status!='recorded')
  UNION ALL SELECT 1 WHERE EXISTS (
    SELECT 1 FROM evaluation_source WHERE status='recorded' AND NOT EXISTS (SELECT 1 FROM policy_source)
  )
  UNION ALL SELECT 1 WHERE (SELECT count(*) FROM approvals)<65 AND EXISTS (
    SELECT 1 FROM lnsat_approval_requests AS approval
    WHERE EXISTS (SELECT 1 FROM policy_source AS policy WHERE approval.policy_decision_id=policy.decision_id)
      AND NOT EXISTS (SELECT 1 FROM approvals AS projected WHERE projected.approval_request_id=approval.approval_request_id)
  )
  UNION ALL SELECT 1 WHERE (SELECT count(*) FROM approval_decisions)<65 AND EXISTS (
    SELECT 1 FROM lnsat_approval_decisions AS decision
    WHERE (EXISTS (SELECT 1 FROM policy_source AS policy WHERE decision.policy_decision_id=policy.decision_id)
       OR EXISTS (SELECT 1 FROM approvals AS approval WHERE decision.approval_request_id=approval.approval_request_id)
    )
      AND NOT EXISTS (SELECT 1 FROM approval_decisions AS projected WHERE projected.approval_decision_id=decision.approval_decision_id)
  )
  UNION ALL SELECT 1 WHERE (SELECT count(*) FROM authorization_attempts)<65 AND EXISTS (
    SELECT 1 FROM lnsat_authorization_attempts AS attempt
    WHERE (EXISTS (SELECT 1 FROM policy_source AS policy WHERE attempt.policy_decision_id=policy.decision_id)
       OR EXISTS (SELECT 1 FROM approval_decisions AS decision WHERE attempt.approval_decision_id=decision.approval_decision_id)
       OR EXISTS (SELECT 1 FROM approvals AS approval WHERE attempt.approval_request_id=approval.approval_request_id)
    )
      AND NOT EXISTS (
        SELECT 1 FROM authorization_attempts AS projected WHERE projected.authorization_attempt_id=attempt.authorization_attempt_id
      )
  )
  UNION ALL SELECT 1 WHERE (SELECT count(*) FROM authorizations)<65 AND EXISTS (
    SELECT 1 FROM lnsat_execution_authorizations AS authorization
    WHERE (EXISTS (SELECT 1 FROM policy_source AS policy WHERE authorization.policy_decision_id=policy.decision_id)
       OR EXISTS (SELECT 1 FROM authorization_attempts AS attempt WHERE authorization.authorization_attempt_id=attempt.authorization_attempt_id)
    )
      AND NOT EXISTS (SELECT 1 FROM authorizations AS projected WHERE projected.authorization_id=authorization.authorization_id)
  )
  UNION ALL SELECT 1 WHERE (SELECT count(*) FROM operations)<65 AND EXISTS (
    SELECT 1 FROM lnsat_operations AS operation
    WHERE EXISTS (SELECT 1 FROM authorizations AS authorization WHERE operation.authorization_id=authorization.authorization_id)
      AND NOT EXISTS (SELECT 1 FROM operations AS projected WHERE projected.operation_id=operation.operation_id)
  )
  UNION ALL SELECT 1 WHERE (SELECT count(*) FROM consumptions)<65 AND EXISTS (
    SELECT 1 FROM lnsat_capability_consumptions AS consumption
    WHERE (EXISTS (SELECT 1 FROM operations AS operation WHERE consumption.operation_id=operation.operation_id)
       OR EXISTS (SELECT 1 FROM authorizations AS authorization WHERE consumption.authorization_id=authorization.authorization_id)
    )
      AND NOT EXISTS (SELECT 1 FROM consumptions AS projected WHERE projected.consumption_id=consumption.consumption_id)
  )
  UNION ALL SELECT 1 WHERE (SELECT count(*) FROM operation_attempts)<65 AND EXISTS (
    SELECT 1 FROM lnsat_operation_attempts AS attempt
    WHERE EXISTS (SELECT 1 FROM operations AS operation WHERE attempt.operation_id=operation.operation_id)
      AND NOT EXISTS (SELECT 1 FROM operation_attempts AS projected WHERE projected.operation_attempt_id=attempt.operation_attempt_id)
  )
  UNION ALL SELECT 1 WHERE (SELECT count(*) FROM receipts)<65 AND EXISTS (
    SELECT 1 FROM lnsat_operation_receipts AS receipt
    WHERE (EXISTS (SELECT 1 FROM operations AS operation WHERE receipt.operation_id=operation.operation_id)
       OR EXISTS (SELECT 1 FROM operation_attempts AS attempt WHERE receipt.operation_attempt_id=attempt.operation_attempt_id)
       OR EXISTS (SELECT 1 FROM authorizations AS authorization WHERE receipt.authorization_id=authorization.authorization_id)
       OR EXISTS (SELECT 1 FROM consumptions AS consumption WHERE receipt.consumption_id=consumption.consumption_id)
    )
      AND NOT EXISTS (SELECT 1 FROM receipts AS projected WHERE projected.receipt_id=receipt.receipt_id)
  )
  UNION ALL SELECT 1 WHERE (SELECT count(*) FROM reconciliations)<65 AND EXISTS (
    SELECT 1 FROM lnsat_operation_reconciliations AS reconciliation
    WHERE (EXISTS (SELECT 1 FROM operations AS operation WHERE reconciliation.operation_id=operation.operation_id)
       OR EXISTS (SELECT 1 FROM operation_attempts AS attempt WHERE reconciliation.operation_attempt_id=attempt.operation_attempt_id)
       OR EXISTS (SELECT 1 FROM receipts AS receipt WHERE reconciliation.receipt_id=receipt.receipt_id)
    )
      AND NOT EXISTS (SELECT 1 FROM reconciliations AS projected WHERE projected.reconciliation_id=reconciliation.reconciliation_id)
  )
  UNION ALL SELECT 1 WHERE (SELECT count(*) FROM states)<65 AND EXISTS (
    SELECT 1 FROM lnsat_phase7_state_events AS state
    WHERE EXISTS (SELECT 1 FROM state_targets AS target WHERE state.target_entity_id=target.target_entity_id)
      AND NOT EXISTS (SELECT 1 FROM states AS projected WHERE projected.state_event_id=state.state_event_id)
  )
  UNION ALL SELECT 1 WHERE (SELECT count(*) FROM states)<65 AND EXISTS (
    SELECT 1 FROM state_targets AS target WHERE NOT EXISTS (
      SELECT 1 FROM states AS state WHERE state.target_entity_id=target.target_entity_id
        AND state.target_entity_kind=target.target_entity_kind
        AND state.project_ref=target.project_ref AND state.resource_ref=target.resource_ref
    )
  )
),
rows AS (
  SELECT 'private_policy' AS kind, 1 AS ordinal, json_object('canonical_packet',canonical_packet,'decision',decision,'evaluated_at',evaluated_at,'expires_at',expires_at,'requires_approval',requires_approval) AS payload FROM policy_source
  UNION ALL
  SELECT 'policy' AS kind, 1 AS ordinal, json_object('decision_id',decision_id,'evaluated_at',evaluated_at,'expires_at',expires_at,'decision',decision,'requires_approval',requires_approval) AS payload FROM policy_source
  UNION ALL SELECT 'approvals', row_number() OVER (ORDER BY requested_at, approval_request_id), json_object('approval_request_id',approval_request_id,'policy_decision_id',policy_decision_id,'status',status,'requested_at',requested_at,'expires_at',expires_at) FROM approvals
  UNION ALL SELECT 'approval_decisions', row_number() OVER (ORDER BY decided_at, approval_decision_id), json_object('approval_decision_id',approval_decision_id,'approval_request_id',approval_request_id,'policy_decision_id',policy_decision_id,'decision',decision,'reason',reason,'decided_at',decided_at,'expires_at',expires_at,'approval_gate_satisfied',approval_gate_satisfied) FROM approval_decisions
  UNION ALL SELECT 'authorization_attempts', row_number() OVER (ORDER BY requested_at, authorization_attempt_id), json_object('authorization_attempt_id',authorization_attempt_id,'approval_decision_id',approval_decision_id,'approval_request_id',approval_request_id,'policy_decision_id',policy_decision_id,'result_status',result_status,'requested_at',requested_at,'expires_at',expires_at) FROM authorization_attempts
  UNION ALL SELECT 'authorizations', row_number() OVER (ORDER BY issued_at, authorization_id), json_object('authorization_id',authorization_id,'authorization_attempt_id',authorization_attempt_id,'approval_decision_id',approval_decision_id,'policy_decision_id',policy_decision_id,'issued_at',issued_at,'expires_at',expires_at) FROM authorizations
  UNION ALL SELECT 'operations', row_number() OVER (ORDER BY created_at, operation_id), json_object('operation_id',operation_id,'authorization_id',authorization_id,'created_at',created_at,'expires_at',expires_at) FROM operations
  UNION ALL SELECT 'consumptions', row_number() OVER (ORDER BY consumed_at, consumption_id), json_object('consumption_id',consumption_id,'authorization_id',authorization_id,'operation_id',operation_id,'consumed_at',consumed_at) FROM consumptions
  UNION ALL SELECT 'operation_attempts', row_number() OVER (ORDER BY operation_id, attempt_sequence, operation_attempt_id), json_object('operation_attempt_id',operation_attempt_id,'operation_id',operation_id,'attempt_sequence',attempt_sequence,'created_at',created_at) FROM operation_attempts
  UNION ALL SELECT 'receipts', row_number() OVER (ORDER BY received_at, receipt_id), json_object('receipt_id',receipt_id,'operation_id',operation_id,'operation_attempt_id',operation_attempt_id,'authorization_id',authorization_id,'consumption_id',consumption_id,'verification_status',verification_status,'result_digest','sha256:' || lower(hex(result_digest)),'received_at',received_at) FROM receipts
  UNION ALL SELECT 'reconciliations', row_number() OVER (ORDER BY operation_id, reconciliation_sequence, reconciliation_id), json_object('reconciliation_id',reconciliation_id,'operation_id',operation_id,'operation_attempt_id',operation_attempt_id,'receipt_id',receipt_id,'status',status,'observed_result_digest',CASE WHEN observed_result_digest IS NULL THEN NULL ELSE 'sha256:' || lower(hex(observed_result_digest)) END,'recorded_at',recorded_at) FROM reconciliations
  UNION ALL SELECT 'states', row_number() OVER (ORDER BY target_entity_kind, target_entity_id, state_sequence), json_object('state_event_id',state_event_id,'target_entity_id',target_entity_id,'target_entity_kind',target_entity_kind,'state_sequence',state_sequence,'state',state,'prior_state_event_id',prior_state_event_id,'prior_state_sequence',prior_state_sequence,'effective_at',effective_at,'state_digest','sha256:' || lower(hex(state_digest))) FROM states
  UNION ALL SELECT 'invalid', 1, '{}' FROM invalid
)
SELECT
  CASE WHEN length(CAST(payload AS BLOB)) > 65536 THEN 'response_limit' ELSE kind END,
  ordinal,
  CASE WHEN length(CAST(payload AS BLOB)) > 65536 THEN '{}' ELSE payload END
FROM rows ORDER BY kind, ordinal LIMIT 513
";
