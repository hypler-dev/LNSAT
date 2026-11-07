//! Synthetic supplied bytes only: no current mount or permission evidence.

use std::cell::Cell;

use super::{
    MAX_INPUT_BYTES, MAX_MOUNT_ID, MAX_OPTION_BYTES, MAX_OPTION_TOKEN_BYTES, MAX_OPTIONAL_FIELDS,
    MAX_OPTIONAL_TOKEN_BYTES, MAX_OPTIONS, MAX_PATH_BYTES, MAX_ROW_BYTES, MAX_ROWS, MAX_TAG_BYTES,
    MAX_TYPE_BYTES, MountInfoError, MountInfoTable, reserve_exact,
};

const BASE: [&[u8]; 10] = [
    b"0", b"0", b"0:0", b"/", b"/", b"rw", b"-", b"ext4", b"-", b"rw",
];

thread_local! {
    static FAIL_AFTER: Cell<Option<usize>> = const { Cell::new(None) };
}

pub(super) fn deny_reservation() -> bool {
    FAIL_AFTER.with(|remaining| match remaining.get() {
        None => false,
        Some(0) => true,
        Some(count) => {
            remaining.set(Some(count - 1));
            false
        }
    })
}

struct ResetReservation;

impl Drop for ResetReservation {
    fn drop(&mut self) {
        FAIL_AFTER.with(|remaining| remaining.set(None));
    }
}

fn failing_reservation<T>(after: usize, operation: impl FnOnce() -> T) -> T {
    FAIL_AFTER.with(|remaining| {
        assert!(remaining.get().is_none());
        remaining.set(Some(after));
    });
    let _reset = ResetReservation;
    operation()
}

fn line(fields: &[&[u8]]) -> Vec<u8> {
    let mut bytes = Vec::new();
    for (index, field) in fields.iter().enumerate() {
        if index != 0 {
            bytes.push(b' ');
        }
        bytes.extend_from_slice(field);
    }
    bytes.push(b'\n');
    bytes
}

fn with(field: usize, value: &[u8]) -> Vec<u8> {
    let mut fields: [&[u8]; 10] = BASE;
    fields[field] = value;
    line(&fields)
}

fn optional(value: &[u8]) -> Vec<u8> {
    line(&[
        b"0", b"0", b"0:0", b"/", b"/", b"rw", value, b"-", b"ext4", b"-", b"rw",
    ])
}

fn denied(bytes: &[u8], expected: MountInfoError) {
    let before = bytes.to_vec();
    assert_eq!(MountInfoTable::parse(bytes).err(), Some(expected));
    assert_eq!(bytes, before);
}

fn padded_row(id: u32, length: usize) -> Vec<u8> {
    let id = id.to_string();
    let root = [b"/".as_slice(), &[b'a'; 4_095]].concat();
    let baseline = line(&[
        id.as_bytes(),
        b"0",
        b"0:0",
        &root,
        b"/",
        b"rw",
        b"-",
        b"ext4",
        b"x",
        b"rw",
    ]);
    let source = vec![b'x'; length - baseline.len() + 1];
    line(&[
        id.as_bytes(),
        b"0",
        b"0:0",
        &root,
        b"/",
        b"rw",
        b"-",
        b"ext4",
        &source,
        b"rw",
    ])
}

#[test]
fn headless_native_mountinfo_minimal_zero_self_parent_and_literal_source() {
    let input = line(&BASE);
    let table = MountInfoTable::parse(&input).unwrap();
    assert_eq!(table.rows.len(), 1);
    let row = &table.rows[0];
    assert_eq!(
        (
            row.mount_id,
            row.parent_id,
            row.device_major,
            row.device_minor
        ),
        (0, 0, 0, 0)
    );
    assert_eq!(row.root, b"/");
    assert_eq!(row.mountpoint, b"/");
    assert_eq!(row.filesystem_type, b"ext4");
    assert_eq!(row.source, b"-");
    assert!(row.optional_fields.is_empty());
}

