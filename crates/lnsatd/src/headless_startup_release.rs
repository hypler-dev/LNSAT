//! Private, typed action-release representation checks.

use super::{MessageError, deserialize_object, digest_text, valid_digest};
use lnsat_contracts::parse_canonical_execution_request_v1;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use zeroize::Zeroizing;

const TOOL_DOMAIN: &[u8] = b"lnsat.git-reference-adapter.tool-arguments.v1";

#[derive(Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
pub(super) struct ExecutionRequest {
    #[serde(deserialize_with = "deserialize_object")]
    action: Action,
    #[serde(deserialize_with = "deserialize_object")]
    adapter: Adapter,
    #[serde(deserialize_with = "deserialize_object")]
    approval_decision_ref: ApprovalDecisionRef,
    #[serde(deserialize_with = "deserialize_object")]
    approval_request_ref: ApprovalRequestRef,
    approver_ref: Zeroizing<String>,
    approver_session_ref: Zeroizing<String>,
    audience: Zeroizing<String>,
    configuration_digest: Zeroizing<String>,
    contract_version: Zeroizing<String>,
    derivation_profile: Zeroizing<String>,
    executable_digest: Zeroizing<String>,
    expires_at: Zeroizing<String>,
    #[serde(deserialize_with = "deserialize_object")]
    packet_ref: PacketRef,
    #[serde(deserialize_with = "deserialize_object")]
    policy_decision_ref: PolicyDecisionRef,
    prepared_at: Zeroizing<String>,
    project_ref: Zeroizing<String>,
    requester_ref: Zeroizing<String>,
    requester_session_ref: Zeroizing<String>,
    resource_ref: Zeroizing<String>,
    schema_id: Zeroizing<String>,
    #[serde(deserialize_with = "deserialize_object")]
    target: Target,
}
#[derive(Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
struct PacketRef {
    packet_id: Zeroizing<String>,
    packet_sha256: Zeroizing<String>,
    schema_id: Zeroizing<String>,
}
#[derive(Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
struct PolicyDecisionRef {
    decision_id: Zeroizing<String>,
    schema_id: Zeroizing<String>,
}
#[derive(Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
struct ApprovalRequestRef {
    approval_request_id: Zeroizing<String>,
    schema_id: Zeroizing<String>,
}
#[derive(Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
struct ApprovalDecisionRef {
    approval_decision_id: Zeroizing<String>,
    schema_id: Zeroizing<String>,
}
#[derive(Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
struct Action {
    #[serde(deserialize_with = "deserialize_object")]
    arguments: Arguments,
    kind: Zeroizing<String>,
}
#[derive(Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
struct Arguments {
    allowed_paths: Vec<Zeroizing<String>>,
    base_commit_oid: Zeroizing<String>,
    #[serde(deserialize_with = "deserialize_object")]
    commit_metadata: CommitMetadata,
    expected_tree_oid: Zeroizing<String>,
    head_ref: Zeroizing<String>,
    patch: Zeroizing<String>,
    patch_sha256: Zeroizing<String>,
    schema_id: Zeroizing<String>,
}
#[derive(Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
struct CommitMetadata {
    author_email: Zeroizing<String>,
    author_name: Zeroizing<String>,
    author_time: Zeroizing<String>,
    committer_email: Zeroizing<String>,
    committer_name: Zeroizing<String>,
    committer_time: Zeroizing<String>,
    message: Zeroizing<String>,
}
#[derive(Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
struct Adapter {
    r#ref: Zeroizing<String>,
    version: Zeroizing<String>,
}
#[derive(Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
struct Target {
    #[serde(deserialize_with = "deserialize_object")]
    identity: TargetIdentity,
    resource_ref: Zeroizing<String>,
}
#[derive(Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
struct TargetIdentity {
    base_commit_oid: Zeroizing<String>,
    fixture_marker_sha256: Zeroizing<String>,
    git_dir_path: Zeroizing<String>,
    head_ref: Zeroizing<String>,
    object_format: Zeroizing<String>,
    repository_path: Zeroizing<String>,
    schema_id: Zeroizing<String>,
}

pub(super) fn valid_execution_request(
    request: &ExecutionRequest,
) -> Result<([u8; 32], [u8; 32]), MessageError> {
    let mut canonical = Zeroizing::new(Vec::new());
    serde_json::to_writer(&mut *canonical, request).map_err(|_| MessageError::Canonical)?;
    let text = core::str::from_utf8(&canonical).map_err(|_| MessageError::Canonical)?;
    let derived = parse_canonical_execution_request_v1(text).map_err(|_| MessageError::Payload)?;
    let target = derived.target_digest;
    drop(derived);
    if !valid_request(request) {
        return Err(MessageError::Payload);
    }
    let patch = sha256_text(&request.action.arguments.patch);
    if digest_text(&patch).as_str() != request.action.arguments.patch_sha256.as_str() {
        return Err(MessageError::Binding);
    }
    Ok((target, tool_digest(request)?))
}

