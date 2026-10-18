//! Private request-bound reservation prerequisite. No production dispatch entry.
//!
//! Final admission and launch reservation share one immediate transaction. The
//! existing consumption plus operation-attempt record is the one-use latch. A
//! reservation is not a receipt, and dropping it cannot restore authority.

use super::{
    Connection, LocalControlPermissionV1, Phase7CapabilityConsumptionRecordV1,
    Phase7CapabilityRedemptionInputV1, Phase7CapabilitySecretV1, Phase7PersistenceErrorV1,
    SqliteStore, SystemTime, Transaction, canonical_millis, canonical_system_time_v1,
    consumption_public_record, digest_fields, params, read_validated_attempt_by_id,
    read_validated_nonce_by_id, select_authorization_by_id,
    select_consumption_by_authorization_or_operation, select_operation_by_id,
    validate_authorization_source_window, validate_phase7_session_reference,
    validate_stored_authorization, validate_stored_consumption, validate_stored_operation,
};
use crate::action_request::validate_execution_root_v1;
use crate::phase7_git_adapter::reserve_source_request_attempt_v1;
use lnsat_contracts::{DerivedExecutionRequestV1, verify_derived_execution_request_v1};

pub(crate) const ADAPTER_REF: &str = "adapter:source-only:request-admission";
pub(crate) const ADAPTER_VERSION: &str = "v1";
pub(crate) const PROTOCOL: &str = "lnsat.request-execution-admission.source.v1";
const SUPERVISOR: &str = "supervisor:source-only:fake";

/// Only a fresh committed reservation constructs this value. It is deliberately
/// neither Clone nor serializable. No real adapter accepts it.
#[derive(Debug)]
pub(crate) struct RequestLaunchReservationV1 {
    request_id: String,
    operation_id: String,
    operation_attempt_id: String,
    launch_digest: [u8; 32],
    expires_at: String,
}

impl RequestLaunchReservationV1 {
    pub(crate) fn request_id(&self) -> &str {
        &self.request_id
    }
    pub(crate) fn operation_id(&self) -> &str {
        &self.operation_id
    }
    pub(crate) fn operation_attempt_id(&self) -> &str {
        &self.operation_attempt_id
    }
    pub(crate) const fn launch_digest(&self) -> &[u8; 32] {
        &self.launch_digest
    }
    pub(crate) fn expires_at(&self) -> &str {
        &self.expires_at
    }
}

impl SqliteStore {
    /// Source-only reservation; there is no HTTP, CLI, SDK or adapter route.
    /// Server time is selected after the transaction's write lock is acquired.
    pub(crate) fn reserve_request_execution_v1(
        &mut self,
        request_id: &str,
        derived: &DerivedExecutionRequestV1,
        redemption: &Phase7CapabilityRedemptionInputV1<'_>,
        capability: Phase7CapabilitySecretV1,
        local_auth: (&str, &str),
    ) -> Result<RequestLaunchReservationV1, Phase7PersistenceErrorV1> {
        self.reserve_request_execution_from_sources_v1(
            request_id,
            derived,
            redemption,
            capability,
            local_auth,
            (
                || canonical_system_time_v1(SystemTime::now()),
                || Ok(()),
                || Ok(()),
            ),
        )
    }

    #[cfg(test)]
    pub(crate) fn reserve_request_execution_with_sources_v1<C, P, A>(
        &mut self,
        request_id: &str,
        derived: &DerivedExecutionRequestV1,
        redemption: &Phase7CapabilityRedemptionInputV1<'_>,
        capability: Phase7CapabilitySecretV1,
        local_auth: (&str, &str),
        sources: (C, P, A),
    ) -> Result<RequestLaunchReservationV1, Phase7PersistenceErrorV1>
    where
        C: FnMut() -> Result<String, Phase7PersistenceErrorV1>,
        P: FnOnce() -> Result<(), Phase7PersistenceErrorV1>,
        A: FnOnce() -> Result<(), Phase7PersistenceErrorV1>,
    {
        self.reserve_request_execution_from_sources_v1(
            request_id, derived, redemption, capability, local_auth, sources,
        )
    }

    fn reserve_request_execution_from_sources_v1<C, P, A>(
        &mut self,
        request_id: &str,
        derived: &DerivedExecutionRequestV1,
        redemption: &Phase7CapabilityRedemptionInputV1<'_>,
        capability: Phase7CapabilitySecretV1,
        local_auth: (&str, &str),
        (clock, precommit, after_commit): (C, P, A),
    ) -> Result<RequestLaunchReservationV1, Phase7PersistenceErrorV1>
    where
        C: FnMut() -> Result<String, Phase7PersistenceErrorV1>,
        P: FnOnce() -> Result<(), Phase7PersistenceErrorV1>,
        A: FnOnce() -> Result<(), Phase7PersistenceErrorV1>,
    {
        verify_derived_execution_request_v1(derived)
            .map_err(|_| Phase7PersistenceErrorV1::InvalidInput)?;
        if derived.request.adapter.adapter_ref != ADAPTER_REF
            || derived.request.adapter.version != ADAPTER_VERSION
        {
            return Err(Phase7PersistenceErrorV1::SourceNotApproved);
        }
        let clock = std::cell::RefCell::new(clock);
        let (_, reservation) = self
            .redeem_phase7_local_execution_capability_with_transaction_hook_v1(
                redemption,
                capability,
                local_auth,
                (
                    || (clock.borrow_mut())(),
                    |transaction, consumption, at| {
                        validate_and_reserve_v1(
                            transaction,
                            request_id,
                            derived,
                            consumption,
                            at,
                            &mut *clock.borrow_mut(),
                        )
                    },
                    precommit,
                    after_commit,
                ),
            )?;
        // Exact capability replay does not invoke the hook and cannot mint a
        // replacement reservation, including after restart or lost response.
        reservation.ok_or(Phase7PersistenceErrorV1::RedemptionRejected)
    }
}

