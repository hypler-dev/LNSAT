//! Private supplied-body root declaration decoder; no native or authority proof.

use serde::de::{self, MapAccess, Visitor};
use serde::{Deserialize, Deserializer, Serialize};
use sha2::{Digest, Sha256};
use std::fmt;
use std::marker::PhantomData;
use std::rc::Rc;
use zeroize::Zeroizing;

const MAX_BODY: usize = 65_536;
const MAX_KEY: usize = 256;
const MAX_STRING: usize = 4_096;
const MAX_DEPTH: usize = 16;
const MAX_OBJECT: usize = 32;
const MAX_MEMBERS: usize = 2_048;
const MAX_ARRAY: usize = 128;
const MAX_ARRAYS: usize = 256;
const MAX_ARTIFACT: u64 = 256 * 1024 * 1024;
const MAX_BLOB: u64 = 1024 * 1024;
const MAX_DECLARED: u64 = 1024 * 1024 * 1024;
const DOMAIN_V1: &[u8] = b"lnsat.hcfg_root_implementation_manifest.v1\n";
const DOMAIN_V2: &[u8] = b"lnsat.hcfg_root_implementation_manifest.v2\n";
type Text = Zeroizing<String>;

#[derive(Debug, Eq, PartialEq)]
pub(super) enum RootManifestError {
    InputTooLarge,
    JsonSyntax,
    JsonLimits,
    JsonShape,
    Family,
    Claims,
    Layout,
    Canonical,
}
impl RootManifestError {
    pub(super) const fn code(&self) -> &'static str {
        match self {
            Self::InputTooLarge => "headless_root_manifest.input_too_large",
            Self::JsonSyntax => "headless_root_manifest.json_syntax",
            Self::JsonLimits => "headless_root_manifest.json_limits",
            Self::JsonShape => "headless_root_manifest.json_shape",
            Self::Family => "headless_root_manifest.family",
            Self::Claims => "headless_root_manifest.claims",
            Self::Layout => "headless_root_manifest.layout",
            Self::Canonical => "headless_root_manifest.canonical",
        }
    }
}

pub(super) struct UnverifiedRootManifest {
    manifest: RootManifest,
    canonical: Zeroizing<Vec<u8>>,
    commitment: Zeroizing<[u8; 32]>,
}

/// Synthetic supplied-body representation only; no native cache or path fact is proved.
pub(super) struct UnverifiedRootManifestLayout {
    manifest: RootManifestLayout,
    canonical: Zeroizing<Vec<u8>>,
    commitment: Zeroizing<[u8; 32]>,
}

