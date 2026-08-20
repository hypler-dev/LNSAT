use serde_json::{Map, Number, Value, error::Category};
use sha2::{Digest, Sha256};
use std::collections::HashSet;
use std::fmt::Write as _;

use crate::CONTRACT_VERSION_V1_0;

const PACKET_SCHEMA_V1_0: &str = "lnsat.packet_envelope.schema.v1_0";
const MAX_SAFE_INTEGER: u64 = 9_007_199_254_740_991;
const MAX_SAFE_INTEGER_F64: f64 = 9_007_199_254_740_991.0;
const REQUIRED_KEYS: [&str; 19] = [
    "contract_version",
    "schema_id",
    "packet_id",
    "packet_type",
    "actor_ref",
    "session_ref",
    "project_ref",
    "intent",
    "risk_level",
    "source_refs",
    "resource_refs",
    "policy_profile_ref",
    "permission_envelope",
    "budget",
    "constraints",
    "requires_approval",
    "idempotency_key",
    "created_at",
    "expires_at",
];
const PACKET_TYPES: [&str; 10] = [
    "ContextPacket",
    "CapabilityPacket",
    "ExecutionPacket",
    "EnvironmentPacket",
    "ResourcePacket",
    "ResultPacket",
    "AuditPacket",
    "PatchPacket",
    "SecretUsePacket",
    "NodeTelemetryPacket",
];

/// Parsed stable packet envelope after fail-closed JSON Schema validation.
#[derive(Clone, Debug, PartialEq)]
pub struct PacketEnvelopeV1 {
    pub contract_version: String,
    pub schema_id: String,
    pub packet_id: String,
    pub packet_type: String,
    pub actor_ref: String,
    pub session_ref: String,
    pub project_ref: String,
    pub intent: String,
    pub risk_level: u8,
    pub source_refs: Vec<String>,
    pub resource_refs: Vec<String>,
    pub policy_profile_ref: String,
    pub permission_allow: Vec<String>,
    pub permission_block: Vec<String>,
    pub budget: PacketBudgetV1,
    pub constraints: Map<String, Value>,
    pub requires_approval: bool,
    pub idempotency_key: String,
    pub created_at: String,
    pub expires_at: String,
}

/// Stable nonnegative safe-integer packet budget.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct PacketBudgetV1 {
    pub tokens: u64,
    pub runtime_seconds: u64,
    pub cost_microusd: u64,
    pub cpu_millicores: u64,
    pub memory_bytes: u64,
}

/// Stable fail-closed packet parsing and schema-validation errors.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum PacketEnvelopeV1Error {
    InvalidJson,
    InvalidType,
    UnexpectedField,
    MissingRequiredField,
    UnsupportedContractVersion,
    UnsupportedSchema,
    InvalidField,
    InvalidTimeWindow,
    NoncanonicalCollection,
}

impl PacketEnvelopeV1Error {
    /// Stable TypeScript-compatible error identity.
    #[must_use]
    pub const fn code(self) -> &'static str {
        match self {
            Self::InvalidJson => "packet_envelope.invalid_json",
            Self::InvalidType => "packet_envelope.invalid_type",
            Self::UnexpectedField => "packet_envelope.unexpected_field",
            Self::MissingRequiredField => "packet_envelope.missing_required_field",
            Self::UnsupportedContractVersion => "packet_envelope.unsupported_contract_version",
            Self::UnsupportedSchema => "packet_envelope.unsupported_schema",
            Self::InvalidField => "packet_envelope.invalid_field",
            Self::InvalidTimeWindow => "packet_envelope.invalid_time_window",
            Self::NoncanonicalCollection => "packet_envelope.noncanonical_collection",
        }
    }
}

