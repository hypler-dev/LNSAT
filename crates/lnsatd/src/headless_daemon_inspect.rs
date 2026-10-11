//! Private, inert decoding of supplied Container Inspect JSON.

use serde::de::{self, MapAccess, SeqAccess, Visitor};
use serde::{Deserialize, Deserializer};
use std::fmt;
use zeroize::Zeroizing;

const MAX_BODY_BYTES: usize = 1_048_576;
const MAX_DEPTH: usize = 32;
const MAX_OBJECT_MEMBERS: usize = 128;
const MAX_TOTAL_MEMBERS: usize = 4_096;
const MAX_ARRAY_ELEMENTS: usize = 128;
const MAX_TOTAL_ARRAY_ELEMENTS: usize = 4_096;
const MAX_KEY_BYTES: usize = 256;
const MAX_VALUE_BYTES: usize = 4_096;

#[derive(Debug, Eq, PartialEq)]
enum InspectDecodeError {
    InputTooLarge,
    JsonSyntax,
    JsonLimits,
    JsonShape,
    Recipe,
}

impl InspectDecodeError {
    const fn as_str(&self) -> &'static str {
        match self {
            Self::InputTooLarge => "headless_inspect.input_too_large",
            Self::JsonSyntax => "headless_inspect.json_syntax",
            Self::JsonLimits => "headless_inspect.json_limits",
            Self::JsonShape => "headless_inspect.json_shape",
            Self::Recipe => "headless_inspect.recipe",
        }
    }
}

enum InspectPhase {
    Created,
    Running,
    Exited,
}
enum InspectRole {
    Preparation,
    Action,
}
enum InspectStorage {
    GraphDriver,
    Snapshotter,
}
enum InspectVolumes {
    Null,
    Empty,
}

struct InspectDescriptor {
    media_type: Zeroizing<String>,
    digest: Zeroizing<String>,
    size: i64,
    annotations: Option<Vec<(Zeroizing<String>, Zeroizing<String>)>>,
    platform: InspectPlatform,
}
struct InspectPlatform {
    architecture: Zeroizing<String>,
    os: Zeroizing<String>,
    variant: Option<Zeroizing<String>>,
}
struct InspectBind {
    source: Zeroizing<String>,
    destination: Zeroizing<String>,
}
struct InspectNetwork {
    sandbox_id: Zeroizing<String>,
    sandbox_key: Zeroizing<String>,
    network_id: Zeroizing<String>,
    endpoint_id: Zeroizing<String>,
}
struct UnverifiedContainerInspect {
    id: Zeroizing<String>,
    name: Zeroizing<String>,
    created: Zeroizing<String>,
    phase: InspectPhase,
    pid: u32,
    started_at: Zeroizing<String>,
    finished_at: Zeroizing<String>,
    image: Zeroizing<String>,
    config_image: Zeroizing<String>,
    driver: Zeroizing<String>,
    storage: InspectStorage,
    descriptor: Option<InspectDescriptor>,
    role: InspectRole,
    user: Zeroizing<String>,
    working_dir: Zeroizing<String>,
    labels: Vec<(Zeroizing<String>, Zeroizing<String>)>,
    volumes: InspectVolumes,
    memory: i64,
    memory_swap: i64,
    pids_limit: i64,
    cpu_period: i64,
    cpu_quota: i64,
    cgroup_parent: Zeroizing<String>,
    masked_paths: Vec<Zeroizing<String>>,
    resolv_conf_path: Zeroizing<String>,
    hostname_path: Zeroizing<String>,
    hosts_path: Zeroizing<String>,
    mount: Option<InspectBind>,
    network: InspectNetwork,
}

enum ScanError {
    Syntax,
    Limits,
}

impl ScanError {
    const fn into_decode_error(self) -> InspectDecodeError {
        match self {
            Self::Syntax => InspectDecodeError::JsonSyntax,
            Self::Limits => InspectDecodeError::JsonLimits,
        }
    }
}

struct ResponsePreflight<'a> {
    bytes: &'a [u8],
    position: usize,
    total_object_members: usize,
    total_array_elements: usize,
    non_decimal_number: bool,
}

impl<'a> ResponsePreflight<'a> {
    const fn new(bytes: &'a [u8]) -> Self {
        Self {
            bytes,
            position: 0,
            total_object_members: 0,
            total_array_elements: 0,
            non_decimal_number: false,
        }
    }

    fn scan_document(&mut self) -> Result<bool, ScanError> {
        self.skip_whitespace();
        self.scan_value(1)?;
        self.skip_whitespace();
        if self.position == self.bytes.len() {
            Ok(self.non_decimal_number)
        } else {
            Err(ScanError::Syntax)
        }
    }

    fn scan_value(&mut self, depth: usize) -> Result<(), ScanError> {
        match self.current() {
            Some(b'{') => self.scan_object(depth),
            Some(b'[') => self.scan_array(depth),
            Some(b'"') => self.scan_string(MAX_VALUE_BYTES, false),
            Some(b't') => self.scan_keyword(b"true"),
            Some(b'f') => self.scan_keyword(b"false"),
            Some(b'n') => self.scan_keyword(b"null"),
            Some(b'-' | b'0'..=b'9') => self.scan_number(),
            _ => Err(ScanError::Syntax),
        }
    }

