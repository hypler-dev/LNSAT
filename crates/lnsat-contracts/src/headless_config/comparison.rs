use super::{
    ComposedHeadlessConfigV1, HeadlessConfigDeclarationV1, compose_headless_config_declaration_v1,
};
use crate::{PacketBudgetV1, is_valid_reference_v1};
use serde_json::{Value, json};
use sha2::{Digest, Sha256};
use std::collections::{BTreeMap, BTreeSet};
use std::fmt::{self, Write as _};

#[path = "comparison_view.rs"]
mod view;
pub use view::{
    HEADLESS_COMPARISON_VIEW_MODEL_SCHEMA_V1, HeadlessComparisonViewModelV1,
    MAX_HEADLESS_COMPARISON_VIEW_MODEL_BYTES_V1,
};

const MAX_SAFE_INTEGER_V1: u64 = 9_007_199_254_740_991;
const MAX_RESOURCES_V1: usize = 128;
const MAX_RULES_V1: usize = 1_280;
const MAX_UNION_RESOURCES_V1: usize = 256;
const MAX_UNION_RULES_V1: usize = 2_560;

/// Only asserted-profile value this source model recognizes.
///
/// This conditional compatibility check does not inspect Docker, the host, or
/// any runtime. Unknown values fail closed as `unverifiable`.
pub const HEADLESS_COMPARISON_SUPPORTED_ASSERTED_PROFILE_V1: &str =
    "lnsat.runtime_profile.docker_local.v1";

/// Non-authoritative outcome of a pure envelope comparison.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum HeadlessComparisonModelClassV1 {
    Equal,
    Narrowing,
    WideningOrMixed,
    Unverifiable,
}

impl HeadlessComparisonModelClassV1 {
    #[must_use]
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Equal => "equal",
            Self::Narrowing => "narrowing",
            Self::WideningOrMixed => "widening_or_mixed",
            Self::Unverifiable => "unverifiable",
        }
    }
}

/// Structural constructor failure. It carries no submitted input values.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum HeadlessComparisonModelErrorV1 {
    InvalidInput,
}

impl HeadlessComparisonModelErrorV1 {
    #[must_use]
    pub const fn code(self) -> &'static str {
        "headless_config.comparison.invalid_input"
    }
}

impl fmt::Display for HeadlessComparisonModelErrorV1 {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(self.code())
    }
}

impl std::error::Error for HeadlessComparisonModelErrorV1 {}

/// Closed mode vocabulary for a supplied effective envelope.
#[derive(Clone, Copy, Debug, Eq, Ord, PartialEq, PartialOrd)]
pub enum HeadlessComparisonRuleModeV1 {
    Deny,
    ApprovalRequired,
    Allow,
}

impl HeadlessComparisonRuleModeV1 {
    const fn rank(self) -> u8 {
        match self {
            Self::Deny => 0,
            Self::ApprovalRequired => 1,
            Self::Allow => 2,
        }
    }

    const fn as_str(self) -> &'static str {
        match self {
            Self::Deny => "deny",
            Self::ApprovalRequired => "approval_required",
            Self::Allow => "allow",
        }
    }
}

/// Declared resource kind copied into asserted evidence only.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum HeadlessComparisonResourceKindV1 {
    Folder,
    Repository,
    Service,
    Connector,
    RuntimeProfile,
    OsResource,
}

impl HeadlessComparisonResourceKindV1 {
    const fn as_str(self) -> &'static str {
        match self {
            Self::Folder => "folder",
            Self::Repository => "repository",
            Self::Service => "service",
            Self::Connector => "connector",
            Self::RuntimeProfile => "runtime_profile",
            Self::OsResource => "os_resource",
        }
    }
}

/// Five independent safe-integer ceilings.
#[derive(Clone, Copy, Eq, PartialEq)]
pub struct HeadlessComparisonLimitsV1 {
    tokens: u64,
    runtime_seconds: u64,
    cost_microusd: u64,
    cpu_millicores: u64,
    memory_bytes: u64,
}

impl fmt::Debug for HeadlessComparisonLimitsV1 {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("HeadlessComparisonLimitsV1")
            .finish_non_exhaustive()
    }
}

impl HeadlessComparisonLimitsV1 {
    /// # Errors
    ///
    /// Returns `InvalidInput` when any ceiling exceeds the v1 safe integer.
    pub fn new(
        tokens: u64,
        runtime_seconds: u64,
        cost_microusd: u64,
        cpu_millicores: u64,
        memory_bytes: u64,
    ) -> Result<Self, HeadlessComparisonModelErrorV1> {
        let limits = Self {
            tokens,
            runtime_seconds,
            cost_microusd,
            cpu_millicores,
            memory_bytes,
        };
        if limits.valid() {
            Ok(limits)
        } else {
            Err(HeadlessComparisonModelErrorV1::InvalidInput)
        }
    }

