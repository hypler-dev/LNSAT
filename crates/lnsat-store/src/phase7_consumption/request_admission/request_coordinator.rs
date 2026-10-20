//! Test-only request-bound coordinator. It composes existing authority and
//! result seams without adding a production dispatch, observer, or protocol.

use super::{
    GitRequestParentsV1, RequestFakeDispatchGuardV1, RequestLaunchReservationV1, RequestModeV1,
};
use crate::phase7_git_adapter::request_result::{
    ADAPTER_REF, ADAPTER_VERSION, PROTOCOL, verify_binding_v1,
};
use crate::{
    Phase7CapabilityRedemptionInputV1, Phase7CapabilitySecretV1, Phase7GitAdapterErrorV1,
    Phase7GitExecutionResultV1, Phase7GitRepositoryIdentityV1, Phase7PersistenceErrorV1,
    Phase8OperationReadbackV1, SqliteStore, TransactionBehavior,
};
use lnsat_contracts::DerivedExecutionRequestV1;
use rusqlite::Transaction;
use std::sync::{Arc, Mutex};

#[cfg(test)]
mod tests;

/// A trusted synthetic observer can report one independently predeclared
/// result, no result, or uncertainty. It cannot construct a proof.
pub(super) enum SyntheticObservationV1 {
    Reported {
        target: Phase7GitRepositoryIdentityV1,
        result: Box<Phase7GitExecutionResultV1>,
    },
    NoObservation,
    Uncertain,
}

/// Caller knowledge after one bounded coordinator invocation.
#[derive(Debug)]
pub(super) enum CoordinatorOutcomeV1 {
    Completed(Box<Phase8OperationReadbackV1>),
    Rejected,
    Unconfirmed,
    AttemptedUnconfirmed,
}

/// An owned reservation plus private, cleanup-only attempt identity.
///
/// This type is intentionally neither cloneable nor serializable. It can only
/// be consumed by the fresh guard phase or discarded. Dropping it is inert.
pub(super) struct CoordinatedReservationV1 {
    reservation: RequestLaunchReservationV1,
    cleanup: UnknownCleanupTicketV1,
}

/// Exact conservative-unknown marker inputs retained across the handoff.
struct UnknownCleanupTicketV1 {
    mode: RequestModeV1,
    store_scope: Arc<()>,
    request_id: String,
    operation_id: String,
    operation_attempt_id: String,
    launch_digest: [u8; 32],
}

impl UnknownCleanupTicketV1 {
    fn from_reservation(reservation: &RequestLaunchReservationV1) -> Self {
        Self {
            mode: reservation.mode,
            store_scope: Arc::clone(&reservation.store_scope),
            request_id: reservation.request_id.clone(),
            operation_id: reservation.operation_id.clone(),
            operation_attempt_id: reservation.operation_attempt_id.clone(),
            launch_digest: reservation.launch_digest,
        }
    }

    fn mark_unknown(&self, store: &Arc<Mutex<SqliteStore>>) -> CoordinatorOutcomeV1 {
        let Ok(mut store) = store.try_lock() else {
            return CoordinatorOutcomeV1::Unconfirmed;
        };
        if !Arc::ptr_eq(&store.request_dispatch_scope, &self.store_scope)
            || self.mode != RequestModeV1::GitResult
        {
            return CoordinatorOutcomeV1::Unconfirmed;
        }

        // Existing marker intentionally discards its write result. This call
        // establishes only an attempted cleanup, never durable unknown state.
        store.mark_request_unknown_for_mode_v1(
            self.mode,
            &self.operation_id,
            &self.operation_attempt_id,
            &self.launch_digest,
        );
        CoordinatorOutcomeV1::AttemptedUnconfirmed
    }
}

fn matches_original_store(store: &SqliteStore, expected: &Arc<()>) -> bool {
    Arc::ptr_eq(&store.request_dispatch_scope, expected)
}

/// Reserves one private Git-result launch while holding the outer mutex for
/// this phase only. A later phase must check the retained inner-store marker.
pub(super) fn reserve_request_git_for_coordinator_v1<C, P, A>(
    store: &Arc<Mutex<SqliteStore>>,
    request_id: &str,
    derived: &DerivedExecutionRequestV1,
    redemption: &Phase7CapabilityRedemptionInputV1<'_>,
    capability: Phase7CapabilitySecretV1,
    local_auth: (&str, &str),
    sources: (C, P, A),
) -> Result<CoordinatedReservationV1, CoordinatorOutcomeV1>
where
    C: FnMut() -> Result<String, Phase7PersistenceErrorV1>,
    P: FnOnce() -> Result<(), Phase7PersistenceErrorV1>,
    A: FnOnce() -> Result<(), Phase7PersistenceErrorV1>,
{
    let Ok(mut store) = store.try_lock() else {
        return Err(CoordinatorOutcomeV1::Unconfirmed);
    };
    let reservation = store
        .reserve_request_git_execution_with_sources_v1(
            request_id, derived, redemption, capability, local_auth, sources,
        )
        .map_err(|_| CoordinatorOutcomeV1::Rejected)?;
    let cleanup = UnknownCleanupTicketV1::from_reservation(&reservation);
    Ok(CoordinatedReservationV1 {
        reservation,
        cleanup,
    })
}

