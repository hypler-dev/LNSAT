use super::{
    SqliteStore, SqliteStoreError, canonical_utc_timestamp_millis_v1, verify_current_schema,
};
use crate::phase7_consumption::{
    Phase7CapabilityConsumptionRecordV1, Phase7CapabilityRedemptionInputV1,
    Phase7CapabilitySecretV1, append_phase7_operation_state_event_v1,
};
use crate::phase7_nonce::{canonical_system_time_v1, insert_entity_and_audit};
use crate::phase7_persistence::{
    Phase7PersistenceErrorV1, audit_binding_exists, blob_32, bounded_reference, digest_fields,
    phase7_entity_exists, valid_prefixed_id,
};
use lnsat_contracts::{
    DerivedExecutionRequestV1, is_valid_reference_v1, verify_derived_execution_request_v1,
};
use rusqlite::{Connection, OptionalExtension, Transaction, TransactionBehavior, params};
use sha2::{Digest, Sha256};
use std::ffi::OsStr;
use std::fmt;
use std::fs;
use std::io::{Read as _, Write as _};
#[cfg(unix)]
use std::os::unix::fs::{DirBuilderExt as _, MetadataExt as _, PermissionsExt as _};
use std::path::{Component, Path, PathBuf};
use std::process::{Command, ExitStatus, Stdio};
use std::thread;
use std::time::{Duration, Instant, SystemTime};
use zeroize::Zeroizing;

pub const PHASE7_GIT_ADAPTER_REF_V1: &str = "adapter:local:git-commit";
pub const PHASE7_GIT_ADAPTER_VERSION_V1: &str = "v1";
/// Exact Docker-local Git adapter identity used by Phase 11 served dispatch.
pub const PHASE11_DOCKER_GIT_ADAPTER_REF_V1: &str = "adapter:docker-local:git-commit";
/// Exact Docker-local Git adapter version used by Phase 11 served dispatch.
pub const PHASE11_DOCKER_GIT_ADAPTER_VERSION_V1: &str = "v1";
pub const PHASE7_GIT_FIXTURE_MARKER_V1: &str = ".lnsat-disposable-git-fixture-v1";
/// Exact supervised deadline for every bounded Git child process.
pub const PHASE8_GIT_PROCESS_DEADLINE_SECONDS_V1: u64 = 30;
/// Exact maximum retained Git stdout bytes. Stderr is never captured.
pub const PHASE8_GIT_MAX_STDOUT_BYTES_V1: usize = 1_048_576;

const ACTION_SCHEMA_V1: &str = "lnsat.git_commit_action.schema.v1";
const TARGET_SCHEMA_V1: &str = "lnsat.disposable_git_repository.schema.v1";
const PROTOCOL_VERSION_V1: &str = "lnsat.git-reference-adapter.protocol.v1";
const PHASE11_DOCKER_PROTOCOL_VERSION_V1: &str = "lnsat.adapter_process_protocol.docker_local.v1";
const RECEIPT_PROFILE_V1: &str = "local_authenticated_adapter_channel";
const CONFIGURATION_DIGEST_DOMAIN: &str = "lnsat.git-reference-adapter.configuration.v1";
const TOOL_ARGUMENTS_DIGEST_DOMAIN: &str = "lnsat.git-reference-adapter.tool-arguments.v1";
const ATTEMPT_ID_DOMAIN: &str = "lnsat.phase7.git-operation-attempt-id.v1";
const ATTEMPT_AUDIT_ID_DOMAIN: &str = "lnsat.phase7.git-operation-attempt-audit-id.v1";
const ATTEMPT_RECORD_DIGEST_DOMAIN: &str = "lnsat.phase7.git-operation-attempt-record.v1";
const RECEIPT_ID_DOMAIN: &str = "lnsat.phase7.git-receipt-id.v1";
const RECEIPT_AUDIT_ID_DOMAIN: &str = "lnsat.phase7.git-receipt-audit-id.v1";
const RECEIPT_RESULT_DIGEST_DOMAIN: &str = "lnsat.phase7.git-receipt-result.v1";
const RECEIPT_RECORD_DIGEST_DOMAIN: &str = "lnsat.phase7.git-receipt-record.v1";
const RECONCILIATION_ID_DOMAIN: &str = "lnsat.phase7.git-reconciliation-id.v1";
const RECONCILIATION_AUDIT_ID_DOMAIN: &str = "lnsat.phase7.git-reconciliation-audit-id.v1";
const RECONCILIATION_RECORD_DIGEST_DOMAIN: &str = "lnsat.phase7.git-reconciliation-record.v1";
const STATE_EVENT_ID_DOMAIN: &str = "lnsat.phase7.git-state-event-id.v1";
const STATE_AUDIT_ID_DOMAIN: &str = "lnsat.phase7.git-state-audit-id.v1";
const STATE_DIGEST_DOMAIN: &str = "lnsat.phase7.git-state.v1";
const STATE_RECORD_DIGEST_DOMAIN: &str = "lnsat.phase7.git-state-record.v1";
const LOWER_HEX: &[u8; 16] = b"0123456789abcdef";

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Phase7GitCommitMetadataV1 {
    pub message: String,
    pub author_name: String,
    pub author_email: String,
    pub author_time: String,
    pub committer_name: String,
    pub committer_email: String,
    pub committer_time: String,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Phase7GitRepositoryIdentityV1 {
    pub repository_path: PathBuf,
    pub git_dir_path: PathBuf,
    pub object_format: String,
    pub head_ref: String,
    pub base_commit_oid: String,
    pub fixture_marker_sha256: String,
}

#[derive(Clone, Copy, Debug)]
pub struct Phase7GitCommitDispatchInputV1<'a> {
    pub project_ref: &'a str,
    pub resource_ref: &'a str,
    pub authorization_id: &'a str,
    pub operation_id: &'a str,
    pub consumption_id: &'a str,
    pub derived_request: &'a DerivedExecutionRequestV1,
    pub repository_path: &'a Path,
    pub git_executable: &'a Path,
    pub patch: &'a [u8],
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Phase7GitCommitReceiptV1 {
    pub receipt_id: String,
    pub operation_id: String,
    pub operation_attempt_id: String,
    pub authorization_id: String,
    pub consumption_id: String,
    pub adapter_ref: String,
    pub adapter_version: String,
    pub commit_oid: String,
    pub tree_oid: String,
    pub changed_paths: Vec<String>,
    pub patch_sha256: String,
    pub metadata: Phase7GitCommitMetadataV1,
    pub result_digest: [u8; 32],
    pub received_at: String,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Phase7GitCommitWriteV1 {
    pub created: bool,
    pub receipt: Phase7GitCommitReceiptV1,
}

/// Exact disposable Git consequence revalidated after an external adapter run.
///
/// This is receipt-ready semantic evidence only. It carries no persistence,
/// authorization, replay, or served-route effect by itself.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Phase7GitExecutionResultV1 {
    pub commit_oid: String,
    pub tree_oid: String,
    pub changed_paths: Vec<String>,
    pub patch_sha256: String,
    pub metadata: Phase7GitCommitMetadataV1,
}

/// Exact server-owned inputs for one served Phase 8 composition. Repository,
/// patch, adapter, executable digest, and target identity remain approval-bound.
#[derive(Clone, Copy, Debug)]
pub struct Phase8RuntimeCompositionInputV1<'a> {
    pub redemption: Phase7CapabilityRedemptionInputV1<'a>,
    pub derived_request: &'a DerivedExecutionRequestV1,
    pub disposable_root: &'a Path,
    pub git_executable: &'a Path,
}

/// Exact server-owned inputs for one served Phase 11 Docker composition.
///
/// Docker process selection and profile validation remain daemon-owned. Store
/// owns atomic capability consumption, attempt claim, receipt persistence, and
/// restart-safe state transitions around caller-supplied bounded execution.
#[derive(Clone, Copy, Debug)]
pub struct Phase11DockerRuntimeCompositionInputV1<'a> {
    pub redemption: Phase7CapabilityRedemptionInputV1<'a>,
    pub derived_request: &'a DerivedExecutionRequestV1,
    pub disposable_root: &'a Path,
    pub verifier_git_executable: &'a Path,
}

/// Durable result of one atomic Phase 11 Docker attempt claim.
///
/// `created == false` is metadata-only replay. Caller must never launch Docker
/// unless `created == true` and returned attempt remains `dispatching`.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Phase11DockerRuntimeCompositionClaimV1 {
    pub created: bool,
    pub consumption: Phase7CapabilityConsumptionRecordV1,
    pub operation: Phase8OperationReadbackV1,
}

/// Secret-free operation-attempt readback.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Phase8OperationAttemptReadbackV1 {
    pub operation_attempt_id: String,
    pub audit_binding_id: String,
    pub operation_id: String,
    pub project_ref: String,
    pub resource_ref: String,
    pub attempt_sequence: u32,
    pub adapter_ref: String,
    pub protocol_version: String,
    pub tool_arguments_digest: [u8; 32],
    pub created_at: String,
    pub state_event_id: String,
    pub state_audit_binding_id: String,
    pub state_sequence: u32,
    pub state: String,
    pub state_effective_at: String,
}

/// Secret-free operation, attempt, receipt, and reconciliation readback.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Phase8OperationReadbackV1 {
    pub operation_id: String,
    pub operation_audit_binding_id: String,
    pub authorization_id: String,
    pub consumption_id: Option<String>,
    pub project_ref: String,
    pub resource_ref: String,
    pub state_event_id: String,
    pub state_audit_binding_id: String,
    pub state_sequence: u32,
    pub state: String,
    pub state_effective_at: String,
    pub attempt: Option<Phase8OperationAttemptReadbackV1>,
    pub receipt_id: Option<String>,
    pub receipt_received_at: Option<String>,
    pub reconciliation_id: Option<String>,
    pub reconciliation_status: Option<String>,
    pub reconciliation_recorded_at: Option<String>,
}

/// Result from first execution or exact metadata-only replay.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Phase8RuntimeCompositionWriteV1 {
    pub created: bool,
    pub consumption: Phase7CapabilityConsumptionRecordV1,
    pub operation: Phase8OperationReadbackV1,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Phase7GitAdapterErrorV1 {
    InvalidInput,
    AuthorizationNotConsumed,
    DispatchAlreadyClaimed,
    TargetRejected,
    GitRejected,
    ReceiptRejected,
    EvidenceDrift,
    PersistenceFailed,
    OutcomeUnknown,
}

impl Phase7GitAdapterErrorV1 {
    #[must_use]
    pub const fn code(self) -> &'static str {
        match self {
            Self::InvalidInput => "phase7_git_adapter.invalid_input",
            Self::AuthorizationNotConsumed => "phase7_git_adapter.authorization_not_consumed",
            Self::DispatchAlreadyClaimed => "phase7_git_adapter.dispatch_already_claimed",
            Self::TargetRejected => "phase7_git_adapter.target_rejected",
            Self::GitRejected => "phase7_git_adapter.git_rejected",
            Self::ReceiptRejected => "phase7_git_adapter.receipt_rejected",
            Self::EvidenceDrift => "phase7_git_adapter.evidence_drift",
            Self::PersistenceFailed => "phase7_git_adapter.persistence_failed",
            Self::OutcomeUnknown => "phase7_git_adapter.outcome_unknown",
        }
    }
}

impl fmt::Display for Phase7GitAdapterErrorV1 {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(self.code())
    }
}

impl std::error::Error for Phase7GitAdapterErrorV1 {}

struct ParsedGitRequest {
    identity: Phase7GitRepositoryIdentityV1,
    expected_tree_oid: String,
    allowed_paths: Vec<String>,
    patch_sha256: String,
    approved_patch: Option<Zeroizing<Vec<u8>>>,
    metadata: Phase7GitCommitMetadataV1,
}

#[derive(Clone, Debug)]
struct DispatchContext {
    project_ref: String,
    resource_ref: String,
    authorization_id: String,
    operation_id: String,
    consumption_id: String,
    action_digest: [u8; 32],
    target_digest: [u8; 32],
    configuration_digest: [u8; 32],
    executable_digest: [u8; 32],
    adapter_ref: String,
    operation_state: String,
}

#[derive(Clone, Debug)]
struct AttemptRecord {
    operation_attempt_id: String,
    audit_binding_id: String,
    project_ref: String,
    resource_ref: String,
    operation_id: String,
    attempt_sequence: i64,
    adapter_ref: String,
    protocol_version: String,
    tool_arguments_digest: [u8; 32],
    created_at: String,
}

#[must_use]
pub fn phase7_git_adapter_configuration_digest_v1() -> [u8; 32] {
    digest_fields(
        CONFIGURATION_DIGEST_DOMAIN,
        &[
            b"absolute-executable",
            b"cleared-environment",
            b"fixed-plumbing-argv",
            b"hooks-signing-credentials-editors-filters-disabled",
            b"no-network-subcommands",
            b"temporary-marked-repositories-only",
            b"temporary-index",
            b"compare-and-swap-ref-update",
            b"no-consequential-retry",
            b"exact-object-reconciliation",
            b"thirty-second-process-deadline",
            b"one-mebibyte-stdout-no-stderr",
        ],
    )
}

/// Recomputes exact bounded Git tool-argument identity from one verified
/// execution request without inspecting a repository or running Git.
///
/// Runtime-specific adapter identity is validated by its authority profile;
/// this helper validates the shared Git action, target, metadata, and digest
/// contract only.
///
/// # Errors
///
/// Rejects derived-request drift or any malformed Git action/target field.
pub fn phase7_git_tool_arguments_digest_v1(
    derived_request: &DerivedExecutionRequestV1,
) -> Result<[u8; 32], Phase7GitAdapterErrorV1> {
    verify_derived_execution_request_v1(derived_request)
        .map_err(|_| Phase7GitAdapterErrorV1::EvidenceDrift)?;
    let request = &derived_request.request;
    let parsed = parse_derived_request_for_adapter(
        &request.project_ref,
        &request.resource_ref,
        derived_request,
        None,
    )?;
    Ok(tool_arguments_digest(&parsed))
}

/// Revalidates one approved Docker-adapter target before external dispatch.
///
/// The target must be an exact marked descendant of the explicit disposable
/// root, remain at the approved base with a clean index/worktree, and carry the
/// approved patch bytes. This function launches no adapter and mutates nothing.
///
/// # Errors
///
/// Rejects request drift, adapter substitution, target/storage drift, an
/// unmarked or non-disposable repository, dirty state, or patch mismatch.
pub fn validate_phase11_disposable_git_target_v1(
    derived_request: &DerivedExecutionRequestV1,
    disposable_root: &Path,
    git_executable: &Path,
    expected_adapter_ref: &str,
) -> Result<Phase7GitRepositoryIdentityV1, Phase7GitAdapterErrorV1> {
    verify_derived_execution_request_v1(derived_request)
        .map_err(|_| Phase7GitAdapterErrorV1::EvidenceDrift)?;
    if !is_valid_reference_v1(expected_adapter_ref) || expected_adapter_ref.contains('@') {
        return Err(Phase7GitAdapterErrorV1::InvalidInput);
    }
    let request = &derived_request.request;
    let parsed = parse_derived_request_for_adapter(
        &request.project_ref,
        &request.resource_ref,
        derived_request,
        Some(expected_adapter_ref),
    )?;
    let patch = parsed
        .approved_patch
        .as_deref()
        .ok_or(Phase7GitAdapterErrorV1::InvalidInput)?;
    let root = canonical_phase8_disposable_root_v1(disposable_root)?;
    let actual = inspect_phase7_disposable_git_repository_v1(
        &parsed.identity.repository_path,
        git_executable,
    )?;
    if actual != parsed.identity
        || actual.repository_path == root
        || !actual.repository_path.starts_with(&root)
    {
        return Err(Phase7GitAdapterErrorV1::TargetRejected);
    }
    validate_clean_target(git_executable, &actual)?;
    validate_path_safety(&actual.repository_path, &parsed.allowed_paths)?;
    if prefixed_sha256(patch) != parsed.patch_sha256 {
        return Err(Phase7GitAdapterErrorV1::EvidenceDrift);
    }
    Ok(actual)
}

/// Revalidates one exact disposable Git consequence after external dispatch.
///
/// Worktree and index must still represent the approved base while the exact
/// approved ref points at the one expected commit/tree. No receipt is persisted.
///
/// # Errors
///
/// Rejects request drift, target substitution, dirty state, missing or altered
/// consequence, unexpected paths, commit metadata drift, or patch mismatch.
pub fn inspect_phase11_disposable_git_result_v1(
    derived_request: &DerivedExecutionRequestV1,
    disposable_root: &Path,
    git_executable: &Path,
    expected_adapter_ref: &str,
) -> Result<Phase7GitExecutionResultV1, Phase7GitAdapterErrorV1> {
    verify_derived_execution_request_v1(derived_request)
        .map_err(|_| Phase7GitAdapterErrorV1::EvidenceDrift)?;
    if !is_valid_reference_v1(expected_adapter_ref) || expected_adapter_ref.contains('@') {
        return Err(Phase7GitAdapterErrorV1::InvalidInput);
    }
    let request = &derived_request.request;
    let parsed = parse_derived_request_for_adapter(
        &request.project_ref,
        &request.resource_ref,
        derived_request,
        Some(expected_adapter_ref),
    )?;
    let patch = parsed
        .approved_patch
        .as_deref()
        .ok_or(Phase7GitAdapterErrorV1::InvalidInput)?;
    let root = canonical_phase8_disposable_root_v1(disposable_root)?;
    let actual = inspect_phase7_disposable_git_repository_v1(
        &parsed.identity.repository_path,
        git_executable,
    )?;
    if actual.repository_path != parsed.identity.repository_path
        || actual.git_dir_path != parsed.identity.git_dir_path
        || actual.object_format != parsed.identity.object_format
        || actual.head_ref != parsed.identity.head_ref
        || actual.fixture_marker_sha256 != parsed.identity.fixture_marker_sha256
        || actual.repository_path == root
        || !actual.repository_path.starts_with(&root)
    {
        return Err(Phase7GitAdapterErrorV1::TargetRejected);
    }
    validate_phase8_approved_base_index_and_worktree_v1(
        git_executable,
        &actual,
        &parsed.identity.base_commit_oid,
    )?;
    validate_path_safety(&actual.repository_path, &parsed.allowed_paths)?;
    if prefixed_sha256(patch) != parsed.patch_sha256 {
        return Err(Phase7GitAdapterErrorV1::EvidenceDrift);
    }
    let commit_oid = inspect_exact_consequence(git_executable, &parsed.identity, &parsed, None)?;
    Ok(Phase7GitExecutionResultV1 {
        commit_oid,
        tree_oid: parsed.expected_tree_oid,
        changed_paths: parsed.allowed_paths,
        patch_sha256: parsed.patch_sha256,
        metadata: parsed.metadata,
    })
}

/// Hashes the canonical executable bytes used by the bounded Git adapter.
///
/// # Errors
///
/// Returns [`Phase7GitAdapterErrorV1::TargetRejected`] when `path` cannot be
/// canonicalized to an absolute regular file or its bytes cannot be read.
pub fn phase7_git_executable_digest_v1(path: &Path) -> Result<[u8; 32], Phase7GitAdapterErrorV1> {
    let canonical = fs::canonicalize(path).map_err(|_| Phase7GitAdapterErrorV1::TargetRejected)?;
    if !canonical.is_absolute() || !canonical.is_file() {
        return Err(Phase7GitAdapterErrorV1::TargetRejected);
    }
    let bytes = fs::read(canonical).map_err(|_| Phase7GitAdapterErrorV1::TargetRejected)?;
    Ok(Sha256::digest(bytes).into())
}

