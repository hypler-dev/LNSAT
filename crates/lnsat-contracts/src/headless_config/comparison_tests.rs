use super::{
    HEADLESS_COMPARISON_SUPPORTED_ASSERTED_PROFILE_V1, HeadlessComparisonContextV1,
    HeadlessComparisonEffectiveEnvelopeV1, HeadlessComparisonEvidenceV1,
    HeadlessComparisonLimitsV1, HeadlessComparisonModelClassV1, HeadlessComparisonResourceKindV1,
    HeadlessComparisonRuleModeV1, HeadlessComparisonRuleV1, HeadlessComparisonSideV1,
    compare_headless_config_v1, parse_headless_config_declaration_v1,
};
use serde_json::{Value, json};
use sha2::{Digest, Sha256};
use std::fmt::Write as _;

const FIXTURE: &str =
    include_str!("../../../../fixtures/contracts/headless-config-declaration-v1.json");
const A: &str = "resource:repo-a";
const B: &str = "resource:repo-b";
const DIGEST_A: &str = "sha256:1111111111111111111111111111111111111111111111111111111111111111";
const DIGEST_B: &str = "sha256:2222222222222222222222222222222222222222222222222222222222222222";
const ASSERTED_PROFILE_V2: &str = "lnsat.runtime_profile.docker_local.v2";

fn declaration(value: &Value) -> super::HeadlessConfigDeclarationV1 {
    parse_headless_config_declaration_v1(&serde_json::to_vec(&value).unwrap()).unwrap()
}

