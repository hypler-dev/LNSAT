//! Private, inert schema-3 profile representation validation.

use lnsat_contracts::is_valid_reference_v1;
use lnsat_store::phase7_git_adapter_configuration_digest_v1;
use serde::de::Visitor;
use serde::{Deserialize, Deserializer, Serialize};
use sha2::{Digest, Sha256};
use std::fmt;
use zeroize::Zeroizing;

const MAX_PROFILE_BYTES: usize = 16 * 1024;
const MAX_REFERENCE_BYTES: usize = 256;
const MAX_CONTAINER_PATH_BYTES: usize = 256;
const MAX_ENDPOINT_PATH_BYTES: usize = 100;
const MAX_HOST_PATH_BYTES: usize = 4_096;
const PROFILE_DOMAIN: &[u8] = b"lnsat.hcfg_profile.v3";
const AUTHORITY_DOMAIN: &[u8] = b"lnsat.hcfg_profile_authority.v3";
const RESERVED_TARGET_ROOTS: [&str; 6] = [
    "/proc",
    "/dev",
    "/sys",
    "/etc/hosts",
    "/etc/hostname",
    "/etc/resolv.conf",
];

#[derive(Clone, Copy, Eq, PartialEq)]
enum ProfileError {
    InputTooLarge,
    JsonShape,
    Semantic,
    Canonical,
}

impl ProfileError {
    const fn code(self) -> &'static str {
        match self {
            Self::InputTooLarge => "headless_profile.input_too_large",
            Self::JsonShape => "headless_profile.json_shape",
            Self::Semantic => "headless_profile.semantic",
            Self::Canonical => "headless_profile.canonical",
        }
    }
}

// deserialize_any rejects serde's missing-field deserializer; an Option-based
// wrapper alone would silently accept omission as the allowed explicit null.
struct RequiredNullable(Option<Zeroizing<String>>);

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

impl<'de> Deserialize<'de> for RequiredNullable {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        deserializer.deserialize_any(RequiredNullableVisitor)
    }
}

struct RequiredNullableVisitor;

impl<'de> Visitor<'de> for RequiredNullableVisitor {
    type Value = RequiredNullable;

    fn expecting(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str("an explicit null or string")
    }

    fn visit_unit<E>(self) -> Result<Self::Value, E>
    where
        E: serde::de::Error,
    {
        Ok(RequiredNullable(None))
    }

    fn visit_none<E>(self) -> Result<Self::Value, E>
    where
        E: serde::de::Error,
    {
        self.visit_unit()
    }

    fn visit_some<D>(self, deserializer: D) -> Result<Self::Value, D::Error>
    where
        D: Deserializer<'de>,
    {
        Zeroizing::<String>::deserialize(deserializer).map(|value| RequiredNullable(Some(value)))
    }

    fn visit_str<E>(self, value: &str) -> Result<Self::Value, E>
    where
        E: serde::de::Error,
    {
        Ok(RequiredNullable(Some(Zeroizing::new(value.to_owned()))))
    }

    fn visit_string<E>(self, value: String) -> Result<Self::Value, E>
    where
        E: serde::de::Error,
    {
        Ok(RequiredNullable(Some(Zeroizing::new(value))))
    }
}

impl Serialize for RequiredNullable {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        self.0.serialize(serializer)
    }
}

#[derive(Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
struct ProfileDeclaration {
    #[serde(deserialize_with = "deserialize_object")]
    adapter: Adapter,
    adapter_executable_digest: Zeroizing<String>,
    audience: Zeroizing<String>,
    contract_id: Zeroizing<String>,
    contract_version: Zeroizing<String>,
    #[serde(deserialize_with = "deserialize_object")]
    engine: Engine,
    entrypoint: Zeroizing<String>,
    #[serde(deserialize_with = "deserialize_object")]
    filesystem: Filesystem,
    #[serde(deserialize_with = "deserialize_object")]
    headless: Headless,
    image_digest: Zeroizing<String>,
    #[serde(deserialize_with = "deserialize_object")]
    isolation: Isolation,
    #[serde(deserialize_with = "deserialize_object")]
    limits: Limits,
    profile_family: Zeroizing<String>,
    profile_id: Zeroizing<String>,
    schema_version: u32,
}

#[derive(Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
struct Adapter {
    #[serde(rename = "ref")]
    reference: Zeroizing<String>,
    version: Zeroizing<String>,
}

#[derive(Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
struct Engine {
    endpoint_path: Zeroizing<String>,
    implementation_manifest_digest: Zeroizing<String>,
    implementation_manifest_path: Zeroizing<String>,
    verifier_git_executable_digest: Zeroizing<String>,
    verifier_git_executable_path: Zeroizing<String>,
}

#[derive(Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
struct Filesystem {
    additional_mounts: bool,
    root_filesystem_read_only: bool,
    target_mount_mode: Zeroizing<String>,
    target_mount_path: Zeroizing<String>,
    workdir: Zeroizing<String>,
}