/// Inspects and validates a marked disposable Git repository.
///
/// # Errors
///
/// Returns [`Phase7GitAdapterErrorV1`] when executable or repository identity,
/// storage containment, marker, object format, head, or base commit is invalid.
pub fn inspect_phase7_disposable_git_repository_v1(
    repository_path: &Path,
    git_executable: &Path,
) -> Result<Phase7GitRepositoryIdentityV1, Phase7GitAdapterErrorV1> {
    let repository_path = canonical_disposable_root(repository_path)?;
    inspect_disposable_git_repository_at_v1(&repository_path, git_executable)
}

fn inspect_disposable_git_repository_at_v1(
    repository_path: &Path,
    git_executable: &Path,
) -> Result<Phase7GitRepositoryIdentityV1, Phase7GitAdapterErrorV1> {
    let executable = canonical_git_executable(git_executable)?;
    let git_dir = git_text(
        &executable,
        repository_path,
        &["rev-parse", "--absolute-git-dir"],
        &[],
    )?;
    let git_dir_path =
        fs::canonicalize(git_dir.trim()).map_err(|_| Phase7GitAdapterErrorV1::TargetRejected)?;
    if !git_dir_path.starts_with(repository_path) {
        return Err(Phase7GitAdapterErrorV1::TargetRejected);
    }
    validate_git_storage_boundary(&executable, repository_path, &git_dir_path)?;
    let top = git_text(
        &executable,
        repository_path,
        &["rev-parse", "--show-toplevel"],
        &[],
    )?;
    if fs::canonicalize(top.trim()).map_err(|_| Phase7GitAdapterErrorV1::TargetRejected)?
        != repository_path
    {
        return Err(Phase7GitAdapterErrorV1::TargetRejected);
    }
    let object_format = git_text(
        &executable,
        repository_path,
        &["rev-parse", "--show-object-format"],
        &[],
    )?;
    let object_format = object_format.trim().to_owned();
    if object_format != "sha1" {
        return Err(Phase7GitAdapterErrorV1::TargetRejected);
    }
    let head_ref = git_text(
        &executable,
        repository_path,
        &["symbolic-ref", "-q", "HEAD"],
        &[],
    )?;
    let head_ref = head_ref.trim().to_owned();
    if !valid_head_ref(&head_ref) {
        return Err(Phase7GitAdapterErrorV1::TargetRejected);
    }
    let base_commit_oid = git_text(
        &executable,
        repository_path,
        &["rev-parse", "--verify", "HEAD^{commit}"],
        &[],
    )?;
    let base_commit_oid = base_commit_oid.trim().to_owned();
    if !valid_oid(&base_commit_oid) {
        return Err(Phase7GitAdapterErrorV1::TargetRejected);
    }
    let marker = repository_path.join(PHASE7_GIT_FIXTURE_MARKER_V1);
    let marker_metadata =
        fs::symlink_metadata(&marker).map_err(|_| Phase7GitAdapterErrorV1::TargetRejected)?;
    if !marker_metadata.file_type().is_file() || marker_metadata.file_type().is_symlink() {
        return Err(Phase7GitAdapterErrorV1::TargetRejected);
    }
    let marker_bytes = fs::read(marker).map_err(|_| Phase7GitAdapterErrorV1::TargetRejected)?;
    if marker_bytes.is_empty() || marker_bytes.len() > 1024 {
        return Err(Phase7GitAdapterErrorV1::TargetRejected);
    }
    Ok(Phase7GitRepositoryIdentityV1 {
        repository_path: repository_path.to_path_buf(),
        git_dir_path,
        object_format,
        head_ref,
        base_commit_oid,
        fixture_marker_sha256: prefixed_sha256(&marker_bytes),
    })
}

/// Executes one exact approved Git consequence through a remapped container mount.
///
/// The approval-bound host path must differ from the canonical mounted path. All
/// non-path repository identity, action, patch, metadata, and tool arguments
/// remain exact. The temporary index lives inside the already-approved writable
/// Git storage because the surrounding container root filesystem is read-only.
/// This function grants no capability, persists no receipt, and performs no
/// Docker operation.
///
/// # Errors
///
/// Rejects malformed or drifted authority evidence, direct host-path execution,
/// mount substitution, dirty state, unsafe paths, Git failure, or ambiguous
/// consequence evidence.
pub fn execute_phase11_mapped_disposable_git_commit_v1(
    derived_request: &DerivedExecutionRequestV1,
    mounted_repository_path: &Path,
    git_executable: &Path,
    operation_id: &str,
) -> Result<Phase7GitExecutionResultV1, Phase7GitAdapterErrorV1> {
    verify_derived_execution_request_v1(derived_request)
        .map_err(|_| Phase7GitAdapterErrorV1::EvidenceDrift)?;
    if !valid_prefixed_id(operation_id, "opn_") {
        return Err(Phase7GitAdapterErrorV1::InvalidInput);
    }
    let request = &derived_request.request;
    let parsed = parse_derived_request_for_adapter(
        &request.project_ref,
        &request.resource_ref,
        derived_request,
        Some(PHASE11_DOCKER_GIT_ADAPTER_REF_V1),
    )?;
    let patch = parsed
        .approved_patch
        .as_deref()
        .ok_or(Phase7GitAdapterErrorV1::InvalidInput)?;
    let mounted_repository_path = canonical_mapped_repository_v1(mounted_repository_path)?;
    let actual = inspect_disposable_git_repository_at_v1(&mounted_repository_path, git_executable)?;
    if actual.repository_path == parsed.identity.repository_path
        || actual.git_dir_path == parsed.identity.git_dir_path
        || actual.object_format != parsed.identity.object_format
        || actual.head_ref != parsed.identity.head_ref
        || actual.base_commit_oid != parsed.identity.base_commit_oid
        || actual.fixture_marker_sha256 != parsed.identity.fixture_marker_sha256
    {
        return Err(Phase7GitAdapterErrorV1::TargetRejected);
    }
    validate_clean_target(git_executable, &actual)?;
    validate_path_safety(&actual.repository_path, &parsed.allowed_paths)?;
    if prefixed_sha256(patch) != parsed.patch_sha256 {
        return Err(Phase7GitAdapterErrorV1::EvidenceDrift);
    }
    let commit_oid = execute_git_commit_with_index_parent(
        git_executable,
        &actual,
        &parsed,
        patch,
        operation_id,
        &actual.git_dir_path,
    )?;
    Ok(Phase7GitExecutionResultV1 {
        commit_oid,
        tree_oid: parsed.expected_tree_oid,
        changed_paths: parsed.allowed_paths,
        patch_sha256: parsed.patch_sha256,
        metadata: parsed.metadata,
    })
}

impl SqliteStore {
    /// Dispatches one previously authorized commit into a disposable repository.
    ///
    /// # Errors
    ///
    /// Returns [`Phase7GitAdapterErrorV1`] when authorization evidence, target,
    /// Git execution, persistence, or reconciliation invariants fail.
    pub fn dispatch_phase7_git_commit_v1(
        &mut self,
        input: &Phase7GitCommitDispatchInputV1<'_>,
    ) -> Result<Phase7GitCommitWriteV1, Phase7GitAdapterErrorV1> {
        self.dispatch_phase7_git_commit_from_sources_v1(
            input,
            || canonical_system_time_v1(SystemTime::now()).map_err(map_persistence),
            || Ok(()),
        )
    }

    #[cfg(test)]
    pub(super) fn dispatch_phase7_git_commit_with_sources_v1<C, A>(
        &mut self,
        input: &Phase7GitCommitDispatchInputV1<'_>,
        clock: C,
        after_consequence: A,
    ) -> Result<Phase7GitCommitWriteV1, Phase7GitAdapterErrorV1>
    where
        C: Fn() -> Result<String, Phase7GitAdapterErrorV1>,
        A: FnOnce() -> Result<(), Phase7GitAdapterErrorV1>,
    {
        self.dispatch_phase7_git_commit_from_sources_v1(input, clock, after_consequence)
    }

    fn dispatch_phase7_git_commit_from_sources_v1<C, A>(
        &mut self,
        input: &Phase7GitCommitDispatchInputV1<'_>,
        clock: C,
        after_consequence: A,
    ) -> Result<Phase7GitCommitWriteV1, Phase7GitAdapterErrorV1>
    where
        C: Fn() -> Result<String, Phase7GitAdapterErrorV1>,
        A: FnOnce() -> Result<(), Phase7GitAdapterErrorV1>,
    {
        validate_scope(input)?;
        verify_derived_execution_request_v1(input.derived_request)
            .map_err(|_| Phase7GitAdapterErrorV1::EvidenceDrift)?;
        let parsed = parse_request(input)?;
        if select_attempt(&self.connection, input.operation_id)?.is_some() {
            return self.reconcile_phase7_git_commit_v1(input);
        }
        let actual_identity = inspect_phase7_disposable_git_repository_v1(
            input.repository_path,
            input.git_executable,
        )?;
        if actual_identity != parsed.identity {
            return Err(Phase7GitAdapterErrorV1::TargetRejected);
        }
        validate_clean_target(input.git_executable, &actual_identity)?;
        validate_path_safety(&actual_identity.repository_path, &parsed.allowed_paths)?;
        if prefixed_sha256(input.patch) != parsed.patch_sha256 {
            return Err(Phase7GitAdapterErrorV1::EvidenceDrift);
        }
        let executable_digest = phase7_git_executable_digest_v1(input.git_executable)?;
        if executable_digest != input.derived_request.executable_digest
            || phase7_git_adapter_configuration_digest_v1()
                != input.derived_request.configuration_digest
        {
            return Err(Phase7GitAdapterErrorV1::EvidenceDrift);
        }

        let claimed_at = clock()?;
        let attempt = match self.claim_phase7_git_dispatch_v1(input, &parsed, &claimed_at) {
            Ok(attempt) => attempt,
            Err(Phase7GitAdapterErrorV1::DispatchAlreadyClaimed) => {
                return self.reconcile_phase7_git_commit_v1(input);
            }
            Err(error) => return Err(error),
        };

        let commit_oid = match execute_git_commit(
            input.git_executable,
            &actual_identity,
            &parsed,
            input.patch,
            input.operation_id,
        ) {
            Ok(commit_oid) => commit_oid,
            Err(error) => {
                let _ = error;
                let _ = self.mark_phase7_git_outcome_unknown_v1(&attempt, &clock()?);
                return Err(Phase7GitAdapterErrorV1::OutcomeUnknown);
            }
        };
        if after_consequence().is_err() {
            let _ = self.mark_phase7_git_outcome_unknown_v1(&attempt, &clock()?);
            return Err(Phase7GitAdapterErrorV1::OutcomeUnknown);
        }
        let received_at = clock()?;
        let receipt = build_receipt(input, &attempt, &parsed, &commit_oid, &received_at);
        if self
            .persist_phase7_git_receipt_v1(&attempt, &receipt, &received_at)
            .is_ok()
        {
            Ok(Phase7GitCommitWriteV1 {
                created: true,
                receipt,
            })
        } else {
            let _ = self.mark_phase7_git_outcome_unknown_v1(&attempt, &received_at);
            Err(Phase7GitAdapterErrorV1::OutcomeUnknown)
        }
    }

    /// Reconciles an ambiguous commit attempt using exact stored evidence.
    ///
    /// # Errors
    ///
    /// Returns [`Phase7GitAdapterErrorV1`] when stored authorization, executable,
    /// target, Git objects, receipt, or audit evidence cannot be verified exactly.
    pub fn reconcile_phase7_git_commit_v1(
        &mut self,
        input: &Phase7GitCommitDispatchInputV1<'_>,
    ) -> Result<Phase7GitCommitWriteV1, Phase7GitAdapterErrorV1> {
        validate_scope(input)?;
        verify_derived_execution_request_v1(input.derived_request)
            .map_err(|_| Phase7GitAdapterErrorV1::EvidenceDrift)?;
        let parsed = parse_request(input)?;
        let context = read_dispatch_context(&self.connection, input)?;
        verify_dispatch_context(input, &context)?;
        if prefixed_sha256(input.patch) != parsed.patch_sha256 {
            return Err(Phase7GitAdapterErrorV1::EvidenceDrift);
        }
        let executable_digest = phase7_git_executable_digest_v1(input.git_executable)?;
        if executable_digest != input.derived_request.executable_digest
            || phase7_git_adapter_configuration_digest_v1()
                != input.derived_request.configuration_digest
        {
            return Err(Phase7GitAdapterErrorV1::EvidenceDrift);
        }
        let actual_identity = inspect_phase7_disposable_git_repository_v1(
            input.repository_path,
            input.git_executable,
        )?;
        if actual_identity.repository_path != parsed.identity.repository_path
            || actual_identity.git_dir_path != parsed.identity.git_dir_path
            || actual_identity.object_format != parsed.identity.object_format
            || actual_identity.head_ref != parsed.identity.head_ref
            || actual_identity.fixture_marker_sha256 != parsed.identity.fixture_marker_sha256
        {
            return Err(Phase7GitAdapterErrorV1::TargetRejected);
        }
        let attempt = self.read_phase7_git_attempt_v1(input)?;
        if attempt.tool_arguments_digest != tool_arguments_digest(&parsed) {
            return Err(Phase7GitAdapterErrorV1::EvidenceDrift);
        }
        if let Some(receipt) = self.read_phase7_git_receipt_v1(input, &attempt, &parsed)? {
            return Ok(Phase7GitCommitWriteV1 {
                created: false,
                receipt,
            });
        }
        if actual_identity.base_commit_oid == parsed.identity.base_commit_oid {
            return Err(Phase7GitAdapterErrorV1::OutcomeUnknown);
        }
        let commit_oid =
            inspect_exact_consequence(input.git_executable, &parsed.identity, &parsed, None)?;
        let recorded_at = canonical_system_time_v1(SystemTime::now()).map_err(map_persistence)?;
        let receipt = build_receipt(input, &attempt, &parsed, &commit_oid, &recorded_at);
        self.persist_phase7_git_reconciliation_and_receipt_v1(&attempt, &receipt, &recorded_at)?;
        Ok(Phase7GitCommitWriteV1 {
            created: false,
            receipt,
        })
    }

    fn claim_phase7_git_dispatch_v1(
        &mut self,
        input: &Phase7GitCommitDispatchInputV1<'_>,
        parsed: &ParsedGitRequest,
        claimed_at: &str,
    ) -> Result<AttemptRecord, Phase7GitAdapterErrorV1> {
        canonical_utc_timestamp_millis_v1(claimed_at)
            .ok_or(Phase7GitAdapterErrorV1::InvalidInput)?;
        let transaction = self
            .connection
            .transaction_with_behavior(TransactionBehavior::Immediate)
            .map_err(|_| Phase7GitAdapterErrorV1::PersistenceFailed)?;
        verify_current_schema(&transaction).map_err(|_| Phase7GitAdapterErrorV1::EvidenceDrift)?;
        let attempt =
            claim_phase8_git_dispatch_in_transaction_v1(&transaction, input, parsed, claimed_at)?;
        transaction
            .commit()
            .map_err(|_| Phase7GitAdapterErrorV1::PersistenceFailed)?;
        Ok(attempt)
    }

    fn read_phase7_git_attempt_v1(
        &self,
        input: &Phase7GitCommitDispatchInputV1<'_>,
    ) -> Result<AttemptRecord, Phase7GitAdapterErrorV1> {
        select_attempt(&self.connection, input.operation_id)?
            .ok_or(Phase7GitAdapterErrorV1::AuthorizationNotConsumed)
    }

    fn persist_phase7_git_receipt_v1(
        &mut self,
        attempt: &AttemptRecord,
        receipt: &Phase7GitCommitReceiptV1,
        recorded_at: &str,
    ) -> Result<(), Phase7GitAdapterErrorV1> {
        let transaction = self
            .connection
            .transaction_with_behavior(TransactionBehavior::Immediate)
            .map_err(|_| Phase7GitAdapterErrorV1::PersistenceFailed)?;
        verify_current_schema(&transaction).map_err(|_| Phase7GitAdapterErrorV1::EvidenceDrift)?;
        insert_receipt(&transaction, attempt, receipt)?;
        append_state_event(
            &transaction,
            &attempt.project_ref,
            &attempt.resource_ref,
            &attempt.operation_attempt_id,
            "operation_attempt",
            "completed",
            recorded_at,
            "operation_attempt_state_recorded",
            "receipt_bound",
        )?;
        append_phase7_operation_state_event_v1(
            &transaction,
            &attempt.project_ref,
            &attempt.resource_ref,
            &attempt.operation_id,
            "completed",
            recorded_at,
        )
        .map_err(map_persistence)?;
        transaction
            .commit()
            .map_err(|_| Phase7GitAdapterErrorV1::OutcomeUnknown)
    }

    fn persist_phase7_git_reconciliation_and_receipt_v1(
        &mut self,
        attempt: &AttemptRecord,
        receipt: &Phase7GitCommitReceiptV1,
        recorded_at: &str,
    ) -> Result<(), Phase7GitAdapterErrorV1> {
        let transaction = self
            .connection
            .transaction_with_behavior(TransactionBehavior::Immediate)
            .map_err(|_| Phase7GitAdapterErrorV1::PersistenceFailed)?;
        verify_current_schema(&transaction).map_err(|_| Phase7GitAdapterErrorV1::EvidenceDrift)?;
        insert_receipt(&transaction, attempt, receipt)?;
        insert_reconciliation(&transaction, attempt, receipt, recorded_at)?;
        append_state_event(
            &transaction,
            &attempt.project_ref,
            &attempt.resource_ref,
            &attempt.operation_attempt_id,
            "operation_attempt",
            "completed",
            recorded_at,
            "operation_attempt_state_recorded",
            "receipt_bound",
        )?;
        append_phase7_operation_state_event_v1(
            &transaction,
            &attempt.project_ref,
            &attempt.resource_ref,
            &attempt.operation_id,
            "completed",
            recorded_at,
        )
        .map_err(map_persistence)?;
        transaction
            .commit()
            .map_err(|_| Phase7GitAdapterErrorV1::OutcomeUnknown)
    }

    fn mark_phase7_git_outcome_unknown_v1(
        &mut self,
        attempt: &AttemptRecord,
        recorded_at: &str,
    ) -> Result<(), Phase7GitAdapterErrorV1> {
        self.mark_phase7_git_state_v1(attempt, "outcome_unknown", recorded_at)
    }

    fn mark_phase7_git_state_v1(
        &mut self,
        attempt: &AttemptRecord,
        state: &str,
        recorded_at: &str,
    ) -> Result<(), Phase7GitAdapterErrorV1> {
        let transaction = self
            .connection
            .transaction_with_behavior(TransactionBehavior::Immediate)
            .map_err(|_| Phase7GitAdapterErrorV1::PersistenceFailed)?;
        append_state_event(
            &transaction,
            &attempt.project_ref,
            &attempt.resource_ref,
            &attempt.operation_attempt_id,
            "operation_attempt",
            state,
            recorded_at,
            "operation_attempt_state_recorded",
            if state == "outcome_unknown" {
                "adapter_executed"
            } else {
                "none"
            },
        )?;
        append_phase7_operation_state_event_v1(
            &transaction,
            &attempt.project_ref,
            &attempt.resource_ref,
            &attempt.operation_id,
            state,
            recorded_at,
        )
        .map_err(map_persistence)?;
        transaction
            .commit()
            .map_err(|_| Phase7GitAdapterErrorV1::PersistenceFailed)
    }