    fn scan_object(&mut self, depth: usize) -> Result<(), ScanError> {
        if depth > MAX_DEPTH {
            return Err(ScanError::Limits);
        }
        self.position += 1;
        self.skip_whitespace();
        if self.consume(b'}') {
            return Ok(());
        }
        let mut members = 0;
        loop {
            if members == MAX_OBJECT_MEMBERS || self.total_object_members == MAX_TOTAL_MEMBERS {
                return Err(ScanError::Limits);
            }
            self.scan_string(MAX_KEY_BYTES, true)?;
            members += 1;
            self.total_object_members += 1;
            self.skip_whitespace();
            self.expect(b':')?;
            self.skip_whitespace();
            self.scan_value(depth + 1)?;
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

    fn scan_array(&mut self, depth: usize) -> Result<(), ScanError> {
        if depth > MAX_DEPTH {
            return Err(ScanError::Limits);
        }
        self.position += 1;
        self.skip_whitespace();
        if self.consume(b']') {
            return Ok(());
        }
        let mut elements = 0;
        loop {
            if elements == MAX_ARRAY_ELEMENTS
                || self.total_array_elements == MAX_TOTAL_ARRAY_ELEMENTS
            {
                return Err(ScanError::Limits);
            }
            self.total_array_elements += 1;
            self.scan_value(depth + 1)?;
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

    fn scan_string(&mut self, maximum: usize, require_nonempty: bool) -> Result<(), ScanError> {
        self.expect(b'"')?;
        let mut decoded = 0;
        loop {
            let byte = self.current().ok_or(ScanError::Syntax)?;
            match byte {
                b'"' => {
                    self.position += 1;
                    if require_nonempty && decoded == 0 {
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
                            Self::add_bytes(&mut decoded, 1, maximum)?;
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
                            let width = char::from_u32(scalar)
                                .ok_or(ScanError::Syntax)?
                                .encode_utf8(&mut *encoded)
                                .len();
                            Self::add_bytes(&mut decoded, width, maximum)?;
                        }
                        _ => return Err(ScanError::Syntax),
                    }
                }
                _ => {
                    self.position += 1;
                    Self::add_bytes(&mut decoded, 1, maximum)?;
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

    fn scan_number(&mut self) -> Result<(), ScanError> {
        let negative = self.consume(b'-');
        match self.current() {
            Some(b'0') => {
                self.position += 1;
                if negative {
                    self.non_decimal_number = true;
                }
                if matches!(self.current(), Some(b'0'..=b'9')) {
                    return Err(ScanError::Syntax);
                }
            }
            Some(b'1'..=b'9') => {
                self.position += 1;
                while matches!(self.current(), Some(b'0'..=b'9')) {
                    self.position += 1;
                }
            }
            _ => return Err(ScanError::Syntax),
        }
        if self.consume(b'.') {
            self.non_decimal_number = true;
            self.scan_digits()?;
        }
        if matches!(self.current(), Some(b'e' | b'E')) {
            self.non_decimal_number = true;
            self.position += 1;
            let _ = self.consume(b'+') || self.consume(b'-');
            self.scan_digits()?;
        }
        Ok(())
    }

    fn scan_digits(&mut self) -> Result<(), ScanError> {
        if !matches!(self.current(), Some(b'0'..=b'9')) {
            return Err(ScanError::Syntax);
        }
        while matches!(self.current(), Some(b'0'..=b'9')) {
            self.position += 1;
        }
        Ok(())
    }

    fn skip_whitespace(&mut self) {
        while matches!(self.current(), Some(b' ' | b'\n' | b'\r' | b'\t')) {
            self.position += 1;
        }
    }

    fn current(&self) -> Option<u8> {
        self.bytes.get(self.position).copied()
    }

    fn consume(&mut self, byte: u8) -> bool {
        if self.current() == Some(byte) {
            self.position += 1;
            true
        } else {
            false
        }
    }

    fn expect(&mut self, byte: u8) -> Result<(), ScanError> {
        if self.consume(byte) {
            Ok(())
        } else {
            Err(ScanError::Syntax)
        }
    }

    fn scan_keyword(&mut self, keyword: &[u8]) -> Result<(), ScanError> {
        let end = self
            .position
            .checked_add(keyword.len())
            .ok_or(ScanError::Syntax)?;
        if self.bytes.get(self.position..end) == Some(keyword) {
            self.position = end;
            Ok(())
        } else {
            Err(ScanError::Syntax)
        }
    }

    fn add_bytes(total: &mut usize, addition: usize, maximum: usize) -> Result<(), ScanError> {
        let next = total.checked_add(addition).ok_or(ScanError::Limits)?;
        if next > maximum {
            return Err(ScanError::Limits);
        }
        *total = next;
        Ok(())
    }
}

// Explicit map visitors keep aliased fields required and reject positional
// structs, unknown fields, and duplicate decoded spellings. Optional fields
// deserialize their concrete type: omission never makes null acceptable.
macro_rules! closed_map {
    ($name:ident { $($field:ident : $ty:ty => $key:literal),* $(,)? }
        optional { $($opt:ident : $ot:ty => $ok:literal),* $(,)? }) => {
        struct $name { $($field: $ty,)* $($opt: Option<$ot>,)* }
        impl<'de> Deserialize<'de> for $name {
            fn deserialize<D: Deserializer<'de>>(d: D) -> Result<Self, D::Error> {
                struct MapVisitor;
                impl<'de> Visitor<'de> for MapVisitor {
                    type Value = $name;
                    fn expecting(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
                        f.write_str("a closed Inspect object")
                    }
                    fn visit_map<A: MapAccess<'de>>(self, mut map: A) -> Result<Self::Value, A::Error> {
                        $(let mut $field = None;)* $(let mut $opt = None;)*
                        while let Some(key) = map.next_key::<Text>()? {
                            match key.as_str() {
                                $($key => set_once(&mut $field, map.next_value::<$ty>()?)?,)*
                                $($ok => set_once(&mut $opt, map.next_value::<$ot>()?)?,)*
                                _ => return Err(de::Error::custom("unknown Inspect member")),
                            }
                        }
                        Ok($name { $($field: $field.ok_or_else(|| de::Error::custom("missing Inspect member"))?,)* $($opt,)* })
                    }
                }
                d.deserialize_map(MapVisitor)
            }
        }
    };
}

type Text = Zeroizing<String>;
type Strings = BoundedList<Text>;
type StringPairs = Vec<(Text, Text)>;

fn set_once<T, E: de::Error>(slot: &mut Option<T>, value: T) -> Result<(), E> {
    if slot.replace(value).is_some() {
        return Err(E::custom("duplicate Inspect member"));
    }
    Ok(())
}

struct BoundedList<T>(Vec<T>);
impl<'de, T: Deserialize<'de>> Deserialize<'de> for BoundedList<T> {
    fn deserialize<D: Deserializer<'de>>(d: D) -> Result<Self, D::Error> {
        struct ListVisitor<T>(std::marker::PhantomData<T>);
        impl<'de, T: Deserialize<'de>> Visitor<'de> for ListVisitor<T> {
            type Value = BoundedList<T>;
            fn expecting(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
                f.write_str("a bounded array")
            }
            fn visit_seq<A: SeqAccess<'de>>(self, mut seq: A) -> Result<Self::Value, A::Error> {
                let mut values = Vec::new();
                while let Some(value) = seq.next_element::<T>()? {
                    if values.len() == MAX_ARRAY_ELEMENTS {
                        return Err(de::Error::custom("array limit"));
                    }
                    values
                        .try_reserve_exact(1)
                        .map_err(|_| de::Error::custom("allocation limit"))?;
                    values.push(value);
                }
                Ok(BoundedList(values))
            }
        }
        d.deserialize_seq(ListVisitor(std::marker::PhantomData))
    }
}

struct Dictionary<const ASCII: bool>(StringPairs);
struct DictionaryVisitor<const ASCII: bool>;
impl<'de, const ASCII: bool> Visitor<'de> for DictionaryVisitor<ASCII> {
    type Value = Dictionary<ASCII>;
    fn expecting(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str("a bounded string dictionary")
    }
    fn visit_map<A: MapAccess<'de>>(self, mut map: A) -> Result<Self::Value, A::Error> {
        let mut values: StringPairs = Vec::new();
        while let Some(key) = map.next_key::<Text>()? {
            if values.len() == 64
                || (ASCII && !key.is_ascii())
                || values.iter().any(|(k, _)| k == &key)
            {
                return Err(de::Error::custom("invalid dictionary key"));
            }
            let value = map.next_value::<Text>()?;
            values
                .try_reserve_exact(1)
                .map_err(|_| de::Error::custom("allocation limit"))?;
            values.push((key, value));
        }
        Ok(Dictionary(values))
    }
}
impl<'de, const ASCII: bool> Deserialize<'de> for Dictionary<ASCII> {
    fn deserialize<D: Deserializer<'de>>(d: D) -> Result<Self, D::Error> {
        d.deserialize_map(DictionaryVisitor::<ASCII>)
    }
}

