//! Private synthetic observer/verifier boundary for request-bound Git results.
//!
//! This child exists only in test builds. Its observer sees an owned immutable
//! expectation and returns unverified synthetic material; it receives no store,
//! reservation, dispatch guard, capability, transaction, or proof constructor.
//! Fixture selection is trusted test assembly, not a collector sandbox or a
//! claim about physical Git provenance, freshness, or causal attribution.

use super::{
    CoordinatedReservationV1, CoordinatorOutcomeV1, RequestFakeDispatchGuardV1,
    UnknownCleanupTicketV1, matches_original_store, read_recovery_entry_v1,
};
use crate::phase7_git_adapter::phase7_git_tool_arguments_digest_v1;
use crate::phase7_git_adapter::request_result::verify_binding_v1;
use crate::{
    Phase7GitAdapterErrorV1, Phase7GitExecutionResultV1, Phase7GitRepositoryIdentityV1,
    Phase7PersistenceErrorV1, Phase8OperationReadbackV1, SqliteStore, TransactionBehavior,
};
use lnsat_contracts::DerivedExecutionRequestV1;
use rusqlite::Transaction;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::{Arc, Mutex};

#[cfg(test)]
mod tests;

/// Synthetic capture limits. These bound only the accepted typed payload after
/// the callback returns. Fixture callback allocation and duration remain
/// trusted and unproven; these limits do not qualify a real collector's bytes,
/// process lifetime, timeout, cleanup, freshness, or provenance.
pub(super) const SYNTHETIC_CAPTURE_MAX_BYTES_V1: usize = 16 * 1024;
pub(super) const SYNTHETIC_CAPTURE_MAX_PATHS_V1: usize = 64;
pub(super) const SYNTHETIC_CAPTURE_MAX_PATH_BYTES_V1: usize = 1024;
pub(super) const SYNTHETIC_CAPTURE_MAX_METADATA_FIELD_BYTES_V1: usize = 2048;

/// Test control selects this policy before dispatch. It is deliberately not a
/// capture flag, observer return value, or dispatch-selected capability.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub(super) enum TestOnlyObserverPolicyV1 {
    TrustedSyntheticFixture,
}

/// Returns the sole accepted fixture policy for this cfg(test) seam.
pub(super) const fn trusted_synthetic_observer_policy_v1() -> TestOnlyObserverPolicyV1 {
    TestOnlyObserverPolicyV1::TrustedSyntheticFixture
}

/// Exact immutable material supplied to a selected synthetic observer.
///
/// This is copied before dispatch under the same original-store guard phase.
/// It is rederived after acquisition; a dispatch-time durable change cannot
/// become a replacement expectation.
#[derive(Clone, Debug)]
pub(super) struct ObserverExpectationV1 {
    request_id: String,
    operation_id: String,
    operation_attempt_id: String,
    request_digest: [u8; 32],
    launch_digest: [u8; 32],
    tool_arguments_digest: [u8; 32],
    target: Phase7GitRepositoryIdentityV1,
    invocation_stamp: Arc<()>,
}

impl ObserverExpectationV1 {
    pub(super) fn target(&self) -> &Phase7GitRepositoryIdentityV1 {
        &self.target
    }

    pub(super) fn request_id(&self) -> &str {
        &self.request_id
    }

    pub(super) fn operation_id(&self) -> &str {
        &self.operation_id
    }

    pub(super) fn operation_attempt_id(&self) -> &str {
        &self.operation_attempt_id
    }

    fn same_context_as(&self, other: &Self) -> bool {
        self.request_id == other.request_id
            && self.operation_id == other.operation_id
            && self.operation_attempt_id == other.operation_attempt_id
            && self.request_digest == other.request_digest
            && self.launch_digest == other.launch_digest
            && self.tool_arguments_digest == other.tool_arguments_digest
            && self.target == other.target
            && Arc::ptr_eq(&self.invocation_stamp, &other.invocation_stamp)
    }
}

/// Bounded but unverified fixture material. `complete` describes only whether
/// the synthetic fixture supplied all modeled fields. It never authenticates
/// source, time, target continuity, collector identity, or effect causality.
pub(super) struct UnverifiedSyntheticCaptureV1 {
    expectation: ObserverExpectationV1,
    target: Phase7GitRepositoryIdentityV1,
    result: Phase7GitExecutionResultV1,
    complete: bool,
}

