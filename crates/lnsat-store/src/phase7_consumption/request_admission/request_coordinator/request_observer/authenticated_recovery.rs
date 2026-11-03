//! Private authenticated synthetic recovery admission. Selected only by cfg(test).
//!
//! Credentials remain borrowed control inputs. Observation is unlocked and
//! receives only the inherited bounded expectation. Current Owner authority is
//! fenced on the actual result Immediate transaction, never on a second writer.
//! This is a trusted fixture contract, not transport or physical runtime proof.

use super::*;
use crate::action_request::ActionRequestRecordV1;
use crate::phase7_consumption::request_admission::read_git_request_parents_v1;
use crate::phase7_git_adapter::read_phase8_operation_v1;
use crate::{
    Connection, LOCAL_SESSION_IDLE_TIMEOUT_DEFAULT_SECONDS_V1, LocalControlPermissionV1,
    LocalIdentityRoleV1, LocalSessionActivityVerificationV1, LocalSessionRecordV1,
    canonical_utc_timestamp_millis_v1, verify_and_touch_local_session_on_connection_v1,
};

#[cfg(test)]
mod tests;

#[derive(Clone, Copy, Eq, PartialEq)]
enum RecoveryModeV1 {
    InspectOnly,
    ReconcileUnknown,
}

/// Borrowed secrets have no Debug, Clone or serialization implementation.
struct RecoveryCredentialsV1<'a> {
    token: &'a str,
    csrf: &'a str,
}

enum AuthenticatedRecoveryOutcomeV1 {
    Denied,
    ReadOnlyProjection(Box<ActionRequestRecordV1>),
    ReconciledProjection(Box<ActionRequestRecordV1>),
    Unconfirmed,
}

/// Private ephemeral admission, not execution authority or an observer input.
struct RecoveryAdmissionV1 {
    scope: Arc<()>,
    caller: LocalSessionRecordV1,
    mode: RecoveryModeV1,
    expected: ObserverExpectationV1,
    entry: Phase8OperationReadbackV1,
    touched: bool,
}

fn authenticate_v1(
    connection: &Connection,
    credentials: &RecoveryCredentialsV1<'_>,
    at: &str,
    requester: &str,
    mode: RecoveryModeV1,
    admitted: Option<&LocalSessionRecordV1>,
) -> Result<(LocalSessionRecordV1, bool), ()> {
    if credentials.token.is_empty() || credentials.csrf.is_empty() {
        return Err(());
    }
    let verified = verify_and_touch_local_session_on_connection_v1(
        connection,
        credentials.token,
        Some(credentials.csrf),
        at,
        LOCAL_SESSION_IDLE_TIMEOUT_DEFAULT_SECONDS_V1,
    )
    .map_err(|_| ())?;
    let LocalSessionActivityVerificationV1::Verified(activity) = verified else {
        return Err(());
    };
    let caller = activity.session;
    if !caller
        .role
        .allows_control(LocalControlPermissionV1::ReadEvidence)
        || (caller.role != LocalIdentityRoleV1::Owner && caller.identity_ref != requester)
        || (mode == RecoveryModeV1::ReconcileUnknown && caller.role != LocalIdentityRoleV1::Owner)
        || admitted.is_some_and(|old| {
            old.identity_ref != caller.identity_ref
                || old.session_id != caller.session_id
                || old.role != caller.role
        })
    {
        return Err(());
    }
    Ok((caller, activity.touched))
}

