//! Private request-bound result persistence. No production observer or dispatch.
//!
//! The fixture-only observation constructor models an independent verifier.
//! A callback return cannot construct proof. Synthetic receipts establish only
//! source-contract behavior, never a physical Git consequence.

use super::{
    AttemptRecord, Connection, DerivedExecutionRequestV1, DispatchContext, OptionalExtension,
    ParsedGitRequest, Phase7CapabilityConsumptionRecordV1, Phase7GitAdapterErrorV1,
    Phase7GitCommitReceiptV1, Phase7GitExecutionResultV1, Phase8OperationReadbackV1,
    RECEIPT_ID_DOMAIN, SqliteStore, SystemTime, Transaction, TransactionBehavior,
    append_phase7_operation_state_event_v1, append_state_event, canonical_system_time_v1,
    canonical_utc_timestamp_millis_v1, digest_fields, identifier, insert_dispatch_attempt_v1,
    insert_receipt, insert_reconciliation, map_persistence, params,
    parse_derived_request_for_adapter, read_phase8_operation_v1, select_attempt,
    tool_arguments_digest, valid_oid, verify_current_schema,
};
#[cfg(test)]
use super::{Phase7GitRepositoryIdentityV1, verify_derived_execution_request_v1};
use crate::phase7_consumption::request_admission::{
    GitRequestParentsV1, read_git_request_parents_v1,
};
use std::sync::Arc;

pub(crate) const ADAPTER_REF: &str = "adapter:local:request-bound-git-commit";
pub(crate) const ADAPTER_VERSION: &str = "v1";
pub(crate) const PROTOCOL: &str = "lnsat.request-bound-git.protocol.v1";

/// Only this module can construct proof; the sole constructor is test-only.
/// A later real observer requires its own accepted implementation and review.
#[derive(Debug)]
pub(crate) struct VerifiedRequestGitResultV1 {
    store_scope: Arc<()>,
    request_id: String,
    operation_id: String,
    operation_attempt_id: String,
    request_digest: [u8; 32],
    launch_digest: [u8; 32],
    tool_arguments_digest: [u8; 32],
    result_digest: [u8; 32],
    observed: Phase7GitExecutionResultV1,
}

pub(crate) struct RequestGitBindingV1 {
    pub(crate) launch_digest: [u8; 32],
    tool_arguments_digest: [u8; 32],
    parents: GitRequestParentsV1,
    parsed: ParsedGitRequest,
    attempt: AttemptRecord,
    state: String,
    effective_at: String,
}

fn launch_digest(
    request_id: &str,
    derived: &DerivedExecutionRequestV1,
    consumption: &Phase7CapabilityConsumptionRecordV1,
    expires_at: &str,
    tool_digest: &[u8; 32],
) -> [u8; 32] {
    digest_fields(
        "lnsat.request-bound-git.launch.v1",
        &[
            request_id.as_bytes(),
            &derived.request_digest,
            consumption.project_ref.as_bytes(),
            consumption.resource_ref.as_bytes(),
            consumption.authorization_id.as_bytes(),
            consumption.operation_id.as_bytes(),
            consumption.consumption_id.as_bytes(),
            ADAPTER_REF.as_bytes(),
            ADAPTER_VERSION.as_bytes(),
            PROTOCOL.as_bytes(),
            tool_digest,
            expires_at.as_bytes(),
            consumption.consumed_at.as_bytes(),
        ],
    )
}

pub(crate) fn reserve_attempt_v1(
    transaction: &Transaction<'_>,
    request_id: &str,
    consumption: &Phase7CapabilityConsumptionRecordV1,
    derived: &DerivedExecutionRequestV1,
    expires_at: &str,
    at: &str,
) -> Result<([u8; 32], String), Phase7GitAdapterErrorV1> {
    let parsed = parse_derived_request_for_adapter(
        &consumption.project_ref,
        &consumption.resource_ref,
        derived,
        Some(ADAPTER_REF),
    )?;
    let tool_digest = tool_arguments_digest(&parsed);
    let launch = launch_digest(request_id, derived, consumption, expires_at, &tool_digest);
    let context = DispatchContext {
        project_ref: consumption.project_ref.clone(),
        resource_ref: consumption.resource_ref.clone(),
        authorization_id: consumption.authorization_id.clone(),
        operation_id: consumption.operation_id.clone(),
        consumption_id: consumption.consumption_id.clone(),
        action_digest: derived.action_digest,
        target_digest: derived.target_digest,
        configuration_digest: derived.configuration_digest,
        executable_digest: derived.executable_digest,
        adapter_ref: format!("{ADAPTER_REF}@{ADAPTER_VERSION}"),
        operation_state: "prepared".to_owned(),
    };
    let attempt = insert_dispatch_attempt_v1(transaction, context, launch, at, PROTOCOL)?;
    Ok((launch, attempt.operation_attempt_id))
}

