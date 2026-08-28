//! Closed source-only runtime-profile contracts.
//!
//! P11-D1 defines and validates one `docker_local` profile without selecting a
//! Docker endpoint, opening a socket, starting a process, or granting execution
//! authority. The canonical profile digest is combined with the existing
//! bounded-adapter configuration digest and must match the already-approved
//! execution request before any later dispatcher may use the profile.

use lnsat_contracts::{
    CONTRACT_VERSION_V1_0, DerivedExecutionRequestV1, verify_derived_execution_request_v1,
};
use lnsat_store::phase7_git_adapter_configuration_digest_v1;
use serde::de::{MapAccess, SeqAccess, Visitor};
use serde::{Deserialize, Deserializer, Serialize};
use serde_json::{Map, Number, Value};
use sha2::{Digest, Sha256};
use std::cmp::Ordering;
use std::fmt;
use std::fs::{self, File, Metadata};
use std::io::Read;
use std::path::{Component, Path};

/// Exact closed contract identity for the first local Docker/OCI profile.
pub const DOCKER_LOCAL_PROFILE_CONTRACT_ID_V1: &str = "lnsat.runtime_profile.docker_local.v1";
/// Exact profile identity bound through approval and authorization evidence.
pub const DOCKER_LOCAL_PROFILE_ID_V1: &str = "runtime-profile:docker-local:git-reference";
/// Exact first runtime-profile family.
pub const DOCKER_LOCAL_PROFILE_FAMILY_V1: &str = "docker_local";
/// Exact future adapter identity selected by this profile.
pub const DOCKER_LOCAL_ADAPTER_REF_V1: &str = "adapter:docker-local:git-commit";
/// Exact future adapter contract version selected by this profile.
pub const DOCKER_LOCAL_ADAPTER_VERSION_V1: &str = "v1";
/// Exact Gateway audience for the local profile.
pub const DOCKER_LOCAL_AUDIENCE_V1: &str = "audience:gateway:local";
/// Maximum accepted UTF-8 profile bytes.
pub const MAX_DOCKER_LOCAL_PROFILE_BYTES_V1: usize = 16 * 1024;

const PROFILE_DIGEST_DOMAIN_V1: &[u8] = b"lnsat.docker-local-runtime-profile.v1";
const AUTHORITY_CONFIGURATION_DIGEST_DOMAIN_V1: &[u8] =
    b"lnsat.docker-local-authority-configuration.v1";
const MAX_CONTAINER_PATH_BYTES_V1: usize = 256;
const MIN_MEMORY_BYTES_V1: u64 = 16 * 1024 * 1024;
const MAX_MEMORY_BYTES_V1: u64 = 512 * 1024 * 1024;
const MAX_PIDS_V1: u32 = 64;
const MAX_CPU_MILLIS_V1: u32 = 1_000;
const MAX_WALL_CLOCK_SECONDS_V1: u32 = 30;
const MAX_STDOUT_BYTES_V1: u64 = 1024 * 1024;

/// Closed `docker_local` runtime profile.
#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct DockerLocalRuntimeProfileV1 {
    pub contract_id: String,
    pub contract_version: String,
    pub schema_version: u32,
    pub profile_id: String,
    pub profile_family: String,
    pub adapter: DockerLocalAdapterIdentityV1,
    pub audience: String,
    pub adapter_executable_digest: String,
    pub image_digest: String,
    pub entrypoint: String,
    pub filesystem: DockerLocalFilesystemV1,
    pub isolation: DockerLocalIsolationV1,
    pub limits: DockerLocalLimitsV1,
}

/// Exact adapter identity selected before approval.
#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct DockerLocalAdapterIdentityV1 {
    #[serde(rename = "ref")]
    pub adapter_ref: String,
    pub version: String,
}

/// Closed filesystem posture for one writable disposable target mount.
#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct DockerLocalFilesystemV1 {
    pub root_filesystem_read_only: bool,
    pub workdir: String,
    pub target_mount_path: String,
    pub target_mount_mode: String,
    pub additional_mounts: bool,
}