macro_rules! closed_object {
    ($name:ident { $($field:ident : $ty:ty => $key:literal),* $(,)? }) => {
        #[derive(Serialize)]
        struct $name { $(#[serde(rename = $key)] $field: $ty,)* }
        impl<'de> Deserialize<'de> for $name {
            fn deserialize<D: Deserializer<'de>>(d: D) -> Result<Self, D::Error> {
                struct V;
                impl<'de> Visitor<'de> for V { type Value = $name;
                    fn expecting(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result { f.write_str("a closed root manifest object") }
                    fn visit_map<A: MapAccess<'de>>(self, mut m: A) -> Result<$name, A::Error> {
                        $(let mut $field = None;)*
                        while let Some(k) = m.next_key::<Text>()? { match k.as_str() {
                            $($key => set_once(&mut $field, m.next_value::<$ty>()?)?,)*
                            _ => return Err(de::Error::custom("unknown root manifest member")),
                        }}
                        Ok($name { $($field: required($field)?,)* })
                    }
                }
                d.deserialize_map(V)
            }
        }
    };
}
fn set_once<T, E: de::Error>(slot: &mut Option<T>, value: T) -> Result<(), E> {
    if slot.replace(value).is_some() {
        Err(E::custom("duplicate root manifest member"))
    } else {
        Ok(())
    }
}
fn required<T, E: de::Error>(value: Option<T>) -> Result<T, E> {
    value.ok_or_else(|| E::custom("missing root manifest member"))
}

// Field declaration order is ASCII key order. serde_json emits compact JSON in
// declaration order, giving the required recursive canonical representation.
closed_object!(RootManifest {
    administrators: Vec<u32> => "administrators", components: Vec<Component> => "components", contract_id: Text => "contract_id", controller: Identity => "controller", image: Image => "image", instance: Instance => "instance", kernel: Kernel => "kernel", mounts: Vec<MountRecord> => "mounts", recipe_digest: Text => "recipe_digest", schema_version: u32 => "schema_version", templates: Templates => "templates",
});
closed_object!(RootManifestLayout {
    administrators: Vec<u32> => "administrators", components: Vec<Component> => "components", contract_id: Text => "contract_id", controller: Identity => "controller", host_layout: HostLayout => "host_layout", image: Image => "image", instance: Instance => "instance", kernel: Kernel => "kernel", mounts: Vec<MountRecord> => "mounts", recipe_digest: Text => "recipe_digest", schema_version: u32 => "schema_version", templates: Templates => "templates",
});
closed_object!(Identity { gid: u32 => "gid", uid: u32 => "uid" });
closed_object!(FileRecord { digest: Text => "digest", path: Text => "path", size: u64 => "size" });
closed_object!(Kernel { active_lsms: Vec<Text> => "active_lsms", artifact: FileRecord => "artifact", build_provenance: FileRecord => "build_provenance", configuration: FileRecord => "configuration", release: Text => "release", source_commit: Text => "source_commit", source_ref: Text => "source_ref" });
closed_object!(Component { artifact: FileRecord => "artifact", build_provenance: FileRecord => "build_provenance", role: Text => "role", source_commit: Text => "source_commit", version: Text => "version" });
closed_object!(Templates { recipe_document: FileRecord => "recipe_document", source_commit: Text => "source_commit" });
closed_object!(Executable { device_major: u32 => "device_major", device_minor: u32 => "device_minor", inode: u64 => "inode" });
closed_object!(Endpoint { device_major: u32 => "device_major", device_minor: u32 => "device_minor", inode: u64 => "inode", path: Text => "path" });
closed_object!(Directory { device_major: u32 => "device_major", device_minor: u32 => "device_minor", inode: u64 => "inode", path: Text => "path" });
closed_object!(MetadataRoots { container_repository: Directory => "container_repository", daemon_root: Directory => "daemon_root", dedicated: bool => "dedicated", policy_id: Text => "policy_id" });
closed_object!(Instance { boot_id: Text => "boot_id", daemon_executable: Executable => "daemon_executable", daemon_gid: u32 => "daemon_gid", daemon_pid: u32 => "daemon_pid", daemon_start_ticks: u64 => "daemon_start_ticks", daemon_uid: u32 => "daemon_uid", endpoint: Endpoint => "endpoint", host_mount_namespace: u64 => "host_mount_namespace", host_user_namespace: u64 => "host_user_namespace", listener_kind: Text => "listener_kind", metadata_roots: MetadataRoots => "metadata_roots" });
closed_object!(MountRecord { device_major: u32 => "device_major", device_minor: u32 => "device_minor", filesystem_type: Text => "filesystem_type", host_mount_namespace: u64 => "host_mount_namespace", idmapped: bool => "idmapped", mount_id: u64 => "mount_id", mount_point: Text => "mount_point", root: Text => "root" });
closed_object!(Platform { architecture: Text => "architecture", os: Text => "os", variant: Text => "variant" });
closed_object!(ImageExecutable { container_path: Text => "container_path", snapshot: FileRecord => "snapshot" });
closed_object!(Image { adapter: ImageExecutable => "adapter", build_provenance: FileRecord => "build_provenance", config: FileRecord => "config", index: Option<FileRecord> => "index", manifest: FileRecord => "manifest", platform: Platform => "platform", probe: ImageExecutable => "probe" });
closed_object!(HostLayout { cpu_source: Text => "cpu_source", fixed_masks: Vec<MaskType> => "fixed_masks", lookup_policy: Text => "lookup_policy", possible_cpus: Vec<u32> => "possible_cpus", readonly_proc: Vec<PathType> => "readonly_proc", thermal_masks: Vec<ThermalType> => "thermal_masks" });
closed_object!(PathType { path: Text => "path", source_type: Text => "source_type" });
closed_object!(MaskType { mask_kind: Text => "mask_kind", path: Text => "path", source_type: Text => "source_type" });
closed_object!(ThermalType { cpu_id: u32 => "cpu_id", source_type: Text => "source_type" });

macro_rules! root_claim_view {
    ($name:ident, $inner:ty) => {
        pub(super) struct $name<'a> {
            value: &'a $inner,
            marker: PhantomData<Rc<()>>,
        }
        impl<'a> $name<'a> {
            fn new(value: &'a $inner) -> Self {
                Self {
                    value,
                    marker: PhantomData,
                }
            }
        }
    };
}
macro_rules! root_claim_collection {
    ($name:ident, $item:ty) => {
        pub(super) struct $name<'a> {
            values: &'a [$item],
            marker: PhantomData<Rc<()>>,
        }
        impl<'a> $name<'a> {
            fn new(values: &'a [$item]) -> Self {
                Self {
                    values,
                    marker: PhantomData,
                }
            }
            pub(super) fn len(&self) -> usize {
                self.values.len()
            }
            pub(super) fn is_empty(&self) -> bool {
                self.values.is_empty()
            }
        }
    };
}
root_claim_view!(RootManifestV1ClaimView, UnverifiedRootManifest);
root_claim_view!(RootManifestV2ClaimView, UnverifiedRootManifestLayout);
root_claim_view!(IdentityClaimView, Identity);
root_claim_view!(FileRecordClaimView, FileRecord);
root_claim_view!(KernelClaimView, Kernel);
root_claim_view!(ComponentClaimView, Component);
root_claim_view!(TemplatesClaimView, Templates);
root_claim_view!(ExecutableClaimView, Executable);
root_claim_view!(EndpointClaimView, Endpoint);
root_claim_view!(DirectoryClaimView, Directory);
root_claim_view!(MetadataRootsClaimView, MetadataRoots);
root_claim_view!(InstanceClaimView, Instance);
root_claim_view!(MountRecordClaimView, MountRecord);
root_claim_view!(PlatformClaimView, Platform);
root_claim_view!(ImageExecutableClaimView, ImageExecutable);
root_claim_view!(ImageClaimView, Image);
root_claim_view!(HostLayoutClaimView, HostLayout);
root_claim_view!(PathTypeClaimView, PathType);
root_claim_view!(MaskTypeClaimView, MaskType);
root_claim_view!(ThermalTypeClaimView, ThermalType);
root_claim_collection!(NumberClaims, u32);
root_claim_collection!(TextClaims, Text);
root_claim_collection!(ComponentClaims, Component);
root_claim_collection!(MountClaims, MountRecord);
root_claim_collection!(PathTypeClaims, PathType);
root_claim_collection!(MaskTypeClaims, MaskType);
root_claim_collection!(ThermalTypeClaims, ThermalType);