/// Called from schema verification: never recurse through a public store reader.
#[allow(clippy::too_many_lines)] // Keep protocol, parent and exact history joins together.
pub(crate) fn verify_binding_v1(
    connection: &Connection,
    operation_id: &str,
) -> Result<RequestGitBindingV1, Phase7GitAdapterErrorV1> {
    let attempt =
        select_attempt(connection, operation_id)?.ok_or(Phase7GitAdapterErrorV1::EvidenceDrift)?;
    if attempt.protocol_version != PROTOCOL
        || attempt.adapter_ref != format!("{ADAPTER_REF}@{ADAPTER_VERSION}")
    {
        return Err(Phase7GitAdapterErrorV1::EvidenceDrift);
    }
    let parents = read_git_request_parents_v1(
        connection,
        &attempt.project_ref,
        &attempt.resource_ref,
        operation_id,
    )
    .map_err(map_persistence)?;
    let parsed = parse_derived_request_for_adapter(
        &attempt.project_ref,
        &attempt.resource_ref,
        &parents.derived,
        Some(ADAPTER_REF),
    )?;
    let tool_digest = tool_arguments_digest(&parsed);
    let launch = launch_digest(
        &parents.request_id,
        &parents.derived,
        &parents.consumption,
        &parents.authorization_expires_at,
        &tool_digest,
    );
    if attempt.tool_arguments_digest != launch
        || attempt.created_at != parents.consumption.consumed_at
    {
        return Err(Phase7GitAdapterErrorV1::EvidenceDrift);
    }
    let operation_states = state_history(connection, operation_id, "operation")?;
    let attempt_states = state_history(
        connection,
        &attempt.operation_attempt_id,
        "operation_attempt",
    )?;
    let op_names: Vec<&str> = operation_states
        .iter()
        .map(|(state, _)| state.as_str())
        .collect();
    let attempt_names: Vec<&str> = attempt_states
        .iter()
        .map(|(state, _)| state.as_str())
        .collect();
    if op_names.first() != Some(&"prepared")
        || op_names.get(1..) != Some(attempt_names.as_slice())
        || !matches!(
            attempt_names.as_slice(),
            ["dispatching"]
                | ["dispatching", "outcome_unknown" | "completed" | "failed"]
                | ["dispatching", "outcome_unknown", "completed"]
        )
        || operation_states.get(1..) != Some(attempt_states.as_slice())
        || attempt_states
            .first()
            .is_none_or(|(_, at)| at != &attempt.created_at)
    {
        return Err(Phase7GitAdapterErrorV1::EvidenceDrift);
    }
    let (state, effective_at) = attempt_states
        .last()
        .ok_or(Phase7GitAdapterErrorV1::EvidenceDrift)?
        .clone();
    let receipts: i64 = connection
        .query_row(
            "SELECT count(*) FROM lnsat_operation_receipts WHERE operation_id=?1",
            [operation_id],
            |row| row.get(0),
        )
        .map_err(|_| Phase7GitAdapterErrorV1::PersistenceFailed)?;
    let reconciliations: i64 = connection
        .query_row(
            "SELECT count(*) FROM lnsat_operation_reconciliations WHERE operation_id=?1",
            [operation_id],
            |row| row.get(0),
        )
        .map_err(|_| Phase7GitAdapterErrorV1::PersistenceFailed)?;
    let completed = state == "completed";
    let recovered = attempt_names.as_slice() == ["dispatching", "outcome_unknown", "completed"];
    if receipts != i64::from(completed) || reconciliations != i64::from(recovered) {
        return Err(Phase7GitAdapterErrorV1::EvidenceDrift);
    }
    if completed {
        let valid: bool = connection
            .query_row(
                "SELECT EXISTS(SELECT 1 FROM lnsat_operation_receipts
             WHERE operation_id=?1 AND operation_attempt_id=?2 AND authorization_id=?3
             AND consumption_id=?4 AND project_ref=?5 AND resource_ref=?6
             AND requested_action_digest=?7 AND approved_action_digest=?7
             AND authorized_action_digest=?7 AND executed_action_digest=?7
             AND received_at=?8 AND verification_status='accepted' AND digest_bound=1)",
                params![
                    operation_id,
                    attempt.operation_attempt_id,
                    parents.consumption.authorization_id,
                    parents.consumption.consumption_id,
                    attempt.project_ref,
                    attempt.resource_ref,
                    parents.derived.action_digest.as_slice(),
                    effective_at
                ],
                |row| row.get(0),
            )
            .map_err(|_| Phase7GitAdapterErrorV1::PersistenceFailed)?;
        if !valid {
            return Err(Phase7GitAdapterErrorV1::EvidenceDrift);
        }
        if recovered {
            let matched: bool = connection.query_row(
                "SELECT EXISTS(SELECT 1 FROM lnsat_operation_reconciliations AS reconciliation
                 JOIN lnsat_operation_receipts AS receipt ON receipt.receipt_id=reconciliation.receipt_id
                 WHERE reconciliation.operation_id=?1 AND reconciliation.operation_attempt_id=?2
                 AND reconciliation.project_ref=?3 AND reconciliation.resource_ref=?4
                 AND receipt.operation_id=?1 AND receipt.operation_attempt_id=?2
                 AND reconciliation.recorded_at=?5 AND reconciliation.observed_result_digest=receipt.result_digest)",
                params![operation_id, attempt.operation_attempt_id, attempt.project_ref, attempt.resource_ref, effective_at],
                |row| row.get(0),
            ).map_err(|_| Phase7GitAdapterErrorV1::PersistenceFailed)?;
            if !matched {
                return Err(Phase7GitAdapterErrorV1::EvidenceDrift);
            }
        }
    }
    Ok(RequestGitBindingV1 {
        launch_digest: launch,
        tool_arguments_digest: tool_digest,
        parents,
        parsed,
        attempt,
        state,
        effective_at,
    })
}