fn valid_request(r: &ExecutionRequest) -> bool {
    r.action.kind.as_str() == "git.commit"
        && r.adapter.r#ref.as_str() == "adapter:docker-local:git-commit"
        && r.adapter.version.as_str() == "v2"
        && r.audience.as_str() == "audience:gateway:local"
        && references_within_limit(r)
        && r.target.resource_ref == r.resource_ref
        && r.target.identity.head_ref == r.action.arguments.head_ref
        && r.target.identity.base_commit_oid == r.action.arguments.base_commit_oid
        && valid_arguments(&r.action.arguments)
        && valid_identity(&r.target.identity)
}
fn references_within_limit(r: &ExecutionRequest) -> bool {
    [
        &r.packet_ref.packet_id,
        &r.packet_ref.packet_sha256,
        &r.policy_decision_ref.decision_id,
        &r.approval_request_ref.approval_request_id,
        &r.approval_decision_ref.approval_decision_id,
        &r.approver_ref,
        &r.approver_session_ref,
        &r.audience,
        &r.project_ref,
        &r.requester_ref,
        &r.requester_session_ref,
        &r.resource_ref,
        &r.target.resource_ref,
    ]
    .iter()
    .all(|value| value.len() <= 256)
}
fn valid_arguments(v: &Arguments) -> bool {
    v.schema_id.as_str() == "lnsat.git_commit_action.schema.v1"
        && oid(&v.base_commit_oid)
        && oid(&v.expected_tree_oid)
        && valid_head(&v.head_ref)
        && valid_digest(&v.patch_sha256)
        && !v.patch.is_empty()
        && v.patch.len() <= 1_048_576
        && !v.allowed_paths.is_empty()
        && v.allowed_paths.len() <= 64
        && v.allowed_paths
            .windows(2)
            .all(|x| x[0].as_str() < x[1].as_str())
        && v.allowed_paths.iter().all(|x| valid_repo_path(x))
        && valid_metadata(&v.commit_metadata)
}
fn valid_identity(v: &TargetIdentity) -> bool {
    v.schema_id.as_str() == "lnsat.disposable_git_repository.schema.v1"
        && v.object_format.as_str() == "sha1"
        && linux_abs(&v.repository_path, 4096)
        && linux_abs(&v.git_dir_path, 4096)
        && valid_head(&v.head_ref)
        && oid(&v.base_commit_oid)
        && valid_digest(&v.fixture_marker_sha256)
}
fn valid_metadata(v: &CommitMetadata) -> bool {
    !v.message.is_empty()
        && v.message.len() <= 4096
        && v.message.ends_with('\n')
        && !v.message.contains('\0')
        && [
            &v.author_name,
            &v.author_email,
            &v.committer_name,
            &v.committer_email,
        ]
        .iter()
        .all(|x| field_text(x))
        && v.author_email.contains('@')
        && v.committer_email.contains('@')
        && [&v.author_time, &v.committer_time]
            .iter()
            .all(|x| timestamp(x))
}
fn field_text(v: &str) -> bool {
    !v.is_empty()
        && v.len() <= 256
        && !v
            .bytes()
            .any(|b| matches!(b, b'\n' | b'\r' | 0 | b'<' | b'>'))
}
fn timestamp(v: &str) -> bool {
    let Some((seconds, zone)) = v.split_once(' ') else {
        return false;
    };
    (1..=12).contains(&seconds.len())
        && seconds.bytes().all(|b| b.is_ascii_digit())
        && zone == "+0000"
}
fn oid(v: &str) -> bool {
    v.len() == 40
        && v.bytes()
            .all(|b| b.is_ascii_digit() || (b'a'..=b'f').contains(&b))
}
fn valid_head(v: &str) -> bool {
    v.starts_with("refs/heads/")
        && v.len() <= 256
        && !v.contains("..")
        && !v.ends_with(['.', '/'])
        && v.bytes()
            .all(|b| b.is_ascii_alphanumeric() || matches!(b, b'/' | b'-' | b'_' | b'.'))
}
fn valid_repo_path(v: &str) -> bool {
    v != ".lnsat-disposable-git-fixture-v1"
        && !v.starts_with('/')
        && v.len() <= 512
        && path_parts(v)
}
fn linux_abs(v: &str, max: usize) -> bool {
    v.starts_with('/') && v != "/" && v.len() <= max && path_parts(&v[1..])
}
fn path_parts(v: &str) -> bool {
    !v.contains('\\')
        && !v.ends_with('/')
        && !v.bytes().any(|b| b == 0 || b < 0x20 || b == 0x7f)
        && v.split('/')
            .all(|x| !x.is_empty() && !matches!(x, "." | ".."))
}
fn sha256_text(v: &str) -> [u8; 32] {
    Sha256::digest(v.as_bytes()).into()
}

fn tool_digest(r: &ExecutionRequest) -> Result<[u8; 32], MessageError> {
    let a = &r.action.arguments;
    let i = &r.target.identity;
    let m = &a.commit_metadata;
    let paths = Zeroizing::new(
        a.allowed_paths
            .iter()
            .map(|x| x.as_str())
            .collect::<Vec<_>>()
            .join("\0"),
    );
    digest_fields(&[
        &i.repository_path,
        &i.git_dir_path,
        &i.object_format,
        &i.head_ref,
        &i.base_commit_oid,
        &i.fixture_marker_sha256,
        &a.expected_tree_oid,
        &paths,
        &a.patch_sha256,
        &m.message,
        &m.author_name,
        &m.author_email,
        &m.author_time,
        &m.committer_name,
        &m.committer_email,
        &m.committer_time,
    ])
}
fn digest_fields(fields: &[&str]) -> Result<[u8; 32], MessageError> {
    let mut h = Sha256::new();
    h.update(TOOL_DOMAIN);
    h.update([0]);
    for field in fields {
        let len = u32::try_from(field.len()).map_err(|_| MessageError::Payload)?;
        h.update(len.to_be_bytes());
        h.update(field.as_bytes());
    }
    Ok(h.finalize().into())
}
