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
    DockerLocalAdapterProcessRequestInputV1, DockerLocalAdapterProcessResultOutcomeV1,
    build_docker_local_adapter_process_request_v1,
    encode_docker_local_adapter_process_result_frame_v1,
};
use lnsatd::docker_local_execution_payload::{
    DockerLocalExecutionPayloadRequestFrameV1, build_docker_local_execution_payload_request_v1,
};
use lnsatd::docker_local_supervisor::{
    DockerLocalSupervisorErrorV1, DockerLocalSupervisorInputV1,
    docker_local_supervised_git_result_digest_v1, supervise_docker_local_git_execution_v1,
};
use lnsatd::runtime_profile::{
    DOCKER_LOCAL_ADAPTER_REF_V1, DOCKER_LOCAL_ADAPTER_VERSION_V1, DOCKER_LOCAL_AUDIENCE_V1,
    LoadedDockerLocalRuntimeProfileV1, parse_docker_local_runtime_profile_v1,
};
use serde_json::{Value, json};
use sha2::{Digest, Sha256};
use std::fs::{self, OpenOptions};
use std::io::Write as _;
use std::os::unix::fs::{OpenOptionsExt as _, PermissionsExt as _};
use std::os::unix::net::UnixListener;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::time::Instant;

const PROFILE_FIXTURE: &[u8] =
    include_bytes!("../../../fixtures/contracts/phase11-docker-local-profile-v1.json");
const SUPERVISOR_FIXTURE: &str =
    include_str!("../../../fixtures/contracts/phase11-docker-local-supervisor-v1.json");
const GIT_EXECUTABLE: &str = "/usr/bin/git";

#[test]
fn supervisor_fixture_locks_source_only_boundary_and_error_codes() {
    let fixture: Value = serde_json::from_str(SUPERVISOR_FIXTURE).expect("fixture JSON");
    assert_eq!(fixture["packet_id"], "P11-D4B1");
    assert_eq!(fixture["phase11_complete"], false);
    assert_eq!(fixture["production_supported"], false);
    assert_eq!(fixture["success_boundary"]["receipt_persisted"], false);
    assert_eq!(fixture["profile_requirement"]["schema_version"], 2);
    assert_eq!(
        fixture["profile_requirement"]["schema_version_1_launch_allowed"],
        false
    );
    assert!(
        fixture["hard_stops"]
            .as_array()
            .expect("hard stops")
            .iter()
            .any(|value| value == "no_production_or_user_repository")
    );
    let expected = [
        "docker_local_supervisor.input_invalid",
        "docker_local_supervisor.profile_binding_invalid",
        "docker_local_supervisor.docker_executable_invalid",
        "docker_local_supervisor.verifier_executable_invalid",
        "docker_local_supervisor.docker_endpoint_invalid",
        "docker_local_supervisor.target_rejected",
        "docker_local_supervisor.runtime_unavailable",
        "docker_local_supervisor.outcome_unknown",
    ];
    assert_eq!(
        fixture["error_codes"]
            .as_array()
            .expect("error codes")
            .iter()
            .map(Value::as_str)
            .collect::<Option<Vec<_>>>()
            .expect("string codes"),
        expected
    );
}