/// All binding and full-readback joins use the supplied coherent connection.
fn context_v1(
    connection: &Connection,
    request_id: &str,
    derived: &DerivedExecutionRequestV1,
    operation_id: &str,
    attempt_id: &str,
    stamp: Arc<()>,
) -> Result<(ObserverExpectationV1, Phase8OperationReadbackV1), ()> {
    let binding = verify_binding_v1(connection, operation_id).map_err(|_| ())?;
    let parents = read_git_request_parents_v1(
        connection,
        &derived.request.project_ref,
        &derived.request.resource_ref,
        operation_id,
    )
    .map_err(|_| ())?;
    let entry = read_phase8_operation_v1(connection, operation_id)
        .map_err(|_| ())?
        .ok_or(())?;
    super::super::validate_recovery_entry_v1(
        &parents,
        &binding.launch_digest,
        request_id,
        derived,
        operation_id,
        attempt_id,
        &entry,
    )?;
    let target = expected_target_v1(derived)?;
    if !expected_context_is_bounded_v1(request_id, operation_id, attempt_id, &target) {
        return Err(());
    }
    Ok((
        ObserverExpectationV1 {
            request_id: request_id.to_owned(),
            operation_id: operation_id.to_owned(),
            operation_attempt_id: attempt_id.to_owned(),
            request_digest: derived.request_digest,
            launch_digest: binding.launch_digest,
            tool_arguments_digest: phase7_git_tool_arguments_digest_v1(derived).map_err(|_| ())?,
            target,
            invocation_stamp: stamp,
        },
        entry,
    ))
}

fn sample_v1<C>(clock: &mut C, previous: Option<u64>) -> Result<(String, u64), ()>
where
    C: FnMut() -> Result<String, ()>,
{
    let at = clock()?;
    let instant = canonical_utc_timestamp_millis_v1(&at).ok_or(())?;
    if previous.is_some_and(|old| instant < old) {
        return Err(());
    }
    Ok((at, instant))
}