fn state_history(
    connection: &Connection,
    id: &str,
    kind: &str,
) -> Result<Vec<(String, String)>, Phase7GitAdapterErrorV1> {
    let mut statement = connection
        .prepare(
            "SELECT state, effective_at FROM lnsat_phase7_state_events
         WHERE target_entity_id=?1 AND target_entity_kind=?2 ORDER BY state_sequence LIMIT 5",
        )
        .map_err(|_| Phase7GitAdapterErrorV1::PersistenceFailed)?;
    let rows = statement
        .query_map(params![id, kind], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        })
        .map_err(|_| Phase7GitAdapterErrorV1::PersistenceFailed)?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|_| Phase7GitAdapterErrorV1::PersistenceFailed)?;
    let mut prior = None;
    for (_, at) in &rows {
        let current =
            canonical_utc_timestamp_millis_v1(at).ok_or(Phase7GitAdapterErrorV1::EvidenceDrift)?;
        if prior.is_some_and(|previous| current < previous) {
            return Err(Phase7GitAdapterErrorV1::EvidenceDrift);
        }
        prior = Some(current);
    }
    Ok(rows)
}

fn stable_result_digest(
    binding: &RequestGitBindingV1,
    observed: &Phase7GitExecutionResultV1,
) -> [u8; 32] {
    let paths = observed.changed_paths.join("\0");
    digest_fields(
        "lnsat.request-bound-git.result.v1",
        &[
            binding.parents.request_id.as_bytes(),
            binding.attempt.project_ref.as_bytes(),
            binding.attempt.resource_ref.as_bytes(),
            binding.attempt.operation_id.as_bytes(),
            binding.attempt.operation_attempt_id.as_bytes(),
            binding.parents.consumption.authorization_id.as_bytes(),
            binding.parents.consumption.consumption_id.as_bytes(),
            &binding.parents.derived.request_digest,
            &binding.launch_digest,
            &binding.tool_arguments_digest,
            ADAPTER_REF.as_bytes(),
            ADAPTER_VERSION.as_bytes(),
            PROTOCOL.as_bytes(),
            observed.commit_oid.as_bytes(),
            observed.tree_oid.as_bytes(),
            paths.as_bytes(),
            observed.patch_sha256.as_bytes(),
            observed.metadata.message.as_bytes(),
            observed.metadata.author_name.as_bytes(),
            observed.metadata.author_email.as_bytes(),
            observed.metadata.author_time.as_bytes(),
            observed.metadata.committer_name.as_bytes(),
            observed.metadata.committer_email.as_bytes(),
            observed.metadata.committer_time.as_bytes(),
        ],
    )
}

