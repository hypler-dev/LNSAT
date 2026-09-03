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
    DockerLocalExecutionPayloadRequestFrameV1, MAX_DOCKER_LOCAL_EXECUTION_PAYLOAD_BYTES_V1,
    build_docker_local_execution_payload_request_v1,
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
        fixture["adapter_boundary"]["repository_argument_binding"],
        "exact_retained_p11_d4a_profile_mount_path"
    );
    assert_eq!(fixture["adapter_boundary"]["git_lazy_fetch"], "disabled");
    assert_eq!(fixture["adapter_boundary"]["git_trace2"], "disabled");
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

#[test]
fn reference_adapter_rejects_profile_mount_path_substitution_without_consequence() {
    let fixture = AdapterFixture::new(PathBinding::Remapped, ExecutableBinding::Exact);
    let alternate = fixture
        .root
        .path()
        .join("identity-equivalent-mounted-repository");
    let source = fixture.repository.to_str().expect("source path UTF-8");
    let destination = alternate.to_str().expect("destination path UTF-8");
    git_status(
        fixture.root.path(),
        &[
            "clone",
            "--quiet",
            "--no-hardlinks",
            "--",
            source,
            destination,
        ],
        &[],
        &[],
    );
    let alternate_identity =
        inspect_phase7_disposable_git_repository_v1(&alternate, Path::new(GIT_EXECUTABLE))
            .expect("alternate mapped identity");
    let original_identity =
        inspect_phase7_disposable_git_repository_v1(&fixture.repository, Path::new(GIT_EXECUTABLE))
            .expect("original mapped identity");
    assert_eq!(
        alternate_identity.object_format,
        original_identity.object_format
    );
    assert_eq!(alternate_identity.head_ref, original_identity.head_ref);
    assert_eq!(
        alternate_identity.base_commit_oid,
        original_identity.base_commit_oid
    );
    assert_eq!(
        alternate_identity.fixture_marker_sha256,
        original_identity.fixture_marker_sha256
    );

    let output = AdapterFixture::run_at(&alternate, fixture.payload.frame(), &[]);
    assert_silent_rejection(&output);
    assert_eq!(
        git_text(&alternate, &["rev-parse", "HEAD"]),
        fixture.base_commit
    );
    assert_eq!(
        git_text(&fixture.repository, &["rev-parse", "HEAD"]),
        fixture.base_commit
    );
    assert_private_index_cleaned(&alternate);
    assert_private_index_cleaned(&fixture.repository);
}

#[test]
fn reference_adapter_rejects_oversized_stdin_before_consequence() {
    let fixture = AdapterFixture::new(PathBinding::Remapped, ExecutableBinding::Exact);
    let input = vec![b'x'; MAX_DOCKER_LOCAL_EXECUTION_PAYLOAD_BYTES_V1 + 1];
    let output = fixture.run(&input, &[]);

    assert_silent_rejection(&output);
    assert_eq!(
        git_text(&fixture.repository, &["rev-parse", "HEAD"]),
        fixture.base_commit
    );
    assert_private_index_cleaned(&fixture.repository);
}

#[test]
fn reference_adapter_cleans_private_index_after_expected_tree_rejection() {
    let fixture = AdapterFixture::with_expected_tree_drift();
    let output = fixture.run(fixture.payload.frame(), &[]);

    assert_silent_rejection(&output);
    assert_eq!(
        git_text(&fixture.repository, &["rev-parse", "HEAD"]),
        fixture.base_commit
    );
    assert_private_index_cleaned(&fixture.repository);
}

#[test]
fn reference_adapter_blocks_promisor_lazy_fetch_and_repository_trace2_targets() {
    let fixture = AdapterFixture::new(PathBinding::Remapped, ExecutableBinding::Exact);
    let remote_sentinel = fixture.root.path().join("remote-invoked");
    let trace_sentinel = fixture.root.path().join("trace2.json");
    let remote_url = format!(
        "ext::/usr/bin/touch {}",
        remote_sentinel.to_str().expect("remote sentinel UTF-8")
    );
    let trace_target = trace_sentinel.to_str().expect("trace sentinel UTF-8");

    for (key, value) in [
        ("core.repositoryformatversion", "1"),
        ("extensions.partialClone", "origin"),
        ("remote.origin.promisor", "true"),
        ("remote.origin.partialclonefilter", "tree:0"),
        ("remote.origin.url", remote_url.as_str()),
        ("remote.origin.fetch", "+refs/heads/*:refs/remotes/origin/*"),
        ("protocol.ext.allow", "always"),
        ("trace2.eventTarget", trace_target),
    ] {
        git_status(&fixture.repository, &["config", key, value], &[], &[]);
    }
    let _ = fs::remove_file(&trace_sentinel);

    let tree_oid = git_text(&fixture.repository, &["rev-parse", "HEAD^{tree}"]);
    let (fanout, suffix) = tree_oid.split_at(2);
    let tree_object = fixture
        .repository
        .join(".git/objects")
        .join(fanout)
        .join(suffix);
    fs::remove_file(&tree_object).expect("remove loose promised tree object");

    let sensitivity_env = [("GIT_TRACE2_EVENT", trace_sentinel.as_os_str())];
    let sensitivity = git_output(
        &fixture.repository,
        &["cat-file", "-e", &tree_oid],
        &[],
        &sensitivity_env,
    );
    assert!(!sensitivity.status.success());
    assert!(
        trace_sentinel.is_file(),
        "raw Git must honor local Trace2 target"
    );
    assert!(
        remote_sentinel.is_file(),
        "raw Git must attempt promisor remote helper"
    );
    fs::remove_file(&trace_sentinel).expect("reset Trace2 sentinel");
    fs::remove_file(&remote_sentinel).expect("reset remote sentinel");

    let hostile_trace_env = [
        ("GIT_TRACE2", trace_sentinel.as_os_str()),
        ("GIT_TRACE2_EVENT", trace_sentinel.as_os_str()),
        ("GIT_TRACE2_PERF", trace_sentinel.as_os_str()),
    ];
    let output = fixture.run_with_env(fixture.payload.frame(), &[], &hostile_trace_env);
    assert_silent_rejection(&output);
    assert!(
        !trace_sentinel.exists(),
        "adapter must disable repository Trace2"
    );
    assert!(
        !remote_sentinel.exists(),
        "adapter must disable promisor lazy fetch"
    );
    let head = fs::read_to_string(fixture.repository.join(".git/refs/heads/main"))
        .expect("read loose HEAD ref");
    assert_eq!(head.trim(), fixture.base_commit);
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
    root: TestDirectory,
    repository: PathBuf,
    payload: DockerLocalExecutionPayloadRequestFrameV1,
    expected_result_digest: [u8; 32],
    base_commit: String,
    expected_commit: String,
}