/// Closed least-privilege isolation posture.
#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct DockerLocalIsolationV1 {
    pub network: String,
    pub run_as_uid: u32,
    pub run_as_gid: u32,
    pub privilege: DockerLocalPrivilegeIsolationV1,
    pub host_namespaces: DockerLocalHostNamespacesV1,
    pub host_access: DockerLocalHostAccessV1,
    pub ambient: DockerLocalAmbientIsolationV1,
    pub seccomp_profile: String,
}

/// Closed process-privilege posture.
#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct DockerLocalPrivilegeIsolationV1 {
    pub privileged: bool,
    pub no_new_privileges: bool,
    pub capabilities_drop_all: bool,
}

/// Closed host-namespace posture.
#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct DockerLocalHostNamespacesV1 {
    pub pid: bool,
    pub ipc: bool,
    pub network: bool,
}

/// Closed host-resource posture.
#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct DockerLocalHostAccessV1 {
    pub docker_socket_mount: bool,
    pub devices: bool,
}

/// Closed ambient-input posture.
#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct DockerLocalAmbientIsolationV1 {
    pub environment: bool,
    pub credentials: bool,
    pub shell: bool,
}

/// Compiled safety ceilings; exact selected values remain digest-bound.
#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct DockerLocalLimitsV1 {
    pub memory_bytes: u64,
    pub pids: u32,
    pub cpu_millis: u32,
    pub wall_clock_seconds: u32,
    pub stdout_bytes: u64,
    pub stderr_bytes: u64,
}

/// Validated profile plus canonical and digest evidence.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct LoadedDockerLocalRuntimeProfileV1 {
    profile: DockerLocalRuntimeProfileV1,
    canonical_json: String,
    profile_digest: [u8; 32],
}

impl LoadedDockerLocalRuntimeProfileV1 {
    /// Returns validated closed profile.
    #[must_use]
    pub const fn profile(&self) -> &DockerLocalRuntimeProfileV1 {
        &self.profile
    }

    /// Returns deterministic canonical JSON used by the profile digest.
    #[must_use]
    pub fn canonical_json(&self) -> &str {
        &self.canonical_json
    }

    /// Returns domain-separated profile digest bytes.
    #[must_use]
    pub const fn profile_digest(&self) -> [u8; 32] {
        self.profile_digest
    }

    /// Returns stable prefixed profile digest text.
    #[must_use]
    pub fn profile_digest_text(&self) -> String {
        prefixed_sha256_v1(&self.profile_digest)
    }

    /// Combines this exact profile with one bounded-adapter configuration.
    #[must_use]
    pub fn authority_configuration_digest(&self) -> [u8; 32] {
        docker_local_authority_configuration_digest_v1(&self.profile_digest)
    }
}

/// Stable, secret-free profile/configuration failures.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum DockerLocalRuntimeProfileErrorV1 {
    PathInvalid,
    FileInvalid,
    FileTooLarge,
    ContractInvalid,
    CanonicalizationFailed,
    AuthorityBindingInvalid,
}

impl DockerLocalRuntimeProfileErrorV1 {
    #[must_use]
    pub const fn code(self) -> &'static str {
        match self {
            Self::PathInvalid => "docker_local_profile.path_invalid",
            Self::FileInvalid => "docker_local_profile.file_invalid",
            Self::FileTooLarge => "docker_local_profile.file_too_large",
            Self::ContractInvalid => "docker_local_profile.contract_invalid",
            Self::CanonicalizationFailed => "docker_local_profile.canonicalization_failed",
            Self::AuthorityBindingInvalid => "docker_local_profile.authority_binding_invalid",
        }
    }
}

impl fmt::Display for DockerLocalRuntimeProfileErrorV1 {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(self.code())
    }
}

impl std::error::Error for DockerLocalRuntimeProfileErrorV1 {}

