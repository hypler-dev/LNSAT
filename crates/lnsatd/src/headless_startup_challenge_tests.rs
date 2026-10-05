use super::{
    ActionFrame, ChallengeError, PreparationFrame, action_context_digest, canonical_frame,
    decode_action_challenge, decode_preparation_challenge, digest_text, preparation_context_digest,
};
use zeroize::Zeroizing;

const ACTION: &[u8] = b"{\"context\":{\"attempt_sequence\":1,\"authority_epoch\":1,\"authorization_id\":\"xau_2222222222222222222222222222222222222222222222222222222222222222\",\"candidate_digest\":\"sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\",\"challenge\":\"dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd\",\"channel_id\":\"cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc\",\"container_id\":\"ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff\",\"generation\":1,\"installation_id\":\"550e8400-e29b-41d4-a716-446655440000\",\"operation_id\":\"opn_1111111111111111111111111111111111111111111111111111111111111111\",\"profile_digest\":\"sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb\",\"recipe_digest\":\"sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc\"},\"contract_id\":\"lnsat.adapter_process.docker_local.v2\",\"contract_version\":\"lnsat.contracts.v1_0\",\"message_type\":\"startup_challenge\",\"payload\":{\"limits\":{\"cpu_millis\":1,\"memory_bytes\":16777216,\"pids\":1,\"stderr_bytes\":0,\"stdout_bytes\":1,\"wall_clock_millis\":1000},\"startup_digest\":\"sha256:fc4ed54e6f5120fc10ba25faf79965c03e3299f60d75e643972d33440c3c8829\"},\"schema_version\":2}\n";
const PREPARATION: &[u8] = b"{\"context\":{\"candidate_digest\":\"sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\",\"challenge\":\"9999999999999999999999999999999999999999999999999999999999999999\",\"channel_id\":\"cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc\",\"container_id\":\"ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff\",\"preparation_id\":\"eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee\",\"profile_digest\":\"sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb\",\"recipe_digest\":\"sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc\"},\"contract_id\":\"lnsat.preparation_probe.docker_local.v1\",\"contract_version\":\"lnsat.contracts.v1_0\",\"message_type\":\"probe_challenge\",\"payload\":{\"limits\":{\"cpu_millis\":1,\"memory_bytes\":16777216,\"pids\":1,\"stderr_bytes\":0,\"stdout_bytes\":1,\"wall_clock_millis\":1000},\"startup_digest\":\"sha256:d950eb49e6133371368e74c202d380570442a095849410edb3c58f2b8f11eb1e\"},\"schema_version\":1}\n";

fn action_error(input: &[u8]) -> Option<ChallengeError> {
    decode_action_challenge(input).err()
}

fn preparation_error(input: &[u8]) -> Option<ChallengeError> {
    decode_preparation_challenge(input).err()
}

fn action_frame() -> ActionFrame {
    serde_json::from_slice(&ACTION[..ACTION.len() - 1]).expect("fixed action")
}

fn preparation_frame() -> PreparationFrame {
    serde_json::from_slice(&PREPARATION[..PREPARATION.len() - 1]).expect("fixed preparation")
}

fn canonical_action(frame: &ActionFrame) -> Vec<u8> {
    canonical_frame(frame).expect("fixed canonical").to_vec()
}

fn canonical_preparation(frame: &PreparationFrame) -> Vec<u8> {
    canonical_frame(frame).expect("fixed canonical").to_vec()
}

fn replace_bytes(input: &[u8], needle: &[u8], replacement: &[u8]) -> Vec<u8> {
    let position = input
        .windows(needle.len())
        .position(|window| window == needle)
        .expect("fixed needle");
    [
        &input[..position],
        replacement,
        &input[position + needle.len()..],
    ]
    .concat()
}

#[test]
fn headless_startup_challenge_reproduces_published_action_and_preparation_vectors() {
    assert_eq!(ACTION.len(), 1189);
    assert_eq!(PREPARATION.len(), 984);
    let action = decode_action_challenge(ACTION).expect("published action vector");
    assert_eq!(action.canonical_frame.as_slice(), ACTION);
    assert_eq!(
        digest_text(&action.context_digest).as_str(),
        "sha256:fc4ed54e6f5120fc10ba25faf79965c03e3299f60d75e643972d33440c3c8829"
    );
    let preparation =
        decode_preparation_challenge(PREPARATION).expect("published preparation vector");
    assert_eq!(preparation.canonical_frame.as_slice(), PREPARATION);
    assert_eq!(
        digest_text(&preparation.context_digest).as_str(),
        "sha256:d950eb49e6133371368e74c202d380570442a095849410edb3c58f2b8f11eb1e"
    );
}

