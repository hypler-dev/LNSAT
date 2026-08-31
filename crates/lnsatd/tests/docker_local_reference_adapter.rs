#![cfg(unix)]

use lnsat_contracts::{
    CONTRACT_VERSION_V1_0, DerivedExecutionRequestV1, EXECUTION_PROPOSAL_SCHEMA_V1_0,
    EXECUTION_REQUEST_DERIVATION_PROFILE_V1, ExecutionRequestV1Input, PacketBudgetV1,
    PacketEnvelopeV1, derive_execution_request_v1, hash_packet_envelope_v1,
};
use lnsat_store::{
    PHASE7_GIT_FIXTURE_MARKER_V1, Phase7GitCommitMetadataV1, Phase7GitExecutionResultV1,
    inspect_phase7_disposable_git_repository_v1,
};
use lnsatd::adapter_process_protocol::{
    DockerLocalAdapterProcessRequestInputV1, validate_docker_local_adapter_process_exchange_v1,
};
use lnsatd::docker_local_execution_payload::{
    DockerLocalExecutionPayloadRequestFrameV1, build_docker_local_execution_payload_request_v1,
};
use lnsatd::docker_local_supervisor::docker_local_supervised_git_result_digest_v1;
use lnsatd::runtime_profile::{
    DOCKER_LOCAL_ADAPTER_REF_V1, DOCKER_LOCAL_ADAPTER_VERSION_V1, DOCKER_LOCAL_AUDIENCE_V1,
    LoadedDockerLocalRuntimeProfileV1, parse_docker_local_runtime_profile_v1,
};
use serde_json::{Value, json};
use sha2::{Digest, Sha256};
use std::fs::{self, OpenOptions};
use std::io::Write as _;
use std::os::unix::fs::OpenOptionsExt as _;
use std::path::{Path, PathBuf};
use std::process::{Command, Output, Stdio};
use std::time::Duration;

const PROFILE_FIXTURE: &[u8] =
    include_bytes!("../../../fixtures/contracts/phase11-docker-local-profile-v1.json");
const ADAPTER_FIXTURE: &str =
    include_str!("../../../fixtures/contracts/phase11-docker-local-reference-adapter-v1.json");
const ADAPTER_EXECUTABLE: &str = env!("CARGO_BIN_EXE_lnsat-git-reference");
const GIT_EXECUTABLE: &str = "/usr/bin/git";

#[test]
fn reference_adapter_fixture_locks_source_only_boundary() {
    let fixture: Value = serde_json::from_str(ADAPTER_FIXTURE).expect("fixture JSON");
    assert_eq!(fixture["packet_id"], "P11-D4C1");
    assert_eq!(fixture["phase11_complete"], false);
    assert_eq!(fixture["production_supported"], false);
    assert_eq!(fixture["real_docker_proof"], false);
    assert_eq!(
        fixture["adapter_boundary"]["arguments"],
        json!(["--repository", "profile_bound_target_mount_path"])
    );
    assert_eq!(
        fixture["source_proof"]["real_docker_binary_daemon_or_socket"],
        false
    );
    assert!(
        fixture["hard_stops"]
            .as_array()
            .expect("hard stops")
            .iter()
            .any(|value| value == "no_image_pull_build_run_or_publication")
    );
}

#[test]
fn reference_adapter_executes_one_mapped_consequence_and_emits_bound_result() {
    let fixture = AdapterFixture::new(PathBinding::Remapped, ExecutableBinding::Exact);
    let output = fixture.run(fixture.payload.frame(), &[]);

    assert!(output.status.success(), "adapter must succeed");
    assert!(output.stderr.is_empty(), "adapter stderr must stay empty");
    let validated = validate_docker_local_adapter_process_exchange_v1(
        fixture.payload.control(),
        &output.stdout,
        &output.stderr,
        Duration::from_millis(1),
    )
    .expect("bound adapter result");
    assert_eq!(validated.result_digest(), fixture.expected_result_digest);
    assert_eq!(
        git_text(&fixture.repository, &["rev-parse", "HEAD"]),
        fixture.expected_commit
    );
    assert_eq!(
        git_text(
            &fixture.repository,
            &[
                "rev-list",
                "--count",
                &format!("{}..HEAD", fixture.base_commit)
            ],
        ),
        "1"
    );
    assert_private_index_cleaned(&fixture.repository);
}

