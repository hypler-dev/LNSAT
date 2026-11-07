use super::parser::canonical_json_value;
use super::{HeadlessConfigDeclarationV1, HeadlessConfigErrorV1, Limits, Rule, RuleMode};
use crate::PacketBudgetV1;
use serde_json::{Value, json};
use sha2::{Digest, Sha256};
use std::collections::{BTreeMap, BTreeSet};
use std::fmt::Write as _;

type RuleKey = (String, String, String);
const MAX_HEADLESS_CONFIG_ENVELOPE_BYTES_V1: usize = 262_144;

/// Composed, unverified declarations. This value never authorizes an action.
///
/// All admission decisions still require authenticated current policy, owner
/// evidence, resource identity checks, approvals, runtime restrictions, and
/// persisted emergency-stop/revocation checks outside this diagnostic primitive.
#[derive(Clone)]
pub struct ComposedHeadlessConfigV1 {
    resource_allow: BTreeSet<String>,
    rules: BTreeMap<RuleKey, Rule>,
    declaration_digest: String,
    layer_count: usize,
}

impl std::fmt::Debug for ComposedHeadlessConfigV1 {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        formatter
            .debug_struct("ComposedHeadlessConfigV1")
            .field("resource_count", &self.resource_allow.len())
            .field("rule_count", &self.rules.len())
            .field("layer_count", &self.layer_count)
            .finish_non_exhaustive()
    }
}

impl ComposedHeadlessConfigV1 {
    /// Reports declared membership, not actual resource access or OS enforcement.
    #[must_use]
    pub fn resource_declared(&self, resource_ref: &str) -> bool {
        self.resource_allow.contains(resource_ref)
    }

    /// Returns a declared ceiling only. Missing tuples have the `deny` ceiling.
    ///
    /// `allow` does not imply a supported profile, acceptable packet risk,
    /// approval, verified principal/resource identity, or action authority.
    #[must_use]
    pub fn declared_mode(
        &self,
        principal_ref: &str,
        resource_ref: &str,
        capability: &str,
    ) -> &'static str {
        match self.rule(principal_ref, resource_ref, capability) {
            Some(rule) => match rule.mode {
                RuleMode::Deny => "deny",
                RuleMode::ApprovalRequired => "approval_required",
                RuleMode::Allow => "allow",
            },
            None => "deny",
        }
    }

    /// Returns declared limits only; missing and denied tuples have zero limits.
    #[must_use]
    pub fn declared_limits(
        &self,
        principal_ref: &str,
        resource_ref: &str,
        capability: &str,
    ) -> PacketBudgetV1 {
        self.rule(principal_ref, resource_ref, capability)
            .map_or_else(Limits::zero, |rule| rule.limits)
            .as_packet_budget()
    }

    /// Returns content identity of normalized input, including every source layer.
    ///
    /// This digest is not authenticity, ownership, or grant/use identity evidence.
    #[must_use]
    pub fn declaration_digest(&self) -> &str {
        &self.declaration_digest
    }

    /// Emits the complete composed declared ceiling as bounded canonical JSON.
    ///
    /// The returned JSON contains declared references and policy assertions.
    /// It grants no authority and proves no native observation, ownership, or activation.
    ///
    /// # Errors
    ///
    /// Returns a fixed error when canonical encoding fails or exceeds the envelope ceiling.
    pub fn canonical_declared_envelope_json(&self) -> Result<String, HeadlessConfigErrorV1> {
        canonical_json_value(
            &json!({
                "resource_allow": self.resource_allow.iter().cloned().collect::<Vec<_>>(),
                "rules": self.rules.values().map(declared_rule_json).collect::<Vec<_>>(),
            }),
            MAX_HEADLESS_CONFIG_ENVELOPE_BYTES_V1,
        )
    }

    /// Emits the initial no-action effective envelope as bounded canonical JSON.
    ///
    /// The returned JSON contains declared references and policy assertions.
    /// It grants no authority and proves no native observation, ownership, or activation.
    ///
    /// # Errors
    ///
    /// Returns a fixed error when canonical encoding fails or exceeds the envelope ceiling.
    pub fn canonical_initial_denied_envelope_json(&self) -> Result<String, HeadlessConfigErrorV1> {
        canonical_json_value(
            &json!({
                "resource_allow": self.resource_allow.iter().cloned().collect::<Vec<_>>(),
                "rules": self.rules.values().map(initial_denied_rule_json).collect::<Vec<_>>(),
            }),
            MAX_HEADLESS_CONFIG_ENVELOPE_BYTES_V1,
        )
    }

    /// Emits only fixed diagnostic markers, counts, and normalized content identity.
    ///
    /// The output contains no source references or resource identity digests and
    /// cannot be used as an applicable declaration, backup, or activation request.
    #[must_use]
    pub fn redacted_diagnostic(&self) -> Value {
        json!({
            "schema_id": "lnsat.headless_config.composition_diagnostic.v1",
            "scope": "declared_ceiling_only",
            "declaration_digest": self.declaration_digest,
            "layer_count": self.layer_count,
            "declared_resource_count": self.resource_allow.len(),
            "declared_rule_count": self.rules.len(),
            "declared_denial_count": self.rules.values().filter(|rule| rule.mode == RuleMode::Deny).count(),
            "identity_verified": false,
            "activation_available": false,
            "grants_action_authority": false,
            "side_effects": [],
        })
    }

    fn rule(&self, principal: &str, resource: &str, capability: &str) -> Option<&Rule> {
        self.rules.get(&(
            principal.to_owned(),
            resource.to_owned(),
            capability.to_owned(),
        ))
    }
}