#[test]
fn headless_startup_challenge_orders_framing_shape_and_family_denials() {
    assert!(matches!(
        action_error(&vec![b'x'; 65_537]),
        Some(ChallengeError::InputTooLarge)
    ));
    for length in 0..ACTION.len() {
        assert!(matches!(
            action_error(&ACTION[..length]),
            Some(ChallengeError::Framing)
        ));
    }
    for input in [b"[]\n".as_slice(), b"{}\r\n", b"{}\n\n", b"{} true\n"] {
        assert!(matches!(
            action_error(input),
            Some(ChallengeError::Framing | ChallengeError::JsonShape)
        ));
    }
    assert!(matches!(
        preparation_error(ACTION),
        Some(ChallengeError::JsonShape)
    ));
    assert!(matches!(
        action_error(PREPARATION),
        Some(ChallengeError::JsonShape)
    ));
}

#[test]
fn headless_startup_challenge_rebinds_context_and_does_not_bind_limits() {
    let mut changed_action = action_frame();
    changed_action.context.generation = 2;
    let old_action = canonical_action(&changed_action);
    assert!(matches!(
        action_error(&old_action),
        Some(ChallengeError::Binding)
    ));
    let action_digest = action_context_digest(&changed_action.context).expect("action digest");
    changed_action.payload.startup_digest = digest_text(&action_digest);
    assert_eq!(
        decode_action_challenge(&canonical_action(&changed_action))
            .expect("rebound action")
            .context_digest,
        action_digest
    );

    let mut preparation_frame = preparation_frame();
    preparation_frame.context.challenge = Zeroizing::new("a".repeat(64));
    let old_preparation = canonical_preparation(&preparation_frame);
    assert!(matches!(
        preparation_error(&old_preparation),
        Some(ChallengeError::Binding)
    ));
    let preparation_digest =
        preparation_context_digest(&preparation_frame.context).expect("preparation digest");
    preparation_frame.payload.startup_digest = digest_text(&preparation_digest);
    assert_eq!(
        decode_preparation_challenge(&canonical_preparation(&preparation_frame))
            .expect("rebound preparation")
            .context_digest,
        preparation_digest
    );

    let original = decode_action_challenge(ACTION)
        .expect("published action")
        .context_digest;
    let mut limits_only = action_frame();
    limits_only.payload.limits.memory_bytes = 1;
    limits_only.payload.limits.pids = 64;
    limits_only.payload.limits.cpu_millis = 1_000;
    limits_only.payload.limits.wall_clock_millis = 30_000;
    limits_only.payload.limits.stdout_bytes = 1024 * 1024;
    assert_eq!(
        decode_action_challenge(&canonical_action(&limits_only))
            .expect("valid represented limits")
            .context_digest,
        original
    );
}

#[test]
fn headless_startup_challenge_rebinds_every_other_context_field() {
    macro_rules! action_change {
        ($field:ident, $value:expr) => {{
            let mut frame = action_frame();
            frame.context.$field = $value;
            assert!(matches!(
                action_error(&canonical_action(&frame)),
                Some(ChallengeError::Binding)
            ));
            let digest = action_context_digest(&frame.context).expect("action digest");
            frame.payload.startup_digest = digest_text(&digest);
            assert_eq!(
                decode_action_challenge(&canonical_action(&frame))
                    .expect("rebound action")
                    .context_digest,
                digest
            );
        }};
    }
    action_change!(
        installation_id,
        Zeroizing::new("550e8400-e29b-41d4-b716-446655440000".to_owned())
    );
    action_change!(authority_epoch, 2);
    action_change!(
        operation_id,
        Zeroizing::new(format!("opn_{}", "3".repeat(64)))
    );
    action_change!(
        authorization_id,
        Zeroizing::new(format!("xau_{}", "4".repeat(64)))
    );
    action_change!(
        candidate_digest,
        Zeroizing::new(format!("sha256:{}", "1".repeat(64)))
    );
    action_change!(
        profile_digest,
        Zeroizing::new(format!("sha256:{}", "2".repeat(64)))
    );
    action_change!(
        recipe_digest,
        Zeroizing::new(format!("sha256:{}", "3".repeat(64)))
    );
    action_change!(container_id, Zeroizing::new("1".repeat(64)));
    action_change!(channel_id, Zeroizing::new("2".repeat(64)));
    action_change!(challenge, Zeroizing::new("3".repeat(64)));

    macro_rules! preparation_change {
        ($field:ident, $value:expr) => {{
            let mut frame = preparation_frame();
            frame.context.$field = $value;
            assert!(matches!(
                preparation_error(&canonical_preparation(&frame)),
                Some(ChallengeError::Binding)
            ));
            let digest = preparation_context_digest(&frame.context).expect("preparation digest");
            frame.payload.startup_digest = digest_text(&digest);
            assert_eq!(
                decode_preparation_challenge(&canonical_preparation(&frame))
                    .expect("rebound preparation")
                    .context_digest,
                digest
            );
        }};
    }
    preparation_change!(preparation_id, Zeroizing::new("1".repeat(64)));
    preparation_change!(
        candidate_digest,
        Zeroizing::new(format!("sha256:{}", "1".repeat(64)))
    );
    preparation_change!(
        profile_digest,
        Zeroizing::new(format!("sha256:{}", "2".repeat(64)))
    );
    preparation_change!(
        recipe_digest,
        Zeroizing::new(format!("sha256:{}", "3".repeat(64)))
    );
    preparation_change!(container_id, Zeroizing::new("1".repeat(64)));
    preparation_change!(channel_id, Zeroizing::new("2".repeat(64)));
    preparation_change!(challenge, Zeroizing::new("3".repeat(64)));
}

