//! Durable, non-authorizing roots for authenticated action intake.

use super::{
    Connection, Digest, LOCAL_SESSION_IDLE_TIMEOUT_DEFAULT_SECONDS_V1, LocalControlPermissionV1,
    LocalIdentityRoleV1, LocalSessionActivityVerificationV1, OptionalExtension, Sha256,
    SqliteStore, TransactionBehavior, append_packet_in_transaction_v1,
    append_policy_in_transaction_v1, canonical_utc_timestamp_millis_v1,
    canonicalize_packet_envelope_v1, decide_packet_envelope_policy_v1, hash_packet_envelope_v1,
    is_valid_reference_v1, params, verify_and_touch_local_session_on_connection_v1,
};
use core::fmt::Write as _;
use lnsat_contracts::{PacketEnvelopeV1, parse_execution_proposal_v1};
use serde::Serialize;
use serde_json::{Value, json};

mod projection;

/// Maximum encoded operator record, including its envelope.
pub const ACTION_REQUEST_RECORD_MAX_BYTES_V1: usize = 65_536;

/// Stable errors never include credentials, SQL or submitted content.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum ActionRequestErrorV1 {
    InvalidInput,
    AuthorizationRejected,
    EvidenceDrift,
    PersistenceFailed,
    ResponseLimit,
}

impl core::fmt::Display for ActionRequestErrorV1 {
    fn fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result {
        f.write_str(match self {
            Self::InvalidInput => "invalid action request",
            Self::AuthorizationRejected => "action request access rejected",
            Self::EvidenceDrift => "action request evidence unavailable",
            Self::PersistenceFailed => "action request persistence unavailable",
            Self::ResponseLimit => "action request record exceeds bounds",
        })
    }
}
impl std::error::Error for ActionRequestErrorV1 {}

/// Public-safe request commitments. Internal session and key never serialize.
#[derive(Clone, Debug, Eq, PartialEq, Serialize)]
pub struct ActionRequestRootV1 {
    pub request_id: String,
    pub requester_ref: String,
    #[serde(skip_serializing)]
    pub(super) session_id: String,
    pub project_ref: String,
    pub resource_ref: String,
    #[serde(skip_serializing)]
    pub(super) idempotency_key: String,
    pub packet_id: String,
    pub packet_sha256: String,
    pub action_digest: String,
    pub target_digest: String,
    pub configuration_digest: String,
    pub created_at: String,
    pub evidence_digest: String,
}

/// One immutable terminal evaluation fact; absence means unknown.
#[derive(Clone, Debug, Eq, PartialEq, Serialize)]
pub struct ActionRequestEvaluationV1 {
    pub status: String,
    pub policy_decision_id: Option<String>,
    pub reason_code: String,
    pub recorded_at: String,
    pub evidence_digest: String,
}

/// First replay or conflict only; this is not a submission counter.
#[derive(Clone, Debug, Eq, PartialEq, Serialize)]
pub struct ActionRequestObservationV1 {
    pub kind: String,
    pub submitted_digest: String,
    pub observed_at: String,
    pub evidence_digest: String,
}

/// Intake response carries no execution authority.
#[derive(Clone, Debug, Eq, PartialEq, Serialize)]
pub struct ActionRequestSubmissionV1 {
    pub schema: &'static str,
    pub request_id: String,
    pub disposition: &'static str,
    pub evaluation_state: &'static str,
}

/// Complete bounded record or a fixed degraded envelope without partial history.
#[derive(Clone, Debug, PartialEq, Serialize)]
pub struct ActionRequestRecordV1 {
    pub schema: &'static str,
    pub status: &'static str,
    pub request_id: String,
    pub evaluation_state: &'static str,
    pub request: Option<ActionRequestRootV1>,
    pub evaluation: Option<ActionRequestEvaluationV1>,
    pub observations: Vec<ActionRequestObservationV1>,
    pub evidence: Option<Value>,
    pub security_activity_touched: bool,
}

