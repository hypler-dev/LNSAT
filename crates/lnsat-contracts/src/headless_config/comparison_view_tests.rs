use super::*;
use crate::headless_config::{
    HEADLESS_COMPARISON_SUPPORTED_ASSERTED_PROFILE_V1, HeadlessComparisonContextV1,
    HeadlessComparisonEffectiveEnvelopeV1, HeadlessComparisonEvidenceV1,
    HeadlessComparisonLimitsV1, HeadlessComparisonResourceKindV1, HeadlessComparisonResultV1,
    HeadlessComparisonRuleModeV1, HeadlessComparisonRuleV1, HeadlessComparisonSideV1,
    compare_headless_config_v1, parse_headless_config_declaration_v1,
};
use std::io::Write as _;

const FIXTURE: &str =
    include_str!("../../../../fixtures/contracts/headless-config-declaration-v1.json");
const A: &str = "resource:repo-a";
const B: &str = "resource:repo-b";
const DA: &str = "sha256:1111111111111111111111111111111111111111111111111111111111111111";
const DB: &str = "sha256:2222222222222222222222222222222222222222222222222222222222222222";
const EA: &str = "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const EB: &str = "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const EC: &str = "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc";

fn context() -> HeadlessComparisonContextV1 {
    HeadlessComparisonContextV1::new(
        "installation:example",
        ("generation:current", EA),
        ("floor.v1", EB),
        false,
        0,
        HEADLESS_COMPARISON_SUPPORTED_ASSERTED_PROFILE_V1,
    )
}

fn fixture_side(candidate: bool) -> HeadlessComparisonSideV1 {
    let mode = if candidate {
        HeadlessComparisonRuleModeV1::ApprovalRequired
    } else {
        HeadlessComparisonRuleModeV1::Allow
    };
    let n = if candidate { 1 } else { 100 };
    HeadlessComparisonSideV1::new(
        parse_headless_config_declaration_v1(FIXTURE.as_bytes()).unwrap(),
        HeadlessComparisonEffectiveEnvelopeV1::new(
            if candidate {
                vec![A.to_owned()]
            } else {
                vec![A.to_owned(), B.to_owned()]
            },
            vec![HeadlessComparisonRuleV1::new(
                "identity:alice",
                A,
                "repository.read",
                mode,
                HeadlessComparisonLimitsV1::new(n, n, n, n, n).unwrap(),
            )],
        ),
        vec![
            HeadlessComparisonEvidenceV1::new(
                A,
                HeadlessComparisonResourceKindV1::Repository,
                DA,
                DA,
                EA,
            ),
            HeadlessComparisonEvidenceV1::new(
                B,
                HeadlessComparisonResourceKindV1::Repository,
                DB,
                DB,
                EB,
            ),
        ],
        context(),
    )
}

fn result() -> HeadlessComparisonResultV1 {
    compare_headless_config_v1(fixture_side(false), fixture_side(true))
}

fn json_view(result: &HeadlessComparisonResultV1) -> Value {
    serde_json::from_str(result.view_model().unwrap().canonical_json()).unwrap()
}