#[test]
fn reference_adapter_rejects_direct_approved_path_without_consequence() {
    let fixture = AdapterFixture::new(PathBinding::Direct, ExecutableBinding::Exact);
    let output = fixture.run(fixture.payload.frame(), &[]);

    assert!(!output.status.success());
    assert!(output.stdout.is_empty());
    assert!(output.stderr.is_empty());
    assert_eq!(
        git_text(&fixture.repository, &["rev-parse", "HEAD"]),
        fixture.base_commit
    );
    assert_private_index_cleaned(&fixture.repository);
}

#[test]
fn reference_adapter_rejects_malformed_input_and_extra_arguments_without_consequence() {
    let malformed = AdapterFixture::new(PathBinding::Remapped, ExecutableBinding::Exact);
    let malformed_output = malformed.run(b"{}\n", &[]);
    assert!(!malformed_output.status.success());
    assert!(malformed_output.stdout.is_empty());
    assert!(malformed_output.stderr.is_empty());
    assert_eq!(
        git_text(&malformed.repository, &["rev-parse", "HEAD"]),
        malformed.base_commit
    );

    let extra = AdapterFixture::new(PathBinding::Remapped, ExecutableBinding::Exact);
    let extra_output = extra.run(extra.payload.frame(), &["unexpected"]);
    assert!(!extra_output.status.success());
    assert!(extra_output.stdout.is_empty());
    assert!(extra_output.stderr.is_empty());
    assert_eq!(
        git_text(&extra.repository, &["rev-parse", "HEAD"]),
        extra.base_commit
    );
}

#[test]
fn reference_adapter_rejects_self_executable_digest_drift_without_consequence() {
    let fixture = AdapterFixture::new(PathBinding::Remapped, ExecutableBinding::Drifted);
    let output = fixture.run(fixture.payload.frame(), &[]);

    assert!(!output.status.success());
    assert!(output.stdout.is_empty());
    assert!(output.stderr.is_empty());
    assert_eq!(
        git_text(&fixture.repository, &["rev-parse", "HEAD"]),
        fixture.base_commit
    );
    assert_private_index_cleaned(&fixture.repository);
}

#[test]
fn reference_adapter_rejects_mapped_repository_identity_drift_without_consequence() {
    let fixture = AdapterFixture::new(PathBinding::Remapped, ExecutableBinding::Exact);
    fs::write(
        fixture.repository.join(PHASE7_GIT_FIXTURE_MARKER_V1),
        b"substituted fixture marker\n",
    )
    .expect("mutate fixture marker");
    let output = fixture.run(fixture.payload.frame(), &[]);

    assert!(!output.status.success());
    assert!(output.stdout.is_empty());
    assert!(output.stderr.is_empty());
    assert_eq!(
        git_text(&fixture.repository, &["rev-parse", "HEAD"]),
        fixture.base_commit
    );
    assert_private_index_cleaned(&fixture.repository);
}

#[derive(Clone, Copy)]
enum PathBinding {
    Remapped,
    Direct,
}

#[derive(Clone, Copy)]
enum ExecutableBinding {
    Exact,
    Drifted,
}

struct AdapterFixture {
    _root: TestDirectory,
    repository: PathBuf,
    payload: DockerLocalExecutionPayloadRequestFrameV1,
    expected_result_digest: [u8; 32],
    base_commit: String,
    expected_commit: String,
}