#[derive(Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
struct Headless {
    binding_digest: Zeroizing<String>,
    image_index_digest: RequiredNullable,
    image_manifest_digest: Zeroizing<String>,
    installation_ref: Zeroizing<String>,
    probe_entrypoint: Zeroizing<String>,
    probe_executable_digest: Zeroizing<String>,
    recipe_digest: Zeroizing<String>,
}

#[derive(Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
struct Isolation {
    #[serde(deserialize_with = "deserialize_object")]
    ambient: Ambient,
    #[serde(deserialize_with = "deserialize_object")]
    host_access: HostAccess,
    #[serde(deserialize_with = "deserialize_object")]
    host_namespaces: HostNamespaces,
    network: Zeroizing<String>,
    #[serde(deserialize_with = "deserialize_object")]
    privilege: Privilege,
    run_as_gid: u32,
    run_as_uid: u32,
    seccomp_profile: Zeroizing<String>,
}

#[derive(Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
struct Ambient {
    credentials: bool,
    environment: bool,
    shell: bool,
}

#[derive(Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
struct HostAccess {
    devices: bool,
    docker_socket_mount: bool,
}

#[derive(Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
struct HostNamespaces {
    ipc: bool,
    network: bool,
    pid: bool,
}

#[derive(Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
struct Privilege {
    capabilities_drop_all: bool,
    no_new_privileges: bool,
    privileged: bool,
}

#[derive(Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
struct Limits {
    cpu_millis: u32,
    memory_bytes: u64,
    pids: u32,
    stderr_bytes: u64,
    stdout_bytes: u64,
    wall_clock_seconds: u32,
}

// Neither this type nor the profile is exposed outside the private module.
struct UnverifiedProfile {
    canonical: Zeroizing<Vec<u8>>,
    authority_digest: [u8; 32],
    profile: ProfileDeclaration,
    profile_digest: [u8; 32],
}

fn parse_profile(bytes: &[u8]) -> Result<UnverifiedProfile, ProfileError> {
    let floor = phase7_git_adapter_configuration_digest_v1();
    parse_profile_with_floor(bytes, &floor)
}

fn parse_profile_with_floor(
    bytes: &[u8],
    floor: &[u8; 32],
) -> Result<UnverifiedProfile, ProfileError> {
    if bytes.len() > MAX_PROFILE_BYTES {
        return Err(ProfileError::InputTooLarge);
    }
    let mut deserializer = serde_json::Deserializer::from_slice(bytes);
    let profile: ProfileDeclaration =
        deserialize_object(&mut deserializer).map_err(|_| ProfileError::JsonShape)?;
    deserializer.end().map_err(|_| ProfileError::JsonShape)?;
    validate_profile(&profile)?;
    let canonical =
        Zeroizing::new(serde_json::to_vec(&profile).map_err(|_| ProfileError::Canonical)?);
    if canonical.len() > MAX_PROFILE_BYTES {
        return Err(ProfileError::Canonical);
    }
    let profile_digest = digest(PROFILE_DOMAIN, &canonical);
    let authority_digest = authority_digest(floor, &profile_digest, &profile)?;
    Ok(UnverifiedProfile {
        canonical,
        authority_digest,
        profile,
        profile_digest,
    })
}

fn validate_profile(profile: &ProfileDeclaration) -> Result<(), ProfileError> {
    if profile.contract_id.as_str() != "lnsat.runtime_profile.docker_local.v2"
        || profile.contract_version.as_str() != "lnsat.contracts.v1_0"
        || profile.schema_version != 3
        || profile.profile_id.as_str() != "runtime-profile:docker-local:git-reference"
        || profile.profile_family.as_str() != "docker_local"
        || profile.adapter.reference.as_str() != "adapter:docker-local:git-commit"
        || profile.adapter.version.as_str() != "v2"
        || profile.audience.as_str() != "audience:gateway:local"
        || !valid_digest(&profile.adapter_executable_digest)
        || !valid_digest(&profile.image_digest)
        || !valid_path(&profile.entrypoint, MAX_CONTAINER_PATH_BYTES)
        || !valid_filesystem(&profile.filesystem, &profile.entrypoint)
        || !valid_isolation(&profile.isolation)
        || !valid_limits(&profile.limits)
        || !valid_engine(&profile.engine)
        || !valid_headless(&profile.headless, &profile.entrypoint)
        || paths_overlap(
            profile.filesystem.target_mount_path.as_str(),
            profile.headless.probe_entrypoint.as_str(),
        )
    {
        return Err(ProfileError::Semantic);
    }
    Ok(())
}

fn valid_filesystem(value: &Filesystem, entrypoint: &str) -> bool {
    let target = value.target_mount_path.as_str();
    value.root_filesystem_read_only
        && !value.additional_mounts
        && value.target_mount_mode.as_str() == "read_write"
        && value.workdir.as_str() == target
        && valid_path(target, MAX_CONTAINER_PATH_BYTES)
        && !paths_overlap(target, entrypoint)
        && !RESERVED_TARGET_ROOTS
            .iter()
            .any(|reserved| paths_overlap(target, reserved))
}

