//! Private original-operation read budget. This module grants no caller authority.

use std::{
    sync::{
        Arc,
        atomic::{AtomicBool, AtomicU64, Ordering},
    },
    time::{Duration, Instant},
};

pub(super) const MANIFEST_LIMIT: u64 = 64 * 1024;
pub(super) const OCI_LIMIT: u64 = 1024 * 1024;
pub(super) const ARTIFACT_LIMIT: u64 = 256 * 1024 * 1024;
pub(super) const ARTIFACT_OCI_LIMIT: u64 = 1024 * 1024 * 1024;
pub(super) const READ_CHUNK: usize = 64 * 1024;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub(super) enum ArtifactReadPurpose {
    RootManifest,
    OciBody,
    ArtifactSnapshot,
}

impl ArtifactReadPurpose {
    pub(super) const fn limit(self) -> u64 {
        match self {
            Self::RootManifest => MANIFEST_LIMIT,
            Self::OciBody => OCI_LIMIT,
            Self::ArtifactSnapshot => ARTIFACT_LIMIT,
        }
    }

    pub(super) const fn retains_body(self) -> bool {
        matches!(self, Self::RootManifest | Self::OciBody)
    }

    pub(super) const fn uses_artifact_allowance(self) -> bool {
        !matches!(self, Self::RootManifest)
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub(super) enum ArtifactError {
    UnsupportedPlatform,
    InvalidDescriptor,
    InvalidLength,
    ReadRejected,
    ObjectChanged,
    LimitExceeded,
    StorageUnavailable,
    BudgetExhausted,
    ObservationInvalid,
    AssociationRejected,
    CleanupUncertain,
}

impl ArtifactError {
    pub(super) const fn code(self) -> &'static str {
        match self {
            Self::UnsupportedPlatform => "native_artifact.unsupported_platform",
            Self::InvalidDescriptor => "native_artifact.invalid_descriptor",
            Self::InvalidLength => "native_artifact.invalid_length",
            Self::ReadRejected => "native_artifact.read_rejected",
            Self::ObjectChanged => "native_artifact.object_changed",
            Self::LimitExceeded => "native_artifact.limit_exceeded",
            Self::StorageUnavailable => "native_artifact.storage_unavailable",
            Self::BudgetExhausted => "native_artifact.budget_exhausted",
            Self::ObservationInvalid => "native_artifact.observation_invalid",
            Self::AssociationRejected => "native_artifact.association_rejected",
            Self::CleanupUncertain => "native_artifact.cleanup_uncertain",
        }
    }
}

pub(super) struct ArtifactBudgetState {
    deadline: Instant,
    all_content: AtomicU64,
    artifact_oci_content: AtomicU64,
    invalid: AtomicBool,
    manifest_claimed: AtomicBool,
}

impl ArtifactBudgetState {
    pub(super) fn valid(&self) -> Result<(), ArtifactError> {
        if self.invalid.load(Ordering::SeqCst) {
            return Err(ArtifactError::ObservationInvalid);
        }
        if Instant::now() >= self.deadline {
            self.invalidate();
            return Err(ArtifactError::BudgetExhausted);
        }
        Ok(())
    }

    pub(super) fn invalidate(&self) {
        self.invalid.store(true, Ordering::SeqCst);
    }

    pub(super) fn deadline(&self) -> Instant {
        self.deadline
    }

    pub(super) fn claim_manifest(&self) -> Result<(), ArtifactError> {
        self.manifest_claimed
            .compare_exchange(false, true, Ordering::SeqCst, Ordering::SeqCst)
            .map(|_| ())
            .map_err(|_| {
                self.invalidate();
                ArtifactError::ObservationInvalid
            })
    }

    pub(super) fn manifest_claimed(&self) -> bool {
        self.manifest_claimed.load(Ordering::SeqCst)
    }

