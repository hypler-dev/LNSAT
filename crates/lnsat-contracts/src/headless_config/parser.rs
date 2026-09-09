use crate::{CONTRACT_VERSION_V1_0, PacketBudgetV1, is_valid_reference_v1};
use serde::{Deserialize, Serialize};
use std::fmt;

/// Exact declaration schema identity.
pub const HEADLESS_CONFIG_SCHEMA_V1: &str = "lnsat.headless_config.declaration.v1";
/// Maximum accepted UTF-8 JSON declaration size.
pub const MAX_HEADLESS_CONFIG_BYTES_V1: usize = 64 * 1024;

const MAX_SAFE_INTEGER_V1: u64 = 9_007_199_254_740_991;

/// Public-safe closed parser failures.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum HeadlessConfigErrorV1 {
    InvalidJson,
    InvalidSize,
    UnsupportedContract,
    InvalidDeclaration,
    NoncanonicalCollection,
    UnsupportedCapability,
    PolicyWidening,
    InvalidComposition,
}

impl HeadlessConfigErrorV1 {
    /// Stable public-safe error code.
    #[must_use]
    pub const fn code(self) -> &'static str {
        match self {
            Self::InvalidJson => "headless_config.invalid_json",
            Self::InvalidSize => "headless_config.invalid_size",
            Self::UnsupportedContract => "headless_config.unsupported_contract",
            Self::InvalidDeclaration => "headless_config.invalid_declaration",
            Self::NoncanonicalCollection => "headless_config.noncanonical_collection",
            Self::UnsupportedCapability => "headless_config.unsupported_capability",
            Self::PolicyWidening => "headless_config.policy_widening",
            Self::InvalidComposition => "headless_config.invalid_composition",
        }
    }
}

impl fmt::Display for HeadlessConfigErrorV1 {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(self.code())
    }
}

impl std::error::Error for HeadlessConfigErrorV1 {}

/// Parsed declaration that carries no activation or runtime authority.
#[derive(Clone, Eq, PartialEq)]
pub struct HeadlessConfigDeclarationV1 {
    pub(super) document: RawDocument,
}

impl fmt::Debug for HeadlessConfigDeclarationV1 {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("HeadlessConfigDeclarationV1")
            .field("resource_count", &self.document.resources.len())
            .field("layer_count", &self.document.layers.len())
            .finish()
    }
}

/// Parses one bounded declaration-only headless configuration document.
///
/// Parsing performs no identity, owner, filesystem, network, store, environment,
/// activation, or runtime work.
///
/// # Errors
///
/// Returns a fixed public-safe error for oversized, malformed, duplicate-key,
/// unknown-field, unsupported-contract, noncanonical, unsupported-capability,
/// policy-widening, or structurally invalid declarations.
pub fn parse_headless_config_declaration_v1(
    bytes: &[u8],
) -> Result<HeadlessConfigDeclarationV1, HeadlessConfigErrorV1> {
    if bytes.len() > MAX_HEADLESS_CONFIG_BYTES_V1 {
        return Err(HeadlessConfigErrorV1::InvalidSize);
    }
    let document: RawDocument =
        serde_json::from_slice(bytes).map_err(|_| HeadlessConfigErrorV1::InvalidJson)?;
    validate_document_v1(&document)?;
    Ok(HeadlessConfigDeclarationV1 { document })
}