    #[must_use]
    pub const fn zero() -> Self {
        Self {
            tokens: 0,
            runtime_seconds: 0,
            cost_microusd: 0,
            cpu_millicores: 0,
            memory_bytes: 0,
        }
    }

    #[must_use]
    pub const fn as_packet_budget(self) -> PacketBudgetV1 {
        PacketBudgetV1 {
            tokens: self.tokens,
            runtime_seconds: self.runtime_seconds,
            cost_microusd: self.cost_microusd,
            cpu_millicores: self.cpu_millicores,
            memory_bytes: self.memory_bytes,
        }
    }

    const fn valid(self) -> bool {
        self.tokens <= MAX_SAFE_INTEGER_V1
            && self.runtime_seconds <= MAX_SAFE_INTEGER_V1
            && self.cost_microusd <= MAX_SAFE_INTEGER_V1
            && self.cpu_millicores <= MAX_SAFE_INTEGER_V1
            && self.memory_bytes <= MAX_SAFE_INTEGER_V1
    }

    const fn within(self, ceiling: Self) -> bool {
        self.tokens <= ceiling.tokens
            && self.runtime_seconds <= ceiling.runtime_seconds
            && self.cost_microusd <= ceiling.cost_microusd
            && self.cpu_millicores <= ceiling.cpu_millicores
            && self.memory_bytes <= ceiling.memory_bytes
    }

    fn relation(self, other: Self) -> Direction {
        Direction::from_pairs([
            self.tokens.cmp(&other.tokens),
            self.runtime_seconds.cmp(&other.runtime_seconds),
            self.cost_microusd.cmp(&other.cost_microusd),
            self.cpu_millicores.cmp(&other.cpu_millicores),
            self.memory_bytes.cmp(&other.memory_bytes),
        ])
    }

    fn json(self) -> Value {
        json!({"tokens": self.tokens, "runtime_seconds": self.runtime_seconds,
            "cost_microusd": self.cost_microusd, "cpu_millicores": self.cpu_millicores,
            "memory_bytes": self.memory_bytes})
    }
}

/// One effective-envelope tuple. Structural input only; it grants nothing.
#[derive(Clone, Eq, PartialEq)]
pub struct HeadlessComparisonRuleV1 {
    principal_ref: String,
    resource_ref: String,
    capability: String,
    mode: HeadlessComparisonRuleModeV1,
    limits: HeadlessComparisonLimitsV1,
}

impl fmt::Debug for HeadlessComparisonRuleV1 {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("HeadlessComparisonRuleV1")
            .finish_non_exhaustive()
    }
}

impl HeadlessComparisonRuleV1 {
    #[must_use]
    pub fn new(
        principal_ref: impl Into<String>,
        resource_ref: impl Into<String>,
        capability: impl Into<String>,
        mode: HeadlessComparisonRuleModeV1,
        limits: HeadlessComparisonLimitsV1,
    ) -> Self {
        Self {
            principal_ref: principal_ref.into(),
            resource_ref: resource_ref.into(),
            capability: capability.into(),
            mode,
            limits,
        }
    }

    fn key(&self) -> (&str, &str, &str) {
        (&self.principal_ref, &self.resource_ref, &self.capability)
    }

    fn json(&self) -> Value {
        json!({"principal_ref": self.principal_ref, "resource_ref": self.resource_ref,
            "capability": self.capability, "mode": self.mode.as_str(), "limits": self.limits.json()})
    }
}

/// Full supplied effective envelope. Construction does no policy or platform work.
#[derive(Clone)]
pub struct HeadlessComparisonEffectiveEnvelopeV1 {
    resource_allow: Vec<String>,
    rules: Vec<HeadlessComparisonRuleV1>,
}

impl fmt::Debug for HeadlessComparisonEffectiveEnvelopeV1 {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("HeadlessComparisonEffectiveEnvelopeV1")
            .field("resource_count", &self.resource_allow.len())
            .field("rule_count", &self.rules.len())
            .finish()
    }
}

impl HeadlessComparisonEffectiveEnvelopeV1 {
    #[must_use]
    pub fn new(resource_allow: Vec<String>, rules: Vec<HeadlessComparisonRuleV1>) -> Self {
        Self {
            resource_allow,
            rules,
        }
    }

    fn json(&self) -> Value {
        json!({"resource_allow": self.resource_allow, "rules": self.rules.iter().map(HeadlessComparisonRuleV1::json).collect::<Vec<_>>()})
    }
}

/// Asserted resource evidence. Its strings are retained only in an explicit result summary.
#[derive(Clone, Eq, PartialEq)]
pub struct HeadlessComparisonEvidenceV1 {
    resource_ref: String,
    kind: HeadlessComparisonResourceKindV1,
    declared_identity_digest: String,
    canonical_identity_digest: String,
    evidence_digest: String,
}