#[test]
fn headless_native_mountinfo_maxima_missing_parent_stacking_and_order() {
    let first = line(&[
        b"2147483647",
        b"2147483646",
        b"4294967295:4294967295",
        b"/",
        b"/same",
        b"ro",
        b"-",
        b"ext4",
        b"none",
        b"rw",
    ]);
    let second = line(&[
        b"1", b"1", b"1:2", b"/", b"/same", b"rw", b"-", b"ext4", b"none", b"ro",
    ]);
    let input = [first, second].concat();
    let rows = MountInfoTable::parse(&input).unwrap().rows;
    assert_eq!(
        rows.iter().map(|row| row.mount_id).collect::<Vec<_>>(),
        [MAX_MOUNT_ID, 1]
    );
    assert_eq!(rows[0].parent_id, MAX_MOUNT_ID - 1);
    assert_eq!(
        (rows[0].device_major, rows[0].device_minor),
        (u32::MAX, u32::MAX)
    );
    assert_eq!(rows[0].mountpoint, rows[1].mountpoint);
}

#[test]
fn headless_native_mountinfo_field_specific_escapes_hash_and_high_bytes() {
    for field in [3, 4, 7, 8] {
        let prefix = if matches!(field, 3 | 4) {
            b"/".as_slice()
        } else {
            b"".as_slice()
        };
        for (encoded, decoded) in [
            (b"\\040".as_slice(), b' '),
            (b"\\011", b'\t'),
            (b"\\012", b'\n'),
            (b"\\134", b'\\'),
        ] {
            let input = with(field, &[prefix, encoded].concat());
            let table = MountInfoTable::parse(&input).unwrap();
            let row = &table.rows[0];
            let observed = match field {
                3 => &row.root,
                4 => &row.mountpoint,
                7 => &row.filesystem_type,
                _ => &row.source,
            };
            assert_eq!(observed.as_slice(), [prefix, &[decoded]].concat());
        }
        let raw_hash = with(field, &[prefix, b"#"].concat());
        let escaped_hash = with(field, &[prefix, b"\\043"].concat());
        if matches!(field, 3 | 4) {
            assert!(MountInfoTable::parse(&raw_hash).is_ok());
            denied(&escaped_hash, MountInfoError::InvalidEscape);
        } else {
            denied(&raw_hash, MountInfoError::InvalidEscape);
            let table = MountInfoTable::parse(&escaped_hash).unwrap();
            let observed = if field == 7 {
                &table.rows[0].filesystem_type
            } else {
                &table.rows[0].source
            };
            assert_eq!(observed, b"#");
        }
        let raw_high = [prefix, &[0xff, 0x80, 0xc0]].concat();
        let input = with(field, &raw_high);
        let table = MountInfoTable::parse(&input).unwrap();
        let row = &table.rows[0];
        let observed = match field {
            3 => &row.root,
            4 => &row.mountpoint,
            7 => &row.filesystem_type,
            _ => &row.source,
        };
        assert_eq!(observed, &raw_high);
    }
}

#[test]
fn headless_native_mountinfo_preserves_path_components_without_resolution() {
    for field in [3, 4] {
        let input = with(field, b"//a/.././b/");
        let table = MountInfoTable::parse(&input).unwrap();
        let row = &table.rows[0];
        assert_eq!(
            if field == 3 {
                &row.root
            } else {
                &row.mountpoint
            },
            b"//a/.././b/"
        );
        denied(&with(field, b"relative"), MountInfoError::InvalidRow);
    }
}