/// Loads one explicit absolute, regular, non-symlinked profile file.
///
/// This function performs no endpoint discovery, environment lookup, socket
/// access, process launch, image inspection, or runtime mutation.
///
/// # Errors
///
/// Rejects relative, missing, symlinked, non-regular, changed-while-open,
/// oversized, malformed, duplicate-key, unknown-field, or unsafe input.
pub fn load_docker_local_runtime_profile_v1(
    path: impl AsRef<Path>,
) -> Result<LoadedDockerLocalRuntimeProfileV1, DockerLocalRuntimeProfileErrorV1> {
    let path = path.as_ref();
    if !path.is_absolute() {
        return Err(DockerLocalRuntimeProfileErrorV1::PathInvalid);
    }
    let before =
        fs::symlink_metadata(path).map_err(|_| DockerLocalRuntimeProfileErrorV1::FileInvalid)?;
    if before.file_type().is_symlink() || !before.is_file() {
        return Err(DockerLocalRuntimeProfileErrorV1::FileInvalid);
    }
    if before.len() > MAX_DOCKER_LOCAL_PROFILE_BYTES_V1 as u64 {
        return Err(DockerLocalRuntimeProfileErrorV1::FileTooLarge);
    }

    let mut file = File::open(path).map_err(|_| DockerLocalRuntimeProfileErrorV1::FileInvalid)?;
    let opened = file
        .metadata()
        .map_err(|_| DockerLocalRuntimeProfileErrorV1::FileInvalid)?;
    if !same_file_identity_v1(&before, &opened) {
        return Err(DockerLocalRuntimeProfileErrorV1::FileInvalid);
    }

    let mut bytes = Vec::new();
    file.by_ref()
        .take((MAX_DOCKER_LOCAL_PROFILE_BYTES_V1 + 1) as u64)
        .read_to_end(&mut bytes)
        .map_err(|_| DockerLocalRuntimeProfileErrorV1::FileInvalid)?;
    if bytes.len() > MAX_DOCKER_LOCAL_PROFILE_BYTES_V1 {
        return Err(DockerLocalRuntimeProfileErrorV1::FileTooLarge);
    }

    let handle_after = file
        .metadata()
        .map_err(|_| DockerLocalRuntimeProfileErrorV1::FileInvalid)?;
    let path_after =
        fs::symlink_metadata(path).map_err(|_| DockerLocalRuntimeProfileErrorV1::FileInvalid)?;
    if path_after.file_type().is_symlink()
        || !same_file_identity_v1(&opened, &handle_after)
        || !same_file_identity_v1(&handle_after, &path_after)
    {
        return Err(DockerLocalRuntimeProfileErrorV1::FileInvalid);
    }
    parse_docker_local_runtime_profile_v1(&bytes)
}

/// Parses and canonicalizes one closed profile byte sequence.
///
/// # Errors
///
/// Rejects oversized, non-UTF-8, malformed, duplicate-key, unknown-field,
/// wrong-identity, widened-isolation, unsafe-path, or out-of-limit input.
pub fn parse_docker_local_runtime_profile_v1(
    bytes: &[u8],
) -> Result<LoadedDockerLocalRuntimeProfileV1, DockerLocalRuntimeProfileErrorV1> {
    if bytes.len() > MAX_DOCKER_LOCAL_PROFILE_BYTES_V1 {
        return Err(DockerLocalRuntimeProfileErrorV1::FileTooLarge);
    }
    let text = std::str::from_utf8(bytes)
        .map_err(|_| DockerLocalRuntimeProfileErrorV1::ContractInvalid)?;
    let unique: UniqueJsonValueV1 = serde_json::from_str(text)
        .map_err(|_| DockerLocalRuntimeProfileErrorV1::ContractInvalid)?;
    let profile: DockerLocalRuntimeProfileV1 = serde_json::from_value(unique.0)
        .map_err(|_| DockerLocalRuntimeProfileErrorV1::ContractInvalid)?;
    validate_profile_v1(&profile)?;
    let value = serde_json::to_value(&profile)
        .map_err(|_| DockerLocalRuntimeProfileErrorV1::CanonicalizationFailed)?;
    let canonical_json = canonical_json_v1(&value)?;
    let profile_digest = digest_fields_v1(PROFILE_DIGEST_DOMAIN_V1, &[canonical_json.as_bytes()]);
    Ok(LoadedDockerLocalRuntimeProfileV1 {
        profile,
        canonical_json,
        profile_digest,
    })
}

/// Derives the configuration identity approved for one profile and adapter.
#[must_use]
pub fn docker_local_authority_configuration_digest_v1(profile_digest: &[u8; 32]) -> [u8; 32] {
    let adapter_configuration_digest = phase7_git_adapter_configuration_digest_v1();
    digest_fields_v1(
        AUTHORITY_CONFIGURATION_DIGEST_DOMAIN_V1,
        &[&adapter_configuration_digest, profile_digest],
    )
}