#[test]
fn headless_startup_challenge_rejects_fixed_attempt_invalid_ids_and_limits() {
    let mut fixed_attempt = action_frame();
    fixed_attempt.context.attempt_sequence = 2;
    assert!(matches!(
        action_error(&canonical_action(&fixed_attempt)),
        Some(ChallengeError::Context)
    ));
    {
        let mut frame = action_frame();
        frame.context.generation = 0;
        assert!(matches!(
            action_error(&canonical_action(&frame)),
            Some(ChallengeError::Context)
        ));
    }
    let mut malformed = action_frame();
    malformed.context.installation_id =
        Zeroizing::new("550e8400-e29b-31d4-a716-446655440000".to_owned());
    assert!(matches!(
        action_error(&canonical_action(&malformed)),
        Some(ChallengeError::Context)
    ));
    for (memory_bytes, pids, cpu_millis, wall_clock_millis, stdout_bytes, stderr_bytes) in [
        (0, 1, 1, 1, 1, 0),
        (1, 65, 1, 1, 1, 0),
        (1, 1, 1_001, 1, 1, 0),
        (1, 1, 1, 30_001, 1, 0),
        (1, 1, 1, 1, 1_048_577, 0),
        (1, 1, 1, 1, 1, 1),
    ] {
        let mut frame = preparation_frame();
        frame.payload.limits.memory_bytes = memory_bytes;
        frame.payload.limits.pids = pids;
        frame.payload.limits.cpu_millis = cpu_millis;
        frame.payload.limits.wall_clock_millis = wall_clock_millis;
        frame.payload.limits.stdout_bytes = stdout_bytes;
        frame.payload.limits.stderr_bytes = stderr_bytes;
        assert!(matches!(
            preparation_error(&canonical_preparation(&frame)),
            Some(ChallengeError::Limits)
        ));
    }
}

