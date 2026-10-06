//! Closed Linux ACL grammar. Parsing never proves native provenance or access.

use super::NativeError;

pub(super) const MAX_ACL_BYTES: usize = 8_196;
const MAX_ENTRIES: usize = 1_024;
const UNDEFINED_ID: u32 = u32::MAX;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub(super) enum Tag {
    UserObject,
    User,
    GroupObject,
    Group,
    Mask,
    Other,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub(super) struct Entry {
    pub(super) tag: Tag,
    pub(super) permissions: u16,
    pub(super) id: u32,
}

#[derive(Eq, PartialEq)]
pub(super) struct ParsedAcl {
    entries: Vec<Entry>,
    mask: Option<u16>,
}

impl ParsedAcl {
    pub(super) fn parse(bytes: &[u8]) -> Result<Self, NativeError> {
        if bytes.len() > MAX_ACL_BYTES {
            return Err(NativeError::LimitExceeded);
        }
        if bytes.len() < 28
            || !(bytes.len() - 4).is_multiple_of(8)
            || bytes[..4] != 2_u32.to_le_bytes()
        {
            return Err(NativeError::InvalidAcl);
        }
        let count = (bytes.len() - 4) / 8;
        if count > MAX_ENTRIES {
            return Err(NativeError::LimitExceeded);
        }
        let mut entries = Vec::with_capacity(count);
        for chunk in bytes[4..].chunks_exact(8) {
            let tag = match u16::from_le_bytes([chunk[0], chunk[1]]) {
                1 => Tag::UserObject,
                2 => Tag::User,
                4 => Tag::GroupObject,
                8 => Tag::Group,
                16 => Tag::Mask,
                32 => Tag::Other,
                _ => return Err(NativeError::InvalidAcl),
            };
            let permissions = u16::from_le_bytes([chunk[2], chunk[3]]);
            let id = u32::from_le_bytes([chunk[4], chunk[5], chunk[6], chunk[7]]);
            if permissions > 7 || matches!(tag, Tag::User | Tag::Group) == (id == UNDEFINED_ID) {
                return Err(NativeError::InvalidAcl);
            }
            entries.push(Entry {
                tag,
                permissions,
                id,
            });
        }
        let mut at = 0;
        take_base(&entries, &mut at, Tag::UserObject)?;
        let users = take_named(&entries, &mut at, Tag::User)?;
        take_base(&entries, &mut at, Tag::GroupObject)?;
        let groups = take_named(&entries, &mut at, Tag::Group)?;
        let mask = if entries.get(at).is_some_and(|entry| entry.tag == Tag::Mask) {
            Some(take_base(&entries, &mut at, Tag::Mask)?)
        } else {
            None
        };
        if (users || groups) && mask.is_none() {
            return Err(NativeError::InvalidAcl);
        }
        take_base(&entries, &mut at, Tag::Other)?;
        if at != entries.len() {
            return Err(NativeError::InvalidAcl);
        }
        Ok(Self { entries, mask })
    }

    pub(super) fn check_access_mode(&self, mode: u32) -> Result<(), NativeError> {
        let owner = self.entries[0].permissions;
        let other = self.entries[self.entries.len() - 1].permissions;
        // A present mask is the inode group class, not raw GROUP_OBJ rights.
        let group = self.mask.unwrap_or_else(|| {
            self.entries
                .iter()
                .find(|entry| entry.tag == Tag::GroupObject)
                .expect("validated ACL has GROUP_OBJ")
                .permissions
        });
        if u32::from(owner) != (mode >> 6) & 7
            || u32::from(group) != (mode >> 3) & 7
            || u32::from(other) != mode & 7
        {
            return Err(NativeError::ModeMismatch);
        }
        Ok(())
    }

    /// Masked permissions are interpretation only, never a grant or permit.
    pub(super) fn effective_permissions(&self, entry: Entry) -> u16 {
        match entry.tag {
            Tag::User | Tag::GroupObject | Tag::Group => entry.permissions & self.mask.unwrap_or(7),
            _ => entry.permissions,
        }
    }

    #[cfg(test)]
    pub(super) fn entries(&self) -> &[Entry] {
        &self.entries
    }
}

fn take_base(entries: &[Entry], at: &mut usize, tag: Tag) -> Result<u16, NativeError> {
    let entry = entries
        .get(*at)
        .filter(|entry| entry.tag == tag)
        .ok_or(NativeError::InvalidAcl)?;
    *at += 1;
    Ok(entry.permissions)
}

fn take_named(entries: &[Entry], at: &mut usize, tag: Tag) -> Result<bool, NativeError> {
    let start = *at;
    let mut last = None;
    while let Some(entry) = entries.get(*at).filter(|entry| entry.tag == tag) {
        if last.is_some_and(|id| id >= entry.id) {
            return Err(NativeError::InvalidAcl);
        }
        last = Some(entry.id);
        *at += 1;
    }
    Ok(*at != start)
}