impl SqliteStore {
    /// Commits a request root before its separate, atomic packet/policy evaluation.
    /// Exact retries and conflicts never reevaluate or dispatch.
    ///
    /// # Errors
    /// Returns a fixed error for invalid input, rejected access or unavailable storage.
    pub fn append_authenticated_action_request_v1(
        &mut self,
        packet: &PacketEnvelopeV1,
        token: &str,
        csrf: &str,
        at: &str,
    ) -> Result<ActionRequestSubmissionV1, ActionRequestErrorV1> {
        let (root, disposition) = self.admit_action_request_v1(packet, token, csrf, at)?;
        if disposition == "created" {
            self.evaluate_action_request_v1(&root, packet, token, csrf, at)?;
        }
        let evaluation = read_evaluation(&self.connection, &root)?;
        Ok(ActionRequestSubmissionV1 {
            schema: "lnsat.action_request_submission.v1",
            request_id: root.request_id,
            disposition,
            evaluation_state: evaluation_state(evaluation.as_ref()),
        })
    }

    pub(super) fn admit_action_request_v1(
        &mut self,
        packet: &PacketEnvelopeV1,
        token: &str,
        csrf: &str,
        at: &str,
    ) -> Result<(ActionRequestRootV1, &'static str), ActionRequestErrorV1> {
        canonicalize_packet_envelope_v1(packet).map_err(|_| ActionRequestErrorV1::InvalidInput)?;
        let proposal =
            parse_execution_proposal_v1(packet).map_err(|_| ActionRequestErrorV1::InvalidInput)?;
        if canonical_utc_timestamp_millis_v1(at).is_none()
            || packet.idempotency_key.is_empty()
            || packet.idempotency_key.len() > 256
        {
            return Err(ActionRequestErrorV1::InvalidInput);
        }
        let packet_sha256 =
            hash_packet_envelope_v1(packet).map_err(|_| ActionRequestErrorV1::InvalidInput)?;
        let transaction = self
            .connection
            .transaction_with_behavior(TransactionBehavior::Immediate)
            .map_err(|_| ActionRequestErrorV1::PersistenceFailed)?;
        let (session, _) = authenticate(&transaction, token, Some(csrf), at)?;
        if !session
            .role
            .allows_control(LocalControlPermissionV1::RequestAction)
            || packet.actor_ref != session.identity_ref
            || packet.session_ref != format!("session:local:{}", session.session_id)
        {
            return Err(ActionRequestErrorV1::AuthorizationRejected);
        }
        let existing = transaction.query_row(
            &format!("{ROOT_SELECT} WHERE requester_ref=?1 AND project_ref=?2 AND resource_ref=?3 AND idempotency_key=?4"),
            params![session.identity_ref, packet.project_ref, proposal.target.resource_ref, packet.idempotency_key],
            map_root,
        ).optional().map_err(|_| ActionRequestErrorV1::PersistenceFailed)?;
        let (root, disposition) = if let Some(root) = existing {
            validate_root(&root)?;
            if canonical_utc_timestamp_millis_v1(at)
                < canonical_utc_timestamp_millis_v1(&root.created_at)
            {
                return Err(ActionRequestErrorV1::InvalidInput);
            }
            let kind = if root.packet_sha256 == packet_sha256 {
                "replay"
            } else {
                "conflict"
            };
            append_observation(&transaction, &root, kind, &packet_sha256, at)?;
            (root, kind)
        } else {
            let mut root = ActionRequestRootV1 {
                request_id: String::new(),
                requester_ref: session.identity_ref,
                session_id: session.session_id,
                project_ref: packet.project_ref.clone(),
                resource_ref: proposal.target.resource_ref.clone(),
                idempotency_key: packet.idempotency_key.clone(),
                packet_id: packet.packet_id.clone(),
                packet_sha256,
                action_digest: digest(
                    "lnsat.action_request.action.v1",
                    &json!({"kind":proposal.action.kind,"arguments":proposal.action.arguments}),
                )?,
                target_digest: digest(
                    "lnsat.action_request.target.v1",
                    &json!({"resource_ref":proposal.target.resource_ref,"identity":proposal.target.identity}),
                )?,
                configuration_digest: proposal.configuration_digest,
                created_at: at.to_owned(),
                evidence_digest: String::new(),
            };
            root.request_id = root_id(&root)?;
            root.evidence_digest = root_digest(&root)?;
            transaction.execute(
                "INSERT INTO lnsat_action_requests (request_id,contract,requester_ref,session_id,project_ref,resource_ref,idempotency_key,packet_id,packet_sha256,action_digest,target_digest,configuration_digest,created_at,evidence_digest) VALUES (?1,'lnsat.action_request.v1',?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13)",
                params![root.request_id,root.requester_ref,root.session_id,root.project_ref,root.resource_ref,root.idempotency_key,root.packet_id,root.packet_sha256,root.action_digest,root.target_digest,root.configuration_digest,root.created_at,root.evidence_digest],
            ).map_err(|_| ActionRequestErrorV1::PersistenceFailed)?;
            (root, "created")
        };
        transaction
            .commit()
            .map_err(|_| ActionRequestErrorV1::PersistenceFailed)?;
        Ok((root, disposition))
    }

