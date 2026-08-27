use super::*;
use crate::phase7_consumption::{Phase7ExecutionSeedInputV1, Phase7ExecutionSeedRecordV1};
use lnsat_contracts::{ExecutionRequestV1Input, derive_execution_request_v1};
use std::io::Write as _;
use std::process::Command;
use std::sync::{
    Arc, Barrier,
    atomic::{AtomicUsize, Ordering},
};

pub(super) const GIT_EXECUTABLE: &str = "/usr/bin/git";
pub(super) const PATCH: &[u8] = b"diff --git a/fixture.txt b/fixture.txt\n--- a/fixture.txt\n+++ b/fixture.txt\n@@ -1 +1 @@\n-before\n+after\n";
const CAPABILITY: [u8; PHASE7_CAPABILITY_BYTES_V1] = [0x71; PHASE7_CAPABILITY_BYTES_V1];
const DISPATCHED_AT: &str = "2026-07-22T20:04:01.000Z";
const X1_OWNER_PASSWORD: &str = "owner password for phase seven conformance freeze";
const X1_REQUESTER_PASSWORD: &str = "requester password for phase seven conformance freeze";
const X1_REQUESTER_REF: &str = "identity:human:p7-x1-requester";

pub(super) struct GitRepositoryFixture {
    pub(super) path: PathBuf,
    pub(super) identity: Phase7GitRepositoryIdentityV1,
    pub(super) expected_tree_oid: String,
}

impl Drop for GitRepositoryFixture {
    fn drop(&mut self) {
        let _ = fs::remove_dir_all(&self.path);
    }
}

struct AuthorizedGitFixture {
    database: TestDatabase,
    repository: GitRepositoryFixture,
    store: SqliteStore,
    derived: lnsat_contracts::DerivedExecutionRequestV1,
    project_ref: String,
    resource_ref: String,
    authorization_id: String,
    operation_id: String,
    consumption_id: String,
}

impl AuthorizedGitFixture {
    fn parts(&mut self) -> (&mut SqliteStore, Phase7GitCommitDispatchInputV1<'_>) {
        let Self {
            store,
            derived,
            project_ref,
            resource_ref,
            authorization_id,
            operation_id,
            consumption_id,
            repository,
            ..
        } = self;
        let input = Phase7GitCommitDispatchInputV1 {
            project_ref,
            resource_ref,
            authorization_id,
            operation_id,
            consumption_id,
            derived_request: derived,
            repository_path: &repository.path,
            git_executable: Path::new(GIT_EXECUTABLE),
            patch: PATCH,
        };
        (store, input)
    }
}

pub(super) fn git(repository: &Path, args: &[&str]) -> Vec<u8> {
    let output = Command::new(GIT_EXECUTABLE)
        .current_dir(repository)
        .env("GIT_CONFIG_NOSYSTEM", "1")
        .env("GIT_CONFIG_GLOBAL", "/dev/null")
        .args(args)
        .output()
        .expect("fixture Git command must start");
    assert!(
        output.status.success(),
        "fixture Git command failed: {}",
        String::from_utf8_lossy(&output.stderr)
    );
    output.stdout
}

pub(super) fn create_git_repository(sequence: u64) -> GitRepositoryFixture {
    let path = std::env::temp_dir().join(format!(
        "lnsat-disposable-git-fixture-{}-{sequence}",
        std::process::id()
    ));
    fs::create_dir(&path).expect("fixture directory must create");
    git(&path, &["init", "-b", "main"]);
    fs::write(
        path.join(PHASE7_GIT_FIXTURE_MARKER_V1),
        format!("lnsat.disposable_git_fixture.v1\n{sequence:016x}\n"),
    )
    .expect("fixture marker must write");
    fs::write(path.join("fixture.txt"), b"before\n").expect("fixture content must write");
    git(
        &path,
        &["add", "--", PHASE7_GIT_FIXTURE_MARKER_V1, "fixture.txt"],
    );
    let status = Command::new(GIT_EXECUTABLE)
        .current_dir(&path)
        .env("GIT_CONFIG_NOSYSTEM", "1")
        .env("GIT_CONFIG_GLOBAL", "/dev/null")
        .env("GIT_AUTHOR_NAME", "LNSAT Fixture")
        .env("GIT_AUTHOR_EMAIL", "fixture@lnsat.invalid")
        .env("GIT_AUTHOR_DATE", "1786490000 +0000")
        .env("GIT_COMMITTER_NAME", "LNSAT Fixture")
        .env("GIT_COMMITTER_EMAIL", "fixture@lnsat.invalid")
        .env("GIT_COMMITTER_DATE", "1786490000 +0000")
        .args(["commit", "--no-gpg-sign", "-m", "fixture base"])
        .status()
        .expect("fixture commit must start");
    assert!(status.success());
    let identity = inspect_phase7_disposable_git_repository_v1(&path, Path::new(GIT_EXECUTABLE))
        .expect("fixture identity must inspect");
    let index = path.join(".git/lnsat-expected-index");
    let status = Command::new(GIT_EXECUTABLE)
        .current_dir(&path)
        .env("GIT_CONFIG_NOSYSTEM", "1")
        .env("GIT_CONFIG_GLOBAL", "/dev/null")
        .env("GIT_INDEX_FILE", &index)
        .args(["read-tree", &identity.base_commit_oid])
        .status()
        .expect("expected index must initialize");
    assert!(status.success());
    let mut child = Command::new(GIT_EXECUTABLE)
        .current_dir(&path)
        .env("GIT_CONFIG_NOSYSTEM", "1")
        .env("GIT_CONFIG_GLOBAL", "/dev/null")
        .env("GIT_INDEX_FILE", &index)
        .args(["apply", "--cached", "-"])
        .stdin(std::process::Stdio::piped())
        .spawn()
        .expect("expected patch must start");
    child
        .stdin
        .take()
        .expect("expected patch stdin")
        .write_all(PATCH)
        .expect("expected patch must write");
    assert!(child.wait().expect("expected patch must finish").success());
    let expected_tree_oid = String::from_utf8(
        Command::new(GIT_EXECUTABLE)
            .current_dir(&path)
            .env("GIT_CONFIG_NOSYSTEM", "1")
            .env("GIT_CONFIG_GLOBAL", "/dev/null")
            .env("GIT_INDEX_FILE", &index)
            .arg("write-tree")
            .output()
            .expect("expected tree must write")
            .stdout,
    )
    .expect("expected tree oid must encode")
    .trim()
    .to_owned();
    fs::remove_file(index).expect("expected index must remove");
    GitRepositoryFixture {
        path,
        identity,
        expected_tree_oid,
    }
}

