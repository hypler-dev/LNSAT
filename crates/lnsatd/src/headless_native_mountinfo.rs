//! Pure private Stage-A mountinfo representation; no I/O, identity or authority.
//!
//! Supplied records authenticate no kernel, mount, namespace or option absence.
//! The exact finite grammar is in native-mountinfo-candidate-source-spec.md.

const MAX_INPUT_BYTES: usize = 1_048_576;
const MAX_ROWS: usize = 4_096;
const MAX_ROW_BYTES: usize = 8_192;
const MAX_OPTIONAL_FIELDS: usize = 32;
const MAX_TOKENS: usize = 6 + MAX_OPTIONAL_FIELDS + 1 + 3;
const MAX_PATH_BYTES: usize = 4_096;
const MAX_TYPE_BYTES: usize = 256;
const MAX_OPTION_BYTES: usize = 4_096;
const MAX_OPTIONS: usize = 64;
const MAX_OPTION_TOKEN_BYTES: usize = 1_024;
const MAX_OPTIONAL_TOKEN_BYTES: usize = 256;
const MAX_TAG_BYTES: usize = 32;
const MAX_MOUNT_ID: u32 = 2_147_483_647;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub(super) enum MountInfoError {
    LimitExceeded,
    InvalidFraming,
    InvalidRow,
    InvalidNumber,
    InvalidEscape,
    InvalidOptions,
    InvalidOptionalField,
    DuplicateMountId,
    StorageUnavailable,
}

impl MountInfoError {
    pub(super) const fn code(self) -> &'static str {
        match self {
            Self::LimitExceeded => "native_mountinfo.limit_exceeded",
            Self::InvalidFraming => "native_mountinfo.invalid_framing",
            Self::InvalidRow => "native_mountinfo.invalid_row",
            Self::InvalidNumber => "native_mountinfo.invalid_number",
            Self::InvalidEscape => "native_mountinfo.invalid_escape",
            Self::InvalidOptions => "native_mountinfo.invalid_options",
            Self::InvalidOptionalField => "native_mountinfo.invalid_optional_field",
            Self::DuplicateMountId => "native_mountinfo.duplicate_mount_id",
            Self::StorageUnavailable => "native_mountinfo.storage_unavailable",
        }
    }
}

// Intentionally neither Debug nor serializable: private bytes are not diagnostics.
pub(super) struct MountInfoRow<'a> {
    mount_id: u32,
    parent_id: u32,
    device_major: u32,
    device_minor: u32,
    root: Vec<u8>,
    mountpoint: Vec<u8>,
    mount_options: &'a [u8],
    optional_fields: &'a [u8],
    filesystem_type: Vec<u8>,
    source: Vec<u8>,
    super_options: &'a [u8],
}

pub(super) struct MountInfoTable<'a> {
    rows: Vec<MountInfoRow<'a>>,
}

impl<'a> MountInfoTable<'a> {
    pub(super) fn parse(input: &'a [u8]) -> Result<Self, MountInfoError> {
        let row_count = preflight(input)?;
        let mut rows = Vec::new();
        let mut ids = Vec::new();
        reserve_exact(&mut rows, row_count)?;
        reserve_exact(&mut ids, row_count)?;
        for framed in input.split_inclusive(|byte| *byte == b'\n') {
            let row = parse_row(&framed[..framed.len() - 1])?;
            ids.push(row.mount_id);
            rows.push(row);
        }
        // Sorting bounded numeric scratch never changes the input row order.
        ids.sort_unstable();
        if ids.windows(2).any(|pair| pair[0] == pair[1]) {
            return Err(MountInfoError::DuplicateMountId);
        }
        Ok(Self { rows })
    }

    pub(super) fn row_by_mount_id(&self, mount_id: u32) -> Option<&MountInfoRow<'a>> {
        self.rows.iter().find(|row| row.mount_id == mount_id)
    }
}

impl MountInfoRow<'_> {
    pub(super) const fn mount_id(&self) -> u32 {
        self.mount_id
    }

    pub(super) const fn device(&self) -> (u32, u32) {
        (self.device_major, self.device_minor)
    }

    pub(super) fn filesystem_type(&self) -> &[u8] {
        &self.filesystem_type
    }
}