/// Consumes one private reservation. Both synthetic ports execute after their
/// applicable database phase has committed and the outer mutex has been
/// released. No error path redispatches.
#[allow(clippy::too_many_arguments)]
pub(super) fn run_request_git_coordinator_v1<C, D, O, P, A>(
    store_handle: &Arc<Mutex<SqliteStore>>,
    coordinated: CoordinatedReservationV1,
    derived: &DerivedExecutionRequestV1,
    local_auth: (&str, &str),
    guard_clock: C,
    dispatch: D,
    observer: O,
    recorded_at: &str,
    result_hooks: (P, A),
) -> CoordinatorOutcomeV1
where
    C: FnMut() -> Result<String, Phase7PersistenceErrorV1>,
    D: FnOnce(RequestFakeDispatchGuardV1) -> Result<(), ()>,
    O: FnOnce() -> SyntheticObservationV1,
    P: FnOnce() -> Result<(), Phase7GitAdapterErrorV1>,
    A: FnOnce() -> Result<(), Phase7GitAdapterErrorV1>,
{
    let CoordinatedReservationV1 {
        reservation,
        cleanup,
    } = coordinated;
    let expected_scope = Arc::clone(&cleanup.store_scope);
    let guard = {
        let Ok(mut store) = store_handle.try_lock() else {
            return CoordinatorOutcomeV1::Unconfirmed;
        };
        if !matches_original_store(&store, &expected_scope) {
            return CoordinatorOutcomeV1::Unconfirmed;
        }
        match store.guard_request_dispatch_from_sources_v1(
            reservation,
            derived,
            local_auth,
            guard_clock,
        ) {
            Ok(guard) => guard,
            Err(_) => return CoordinatorOutcomeV1::Rejected,
        }
    };

    if !matches!(
        std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| dispatch(guard))),
        Ok(Ok(()))
    ) {
        return cleanup.mark_unknown(store_handle);
    }

    let report = match std::panic::catch_unwind(std::panic::AssertUnwindSafe(observer)) {
        Ok(SyntheticObservationV1::Reported { target, result }) => (target, result),
        Ok(SyntheticObservationV1::NoObservation | SyntheticObservationV1::Uncertain) | Err(_) => {
            return cleanup.mark_unknown(store_handle);
        }
    };

    let Ok(mut store) = store_handle.try_lock() else {
        return CoordinatorOutcomeV1::Unconfirmed;
    };
    if !matches_original_store(&store, &expected_scope) {
        return CoordinatorOutcomeV1::Unconfirmed;
    }
    let Ok(proof) = store.verify_request_git_result_for_test_v1(
        &cleanup.request_id,
        derived,
        &cleanup.operation_id,
        &report.0,
        &report.1,
    ) else {
        drop(store);
        return cleanup.mark_unknown(store_handle);
    };
    match store.persist_request_git_result_with_sources_v1(
        proof,
        recorded_at,
        result_hooks.0,
        result_hooks.1,
    ) {
        Ok(readback) => CoordinatorOutcomeV1::Completed(Box::new(readback)),
        Err(_) => CoordinatorOutcomeV1::Unconfirmed,
    }
}

