//! Private, inert decoding for bounded startup challenge frames.

use serde::de::Visitor;
use serde::{Deserialize, Deserializer, Serialize};
use sha2::{Digest, Sha256};
use zeroize::Zeroizing;

const MAX_FRAME_BYTES: usize = 65_536;
const ACTION_DOMAIN: &[u8] = b"lnsat.hcfg_startup_context.v2";
const PREPARATION_DOMAIN: &[u8] = b"lnsat.hcfg_probe_context.v1";

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
enum ChallengeError {
    InputTooLarge,
    Framing,
    JsonShape,
    Family,
    Context,
    Limits,
    Binding,
    Canonical,
}

impl ChallengeError {
    const fn code(self) -> &'static str {
        match self {
            Self::InputTooLarge => "headless_challenge.input_too_large",
            Self::Framing => "headless_challenge.framing",
            Self::JsonShape => "headless_challenge.json_shape",
            Self::Family => "headless_challenge.family",
            Self::Context => "headless_challenge.context",
            Self::Limits => "headless_challenge.limits",
            Self::Binding => "headless_challenge.binding",
            Self::Canonical => "headless_challenge.canonical",
        }
    }
}

struct ObjectDeserializer<D>(D);

impl<'de, D> Deserializer<'de> for ObjectDeserializer<D>
where
    D: Deserializer<'de>,
{
    type Error = D::Error;

    fn deserialize_any<V>(self, visitor: V) -> Result<V::Value, Self::Error>
    where
        V: Visitor<'de>,
    {
        self.0.deserialize_map(visitor)
    }

    serde::forward_to_deserialize_any! {
        bool i8 i16 i32 i64 u8 u16 u32 u64 f32 f64 char str string bytes byte_buf option
        unit unit_struct newtype_struct seq tuple tuple_struct map struct enum identifier ignored_any
    }
}

fn deserialize_object<'de, D, T>(deserializer: D) -> Result<T, D::Error>
where
    D: Deserializer<'de>,
    T: Deserialize<'de>,
{
    T::deserialize(ObjectDeserializer(deserializer))
}

#[derive(Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
struct ActionFrame {
    #[serde(deserialize_with = "deserialize_object")]
    context: ActionContext,
    contract_id: Zeroizing<String>,
    contract_version: Zeroizing<String>,
    message_type: Zeroizing<String>,
    #[serde(deserialize_with = "deserialize_object")]
    payload: Payload,
    schema_version: u32,
}

#[derive(Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
struct PreparationFrame {
    #[serde(deserialize_with = "deserialize_object")]
    context: PreparationContext,
    contract_id: Zeroizing<String>,
    contract_version: Zeroizing<String>,
    message_type: Zeroizing<String>,
    #[serde(deserialize_with = "deserialize_object")]
    payload: Payload,
    schema_version: u32,
}

#[derive(Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
struct ActionContext {
    attempt_sequence: u32,
    authority_epoch: u64,
    authorization_id: Zeroizing<String>,
    candidate_digest: Zeroizing<String>,
    challenge: Zeroizing<String>,
    channel_id: Zeroizing<String>,
    container_id: Zeroizing<String>,
    generation: u64,
    installation_id: Zeroizing<String>,
    operation_id: Zeroizing<String>,
    profile_digest: Zeroizing<String>,
    recipe_digest: Zeroizing<String>,
}

#[derive(Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
struct PreparationContext {
    candidate_digest: Zeroizing<String>,
    challenge: Zeroizing<String>,
    channel_id: Zeroizing<String>,
    container_id: Zeroizing<String>,
    preparation_id: Zeroizing<String>,
    profile_digest: Zeroizing<String>,
    recipe_digest: Zeroizing<String>,
}

#[derive(Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
struct Payload {
    #[serde(deserialize_with = "deserialize_object")]
    limits: Limits,
    startup_digest: Zeroizing<String>,
}

#[derive(Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
struct Limits {
    cpu_millis: u32,
    memory_bytes: u64,
    pids: u32,
    stderr_bytes: u64,
    stdout_bytes: u64,
    wall_clock_millis: u32,
}

struct UnverifiedActionChallenge {
    canonical_frame: Zeroizing<Vec<u8>>,
    context: ActionContext,
    context_digest: [u8; 32],
    limits: Limits,
}

struct UnverifiedPreparationChallenge {
    canonical_frame: Zeroizing<Vec<u8>>,
    context: PreparationContext,
    context_digest: [u8; 32],
    limits: Limits,
}