impl UnverifiedRootManifest {
    pub(super) fn candidate_view(&self) -> RootManifestV1ClaimView<'_> {
        RootManifestV1ClaimView::new(self)
    }
}
impl UnverifiedRootManifestLayout {
    pub(super) fn candidate_view(&self) -> RootManifestV2ClaimView<'_> {
        RootManifestV2ClaimView::new(self)
    }
}
macro_rules! root_common_view {
    ($ty:ident, $manifest:ident) => {
        impl<'a> $ty<'a> {
            pub(super) fn administrators(&self) -> NumberClaims<'a> {
                NumberClaims::new(&self.value.$manifest.administrators)
            }
            pub(super) fn components(&self) -> ComponentClaims<'a> {
                ComponentClaims::new(&self.value.$manifest.components)
            }
            pub(super) fn contract_id(&self) -> &'a str {
                self.value.$manifest.contract_id.as_str()
            }
            pub(super) fn controller(&self) -> IdentityClaimView<'a> {
                IdentityClaimView::new(&self.value.$manifest.controller)
            }
            pub(super) fn image(&self) -> ImageClaimView<'a> {
                ImageClaimView::new(&self.value.$manifest.image)
            }
            pub(super) fn instance(&self) -> InstanceClaimView<'a> {
                InstanceClaimView::new(&self.value.$manifest.instance)
            }
            pub(super) fn kernel(&self) -> KernelClaimView<'a> {
                KernelClaimView::new(&self.value.$manifest.kernel)
            }
            pub(super) fn mounts(&self) -> MountClaims<'a> {
                MountClaims::new(&self.value.$manifest.mounts)
            }
            pub(super) fn recipe_digest(&self) -> &'a str {
                self.value.$manifest.recipe_digest.as_str()
            }
            pub(super) fn schema_version(&self) -> u32 {
                self.value.$manifest.schema_version
            }
            pub(super) fn templates(&self) -> TemplatesClaimView<'a> {
                TemplatesClaimView::new(&self.value.$manifest.templates)
            }
            pub(super) fn canonical_bytes(&self) -> &'a [u8] {
                &self.value.canonical
            }
            pub(super) fn candidate_commitment(&self) -> &'a [u8; 32] {
                &self.value.commitment
            }
        }
    };
}
root_common_view!(RootManifestV1ClaimView, manifest);
root_common_view!(RootManifestV2ClaimView, manifest);
impl<'a> RootManifestV2ClaimView<'a> {
    pub(super) fn host_layout(&self) -> HostLayoutClaimView<'a> {
        HostLayoutClaimView::new(&self.value.manifest.host_layout)
    }
}
impl IdentityClaimView<'_> {
    pub(super) fn gid(&self) -> u32 {
        self.value.gid
    }
    pub(super) fn uid(&self) -> u32 {
        self.value.uid
    }
}
impl<'a> FileRecordClaimView<'a> {
    pub(super) fn digest(&self) -> &'a str {
        self.value.digest.as_str()
    }
    pub(super) fn path(&self) -> &'a str {
        self.value.path.as_str()
    }
    pub(super) fn size(&self) -> u64 {
        self.value.size
    }
}
impl<'a> KernelClaimView<'a> {
    pub(super) fn active_lsms(&self) -> TextClaims<'a> {
        TextClaims::new(&self.value.active_lsms)
    }
    pub(super) fn artifact(&self) -> FileRecordClaimView<'a> {
        FileRecordClaimView::new(&self.value.artifact)
    }
    pub(super) fn build_provenance(&self) -> FileRecordClaimView<'a> {
        FileRecordClaimView::new(&self.value.build_provenance)
    }
    pub(super) fn configuration(&self) -> FileRecordClaimView<'a> {
        FileRecordClaimView::new(&self.value.configuration)
    }
    pub(super) fn release(&self) -> &'a str {
        self.value.release.as_str()
    }
    pub(super) fn source_commit(&self) -> &'a str {
        self.value.source_commit.as_str()
    }
    pub(super) fn source_ref(&self) -> &'a str {
        self.value.source_ref.as_str()
    }
}
impl<'a> ComponentClaimView<'a> {
    pub(super) fn artifact(&self) -> FileRecordClaimView<'a> {
        FileRecordClaimView::new(&self.value.artifact)
    }
    pub(super) fn build_provenance(&self) -> FileRecordClaimView<'a> {
        FileRecordClaimView::new(&self.value.build_provenance)
    }
    pub(super) fn role(&self) -> &'a str {
        self.value.role.as_str()
    }
    pub(super) fn source_commit(&self) -> &'a str {
        self.value.source_commit.as_str()
    }
    pub(super) fn version(&self) -> &'a str {
        self.value.version.as_str()
    }
}
impl<'a> TemplatesClaimView<'a> {
    pub(super) fn recipe_document(&self) -> FileRecordClaimView<'a> {
        FileRecordClaimView::new(&self.value.recipe_document)
    }
    pub(super) fn source_commit(&self) -> &'a str {
        self.value.source_commit.as_str()
    }
}
impl ExecutableClaimView<'_> {
    pub(super) fn device_major(&self) -> u32 {
        self.value.device_major
    }
    pub(super) fn device_minor(&self) -> u32 {
        self.value.device_minor
    }
    pub(super) fn inode(&self) -> u64 {
        self.value.inode
    }
}
impl<'a> EndpointClaimView<'a> {
    pub(super) fn device_major(&self) -> u32 {
        self.value.device_major
    }
    pub(super) fn device_minor(&self) -> u32 {
        self.value.device_minor
    }
    pub(super) fn inode(&self) -> u64 {
        self.value.inode
    }
    pub(super) fn path(&self) -> &'a str {
        self.value.path.as_str()
    }
}
impl<'a> DirectoryClaimView<'a> {
    pub(super) fn device_major(&self) -> u32 {
        self.value.device_major
    }
    pub(super) fn device_minor(&self) -> u32 {
        self.value.device_minor
    }
    pub(super) fn inode(&self) -> u64 {
        self.value.inode
    }
    pub(super) fn path(&self) -> &'a str {
        self.value.path.as_str()
    }
}
impl<'a> MetadataRootsClaimView<'a> {
    pub(super) fn container_repository(&self) -> DirectoryClaimView<'a> {
        DirectoryClaimView::new(&self.value.container_repository)
    }
    pub(super) fn daemon_root(&self) -> DirectoryClaimView<'a> {
        DirectoryClaimView::new(&self.value.daemon_root)
    }
    pub(super) fn dedicated(&self) -> bool {
        self.value.dedicated
    }
    pub(super) fn policy_id(&self) -> &'a str {
        self.value.policy_id.as_str()
    }
}
impl<'a> InstanceClaimView<'a> {
    pub(super) fn boot_id(&self) -> &'a str {
        self.value.boot_id.as_str()
    }
    pub(super) fn daemon_executable(&self) -> ExecutableClaimView<'a> {
        ExecutableClaimView::new(&self.value.daemon_executable)
    }
    pub(super) fn daemon_gid(&self) -> u32 {
        self.value.daemon_gid
    }
    pub(super) fn daemon_pid(&self) -> u32 {
        self.value.daemon_pid
    }
    pub(super) fn daemon_start_ticks(&self) -> u64 {
        self.value.daemon_start_ticks
    }
    pub(super) fn daemon_uid(&self) -> u32 {
        self.value.daemon_uid
    }
    pub(super) fn endpoint(&self) -> EndpointClaimView<'a> {
        EndpointClaimView::new(&self.value.endpoint)
    }
    pub(super) fn host_mount_namespace(&self) -> u64 {
        self.value.host_mount_namespace
    }
    pub(super) fn host_user_namespace(&self) -> u64 {
        self.value.host_user_namespace
    }
    pub(super) fn listener_kind(&self) -> &'a str {
        self.value.listener_kind.as_str()
    }
    pub(super) fn metadata_roots(&self) -> MetadataRootsClaimView<'a> {
        MetadataRootsClaimView::new(&self.value.metadata_roots)
    }
}
impl<'a> MountRecordClaimView<'a> {
    pub(super) fn device_major(&self) -> u32 {
        self.value.device_major
    }
    pub(super) fn device_minor(&self) -> u32 {
        self.value.device_minor
    }
    pub(super) fn filesystem_type(&self) -> &'a str {
        self.value.filesystem_type.as_str()
    }
    pub(super) fn host_mount_namespace(&self) -> u64 {
        self.value.host_mount_namespace
    }
    pub(super) fn idmapped(&self) -> bool {
        self.value.idmapped
    }
    pub(super) fn mount_id(&self) -> u64 {
        self.value.mount_id
    }
    pub(super) fn mount_point(&self) -> &'a str {
        self.value.mount_point.as_str()
    }
    pub(super) fn root(&self) -> &'a str {
        self.value.root.as_str()
    }
}
impl<'a> PlatformClaimView<'a> {
    pub(super) fn architecture(&self) -> &'a str {
        self.value.architecture.as_str()
    }
    pub(super) fn os(&self) -> &'a str {
        self.value.os.as_str()
    }
    pub(super) fn variant(&self) -> &'a str {
        self.value.variant.as_str()
    }
}
impl<'a> ImageExecutableClaimView<'a> {
    pub(super) fn container_path(&self) -> &'a str {
        self.value.container_path.as_str()
    }
    pub(super) fn snapshot(&self) -> FileRecordClaimView<'a> {
        FileRecordClaimView::new(&self.value.snapshot)
    }
}
impl<'a> ImageClaimView<'a> {
    pub(super) fn adapter(&self) -> ImageExecutableClaimView<'a> {
        ImageExecutableClaimView::new(&self.value.adapter)
    }
    pub(super) fn build_provenance(&self) -> FileRecordClaimView<'a> {
        FileRecordClaimView::new(&self.value.build_provenance)
    }
    pub(super) fn config(&self) -> FileRecordClaimView<'a> {
        FileRecordClaimView::new(&self.value.config)
    }
    pub(super) fn index(&self) -> Option<FileRecordClaimView<'a>> {
        self.value.index.as_ref().map(FileRecordClaimView::new)
    }
    pub(super) fn manifest(&self) -> FileRecordClaimView<'a> {
        FileRecordClaimView::new(&self.value.manifest)
    }
    pub(super) fn platform(&self) -> PlatformClaimView<'a> {
        PlatformClaimView::new(&self.value.platform)
    }
    pub(super) fn probe(&self) -> ImageExecutableClaimView<'a> {
        ImageExecutableClaimView::new(&self.value.probe)
    }
}
impl<'a> HostLayoutClaimView<'a> {
    pub(super) fn cpu_source(&self) -> &'a str {
        self.value.cpu_source.as_str()
    }
    pub(super) fn fixed_masks(&self) -> MaskTypeClaims<'a> {
        MaskTypeClaims::new(&self.value.fixed_masks)
    }
    pub(super) fn lookup_policy(&self) -> &'a str {
        self.value.lookup_policy.as_str()
    }
    pub(super) fn possible_cpus(&self) -> NumberClaims<'a> {
        NumberClaims::new(&self.value.possible_cpus)
    }
    pub(super) fn readonly_proc(&self) -> PathTypeClaims<'a> {
        PathTypeClaims::new(&self.value.readonly_proc)
    }
    pub(super) fn thermal_masks(&self) -> ThermalTypeClaims<'a> {
        ThermalTypeClaims::new(&self.value.thermal_masks)
    }
}
impl<'a> PathTypeClaimView<'a> {
    pub(super) fn path(&self) -> &'a str {
        self.value.path.as_str()
    }
    pub(super) fn source_type(&self) -> &'a str {
        self.value.source_type.as_str()
    }
}
impl<'a> MaskTypeClaimView<'a> {
    pub(super) fn mask_kind(&self) -> &'a str {
        self.value.mask_kind.as_str()
    }
    pub(super) fn path(&self) -> &'a str {
        self.value.path.as_str()
    }
    pub(super) fn source_type(&self) -> &'a str {
        self.value.source_type.as_str()
    }
}
impl<'a> ThermalTypeClaimView<'a> {
    pub(super) fn cpu_id(&self) -> u32 {
        self.value.cpu_id
    }
    pub(super) fn source_type(&self) -> &'a str {
        self.value.source_type.as_str()
    }
}
impl NumberClaims<'_> {
    pub(super) fn get(&self, index: usize) -> Option<u32> {
        self.values.get(index).copied()
    }
}
impl<'a> TextClaims<'a> {
    pub(super) fn get(&self, index: usize) -> Option<&'a str> {
        self.values.get(index).map(|value| value.as_str())
    }
}
impl<'a> ComponentClaims<'a> {
    pub(super) fn get(&self, index: usize) -> Option<ComponentClaimView<'a>> {
        self.values.get(index).map(ComponentClaimView::new)
    }
}
impl<'a> MountClaims<'a> {
    pub(super) fn get(&self, index: usize) -> Option<MountRecordClaimView<'a>> {
        self.values.get(index).map(MountRecordClaimView::new)
    }
}
impl<'a> PathTypeClaims<'a> {
    pub(super) fn get(&self, index: usize) -> Option<PathTypeClaimView<'a>> {
        self.values.get(index).map(PathTypeClaimView::new)
    }
}
impl<'a> MaskTypeClaims<'a> {
    pub(super) fn get(&self, index: usize) -> Option<MaskTypeClaimView<'a>> {
        self.values.get(index).map(MaskTypeClaimView::new)
    }
}
impl<'a> ThermalTypeClaims<'a> {
    pub(super) fn get(&self, index: usize) -> Option<ThermalTypeClaimView<'a>> {
        self.values.get(index).map(ThermalTypeClaimView::new)
    }
}

