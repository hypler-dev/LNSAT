//! Private supplied-byte codecs. Successful decoding is not authorization.

#[path = "headless_startup_native.rs"]
mod native;
#[path = "headless_startup_release.rs"]
mod release;
#[cfg(test)]
#[path = "headless_startup_messages_tests.rs"]
mod tests;

use super::{
    ActionContext, PreparationContext, action_context_digest, deserialize_object, digest,
    digest_text, preparation_context_digest, valid_action_context, valid_digest,
    valid_preparation_context, valid_uuid4,
};
use serde::{Deserialize, Serialize};
use zeroize::Zeroizing;

const FRAME_MAX: usize = 65_536;
const RELEASE_MAX: usize = 8_388_608;
const ACTION: &str = "lnsat.adapter_process.docker_local.v2";
const PREPARATION: &str = "lnsat.preparation_probe.docker_local.v1";
const VERSION: &str = "lnsat.contracts.v1_0";
const OBSERVATION_DOMAIN: &[u8] = b"lnsat.hcfg_startup_observation.v2";
const PROBE_DOMAIN: &[u8] = b"lnsat.hcfg_probe_observation.v1";
const RELEASE_DOMAIN: &[u8] = b"lnsat.hcfg_action_release.v2";
const RESULT_DOMAIN: &[u8] = b"lnsat.hcfg_action_result.v2";

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
enum MessageError {
    InputTooLarge,
    Framing,
    JsonSyntax,
    JsonLimits,
    JsonShape,
    Family,
    Context,
    Payload,
    Binding,
    Canonical,
}
impl MessageError {
    const fn code(self) -> &'static str {
        match self {
            Self::InputTooLarge => "headless_message.input_too_large",
            Self::Framing => "headless_message.framing",
            Self::JsonSyntax => "headless_message.json_syntax",
            Self::JsonLimits => "headless_message.json_limits",
            Self::JsonShape => "headless_message.json_shape",
            Self::Family => "headless_message.family",
            Self::Context => "headless_message.context",
            Self::Payload => "headless_message.payload",
            Self::Binding => "headless_message.binding",
            Self::Canonical => "headless_message.canonical",
        }
    }
}

#[derive(Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
struct ActionObservationFrame {
    #[serde(deserialize_with = "deserialize_object")]
    context: ActionContext,
    contract_id: Zeroizing<String>,
    contract_version: Zeroizing<String>,
    message_type: Zeroizing<String>,
    #[serde(deserialize_with = "deserialize_object")]
    payload: ActionObservationPayload,
    schema_version: u32,
}
#[derive(Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
struct PreparationObservationFrame {
    #[serde(deserialize_with = "deserialize_object")]
    context: PreparationContext,
    contract_id: Zeroizing<String>,
    contract_version: Zeroizing<String>,
    message_type: Zeroizing<String>,
    #[serde(deserialize_with = "deserialize_object")]
    payload: PreparationObservationPayload,
    schema_version: u32,
}
#[derive(Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
struct ActionObservationPayload {
    #[serde(deserialize_with = "deserialize_object")]
    native: native::Native,
    observation_digest: Zeroizing<String>,
    startup_digest: Zeroizing<String>,
}
#[derive(Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
struct PreparationObservationPayload {
    #[serde(deserialize_with = "deserialize_object")]
    native: native::Native,
    #[serde(deserialize_with = "deserialize_objects")]
    negative_checks: Vec<native::ProbeCheck>,
    observation_digest: Zeroizing<String>,
    startup_digest: Zeroizing<String>,
}
#[derive(Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
struct ActionReleaseFrame {
    #[serde(deserialize_with = "deserialize_object")]
    context: ActionContext,
    contract_id: Zeroizing<String>,
    contract_version: Zeroizing<String>,
    message_type: Zeroizing<String>,
    #[serde(deserialize_with = "deserialize_object")]
    payload: ActionReleasePayload,
    schema_version: u32,
}
#[derive(Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
struct ActionReleasePayload {
    #[serde(deserialize_with = "deserialize_object")]
    execution_request: release::ExecutionRequest,
    observation_digest: Zeroizing<String>,
    release_audit_digest: Zeroizing<String>,
    release_id: Zeroizing<String>,
    repository_mount_path: Zeroizing<String>,
    startup_digest: Zeroizing<String>,
    target_digest: Zeroizing<String>,
    tool_arguments_digest: Zeroizing<String>,
}
#[derive(Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
struct ActionResultFrame {
    #[serde(deserialize_with = "deserialize_object")]
    context: ActionContext,
    contract_id: Zeroizing<String>,
    contract_version: Zeroizing<String>,
    message_type: Zeroizing<String>,
    #[serde(deserialize_with = "deserialize_object")]
    payload: ActionResultPayload,
    schema_version: u32,
}
#[derive(Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
struct ActionResultPayload {
    outcome: Zeroizing<String>,
    release_audit_digest: Zeroizing<String>,
    release_id: Zeroizing<String>,
    #[serde(deserialize_with = "required_nullable")]
    result_digest: Option<Zeroizing<String>>,
}