impl UnverifiedSyntheticCaptureV1 {
    /// Trusted fixture-port assembly only. This does not mint a proof.
    pub(super) fn complete_for_expectation(
        expectation: ObserverExpectationV1,
        target: Phase7GitRepositoryIdentityV1,
        result: Phase7GitExecutionResultV1,
    ) -> Self {
        Self {
            expectation,
            target,
            result,
            complete: true,
        }
    }

    pub(super) fn incomplete_for_expectation(
        expectation: ObserverExpectationV1,
        target: Phase7GitRepositoryIdentityV1,
        result: Phase7GitExecutionResultV1,
    ) -> Self {
        Self {
            expectation,
            target,
            result,
            complete: false,
        }
    }
}

/// An observer is allowed one bounded outcome. Missing and uncertain capture
/// preserve uncertainty; they never authorize redispatch or a result proof.
pub(super) enum SyntheticObserverResultV1 {
    Captured(Box<UnverifiedSyntheticCaptureV1>),
    Missing,
    Uncertain,
}

/// Per-invocation test instrumentation. These counters are not production
/// hooks and distinguish callback/proof calls from control-flow assertions.
#[derive(Default)]
pub(super) struct ObserverInvocationCountsV1 {
    dispatches: AtomicUsize,
    observers: AtomicUsize,
    proof_constructor_calls: AtomicUsize,
}

impl ObserverInvocationCountsV1 {
    pub(super) fn dispatches(&self) -> usize {
        self.dispatches.load(Ordering::SeqCst)
    }

    pub(super) fn observers(&self) -> usize {
        self.observers.load(Ordering::SeqCst)
    }

    pub(super) fn proof_constructor_calls(&self) -> usize {
        self.proof_constructor_calls.load(Ordering::SeqCst)
    }
}

