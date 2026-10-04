use super::*;

const PREPARATION_ID: &str = "abababababababababababababababababababababababababababababababab";
const CONTAINER_ID: &str = "cdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcd";
const OTHER_CONTAINER_ID: &str = "dededededededededededededededededededededededededededededededede";
const CANDIDATE_DIGEST: &str =
    "sha256:1111111111111111111111111111111111111111111111111111111111111111";
const STORE_DIGEST: &str =
    "sha256:2222222222222222222222222222222222222222222222222222222222222222";
const RECIPE_DIGEST: &str =
    "sha256:3333333333333333333333333333333333333333333333333333333333333333";
const CHALLENGE_DIGEST: &str =
    "sha256:4444444444444444444444444444444444444444444444444444444444444444";
const PROFILE_DIGEST: &str =
    "sha256:5555555555555555555555555555555555555555555555555555555555555555";
const BINDING_DIGEST: &str =
    "sha256:6666666666666666666666666666666666666666666666666666666666666666";

const PENDING_FRAME: &str = "{\"schema_id\":\"lnsat.hcfg_preparation_journal.v1\",\"contract_version\":\"lnsat.contracts.v1_0\",\"preparation_id\":\"abababababababababababababababababababababababababababababababab\",\"candidate_digest\":\"sha256:1111111111111111111111111111111111111111111111111111111111111111\",\"store_digest\":\"sha256:2222222222222222222222222222222222222222222222222222222222222222\",\"recipe_digest\":\"sha256:3333333333333333333333333333333333333333333333333333333333333333\",\"owner_uid\":1001,\"challenge_digest\":\"sha256:4444444444444444444444444444444444444444444444444444444444444444\",\"phase\":\"pending\",\"container_name\":\"lnsat-hcfg6-probe-abababababababababababababababababababababababababababababababab\",\"container_id\":null,\"previous_digest\":null,\"revision\":0}\n";
const PENDING_JOURNAL_DIGEST: &str =
    "sha256:8509c1058896c0cdef43256e3ac789c69a26f98db725990c4c7dc8060d997c7c";
const CANDIDATE_GOLDEN: &str =
    "sha256:cf1c71a9bddb13a419862b2160af7d0f8193ae79fa840dbbd074008b28046cf9";

fn nullable(value: Option<&str>) -> NullableString {
    NullableString(value.map(str::to_owned))
}

fn journal_record(
    phase: JournalPhase,
    revision: u8,
    container_id: Option<&str>,
    previous_digest: Option<&str>,
) -> JournalRecord {
    JournalRecord {
        schema_id: "lnsat.hcfg_preparation_journal.v1".to_owned(),
        contract_version: "lnsat.contracts.v1_0".to_owned(),
        preparation_id: PREPARATION_ID.to_owned(),
        candidate_digest: CANDIDATE_DIGEST.to_owned(),
        store_digest: STORE_DIGEST.to_owned(),
        recipe_digest: RECIPE_DIGEST.to_owned(),
        owner_uid: 1001,
        challenge_digest: CHALLENGE_DIGEST.to_owned(),
        phase,
        container_name: format!("lnsat-hcfg6-probe-{PREPARATION_ID}"),
        container_id: nullable(container_id),
        previous_digest: nullable(previous_digest),
        revision,
    }
}

fn pending() -> JournalRecord {
    journal_record(JournalPhase::Pending, 0, None, None)
}

fn following(
    prior: &JournalRecord,
    phase: JournalPhase,
    revision: u8,
    container_id: Option<&str>,
) -> JournalRecord {
    let prior_digest = journal_digest(prior).expect("test record must digest");
    journal_record(phase, revision, container_id, Some(&prior_digest))
}

fn normal_records() -> Vec<JournalRecord> {
    let first = pending();
    let second = following(&first, JournalPhase::ProbeCreated, 1, Some(CONTAINER_ID));
    let third = following(
        &second,
        JournalPhase::CleanupVerified,
        2,
        Some(CONTAINER_ID),
    );
    let fourth = following(&third, JournalPhase::Bound, 3, Some(CONTAINER_ID));
    vec![first, second, third, fourth]
}