struct UnverifiedActionObservation {
    canonical_frame: Zeroizing<Vec<u8>>,
    context: ActionContext,
    payload: ActionObservationPayload,
    context_digest: [u8; 32],
    message_commitment: [u8; 32],
}
struct UnverifiedPreparationObservation {
    canonical_frame: Zeroizing<Vec<u8>>,
    context: PreparationContext,
    payload: PreparationObservationPayload,
    context_digest: [u8; 32],
    message_commitment: [u8; 32],
}
struct UnverifiedActionRelease {
    canonical_frame: Zeroizing<Vec<u8>>,
    context: ActionContext,
    payload: ActionReleasePayload,
    context_digest: [u8; 32],
    message_commitment: [u8; 32],
}
struct UnverifiedActionResult {
    canonical_frame: Zeroizing<Vec<u8>>,
    context: ActionContext,
    payload: ActionResultPayload,
    context_digest: [u8; 32],
    message_commitment: [u8; 32],
}

fn decode_action_observation(bytes: &[u8]) -> Result<UnverifiedActionObservation, MessageError> {
    preflight(bytes, FRAME_MAX, false)?;
    let frame: ActionObservationFrame = decode(bytes)?;
    action_family(
        &frame.contract_id,
        &frame.contract_version,
        frame.schema_version,
        &frame.message_type,
        "startup_observation",
    )?;
    if !valid_action_context(&frame.context)
        || !valid_digest(&frame.payload.startup_digest)
        || !valid_digest(&frame.payload.observation_digest)
    {
        return Err(MessageError::Context);
    }
    if !native::valid_native(&frame.payload.native, true) {
        return Err(MessageError::Payload);
    }
    let context_digest =
        action_context_digest(&frame.context).map_err(|_| MessageError::Canonical)?;
    if frame.payload.startup_digest.as_str() != digest_text(&context_digest).as_str() {
        return Err(MessageError::Binding);
    }
    let message_commitment = commitment(
        OBSERVATION_DOMAIN,
        &(&frame.payload.startup_digest, &frame.payload.native),
    )?;
    if frame.payload.observation_digest.as_str() != digest_text(&message_commitment).as_str() {
        return Err(MessageError::Binding);
    }
    let canonical_frame = canonical(&frame)?;
    ensure_canonical(bytes, &canonical_frame)?;
    let ActionObservationFrame {
        context, payload, ..
    } = frame;
    Ok(UnverifiedActionObservation {
        canonical_frame,
        context,
        payload,
        context_digest,
        message_commitment,
    })
}

