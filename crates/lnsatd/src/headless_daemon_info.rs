use serde::de::{self, MapAccess, SeqAccess, Visitor};
use serde::{Deserialize, Deserializer};
use std::fmt;
use std::net::IpAddr;
use zeroize::Zeroizing;

const MAX_BODY_BYTES: usize = 1_048_576;
const MAX_KEY_BYTES: usize = 256;
const MAX_VALUE_BYTES: usize = 4_096;
const MAX_FEATURE_BYTES: usize = 65_536;
const MAX_CONTAINER_DEPTH: usize = 32;
const MAX_OBJECT_MEMBERS: usize = 64;
const MAX_TOTAL_OBJECT_MEMBERS: usize = 4_096;
const MAX_ARRAY_ELEMENTS: usize = 128;
const MAX_SPECIAL_ARRAY_ELEMENTS: usize = 64;
const MAX_GO_INT: u32 = 2_147_483_647;

#[derive(Debug)]
enum InfoDecodeError {
    InputTooLarge,
    JsonSyntax,
    JsonLimits,
    JsonShape,
    Recipe,
}

impl InfoDecodeError {
    const fn code(&self) -> &'static str {
        match self {
            Self::InputTooLarge => "headless_info.input_too_large",
            Self::JsonSyntax => "headless_info.json_syntax",
            Self::JsonLimits => "headless_info.json_limits",
            Self::JsonShape => "headless_info.json_shape",
            Self::Recipe => "headless_info.recipe",
        }
    }
}

struct ContainerdClaim {
    address: Zeroizing<String>,
    containers_namespace: Zeroizing<String>,
    plugins_namespace: Zeroizing<String>,
}

enum NullableNames {
    Null,
    Values(Vec<Zeroizing<String>>),
}

enum EmptyEncoding {
    Null,
    Array,
}

struct PluginsClaim {
    volume: NullableNames,
    network: NullableNames,
    log: NullableNames,
    authorization: EmptyEncoding,
}

struct UnverifiedInfo {
    daemon_id: Zeroizing<String>,
    uname_architecture: Zeroizing<String>,
    kernel_version: Zeroizing<String>,
    operating_system: Zeroizing<String>,
    os_version: Zeroizing<String>,
    daemon_root: Zeroizing<String>,
    storage_driver: Zeroizing<String>,
    init_binary: Zeroizing<String>,
    containerd_commit: Zeroizing<String>,
    runc_commit: Zeroizing<String>,
    init_commit: Zeroizing<String>,
    containerd: ContainerdClaim,
    plugins: PluginsClaim,
    generic_resources: EmptyEncoding,
    firewall_driver: Option<Zeroizing<String>>,
    logical_cpus: u32,
    memory_bytes: u64,
    daemon_no_new_privileges: bool,
}

fn decode_info_claim(input: &[u8]) -> Result<UnverifiedInfo, InfoDecodeError> {
    if input.len() > MAX_BODY_BYTES {
        return Err(InfoDecodeError::InputTooLarge);
    }
    if std::str::from_utf8(input).is_err() {
        return Err(InfoDecodeError::JsonSyntax);
    }
    InfoPreflight::new(input)
        .scan_document()
        .map_err(ScanError::into_decode_error)?;
    let response: InfoResponse =
        serde_json::from_slice(input).map_err(|_| InfoDecodeError::JsonShape)?;
    validate_recipe(&response)?;
    Ok(project(response))
}

struct GoInt(u32);
struct MemoryBytes(u64);

impl<'de> Deserialize<'de> for GoInt {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        struct GoIntVisitor;
        impl Visitor<'_> for GoIntVisitor {
            type Value = GoInt;
            fn expecting(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
                f.write_str("a nonnegative Go int")
            }
            fn visit_u64<E>(self, value: u64) -> Result<Self::Value, E>
            where
                E: de::Error,
            {
                let value = u32::try_from(value).map_err(|_| E::custom("Go int range"))?;
                if value <= MAX_GO_INT {
                    Ok(GoInt(value))
                } else {
                    Err(E::custom("Go int range"))
                }
            }
        }
        deserializer.deserialize_u64(GoIntVisitor)
    }
}

impl<'de> Deserialize<'de> for MemoryBytes {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        struct MemoryVisitor;
        impl Visitor<'_> for MemoryVisitor {
            type Value = MemoryBytes;
            fn expecting(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
                f.write_str("a nonnegative signed 64-bit integer")
            }
            fn visit_u64<E>(self, value: u64) -> Result<Self::Value, E>
            where
                E: de::Error,
            {
                if i64::try_from(value).is_ok() {
                    Ok(MemoryBytes(value))
                } else {
                    Err(E::custom("memory range"))
                }
            }
        }
        deserializer.deserialize_u64(MemoryVisitor)
    }
}

struct PairRow(Vec<Zeroizing<String>>);
impl<'de> Deserialize<'de> for PairRow {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        struct PairVisitor;
        impl<'de> Visitor<'de> for PairVisitor {
            type Value = PairRow;
            fn expecting(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
                f.write_str("a two-string row")
            }
            fn visit_seq<A>(self, mut seq: A) -> Result<Self::Value, A::Error>
            where
                A: SeqAccess<'de>,
            {
                let mut values = Vec::with_capacity(2);
                while let Some(value) = seq.next_element::<Zeroizing<String>>()? {
                    if values.len() == 2 {
                        return Err(de::Error::custom("too many row values"));
                    }
                    values.push(value);
                }
                if values.len() != 2 {
                    return Err(de::Error::custom("wrong row length"));
                }
                Ok(PairRow(values))
            }
        }
        deserializer.deserialize_seq(PairVisitor)
    }
}

struct Nullable<T>(Option<T>);
impl<'de, T> Deserialize<'de> for Nullable<T>
where
    T: Deserialize<'de>,
{
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        Option::<T>::deserialize(deserializer).map(Nullable)
    }
}

struct StringList(Vec<Zeroizing<String>>);
impl<'de> Deserialize<'de> for StringList {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        struct StringListVisitor;
        impl<'de> Visitor<'de> for StringListVisitor {
            type Value = StringList;
            fn expecting(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
                f.write_str("a string array")
            }
            fn visit_seq<A>(self, mut seq: A) -> Result<Self::Value, A::Error>
            where
                A: SeqAccess<'de>,
            {
                let mut values = Vec::new();
                while let Some(value) = seq.next_element::<Zeroizing<String>>()? {
                    values.push(value);
                }
                Ok(StringList(values))
            }
        }
        deserializer.deserialize_seq(StringListVisitor)
    }
}

struct EmptyArray;
impl<'de> Deserialize<'de> for EmptyArray {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        struct EmptyArrayVisitor;
        impl<'de> Visitor<'de> for EmptyArrayVisitor {
            type Value = EmptyArray;
            fn expecting(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
                f.write_str("an empty array")
            }
            fn visit_seq<A>(self, mut seq: A) -> Result<Self::Value, A::Error>
            where
                A: SeqAccess<'de>,
            {
                if seq.next_element::<u8>()?.is_some() {
                    return Err(de::Error::custom("nonempty array"));
                }
                Ok(EmptyArray)
            }
        }
        deserializer.deserialize_seq(EmptyArrayVisitor)
    }
}