pub(super) fn decode_root_manifest_claim(
    input: &[u8],
) -> Result<UnverifiedRootManifest, RootManifestError> {
    preflight(input)?;
    let manifest: RootManifest =
        serde_json::from_slice(input).map_err(|_| RootManifestError::JsonShape)?;
    validate(&manifest)?;
    let mut canonical = Zeroizing::new(Vec::new());
    serde_json::to_writer(&mut *canonical, &manifest).map_err(|_| RootManifestError::Canonical)?;
    let mut hash = Sha256::new();
    hash.update(DOMAIN_V1);
    hash.update(&*canonical);
    let mut commitment = Zeroizing::new([0_u8; 32]);
    hash.finalize_into((&mut *commitment).into());
    Ok(UnverifiedRootManifest {
        manifest,
        canonical,
        commitment,
    })
}

pub(super) fn decode_root_manifest_layout_claim(
    input: &[u8],
) -> Result<UnverifiedRootManifestLayout, RootManifestError> {
    preflight(input)?;
    let manifest: RootManifestLayout =
        serde_json::from_slice(input).map_err(|_| RootManifestError::JsonShape)?;
    validate_layout_manifest(&manifest)?;
    let mut canonical = Zeroizing::new(Vec::new());
    serde_json::to_writer(&mut *canonical, &manifest).map_err(|_| RootManifestError::Canonical)?;
    if canonical.len() > MAX_BODY {
        return Err(RootManifestError::Canonical);
    }
    let mut hash = Sha256::new();
    hash.update(DOMAIN_V2);
    hash.update(&*canonical);
    let mut commitment = Zeroizing::new([0_u8; 32]);
    hash.finalize_into((&mut *commitment).into());
    Ok(UnverifiedRootManifestLayout {
        manifest,
        canonical,
        commitment,
    })
}