struct EmptyMap;
impl<'de> Deserialize<'de> for EmptyMap {
    fn deserialize<D: Deserializer<'de>>(d: D) -> Result<Self, D::Error> {
        struct EmptyVisitor;
        impl<'de> Visitor<'de> for EmptyVisitor {
            type Value = EmptyMap;
            fn expecting(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
                f.write_str("an empty object")
            }
            fn visit_map<A: MapAccess<'de>>(self, mut map: A) -> Result<Self::Value, A::Error> {
                if map.next_key::<Text>()?.is_some() {
                    return Err(de::Error::custom("nonempty object"));
                }
                Ok(EmptyMap)
            }
        }
        d.deserialize_map(EmptyVisitor)
    }
}
struct EmptyList;
impl<'de> Deserialize<'de> for EmptyList {
    fn deserialize<D: Deserializer<'de>>(d: D) -> Result<Self, D::Error> {
        struct EmptyVisitor;
        impl<'de> Visitor<'de> for EmptyVisitor {
            type Value = EmptyList;
            fn expecting(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
                f.write_str("an empty array")
            }
            fn visit_seq<A: SeqAccess<'de>>(self, mut seq: A) -> Result<Self::Value, A::Error> {
                // Unit rejects non-null elements; a null element also denies.
                if seq.next_element::<()>()?.is_some() {
                    return Err(de::Error::custom("nonempty array"));
                }
                Ok(EmptyList)
            }
        }
        d.deserialize_seq(EmptyVisitor)
    }
}