/// Parses UTF-8 JSON and validates the stable packet-envelope v1 schema.
///
/// Policy, persistence, and runtime authority are deliberately outside this
/// parser.
///
/// # Errors
///
/// Returns a stable fail-closed error without reflecting rejected input.
pub fn parse_packet_envelope_v1(input: &[u8]) -> Result<PacketEnvelopeV1, PacketEnvelopeV1Error> {
    let object = parse_json_object(input)?;
    validate_exact_keys(&object, &REQUIRED_KEYS)?;
    let object = &object;

    let Some(contract_version) = object.get("contract_version").and_then(Value::as_str) else {
        return Err(PacketEnvelopeV1Error::UnsupportedContractVersion);
    };
    if contract_version != CONTRACT_VERSION_V1_0 {
        return Err(PacketEnvelopeV1Error::UnsupportedContractVersion);
    }
    let Some(schema_id) = object.get("schema_id").and_then(Value::as_str) else {
        return Err(PacketEnvelopeV1Error::UnsupportedSchema);
    };
    if schema_id != PACKET_SCHEMA_V1_0 {
        return Err(PacketEnvelopeV1Error::UnsupportedSchema);
    }

    let packet_id = required_string(object, "packet_id")?;
    if !valid_prefixed_identifier(packet_id, "pkt_", 12, 68) {
        return Err(PacketEnvelopeV1Error::InvalidField);
    }
    let packet_type = required_string(object, "packet_type")?;
    if !PACKET_TYPES.contains(&packet_type) {
        return Err(PacketEnvelopeV1Error::InvalidField);
    }
    let actor_ref = required_reference(object, "actor_ref", "identity:")?;
    let session_ref = required_reference(object, "session_ref", "session:")?;
    let project_ref = required_reference(object, "project_ref", "project:")?;
    let intent = required_string(object, "intent")?;
    if intent.is_empty() || intent.encode_utf16().count() > 4_096 {
        return Err(PacketEnvelopeV1Error::InvalidField);
    }
    let risk_level = required_safe_integer(object, "risk_level")?;
    let risk_level = u8::try_from(risk_level).map_err(|_| PacketEnvelopeV1Error::InvalidField)?;
    if risk_level > 8 {
        return Err(PacketEnvelopeV1Error::InvalidField);
    }
    let source_refs = required_string_array(object, "source_refs", valid_reference)?;
    let resource_refs = required_string_array(object, "resource_refs", valid_reference)?;
    let policy_profile_ref = required_reference(object, "policy_profile_ref", "policy:")?;

    let (permission_allow, permission_block) = parse_permission_envelope(object)?;

    let budget = required_object(object, "budget")?;
    validate_exact_keys(
        budget,
        &[
            "tokens",
            "runtime_seconds",
            "cost_microusd",
            "cpu_millicores",
            "memory_bytes",
        ],
    )?;
    let budget = PacketBudgetV1 {
        tokens: required_safe_integer(budget, "tokens")?,
        runtime_seconds: required_safe_integer(budget, "runtime_seconds")?,
        cost_microusd: required_safe_integer(budget, "cost_microusd")?,
        cpu_millicores: required_safe_integer(budget, "cpu_millicores")?,
        memory_bytes: required_safe_integer(budget, "memory_bytes")?,
    };

    let constraints = required_object(object, "constraints")?.clone();
    validate_canonical_json_value(&Value::Object(constraints.clone()))?;
    let requires_approval = object
        .get("requires_approval")
        .and_then(Value::as_bool)
        .ok_or(PacketEnvelopeV1Error::InvalidField)?;
    let idempotency_key = required_string(object, "idempotency_key")?;
    if !valid_prefixed_identifier(idempotency_key, "idem_", 13, 133) {
        return Err(PacketEnvelopeV1Error::InvalidField);
    }
    let created_at = required_string(object, "created_at")?;
    let expires_at = required_string(object, "expires_at")?;
    let Some(created_instant) = parse_canonical_utc_timestamp(created_at) else {
        return Err(PacketEnvelopeV1Error::InvalidField);
    };
    let Some(expires_instant) = parse_canonical_utc_timestamp(expires_at) else {
        return Err(PacketEnvelopeV1Error::InvalidField);
    };
    if expires_instant <= created_instant {
        return Err(PacketEnvelopeV1Error::InvalidTimeWindow);
    }

    Ok(PacketEnvelopeV1 {
        contract_version: contract_version.to_owned(),
        schema_id: schema_id.to_owned(),
        packet_id: packet_id.to_owned(),
        packet_type: packet_type.to_owned(),
        actor_ref,
        session_ref,
        project_ref,
        intent: intent.to_owned(),
        risk_level,
        source_refs,
        resource_refs,
        policy_profile_ref,
        permission_allow,
        permission_block,
        budget,
        constraints,
        requires_approval,
        idempotency_key: idempotency_key.to_owned(),
        created_at: created_at.to_owned(),
        expires_at: expires_at.to_owned(),
    })
}