impl AdapterFixture {
    fn new(path_binding: PathBinding, executable_binding: ExecutableBinding) -> Self {
        let root = TestDirectory::new("reference-adapter");
        let prepared = prepare_git_fixture(root.path());
        let mut approved_identity = inspect_phase7_disposable_git_repository_v1(
            &prepared.repository,
            Path::new(GIT_EXECUTABLE),
        )
        .expect("approved identity");
        if matches!(path_binding, PathBinding::Remapped) {
            let approved_host_path = root.path().join("approved-host-repository");
            approved_identity
                .repository_path
                .clone_from(&approved_host_path);
            approved_identity.git_dir_path = approved_host_path.join(".git");
        }
        let profile = profile(executable_binding);
        let derived = derived_request(
            &profile,
            &approved_identity,
            &prepared.patch,
            &prepared.expected_tree,
            &prepared.metadata,
        );
        let operation_id = format!("opn_{}", "a".repeat(64));
        let authorization_id = format!("xau_{}", "b".repeat(64));
        let control = DockerLocalAdapterProcessRequestInputV1 {
            operation_id: &operation_id,
            authorization_id: &authorization_id,
            idempotency_key: "idempotency:p11-d4c1:fixture",
            attempt_sequence: 1,
            loaded_profile: &profile,
            derived_request: &derived,
        };
        let payload =
            build_docker_local_execution_payload_request_v1(&control).expect("execution payload");
        let semantic_result = Phase7GitExecutionResultV1 {
            commit_oid: prepared.expected_commit.clone(),
            tree_oid: prepared.expected_tree,
            changed_paths: vec!["fixture.txt".to_owned()],
            patch_sha256: prefixed_sha256(&Sha256::digest(prepared.patch.as_bytes()).into()),
            metadata: prepared.metadata,
        };
        let expected_result_digest =
            docker_local_supervised_git_result_digest_v1(&payload, &semantic_result);
        Self {
            _root: root,
            repository: prepared.repository,
            payload,
            expected_result_digest,
            base_commit: prepared.base_commit,
            expected_commit: prepared.expected_commit,
        }
    }

    fn run(&self, input: &[u8], extra_arguments: &[&str]) -> Output {
        let mut child = Command::new(ADAPTER_EXECUTABLE)
            .arg("--repository")
            .arg(&self.repository)
            .args(extra_arguments)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .expect("spawn reference adapter");
        if let Some(mut stdin) = child.stdin.take() {
            let _ = stdin.write_all(input);
        }
        child.wait_with_output().expect("adapter output")
    }
}

struct PreparedGitFixture {
    repository: PathBuf,
    base_commit: String,
    expected_commit: String,
    expected_tree: String,
    patch: String,
    metadata: Phase7GitCommitMetadataV1,
}

fn prepare_git_fixture(root: &Path) -> PreparedGitFixture {
    let repository = root.join("mounted-repository");
    fs::create_dir(&repository).expect("repository directory");
    git_status(
        &repository,
        &["init", "--quiet", "--initial-branch=main"],
        &[],
        &[],
    );
    fs::write(
        repository.join(PHASE7_GIT_FIXTURE_MARKER_V1),
        b"lnsat disposable fixture\n",
    )
    .expect("fixture marker");
    fs::write(repository.join("fixture.txt"), b"before\n").expect("base file");
    git_status(
        &repository,
        &["add", "--", PHASE7_GIT_FIXTURE_MARKER_V1, "fixture.txt"],
        &[],
        &[],
    );
    let base_tree = git_text(&repository, &["write-tree"]);
    let base_metadata = fixed_metadata("initial fixture\n");
    let base_commit = commit_tree(&repository, &base_tree, None, &base_metadata);
    git_status(
        &repository,
        &["update-ref", "refs/heads/main", &base_commit],
        &[],
        &[],
    );

    let patch = "diff --git a/fixture.txt b/fixture.txt\n--- a/fixture.txt\n+++ b/fixture.txt\n@@ -1 +1 @@\n-before\n+after\n".to_owned();
    let index_path = root.join("next-index");
    let index_env = [("GIT_INDEX_FILE", index_path.as_os_str())];
    git_status(&repository, &["read-tree", &base_commit], &[], &index_env);
    git_status(
        &repository,
        &["apply", "--cached", "--recount", "--whitespace=nowarn", "-"],
        patch.as_bytes(),
        &index_env,
    );
    let expected_tree = git_text_with_env(&repository, &["write-tree"], &[], &index_env)
        .trim()
        .to_owned();
    let metadata = fixed_metadata("bounded D4C1 fixture commit\n");
    let expected_commit = commit_tree(&repository, &expected_tree, Some(&base_commit), &metadata);
    let _ = fs::remove_file(index_path);
    PreparedGitFixture {
        repository,
        base_commit,
        expected_commit,
        expected_tree,
        patch,
        metadata,
    }
}