fn decode_preparation_observation(
    bytes: &[u8],
) -> Result<UnverifiedPreparationObservation, MessageError> {
    preflight(bytes, FRAME_MAX, false)?;
    let frame: PreparationObservationFrame = decode(bytes)?;
    preparation_family(
        &frame.contract_id,
        &frame.contract_version,
        frame.schema_version,
        &frame.message_type,
        "probe_observation",
    )?;
    if !valid_preparation_context(&frame.context)
        || !valid_digest(&frame.payload.startup_digest)
        || !valid_digest(&frame.payload.observation_digest)
    {
        return Err(MessageError::Context);
    }
    if !native::valid_native(&frame.payload.native, false)
        || !native::valid_checks(&frame.payload.negative_checks)
    {
        return Err(MessageError::Payload);
    }
    let context_digest =
        preparation_context_digest(&frame.context).map_err(|_| MessageError::Canonical)?;
    if frame.payload.startup_digest.as_str() != digest_text(&context_digest).as_str() {
        return Err(MessageError::Binding);
    }
    let message_commitment = commitment(
        PROBE_DOMAIN,
        &(
            &frame.payload.startup_digest,
            &frame.payload.native,
            &frame.payload.negative_checks,
        ),
    )?;
    if frame.payload.observation_digest.as_str() != digest_text(&message_commitment).as_str() {
        return Err(MessageError::Binding);
    }
    let canonical_frame = canonical(&frame)?;
    ensure_canonical(bytes, &canonical_frame)?;
    let PreparationObservationFrame {
        context, payload, ..
    } = frame;
    Ok(UnverifiedPreparationObservation {
        canonical_frame,
        context,
        payload,
        context_digest,
        message_commitment,
    })
}

fn decode_action_release(bytes: &[u8]) -> Result<UnverifiedActionRelease, MessageError> {
    preflight(bytes, RELEASE_MAX, true)?;
    let frame: ActionReleaseFrame = decode(bytes)?;
    action_family(
        &frame.contract_id,
        &frame.contract_version,
        frame.schema_version,
        &frame.message_type,
        "action_release",
    )?;
    if !valid_action_context(&frame.context)
        || ![
            &frame.payload.startup_digest,
            &frame.payload.observation_digest,
            &frame.payload.release_audit_digest,
            &frame.payload.target_digest,
            &frame.payload.tool_arguments_digest,
        ]
        .iter()
        .all(|x| valid_digest(x))
        || !valid_uuid4(&frame.payload.release_id)
    {
        return Err(MessageError::Context);
    }
    if !linux_abs(&frame.payload.repository_mount_path, 256) {
        return Err(MessageError::Payload);
    }
    let (target, tool) = release::valid_execution_request(&frame.payload.execution_request)?;
    let context_digest =
        action_context_digest(&frame.context).map_err(|_| MessageError::Canonical)?;
    if frame.payload.startup_digest.as_str() != digest_text(&context_digest).as_str() {
        return Err(MessageError::Binding);
    }
    if frame.payload.target_digest.as_str() != digest_text(&target).as_str()
        || frame.payload.tool_arguments_digest.as_str() != digest_text(&tool).as_str()
    {
        return Err(MessageError::Binding);
    }
    let message_commitment = commitment(
        RELEASE_DOMAIN,
        &(
            &frame.payload.startup_digest,
            &frame.payload.observation_digest,
            &frame.payload.release_id,
            &frame.payload.release_audit_digest,
            &frame.payload.execution_request,
            &frame.payload.target_digest,
            &frame.payload.tool_arguments_digest,
            &frame.payload.repository_mount_path,
        ),
    )?;
    let canonical_frame = canonical(&frame)?;
    ensure_canonical(bytes, &canonical_frame)?;
    let ActionReleaseFrame {
        context, payload, ..
    } = frame;
    Ok(UnverifiedActionRelease {
        canonical_frame,
        context,
        payload,
        context_digest,
        message_commitment,
    })
}

fn decode_action_result(bytes: &[u8]) -> Result<UnverifiedActionResult, MessageError> {
    preflight(bytes, FRAME_MAX, false)?;
    let frame: ActionResultFrame = decode(bytes)?;
    action_family(
        &frame.contract_id,
        &frame.contract_version,
        frame.schema_version,
        &frame.message_type,
        "action_result",
    )?;
    if !valid_action_context(&frame.context)
        || !valid_uuid4(&frame.payload.release_id)
        || !valid_digest(&frame.payload.release_audit_digest)
        || frame
            .payload
            .result_digest
            .as_ref()
            .is_some_and(|x| !valid_digest(x))
    {
        return Err(MessageError::Context);
    }
    if !matches!(
        (
            frame.payload.outcome.as_str(),
            frame.payload.result_digest.is_some()
        ),
        ("completed", true) | ("outcome_unknown", false)
    ) {
        return Err(MessageError::Payload);
    }
    let context_digest =
        action_context_digest(&frame.context).map_err(|_| MessageError::Canonical)?;
    let startup = digest_text(&context_digest);
    let message_commitment = commitment(
        RESULT_DOMAIN,
        &(
            &startup,
            &frame.payload.release_id,
            &frame.payload.release_audit_digest,
            &frame.payload.outcome,
            &frame.payload.result_digest,
        ),
    )?;
    let canonical_frame = canonical(&frame)?;
    ensure_canonical(bytes, &canonical_frame)?;
    let ActionResultFrame {
        context, payload, ..
    } = frame;
    Ok(UnverifiedActionResult {
        canonical_frame,
        context,
        payload,
        context_digest,
        message_commitment,
    })
}

