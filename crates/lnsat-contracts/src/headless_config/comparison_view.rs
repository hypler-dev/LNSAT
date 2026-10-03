use super::{
    HeadlessComparisonModelClassV1, HeadlessComparisonResourceChangeV1,
    HeadlessComparisonRuleChangeV1, HeadlessComparisonSummaryV1, NormalizedSide,
};
use serde_json::{Value, json};
use sha2::{Digest, Sha256};
use std::{fmt, fmt::Write as _, io};

pub const HEADLESS_COMPARISON_VIEW_MODEL_SCHEMA_V1: &str =
    "lnsat.headless_config.comparison_view_model.v1";
pub const MAX_HEADLESS_COMPARISON_VIEW_MODEL_BYTES_V1: usize = 131_072;

/// Complete conditional comparison material. It authenticates no state or person.
#[derive(Clone)]
pub struct HeadlessComparisonViewModelV1 {
    canonical_json: String,
    commitment: String,
}

impl fmt::Debug for HeadlessComparisonViewModelV1 {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("HeadlessComparisonViewModelV1")
            .field("byte_len", &self.canonical_json.len())
            .finish_non_exhaustive()
    }
}

impl HeadlessComparisonViewModelV1 {
    /// Sensitive explicit model bytes; never emit them through public diagnostics.
    #[must_use]
    pub fn canonical_json(&self) -> &str {
        &self.canonical_json
    }

    /// Distinct model-view commitment, never an authenticated comparison or decision.
    #[must_use]
    pub fn view_commitment(&self) -> &str {
        &self.commitment
    }
}

pub(super) fn build_view_model(
    old: &NormalizedSide,
    candidate: &NormalizedSide,
    class: HeadlessComparisonModelClassV1,
    model_commitment: &str,
    summary: &HeadlessComparisonSummaryV1,
) -> Option<HeadlessComparisonViewModelV1> {
    let mut body = json!({
        "schema_id": HEADLESS_COMPARISON_VIEW_MODEL_SCHEMA_V1,
        "model_commitment": model_commitment,
        "model_class": class.as_str(),
        "context": old.context.json(),
        "old_declaration_digest": old.declaration_digest,
        "candidate_declaration_digest": candidate.declaration_digest,
        "resource_changes": summary.resource_changes.iter().map(HeadlessComparisonResourceChangeV1::json).collect::<Vec<_>>(),
        "rule_changes": summary.rule_changes.iter().map(HeadlessComparisonRuleChangeV1::json).collect::<Vec<_>>(),
        "authority_comparison": "unverifiable",
        "identity_verified": false,
        "activation_available": false,
        "grants_action_authority": false,
    });
    // All keys are fixed ASCII and numbers are validated unsigned safe integers.
    // Sorting also preserves canonical order if serde_json enables preserve_order.
    body.sort_all_objects();
    let canonical_json = bounded_canonical_json(&body)?;
    let mut hasher = Sha256::new();
    hasher.update(HEADLESS_COMPARISON_VIEW_MODEL_SCHEMA_V1.as_bytes());
    hasher.update(b"\n");
    hasher.update(canonical_json.as_bytes());
    let mut commitment = String::from("sha256:");
    for byte in hasher.finalize() {
        write!(&mut commitment, "{byte:02x}").expect("String write");
    }
    Some(HeadlessComparisonViewModelV1 {
        canonical_json,
        commitment,
    })
}

fn bounded_canonical_json(body: &Value) -> Option<String> {
    let mut writer = BoundedViewWriter {
        // One fixed allocation prevents Vec growth from exceeding the output cap.
        bytes: Vec::with_capacity(MAX_HEADLESS_COMPARISON_VIEW_MODEL_BYTES_V1),
    };
    serde_json::to_writer(&mut writer, body).ok()?;
    String::from_utf8(writer.bytes).ok()
}

struct BoundedViewWriter {
    bytes: Vec<u8>,
}

impl io::Write for BoundedViewWriter {
    fn write(&mut self, bytes: &[u8]) -> io::Result<usize> {
        if bytes.len() > MAX_HEADLESS_COMPARISON_VIEW_MODEL_BYTES_V1 - self.bytes.len() {
            return Err(io::Error::new(io::ErrorKind::WriteZero, "view unavailable"));
        }
        self.bytes.extend_from_slice(bytes);
        Ok(bytes.len())
    }

    fn flush(&mut self) -> io::Result<()> {
        Ok(())
    }
}

#[cfg(test)]
#[path = "comparison_view_tests.rs"]
mod tests;