struct Plugins {
    volume: Nullable<StringList>,
    network: Nullable<StringList>,
    authorization: Nullable<StringList>,
    log: Nullable<StringList>,
}

impl<'de> Deserialize<'de> for Plugins {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        struct PluginsVisitor;
        impl<'de> Visitor<'de> for PluginsVisitor {
            type Value = Plugins;
            fn expecting(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
                f.write_str("a Plugins object")
            }
            fn visit_map<A>(self, mut map: A) -> Result<Self::Value, A::Error>
            where
                A: MapAccess<'de>,
            {
                let mut volume = None;
                let mut network = None;
                let mut authorization = None;
                let mut log = None;
                while let Some(key) = map.next_key::<Zeroizing<String>>()? {
                    match key.as_str() {
                        "Volume" => {
                            if volume.is_some() {
                                return Err(de::Error::duplicate_field("Volume"));
                            }
                            volume = Some(map.next_value()?);
                        }
                        "Network" => {
                            if network.is_some() {
                                return Err(de::Error::duplicate_field("Network"));
                            }
                            network = Some(map.next_value()?);
                        }
                        "Authorization" => {
                            if authorization.is_some() {
                                return Err(de::Error::duplicate_field("Authorization"));
                            }
                            authorization = Some(map.next_value()?);
                        }
                        "Log" => {
                            if log.is_some() {
                                return Err(de::Error::duplicate_field("Log"));
                            }
                            log = Some(map.next_value()?);
                        }
                        _ => return Err(de::Error::custom("unknown Plugins member")),
                    }
                }
                Ok(Plugins {
                    volume: volume.ok_or_else(|| de::Error::missing_field("Volume"))?,
                    network: network.ok_or_else(|| de::Error::missing_field("Network"))?,
                    authorization: authorization
                        .ok_or_else(|| de::Error::missing_field("Authorization"))?,
                    log: log.ok_or_else(|| de::Error::missing_field("Log"))?,
                })
            }
        }
        deserializer.deserialize_map(PluginsVisitor)
    }
}

struct Runtime {
    path: Zeroizing<String>,
    status: Option<RuntimeStatus>,
}
struct RuntimeStatus {
    features: Option<Zeroizing<String>>,
}
impl<'de> Deserialize<'de> for Runtime {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        struct RuntimeVisitor;
        impl<'de> Visitor<'de> for RuntimeVisitor {
            type Value = Runtime;
            fn expecting(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
                f.write_str("a runtime object")
            }
            fn visit_map<A>(self, mut map: A) -> Result<Self::Value, A::Error>
            where
                A: MapAccess<'de>,
            {
                let mut path = None;
                let mut status = None;
                while let Some(key) = map.next_key::<Zeroizing<String>>()? {
                    match key.as_str() {
                        "path" => {
                            if path.is_some() {
                                return Err(de::Error::duplicate_field("path"));
                            }
                            path = Some(map.next_value()?);
                        }
                        "status" => {
                            if status.is_some() {
                                return Err(de::Error::duplicate_field("status"));
                            }
                            status = Some(map.next_value::<RuntimeStatus>()?);
                        }
                        _ => return Err(de::Error::custom("unknown runtime member")),
                    }
                }
                Ok(Runtime {
                    path: path.ok_or_else(|| de::Error::missing_field("path"))?,
                    status,
                })
            }
        }
        deserializer.deserialize_map(RuntimeVisitor)
    }
}
impl<'de> Deserialize<'de> for RuntimeStatus {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        struct RuntimeStatusVisitor;
        impl<'de> Visitor<'de> for RuntimeStatusVisitor {
            type Value = RuntimeStatus;
            fn expecting(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
                f.write_str("a runtime status object")
            }
            fn visit_map<A>(self, mut map: A) -> Result<Self::Value, A::Error>
            where
                A: MapAccess<'de>,
            {
                let mut features = None;
                while let Some(key) = map.next_key::<Zeroizing<String>>()? {
                    if key.as_str() != "org.opencontainers.runtime-spec.features" {
                        return Err(de::Error::custom("unknown runtime status member"));
                    }
                    if features.is_some() {
                        return Err(de::Error::duplicate_field(
                            "org.opencontainers.runtime-spec.features",
                        ));
                    }
                    features = Some(map.next_value()?);
                }
                Ok(RuntimeStatus { features })
            }
        }
        deserializer.deserialize_map(RuntimeStatusVisitor)
    }
}
struct Runtimes {
    runc: Runtime,
    containerd_runc: Runtime,
}
impl<'de> Deserialize<'de> for Runtimes {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        struct RuntimesVisitor;
        impl<'de> Visitor<'de> for RuntimesVisitor {
            type Value = Runtimes;
            fn expecting(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
                f.write_str("a Runtimes object")
            }
            fn visit_map<A>(self, mut map: A) -> Result<Self::Value, A::Error>
            where
                A: MapAccess<'de>,
            {
                let mut runc = None;
                let mut containerd_runc = None;
                while let Some(key) = map.next_key::<Zeroizing<String>>()? {
                    match key.as_str() {
                        "runc" => {
                            if runc.is_some() {
                                return Err(de::Error::duplicate_field("runc"));
                            }
                            runc = Some(map.next_value()?);
                        }
                        "io.containerd.runc.v2" => {
                            if containerd_runc.is_some() {
                                return Err(de::Error::duplicate_field("io.containerd.runc.v2"));
                            }
                            containerd_runc = Some(map.next_value()?);
                        }
                        _ => return Err(de::Error::custom("unknown runtime name")),
                    }
                }
                Ok(Runtimes {
                    runc: runc.ok_or_else(|| de::Error::missing_field("runc"))?,
                    containerd_runc: containerd_runc
                        .ok_or_else(|| de::Error::missing_field("io.containerd.runc.v2"))?,
                })
            }
        }
        deserializer.deserialize_map(RuntimesVisitor)
    }
}

struct Commit {
    id: Zeroizing<String>,
}
impl<'de> Deserialize<'de> for Commit {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        struct CommitVisitor;
        impl<'de> Visitor<'de> for CommitVisitor {
            type Value = Commit;
            fn expecting(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
                f.write_str("a commit object")
            }
            fn visit_map<A>(self, mut map: A) -> Result<Self::Value, A::Error>
            where
                A: MapAccess<'de>,
            {
                let mut id = None;
                while let Some(key) = map.next_key::<Zeroizing<String>>()? {
                    if key.as_str() != "ID" {
                        return Err(de::Error::custom("unknown commit member"));
                    }
                    if id.is_some() {
                        return Err(de::Error::duplicate_field("ID"));
                    }
                    id = Some(map.next_value()?);
                }
                Ok(Commit {
                    id: id.ok_or_else(|| de::Error::missing_field("ID"))?,
                })
            }
        }
        deserializer.deserialize_map(CommitVisitor)
    }
}