fn action_family(
    contract: &str,
    version: &str,
    schema: u32,
    kind: &str,
    expected: &str,
) -> Result<(), MessageError> {
    if contract == ACTION && version == VERSION && schema == 2 && kind == expected {
        Ok(())
    } else {
        Err(MessageError::Family)
    }
}
fn preparation_family(
    contract: &str,
    version: &str,
    schema: u32,
    kind: &str,
    expected: &str,
) -> Result<(), MessageError> {
    if contract == PREPARATION && version == VERSION && schema == 1 && kind == expected {
        Ok(())
    } else {
        Err(MessageError::Family)
    }
}
fn linux_abs(value: &str, max: usize) -> bool {
    value.starts_with('/')
        && value != "/"
        && value.len() <= max
        && !value.contains('\\')
        && !value.ends_with('/')
        && !value.bytes().any(|x| x == 0 || x < 0x20 || x == 0x7f)
        && value[1..]
            .split('/')
            .all(|x| !x.is_empty() && !matches!(x, "." | ".."))
}
fn decode<'a, T: Deserialize<'a>>(bytes: &'a [u8]) -> Result<T, MessageError> {
    let mut d = serde_json::Deserializer::from_slice(&bytes[..bytes.len() - 1]);
    let value = deserialize_object(&mut d).map_err(|_| MessageError::JsonShape)?;
    d.end().map_err(|_| MessageError::JsonShape)?;
    Ok(value)
}
fn required_nullable<'de, D, T>(deserializer: D) -> Result<Option<T>, D::Error>
where
    D: serde::Deserializer<'de>,
    T: Deserialize<'de>,
{
    Option::deserialize(deserializer)
}
// A derived struct accepts positional arrays by default. These wrappers force
// every nested object, including collection elements, through a map visitor.
struct MapOnly<T>(T);
impl<'de, T: Deserialize<'de>> Deserialize<'de> for MapOnly<T> {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        deserialize_object(deserializer).map(Self)
    }
}
fn deserialize_objects<'de, D, T>(deserializer: D) -> Result<Vec<T>, D::Error>
where
    D: serde::Deserializer<'de>,
    T: Deserialize<'de>,
{
    Vec::<MapOnly<T>>::deserialize(deserializer)
        .map(|values| values.into_iter().map(|value| value.0).collect())
}
fn required_nullable_object<'de, D, T>(deserializer: D) -> Result<Option<T>, D::Error>
where
    D: serde::Deserializer<'de>,
    T: Deserialize<'de>,
{
    Option::<MapOnly<T>>::deserialize(deserializer).map(|value| value.map(|value| value.0))
}
fn canonical<T: Serialize>(value: &T) -> Result<Zeroizing<Vec<u8>>, MessageError> {
    let mut output = Zeroizing::new(Vec::new());
    serde_json::to_writer(&mut *output, value).map_err(|_| MessageError::Canonical)?;
    output.push(b'\n');
    Ok(output)
}
fn ensure_canonical(input: &[u8], canonical: &[u8]) -> Result<(), MessageError> {
    if input == canonical {
        Ok(())
    } else {
        Err(MessageError::Canonical)
    }
}
fn commitment<T: Serialize>(domain: &[u8], value: &T) -> Result<[u8; 32], MessageError> {
    let mut bytes = Zeroizing::new(Vec::new());
    serde_json::to_writer(&mut *bytes, value).map_err(|_| MessageError::Canonical)?;
    if bytes.len() < 2 || bytes[0] != b'[' || *bytes.last().unwrap_or(&0) != b']' {
        return Err(MessageError::Canonical);
    }
    Ok(digest(domain, &bytes[1..bytes.len() - 1]))
}