fn validate(m: &RootManifest) -> Result<(), RootManifestError> {
    if m.contract_id.as_str() != "lnsat.hcfg_root_implementation_manifest.v1"
        || m.schema_version != 1
    {
        return Err(RootManifestError::Family);
    }
    validate_common(&CommonRootFields::from(m))
}

struct CommonRootFields<'a> {
    administrators: &'a [u32],
    components: &'a [Component],
    controller: &'a Identity,
    image: &'a Image,
    instance: &'a Instance,
    kernel: &'a Kernel,
    mounts: &'a [MountRecord],
    recipe_digest: &'a Text,
    templates: &'a Templates,
}

impl<'a> From<&'a RootManifest> for CommonRootFields<'a> {
    fn from(m: &'a RootManifest) -> Self {
        Self {
            administrators: &m.administrators,
            components: &m.components,
            controller: &m.controller,
            image: &m.image,
            instance: &m.instance,
            kernel: &m.kernel,
            mounts: &m.mounts,
            recipe_digest: &m.recipe_digest,
            templates: &m.templates,
        }
    }
}

impl<'a> From<&'a RootManifestLayout> for CommonRootFields<'a> {
    fn from(m: &'a RootManifestLayout) -> Self {
        Self {
            administrators: &m.administrators,
            components: &m.components,
            controller: &m.controller,
            image: &m.image,
            instance: &m.instance,
            kernel: &m.kernel,
            mounts: &m.mounts,
            recipe_digest: &m.recipe_digest,
            templates: &m.templates,
        }
    }
}