fn context(profile: &str, generation: &str, active_stop: bool) -> HeadlessComparisonContextV1 {
    HeadlessComparisonContextV1::new(
        "installation:example",
        (
            generation,
            "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        ),
        (
            "floor.v1",
            "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        ),
        active_stop,
        0,
        profile,
    )
}

fn limits(value: u64) -> HeadlessComparisonLimitsV1 {
    HeadlessComparisonLimitsV1::new(value, value, value, value, value).unwrap()
}

fn limits_from_bits(bits: u8) -> HeadlessComparisonLimitsV1 {
    HeadlessComparisonLimitsV1::new(
        u64::from(bits & 1),
        u64::from((bits >> 1) & 1),
        u64::from((bits >> 2) & 1),
        u64::from((bits >> 3) & 1),
        u64::from((bits >> 4) & 1),
    )
    .unwrap()
}

fn evidence(order: bool, changed_evidence: bool) -> Vec<HeadlessComparisonEvidenceV1> {
    let a = HeadlessComparisonEvidenceV1::new(
        A,
        HeadlessComparisonResourceKindV1::Repository,
        DIGEST_A,
        DIGEST_A,
        if changed_evidence {
            "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc"
        } else {
            "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
        },
    );
    let b = HeadlessComparisonEvidenceV1::new(
        B,
        HeadlessComparisonResourceKindV1::Repository,
        DIGEST_B,
        DIGEST_B,
        "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    );
    if order { vec![a, b] } else { vec![b, a] }
}

fn evidence_with_a(
    kind: HeadlessComparisonResourceKindV1,
    identity: &str,
    evidence_digest: &str,
) -> Vec<HeadlessComparisonEvidenceV1> {
    vec![
        HeadlessComparisonEvidenceV1::new(A, kind, identity, identity, evidence_digest),
        HeadlessComparisonEvidenceV1::new(
            B,
            HeadlessComparisonResourceKindV1::Repository,
            DIGEST_B,
            DIGEST_B,
            "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        ),
    ]
}

fn envelope(
    resources: Vec<&str>,
    mode: HeadlessComparisonRuleModeV1,
    value: u64,
) -> HeadlessComparisonEffectiveEnvelopeV1 {
    let limits = if mode == HeadlessComparisonRuleModeV1::Deny {
        HeadlessComparisonLimitsV1::zero()
    } else {
        limits(value)
    };
    HeadlessComparisonEffectiveEnvelopeV1::new(
        resources.into_iter().map(str::to_owned).collect(),
        vec![HeadlessComparisonRuleV1::new(
            "identity:alice",
            A,
            "repository.read",
            mode,
            limits,
        )],
    )
}

fn large_document(prefix: &str) -> Value {
    let resources: Vec<_> = (0..128)
        .map(|index| json!({"resource_ref": format!("resource:{prefix}-{index:03}"), "kind": "repository", "identity_digest": DIGEST_A}))
        .collect();
    let allowed: Vec<_> = (0..128)
        .map(|index| format!("resource:{prefix}-{index:03}"))
        .collect();
    json!({"schema_id":"lnsat.headless_config.declaration.v1", "contract_version":"lnsat.contracts.v1_0", "installation_ref":"installation:example", "resources":resources, "layers":[{"layer_ref":"layer:project", "stage":"project", "resource_allow":allowed, "action_rules":[]}]})
}

fn large_evidence(prefix: &str) -> Vec<HeadlessComparisonEvidenceV1> {
    (0..128)
        .map(|index| {
            HeadlessComparisonEvidenceV1::new(
                format!("resource:{prefix}-{index:03}"),
                HeadlessComparisonResourceKindV1::Repository,
                DIGEST_A,
                DIGEST_A,
                "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            )
        })
        .collect()
}

fn deny_rules(prefix: &str, resource_ref: &str) -> Vec<HeadlessComparisonRuleV1> {
    (0..1_280)
        .map(|index| {
            HeadlessComparisonRuleV1::new(
                format!("identity:{prefix}-{index:04}"),
                resource_ref,
                "repository.read",
                HeadlessComparisonRuleModeV1::Deny,
                HeadlessComparisonLimitsV1::zero(),
            )
        })
        .collect()
}

fn side(
    document: Value,
    resources: Vec<&str>,
    mode: HeadlessComparisonRuleModeV1,
    value: u64,
    profile: &str,
    generation: &str,
    stopped: bool,
) -> HeadlessComparisonSideV1 {
    let parsed = declaration(&document);
    drop(document);
    HeadlessComparisonSideV1::new(
        parsed,
        envelope(resources, mode, value),
        evidence(true, false),
        context(profile, generation, stopped),
    )
}

#[test]
fn equal_is_unverifiable_authority_and_has_stable_commitment() {
    let old = side(
        serde_json::from_str(FIXTURE).unwrap(),
        vec![A, B],
        HeadlessComparisonRuleModeV1::Allow,
        100,
        HEADLESS_COMPARISON_SUPPORTED_ASSERTED_PROFILE_V1,
        "generation:current",
        false,
    );
    let candidate = side(
        serde_json::from_str(FIXTURE).unwrap(),
        vec![A, B],
        HeadlessComparisonRuleModeV1::Allow,
        100,
        HEADLESS_COMPARISON_SUPPORTED_ASSERTED_PROFILE_V1,
        "generation:current",
        false,
    );
    let result = compare_headless_config_v1(old, candidate);
    assert_eq!(result.model_class(), HeadlessComparisonModelClassV1::Equal);
    // Independently generated from the manually fixed v1 fixture material.
    assert_eq!(
        result.model_commitment(),
        Some("sha256:9ed9047a50c082be2791e4d357948646000253d96d5920199ba5516ab63b9d28")
    );
    let diagnostic = result.redacted_diagnostic();
    assert_eq!(diagnostic["authority_comparison"], "unverifiable");
    for marker in [
        "identity_verified",
        "activation_available",
        "grants_action_authority",
    ] {
        assert_eq!(diagnostic[marker], false);
    }
    assert!(!format!("{result:?}").contains("resource:repo-a"));
}

#[test]
fn exact_v2_profile_supports_comparison_without_authority() {
    let equal = compare_headless_config_v1(
        side(
            serde_json::from_str(FIXTURE).unwrap(),
            vec![A, B],
            HeadlessComparisonRuleModeV1::Allow,
            100,
            ASSERTED_PROFILE_V2,
            "generation:current",
            false,
        ),
        side(
            serde_json::from_str(FIXTURE).unwrap(),
            vec![A, B],
            HeadlessComparisonRuleModeV1::Allow,
            100,
            ASSERTED_PROFILE_V2,
            "generation:current",
            false,
        ),
    );
    let narrowing = compare_headless_config_v1(
        side(
            serde_json::from_str(FIXTURE).unwrap(),
            vec![A, B],
            HeadlessComparisonRuleModeV1::Allow,
            100,
            ASSERTED_PROFILE_V2,
            "generation:current",
            false,
        ),
        side(
            serde_json::from_str(FIXTURE).unwrap(),
            vec![A],
            HeadlessComparisonRuleModeV1::ApprovalRequired,
            1,
            ASSERTED_PROFILE_V2,
            "generation:current",
            false,
        ),
    );
    let widening = compare_headless_config_v1(
        side(
            serde_json::from_str(FIXTURE).unwrap(),
            vec![A],
            HeadlessComparisonRuleModeV1::ApprovalRequired,
            1,
            ASSERTED_PROFILE_V2,
            "generation:current",
            false,
        ),
        side(
            serde_json::from_str(FIXTURE).unwrap(),
            vec![A, B],
            HeadlessComparisonRuleModeV1::Allow,
            100,
            ASSERTED_PROFILE_V2,
            "generation:current",
            false,
        ),
    );

    for (result, class) in [
        (equal, HeadlessComparisonModelClassV1::Equal),
        (narrowing, HeadlessComparisonModelClassV1::Narrowing),
        (widening, HeadlessComparisonModelClassV1::WideningOrMixed),
    ] {
        assert_eq!(result.model_class(), class);
        assert!(result.summary().is_some());
        assert!(result.model_commitment().is_some());
        let diagnostic = result.redacted_diagnostic();
        assert_eq!(diagnostic["authority_comparison"], "unverifiable");
        for marker in [
            "identity_verified",
            "activation_available",
            "grants_action_authority",
        ] {
            assert_eq!(diagnostic[marker], false);
        }
    }
}

#[test]
fn asserted_profile_is_exact_shared_context_commitment_material() {
    let build = |profile, stopped| {
        side(
            serde_json::from_str(FIXTURE).unwrap(),
            vec![A, B],
            HeadlessComparisonRuleModeV1::Allow,
            100,
            profile,
            "generation:current",
            stopped,
        )
    };

    let v1 = compare_headless_config_v1(
        build(HEADLESS_COMPARISON_SUPPORTED_ASSERTED_PROFILE_V1, false),
        build(HEADLESS_COMPARISON_SUPPORTED_ASSERTED_PROFILE_V1, false),
    );
    let v2 = compare_headless_config_v1(
        build(ASSERTED_PROFILE_V2, false),
        build(ASSERTED_PROFILE_V2, false),
    );
    assert_eq!(v1.model_class(), HeadlessComparisonModelClassV1::Equal);
    assert_eq!(v2.model_class(), HeadlessComparisonModelClassV1::Equal);
    assert_ne!(v1.model_commitment(), v2.model_commitment());
    assert_ne!(
        v1.view_model().unwrap().view_commitment(),
        v2.view_model().unwrap().view_commitment()
    );

    for (old_profile, candidate_profile) in [
        (
            HEADLESS_COMPARISON_SUPPORTED_ASSERTED_PROFILE_V1,
            ASSERTED_PROFILE_V2,
        ),
        (
            ASSERTED_PROFILE_V2,
            HEADLESS_COMPARISON_SUPPORTED_ASSERTED_PROFILE_V1,
        ),
    ] {
        assert_fixed_unverifiable(&compare_headless_config_v1(
            build(old_profile, false),
            build(candidate_profile, false),
        ));
    }

    for unknown_or_near_match in [
        "lnsat.runtime_profile.docker_local.v3",
        "lnsat.runtime_profile.docker_local.v2x",
        "lnsat.runtime_profile.docker_local.v02",
        "lnsat.runtime_profile.docker_local.v2.schema3",
        "lnsat.runtime_profile.docker_local.v2 ",
    ] {
        assert_fixed_unverifiable(&compare_headless_config_v1(
            build(unknown_or_near_match, false),
            build(unknown_or_near_match, false),
        ));
    }

    assert_fixed_unverifiable(&compare_headless_config_v1(
        build(ASSERTED_PROFILE_V2, true),
        build(ASSERTED_PROFILE_V2, true),
    ));
}

#[test]
fn all_mode_pairs_and_budget_dimensions_follow_partial_order() {
    let modes = [
        HeadlessComparisonRuleModeV1::Deny,
        HeadlessComparisonRuleModeV1::ApprovalRequired,
        HeadlessComparisonRuleModeV1::Allow,
    ];
    for (old_index, old_mode) in modes.into_iter().enumerate() {
        for (candidate_index, candidate_mode) in modes.into_iter().enumerate() {
            let old = side(
                serde_json::from_str(FIXTURE).unwrap(),
                vec![A, B],
                old_mode,
                1,
                HEADLESS_COMPARISON_SUPPORTED_ASSERTED_PROFILE_V1,
                "generation:current",
                false,
            );
            let candidate = side(
                serde_json::from_str(FIXTURE).unwrap(),
                vec![A, B],
                candidate_mode,
                1,
                HEADLESS_COMPARISON_SUPPORTED_ASSERTED_PROFILE_V1,
                "generation:current",
                false,
            );
            let expected = match old_index.cmp(&candidate_index) {
                std::cmp::Ordering::Equal => HeadlessComparisonModelClassV1::Equal,
                std::cmp::Ordering::Greater => HeadlessComparisonModelClassV1::Narrowing,
                std::cmp::Ordering::Less => HeadlessComparisonModelClassV1::WideningOrMixed,
            };
            assert_eq!(
                compare_headless_config_v1(old, candidate).model_class(),
                expected,
                "{old_index} -> {candidate_index}"
            );
        }
    }
    for index in 0..5 {
        let old_limits = match index {
            0 => HeadlessComparisonLimitsV1::new(2, 1, 1, 1, 1).unwrap(),
            1 => HeadlessComparisonLimitsV1::new(1, 2, 1, 1, 1).unwrap(),
            2 => HeadlessComparisonLimitsV1::new(1, 1, 2, 1, 1).unwrap(),
            3 => HeadlessComparisonLimitsV1::new(1, 1, 1, 2, 1).unwrap(),
            _ => HeadlessComparisonLimitsV1::new(1, 1, 1, 1, 2).unwrap(),
        };
        let candidate_limits = limits(1);
        let old = HeadlessComparisonSideV1::new(
            declaration(&serde_json::from_str(FIXTURE).unwrap()),
            HeadlessComparisonEffectiveEnvelopeV1::new(
                vec![A.into(), B.into()],
                vec![HeadlessComparisonRuleV1::new(
                    "identity:alice",
                    A,
                    "repository.read",
                    HeadlessComparisonRuleModeV1::Allow,
                    old_limits,
                )],
            ),
            evidence(true, false),
            context(
                HEADLESS_COMPARISON_SUPPORTED_ASSERTED_PROFILE_V1,
                "generation:current",
                false,
            ),
        );
        let candidate = HeadlessComparisonSideV1::new(
            declaration(&serde_json::from_str(FIXTURE).unwrap()),
            HeadlessComparisonEffectiveEnvelopeV1::new(
                vec![A.into(), B.into()],
                vec![HeadlessComparisonRuleV1::new(
                    "identity:alice",
                    A,
                    "repository.read",
                    HeadlessComparisonRuleModeV1::Allow,
                    candidate_limits,
                )],
            ),
            evidence(true, false),
            context(
                HEADLESS_COMPARISON_SUPPORTED_ASSERTED_PROFILE_V1,
                "generation:current",
                false,
            ),
        );
        assert_eq!(
            compare_headless_config_v1(old, candidate).model_class(),
            HeadlessComparisonModelClassV1::Narrowing,
            "limit {index}"
        );
    }
}

#[test]
fn exhaustive_finite_mode_and_budget_oracle_has_no_false_narrowing() {
    let mut states = vec![(0_u8, 0_u8)];
    for mode in [1_u8, 2_u8] {
        states.extend((0..32).map(|bits| (mode, bits)));
    }
    assert_eq!(states.len(), 65);
    let declaration = declaration(&serde_json::from_str(FIXTURE).unwrap());
    let context = context(
        HEADLESS_COMPARISON_SUPPORTED_ASSERTED_PROFILE_V1,
        "generation:current",
        false,
    );
    for &(old_mode, old_bits) in &states {
        for &(candidate_mode, candidate_bits) in &states {
            let mode = |rank| match rank {
                0 => HeadlessComparisonRuleModeV1::Deny,
                1 => HeadlessComparisonRuleModeV1::ApprovalRequired,
                _ => HeadlessComparisonRuleModeV1::Allow,
            };
            let side_for = |rank, bits| {
                HeadlessComparisonSideV1::new(
                    declaration.clone(),
                    HeadlessComparisonEffectiveEnvelopeV1::new(
                        vec![A.into(), B.into()],
                        vec![HeadlessComparisonRuleV1::new(
                            "identity:alice",
                            A,
                            "repository.read",
                            mode(rank),
                            if rank == 0 {
                                HeadlessComparisonLimitsV1::zero()
                            } else {
                                limits_from_bits(bits)
                            },
                        )],
                    ),
                    evidence(true, false),
                    context.clone(),
                )
            };
            let old_values = if old_mode == 0 { 0 } else { old_bits };
            let candidate_values = if candidate_mode == 0 {
                0
            } else {
                candidate_bits
            };
            let mode_rises = candidate_mode > old_mode;
            let mode_falls = candidate_mode < old_mode;
            let budget_rises =
                (0..5).any(|index| (candidate_values >> index) & 1 > (old_values >> index) & 1);
            let budget_falls =
                (0..5).any(|index| (candidate_values >> index) & 1 < (old_values >> index) & 1);
            let expected = if mode_rises || budget_rises {
                HeadlessComparisonModelClassV1::WideningOrMixed
            } else if mode_falls || budget_falls {
                HeadlessComparisonModelClassV1::Narrowing
            } else {
                HeadlessComparisonModelClassV1::Equal
            };
            let actual = compare_headless_config_v1(
                side_for(old_mode, old_bits),
                side_for(candidate_mode, candidate_bits),
            )
            .model_class();
            assert_eq!(
                actual, expected,
                "old={old_mode}:{old_bits} candidate={candidate_mode}:{candidate_bits}"
            );
        }
    }
}

#[test]
fn mixed_and_resource_reachability_changes_are_not_equal() {
    let mut raised: Value = serde_json::from_str(FIXTURE).unwrap();
    for value in raised["layers"][0]["action_rules"][0]["limits"]
        .as_object_mut()
        .unwrap()
        .values_mut()
    {
        *value = json!(101);
    }
    let old = side(
        raised.clone(),
        vec![A, B],
        HeadlessComparisonRuleModeV1::Allow,
        100,
        HEADLESS_COMPARISON_SUPPORTED_ASSERTED_PROFILE_V1,
        "generation:current",
        false,
    );
    let candidate = side(
        raised,
        vec![A],
        HeadlessComparisonRuleModeV1::Allow,
        101,
        HEADLESS_COMPARISON_SUPPORTED_ASSERTED_PROFILE_V1,
        "generation:current",
        false,
    );
    assert_eq!(
        compare_headless_config_v1(old, candidate).model_class(),
        HeadlessComparisonModelClassV1::WideningOrMixed
    );
    let old = side(
        serde_json::from_str(FIXTURE).unwrap(),
        vec![A],
        HeadlessComparisonRuleModeV1::Deny,
        0,
        HEADLESS_COMPARISON_SUPPORTED_ASSERTED_PROFILE_V1,
        "generation:current",
        false,
    );
    let candidate = side(
        serde_json::from_str(FIXTURE).unwrap(),
        vec![A, B],
        HeadlessComparisonRuleModeV1::Deny,
        0,
        HEADLESS_COMPARISON_SUPPORTED_ASSERTED_PROFILE_V1,
        "generation:current",
        false,
    );
    assert_eq!(
        compare_headless_config_v1(old, candidate).model_class(),
        HeadlessComparisonModelClassV1::WideningOrMixed
    );
}

#[test]
fn identity_kind_and_alias_substitution_are_widening_or_mixed() {
    let old = side(
        serde_json::from_str(FIXTURE).unwrap(),
        vec![A, B],
        HeadlessComparisonRuleModeV1::Allow,
        100,
        HEADLESS_COMPARISON_SUPPORTED_ASSERTED_PROFILE_V1,
        "generation:current",
        false,
    );
    let mut changed: Value = serde_json::from_str(FIXTURE).unwrap();
    changed["resources"][0]["kind"] = json!("service");
    let candidate = side(
        changed,
        vec![A, B],
        HeadlessComparisonRuleModeV1::Allow,
        100,
        HEADLESS_COMPARISON_SUPPORTED_ASSERTED_PROFILE_V1,
        "generation:current",
        false,
    );
    assert_eq!(
        compare_headless_config_v1(old, candidate).model_class(),
        HeadlessComparisonModelClassV1::Unverifiable,
        "evidence kind must exactly match declaration"
    );
    let old = side(
        serde_json::from_str(FIXTURE).unwrap(),
        vec![A],
        HeadlessComparisonRuleModeV1::Deny,
        0,
        HEADLESS_COMPARISON_SUPPORTED_ASSERTED_PROFILE_V1,
        "generation:current",
        false,
    );
    let candidate = HeadlessComparisonSideV1::new(
        declaration(&serde_json::from_str(FIXTURE).unwrap()),
        HeadlessComparisonEffectiveEnvelopeV1::new(
            vec![A.into()],
            vec![HeadlessComparisonRuleV1::new(
                "identity:bob",
                A,
                "repository.read",
                HeadlessComparisonRuleModeV1::Deny,
                HeadlessComparisonLimitsV1::zero(),
            )],
        ),
        evidence(true, false),
        context(
            HEADLESS_COMPARISON_SUPPORTED_ASSERTED_PROFILE_V1,
            "generation:current",
            false,
        ),
    );
    assert_eq!(
        compare_headless_config_v1(old, candidate).model_class(),
        HeadlessComparisonModelClassV1::Equal,
        "absence equals explicit zero denial"
    );
}

#[test]
fn evidence_context_and_capability_fail_closed() {
    let old = side(
        serde_json::from_str(FIXTURE).unwrap(),
        vec![A, B],
        HeadlessComparisonRuleModeV1::Allow,
        100,
        "lnsat.runtime_profile.unknown.v1",
        "generation:current",
        false,
    );
    let candidate = side(
        serde_json::from_str(FIXTURE).unwrap(),
        vec![A, B],
        HeadlessComparisonRuleModeV1::Allow,
        100,
        "lnsat.runtime_profile.unknown.v1",
        "generation:current",
        false,
    );
    assert_eq!(
        compare_headless_config_v1(old, candidate).model_class(),
        HeadlessComparisonModelClassV1::Unverifiable
    );
    let old = HeadlessComparisonSideV1::new(
        declaration(&serde_json::from_str(FIXTURE).unwrap()),
        envelope(vec![A, B], HeadlessComparisonRuleModeV1::Allow, 100),
        evidence(false, false),
        context(
            HEADLESS_COMPARISON_SUPPORTED_ASSERTED_PROFILE_V1,
            "generation:current",
            false,
        ),
    );
    let candidate = side(
        serde_json::from_str(FIXTURE).unwrap(),
        vec![A, B],
        HeadlessComparisonRuleModeV1::Allow,
        100,
        HEADLESS_COMPARISON_SUPPORTED_ASSERTED_PROFILE_V1,
        "generation:current",
        false,
    );
    assert_eq!(
        compare_headless_config_v1(old, candidate).model_class(),
        HeadlessComparisonModelClassV1::Unverifiable
    );
    let old = side(
        serde_json::from_str(FIXTURE).unwrap(),
        vec![A, B],
        HeadlessComparisonRuleModeV1::Allow,
        100,
        HEADLESS_COMPARISON_SUPPORTED_ASSERTED_PROFILE_V1,
        "generation:other",
        false,
    );
    let candidate = side(
        serde_json::from_str(FIXTURE).unwrap(),
        vec![A, B],
        HeadlessComparisonRuleModeV1::Allow,
        100,
        HEADLESS_COMPARISON_SUPPORTED_ASSERTED_PROFILE_V1,
        "generation:current",
        false,
    );
    assert_eq!(
        compare_headless_config_v1(old, candidate).model_class(),
        HeadlessComparisonModelClassV1::Unverifiable
    );
    let old = HeadlessComparisonSideV1::new(
        declaration(&serde_json::from_str(FIXTURE).unwrap()),
        HeadlessComparisonEffectiveEnvelopeV1::new(
            vec![A.into(), B.into()],
            vec![HeadlessComparisonRuleV1::new(
                "identity:alice",
                A,
                "ssh",
                HeadlessComparisonRuleModeV1::Deny,
                HeadlessComparisonLimitsV1::zero(),
            )],
        ),
        evidence(true, false),
        context(
            HEADLESS_COMPARISON_SUPPORTED_ASSERTED_PROFILE_V1,
            "generation:current",
            false,
        ),
    );
    let candidate = side(
        serde_json::from_str(FIXTURE).unwrap(),
        vec![A, B],
        HeadlessComparisonRuleModeV1::Allow,
        100,
        HEADLESS_COMPARISON_SUPPORTED_ASSERTED_PROFILE_V1,
        "generation:current",
        false,
    );
    assert_eq!(
        compare_headless_config_v1(old, candidate).model_class(),
        HeadlessComparisonModelClassV1::Unverifiable
    );
}

#[test]
fn active_stop_and_overflow_constructor_fail_closed() {
    let old = side(
        serde_json::from_str(FIXTURE).unwrap(),
        vec![A, B],
        HeadlessComparisonRuleModeV1::Allow,
        100,
        HEADLESS_COMPARISON_SUPPORTED_ASSERTED_PROFILE_V1,
        "generation:current",
        true,
    );
    let candidate = side(
        serde_json::from_str(FIXTURE).unwrap(),
        vec![A, B],
        HeadlessComparisonRuleModeV1::Allow,
        100,
        HEADLESS_COMPARISON_SUPPORTED_ASSERTED_PROFILE_V1,
        "generation:current",
        true,
    );
    assert_eq!(
        compare_headless_config_v1(old, candidate).model_class(),
        HeadlessComparisonModelClassV1::Unverifiable
    );
    assert!(HeadlessComparisonLimitsV1::new(9_007_199_254_740_992, 0, 0, 0, 0).is_err());
}

#[test]
fn matched_identity_kind_change_and_evidence_refresh_have_exact_semantics() {
    let old = side(
        serde_json::from_str(FIXTURE).unwrap(),
        vec![A, B],
        HeadlessComparisonRuleModeV1::Allow,
        100,
        HEADLESS_COMPARISON_SUPPORTED_ASSERTED_PROFILE_V1,
        "generation:current",
        false,
    );
    let mut changed: Value = serde_json::from_str(FIXTURE).unwrap();
    changed["resources"][0]["kind"] = json!("service");
    let candidate = HeadlessComparisonSideV1::new(
        declaration(&changed),
        envelope(vec![A, B], HeadlessComparisonRuleModeV1::Allow, 100),
        evidence_with_a(
            HeadlessComparisonResourceKindV1::Service,
            DIGEST_A,
            "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        ),
        context(
            HEADLESS_COMPARISON_SUPPORTED_ASSERTED_PROFILE_V1,
            "generation:current",
            false,
        ),
    );
    assert_eq!(
        compare_headless_config_v1(old, candidate).model_class(),
        HeadlessComparisonModelClassV1::WideningOrMixed
    );

    let old = side(
        serde_json::from_str(FIXTURE).unwrap(),
        vec![A, B],
        HeadlessComparisonRuleModeV1::Allow,
        100,
        HEADLESS_COMPARISON_SUPPORTED_ASSERTED_PROFILE_V1,
        "generation:current",
        false,
    );
    let candidate = HeadlessComparisonSideV1::new(
        declaration(&serde_json::from_str(FIXTURE).unwrap()),
        envelope(vec![A, B], HeadlessComparisonRuleModeV1::Allow, 100),
        evidence_with_a(
            HeadlessComparisonResourceKindV1::Repository,
            DIGEST_A,
            "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
        ),
        context(
            HEADLESS_COMPARISON_SUPPORTED_ASSERTED_PROFILE_V1,
            "generation:current",
            false,
        ),
    );
    let refreshed = compare_headless_config_v1(old, candidate);
    assert_eq!(
        refreshed.model_class(),
        HeadlessComparisonModelClassV1::Equal
    );
    assert_eq!(refreshed.summary().unwrap().resource_change_count(), 1);
}

#[test]
fn evidence_cardinality_and_envelope_limits_fail_closed() {
    let document: Value = serde_json::from_str(FIXTURE).unwrap();
    let base_context = context(
        HEADLESS_COMPARISON_SUPPORTED_ASSERTED_PROFILE_V1,
        "generation:current",
        false,
    );
    for bad_evidence in [
        vec![evidence(true, false)[0].clone()],
        {
            let duplicate = evidence(true, false)[0].clone();
            vec![duplicate.clone(), duplicate]
        },
        {
            let mut extra = evidence(true, false);
            extra.push(HeadlessComparisonEvidenceV1::new(
                "resource:extra",
                HeadlessComparisonResourceKindV1::Repository,
                DIGEST_A,
                DIGEST_A,
                "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
            ));
            extra
        },
    ] {
        let old = HeadlessComparisonSideV1::new(
            declaration(&document),
            envelope(vec![A, B], HeadlessComparisonRuleModeV1::Allow, 100),
            bad_evidence,
            base_context.clone(),
        );
        let candidate = side(
            document.clone(),
            vec![A, B],
            HeadlessComparisonRuleModeV1::Allow,
            100,
            HEADLESS_COMPARISON_SUPPORTED_ASSERTED_PROFILE_V1,
            "generation:current",
            false,
        );
        assert_eq!(
            compare_headless_config_v1(old, candidate).model_class(),
            HeadlessComparisonModelClassV1::Unverifiable
        );
    }
    let rules = (0..1_281)
        .map(|index| {
            HeadlessComparisonRuleV1::new(
                format!("identity:agent-{index}"),
                A,
                "repository.read",
                HeadlessComparisonRuleModeV1::Deny,
                HeadlessComparisonLimitsV1::zero(),
            )
        })
        .collect();
    let old = HeadlessComparisonSideV1::new(
        declaration(&document),
        HeadlessComparisonEffectiveEnvelopeV1::new(vec![A.into(), B.into()], rules),
        evidence(true, false),
        base_context.clone(),
    );
    let candidate = side(
        document,
        vec![A, B],
        HeadlessComparisonRuleModeV1::Allow,
        100,
        HEADLESS_COMPARISON_SUPPORTED_ASSERTED_PROFILE_V1,
        "generation:current",
        false,
    );
    assert_eq!(
        compare_headless_config_v1(old, candidate).model_class(),
        HeadlessComparisonModelClassV1::Unverifiable
    );
}

#[test]
fn maximum_side_and_union_collections_are_bounded_before_comparison() {
    let old_document = large_document("old");
    let candidate_document = large_document("candidate");
    let old_resources: Vec<_> = (0..128)
        .map(|index| format!("resource:old-{index:03}"))
        .collect();
    let candidate_resources: Vec<_> = (0..128)
        .map(|index| format!("resource:candidate-{index:03}"))
        .collect();
    let current = context(
        HEADLESS_COMPARISON_SUPPORTED_ASSERTED_PROFILE_V1,
        "generation:current",
        false,
    );
    let old = HeadlessComparisonSideV1::new(
        declaration(&old_document),
        HeadlessComparisonEffectiveEnvelopeV1::new(
            old_resources,
            deny_rules("old", "resource:old-000"),
        ),
        large_evidence("old"),
        current.clone(),
    );
    let candidate = HeadlessComparisonSideV1::new(
        declaration(&candidate_document),
        HeadlessComparisonEffectiveEnvelopeV1::new(
            candidate_resources,
            deny_rules("candidate", "resource:candidate-000"),
        ),
        large_evidence("candidate"),
        current,
    );
    assert_eq!(
        compare_headless_config_v1(old, candidate).model_class(),
        HeadlessComparisonModelClassV1::WideningOrMixed
    );
    let too_many_resources: Vec<_> = (0..129)
        .map(|index| format!("resource:overflow-{index:03}"))
        .collect();
    let old = HeadlessComparisonSideV1::new(
        declaration(&old_document),
        HeadlessComparisonEffectiveEnvelopeV1::new(too_many_resources, vec![]),
        large_evidence("old"),
        context(
            HEADLESS_COMPARISON_SUPPORTED_ASSERTED_PROFILE_V1,
            "generation:current",
            false,
        ),
    );
    let candidate = side(
        serde_json::from_str(FIXTURE).unwrap(),
        vec![A, B],
        HeadlessComparisonRuleModeV1::Allow,
        100,
        HEADLESS_COMPARISON_SUPPORTED_ASSERTED_PROFILE_V1,
        "generation:current",
        false,
    );
    assert_eq!(
        compare_headless_config_v1(old, candidate).model_class(),
        HeadlessComparisonModelClassV1::Unverifiable
    );
}

#[test]
fn installation_mismatches_and_semantic_content_change_are_distinct() {
    let mut other_installation: Value = serde_json::from_str(FIXTURE).unwrap();
    other_installation["installation_ref"] = json!("installation:other");
    let standard = context(
        HEADLESS_COMPARISON_SUPPORTED_ASSERTED_PROFILE_V1,
        "generation:current",
        false,
    );
    let other = HeadlessComparisonContextV1::new(
        "installation:other",
        (
            "generation:current",
            "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        ),
        (
            "floor.v1",
            "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        ),
        false,
        0,
        HEADLESS_COMPARISON_SUPPORTED_ASSERTED_PROFILE_V1,
    );
    let candidate = side(
        serde_json::from_str(FIXTURE).unwrap(),
        vec![A, B],
        HeadlessComparisonRuleModeV1::Allow,
        100,
        HEADLESS_COMPARISON_SUPPORTED_ASSERTED_PROFILE_V1,
        "generation:current",
        false,
    );
    let old = HeadlessComparisonSideV1::new(
        declaration(&other_installation),
        envelope(vec![A, B], HeadlessComparisonRuleModeV1::Allow, 100),
        evidence(true, false),
        standard.clone(),
    );
    assert_eq!(
        compare_headless_config_v1(old, candidate).model_class(),
        HeadlessComparisonModelClassV1::Unverifiable,
        "context old installation mismatch"
    );
    let old = side(
        serde_json::from_str(FIXTURE).unwrap(),
        vec![A, B],
        HeadlessComparisonRuleModeV1::Allow,
        100,
        HEADLESS_COMPARISON_SUPPORTED_ASSERTED_PROFILE_V1,
        "generation:current",
        false,
    );
    let candidate = HeadlessComparisonSideV1::new(
        declaration(&other_installation),
        envelope(vec![A, B], HeadlessComparisonRuleModeV1::Allow, 100),
        evidence(true, false),
        standard,
    );
    assert_eq!(
        compare_headless_config_v1(old, candidate).model_class(),
        HeadlessComparisonModelClassV1::Unverifiable,
        "context candidate installation mismatch"
    );
    let old = HeadlessComparisonSideV1::new(
        declaration(&serde_json::from_str(FIXTURE).unwrap()),
        envelope(vec![A, B], HeadlessComparisonRuleModeV1::Allow, 100),
        evidence(true, false),
        context(
            HEADLESS_COMPARISON_SUPPORTED_ASSERTED_PROFILE_V1,
            "generation:current",
            false,
        ),
    );
    let candidate = HeadlessComparisonSideV1::new(
        declaration(&other_installation),
        envelope(vec![A, B], HeadlessComparisonRuleModeV1::Allow, 100),
        evidence(true, false),
        other,
    );
    assert_eq!(
        compare_headless_config_v1(old, candidate).model_class(),
        HeadlessComparisonModelClassV1::Unverifiable,
        "old candidate installation mismatch"
    );
}

#[test]
fn changed_declaration_content_can_remain_semantically_equal() {
    let mut layered: Value = serde_json::from_str(FIXTURE).unwrap();
    let mut layer = layered["layers"][0].clone();
    layer["layer_ref"] = json!("layer:operator");
    layer["stage"] = json!("operator");
    layered["layers"].as_array_mut().unwrap().push(layer);
    let old = side(
        serde_json::from_str(FIXTURE).unwrap(),
        vec![A, B],
        HeadlessComparisonRuleModeV1::Allow,
        100,
        HEADLESS_COMPARISON_SUPPORTED_ASSERTED_PROFILE_V1,
        "generation:current",
        false,
    );
    let candidate = side(
        layered,
        vec![A, B],
        HeadlessComparisonRuleModeV1::Allow,
        100,
        HEADLESS_COMPARISON_SUPPORTED_ASSERTED_PROFILE_V1,
        "generation:current",
        false,
    );
    assert_eq!(
        compare_headless_config_v1(old, candidate).model_class(),
        HeadlessComparisonModelClassV1::Equal,
        "content identity differs without semantic authority change"
    );
}

#[test]
fn principal_substitution_is_widening_or_mixed() {
    let old = side(
        serde_json::from_str(FIXTURE).unwrap(),
        vec![A, B],
        HeadlessComparisonRuleModeV1::Allow,
        100,
        HEADLESS_COMPARISON_SUPPORTED_ASSERTED_PROFILE_V1,
        "generation:current",
        false,
    );
    let mut candidate_document: Value = serde_json::from_str(FIXTURE).unwrap();
    candidate_document["layers"][0]["action_rules"][0]["principal_ref"] = json!("identity:bob");
    let candidate = HeadlessComparisonSideV1::new(
        declaration(&candidate_document),
        HeadlessComparisonEffectiveEnvelopeV1::new(
            vec![A.into(), B.into()],
            vec![HeadlessComparisonRuleV1::new(
                "identity:bob",
                A,
                "repository.read",
                HeadlessComparisonRuleModeV1::Allow,
                limits(100),
            )],
        ),
        evidence(true, false),
        context(
            HEADLESS_COMPARISON_SUPPORTED_ASSERTED_PROFILE_V1,
            "generation:current",
            false,
        ),
    );
    assert_eq!(
        compare_headless_config_v1(old, candidate).model_class(),
        HeadlessComparisonModelClassV1::WideningOrMixed
    );
}

#[test]
fn manual_canonical_nonempty_change_golden_is_stable() {
    // Independently specified preimage: remove repo-b and lower Alice's mode
    // and all five budgets. Python hashlib independently verified this vector.
    const PREIMAGE: &str = concat!(
        "lnsat.headless_config.comparison_model.v1\n",
        r#"{"candidate":{"declaration_digest":"sha256:c444cd51472235d8fc9ae22b62121853d0687af02237737f540d830a31518f53","envelope":{"resource_allow":["resource:repo-a"],"rules":[{"capability":"repository.read","limits":{"cost_microusd":1,"cpu_millicores":1,"memory_bytes":1,"runtime_seconds":1,"tokens":1},"mode":"approval_required","principal_ref":"identity:alice","resource_ref":"resource:repo-a"}]},"evidence":[{"canonical_identity_digest":"sha256:1111111111111111111111111111111111111111111111111111111111111111","declared_identity_digest":"sha256:1111111111111111111111111111111111111111111111111111111111111111","evidence_digest":"sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","kind":"repository","resource_ref":"resource:repo-a"},{"canonical_identity_digest":"sha256:2222222222222222222222222222222222222222222222222222222222222222","declared_identity_digest":"sha256:2222222222222222222222222222222222222222222222222222222222222222","evidence_digest":"sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb","kind":"repository","resource_ref":"resource:repo-b"}]},"context":{"active_stop":false,"current_generation_digest":"sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","current_generation_ref":"generation:current","enforcement_profile_version":"lnsat.runtime_profile.docker_local.v1","installation_ref":"installation:example","policy_floor_digest":"sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb","policy_floor_version":"floor.v1","stop_revocation_epoch":0},"model_class":"narrowing","old":{"declaration_digest":"sha256:c444cd51472235d8fc9ae22b62121853d0687af02237737f540d830a31518f53","envelope":{"resource_allow":["resource:repo-a","resource:repo-b"],"rules":[{"capability":"repository.read","limits":{"cost_microusd":100,"cpu_millicores":100,"memory_bytes":100,"runtime_seconds":100,"tokens":100},"mode":"allow","principal_ref":"identity:alice","resource_ref":"resource:repo-a"}]},"evidence":[{"canonical_identity_digest":"sha256:1111111111111111111111111111111111111111111111111111111111111111","declared_identity_digest":"sha256:1111111111111111111111111111111111111111111111111111111111111111","evidence_digest":"sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","kind":"repository","resource_ref":"resource:repo-a"},{"canonical_identity_digest":"sha256:2222222222222222222222222222222222222222222222222222222222222222","declared_identity_digest":"sha256:2222222222222222222222222222222222222222222222222222222222222222","evidence_digest":"sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb","kind":"repository","resource_ref":"resource:repo-b"}]},"resource_changes":[{"candidate":{"canonical_identity_digest":"sha256:2222222222222222222222222222222222222222222222222222222222222222","declared_identity_digest":"sha256:2222222222222222222222222222222222222222222222222222222222222222","evidence_digest":"sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb","kind":"repository","reachable":false},"old":{"canonical_identity_digest":"sha256:2222222222222222222222222222222222222222222222222222222222222222","declared_identity_digest":"sha256:2222222222222222222222222222222222222222222222222222222222222222","evidence_digest":"sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb","kind":"repository","reachable":true},"resource_ref":"resource:repo-b"}],"rule_changes":[{"candidate":{"limits":{"cost_microusd":1,"cpu_millicores":1,"memory_bytes":1,"runtime_seconds":1,"tokens":1},"mode":"approval_required"},"capability":"repository.read","old":{"limits":{"cost_microusd":100,"cpu_millicores":100,"memory_bytes":100,"runtime_seconds":100,"tokens":100},"mode":"allow"},"principal_ref":"identity:alice","resource_ref":"resource:repo-a"}]}"#,
    );
    const EXPECTED: &str =
        "sha256:b226c2a604b26b074bea05c73699299e139bf104f7f56dc0b502819d2555d64a";
    let digest = Sha256::digest(PREIMAGE.as_bytes());
    let mut literal_commitment = String::from("sha256:");
    for byte in digest {
        write!(&mut literal_commitment, "{byte:02x}").unwrap();
    }
    assert_eq!(literal_commitment, EXPECTED);
    let old = side(
        serde_json::from_str(FIXTURE).unwrap(),
        vec![A, B],
        HeadlessComparisonRuleModeV1::Allow,
        100,
        HEADLESS_COMPARISON_SUPPORTED_ASSERTED_PROFILE_V1,
        "generation:current",
        false,
    );
    let candidate = side(
        serde_json::from_str(FIXTURE).unwrap(),
        vec![A],
        HeadlessComparisonRuleModeV1::ApprovalRequired,
        1,
        HEADLESS_COMPARISON_SUPPORTED_ASSERTED_PROFILE_V1,
        "generation:current",
        false,
    );
    let result = compare_headless_config_v1(old, candidate);
    assert_eq!(
        result.model_class(),
        HeadlessComparisonModelClassV1::Narrowing
    );
    assert_eq!(result.model_commitment(), Some(EXPECTED));
    assert_eq!(result.summary().unwrap().resource_change_count(), 1);
    assert_eq!(result.summary().unwrap().rule_change_count(), 1);
}

#[test]
fn asserted_context_field_mutations_change_commitment_or_fail_closed() {
    let generation = (
        "generation:current",
        "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    );
    let floor = (
        "floor.v1",
        "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    );
    let changed_digest = "sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd";
    let build = |generation, floor, epoch| {
        HeadlessComparisonContextV1::new(
            "installation:example",
            generation,
            floor,
            false,
            epoch,
            HEADLESS_COMPARISON_SUPPORTED_ASSERTED_PROFILE_V1,
        )
    };
    let compare = |context: HeadlessComparisonContextV1| {
        let side = || {
            HeadlessComparisonSideV1::new(
                declaration(&serde_json::from_str(FIXTURE).unwrap()),
                envelope(vec![A, B], HeadlessComparisonRuleModeV1::Allow, 100),
                evidence(true, false),
                context.clone(),
            )
        };
        compare_headless_config_v1(side(), side())
    };
    let baseline = compare(build(generation, floor, 0));
    for changed in [
        build(("generation:other", generation.1), floor, 0),
        build((generation.0, changed_digest), floor, 0),
        build(generation, ("floor.v2", floor.1), 0),
        build(generation, (floor.0, changed_digest), 0),
        build(generation, floor, 1),
    ] {
        let result = compare(changed);
        assert_eq!(result.model_class(), HeadlessComparisonModelClassV1::Equal);
        assert_ne!(result.model_commitment(), baseline.model_commitment());
    }
}

fn mutated_document(field: &str, fixture: &Value) -> Value {
    let mut document = fixture.clone();
    match field {
        "declaration" => {
            let mut layer = document["layers"][0].clone();
            layer["stage"] = json!("operator");
            layer["layer_ref"] = json!("layer:operator");
            document["layers"].as_array_mut().unwrap().push(layer);
        }
        "principal_ref" => {
            document["layers"][0]["action_rules"][0][field] = json!("identity:bob");
        }
        "resource_ref" => {
            document["resources"][0][field] = json!("resource:repo-a2");
            document["layers"][0]["resource_allow"][0] = json!("resource:repo-a2");
            document["layers"][0]["action_rules"][0][field] = json!("resource:repo-a2");
        }
        "capability" => document["layers"][0]["action_rules"][0][field] = json!("context.read"),
        "kind" => document["resources"][0][field] = json!("service"),
        "identity" => document["resources"][0]["identity_digest"] = json!(DIGEST_B),
        _ => {}
    }
    document
}

fn mutated_rule(field: &str, document: &Value) -> HeadlessComparisonRuleV1 {
    let mut rule = document["layers"][0]["action_rules"][0].clone();
    match field {
        "mode" => rule[field] = json!("approval_required"),
        "tokens" | "runtime_seconds" | "cost_microusd" | "cpu_millicores" | "memory_bytes" => {
            rule["limits"][field] = json!(99);
        }
        _ => {}
    }
    let budgets = &rule["limits"];
    HeadlessComparisonRuleV1::new(
        rule["principal_ref"].as_str().unwrap(),
        rule["resource_ref"].as_str().unwrap(),
        rule["capability"].as_str().unwrap(),
        if field == "mode" {
            HeadlessComparisonRuleModeV1::ApprovalRequired
        } else {
            HeadlessComparisonRuleModeV1::Allow
        },
        HeadlessComparisonLimitsV1::new(
            budgets["tokens"].as_u64().unwrap(),
            budgets["runtime_seconds"].as_u64().unwrap(),
            budgets["cost_microusd"].as_u64().unwrap(),
            budgets["cpu_millicores"].as_u64().unwrap(),
            budgets["memory_bytes"].as_u64().unwrap(),
        )
        .unwrap(),
    )
}

fn mutated_evidence(field: &str, document: &Value) -> Vec<HeadlessComparisonEvidenceV1> {
    document["resources"]
        .as_array()
        .unwrap()
        .iter()
        .enumerate()
        .map(|(index, resource)| {
            let original_kind = if resource["kind"] == "service" {
                HeadlessComparisonResourceKindV1::Service
            } else {
                HeadlessComparisonResourceKindV1::Repository
            };
            let first = index == 0;
            let identity = resource["identity_digest"].as_str().unwrap();
            HeadlessComparisonEvidenceV1::new(
                if first && field == "evidence_resource_ref" {
                    "resource:repo-unknown"
                } else {
                    resource["resource_ref"].as_str().unwrap()
                },
                if first && field == "evidence_kind" {
                    HeadlessComparisonResourceKindV1::Service
                } else {
                    original_kind
                },
                if first && field == "declared_identity_digest" {
                    DIGEST_B
                } else {
                    identity
                },
                if first && field == "canonical_identity_digest" {
                    DIGEST_B
                } else {
                    identity
                },
                if first && field == "evidence_digest" {
                    DIGEST_B
                } else if first {
                    "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
                } else {
                    "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
                },
            )
        })
        .collect()
}

fn mutated_assertion(field: &str, fixture: &Value) -> HeadlessComparisonSideV1 {
    let document = mutated_document(field, fixture);
    let resources = if field == "membership" {
        vec![A.to_owned()]
    } else {
        document["layers"][0]["resource_allow"]
            .as_array()
            .unwrap()
            .iter()
            .map(|reference| reference.as_str().unwrap().to_owned())
            .collect()
    };
    HeadlessComparisonSideV1::new(
        declaration(&document),
        HeadlessComparisonEffectiveEnvelopeV1::new(resources, vec![mutated_rule(field, &document)]),
        mutated_evidence(field, &document),
        context(
            HEADLESS_COMPARISON_SUPPORTED_ASSERTED_PROFILE_V1,
            "generation:current",
            false,
        ),
    )
}

#[test]
fn each_side_field_mutation_changes_commitment_or_is_unverifiable() {
    let fixture: Value = serde_json::from_str(FIXTURE).unwrap();
    let baseline_side = || {
        side(
            fixture.clone(),
            vec![A, B],
            HeadlessComparisonRuleModeV1::Allow,
            100,
            HEADLESS_COMPARISON_SUPPORTED_ASSERTED_PROFILE_V1,
            "generation:current",
            false,
        )
    };
    let baseline = compare_headless_config_v1(baseline_side(), baseline_side());
    let baseline_commitment = baseline.model_commitment().unwrap();
    let wider = HeadlessComparisonModelClassV1::WideningOrMixed;
    let narrower = HeadlessComparisonModelClassV1::Narrowing;
    let equal = HeadlessComparisonModelClassV1::Equal;
    let invalid = HeadlessComparisonModelClassV1::Unverifiable;
    for (field, expected) in [
        ("declaration", equal),
        ("membership", narrower),
        ("principal_ref", wider),
        ("resource_ref", wider),
        ("capability", wider),
        ("mode", narrower),
        ("tokens", narrower),
        ("runtime_seconds", narrower),
        ("cost_microusd", narrower),
        ("cpu_millicores", narrower),
        ("memory_bytes", narrower),
        ("kind", wider),
        ("identity", wider),
        ("evidence_digest", equal),
        ("evidence_resource_ref", invalid),
        ("evidence_kind", invalid),
        ("declared_identity_digest", invalid),
        ("canonical_identity_digest", invalid),
    ] {
        let candidate = mutated_assertion(field, &fixture);
        // Exercise each mutation on either side, not only the candidate side.
        for (old, candidate, expected_class) in [
            (baseline_side(), candidate.clone(), expected),
            (
                candidate,
                baseline_side(),
                if expected == narrower {
                    wider
                } else {
                    expected
                },
            ),
        ] {
            let result = compare_headless_config_v1(old, candidate);
            assert_eq!(result.model_class(), expected_class, "field {field}");
            if expected == invalid {
                assert!(result.model_commitment().is_none(), "field {field}");
                assert!(result.summary().is_none(), "field {field}");
            } else {
                assert_ne!(
                    result.model_commitment(),
                    Some(baseline_commitment),
                    "field {field}"
                );
            }
        }
    }
}

#[test]
fn malformed_and_unmatched_assertions_expose_no_partial_result() {
    let fixture: Value = serde_json::from_str(FIXTURE).unwrap();
    let baseline = || {
        side(
            fixture.clone(),
            vec![A, B],
            HeadlessComparisonRuleModeV1::Allow,
            100,
            HEADLESS_COMPARISON_SUPPORTED_ASSERTED_PROFILE_V1,
            "generation:current",
            false,
        )
    };
    let default_context = context(
        HEADLESS_COMPARISON_SUPPORTED_ASSERTED_PROFILE_V1,
        "generation:current",
        false,
    );
    let rule = |principal, capability, mode, budget| {
        HeadlessComparisonRuleV1::new(principal, A, capability, mode, limits(budget))
    };
    let allow = HeadlessComparisonRuleModeV1::Allow;
    let deny = HeadlessComparisonRuleModeV1::Deny;
    let regular = rule("identity:alice", "repository.read", allow, 100);
    let envelopes = [
        HeadlessComparisonEffectiveEnvelopeV1::new(
            vec![A.into(), B.into()],
            vec![rule("identity:alice", "unknown.read", deny, 0)],
        ),
        HeadlessComparisonEffectiveEnvelopeV1::new(
            vec![A.into(), B.into()],
            vec![rule("identity:alice", "ssh", deny, 0)],
        ),
        HeadlessComparisonEffectiveEnvelopeV1::new(
            vec![A.into(), B.into()],
            vec![rule("identity:alice", "repository.read", deny, 1)],
        ),
        HeadlessComparisonEffectiveEnvelopeV1::new(vec![], vec![regular.clone()]),
        HeadlessComparisonEffectiveEnvelopeV1::new(
            vec![A.into(), B.into()],
            vec![rule("identity:alice", "repository.read", allow, 101)],
        ),
        HeadlessComparisonEffectiveEnvelopeV1::new(
            vec![A.into(), B.into()],
            vec![rule("alice", "repository.read", deny, 0)],
        ),
        HeadlessComparisonEffectiveEnvelopeV1::new(vec![B.into(), A.into()], vec![regular.clone()]),
        HeadlessComparisonEffectiveEnvelopeV1::new(vec![A.into(), A.into()], vec![regular.clone()]),
        HeadlessComparisonEffectiveEnvelopeV1::new(
            vec![A.into(), B.into()],
            vec![regular.clone(), regular],
        ),
    ];
    for supplied in envelopes {
        let candidate = HeadlessComparisonSideV1::new(
            declaration(&fixture),
            supplied,
            evidence(true, false),
            default_context.clone(),
        );
        assert_fixed_unverifiable(&compare_headless_config_v1(baseline(), candidate));
    }
    for supplied in [
        vec![
            evidence(true, false)[0].clone(),
            evidence(true, false)[0].clone(),
        ],
        vec![evidence(true, false)[0].clone(); 129],
    ] {
        let candidate = HeadlessComparisonSideV1::new(
            declaration(&fixture),
            envelope(vec![A, B], allow, 100),
            supplied,
            default_context.clone(),
        );
        assert_fixed_unverifiable(&compare_headless_config_v1(baseline(), candidate));
    }
    let mut narrowed = fixture.clone();
    let mut layer = narrowed["layers"][0].clone();
    layer["layer_ref"] = json!("layer:operator");
    layer["stage"] = json!("operator");
    layer["resource_allow"] = json!([A]);
    narrowed["layers"].as_array_mut().unwrap().push(layer);
    let unmatched = HeadlessComparisonSideV1::new(
        declaration(&narrowed),
        envelope(vec![A, B], allow, 100),
        evidence(true, false),
        default_context,
    );
    assert_fixed_unverifiable(&compare_headless_config_v1(baseline(), unmatched));
}

fn assert_fixed_unverifiable(result: &super::HeadlessComparisonResultV1) {
    assert_eq!(
        result.model_class(),
        HeadlessComparisonModelClassV1::Unverifiable
    );
    assert!(result.summary().is_none());
    assert!(result.model_commitment().is_none());
    let diagnostic = result.redacted_diagnostic();
    assert_eq!(diagnostic["authority_comparison"], "unverifiable");
    for marker in [
        "identity_verified",
        "activation_available",
        "grants_action_authority",
    ] {
        assert_eq!(diagnostic[marker], false);
    }
}

#[test]
fn safe_integer_bounds_and_nested_debug_are_redacted() {
    const MAX: u64 = 9_007_199_254_740_991;
    for index in 0..5 {
        let mut values = [0; 5];
        values[index] = MAX;
        assert!(
            HeadlessComparisonLimitsV1::new(values[0], values[1], values[2], values[3], values[4])
                .is_ok()
        );
        values[index] += 1;
        let error =
            HeadlessComparisonLimitsV1::new(values[0], values[1], values[2], values[3], values[4])
                .unwrap_err();
        assert_eq!(
            error.to_string(),
            "headless_config.comparison.invalid_input"
        );
        assert_eq!(format!("{error:?}"), "InvalidInput");
    }
    let fixture: Value = serde_json::from_str(FIXTURE).unwrap();
    let old = side(
        fixture.clone(),
        vec![A, B],
        HeadlessComparisonRuleModeV1::Allow,
        100,
        HEADLESS_COMPARISON_SUPPORTED_ASSERTED_PROFILE_V1,
        "generation:current",
        false,
    );
    let candidate = mutated_assertion("kind", &fixture);
    let input_debug = format!(
        "{old:?} {candidate:?} {:?} {:?} {:?}",
        evidence(true, false),
        context(
            HEADLESS_COMPARISON_SUPPORTED_ASSERTED_PROFILE_V1,
            "generation:current",
            false
        ),
        envelope(vec![A, B], HeadlessComparisonRuleModeV1::Allow, 100)
    );
    let result = compare_headless_config_v1(old, candidate);
    let summary = result.summary().unwrap();
    let output_debug = format!(
        "{result:?} {summary:?} {:?} {:?} {:?} {:?}",
        summary.resource_changes(),
        summary.resource_changes()[0].old(),
        summary.resource_changes()[0].candidate(),
        summary.rule_changes()
    );
    for text in [
        input_debug,
        output_debug,
        result.redacted_diagnostic().to_string(),
    ] {
        for forbidden in [
            A,
            B,
            "identity:alice",
            "installation:example",
            "generation:current",
            DIGEST_A,
            DIGEST_B,
        ] {
            assert!(!text.contains(forbidden), "diagnostic leaked a bound input");
        }
    }
    let invalid_epoch = HeadlessComparisonContextV1::new(
        "installation:example",
        ("generation:current", DIGEST_A),
        ("floor.v1", DIGEST_B),
        false,
        MAX + 1,
        HEADLESS_COMPARISON_SUPPORTED_ASSERTED_PROFILE_V1,
    );
    let invalid_side = || {
        HeadlessComparisonSideV1::new(
            declaration(&fixture),
            envelope(vec![A, B], HeadlessComparisonRuleModeV1::Allow, 100),
            evidence(true, false),
            invalid_epoch.clone(),
        )
    };
    assert_fixed_unverifiable(&compare_headless_config_v1(invalid_side(), invalid_side()));
}