pub(super) fn hex_digest(digest: &[u8; 32]) -> String {
    let mut value = String::with_capacity(71);
    value.push_str("sha256:");
    for byte in digest {
        write!(&mut value, "{byte:02x}").expect("digest formatting cannot fail");
    }
    value
}

pub(super) fn patch_digest() -> String {
    use sha2::{Digest as _, Sha256};
    let digest: [u8; 32] = Sha256::digest(PATCH).into();
    hex_digest(&digest)
}

#[allow(clippy::too_many_lines)]
fn authorize_git_fixture(sequence: u64) -> AuthorizedGitFixture {
    let repository = create_git_repository(sequence);
    let mut packet = packet_fixture();
    packet.permission_allow = vec!["deploy.request".to_owned()];
    packet.packet_id = format!("pkt_{sequence:064x}");
    packet.idempotency_key = format!("idem_{sequence:064x}");
    let resource_ref = packet.resource_refs[0].clone();
    let executable_digest = phase7_git_executable_digest_v1(Path::new(GIT_EXECUTABLE))
        .expect("Git executable must hash");
    packet.constraints.insert(
        "execution_proposal".to_owned(),
        serde_json::json!({
            "schema_id": "lnsat.execution_proposal.schema.v1_0",
            "derivation_profile": "lnsat.execution_request.packet_embedded.v1",
            "action": {
                "kind": "git.commit",
                "arguments": {
                    "schema_id": "lnsat.git_commit_action.schema.v1",
                    "base_commit_oid": repository.identity.base_commit_oid,
                    "head_ref": repository.identity.head_ref,
                    "allowed_paths": ["fixture.txt"],
                    "patch_sha256": patch_digest(),
                    "expected_tree_oid": repository.expected_tree_oid,
                    "commit_metadata": {
                        "message": "bounded fixture commit\n",
                        "author_name": "LNSAT Adapter",
                        "author_email": "adapter@lnsat.invalid",
                        "author_time": "1786500000 +0000",
                        "committer_name": "LNSAT Adapter",
                        "committer_email": "adapter@lnsat.invalid",
                        "committer_time": "1786500000 +0000"
                    }
                }
            },
            "target": {
                "resource_ref": resource_ref,
                "identity": {
                    "schema_id": "lnsat.disposable_git_repository.schema.v1",
                    "repository_path": repository.identity.repository_path,
                    "git_dir_path": repository.identity.git_dir_path,
                    "object_format": repository.identity.object_format,
                    "head_ref": repository.identity.head_ref,
                    "base_commit_oid": repository.identity.base_commit_oid,
                    "fixture_marker_sha256": repository.identity.fixture_marker_sha256
                }
            },
            "configuration_digest": hex_digest(&phase7_git_adapter_configuration_digest_v1()),
            "adapter": {
                "ref": PHASE7_GIT_ADAPTER_REF_V1,
                "version": PHASE7_GIT_ADAPTER_VERSION_V1
            },
            "executable_digest": hex_digest(&executable_digest),
            "audience": "audience:gateway:local"
        }),
    );
    let policy = policy_fixture(&packet);
    let request = create_approval_request_v1(&policy, "2026-07-22T20:01:00Z")
        .expect("Git approval request must derive");
    let decision = decide_approval_request_v1(
        &request,
        &ApprovalDecisionV1Input {
            approver_ref: "identity:human:owner".to_owned(),
            approver_session_ref: "session:local:owner-0001".to_owned(),
            decision: ApprovalDecisionV1Kind::Approved,
            reason: ApprovalDecisionV1Reason::OperatorApproved,
            decided_at: "2026-07-22T20:02:00Z".to_owned(),
        },
    )
    .expect("Git approval decision must derive");
    let database = TestDatabase::new("phase7-git-adapter");
    let mut store = SqliteStore::open(&database.path).expect("Git store must open");
    let attempt =
        persist_phase7_attempt(&mut store, &packet, &policy, &request, &decision, sequence);
    let nonce = issue_phase7_nonce_at(
        &mut store,
        &attempt,
        0x72,
        "2026-07-22T20:03:01.000Z",
        "2026-07-22T20:08:01.000Z",
    );
    drop(nonce.nonce);
    let Phase7ExecutionSeedRecordV1 {
        authorization_id,
        operation_id,
    } = store
        .seed_phase7_execution_authorization_and_operation_v1(
            &Phase7ExecutionSeedInputV1 {
                project_ref: &attempt.project_ref,
                resource_ref: &attempt.resource_ref,
                authorization_attempt_id: &attempt.authorization_attempt_id,
                nonce_id: &nonce.record.nonce_id,
                operation_idempotency_key: &format!("phase7-git-operation:{sequence:04}"),
                issued_at: "2026-07-22T20:03:02.000Z",
                expires_at: "2026-07-22T20:08:00.000Z",
            },
            &CAPABILITY,
        )
        .expect("Git authorization must seed");
    let mut capability = CAPABILITY;
    let consumption = store
        .redeem_phase7_execution_capability_with_sources_v1(
            &Phase7CapabilityRedemptionInputV1 {
                project_ref: &attempt.project_ref,
                resource_ref: &attempt.resource_ref,
                authorization_id: &authorization_id,
                operation_id: &operation_id,
                idempotency_key: &format!("phase7-git-consume:{sequence:04}"),
            },
            Phase7CapabilitySecretV1::take_from_bytes(&mut capability),
            || Ok("2026-07-22T20:04:00.000Z".to_owned()),
            || Ok(()),
            || Ok(()),
        )
        .expect("Git authorization must consume");
    let derived = derive_execution_request_v1(&ExecutionRequestV1Input {
        packet: &packet,
        packet_sha256: &attempt.packet_sha256,
        policy_decision_id: &attempt.policy_decision_id,
        approval_request_id: &attempt.approval_request_id,
        approval_decision_id: &attempt.approval_decision_id,
        requester_ref: &request.requester_ref,
        requester_session_ref: &request.session_ref,
        approver_ref: &decision.approver_ref,
        approver_session_ref: &decision.approver_session_ref,
        prepared_at: &attempt.requested_at,
        expires_at: &attempt.expires_at,
    })
    .expect("Git request must rederive");
    AuthorizedGitFixture {
        database,
        repository,
        store,
        derived,
        project_ref: attempt.project_ref,
        resource_ref: attempt.resource_ref,
        authorization_id,
        operation_id,
        consumption_id: consumption.record.consumption_id,
    }
}