    fn read_phase7_git_receipt_v1(
        &self,
        input: &Phase7GitCommitDispatchInputV1<'_>,
        attempt: &AttemptRecord,
        parsed: &ParsedGitRequest,
    ) -> Result<Option<Phase7GitCommitReceiptV1>, Phase7GitAdapterErrorV1> {
        let stored: Option<(String, Vec<u8>, String)> = self
            .connection
            .query_row(
                "SELECT receipt_id, result_digest, received_at
                 FROM lnsat_operation_receipts
                 WHERE operation_id = ?1 AND operation_attempt_id = ?2",
                params![input.operation_id, &attempt.operation_attempt_id],
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
            )
            .optional()
            .map_err(|_| Phase7GitAdapterErrorV1::PersistenceFailed)?;
        let Some((receipt_id, stored_digest, received_at)) = stored else {
            return Ok(None);
        };
        let commit_oid =
            inspect_exact_consequence(input.git_executable, &parsed.identity, parsed, None)?;
        let receipt = build_receipt(input, attempt, parsed, &commit_oid, &received_at);
        if receipt.receipt_id != receipt_id
            || receipt.result_digest
                != blob_32(stored_digest).map_err(|_| Phase7GitAdapterErrorV1::EvidenceDrift)?
        {
            return Err(Phase7GitAdapterErrorV1::EvidenceDrift);
        }
        Ok(Some(receipt))
    }

    /// Atomically consumes one capability and claims one Git attempt before
    /// launching any consequence. Exact replay returns readback and never
    /// launches Git again.
    ///
    /// # Errors
    ///
    /// Fails closed for source, session, capability, target, claim, Git,
    /// persistence, or ambiguous outcome failure.
    pub fn execute_phase8_runtime_composition_v1(
        &mut self,
        input: &Phase8RuntimeCompositionInputV1<'_>,
        capability: Phase7CapabilitySecretV1,
        raw_session_token: &str,
        raw_csrf_token: &str,
    ) -> Result<Phase8RuntimeCompositionWriteV1, Phase7GitAdapterErrorV1> {
        self.execute_phase8_runtime_composition_from_sources_v1(
            input,
            capability,
            raw_session_token,
            raw_csrf_token,
            || canonical_system_time_v1(SystemTime::now()).map_err(map_persistence),
            || Ok(()),
            || Ok(()),
            || Ok(()),
        )
    }

    #[cfg(test)]
    #[allow(clippy::too_many_arguments)]
    pub(super) fn execute_phase8_runtime_composition_with_sources_v1<C, P, A, X>(
        &mut self,
        input: &Phase8RuntimeCompositionInputV1<'_>,
        capability: Phase7CapabilitySecretV1,
        raw_session_token: &str,
        raw_csrf_token: &str,
        clock: C,
        precommit: P,
        after_commit: A,
        after_consequence: X,
    ) -> Result<Phase8RuntimeCompositionWriteV1, Phase7GitAdapterErrorV1>
    where
        C: FnOnce() -> Result<String, Phase7GitAdapterErrorV1>,
        P: FnOnce() -> Result<(), Phase7PersistenceErrorV1>,
        A: FnOnce() -> Result<(), Phase7PersistenceErrorV1>,
        X: FnOnce() -> Result<(), Phase7GitAdapterErrorV1>,
    {
        self.execute_phase8_runtime_composition_from_sources_v1(
            input,
            capability,
            raw_session_token,
            raw_csrf_token,
            clock,
            precommit,
            after_commit,
            after_consequence,
        )
    }

    #[allow(clippy::too_many_arguments, clippy::too_many_lines)]
    fn execute_phase8_runtime_composition_from_sources_v1<C, P, A, X>(
        &mut self,
        input: &Phase8RuntimeCompositionInputV1<'_>,
        capability: Phase7CapabilitySecretV1,
        raw_session_token: &str,
        raw_csrf_token: &str,
        clock: C,
        precommit: P,
        after_commit: A,
        after_consequence: X,
    ) -> Result<Phase8RuntimeCompositionWriteV1, Phase7GitAdapterErrorV1>
    where
        C: FnOnce() -> Result<String, Phase7GitAdapterErrorV1>,
        P: FnOnce() -> Result<(), Phase7PersistenceErrorV1>,
        A: FnOnce() -> Result<(), Phase7PersistenceErrorV1>,
        X: FnOnce() -> Result<(), Phase7GitAdapterErrorV1>,
    {
        verify_derived_execution_request_v1(input.derived_request)
            .map_err(|_| Phase7GitAdapterErrorV1::EvidenceDrift)?;
        let parsed = parse_derived_request(
            input.redemption.project_ref,
            input.redemption.resource_ref,
            input.derived_request,
        )?;
        let patch = parsed
            .approved_patch
            .as_deref()
            .ok_or(Phase7GitAdapterErrorV1::EvidenceDrift)?;
        let existing_consumption = self
            .read_phase8_operation_v1(input.redemption.operation_id)?
            .and_then(|operation| operation.consumption_id)
            .is_some();
        if !existing_consumption {
            validate_phase8_runtime_target_v1(input, &parsed, patch)?;
        }

        let claimed_at = clock()?;
        let redemption = input.redemption;
        let redemption_result = self
            .redeem_phase7_local_execution_capability_with_transaction_hook_v1(
                &redemption,
                capability,
                (raw_session_token, raw_csrf_token),
                (
                    || Ok(claimed_at.clone()),
                    |transaction, consumption, consumed_at| {
                        let dispatch = Phase7GitCommitDispatchInputV1 {
                            project_ref: redemption.project_ref,
                            resource_ref: redemption.resource_ref,
                            authorization_id: redemption.authorization_id,
                            operation_id: redemption.operation_id,
                            consumption_id: &consumption.consumption_id,
                            derived_request: input.derived_request,
                            repository_path: &parsed.identity.repository_path,
                            git_executable: input.git_executable,
                            patch,
                        };
                        claim_phase8_git_dispatch_in_transaction_v1(
                            transaction,
                            &dispatch,
                            &parsed,
                            consumed_at,
                        )
                        .map_err(map_claim_to_persistence)
                    },
                    precommit,
                    after_commit,
                ),
            );
        let (consumption, attempt) = match redemption_result {
            Ok(value) => value,
            Err(Phase7PersistenceErrorV1::OutcomeAmbiguous) => {
                if let Ok(Some(attempt)) = select_attempt(&self.connection, redemption.operation_id)
                {
                    let recorded_at = now_or_claimed(&claimed_at);
                    let _ = self.mark_phase7_git_outcome_unknown_v1(&attempt, &recorded_at);
                }
                return Err(Phase7GitAdapterErrorV1::OutcomeUnknown);
            }
            Err(error) => return Err(map_atomic_persistence(error)),
        };

        let Some(attempt) = attempt else {
            let operation = self
                .read_phase8_operation_v1(redemption.operation_id)?
                .ok_or(Phase7GitAdapterErrorV1::EvidenceDrift)?;
            return Ok(Phase8RuntimeCompositionWriteV1 {
                created: false,
                consumption: consumption.record,
                operation,
            });
        };

        if validate_phase8_runtime_target_v1(input, &parsed, patch).is_err() {
            let _ = self.mark_phase7_git_outcome_unknown_v1(&attempt, &now_or_claimed(&claimed_at));
            return Err(Phase7GitAdapterErrorV1::OutcomeUnknown);
        }
        let dispatch = Phase7GitCommitDispatchInputV1 {
            project_ref: redemption.project_ref,
            resource_ref: redemption.resource_ref,
            authorization_id: redemption.authorization_id,
            operation_id: redemption.operation_id,
            consumption_id: &consumption.record.consumption_id,
            derived_request: input.derived_request,
            repository_path: &parsed.identity.repository_path,
            git_executable: input.git_executable,
            patch,
        };
        let Ok(commit_oid) = execute_git_commit(
            input.git_executable,
            &parsed.identity,
            &parsed,
            patch,
            redemption.operation_id,
        ) else {
            let recorded_at = now_or_claimed(&claimed_at);
            let _ = self.mark_phase7_git_outcome_unknown_v1(&attempt, &recorded_at);
            return Err(Phase7GitAdapterErrorV1::OutcomeUnknown);
        };
        let received_at = now_or_claimed(&claimed_at);
        if after_consequence().is_err() {
            let _ = self.mark_phase7_git_outcome_unknown_v1(&attempt, &received_at);
            return Err(Phase7GitAdapterErrorV1::OutcomeUnknown);
        }
        let receipt = build_receipt(&dispatch, &attempt, &parsed, &commit_oid, &received_at);
        if self
            .persist_phase7_git_receipt_v1(&attempt, &receipt, &received_at)
            .is_err()
        {
            let _ = self.mark_phase7_git_outcome_unknown_v1(&attempt, &received_at);
            return Err(Phase7GitAdapterErrorV1::OutcomeUnknown);
        }
        let operation = self
            .read_phase8_operation_v1(redemption.operation_id)?
            .ok_or(Phase7GitAdapterErrorV1::EvidenceDrift)?;
        Ok(Phase8RuntimeCompositionWriteV1 {
            created: true,
            consumption: consumption.record,
            operation,
        })
    }

    /// Atomically consumes one capability and claims one Docker-local attempt
    /// before caller may invoke the bounded supervisor.
    ///
    /// Exact replay returns persisted readback with `created == false`. No
    /// caller may launch Docker for replay. Claim and capability consumption
    /// commit in one immediate transaction.
    ///
    /// # Errors
    ///
    /// Fails closed for source, session, capability, target, adapter, claim, or
    /// persistence drift. Post-commit ambiguity becomes `outcome_unknown`.
    pub fn claim_phase11_docker_runtime_composition_v1(
        &mut self,
        input: &Phase11DockerRuntimeCompositionInputV1<'_>,
        capability: Phase7CapabilitySecretV1,
        raw_session_token: &str,
        raw_csrf_token: &str,
    ) -> Result<Phase11DockerRuntimeCompositionClaimV1, Phase7GitAdapterErrorV1> {
        verify_derived_execution_request_v1(input.derived_request)
            .map_err(|_| Phase7GitAdapterErrorV1::EvidenceDrift)?;
        let parsed = parse_derived_request_for_adapter(
            input.redemption.project_ref,
            input.redemption.resource_ref,
            input.derived_request,
            Some(PHASE11_DOCKER_GIT_ADAPTER_REF_V1),
        )?;
        let patch = parsed
            .approved_patch
            .as_deref()
            .ok_or(Phase7GitAdapterErrorV1::EvidenceDrift)?;
        let existing_consumption = self
            .read_phase8_operation_v1(input.redemption.operation_id)?
            .and_then(|operation| operation.consumption_id)
            .is_some();
        if !existing_consumption {
            validate_phase11_disposable_git_target_v1(
                input.derived_request,
                input.disposable_root,
                input.verifier_git_executable,
                PHASE11_DOCKER_GIT_ADAPTER_REF_V1,
            )?;
        }

        let claimed_at = canonical_system_time_v1(SystemTime::now()).map_err(map_persistence)?;
        let redemption = input.redemption;
        let redemption_result = self
            .redeem_phase7_local_execution_capability_with_transaction_hook_v1(
                &redemption,
                capability,
                (raw_session_token, raw_csrf_token),
                (
                    || Ok(claimed_at.clone()),
                    |transaction, consumption, consumed_at| {
                        let dispatch = Phase7GitCommitDispatchInputV1 {
                            project_ref: redemption.project_ref,
                            resource_ref: redemption.resource_ref,
                            authorization_id: redemption.authorization_id,
                            operation_id: redemption.operation_id,
                            consumption_id: &consumption.consumption_id,
                            derived_request: input.derived_request,
                            repository_path: &parsed.identity.repository_path,
                            git_executable: input.verifier_git_executable,
                            patch,
                        };
                        claim_phase11_docker_dispatch_in_transaction_v1(
                            transaction,
                            &dispatch,
                            &parsed,
                            consumed_at,
                        )
                        .map_err(map_claim_to_persistence)
                    },
                    || Ok(()),
                    || Ok(()),
                ),
            );
        let (consumption, attempt) = match redemption_result {
            Ok(value) => value,
            Err(Phase7PersistenceErrorV1::OutcomeAmbiguous) => {
                if let Ok(Some(attempt)) = select_attempt(&self.connection, redemption.operation_id)
                {
                    let _ = self.mark_phase7_git_outcome_unknown_v1(&attempt, &claimed_at);
                }
                return Err(Phase7GitAdapterErrorV1::OutcomeUnknown);
            }
            Err(error) => return Err(map_atomic_persistence(error)),
        };

        let Some(attempt) = attempt else {
            let operation = self
                .read_phase8_operation_v1(redemption.operation_id)?
                .ok_or(Phase7GitAdapterErrorV1::EvidenceDrift)?;
            return Ok(Phase11DockerRuntimeCompositionClaimV1 {
                created: false,
                consumption: consumption.record,
                operation,
            });
        };

        if validate_phase11_disposable_git_target_v1(
            input.derived_request,
            input.disposable_root,
            input.verifier_git_executable,
            PHASE11_DOCKER_GIT_ADAPTER_REF_V1,
        )
        .is_err()
        {
            let _ = self.mark_phase7_git_outcome_unknown_v1(&attempt, &claimed_at);
            return Err(Phase7GitAdapterErrorV1::OutcomeUnknown);
        }
        let operation = self
            .read_phase8_operation_v1(redemption.operation_id)?
            .ok_or(Phase7GitAdapterErrorV1::EvidenceDrift)?;
        Ok(Phase11DockerRuntimeCompositionClaimV1 {
            created: true,
            consumption: consumption.record,
            operation,
        })
    }

    /// Persists one independently host-verified Docker result as canonical
    /// receipt evidence. No adapter or Docker process is launched here.
    ///
    /// `dispatching` becomes `completed`. A startup-materialized
    /// `outcome_unknown` becomes `completed` only through an additional bound
    /// reconciliation record.
    ///
    /// # Errors
    ///
    /// Fails closed for operation, attempt, adapter, target, result, receipt,
    /// state, or persistence drift. Ambiguous persistence never reports
    /// success.
    pub fn persist_phase11_docker_runtime_result_v1(
        &mut self,
        input: &Phase11DockerRuntimeCompositionInputV1<'_>,
        result: &Phase7GitExecutionResultV1,
    ) -> Result<Phase8OperationReadbackV1, Phase7GitAdapterErrorV1> {
        let operation = self
            .read_phase8_operation_v1(input.redemption.operation_id)?
            .ok_or(Phase7GitAdapterErrorV1::AuthorizationNotConsumed)?;
        if operation.authorization_id != input.redemption.authorization_id
            || operation.project_ref != input.redemption.project_ref
            || operation.resource_ref != input.redemption.resource_ref
        {
            return Err(Phase7GitAdapterErrorV1::EvidenceDrift);
        }
        let attempt_readback = operation
            .attempt
            .as_ref()
            .ok_or(Phase7GitAdapterErrorV1::AuthorizationNotConsumed)?;
        if !matches!(
            attempt_readback.state.as_str(),
            "dispatching" | "outcome_unknown" | "completed"
        ) || attempt_readback.adapter_ref
            != format!(
                "{PHASE11_DOCKER_GIT_ADAPTER_REF_V1}@{PHASE11_DOCKER_GIT_ADAPTER_VERSION_V1}"
            )
            || attempt_readback.protocol_version != PHASE11_DOCKER_PROTOCOL_VERSION_V1
        {
            return Err(Phase7GitAdapterErrorV1::EvidenceDrift);
        }
        let parsed = parse_derived_request_for_adapter(
            input.redemption.project_ref,
            input.redemption.resource_ref,
            input.derived_request,
            Some(PHASE11_DOCKER_GIT_ADAPTER_REF_V1),
        )?;
        let patch = parsed
            .approved_patch
            .as_deref()
            .ok_or(Phase7GitAdapterErrorV1::EvidenceDrift)?;
        let attempt = select_attempt(&self.connection, input.redemption.operation_id)?
            .ok_or(Phase7GitAdapterErrorV1::AuthorizationNotConsumed)?;
        let consumption_id = operation
            .consumption_id
            .as_deref()
            .ok_or(Phase7GitAdapterErrorV1::AuthorizationNotConsumed)?;
        let dispatch = Phase7GitCommitDispatchInputV1 {
            project_ref: input.redemption.project_ref,
            resource_ref: input.redemption.resource_ref,
            authorization_id: input.redemption.authorization_id,
            operation_id: input.redemption.operation_id,
            consumption_id,
            derived_request: input.derived_request,
            repository_path: &parsed.identity.repository_path,
            git_executable: input.verifier_git_executable,
            patch,
        };
        verify_dispatch_context_for_adapter(
            &dispatch,
            &read_dispatch_context(&self.connection, &dispatch)?,
            PHASE11_DOCKER_GIT_ADAPTER_REF_V1,
            PHASE11_DOCKER_GIT_ADAPTER_VERSION_V1,
        )?;
        if attempt.tool_arguments_digest != tool_arguments_digest(&parsed) {
            return Err(Phase7GitAdapterErrorV1::EvidenceDrift);
        }
        if attempt_readback.state == "completed" {
            return if operation.receipt_id.is_some() {
                Ok(operation)
            } else {
                Err(Phase7GitAdapterErrorV1::EvidenceDrift)
            };
        }
        let inspected = inspect_phase11_disposable_git_result_v1(
            input.derived_request,
            input.disposable_root,
            input.verifier_git_executable,
            PHASE11_DOCKER_GIT_ADAPTER_REF_V1,
        )?;
        if &inspected != result {
            return Err(Phase7GitAdapterErrorV1::EvidenceDrift);
        }
        let recorded_at = canonical_system_time_v1(SystemTime::now()).map_err(map_persistence)?;
        let receipt = build_receipt_for_adapter(
            &dispatch,
            &attempt,
            &parsed,
            &result.commit_oid,
            &recorded_at,
            PHASE11_DOCKER_GIT_ADAPTER_REF_V1,
            PHASE11_DOCKER_GIT_ADAPTER_VERSION_V1,
        );
        let persisted = if attempt_readback.state == "outcome_unknown" {
            self.persist_phase7_git_reconciliation_and_receipt_v1(&attempt, &receipt, &recorded_at)
        } else {
            self.persist_phase7_git_receipt_v1(&attempt, &receipt, &recorded_at)
        };
        if persisted.is_err() {
            let _ = self.mark_phase11_docker_outcome_unknown_v1(input.redemption.operation_id);
            return Err(Phase7GitAdapterErrorV1::OutcomeUnknown);
        }
        self.read_phase8_operation_v1(input.redemption.operation_id)?
            .ok_or(Phase7GitAdapterErrorV1::EvidenceDrift)
    }

