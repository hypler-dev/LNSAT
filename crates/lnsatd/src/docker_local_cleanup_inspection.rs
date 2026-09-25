//! Bounded parsing of untrusted Docker container inspection output.
//!
//! A matching response is only a syntactic observation. It does not establish
//! daemon identity, provenance, operator authority, or permission to remove a
//! container. No command or cleanup operation is implemented here.

use crate::docker_local_supervisor::{
    DOCKER_LOCAL_LAUNCH_LABEL_KEY_V1, DOCKER_LOCAL_OPERATION_LABEL_KEY_V1,
};
use serde::de::{MapAccess, Visitor};
use serde::{Deserialize, Deserializer};
use std::collections::BTreeMap;
use std::fmt;

/// Maximum accepted output from one formatted container inspection.
pub const MAX_DOCKER_LOCAL_CONTAINER_INSPECT_BYTES_V1: usize = 64 * 1024;

/// Syntactic identity seen in one untrusted inspection response.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct DockerLocalContainerInspectIdentityV1 {
    pub container_id: String,
    pub local_image_id: String,
    pub operation_id: String,
    pub launch_contract_digest: String,
}

/// Stable code-only parse failure. No response bytes enter diagnostics.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum DockerLocalContainerInspectErrorV1 {
    Invalid,
}

impl DockerLocalContainerInspectErrorV1 {
    #[must_use]
    pub const fn code(self) -> &'static str {
        "docker_local_container_inspect.invalid"
    }
}

impl fmt::Display for DockerLocalContainerInspectErrorV1 {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(self.code())
    }
}

impl std::error::Error for DockerLocalContainerInspectErrorV1 {}

#[derive(Deserialize)]
struct InspectResponseV1 {
    #[serde(rename = "Id")]
    id: String,
    #[serde(rename = "Image")]
    image: String,
    #[serde(rename = "Config")]
    config: InspectConfigV1,
}

#[derive(Deserialize)]
struct InspectConfigV1 {
    #[serde(rename = "Labels")]
    labels: UniqueLabelsV1,
}

struct UniqueLabelsV1(BTreeMap<String, String>);

impl<'de> Deserialize<'de> for UniqueLabelsV1 {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        struct LabelsVisitor;

        impl<'de> Visitor<'de> for LabelsVisitor {
            type Value = UniqueLabelsV1;

            fn expecting(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
                formatter.write_str("a map of unique string labels")
            }

            fn visit_map<M>(self, mut map: M) -> Result<Self::Value, M::Error>
            where
                M: MapAccess<'de>,
            {
                let mut labels = BTreeMap::new();
                while let Some((key, value)) = map.next_entry::<String, String>()? {
                    if labels.insert(key, value).is_some() {
                        return Err(serde::de::Error::custom("duplicate label"));
                    }
                }
                Ok(UniqueLabelsV1(labels))
            }
        }

        deserializer.deserialize_map(LabelsVisitor)
    }
}

/// Parses one bounded formatted `docker container inspect` JSON object and
/// checks its exact private container ID and two launch labels.
///
/// The response remains untrusted even when all fields match. Callers cannot
/// use this result as removal authority; daemon/endpoint/client revalidation,
/// image provenance, operator authority, and lifecycle checks remain separate.
///
/// # Errors
///
/// Rejects malformed, oversized, ambiguous, or mismatched response data.
pub fn parse_docker_local_container_inspect_identity_v1(
    response: &[u8],
    expected_container_id: &str,
    expected_operation_id: &str,
    expected_launch_contract_digest: &str,
) -> Result<DockerLocalContainerInspectIdentityV1, DockerLocalContainerInspectErrorV1> {
    let invalid = DockerLocalContainerInspectErrorV1::Invalid;
    if response.is_empty()
        || response.len() > MAX_DOCKER_LOCAL_CONTAINER_INSPECT_BYTES_V1
        || !is_lower_hex_v1(expected_container_id, 64)
        || !expected_operation_id
            .strip_prefix("opn_")
            .is_some_and(|suffix| is_lower_hex_v1(suffix, 64))
        || !expected_launch_contract_digest
            .strip_prefix("sha256:")
            .is_some_and(|suffix| is_lower_hex_v1(suffix, 64))
    {
        return Err(invalid);
    }
    let parsed: InspectResponseV1 = serde_json::from_slice(response).map_err(|_| invalid)?;
    if parsed.id != expected_container_id
        || !parsed
            .image
            .strip_prefix("sha256:")
            .is_some_and(|suffix| is_lower_hex_v1(suffix, 64))
        || parsed
            .config
            .labels
            .0
            .get(DOCKER_LOCAL_OPERATION_LABEL_KEY_V1)
            .map(String::as_str)
            != Some(expected_operation_id)
        || parsed
            .config
            .labels
            .0
            .get(DOCKER_LOCAL_LAUNCH_LABEL_KEY_V1)
            .map(String::as_str)
            != Some(expected_launch_contract_digest)
    {
        return Err(invalid);
    }
    Ok(DockerLocalContainerInspectIdentityV1 {
        container_id: parsed.id,
        local_image_id: parsed.image,
        operation_id: expected_operation_id.to_owned(),
        launch_contract_digest: expected_launch_contract_digest.to_owned(),
    })
}

fn is_lower_hex_v1(value: &str, len: usize) -> bool {
    value.len() == len
        && value
            .bytes()
            .all(|byte| byte.is_ascii_digit() || (b'a'..=b'f').contains(&byte))
}