fn validate_observation(
    binding: &RequestGitBindingV1,
    observed: &Phase7GitExecutionResultV1,
) -> Result<(), Phase7GitAdapterErrorV1> {
    if !valid_oid(&observed.commit_oid)
        || observed.commit_oid == binding.parsed.identity.base_commit_oid
        || observed.tree_oid != binding.parsed.expected_tree_oid
        || observed.changed_paths != binding.parsed.allowed_paths
        || observed.patch_sha256 != binding.parsed.patch_sha256
        || observed.metadata != binding.parsed.metadata
    {
        return Err(Phase7GitAdapterErrorV1::EvidenceDrift);
    }
    Ok(())
}

impl SqliteStore {
    /// Build a valid terminal fixture history without adding a production writer.
    #[cfg(test)]
    pub(crate) fn fail_request_git_for_test_v1(
        &mut self,
        operation_id: &str,
        recorded_at: &str,
    ) -> Result<(), Phase7GitAdapterErrorV1> {
        let transaction = self
            .connection
            .transaction_with_behavior(TransactionBehavior::Immediate)
            .map_err(|_| Phase7GitAdapterErrorV1::PersistenceFailed)?;
        verify_current_schema(&transaction).map_err(|_| Phase7GitAdapterErrorV1::EvidenceDrift)?;
        let binding = verify_binding_v1(&transaction, operation_id)?;
        if binding.state != "dispatching" {
            return Err(Phase7GitAdapterErrorV1::EvidenceDrift);
        }
        append_state_event(
            &transaction,
            &binding.attempt.project_ref,
            &binding.attempt.resource_ref,
            &binding.attempt.operation_attempt_id,
            "operation_attempt",
            "failed",
            recorded_at,
            "operation_attempt_state_recorded",
            "none",
        )?;
        append_phase7_operation_state_event_v1(
            &transaction,
            &binding.attempt.project_ref,
            &binding.attempt.resource_ref,
            operation_id,
            "failed",
            recorded_at,
        )
        .map_err(map_persistence)?;
        verify_current_schema(&transaction).map_err(|_| Phase7GitAdapterErrorV1::EvidenceDrift)?;
        transaction
            .commit()
            .map_err(|_| Phase7GitAdapterErrorV1::PersistenceFailed)
    }

    /// Trusted synthetic observation port. Not present in a production build.
    /// It must be called separately from the fake execution callback.
    #[cfg(test)]
    pub(crate) fn verify_request_git_result_for_test_v1(
        &self,
        request_id: &str,
        derived: &DerivedExecutionRequestV1,
        operation_id: &str,
        observed_target: &Phase7GitRepositoryIdentityV1,
        observed: &Phase7GitExecutionResultV1,
    ) -> Result<VerifiedRequestGitResultV1, Phase7GitAdapterErrorV1> {
        verify_current_schema(&self.connection)
            .map_err(|_| Phase7GitAdapterErrorV1::EvidenceDrift)?;
        let binding = verify_binding_v1(&self.connection, operation_id)?;
        verify_derived_execution_request_v1(derived)
            .map_err(|_| Phase7GitAdapterErrorV1::EvidenceDrift)?;
        if binding.parents.request_id != request_id
            || binding.parents.derived.request_digest != derived.request_digest
            || &binding.parsed.identity != observed_target
            || binding.state == "failed"
        {
            return Err(Phase7GitAdapterErrorV1::EvidenceDrift);
        }
        validate_observation(&binding, observed)?;
        Ok(VerifiedRequestGitResultV1 {
            store_scope: Arc::clone(&self.request_dispatch_scope),
            request_id: request_id.to_owned(),
            operation_id: operation_id.to_owned(),
            operation_attempt_id: binding.attempt.operation_attempt_id.clone(),
            request_digest: derived.request_digest,
            launch_digest: binding.launch_digest,
            tool_arguments_digest: binding.tool_arguments_digest,
            result_digest: stable_result_digest(&binding, observed),
            observed: observed.clone(),
        })
    }