/// Performs a single explicit inspection-only recovery invocation. Its
/// signature deliberately carries no reservation, capability, guard, or
/// dispatch port.
#[allow(clippy::too_many_arguments)]
pub(super) fn recover_request_git_coordinator_v1<O, P, A>(
    store: &Arc<Mutex<SqliteStore>>,
    request_id: &str,
    derived: &DerivedExecutionRequestV1,
    operation_id: &str,
    operation_attempt_id: &str,
    observer: O,
    recorded_at: &str,
    result_hooks: (P, A),
) -> CoordinatorOutcomeV1
where
    O: FnOnce() -> SyntheticObservationV1,
    P: FnOnce() -> Result<(), Phase7GitAdapterErrorV1>,
    A: FnOnce() -> Result<(), Phase7GitAdapterErrorV1>,
{
    let expected_scope = {
        let Ok(store) = store.try_lock() else {
            return CoordinatorOutcomeV1::Unconfirmed;
        };
        Arc::clone(&store.request_dispatch_scope)
    };

    let entry = {
        let Ok(store) = store.try_lock() else {
            return CoordinatorOutcomeV1::Unconfirmed;
        };
        if !matches_original_store(&store, &expected_scope) {
            return CoordinatorOutcomeV1::Unconfirmed;
        }
        let Ok(transaction) =
            Transaction::new_unchecked(&store.connection, TransactionBehavior::Deferred)
        else {
            return CoordinatorOutcomeV1::Rejected;
        };
        let entry = read_recovery_entry_v1(
            &store,
            &transaction,
            request_id,
            derived,
            operation_id,
            operation_attempt_id,
        );
        if transaction.commit().is_err() {
            return CoordinatorOutcomeV1::Rejected;
        }
        match entry {
            Ok(entry) => entry,
            Err(()) => return CoordinatorOutcomeV1::Rejected,
        }
    };

    match entry.readback.state.as_str() {
        "completed" => return CoordinatorOutcomeV1::Completed(Box::new(entry.readback)),
        "dispatching" | "outcome_unknown" => {}
        _ => return CoordinatorOutcomeV1::Rejected,
    }

    let report = match std::panic::catch_unwind(std::panic::AssertUnwindSafe(observer)) {
        Ok(SyntheticObservationV1::Reported { target, result }) => (target, result),
        Ok(SyntheticObservationV1::NoObservation | SyntheticObservationV1::Uncertain) | Err(_) => {
            return CoordinatorOutcomeV1::Unconfirmed;
        }
    };

    let Ok(mut store) = store.try_lock() else {
        return CoordinatorOutcomeV1::Unconfirmed;
    };
    if !matches_original_store(&store, &expected_scope) {
        return CoordinatorOutcomeV1::Unconfirmed;
    }
    let Ok(proof) = store.verify_request_git_result_for_test_v1(
        request_id,
        derived,
        operation_id,
        &report.0,
        &report.1,
    ) else {
        return CoordinatorOutcomeV1::Rejected;
    };
    match store.persist_request_git_result_with_sources_v1(
        proof,
        recorded_at,
        result_hooks.0,
        result_hooks.1,
    ) {
        Ok(readback) => CoordinatorOutcomeV1::Completed(Box::new(readback)),
        Err(_) => CoordinatorOutcomeV1::Unconfirmed,
    }
}

struct RecoveryEntryV1 {
    readback: Phase8OperationReadbackV1,
}

fn read_recovery_entry_v1(
    store: &SqliteStore,
    connection: &crate::Connection,
    request_id: &str,
    derived: &DerivedExecutionRequestV1,
    operation_id: &str,
    operation_attempt_id: &str,
) -> Result<RecoveryEntryV1, ()> {
    let binding = verify_binding_v1(connection, operation_id).map_err(|_| ())?;
    let parents = super::read_git_request_parents_v1(
        connection,
        &derived.request.project_ref,
        &derived.request.resource_ref,
        operation_id,
    )
    .map_err(|_| ())?;
    let readback = store
        .read_phase8_operation_v1(operation_id)
        .map_err(|_| ())?
        .ok_or(())?;
    validate_recovery_entry_v1(
        &parents,
        &binding.launch_digest,
        request_id,
        derived,
        operation_id,
        operation_attempt_id,
        &readback,
    )?;
    Ok(RecoveryEntryV1 { readback })
}

#[allow(clippy::too_many_arguments)]
fn validate_recovery_entry_v1(
    parents: &GitRequestParentsV1,
    _launch_digest: &[u8; 32],
    request_id: &str,
    derived: &DerivedExecutionRequestV1,
    operation_id: &str,
    operation_attempt_id: &str,
    readback: &Phase8OperationReadbackV1,
) -> Result<(), ()> {
    let attempt = readback.attempt.as_ref().ok_or(())?;
    if lnsat_contracts::verify_derived_execution_request_v1(derived).is_err()
        || parents.request_id != request_id
        || parents.derived != *derived
        || readback.operation_id != operation_id
        || attempt.operation_attempt_id != operation_attempt_id
        || attempt.adapter_ref != format!("{ADAPTER_REF}@{ADAPTER_VERSION}")
        || attempt.protocol_version != PROTOCOL
        || !matches!(
            readback.state.as_str(),
            "dispatching" | "outcome_unknown" | "completed" | "failed"
        )
    {
        return Err(());
    }
    Ok(())
}