    /// Marks one claimed Docker attempt ambiguous without launching or retrying
    /// any consequence. Repeated calls are idempotent.
    ///
    /// # Errors
    ///
    /// Fails closed for missing, non-Docker, or invalid attempt evidence.
    pub fn mark_phase11_docker_outcome_unknown_v1(
        &mut self,
        operation_id: &str,
    ) -> Result<Phase8OperationReadbackV1, Phase7GitAdapterErrorV1> {
        let operation = self
            .read_phase8_operation_v1(operation_id)?
            .ok_or(Phase7GitAdapterErrorV1::AuthorizationNotConsumed)?;
        let attempt_readback = operation
            .attempt
            .as_ref()
            .ok_or(Phase7GitAdapterErrorV1::AuthorizationNotConsumed)?;
        if attempt_readback.adapter_ref
            != format!(
                "{PHASE11_DOCKER_GIT_ADAPTER_REF_V1}@{PHASE11_DOCKER_GIT_ADAPTER_VERSION_V1}"
            )
            || attempt_readback.protocol_version != PHASE11_DOCKER_PROTOCOL_VERSION_V1
        {
            return Err(Phase7GitAdapterErrorV1::EvidenceDrift);
        }
        if attempt_readback.state == "dispatching" {
            let attempt = select_attempt(&self.connection, operation_id)?
                .ok_or(Phase7GitAdapterErrorV1::AuthorizationNotConsumed)?;
            let recorded_at =
                canonical_system_time_v1(SystemTime::now()).map_err(map_persistence)?;
            self.mark_phase7_git_outcome_unknown_v1(&attempt, &recorded_at)?;
        } else if attempt_readback.state != "outcome_unknown"
            && attempt_readback.state != "completed"
        {
            return Err(Phase7GitAdapterErrorV1::EvidenceDrift);
        }
        self.read_phase8_operation_v1(operation_id)?
            .ok_or(Phase7GitAdapterErrorV1::EvidenceDrift)
    }

    /// Reconciles one claimed Docker attempt from exact host Git evidence.
    /// Docker is never launched and no retry exists.
    ///
    /// # Errors
    ///
    /// Fails closed when exact approved consequence cannot be proven.
    pub fn reconcile_phase11_docker_runtime_composition_v1(
        &mut self,
        input: &Phase11DockerRuntimeCompositionInputV1<'_>,
    ) -> Result<Phase8OperationReadbackV1, Phase7GitAdapterErrorV1> {
        let operation = self
            .read_phase8_operation_v1(input.redemption.operation_id)?
            .ok_or(Phase7GitAdapterErrorV1::AuthorizationNotConsumed)?;
        if operation.authorization_id != input.redemption.authorization_id
            || operation.project_ref != input.redemption.project_ref
            || operation.resource_ref != input.redemption.resource_ref
        {
            return Err(Phase7GitAdapterErrorV1::EvidenceDrift);
        }
        let attempt_readback = operation
            .attempt
            .as_ref()
            .ok_or(Phase7GitAdapterErrorV1::AuthorizationNotConsumed)?;
        if attempt_readback.adapter_ref
            != format!(
                "{PHASE11_DOCKER_GIT_ADAPTER_REF_V1}@{PHASE11_DOCKER_GIT_ADAPTER_VERSION_V1}"
            )
            || attempt_readback.protocol_version != PHASE11_DOCKER_PROTOCOL_VERSION_V1
        {
            return Err(Phase7GitAdapterErrorV1::EvidenceDrift);
        }
        let parsed = parse_derived_request_for_adapter(
            input.redemption.project_ref,
            input.redemption.resource_ref,
            input.derived_request,
            Some(PHASE11_DOCKER_GIT_ADAPTER_REF_V1),
        )?;
        let patch = parsed
            .approved_patch
            .as_deref()
            .ok_or(Phase7GitAdapterErrorV1::EvidenceDrift)?;
        let attempt = select_attempt(&self.connection, input.redemption.operation_id)?
            .ok_or(Phase7GitAdapterErrorV1::AuthorizationNotConsumed)?;
        let consumption_id = operation
            .consumption_id
            .as_deref()
            .ok_or(Phase7GitAdapterErrorV1::AuthorizationNotConsumed)?;
        let dispatch = Phase7GitCommitDispatchInputV1 {
            project_ref: input.redemption.project_ref,
            resource_ref: input.redemption.resource_ref,
            authorization_id: input.redemption.authorization_id,
            operation_id: input.redemption.operation_id,
            consumption_id,
            derived_request: input.derived_request,
            repository_path: &parsed.identity.repository_path,
            git_executable: input.verifier_git_executable,
            patch,
        };
        verify_dispatch_context_for_adapter(
            &dispatch,
            &read_dispatch_context(&self.connection, &dispatch)?,
            PHASE11_DOCKER_GIT_ADAPTER_REF_V1,
            PHASE11_DOCKER_GIT_ADAPTER_VERSION_V1,
        )?;
        if attempt.tool_arguments_digest != tool_arguments_digest(&parsed) {
            return Err(Phase7GitAdapterErrorV1::EvidenceDrift);
        }
        if operation.state == "completed" && operation.receipt_id.is_some() {
            return Ok(operation);
        }
        if validate_phase11_disposable_git_target_v1(
            input.derived_request,
            input.disposable_root,
            input.verifier_git_executable,
            PHASE11_DOCKER_GIT_ADAPTER_REF_V1,
        )
        .is_ok()
        {
            return Err(Phase7GitAdapterErrorV1::OutcomeUnknown);
        }
        let result = inspect_phase11_disposable_git_result_v1(
            input.derived_request,
            input.disposable_root,
            input.verifier_git_executable,
            PHASE11_DOCKER_GIT_ADAPTER_REF_V1,
        )?;
        self.persist_phase11_docker_runtime_result_v1(input, &result)
    }

    /// Reads one operation and its latest secret-free execution evidence.
    ///
    /// # Errors
    ///
    /// Fails closed for invalid identity, schema drift, or persistence failure.
    pub fn read_phase8_operation_v1(
        &self,
        operation_id: &str,
    ) -> Result<Option<Phase8OperationReadbackV1>, Phase7GitAdapterErrorV1> {
        read_phase8_operation_v1(&self.connection, operation_id)
    }

    /// Reads one exact attempt only when bound to supplied operation.
    ///
    /// # Errors
    ///
    /// Fails closed for invalid identity, schema drift, or persistence failure.
    pub fn read_phase8_operation_attempt_v1(
        &self,
        operation_id: &str,
        operation_attempt_id: &str,
    ) -> Result<Option<Phase8OperationAttemptReadbackV1>, Phase7GitAdapterErrorV1> {
        if !valid_prefixed_id(operation_id, "opn_")
            || !valid_prefixed_id(operation_attempt_id, "opa_")
        {
            return Err(Phase7GitAdapterErrorV1::InvalidInput);
        }
        Ok(self
            .read_phase8_operation_v1(operation_id)?
            .and_then(|operation| operation.attempt)
            .filter(|attempt| attempt.operation_attempt_id == operation_attempt_id))
    }

    /// Reconciles exact approved Git evidence without launching another
    /// consequence, then returns secret-free operation readback.
    ///
    /// # Errors
    ///
    /// Fails closed for mismatched operation, target, executable, receipt, or
    /// persistence evidence. Unchanged or ambiguous target remains unknown.
    pub fn reconcile_phase8_runtime_composition_v1(
        &mut self,
        operation_id: &str,
        derived_request: &DerivedExecutionRequestV1,
        disposable_root: &Path,
        git_executable: &Path,
    ) -> Result<Phase8OperationReadbackV1, Phase7GitAdapterErrorV1> {
        let operation = self
            .read_phase8_operation_v1(operation_id)?
            .ok_or(Phase7GitAdapterErrorV1::AuthorizationNotConsumed)?;
        let consumption_id = operation
            .consumption_id
            .as_deref()
            .ok_or(Phase7GitAdapterErrorV1::AuthorizationNotConsumed)?;
        let parsed = parse_derived_request(
            &operation.project_ref,
            &operation.resource_ref,
            derived_request,
        )?;
        let patch = parsed
            .approved_patch
            .as_deref()
            .ok_or(Phase7GitAdapterErrorV1::EvidenceDrift)?;
        let runtime_input = Phase8RuntimeCompositionInputV1 {
            redemption: Phase7CapabilityRedemptionInputV1 {
                project_ref: &operation.project_ref,
                resource_ref: &operation.resource_ref,
                authorization_id: &operation.authorization_id,
                operation_id,
                idempotency_key: "idempotency:phase8:reconciliation-readback",
            },
            derived_request,
            disposable_root,
            git_executable,
        };
        validate_phase8_reconciliation_target_v1(&runtime_input, &parsed, patch)?;
        let dispatch = Phase7GitCommitDispatchInputV1 {
            project_ref: &operation.project_ref,
            resource_ref: &operation.resource_ref,
            authorization_id: &operation.authorization_id,
            operation_id,
            consumption_id,
            derived_request,
            repository_path: &parsed.identity.repository_path,
            git_executable,
            patch,
        };
        self.reconcile_phase7_git_commit_v1(&dispatch)?;
        self.read_phase8_operation_v1(operation_id)?
            .ok_or(Phase7GitAdapterErrorV1::EvidenceDrift)
    }

    /// Reclassifies every persisted `dispatching` attempt as ambiguous during
    /// daemon startup. No adapter process starts and no retry occurs.
    ///
    /// # Errors
    ///
    /// Fails closed when stored evidence or transition persistence fails.
    pub fn materialize_phase8_interrupted_dispatches_v1(
        &mut self,
    ) -> Result<usize, Phase7GitAdapterErrorV1> {
        let recorded_at = canonical_system_time_v1(SystemTime::now()).map_err(map_persistence)?;
        let transaction = self
            .connection
            .transaction_with_behavior(TransactionBehavior::Immediate)
            .map_err(|_| Phase7GitAdapterErrorV1::PersistenceFailed)?;
        verify_current_schema(&transaction).map_err(|_| Phase7GitAdapterErrorV1::EvidenceDrift)?;
        let interrupted = select_dispatching_attempts_v1(&transaction)?;
        for attempt in &interrupted {
            append_state_event(
                &transaction,
                &attempt.project_ref,
                &attempt.resource_ref,
                &attempt.operation_attempt_id,
                "operation_attempt",
                "outcome_unknown",
                &recorded_at,
                "operation_attempt_state_recorded",
                "adapter_executed",
            )?;
            append_phase7_operation_state_event_v1(
                &transaction,
                &attempt.project_ref,
                &attempt.resource_ref,
                &attempt.operation_id,
                "outcome_unknown",
                &recorded_at,
            )
            .map_err(map_persistence)?;
        }
        transaction
            .commit()
            .map_err(|_| Phase7GitAdapterErrorV1::PersistenceFailed)?;
        Ok(interrupted.len())
    }
}

fn claim_phase8_git_dispatch_in_transaction_v1(
    transaction: &Transaction<'_>,
    input: &Phase7GitCommitDispatchInputV1<'_>,
    parsed: &ParsedGitRequest,
    claimed_at: &str,
) -> Result<AttemptRecord, Phase7GitAdapterErrorV1> {
    claim_dispatch_in_transaction_for_adapter_v1(
        transaction,
        input,
        parsed,
        claimed_at,
        PHASE7_GIT_ADAPTER_REF_V1,
        PHASE7_GIT_ADAPTER_VERSION_V1,
        PROTOCOL_VERSION_V1,
    )
}

fn claim_phase11_docker_dispatch_in_transaction_v1(
    transaction: &Transaction<'_>,
    input: &Phase7GitCommitDispatchInputV1<'_>,
    parsed: &ParsedGitRequest,
    claimed_at: &str,
) -> Result<AttemptRecord, Phase7GitAdapterErrorV1> {
    claim_dispatch_in_transaction_for_adapter_v1(
        transaction,
        input,
        parsed,
        claimed_at,
        PHASE11_DOCKER_GIT_ADAPTER_REF_V1,
        PHASE11_DOCKER_GIT_ADAPTER_VERSION_V1,
        PHASE11_DOCKER_PROTOCOL_VERSION_V1,
    )
}

#[allow(clippy::too_many_arguments)]
fn claim_dispatch_in_transaction_for_adapter_v1(
    transaction: &Transaction<'_>,
    input: &Phase7GitCommitDispatchInputV1<'_>,
    parsed: &ParsedGitRequest,
    claimed_at: &str,
    adapter_ref: &str,
    adapter_version: &str,
    protocol_version: &str,
) -> Result<AttemptRecord, Phase7GitAdapterErrorV1> {
    let context = read_dispatch_context(transaction, input)?;
    verify_dispatch_context_for_adapter(input, &context, adapter_ref, adapter_version)?;
    if select_attempt(transaction, input.operation_id)?.is_some() {
        return Err(Phase7GitAdapterErrorV1::DispatchAlreadyClaimed);
    }
    if context.operation_state != "prepared" {
        return Err(Phase7GitAdapterErrorV1::AuthorizationNotConsumed);
    }
    let tool_arguments_digest = tool_arguments_digest(parsed);
    let operation_attempt_id = identifier(
        "opa_",
        ATTEMPT_ID_DOMAIN,
        &[input.operation_id.as_bytes(), &tool_arguments_digest],
    );
    let audit_binding_id = identifier(
        "p7a_",
        ATTEMPT_AUDIT_ID_DOMAIN,
        &[operation_attempt_id.as_bytes()],
    );
    let attempt = AttemptRecord {
        operation_attempt_id,
        audit_binding_id,
        project_ref: context.project_ref,
        resource_ref: context.resource_ref,
        operation_id: context.operation_id,
        attempt_sequence: 1,
        adapter_ref: context.adapter_ref,
        protocol_version: protocol_version.to_owned(),
        tool_arguments_digest,
        created_at: claimed_at.to_owned(),
    };
    insert_attempt(transaction, &attempt)?;
    append_phase7_operation_state_event_v1(
        transaction,
        &attempt.project_ref,
        &attempt.resource_ref,
        &attempt.operation_id,
        "dispatching",
        claimed_at,
    )
    .map_err(map_persistence)?;
    append_state_event(
        transaction,
        &attempt.project_ref,
        &attempt.resource_ref,
        &attempt.operation_attempt_id,
        "operation_attempt",
        "dispatching",
        claimed_at,
        "operation_attempt_state_recorded",
        "none",
    )?;
    Ok(attempt)
}

fn validate_phase8_runtime_target_v1(
    input: &Phase8RuntimeCompositionInputV1<'_>,
    parsed: &ParsedGitRequest,
    patch: &[u8],
) -> Result<(), Phase7GitAdapterErrorV1> {
    validate_phase8_runtime_target_mode_v1(input, parsed, patch, true).map(|_| ())
}

fn validate_phase8_reconciliation_target_v1(
    input: &Phase8RuntimeCompositionInputV1<'_>,
    parsed: &ParsedGitRequest,
    patch: &[u8],
) -> Result<(), Phase7GitAdapterErrorV1> {
    let identity = validate_phase8_runtime_target_mode_v1(input, parsed, patch, false)?;
    validate_phase8_approved_base_index_and_worktree_v1(
        input.git_executable,
        &identity,
        &parsed.identity.base_commit_oid,
    )
}

fn validate_phase8_runtime_target_mode_v1(
    input: &Phase8RuntimeCompositionInputV1<'_>,
    parsed: &ParsedGitRequest,
    patch: &[u8],
    require_approved_base: bool,
) -> Result<Phase7GitRepositoryIdentityV1, Phase7GitAdapterErrorV1> {
    if !bounded_reference(input.redemption.project_ref)
        || !is_valid_reference_v1(input.redemption.project_ref)
        || !bounded_reference(input.redemption.resource_ref)
        || !is_valid_reference_v1(input.redemption.resource_ref)
        || !valid_prefixed_id(input.redemption.authorization_id, "xau_")
        || !valid_prefixed_id(input.redemption.operation_id, "opn_")
        || patch.is_empty()
        || patch.len() > 1_048_576
    {
        return Err(Phase7GitAdapterErrorV1::InvalidInput);
    }
    let disposable_root = canonical_phase8_disposable_root_v1(input.disposable_root)?;
    let actual_identity = inspect_phase7_disposable_git_repository_v1(
        &parsed.identity.repository_path,
        input.git_executable,
    )?;
    let identity_rejected = actual_identity.repository_path != parsed.identity.repository_path
        || actual_identity.git_dir_path != parsed.identity.git_dir_path
        || actual_identity.object_format != parsed.identity.object_format
        || actual_identity.head_ref != parsed.identity.head_ref
        || actual_identity.fixture_marker_sha256 != parsed.identity.fixture_marker_sha256
        || (require_approved_base
            && actual_identity.base_commit_oid != parsed.identity.base_commit_oid);
    let root_rejected = actual_identity.repository_path == disposable_root
        || !actual_identity
            .repository_path
            .starts_with(&disposable_root);
    if identity_rejected || root_rejected {
        return Err(Phase7GitAdapterErrorV1::TargetRejected);
    }
    if require_approved_base {
        validate_clean_target(input.git_executable, &actual_identity)?;
    }
    validate_path_safety(&actual_identity.repository_path, &parsed.allowed_paths)?;
    if prefixed_sha256(patch) != parsed.patch_sha256 {
        return Err(Phase7GitAdapterErrorV1::EvidenceDrift);
    }
    let executable_digest = phase7_git_executable_digest_v1(input.git_executable)?;
    if executable_digest != input.derived_request.executable_digest
        || phase7_git_adapter_configuration_digest_v1()
            != input.derived_request.configuration_digest
    {
        return Err(Phase7GitAdapterErrorV1::EvidenceDrift);
    }
    Ok(actual_identity)
}

fn validate_phase8_approved_base_index_and_worktree_v1(
    git_executable: &Path,
    identity: &Phase7GitRepositoryIdentityV1,
    approved_base_commit_oid: &str,
) -> Result<(), Phase7GitAdapterErrorV1> {
    let executable = canonical_git_executable(git_executable)?;
    let index_flags = git_bytes(
        &executable,
        &identity.repository_path,
        &["ls-files", "-v", "-z"],
        &[],
        &[],
    )?;
    let tracked_drift = git_bytes(
        &executable,
        &identity.repository_path,
        &[
            "diff",
            "--no-ext-diff",
            "--no-textconv",
            "--name-status",
            "-z",
            approved_base_commit_oid,
            "--",
        ],
        &[],
        &[],
    )?;
    let index_drift = git_bytes(
        &executable,
        &identity.repository_path,
        &[
            "diff",
            "--cached",
            "--no-ext-diff",
            "--no-textconv",
            "--name-status",
            "-z",
            approved_base_commit_oid,
            "--",
        ],
        &[],
        &[],
    )?;
    let untracked_drift = git_bytes(
        &executable,
        &identity.repository_path,
        &["ls-files", "--others", "-z"],
        &[],
        &[],
    )?;
    if !phase8_reconciliation_index_flags_normal_v1(&index_flags)
        || !tracked_drift.is_empty()
        || !index_drift.is_empty()
        || !untracked_drift.is_empty()
    {
        return Err(Phase7GitAdapterErrorV1::TargetRejected);
    }
    Ok(())
}

fn phase8_reconciliation_index_flags_normal_v1(value: &[u8]) -> bool {
    value.is_empty()
        || (value.ends_with(&[0])
            && value[..value.len() - 1]
                .split(|byte| *byte == 0)
                .all(|entry| entry.len() > 2 && entry[0] == b'H' && entry[1] == b' '))
}

fn canonical_phase8_disposable_root_v1(path: &Path) -> Result<PathBuf, Phase7GitAdapterErrorV1> {
    let metadata =
        fs::symlink_metadata(path).map_err(|_| Phase7GitAdapterErrorV1::TargetRejected)?;
    let canonical = fs::canonicalize(path).map_err(|_| Phase7GitAdapterErrorV1::TargetRejected)?;
    let temporary_root = fs::canonicalize(std::env::temp_dir())
        .map_err(|_| Phase7GitAdapterErrorV1::TargetRejected)?;
    if !metadata.file_type().is_dir()
        || metadata.file_type().is_symlink()
        || !canonical.is_absolute()
        || !canonical.starts_with(temporary_root)
    {
        return Err(Phase7GitAdapterErrorV1::TargetRejected);
    }
    Ok(canonical)
}