    /// Closed private result core. No production observer can currently mint proof.
    pub(crate) fn persist_request_git_result_v1(
        &mut self,
        proof: VerifiedRequestGitResultV1,
    ) -> Result<Phase8OperationReadbackV1, Phase7GitAdapterErrorV1> {
        let at = canonical_system_time_v1(SystemTime::now()).map_err(map_persistence)?;
        self.persist_request_git_result_from_sources_v1(proof, &at, || Ok(()), || Ok(()))
    }

    #[cfg(test)]
    pub(crate) fn persist_request_git_result_with_sources_v1<P, A>(
        &mut self,
        proof: VerifiedRequestGitResultV1,
        recorded_at: &str,
        precommit: P,
        after_commit: A,
    ) -> Result<Phase8OperationReadbackV1, Phase7GitAdapterErrorV1>
    where
        P: FnOnce() -> Result<(), Phase7GitAdapterErrorV1>,
        A: FnOnce() -> Result<(), Phase7GitAdapterErrorV1>,
    {
        self.persist_request_git_result_from_sources_v1(proof, recorded_at, precommit, after_commit)
    }

    #[allow(clippy::too_many_lines)] // One lock owns revalidation, duplicate decision and all result writes.
    fn persist_request_git_result_from_sources_v1<P, A>(
        &mut self,
        proof: VerifiedRequestGitResultV1,
        recorded_at: &str,
        precommit: P,
        after_commit: A,
    ) -> Result<Phase8OperationReadbackV1, Phase7GitAdapterErrorV1>
    where
        P: FnOnce() -> Result<(), Phase7GitAdapterErrorV1>,
        A: FnOnce() -> Result<(), Phase7GitAdapterErrorV1>,
    {
        if !Arc::ptr_eq(&proof.store_scope, &self.request_dispatch_scope) {
            return Err(Phase7GitAdapterErrorV1::EvidenceDrift);
        }
        let at = canonical_utc_timestamp_millis_v1(recorded_at)
            .ok_or(Phase7GitAdapterErrorV1::InvalidInput)?;
        let transaction = self
            .connection
            .transaction_with_behavior(TransactionBehavior::Immediate)
            .map_err(|_| Phase7GitAdapterErrorV1::PersistenceFailed)?;
        verify_current_schema(&transaction).map_err(|_| Phase7GitAdapterErrorV1::EvidenceDrift)?;
        let binding = verify_binding_v1(&transaction, &proof.operation_id)?;
        // Explicit root validation is part of this write transaction, not an
        // inference from possession of an in-memory observation value.
        crate::action_request::validate_execution_root_v1(
            &transaction,
            &proof.request_id,
            &binding.parents.derived,
        )
        .map_err(map_persistence_action)?;
        if proof.request_id != binding.parents.request_id
            || proof.operation_attempt_id != binding.attempt.operation_attempt_id
            || proof.request_digest != binding.parents.derived.request_digest
            || proof.launch_digest != binding.launch_digest
            || proof.tool_arguments_digest != binding.tool_arguments_digest
            || proof.result_digest != stable_result_digest(&binding, &proof.observed)
            || binding.state == "failed"
            || at
                < canonical_utc_timestamp_millis_v1(&binding.effective_at)
                    .ok_or(Phase7GitAdapterErrorV1::EvidenceDrift)?
        {
            return Err(Phase7GitAdapterErrorV1::EvidenceDrift);
        }
        validate_observation(&binding, &proof.observed)?;
        let existing: Option<Vec<u8>> = transaction
            .query_row(
                "SELECT result_digest FROM lnsat_operation_receipts WHERE operation_id=?1",
                [&proof.operation_id],
                |row| row.get(0),
            )
            .optional()
            .map_err(|_| Phase7GitAdapterErrorV1::PersistenceFailed)?;
        if let Some(existing) = existing {
            if binding.state != "completed" || existing.as_slice() != proof.result_digest {
                return Err(Phase7GitAdapterErrorV1::EvidenceDrift);
            }
            // No hooks, writes, observation refresh or receipt replacement on replay.
            let result = read_phase8_operation_v1(&transaction, &proof.operation_id)?
                .ok_or(Phase7GitAdapterErrorV1::EvidenceDrift)?;
            transaction
                .commit()
                .map_err(|_| Phase7GitAdapterErrorV1::OutcomeUnknown)?;
            return Ok(result);
        }
        if !matches!(binding.state.as_str(), "dispatching" | "outcome_unknown") {
            return Err(Phase7GitAdapterErrorV1::EvidenceDrift);
        }
        let receipt = Phase7GitCommitReceiptV1 {
            receipt_id: identifier(
                "rcp_",
                RECEIPT_ID_DOMAIN,
                &[proof.operation_id.as_bytes(), &proof.result_digest],
            ),
            operation_id: proof.operation_id.clone(),
            operation_attempt_id: proof.operation_attempt_id,
            authorization_id: binding.parents.consumption.authorization_id,
            consumption_id: binding.parents.consumption.consumption_id,
            adapter_ref: ADAPTER_REF.to_owned(),
            adapter_version: ADAPTER_VERSION.to_owned(),
            commit_oid: proof.observed.commit_oid,
            tree_oid: proof.observed.tree_oid,
            changed_paths: proof.observed.changed_paths,
            patch_sha256: proof.observed.patch_sha256,
            metadata: proof.observed.metadata,
            result_digest: proof.result_digest,
            received_at: recorded_at.to_owned(),
        };
        insert_receipt(&transaction, &binding.attempt, &receipt)?;
        if binding.state == "outcome_unknown" {
            insert_reconciliation(&transaction, &binding.attempt, &receipt, recorded_at)?;
        }
        append_state_event(
            &transaction,
            &binding.attempt.project_ref,
            &binding.attempt.resource_ref,
            &binding.attempt.operation_attempt_id,
            "operation_attempt",
            "completed",
            recorded_at,
            "operation_attempt_state_recorded",
            "receipt_bound",
        )?;
        append_phase7_operation_state_event_v1(
            &transaction,
            &binding.attempt.project_ref,
            &binding.attempt.resource_ref,
            &proof.operation_id,
            "completed",
            recorded_at,
        )
        .map_err(map_persistence)?;
        // Verify the complete new state before committing; failures roll back
        // receipt, reconciliation and both state/audit chains together.
        let result = read_phase8_operation_v1(&transaction, &proof.operation_id)?
            .ok_or(Phase7GitAdapterErrorV1::EvidenceDrift)?;
        precommit()?;
        transaction
            .commit()
            .map_err(|_| Phase7GitAdapterErrorV1::OutcomeUnknown)?;
        after_commit().map_err(|_| Phase7GitAdapterErrorV1::OutcomeUnknown)?;
        Ok(result)
    }