#[allow(clippy::too_many_lines)]
fn authorize_live_git_fixture(sequence: u64) -> AuthorizedGitFixture {
    let repository = create_git_repository(sequence);
    let database = TestDatabase::new("phase7-x1-local-v1-chain");
    let mut store = SqliteStore::open(&database.path).expect("X1 store must open");
    store
        .bootstrap_local_owner_v1(&LocalOwnerBootstrapInputV1 {
            identity_ref: "identity:human:owner",
            display_name: "Local Owner",
            password: X1_OWNER_PASSWORD,
            created_at: "2026-07-22T19:50:00Z",
        })
        .expect("X1 owner must bootstrap");
    let owner = store
        .issue_local_session_v1(&LocalSessionIssueInputV1 {
            identity_ref: "identity:human:owner",
            password: X1_OWNER_PASSWORD,
            issued_at: "2026-07-22T19:51:00Z",
            expires_at: "2026-07-22T20:31:00Z",
        })
        .expect("X1 owner session must issue");
    store
        .create_local_identity_v1(
            &LocalIdentityCreateInputV1 {
                identity_ref: X1_REQUESTER_REF,
                display_name: "Phase Seven X1 Requester",
                role: LocalIdentityRoleV1::Operator,
                password: X1_REQUESTER_PASSWORD,
                created_at: "2026-07-22T19:52:00Z",
            },
            &owner.raw_session_token,
            &owner.raw_csrf_token,
            "2026-07-22T19:52:00Z",
        )
        .expect("X1 requester must create");
    let requester = store
        .issue_local_session_v1(&LocalSessionIssueInputV1 {
            identity_ref: X1_REQUESTER_REF,
            password: X1_REQUESTER_PASSWORD,
            issued_at: "2026-07-22T19:53:00Z",
            expires_at: "2026-07-22T20:33:00Z",
        })
        .expect("X1 requester session must issue");

    let mut packet = packet_fixture();
    packet.permission_allow = vec!["deploy.request".to_owned()];
    packet.actor_ref = X1_REQUESTER_REF.to_owned();
    packet.session_ref = format!("session:local:{}", requester.session.session_id);
    packet.packet_id = format!("pkt_{sequence:064x}");
    packet.idempotency_key = format!("idem_{sequence:064x}");
    let resource_ref = packet.resource_refs[0].clone();
    let executable_digest = phase7_git_executable_digest_v1(Path::new(GIT_EXECUTABLE))
        .expect("X1 Git executable must hash");
    packet.constraints.insert(
        "execution_proposal".to_owned(),
        serde_json::json!({
            "schema_id": "lnsat.execution_proposal.schema.v1_0",
            "derivation_profile": "lnsat.execution_request.packet_embedded.v1",
            "action": {
                "kind": "git.commit",
                "arguments": {
                    "schema_id": "lnsat.git_commit_action.schema.v1",
                    "base_commit_oid": repository.identity.base_commit_oid,
                    "head_ref": repository.identity.head_ref,
                    "allowed_paths": ["fixture.txt"],
                    "patch_sha256": patch_digest(),
                    "expected_tree_oid": repository.expected_tree_oid,
                    "commit_metadata": {
                        "message": "bounded fixture commit\n",
                        "author_name": "LNSAT Adapter",
                        "author_email": "adapter@lnsat.invalid",
                        "author_time": "1786500000 +0000",
                        "committer_name": "LNSAT Adapter",
                        "committer_email": "adapter@lnsat.invalid",
                        "committer_time": "1786500000 +0000"
                    }
                }
            },
            "target": {
                "resource_ref": resource_ref,
                "identity": {
                    "schema_id": "lnsat.disposable_git_repository.schema.v1",
                    "repository_path": repository.identity.repository_path,
                    "git_dir_path": repository.identity.git_dir_path,
                    "object_format": repository.identity.object_format,
                    "head_ref": repository.identity.head_ref,
                    "base_commit_oid": repository.identity.base_commit_oid,
                    "fixture_marker_sha256": repository.identity.fixture_marker_sha256
                }
            },
            "configuration_digest": hex_digest(&phase7_git_adapter_configuration_digest_v1()),
            "adapter": {
                "ref": PHASE7_GIT_ADAPTER_REF_V1,
                "version": PHASE7_GIT_ADAPTER_VERSION_V1
            },
            "executable_digest": hex_digest(&executable_digest),
            "audience": "audience:gateway:local"
        }),
    );
    let policy = policy_fixture(&packet);
    store
        .append_packet_envelope_v1(&packet)
        .expect("X1 packet must persist");
    store
        .append_policy_decision_v1(&policy)
        .expect("X1 policy must persist");
    let request = store
        .append_authenticated_approval_request_v1(
            &policy.project_ref,
            &policy.decision_id,
            &requester.raw_session_token,
            &requester.raw_csrf_token,
            "2026-07-22T20:01:00Z",
        )
        .expect("X1 authenticated requester must append approval request")
        .record
        .request;
    let decision = decide_approval_request_v1(
        &request,
        &ApprovalDecisionV1Input {
            approver_ref: "identity:human:owner".to_owned(),
            approver_session_ref: format!("session:local:{}", owner.session.session_id),
            decision: ApprovalDecisionV1Kind::Approved,
            reason: ApprovalDecisionV1Reason::OperatorApproved,
            decided_at: "2026-07-22T20:02:00Z".to_owned(),
        },
    )
    .expect("X1 approval decision must derive");
    store
        .append_authenticated_approval_decision_v1(
            &decision,
            &owner.raw_session_token,
            &owner.raw_csrf_token,
            "2026-07-22T20:02:00Z",
        )
        .expect("X1 authenticated owner must append approval decision");
    let mut attempt = phase7_attempt_fixture(&packet, &policy, &request, &decision, sequence);
    let attempt_write = store
        .prepare_phase7_authorization_attempt_with_sources_v1(
            &attempt.input(),
            &attempt.requested_at,
            || Ok(()),
        )
        .expect("X1 authorization attempt must persist from authenticated approval");
    attempt.apply_record(&attempt_write.record);
    let nonce = issue_phase7_nonce_at(
        &mut store,
        &attempt,
        0x72,
        "2026-07-22T20:03:01.000Z",
        "2026-07-22T20:08:01.000Z",
    );
    drop(nonce.nonce);
    let issued = store
        .issue_phase7_local_execution_authorization_with_sources_v1(
            &Phase7ExecutionAuthorizationIssueInputV1 {
                project_ref: &attempt.project_ref,
                resource_ref: &attempt.resource_ref,
                authorization_attempt_id: &attempt.authorization_attempt_id,
                nonce_id: &nonce.record.nonce_id,
                operation_idempotency_key: &format!("phase7-x1-operation:{sequence:04}"),
            },
            &requester.raw_session_token,
            &requester.raw_csrf_token,
            || {
                Ok((
                    "2026-07-22T20:03:02.000Z".to_owned(),
                    "2026-07-22T20:04:02.000Z".to_owned(),
                ))
            },
            |bytes| {
                bytes.fill(0x71);
                Ok(())
            },
            || Ok(()),
            || Ok(()),
        )
        .expect("X1 exact local authorization must issue");
    assert!(issued.created);
    let authorization_id = issued.record.authorization_id.clone();
    let operation_id = issued.record.operation_id.clone();
    let mut wire = issued
        .capability
        .expect("X1 issue must return one capability")
        .into_canonical_wire_v1();
    let consumption_key = format!("phase7-x1-consume:{sequence:04}");
    let consumption = store
        .redeem_phase7_local_execution_capability_with_sources_v1(
            &Phase7CapabilityRedemptionInputV1 {
                project_ref: &attempt.project_ref,
                resource_ref: &attempt.resource_ref,
                authorization_id: &authorization_id,
                operation_id: &operation_id,
                idempotency_key: &consumption_key,
            },
            wire.take_secret_v1()
                .expect("X1 capability wire must decode"),
            &requester.raw_session_token,
            &requester.raw_csrf_token,
            || Ok("2026-07-22T20:03:31.000Z".to_owned()),
            || Ok(()),
            || Ok(()),
        )
        .expect("X1 exact requester session must consume");
    assert!(wire.expose_for_authenticated_response_v1().is_empty());
    let derived = derive_execution_request_v1(&ExecutionRequestV1Input {
        packet: &packet,
        packet_sha256: &attempt.packet_sha256,
        policy_decision_id: &attempt.policy_decision_id,
        approval_request_id: &attempt.approval_request_id,
        approval_decision_id: &attempt.approval_decision_id,
        requester_ref: &request.requester_ref,
        requester_session_ref: &request.session_ref,
        approver_ref: &decision.approver_ref,
        approver_session_ref: &decision.approver_session_ref,
        prepared_at: &attempt.requested_at,
        expires_at: &attempt.expires_at,
    })
    .expect("X1 request must rederive");
    AuthorizedGitFixture {
        database,
        repository,
        store,
        derived,
        project_ref: attempt.project_ref,
        resource_ref: attempt.resource_ref,
        authorization_id,
        operation_id,
        consumption_id: consumption.record.consumption_id,
    }
}