closed_map!(WireInspect {
    id: Text => "Id", created: Text => "Created", path: Text => "Path", args: Strings => "Args",
    state: WireState => "State", image: Text => "Image", resolv: Text => "ResolvConfPath",
    hostname_path: Text => "HostnamePath", hosts_path: Text => "HostsPath", log_path: Text => "LogPath",
    name: Text => "Name", restart_count: i64 => "RestartCount", driver: Text => "Driver",
    platform: Text => "Platform", mount_label: Text => "MountLabel", process_label: Text => "ProcessLabel",
    apparmor: Text => "AppArmorProfile", exec_ids: () => "ExecIDs", host: WireHost => "HostConfig",
    mounts: BoundedList<WireMount> => "Mounts", config: WireConfig => "Config", network: WireNetwork => "NetworkSettings"
} optional { graph: WireGraph => "GraphDriver", storage: WireStorage => "Storage", descriptor: WireDescriptor => "ImageManifestDescriptor" });
closed_map!(WireState {
    status: Text => "Status", running: bool => "Running", paused: bool => "Paused", restarting: bool => "Restarting",
    oom: bool => "OOMKilled", dead: bool => "Dead", pid: i64 => "Pid", exit_code: i64 => "ExitCode",
    error: Text => "Error", started: Text => "StartedAt", finished: Text => "FinishedAt"
} optional {});
closed_map!(WireConfig {
    hostname: Text => "Hostname", domain: Text => "Domainname", user: Text => "User",
    attach_stdin: bool => "AttachStdin", attach_stdout: bool => "AttachStdout", attach_stderr: bool => "AttachStderr",
    tty: bool => "Tty", open_stdin: bool => "OpenStdin", stdin_once: bool => "StdinOnce",
    env: Strings => "Env", cmd: Strings => "Cmd", health: WireHealth => "Healthcheck", image: Text => "Image",
    volumes: Option<EmptyMap> => "Volumes", working_dir: Text => "WorkingDir", entrypoint: Strings => "Entrypoint",
    labels: Dictionary<false> => "Labels", stop_signal: Text => "StopSignal", stop_timeout: i64 => "StopTimeout"
} optional {});
closed_map!(WireHealth { test: Strings => "Test" } optional {});
closed_map!(WireHost {
    binds: Strings => "Binds", container_id_file: Text => "ContainerIDFile", log: WireLog => "LogConfig",
    network_mode: Text => "NetworkMode", port_bindings: EmptyMap => "PortBindings", restart: WireRestart => "RestartPolicy",
    auto_remove: bool => "AutoRemove", volume_driver: Text => "VolumeDriver", volumes_from: Strings => "VolumesFrom",
    console_size: [u64;2] => "ConsoleSize", cap_add: Strings => "CapAdd", cap_drop: Strings => "CapDrop",
    cgroupns_mode: Text => "CgroupnsMode", dns: Strings => "Dns", dns_options: Strings => "DnsOptions",
    dns_search: Strings => "DnsSearch", extra_hosts: Strings => "ExtraHosts", group_add: Strings => "GroupAdd",
    ipc_mode: Text => "IpcMode", cgroup: Text => "Cgroup", links: () => "Links", oom_score_adj: i64 => "OomScoreAdj",
    pid_mode: Text => "PidMode", privileged: bool => "Privileged", publish_all_ports: bool => "PublishAllPorts",
    readonly_rootfs: bool => "ReadonlyRootfs", security_opt: Strings => "SecurityOpt", uts_mode: Text => "UTSMode",
    userns_mode: Text => "UsernsMode", shm_size: i64 => "ShmSize", runtime: Text => "Runtime", isolation: Text => "Isolation",
    init: bool => "Init", masked_paths: Strings => "MaskedPaths", readonly_paths: Strings => "ReadonlyPaths",
    cpu_shares: i64 => "CpuShares", memory: i64 => "Memory", nano_cpus: i64 => "NanoCpus", cgroup_parent: Text => "CgroupParent",
    blkio_weight: u16 => "BlkioWeight", blkio_weight_device: () => "BlkioWeightDevice",
    blkio_read_bps: () => "BlkioDeviceReadBps", blkio_write_bps: () => "BlkioDeviceWriteBps",
    blkio_read_iops: () => "BlkioDeviceReadIOps", blkio_write_iops: () => "BlkioDeviceWriteIOps",
    cpu_period: i64 => "CpuPeriod", cpu_quota: i64 => "CpuQuota", cpu_realtime_period: i64 => "CpuRealtimePeriod",
    cpu_realtime_runtime: i64 => "CpuRealtimeRuntime", cpuset_cpus: Text => "CpusetCpus", cpuset_mems: Text => "CpusetMems",
    devices: EmptyList => "Devices", device_cgroup_rules: Strings => "DeviceCgroupRules", device_requests: EmptyList => "DeviceRequests",
    memory_reservation: i64 => "MemoryReservation", memory_swap: i64 => "MemorySwap", memory_swappiness: () => "MemorySwappiness",
    oom_kill_disable: bool => "OomKillDisable", pids_limit: i64 => "PidsLimit", ulimits: EmptyList => "Ulimits",
    cpu_count: i64 => "CpuCount", cpu_percent: i64 => "CpuPercent", io_maximum_iops: u64 => "IOMaximumIOps",
    io_maximum_bandwidth: u64 => "IOMaximumBandwidth"
} optional { mounts: BoundedList<WireHostMount> => "Mounts" });
closed_map!(WireLog { kind: Text => "Type", config: EmptyMap => "Config" } optional {});
closed_map!(WireRestart { name: Text => "Name", maximum_retry_count: i64 => "MaximumRetryCount" } optional {});
closed_map!(WireGraph { name: Text => "Name", data: Option<Dictionary<false>> => "Data" } optional {});
closed_map!(WireStorage { rootfs: WireRootFS => "RootFS" } optional {});
closed_map!(WireRootFS { snapshot: WireSnapshot => "Snapshot" } optional {});
closed_map!(WireSnapshot { name: Text => "Name" } optional {});
closed_map!(WireMount { kind: Text => "Type", source: Text => "Source", destination: Text => "Destination",
    mode: Text => "Mode", rw: bool => "RW", propagation: Text => "Propagation" } optional {});
closed_map!(WireHostMount { kind: Text => "Type", source: Text => "Source", target: Text => "Target", bind: WireBind => "BindOptions" } optional {});
closed_map!(WireBind { propagation: Text => "Propagation", non_recursive: bool => "NonRecursive" } optional {});
closed_map!(WireNetwork { sandbox_id: Text => "SandboxID", sandbox_key: Text => "SandboxKey", ports: EmptyMap => "Ports", networks: WireNetworks => "Networks" } optional {});
closed_map!(WireNetworks { none: WireEndpoint => "none" } optional {});
closed_map!(WireEndpoint { ipam: () => "IPAMConfig", links: () => "Links", aliases: () => "Aliases", driver_opts: () => "DriverOpts",
    gw_priority: i64 => "GwPriority", network_id: Text => "NetworkID", endpoint_id: Text => "EndpointID", gateway: Text => "Gateway",
    ip_address: Text => "IPAddress", mac_address: Text => "MacAddress", ip_prefix_len: i64 => "IPPrefixLen",
    ipv6_gateway: Text => "IPv6Gateway", global_ipv6_address: Text => "GlobalIPv6Address", global_ipv6_prefix_len: i64 => "GlobalIPv6PrefixLen",
    dns_names: () => "DNSNames" } optional {});