fn validate_document_v1(document: &RawDocument) -> Result<(), HeadlessConfigErrorV1> {
    if document.contract_version != CONTRACT_VERSION_V1_0
        || document.schema_id != HEADLESS_CONFIG_SCHEMA_V1
    {
        return Err(HeadlessConfigErrorV1::UnsupportedContract);
    }
    if !valid_reference_with_prefix_v1(&document.installation_ref, "installation:") {
        return Err(HeadlessConfigErrorV1::InvalidDeclaration);
    }
    if document.resources.len() > 128 || document.layers.is_empty() || document.layers.len() > 5 {
        return Err(HeadlessConfigErrorV1::InvalidComposition);
    }
    if !strictly_sorted_unique_by_v1(&document.resources, |left, right| {
        left.reference < right.reference
    }) {
        return Err(HeadlessConfigErrorV1::NoncanonicalCollection);
    }
    if document.resources.iter().any(|resource| {
        !valid_reference_with_prefix_v1(&resource.reference, "resource:")
            || !valid_identity_digest_v1(&resource.identity_digest)
    }) {
        return Err(HeadlessConfigErrorV1::InvalidDeclaration);
    }

    let root_resources: Vec<_> = document
        .resources
        .iter()
        .map(|resource| resource.reference.as_str())
        .collect();
    let mut project_count = 0;
    for (index, layer) in document.layers.iter().enumerate() {
        if !valid_reference_with_prefix_v1(&layer.reference, "layer:") {
            return Err(HeadlessConfigErrorV1::InvalidComposition);
        }
        if layer.stage == LayerStage::Project {
            project_count += 1;
        }
        if index > 0 && document.layers[index - 1].stage >= layer.stage {
            return Err(HeadlessConfigErrorV1::InvalidComposition);
        }
        if document.layers[..index]
            .iter()
            .any(|prior| prior.reference == layer.reference)
        {
            return Err(HeadlessConfigErrorV1::InvalidComposition);
        }
        if !strictly_sorted_unique_by_v1(&layer.resource_allow, |left, right| left < right) {
            return Err(HeadlessConfigErrorV1::NoncanonicalCollection);
        }
        if layer
            .resource_allow
            .iter()
            .any(|resource_ref| !root_resources.contains(&resource_ref.as_str()))
        {
            return Err(HeadlessConfigErrorV1::InvalidComposition);
        }
        if index == 0
            && layer
                .resource_allow
                .iter()
                .map(String::as_str)
                .ne(root_resources.iter().copied())
        {
            return Err(HeadlessConfigErrorV1::InvalidComposition);
        }
        if layer.action_rules.len() > 256
            || !strictly_sorted_unique_by_v1(&layer.action_rules, |left, right| {
                left.key() < right.key()
            })
        {
            return Err(HeadlessConfigErrorV1::NoncanonicalCollection);
        }
        for rule in &layer.action_rules {
            validate_rule_v1(rule, &root_resources, &layer.resource_allow)?;
        }
    }
    if project_count != 1 {
        return Err(HeadlessConfigErrorV1::InvalidComposition);
    }
    Ok(())
}

fn validate_rule_v1(
    rule: &Rule,
    root_resources: &[&str],
    layer_resources: &[String],
) -> Result<(), HeadlessConfigErrorV1> {
    if !valid_reference_with_prefix_v1(&rule.principal_ref, "identity:")
        || !root_resources.contains(&rule.resource_ref.as_str())
        || !rule.limits.within(Limits::MAXIMUM)
    {
        return Err(HeadlessConfigErrorV1::InvalidComposition);
    }
    let decision = crate::policy::classify_capability(&rule.capability, true).decision;
    if decision == crate::PolicyDecisionV1Kind::Deny {
        return Err(HeadlessConfigErrorV1::UnsupportedCapability);
    }
    if decision == crate::PolicyDecisionV1Kind::ApprovalRequired && rule.mode == RuleMode::Allow {
        return Err(HeadlessConfigErrorV1::PolicyWidening);
    }
    if rule.mode == RuleMode::Deny {
        if rule.limits != Limits::zero() {
            return Err(HeadlessConfigErrorV1::InvalidComposition);
        }
    } else if !layer_resources.contains(&rule.resource_ref) {
        return Err(HeadlessConfigErrorV1::InvalidComposition);
    }
    Ok(())
}

fn valid_reference_with_prefix_v1(value: &str, prefix: &str) -> bool {
    value.starts_with(prefix) && is_valid_reference_v1(value)
}

fn valid_identity_digest_v1(value: &str) -> bool {
    value.len() == 71
        && value.starts_with("sha256:")
        && value.as_bytes()[7..].iter().all(|byte| {
            byte.is_ascii_digit() || (byte.is_ascii_lowercase() && byte.is_ascii_hexdigit())
        })
}