fn table_count(store: &SqliteStore, table: &str) -> i64 {
    store
        .connection
        .query_row(&format!("SELECT count(*) FROM {table}"), [], |row| {
            row.get(0)
        })
        .expect("table count must read")
}

#[test]
fn phase7_git_adapter_golden_vectors_lock_configuration_and_patch() {
    assert_eq!(
        hex_digest(&phase7_git_adapter_configuration_digest_v1()),
        "sha256:d8c961bf70af8b467fdb5a53fa665f9eb5240f4610f71d7089c0b934ef4f7b11"
    );
    assert_eq!(
        patch_digest(),
        "sha256:6e83e30448fca3af603d51acdb77ec1692091ec2e580f9630fee112b2620e8f0"
    );
}

#[test]
#[allow(clippy::too_many_lines)]
fn phase7_local_v1_full_chain_freeze_restores_without_duplicate_consequence() {
    let mut fixture = authorize_live_git_fixture(720);
    let first = {
        let (store, input) = fixture.parts();
        store
            .dispatch_phase7_git_commit_with_sources_v1(
                &input,
                || Ok(DISPATCHED_AT.to_owned()),
                || Ok(()),
            )
            .expect("X1 exact Git consequence must dispatch")
    };
    assert!(first.created);
    assert_eq!(first.receipt.changed_paths, ["fixture.txt"]);
    assert_eq!(first.receipt.tree_oid, fixture.repository.expected_tree_oid);
    assert_eq!(
        table_count(&fixture.store, "lnsat_authorization_attempts"),
        1
    );
    assert_eq!(
        table_count(&fixture.store, "lnsat_execution_authorizations"),
        1
    );
    assert_eq!(
        table_count(&fixture.store, "lnsat_capability_consumptions"),
        1
    );
    assert_eq!(table_count(&fixture.store, "lnsat_operation_attempts"), 1);
    assert_eq!(table_count(&fixture.store, "lnsat_operation_receipts"), 1);
    assert!(table_count(&fixture.store, "lnsat_phase7_audit_bindings") >= 6);

    let state = fixture.store.state().expect("X1 store state must read");
    assert_eq!(state.schema_version, SQLITE_SCHEMA_VERSION);
    assert_eq!(state.migration_count, SQLITE_SCHEMA_VERSION);
    assert!(state.foreign_keys_enabled);
    assert!(!state.trusted_schema_enabled);
    assert!(state.integrity_ok);
    let retention = fixture
        .store
        .plan_retention_v1(64)
        .expect("X1 retention evidence must read");
    assert!(retention.protected_record_count > 0);
    assert_eq!(retention.cleanup_candidate_count, 0);
    assert!(!retention.cleanup_attempted);

    let backup = TestDatabase::new("phase7-x1-full-chain-backup");
    let restored = TestDatabase::new("phase7-x1-full-chain-restored");
    let backup_evidence = fixture
        .store
        .create_online_backup_v1(&backup.path)
        .expect("X1 completed chain must back up");
    let restore_evidence = SqliteStore::restore_backup_v1(&backup.path, &restored.path)
        .expect("X1 completed chain must restore inertly");
    assert_eq!(
        backup_evidence.backup_sha256,
        restore_evidence.snapshot_sha256
    );
    assert!(!restore_evidence.activated);
    let inspection = SqliteStore::inspect_recovery_state_v1(&restored.path)
        .expect("X1 restored chain must inspect read-only");
    assert_eq!(inspection.disposition, SqliteRecoveryDispositionV1::Ready);
    assert!(inspection.integrity_ok);

    let mut restored_store =
        SqliteStore::open(&restored.path).expect("X1 restored chain must verify");
    let replay = restored_store
        .dispatch_phase7_git_commit_with_sources_v1(
            &Phase7GitCommitDispatchInputV1 {
                project_ref: &fixture.project_ref,
                resource_ref: &fixture.resource_ref,
                authorization_id: &fixture.authorization_id,
                operation_id: &fixture.operation_id,
                consumption_id: &fixture.consumption_id,
                derived_request: &fixture.derived,
                repository_path: &fixture.repository.path,
                git_executable: Path::new(GIT_EXECUTABLE),
                patch: PATCH,
            },
            || Ok(DISPATCHED_AT.to_owned()),
            || panic!("restored X1 chain must never repeat Git consequence"),
        )
        .expect("restored X1 chain must replay receipt");
    assert!(!replay.created);
    assert_eq!(replay.receipt, first.receipt);
    assert_eq!(table_count(&restored_store, "lnsat_operation_attempts"), 1);
    assert_eq!(table_count(&restored_store, "lnsat_operation_receipts"), 1);
}