impl fmt::Debug for HeadlessComparisonEvidenceV1 {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("HeadlessComparisonEvidenceV1")
            .finish_non_exhaustive()
    }
}

impl HeadlessComparisonEvidenceV1 {
    #[must_use]
    pub fn new(
        resource_ref: impl Into<String>,
        kind: HeadlessComparisonResourceKindV1,
        declared_identity_digest: impl Into<String>,
        canonical_identity_digest: impl Into<String>,
        evidence_digest: impl Into<String>,
    ) -> Self {
        Self {
            resource_ref: resource_ref.into(),
            kind,
            declared_identity_digest: declared_identity_digest.into(),
            canonical_identity_digest: canonical_identity_digest.into(),
            evidence_digest: evidence_digest.into(),
        }
    }

    fn json(&self) -> Value {
        json!({"resource_ref": self.resource_ref, "kind": self.kind.as_str(),
        "declared_identity_digest": self.declared_identity_digest, "canonical_identity_digest": self.canonical_identity_digest,
        "evidence_digest": self.evidence_digest})
    }
}

/// Shared asserted comparison context. It is assertion material, never platform proof.
#[derive(Clone, Eq, PartialEq)]
pub struct HeadlessComparisonContextV1 {
    installation_ref: String,
    current_generation_ref: String,
    current_generation_digest: String,
    policy_floor_version: String,
    policy_floor_digest: String,
    active_stop: bool,
    stop_revocation_epoch: u64,
    enforcement_profile_version: String,
}

impl fmt::Debug for HeadlessComparisonContextV1 {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("HeadlessComparisonContextV1")
            .finish_non_exhaustive()
    }
}

impl HeadlessComparisonContextV1 {
    #[must_use]
    pub fn new(
        installation_ref: impl Into<String>,
        generation: (impl Into<String>, impl Into<String>),
        policy_floor: (impl Into<String>, impl Into<String>),
        active_stop: bool,
        stop_revocation_epoch: u64,
        enforcement_profile_version: impl Into<String>,
    ) -> Self {
        Self {
            installation_ref: installation_ref.into(),
            current_generation_ref: generation.0.into(),
            current_generation_digest: generation.1.into(),
            policy_floor_version: policy_floor.0.into(),
            policy_floor_digest: policy_floor.1.into(),
            active_stop,
            stop_revocation_epoch,
            enforcement_profile_version: enforcement_profile_version.into(),
        }
    }

    fn valid(&self) -> bool {
        valid_prefixed_reference(&self.installation_ref, "installation:")
            && valid_prefixed_reference(&self.current_generation_ref, "generation:")
            && valid_digest(&self.current_generation_digest)
            && valid_version(&self.policy_floor_version)
            && valid_digest(&self.policy_floor_digest)
            && self.stop_revocation_epoch <= MAX_SAFE_INTEGER_V1
            && valid_version(&self.enforcement_profile_version)
            && self.enforcement_profile_version == HEADLESS_COMPARISON_SUPPORTED_ASSERTED_PROFILE_V1
    }

    fn json(&self) -> Value {
        json!({"installation_ref": self.installation_ref, "current_generation_ref": self.current_generation_ref,
        "current_generation_digest": self.current_generation_digest, "policy_floor_version": self.policy_floor_version,
        "policy_floor_digest": self.policy_floor_digest, "active_stop": self.active_stop,
        "stop_revocation_epoch": self.stop_revocation_epoch, "enforcement_profile_version": self.enforcement_profile_version})
    }
}

/// One sealed HCFG-3 declaration paired with only structural asserted inputs.
#[derive(Clone)]
pub struct HeadlessComparisonSideV1 {
    declaration: HeadlessConfigDeclarationV1,
    envelope: HeadlessComparisonEffectiveEnvelopeV1,
    evidence: Vec<HeadlessComparisonEvidenceV1>,
    context: HeadlessComparisonContextV1,
}

impl fmt::Debug for HeadlessComparisonSideV1 {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("HeadlessComparisonSideV1")
            .field("evidence_count", &self.evidence.len())
            .finish_non_exhaustive()
    }
}

impl HeadlessComparisonSideV1 {
    #[must_use]
    pub fn new(
        declaration: HeadlessConfigDeclarationV1,
        envelope: HeadlessComparisonEffectiveEnvelopeV1,
        evidence: Vec<HeadlessComparisonEvidenceV1>,
        context: HeadlessComparisonContextV1,
    ) -> Self {
        Self {
            declaration,
            envelope,
            evidence,
            context,
        }
    }
}

/// Explicit in-memory summary. It has no serializer and is never logged by this model.
#[derive(Clone)]
pub struct HeadlessComparisonSummaryV1 {
    resource_changes: Vec<HeadlessComparisonResourceChangeV1>,
    rule_changes: Vec<HeadlessComparisonRuleChangeV1>,
}

