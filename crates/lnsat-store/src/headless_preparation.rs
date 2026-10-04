//! Private Stage-A preparation journal syntax and continuity.
//!
//! Parsed values are untrusted assertions, not custody or observation proof.
//! The codec performs no I/O. Its private custody child persists untrusted
//! frames under actual selected-store custody without initialization or admission.
//! Observation-owning writers and native provenance remain separate work.

use serde::de::{Deserializer, Visitor};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::fmt;

#[cfg(any(target_os = "linux", target_os = "macos"))]
#[path = "headless_preparation_custody.rs"]
mod custody;

const MAX_RECORD_BYTES: usize = 16_384;
const MAX_RECORDS: usize = 64;
const MAX_CHAIN_BYTES: usize = 1_048_576;
const JOURNAL_SCHEMA: &str = "lnsat.hcfg_preparation_journal.v1";
const CONTRACT_VERSION: &str = "lnsat.contracts.v1_0";
const CANDIDATE_DOMAIN: &[u8] = b"lnsat.hcfg_preparation_candidate.v1\n";
const JOURNAL_DOMAIN: &[u8] = b"lnsat.hcfg_preparation_journal.v1\n";

/// Fixed data-free errors; parser diagnostics and input values never escape.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
enum JournalError {
    LimitExceeded,
    InvalidFrame,
    InvalidRecord,
    InvalidCandidate,
    InvalidChain,
}

impl JournalError {
    const fn code(self) -> &'static str {
        match self {
            Self::LimitExceeded => "journal.limit_exceeded",
            Self::InvalidFrame => "journal.invalid_frame",
            Self::InvalidRecord => "journal.invalid_record",
            Self::InvalidCandidate => "journal.invalid_candidate",
            Self::InvalidChain => "journal.invalid_chain",
        }
    }
}

#[derive(Clone, Copy, Eq, PartialEq, Serialize)]
#[serde(rename_all = "snake_case")]
enum JournalPhase {
    Pending,
    ProbeCreated,
    CleanupVerified,
    Bound,
    Quarantined,
}

impl<'de> Deserialize<'de> for JournalPhase {
    fn deserialize<D: Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        struct PhaseVisitor;

        impl Visitor<'_> for PhaseVisitor {
            type Value = JournalPhase;

            fn expecting(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
                formatter.write_str("an exact journal phase string")
            }

            fn visit_str<E: serde::de::Error>(self, value: &str) -> Result<Self::Value, E> {
                match value {
                    "pending" => Ok(JournalPhase::Pending),
                    "probe_created" => Ok(JournalPhase::ProbeCreated),
                    "cleanup_verified" => Ok(JournalPhase::CleanupVerified),
                    "bound" => Ok(JournalPhase::Bound),
                    "quarantined" => Ok(JournalPhase::Quarantined),
                    _ => Err(E::custom("invalid journal phase")),
                }
            }
        }

        deserializer.deserialize_str(PhaseVisitor)
    }
}

/// Required JSON member whose value is explicitly null or a string.
///
/// `deserialize_any` rejects a missing member rather than treating it as null.
#[derive(Clone, Eq, PartialEq, Serialize)]
#[serde(transparent)]
struct NullableString(Option<String>);

impl<'de> Deserialize<'de> for NullableString {
    fn deserialize<D: Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        struct NullableVisitor;

        impl Visitor<'_> for NullableVisitor {
            type Value = NullableString;

            fn expecting(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
                formatter.write_str("an explicit null or string")
            }

            fn visit_unit<E: serde::de::Error>(self) -> Result<Self::Value, E> {
                Ok(NullableString(None))
            }

            fn visit_str<E: serde::de::Error>(self, value: &str) -> Result<Self::Value, E> {
                Ok(NullableString(Some(value.to_owned())))
            }

            fn visit_string<E: serde::de::Error>(self, value: String) -> Result<Self::Value, E> {
                Ok(NullableString(Some(value)))
            }
        }

        deserializer.deserialize_any(NullableVisitor)
    }
}

