//! Target-neutral explicit daemon configuration contract.
//!
//! This module reads only one operator-selected absolute path. It performs no
//! system/user path discovery, environment lookup, secret intake, migration,
//! listener creation, or service action.

use crate::runtime_profile::{
    DOCKER_LOCAL_PROFILE_FAMILY_V1, LoadedDockerLocalRuntimeProfileV1,
    load_docker_local_runtime_profile_v1,
};
use crate::{DEFAULT_LISTEN_ADDRESS_V1, DaemonConfigV1, DaemonErrorV1};
use serde::de::{MapAccess, SeqAccess, Visitor};
use serde::{Deserialize, Deserializer};
use serde_json::{Map, Number, Value};
use sha2::{Digest, Sha256};
use std::collections::BTreeMap;
use std::fmt;
use std::fs::{self, File, Metadata};
use std::io::Read;
use std::net::SocketAddr;
use std::path::{Path, PathBuf};

/// Stable explicit daemon-configuration contract identity.
pub const DAEMON_CONFIG_CONTRACT_ID_V1: &str = "lnsat.daemon.config.v1";

/// Stable shared contract-version identity.
pub const DAEMON_CONFIG_VERSION_V1: &str = "lnsat.contracts.v1_0";

/// Maximum bytes accepted from one explicit configuration file.
pub const MAX_DAEMON_CONFIG_BYTES_V1: usize = 64 * 1024;

const MAX_CONFIG_PATH_TEXT_BYTES_V1: usize = 4 * 1024;

/// Validated configuration plus public-safe exact-byte evidence.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct LoadedDaemonConfigV1 {
    config: DaemonConfigV1,
    config_digest: String,
}

impl LoadedDaemonConfigV1 {
    /// Returns validated daemon configuration.
    #[must_use]
    pub const fn config(&self) -> &DaemonConfigV1 {
        &self.config
    }

    /// Consumes evidence wrapper and returns validated daemon configuration.
    #[must_use]
    pub fn into_config(self) -> DaemonConfigV1 {
        self.config
    }

    /// Returns public-safe SHA-256 identity of exact accepted UTF-8 bytes.
    #[must_use]
    pub fn config_digest(&self) -> &str {
        &self.config_digest
    }

    /// Reports whether paired Phase 8 runtime seams were selected.
    #[must_use]
    pub fn phase8_runtime_configured(&self) -> bool {
        self.config.disposable_git_root().is_some()
    }

    /// Reports whether authenticated CLI Unix-socket transport was selected.
    #[must_use]
    pub fn control_socket_configured(&self) -> bool {
        self.config.control_socket_path().is_some()
    }

    /// Reports whether one exact console asset manifest was selected.
    #[must_use]
    pub fn console_manifest_configured(&self) -> bool {
        self.config.internal_console_root().is_some()
    }

    /// Reports whether one validated Docker-local runtime profile was selected.
    #[must_use]
    pub fn docker_local_runtime_profile_configured(&self) -> bool {
        self.config.docker_local_runtime_profile().is_some()
    }

