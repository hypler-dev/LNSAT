//! Private, process-local operation identity allocation for a future control root.
//!
//! These identities only prevent accidental equality across allocator domains.
//! They do not establish store, native, budget, or authority provenance.

use std::num::NonZeroU64;
use std::sync::Arc;

/// Zero-sized provenance marker shared by identities from one allocator.
struct IdentityDomain;

/// Allocates finite, process-local identities for one future control root.
pub(super) struct OperationIdentityAllocator {
    domain: Arc<IdentityDomain>,
    next: Option<NonZeroU64>,
}

/// Opaque identity whose equality is valid only within its allocation domain.
pub(super) struct OperationIdentity {
    domain: Arc<IdentityDomain>,
    ordinal: NonZeroU64,
}

/// Fixed failure for exhausted finite identity allocation.
#[derive(Debug)]
pub(super) struct IdentityExhausted;

impl OperationIdentityAllocator {
    pub(super) fn new() -> Self {
        Self {
            domain: Arc::new(IdentityDomain),
            next: Some(NonZeroU64::MIN),
        }
    }

    pub(super) fn issue(&mut self) -> Result<OperationIdentity, IdentityExhausted> {
        let ordinal = self.next.ok_or(IdentityExhausted)?;
        let Some(successor) = ordinal.get().checked_add(1).and_then(NonZeroU64::new) else {
            self.next = None;
            return Err(IdentityExhausted);
        };

        self.next = Some(successor);
        Ok(OperationIdentity {
            domain: Arc::clone(&self.domain),
            ordinal,
        })
    }
}

impl OperationIdentity {
    pub(super) fn same_operation(&self, other: &Self) -> bool {
        Arc::ptr_eq(&self.domain, &other.domain) && self.ordinal == other.ordinal
    }
}

#[cfg(test)]
mod tests {
    use super::{IdentityDomain, OperationIdentity, OperationIdentityAllocator};
    use std::num::NonZeroU64;
    use std::sync::Arc;

    fn assert_send_sync<T: Send + Sync>() {}

    #[test]
    fn identities_are_send_and_sync() {
        assert_send_sync::<OperationIdentityAllocator>();
        assert_send_sync::<OperationIdentity>();
    }

    #[test]
    fn issuance_is_monotonic_and_self_matching() {
        let mut allocator = OperationIdentityAllocator::new();
        let first = allocator.issue().expect("first identity should issue");
        let second = allocator.issue().expect("second identity should issue");

        assert!(first.same_operation(&first));
        assert!(!first.same_operation(&second));
        assert!(first.ordinal < second.ordinal);
    }

    #[test]
    fn equal_ordinals_from_distinct_domains_do_not_match() {
        let mut first_allocator = OperationIdentityAllocator::new();
        let mut second_allocator = OperationIdentityAllocator::new();
        let first = first_allocator
            .issue()
            .expect("first allocator should issue");
        let second = second_allocator
            .issue()
            .expect("second allocator should issue");

        assert_eq!(first.ordinal, second.ordinal);
        assert!(!first.same_operation(&second));
    }

    #[test]
    fn retained_identity_does_not_match_new_allocator_after_drop() {
        let retained = {
            let mut allocator = OperationIdentityAllocator::new();
            allocator.issue().expect("identity should issue")
        };
        let mut replacement_allocator = OperationIdentityAllocator::new();
        let replacement = replacement_allocator
            .issue()
            .expect("replacement identity should issue");

        assert_eq!(retained.ordinal, replacement.ordinal);
        assert!(!retained.same_operation(&replacement));
    }

    #[test]
    fn max_minus_one_issues_once_then_exhaustion_is_sticky() {
        let mut allocator = OperationIdentityAllocator {
            domain: Arc::new(IdentityDomain),
            next: NonZeroU64::new(u64::MAX - 1),
        };
        let final_identity = allocator.issue().expect("max minus one should issue");

        assert_eq!(final_identity.ordinal.get(), u64::MAX - 1);
        assert!(allocator.issue().is_err());
        assert!(allocator.next.is_none());
        assert!(final_identity.same_operation(&final_identity));
        assert!(allocator.issue().is_err());
        assert!(allocator.next.is_none());
    }

    #[test]
    fn already_exhausted_allocator_denies_issuance() {
        let mut allocator = OperationIdentityAllocator {
            domain: Arc::new(IdentityDomain),
            next: None,
        };

        assert!(allocator.issue().is_err());
        assert!(allocator.next.is_none());
    }
}