    pub(crate) fn mark_request_git_outcome_unknown_v1(
        &mut self,
        operation_id: &str,
        attempt_id: &str,
        expected_launch: &[u8; 32],
    ) -> Result<(), Phase7GitAdapterErrorV1> {
        let transaction = self
            .connection
            .transaction_with_behavior(TransactionBehavior::Immediate)
            .map_err(|_| Phase7GitAdapterErrorV1::PersistenceFailed)?;
        verify_current_schema(&transaction).map_err(|_| Phase7GitAdapterErrorV1::EvidenceDrift)?;
        let binding = verify_binding_v1(&transaction, operation_id)?;
        if binding.attempt.operation_attempt_id != attempt_id
            || &binding.launch_digest != expected_launch
            || !matches!(binding.state.as_str(), "dispatching" | "outcome_unknown")
        {
            return Err(Phase7GitAdapterErrorV1::EvidenceDrift);
        }
        if binding.state == "outcome_unknown" {
            return Ok(());
        }
        let at = canonical_system_time_v1(SystemTime::now()).map_err(map_persistence)?;
        if at < binding.effective_at {
            return Err(Phase7GitAdapterErrorV1::EvidenceDrift);
        }
        append_state_event(
            &transaction,
            &binding.attempt.project_ref,
            &binding.attempt.resource_ref,
            attempt_id,
            "operation_attempt",
            "outcome_unknown",
            &at,
            "operation_attempt_state_recorded",
            "none",
        )?;
        append_phase7_operation_state_event_v1(
            &transaction,
            &binding.attempt.project_ref,
            &binding.attempt.resource_ref,
            operation_id,
            "outcome_unknown",
            &at,
        )
        .map_err(map_persistence)?;
        transaction
            .commit()
            .map_err(|_| Phase7GitAdapterErrorV1::OutcomeUnknown)
    }
}

fn map_persistence_action(
    _: crate::action_request::ActionRequestErrorV1,
) -> Phase7GitAdapterErrorV1 {
    Phase7GitAdapterErrorV1::EvidenceDrift
}