/// Validates exact loaded-profile binding against an approved execution request.
///
/// This validation is side-effect free. Success does not authorize, dispatch,
/// or imply availability of a Docker adapter.
///
/// # Errors
///
/// Rejects request-chain drift, profile drift, configuration-digest drift,
/// image/executable drift, adapter substitution, version drift, or audience
/// substitution.
pub fn validate_docker_local_authority_binding_v1(
    loaded: &LoadedDockerLocalRuntimeProfileV1,
    derived: &DerivedExecutionRequestV1,
) -> Result<[u8; 32], DockerLocalRuntimeProfileErrorV1> {
    verify_derived_execution_request_v1(derived)
        .map_err(|_| DockerLocalRuntimeProfileErrorV1::AuthorityBindingInvalid)?;
    validate_profile_v1(&loaded.profile)?;
    let expected_profile_digest = digest_fields_v1(
        PROFILE_DIGEST_DOMAIN_V1,
        &[loaded.canonical_json.as_bytes()],
    );
    let expected_configuration_digest =
        docker_local_authority_configuration_digest_v1(&expected_profile_digest);
    let adapter_executable_digest =
        decode_prefixed_sha256_v1(&loaded.profile.adapter_executable_digest)
            .ok_or(DockerLocalRuntimeProfileErrorV1::AuthorityBindingInvalid)?;
    if loaded.profile_digest != expected_profile_digest
        || derived.configuration_digest != expected_configuration_digest
        || derived.executable_digest != adapter_executable_digest
        || derived.request.adapter.adapter_ref != loaded.profile.adapter.adapter_ref
        || derived.request.adapter.version != loaded.profile.adapter.version
        || derived.request.audience != loaded.profile.audience
    {
        return Err(DockerLocalRuntimeProfileErrorV1::AuthorityBindingInvalid);
    }
    Ok(expected_configuration_digest)
}

fn validate_profile_v1(
    profile: &DockerLocalRuntimeProfileV1,
) -> Result<(), DockerLocalRuntimeProfileErrorV1> {
    if profile.contract_id != DOCKER_LOCAL_PROFILE_CONTRACT_ID_V1
        || profile.contract_version != CONTRACT_VERSION_V1_0
        || profile.schema_version != 1
        || profile.profile_id != DOCKER_LOCAL_PROFILE_ID_V1
        || profile.profile_family != DOCKER_LOCAL_PROFILE_FAMILY_V1
        || profile.adapter.adapter_ref != DOCKER_LOCAL_ADAPTER_REF_V1
        || profile.adapter.version != DOCKER_LOCAL_ADAPTER_VERSION_V1
        || profile.audience != DOCKER_LOCAL_AUDIENCE_V1
        || decode_prefixed_sha256_v1(&profile.adapter_executable_digest).is_none()
        || decode_prefixed_sha256_v1(&profile.image_digest).is_none()
        || !valid_container_path_v1(&profile.entrypoint)
        || !profile.filesystem.root_filesystem_read_only
        || !valid_container_path_v1(&profile.filesystem.workdir)
        || !valid_container_path_v1(&profile.filesystem.target_mount_path)
        || profile.filesystem.workdir == profile.filesystem.target_mount_path
        || Path::new(&profile.filesystem.target_mount_path)
            .strip_prefix(Path::new(&profile.filesystem.workdir))
            .is_err()
        || Path::new(&profile.entrypoint)
            .strip_prefix(Path::new(&profile.filesystem.target_mount_path))
            .is_ok()
        || profile.filesystem.target_mount_mode != "read_write"
        || profile.filesystem.additional_mounts
        || profile.isolation.network != "none"
        || profile.isolation.run_as_uid == 0
        || profile.isolation.run_as_gid == 0
        || profile.isolation.privilege.privileged
        || !profile.isolation.privilege.no_new_privileges
        || !profile.isolation.privilege.capabilities_drop_all
        || profile.isolation.host_access.docker_socket_mount
        || profile.isolation.host_namespaces.pid
        || profile.isolation.host_namespaces.ipc
        || profile.isolation.host_namespaces.network
        || profile.isolation.host_access.devices
        || profile.isolation.seccomp_profile != "runtime_default"
        || profile.isolation.ambient.environment
        || profile.isolation.ambient.credentials
        || profile.isolation.ambient.shell
        || !(MIN_MEMORY_BYTES_V1..=MAX_MEMORY_BYTES_V1).contains(&profile.limits.memory_bytes)
        || !(1..=MAX_PIDS_V1).contains(&profile.limits.pids)
        || !(1..=MAX_CPU_MILLIS_V1).contains(&profile.limits.cpu_millis)
        || !(1..=MAX_WALL_CLOCK_SECONDS_V1).contains(&profile.limits.wall_clock_seconds)
        || !(1..=MAX_STDOUT_BYTES_V1).contains(&profile.limits.stdout_bytes)
        || profile.limits.stderr_bytes != 0
    {
        return Err(DockerLocalRuntimeProfileErrorV1::ContractInvalid);
    }
    Ok(())
}