impl fmt::Debug for HeadlessComparisonSummaryV1 {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("HeadlessComparisonSummaryV1")
            .field("resource_change_count", &self.resource_changes.len())
            .field("rule_change_count", &self.rule_changes.len())
            .finish_non_exhaustive()
    }
}

impl HeadlessComparisonSummaryV1 {
    #[must_use]
    pub fn resource_change_count(&self) -> usize {
        self.resource_changes.len()
    }
    #[must_use]
    pub fn rule_change_count(&self) -> usize {
        self.rule_changes.len()
    }
    #[must_use]
    pub fn resource_changes(&self) -> &[HeadlessComparisonResourceChangeV1] {
        &self.resource_changes
    }
    #[must_use]
    pub fn rule_changes(&self) -> &[HeadlessComparisonRuleChangeV1] {
        &self.rule_changes
    }
}

#[derive(Clone)]
pub struct HeadlessComparisonResourceChangeV1 {
    resource_ref: String,
    old: Option<HeadlessComparisonResourceStateV1>,
    candidate: Option<HeadlessComparisonResourceStateV1>,
}
#[derive(Clone, Eq, PartialEq)]
pub struct HeadlessComparisonResourceStateV1 {
    reachable: bool,
    kind: HeadlessComparisonResourceKindV1,
    declared_identity_digest: String,
    canonical_identity_digest: String,
    evidence_digest: String,
}
#[derive(Clone)]
pub struct HeadlessComparisonRuleChangeV1 {
    principal_ref: String,
    resource_ref: String,
    capability: String,
    old: HeadlessComparisonRuleStateV1,
    candidate: HeadlessComparisonRuleStateV1,
}
#[derive(Clone, Copy, Eq, PartialEq)]
pub struct HeadlessComparisonRuleStateV1 {
    mode: HeadlessComparisonRuleModeV1,
    limits: HeadlessComparisonLimitsV1,
}

impl fmt::Debug for HeadlessComparisonResourceChangeV1 {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("HeadlessComparisonResourceChangeV1")
            .finish_non_exhaustive()
    }
}
impl fmt::Debug for HeadlessComparisonResourceStateV1 {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("HeadlessComparisonResourceStateV1")
            .finish_non_exhaustive()
    }
}
impl fmt::Debug for HeadlessComparisonRuleChangeV1 {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("HeadlessComparisonRuleChangeV1")
            .finish_non_exhaustive()
    }
}
impl fmt::Debug for HeadlessComparisonRuleStateV1 {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("HeadlessComparisonRuleStateV1")
            .finish_non_exhaustive()
    }
}

impl HeadlessComparisonResourceStateV1 {
    fn json(&self) -> Value {
        json!({"reachable": self.reachable, "kind": self.kind.as_str(), "declared_identity_digest": self.declared_identity_digest, "canonical_identity_digest": self.canonical_identity_digest, "evidence_digest": self.evidence_digest})
    }
}
impl HeadlessComparisonRuleStateV1 {
    fn json(self) -> Value {
        json!({"mode": self.mode.as_str(), "limits": self.limits.json()})
    }
}
impl HeadlessComparisonResourceChangeV1 {
    fn json(&self) -> Value {
        json!({"resource_ref": self.resource_ref, "old": self.old.as_ref().map(HeadlessComparisonResourceStateV1::json), "candidate": self.candidate.as_ref().map(HeadlessComparisonResourceStateV1::json)})
    }
}
impl HeadlessComparisonRuleChangeV1 {
    fn json(&self) -> Value {
        json!({"principal_ref": self.principal_ref, "resource_ref": self.resource_ref, "capability": self.capability, "old": self.old.json(), "candidate": self.candidate.json()})
    }
}

impl HeadlessComparisonResourceChangeV1 {
    #[must_use]
    pub fn resource_ref(&self) -> &str {
        &self.resource_ref
    }
    #[must_use]
    pub fn old(&self) -> Option<&HeadlessComparisonResourceStateV1> {
        self.old.as_ref()
    }
    #[must_use]
    pub fn candidate(&self) -> Option<&HeadlessComparisonResourceStateV1> {
        self.candidate.as_ref()
    }
}
impl HeadlessComparisonResourceStateV1 {
    #[must_use]
    pub const fn reachable(&self) -> bool {
        self.reachable
    }
    #[must_use]
    pub const fn kind(&self) -> HeadlessComparisonResourceKindV1 {
        self.kind
    }
    #[must_use]
    pub fn declared_identity_digest(&self) -> &str {
        &self.declared_identity_digest
    }
    #[must_use]
    pub fn canonical_identity_digest(&self) -> &str {
        &self.canonical_identity_digest
    }
    #[must_use]
    pub fn evidence_digest(&self) -> &str {
        &self.evidence_digest
    }
}
impl HeadlessComparisonRuleChangeV1 {
    #[must_use]
    pub fn principal_ref(&self) -> &str {
        &self.principal_ref
    }
    #[must_use]
    pub fn resource_ref(&self) -> &str {
        &self.resource_ref
    }
    #[must_use]
    pub fn capability(&self) -> &str {
        &self.capability
    }
    #[must_use]
    pub const fn old(&self) -> HeadlessComparisonRuleStateV1 {
        self.old
    }
    #[must_use]
    pub const fn candidate(&self) -> HeadlessComparisonRuleStateV1 {
        self.candidate
    }
}
impl HeadlessComparisonRuleStateV1 {
    #[must_use]
    pub const fn mode(&self) -> HeadlessComparisonRuleModeV1 {
        self.mode
    }
    #[must_use]
    pub const fn limits(&self) -> HeadlessComparisonLimitsV1 {
        self.limits
    }
}