fn valid_isolation(value: &Isolation) -> bool {
    value.network.as_str() == "none"
        && valid_non_root_id(value.run_as_uid)
        && valid_non_root_id(value.run_as_gid)
        && !value.privilege.privileged
        && value.privilege.no_new_privileges
        && value.privilege.capabilities_drop_all
        && !value.host_namespaces.pid
        && !value.host_namespaces.ipc
        && !value.host_namespaces.network
        && !value.host_access.docker_socket_mount
        && !value.host_access.devices
        && !value.ambient.environment
        && !value.ambient.credentials
        && !value.ambient.shell
        && value.seccomp_profile.as_str() == "runtime_default"
}

fn valid_limits(value: &Limits) -> bool {
    (16 * 1024 * 1024..=512 * 1024 * 1024).contains(&value.memory_bytes)
        && (1..=64).contains(&value.pids)
        && (1..=1_000).contains(&value.cpu_millis)
        && (1..=30).contains(&value.wall_clock_seconds)
        && (1..=1024 * 1024).contains(&value.stdout_bytes)
        && value.stderr_bytes == 0
}

fn valid_engine(value: &Engine) -> bool {
    valid_path(&value.endpoint_path, MAX_ENDPOINT_PATH_BYTES)
        && valid_path(&value.implementation_manifest_path, MAX_HOST_PATH_BYTES)
        && valid_digest(&value.implementation_manifest_digest)
        && valid_path(&value.verifier_git_executable_path, MAX_HOST_PATH_BYTES)
        && valid_digest(&value.verifier_git_executable_digest)
}

fn valid_headless(value: &Headless, entrypoint: &str) -> bool {
    value.installation_ref.starts_with("installation:")
        && is_valid_reference_v1(&value.installation_ref)
        && value.installation_ref.len() <= MAX_REFERENCE_BYTES
        && valid_digest(&value.binding_digest)
        && valid_digest(&value.recipe_digest)
        && valid_path(&value.probe_entrypoint, MAX_CONTAINER_PATH_BYTES)
        && value.probe_entrypoint.as_str() != entrypoint
        && valid_digest(&value.probe_executable_digest)
        && valid_digest(&value.image_manifest_digest)
        && match value.image_index_digest.0.as_ref() {
            None => true,
            Some(digest) => valid_digest(digest),
        }
}

fn valid_non_root_id(value: u32) -> bool {
    value != 0 && value != u32::MAX
}

fn valid_digest(value: &str) -> bool {
    let bytes = value.as_bytes();
    bytes.len() == 71
        && bytes.starts_with(b"sha256:")
        && bytes[7..]
            .iter()
            .all(|byte| byte.is_ascii_digit() || (b'a'..=b'f').contains(byte))
}

fn valid_path(value: &str, maximum: usize) -> bool {
    let bytes = value.as_bytes();
    bytes.len() <= maximum
        && bytes.starts_with(b"/")
        && bytes.len() > 1
        && !bytes.contains(&b'\\')
        && !bytes
            .iter()
            .any(|byte| *byte == 0 || byte.is_ascii_control())
        && value
            .split('/')
            .skip(1)
            .all(|component| !component.is_empty() && component != "." && component != "..")
}

fn paths_overlap(left: &str, right: &str) -> bool {
    left == right
        || left
            .strip_prefix(right)
            .is_some_and(|suffix| suffix.starts_with('/'))
        || right
            .strip_prefix(left)
            .is_some_and(|suffix| suffix.starts_with('/'))
}

fn authority_digest(
    floor: &[u8; 32],
    profile_digest: &[u8; 32],
    profile: &ProfileDeclaration,
) -> Result<[u8; 32], ProfileError> {
    let floor_text = digest_text(floor);
    let profile_text = digest_text(profile_digest);
    let values = (
        &floor_text,
        &profile_text,
        profile.headless.binding_digest.as_str(),
        profile.headless.recipe_digest.as_str(),
    );
    let canonical =
        Zeroizing::new(serde_json::to_vec(&values).map_err(|_| ProfileError::Canonical)?);
    Ok(digest(AUTHORITY_DOMAIN, &canonical))
}

fn digest(domain: &[u8], canonical: &[u8]) -> [u8; 32] {
    let mut hasher = Sha256::new();
    hasher.update(domain);
    hasher.update(b"\n");
    hasher.update(canonical);
    hasher.finalize().into()
}

fn digest_text(bytes: &[u8; 32]) -> Zeroizing<String> {
    const HEX: &[u8; 16] = b"0123456789abcdef";
    let mut output = String::with_capacity(71);
    output.push_str("sha256:");
    for byte in bytes {
        output.push(HEX[usize::from(byte >> 4)] as char);
        output.push(HEX[usize::from(byte & 0x0f)] as char);
    }
    Zeroizing::new(output)
}

#[cfg(test)]
#[path = "headless_profile_tests.rs"]
mod tests;