/// Serializes a validated packet into stable canonical JSON.
///
/// Object keys use ascending UTF-16 code-unit order, arrays preserve their
/// input order, Unicode is not normalized, and every number is emitted as a
/// safe integer. The operation is local and side-effect free.
///
/// # Errors
///
/// Returns the same fail-closed packet error identity when a caller constructs
/// an invalid public packet value instead of using the parser.
pub fn canonicalize_packet_envelope_v1(
    packet: &PacketEnvelopeV1,
) -> Result<String, PacketEnvelopeV1Error> {
    let value = packet_json_value(packet);
    let encoded = serde_json::to_vec(&value).map_err(|_| PacketEnvelopeV1Error::InvalidField)?;
    parse_packet_envelope_v1(&encoded)?;

    let mut output = String::new();
    write_canonical_json_value(&value, &mut output)?;
    Ok(output)
}

pub(crate) fn canonicalize_json_value(value: &Value) -> Result<String, PacketEnvelopeV1Error> {
    validate_canonical_json_value(value)?;
    let mut output = String::new();
    write_canonical_json_value(value, &mut output)?;
    Ok(output)
}

/// Hashes canonical packet UTF-8 bytes as stable lowercase SHA-256 evidence.
///
/// # Errors
///
/// Returns the canonicalization error when a caller constructs an invalid
/// public packet value instead of using the parser.
pub fn hash_packet_envelope_v1(packet: &PacketEnvelopeV1) -> Result<String, PacketEnvelopeV1Error> {
    let canonical = canonicalize_packet_envelope_v1(packet)?;
    let digest = Sha256::digest(canonical.as_bytes());
    let mut output = String::with_capacity(71);
    output.push_str("sha256:");
    for byte in digest {
        write!(&mut output, "{byte:02x}").expect("writing to a String cannot fail");
    }
    Ok(output)
}

/// No-panic entry point for deterministic byte-oriented fuzzers.
pub fn fuzz_packet_envelope_v1(input: &[u8]) {
    let _ = parse_packet_envelope_v1(input);
}

pub(crate) fn packet_json_value(packet: &PacketEnvelopeV1) -> Value {
    serde_json::json!({
        "contract_version": packet.contract_version,
        "schema_id": packet.schema_id,
        "packet_id": packet.packet_id,
        "packet_type": packet.packet_type,
        "actor_ref": packet.actor_ref,
        "session_ref": packet.session_ref,
        "project_ref": packet.project_ref,
        "intent": packet.intent,
        "risk_level": packet.risk_level,
        "source_refs": packet.source_refs,
        "resource_refs": packet.resource_refs,
        "policy_profile_ref": packet.policy_profile_ref,
        "permission_envelope": {
            "allow": packet.permission_allow,
            "block": packet.permission_block,
        },
        "budget": {
            "tokens": packet.budget.tokens,
            "runtime_seconds": packet.budget.runtime_seconds,
            "cost_microusd": packet.budget.cost_microusd,
            "cpu_millicores": packet.budget.cpu_millicores,
            "memory_bytes": packet.budget.memory_bytes,
        },
        "constraints": packet.constraints,
        "requires_approval": packet.requires_approval,
        "idempotency_key": packet.idempotency_key,
        "created_at": packet.created_at,
        "expires_at": packet.expires_at,
    })
}

