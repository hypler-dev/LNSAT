use super::{
    ComposedHeadlessConfigV1, HeadlessConfigErrorV1, compose_headless_config_declaration_v1,
    parse_headless_config_declaration_v1,
};
use serde_json::{Value, json};

const FIXTURE: &str =
    include_str!("../../../../fixtures/contracts/headless-config-declaration-v1.json");
const PRINCIPAL: &str = "identity:alice";
const RESOURCE: &str = "resource:repo-a";
const CAPABILITY: &str = "repository.read";

fn document() -> Value {
    serde_json::from_str(FIXTURE).expect("fixture JSON")
}

fn compose(value: &Value) -> Result<ComposedHeadlessConfigV1, HeadlessConfigErrorV1> {
    let parsed = parse_headless_config_declaration_v1(&serde_json::to_vec(value).unwrap())?;
    compose_headless_config_declaration_v1(&parsed)
}

fn add_layer(value: &mut Value, stage: &str) {
    let mut layer = value["layers"].as_array().unwrap().last().unwrap().clone();
    layer["stage"] = json!(stage);
    layer["layer_ref"] = json!(format!("layer:{stage}"));
    value["layers"].as_array_mut().unwrap().push(layer);
}

fn zero_limits(rule: &mut Value) {
    for value in rule["limits"].as_object_mut().unwrap().values_mut() {
        *value = json!(0);
    }
}

#[test]
fn baseline_is_declaration_only_with_default_denial() {
    let composed = compose(&document()).unwrap();
    assert!(composed.resource_declared(RESOURCE));
    assert_eq!(
        composed.declared_mode(PRINCIPAL, RESOURCE, CAPABILITY),
        "allow"
    );
    for (principal, resource, capability) in [
        ("identity:bob", RESOURCE, CAPABILITY),
        (PRINCIPAL, "resource:repo-b", CAPABILITY),
        (PRINCIPAL, RESOURCE, "deploy.execute"),
    ] {
        assert_eq!(
            composed.declared_mode(principal, resource, capability),
            "deny"
        );
        assert_eq!(
            composed
                .declared_limits(principal, resource, capability)
                .tokens,
            0
        );
    }
    let diagnostic = composed.redacted_diagnostic();
    assert_eq!(diagnostic["scope"], "declared_ceiling_only");
    for key in [
        "identity_verified",
        "activation_available",
        "grants_action_authority",
    ] {
        assert_eq!(diagnostic[key], false);
    }
    assert_eq!(diagnostic["side_effects"], json!([]));
}

#[test]
fn ordered_narrowing_preserves_stronger_approval_and_tighter_limits() {
    let mut value = document();
    add_layer(&mut value, "operator");
    value["layers"][1]["resource_allow"] = json!([RESOURCE]);
    let rule = &mut value["layers"][1]["action_rules"][0];
    rule["mode"] = json!("approval_required");
    for limit in rule["limits"].as_object_mut().unwrap().values_mut() {
        *limit = json!(1);
    }
    let composed = compose(&value).unwrap();
    assert!(!composed.resource_declared("resource:repo-b"));
    assert_eq!(
        composed.declared_mode(PRINCIPAL, RESOURCE, CAPABILITY),
        "approval_required"
    );
    let limits = composed.declared_limits(PRINCIPAL, RESOURCE, CAPABILITY);
    assert_eq!(
        (
            limits.tokens,
            limits.runtime_seconds,
            limits.cost_microusd,
            limits.cpu_millicores,
            limits.memory_bytes
        ),
        (1, 1, 1, 1, 1)
    );
}

#[test]
fn every_budget_dimension_rejects_widening() {
    for field in [
        "tokens",
        "runtime_seconds",
        "cost_microusd",
        "cpu_millicores",
        "memory_bytes",
    ] {
        let mut value = document();
        add_layer(&mut value, "operator");
        value["layers"][1]["action_rules"][0]["limits"][field] = json!(101);
        assert!(
            matches!(
                compose(&value),
                Err(HeadlessConfigErrorV1::InvalidComposition)
            ),
            "{field}"
        );
    }
}

#[test]
fn tuple_substitution_cannot_create_a_new_grant() {
    for (field, replacement) in [
        ("principal_ref", "identity:bob"),
        ("resource_ref", "resource:repo-b"),
        ("capability", "context.read"),
    ] {
        let mut value = document();
        add_layer(&mut value, "operator");
        value["layers"][1]["action_rules"][0][field] = json!(replacement);
        assert!(
            matches!(
                compose(&value),
                Err(HeadlessConfigErrorV1::InvalidComposition)
            ),
            "{field}"
        );
    }
}

#[test]
fn omitted_and_explicit_denials_persist_after_resource_removal() {
    for explicit in [false, true] {
        let mut value = document();
        if explicit {
            value["layers"][0]["action_rules"][0]["mode"] = json!("deny");
            zero_limits(&mut value["layers"][0]["action_rules"][0]);
        }
        add_layer(&mut value, "operator");
        value["layers"][1]["resource_allow"] = json!([]);
        value["layers"][1]["action_rules"] = json!([]);
        let composed = compose(&value).unwrap();
        assert!(!composed.resource_declared(RESOURCE));
        assert_eq!(
            composed.declared_mode(PRINCIPAL, RESOURCE, CAPABILITY),
            "deny"
        );
        assert_eq!(
            composed
                .declared_limits(PRINCIPAL, RESOURCE, CAPABILITY)
                .memory_bytes,
            0
        );
        assert_eq!(composed.redacted_diagnostic()["declared_denial_count"], 1);
    }
}