closed_map!(WireDescriptor { media_type: Text => "mediaType", digest: Text => "digest", size: i64 => "size", platform: WirePlatform => "platform"
} optional { annotations: Dictionary<true> => "annotations" });
closed_map!(WirePlatform { architecture: Text => "architecture", os: Text => "os" } optional { variant: Text => "variant" });

fn decode_inspect_claim(input: &[u8]) -> Result<UnverifiedContainerInspect, InspectDecodeError> {
    if input.len() > MAX_BODY_BYTES {
        return Err(InspectDecodeError::InputTooLarge);
    }
    if std::str::from_utf8(input).is_err() {
        return Err(InspectDecodeError::JsonSyntax);
    }
    if ResponsePreflight::new(input)
        .scan_document()
        .map_err(ScanError::into_decode_error)?
    {
        return Err(InspectDecodeError::JsonShape);
    }
    let response: WireInspect =
        serde_json::from_slice(input).map_err(|_| InspectDecodeError::JsonShape)?;
    project(response).ok_or(InspectDecodeError::Recipe)
}

fn strings_equal(actual: &Strings, expected: &[&str]) -> bool {
    actual.0.len() == expected.len() && actual.0.iter().zip(expected).all(|(a, b)| a.as_str() == *b)
}
fn hex_id(s: &str) -> bool {
    s.len() == 64
        && s.bytes()
            .all(|b| b.is_ascii_digit() || (b'a'..=b'f').contains(&b))
}
fn digest(s: &str) -> bool {
    s.strip_prefix("sha256:").is_some_and(hex_id)
}
fn non_placeholder(s: &str) -> bool {
    !s.is_empty() && s != "N/A"
}
fn control_free(s: &str) -> bool {
    !s.bytes().any(|b| b < 0x20 || b == 0x7f)
}
fn path(s: &str) -> bool {
    control_free(s)
        && (s == "/"
            || s.strip_prefix('/').is_some_and(|tail| {
                tail.split('/')
                    .all(|part| !part.is_empty() && part != "." && part != "..")
            }))
}
fn user(s: &str) -> bool {
    fn number(s: &str) -> Option<u32> {
        if s.is_empty()
            || (s.len() > 1 && s.starts_with('0'))
            || !s.bytes().all(|b| b.is_ascii_digit())
        {
            return None;
        }
        s.parse::<u32>().ok().filter(|n| *n != u32::MAX)
    }
    s.split_once(':')
        .is_some_and(|(uid, gid)| number(uid).is_some_and(|n| n > 0) && number(gid).is_some())
}

// Calendar seconds fit i64 across the complete four-digit year range. Keeping
// nanoseconds separate avoids the much smaller range of an i64 nanosecond total.
fn timestamp(s: &str) -> Option<(i64, u32)> {
    fn digits(b: &[u8]) -> Option<u32> {
        b.iter().try_fold(0_u32, |n, d| {
            d.is_ascii_digit().then(|| n * 10 + u32::from(d - b'0'))
        })
    }

    let b = s.as_bytes();
    if !(20..=35).contains(&b.len()) || !b.is_ascii() {
        return None;
    }
    if b[4] != b'-' || b[7] != b'-' || b[10] != b'T' || b[13] != b':' || b[16] != b':' {
        return None;
    }
    let year = digits(&b[..4])?;
    let month = digits(&b[5..7])?;
    let day = digits(&b[8..10])?;
    let hour = digits(&b[11..13])?;
    let minute = digits(&b[14..16])?;
    let second = digits(&b[17..19])?;
    if year == 0 || !(1..=12).contains(&month) || hour > 23 || minute > 59 || second > 59 {
        return None;
    }
    let leap = year.is_multiple_of(4) && (!year.is_multiple_of(100) || year.is_multiple_of(400));
    let months = [
        31,
        if leap { 29 } else { 28 },
        31,
        30,
        31,
        30,
        31,
        31,
        30,
        31,
        30,
        31,
    ];
    let month_index = usize::try_from(month - 1).ok()?;
    if day == 0 || day > months[month_index] {
        return None;
    }
    let mut position = 19;
    let mut nanos = 0;
    if b[position] == b'.' {
        position += 1;
        let start = position;
        while b.get(position).is_some_and(u8::is_ascii_digit) {
            position += 1;
        }
        let count = position - start;
        if !(1..=9).contains(&count) {
            return None;
        }
        nanos = digits(&b[start..position])? * 10_u32.pow(u32::try_from(9 - count).ok()?);
    }
    let offset = match b.get(position..)? {
        [b'Z'] => 0_i64,
        [sign @ (b'+' | b'-'), h1, h2, b':', m1, m2] => {
            let h = digits(&[*h1, *h2])?;
            let m = digits(&[*m1, *m2])?;
            if h > 23 || m > 59 {
                return None;
            }
            let value = i64::from(h) * 3600 + i64::from(m) * 60;
            if *sign == b'-' { -value } else { value }
        }
        _ => return None,
    };
    let y = i64::from(year - 1);
    let days = 365 * y + y / 4 - y / 100
        + y / 400
        + i64::from(months[..month_index].iter().sum::<u32>())
        + i64::from(day - 1);
    let seconds = days
        .checked_mul(86400)?
        .checked_add(i64::from(hour) * 3600 + i64::from(minute) * 60 + i64::from(second))?
        .checked_sub(offset)?;
    if (seconds, nanos) == (0, 0) && s != "0001-01-01T00:00:00Z" {
        return None;
    }
    Some((seconds, nanos))
}