fn zero_created_records() -> Vec<JournalRecord> {
    let first = pending();
    let second = following(&first, JournalPhase::CleanupVerified, 1, None);
    let third = following(&second, JournalPhase::Bound, 2, None);
    vec![first, second, third]
}

fn encode_records(records: &[JournalRecord]) -> Vec<Vec<u8>> {
    records
        .iter()
        .map(|record| encode_record(record).expect("test record must encode"))
        .collect()
}

fn unchecked_frame(record: &JournalRecord) -> Vec<u8> {
    let mut frame = serde_json::to_vec(record).expect("test fixture must serialize");
    frame.push(b'\n');
    frame
}

fn validate_frames(frames: &[Vec<u8>]) -> Result<JournalChain, JournalError> {
    let references: Vec<_> = frames.iter().map(Vec::as_slice).collect();
    validate_revision_chain(&references)
}

fn assert_error<T>(result: &Result<T, JournalError>, expected: &str) {
    match result {
        Err(error) => assert_eq!(error.code(), expected),
        Ok(_) => panic!("expected {expected}"),
    }
}

fn assert_decode_error(frame: &[u8], expected: &str) {
    assert_error(&decode_record(frame), expected);
}

fn assert_chain_error(frames: &[Vec<u8>], expected: &str) {
    assert_error(&validate_frames(frames), expected);
}

fn phase_from_name(name: &str) -> JournalPhase {
    match name {
        "pending" => JournalPhase::Pending,
        "probe_created" => JournalPhase::ProbeCreated,
        "cleanup_verified" => JournalPhase::CleanupVerified,
        "bound" => JournalPhase::Bound,
        "quarantined" => JournalPhase::Quarantined,
        _ => panic!("unknown test phase"),
    }
}

fn prefix_for_phase(name: &str) -> Vec<JournalRecord> {
    let first = pending();
    match name {
        "pending" => vec![first],
        "probe_created" => {
            let second = following(&first, JournalPhase::ProbeCreated, 1, Some(CONTAINER_ID));
            vec![first, second]
        }
        "cleanup_verified" => {
            let second = following(&first, JournalPhase::CleanupVerified, 1, None);
            vec![first, second]
        }
        "bound" => {
            let second = following(&first, JournalPhase::CleanupVerified, 1, None);
            let third = following(&second, JournalPhase::Bound, 2, None);
            vec![first, second, third]
        }
        "quarantined" => {
            let second = following(&first, JournalPhase::Quarantined, 1, None);
            vec![first, second]
        }
        _ => panic!("unknown test phase"),
    }
}

fn continuation_container(from: &str, to: &str) -> Option<&'static str> {
    if to == "probe_created" || from == "probe_created" {
        Some(CONTAINER_ID)
    } else {
        None
    }
}

const ALLOWED_PHASE_EDGES: [(&str, &str); 7] = [
    ("pending", "probe_created"),
    ("pending", "cleanup_verified"),
    ("pending", "quarantined"),
    ("probe_created", "cleanup_verified"),
    ("probe_created", "quarantined"),
    ("cleanup_verified", "bound"),
    ("cleanup_verified", "quarantined"),
];

fn allowed_edge(from: &str, to: &str) -> bool {
    ALLOWED_PHASE_EDGES.contains(&(from, to))
}

#[test]
fn candidate_digest_matches_independent_positional_golden() {
    let input = CandidateInput {
        declaration_digest: CANDIDATE_DIGEST,
        composed_digest: STORE_DIGEST,
        binding_digest: RECIPE_DIGEST,
        store_digest: CHALLENGE_DIGEST,
        profile_digest: PROFILE_DIGEST,
        recipe_digest: BINDING_DIGEST,
        owner_uid: 1001,
    };
    assert_eq!(candidate_digest(&input).unwrap(), CANDIDATE_GOLDEN);
}

