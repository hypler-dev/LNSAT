//! Pure private Stage-A fdinfo representation; supplied bytes prove no native fact.

const MAX_INPUT_BYTES: usize = 4_096;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub(super) enum FdInfoError {
    LimitExceeded,
    InvalidFraming,
    InvalidField,
    InvalidNumber,
}

impl FdInfoError {
    const fn code(self) -> &'static str {
        match self {
            Self::LimitExceeded => "native_fdinfo.limit_exceeded",
            Self::InvalidFraming => "native_fdinfo.invalid_framing",
            Self::InvalidField => "native_fdinfo.invalid_field",
            Self::InvalidNumber => "native_fdinfo.invalid_number",
        }
    }
}

// Intentionally neither Debug nor serializable: values are private untrusted bytes.
pub(super) struct FdInfoRecord {
    position: u64,
    flags: u32,
    mount_id: u32,
    inode: u64,
}

impl FdInfoRecord {
    pub(super) fn parse(input: &[u8]) -> Result<Self, FdInfoError> {
        if input.len() > MAX_INPUT_BYTES {
            return Err(FdInfoError::LimitExceeded);
        }
        let lines = preflight(input)?;
        let position = decimal(value(lines[0], b"pos:\t")?, i64::MAX as u64)?;
        let flags = octal_flags(value(lines[1], b"flags:\t")?)?;
        let mount_id = decimal(value(lines[2], b"mnt_id:\t")?, i32::MAX as u64)?;
        let mount_id = u32::try_from(mount_id).map_err(|_| FdInfoError::InvalidNumber)?;
        let inode = decimal(value(lines[3], b"ino:\t")?, u64::MAX)?;
        Ok(Self {
            position,
            flags,
            mount_id,
            inode,
        })
    }

    pub(super) const fn flags(&self) -> u32 {
        self.flags
    }

    pub(super) const fn mount_id(&self) -> u32 {
        self.mount_id
    }

    pub(super) const fn inode(&self) -> u64 {
        self.inode
    }
}

fn preflight(input: &[u8]) -> Result<[&[u8]; 4], FdInfoError> {
    if input.is_empty() || input.last() != Some(&b'\n') {
        return Err(FdInfoError::InvalidFraming);
    }
    if input
        .iter()
        .any(|byte| *byte != b'\t' && *byte != b'\n' && !(*byte >= b' ' && *byte <= b'~'))
    {
        return Err(FdInfoError::InvalidFraming);
    }

    let mut lines = [&[][..]; 4];
    let mut count = 0;
    for framed in input.split_inclusive(|byte| *byte == b'\n') {
        let line = &framed[..framed.len() - 1];
        if line.is_empty() || count == lines.len() {
            return Err(FdInfoError::InvalidFraming);
        }
        lines[count] = line;
        count += 1;
    }
    if count != lines.len() {
        return Err(FdInfoError::InvalidFraming);
    }
    Ok(lines)
}

fn value<'a>(line: &'a [u8], prefix: &[u8]) -> Result<&'a [u8], FdInfoError> {
    line.strip_prefix(prefix).ok_or(FdInfoError::InvalidField)
}

fn decimal(bytes: &[u8], maximum: u64) -> Result<u64, FdInfoError> {
    if bytes.is_empty()
        || (bytes.len() > 1 && bytes[0] == b'0')
        || !bytes.iter().all(u8::is_ascii_digit)
    {
        return Err(FdInfoError::InvalidNumber);
    }
    let mut result = 0_u64;
    for byte in bytes {
        result = result
            .checked_mul(10)
            .and_then(|value| value.checked_add(u64::from(*byte - b'0')))
            .ok_or(FdInfoError::InvalidNumber)?;
    }
    if result > maximum {
        return Err(FdInfoError::InvalidNumber);
    }
    Ok(result)
}

fn octal_flags(bytes: &[u8]) -> Result<u32, FdInfoError> {
    if !(2..=12).contains(&bytes.len())
        || bytes[0] != b'0'
        || !bytes[1..].iter().all(|byte| (b'0'..=b'7').contains(byte))
    {
        return Err(FdInfoError::InvalidNumber);
    }
    let mut result = 0_u32;
    for byte in &bytes[1..] {
        result = result
            .checked_mul(8)
            .and_then(|value| value.checked_add(u32::from(*byte - b'0')))
            .ok_or(FdInfoError::InvalidNumber)?;
    }
    Ok(result)
}

#[cfg(test)]
#[path = "headless_native_fdinfo_tests.rs"]
mod tests;