#[test]
fn literal_nonempty_view_golden_and_existing_model_identity_match() {
    // Independent literal and SHA-256 were specified from the existing model
    // golden, then verified by Node crypto without invoking this view encoder.
    const EXPECTED_JSON: &str = r#"{"activation_available":false,"authority_comparison":"unverifiable","candidate_declaration_digest":"sha256:c444cd51472235d8fc9ae22b62121853d0687af02237737f540d830a31518f53","context":{"active_stop":false,"current_generation_digest":"sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","current_generation_ref":"generation:current","enforcement_profile_version":"lnsat.runtime_profile.docker_local.v1","installation_ref":"installation:example","policy_floor_digest":"sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb","policy_floor_version":"floor.v1","stop_revocation_epoch":0},"grants_action_authority":false,"identity_verified":false,"model_class":"narrowing","model_commitment":"sha256:b226c2a604b26b074bea05c73699299e139bf104f7f56dc0b502819d2555d64a","old_declaration_digest":"sha256:c444cd51472235d8fc9ae22b62121853d0687af02237737f540d830a31518f53","resource_changes":[{"candidate":{"canonical_identity_digest":"sha256:2222222222222222222222222222222222222222222222222222222222222222","declared_identity_digest":"sha256:2222222222222222222222222222222222222222222222222222222222222222","evidence_digest":"sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb","kind":"repository","reachable":false},"old":{"canonical_identity_digest":"sha256:2222222222222222222222222222222222222222222222222222222222222222","declared_identity_digest":"sha256:2222222222222222222222222222222222222222222222222222222222222222","evidence_digest":"sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb","kind":"repository","reachable":true},"resource_ref":"resource:repo-b"}],"rule_changes":[{"candidate":{"limits":{"cost_microusd":1,"cpu_millicores":1,"memory_bytes":1,"runtime_seconds":1,"tokens":1},"mode":"approval_required"},"capability":"repository.read","old":{"limits":{"cost_microusd":100,"cpu_millicores":100,"memory_bytes":100,"runtime_seconds":100,"tokens":100},"mode":"allow"},"principal_ref":"identity:alice","resource_ref":"resource:repo-a"}],"schema_id":"lnsat.headless_config.comparison_view_model.v1"}"#;
    const EXPECTED_VIEW: &str =
        "sha256:64cee9b619e1aafaeada75537543ad8477b7e5a716af85048ef655c93d69492b";
    let result = result();
    let view = result.view_model().unwrap();
    assert_eq!(view.canonical_json(), EXPECTED_JSON);
    assert_eq!(view.canonical_json().len(), 2083);
    assert_eq!(view.view_commitment(), EXPECTED_VIEW);
    assert_eq!(
        result.model_commitment(),
        Some("sha256:b226c2a604b26b074bea05c73699299e139bf104f7f56dc0b502819d2555d64a")
    );
    let mut canonical = String::new();
    crate::packet::write_canonical_json_value(
        &serde_json::from_str(EXPECTED_JSON).unwrap(),
        &mut canonical,
    )
    .unwrap();
    assert_eq!(canonical, EXPECTED_JSON);
}

#[test]
fn closed_view_has_complete_context_changes_modes_and_budget_dimensions() {
    let view = json_view(&result());
    assert_eq!(view.as_object().unwrap().len(), 12);
    assert_eq!(view["context"].as_object().unwrap().len(), 8);
    assert_eq!(
        view["context"]["current_generation_ref"],
        "generation:current"
    );
    assert_eq!(view["context"]["current_generation_digest"], EA);
    assert_eq!(
        view["old_declaration_digest"],
        view["candidate_declaration_digest"]
    );
    assert_eq!(view["resource_changes"].as_array().unwrap().len(), 1);
    let resource = &view["resource_changes"][0];
    assert_eq!(resource["resource_ref"], B);
    for side in ["old", "candidate"] {
        assert_eq!(resource[side].as_object().unwrap().len(), 5);
        assert_eq!(resource[side]["kind"], "repository");
        assert_eq!(resource[side]["declared_identity_digest"], DB);
        assert_eq!(resource[side]["canonical_identity_digest"], DB);
        assert_eq!(resource[side]["evidence_digest"], EB);
    }
    assert_eq!(resource["old"]["reachable"], true);
    assert_eq!(resource["candidate"]["reachable"], false);
    let rule = &view["rule_changes"][0];
    assert_eq!(rule["principal_ref"], "identity:alice");
    assert_eq!(rule["resource_ref"], A);
    assert_eq!(rule["capability"], "repository.read");
    assert_eq!(rule["old"]["mode"], "allow");
    assert_eq!(rule["candidate"]["mode"], "approval_required");
    for dimension in [
        "tokens",
        "runtime_seconds",
        "cost_microusd",
        "cpu_millicores",
        "memory_bytes",
    ] {
        assert_eq!(rule["old"]["limits"][dimension], 100);
        assert_eq!(rule["candidate"]["limits"][dimension], 1);
    }
    assert!(view.get("candidate_generation_ref").is_none());
}

#[test]
fn every_mathematical_class_remains_non_authorizing_and_diagnostics_stay_redacted() {
    for (old, candidate, class) in [
        (false, false, HeadlessComparisonModelClassV1::Equal),
        (false, true, HeadlessComparisonModelClassV1::Narrowing),
        (true, false, HeadlessComparisonModelClassV1::WideningOrMixed),
    ] {
        let result = compare_headless_config_v1(fixture_side(old), fixture_side(candidate));
        assert_eq!(result.model_class(), class);
        let view = json_view(&result);
        assert_eq!(view["authority_comparison"], "unverifiable");
        for key in [
            "identity_verified",
            "activation_available",
            "grants_action_authority",
        ] {
            assert_eq!(view[key], false);
        }
        let diagnostic = result.redacted_diagnostic().to_string();
        let debug = format!("{result:?} {:?}", result.view_model().unwrap());
        for needle in [
            "identity:alice",
            "generation:current",
            "installation:example",
            A,
            B,
            result.view_model().unwrap().view_commitment(),
        ] {
            assert!(!diagnostic.contains(needle));
            assert!(!debug.contains(needle));
        }
        assert!(!diagnostic.contains("view_model"));
        assert!(!diagnostic.contains("view_commitment"));
    }
}