    /// Returns validated Docker-local profile evidence without its source path.
    #[must_use]
    pub fn docker_local_runtime_profile(&self) -> Option<&LoadedDockerLocalRuntimeProfileV1> {
        self.config.docker_local_runtime_profile()
    }
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
struct DaemonConfigContractV1 {
    contract_id: String,
    contract_version: String,
    schema_version: u32,
    database_path: String,
    listen_address: Option<String>,
    control_socket_path: Option<String>,
    phase8_runtime: Option<Phase8RuntimeConfigV1>,
    runtime_profile: Option<RuntimeProfileConfigV1>,
    console: Option<ConsoleConfigV1>,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
struct Phase8RuntimeConfigV1 {
    disposable_git_root: String,
    git_executable: String,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
struct RuntimeProfileConfigV1 {
    profile_family: String,
    profile_path: String,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
struct ConsoleConfigV1 {
    root: String,
    asset_manifest: BTreeMap<String, String>,
}

/// Loads one explicit absolute, regular, non-symlinked UTF-8 JSON file.
///
/// The exact accepted bytes are bounded and hashed. Errors never include the
/// selected path or file content.
///
/// # Errors
///
/// Rejects relative, missing, symlinked, non-regular, oversized, non-UTF-8,
/// malformed, duplicate-key, unknown-field, wrong-version, or unsafe values.
pub fn load_daemon_config_v1(
    config_path: impl AsRef<Path>,
) -> Result<LoadedDaemonConfigV1, DaemonErrorV1> {
    let config_path = config_path.as_ref();
    if !config_path.is_absolute() {
        return Err(DaemonErrorV1::InvalidConfigPath);
    }

    let before = fs::symlink_metadata(config_path).map_err(|_| DaemonErrorV1::InvalidConfigFile)?;
    if before.file_type().is_symlink() || !before.is_file() {
        return Err(DaemonErrorV1::InvalidConfigFile);
    }
    if before.len() > MAX_DAEMON_CONFIG_BYTES_V1 as u64 {
        return Err(DaemonErrorV1::ConfigFileTooLarge);
    }

    let mut file = File::open(config_path).map_err(|_| DaemonErrorV1::InvalidConfigFile)?;
    let opened = file
        .metadata()
        .map_err(|_| DaemonErrorV1::InvalidConfigFile)?;
    if !same_file_identity_v1(&before, &opened) || opened.len() > MAX_DAEMON_CONFIG_BYTES_V1 as u64
    {
        return Err(if opened.len() > MAX_DAEMON_CONFIG_BYTES_V1 as u64 {
            DaemonErrorV1::ConfigFileTooLarge
        } else {
            DaemonErrorV1::InvalidConfigFile
        });
    }

    let mut bytes = Vec::new();
    file.by_ref()
        .take((MAX_DAEMON_CONFIG_BYTES_V1 + 1) as u64)
        .read_to_end(&mut bytes)
        .map_err(|_| DaemonErrorV1::InvalidConfigFile)?;
    if bytes.len() > MAX_DAEMON_CONFIG_BYTES_V1 {
        return Err(DaemonErrorV1::ConfigFileTooLarge);
    }

    let handle_after = file
        .metadata()
        .map_err(|_| DaemonErrorV1::InvalidConfigFile)?;
    let path_after =
        fs::symlink_metadata(config_path).map_err(|_| DaemonErrorV1::InvalidConfigFile)?;
    if path_after.file_type().is_symlink()
        || !same_file_identity_v1(&opened, &handle_after)
        || !same_file_identity_v1(&handle_after, &path_after)
    {
        return Err(DaemonErrorV1::InvalidConfigFile);
    }

    let text = std::str::from_utf8(&bytes).map_err(|_| DaemonErrorV1::InvalidConfigFile)?;
    let value: UniqueJsonValueV1 =
        serde_json::from_str(text).map_err(|_| DaemonErrorV1::InvalidConfigFile)?;
    let contract: DaemonConfigContractV1 =
        serde_json::from_value(value.0).map_err(|_| DaemonErrorV1::InvalidConfigFile)?;
    let config = contract.into_daemon_config()?;

    Ok(LoadedDaemonConfigV1 {
        config,
        config_digest: lowercase_sha256_v1(&bytes),
    })
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

impl DaemonConfigContractV1 {
    fn into_daemon_config(self) -> Result<DaemonConfigV1, DaemonErrorV1> {
        if self.contract_id != DAEMON_CONFIG_CONTRACT_ID_V1
            || self.contract_version != DAEMON_CONFIG_VERSION_V1
            || self.schema_version != 1
        {
            return Err(DaemonErrorV1::InvalidConfigFile);
        }

        let database_path = explicit_absolute_path_v1(&self.database_path)?;
        let listen_address = match self.listen_address {
            Some(value) => value
                .parse::<SocketAddr>()
                .map_err(|_| DaemonErrorV1::InvalidListenAddress)?,
            None => DEFAULT_LISTEN_ADDRESS_V1,
        };
        let mut config = DaemonConfigV1::new(database_path, listen_address)?;

        if let Some(control_socket_path) = self.control_socket_path {
            config = config
                .with_control_socket_path(explicit_absolute_path_v1(&control_socket_path)?)?;
        }

        if let Some(runtime) = self.phase8_runtime {
            config = config.with_phase8_runtime(
                explicit_absolute_path_v1(&runtime.disposable_git_root)?,
                explicit_absolute_path_v1(&runtime.git_executable)?,
            )?;
        }

        if let Some(runtime_profile) = self.runtime_profile {
            if runtime_profile.profile_family != DOCKER_LOCAL_PROFILE_FAMILY_V1 {
                return Err(DaemonErrorV1::InvalidConfigFile);
            }
            let profile_path = explicit_absolute_path_v1(&runtime_profile.profile_path)?;
            let loaded = load_docker_local_runtime_profile_v1(profile_path)
                .map_err(|_| DaemonErrorV1::InvalidConfigFile)?;
            config = config.with_docker_local_runtime_profile(loaded)?;
        }

        if let Some(console) = self.console {
            let root = explicit_absolute_path_v1(&console.root)?;
            let mut manifest = BTreeMap::new();
            for (request_path, relative_path) in console.asset_manifest {
                if request_path.len() > MAX_CONFIG_PATH_TEXT_BYTES_V1
                    || relative_path.len() > MAX_CONFIG_PATH_TEXT_BYTES_V1
                {
                    return Err(DaemonErrorV1::InvalidConsoleConfiguration);
                }
                manifest.insert(request_path, PathBuf::from(relative_path));
            }
            config = config.with_internal_console_root(root, manifest)?;
        }

        Ok(config)
    }
}

fn explicit_absolute_path_v1(value: &str) -> Result<PathBuf, DaemonErrorV1> {
    if value.is_empty()
        || value.len() > MAX_CONFIG_PATH_TEXT_BYTES_V1
        || value.as_bytes().contains(&0)
    {
        return Err(DaemonErrorV1::InvalidConfigFile);
    }
    let path = PathBuf::from(value);
    if !path.is_absolute() {
        return Err(DaemonErrorV1::InvalidConfigFile);
    }
    Ok(path)
}

fn lowercase_sha256_v1(bytes: &[u8]) -> String {
    let mut output = String::with_capacity(71);
    output.push_str("sha256:");
    for byte in Sha256::digest(bytes) {
        use std::fmt::Write as _;
        let _ = write!(output, "{byte:02x}");
    }
    output
}

/// Recursive JSON value that rejects duplicate keys before typed parsing.
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

    fn visit_f64<E>(self, value: f64) -> Result<Self::Value, E>
    where
        E: serde::de::Error,
    {
        Number::from_f64(value)
            .map(Value::Number)
            .map(UniqueJsonValueV1)
            .ok_or_else(|| E::custom("invalid JSON number"))
    }

    fn visit_str<E>(self, value: &str) -> Result<Self::Value, E> {
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

    fn visit_map<A>(self, mut object: A) -> Result<Self::Value, A::Error>
    where
        A: MapAccess<'de>,
    {
        let mut values = Map::new();
        while let Some(key) = object.next_key::<String>()? {
            if values.contains_key(&key) {
                return Err(serde::de::Error::custom("duplicate JSON key"));
            }
            let value = object.next_value::<UniqueJsonValueV1>()?;
            values.insert(key, value.0);
        }
        Ok(UniqueJsonValueV1(Value::Object(values)))
    }
}