#[test]
fn headless_native_mountinfo_distinct_borrowed_options_and_unknown_tags() {
    let input = line(&[
        b"0",
        b"0",
        b"0:0",
        b"/",
        b"/",
        b"rw,idmapped,x=1,x=2,opaque\\099",
        b"shared:1",
        b"master:2147483647",
        b"propagate_from:2",
        b"unbindable",
        b"future:\xff:raw",
        b"idmapped",
        b"-",
        b"ext4",
        b"-",
        b"ro,idmapped",
    ]);
    let before = input.clone();
    let table = MountInfoTable::parse(&input).unwrap();
    let row = &table.rows[0];
    assert_eq!(row.mount_options, b"rw,idmapped,x=1,x=2,opaque\\099");
    assert_eq!(row.super_options, b"ro,idmapped");
    assert_eq!(
        row.optional_fields,
        b"shared:1 master:2147483647 propagate_from:2 unbindable future:\xff:raw idmapped"
    );
    for borrowed in [row.mount_options, row.super_options, row.optional_fields] {
        assert!(
            input
                .windows(borrowed.len())
                .any(|window| window.as_ptr() == borrowed.as_ptr())
        );
    }
    assert_eq!(input, before);
    let input = optional(b"idmapped:future");
    let row = &MountInfoTable::parse(&input).unwrap().rows[0];
    assert_eq!(row.mount_options, b"rw");
    assert_eq!(row.optional_fields, b"idmapped:future");
}

#[test]
fn headless_native_mountinfo_rejects_every_raw_control_and_incomplete_frame() {
    let valid = line(&BASE);
    for length in 0..valid.len() {
        denied(&valid[..length], MountInfoError::InvalidFraming);
    }
    for control in (0_u8..=31).filter(|byte| *byte != b'\n').chain([127]) {
        denied(&with(8, &[b'x', control]), MountInfoError::InvalidFraming);
    }
    for input in [b"\n".as_slice(), b"\r\n", b"0 0 0:0 / / rw - ext4 - rw\n\n"] {
        denied(input, MountInfoError::InvalidFraming);
    }
}

#[test]
fn headless_native_mountinfo_rejects_spacing_separator_and_tail_ambiguity() {
    for input in [
        b" 0 0 0:0 / / rw - ext4 - rw\n".as_slice(),
        b"0  0 0:0 / / rw - ext4 - rw\n",
        b"0 0 0:0 / / rw - ext4 - rw \n",
        b"0 0 0:0 / / rw ext4 - rw\n",
        b"0 0 0:0 / / rw + ext4 - rw\n",
        b"0 0 0:0 / / rw - ext4 -\n",
        b"0 0 0:0 / / rw - ext4 - rw extra\n",
        b"0 0 0:0 / / rw - - ext4 - rw\n",
    ] {
        denied(input, MountInfoError::InvalidRow);
    }
}

#[test]
fn headless_native_mountinfo_rejects_numbers_devices_and_duplicate_ids() {
    for field in [0, 1] {
        for invalid in [
            b"00".as_slice(),
            b"01",
            b"+1",
            b"-1",
            b"x",
            b"2147483648",
            b"9999999999",
            b"10000000000",
        ] {
            denied(&with(field, invalid), MountInfoError::InvalidNumber);
        }
    }
    for invalid in [
        b"0".as_slice(),
        b":0",
        b"0:",
        b"0:0:0",
        b"00:0",
        b"0:01",
        b"-1:0",
        b"4294967296:0",
        b"0:4294967296",
    ] {
        denied(&with(2, invalid), MountInfoError::InvalidNumber);
    }
    denied(
        &[line(&BASE), with(8, b"different")].concat(),
        MountInfoError::DuplicateMountId,
    );
}

#[test]
fn headless_native_mountinfo_rejects_escape_alternatives_in_every_decoded_field() {
    for field in [3, 4, 7, 8] {
        let prefix = if matches!(field, 3 | 4) {
            b"/".as_slice()
        } else {
            b"".as_slice()
        };
        for invalid in [
            b"\\".as_slice(),
            b"\\0",
            b"\\04",
            b"\\400",
            b"\\000",
            b"\\015",
            b"\\057",
            b"\\x20",
            b"\\099",
            b"\\040\\",
        ] {
            denied(
                &with(field, &[prefix, invalid].concat()),
                MountInfoError::InvalidEscape,
            );
        }
    }
}