/// Pure model output. `Unverifiable` exposes no commitment or detailed summary.
#[derive(Clone)]
pub struct HeadlessComparisonResultV1 {
    class: HeadlessComparisonModelClassV1,
    commitment: Option<String>,
    summary: Option<HeadlessComparisonSummaryV1>,
    view_model: Option<HeadlessComparisonViewModelV1>,
}

impl fmt::Debug for HeadlessComparisonResultV1 {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("HeadlessComparisonResultV1")
            .field("model_class", &self.class.as_str())
            .field("has_summary", &self.summary.is_some())
            .finish_non_exhaustive()
    }
}

impl HeadlessComparisonResultV1 {
    #[must_use]
    pub const fn model_class(&self) -> HeadlessComparisonModelClassV1 {
        self.class
    }
    #[must_use]
    pub fn model_commitment(&self) -> Option<&str> {
        self.commitment.as_deref()
    }
    #[must_use]
    pub fn summary(&self) -> Option<&HeadlessComparisonSummaryV1> {
        self.summary.as_ref()
    }

    /// Explicit sensitive model material, not an authenticated owner view or grant.
    #[must_use]
    pub fn view_model(&self) -> Option<&HeadlessComparisonViewModelV1> {
        self.view_model.as_ref()
    }

    /// Public-safe metadata only. No refs, identity/evidence digests, context, or declarations escape.
    #[must_use]
    pub fn redacted_diagnostic(&self) -> Value {
        json!({"model_class": self.class.as_str(), "resource_change_count": self.summary.as_ref().map_or(0, HeadlessComparisonSummaryV1::resource_change_count),
            "rule_change_count": self.summary.as_ref().map_or(0, HeadlessComparisonSummaryV1::rule_change_count), "model_commitment": self.commitment,
            "authority_comparison": "unverifiable", "identity_verified": false, "activation_available": false, "grants_action_authority": false})
    }
}

/// Compares two supplied assertions. It performs no I/O, auth, policy admission, or activation.
#[must_use]
pub fn compare_headless_config_v1(
    old: HeadlessComparisonSideV1,
    candidate: HeadlessComparisonSideV1,
) -> HeadlessComparisonResultV1 {
    let Some(old) = normalize_side(old) else {
        return unverifiable();
    };
    let Some(candidate) = normalize_side(candidate) else {
        return unverifiable();
    };
    if old.context != candidate.context || old.context.active_stop {
        return unverifiable();
    }
    let old_resources = &old.resources;
    let candidate_resources = &candidate.resources;
    if old_resources.len() + candidate_resources.len() > MAX_UNION_RESOURCES_V1
        || old.rules.len() + candidate.rules.len() > MAX_UNION_RULES_V1
    {
        return unverifiable();
    }
    let resource_keys: BTreeSet<_> = old_resources
        .keys()
        .chain(candidate_resources.keys())
        .cloned()
        .collect();
    let rule_keys: BTreeSet<_> = old
        .rules
        .keys()
        .chain(candidate.rules.keys())
        .cloned()
        .collect();
    if resource_keys.len() > MAX_UNION_RESOURCES_V1 || rule_keys.len() > MAX_UNION_RULES_V1 {
        return unverifiable();
    }
    let mut direction = Direction::Equal;
    let mut resource_changes = Vec::new();
    for key in resource_keys {
        let old_state = old_resources.get(&key).cloned();
        let candidate_state = candidate_resources.get(&key).cloned();
        if old_state != candidate_state {
            resource_changes.push(HeadlessComparisonResourceChangeV1 {
                resource_ref: key,
                old: old_state.clone(),
                candidate: candidate_state.clone(),
            });
        }
        direction = direction.combine(resource_direction(
            old_state.as_ref(),
            candidate_state.as_ref(),
        ));
    }
    let mut rule_changes = Vec::new();
    for (principal_ref, resource_ref, capability) in rule_keys {
        let old_state = old
            .rules
            .get(&(
                principal_ref.clone(),
                resource_ref.clone(),
                capability.clone(),
            ))
            .copied()
            .unwrap_or(HeadlessComparisonRuleStateV1 {
                mode: HeadlessComparisonRuleModeV1::Deny,
                limits: HeadlessComparisonLimitsV1::zero(),
            });
        let candidate_state = candidate
            .rules
            .get(&(
                principal_ref.clone(),
                resource_ref.clone(),
                capability.clone(),
            ))
            .copied()
            .unwrap_or(HeadlessComparisonRuleStateV1 {
                mode: HeadlessComparisonRuleModeV1::Deny,
                limits: HeadlessComparisonLimitsV1::zero(),
            });
        if old_state != candidate_state {
            rule_changes.push(HeadlessComparisonRuleChangeV1 {
                principal_ref,
                resource_ref,
                capability,
                old: old_state,
                candidate: candidate_state,
            });
        }
        direction = direction.combine(
            Direction::from_order(old_state.mode.rank().cmp(&candidate_state.mode.rank()))
                .combine(old_state.limits.relation(candidate_state.limits)),
        );
    }
    result_from_changes(&old, &candidate, direction, resource_changes, rule_changes)
}

