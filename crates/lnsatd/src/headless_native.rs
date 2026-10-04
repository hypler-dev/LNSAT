//! Private Stage-A native sampling prerequisites, disconnected from product callers.
//!
//! Samples, parsed ACLs and mountinfo rows contain untrusted data. They authenticate no
//! path, kernel, filesystem, LSM, resource ownership or action authority.

#[path = "headless_native_acl.rs"]
mod acl;
#[path = "headless_native_mountinfo.rs"]
mod mountinfo;
#[path = "headless_native_readable.rs"]
mod readable;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
enum NativeError {
    UnsupportedPlatform,
    InvalidDescriptor,
    ReadRejected,
    InvalidAcl,
    ModeMismatch,
    ObjectChanged,
    LimitExceeded,
}

impl NativeError {
    const fn code(self) -> &'static str {
        match self {
            Self::UnsupportedPlatform => "native_acl.unsupported_platform",
            Self::InvalidDescriptor => "native_acl.invalid_descriptor",
            Self::ReadRejected => "native_acl.read_rejected",
            Self::InvalidAcl => "native_acl.invalid_acl",
            Self::ModeMismatch => "native_acl.mode_mismatch",
            Self::ObjectChanged => "native_acl.object_changed",
            Self::LimitExceeded => "native_acl.limit_exceeded",
        }
    }
}

#[cfg(test)]
#[path = "headless_native_tests.rs"]
mod tests;