fn preflight(bytes: &[u8], max: usize, release: bool) -> Result<(), MessageError> {
    if bytes.len() > max {
        return Err(MessageError::InputTooLarge);
    }
    if bytes.last() != Some(&b'\n')
        || bytes[..bytes.len().saturating_sub(1)]
            .iter()
            .any(|x| matches!(*x, b'\n' | b'\r'))
    {
        return Err(MessageError::Framing);
    }
    let content = &bytes[..bytes.len() - 1];
    core::str::from_utf8(content).map_err(|_| MessageError::JsonSyntax)?;
    MessagePreflight::new(content)
        .scan_document(if release {
            ScanContext::Root
        } else {
            ScanContext::Other
        })
        .map_err(ScanError::into_message_error)
}

const MAX_KEY_BYTES: usize = 256;
const MAX_CONTAINER_DEPTH: usize = 32;
const MAX_OBJECT_MEMBERS: usize = 64;
const MAX_TOTAL_OBJECT_MEMBERS: usize = 4096;
const MAX_ARRAY_ELEMENTS: usize = 128;

enum ScanError {
    Syntax,
    Limits,
}
impl ScanError {
    const fn into_message_error(self) -> MessageError {
        match self {
            Self::Syntax => MessageError::JsonSyntax,
            Self::Limits => MessageError::JsonLimits,
        }
    }
}

// Only this exact chain of decoded object keys grants the larger patch limit.
// Any array or unmatched object key irreversibly leaves the chain.
#[derive(Clone, Copy)]
enum ScanContext {
    Other,
    Root,
    Payload,
    ExecutionRequest,
    Action,
    Arguments,
    Patch,
}
impl ScanContext {
    fn child(self, key: &str) -> Self {
        match (self, key) {
            (Self::Root, "payload") => Self::Payload,
            (Self::Payload, "execution_request") => Self::ExecutionRequest,
            (Self::ExecutionRequest, "action") => Self::Action,
            (Self::Action, "arguments") => Self::Arguments,
            (Self::Arguments, "patch") => Self::Patch,
            _ => Self::Other,
        }
    }
    const fn string_limit(self) -> usize {
        if matches!(self, Self::Patch) {
            1_048_576
        } else {
            4096
        }
    }
}

struct KeyBuffer {
    bytes: Zeroizing<[u8; MAX_KEY_BYTES]>,
    length: usize,
}
impl KeyBuffer {
    fn new() -> Self {
        Self {
            bytes: Zeroizing::new([0; MAX_KEY_BYTES]),
            length: 0,
        }
    }
    fn append(&mut self, bytes: &[u8]) -> Result<(), ScanError> {
        let end = self
            .length
            .checked_add(bytes.len())
            .ok_or(ScanError::Limits)?;
        if end > MAX_KEY_BYTES {
            return Err(ScanError::Limits);
        }
        self.bytes[self.length..end].copy_from_slice(bytes);
        self.length = end;
        Ok(())
    }
    fn as_str(&self) -> Result<&str, ScanError> {
        std::str::from_utf8(&self.bytes[..self.length]).map_err(|_| ScanError::Syntax)
    }
}

