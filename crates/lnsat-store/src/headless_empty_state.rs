//! Fixed empty-state predicates for exact verified bootstrap schemas.
//!
//! Each EXISTS examines at most the first row of one compiled main table. This
//! replaces repeated statement creation, not schema/seed/integrity verification.
//! Callers must keep the existing same-transaction verification and error gates.

macro_rules! legacy_occupied {
    () => {
        concat!(
            "EXISTS (SELECT 1 FROM main.\"lnsat_approval_decisions\")",
            " OR EXISTS (SELECT 1 FROM main.\"lnsat_approval_requests\")",
            " OR EXISTS (SELECT 1 FROM main.\"lnsat_audit_event_reason_codes\")",
            " OR EXISTS (SELECT 1 FROM main.\"lnsat_audit_events\")",
            " OR EXISTS (SELECT 1 FROM main.\"lnsat_authorization_attempts\")",
            " OR EXISTS (SELECT 1 FROM main.\"lnsat_authorization_nonces\")",
            " OR EXISTS (SELECT 1 FROM main.\"lnsat_capability_consumptions\")",
            " OR EXISTS (SELECT 1 FROM main.\"lnsat_execution_authorizations\")",
            " OR EXISTS (SELECT 1 FROM main.\"lnsat_local_identities\")",
            " OR EXISTS (SELECT 1 FROM main.\"lnsat_local_identity_events\")",
            " OR EXISTS (SELECT 1 FROM main.\"lnsat_local_identity_status_events\")",
            " OR EXISTS (SELECT 1 FROM main.\"lnsat_local_password_credentials\")",
            " OR EXISTS (SELECT 1 FROM main.\"lnsat_local_session_activity_events\")",
            " OR EXISTS (SELECT 1 FROM main.\"lnsat_local_session_events\")",
            " OR EXISTS (SELECT 1 FROM main.\"lnsat_local_session_revocations\")",
            " OR EXISTS (SELECT 1 FROM main.\"lnsat_local_session_rotations\")",
            " OR EXISTS (SELECT 1 FROM main.\"lnsat_local_sessions\")",
            " OR EXISTS (SELECT 1 FROM main.\"lnsat_operation_attempts\")",
            " OR EXISTS (SELECT 1 FROM main.\"lnsat_operation_receipts\")",
            " OR EXISTS (SELECT 1 FROM main.\"lnsat_operation_reconciliations\")",
            " OR EXISTS (SELECT 1 FROM main.\"lnsat_operations\")",
            " OR EXISTS (SELECT 1 FROM main.\"lnsat_packet_envelopes\")",
            " OR EXISTS (SELECT 1 FROM main.\"lnsat_packet_resource_refs\")",
            " OR EXISTS (SELECT 1 FROM main.\"lnsat_phase7_audit_bindings\")",
            " OR EXISTS (SELECT 1 FROM main.\"lnsat_phase7_entities\")",
            " OR EXISTS (SELECT 1 FROM main.\"lnsat_phase7_state_events\")",
            " OR EXISTS (SELECT 1 FROM main.\"lnsat_policy_decisions\")",
            " OR EXISTS (SELECT 1 FROM main.\"lnsat_recovery_inspection_events\")",
        )
    };
}

macro_rules! request_occupied {
    () => {
        concat!(
            "EXISTS (SELECT 1 FROM main.\"lnsat_action_request_evaluations\")",
            " OR EXISTS (SELECT 1 FROM main.\"lnsat_action_request_observations\")",
            " OR EXISTS (SELECT 1 FROM main.\"lnsat_action_requests\")",
        )
    };
}

pub(super) const V17_OCCUPIED: &str = concat!("SELECT ", legacy_occupied!());
pub(super) const V18_OCCUPIED: &str =
    concat!("SELECT ", legacy_occupied!(), " OR ", request_occupied!());

pub(super) const V19_OCCUPIED: &str = concat!(
    "SELECT ",
    legacy_occupied!(),
    " OR ",
    request_occupied!(),
    " OR EXISTS (SELECT 1 FROM main.\"headless_installations\")",
    " OR EXISTS (SELECT 1 FROM main.\"headless_generations\")",
    " OR EXISTS (SELECT 1 FROM main.\"headless_config_audit\")",
    " OR EXISTS (SELECT 1 FROM main.\"headless_active\")",
);

#[cfg(test)]
#[path = "headless_empty_state_tests.rs"]
mod tests;