#[test]
fn headless_startup_challenge_rejects_family_variants_and_identity_grammar() {
    for (contract_id, contract_version, schema_version, message_type) in [
        ("wrong", "lnsat.contracts.v1_0", 2, "startup_challenge"),
        (
            "lnsat.adapter_process.docker_local.v2",
            "wrong",
            2,
            "startup_challenge",
        ),
        (
            "lnsat.adapter_process.docker_local.v2",
            "lnsat.contracts.v1_0",
            1,
            "startup_challenge",
        ),
        (
            "lnsat.adapter_process.docker_local.v2",
            "lnsat.contracts.v1_0",
            2,
            "probe_challenge",
        ),
    ] {
        let mut frame = action_frame();
        frame.contract_id = Zeroizing::new(contract_id.to_owned());
        frame.contract_version = Zeroizing::new(contract_version.to_owned());
        frame.schema_version = schema_version;
        frame.message_type = Zeroizing::new(message_type.to_owned());
        assert!(matches!(
            action_error(&canonical_action(&frame)),
            Some(ChallengeError::Family)
        ));
    }
    for invalid in [
        "550e8400-e29b-31d4-a716-446655440000",
        "550e8400-e29b-41d4-c716-446655440000",
        "550E8400-E29B-41D4-A716-446655440000",
        "550e8400e29b41d4a716446655440000",
    ] {
        let mut frame = action_frame();
        frame.context.installation_id = Zeroizing::new(invalid.to_owned());
        assert!(matches!(
            action_error(&canonical_action(&frame)),
            Some(ChallengeError::Context)
        ));
    }
    for invalid in [
        "opn_short".to_owned(),
        format!("opn_{}", "A".repeat(64)),
        format!("xau_{}", "g".repeat(64)),
        format!("sha256:{}", "A".repeat(64)),
        format!("sha256:{}", "a".repeat(63)),
        "é".repeat(64),
    ] {
        let mut frame = action_frame();
        frame.context.operation_id = Zeroizing::new(invalid.clone());
        assert!(matches!(
            action_error(&canonical_action(&frame)),
            Some(ChallengeError::Context)
        ));
        let mut digest_frame = action_frame();
        digest_frame.context.candidate_digest = Zeroizing::new(invalid);
        assert!(matches!(
            action_error(&canonical_action(&digest_frame)),
            Some(ChallengeError::Context)
        ));
    }
}

#[test]
fn headless_startup_challenge_rejects_numeric_lexemes_and_width_overflow() {
    for replacement in ["-0", "+1", "1.0", "1e0", "4294967296"] {
        let input = replace_bytes(
            ACTION,
            b"\"attempt_sequence\":1",
            format!("\"attempt_sequence\":{replacement}").as_bytes(),
        );
        assert!(matches!(
            action_error(&input),
            Some(ChallengeError::JsonShape)
        ));
    }
    for (needle, replacement) in [
        (
            b"\"memory_bytes\":16777216".as_slice(),
            b"\"memory_bytes\":18446744073709551616".as_slice(),
        ),
        (b"\"pids\":1".as_slice(), b"\"pids\":4294967296".as_slice()),
        (
            b"\"cpu_millis\":1".as_slice(),
            b"\"cpu_millis\":4294967296".as_slice(),
        ),
        (
            b"\"wall_clock_millis\":1000".as_slice(),
            b"\"wall_clock_millis\":4294967296".as_slice(),
        ),
    ] {
        let input = replace_bytes(PREPARATION, needle, replacement);
        assert!(matches!(
            preparation_error(&input),
            Some(ChallengeError::JsonShape)
        ));
    }
}

fn matrix_decode(bytes: &[u8], preparation: bool) -> Result<(), ChallengeError> {
    if preparation {
        decode_preparation_challenge(bytes).map(|_| ())
    } else {
        decode_action_challenge(bytes).map(|_| ())
    }
}

fn matrix_value(bytes: &[u8]) -> serde_json::Value {
    serde_json::from_slice(bytes).expect("synthetic fixture JSON")
}

fn matrix_encode(value: &serde_json::Value) -> Vec<u8> {
    let mut bytes = serde_json::to_vec(value).expect("synthetic canonical JSON");
    bytes.push(b'\n');
    bytes
}

fn matrix_expect(bytes: &[u8], preparation: bool, expected: ChallengeError) {
    match matrix_decode(bytes, preparation) {
        Err(actual) => assert_eq!(actual.code(), expected.code()),
        Ok(()) => panic!("denial fixture unexpectedly accepted"),
    }
}

fn matrix_insert_member(
    original: &[u8],
    pointer: &str,
    encoded_key: &str,
    value: &serde_json::Value,
) -> Vec<u8> {
    let root = matrix_value(original);
    let object = root.pointer(pointer).expect("fixture object");
    let object_text = serde_json::to_string(object).expect("fixture object JSON");
    let value_text = serde_json::to_string(value).expect("fixture value JSON");
    let replacement = format!("{{{encoded_key}:{value_text},{}", &object_text[1..]);
    String::from_utf8(original.to_vec())
        .expect("fixture UTF-8")
        .replacen(&object_text, &replacement, 1)
        .into_bytes()
}

