//! Unverified owner-binding input for the first headless Docker Git backend.
//!
//! Decoding never opens a path, observes an OS control, or creates authority.

use super::parser::ResourceKind;
use super::{HeadlessConfigDeclarationV1, compose_headless_config_declaration_v1};
use crate::{CONTRACT_VERSION_V1_0, is_valid_reference_v1};
use serde::Deserialize;
use serde_json::{Value, json};
use sha2::{Digest, Sha256};
use std::fmt;

/// Exact owner-binding declaration schema.
pub const HEADLESS_RESOURCE_BINDINGS_SCHEMA_V1: &str = "lnsat.resource_bindings.v1";
/// Maximum encoded UTF-8 JSON bytes.
pub const MAX_HEADLESS_RESOURCE_BINDINGS_BYTES_V1: usize = 65_536;
/// Parser ceiling, not a supported backend resource-count promise.
pub const MAX_HEADLESS_RESOURCE_BINDINGS_ROWS_V1: usize = 128;
/// Maximum UTF-8 bytes in a decoded, syntactically absolute source path.
pub const MAX_HEADLESS_RESOURCE_BINDING_PATH_BYTES_V1: usize = 4_096;

/// Closed public-safe failures containing no caller data.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum HeadlessResourceBindingsErrorV1 {
    InvalidSize,
    InvalidJson,
    UnsupportedContract,
    InvalidReference,
    NoncanonicalCollection,
    DeclarationMismatch,
    UnsupportedCapability,
    InvalidPath,
    OverlappingPaths,
    InvalidDeclaration,
}

impl HeadlessResourceBindingsErrorV1 {
    /// Fixed diagnostic code, without input values or parser details.
    #[must_use]
    pub const fn code(self) -> &'static str {
        match self {
            Self::InvalidSize => "headless_resource_bindings.invalid_size",
            Self::InvalidJson => "headless_resource_bindings.invalid_json",
            Self::UnsupportedContract => "headless_resource_bindings.unsupported_contract",
            Self::InvalidReference => "headless_resource_bindings.invalid_reference",
            Self::NoncanonicalCollection => "headless_resource_bindings.noncanonical_collection",
            Self::DeclarationMismatch => "headless_resource_bindings.declaration_mismatch",
            Self::UnsupportedCapability => "headless_resource_bindings.unsupported_capability",
            Self::InvalidPath => "headless_resource_bindings.invalid_path",
            Self::OverlappingPaths => "headless_resource_bindings.overlapping_paths",
            Self::InvalidDeclaration => "headless_resource_bindings.invalid_declaration",
        }
    }
}

impl fmt::Display for HeadlessResourceBindingsErrorV1 {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(self.code())
    }
}

impl std::error::Error for HeadlessResourceBindingsErrorV1 {}

/// The two declared resource kinds selected by the first engineering backend.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum HeadlessResourceBindingKindV1 {
    Repository,
    RuntimeProfile,
}

impl HeadlessResourceBindingKindV1 {
    /// Exact declaration token. This does not establish verifier coverage.
    #[must_use]
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Repository => "repository",
            Self::RuntimeProfile => "runtime_profile",
        }
    }
}

/// Paired untrusted source locator and asserted HCFG identity.
///
/// No serializer or caller constructor exists. A future trusted verifier must
/// independently observe the object and compare its persistent identity with
/// `asserted_identity_digest`; this input is never such an observation.
#[derive(Eq, PartialEq)]
pub struct HeadlessResourceBindingV1 {
    resource_ref: String,
    kind: HeadlessResourceBindingKindV1,
    source_path: String,
    asserted_identity_digest: String,
}

impl HeadlessResourceBindingV1 {
    /// Unverified caller reference, for the future private verifier.
    #[must_use]
    pub fn resource_ref(&self) -> &str {
        &self.resource_ref
    }

    /// Declared kind, without an enforcement or activation claim.
    #[must_use]
    pub const fn kind(&self) -> HeadlessResourceBindingKindV1 {
        self.kind
    }