/// No dispatch port exists. All failures use bounded outcomes without errors,
/// credentials, raw observations or internal coordinator readbacks.
#[allow(clippy::too_many_arguments, clippy::too_many_lines)]
#[allow(clippy::needless_pass_by_value)] // Consume the private non-Clone credential envelope per invocation.
fn recover_authenticated_request_v1<C, O, P, A>(
    handle: &Arc<Mutex<SqliteStore>>,
    request_id: &str,
    derived: &DerivedExecutionRequestV1,
    operation_id: &str,
    attempt_id: &str,
    mode: RecoveryModeV1,
    credentials: RecoveryCredentialsV1<'_>,
    mut clock: C,
    policy: TestOnlyObserverPolicyV1,
    observer: O,
    recorded_at: &str,
    hooks: (P, A),
    counts: &ObserverInvocationCountsV1,
) -> AuthenticatedRecoveryOutcomeV1
where
    C: FnMut() -> Result<String, ()>,
    O: FnOnce(ObserverExpectationV1) -> SyntheticObserverResultV1,
    P: FnOnce() -> Result<(), Phase7GitAdapterErrorV1>,
    A: FnOnce() -> Result<(), Phase7GitAdapterErrorV1>,
{
    let Ok((at, mut last)) = sample_v1(&mut clock, None) else {
        return AuthenticatedRecoveryOutcomeV1::Denied;
    };
    let mut admission = {
        let Ok(store) = handle.try_lock() else {
            return AuthenticatedRecoveryOutcomeV1::Unconfirmed;
        };
        let Ok(tx) = Transaction::new_unchecked(&store.connection, TransactionBehavior::Immediate)
        else {
            return AuthenticatedRecoveryOutcomeV1::Denied;
        };
        // Authenticate before looking up or disclosing the selected object.
        let Ok((caller, touched)) = authenticate_v1(
            &tx,
            &credentials,
            &at,
            &derived.request.requester_ref,
            mode,
            None,
        ) else {
            return AuthenticatedRecoveryOutcomeV1::Denied;
        };
        let Ok((expected, entry)) = context_v1(
            &tx,
            request_id,
            derived,
            operation_id,
            attempt_id,
            Arc::new(()),
        ) else {
            return AuthenticatedRecoveryOutcomeV1::Denied;
        };
        if mode == RecoveryModeV1::ReconcileUnknown
            && !matches!(entry.state.as_str(), "completed" | "outcome_unknown")
        {
            return AuthenticatedRecoveryOutcomeV1::Denied;
        }
        if tx.commit().is_err() {
            return AuthenticatedRecoveryOutcomeV1::Unconfirmed;
        }
        RecoveryAdmissionV1 {
            scope: Arc::clone(&store.request_dispatch_scope),
            caller,
            mode,
            expected,
            entry,
            touched,
        }
    };
    if mode == RecoveryModeV1::InspectOnly || admission.entry.state == "completed" {
        return projection_v1(handle, &admission, derived, &credentials, &at, false);
    }

    counts.observers.fetch_add(1, Ordering::SeqCst);
    let Ok(SyntheticObserverResultV1::Captured(capture)) =
        std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            observer(admission.expected.clone())
        }))
    else {
        return AuthenticatedRecoveryOutcomeV1::Unconfirmed;
    };
    let Ok((at, instant)) = sample_v1(&mut clock, Some(last)) else {
        return AuthenticatedRecoveryOutcomeV1::Unconfirmed;
    };
    last = instant;
    let Ok(mut store) = handle.try_lock() else {
        return AuthenticatedRecoveryOutcomeV1::Unconfirmed;
    };
    if !Arc::ptr_eq(&store.request_dispatch_scope, &admission.scope) {
        return AuthenticatedRecoveryOutcomeV1::Unconfirmed;
    }
    let early = (|| {
        let tx = Transaction::new_unchecked(&store.connection, TransactionBehavior::Immediate)
            .map_err(|_| ())?;
        let (caller, touched) = authenticate_v1(
            &tx,
            &credentials,
            &at,
            &derived.request.requester_ref,
            mode,
            Some(&admission.caller),
        )?;
        let (expected, entry) = context_v1(
            &tx,
            request_id,
            derived,
            operation_id,
            attempt_id,
            Arc::clone(&admission.expected.invocation_stamp),
        )?;
        if caller != admission.caller
            || entry != admission.entry
            || !expected.same_context_as(&admission.expected)
            || !admit_capture_v1(policy, &admission.expected, &capture)
        {
            return Err(());
        }
        tx.commit().map_err(|_| ())?;
        Ok(touched)
    })();
    let Ok(touched) = early else {
        return AuthenticatedRecoveryOutcomeV1::Unconfirmed;
    };
    admission.touched |= touched;
    counts
        .proof_constructor_calls
        .fetch_add(1, Ordering::SeqCst);
    let Ok(proof) = store.verify_request_git_result_for_test_v1(
        request_id,
        derived,
        operation_id,
        &capture.target,
        &capture.result,
    ) else {
        return AuthenticatedRecoveryOutcomeV1::Unconfirmed;
    };
    let mut final_at = at;
    let mut final_touched = false;
    let mut fence = |tx: &Transaction<'_>| {
        let (at, instant) = sample_v1(&mut clock, Some(last))
            .map_err(|()| Phase7GitAdapterErrorV1::EvidenceDrift)?;
        let (_, touched) = authenticate_v1(
            tx,
            &credentials,
            &at,
            &derived.request.requester_ref,
            mode,
            Some(&admission.caller),
        )
        .map_err(|()| Phase7GitAdapterErrorV1::EvidenceDrift)?;
        let (current, entry) = context_v1(
            tx,
            request_id,
            derived,
            operation_id,
            attempt_id,
            Arc::clone(&admission.expected.invocation_stamp),
        )
        .map_err(|()| Phase7GitAdapterErrorV1::EvidenceDrift)?;
        if entry != admission.entry
            || !current.same_context_as(&admission.expected)
            || entry.state != "outcome_unknown"
        {
            return Err(Phase7GitAdapterErrorV1::EvidenceDrift);
        }
        last = instant;
        final_at = at;
        final_touched = touched;
        Ok(())
    };
    let Ok(completed) = store.persist_authenticated_request_git_result_v1(
        proof,
        recorded_at,
        &mut fence,
        hooks.0,
        hooks.1,
    ) else {
        return AuthenticatedRecoveryOutcomeV1::Unconfirmed;
    };
    admission.entry = completed;
    admission.touched |= final_touched;
    drop(store);
    let Ok((projection_at, _)) =
        sample_v1(&mut clock, canonical_utc_timestamp_millis_v1(&final_at))
    else {
        return AuthenticatedRecoveryOutcomeV1::Unconfirmed;
    };
    projection_v1(
        handle,
        &admission,
        derived,
        &credentials,
        &projection_at,
        true,
    )
}