#[test]
fn unverifiable_stopped_mismatched_and_unsorted_inputs_have_no_view() {
    for variant in 0..4 {
        let old = fixture_side(false);
        let mut candidate = fixture_side(true);
        match variant {
            0 => candidate.context.enforcement_profile_version = "unsupported.v1".to_owned(),
            1 => candidate.context.active_stop = true,
            2 => candidate.context.stop_revocation_epoch = 1,
            _ => candidate.evidence.reverse(),
        }
        let result = compare_headless_config_v1(old, candidate);
        assert_eq!(
            result.model_class(),
            HeadlessComparisonModelClassV1::Unverifiable
        );
        assert!(result.view_model().is_none());
        assert!(result.model_commitment().is_none());
        assert!(result.summary().is_none());
    }
}

#[test]
fn each_budget_dimension_and_context_binding_changes_view_identity() {
    let baseline = result();
    let expected = baseline.view_model().unwrap().view_commitment();
    for dimension in 0..5 {
        let mut candidate = fixture_side(true);
        let limits = &mut candidate.envelope.rules[0].limits;
        match dimension {
            0 => limits.tokens = 0,
            1 => limits.runtime_seconds = 0,
            2 => limits.cost_microusd = 0,
            3 => limits.cpu_millicores = 0,
            _ => limits.memory_bytes = 0,
        }
        let result = compare_headless_config_v1(fixture_side(false), candidate);
        assert_ne!(result.view_model().unwrap().view_commitment(), expected);
    }
    for field in 0..5 {
        let mut old = fixture_side(false);
        let mut candidate = fixture_side(true);
        for side in [&mut old, &mut candidate] {
            match field {
                0 => side.context.current_generation_ref = "generation:other".to_owned(),
                1 => side.context.current_generation_digest = EC.to_owned(),
                2 => side.context.policy_floor_version = "floor.v2".to_owned(),
                3 => side.context.policy_floor_digest = EC.to_owned(),
                _ => side.context.stop_revocation_epoch = 1,
            }
        }
        let result = compare_headless_config_v1(old, candidate);
        assert_ne!(result.view_model().unwrap().view_commitment(), expected);
    }
}

#[test]
fn changed_declaration_and_evidence_are_bound_even_without_new_authority() {
    let baseline = result();
    let expected = baseline.view_model().unwrap().view_commitment();
    let mut candidate = fixture_side(true);
    candidate.evidence[0].evidence_digest = EC.to_owned();
    let changed = compare_headless_config_v1(fixture_side(false), candidate);
    assert_ne!(changed.view_model().unwrap().view_commitment(), expected);
    assert_eq!(
        json_view(&changed)["resource_changes"][0]["candidate"]["evidence_digest"],
        EC
    );
    let mut document: Value = serde_json::from_str(FIXTURE).unwrap();
    document["layers"][0]["layer_ref"] = json!("layer:alternate");
    let mut candidate = fixture_side(true);
    candidate.declaration =
        parse_headless_config_declaration_v1(&serde_json::to_vec(&document).unwrap()).unwrap();
    let changed = compare_headless_config_v1(fixture_side(false), candidate);
    let view = json_view(&changed);
    assert_ne!(
        view["old_declaration_digest"],
        view["candidate_declaration_digest"]
    );
    assert_ne!(changed.view_model().unwrap().view_commitment(), expected);
}

#[test]
fn absent_resource_sides_are_null_without_invented_identity() {
    let mut document: Value = serde_json::from_str(FIXTURE).unwrap();
    document["resources"].as_array_mut().unwrap().pop();
    document["layers"][0]["resource_allow"]
        .as_array_mut()
        .unwrap()
        .pop();
    let mut without_b = fixture_side(true);
    without_b.declaration =
        parse_headless_config_declaration_v1(&serde_json::to_vec(&document).unwrap()).unwrap();
    without_b.evidence.pop();
    let removed = compare_headless_config_v1(fixture_side(false), without_b.clone());
    assert!(json_view(&removed)["resource_changes"][0]["candidate"].is_null());
    let added = compare_headless_config_v1(without_b, fixture_side(false));
    assert!(json_view(&added)["resource_changes"][0]["old"].is_null());
}