#[test]
fn headless_startup_challenge_matrix_all_nested_closed_shapes() {
    for (original, preparation) in [(ACTION, false), (PREPARATION, true)] {
        let baseline = matrix_value(original);
        for pointer in ["", "/context", "/payload", "/payload/limits"] {
            let object = baseline
                .pointer(pointer)
                .expect("fixture object")
                .as_object()
                .expect("object");
            for (key, value) in object {
                let mut missing = baseline.clone();
                missing
                    .pointer_mut(pointer)
                    .expect("object")
                    .as_object_mut()
                    .expect("map")
                    .remove(key);
                matrix_expect(
                    &matrix_encode(&missing),
                    preparation,
                    ChallengeError::JsonShape,
                );
                for replacement in [
                    serde_json::Value::Null,
                    serde_json::json!(true),
                    serde_json::json!([]),
                ] {
                    let mut changed = baseline.clone();
                    changed
                        .pointer_mut(pointer)
                        .expect("object")
                        .as_object_mut()
                        .expect("map")
                        .insert(key.clone(), replacement);
                    matrix_expect(
                        &matrix_encode(&changed),
                        preparation,
                        ChallengeError::JsonShape,
                    );
                }
                let plain_key = serde_json::to_string(key).expect("key JSON");
                matrix_expect(
                    &matrix_insert_member(original, pointer, &plain_key, value),
                    preparation,
                    ChallengeError::JsonShape,
                );
                let escaped_key = format!("\"\\u{:04x}{}\"", key.as_bytes()[0], &key[1..]);
                matrix_expect(
                    &matrix_insert_member(original, pointer, &escaped_key, value),
                    preparation,
                    ChallengeError::JsonShape,
                );
            }
            let mut unknown = baseline.clone();
            unknown
                .pointer_mut(pointer)
                .expect("object")
                .as_object_mut()
                .expect("map")
                .insert(
                    "private_marker_for_denial_only".into(),
                    serde_json::json!("do-not-reflect"),
                );
            matrix_expect(
                &matrix_encode(&unknown),
                preparation,
                ChallengeError::JsonShape,
            );
            for replacement in [
                serde_json::Value::Null,
                serde_json::json!(false),
                serde_json::json!("object-as-string"),
                serde_json::Value::Array(object.values().cloned().collect()),
            ] {
                let mut changed = baseline.clone();
                *changed.pointer_mut(pointer).expect("object") = replacement;
                matrix_expect(
                    &matrix_encode(&changed),
                    preparation,
                    ChallengeError::JsonShape,
                );
            }
        }
    }
}

#[test]
fn headless_startup_challenge_matrix_every_truncation_control_and_size_boundary() {
    for (original, preparation) in [(ACTION, false), (PREPARATION, true)] {
        for length in 0..original.len() {
            matrix_expect(&original[..length], preparation, ChallengeError::Framing);
        }
        // Retaining a terminal LF also exercises every incomplete JSON prefix.
        for length in 0..original.len() - 1 {
            let mut truncated = original[..length].to_vec();
            truncated.push(b'\n');
            matrix_expect(&truncated, preparation, ChallengeError::JsonShape);
        }
        for byte in (0_u8..=31).chain(std::iter::once(127)) {
            let mut injected = original.to_vec();
            let position = injected
                .windows(b"candidate_digest".len())
                .position(|window| window == b"candidate_digest")
                .expect("key position");
            injected[position] = byte;
            assert!(matrix_decode(&injected, preparation).is_err());
        }
        for bytes in [
            b"{}\r\n".as_slice(),
            b"{}\n\n",
            b"{}\n{}\n",
            b"{}\n ",
            b"{}",
        ] {
            matrix_expect(bytes, preparation, ChallengeError::Framing);
        }
        let mut invalid_utf8 = original.to_vec();
        invalid_utf8[3] = 0xff;
        matrix_expect(&invalid_utf8, preparation, ChallengeError::JsonShape);
        let mut trailing = original[..original.len() - 1].to_vec();
        trailing.extend_from_slice(b"{}\n");
        matrix_expect(&trailing, preparation, ChallengeError::JsonShape);
        let mut cap = vec![b' '; 65_536 - original.len()];
        cap.extend_from_slice(original);
        assert_eq!(cap.len(), 65_536);
        matrix_expect(&cap, preparation, ChallengeError::Canonical);
        cap.insert(0, b' ');
        matrix_expect(&cap, preparation, ChallengeError::InputTooLarge);
        // Size precedence holds even if framing and JSON are invalid too.
        matrix_expect(
            &vec![0xff; 65_537],
            preparation,
            ChallengeError::InputTooLarge,
        );
    }
}