fn phase(r: &WireInspect) -> Option<InspectPhase> {
    let s = &r.state;
    let created = timestamp(&r.created)?;
    let started = timestamp(&s.started)?;
    let finished = timestamp(&s.finished)?;
    if created == (0, 0)
        || s.paused
        || s.restarting
        || s.oom
        || s.dead
        || s.exit_code != 0
        || !s.error.is_empty()
    {
        return None;
    }
    let phase = match s.status.as_str() {
        "created" if !s.running && s.pid == 0 && started == (0, 0) && finished == (0, 0) => {
            InspectPhase::Created
        }
        "running"
            if s.running
                && (1..=i64::from(u32::MAX)).contains(&s.pid)
                && started != (0, 0)
                && started >= created
                && finished == (0, 0) =>
        {
            InspectPhase::Running
        }
        "exited"
            if !s.running
                && s.pid == 0
                && started != (0, 0)
                && finished != (0, 0)
                && finished >= started
                && started >= created =>
        {
            InspectPhase::Exited
        }
        _ => return None,
    };
    let n = &r.network;
    let e = &n.networks.none;
    let metadata = [&r.resolv, &r.hostname_path, &r.hosts_path];
    let good = match phase {
        InspectPhase::Created => {
            r.apparmor.is_empty()
                && metadata.iter().all(|p| p.is_empty())
                && n.sandbox_id.is_empty()
                && n.sandbox_key.is_empty()
                && e.network_id.is_empty()
                && e.endpoint_id.is_empty()
        }
        InspectPhase::Running => {
            r.apparmor.as_str() == "docker-default"
                && metadata.iter().all(|p| path(p))
                && hex_id(&n.sandbox_id)
                && path(&n.sandbox_key)
                && hex_id(&e.network_id)
                && hex_id(&e.endpoint_id)
        }
        InspectPhase::Exited => {
            r.apparmor.as_str() == "docker-default"
                && metadata.iter().all(|p| path(p))
                && n.sandbox_id.is_empty()
                && n.sandbox_key.is_empty()
                && hex_id(&e.network_id)
                && e.endpoint_id.is_empty()
        }
    };
    good.then_some(phase)
}
fn role(r: &WireInspect) -> Option<InspectRole> {
    let c = &r.config;
    if strings_equal(&c.entrypoint, &["/usr/local/bin/lnsat-hcfg6-probe"])
        && r.path.as_str() == "/usr/local/bin/lnsat-hcfg6-probe"
        && r.name
            .strip_prefix("/lnsat-hcfg6-probe-")
            .is_some_and(hex_id)
        && c.working_dir.as_str() == "/"
        && r.mounts.0.is_empty()
        && r.host.mounts.is_none()
    {
        return Some(InspectRole::Preparation);
    }
    if !strings_equal(&c.entrypoint, &["/usr/local/bin/lnsat-hcfg6-adapter"])
        || r.path.as_str() != "/usr/local/bin/lnsat-hcfg6-adapter"
        || !r
            .name
            .strip_prefix("/lnsat-hcfg6-action-")
            .is_some_and(hex_id)
        || c.working_dir.as_str() == "/"
        || !path(&c.working_dir)
    {
        return None;
    }
    let [m] = r.mounts.0.as_slice() else {
        return None;
    };
    let [h] = r.host.mounts.as_ref()?.0.as_slice() else {
        return None;
    };
    (m.kind.as_str() == "bind"
        && h.kind.as_str() == "bind"
        && m.mode.is_empty()
        && m.rw
        && m.propagation.as_str() == "rprivate"
        && h.bind.propagation.as_str() == "rprivate"
        && h.bind.non_recursive
        && path(&m.source)
        && m.source == h.source
        && m.destination == h.target
        && m.destination == c.working_dir)
        .then_some(InspectRole::Action)
}