#[test]
fn headless_native_mountinfo_rejects_option_duplicates_and_mode_variants() {
    for field in [5, 9] {
        for invalid in [
            b"relatime".as_slice(),
            b"RW",
            b"rw,",
            b"rw,,x",
            b"rw,rw",
            b"ro,rw",
            b"rw,ro",
            b"rw,noexec,noexec",
            b"rw,x=1,x=1",
        ] {
            denied(&with(field, invalid), MountInfoError::InvalidOptions);
        }
        let input = with(field, b"rw,opaque=\xff,opaque=\x80");
        assert!(MountInfoTable::parse(&input).is_ok());
    }
}

#[test]
fn headless_native_mountinfo_rejects_duplicate_or_malformed_optional_tags() {
    for invalid in [
        b"shared:1 shared:2".as_slice(),
        b"future:a future:b",
        b"shared",
        b"shared:0",
        b"master:01",
        b"master:2147483648",
        b"propagate_from:-1",
        b"shared:1:2",
        b"unbindable:1",
        b"future:",
        b":1",
        b"Future:1",
        b"1future:1",
        b"future-name:1",
        b"future\\name:1",
    ] {
        denied(&optional(invalid), MountInfoError::InvalidOptionalField);
    }
    // Independently valid tags carry no propagation topology assertion.
    assert!(MountInfoTable::parse(&optional(b"propagate_from:1 unbindable shared:1")).is_ok());
}

#[test]
fn headless_native_mountinfo_exact_input_and_row_bounds_and_storage_budget() {
    let input: Vec<u8> = (0..128)
        .flat_map(|id| padded_row(id, MAX_ROW_BYTES))
        .collect();
    assert_eq!(input.len(), MAX_INPUT_BYTES);
    let table = MountInfoTable::parse(&input).unwrap();
    let decoded_capacity: usize = table
        .rows
        .iter()
        .map(|row| {
            row.root.capacity()
                + row.mountpoint.capacity()
                + row.filesystem_type.capacity()
                + row.source.capacity()
        })
        .sum();
    assert!(decoded_capacity <= input.len());
    assert!(table.rows.capacity() <= MAX_ROWS);
    assert_eq!(table.rows.len(), 128);
    let mut excess = input.clone();
    excess.push(b'\n');
    denied(&excess, MountInfoError::LimitExceeded);
    denied(
        &padded_row(0, MAX_ROW_BYTES + 1),
        MountInfoError::LimitExceeded,
    );
}

#[test]
fn headless_native_mountinfo_exact_row_count_and_excess() {
    let mut input: Vec<u8> = (0..MAX_ROWS)
        .flat_map(|id| with(0, id.to_string().as_bytes()))
        .collect();
    assert_eq!(MountInfoTable::parse(&input).unwrap().rows.len(), MAX_ROWS);
    input.extend(with(0, b"4096"));
    denied(&input, MountInfoError::LimitExceeded);
}

#[test]
fn headless_native_mountinfo_exact_decoded_field_limits_and_excess() {
    for (field, maximum) in [
        (3, MAX_PATH_BYTES),
        (4, MAX_PATH_BYTES),
        (7, MAX_TYPE_BYTES),
        (8, MAX_PATH_BYTES),
    ] {
        let mut bytes = vec![b'x'; maximum];
        if matches!(field, 3 | 4) {
            bytes[0] = b'/';
        }
        assert!(MountInfoTable::parse(&with(field, &bytes)).is_ok());
        bytes.push(b'x');
        denied(&with(field, &bytes), MountInfoError::LimitExceeded);
    }
}

#[test]
fn headless_native_mountinfo_exact_option_count_token_and_list_limits() {
    for field in [5, 9] {
        let list = (0..MAX_OPTIONS - 1)
            .map(|id| format!("x{id}"))
            .collect::<Vec<_>>()
            .join(",");
        let mut options = [b"rw,".as_slice(), list.as_bytes()].concat();
        assert!(MountInfoTable::parse(&with(field, &options)).is_ok());
        options.extend_from_slice(b",excess");
        denied(&with(field, &options), MountInfoError::LimitExceeded);
        let mut options = [b"rw,".as_slice(), &vec![b'a'; MAX_OPTION_TOKEN_BYTES]].concat();
        assert!(MountInfoTable::parse(&with(field, &options)).is_ok());
        options.push(b'a');
        denied(&with(field, &options), MountInfoError::LimitExceeded);
        let mut options = b"rw".to_vec();
        for byte in *b"abc" {
            options.push(b',');
            options.extend(vec![byte; MAX_OPTION_TOKEN_BYTES]);
        }
        options.push(b',');
        options.resize(MAX_OPTION_BYTES, b'd');
        assert!(MountInfoTable::parse(&with(field, &options)).is_ok());
        options.push(b'd');
        denied(&with(field, &options), MountInfoError::LimitExceeded);
    }
}