// Keep the final transaction's complete source checks and reservation writes
// together so no caller can accidentally omit a prerequisite.
#[allow(clippy::too_many_lines)]
fn validate_and_reserve_v1<C>(
    transaction: &Transaction<'_>,
    request_id: &str,
    derived: &DerivedExecutionRequestV1,
    consumption: &Phase7CapabilityConsumptionRecordV1,
    at: &str,
    clock: &mut C,
) -> Result<RequestLaunchReservationV1, Phase7PersistenceErrorV1>
where
    C: FnMut() -> Result<String, Phase7PersistenceErrorV1>,
{
    validate_execution_root_v1(transaction, request_id, derived)
        .map_err(|_| Phase7PersistenceErrorV1::SourceNotApproved)?;
    let authorization = select_authorization_by_id(
        transaction,
        &consumption.project_ref,
        &consumption.resource_ref,
        &consumption.authorization_id,
    )?
    .ok_or(Phase7PersistenceErrorV1::EvidenceDrift)?;
    let authorization = validate_stored_authorization(transaction, authorization)?;
    let attempt = read_validated_attempt_by_id(
        transaction,
        &consumption.project_ref,
        &consumption.resource_ref,
        &authorization.authorization_attempt_id,
    )?
    .ok_or(Phase7PersistenceErrorV1::EvidenceDrift)?;
    // Full approved source is rederived by read_validated_attempt.
    // This equality also binds approval IDs, sessions, audience and times.
    if attempt.request_digest != derived.request_digest {
        return Err(Phase7PersistenceErrorV1::EvidenceDrift);
    }
    let nonce = read_validated_nonce_by_id(
        transaction,
        &consumption.project_ref,
        &consumption.resource_ref,
        &authorization.nonce_id,
    )?
    .ok_or(Phase7PersistenceErrorV1::EvidenceDrift)?;
    validate_authorization_source_window(&attempt, &nonce, at)?;
    let requester = validate_phase7_session_reference(
        transaction,
        &attempt.requester_ref,
        &attempt.requester_session_ref,
        at,
    )?;
    let approver = validate_phase7_session_reference(
        transaction,
        &attempt.approver_ref,
        &attempt.approver_session_ref,
        at,
    )?;
    if !requester
        .session
        .role
        .allows_control(LocalControlPermissionV1::RequestAction)
        || !approver
            .session
            .role
            .allows_control(LocalControlPermissionV1::DecideApproval)
        || requester.session.identity_ref == approver.session.identity_ref
    {
        return Err(Phase7PersistenceErrorV1::SourceNotApproved);
    }
    let operation = select_operation_by_id(
        transaction,
        &consumption.project_ref,
        &consumption.resource_ref,
        &consumption.operation_id,
    )?
    .ok_or(Phase7PersistenceErrorV1::EvidenceDrift)?;
    let operation = validate_stored_operation(transaction, operation)?;
    if operation
        .events
        .last()
        .is_none_or(|event| event.state != "prepared")
    {
        return Err(Phase7PersistenceErrorV1::RedemptionRejected);
    }
    // Lock serialization plus this lineage check covers different
    // authorizations/approvals for the same immutable request root.
    let prior: bool = transaction.query_row(
        "SELECT EXISTS(SELECT 1 FROM lnsat_operation_attempts AS attempt
         JOIN lnsat_operations AS operation ON operation.operation_id=attempt.operation_id
         JOIN lnsat_execution_authorizations AS authorization ON authorization.authorization_id=operation.authorization_id
         WHERE authorization.policy_decision_id=?1)",
        [&attempt.policy_decision_id], |row| row.get(0))
        .map_err(|_| Phase7PersistenceErrorV1::PersistenceFailed)?;
    if prior {
        return Err(Phase7PersistenceErrorV1::RedemptionRejected);
    }
    // Re-sample after source verification, immediately before the
    // durable reservation writes. No physical deadline is claimed.
    let final_at = clock()?;
    let final_millis = canonical_millis(&final_at)?;
    if final_millis < canonical_millis(at)? {
        return Err(Phase7PersistenceErrorV1::ClockRejected);
    }
    if final_millis >= canonical_millis(&authorization.expires_at)?
        || final_millis >= canonical_millis(&operation.expires_at)?
        || final_millis >= canonical_millis(&nonce.expires_at)?
        || final_millis >= canonical_millis(&attempt.expires_at)?
        || final_millis >= requester.active_until_millis
        || final_millis >= approver.active_until_millis
    {
        return Err(Phase7PersistenceErrorV1::SourceNotApproved);
    }
    let launch_digest = reservation_digest(
        request_id,
        &attempt.request_digest,
        consumption,
        &authorization.expires_at,
    );
    let operation_attempt_id =
        reserve_source_request_attempt_v1(transaction, consumption, derived, launch_digest, at)
            .map_err(|_| Phase7PersistenceErrorV1::EvidenceDrift)?;
    Ok(RequestLaunchReservationV1 {
        request_id: request_id.to_owned(),
        operation_id: consumption.operation_id.clone(),
        operation_attempt_id,
        launch_digest,
        expires_at: authorization.expires_at,
    })
}

