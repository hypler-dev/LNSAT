//! Closed deterministic Phase 10 operator-output rendering.

use serde_json::Value;
use std::fmt;

/// Closed output formats shared by read-only `lnsatctl` commands.
#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub enum ProductOutputFormatV1 {
    /// Stable flattened human-readable lines.
    Text,
    /// One compact canonical JSON object.
    #[default]
    Json,
    /// One compact canonical JSON object per line.
    Jsonl,
    /// One deterministic plain YAML document.
    Yaml,
}

impl ProductOutputFormatV1 {
    /// Parses one exact lower-case output name.
    #[must_use]
    pub const fn parse(value: &str) -> Option<Self> {
        match value.as_bytes() {
            b"text" => Some(Self::Text),
            b"json" => Some(Self::Json),
            b"jsonl" => Some(Self::Jsonl),
            b"yaml" => Some(Self::Yaml),
            _ => None,
        }
    }

    /// Stable lower-case output name.
    #[must_use]
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Text => "text",
            Self::Json => "json",
            Self::Jsonl => "jsonl",
            Self::Yaml => "yaml",
        }
    }
}

/// One typed semantic result rendered without format-specific policy logic.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ProductSemanticResultV1 {
    value: Value,
}

impl ProductSemanticResultV1 {
    /// Creates one closed object result.
    ///
    /// # Errors
    ///
    /// Rejects scalar and array roots because every Phase 10 result is one
    /// versioned object.
    pub fn new(value: Value) -> Result<Self, ProductOutputErrorV1> {
        if value.is_object() {
            Ok(Self { value })
        } else {
            Err(ProductOutputErrorV1::InvalidSemanticResult)
        }
    }

    /// Borrows canonical semantic JSON.
    #[must_use]
    pub const fn value(&self) -> &Value {
        &self.value
    }
}

/// Stable public-safe output error.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum ProductOutputErrorV1 {
    /// Semantic result was not one JSON object.
    InvalidSemanticResult,
    /// Deterministic serialization failed.
    SerializationFailed,
}

impl ProductOutputErrorV1 {
    /// Stable public-safe code.
    #[must_use]
    pub const fn code(self) -> &'static str {
        match self {
            Self::InvalidSemanticResult => "lnsatctl.output.semantic_result_invalid",
            Self::SerializationFailed => "lnsatctl.output.serialization_failed",
        }
    }
}

impl fmt::Display for ProductOutputErrorV1 {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(self.code())
    }
}

impl std::error::Error for ProductOutputErrorV1 {}

/// Renders one result with exactly one trailing newline.
///
/// # Errors
///
/// Returns one public-safe internal serialization failure.
pub fn render_product_result_v1(
    result: &ProductSemanticResultV1,
    format: ProductOutputFormatV1,
) -> Result<String, ProductOutputErrorV1> {
    let mut output = match format {
        ProductOutputFormatV1::Json | ProductOutputFormatV1::Jsonl => {
            serde_json::to_string(result.value())
                .map_err(|_| ProductOutputErrorV1::SerializationFailed)?
        }
        ProductOutputFormatV1::Text => render_text_v1(result.value())?,
        ProductOutputFormatV1::Yaml => render_yaml_v1(result.value())?,
    };
    while output.ends_with('\n') {
        output.pop();
    }
    output.push('\n');
    Ok(output)
}

fn render_text_v1(value: &Value) -> Result<String, ProductOutputErrorV1> {
    let mut output = String::new();
    let Value::Object(object) = value else {
        return Err(ProductOutputErrorV1::InvalidSemanticResult);
    };
    for (key, value) in object {
        render_text_field_v1(&mut output, key, value)?;
    }
    Ok(output)
}