    /// Private caller path with canonical syntax only; never log this value.
    #[must_use]
    pub fn source_path(&self) -> &str {
        &self.source_path
    }

    /// Exact assertion from the matching sealed HCFG resource, not proof.
    #[must_use]
    pub fn asserted_identity_digest(&self) -> &str {
        &self.asserted_identity_digest
    }
}

impl fmt::Debug for HeadlessResourceBindingV1 {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str("HeadlessResourceBindingV1 { unverified: true }")
    }
}

/// Sealed declaration input, with no identity, owner or activation authority.
#[derive(Eq, PartialEq)]
pub struct HeadlessResourceBindingsV1 {
    installation_ref: String,
    bindings: Vec<HeadlessResourceBindingV1>,
    binding_digest: String,
    declaration_digest: String,
}

impl HeadlessResourceBindingsV1 {
    /// Exact unverified installation reference from both input declarations.
    #[must_use]
    pub fn installation_ref(&self) -> &str {
        &self.installation_ref
    }

    /// Unverified locators paired with every original HCFG resource assertion.
    #[must_use]
    pub fn bindings(&self) -> &[HeadlessResourceBindingV1] {
        &self.bindings
    }

    /// Commitment to canonical binding input, not physical identity evidence.
    #[must_use]
    pub fn binding_digest(&self) -> &str {
        &self.binding_digest
    }

    /// Separate commitment to the recomposed untrusted HCFG declaration.
    #[must_use]
    pub fn declaration_digest(&self) -> &str {
        &self.declaration_digest
    }

    /// Count and fixed denial claims only; no paths, references or digests.
    #[must_use]
    pub fn redacted_diagnostic(&self) -> Value {
        json!({
            "schema_id": HEADLESS_RESOURCE_BINDINGS_SCHEMA_V1,
            "binding_count": self.bindings.len(),
            "identity_verified": false,
            "owner_verified": false,
            "os_enforcement_verified": false,
            "initialization_available": false,
            "activation_available": false,
            "grants_action_authority": false
        })
    }
}