fn now_or_claimed(claimed_at: &str) -> String {
    canonical_system_time_v1(SystemTime::now()).unwrap_or_else(|_| claimed_at.to_owned())
}

fn map_claim_to_persistence(error: Phase7GitAdapterErrorV1) -> Phase7PersistenceErrorV1 {
    match error {
        Phase7GitAdapterErrorV1::DispatchAlreadyClaimed
        | Phase7GitAdapterErrorV1::AuthorizationNotConsumed => {
            Phase7PersistenceErrorV1::RedemptionRejected
        }
        Phase7GitAdapterErrorV1::PersistenceFailed => Phase7PersistenceErrorV1::PersistenceFailed,
        Phase7GitAdapterErrorV1::InvalidInput => Phase7PersistenceErrorV1::InvalidInput,
        _ => Phase7PersistenceErrorV1::EvidenceDrift,
    }
}

fn map_atomic_persistence(error: Phase7PersistenceErrorV1) -> Phase7GitAdapterErrorV1 {
    match error {
        Phase7PersistenceErrorV1::OutcomeAmbiguous => Phase7GitAdapterErrorV1::OutcomeUnknown,
        Phase7PersistenceErrorV1::PersistenceFailed => Phase7GitAdapterErrorV1::PersistenceFailed,
        Phase7PersistenceErrorV1::EvidenceDrift => Phase7GitAdapterErrorV1::EvidenceDrift,
        Phase7PersistenceErrorV1::InvalidInput => Phase7GitAdapterErrorV1::InvalidInput,
        _ => Phase7GitAdapterErrorV1::AuthorizationNotConsumed,
    }
}

type Phase8StateReadbackRowV1 = (String, String, i64, String, String);

fn read_phase8_state_v1(
    connection: &Connection,
    target_id: &str,
) -> Result<Phase8StateReadbackRowV1, Phase7GitAdapterErrorV1> {
    connection
        .query_row(
            "SELECT state.state_event_id, entity.audit_binding_id,
                    state.state_sequence, state.state, state.effective_at
             FROM lnsat_phase7_state_events AS state
             JOIN lnsat_phase7_entities AS entity
               ON entity.entity_id = state.state_event_id
             WHERE state.target_entity_id = ?1
             ORDER BY state.state_sequence DESC LIMIT 1",
            [target_id],
            |row| {
                Ok((
                    row.get(0)?,
                    row.get(1)?,
                    row.get(2)?,
                    row.get(3)?,
                    row.get(4)?,
                ))
            },
        )
        .map_err(|_| Phase7GitAdapterErrorV1::EvidenceDrift)
}

#[allow(clippy::too_many_lines)]
fn read_phase8_operation_v1(
    connection: &Connection,
    operation_id: &str,
) -> Result<Option<Phase8OperationReadbackV1>, Phase7GitAdapterErrorV1> {
    if !valid_prefixed_id(operation_id, "opn_") {
        return Err(Phase7GitAdapterErrorV1::InvalidInput);
    }
    verify_current_schema(connection).map_err(|_| Phase7GitAdapterErrorV1::EvidenceDrift)?;
    let operation: Option<(String, String, String, String, Option<String>)> = connection
        .query_row(
            "SELECT operation.authorization_id, entity.audit_binding_id,
                    operation.project_ref, operation.resource_ref,
                    consumption.consumption_id
             FROM lnsat_operations AS operation
             JOIN lnsat_phase7_entities AS entity
               ON entity.entity_id = operation.operation_id
             LEFT JOIN lnsat_capability_consumptions AS consumption
               ON consumption.operation_id = operation.operation_id
             WHERE operation.operation_id = ?1",
            [operation_id],
            |row| {
                Ok((
                    row.get(0)?,
                    row.get(1)?,
                    row.get(2)?,
                    row.get(3)?,
                    row.get(4)?,
                ))
            },
        )
        .optional()
        .map_err(|_| Phase7GitAdapterErrorV1::PersistenceFailed)?;
    let Some((
        authorization_id,
        operation_audit_binding_id,
        project_ref,
        resource_ref,
        consumption_id,
    )) = operation
    else {
        return Ok(None);
    };
    let (state_event_id, state_audit_binding_id, state_sequence, state, state_effective_at) =
        read_phase8_state_v1(connection, operation_id)?;
    let attempt =
        select_attempt(connection, operation_id)?
            .map(|attempt| {
                let (
                    state_event_id,
                    state_audit_binding_id,
                    state_sequence,
                    state,
                    state_effective_at,
                ) = read_phase8_state_v1(connection, &attempt.operation_attempt_id)?;
                Ok(Phase8OperationAttemptReadbackV1 {
                    operation_attempt_id: attempt.operation_attempt_id,
                    audit_binding_id: attempt.audit_binding_id,
                    operation_id: attempt.operation_id,
                    project_ref: attempt.project_ref,
                    resource_ref: attempt.resource_ref,
                    attempt_sequence: u32::try_from(attempt.attempt_sequence)
                        .map_err(|_| Phase7GitAdapterErrorV1::EvidenceDrift)?,
                    adapter_ref: attempt.adapter_ref,
                    protocol_version: attempt.protocol_version,
                    tool_arguments_digest: attempt.tool_arguments_digest,
                    created_at: attempt.created_at,
                    state_event_id,
                    state_audit_binding_id,
                    state_sequence: u32::try_from(state_sequence)
                        .map_err(|_| Phase7GitAdapterErrorV1::EvidenceDrift)?,
                    state,
                    state_effective_at,
                })
            })
            .transpose()?;
    let receipt: Option<(String, String)> = connection
        .query_row(
            "SELECT receipt_id, received_at FROM lnsat_operation_receipts
             WHERE operation_id = ?1",
            [operation_id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .optional()
        .map_err(|_| Phase7GitAdapterErrorV1::PersistenceFailed)?;
    let reconciliation: Option<(String, String, String)> = connection
        .query_row(
            "SELECT reconciliation_id, status, recorded_at
             FROM lnsat_operation_reconciliations
             WHERE operation_id = ?1 ORDER BY reconciliation_sequence DESC LIMIT 1",
            [operation_id],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
        )
        .optional()
        .map_err(|_| Phase7GitAdapterErrorV1::PersistenceFailed)?;
    Ok(Some(Phase8OperationReadbackV1 {
        operation_id: operation_id.to_owned(),
        operation_audit_binding_id,
        authorization_id,
        consumption_id,
        project_ref,
        resource_ref,
        state_event_id,
        state_audit_binding_id,
        state_sequence: u32::try_from(state_sequence)
            .map_err(|_| Phase7GitAdapterErrorV1::EvidenceDrift)?,
        state,
        state_effective_at,
        attempt,
        receipt_id: receipt.as_ref().map(|(id, _)| id.clone()),
        receipt_received_at: receipt.map(|(_, received_at)| received_at),
        reconciliation_id: reconciliation.as_ref().map(|(id, _, _)| id.clone()),
        reconciliation_status: reconciliation.as_ref().map(|(_, status, _)| status.clone()),
        reconciliation_recorded_at: reconciliation.map(|(_, _, recorded_at)| recorded_at),
    }))
}

fn select_dispatching_attempts_v1(
    connection: &Connection,
) -> Result<Vec<AttemptRecord>, Phase7GitAdapterErrorV1> {
    let mut statement = connection
        .prepare(
            "SELECT attempt.operation_attempt_id, entity.audit_binding_id,
                    attempt.project_ref, attempt.resource_ref, attempt.operation_id,
                    attempt.attempt_sequence, attempt.adapter_ref,
                    attempt.protocol_version, attempt.tool_arguments_digest,
                    attempt.created_at
             FROM lnsat_operation_attempts AS attempt
             JOIN lnsat_phase7_entities AS entity
               ON entity.entity_id = attempt.operation_attempt_id
             JOIN lnsat_phase7_state_events AS state
               ON state.target_entity_id = attempt.operation_attempt_id
              AND state.state_sequence = (
                SELECT max(latest.state_sequence)
                FROM lnsat_phase7_state_events AS latest
                WHERE latest.target_entity_id = attempt.operation_attempt_id
              )
             WHERE state.state = 'dispatching'
             ORDER BY attempt.operation_id",
        )
        .map_err(|_| Phase7GitAdapterErrorV1::PersistenceFailed)?;
    statement
        .query_map([], |row| {
            Ok(AttemptRecord {
                operation_attempt_id: row.get(0)?,
                audit_binding_id: row.get(1)?,
                project_ref: row.get(2)?,
                resource_ref: row.get(3)?,
                operation_id: row.get(4)?,
                attempt_sequence: row.get(5)?,
                adapter_ref: row.get(6)?,
                protocol_version: row.get(7)?,
                tool_arguments_digest: blob_32(row.get(8)?)?,
                created_at: row.get(9)?,
            })
        })
        .map_err(|_| Phase7GitAdapterErrorV1::PersistenceFailed)?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|_| Phase7GitAdapterErrorV1::PersistenceFailed)
}

fn validate_scope(
    input: &Phase7GitCommitDispatchInputV1<'_>,
) -> Result<(), Phase7GitAdapterErrorV1> {
    if !bounded_reference(input.project_ref)
        || !is_valid_reference_v1(input.project_ref)
        || !bounded_reference(input.resource_ref)
        || !is_valid_reference_v1(input.resource_ref)
        || !valid_prefixed_id(input.authorization_id, "xau_")
        || !valid_prefixed_id(input.operation_id, "opn_")
        || !valid_prefixed_id(input.consumption_id, "cpc_")
        || input.patch.is_empty()
        || input.patch.len() > 1_048_576
    {
        return Err(Phase7GitAdapterErrorV1::InvalidInput);
    }
    Ok(())
}

#[allow(clippy::too_many_lines)]
fn parse_request(
    input: &Phase7GitCommitDispatchInputV1<'_>,
) -> Result<ParsedGitRequest, Phase7GitAdapterErrorV1> {
    parse_derived_request(input.project_ref, input.resource_ref, input.derived_request)
}

#[allow(clippy::too_many_lines)]
fn parse_derived_request(
    project_ref: &str,
    resource_ref: &str,
    derived_request: &DerivedExecutionRequestV1,
) -> Result<ParsedGitRequest, Phase7GitAdapterErrorV1> {
    parse_derived_request_for_adapter(
        project_ref,
        resource_ref,
        derived_request,
        Some(PHASE7_GIT_ADAPTER_REF_V1),
    )
}

#[allow(clippy::too_many_lines)]
fn parse_derived_request_for_adapter(
    project_ref: &str,
    resource_ref: &str,
    derived_request: &DerivedExecutionRequestV1,
    expected_adapter_ref: Option<&str>,
) -> Result<ParsedGitRequest, Phase7GitAdapterErrorV1> {
    let request = &derived_request.request;
    if request.project_ref != project_ref
        || request.resource_ref != resource_ref
        || expected_adapter_ref.is_some_and(|expected| request.adapter.adapter_ref != expected)
        || request.adapter.version != PHASE7_GIT_ADAPTER_VERSION_V1
        || request.audience != "audience:gateway:local"
    {
        return Err(Phase7GitAdapterErrorV1::EvidenceDrift);
    }
    let action = &request.action;
    if action.kind != "git.commit" {
        return Err(Phase7GitAdapterErrorV1::InvalidInput);
    }
    let approved_patch = action.arguments.get("patch");
    let expected_keys = if approved_patch.is_some() {
        &[
            "schema_id",
            "base_commit_oid",
            "head_ref",
            "allowed_paths",
            "patch_sha256",
            "patch",
            "expected_tree_oid",
            "commit_metadata",
        ][..]
    } else {
        &[
            "schema_id",
            "base_commit_oid",
            "head_ref",
            "allowed_paths",
            "patch_sha256",
            "expected_tree_oid",
            "commit_metadata",
        ][..]
    };
    exact_keys(&action.arguments, expected_keys)?;
    if string(&action.arguments, "schema_id")? != ACTION_SCHEMA_V1 {
        return Err(Phase7GitAdapterErrorV1::InvalidInput);
    }
    let base_commit_oid = string(&action.arguments, "base_commit_oid")?.to_owned();
    let head_ref = string(&action.arguments, "head_ref")?.to_owned();
    let expected_tree_oid = string(&action.arguments, "expected_tree_oid")?.to_owned();
    let patch_sha256 = string(&action.arguments, "patch_sha256")?.to_owned();
    if !valid_oid(&base_commit_oid)
        || !valid_oid(&expected_tree_oid)
        || !valid_head_ref(&head_ref)
        || !valid_prefixed_sha256(&patch_sha256)
    {
        return Err(Phase7GitAdapterErrorV1::InvalidInput);
    }
    let approved_patch = approved_patch
        .map(|value| {
            let value = value
                .as_str()
                .ok_or(Phase7GitAdapterErrorV1::InvalidInput)?;
            if value.is_empty() || value.len() > 1_048_576 {
                return Err(Phase7GitAdapterErrorV1::InvalidInput);
            }
            let bytes = Zeroizing::new(value.as_bytes().to_vec());
            if prefixed_sha256(bytes.as_slice()) != patch_sha256 {
                return Err(Phase7GitAdapterErrorV1::EvidenceDrift);
            }
            Ok(bytes)
        })
        .transpose()?;
    let paths = action
        .arguments
        .get("allowed_paths")
        .and_then(|value| value.as_array())
        .ok_or(Phase7GitAdapterErrorV1::InvalidInput)?;
    let mut allowed_paths = Vec::with_capacity(paths.len());
    for value in paths {
        let path = value
            .as_str()
            .ok_or(Phase7GitAdapterErrorV1::InvalidInput)?;
        validate_relative_path(path)?;
        allowed_paths.push(path.to_owned());
    }
    if allowed_paths.is_empty()
        || allowed_paths.len() > 64
        || !allowed_paths.windows(2).all(|pair| pair[0] < pair[1])
    {
        return Err(Phase7GitAdapterErrorV1::InvalidInput);
    }
    let metadata = action
        .arguments
        .get("commit_metadata")
        .and_then(|value| value.as_object())
        .ok_or(Phase7GitAdapterErrorV1::InvalidInput)?;
    exact_keys(
        metadata,
        &[
            "message",
            "author_name",
            "author_email",
            "author_time",
            "committer_name",
            "committer_email",
            "committer_time",
        ],
    )?;
    let metadata = Phase7GitCommitMetadataV1 {
        message: string(metadata, "message")?.to_owned(),
        author_name: string(metadata, "author_name")?.to_owned(),
        author_email: string(metadata, "author_email")?.to_owned(),
        author_time: string(metadata, "author_time")?.to_owned(),
        committer_name: string(metadata, "committer_name")?.to_owned(),
        committer_email: string(metadata, "committer_email")?.to_owned(),
        committer_time: string(metadata, "committer_time")?.to_owned(),
    };
    validate_metadata(&metadata)?;

    let target = &request.target.identity;
    exact_keys(
        target,
        &[
            "schema_id",
            "repository_path",
            "git_dir_path",
            "object_format",
            "head_ref",
            "base_commit_oid",
            "fixture_marker_sha256",
        ],
    )?;
    if string(target, "schema_id")? != TARGET_SCHEMA_V1 {
        return Err(Phase7GitAdapterErrorV1::InvalidInput);
    }
    let identity = Phase7GitRepositoryIdentityV1 {
        repository_path: PathBuf::from(string(target, "repository_path")?),
        git_dir_path: PathBuf::from(string(target, "git_dir_path")?),
        object_format: string(target, "object_format")?.to_owned(),
        head_ref: string(target, "head_ref")?.to_owned(),
        base_commit_oid: string(target, "base_commit_oid")?.to_owned(),
        fixture_marker_sha256: string(target, "fixture_marker_sha256")?.to_owned(),
    };
    if !identity.repository_path.is_absolute()
        || !identity.git_dir_path.is_absolute()
        || identity.object_format != "sha1"
        || identity.head_ref != head_ref
        || identity.base_commit_oid != base_commit_oid
        || !valid_prefixed_sha256(&identity.fixture_marker_sha256)
    {
        return Err(Phase7GitAdapterErrorV1::InvalidInput);
    }
    Ok(ParsedGitRequest {
        identity,
        expected_tree_oid,
        allowed_paths,
        patch_sha256,
        approved_patch,
        metadata,
    })
}

fn read_dispatch_context(
    connection: &Connection,
    input: &Phase7GitCommitDispatchInputV1<'_>,
) -> Result<DispatchContext, Phase7GitAdapterErrorV1> {
    connection
        .query_row(
            "SELECT operation.project_ref, operation.resource_ref,
                    operation.authorization_id, operation.operation_id,
                    consumption.consumption_id, operation.authorized_action_digest,
                    operation.target_digest, operation.configuration_digest,
                    operation.executable_digest, operation.adapter_ref,
                    state.state
             FROM lnsat_operations AS operation
             JOIN lnsat_capability_consumptions AS consumption
               ON consumption.operation_id = operation.operation_id
              AND consumption.authorization_id = operation.authorization_id
             JOIN lnsat_phase7_state_events AS state
               ON state.target_entity_id = operation.operation_id
              AND state.state_sequence = (
                SELECT max(latest.state_sequence)
                FROM lnsat_phase7_state_events AS latest
                WHERE latest.target_entity_id = operation.operation_id
              )
             WHERE operation.project_ref = ?1 AND operation.resource_ref = ?2
               AND operation.authorization_id = ?3 AND operation.operation_id = ?4
               AND consumption.consumption_id = ?5",
            params![
                input.project_ref,
                input.resource_ref,
                input.authorization_id,
                input.operation_id,
                input.consumption_id,
            ],
            |row| {
                Ok(DispatchContext {
                    project_ref: row.get(0)?,
                    resource_ref: row.get(1)?,
                    authorization_id: row.get(2)?,
                    operation_id: row.get(3)?,
                    consumption_id: row.get(4)?,
                    action_digest: blob_32(row.get(5)?)?,
                    target_digest: blob_32(row.get(6)?)?,
                    configuration_digest: blob_32(row.get(7)?)?,
                    executable_digest: blob_32(row.get(8)?)?,
                    adapter_ref: row.get(9)?,
                    operation_state: row.get(10)?,
                })
            },
        )
        .optional()
        .map_err(|_| Phase7GitAdapterErrorV1::PersistenceFailed)?
        .ok_or(Phase7GitAdapterErrorV1::AuthorizationNotConsumed)
}

fn verify_dispatch_context(
    input: &Phase7GitCommitDispatchInputV1<'_>,
    context: &DispatchContext,
) -> Result<(), Phase7GitAdapterErrorV1> {
    verify_dispatch_context_for_adapter(
        input,
        context,
        PHASE7_GIT_ADAPTER_REF_V1,
        PHASE7_GIT_ADAPTER_VERSION_V1,
    )
}

fn verify_dispatch_context_for_adapter(
    input: &Phase7GitCommitDispatchInputV1<'_>,
    context: &DispatchContext,
    adapter_ref: &str,
    adapter_version: &str,
) -> Result<(), Phase7GitAdapterErrorV1> {
    if context.project_ref != input.project_ref
        || context.resource_ref != input.resource_ref
        || context.authorization_id != input.authorization_id
        || context.operation_id != input.operation_id
        || context.consumption_id != input.consumption_id
        || context.action_digest != input.derived_request.action_digest
        || context.target_digest != input.derived_request.target_digest
        || context.configuration_digest != input.derived_request.configuration_digest
        || context.executable_digest != input.derived_request.executable_digest
        || context.adapter_ref != format!("{adapter_ref}@{adapter_version}")
    {
        return Err(Phase7GitAdapterErrorV1::EvidenceDrift);
    }
    Ok(())
}

fn insert_attempt(
    transaction: &Transaction<'_>,
    attempt: &AttemptRecord,
) -> Result<(), Phase7GitAdapterErrorV1> {
    let sequence = attempt.attempt_sequence.to_be_bytes();
    let record_digest = digest_fields(
        ATTEMPT_RECORD_DIGEST_DOMAIN,
        &[
            attempt.operation_attempt_id.as_bytes(),
            attempt.audit_binding_id.as_bytes(),
            attempt.project_ref.as_bytes(),
            attempt.resource_ref.as_bytes(),
            attempt.operation_id.as_bytes(),
            &sequence,
            attempt.adapter_ref.as_bytes(),
            attempt.protocol_version.as_bytes(),
            &attempt.tool_arguments_digest,
            attempt.created_at.as_bytes(),
        ],
    );
    if phase7_entity_exists(transaction, &attempt.operation_attempt_id).map_err(map_persistence)?
        || audit_binding_exists(transaction, &attempt.audit_binding_id).map_err(map_persistence)?
    {
        return Err(Phase7GitAdapterErrorV1::EvidenceDrift);
    }
    insert_entity_and_audit(
        transaction,
        &attempt.operation_attempt_id,
        "operation_attempt",
        &attempt.project_ref,
        &attempt.resource_ref,
        &attempt.audit_binding_id,
        &record_digest,
        "persistence_prepared",
        "none",
        &attempt.created_at,
    )
    .map_err(map_persistence)?;
    transaction
        .execute(
            "INSERT INTO lnsat_operation_attempts (
                operation_attempt_id, entity_kind, project_ref, resource_ref,
                operation_id, attempt_sequence, adapter_ref, protocol_version,
                tool_arguments_digest, created_at
             ) VALUES (?1, 'operation_attempt', ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            params![
                &attempt.operation_attempt_id,
                &attempt.project_ref,
                &attempt.resource_ref,
                &attempt.operation_id,
                attempt.attempt_sequence,
                &attempt.adapter_ref,
                &attempt.protocol_version,
                attempt.tool_arguments_digest.as_slice(),
                &attempt.created_at,
            ],
        )
        .map_err(|_| Phase7GitAdapterErrorV1::PersistenceFailed)?;
    Ok(())
}

fn select_attempt(
    connection: &Connection,
    operation_id: &str,
) -> Result<Option<AttemptRecord>, Phase7GitAdapterErrorV1> {
    connection
        .query_row(
            "SELECT attempt.operation_attempt_id, entity.audit_binding_id,
                    attempt.project_ref, attempt.resource_ref, attempt.operation_id,
                    attempt.attempt_sequence, attempt.adapter_ref,
                    attempt.protocol_version, attempt.tool_arguments_digest,
                    attempt.created_at
             FROM lnsat_operation_attempts AS attempt
             JOIN lnsat_phase7_entities AS entity
               ON entity.entity_id = attempt.operation_attempt_id
             WHERE attempt.operation_id = ?1",
            [operation_id],
            |row| {
                Ok(AttemptRecord {
                    operation_attempt_id: row.get(0)?,
                    audit_binding_id: row.get(1)?,
                    project_ref: row.get(2)?,
                    resource_ref: row.get(3)?,
                    operation_id: row.get(4)?,
                    attempt_sequence: row.get(5)?,
                    adapter_ref: row.get(6)?,
                    protocol_version: row.get(7)?,
                    tool_arguments_digest: blob_32(row.get(8)?)?,
                    created_at: row.get(9)?,
                })
            },
        )
        .optional()
        .map_err(|_| Phase7GitAdapterErrorV1::PersistenceFailed)
}

fn insert_receipt(
    transaction: &Transaction<'_>,
    attempt: &AttemptRecord,
    receipt: &Phase7GitCommitReceiptV1,
) -> Result<(), Phase7GitAdapterErrorV1> {
    if select_receipt_id(transaction, &attempt.operation_id)?.is_some() {
        return Err(Phase7GitAdapterErrorV1::EvidenceDrift);
    }
    let audit_binding_id = identifier(
        "p7a_",
        RECEIPT_AUDIT_ID_DOMAIN,
        &[receipt.receipt_id.as_bytes()],
    );
    let record_digest = digest_fields(
        RECEIPT_RECORD_DIGEST_DOMAIN,
        &[
            receipt.receipt_id.as_bytes(),
            audit_binding_id.as_bytes(),
            attempt.project_ref.as_bytes(),
            attempt.resource_ref.as_bytes(),
            receipt.operation_id.as_bytes(),
            receipt.operation_attempt_id.as_bytes(),
            receipt.authorization_id.as_bytes(),
            receipt.consumption_id.as_bytes(),
            &receipt.result_digest,
            RECEIPT_PROFILE_V1.as_bytes(),
            receipt.received_at.as_bytes(),
        ],
    );
    insert_entity_and_audit(
        transaction,
        &receipt.receipt_id,
        "operation_receipt",
        &attempt.project_ref,
        &attempt.resource_ref,
        &audit_binding_id,
        &record_digest,
        "receipt_recorded",
        "receipt_bound",
        &receipt.received_at,
    )
    .map_err(map_persistence)?;
    transaction
        .execute(
            "INSERT INTO lnsat_operation_receipts (
                receipt_id, entity_kind, project_ref, resource_ref,
                operation_id, operation_attempt_id, authorization_id,
                consumption_id, requested_action_digest, approved_action_digest,
                authorized_action_digest, executed_action_digest, result_digest,
                receipt_authentication_profile, verification_status, digest_bound,
                received_at
             )
             SELECT ?1, 'operation_receipt', ?2, ?3, operation.operation_id,
                    ?4, operation.authorization_id, consumption.consumption_id,
                    operation.requested_action_digest, operation.approved_action_digest,
                    operation.authorized_action_digest, operation.authorized_action_digest,
                    ?5, ?6, 'accepted', 1, ?7
             FROM lnsat_operations AS operation
             JOIN lnsat_capability_consumptions AS consumption
               ON consumption.operation_id = operation.operation_id
             WHERE operation.operation_id = ?8 AND consumption.consumption_id = ?9",
            params![
                &receipt.receipt_id,
                &attempt.project_ref,
                &attempt.resource_ref,
                &attempt.operation_attempt_id,
                receipt.result_digest.as_slice(),
                RECEIPT_PROFILE_V1,
                &receipt.received_at,
                &receipt.operation_id,
                &receipt.consumption_id,
            ],
        )
        .map_err(|_| Phase7GitAdapterErrorV1::PersistenceFailed)?;
    Ok(())
}

