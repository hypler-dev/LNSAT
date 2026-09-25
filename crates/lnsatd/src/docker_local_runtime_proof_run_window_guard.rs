//! Source-only UTC run-window guard for a later Phase 11 proof driver.
//!
//! This module binds one manifest digest and one canonical UTC window to a
//! trusted clock observation. It performs no process, Docker, network, or
//! filesystem operation and grants no execution authority.

use crate::docker_local_runtime_proof_run_manifest::{
    DockerLocalRuntimeProofRunWindowV1, MAX_DOCKER_LOCAL_RUNTIME_PROOF_RUN_WINDOW_SECONDS_V1,
    utc_epoch_seconds_v1,
};
use std::fmt;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

/// Stable, non-disclosing run-window guard failure.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub(crate) enum DockerLocalRuntimeProofRunWindowGuardErrorV1 {
    Rejected,
}

impl DockerLocalRuntimeProofRunWindowGuardErrorV1 {
    #[must_use]
    pub(crate) const fn code(self) -> &'static str {
        match self {
            Self::Rejected => "docker_local_runtime_proof_run_window_guard.rejected",
        }
    }
}

impl fmt::Display for DockerLocalRuntimeProofRunWindowGuardErrorV1 {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(self.code())
    }
}

impl std::error::Error for DockerLocalRuntimeProofRunWindowGuardErrorV1 {}

/// Opaque binding to an admitted UTC window and its first trusted observation.
///
/// Passing this guard neither authorizes a launch nor proves any runtime fact.
pub(crate) struct DockerLocalRuntimeProofRunWindowGuardV1 {
    manifest_digest: [u8; 32],
    run_window: DockerLocalRuntimeProofRunWindowV1,
    observed_at: Duration,
}

impl DockerLocalRuntimeProofRunWindowGuardV1 {
    /// Rechecks the exact window and digest at the later process boundary.
    ///
    /// # Errors
    ///
    /// Returns one stable rejection if the clock predates the epoch, moved
    /// backwards, is outside the original half-open window, or if the exact
    /// manifest digest or run-window declaration changed.
    pub(crate) fn revalidate(
        &self,
        run_window: &DockerLocalRuntimeProofRunWindowV1,
        manifest_digest: [u8; 32],
        trusted_now: SystemTime,
    ) -> Result<(), DockerLocalRuntimeProofRunWindowGuardErrorV1> {
        let current = validate_run_window_v1(run_window, manifest_digest, trusted_now)?;
        if self.manifest_digest != current.manifest_digest
            || self.run_window != current.run_window
            || current.observed_at < self.observed_at
        {
            return Err(DockerLocalRuntimeProofRunWindowGuardErrorV1::Rejected);
        }
        Ok(())
    }
}

/// Verifies a manifest's declared half-open UTC window against a trusted clock.
///
/// The start is inclusive and the end is exclusive. The result captures the
/// original manifest digest, exact declarations, and trusted observation so a
/// later guard can reject substitution, rollback, and expiry.
///
/// # Errors
///
/// Returns one stable rejection for malformed or inverted windows, a clock
/// before the Unix epoch, or a trusted observation outside the declared window.
pub(crate) fn preflight_phase11_proof_run_window_v1(
    run_window: &DockerLocalRuntimeProofRunWindowV1,
    manifest_digest: [u8; 32],
    trusted_now: SystemTime,
) -> Result<DockerLocalRuntimeProofRunWindowGuardV1, DockerLocalRuntimeProofRunWindowGuardErrorV1> {
    validate_run_window_v1(run_window, manifest_digest, trusted_now)
}