fn result_from_changes(
    old: &NormalizedSide,
    candidate: &NormalizedSide,
    direction: Direction,
    resource_changes: Vec<HeadlessComparisonResourceChangeV1>,
    rule_changes: Vec<HeadlessComparisonRuleChangeV1>,
) -> HeadlessComparisonResultV1 {
    let class = match direction {
        Direction::Equal => HeadlessComparisonModelClassV1::Equal,
        Direction::Lower => HeadlessComparisonModelClassV1::Narrowing,
        Direction::Higher | Direction::Mixed => HeadlessComparisonModelClassV1::WideningOrMixed,
    };
    let summary = HeadlessComparisonSummaryV1 {
        resource_changes,
        rule_changes,
    };
    let commitment = commitment(old, candidate, class, &summary);
    let view_model = view::build_view_model(old, candidate, class, &commitment, &summary);
    HeadlessComparisonResultV1 {
        class,
        commitment: Some(commitment),
        summary: Some(summary),
        view_model,
    }
}

fn unverifiable() -> HeadlessComparisonResultV1 {
    HeadlessComparisonResultV1 {
        class: HeadlessComparisonModelClassV1::Unverifiable,
        commitment: None,
        summary: None,
        view_model: None,
    }
}

struct NormalizedSide {
    declaration_digest: String,
    envelope: HeadlessComparisonEffectiveEnvelopeV1,
    evidence: Vec<HeadlessComparisonEvidenceV1>,
    context: HeadlessComparisonContextV1,
    resources: BTreeMap<String, HeadlessComparisonResourceStateV1>,
    rules: BTreeMap<(String, String, String), HeadlessComparisonRuleStateV1>,
}

fn normalize_side(side: HeadlessComparisonSideV1) -> Option<NormalizedSide> {
    if !side.context.valid()
        || side.envelope.resource_allow.len() > MAX_RESOURCES_V1
        || side.envelope.rules.len() > MAX_RULES_V1
        || side.evidence.len() > MAX_RESOURCES_V1
    {
        return None;
    }
    let composed = compose_headless_config_declaration_v1(&side.declaration).ok()?;
    if side.declaration.document.installation_ref != side.context.installation_ref
        || !sorted_unique(&side.envelope.resource_allow)
        || !side
            .envelope
            .resource_allow
            .iter()
            .all(|r| valid_prefixed_reference(r, "resource:"))
    {
        return None;
    }
    let dictionary: BTreeMap<_, _> = side
        .declaration
        .document
        .resources
        .iter()
        .map(|r| (r.reference.as_str(), r))
        .collect();
    if dictionary.len() != side.evidence.len()
        || !sorted_unique_by(&side.evidence, |e| &e.resource_ref)
    {
        return None;
    }
    let mut evidence_by_ref = BTreeMap::new();
    for evidence in &side.evidence {
        let resource = dictionary.get(evidence.resource_ref.as_str())?;
        if !valid_prefixed_reference(&evidence.resource_ref, "resource:")
            || !valid_digest(&evidence.declared_identity_digest)
            || !valid_digest(&evidence.canonical_identity_digest)
            || !valid_digest(&evidence.evidence_digest)
            || evidence.declared_identity_digest != resource.identity_digest
            || evidence.canonical_identity_digest != resource.identity_digest
            || evidence.kind != map_kind(resource.kind)
        {
            return None;
        }
        evidence_by_ref.insert(evidence.resource_ref.as_str(), evidence);
    }
    if evidence_by_ref.len() != dictionary.len() {
        return None;
    }
    let rules = normalize_rules(&side.envelope, &dictionary, &composed)?;
    let resources = normalized_resources(&side.envelope, dictionary, &evidence_by_ref);
    Some(NormalizedSide {
        declaration_digest: composed.declaration_digest().to_owned(),
        envelope: side.envelope,
        evidence: side.evidence,
        context: side.context,
        resources,
        rules,
    })
}