fn insert_reconciliation(
    transaction: &Transaction<'_>,
    attempt: &AttemptRecord,
    receipt: &Phase7GitCommitReceiptV1,
    recorded_at: &str,
) -> Result<(), Phase7GitAdapterErrorV1> {
    let sequence = 1_i64;
    let sequence_bytes = sequence.to_be_bytes();
    let reconciliation_id = identifier(
        "rec_",
        RECONCILIATION_ID_DOMAIN,
        &[
            attempt.operation_id.as_bytes(),
            attempt.operation_attempt_id.as_bytes(),
            &sequence_bytes,
            &receipt.result_digest,
        ],
    );
    let audit_binding_id = identifier(
        "p7a_",
        RECONCILIATION_AUDIT_ID_DOMAIN,
        &[reconciliation_id.as_bytes()],
    );
    let record_digest = digest_fields(
        RECONCILIATION_RECORD_DIGEST_DOMAIN,
        &[
            reconciliation_id.as_bytes(),
            audit_binding_id.as_bytes(),
            attempt.project_ref.as_bytes(),
            attempt.resource_ref.as_bytes(),
            attempt.operation_id.as_bytes(),
            attempt.operation_attempt_id.as_bytes(),
            receipt.receipt_id.as_bytes(),
            &sequence_bytes,
            b"matched",
            &receipt.result_digest,
            recorded_at.as_bytes(),
        ],
    );
    insert_entity_and_audit(
        transaction,
        &reconciliation_id,
        "operation_reconciliation",
        &attempt.project_ref,
        &attempt.resource_ref,
        &audit_binding_id,
        &record_digest,
        "reconciliation_recorded",
        "receipt_bound",
        recorded_at,
    )
    .map_err(map_persistence)?;
    transaction
        .execute(
            "INSERT INTO lnsat_operation_reconciliations (
                reconciliation_id, entity_kind, project_ref, resource_ref,
                operation_id, operation_attempt_id, receipt_id,
                reconciliation_sequence, status, observed_result_digest, recorded_at
             ) VALUES (?1, 'operation_reconciliation', ?2, ?3, ?4, ?5, ?6, 1,
                       'matched', ?7, ?8)",
            params![
                &reconciliation_id,
                &attempt.project_ref,
                &attempt.resource_ref,
                &attempt.operation_id,
                &attempt.operation_attempt_id,
                &receipt.receipt_id,
                receipt.result_digest.as_slice(),
                recorded_at,
            ],
        )
        .map_err(|_| Phase7GitAdapterErrorV1::PersistenceFailed)?;
    Ok(())
}

fn select_receipt_id(
    connection: &Connection,
    operation_id: &str,
) -> Result<Option<String>, Phase7GitAdapterErrorV1> {
    connection
        .query_row(
            "SELECT receipt_id FROM lnsat_operation_receipts WHERE operation_id = ?1",
            [operation_id],
            |row| row.get(0),
        )
        .optional()
        .map_err(|_| Phase7GitAdapterErrorV1::PersistenceFailed)
}

pub(super) fn verify_phase7_git_adapter_records_v1(
    connection: &Connection,
) -> Result<(), SqliteStoreError> {
    let mut attempts = connection
        .prepare(
            "SELECT attempt.operation_attempt_id, entity.audit_binding_id,
                    attempt.project_ref, attempt.resource_ref, attempt.operation_id,
                    attempt.attempt_sequence, attempt.adapter_ref, attempt.protocol_version,
                    attempt.tool_arguments_digest, attempt.created_at,
                    entity.record_digest, audit.event_kind, audit.authority_effect,
                    audit.recorded_at
             FROM lnsat_operation_attempts AS attempt
             JOIN lnsat_phase7_entities AS entity
               ON entity.entity_id = attempt.operation_attempt_id
             JOIN lnsat_phase7_audit_bindings AS audit
               ON audit.record_id = attempt.operation_attempt_id",
        )
        .map_err(|_| SqliteStoreError::MigrationDrift)?;
    let attempt_rows = attempts
        .query_map([], |row| {
            Ok((
                AttemptRecord {
                    operation_attempt_id: row.get(0)?,
                    audit_binding_id: row.get(1)?,
                    project_ref: row.get(2)?,
                    resource_ref: row.get(3)?,
                    operation_id: row.get(4)?,
                    attempt_sequence: row.get(5)?,
                    adapter_ref: row.get(6)?,
                    protocol_version: row.get(7)?,
                    tool_arguments_digest: blob_32(row.get(8)?)?,
                    created_at: row.get(9)?,
                },
                blob_32(row.get(10)?)?,
                row.get::<_, String>(11)?,
                row.get::<_, String>(12)?,
                row.get::<_, String>(13)?,
            ))
        })
        .map_err(|_| SqliteStoreError::MigrationDrift)?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|_| SqliteStoreError::MigrationDrift)?;
    drop(attempts);
    for (attempt, stored_digest, event_kind, authority_effect, recorded_at) in attempt_rows {
        let sequence = attempt.attempt_sequence.to_be_bytes();
        let expected_digest = digest_fields(
            ATTEMPT_RECORD_DIGEST_DOMAIN,
            &[
                attempt.operation_attempt_id.as_bytes(),
                attempt.audit_binding_id.as_bytes(),
                attempt.project_ref.as_bytes(),
                attempt.resource_ref.as_bytes(),
                attempt.operation_id.as_bytes(),
                &sequence,
                attempt.adapter_ref.as_bytes(),
                attempt.protocol_version.as_bytes(),
                &attempt.tool_arguments_digest,
                attempt.created_at.as_bytes(),
            ],
        );
        let known_adapter_protocol = (attempt.adapter_ref
            == format!("{PHASE7_GIT_ADAPTER_REF_V1}@{PHASE7_GIT_ADAPTER_VERSION_V1}")
            && attempt.protocol_version == PROTOCOL_VERSION_V1)
            || (attempt.adapter_ref
                == format!(
                    "{PHASE11_DOCKER_GIT_ADAPTER_REF_V1}@{PHASE11_DOCKER_GIT_ADAPTER_VERSION_V1}"
                )
                && attempt.protocol_version == PHASE11_DOCKER_PROTOCOL_VERSION_V1);
        if attempt.attempt_sequence != 1
            || !known_adapter_protocol
            || attempt.operation_attempt_id
                != identifier(
                    "opa_",
                    ATTEMPT_ID_DOMAIN,
                    &[
                        attempt.operation_id.as_bytes(),
                        &attempt.tool_arguments_digest,
                    ],
                )
            || attempt.audit_binding_id
                != identifier(
                    "p7a_",
                    ATTEMPT_AUDIT_ID_DOMAIN,
                    &[attempt.operation_attempt_id.as_bytes()],
                )
            || stored_digest != expected_digest
            || event_kind != "persistence_prepared"
            || authority_effect != "none"
            || recorded_at != attempt.created_at
        {
            return Err(SqliteStoreError::MigrationDrift);
        }
    }

    verify_receipt_rows(connection)?;
    verify_reconciliation_rows(connection)?;
    verify_attempt_state_rows(connection)
}

fn verify_receipt_rows(connection: &Connection) -> Result<(), SqliteStoreError> {
    let mut statement = connection
        .prepare(
            "SELECT receipt.receipt_id, entity.audit_binding_id,
                    receipt.project_ref, receipt.resource_ref, receipt.operation_id,
                    receipt.operation_attempt_id, receipt.authorization_id,
                    receipt.consumption_id, receipt.result_digest,
                    receipt.receipt_authentication_profile, receipt.received_at,
                    entity.record_digest, audit.event_kind, audit.authority_effect,
                    audit.recorded_at, receipt.verification_status, receipt.digest_bound
             FROM lnsat_operation_receipts AS receipt
             JOIN lnsat_phase7_entities AS entity ON entity.entity_id = receipt.receipt_id
             JOIN lnsat_phase7_audit_bindings AS audit ON audit.record_id = receipt.receipt_id",
        )
        .map_err(|_| SqliteStoreError::MigrationDrift)?;
    let rows = statement
        .query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, String>(3)?,
                row.get::<_, String>(4)?,
                row.get::<_, String>(5)?,
                row.get::<_, String>(6)?,
                row.get::<_, String>(7)?,
                blob_32(row.get(8)?)?,
                row.get::<_, String>(9)?,
                row.get::<_, String>(10)?,
                blob_32(row.get(11)?)?,
                row.get::<_, String>(12)?,
                row.get::<_, String>(13)?,
                row.get::<_, String>(14)?,
                row.get::<_, String>(15)?,
                row.get::<_, i64>(16)?,
            ))
        })
        .map_err(|_| SqliteStoreError::MigrationDrift)?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|_| SqliteStoreError::MigrationDrift)?;
    for (
        receipt_id,
        audit_id,
        project,
        resource,
        operation,
        attempt,
        authorization,
        consumption,
        result,
        profile,
        received_at,
        stored,
        event,
        effect,
        audit_at,
        verification,
        digest_bound,
    ) in rows
    {
        let expected = digest_fields(
            RECEIPT_RECORD_DIGEST_DOMAIN,
            &[
                receipt_id.as_bytes(),
                audit_id.as_bytes(),
                project.as_bytes(),
                resource.as_bytes(),
                operation.as_bytes(),
                attempt.as_bytes(),
                authorization.as_bytes(),
                consumption.as_bytes(),
                &result,
                profile.as_bytes(),
                received_at.as_bytes(),
            ],
        );
        if receipt_id != identifier("rcp_", RECEIPT_ID_DOMAIN, &[operation.as_bytes(), &result])
            || audit_id != identifier("p7a_", RECEIPT_AUDIT_ID_DOMAIN, &[receipt_id.as_bytes()])
            || stored != expected
            || profile != RECEIPT_PROFILE_V1
            || event != "receipt_recorded"
            || effect != "receipt_bound"
            || audit_at != received_at
            || verification != "accepted"
            || digest_bound != 1
        {
            return Err(SqliteStoreError::MigrationDrift);
        }
    }
    Ok(())
}

#[allow(clippy::too_many_lines)]
fn verify_reconciliation_rows(connection: &Connection) -> Result<(), SqliteStoreError> {
    let mut statement = connection
        .prepare(
            "SELECT reconciliation.reconciliation_id, entity.audit_binding_id,
                    reconciliation.project_ref, reconciliation.resource_ref,
                    reconciliation.operation_id, reconciliation.operation_attempt_id,
                    reconciliation.receipt_id, reconciliation.reconciliation_sequence,
                    reconciliation.status, reconciliation.observed_result_digest,
                    reconciliation.recorded_at, entity.record_digest,
                    audit.event_kind, audit.authority_effect, audit.recorded_at,
                    receipt.operation_id, receipt.operation_attempt_id,
                    receipt.result_digest
             FROM lnsat_operation_reconciliations AS reconciliation
             JOIN lnsat_phase7_entities AS entity
               ON entity.entity_id = reconciliation.reconciliation_id
             JOIN lnsat_phase7_audit_bindings AS audit
               ON audit.record_id = reconciliation.reconciliation_id
             JOIN lnsat_operation_receipts AS receipt
               ON receipt.receipt_id = reconciliation.receipt_id
              AND receipt.project_ref = reconciliation.project_ref
              AND receipt.resource_ref = reconciliation.resource_ref",
        )
        .map_err(|_| SqliteStoreError::MigrationDrift)?;
    let rows = statement
        .query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, String>(3)?,
                row.get::<_, String>(4)?,
                row.get::<_, String>(5)?,
                row.get::<_, String>(6)?,
                row.get::<_, i64>(7)?,
                row.get::<_, String>(8)?,
                blob_32(row.get(9)?)?,
                row.get::<_, String>(10)?,
                blob_32(row.get(11)?)?,
                row.get::<_, String>(12)?,
                row.get::<_, String>(13)?,
                row.get::<_, String>(14)?,
                row.get::<_, String>(15)?,
                row.get::<_, String>(16)?,
                blob_32(row.get(17)?)?,
            ))
        })
        .map_err(|_| SqliteStoreError::MigrationDrift)?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|_| SqliteStoreError::MigrationDrift)?;
    for (
        id,
        audit_id,
        project,
        resource,
        operation,
        attempt,
        receipt,
        sequence,
        status,
        observed,
        recorded_at,
        stored,
        event,
        effect,
        audit_at,
        receipt_operation,
        receipt_attempt,
        receipt_result,
    ) in rows
    {
        let sequence_bytes = sequence.to_be_bytes();
        let expected = digest_fields(
            RECONCILIATION_RECORD_DIGEST_DOMAIN,
            &[
                id.as_bytes(),
                audit_id.as_bytes(),
                project.as_bytes(),
                resource.as_bytes(),
                operation.as_bytes(),
                attempt.as_bytes(),
                receipt.as_bytes(),
                &sequence_bytes,
                status.as_bytes(),
                &observed,
                recorded_at.as_bytes(),
            ],
        );
        if sequence != 1
            || status != "matched"
            || operation != receipt_operation
            || attempt != receipt_attempt
            || observed != receipt_result
            || id
                != identifier(
                    "rec_",
                    RECONCILIATION_ID_DOMAIN,
                    &[
                        operation.as_bytes(),
                        attempt.as_bytes(),
                        &sequence_bytes,
                        &observed,
                    ],
                )
            || audit_id != identifier("p7a_", RECONCILIATION_AUDIT_ID_DOMAIN, &[id.as_bytes()])
            || stored != expected
            || event != "reconciliation_recorded"
            || effect != "receipt_bound"
            || audit_at != recorded_at
        {
            return Err(SqliteStoreError::MigrationDrift);
        }
    }
    Ok(())
}