#[test]
fn phase7_git_adapter_dispatches_once_and_replays_receipt_without_retry() {
    let mut fixture = authorize_git_fixture(701);
    let first = {
        let (store, input) = fixture.parts();
        store
            .dispatch_phase7_git_commit_with_sources_v1(
                &input,
                || Ok(DISPATCHED_AT.to_owned()),
                || Ok(()),
            )
            .expect("exact Git commit must dispatch")
    };
    assert!(first.created);
    assert_eq!(first.receipt.changed_paths, ["fixture.txt"]);
    assert_eq!(first.receipt.tree_oid, fixture.repository.expected_tree_oid);
    assert_eq!(
        String::from_utf8(git(&fixture.repository.path, &["rev-parse", "HEAD"]))
            .expect("head must encode")
            .trim(),
        first.receipt.commit_oid
    );
    assert_eq!(table_count(&fixture.store, "lnsat_operation_attempts"), 1);
    assert_eq!(table_count(&fixture.store, "lnsat_operation_receipts"), 1);
    let replay = {
        let (store, input) = fixture.parts();
        store
            .dispatch_phase7_git_commit_with_sources_v1(
                &input,
                || Ok(DISPATCHED_AT.to_owned()),
                || panic!("replay must never dispatch"),
            )
            .expect("exact replay must reconstruct receipt")
    };
    assert!(!replay.created);
    assert_eq!(replay.receipt, first.receipt);
    assert_eq!(table_count(&fixture.store, "lnsat_operation_attempts"), 1);
}

#[test]
fn phase7_git_adapter_lost_response_stays_unknown_then_reconciles_objects() {
    let mut fixture = authorize_git_fixture(702);
    let error = {
        let (store, input) = fixture.parts();
        store
            .dispatch_phase7_git_commit_with_sources_v1(
                &input,
                || Ok(DISPATCHED_AT.to_owned()),
                || Err(Phase7GitAdapterErrorV1::OutcomeUnknown),
            )
            .expect_err("lost response must stay unknown")
    };
    assert_eq!(error, Phase7GitAdapterErrorV1::OutcomeUnknown);
    assert_eq!(table_count(&fixture.store, "lnsat_operation_attempts"), 1);
    assert_eq!(table_count(&fixture.store, "lnsat_operation_receipts"), 0);
    let reconciled = {
        let (store, input) = fixture.parts();
        store
            .reconcile_phase7_git_commit_v1(&input)
            .expect("exact Git objects must reconcile")
    };
    assert!(!reconciled.created);
    assert_eq!(table_count(&fixture.store, "lnsat_operation_attempts"), 1);
    assert_eq!(table_count(&fixture.store, "lnsat_operation_receipts"), 1);
    assert_eq!(
        table_count(&fixture.store, "lnsat_operation_reconciliations"),
        1
    );
}