fn projection_matches_v1(
    record: &ActionRequestRecordV1,
    expected: &Phase8OperationReadbackV1,
) -> bool {
    let Some(evidence) = record.evidence.as_ref() else {
        return false;
    };
    let Some(attempt) = expected.attempt.as_ref() else {
        return false;
    };
    let one = |kind: &str| {
        evidence
            .get(kind)
            .and_then(serde_json::Value::as_array)
            .filter(|rows| rows.len() == 1)
            .and_then(|rows| rows.first())
    };
    if one("operations")
        .and_then(|row| row.get("operation_id"))
        .and_then(serde_json::Value::as_str)
        != Some(expected.operation_id.as_str())
        || one("operation_attempts")
            .and_then(|row| row.get("operation_attempt_id"))
            .and_then(serde_json::Value::as_str)
            != Some(attempt.operation_attempt_id.as_str())
    {
        return false;
    }
    match &expected.receipt_id {
        Some(receipt) => {
            one("receipts")
                .and_then(|row| row.get("receipt_id"))
                .and_then(serde_json::Value::as_str)
                == Some(receipt.as_str())
        }
        None => evidence
            .get("receipts")
            .and_then(serde_json::Value::as_array)
            .is_some_and(Vec::is_empty),
    }
}

fn projection_v1(
    handle: &Arc<Mutex<SqliteStore>>,
    admission: &RecoveryAdmissionV1,
    derived: &DerivedExecutionRequestV1,
    credentials: &RecoveryCredentialsV1<'_>,
    at: &str,
    reconciled: bool,
) -> AuthenticatedRecoveryOutcomeV1 {
    let Ok(mut store) = handle.try_lock() else {
        return AuthenticatedRecoveryOutcomeV1::Unconfirmed;
    };
    if !Arc::ptr_eq(&store.request_dispatch_scope, &admission.scope) {
        return AuthenticatedRecoveryOutcomeV1::Unconfirmed;
    }
    let Ok(Some(mut record)) = store.read_authenticated_action_request_v1(
        &admission.expected.request_id,
        credentials.token,
        credentials.csrf,
        at,
    ) else {
        return AuthenticatedRecoveryOutcomeV1::Unconfirmed;
    };
    let checked = (|| {
        let tx = Transaction::new_unchecked(&store.connection, TransactionBehavior::Immediate)
            .map_err(|_| ())?;
        let (_, touched) = authenticate_v1(
            &tx,
            credentials,
            at,
            &derived.request.requester_ref,
            admission.mode,
            Some(&admission.caller),
        )?;
        let (current, entry) = context_v1(
            &tx,
            &admission.expected.request_id,
            derived,
            &admission.expected.operation_id,
            &admission.expected.operation_attempt_id,
            Arc::clone(&admission.expected.invocation_stamp),
        )?;
        if record.status != "complete"
            || record.request_id != admission.expected.request_id
            || !current.same_context_as(&admission.expected)
            || entry != admission.entry
            || (reconciled && entry.state != "completed")
            || !projection_matches_v1(&record, &entry)
        {
            return Err(());
        }
        record.security_activity_touched |= admission.touched || touched;
        tx.commit().map_err(|_| ())?;
        Ok(())
    })();
    if checked.is_err() {
        return AuthenticatedRecoveryOutcomeV1::Unconfirmed;
    }
    if reconciled {
        AuthenticatedRecoveryOutcomeV1::ReconciledProjection(Box::new(record))
    } else {
        AuthenticatedRecoveryOutcomeV1::ReadOnlyProjection(Box::new(record))
    }
}
