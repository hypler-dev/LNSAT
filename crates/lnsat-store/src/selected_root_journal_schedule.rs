//! Fixed source-level journal sampling order on the original operation.
//!
//! Issuing a point is not evidence that its native call completed, that a phase
//! was true, or that cleanup occurred. The physical journal must supply those
//! facts and stop on every failed boundary. No reset or new budget exists.

use super::{JournalFileRole, Operation, Ordering, RootError};

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub(super) enum ScanKind {
    Initial,
    BeforeAppend(u8),
    AfterAppend(u8),
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub(super) enum JournalPoint {
    RootCreateBefore,
    RootCreateAfter,
    PreparationCreateBefore,
    PreparationCreateAfter,
    AppendEntry(u8),
    RevisionCreateBefore(u8),
    RevisionCreateAfter(u8),
    WriteAfter(u8),
    FileSyncAfter(u8),
    DirectorySyncAfter(u8),
    ReadbackAfter(u8),
    ScanBefore(ScanKind, u8),
    ScanAfter(ScanKind, u8),
    JournalCloseBefore(JournalFileRole),
    JournalCloseAfter(JournalFileRole),
    ProcRetireBefore,
}

use JournalPoint::{
    AppendEntry, DirectorySyncAfter, FileSyncAfter, JournalCloseAfter, JournalCloseBefore,
    PreparationCreateAfter, PreparationCreateBefore, ProcRetireBefore, ReadbackAfter,
    RevisionCreateAfter, RevisionCreateBefore, RootCreateAfter, RootCreateBefore, ScanAfter,
    ScanBefore, WriteAfter,
};

const POINTS: [JournalPoint; 81] = [
    RootCreateBefore,
    RootCreateAfter,
    ScanBefore(ScanKind::Initial, 0),
    ScanAfter(ScanKind::Initial, 0),
    ScanBefore(ScanKind::Initial, 1),
    ScanAfter(ScanKind::Initial, 1),
    AppendEntry(0),
    ScanBefore(ScanKind::BeforeAppend(0), 0),
    ScanAfter(ScanKind::BeforeAppend(0), 0),
    ScanBefore(ScanKind::BeforeAppend(0), 1),
    ScanAfter(ScanKind::BeforeAppend(0), 1),
    PreparationCreateBefore,
    PreparationCreateAfter,
    RevisionCreateBefore(0),
    RevisionCreateAfter(0),
    WriteAfter(0),
    FileSyncAfter(0),
    DirectorySyncAfter(0),
    ScanBefore(ScanKind::AfterAppend(0), 0),
    ScanAfter(ScanKind::AfterAppend(0), 0),
    ScanBefore(ScanKind::AfterAppend(0), 1),
    ScanAfter(ScanKind::AfterAppend(0), 1),
    ReadbackAfter(0),
    AppendEntry(1),
    ScanBefore(ScanKind::BeforeAppend(1), 0),
    ScanAfter(ScanKind::BeforeAppend(1), 0),
    ScanBefore(ScanKind::BeforeAppend(1), 1),
    ScanAfter(ScanKind::BeforeAppend(1), 1),
    RevisionCreateBefore(1),
    RevisionCreateAfter(1),
    WriteAfter(1),
    FileSyncAfter(1),
    DirectorySyncAfter(1),
    ScanBefore(ScanKind::AfterAppend(1), 0),
    ScanAfter(ScanKind::AfterAppend(1), 0),
    ScanBefore(ScanKind::AfterAppend(1), 1),
    ScanAfter(ScanKind::AfterAppend(1), 1),
    ReadbackAfter(1),
    AppendEntry(2),
    ScanBefore(ScanKind::BeforeAppend(2), 0),
    ScanAfter(ScanKind::BeforeAppend(2), 0),
    ScanBefore(ScanKind::BeforeAppend(2), 1),
    ScanAfter(ScanKind::BeforeAppend(2), 1),
    RevisionCreateBefore(2),
    RevisionCreateAfter(2),
    WriteAfter(2),
    FileSyncAfter(2),
    DirectorySyncAfter(2),
    ScanBefore(ScanKind::AfterAppend(2), 0),
    ScanAfter(ScanKind::AfterAppend(2), 0),
    ScanBefore(ScanKind::AfterAppend(2), 1),
    ScanAfter(ScanKind::AfterAppend(2), 1),
    ReadbackAfter(2),
    AppendEntry(3),
    ScanBefore(ScanKind::BeforeAppend(3), 0),
    ScanAfter(ScanKind::BeforeAppend(3), 0),
    ScanBefore(ScanKind::BeforeAppend(3), 1),
    ScanAfter(ScanKind::BeforeAppend(3), 1),
    RevisionCreateBefore(3),
    RevisionCreateAfter(3),
    WriteAfter(3),
    FileSyncAfter(3),
    DirectorySyncAfter(3),
    ScanBefore(ScanKind::AfterAppend(3), 0),
    ScanAfter(ScanKind::AfterAppend(3), 0),
    ScanBefore(ScanKind::AfterAppend(3), 1),
    ScanAfter(ScanKind::AfterAppend(3), 1),
    ReadbackAfter(3),
    JournalCloseBefore(JournalFileRole::Revision3),
    JournalCloseAfter(JournalFileRole::Revision3),
    JournalCloseBefore(JournalFileRole::Revision2),
    JournalCloseAfter(JournalFileRole::Revision2),
    JournalCloseBefore(JournalFileRole::Revision1),
    JournalCloseAfter(JournalFileRole::Revision1),
    JournalCloseBefore(JournalFileRole::Revision0),
    JournalCloseAfter(JournalFileRole::Revision0),
    JournalCloseBefore(JournalFileRole::Preparation),
    JournalCloseAfter(JournalFileRole::Preparation),
    JournalCloseBefore(JournalFileRole::Root),
    JournalCloseAfter(JournalFileRole::Root),
    ProcRetireBefore,
];

pub(super) fn issue(operation: &Operation, point: JournalPoint) -> Result<(), RootError> {
    operation.returned()?;
    if operation.plan.journal.as_ref().is_none_or(|plan| {
        !plan.matches_selected_file_obligations(operation.plan.selected_file_obligations)
    }) {
        operation.original.shared_state().invalidate();
        return Err(RootError::Rejected);
    }
    operation
        .journal_checkpoint
        .fetch_update(Ordering::SeqCst, Ordering::SeqCst, |next| {
            if POINTS.get(usize::from(next)) == Some(&point) {
                next.checked_add(1)
            } else {
                None
            }
        })
        .map_err(|_| {
            operation.original.shared_state().invalidate();
            RootError::Rejected
        })?;
    operation.returned()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::selected_store::rooted::{storage, tests as root_tests};
    use std::path::Path;

    fn operation(journal: bool) -> Operation {
        let selection = storage::Selection::parse(Path::new("/a/selected.sqlite"))
            .expect("synthetic selection");
        let plan = if journal {
            root_tests::journal_plan(&selection)
        } else {
            root_tests::plan(&selection)
        };
        root_tests::operation_for_plan(plan).0
    }

    #[test]
    fn schedule_has_exact_80_journal_edges_and_one_final_proc_edge() {
        assert_eq!(POINTS.len(), 81);
        assert_eq!(POINTS[80], ProcRetireBefore);
        assert_eq!(
            POINTS
                .iter()
                .filter(|p| matches!(p, ScanBefore(..)))
                .count(),
            18
        );
        assert_eq!(
            POINTS.iter().filter(|p| matches!(p, ScanAfter(..))).count(),
            18
        );
        assert_eq!(
            POINTS
                .iter()
                .filter(|p| matches!(p, JournalCloseBefore(_)))
                .count(),
            6
        );
        assert_eq!(
            POINTS
                .iter()
                .filter(|p| matches!(p, JournalCloseAfter(_)))
                .count(),
            6
        );
        for (index, point) in POINTS.iter().enumerate() {
            assert!(!POINTS[..index].contains(point));
        }
        assert_eq!(2 + POINTS.len(), 83); // Two acquisition samples are separate.
        assert_eq!(7 * (2 + POINTS.len()), 581);
    }

    #[test]
    fn schedule_is_one_use_on_original_operation_without_native_entry() {
        let operation = operation(true);
        for (index, point) in POINTS.iter().enumerate() {
            assert_eq!(issue(&operation, *point), Ok(()));
            assert_eq!(
                usize::from(operation.journal_checkpoint.load(Ordering::SeqCst)),
                index + 1
            );
        }
        assert_eq!(operation.observations.load(Ordering::SeqCst), 0);
        assert_eq!(
            issue(&operation, ProcRetireBefore),
            Err(RootError::Rejected)
        );
        assert!(operation.original.shared_state().valid().is_err());
        assert_eq!(operation.journal_checkpoint.load(Ordering::SeqCst), 81);
    }

    #[test]
    fn schedule_rejects_missing_plan_skip_duplicate_and_invalid_original_without_healing() {
        let absent = operation(false);
        assert_eq!(issue(&absent, RootCreateBefore), Err(RootError::Rejected));
        assert_eq!(absent.journal_checkpoint.load(Ordering::SeqCst), 0);
        for point in [
            RootCreateAfter,
            AppendEntry(4),
            ScanBefore(ScanKind::Initial, 2),
        ] {
            let operation = operation(true);
            assert_eq!(issue(&operation, point), Err(RootError::Rejected));
            assert_eq!(issue(&operation, RootCreateBefore), Err(RootError::Budget));
            assert_eq!(operation.journal_checkpoint.load(Ordering::SeqCst), 0);
        }
        let duplicate = operation(true);
        assert_eq!(issue(&duplicate, RootCreateBefore), Ok(()));
        assert_eq!(
            issue(&duplicate, RootCreateBefore),
            Err(RootError::Rejected)
        );
        assert_eq!(issue(&duplicate, RootCreateAfter), Err(RootError::Budget));
        assert_eq!(duplicate.journal_checkpoint.load(Ordering::SeqCst), 1);
        let expired = operation(true);
        expired.original.shared_state().invalidate();
        assert_eq!(issue(&expired, RootCreateBefore), Err(RootError::Budget));
        assert_eq!(expired.journal_checkpoint.load(Ordering::SeqCst), 0);
    }
}