fn preflight(input: &[u8]) -> Result<usize, MountInfoError> {
    if input.len() > MAX_INPUT_BYTES {
        return Err(MountInfoError::LimitExceeded);
    }
    if input.is_empty() || input.last() != Some(&b'\n') {
        return Err(MountInfoError::InvalidFraming);
    }
    let mut rows = 0;
    for framed in input.split_inclusive(|byte| *byte == b'\n') {
        if framed.len() > MAX_ROW_BYTES || rows == MAX_ROWS {
            return Err(MountInfoError::LimitExceeded);
        }
        let line = &framed[..framed.len() - 1];
        if line.is_empty() || line.iter().any(u8::is_ascii_control) {
            return Err(MountInfoError::InvalidFraming);
        }
        rows += 1;
    }
    Ok(rows)
}

fn parse_row(line: &[u8]) -> Result<MountInfoRow<'_>, MountInfoError> {
    let mut tokens: [&[u8]; MAX_TOKENS] = [&[]; MAX_TOKENS];
    let mut count = 0;
    for token in line.split(|byte| *byte == b' ') {
        if token.is_empty() {
            return Err(MountInfoError::InvalidRow);
        }
        if count == MAX_TOKENS {
            return Err(MountInfoError::LimitExceeded);
        }
        tokens[count] = token;
        count += 1;
    }
    if count < 10 {
        return Err(MountInfoError::InvalidRow);
    }
    let separator = count - 4;
    if tokens[separator] != b"-" || tokens[6..separator].contains(&b"-".as_slice()) {
        return Err(MountInfoError::InvalidRow);
    }
    let mount_id = decimal(tokens[0], MAX_MOUNT_ID)?;
    let parent_id = decimal(tokens[1], MAX_MOUNT_ID)?;
    let device = tokens[2];
    let colon = device
        .iter()
        .position(|byte| *byte == b':')
        .ok_or(MountInfoError::InvalidNumber)?;
    let device_major = decimal(&device[..colon], u32::MAX)?;
    let device_minor = decimal(&device[colon + 1..], u32::MAX)?;
    validate_options(tokens[5])?;
    validate_options(tokens[separator + 3])?;
    validate_optional_fields(&tokens[6..separator])?;

    let optional_start: usize = tokens[..6].iter().map(|token| token.len() + 1).sum();
    let optional_length = tokens[6..separator]
        .iter()
        .map(|token| token.len() + 1)
        .sum::<usize>()
        .saturating_sub(1);
    Ok(MountInfoRow {
        mount_id,
        parent_id,
        device_major,
        device_minor,
        root: decode_field(tokens[3], MAX_PATH_BYTES, true, false)?,
        mountpoint: decode_field(tokens[4], MAX_PATH_BYTES, true, false)?,
        mount_options: tokens[5],
        optional_fields: &line[optional_start..optional_start + optional_length],
        filesystem_type: decode_field(tokens[separator + 1], MAX_TYPE_BYTES, false, true)?,
        source: decode_field(tokens[separator + 2], MAX_PATH_BYTES, false, true)?,
        super_options: tokens[separator + 3],
    })
}

fn decimal(bytes: &[u8], maximum: u32) -> Result<u32, MountInfoError> {
    if bytes.is_empty()
        || bytes.len() > 10
        || (bytes.len() > 1 && bytes[0] == b'0')
        || !bytes.iter().all(u8::is_ascii_digit)
    {
        return Err(MountInfoError::InvalidNumber);
    }
    let mut value = 0_u32;
    for byte in bytes {
        value = value
            .checked_mul(10)
            .and_then(|value| value.checked_add(u32::from(*byte - b'0')))
            .ok_or(MountInfoError::InvalidNumber)?;
    }
    if value > maximum {
        return Err(MountInfoError::InvalidNumber);
    }
    Ok(value)
}

