use super::{
    ResponsePreflight, ScanError, UnverifiedZeroExit, decode_create_claim, decode_wait_claim,
};

// Synthetic contract vectors only. They are not Docker observations, endpoint
// authentication, framing evidence, native evidence, or recipe proof.
const TOO_LARGE: &str = "headless_container_response.input_too_large";
const SYNTAX: &str = "headless_container_response.json_syntax";
const LIMITS: &str = "headless_container_response.json_limits";
const SHAPE: &str = "headless_container_response.json_shape";
const RECIPE: &str = "headless_container_response.recipe";
const MAX_BODY: usize = 1_048_576;

fn id(byte: char) -> String {
    byte.to_string().repeat(64)
}

fn create_body(container_id: &str) -> String {
    format!(r#"{{"Id":"{container_id}","Warnings":[]}}"#)
}

fn wait_body(status_code: &str) -> String {
    format!(r#"{{"StatusCode":{status_code}}}"#)
}

fn accept_create(input: &[u8]) -> String {
    let claim = decode_create_claim(input)
        .unwrap_or_else(|error| panic!("synthetic Create positive denied: {}", error.as_str()));
    claim.id.as_str().to_owned()
}

fn accept_wait(input: &[u8]) -> UnverifiedZeroExit {
    decode_wait_claim(input)
        .unwrap_or_else(|error| panic!("synthetic Wait positive denied: {}", error.as_str()))
}

fn deny_create(input: &[u8], expected: &str) {
    let Err(error) = decode_create_claim(input) else {
        panic!("synthetic Create negative accepted");
    };
    assert_eq!(error.as_str(), expected);
    assert!(!format!("{error:?}").contains("PRIVATE_CANARY"));
}

fn deny_wait(input: &[u8], expected: &str) {
    let Err(error) = decode_wait_claim(input) else {
        panic!("synthetic Wait negative accepted");
    };
    assert_eq!(error.as_str(), expected);
    assert!(!format!("{error:?}").contains("PRIVATE_CANARY"));
}

fn scan(input: &str) -> Result<bool, ScanError> {
    ResponsePreflight::new(input.as_bytes()).scan_document()
}

fn nested_objects(levels: usize) -> String {
    let mut body = "null".to_owned();
    for _ in 0..levels {
        body = format!(r#"{{"unknown":{body}}}"#);
    }
    body
}

fn object_members(count: usize) -> String {
    let entries = (0..count)
        .map(|index| format!(r#""k{index}":null"#))
        .collect::<Vec<_>>();
    format!("{{{}}}", entries.join(","))
}

fn array_elements(count: usize) -> String {
    format!(
        "[{}]",
        std::iter::repeat_n("null", count)
            .collect::<Vec<_>>()
            .join(",")
    )
}

fn total_members(extra: bool) -> String {
    let mut roots = Vec::new();
    for outer in 0..64 {
        let inner_count = if extra && outer == 0 { 64 } else { 63 };
        roots.push(format!(r#""root{outer}":{}"#, object_members(inner_count)));
    }
    format!("{{{}}}", roots.join(","))
}

#[test]
fn source_shaped_create_and_wait_positives_retain_only_create_id() {
    let zero = id('0');
    let all_f = id('f');

    assert_eq!(accept_create(create_body(&zero).as_bytes()), zero);
    assert_eq!(
        accept_create(format!("\n {{\"Warnings\":[],\"Id\":\"{all_f}\"}} \t\r\n").as_bytes()),
        all_f
    );
    assert_eq!(
        accept_create(format!(r#"{{"\u0049d":"{}","\u0057arnings":[]}}"#, id('a')).as_bytes()),
        id('a')
    );
    assert_eq!(
        accept_create(
            format!(r#"{{"Id":"{}","Warnings":[]}}"#, "\u{5c}u0061".repeat(64)).as_bytes()
        ),
        id('a')
    );

    let _: UnverifiedZeroExit = accept_wait(b" \n {\t\"StatusCode\" : 0 }\r\n");
}

#[test]
fn cross_family_roots_and_non_object_roots_are_shape_denials() {
    deny_create(wait_body("0").as_bytes(), SHAPE);
    deny_wait(create_body(&id('a')).as_bytes(), SHAPE);

    for root in [
        "null", "true", "false", "0", "-1", "\"text\"", "[]", "[null]",
    ] {
        deny_create(root.as_bytes(), SHAPE);
        deny_wait(root.as_bytes(), SHAPE);
    }
}

#[test]
fn create_required_fields_types_keys_and_warnings_are_closed() {
    let valid = id('a');
    for body in [
        r#"{"Warnings":[]}"#.to_owned(),
        format!(r#"{{"Id":"{valid}"}}"#),
        r#"{"Id":null,"Warnings":[]}"#.to_owned(),
        r#"{"Id":0,"Warnings":[]}"#.to_owned(),
        r#"{"Id":false,"Warnings":[]}"#.to_owned(),
        r#"{"Id":[],"Warnings":[]}"#.to_owned(),
        r#"{"Id":{},"Warnings":[]}"#.to_owned(),
        format!(r#"{{"Id":"{valid}","Warnings":null}}"#),
        format!(r#"{{"Id":"{valid}","Warnings":false}}"#),
        format!(r#"{{"Id":"{valid}","Warnings":0}}"#),
        format!(r#"{{"Id":"{valid}","Warnings":""}}"#),
        format!(r#"{{"Id":"{valid}","Warnings":{{}}}}"#),
        format!(r#"{{"id":"{valid}","Warnings":[]}}"#),
        format!(r#"{{"Id":"{valid}","warnings":[]}}"#),
        format!(r#"{{"Id":"{valid}","Warnings":[],"Unknown":"PRIVATE_CANARY"}}"#),
        format!(r#"{{"Id":"{valid}","Warnings":[null]}}"#),
        format!(r#"{{"Id":"{valid}","Warnings":[0]}}"#),
        format!(r#"{{"Id":"{valid}","Warnings":[false]}}"#),
        format!(r#"{{"Id":"{valid}","Warnings":[[]]}}"#),
        format!(r#"{{"Id":"{valid}","Warnings":[{{}}]}}"#),
    ] {
        deny_create(body.as_bytes(), SHAPE);
    }
    for body in [
        format!(r#"{{"Id":"{valid}","Id":"{valid}","Warnings":[]}}"#),
        format!(r#"{{"Id":"{valid}","\u0049d":"{valid}","Warnings":[]}}"#),
        format!(r#"{{"Id":"{valid}","Warnings":[],"Warnings":[]}}"#),
        format!(r#"{{"Id":"{valid}","\u0057arnings":[],"Warnings":[]}}"#),
    ] {
        deny_create(body.as_bytes(), SHAPE);
    }
    for warning in ["\"\"", "\"PRIVATE_CANARY\""] {
        deny_create(
            format!(r#"{{"Id":"{valid}","Warnings":[{warning}]}}"#).as_bytes(),
            RECIPE,
        );
    }
}

#[test]
fn create_id_predicates_are_recipe_denials_after_shape() {
    for bad in [
        String::new(),
        "a".repeat(63),
        "a".repeat(65),
        id('A'),
        format!("sha256:{}", id('a')),
        format!("{}g", "a".repeat(63)),
        "é".repeat(32),
        "😀".repeat(16),
    ] {
        deny_create(create_body(&bad).as_bytes(), RECIPE);
    }
}

#[test]
fn wait_required_optional_fields_types_keys_and_duplicates_are_closed() {
    for body in [
        "{}".to_owned(),
        r#"{"StatusCode":null}"#.to_owned(),
        r#"{"StatusCode":""}"#.to_owned(),
        r#"{"StatusCode":"0"}"#.to_owned(),
        r#"{"StatusCode":true}"#.to_owned(),
        r#"{"StatusCode":[]}"#.to_owned(),
        r#"{"StatusCode":{}}"#.to_owned(),
        r#"{"statusCode":0}"#.to_owned(),
        r#"{"StatusCode":0,"Unknown":"PRIVATE_CANARY"}"#.to_owned(),
        r#"{"StatusCode":0,"StatusCode":0}"#.to_owned(),
        r#"{"StatusCode":0,"\u0053tatusCode":0}"#.to_owned(),
        r#"{"StatusCode":0,"Error":null}"#.to_owned(),
        r#"{"StatusCode":0,"Error":false}"#.to_owned(),
        r#"{"StatusCode":0,"Error":0}"#.to_owned(),
        r#"{"StatusCode":0,"Error":""}"#.to_owned(),
        r#"{"StatusCode":0,"Error":[]}"#.to_owned(),
        r#"{"StatusCode":0,"error":{}}"#.to_owned(),
        r#"{"StatusCode":0,"Error":{"Unknown":"PRIVATE_CANARY"}}"#.to_owned(),
        r#"{"StatusCode":0,"Error":{"message":"x"}}"#.to_owned(),
        r#"{"StatusCode":0,"Error":{"Message":null}}"#.to_owned(),
        r#"{"StatusCode":0,"Error":{"Message":false}}"#.to_owned(),
        r#"{"StatusCode":0,"Error":{"Message":0}}"#.to_owned(),
        r#"{"StatusCode":0,"Error":{"Message":[]}}"#.to_owned(),
        r#"{"StatusCode":0,"Error":{"Message":{}}}"#.to_owned(),
        r#"{"StatusCode":0,"Error":{"Message":"x","Message":"y"}}"#.to_owned(),
        r#"{"StatusCode":0,"Error":{"\u004dessage":"x","Message":"y"}}"#.to_owned(),
    ] {
        deny_wait(body.as_bytes(), SHAPE);
    }
    for body in [
        r#"{"StatusCode":0,"Error":{}}"#,
        r#"{"StatusCode":0,"Error":{"Message":""}}"#,
        r#"{"StatusCode":0,"Error":{"Message":"PRIVATE_CANARY"}}"#,
    ] {
        deny_wait(body.as_bytes(), RECIPE);
    }
}

#[test]
fn wait_status_code_is_plain_i64_decimal_then_recipe_checked() {
    for number in ["1", "-1", "9223372036854775807", "-9223372036854775808"] {
        deny_wait(wait_body(number).as_bytes(), RECIPE);
    }
    for number in [
        "9223372036854775808",
        "-9223372036854775809",
        "-0",
        "0.0",
        "1e0",
        "1E+0",
    ] {
        deny_wait(wait_body(number).as_bytes(), SHAPE);
    }
}

#[test]
fn scanner_accepts_declared_inclusive_bounds_before_closed_shape() {
    for (body, non_decimal) in [
        (nested_objects(32), false),
        (object_members(64), false),
        (total_members(false), false),
        (array_elements(128), false),
        (r#"{"StatusCode":0}"#.to_owned(), false),
        (r#"{"StatusCode":-0}"#.to_owned(), true),
        (r#"{"StatusCode":1.0}"#.to_owned(), true),
        (r#"{"StatusCode":1e0}"#.to_owned(), true),
    ] {
        assert!(matches!(scan(&body), Ok(actual) if actual == non_decimal));
    }

    deny_create(nested_objects(32).as_bytes(), SHAPE);
    deny_create(object_members(64).as_bytes(), SHAPE);
    deny_create(total_members(false).as_bytes(), SHAPE);
    deny_create(array_elements(128).as_bytes(), SHAPE);
}

#[test]
fn scanner_rejects_each_bound_plus_one_before_typed_shape() {
    for body in [
        nested_objects(33),
        object_members(65),
        total_members(true),
        array_elements(129),
    ] {
        assert!(matches!(scan(&body), Err(ScanError::Limits)));
        deny_create(body.as_bytes(), LIMITS);
        deny_wait(body.as_bytes(), LIMITS);
    }
}

#[test]
fn byte_string_and_key_bounds_count_decoded_utf8_and_escapes() {
    for (at_limit, over_limit) in [
        ("x".repeat(4096), "x".repeat(4097)),
        ("é".repeat(2048), format!("{}x", "é".repeat(2048))),
        ("😀".repeat(1024), format!("{}x", "😀".repeat(1024))),
    ] {
        let body = format!(r#"{{"Unknown":"{at_limit}"}}"#);
        assert!(matches!(scan(&body), Ok(false)));
        deny_create(body.as_bytes(), SHAPE);
        let body = format!(r#"{{"Unknown":"{over_limit}"}}"#);
        assert!(matches!(scan(&body), Err(ScanError::Limits)));
        deny_create(body.as_bytes(), LIMITS);
    }
    for escaped in [
        "\u{5c}u00e9".repeat(2048),
        "\u{5c}ud83d\u{5c}ude00".repeat(1024),
    ] {
        let body = format!(r#"{{"Unknown":"{escaped}"}}"#);
        assert!(matches!(scan(&body), Ok(false)));
        deny_create(body.as_bytes(), SHAPE);
        let body = format!(r#"{{"Unknown":"{escaped}x"}}"#);
        assert!(matches!(scan(&body), Err(ScanError::Limits)));
    }
    for key in ["x".repeat(256), "é".repeat(128), "😀".repeat(64)] {
        let body = format!(r#"{{"{key}":null}}"#);
        assert!(matches!(scan(&body), Ok(false)));
        deny_wait(body.as_bytes(), SHAPE);
        let body = format!(r#"{{"{key}x":null}}"#);
        assert!(matches!(scan(&body), Err(ScanError::Limits)));
        deny_wait(body.as_bytes(), LIMITS);
    }
    for escaped in ["\\u00e9".repeat(128), "\\ud83d\\ude00".repeat(64)] {
        let body = format!(r#"{{"{escaped}":null}}"#);
        assert!(matches!(scan(&body), Ok(false)));
        let body = format!(r#"{{"{escaped}x":null}}"#);
        assert!(matches!(scan(&body), Err(ScanError::Limits)));
    }
    assert!(matches!(scan(r#"{"":null}"#), Err(ScanError::Limits)));
}

#[test]
fn body_cap_is_inclusive_positive_and_precedes_utf8_or_syntax() {
    let mut positive = create_body(&id('a')).into_bytes();
    positive.resize(MAX_BODY, b' ');
    assert_eq!(accept_create(&positive), id('a'));

    positive.push(b' ');
    deny_create(&positive, TOO_LARGE);
    positive[0] = 0xff;
    deny_create(&positive, TOO_LARGE);
}

#[test]
fn syntax_unicode_truncation_and_trailing_data_precede_shape() {
    let positive = create_body(&id('a'));
    for length in 0..positive.len() {
        deny_create(&positive.as_bytes()[..length], SYNTAX);
    }
    for invalid in [
        b"\xff".as_slice(),
        b"\xc0\xaf",
        b"\xed\xa0\x80",
        b"\xf4\x90\x80\x80",
    ] {
        let mut body = positive.as_bytes().to_vec();
        body.extend_from_slice(invalid);
        deny_create(&body, SYNTAX);
    }
    for body in [
        r#"{"Id":"\ud800","Warnings":[]}"#,
        r#"{"Id":"\udc00","Warnings":[]}"#,
        r#"{"Id":"\ud800x","Warnings":[]}"#,
        r#"{"Id":"\u12g4","Warnings":[]}"#,
        r#"{"Id":"\q","Warnings":[]}"#,
    ] {
        deny_create(body.as_bytes(), SYNTAX);
    }
    for control in 0_u8..32 {
        let mut body = b"{\"Id\":\"".to_vec();
        body.push(control);
        body.extend_from_slice(b"\",\"Warnings\":[]}");
        deny_create(&body, SYNTAX);
    }
    for suffix in ["{}", "[]", "null", "false", "0", "x", "\0", "\u{feff}"] {
        deny_create(format!("{positive}{suffix}").as_bytes(), SYNTAX);
    }
    deny_create(format!("\u{feff}{positive}").as_bytes(), SYNTAX);
}

#[test]
fn scanner_syntax_and_limit_order_is_left_to_right() {
    assert!(matches!(scan(r#"{"x": [}"#), Err(ScanError::Syntax)));
    assert!(matches!(
        scan(&format!("{}x", object_members(65))),
        Err(ScanError::Limits)
    ));
    assert!(matches!(scan(r#"{"x":"\ud800"}"#), Err(ScanError::Syntax)));
}

#[test]
fn wait_optional_object_duplicates_and_escaped_positive_are_exact() {
    let _: UnverifiedZeroExit = accept_wait(br#"{"\u0053tatusCode":0}"#);
    for body in [
        r#"{"StatusCode":0,"Error":{},"Error":{}}"#,
        r#"{"StatusCode":0,"Error":{},"\u0045rror":{}}"#,
        r#"{"StatusCode":0,"Error":{"Message":"x"},"Error":{}}"#,
    ] {
        deny_wait(body.as_bytes(), SHAPE);
    }
}

#[test]
fn malformed_number_syntax_and_cross_stage_precedence_are_exact() {
    for number in [
        "+0", "01", "-01", "00", ".0", "0.", "0e", "0e+", "--1", "NaN", "Infinity", "1 2",
    ] {
        deny_wait(wait_body(number).as_bytes(), SYNTAX);
    }
    deny_create(br#"{"Id":"bad"}"#, SHAPE);
    deny_create(br#"{"Id":"bad","Warnings":[],"Unknown":0}"#, SHAPE);
    deny_create(br#"{"Id":"bad","Warnings":[]}x"#, SYNTAX);
    deny_wait(br#"{"StatusCode":1,"Error":{"Message":null}}"#, SHAPE);
    deny_wait(br#"{"StatusCode":0.0}x"#, SYNTAX);
    let later_limit = format!(r#"{{"StatusCode":0.0,"Unknown":"{}"}}"#, "x".repeat(4097));
    deny_wait(later_limit.as_bytes(), LIMITS);
    let mut invalid_utf8 = later_limit.into_bytes();
    invalid_utf8.push(0xff);
    deny_wait(&invalid_utf8, SYNTAX);
}

#[test]
fn wait_body_and_typed_discard_bounds_remain_finite() {
    let mut positive = b"{\"StatusCode\":0}".to_vec();
    positive.resize(MAX_BODY, b' ');
    let _: UnverifiedZeroExit = accept_wait(&positive);
    positive.push(b' ');
    deny_wait(&positive, TOO_LARGE);
    positive[0] = 0xff;
    deny_wait(&positive, TOO_LARGE);

    for (length, code) in [(4096, RECIPE), (4097, LIMITS)] {
        let value = "x".repeat(length);
        deny_create(create_body(&value).as_bytes(), code);
        deny_create(
            format!(r#"{{"Id":"{}","Warnings":["{value}"]}}"#, id('a')).as_bytes(),
            code,
        );
        deny_wait(
            format!(r#"{{"StatusCode":0,"Error":{{"Message":"{value}"}}}}"#).as_bytes(),
            code,
        );
    }
    for (count, code) in [(128, RECIPE), (129, LIMITS)] {
        let warnings = vec!["\"\""; count].join(",");
        deny_create(
            format!(r#"{{"Id":"{}","Warnings":[{warnings}]}}"#, id('a')).as_bytes(),
            code,
        );
    }
}