#[test]
fn schema2_supervisor_runs_exact_isolated_command_and_binds_git_result() {
    let fixture = SupervisorFixture::new(ScriptMode::Success, 2);
    let result = fixture.run().expect("supervised fixture must complete");

    assert_eq!(result.semantic_result, fixture.semantic_result);
    assert_eq!(result.adapter_result_digest, fixture.expected_result_digest);
    assert!(result.elapsed_millis < 2_000);
    assert_eq!(
        git_text(&fixture.repository, &["rev-parse", "HEAD"]),
        fixture.expected_commit
    );

    let invocations = fs::read_to_string(&fixture.invocations).expect("invocation log");
    assert_eq!(invocations.matches("BEGIN\n").count(), 1);
    for required in [
        "--interactive",
        "--cidfile",
        "--pull=never",
        "--rm",
        "--network=none",
        "--ipc=none",
        "--read-only",
        "--log-driver=none",
        "--cap-drop=ALL",
        "--security-opt=no-new-privileges:true",
        "--pids-limit=64",
        "--memory=268435456",
        "--memory-swap=268435456",
        "--cpu-period=100000",
        "--cpu-quota=100000",
        "--entrypoint",
        "/usr/local/bin/lnsat-git-reference",
        "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    ] {
        assert!(
            invocations.lines().any(|line| line == required),
            "missing {required}"
        );
    }
    for forbidden in [
        "--privileged",
        "--device",
        "--env",
        "--pid=host",
        "/var/run/docker.sock:/var/run/docker.sock",
    ] {
        assert!(
            !invocations.contains(forbidden),
            "forbidden argument {forbidden}"
        );
    }
    assert!(invocations.contains(fixture.repository.to_str().expect("UTF-8 path")));
}

#[test]
fn post_spawn_result_mismatch_is_unknown_even_when_consequence_exists() {
    let fixture = SupervisorFixture::new(ScriptMode::Success, 2);
    let wrong = encode_docker_local_adapter_process_result_frame_v1(
        fixture.payload.control(),
        DockerLocalAdapterProcessResultOutcomeV1::Completed([0x99; 32]),
    )
    .expect("wrong result still frames");
    fs::write(&fixture.result_frame, wrong).expect("replace result frame");

    assert_eq!(
        fixture.run(),
        Err(DockerLocalSupervisorErrorV1::OutcomeUnknown)
    );
    assert_eq!(
        git_text(&fixture.repository, &["rev-parse", "HEAD"]),
        fixture.expected_commit
    );
    let invocations = fs::read_to_string(&fixture.invocations).expect("invocation log");
    assert_eq!(invocations.matches("BEGIN\n").count(), 2);
    assert!(invocations.lines().any(|line| line == "rm"));
}

#[test]
fn timeout_kills_client_requests_cleanup_and_never_reports_non_execution() {
    let fixture = SupervisorFixture::new(ScriptMode::Timeout, 1);
    let started = Instant::now();
    assert_eq!(
        fixture.run(),
        Err(DockerLocalSupervisorErrorV1::OutcomeUnknown)
    );
    let elapsed = started.elapsed();
    assert!(
        elapsed.as_millis() < 2_000,
        "deadline must include pipe shutdown: {elapsed:?}"
    );
    assert_eq!(
        git_text(&fixture.repository, &["rev-parse", "HEAD"]),
        fixture.base_commit
    );
    let invocations = fs::read_to_string(&fixture.invocations).expect("invocation log");
    assert_eq!(invocations.matches("BEGIN\n").count(), 2);
    assert!(invocations.lines().any(|line| line == "rm"));
}

#[test]
fn nonempty_stderr_after_consequence_is_unknown_and_secret_free() {
    let fixture = SupervisorFixture::new(ScriptMode::Stderr, 2);
    let error = fixture.run().expect_err("stderr must reject");
    assert_eq!(error, DockerLocalSupervisorErrorV1::OutcomeUnknown);
    assert_eq!(error.code(), "docker_local_supervisor.outcome_unknown");
    assert!(
        !error
            .to_string()
            .contains(fixture.repository.to_str().expect("path"))
    );
    assert_eq!(
        git_text(&fixture.repository, &["rev-parse", "HEAD"]),
        fixture.expected_commit
    );
}