#[test]
fn pending_codec_matches_independent_frame_and_journal_golden() {
    let record = pending();
    assert_eq!(encode_record(&record).unwrap(), PENDING_FRAME.as_bytes());
    assert_eq!(journal_digest(&record).unwrap(), PENDING_JOURNAL_DIGEST);

    let decoded = decode_record(PENDING_FRAME.as_bytes()).unwrap();
    assert!(matches!(decoded.phase, JournalPhase::Pending));
    assert_eq!(decoded.revision, 0);
    assert!(decoded.container_id.0.is_none());
    assert!(decoded.previous_digest.0.is_none());
    assert_eq!(encode_record(&decoded).unwrap(), PENDING_FRAME.as_bytes());
    assert_eq!(journal_digest(&decoded).unwrap(), PENDING_JOURNAL_DIGEST);
}

#[test]
fn normal_and_zero_created_chains_validate_with_exact_continuity() {
    let normal = encode_records(&normal_records());
    let chain = validate_frames(&normal).expect("normal chain must validate");
    assert_eq!(chain.records.len(), 4);
    assert_eq!(
        chain.final_digest,
        "sha256:90719551302405b16ca3991e8948f0f0ce6cd887ea44cd7db5e16782080f5d96"
    );

    let zero_created = encode_records(&zero_created_records());
    let chain = validate_frames(&zero_created).expect("zero-created chain must validate");
    assert_eq!(chain.records.len(), 3);
    assert!(chain.records[1].container_id.0.is_none());
    assert!(chain.records[2].container_id.0.is_none());
}

#[test]
fn quarantine_edges_cover_null_first_identity_and_retention() {
    let first = pending();
    let quarantine = following(&first, JournalPhase::Quarantined, 1, None);
    let pending_to_quarantine_null = vec![first, quarantine];

    let first = pending();
    let quarantine = following(&first, JournalPhase::Quarantined, 1, Some(CONTAINER_ID));
    let pending_to_quarantine_id = vec![first, quarantine];

    let first = pending();
    let probe = following(&first, JournalPhase::ProbeCreated, 1, Some(CONTAINER_ID));
    let quarantine = following(&probe, JournalPhase::Quarantined, 2, Some(CONTAINER_ID));
    let probe_to_quarantine = vec![first, probe, quarantine];

    let first = pending();
    let cleanup = following(&first, JournalPhase::CleanupVerified, 1, None);
    let quarantine = following(&cleanup, JournalPhase::Quarantined, 2, None);
    let cleanup_to_quarantine_null = vec![first, cleanup, quarantine];

    let first = pending();
    let probe = following(&first, JournalPhase::ProbeCreated, 1, Some(CONTAINER_ID));
    let cleanup = following(&probe, JournalPhase::CleanupVerified, 2, Some(CONTAINER_ID));
    let quarantine = following(&cleanup, JournalPhase::Quarantined, 3, Some(CONTAINER_ID));
    let cleanup_to_quarantine_id = vec![first, probe, cleanup, quarantine];

    for records in [
        pending_to_quarantine_null,
        pending_to_quarantine_id,
        probe_to_quarantine,
        cleanup_to_quarantine_null,
        cleanup_to_quarantine_id,
    ] {
        let frames = encode_records(&records);
        assert!(validate_frames(&frames).is_ok());
    }
}

#[test]
fn every_phase_edge_is_checked_against_independent_allowed_table() {
    let phases = [
        "pending",
        "probe_created",
        "cleanup_verified",
        "bound",
        "quarantined",
    ];
    for from in phases {
        for to in phases {
            let mut records = prefix_for_phase(from);
            let prior = records.last().expect("prefix must contain prior");
            let next = following(
                prior,
                phase_from_name(to),
                prior.revision + 1,
                continuation_container(from, to),
            );
            let frames = if to == "pending" {
                let mut frames = encode_records(&records);
                frames.push(unchecked_frame(&next));
                frames
            } else {
                records.push(next);
                encode_records(&records)
            };
            if to == "pending" {
                assert_chain_error(&frames, "journal.invalid_record");
            } else if allowed_edge(from, to) {
                assert!(validate_frames(&frames).is_ok(), "{from} -> {to}");
            } else {
                assert_chain_error(&frames, "journal.invalid_chain");
            }
        }
    }
}