fn normalize_rules(
    envelope: &HeadlessComparisonEffectiveEnvelopeV1,
    dictionary: &BTreeMap<&str, &super::parser::Resource>,
    composed: &ComposedHeadlessConfigV1,
) -> Option<BTreeMap<(String, String, String), HeadlessComparisonRuleStateV1>> {
    if !envelope.resource_allow.iter().all(|resource| {
        dictionary.contains_key(resource.as_str()) && composed.resource_declared(resource)
    }) {
        return None;
    }
    let mut rules = BTreeMap::new();
    let mut previous: Option<(&str, &str, &str)> = None;
    for rule in &envelope.rules {
        if !valid_prefixed_reference(&rule.principal_ref, "identity:")
            || !valid_prefixed_reference(&rule.resource_ref, "resource:")
            || !valid_capability(&rule.capability)
            || !rule.limits.valid()
            || (rule.mode == HeadlessComparisonRuleModeV1::Deny
                && rule.limits != HeadlessComparisonLimitsV1::zero())
            || (rule.mode != HeadlessComparisonRuleModeV1::Deny
                && !envelope.resource_allow.contains(&rule.resource_ref))
            || !dictionary.contains_key(rule.resource_ref.as_str())
        {
            return None;
        }
        let key = rule.key();
        if previous.is_some_and(|p| p >= key) {
            return None;
        }
        previous = Some(key);
        let ceiling = HeadlessComparisonRuleStateV1 {
            mode: mode_from_str(composed.declared_mode(
                &rule.principal_ref,
                &rule.resource_ref,
                &rule.capability,
            ))?,
            limits: limits_from_packet(composed.declared_limits(
                &rule.principal_ref,
                &rule.resource_ref,
                &rule.capability,
            )),
        };
        let asserted = HeadlessComparisonRuleStateV1 {
            mode: rule.mode,
            limits: rule.limits,
        };
        if asserted.mode.rank() > ceiling.mode.rank() || !asserted.limits.within(ceiling.limits) {
            return None;
        }
        rules.insert(
            (
                rule.principal_ref.clone(),
                rule.resource_ref.clone(),
                rule.capability.clone(),
            ),
            asserted,
        );
    }
    Some(rules)
}

fn normalized_resources(
    envelope: &HeadlessComparisonEffectiveEnvelopeV1,
    dictionary: BTreeMap<&str, &super::parser::Resource>,
    evidence_by_ref: &BTreeMap<&str, &HeadlessComparisonEvidenceV1>,
) -> BTreeMap<String, HeadlessComparisonResourceStateV1> {
    dictionary
        .into_iter()
        .map(|(reference, resource)| {
            let evidence = evidence_by_ref[reference];
            (
                reference.to_owned(),
                HeadlessComparisonResourceStateV1 {
                    reachable: envelope.resource_allow.iter().any(|r| r == reference),
                    kind: map_kind(resource.kind),
                    declared_identity_digest: evidence.declared_identity_digest.clone(),
                    canonical_identity_digest: evidence.canonical_identity_digest.clone(),
                    evidence_digest: evidence.evidence_digest.clone(),
                },
            )
        })
        .collect()
}

fn commitment(
    old: &NormalizedSide,
    candidate: &NormalizedSide,
    class: HeadlessComparisonModelClassV1,
    summary: &HeadlessComparisonSummaryV1,
) -> String {
    let body = json!({"context": old.context.json(), "old": {"declaration_digest": old.declaration_digest, "envelope": old.envelope.json(), "evidence": old.evidence.iter().map(HeadlessComparisonEvidenceV1::json).collect::<Vec<_>>()}, "candidate": {"declaration_digest": candidate.declaration_digest, "envelope": candidate.envelope.json(), "evidence": candidate.evidence.iter().map(HeadlessComparisonEvidenceV1::json).collect::<Vec<_>>()}, "model_class": class.as_str(), "resource_changes": summary.resource_changes.iter().map(HeadlessComparisonResourceChangeV1::json).collect::<Vec<_>>(), "rule_changes": summary.rule_changes.iter().map(HeadlessComparisonRuleChangeV1::json).collect::<Vec<_>>()});
    let mut canonical = String::from("lnsat.headless_config.comparison_model.v1\n");
    crate::packet::write_canonical_json_value(&body, &mut canonical)
        .expect("bounded model material is canonical");
    let digest = Sha256::digest(canonical.as_bytes());
    let mut value = String::from("sha256:");
    for byte in digest {
        write!(&mut value, "{byte:02x}").expect("String write");
    }
    value
}