fn validate_common(m: &CommonRootFields<'_>) -> Result<(), RootManifestError> {
    if !digest(m.recipe_digest) {
        return Err(RootManifestError::Claims);
    }
    identity(m.controller, true)?;
    if m.administrators.len() > 16
        || !strictly_increasing(m.administrators)
        || m.administrators
            .iter()
            .any(|&u| u == 0 || u == u32::MAX || u == m.controller.uid)
    {
        return Err(RootManifestError::Claims);
    }
    kernel(m.kernel)?;
    components(m.components)?;
    templates(m.templates)?;
    instance(m.instance)?;
    mounts(m.mounts, m.instance.host_mount_namespace)?;
    image(m.image)?;
    let sizes = declared_sizes(m)?;
    if sizes > MAX_DECLARED {
        return Err(RootManifestError::Claims);
    }
    Ok(())
}
fn identity(v: &Identity, positive: bool) -> Result<(), RootManifestError> {
    if v.uid == u32::MAX || v.gid == u32::MAX || (positive && (v.uid == 0 || v.gid == 0)) {
        Err(RootManifestError::Claims)
    } else {
        Ok(())
    }
}
fn kernel(v: &Kernel) -> Result<(), RootManifestError> {
    if v.source_ref.as_str() != "v6.8"
        || !commit(&v.source_commit)
        || !printable(&v.release, 1, 128)
        || !(1..=16).contains(&v.active_lsms.len())
        || !unique_lsms(&v.active_lsms)
    {
        return Err(RootManifestError::Claims);
    }
    for f in [&v.artifact, &v.build_provenance, &v.configuration] {
        artifact(f)?;
    }
    Ok(())
}
fn components(v: &[Component]) -> Result<(), RootManifestError> {
    let roles = ["dockerd", "containerd", "runc", "shim", "host_git"];
    let versions = ["29.8.2", "2.3.6", "1.5.2"];
    if v.len() != roles.len() {
        return Err(RootManifestError::Claims);
    }
    for (i, c) in v.iter().enumerate() {
        if c.role.as_str() != roles[i]
            || !printable(&c.version, 1, 128)
            || !commit(&c.source_commit)
        {
            return Err(RootManifestError::Claims);
        }
        if i < 3 && c.version.as_str() != versions[i] {
            return Err(RootManifestError::Claims);
        }
        if i == 0 && c.source_commit.as_str() != "8af9fe3a36bab3e039862a2ab1cef1880c9b4d03" {
            return Err(RootManifestError::Claims);
        }
        artifact(&c.artifact)?;
        artifact(&c.build_provenance)?;
    }
    Ok(())
}
fn templates(v: &Templates) -> Result<(), RootManifestError> {
    if v.source_commit.as_str() != "8af9fe3a36bab3e039862a2ab1cef1880c9b4d03" {
        return Err(RootManifestError::Claims);
    }
    artifact(&v.recipe_document)
}
fn instance(v: &Instance) -> Result<(), RootManifestError> {
    if v.listener_kind.as_str() != "direct_dockerd_unix"
        || !uuid(&v.boot_id)
        || v.daemon_pid == 0
        || v.daemon_uid != 0
        || v.daemon_gid != 0
        || v.daemon_start_ticks == 0
        || v.host_mount_namespace == 0
        || v.host_user_namespace == 0
        || v.daemon_executable.inode == 0
        || v.endpoint.inode == 0
        || !path(&v.endpoint.path, false, 100)
    {
        return Err(RootManifestError::Claims);
    }
    let r = &v.metadata_roots;
    if r.policy_id.as_str() != "lnsat.hcfg_docker_metadata_acl.v1"
        || !r.dedicated
        || !directory(&r.daemon_root)
        || !directory(&r.container_repository)
        || r.container_repository
            .path
            .strip_prefix(r.daemon_root.path.as_str())
            != Some("/containers")
    {
        return Err(RootManifestError::Claims);
    }
    Ok(())
}
fn directory(v: &Directory) -> bool {
    v.inode > 0 && path(&v.path, false, MAX_STRING)
}
fn mounts(v: &[MountRecord], namespace: u64) -> Result<(), RootManifestError> {
    if v.is_empty() || v.len() > 128 {
        return Err(RootManifestError::Claims);
    }
    let mut prior = 0;
    for m in v {
        if m.mount_id == 0
            || m.mount_id <= prior
            || m.filesystem_type.as_str() != "ext4"
            || m.idmapped
            || m.host_mount_namespace != namespace
            || !path(&m.root, true, MAX_STRING)
            || !path(&m.mount_point, true, MAX_STRING)
        {
            return Err(RootManifestError::Claims);
        }
        prior = m.mount_id;
    }
    Ok(())
}
fn image(v: &Image) -> Result<(), RootManifestError> {
    if !platform(&v.platform)
        || !path(&v.adapter.container_path, false, 256)
        || !path(&v.probe.container_path, false, 256)
        || overlap(&v.adapter.container_path, &v.probe.container_path)
    {
        return Err(RootManifestError::Claims);
    }
    blob(&v.config)?;
    blob(&v.manifest)?;
    if let Some(i) = &v.index {
        blob(i)?;
    }
    artifact(&v.adapter.snapshot)?;
    artifact(&v.probe.snapshot)?;
    artifact(&v.build_provenance)?;
    if v.config.digest == v.manifest.digest
        || v.index
            .as_ref()
            .is_some_and(|i| i.digest == v.config.digest || i.digest == v.manifest.digest)
    {
        return Err(RootManifestError::Claims);
    }
    Ok(())
}
fn artifact(v: &FileRecord) -> Result<(), RootManifestError> {
    if v.size == 0
        || v.size > MAX_ARTIFACT
        || !path(&v.path, false, MAX_STRING)
        || !digest(&v.digest)
    {
        Err(RootManifestError::Claims)
    } else {
        Ok(())
    }
}
fn blob(v: &FileRecord) -> Result<(), RootManifestError> {
    if v.size == 0 || v.size > MAX_BLOB || !path(&v.path, false, MAX_STRING) || !digest(&v.digest) {
        Err(RootManifestError::Claims)
    } else {
        Ok(())
    }
}
fn declared_sizes(m: &CommonRootFields<'_>) -> Result<u64, RootManifestError> {
    let mut n = 0u64;
    let mut add = |f: &FileRecord| -> Result<(), RootManifestError> {
        n = n.checked_add(f.size).ok_or(RootManifestError::Claims)?;
        Ok(())
    };
    for f in [
        &m.kernel.artifact,
        &m.kernel.build_provenance,
        &m.kernel.configuration,
        &m.templates.recipe_document,
        &m.image.adapter.snapshot,
        &m.image.probe.snapshot,
        &m.image.build_provenance,
        &m.image.config,
        &m.image.manifest,
    ] {
        add(f)?;
    }
    if let Some(i) = &m.image.index {
        add(i)?;
    }
    for c in m.components {
        add(&c.artifact)?;
        add(&c.build_provenance)?;
    }
    Ok(n)
}

fn validate_layout_manifest(m: &RootManifestLayout) -> Result<(), RootManifestError> {
    if m.contract_id.as_str() != "lnsat.hcfg_root_implementation_manifest.v2"
        || m.schema_version != 2
    {
        return Err(RootManifestError::Family);
    }
    validate_common(&CommonRootFields::from(m))?;
    validate_layout(&m.host_layout)
}

const READONLY_PROC_PATHS: [&str; 5] = [
    "/proc/bus",
    "/proc/fs",
    "/proc/irq",
    "/proc/sys",
    "/proc/sysrq-trigger",
];
const FIXED_MASK_PATHS: [&str; 12] = [
    "/proc/acpi",
    "/proc/asound",
    "/proc/interrupts",
    "/proc/kcore",
    "/proc/keys",
    "/proc/latency_stats",
    "/proc/sched_debug",
    "/proc/scsi",
    "/proc/timer_list",
    "/proc/timer_stats",
    "/sys/devices/virtual/powercap",
    "/sys/firmware",
];