fn validate_run_window_v1(
    run_window: &DockerLocalRuntimeProofRunWindowV1,
    manifest_digest: [u8; 32],
    trusted_now: SystemTime,
) -> Result<DockerLocalRuntimeProofRunWindowGuardV1, DockerLocalRuntimeProofRunWindowGuardErrorV1> {
    let start = utc_epoch_seconds_v1(&run_window.not_before_utc)
        .ok_or(DockerLocalRuntimeProofRunWindowGuardErrorV1::Rejected)?;
    let end = utc_epoch_seconds_v1(&run_window.not_after_utc)
        .ok_or(DockerLocalRuntimeProofRunWindowGuardErrorV1::Rejected)?;
    if end <= start || end - start > MAX_DOCKER_LOCAL_RUNTIME_PROOF_RUN_WINDOW_SECONDS_V1 {
        return Err(DockerLocalRuntimeProofRunWindowGuardErrorV1::Rejected);
    }
    let observed_at = trusted_now
        .duration_since(UNIX_EPOCH)
        .map_err(|_| DockerLocalRuntimeProofRunWindowGuardErrorV1::Rejected)?;
    if observed_at < Duration::from_secs(start) || observed_at >= Duration::from_secs(end) {
        return Err(DockerLocalRuntimeProofRunWindowGuardErrorV1::Rejected);
    }
    Ok(DockerLocalRuntimeProofRunWindowGuardV1 {
        manifest_digest,
        run_window: run_window.clone(),
        observed_at,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    const START: u64 = 1_735_689_600;
    const END: u64 = START + 60;

    fn time_v1(seconds: u64) -> SystemTime {
        UNIX_EPOCH + Duration::from_secs(seconds)
    }

    fn window_v1() -> DockerLocalRuntimeProofRunWindowV1 {
        DockerLocalRuntimeProofRunWindowV1 {
            not_before_utc: "2025-01-01T00:00:00Z".to_owned(),
            not_after_utc: "2025-01-01T00:01:00Z".to_owned(),
        }
    }

    #[test]
    fn accepts_inclusive_start_and_rejects_exclusive_end() {
        let window = window_v1();
        assert!(preflight_phase11_proof_run_window_v1(&window, [7; 32], time_v1(START)).is_ok());
        assert!(preflight_phase11_proof_run_window_v1(&window, [7; 32], time_v1(END - 1)).is_ok());
        assert!(preflight_phase11_proof_run_window_v1(&window, [7; 32], time_v1(END)).is_err());
        assert!(
            preflight_phase11_proof_run_window_v1(
                &window,
                [7; 32],
                time_v1(END - 1) + Duration::from_nanos(999_999_999)
            )
            .is_ok()
        );
        assert!(
            preflight_phase11_proof_run_window_v1(
                &window,
                [7; 32],
                time_v1(END) + Duration::from_nanos(1)
            )
            .is_err()
        );
    }

    #[test]
    fn rejects_future_expired_and_pre_epoch_observations() {
        let window = window_v1();
        assert!(
            preflight_phase11_proof_run_window_v1(&window, [7; 32], time_v1(START - 1)).is_err()
        );
        assert!(preflight_phase11_proof_run_window_v1(&window, [7; 32], time_v1(END)).is_err());
        assert!(
            preflight_phase11_proof_run_window_v1(
                &window,
                [7; 32],
                UNIX_EPOCH - Duration::from_secs(1)
            )
            .is_err()
        );
    }

    #[test]
    fn final_revalidation_rejects_window_digest_rollback_and_expiry() {
        let window = window_v1();
        let guard = preflight_phase11_proof_run_window_v1(&window, [7; 32], time_v1(START + 10))
            .expect("initial window accepts");
        assert!(
            guard
                .revalidate(&window, [7; 32], time_v1(START + 11))
                .is_ok()
        );
        assert!(
            guard
                .revalidate(&window, [8; 32], time_v1(START + 11))
                .is_err()
        );
        let drifted = DockerLocalRuntimeProofRunWindowV1 {
            not_before_utc: window.not_before_utc.clone(),
            not_after_utc: "2025-01-01T00:00:59Z".to_owned(),
        };
        assert!(
            guard
                .revalidate(&drifted, [7; 32], time_v1(START + 11))
                .is_err()
        );
        assert!(
            guard
                .revalidate(&window, [7; 32], time_v1(START + 9))
                .is_err()
        );
        assert!(guard.revalidate(&window, [7; 32], time_v1(END)).is_err());
    }

    #[test]
    fn rejects_malformed_or_inverted_declarations() {
        let mut window = window_v1();
        window.not_before_utc = "2025-01-01T00:01:00Z".to_owned();
        assert!(preflight_phase11_proof_run_window_v1(&window, [7; 32], time_v1(START)).is_err());
        window.not_before_utc = "not-a-timestamp".to_owned();
        assert!(preflight_phase11_proof_run_window_v1(&window, [7; 32], time_v1(START)).is_err());
        window.not_before_utc = "2025-01-01T00:00:00Z".to_owned();
        window.not_after_utc = "2025-01-01T02:00:00Z".to_owned();
        assert!(preflight_phase11_proof_run_window_v1(&window, [7; 32], time_v1(START)).is_err());
    }
}