#[test]
fn strict_frame_parser_rejects_framing_and_noncanonical_encodings() {
    for frame in [b"".as_slice(), b"{}".as_slice()] {
        assert_decode_error(frame, "journal.invalid_frame");
    }
    assert_decode_error(b"{}\n\n", "journal.invalid_record");
    let extra_lf = format!("{PENDING_FRAME}\n");
    assert_decode_error(extra_lf.as_bytes(), "journal.invalid_frame");
    assert_decode_error(b"{\xff}\n", "journal.invalid_record");
    assert_decode_error(&vec![b'x'; MAX_RECORD_BYTES + 1], "journal.limit_exceeded");

    let reordered = PENDING_FRAME.replacen(
        "\"schema_id\":\"lnsat.hcfg_preparation_journal.v1\",\"contract_version\":\"lnsat.contracts.v1_0\"",
        "\"contract_version\":\"lnsat.contracts.v1_0\",\"schema_id\":\"lnsat.hcfg_preparation_journal.v1\"",
        1,
    );
    let whitespace = PENDING_FRAME.replacen("\"owner_uid\":1001", "\"owner_uid\": 1001", 1);
    let escaped_value = PENDING_FRAME.replacen("\"pending\"", "\"\\u0070ending\"", 1);
    for frame in [reordered, whitespace, escaped_value] {
        assert_decode_error(frame.as_bytes(), "journal.invalid_frame");
    }
}

#[test]
fn strict_record_parser_rejects_all_field_classes_and_hostile_json() {
    let invalid_fields = [
        ("lnsat.hcfg_preparation_journal.v1", "wrong.schema"),
        ("lnsat.contracts.v1_0", "lnsat.contracts.v1_1"),
        (
            PREPARATION_ID,
            "ABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABAB",
        ),
        (CANDIDATE_DIGEST, "sha256:XYZ"),
        (STORE_DIGEST, "sha256:XYZ"),
        (RECIPE_DIGEST, "sha256:XYZ"),
        (CHALLENGE_DIGEST, "sha256:XYZ"),
        ("pending", "other_phase"),
        (
            "lnsat-hcfg6-probe-abababababababababababababababababababababababababababababababab",
            "lnsat-hcfg6-probe-wrong",
        ),
    ];
    for (valid, invalid) in invalid_fields {
        let frame = PENDING_FRAME.replacen(valid, invalid, 1);
        assert_decode_error(frame.as_bytes(), "journal.invalid_record");
    }

    for (valid, invalid) in [
        (
            CANDIDATE_DIGEST,
            "SHA256:1111111111111111111111111111111111111111111111111111111111111111",
        ),
        (
            CANDIDATE_DIGEST,
            "sha256:111111111111111111111111111111111111111111111111111111111111111",
        ),
        (
            CANDIDATE_DIGEST,
            "sha512:1111111111111111111111111111111111111111111111111111111111111111",
        ),
        (
            CANDIDATE_DIGEST,
            "sha256:1111111111111111111111111111111111111111111111111111111111111111 ",
        ),
        ("\"owner_uid\":1001", "\"owner_uid\":0"),
        ("\"owner_uid\":1001", "\"owner_uid\":4294967295"),
        ("\"owner_uid\":1001", "\"owner_uid\":4294967296"),
        ("\"owner_uid\":1001", "\"owner_uid\":1.0"),
        ("\"container_id\":null", "\"container_id\":false"),
        (
            "\"previous_digest\":null",
            "\"previous_digest\":\"sha256:XYZ\"",
        ),
        ("\"revision\":0", "\"revision\":64"),
        ("\"revision\":0", "\"revision\":-1"),
        ("\"revision\":0", "\"revision\":0.0"),
        ("\"revision\":0", "\"revision\":0e0"),
    ] {
        let frame = PENDING_FRAME.replacen(valid, invalid, 1);
        assert_decode_error(frame.as_bytes(), "journal.invalid_record");
    }

    for phase in ["{\"pending\":null}", "false", "0", "[]", "null"] {
        let frame = PENDING_FRAME.replacen("\"pending\"", phase, 1);
        assert_decode_error(frame.as_bytes(), "journal.invalid_record");
    }

    let unknown = PENDING_FRAME.replacen("}\n", ",\"unexpected\":\"value\"}\n", 1);
    let missing_nullable = PENDING_FRAME.replacen(",\"container_id\":null", "", 1);
    let missing_previous_nullable = PENDING_FRAME.replacen(",\"previous_digest\":null", "", 1);
    let duplicate = PENDING_FRAME.replacen(
        "\"schema_id\":\"lnsat.hcfg_preparation_journal.v1\",",
        "\"schema_id\":\"lnsat.hcfg_preparation_journal.v1\",\"schema_id\":\"lnsat.hcfg_preparation_journal.v1\",",
        1,
    );
    let escaped_duplicate = PENDING_FRAME.replacen(
        "}\n",
        ",\"\\u0073chema_id\":\"lnsat.hcfg_preparation_journal.v1\"}\n",
        1,
    );
    for frame in [
        unknown,
        missing_nullable,
        missing_previous_nullable,
        duplicate,
        escaped_duplicate,
    ] {
        assert_decode_error(frame.as_bytes(), "journal.invalid_record");
    }

    let deep = format!("{}null{}\n", "[".repeat(128), "]".repeat(128));
    for frame in [deep, "[\"not a record\"]\n".to_owned(), "null\n".to_owned()] {
        assert_decode_error(frame.as_bytes(), "journal.invalid_record");
    }
}