struct Containerd {
    address: Zeroizing<String>,
    namespaces: Namespaces,
}
struct Namespaces {
    containers: Zeroizing<String>,
    plugins: Zeroizing<String>,
}
impl<'de> Deserialize<'de> for Containerd {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        struct ContainerdVisitor;
        impl<'de> Visitor<'de> for ContainerdVisitor {
            type Value = Containerd;
            fn expecting(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
                f.write_str("a Containerd object")
            }
            fn visit_map<A>(self, mut map: A) -> Result<Self::Value, A::Error>
            where
                A: MapAccess<'de>,
            {
                let mut address = None;
                let mut namespaces = None;
                while let Some(key) = map.next_key::<Zeroizing<String>>()? {
                    match key.as_str() {
                        "Address" => {
                            if address.is_some() {
                                return Err(de::Error::duplicate_field("Address"));
                            }
                            address = Some(map.next_value()?);
                        }
                        "Namespaces" => {
                            if namespaces.is_some() {
                                return Err(de::Error::duplicate_field("Namespaces"));
                            }
                            namespaces = Some(map.next_value()?);
                        }
                        _ => return Err(de::Error::custom("unknown Containerd member")),
                    }
                }
                Ok(Containerd {
                    address: address.ok_or_else(|| de::Error::missing_field("Address"))?,
                    namespaces: namespaces.ok_or_else(|| de::Error::missing_field("Namespaces"))?,
                })
            }
        }
        deserializer.deserialize_map(ContainerdVisitor)
    }
}
impl<'de> Deserialize<'de> for Namespaces {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        struct NamespacesVisitor;
        impl<'de> Visitor<'de> for NamespacesVisitor {
            type Value = Namespaces;
            fn expecting(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
                f.write_str("a Namespaces object")
            }
            fn visit_map<A>(self, mut map: A) -> Result<Self::Value, A::Error>
            where
                A: MapAccess<'de>,
            {
                let mut containers = None;
                let mut plugins = None;
                while let Some(key) = map.next_key::<Zeroizing<String>>()? {
                    match key.as_str() {
                        "Containers" => {
                            if containers.is_some() {
                                return Err(de::Error::duplicate_field("Containers"));
                            }
                            containers = Some(map.next_value()?);
                        }
                        "Plugins" => {
                            if plugins.is_some() {
                                return Err(de::Error::duplicate_field("Plugins"));
                            }
                            plugins = Some(map.next_value()?);
                        }
                        _ => return Err(de::Error::custom("unknown Namespaces member")),
                    }
                }
                Ok(Namespaces {
                    containers: containers.ok_or_else(|| de::Error::missing_field("Containers"))?,
                    plugins: plugins.ok_or_else(|| de::Error::missing_field("Plugins"))?,
                })
            }
        }
        deserializer.deserialize_map(NamespacesVisitor)
    }
}

struct NullOnly;
impl<'de> Deserialize<'de> for NullOnly {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        struct NullOnlyVisitor;
        impl Visitor<'_> for NullOnlyVisitor {
            type Value = NullOnly;
            fn expecting(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
                f.write_str("null")
            }
            fn visit_unit<E>(self) -> Result<Self::Value, E>
            where
                E: de::Error,
            {
                Ok(NullOnly)
            }
        }
        deserializer.deserialize_unit(NullOnlyVisitor)
    }
}

struct Swarm {
    node_id: Zeroizing<String>,
    node_addr: Zeroizing<String>,
    local_node_state: Zeroizing<String>,
    control_available: bool,
    error: Zeroizing<String>,
    remote_managers: NullOnly,
}
impl<'de> Deserialize<'de> for Swarm {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        struct SwarmVisitor;
        impl<'de> Visitor<'de> for SwarmVisitor {
            type Value = Swarm;
            fn expecting(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
                f.write_str("a Swarm object")
            }
            fn visit_map<A>(self, mut map: A) -> Result<Self::Value, A::Error>
            where
                A: MapAccess<'de>,
            {
                let mut node_id = None;
                let mut node_addr = None;
                let mut local_node_state = None;
                let mut control_available = None;
                let mut error = None;
                let mut remote_managers = None;
                while let Some(key) = map.next_key::<Zeroizing<String>>()? {
                    match key.as_str() {
                        "NodeID" => {
                            if node_id.is_some() {
                                return Err(de::Error::duplicate_field("NodeID"));
                            }
                            node_id = Some(map.next_value()?);
                        }
                        "NodeAddr" => {
                            if node_addr.is_some() {
                                return Err(de::Error::duplicate_field("NodeAddr"));
                            }
                            node_addr = Some(map.next_value()?);
                        }
                        "LocalNodeState" => {
                            if local_node_state.is_some() {
                                return Err(de::Error::duplicate_field("LocalNodeState"));
                            }
                            local_node_state = Some(map.next_value()?);
                        }
                        "ControlAvailable" => {
                            if control_available.is_some() {
                                return Err(de::Error::duplicate_field("ControlAvailable"));
                            }
                            control_available = Some(map.next_value()?);
                        }
                        "Error" => {
                            if error.is_some() {
                                return Err(de::Error::duplicate_field("Error"));
                            }
                            error = Some(map.next_value()?);
                        }
                        "RemoteManagers" => {
                            if remote_managers.is_some() {
                                return Err(de::Error::duplicate_field("RemoteManagers"));
                            }
                            remote_managers = Some(map.next_value()?);
                        }
                        _ => return Err(de::Error::custom("unknown Swarm member")),
                    }
                }
                Ok(Swarm {
                    node_id: node_id.ok_or_else(|| de::Error::missing_field("NodeID"))?,
                    node_addr: node_addr.ok_or_else(|| de::Error::missing_field("NodeAddr"))?,
                    local_node_state: local_node_state
                        .ok_or_else(|| de::Error::missing_field("LocalNodeState"))?,
                    control_available: control_available
                        .ok_or_else(|| de::Error::missing_field("ControlAvailable"))?,
                    error: error.ok_or_else(|| de::Error::missing_field("Error"))?,
                    remote_managers: remote_managers
                        .ok_or_else(|| de::Error::missing_field("RemoteManagers"))?,
                })
            }
        }
        deserializer.deserialize_map(SwarmVisitor)
    }
}