#[allow(clippy::too_many_lines)]
fn verify_attempt_state_rows(connection: &Connection) -> Result<(), SqliteStoreError> {
    let mut statement = connection
        .prepare(
            "SELECT state.state_event_id, entity.audit_binding_id,
                    state.project_ref, state.resource_ref, state.target_entity_id,
                    state.target_entity_kind, state.state_sequence, state.state,
                    state.prior_state_event_id, state.prior_state_sequence,
                    state.effective_at, state.state_digest, entity.record_digest,
                    audit.event_kind, audit.authority_effect, audit.recorded_at
             FROM lnsat_phase7_state_events AS state
             JOIN lnsat_phase7_entities AS entity ON entity.entity_id = state.state_event_id
             JOIN lnsat_phase7_audit_bindings AS audit ON audit.record_id = state.state_event_id
             WHERE state.target_entity_kind = 'operation_attempt'
             ORDER BY state.target_entity_id, state.state_sequence",
        )
        .map_err(|_| SqliteStoreError::MigrationDrift)?;
    let rows = statement
        .query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, String>(3)?,
                row.get::<_, String>(4)?,
                row.get::<_, String>(5)?,
                row.get::<_, i64>(6)?,
                row.get::<_, String>(7)?,
                row.get::<_, Option<String>>(8)?,
                row.get::<_, Option<i64>>(9)?,
                row.get::<_, String>(10)?,
                blob_32(row.get(11)?)?,
                blob_32(row.get(12)?)?,
                row.get::<_, String>(13)?,
                row.get::<_, String>(14)?,
                row.get::<_, String>(15)?,
            ))
        })
        .map_err(|_| SqliteStoreError::MigrationDrift)?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|_| SqliteStoreError::MigrationDrift)?;
    let mut prior: Option<(String, String, String, i64)> = None;
    for (
        id,
        audit_id,
        project,
        resource,
        target,
        kind,
        sequence,
        state,
        prior_id,
        prior_sequence,
        effective_at,
        state_digest,
        stored_digest,
        event,
        effect,
        audit_at,
    ) in rows
    {
        if prior
            .as_ref()
            .is_none_or(|(prior_target, _, _, _)| prior_target != &target)
        {
            prior = None;
        }
        let sequence_bytes = sequence.to_be_bytes();
        let prior_sequence_bytes = prior_sequence.unwrap_or(0).to_be_bytes();
        let expected_id = identifier(
            "ste_",
            STATE_EVENT_ID_DOMAIN,
            &[target.as_bytes(), state.as_bytes(), &sequence_bytes],
        );
        let expected_state = digest_fields(
            STATE_DIGEST_DOMAIN,
            &[
                target.as_bytes(),
                kind.as_bytes(),
                state.as_bytes(),
                &sequence_bytes,
                prior_id.as_deref().unwrap_or("").as_bytes(),
                &prior_sequence_bytes,
                effective_at.as_bytes(),
            ],
        );
        let expected_record = digest_fields(
            STATE_RECORD_DIGEST_DOMAIN,
            &[
                id.as_bytes(),
                audit_id.as_bytes(),
                project.as_bytes(),
                resource.as_bytes(),
                target.as_bytes(),
                kind.as_bytes(),
                &sequence_bytes,
                state.as_bytes(),
                &state_digest,
                effective_at.as_bytes(),
            ],
        );
        let transition_valid = match prior.as_ref().map(|(_, _, value, _)| value.as_str()) {
            None => state == "dispatching" && sequence == 1,
            Some("dispatching") => {
                matches!(state.as_str(), "outcome_unknown" | "completed" | "failed")
            }
            Some("outcome_unknown") => state == "completed",
            _ => false,
        };
        if !transition_valid
            || id != expected_id
            || audit_id != identifier("p7a_", STATE_AUDIT_ID_DOMAIN, &[id.as_bytes()])
            || prior_id.as_deref() != prior.as_ref().map(|(_, id, _, _)| id.as_str())
            || prior_sequence != prior.as_ref().map(|(_, _, _, sequence)| *sequence)
            || state_digest != expected_state
            || stored_digest != expected_record
            || event != "operation_attempt_state_recorded"
            || audit_at != effective_at
            || effect
                != if state == "completed" {
                    "receipt_bound"
                } else if state == "outcome_unknown" {
                    "adapter_executed"
                } else {
                    "none"
                }
        {
            return Err(SqliteStoreError::MigrationDrift);
        }
        prior = Some((target, id, state, sequence));
    }
    Ok(())
}

#[allow(clippy::too_many_arguments)]
fn append_state_event(
    transaction: &Transaction<'_>,
    project_ref: &str,
    resource_ref: &str,
    target_id: &str,
    target_kind: &str,
    state: &str,
    effective_at: &str,
    event_kind: &str,
    authority_effect: &str,
) -> Result<(), Phase7GitAdapterErrorV1> {
    let prior: Option<(String, i64)> = transaction
        .query_row(
            "SELECT state_event_id, state_sequence
             FROM lnsat_phase7_state_events
             WHERE target_entity_id = ?1
             ORDER BY state_sequence DESC LIMIT 1",
            [target_id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .optional()
        .map_err(|_| Phase7GitAdapterErrorV1::PersistenceFailed)?;
    let sequence = prior.as_ref().map_or(1, |(_, sequence)| sequence + 1);
    if !(1..=64).contains(&sequence) {
        return Err(Phase7GitAdapterErrorV1::EvidenceDrift);
    }
    let sequence_bytes = sequence.to_be_bytes();
    let prior_sequence_bytes = prior
        .as_ref()
        .map_or(0_i64, |(_, value)| *value)
        .to_be_bytes();
    let prior_id = prior.as_ref().map_or("", |(id, _)| id.as_str());
    let state_event_id = identifier(
        "ste_",
        STATE_EVENT_ID_DOMAIN,
        &[target_id.as_bytes(), state.as_bytes(), &sequence_bytes],
    );
    let audit_binding_id = identifier("p7a_", STATE_AUDIT_ID_DOMAIN, &[state_event_id.as_bytes()]);
    let state_digest = digest_fields(
        STATE_DIGEST_DOMAIN,
        &[
            target_id.as_bytes(),
            target_kind.as_bytes(),
            state.as_bytes(),
            &sequence_bytes,
            prior_id.as_bytes(),
            &prior_sequence_bytes,
            effective_at.as_bytes(),
        ],
    );
    let record_digest = digest_fields(
        STATE_RECORD_DIGEST_DOMAIN,
        &[
            state_event_id.as_bytes(),
            audit_binding_id.as_bytes(),
            project_ref.as_bytes(),
            resource_ref.as_bytes(),
            target_id.as_bytes(),
            target_kind.as_bytes(),
            &sequence_bytes,
            state.as_bytes(),
            &state_digest,
            effective_at.as_bytes(),
        ],
    );
    insert_entity_and_audit(
        transaction,
        &state_event_id,
        "phase7_state_event",
        project_ref,
        resource_ref,
        &audit_binding_id,
        &record_digest,
        event_kind,
        authority_effect,
        effective_at,
    )
    .map_err(map_persistence)?;
    transaction
        .execute(
            "INSERT INTO lnsat_phase7_state_events (
                state_event_id, entity_kind, project_ref, resource_ref,
                target_entity_id, target_entity_kind, state_sequence, state,
                prior_state_event_id, prior_state_sequence, effective_at, state_digest
             ) VALUES (?1, 'phase7_state_event', ?2, ?3, ?4, ?5, ?6, ?7,
                       ?8, ?9, ?10, ?11)",
            params![
                &state_event_id,
                project_ref,
                resource_ref,
                target_id,
                target_kind,
                sequence,
                state,
                prior.as_ref().map(|(id, _)| id),
                prior.as_ref().map(|(_, value)| value),
                effective_at,
                state_digest.as_slice(),
            ],
        )
        .map_err(|_| Phase7GitAdapterErrorV1::PersistenceFailed)?;
    Ok(())
}

fn build_receipt(
    input: &Phase7GitCommitDispatchInputV1<'_>,
    attempt: &AttemptRecord,
    parsed: &ParsedGitRequest,
    commit_oid: &str,
    received_at: &str,
) -> Phase7GitCommitReceiptV1 {
    build_receipt_for_adapter(
        input,
        attempt,
        parsed,
        commit_oid,
        received_at,
        PHASE7_GIT_ADAPTER_REF_V1,
        PHASE7_GIT_ADAPTER_VERSION_V1,
    )
}

#[allow(clippy::too_many_arguments)]
fn build_receipt_for_adapter(
    input: &Phase7GitCommitDispatchInputV1<'_>,
    attempt: &AttemptRecord,
    parsed: &ParsedGitRequest,
    commit_oid: &str,
    received_at: &str,
    adapter_ref: &str,
    adapter_version: &str,
) -> Phase7GitCommitReceiptV1 {
    let result_digest = receipt_result_digest_for_adapter(
        input,
        attempt,
        parsed,
        commit_oid,
        received_at,
        adapter_ref,
        adapter_version,
    );
    let receipt_id = identifier(
        "rcp_",
        RECEIPT_ID_DOMAIN,
        &[input.operation_id.as_bytes(), &result_digest],
    );
    Phase7GitCommitReceiptV1 {
        receipt_id,
        operation_id: input.operation_id.to_owned(),
        operation_attempt_id: attempt.operation_attempt_id.clone(),
        authorization_id: input.authorization_id.to_owned(),
        consumption_id: input.consumption_id.to_owned(),
        adapter_ref: adapter_ref.to_owned(),
        adapter_version: adapter_version.to_owned(),
        commit_oid: commit_oid.to_owned(),
        tree_oid: parsed.expected_tree_oid.clone(),
        changed_paths: parsed.allowed_paths.clone(),
        patch_sha256: parsed.patch_sha256.clone(),
        metadata: parsed.metadata.clone(),
        result_digest,
        received_at: received_at.to_owned(),
    }
}

#[allow(clippy::too_many_arguments)]
fn receipt_result_digest_for_adapter(
    input: &Phase7GitCommitDispatchInputV1<'_>,
    attempt: &AttemptRecord,
    parsed: &ParsedGitRequest,
    commit_oid: &str,
    received_at: &str,
    adapter_ref: &str,
    adapter_version: &str,
) -> [u8; 32] {
    let paths = parsed.allowed_paths.join("\0");
    digest_fields(
        RECEIPT_RESULT_DIGEST_DOMAIN,
        &[
            input.operation_id.as_bytes(),
            attempt.operation_attempt_id.as_bytes(),
            input.authorization_id.as_bytes(),
            input.consumption_id.as_bytes(),
            adapter_ref.as_bytes(),
            adapter_version.as_bytes(),
            commit_oid.as_bytes(),
            parsed.expected_tree_oid.as_bytes(),
            paths.as_bytes(),
            parsed.patch_sha256.as_bytes(),
            parsed.metadata.message.as_bytes(),
            parsed.metadata.author_name.as_bytes(),
            parsed.metadata.author_email.as_bytes(),
            parsed.metadata.author_time.as_bytes(),
            parsed.metadata.committer_name.as_bytes(),
            parsed.metadata.committer_email.as_bytes(),
            parsed.metadata.committer_time.as_bytes(),
            received_at.as_bytes(),
        ],
    )
}

fn tool_arguments_digest(parsed: &ParsedGitRequest) -> [u8; 32] {
    let paths = parsed.allowed_paths.join("\0");
    digest_fields(
        TOOL_ARGUMENTS_DIGEST_DOMAIN,
        &[
            parsed
                .identity
                .repository_path
                .as_os_str()
                .as_encoded_bytes(),
            parsed.identity.git_dir_path.as_os_str().as_encoded_bytes(),
            parsed.identity.object_format.as_bytes(),
            parsed.identity.head_ref.as_bytes(),
            parsed.identity.base_commit_oid.as_bytes(),
            parsed.identity.fixture_marker_sha256.as_bytes(),
            parsed.expected_tree_oid.as_bytes(),
            paths.as_bytes(),
            parsed.patch_sha256.as_bytes(),
            parsed.metadata.message.as_bytes(),
            parsed.metadata.author_name.as_bytes(),
            parsed.metadata.author_email.as_bytes(),
            parsed.metadata.author_time.as_bytes(),
            parsed.metadata.committer_name.as_bytes(),
            parsed.metadata.committer_email.as_bytes(),
            parsed.metadata.committer_time.as_bytes(),
        ],
    )
}

fn execute_git_commit(
    git_executable: &Path,
    identity: &Phase7GitRepositoryIdentityV1,
    parsed: &ParsedGitRequest,
    patch: &[u8],
    operation_id: &str,
) -> Result<String, Phase7GitAdapterErrorV1> {
    let temporary_root = fs::canonicalize(std::env::temp_dir())
        .map_err(|_| Phase7GitAdapterErrorV1::TargetRejected)?;
    execute_git_commit_with_index_parent(
        git_executable,
        identity,
        parsed,
        patch,
        operation_id,
        &temporary_root,
    )
}

fn execute_git_commit_with_index_parent(
    git_executable: &Path,
    identity: &Phase7GitRepositoryIdentityV1,
    parsed: &ParsedGitRequest,
    patch: &[u8],
    operation_id: &str,
    index_parent: &Path,
) -> Result<String, Phase7GitAdapterErrorV1> {
    let executable = canonical_git_executable(git_executable)?;
    let index_root = private_index_directory_in_v1(index_parent, operation_id)?;
    let index_path = index_root.join("index");
    let index_env = [("GIT_INDEX_FILE", index_path.as_os_str())];
    let result = (|| {
        git_bytes(
            &executable,
            &identity.repository_path,
            &["read-tree", &identity.base_commit_oid],
            &[],
            &index_env,
        )?;
        git_bytes(
            &executable,
            &identity.repository_path,
            &["apply", "--cached", "--recount", "--whitespace=nowarn", "-"],
            patch,
            &index_env,
        )?;
        let tree_oid = git_text_with_env(
            &executable,
            &identity.repository_path,
            &["write-tree"],
            &[],
            &index_env,
        )?;
        let tree_oid = tree_oid.trim();
        if tree_oid != parsed.expected_tree_oid {
            return Err(Phase7GitAdapterErrorV1::EvidenceDrift);
        }
        validate_tree_change(&executable, identity, parsed)?;
        let metadata_env = [
            ("GIT_AUTHOR_NAME", OsStr::new(&parsed.metadata.author_name)),
            (
                "GIT_AUTHOR_EMAIL",
                OsStr::new(&parsed.metadata.author_email),
            ),
            ("GIT_AUTHOR_DATE", OsStr::new(&parsed.metadata.author_time)),
            (
                "GIT_COMMITTER_NAME",
                OsStr::new(&parsed.metadata.committer_name),
            ),
            (
                "GIT_COMMITTER_EMAIL",
                OsStr::new(&parsed.metadata.committer_email),
            ),
            (
                "GIT_COMMITTER_DATE",
                OsStr::new(&parsed.metadata.committer_time),
            ),
        ];
        let commit_oid = git_text_with_env(
            &executable,
            &identity.repository_path,
            &["commit-tree", tree_oid, "-p", &identity.base_commit_oid],
            parsed.metadata.message.as_bytes(),
            &metadata_env,
        )?;
        let commit_oid = commit_oid.trim().to_owned();
        if !valid_oid(&commit_oid) {
            return Err(Phase7GitAdapterErrorV1::GitRejected);
        }
        validate_commit_object(&executable, identity, parsed, &commit_oid)?;
        git_bytes(
            &executable,
            &identity.repository_path,
            &[
                "update-ref",
                &identity.head_ref,
                &commit_oid,
                &identity.base_commit_oid,
            ],
            &[],
            &[],
        )?;
        inspect_exact_consequence(&executable, identity, parsed, Some(&commit_oid))
    })();
    let index_removed = remove_optional_file_v1(&index_path);
    let lock_removed = remove_optional_file_v1(&index_path.with_extension("lock"));
    let directory_removed = fs::remove_dir(&index_root).is_ok();
    match (result, index_removed && lock_removed && directory_removed) {
        (Ok(commit_oid), true) => Ok(commit_oid),
        (Ok(_), false) => Err(Phase7GitAdapterErrorV1::OutcomeUnknown),
        (Err(error), _) => Err(error),
    }
}

fn remove_optional_file_v1(path: &Path) -> bool {
    match fs::remove_file(path) {
        Ok(()) => true,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => true,
        Err(_) => false,
    }
}

fn inspect_exact_consequence(
    git_executable: &Path,
    identity: &Phase7GitRepositoryIdentityV1,
    parsed: &ParsedGitRequest,
    expected_commit: Option<&str>,
) -> Result<String, Phase7GitAdapterErrorV1> {
    let executable = canonical_git_executable(git_executable)?;
    let current = git_text(
        &executable,
        &identity.repository_path,
        &["rev-parse", "--verify", &identity.head_ref],
        &[],
    )?;
    let current = current.trim().to_owned();
    if !valid_oid(&current) || expected_commit.is_some_and(|expected| expected != current) {
        return Err(Phase7GitAdapterErrorV1::OutcomeUnknown);
    }
    validate_commit_object(&executable, identity, parsed, &current)?;
    validate_tree_change(&executable, identity, parsed)?;
    Ok(current)
}

fn validate_commit_object(
    executable: &Path,
    identity: &Phase7GitRepositoryIdentityV1,
    parsed: &ParsedGitRequest,
    commit_oid: &str,
) -> Result<(), Phase7GitAdapterErrorV1> {
    let content = git_text(
        executable,
        &identity.repository_path,
        &["cat-file", "commit", commit_oid],
        &[],
    )?;
    let expected = format!(
        "tree {}\nparent {}\nauthor {} <{}> {}\ncommitter {} <{}> {}\n\n{}",
        parsed.expected_tree_oid,
        identity.base_commit_oid,
        parsed.metadata.author_name,
        parsed.metadata.author_email,
        parsed.metadata.author_time,
        parsed.metadata.committer_name,
        parsed.metadata.committer_email,
        parsed.metadata.committer_time,
        parsed.metadata.message,
    );
    if content != expected {
        return Err(Phase7GitAdapterErrorV1::ReceiptRejected);
    }
    Ok(())
}

fn validate_tree_change(
    executable: &Path,
    identity: &Phase7GitRepositoryIdentityV1,
    parsed: &ParsedGitRequest,
) -> Result<(), Phase7GitAdapterErrorV1> {
    let output = git_bytes(
        executable,
        &identity.repository_path,
        &[
            "diff-tree",
            "--no-commit-id",
            "--name-only",
            "-r",
            "-z",
            &identity.base_commit_oid,
            &parsed.expected_tree_oid,
        ],
        &[],
        &[],
    )?;
    let changed = parse_nul_paths(&output)?;
    if changed != parsed.allowed_paths {
        return Err(Phase7GitAdapterErrorV1::EvidenceDrift);
    }
    for path in &changed {
        let entry = git_bytes(
            executable,
            &identity.repository_path,
            &["ls-tree", "-z", &parsed.expected_tree_oid, "--", path],
            &[],
            &[],
        )?;
        if !(entry.is_empty()
            || entry.starts_with(b"100644 blob ")
            || entry.starts_with(b"100755 blob "))
        {
            return Err(Phase7GitAdapterErrorV1::TargetRejected);
        }
    }
    Ok(())
}

fn validate_clean_target(
    git_executable: &Path,
    identity: &Phase7GitRepositoryIdentityV1,
) -> Result<(), Phase7GitAdapterErrorV1> {
    validate_phase8_approved_base_index_and_worktree_v1(
        git_executable,
        identity,
        &identity.base_commit_oid,
    )
}

fn validate_path_safety(root: &Path, paths: &[String]) -> Result<(), Phase7GitAdapterErrorV1> {
    for path in paths {
        validate_relative_path(path)?;
        let mut cursor = root.to_path_buf();
        let components: Vec<_> = Path::new(path).components().collect();
        for component in components.iter().take(components.len().saturating_sub(1)) {
            if let Component::Normal(value) = component {
                cursor.push(value);
                if let Ok(metadata) = fs::symlink_metadata(&cursor)
                    && metadata.file_type().is_symlink()
                {
                    return Err(Phase7GitAdapterErrorV1::TargetRejected);
                }
            }
        }
        let target = root.join(path);
        if let Ok(metadata) = fs::symlink_metadata(target)
            && metadata.file_type().is_symlink()
        {
            return Err(Phase7GitAdapterErrorV1::TargetRejected);
        }
    }
    Ok(())
}

fn canonical_disposable_root(path: &Path) -> Result<PathBuf, Phase7GitAdapterErrorV1> {
    let canonical = fs::canonicalize(path).map_err(|_| Phase7GitAdapterErrorV1::TargetRejected)?;
    let temp = fs::canonicalize(std::env::temp_dir())
        .map_err(|_| Phase7GitAdapterErrorV1::TargetRejected)?;
    if !canonical.is_dir() || canonical == temp || !canonical.starts_with(&temp) {
        return Err(Phase7GitAdapterErrorV1::TargetRejected);
    }
    Ok(canonical)
}

fn canonical_mapped_repository_v1(path: &Path) -> Result<PathBuf, Phase7GitAdapterErrorV1> {
    if !path.is_absolute() || path.file_name().is_none() {
        return Err(Phase7GitAdapterErrorV1::TargetRejected);
    }
    let metadata =
        fs::symlink_metadata(path).map_err(|_| Phase7GitAdapterErrorV1::TargetRejected)?;
    let canonical = fs::canonicalize(path).map_err(|_| Phase7GitAdapterErrorV1::TargetRejected)?;
    if !metadata.file_type().is_dir()
        || metadata.file_type().is_symlink()
        || canonical != path
        || canonical.parent().is_none()
    {
        return Err(Phase7GitAdapterErrorV1::TargetRejected);
    }
    Ok(canonical)
}

fn canonical_git_executable(path: &Path) -> Result<PathBuf, Phase7GitAdapterErrorV1> {
    if !path.is_absolute() {
        return Err(Phase7GitAdapterErrorV1::TargetRejected);
    }
    let canonical = fs::canonicalize(path).map_err(|_| Phase7GitAdapterErrorV1::TargetRejected)?;
    if !canonical.is_file() {
        return Err(Phase7GitAdapterErrorV1::TargetRejected);
    }
    Ok(canonical)
}

fn validate_git_storage_boundary(
    executable: &Path,
    repository: &Path,
    git_dir: &Path,
) -> Result<(), Phase7GitAdapterErrorV1> {
    let common = git_text(
        executable,
        repository,
        &["rev-parse", "--git-common-dir"],
        &[],
    )?;
    let common_path = Path::new(common.trim());
    let common_path = if common_path.is_absolute() {
        common_path.to_path_buf()
    } else {
        repository.join(common_path)
    };
    let common_path =
        fs::canonicalize(common_path).map_err(|_| Phase7GitAdapterErrorV1::TargetRejected)?;
    if common_path != git_dir {
        return Err(Phase7GitAdapterErrorV1::TargetRejected);
    }
    for relative in ["objects", "refs", "logs"] {
        let path = git_dir.join(relative);
        let metadata =
            fs::symlink_metadata(&path).map_err(|_| Phase7GitAdapterErrorV1::TargetRejected)?;
        let canonical =
            fs::canonicalize(&path).map_err(|_| Phase7GitAdapterErrorV1::TargetRejected)?;
        if !metadata.file_type().is_dir()
            || metadata.file_type().is_symlink()
            || !canonical.starts_with(git_dir)
        {
            return Err(Phase7GitAdapterErrorV1::TargetRejected);
        }
        validate_storage_tree(&path, git_dir)?;
    }
    for relative in ["objects/info/alternates", "commondir", "gitdir"] {
        if fs::symlink_metadata(git_dir.join(relative)).is_ok() {
            return Err(Phase7GitAdapterErrorV1::TargetRejected);
        }
    }
    let head = fs::symlink_metadata(git_dir.join("HEAD"))
        .map_err(|_| Phase7GitAdapterErrorV1::TargetRejected)?;
    if !head.file_type().is_file() || head.file_type().is_symlink() {
        return Err(Phase7GitAdapterErrorV1::TargetRejected);
    }
    Ok(())
}

fn validate_storage_tree(root: &Path, git_dir: &Path) -> Result<(), Phase7GitAdapterErrorV1> {
    let entries = fs::read_dir(root).map_err(|_| Phase7GitAdapterErrorV1::TargetRejected)?;
    for entry in entries {
        let entry = entry.map_err(|_| Phase7GitAdapterErrorV1::TargetRejected)?;
        let path = entry.path();
        let metadata =
            fs::symlink_metadata(&path).map_err(|_| Phase7GitAdapterErrorV1::TargetRejected)?;
        if metadata.file_type().is_symlink() {
            return Err(Phase7GitAdapterErrorV1::TargetRejected);
        }
        let canonical =
            fs::canonicalize(&path).map_err(|_| Phase7GitAdapterErrorV1::TargetRejected)?;
        if !canonical.starts_with(git_dir) {
            return Err(Phase7GitAdapterErrorV1::TargetRejected);
        }
        if metadata.file_type().is_dir() {
            validate_storage_tree(&path, git_dir)?;
        } else {
            if !metadata.file_type().is_file() {
                return Err(Phase7GitAdapterErrorV1::TargetRejected);
            }
            #[cfg(unix)]
            if metadata.nlink() != 1 {
                return Err(Phase7GitAdapterErrorV1::TargetRejected);
            }
        }
    }
    Ok(())
}

fn git_text(
    executable: &Path,
    repository: &Path,
    args: &[&str],
    stdin: &[u8],
) -> Result<String, Phase7GitAdapterErrorV1> {
    git_text_with_env(executable, repository, args, stdin, &[])
}

fn git_text_with_env(
    executable: &Path,
    repository: &Path,
    args: &[&str],
    stdin: &[u8],
    extra_env: &[(&str, &OsStr)],
) -> Result<String, Phase7GitAdapterErrorV1> {
    let bytes = git_bytes(executable, repository, args, stdin, extra_env)?;
    String::from_utf8(bytes).map_err(|_| Phase7GitAdapterErrorV1::GitRejected)
}

fn git_bytes(
    executable: &Path,
    repository: &Path,
    args: &[&str],
    stdin: &[u8],
    extra_env: &[(&str, &OsStr)],
) -> Result<Vec<u8>, Phase7GitAdapterErrorV1> {
    git_bytes_with_deadline(
        executable,
        repository,
        args,
        stdin,
        extra_env,
        Duration::from_secs(PHASE8_GIT_PROCESS_DEADLINE_SECONDS_V1),
    )
}

fn git_bytes_with_deadline(
    executable: &Path,
    repository: &Path,
    args: &[&str],
    stdin: &[u8],
    extra_env: &[(&str, &OsStr)],
    deadline: Duration,
) -> Result<Vec<u8>, Phase7GitAdapterErrorV1> {
    const CONFIG: [&str; 12] = [
        "-c",
        "core.hooksPath=/dev/null",
        "-c",
        "commit.gpgSign=false",
        "-c",
        "tag.gpgSign=false",
        "-c",
        "credential.helper=",
        "-c",
        "core.fsmonitor=false",
        "-c",
        "core.untrackedCache=false",
    ];
    let mut command = Command::new(executable);
    command
        .current_dir(repository)
        .env_clear()
        .env("GIT_CONFIG_NOSYSTEM", "1")
        .env("GIT_CONFIG_GLOBAL", "/dev/null")
        .env("GIT_TERMINAL_PROMPT", "0")
        .env("GIT_ASKPASS", "/usr/bin/false")
        .env("SSH_ASKPASS", "/usr/bin/false")
        .env("GIT_EDITOR", "/usr/bin/false")
        .env("GIT_SEQUENCE_EDITOR", "/usr/bin/false")
        .env("GIT_PAGER", "cat")
        .env("PAGER", "cat")
        .args(CONFIG)
        .args(args)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::null());
    for (key, value) in extra_env {
        command.env(key, value);
    }
    let mut child = command
        .spawn()
        .map_err(|_| Phase7GitAdapterErrorV1::GitRejected)?;
    let stdout = child
        .stdout
        .take()
        .ok_or(Phase7GitAdapterErrorV1::GitRejected)?;
    let stdout_reader = thread::Builder::new()
        .name("lnsat-git-stdout".to_owned())
        .spawn(move || read_bounded_stdout_v1(stdout))
        .map_err(|_| Phase7GitAdapterErrorV1::GitRejected)?;
    let stdin_result = child
        .stdin
        .take()
        .ok_or(Phase7GitAdapterErrorV1::GitRejected)
        .and_then(|mut child_stdin| {
            child_stdin
                .write_all(stdin)
                .map_err(|_| Phase7GitAdapterErrorV1::GitRejected)
        });
    if stdin_result.is_err() {
        let _ = child.kill();
        let _ = child.wait();
        let _ = stdout_reader.join();
        return Err(Phase7GitAdapterErrorV1::GitRejected);
    }
    let status = wait_for_child_deadline_v1(&mut child, deadline)?;
    let (stdout, overflowed) = stdout_reader
        .join()
        .map_err(|_| Phase7GitAdapterErrorV1::GitRejected)??;
    if !status.success() || overflowed {
        return Err(Phase7GitAdapterErrorV1::GitRejected);
    }
    Ok(stdout)
}