fn validate_canonical_json_value(value: &Value) -> Result<(), PacketEnvelopeV1Error> {
    match value {
        Value::Null | Value::Bool(_) | Value::String(_) => Ok(()),
        Value::Number(number) => canonical_safe_integer(number)
            .map(|_| ())
            .ok_or(PacketEnvelopeV1Error::InvalidField),
        Value::Array(values) => values.iter().try_for_each(validate_canonical_json_value),
        Value::Object(object) => object.values().try_for_each(validate_canonical_json_value),
    }
}

fn write_canonical_json_value(
    value: &Value,
    output: &mut String,
) -> Result<(), PacketEnvelopeV1Error> {
    match value {
        Value::Null => output.push_str("null"),
        Value::Bool(value) => output.push_str(if *value { "true" } else { "false" }),
        Value::Number(number) => output
            .push_str(&canonical_safe_integer(number).ok_or(PacketEnvelopeV1Error::InvalidField)?),
        Value::String(value) => output.push_str(
            &serde_json::to_string(value).map_err(|_| PacketEnvelopeV1Error::InvalidField)?,
        ),
        Value::Array(values) => {
            output.push('[');
            for (index, value) in values.iter().enumerate() {
                if index > 0 {
                    output.push(',');
                }
                write_canonical_json_value(value, output)?;
            }
            output.push(']');
        }
        Value::Object(object) => {
            let mut entries: Vec<_> = object.iter().collect();
            entries.sort_by(|(left, _), (right, _)| left.encode_utf16().cmp(right.encode_utf16()));

            output.push('{');
            for (index, (key, value)) in entries.into_iter().enumerate() {
                if index > 0 {
                    output.push(',');
                }
                output.push_str(
                    &serde_json::to_string(key).map_err(|_| PacketEnvelopeV1Error::InvalidField)?,
                );
                output.push(':');
                write_canonical_json_value(value, output)?;
            }
            output.push('}');
        }
    }
    Ok(())
}

fn canonical_safe_integer(number: &Number) -> Option<String> {
    if number.is_f64() {
        let value = number.as_f64().filter(|value| {
            value.is_finite()
                && value.fract() == 0.0
                && value.abs() <= MAX_SAFE_INTEGER_F64
                && !(*value == 0.0 && value.is_sign_negative())
        })?;
        return Some(format!("{value:.0}"));
    }
    if let Some(value) = number.as_u64().filter(|value| *value <= MAX_SAFE_INTEGER) {
        return Some(value.to_string());
    }
    if let Some(value) = number
        .as_i64()
        .filter(|value| (-9_007_199_254_740_991..=9_007_199_254_740_991).contains(value))
    {
        return Some(value.to_string());
    }
    None
}

fn parse_json_object(input: &[u8]) -> Result<Map<String, Value>, PacketEnvelopeV1Error> {
    let value: Value = serde_json::from_slice(input).map_err(|error| match error.classify() {
        Category::Data => PacketEnvelopeV1Error::InvalidField,
        Category::Io | Category::Syntax | Category::Eof => PacketEnvelopeV1Error::InvalidJson,
    })?;
    match value {
        Value::Object(object) => Ok(object),
        _ => Err(PacketEnvelopeV1Error::InvalidType),
    }
}

fn validate_exact_keys(
    object: &Map<String, Value>,
    required: &[&str],
) -> Result<(), PacketEnvelopeV1Error> {
    if object.keys().any(|key| !required.contains(&key.as_str())) {
        return Err(PacketEnvelopeV1Error::UnexpectedField);
    }
    if required.iter().any(|key| !object.contains_key(*key)) {
        return Err(PacketEnvelopeV1Error::MissingRequiredField);
    }
    Ok(())
}

fn required_object<'a>(
    object: &'a Map<String, Value>,
    key: &str,
) -> Result<&'a Map<String, Value>, PacketEnvelopeV1Error> {
    object
        .get(key)
        .and_then(Value::as_object)
        .ok_or(PacketEnvelopeV1Error::InvalidField)
}