fn profile(binding: ExecutableBinding) -> LoadedDockerLocalRuntimeProfileV1 {
    let mut value: Value = serde_json::from_slice(PROFILE_FIXTURE).expect("profile JSON");
    value["adapter_executable_digest"] = match binding {
        ExecutableBinding::Exact => json!(file_digest(Path::new(ADAPTER_EXECUTABLE))),
        ExecutableBinding::Drifted => {
            json!(format!("sha256:{}", "c".repeat(64)))
        }
    };
    parse_docker_local_runtime_profile_v1(&serde_json::to_vec(&value).expect("profile bytes"))
        .expect("profile")
}

fn derived_request(
    profile: &LoadedDockerLocalRuntimeProfileV1,
    identity: &lnsat_store::Phase7GitRepositoryIdentityV1,
    patch: &str,
    expected_tree: &str,
    metadata: &Phase7GitCommitMetadataV1,
) -> DerivedExecutionRequestV1 {
    let patch_sha256 = prefixed_sha256(&Sha256::digest(patch.as_bytes()).into());
    let packet = PacketEnvelopeV1 {
        contract_version: CONTRACT_VERSION_V1_0.to_owned(),
        schema_id: "lnsat.packet_envelope.schema.v1_0".to_owned(),
        packet_id: format!("pkt_{}", "1".repeat(64)),
        packet_type: "ExecutionPacket".to_owned(),
        actor_ref: "identity:human:requester".to_owned(),
        session_ref: "session:local:requester".to_owned(),
        project_ref: "project:fixture".to_owned(),
        intent: "Run one source-only Docker-local reference adapter fixture".to_owned(),
        risk_level: 5,
        source_refs: vec!["source:fixture".to_owned()],
        resource_refs: vec!["resource:repository:fixture".to_owned()],
        policy_profile_ref: "policy:local:default".to_owned(),
        permission_allow: vec!["deploy.request".to_owned()],
        permission_block: Vec::new(),
        budget: PacketBudgetV1 {
            tokens: 0,
            runtime_seconds: 30,
            cost_microusd: 0,
            cpu_millicores: 1_000,
            memory_bytes: 268_435_456,
        },
        constraints: json!({
            "execution_proposal": {
                "schema_id": EXECUTION_PROPOSAL_SCHEMA_V1_0,
                "derivation_profile": EXECUTION_REQUEST_DERIVATION_PROFILE_V1,
                "action": {
                    "kind": "git.commit",
                    "arguments": {
                        "schema_id": "lnsat.git_commit_action.schema.v1",
                        "base_commit_oid": identity.base_commit_oid,
                        "head_ref": identity.head_ref,
                        "allowed_paths": ["fixture.txt"],
                        "patch_sha256": patch_sha256,
                        "patch": patch,
                        "expected_tree_oid": expected_tree,
                        "commit_metadata": {
                            "message": metadata.message,
                            "author_name": metadata.author_name,
                            "author_email": metadata.author_email,
                            "author_time": metadata.author_time,
                            "committer_name": metadata.committer_name,
                            "committer_email": metadata.committer_email,
                            "committer_time": metadata.committer_time,
                        }
                    }
                },
                "target": {
                    "resource_ref": "resource:repository:fixture",
                    "identity": {
                        "schema_id": "lnsat.disposable_git_repository.schema.v1",
                        "repository_path": identity.repository_path,
                        "git_dir_path": identity.git_dir_path,
                        "object_format": identity.object_format,
                        "head_ref": identity.head_ref,
                        "base_commit_oid": identity.base_commit_oid,
                        "fixture_marker_sha256": identity.fixture_marker_sha256,
                    }
                },
                "configuration_digest": profile.authority_configuration_digest_text(),
                "adapter": {
                    "ref": DOCKER_LOCAL_ADAPTER_REF_V1,
                    "version": DOCKER_LOCAL_ADAPTER_VERSION_V1
                },
                "executable_digest": profile.profile().adapter_executable_digest,
                "audience": DOCKER_LOCAL_AUDIENCE_V1
            }
        })
        .as_object()
        .expect("constraints")
        .clone(),
        requires_approval: true,
        idempotency_key: format!("idem_{}", "2".repeat(64)),
        created_at: "2026-08-31T07:59:00Z".to_owned(),
        expires_at: "2026-08-31T08:02:00Z".to_owned(),
    };
    let packet_sha256 = hash_packet_envelope_v1(&packet).expect("packet hash");
    derive_execution_request_v1(&ExecutionRequestV1Input {
        packet: &packet,
        packet_sha256: &packet_sha256,
        policy_decision_id: &format!("pol_{}", "3".repeat(64)),
        approval_request_id: &format!("apr_{}", "4".repeat(64)),
        approval_decision_id: &format!("apd_{}", "5".repeat(64)),
        requester_ref: "identity:human:requester",
        requester_session_ref: "session:local:requester",
        approver_ref: "identity:human:approver",
        approver_session_ref: "session:local:approver",
        prepared_at: "2026-08-31T08:00:00.000Z",
        expires_at: "2026-08-31T08:01:00Z",
    })
    .expect("execution request")
}

