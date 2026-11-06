use super::*;

const PREPARATION: &str = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const CANDIDATE: &str = "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const STORE: &str = "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc";
const RECIPE: &str = "sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd";
const CHALLENGE: &str = "sha256:eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";

fn expectation(uid: u32) -> ExpectedPendingJournal<'static> {
    ExpectedPendingJournal {
        owner_uid: uid,
        preparation_id: PREPARATION,
        candidate_digest: CANDIDATE,
        store_digest: STORE,
        recipe_digest: RECIPE,
        challenge_digest: CHALLENGE,
    }
}

pub(super) fn bytes(uid: u32) -> Vec<u8> {
    format!(
        concat!(
            "{{\"schema_id\":\"lnsat.hcfg_preparation_journal.v1\",",
            "\"contract_version\":\"lnsat.contracts.v1_0\",\"preparation_id\":\"{}\",",
            "\"candidate_digest\":\"{}\",\"store_digest\":\"{}\",\"recipe_digest\":\"{}\",",
            "\"owner_uid\":{},\"challenge_digest\":\"{}\",\"phase\":\"pending\",",
            "\"container_name\":\"lnsat-hcfg6-probe-{}\",\"container_id\":null,",
            "\"previous_digest\":null,\"revision\":0}}\n"
        ),
        PREPARATION, CANDIDATE, STORE, RECIPE, uid, CHALLENGE, PREPARATION
    )
    .into_bytes()
}

pub(super) fn fixture_input(selection: &Selection, uid: u32) -> PendingJournalInput {
    // Source-controlled syntax fixture only, not a recipe/probe/cleanup witness.
    let expected = expectation(uid);
    PendingJournalInput::parse(selection, &expected, &bytes(uid))
        .expect("bounded pending syntax fixture")
}

#[test]
fn pending_input_retains_exact_canonical_context_and_selection_without_io() {
    let selection = Selection::parse(Path::new("/a/store.sqlite")).expect("syntactic selection");
    let input = fixture_input(&selection, 501);
    assert!(input.matches_selection(&selection));
    assert_eq!(input.expected.bytes(), bytes(501));
    assert_eq!(input.root_name, "store.sqlite.lnsat-preparations");
    assert_eq!(input.preparation_name, PREPARATION);
    assert_eq!(
        input.revision_zero_path.file_name(),
        Some(std::ffi::OsStr::new(REVISION_ZERO))
    );
    let other = Selection::parse(Path::new("/b/store.sqlite")).expect("other syntactic selection");
    assert!(!input.matches_selection(&other));
}

#[test]
fn pending_input_rejects_foreign_context_invalid_frame_and_other_valid_phase() {
    let selection = Selection::parse(Path::new("/a/store.sqlite")).expect("syntactic selection");
    let raw = bytes(501);
    for field in 0..6 {
        let mut context = expectation(501);
        match field {
            0 => context.owner_uid = 502,
            1 => context.preparation_id = "f",
            2 => context.candidate_digest = STORE,
            3 => context.store_digest = RECIPE,
            4 => context.recipe_digest = CHALLENGE,
            _ => context.challenge_digest = CANDIDATE,
        }
        assert!(matches!(
            PendingJournalInput::parse(&selection, &context, &raw),
            Err(RootError::Rejected)
        ));
    }
    let mut trailing = raw.clone();
    trailing.push(b' ');
    assert!(PendingJournalInput::parse(&selection, &expectation(501), &trailing).is_err());
    assert!(
        PendingJournalInput::parse(
            &selection,
            &expectation(501),
            &vec![b'x'; MAX_RECORD_BYTES + 1]
        )
        .is_err()
    );
    let probe = String::from_utf8(raw)
        .expect("fixture UTF8")
        .replace("\"phase\":\"pending\"", "\"phase\":\"probe_created\"")
        .replace(
            "\"container_id\":null",
            &format!("\"container_id\":\"{}\"", "f".repeat(64)),
        )
        .replace(
            "\"previous_digest\":null",
            &format!("\"previous_digest\":\"sha256:{}\"", "1".repeat(64)),
        )
        .replace("\"revision\":0", "\"revision\":1");
    assert!(UnverifiedRootJournalFrame::decode(probe.as_bytes()).is_ok());
    assert!(matches!(
        PendingJournalInput::parse(&selection, &expectation(501), probe.as_bytes()),
        Err(RootError::Rejected)
    ));
}

#[test]
fn pending_input_rejects_component_and_complete_path_overflow_before_io() {
    let allowed = "a".repeat(MAX_NAME_BYTES - ROOT_SUFFIX.len());
    let selection =
        Selection::parse(&Path::new("/a").join(&allowed)).expect("syntactic bounded leaf");
    assert!(PendingJournalInput::parse(&selection, &expectation(501), &bytes(501)).is_ok());
    let too_long = Path::new("/a").join(format!("{allowed}a"));
    let selection =
        Selection::parse(&too_long).expect("syntactic leaf, journal suffix checked separately");
    assert!(matches!(
        PendingJournalInput::parse(&selection, &expectation(501), &bytes(501)),
        Err(RootError::Rejected)
    ));
    let mut deep = PathBuf::from("/");
    for _ in 0..125 {
        deep.push("p".repeat(31));
    }
    deep.push("store.sqlite");
    let selection = Selection::parse(&deep).expect("syntactic depth/path inside selection limit");
    assert!(matches!(
        PendingJournalInput::parse(&selection, &expectation(501), &bytes(501)),
        Err(RootError::Rejected)
    ));
}