fn required_string<'a>(
    object: &'a Map<String, Value>,
    key: &str,
) -> Result<&'a str, PacketEnvelopeV1Error> {
    object
        .get(key)
        .and_then(Value::as_str)
        .ok_or(PacketEnvelopeV1Error::InvalidField)
}

fn required_reference(
    object: &Map<String, Value>,
    key: &str,
    prefix: &str,
) -> Result<String, PacketEnvelopeV1Error> {
    let value = required_string(object, key)?;
    if !value.starts_with(prefix) || !valid_reference(value) {
        return Err(PacketEnvelopeV1Error::InvalidField);
    }
    Ok(value.to_owned())
}

fn required_safe_integer(
    object: &Map<String, Value>,
    key: &str,
) -> Result<u64, PacketEnvelopeV1Error> {
    let number = object
        .get(key)
        .and_then(Value::as_number)
        .ok_or(PacketEnvelopeV1Error::InvalidField)?;
    if let Some(value) = number.as_u64().filter(|value| *value <= MAX_SAFE_INTEGER) {
        return Ok(value);
    }
    let value = number
        .as_f64()
        .filter(|value| {
            value.is_finite()
                && !value.is_sign_negative()
                && value.fract() == 0.0
                && *value <= MAX_SAFE_INTEGER_F64
        })
        .ok_or(PacketEnvelopeV1Error::InvalidField)?;
    format!("{value:.0}")
        .parse()
        .map_err(|_| PacketEnvelopeV1Error::InvalidField)
}

fn required_string_array(
    object: &Map<String, Value>,
    key: &str,
    validate: fn(&str) -> bool,
) -> Result<Vec<String>, PacketEnvelopeV1Error> {
    let values = object
        .get(key)
        .and_then(Value::as_array)
        .ok_or(PacketEnvelopeV1Error::InvalidField)?;
    let mut output = Vec::with_capacity(values.len());
    let mut unique = HashSet::with_capacity(values.len());
    for value in values {
        let value = value.as_str().ok_or(PacketEnvelopeV1Error::InvalidField)?;
        if !validate(value) || !unique.insert(value) {
            return Err(PacketEnvelopeV1Error::InvalidField);
        }
        output.push(value.to_owned());
    }
    Ok(output)
}

fn required_permission_array(
    object: &Map<String, Value>,
    key: &str,
) -> Result<Vec<String>, PacketEnvelopeV1Error> {
    let values = object
        .get(key)
        .and_then(Value::as_array)
        .ok_or(PacketEnvelopeV1Error::InvalidField)?;
    values
        .iter()
        .map(|value| {
            let value = value.as_str().ok_or(PacketEnvelopeV1Error::InvalidField)?;
            if !valid_permission_identifier(value) {
                return Err(PacketEnvelopeV1Error::InvalidField);
            }
            Ok(value.to_owned())
        })
        .collect()
}

fn parse_permission_envelope(
    object: &Map<String, Value>,
) -> Result<(Vec<String>, Vec<String>), PacketEnvelopeV1Error> {
    let permission = required_object(object, "permission_envelope")?;
    validate_exact_keys(permission, &["allow", "block"])?;
    let allow = required_permission_array(permission, "allow")?;
    let block = required_permission_array(permission, "block")?;
    validate_sorted_unique_permissions(&allow)?;
    validate_sorted_unique_permissions(&block)?;
    let blocked: HashSet<_> = block.iter().collect();
    if allow.iter().any(|permission| blocked.contains(permission)) {
        return Err(PacketEnvelopeV1Error::InvalidField);
    }
    Ok((allow, block))
}

fn validate_sorted_unique_permissions(values: &[String]) -> Result<(), PacketEnvelopeV1Error> {
    if values
        .windows(2)
        .any(|pair| pair[0].encode_utf16().cmp(pair[1].encode_utf16()).is_ge())
    {
        return Err(PacketEnvelopeV1Error::NoncanonicalCollection);
    }
    Ok(())
}

