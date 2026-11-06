//! Non-owning samples from the root's original retained procfs File.
//!
//! One fixed seven-wrapper sequence. No callback, reopen, descriptor copy,
//! growing readlink helper, retry, cleanup receipt or native authority exists.

use super::{Identity, ProcSample, REQUIRED, RootError, identity};
use rustix::fs::{AtFlags, CWD};
use std::fs::File;

type Operation = super::super::super::Operation;

fn checked_identity(value: &rustix::fs::Statx) -> Result<Identity, RootError> {
    if value.stx_mask & REQUIRED.bits() != REQUIRED.bits()
        || value.stx_mnt_id == 0
        || value.stx_mode & 0o170_000 != 0o040_000
    {
        return Err(RootError::Custody);
    }
    Ok(identity(value))
}

pub(super) fn sample(
    operation: &Operation,
    file: &File,
    expected: Option<ProcSample>,
) -> Result<ProcSample, RootError> {
    let first_type = observed!(operation, rustix::fs::fstatfs(file));
    if first_type.f_type != 0x9fa0 {
        return Err(RootError::Custody);
    }
    let first_held = observed!(
        operation,
        rustix::fs::statx(file, c"", AtFlags::EMPTY_PATH, REQUIRED)
    );
    let first_held = checked_identity(&first_held)?;
    let first_named = observed!(
        operation,
        rustix::fs::statx(CWD, c"/proc", AtFlags::SYMLINK_NOFOLLOW, REQUIRED)
    );
    if checked_identity(&first_named)? != first_held
        || expected.is_some_and(|baseline| baseline.identity != first_held)
    {
        return Err(RootError::Custody);
    }
    let mut buffer = [0_u8; 65];
    let count = observed!(
        operation,
        rustix::fs::readlinkat_raw(file, c"thread-self/ns/mnt", &mut buffer[..])
    );
    // The safe initialized-slice API returns one count. A full buffer may be
    // truncated, so only the closed 1..=64 range is accepted without retry.
    if !(1..=64).contains(&count) {
        return Err(RootError::Custody);
    }
    let namespace = super::super::namespace_number(&buffer[..count])?;
    if expected.is_some_and(|baseline| baseline.namespace != namespace) {
        return Err(RootError::Custody);
    }
    let last_held = observed!(
        operation,
        rustix::fs::statx(file, c"", AtFlags::EMPTY_PATH, REQUIRED)
    );
    if checked_identity(&last_held)? != first_held {
        return Err(RootError::Custody);
    }
    let last_named = observed!(
        operation,
        rustix::fs::statx(CWD, c"/proc", AtFlags::SYMLINK_NOFOLLOW, REQUIRED)
    );
    if checked_identity(&last_named)? != first_held {
        return Err(RootError::Custody);
    }
    let last_type = observed!(operation, rustix::fs::fstatfs(file));
    if last_type.f_type != 0x9fa0 {
        return Err(RootError::Custody);
    }
    Ok(ProcSample {
        identity: first_held,
        namespace,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::selected_store::rooted::{storage, tests as root_tests};
    use std::{path::Path, sync::atomic::Ordering};

    fn operation() -> Operation {
        let selection = storage::Selection::parse(Path::new("/a/selected.sqlite"))
            .expect("synthetic bounded selection");
        root_tests::operation_for_plan(root_tests::plan(&selection)).0
    }

    #[test]
    fn borrowed_proc_sample_uses_seven_wrappers_and_keeps_original_file() {
        let file = File::open("/proc").expect("native fixture procfs");
        let operation = operation();
        let baseline = sample(&operation, &file, None).expect("native baseline sample");
        assert_eq!(operation.observations.load(Ordering::SeqCst), 7);
        assert!(sample(&operation, &file, Some(baseline)).is_ok());
        assert_eq!(operation.observations.load(Ordering::SeqCst), 14);
        assert!(
            file.metadata()
                .expect("same fixture owner stays open")
                .is_dir()
        );
    }

    #[test]
    fn foreign_namespace_stops_at_readlink_without_remaining_wrappers() {
        let file = File::open("/proc").expect("native fixture procfs");
        let operation = operation();
        let mut baseline = sample(&operation, &file, None).expect("native baseline sample");
        baseline.namespace = baseline.namespace.wrapping_add(1);
        assert!(matches!(
            sample(&operation, &file, Some(baseline)),
            Err(RootError::Custody)
        ));
        assert_eq!(operation.observations.load(Ordering::SeqCst), 11);
        assert!(
            file.metadata()
                .expect("rejected sample keeps borrowed owner")
                .is_dir()
        );
    }

    #[test]
    fn invalid_original_enters_no_wrapper_and_never_adopts_another_budget() {
        let file = File::open("/proc").expect("native fixture procfs");
        let operation = operation();
        operation.original.shared_state().invalidate();
        assert!(matches!(
            sample(&operation, &file, None),
            Err(RootError::Budget)
        ));
        assert_eq!(operation.observations.load(Ordering::SeqCst), 0);
        assert!(operation.original.shared_state().valid().is_err());
        assert!(
            file.metadata()
                .expect("invalid original keeps borrowed owner")
                .is_dir()
        );
    }

    #[test]
    fn non_proc_owner_stops_after_first_type_wrapper() {
        let file = File::open(env!("CARGO_MANIFEST_DIR")).expect("fixture checkout directory");
        let operation = operation();
        assert!(matches!(
            sample(&operation, &file, None),
            Err(RootError::Custody)
        ));
        assert_eq!(operation.observations.load(Ordering::SeqCst), 1);
        assert!(
            file.metadata()
                .expect("non-proc borrowed owner stays open")
                .is_dir()
        );
    }
}
