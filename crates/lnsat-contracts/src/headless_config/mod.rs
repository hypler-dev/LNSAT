//! Declaration-only headless configuration parsing and composition contracts.

mod comparison;
mod composition;
mod parser;
mod resource_bindings;

use parser::{Limits, Rule, RuleMode};

#[cfg(test)]
mod comparison_tests;
#[cfg(test)]
mod composition_tests;
#[cfg(test)]
mod parser_tests;
#[cfg(test)]
mod resource_bindings_tests;

pub use comparison::{
    HEADLESS_COMPARISON_SUPPORTED_ASSERTED_PROFILE_V1, HEADLESS_COMPARISON_VIEW_MODEL_SCHEMA_V1,
    HeadlessComparisonContextV1, HeadlessComparisonEffectiveEnvelopeV1,
    HeadlessComparisonEvidenceV1, HeadlessComparisonLimitsV1, HeadlessComparisonModelClassV1,
    HeadlessComparisonModelErrorV1, HeadlessComparisonResourceChangeV1,
    HeadlessComparisonResourceKindV1, HeadlessComparisonResourceStateV1,
    HeadlessComparisonResultV1, HeadlessComparisonRuleChangeV1, HeadlessComparisonRuleModeV1,
    HeadlessComparisonRuleStateV1, HeadlessComparisonRuleV1, HeadlessComparisonSideV1,
    HeadlessComparisonSummaryV1, HeadlessComparisonViewModelV1,
    MAX_HEADLESS_COMPARISON_VIEW_MODEL_BYTES_V1, compare_headless_config_v1,
};
pub use composition::{ComposedHeadlessConfigV1, compose_headless_config_declaration_v1};
pub use parser::{
    HEADLESS_CONFIG_SCHEMA_V1, HeadlessConfigDeclarationV1, HeadlessConfigErrorV1,
    MAX_HEADLESS_CONFIG_BYTES_V1, parse_headless_config_declaration_v1,
};
pub use resource_bindings::{
    HEADLESS_RESOURCE_BINDINGS_SCHEMA_V1, HeadlessResourceBindingKindV1, HeadlessResourceBindingV1,
    HeadlessResourceBindingsErrorV1, HeadlessResourceBindingsV1,
    MAX_HEADLESS_RESOURCE_BINDING_PATH_BYTES_V1, MAX_HEADLESS_RESOURCE_BINDINGS_BYTES_V1,
    MAX_HEADLESS_RESOURCE_BINDINGS_ROWS_V1, parse_headless_resource_bindings_v1,
};