struct MessagePreflight<'a> {
    bytes: &'a [u8],
    position: usize,
    total_object_members: usize,
}
impl<'a> MessagePreflight<'a> {
    const fn new(bytes: &'a [u8]) -> Self {
        Self {
            bytes,
            position: 0,
            total_object_members: 0,
        }
    }
    fn scan_document(&mut self, context: ScanContext) -> Result<(), ScanError> {
        self.skip_whitespace();
        self.scan_value(1, context)?;
        self.skip_whitespace();
        if self.position == self.bytes.len() {
            Ok(())
        } else {
            Err(ScanError::Syntax)
        }
    }
    fn scan_value(&mut self, depth: usize, context: ScanContext) -> Result<(), ScanError> {
        match self.current() {
            Some(b'{') => self.scan_object(depth, context),
            Some(b'[') => self.scan_array(depth, context),
            Some(b'"') => self.scan_string(context.string_limit(), false, None),
            Some(b't') => self.scan_keyword(b"true"),
            Some(b'f') => self.scan_keyword(b"false"),
            Some(b'n') => self.scan_keyword(b"null"),
            Some(b'-' | b'0'..=b'9') => self.scan_number(),
            _ => Err(ScanError::Syntax),
        }
    }
    fn scan_object(&mut self, depth: usize, context: ScanContext) -> Result<(), ScanError> {
        if depth > MAX_CONTAINER_DEPTH {
            return Err(ScanError::Limits);
        }
        self.position += 1;
        self.skip_whitespace();
        if self.consume(b'}') {
            return Ok(());
        }
        let mut members = 0;
        loop {
            if members == MAX_OBJECT_MEMBERS
                || self.total_object_members == MAX_TOTAL_OBJECT_MEMBERS
            {
                return Err(ScanError::Limits);
            }
            members += 1;
            self.total_object_members += 1;
            let mut key = KeyBuffer::new();
            self.scan_string(MAX_KEY_BYTES, true, Some(&mut key))?;
            self.skip_whitespace();
            self.expect(b':')?;
            self.skip_whitespace();
            let child = context.child(key.as_str()?);
            self.scan_value(depth + 1, child)?;
            self.skip_whitespace();
            if self.consume(b'}') {
                return Ok(());
            }
            self.expect(b',')?;
            self.skip_whitespace();
            if self.current() == Some(b'}') {
                return Err(ScanError::Syntax);
            }
        }
    }
    fn scan_array(&mut self, depth: usize, _context: ScanContext) -> Result<(), ScanError> {
        if depth > MAX_CONTAINER_DEPTH {
            return Err(ScanError::Limits);
        }
        self.position += 1;
        self.skip_whitespace();
        if self.consume(b']') {
            return Ok(());
        }
        let mut elements = 0;
        loop {
            if elements == MAX_ARRAY_ELEMENTS {
                return Err(ScanError::Limits);
            }
            self.scan_value(depth + 1, ScanContext::Other)?;
            elements += 1;
            self.skip_whitespace();
            if self.consume(b']') {
                return Ok(());
            }
            self.expect(b',')?;
            self.skip_whitespace();
            if self.current() == Some(b']') {
                return Err(ScanError::Syntax);
            }
        }
    }
    fn scan_string(
        &mut self,
        maximum: usize,
        require_nonempty: bool,
        mut key: Option<&mut KeyBuffer>,
    ) -> Result<(), ScanError> {
        self.expect(b'"')?;
        let mut decoded_bytes = 0;
        loop {
            let byte = self.current().ok_or(ScanError::Syntax)?;
            match byte {
                b'"' => {
                    self.position += 1;
                    if require_nonempty && decoded_bytes == 0 {
                        return Err(ScanError::Limits);
                    }
                    return Ok(());
                }
                0x00..=0x1f => return Err(ScanError::Syntax),
                b'\\' => {
                    self.position += 1;
                    let escape = self.current().ok_or(ScanError::Syntax)?;
                    match escape {
                        b'"' | b'\\' | b'/' | b'b' | b'f' | b'n' | b'r' | b't' => {
                            self.position += 1;
                            let decoded = match escape {
                                b'"' => b"\"".as_slice(),
                                b'\\' => b"\\".as_slice(),
                                b'/' => b"/".as_slice(),
                                b'b' => b"\x08".as_slice(),
                                b'f' => b"\x0c".as_slice(),
                                b'n' => b"\n".as_slice(),
                                b'r' => b"\r".as_slice(),
                                _ => b"\t".as_slice(),
                            };
                            Self::add_bytes(&mut decoded_bytes, decoded.len(), maximum)?;
                            if let Some(buffer) = key.as_deref_mut() {
                                buffer.append(decoded)?;
                            }
                        }
                        b'u' => {
                            self.position += 1;
                            let high = self.scan_hex_code_unit()?;
                            let scalar = if (0xd800..=0xdbff).contains(&high) {
                                self.expect(b'\\')?;
                                self.expect(b'u')?;
                                let low = self.scan_hex_code_unit()?;
                                if !(0xdc00..=0xdfff).contains(&low) {
                                    return Err(ScanError::Syntax);
                                }
                                0x1_0000
                                    + (((u32::from(high) - 0xd800) << 10)
                                        | (u32::from(low) - 0xdc00))
                            } else if (0xdc00..=0xdfff).contains(&high) {
                                return Err(ScanError::Syntax);
                            } else {
                                u32::from(high)
                            };
                            let mut encoded = Zeroizing::new([0_u8; 4]);
                            let encoded = char::from_u32(scalar)
                                .ok_or(ScanError::Syntax)?
                                .encode_utf8(&mut *encoded)
                                .as_bytes();
                            Self::add_bytes(&mut decoded_bytes, encoded.len(), maximum)?;
                            if let Some(buffer) = key.as_deref_mut() {
                                buffer.append(encoded)?;
                            }
                        }
                        _ => return Err(ScanError::Syntax),
                    }
                }
                _ => {
                    self.position += 1;
                    Self::add_bytes(&mut decoded_bytes, 1, maximum)?;
                    if let Some(buffer) = key.as_deref_mut() {
                        buffer.append(&[byte])?;
                    }
                }
            }
        }
    }
    fn scan_hex_code_unit(&mut self) -> Result<u16, ScanError> {
        let mut value = 0_u16;
        for _ in 0..4 {
            let byte = self.current().ok_or(ScanError::Syntax)?;
            let digit = match byte {
                b'0'..=b'9' => u16::from(byte - b'0'),
                b'a'..=b'f' => u16::from(byte - b'a' + 10),
                b'A'..=b'F' => u16::from(byte - b'A' + 10),
                _ => return Err(ScanError::Syntax),
            };
            value = (value << 4) | digit;
            self.position += 1;
        }
        Ok(value)
    }
    fn scan_keyword(&mut self, keyword: &[u8]) -> Result<(), ScanError> {
        if self.bytes.get(self.position..self.position + keyword.len()) == Some(keyword) {
            self.position += keyword.len();
            Ok(())
        } else {
            Err(ScanError::Syntax)
        }
    }
    fn scan_number(&mut self) -> Result<(), ScanError> {
        self.consume(b'-');
        match self.current() {
            Some(b'0') => self.position += 1,
            Some(b'1'..=b'9') => {
                self.position += 1;
                self.consume_digits();
            }
            _ => return Err(ScanError::Syntax),
        }
        if self.consume(b'.') {
            if !self.consume_digit() {
                return Err(ScanError::Syntax);
            }
            self.consume_digits();
        }
        if matches!(self.current(), Some(b'e' | b'E')) {
            self.position += 1;
            if matches!(self.current(), Some(b'+' | b'-')) {
                self.position += 1;
            }
            if !self.consume_digit() {
                return Err(ScanError::Syntax);
            }
            self.consume_digits();
        }
        Ok(())
    }
    fn add_bytes(count: &mut usize, add: usize, maximum: usize) -> Result<(), ScanError> {
        *count = count.checked_add(add).ok_or(ScanError::Limits)?;
        if *count > maximum {
            Err(ScanError::Limits)
        } else {
            Ok(())
        }
    }
    fn consume_digits(&mut self) {
        while self.consume_digit() {}
    }
    fn consume_digit(&mut self) -> bool {
        if matches!(self.current(), Some(b'0'..=b'9')) {
            self.position += 1;
            true
        } else {
            false
        }
    }
    fn expect(&mut self, expected: u8) -> Result<(), ScanError> {
        if self.consume(expected) {
            Ok(())
        } else {
            Err(ScanError::Syntax)
        }
    }
    fn consume(&mut self, expected: u8) -> bool {
        if self.current() == Some(expected) {
            self.position += 1;
            true
        } else {
            false
        }
    }
    fn current(&self) -> Option<u8> {
        self.bytes.get(self.position).copied()
    }
    fn skip_whitespace(&mut self) {
        while matches!(self.current(), Some(b' ' | b'\n' | b'\r' | b'\t')) {
            self.position += 1;
        }
    }
}