struct RegistryConfig {
    cidrs: Nullable<StringList>,
    index_configs: Nullable<IndexConfigs>,
    mirrors: Nullable<StringList>,
}
struct IndexConfigs;
struct IndexInfo {
    name: Zeroizing<String>,
    mirrors: Nullable<StringList>,
    secure: bool,
    official: bool,
}
impl<'de> Deserialize<'de> for RegistryConfig {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        struct RegistryVisitor;
        impl<'de> Visitor<'de> for RegistryVisitor {
            type Value = RegistryConfig;
            fn expecting(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
                f.write_str("a RegistryConfig object")
            }
            fn visit_map<A>(self, mut map: A) -> Result<Self::Value, A::Error>
            where
                A: MapAccess<'de>,
            {
                let mut cidrs = None;
                let mut index_configs = None;
                let mut mirrors = None;
                while let Some(key) = map.next_key::<Zeroizing<String>>()? {
                    match key.as_str() {
                        "InsecureRegistryCIDRs" => {
                            if cidrs.is_some() {
                                return Err(de::Error::duplicate_field("InsecureRegistryCIDRs"));
                            }
                            cidrs = Some(map.next_value()?);
                        }
                        "IndexConfigs" => {
                            if index_configs.is_some() {
                                return Err(de::Error::duplicate_field("IndexConfigs"));
                            }
                            index_configs = Some(map.next_value()?);
                        }
                        "Mirrors" => {
                            if mirrors.is_some() {
                                return Err(de::Error::duplicate_field("Mirrors"));
                            }
                            mirrors = Some(map.next_value()?);
                        }
                        _ => return Err(de::Error::custom("unknown RegistryConfig member")),
                    }
                }
                Ok(RegistryConfig {
                    cidrs: cidrs
                        .ok_or_else(|| de::Error::missing_field("InsecureRegistryCIDRs"))?,
                    index_configs: index_configs
                        .ok_or_else(|| de::Error::missing_field("IndexConfigs"))?,
                    mirrors: mirrors.ok_or_else(|| de::Error::missing_field("Mirrors"))?,
                })
            }
        }
        deserializer.deserialize_map(RegistryVisitor)
    }
}
impl<'de> Deserialize<'de> for IndexConfigs {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        struct IndexConfigsVisitor;
        impl<'de> Visitor<'de> for IndexConfigsVisitor {
            type Value = IndexConfigs;
            fn expecting(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
                f.write_str("an IndexConfigs map")
            }
            fn visit_map<A>(self, mut map: A) -> Result<Self::Value, A::Error>
            where
                A: MapAccess<'de>,
            {
                let mut keys = Vec::new();
                while let Some(key) = map.next_key::<Zeroizing<String>>()? {
                    if keys.len() == MAX_SPECIAL_ARRAY_ELEMENTS {
                        return Err(de::Error::custom("too many IndexConfigs"));
                    }
                    if key.is_empty() {
                        return Err(de::Error::custom("empty registry key"));
                    }
                    if keys
                        .iter()
                        .any(|existing: &Zeroizing<String>| existing.as_str() == key.as_str())
                    {
                        return Err(de::Error::custom("duplicate registry key"));
                    }
                    let _: IndexInfo = map.next_value()?;
                    keys.push(key);
                }
                Ok(IndexConfigs)
            }
        }
        deserializer.deserialize_map(IndexConfigsVisitor)
    }
}
impl<'de> Deserialize<'de> for IndexInfo {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        struct IndexInfoVisitor;
        impl<'de> Visitor<'de> for IndexInfoVisitor {
            type Value = IndexInfo;
            fn expecting(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
                f.write_str("an IndexInfo object")
            }
            fn visit_map<A>(self, mut map: A) -> Result<Self::Value, A::Error>
            where
                A: MapAccess<'de>,
            {
                let mut name = None;
                let mut mirrors = None;
                let mut secure = None;
                let mut official = None;
                while let Some(key) = map.next_key::<Zeroizing<String>>()? {
                    match key.as_str() {
                        "Name" => {
                            if name.is_some() {
                                return Err(de::Error::duplicate_field("Name"));
                            }
                            name = Some(map.next_value()?);
                        }
                        "Mirrors" => {
                            if mirrors.is_some() {
                                return Err(de::Error::duplicate_field("Mirrors"));
                            }
                            mirrors = Some(map.next_value()?);
                        }
                        "Secure" => {
                            if secure.is_some() {
                                return Err(de::Error::duplicate_field("Secure"));
                            }
                            secure = Some(map.next_value()?);
                        }
                        "Official" => {
                            if official.is_some() {
                                return Err(de::Error::duplicate_field("Official"));
                            }
                            official = Some(map.next_value()?);
                        }
                        _ => return Err(de::Error::custom("unknown IndexInfo member")),
                    }
                }
                Ok(IndexInfo {
                    name: name.ok_or_else(|| de::Error::missing_field("Name"))?,
                    mirrors: mirrors.ok_or_else(|| de::Error::missing_field("Mirrors"))?,
                    secure: secure.ok_or_else(|| de::Error::missing_field("Secure"))?,
                    official: official.ok_or_else(|| de::Error::missing_field("Official"))?,
                })
            }
        }
        deserializer.deserialize_map(IndexInfoVisitor)
    }
}

struct Firewall {
    driver: Zeroizing<String>,
    info: Option<Vec<PairRow>>,
}
impl<'de> Deserialize<'de> for Firewall {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        struct FirewallVisitor;
        impl<'de> Visitor<'de> for FirewallVisitor {
            type Value = Firewall;
            fn expecting(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
                f.write_str("a FirewallBackend object")
            }
            fn visit_map<A>(self, mut map: A) -> Result<Self::Value, A::Error>
            where
                A: MapAccess<'de>,
            {
                let mut driver = None;
                let mut info = None;
                while let Some(key) = map.next_key::<Zeroizing<String>>()? {
                    match key.as_str() {
                        "Driver" => {
                            if driver.is_some() {
                                return Err(de::Error::duplicate_field("Driver"));
                            }
                            driver = Some(map.next_value()?);
                        }
                        "Info" => {
                            if info.is_some() {
                                return Err(de::Error::duplicate_field("Info"));
                            }
                            info = Some(map.next_value::<Vec<PairRow>>()?);
                        }
                        _ => return Err(de::Error::custom("unknown FirewallBackend member")),
                    }
                }
                Ok(Firewall {
                    driver: driver.ok_or_else(|| de::Error::missing_field("Driver"))?,
                    info,
                })
            }
        }
        deserializer.deserialize_map(FirewallVisitor)
    }
}

struct AddressPool {
    base: Zeroizing<String>,
    size: GoInt,
}
impl<'de> Deserialize<'de> for AddressPool {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        struct PoolVisitor;
        impl<'de> Visitor<'de> for PoolVisitor {
            type Value = AddressPool;
            fn expecting(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
                f.write_str("an address pool object")
            }
            fn visit_map<A>(self, mut map: A) -> Result<Self::Value, A::Error>
            where
                A: MapAccess<'de>,
            {
                let mut base = None;
                let mut size = None;
                while let Some(key) = map.next_key::<Zeroizing<String>>()? {
                    match key.as_str() {
                        "Base" => {
                            if base.is_some() {
                                return Err(de::Error::duplicate_field("Base"));
                            }
                            base = Some(map.next_value()?);
                        }
                        "Size" => {
                            if size.is_some() {
                                return Err(de::Error::duplicate_field("Size"));
                            }
                            size = Some(map.next_value()?);
                        }
                        _ => return Err(de::Error::custom("unknown address pool member")),
                    }
                }
                Ok(AddressPool {
                    base: base.ok_or_else(|| de::Error::missing_field("Base"))?,
                    size: size.ok_or_else(|| de::Error::missing_field("Size"))?,
                })
            }
        }
        deserializer.deserialize_map(PoolVisitor)
    }
}