impl AdapterFixture {
    fn new(path_binding: PathBinding, executable_binding: ExecutableBinding) -> Self {
        Self::new_with_expected_tree(path_binding, executable_binding, false)
    }

    fn with_expected_tree_drift() -> Self {
        Self::new_with_expected_tree(PathBinding::Remapped, ExecutableBinding::Exact, true)
    }

    fn new_with_expected_tree(
        path_binding: PathBinding,
        executable_binding: ExecutableBinding,
        drift_expected_tree: bool,
    ) -> Self {
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
        let profile = profile(executable_binding, &prepared.repository);
        let bound_expected_tree = if drift_expected_tree {
            drift_oid(&prepared.expected_tree)
        } else {
            prepared.expected_tree.clone()
        };
        let derived = derived_request(
            &profile,
            &approved_identity,
            &prepared.patch,
            &bound_expected_tree,
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
            tree_oid: bound_expected_tree,
            changed_paths: vec!["fixture.txt".to_owned()],
            patch_sha256: prefixed_sha256(&Sha256::digest(prepared.patch.as_bytes()).into()),
            metadata: prepared.metadata,
        };
        let expected_result_digest =
            docker_local_supervised_git_result_digest_v1(&payload, &semantic_result);
        Self {
            root,
            repository: prepared.repository,
            payload,
            expected_result_digest,
            base_commit: prepared.base_commit,
            expected_commit: prepared.expected_commit,
        }
    }

    fn run(&self, input: &[u8], extra_arguments: &[&str]) -> Output {
        Self::run_at(&self.repository, input, extra_arguments)
    }

    fn run_with_env(
        &self,
        input: &[u8],
        extra_arguments: &[&str],
        extra_env: &[(&str, &std::ffi::OsStr)],
    ) -> Output {
        Self::run_at_with_env(&self.repository, input, extra_arguments, extra_env)
    }

    fn run_at(repository: &Path, input: &[u8], extra_arguments: &[&str]) -> Output {
        Self::run_at_with_env(repository, input, extra_arguments, &[])
    }

    fn run_at_with_env(
        repository: &Path,
        input: &[u8],
        extra_arguments: &[&str],
        extra_env: &[(&str, &std::ffi::OsStr)],
    ) -> Output {
        let mut command = Command::new(ADAPTER_EXECUTABLE);
        command
            .arg("--repository")
            .arg(repository)
            .args(extra_arguments)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped());
        for (key, value) in extra_env {
            command.env(key, value);
        }
        let mut child = command.spawn().expect("spawn reference adapter");
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

fn profile(
    binding: ExecutableBinding,
    repository_mount_path: &Path,
) -> LoadedDockerLocalRuntimeProfileV1 {
    let mut value: Value = serde_json::from_slice(PROFILE_FIXTURE).expect("profile JSON");
    value["filesystem"]["workdir"] = json!(
        repository_mount_path
            .parent()
            .expect("mount parent")
            .to_str()
            .expect("mount parent UTF-8")
    );
    value["filesystem"]["target_mount_path"] =
        json!(repository_mount_path.to_str().expect("mount path UTF-8"));
    value["adapter_executable_digest"] = match binding {
        ExecutableBinding::Exact => json!(file_digest(Path::new(ADAPTER_EXECUTABLE))),
        ExecutableBinding::Drifted => {
            json!(format!("sha256:{}", "c".repeat(64)))
        }
    };
    parse_docker_local_runtime_profile_v1(&serde_json::to_vec(&value).expect("profile bytes"))
        .expect("profile")
}

fn drift_oid(oid: &str) -> String {
    let replacement = if oid.starts_with('0') { '1' } else { '0' };
    format!("{replacement}{}", &oid[1..])
}

fn assert_silent_rejection(output: &Output) {
    assert!(!output.status.success());
    assert!(output.stdout.is_empty());
    assert!(output.stderr.is_empty());
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
