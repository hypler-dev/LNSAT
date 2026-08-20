use std::collections::HashSet;
use std::fmt;

/// Maximum bounded prior-state entries accepted by deterministic conformance.
pub const AUDIT_EVENT_IDEMPOTENCY_MAX_PRIOR_ENTRIES: usize = 10_000;

/// Exact stable audit idempotency and event identity pair.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AuditEventIdempotencyRefV1 {
    pub idempotency_key: String,
    pub event_id: String,
}

/// Side-effect-free idempotency outcome.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum AuditEventIdempotencyOutcomeV1 {
    AppendProposed,
    ExactReplay,
}

impl AuditEventIdempotencyOutcomeV1 {
    /// Stable wire value.
    #[must_use]
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::AppendProposed => "append_proposed",
            Self::ExactReplay => "exact_replay",
        }
    }
}

/// Deterministic proposed state. No write is performed.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AuditEventIdempotencyDecisionV1 {
    pub outcome: AuditEventIdempotencyOutcomeV1,
    pub record_ref: AuditEventIdempotencyRefV1,
    pub previous_state_count: usize,
    pub next_state_count: usize,
    pub proposed_state: Vec<AuditEventIdempotencyRefV1>,
    pub write_performed: bool,
    pub side_effects: [(); 0],
}

/// Stable fail-closed audit idempotency errors.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum AuditEventIdempotencyErrorV1 {
    InvalidPriorState,
    DuplicateIdempotencyKey,
    InvalidCandidate,
    Collision,
}

impl AuditEventIdempotencyErrorV1 {
    /// Stable cross-language error code.
    #[must_use]
    pub const fn code(self) -> &'static str {
        match self {
            Self::InvalidPriorState => "audit_event_idempotency.invalid_prior_state",
            Self::DuplicateIdempotencyKey => "audit_event_idempotency.duplicate_idempotency_key",
            Self::InvalidCandidate => "audit_event_idempotency.invalid_candidate",
            Self::Collision => "audit_event_idempotency.collision",
        }
    }
}

impl fmt::Display for AuditEventIdempotencyErrorV1 {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(self.code())
    }
}

impl std::error::Error for AuditEventIdempotencyErrorV1 {}

/// Classifies append, exact replay, or collision without persistence.
///
/// # Errors
///
/// Rejects oversized, malformed, or duplicate prior state; malformed
/// candidates; and same-key/different-event collisions.
pub fn evaluate_audit_event_idempotency_v1(
    prior_state: &[AuditEventIdempotencyRefV1],
    candidate: &AuditEventIdempotencyRefV1,
) -> Result<AuditEventIdempotencyDecisionV1, AuditEventIdempotencyErrorV1> {
    if prior_state.len() > AUDIT_EVENT_IDEMPOTENCY_MAX_PRIOR_ENTRIES {
        return Err(AuditEventIdempotencyErrorV1::InvalidPriorState);
    }

    let mut seen_keys = HashSet::with_capacity(prior_state.len());
    for entry in prior_state {
        if !valid_ref(entry) {
            return Err(AuditEventIdempotencyErrorV1::InvalidPriorState);
        }
        if !seen_keys.insert(entry.idempotency_key.as_str()) {
            return Err(AuditEventIdempotencyErrorV1::DuplicateIdempotencyKey);
        }
    }
    if !valid_ref(candidate) {
        return Err(AuditEventIdempotencyErrorV1::InvalidCandidate);
    }

    let existing = prior_state
        .iter()
        .find(|entry| entry.idempotency_key == candidate.idempotency_key);
    if existing.is_some_and(|entry| entry.event_id != candidate.event_id) {
        return Err(AuditEventIdempotencyErrorV1::Collision);
    }

    let (outcome, record_ref, proposed_state) = if let Some(entry) = existing {
        (
            AuditEventIdempotencyOutcomeV1::ExactReplay,
            entry.clone(),
            prior_state.to_vec(),
        )
    } else {
        let mut proposed = Vec::with_capacity(prior_state.len() + 1);
        proposed.extend_from_slice(prior_state);
        proposed.push(candidate.clone());
        (
            AuditEventIdempotencyOutcomeV1::AppendProposed,
            candidate.clone(),
            proposed,
        )
    };

    Ok(AuditEventIdempotencyDecisionV1 {
        outcome,
        record_ref,
        previous_state_count: prior_state.len(),
        next_state_count: proposed_state.len(),
        proposed_state,
        write_performed: false,
        side_effects: [],
    })
}