#[allow(
    clippy::struct_excessive_bools,
    reason = "The closed wire record preserves separately named JSON Boolean members for recipe checks"
)]
struct InfoResponse {
    id: Zeroizing<String>,
    containers: GoInt,
    containers_running: GoInt,
    containers_paused: GoInt,
    containers_stopped: GoInt,
    images: GoInt,
    driver: Zeroizing<String>,
    driver_status: Nullable<Vec<PairRow>>,
    plugins: Plugins,
    memory_limit: bool,
    swap_limit: bool,
    cpu_cfs_period: bool,
    cpu_cfs_quota: bool,
    cpu_shares: bool,
    cpu_set: bool,
    pids_limit: bool,
    ipv4_forwarding: bool,
    debug: bool,
    nfd: GoInt,
    oom_kill_disable: bool,
    ngoroutines: GoInt,
    system_time: Zeroizing<String>,
    logging_driver: Zeroizing<String>,
    cgroup_driver: Zeroizing<String>,
    cgroup_version: Zeroizing<String>,
    nevents_listener: GoInt,
    kernel_version: Zeroizing<String>,
    operating_system: Zeroizing<String>,
    os_version: Zeroizing<String>,
    os_type: Zeroizing<String>,
    architecture: Zeroizing<String>,
    index_server_address: Zeroizing<String>,
    registry_config: RegistryConfig,
    ncpu: GoInt,
    mem_total: MemoryBytes,
    generic_resources: Nullable<EmptyArray>,
    docker_root_dir: Zeroizing<String>,
    http_proxy: Zeroizing<String>,
    https_proxy: Zeroizing<String>,
    no_proxy: Zeroizing<String>,
    name: Zeroizing<String>,
    labels: Nullable<StringList>,
    experimental_build: bool,
    server_version: Zeroizing<String>,
    runtimes: Runtimes,
    default_runtime: Zeroizing<String>,
    swarm: Swarm,
    live_restore_enabled: bool,
    isolation: Zeroizing<String>,
    init_binary: Zeroizing<String>,
    containerd_commit: Commit,
    runc_commit: Commit,
    init_commit: Commit,
    security_options: Vec<Zeroizing<String>>,
    product_license: Option<Zeroizing<String>>,
    default_address_pools: Option<Vec<AddressPool>>,
    firewall_backend: Option<Firewall>,
    cdi_spec_dirs: StringList,
    containerd: Containerd,
    warnings: Nullable<StringList>,
}