fn strictly_sorted_unique_by_v1<T>(values: &[T], precedes: impl Fn(&T, &T) -> bool) -> bool {
    values.windows(2).all(|pair| precedes(&pair[0], &pair[1]))
}

#[derive(Clone, Deserialize, Eq, PartialEq, Serialize)]
#[serde(deny_unknown_fields)]
pub(super) struct RawDocument {
    pub(super) contract_version: String,
    pub(super) schema_id: String,
    pub(super) installation_ref: String,
    pub(super) resources: Vec<Resource>,
    pub(super) layers: Vec<Layer>,
}

#[derive(Clone, Deserialize, Eq, PartialEq, Serialize)]
#[serde(deny_unknown_fields)]
pub(super) struct Resource {
    #[serde(rename = "resource_ref")]
    pub(super) reference: String,
    pub(super) kind: ResourceKind,
    pub(super) identity_digest: String,
}

#[derive(Clone, Copy, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "snake_case")]
pub(super) enum ResourceKind {
    Folder,
    Repository,
    Service,
    Connector,
    RuntimeProfile,
    OsResource,
}

#[derive(Clone, Deserialize, Eq, PartialEq, Serialize)]
#[serde(deny_unknown_fields)]
pub(super) struct Layer {
    #[serde(rename = "layer_ref")]
    pub(super) reference: String,
    pub(super) stage: LayerStage,
    pub(super) resource_allow: Vec<String>,
    pub(super) action_rules: Vec<Rule>,
}

#[derive(Clone, Copy, Deserialize, Eq, Ord, PartialEq, PartialOrd, Serialize)]
#[serde(rename_all = "snake_case")]
pub(super) enum LayerStage {
    Organization,
    Project,
    Runtime,
    Operator,
    Request,
}

#[derive(Clone, Deserialize, Eq, PartialEq, Serialize)]
#[serde(deny_unknown_fields)]
pub(super) struct Rule {
    pub(super) principal_ref: String,
    pub(super) resource_ref: String,
    pub(super) capability: String,
    pub(super) mode: RuleMode,
    pub(super) limits: Limits,
}

impl Rule {
    pub(super) fn key(&self) -> (&str, &str, &str) {
        (&self.principal_ref, &self.resource_ref, &self.capability)
    }
}

#[derive(Clone, Copy, Deserialize, Eq, Ord, PartialEq, PartialOrd, Serialize)]
#[serde(rename_all = "snake_case")]
pub(super) enum RuleMode {
    Deny,
    ApprovalRequired,
    Allow,
}

#[derive(Clone, Copy, Deserialize, Eq, PartialEq, Serialize)]
#[serde(deny_unknown_fields)]
pub(super) struct Limits {
    pub(super) tokens: u64,
    pub(super) runtime_seconds: u64,
    pub(super) cost_microusd: u64,
    pub(super) cpu_millicores: u64,
    pub(super) memory_bytes: u64,
}

impl Limits {
    const MAXIMUM: Self = Self {
        tokens: MAX_SAFE_INTEGER_V1,
        runtime_seconds: MAX_SAFE_INTEGER_V1,
        cost_microusd: MAX_SAFE_INTEGER_V1,
        cpu_millicores: MAX_SAFE_INTEGER_V1,
        memory_bytes: MAX_SAFE_INTEGER_V1,
    };

    pub(super) const fn zero() -> Self {
        Self {
            tokens: 0,
            runtime_seconds: 0,
            cost_microusd: 0,
            cpu_millicores: 0,
            memory_bytes: 0,
        }
    }

    pub(super) const fn within(self, parent: Self) -> bool {
        self.tokens <= parent.tokens
            && self.runtime_seconds <= parent.runtime_seconds
            && self.cost_microusd <= parent.cost_microusd
            && self.cpu_millicores <= parent.cpu_millicores
            && self.memory_bytes <= parent.memory_bytes
    }

    pub(super) const fn as_packet_budget(self) -> PacketBudgetV1 {
        PacketBudgetV1 {
            tokens: self.tokens,
            runtime_seconds: self.runtime_seconds,
            cost_microusd: self.cost_microusd,
            cpu_millicores: self.cpu_millicores,
            memory_bytes: self.memory_bytes,
        }
    }
}