fn fixed_config(c: &WireConfig) -> bool {
    c.hostname.as_str() == "lnsat"
        && c.domain.is_empty()
        && user(&c.user)
        && c.attach_stdin
        && c.attach_stdout
        && c.attach_stderr
        && !c.tty
        && c.open_stdin
        && c.stdin_once
        && strings_equal(
            &c.env,
            &[
                "PATH=/usr/bin",
                "LANG=C",
                "LC_ALL=C",
                "HOME=/nonexistent",
                "GIT_CONFIG_NOSYSTEM=1",
                "GIT_CONFIG_GLOBAL=/dev/null",
                "GIT_TERMINAL_PROMPT=0",
                "GIT_NO_REPLACE_OBJECTS=1",
                "GIT_ATTR_NOSYSTEM=1",
            ],
        )
        && c.cmd.0.is_empty()
        && strings_equal(&c.health.test, &["NONE"])
        && digest(&c.image)
        && c.labels.0.iter().any(|(k, v)| {
            k.as_str() == "io.lnsat.image-role" && v.as_str() == "hcfg6-git-reference"
        })
        && c.stop_signal.as_str() == "SIGKILL"
        && c.stop_timeout == 1
}
fn fixed_host(h: &WireHost) -> bool {
    let empty_texts = [
        &h.container_id_file,
        &h.volume_driver,
        &h.cgroup,
        &h.pid_mode,
        &h.uts_mode,
        &h.userns_mode,
        &h.isolation,
        &h.cpuset_cpus,
        &h.cpuset_mems,
    ];
    let empty_lists = [
        &h.binds,
        &h.volumes_from,
        &h.cap_add,
        &h.dns,
        &h.dns_options,
        &h.dns_search,
        &h.extra_hosts,
        &h.group_add,
        &h.device_cgroup_rules,
    ];
    let zeros = [
        h.oom_score_adj,
        h.cpu_shares,
        h.nano_cpus,
        h.cpu_realtime_period,
        h.cpu_realtime_runtime,
        h.memory_reservation,
        h.cpu_count,
        h.cpu_percent,
    ];
    empty_texts.iter().all(|s| s.is_empty())
        && empty_lists.iter().all(|s| s.0.is_empty())
        && zeros.iter().all(|n| *n == 0)
        && h.log.kind.as_str() == "none"
        && h.network_mode.as_str() == "none"
        && h.restart.name.as_str() == "no"
        && h.restart.maximum_retry_count == 0
        && !h.auto_remove
        && h.console_size == [0, 0]
        && strings_equal(&h.cap_drop, &["ALL"])
        && h.cgroupns_mode.as_str() == "private"
        && h.ipc_mode.as_str() == "none"
        && !h.privileged
        && !h.publish_all_ports
        && h.readonly_rootfs
        && strings_equal(&h.security_opt, &["no-new-privileges:true"])
        && h.shm_size == 67_108_864
        && h.runtime.as_str() == "runc"
        && !h.init
        && h.memory > 0
        && h.memory_swap == h.memory
        && h.pids_limit > 0
        && h.cpu_period == 100_000
        && h.cpu_quota >= 1000
        && h.cpu_quota % 100 == 0
        && control_free(&h.cgroup_parent)
        && h.blkio_weight == 0
        && h.io_maximum_iops == 0
        && h.io_maximum_bandwidth == 0
        && !h.oom_kill_disable
        && !h.masked_paths.0.is_empty()
        && h.masked_paths
            .0
            .iter()
            .enumerate()
            .all(|(i, p)| path(p) && !h.masked_paths.0[..i].contains(p))
        && strings_equal(
            &h.readonly_paths,
            &[
                "/proc/bus",
                "/proc/fs",
                "/proc/irq",
                "/proc/sys",
                "/proc/sysrq-trigger",
            ],
        )
}
fn fixed_endpoint(e: &WireEndpoint) -> bool {
    e.gw_priority == 0
        && e.ip_prefix_len == 0
        && e.global_ipv6_prefix_len == 0
        && [
            &e.gateway,
            &e.ip_address,
            &e.mac_address,
            &e.ipv6_gateway,
            &e.global_ipv6_address,
        ]
        .iter()
        .all(|s| s.is_empty())
}
fn descriptor(d: WireDescriptor) -> Option<InspectDescriptor> {
    if d.media_type.as_str() != "application/vnd.oci.image.manifest.v1+json"
        || !digest(&d.digest)
        || d.size <= 0
        || d.platform.os.as_str() != "linux"
        || !non_placeholder(&d.platform.architecture)
        || d.platform
            .variant
            .as_ref()
            .is_some_and(|v| !non_placeholder(v))
        || d.annotations.as_ref().is_some_and(|a| a.0.is_empty())
    {
        return None;
    }
    Some(InspectDescriptor {
        media_type: d.media_type,
        digest: d.digest,
        size: d.size,
        annotations: d.annotations.map(|a| a.0),
        platform: InspectPlatform {
            architecture: d.platform.architecture,
            os: d.platform.os,
            variant: d.platform.variant,
        },
    })
}

fn project(mut r: WireInspect) -> Option<UnverifiedContainerInspect> {
    if !hex_id(&r.id)
        || !digest(&r.image)
        || !non_placeholder(&r.driver)
        || !r.args.0.is_empty()
        || r.restart_count != 0
        || r.platform.as_str() != "linux"
        || !r.mount_label.is_empty()
        || !r.process_label.is_empty()
        || !r.log_path.is_empty()
        || !fixed_config(&r.config)
        || !fixed_host(&r.host)
        || !fixed_endpoint(&r.network.networks.none)
    {
        return None;
    }
    let phase = phase(&r)?;
    let role = role(&r)?;
    let (storage, descriptor) = match (r.graph, r.storage, r.descriptor) {
        (Some(g), None, None) if g.name == r.driver => (InspectStorage::GraphDriver, None),
        (None, Some(s), Some(d)) if s.rootfs.snapshot.name == r.driver => {
            (InspectStorage::Snapshotter, Some(descriptor(d)?))
        }
        _ => return None,
    };
    let mount = r.mounts.0.pop().map(|m| InspectBind {
        source: m.source,
        destination: m.destination,
    });
    Some(UnverifiedContainerInspect {
        id: r.id,
        name: r.name,
        created: r.created,
        phase,
        pid: u32::try_from(r.state.pid).ok()?,
        started_at: r.state.started,
        finished_at: r.state.finished,
        image: r.image,
        config_image: r.config.image,
        driver: r.driver,
        storage,
        descriptor,
        role,
        user: r.config.user,
        working_dir: r.config.working_dir,
        labels: r.config.labels.0,
        volumes: if r.config.volumes.is_some() {
            InspectVolumes::Empty
        } else {
            InspectVolumes::Null
        },
        memory: r.host.memory,
        memory_swap: r.host.memory_swap,
        pids_limit: r.host.pids_limit,
        cpu_period: r.host.cpu_period,
        cpu_quota: r.host.cpu_quota,
        cgroup_parent: r.host.cgroup_parent,
        masked_paths: r.host.masked_paths.0,
        resolv_conf_path: r.resolv,
        hostname_path: r.hostname_path,
        hosts_path: r.hosts_path,
        mount,
        network: InspectNetwork {
            sandbox_id: r.network.sandbox_id,
            sandbox_key: r.network.sandbox_key,
            network_id: r.network.networks.none.network_id,
            endpoint_id: r.network.networks.none.endpoint_id,
        },
    })
}