impl<'de> Deserialize<'de> for InfoResponse {
    #[allow(
        clippy::too_many_lines,
        reason = "Closed root map retains exact field ownership and presence rules"
    )]
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        struct InfoVisitor;
        impl<'de> Visitor<'de> for InfoVisitor {
            type Value = InfoResponse;
            fn expecting(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
                f.write_str("an Info response object")
            }
            fn visit_map<A>(self, mut map: A) -> Result<Self::Value, A::Error>
            where
                A: MapAccess<'de>,
            {
                let mut id = None;
                let mut containers = None;
                let mut containers_running = None;
                let mut containers_paused = None;
                let mut containers_stopped = None;
                let mut images = None;
                let mut driver = None;
                let mut driver_status = None;
                let mut plugins = None;
                let mut memory_limit = None;
                let mut swap_limit = None;
                let mut cpu_cfs_period = None;
                let mut cpu_cfs_quota = None;
                let mut cpu_shares = None;
                let mut cpu_set = None;
                let mut pids_limit = None;
                let mut ipv4_forwarding = None;
                let mut debug = None;
                let mut nfd = None;
                let mut oom_kill_disable = None;
                let mut ngoroutines = None;
                let mut system_time = None;
                let mut logging_driver = None;
                let mut cgroup_driver = None;
                let mut cgroup_version = None;
                let mut nevents_listener = None;
                let mut kernel_version = None;
                let mut operating_system = None;
                let mut os_version = None;
                let mut os_type = None;
                let mut architecture = None;
                let mut index_server_address = None;
                let mut registry_config = None;
                let mut ncpu = None;
                let mut mem_total = None;
                let mut generic_resources = None;
                let mut docker_root_dir = None;
                let mut http_proxy_claim = None;
                let mut secure_proxy_claim = None;
                let mut no_proxy = None;
                let mut name = None;
                let mut labels = None;
                let mut experimental_build = None;
                let mut server_version = None;
                let mut runtimes = None;
                let mut default_runtime = None;
                let mut swarm = None;
                let mut live_restore_enabled = None;
                let mut isolation = None;
                let mut init_binary = None;
                let mut containerd_commit = None;
                let mut runc_commit = None;
                let mut init_commit = None;
                let mut security_options = None;
                let mut product_license = None;
                let mut default_address_pools = None;
                let mut firewall_backend = None;
                let mut cdi_spec_dirs = None;
                let mut containerd_info = None;
                let mut warnings = None;
                while let Some(key) = map.next_key::<Zeroizing<String>>()? {
                    macro_rules! set_member {
                        ($slot:ident, $key:literal) => {{
                            if $slot.is_some() {
                                return Err(de::Error::duplicate_field($key));
                            }
                            $slot = Some(map.next_value()?);
                        }};
                    }
                    match key.as_str() {
                        "ID" => set_member!(id, "ID"),
                        "Containers" => set_member!(containers, "Containers"),
                        "ContainersRunning" => set_member!(containers_running, "ContainersRunning"),
                        "ContainersPaused" => set_member!(containers_paused, "ContainersPaused"),
                        "ContainersStopped" => set_member!(containers_stopped, "ContainersStopped"),
                        "Images" => set_member!(images, "Images"),
                        "Driver" => set_member!(driver, "Driver"),
                        "DriverStatus" => set_member!(driver_status, "DriverStatus"),
                        "Plugins" => set_member!(plugins, "Plugins"),
                        "MemoryLimit" => set_member!(memory_limit, "MemoryLimit"),
                        "SwapLimit" => set_member!(swap_limit, "SwapLimit"),
                        "CpuCfsPeriod" => set_member!(cpu_cfs_period, "CpuCfsPeriod"),
                        "CpuCfsQuota" => set_member!(cpu_cfs_quota, "CpuCfsQuota"),
                        "CPUShares" => set_member!(cpu_shares, "CPUShares"),
                        "CPUSet" => set_member!(cpu_set, "CPUSet"),
                        "PidsLimit" => set_member!(pids_limit, "PidsLimit"),
                        "IPv4Forwarding" => set_member!(ipv4_forwarding, "IPv4Forwarding"),
                        "Debug" => set_member!(debug, "Debug"),
                        "NFd" => set_member!(nfd, "NFd"),
                        "OomKillDisable" => set_member!(oom_kill_disable, "OomKillDisable"),
                        "NGoroutines" => set_member!(ngoroutines, "NGoroutines"),
                        "SystemTime" => set_member!(system_time, "SystemTime"),
                        "LoggingDriver" => set_member!(logging_driver, "LoggingDriver"),
                        "CgroupDriver" => set_member!(cgroup_driver, "CgroupDriver"),
                        "CgroupVersion" => set_member!(cgroup_version, "CgroupVersion"),
                        "NEventsListener" => set_member!(nevents_listener, "NEventsListener"),
                        "KernelVersion" => set_member!(kernel_version, "KernelVersion"),
                        "OperatingSystem" => set_member!(operating_system, "OperatingSystem"),
                        "OSVersion" => set_member!(os_version, "OSVersion"),
                        "OSType" => set_member!(os_type, "OSType"),
                        "Architecture" => set_member!(architecture, "Architecture"),
                        "IndexServerAddress" => {
                            set_member!(index_server_address, "IndexServerAddress");
                        }
                        "RegistryConfig" => set_member!(registry_config, "RegistryConfig"),
                        "NCPU" => set_member!(ncpu, "NCPU"),
                        "MemTotal" => set_member!(mem_total, "MemTotal"),
                        "GenericResources" => set_member!(generic_resources, "GenericResources"),
                        "DockerRootDir" => set_member!(docker_root_dir, "DockerRootDir"),
                        "HttpProxy" => set_member!(http_proxy_claim, "HttpProxy"),
                        "HttpsProxy" => set_member!(secure_proxy_claim, "HttpsProxy"),
                        "NoProxy" => set_member!(no_proxy, "NoProxy"),
                        "Name" => set_member!(name, "Name"),
                        "Labels" => set_member!(labels, "Labels"),
                        "ExperimentalBuild" => set_member!(experimental_build, "ExperimentalBuild"),
                        "ServerVersion" => set_member!(server_version, "ServerVersion"),
                        "Runtimes" => set_member!(runtimes, "Runtimes"),
                        "DefaultRuntime" => set_member!(default_runtime, "DefaultRuntime"),
                        "Swarm" => set_member!(swarm, "Swarm"),
                        "LiveRestoreEnabled" => {
                            set_member!(live_restore_enabled, "LiveRestoreEnabled");
                        }
                        "Isolation" => set_member!(isolation, "Isolation"),
                        "InitBinary" => set_member!(init_binary, "InitBinary"),
                        "ContainerdCommit" => set_member!(containerd_commit, "ContainerdCommit"),
                        "RuncCommit" => set_member!(runc_commit, "RuncCommit"),
                        "InitCommit" => set_member!(init_commit, "InitCommit"),
                        "SecurityOptions" => set_member!(security_options, "SecurityOptions"),
                        "ProductLicense" => set_member!(product_license, "ProductLicense"),
                        "DefaultAddressPools" => {
                            set_member!(default_address_pools, "DefaultAddressPools");
                        }
                        "FirewallBackend" => set_member!(firewall_backend, "FirewallBackend"),
                        "CDISpecDirs" => set_member!(cdi_spec_dirs, "CDISpecDirs"),
                        "Containerd" => set_member!(containerd_info, "Containerd"),
                        "Warnings" => set_member!(warnings, "Warnings"),
                        _ => return Err(de::Error::custom("unknown Info response member")),
                    }
                }
                macro_rules! required {
                    ($slot:ident, $key:literal) => {
                        $slot.ok_or_else(|| de::Error::missing_field($key))?
                    };
                }
                Ok(InfoResponse {
                    id: required!(id, "ID"),
                    containers: required!(containers, "Containers"),
                    containers_running: required!(containers_running, "ContainersRunning"),
                    containers_paused: required!(containers_paused, "ContainersPaused"),
                    containers_stopped: required!(containers_stopped, "ContainersStopped"),
                    images: required!(images, "Images"),
                    driver: required!(driver, "Driver"),
                    driver_status: required!(driver_status, "DriverStatus"),
                    plugins: required!(plugins, "Plugins"),
                    memory_limit: required!(memory_limit, "MemoryLimit"),
                    swap_limit: required!(swap_limit, "SwapLimit"),
                    cpu_cfs_period: required!(cpu_cfs_period, "CpuCfsPeriod"),
                    cpu_cfs_quota: required!(cpu_cfs_quota, "CpuCfsQuota"),
                    cpu_shares: required!(cpu_shares, "CPUShares"),
                    cpu_set: required!(cpu_set, "CPUSet"),
                    pids_limit: required!(pids_limit, "PidsLimit"),
                    ipv4_forwarding: required!(ipv4_forwarding, "IPv4Forwarding"),
                    debug: required!(debug, "Debug"),
                    nfd: required!(nfd, "NFd"),
                    oom_kill_disable: required!(oom_kill_disable, "OomKillDisable"),
                    ngoroutines: required!(ngoroutines, "NGoroutines"),
                    system_time: required!(system_time, "SystemTime"),
                    logging_driver: required!(logging_driver, "LoggingDriver"),
                    cgroup_driver: required!(cgroup_driver, "CgroupDriver"),
                    cgroup_version: required!(cgroup_version, "CgroupVersion"),
                    nevents_listener: required!(nevents_listener, "NEventsListener"),
                    kernel_version: required!(kernel_version, "KernelVersion"),
                    operating_system: required!(operating_system, "OperatingSystem"),
                    os_version: required!(os_version, "OSVersion"),
                    os_type: required!(os_type, "OSType"),
                    architecture: required!(architecture, "Architecture"),
                    index_server_address: required!(index_server_address, "IndexServerAddress"),
                    registry_config: required!(registry_config, "RegistryConfig"),
                    ncpu: required!(ncpu, "NCPU"),
                    mem_total: required!(mem_total, "MemTotal"),
                    generic_resources: required!(generic_resources, "GenericResources"),
                    docker_root_dir: required!(docker_root_dir, "DockerRootDir"),
                    http_proxy: required!(http_proxy_claim, "HttpProxy"),
                    https_proxy: required!(secure_proxy_claim, "HttpsProxy"),
                    no_proxy: required!(no_proxy, "NoProxy"),
                    name: required!(name, "Name"),
                    labels: required!(labels, "Labels"),
                    experimental_build: required!(experimental_build, "ExperimentalBuild"),
                    server_version: required!(server_version, "ServerVersion"),
                    runtimes: required!(runtimes, "Runtimes"),
                    default_runtime: required!(default_runtime, "DefaultRuntime"),
                    swarm: required!(swarm, "Swarm"),
                    live_restore_enabled: required!(live_restore_enabled, "LiveRestoreEnabled"),
                    isolation: required!(isolation, "Isolation"),
                    init_binary: required!(init_binary, "InitBinary"),
                    containerd_commit: required!(containerd_commit, "ContainerdCommit"),
                    runc_commit: required!(runc_commit, "RuncCommit"),
                    init_commit: required!(init_commit, "InitCommit"),
                    security_options: required!(security_options, "SecurityOptions"),
                    product_license,
                    default_address_pools,
                    firewall_backend,
                    cdi_spec_dirs: required!(cdi_spec_dirs, "CDISpecDirs"),
                    containerd: required!(containerd_info, "Containerd"),
                    warnings: required!(warnings, "Warnings"),
                })
            }
        }
        deserializer.deserialize_map(InfoVisitor)
    }
}