#[test]
fn encode_and_candidate_reject_invalid_values_without_accepting_alternates() {
    let invalid_initial = journal_record(JournalPhase::ProbeCreated, 0, Some(CONTAINER_ID), None);
    assert_error(&encode_record(&invalid_initial), "journal.invalid_record");

    let first = pending();
    let invalid_probe = following(&first, JournalPhase::ProbeCreated, 1, None);
    let invalid_probe_frame = unchecked_frame(&invalid_probe);
    assert_decode_error(&invalid_probe_frame, "journal.invalid_record");
    let frames = vec![
        encode_record(&first).expect("pending fixture must encode"),
        invalid_probe_frame,
    ];
    assert_chain_error(&frames, "journal.invalid_record");

    let mut invalid_container = normal_records();
    invalid_container[1].container_id = nullable(Some(
        "CDCDCDCDCDCDCDCDCDCDCDCDCDCDCDCDCDCDCDCDCDCDCDCDCDCDCDCDCDCDCDCD",
    ));
    assert_error(
        &encode_record(&invalid_container[1]),
        "journal.invalid_record",
    );

    let values = [
        CANDIDATE_DIGEST,
        STORE_DIGEST,
        RECIPE_DIGEST,
        CHALLENGE_DIGEST,
        PROFILE_DIGEST,
        BINDING_DIGEST,
    ];
    for index in 0..values.len() {
        let mut changed = values;
        changed[index] = "sha256:invalid";
        let input = CandidateInput {
            declaration_digest: changed[0],
            composed_digest: changed[1],
            binding_digest: changed[2],
            store_digest: changed[3],
            profile_digest: changed[4],
            recipe_digest: changed[5],
            owner_uid: 1001,
        };
        assert_error(&candidate_digest(&input), "journal.invalid_candidate");
    }
    for owner_uid in [0, u32::MAX] {
        let input = CandidateInput {
            declaration_digest: CANDIDATE_DIGEST,
            composed_digest: STORE_DIGEST,
            binding_digest: RECIPE_DIGEST,
            store_digest: CHALLENGE_DIGEST,
            profile_digest: PROFILE_DIGEST,
            recipe_digest: BINDING_DIGEST,
            owner_uid,
        };
        assert_error(&candidate_digest(&input), "journal.invalid_candidate");
    }
}

