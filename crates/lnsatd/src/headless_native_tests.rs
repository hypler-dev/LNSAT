//! Synthetic byte vectors are grammar evidence, never current native proof.

use super::{
    NativeError,
    acl::{ParsedAcl, Tag},
};

const UNDEF: u32 = u32::MAX;
type WireEntry = (u16, u16, u32);

fn wire(entries: &[WireEntry]) -> Vec<u8> {
    let mut bytes = 2_u32.to_le_bytes().to_vec();
    for (tag, permissions, id) in entries {
        bytes.extend(tag.to_le_bytes());
        bytes.extend(permissions.to_le_bytes());
        bytes.extend(id.to_le_bytes());
    }
    bytes
}

fn base(owner: u16, group: u16, other: u16) -> Vec<WireEntry> {
    vec![(1, owner, UNDEF), (4, group, UNDEF), (32, other, UNDEF)]
}

fn extended() -> Vec<WireEntry> {
    vec![
        (1, 7, UNDEF),
        (2, 7, 0),
        (2, 4, 1000),
        (4, 7, UNDEF),
        (8, 7, 0),
        (8, 6, 1000),
        (16, 4, UNDEF),
        (32, 0, UNDEF),
    ]
}

fn invalid(entries: &[WireEntry]) {
    assert_eq!(
        ParsedAcl::parse(&wire(entries)).err(),
        Some(NativeError::InvalidAcl)
    );
}

#[test]
fn headless_native_acl_all_base_modes_match_exact_permission_triplets() {
    for owner in 0..8 {
        for group in 0..8 {
            for other in 0..8 {
                let acl = ParsedAcl::parse(&wire(&base(owner, group, other))).unwrap();
                let mode = u32::from(owner << 6 | group << 3 | other);
                assert_eq!(acl.check_access_mode(mode), Ok(()));
                assert_eq!(
                    acl.check_access_mode(mode ^ 1),
                    Err(NativeError::ModeMismatch)
                );
                assert_eq!(
                    acl.check_access_mode(mode ^ 8),
                    Err(NativeError::ModeMismatch)
                );
                assert_eq!(
                    acl.check_access_mode(mode ^ 64),
                    Err(NativeError::ModeMismatch)
                );
            }
        }
    }
}

#[test]
fn headless_native_acl_masked_off_raw_rights_and_separate_id_spaces_are_valid() {
    let acl = ParsedAcl::parse(&wire(&extended())).unwrap();
    assert_eq!(acl.check_access_mode(0o740), Ok(()));
    assert_eq!(acl.check_access_mode(0o770), Err(NativeError::ModeMismatch));
    for entry in acl.entries() {
        if matches!(entry.tag, Tag::User | Tag::Group | Tag::GroupObject) {
            assert_eq!(acl.effective_permissions(*entry), entry.permissions & 4);
        }
    }
    // A mask can exist without any named entries. It still owns group mode.
    let acl = ParsedAcl::parse(&wire(&[
        (1, 6, UNDEF),
        (4, 7, UNDEF),
        (16, 0, UNDEF),
        (32, 0, UNDEF),
    ]))
    .unwrap();
    assert_eq!(acl.check_access_mode(0o600), Ok(()));
}

#[test]
fn headless_native_acl_default_inheritance_is_not_directory_mode() {
    let default_acl = ParsedAcl::parse(&wire(&base(7, 5, 0))).unwrap();
    // Valid default grammar can differ from its parent's 0700 access mode.
    assert_eq!(default_acl.entries()[1].permissions, 5);
    assert_eq!(
        default_acl.check_access_mode(0o700),
        Err(NativeError::ModeMismatch)
    );
}