/// Runs one admitted synthetic dispatch followed by one independently selected
/// observer call. The pre-dispatch expectation is frozen during the successful
/// guard phase, before the dispatch callback receives its one-use guard.
#[allow(clippy::too_many_arguments)]
pub(super) fn run_request_git_observer_v1<C, D, O, P, A>(
    store_handle: &Arc<Mutex<SqliteStore>>,
    coordinated: CoordinatedReservationV1,
    derived: &DerivedExecutionRequestV1,
    local_auth: (&str, &str),
    guard_clock: C,
    policy: TestOnlyObserverPolicyV1,
    dispatch: D,
    observer: O,
    recorded_at: &str,
    result_hooks: (P, A),
    counts: &ObserverInvocationCountsV1,
) -> CoordinatorOutcomeV1
where
    C: FnMut() -> Result<String, Phase7PersistenceErrorV1>,
    D: FnOnce(RequestFakeDispatchGuardV1) -> Result<(), ()>,
    O: FnOnce(ObserverExpectationV1) -> SyntheticObserverResultV1,
    P: FnOnce() -> Result<(), Phase7GitAdapterErrorV1>,
    A: FnOnce() -> Result<(), Phase7GitAdapterErrorV1>,
{
    let CoordinatedReservationV1 {
        reservation,
        cleanup,
    } = coordinated;
    let expected_scope = Arc::clone(&cleanup.store_scope);
    let (guard, (expected, frozen_entry)) = {
        let Ok(mut store) = store_handle.try_lock() else {
            return CoordinatorOutcomeV1::Unconfirmed;
        };
        if !matches_original_store(&store, &expected_scope) {
            return CoordinatorOutcomeV1::Unconfirmed;
        }
        let Ok(guard) = store.guard_request_dispatch_from_sources_v1(
            reservation,
            derived,
            local_auth,
            guard_clock,
        ) else {
            return CoordinatorOutcomeV1::Rejected;
        };
        let Ok(expected) = freeze_expectation_v1(&store, &cleanup, derived, Arc::new(())) else {
            drop(store);
            return cleanup.mark_unknown(store_handle);
        };
        (guard, expected)
    };

    counts.dispatches.fetch_add(1, Ordering::SeqCst);
    if !matches!(
        std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| dispatch(guard))),
        Ok(Ok(()))
    ) {
        return cleanup.mark_unknown(store_handle);
    }

    counts.observers.fetch_add(1, Ordering::SeqCst);
    let capture =
        match std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| observer(expected.clone())))
        {
            Ok(SyntheticObserverResultV1::Captured(capture)) => capture,
            Ok(SyntheticObserverResultV1::Missing | SyntheticObserverResultV1::Uncertain)
            | Err(_) => {
                return cleanup.mark_unknown(store_handle);
            }
        };

    let Ok(mut store) = store_handle.try_lock() else {
        return CoordinatorOutcomeV1::Unconfirmed;
    };
    if !matches_original_store(&store, &expected_scope) {
        return CoordinatorOutcomeV1::Unconfirmed;
    }
    let Ok((current, current_entry)) = freeze_expectation_v1(
        &store,
        &cleanup,
        derived,
        Arc::clone(&expected.invocation_stamp),
    ) else {
        drop(store);
        return cleanup.mark_unknown(store_handle);
    };
    if current_entry != frozen_entry
        || !current.same_context_as(&expected)
        || !admit_capture_v1(policy, &expected, &capture)
    {
        drop(store);
        return cleanup.mark_unknown(store_handle);
    }
    counts
        .proof_constructor_calls
        .fetch_add(1, Ordering::SeqCst);
    let Ok(proof) = store.verify_request_git_result_for_test_v1(
        &cleanup.request_id,
        derived,
        &cleanup.operation_id,
        &capture.target,
        &capture.result,
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

/// Performs one historical inspection without a reservation, capability,
/// dispatch guard, or dispatch callback. Terminal entries return before any
/// observer or proof counter changes.
#[allow(clippy::too_many_arguments, clippy::too_many_lines)] // Keep terminal classification, snapshot joins and unlocked ports in one auditable flow.
pub(super) fn recover_request_git_observer_v1<O, P, A>(
    store_handle: &Arc<Mutex<SqliteStore>>,
    request_id: &str,
    derived: &DerivedExecutionRequestV1,
    operation_id: &str,
    operation_attempt_id: &str,
    policy: TestOnlyObserverPolicyV1,
    observer: O,
    recorded_at: &str,
    result_hooks: (P, A),
    counts: &ObserverInvocationCountsV1,
) -> CoordinatorOutcomeV1
where
    O: FnOnce(ObserverExpectationV1) -> SyntheticObserverResultV1,
    P: FnOnce() -> Result<(), Phase7GitAdapterErrorV1>,
    A: FnOnce() -> Result<(), Phase7GitAdapterErrorV1>,
{
    let expected_scope = {
        let Ok(store) = store_handle.try_lock() else {
            return CoordinatorOutcomeV1::Unconfirmed;
        };
        Arc::clone(&store.request_dispatch_scope)
    };
    let entry = {
        let Ok(store) = store_handle.try_lock() else {
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
        let Ok(entry) = entry else {
            return CoordinatorOutcomeV1::Rejected;
        };
        entry
    };
    match entry.readback.state.as_str() {
        "completed" => return CoordinatorOutcomeV1::Completed(Box::new(entry.readback)),
        "dispatching" | "outcome_unknown" => {}
        _ => return CoordinatorOutcomeV1::Rejected,
    }
    let (expected, frozen_entry) = {
        let Ok(store) = store_handle.try_lock() else {
            return CoordinatorOutcomeV1::Unconfirmed;
        };
        if !matches_original_store(&store, &expected_scope) {
            return CoordinatorOutcomeV1::Unconfirmed;
        }
        let Ok(expected) = freeze_expectation_for_ids_v1(
            &store,
            request_id,
            derived,
            operation_id,
            operation_attempt_id,
            Arc::new(()),
        ) else {
            return CoordinatorOutcomeV1::Rejected;
        };
        expected
    };
    // A terminal or history change between entry classification and expectation
    // assembly cannot open an observation port with a mixed snapshot.
    if frozen_entry != entry.readback {
        return CoordinatorOutcomeV1::Rejected;
    }
    counts.observers.fetch_add(1, Ordering::SeqCst);
    let capture =
        match std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| observer(expected.clone())))
        {
            Ok(SyntheticObserverResultV1::Captured(capture)) => capture,
            Ok(SyntheticObserverResultV1::Missing | SyntheticObserverResultV1::Uncertain)
            | Err(_) => {
                return CoordinatorOutcomeV1::Unconfirmed;
            }
        };
    let Ok(mut store) = store_handle.try_lock() else {
        return CoordinatorOutcomeV1::Unconfirmed;
    };
    if !matches_original_store(&store, &expected_scope) {
        return CoordinatorOutcomeV1::Unconfirmed;
    }
    let Ok((current, current_entry)) = freeze_expectation_for_ids_v1(
        &store,
        request_id,
        derived,
        operation_id,
        operation_attempt_id,
        Arc::clone(&expected.invocation_stamp),
    ) else {
        return CoordinatorOutcomeV1::Rejected;
    };
    if current_entry != frozen_entry
        || !current.same_context_as(&expected)
        || !admit_capture_v1(policy, &expected, &capture)
    {
        return CoordinatorOutcomeV1::Rejected;
    }
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

fn freeze_expectation_v1(
    store: &SqliteStore,
    cleanup: &UnknownCleanupTicketV1,
    derived: &DerivedExecutionRequestV1,
    invocation_stamp: Arc<()>,
) -> Result<(ObserverExpectationV1, Phase8OperationReadbackV1), ()> {
    let (expected, entry) = freeze_expectation_for_ids_v1(
        store,
        &cleanup.request_id,
        derived,
        &cleanup.operation_id,
        &cleanup.operation_attempt_id,
        invocation_stamp,
    )?;
    if expected.launch_digest != cleanup.launch_digest || entry.state != "dispatching" {
        return Err(());
    }
    Ok((expected, entry))
}

fn freeze_expectation_for_ids_v1(
    store: &SqliteStore,
    request_id: &str,
    derived: &DerivedExecutionRequestV1,
    operation_id: &str,
    operation_attempt_id: &str,
    invocation_stamp: Arc<()>,
) -> Result<(ObserverExpectationV1, Phase8OperationReadbackV1), ()> {
    let transaction = Transaction::new_unchecked(&store.connection, TransactionBehavior::Deferred)
        .map_err(|_| ())?;
    let binding = verify_binding_v1(&transaction, operation_id).map_err(|_| ())?;
    let entry = read_recovery_entry_v1(
        store,
        &transaction,
        request_id,
        derived,
        operation_id,
        operation_attempt_id,
    )?;
    transaction.commit().map_err(|_| ())?;
    let target = expected_target_v1(derived)?;
    let tool_arguments_digest = phase7_git_tool_arguments_digest_v1(derived).map_err(|_| ())?;
    if !expected_context_is_bounded_v1(request_id, operation_id, operation_attempt_id, &target) {
        return Err(());
    }
    Ok((
        ObserverExpectationV1 {
            request_id: request_id.to_owned(),
            operation_id: operation_id.to_owned(),
            operation_attempt_id: operation_attempt_id.to_owned(),
            request_digest: derived.request_digest,
            launch_digest: binding.launch_digest,
            tool_arguments_digest,
            target,
            invocation_stamp,
        },
        entry.readback,
    ))
}

fn expected_target_v1(
    derived: &DerivedExecutionRequestV1,
) -> Result<Phase7GitRepositoryIdentityV1, ()> {
    let identity = &derived.request.target.identity;
    let field = |name| {
        identity
            .get(name)
            .and_then(serde_json::Value::as_str)
            .ok_or(())
    };
    Ok(Phase7GitRepositoryIdentityV1 {
        repository_path: field("repository_path")?.into(),
        git_dir_path: field("git_dir_path")?.into(),
        object_format: field("object_format")?.to_owned(),
        head_ref: field("head_ref")?.to_owned(),
        base_commit_oid: field("base_commit_oid")?.to_owned(),
        fixture_marker_sha256: field("fixture_marker_sha256")?.to_owned(),
    })
}

fn admit_capture_v1(
    policy: TestOnlyObserverPolicyV1,
    expected: &ObserverExpectationV1,
    capture: &UnverifiedSyntheticCaptureV1,
) -> bool {
    policy == TestOnlyObserverPolicyV1::TrustedSyntheticFixture
        && capture.complete
        && capture.expectation.same_context_as(expected)
        && capture.target == expected.target
        && synthetic_capture_is_bounded_v1(capture)
        && accepted_payload_is_bounded_v1(expected, capture)
}

fn accepted_payload_is_bounded_v1(
    expected: &ObserverExpectationV1,
    capture: &UnverifiedSyntheticCaptureV1,
) -> bool {
    let Some(expected_bytes) = expected_context_bytes_v1(expected) else {
        return false;
    };
    let Some(capture_context_bytes) = expected_context_bytes_v1(&capture.expectation) else {
        return false;
    };
    let Some(capture_bytes) = synthetic_capture_bytes_v1(capture) else {
        return false;
    };
    expected_bytes
        .checked_add(capture_context_bytes)
        .and_then(|total| total.checked_add(capture_bytes))
        .is_some_and(|total| total <= SYNTHETIC_CAPTURE_MAX_BYTES_V1)
}

fn expected_context_is_bounded_v1(
    request_id: &str,
    operation_id: &str,
    operation_attempt_id: &str,
    target: &Phase7GitRepositoryIdentityV1,
) -> bool {
    expected_context_bytes_for_parts_v1(request_id, operation_id, operation_attempt_id, target)
        .is_some_and(|bytes| bytes <= SYNTHETIC_CAPTURE_MAX_BYTES_V1)
}

fn expected_context_bytes_v1(expected: &ObserverExpectationV1) -> Option<usize> {
    expected_context_bytes_for_parts_v1(
        &expected.request_id,
        &expected.operation_id,
        &expected.operation_attempt_id,
        &expected.target,
    )
}

fn expected_context_bytes_for_parts_v1(
    request_id: &str,
    operation_id: &str,
    operation_attempt_id: &str,
    target: &Phase7GitRepositoryIdentityV1,
) -> Option<usize> {
    let repository_path = target.repository_path.to_str()?;
    let git_dir_path = target.git_dir_path.to_str()?;
    let mut bytes = 3usize * 32;
    for value in [
        request_id,
        operation_id,
        operation_attempt_id,
        repository_path,
        git_dir_path,
        &target.object_format,
        &target.head_ref,
        &target.base_commit_oid,
        &target.fixture_marker_sha256,
    ] {
        if value.len() > SYNTHETIC_CAPTURE_MAX_PATH_BYTES_V1 {
            return None;
        }
        let next = bytes.checked_add(value.len())?;
        bytes = next;
    }
    Some(bytes)
}

fn synthetic_capture_is_bounded_v1(capture: &UnverifiedSyntheticCaptureV1) -> bool {
    synthetic_capture_bytes_v1(capture).is_some_and(|bytes| bytes <= SYNTHETIC_CAPTURE_MAX_BYTES_V1)
}

fn synthetic_capture_bytes_v1(capture: &UnverifiedSyntheticCaptureV1) -> Option<usize> {
    if capture.result.changed_paths.len() > SYNTHETIC_CAPTURE_MAX_PATHS_V1 {
        return None;
    }
    let mut bytes = 0usize;
    let mut add = |value: &str, per_field_limit: usize| {
        if value.len() > per_field_limit {
            return false;
        }
        bytes = match bytes.checked_add(value.len()) {
            Some(bytes) => bytes,
            None => return false,
        };
        true
    };
    let repository_path = capture.target.repository_path.to_str()?;
    let git_dir_path = capture.target.git_dir_path.to_str()?;
    for value in [
        repository_path,
        git_dir_path,
        &capture.target.object_format,
        &capture.target.head_ref,
        &capture.target.base_commit_oid,
        &capture.target.fixture_marker_sha256,
        &capture.result.commit_oid,
        &capture.result.tree_oid,
        &capture.result.patch_sha256,
    ] {
        if !add(value, SYNTHETIC_CAPTURE_MAX_PATH_BYTES_V1) {
            return None;
        }
    }
    for path in &capture.result.changed_paths {
        if !add(path, SYNTHETIC_CAPTURE_MAX_PATH_BYTES_V1) {
            return None;
        }
    }
    for value in [
        &capture.result.metadata.message,
        &capture.result.metadata.author_name,
        &capture.result.metadata.author_email,
        &capture.result.metadata.author_time,
        &capture.result.metadata.committer_name,
        &capture.result.metadata.committer_email,
        &capture.result.metadata.committer_time,
    ] {
        if !add(value, SYNTHETIC_CAPTURE_MAX_METADATA_FIELD_BYTES_V1) {
            return None;
        }
    }
    Some(bytes)
}