#[test]
fn schema1_and_runtime_identity_drift_reject_before_launch() {
    let fixture = SupervisorFixture::new(ScriptMode::Success, 2);
    let schema1 = parse_docker_local_runtime_profile_v1(PROFILE_FIXTURE).expect("schema1 profile");
    let schema1_error = supervise_docker_local_git_execution_v1(&DockerLocalSupervisorInputV1 {
        payload: &fixture.payload,
        loaded_profile: &schema1,
        docker_executable: &fixture.docker_executable,
        verifier_git_executable: Path::new(GIT_EXECUTABLE),
        disposable_root: fixture.root.path(),
    });
    assert_eq!(
        schema1_error,
        Err(DockerLocalSupervisorErrorV1::InputInvalid)
    );

    fs::write(&fixture.docker_executable, b"#!/bin/sh\nexit 0\n").expect("drift executable");
    fs::set_permissions(
        &fixture.docker_executable,
        fs::Permissions::from_mode(0o700),
    )
    .expect("restore mode");
    let digest_error = fixture.run();
    assert_eq!(
        digest_error,
        Err(DockerLocalSupervisorErrorV1::DockerExecutableInvalid)
    );
    assert!(!fixture.invocations.exists());
}

#[test]
fn nonzero_without_created_container_id_never_requests_cleanup() {
    let fixture = SupervisorFixture::new(ScriptMode::NonzeroNoCid, 2);
    assert_eq!(
        fixture.run(),
        Err(DockerLocalSupervisorErrorV1::OutcomeUnknown)
    );
    let invocations = fs::read_to_string(&fixture.invocations).expect("invocation log");
    assert_eq!(invocations.matches("BEGIN\n").count(), 1);
    assert!(!invocations.lines().any(|line| line == "rm"));
}

#[derive(Clone, Copy)]
enum ScriptMode {
    Success,
    Timeout,
    Stderr,
    NonzeroNoCid,
}

struct SupervisorFixture {
    root: TestDirectory,
    _listener: UnixListener,
    repository: PathBuf,
    docker_executable: PathBuf,
    result_frame: PathBuf,
    invocations: PathBuf,
    profile: LoadedDockerLocalRuntimeProfileV1,
    payload: DockerLocalExecutionPayloadRequestFrameV1,
    semantic_result: Phase7GitExecutionResultV1,
    expected_result_digest: [u8; 32],
    base_commit: String,
    expected_commit: String,
}

struct PreparedGitFixture {
    repository: PathBuf,
    base_commit: String,
    expected_commit: String,
    expected_tree: String,
    patch: String,
    metadata: Phase7GitCommitMetadataV1,
}

impl SupervisorFixture {
    fn new(mode: ScriptMode, wall_clock_seconds: u32) -> Self {
        let root = TestDirectory::new("supervisor");
        let git = prepare_git_fixture(root.path());
        let repository = git.repository;
        let base_commit = git.base_commit;
        let expected_commit = git.expected_commit;
        let expected_tree = git.expected_tree;
        let patch = git.patch;
        let metadata = git.metadata;

        let result_frame = root.path().join("adapter-result.json");
        let invocations = root.path().join("docker-invocations.txt");
        let docker_executable = root.path().join("fake-docker");
        let script = fake_docker_script(
            mode,
            &repository,
            &base_commit,
            &expected_commit,
            &result_frame,
            &invocations,
        );
        fs::write(&docker_executable, script).expect("fake Docker executable");
        fs::set_permissions(&docker_executable, fs::Permissions::from_mode(0o700))
            .expect("fake Docker mode");

        let socket_path = root.path().join("docker.sock");
        let listener = UnixListener::bind(&socket_path).expect("fixture Unix socket");
        fs::set_permissions(&socket_path, fs::Permissions::from_mode(0o600))
            .expect("fixture socket mode");

        let profile = schema2_profile(
            &docker_executable,
            Path::new(GIT_EXECUTABLE),
            &socket_path,
            wall_clock_seconds,
        );
        let identity =
            inspect_phase7_disposable_git_repository_v1(&repository, Path::new(GIT_EXECUTABLE))
                .expect("approved repository identity");
        let derived = derived_request(&profile, &identity, &patch, &expected_tree, &metadata);
        let operation_id = format!("opn_{}", "a".repeat(64));
        let authorization_id = format!("xau_{}", "b".repeat(64));
        let idempotency_key = "idempotency:p11-d4b:fixture".to_owned();
        let control_input = DockerLocalAdapterProcessRequestInputV1 {
            operation_id: &operation_id,
            authorization_id: &authorization_id,
            idempotency_key: &idempotency_key,
            attempt_sequence: 1,
            loaded_profile: &profile,
            derived_request: &derived,
        };
        build_docker_local_adapter_process_request_v1(&control_input)
            .expect("adapter control request");
        let payload = build_docker_local_execution_payload_request_v1(&control_input)
            .expect("execution payload");
        let semantic_result = Phase7GitExecutionResultV1 {
            commit_oid: expected_commit.clone(),
            tree_oid: expected_tree,
            changed_paths: vec!["fixture.txt".to_owned()],
            patch_sha256: prefixed_sha256(&Sha256::digest(patch.as_bytes()).into()),
            metadata,
        };
        let expected_result_digest =
            docker_local_supervised_git_result_digest_v1(&payload, &semantic_result);
        let frame = encode_docker_local_adapter_process_result_frame_v1(
            payload.control(),
            DockerLocalAdapterProcessResultOutcomeV1::Completed(expected_result_digest),
        )
        .expect("adapter result frame");
        fs::write(&result_frame, frame).expect("adapter result file");

        Self {
            root,
            _listener: listener,
            repository,
            docker_executable,
            result_frame,
            invocations,
            profile,
            payload,
            semantic_result,
            expected_result_digest,
            base_commit,
            expected_commit,
        }
    }