fn validate_layout(v: &HostLayout) -> Result<(), RootManifestError> {
    if v.cpu_source.as_str() != "sysfs_possible"
        || v.lookup_policy.as_str() != "present_directory_or_enoent"
        || !(1..=64).contains(&v.possible_cpus.len())
        || v.possible_cpus.iter().any(|cpu| *cpu > 65_535)
        || !strictly_increasing(&v.possible_cpus)
        || v.readonly_proc.len() != READONLY_PROC_PATHS.len()
        || v.fixed_masks.len() != FIXED_MASK_PATHS.len()
        || v.thermal_masks.len() > 64
    {
        return Err(RootManifestError::Layout);
    }
    for (record, path) in v.readonly_proc.iter().zip(READONLY_PROC_PATHS) {
        if record.path.as_str() != path || !source_type(&record.source_type) {
            return Err(RootManifestError::Layout);
        }
    }
    for (record, path) in v.fixed_masks.iter().zip(FIXED_MASK_PATHS) {
        if record.path.as_str() != path || !mask_relation(&record.source_type, &record.mask_kind) {
            return Err(RootManifestError::Layout);
        }
    }
    let mut prior = None;
    for thermal in &v.thermal_masks {
        if thermal.cpu_id > 65_535
            || prior.is_some_and(|cpu| cpu >= thermal.cpu_id)
            || v.possible_cpus.binary_search(&thermal.cpu_id).is_err()
            || thermal.source_type.as_str() != "directory"
        {
            return Err(RootManifestError::Layout);
        }
        prior = Some(thermal.cpu_id);
    }
    Ok(())
}

fn source_type(value: &str) -> bool {
    matches!(
        value,
        "absent"
            | "regular_file"
            | "directory"
            | "character_device"
            | "block_device"
            | "fifo"
            | "socket"
    )
}

fn mask_relation(source_type: &str, mask_kind: &str) -> bool {
    match source_type {
        "absent" => mask_kind == "absent",
        "directory" => mask_kind == "directory_tmpfs",
        "regular_file" | "character_device" | "block_device" | "fifo" | "socket" => {
            mask_kind == "null_device_bind"
        }
        _ => false,
    }
}
fn digest(v: &str) -> bool {
    v.strip_prefix("sha256:").is_some_and(hex64)
}
fn commit(v: &str) -> bool {
    v.len() == 40
        && v.bytes()
            .all(|b| b.is_ascii_digit() || matches!(b, b'a'..=b'f'))
}
fn hex64(v: &str) -> bool {
    v.len() == 64
        && v.bytes()
            .all(|b| b.is_ascii_digit() || matches!(b, b'a'..=b'f'))
}
fn printable(v: &str, min: usize, max: usize) -> bool {
    (min..=max).contains(&v.len()) && v.bytes().all(|b| (0x20..=0x7e).contains(&b))
}
fn unique_lsms(v: &[Text]) -> bool {
    v.iter().enumerate().all(|(i, s)| {
        s.len() <= 32
            && !s.is_empty()
            && s.bytes().next().is_some_and(|b| b.is_ascii_lowercase())
            && s.bytes()
                .all(|b| b.is_ascii_lowercase() || b.is_ascii_digit() || b == b'_')
            && !v[..i].iter().any(|x| x == s)
    })
}
fn uuid(v: &str) -> bool {
    v.len() == 36
        && v.bytes().enumerate().all(|(i, b)| {
            matches!(i, 8 | 13 | 18 | 23) && b == b'-'
                || !matches!(i, 8 | 13 | 18 | 23)
                    && (b.is_ascii_digit() || matches!(b, b'a'..=b'f'))
        })
}
fn path(v: &str, allow_root: bool, maximum: usize) -> bool {
    v.len() <= maximum
        && !v.bytes().any(|b| b < 0x20 || b == 0x7f || b == b'\\')
        && (allow_root && v == "/"
            || v.strip_prefix('/').is_some_and(|tail| {
                !tail.is_empty()
                    && tail
                        .split('/')
                        .all(|p| !p.is_empty() && p != "." && p != "..")
            }))
}
fn platform(v: &Platform) -> bool {
    v.os.as_str() == "linux"
        && !v.architecture.is_empty()
        && v.architecture.len() <= 32
        && v.architecture
            .bytes()
            .all(|b| b.is_ascii_lowercase() || b.is_ascii_digit() || b == b'_')
        && printable(&v.variant, 0, 32)
}
fn overlap(a: &str, b: &str) -> bool {
    a == b
        || a.strip_prefix(b).is_some_and(|s| s.starts_with('/'))
        || b.strip_prefix(a).is_some_and(|s| s.starts_with('/'))
}
fn strictly_increasing(v: &[u32]) -> bool {
    v.windows(2).all(|x| x[0] < x[1])
}