/// Struct declaration order is the canonical record order, including nulls.
#[derive(Clone, Eq, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
struct JournalRecord {
    schema_id: String,
    contract_version: String,
    preparation_id: String,
    candidate_digest: String,
    store_digest: String,
    recipe_digest: String,
    owner_uid: u32,
    challenge_digest: String,
    phase: JournalPhase,
    container_name: String,
    container_id: NullableString,
    previous_digest: NullableString,
    revision: u8,
}

struct CandidateInput<'a> {
    declaration_digest: &'a str,
    composed_digest: &'a str,
    binding_digest: &'a str,
    store_digest: &'a str,
    owner_uid: u32,
    profile_digest: &'a str,
    recipe_digest: &'a str,
}

/// Internal continuity only; this value has no observation or authority API.
struct JournalChain {
    records: Vec<JournalRecord>,
    final_digest: String,
}

fn valid_hex_id(value: &str) -> bool {
    value.len() == 64
        && value
            .bytes()
            .all(|byte| byte.is_ascii_digit() || (b'a'..=b'f').contains(&byte))
}

fn valid_digest(value: &str) -> bool {
    value.strip_prefix("sha256:").is_some_and(valid_hex_id)
}

const fn valid_owner(uid: u32) -> bool {
    uid != 0 && uid != u32::MAX
}

fn validate_record(record: &JournalRecord) -> Result<(), JournalError> {
    if record.schema_id != JOURNAL_SCHEMA
        || record.contract_version != CONTRACT_VERSION
        || !valid_hex_id(&record.preparation_id)
        || !valid_owner(record.owner_uid)
        || usize::from(record.revision) >= MAX_RECORDS
        || ![
            &record.candidate_digest,
            &record.store_digest,
            &record.recipe_digest,
            &record.challenge_digest,
        ]
        .into_iter()
        .all(|value| valid_digest(value))
        || record.container_name != format!("lnsat-hcfg6-probe-{}", record.preparation_id)
        || record
            .container_id
            .0
            .as_deref()
            .is_some_and(|value| !valid_hex_id(value))
        || record
            .previous_digest
            .0
            .as_deref()
            .is_some_and(|value| !valid_digest(value))
    {
        return Err(JournalError::InvalidRecord);
    }
    if record.revision == 0 {
        if record.phase != JournalPhase::Pending
            || record.previous_digest.0.is_some()
            || record.container_id.0.is_some()
        {
            return Err(JournalError::InvalidRecord);
        }
    } else if record.phase == JournalPhase::Pending || record.previous_digest.0.is_none() {
        return Err(JournalError::InvalidRecord);
    }
    if record.phase == JournalPhase::ProbeCreated && record.container_id.0.is_none() {
        return Err(JournalError::InvalidRecord);
    }
    Ok(())
}

fn encode_record(record: &JournalRecord) -> Result<Vec<u8>, JournalError> {
    validate_record(record)?;
    let mut bytes = serde_json::to_vec(record).map_err(|_| JournalError::InvalidRecord)?;
    bytes.push(b'\n');
    if bytes.len() > MAX_RECORD_BYTES {
        return Err(JournalError::LimitExceeded);
    }
    Ok(bytes)
}

fn decode_record(bytes: &[u8]) -> Result<JournalRecord, JournalError> {
    if bytes.len() > MAX_RECORD_BYTES {
        return Err(JournalError::LimitExceeded);
    }
    let Some(body) = bytes.strip_suffix(b"\n") else {
        return Err(JournalError::InvalidFrame);
    };
    if body.is_empty() {
        return Err(JournalError::InvalidFrame);
    }
    let record: JournalRecord =
        serde_json::from_slice(body).map_err(|_| JournalError::InvalidRecord)?;
    if encode_record(&record)? != bytes {
        return Err(JournalError::InvalidFrame);
    }
    Ok(record)
}

fn digest_bytes(domain: &[u8], bytes: &[u8]) -> String {
    const HEX: &[u8; 16] = b"0123456789abcdef";
    let mut digest = Sha256::new();
    digest.update(domain);
    digest.update(bytes);
    let mut text = String::with_capacity(71);
    text.push_str("sha256:");
    for byte in digest.finalize() {
        text.push(char::from(HEX[usize::from(byte >> 4)]));
        text.push(char::from(HEX[usize::from(byte & 15)]));
    }
    text
}