impl fmt::Debug for HeadlessResourceBindingsV1 {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("HeadlessResourceBindingsV1")
            .field("binding_count", &self.bindings.len())
            .finish_non_exhaustive()
    }
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct RawBindings {
    schema_id: String,
    contract_version: String,
    installation_ref: String,
    bindings: Vec<RawBinding>,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct RawBinding {
    resource_ref: String,
    kind: ResourceKind,
    source_path: String,
}

/// Decode the exact nonempty binding dictionary for the first backend.
///
/// This pure operation performs no filesystem, environment, network, store,
/// owner authentication, native observation, runtime or authority work.
/// Syntactic path validation cannot establish existence, canonical physical
/// identity, ownership, mount/ACL isolation or absence of aliases.
///
/// # Errors
///
/// Returns a fixed failure for invalid JSON/size/schema/references, ordering,
/// mismatched or unsupported declarations, invalid paths and lexical overlap.
pub fn parse_headless_resource_bindings_v1(
    bytes: &[u8],
    declaration: &HeadlessConfigDeclarationV1,
) -> Result<HeadlessResourceBindingsV1, HeadlessResourceBindingsErrorV1> {
    use HeadlessResourceBindingsErrorV1 as Error;

    if bytes.is_empty() || bytes.len() > MAX_HEADLESS_RESOURCE_BINDINGS_BYTES_V1 {
        return Err(Error::InvalidSize);
    }
    let raw: RawBindings = serde_json::from_slice(bytes).map_err(|_| Error::InvalidJson)?;
    if raw.schema_id != HEADLESS_RESOURCE_BINDINGS_SCHEMA_V1
        || raw.contract_version != CONTRACT_VERSION_V1_0
    {
        return Err(Error::UnsupportedContract);
    }
    if raw.bindings.len() > MAX_HEADLESS_RESOURCE_BINDINGS_ROWS_V1 {
        return Err(Error::InvalidSize);
    }
    let composed = compose_headless_config_declaration_v1(declaration)
        .map_err(|_| Error::InvalidDeclaration)?;
    if !valid_reference(&raw.installation_ref, "installation:") {
        return Err(Error::InvalidReference);
    }
    if raw.installation_ref != declaration.document.installation_ref {
        return Err(Error::DeclarationMismatch);
    }
    let resources = &declaration.document.resources;
    if resources.len() != 2
        || resources
            .iter()
            .filter(|resource| resource.kind == ResourceKind::Repository)
            .count()
            != 1
        || resources
            .iter()
            .filter(|resource| resource.kind == ResourceKind::RuntimeProfile)
            .count()
            != 1
    {
        return Err(Error::UnsupportedCapability);
    }
    if raw.bindings.len() != resources.len() {
        return Err(Error::DeclarationMismatch);
    }
    if raw
        .bindings
        .windows(2)
        .any(|rows| rows[0].resource_ref >= rows[1].resource_ref)
    {
        return Err(Error::NoncanonicalCollection);
    }
    let mut bindings = Vec::with_capacity(resources.len());
    for (row, resource) in raw.bindings.into_iter().zip(resources) {
        if !valid_reference(&row.resource_ref, "resource:") {
            return Err(Error::InvalidReference);
        }
        if row.resource_ref != resource.reference || row.kind != resource.kind {
            return Err(Error::DeclarationMismatch);
        }
        if !valid_path(&row.source_path) {
            return Err(Error::InvalidPath);
        }
        let kind = match row.kind {
            ResourceKind::Repository => HeadlessResourceBindingKindV1::Repository,
            ResourceKind::RuntimeProfile => HeadlessResourceBindingKindV1::RuntimeProfile,
            _ => return Err(Error::UnsupportedCapability),
        };
        bindings.push(HeadlessResourceBindingV1 {
            resource_ref: row.resource_ref,
            kind,
            source_path: row.source_path,
            asserted_identity_digest: resource.identity_digest.clone(),
        });
    }
    let left = bindings[0].source_path();
    let right = bindings[1].source_path();
    if left == right || component_ancestor(left, right) || component_ancestor(right, left) {
        return Err(Error::OverlappingPaths);
    }
    let body = json!([
        HEADLESS_RESOURCE_BINDINGS_SCHEMA_V1,
        CONTRACT_VERSION_V1_0,
        raw.installation_ref,
        bindings
            .iter()
            .map(|row| json!([row.resource_ref(), row.kind().as_str(), row.source_path()]))
            .collect::<Vec<_>>()
    ]);
    let mut canonical = String::from("lnsat.resource_bindings.v1\n");
    crate::packet::write_canonical_json_value(&body, &mut canonical)
        .map_err(|_| Error::InvalidDeclaration)?;
    let digest = Sha256::digest(canonical.as_bytes());
    let mut binding_digest = String::from("sha256:");
    for byte in digest {
        use std::fmt::Write;
        write!(&mut binding_digest, "{byte:02x}").map_err(|_| Error::InvalidDeclaration)?;
    }
    Ok(HeadlessResourceBindingsV1 {
        installation_ref: raw.installation_ref,
        bindings,
        binding_digest,
        declaration_digest: composed.declaration_digest().to_owned(),
    })
}

fn valid_reference(value: &str, prefix: &str) -> bool {
    value.starts_with(prefix) && is_valid_reference_v1(value)
}

fn valid_path(path: &str) -> bool {
    path.len() <= MAX_HEADLESS_RESOURCE_BINDING_PATH_BYTES_V1
        && path.starts_with('/')
        && path.len() > 1
        && !path.ends_with('/')
        && !path
            .chars()
            .any(|character| character.is_control() || character == '\\')
        && path[1..]
            .split('/')
            .all(|component| !component.is_empty() && component != "." && component != "..")
}

fn component_ancestor(parent: &str, child: &str) -> bool {
    child
        .strip_prefix(parent)
        .is_some_and(|suffix| suffix.starts_with('/'))
}