fn valid_ref(value: &AuditEventIdempotencyRefV1) -> bool {
    valid_idempotency_key(&value.idempotency_key) && valid_event_id(&value.event_id)
}

fn valid_idempotency_key(value: &str) -> bool {
    const PREFIXES: [&str; 3] = [
        "audit:policy.decision_recorded:pol_",
        "audit:approval.request_recorded:apr_",
        "audit:approval.decision_recorded:apd_",
    ];
    PREFIXES
        .iter()
        .find_map(|prefix| value.strip_prefix(prefix))
        .is_some_and(valid_lower_hex_64)
}

fn valid_event_id(value: &str) -> bool {
    value.strip_prefix("aud_").is_some_and(valid_lower_hex_64)
}

fn valid_lower_hex_64(value: &str) -> bool {
    value.len() == 64
        && value
            .bytes()
            .all(|byte| byte.is_ascii_digit() || (b'a'..=b'f').contains(&byte))
}

#[cfg(test)]
mod tests {
    use super::{
        AUDIT_EVENT_IDEMPOTENCY_MAX_PRIOR_ENTRIES, AuditEventIdempotencyErrorV1,
        AuditEventIdempotencyOutcomeV1, AuditEventIdempotencyRefV1,
        evaluate_audit_event_idempotency_v1,
    };

    #[test]
    fn append_and_exact_replay_are_deterministic() {
        let candidate = candidate();
        let append = evaluate_audit_event_idempotency_v1(&[], &candidate)
            .expect("empty state must propose append");
        assert_eq!(
            append.outcome,
            AuditEventIdempotencyOutcomeV1::AppendProposed
        );
        assert!(!append.write_performed);
        assert_eq!(append.proposed_state, vec![candidate.clone()]);

        let replay =
            evaluate_audit_event_idempotency_v1(std::slice::from_ref(&candidate), &candidate)
                .expect("same key and event must replay");
        assert_eq!(replay.outcome, AuditEventIdempotencyOutcomeV1::ExactReplay);
        assert_eq!(replay.previous_state_count, replay.next_state_count);
    }

    #[test]
    fn collision_and_duplicate_prior_fail_closed() {
        let candidate = candidate();
        let collision = AuditEventIdempotencyRefV1 {
            event_id: format!("aud_{}", "c".repeat(64)),
            ..candidate.clone()
        };
        assert_eq!(
            evaluate_audit_event_idempotency_v1(&[collision], &candidate),
            Err(AuditEventIdempotencyErrorV1::Collision)
        );
        assert_eq!(
            evaluate_audit_event_idempotency_v1(
                &[candidate.clone(), candidate.clone()],
                &candidate,
            ),
            Err(AuditEventIdempotencyErrorV1::DuplicateIdempotencyKey)
        );
    }

    #[test]
    fn oversized_state_fails_before_entry_inspection() {
        let invalid = AuditEventIdempotencyRefV1 {
            idempotency_key: "invalid".to_owned(),
            event_id: "invalid".to_owned(),
        };
        let prior = vec![invalid; AUDIT_EVENT_IDEMPOTENCY_MAX_PRIOR_ENTRIES + 1];
        assert_eq!(
            evaluate_audit_event_idempotency_v1(&prior, &candidate()),
            Err(AuditEventIdempotencyErrorV1::InvalidPriorState)
        );
    }

    fn candidate() -> AuditEventIdempotencyRefV1 {
        AuditEventIdempotencyRefV1 {
            idempotency_key: format!("audit:approval.decision_recorded:apd_{}", "a".repeat(64)),
            event_id: format!("aud_{}", "a".repeat(64)),
        }
    }
}