fn candidate_digest(input: &CandidateInput<'_>) -> Result<String, JournalError> {
    if !valid_owner(input.owner_uid)
        || ![
            input.declaration_digest,
            input.composed_digest,
            input.binding_digest,
            input.store_digest,
            input.profile_digest,
            input.recipe_digest,
        ]
        .into_iter()
        .all(valid_digest)
    {
        return Err(JournalError::InvalidCandidate);
    }
    let values = (
        input.declaration_digest,
        input.composed_digest,
        input.binding_digest,
        input.store_digest,
        input.owner_uid,
        input.profile_digest,
        input.recipe_digest,
    );
    let bytes = serde_json::to_vec(&values).map_err(|_| JournalError::InvalidCandidate)?;
    Ok(digest_bytes(CANDIDATE_DOMAIN, &bytes))
}

fn journal_digest(record: &JournalRecord) -> Result<String, JournalError> {
    validate_record(record)?;
    let values = (
        &record.schema_id,
        &record.contract_version,
        &record.preparation_id,
        &record.candidate_digest,
        &record.store_digest,
        &record.recipe_digest,
        record.owner_uid,
        &record.challenge_digest,
        record.phase,
        &record.container_name,
        &record.container_id,
        &record.previous_digest,
        record.revision,
    );
    let bytes = serde_json::to_vec(&values).map_err(|_| JournalError::InvalidRecord)?;
    Ok(digest_bytes(JOURNAL_DOMAIN, &bytes))
}

fn validate_successor(prior: &JournalRecord, next: &JournalRecord) -> Result<(), JournalError> {
    use JournalPhase::{Bound, CleanupVerified, Pending, ProbeCreated, Quarantined};

    if prior.revision.checked_add(1) != Some(next.revision)
        || next.previous_digest.0.as_deref() != Some(journal_digest(prior)?.as_str())
        || prior.preparation_id != next.preparation_id
        || prior.candidate_digest != next.candidate_digest
        || prior.store_digest != next.store_digest
        || prior.recipe_digest != next.recipe_digest
        || prior.owner_uid != next.owner_uid
        || prior.challenge_digest != next.challenge_digest
        || prior.container_name != next.container_name
    {
        return Err(JournalError::InvalidChain);
    }
    let permitted = matches!(
        (prior.phase, next.phase),
        (Pending, ProbeCreated | CleanupVerified | Quarantined)
            | (ProbeCreated, CleanupVerified | Quarantined)
            | (CleanupVerified, Bound | Quarantined)
    );
    if !permitted {
        return Err(JournalError::InvalidChain);
    }
    let may_introduce_id = prior.phase == Pending
        && matches!(next.phase, ProbeCreated | Quarantined)
        && prior.container_id.0.is_none();
    if !may_introduce_id && prior.container_id != next.container_id {
        return Err(JournalError::InvalidChain);
    }
    Ok(())
}

fn validate_revision_chain(frames: &[&[u8]]) -> Result<JournalChain, JournalError> {
    if frames.len() > MAX_RECORDS {
        return Err(JournalError::LimitExceeded);
    }
    let total = frames.iter().try_fold(0_usize, |count, frame| {
        count
            .checked_add(frame.len())
            .ok_or(JournalError::LimitExceeded)
    })?;
    if total > MAX_CHAIN_BYTES || frames.iter().any(|frame| frame.len() > MAX_RECORD_BYTES) {
        return Err(JournalError::LimitExceeded);
    }
    if frames.is_empty() {
        return Err(JournalError::InvalidChain);
    }
    let mut records: Vec<JournalRecord> = Vec::with_capacity(frames.len());
    let mut final_digest = String::new();
    for frame in frames {
        let record = decode_record(frame)?;
        if let Some(prior) = records.last() {
            validate_successor(prior, &record)?;
        } else if record.revision != 0 || record.phase != JournalPhase::Pending {
            return Err(JournalError::InvalidChain);
        }
        final_digest = journal_digest(&record)?;
        records.push(record);
    }
    Ok(JournalChain {
        records,
        final_digest,
    })
}

#[cfg(test)]
#[path = "headless_preparation_tests.rs"]
mod tests;
