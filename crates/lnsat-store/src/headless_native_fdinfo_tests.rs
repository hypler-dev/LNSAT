//! Synthetic supplied bytes only: no fd, procfs or native observation.

use super::{FdInfoError, FdInfoRecord, MAX_INPUT_BYTES};

const VALID: &[u8] = b"pos:\t0\nflags:\t00\nmnt_id:\t0\nino:\t0\n";

fn record(position: &[u8], flags: &[u8], mount_id: &[u8], inode: &[u8]) -> Vec<u8> {
    [
        b"pos:\t".as_slice(),
        position,
        b"\nflags:\t",
        flags,
        b"\nmnt_id:\t",
        mount_id,
        b"\nino:\t",
        inode,
        b"\n",
    ]
    .concat()
}

fn denied(input: &[u8], expected: FdInfoError) {
    let before = input.to_vec();
    assert_eq!(FdInfoRecord::parse(input).err(), Some(expected));
    assert_eq!(input, before);
}

fn replace_value(field: usize, value: &[u8]) -> Vec<u8> {
    let mut lines: [&[u8]; 4] = [b"pos:\t0", b"flags:\t00", b"mnt_id:\t0", b"ino:\t0"];
    let prefixes = [b"pos:\t".as_slice(), b"flags:\t", b"mnt_id:\t", b"ino:\t"];
    let mut owned = Vec::new();
    owned.extend_from_slice(prefixes[field]);
    owned.extend_from_slice(value);
    lines[field] = &owned;
    [
        lines[0], b"\n", lines[1], b"\n", lines[2], b"\n", lines[3], b"\n",
    ]
    .concat()
}

#[test]
fn headless_native_fdinfo_preserves_untrusted_zero_maxima_and_octal_padding() {
    let zero = FdInfoRecord::parse(VALID).unwrap();
    assert_eq!(
        (zero.position, zero.flags, zero.mount_id, zero.inode),
        (0, 0, 0, 0)
    );

    let input = record(
        b"9223372036854775807",
        b"037777777777",
        b"2147483647",
        b"18446744073709551615",
    );
    let maximum = FdInfoRecord::parse(&input).unwrap();
    assert_eq!(maximum.position, i64::MAX as u64);
    assert_eq!(maximum.flags, u32::MAX);
    assert_eq!(maximum.mount_id, i32::MAX as u32);
    assert_eq!(maximum.inode, u64::MAX);

    let padded = FdInfoRecord::parse(&record(b"123", b"00000123", b"456", b"789")).unwrap();
    assert_eq!(
        (padded.position, padded.flags, padded.mount_id, padded.inode),
        (123, 83, 456, 789)
    );
    let ordinary = FdInfoRecord::parse(&record(b"0", b"02100000", b"0", b"0")).unwrap();
    assert_eq!(ordinary.flags, 0o2_100_000);
    let widest_padding = FdInfoRecord::parse(&record(b"0", b"000000000000", b"0", b"0")).unwrap();
    assert_eq!(widest_padding.flags, 0);
}

#[test]
fn headless_native_fdinfo_rejects_bounds_decimal_forms_and_octal_forms() {
    for (field, invalid) in [
        (0, b"9223372036854775808".as_slice()),
        (2, b"2147483648"),
        (3, b"18446744073709551616"),
        (3, b"184467440737095516150"),
    ] {
        denied(&replace_value(field, invalid), FdInfoError::InvalidNumber);
    }
    for field in [0, 2, 3] {
        for invalid in [
            b"00".as_slice(),
            b"01",
            b"+1",
            b"-1",
            b"1.0",
            b"0x1",
            b" 0",
            b"0 ",
            b"0 0",
            b"0\t",
            b"",
        ] {
            denied(&replace_value(field, invalid), FdInfoError::InvalidNumber);
        }
    }
    for invalid in [
        b"".as_slice(),
        b"0".as_slice(),
        b"1",
        b"77",
        b"08",
        b"0x1",
        b"+01",
        b"-01",
        b" 00",
        b"00 ",
        b"00 0",
        b"0\t0",
        b"040000000000",
        b"0000000000000",
    ] {
        denied(&replace_value(1, invalid), FdInfoError::InvalidNumber);
    }
}