    fn evaluate_action_request_v1(
        &mut self,
        root: &ActionRequestRootV1,
        packet: &PacketEnvelopeV1,
        token: &str,
        csrf: &str,
        at: &str,
    ) -> Result<(), ActionRequestErrorV1> {
        let transaction = self
            .connection
            .transaction_with_behavior(TransactionBehavior::Immediate)
            .map_err(|_| ActionRequestErrorV1::PersistenceFailed)?;
        let outcome = (|| {
            let (session, _) = authenticate(&transaction, token, Some(csrf), at)?;
            if !session
                .role
                .allows_control(LocalControlPermissionV1::RequestAction)
                || session.identity_ref != root.requester_ref
                || session.session_id != root.session_id
            {
                return Err(ActionRequestErrorV1::AuthorizationRejected);
            }
            let decision = decide_packet_envelope_policy_v1(packet, at)
                .map_err(|_| ActionRequestErrorV1::InvalidInput)?;
            let packet_write = append_packet_in_transaction_v1(&transaction, packet)
                .map_err(|_| ActionRequestErrorV1::PersistenceFailed)?;
            if !packet_write.created {
                return Err(ActionRequestErrorV1::EvidenceDrift);
            }
            append_policy_in_transaction_v1(&transaction, &decision)
                .map_err(|_| ActionRequestErrorV1::PersistenceFailed)?;
            append_evaluation(
                &transaction,
                root,
                Some(decision.decision_id),
                "policy_recorded",
                at,
            )
        })();
        if let Err(error) = outcome {
            // Only a confirmed rollback permits a durable failure assertion.
            transaction
                .rollback()
                .map_err(|_| ActionRequestErrorV1::PersistenceFailed)?;
            let reason = if error == ActionRequestErrorV1::InvalidInput {
                "evaluation_rejected"
            } else {
                "persistence_failed"
            };
            let failed = self
                .connection
                .transaction_with_behavior(TransactionBehavior::Immediate)
                .map_err(|_| ActionRequestErrorV1::PersistenceFailed)?;
            append_evaluation(&failed, root, None, reason, at)?;
            return failed
                .commit()
                .map_err(|_| ActionRequestErrorV1::PersistenceFailed);
        }
        // A failed acknowledgment leaves the root discoverable; retry never reevaluates.
        transaction
            .commit()
            .map_err(|_| ActionRequestErrorV1::PersistenceFailed)
    }

    /// Reads evidence for the active owner or original requester identity only.
    /// Authentication may append bounded session activity, reported separately.
    ///
    /// # Errors
    /// Returns a fixed authentication/storage error. Missing and cross-identity roots
    /// both return `None`; inconsistent linked evidence returns a degraded record.
    pub fn read_authenticated_action_request_v1(
        &mut self,
        request_id: &str,
        token: &str,
        proof: &str,
        at: &str,
    ) -> Result<Option<ActionRequestRecordV1>, ActionRequestErrorV1> {
        if !valid_request_id(request_id) {
            return Err(ActionRequestErrorV1::InvalidInput);
        }
        let transaction = self
            .connection
            .transaction_with_behavior(TransactionBehavior::Immediate)
            .map_err(|_| ActionRequestErrorV1::PersistenceFailed)?;
        let (session, touched) = authenticate(&transaction, token, Some(proof), at)?;
        if !session
            .role
            .allows_control(LocalControlPermissionV1::ReadEvidence)
        {
            return Err(ActionRequestErrorV1::AuthorizationRejected);
        }
        let root = transaction
            .query_row(
                &format!("{ROOT_SELECT} WHERE request_id=?1 AND (?2=1 OR requester_ref=?3)"),
                params![
                    request_id,
                    session.role == LocalIdentityRoleV1::Owner,
                    session.identity_ref
                ],
                map_root,
            )
            .optional()
            .map_err(|_| ActionRequestErrorV1::PersistenceFailed)?;
        let record = root.map(|root| {
            build_record(&transaction, root, touched)
                .unwrap_or_else(|_| degraded(request_id, touched))
        });
        transaction
            .commit()
            .map_err(|_| ActionRequestErrorV1::PersistenceFailed)?;
        Ok(record)
    }
}