#[test]
fn headless_native_acl_rejects_wrong_version_endian_lengths_and_trailing_bytes() {
    let valid = wire(&base(6, 0, 0));
    for length in 0..valid.len() {
        assert_eq!(
            ParsedAcl::parse(&valid[..length]).err(),
            Some(NativeError::InvalidAcl)
        );
    }
    for version in [0_u32, 1, 3, u32::MAX] {
        let mut bytes = valid.clone();
        bytes[..4].copy_from_slice(&version.to_le_bytes());
        assert_eq!(
            ParsedAcl::parse(&bytes).err(),
            Some(NativeError::InvalidAcl)
        );
    }
    let mut bytes = valid.clone();
    bytes[..4].copy_from_slice(&2_u32.to_be_bytes());
    assert_eq!(
        ParsedAcl::parse(&bytes).err(),
        Some(NativeError::InvalidAcl)
    );
    for trailing in 1..=8 {
        let mut bytes = valid.clone();
        bytes.extend(vec![0; trailing]);
        assert_eq!(
            ParsedAcl::parse(&bytes).err(),
            Some(NativeError::InvalidAcl)
        );
    }
}

#[test]
fn headless_native_acl_rejects_unknown_tags_permissions_and_id_misuse() {
    for tag in [0, 3, 5, 6, 7, 9, u16::MAX] {
        let mut entries = base(6, 0, 0);
        entries[1].0 = tag;
        invalid(&entries);
    }
    for at in 0..extended().len() {
        let mut entries = extended();
        entries[at].1 = 8;
        invalid(&entries);
        entries[at].1 = u16::MAX;
        invalid(&entries);
        entries = extended();
        entries[at].2 = if matches!(entries[at].0, 2 | 8) {
            UNDEF
        } else {
            0
        };
        invalid(&entries);
    }
}

#[test]
fn headless_native_acl_rejects_duplicate_missing_and_reordered_tag_transitions() {
    let valid = extended();
    for at in [0, 3, 6, 7] {
        let mut entries = valid.clone();
        entries.remove(at);
        invalid(&entries);
        let mut entries = valid.clone();
        entries.insert(at, entries[at]);
        invalid(&entries);
    }
    for left in 0..valid.len() {
        for right in left + 1..valid.len() {
            let mut entries = valid.clone();
            entries.swap(left, right);
            invalid(&entries);
        }
    }
    invalid(&[(1, 6, UNDEF), (4, 0, UNDEF), (8, 0, 1000), (32, 0, UNDEF)]);
    invalid(&[(1, 6, UNDEF), (2, 0, 1000), (4, 0, UNDEF), (32, 0, UNDEF)]);
}

#[test]
fn headless_native_acl_rejects_duplicate_and_unsorted_named_ids() {
    for (first, second) in [(1, 2), (4, 5)] {
        let mut entries = extended();
        entries[second].2 = entries[first].2;
        invalid(&entries);
        entries[second].2 = 5;
        entries[first].2 = 10;
        invalid(&entries);
    }
}

#[test]
fn headless_native_acl_exact_entry_and_byte_caps() {
    let mut entries = vec![(1, 7, UNDEF)];
    for id in 0..1020 {
        entries.push((2, 7, id));
    }
    entries.extend([(4, 0, UNDEF), (16, 0, UNDEF), (32, 0, UNDEF)]);
    let bytes = wire(&entries);
    assert_eq!(bytes.len(), 8196);
    let acl = ParsedAcl::parse(&bytes).unwrap();
    assert_eq!(acl.check_access_mode(0o700), Ok(()));
    entries.insert(1021, (2, 7, 1020));
    assert_eq!(
        ParsedAcl::parse(&wire(&entries)).err(),
        Some(NativeError::LimitExceeded)
    );
    let mut oversized = bytes;
    oversized.push(0);
    assert_eq!(
        ParsedAcl::parse(&oversized).err(),
        Some(NativeError::LimitExceeded)
    );
}

#[test]
fn headless_native_acl_errors_are_fixed_and_data_free() {
    for (error, code) in [
        (
            NativeError::UnsupportedPlatform,
            "native_acl.unsupported_platform",
        ),
        (
            NativeError::InvalidDescriptor,
            "native_acl.invalid_descriptor",
        ),
        (NativeError::ReadRejected, "native_acl.read_rejected"),
        (NativeError::InvalidAcl, "native_acl.invalid_acl"),
        (NativeError::ModeMismatch, "native_acl.mode_mismatch"),
        (NativeError::ObjectChanged, "native_acl.object_changed"),
        (NativeError::LimitExceeded, "native_acl.limit_exceeded"),
    ] {
        assert_eq!(error.code(), code);
    }
}