fn decode_action_challenge(bytes: &[u8]) -> Result<UnverifiedActionChallenge, ChallengeError> {
    preflight(bytes)?;
    let frame: ActionFrame = decode_frame(&bytes[..bytes.len() - 1])?;
    if frame.contract_id.as_str() != "lnsat.adapter_process.docker_local.v2"
        || frame.contract_version.as_str() != "lnsat.contracts.v1_0"
        || frame.schema_version != 2
        || frame.message_type.as_str() != "startup_challenge"
    {
        return Err(ChallengeError::Family);
    }
    if !valid_action_context(&frame.context) || !valid_digest(&frame.payload.startup_digest) {
        return Err(ChallengeError::Context);
    }
    if !valid_limits(&frame.payload.limits) {
        return Err(ChallengeError::Limits);
    }
    let context_digest = action_context_digest(&frame.context)?;
    if frame.payload.startup_digest.as_str() != digest_text(&context_digest).as_str() {
        return Err(ChallengeError::Binding);
    }
    let canonical_frame = canonical_frame(&frame)?;
    if bytes != canonical_frame.as_slice() {
        return Err(ChallengeError::Canonical);
    }
    let ActionFrame {
        context, payload, ..
    } = frame;
    Ok(UnverifiedActionChallenge {
        canonical_frame,
        context,
        context_digest,
        limits: payload.limits,
    })
}

fn decode_preparation_challenge(
    bytes: &[u8],
) -> Result<UnverifiedPreparationChallenge, ChallengeError> {
    preflight(bytes)?;
    let frame: PreparationFrame = decode_frame(&bytes[..bytes.len() - 1])?;
    if frame.contract_id.as_str() != "lnsat.preparation_probe.docker_local.v1"
        || frame.contract_version.as_str() != "lnsat.contracts.v1_0"
        || frame.schema_version != 1
        || frame.message_type.as_str() != "probe_challenge"
    {
        return Err(ChallengeError::Family);
    }
    if !valid_preparation_context(&frame.context) || !valid_digest(&frame.payload.startup_digest) {
        return Err(ChallengeError::Context);
    }
    if !valid_limits(&frame.payload.limits) {
        return Err(ChallengeError::Limits);
    }
    let context_digest = preparation_context_digest(&frame.context)?;
    if frame.payload.startup_digest.as_str() != digest_text(&context_digest).as_str() {
        return Err(ChallengeError::Binding);
    }
    let canonical_frame = canonical_frame(&frame)?;
    if bytes != canonical_frame.as_slice() {
        return Err(ChallengeError::Canonical);
    }
    let PreparationFrame {
        context, payload, ..
    } = frame;
    Ok(UnverifiedPreparationChallenge {
        canonical_frame,
        context,
        context_digest,
        limits: payload.limits,
    })
}

fn preflight(bytes: &[u8]) -> Result<(), ChallengeError> {
    if bytes.len() > MAX_FRAME_BYTES {
        return Err(ChallengeError::InputTooLarge);
    }
    if bytes.last() != Some(&b'\n')
        || bytes[..bytes.len().saturating_sub(1)]
            .iter()
            .any(|byte| matches!(*byte, b'\n' | b'\r'))
    {
        return Err(ChallengeError::Framing);
    }
    Ok(())
}

fn decode_frame<'de, T>(bytes: &'de [u8]) -> Result<T, ChallengeError>
where
    T: Deserialize<'de>,
{
    let mut deserializer = serde_json::Deserializer::from_slice(bytes);
    let frame = deserialize_object(&mut deserializer).map_err(|_| ChallengeError::JsonShape)?;
    deserializer.end().map_err(|_| ChallengeError::JsonShape)?;
    Ok(frame)
}

fn valid_action_context(value: &ActionContext) -> bool {
    value.generation > 0
        && value.authority_epoch > 0
        && value.attempt_sequence == 1
        && valid_uuid4(&value.installation_id)
        && valid_prefixed_hex(&value.operation_id, "opn_")
        && valid_prefixed_hex(&value.authorization_id, "xau_")
        && valid_digest(&value.candidate_digest)
        && valid_digest(&value.profile_digest)
        && valid_digest(&value.recipe_digest)
        && valid_hex64(&value.container_id)
        && valid_hex64(&value.channel_id)
        && valid_hex64(&value.challenge)
}

fn valid_preparation_context(value: &PreparationContext) -> bool {
    valid_hex64(&value.preparation_id)
        && valid_digest(&value.candidate_digest)
        && valid_digest(&value.profile_digest)
        && valid_digest(&value.recipe_digest)
        && valid_hex64(&value.container_id)
        && valid_hex64(&value.channel_id)
        && valid_hex64(&value.challenge)
}

fn valid_limits(value: &Limits) -> bool {
    (1..=512 * 1024 * 1024).contains(&value.memory_bytes)
        && (1..=64).contains(&value.pids)
        && (1..=1_000).contains(&value.cpu_millis)
        && (1..=30_000).contains(&value.wall_clock_millis)
        && (1..=1024 * 1024).contains(&value.stdout_bytes)
        && value.stderr_bytes == 0
}

fn valid_digest(value: &str) -> bool {
    value.len() == 71 && value.starts_with("sha256:") && valid_lower_hex(&value.as_bytes()[7..])
}

