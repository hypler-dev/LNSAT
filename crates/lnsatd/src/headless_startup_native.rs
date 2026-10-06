//! Closed native observation representation.  This file performs no native I/O.

use super::{
    deserialize_object, deserialize_objects, required_nullable, required_nullable_object,
    valid_digest,
};
use serde::{Deserialize, Serialize};
use zeroize::Zeroizing;

#[derive(Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
pub(super) struct Native {
    #[serde(deserialize_with = "deserialize_object")]
    pub(super) cgroup: Cgroup,
    #[serde(deserialize_with = "deserialize_objects")]
    pub(super) devices: Vec<Device>,
    #[serde(deserialize_with = "deserialize_object")]
    pub(super) kernel: KernelObservation,
    #[serde(deserialize_with = "deserialize_object")]
    pub(super) mapping: Mapping,
    #[serde(deserialize_with = "deserialize_objects")]
    pub(super) mounts: Vec<MountObservation>,
    #[serde(deserialize_with = "deserialize_object")]
    pub(super) namespaces: Namespaces,
    #[serde(deserialize_with = "deserialize_object")]
    pub(super) process: Process,
    #[serde(deserialize_with = "deserialize_object")]
    pub(super) security: SecurityObservation,
    #[serde(deserialize_with = "required_nullable_object")]
    pub(super) target: Option<Target>,
}

#[derive(Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
pub(super) struct Process {
    cap_ambient: Zeroizing<String>,
    cap_bounding: Zeroizing<String>,
    cap_effective: Zeroizing<String>,
    cap_inheritable: Zeroizing<String>,
    cap_permitted: Zeroizing<String>,
    environment: Vec<Zeroizing<String>>,
    executable_digest: Zeroizing<String>,
    gids: [u32; 4],
    groups: Vec<u32>,
    inherited_fds: Vec<u32>,
    no_new_privileges: u32,
    pid: u32,
    scheduler_policy: u32,
    seccomp_mode: u32,
    start_ticks: u64,
    thread_count: u32,
    uids: [u32; 4],
}

#[derive(Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
pub(super) struct Namespace {
    device: u64,
    inode: u64,
}

#[derive(Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
pub(super) struct Namespaces {
    #[serde(deserialize_with = "deserialize_object")]
    cgroup: Namespace,
    #[serde(deserialize_with = "deserialize_object")]
    ipc: Namespace,
    #[serde(deserialize_with = "deserialize_object")]
    mount: Namespace,
    #[serde(deserialize_with = "deserialize_object")]
    network: Namespace,
    #[serde(deserialize_with = "deserialize_object")]
    pid: Namespace,
    #[serde(deserialize_with = "deserialize_object")]
    time: Namespace,
    #[serde(deserialize_with = "deserialize_object")]
    user: Namespace,
    #[serde(deserialize_with = "deserialize_object")]
    uts: Namespace,
}

#[derive(Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
pub(super) struct Mapping {
    gid_map: Vec<MapRow>,
    uid_map: Vec<MapRow>,
}
#[derive(Deserialize, Serialize)]
struct MapRow(u32, u32, u64);

#[derive(Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
pub(super) struct Target {
    descriptor_access: Zeroizing<String>,
    descriptor_cloexec: bool,
    device: u64,
    inode: u64,
    mount_id: u64,
    mount_path: Zeroizing<String>,
    owner_gid: u32,
    owner_uid: u32,
}

#[derive(Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
pub(super) struct MountObservation {
    device_major: u32,
    device_minor: u32,
    filesystem_type: Zeroizing<String>,
    mount_id: u64,
    mount_options: Vec<Zeroizing<String>>,
    mount_point: Zeroizing<String>,
    mount_source: Zeroizing<String>,
    optional_fields: Vec<Zeroizing<String>>,
    parent_id: u64,
    root: Zeroizing<String>,
    super_options: Vec<Zeroizing<String>>,
}

#[derive(Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
pub(super) struct Device {
    gid: u32,
    #[serde(deserialize_with = "required_nullable")]
    link_target: Option<Zeroizing<String>>,
    major: u32,
    minor: u32,
    mode: u32,
    path: Zeroizing<String>,
    r#type: Zeroizing<String>,
    uid: u32,
}