fn assert_private_index_cleaned(repository: &Path) {
    let entries = fs::read_dir(repository.join(".git")).expect("Git directory");
    assert!(entries.filter_map(Result::ok).all(|entry| {
        !entry
            .file_name()
            .to_string_lossy()
            .starts_with("lnsat-git-index-")
    }));
}

fn fixed_metadata(message: &str) -> Phase7GitCommitMetadataV1 {
    Phase7GitCommitMetadataV1 {
        message: message.to_owned(),
        author_name: "LNSAT Adapter".to_owned(),
        author_email: "adapter@lnsat.invalid".to_owned(),
        author_time: "1786500000 +0000".to_owned(),
        committer_name: "LNSAT Adapter".to_owned(),
        committer_email: "adapter@lnsat.invalid".to_owned(),
        committer_time: "1786500000 +0000".to_owned(),
    }
}

fn commit_tree(
    repository: &Path,
    tree: &str,
    parent: Option<&str>,
    metadata: &Phase7GitCommitMetadataV1,
) -> String {
    let mut args = vec!["commit-tree", tree];
    if let Some(parent) = parent {
        args.extend(["-p", parent]);
    }
    let env = [
        ("GIT_AUTHOR_NAME", metadata.author_name.as_os_str()),
        ("GIT_AUTHOR_EMAIL", metadata.author_email.as_os_str()),
        ("GIT_AUTHOR_DATE", metadata.author_time.as_os_str()),
        ("GIT_COMMITTER_NAME", metadata.committer_name.as_os_str()),
        ("GIT_COMMITTER_EMAIL", metadata.committer_email.as_os_str()),
        ("GIT_COMMITTER_DATE", metadata.committer_time.as_os_str()),
    ];
    git_text_with_env(repository, &args, metadata.message.as_bytes(), &env)
        .trim()
        .to_owned()
}