fn valid_container_path_v1(value: &str) -> bool {
    if value.is_empty()
        || value.len() > MAX_CONTAINER_PATH_BYTES_V1
        || value.as_bytes().contains(&0)
        || value.contains('\\')
        || value.contains("//")
        || (value.len() > 1 && value.ends_with('/'))
        || value
            .split('/')
            .skip(1)
            .any(|segment| segment == "." || segment == "..")
        || value.bytes().any(|byte| byte.is_ascii_control())
    {
        return false;
    }
    let path = Path::new(value);
    path.is_absolute()
        && path
            .components()
            .all(|component| matches!(component, Component::RootDir | Component::Normal(_)))
        && path.file_name().is_some()
}

fn decode_prefixed_sha256_v1(value: &str) -> Option<[u8; 32]> {
    let hex = value.strip_prefix("sha256:")?;
    if hex.len() != 64
        || !hex
            .bytes()
            .all(|byte| byte.is_ascii_digit() || (b'a'..=b'f').contains(&byte))
    {
        return None;
    }
    let mut output = [0_u8; 32];
    for (index, byte) in output.iter_mut().enumerate() {
        let start = index * 2;
        *byte = u8::from_str_radix(&hex[start..start + 2], 16).ok()?;
    }
    Some(output)
}

fn prefixed_sha256_v1(digest: &[u8; 32]) -> String {
    let mut output = String::with_capacity(71);
    output.push_str("sha256:");
    for byte in digest {
        use std::fmt::Write as _;
        let _ = write!(output, "{byte:02x}");
    }
    output
}

fn digest_fields_v1(domain: &[u8], fields: &[&[u8]]) -> [u8; 32] {
    let mut hasher = Sha256::new();
    hasher.update((domain.len() as u64).to_be_bytes());
    hasher.update(domain);
    for field in fields {
        hasher.update((field.len() as u64).to_be_bytes());
        hasher.update(field);
    }
    hasher.finalize().into()
}

fn same_file_identity_v1(left: &Metadata, right: &Metadata) -> bool {
    if !left.is_file() || !right.is_file() || left.len() != right.len() {
        return false;
    }
    #[cfg(unix)]
    {
        use std::os::unix::fs::MetadataExt;
        left.dev() == right.dev()
            && left.ino() == right.ino()
            && left.mtime() == right.mtime()
            && left.mtime_nsec() == right.mtime_nsec()
            && left.ctime() == right.ctime()
            && left.ctime_nsec() == right.ctime_nsec()
    }
    #[cfg(not(unix))]
    {
        left.modified().ok() == right.modified().ok() && left.created().ok() == right.created().ok()
    }
}

fn canonical_json_v1(value: &Value) -> Result<String, DockerLocalRuntimeProfileErrorV1> {
    let mut output = String::new();
    write_canonical_json_v1(value, &mut output)?;
    Ok(output)
}