pub(super) fn wait_for_child_deadline_v1(
    child: &mut std::process::Child,
    deadline: Duration,
) -> Result<ExitStatus, Phase7GitAdapterErrorV1> {
    let started = Instant::now();
    loop {
        match child.try_wait() {
            Ok(Some(status)) => return Ok(status),
            Ok(None) => {}
            Err(_) => {
                let _ = child.kill();
                let _ = child.wait();
                return Err(Phase7GitAdapterErrorV1::OutcomeUnknown);
            }
        }
        let elapsed = started.elapsed();
        if elapsed >= deadline {
            let _ = child.kill();
            let _ = child.wait();
            return Err(Phase7GitAdapterErrorV1::OutcomeUnknown);
        }
        thread::sleep(
            deadline
                .checked_sub(elapsed)
                .unwrap_or_default()
                .min(Duration::from_millis(5)),
        );
    }
}

pub(super) fn read_bounded_stdout_v1(
    mut stdout: std::process::ChildStdout,
) -> Result<(Vec<u8>, bool), Phase7GitAdapterErrorV1> {
    let mut retained = Vec::new();
    let mut overflowed = false;
    let mut buffer = [0_u8; 8 * 1024];
    loop {
        let count = stdout
            .read(&mut buffer)
            .map_err(|_| Phase7GitAdapterErrorV1::OutcomeUnknown)?;
        if count == 0 {
            return Ok((retained, overflowed));
        }
        let remaining = PHASE8_GIT_MAX_STDOUT_BYTES_V1.saturating_sub(retained.len());
        let retain = remaining.min(count);
        retained.extend_from_slice(&buffer[..retain]);
        overflowed |= retain != count;
    }
}

fn private_index_directory_in_v1(
    parent: &Path,
    operation_id: &str,
) -> Result<PathBuf, Phase7GitAdapterErrorV1> {
    let parent = fs::canonicalize(parent).map_err(|_| Phase7GitAdapterErrorV1::TargetRejected)?;
    if !parent.is_dir() {
        return Err(Phase7GitAdapterErrorV1::TargetRejected);
    }
    for _ in 0..8 {
        let mut entropy = [0_u8; 32];
        getrandom::getrandom(&mut entropy).map_err(|_| Phase7GitAdapterErrorV1::TargetRejected)?;
        let suffix = prefixed_sha256(&entropy);
        let candidate = parent.join(format!("lnsat-git-index-{operation_id}-{}", &suffix[7..]));
        let mut builder = fs::DirBuilder::new();
        #[cfg(unix)]
        builder.mode(0o700);
        match builder.create(&candidate) {
            Ok(()) => {
                #[cfg(unix)]
                fs::set_permissions(&candidate, fs::Permissions::from_mode(0o700))
                    .map_err(|_| Phase7GitAdapterErrorV1::TargetRejected)?;
                let metadata = fs::symlink_metadata(&candidate)
                    .map_err(|_| Phase7GitAdapterErrorV1::TargetRejected)?;
                let canonical = fs::canonicalize(&candidate)
                    .map_err(|_| Phase7GitAdapterErrorV1::TargetRejected)?;
                if !metadata.file_type().is_dir()
                    || metadata.file_type().is_symlink()
                    || canonical.parent() != Some(parent.as_path())
                {
                    let _ = fs::remove_dir(&candidate);
                    return Err(Phase7GitAdapterErrorV1::TargetRejected);
                }
                return Ok(candidate);
            }
            Err(error) if error.kind() == std::io::ErrorKind::AlreadyExists => {}
            Err(_) => return Err(Phase7GitAdapterErrorV1::TargetRejected),
        }
    }
    Err(Phase7GitAdapterErrorV1::TargetRejected)
}

fn parse_nul_paths(bytes: &[u8]) -> Result<Vec<String>, Phase7GitAdapterErrorV1> {
    let mut result = Vec::new();
    for value in bytes
        .split(|byte| *byte == 0)
        .filter(|value| !value.is_empty())
    {
        let path =
            std::str::from_utf8(value).map_err(|_| Phase7GitAdapterErrorV1::TargetRejected)?;
        validate_relative_path(path)?;
        result.push(path.to_owned());
    }
    result.sort();
    Ok(result)
}

fn validate_relative_path(path: &str) -> Result<(), Phase7GitAdapterErrorV1> {
    if path.is_empty()
        || path.len() > 512
        || path.contains('\\')
        || path.contains('\0')
        || Path::new(path).is_absolute()
        || Path::new(path)
            .components()
            .any(|component| !matches!(component, Component::Normal(_)))
        || path == PHASE7_GIT_FIXTURE_MARKER_V1
    {
        return Err(Phase7GitAdapterErrorV1::InvalidInput);
    }
    Ok(())
}

fn validate_metadata(metadata: &Phase7GitCommitMetadataV1) -> Result<(), Phase7GitAdapterErrorV1> {
    if metadata.message.is_empty()
        || metadata.message.len() > 4096
        || !metadata.message.ends_with('\n')
        || metadata.message.contains('\0')
        || !valid_identity_component(&metadata.author_name, false)
        || !valid_identity_component(&metadata.committer_name, false)
        || !valid_identity_component(&metadata.author_email, true)
        || !valid_identity_component(&metadata.committer_email, true)
        || !valid_git_time(&metadata.author_time)
        || !valid_git_time(&metadata.committer_time)
    {
        return Err(Phase7GitAdapterErrorV1::InvalidInput);
    }
    Ok(())
}

fn valid_identity_component(value: &str, email: bool) -> bool {
    !value.is_empty()
        && value.len() <= 256
        && !value.contains(['\n', '\r', '\0', '<', '>'])
        && (!email || value.contains('@'))
}

fn valid_git_time(value: &str) -> bool {
    let Some((seconds, offset)) = value.split_once(' ') else {
        return false;
    };
    seconds.len() <= 12
        && !seconds.is_empty()
        && seconds.bytes().all(|byte| byte.is_ascii_digit())
        && offset == "+0000"
}

fn valid_head_ref(value: &str) -> bool {
    value.starts_with("refs/heads/")
        && value.len() <= 256
        && value
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || b"/-_.".contains(&byte))
        && !value.contains("..")
        && !value.ends_with('.')
        && !value.ends_with('/')
}

fn valid_oid(value: &str) -> bool {
    value.len() == 40
        && value
            .bytes()
            .all(|byte| byte.is_ascii_hexdigit() && !byte.is_ascii_uppercase())
}

fn valid_prefixed_sha256(value: &str) -> bool {
    value.len() == 71
        && value.starts_with("sha256:")
        && value[7..]
            .bytes()
            .all(|byte| byte.is_ascii_hexdigit() && !byte.is_ascii_uppercase())
}

fn prefixed_sha256(bytes: &[u8]) -> String {
    let digest = Sha256::digest(bytes);
    let mut encoded = String::with_capacity(71);
    encoded.push_str("sha256:");
    for byte in digest {
        encoded.push(char::from(LOWER_HEX[usize::from(byte >> 4)]));
        encoded.push(char::from(LOWER_HEX[usize::from(byte & 0x0f)]));
    }
    encoded
}

fn exact_keys(
    object: &serde_json::Map<String, serde_json::Value>,
    expected: &[&str],
) -> Result<(), Phase7GitAdapterErrorV1> {
    if object.len() != expected.len() || expected.iter().any(|key| !object.contains_key(*key)) {
        return Err(Phase7GitAdapterErrorV1::InvalidInput);
    }
    Ok(())
}

fn string<'a>(
    object: &'a serde_json::Map<String, serde_json::Value>,
    key: &str,
) -> Result<&'a str, Phase7GitAdapterErrorV1> {
    object
        .get(key)
        .and_then(|value| value.as_str())
        .ok_or(Phase7GitAdapterErrorV1::InvalidInput)
}

fn identifier(prefix: &str, domain: &str, fields: &[&[u8]]) -> String {
    let digest = digest_fields(domain, fields);
    let mut encoded = String::with_capacity(prefix.len() + 64);
    encoded.push_str(prefix);
    for byte in digest {
        encoded.push(char::from(LOWER_HEX[usize::from(byte >> 4)]));
        encoded.push(char::from(LOWER_HEX[usize::from(byte & 0x0f)]));
    }
    encoded
}

fn map_persistence(error: Phase7PersistenceErrorV1) -> Phase7GitAdapterErrorV1 {
    match error {
        Phase7PersistenceErrorV1::InvalidInput => Phase7GitAdapterErrorV1::InvalidInput,
        Phase7PersistenceErrorV1::SourceNotApproved
        | Phase7PersistenceErrorV1::RedemptionRejected => {
            Phase7GitAdapterErrorV1::AuthorizationNotConsumed
        }
        Phase7PersistenceErrorV1::EvidenceDrift
        | Phase7PersistenceErrorV1::IdentityConflict
        | Phase7PersistenceErrorV1::IdempotencyConflict => Phase7GitAdapterErrorV1::EvidenceDrift,
        Phase7PersistenceErrorV1::OutcomeAmbiguous => Phase7GitAdapterErrorV1::OutcomeUnknown,
        Phase7PersistenceErrorV1::EntropyUnavailable
        | Phase7PersistenceErrorV1::ClockRejected
        | Phase7PersistenceErrorV1::PersistenceFailed => Phase7GitAdapterErrorV1::PersistenceFailed,
    }
}