fn validate_options(bytes: &[u8]) -> Result<(), MountInfoError> {
    if bytes.len() > MAX_OPTION_BYTES {
        return Err(MountInfoError::LimitExceeded);
    }
    for (index, token) in bytes.split(|byte| *byte == b',').enumerate() {
        if index == MAX_OPTIONS || token.len() > MAX_OPTION_TOKEN_BYTES {
            return Err(MountInfoError::LimitExceeded);
        }
        if token.is_empty()
            || (index == 0 && token != b"ro" && token != b"rw")
            || (index > 0 && (token == b"ro" || token == b"rw"))
            || bytes
                .split(|byte| *byte == b',')
                .take(index)
                .any(|prior| prior == token)
        {
            return Err(MountInfoError::InvalidOptions);
        }
    }
    Ok(())
}

fn tag_parts(token: &[u8]) -> (&[u8], Option<&[u8]>) {
    token
        .iter()
        .position(|byte| *byte == b':')
        .map_or((token, None), |colon| {
            (&token[..colon], Some(&token[colon + 1..]))
        })
}

fn validate_optional_fields(fields: &[&[u8]]) -> Result<(), MountInfoError> {
    for (index, token) in fields.iter().enumerate() {
        if token.len() > MAX_OPTIONAL_TOKEN_BYTES {
            return Err(MountInfoError::LimitExceeded);
        }
        let (tag, value) = tag_parts(token);
        if tag.len() > MAX_TAG_BYTES {
            return Err(MountInfoError::LimitExceeded);
        }
        if tag.is_empty()
            || !tag[0].is_ascii_lowercase()
            || !tag
                .iter()
                .all(|byte| byte.is_ascii_lowercase() || byte.is_ascii_digit() || *byte == b'_')
            || value.is_some_and(<[u8]>::is_empty)
            || fields[..index]
                .iter()
                .any(|prior| tag_parts(prior).0 == tag)
        {
            return Err(MountInfoError::InvalidOptionalField);
        }
        match tag {
            b"shared" | b"master" | b"propagate_from" => {
                let value = value.ok_or(MountInfoError::InvalidOptionalField)?;
                if decimal(value, MAX_MOUNT_ID).map_err(|_| MountInfoError::InvalidOptionalField)?
                    == 0
                {
                    return Err(MountInfoError::InvalidOptionalField);
                }
            }
            b"unbindable" if value.is_some() => {
                return Err(MountInfoError::InvalidOptionalField);
            }
            _ => {}
        }
    }
    Ok(())
}

fn decode_field(
    bytes: &[u8],
    maximum: usize,
    absolute: bool,
    generic_mangle: bool,
) -> Result<Vec<u8>, MountInfoError> {
    if bytes.len() > maximum {
        return Err(MountInfoError::LimitExceeded);
    }
    if bytes.is_empty() || (absolute && bytes[0] != b'/') {
        return Err(MountInfoError::InvalidRow);
    }
    let mut decoded = Vec::new();
    reserve_exact(&mut decoded, bytes.len())?;
    let mut index = 0;
    while index < bytes.len() {
        let byte = bytes[index];
        if byte == b'\\' {
            let escape = bytes
                .get(index..index + 4)
                .ok_or(MountInfoError::InvalidEscape)?;
            decoded.push(match escape {
                b"\\040" => b' ',
                b"\\011" => b'\t',
                b"\\012" => b'\n',
                b"\\134" => b'\\',
                b"\\043" if generic_mangle => b'#',
                _ => return Err(MountInfoError::InvalidEscape),
            });
            index += 4;
        } else {
            if generic_mangle && byte == b'#' {
                return Err(MountInfoError::InvalidEscape);
            }
            decoded.push(byte);
            index += 1;
        }
    }
    Ok(decoded)
}

fn reserve_exact<T>(bytes: &mut Vec<T>, additional: usize) -> Result<(), MountInfoError> {
    // The scoped test hook can only reject; it does not exist in non-test builds.
    #[cfg(test)]
    if tests::deny_reservation() {
        return Err(MountInfoError::StorageUnavailable);
    }
    bytes
        .try_reserve_exact(additional)
        .map_err(|_| MountInfoError::StorageUnavailable)
}

#[cfg(test)]
#[path = "headless_native_mountinfo_tests.rs"]
mod tests;