fn reservation_digest(
    request_id: &str,
    request_digest: &[u8; 32],
    consumption: &Phase7CapabilityConsumptionRecordV1,
    expires_at: &str,
) -> [u8; 32] {
    digest_fields(
        "lnsat.request-execution-admission.launch.v1",
        &[
            request_id.as_bytes(),
            request_digest,
            consumption.project_ref.as_bytes(),
            consumption.resource_ref.as_bytes(),
            consumption.authorization_id.as_bytes(),
            consumption.operation_id.as_bytes(),
            consumption.consumption_id.as_bytes(),
            ADAPTER_REF.as_bytes(),
            ADAPTER_VERSION.as_bytes(),
            PROTOCOL.as_bytes(),
            SUPERVISOR.as_bytes(),
            expires_at.as_bytes(),
            consumption.consumed_at.as_bytes(),
        ],
    )
}

/// Schema/readback integrity for the new closed protocol, including recovery.
/// No live session/window check here: historical evidence survives revocation.
pub(crate) fn verify_reservation_binding_v1(
    connection: &Connection,
    project_ref: &str,
    resource_ref: &str,
    operation_id: &str,
    stored_digest: &[u8; 32],
    created_at: &str,
) -> Result<(), Phase7PersistenceErrorV1> {
    let operation = select_operation_by_id(connection, project_ref, resource_ref, operation_id)?
        .ok_or(Phase7PersistenceErrorV1::EvidenceDrift)?;
    let operation = validate_stored_operation(connection, operation)?;
    let authorization = select_authorization_by_id(
        connection,
        project_ref,
        resource_ref,
        &operation.authorization_id,
    )?
    .ok_or(Phase7PersistenceErrorV1::EvidenceDrift)?;
    let authorization = validate_stored_authorization(connection, authorization)?;
    let attempt = read_validated_attempt_by_id(
        connection,
        project_ref,
        resource_ref,
        &authorization.authorization_attempt_id,
    )?
    .ok_or(Phase7PersistenceErrorV1::EvidenceDrift)?;
    let consumption = select_consumption_by_authorization_or_operation(
        connection,
        project_ref,
        &authorization.authorization_id,
        operation_id,
    )?
    .ok_or(Phase7PersistenceErrorV1::EvidenceDrift)?;
    let consumption = validate_stored_consumption(connection, consumption)?;
    let consumption = consumption_public_record(connection, &consumption)?;
    let request_id = crate::action_request::reservation_root_id_v1(connection, &attempt)
        .map_err(|_| Phase7PersistenceErrorV1::EvidenceDrift)?;
    let (count, has_result): (i64, bool) = connection.query_row(
        "SELECT (SELECT count(*) FROM lnsat_operation_attempts AS attempt
         JOIN lnsat_operations AS operation ON operation.operation_id=attempt.operation_id
         JOIN lnsat_execution_authorizations AS authorization ON authorization.authorization_id=operation.authorization_id
         WHERE authorization.policy_decision_id=?1),
         EXISTS(SELECT 1 FROM lnsat_operation_receipts WHERE operation_id=?2)
         OR EXISTS(SELECT 1 FROM lnsat_operation_reconciliations WHERE operation_id=?2)",
        params![attempt.policy_decision_id, operation_id], |row| Ok((row.get(0)?, row.get(1)?)),
    ).map_err(|_| Phase7PersistenceErrorV1::PersistenceFailed)?;
    if consumption.consumed_at != created_at
        || consumption.operation_id != operation_id
        || count != 1
        || has_result
        || operation
            .events
            .last()
            .is_none_or(|event| !matches!(event.state.as_str(), "dispatching" | "outcome_unknown"))
        || operation.adapter_ref != format!("{ADAPTER_REF}@{ADAPTER_VERSION}")
        || &reservation_digest(
            &request_id,
            &attempt.request_digest,
            &consumption,
            &authorization.expires_at,
        ) != stored_digest
    {
        return Err(Phase7PersistenceErrorV1::EvidenceDrift);
    }
    Ok(())
}