fn valid_prefixed_identifier(value: &str, prefix: &str, min: usize, max: usize) -> bool {
    let length = value.len();
    let Some(remainder) = value.strip_prefix(prefix) else {
        return false;
    };
    length >= min
        && length <= max
        && remainder.bytes().enumerate().all(|(index, byte)| {
            byte.is_ascii_lowercase()
                || byte.is_ascii_digit()
                || (index > 0 && matches!(byte, b'_' | b'-'))
        })
}

fn valid_reference(value: &str) -> bool {
    let Some((scheme, remainder)) = value.split_once(':') else {
        return false;
    };
    !scheme.is_empty()
        && scheme.bytes().enumerate().all(|(index, byte)| {
            (index == 0 && byte.is_ascii_lowercase())
                || (index > 0
                    && (byte.is_ascii_lowercase()
                        || byte.is_ascii_digit()
                        || matches!(byte, b'+' | b'.' | b'-')))
        })
        && value.encode_utf16().count() <= 256
        && !remainder.is_empty()
        && remainder.chars().count() <= 240
        && !remainder.chars().any(char::is_whitespace)
        && !remainder
            .chars()
            .any(|character| character <= '\u{001f}' || character == '\u{007f}')
}

/// Returns true only for the stable bounded opaque-reference grammar.
#[must_use]
pub fn is_valid_reference_v1(value: &str) -> bool {
    valid_reference(value)
}

/// Returns true only for the stable canonical UTC timestamp grammar.
#[must_use]
pub fn is_canonical_utc_timestamp_v1(value: &str) -> bool {
    parse_canonical_utc_timestamp(value).is_some()
}

/// Parses stable canonical UTC evidence into a comparison-only millisecond
/// instant.
///
/// The numeric value is an internal monotonic calendar encoding, not Unix
/// epoch time. It is stable only for ordering and bounded-duration checks.
#[must_use]
pub fn canonical_utc_timestamp_millis_v1(value: &str) -> Option<u64> {
    parse_canonical_utc_timestamp(value)
}

fn valid_permission_identifier(value: &str) -> bool {
    if value.is_empty() || value.len() > 128 || !value.as_bytes()[0].is_ascii_lowercase() {
        return false;
    }
    let mut previous_separator = false;
    for (index, byte) in value.bytes().enumerate() {
        let separator = matches!(byte, b'.' | b'_' | b':' | b'-');
        if !byte.is_ascii_lowercase() && !byte.is_ascii_digit() && !separator
            || separator && (index == 0 || previous_separator || index + 1 == value.len())
        {
            return false;
        }
        previous_separator = separator;
    }
    true
}

pub(crate) fn parse_canonical_utc_timestamp(value: &str) -> Option<u64> {
    if value.len() < 20 || value.len() > 24 || !value.ends_with('Z') {
        return None;
    }
    let bytes = value.as_bytes();
    let punctuation = [(4, b'-'), (7, b'-'), (10, b'T'), (13, b':'), (16, b':')];
    if punctuation
        .iter()
        .any(|(index, expected)| bytes.get(*index) != Some(expected))
    {
        return None;
    }
    for (index, byte) in bytes.iter().enumerate() {
        if punctuation.iter().any(|(position, _)| *position == index)
            || index == bytes.len() - 1
            || (index == 19 && *byte == b'.')
        {
            continue;
        }
        if !byte.is_ascii_digit() {
            return None;
        }
    }
    if bytes[0..4] == *b"0000"
        || !(bytes.len() == 20 || (22..=24).contains(&bytes.len()) && bytes[19] == b'.')
    {
        return None;
    }

    let year = decimal_component(bytes, 0, 4)?;
    let month = decimal_component(bytes, 5, 7)?;
    let day = decimal_component(bytes, 8, 10)?;
    let hour = decimal_component(bytes, 11, 13)?;
    let minute = decimal_component(bytes, 14, 16)?;
    let second = decimal_component(bytes, 17, 19)?;
    if !(1..=12).contains(&month)
        || day == 0
        || day > days_in_month(year, month)
        || hour > 23
        || minute > 59
        || second > 59
    {
        return None;
    }
    let millisecond = if bytes.len() == 20 {
        0
    } else {
        decimal_component(bytes, 20, bytes.len() - 1)?
            * 10_u64.pow(u32::try_from(24 - bytes.len()).ok()?)
    };

    let prior_year = year - 1;
    let days_before_year = prior_year * 365 + prior_year / 4 - prior_year / 100 + prior_year / 400;
    let days_before_month = match month {
        1 => 0,
        2 => 31,
        3 => 59,
        4 => 90,
        5 => 120,
        6 => 151,
        7 => 181,
        8 => 212,
        9 => 243,
        10 => 273,
        11 => 304,
        12 => 334,
        _ => return None,
    } + u64::from(month > 2 && is_leap_year(year));
    let complete_days = days_before_year + days_before_month + day - 1;
    Some(((((complete_days * 24) + hour) * 60 + minute) * 60 + second) * 1_000 + millisecond)
}