#[test]
fn headless_startup_challenge_matrix_canonical_key_escape_and_whitespace_denials() {
    for (original, preparation) in [(ACTION, false), (PREPARATION, true)] {
        let baseline = matrix_value(original);
        for pointer in ["", "/context", "/payload", "/payload/limits"] {
            let object = baseline.pointer(pointer).expect("fixture object");
            let map = object.as_object().expect("map");
            let mut fields = map
                .iter()
                .map(|(key, value)| {
                    format!(
                        "{}:{}",
                        serde_json::to_string(key).expect("key"),
                        serde_json::to_string(value).expect("value")
                    )
                })
                .collect::<Vec<_>>();
            fields.reverse();
            let reordered = format!("{{{}}}", fields.join(","));
            let canonical = serde_json::to_string(object).expect("object JSON");
            let bytes = String::from_utf8(original.to_vec())
                .expect("UTF-8")
                .replacen(&canonical, &reordered, 1)
                .into_bytes();
            matrix_expect(&bytes, preparation, ChallengeError::Canonical);
        }
        let original_text = String::from_utf8(original.to_vec()).expect("UTF-8");
        for changed in [
            format!(" {original_text}"),
            original_text.replacen(':', ": ", 1),
            original_text.replacen("\"context\"", "\"\\u0063ontext\"", 1),
            original_text.replacen("\"sha256:", "\"\\u0073ha256:", 1),
            original_text.replacen("\"stderr_bytes\":0", "\"stderr_bytes\":-0", 1),
        ] {
            assert!(matrix_decode(changed.as_bytes(), preparation).is_err());
        }
        let mut bom = vec![0xef, 0xbb, 0xbf];
        bom.extend_from_slice(original);
        matrix_expect(&bom, preparation, ChallengeError::JsonShape);
    }
}

#[test]
fn headless_startup_challenge_matrix_precedence_and_errors_are_input_free() {
    for (original, preparation) in [(ACTION, false), (PREPARATION, true)] {
        let mut value = matrix_value(original);
        value["message_type"] = serde_json::json!("private-marker-do-not-reflect");
        value["context"]["candidate_digest"] = serde_json::json!("private-marker-do-not-reflect");
        value["payload"]["limits"]["pids"] = serde_json::json!(0);
        value["payload"]["startup_digest"] = serde_json::json!("private-marker-do-not-reflect");
        matrix_expect(&matrix_encode(&value), preparation, ChallengeError::Family);
        value["message_type"] = matrix_value(original)["message_type"].clone();
        matrix_expect(&matrix_encode(&value), preparation, ChallengeError::Context);
        value["context"]["candidate_digest"] =
            matrix_value(original)["context"]["candidate_digest"].clone();
        matrix_expect(&matrix_encode(&value), preparation, ChallengeError::Context);
        value["payload"]["startup_digest"] =
            serde_json::json!(format!("sha256:{}", "0".repeat(64)));
        matrix_expect(&matrix_encode(&value), preparation, ChallengeError::Limits);
        value["payload"]["limits"]["pids"] = serde_json::json!(1);
        matrix_expect(&matrix_encode(&value), preparation, ChallengeError::Binding);
        let mut unknown = matrix_value(original);
        unknown["private-marker-do-not-reflect"] =
            serde_json::json!("private-marker-do-not-reflect");
        let code = matrix_decode(&matrix_encode(&unknown), preparation)
            .expect_err("denial")
            .code();
        assert_eq!(code, "headless_challenge.json_shape");
    }
    let codes = [
        ChallengeError::InputTooLarge,
        ChallengeError::Framing,
        ChallengeError::JsonShape,
        ChallengeError::Family,
        ChallengeError::Context,
        ChallengeError::Limits,
        ChallengeError::Binding,
        ChallengeError::Canonical,
    ]
    .map(ChallengeError::code);
    assert_eq!(
        codes,
        [
            "headless_challenge.input_too_large",
            "headless_challenge.framing",
            "headless_challenge.json_shape",
            "headless_challenge.family",
            "headless_challenge.context",
            "headless_challenge.limits",
            "headless_challenge.binding",
            "headless_challenge.canonical",
        ]
    );
}

fn matrix_rebind(value: &mut serde_json::Value, preparation: bool) {
    let digest = if preparation {
        let frame: PreparationFrame = serde_json::from_value(value.clone()).expect("typed fixture");
        preparation_context_digest(&frame.context).expect("context commitment")
    } else {
        let frame: ActionFrame = serde_json::from_value(value.clone()).expect("typed fixture");
        action_context_digest(&frame.context).expect("context commitment")
    };
    value["payload"]["startup_digest"] = serde_json::json!(digest_text(&digest).as_str());
}