    pub(super) fn charge(
        &self,
        purpose: ArtifactReadPurpose,
        count: usize,
    ) -> Result<(), ArtifactError> {
        let Ok(count) = u64::try_from(count) else {
            self.invalidate();
            return Err(ArtifactError::LimitExceeded);
        };
        if self
            .all_content
            .fetch_update(Ordering::SeqCst, Ordering::SeqCst, |old| {
                old.checked_add(count)
            })
            .is_err()
        {
            self.invalidate();
            return Err(ArtifactError::LimitExceeded);
        }
        if purpose.uses_artifact_allowance() {
            let result =
                self.artifact_oci_content
                    .fetch_update(Ordering::SeqCst, Ordering::SeqCst, |old| {
                        old.checked_add(count)
                            .filter(|next| *next <= ARTIFACT_OCI_LIMIT)
                    });
            if result.is_err() {
                self.invalidate();
                return Err(ArtifactError::LimitExceeded);
            }
        }
        Ok(())
    }

    pub(super) fn remaining(&self, purpose: ArtifactReadPurpose) -> Result<u64, ArtifactError> {
        if !purpose.uses_artifact_allowance() {
            return Ok(u64::MAX);
        }
        if let Some(remaining) =
            ARTIFACT_OCI_LIMIT.checked_sub(self.artifact_oci_content.load(Ordering::SeqCst))
        {
            Ok(remaining)
        } else {
            self.invalidate();
            Err(ArtifactError::LimitExceeded)
        }
    }

    pub(super) fn content_counts(&self) -> (u64, u64) {
        (
            self.all_content.load(Ordering::SeqCst),
            self.artifact_oci_content.load(Ordering::SeqCst),
        )
    }

    #[cfg(test)]
    pub(super) fn set_deadline_for_test(&mut self, deadline: Instant) {
        self.deadline = deadline;
    }

    #[cfg(test)]
    pub(super) fn set_content_counts_for_test(&self, all_content: u64, artifact_oci_content: u64) {
        self.all_content.store(all_content, Ordering::SeqCst);
        self.artifact_oci_content
            .store(artifact_oci_content, Ordering::SeqCst);
    }
}

/// The owner creates this once; it has no reset or clone operation.
pub(super) struct ArtifactReadBudget {
    state: Arc<ArtifactBudgetState>,
}

impl ArtifactReadBudget {
    pub(super) fn begin(enclosing_deadline: Instant) -> Result<Self, ArtifactError> {
        let deadline = checked_deadline(Instant::now(), enclosing_deadline)?;
        Ok(Self {
            state: Arc::new(ArtifactBudgetState {
                deadline,
                all_content: AtomicU64::new(0),
                artifact_oci_content: AtomicU64::new(0),
                invalid: AtomicBool::new(false),
                manifest_claimed: AtomicBool::new(false),
            }),
        })
    }

    pub(super) fn owns(&self, state: &Arc<ArtifactBudgetState>) -> bool {
        Arc::ptr_eq(&self.state, state)
    }

    pub(super) fn shared_state(&self) -> &Arc<ArtifactBudgetState> {
        &self.state
    }

    #[cfg(test)]
    pub(super) fn set_deadline_for_test(&mut self, deadline: Instant) {
        Arc::get_mut(&mut self.state)
            .expect("test budget state must be uniquely held")
            .set_deadline_for_test(deadline);
    }

    #[cfg(test)]
    pub(super) fn set_content_counts_for_test(&self, all_content: u64, artifact_oci_content: u64) {
        self.state
            .set_content_counts_for_test(all_content, artifact_oci_content);
    }
}

pub(super) fn checked_deadline(
    start: Instant,
    enclosing: Instant,
) -> Result<Instant, ArtifactError> {
    let local = start
        .checked_add(Duration::from_secs(5))
        .ok_or(ArtifactError::BudgetExhausted)?;
    let deadline = local.min(enclosing);
    if Instant::now() >= deadline {
        return Err(ArtifactError::BudgetExhausted);
    }
    Ok(deadline)
}