fn write_canonical_json_v1(
    value: &Value,
    output: &mut String,
) -> Result<(), DockerLocalRuntimeProfileErrorV1> {
    match value {
        Value::Null => output.push_str("null"),
        Value::Bool(value) => output.push_str(if *value { "true" } else { "false" }),
        Value::Number(value) => {
            if !value.is_u64() && !value.is_i64() {
                return Err(DockerLocalRuntimeProfileErrorV1::CanonicalizationFailed);
            }
            output.push_str(&value.to_string());
        }
        Value::String(value) => output.push_str(
            &serde_json::to_string(value)
                .map_err(|_| DockerLocalRuntimeProfileErrorV1::CanonicalizationFailed)?,
        ),
        Value::Array(values) => {
            output.push('[');
            for (index, value) in values.iter().enumerate() {
                if index > 0 {
                    output.push(',');
                }
                write_canonical_json_v1(value, output)?;
            }
            output.push(']');
        }
        Value::Object(values) => {
            let mut entries: Vec<_> = values.iter().collect();
            entries.sort_by(|(left, _), (right, _)| utf16_cmp_v1(left, right));
            output.push('{');
            for (index, (key, value)) in entries.into_iter().enumerate() {
                if index > 0 {
                    output.push(',');
                }
                output.push_str(
                    &serde_json::to_string(key)
                        .map_err(|_| DockerLocalRuntimeProfileErrorV1::CanonicalizationFailed)?,
                );
                output.push(':');
                write_canonical_json_v1(value, output)?;
            }
            output.push('}');
        }
    }
    Ok(())
}

fn utf16_cmp_v1(left: &str, right: &str) -> Ordering {
    left.encode_utf16().cmp(right.encode_utf16())
}

struct UniqueJsonValueV1(Value);

impl<'de> Deserialize<'de> for UniqueJsonValueV1 {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        deserializer.deserialize_any(UniqueJsonVisitorV1)
    }
}

struct UniqueJsonVisitorV1;

impl<'de> Visitor<'de> for UniqueJsonVisitorV1 {
    type Value = UniqueJsonValueV1;

    fn expecting(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str("JSON without duplicate object keys")
    }

    fn visit_bool<E>(self, value: bool) -> Result<Self::Value, E> {
        Ok(UniqueJsonValueV1(Value::Bool(value)))
    }

    fn visit_i64<E>(self, value: i64) -> Result<Self::Value, E> {
        Ok(UniqueJsonValueV1(Value::Number(Number::from(value))))
    }

    fn visit_u64<E>(self, value: u64) -> Result<Self::Value, E> {
        Ok(UniqueJsonValueV1(Value::Number(Number::from(value))))
    }

    fn visit_f64<E>(self, _value: f64) -> Result<Self::Value, E>
    where
        E: serde::de::Error,
    {
        Err(E::custom("floating-point JSON is forbidden"))
    }

    fn visit_str<E>(self, value: &str) -> Result<Self::Value, E>
    where
        E: serde::de::Error,
    {
        Ok(UniqueJsonValueV1(Value::String(value.to_owned())))
    }

    fn visit_string<E>(self, value: String) -> Result<Self::Value, E> {
        Ok(UniqueJsonValueV1(Value::String(value)))
    }

    fn visit_none<E>(self) -> Result<Self::Value, E> {
        Ok(UniqueJsonValueV1(Value::Null))
    }

    fn visit_unit<E>(self) -> Result<Self::Value, E> {
        Ok(UniqueJsonValueV1(Value::Null))
    }

    fn visit_some<D>(self, deserializer: D) -> Result<Self::Value, D::Error>
    where
        D: Deserializer<'de>,
    {
        UniqueJsonValueV1::deserialize(deserializer)
    }

    fn visit_seq<A>(self, mut sequence: A) -> Result<Self::Value, A::Error>
    where
        A: SeqAccess<'de>,
    {
        let mut values = Vec::new();
        while let Some(value) = sequence.next_element::<UniqueJsonValueV1>()? {
            values.push(value.0);
        }
        Ok(UniqueJsonValueV1(Value::Array(values)))
    }

    fn visit_map<A>(self, mut map: A) -> Result<Self::Value, A::Error>
    where
        A: MapAccess<'de>,
    {
        let mut values = Map::new();
        while let Some((key, value)) = map.next_entry::<String, UniqueJsonValueV1>()? {
            if values.contains_key(&key) {
                return Err(serde::de::Error::custom("duplicate JSON key"));
            }
            values.insert(key, value.0);
        }
        Ok(UniqueJsonValueV1(Value::Object(values)))
    }
}