#[test]
fn headless_startup_challenge_all_limit_endpoints_and_retained_values() {
    for (original, preparation) in [(ACTION, false), (PREPARATION, true)] {
        for (key, maximum) in [
            ("memory_bytes", 536_870_912_u64),
            ("pids", 64),
            ("cpu_millis", 1_000),
            ("wall_clock_millis", 30_000),
            ("stdout_bytes", 1_048_576),
        ] {
            for boundary in [1, maximum] {
                let mut value = matrix_value(original);
                value["payload"]["limits"][key] = serde_json::json!(boundary);
                let bytes = matrix_encode(&value);
                assert!(matrix_decode(&bytes, preparation).is_ok());
                if preparation {
                    let decoded = decode_preparation_challenge(&bytes).expect("syntax only");
                    assert_eq!(
                        serde_json::to_value(&decoded.limits).expect("limits"),
                        value["payload"]["limits"]
                    );
                    assert_eq!(
                        digest_text(&decoded.context_digest).as_str(),
                        value["payload"]["startup_digest"]
                    );
                } else {
                    let decoded = decode_action_challenge(&bytes).expect("syntax only");
                    assert_eq!(
                        serde_json::to_value(&decoded.limits).expect("limits"),
                        value["payload"]["limits"]
                    );
                    assert_eq!(
                        digest_text(&decoded.context_digest).as_str(),
                        value["payload"]["startup_digest"]
                    );
                }
            }
            for invalid in [0, maximum + 1] {
                let mut value = matrix_value(original);
                value["payload"]["limits"][key] = serde_json::json!(invalid);
                matrix_expect(&matrix_encode(&value), preparation, ChallengeError::Limits);
            }
        }
        let mut invalid = matrix_value(original);
        invalid["payload"]["limits"]["stderr_bytes"] = serde_json::json!(1);
        matrix_expect(
            &matrix_encode(&invalid),
            preparation,
            ChallengeError::Limits,
        );
    }
    let mut preparation = matrix_value(PREPARATION);
    preparation["payload"]["limits"] = serde_json::json!({
        "memory_bytes":67_108_864,"pids":16,"cpu_millis":250,
        "wall_clock_millis":10_000,"stdout_bytes":65_536,"stderr_bytes":0
    });
    let decoded = decode_preparation_challenge(&matrix_encode(&preparation))
        .expect("fixed recipe syntax only");
    assert_eq!(decoded.limits.memory_bytes, 67_108_864);
    assert_eq!(decoded.limits.pids, 16);
    assert_eq!(decoded.limits.cpu_millis, 250);
    assert_eq!(decoded.limits.wall_clock_millis, 10_000);
    assert_eq!(decoded.limits.stdout_bytes, 65_536);
    assert_eq!(decoded.limits.stderr_bytes, 0);
}

#[test]
fn headless_startup_challenge_all_integer_fields_deny_lexical_and_width_drift() {
    for (original, preparation) in [(ACTION, false), (PREPARATION, true)] {
        let baseline = matrix_value(original);
        for pointer in ["", "/context", "/payload/limits"] {
            let map = baseline
                .pointer(pointer)
                .expect("fixture object")
                .as_object()
                .expect("map");
            for (key, value) in map.iter().filter(|(_, value)| value.is_number()) {
                let width32 = matches!(
                    key.as_str(),
                    "schema_version"
                        | "attempt_sequence"
                        | "pids"
                        | "cpu_millis"
                        | "wall_clock_millis"
                );
                let overflow = if width32 {
                    "4294967296"
                } else {
                    "18446744073709551616"
                };
                let needle = format!("\"{key}\":{value}");
                for lexical in ["-0", "-1", "+1", "01", "1.0", "1e0", overflow] {
                    let replacement = format!("\"{key}\":{lexical}");
                    let changed =
                        replace_bytes(original, needle.as_bytes(), replacement.as_bytes());
                    assert!(matrix_decode(&changed, preparation).is_err());
                }
            }
        }
    }
    for key in ["generation", "authority_epoch"] {
        let mut value = matrix_value(ACTION);
        value["context"][key] = serde_json::json!(0);
        matrix_expect(&matrix_encode(&value), false, ChallengeError::Context);
        value["context"][key] = serde_json::json!(u64::MAX);
        matrix_rebind(&mut value, false);
        assert!(matrix_decode(&matrix_encode(&value), false).is_ok());
    }
    for invalid in [0, 2, u32::MAX] {
        let mut value = matrix_value(ACTION);
        value["context"]["attempt_sequence"] = serde_json::json!(invalid);
        matrix_expect(&matrix_encode(&value), false, ChallengeError::Context);
    }
}