#[derive(Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
pub(super) struct Cgroup {
    controllers: Vec<Zeroizing<String>>,
    cpu_burst: u64,
    cpu_period: u64,
    cpu_quota: u64,
    directory_device: u64,
    directory_inode: u64,
    membership_path: Zeroizing<String>,
    memory_max: u64,
    memory_oom_group: u32,
    memory_swap_max: u64,
    mount_id: u64,
    pids_max: u64,
}

#[derive(Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
pub(super) struct SecurityObservation {
    apparmor_label: Zeroizing<String>,
    network_interfaces: Vec<Zeroizing<String>>,
    security_recipe_digest: Zeroizing<String>,
}

#[derive(Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
pub(super) struct KernelObservation {
    boot_id: Zeroizing<String>,
    cgroupfs_device: u64,
    kernel_recipe_digest: Zeroizing<String>,
    procfs_device: u64,
}

pub(super) fn valid_native(value: &Native, action: bool) -> bool {
    value.target.is_some() == action
        && valid_process(&value.process)
        && valid_namespaces(&value.namespaces)
        && valid_mapping(&value.mapping)
        && value.target.as_ref().is_none_or(valid_target)
        && value.mounts.len() <= 128
        && strict_by(&value.mounts, |v| v.mount_id)
        && value.mounts.iter().all(valid_mount)
        && value.devices.len() <= 32
        && strict_strings(&value.devices, |v| &v.path)
        && value.devices.iter().all(valid_device)
        && valid_cgroup(&value.cgroup)
        && valid_security(&value.security)
        && valid_kernel(&value.kernel)
}

fn valid_process(v: &Process) -> bool {
    v.pid > 0
        && v.start_ticks > 0
        && v.groups.len() <= 16
        && sorted(&v.groups)
        && v.inherited_fds.len() <= 16
        && sorted(&v.inherited_fds)
        && [
            &v.cap_ambient,
            &v.cap_bounding,
            &v.cap_effective,
            &v.cap_inheritable,
            &v.cap_permitted,
        ]
        .iter()
        .all(|x| hex16(x))
        && valid_digest(&v.executable_digest)
        && v.environment.len() <= 16
        && v.environment.iter().map(|x| x.len()).sum::<usize>() <= 4096
        && unique_env(&v.environment)
}

fn valid_namespaces(v: &Namespaces) -> bool {
    [
        &v.cgroup, &v.ipc, &v.mount, &v.network, &v.pid, &v.time, &v.user, &v.uts,
    ]
    .iter()
    .all(|x| x.inode > 0)
}

fn valid_mapping(v: &Mapping) -> bool {
    v.uid_map.len() <= 8 && v.gid_map.len() <= 8
}
fn valid_target(v: &Target) -> bool {
    v.inode > 0
        && v.mount_id > 0
        && linux_abs(&v.mount_path, 256, false)
        && ascii_printable(&v.descriptor_access, 32)
}
fn valid_mount(v: &MountObservation) -> bool {
    v.mount_id > 0
        && linux_abs(&v.root, 4096, true)
        && linux_abs(&v.mount_point, 4096, true)
        && ascii_printable(&v.filesystem_type, 32)
        && text_no_control(&v.mount_source, 4096)
        && [&v.mount_options, &v.optional_fields, &v.super_options]
            .iter()
            .all(|x| x.len() <= 64 && strict_zeroizing(x, 256, ascii_printable))
}
fn valid_device(v: &Device) -> bool {
    linux_abs(&v.path, 256, false)
        && match v.r#type.as_str() {
            "character" => v.link_target.is_none(),
            "symlink" => {
                v.major == 0
                    && v.minor == 0
                    && v.link_target.as_ref().is_some_and(|x| valid_link_target(x))
            }
            _ => false,
        }
}
fn valid_cgroup(v: &Cgroup) -> bool {
    v.mount_id > 0
        && v.directory_inode > 0
        && v.cpu_quota > 0
        && v.cpu_period > 0
        && v.memory_max > 0
        && v.pids_max > 0
        && linux_abs(&v.membership_path, 4096, true)
        && v.controllers.len() <= 16
        && strict_zeroizing(&v.controllers, 32, ascii_printable)
}
fn valid_security(v: &SecurityObservation) -> bool {
    text_no_control(&v.apparmor_label, 256)
        && v.network_interfaces.len() <= 16
        && strict_zeroizing(&v.network_interfaces, 32, ascii_printable)
        && valid_digest(&v.security_recipe_digest)
}
fn valid_kernel(v: &KernelObservation) -> bool {
    valid_lower_uuid(&v.boot_id) && valid_digest(&v.kernel_recipe_digest)
}