/// Composes complete declaration ceilings in their validated stage order.
///
/// The first layer seeds untrusted declarations under the compiled capability
/// floor. Later layers may narrow only. Denials persist across omission and
/// resource removal. No filesystem, policy admission, storage, or runtime work
/// occurs, and no partially composed result escapes an error.
///
/// # Errors
///
/// Returns a fixed error if any later layer attempts to broaden resource access,
/// add or restore a non-denied action, weaken approval, or increase any limit.
pub fn compose_headless_config_declaration_v1(
    declaration: &HeadlessConfigDeclarationV1,
) -> Result<ComposedHeadlessConfigV1, HeadlessConfigErrorV1> {
    let document = &declaration.document;
    let first = document
        .layers
        .first()
        .ok_or(HeadlessConfigErrorV1::InvalidComposition)?;
    let mut resource_allow: BTreeSet<_> = first.resource_allow.iter().cloned().collect();
    let mut rules: BTreeMap<_, _> = first
        .action_rules
        .iter()
        .map(|rule| (owned_key(rule), rule.clone()))
        .collect();
    for layer in document.layers.iter().skip(1) {
        let next_resources: BTreeSet<_> = layer.resource_allow.iter().cloned().collect();
        if !next_resources.is_subset(&resource_allow) {
            return Err(HeadlessConfigErrorV1::InvalidComposition);
        }
        rules = narrow_rules(&rules, &layer.action_rules)?;
        resource_allow = next_resources;
    }
    Ok(ComposedHeadlessConfigV1 {
        resource_allow,
        rules,
        declaration_digest: normalized_digest(declaration)?,
        layer_count: document.layers.len(),
    })
}

fn narrow_rules(
    previous: &BTreeMap<RuleKey, Rule>,
    declarations: &[Rule],
) -> Result<BTreeMap<RuleKey, Rule>, HeadlessConfigErrorV1> {
    let mut narrowed = previous.clone();
    // Complete ceilings: omissions become denials, including inherited denies.
    for rule in narrowed.values_mut() {
        rule.mode = RuleMode::Deny;
        rule.limits = Limits::zero();
    }
    for rule in declarations {
        let key = owned_key(rule);
        if rule.mode != RuleMode::Deny {
            let parent = previous
                .get(&key)
                .ok_or(HeadlessConfigErrorV1::InvalidComposition)?;
            if rule.mode > parent.mode || !rule.limits.within(parent.limits) {
                return Err(HeadlessConfigErrorV1::InvalidComposition);
            }
        }
        narrowed.insert(key, rule.clone());
    }
    Ok(narrowed)
}

fn owned_key(rule: &Rule) -> RuleKey {
    let (principal, resource, capability) = rule.key();
    (
        principal.to_owned(),
        resource.to_owned(),
        capability.to_owned(),
    )
}

fn declared_rule_json(rule: &Rule) -> Value {
    json!({
        "principal_ref": rule.principal_ref.as_str(),
        "resource_ref": rule.resource_ref.as_str(),
        "capability": rule.capability.as_str(),
        "mode": match rule.mode {
            RuleMode::Deny => "deny",
            RuleMode::ApprovalRequired => "approval_required",
            RuleMode::Allow => "allow",
        },
        "limits": limits_json(rule.limits),
    })
}

fn initial_denied_rule_json(rule: &Rule) -> Value {
    json!({
        "principal_ref": rule.principal_ref.as_str(),
        "resource_ref": rule.resource_ref.as_str(),
        "capability": rule.capability.as_str(),
        "mode": "deny",
        "limits": limits_json(Limits::zero()),
    })
}

fn limits_json(limits: Limits) -> Value {
    json!({
        "tokens": limits.tokens,
        "runtime_seconds": limits.runtime_seconds,
        "cost_microusd": limits.cost_microusd,
        "cpu_millicores": limits.cpu_millicores,
        "memory_bytes": limits.memory_bytes,
    })
}

fn normalized_digest(
    declaration: &HeadlessConfigDeclarationV1,
) -> Result<String, HeadlessConfigErrorV1> {
    let mut canonical = String::from("lnsat.headless_config.declaration.v1\n");
    canonical.push_str(&declaration.canonical_json()?);
    let digest = Sha256::digest(canonical.as_bytes());
    let mut encoded = String::from("sha256:");
    for byte in digest {
        write!(&mut encoded, "{byte:02x}").expect("writing to a String cannot fail");
    }
    Ok(encoded)
}