fn authenticate(
    connection: &Connection,
    token: &str,
    csrf: Option<&str>,
    at: &str,
) -> Result<(super::LocalSessionRecordV1, bool), ActionRequestErrorV1> {
    let verified = verify_and_touch_local_session_on_connection_v1(
        connection,
        token,
        csrf,
        at,
        LOCAL_SESSION_IDLE_TIMEOUT_DEFAULT_SECONDS_V1,
    )
    .map_err(|_| ActionRequestErrorV1::AuthorizationRejected)?;
    let LocalSessionActivityVerificationV1::Verified(activity) = verified else {
        return Err(ActionRequestErrorV1::AuthorizationRejected);
    };
    Ok((activity.session, activity.touched))
}

const ROOT_SELECT: &str = "SELECT request_id,requester_ref,session_id,project_ref,resource_ref,idempotency_key,packet_id,packet_sha256,action_digest,target_digest,configuration_digest,created_at,evidence_digest FROM lnsat_action_requests";
fn map_root(row: &rusqlite::Row<'_>) -> rusqlite::Result<ActionRequestRootV1> {
    Ok(ActionRequestRootV1 {
        request_id: row.get(0)?,
        requester_ref: row.get(1)?,
        session_id: row.get(2)?,
        project_ref: row.get(3)?,
        resource_ref: row.get(4)?,
        idempotency_key: row.get(5)?,
        packet_id: row.get(6)?,
        packet_sha256: row.get(7)?,
        action_digest: row.get(8)?,
        target_digest: row.get(9)?,
        configuration_digest: row.get(10)?,
        created_at: row.get(11)?,
        evidence_digest: row.get(12)?,
    })
}