    fn run(
        &self,
    ) -> Result<
        lnsatd::docker_local_supervisor::DockerLocalSupervisedGitResultV1,
        DockerLocalSupervisorErrorV1,
    > {
        supervise_docker_local_git_execution_v1(&DockerLocalSupervisorInputV1 {
            payload: &self.payload,
            loaded_profile: &self.profile,
            docker_executable: &self.docker_executable,
            verifier_git_executable: Path::new(GIT_EXECUTABLE),
            disposable_root: self.root.path(),
        })
    }
}

fn prepare_git_fixture(root: &Path) -> PreparedGitFixture {
    let repository = root.join("repository");
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
    let metadata = fixed_metadata("bounded D4B fixture commit\n");
    let expected_commit = commit_tree(&repository, &expected_tree, Some(&base_commit), &metadata);
    let _ = fs::remove_file(&index_path);
    PreparedGitFixture {
        repository,
        base_commit,
        expected_commit,
        expected_tree,
        patch,
        metadata,
    }
}

fn schema2_profile(
    docker_executable: &Path,
    verifier_git_executable: &Path,
    socket_path: &Path,
    wall_clock_seconds: u32,
) -> LoadedDockerLocalRuntimeProfileV1 {
    let mut value: Value = serde_json::from_slice(PROFILE_FIXTURE).expect("profile JSON");
    value["schema_version"] = json!(2);
    value["supervisor"] = json!({
        "docker_executable_digest": file_digest(docker_executable),
        "verifier_git_executable_digest": file_digest(verifier_git_executable),
        "docker_host": format!("unix://{}", socket_path.display()),
    });
    value["limits"]["wall_clock_seconds"] = json!(wall_clock_seconds);
    parse_docker_local_runtime_profile_v1(&serde_json::to_vec(&value).expect("profile bytes"))
        .expect("schema2 profile")
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
        intent: "Run one isolated Docker-local adapter fixture".to_owned(),
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
        created_at: "2026-08-29T06:59:00Z".to_owned(),
        expires_at: "2026-08-29T07:02:00Z".to_owned(),
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
        prepared_at: "2026-08-29T07:00:00.000Z",
        expires_at: "2026-08-29T07:01:00Z",
    })
    .expect("execution request")
}