#[test]
fn unicode_quotes_and_backslashes_match_existing_canonicalizer() {
    let principal = "identity:quoted\"slash\\é💻";
    let mut document: Value = serde_json::from_str(FIXTURE).unwrap();
    document["layers"][0]["action_rules"][0]["principal_ref"] = json!(principal);
    let mut old = fixture_side(false);
    let mut candidate = fixture_side(true);
    for side in [&mut old, &mut candidate] {
        side.declaration =
            parse_headless_config_declaration_v1(&serde_json::to_vec(&document).unwrap()).unwrap();
        side.envelope.rules[0].principal_ref = principal.to_owned();
    }
    let result = compare_headless_config_v1(old, candidate);
    let view = result.view_model().unwrap();
    let parsed: Value = serde_json::from_str(view.canonical_json()).unwrap();
    assert_eq!(parsed["rule_changes"][0]["principal_ref"], principal);
    let mut expected = String::new();
    crate::packet::write_canonical_json_value(&parsed, &mut expected).unwrap();
    assert_eq!(view.canonical_json(), expected);
}

#[test]
fn bounded_serialization_accepts_exact_byte_cap_and_rejects_one_more_byte() {
    let exact = Value::String("x".repeat(MAX_HEADLESS_COMPARISON_VIEW_MODEL_BYTES_V1 - 2));
    assert_eq!(
        bounded_canonical_json(&exact).unwrap().len(),
        MAX_HEADLESS_COMPARISON_VIEW_MODEL_BYTES_V1
    );
    assert!(
        bounded_canonical_json(&Value::String(
            "x".repeat(MAX_HEADLESS_COMPARISON_VIEW_MODEL_BYTES_V1 - 1)
        ))
        .is_none()
    );
    let mut writer = BoundedViewWriter {
        bytes: Vec::with_capacity(MAX_HEADLESS_COMPARISON_VIEW_MODEL_BYTES_V1),
    };
    writer
        .write_all(&vec![b'x'; MAX_HEADLESS_COMPARISON_VIEW_MODEL_BYTES_V1])
        .unwrap();
    let before = writer.bytes.clone();
    assert!(writer.write_all(b"y").is_err());
    assert_eq!(writer.bytes, before);
    assert_eq!(
        writer.bytes.capacity(),
        MAX_HEADLESS_COMPARISON_VIEW_MODEL_BYTES_V1
    );
}

fn large_side(prefix: &str) -> HeadlessComparisonSideV1 {
    let mut document: Value = serde_json::from_str(FIXTURE).unwrap();
    let actions:Vec<_>=(0..256).map(|n|json!({"principal_ref":format!("identity:{prefix}-{n:03}"),
        "resource_ref":A,"capability":"repository.read","mode":"allow",
        "limits":{"tokens":100,"runtime_seconds":100,"cost_microusd":100,"cpu_millicores":100,"memory_bytes":100}})).collect();
    document["layers"][0]["action_rules"] = json!(actions);
    let bytes = serde_json::to_vec(&document).unwrap();
    assert!(bytes.len() <= crate::headless_config::MAX_HEADLESS_CONFIG_BYTES_V1);
    let declaration = parse_headless_config_declaration_v1(&bytes).unwrap();
    let rules = (0..256)
        .map(|n| {
            HeadlessComparisonRuleV1::new(
                format!("identity:{prefix}-{n:03}"),
                A,
                "repository.read",
                HeadlessComparisonRuleModeV1::Allow,
                HeadlessComparisonLimitsV1::new(100, 100, 100, 100, 100).unwrap(),
            )
        })
        .collect();
    let mut side = fixture_side(false);
    side.declaration = declaration;
    side.envelope.rules = rules;
    side
}

#[test]
fn valid_oversized_complete_model_denies_view_without_truncating_summary() {
    let result = compare_headless_config_v1(large_side("old"), large_side("new"));
    assert_eq!(
        result.model_class(),
        HeadlessComparisonModelClassV1::WideningOrMixed
    );
    assert_eq!(result.summary().unwrap().rule_change_count(), 512);
    assert!(result.model_commitment().is_some());
    assert!(result.view_model().is_none());
    assert_eq!(result.redacted_diagnostic()["rule_change_count"], 512);
}