pub(super) fn digest(domain: &str, value: &impl Serialize) -> Result<String, ActionRequestErrorV1> {
    let encoded = serde_json::to_vec(value).map_err(|_| ActionRequestErrorV1::EvidenceDrift)?;
    let mut hash = Sha256::new();
    hash.update(domain);
    hash.update(b"\n");
    hash.update(encoded);
    let mut value = String::from("sha256:");
    for byte in hash.finalize() {
        write!(&mut value, "{byte:02x}").map_err(|_| ActionRequestErrorV1::EvidenceDrift)?;
    }
    Ok(value)
}
fn root_id(root: &ActionRequestRootV1) -> Result<String, ActionRequestErrorV1> {
    let value = digest(
        "lnsat.action_request.id.v1",
        &json!([
            root.requester_ref,
            root.project_ref,
            root.resource_ref,
            root.idempotency_key,
            root.packet_sha256
        ]),
    )?;
    Ok(format!("arq_{}", &value[7..]))
}
fn root_digest(root: &ActionRequestRootV1) -> Result<String, ActionRequestErrorV1> {
    digest(
        "lnsat.action_request.root.v1",
        &json!([
            "lnsat.action_request.v1",
            root.request_id,
            root.requester_ref,
            root.session_id,
            root.project_ref,
            root.resource_ref,
            root.idempotency_key,
            root.packet_id,
            root.packet_sha256,
            root.action_digest,
            root.target_digest,
            root.configuration_digest,
            root.created_at
        ]),
    )
}
fn valid_digest(value: &str) -> bool {
    value.len() == 71
        && value.starts_with("sha256:")
        && value.as_bytes()[7..]
            .iter()
            .all(|b| b.is_ascii_digit() || (b'a'..=b'f').contains(b))
}
fn valid_request_id(value: &str) -> bool {
    value.len() == 68
        && value.starts_with("arq_")
        && value.as_bytes()[4..]
            .iter()
            .all(|b| b.is_ascii_digit() || (b'a'..=b'f').contains(b))
}
fn validate_root(root: &ActionRequestRootV1) -> Result<(), ActionRequestErrorV1> {
    if root_id(root)? != root.request_id
        || root_digest(root)? != root.evidence_digest
        || !is_valid_reference_v1(&root.requester_ref)
        || !is_valid_reference_v1(&root.project_ref)
        || !is_valid_reference_v1(&root.resource_ref)
        || root.idempotency_key.is_empty()
        || root.idempotency_key.len() > 256
        || canonical_utc_timestamp_millis_v1(&root.created_at).is_none()
        || [
            &root.packet_sha256,
            &root.action_digest,
            &root.target_digest,
            &root.configuration_digest,
        ]
        .iter()
        .any(|v| !valid_digest(v))
    {
        return Err(ActionRequestErrorV1::EvidenceDrift);
    }
    Ok(())
}
fn evaluation_digest(
    root: &ActionRequestRootV1,
    e: &ActionRequestEvaluationV1,
) -> Result<String, ActionRequestErrorV1> {
    digest(
        "lnsat.action_request.evaluation.v1",
        &json!([
            root.request_id,
            root.packet_id,
            root.packet_sha256,
            root.project_ref,
            root.resource_ref,
            e.status,
            e.policy_decision_id,
            e.reason_code,
            e.recorded_at
        ]),
    )
}
fn append_evaluation(
    connection: &Connection,
    root: &ActionRequestRootV1,
    policy: Option<String>,
    reason: &str,
    at: &str,
) -> Result<(), ActionRequestErrorV1> {
    let mut e = ActionRequestEvaluationV1 {
        status: if policy.is_some() {
            "recorded"
        } else {
            "failed"
        }
        .to_owned(),
        policy_decision_id: policy,
        reason_code: reason.to_owned(),
        recorded_at: at.to_owned(),
        evidence_digest: String::new(),
    };
    e.evidence_digest = evaluation_digest(root, &e)?;
    connection.execute("INSERT INTO lnsat_action_request_evaluations(request_id,packet_id,packet_sha256,project_ref,resource_ref,status,policy_decision_id,reason_code,recorded_at,evidence_digest) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10)", params![root.request_id,root.packet_id,root.packet_sha256,root.project_ref,root.resource_ref,e.status,e.policy_decision_id,e.reason_code,e.recorded_at,e.evidence_digest]).map_err(|_| ActionRequestErrorV1::PersistenceFailed)?;
    Ok(())
}
fn read_evaluation(
    connection: &Connection,
    root: &ActionRequestRootV1,
) -> Result<Option<ActionRequestEvaluationV1>, ActionRequestErrorV1> {
    let row=connection.query_row("SELECT status,policy_decision_id,reason_code,recorded_at,evidence_digest,packet_id,packet_sha256,project_ref,resource_ref FROM lnsat_action_request_evaluations WHERE request_id=?1", [&root.request_id], |r| Ok((ActionRequestEvaluationV1{status:r.get(0)?,policy_decision_id:r.get(1)?,reason_code:r.get(2)?,recorded_at:r.get(3)?,evidence_digest:r.get(4)?},r.get::<_,String>(5)?,r.get::<_,String>(6)?,r.get::<_,String>(7)?,r.get::<_,String>(8)?))).optional().map_err(|_|ActionRequestErrorV1::PersistenceFailed)?;
    let Some((e, packet, hash, project, resource)) = row else {
        return Ok(None);
    };
    if packet != root.packet_id
        || hash != root.packet_sha256
        || project != root.project_ref
        || resource != root.resource_ref
        || evaluation_digest(root, &e)? != e.evidence_digest
        || canonical_utc_timestamp_millis_v1(&e.recorded_at).is_none()
        || e.recorded_at != root.created_at
        || !matches!(
            (
                e.status.as_str(),
                e.policy_decision_id.is_some(),
                e.reason_code.as_str()
            ),
            ("recorded", true, "policy_recorded")
                | (
                    "failed",
                    false,
                    "evaluation_rejected" | "persistence_failed"
                )
        )
    {
        return Err(ActionRequestErrorV1::EvidenceDrift);
    }
    Ok(Some(e))
}
fn observation_digest(
    root: &ActionRequestRootV1,
    o: &ActionRequestObservationV1,
) -> Result<String, ActionRequestErrorV1> {
    digest(
        "lnsat.action_request.observation.v1",
        &json!([root.request_id, o.kind, o.submitted_digest, o.observed_at]),
    )
}
fn append_observation(
    connection: &Connection,
    root: &ActionRequestRootV1,
    kind: &str,
    submitted: &str,
    at: &str,
) -> Result<(), ActionRequestErrorV1> {
    let o = ActionRequestObservationV1 {
        kind: kind.to_owned(),
        submitted_digest: submitted.to_owned(),
        observed_at: at.to_owned(),
        evidence_digest: String::new(),
    };
    let evidence = observation_digest(root, &o)?;
    connection.execute("INSERT INTO lnsat_action_request_observations(request_id,kind,submitted_digest,observed_at,evidence_digest) VALUES(?1,?2,?3,?4,?5) ON CONFLICT(request_id,kind) DO NOTHING",params![root.request_id,kind,submitted,at,evidence]).map_err(|_|ActionRequestErrorV1::PersistenceFailed)?;
    Ok(())
}
fn read_observations(
    connection: &Connection,
    root: &ActionRequestRootV1,
) -> Result<Vec<ActionRequestObservationV1>, ActionRequestErrorV1> {
    let mut statement=connection.prepare("SELECT kind,submitted_digest,observed_at,evidence_digest FROM lnsat_action_request_observations WHERE request_id=?1 ORDER BY kind LIMIT 3").map_err(|_|ActionRequestErrorV1::PersistenceFailed)?;
    let observations = statement
        .query_map([&root.request_id], |r| {
            Ok(ActionRequestObservationV1 {
                kind: r.get(0)?,
                submitted_digest: r.get(1)?,
                observed_at: r.get(2)?,
                evidence_digest: r.get(3)?,
            })
        })
        .map_err(|_| ActionRequestErrorV1::PersistenceFailed)?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|_| ActionRequestErrorV1::PersistenceFailed)?;
    if observations.len() > 2 {
        return Err(ActionRequestErrorV1::EvidenceDrift);
    }
    for o in &observations {
        if !matches!(o.kind.as_str(), "replay" | "conflict")
            || !valid_digest(&o.submitted_digest)
            || (o.kind == "replay") != (o.submitted_digest == root.packet_sha256)
            || canonical_utc_timestamp_millis_v1(&o.observed_at)
                .zip(canonical_utc_timestamp_millis_v1(&root.created_at))
                .is_none_or(|(a, b)| a < b)
            || observation_digest(root, o)? != o.evidence_digest
        {
            return Err(ActionRequestErrorV1::EvidenceDrift);
        }
    }
    Ok(observations)
}
fn evaluation_state(e: Option<&ActionRequestEvaluationV1>) -> &'static str {
    match e.map(|e| e.status.as_str()) {
        Some("recorded") => "policy_recorded",
        Some("failed") => "evaluation_failed",
        _ => "evaluation_unknown",
    }
}
fn build_record(
    connection: &Connection,
    root: ActionRequestRootV1,
    touched: bool,
) -> Result<ActionRequestRecordV1, ActionRequestErrorV1> {
    validate_root(&root)?;
    let evaluation = read_evaluation(connection, &root)?;
    let observations = read_observations(connection, &root)?;
    let evidence = match &evaluation {
        Some(e) if e.status == "recorded" => Some(projection::project(connection, &root, e)?),
        _ => None,
    };
    let record = ActionRequestRecordV1 {
        schema: "lnsat.action_request_record.v1",
        status: "complete",
        request_id: root.request_id.clone(),
        evaluation_state: evaluation_state(evaluation.as_ref()),
        request: Some(root),
        evaluation,
        observations,
        evidence,
        security_activity_touched: touched,
    };
    if serde_json::to_vec(&record)
        .map_err(|_| ActionRequestErrorV1::EvidenceDrift)?
        .len()
        > ACTION_REQUEST_RECORD_MAX_BYTES_V1
    {
        return Err(ActionRequestErrorV1::ResponseLimit);
    }
    Ok(record)
}
fn degraded(request_id: &str, touched: bool) -> ActionRequestRecordV1 {
    ActionRequestRecordV1 {
        schema: "lnsat.action_request_record.v1",
        status: "degraded",
        request_id: request_id.to_owned(),
        evaluation_state: "evaluation_unknown",
        request: None,
        evaluation: None,
        observations: Vec::new(),
        evidence: None,
        security_activity_touched: touched,
    }
}