fn fake_docker_script(
    mode: ScriptMode,
    repository: &Path,
    base_commit: &str,
    expected_commit: &str,
    result_frame: &Path,
    invocations: &Path,
) -> String {
    let behavior = match mode {
        ScriptMode::Success => format!(
            "{git} -C {repository} update-ref refs/heads/main {expected} {base}\n{cat} {result}\n",
            git = shell_quote(Path::new(GIT_EXECUTABLE)),
            repository = shell_quote(repository),
            expected = expected_commit,
            base = base_commit,
            cat = shell_quote(Path::new("/bin/cat")),
            result = shell_quote(result_frame),
        ),
        ScriptMode::Timeout => format!(
            "{sleep} 5\n{git} -C {repository} update-ref refs/heads/main {expected} {base}\n{cat} {result}\n",
            sleep = shell_quote(Path::new("/bin/sleep")),
            git = shell_quote(Path::new(GIT_EXECUTABLE)),
            repository = shell_quote(repository),
            expected = expected_commit,
            base = base_commit,
            cat = shell_quote(Path::new("/bin/cat")),
            result = shell_quote(result_frame),
        ),
        ScriptMode::Stderr => format!(
            "{git} -C {repository} update-ref refs/heads/main {expected} {base}\nprintf '%s\\n' 'secret adapter diagnostic' >&2\n{cat} {result}\n",
            git = shell_quote(Path::new(GIT_EXECUTABLE)),
            repository = shell_quote(repository),
            expected = expected_commit,
            base = base_commit,
            cat = shell_quote(Path::new("/bin/cat")),
            result = shell_quote(result_frame),
        ),
        ScriptMode::NonzeroNoCid => "exit 1\n".to_owned(),
    };
    let cid_setup = if matches!(mode, ScriptMode::NonzeroNoCid) {
        String::new()
    } else {
        format!(
            "cidfile=''\nprevious=''\nfor argument in \"$@\"; do if [ \"$previous\" = '--cidfile' ]; then cidfile=$argument; fi; previous=$argument; done\n[ -n \"$cidfile\" ]\nprintf '%s\\n' '{}' > \"$cidfile\"\n",
            "c".repeat(64),
        )
    };
    format!(
        "#!/bin/sh\nset -eu\nprintf 'BEGIN\\n' >> {invocations}\nfor argument in \"$@\"; do printf '%s\\n' \"$argument\" >> {invocations}; done\nfor argument in \"$@\"; do if [ \"$argument\" = 'rm' ]; then exit 0; fi; done\n{cid_setup}{cat} >/dev/null\n{behavior}",
        invocations = shell_quote(invocations),
        cat = shell_quote(Path::new("/bin/cat")),
    )
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
    assert!(
        output.status.success(),
        "git {args:?} failed: {}",
        String::from_utf8_lossy(&output.stderr)
    );
}

fn git_output(
    repository: &Path,
    args: &[&str],
    stdin: &[u8],
    extra_env: &[(&str, &std::ffi::OsStr)],
) -> std::process::Output {
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

fn shell_quote(path: &Path) -> String {
    let value = path.to_str().expect("fixture path UTF-8");
    format!("'{}'", value.replace('\'', "'\\''"))
}

struct TestDirectory {
    path: PathBuf,
}

impl TestDirectory {
    fn new(label: &str) -> Self {
        let root = fs::canonicalize(std::env::temp_dir()).expect("temporary root");
        for nonce in 0_u64..100 {
            let candidate = root.join(format!("lnsat-d4b-{label}-{}-{nonce}", std::process::id()));
            let mut options = OpenOptions::new();
            options.write(true).create_new(true).mode(0o600);
            let reservation = candidate.with_extension("reserve");
            match options.open(&reservation) {
                Ok(_) => {
                    fs::create_dir(&candidate).expect("fixture directory");
                    fs::set_permissions(&candidate, fs::Permissions::from_mode(0o700))
                        .expect("fixture directory mode");
                    let _ = fs::remove_file(reservation);
                    return Self { path: candidate };
                }
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