#[test]
fn headless_native_mountinfo_exact_optional_count_tag_and_token_limits() {
    let tags = (0..MAX_OPTIONAL_FIELDS)
        .map(|id| format!("x{id}"))
        .collect::<Vec<_>>()
        .join(" ");
    assert!(MountInfoTable::parse(&optional(tags.as_bytes())).is_ok());
    denied(
        &optional(format!("{tags} excess").as_bytes()),
        MountInfoError::LimitExceeded,
    );
    let mut token = vec![b'a'; MAX_TAG_BYTES];
    assert!(MountInfoTable::parse(&optional(&token)).is_ok());
    token.push(b'a');
    denied(&optional(&token), MountInfoError::LimitExceeded);
    token.pop();
    token.push(b':');
    token.resize(MAX_OPTIONAL_TOKEN_BYTES, b'x');
    assert!(MountInfoTable::parse(&optional(&token)).is_ok());
    token.push(b'x');
    denied(&optional(&token), MountInfoError::LimitExceeded);
}

#[test]
fn headless_native_mountinfo_storage_denial_each_reservation_and_unwind_reset() {
    let input = [line(&BASE), with(0, b"1")].concat();
    for after in 0..10 {
        failing_reservation(after, || denied(&input, MountInfoError::StorageUnavailable));
        assert!(MountInfoTable::parse(&input).is_ok());
    }
    let unwound =
        std::panic::catch_unwind(|| failing_reservation(0, || panic!("synthetic unwind")));
    assert!(unwound.is_err());
    assert!(MountInfoTable::parse(&input).is_ok());
    let mut impossible: Vec<u8> = Vec::new();
    assert_eq!(
        reserve_exact(&mut impossible, usize::MAX),
        Err(MountInfoError::StorageUnavailable)
    );
}

#[test]
fn headless_native_mountinfo_errors_are_fixed_private_data_free_codes() {
    let errors = [
        (
            MountInfoError::LimitExceeded,
            "native_mountinfo.limit_exceeded",
        ),
        (
            MountInfoError::InvalidFraming,
            "native_mountinfo.invalid_framing",
        ),
        (MountInfoError::InvalidRow, "native_mountinfo.invalid_row"),
        (
            MountInfoError::InvalidNumber,
            "native_mountinfo.invalid_number",
        ),
        (
            MountInfoError::InvalidEscape,
            "native_mountinfo.invalid_escape",
        ),
        (
            MountInfoError::InvalidOptions,
            "native_mountinfo.invalid_options",
        ),
        (
            MountInfoError::InvalidOptionalField,
            "native_mountinfo.invalid_optional_field",
        ),
        (
            MountInfoError::DuplicateMountId,
            "native_mountinfo.duplicate_mount_id",
        ),
        (
            MountInfoError::StorageUnavailable,
            "native_mountinfo.storage_unavailable",
        ),
    ];
    for (error, code) in errors {
        assert_eq!(error.code(), code);
    }
    let input = line(&BASE);
    for position in 0..input.len() {
        for byte in 0..=255 {
            let mut mutated = input.clone();
            mutated[position] = byte;
            let before = mutated.clone();
            if let Err(error) = MountInfoTable::parse(&mutated) {
                assert!(
                    errors
                        .iter()
                        .any(|(fixed, code)| error == *fixed && error.code() == *code)
                );
            }
            assert_eq!(mutated, before);
        }
    }
}