#[test]
fn phase7_git_adapter_concurrent_dispatch_claims_once_and_never_retries_git() {
    let fixture = authorize_git_fixture(709);
    let database_path = fixture.database.path.clone();
    let repository_path = fixture.repository.path.clone();
    let derived = Arc::new(fixture.derived.clone());
    let project_ref = Arc::new(fixture.project_ref.clone());
    let resource_ref = Arc::new(fixture.resource_ref.clone());
    let authorization_id = Arc::new(fixture.authorization_id.clone());
    let operation_id = Arc::new(fixture.operation_id.clone());
    let consumption_id = Arc::new(fixture.consumption_id.clone());
    drop(fixture.store);

    let barrier = Arc::new(Barrier::new(8));
    let dispatches = Arc::new(AtomicUsize::new(0));
    let mut workers = Vec::new();
    for _ in 0..8 {
        let database_path = database_path.clone();
        let repository_path = repository_path.clone();
        let derived = Arc::clone(&derived);
        let project_ref = Arc::clone(&project_ref);
        let resource_ref = Arc::clone(&resource_ref);
        let authorization_id = Arc::clone(&authorization_id);
        let operation_id = Arc::clone(&operation_id);
        let consumption_id = Arc::clone(&consumption_id);
        let barrier = Arc::clone(&barrier);
        let dispatches = Arc::clone(&dispatches);
        workers.push(std::thread::spawn(move || {
            let mut store = SqliteStore::open(&database_path).expect("race store must open");
            let input = Phase7GitCommitDispatchInputV1 {
                project_ref: &project_ref,
                resource_ref: &resource_ref,
                authorization_id: &authorization_id,
                operation_id: &operation_id,
                consumption_id: &consumption_id,
                derived_request: &derived,
                repository_path: &repository_path,
                git_executable: Path::new(GIT_EXECUTABLE),
                patch: PATCH,
            };
            barrier.wait();
            for _ in 0..64 {
                let result = store.dispatch_phase7_git_commit_with_sources_v1(
                    &input,
                    || Ok(DISPATCHED_AT.to_owned()),
                    || {
                        dispatches.fetch_add(1, Ordering::SeqCst);
                        Ok(())
                    },
                );
                if !matches!(
                    result,
                    Err(Phase7GitAdapterErrorV1::PersistenceFailed
                        | Phase7GitAdapterErrorV1::EvidenceDrift)
                ) {
                    return result;
                }
                std::thread::yield_now();
            }
            Err(Phase7GitAdapterErrorV1::PersistenceFailed)
        }));
    }
    let results = workers
        .into_iter()
        .map(|worker| worker.join().expect("race worker must not panic"))
        .collect::<Vec<_>>();
    assert_eq!(dispatches.load(Ordering::SeqCst), 1);
    assert!(
        results
            .iter()
            .filter(|result| result.as_ref().is_ok_and(|write| write.created))
            .count()
            <= 1
    );
    let mut store = SqliteStore::open(&database_path).expect("race store must reopen");
    let input = Phase7GitCommitDispatchInputV1 {
        project_ref: &project_ref,
        resource_ref: &resource_ref,
        authorization_id: &authorization_id,
        operation_id: &operation_id,
        consumption_id: &consumption_id,
        derived_request: &derived,
        repository_path: &repository_path,
        git_executable: Path::new(GIT_EXECUTABLE),
        patch: PATCH,
    };
    let replay = store
        .dispatch_phase7_git_commit_with_sources_v1(
            &input,
            || Ok(DISPATCHED_AT.to_owned()),
            || panic!("race replay must never dispatch"),
        )
        .expect("race consequence must reconcile");
    assert!(!replay.created);
    assert_eq!(table_count(&store, "lnsat_operation_attempts"), 1);
    assert_eq!(table_count(&store, "lnsat_operation_receipts"), 1);
    store.verify_schema().expect("race ledger must verify");
}

#[test]
fn phase7_git_adapter_rejects_dirty_target_before_dispatch() {
    let mut fixture = authorize_git_fixture(703);
    fs::write(fixture.repository.path.join("unexpected.txt"), b"dirty\n")
        .expect("dirty file must write");
    let error = {
        let (store, input) = fixture.parts();
        store
            .dispatch_phase7_git_commit_with_sources_v1(
                &input,
                || Ok(DISPATCHED_AT.to_owned()),
                || Ok(()),
            )
            .expect_err("dirty target must reject")
    };
    assert_eq!(error, Phase7GitAdapterErrorV1::TargetRejected);
    assert_eq!(table_count(&fixture.store, "lnsat_operation_attempts"), 0);
    assert_eq!(
        String::from_utf8(git(&fixture.repository.path, &["rev-parse", "HEAD"]))
            .expect("head must encode")
            .trim(),
        fixture.repository.identity.base_commit_oid
    );
}

#[test]
fn phase7_git_adapter_rejects_hidden_target_drift_before_dispatch() {
    let mut ignored_fixture = authorize_git_fixture(717);
    let exclude_path = ignored_fixture
        .repository
        .identity
        .git_dir_path
        .join("info/exclude");
    let mut exclude = fs::read(&exclude_path).expect("fixture exclude file must read");
    exclude.extend_from_slice(b"\nhidden-untracked.txt\n");
    fs::write(exclude_path, exclude).expect("fixture exclude file must write");
    fs::write(
        ignored_fixture.repository.path.join("hidden-untracked.txt"),
        b"hidden\n",
    )
    .expect("ignored untracked file must write");
    let ignored_error = {
        let (store, input) = ignored_fixture.parts();
        store
            .dispatch_phase7_git_commit_with_sources_v1(
                &input,
                || Ok(DISPATCHED_AT.to_owned()),
                || panic!("ignored untracked target must never dispatch"),
            )
            .expect_err("ignored untracked target must reject")
    };
    assert_eq!(ignored_error, Phase7GitAdapterErrorV1::TargetRejected);
    assert_eq!(
        table_count(&ignored_fixture.store, "lnsat_operation_attempts"),
        0
    );

    let mut assume_fixture = authorize_git_fixture(718);
    git(
        &assume_fixture.repository.path,
        &["update-index", "--assume-unchanged", "--", "fixture.txt"],
    );
    fs::write(
        assume_fixture.repository.path.join("fixture.txt"),
        b"assume-unchanged drift\n",
    )
    .expect("assume-unchanged drift must write");
    let assume_error = {
        let (store, input) = assume_fixture.parts();
        store
            .dispatch_phase7_git_commit_with_sources_v1(
                &input,
                || Ok(DISPATCHED_AT.to_owned()),
                || panic!("assume-unchanged target must never dispatch"),
            )
            .expect_err("assume-unchanged target must reject")
    };
    assert_eq!(assume_error, Phase7GitAdapterErrorV1::TargetRejected);
    assert_eq!(
        table_count(&assume_fixture.store, "lnsat_operation_attempts"),
        0
    );

    let mut skip_fixture = authorize_git_fixture(719);
    git(
        &skip_fixture.repository.path,
        &["update-index", "--skip-worktree", "--", "fixture.txt"],
    );
    fs::write(
        skip_fixture.repository.path.join("fixture.txt"),
        b"skip-worktree drift\n",
    )
    .expect("skip-worktree drift must write");
    let skip_error = {
        let (store, input) = skip_fixture.parts();
        store
            .dispatch_phase7_git_commit_with_sources_v1(
                &input,
                || Ok(DISPATCHED_AT.to_owned()),
                || panic!("skip-worktree target must never dispatch"),
            )
            .expect_err("skip-worktree target must reject")
    };
    assert_eq!(skip_error, Phase7GitAdapterErrorV1::TargetRejected);
    assert_eq!(
        table_count(&skip_fixture.store, "lnsat_operation_attempts"),
        0
    );
}