#[cfg(test)]
#[path = "headless_daemon_inspect_tests.rs"]
mod tests;

#[cfg(test)]
mod preflight_tests {
    use super::*;

    fn scan(s: &str) -> Result<bool, &'static str> {
        ResponsePreflight::new(s.as_bytes())
            .scan_document()
            .map_err(|e| e.into_decode_error().as_str())
    }
    fn array(n: usize) -> String {
        format!("[{}]", vec!["0"; n].join(","))
    }
    fn object(n: usize) -> String {
        format!(
            "{{{}}}",
            (0..n)
                .map(|i| format!("\"k{i}\":0"))
                .collect::<Vec<_>>()
                .join(",")
        )
    }
    const LIMIT: &str = "headless_inspect.json_limits";
    const SYNTAX: &str = "headless_inspect.json_syntax";

    #[test]
    fn exact_and_over_depth_member_and_element_bounds() {
        assert_eq!(
            scan(&format!("{}0{}", "[".repeat(32), "]".repeat(32))),
            Ok(false)
        );
        assert_eq!(
            scan(&format!("{}0{}", "[".repeat(33), "]".repeat(33))),
            Err(LIMIT)
        );
        assert_eq!(scan(&object(128)), Ok(false));
        assert_eq!(scan(&object(129)), Err(LIMIT));
        assert_eq!(scan(&array(128)), Ok(false));
        assert_eq!(scan(&array(129)), Err(LIMIT));
        // Arrays contribute no object members: 32 * 128 reaches exactly4096.
        let members = format!("[{}]", vec![object(128); 32].join(","));
        assert_eq!(scan(&members), Ok(false));
        assert_eq!(
            scan(&format!(
                "[{},{}]",
                &members[1..members.len() - 1],
                object(1)
            )),
            Err(LIMIT)
        );
        // Object-valued arrays avoid an extra outer array-element charge.
        let elements = format!(
            "{{{}}}",
            (0..32)
                .map(|i| format!("\"k{i}\":{}", array(128)))
                .collect::<Vec<_>>()
                .join(",")
        );
        assert_eq!(scan(&elements), Ok(false));
        assert_eq!(
            scan(&format!(
                "{},\"over\":[0]}}",
                &elements[..elements.len() - 1]
            )),
            Err(LIMIT)
        );
    }
    #[test]
    fn decoded_key_and_value_byte_limits_cover_escapes_and_unicode() {
        for (value, expected) in [
            ("x".repeat(4096), Ok(false)),
            ("x".repeat(4097), Err(LIMIT)),
            ("é".repeat(2048), Ok(false)),
            ("é".repeat(2049), Err(LIMIT)),
            ("\\u0061".repeat(4096), Ok(false)),
            ("\\ud83d\\ude00".repeat(1024), Ok(false)),
            ("\\ud83d\\ude00".repeat(1025), Err(LIMIT)),
        ] {
            assert_eq!(scan(&format!("\"{value}\"")), expected);
        }
        for (key, expected) in [
            ("x".repeat(256), Ok(false)),
            ("x".repeat(257), Err(LIMIT)),
            ("é".repeat(128), Ok(false)),
            ("é".repeat(129), Err(LIMIT)),
            ("\\u0061".repeat(256), Ok(false)),
            (String::new(), Err(LIMIT)),
        ] {
            assert_eq!(scan(&format!("{{\"{key}\":null}}")), expected);
        }
    }
    #[test]
    fn malformed_json_and_numeric_spelling_stage_precedence() {
        assert!(matches!(
            decode_inspect_claim(&vec![0xff; MAX_BODY_BYTES + 1]),
            Err(InspectDecodeError::InputTooLarge)
        ));
        for value in [
            "",
            " ",
            "\u{feff}{}",
            "{",
            "[",
            "[0,]",
            "{\"x\":0,}",
            "{}x",
            "{}{}",
            "01",
            "-",
            "1.",
            "1e",
            "1e+",
            "[true false]",
            "\"\\uD800\"",
            "\"\\uDC00\"",
            "\"\\uD800\\u0041\"",
            "\"\\x00\"",
            "\"\n\"",
            "\"\\u12\"",
        ] {
            assert_eq!(scan(value), Err(SYNTAX), "{value:?}");
        }
        for value in [
            "0",
            "-1",
            "18446744073709551616",
            "-9223372036854775809",
            "[true,false,null,{}]",
        ] {
            assert_eq!(scan(value), Ok(false));
        }
        for value in ["-0", "0.0", "-0.0", "1e0", "1E+99"] {
            assert_eq!(scan(value), Ok(true));
        }
        assert_eq!(scan("[1.5,"), Err(SYNTAX));
        assert_eq!(scan(&format!("[1.5,{}]", array(129))), Err(LIMIT));
        assert_eq!(
            scan(&format!("{{\"unknown\":{},\"later\":]}}", array(129))),
            Err(LIMIT)
        );
        assert_eq!(
            scan(&format!("{{\"unknown\":],\"later\":{}}}", array(129))),
            Err(SYNTAX)
        );
        assert_eq!(scan(&format!("{{\"Health\":{}}}", array(129))), Err(LIMIT));
        for value in [b"\xff".as_slice(), b"{\"x\":\"\xc0\xaf\"}".as_slice()] {
            assert!(matches!(
                decode_inspect_claim(value),
                Err(InspectDecodeError::JsonSyntax)
            ));
        }
    }
}