fn valid_hex64(value: &str) -> bool {
    value.len() == 64 && valid_lower_hex(value.as_bytes())
}

fn valid_prefixed_hex(value: &str, prefix: &str) -> bool {
    value.len() == prefix.len() + 64
        && value.starts_with(prefix)
        && valid_lower_hex(&value.as_bytes()[prefix.len()..])
}

fn valid_uuid4(value: &str) -> bool {
    let bytes = value.as_bytes();
    bytes.len() == 36
        && [8, 13, 18, 23].iter().all(|index| bytes[*index] == b'-')
        && bytes[14] == b'4'
        && matches!(bytes[19], b'8' | b'9' | b'a' | b'b')
        && bytes.iter().enumerate().all(|(index, byte)| {
            matches!(index, 8 | 13 | 18 | 23)
                || byte.is_ascii_digit()
                || (b'a'..=b'f').contains(byte)
        })
}

fn valid_lower_hex(bytes: &[u8]) -> bool {
    bytes
        .iter()
        .all(|byte| byte.is_ascii_digit() || (b'a'..=b'f').contains(byte))
}

fn action_context_digest(context: &ActionContext) -> Result<[u8; 32], ChallengeError> {
    let mut canonical = Zeroizing::new(Vec::new());
    write_json(&mut canonical, &"lnsat.adapter_process.docker_local.v2")?;
    canonical.push(b',');
    write_json(&mut canonical, &"lnsat.contracts.v1_0")?;
    canonical.extend_from_slice(b",2,");
    canonical.push(b'[');
    write_json(&mut canonical, &context.installation_id)?;
    canonical.push(b',');
    write_json(&mut canonical, &context.generation)?;
    canonical.push(b',');
    write_json(&mut canonical, &context.authority_epoch)?;
    canonical.push(b',');
    write_json(&mut canonical, &context.operation_id)?;
    canonical.push(b',');
    write_json(&mut canonical, &context.authorization_id)?;
    canonical.push(b',');
    write_json(&mut canonical, &context.attempt_sequence)?;
    for value in [
        &context.candidate_digest,
        &context.profile_digest,
        &context.recipe_digest,
        &context.container_id,
        &context.channel_id,
        &context.challenge,
    ] {
        canonical.push(b',');
        write_json(&mut canonical, value)?;
    }
    canonical.extend_from_slice(b"]");
    Ok(digest(ACTION_DOMAIN, &canonical))
}

fn preparation_context_digest(context: &PreparationContext) -> Result<[u8; 32], ChallengeError> {
    let mut canonical = Zeroizing::new(Vec::new());
    write_json(&mut canonical, &"lnsat.preparation_probe.docker_local.v1")?;
    canonical.push(b',');
    write_json(&mut canonical, &"lnsat.contracts.v1_0")?;
    canonical.extend_from_slice(b",1,[");
    for (index, value) in [
        &context.preparation_id,
        &context.candidate_digest,
        &context.profile_digest,
        &context.recipe_digest,
        &context.container_id,
        &context.channel_id,
        &context.challenge,
    ]
    .iter()
    .enumerate()
    {
        if index != 0 {
            canonical.push(b',');
        }
        write_json(&mut canonical, *value)?;
    }
    canonical.extend_from_slice(b"]");
    Ok(digest(PREPARATION_DOMAIN, &canonical))
}

fn write_json<T: Serialize>(output: &mut Vec<u8>, value: &T) -> Result<(), ChallengeError> {
    serde_json::to_writer(output, value).map_err(|_| ChallengeError::Canonical)
}

fn digest(domain: &[u8], canonical: &[u8]) -> [u8; 32] {
    let mut hasher = Sha256::new();
    hasher.update(domain);
    hasher.update(b"\n[");
    hasher.update(canonical);
    hasher.update(b"]");
    hasher.finalize().into()
}

fn digest_text(digest: &[u8; 32]) -> Zeroizing<String> {
    const HEX: &[u8; 16] = b"0123456789abcdef";
    let mut text = String::with_capacity(71);
    text.push_str("sha256:");
    for byte in digest {
        text.push(HEX[usize::from(byte >> 4)] as char);
        text.push(HEX[usize::from(byte & 15)] as char);
    }
    Zeroizing::new(text)
}

fn canonical_frame<T: Serialize>(frame: &T) -> Result<Zeroizing<Vec<u8>>, ChallengeError> {
    let mut canonical = Zeroizing::new(Vec::new());
    serde_json::to_writer(&mut *canonical, frame).map_err(|_| ChallengeError::Canonical)?;
    canonical.push(b'\n');
    Ok(canonical)
}

#[path = "headless_startup_messages.rs"]
mod messages;

#[cfg(test)]
#[path = "headless_startup_challenge_tests.rs"]
mod tests;