#[test]
fn phase7_git_adapter_rejects_derived_payload_and_reconciliation_drift() {
    let mut payload_fixture = authorize_git_fixture(710);
    payload_fixture.derived.request.action.arguments.insert(
        "expected_tree_oid".to_owned(),
        serde_json::json!("0".repeat(40)),
    );
    let error = {
        let (store, input) = payload_fixture.parts();
        store
            .dispatch_phase7_git_commit_with_sources_v1(
                &input,
                || Ok(DISPATCHED_AT.to_owned()),
                || panic!("drifted payload must never dispatch"),
            )
            .expect_err("derived payload drift must fail closed")
    };
    assert_eq!(error, Phase7GitAdapterErrorV1::EvidenceDrift);
    assert_eq!(
        table_count(&payload_fixture.store, "lnsat_operation_attempts"),
        0
    );

    let mut reconcile_fixture = authorize_git_fixture(711);
    {
        let (store, input) = reconcile_fixture.parts();
        store
            .dispatch_phase7_git_commit_with_sources_v1(
                &input,
                || Ok(DISPATCHED_AT.to_owned()),
                || Err(Phase7GitAdapterErrorV1::OutcomeUnknown),
            )
            .expect_err("lost response must remain unknown");
    }
    reconcile_fixture.derived.request.target.identity.insert(
        "repository_path".to_owned(),
        serde_json::json!("/tmp/substituted"),
    );
    let error = {
        let (store, input) = reconcile_fixture.parts();
        store
            .reconcile_phase7_git_commit_v1(&input)
            .expect_err("reconciliation drift must fail before Git")
    };
    assert_eq!(error, Phase7GitAdapterErrorV1::EvidenceDrift);
    assert_eq!(
        table_count(&reconcile_fixture.store, "lnsat_operation_receipts"),
        0
    );
}

#[cfg(unix)]
#[test]
fn phase7_git_adapter_rejects_external_object_storage_before_claim() {
    use std::os::unix::fs::symlink;

    let mut fixture = authorize_git_fixture(712);
    let external =
        std::env::temp_dir().join(format!("lnsat-external-git-objects-{}", std::process::id()));
    fs::create_dir(&external).expect("external object directory must create");
    let objects = fixture.repository.identity.git_dir_path.join("objects");
    let original = fixture
        .repository
        .identity
        .git_dir_path
        .join("objects.original");
    fs::rename(&objects, &original).expect("fixture objects must move");
    symlink(&external, &objects).expect("external objects symlink must create");
    let error = {
        let (store, input) = fixture.parts();
        store
            .dispatch_phase7_git_commit_with_sources_v1(
                &input,
                || Ok(DISPATCHED_AT.to_owned()),
                || panic!("external object store must never dispatch"),
            )
            .expect_err("external object store must fail closed")
    };
    assert_eq!(error, Phase7GitAdapterErrorV1::TargetRejected);
    assert_eq!(table_count(&fixture.store, "lnsat_operation_attempts"), 0);
    fs::remove_file(&objects).expect("objects symlink must remove");
    fs::rename(&original, &objects).expect("fixture objects must restore");
    fs::remove_dir(&external).expect("external object directory must remove");
}

#[cfg(unix)]
#[test]
fn phase7_git_adapter_rejects_nested_git_storage_symlinks_before_claim() {
    use std::os::unix::fs::symlink;

    for (sequence, relative) in [(714, "refs/heads"), (715, "objects/aa")] {
        let mut fixture = authorize_git_fixture(sequence);
        let external = std::env::temp_dir().join(format!(
            "lnsat-external-git-storage-{}-{sequence}",
            std::process::id()
        ));
        fs::create_dir(&external).expect("external storage directory must create");
        let target = fixture.repository.identity.git_dir_path.join(relative);
        if target.exists() {
            fs::remove_dir_all(&target).expect("nested storage directory must remove");
        }
        symlink(&external, &target).expect("nested storage symlink must create");
        let error = {
            let (store, input) = fixture.parts();
            store
                .dispatch_phase7_git_commit_with_sources_v1(
                    &input,
                    || Ok(DISPATCHED_AT.to_owned()),
                    || panic!("nested storage symlink must never dispatch"),
                )
                .expect_err("nested storage symlink must fail closed")
        };
        assert_eq!(error, Phase7GitAdapterErrorV1::TargetRejected);
        assert_eq!(table_count(&fixture.store, "lnsat_operation_attempts"), 0);
        fs::remove_file(&target).expect("nested storage symlink must remove");
        fs::remove_dir(&external).expect("external storage directory must remove");
    }
}

#[cfg(unix)]
#[test]
fn phase7_git_adapter_rejects_hard_linked_reflog_before_claim() {
    let mut fixture = authorize_git_fixture(716);
    let external =
        std::env::temp_dir().join(format!("lnsat-external-reflog-{}", std::process::id()));
    fs::write(&external, b"external\n").expect("external reflog target must write");
    let reflog = fixture.repository.identity.git_dir_path.join("logs/HEAD");
    fs::remove_file(&reflog).expect("fixture reflog must remove");
    fs::hard_link(&external, &reflog).expect("hard-linked reflog must create");
    let error = {
        let (store, input) = fixture.parts();
        store
            .dispatch_phase7_git_commit_with_sources_v1(
                &input,
                || Ok(DISPATCHED_AT.to_owned()),
                || panic!("hard-linked reflog must never dispatch"),
            )
            .expect_err("hard-linked reflog must fail closed")
    };
    assert_eq!(error, Phase7GitAdapterErrorV1::TargetRejected);
    assert_eq!(table_count(&fixture.store, "lnsat_operation_attempts"), 0);
    assert_eq!(
        fs::read(&external).expect("external target must read"),
        b"external\n"
    );
    fs::remove_file(&reflog).expect("hard-linked reflog must remove");
    fs::remove_file(&external).expect("external reflog target must remove");
}

#[test]
fn phase7_git_adapter_never_runs_repository_hooks() {
    use std::os::unix::fs::PermissionsExt as _;
    let mut fixture = authorize_git_fixture(704);
    let sentinel = fixture.repository.path.join("hook-ran");
    let hook = fixture.repository.path.join(".git/hooks/pre-commit");
    fs::write(
        &hook,
        format!("#!/bin/sh\ntouch '{}'\nexit 9\n", sentinel.display()),
    )
    .expect("malicious hook must write");
    fs::set_permissions(&hook, fs::Permissions::from_mode(0o755))
        .expect("malicious hook must become executable");
    {
        let (store, input) = fixture.parts();
        store
            .dispatch_phase7_git_commit_with_sources_v1(
                &input,
                || Ok(DISPATCHED_AT.to_owned()),
                || Ok(()),
            )
            .expect("plumbing commit must ignore hooks");
    }
    assert!(!sentinel.exists());
}