#[test]
fn headless_startup_challenge_all_identity_fields_reject_bad_syntax() {
    for (original, preparation) in [(ACTION, false), (PREPARATION, true)] {
        let baseline = matrix_value(original);
        for (key, value) in baseline["context"].as_object().expect("context") {
            let Some(valid) = value.as_str() else {
                continue;
            };
            let prefix = if key.ends_with("_digest") {
                "sha256:"
            } else if key == "operation_id" {
                "opn_"
            } else if key == "authorization_id" {
                "xau_"
            } else {
                ""
            };
            for invalid in [
                String::new(),
                valid[..valid.len() - 1].to_owned(),
                format!("{valid}0"),
                format!("{prefix}A{}", "a".repeat(63)),
                format!("{prefix}g{}", "a".repeat(63)),
                format!("{prefix}é{}", "a".repeat(63)),
                format!(" {valid}"),
                format!("{valid} "),
            ] {
                let mut changed = baseline.clone();
                changed["context"][key] = serde_json::json!(invalid);
                matrix_expect(
                    &matrix_encode(&changed),
                    preparation,
                    ChallengeError::Context,
                );
            }
        }
        for invalid in [
            format!("SHA256:{}", "a".repeat(64)),
            format!("sha256:{}", "A".repeat(64)),
            format!("sha256:{}", "g".repeat(64)),
            format!("sha256:{}", "a".repeat(63)),
            format!("sha256:{}", "a".repeat(65)),
            "é".repeat(71),
        ] {
            let mut changed = baseline.clone();
            changed["payload"]["startup_digest"] = serde_json::json!(invalid);
            matrix_expect(
                &matrix_encode(&changed),
                preparation,
                ChallengeError::Context,
            );
        }
    }
    for variant in ['8', '9', 'a', 'b'] {
        let mut value = matrix_value(ACTION);
        value["context"]["installation_id"] =
            serde_json::json!(format!("550e8400-e29b-41d4-{variant}716-446655440000"));
        matrix_rebind(&mut value, false);
        assert!(matrix_decode(&matrix_encode(&value), false).is_ok());
    }
    for position in [8, 13, 18, 23] {
        let mut value = matrix_value(ACTION);
        let mut bytes = b"550e8400-e29b-41d4-a716-446655440000".to_vec();
        bytes[position] = b'0';
        value["context"]["installation_id"] =
            serde_json::json!(String::from_utf8(bytes).expect("ASCII"));
        matrix_expect(&matrix_encode(&value), false, ChallengeError::Context);
    }
}

#[test]
fn headless_startup_challenge_both_entrypoints_close_all_other_families() {
    for (original, preparation) in [(ACTION, false), (PREPARATION, true)] {
        let baseline = matrix_value(original);
        for message in [
            "startup_challenge",
            "probe_challenge",
            "startup_observation",
            "probe_observation",
            "action_release",
            "action_result",
            "unknown",
        ] {
            if baseline["message_type"] == message {
                continue;
            }
            let mut value = baseline.clone();
            value["message_type"] = serde_json::json!(message);
            matrix_expect(&matrix_encode(&value), preparation, ChallengeError::Family);
        }
        for field in ["contract_id", "contract_version"] {
            for invalid in [
                "",
                "lnsat.contracts.v1_1",
                "lnsat.adapter_process.docker_local.v1",
                "lnsat.preparation_probe.docker_local.v2",
            ] {
                let mut value = baseline.clone();
                value[field] = serde_json::json!(invalid);
                matrix_expect(&matrix_encode(&value), preparation, ChallengeError::Family);
            }
        }
        for schema in [0, 1, 2, 3, u32::MAX] {
            if baseline["schema_version"] == schema {
                continue;
            }
            let mut value = baseline.clone();
            value["schema_version"] = serde_json::json!(schema);
            matrix_expect(&matrix_encode(&value), preparation, ChallengeError::Family);
        }
    }
    for key in [
        "installation_id",
        "generation",
        "authority_epoch",
        "operation_id",
        "authorization_id",
        "attempt_sequence",
        "request",
        "release_id",
    ] {
        let mut value = matrix_value(PREPARATION);
        value["context"][key] = serde_json::json!("never-allowed");
        matrix_expect(&matrix_encode(&value), true, ChallengeError::JsonShape);
    }
}