fn render_text_field_v1(
    output: &mut String,
    path: &str,
    value: &Value,
) -> Result<(), ProductOutputErrorV1> {
    if let Value::Object(object) = value
        && !object.is_empty()
    {
        for (key, value) in object {
            render_text_field_v1(output, &format!("{path}.{key}"), value)?;
        }
        return Ok(());
    }
    output.push_str(path);
    output.push('=');
    match value {
        Value::String(value) => output.push_str(value),
        _ => output.push_str(
            &serde_json::to_string(value).map_err(|_| ProductOutputErrorV1::SerializationFailed)?,
        ),
    }
    output.push('\n');
    Ok(())
}

fn render_yaml_v1(value: &Value) -> Result<String, ProductOutputErrorV1> {
    let Value::Object(object) = value else {
        return Err(ProductOutputErrorV1::InvalidSemanticResult);
    };
    let mut output = String::new();
    render_yaml_object_v1(&mut output, object, 0)?;
    Ok(output)
}

fn render_yaml_object_v1(
    output: &mut String,
    object: &serde_json::Map<String, Value>,
    indent: usize,
) -> Result<(), ProductOutputErrorV1> {
    for (key, value) in object {
        output.push_str(&" ".repeat(indent));
        output.push_str(key);
        output.push(':');
        if let Value::Object(child) = value
            && !child.is_empty()
        {
            output.push('\n');
            render_yaml_object_v1(output, child, indent + 2)?;
            continue;
        }
        output.push(' ');
        match value {
            Value::String(value) => output.push_str(
                &serde_json::to_string(value)
                    .map_err(|_| ProductOutputErrorV1::SerializationFailed)?,
            ),
            _ => output.push_str(
                &serde_json::to_string(value)
                    .map_err(|_| ProductOutputErrorV1::SerializationFailed)?,
            ),
        }
        output.push('\n');
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn exact_output_fixture_golden_bytes_pass() {
        let fixture: Value = serde_json::from_str(include_str!(
            "../../../fixtures/contracts/phase10-output-v1.json"
        ))
        .expect("output fixture must parse");
        let result = ProductSemanticResultV1::new(fixture["semantic_result"].clone())
            .expect("fixture result must be object");
        for format in [
            ProductOutputFormatV1::Text,
            ProductOutputFormatV1::Json,
            ProductOutputFormatV1::Jsonl,
            ProductOutputFormatV1::Yaml,
        ] {
            assert_eq!(
                render_product_result_v1(&result, format).expect("fixture must render"),
                fixture["goldens"][format.as_str()]
                    .as_str()
                    .expect("golden must be string")
            );
        }
    }

    #[test]
    fn format_and_root_are_closed() {
        assert_eq!(
            ProductOutputFormatV1::default(),
            ProductOutputFormatV1::Json
        );
        assert!(ProductOutputFormatV1::parse("JSON").is_none());
        assert!(ProductOutputFormatV1::parse("toml").is_none());
        assert_eq!(
            ProductSemanticResultV1::new(Value::Null),
            Err(ProductOutputErrorV1::InvalidSemanticResult)
        );
    }

    #[test]
    fn nested_text_and_yaml_are_deterministic_plain_documents() {
        let result = ProductSemanticResultV1::new(serde_json::json!({
            "outer": { "answer": 42, "ok": true },
            "values": ["a", "b"]
        }))
        .expect("result must be object");
        assert_eq!(
            render_product_result_v1(&result, ProductOutputFormatV1::Text)
                .expect("text must render"),
            "outer.answer=42\nouter.ok=true\nvalues=[\"a\",\"b\"]\n"
        );
        let yaml = render_product_result_v1(&result, ProductOutputFormatV1::Yaml)
            .expect("yaml must render");
        assert_eq!(
            yaml,
            "outer:\n  answer: 42\n  ok: true\nvalues: [\"a\",\"b\"]\n"
        );
        assert!(!yaml.contains("---"));
        assert!(!yaml.contains('&'));
        assert!(!yaml.contains('*'));
        assert!(!yaml.contains('!'));
    }
}
