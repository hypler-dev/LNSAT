//! Declaration-only headless configuration parsing and composition contracts.

mod composition;
mod parser;

use parser::{Limits, Rule, RuleMode};

#[cfg(test)]
mod composition_tests;
#[cfg(test)]
mod parser_tests;

pub use composition::{ComposedHeadlessConfigV1, compose_headless_config_declaration_v1};
pub use parser::{
    HEADLESS_CONFIG_SCHEMA_V1, HeadlessConfigDeclarationV1, HeadlessConfigErrorV1,
    MAX_HEADLESS_CONFIG_BYTES_V1, parse_headless_config_declaration_v1,
};