fn require_claim(value: &Zeroizing<String>) -> Result<(), InfoDecodeError> {
    if value.is_empty() || value.as_str() == "N/A" {
        Err(InfoDecodeError::Recipe)
    } else {
        Ok(())
    }
}

fn require_exact(value: &Zeroizing<String>, expected: &str) -> Result<(), InfoDecodeError> {
    if value.as_str() == expected {
        Ok(())
    } else {
        Err(InfoDecodeError::Recipe)
    }
}

fn validate_names(names: &Nullable<StringList>) -> Result<(), InfoDecodeError> {
    if let Nullable(Some(StringList(values))) = names {
        for value in values {
            require_claim(value)?;
        }
        for (index, value) in values.iter().enumerate() {
            if values[..index]
                .iter()
                .any(|earlier| earlier.as_str() == value.as_str())
            {
                return Err(InfoDecodeError::Recipe);
            }
        }
    }
    Ok(())
}

fn has_allocated_names(value: &Nullable<StringList>) -> bool {
    matches!(value, Nullable(Some(StringList(values))) if !values.is_empty())
}

fn validate_ip_prefix(value: &Zeroizing<String>) -> Result<(), InfoDecodeError> {
    let text = value.as_str();
    let Some((address, prefix)) = text.split_once('/') else {
        return Err(InfoDecodeError::Recipe);
    };
    if address.is_empty()
        || prefix.is_empty()
        || prefix.contains('/')
        || (prefix.len() > 1 && prefix.starts_with('0'))
        || !prefix.as_bytes().iter().all(u8::is_ascii_digit)
    {
        return Err(InfoDecodeError::Recipe);
    }
    let address: IpAddr = address.parse().map_err(|_| InfoDecodeError::Recipe)?;
    let limit = match address {
        IpAddr::V4(_) => 32,
        IpAddr::V6(_) => 128,
    };
    let prefix: u16 = prefix.parse().map_err(|_| InfoDecodeError::Recipe)?;
    if prefix <= limit {
        Ok(())
    } else {
        Err(InfoDecodeError::Recipe)
    }
}

fn validate_timestamp(value: &Zeroizing<String>) -> Result<(), InfoDecodeError> {
    let text = value.as_bytes();
    if text.len() < 20
        || text[4] != b'-'
        || text[7] != b'-'
        || text[10] != b'T'
        || text[13] != b':'
        || text[16] != b':'
    {
        return Err(InfoDecodeError::Recipe);
    }
    let number = |start: usize, end: usize| -> Option<u32> {
        std::str::from_utf8(&text[start..end]).ok()?.parse().ok()
    };
    if !text[..4]
        .iter()
        .chain(text[5..7].iter())
        .chain(text[8..10].iter())
        .chain(text[11..13].iter())
        .chain(text[14..16].iter())
        .chain(text[17..19].iter())
        .all(u8::is_ascii_digit)
    {
        return Err(InfoDecodeError::Recipe);
    }
    let year = number(0, 4).ok_or(InfoDecodeError::Recipe)?;
    let month = number(5, 7).ok_or(InfoDecodeError::Recipe)?;
    let day = number(8, 10).ok_or(InfoDecodeError::Recipe)?;
    let hour = number(11, 13).ok_or(InfoDecodeError::Recipe)?;
    let minute = number(14, 16).ok_or(InfoDecodeError::Recipe)?;
    let second = number(17, 19).ok_or(InfoDecodeError::Recipe)?;
    if year == 0 || !(1..=12).contains(&month) || hour > 23 || minute > 59 || second > 59 {
        return Err(InfoDecodeError::Recipe);
    }
    let leap = year % 4 == 0 && (year % 100 != 0 || year % 400 == 0);
    let max_day = match month {
        1 | 3 | 5 | 7 | 8 | 10 | 12 => 31,
        4 | 6 | 9 | 11 => 30,
        2 if leap => 29,
        2 => 28,
        _ => return Err(InfoDecodeError::Recipe),
    };
    if day == 0 || day > max_day {
        return Err(InfoDecodeError::Recipe);
    }
    let mut position = 19;
    if text.get(position) == Some(&b'.') {
        position += 1;
        let fraction_start = position;
        while matches!(text.get(position), Some(b'0'..=b'9')) {
            position += 1;
        }
        if position == fraction_start || position - fraction_start > 9 {
            return Err(InfoDecodeError::Recipe);
        }
    }
    match text.get(position..) {
        Some(b"Z") => Ok(()),
        Some(offset)
            if offset.len() == 6
                && matches!(offset[0], b'+' | b'-')
                && offset[3] == b':'
                && offset[1..3]
                    .iter()
                    .chain(offset[4..6].iter())
                    .all(u8::is_ascii_digit) =>
        {
            let hours = u32::from(offset[1] - b'0') * 10 + u32::from(offset[2] - b'0');
            let minutes = u32::from(offset[4] - b'0') * 10 + u32::from(offset[5] - b'0');
            if hours <= 23 && minutes <= 59 {
                Ok(())
            } else {
                Err(InfoDecodeError::Recipe)
            }
        }
        _ => Err(InfoDecodeError::Recipe),
    }
}

fn validate_compared_claims(response: &InfoResponse) -> Result<(), InfoDecodeError> {
    for claim in [
        &response.id,
        &response.driver,
        &response.kernel_version,
        &response.operating_system,
        &response.os_version,
        &response.architecture,
        &response.docker_root_dir,
        &response.init_binary,
        &response.containerd.address,
        &response.containerd.namespaces.containers,
        &response.containerd.namespaces.plugins,
        &response.containerd_commit.id,
        &response.runc_commit.id,
        &response.init_commit.id,
    ] {
        require_claim(claim)?;
    }
    Ok(())
}

fn validate_fixed_root_recipe(response: &InfoResponse) -> Result<(), InfoDecodeError> {
    for fixed in [
        (&response.server_version, "29.8.2"),
        (&response.os_type, "linux"),
        (&response.cgroup_driver, "systemd"),
        (&response.cgroup_version, "2"),
        (&response.default_runtime, "runc"),
        (&response.isolation, ""),
    ] {
        require_exact(fixed.0, fixed.1)?;
    }
    if !response.memory_limit
        || !response.swap_limit
        || !response.cpu_cfs_period
        || !response.cpu_cfs_quota
        || !response.pids_limit
        || response.debug
        || response.experimental_build
        || response.live_restore_enabled
    {
        return Err(InfoDecodeError::Recipe);
    }
    if response.ncpu.0 == 0 || response.mem_total.0 == 0 {
        return Err(InfoDecodeError::Recipe);
    }
    validate_timestamp(&response.system_time)?;
    validate_names(&response.plugins.volume)?;
    validate_names(&response.plugins.network)?;
    validate_names(&response.plugins.log)?;
    if has_allocated_names(&response.plugins.authorization) {
        return Err(InfoDecodeError::Recipe);
    }
    Ok(())
}

