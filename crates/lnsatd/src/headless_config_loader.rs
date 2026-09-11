//! Explicit declaration-only headless configuration loading.
//!
//! This loader opens one operator-selected declaration file and returns a
//! composed diagnostic value. It never validates identity, starts a runtime,
//! persists state, or grants action authority.

use lnsat_contracts::{ComposedHeadlessConfigV1, HeadlessConfigErrorV1};
#[cfg(any(target_os = "linux", target_os = "macos"))]
use lnsat_contracts::{
    MAX_HEADLESS_CONFIG_BYTES_V1, compose_headless_config_declaration_v1,
    parse_headless_config_declaration_v1,
};
use std::fmt;
#[cfg(any(target_os = "linux", target_os = "macos"))]
use std::fs::{self, File, Metadata};
#[cfg(any(target_os = "linux", target_os = "macos"))]
use std::io::Read;
#[cfg(any(target_os = "linux", target_os = "macos"))]
use std::os::unix::fs::MetadataExt;
use std::path::Path;

/// One parsed and composed declaration diagnostic value.
#[derive(Clone, Debug)]
pub struct LoadedHeadlessConfigDeclarationV1 {
    composed: ComposedHeadlessConfigV1,
}

impl LoadedHeadlessConfigDeclarationV1 {
    /// Returns the unverified, declaration-only composed ceiling.
    #[must_use]
    pub const fn composed(&self) -> &ComposedHeadlessConfigV1 {
        &self.composed
    }
}

/// Fixed public-safe failures for explicit declaration loading.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum HeadlessConfigDeclarationLoadErrorV1 {
    /// The supplied path is not absolute.
    InvalidPath,
    /// File identity, type, open, or read validation failed.
    InvalidFile,
    /// The selected file exceeds the declaration byte bound.
    FileTooLarge,
    /// The selected file was not UTF-8.
    InvalidUtf8,
    /// This target lacks the proven stable file-identity boundary.
    UnsupportedPlatform,
    /// Closed declaration parse or composition failure.
    Declaration(HeadlessConfigErrorV1),
}

impl HeadlessConfigDeclarationLoadErrorV1 {
    /// Stable public-safe error code.
    #[must_use]
    pub const fn code(self) -> &'static str {
        match self {
            Self::InvalidPath => "headless_config.invalid_path",
            Self::InvalidFile => "headless_config.invalid_file",
            Self::FileTooLarge => "headless_config.invalid_size",
            Self::InvalidUtf8 => "headless_config.invalid_utf8",
            Self::UnsupportedPlatform => "headless_config.platform_unsupported",
            Self::Declaration(error) => error.code(),
        }
    }
}

impl fmt::Display for HeadlessConfigDeclarationLoadErrorV1 {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(self.code())
    }
}

impl std::error::Error for HeadlessConfigDeclarationLoadErrorV1 {}

/// Loads, parses, and composes one explicit declaration-only document.
///
/// The selected path must be absolute and name one regular non-symlink file.
/// Identity is checked before opening, on the opened handle, and after reading.
/// No selected path, byte, or declaration value is exposed through failures.
///
/// # Errors
///
/// Returns a fixed public-safe error for invalid paths or file identity, files
/// larger than 65536 bytes, invalid UTF-8, and closed parser/composer failures.
#[cfg(any(target_os = "linux", target_os = "macos"))]
pub fn load_headless_config_declaration_v1(
    declaration_path: impl AsRef<Path>,
) -> Result<LoadedHeadlessConfigDeclarationV1, HeadlessConfigDeclarationLoadErrorV1> {
    let declaration_path = declaration_path.as_ref();
    if !declaration_path.is_absolute() {
        return Err(HeadlessConfigDeclarationLoadErrorV1::InvalidPath);
    }

    let before = fs::symlink_metadata(declaration_path)
        .map_err(|_| HeadlessConfigDeclarationLoadErrorV1::InvalidFile)?;
    if before.file_type().is_symlink() || !before.is_file() {
        return Err(HeadlessConfigDeclarationLoadErrorV1::InvalidFile);
    }
    if before.len() > MAX_HEADLESS_CONFIG_BYTES_V1 as u64 {
        return Err(HeadlessConfigDeclarationLoadErrorV1::FileTooLarge);
    }

    let mut file = File::open(declaration_path)
        .map_err(|_| HeadlessConfigDeclarationLoadErrorV1::InvalidFile)?;
    let opened = file
        .metadata()
        .map_err(|_| HeadlessConfigDeclarationLoadErrorV1::InvalidFile)?;
    if !same_file_identity_v1(&before, &opened) {
        return Err(HeadlessConfigDeclarationLoadErrorV1::InvalidFile);
    }
    if opened.len() > MAX_HEADLESS_CONFIG_BYTES_V1 as u64 {
        return Err(HeadlessConfigDeclarationLoadErrorV1::FileTooLarge);
    }

    let mut bytes = Vec::new();
    file.by_ref()
        .take((MAX_HEADLESS_CONFIG_BYTES_V1 + 1) as u64)
        .read_to_end(&mut bytes)
        .map_err(|_| HeadlessConfigDeclarationLoadErrorV1::InvalidFile)?;
    if bytes.len() > MAX_HEADLESS_CONFIG_BYTES_V1 {
        return Err(HeadlessConfigDeclarationLoadErrorV1::FileTooLarge);
    }

    let handle_after = file
        .metadata()
        .map_err(|_| HeadlessConfigDeclarationLoadErrorV1::InvalidFile)?;
    let path_after = fs::symlink_metadata(declaration_path)
        .map_err(|_| HeadlessConfigDeclarationLoadErrorV1::InvalidFile)?;
    if path_after.file_type().is_symlink()
        || !same_file_identity_v1(&opened, &handle_after)
        || !same_file_identity_v1(&handle_after, &path_after)
    {
        return Err(HeadlessConfigDeclarationLoadErrorV1::InvalidFile);
    }

    std::str::from_utf8(&bytes).map_err(|_| HeadlessConfigDeclarationLoadErrorV1::InvalidUtf8)?;
    let declaration = parse_headless_config_declaration_v1(&bytes)
        .map_err(HeadlessConfigDeclarationLoadErrorV1::Declaration)?;
    let composed = compose_headless_config_declaration_v1(&declaration)
        .map_err(HeadlessConfigDeclarationLoadErrorV1::Declaration)?;

    Ok(LoadedHeadlessConfigDeclarationV1 { composed })
}

/// Refuses declaration loading on targets without a proven stable file identity.
///
/// # Errors
///
/// Always returns the fixed unsupported-platform error.
#[cfg(not(any(target_os = "linux", target_os = "macos")))]
pub fn load_headless_config_declaration_v1(
    _declaration_path: impl AsRef<Path>,
) -> Result<LoadedHeadlessConfigDeclarationV1, HeadlessConfigDeclarationLoadErrorV1> {
    Err(HeadlessConfigDeclarationLoadErrorV1::UnsupportedPlatform)
}

#[cfg(any(target_os = "linux", target_os = "macos"))]
fn same_file_identity_v1(left: &Metadata, right: &Metadata) -> bool {
    if !left.is_file() || !right.is_file() || left.len() != right.len() {
        return false;
    }

    left.dev() == right.dev()
        && left.ino() == right.ino()
        && left.mtime() == right.mtime()
        && left.mtime_nsec() == right.mtime_nsec()
        && left.ctime() == right.ctime()
        && left.ctime_nsec() == right.ctime_nsec()
}