#[test]
fn chain_limits_and_continuity_drift_fail_closed() {
    assert_chain_error(&[], "journal.invalid_chain");

    let overflow_count = vec![PENDING_FRAME.as_bytes().to_vec(); MAX_RECORDS + 1];
    assert_chain_error(&overflow_count, "journal.limit_exceeded");

    let oversized = vec![vec![b'x'; MAX_RECORD_BYTES + 1]; MAX_RECORDS];
    assert_chain_error(&oversized, "journal.limit_exceeded");

    let mut gap = normal_records();
    gap[1].revision = 2;
    assert_chain_error(&encode_records(&gap), "journal.invalid_chain");

    let mut duplicate_revision = normal_records();
    duplicate_revision[2].revision = 1;
    assert_chain_error(
        &encode_records(&duplicate_revision),
        "journal.invalid_chain",
    );

    let reordered = {
        let mut records = normal_records();
        records.swap(0, 1);
        records
    };
    assert_chain_error(&encode_records(&reordered), "journal.invalid_chain");

    let mut wrong_prior = normal_records();
    wrong_prior[1].previous_digest = nullable(Some(STORE_DIGEST));
    assert_chain_error(&encode_records(&wrong_prior), "journal.invalid_chain");
}

#[test]
fn chain_rejects_every_immutable_field_and_container_drift() {
    let mut preparation = normal_records();
    preparation[1].preparation_id = OTHER_CONTAINER_ID.to_owned();
    preparation[1].container_name = format!("lnsat-hcfg6-probe-{OTHER_CONTAINER_ID}");
    assert_chain_error(&encode_records(&preparation), "journal.invalid_chain");

    let immutable_digest_fields = ["candidate", "store", "recipe", "challenge"];
    for field in immutable_digest_fields {
        let mut records = normal_records();
        match field {
            "candidate" => records[1].candidate_digest = BINDING_DIGEST.to_owned(),
            "store" => records[1].store_digest = BINDING_DIGEST.to_owned(),
            "recipe" => records[1].recipe_digest = BINDING_DIGEST.to_owned(),
            "challenge" => records[1].challenge_digest = BINDING_DIGEST.to_owned(),
            _ => unreachable!(),
        }
        assert_chain_error(&encode_records(&records), "journal.invalid_chain");
    }

    let mut owner = normal_records();
    owner[1].owner_uid = 1002;
    assert_chain_error(&encode_records(&owner), "journal.invalid_chain");

    let mut name = normal_records();
    name[1].container_name = format!("lnsat-hcfg6-probe-{OTHER_CONTAINER_ID}");
    assert_error(&encode_record(&name[1]), "journal.invalid_record");

    let mut changed_container = normal_records();
    changed_container[2].container_id = nullable(Some(OTHER_CONTAINER_ID));
    assert_chain_error(&encode_records(&changed_container), "journal.invalid_chain");

    let mut removed_container = normal_records();
    removed_container[2].container_id = nullable(None);
    assert_chain_error(&encode_records(&removed_container), "journal.invalid_chain");

    let mut appeared_container = zero_created_records();
    appeared_container[2].container_id = nullable(Some(CONTAINER_ID));
    assert_chain_error(
        &encode_records(&appeared_container),
        "journal.invalid_chain",
    );
}

#[test]
fn fixed_error_codes_are_short_and_data_free() {
    let errors = [
        JournalError::LimitExceeded,
        JournalError::InvalidFrame,
        JournalError::InvalidRecord,
        JournalError::InvalidCandidate,
        JournalError::InvalidChain,
    ];
    let expected = [
        "journal.limit_exceeded",
        "journal.invalid_frame",
        "journal.invalid_record",
        "journal.invalid_candidate",
        "journal.invalid_chain",
    ];
    for (error, code) in errors.into_iter().zip(expected) {
        assert_eq!(error.code(), code);
        assert!(error.code().is_ascii());
        assert!(error.code().len() <= 25);
        assert!(!error.code().contains("sentinel"));
        assert!(!error.code().contains(PREPARATION_ID));
        assert!(!error.code().contains(CANDIDATE_DIGEST));
    }
}