#[derive(Clone, Copy)]
enum Direction {
    Equal,
    Lower,
    Higher,
    Mixed,
}
impl Direction {
    fn from_order(order: std::cmp::Ordering) -> Self {
        match order {
            std::cmp::Ordering::Equal => Self::Equal,
            std::cmp::Ordering::Less => Self::Higher,
            std::cmp::Ordering::Greater => Self::Lower,
        }
    }
    fn from_pairs<const N: usize>(orders: [std::cmp::Ordering; N]) -> Self {
        orders.into_iter().fold(Self::Equal, |current, next| {
            current.combine(Self::from_order(next))
        })
    }
    fn combine(self, other: Self) -> Self {
        match (self, other) {
            (Self::Mixed, _) | (_, Self::Mixed) => Self::Mixed,
            (Self::Equal, x) | (x, Self::Equal) => x,
            (Self::Lower, Self::Lower) => Self::Lower,
            (Self::Higher, Self::Higher) => Self::Higher,
            _ => Self::Mixed,
        }
    }
}

fn resource_direction(
    old: Option<&HeadlessComparisonResourceStateV1>,
    candidate: Option<&HeadlessComparisonResourceStateV1>,
) -> Direction {
    match (old, candidate) {
        (None, None) => Direction::Equal,
        (None, Some(candidate)) => {
            if candidate.reachable {
                Direction::Higher
            } else {
                Direction::Equal
            }
        }
        (Some(old), None) => {
            if old.reachable {
                Direction::Lower
            } else {
                Direction::Equal
            }
        }
        (Some(old), Some(candidate)) => {
            let mut result = Direction::from_order(old.reachable.cmp(&candidate.reachable));
            if (old.reachable || candidate.reachable)
                && (old.kind != candidate.kind
                    || old.canonical_identity_digest != candidate.canonical_identity_digest)
            {
                result = result.combine(Direction::Higher);
            }
            result
        }
    }
}

fn mode_from_str(value: &str) -> Option<HeadlessComparisonRuleModeV1> {
    match value {
        "deny" => Some(HeadlessComparisonRuleModeV1::Deny),
        "approval_required" => Some(HeadlessComparisonRuleModeV1::ApprovalRequired),
        "allow" => Some(HeadlessComparisonRuleModeV1::Allow),
        _ => None,
    }
}
fn limits_from_packet(value: PacketBudgetV1) -> HeadlessComparisonLimitsV1 {
    HeadlessComparisonLimitsV1 {
        tokens: value.tokens,
        runtime_seconds: value.runtime_seconds,
        cost_microusd: value.cost_microusd,
        cpu_millicores: value.cpu_millicores,
        memory_bytes: value.memory_bytes,
    }
}
fn map_kind(kind: super::parser::ResourceKind) -> HeadlessComparisonResourceKindV1 {
    match kind {
        super::parser::ResourceKind::Folder => HeadlessComparisonResourceKindV1::Folder,
        super::parser::ResourceKind::Repository => HeadlessComparisonResourceKindV1::Repository,
        super::parser::ResourceKind::Service => HeadlessComparisonResourceKindV1::Service,
        super::parser::ResourceKind::Connector => HeadlessComparisonResourceKindV1::Connector,
        super::parser::ResourceKind::RuntimeProfile => {
            HeadlessComparisonResourceKindV1::RuntimeProfile
        }
        super::parser::ResourceKind::OsResource => HeadlessComparisonResourceKindV1::OsResource,
    }
}
fn valid_prefixed_reference(value: &str, prefix: &str) -> bool {
    value.starts_with(prefix) && is_valid_reference_v1(value)
}
fn valid_digest(value: &str) -> bool {
    value.len() == 71
        && value.starts_with("sha256:")
        && value.as_bytes()[7..]
            .iter()
            .all(|b| b.is_ascii_digit() || (b.is_ascii_lowercase() && b.is_ascii_hexdigit()))
}
fn valid_version(value: &str) -> bool {
    !value.is_empty()
        && value.len() <= 128
        && value
            .as_bytes()
            .first()
            .is_some_and(|b| b.is_ascii_lowercase() || b.is_ascii_digit())
        && value.as_bytes().iter().all(|b| {
            b.is_ascii_lowercase() || b.is_ascii_digit() || matches!(b, b'.' | b'_' | b':' | b'-')
        })
}
fn valid_capability(value: &str) -> bool {
    crate::policy::classify_capability(value, true).decision != crate::PolicyDecisionV1Kind::Deny
}
fn sorted_unique(values: &[String]) -> bool {
    values.windows(2).all(|pair| pair[0] < pair[1])
}
fn sorted_unique_by<T>(values: &[T], key: impl Fn(&T) -> &String) -> bool {
    values.windows(2).all(|pair| key(&pair[0]) < key(&pair[1]))
}