#[test]
fn omitted_action_cannot_return_in_later_layer() {
    let mut value = document();
    add_layer(&mut value, "operator");
    value["layers"][1]["action_rules"] = json!([]);
    add_layer(&mut value, "request");
    value["layers"][2]["action_rules"] = value["layers"][0]["action_rules"].clone();
    assert!(matches!(
        compose(&value),
        Err(HeadlessConfigErrorV1::InvalidComposition)
    ));
}

#[test]
fn removed_resource_cannot_return_even_without_action_rules() {
    let mut value = document();
    add_layer(&mut value, "operator");
    value["layers"][1]["resource_allow"] = json!([RESOURCE]);
    add_layer(&mut value, "request");
    value["layers"][2]["resource_allow"] = value["layers"][0]["resource_allow"].clone();
    value["layers"][2]["action_rules"] = json!([]);
    assert!(matches!(
        compose(&value),
        Err(HeadlessConfigErrorV1::InvalidComposition)
    ));
}

#[test]
fn mode_lattice_all_pairs_match_monotonic_rule() {
    let modes = ["deny", "approval_required", "allow"];
    for (parent_index, parent) in modes.iter().enumerate() {
        for (child_index, child) in modes.iter().enumerate() {
            let mut value = document();
            value["layers"][0]["action_rules"][0]["mode"] = json!(parent);
            zero_limits(&mut value["layers"][0]["action_rules"][0]);
            add_layer(&mut value, "operator");
            value["layers"][1]["action_rules"][0]["mode"] = json!(child);
            let result = compose(&value);
            assert_eq!(
                result.is_ok(),
                child_index <= parent_index,
                "{parent} -> {child}"
            );
        }
    }
}

#[test]
fn new_denial_is_retained_when_later_omitted() {
    let mut value = document();
    add_layer(&mut value, "operator");
    let mut denial = value["layers"][0]["action_rules"][0].clone();
    denial["principal_ref"] = json!("identity:bob");
    denial["mode"] = json!("deny");
    zero_limits(&mut denial);
    value["layers"][1]["action_rules"]
        .as_array_mut()
        .unwrap()
        .push(denial);
    add_layer(&mut value, "request");
    value["layers"][2]["action_rules"]
        .as_array_mut()
        .unwrap()
        .pop();
    let composed = compose(&value).unwrap();
    assert_eq!(
        composed.declared_mode("identity:bob", RESOURCE, CAPABILITY),
        "deny"
    );
    assert_eq!(composed.redacted_diagnostic()["declared_denial_count"], 1);
}

#[test]
fn canonical_digest_matches_independent_ascii_known_answer() {
    let value = document();
    let composed = compose(&value).unwrap();
    // Python hashlib over schema + LF + json.dumps(sort_keys=True,separators=(',',':')).
    assert_eq!(
        composed.declaration_digest(),
        "sha256:c444cd51472235d8fc9ae22b62121853d0687af02237737f540d830a31518f53"
    );
    let reordered = format!(
        "{{\"resources\":{},\"installation_ref\":{},\"schema_id\":{},\"layers\":{},\"contract_version\":{}}}",
        value["resources"], value["installation_ref"], value["schema_id"], value["layers"], value["contract_version"]
    ).replace("identity:alice", "identity:\\u0061lice");
    let parsed = parse_headless_config_declaration_v1(reordered.as_bytes()).unwrap();
    assert_eq!(
        compose_headless_config_declaration_v1(&parsed)
            .unwrap()
            .declaration_digest(),
        composed.declaration_digest()
    );
}

#[test]
fn digest_commits_installation_identity_and_layer_lineage() {
    let baseline = compose(&document())
        .unwrap()
        .declaration_digest()
        .to_owned();
    for variant in 0..4 {
        let mut value = document();
        match variant {
            0 => value["installation_ref"] = json!("installation:other"),
            1 => {
                value["resources"][0]["identity_digest"] =
                    json!(format!("sha256:{}", "3".repeat(64)));
            }
            2 => value["layers"][0]["layer_ref"] = json!("layer:other"),
            _ => add_layer(&mut value, "operator"),
        }
        assert_ne!(compose(&value).unwrap().declaration_digest(), baseline);
    }
}

#[test]
fn diagnostics_and_debug_never_expose_source_identifiers() {
    let value = document();
    let parsed = parse_headless_config_declaration_v1(FIXTURE.as_bytes()).unwrap();
    let composed = compose_headless_config_declaration_v1(&parsed).unwrap();
    let output = format!("{} {parsed:?} {composed:?}", composed.redacted_diagnostic());
    for canary in [
        value["installation_ref"].as_str().unwrap(),
        PRINCIPAL,
        RESOURCE,
        "resource:repo-b",
        "layer:project",
        value["resources"][0]["identity_digest"].as_str().unwrap(),
    ] {
        assert!(!output.contains(canary), "source canary reflected");
    }
    assert!(
        parse_headless_config_declaration_v1(
            &serde_json::to_vec(&composed.redacted_diagnostic()).unwrap()
        )
        .is_err()
    );
}