fn validate_runtime_security_and_swarm(response: &InfoResponse) -> Result<(), InfoDecodeError> {
    for runtime in [&response.runtimes.runc, &response.runtimes.containerd_runc] {
        require_exact(&runtime.path, "runc")?;
        if runtime.status.as_ref().is_some_and(|status| {
            status
                .features
                .as_ref()
                .is_none_or(|value| value.is_empty())
        }) {
            return Err(InfoDecodeError::Recipe);
        }
    }
    let expected_security = [
        "name=apparmor,profile=default",
        "name=seccomp,profile=builtin",
        "name=cgroupns",
    ];
    if response.security_options.len() != 3 && response.security_options.len() != 4 {
        return Err(InfoDecodeError::Recipe);
    }
    if !response
        .security_options
        .iter()
        .take(3)
        .zip(expected_security)
        .all(|(actual, expected)| actual.as_str() == expected)
    {
        return Err(InfoDecodeError::Recipe);
    }
    let daemon_no_new_privileges = response.security_options.len() == 4;
    if daemon_no_new_privileges && response.security_options[3].as_str() != "name=no-new-privileges"
    {
        return Err(InfoDecodeError::Recipe);
    }
    if response.swarm.node_id.as_str() != ""
        || response.swarm.node_addr.as_str() != ""
        || response.swarm.local_node_state.as_str() != "inactive"
        || response.swarm.control_available
        || response.swarm.error.as_str() != ""
    {
        return Err(InfoDecodeError::Recipe);
    }
    Ok(())
}

fn validate_informational_children(response: &InfoResponse) -> Result<(), InfoDecodeError> {
    if let Some(firewall) = &response.firewall_backend {
        require_claim(&firewall.driver)?;
        if firewall.info.as_ref().is_some_and(Vec::is_empty) {
            return Err(InfoDecodeError::Recipe);
        }
    }
    if response
        .product_license
        .as_ref()
        .is_some_and(|value| value.is_empty())
    {
        return Err(InfoDecodeError::Recipe);
    }
    if let Some(pools) = &response.default_address_pools {
        if pools.is_empty() {
            return Err(InfoDecodeError::Recipe);
        }
        for pool in pools {
            validate_ip_prefix(&pool.base)?;
        }
    }
    if let Nullable(Some(StringList(values))) = &response.registry_config.cidrs {
        for value in values {
            validate_ip_prefix(value)?;
        }
    }
    if !response.cdi_spec_dirs.0.is_empty() {
        return Err(InfoDecodeError::Recipe);
    }
    Ok(())
}

fn validate_recipe(response: &InfoResponse) -> Result<(), InfoDecodeError> {
    validate_compared_claims(response)?;
    validate_fixed_root_recipe(response)?;
    validate_runtime_security_and_swarm(response)?;
    validate_informational_children(response)
}

fn project(response: InfoResponse) -> UnverifiedInfo {
    let daemon_no_new_privileges = response.security_options.len() == 4;
    let nullable_names = |value: Nullable<StringList>| match value {
        Nullable(None) => NullableNames::Null,
        Nullable(Some(StringList(mut values))) => {
            values.sort_by(|left, right| left.as_bytes().cmp(right.as_bytes()));
            NullableNames::Values(values)
        }
    };
    UnverifiedInfo {
        daemon_id: response.id,
        uname_architecture: response.architecture,
        kernel_version: response.kernel_version,
        operating_system: response.operating_system,
        os_version: response.os_version,
        daemon_root: response.docker_root_dir,
        storage_driver: response.driver,
        init_binary: response.init_binary,
        containerd_commit: response.containerd_commit.id,
        runc_commit: response.runc_commit.id,
        init_commit: response.init_commit.id,
        containerd: ContainerdClaim {
            address: response.containerd.address,
            containers_namespace: response.containerd.namespaces.containers,
            plugins_namespace: response.containerd.namespaces.plugins,
        },
        plugins: PluginsClaim {
            volume: nullable_names(response.plugins.volume),
            network: nullable_names(response.plugins.network),
            log: nullable_names(response.plugins.log),
            authorization: if response.plugins.authorization.0.is_some() {
                EmptyEncoding::Array
            } else {
                EmptyEncoding::Null
            },
        },
        generic_resources: if response.generic_resources.0.is_some() {
            EmptyEncoding::Array
        } else {
            EmptyEncoding::Null
        },
        firewall_driver: response.firewall_backend.map(|firewall| firewall.driver),
        logical_cpus: response.ncpu.0,
        memory_bytes: response.mem_total.0,
        daemon_no_new_privileges,
    }
}

enum ScanError {
    Syntax,
    Limits,
}
impl ScanError {
    const fn into_decode_error(self) -> InfoDecodeError {
        match self {
            Self::Syntax => InfoDecodeError::JsonSyntax,
            Self::Limits => InfoDecodeError::JsonLimits,
        }
    }
}

#[derive(Clone, Copy)]
enum ScanContext {
    Other,
    Root,
    Runtimes,
    Runtime,
    RuntimeStatus,
    Feature,
    DriverStatus,
    Firewall,
    FirewallInfo,
    DefaultPools,
    Pair,
}
impl ScanContext {
    fn child(self, key: &str) -> Self {
        match (self, key) {
            (Self::Root, "Runtimes") => Self::Runtimes,
            (Self::Root, "DriverStatus") => Self::DriverStatus,
            (Self::Root, "FirewallBackend") => Self::Firewall,
            (Self::Root, "DefaultAddressPools") => Self::DefaultPools,
            (Self::Runtimes, "runc" | "io.containerd.runc.v2") => Self::Runtime,
            (Self::Runtime, "status") => Self::RuntimeStatus,
            (Self::RuntimeStatus, "org.opencontainers.runtime-spec.features") => Self::Feature,
            (Self::Firewall, "Info") => Self::FirewallInfo,
            _ => Self::Other,
        }
    }
    const fn array_limit(self) -> usize {
        match self {
            Self::DriverStatus | Self::FirewallInfo | Self::DefaultPools => {
                MAX_SPECIAL_ARRAY_ELEMENTS
            }
            Self::Pair => 2,
            _ => MAX_ARRAY_ELEMENTS,
        }
    }
    const fn array_child(self) -> Self {
        match self {
            Self::DriverStatus | Self::FirewallInfo => Self::Pair,
            _ => Self::Other,
        }
    }
    const fn string_limit(self) -> usize {
        if matches!(self, Self::Feature) {
            MAX_FEATURE_BYTES
        } else {
            MAX_VALUE_BYTES
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

struct InfoPreflight<'a> {
    bytes: &'a [u8],
    position: usize,
    total_object_members: usize,
}
impl<'a> InfoPreflight<'a> {
    const fn new(bytes: &'a [u8]) -> Self {
        Self {
            bytes,
            position: 0,
            total_object_members: 0,
        }
    }
    fn scan_document(&mut self) -> Result<(), ScanError> {
        self.skip_whitespace();
        self.scan_value(1, ScanContext::Root)?;
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
    fn scan_array(&mut self, depth: usize, context: ScanContext) -> Result<(), ScanError> {
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
            if elements == context.array_limit() {
                return Err(ScanError::Limits);
            }
            self.scan_value(depth + 1, context.array_child())?;
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

#[cfg(test)]
#[path = "headless_daemon_info_tests.rs"]
mod tests;