fn decimal_component(bytes: &[u8], start: usize, end: usize) -> Option<u64> {
    bytes
        .get(start..end)?
        .iter()
        .try_fold(0_u64, |value, byte| {
            byte.is_ascii_digit()
                .then_some(value * 10 + u64::from(byte - b'0'))
        })
}

const fn days_in_month(year: u64, month: u64) -> u64 {
    match month {
        2 if is_leap_year(year) => 29,
        2 => 28,
        4 | 6 | 9 | 11 => 30,
        _ => 31,
    }
}

const fn is_leap_year(year: u64) -> bool {
    year.is_multiple_of(4) && (!year.is_multiple_of(100) || year.is_multiple_of(400))
}

#[cfg(test)]
mod tests {
    use super::{
        PacketEnvelopeV1Error, canonical_utc_timestamp_millis_v1, canonicalize_packet_envelope_v1,
        fuzz_packet_envelope_v1, hash_packet_envelope_v1, is_canonical_utc_timestamp_v1,
        is_valid_reference_v1, parse_packet_envelope_v1,
    };
    use serde_json::Value;

    const PACKET: &str = include_str!("../../../fixtures/contracts/packet-envelope-v1_0.json");

    #[test]
    fn malformed_json_fails_closed() {
        assert_eq!(
            parse_packet_envelope_v1(br#"{"contract_version":"#),
            Err(PacketEnvelopeV1Error::InvalidJson)
        );
    }

    #[test]
    fn public_reference_and_timestamp_checks_reuse_packet_grammar() {
        assert!(is_valid_reference_v1("deployment:local:test"));
        assert!(is_valid_reference_v1("database:local:primary"));
        assert!(!is_valid_reference_v1("missing-scheme"));
        assert!(!is_valid_reference_v1("Invalid:scheme"));
        assert!(!is_valid_reference_v1("database:has whitespace"));

        assert!(is_canonical_utc_timestamp_v1("2026-07-23T16:00:00Z"));
        assert!(is_canonical_utc_timestamp_v1("2026-07-23T16:00:00.123Z"));
        assert!(!is_canonical_utc_timestamp_v1("2026-07-23 16:00:00Z"));
        assert!(!is_canonical_utc_timestamp_v1("2026-02-30T16:00:00Z"));
        assert!(!is_canonical_utc_timestamp_v1("2026-07-23T16:00:00+00:00"));
        for (start, end) in [
            ("2026-07-23T16:00:00.123Z", "2026-07-23T16:01:00.123Z"),
            ("2026-07-31T23:59:30Z", "2026-08-01T00:00:30Z"),
            ("2028-02-29T23:59:30Z", "2028-03-01T00:00:30Z"),
        ] {
            let duration = canonical_utc_timestamp_millis_v1(end)
                .zip(canonical_utc_timestamp_millis_v1(start))
                .map(|(end, start)| end - start);
            assert_eq!(duration, Some(60_000));
        }
    }

    #[test]
    fn fuzz_entry_never_panics_for_deterministic_byte_corpus() {
        for length in 0..=512 {
            let mut input = Vec::with_capacity(length);
            for index in 0..length {
                input.push(
                    u8::try_from((index * 31 + length * 17) % 256)
                        .expect("modulo 256 always fits in u8"),
                );
            }
            fuzz_packet_envelope_v1(&input);
        }
        fuzz_packet_envelope_v1(PACKET.as_bytes());
    }

    #[test]
    fn risk_boundary_property_matches_v1_schema() {
        let fixture: Value = serde_json::from_str(PACKET).expect("packet fixture must be JSON");
        let mut packet = fixture["vectors"][0]["packet"].clone();

        for risk_level in 0..=9 {
            packet["risk_level"] = Value::from(risk_level);
            let encoded = serde_json::to_vec(&packet).expect("packet must serialize");
            assert_eq!(
                parse_packet_envelope_v1(&encoded).is_ok(),
                risk_level <= 8,
                "risk level {risk_level}",
            );
        }
    }

    #[test]
    fn canonical_serialization_uses_utf16_key_order_and_preserves_arrays() {
        let fixture: Value = serde_json::from_str(PACKET).expect("packet fixture must be JSON");
        let encoded =
            serde_json::to_vec(&fixture["vectors"][0]["packet"]).expect("packet must serialize");
        let mut packet = parse_packet_envelope_v1(&encoded).expect("packet must parse");
        packet.constraints = serde_json::json!({
            "\u{e000}": "bmp",
            "😀": "supplementary",
            "array": [{"z": 2, "a": 1}, "line\nbreak", "é"],
        })
        .as_object()
        .expect("constraints must be an object")
        .clone();

        let canonical = canonicalize_packet_envelope_v1(&packet).expect("packet must canonicalize");
        assert!(
            canonical.find("\"😀\"").expect("supplementary key")
                < canonical.find("\"\u{e000}\"").expect("BMP key")
        );
        assert!(canonical.contains(r#""array":[{"a":1,"z":2},"line\nbreak","é"]"#));

        let mut reversed = packet.clone();
        reversed.constraints = packet.constraints.clone().into_iter().rev().collect();
        assert_eq!(
            canonicalize_packet_envelope_v1(&reversed).expect("reordered packet"),
            canonical
        );
        assert_eq!(
            hash_packet_envelope_v1(&reversed).expect("reordered packet hash"),
            hash_packet_envelope_v1(&packet).expect("packet hash")
        );

        reversed.constraints.insert(
            "array".to_owned(),
            serde_json::json!(["é", "line\nbreak", {"a": 1, "z": 2}]),
        );
        assert_ne!(
            canonicalize_packet_envelope_v1(&reversed).expect("reordered array"),
            canonical
        );
        assert_ne!(
            hash_packet_envelope_v1(&reversed).expect("reordered array hash"),
            hash_packet_envelope_v1(&packet).expect("packet hash")
        );

        reversed.packet_id = "invalid".to_owned();
        assert_eq!(
            hash_packet_envelope_v1(&reversed),
            Err(PacketEnvelopeV1Error::InvalidField)
        );
    }

    #[test]
    fn permission_ordering_property_accepts_only_ascending_permutation() {
        let fixture: Value = serde_json::from_str(PACKET).expect("packet fixture must be JSON");
        let base = fixture["vectors"][0]["packet"].clone();
        let permutations = [
            ["alpha.read", "beta.read", "gamma.read"],
            ["alpha.read", "gamma.read", "beta.read"],
            ["beta.read", "alpha.read", "gamma.read"],
            ["beta.read", "gamma.read", "alpha.read"],
            ["gamma.read", "alpha.read", "beta.read"],
            ["gamma.read", "beta.read", "alpha.read"],
        ];
        for (index, permissions) in permutations.into_iter().enumerate() {
            let mut packet = base.clone();
            packet["permission_envelope"]["allow"] = serde_json::json!(permissions);
            let encoded = serde_json::to_vec(&packet).expect("packet must serialize");
            assert_eq!(
                parse_packet_envelope_v1(&encoded).is_ok(),
                index == 0,
                "permutation {index}"
            );
        }
    }
}