#[test]
fn phase7_git_adapter_receipt_audit_failure_preserves_consequence_for_reconciliation() {
    let mut fixture = authorize_git_fixture(705);
    fixture
        .store
        .connection
        .execute_batch(
            "CREATE TEMP TRIGGER phase7_git_test_reject_receipt_audit
             BEFORE INSERT ON lnsat_phase7_audit_bindings
             WHEN NEW.event_kind = 'receipt_recorded'
             BEGIN
               SELECT RAISE(ABORT, 'required Git receipt audit unavailable');
             END;",
        )
        .expect("receipt audit failure must install");
    let error = {
        let (store, input) = fixture.parts();
        store
            .dispatch_phase7_git_commit_with_sources_v1(
                &input,
                || Ok(DISPATCHED_AT.to_owned()),
                || Ok(()),
            )
            .expect_err("receipt audit failure must stay unknown")
    };
    assert_eq!(error, Phase7GitAdapterErrorV1::OutcomeUnknown);
    assert_eq!(table_count(&fixture.store, "lnsat_operation_receipts"), 0);
    fixture
        .store
        .connection
        .execute_batch("DROP TRIGGER phase7_git_test_reject_receipt_audit;")
        .expect("receipt audit failure must remove");
    {
        let (store, input) = fixture.parts();
        store
            .reconcile_phase7_git_commit_v1(&input)
            .expect("preserved consequence must reconcile");
    }
    assert_eq!(table_count(&fixture.store, "lnsat_operation_receipts"), 1);
}

#[test]
fn phase7_git_adapter_rejects_patch_drift_and_symlink_before_dispatch() {
    use std::os::unix::fs::symlink;
    let mut patch_fixture = authorize_git_fixture(706);
    let mut drifted_patch = PATCH.to_vec();
    drifted_patch.extend_from_slice(b"\n");
    let error = {
        let (store, mut input) = patch_fixture.parts();
        input.patch = &drifted_patch;
        store
            .dispatch_phase7_git_commit_with_sources_v1(
                &input,
                || Ok(DISPATCHED_AT.to_owned()),
                || Ok(()),
            )
            .expect_err("patch drift must reject")
    };
    assert_eq!(error, Phase7GitAdapterErrorV1::EvidenceDrift);
    assert_eq!(
        table_count(&patch_fixture.store, "lnsat_operation_attempts"),
        0
    );

    let mut symlink_fixture = authorize_git_fixture(707);
    let target = symlink_fixture.repository.path.join("outside.txt");
    fs::write(&target, b"outside\n").expect("outside target must write");
    fs::remove_file(symlink_fixture.repository.path.join("fixture.txt"))
        .expect("fixture file must remove");
    symlink(&target, symlink_fixture.repository.path.join("fixture.txt"))
        .expect("malicious symlink must create");
    let error = {
        let (store, input) = symlink_fixture.parts();
        store
            .dispatch_phase7_git_commit_with_sources_v1(
                &input,
                || Ok(DISPATCHED_AT.to_owned()),
                || Ok(()),
            )
            .expect_err("symlink target must reject")
    };
    assert_eq!(error, Phase7GitAdapterErrorV1::TargetRejected);
    assert_eq!(
        table_count(&symlink_fixture.store, "lnsat_operation_attempts"),
        0
    );
}

#[test]
fn phase7_git_adapter_reopen_verifier_detects_attempt_digest_tamper() {
    let mut fixture = authorize_git_fixture(708);
    {
        let (store, input) = fixture.parts();
        store
            .dispatch_phase7_git_commit_with_sources_v1(
                &input,
                || Ok(DISPATCHED_AT.to_owned()),
                || Ok(()),
            )
            .expect("baseline dispatch must succeed");
    }
    fixture.store.verify_schema().expect("baseline must verify");
    fixture
        .store
        .connection
        .execute_batch(
            "PRAGMA foreign_keys = OFF;
             DROP TRIGGER lnsat_phase7_entities_reject_update;
             UPDATE lnsat_phase7_entities
             SET record_digest = zeroblob(32)
             WHERE entity_kind = 'operation_attempt';
             CREATE TRIGGER lnsat_phase7_entities_reject_update
             BEFORE UPDATE ON lnsat_phase7_entities
             BEGIN
               SELECT RAISE(ABORT, 'phase7 entities are immutable');
             END;
             PRAGMA foreign_keys = ON;",
        )
        .expect("test-only attempt tamper must apply");
    assert_eq!(
        fixture.store.verify_schema(),
        Err(SqliteStoreError::MigrationDrift)
    );
}

#[test]
fn phase7_git_adapter_reopen_verifier_binds_reconciliation_to_receipt() {
    let mut fixture = authorize_git_fixture(713);
    {
        let (store, input) = fixture.parts();
        store
            .dispatch_phase7_git_commit_with_sources_v1(
                &input,
                || Ok(DISPATCHED_AT.to_owned()),
                || Err(Phase7GitAdapterErrorV1::OutcomeUnknown),
            )
            .expect_err("lost response must remain unknown");
    }
    {
        let (store, input) = fixture.parts();
        store
            .reconcile_phase7_git_commit_v1(&input)
            .expect("exact consequence must reconcile");
    }
    fixture.store.verify_schema().expect("baseline must verify");
    fixture
        .store
        .connection
        .execute_batch(
            "PRAGMA foreign_keys = OFF;
             DROP TRIGGER lnsat_operation_reconciliations_reject_update;
             UPDATE lnsat_operation_reconciliations
             SET observed_result_digest = zeroblob(32);
             CREATE TRIGGER lnsat_operation_reconciliations_reject_update
             BEFORE UPDATE ON lnsat_operation_reconciliations
             BEGIN
               SELECT RAISE(ABORT, 'operation reconciliations are immutable');
             END;
             PRAGMA foreign_keys = ON;",
        )
        .expect("test-only reconciliation tamper must apply");
    assert_eq!(
        fixture.store.verify_schema(),
        Err(SqliteStoreError::MigrationDrift)
    );
}