#[derive(Copy, Clone)]
enum ScanError {
    Syntax,
    Limits,
}
impl ScanError {
    const fn decode(self) -> RootManifestError {
        match self {
            Self::Syntax => RootManifestError::JsonSyntax,
            Self::Limits => RootManifestError::JsonLimits,
        }
    }
}
fn preflight(bytes: &[u8]) -> Result<(), RootManifestError> {
    if bytes.len() > MAX_BODY {
        return Err(RootManifestError::InputTooLarge);
    }
    if std::str::from_utf8(bytes).is_err() {
        return Err(RootManifestError::JsonSyntax);
    }
    let mut s = Scanner::new(bytes);
    s.document().map_err(ScanError::decode)
}
struct Scanner<'a> {
    b: &'a [u8],
    p: usize,
    members: usize,
    elements: usize,
}
impl<'a> Scanner<'a> {
    const fn new(b: &'a [u8]) -> Self {
        Self {
            b,
            p: 0,
            members: 0,
            elements: 0,
        }
    }
    fn document(&mut self) -> Result<(), ScanError> {
        self.ws();
        self.value(1)?;
        self.ws();
        if self.p == self.b.len() {
            Ok(())
        } else {
            Err(ScanError::Syntax)
        }
    }
    fn value(&mut self, d: usize) -> Result<(), ScanError> {
        match self.cur() {
            Some(b'{') => self.object(d),
            Some(b'[') => self.array(d),
            Some(b'"') => self.string(MAX_STRING, false),
            Some(b't') => self.keyword(b"true"),
            Some(b'f') => self.keyword(b"false"),
            Some(b'n') => self.keyword(b"null"),
            Some(b'-' | b'0'..=b'9') => self.number(),
            _ => Err(ScanError::Syntax),
        }
    }
    fn object(&mut self, d: usize) -> Result<(), ScanError> {
        if d > MAX_DEPTH {
            return Err(ScanError::Limits);
        }
        self.p += 1;
        self.ws();
        if self.take(b'}') {
            return Ok(());
        }
        let mut n = 0;
        loop {
            if n == MAX_OBJECT || self.members == MAX_MEMBERS {
                return Err(ScanError::Limits);
            }
            self.string(MAX_KEY, true)?;
            n += 1;
            self.members += 1;
            self.ws();
            self.need(b':')?;
            self.ws();
            self.value(d + 1)?;
            self.ws();
            if self.take(b'}') {
                return Ok(());
            }
            self.need(b',')?;
            self.ws();
            if self.cur() == Some(b'}') {
                return Err(ScanError::Syntax);
            }
        }
    }
    fn array(&mut self, d: usize) -> Result<(), ScanError> {
        if d > MAX_DEPTH {
            return Err(ScanError::Limits);
        }
        self.p += 1;
        self.ws();
        if self.take(b']') {
            return Ok(());
        }
        let mut n = 0;
        loop {
            if n == MAX_ARRAY || self.elements == MAX_ARRAYS {
                return Err(ScanError::Limits);
            }
            self.elements += 1;
            n += 1;
            self.value(d + 1)?;
            self.ws();
            if self.take(b']') {
                return Ok(());
            }
            self.need(b',')?;
            self.ws();
            if self.cur() == Some(b']') {
                return Err(ScanError::Syntax);
            }
        }
    }
    fn string(&mut self, max: usize, nonempty: bool) -> Result<(), ScanError> {
        self.need(b'"')?;
        let mut n = 0;
        loop {
            match self.cur().ok_or(ScanError::Syntax)? {
                b'"' => {
                    self.p += 1;
                    if nonempty && n == 0 {
                        return Err(ScanError::Limits);
                    }
                    return Ok(());
                }
                0..=0x1f => return Err(ScanError::Syntax),
                b'\\' => {
                    self.p += 1;
                    match self.cur().ok_or(ScanError::Syntax)? {
                        b'"' | b'\\' | b'/' | b'b' | b'f' | b'n' | b'r' | b't' => {
                            self.p += 1;
                            Self::add(&mut n, 1, max)?;
                        }
                        b'u' => {
                            self.p += 1;
                            let h = self.hex()?;
                            let scalar = if (0xd800..=0xdbff).contains(&h) {
                                self.need(b'\\')?;
                                self.need(b'u')?;
                                let l = self.hex()?;
                                if !(0xdc00..=0xdfff).contains(&l) {
                                    return Err(ScanError::Syntax);
                                }
                                0x10000
                                    + (((u32::from(h) - 0xd800) << 10) | (u32::from(l) - 0xdc00))
                            } else if (0xdc00..=0xdfff).contains(&h) {
                                return Err(ScanError::Syntax);
                            } else {
                                u32::from(h)
                            };
                            let w = char::from_u32(scalar).ok_or(ScanError::Syntax)?.len_utf8();
                            Self::add(&mut n, w, max)?;
                        }
                        _ => return Err(ScanError::Syntax),
                    }
                }
                _ => {
                    self.p += 1;
                    Self::add(&mut n, 1, max)?;
                }
            }
        }
    }
    fn hex(&mut self) -> Result<u16, ScanError> {
        let mut v = 0;
        for _ in 0..4 {
            let x = match self.cur().ok_or(ScanError::Syntax)? {
                b'0'..=b'9' => self.cur().unwrap() - b'0',
                b'a'..=b'f' => self.cur().unwrap() - b'a' + 10,
                b'A'..=b'F' => self.cur().unwrap() - b'A' + 10,
                _ => return Err(ScanError::Syntax),
            };
            v = (v << 4) | u16::from(x);
            self.p += 1;
        }
        Ok(v)
    }
    fn number(&mut self) -> Result<(), ScanError> {
        self.take(b'-');
        match self.cur() {
            Some(b'0') => {
                self.p += 1;
                if matches!(self.cur(), Some(b'0'..=b'9')) {
                    return Err(ScanError::Syntax);
                }
            }
            Some(b'1'..=b'9') => {
                self.p += 1;
                while matches!(self.cur(), Some(b'0'..=b'9')) {
                    self.p += 1;
                }
            }
            _ => return Err(ScanError::Syntax),
        }
        if self.take(b'.') {
            self.digits()?;
        }
        if matches!(self.cur(), Some(b'e' | b'E')) {
            self.p += 1;
            if !self.take(b'+') {
                self.take(b'-');
            }
            self.digits()?;
        }
        Ok(())
    }
    fn digits(&mut self) -> Result<(), ScanError> {
        if !matches!(self.cur(), Some(b'0'..=b'9')) {
            return Err(ScanError::Syntax);
        }
        while matches!(self.cur(), Some(b'0'..=b'9')) {
            self.p += 1;
        }
        Ok(())
    }
    fn keyword(&mut self, k: &[u8]) -> Result<(), ScanError> {
        let e = self.p.checked_add(k.len()).ok_or(ScanError::Syntax)?;
        if self.b.get(self.p..e) == Some(k) {
            self.p = e;
            Ok(())
        } else {
            Err(ScanError::Syntax)
        }
    }
    fn ws(&mut self) {
        while matches!(self.cur(), Some(b' ' | b'\n' | b'\r' | b'\t')) {
            self.p += 1;
        }
    }
    fn cur(&self) -> Option<u8> {
        self.b.get(self.p).copied()
    }
    fn take(&mut self, x: u8) -> bool {
        if self.cur() == Some(x) {
            self.p += 1;
            true
        } else {
            false
        }
    }
    fn need(&mut self, x: u8) -> Result<(), ScanError> {
        if self.take(x) {
            Ok(())
        } else {
            Err(ScanError::Syntax)
        }
    }
    fn add(n: &mut usize, a: usize, max: usize) -> Result<(), ScanError> {
        *n = n.checked_add(a).ok_or(ScanError::Limits)?;
        if *n > max {
            Err(ScanError::Limits)
        } else {
            Ok(())
        }
    }
}

#[cfg(test)]
#[path = "headless_root_manifest_tests.rs"]
mod tests;