#[test]
fn headless_native_fdinfo_rejects_framing_prefix_order_and_tails() {
    for length in 0..VALID.len() {
        denied(&VALID[..length], FdInfoError::InvalidFraming);
    }
    for input in [
        b"pos:\t0\nflags:\t00\nmnt_id:\t0\nino:\t0".as_slice(),
        b"pos:\t0\nflags:\t00\nmnt_id:\t0\nino:\t0\n\n",
        b"pos:\t0\nflags:\t00\nmnt_id:\t0\nino:\t0\nlock:\t1\n",
        b"pos:\t0\nflags:\t00\nmnt_id:\t0\nino:\t0\neventfd-count:\t1\n",
        b"pos:\t0\nflags:\t00\n\nmnt_id:\t0\nino:\t0\n",
        b"pos:\t0\nflags:\t00\nmnt_id:\t0\n",
    ] {
        denied(input, FdInfoError::InvalidFraming);
    }
    for input in [
        b"flags:\t00\npos:\t0\nmnt_id:\t0\nino:\t0\n".as_slice(),
        b"pos:\t0\npos:\t00\nmnt_id:\t0\nino:\t0\n",
        b"position:\t0\nflags:\t00\nmnt_id:\t0\nino:\t0\n",
        b"pos: 0\nflags:\t00\nmnt_id:\t0\nino:\t0\n",
        b"pos:\t0\nflags:\t00\nmount_id:\t0\nino:\t0\n",
        b"pos:\t0\nflags:\t00\nmnt_id:\t0\ninode:\t0\n",
    ] {
        denied(input, FdInfoError::InvalidField);
    }
}

#[test]
fn headless_native_fdinfo_error_precedence_is_global_then_ordered() {
    for input in [
        b"pos:\t+0\nwrong:\t00\nmnt_id:\t0\nino:\t0".as_slice(),
        b"pos:\t+0\nflags:\t00\nmnt_id:\t0\nino:\t\x7f\n",
    ] {
        denied(input, FdInfoError::InvalidFraming);
    }
    denied(
        b"pos:\t+0\nwrong:\t00\nmnt_id:\t0\nino:\t0\n",
        FdInfoError::InvalidNumber,
    );
    for input in [
        b"wrong:\t0\nbad:\t0\nbad:\t0\nbad:\t0\n".as_slice(),
        b"pos:\t0\nwrong:\t0\nbad:\t0\nbad:\t0\n",
        b"pos:\t0\nflags:\t00\nwrong:\t0\nbad:\t0\n",
        b"pos:\t0\nflags:\t00\nmnt_id:\t0\nwrong:\t0\n",
    ] {
        denied(input, FdInfoError::InvalidField);
    }
}

#[test]
fn headless_native_fdinfo_rejects_all_forbidden_controls_del_and_high_bytes() {
    let value_at = VALID.iter().position(|byte| *byte == b'0').unwrap();
    for byte in (0_u8..=31)
        .filter(|byte| !matches!(*byte, b'\t' | b'\n'))
        .chain(127..=255)
    {
        let mut input = VALID.to_vec();
        input[value_at] = byte;
        denied(&input, FdInfoError::InvalidFraming);
    }
}

#[test]
fn headless_native_fdinfo_cap_precedes_framing_and_errors_are_fixed() {
    let mut at_cap = VALID[..VALID.len() - 1].to_vec();
    at_cap.extend(std::iter::repeat_n(b'a', MAX_INPUT_BYTES - VALID.len()));
    at_cap.push(b'\n');
    assert_eq!(at_cap.len(), MAX_INPUT_BYTES);
    denied(&at_cap, FdInfoError::InvalidNumber);
    let mut over_cap = at_cap.clone();
    over_cap.push(b'\n');
    denied(&over_cap, FdInfoError::LimitExceeded);
    for (error, code) in [
        (FdInfoError::LimitExceeded, "native_fdinfo.limit_exceeded"),
        (FdInfoError::InvalidFraming, "native_fdinfo.invalid_framing"),
        (FdInfoError::InvalidField, "native_fdinfo.invalid_field"),
        (FdInfoError::InvalidNumber, "native_fdinfo.invalid_number"),
    ] {
        assert_eq!(error.code(), code);
    }
}

#[test]
fn headless_native_fdinfo_every_byte_substitution_is_panic_free_and_private() {
    for position in 0..VALID.len() {
        for byte in 0..=255 {
            let mut input = VALID.to_vec();
            input[position] = byte;
            let before = input.clone();
            match FdInfoRecord::parse(&input) {
                Ok(record) => {
                    assert!(i64::try_from(record.position).is_ok());
                    assert!(i32::try_from(record.mount_id).is_ok());
                }
                Err(error) => assert!(matches!(
                    error,
                    FdInfoError::LimitExceeded
                        | FdInfoError::InvalidFraming
                        | FdInfoError::InvalidField
                        | FdInfoError::InvalidNumber
                )),
            }
            assert_eq!(input, before);
        }
    }
}