trait StringOsStr {
    fn as_os_str(&self) -> &std::ffi::OsStr;
}

impl StringOsStr for String {
    fn as_os_str(&self) -> &std::ffi::OsStr {
        std::ffi::OsStr::new(self)
    }
}

fn git_text(repository: &Path, args: &[&str]) -> String {
    git_text_with_env(repository, args, &[], &[])
        .trim()
        .to_owned()
}

fn git_text_with_env(
    repository: &Path,
    args: &[&str],
    stdin: &[u8],
    extra_env: &[(&str, &std::ffi::OsStr)],
) -> String {
    let output = git_output(repository, args, stdin, extra_env);
    assert!(output.status.success(), "git failed");
    String::from_utf8(output.stdout).expect("git stdout UTF-8")
}

fn git_status(
    repository: &Path,
    args: &[&str],
    stdin: &[u8],
    extra_env: &[(&str, &std::ffi::OsStr)],
) {
    let output = git_output(repository, args, stdin, extra_env);
    assert!(output.status.success(), "git {args:?} failed");
}

fn git_output(
    repository: &Path,
    args: &[&str],
    stdin: &[u8],
    extra_env: &[(&str, &std::ffi::OsStr)],
) -> Output {
    let mut command = Command::new(GIT_EXECUTABLE);
    command
        .env_clear()
        .env("GIT_CONFIG_NOSYSTEM", "1")
        .env("GIT_CONFIG_GLOBAL", "/dev/null")
        .env("GIT_TERMINAL_PROMPT", "0")
        .arg("-C")
        .arg(repository)
        .args(args)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    for (key, value) in extra_env {
        command.env(key, value);
    }
    let mut child = command.spawn().expect("spawn git");
    child
        .stdin
        .take()
        .expect("git stdin")
        .write_all(stdin)
        .expect("write git stdin");
    child.wait_with_output().expect("wait git")
}

fn file_digest(path: &Path) -> String {
    let bytes = fs::read(path).expect("read executable");
    prefixed_sha256(&Sha256::digest(bytes).into())
}

fn prefixed_sha256(digest: &[u8; 32]) -> String {
    let mut output = String::from("sha256:");
    for byte in digest {
        use std::fmt::Write as _;
        let _ = write!(output, "{byte:02x}");
    }
    output
}

struct TestDirectory {
    path: PathBuf,
}

impl TestDirectory {
    fn new(label: &str) -> Self {
        let root = fs::canonicalize(std::env::temp_dir()).expect("temporary root");
        for nonce in 0_u64..100 {
            let candidate = root.join(format!("lnsat-d4c1-{label}-{}-{nonce}", std::process::id()));
            let reservation = candidate.with_extension("reserve");
            let mut options = OpenOptions::new();
            options.write(true).create_new(true).mode(0o600);
            match options.open(&reservation) {
                Ok(_) => match fs::create_dir(&candidate) {
                    Ok(()) => {
                        let _ = fs::remove_file(reservation);
                        return Self { path: candidate };
                    }
                    Err(error) if error.kind() == std::io::ErrorKind::AlreadyExists => {
                        let _ = fs::remove_file(reservation);
                    }
                    Err(error) => panic!("fixture directory: {error}"),
                },
                Err(error) if error.kind() == std::io::ErrorKind::AlreadyExists => {}
                Err(error) => panic!("reserve fixture: {error}"),
            }
        }
        panic!("fixture namespace exhausted")
    }

    fn path(&self) -> &Path {
        &self.path
    }
}

impl Drop for TestDirectory {
    fn drop(&mut self) {
        let _ = fs::remove_dir_all(&self.path);
    }
}