fn valid_lower_uuid(value: &str) -> bool {
    let bytes = value.as_bytes();
    bytes.len() == 36
        && [8, 13, 18, 23].iter().all(|index| bytes[*index] == b'-')
        && bytes.iter().enumerate().all(|(index, byte)| {
            matches!(index, 8 | 13 | 18 | 23)
                || byte.is_ascii_digit()
                || (b'a'..=b'f').contains(byte)
        })
}

fn valid_link_target(v: &str) -> bool {
    matches!(
        v,
        "/proc/self/fd" | "/proc/self/fd/0" | "/proc/self/fd/1" | "/proc/self/fd/2" | "/proc/kcore"
    ) || relative_path(v, 256)
}
fn linux_abs(v: &str, max: usize, root: bool) -> bool {
    v.len() <= max && (root && v == "/" || (v.starts_with('/') && v != "/" && path_parts(&v[1..])))
}
fn relative_path(v: &str, max: usize) -> bool {
    !v.starts_with('/') && v.len() <= max && path_parts(v)
}
fn path_parts(v: &str) -> bool {
    !v.contains('\\')
        && !v.bytes().any(|b| b == 0 || b < 0x20 || b == 0x7f)
        && !v.ends_with('/')
        && v.split('/')
            .all(|x| !x.is_empty() && !matches!(x, "." | ".."))
}
fn text_no_control(v: &str, max: usize) -> bool {
    v.len() <= max && !v.chars().any(char::is_control)
}
fn ascii_printable(v: &str, max: usize) -> bool {
    !v.is_empty() && v.len() <= max && v.bytes().all(|b| (0x21..=0x7e).contains(&b))
}
fn hex16(v: &str) -> bool {
    v.len() == 16
        && v.bytes()
            .all(|b| b.is_ascii_digit() || (b'a'..=b'f').contains(&b))
}
fn sorted(v: &[u32]) -> bool {
    v.windows(2).all(|x| x[0] < x[1])
}
fn strict_by<T, F: Fn(&T) -> u64>(v: &[T], f: F) -> bool {
    v.windows(2).all(|x| f(&x[0]) < f(&x[1]))
}
fn strict_strings<T, F: Fn(&T) -> &Zeroizing<String>>(v: &[T], f: F) -> bool {
    v.windows(2).all(|x| f(&x[0]).as_str() < f(&x[1]).as_str())
}
fn strict_zeroizing(v: &[Zeroizing<String>], max: usize, check: fn(&str, usize) -> bool) -> bool {
    v.windows(2).all(|x| x[0].as_str() < x[1].as_str()) && v.iter().all(|x| check(x, max))
}
fn unique_env(v: &[Zeroizing<String>]) -> bool {
    let mut keys = std::collections::BTreeSet::new();
    v.iter().all(|entry| match entry.split_once('=') {
        Some((key, value)) => {
            key.len() <= 64
                && key.bytes().next().is_some_and(|x| x.is_ascii_uppercase())
                && key
                    .bytes()
                    .all(|x| x.is_ascii_uppercase() || x.is_ascii_digit() || x == b'_')
                && text_no_control(value, 1024)
                && keys.insert(key)
        }
        None => false,
    })
}

pub(super) fn valid_checks(checks: &[ProbeCheck]) -> bool {
    const IDS: [(&str, &[u32]); 5] = [
        ("mount_tmpfs_root", &[1]),
        ("unshare_mount_namespace", &[1]),
        ("setuid_root", &[1]),
        ("create_root_sentinel", &[13, 30]),
        ("connect_test_net", &[101]),
    ];
    checks.len() == IDS.len()
        && checks
            .iter()
            .zip(IDS)
            .all(|(c, (id, allowed))| c.id.as_str() == id && allowed.contains(&c.errno))
}
#[derive(Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
pub(super) struct ProbeCheck {
    errno: u32,
    id: Zeroizing<String>,
}
