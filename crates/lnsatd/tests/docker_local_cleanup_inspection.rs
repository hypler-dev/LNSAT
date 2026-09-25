use lnsatd::docker_local_cleanup_inspection::{
    DockerLocalContainerInspectErrorV1, MAX_DOCKER_LOCAL_CONTAINER_INSPECT_BYTES_V1,
    parse_docker_local_container_inspect_identity_v1,
};
use serde_json::json;

fn cid() -> String {
    "a".repeat(64)
}

fn operation() -> String {
    format!("opn_{}", "b".repeat(64))
}

fn launch_digest() -> String {
    format!("sha256:{}", "c".repeat(64))
}

fn response() -> Vec<u8> {
    serde_json::to_vec(&json!({
        "Id": cid(),
        "Name": format!("/lnsat-{}", &operation()[4..36]),
        "Image": format!("sha256:{}", "d".repeat(64)),
        "Config": {
            "Labels": {
                "lnsat.operation_id": operation(),
                "lnsat.launch_contract_sha256": launch_digest(),
                "unrelated": "allowed"
            },
            "OtherDockerField": true
        },
        "State": { "Running": false }
    }))
    .expect("fixture")
}

fn parse(
    bytes: &[u8],
) -> Result<
    lnsatd::docker_local_cleanup_inspection::DockerLocalContainerInspectIdentityV1,
    DockerLocalContainerInspectErrorV1,
> {
    parse_docker_local_container_inspect_identity_v1(bytes, &cid(), &operation(), &launch_digest())
}

#[test]
fn exact_response_is_only_a_syntactic_observation() {
    let parsed = parse(&response()).expect("matching response");
    assert_eq!(parsed.container_id, cid());
    assert_eq!(
        parsed.container_name,
        format!("/lnsat-{}", &operation()[4..36])
    );
    assert_eq!(parsed.local_image_id, format!("sha256:{}", "d".repeat(64)));
    assert_eq!(parsed.operation_id, operation());
    assert_eq!(parsed.launch_contract_digest, launch_digest());
}

#[test]
fn rejects_wrong_or_missing_private_identity() {
    let mut value: serde_json::Value = serde_json::from_slice(&response()).expect("fixture");
    for (path, replacement) in [
        (vec!["Id"], json!("e".repeat(64))),
        (vec!["Name"], json!("/lnsat-other")),
        (vec!["Image"], json!("missing")),
        (
            vec!["Config", "Labels", "lnsat.operation_id"],
            json!("other"),
        ),
        (
            vec!["Config", "Labels", "lnsat.launch_contract_sha256"],
            json!("other"),
        ),
    ] {
        let mut changed = value.clone();
        let mut slot = &mut changed;
        for component in path {
            slot = &mut slot[component];
        }
        *slot = replacement;
        assert_eq!(
            parse(&serde_json::to_vec(&changed).expect("changed fixture")),
            Err(DockerLocalContainerInspectErrorV1::Invalid)
        );
    }
    value["Config"]["Labels"] = json!({});
    assert_eq!(
        parse(&serde_json::to_vec(&value).expect("changed fixture")),
        Err(DockerLocalContainerInspectErrorV1::Invalid)
    );
    value = serde_json::from_slice(&response()).expect("fixture");
    value.as_object_mut().expect("object").remove("Name");
    assert_eq!(
        parse(&serde_json::to_vec(&value).expect("changed fixture")),
        Err(DockerLocalContainerInspectErrorV1::Invalid)
    );
}

#[test]
fn rejects_ambiguous_and_unbounded_json() {
    let duplicate_id = format!(
        r#"{{"Id":"{}","Id":"{}","Name":"/lnsat-{}","Image":"sha256:{}","Config":{{"Labels":{{"lnsat.operation_id":"{}","lnsat.launch_contract_sha256":"{}"}}}}}}"#,
        cid(),
        cid(),
        &operation()[4..36],
        "d".repeat(64),
        operation(),
        launch_digest()
    );
    let duplicate_label = format!(
        r#"{{"Id":"{}","Name":"/lnsat-{}","Image":"sha256:{}","Config":{{"Labels":{{"lnsat.operation_id":"{}","lnsat.operation_id":"{}","lnsat.launch_contract_sha256":"{}"}}}}}}"#,
        cid(),
        &operation()[4..36],
        "d".repeat(64),
        operation(),
        operation(),
        launch_digest()
    );
    let duplicate_name = String::from_utf8(response()).expect("fixture").replacen(
        "\"Name\":",
        "\"Name\":\"/lnsat-other\",\"Name\":",
        1,
    );
    for bytes in [
        b"[]".as_slice(),
        b"null",
        b"{bad",
        duplicate_id.as_bytes(),
        duplicate_label.as_bytes(),
        duplicate_name.as_bytes(),
        &vec![b' '; MAX_DOCKER_LOCAL_CONTAINER_INSPECT_BYTES_V1 + 1],
    ] {
        assert_eq!(
            parse(bytes),
            Err(DockerLocalContainerInspectErrorV1::Invalid)
        );
    }
}

#[test]
fn rejects_invalid_expectations() {
    let bytes = response();
    for (container, operation, digest) in [
        ("A".repeat(64), operation(), launch_digest()),
        (cid(), format!("opn_{}", "B".repeat(64)), launch_digest()),
        (cid(), operation(), format!("sha256:{}", "C".repeat(64))),
        (cid(), operation(), String::new()),
    ] {
        assert_eq!(
            parse_docker_local_container_inspect_identity_v1(
                &bytes, &container, &operation, &digest
            ),
            Err(DockerLocalContainerInspectErrorV1::Invalid)
        );
    }
}
