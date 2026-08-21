#![forbid(unsafe_code)]

//! Fail-closed loopback daemon foundation for one local LNSAT deployment.

pub mod product_config;
pub mod product_output;
pub mod product_surface;
pub mod product_transport;

use lnsat_auth::{
    LOCAL_CSRF_HEADER_NAME_V1, LocalBrowserAuthTransportV1, LocalBrowserOriginV1,
    LocalBrowserRequestClassV1, LocalBrowserRequestErrorV1, LocalBrowserRequestV1,
    LocalBrowserSessionCookieHeadersV1, clear_local_browser_session_cookie_headers_v1,
    create_local_browser_session_cookie_headers_v1, evaluate_local_browser_request_v1,
    local_session_id_from_token_v1, parse_local_browser_auth_transport_v1,
};
use lnsat_contracts::{
    ApprovalDecisionV1Input, ApprovalDecisionV1Kind, ApprovalDecisionV1Reason,
    CONTRACT_VERSION_V1_0, ContractVersion, ContractVersionError, DerivedExecutionRequestV1,
    ExecutionRequestV1Input, IntoContractErrorEnvelopeV1, canonical_utc_timestamp_millis_v1,
    decide_approval_request_v1, derive_execution_request_v1, is_valid_reference_v1,
    validate_contract_version,
};
#[cfg(test)]
use lnsat_store::LocalSessionVerificationV1;
use lnsat_store::{
    ApprovalDecisionStoreWriteV1, ApprovalRequestStoreWriteV1,
    LOCAL_SESSION_IDLE_TIMEOUT_DEFAULT_SECONDS_V1, LocalControlPermissionV1,
    LocalDaemonDatabaseLeaseV1, LocalIdentityCreateInputV1, LocalIdentityCredentialRecordV1,
    LocalIdentityDisablementResultV1, LocalIdentityEventV1, LocalIdentityRoleV1,
    LocalPasswordRotationInputV1, LocalPasswordRotationResultV1,
    LocalSessionActivityVerificationV1, LocalSessionEventV1, LocalSessionFamilyRevocationV1,
    LocalSessionIssueInputV1, LocalSessionIssueResultV1, LocalSessionRecordV1,
    LocalSessionRevocationReasonV1, LocalSessionRotationResultV1,
    Phase7AuthorizationAttemptPrepareInputV1, Phase7AuthorizationNonceIssueInputV1,
    Phase7CapabilityConsumptionWriteV1, Phase7CapabilityRedemptionInputV1,
    Phase7CapabilitySecretV1, Phase7ExecutionAuthorizationIssueInputV1,
    Phase7ExecutionAuthorizationIssueV1, Phase7ExecutionAuthorizationRecordV1,
    Phase7ExecutionAuthorizationTransitionInputV1, Phase7ExecutionAuthorizationTransitionV1,
    Phase7ExecutionCapabilityWireV1, Phase8OperationAttemptReadbackV1, Phase8OperationReadbackV1,
    Phase8RuntimeCompositionInputV1, Phase8RuntimeCompositionWriteV1, SQLITE_SCHEMA_VERSION,
    SqliteStore, SqliteStoreStateV1, acquire_local_daemon_database_lease_v1,
};
use serde::Deserialize;
use std::collections::BTreeMap;
use std::ffi::{OsStr, OsString};
use std::fmt;
use std::fs;
use std::io::{Read, Write};
use std::net::{IpAddr, Ipv4Addr, SocketAddr, TcpListener, TcpStream};
use std::path::{Component, Path, PathBuf};
use std::sync::{
    Arc, Mutex,
    atomic::{AtomicBool, Ordering},
};
use std::thread::{self, JoinHandle};
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};
use zeroize::{Zeroize, Zeroizing};

/// Pre-release loopback address used when no explicit address is supplied.
pub const DEFAULT_LISTEN_ADDRESS_V1: SocketAddr =
    SocketAddr::new(IpAddr::V4(Ipv4Addr::LOCALHOST), 7447);

/// Maximum request-head bytes accepted by the source-local HTTP surface.
pub const MAX_REQUEST_HEAD_BYTES_V1: usize = 8 * 1024;

/// Maximum JSON request-body bytes accepted by the source-local HTTP surface.
pub const MAX_REQUEST_BODY_BYTES_V1: usize = 4 * 1024;

/// Exact maximum JSON request-body bytes for frozen Phase 8 runtime routes.
pub const PHASE8_MAX_REQUEST_BODY_BYTES_V1: usize = 16 * 1024;

/// Maximum local HTTP connections processed concurrently.
pub const MAX_CONCURRENT_CONNECTIONS_V1: usize = 8;

/// Maximum number of exact immutable console assets loaded at daemon bind.
pub const PHASE9_MAX_CONSOLE_ASSET_COUNT_V1: usize = 512;

/// Maximum bytes loaded for one exact immutable console asset.
pub const PHASE9_MAX_CONSOLE_ASSET_BYTES_V1: usize = 8 * 1024 * 1024;

const MAX_HEADER_COUNT_V1: usize = 64;
const CONNECTION_TIMEOUT_V1: Duration = Duration::from_secs(5);
const OVERLOAD_TIMEOUT_V1: Duration = Duration::from_millis(100);
const SHUTDOWN_WAKE_TIMEOUT_V1: Duration = Duration::from_millis(250);
const READINESS_PATH_V1: &str = "/healthz";
const READINESS_CONTRACT_V1: &str = "lnsat.daemon.readiness.v1_0";
const AUTHENTICATED_HEALTH_PATH_V1: &str = "/v1/health";
const AUTHENTICATED_STATUS_PATH_V1: &str = "/v1/status";
const AUTHENTICATED_PRODUCT_READ_DENIAL_CONTRACT_V1: &str = "lnsat.daemon.authenticated_read.v1";
const AUTHENTICATED_PRODUCT_READ_DENIAL_CODE_V1: &str = "lnsatd.authenticated_read.denied";
const GATEWAY_ROOT_PATH_V1: &str = "/v1";
const GATEWAY_NEGOTIATION_CONTRACT_V1: &str = "lnsat.gateway.negotiation.v1_0";
/// Exact request and response header carrying stable Gateway wire-contract identity.
pub const GATEWAY_CONTRACT_VERSION_HEADER_NAME_V1: &str = "LNSAT-Contract-Version";
const LOCAL_SESSION_GATEWAY_PATH_V1: &str = "/v1/session";
const GATEWAY_SESSION_ISSUE_CONTRACT_V1: &str = "lnsat.gateway.session_issue.v1_0";
const GATEWAY_SESSION_ISSUE_ERROR_CODE_V1: &str = "gateway.session_issue.denied";
const GATEWAY_SESSION_ISSUE_LIMITER_SIDE_EFFECT_V1: &str = "authentication_limiter_advanced";
const GATEWAY_SESSION_ISSUE_EVIDENCE_SIDE_EFFECT_V1: &str = "session_evidence_appended";
const GATEWAY_SESSION_ISSUE_EVENT_SIDE_EFFECT_V1: &str = "session_security_event_appended";
const GATEWAY_SESSION_ISSUE_COOKIE_SIDE_EFFECT_V1: &str = "session_cookies_set";
const GATEWAY_SESSION_ISSUE_FAILURE_SIDE_EFFECT_V1: &str = "authentication_limiter_may_advance";
const GATEWAY_SESSION_READ_CONTRACT_V1: &str = "lnsat.gateway.session_read.v1_0";
const GATEWAY_SESSION_READ_ERROR_CODE_V1: &str = "gateway.session_read.denied";
const GATEWAY_SESSION_ACTIVITY_SIDE_EFFECT_V1: &str = "session_activity_evidence_may_append";
const GATEWAY_SESSION_ROTATION_CONTRACT_V1: &str = "lnsat.gateway.session_rotation.v1_0";
const GATEWAY_SESSION_ROTATION_ERROR_CODE_V1: &str = "gateway.session_rotation.denied";
const GATEWAY_SESSION_ROTATION_REVOCATION_SIDE_EFFECT_V1: &str =
    "prior_session_revocation_appended";
const GATEWAY_SESSION_ROTATION_REPLACEMENT_SIDE_EFFECT_V1: &str =
    "replacement_session_evidence_appended";
const GATEWAY_SESSION_ROTATION_EVIDENCE_SIDE_EFFECT_V1: &str = "session_rotation_evidence_appended";
const GATEWAY_SESSION_ROTATION_EVENT_SIDE_EFFECT_V1: &str = "session_security_events_appended";
const GATEWAY_SESSION_ROTATION_COOKIE_SIDE_EFFECT_V1: &str = "session_cookies_set";
const GATEWAY_SESSION_FAMILY_SIGN_OUT_CONTRACT_V1: &str =
    "lnsat.gateway.session_family_sign_out.v1_0";
const GATEWAY_SESSION_FAMILY_SIGN_OUT_ERROR_CODE_V1: &str =
    "gateway.session_family_sign_out.denied";
const GATEWAY_SESSION_FAMILY_SIGN_OUT_REVOCATION_SIDE_EFFECT_V1: &str =
    "session_family_revocations_appended";
const GATEWAY_SESSION_FAMILY_SIGN_OUT_EVENT_SIDE_EFFECT_V1: &str =
    "session_security_events_appended";
const GATEWAY_SESSION_FAMILY_SIGN_OUT_COOKIE_SIDE_EFFECT_V1: &str = "session_cookies_cleared";
const LOCAL_PASSWORD_GATEWAY_PATH_V1: &str = "/v1/identity/password";
const GATEWAY_IDENTITY_PASSWORD_ROTATION_CONTRACT_V1: &str =
    "lnsat.gateway.identity_password_rotation.v1_0";
const GATEWAY_IDENTITY_PASSWORD_ROTATION_ERROR_CODE_V1: &str =
    "gateway.identity_password_rotation.denied";
const GATEWAY_IDENTITY_PASSWORD_ROTATION_CREDENTIAL_SIDE_EFFECT_V1: &str =
    "password_credential_evidence_appended";
const GATEWAY_IDENTITY_PASSWORD_ROTATION_IDENTITY_EVENT_SIDE_EFFECT_V1: &str =
    "identity_security_event_appended";
const LOCAL_IDENTITIES_GATEWAY_PATH_V1: &str = "/v1/identities";
const GATEWAY_IDENTITY_CREATION_CONTRACT_V1: &str = "lnsat.gateway.identity_creation.v1_0";
const GATEWAY_IDENTITY_CREATION_ERROR_CODE_V1: &str = "gateway.identity_creation.denied";
const GATEWAY_IDENTITY_CREATION_LIMITER_SIDE_EFFECT_V1: &str = "authentication_limiter_advanced";
const GATEWAY_IDENTITY_CREATION_ACTIVITY_SIDE_EFFECT_V1: &str =
    "session_activity_evidence_may_append";
const GATEWAY_IDENTITY_CREATION_IDENTITY_SIDE_EFFECT_V1: &str = "identity_evidence_appended";
const GATEWAY_IDENTITY_CREATION_CREDENTIAL_SIDE_EFFECT_V1: &str =
    "password_credential_evidence_appended";
const GATEWAY_IDENTITY_CREATION_EVENT_SIDE_EFFECT_V1: &str = "identity_security_event_appended";
const GATEWAY_IDENTITY_CREATION_FAILURE_SIDE_EFFECT_V1: &str = "authentication_limiter_may_advance";
const LOCAL_IDENTITY_GATEWAY_PREFIX_V1: &str = "/v1/identities/";
const GATEWAY_IDENTITY_DISABLEMENT_CONTRACT_V1: &str = "lnsat.gateway.identity_disablement.v1_0";
const GATEWAY_IDENTITY_DISABLEMENT_ERROR_CODE_V1: &str = "gateway.identity_disablement.denied";
const GATEWAY_IDENTITY_DISABLEMENT_ACTIVITY_SIDE_EFFECT_V1: &str =
    "session_activity_evidence_may_append";
const GATEWAY_IDENTITY_DISABLEMENT_STATUS_SIDE_EFFECT_V1: &str =
    "identity_status_evidence_appended";
const GATEWAY_IDENTITY_DISABLEMENT_EVENT_SIDE_EFFECT_V1: &str = "identity_security_event_appended";
const GATEWAY_IDENTITY_DISABLEMENT_REVOCATION_SIDE_EFFECT_V1: &str =
    "target_session_revocations_may_append";
const GATEWAY_IDENTITY_DISABLEMENT_SESSION_EVENT_SIDE_EFFECT_V1: &str =
    "target_session_security_events_may_append";
const LOCAL_IDENTITY_EVENT_GATEWAY_SUFFIX_V1: &str = "/events";
const GATEWAY_IDENTITY_EVENT_READ_CONTRACT_V1: &str = "lnsat.gateway.identity_event_read.v1_0";
const GATEWAY_IDENTITY_EVENT_READ_ERROR_CODE_V1: &str = "gateway.identity_event_read.denied";
const GATEWAY_IDENTITY_EVENT_READ_ACTIVITY_SIDE_EFFECT_V1: &str =
    "session_activity_evidence_may_append";
const LOCAL_SESSION_EVENT_GATEWAY_PREFIX_V1: &str = "/v1/sessions/";
const LOCAL_SESSION_EVENT_GATEWAY_SUFFIX_V1: &str = "/events";
const GATEWAY_SESSION_EVENT_READ_CONTRACT_V1: &str = "lnsat.gateway.session_event_read.v1_0";
const GATEWAY_SESSION_EVENT_READ_ERROR_CODE_V1: &str = "gateway.session_event_read.denied";
const GATEWAY_SESSION_EVENT_READ_ACTIVITY_SIDE_EFFECT_V1: &str =
    "session_activity_evidence_may_append";
const LOCAL_APPROVAL_REQUEST_GATEWAY_PATH_V1: &str = "/v1/approval-requests";
const LOCAL_APPROVAL_REQUEST_GATEWAY_PREFIX_V1: &str = "/v1/approval-requests/";
const GATEWAY_APPROVAL_REQUEST_CONTRACT_V1: &str = "lnsat.gateway.approval_request.v1_0";
const GATEWAY_APPROVAL_REQUEST_ERROR_CODE_V1: &str = "gateway.approval_request.denied";
const GATEWAY_APPROVAL_REQUEST_LIMITER_SIDE_EFFECT_V1: &str = "authentication_limiter_advanced";
const GATEWAY_APPROVAL_REQUEST_ACTIVITY_SIDE_EFFECT_V1: &str =
    "session_activity_evidence_may_append";
const GATEWAY_APPROVAL_REQUEST_EVIDENCE_SIDE_EFFECT_V1: &str = "approval_request_evidence_appended";
const GATEWAY_APPROVAL_REQUEST_FAILURE_SIDE_EFFECT_V1: &str = "authentication_limiter_may_advance";
const LOCAL_APPROVAL_DECISION_GATEWAY_SUFFIX_V1: &str = "/decision";
const GATEWAY_APPROVAL_DECISION_CONTRACT_V1: &str = "lnsat.gateway.approval_decision.v1_0";
const GATEWAY_APPROVAL_DECISION_ERROR_CODE_V1: &str = "gateway.approval_decision.denied";
const GATEWAY_APPROVAL_DECISION_LIMITER_SIDE_EFFECT_V1: &str = "authentication_limiter_advanced";
const GATEWAY_APPROVAL_DECISION_ACTIVITY_SIDE_EFFECT_V1: &str =
    "session_activity_evidence_may_append";
const GATEWAY_APPROVAL_DECISION_EVIDENCE_SIDE_EFFECT_V1: &str =
    "approval_decision_evidence_appended";
const GATEWAY_APPROVAL_DECISION_FAILURE_SIDE_EFFECT_V1: &str = "authentication_limiter_may_advance";
const LOCAL_EXECUTION_AUTHORIZATIONS_PATH_V1: &str = "/v1/execution-authorizations";
const LOCAL_EXECUTION_AUTHORIZATIONS_PREFIX_V1: &str = "/v1/execution-authorizations/";
const LOCAL_OPERATIONS_PREFIX_V1: &str = "/v1/operations/";
const GATEWAY_RUNTIME_COMPOSITION_CONTRACT_V1: &str = "lnsat.gateway.runtime_composition.v1_0";
const GATEWAY_RUNTIME_COMPOSITION_ERROR_CODE_V1: &str = "gateway.runtime_composition.denied";
/// Exact custom request header required for pre-session browser authentication.
pub const LOCAL_SESSION_ISSUE_INTENT_HEADER_NAME_V1: &str = "X-LNSAT-Session-Intent";
/// Exact custom request-header value required for pre-session browser authentication.
pub const LOCAL_SESSION_ISSUE_INTENT_HEADER_VALUE_V1: &str = "lnsat.session.issue.v1";
const LOCAL_AUTH_WINDOW_V1: Duration = Duration::from_mins(1);
const LOCAL_AUTH_MAX_ATTEMPTS_PER_IDENTITY_V1: u8 = 5;
const LOCAL_AUTH_MAX_GLOBAL_ATTEMPTS_V1: u16 = 30;
const LOCAL_AUTH_MAX_TRACKED_IDENTITIES_V1: usize = 128;
const LOCAL_AUTH_MAX_IDENTITY_BYTES_V1: usize = 256;
/// Default bounded idle timeout for local browser sessions.
pub const LOCAL_BROWSER_SESSION_IDLE_TIMEOUT_SECONDS_V1: u32 =
    LOCAL_SESSION_IDLE_TIMEOUT_DEFAULT_SECONDS_V1;

/// One generic public denial for route-neutral browser transport parsing.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum LocalBrowserTransportErrorV1 {
    /// Request syntax, origin, browser metadata, cookies, or CSRF transport failed.
    Rejected,
}

impl LocalBrowserTransportErrorV1 {
    /// Stable public-safe code without security-oracle detail.
    #[must_use]
    pub const fn code(self) -> &'static str {
        "lnsatd.browser_transport.rejected"
    }
}

impl fmt::Display for LocalBrowserTransportErrorV1 {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(self.code())
    }
}

impl std::error::Error for LocalBrowserTransportErrorV1 {}

/// One generic public denial for local password-authenticated session issue.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum LocalBrowserSessionIssueErrorV1 {
    /// Input, clock, rate limit, credential, evidence, or persistence rejected.
    Rejected,
}

impl LocalBrowserSessionIssueErrorV1 {
    /// Stable public-safe code without identity or limiter oracle detail.
    #[must_use]
    pub const fn code(self) -> &'static str {
        "lnsatd.local_auth.rejected"
    }
}

impl fmt::Display for LocalBrowserSessionIssueErrorV1 {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(self.code())
    }
}

impl std::error::Error for LocalBrowserSessionIssueErrorV1 {}

struct LocalAuthenticationLimitStateV1 {
    window_started: Instant,
    global_attempts: u16,
    identity_attempts: BTreeMap<String, u8>,
}

/// Bounded process-local authentication-attempt limiter.
///
/// State uses monotonic process time, retains at most 128 identity or session
/// subjects, and intentionally implements neither `Clone` nor `Debug`.
pub struct LocalAuthenticationLimiterV1 {
    state: Mutex<LocalAuthenticationLimitStateV1>,
}

impl Default for LocalAuthenticationLimiterV1 {
    fn default() -> Self {
        Self::new()
    }
}

impl LocalAuthenticationLimiterV1 {
    /// Creates one empty 60-second fixed-window limiter.
    #[must_use]
    pub fn new() -> Self {
        Self {
            state: Mutex::new(LocalAuthenticationLimitStateV1 {
                window_started: Instant::now(),
                global_attempts: 0,
                identity_attempts: BTreeMap::new(),
            }),
        }
    }

    fn admit_identity(&self, identity_ref: &str) -> bool {
        self.admit_at(identity_ref, Instant::now())
    }

    fn admit_session(&self, raw_session_token: &str) -> bool {
        local_session_id_from_token_v1(raw_session_token)
            .is_some_and(|session_id| self.admit_at(session_id, Instant::now()))
    }

    fn admit_at(&self, identity_ref: &str, now: Instant) -> bool {
        if identity_ref.is_empty() || identity_ref.len() > LOCAL_AUTH_MAX_IDENTITY_BYTES_V1 {
            return false;
        }
        let Ok(mut state) = self.state.lock() else {
            return false;
        };
        if now.saturating_duration_since(state.window_started) >= LOCAL_AUTH_WINDOW_V1 {
            state.window_started = now;
            state.global_attempts = 0;
            state.identity_attempts.clear();
        }
        if state.global_attempts >= LOCAL_AUTH_MAX_GLOBAL_ATTEMPTS_V1 {
            return false;
        }
        state.global_attempts += 1;
        if !state.identity_attempts.contains_key(identity_ref)
            && state.identity_attempts.len() >= LOCAL_AUTH_MAX_TRACKED_IDENTITIES_V1
        {
            return false;
        }
        let attempts = state
            .identity_attempts
            .entry(identity_ref.to_owned())
            .or_insert(0);
        if *attempts >= LOCAL_AUTH_MAX_ATTEMPTS_PER_IDENTITY_V1 {
            return false;
        }
        *attempts += 1;
        true
    }
}

/// Password-authenticated local browser session request.
///
/// This type intentionally implements neither `Clone` nor `Debug`.
pub struct LocalBrowserSessionIssueRequestV1<'a> {
    /// Exact local-human identity reference.
    pub identity_ref: &'a str,
    /// Candidate password consumed only by Argon2id verification.
    pub password: &'a str,
    /// Absolute session lifetime in seconds, from 60 through 3,600.
    pub lifetime_seconds: u32,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct LocalBrowserSessionIssueBodyV1 {
    identity_ref: String,
    password: Zeroizing<String>,
    lifetime_seconds: u32,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct LocalBrowserPasswordRotationBodyV1 {
    current_password: Zeroizing<String>,
    new_password: Zeroizing<String>,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct LocalBrowserIdentityCreationBodyV1 {
    identity_ref: String,
    display_name: String,
    role: String,
    password: Zeroizing<String>,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct LocalBrowserApprovalDecisionBodyV1 {
    project_ref: String,
    decision: String,
    reason: String,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct LocalBrowserApprovalRequestBodyV1 {
    project_ref: String,
    policy_decision_id: String,
}
/// Secret-bearing one-time browser session response source.
///
/// Raw secrets exist only inside the returned `Set-Cookie` field values. This
/// type intentionally implements neither `Clone` nor `Debug`.
pub struct LocalBrowserSessionIssueResponseV1 {
    session: LocalSessionRecordV1,
    cookie_headers: LocalBrowserSessionCookieHeadersV1,
}

impl LocalBrowserSessionIssueResponseV1 {
    /// Public role-bound session evidence.
    #[must_use]
    pub const fn session(&self) -> &LocalSessionRecordV1 {
        &self.session
    }

    /// One-time host-only session and anti-CSRF cookie field values.
    #[must_use]
    pub const fn cookie_headers(&self) -> &LocalBrowserSessionCookieHeadersV1 {
        &self.cookie_headers
    }
}

/// Secret-bearing one-time browser session-rotation response source.
///
/// Raw replacement secrets exist only inside returned `Set-Cookie` values.
/// This type intentionally implements neither `Clone` nor `Debug`.
pub struct LocalBrowserSessionRotationResponseV1 {
    prior_session_id: String,
    session: LocalSessionRecordV1,
    cookie_headers: LocalBrowserSessionCookieHeadersV1,
}

impl LocalBrowserSessionRotationResponseV1 {
    /// Public identifier of the atomically revoked prior session.
    #[must_use]
    pub fn prior_session_id(&self) -> &str {
        &self.prior_session_id
    }

    /// Public replacement role-bound session evidence.
    #[must_use]
    pub const fn session(&self) -> &LocalSessionRecordV1 {
        &self.session
    }

    /// One-time replacement session and anti-CSRF cookie field values.
    #[must_use]
    pub const fn cookie_headers(&self) -> &LocalBrowserSessionCookieHeadersV1 {
        &self.cookie_headers
    }
}

/// Strictly parsed local browser request awaiting session-store verification.
///
/// This type intentionally implements neither `Clone` nor `Debug` because it
/// borrows raw bearer and anti-CSRF material.
pub struct LocalBrowserTransportRequestV1<'a> {
    expected_origin: LocalBrowserOriginV1,
    request: LocalBrowserRequestV1<'a>,
    auth: LocalBrowserAuthTransportV1<'a>,
    target: &'a str,
}

/// Exact source selectors for one route-neutral local authorization issue.
/// Authority digests, source IDs beyond approved decision, time, and expiry
/// remain server-derived from persisted evidence.
#[derive(Clone, Copy, Debug)]
pub struct LocalBrowserPhase7AuthorizationIssueRequestV1<'a> {
    pub project_ref: &'a str,
    pub approval_decision_id: &'a str,
    pub operation_idempotency_key: &'a str,
}

/// Secret-bearing authenticated issue result. No public route is opened.
///
/// Capability wire text may be extracted once. This type intentionally
/// implements neither `Clone` nor `Debug`.
pub struct LocalBrowserPhase7AuthorizationIssueResponseV1 {
    issue: Phase7ExecutionAuthorizationIssueV1,
}

impl LocalBrowserPhase7AuthorizationIssueResponseV1 {
    /// Whether this call committed the first authorization.
    #[must_use]
    pub const fn created(&self) -> bool {
        self.issue.created
    }

    /// Secret-free exact authorization and prepared-operation metadata.
    #[must_use]
    pub const fn record(&self) -> &Phase7ExecutionAuthorizationRecordV1 {
        &self.issue.record
    }

    /// Takes exact lowercase-hex capability wire once. Replay returns `None`.
    pub fn take_capability_wire_v1(&mut self) -> Option<Phase7ExecutionCapabilityWireV1> {
        self.issue
            .capability
            .take()
            .map(lnsat_store::Phase7ExecutionCapabilityV1::into_canonical_wire_v1)
    }
}

impl<'a> LocalBrowserTransportRequestV1<'a> {
    /// Exact origin-form request target. Route ownership remains unopened.
    #[must_use]
    pub const fn target(&self) -> &'a str {
        self.target
    }

    const fn raw_session_token(&self) -> &'a str {
        self.auth.raw_session_token()
    }

    const fn raw_csrf_token(&self) -> Option<&'a str> {
        self.auth.raw_csrf_token()
    }

    fn classify_after_session_verification(
        &self,
        csrf_verified: bool,
    ) -> Result<LocalBrowserRequestClassV1, LocalBrowserTransportErrorV1> {
        let request = LocalBrowserRequestV1 {
            csrf_verified,
            ..self.request
        };
        evaluate_local_browser_request_v1(&self.expected_origin, &request)
            .map_err(|_| LocalBrowserTransportErrorV1::Rejected)
    }
}

/// Secret-free browser request evidence after exact session-store verification.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AuthorizedLocalBrowserRequestV1<'a> {
    /// Exact origin-form target; route authority remains separate.
    pub target: &'a str,
    /// Read-only or mutation-preflight transport class.
    pub class: LocalBrowserRequestClassV1,
    /// Exact active role-bound local session evidence.
    pub session: LocalSessionRecordV1,
}

/// Verifies parsed browser authentication material against `SQLite` session
/// evidence and completes browser preflight atomically with one trusted time.
///
/// This opens no route and grants no packet, execution, adapter, or deployment
/// authority.
///
/// # Errors
///
/// Maps malformed time, missing/expired/revoked sessions, wrong bearer/CSRF,
/// evidence drift, and browser-preflight failure to one generic public denial.
pub fn authorize_local_browser_transport_request_v1<'a>(
    store: &mut SqliteStore,
    request: &LocalBrowserTransportRequestV1<'a>,
) -> Result<AuthorizedLocalBrowserRequestV1<'a>, LocalBrowserTransportErrorV1> {
    let checked_at = canonical_system_time_v1(SystemTime::now())
        .map_err(|()| LocalBrowserTransportErrorV1::Rejected)?;
    authorize_local_browser_transport_request_at_v1(store, request, &checked_at)
}

/// Reads one validated identity audit stream through authenticated,
/// route-neutral browser transport.
///
/// This opens no route. Every fixed local role may read immutable evidence;
/// mutation preflight, malformed target scope, and inactive sessions deny.
///
/// # Errors
///
/// Collapses transport, clock, authentication, scope, drift, and persistence
/// failure to one public denial.
pub fn read_local_browser_identity_events_v1(
    store: &mut SqliteStore,
    request: &LocalBrowserTransportRequestV1<'_>,
    identity_ref: &str,
) -> Result<Vec<LocalIdentityEventV1>, LocalBrowserTransportErrorV1> {
    let authorized = authorize_local_browser_transport_request_v1(store, request)?;
    if authorized.class != LocalBrowserRequestClassV1::ReadOnly
        || !authorized
            .session
            .role
            .allows_control(LocalControlPermissionV1::ReadEvidence)
    {
        return Err(LocalBrowserTransportErrorV1::Rejected);
    }
    store
        .read_local_identity_events_v1(identity_ref)
        .map_err(|_| LocalBrowserTransportErrorV1::Rejected)
}

/// Reads one validated session audit stream through authenticated,
/// route-neutral browser transport.
///
/// This opens no route. Every fixed local role may read immutable evidence;
/// mutation preflight, malformed target scope, and inactive sessions deny.
///
/// # Errors
///
/// Collapses transport, clock, authentication, scope, drift, and persistence
/// failure to one public denial.
pub fn read_local_browser_session_events_v1(
    store: &mut SqliteStore,
    request: &LocalBrowserTransportRequestV1<'_>,
    session_id: &str,
) -> Result<Vec<LocalSessionEventV1>, LocalBrowserTransportErrorV1> {
    let authorized = authorize_local_browser_transport_request_v1(store, request)?;
    if authorized.class != LocalBrowserRequestClassV1::ReadOnly
        || !authorized
            .session
            .role
            .allows_control(LocalControlPermissionV1::ReadEvidence)
    {
        return Err(LocalBrowserTransportErrorV1::Rejected);
    }
    store
        .read_local_session_events_v1(session_id)
        .map_err(|_| LocalBrowserTransportErrorV1::Rejected)
}

fn authorize_local_browser_transport_request_at_v1<'a>(
    store: &mut SqliteStore,
    request: &LocalBrowserTransportRequestV1<'a>,
    checked_at: &str,
) -> Result<AuthorizedLocalBrowserRequestV1<'a>, LocalBrowserTransportErrorV1> {
    let verification = store
        .verify_and_touch_local_session_v1(
            request.raw_session_token(),
            request.raw_csrf_token(),
            checked_at,
            LOCAL_BROWSER_SESSION_IDLE_TIMEOUT_SECONDS_V1,
        )
        .map_err(|_| LocalBrowserTransportErrorV1::Rejected)?;
    let LocalSessionActivityVerificationV1::Verified(activity) = verification else {
        return Err(LocalBrowserTransportErrorV1::Rejected);
    };
    let class = request.classify_after_session_verification(request.raw_csrf_token().is_some())?;
    Ok(AuthorizedLocalBrowserRequestV1 {
        target: request.target(),
        class,
        session: activity.session,
    })
}

/// Rate-limits and password-authenticates one session using server-owned time.
///
/// Missing/invalid identities consume the same Argon2id verification profile
/// as wrong passwords. This opens no route and emits no permissive CORS.
///
/// # Errors
///
/// Collapses invalid input, exhausted limits, clock failure, invalid
/// credentials, evidence drift, and persistence failure to one denial.
pub fn issue_local_browser_session_v1(
    store: &mut SqliteStore,
    limiter: &LocalAuthenticationLimiterV1,
    request: &LocalBrowserSessionIssueRequestV1<'_>,
) -> Result<LocalBrowserSessionIssueResponseV1, LocalBrowserSessionIssueErrorV1> {
    if !(60..=3_600).contains(&request.lifetime_seconds)
        || !limiter.admit_identity(request.identity_ref)
    {
        return Err(LocalBrowserSessionIssueErrorV1::Rejected);
    }
    let issued_time = SystemTime::now();
    let expires_time = issued_time
        .checked_add(Duration::from_secs(u64::from(request.lifetime_seconds)))
        .ok_or(LocalBrowserSessionIssueErrorV1::Rejected)?;
    let issued_at = canonical_system_time_v1(issued_time)
        .map_err(|()| LocalBrowserSessionIssueErrorV1::Rejected)?;
    let expires_at = canonical_system_time_v1(expires_time)
        .map_err(|()| LocalBrowserSessionIssueErrorV1::Rejected)?;
    let mut issued = store
        .issue_local_session_v1(&LocalSessionIssueInputV1 {
            identity_ref: request.identity_ref,
            password: request.password,
            issued_at: &issued_at,
            expires_at: &expires_at,
        })
        .map_err(|_| LocalBrowserSessionIssueErrorV1::Rejected)?;
    let cookie_headers = create_local_browser_session_cookie_headers_for_issue_v1(&issued);
    issued.raw_session_token.zeroize();
    issued.raw_csrf_token.zeroize();
    let cookie_headers = cookie_headers.map_err(|_| LocalBrowserSessionIssueErrorV1::Rejected)?;
    Ok(LocalBrowserSessionIssueResponseV1 {
        session: issued.session,
        cookie_headers,
    })
}

/// Revokes every active same-identity session using mutation and server time.
///
/// This opens no route and grants no cross-identity or execution authority.
///
/// # Errors
///
/// Collapses read requests, missing/wrong CSRF, clock failure, inactive
/// sessions, evidence drift, and persistence failure to one denial.
pub fn revoke_all_local_browser_sessions_v1(
    store: &mut SqliteStore,
    request: &LocalBrowserTransportRequestV1<'_>,
) -> Result<LocalSessionFamilyRevocationV1, LocalBrowserTransportErrorV1> {
    let Some(raw_csrf_token) = request.raw_csrf_token() else {
        return Err(LocalBrowserTransportErrorV1::Rejected);
    };
    if request.classify_after_session_verification(true)?
        != LocalBrowserRequestClassV1::MutationPreflight
    {
        return Err(LocalBrowserTransportErrorV1::Rejected);
    }
    let revoked_at = canonical_system_time_v1(SystemTime::now())
        .map_err(|()| LocalBrowserTransportErrorV1::Rejected)?;
    store
        .revoke_all_local_sessions_v1(
            request.raw_session_token(),
            raw_csrf_token,
            &revoked_at,
            LocalSessionRevocationReasonV1::SignOut,
        )
        .map_err(|_| LocalBrowserTransportErrorV1::Rejected)?
        .ok_or(LocalBrowserTransportErrorV1::Rejected)
}

/// Rotates the authenticated identity's password using strict mutation
/// transport and server-owned time.
///
/// This opens no route. The store derives the target from the bearer session,
/// appends one verifier generation, and revokes all same-identity sessions.
///
/// # Errors
///
/// Collapses read requests, missing/wrong CSRF or current password, invalid new
/// password, clock failure, inactive session, drift, and persistence failure
/// to one denial.
pub fn rotate_local_browser_password_v1(
    store: &mut SqliteStore,
    request: &LocalBrowserTransportRequestV1<'_>,
    current_password: &str,
    new_password: &str,
) -> Result<LocalPasswordRotationResultV1, LocalBrowserTransportErrorV1> {
    let Some(raw_csrf_token) = request.raw_csrf_token() else {
        return Err(LocalBrowserTransportErrorV1::Rejected);
    };
    if request.classify_after_session_verification(true)?
        != LocalBrowserRequestClassV1::MutationPreflight
    {
        return Err(LocalBrowserTransportErrorV1::Rejected);
    }
    let rotated_at = canonical_system_time_v1(SystemTime::now())
        .map_err(|()| LocalBrowserTransportErrorV1::Rejected)?;
    store
        .rotate_local_password_credential_v1(
            request.raw_session_token(),
            raw_csrf_token,
            &LocalPasswordRotationInputV1 {
                current_password,
                new_password,
                rotated_at: &rotated_at,
            },
        )
        .map_err(|_| LocalBrowserTransportErrorV1::Rejected)
}

/// Creates one immutable operator or auditor identity using strict owner
/// mutation transport and server-owned time.
///
/// This opens no route by itself and grants no packet, execution, adapter, or
/// deployment authority.
///
/// # Errors
///
/// Collapses read requests, missing/wrong CSRF, non-owner callers, invalid or
/// duplicate identity input, clock failure, drift, and persistence failure to
/// one denial.
pub fn create_local_browser_identity_v1(
    store: &mut SqliteStore,
    request: &LocalBrowserTransportRequestV1<'_>,
    identity_ref: &str,
    display_name: &str,
    role: LocalIdentityRoleV1,
    password: &str,
) -> Result<LocalIdentityCredentialRecordV1, LocalBrowserTransportErrorV1> {
    let Some(raw_csrf_token) = request.raw_csrf_token() else {
        return Err(LocalBrowserTransportErrorV1::Rejected);
    };
    if request.classify_after_session_verification(true)?
        != LocalBrowserRequestClassV1::MutationPreflight
    {
        return Err(LocalBrowserTransportErrorV1::Rejected);
    }
    let created_at = canonical_system_time_v1(SystemTime::now())
        .map_err(|()| LocalBrowserTransportErrorV1::Rejected)?;
    store
        .create_local_identity_v1(
            &LocalIdentityCreateInputV1 {
                identity_ref,
                display_name,
                role,
                password,
                created_at: &created_at,
            },
            request.raw_session_token(),
            raw_csrf_token,
            &created_at,
        )
        .map_err(|_| LocalBrowserTransportErrorV1::Rejected)
}

/// Creates one pending approval request from the authenticated local
/// owner/operator's exact persisted approval-required policy.
///
/// Strict mutation transport, server-owned time, policy actor/session binding,
/// and persistence occur without granting approval or execution authority.
///
/// # Errors
///
/// Collapses read requests, missing/wrong CSRF, unauthorized roles, scope or
/// policy mismatch, expiry, replay conflicts, clock failure, drift, and
/// persistence failure to one denial.
pub fn create_local_browser_approval_request_v1(
    store: &mut SqliteStore,
    request: &LocalBrowserTransportRequestV1<'_>,
    project_ref: &str,
    policy_decision_id: &str,
) -> Result<ApprovalRequestStoreWriteV1, LocalBrowserTransportErrorV1> {
    let Some(raw_csrf_token) = request.raw_csrf_token() else {
        return Err(LocalBrowserTransportErrorV1::Rejected);
    };
    if request.classify_after_session_verification(true)?
        != LocalBrowserRequestClassV1::MutationPreflight
    {
        return Err(LocalBrowserTransportErrorV1::Rejected);
    }
    let requested_at = canonical_system_time_v1(SystemTime::now())
        .map_err(|()| LocalBrowserTransportErrorV1::Rejected)?;
    store
        .append_authenticated_approval_request_v1(
            project_ref,
            policy_decision_id,
            request.raw_session_token(),
            raw_csrf_token,
            &requested_at,
        )
        .map_err(|_| LocalBrowserTransportErrorV1::Rejected)
}

/// Records one scoped approval decision from an authenticated, distinct local
/// human using strict mutation transport and server-owned time.
///
/// Persisted evidence remains unsigned in this source slice and never grants
/// execution authority.
///
/// # Errors
///
/// Collapses read requests, missing/wrong CSRF, invalid scope/outcome/reason,
/// missing or expired requests, self-approval, unauthorized roles, replay
/// conflicts, clock failure, drift, and persistence failure to one denial.
pub fn decide_local_browser_approval_request_v1(
    store: &mut SqliteStore,
    request: &LocalBrowserTransportRequestV1<'_>,
    project_ref: &str,
    approval_request_id: &str,
    decision: ApprovalDecisionV1Kind,
    reason: ApprovalDecisionV1Reason,
) -> Result<ApprovalDecisionStoreWriteV1, LocalBrowserTransportErrorV1> {
    let Some(raw_csrf_token) = request.raw_csrf_token() else {
        return Err(LocalBrowserTransportErrorV1::Rejected);
    };
    let decided_at = canonical_system_time_v1(SystemTime::now())
        .map_err(|()| LocalBrowserTransportErrorV1::Rejected)?;
    let authorized = authorize_local_browser_transport_request_at_v1(store, request, &decided_at)?;
    if authorized.class != LocalBrowserRequestClassV1::MutationPreflight {
        return Err(LocalBrowserTransportErrorV1::Rejected);
    }
    let approval_request = store
        .read_approval_request_v1(project_ref, approval_request_id)
        .map_err(|_| LocalBrowserTransportErrorV1::Rejected)?
        .ok_or(LocalBrowserTransportErrorV1::Rejected)?;
    let decision = decide_approval_request_v1(
        &approval_request.request,
        &ApprovalDecisionV1Input {
            approver_ref: authorized.session.identity_ref,
            approver_session_ref: format!("session:local:{}", authorized.session.session_id),
            decision,
            reason,
            decided_at: decided_at.clone(),
        },
    )
    .map_err(|_| LocalBrowserTransportErrorV1::Rejected)?;
    store
        .append_authenticated_approval_decision_v1(
            &decision,
            request.raw_session_token(),
            raw_csrf_token,
            &decided_at,
        )
        .map_err(|_| LocalBrowserTransportErrorV1::Rejected)
}

/// Composes approved persisted evidence into one short-lived local execution
/// authorization through authenticated mutation transport.
///
/// This opens no public route. Attempt and nonce records remain bounded source
/// evidence; raw nonce bytes are dropped before authorization issue. First
/// success returns one capability wire source, while exact replay returns only
/// stable metadata.
///
/// # Errors
///
/// Collapses transport, authentication, role, source-chain, nonce, entropy,
/// clock, conflict, ambiguity, drift, and persistence failures to one denial.
pub fn issue_local_browser_phase7_execution_authorization_v1(
    store: &mut SqliteStore,
    request: &LocalBrowserTransportRequestV1<'_>,
    input: &LocalBrowserPhase7AuthorizationIssueRequestV1<'_>,
) -> Result<LocalBrowserPhase7AuthorizationIssueResponseV1, LocalBrowserTransportErrorV1> {
    let Some(raw_csrf_token) = request.raw_csrf_token() else {
        return Err(LocalBrowserTransportErrorV1::Rejected);
    };
    let authorized = authorize_local_browser_transport_request_v1(store, request)?;
    if authorized.class != LocalBrowserRequestClassV1::MutationPreflight
        || !authorized
            .session
            .role
            .allows_control(LocalControlPermissionV1::RequestAction)
    {
        return Err(LocalBrowserTransportErrorV1::Rejected);
    }
    let attempt = store
        .prepare_phase7_authorization_attempt_v1(&Phase7AuthorizationAttemptPrepareInputV1 {
            project_ref: input.project_ref,
            approval_decision_id: input.approval_decision_id,
        })
        .map_err(|_| LocalBrowserTransportErrorV1::Rejected)?;
    let expected_requester_session_ref = format!("session:local:{}", authorized.session.session_id);
    if attempt.record.requester_ref != authorized.session.identity_ref
        || attempt.record.requester_session_ref != expected_requester_session_ref
    {
        return Err(LocalBrowserTransportErrorV1::Rejected);
    }
    let nonce = store
        .issue_phase7_authorization_nonce_v1(&Phase7AuthorizationNonceIssueInputV1 {
            project_ref: &attempt.record.project_ref,
            resource_ref: &attempt.record.resource_ref,
            authorization_attempt_id: &attempt.record.authorization_attempt_id,
        })
        .map_err(|_| LocalBrowserTransportErrorV1::Rejected)?;
    let nonce_id = nonce.record.nonce_id.clone();
    drop(nonce);
    let issue = store
        .issue_phase7_local_execution_authorization_v1(
            &Phase7ExecutionAuthorizationIssueInputV1 {
                project_ref: &attempt.record.project_ref,
                resource_ref: &attempt.record.resource_ref,
                authorization_attempt_id: &attempt.record.authorization_attempt_id,
                nonce_id: &nonce_id,
                operation_idempotency_key: input.operation_idempotency_key,
            },
            request.raw_session_token(),
            raw_csrf_token,
        )
        .map_err(|_| LocalBrowserTransportErrorV1::Rejected)?;
    Ok(LocalBrowserPhase7AuthorizationIssueResponseV1 { issue })
}

/// Reads secret-free authorization metadata through authenticated evidence-read
/// transport. This opens no public route.
///
/// # Errors
///
/// Returns one collapsed rejection for transport, authentication, role, scope,
/// drift, clock, or persistence failure.
pub fn read_local_browser_phase7_execution_authorization_v1(
    store: &mut SqliteStore,
    request: &LocalBrowserTransportRequestV1<'_>,
    project_ref: &str,
    resource_ref: &str,
    authorization_id: &str,
) -> Result<Option<Phase7ExecutionAuthorizationRecordV1>, LocalBrowserTransportErrorV1> {
    let authorized = authorize_local_browser_transport_request_v1(store, request)?;
    if authorized.class != LocalBrowserRequestClassV1::ReadOnly
        || !authorized
            .session
            .role
            .allows_control(LocalControlPermissionV1::ReadEvidence)
    {
        return Err(LocalBrowserTransportErrorV1::Rejected);
    }
    store
        .read_phase7_local_execution_authorization_v1(
            project_ref,
            resource_ref,
            authorization_id,
            request.raw_session_token(),
        )
        .map_err(|_| LocalBrowserTransportErrorV1::Rejected)
}

/// Cancels one authorization through exact authenticated requester mutation.
/// This opens no public route.
///
/// # Errors
///
/// Returns one collapsed rejection for transport, authentication, role, scope,
/// state, drift, clock, or persistence failure.
pub fn cancel_local_browser_phase7_execution_authorization_v1(
    store: &mut SqliteStore,
    request: &LocalBrowserTransportRequestV1<'_>,
    input: &Phase7ExecutionAuthorizationTransitionInputV1<'_>,
) -> Result<Option<Phase7ExecutionAuthorizationTransitionV1>, LocalBrowserTransportErrorV1> {
    let Some(raw_csrf_token) = request.raw_csrf_token() else {
        return Err(LocalBrowserTransportErrorV1::Rejected);
    };
    let authorized = authorize_local_browser_transport_request_v1(store, request)?;
    if authorized.class != LocalBrowserRequestClassV1::MutationPreflight
        || !authorized
            .session
            .role
            .allows_control(LocalControlPermissionV1::RequestAction)
    {
        return Err(LocalBrowserTransportErrorV1::Rejected);
    }
    store
        .cancel_phase7_local_execution_authorization_v1(
            input,
            request.raw_session_token(),
            raw_csrf_token,
        )
        .map_err(|_| LocalBrowserTransportErrorV1::Rejected)
}

/// Revokes one authorization through exact approver or owner mutation.
/// This opens no public route.
///
/// # Errors
///
/// Returns one collapsed rejection for transport, authentication, role, scope,
/// state, drift, clock, or persistence failure.
pub fn revoke_local_browser_phase7_execution_authorization_v1(
    store: &mut SqliteStore,
    request: &LocalBrowserTransportRequestV1<'_>,
    input: &Phase7ExecutionAuthorizationTransitionInputV1<'_>,
) -> Result<Option<Phase7ExecutionAuthorizationTransitionV1>, LocalBrowserTransportErrorV1> {
    let Some(raw_csrf_token) = request.raw_csrf_token() else {
        return Err(LocalBrowserTransportErrorV1::Rejected);
    };
    let authorized = authorize_local_browser_transport_request_v1(store, request)?;
    if authorized.class != LocalBrowserRequestClassV1::MutationPreflight
        || !authorized
            .session
            .role
            .allows_control(LocalControlPermissionV1::DecideApproval)
    {
        return Err(LocalBrowserTransportErrorV1::Rejected);
    }
    store
        .revoke_phase7_local_execution_authorization_v1(
            input,
            request.raw_session_token(),
            raw_csrf_token,
        )
        .map_err(|_| LocalBrowserTransportErrorV1::Rejected)
}

/// Consumes exact canonical capability wire through authenticated requester
/// mutation and C1's atomic, non-dispatching redemption path.
///
/// Caller wire storage is zeroized on every parse outcome. This opens no public
/// route and performs no adapter, attempt, receipt, or consequence action.
///
/// # Errors
///
/// Returns one collapsed rejection for noncanonical wire, transport,
/// authentication, role, scope, inactive authority, replay conflict, drift,
/// clock, or persistence failure.
pub fn redeem_local_browser_phase7_execution_capability_v1(
    store: &mut SqliteStore,
    request: &LocalBrowserTransportRequestV1<'_>,
    input: &Phase7CapabilityRedemptionInputV1<'_>,
    capability_wire: &mut String,
) -> Result<Phase7CapabilityConsumptionWriteV1, LocalBrowserTransportErrorV1> {
    let capability = Phase7CapabilitySecretV1::take_from_canonical_wire_v1(capability_wire)
        .map_err(|_| LocalBrowserTransportErrorV1::Rejected)?;
    let Some(raw_csrf_token) = request.raw_csrf_token() else {
        return Err(LocalBrowserTransportErrorV1::Rejected);
    };
    let authorized = authorize_local_browser_transport_request_v1(store, request)?;
    if authorized.class != LocalBrowserRequestClassV1::MutationPreflight
        || !authorized
            .session
            .role
            .allows_control(LocalControlPermissionV1::RequestAction)
    {
        return Err(LocalBrowserTransportErrorV1::Rejected);
    }
    store
        .redeem_phase7_local_execution_capability_v1(
            input,
            capability,
            request.raw_session_token(),
            raw_csrf_token,
        )
        .map_err(|_| LocalBrowserTransportErrorV1::Rejected)
}

/// Permanently disables one non-owner identity using strict owner mutation
/// transport and server-owned time.
///
/// This opens no route and provides no re-enable or owner-recovery authority.
///
/// # Errors
///
/// Collapses read requests, missing/wrong CSRF, non-owner callers, invalid or
/// closed targets, clock failure, drift, and persistence failure to one denial.
pub fn disable_local_browser_identity_v1(
    store: &mut SqliteStore,
    request: &LocalBrowserTransportRequestV1<'_>,
    target_identity_ref: &str,
) -> Result<LocalIdentityDisablementResultV1, LocalBrowserTransportErrorV1> {
    let Some(raw_csrf_token) = request.raw_csrf_token() else {
        return Err(LocalBrowserTransportErrorV1::Rejected);
    };
    if request.classify_after_session_verification(true)?
        != LocalBrowserRequestClassV1::MutationPreflight
    {
        return Err(LocalBrowserTransportErrorV1::Rejected);
    }
    let changed_at = canonical_system_time_v1(SystemTime::now())
        .map_err(|()| LocalBrowserTransportErrorV1::Rejected)?;
    store
        .disable_local_identity_v1(
            target_identity_ref,
            request.raw_session_token(),
            raw_csrf_token,
            &changed_at,
        )
        .map_err(|_| LocalBrowserTransportErrorV1::Rejected)?
        .ok_or(LocalBrowserTransportErrorV1::Rejected)
}

/// Rotates one active browser session using strict mutation transport and
/// server-owned time.
///
/// This opens no route. The prior bearer/CSRF pair is revoked atomically and
/// replacement secrets are returned only as host-only cookie fields.
///
/// # Errors
///
/// Collapses read requests, missing/wrong CSRF, clock failure, idle/expired
/// sessions, evidence drift, and persistence failure to one generic denial.
pub fn rotate_local_browser_session_v1(
    store: &mut SqliteStore,
    request: &LocalBrowserTransportRequestV1<'_>,
) -> Result<LocalBrowserSessionRotationResponseV1, LocalBrowserTransportErrorV1> {
    let Some(raw_csrf_token) = request.raw_csrf_token() else {
        return Err(LocalBrowserTransportErrorV1::Rejected);
    };
    if request.classify_after_session_verification(true)?
        != LocalBrowserRequestClassV1::MutationPreflight
    {
        return Err(LocalBrowserTransportErrorV1::Rejected);
    }
    let rotated_at = canonical_system_time_v1(SystemTime::now())
        .map_err(|()| LocalBrowserTransportErrorV1::Rejected)?;
    let mut rotated = store
        .rotate_local_session_v1(
            request.raw_session_token(),
            raw_csrf_token,
            &rotated_at,
            LOCAL_BROWSER_SESSION_IDLE_TIMEOUT_SECONDS_V1,
        )
        .map_err(|_| LocalBrowserTransportErrorV1::Rejected)?
        .ok_or(LocalBrowserTransportErrorV1::Rejected)?;
    let cookie_headers = create_local_browser_session_cookie_headers_for_rotation_v1(&rotated);
    rotated.raw_session_token.zeroize();
    rotated.raw_csrf_token.zeroize();
    let cookie_headers = cookie_headers?;
    Ok(LocalBrowserSessionRotationResponseV1 {
        prior_session_id: rotated.prior_session_id,
        session: rotated.session,
        cookie_headers,
    })
}

/// Builds cookie fields whose `Max-Age` never outlives issued session evidence.
///
/// Fractional remaining milliseconds round down. Exact session issue output
/// remains secret-bearing and must not be logged or persisted.
///
/// # Errors
///
/// Rejects malformed/drifted session times, nonpositive windows, out-of-range
/// lifetimes, or malformed raw session material.
pub fn create_local_browser_session_cookie_headers_for_issue_v1(
    issued: &LocalSessionIssueResultV1,
) -> Result<LocalBrowserSessionCookieHeadersV1, LocalBrowserTransportErrorV1> {
    let issued_at = canonical_utc_timestamp_millis_v1(&issued.session.issued_at)
        .ok_or(LocalBrowserTransportErrorV1::Rejected)?;
    let expires_at = canonical_utc_timestamp_millis_v1(&issued.session.expires_at)
        .ok_or(LocalBrowserTransportErrorV1::Rejected)?;
    let lifetime_millis = expires_at
        .checked_sub(issued_at)
        .filter(|value| *value > 0)
        .ok_or(LocalBrowserTransportErrorV1::Rejected)?;
    let max_age_seconds = u32::try_from(lifetime_millis / 1_000)
        .map_err(|_| LocalBrowserTransportErrorV1::Rejected)?;
    create_local_browser_session_cookie_headers_v1(
        &issued.raw_session_token,
        &issued.raw_csrf_token,
        max_age_seconds,
    )
    .map_err(|_| LocalBrowserTransportErrorV1::Rejected)
}

fn create_local_browser_session_cookie_headers_for_rotation_v1(
    rotated: &LocalSessionRotationResultV1,
) -> Result<LocalBrowserSessionCookieHeadersV1, LocalBrowserTransportErrorV1> {
    let rotated_at = canonical_utc_timestamp_millis_v1(&rotated.rotated_at)
        .ok_or(LocalBrowserTransportErrorV1::Rejected)?;
    let expires_at = canonical_utc_timestamp_millis_v1(&rotated.session.expires_at)
        .ok_or(LocalBrowserTransportErrorV1::Rejected)?;
    let lifetime_millis = expires_at
        .checked_sub(rotated_at)
        .filter(|value| *value >= 60_000)
        .ok_or(LocalBrowserTransportErrorV1::Rejected)?;
    let max_age_seconds = u32::try_from(lifetime_millis / 1_000)
        .map_err(|_| LocalBrowserTransportErrorV1::Rejected)?;
    create_local_browser_session_cookie_headers_v1(
        &rotated.raw_session_token,
        &rotated.raw_csrf_token,
        max_age_seconds,
    )
    .map_err(|_| LocalBrowserTransportErrorV1::Rejected)
}

fn canonical_system_time_v1(value: SystemTime) -> Result<String, ()> {
    let duration = value.duration_since(UNIX_EPOCH).map_err(|_| ())?;
    let total_millis = u64::try_from(duration.as_millis()).map_err(|_| ())?;
    let total_seconds = total_millis / 1_000;
    let millisecond = total_millis % 1_000;
    let days = total_seconds / 86_400;
    let seconds_of_day = total_seconds % 86_400;
    let hour = seconds_of_day / 3_600;
    let minute = (seconds_of_day % 3_600) / 60;
    let second = seconds_of_day % 60;
    let (year, month, day) = civil_date_from_unix_days_v1(days).ok_or(())?;
    if year > 9_999 {
        return Err(());
    }
    let canonical = format!(
        "{year:04}-{month:02}-{day:02}T{hour:02}:{minute:02}:{second:02}.{millisecond:03}Z"
    );
    canonical_utc_timestamp_millis_v1(&canonical)
        .map(|_| canonical)
        .ok_or(())
}

fn civil_date_from_unix_days_v1(days: u64) -> Option<(u64, u64, u64)> {
    let shifted = i64::try_from(days).ok()?.checked_add(719_468)?;
    let era = shifted / 146_097;
    let day_of_era = shifted - era * 146_097;
    let year_of_era =
        (day_of_era - day_of_era / 1_460 + day_of_era / 36_524 - day_of_era / 146_096) / 365;
    let mut year = year_of_era + era * 400;
    let day_of_year = day_of_era - (365 * year_of_era + year_of_era / 4 - year_of_era / 100);
    let month_prime = (5 * day_of_year + 2) / 153;
    let day = day_of_year - (153 * month_prime + 2) / 5 + 1;
    let month = month_prime + if month_prime < 10 { 3 } else { -9 };
    year += i64::from(month <= 2);
    Some((
        u64::try_from(year).ok()?,
        u64::try_from(month).ok()?,
        u64::try_from(day).ok()?,
    ))
}

/// Explicit configuration for one local daemon process.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct DaemonConfigV1 {
    database_path: PathBuf,
    listen_address: SocketAddr,
    disposable_git_root: Option<PathBuf>,
    git_executable: Option<PathBuf>,
    internal_console_root: Option<PathBuf>,
    internal_console_asset_manifest: BTreeMap<String, PathBuf>,
}

impl DaemonConfigV1 {
    /// Builds loopback-default configuration for one explicit database path.
    ///
    /// # Errors
    ///
    /// Rejects an empty database path.
    pub fn for_database(database_path: impl AsRef<Path>) -> Result<Self, DaemonErrorV1> {
        Self::new(database_path, DEFAULT_LISTEN_ADDRESS_V1)
    }

    /// Builds configuration for one explicit numeric loopback address.
    ///
    /// # Errors
    ///
    /// Rejects empty database paths, non-loopback addresses, and port zero.
    pub fn new(
        database_path: impl AsRef<Path>,
        listen_address: SocketAddr,
    ) -> Result<Self, DaemonErrorV1> {
        Self::new_with_port_policy(database_path, listen_address, false)
    }

    fn new_with_port_policy(
        database_path: impl AsRef<Path>,
        listen_address: SocketAddr,
        allow_port_zero: bool,
    ) -> Result<Self, DaemonErrorV1> {
        let database_path = database_path.as_ref();
        if database_path.as_os_str().is_empty() {
            return Err(DaemonErrorV1::DatabasePathRequired);
        }
        if !listen_address.ip().is_loopback() {
            return Err(DaemonErrorV1::NonLoopbackAddress);
        }
        if listen_address.port() == 0 && !allow_port_zero {
            return Err(DaemonErrorV1::PortZeroForbidden);
        }

        Ok(Self {
            database_path: database_path.to_path_buf(),
            listen_address,
            disposable_git_root: None,
            git_executable: None,
            internal_console_root: None,
            internal_console_asset_manifest: BTreeMap::new(),
        })
    }

    /// Enables frozen Phase 8 runtime routes for one configured disposable
    /// temporary root and one absolute Git executable.
    ///
    /// # Errors
    ///
    /// Rejects empty or non-absolute paths.
    pub fn with_phase8_runtime(
        mut self,
        disposable_git_root: impl AsRef<Path>,
        git_executable: impl AsRef<Path>,
    ) -> Result<Self, DaemonErrorV1> {
        let disposable_git_root = disposable_git_root.as_ref();
        let git_executable = git_executable.as_ref();
        if disposable_git_root.as_os_str().is_empty()
            || git_executable.as_os_str().is_empty()
            || !disposable_git_root.is_absolute()
            || !git_executable.is_absolute()
        {
            return Err(DaemonErrorV1::InvalidRuntimeConfiguration);
        }
        self.disposable_git_root = Some(disposable_git_root.to_path_buf());
        self.git_executable = Some(git_executable.to_path_buf());
        Ok(self)
    }

    /// Enables source-local immutable console hosting from one exact asset
    /// manifest. This is an experimental internal seam, not a stable daemon or
    /// CLI configuration contract.
    ///
    /// # Errors
    ///
    /// Rejects non-absolute roots, empty/oversized manifests, reserved data
    /// routes, ambiguous request paths, unsafe relative paths, and unsupported
    /// asset types. Filesystem identity is revalidated and bytes are loaded at
    /// daemon bind.
    pub fn with_internal_console_root(
        mut self,
        console_root: impl AsRef<Path>,
        asset_manifest: BTreeMap<String, PathBuf>,
    ) -> Result<Self, DaemonErrorV1> {
        let console_root = console_root.as_ref();
        if console_root.as_os_str().is_empty()
            || !console_root.is_absolute()
            || asset_manifest.is_empty()
            || asset_manifest.len() > PHASE9_MAX_CONSOLE_ASSET_COUNT_V1
            || asset_manifest.iter().any(|(request_path, relative_path)| {
                !valid_console_request_path_v1(request_path)
                    || !valid_console_relative_path_v1(relative_path)
                    || console_content_type_v1(relative_path).is_none()
            })
        {
            return Err(DaemonErrorV1::InvalidConsoleConfiguration);
        }
        self.internal_console_root = Some(console_root.to_path_buf());
        self.internal_console_asset_manifest = asset_manifest;
        Ok(self)
    }

    /// Returns the explicit database path.
    #[must_use]
    pub fn database_path(&self) -> &Path {
        &self.database_path
    }

    /// Returns the validated loopback listen address.
    #[must_use]
    pub const fn listen_address(&self) -> SocketAddr {
        self.listen_address
    }

    /// Returns configured disposable Git root when runtime composition is enabled.
    #[must_use]
    pub fn disposable_git_root(&self) -> Option<&Path> {
        self.disposable_git_root.as_deref()
    }

    /// Returns configured absolute Git executable when runtime composition is enabled.
    #[must_use]
    pub fn git_executable(&self) -> Option<&Path> {
        self.git_executable.as_deref()
    }

    /// Returns source-local internal console root when explicitly enabled.
    #[must_use]
    pub fn internal_console_root(&self) -> Option<&Path> {
        self.internal_console_root.as_deref()
    }

    /// Returns exact source-local console request-path manifest.
    #[must_use]
    pub const fn internal_console_asset_manifest(&self) -> &BTreeMap<String, PathBuf> {
        &self.internal_console_asset_manifest
    }

    #[cfg(test)]
    fn for_test(database_path: impl AsRef<Path>) -> Self {
        Self::new_with_port_policy(
            database_path,
            SocketAddr::new(IpAddr::V4(Ipv4Addr::LOCALHOST), 0),
            true,
        )
        .expect("test configuration should be valid")
    }
}

/// Parsed command-line action for the source-only daemon binary.
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DaemonCliActionV1 {
    /// Print bounded usage text and exit without opening storage or a listener.
    Help,
    /// Print source package version and exit without opening storage or a listener.
    Version,
    /// Print target-neutral Phase 10 source manifest without opening storage or a listener.
    Manifest,
    /// Open the validated local daemon configuration.
    Run(DaemonConfigV1),
}

/// Stable fail-closed daemon errors.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum DaemonErrorV1 {
    /// No explicit durable database path was supplied.
    DatabasePathRequired,
    /// A command-line option was unknown or duplicated.
    InvalidArguments,
    /// A command-line option was missing its value.
    ArgumentValueRequired,
    /// Explicit configuration path was not absolute.
    InvalidConfigPath,
    /// Explicit configuration file or contract was unsafe or invalid.
    InvalidConfigFile,
    /// Explicit configuration file exceeded its fixed byte bound.
    ConfigFileTooLarge,
    /// Listen address was not one numeric socket address.
    InvalidListenAddress,
    /// Phase 8 runtime paths were incomplete, empty, or non-absolute.
    InvalidRuntimeConfiguration,
    /// Source-local console root or exact asset manifest was invalid.
    InvalidConsoleConfiguration,
    /// One configured console asset could not be securely loaded at bind.
    ConsoleAssetLoadFailed,
    /// Listen address was not loopback.
    NonLoopbackAddress,
    /// Port zero was requested by operator configuration.
    PortZeroForbidden,
    /// Durable storage failed to open or verify before listener creation.
    StoreOpenFailed,
    /// Loopback listener creation failed.
    ListenFailed,
    /// Bound address could not be verified as loopback.
    BoundAddressInvalid,
    /// One local connection could not be accepted.
    AcceptFailed,
    /// One bounded request could not be read.
    RequestReadFailed,
    /// One bounded response could not be written.
    ResponseWriteFailed,
    /// One bounded worker terminated unexpectedly.
    WorkerFailed,
    /// Operating-system termination handling could not be installed safely.
    SignalHandlerInstallFailed,
}

impl DaemonErrorV1 {
    /// Stable public-safe error code.
    #[must_use]
    pub const fn code(self) -> &'static str {
        match self {
            Self::DatabasePathRequired => "lnsatd.database.path_required",
            Self::InvalidArguments => "lnsatd.arguments.invalid",
            Self::ArgumentValueRequired => "lnsatd.arguments.value_required",
            Self::InvalidConfigPath => "lnsatd.config.path_invalid",
            Self::InvalidConfigFile => "lnsatd.config.file_invalid",
            Self::ConfigFileTooLarge => "lnsatd.config.file_too_large",
            Self::InvalidListenAddress => "lnsatd.listen.invalid",
            Self::InvalidRuntimeConfiguration => "lnsatd.runtime_configuration.invalid",
            Self::InvalidConsoleConfiguration => "lnsatd.console_configuration.invalid",
            Self::ConsoleAssetLoadFailed => "lnsatd.console_asset.load_failed",
            Self::NonLoopbackAddress => "lnsatd.listen.non_loopback_forbidden",
            Self::PortZeroForbidden => "lnsatd.listen.port_zero_forbidden",
            Self::StoreOpenFailed => "lnsatd.store.open_failed",
            Self::ListenFailed => "lnsatd.listen.failed",
            Self::BoundAddressInvalid => "lnsatd.listen.bound_address_invalid",
            Self::AcceptFailed => "lnsatd.connection.accept_failed",
            Self::RequestReadFailed => "lnsatd.request.read_failed",
            Self::ResponseWriteFailed => "lnsatd.response.write_failed",
            Self::WorkerFailed => "lnsatd.worker.failed",
            Self::SignalHandlerInstallFailed => "lnsatd.signal.install_failed",
        }
    }
}

impl fmt::Display for DaemonErrorV1 {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(self.code())
    }
}

impl std::error::Error for DaemonErrorV1 {}

/// Installs one fail-closed process termination handler.
///
/// The handler delegates to the same idempotent cooperative shutdown contract
/// used by in-process composition. Existing process handlers are never
/// overwritten.
///
/// # Errors
///
/// Returns a public-safe startup error if this process already owns a
/// conflicting handler or the operating system rejects registration.
pub fn install_os_shutdown_handler_v1(shutdown: DaemonShutdownV1) -> Result<(), DaemonErrorV1> {
    ctrlc::try_set_handler(move || shutdown.request_shutdown())
        .map_err(|_| DaemonErrorV1::SignalHandlerInstallFailed)
}

/// Parses strict source-only daemon arguments.
///
/// Supported modes are `--config <absolute-path>` or existing direct
/// `--database <path>` arguments with optional `--listen <ip:port>` and paired
/// Phase 8 runtime paths. Help, version, and manifest remain standalone. Values
/// are never included in returned errors.
///
/// # Errors
///
/// Rejects unknown, duplicated, missing, non-UTF-8 listen, non-loopback, or
/// zero-port configuration.
pub fn parse_daemon_args_v1<I, T>(arguments: I) -> Result<DaemonCliActionV1, DaemonErrorV1>
where
    I: IntoIterator<Item = T>,
    T: Into<OsString>,
{
    let mut arguments = arguments.into_iter().map(Into::into);
    let _program = arguments.next();
    let mut config_path = None;
    let mut database_path = None;
    let mut listen_address = None;
    let mut disposable_git_root = None;
    let mut git_executable = None;

    while let Some(argument) = arguments.next() {
        if argument == OsStr::new("--help") || argument == OsStr::new("-h") {
            if daemon_run_arguments_present_v1(
                config_path.as_ref(),
                database_path.as_ref(),
                listen_address.as_ref(),
                disposable_git_root.as_ref(),
                git_executable.as_ref(),
            ) || arguments.next().is_some()
            {
                return Err(DaemonErrorV1::InvalidArguments);
            }
            return Ok(DaemonCliActionV1::Help);
        }
        if argument == OsStr::new("--version") || argument == OsStr::new("-V") {
            if daemon_run_arguments_present_v1(
                config_path.as_ref(),
                database_path.as_ref(),
                listen_address.as_ref(),
                disposable_git_root.as_ref(),
                git_executable.as_ref(),
            ) || arguments.next().is_some()
            {
                return Err(DaemonErrorV1::InvalidArguments);
            }
            return Ok(DaemonCliActionV1::Version);
        }
        if argument == OsStr::new("--manifest") {
            if daemon_run_arguments_present_v1(
                config_path.as_ref(),
                database_path.as_ref(),
                listen_address.as_ref(),
                disposable_git_root.as_ref(),
                git_executable.as_ref(),
            ) || arguments.next().is_some()
            {
                return Err(DaemonErrorV1::InvalidArguments);
            }
            return Ok(DaemonCliActionV1::Manifest);
        }
        if argument == OsStr::new("--config") {
            if config_path.is_some() {
                return Err(DaemonErrorV1::InvalidArguments);
            }
            config_path = Some(next_daemon_argument_value_v1(&mut arguments)?);
            continue;
        }
        if argument == OsStr::new("--database") {
            if database_path.is_some() {
                return Err(DaemonErrorV1::InvalidArguments);
            }
            database_path = Some(next_daemon_argument_value_v1(&mut arguments)?);
            continue;
        }
        if argument == OsStr::new("--listen") {
            if listen_address.is_some() {
                return Err(DaemonErrorV1::InvalidArguments);
            }
            let value = arguments
                .next()
                .ok_or(DaemonErrorV1::ArgumentValueRequired)?;
            let value = value.to_str().ok_or(DaemonErrorV1::InvalidListenAddress)?;
            listen_address = Some(
                value
                    .parse()
                    .map_err(|_| DaemonErrorV1::InvalidListenAddress)?,
            );
            continue;
        }
        if argument == OsStr::new("--disposable-git-root") {
            if disposable_git_root.is_some() {
                return Err(DaemonErrorV1::InvalidArguments);
            }
            disposable_git_root = Some(next_daemon_argument_value_v1(&mut arguments)?);
            continue;
        }
        if argument == OsStr::new("--git-executable") {
            if git_executable.is_some() {
                return Err(DaemonErrorV1::InvalidArguments);
            }
            git_executable = Some(next_daemon_argument_value_v1(&mut arguments)?);
            continue;
        }
        return Err(DaemonErrorV1::InvalidArguments);
    }

    resolve_daemon_run_arguments_v1(
        config_path,
        database_path,
        listen_address,
        disposable_git_root,
        git_executable,
    )
}

fn next_daemon_argument_value_v1(
    arguments: &mut impl Iterator<Item = OsString>,
) -> Result<OsString, DaemonErrorV1> {
    arguments.next().ok_or(DaemonErrorV1::ArgumentValueRequired)
}

fn resolve_daemon_run_arguments_v1(
    config_path: Option<OsString>,
    database_path: Option<OsString>,
    listen_address: Option<SocketAddr>,
    disposable_git_root: Option<OsString>,
    git_executable: Option<OsString>,
) -> Result<DaemonCliActionV1, DaemonErrorV1> {
    if let Some(config_path) = config_path {
        if database_path.is_some()
            || listen_address.is_some()
            || disposable_git_root.is_some()
            || git_executable.is_some()
        {
            return Err(DaemonErrorV1::InvalidArguments);
        }
        return product_config::load_daemon_config_v1(config_path)
            .map(product_config::LoadedDaemonConfigV1::into_config)
            .map(DaemonCliActionV1::Run);
    }

    let database_path = database_path.ok_or(DaemonErrorV1::DatabasePathRequired)?;
    let listen_address = listen_address.unwrap_or(DEFAULT_LISTEN_ADDRESS_V1);
    let config = DaemonConfigV1::new(database_path, listen_address)?;
    match (disposable_git_root, git_executable) {
        (None, None) => Ok(DaemonCliActionV1::Run(config)),
        (Some(root), Some(executable)) => config
            .with_phase8_runtime(root, executable)
            .map(DaemonCliActionV1::Run),
        _ => Err(DaemonErrorV1::InvalidRuntimeConfiguration),
    }
}

fn daemon_run_arguments_present_v1<T>(
    config_path: Option<&T>,
    database_path: Option<&T>,
    listen_address: Option<&SocketAddr>,
    disposable_git_root: Option<&T>,
    git_executable: Option<&T>,
) -> bool {
    config_path.is_some()
        || database_path.is_some()
        || listen_address.is_some()
        || disposable_git_root.is_some()
        || git_executable.is_some()
}

/// One verified store and loopback listener.
#[derive(Clone, Debug)]
struct Phase8DaemonRuntimeV1 {
    disposable_git_root: PathBuf,
    git_executable: PathBuf,
}

#[derive(Clone, Debug)]
struct Phase9ConsoleAssetV1 {
    bytes: Arc<Vec<u8>>,
    content_type: &'static str,
}

#[derive(Clone, Debug)]
struct Phase9ConsoleRuntimeV1 {
    assets: BTreeMap<String, Phase9ConsoleAssetV1>,
}

fn valid_console_request_path_v1(value: &str) -> bool {
    if value.is_empty()
        || value.len() > 512
        || !value.starts_with('/')
        || value.contains(['?', '#', '%', '\\'])
        || value.contains("//")
        || value == READINESS_PATH_V1
        || value == GATEWAY_ROOT_PATH_V1
        || value.starts_with("/v1/")
    {
        return false;
    }
    value == "/"
        || value[1..].split('/').all(|segment| {
            !segment.is_empty()
                && !matches!(segment, "." | "..")
                && segment
                    .bytes()
                    .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'.' | b'_' | b'-'))
        })
}

fn valid_console_relative_path_v1(value: &Path) -> bool {
    !value.as_os_str().is_empty()
        && !value.is_absolute()
        && !value.as_os_str().to_string_lossy().contains('\\')
        && value
            .components()
            .all(|component| matches!(component, Component::Normal(_)))
}

fn console_content_type_v1(value: &Path) -> Option<&'static str> {
    match value.extension()?.to_str()? {
        "html" => Some("text/html; charset=utf-8"),
        "css" => Some("text/css; charset=utf-8"),
        "js" | "mjs" => Some("text/javascript; charset=utf-8"),
        "json" | "map" => Some("application/json; charset=utf-8"),
        "txt" => Some("text/plain; charset=utf-8"),
        "svg" => Some("image/svg+xml"),
        "png" => Some("image/png"),
        "jpg" | "jpeg" => Some("image/jpeg"),
        "webp" => Some("image/webp"),
        "ico" => Some("image/x-icon"),
        "woff2" => Some("font/woff2"),
        _ => None,
    }
}

fn load_phase9_console_runtime_v1(
    root: &Path,
    manifest: &BTreeMap<String, PathBuf>,
) -> Result<Phase9ConsoleRuntimeV1, DaemonErrorV1> {
    let root_metadata =
        fs::symlink_metadata(root).map_err(|_| DaemonErrorV1::ConsoleAssetLoadFailed)?;
    if root_metadata.file_type().is_symlink() || !root_metadata.is_dir() {
        return Err(DaemonErrorV1::ConsoleAssetLoadFailed);
    }
    let canonical_root =
        fs::canonicalize(root).map_err(|_| DaemonErrorV1::ConsoleAssetLoadFailed)?;
    let mut assets = BTreeMap::new();
    for (request_path, relative_path) in manifest {
        let mut candidate = canonical_root.clone();
        let components = relative_path.components().collect::<Vec<_>>();
        for (index, component) in components.iter().enumerate() {
            let Component::Normal(segment) = component else {
                return Err(DaemonErrorV1::ConsoleAssetLoadFailed);
            };
            candidate.push(segment);
            let metadata = fs::symlink_metadata(&candidate)
                .map_err(|_| DaemonErrorV1::ConsoleAssetLoadFailed)?;
            if metadata.file_type().is_symlink()
                || (index + 1 == components.len() && !metadata.is_file())
                || (index + 1 < components.len() && !metadata.is_dir())
            {
                return Err(DaemonErrorV1::ConsoleAssetLoadFailed);
            }
        }
        let canonical_candidate =
            fs::canonicalize(&candidate).map_err(|_| DaemonErrorV1::ConsoleAssetLoadFailed)?;
        if !canonical_candidate.starts_with(&canonical_root) {
            return Err(DaemonErrorV1::ConsoleAssetLoadFailed);
        }
        let bytes =
            fs::read(&canonical_candidate).map_err(|_| DaemonErrorV1::ConsoleAssetLoadFailed)?;
        if bytes.len() > PHASE9_MAX_CONSOLE_ASSET_BYTES_V1 {
            return Err(DaemonErrorV1::ConsoleAssetLoadFailed);
        }
        let content_type =
            console_content_type_v1(relative_path).ok_or(DaemonErrorV1::ConsoleAssetLoadFailed)?;
        assets.insert(
            request_path.clone(),
            Phase9ConsoleAssetV1 {
                bytes: Arc::new(bytes),
                content_type,
            },
        );
    }
    Ok(Phase9ConsoleRuntimeV1 { assets })
}

pub struct DaemonServerV1 {
    listener: TcpListener,
    bound_address: SocketAddr,
    _database_lease: LocalDaemonDatabaseLeaseV1,
    store: Arc<Mutex<SqliteStore>>,
    authentication_limiter: Arc<LocalAuthenticationLimiterV1>,
    phase8_runtime: Option<Arc<Phase8DaemonRuntimeV1>>,
    phase9_console: Option<Arc<Phase9ConsoleRuntimeV1>>,
    consequential_dispatch_active: Arc<AtomicBool>,
    store_state: SqliteStoreStateV1,
    shutdown: DaemonShutdownV1,
}

/// Cloneable cooperative shutdown handle for one bound daemon.
#[derive(Clone)]
pub struct DaemonShutdownV1 {
    requested: Arc<AtomicBool>,
    wake_address: SocketAddr,
}

impl DaemonShutdownV1 {
    /// Requests idempotent graceful shutdown and wakes a blocked accept.
    ///
    /// Existing bounded workers are allowed to finish. The wake connection is
    /// loopback-only and carries no request or mutation authority.
    pub fn request_shutdown(&self) {
        if !self.requested.swap(true, Ordering::AcqRel) {
            let _ = TcpStream::connect_timeout(&self.wake_address, SHUTDOWN_WAKE_TIMEOUT_V1);
        }
    }

    /// Returns whether cooperative shutdown has been requested.
    #[must_use]
    pub fn is_shutdown_requested(&self) -> bool {
        self.requested.load(Ordering::Acquire)
    }
}

impl DaemonServerV1 {
    /// Opens and verifies durable storage before creating a loopback listener.
    ///
    /// # Errors
    ///
    /// Fails closed when storage, listener creation, or bound-address
    /// verification fails.
    pub fn bind(config: &DaemonConfigV1) -> Result<Self, DaemonErrorV1> {
        let database_lease = acquire_local_daemon_database_lease_v1(config.database_path())
            .map_err(|_| DaemonErrorV1::StoreOpenFailed)?;
        let mut store = SqliteStore::open(config.database_path())
            .map_err(|_| DaemonErrorV1::StoreOpenFailed)?;
        store
            .materialize_phase8_interrupted_dispatches_v1()
            .map_err(|_| DaemonErrorV1::StoreOpenFailed)?;
        let store_state = store.state().map_err(|_| DaemonErrorV1::StoreOpenFailed)?;
        if store_state.schema_version != SQLITE_SCHEMA_VERSION
            || store_state.migration_count != SQLITE_SCHEMA_VERSION
            || store_state.journal_mode != "wal"
            || !store_state.foreign_keys_enabled
            || store_state.synchronous_level != 2
            || store_state.trusted_schema_enabled
            || !store_state.integrity_ok
        {
            return Err(DaemonErrorV1::StoreOpenFailed);
        }
        let phase9_console = config
            .internal_console_root()
            .map(|root| {
                load_phase9_console_runtime_v1(root, config.internal_console_asset_manifest())
                    .map(Arc::new)
            })
            .transpose()?;
        let listener =
            TcpListener::bind(config.listen_address()).map_err(|_| DaemonErrorV1::ListenFailed)?;
        let bound_address = listener
            .local_addr()
            .map_err(|_| DaemonErrorV1::BoundAddressInvalid)?;
        if !bound_address.ip().is_loopback() {
            return Err(DaemonErrorV1::BoundAddressInvalid);
        }
        let shutdown = DaemonShutdownV1 {
            requested: Arc::new(AtomicBool::new(false)),
            wake_address: bound_address,
        };

        Ok(Self {
            listener,
            bound_address,
            _database_lease: database_lease,
            store: Arc::new(Mutex::new(store)),
            authentication_limiter: Arc::new(LocalAuthenticationLimiterV1::new()),
            phase8_runtime: config
                .disposable_git_root()
                .zip(config.git_executable())
                .map(|(disposable_git_root, git_executable)| {
                    Arc::new(Phase8DaemonRuntimeV1 {
                        disposable_git_root: disposable_git_root.to_path_buf(),
                        git_executable: git_executable.to_path_buf(),
                    })
                }),
            phase9_console,
            consequential_dispatch_active: Arc::new(AtomicBool::new(false)),
            store_state,
            shutdown,
        })
    }

    /// Returns the operating-system-confirmed loopback address.
    #[must_use]
    pub const fn local_addr(&self) -> SocketAddr {
        self.bound_address
    }

    /// Returns a cloneable handle that can stop this server cooperatively.
    #[must_use]
    pub fn shutdown_handle(&self) -> DaemonShutdownV1 {
        self.shutdown.clone()
    }

    /// Accepts and closes one bounded local readiness request.
    ///
    /// # Errors
    ///
    /// Returns only public-safe transport error classes. Request contents and
    /// configured paths are never reflected.
    pub fn serve_one(&self) -> Result<(), DaemonErrorV1> {
        let (stream, peer_address) = self
            .listener
            .accept()
            .map_err(|_| DaemonErrorV1::AcceptFailed)?;
        serve_accepted_connection(
            stream,
            peer_address,
            GatewayRuntimeContextV1 {
                bound_address: self.bound_address,
                store: &self.store,
                authentication_limiter: &self.authentication_limiter,
                phase8_runtime: self.phase8_runtime.as_deref(),
                phase9_console: self.phase9_console.as_deref(),
                consequential_dispatch_active: &self.consequential_dispatch_active,
            },
            &self.store_state,
        )
    }

    /// Serves at most eight bounded local requests concurrently until
    /// cooperative shutdown or listener failure.
    ///
    /// # Errors
    ///
    /// Stops on listener failure or an unexpected worker termination. Peer
    /// read, timeout, and response failures remain isolated to that
    /// connection. Shutdown stops accepting, then joins every in-flight bounded
    /// worker before returning.
    pub fn serve(&self) -> Result<(), DaemonErrorV1> {
        let mut workers = Vec::with_capacity(MAX_CONCURRENT_CONNECTIONS_V1);
        let listener_result = loop {
            if let Err(error) = reap_finished_workers(&mut workers) {
                break Err(error);
            }
            let Ok((mut stream, peer_address)) = self.listener.accept() else {
                break Err(DaemonErrorV1::AcceptFailed);
            };
            if self.shutdown.is_shutdown_requested() {
                break Ok(());
            }
            if let Err(error) = reap_finished_workers(&mut workers) {
                break Err(error);
            }
            if workers.len() == MAX_CONCURRENT_CONNECTIONS_V1 {
                let _ = refuse_capacity(&mut stream, &self.store_state);
                continue;
            }

            let bound_address = self.bound_address;
            let store = Arc::clone(&self.store);
            let authentication_limiter = Arc::clone(&self.authentication_limiter);
            let phase8_runtime = self.phase8_runtime.clone();
            let phase9_console = self.phase9_console.clone();
            let consequential_dispatch_active = Arc::clone(&self.consequential_dispatch_active);
            let store_state = self.store_state.clone();
            match thread::Builder::new()
                .name("lnsatd-gateway".to_owned())
                .spawn(move || {
                    let _ = serve_accepted_connection(
                        stream,
                        peer_address,
                        GatewayRuntimeContextV1 {
                            bound_address,
                            store: &store,
                            authentication_limiter: &authentication_limiter,
                            phase8_runtime: phase8_runtime.as_deref(),
                            phase9_console: phase9_console.as_deref(),
                            consequential_dispatch_active: &consequential_dispatch_active,
                        },
                        &store_state,
                    );
                }) {
                Ok(worker) => workers.push(worker),
                Err(_) => break Err(DaemonErrorV1::WorkerFailed),
            }
        };
        let join_result = join_workers(workers);
        listener_result.and(join_result)
    }
}

fn configure_connection_timeouts(stream: &TcpStream) -> Result<(), DaemonErrorV1> {
    stream
        .set_read_timeout(Some(CONNECTION_TIMEOUT_V1))
        .map_err(|_| DaemonErrorV1::RequestReadFailed)?;
    stream
        .set_write_timeout(Some(CONNECTION_TIMEOUT_V1))
        .map_err(|_| DaemonErrorV1::ResponseWriteFailed)
}

fn refuse_capacity(
    stream: &mut TcpStream,
    store_state: &SqliteStoreStateV1,
) -> Result<(), DaemonErrorV1> {
    stream
        .set_read_timeout(Some(OVERLOAD_TIMEOUT_V1))
        .map_err(|_| DaemonErrorV1::RequestReadFailed)?;
    stream
        .set_write_timeout(Some(OVERLOAD_TIMEOUT_V1))
        .map_err(|_| DaemonErrorV1::ResponseWriteFailed)?;
    let _ = read_http_request_v1(stream);
    write_response_with_state(
        stream,
        ClassifiedHttpResponseV1::unversioned(HttpResponseV1::ServiceUnavailable),
        store_state,
    )
}

#[derive(Clone, Copy)]
struct GatewayRuntimeContextV1<'a> {
    bound_address: SocketAddr,
    store: &'a Arc<Mutex<SqliteStore>>,
    authentication_limiter: &'a Arc<LocalAuthenticationLimiterV1>,
    phase8_runtime: Option<&'a Phase8DaemonRuntimeV1>,
    phase9_console: Option<&'a Phase9ConsoleRuntimeV1>,
    consequential_dispatch_active: &'a Arc<AtomicBool>,
}

fn serve_accepted_connection(
    mut stream: TcpStream,
    peer_address: SocketAddr,
    context: GatewayRuntimeContextV1<'_>,
    store_state: &SqliteStoreStateV1,
) -> Result<(), DaemonErrorV1> {
    configure_connection_timeouts(&stream)?;
    if !peer_address.ip().is_loopback() {
        return write_response_with_state(
            &mut stream,
            ClassifiedHttpResponseV1::unversioned(HttpResponseV1::Forbidden),
            store_state,
        );
    }

    let response = match read_http_request_v1(&mut stream) {
        Ok(RequestReadV1::Complete(mut request)) => {
            let response = classify_request(&request, peer_address.ip(), context);
            request.zeroize();
            response
        }
        Ok(RequestReadV1::HeadTooLarge) => {
            ClassifiedHttpResponseV1::unversioned(HttpResponseV1::RequestHeadTooLarge)
        }
        Ok(RequestReadV1::BodyTooLarge) => {
            ClassifiedHttpResponseV1::unversioned(HttpResponseV1::RequestBodyTooLarge)
        }
        Err(()) => return Err(DaemonErrorV1::RequestReadFailed),
    };
    write_response_with_state(&mut stream, response, store_state)
}

fn reap_finished_workers(workers: &mut Vec<JoinHandle<()>>) -> Result<(), DaemonErrorV1> {
    let mut index = 0;
    while index < workers.len() {
        if workers[index].is_finished() {
            let worker = workers.swap_remove(index);
            worker.join().map_err(|_| DaemonErrorV1::WorkerFailed)?;
        } else {
            index += 1;
        }
    }
    Ok(())
}

fn join_workers(workers: Vec<JoinHandle<()>>) -> Result<(), DaemonErrorV1> {
    for worker in workers {
        worker.join().map_err(|_| DaemonErrorV1::WorkerFailed)?;
    }
    Ok(())
}

enum RequestReadV1 {
    Complete(Zeroizing<Vec<u8>>),
    HeadTooLarge,
    BodyTooLarge,
}

enum HttpResponseV1 {
    Ready,
    AuthenticatedHealth {
        head_only: bool,
    },
    AuthenticatedStatus {
        head_only: bool,
    },
    AuthenticatedProductReadRejected {
        head_only: bool,
    },
    ConsoleAsset {
        asset: Phase9ConsoleAssetV1,
        head_only: bool,
    },
    GatewayContractNegotiated {
        version: ContractVersion,
        head_only: bool,
    },
    GatewayContractVersionRejected {
        error: ContractVersionError,
        head_only: bool,
    },
    SessionIssued {
        session: LocalSessionRecordV1,
        cookie_headers: LocalBrowserSessionCookieHeadersV1,
    },
    SessionRotated(LocalBrowserSessionRotationResponseV1),
    PasswordRotated {
        rotation: LocalPasswordRotationResultV1,
        cookie_headers: LocalBrowserSessionCookieHeadersV1,
    },
    IdentityCreated(LocalIdentityCredentialRecordV1),
    IdentityCreationRejected,
    IdentityDisabled(LocalIdentityDisablementResultV1),
    IdentityDisablementRejected,
    IdentityEventsRead {
        identity_ref: String,
        events: Vec<LocalIdentityEventV1>,
        head_only: bool,
    },
    IdentityEventReadRejected {
        head_only: bool,
    },
    SessionEventsRead {
        session_id: String,
        events: Vec<LocalSessionEventV1>,
        head_only: bool,
    },
    SessionEventReadRejected {
        head_only: bool,
    },
    ApprovalRequestCreated(ApprovalRequestStoreWriteV1),
    ApprovalRequestRejected,
    ApprovalDecisionRecorded(ApprovalDecisionStoreWriteV1),
    ApprovalDecisionRejected,
    ExecutionAuthorizationIssued(LocalBrowserPhase7AuthorizationIssueResponseV1),
    ExecutionAuthorizationRead(Phase7ExecutionAuthorizationRecordV1),
    ExecutionAuthorizationTransitioned(Phase7ExecutionAuthorizationTransitionV1),
    RuntimeCompositionExecuted(Phase8RuntimeCompositionWriteV1),
    OperationRead(Phase8OperationReadbackV1),
    OperationAttemptRead(Phase8OperationAttemptReadbackV1),
    OperationReconciled(Phase8OperationReadbackV1),
    RuntimeCompositionRejected,
    RuntimeCompositionCapacityRejected,
    SessionFamilyRevoked {
        revocation: LocalSessionFamilyRevocationV1,
        cookie_headers: LocalBrowserSessionCookieHeadersV1,
    },
    AuthenticatedSession {
        session: LocalSessionRecordV1,
        head_only: bool,
    },
    SessionReadRejected {
        head_only: bool,
    },
    SessionRotationRejected,
    SessionFamilySignOutRejected,
    IdentityPasswordRotationRejected,
    BadRequest,
    SessionIssueRejected,
    Forbidden,
    NotFound,
    MethodNotAllowed {
        allow: &'static str,
    },
    RequestHeadTooLarge,
    RequestBodyTooLarge,
    ServiceUnavailable,
}

struct ClassifiedHttpResponseV1 {
    response: HttpResponseV1,
    accepted_contract_version: Option<ContractVersion>,
}

impl ClassifiedHttpResponseV1 {
    const fn unversioned(response: HttpResponseV1) -> Self {
        Self {
            response,
            accepted_contract_version: None,
        }
    }

    const fn versioned(response: HttpResponseV1, version: ContractVersion) -> Self {
        Self {
            response,
            accepted_contract_version: Some(version),
        }
    }
}

fn read_http_request_v1(stream: &mut TcpStream) -> Result<RequestReadV1, ()> {
    let mut request = Zeroizing::new(Vec::with_capacity(1024));
    let mut buffer = [0_u8; 512];
    loop {
        let count = stream.read(&mut buffer).map_err(|_| ())?;
        if count == 0 {
            return Ok(RequestReadV1::Complete(request));
        }
        request.extend_from_slice(&buffer[..count]);
        let Some(head_end) = request_head_end_v1(&request) else {
            if request.len() > MAX_REQUEST_HEAD_BYTES_V1 {
                return Ok(RequestReadV1::HeadTooLarge);
            }
            continue;
        };
        if head_end > MAX_REQUEST_HEAD_BYTES_V1 {
            return Ok(RequestReadV1::HeadTooLarge);
        }
        let Ok(parsed) = parse_request_head_v1(&request[..head_end]) else {
            return Ok(RequestReadV1::Complete(request));
        };
        let body_length = parsed.content_length.unwrap_or(0);
        if body_length > request_body_limit_v1(parsed.target) {
            return Ok(RequestReadV1::BodyTooLarge);
        }
        let Some(expected_length) = head_end.checked_add(body_length) else {
            return Ok(RequestReadV1::BodyTooLarge);
        };
        if request.len() >= expected_length {
            return Ok(RequestReadV1::Complete(request));
        }
    }
}

fn request_head_end_v1(request: &[u8]) -> Option<usize> {
    request
        .windows(4)
        .position(|window| window == b"\r\n\r\n")
        .map(|index| index + 4)
}

#[derive(Clone, Copy)]
struct ParsedRequestHeadV1<'a> {
    method: &'a str,
    target: &'a str,
    host: &'a str,
    origin: Option<&'a str>,
    fetch_site: Option<&'a str>,
    content_type: Option<&'a str>,
    content_length: Option<usize>,
    cookie: Option<&'a str>,
    csrf: Option<&'a str>,
    session_issue_intent: Option<&'a str>,
    contract_version: Option<&'a str>,
    forwarded_present: bool,
}

struct ParsedRequestHeadersV1<'a> {
    host: &'a str,
    origin: Option<&'a str>,
    fetch_site: Option<&'a str>,
    content_type: Option<&'a str>,
    content_length: Option<usize>,
    cookie: Option<&'a str>,
    csrf: Option<&'a str>,
    session_issue_intent: Option<&'a str>,
    contract_version: Option<&'a str>,
    forwarded_present: bool,
}

fn parse_request_headers_v1<'a>(
    lines: impl Iterator<Item = &'a str>,
) -> Result<ParsedRequestHeadersV1<'a>, ()> {
    let mut header_names = Vec::with_capacity(16);
    let mut headers = ParsedRequestHeadersV1 {
        host: "",
        origin: None,
        fetch_site: None,
        content_type: None,
        content_length: None,
        cookie: None,
        csrf: None,
        session_issue_intent: None,
        contract_version: None,
        forwarded_present: false,
    };
    for (index, line) in lines.enumerate() {
        if index >= MAX_HEADER_COUNT_V1 {
            return Err(());
        }
        let (name, value) = line.split_once(':').ok_or(())?;
        if name.is_empty()
            || !name.bytes().all(is_header_name_byte)
            || value
                .bytes()
                .any(|byte| byte != b'\t' && !(b' '..=b'~').contains(&byte))
            || header_names
                .iter()
                .any(|existing: &&str| existing.eq_ignore_ascii_case(name))
        {
            return Err(());
        }
        header_names.push(name);
        let value = value.trim_matches([' ', '\t']);
        if name.eq_ignore_ascii_case("transfer-encoding") {
            return Err(());
        }
        if name.eq_ignore_ascii_case("host") {
            headers.host = value;
        } else if name.eq_ignore_ascii_case("origin") {
            headers.origin = Some(value);
        } else if name.eq_ignore_ascii_case("sec-fetch-site") {
            headers.fetch_site = Some(value);
        } else if name.eq_ignore_ascii_case("content-type") {
            headers.content_type = Some(value);
        } else if name.eq_ignore_ascii_case("content-length") {
            headers.content_length = Some(parse_content_length_v1(value).ok_or(())?);
        } else if name.eq_ignore_ascii_case("cookie") {
            headers.cookie = Some(value);
        } else if name.eq_ignore_ascii_case(LOCAL_CSRF_HEADER_NAME_V1) {
            headers.csrf = Some(value);
        } else if name.eq_ignore_ascii_case(LOCAL_SESSION_ISSUE_INTENT_HEADER_NAME_V1) {
            headers.session_issue_intent = Some(value);
        } else if name.eq_ignore_ascii_case(GATEWAY_CONTRACT_VERSION_HEADER_NAME_V1) {
            headers.contract_version = Some(value);
        } else if name.eq_ignore_ascii_case("forwarded")
            || name.eq_ignore_ascii_case("x-forwarded-host")
            || name.eq_ignore_ascii_case("x-forwarded-proto")
            || name.eq_ignore_ascii_case("x-forwarded-for")
        {
            headers.forwarded_present = true;
        }
    }
    if headers.host.is_empty() {
        return Err(());
    }
    Ok(headers)
}

fn parse_request_head_v1(request: &[u8]) -> Result<ParsedRequestHeadV1<'_>, ()> {
    if request.is_empty() || request.len() > MAX_REQUEST_HEAD_BYTES_V1 {
        return Err(());
    }
    let Ok(request) = std::str::from_utf8(request) else {
        return Err(());
    };
    let Some(head_end) = request.find("\r\n\r\n") else {
        return Err(());
    };
    if head_end + 4 != request.len() {
        return Err(());
    }
    let mut lines = request[..head_end].split("\r\n");
    let Some(request_line) = lines.next() else {
        return Err(());
    };
    if !request_line
        .bytes()
        .all(|byte| byte == b' ' || (b'!'..=b'~').contains(&byte))
    {
        return Err(());
    }
    let mut parts = request_line.split(' ');
    let (Some(method), Some(target), Some(version), None) =
        (parts.next(), parts.next(), parts.next(), parts.next())
    else {
        return Err(());
    };
    if version != "HTTP/1.1"
        || target.is_empty()
        || !target.starts_with('/')
        || target.contains('#')
    {
        return Err(());
    }

    let headers = parse_request_headers_v1(lines)?;
    Ok(ParsedRequestHeadV1 {
        method,
        target,
        host: headers.host,
        origin: headers.origin,
        fetch_site: headers.fetch_site,
        content_type: headers.content_type,
        content_length: headers.content_length,
        cookie: headers.cookie,
        csrf: headers.csrf,
        session_issue_intent: headers.session_issue_intent,
        contract_version: headers.contract_version,
        forwarded_present: headers.forwarded_present,
    })
}

fn parse_content_length_v1(value: &str) -> Option<usize> {
    if value == "0" || (!value.starts_with('0') && value.bytes().all(|byte| byte.is_ascii_digit()))
    {
        value.parse().ok()
    } else {
        None
    }
}

struct ParsedHttpRequestV1<'a> {
    head: ParsedRequestHeadV1<'a>,
    body: &'a [u8],
}

fn parse_http_request_v1(request: &[u8]) -> Result<ParsedHttpRequestV1<'_>, ()> {
    let head_end = request_head_end_v1(request).ok_or(())?;
    if head_end > MAX_REQUEST_HEAD_BYTES_V1 {
        return Err(());
    }
    let head = parse_request_head_v1(&request[..head_end])?;
    let body_length = head.content_length.unwrap_or(0);
    if body_length > request_body_limit_v1(head.target)
        || request.len().checked_sub(head_end) != Some(body_length)
    {
        return Err(());
    }
    Ok(ParsedHttpRequestV1 {
        head,
        body: &request[head_end..],
    })
}

fn request_body_limit_v1(target: &str) -> usize {
    if target == LOCAL_EXECUTION_AUTHORIZATIONS_PATH_V1
        || target.starts_with(LOCAL_EXECUTION_AUTHORIZATIONS_PREFIX_V1)
        || target.starts_with(LOCAL_OPERATIONS_PREFIX_V1)
    {
        PHASE8_MAX_REQUEST_BODY_BYTES_V1
    } else {
        MAX_REQUEST_BODY_BYTES_V1
    }
}

/// Parses one strict, duplicate-refused browser request head without opening a
/// route or consulting product authority.
///
/// Transport parsing rejects body bytes, transfer encoding, duplicate headers,
/// malformed lengths, remote peers, Host/origin drift, missing same-origin
/// fetch metadata, non-JSON mutations, and invalid cookie/CSRF transport.
/// Returned secrets still require hash-only session-store verification.
///
/// # Errors
///
/// Maps every parser and browser-preflight denial to one generic public-safe
/// error.
pub fn parse_local_browser_transport_request_v1(
    request: &[u8],
    peer_address: IpAddr,
    bound_address: SocketAddr,
) -> Result<LocalBrowserTransportRequestV1<'_>, LocalBrowserTransportErrorV1> {
    let parsed_request =
        parse_http_request_v1(request).map_err(|()| LocalBrowserTransportErrorV1::Rejected)?;
    if !parsed_request.body.is_empty() {
        return Err(LocalBrowserTransportErrorV1::Rejected);
    }
    parse_local_browser_transport_head_v1(parsed_request.head, peer_address, bound_address)
}

fn parse_local_browser_transport_head_v1(
    parsed: ParsedRequestHeadV1<'_>,
    peer_address: IpAddr,
    bound_address: SocketAddr,
) -> Result<LocalBrowserTransportRequestV1<'_>, LocalBrowserTransportErrorV1> {
    let expected_origin =
        LocalBrowserOriginV1::loopback_http(bound_address.ip(), bound_address.port())
            .map_err(|_| LocalBrowserTransportErrorV1::Rejected)?;
    let preflight = LocalBrowserRequestV1 {
        peer_address,
        method: parsed.method,
        host: parsed.host,
        origin: parsed.origin,
        fetch_site: parsed.fetch_site,
        content_type: parsed.content_type,
        csrf_verified: false,
    };
    match evaluate_local_browser_request_v1(&expected_origin, &preflight) {
        Ok(LocalBrowserRequestClassV1::ReadOnly) => {}
        Err(LocalBrowserRequestErrorV1::CsrfRejected)
            if matches!(parsed.method, "POST" | "PUT" | "PATCH" | "DELETE") => {}
        Ok(LocalBrowserRequestClassV1::MutationPreflight) | Err(_) => {
            return Err(LocalBrowserTransportErrorV1::Rejected);
        }
    }
    let auth = parse_local_browser_auth_transport_v1(parsed.method, parsed.cookie, parsed.csrf)
        .map_err(|_| LocalBrowserTransportErrorV1::Rejected)?;
    Ok(LocalBrowserTransportRequestV1 {
        expected_origin,
        request: preflight,
        auth,
        target: parsed.target,
    })
}

fn classify_request(
    request_bytes: &[u8],
    peer_address: IpAddr,
    context: GatewayRuntimeContextV1<'_>,
) -> ClassifiedHttpResponseV1 {
    let Ok(parsed_request) = parse_http_request_v1(request_bytes) else {
        return ClassifiedHttpResponseV1::unversioned(HttpResponseV1::BadRequest);
    };
    let request = parsed_request.head;
    if let Some(response) = classify_phase9_console_route_v1(
        request,
        parsed_request.body,
        context.bound_address,
        context.phase9_console,
    ) {
        return ClassifiedHttpResponseV1::unversioned(response);
    }
    if request.target == GATEWAY_ROOT_PATH_V1 {
        return ClassifiedHttpResponseV1::unversioned(classify_gateway_contract_negotiation_v1(
            request,
            parsed_request.body,
            context.bound_address,
        ));
    }
    if !request.target.starts_with("/v1/") {
        return ClassifiedHttpResponseV1::unversioned(classify_readiness_or_unknown_v1(
            request,
            parsed_request.body,
            context.bound_address,
        ));
    }
    if !host_matches_bound_address(request.host, context.bound_address) {
        return ClassifiedHttpResponseV1::unversioned(HttpResponseV1::BadRequest);
    }
    let head_only = request.method == "HEAD";
    let version = match validate_gateway_contract_version_v1(request.contract_version) {
        Ok(version) => version,
        Err(error) => {
            return ClassifiedHttpResponseV1::unversioned(
                HttpResponseV1::GatewayContractVersionRejected { error, head_only },
            );
        }
    };
    ClassifiedHttpResponseV1::versioned(
        classify_versioned_gateway_route_v1(
            request_bytes,
            request,
            parsed_request.body,
            peer_address,
            context,
        ),
        version,
    )
}

fn classify_phase9_console_route_v1(
    request: ParsedRequestHeadV1<'_>,
    body: &[u8],
    bound_address: SocketAddr,
    console: Option<&Phase9ConsoleRuntimeV1>,
) -> Option<HttpResponseV1> {
    let asset = console?.assets.get(request.target)?;
    let expected_origin = format!("http://{bound_address}");
    if request.host != bound_address.to_string()
        || request.forwarded_present
        || !body.is_empty()
        || request.content_length.is_some_and(|length| length != 0)
        || request.content_type.is_some()
        || request
            .origin
            .is_some_and(|origin| origin != expected_origin)
        || request
            .fetch_site
            .is_some_and(|site| !matches!(site, "same-origin" | "none"))
    {
        return Some(HttpResponseV1::BadRequest);
    }
    if !matches!(request.method, "GET" | "HEAD") {
        return Some(HttpResponseV1::MethodNotAllowed { allow: "GET, HEAD" });
    }
    Some(HttpResponseV1::ConsoleAsset {
        asset: asset.clone(),
        head_only: request.method == "HEAD",
    })
}

#[allow(clippy::too_many_lines)] // Explicit route ordering keeps authority checks reviewable.
fn classify_versioned_gateway_route_v1(
    request_bytes: &[u8],
    request: ParsedRequestHeadV1<'_>,
    body: &[u8],
    peer_address: IpAddr,
    context: GatewayRuntimeContextV1<'_>,
) -> HttpResponseV1 {
    if let Some(response) = classify_authenticated_product_read_route_v1(
        request_bytes,
        request,
        body,
        peer_address,
        context.bound_address,
        context.store,
    ) {
        return response;
    }
    if let Some(response) = classify_phase8_runtime_route_v1(
        request_bytes,
        request,
        body,
        peer_address,
        context.bound_address,
        context.store,
        context.phase8_runtime,
        context.consequential_dispatch_active,
    ) {
        return response;
    }
    if request.target == LOCAL_APPROVAL_REQUEST_GATEWAY_PATH_V1 {
        return classify_local_approval_request_v1(
            request,
            body,
            peer_address,
            context.bound_address,
            context.store,
            context.authentication_limiter,
        );
    }
    if let Some(approval_request_id) = local_approval_request_id_from_target_v1(request.target) {
        return classify_local_approval_decision_v1(
            request,
            body,
            approval_request_id,
            peer_address,
            context.bound_address,
            context.store,
            context.authentication_limiter,
        );
    }
    if request.target == LOCAL_IDENTITIES_GATEWAY_PATH_V1 {
        return classify_local_identity_creation_v1(
            request,
            body,
            peer_address,
            context.bound_address,
            context.store,
            context.authentication_limiter,
        );
    }
    match local_identity_event_ref_from_target_v1(request.target) {
        Ok(Some(target_identity_ref)) => {
            return classify_local_identity_event_read_v1(
                request_bytes,
                request,
                body,
                target_identity_ref,
                peer_address,
                context.bound_address,
                context.store,
            );
        }
        Err(()) => {
            if matches!(request.method, "GET" | "HEAD") {
                return HttpResponseV1::IdentityEventReadRejected {
                    head_only: request.method == "HEAD",
                };
            }
            return HttpResponseV1::MethodNotAllowed { allow: "GET, HEAD" };
        }
        Ok(None) => {}
    }
    if let Some(response) = classify_local_session_event_route_v1(
        request_bytes,
        request,
        body,
        peer_address,
        context.bound_address,
        context.store,
    ) {
        return response;
    }
    if let Some(target_identity_ref) = request
        .target
        .strip_prefix(LOCAL_IDENTITY_GATEWAY_PREFIX_V1)
    {
        return classify_local_identity_disablement_v1(
            request_bytes,
            request,
            target_identity_ref,
            peer_address,
            context.bound_address,
            context.store,
        );
    }
    if request.target == LOCAL_PASSWORD_GATEWAY_PATH_V1 {
        return classify_local_password_rotation_v1(
            request,
            body,
            peer_address,
            context.bound_address,
            context.store,
            context.authentication_limiter,
        );
    }
    if request.target == LOCAL_SESSION_GATEWAY_PATH_V1 {
        return classify_local_session_gateway_v1(
            request_bytes,
            request,
            body,
            peer_address,
            context.bound_address,
            context.store,
            context.authentication_limiter,
        );
    }
    classify_readiness_or_unknown_v1(request, body, context.bound_address)
}

fn classify_authenticated_product_read_route_v1(
    request_bytes: &[u8],
    request: ParsedRequestHeadV1<'_>,
    body: &[u8],
    peer_address: IpAddr,
    bound_address: SocketAddr,
    store: &Arc<Mutex<SqliteStore>>,
) -> Option<HttpResponseV1> {
    let response = match request.target {
        AUTHENTICATED_HEALTH_PATH_V1 => HttpResponseV1::AuthenticatedHealth {
            head_only: request.method == "HEAD",
        },
        AUTHENTICATED_STATUS_PATH_V1 => HttpResponseV1::AuthenticatedStatus {
            head_only: request.method == "HEAD",
        },
        target
            if target.starts_with(AUTHENTICATED_HEALTH_PATH_V1)
                || target.starts_with(AUTHENTICATED_STATUS_PATH_V1) =>
        {
            return Some(HttpResponseV1::BadRequest);
        }
        _ => return None,
    };
    if !matches!(request.method, "GET" | "HEAD") {
        return Some(HttpResponseV1::MethodNotAllowed { allow: "GET, HEAD" });
    }
    let head_only = request.method == "HEAD";
    if !body.is_empty()
        || request.content_length.is_some_and(|length| length != 0)
        || request.content_type.is_some()
        || request.forwarded_present
    {
        return Some(HttpResponseV1::AuthenticatedProductReadRejected { head_only });
    }
    let authorized =
        parse_local_browser_transport_request_v1(request_bytes, peer_address, bound_address)
            .and_then(|transport| {
                let mut store = store
                    .lock()
                    .map_err(|_| LocalBrowserTransportErrorV1::Rejected)?;
                authorize_local_browser_transport_request_v1(&mut store, &transport)
            });
    match authorized {
        Ok(authorized)
            if authorized.target == request.target
                && authorized.class == LocalBrowserRequestClassV1::ReadOnly
                && authorized
                    .session
                    .role
                    .allows_control(LocalControlPermissionV1::ReadEvidence) =>
        {
            Some(response)
        }
        Ok(_) | Err(_) => Some(HttpResponseV1::AuthenticatedProductReadRejected { head_only }),
    }
}

#[derive(Clone, Copy)]
enum Phase8RuntimeRouteV1<'a> {
    AuthorizationIssue,
    AuthorizationRead(&'a str),
    AuthorizationCancel(&'a str),
    AuthorizationRevoke(&'a str),
    AuthorizationExecute(&'a str),
    OperationRead(&'a str),
    OperationAttemptRead(&'a str, &'a str),
    OperationReconcile(&'a str),
}

struct Phase8DispatchAdmissionV1 {
    active: Arc<AtomicBool>,
}

impl Phase8DispatchAdmissionV1 {
    fn try_acquire(active: &Arc<AtomicBool>) -> Option<Self> {
        active
            .compare_exchange(false, true, Ordering::AcqRel, Ordering::Acquire)
            .ok()
            .map(|_| Self {
                active: Arc::clone(active),
            })
    }
}

impl Drop for Phase8DispatchAdmissionV1 {
    fn drop(&mut self) {
        self.active.store(false, Ordering::Release);
    }
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Phase8AuthorizationIssueBodyV1 {
    project_ref: String,
    approval_decision_id: String,
    operation_idempotency_key: String,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Phase8AuthorizationScopeBodyV1 {
    project_ref: String,
    resource_ref: String,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Phase8ExecuteBodyV1 {
    project_ref: String,
    resource_ref: String,
    operation_id: String,
    idempotency_key: String,
    capability: Zeroizing<String>,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Phase8ReconcileBodyV1 {}

fn parse_phase8_runtime_route_v1(target: &str) -> Result<Option<Phase8RuntimeRouteV1<'_>>, ()> {
    if target == LOCAL_EXECUTION_AUTHORIZATIONS_PATH_V1 {
        return Ok(Some(Phase8RuntimeRouteV1::AuthorizationIssue));
    }
    if let Some(remainder) = target.strip_prefix(LOCAL_EXECUTION_AUTHORIZATIONS_PREFIX_V1) {
        let segments = remainder.split('/').collect::<Vec<_>>();
        return match segments.as_slice() {
            [authorization_id] if valid_route_id_v1(authorization_id, "xau_") => Ok(Some(
                Phase8RuntimeRouteV1::AuthorizationRead(authorization_id),
            )),
            [authorization_id, "cancel"] if valid_route_id_v1(authorization_id, "xau_") => Ok(
                Some(Phase8RuntimeRouteV1::AuthorizationCancel(authorization_id)),
            ),
            [authorization_id, "revoke"] if valid_route_id_v1(authorization_id, "xau_") => Ok(
                Some(Phase8RuntimeRouteV1::AuthorizationRevoke(authorization_id)),
            ),
            [authorization_id, "execute"] if valid_route_id_v1(authorization_id, "xau_") => Ok(
                Some(Phase8RuntimeRouteV1::AuthorizationExecute(authorization_id)),
            ),
            _ => Err(()),
        };
    }
    if let Some(remainder) = target.strip_prefix(LOCAL_OPERATIONS_PREFIX_V1) {
        let segments = remainder.split('/').collect::<Vec<_>>();
        return match segments.as_slice() {
            [operation_id] if valid_route_id_v1(operation_id, "opn_") => {
                Ok(Some(Phase8RuntimeRouteV1::OperationRead(operation_id)))
            }
            [operation_id, "reconcile"] if valid_route_id_v1(operation_id, "opn_") => {
                Ok(Some(Phase8RuntimeRouteV1::OperationReconcile(operation_id)))
            }
            [operation_id, "attempts", attempt_id]
                if valid_route_id_v1(operation_id, "opn_")
                    && valid_route_id_v1(attempt_id, "opa_") =>
            {
                Ok(Some(Phase8RuntimeRouteV1::OperationAttemptRead(
                    operation_id,
                    attempt_id,
                )))
            }
            _ => Err(()),
        };
    }
    Ok(None)
}

fn valid_route_id_v1(value: &str, prefix: &str) -> bool {
    value.starts_with(prefix)
        && value.len() > prefix.len()
        && !value
            .bytes()
            .any(|byte| matches!(byte, b'/' | b'?' | b'#' | b'%'))
}

#[allow(clippy::too_many_arguments, clippy::too_many_lines)]
fn classify_phase8_runtime_route_v1(
    request_bytes: &[u8],
    request: ParsedRequestHeadV1<'_>,
    body: &[u8],
    peer_address: IpAddr,
    bound_address: SocketAddr,
    store: &Arc<Mutex<SqliteStore>>,
    phase8_runtime: Option<&Phase8DaemonRuntimeV1>,
    consequential_dispatch_active: &Arc<AtomicBool>,
) -> Option<HttpResponseV1> {
    let route = match parse_phase8_runtime_route_v1(request.target) {
        Ok(Some(route)) => route,
        Ok(None) => return None,
        Err(()) => return Some(HttpResponseV1::RuntimeCompositionRejected),
    };
    if request.host != bound_address.to_string() {
        return Some(HttpResponseV1::RuntimeCompositionRejected);
    }
    let expected_method = match route {
        Phase8RuntimeRouteV1::AuthorizationRead(_)
        | Phase8RuntimeRouteV1::OperationRead(_)
        | Phase8RuntimeRouteV1::OperationAttemptRead(_, _) => "GET",
        _ => "POST",
    };
    if request.method != expected_method {
        return Some(HttpResponseV1::MethodNotAllowed {
            allow: expected_method,
        });
    }
    if body.len() > PHASE8_MAX_REQUEST_BODY_BYTES_V1 {
        return Some(HttpResponseV1::RequestBodyTooLarge);
    }
    let response = match route {
        Phase8RuntimeRouteV1::AuthorizationIssue => {
            let transport =
                parse_local_browser_transport_head_v1(request, peer_address, bound_address);
            let input = serde_json::from_slice::<Phase8AuthorizationIssueBodyV1>(body);
            let (Ok(transport), Ok(input)) = (transport, input) else {
                return Some(HttpResponseV1::RuntimeCompositionRejected);
            };
            let Ok(mut store) = store.lock() else {
                return Some(HttpResponseV1::RuntimeCompositionRejected);
            };
            match issue_local_browser_phase7_execution_authorization_v1(
                &mut store,
                &transport,
                &LocalBrowserPhase7AuthorizationIssueRequestV1 {
                    project_ref: &input.project_ref,
                    approval_decision_id: &input.approval_decision_id,
                    operation_idempotency_key: &input.operation_idempotency_key,
                },
            ) {
                Ok(issued) => HttpResponseV1::ExecutionAuthorizationIssued(issued),
                Err(_) => HttpResponseV1::RuntimeCompositionRejected,
            }
        }
        Phase8RuntimeRouteV1::AuthorizationRead(authorization_id) => {
            if !body.is_empty() {
                return Some(HttpResponseV1::RuntimeCompositionRejected);
            }
            let Ok(transport) = parse_local_browser_transport_request_v1(
                request_bytes,
                peer_address,
                bound_address,
            ) else {
                return Some(HttpResponseV1::RuntimeCompositionRejected);
            };
            let Ok(mut store) = store.lock() else {
                return Some(HttpResponseV1::RuntimeCompositionRejected);
            };
            match read_phase8_authorization_route_v1(&mut store, &transport, authorization_id) {
                Ok(record) => HttpResponseV1::ExecutionAuthorizationRead(record),
                Err(_) => HttpResponseV1::RuntimeCompositionRejected,
            }
        }
        Phase8RuntimeRouteV1::AuthorizationCancel(authorization_id)
        | Phase8RuntimeRouteV1::AuthorizationRevoke(authorization_id) => {
            let revoke = matches!(route, Phase8RuntimeRouteV1::AuthorizationRevoke(_));
            let transport =
                parse_local_browser_transport_head_v1(request, peer_address, bound_address);
            let input = serde_json::from_slice::<Phase8AuthorizationScopeBodyV1>(body);
            let (Ok(transport), Ok(input)) = (transport, input) else {
                return Some(HttpResponseV1::RuntimeCompositionRejected);
            };
            let transition = Phase7ExecutionAuthorizationTransitionInputV1 {
                project_ref: &input.project_ref,
                resource_ref: &input.resource_ref,
                authorization_id,
            };
            let Ok(mut store) = store.lock() else {
                return Some(HttpResponseV1::RuntimeCompositionRejected);
            };
            let result = if revoke {
                revoke_local_browser_phase7_execution_authorization_v1(
                    &mut store,
                    &transport,
                    &transition,
                )
            } else {
                cancel_local_browser_phase7_execution_authorization_v1(
                    &mut store,
                    &transport,
                    &transition,
                )
            };
            match result {
                Ok(Some(value)) => HttpResponseV1::ExecutionAuthorizationTransitioned(value),
                _ => HttpResponseV1::RuntimeCompositionRejected,
            }
        }
        Phase8RuntimeRouteV1::AuthorizationExecute(authorization_id) => {
            let Some(runtime) = phase8_runtime else {
                return Some(HttpResponseV1::RuntimeCompositionRejected);
            };
            let Some(_admission) =
                Phase8DispatchAdmissionV1::try_acquire(consequential_dispatch_active)
            else {
                return Some(HttpResponseV1::RuntimeCompositionCapacityRejected);
            };
            let transport =
                parse_local_browser_transport_head_v1(request, peer_address, bound_address);
            let input = serde_json::from_slice::<Phase8ExecuteBodyV1>(body);
            let (Ok(transport), Ok(mut input)) = (transport, input) else {
                return Some(HttpResponseV1::RuntimeCompositionRejected);
            };
            let Ok(mut store) = store.lock() else {
                return Some(HttpResponseV1::RuntimeCompositionRejected);
            };
            match execute_phase8_authorization_route_v1(
                &mut store,
                &transport,
                authorization_id,
                &mut input,
                runtime,
            ) {
                Ok(value) => HttpResponseV1::RuntimeCompositionExecuted(value),
                Err(_) => HttpResponseV1::RuntimeCompositionRejected,
            }
        }
        Phase8RuntimeRouteV1::OperationRead(operation_id) => {
            if !body.is_empty() {
                return Some(HttpResponseV1::RuntimeCompositionRejected);
            }
            let Ok(transport) = parse_local_browser_transport_request_v1(
                request_bytes,
                peer_address,
                bound_address,
            ) else {
                return Some(HttpResponseV1::RuntimeCompositionRejected);
            };
            let Ok(mut store) = store.lock() else {
                return Some(HttpResponseV1::RuntimeCompositionRejected);
            };
            match read_phase8_operation_route_v1(&mut store, &transport, operation_id) {
                Ok(value) => HttpResponseV1::OperationRead(value),
                Err(_) => HttpResponseV1::RuntimeCompositionRejected,
            }
        }
        Phase8RuntimeRouteV1::OperationAttemptRead(operation_id, attempt_id) => {
            if !body.is_empty() {
                return Some(HttpResponseV1::RuntimeCompositionRejected);
            }
            let Ok(transport) = parse_local_browser_transport_request_v1(
                request_bytes,
                peer_address,
                bound_address,
            ) else {
                return Some(HttpResponseV1::RuntimeCompositionRejected);
            };
            let Ok(mut store) = store.lock() else {
                return Some(HttpResponseV1::RuntimeCompositionRejected);
            };
            match read_phase8_attempt_route_v1(&mut store, &transport, operation_id, attempt_id) {
                Ok(value) => HttpResponseV1::OperationAttemptRead(value),
                Err(_) => HttpResponseV1::RuntimeCompositionRejected,
            }
        }
        Phase8RuntimeRouteV1::OperationReconcile(operation_id) => {
            let Some(runtime) = phase8_runtime else {
                return Some(HttpResponseV1::RuntimeCompositionRejected);
            };
            let transport =
                parse_local_browser_transport_head_v1(request, peer_address, bound_address);
            let input = serde_json::from_slice::<Phase8ReconcileBodyV1>(body);
            let (Ok(transport), Ok(_)) = (transport, input) else {
                return Some(HttpResponseV1::RuntimeCompositionRejected);
            };
            let Ok(mut store) = store.lock() else {
                return Some(HttpResponseV1::RuntimeCompositionRejected);
            };
            match reconcile_phase8_operation_route_v1(&mut store, &transport, operation_id, runtime)
            {
                Ok(value) => HttpResponseV1::OperationReconciled(value),
                Err(_) => HttpResponseV1::RuntimeCompositionRejected,
            }
        }
    };
    Some(response)
}

fn read_phase8_authorization_route_v1(
    store: &mut SqliteStore,
    request: &LocalBrowserTransportRequestV1<'_>,
    authorization_id: &str,
) -> Result<Phase7ExecutionAuthorizationRecordV1, LocalBrowserTransportErrorV1> {
    let authorized = authorize_local_browser_transport_request_v1(store, request)?;
    if authorized.class != LocalBrowserRequestClassV1::ReadOnly
        || !authorized
            .session
            .role
            .allows_control(LocalControlPermissionV1::ReadEvidence)
    {
        return Err(LocalBrowserTransportErrorV1::Rejected);
    }
    let (project_ref, resource_ref) = store
        .read_phase8_execution_authorization_scope_v1(authorization_id)
        .map_err(|_| LocalBrowserTransportErrorV1::Rejected)?
        .ok_or(LocalBrowserTransportErrorV1::Rejected)?;
    store
        .read_phase7_execution_authorization_v1(&project_ref, &resource_ref, authorization_id)
        .map_err(|_| LocalBrowserTransportErrorV1::Rejected)?
        .ok_or(LocalBrowserTransportErrorV1::Rejected)
}

fn derive_phase8_execution_request_v1(
    store: &SqliteStore,
    authorization: &Phase7ExecutionAuthorizationRecordV1,
) -> Result<DerivedExecutionRequestV1, LocalBrowserTransportErrorV1> {
    let attempt = store
        .read_phase7_authorization_attempt_v1(
            &authorization.project_ref,
            &authorization.resource_ref,
            &authorization.authorization_attempt_id,
        )
        .map_err(|_| LocalBrowserTransportErrorV1::Rejected)?
        .ok_or(LocalBrowserTransportErrorV1::Rejected)?;
    let packet = store
        .read_packet_envelope_for_resource_v1(
            &authorization.project_ref,
            &authorization.resource_ref,
            &authorization.packet_id,
        )
        .map_err(|_| LocalBrowserTransportErrorV1::Rejected)?
        .ok_or(LocalBrowserTransportErrorV1::Rejected)?;
    let derived = derive_execution_request_v1(&ExecutionRequestV1Input {
        packet: &packet.packet,
        packet_sha256: &attempt.packet_sha256,
        policy_decision_id: &attempt.policy_decision_id,
        approval_request_id: &attempt.approval_request_id,
        approval_decision_id: &attempt.approval_decision_id,
        requester_ref: &attempt.requester_ref,
        requester_session_ref: &attempt.requester_session_ref,
        approver_ref: &attempt.approver_ref,
        approver_session_ref: &attempt.approver_session_ref,
        prepared_at: &attempt.requested_at,
        expires_at: &attempt.expires_at,
    })
    .map_err(|_| LocalBrowserTransportErrorV1::Rejected)?;
    if derived.action_digest != authorization.action_digest
        || derived.target_digest != authorization.target_digest
        || derived.configuration_digest != authorization.configuration_digest
        || derived.executable_digest != authorization.executable_digest
    {
        return Err(LocalBrowserTransportErrorV1::Rejected);
    }
    Ok(derived)
}

fn execute_phase8_authorization_route_v1(
    store: &mut SqliteStore,
    request: &LocalBrowserTransportRequestV1<'_>,
    authorization_id: &str,
    input: &mut Phase8ExecuteBodyV1,
    runtime: &Phase8DaemonRuntimeV1,
) -> Result<Phase8RuntimeCompositionWriteV1, LocalBrowserTransportErrorV1> {
    let authorized = authorize_local_browser_transport_request_v1(store, request)?;
    if authorized.class != LocalBrowserRequestClassV1::MutationPreflight
        || !authorized
            .session
            .role
            .allows_control(LocalControlPermissionV1::RequestAction)
    {
        return Err(LocalBrowserTransportErrorV1::Rejected);
    }
    let authorization = store
        .read_phase7_execution_authorization_v1(
            &input.project_ref,
            &input.resource_ref,
            authorization_id,
        )
        .map_err(|_| LocalBrowserTransportErrorV1::Rejected)?
        .ok_or(LocalBrowserTransportErrorV1::Rejected)?;
    if authorization.operation_id != input.operation_id {
        return Err(LocalBrowserTransportErrorV1::Rejected);
    }
    let derived = derive_phase8_execution_request_v1(store, &authorization)?;
    let capability = Phase7CapabilitySecretV1::take_from_canonical_wire_v1(&mut input.capability)
        .map_err(|_| LocalBrowserTransportErrorV1::Rejected)?;
    let csrf = request
        .raw_csrf_token()
        .ok_or(LocalBrowserTransportErrorV1::Rejected)?;
    store
        .execute_phase8_runtime_composition_v1(
            &Phase8RuntimeCompositionInputV1 {
                redemption: Phase7CapabilityRedemptionInputV1 {
                    project_ref: &input.project_ref,
                    resource_ref: &input.resource_ref,
                    authorization_id,
                    operation_id: &input.operation_id,
                    idempotency_key: &input.idempotency_key,
                },
                derived_request: &derived,
                disposable_root: &runtime.disposable_git_root,
                git_executable: &runtime.git_executable,
            },
            capability,
            request.raw_session_token(),
            csrf,
        )
        .map_err(|_| LocalBrowserTransportErrorV1::Rejected)
}

fn read_phase8_operation_route_v1(
    store: &mut SqliteStore,
    request: &LocalBrowserTransportRequestV1<'_>,
    operation_id: &str,
) -> Result<Phase8OperationReadbackV1, LocalBrowserTransportErrorV1> {
    let authorized = authorize_local_browser_transport_request_v1(store, request)?;
    if authorized.class != LocalBrowserRequestClassV1::ReadOnly
        || !authorized
            .session
            .role
            .allows_control(LocalControlPermissionV1::ReadEvidence)
    {
        return Err(LocalBrowserTransportErrorV1::Rejected);
    }
    store
        .read_phase8_operation_v1(operation_id)
        .map_err(|_| LocalBrowserTransportErrorV1::Rejected)?
        .ok_or(LocalBrowserTransportErrorV1::Rejected)
}

fn read_phase8_attempt_route_v1(
    store: &mut SqliteStore,
    request: &LocalBrowserTransportRequestV1<'_>,
    operation_id: &str,
    attempt_id: &str,
) -> Result<Phase8OperationAttemptReadbackV1, LocalBrowserTransportErrorV1> {
    let authorized = authorize_local_browser_transport_request_v1(store, request)?;
    if authorized.class != LocalBrowserRequestClassV1::ReadOnly
        || !authorized
            .session
            .role
            .allows_control(LocalControlPermissionV1::ReadEvidence)
    {
        return Err(LocalBrowserTransportErrorV1::Rejected);
    }
    store
        .read_phase8_operation_attempt_v1(operation_id, attempt_id)
        .map_err(|_| LocalBrowserTransportErrorV1::Rejected)?
        .ok_or(LocalBrowserTransportErrorV1::Rejected)
}

fn reconcile_phase8_operation_route_v1(
    store: &mut SqliteStore,
    request: &LocalBrowserTransportRequestV1<'_>,
    operation_id: &str,
    runtime: &Phase8DaemonRuntimeV1,
) -> Result<Phase8OperationReadbackV1, LocalBrowserTransportErrorV1> {
    let authorized = authorize_local_browser_transport_request_v1(store, request)?;
    if authorized.class != LocalBrowserRequestClassV1::MutationPreflight
        || !authorized
            .session
            .role
            .allows_control(LocalControlPermissionV1::RequestAction)
    {
        return Err(LocalBrowserTransportErrorV1::Rejected);
    }
    let operation = store
        .read_phase8_operation_v1(operation_id)
        .map_err(|_| LocalBrowserTransportErrorV1::Rejected)?
        .ok_or(LocalBrowserTransportErrorV1::Rejected)?;
    let authorization = store
        .read_phase7_execution_authorization_v1(
            &operation.project_ref,
            &operation.resource_ref,
            &operation.authorization_id,
        )
        .map_err(|_| LocalBrowserTransportErrorV1::Rejected)?
        .ok_or(LocalBrowserTransportErrorV1::Rejected)?;
    if authorized.session.role != LocalIdentityRoleV1::Owner
        && authorization.requester_ref != authorized.session.identity_ref
    {
        return Err(LocalBrowserTransportErrorV1::Rejected);
    }
    let derived = derive_phase8_execution_request_v1(store, &authorization)?;
    store
        .reconcile_phase8_runtime_composition_v1(
            operation_id,
            &derived,
            &runtime.disposable_git_root,
            &runtime.git_executable,
        )
        .map_err(|_| LocalBrowserTransportErrorV1::Rejected)
}

fn validate_gateway_contract_version_v1(
    input: Option<&str>,
) -> Result<ContractVersion, ContractVersionError> {
    input
        .ok_or(ContractVersionError::Required)
        .and_then(validate_contract_version)
        .and_then(|version| {
            if version == ContractVersion::V1_0 {
                Ok(version)
            } else {
                Err(ContractVersionError::Unsupported)
            }
        })
}

fn classify_gateway_contract_negotiation_v1(
    request: ParsedRequestHeadV1<'_>,
    body: &[u8],
    bound_address: SocketAddr,
) -> HttpResponseV1 {
    if !body.is_empty() || !host_matches_bound_address(request.host, bound_address) {
        return HttpResponseV1::BadRequest;
    }
    if !matches!(request.method, "GET" | "HEAD") {
        return HttpResponseV1::MethodNotAllowed { allow: "GET, HEAD" };
    }
    let head_only = request.method == "HEAD";
    let version = validate_gateway_contract_version_v1(request.contract_version);
    match version {
        Ok(version) => HttpResponseV1::GatewayContractNegotiated { version, head_only },
        Err(error) => HttpResponseV1::GatewayContractVersionRejected { error, head_only },
    }
}

fn local_approval_request_id_from_target_v1(target: &str) -> Option<&str> {
    let approval_request_id = target
        .strip_prefix(LOCAL_APPROVAL_REQUEST_GATEWAY_PREFIX_V1)?
        .strip_suffix(LOCAL_APPROVAL_DECISION_GATEWAY_SUFFIX_V1)?;
    (!approval_request_id.is_empty() && !approval_request_id.contains('/'))
        .then_some(approval_request_id)
}

fn local_identity_event_ref_from_target_v1(target: &str) -> Result<Option<&str>, ()> {
    let Some(remainder) = target.strip_prefix(LOCAL_IDENTITY_GATEWAY_PREFIX_V1) else {
        return Ok(None);
    };
    let Some(identity_ref) = remainder.strip_suffix(LOCAL_IDENTITY_EVENT_GATEWAY_SUFFIX_V1) else {
        return if remainder.contains(LOCAL_IDENTITY_EVENT_GATEWAY_SUFFIX_V1)
            || remainder.contains('%')
            || remainder.contains('?')
        {
            Err(())
        } else {
            Ok(None)
        };
    };
    let valid = is_valid_reference_v1(identity_ref)
        && identity_ref
            .strip_prefix("identity:human:")
            .is_some_and(|suffix| !suffix.is_empty())
        && !identity_ref
            .bytes()
            .any(|byte| matches!(byte, b'/' | b'?' | b'#' | b'%'));
    if valid {
        Ok(Some(identity_ref))
    } else {
        Err(())
    }
}

fn local_session_event_id_from_target_v1(target: &str) -> Result<Option<&str>, ()> {
    let Some(remainder) = target.strip_prefix(LOCAL_SESSION_EVENT_GATEWAY_PREFIX_V1) else {
        return Ok(None);
    };
    let Some(session_id) = remainder.strip_suffix(LOCAL_SESSION_EVENT_GATEWAY_SUFFIX_V1) else {
        return Err(());
    };
    let valid = session_id.strip_prefix("ses_").is_some_and(|suffix| {
        suffix.len() == 32
            && suffix
                .bytes()
                .all(|byte| byte.is_ascii_digit() || (b'a'..=b'f').contains(&byte))
    }) && !session_id
        .bytes()
        .any(|byte| matches!(byte, b'/' | b'?' | b'#' | b'%'));
    if valid { Ok(Some(session_id)) } else { Err(()) }
}

fn classify_local_session_event_route_v1(
    request_bytes: &[u8],
    request: ParsedRequestHeadV1<'_>,
    body: &[u8],
    peer_address: IpAddr,
    bound_address: SocketAddr,
    store: &Arc<Mutex<SqliteStore>>,
) -> Option<HttpResponseV1> {
    match local_session_event_id_from_target_v1(request.target) {
        Ok(Some(target_session_id)) => Some(classify_local_session_event_read_v1(
            request_bytes,
            request,
            body,
            target_session_id,
            peer_address,
            bound_address,
            store,
        )),
        Err(()) if matches!(request.method, "GET" | "HEAD") => {
            Some(HttpResponseV1::SessionEventReadRejected {
                head_only: request.method == "HEAD",
            })
        }
        Err(()) => Some(HttpResponseV1::MethodNotAllowed { allow: "GET, HEAD" }),
        Ok(None) => None,
    }
}

fn classify_local_session_gateway_v1(
    request_bytes: &[u8],
    request: ParsedRequestHeadV1<'_>,
    body: &[u8],
    peer_address: IpAddr,
    bound_address: SocketAddr,
    store: &Arc<Mutex<SqliteStore>>,
    authentication_limiter: &Arc<LocalAuthenticationLimiterV1>,
) -> HttpResponseV1 {
    if request.method == "PATCH" {
        return classify_local_session_rotation_v1(
            request_bytes,
            peer_address,
            bound_address,
            request.content_length,
            store,
        );
    }
    if request.method == "DELETE" {
        return classify_local_session_family_sign_out_v1(
            request_bytes,
            peer_address,
            bound_address,
            request.content_length,
            store,
        );
    }
    if request.method == "POST" {
        let issued =
            validate_local_session_issue_transport_v1(&request, peer_address, bound_address)
                .and_then(|()| {
                    serde_json::from_slice::<LocalBrowserSessionIssueBodyV1>(body)
                        .map_err(|_| LocalBrowserSessionIssueErrorV1::Rejected)
                })
                .and_then(|body| {
                    let mut store = store
                        .lock()
                        .map_err(|_| LocalBrowserSessionIssueErrorV1::Rejected)?;
                    issue_local_browser_session_v1(
                        &mut store,
                        authentication_limiter,
                        &LocalBrowserSessionIssueRequestV1 {
                            identity_ref: &body.identity_ref,
                            password: &body.password,
                            lifetime_seconds: body.lifetime_seconds,
                        },
                    )
                });
        return match issued {
            Ok(issued) => HttpResponseV1::SessionIssued {
                session: issued.session,
                cookie_headers: issued.cookie_headers,
            },
            Err(_) => HttpResponseV1::SessionIssueRejected,
        };
    }
    if !matches!(request.method, "GET" | "HEAD") {
        return HttpResponseV1::MethodNotAllowed {
            allow: "GET, HEAD, POST, PATCH, DELETE",
        };
    }
    let head_only = request.method == "HEAD";
    let authorized =
        parse_local_browser_transport_request_v1(request_bytes, peer_address, bound_address)
            .and_then(|request| {
                let mut store = store
                    .lock()
                    .map_err(|_| LocalBrowserTransportErrorV1::Rejected)?;
                authorize_local_browser_transport_request_v1(&mut store, &request)
            });
    match authorized {
        Ok(authorized)
            if authorized.target == LOCAL_SESSION_GATEWAY_PATH_V1
                && authorized.class == LocalBrowserRequestClassV1::ReadOnly =>
        {
            HttpResponseV1::AuthenticatedSession {
                session: authorized.session,
                head_only,
            }
        }
        Ok(_) | Err(_) => HttpResponseV1::SessionReadRejected { head_only },
    }
}

fn classify_readiness_or_unknown_v1(
    request: ParsedRequestHeadV1<'_>,
    body: &[u8],
    bound_address: SocketAddr,
) -> HttpResponseV1 {
    if !body.is_empty() || !host_matches_bound_address(request.host, bound_address) {
        return HttpResponseV1::BadRequest;
    }
    if request.target != READINESS_PATH_V1 {
        return HttpResponseV1::NotFound;
    }
    if request.method != "GET" {
        return HttpResponseV1::MethodNotAllowed { allow: "GET" };
    }
    HttpResponseV1::Ready
}

fn classify_local_approval_request_v1(
    request: ParsedRequestHeadV1<'_>,
    body: &[u8],
    peer_address: IpAddr,
    bound_address: SocketAddr,
    store: &Arc<Mutex<SqliteStore>>,
    authentication_limiter: &LocalAuthenticationLimiterV1,
) -> HttpResponseV1 {
    if request.method != "POST" {
        return HttpResponseV1::MethodNotAllowed { allow: "POST" };
    }
    if request.content_length.is_none_or(|length| length == 0) {
        return HttpResponseV1::ApprovalRequestRejected;
    }
    let created = parse_local_browser_transport_head_v1(request, peer_address, bound_address)
        .and_then(|request| {
            if !authentication_limiter.admit_session(request.raw_session_token()) {
                return Err(LocalBrowserTransportErrorV1::Rejected);
            }
            let body = serde_json::from_slice::<LocalBrowserApprovalRequestBodyV1>(body)
                .map_err(|_| LocalBrowserTransportErrorV1::Rejected)?;
            let mut store = store
                .lock()
                .map_err(|_| LocalBrowserTransportErrorV1::Rejected)?;
            create_local_browser_approval_request_v1(
                &mut store,
                &request,
                &body.project_ref,
                &body.policy_decision_id,
            )
        });
    match created {
        Ok(created) => HttpResponseV1::ApprovalRequestCreated(created),
        Err(_) => HttpResponseV1::ApprovalRequestRejected,
    }
}

fn classify_local_approval_decision_v1(
    request: ParsedRequestHeadV1<'_>,
    body: &[u8],
    approval_request_id: &str,
    peer_address: IpAddr,
    bound_address: SocketAddr,
    store: &Arc<Mutex<SqliteStore>>,
    authentication_limiter: &LocalAuthenticationLimiterV1,
) -> HttpResponseV1 {
    if request.method != "POST" {
        return HttpResponseV1::MethodNotAllowed { allow: "POST" };
    }
    if !valid_approval_request_id_v1(approval_request_id)
        || request.content_length.is_none_or(|length| length == 0)
    {
        return HttpResponseV1::ApprovalDecisionRejected;
    }
    let recorded = parse_local_browser_transport_head_v1(request, peer_address, bound_address)
        .and_then(|request| {
            if !authentication_limiter.admit_session(request.raw_session_token()) {
                return Err(LocalBrowserTransportErrorV1::Rejected);
            }
            let body = serde_json::from_slice::<LocalBrowserApprovalDecisionBodyV1>(body)
                .map_err(|_| LocalBrowserTransportErrorV1::Rejected)?;
            let decision = match body.decision.as_str() {
                "approved" => ApprovalDecisionV1Kind::Approved,
                "denied" => ApprovalDecisionV1Kind::Denied,
                _ => return Err(LocalBrowserTransportErrorV1::Rejected),
            };
            let reason = match body.reason.as_str() {
                "approval.operator_approved" => ApprovalDecisionV1Reason::OperatorApproved,
                "approval.operator_denied" => ApprovalDecisionV1Reason::OperatorDenied,
                "approval.scope_rejected" => ApprovalDecisionV1Reason::ScopeRejected,
                "approval.evidence_insufficient" => ApprovalDecisionV1Reason::EvidenceInsufficient,
                "approval.request_superseded" => ApprovalDecisionV1Reason::RequestSuperseded,
                _ => return Err(LocalBrowserTransportErrorV1::Rejected),
            };
            let mut store = store
                .lock()
                .map_err(|_| LocalBrowserTransportErrorV1::Rejected)?;
            decide_local_browser_approval_request_v1(
                &mut store,
                &request,
                &body.project_ref,
                approval_request_id,
                decision,
                reason,
            )
        });
    match recorded {
        Ok(recorded) => HttpResponseV1::ApprovalDecisionRecorded(recorded),
        Err(_) => HttpResponseV1::ApprovalDecisionRejected,
    }
}

fn valid_approval_request_id_v1(value: &str) -> bool {
    value.len() == 68
        && value.strip_prefix("apr_").is_some_and(|digest| {
            digest
                .bytes()
                .all(|byte| byte.is_ascii_hexdigit() && !byte.is_ascii_uppercase())
        })
}

fn classify_local_identity_creation_v1(
    request: ParsedRequestHeadV1<'_>,
    body: &[u8],
    peer_address: IpAddr,
    bound_address: SocketAddr,
    store: &Arc<Mutex<SqliteStore>>,
    authentication_limiter: &LocalAuthenticationLimiterV1,
) -> HttpResponseV1 {
    if request.method != "POST" {
        return HttpResponseV1::MethodNotAllowed { allow: "POST" };
    }
    if request.content_length.is_none_or(|length| length == 0) {
        return HttpResponseV1::IdentityCreationRejected;
    }
    let created = parse_local_browser_transport_head_v1(request, peer_address, bound_address)
        .and_then(|request| {
            if !authentication_limiter.admit_session(request.raw_session_token()) {
                return Err(LocalBrowserTransportErrorV1::Rejected);
            }
            let body = serde_json::from_slice::<LocalBrowserIdentityCreationBodyV1>(body)
                .map_err(|_| LocalBrowserTransportErrorV1::Rejected)?;
            let role = match body.role.as_str() {
                "operator" => LocalIdentityRoleV1::Operator,
                "auditor" => LocalIdentityRoleV1::Auditor,
                _ => return Err(LocalBrowserTransportErrorV1::Rejected),
            };
            let mut store = store
                .lock()
                .map_err(|_| LocalBrowserTransportErrorV1::Rejected)?;
            create_local_browser_identity_v1(
                &mut store,
                &request,
                &body.identity_ref,
                &body.display_name,
                role,
                &body.password,
            )
        });
    match created {
        Ok(created) => HttpResponseV1::IdentityCreated(created),
        Err(_) => HttpResponseV1::IdentityCreationRejected,
    }
}

fn classify_local_identity_event_read_v1(
    request_bytes: &[u8],
    request: ParsedRequestHeadV1<'_>,
    body: &[u8],
    target_identity_ref: &str,
    peer_address: IpAddr,
    bound_address: SocketAddr,
    store: &Arc<Mutex<SqliteStore>>,
) -> HttpResponseV1 {
    if !matches!(request.method, "GET" | "HEAD") {
        return HttpResponseV1::MethodNotAllowed { allow: "GET, HEAD" };
    }
    let head_only = request.method == "HEAD";
    if !body.is_empty() {
        return HttpResponseV1::IdentityEventReadRejected { head_only };
    }
    let read = parse_local_browser_transport_request_v1(request_bytes, peer_address, bound_address)
        .and_then(|request| {
            let mut store = store
                .lock()
                .map_err(|_| LocalBrowserTransportErrorV1::Rejected)?;
            read_local_browser_identity_events_v1(&mut store, &request, target_identity_ref)
        });
    match read {
        Ok(events) => HttpResponseV1::IdentityEventsRead {
            identity_ref: target_identity_ref.to_owned(),
            events,
            head_only,
        },
        Err(_) => HttpResponseV1::IdentityEventReadRejected { head_only },
    }
}

fn classify_local_session_event_read_v1(
    request_bytes: &[u8],
    request: ParsedRequestHeadV1<'_>,
    body: &[u8],
    target_session_id: &str,
    peer_address: IpAddr,
    bound_address: SocketAddr,
    store: &Arc<Mutex<SqliteStore>>,
) -> HttpResponseV1 {
    if !matches!(request.method, "GET" | "HEAD") {
        return HttpResponseV1::MethodNotAllowed { allow: "GET, HEAD" };
    }
    let head_only = request.method == "HEAD";
    if !body.is_empty() {
        return HttpResponseV1::SessionEventReadRejected { head_only };
    }
    let read = parse_local_browser_transport_request_v1(request_bytes, peer_address, bound_address)
        .and_then(|request| {
            let mut store = store
                .lock()
                .map_err(|_| LocalBrowserTransportErrorV1::Rejected)?;
            read_local_browser_session_events_v1(&mut store, &request, target_session_id)
        });
    match read {
        Ok(events) => HttpResponseV1::SessionEventsRead {
            session_id: target_session_id.to_owned(),
            events,
            head_only,
        },
        Err(_) => HttpResponseV1::SessionEventReadRejected { head_only },
    }
}

fn classify_local_identity_disablement_v1(
    request_bytes: &[u8],
    request: ParsedRequestHeadV1<'_>,
    target_identity_ref: &str,
    peer_address: IpAddr,
    bound_address: SocketAddr,
    store: &Arc<Mutex<SqliteStore>>,
) -> HttpResponseV1 {
    if request.method != "DELETE" {
        return HttpResponseV1::MethodNotAllowed { allow: "DELETE" };
    }
    if request.content_length != Some(0) {
        return HttpResponseV1::IdentityDisablementRejected;
    }
    let disabled =
        parse_local_browser_transport_request_v1(request_bytes, peer_address, bound_address)
            .and_then(|request| {
                let mut store = store
                    .lock()
                    .map_err(|_| LocalBrowserTransportErrorV1::Rejected)?;
                disable_local_browser_identity_v1(&mut store, &request, target_identity_ref)
            });
    match disabled {
        Ok(disabled) => HttpResponseV1::IdentityDisabled(disabled),
        Err(_) => HttpResponseV1::IdentityDisablementRejected,
    }
}

fn classify_local_password_rotation_v1(
    request: ParsedRequestHeadV1<'_>,
    body: &[u8],
    peer_address: IpAddr,
    bound_address: SocketAddr,
    store: &Arc<Mutex<SqliteStore>>,
    authentication_limiter: &LocalAuthenticationLimiterV1,
) -> HttpResponseV1 {
    if request.method != "PATCH" {
        return HttpResponseV1::MethodNotAllowed { allow: "PATCH" };
    }
    if request.content_length.is_none_or(|length| length == 0) {
        return HttpResponseV1::IdentityPasswordRotationRejected;
    }
    let rotated = parse_local_browser_transport_head_v1(request, peer_address, bound_address)
        .and_then(|request| {
            if !authentication_limiter.admit_session(request.raw_session_token()) {
                return Err(LocalBrowserTransportErrorV1::Rejected);
            }
            let body = serde_json::from_slice::<LocalBrowserPasswordRotationBodyV1>(body)
                .map_err(|_| LocalBrowserTransportErrorV1::Rejected)?;
            let mut store = store
                .lock()
                .map_err(|_| LocalBrowserTransportErrorV1::Rejected)?;
            rotate_local_browser_password_v1(
                &mut store,
                &request,
                &body.current_password,
                &body.new_password,
            )
        });
    match rotated {
        Ok(rotation) => HttpResponseV1::PasswordRotated {
            rotation,
            cookie_headers: clear_local_browser_session_cookie_headers_v1(),
        },
        Err(_) => HttpResponseV1::IdentityPasswordRotationRejected,
    }
}

fn classify_local_session_rotation_v1(
    request_bytes: &[u8],
    peer_address: IpAddr,
    bound_address: SocketAddr,
    content_length: Option<usize>,
    store: &Arc<Mutex<SqliteStore>>,
) -> HttpResponseV1 {
    if content_length != Some(0) {
        return HttpResponseV1::SessionRotationRejected;
    }
    let rotated =
        parse_local_browser_transport_request_v1(request_bytes, peer_address, bound_address)
            .and_then(|request| {
                let mut store = store
                    .lock()
                    .map_err(|_| LocalBrowserTransportErrorV1::Rejected)?;
                rotate_local_browser_session_v1(&mut store, &request)
            });
    match rotated {
        Ok(rotated) => HttpResponseV1::SessionRotated(rotated),
        Err(_) => HttpResponseV1::SessionRotationRejected,
    }
}

fn classify_local_session_family_sign_out_v1(
    request_bytes: &[u8],
    peer_address: IpAddr,
    bound_address: SocketAddr,
    content_length: Option<usize>,
    store: &Arc<Mutex<SqliteStore>>,
) -> HttpResponseV1 {
    if content_length != Some(0) {
        return HttpResponseV1::SessionFamilySignOutRejected;
    }
    let revoked =
        parse_local_browser_transport_request_v1(request_bytes, peer_address, bound_address)
            .and_then(|request| {
                let mut store = store
                    .lock()
                    .map_err(|_| LocalBrowserTransportErrorV1::Rejected)?;
                revoke_all_local_browser_sessions_v1(&mut store, &request)
            });
    match revoked {
        Ok(revocation) => HttpResponseV1::SessionFamilyRevoked {
            revocation,
            cookie_headers: clear_local_browser_session_cookie_headers_v1(),
        },
        Err(_) => HttpResponseV1::SessionFamilySignOutRejected,
    }
}

fn validate_local_session_issue_transport_v1(
    request: &ParsedRequestHeadV1<'_>,
    peer_address: IpAddr,
    bound_address: SocketAddr,
) -> Result<(), LocalBrowserSessionIssueErrorV1> {
    let expected = LocalBrowserOriginV1::loopback_http(bound_address.ip(), bound_address.port())
        .map_err(|_| LocalBrowserSessionIssueErrorV1::Rejected)?;
    if !peer_address.is_loopback()
        || request.method != "POST"
        || request.host != expected.host_header()
        || request.origin != Some(expected.serialized_origin())
        || request.fetch_site != Some("same-origin")
        || request.content_type != Some("application/json")
        || request.content_length.is_none_or(|length| length == 0)
        || request.session_issue_intent != Some(LOCAL_SESSION_ISSUE_INTENT_HEADER_VALUE_V1)
    {
        return Err(LocalBrowserSessionIssueErrorV1::Rejected);
    }
    Ok(())
}

fn host_matches_bound_address(value: &str, bound_address: SocketAddr) -> bool {
    let value = value.trim();
    if let Ok(socket_address) = value.parse::<SocketAddr>() {
        return socket_address == bound_address;
    }
    let value = value
        .strip_prefix('[')
        .and_then(|value| value.strip_suffix(']'))
        .unwrap_or(value);
    value
        .parse::<IpAddr>()
        .is_ok_and(|address| address == bound_address.ip())
}

const fn is_header_name_byte(byte: u8) -> bool {
    byte.is_ascii_alphanumeric()
        || matches!(
            byte,
            b'!' | b'#'..=b'\'' | b'*' | b'+' | b'-' | b'.' | b'^' | b'_' | b'`' | b'|' | b'~'
        )
}

struct HttpResponsePartsV1 {
    status: &'static str,
    body: String,
    allow: Option<&'static str>,
    head_only: bool,
    cookie_headers: Option<LocalBrowserSessionCookieHeadersV1>,
    contract_version_header: Option<&'static str>,
}

type HttpResponsePartsTupleV1 = (
    &'static str,
    String,
    Option<&'static str>,
    bool,
    Option<LocalBrowserSessionCookieHeadersV1>,
);

// Keep the closed response mapping together so status, cookie, and version
// behavior remains exhaustively reviewable at one boundary.
#[allow(clippy::too_many_lines)]
fn compose_http_response_v1(
    response: HttpResponseV1,
    state: &SqliteStoreStateV1,
) -> HttpResponsePartsV1 {
    if let Some(parts) = compose_gateway_contract_response_v1(&response) {
        return parts;
    }
    let (status, body, allow, head_only, cookie_headers) = match response {
        HttpResponseV1::Ready => ("200 OK", readiness_body_v1(state), None, false, None),
        HttpResponseV1::AuthenticatedHealth { head_only } => (
            "200 OK",
            serde_json::to_string(&product_surface::daemon_health_v1(state))
                .expect("authenticated health evidence must serialize"),
            None,
            head_only,
            None,
        ),
        HttpResponseV1::AuthenticatedStatus { head_only } => (
            "200 OK",
            serde_json::to_string(&product_surface::daemon_status_v1())
                .expect("authenticated status evidence must serialize"),
            None,
            head_only,
            None,
        ),
        HttpResponseV1::AuthenticatedProductReadRejected { head_only } => (
            "403 Forbidden",
            authenticated_product_read_denied_body_v1(),
            None,
            head_only,
            None,
        ),
        HttpResponseV1::ConsoleAsset { .. } => unreachable!(),
        HttpResponseV1::GatewayContractNegotiated { .. }
        | HttpResponseV1::GatewayContractVersionRejected { .. } => {
            unreachable!()
        }
        HttpResponseV1::SessionIssued {
            session,
            cookie_headers,
        } => session_issue_response_parts_v1(&session, cookie_headers),
        HttpResponseV1::SessionRotated(rotated) => session_rotation_response_parts_v1(rotated),
        HttpResponseV1::PasswordRotated {
            rotation,
            cookie_headers,
        } => password_rotation_response_parts_v1(&rotation, cookie_headers),
        HttpResponseV1::IdentityCreated(created) => identity_creation_response_parts_v1(&created),
        HttpResponseV1::IdentityCreationRejected => identity_creation_denied_parts_v1(),
        HttpResponseV1::IdentityDisabled(value) => identity_disablement_response_parts_v1(&value),
        HttpResponseV1::IdentityDisablementRejected => identity_disablement_denied_parts_v1(),
        HttpResponseV1::IdentityEventsRead {
            identity_ref,
            events,
            head_only,
        } => identity_event_read_response_parts_v1(&identity_ref, &events, head_only),
        HttpResponseV1::IdentityEventReadRejected { head_only } => {
            identity_event_read_denied_parts_v1(head_only)
        }
        HttpResponseV1::SessionEventsRead {
            session_id,
            events,
            head_only,
        } => session_event_read_response_parts_v1(&session_id, &events, head_only),
        HttpResponseV1::SessionEventReadRejected { head_only } => {
            session_event_read_denied_parts_v1(head_only)
        }
        HttpResponseV1::ApprovalRequestCreated(value) => approval_request_response_parts_v1(&value),
        HttpResponseV1::ApprovalRequestRejected => approval_request_denied_parts_v1(),
        HttpResponseV1::ApprovalDecisionRecorded(value) => {
            approval_decision_response_parts_v1(&value)
        }
        HttpResponseV1::ApprovalDecisionRejected => approval_decision_denied_parts_v1(),
        HttpResponseV1::ExecutionAuthorizationIssued(mut value) => {
            execution_authorization_issue_response_parts_v1(&mut value)
        }
        HttpResponseV1::ExecutionAuthorizationRead(value) => {
            runtime_json_response_parts_v1("200 OK", authorization_json_v1(&value))
        }
        HttpResponseV1::ExecutionAuthorizationTransitioned(value) => {
            runtime_json_response_parts_v1("200 OK", authorization_json_v1(&value.record))
        }
        HttpResponseV1::RuntimeCompositionExecuted(value) => {
            runtime_json_response_parts_v1("200 OK", runtime_write_json_v1(&value))
        }
        HttpResponseV1::OperationRead(value) | HttpResponseV1::OperationReconciled(value) => {
            runtime_json_response_parts_v1("200 OK", operation_json_v1(&value))
        }
        HttpResponseV1::OperationAttemptRead(value) => {
            runtime_json_response_parts_v1("200 OK", attempt_json_v1(&value))
        }
        HttpResponseV1::RuntimeCompositionRejected => runtime_composition_denied_parts_v1(false),
        HttpResponseV1::RuntimeCompositionCapacityRejected => {
            runtime_composition_denied_parts_v1(true)
        }
        HttpResponseV1::SessionFamilyRevoked {
            revocation,
            cookie_headers,
        } => session_family_revocation_response_parts_v1(&revocation, cookie_headers),
        HttpResponseV1::AuthenticatedSession { session, head_only } => {
            authenticated_session_response_parts_v1(&session, head_only)
        }
        HttpResponseV1::SessionReadRejected { head_only } => session_denied_parts_v1(head_only),
        HttpResponseV1::SessionRotationRejected => session_rotation_denied_parts_v1(),
        HttpResponseV1::SessionFamilySignOutRejected => session_family_sign_out_denied_parts_v1(),
        HttpResponseV1::IdentityPasswordRotationRejected => {
            identity_password_rotation_denied_parts_v1()
        }
        HttpResponseV1::BadRequest => (
            "400 Bad Request",
            error_body("lnsatd.request.invalid"),
            None,
            false,
            None,
        ),
        HttpResponseV1::SessionIssueRejected => session_issue_denied_parts_v1(),
        HttpResponseV1::Forbidden => (
            "403 Forbidden",
            error_body("lnsatd.connection.non_loopback_forbidden"),
            None,
            false,
            None,
        ),
        HttpResponseV1::NotFound => (
            "404 Not Found",
            error_body("lnsatd.route.not_found"),
            None,
            false,
            None,
        ),
        HttpResponseV1::MethodNotAllowed { allow } => (
            "405 Method Not Allowed",
            error_body("lnsatd.method.not_allowed"),
            Some(allow),
            false,
            None,
        ),
        HttpResponseV1::RequestHeadTooLarge => (
            "413 Content Too Large",
            error_body("lnsatd.request.head_too_large"),
            None,
            false,
            None,
        ),
        HttpResponseV1::RequestBodyTooLarge => (
            "413 Content Too Large",
            error_body("lnsatd.request.body_too_large"),
            None,
            false,
            None,
        ),
        HttpResponseV1::ServiceUnavailable => (
            "503 Service Unavailable",
            error_body("lnsatd.connection.capacity_exhausted"),
            None,
            false,
            None,
        ),
    };
    HttpResponsePartsV1 {
        status,
        body,
        allow,
        head_only,
        cookie_headers,
        contract_version_header: None,
    }
}

fn authenticated_session_response_parts_v1(
    session: &LocalSessionRecordV1,
    head_only: bool,
) -> HttpResponsePartsTupleV1 {
    (
        "200 OK",
        gateway_session_read_body_v1(session),
        None,
        head_only,
        None,
    )
}

fn session_denied_parts_v1(head_only: bool) -> HttpResponsePartsTupleV1 {
    (
        "403 Forbidden",
        gateway_session_read_rejected_body_v1(),
        None,
        head_only,
        None,
    )
}

fn compose_gateway_contract_response_v1(response: &HttpResponseV1) -> Option<HttpResponsePartsV1> {
    match response {
        HttpResponseV1::GatewayContractNegotiated { version, head_only } => {
            Some(HttpResponsePartsV1 {
                status: "200 OK",
                body: gateway_contract_negotiation_body_v1(*version),
                allow: None,
                head_only: *head_only,
                cookie_headers: None,
                contract_version_header: Some(CONTRACT_VERSION_V1_0),
            })
        }
        HttpResponseV1::GatewayContractVersionRejected { error, head_only } => {
            Some(HttpResponsePartsV1 {
                status: "400 Bad Request",
                body: error
                    .into_contract_error_envelope_v1()
                    .to_json_value()
                    .to_string(),
                allow: None,
                head_only: *head_only,
                cookie_headers: None,
                contract_version_header: None,
            })
        }
        _ => None,
    }
}

fn session_family_revocation_response_parts_v1(
    revocation: &LocalSessionFamilyRevocationV1,
    cookie_headers: LocalBrowserSessionCookieHeadersV1,
) -> HttpResponsePartsTupleV1 {
    (
        "200 OK",
        session_family_revocation_body_v1(revocation),
        None,
        false,
        Some(cookie_headers),
    )
}

fn session_family_sign_out_denied_parts_v1() -> HttpResponsePartsTupleV1 {
    (
        "403 Forbidden",
        gateway_session_family_sign_out_rejected_body_v1(),
        None,
        false,
        None,
    )
}

fn session_issue_response_parts_v1(
    session: &LocalSessionRecordV1,
    cookie_headers: LocalBrowserSessionCookieHeadersV1,
) -> HttpResponsePartsTupleV1 {
    (
        "201 Created",
        session_issue_body_v1(session),
        None,
        false,
        Some(cookie_headers),
    )
}

fn session_issue_denied_parts_v1() -> HttpResponsePartsTupleV1 {
    (
        "403 Forbidden",
        gateway_session_issue_rejected_body_v1(),
        None,
        false,
        None,
    )
}

fn session_rotation_response_parts_v1(
    rotated: LocalBrowserSessionRotationResponseV1,
) -> HttpResponsePartsTupleV1 {
    (
        "200 OK",
        session_rotation_body_v1(&rotated.prior_session_id, &rotated.session),
        None,
        false,
        Some(rotated.cookie_headers),
    )
}

fn session_rotation_denied_parts_v1() -> HttpResponsePartsTupleV1 {
    (
        "403 Forbidden",
        gateway_session_rotation_rejected_body_v1(),
        None,
        false,
        None,
    )
}

fn password_rotation_response_parts_v1(
    rotation: &LocalPasswordRotationResultV1,
    cookie_headers: LocalBrowserSessionCookieHeadersV1,
) -> HttpResponsePartsTupleV1 {
    (
        "200 OK",
        password_rotation_body_v1(rotation),
        None,
        false,
        Some(cookie_headers),
    )
}

fn identity_password_rotation_denied_parts_v1() -> HttpResponsePartsTupleV1 {
    (
        "403 Forbidden",
        gateway_identity_password_rotation_rejected_body_v1(),
        None,
        false,
        None,
    )
}

fn identity_disablement_response_parts_v1(
    disabled: &LocalIdentityDisablementResultV1,
) -> HttpResponsePartsTupleV1 {
    (
        "200 OK",
        identity_disablement_body_v1(disabled),
        None,
        false,
        None,
    )
}

fn identity_disablement_denied_parts_v1() -> HttpResponsePartsTupleV1 {
    (
        "403 Forbidden",
        gateway_identity_disablement_rejected_body_v1(),
        None,
        false,
        None,
    )
}

fn identity_event_read_response_parts_v1(
    identity_ref: &str,
    events: &[LocalIdentityEventV1],
    head_only: bool,
) -> HttpResponsePartsTupleV1 {
    (
        "200 OK",
        identity_event_read_body_v1(identity_ref, events),
        None,
        head_only,
        None,
    )
}

fn identity_event_read_denied_parts_v1(head_only: bool) -> HttpResponsePartsTupleV1 {
    (
        "403 Forbidden",
        gateway_identity_event_read_rejected_body_v1(),
        None,
        head_only,
        None,
    )
}

fn session_event_read_response_parts_v1(
    session_id: &str,
    events: &[LocalSessionEventV1],
    head_only: bool,
) -> HttpResponsePartsTupleV1 {
    (
        "200 OK",
        session_event_read_body_v1(session_id, events),
        None,
        head_only,
        None,
    )
}

fn session_event_read_denied_parts_v1(head_only: bool) -> HttpResponsePartsTupleV1 {
    (
        "403 Forbidden",
        gateway_session_event_read_rejected_body_v1(),
        None,
        head_only,
        None,
    )
}

fn identity_creation_response_parts_v1(
    created: &LocalIdentityCredentialRecordV1,
) -> HttpResponsePartsTupleV1 {
    (
        "201 Created",
        identity_creation_body_v1(created),
        None,
        false,
        None,
    )
}

fn identity_creation_denied_parts_v1() -> HttpResponsePartsTupleV1 {
    (
        "403 Forbidden",
        gateway_identity_creation_rejected_body_v1(),
        None,
        false,
        None,
    )
}

fn approval_decision_response_parts_v1(
    recorded: &ApprovalDecisionStoreWriteV1,
) -> HttpResponsePartsTupleV1 {
    (
        if recorded.created {
            "201 Created"
        } else {
            "200 OK"
        },
        approval_decision_body_v1(recorded),
        None,
        false,
        None,
    )
}

fn approval_decision_denied_parts_v1() -> HttpResponsePartsTupleV1 {
    (
        "403 Forbidden",
        gateway_approval_decision_rejected_body_v1(),
        None,
        false,
        None,
    )
}

fn approval_request_response_parts_v1(
    created: &ApprovalRequestStoreWriteV1,
) -> HttpResponsePartsTupleV1 {
    (
        if created.created {
            "201 Created"
        } else {
            "200 OK"
        },
        approval_request_body_v1(created),
        None,
        false,
        None,
    )
}

fn approval_request_denied_parts_v1() -> HttpResponsePartsTupleV1 {
    (
        "403 Forbidden",
        gateway_approval_request_rejected_body_v1(),
        None,
        false,
        None,
    )
}

fn readiness_body_v1(state: &SqliteStoreStateV1) -> String {
    format!(
        concat!(
            "{{\"contract\":\"{}\",\"status\":\"ready\",",
            "\"schema_version\":{},\"migration_count\":{},",
            "\"bind_scope\":\"loopback\",\"mutation_authority\":false}}"
        ),
        READINESS_CONTRACT_V1, state.schema_version, state.migration_count
    )
}

fn authenticated_product_read_denied_body_v1() -> String {
    serde_json::json!({
        "contract": AUTHENTICATED_PRODUCT_READ_DENIAL_CONTRACT_V1,
        "contract_version": CONTRACT_VERSION_V1_0,
        "ok": false,
        "error": { "code": AUTHENTICATED_PRODUCT_READ_DENIAL_CODE_V1 },
        "side_effects": [],
        "mutation_authority": false,
    })
    .to_string()
}

fn gateway_contract_negotiation_body_v1(version: ContractVersion) -> String {
    serde_json::json!({
        "contract": GATEWAY_NEGOTIATION_CONTRACT_V1,
        "contract_version": version.as_str(),
        "stability": version.stability().as_str(),
        "negotiation": "exact_match",
        "bind_scope": "loopback",
        "side_effects": [],
        "mutation_authority": false,
    })
    .to_string()
}

fn session_issue_body_v1(session: &LocalSessionRecordV1) -> String {
    serde_json::json!({
        "contract": GATEWAY_SESSION_ISSUE_CONTRACT_V1,
        "contract_version": CONTRACT_VERSION_V1_0,
        "ok": true,
        "status": "authenticated",
        "session": {
            "session_id": session.session_id,
            "identity_ref": session.identity_ref,
            "role": session.role.as_str(),
            "issued_at": session.issued_at,
            "expires_at": session.expires_at,
        },
        "transport": {
            "bind_scope": "loopback",
            "same_origin_required": true,
            "cors_enabled": false,
            "session_cookie": "host_only_http_only_samesite_strict",
            "csrf_cookie": "host_only_samesite_strict",
        },
        "replay_semantics": "fresh_session_per_success",
        "side_effects": [
            GATEWAY_SESSION_ISSUE_LIMITER_SIDE_EFFECT_V1,
            GATEWAY_SESSION_ISSUE_EVIDENCE_SIDE_EFFECT_V1,
            GATEWAY_SESSION_ISSUE_EVENT_SIDE_EFFECT_V1,
            GATEWAY_SESSION_ISSUE_COOKIE_SIDE_EFFECT_V1,
        ],
        "session_state_changed": true,
        "execution_authority": false,
        "mutation_authority": false,
    })
    .to_string()
}

fn gateway_session_issue_rejected_body_v1() -> String {
    serde_json::json!({
        "contract": GATEWAY_SESSION_ISSUE_CONTRACT_V1,
        "contract_version": CONTRACT_VERSION_V1_0,
        "ok": false,
        "session": null,
        "errors": [{
            "code": GATEWAY_SESSION_ISSUE_ERROR_CODE_V1,
            "path": "/session",
            "message": "Session issue denied.",
            "severity": "error",
        }],
        "side_effects": [GATEWAY_SESSION_ISSUE_FAILURE_SIDE_EFFECT_V1],
        "session_state_changed": false,
        "execution_authority": false,
        "mutation_authority": false,
    })
    .to_string()
}

fn gateway_session_read_body_v1(session: &LocalSessionRecordV1) -> String {
    serde_json::json!({
        "contract": GATEWAY_SESSION_READ_CONTRACT_V1,
        "contract_version": CONTRACT_VERSION_V1_0,
        "ok": true,
        "status": "authenticated",
        "session": {
            "session_id": session.session_id,
            "identity_ref": session.identity_ref,
            "role": session.role.as_str(),
            "issued_at": session.issued_at,
            "expires_at": session.expires_at,
        },
        "transport": {
            "bind_scope": "loopback",
            "same_origin_required": true,
            "cors_enabled": false,
        },
        "side_effects": [GATEWAY_SESSION_ACTIVITY_SIDE_EFFECT_V1],
        "mutation_authority": false,
    })
    .to_string()
}

fn gateway_session_read_rejected_body_v1() -> String {
    serde_json::json!({
        "contract": GATEWAY_SESSION_READ_CONTRACT_V1,
        "contract_version": CONTRACT_VERSION_V1_0,
        "ok": false,
        "session": null,
        "errors": [{
            "code": GATEWAY_SESSION_READ_ERROR_CODE_V1,
            "path": "/session",
            "message": "Session read denied.",
            "severity": "error",
        }],
        "side_effects": [],
        "mutation_authority": false,
    })
    .to_string()
}

fn session_rotation_body_v1(prior_session_id: &str, session: &LocalSessionRecordV1) -> String {
    serde_json::json!({
        "contract": GATEWAY_SESSION_ROTATION_CONTRACT_V1,
        "contract_version": CONTRACT_VERSION_V1_0,
        "ok": true,
        "status": "rotated",
        "scope": "current_session_only",
        "prior_session_id": prior_session_id,
        "session": {
            "session_id": session.session_id,
            "identity_ref": session.identity_ref,
            "role": session.role.as_str(),
            "issued_at": session.issued_at,
            "expires_at": session.expires_at,
        },
        "transport": {
            "bind_scope": "loopback",
            "same_origin_required": true,
            "csrf_verified": true,
            "cors_enabled": false,
            "session_cookie": "host_only_http_only_samesite_strict",
            "csrf_cookie": "host_only_samesite_strict",
        },
        "replay_semantics": "one_time_current_session",
        "absolute_expiry_preserved": true,
        "side_effects": [
            GATEWAY_SESSION_ACTIVITY_SIDE_EFFECT_V1,
            GATEWAY_SESSION_ROTATION_REVOCATION_SIDE_EFFECT_V1,
            GATEWAY_SESSION_ROTATION_REPLACEMENT_SIDE_EFFECT_V1,
            GATEWAY_SESSION_ROTATION_EVIDENCE_SIDE_EFFECT_V1,
            GATEWAY_SESSION_ROTATION_EVENT_SIDE_EFFECT_V1,
            GATEWAY_SESSION_ROTATION_COOKIE_SIDE_EFFECT_V1,
        ],
        "session_state_changed": true,
        "execution_authority": false,
        "mutation_authority": false,
    })
    .to_string()
}

fn gateway_session_rotation_rejected_body_v1() -> String {
    serde_json::json!({
        "contract": GATEWAY_SESSION_ROTATION_CONTRACT_V1,
        "contract_version": CONTRACT_VERSION_V1_0,
        "ok": false,
        "prior_session_id": null,
        "session": null,
        "errors": [{
            "code": GATEWAY_SESSION_ROTATION_ERROR_CODE_V1,
            "path": "/session",
            "message": "Session rotation denied.",
            "severity": "error",
        }],
        "side_effects": [],
        "session_state_changed": false,
        "execution_authority": false,
        "mutation_authority": false,
    })
    .to_string()
}

fn password_rotation_body_v1(rotation: &LocalPasswordRotationResultV1) -> String {
    serde_json::json!({
        "contract": GATEWAY_IDENTITY_PASSWORD_ROTATION_CONTRACT_V1,
        "contract_version": CONTRACT_VERSION_V1_0,
        "ok": true,
        "status": "password_rotated",
        "scope": "authenticated_identity",
        "identity_ref": &rotation.identity_ref,
        "credential_version": rotation.credential_version,
        "rotated_at": &rotation.rotated_at,
        "revoked_session_count": rotation.revoked_session_count,
        "transport": {
            "bind_scope": "loopback",
            "same_origin_required": true,
            "csrf_verified": true,
            "cors_enabled": false,
            "session_cookie": "cleared_host_only_http_only_samesite_strict",
            "csrf_cookie": "cleared_host_only_samesite_strict",
        },
        "replay_semantics": "one_time_active_session_family",
        "side_effects": [
            GATEWAY_SESSION_ISSUE_LIMITER_SIDE_EFFECT_V1,
            GATEWAY_SESSION_ACTIVITY_SIDE_EFFECT_V1,
            GATEWAY_IDENTITY_PASSWORD_ROTATION_CREDENTIAL_SIDE_EFFECT_V1,
            GATEWAY_IDENTITY_PASSWORD_ROTATION_IDENTITY_EVENT_SIDE_EFFECT_V1,
            GATEWAY_SESSION_FAMILY_SIGN_OUT_REVOCATION_SIDE_EFFECT_V1,
            GATEWAY_SESSION_FAMILY_SIGN_OUT_EVENT_SIDE_EFFECT_V1,
            GATEWAY_SESSION_FAMILY_SIGN_OUT_COOKIE_SIDE_EFFECT_V1,
        ],
        "credential_state_changed": true,
        "session_state_changed": true,
        "reauthentication_required": true,
        "execution_authority": false,
        "mutation_authority": false,
    })
    .to_string()
}

fn gateway_identity_password_rotation_rejected_body_v1() -> String {
    serde_json::json!({
        "contract": GATEWAY_IDENTITY_PASSWORD_ROTATION_CONTRACT_V1,
        "contract_version": CONTRACT_VERSION_V1_0,
        "ok": false,
        "identity_ref": null,
        "credential_version": null,
        "rotated_at": null,
        "revoked_session_count": null,
        "errors": [{
            "code": GATEWAY_IDENTITY_PASSWORD_ROTATION_ERROR_CODE_V1,
            "path": "/identity/password",
            "message": "Password rotation denied.",
            "severity": "error",
        }],
        "side_effects": [GATEWAY_SESSION_ISSUE_FAILURE_SIDE_EFFECT_V1],
        "credential_state_changed": false,
        "session_state_changed": false,
        "execution_authority": false,
        "mutation_authority": false,
    })
    .to_string()
}

fn identity_disablement_body_v1(disabled: &LocalIdentityDisablementResultV1) -> String {
    serde_json::json!({
        "contract": GATEWAY_IDENTITY_DISABLEMENT_CONTRACT_V1,
        "contract_version": CONTRACT_VERSION_V1_0,
        "ok": true,
        "status": "disabled",
        "scope": "non_owner_identity",
        "identity_ref": &disabled.identity_ref,
        "disabled_at": &disabled.changed_at,
        "revoked_session_count": disabled.revoked_session_count,
        "authorization": {
            "source": "local_session",
            "actor_role": "owner",
            "permission": "manage_identities",
            "actor_session_bound": true,
            "csrf_verified": true,
        },
        "replay_semantics": "one_time_active_target_identity",
        "side_effects": [
            GATEWAY_IDENTITY_DISABLEMENT_ACTIVITY_SIDE_EFFECT_V1,
            GATEWAY_IDENTITY_DISABLEMENT_STATUS_SIDE_EFFECT_V1,
            GATEWAY_IDENTITY_DISABLEMENT_EVENT_SIDE_EFFECT_V1,
            GATEWAY_IDENTITY_DISABLEMENT_REVOCATION_SIDE_EFFECT_V1,
            GATEWAY_IDENTITY_DISABLEMENT_SESSION_EVENT_SIDE_EFFECT_V1,
        ],
        "permanent": true,
        "target_session_family_closed": true,
        "reenable_authority": false,
        "identity_state_changed": true,
        "session_authority_state_changed": true,
        "execution_authority": false,
        "mutation_authority": false,
    })
    .to_string()
}

fn gateway_identity_disablement_rejected_body_v1() -> String {
    serde_json::json!({
        "contract": GATEWAY_IDENTITY_DISABLEMENT_CONTRACT_V1,
        "contract_version": CONTRACT_VERSION_V1_0,
        "ok": false,
        "identity_ref": null,
        "disabled_at": null,
        "revoked_session_count": null,
        "errors": [{
            "code": GATEWAY_IDENTITY_DISABLEMENT_ERROR_CODE_V1,
            "path": "/identities/{identity_ref}",
            "message": "Identity disablement denied.",
            "severity": "error",
        }],
        "side_effects": [],
        "identity_state_changed": false,
        "session_authority_state_changed": false,
        "execution_authority": false,
        "mutation_authority": false,
    })
    .to_string()
}

fn identity_event_read_body_v1(identity_ref: &str, events: &[LocalIdentityEventV1]) -> String {
    let events = events
        .iter()
        .map(|event| {
            serde_json::json!({
                "event_id": &event.event_id,
                "identity_ref": &event.identity_ref,
                "event_sequence": event.event_sequence,
                "event_kind": event.event_kind.as_str(),
                "actor_session_id": &event.actor_session_id,
                "credential_version": event.credential_version,
                "source_evidence_digest": &event.source_evidence_digest,
                "occurred_at": &event.occurred_at,
                "event_evidence_digest": &event.event_evidence_digest,
            })
        })
        .collect::<Vec<_>>();
    serde_json::json!({
        "contract": GATEWAY_IDENTITY_EVENT_READ_CONTRACT_V1,
        "contract_version": CONTRACT_VERSION_V1_0,
        "ok": true,
        "status": "evidence_read",
        "scope": "target_identity",
        "identity_ref": identity_ref,
        "events": events,
        "event_order": "event_sequence_ascending",
        "side_effects": [GATEWAY_IDENTITY_EVENT_READ_ACTIVITY_SIDE_EFFECT_V1],
        "identity_state_changed": false,
        "session_authority_state_changed": false,
        "execution_authority": false,
        "mutation_authority": false,
    })
    .to_string()
}

fn gateway_identity_event_read_rejected_body_v1() -> String {
    serde_json::json!({
        "contract": GATEWAY_IDENTITY_EVENT_READ_CONTRACT_V1,
        "contract_version": CONTRACT_VERSION_V1_0,
        "ok": false,
        "identity_ref": null,
        "events": null,
        "errors": [{
            "code": GATEWAY_IDENTITY_EVENT_READ_ERROR_CODE_V1,
            "path": "/identities/{identity_ref}/events",
            "message": "Identity event read denied.",
            "severity": "error",
        }],
        "side_effects": [GATEWAY_IDENTITY_EVENT_READ_ACTIVITY_SIDE_EFFECT_V1],
        "identity_state_changed": false,
        "session_authority_state_changed": false,
        "execution_authority": false,
        "mutation_authority": false,
    })
    .to_string()
}

fn session_event_read_body_v1(session_id: &str, events: &[LocalSessionEventV1]) -> String {
    let events = events
        .iter()
        .map(|event| {
            serde_json::json!({
                "event_id": &event.event_id,
                "session_id": &event.session_id,
                "event_sequence": event.event_sequence,
                "event_kind": event.event_kind.as_str(),
                "actor_session_id": &event.actor_session_id,
                "related_session_id": &event.related_session_id,
                "revocation_reason": &event.revocation_reason,
                "source_evidence_digest": &event.source_evidence_digest,
                "occurred_at": &event.occurred_at,
                "event_evidence_digest": &event.event_evidence_digest,
            })
        })
        .collect::<Vec<_>>();
    serde_json::json!({
        "contract": GATEWAY_SESSION_EVENT_READ_CONTRACT_V1,
        "contract_version": CONTRACT_VERSION_V1_0,
        "ok": true,
        "status": "evidence_read",
        "scope": "target_session",
        "session_id": session_id,
        "events": events,
        "event_order": "event_sequence_ascending",
        "side_effects": [GATEWAY_SESSION_EVENT_READ_ACTIVITY_SIDE_EFFECT_V1],
        "identity_state_changed": false,
        "session_authority_state_changed": false,
        "packet_state_changed": false,
        "action_state_changed": false,
        "signing_authority": false,
        "nonce_authority": false,
        "consumption_authority": false,
        "execution_authority": false,
        "mutation_authority": false,
    })
    .to_string()
}

fn gateway_session_event_read_rejected_body_v1() -> String {
    serde_json::json!({
        "contract": GATEWAY_SESSION_EVENT_READ_CONTRACT_V1,
        "contract_version": CONTRACT_VERSION_V1_0,
        "ok": false,
        "session_id": null,
        "events": null,
        "errors": [{
            "code": GATEWAY_SESSION_EVENT_READ_ERROR_CODE_V1,
            "path": "/sessions/{session_id}/events",
            "message": "Session event read denied.",
            "severity": "error",
        }],
        "side_effects": [GATEWAY_SESSION_EVENT_READ_ACTIVITY_SIDE_EFFECT_V1],
        "identity_state_changed": false,
        "session_authority_state_changed": false,
        "packet_state_changed": false,
        "action_state_changed": false,
        "signing_authority": false,
        "nonce_authority": false,
        "consumption_authority": false,
        "execution_authority": false,
        "mutation_authority": false,
    })
    .to_string()
}

fn identity_creation_body_v1(created: &LocalIdentityCredentialRecordV1) -> String {
    serde_json::json!({
        "contract": GATEWAY_IDENTITY_CREATION_CONTRACT_V1,
        "contract_version": CONTRACT_VERSION_V1_0,
        "ok": true,
        "status": "created",
        "scope": "new_non_owner_identity",
        "identity": {
            "identity_ref": &created.identity.identity_ref,
            "display_name": &created.identity.display_name,
            "role": created.identity.role.as_str(),
            "lifecycle_status": created.identity.status.as_str(),
            "created_at": &created.identity.created_at,
        },
        "credential": {
            "profile": &created.credential_profile,
            "version": created.credential_version,
            "created_at": &created.credential_created_at,
            "secret_exposed": false,
        },
        "authorization": {
            "source": "local_session",
            "actor_role": "owner",
            "permission": "manage_identities",
            "actor_session_bound": true,
            "csrf_verified": true,
        },
        "replay_semantics": "create_once_identity_ref",
        "side_effects": [
            GATEWAY_IDENTITY_CREATION_LIMITER_SIDE_EFFECT_V1,
            GATEWAY_IDENTITY_CREATION_ACTIVITY_SIDE_EFFECT_V1,
            GATEWAY_IDENTITY_CREATION_IDENTITY_SIDE_EFFECT_V1,
            GATEWAY_IDENTITY_CREATION_CREDENTIAL_SIDE_EFFECT_V1,
            GATEWAY_IDENTITY_CREATION_EVENT_SIDE_EFFECT_V1,
        ],
        "identity_state_changed": true,
        "credential_state_changed": true,
        "session_authority_state_changed": false,
        "execution_authority": false,
        "mutation_authority": false,
    })
    .to_string()
}

fn gateway_identity_creation_rejected_body_v1() -> String {
    serde_json::json!({
        "contract": GATEWAY_IDENTITY_CREATION_CONTRACT_V1,
        "contract_version": CONTRACT_VERSION_V1_0,
        "ok": false,
        "identity": null,
        "credential": null,
        "errors": [{
            "code": GATEWAY_IDENTITY_CREATION_ERROR_CODE_V1,
            "path": "/identities",
            "message": "Identity creation denied.",
            "severity": "error",
        }],
        "side_effects": [GATEWAY_IDENTITY_CREATION_FAILURE_SIDE_EFFECT_V1],
        "identity_state_changed": false,
        "credential_state_changed": false,
        "session_authority_state_changed": false,
        "execution_authority": false,
        "mutation_authority": false,
    })
    .to_string()
}

fn approval_decision_body_v1(recorded: &ApprovalDecisionStoreWriteV1) -> String {
    let decision = &recorded.record.decision;
    let (status, side_effects, approval_decision_state_changed) = if recorded.created {
        (
            "recorded",
            vec![
                GATEWAY_APPROVAL_DECISION_LIMITER_SIDE_EFFECT_V1,
                GATEWAY_APPROVAL_DECISION_ACTIVITY_SIDE_EFFECT_V1,
                GATEWAY_APPROVAL_DECISION_EVIDENCE_SIDE_EFFECT_V1,
            ],
            true,
        )
    } else {
        (
            "replayed",
            vec![
                GATEWAY_APPROVAL_DECISION_LIMITER_SIDE_EFFECT_V1,
                GATEWAY_APPROVAL_DECISION_ACTIVITY_SIDE_EFFECT_V1,
            ],
            false,
        )
    };
    serde_json::json!({
        "contract": GATEWAY_APPROVAL_DECISION_CONTRACT_V1,
        "contract_version": CONTRACT_VERSION_V1_0,
        "ok": true,
        "status": status,
        "scope": "terminal_approval_decision",
        "decision": {
            "contract_version": &decision.contract_version,
            "schema_id": &decision.schema_id,
            "approval_decision_id": &decision.approval_decision_id,
            "approval_request_ref": {
                "schema_id": &decision.approval_request_ref.schema_id,
                "approval_request_id": &decision.approval_request_ref.approval_request_id,
                "policy_decision_id": &decision.approval_request_ref.policy_decision_id,
            },
            "approver_ref": &decision.approver_ref,
            "approver_session_ref": &decision.approver_session_ref,
            "decision": decision.decision.as_str(),
            "reason_code": decision.reason.code(),
            "decided_at": &decision.decided_at,
            "expires_at": &decision.expires_at,
            "approval_gate_satisfied": decision.approval_gate_satisfied,
            "execution_authorized": decision.execution_authorized,
            "side_effects": [],
        },
        "authorization": {
            "source": "local_session",
            "permission": "decide_approval",
            "csrf_verified": true,
            "approver_bound": true,
            "actor_session_bound": true,
            "request_bound": true,
            "distinct_human": true,
        },
        "replay_semantics": "immutable_terminal_content_bound_server_owned_time",
        "side_effects": side_effects,
        "approval_decision_state_changed": approval_decision_state_changed,
        "approval_recorded": true,
        "server_signed": false,
        "session_authority_state_changed": false,
        "execution_authorized": false,
        "mutation_authority": false,
    })
    .to_string()
}

fn gateway_approval_decision_rejected_body_v1() -> String {
    serde_json::json!({
        "contract": GATEWAY_APPROVAL_DECISION_CONTRACT_V1,
        "contract_version": CONTRACT_VERSION_V1_0,
        "ok": false,
        "decision": null,
        "errors": [{
            "code": GATEWAY_APPROVAL_DECISION_ERROR_CODE_V1,
            "path": "/approval-decisions",
            "message": "Approval decision denied.",
            "severity": "error",
        }],
        "side_effects": [GATEWAY_APPROVAL_DECISION_FAILURE_SIDE_EFFECT_V1],
        "approval_decision_state_changed": false,
        "approval_recorded": false,
        "server_signed": false,
        "session_authority_state_changed": false,
        "execution_authorized": false,
        "mutation_authority": false,
    })
    .to_string()
}

fn approval_request_body_v1(created: &ApprovalRequestStoreWriteV1) -> String {
    let request = &created.record.request;
    let (status, side_effects, approval_request_state_changed) = if created.created {
        (
            "created",
            vec![
                GATEWAY_APPROVAL_REQUEST_LIMITER_SIDE_EFFECT_V1,
                GATEWAY_APPROVAL_REQUEST_ACTIVITY_SIDE_EFFECT_V1,
                GATEWAY_APPROVAL_REQUEST_EVIDENCE_SIDE_EFFECT_V1,
            ],
            true,
        )
    } else {
        (
            "replayed",
            vec![
                GATEWAY_APPROVAL_REQUEST_LIMITER_SIDE_EFFECT_V1,
                GATEWAY_APPROVAL_REQUEST_ACTIVITY_SIDE_EFFECT_V1,
            ],
            false,
        )
    };
    serde_json::json!({
        "contract": GATEWAY_APPROVAL_REQUEST_CONTRACT_V1,
        "contract_version": CONTRACT_VERSION_V1_0,
        "ok": true,
        "status": status,
        "scope": "pending_approval_request",
        "approval_request": {
            "contract_version": &request.contract_version,
            "schema_id": &request.schema_id,
            "approval_request_id": &request.approval_request_id,
            "status": &request.status,
            "policy_decision_ref": {
                "schema_id": &request.policy_decision_ref.schema_id,
                "decision_id": &request.policy_decision_ref.decision_id,
                "packet_hash": &request.policy_decision_ref.packet_hash,
            },
            "requester_ref": &request.requester_ref,
            "session_ref": &request.session_ref,
            "project_ref": &request.project_ref,
            "resource_refs": &request.resource_refs,
            "requested_capabilities": &request.requested_capabilities,
            "policy_reason_codes": request
                .policy_reason_codes
                .iter()
                .map(|reason| reason.code())
                .collect::<Vec<_>>(),
            "requested_at": &request.requested_at,
            "expires_at": &request.expires_at,
            "side_effects": [],
        },
        "authorization": {
            "source": "local_session",
            "permission": "request_action",
            "csrf_verified": true,
            "requester_bound": true,
            "actor_session_bound": true,
        },
        "replay_semantics": "content_bound_server_owned_time",
        "side_effects": side_effects,
        "approval_request_state_changed": approval_request_state_changed,
        "approval_recorded": false,
        "server_signed": false,
        "session_authority_state_changed": false,
        "execution_authorized": false,
        "mutation_authority": false,
    })
    .to_string()
}

fn gateway_approval_request_rejected_body_v1() -> String {
    serde_json::json!({
        "contract": GATEWAY_APPROVAL_REQUEST_CONTRACT_V1,
        "contract_version": CONTRACT_VERSION_V1_0,
        "ok": false,
        "approval_request": null,
        "errors": [{
            "code": GATEWAY_APPROVAL_REQUEST_ERROR_CODE_V1,
            "path": "/approval-requests",
            "message": "Approval request denied.",
            "severity": "error",
        }],
        "side_effects": [GATEWAY_APPROVAL_REQUEST_FAILURE_SIDE_EFFECT_V1],
        "approval_request_state_changed": false,
        "approval_recorded": false,
        "server_signed": false,
        "session_authority_state_changed": false,
        "execution_authorized": false,
        "mutation_authority": false,
    })
    .to_string()
}

fn session_family_revocation_body_v1(revocation: &LocalSessionFamilyRevocationV1) -> String {
    serde_json::json!({
        "contract": GATEWAY_SESSION_FAMILY_SIGN_OUT_CONTRACT_V1,
        "contract_version": CONTRACT_VERSION_V1_0,
        "ok": true,
        "status": "signed_out",
        "scope": "identity_session_family",
        "identity_ref": &revocation.identity_ref,
        "family_session_count": revocation.family_session_count,
        "newly_revoked_session_count": revocation.newly_revoked_session_count,
        "revoked_at": &revocation.revoked_at,
        "transport": {
            "bind_scope": "loopback",
            "same_origin_required": true,
            "csrf_verified": true,
            "cors_enabled": false,
            "session_cookie": "cleared_host_only_http_only_samesite_strict",
            "csrf_cookie": "cleared_host_only_samesite_strict",
        },
        "replay_semantics": "one_time_active_session_family",
        "side_effects": [
            GATEWAY_SESSION_ACTIVITY_SIDE_EFFECT_V1,
            GATEWAY_SESSION_FAMILY_SIGN_OUT_REVOCATION_SIDE_EFFECT_V1,
            GATEWAY_SESSION_FAMILY_SIGN_OUT_EVENT_SIDE_EFFECT_V1,
            GATEWAY_SESSION_FAMILY_SIGN_OUT_COOKIE_SIDE_EFFECT_V1,
        ],
        "session_state_changed": true,
        "reauthentication_required": true,
        "execution_authority": false,
        "mutation_authority": false,
    })
    .to_string()
}

fn gateway_session_family_sign_out_rejected_body_v1() -> String {
    serde_json::json!({
        "contract": GATEWAY_SESSION_FAMILY_SIGN_OUT_CONTRACT_V1,
        "contract_version": CONTRACT_VERSION_V1_0,
        "ok": false,
        "identity_ref": null,
        "family_session_count": null,
        "newly_revoked_session_count": null,
        "revoked_at": null,
        "errors": [{
            "code": GATEWAY_SESSION_FAMILY_SIGN_OUT_ERROR_CODE_V1,
            "path": "/session",
            "message": "Session family sign-out denied.",
            "severity": "error",
        }],
        "side_effects": [],
        "session_state_changed": false,
        "execution_authority": false,
        "mutation_authority": false,
    })
    .to_string()
}

fn digest_hex_v1(digest: &[u8; 32]) -> String {
    const HEX: &[u8; 16] = b"0123456789abcdef";
    let mut output = String::with_capacity(71);
    output.push_str("sha256:");
    for byte in digest {
        output.push(char::from(HEX[usize::from(byte >> 4)]));
        output.push(char::from(HEX[usize::from(byte & 0x0f)]));
    }
    output
}

fn authorization_value_v1(record: &Phase7ExecutionAuthorizationRecordV1) -> serde_json::Value {
    serde_json::json!({
        "authorization_id": record.authorization_id,
        "audit_binding_id": record.audit_binding_id,
        "project_ref": record.project_ref,
        "resource_ref": record.resource_ref,
        "authorization_attempt_id": record.authorization_attempt_id,
        "nonce_id": record.nonce_id,
        "binding_digest": digest_hex_v1(&record.binding_digest),
        "approval_decision_id": record.approval_decision_id,
        "policy_decision_id": record.policy_decision_id,
        "packet_id": record.packet_id,
        "packet_sha256": record.packet_sha256,
        "requester_ref": record.requester_ref,
        "requester_session_ref": record.requester_session_ref,
        "approver_ref": record.approver_ref,
        "approver_session_ref": record.approver_session_ref,
        "action_digest": digest_hex_v1(&record.action_digest),
        "target_digest": digest_hex_v1(&record.target_digest),
        "configuration_digest": digest_hex_v1(&record.configuration_digest),
        "adapter_ref": record.adapter_ref,
        "executable_digest": digest_hex_v1(&record.executable_digest),
        "audience": record.audience,
        "authorization_profile": record.authorization_profile,
        "issued_at": record.issued_at,
        "expires_at": record.expires_at,
        "state_event_id": record.state_event_id,
        "state_audit_binding_id": record.state_audit_binding_id,
        "state_sequence": record.state_sequence,
        "state": record.state,
        "state_effective_at": record.state_effective_at,
        "active": record.active,
        "operation_id": record.operation_id,
        "operation_audit_binding_id": record.operation_audit_binding_id,
        "operation_idempotency_key": record.operation_idempotency_key,
        "operation_request_digest": digest_hex_v1(&record.operation_request_digest),
    })
}

fn authorization_json_v1(record: &Phase7ExecutionAuthorizationRecordV1) -> String {
    serde_json::json!({
        "contract": GATEWAY_RUNTIME_COMPOSITION_CONTRACT_V1,
        "status": "ok",
        "authorization": authorization_value_v1(record),
    })
    .to_string()
}

fn attempt_value_v1(value: &Phase8OperationAttemptReadbackV1) -> serde_json::Value {
    serde_json::json!({
        "operation_attempt_id": value.operation_attempt_id,
        "audit_binding_id": value.audit_binding_id,
        "operation_id": value.operation_id,
        "project_ref": value.project_ref,
        "resource_ref": value.resource_ref,
        "attempt_sequence": value.attempt_sequence,
        "adapter_ref": value.adapter_ref,
        "protocol_version": value.protocol_version,
        "tool_arguments_digest": digest_hex_v1(&value.tool_arguments_digest),
        "created_at": value.created_at,
        "state_event_id": value.state_event_id,
        "state_audit_binding_id": value.state_audit_binding_id,
        "state_sequence": value.state_sequence,
        "state": value.state,
        "state_effective_at": value.state_effective_at,
    })
}

fn operation_value_v1(value: &Phase8OperationReadbackV1) -> serde_json::Value {
    serde_json::json!({
        "operation_id": value.operation_id,
        "operation_audit_binding_id": value.operation_audit_binding_id,
        "authorization_id": value.authorization_id,
        "consumption_id": value.consumption_id,
        "project_ref": value.project_ref,
        "resource_ref": value.resource_ref,
        "state_event_id": value.state_event_id,
        "state_audit_binding_id": value.state_audit_binding_id,
        "state_sequence": value.state_sequence,
        "state": value.state,
        "state_effective_at": value.state_effective_at,
        "attempt": value.attempt.as_ref().map(attempt_value_v1),
        "receipt": value.receipt_id.as_ref().map(|receipt_id| serde_json::json!({
            "receipt_id": receipt_id,
            "received_at": value.receipt_received_at,
        })),
        "reconciliation": value.reconciliation_id.as_ref().map(|reconciliation_id| serde_json::json!({
            "reconciliation_id": reconciliation_id,
            "status": value.reconciliation_status,
            "recorded_at": value.reconciliation_recorded_at,
        })),
    })
}

fn operation_json_v1(value: &Phase8OperationReadbackV1) -> String {
    serde_json::json!({
        "contract": GATEWAY_RUNTIME_COMPOSITION_CONTRACT_V1,
        "status": "ok",
        "operation": operation_value_v1(value),
    })
    .to_string()
}

fn attempt_json_v1(value: &Phase8OperationAttemptReadbackV1) -> String {
    serde_json::json!({
        "contract": GATEWAY_RUNTIME_COMPOSITION_CONTRACT_V1,
        "status": "ok",
        "attempt": attempt_value_v1(value),
    })
    .to_string()
}

fn runtime_write_json_v1(value: &Phase8RuntimeCompositionWriteV1) -> String {
    serde_json::json!({
        "contract": GATEWAY_RUNTIME_COMPOSITION_CONTRACT_V1,
        "status": "ok",
        "created": value.created,
        "consumption": {
            "consumption_id": value.consumption.consumption_id,
            "audit_binding_id": value.consumption.audit_binding_id,
            "authorization_id": value.consumption.authorization_id,
            "operation_id": value.consumption.operation_id,
            "request_digest": digest_hex_v1(&value.consumption.request_digest),
            "consumed_at": value.consumption.consumed_at,
            "authorization_state_event_id": value.consumption.authorization_state_event_id,
            "authorization_state_audit_binding_id": value.consumption.authorization_state_audit_binding_id,
            "authorization_state_sequence": value.consumption.authorization_state_sequence,
        },
        "operation": operation_value_v1(&value.operation),
    })
    .to_string()
}

fn execution_authorization_issue_response_parts_v1(
    value: &mut LocalBrowserPhase7AuthorizationIssueResponseV1,
) -> HttpResponsePartsTupleV1 {
    let capability = value.take_capability_wire_v1();
    let body = serde_json::json!({
        "contract": GATEWAY_RUNTIME_COMPOSITION_CONTRACT_V1,
        "status": "ok",
        "created": value.created(),
        "authorization": authorization_value_v1(value.record()),
        "capability": capability
            .as_ref()
            .map(Phase7ExecutionCapabilityWireV1::expose_for_authenticated_response_v1),
    })
    .to_string();
    (
        if value.created() {
            "201 Created"
        } else {
            "200 OK"
        },
        body,
        None,
        false,
        None,
    )
}

fn runtime_json_response_parts_v1(status: &'static str, body: String) -> HttpResponsePartsTupleV1 {
    (status, body, None, false, None)
}

fn runtime_composition_denied_parts_v1(capacity: bool) -> HttpResponsePartsTupleV1 {
    (
        if capacity {
            "503 Service Unavailable"
        } else {
            "403 Forbidden"
        },
        serde_json::json!({
            "contract": GATEWAY_RUNTIME_COMPOSITION_CONTRACT_V1,
            "status": "error",
            "code": GATEWAY_RUNTIME_COMPOSITION_ERROR_CODE_V1,
        })
        .to_string(),
        None,
        false,
        None,
    )
}

fn write_response_with_state(
    stream: &mut TcpStream,
    response: ClassifiedHttpResponseV1,
    state: &SqliteStoreStateV1,
) -> Result<(), DaemonErrorV1> {
    let ClassifiedHttpResponseV1 {
        response,
        accepted_contract_version,
    } = response;
    let mut response = match response {
        HttpResponseV1::ConsoleAsset { asset, head_only } => {
            return write_phase9_console_asset_response_v1(stream, &asset, head_only);
        }
        response => compose_http_response_v1(response, state),
    };
    if let Some(version) = accepted_contract_version {
        response.contract_version_header = Some(version.as_str());
    }
    let allow_header = response
        .allow
        .map_or_else(String::new, |value| format!("Allow: {value}\r\n"));
    let contract_version_header = response
        .contract_version_header
        .map_or_else(String::new, |value| {
            format!("{GATEWAY_CONTRACT_VERSION_HEADER_NAME_V1}: {value}\r\n")
        });
    let mut cookie_headers = response.cookie_headers.map_or_else(String::new, |cookies| {
        format!(
            "Set-Cookie: {}\r\nSet-Cookie: {}\r\n",
            cookies.session(),
            cookies.csrf()
        )
    });
    let mut head = format!(
        concat!(
            "HTTP/1.1 {status}\r\n",
            "Content-Type: application/json\r\n",
            "Content-Length: {length}\r\n",
            "Cache-Control: no-store\r\n",
            "Content-Security-Policy: default-src 'none'; frame-ancestors 'none'\r\n",
            "Cross-Origin-Resource-Policy: same-origin\r\n",
            "Referrer-Policy: no-referrer\r\n",
            "Permissions-Policy: camera=(), microphone=(), geolocation=()\r\n",
            "X-Content-Type-Options: nosniff\r\n",
            "{allow_header}",
            "{contract_version_header}",
            "{cookie_headers}",
            "Connection: close\r\n\r\n"
        ),
        status = response.status,
        length = response.body.len(),
        allow_header = allow_header,
        contract_version_header = contract_version_header,
        cookie_headers = cookie_headers
    );
    let result = stream
        .write_all(head.as_bytes())
        .and_then(|()| {
            if response.head_only {
                Ok(())
            } else {
                stream.write_all(response.body.as_bytes())
            }
        })
        .and_then(|()| stream.flush())
        .map_err(|_| DaemonErrorV1::ResponseWriteFailed);
    head.zeroize();
    cookie_headers.zeroize();
    response.body.zeroize();
    result
}

fn write_phase9_console_asset_response_v1(
    stream: &mut TcpStream,
    asset: &Phase9ConsoleAssetV1,
    head_only: bool,
) -> Result<(), DaemonErrorV1> {
    let mut head = format!(
        concat!(
            "HTTP/1.1 200 OK\r\n",
            "Content-Type: {content_type}\r\n",
            "Content-Length: {length}\r\n",
            "Cache-Control: no-store\r\n",
            "Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self'; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'\r\n",
            "Cross-Origin-Resource-Policy: same-origin\r\n",
            "Referrer-Policy: no-referrer\r\n",
            "Permissions-Policy: camera=(), microphone=(), geolocation=()\r\n",
            "X-Content-Type-Options: nosniff\r\n",
            "Connection: close\r\n\r\n"
        ),
        content_type = asset.content_type,
        length = asset.bytes.len(),
    );
    let result = stream
        .write_all(head.as_bytes())
        .and_then(|()| {
            if head_only {
                Ok(())
            } else {
                stream.write_all(asset.bytes.as_slice())
            }
        })
        .and_then(|()| stream.flush())
        .map_err(|_| DaemonErrorV1::ResponseWriteFailed);
    head.zeroize();
    result
}

fn error_body(code: &str) -> String {
    format!("{{\"status\":\"error\",\"code\":\"{code}\"}}")
}

/// Returns bounded source-only daemon usage.
#[must_use]
pub const fn daemon_usage_v1() -> &'static str {
    concat!(
        "Usage: lnsatd --database <path> [--listen <loopback-ip:port>] [--disposable-git-root <temp-path> --git-executable <absolute-path>]\n",
        "       lnsatd --config <absolute-path>\n",
        "       lnsatd --manifest\n\n",
        "Defaults:\n",
        "  --listen 127.0.0.1:7447\n\n",
        "Stable source contracts:\n",
        "  GET|HEAD /v1 (exact contract-version negotiation)\n\n",
        "  POST /v1/session (local password session issue)\n",
        "  GET|HEAD /v1/session (authenticated, current-session read)\n",
        "  PATCH /v1/session (authenticated current-session rotation)\n",
        "  DELETE /v1/session (authenticated same-identity family sign-out)\n",
        "  PATCH /v1/identity/password (authenticated self-service rotation)\n",
        "  POST /v1/identities (owner-only non-owner creation)\n",
        "  DELETE /v1/identities/<identity-ref> (owner-only permanent disablement)\n",
        "  GET|HEAD /v1/identities/<identity-ref>/events (authenticated evidence read)\n",
        "  GET|HEAD /v1/sessions/<session-id>/events (authenticated evidence read)\n",
        "  POST /v1/approval-requests (authenticated pending request)\n",
        "  POST /v1/approval-requests/{approval_request_id}/decision (authenticated human decision)\n\n",
        "  POST /v1/execution-authorizations (authenticated authorization issue)\n",
        "  GET /v1/execution-authorizations/{authorization_id} (authenticated evidence read)\n",
        "  POST /v1/execution-authorizations/{authorization_id}/cancel (requester mutation)\n",
        "  POST /v1/execution-authorizations/{authorization_id}/revoke (approver/owner mutation)\n",
        "  POST /v1/execution-authorizations/{authorization_id}/execute (single bounded Git consequence)\n",
        "  GET /v1/operations/{operation_id} (authenticated evidence read)\n",
        "  GET /v1/operations/{operation_id}/attempts/{operation_attempt_id} (authenticated evidence read)\n",
        "  POST /v1/operations/{operation_id}/reconcile (inspection only; never retry)\n\n",
        "Source-local experimental endpoints:\n",
        "  GET /healthz\n"
    )
}

/// Returns package version without claiming a released artifact.
#[must_use]
pub const fn daemon_source_version_v1() -> &'static str {
    env!("CARGO_PKG_VERSION")
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::sync::atomic::{AtomicU64, Ordering};
    use std::thread;
    use std::time::Instant;

    static NEXT_TEST_DIRECTORY: AtomicU64 = AtomicU64::new(1);

    struct TestDirectory {
        path: PathBuf,
    }

    impl TestDirectory {
        fn new(label: &str) -> Self {
            let sequence = NEXT_TEST_DIRECTORY.fetch_add(1, Ordering::Relaxed);
            let path = std::env::temp_dir()
                .join(format!("lnsatd-{label}-{}-{sequence}", std::process::id()));
            fs::create_dir(&path).expect("test directory should be created");
            Self { path }
        }

        fn database_path(&self) -> PathBuf {
            self.path.join("lnsat.sqlite3")
        }
    }

    impl Drop for TestDirectory {
        fn drop(&mut self) {
            let _ = fs::remove_dir_all(&self.path);
        }
    }

    fn assert_stable_session_read_denial(response: &str) {
        assert!(response.starts_with("HTTP/1.1 403 Forbidden\r\n"));
        for expected in [
            "\"contract\":\"lnsat.gateway.session_read.v1_0\"",
            "\"contract_version\":\"lnsat.contracts.v1_0\"",
            "\"ok\":false",
            "\"code\":\"gateway.session_read.denied\"",
            "\"path\":\"/session\"",
            "\"message\":\"Session read denied.\"",
            "\"session\":null",
            "\"side_effects\":[]",
            "\"mutation_authority\":false",
        ] {
            assert!(
                response.contains(expected),
                "missing {expected} in {response}"
            );
        }
        for forbidden in [
            "lnsatd.browser_transport.rejected",
            "local_browser.",
            "WWW-Authenticate:",
        ] {
            assert!(!response.contains(forbidden));
        }
    }

    fn assert_stable_identity_event_read_denial(response: &str) {
        assert!(response.starts_with("HTTP/1.1 403 Forbidden\r\n"));
        assert!(response.contains("LNSAT-Contract-Version: lnsat.contracts.v1_0\r\n"));
        for expected in [
            "\"contract\":\"lnsat.gateway.identity_event_read.v1_0\"",
            "\"contract_version\":\"lnsat.contracts.v1_0\"",
            "\"ok\":false",
            "\"identity_ref\":null",
            "\"events\":null",
            "\"code\":\"gateway.identity_event_read.denied\"",
            "\"path\":\"/identities/{identity_ref}/events\"",
            "\"message\":\"Identity event read denied.\"",
            "\"side_effects\":[\"session_activity_evidence_may_append\"]",
            "\"identity_state_changed\":false",
            "\"session_authority_state_changed\":false",
            "\"execution_authority\":false",
            "\"mutation_authority\":false",
        ] {
            assert!(
                response.contains(expected),
                "missing {expected} in {response}"
            );
        }
        for forbidden in [
            "lnsatd.browser_transport.rejected",
            "local_identity_store.",
            "WWW-Authenticate:",
            "Set-Cookie:",
            "Access-Control-Allow-",
        ] {
            assert!(!response.contains(forbidden));
        }
    }

    fn assert_stable_session_event_read_denial(response: &str) {
        assert!(response.starts_with("HTTP/1.1 403 Forbidden\r\n"));
        assert!(response.contains("LNSAT-Contract-Version: lnsat.contracts.v1_0\r\n"));
        for expected in [
            "\"contract\":\"lnsat.gateway.session_event_read.v1_0\"",
            "\"contract_version\":\"lnsat.contracts.v1_0\"",
            "\"ok\":false",
            "\"session_id\":null",
            "\"events\":null",
            "\"code\":\"gateway.session_event_read.denied\"",
            "\"path\":\"/sessions/{session_id}/events\"",
            "\"message\":\"Session event read denied.\"",
            "\"side_effects\":[\"session_activity_evidence_may_append\"]",
            "\"identity_state_changed\":false",
            "\"session_authority_state_changed\":false",
            "\"packet_state_changed\":false",
            "\"action_state_changed\":false",
            "\"signing_authority\":false",
            "\"nonce_authority\":false",
            "\"consumption_authority\":false",
            "\"execution_authority\":false",
            "\"mutation_authority\":false",
        ] {
            assert!(
                response.contains(expected),
                "missing {expected} in {response}"
            );
        }
        for forbidden in [
            "lnsatd.browser_transport.rejected",
            "local_session_store.",
            "WWW-Authenticate:",
            "Set-Cookie:",
            "Access-Control-Allow-",
        ] {
            assert!(!response.contains(forbidden));
        }
    }

    fn assert_stable_approval_request_denial(response: &str) {
        assert!(response.starts_with("HTTP/1.1 403 Forbidden\r\n"));
        assert!(response.contains("LNSAT-Contract-Version: lnsat.contracts.v1_0\r\n"));
        for expected in [
            "\"contract\":\"lnsat.gateway.approval_request.v1_0\"",
            "\"contract_version\":\"lnsat.contracts.v1_0\"",
            "\"ok\":false",
            "\"approval_request\":null",
            "\"code\":\"gateway.approval_request.denied\"",
            "\"path\":\"/approval-requests\"",
            "\"message\":\"Approval request denied.\"",
            "\"side_effects\":[\"authentication_limiter_may_advance\"]",
            "\"approval_request_state_changed\":false",
            "\"approval_recorded\":false",
            "\"server_signed\":false",
            "\"session_authority_state_changed\":false",
            "\"execution_authorized\":false",
            "\"mutation_authority\":false",
        ] {
            assert!(
                response.contains(expected),
                "missing {expected} in {response}"
            );
        }
        for forbidden in [
            "lnsat.gateway.local_approval_request.v1_0",
            "lnsatd.browser_transport.rejected",
            "WWW-Authenticate:",
            "Set-Cookie:",
            "Access-Control-Allow-",
        ] {
            assert!(!response.contains(forbidden));
        }
    }

    fn assert_stable_approval_decision_denial(response: &str) {
        assert!(response.starts_with("HTTP/1.1 403 Forbidden\r\n"));
        assert!(response.contains("LNSAT-Contract-Version: lnsat.contracts.v1_0\r\n"));
        for expected in [
            "\"contract\":\"lnsat.gateway.approval_decision.v1_0\"",
            "\"contract_version\":\"lnsat.contracts.v1_0\"",
            "\"ok\":false",
            "\"decision\":null",
            "\"code\":\"gateway.approval_decision.denied\"",
            "\"path\":\"/approval-decisions\"",
            "\"message\":\"Approval decision denied.\"",
            "\"side_effects\":[\"authentication_limiter_may_advance\"]",
            "\"approval_decision_state_changed\":false",
            "\"approval_recorded\":false",
            "\"server_signed\":false",
            "\"session_authority_state_changed\":false",
            "\"execution_authorized\":false",
            "\"mutation_authority\":false",
        ] {
            assert!(
                response.contains(expected),
                "missing {expected} in {response}"
            );
        }
        for forbidden in [
            "lnsat.gateway.local_approval_decision.v1_0",
            "lnsatd.browser_transport.rejected",
            "WWW-Authenticate:",
            "Set-Cookie:",
            "Access-Control-Allow-",
        ] {
            assert!(!response.contains(forbidden));
        }
    }

    fn assert_stable_session_issue_denial(response: &str) {
        assert!(response.starts_with("HTTP/1.1 403 Forbidden\r\n"));
        for expected in [
            "\"contract\":\"lnsat.gateway.session_issue.v1_0\"",
            "\"contract_version\":\"lnsat.contracts.v1_0\"",
            "\"ok\":false",
            "\"code\":\"gateway.session_issue.denied\"",
            "\"path\":\"/session\"",
            "\"message\":\"Session issue denied.\"",
            "\"session\":null",
            "\"side_effects\":[\"authentication_limiter_may_advance\"]",
            "\"session_state_changed\":false",
            "\"execution_authority\":false",
            "\"mutation_authority\":false",
        ] {
            assert!(
                response.contains(expected),
                "missing {expected} in {response}"
            );
        }
        for forbidden in [
            "lnsatd.local_auth.rejected",
            "WWW-Authenticate:",
            "Set-Cookie:",
        ] {
            assert!(!response.contains(forbidden));
        }
    }

    fn stable_session_issue_success_body(response: &str) -> serde_json::Value {
        assert!(response.starts_with("HTTP/1.1 201 Created\r\n"));
        assert!(response.contains("LNSAT-Contract-Version: lnsat.contracts.v1_0\r\n"));
        let (_, body) = response
            .split_once("\r\n\r\n")
            .expect("issued response should have one header boundary");
        let value =
            serde_json::from_str::<serde_json::Value>(body).expect("session issue should be JSON");
        let session = value
            .get("session")
            .cloned()
            .expect("session issue should contain public session evidence");
        assert_eq!(
            session
                .as_object()
                .expect("session evidence should be an object")
                .keys()
                .map(String::as_str)
                .collect::<Vec<_>>(),
            [
                "expires_at",
                "identity_ref",
                "issued_at",
                "role",
                "session_id"
            ]
        );
        assert_eq!(
            value,
            serde_json::json!({
                "contract": GATEWAY_SESSION_ISSUE_CONTRACT_V1,
                "contract_version": CONTRACT_VERSION_V1_0,
                "ok": true,
                "status": "authenticated",
                "session": session,
                "transport": {
                    "bind_scope": "loopback",
                    "same_origin_required": true,
                    "cors_enabled": false,
                    "session_cookie": "host_only_http_only_samesite_strict",
                    "csrf_cookie": "host_only_samesite_strict",
                },
                "replay_semantics": "fresh_session_per_success",
                "side_effects": [
                    GATEWAY_SESSION_ISSUE_LIMITER_SIDE_EFFECT_V1,
                    GATEWAY_SESSION_ISSUE_EVIDENCE_SIDE_EFFECT_V1,
                    GATEWAY_SESSION_ISSUE_EVENT_SIDE_EFFECT_V1,
                    GATEWAY_SESSION_ISSUE_COOKIE_SIDE_EFFECT_V1,
                ],
                "session_state_changed": true,
                "execution_authority": false,
                "mutation_authority": false,
            })
        );
        value
    }

    fn assert_stable_session_rotation_denial(response: &str) {
        assert!(response.starts_with("HTTP/1.1 403 Forbidden\r\n"));
        for expected in [
            "\"contract\":\"lnsat.gateway.session_rotation.v1_0\"",
            "\"contract_version\":\"lnsat.contracts.v1_0\"",
            "\"ok\":false",
            "\"code\":\"gateway.session_rotation.denied\"",
            "\"path\":\"/session\"",
            "\"message\":\"Session rotation denied.\"",
            "\"prior_session_id\":null",
            "\"session\":null",
            "\"side_effects\":[]",
            "\"session_state_changed\":false",
            "\"execution_authority\":false",
            "\"mutation_authority\":false",
        ] {
            assert!(
                response.contains(expected),
                "missing {expected} in {response}"
            );
        }
        for forbidden in [
            "lnsatd.browser_transport.rejected",
            "WWW-Authenticate:",
            "Set-Cookie:",
        ] {
            assert!(!response.contains(forbidden));
        }
    }

    fn stable_session_rotation_success_body(response: &str) -> serde_json::Value {
        assert!(response.starts_with("HTTP/1.1 200 OK\r\n"));
        assert!(response.contains("LNSAT-Contract-Version: lnsat.contracts.v1_0\r\n"));
        let (_, body) = response
            .split_once("\r\n\r\n")
            .expect("rotation response should have one header boundary");
        let value =
            serde_json::from_str::<serde_json::Value>(body).expect("rotation should be JSON");
        let prior_session_id = value
            .get("prior_session_id")
            .cloned()
            .expect("rotation should bind prior session");
        let session = value
            .get("session")
            .cloned()
            .expect("rotation should contain replacement session evidence");
        assert_eq!(
            value,
            serde_json::json!({
                "contract": GATEWAY_SESSION_ROTATION_CONTRACT_V1,
                "contract_version": CONTRACT_VERSION_V1_0,
                "ok": true,
                "status": "rotated",
                "scope": "current_session_only",
                "prior_session_id": prior_session_id,
                "session": session,
                "transport": {
                    "bind_scope": "loopback",
                    "same_origin_required": true,
                    "csrf_verified": true,
                    "cors_enabled": false,
                    "session_cookie": "host_only_http_only_samesite_strict",
                    "csrf_cookie": "host_only_samesite_strict",
                },
                "replay_semantics": "one_time_current_session",
                "absolute_expiry_preserved": true,
                "side_effects": [
                    GATEWAY_SESSION_ACTIVITY_SIDE_EFFECT_V1,
                    GATEWAY_SESSION_ROTATION_REVOCATION_SIDE_EFFECT_V1,
                    GATEWAY_SESSION_ROTATION_REPLACEMENT_SIDE_EFFECT_V1,
                    GATEWAY_SESSION_ROTATION_EVIDENCE_SIDE_EFFECT_V1,
                    GATEWAY_SESSION_ROTATION_EVENT_SIDE_EFFECT_V1,
                    GATEWAY_SESSION_ROTATION_COOKIE_SIDE_EFFECT_V1,
                ],
                "session_state_changed": true,
                "execution_authority": false,
                "mutation_authority": false,
            })
        );
        value
    }

    fn assert_stable_session_family_sign_out_denial(response: &str) {
        assert!(response.starts_with("HTTP/1.1 403 Forbidden\r\n"));
        for expected in [
            "\"contract\":\"lnsat.gateway.session_family_sign_out.v1_0\"",
            "\"contract_version\":\"lnsat.contracts.v1_0\"",
            "\"ok\":false",
            "\"code\":\"gateway.session_family_sign_out.denied\"",
            "\"path\":\"/session\"",
            "\"message\":\"Session family sign-out denied.\"",
            "\"identity_ref\":null",
            "\"family_session_count\":null",
            "\"newly_revoked_session_count\":null",
            "\"revoked_at\":null",
            "\"side_effects\":[]",
            "\"session_state_changed\":false",
            "\"execution_authority\":false",
            "\"mutation_authority\":false",
        ] {
            assert!(
                response.contains(expected),
                "missing {expected} in {response}"
            );
        }
        for forbidden in [
            "lnsatd.browser_transport.rejected",
            "WWW-Authenticate:",
            "Set-Cookie:",
        ] {
            assert!(!response.contains(forbidden));
        }
    }

    fn stable_session_family_sign_out_success_body(response: &str) -> serde_json::Value {
        assert!(response.starts_with("HTTP/1.1 200 OK\r\n"));
        assert!(response.contains("LNSAT-Contract-Version: lnsat.contracts.v1_0\r\n"));
        let (_, body) = response
            .split_once("\r\n\r\n")
            .expect("sign-out response should have one header boundary");
        let value =
            serde_json::from_str::<serde_json::Value>(body).expect("sign-out should be JSON");
        let identity_ref = value
            .get("identity_ref")
            .cloned()
            .expect("sign-out should identify authenticated family");
        let family_session_count = value
            .get("family_session_count")
            .cloned()
            .expect("sign-out should count durable family");
        let newly_revoked_session_count = value
            .get("newly_revoked_session_count")
            .cloned()
            .expect("sign-out should count new revocations");
        let revoked_at = value
            .get("revoked_at")
            .cloned()
            .expect("sign-out should expose server-owned time");
        assert_eq!(
            value,
            serde_json::json!({
                "contract": GATEWAY_SESSION_FAMILY_SIGN_OUT_CONTRACT_V1,
                "contract_version": CONTRACT_VERSION_V1_0,
                "ok": true,
                "status": "signed_out",
                "scope": "identity_session_family",
                "identity_ref": identity_ref,
                "family_session_count": family_session_count,
                "newly_revoked_session_count": newly_revoked_session_count,
                "revoked_at": revoked_at,
                "transport": {
                    "bind_scope": "loopback",
                    "same_origin_required": true,
                    "csrf_verified": true,
                    "cors_enabled": false,
                    "session_cookie": "cleared_host_only_http_only_samesite_strict",
                    "csrf_cookie": "cleared_host_only_samesite_strict",
                },
                "replay_semantics": "one_time_active_session_family",
                "side_effects": [
                    GATEWAY_SESSION_ACTIVITY_SIDE_EFFECT_V1,
                    GATEWAY_SESSION_FAMILY_SIGN_OUT_REVOCATION_SIDE_EFFECT_V1,
                    GATEWAY_SESSION_FAMILY_SIGN_OUT_EVENT_SIDE_EFFECT_V1,
                    GATEWAY_SESSION_FAMILY_SIGN_OUT_COOKIE_SIDE_EFFECT_V1,
                ],
                "session_state_changed": true,
                "reauthentication_required": true,
                "execution_authority": false,
                "mutation_authority": false,
            })
        );
        value
    }

    fn assert_stable_identity_password_rotation_denial(response: &str) {
        assert!(response.starts_with("HTTP/1.1 403 Forbidden\r\n"));
        for expected in [
            "\"contract\":\"lnsat.gateway.identity_password_rotation.v1_0\"",
            "\"contract_version\":\"lnsat.contracts.v1_0\"",
            "\"ok\":false",
            "\"code\":\"gateway.identity_password_rotation.denied\"",
            "\"path\":\"/identity/password\"",
            "\"message\":\"Password rotation denied.\"",
            "\"identity_ref\":null",
            "\"credential_version\":null",
            "\"rotated_at\":null",
            "\"revoked_session_count\":null",
            "\"side_effects\":[\"authentication_limiter_may_advance\"]",
            "\"credential_state_changed\":false",
            "\"session_state_changed\":false",
            "\"execution_authority\":false",
            "\"mutation_authority\":false",
        ] {
            assert!(
                response.contains(expected),
                "missing {expected} in {response}"
            );
        }
        for forbidden in [
            "lnsatd.browser_transport.rejected",
            "WWW-Authenticate:",
            "Set-Cookie:",
        ] {
            assert!(!response.contains(forbidden));
        }
    }

    fn stable_identity_password_rotation_success_body(response: &str) -> serde_json::Value {
        assert!(response.starts_with("HTTP/1.1 200 OK\r\n"));
        assert!(response.contains("LNSAT-Contract-Version: lnsat.contracts.v1_0\r\n"));
        let (_, body) = response
            .split_once("\r\n\r\n")
            .expect("password-rotation response should have one header boundary");
        let value =
            serde_json::from_str::<serde_json::Value>(body).expect("response should be JSON");
        let identity_ref = value
            .get("identity_ref")
            .cloned()
            .expect("response should identify authenticated identity");
        let credential_version = value
            .get("credential_version")
            .cloned()
            .expect("response should identify new credential version");
        let rotated_at = value
            .get("rotated_at")
            .cloned()
            .expect("response should expose server-owned time");
        let revoked_session_count = value
            .get("revoked_session_count")
            .cloned()
            .expect("response should count revoked family sessions");
        assert_eq!(
            value,
            serde_json::json!({
                "contract": GATEWAY_IDENTITY_PASSWORD_ROTATION_CONTRACT_V1,
                "contract_version": CONTRACT_VERSION_V1_0,
                "ok": true,
                "status": "password_rotated",
                "scope": "authenticated_identity",
                "identity_ref": identity_ref,
                "credential_version": credential_version,
                "rotated_at": rotated_at,
                "revoked_session_count": revoked_session_count,
                "transport": {
                    "bind_scope": "loopback",
                    "same_origin_required": true,
                    "csrf_verified": true,
                    "cors_enabled": false,
                    "session_cookie": "cleared_host_only_http_only_samesite_strict",
                    "csrf_cookie": "cleared_host_only_samesite_strict",
                },
                "replay_semantics": "one_time_active_session_family",
                "side_effects": [
                    GATEWAY_SESSION_ISSUE_LIMITER_SIDE_EFFECT_V1,
                    GATEWAY_SESSION_ACTIVITY_SIDE_EFFECT_V1,
                    GATEWAY_IDENTITY_PASSWORD_ROTATION_CREDENTIAL_SIDE_EFFECT_V1,
                    GATEWAY_IDENTITY_PASSWORD_ROTATION_IDENTITY_EVENT_SIDE_EFFECT_V1,
                    GATEWAY_SESSION_FAMILY_SIGN_OUT_REVOCATION_SIDE_EFFECT_V1,
                    GATEWAY_SESSION_FAMILY_SIGN_OUT_EVENT_SIDE_EFFECT_V1,
                    GATEWAY_SESSION_FAMILY_SIGN_OUT_COOKIE_SIDE_EFFECT_V1,
                ],
                "credential_state_changed": true,
                "session_state_changed": true,
                "reauthentication_required": true,
                "execution_authority": false,
                "mutation_authority": false,
            })
        );
        value
    }

    fn local_browser_cookie_secrets_v1(
        issued: &LocalBrowserSessionIssueResponseV1,
    ) -> (String, String, String) {
        let session_token = issued
            .cookie_headers()
            .session()
            .split_once('=')
            .and_then(|(_, value)| value.split(';').next())
            .expect("session cookie should contain token")
            .to_owned();
        let csrf_token = issued
            .cookie_headers()
            .csrf()
            .split_once('=')
            .and_then(|(_, value)| value.split(';').next())
            .expect("CSRF cookie should contain token")
            .to_owned();
        let cookie = format!(
            "{}={session_token}; {}={csrf_token}",
            lnsat_auth::LOCAL_SESSION_COOKIE_NAME_V1,
            lnsat_auth::LOCAL_CSRF_COOKIE_NAME_V1,
        );
        (session_token, csrf_token, cookie)
    }

    struct Phase7LocalGatewayFixture {
        _directory: TestDirectory,
        store: SqliteStore,
        owner_cookie: String,
        owner_csrf: String,
        requester_cookie: String,
        requester_csrf: String,
        approval_decision_id: String,
    }

    impl Phase7LocalGatewayFixture {
        #[allow(clippy::too_many_lines)]
        fn new(label: &str) -> Self {
            let directory = TestDirectory::new(label);
            let mut store =
                SqliteStore::open(directory.database_path()).expect("store should bootstrap");
            let owner_password = "phase7 owner password value";
            let requester_password = "phase7 requester password value";
            let now = SystemTime::now();
            let created_at = canonical_system_time_v1(
                now.checked_sub(Duration::from_secs(5))
                    .expect("fixture clock should subtract"),
            )
            .expect("fixture creation time should format");
            store
                .bootstrap_local_owner_v1(&lnsat_store::LocalOwnerBootstrapInputV1 {
                    identity_ref: "identity:human:phase7-owner",
                    display_name: "Phase 7 Owner",
                    password: owner_password,
                    created_at: &created_at,
                })
                .expect("owner should bootstrap");
            let limiter = LocalAuthenticationLimiterV1::new();
            let owner = issue_local_browser_session_v1(
                &mut store,
                &limiter,
                &LocalBrowserSessionIssueRequestV1 {
                    identity_ref: "identity:human:phase7-owner",
                    password: owner_password,
                    lifetime_seconds: 300,
                },
            )
            .expect("owner browser session should issue");
            let (owner_token, owner_csrf, owner_cookie) = local_browser_cookie_secrets_v1(&owner);
            let operator_created_at = canonical_system_time_v1(SystemTime::now())
                .expect("fixture operator time should format");
            store
                .create_local_identity_v1(
                    &lnsat_store::LocalIdentityCreateInputV1 {
                        identity_ref: "identity:human:phase7-requester",
                        display_name: "Phase 7 Requester",
                        role: LocalIdentityRoleV1::Operator,
                        password: requester_password,
                        created_at: &operator_created_at,
                    },
                    &owner_token,
                    &owner_csrf,
                    &operator_created_at,
                )
                .expect("owner should create requester");
            let requester = issue_local_browser_session_v1(
                &mut store,
                &limiter,
                &LocalBrowserSessionIssueRequestV1 {
                    identity_ref: "identity:human:phase7-requester",
                    password: requester_password,
                    lifetime_seconds: 300,
                },
            )
            .expect("requester browser session should issue");
            let (_, requester_csrf, requester_cookie) = local_browser_cookie_secrets_v1(&requester);

            let fixture: serde_json::Value = serde_json::from_str(include_str!(
                "../../../fixtures/contracts/packet-envelope-v1_0.json"
            ))
            .expect("packet fixture wrapper should parse");
            let packet_json = serde_json::to_vec(&fixture["vectors"][0]["packet"])
                .expect("packet fixture should serialize");
            let mut packet = lnsat_contracts::parse_packet_envelope_v1(&packet_json)
                .expect("packet fixture should parse");
            let sequence = NEXT_TEST_DIRECTORY.fetch_add(1, Ordering::Relaxed);
            let packet_now = SystemTime::now();
            packet.packet_id = format!("pkt_phase7_gateway_{sequence}");
            packet.idempotency_key = format!("idem_phase7_gateway_{sequence}");
            packet.actor_ref = requester.session().identity_ref.clone();
            packet.session_ref = format!("session:local:{}", requester.session().session_id);
            packet.resource_refs = vec!["resource:repository:phase7-gateway".to_owned()];
            packet.permission_allow = vec!["deploy.request".to_owned()];
            packet.requires_approval = true;
            packet.constraints = serde_json::json!({
                "execution_proposal": {
                    "schema_id": "lnsat.execution_proposal.schema.v1_0",
                    "derivation_profile": "lnsat.execution_request.packet_embedded.v1",
                    "action": {
                        "kind": "git.commit",
                        "arguments": {
                            "message": "bounded phase7 fixture",
                            "path": "fixture.txt"
                        }
                    },
                    "target": {
                        "resource_ref": "resource:repository:phase7-gateway",
                        "identity": {
                            "base": "abc123",
                            "repository": "phase7-gateway"
                        }
                    },
                    "configuration_digest": format!("sha256:{}", "c".repeat(64)),
                    "adapter": {
                        "ref": "adapter:local:git-commit",
                        "version": "v1"
                    },
                    "executable_digest": format!("sha256:{}", "e".repeat(64)),
                    "audience": "audience:gateway:local"
                }
            })
            .as_object()
            .expect("constraints should be an object")
            .clone();
            packet.created_at = canonical_system_time_v1(
                packet_now
                    .checked_sub(Duration::from_secs(1))
                    .expect("fixture clock should subtract"),
            )
            .expect("packet creation time should format");
            packet.expires_at = canonical_system_time_v1(
                packet_now
                    .checked_add(Duration::from_mins(4))
                    .expect("fixture clock should add"),
            )
            .expect("packet expiry should format");
            let evaluated_at =
                canonical_system_time_v1(packet_now).expect("policy evaluation time should format");
            let policy = lnsat_contracts::decide_packet_envelope_policy_v1(&packet, &evaluated_at)
                .expect("approval-required policy should derive");
            store
                .append_packet_envelope_v1(&packet)
                .expect("packet should append");
            store
                .append_policy_decision_v1(&policy)
                .expect("policy should append");

            let requester_head = phase7_mutation_head_v1(
                &requester_cookie,
                &requester_csrf,
                "/unopened/phase7/approval-request",
            );
            let requester_request = parse_phase7_transport_v1(&requester_head)
                .expect("requester mutation transport should parse");
            let approval_request = create_local_browser_approval_request_v1(
                &mut store,
                &requester_request,
                &packet.project_ref,
                &policy.decision_id,
            )
            .expect("approval request should persist");
            let owner_head = phase7_mutation_head_v1(
                &owner_cookie,
                &owner_csrf,
                "/unopened/phase7/approval-decision",
            );
            let owner_request = parse_phase7_transport_v1(&owner_head)
                .expect("owner mutation transport should parse");
            let approval_decision = decide_local_browser_approval_request_v1(
                &mut store,
                &owner_request,
                &packet.project_ref,
                &approval_request.record.request.approval_request_id,
                ApprovalDecisionV1Kind::Approved,
                ApprovalDecisionV1Reason::OperatorApproved,
            )
            .expect("distinct owner should approve requester");

            Self {
                _directory: directory,
                store,
                owner_cookie,
                owner_csrf,
                requester_cookie,
                requester_csrf,
                approval_decision_id: approval_decision.record.decision.approval_decision_id,
            }
        }

        fn requester_mutation_head(&self, target: &str) -> String {
            phase7_mutation_head_v1(&self.requester_cookie, &self.requester_csrf, target)
        }

        fn owner_mutation_head(&self, target: &str) -> String {
            phase7_mutation_head_v1(&self.owner_cookie, &self.owner_csrf, target)
        }

        fn requester_read_head(&self, target: &str) -> String {
            format!(
                concat!(
                    "GET {target} HTTP/1.1\r\n",
                    "Host: 127.0.0.1:7447\r\n",
                    "Sec-Fetch-Site: same-origin\r\n",
                    "Cookie: {cookie}\r\n\r\n"
                ),
                target = target,
                cookie = self.requester_cookie,
            )
        }
    }

    fn phase7_mutation_head_v1(cookie: &str, csrf: &str, target: &str) -> String {
        format!(
            concat!(
                "POST {target} HTTP/1.1\r\n",
                "Host: 127.0.0.1:7447\r\n",
                "Origin: http://127.0.0.1:7447\r\n",
                "Sec-Fetch-Site: same-origin\r\n",
                "Content-Type: application/json\r\n",
                "Content-Length: 0\r\n",
                "Cookie: {cookie}\r\n",
                "X-LNSAT-CSRF: {csrf}\r\n\r\n"
            ),
            target = target,
            cookie = cookie,
            csrf = csrf,
        )
    }

    fn parse_phase7_transport_v1(
        head: &str,
    ) -> Result<LocalBrowserTransportRequestV1<'_>, LocalBrowserTransportErrorV1> {
        parse_local_browser_transport_request_v1(
            head.as_bytes(),
            "127.0.0.1".parse().expect("peer should parse"),
            "127.0.0.1:7447"
                .parse()
                .expect("bound address should parse"),
        )
    }

    struct ServedSessionGatewayFixture {
        directory: TestDirectory,
        address: SocketAddr,
        shutdown: DaemonShutdownV1,
        server_thread: Option<thread::JoinHandle<Result<(), DaemonErrorV1>>>,
        issued: LocalBrowserSessionIssueResponseV1,
        expired_session_token: String,
        session_token: String,
        csrf_token: String,
        cookie: String,
    }

    impl ServedSessionGatewayFixture {
        fn start(label: &str) -> Self {
            let directory = TestDirectory::new(label);
            let database_path = directory.database_path();
            let (expired, issued) = {
                let mut store = SqliteStore::open(&database_path).expect("store should bootstrap");
                store
                    .bootstrap_local_owner_v1(&lnsat_store::LocalOwnerBootstrapInputV1 {
                        identity_ref: "identity:human:owner",
                        display_name: "Local Owner",
                        password: "correct horse battery staple",
                        created_at: "2026-01-01T00:00:00Z",
                    })
                    .expect("owner should bootstrap");
                let expired = store
                    .issue_local_owner_session_v1(&LocalSessionIssueInputV1 {
                        identity_ref: "identity:human:owner",
                        password: "correct horse battery staple",
                        issued_at: "2026-01-01T00:01:00Z",
                        expires_at: "2026-01-01T00:02:00Z",
                    })
                    .expect("expired fixture session should issue");
                let issued = issue_local_browser_session_v1(
                    &mut store,
                    &LocalAuthenticationLimiterV1::new(),
                    &LocalBrowserSessionIssueRequestV1 {
                        identity_ref: "identity:human:owner",
                        password: "correct horse battery staple",
                        lifetime_seconds: 300,
                    },
                )
                .expect("current session should issue");
                (expired, issued)
            };
            let server = DaemonServerV1::bind(&DaemonConfigV1::for_test(&database_path))
                .expect("server should bind");
            let address = server.local_addr();
            let shutdown = server.shutdown_handle();
            let server_thread = thread::spawn(move || server.serve());
            let (session_token, csrf_token, cookie) = local_browser_cookie_secrets_v1(&issued);
            Self {
                directory,
                address,
                shutdown,
                server_thread: Some(server_thread),
                issued,
                expired_session_token: expired.raw_session_token,
                session_token,
                csrf_token,
                cookie,
            }
        }

        fn valid_get(&self) -> String {
            format!(
                concat!(
                    "GET /v1/session HTTP/1.1\r\n",
                    "Host: {address}\r\n",
                    "{version_name}: {version}\r\n",
                    "Sec-Fetch-Site: same-origin\r\n",
                    "Cookie: {cookie}\r\n\r\n"
                ),
                address = self.address,
                cookie = self.cookie,
                version_name = GATEWAY_CONTRACT_VERSION_HEADER_NAME_V1,
                version = CONTRACT_VERSION_V1_0,
            )
        }

        fn product_read_request(&self, method: &str, path: &str, token: &str) -> String {
            format!(
                concat!(
                    "{method} {path} HTTP/1.1\r\n",
                    "Host: {address}\r\n",
                    "{version_name}: {version}\r\n",
                    "Sec-Fetch-Site: same-origin\r\n",
                    "Cookie: {cookie_name}={token}\r\n",
                    "Connection: close\r\n\r\n"
                ),
                method = method,
                path = path,
                address = self.address,
                version_name = GATEWAY_CONTRACT_VERSION_HEADER_NAME_V1,
                version = CONTRACT_VERSION_V1_0,
                cookie_name = lnsat_auth::LOCAL_SESSION_COOKIE_NAME_V1,
                token = token,
            )
        }

        fn session_issue_request(&self, body: &str) -> String {
            format!(
                concat!(
                    "POST /v1/session HTTP/1.1\r\n",
                    "Host: {address}\r\n",
                    "{version_name}: {version}\r\n",
                    "Origin: http://{address}\r\n",
                    "Sec-Fetch-Site: same-origin\r\n",
                    "Content-Type: application/json\r\n",
                    "{intent_name}: {intent_value}\r\n",
                    "Content-Length: {content_length}\r\n\r\n",
                    "{body}"
                ),
                address = self.address,
                version_name = GATEWAY_CONTRACT_VERSION_HEADER_NAME_V1,
                version = CONTRACT_VERSION_V1_0,
                intent_name = LOCAL_SESSION_ISSUE_INTENT_HEADER_NAME_V1,
                intent_value = LOCAL_SESSION_ISSUE_INTENT_HEADER_VALUE_V1,
                content_length = body.len(),
                body = body,
            )
        }

        fn session_family_sign_out_request(&self) -> String {
            format!(
                concat!(
                    "DELETE /v1/session HTTP/1.1\r\n",
                    "Host: {address}\r\n",
                    "{version_name}: {version}\r\n",
                    "Origin: http://{address}\r\n",
                    "Sec-Fetch-Site: same-origin\r\n",
                    "Content-Type: application/json\r\n",
                    "Content-Length: 0\r\n",
                    "Cookie: {cookie}\r\n",
                    "{csrf_name}: {csrf_token}\r\n\r\n"
                ),
                address = self.address,
                version_name = GATEWAY_CONTRACT_VERSION_HEADER_NAME_V1,
                version = CONTRACT_VERSION_V1_0,
                cookie = self.cookie,
                csrf_name = LOCAL_CSRF_HEADER_NAME_V1,
                csrf_token = self.csrf_token,
            )
        }

        fn session_rotation_request(&self) -> String {
            format!(
                concat!(
                    "PATCH /v1/session HTTP/1.1\r\n",
                    "Host: {address}\r\n",
                    "{version_name}: {version}\r\n",
                    "Origin: http://{address}\r\n",
                    "Sec-Fetch-Site: same-origin\r\n",
                    "Content-Type: application/json\r\n",
                    "Content-Length: 0\r\n",
                    "Cookie: {cookie}\r\n",
                    "{csrf_name}: {csrf_token}\r\n\r\n"
                ),
                address = self.address,
                version_name = GATEWAY_CONTRACT_VERSION_HEADER_NAME_V1,
                version = CONTRACT_VERSION_V1_0,
                cookie = self.cookie,
                csrf_name = LOCAL_CSRF_HEADER_NAME_V1,
                csrf_token = self.csrf_token,
            )
        }

        fn password_rotation_request(&self, body: &str) -> String {
            format!(
                concat!(
                    "PATCH /v1/identity/password HTTP/1.1\r\n",
                    "Host: {address}\r\n",
                    "{version_name}: {version}\r\n",
                    "Origin: http://{address}\r\n",
                    "Sec-Fetch-Site: same-origin\r\n",
                    "Content-Type: application/json\r\n",
                    "Content-Length: {content_length}\r\n",
                    "Cookie: {cookie}\r\n",
                    "{csrf_name}: {csrf_token}\r\n\r\n",
                    "{body}"
                ),
                address = self.address,
                version_name = GATEWAY_CONTRACT_VERSION_HEADER_NAME_V1,
                version = CONTRACT_VERSION_V1_0,
                content_length = body.len(),
                cookie = self.cookie,
                csrf_name = LOCAL_CSRF_HEADER_NAME_V1,
                csrf_token = self.csrf_token,
                body = body,
            )
        }

        fn identity_creation_request(&self, body: &str) -> String {
            format!(
                concat!(
                    "POST /v1/identities HTTP/1.1\r\n",
                    "Host: {address}\r\n",
                    "{version_name}: {version}\r\n",
                    "Origin: http://{address}\r\n",
                    "Sec-Fetch-Site: same-origin\r\n",
                    "Content-Type: application/json\r\n",
                    "Content-Length: {content_length}\r\n",
                    "Cookie: {cookie}\r\n",
                    "{csrf_name}: {csrf_token}\r\n\r\n",
                    "{body}"
                ),
                address = self.address,
                version_name = GATEWAY_CONTRACT_VERSION_HEADER_NAME_V1,
                version = CONTRACT_VERSION_V1_0,
                content_length = body.len(),
                cookie = self.cookie,
                csrf_name = LOCAL_CSRF_HEADER_NAME_V1,
                csrf_token = self.csrf_token,
                body = body,
            )
        }

        fn approval_decision_request(&self, approval_request_id: &str, body: &str) -> String {
            format!(
                concat!(
                    "POST /v1/approval-requests/{approval_request_id}/decision HTTP/1.1\r\n",
                    "Host: {address}\r\n",
                    "{version_name}: {version}\r\n",
                    "Origin: http://{address}\r\n",
                    "Sec-Fetch-Site: same-origin\r\n",
                    "Content-Type: application/json\r\n",
                    "Content-Length: {content_length}\r\n",
                    "Cookie: {cookie}\r\n",
                    "{csrf_name}: {csrf_token}\r\n\r\n",
                    "{body}"
                ),
                approval_request_id = approval_request_id,
                address = self.address,
                version_name = GATEWAY_CONTRACT_VERSION_HEADER_NAME_V1,
                version = CONTRACT_VERSION_V1_0,
                content_length = body.len(),
                cookie = self.cookie,
                csrf_name = LOCAL_CSRF_HEADER_NAME_V1,
                csrf_token = self.csrf_token,
                body = body,
            )
        }

        fn approval_request_creation_request(&self, body: &str) -> String {
            format!(
                concat!(
                    "POST /v1/approval-requests HTTP/1.1\r\n",
                    "Host: {address}\r\n",
                    "{version_name}: {version}\r\n",
                    "Origin: http://{address}\r\n",
                    "Sec-Fetch-Site: same-origin\r\n",
                    "Content-Type: application/json\r\n",
                    "Content-Length: {content_length}\r\n",
                    "Cookie: {cookie}\r\n",
                    "{csrf_name}: {csrf_token}\r\n\r\n",
                    "{body}"
                ),
                address = self.address,
                version_name = GATEWAY_CONTRACT_VERSION_HEADER_NAME_V1,
                version = CONTRACT_VERSION_V1_0,
                content_length = body.len(),
                cookie = self.cookie,
                csrf_name = LOCAL_CSRF_HEADER_NAME_V1,
                csrf_token = self.csrf_token,
                body = body,
            )
        }

        fn seed_approval_policy(
            &self,
            requester_ref: &str,
            session_ref: &str,
        ) -> lnsat_contracts::PolicyDecisionV1 {
            let fixture: serde_json::Value = serde_json::from_str(include_str!(
                "../../../fixtures/contracts/packet-envelope-v1_0.json"
            ))
            .expect("packet fixture wrapper should parse");
            let packet_json = serde_json::to_vec(&fixture["vectors"][0]["packet"])
                .expect("packet fixture should serialize");
            let mut packet = lnsat_contracts::parse_packet_envelope_v1(&packet_json)
                .expect("packet fixture should parse");
            let sequence = NEXT_TEST_DIRECTORY.fetch_add(1, Ordering::Relaxed);
            let now = SystemTime::now();
            packet.packet_id = format!("pkt_approval_route_{sequence}");
            packet.idempotency_key = format!("idem_approval_route_{sequence}");
            packet.actor_ref = requester_ref.to_owned();
            packet.session_ref = session_ref.to_owned();
            packet.permission_allow = vec!["deploy.request".to_owned()];
            packet.requires_approval = true;
            packet.created_at = canonical_system_time_v1(
                now.checked_sub(Duration::from_secs(1))
                    .expect("fixture clock should subtract"),
            )
            .expect("fixture creation time should format");
            packet.expires_at = canonical_system_time_v1(
                now.checked_add(Duration::from_mins(10))
                    .expect("fixture clock should add"),
            )
            .expect("fixture expiry should format");
            let evaluated_at =
                canonical_system_time_v1(now).expect("fixture evaluation time should format");
            let policy = lnsat_contracts::decide_packet_envelope_policy_v1(&packet, &evaluated_at)
                .expect("approval-required policy should derive");
            let mut store = SqliteStore::open(self.directory.database_path())
                .expect("fixture store should reopen");
            store
                .append_packet_envelope_v1(&packet)
                .expect("fixture packet should append");
            store
                .append_policy_decision_v1(&policy)
                .expect("fixture policy should append");
            policy
        }

        fn seed_approval_request(&self, requester_ref: &str) -> lnsat_contracts::ApprovalRequestV1 {
            let policy = self.seed_approval_policy(requester_ref, "session:local:requester-seed");
            let approval_request =
                lnsat_contracts::create_approval_request_v1(&policy, &policy.evaluated_at)
                    .expect("approval request should derive");
            let mut store = SqliteStore::open(self.directory.database_path())
                .expect("fixture store should reopen");
            store
                .append_approval_request_v1(&approval_request)
                .expect("fixture approval request should append");
            approval_request
        }

        fn identity_disablement_request(&self, identity_ref: &str) -> String {
            format!(
                concat!(
                    "DELETE /v1/identities/{identity_ref} HTTP/1.1\r\n",
                    "Host: {address}\r\n",
                    "{version_name}: {version}\r\n",
                    "Origin: http://{address}\r\n",
                    "Sec-Fetch-Site: same-origin\r\n",
                    "Content-Type: application/json\r\n",
                    "Content-Length: 0\r\n",
                    "Cookie: {cookie}\r\n",
                    "{csrf_name}: {csrf_token}\r\n\r\n"
                ),
                identity_ref = identity_ref,
                address = self.address,
                version_name = GATEWAY_CONTRACT_VERSION_HEADER_NAME_V1,
                version = CONTRACT_VERSION_V1_0,
                cookie = self.cookie,
                csrf_name = LOCAL_CSRF_HEADER_NAME_V1,
                csrf_token = self.csrf_token,
            )
        }

        fn identity_event_read_request(&self, method: &str, identity_ref: &str) -> String {
            format!(
                concat!(
                    "{method} /v1/identities/{identity_ref}/events HTTP/1.1\r\n",
                    "Host: {address}\r\n",
                    "{version_name}: {version}\r\n",
                    "Sec-Fetch-Site: same-origin\r\n",
                    "Cookie: {cookie}\r\n\r\n"
                ),
                method = method,
                identity_ref = identity_ref,
                address = self.address,
                version_name = GATEWAY_CONTRACT_VERSION_HEADER_NAME_V1,
                version = CONTRACT_VERSION_V1_0,
                cookie = self.cookie,
            )
        }

        fn session_event_read_request(&self, method: &str, session_id: &str) -> String {
            format!(
                concat!(
                    "{method} /v1/sessions/{session_id}/events HTTP/1.1\r\n",
                    "Host: {address}\r\n",
                    "{version_name}: {version}\r\n",
                    "Sec-Fetch-Site: same-origin\r\n",
                    "Cookie: {cookie}\r\n\r\n"
                ),
                method = method,
                session_id = session_id,
                address = self.address,
                version_name = GATEWAY_CONTRACT_VERSION_HEADER_NAME_V1,
                version = CONTRACT_VERSION_V1_0,
                cookie = self.cookie,
            )
        }

        fn create_non_owner(
            &self,
            identity_ref: &str,
            display_name: &str,
            role: lnsat_store::LocalIdentityRoleV1,
            password: &str,
        ) {
            let changed_at =
                canonical_system_time_v1(SystemTime::now()).expect("trusted clock should format");
            let mut store = SqliteStore::open(self.directory.database_path())
                .expect("fixture store should reopen");
            store
                .create_local_identity_v1(
                    &lnsat_store::LocalIdentityCreateInputV1 {
                        identity_ref,
                        display_name,
                        role,
                        password,
                        created_at: &changed_at,
                    },
                    &self.session_token,
                    &self.csrf_token,
                    &changed_at,
                )
                .expect("owner fixture should create non-owner");
        }

        fn stop(mut self) {
            self.shutdown.request_shutdown();
            self.server_thread
                .take()
                .expect("server thread should exist")
                .join()
                .expect("server thread should join")
                .expect("server should shut down cleanly");
        }
    }

    impl Drop for ServedSessionGatewayFixture {
        fn drop(&mut self) {
            self.shutdown.request_shutdown();
            if let Some(server_thread) = self.server_thread.take() {
                let _ = server_thread.join();
            }
        }
    }

    #[test]
    fn configuration_defaults_to_fixed_ipv4_loopback() {
        let directory = TestDirectory::new("default");
        let config = DaemonConfigV1::for_database(directory.database_path())
            .expect("default config should validate");

        assert_eq!(config.listen_address(), DEFAULT_LISTEN_ADDRESS_V1);
        assert_eq!(config.database_path(), directory.database_path());
    }

    #[test]
    fn configuration_accepts_explicit_ipv6_loopback() {
        let config = DaemonConfigV1::new(
            "lnsat.sqlite3",
            "[::1]:7447".parse().expect("valid IPv6 socket"),
        )
        .expect("IPv6 loopback should validate");

        assert_eq!(
            config.listen_address(),
            "[::1]:7447".parse().expect("valid IPv6 socket")
        );
    }

    #[test]
    fn configuration_rejects_empty_remote_unspecified_and_zero_port() {
        assert_eq!(
            DaemonConfigV1::for_database("").expect_err("empty path should fail"),
            DaemonErrorV1::DatabasePathRequired
        );
        for address in ["0.0.0.0:7447", "192.0.2.1:7447", "[::]:7447"] {
            assert_eq!(
                DaemonConfigV1::new("lnsat.sqlite3", address.parse().expect("valid socket"))
                    .expect_err("non-loopback should fail"),
                DaemonErrorV1::NonLoopbackAddress
            );
        }
        assert_eq!(
            DaemonConfigV1::new(
                "lnsat.sqlite3",
                "127.0.0.1:0".parse().expect("valid socket")
            )
            .expect_err("zero port should fail"),
            DaemonErrorV1::PortZeroForbidden
        );
    }

    #[test]
    fn cli_requires_database_and_rejects_ambiguous_arguments() {
        assert_eq!(
            parse_daemon_args_v1(["lnsatd"]).expect_err("database should be required"),
            DaemonErrorV1::DatabasePathRequired
        );
        assert_eq!(
            parse_daemon_args_v1(["lnsatd", "--database"]).expect_err("value should be required"),
            DaemonErrorV1::ArgumentValueRequired
        );
        assert_eq!(
            parse_daemon_args_v1([
                "lnsatd",
                "--database",
                "a.sqlite3",
                "--database",
                "b.sqlite3",
            ])
            .expect_err("duplicate option should fail"),
            DaemonErrorV1::InvalidArguments
        );
        assert_eq!(
            parse_daemon_args_v1([
                "lnsatd",
                "--database",
                "a.sqlite3",
                "--listen",
                "localhost:1"
            ])
            .expect_err("hostname should fail"),
            DaemonErrorV1::InvalidListenAddress
        );
    }

    #[test]
    fn cli_help_currentness_and_version_do_not_require_storage() {
        let usage = daemon_usage_v1();
        let stable_heading = usage
            .find("Stable source contracts:\n")
            .expect("stable heading should be present");
        let experimental_heading = usage
            .find("Source-local experimental endpoints:\n")
            .expect("experimental heading should be present");
        assert!(stable_heading < experimental_heading);
        let decision_route = "POST /v1/approval-requests/{approval_request_id}/decision (authenticated human decision)";
        assert!(usage[stable_heading..experimental_heading].contains(decision_route));
        assert!(!usage[experimental_heading..].contains(decision_route));

        assert_eq!(
            parse_daemon_args_v1(["lnsatd", "--help"]).expect("help should parse"),
            DaemonCliActionV1::Help
        );
        assert_eq!(
            parse_daemon_args_v1(["lnsatd", "--version"]).expect("version should parse"),
            DaemonCliActionV1::Version
        );
        assert_eq!(
            parse_daemon_args_v1(["lnsatd", "--manifest"]).expect("manifest should parse"),
            DaemonCliActionV1::Manifest
        );
        assert_eq!(
            parse_daemon_args_v1(["lnsatd", "--help", "--database", "a.sqlite3"])
                .expect_err("mixed help should fail"),
            DaemonErrorV1::InvalidArguments
        );
    }

    #[test]
    fn storage_opens_and_verifies_before_listener_is_returned() {
        let directory = TestDirectory::new("startup");
        let database_path = directory.database_path();
        let config = DaemonConfigV1::for_test(&database_path);
        let server = DaemonServerV1::bind(&config).expect("server should bind");

        assert!(server.local_addr().ip().is_loopback());
        assert!(database_path.is_file());
        assert_eq!(
            server.store_state.schema_version,
            lnsat_store::SQLITE_SCHEMA_VERSION
        );
        assert!(server.store_state.integrity_ok);
    }

    #[test]
    fn daemon_lease_blocks_offline_owner_recovery_until_server_drop() {
        let directory = TestDirectory::new("offline-recovery-exclusion");
        let database_path = directory.database_path();
        let server = DaemonServerV1::bind(&DaemonConfigV1::for_test(&database_path))
            .expect("server should bind");
        assert!(matches!(
            lnsat_store::acquire_offline_owner_recovery_authority_v1(&database_path),
            Err(lnsat_store::LocalOwnerRecoveryErrorV1::DatabaseBusy)
        ));
        drop(server);
        let _authority = lnsat_store::acquire_offline_owner_recovery_authority_v1(&database_path)
            .expect("offline recovery authority should acquire after server drop");
    }

    #[test]
    fn invalid_storage_fails_before_listener_creation() {
        let directory = TestDirectory::new("bad-storage");
        let database_path = directory.database_path();
        fs::write(&database_path, b"not sqlite").expect("invalid database should be written");
        let config = DaemonConfigV1::for_test(database_path);

        assert_eq!(
            DaemonServerV1::bind(&config)
                .err()
                .expect("invalid storage should fail"),
            DaemonErrorV1::StoreOpenFailed
        );
    }

    #[test]
    fn readiness_reports_verified_store_and_zero_mutation_authority() {
        let response = request_once("ready", b"GET /healthz HTTP/1.1\r\nHost: 127.0.0.1\r\n\r\n");

        assert_eq!(
            response,
            concat!(
                "HTTP/1.1 200 OK\r\n",
                "Content-Type: application/json\r\n",
                "Content-Length: 151\r\n",
                "Cache-Control: no-store\r\n",
                "Content-Security-Policy: default-src 'none'; frame-ancestors 'none'\r\n",
                "Cross-Origin-Resource-Policy: same-origin\r\n",
                "Referrer-Policy: no-referrer\r\n",
                "Permissions-Policy: camera=(), microphone=(), geolocation=()\r\n",
                "X-Content-Type-Options: nosniff\r\n",
                "Connection: close\r\n\r\n",
                "{\"contract\":\"lnsat.daemon.readiness.v1_0\",\"status\":\"ready\",",
                "\"schema_version\":17,\"migration_count\":17,",
                "\"bind_scope\":\"loopback\",\"mutation_authority\":false}"
            )
        );

        assert!(response.starts_with("HTTP/1.1 200 OK\r\n"));
        assert!(response.contains("\"contract\":\"lnsat.daemon.readiness.v1_0\""));
        assert!(response.contains(&format!(
            "\"schema_version\":{}",
            lnsat_store::SQLITE_SCHEMA_VERSION
        )));
        assert!(response.contains(&format!(
            "\"migration_count\":{}",
            lnsat_store::SQLITE_SCHEMA_VERSION
        )));
        assert!(response.contains("\"bind_scope\":\"loopback\""));
        assert!(response.contains("\"mutation_authority\":false"));
        assert!(response.contains("Cache-Control: no-store\r\n"));
        assert!(response.contains("Content-Security-Policy: default-src 'none'"));
    }

    #[test]
    fn readiness_rejects_mutation_unknown_route_and_malformed_host() {
        let mutation = request_once(
            "method",
            b"POST /healthz HTTP/1.1\r\nHost: 127.0.0.1\r\nContent-Length: 0\r\n\r\n",
        );
        assert!(mutation.starts_with("HTTP/1.1 405 Method Not Allowed\r\n"));
        assert!(mutation.contains("Allow: GET\r\n"));

        let unknown = request_once(
            "unknown",
            concat!(
                "GET /v1/unknown HTTP/1.1\r\n",
                "Host: 127.0.0.1\r\n",
                "LNSAT-Contract-Version: lnsat.contracts.v1_0\r\n\r\n"
            )
            .as_bytes(),
        );
        assert!(unknown.starts_with("HTTP/1.1 404 Not Found\r\n"));

        let duplicate_host = request_once(
            "host",
            b"GET /healthz HTTP/1.1\r\nHost: one\r\nHost: two\r\n\r\n",
        );
        assert!(duplicate_host.starts_with("HTTP/1.1 400 Bad Request\r\n"));

        let missing_host = request_once("missing-host", b"GET /healthz HTTP/1.1\r\n\r\n");
        assert!(missing_host.starts_with("HTTP/1.1 400 Bad Request\r\n"));

        let unrelated_host = request_once(
            "unrelated-host",
            b"GET /healthz HTTP/1.1\r\nHost: example.test\r\n\r\n",
        );
        assert!(unrelated_host.starts_with("HTTP/1.1 400 Bad Request\r\n"));

        let body_on_readiness = request_once(
            "readiness-body",
            b"GET /healthz HTTP/1.1\r\nHost: 127.0.0.1\r\nContent-Length: 1\r\n\r\nx",
        );
        assert!(body_on_readiness.starts_with("HTTP/1.1 400 Bad Request\r\n"));
    }

    #[test]
    fn gateway_root_negotiates_exact_stable_contract_without_authority() {
        let valid = concat!(
            "GET /v1 HTTP/1.1\r\n",
            "Host: 127.0.0.1\r\n",
            "LNSAT-Contract-Version: lnsat.contracts.v1_0\r\n\r\n"
        );
        let get_response = request_once("gateway-negotiation", valid.as_bytes());
        assert!(get_response.starts_with("HTTP/1.1 200 OK\r\n"));
        assert!(get_response.contains("LNSAT-Contract-Version: lnsat.contracts.v1_0\r\n"));
        assert!(get_response.contains("\"contract\":\"lnsat.gateway.negotiation.v1_0\""));
        assert!(get_response.contains("\"contract_version\":\"lnsat.contracts.v1_0\""));
        assert!(get_response.contains("\"stability\":\"stable\""));
        assert!(get_response.contains("\"negotiation\":\"exact_match\""));
        assert!(get_response.contains("\"bind_scope\":\"loopback\""));
        assert!(get_response.contains("\"side_effects\":[]"));
        assert!(get_response.contains("\"mutation_authority\":false"));

        let head = valid.replacen("GET ", "HEAD ", 1);
        let head_response = request_once("gateway-negotiation-head", head.as_bytes());
        assert!(head_response.starts_with("HTTP/1.1 200 OK\r\n"));
        assert!(head_response.contains("LNSAT-Contract-Version: lnsat.contracts.v1_0\r\n"));
        let (_, head_body) = head_response
            .split_once("\r\n\r\n")
            .expect("HEAD response should contain one header boundary");
        assert!(head_body.is_empty());
        let get_length = get_response
            .lines()
            .find_map(|line| line.strip_prefix("Content-Length: "))
            .expect("GET response should contain length");
        let head_length = head_response
            .lines()
            .find_map(|line| line.strip_prefix("Content-Length: "))
            .expect("HEAD response should contain length");
        assert_eq!(head_length, get_length);
    }

    #[test]
    fn gateway_root_rejects_missing_malformed_unsupported_and_deprecated_versions() {
        for (label, version_header, expected_code) in [
            ("gateway-version-required", "", "contract.version.required"),
            (
                "gateway-version-malformed",
                "LNSAT-Contract-Version: lnsat.contracts.v1.0\r\n",
                "contract.version.malformed",
            ),
            (
                "gateway-version-unsupported",
                "LNSAT-Contract-Version: lnsat.contracts.v1_1\r\n",
                "contract.version.unsupported",
            ),
            (
                "gateway-version-no-downgrade",
                "LNSAT-Contract-Version: lnsat.contracts.v0_1\r\n",
                "contract.version.unsupported",
            ),
        ] {
            let request = format!("GET /v1 HTTP/1.1\r\nHost: 127.0.0.1\r\n{version_header}\r\n");
            let response = request_once(label, request.as_bytes());
            assert!(response.starts_with("HTTP/1.1 400 Bad Request\r\n"));
            assert!(response.contains("\"ok\":false"));
            assert!(response.contains("\"version\":null"));
            assert!(response.contains(expected_code));
            assert!(response.contains("\"path\":\"/version\""));
            assert!(response.contains("\"severity\":\"error\""));
            assert!(response.contains("\"side_effects\":[]"));
            assert!(!response.contains("LNSAT-Contract-Version: lnsat.contracts."));
        }
    }

    #[test]
    fn gateway_root_refuses_mutation_body_host_drift_and_duplicate_version_header() {
        let mutation = request_once(
            "gateway-negotiation-method",
            concat!(
                "POST /v1 HTTP/1.1\r\n",
                "Host: 127.0.0.1\r\n",
                "LNSAT-Contract-Version: lnsat.contracts.v1_0\r\n",
                "Content-Length: 0\r\n\r\n"
            )
            .as_bytes(),
        );
        assert!(mutation.starts_with("HTTP/1.1 405 Method Not Allowed\r\n"));
        assert!(mutation.contains("Allow: GET, HEAD\r\n"));

        let body = request_once(
            "gateway-negotiation-body",
            concat!(
                "GET /v1 HTTP/1.1\r\n",
                "Host: 127.0.0.1\r\n",
                "LNSAT-Contract-Version: lnsat.contracts.v1_0\r\n",
                "Content-Length: 1\r\n\r\nx"
            )
            .as_bytes(),
        );
        assert!(body.starts_with("HTTP/1.1 400 Bad Request\r\n"));

        let host_drift = request_once(
            "gateway-negotiation-host",
            concat!(
                "GET /v1 HTTP/1.1\r\n",
                "Host: example.test\r\n",
                "LNSAT-Contract-Version: lnsat.contracts.v1_0\r\n\r\n"
            )
            .as_bytes(),
        );
        assert!(host_drift.starts_with("HTTP/1.1 400 Bad Request\r\n"));

        let duplicate = request_once(
            "gateway-negotiation-duplicate",
            concat!(
                "GET /v1 HTTP/1.1\r\n",
                "Host: 127.0.0.1\r\n",
                "LNSAT-Contract-Version: lnsat.contracts.v1_0\r\n",
                "lnsat-contract-version: lnsat.contracts.v1_0\r\n\r\n"
            )
            .as_bytes(),
        );
        assert!(duplicate.starts_with("HTTP/1.1 400 Bad Request\r\n"));
    }

    #[test]
    fn gateway_subroutes_require_exact_version_before_authentication() {
        for (label, version_header, expected_code) in [
            (
                "gateway-subroute-version-required",
                "",
                "contract.version.required",
            ),
            (
                "gateway-subroute-version-malformed",
                "LNSAT-Contract-Version: lnsat.contracts.v1.0\r\n",
                "contract.version.malformed",
            ),
            (
                "gateway-subroute-version-unsupported",
                "LNSAT-Contract-Version: lnsat.contracts.v1_1\r\n",
                "contract.version.unsupported",
            ),
            (
                "gateway-subroute-version-no-downgrade",
                "LNSAT-Contract-Version: lnsat.contracts.v0_1\r\n",
                "contract.version.unsupported",
            ),
        ] {
            let request = format!(
                concat!(
                    "GET /v1/session HTTP/1.1\r\n",
                    "Host: 127.0.0.1\r\n",
                    "{version_header}\r\n"
                ),
                version_header = version_header
            );
            let response = request_once(label, request.as_bytes());
            assert!(response.starts_with("HTTP/1.1 400 Bad Request\r\n"));
            assert!(response.contains("\"version\":null"));
            assert!(response.contains(expected_code));
            assert!(response.contains("\"side_effects\":[]"));
            assert!(!response.contains("lnsatd.browser_transport.rejected"));
            assert!(!response.contains("LNSAT-Contract-Version: lnsat.contracts."));
        }

        let head = request_once(
            "gateway-subroute-version-head",
            b"HEAD /v1/session HTTP/1.1\r\nHost: 127.0.0.1\r\n\r\n",
        );
        assert!(head.starts_with("HTTP/1.1 400 Bad Request\r\n"));
        assert!(!head.contains("Content-Length: 0\r\n"));
        let (_, body) = head
            .split_once("\r\n\r\n")
            .expect("HEAD rejection should contain one header boundary");
        assert!(body.is_empty());

        let host_drift = request_once(
            "gateway-subroute-version-host",
            b"GET /v1/session HTTP/1.1\r\nHost: example.test\r\n\r\n",
        );
        assert!(host_drift.starts_with("HTTP/1.1 400 Bad Request\r\n"));
        assert!(host_drift.contains("lnsatd.request.invalid"));
        assert!(!host_drift.contains("contract.version."));
    }

    #[test]
    fn authenticated_health_and_status_get_head_and_roles_match_fixtures() {
        let fixture = ServedSessionGatewayFixture::start("product-health-status-success");
        for (path, expected) in [
            (
                AUTHENTICATED_HEALTH_PATH_V1,
                include_str!("../../../fixtures/contracts/phase10-health-v1.json"),
            ),
            (
                AUTHENTICATED_STATUS_PATH_V1,
                include_str!("../../../fixtures/contracts/phase10-status-v1.json"),
            ),
        ] {
            let request = fixture.product_read_request("GET", path, &fixture.session_token);
            let get = request_at(fixture.address, request.as_bytes());
            assert!(get.starts_with("HTTP/1.1 200 OK\r\n"));
            assert!(get.contains("LNSAT-Contract-Version: lnsat.contracts.v1_0\r\n"));
            let (_, body) = get
                .split_once("\r\n\r\n")
                .expect("GET must contain header boundary");
            assert_eq!(
                serde_json::from_str::<serde_json::Value>(body).expect("GET body must be JSON"),
                serde_json::from_str::<serde_json::Value>(expected)
                    .expect("frozen fixture must be JSON")
            );
            let head_request = fixture.product_read_request("HEAD", path, &fixture.session_token);
            let head = request_at(fixture.address, head_request.as_bytes());
            assert!(head.starts_with("HTTP/1.1 200 OK\r\n"));
            let (_, head_body) = head
                .split_once("\r\n\r\n")
                .expect("HEAD must contain header boundary");
            assert!(head_body.is_empty());
            let get_length = get
                .lines()
                .find_map(|line| line.strip_prefix("Content-Length: "))
                .expect("GET content length must exist");
            let head_length = head
                .lines()
                .find_map(|line| line.strip_prefix("Content-Length: "))
                .expect("HEAD content length must exist");
            assert_eq!(head_length, get_length);
        }

        for (role, identity_ref, display_name, password) in [
            (
                LocalIdentityRoleV1::Operator,
                "identity:human:product-operator",
                "Product Operator",
                "operator product password 2026",
            ),
            (
                LocalIdentityRoleV1::Auditor,
                "identity:human:product-auditor",
                "Product Auditor",
                "auditor product password 2026",
            ),
        ] {
            assert!(role.allows_control(LocalControlPermissionV1::ReadEvidence));
            fixture.create_non_owner(identity_ref, display_name, role, password);
            let now = SystemTime::now();
            let issued_at = canonical_system_time_v1(now).expect("current time must format");
            let expires_at = canonical_system_time_v1(
                now.checked_add(Duration::from_mins(5))
                    .expect("expiry must advance"),
            )
            .expect("expiry must format");
            let token = {
                let mut store = SqliteStore::open(fixture.directory.database_path())
                    .expect("fixture store must reopen");
                store
                    .issue_local_session_v1(&LocalSessionIssueInputV1 {
                        identity_ref,
                        password,
                        issued_at: &issued_at,
                        expires_at: &expires_at,
                    })
                    .expect("non-owner session must issue")
                    .raw_session_token
            };
            let request = fixture.product_read_request("GET", AUTHENTICATED_STATUS_PATH_V1, &token);
            let response = request_at(fixture.address, request.as_bytes());
            assert!(response.starts_with("HTTP/1.1 200 OK\r\n"));
            assert!(!response.contains(identity_ref));
            assert!(!response.contains(&token));
        }
    }

    #[test]
    fn authenticated_product_reads_fail_closed_without_oracles_or_ambiguous_framing() {
        let fixture = ServedSessionGatewayFixture::start("product-health-status-denials");
        let missing_cookie = format!(
            concat!(
                "GET /v1/health HTTP/1.1\r\n",
                "Host: {address}\r\n",
                "{version_name}: {version}\r\n",
                "Sec-Fetch-Site: same-origin\r\n\r\n"
            ),
            address = fixture.address,
            version_name = GATEWAY_CONTRACT_VERSION_HEADER_NAME_V1,
            version = CONTRACT_VERSION_V1_0,
        );
        let missing = request_at(fixture.address, missing_cookie.as_bytes());
        assert!(missing.starts_with("HTTP/1.1 403 Forbidden\r\n"));
        let (_, denial_body) = missing
            .split_once("\r\n\r\n")
            .expect("denial must contain header boundary");
        assert!(denial_body.contains(AUTHENTICATED_PRODUCT_READ_DENIAL_CODE_V1));

        for token in ["malformed", fixture.expired_session_token.as_str()] {
            let request = fixture.product_read_request("GET", AUTHENTICATED_HEALTH_PATH_V1, token);
            let response = request_at(fixture.address, request.as_bytes());
            assert!(response.starts_with("HTTP/1.1 403 Forbidden\r\n"));
            assert_eq!(
                response
                    .split_once("\r\n\r\n")
                    .expect("denial must contain header boundary")
                    .1,
                denial_body
            );
            assert!(!response.contains(token));
        }

        let sign_out = fixture.session_family_sign_out_request();
        assert!(request_at(fixture.address, sign_out.as_bytes()).starts_with("HTTP/1.1 200 OK"));
        let revoked = fixture.product_read_request(
            "GET",
            AUTHENTICATED_STATUS_PATH_V1,
            &fixture.session_token,
        );
        let revoked = request_at(fixture.address, revoked.as_bytes());
        assert!(revoked.starts_with("HTTP/1.1 403 Forbidden\r\n"));
        assert_eq!(
            revoked
                .split_once("\r\n\r\n")
                .expect("denial must contain header boundary")
                .1,
            denial_body
        );
        for forbidden in [
            fixture.session_token.as_str(),
            "identity:human:",
            "database_path",
            "/Users/",
        ] {
            assert!(!revoked.contains(forbidden));
        }

        let denied_head = missing_cookie.replacen("GET ", "HEAD ", 1);
        let denied_head = request_at(fixture.address, denied_head.as_bytes());
        assert!(denied_head.starts_with("HTTP/1.1 403 Forbidden\r\n"));
        assert!(
            denied_head
                .split_once("\r\n\r\n")
                .expect("HEAD denial must contain boundary")
                .1
                .is_empty()
        );

        for (request, status) in [
            (
                format!(
                    "POST /v1/health HTTP/1.1\r\nHost: {}\r\n{}: {}\r\nContent-Length: 0\r\n\r\n",
                    fixture.address, GATEWAY_CONTRACT_VERSION_HEADER_NAME_V1, CONTRACT_VERSION_V1_0
                ),
                "HTTP/1.1 405 Method Not Allowed",
            ),
            (
                format!(
                    "GET /v1/health?detail=1 HTTP/1.1\r\nHost: {}\r\n{}: {}\r\n\r\n",
                    fixture.address, GATEWAY_CONTRACT_VERSION_HEADER_NAME_V1, CONTRACT_VERSION_V1_0
                ),
                "HTTP/1.1 400 Bad Request",
            ),
            (
                format!(
                    "GET /v1/%68ealth HTTP/1.1\r\nHost: {}\r\n{}: {}\r\n\r\n",
                    fixture.address, GATEWAY_CONTRACT_VERSION_HEADER_NAME_V1, CONTRACT_VERSION_V1_0
                ),
                "HTTP/1.1 404 Not Found",
            ),
            (
                format!(
                    "GET /v1/status HTTP/1.1\r\nHost: {}\r\n{}: {}\r\nTransfer-Encoding: chunked\r\n\r\n",
                    fixture.address, GATEWAY_CONTRACT_VERSION_HEADER_NAME_V1, CONTRACT_VERSION_V1_0
                ),
                "HTTP/1.1 400 Bad Request",
            ),
        ] {
            assert!(request_at(fixture.address, request.as_bytes()).starts_with(status));
        }
    }

    #[test]
    fn served_session_gateway_returns_secret_free_get_and_exact_head() {
        let fixture = ServedSessionGatewayFixture::start("served-session-success");
        let valid_get = fixture.valid_get();
        let get_response = request_at(fixture.address, valid_get.as_bytes());
        assert!(get_response.starts_with("HTTP/1.1 200 OK\r\n"));
        assert!(get_response.contains("LNSAT-Contract-Version: lnsat.contracts.v1_0\r\n"));
        let (_, get_body) = get_response
            .split_once("\r\n\r\n")
            .expect("GET response should have one header boundary");
        assert_eq!(
            serde_json::from_str::<serde_json::Value>(get_body)
                .expect("session read should be JSON"),
            serde_json::json!({
                "contract": GATEWAY_SESSION_READ_CONTRACT_V1,
                "contract_version": CONTRACT_VERSION_V1_0,
                "ok": true,
                "status": "authenticated",
                "session": {
                    "session_id": fixture.issued.session().session_id,
                    "identity_ref": fixture.issued.session().identity_ref,
                    "role": fixture.issued.session().role.as_str(),
                    "issued_at": fixture.issued.session().issued_at,
                    "expires_at": fixture.issued.session().expires_at,
                },
                "transport": {
                    "bind_scope": "loopback",
                    "same_origin_required": true,
                    "cors_enabled": false,
                },
                "side_effects": [GATEWAY_SESSION_ACTIVITY_SIDE_EFFECT_V1],
                "mutation_authority": false,
            })
        );
        assert!(!get_response.contains(&fixture.session_token));
        assert!(!get_response.contains(&fixture.csrf_token));
        assert!(!get_response.contains("Set-Cookie:"));

        let valid_head = valid_get.replacen("GET ", "HEAD ", 1);
        let head_response = request_at(fixture.address, valid_head.as_bytes());
        assert!(head_response.starts_with("HTTP/1.1 200 OK\r\n"));
        let (_, head_body) = head_response
            .split_once("\r\n\r\n")
            .expect("HEAD response should have one header boundary");
        assert!(head_body.is_empty());
        let get_length = get_response
            .lines()
            .find_map(|line| line.strip_prefix("Content-Length: "))
            .expect("GET response should contain length");
        let head_length = head_response
            .lines()
            .find_map(|line| line.strip_prefix("Content-Length: "))
            .expect("HEAD response should contain length");
        assert_eq!(head_length, get_length);
        for response in [&get_response, &head_response] {
            assert!(!response.contains("Access-Control-Allow-"));
            assert!(!response.contains("Access-Control-Expose-"));
            assert!(response.contains("Cross-Origin-Resource-Policy: same-origin\r\n"));
            assert!(response.contains("Referrer-Policy: no-referrer\r\n"));
        }
        fixture.stop();
    }

    #[test]
    fn served_session_gateway_denies_cors_invalid_auth_and_unknown_routes() {
        let fixture = ServedSessionGatewayFixture::start("served-session-denials");
        let valid_get = fixture.valid_get();
        let preflight = format!(
            concat!(
                "OPTIONS /v1/session HTTP/1.1\r\n",
                "Host: {address}\r\n",
                "{version_name}: {version}\r\n",
                "Origin: http://{address}\r\n",
                "Sec-Fetch-Site: same-origin\r\n",
                "Access-Control-Request-Method: GET\r\n\r\n"
            ),
            address = fixture.address,
            version_name = GATEWAY_CONTRACT_VERSION_HEADER_NAME_V1,
            version = CONTRACT_VERSION_V1_0,
        );
        let preflight_response = request_at(fixture.address, preflight.as_bytes());
        assert!(preflight_response.starts_with("HTTP/1.1 405 Method Not Allowed\r\n"));
        assert!(preflight_response.contains("Allow: GET, HEAD, POST, PATCH, DELETE\r\n"));

        let cross_site =
            valid_get.replace("Sec-Fetch-Site: same-origin", "Sec-Fetch-Site: cross-site");
        let cross_site_response = request_at(fixture.address, cross_site.as_bytes());
        let missing_auth = format!(
            concat!(
                "GET /v1/session HTTP/1.1\r\n",
                "Host: {address}\r\n",
                "{version_name}: {version}\r\n",
                "Sec-Fetch-Site: same-origin\r\n\r\n"
            ),
            address = fixture.address,
            version_name = GATEWAY_CONTRACT_VERSION_HEADER_NAME_V1,
            version = CONTRACT_VERSION_V1_0,
        );
        let missing_auth_response = request_at(fixture.address, missing_auth.as_bytes());
        let expired_cookie = format!(
            "{}={}",
            lnsat_auth::LOCAL_SESSION_COOKIE_NAME_V1,
            fixture.expired_session_token
        );
        let expired_request = valid_get.replace(&fixture.cookie, &expired_cookie);
        let expired_response = request_at(fixture.address, expired_request.as_bytes());
        for response in [
            &cross_site_response,
            &missing_auth_response,
            &expired_response,
        ] {
            assert_stable_session_read_denial(response);
            assert!(!response.contains(&fixture.session_token));
            assert!(!response.contains(&fixture.csrf_token));
        }
        assert_eq!(cross_site_response, missing_auth_response);
        assert_eq!(missing_auth_response, expired_response);

        let denied_head = missing_auth.replacen("GET ", "HEAD ", 1);
        let denied_head_response = request_at(fixture.address, denied_head.as_bytes());
        assert!(denied_head_response.starts_with("HTTP/1.1 403 Forbidden\r\n"));
        assert!(denied_head_response.contains("LNSAT-Contract-Version: lnsat.contracts.v1_0\r\n"));
        let denied_get_length = missing_auth_response
            .lines()
            .find_map(|line| line.strip_prefix("Content-Length: "))
            .expect("denied GET should contain length");
        let denied_head_length = denied_head_response
            .lines()
            .find_map(|line| line.strip_prefix("Content-Length: "))
            .expect("denied HEAD should contain length");
        assert_eq!(denied_head_length, denied_get_length);
        let (_, denied_head_body) = denied_head_response
            .split_once("\r\n\r\n")
            .expect("denied HEAD should have one header boundary");
        assert!(denied_head_body.is_empty());

        let unknown = format!(
            concat!(
                "GET /v1/unknown HTTP/1.1\r\n",
                "Host: {address}\r\n",
                "{version_name}: {version}\r\n\r\n"
            ),
            address = fixture.address,
            version_name = GATEWAY_CONTRACT_VERSION_HEADER_NAME_V1,
            version = CONTRACT_VERSION_V1_0,
        );
        let unknown_response = request_at(fixture.address, unknown.as_bytes());
        assert!(unknown_response.starts_with("HTTP/1.1 404 Not Found\r\n"));

        for response in [
            &preflight_response,
            &cross_site_response,
            &missing_auth_response,
            &expired_response,
            &denied_head_response,
            &unknown_response,
        ] {
            assert!(response.contains("LNSAT-Contract-Version: lnsat.contracts.v1_0\r\n"));
            assert!(!response.contains("Access-Control-Allow-"));
            assert!(!response.contains("Access-Control-Expose-"));
            assert!(response.contains("Cross-Origin-Resource-Policy: same-origin\r\n"));
            assert!(response.contains("Referrer-Policy: no-referrer\r\n"));
        }
        fixture.stop();
    }

    #[test]
    fn served_session_issue_sets_host_only_cookies_and_returns_secret_free_evidence() {
        let fixture = ServedSessionGatewayFixture::start("served-session-issue-success");
        let password = "correct horse battery staple";
        let body = serde_json::json!({
            "identity_ref": "identity:human:owner",
            "password": password,
            "lifetime_seconds": 300,
        })
        .to_string();
        let request = fixture.session_issue_request(&body);
        let response = request_at(fixture.address, request.as_bytes());

        let issued_value = stable_session_issue_success_body(&response);
        assert_eq!(
            issued_value.pointer("/session/identity_ref"),
            Some(&serde_json::json!("identity:human:owner"))
        );
        assert_eq!(
            issued_value.pointer("/session/role"),
            Some(&serde_json::json!("owner"))
        );
        let replay_response = request_at(fixture.address, request.as_bytes());
        let replay_value = stable_session_issue_success_body(&replay_response);
        assert_ne!(
            replay_value.pointer("/session/session_id"),
            issued_value.pointer("/session/session_id")
        );
        assert!(!response.contains(password));
        assert!(!response.contains("Access-Control-Allow-"));
        assert!(!response.contains("Access-Control-Expose-"));
        assert!(!response.contains("WWW-Authenticate:"));

        let set_cookie_values = response
            .lines()
            .filter_map(|line| line.strip_prefix("Set-Cookie: "))
            .collect::<Vec<_>>();
        assert_eq!(set_cookie_values.len(), 2);
        assert!(set_cookie_values[0].starts_with("lnsat_session_v1="));
        assert!(set_cookie_values[0].contains("; Path=/; HttpOnly; SameSite=Strict; Max-Age=300"));
        assert!(set_cookie_values[1].starts_with("lnsat_csrf_v1="));
        assert!(set_cookie_values[1].contains("; Path=/; SameSite=Strict; Max-Age=300"));
        for value in &set_cookie_values {
            assert!(!value.contains("Domain="));
            assert!(!value.contains("Secure"));
        }

        let cookie = set_cookie_values
            .iter()
            .map(|value| value.split(';').next().expect("cookie pair should exist"))
            .collect::<Vec<_>>()
            .join("; ");
        let authenticated_get = format!(
            concat!(
                "GET /v1/session HTTP/1.1\r\n",
                "Host: {address}\r\n",
                "{version_name}: {version}\r\n",
                "Sec-Fetch-Site: same-origin\r\n",
                "Cookie: {cookie}\r\n\r\n"
            ),
            address = fixture.address,
            version_name = GATEWAY_CONTRACT_VERSION_HEADER_NAME_V1,
            version = CONTRACT_VERSION_V1_0,
            cookie = cookie,
        );
        let authenticated_response = request_at(fixture.address, authenticated_get.as_bytes());
        assert!(authenticated_response.starts_with("HTTP/1.1 200 OK\r\n"));
        let (_, authenticated_body) = authenticated_response
            .split_once("\r\n\r\n")
            .expect("authenticated response should have one header boundary");
        let authenticated_value: serde_json::Value =
            serde_json::from_str(authenticated_body).expect("session read body should be JSON");
        assert_eq!(
            issued_value
                .get("contract")
                .and_then(serde_json::Value::as_str),
            Some(GATEWAY_SESSION_ISSUE_CONTRACT_V1)
        );
        assert_eq!(
            authenticated_value
                .get("contract")
                .and_then(serde_json::Value::as_str),
            Some(GATEWAY_SESSION_READ_CONTRACT_V1)
        );
        assert_eq!(
            authenticated_value.get("session"),
            issued_value.get("session")
        );
        assert_eq!(
            authenticated_value.get("side_effects"),
            Some(&serde_json::json!([
                GATEWAY_SESSION_ACTIVITY_SIDE_EFFECT_V1
            ]))
        );
        fixture.stop();
    }

    #[test]
    #[allow(clippy::too_many_lines)]
    fn served_session_issue_rejects_login_csrf_schema_and_credential_oracles() {
        let fixture = ServedSessionGatewayFixture::start("served-session-issue-denials");
        let wrong_password = "wrong password phrase long enough";
        let wrong_body = serde_json::json!({
            "identity_ref": "identity:human:owner",
            "password": wrong_password,
            "lifetime_seconds": 300,
        })
        .to_string();
        let unknown_body = serde_json::json!({
            "identity_ref": "identity:human:unknown",
            "password": wrong_password,
            "lifetime_seconds": 300,
        })
        .to_string();
        let wrong_response = request_at(
            fixture.address,
            fixture.session_issue_request(&wrong_body).as_bytes(),
        );
        let unknown_response = request_at(
            fixture.address,
            fixture.session_issue_request(&unknown_body).as_bytes(),
        );
        assert_eq!(wrong_response, unknown_response);

        let valid_body = serde_json::json!({
            "identity_ref": "identity:human:owner",
            "password": "correct horse battery staple",
            "lifetime_seconds": 300,
        })
        .to_string();
        let valid_request = fixture.session_issue_request(&valid_body);
        let intent_name = LOCAL_SESSION_ISSUE_INTENT_HEADER_NAME_V1;
        let intent_value = LOCAL_SESSION_ISSUE_INTENT_HEADER_VALUE_V1;
        let missing_intent =
            valid_request.replace(&format!("{intent_name}: {intent_value}\r\n"), "");
        let cross_site =
            valid_request.replace("Sec-Fetch-Site: same-origin", "Sec-Fetch-Site: cross-site");
        let missing_fetch = valid_request.replace("Sec-Fetch-Site: same-origin\r\n", "");
        let wrong_origin = valid_request.replace("Origin: http://", "Origin: http://127.0.0.2:");
        let missing_origin =
            valid_request.replace(&format!("Origin: http://{}\r\n", fixture.address), "");
        let wrong_media_type =
            valid_request.replace("Content-Type: application/json", "Content-Type: text/plain");
        let duplicate_body = concat!(
            "{{\"identity_ref\":\"identity:human:owner\",",
            "\"identity_ref\":\"identity:human:owner\",",
            "\"password\":\"correct horse battery staple\",",
            "\"lifetime_seconds\":300}}"
        )
        .to_owned();
        let duplicate_fields = fixture.session_issue_request(&duplicate_body);
        let unknown_field_body = serde_json::json!({
            "identity_ref": "identity:human:owner",
            "password": "correct horse battery staple",
            "lifetime_seconds": 300,
            "execution_authorized": true,
        })
        .to_string();
        let unknown_field = fixture.session_issue_request(&unknown_field_body);
        let idempotency_body = serde_json::json!({
            "identity_ref": "identity:human:owner",
            "password": "correct horse battery staple",
            "lifetime_seconds": 300,
            "idempotency_key": "idem_login_replay",
        })
        .to_string();
        let forbidden_idempotency = fixture.session_issue_request(&idempotency_body);
        let short_password_body = serde_json::json!({
            "identity_ref": "identity:human:owner",
            "password": "too short",
            "lifetime_seconds": 300,
        })
        .to_string();
        let short_password = fixture.session_issue_request(&short_password_body);
        let short_lifetime_body = serde_json::json!({
            "identity_ref": "identity:human:owner",
            "password": "correct horse battery staple",
            "lifetime_seconds": 59,
        })
        .to_string();
        let short_lifetime = fixture.session_issue_request(&short_lifetime_body);
        let long_lifetime_body = serde_json::json!({
            "identity_ref": "identity:human:owner",
            "password": "correct horse battery staple",
            "lifetime_seconds": 3_601,
        })
        .to_string();
        let long_lifetime = fixture.session_issue_request(&long_lifetime_body);
        let malformed_json = fixture.session_issue_request("{");

        for response in [
            wrong_response,
            unknown_response,
            request_at(fixture.address, missing_intent.as_bytes()),
            request_at(fixture.address, cross_site.as_bytes()),
            request_at(fixture.address, missing_fetch.as_bytes()),
            request_at(fixture.address, wrong_origin.as_bytes()),
            request_at(fixture.address, missing_origin.as_bytes()),
            request_at(fixture.address, wrong_media_type.as_bytes()),
            request_at(fixture.address, duplicate_fields.as_bytes()),
            request_at(fixture.address, unknown_field.as_bytes()),
            request_at(fixture.address, forbidden_idempotency.as_bytes()),
            request_at(fixture.address, short_password.as_bytes()),
            request_at(fixture.address, short_lifetime.as_bytes()),
            request_at(fixture.address, long_lifetime.as_bytes()),
            request_at(fixture.address, malformed_json.as_bytes()),
        ] {
            assert_stable_session_issue_denial(&response);
            assert!(!response.contains("Access-Control-Allow-"));
            assert!(!response.contains(wrong_password));
            assert!(!response.contains("correct horse battery staple"));
            assert!(!response.contains("too short"));
        }

        let oversized = format!(
            concat!(
                "POST /v1/session HTTP/1.1\r\n",
                "Host: {address}\r\n",
                "Content-Length: {length}\r\n\r\n"
            ),
            address = fixture.address,
            length = MAX_REQUEST_BODY_BYTES_V1 + 1,
        );
        let oversized_response = request_at(fixture.address, oversized.as_bytes());
        assert!(oversized_response.starts_with("HTTP/1.1 413 Content Too Large\r\n"));
        assert!(oversized_response.contains("lnsatd.request.body_too_large"));
        assert!(!oversized_response.contains("Set-Cookie:"));

        let trailing_body = format!("{valid_request}x");
        let trailing_response = request_at(fixture.address, trailing_body.as_bytes());
        assert!(trailing_response.starts_with("HTTP/1.1 400 Bad Request\r\n"));
        assert!(!trailing_response.contains("Set-Cookie:"));

        let duplicate_length =
            valid_request.replace("Content-Length: ", "Content-Length: 1\r\nContent-Length: ");
        let duplicate_length_response = request_at(fixture.address, duplicate_length.as_bytes());
        assert!(duplicate_length_response.starts_with("HTTP/1.1 400 Bad Request\r\n"));
        assert!(!duplicate_length_response.contains("Set-Cookie:"));

        let wrong_host = valid_request.replace(
            &format!("Host: {}\r\n", fixture.address),
            "Host: 127.0.0.2\r\n",
        );
        let wrong_host_response = request_at(fixture.address, wrong_host.as_bytes());
        assert!(wrong_host_response.starts_with("HTTP/1.1 400 Bad Request\r\n"));
        assert!(wrong_host_response.contains("lnsatd.request.invalid"));
        assert!(!wrong_host_response.contains(GATEWAY_SESSION_ISSUE_CONTRACT_V1));
        assert!(!wrong_host_response.contains("LNSAT-Contract-Version:"));
        fixture.stop();
    }

    #[test]
    fn served_session_issue_uses_one_process_wide_rate_limit_across_connections() {
        let fixture = ServedSessionGatewayFixture::start("served-session-issue-rate-limit");
        let wrong_body = serde_json::json!({
            "identity_ref": "identity:human:owner",
            "password": "wrong password phrase long enough",
            "lifetime_seconds": 300,
        })
        .to_string();
        let wrong_request = fixture.session_issue_request(&wrong_body);
        let mut denial = None;
        for _ in 0..LOCAL_AUTH_MAX_ATTEMPTS_PER_IDENTITY_V1 {
            let response = request_at(fixture.address, wrong_request.as_bytes());
            assert!(response.starts_with("HTTP/1.1 403 Forbidden\r\n"));
            denial.get_or_insert_with(|| response.clone());
            assert_eq!(Some(&response), denial.as_ref());
        }

        let valid_body = serde_json::json!({
            "identity_ref": "identity:human:owner",
            "password": "correct horse battery staple",
            "lifetime_seconds": 300,
        })
        .to_string();
        let blocked_valid = request_at(
            fixture.address,
            fixture.session_issue_request(&valid_body).as_bytes(),
        );
        assert_eq!(Some(&blocked_valid), denial.as_ref());
        assert_stable_session_issue_denial(&blocked_valid);
        fixture.stop();
    }

    #[test]
    #[allow(clippy::too_many_lines)]
    fn served_session_rotation_replaces_secrets_and_revokes_prior_session() {
        let fixture = ServedSessionGatewayFixture::start("served-session-rotation");
        let request = fixture.session_rotation_request();
        let response = request_at(fixture.address, request.as_bytes());

        let rotated_value = stable_session_rotation_success_body(&response);
        assert_eq!(
            rotated_value.pointer("/prior_session_id"),
            Some(&serde_json::json!(fixture.issued.session().session_id))
        );
        assert_eq!(
            rotated_value.pointer("/session/identity_ref"),
            Some(&serde_json::json!("identity:human:owner"))
        );
        assert_eq!(
            rotated_value.pointer("/session/role"),
            Some(&serde_json::json!("owner"))
        );
        assert_eq!(
            rotated_value.pointer("/session/expires_at"),
            Some(&serde_json::json!(fixture.issued.session().expires_at))
        );
        assert!(!response.contains(&fixture.session_token));
        assert!(!response.contains(&fixture.csrf_token));
        assert!(!response.contains("Access-Control-Allow-"));
        assert!(!response.contains("WWW-Authenticate:"));

        let set_cookie_values = response
            .lines()
            .filter_map(|line| line.strip_prefix("Set-Cookie: "))
            .collect::<Vec<_>>();
        assert_eq!(set_cookie_values.len(), 2);
        assert!(set_cookie_values[0].starts_with("lnsat_session_v1="));
        assert!(set_cookie_values[0].contains("; Path=/; HttpOnly; SameSite=Strict; Max-Age="));
        assert!(set_cookie_values[1].starts_with("lnsat_csrf_v1="));
        assert!(set_cookie_values[1].contains("; Path=/; SameSite=Strict; Max-Age="));
        for value in &set_cookie_values {
            assert!(!value.contains("Domain="));
            assert!(!value.contains("Secure"));
            let max_age = value
                .split_once("Max-Age=")
                .and_then(|(_, value)| value.parse::<u64>().ok())
                .expect("replacement cookie should carry numeric Max-Age");
            assert!((1..=300).contains(&max_age));
        }

        let replacement_cookie = set_cookie_values
            .iter()
            .map(|value| {
                value
                    .split(';')
                    .next()
                    .expect("replacement cookie pair should exist")
            })
            .collect::<Vec<_>>()
            .join("; ");
        let replacement_session_id = response
            .split_once("\"session_id\":\"")
            .and_then(|(_, value)| value.split_once('"'))
            .map(|(value, _)| value)
            .expect("rotation evidence should contain replacement session id");
        assert_ne!(replacement_session_id, fixture.issued.session().session_id);

        let old_read = request_at(fixture.address, fixture.valid_get().as_bytes());
        let replay = request_at(fixture.address, request.as_bytes());
        assert!(old_read.starts_with("HTTP/1.1 403 Forbidden\r\n"));
        assert!(old_read.contains(GATEWAY_SESSION_READ_ERROR_CODE_V1));
        assert_stable_session_rotation_denial(&replay);
        for denied in [&old_read, &replay] {
            assert!(!denied.contains("Set-Cookie:"));
            assert!(!denied.contains("Access-Control-Allow-"));
        }

        let replacement_read = fixture
            .valid_get()
            .replace(&fixture.cookie, &replacement_cookie);
        let replacement_response = request_at(fixture.address, replacement_read.as_bytes());
        assert!(replacement_response.starts_with("HTTP/1.1 200 OK\r\n"));
        assert!(
            replacement_response.contains(&format!("\"session_id\":\"{replacement_session_id}\""))
        );
        fixture.stop();
    }

    #[test]
    fn served_session_rotation_requires_exact_csrf_and_empty_framing() {
        let fixture = ServedSessionGatewayFixture::start("served-session-rotation-denials");
        let valid = fixture.session_rotation_request();
        let missing_csrf = valid.replace(
            &format!("{LOCAL_CSRF_HEADER_NAME_V1}: {}\r\n", fixture.csrf_token),
            "",
        );
        let mut mismatched_csrf = fixture.csrf_token.clone();
        let replacement = if mismatched_csrf.ends_with('a') {
            "b"
        } else {
            "a"
        };
        mismatched_csrf.replace_range(mismatched_csrf.len() - 1.., replacement);
        let wrong_csrf = valid.replacen(
            &format!("{LOCAL_CSRF_HEADER_NAME_V1}: {}\r\n", fixture.csrf_token),
            &format!("{LOCAL_CSRF_HEADER_NAME_V1}: {mismatched_csrf}\r\n"),
            1,
        );
        let cross_site = valid.replace("Sec-Fetch-Site: same-origin", "Sec-Fetch-Site: cross-site");
        let wrong_origin = valid.replace("Origin: http://", "Origin: http://127.0.0.2:");
        let wrong_media_type =
            valid.replace("Content-Type: application/json", "Content-Type: text/plain");
        let missing_length = valid.replace("Content-Length: 0\r\n", "");
        let missing_auth = valid.replace(&format!("Cookie: {}\r\n", fixture.cookie), "");
        let nonempty_body = valid
            .replace("Content-Length: 0\r\n", "Content-Length: 1\r\n")
            .replacen("\r\n\r\n", "\r\n\r\nx", 1);
        let trailing_body = format!("{valid}x");

        let mut generic_denial = None;
        for denied_request in [
            missing_csrf,
            wrong_csrf,
            cross_site,
            wrong_origin,
            wrong_media_type,
            missing_length,
            missing_auth,
            nonempty_body,
        ] {
            let response = request_at(fixture.address, denied_request.as_bytes());
            assert_stable_session_rotation_denial(&response);
            assert!(!response.contains("Access-Control-Allow-"));
            generic_denial.get_or_insert_with(|| response.clone());
            assert_eq!(Some(&response), generic_denial.as_ref());
        }

        let malformed_framing = request_at(fixture.address, trailing_body.as_bytes());
        assert!(malformed_framing.starts_with("HTTP/1.1 400 Bad Request\r\n"));
        assert!(!malformed_framing.contains("Set-Cookie:"));
        assert!(!malformed_framing.contains("Access-Control-Allow-"));

        let still_authenticated = request_at(fixture.address, fixture.valid_get().as_bytes());
        assert!(still_authenticated.starts_with("HTTP/1.1 200 OK\r\n"));
        fixture.stop();
    }

    #[test]
    #[allow(clippy::too_many_lines)]
    fn served_password_rotation_revokes_family_clears_cookies_and_requires_relogin() {
        let fixture = ServedSessionGatewayFixture::start("served-password-rotation");
        let operator_password = "correct operator battery staple";
        fixture.create_non_owner(
            "identity:human:operator",
            "Local Operator",
            lnsat_store::LocalIdentityRoleV1::Operator,
            operator_password,
        );
        let operator_body = serde_json::json!({
            "identity_ref": "identity:human:operator",
            "password": operator_password,
            "lifetime_seconds": 300,
        })
        .to_string();
        let operator_issue = request_at(
            fixture.address,
            fixture.session_issue_request(&operator_body).as_bytes(),
        );
        assert!(operator_issue.starts_with("HTTP/1.1 201 Created\r\n"));
        let operator_cookie = operator_issue
            .lines()
            .filter_map(|line| line.strip_prefix("Set-Cookie: "))
            .map(|value| value.split(';').next().expect("cookie pair should exist"))
            .collect::<Vec<_>>()
            .join("; ");
        let operator_get = fixture
            .valid_get()
            .replace(&fixture.cookie, &operator_cookie);

        let second_body = serde_json::json!({
            "identity_ref": "identity:human:owner",
            "password": "correct horse battery staple",
            "lifetime_seconds": 300,
        })
        .to_string();
        let second_issue = request_at(
            fixture.address,
            fixture.session_issue_request(&second_body).as_bytes(),
        );
        assert!(second_issue.starts_with("HTTP/1.1 201 Created\r\n"));
        let second_cookie = second_issue
            .lines()
            .filter_map(|line| line.strip_prefix("Set-Cookie: "))
            .map(|value| value.split(';').next().expect("cookie pair should exist"))
            .collect::<Vec<_>>()
            .join("; ");
        let second_get = fixture.valid_get().replace(&fixture.cookie, &second_cookie);

        let current_password = "correct horse battery staple";
        let new_password = "new correct horse battery staple";
        let body = serde_json::json!({
            "current_password": current_password,
            "new_password": new_password,
        })
        .to_string();
        let request = fixture.password_rotation_request(&body);
        let response = request_at(fixture.address, request.as_bytes());

        let rotation_value = stable_identity_password_rotation_success_body(&response);
        assert_eq!(
            rotation_value.get("identity_ref"),
            Some(&serde_json::json!("identity:human:owner"))
        );
        assert_eq!(
            rotation_value.get("credential_version"),
            Some(&serde_json::json!(2))
        );
        assert_eq!(
            rotation_value.get("revoked_session_count"),
            Some(&serde_json::json!(2))
        );
        assert!(!response.contains(current_password));
        assert!(!response.contains(new_password));
        assert!(!response.contains(&fixture.session_token));
        assert!(!response.contains(&fixture.csrf_token));
        assert!(!response.contains("Access-Control-Allow-"));
        assert!(!response.contains("WWW-Authenticate:"));

        let set_cookie_values = response
            .lines()
            .filter_map(|line| line.strip_prefix("Set-Cookie: "))
            .collect::<Vec<_>>();
        assert_eq!(
            set_cookie_values,
            [
                "lnsat_session_v1=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0",
                "lnsat_csrf_v1=; Path=/; SameSite=Strict; Max-Age=0",
            ]
        );

        let prior_read = request_at(fixture.address, fixture.valid_get().as_bytes());
        let second_read = request_at(fixture.address, second_get.as_bytes());
        let other_identity_read = request_at(fixture.address, operator_get.as_bytes());
        let replay = request_at(fixture.address, request.as_bytes());
        for denied in [&prior_read, &second_read] {
            assert!(denied.starts_with("HTTP/1.1 403 Forbidden\r\n"));
            assert!(denied.contains(GATEWAY_SESSION_READ_ERROR_CODE_V1));
            assert!(!denied.contains("Set-Cookie:"));
        }
        assert!(other_identity_read.starts_with("HTTP/1.1 200 OK\r\n"));
        assert_stable_identity_password_rotation_denial(&replay);

        let old_login_body = serde_json::json!({
            "identity_ref": "identity:human:owner",
            "password": current_password,
            "lifetime_seconds": 300,
        })
        .to_string();
        let old_login = request_at(
            fixture.address,
            fixture.session_issue_request(&old_login_body).as_bytes(),
        );
        assert!(old_login.starts_with("HTTP/1.1 403 Forbidden\r\n"));
        assert!(!old_login.contains("Set-Cookie:"));

        let new_login_body = serde_json::json!({
            "identity_ref": "identity:human:owner",
            "password": new_password,
            "lifetime_seconds": 300,
        })
        .to_string();
        let new_login = request_at(
            fixture.address,
            fixture.session_issue_request(&new_login_body).as_bytes(),
        );
        assert!(new_login.starts_with("HTTP/1.1 201 Created\r\n"));
        assert_eq!(new_login.matches("Set-Cookie: ").count(), 2);
        fixture.stop();
    }

    #[test]
    #[allow(clippy::too_many_lines)]
    fn served_password_rotation_denies_transport_schema_and_credential_oracles() {
        let fixture = ServedSessionGatewayFixture::start("served-password-rotation-denials");
        let current_password = "correct horse battery staple";
        let valid_body = serde_json::json!({
            "current_password": current_password,
            "new_password": "new correct horse battery staple",
        })
        .to_string();
        let valid = fixture.password_rotation_request(&valid_body);
        let wrong_current = fixture.password_rotation_request(
            &serde_json::json!({
                "current_password": "wrong current password",
                "new_password": "new correct horse battery staple",
            })
            .to_string(),
        );
        let same_password = fixture.password_rotation_request(
            &serde_json::json!({
                "current_password": current_password,
                "new_password": current_password,
            })
            .to_string(),
        );
        let unknown_field = fixture.password_rotation_request(
            &serde_json::json!({
                "current_password": current_password,
                "new_password": "new correct horse battery staple",
                "identity_ref": "identity:human:other",
            })
            .to_string(),
        );
        let malformed_json = fixture.password_rotation_request("{");
        let missing_csrf = valid.replace(
            &format!("{LOCAL_CSRF_HEADER_NAME_V1}: {}\r\n", fixture.csrf_token),
            "",
        );
        let mut mismatched_csrf = fixture.csrf_token.clone();
        let replacement = if mismatched_csrf.ends_with('a') {
            "b"
        } else {
            "a"
        };
        mismatched_csrf.replace_range(mismatched_csrf.len() - 1.., replacement);
        let wrong_csrf = valid.replacen(
            &format!("{LOCAL_CSRF_HEADER_NAME_V1}: {}\r\n", fixture.csrf_token),
            &format!("{LOCAL_CSRF_HEADER_NAME_V1}: {mismatched_csrf}\r\n"),
            1,
        );
        let cross_site = valid.replace("Sec-Fetch-Site: same-origin", "Sec-Fetch-Site: cross-site");
        let wrong_origin = valid.replace("Origin: http://", "Origin: http://127.0.0.2:");
        let wrong_media_type =
            valid.replace("Content-Type: application/json", "Content-Type: text/plain");
        let missing_auth = valid.replace(&format!("Cookie: {}\r\n", fixture.cookie), "");
        let empty_body = fixture.password_rotation_request("");
        let (head, _) = valid
            .split_once("\r\n\r\n")
            .expect("password rotation request should contain one head boundary");
        let missing_length = format!(
            "{}\r\n\r\n",
            head.replace(&format!("Content-Length: {}\r\n", valid_body.len()), "")
        );

        let mut generic_denial = None;
        for denied_request in [
            wrong_current,
            same_password,
            unknown_field,
            malformed_json,
            missing_csrf,
            wrong_csrf,
            cross_site,
            wrong_origin,
            wrong_media_type,
            missing_auth,
            empty_body,
            missing_length,
        ] {
            let response = request_at(fixture.address, denied_request.as_bytes());
            assert_stable_identity_password_rotation_denial(&response);
            assert!(!response.contains("Access-Control-Allow-"));
            generic_denial.get_or_insert_with(|| response.clone());
            assert_eq!(Some(&response), generic_denial.as_ref());
        }

        let trailing_body = request_at(fixture.address, format!("{valid}x").as_bytes());
        assert!(trailing_body.starts_with("HTTP/1.1 400 Bad Request\r\n"));
        assert!(!trailing_body.contains("Set-Cookie:"));

        let get_method = valid.replacen("PATCH ", "GET ", 1);
        let get_response = request_at(fixture.address, get_method.as_bytes());
        assert!(get_response.starts_with("HTTP/1.1 405 Method Not Allowed\r\n"));
        assert!(get_response.contains("Allow: PATCH\r\n"));
        assert!(!get_response.contains("Access-Control-Allow-"));

        let still_authenticated = request_at(fixture.address, fixture.valid_get().as_bytes());
        assert!(still_authenticated.starts_with("HTTP/1.1 200 OK\r\n"));
        fixture.stop();
    }

    #[test]
    fn served_password_rotation_is_rate_limited_per_session() {
        let fixture = ServedSessionGatewayFixture::start("served-password-rotation-limit");
        let wrong_body = serde_json::json!({
            "current_password": "wrong current password",
            "new_password": "new correct horse battery staple",
        })
        .to_string();
        let wrong_request = fixture.password_rotation_request(&wrong_body);
        let mut denial = None;
        for _ in 0..LOCAL_AUTH_MAX_ATTEMPTS_PER_IDENTITY_V1 {
            let response = request_at(fixture.address, wrong_request.as_bytes());
            assert_stable_identity_password_rotation_denial(&response);
            denial.get_or_insert_with(|| response.clone());
            assert_eq!(Some(&response), denial.as_ref());
        }

        let valid_body = serde_json::json!({
            "current_password": "correct horse battery staple",
            "new_password": "new correct horse battery staple",
        })
        .to_string();
        let blocked_valid = request_at(
            fixture.address,
            fixture.password_rotation_request(&valid_body).as_bytes(),
        );
        assert_stable_identity_password_rotation_denial(&blocked_valid);
        assert_eq!(Some(&blocked_valid), denial.as_ref());

        let still_authenticated = request_at(fixture.address, fixture.valid_get().as_bytes());
        assert!(still_authenticated.starts_with("HTTP/1.1 200 OK\r\n"));
        fixture.stop();
    }

    #[test]
    #[allow(clippy::too_many_lines)]
    fn served_approval_request_is_authenticated_bound_and_authority_closed() {
        let fixture = ServedSessionGatewayFixture::start("served-approval-request");
        let session_ref = format!("session:local:{}", fixture.issued.session().session_id);
        let policy = fixture.seed_approval_policy("identity:human:owner", session_ref.as_str());
        let body = serde_json::json!({
            "project_ref": &policy.project_ref,
            "policy_decision_id": &policy.decision_id,
        })
        .to_string();
        let response = request_at(
            fixture.address,
            fixture.approval_request_creation_request(&body).as_bytes(),
        );

        assert!(response.starts_with("HTTP/1.1 201 Created\r\n"));
        assert!(response.contains("LNSAT-Contract-Version: lnsat.contracts.v1_0\r\n"));
        let (_, response_body) = response
            .split_once("\r\n\r\n")
            .expect("approval request response should have one head boundary");
        let value = serde_json::from_str::<serde_json::Value>(response_body)
            .expect("approval request response should be JSON");
        let approval_request = value
            .get("approval_request")
            .cloned()
            .expect("success must expose exact domain request evidence");
        assert_eq!(
            approval_request
                .as_object()
                .expect("approval request evidence should be an object")
                .keys()
                .map(String::as_str)
                .collect::<Vec<_>>(),
            [
                "approval_request_id",
                "contract_version",
                "expires_at",
                "policy_decision_ref",
                "policy_reason_codes",
                "project_ref",
                "requested_at",
                "requested_capabilities",
                "requester_ref",
                "resource_refs",
                "schema_id",
                "session_ref",
                "side_effects",
                "status",
            ]
        );
        assert_eq!(
            value,
            serde_json::json!({
                "contract": GATEWAY_APPROVAL_REQUEST_CONTRACT_V1,
                "contract_version": CONTRACT_VERSION_V1_0,
                "ok": true,
                "status": "created",
                "scope": "pending_approval_request",
                "approval_request": approval_request,
                "authorization": {
                    "source": "local_session",
                    "permission": "request_action",
                    "csrf_verified": true,
                    "requester_bound": true,
                    "actor_session_bound": true,
                },
                "replay_semantics": "content_bound_server_owned_time",
                "side_effects": [
                    GATEWAY_APPROVAL_REQUEST_LIMITER_SIDE_EFFECT_V1,
                    GATEWAY_APPROVAL_REQUEST_ACTIVITY_SIDE_EFFECT_V1,
                    GATEWAY_APPROVAL_REQUEST_EVIDENCE_SIDE_EFFECT_V1,
                ],
                "approval_request_state_changed": true,
                "approval_recorded": false,
                "server_signed": false,
                "session_authority_state_changed": false,
                "execution_authorized": false,
                "mutation_authority": false,
            })
        );
        assert_eq!(
            value["approval_request"]["schema_id"],
            "lnsat.approval_request.schema.v1_0"
        );
        assert_eq!(
            value["approval_request"]["policy_decision_ref"]["decision_id"],
            policy.decision_id
        );
        assert_eq!(
            value["approval_request"]["requester_ref"],
            "identity:human:owner"
        );
        assert_eq!(value["approval_request"]["session_ref"], session_ref);
        assert_eq!(
            value["approval_request"]["side_effects"],
            serde_json::json!([])
        );
        assert!(!response.contains(&fixture.session_token));
        assert!(!response.contains(&fixture.csrf_token));
        assert!(!response.contains("Set-Cookie:"));
        assert!(!response.contains("Access-Control-Allow-"));

        let first_request_id = value["approval_request"]["approval_request_id"]
            .as_str()
            .expect("created request should have an identity")
            .to_owned();
        let first_requested_at = value["approval_request"]["requested_at"]
            .as_str()
            .expect("created request should have server time")
            .to_owned();

        thread::sleep(Duration::from_millis(2));
        let second_response = request_at(
            fixture.address,
            fixture.approval_request_creation_request(&body).as_bytes(),
        );
        assert!(second_response.starts_with("HTTP/1.1 201 Created\r\n"));
        let (_, second_body) = second_response
            .split_once("\r\n\r\n")
            .expect("second approval request should have one head boundary");
        let second_value = serde_json::from_str::<serde_json::Value>(second_body)
            .expect("second approval request should be JSON");
        assert_eq!(second_value["status"], "created");
        assert_ne!(
            second_value["approval_request"]["requested_at"],
            first_requested_at
        );
        assert_ne!(
            second_value["approval_request"]["approval_request_id"],
            first_request_id
        );
        assert_eq!(
            second_value["side_effects"],
            serde_json::json!([
                GATEWAY_APPROVAL_REQUEST_LIMITER_SIDE_EFFECT_V1,
                GATEWAY_APPROVAL_REQUEST_ACTIVITY_SIDE_EFFECT_V1,
                GATEWAY_APPROVAL_REQUEST_EVIDENCE_SIDE_EFFECT_V1,
            ])
        );

        let store = SqliteStore::open(fixture.directory.database_path())
            .expect("approval request store should reopen");
        let record = store
            .read_approval_request_v1(&policy.project_ref, &first_request_id)
            .expect("created approval request should read")
            .expect("created approval request should exist");
        let replay_write = ApprovalRequestStoreWriteV1 {
            created: false,
            record,
        };
        let replay_parts = approval_request_response_parts_v1(&replay_write);
        assert_eq!(replay_parts.0, "200 OK");
        let replay_value = serde_json::from_str::<serde_json::Value>(&replay_parts.1)
            .expect("replay response should be JSON");
        assert_eq!(replay_value["status"], "replayed");
        assert_eq!(
            replay_value["side_effects"],
            serde_json::json!([
                GATEWAY_APPROVAL_REQUEST_LIMITER_SIDE_EFFECT_V1,
                GATEWAY_APPROVAL_REQUEST_ACTIVITY_SIDE_EFFECT_V1,
            ])
        );
        assert_eq!(replay_value["approval_request_state_changed"], false);
        assert_eq!(
            replay_value["approval_request"]["side_effects"],
            serde_json::json!([])
        );
        assert!(
            store
                .read_approval_request_v1(
                    &policy.project_ref,
                    second_value["approval_request"]["approval_request_id"]
                        .as_str()
                        .expect("second request should have an identity"),
                )
                .expect("second approval request should read")
                .is_some()
        );
        fixture.stop();
    }

    #[test]
    #[allow(clippy::too_many_lines)]
    fn served_approval_request_denies_scope_schema_session_and_transport_oracles() {
        let fixture = ServedSessionGatewayFixture::start("served-approval-request-denials");
        let session_ref = format!("session:local:{}", fixture.issued.session().session_id);
        let policy = fixture.seed_approval_policy("identity:human:owner", session_ref.as_str());
        let mismatched_policy = fixture
            .seed_approval_policy("identity:human:owner", "session:local:not-current-session");
        let valid_body = serde_json::json!({
            "project_ref": &policy.project_ref,
            "policy_decision_id": &policy.decision_id,
        })
        .to_string();
        let valid = fixture.approval_request_creation_request(&valid_body);
        let wrong_project = fixture.approval_request_creation_request(
            &serde_json::json!({
                "project_ref": "project:other",
                "policy_decision_id": &policy.decision_id,
            })
            .to_string(),
        );
        let unknown_policy = fixture.approval_request_creation_request(
            &serde_json::json!({
                "project_ref": &policy.project_ref,
                "policy_decision_id":
                    "pol_0000000000000000000000000000000000000000000000000000000000000000",
            })
            .to_string(),
        );
        let wrong_session = fixture.approval_request_creation_request(
            &serde_json::json!({
                "project_ref": &mismatched_policy.project_ref,
                "policy_decision_id": &mismatched_policy.decision_id,
            })
            .to_string(),
        );
        let unknown_field = fixture.approval_request_creation_request(
            &serde_json::json!({
                "project_ref": &policy.project_ref,
                "policy_decision_id": &policy.decision_id,
                "approval_request_id": "caller-controlled",
            })
            .to_string(),
        );
        let malformed_json = fixture.approval_request_creation_request("{");

        fixture.create_non_owner(
            "identity:human:auditor",
            "Local Auditor",
            LocalIdentityRoleV1::Auditor,
            "auditor bounded password value",
        );
        let auditor_login_body = serde_json::json!({
            "identity_ref": "identity:human:auditor",
            "password": "auditor bounded password value",
            "lifetime_seconds": 300,
        })
        .to_string();
        let auditor_issue = request_at(
            fixture.address,
            fixture
                .session_issue_request(&auditor_login_body)
                .as_bytes(),
        );
        assert!(auditor_issue.starts_with("HTTP/1.1 201 Created\r\n"));
        let auditor_pairs = auditor_issue
            .lines()
            .filter_map(|line| line.strip_prefix("Set-Cookie: "))
            .map(|value| value.split(';').next().expect("cookie pair should exist"))
            .collect::<Vec<_>>();
        let auditor_csrf = auditor_pairs
            .iter()
            .find_map(|pair| pair.strip_prefix("lnsat_csrf_v1="))
            .expect("auditor CSRF cookie should exist");
        let auditor_request = valid
            .replace(&fixture.cookie, &auditor_pairs.join("; "))
            .replace(&fixture.csrf_token, auditor_csrf);

        let mut generic_denial = None;
        for denied_request in [
            auditor_request,
            wrong_project,
            unknown_policy,
            wrong_session,
            unknown_field,
            malformed_json,
        ] {
            let response = request_at(fixture.address, denied_request.as_bytes());
            assert_stable_approval_request_denial(&response);
            assert!(!response.contains(&fixture.session_token));
            assert!(!response.contains(&fixture.csrf_token));
            generic_denial.get_or_insert_with(|| response.clone());
            assert_eq!(Some(&response), generic_denial.as_ref());
        }

        let missing_version = valid.replace(
            &format!("{GATEWAY_CONTRACT_VERSION_HEADER_NAME_V1}: {CONTRACT_VERSION_V1_0}\r\n"),
            "",
        );
        let version_response = request_at(fixture.address, missing_version.as_bytes());
        assert!(version_response.starts_with("HTTP/1.1 400 Bad Request\r\n"));
        assert!(version_response.contains("\"code\":\"contract.version.required\""));
        assert!(!version_response.contains("gateway.approval_request.denied"));
        assert!(!version_response.contains("LNSAT-Contract-Version: lnsat.contracts."));

        let host_drift = valid.replace(
            &format!("Host: {}\r\n", fixture.address),
            "Host: example.test\r\n",
        );
        let host_response = request_at(fixture.address, host_drift.as_bytes());
        assert!(host_response.starts_with("HTTP/1.1 400 Bad Request\r\n"));
        assert!(host_response.contains("lnsatd.request.invalid"));
        assert!(!host_response.contains("gateway.approval_request.denied"));

        for method in ["GET", "OPTIONS", "DELETE"] {
            let method_request = valid.replacen("POST ", &format!("{method} "), 1);
            let method_response = request_at(fixture.address, method_request.as_bytes());
            assert!(method_response.starts_with("HTTP/1.1 405 Method Not Allowed\r\n"));
            assert!(method_response.contains("Allow: POST\r\n"));
            assert!(method_response.contains("LNSAT-Contract-Version: lnsat.contracts.v1_0\r\n"));
            assert!(!method_response.contains("Access-Control-Allow-"));
        }
        fixture.stop();

        let transport_fixture =
            ServedSessionGatewayFixture::start("served-approval-request-transport-denials");
        let transport_session_ref = format!(
            "session:local:{}",
            transport_fixture.issued.session().session_id
        );
        let transport_policy = transport_fixture
            .seed_approval_policy("identity:human:owner", transport_session_ref.as_str());
        let transport_body = serde_json::json!({
            "project_ref": &transport_policy.project_ref,
            "policy_decision_id": &transport_policy.decision_id,
        })
        .to_string();
        let transport_valid = transport_fixture.approval_request_creation_request(&transport_body);
        let empty_body = transport_fixture.approval_request_creation_request("");
        let missing_csrf = transport_valid.replace(
            &format!(
                "{LOCAL_CSRF_HEADER_NAME_V1}: {}\r\n",
                transport_fixture.csrf_token
            ),
            "",
        );
        let wrong_csrf = transport_valid.replace(
            &format!(
                "{LOCAL_CSRF_HEADER_NAME_V1}: {}\r\n",
                transport_fixture.csrf_token
            ),
            &format!("{LOCAL_CSRF_HEADER_NAME_V1}: wrong-csrf\r\n"),
        );
        let cross_site =
            transport_valid.replace("Sec-Fetch-Site: same-origin", "Sec-Fetch-Site: cross-site");
        let wrong_origin = transport_valid.replace("Origin: http://", "Origin: http://127.0.0.2:");
        let wrong_media_type =
            transport_valid.replace("Content-Type: application/json", "Content-Type: text/plain");
        let missing_auth =
            transport_valid.replace(&format!("Cookie: {}\r\n", transport_fixture.cookie), "");
        let (transport_head, _) = transport_valid
            .split_once("\r\n\r\n")
            .expect("approval request should contain one head boundary");
        let missing_length = format!(
            "{}\r\n\r\n",
            transport_head.replace(&format!("Content-Length: {}\r\n", transport_body.len()), "")
        );

        for denied_request in [
            empty_body,
            missing_csrf,
            wrong_csrf,
            cross_site,
            wrong_origin,
            wrong_media_type,
            missing_auth,
            missing_length,
        ] {
            let response = request_at(transport_fixture.address, denied_request.as_bytes());
            assert_stable_approval_request_denial(&response);
            assert_eq!(Some(&response), generic_denial.as_ref());
        }

        let trailing_body = request_at(
            transport_fixture.address,
            format!("{transport_valid}x").as_bytes(),
        );
        assert!(trailing_body.starts_with("HTTP/1.1 400 Bad Request\r\n"));
        assert!(!trailing_body.contains("Set-Cookie:"));
        assert!(!trailing_body.contains("Access-Control-Allow-"));
        transport_fixture.stop();
    }

    #[test]
    #[allow(clippy::too_many_lines)]
    fn served_approval_decision_is_distinct_human_authenticated_and_authority_closed() {
        let fixture = ServedSessionGatewayFixture::start("served-approval-decision");
        let operator_password = "operator bounded password value";
        fixture.create_non_owner(
            "identity:human:operator",
            "Local Operator",
            LocalIdentityRoleV1::Operator,
            operator_password,
        );
        let approval_request = fixture.seed_approval_request("identity:human:operator");
        let operator_login_body = serde_json::json!({
            "identity_ref": "identity:human:operator",
            "password": operator_password,
            "lifetime_seconds": 300,
        })
        .to_string();
        let operator_issue = request_at(
            fixture.address,
            fixture
                .session_issue_request(&operator_login_body)
                .as_bytes(),
        );
        assert!(operator_issue.starts_with("HTTP/1.1 201 Created\r\n"));
        let operator_pairs = operator_issue
            .lines()
            .filter_map(|line| line.strip_prefix("Set-Cookie: "))
            .map(|value| value.split(';').next().expect("cookie pair should exist"))
            .collect::<Vec<_>>();
        let operator_csrf = operator_pairs
            .iter()
            .find_map(|pair| pair.strip_prefix("lnsat_csrf_v1="))
            .expect("operator CSRF cookie should exist");
        let body = serde_json::json!({
            "project_ref": "project:lnsat",
            "decision": "approved",
            "reason": "approval.operator_approved",
        })
        .to_string();
        let owner_request =
            fixture.approval_decision_request(&approval_request.approval_request_id, &body);
        let operator_request = owner_request
            .replace(&fixture.cookie, &operator_pairs.join("; "))
            .replace(&fixture.csrf_token, operator_csrf);
        let self_approval = request_at(fixture.address, operator_request.as_bytes());
        assert_stable_approval_decision_denial(&self_approval);

        let response = request_at(fixture.address, owner_request.as_bytes());
        assert!(response.starts_with("HTTP/1.1 201 Created\r\n"));
        assert!(response.contains("LNSAT-Contract-Version: lnsat.contracts.v1_0\r\n"));
        let (_, response_body) = response
            .split_once("\r\n\r\n")
            .expect("approval decision should have one head boundary");
        let response_value = serde_json::from_str::<serde_json::Value>(response_body)
            .expect("approval decision should be JSON");
        assert_eq!(
            response_value,
            serde_json::json!({
                "contract": GATEWAY_APPROVAL_DECISION_CONTRACT_V1,
                "contract_version": CONTRACT_VERSION_V1_0,
                "ok": true,
                "status": "recorded",
                "scope": "terminal_approval_decision",
                "decision": {
                    "contract_version": CONTRACT_VERSION_V1_0,
                    "schema_id": "lnsat.approval_decision.schema.v1_0",
                    "approval_decision_id": response_value["decision"]["approval_decision_id"],
                    "approval_request_ref": {
                        "schema_id": "lnsat.approval_request.schema.v1_0",
                        "approval_request_id": approval_request.approval_request_id,
                        "policy_decision_id":
                            approval_request.policy_decision_ref.decision_id,
                    },
                    "approver_ref": "identity:human:owner",
                    "approver_session_ref": response_value["decision"]["approver_session_ref"],
                    "decision": "approved",
                    "reason_code": "approval.operator_approved",
                    "decided_at": response_value["decision"]["decided_at"],
                    "expires_at": approval_request.expires_at,
                    "approval_gate_satisfied": true,
                    "execution_authorized": false,
                    "side_effects": [],
                },
                "authorization": {
                    "source": "local_session",
                    "permission": "decide_approval",
                    "csrf_verified": true,
                    "approver_bound": true,
                    "actor_session_bound": true,
                    "request_bound": true,
                    "distinct_human": true,
                },
                "replay_semantics":
                    "immutable_terminal_content_bound_server_owned_time",
                "side_effects": [
                    GATEWAY_APPROVAL_DECISION_LIMITER_SIDE_EFFECT_V1,
                    GATEWAY_APPROVAL_DECISION_ACTIVITY_SIDE_EFFECT_V1,
                    GATEWAY_APPROVAL_DECISION_EVIDENCE_SIDE_EFFECT_V1,
                ],
                "approval_decision_state_changed": true,
                "approval_recorded": true,
                "server_signed": false,
                "session_authority_state_changed": false,
                "execution_authorized": false,
                "mutation_authority": false,
            })
        );
        assert!(!response.contains(&fixture.session_token));
        assert!(!response.contains(&fixture.csrf_token));
        assert!(!response.contains("Set-Cookie:"));
        assert!(!response.contains("Access-Control-Allow-"));

        let decision_id = response_value["decision"]["approval_decision_id"]
            .as_str()
            .expect("approval decision should have an identity");
        let store = SqliteStore::open(fixture.directory.database_path())
            .expect("approval decision store should reopen");
        let record = store
            .read_approval_decision_v1("project:lnsat", decision_id)
            .expect("recorded approval decision should read")
            .expect("recorded approval decision should exist");
        let replay_parts = approval_decision_response_parts_v1(&ApprovalDecisionStoreWriteV1 {
            created: false,
            record,
        });
        assert_eq!(replay_parts.0, "200 OK");
        let replay_value = serde_json::from_str::<serde_json::Value>(&replay_parts.1)
            .expect("approval decision replay should be JSON");
        assert_eq!(replay_value["status"], "replayed");
        assert_eq!(
            replay_value["side_effects"],
            serde_json::json!([
                GATEWAY_APPROVAL_DECISION_LIMITER_SIDE_EFFECT_V1,
                GATEWAY_APPROVAL_DECISION_ACTIVITY_SIDE_EFFECT_V1,
            ])
        );
        assert_eq!(replay_value["approval_decision_state_changed"], false);
        assert_eq!(replay_value["decision"], response_value["decision"]);

        thread::sleep(Duration::from_millis(2));
        let terminal_conflict = request_at(fixture.address, owner_request.as_bytes());
        assert_stable_approval_decision_denial(&terminal_conflict);
        let owner_read = request_at(fixture.address, fixture.valid_get().as_bytes());
        assert!(owner_read.starts_with("HTTP/1.1 200 OK\r\n"));
        fixture.stop();
    }

    #[test]
    #[allow(clippy::too_many_lines)]
    fn served_approval_decision_denies_scope_schema_transport_and_role_oracles() {
        let fixture = ServedSessionGatewayFixture::start("served-approval-decision-denials");
        let approval_request = fixture.seed_approval_request("identity:agent:codex");
        let valid_body = serde_json::json!({
            "project_ref": "project:lnsat",
            "decision": "denied",
            "reason": "approval.evidence_insufficient",
        })
        .to_string();
        let valid =
            fixture.approval_decision_request(&approval_request.approval_request_id, &valid_body);
        let denied_success = request_at(fixture.address, valid.as_bytes());
        assert!(denied_success.starts_with("HTTP/1.1 201 Created\r\n"));
        assert!(denied_success.contains("\"contract\":\"lnsat.gateway.approval_decision.v1_0\""));
        assert!(denied_success.contains("\"decision\":\"denied\""));
        assert!(denied_success.contains("\"reason_code\":\"approval.evidence_insufficient\""));
        assert!(denied_success.contains("\"approval_gate_satisfied\":false"));
        assert!(denied_success.contains("\"execution_authorized\":false"));
        assert!(denied_success.contains("\"approval_decision_evidence_appended\""));
        let wrong_project = fixture.approval_decision_request(
            &approval_request.approval_request_id,
            &serde_json::json!({
                "project_ref": "project:other",
                "decision": "denied",
                "reason": "approval.evidence_insufficient",
            })
            .to_string(),
        );
        let unknown_request = fixture.approval_decision_request(
            "apr_0000000000000000000000000000000000000000000000000000000000000000",
            &valid_body,
        );
        let outcome_reason_mismatch = fixture.approval_decision_request(
            &approval_request.approval_request_id,
            &serde_json::json!({
                "project_ref": "project:lnsat",
                "decision": "approved",
                "reason": "approval.operator_denied",
            })
            .to_string(),
        );
        let unknown_field = fixture.approval_decision_request(
            &approval_request.approval_request_id,
            &serde_json::json!({
                "project_ref": "project:lnsat",
                "decision": "denied",
                "reason": "approval.evidence_insufficient",
                "execution_authorized": true,
            })
            .to_string(),
        );
        let malformed_json =
            fixture.approval_decision_request(&approval_request.approval_request_id, "{");
        let missing_csrf = valid.replace(
            &format!("{LOCAL_CSRF_HEADER_NAME_V1}: {}\r\n", fixture.csrf_token),
            "",
        );
        let wrong_csrf = valid.replace(
            &format!("{LOCAL_CSRF_HEADER_NAME_V1}: {}\r\n", fixture.csrf_token),
            &format!("{LOCAL_CSRF_HEADER_NAME_V1}: wrong-csrf\r\n"),
        );
        let cross_site = valid.replace("Sec-Fetch-Site: same-origin", "Sec-Fetch-Site: cross-site");
        let wrong_origin = valid.replace("Origin: http://", "Origin: http://127.0.0.2:");
        let wrong_media_type =
            valid.replace("Content-Type: application/json", "Content-Type: text/plain");
        let missing_auth = valid.replace(&format!("Cookie: {}\r\n", fixture.cookie), "");
        let (head, _) = valid
            .split_once("\r\n\r\n")
            .expect("approval decision request should contain one head boundary");
        let missing_length = format!(
            "{}\r\n\r\n",
            head.replace(&format!("Content-Length: {}\r\n", valid_body.len()), "")
        );

        let mut generic_denial = None;
        for denied_request in [
            wrong_project,
            unknown_request,
            outcome_reason_mismatch,
            unknown_field,
            malformed_json,
            missing_csrf,
            wrong_csrf,
            cross_site,
            wrong_origin,
            wrong_media_type,
            missing_auth,
            missing_length,
        ] {
            let response = request_at(fixture.address, denied_request.as_bytes());
            assert_stable_approval_decision_denial(&response);
            generic_denial.get_or_insert_with(|| response.clone());
            assert_eq!(Some(&response), generic_denial.as_ref());
        }

        fixture.create_non_owner(
            "identity:human:auditor",
            "Local Auditor",
            LocalIdentityRoleV1::Auditor,
            "auditor bounded password value",
        );
        let auditor_login_body = serde_json::json!({
            "identity_ref": "identity:human:auditor",
            "password": "auditor bounded password value",
            "lifetime_seconds": 300,
        })
        .to_string();
        let auditor_issue = request_at(
            fixture.address,
            fixture
                .session_issue_request(&auditor_login_body)
                .as_bytes(),
        );
        assert!(auditor_issue.starts_with("HTTP/1.1 201 Created\r\n"));
        let auditor_pairs = auditor_issue
            .lines()
            .filter_map(|line| line.strip_prefix("Set-Cookie: "))
            .map(|value| value.split(';').next().expect("cookie pair should exist"))
            .collect::<Vec<_>>();
        let auditor_csrf = auditor_pairs
            .iter()
            .find_map(|pair| pair.strip_prefix("lnsat_csrf_v1="))
            .expect("auditor CSRF cookie should exist");
        let auditor_request = valid
            .replace(&fixture.cookie, &auditor_pairs.join("; "))
            .replace(&fixture.csrf_token, auditor_csrf);
        let auditor_response = request_at(fixture.address, auditor_request.as_bytes());
        assert_stable_approval_decision_denial(&auditor_response);
        assert_eq!(Some(&auditor_response), generic_denial.as_ref());

        let missing_version = valid.replace(
            &format!("{GATEWAY_CONTRACT_VERSION_HEADER_NAME_V1}: {CONTRACT_VERSION_V1_0}\r\n"),
            "",
        );
        let version_response = request_at(fixture.address, missing_version.as_bytes());
        assert!(version_response.starts_with("HTTP/1.1 400 Bad Request\r\n"));
        assert!(version_response.contains("\"code\":\"contract.version.required\""));
        assert!(!version_response.contains("gateway.approval_decision.denied"));
        assert!(!version_response.contains("LNSAT-Contract-Version: lnsat.contracts."));

        let get_response = request_at(
            fixture.address,
            valid.replacen("POST ", "GET ", 1).as_bytes(),
        );
        assert!(get_response.starts_with("HTTP/1.1 405 Method Not Allowed\r\n"));
        assert!(get_response.contains("Allow: POST\r\n"));
        assert!(get_response.contains("LNSAT-Contract-Version: lnsat.contracts.v1_0\r\n"));
        assert!(!get_response.contains("Access-Control-Allow-"));
        let invalid_route_id = request_at(
            fixture.address,
            valid
                .replace(
                    &approval_request.approval_request_id,
                    "apr_NOT_A_LOWERCASE_SHA256",
                )
                .as_bytes(),
        );
        assert_stable_approval_decision_denial(&invalid_route_id);
        assert_eq!(Some(&invalid_route_id), generic_denial.as_ref());
        let malformed_route = request_at(
            fixture.address,
            valid
                .replace("/decision HTTP/1.1", "/extra/decision HTTP/1.1")
                .as_bytes(),
        );
        assert!(malformed_route.starts_with("HTTP/1.1 400 Bad Request\r\n"));
        fixture.stop();
    }

    #[test]
    #[allow(clippy::too_many_lines)]
    fn served_identity_creation_is_owner_only_secret_free_and_login_ready() {
        let fixture = ServedSessionGatewayFixture::start("served-identity-creation");
        let operator_password = "operator bounded password value";
        let body = serde_json::json!({
            "identity_ref": "identity:human:operator",
            "display_name": "Local Operator",
            "role": "operator",
            "password": operator_password,
        })
        .to_string();
        let request = fixture.identity_creation_request(&body);
        let response = request_at(fixture.address, request.as_bytes());

        assert!(response.starts_with("HTTP/1.1 201 Created\r\n"));
        assert!(response.contains("LNSAT-Contract-Version: lnsat.contracts.v1_0\r\n"));
        assert!(response.contains("\"contract\":\"lnsat.gateway.identity_creation.v1_0\""));
        assert!(response.contains("\"contract_version\":\"lnsat.contracts.v1_0\""));
        assert!(response.contains("\"ok\":true"));
        assert!(response.contains("\"status\":\"created\""));
        assert!(response.contains("\"scope\":\"new_non_owner_identity\""));
        assert!(response.contains("\"identity_ref\":\"identity:human:operator\""));
        assert!(response.contains("\"display_name\":\"Local Operator\""));
        assert!(response.contains("\"role\":\"operator\""));
        assert!(response.contains("\"lifecycle_status\":\"active\""));
        assert!(response.contains("\"profile\":\"lnsat.argon2id.v1\""));
        assert!(response.contains("\"version\":1"));
        assert!(response.contains("\"secret_exposed\":false"));
        assert!(response.contains("\"source\":\"local_session\""));
        assert!(response.contains("\"actor_role\":\"owner\""));
        assert!(response.contains("\"permission\":\"manage_identities\""));
        assert!(response.contains("\"actor_session_bound\":true"));
        assert!(response.contains("\"csrf_verified\":true"));
        assert!(response.contains("\"replay_semantics\":\"create_once_identity_ref\""));
        assert!(response.contains("\"identity_evidence_appended\""));
        assert!(response.contains("\"password_credential_evidence_appended\""));
        assert!(response.contains("\"identity_security_event_appended\""));
        assert!(response.contains("\"identity_state_changed\":true"));
        assert!(response.contains("\"credential_state_changed\":true"));
        assert!(response.contains("\"session_authority_state_changed\":false"));
        assert!(response.contains("\"execution_authority\":false"));
        assert!(response.contains("\"mutation_authority\":false"));
        assert!(!response.contains(operator_password));
        assert!(!response.contains(&fixture.session_token));
        assert!(!response.contains(&fixture.csrf_token));
        assert!(!response.contains("Set-Cookie:"));
        assert!(!response.contains("Access-Control-Allow-"));

        let owner_read = request_at(fixture.address, fixture.valid_get().as_bytes());
        assert!(owner_read.starts_with("HTTP/1.1 200 OK\r\n"));

        let operator_login_body = serde_json::json!({
            "identity_ref": "identity:human:operator",
            "password": operator_password,
            "lifetime_seconds": 300,
        })
        .to_string();
        let operator_login = request_at(
            fixture.address,
            fixture
                .session_issue_request(&operator_login_body)
                .as_bytes(),
        );
        assert!(operator_login.starts_with("HTTP/1.1 201 Created\r\n"));
        assert!(operator_login.contains("\"role\":\"operator\""));
        assert_eq!(operator_login.matches("Set-Cookie: ").count(), 2);

        let replay = request_at(fixture.address, request.as_bytes());
        assert!(replay.starts_with("HTTP/1.1 403 Forbidden\r\n"));
        assert!(replay.contains("\"contract\":\"lnsat.gateway.identity_creation.v1_0\""));
        assert!(replay.contains("\"code\":\"gateway.identity_creation.denied\""));
        assert!(replay.contains("\"side_effects\":[\"authentication_limiter_may_advance\"]"));
        assert!(!replay.contains("Set-Cookie:"));

        let auditor_body = serde_json::json!({
            "identity_ref": "identity:human:auditor",
            "display_name": "Local Auditor",
            "role": "auditor",
            "password": "auditor bounded password value",
        })
        .to_string();
        let auditor_response = request_at(
            fixture.address,
            fixture.identity_creation_request(&auditor_body).as_bytes(),
        );
        assert!(auditor_response.starts_with("HTTP/1.1 201 Created\r\n"));
        assert!(auditor_response.contains("\"identity_ref\":\"identity:human:auditor\""));
        assert!(auditor_response.contains("\"role\":\"auditor\""));
        assert!(!auditor_response.contains("auditor bounded password value"));
        fixture.stop();
    }

    #[test]
    #[allow(clippy::too_many_lines)]
    fn served_identity_creation_denies_role_schema_transport_and_actor_oracles() {
        let fixture = ServedSessionGatewayFixture::start("served-identity-creation-denials");
        let password = "auditor bounded password value";
        let valid_body = serde_json::json!({
            "identity_ref": "identity:human:auditor",
            "display_name": "Local Auditor",
            "role": "auditor",
            "password": password,
        })
        .to_string();
        let valid = fixture.identity_creation_request(&valid_body);
        let owner_role = fixture.identity_creation_request(
            &serde_json::json!({
                "identity_ref": "identity:human:second-owner",
                "display_name": "Second Owner",
                "role": "owner",
                "password": password,
            })
            .to_string(),
        );
        let unknown_role = fixture.identity_creation_request(
            &serde_json::json!({
                "identity_ref": "identity:human:unknown-role",
                "display_name": "Unknown Role",
                "role": "administrator",
                "password": password,
            })
            .to_string(),
        );
        let invalid_identity = fixture.identity_creation_request(
            &serde_json::json!({
                "identity_ref": "identity:workload:not-human",
                "display_name": "Invalid Identity",
                "role": "auditor",
                "password": password,
            })
            .to_string(),
        );
        let invalid_password = fixture.identity_creation_request(
            &serde_json::json!({
                "identity_ref": "identity:human:short-password",
                "display_name": "Short Password",
                "role": "auditor",
                "password": "too short",
            })
            .to_string(),
        );
        let unknown_field = fixture.identity_creation_request(
            &serde_json::json!({
                "identity_ref": "identity:human:unknown-field",
                "display_name": "Unknown Field",
                "role": "auditor",
                "password": password,
                "execution_authority": true,
            })
            .to_string(),
        );
        let malformed_json = fixture.identity_creation_request("{");
        let empty_body = fixture.identity_creation_request("");
        let missing_csrf = valid.replace(
            &format!("{LOCAL_CSRF_HEADER_NAME_V1}: {}\r\n", fixture.csrf_token),
            "",
        );
        let cross_site = valid.replace("Sec-Fetch-Site: same-origin", "Sec-Fetch-Site: cross-site");
        let wrong_origin = valid.replace("Origin: http://", "Origin: http://127.0.0.2:");
        let wrong_media_type =
            valid.replace("Content-Type: application/json", "Content-Type: text/plain");
        let missing_auth = valid.replace(&format!("Cookie: {}\r\n", fixture.cookie), "");
        let (head, _) = valid
            .split_once("\r\n\r\n")
            .expect("identity creation request should contain one head boundary");
        let missing_length = format!(
            "{}\r\n\r\n",
            head.replace(&format!("Content-Length: {}\r\n", valid_body.len()), "")
        );

        let mut generic_denial = None;
        for denied_request in [
            owner_role,
            unknown_role,
            invalid_identity,
            invalid_password,
            unknown_field,
            malformed_json,
            empty_body,
            missing_csrf,
            cross_site,
            wrong_origin,
            wrong_media_type,
            missing_auth,
            missing_length,
        ] {
            let response = request_at(fixture.address, denied_request.as_bytes());
            assert!(response.starts_with("HTTP/1.1 403 Forbidden\r\n"));
            assert!(response.contains("LNSAT-Contract-Version: lnsat.contracts.v1_0\r\n"));
            assert!(response.contains("\"contract\":\"lnsat.gateway.identity_creation.v1_0\""));
            assert!(response.contains("\"contract_version\":\"lnsat.contracts.v1_0\""));
            assert!(response.contains("\"ok\":false"));
            assert!(response.contains("\"identity\":null"));
            assert!(response.contains("\"credential\":null"));
            assert!(response.contains("\"code\":\"gateway.identity_creation.denied\""));
            assert!(response.contains("\"path\":\"/identities\""));
            assert!(response.contains("\"side_effects\":[\"authentication_limiter_may_advance\"]"));
            assert!(response.contains("\"identity_state_changed\":false"));
            assert!(response.contains("\"credential_state_changed\":false"));
            assert!(response.contains("\"session_authority_state_changed\":false"));
            assert!(response.contains("\"execution_authority\":false"));
            assert!(response.contains("\"mutation_authority\":false"));
            assert!(!response.contains(password));
            assert!(!response.contains("too short"));
            assert!(!response.contains("Set-Cookie:"));
            assert!(!response.contains("Access-Control-Allow-"));
            generic_denial.get_or_insert_with(|| response.clone());
            assert_eq!(Some(&response), generic_denial.as_ref());
        }

        fixture.create_non_owner(
            "identity:human:operator",
            "Local Operator",
            LocalIdentityRoleV1::Operator,
            "operator bounded password value",
        );
        let operator_body = serde_json::json!({
            "identity_ref": "identity:human:operator",
            "password": "operator bounded password value",
            "lifetime_seconds": 300,
        })
        .to_string();
        let operator_issue = request_at(
            fixture.address,
            fixture.session_issue_request(&operator_body).as_bytes(),
        );
        assert!(operator_issue.starts_with("HTTP/1.1 201 Created\r\n"));
        let cookie_pairs = operator_issue
            .lines()
            .filter_map(|line| line.strip_prefix("Set-Cookie: "))
            .map(|value| value.split(';').next().expect("cookie pair should exist"))
            .collect::<Vec<_>>();
        let operator_csrf = cookie_pairs
            .iter()
            .find_map(|pair| pair.strip_prefix("lnsat_csrf_v1="))
            .expect("CSRF cookie should exist");
        let operator_request = valid
            .replace(&fixture.cookie, &cookie_pairs.join("; "))
            .replace(&fixture.csrf_token, operator_csrf);
        let non_owner_response = request_at(fixture.address, operator_request.as_bytes());
        assert_eq!(Some(&non_owner_response), generic_denial.as_ref());

        let get_response = request_at(
            fixture.address,
            valid.replacen("POST ", "GET ", 1).as_bytes(),
        );
        assert!(get_response.starts_with("HTTP/1.1 405 Method Not Allowed\r\n"));
        assert!(get_response.contains("Allow: POST\r\n"));
        let trailing_body = request_at(fixture.address, format!("{valid}x").as_bytes());
        assert!(trailing_body.starts_with("HTTP/1.1 400 Bad Request\r\n"));
        let owner_read = request_at(fixture.address, fixture.valid_get().as_bytes());
        assert!(owner_read.starts_with("HTTP/1.1 200 OK\r\n"));
        fixture.stop();
    }

    #[test]
    #[allow(clippy::too_many_lines)]
    fn served_identity_disablement_is_owner_only_permanent_and_target_closing() {
        let fixture = ServedSessionGatewayFixture::start("served-identity-disablement");
        let operator_password = "correct operator battery staple";
        fixture.create_non_owner(
            "identity:human:operator",
            "Local Operator",
            lnsat_store::LocalIdentityRoleV1::Operator,
            operator_password,
        );
        fixture.create_non_owner(
            "identity:human:auditor",
            "Local Auditor",
            lnsat_store::LocalIdentityRoleV1::Auditor,
            "correct auditor battery staple",
        );
        let operator_body = serde_json::json!({
            "identity_ref": "identity:human:operator",
            "password": operator_password,
            "lifetime_seconds": 300,
        })
        .to_string();
        let first_issue = request_at(
            fixture.address,
            fixture.session_issue_request(&operator_body).as_bytes(),
        );
        let second_issue = request_at(
            fixture.address,
            fixture.session_issue_request(&operator_body).as_bytes(),
        );
        for issued in [&first_issue, &second_issue] {
            assert!(issued.starts_with("HTTP/1.1 201 Created\r\n"));
        }
        let operator_gets = [&first_issue, &second_issue].map(|issued| {
            let cookie = issued
                .lines()
                .filter_map(|line| line.strip_prefix("Set-Cookie: "))
                .map(|value| value.split(';').next().expect("cookie pair should exist"))
                .collect::<Vec<_>>()
                .join("; ");
            fixture.valid_get().replace(&fixture.cookie, &cookie)
        });

        let request = fixture.identity_disablement_request("identity:human:operator");
        let response = request_at(fixture.address, request.as_bytes());
        assert!(response.starts_with("HTTP/1.1 200 OK\r\n"));
        assert!(response.contains("LNSAT-Contract-Version: lnsat.contracts.v1_0\r\n"));
        assert!(response.contains("\"contract\":\"lnsat.gateway.identity_disablement.v1_0\""));
        assert!(response.contains("\"contract_version\":\"lnsat.contracts.v1_0\""));
        assert!(response.contains("\"ok\":true"));
        assert!(response.contains("\"status\":\"disabled\""));
        assert!(response.contains("\"scope\":\"non_owner_identity\""));
        assert!(response.contains("\"identity_ref\":\"identity:human:operator\""));
        assert!(response.contains("\"disabled_at\":"));
        assert!(response.contains("\"revoked_session_count\":2"));
        assert!(response.contains("\"actor_role\":\"owner\""));
        assert!(response.contains("\"permission\":\"manage_identities\""));
        assert!(response.contains("\"actor_session_bound\":true"));
        assert!(response.contains("\"csrf_verified\":true"));
        assert!(response.contains("\"replay_semantics\":\"one_time_active_target_identity\""));
        assert!(response.contains("\"session_activity_evidence_may_append\""));
        assert!(response.contains("\"identity_status_evidence_appended\""));
        assert!(response.contains("\"identity_security_event_appended\""));
        assert!(response.contains("\"target_session_revocations_may_append\""));
        assert!(response.contains("\"target_session_security_events_may_append\""));
        assert!(response.contains("\"permanent\":true"));
        assert!(response.contains("\"target_session_family_closed\":true"));
        assert!(response.contains("\"reenable_authority\":false"));
        assert!(response.contains("\"identity_state_changed\":true"));
        assert!(response.contains("\"session_authority_state_changed\":true"));
        assert!(response.contains("\"execution_authority\":false"));
        assert!(response.contains("\"mutation_authority\":false"));
        assert!(!response.contains(operator_password));
        assert!(!response.contains(&fixture.session_token));
        assert!(!response.contains(&fixture.csrf_token));
        assert!(!response.contains("Set-Cookie:"));
        assert!(!response.contains("Access-Control-Allow-"));
        assert!(!response.contains("WWW-Authenticate:"));

        let owner_read = request_at(fixture.address, fixture.valid_get().as_bytes());
        assert!(owner_read.starts_with("HTTP/1.1 200 OK\r\n"));
        for operator_get in &operator_gets {
            let denied = request_at(fixture.address, operator_get.as_bytes());
            assert!(denied.starts_with("HTTP/1.1 403 Forbidden\r\n"));
            assert!(denied.contains(GATEWAY_SESSION_READ_ERROR_CODE_V1));
        }
        let replay = request_at(fixture.address, request.as_bytes());
        assert!(replay.starts_with("HTTP/1.1 403 Forbidden\r\n"));
        assert!(replay.contains(GATEWAY_IDENTITY_DISABLEMENT_ERROR_CODE_V1));
        assert!(replay.contains("\"side_effects\":[]"));
        assert!(replay.contains("\"identity_ref\":null"));
        assert!(!replay.contains("Set-Cookie:"));

        let auditor_request = fixture.identity_disablement_request("identity:human:auditor");
        let auditor_response = request_at(fixture.address, auditor_request.as_bytes());
        assert!(auditor_response.starts_with("HTTP/1.1 200 OK\r\n"));
        assert!(auditor_response.contains("\"identity_ref\":\"identity:human:auditor\""));
        assert!(auditor_response.contains("\"revoked_session_count\":0"));
        assert!(auditor_response.contains("\"target_session_family_closed\":true"));

        let disabled_login = request_at(
            fixture.address,
            fixture.session_issue_request(&operator_body).as_bytes(),
        );
        assert!(disabled_login.starts_with("HTTP/1.1 403 Forbidden\r\n"));
        assert!(!disabled_login.contains("Set-Cookie:"));
        fixture.stop();
    }

    #[test]
    #[allow(clippy::too_many_lines)]
    fn served_identity_disablement_denies_scope_auth_csrf_and_framing_oracles() {
        let fixture = ServedSessionGatewayFixture::start("served-identity-disablement-denials");
        let operator_password = "correct operator battery staple";
        let auditor_password = "correct auditor battery staple";
        fixture.create_non_owner(
            "identity:human:operator",
            "Local Operator",
            lnsat_store::LocalIdentityRoleV1::Operator,
            operator_password,
        );
        fixture.create_non_owner(
            "identity:human:auditor",
            "Local Auditor",
            lnsat_store::LocalIdentityRoleV1::Auditor,
            auditor_password,
        );
        let issue_identity = |identity_ref: &str, password: &str| {
            let body = serde_json::json!({
                "identity_ref": identity_ref,
                "password": password,
                "lifetime_seconds": 300,
            })
            .to_string();
            request_at(
                fixture.address,
                fixture.session_issue_request(&body).as_bytes(),
            )
        };
        let operator_issue = issue_identity("identity:human:operator", operator_password);
        let auditor_issue = issue_identity("identity:human:auditor", auditor_password);
        for issued in [&operator_issue, &auditor_issue] {
            assert!(issued.starts_with("HTTP/1.1 201 Created\r\n"));
        }
        let cookie_and_csrf = |issued: &str| {
            let pairs = issued
                .lines()
                .filter_map(|line| line.strip_prefix("Set-Cookie: "))
                .map(|value| value.split(';').next().expect("cookie pair should exist"))
                .collect::<Vec<_>>();
            let csrf = pairs
                .iter()
                .find_map(|pair| pair.strip_prefix("lnsat_csrf_v1="))
                .expect("CSRF cookie should exist")
                .to_owned();
            (pairs.join("; "), csrf)
        };
        let (operator_cookie, operator_csrf) = cookie_and_csrf(&operator_issue);
        let (auditor_cookie, _) = cookie_and_csrf(&auditor_issue);

        let valid = fixture.identity_disablement_request("identity:human:operator");
        let owner_target = fixture.identity_disablement_request("identity:human:owner");
        let unknown_target = fixture.identity_disablement_request("identity:human:unknown");
        let empty_target = fixture.identity_disablement_request("");
        let malformed_target =
            fixture.identity_disablement_request("identity:human:operator/extra");
        let non_owner = fixture
            .identity_disablement_request("identity:human:auditor")
            .replace(&fixture.cookie, &operator_cookie)
            .replace(
                &format!("{LOCAL_CSRF_HEADER_NAME_V1}: {}", fixture.csrf_token),
                &format!("{LOCAL_CSRF_HEADER_NAME_V1}: {operator_csrf}"),
            );
        let missing_csrf = valid.replace(
            &format!("{LOCAL_CSRF_HEADER_NAME_V1}: {}\r\n", fixture.csrf_token),
            "",
        );
        let mut wrong_csrf_value = fixture.csrf_token.clone();
        wrong_csrf_value.replace_range(
            wrong_csrf_value.len() - 1..,
            if wrong_csrf_value.ends_with('a') {
                "b"
            } else {
                "a"
            },
        );
        let wrong_csrf = valid.replace(&fixture.csrf_token, &wrong_csrf_value);
        let cross_site = valid.replace("Sec-Fetch-Site: same-origin", "Sec-Fetch-Site: cross-site");
        let wrong_origin = valid.replace("Origin: http://", "Origin: http://127.0.0.2:");
        let wrong_media_type =
            valid.replace("Content-Type: application/json", "Content-Type: text/plain");
        let missing_length = valid.replace("Content-Length: 0\r\n", "");
        let missing_auth = valid.replace(&format!("Cookie: {}\r\n", fixture.cookie), "");
        let nonempty_body = valid
            .replace("Content-Length: 0\r\n", "Content-Length: 1\r\n")
            .replacen("\r\n\r\n", "\r\n\r\nx", 1);

        for invalid_version in [
            valid.replace(
                &format!("{GATEWAY_CONTRACT_VERSION_HEADER_NAME_V1}: {CONTRACT_VERSION_V1_0}\r\n"),
                "",
            ),
            valid.replace(CONTRACT_VERSION_V1_0, "lnsat.contracts.v0_1"),
        ] {
            let response = request_at(fixture.address, invalid_version.as_bytes());
            assert!(response.starts_with("HTTP/1.1 400 Bad Request\r\n"));
            assert!(response.contains("contract.version."));
            assert!(!response.contains(GATEWAY_IDENTITY_DISABLEMENT_ERROR_CODE_V1));
            assert!(!response.contains("LNSAT-Contract-Version: lnsat.contracts."));
        }

        let mut generic_denial = None;
        for denied_request in [
            owner_target,
            unknown_target,
            empty_target,
            malformed_target,
            non_owner,
            missing_csrf,
            wrong_csrf,
            cross_site,
            wrong_origin,
            wrong_media_type,
            missing_length,
            missing_auth,
            nonempty_body,
        ] {
            let response = request_at(fixture.address, denied_request.as_bytes());
            assert!(response.starts_with("HTTP/1.1 403 Forbidden\r\n"));
            assert!(response.contains(GATEWAY_IDENTITY_DISABLEMENT_ERROR_CODE_V1));
            assert!(response.contains("\"contract\":\"lnsat.gateway.identity_disablement.v1_0\""));
            assert!(response.contains("\"identity_ref\":null"));
            assert!(response.contains("\"disabled_at\":null"));
            assert!(response.contains("\"revoked_session_count\":null"));
            assert!(response.contains("\"side_effects\":[]"));
            assert!(response.contains("\"identity_state_changed\":false"));
            assert!(response.contains("\"session_authority_state_changed\":false"));
            assert!(response.contains("\"execution_authority\":false"));
            assert!(response.contains("\"mutation_authority\":false"));
            assert!(response.contains("LNSAT-Contract-Version: lnsat.contracts.v1_0\r\n"));
            assert!(!response.contains("Set-Cookie:"));
            assert!(!response.contains("Access-Control-Allow-"));
            assert!(!response.contains("identity:human:owner"));
            assert!(!response.contains("identity:human:unknown"));
            generic_denial.get_or_insert_with(|| response.clone());
            assert_eq!(Some(&response), generic_denial.as_ref());
        }

        let trailing_body = request_at(fixture.address, format!("{valid}x").as_bytes());
        assert!(trailing_body.starts_with("HTTP/1.1 400 Bad Request\r\n"));
        let get_method = valid.replacen("DELETE ", "GET ", 1);
        let get_response = request_at(fixture.address, get_method.as_bytes());
        assert!(get_response.starts_with("HTTP/1.1 405 Method Not Allowed\r\n"));
        assert!(get_response.contains("Allow: DELETE\r\n"));

        let owner_read = request_at(fixture.address, fixture.valid_get().as_bytes());
        let operator_get = fixture
            .valid_get()
            .replace(&fixture.cookie, &operator_cookie);
        let auditor_get = fixture
            .valid_get()
            .replace(&fixture.cookie, &auditor_cookie);
        for authenticated in [
            owner_read,
            request_at(fixture.address, operator_get.as_bytes()),
            request_at(fixture.address, auditor_get.as_bytes()),
        ] {
            assert!(authenticated.starts_with("HTTP/1.1 200 OK\r\n"));
        }
        fixture.stop();
    }

    #[test]
    #[allow(clippy::too_many_lines)]
    fn served_identity_event_read_is_role_bound_ordered_secret_free_and_bodyless_on_head() {
        let fixture = ServedSessionGatewayFixture::start("served-identity-event-read");
        let operator_password = "correct operator battery staple";
        let auditor_password = "correct auditor battery staple";
        fixture.create_non_owner(
            "identity:human:operator",
            "Local Operator",
            lnsat_store::LocalIdentityRoleV1::Operator,
            operator_password,
        );
        fixture.create_non_owner(
            "identity:human:auditor",
            "Local Auditor",
            lnsat_store::LocalIdentityRoleV1::Auditor,
            auditor_password,
        );
        let issue_identity = |identity_ref: &str, password: &str| {
            let body = serde_json::json!({
                "identity_ref": identity_ref,
                "password": password,
                "lifetime_seconds": 300,
            })
            .to_string();
            request_at(
                fixture.address,
                fixture.session_issue_request(&body).as_bytes(),
            )
        };
        let operator_issue = issue_identity("identity:human:operator", operator_password);
        let auditor_issue = issue_identity("identity:human:auditor", auditor_password);
        let response_cookie = |response: &str| {
            response
                .lines()
                .filter_map(|line| line.strip_prefix("Set-Cookie: "))
                .map(|value| value.split(';').next().expect("cookie pair should exist"))
                .collect::<Vec<_>>()
                .join("; ")
        };
        let operator_cookie = response_cookie(&operator_issue);
        let auditor_cookie = response_cookie(&auditor_issue);

        let owner_request = fixture.identity_event_read_request("GET", "identity:human:owner");
        let operator_request = owner_request.replace(&fixture.cookie, &operator_cookie);
        let auditor_request = owner_request.replace(&fixture.cookie, &auditor_cookie);
        let mut owner_response = None;
        for request in [owner_request, operator_request, auditor_request] {
            let response = request_at(fixture.address, request.as_bytes());
            assert!(response.starts_with("HTTP/1.1 200 OK\r\n"));
            assert!(response.contains("LNSAT-Contract-Version: lnsat.contracts.v1_0\r\n"));
            assert!(response.contains("\"contract\":\"lnsat.gateway.identity_event_read.v1_0\""));
            assert!(response.contains("\"event_order\":\"event_sequence_ascending\""));
            assert!(
                response.contains("\"side_effects\":[\"session_activity_evidence_may_append\"]")
            );
            assert!(!response.contains("Access-Control-Allow-"));
            owner_response.get_or_insert(response);
        }
        let owner_response = owner_response.expect("owner response should exist");
        let (_, owner_body) = owner_response
            .split_once("\r\n\r\n")
            .expect("response should contain one header boundary");
        let owner_value: serde_json::Value =
            serde_json::from_str(owner_body).expect("identity-event response should parse");
        assert_eq!(owner_value["identity_ref"], "identity:human:owner");
        assert_eq!(owner_value["events"][0]["event_sequence"], 1);
        assert_eq!(owner_value["events"][0]["event_kind"], "owner_bootstrapped");
        assert_eq!(
            owner_value["events"][0]["actor_session_id"],
            serde_json::Value::Null
        );
        assert_eq!(owner_value["events"][0]["credential_version"], 1);

        let disabled = request_at(
            fixture.address,
            fixture
                .identity_disablement_request("identity:human:operator")
                .as_bytes(),
        );
        assert!(disabled.starts_with("HTTP/1.1 200 OK\r\n"));
        let get_request = fixture.identity_event_read_request("GET", "identity:human:operator");
        let get_response = request_at(fixture.address, get_request.as_bytes());
        assert!(get_response.starts_with("HTTP/1.1 200 OK\r\n"));
        let (_, get_body) = get_response
            .split_once("\r\n\r\n")
            .expect("GET response should contain body");
        let get_value: serde_json::Value =
            serde_json::from_str(get_body).expect("identity-event response should parse");
        assert_eq!(get_value["status"], "evidence_read");
        assert_eq!(get_value["scope"], "target_identity");
        assert_eq!(get_value["events"].as_array().map(Vec::len), Some(2));
        assert_eq!(get_value["events"][0]["event_sequence"], 1);
        assert_eq!(get_value["events"][0]["event_kind"], "identity_created");
        assert_eq!(get_value["events"][1]["event_sequence"], 2);
        assert_eq!(get_value["events"][1]["event_kind"], "identity_disabled");
        for field in [
            "identity_state_changed",
            "session_authority_state_changed",
            "execution_authority",
            "mutation_authority",
        ] {
            assert_eq!(get_value[field], false);
        }
        for forbidden in [
            operator_password,
            auditor_password,
            fixture.session_token.as_str(),
            fixture.csrf_token.as_str(),
            "$argon2",
            "password_verifier",
        ] {
            assert!(!get_response.contains(forbidden));
        }

        let head_request = fixture.identity_event_read_request("HEAD", "identity:human:operator");
        let head_response = request_at(fixture.address, head_request.as_bytes());
        assert!(head_response.starts_with("HTTP/1.1 200 OK\r\n"));
        let (_, head_body) = head_response
            .split_once("\r\n\r\n")
            .expect("HEAD response should contain header boundary");
        assert!(head_body.is_empty());
        let content_length = |response: &str| {
            response
                .lines()
                .find_map(|line| line.strip_prefix("Content-Length: "))
                .expect("response should contain content length")
                .to_owned()
        };
        assert_eq!(
            content_length(&head_response),
            content_length(&get_response)
        );
        fixture.stop();
    }

    #[test]
    #[allow(clippy::too_many_lines)]
    fn served_identity_event_read_rejects_oracles_ambiguous_paths_bodies_and_mutations() {
        let fixture = ServedSessionGatewayFixture::start("served-identity-event-read-denials");
        let valid = fixture.identity_event_read_request("GET", "identity:human:owner");
        for invalid_version in [
            valid.replace(
                &format!("{GATEWAY_CONTRACT_VERSION_HEADER_NAME_V1}: {CONTRACT_VERSION_V1_0}\r\n"),
                "",
            ),
            valid.replace(CONTRACT_VERSION_V1_0, "lnsat.contracts.v0_1"),
        ] {
            let response = request_at(fixture.address, invalid_version.as_bytes());
            assert!(response.starts_with("HTTP/1.1 400 Bad Request\r\n"));
            assert!(response.contains("contract.version."));
            assert!(!response.contains(GATEWAY_IDENTITY_EVENT_READ_ERROR_CODE_V1));
            assert!(!response.contains("LNSAT-Contract-Version: lnsat.contracts."));
        }

        let missing_auth = valid.replace(&format!("Cookie: {}\r\n", fixture.cookie), "");
        let cross_site = valid.replace("Sec-Fetch-Site: same-origin", "Sec-Fetch-Site: cross-site");
        let unknown = fixture.identity_event_read_request("GET", "identity:human:unknown");
        let empty = fixture.identity_event_read_request("GET", "");
        let duplicate_separator =
            fixture.identity_event_read_request("GET", "identity:human:owner/");
        let percent_identity = fixture.identity_event_read_request("GET", "identity:human:%6fwner");
        let percent_route = valid.replace("/events HTTP/1.1", "/%65vents HTTP/1.1");
        let query = valid.replace("/events HTTP/1.1", "/events?limit=1 HTTP/1.1");
        let ambiguous = valid.replace("/events HTTP/1.1", "/events/extra HTTP/1.1");
        let nonempty_body = valid.replacen("\r\n\r\n", "\r\nContent-Length: 1\r\n\r\nx", 1);
        let mut generic_denial = None;
        for denied_request in [
            missing_auth,
            cross_site,
            unknown,
            empty,
            duplicate_separator,
            percent_identity,
            percent_route,
            query,
            ambiguous,
            nonempty_body,
        ] {
            let response = request_at(fixture.address, denied_request.as_bytes());
            assert_stable_identity_event_read_denial(&response);
            for hostile in [
                "identity:human:unknown",
                "%6fwner",
                "limit=1",
                "events/extra",
            ] {
                assert!(!response.contains(hostile));
            }
            generic_denial.get_or_insert_with(|| response.clone());
            assert_eq!(Some(&response), generic_denial.as_ref());
        }

        let denied_head = fixture.identity_event_read_request("HEAD", "identity:human:unknown");
        let denied_head_response = request_at(fixture.address, denied_head.as_bytes());
        assert!(denied_head_response.starts_with("HTTP/1.1 403 Forbidden\r\n"));
        let (_, head_body) = denied_head_response
            .split_once("\r\n\r\n")
            .expect("HEAD denial should contain header boundary");
        assert!(head_body.is_empty());
        let get_length = generic_denial
            .as_ref()
            .and_then(|response| {
                response
                    .lines()
                    .find_map(|line| line.strip_prefix("Content-Length: "))
            })
            .expect("GET denial should contain length");
        let head_length = denied_head_response
            .lines()
            .find_map(|line| line.strip_prefix("Content-Length: "))
            .expect("HEAD denial should contain length");
        assert_eq!(head_length, get_length);

        for method in ["POST", "PUT", "PATCH", "DELETE", "OPTIONS"] {
            let response = request_at(
                fixture.address,
                fixture
                    .identity_event_read_request(method, "identity:human:owner")
                    .as_bytes(),
            );
            assert!(response.starts_with("HTTP/1.1 405 Method Not Allowed\r\n"));
            assert!(response.contains("Allow: GET, HEAD\r\n"));
            assert!(!response.contains("Access-Control-Allow-"));
            assert!(!response.contains(GATEWAY_IDENTITY_EVENT_READ_CONTRACT_V1));
        }
        fixture.stop();
    }

    #[test]
    #[allow(clippy::too_many_lines)]
    fn served_session_event_read_is_role_bound_ordered_secret_free_and_bodyless_on_head() {
        let fixture = ServedSessionGatewayFixture::start("served-session-event-read");
        let target_session_id = fixture.issued.session().session_id.clone();
        let operator_password = "correct operator battery staple";
        let auditor_password = "correct auditor battery staple";
        fixture.create_non_owner(
            "identity:human:operator",
            "Local Operator",
            lnsat_store::LocalIdentityRoleV1::Operator,
            operator_password,
        );
        fixture.create_non_owner(
            "identity:human:auditor",
            "Local Auditor",
            lnsat_store::LocalIdentityRoleV1::Auditor,
            auditor_password,
        );
        let issue_identity = |identity_ref: &str, password: &str| {
            let body = serde_json::json!({
                "identity_ref": identity_ref,
                "password": password,
                "lifetime_seconds": 300,
            })
            .to_string();
            request_at(
                fixture.address,
                fixture.session_issue_request(&body).as_bytes(),
            )
        };
        let response_cookie = |response: &str| {
            response
                .lines()
                .filter_map(|line| line.strip_prefix("Set-Cookie: "))
                .map(|value| value.split(';').next().expect("cookie pair should exist"))
                .collect::<Vec<_>>()
                .join("; ")
        };
        let operator_issue = issue_identity("identity:human:operator", operator_password);
        let auditor_issue = issue_identity("identity:human:auditor", auditor_password);
        let operator_cookie = response_cookie(&operator_issue);
        let auditor_cookie = response_cookie(&auditor_issue);
        let owner_request = fixture.session_event_read_request("GET", &target_session_id);
        for request in [
            owner_request.clone(),
            owner_request.replace(&fixture.cookie, &operator_cookie),
            owner_request.replace(&fixture.cookie, &auditor_cookie),
        ] {
            let response = request_at(fixture.address, request.as_bytes());
            assert!(response.starts_with("HTTP/1.1 200 OK\r\n"));
            assert!(response.contains("LNSAT-Contract-Version: lnsat.contracts.v1_0\r\n"));
            assert!(response.contains("\"contract\":\"lnsat.gateway.session_event_read.v1_0\""));
            assert!(response.contains("\"event_order\":\"event_sequence_ascending\""));
            assert!(
                response.contains("\"side_effects\":[\"session_activity_evidence_may_append\"]")
            );
            assert!(!response.contains("Access-Control-Allow-"));
        }

        let rotation_response = request_at(
            fixture.address,
            fixture.session_rotation_request().as_bytes(),
        );
        assert!(rotation_response.starts_with("HTTP/1.1 200 OK\r\n"));
        let replacement_cookie = response_cookie(&rotation_response);
        let replacement_session_id = rotation_response
            .split_once("\"session_id\":\"")
            .and_then(|(_, value)| value.split_once('"'))
            .map(|(value, _)| value)
            .expect("rotation should expose replacement session id");

        let get_request = fixture
            .session_event_read_request("GET", &target_session_id)
            .replace(&fixture.cookie, &replacement_cookie);
        let get_response = request_at(fixture.address, get_request.as_bytes());
        assert!(get_response.starts_with("HTTP/1.1 200 OK\r\n"));
        let (_, get_body) = get_response
            .split_once("\r\n\r\n")
            .expect("GET response should contain body");
        let value: serde_json::Value =
            serde_json::from_str(get_body).expect("session-event response should parse");
        assert_eq!(value["status"], "evidence_read");
        assert_eq!(value["scope"], "target_session");
        assert_eq!(value["session_id"], target_session_id);
        assert_eq!(value["events"].as_array().map(Vec::len), Some(3));
        assert_eq!(value["events"][0]["event_sequence"], 1);
        assert_eq!(value["events"][0]["event_kind"], "issued");
        assert_eq!(
            value["events"][0]["actor_session_id"],
            serde_json::Value::Null
        );
        assert_eq!(
            value["events"][0]["related_session_id"],
            serde_json::Value::Null
        );
        assert_eq!(
            value["events"][0]["revocation_reason"],
            serde_json::Value::Null
        );
        assert_eq!(value["events"][1]["event_sequence"], 2);
        assert_eq!(value["events"][1]["event_kind"], "revoked");
        assert_eq!(value["events"][1]["actor_session_id"], target_session_id);
        assert_eq!(
            value["events"][1]["related_session_id"],
            serde_json::Value::Null
        );
        assert_eq!(value["events"][1]["revocation_reason"], "rotation");
        assert_eq!(value["events"][2]["event_sequence"], 3);
        assert_eq!(value["events"][2]["event_kind"], "rotated");
        assert_eq!(value["events"][2]["actor_session_id"], target_session_id);
        assert_eq!(
            value["events"][2]["related_session_id"],
            replacement_session_id
        );
        assert_eq!(
            value["events"][2]["revocation_reason"],
            serde_json::Value::Null
        );
        let event_fields = [
            "event_id",
            "session_id",
            "event_sequence",
            "event_kind",
            "actor_session_id",
            "related_session_id",
            "revocation_reason",
            "source_evidence_digest",
            "occurred_at",
            "event_evidence_digest",
        ]
        .into_iter()
        .collect::<std::collections::BTreeSet<_>>();
        for event in value["events"]
            .as_array()
            .expect("events should be an array")
        {
            let actual = event
                .as_object()
                .expect("event should be an object")
                .keys()
                .map(String::as_str)
                .collect::<std::collections::BTreeSet<_>>();
            assert_eq!(actual, event_fields);
        }
        for field in [
            "identity_state_changed",
            "session_authority_state_changed",
            "packet_state_changed",
            "action_state_changed",
            "signing_authority",
            "nonce_authority",
            "consumption_authority",
            "execution_authority",
            "mutation_authority",
        ] {
            assert_eq!(value[field], false);
        }
        for forbidden in [
            operator_password,
            auditor_password,
            fixture.session_token.as_str(),
            fixture.csrf_token.as_str(),
            "$argon2",
            "password_verifier",
            "raw_session_token",
            "raw_csrf_token",
        ] {
            assert!(!get_response.contains(forbidden));
        }

        let head_request = fixture
            .session_event_read_request("HEAD", &target_session_id)
            .replace(&fixture.cookie, &replacement_cookie);
        let head_response = request_at(fixture.address, head_request.as_bytes());
        assert!(head_response.starts_with("HTTP/1.1 200 OK\r\n"));
        let (_, head_body) = head_response
            .split_once("\r\n\r\n")
            .expect("HEAD response should contain header boundary");
        assert!(head_body.is_empty());
        let content_length = |response: &str| {
            response
                .lines()
                .find_map(|line| line.strip_prefix("Content-Length: "))
                .expect("response should contain content length")
                .to_owned()
        };
        assert_eq!(
            content_length(&head_response),
            content_length(&get_response)
        );
        fixture.stop();
    }

    #[test]
    #[allow(clippy::too_many_lines)]
    fn served_session_event_read_rejects_oracles_ambiguous_paths_bodies_and_mutations() {
        let fixture = ServedSessionGatewayFixture::start("served-session-event-read-denials");
        let target_session_id = fixture.issued.session().session_id.clone();
        let valid = fixture.session_event_read_request("GET", &target_session_id);
        for invalid_version in [
            valid.replace(
                &format!("{GATEWAY_CONTRACT_VERSION_HEADER_NAME_V1}: {CONTRACT_VERSION_V1_0}\r\n"),
                "",
            ),
            valid.replace(CONTRACT_VERSION_V1_0, "lnsat.contracts.v0_1"),
        ] {
            let response = request_at(fixture.address, invalid_version.as_bytes());
            assert!(response.starts_with("HTTP/1.1 400 Bad Request\r\n"));
            assert!(response.contains("contract.version."));
            assert!(!response.contains(GATEWAY_SESSION_EVENT_READ_ERROR_CODE_V1));
            assert!(!response.contains("LNSAT-Contract-Version: lnsat.contracts."));
        }

        let missing_auth = valid.replace(&format!("Cookie: {}\r\n", fixture.cookie), "");
        let cross_site = valid.replace("Sec-Fetch-Site: same-origin", "Sec-Fetch-Site: cross-site");
        let unknown =
            fixture.session_event_read_request("GET", "ses_00000000000000000000000000000000");
        let empty = fixture.session_event_read_request("GET", "");
        let short = fixture.session_event_read_request("GET", "ses_1234");
        let uppercase =
            fixture.session_event_read_request("GET", "ses_A0000000000000000000000000000000");
        let duplicate_separator = valid.replace("/events HTTP/1.1", "//events HTTP/1.1");
        let percent_session = valid.replace("ses_", "ses_%30");
        let percent_route = valid.replace("/events HTTP/1.1", "/%65vents HTTP/1.1");
        let query = valid.replace("/events HTTP/1.1", "/events?limit=1 HTTP/1.1");
        let fragment = valid.replace("/events HTTP/1.1", "/events#latest HTTP/1.1");
        let ambiguous = valid.replace("/events HTTP/1.1", "/events/extra HTTP/1.1");
        let nonempty_body = valid.replacen("\r\n\r\n", "\r\nContent-Length: 1\r\n\r\nx", 1);
        let mut generic_denial = None;
        for denied_request in [
            missing_auth,
            cross_site,
            unknown,
            empty,
            short,
            uppercase,
            duplicate_separator,
            percent_session,
            percent_route,
            query,
            ambiguous,
            nonempty_body,
        ] {
            let response = request_at(fixture.address, denied_request.as_bytes());
            assert_stable_session_event_read_denial(&response);
            for hostile in [
                "ses_00000000000000000000000000000000",
                "ses_1234",
                "ses_A",
                "%30",
                "limit=1",
                "latest",
                "events/extra",
            ] {
                assert!(!response.contains(hostile));
            }
            generic_denial.get_or_insert_with(|| response.clone());
            assert_eq!(Some(&response), generic_denial.as_ref());
        }
        let fragment_response = request_at(fixture.address, fragment.as_bytes());
        assert!(fragment_response.starts_with("HTTP/1.1 400 Bad Request\r\n"));
        assert!(fragment_response.contains("lnsatd.request.invalid"));
        assert!(!fragment_response.contains(GATEWAY_SESSION_EVENT_READ_CONTRACT_V1));
        assert!(!fragment_response.contains("LNSAT-Contract-Version:"));

        let denied_head =
            fixture.session_event_read_request("HEAD", "ses_00000000000000000000000000000000");
        let denied_head_response = request_at(fixture.address, denied_head.as_bytes());
        assert!(denied_head_response.starts_with("HTTP/1.1 403 Forbidden\r\n"));
        let (_, head_body) = denied_head_response
            .split_once("\r\n\r\n")
            .expect("HEAD denial should contain header boundary");
        assert!(head_body.is_empty());
        let get_length = generic_denial
            .as_ref()
            .and_then(|response| {
                response
                    .lines()
                    .find_map(|line| line.strip_prefix("Content-Length: "))
            })
            .expect("GET denial should contain length");
        let head_length = denied_head_response
            .lines()
            .find_map(|line| line.strip_prefix("Content-Length: "))
            .expect("HEAD denial should contain length");
        assert_eq!(head_length, get_length);

        for method in ["POST", "PUT", "PATCH", "DELETE", "OPTIONS"] {
            let response = request_at(
                fixture.address,
                fixture
                    .session_event_read_request(method, &target_session_id)
                    .as_bytes(),
            );
            assert!(response.starts_with("HTTP/1.1 405 Method Not Allowed\r\n"));
            assert!(response.contains("Allow: GET, HEAD\r\n"));
            assert!(!response.contains("Access-Control-Allow-"));
            assert!(!response.contains(GATEWAY_SESSION_EVENT_READ_CONTRACT_V1));
        }
        fixture.stop();
    }

    #[test]
    fn served_session_family_sign_out_revokes_and_clears_host_only_cookies() {
        let fixture = ServedSessionGatewayFixture::start("served-session-family-sign-out");
        let operator_password = "correct operator battery staple";
        fixture.create_non_owner(
            "identity:human:operator",
            "Local Operator",
            lnsat_store::LocalIdentityRoleV1::Operator,
            operator_password,
        );
        let operator_body = serde_json::json!({
            "identity_ref": "identity:human:operator",
            "password": operator_password,
            "lifetime_seconds": 300,
        })
        .to_string();
        let operator_issue = request_at(
            fixture.address,
            fixture.session_issue_request(&operator_body).as_bytes(),
        );
        assert!(operator_issue.starts_with("HTTP/1.1 201 Created\r\n"));
        let operator_cookie = operator_issue
            .lines()
            .filter_map(|line| line.strip_prefix("Set-Cookie: "))
            .map(|value| value.split(';').next().expect("cookie pair should exist"))
            .collect::<Vec<_>>()
            .join("; ");
        let operator_get = fixture
            .valid_get()
            .replace(&fixture.cookie, &operator_cookie);

        let second_body = serde_json::json!({
            "identity_ref": "identity:human:owner",
            "password": "correct horse battery staple",
            "lifetime_seconds": 300,
        })
        .to_string();
        let second_issue = request_at(
            fixture.address,
            fixture.session_issue_request(&second_body).as_bytes(),
        );
        assert!(second_issue.starts_with("HTTP/1.1 201 Created\r\n"));
        let second_cookie = second_issue
            .lines()
            .filter_map(|line| line.strip_prefix("Set-Cookie: "))
            .map(|value| value.split(';').next().expect("cookie pair should exist"))
            .collect::<Vec<_>>()
            .join("; ");
        let second_get = fixture.valid_get().replace(&fixture.cookie, &second_cookie);

        let request = fixture.session_family_sign_out_request();
        let response = request_at(fixture.address, request.as_bytes());

        let sign_out_value = stable_session_family_sign_out_success_body(&response);
        assert_eq!(
            sign_out_value.get("identity_ref"),
            Some(&serde_json::json!("identity:human:owner"))
        );
        assert_eq!(
            sign_out_value.get("family_session_count"),
            Some(&serde_json::json!(3))
        );
        assert_eq!(
            sign_out_value.get("newly_revoked_session_count"),
            Some(&serde_json::json!(2))
        );
        assert!(!response.contains(&fixture.session_token));
        assert!(!response.contains(&fixture.csrf_token));
        assert!(!response.contains("Access-Control-Allow-"));
        assert!(!response.contains("WWW-Authenticate:"));

        let set_cookie_values = response
            .lines()
            .filter_map(|line| line.strip_prefix("Set-Cookie: "))
            .collect::<Vec<_>>();
        assert_eq!(
            set_cookie_values,
            [
                "lnsat_session_v1=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0",
                "lnsat_csrf_v1=; Path=/; SameSite=Strict; Max-Age=0",
            ]
        );
        for value in &set_cookie_values {
            assert!(!value.contains("Domain="));
            assert!(!value.contains("Secure"));
        }

        let read_after_sign_out = request_at(fixture.address, fixture.valid_get().as_bytes());
        let second_read_after_sign_out = request_at(fixture.address, second_get.as_bytes());
        let other_identity_read = request_at(fixture.address, operator_get.as_bytes());
        let replay = request_at(fixture.address, request.as_bytes());
        for denied in [&read_after_sign_out, &second_read_after_sign_out] {
            assert!(denied.starts_with("HTTP/1.1 403 Forbidden\r\n"));
            assert!(denied.contains(GATEWAY_SESSION_READ_ERROR_CODE_V1));
            assert!(!denied.contains("Set-Cookie:"));
            assert!(!denied.contains("Access-Control-Allow-"));
        }
        assert!(other_identity_read.starts_with("HTTP/1.1 200 OK\r\n"));
        assert_stable_session_family_sign_out_denial(&replay);
        assert!(!replay.contains("Access-Control-Allow-"));
        fixture.stop();
    }

    #[test]
    fn served_session_family_sign_out_requires_exact_csrf_and_empty_framing() {
        let fixture = ServedSessionGatewayFixture::start("served-session-sign-out-denials");
        let valid = fixture.session_family_sign_out_request();
        let missing_csrf = valid.replace(
            &format!("{LOCAL_CSRF_HEADER_NAME_V1}: {}\r\n", fixture.csrf_token),
            "",
        );
        let mut mismatched_csrf = fixture.csrf_token.clone();
        let replacement = if mismatched_csrf.ends_with('a') {
            "b"
        } else {
            "a"
        };
        mismatched_csrf.replace_range(mismatched_csrf.len() - 1.., replacement);
        let wrong_csrf = valid.replacen(
            &format!("{LOCAL_CSRF_HEADER_NAME_V1}: {}\r\n", fixture.csrf_token),
            &format!("{LOCAL_CSRF_HEADER_NAME_V1}: {mismatched_csrf}\r\n"),
            1,
        );
        let cross_site = valid.replace("Sec-Fetch-Site: same-origin", "Sec-Fetch-Site: cross-site");
        let wrong_origin = valid.replace("Origin: http://", "Origin: http://127.0.0.2:");
        let wrong_media_type =
            valid.replace("Content-Type: application/json", "Content-Type: text/plain");
        let missing_length = valid.replace("Content-Length: 0\r\n", "");
        let missing_auth = valid.replace(&format!("Cookie: {}\r\n", fixture.cookie), "");
        let nonempty_body = valid
            .replace("Content-Length: 0\r\n", "Content-Length: 1\r\n")
            .replacen("\r\n\r\n", "\r\n\r\nx", 1);
        let trailing_body = format!("{valid}x");

        let mut generic_denial = None;
        for denied_request in [
            missing_csrf,
            wrong_csrf,
            cross_site,
            wrong_origin,
            wrong_media_type,
            missing_length,
            missing_auth,
            nonempty_body,
        ] {
            let response = request_at(fixture.address, denied_request.as_bytes());
            assert_stable_session_family_sign_out_denial(&response);
            assert!(!response.contains("Access-Control-Allow-"));
            generic_denial.get_or_insert_with(|| response.clone());
            assert_eq!(Some(&response), generic_denial.as_ref());
        }

        let malformed_framing = request_at(fixture.address, trailing_body.as_bytes());
        assert!(malformed_framing.starts_with("HTTP/1.1 400 Bad Request\r\n"));
        assert!(!malformed_framing.contains("Set-Cookie:"));
        assert!(!malformed_framing.contains("Access-Control-Allow-"));

        let still_authenticated = request_at(fixture.address, fixture.valid_get().as_bytes());
        assert!(still_authenticated.starts_with("HTTP/1.1 200 OK\r\n"));
        fixture.stop();
    }

    #[test]
    fn route_neutral_browser_transport_binds_headers_cookies_and_store_proof() {
        let directory = TestDirectory::new("browser-transport");
        let mut store =
            SqliteStore::open(directory.database_path()).expect("store should bootstrap");
        store
            .bootstrap_local_owner_v1(&lnsat_store::LocalOwnerBootstrapInputV1 {
                identity_ref: "identity:human:owner",
                display_name: "Local Owner",
                password: "correct horse battery staple",
                created_at: "2026-07-23T17:00:00Z",
            })
            .expect("owner should bootstrap");
        let issued = store
            .issue_local_owner_session_v1(&lnsat_store::LocalSessionIssueInputV1 {
                identity_ref: "identity:human:owner",
                password: "correct horse battery staple",
                issued_at: "2026-07-23T17:01:00Z",
                expires_at: "2026-07-23T17:06:00Z",
            })
            .expect("owner session should issue");
        let response_cookies = create_local_browser_session_cookie_headers_for_issue_v1(&issued)
            .expect("cookie lifetime should derive from session evidence");
        assert!(response_cookies.session().contains("Max-Age=300"));
        assert!(response_cookies.csrf().contains("Max-Age=300"));
        let bound_address: SocketAddr = "127.0.0.1:7447"
            .parse()
            .expect("bound address should parse");
        let peer_address: IpAddr = "127.0.0.1".parse().expect("peer should parse");
        let cookie = format!(
            "{}={}; {}={}",
            lnsat_auth::LOCAL_SESSION_COOKIE_NAME_V1,
            issued.raw_session_token,
            lnsat_auth::LOCAL_CSRF_COOKIE_NAME_V1,
            issued.raw_csrf_token,
        );
        let read_head = format!(
            "GET /v1/session HTTP/1.1\r\nHost: 127.0.0.1:7447\r\nSec-Fetch-Site: same-origin\r\nCookie: {cookie}\r\n\r\n"
        );
        let read = parse_local_browser_transport_request_v1(
            read_head.as_bytes(),
            peer_address,
            bound_address,
        )
        .expect("strict browser read should parse");
        assert_eq!(read.target(), "/v1/session");
        assert_eq!(read.raw_session_token(), issued.raw_session_token);
        assert_eq!(read.raw_csrf_token(), None);
        let authorized_read = authorize_local_browser_transport_request_at_v1(
            &mut store,
            &read,
            "2026-07-23T17:02:00Z",
        )
        .expect("active read session should authorize transport");
        assert_eq!(authorized_read.class, LocalBrowserRequestClassV1::ReadOnly);
        assert_eq!(authorized_read.session, issued.session);

        let mutation_head = format!(
            concat!(
                "POST /v1/approval-decisions HTTP/1.1\r\n",
                "Host: 127.0.0.1:7447\r\n",
                "Origin: http://127.0.0.1:7447\r\n",
                "Sec-Fetch-Site: same-origin\r\n",
                "Content-Type: application/json\r\n",
                "Content-Length: 0\r\n",
                "Cookie: {cookie}\r\n",
                "X-LNSAT-CSRF: {csrf}\r\n\r\n"
            ),
            cookie = cookie,
            csrf = issued.raw_csrf_token,
        );
        let mutation = parse_local_browser_transport_request_v1(
            mutation_head.as_bytes(),
            peer_address,
            bound_address,
        )
        .expect("strict browser mutation should parse");
        assert_eq!(
            mutation.raw_csrf_token(),
            Some(issued.raw_csrf_token.as_str())
        );
        assert_eq!(
            authorize_local_browser_transport_request_at_v1(
                &mut store,
                &mutation,
                "2026-07-23T17:06:00Z",
            ),
            Err(LocalBrowserTransportErrorV1::Rejected)
        );
        let authorized_mutation = authorize_local_browser_transport_request_at_v1(
            &mut store,
            &mutation,
            "2026-07-23T17:02:00Z",
        )
        .expect("active session and CSRF should authorize transport");
        assert_eq!(
            authorized_mutation.class,
            LocalBrowserRequestClassV1::MutationPreflight
        );
        assert_eq!(authorized_mutation.target, "/v1/approval-decisions");
    }

    #[test]
    #[allow(clippy::too_many_lines)]
    fn route_neutral_phase7_authorization_issues_reads_and_redeems_once() {
        let mut fixture = Phase7LocalGatewayFixture::new("phase7-gateway-issue-redeem");
        let mutation_head = fixture.requester_mutation_head("/unopened/phase7/authorization");
        let mutation = parse_phase7_transport_v1(&mutation_head)
            .expect("requester mutation transport should parse");
        let mut first = issue_local_browser_phase7_execution_authorization_v1(
            &mut fixture.store,
            &mutation,
            &LocalBrowserPhase7AuthorizationIssueRequestV1 {
                project_ref: "project:lnsat",
                approval_decision_id: &fixture.approval_decision_id,
                operation_idempotency_key: "idempotency:phase7:gateway:issue",
            },
        )
        .expect("exact approved source should authorize");
        assert!(first.created());
        assert!(first.record().active);
        assert_eq!(first.record().state, "active");
        assert_eq!(first.record().audience, "audience:gateway:local");
        assert_eq!(
            first.record().requester_ref,
            "identity:human:phase7-requester"
        );
        assert_eq!(first.record().approver_ref, "identity:human:phase7-owner");
        assert_eq!(
            first.record().operation_idempotency_key,
            "idempotency:phase7:gateway:issue"
        );
        let first_record = first.record().clone();
        let wire = first
            .take_capability_wire_v1()
            .expect("first issue should return one capability");
        assert_eq!(
            format!("{wire:?}"),
            "Phase7ExecutionCapabilityWireV1(<redacted>)"
        );
        assert_eq!(wire.expose_for_authenticated_response_v1().len(), 64);
        assert!(
            wire.expose_for_authenticated_response_v1()
                .bytes()
                .all(|byte| byte.is_ascii_digit() || (b'a'..=b'f').contains(&byte))
        );
        let mut capability_wire = wire.expose_for_authenticated_response_v1().to_owned();
        drop(wire);
        assert!(first.take_capability_wire_v1().is_none());

        let mut replay = issue_local_browser_phase7_execution_authorization_v1(
            &mut fixture.store,
            &mutation,
            &LocalBrowserPhase7AuthorizationIssueRequestV1 {
                project_ref: "project:lnsat",
                approval_decision_id: &fixture.approval_decision_id,
                operation_idempotency_key: "idempotency:phase7:gateway:issue",
            },
        )
        .expect("exact issue replay should return metadata");
        assert!(!replay.created());
        assert_eq!(replay.record(), &first_record);
        assert!(replay.take_capability_wire_v1().is_none());

        let read_head = fixture.requester_read_head("/unopened/phase7/authorization");
        let read =
            parse_phase7_transport_v1(&read_head).expect("requester read transport should parse");
        let read_record = read_local_browser_phase7_execution_authorization_v1(
            &mut fixture.store,
            &read,
            &first_record.project_ref,
            &first_record.resource_ref,
            &first_record.authorization_id,
        )
        .expect("safe metadata read should succeed")
        .expect("authorization should exist");
        assert_eq!(read_record, first_record);

        let consumed = redeem_local_browser_phase7_execution_capability_v1(
            &mut fixture.store,
            &mutation,
            &Phase7CapabilityRedemptionInputV1 {
                project_ref: &first_record.project_ref,
                resource_ref: &first_record.resource_ref,
                authorization_id: &first_record.authorization_id,
                operation_id: &first_record.operation_id,
                idempotency_key: "idempotency:phase7:gateway:redeem",
            },
            &mut capability_wire,
        )
        .expect("exact requester should consume capability");
        assert!(capability_wire.is_empty());
        assert!(consumed.created);
        assert_eq!(
            consumed.record.authorization_id,
            first_record.authorization_id
        );
        assert_eq!(consumed.record.operation_id, first_record.operation_id);
        let terminal = read_local_browser_phase7_execution_authorization_v1(
            &mut fixture.store,
            &read,
            &first_record.project_ref,
            &first_record.resource_ref,
            &first_record.authorization_id,
        )
        .expect("terminal metadata read should succeed")
        .expect("authorization should exist");
        assert_eq!(terminal.state, "consumed");
        assert!(!terminal.active);
    }

    #[test]
    #[allow(clippy::too_many_lines)]
    fn route_neutral_phase7_authorization_collapses_cancel_revoke_and_wire_denials() {
        let mut cancelled = Phase7LocalGatewayFixture::new("phase7-gateway-cancel");
        let requester_head = cancelled.requester_mutation_head("/unopened/phase7/authorization");
        let requester = parse_phase7_transport_v1(&requester_head)
            .expect("requester mutation transport should parse");
        let mut issued = issue_local_browser_phase7_execution_authorization_v1(
            &mut cancelled.store,
            &requester,
            &LocalBrowserPhase7AuthorizationIssueRequestV1 {
                project_ref: "project:lnsat",
                approval_decision_id: &cancelled.approval_decision_id,
                operation_idempotency_key: "idempotency:phase7:cancel:issue",
            },
        )
        .expect("authorization should issue");
        let issued_record = issued.record().clone();
        let wire = issued
            .take_capability_wire_v1()
            .expect("first issue should return one capability");
        let mut capability_wire = wire.expose_for_authenticated_response_v1().to_owned();
        drop(wire);
        let transition = Phase7ExecutionAuthorizationTransitionInputV1 {
            project_ref: &issued_record.project_ref,
            resource_ref: &issued_record.resource_ref,
            authorization_id: &issued_record.authorization_id,
        };

        let owner_head = cancelled.owner_mutation_head("/unopened/phase7/cancel");
        let owner =
            parse_phase7_transport_v1(&owner_head).expect("owner mutation transport should parse");
        let wrong_requester = cancel_local_browser_phase7_execution_authorization_v1(
            &mut cancelled.store,
            &owner,
            &transition,
        );
        assert_eq!(wrong_requester, Err(LocalBrowserTransportErrorV1::Rejected));
        let cancelled_record = cancel_local_browser_phase7_execution_authorization_v1(
            &mut cancelled.store,
            &requester,
            &transition,
        )
        .expect("exact requester should cancel")
        .expect("authorization should exist");
        assert!(cancelled_record.changed);
        assert_eq!(cancelled_record.record.state, "cancelled");
        assert!(!cancelled_record.record.active);
        let redemption = redeem_local_browser_phase7_execution_capability_v1(
            &mut cancelled.store,
            &requester,
            &Phase7CapabilityRedemptionInputV1 {
                project_ref: &issued_record.project_ref,
                resource_ref: &issued_record.resource_ref,
                authorization_id: &issued_record.authorization_id,
                operation_id: &issued_record.operation_id,
                idempotency_key: "idempotency:phase7:cancel:redeem",
            },
            &mut capability_wire,
        );
        assert_eq!(redemption, Err(LocalBrowserTransportErrorV1::Rejected));
        assert!(capability_wire.is_empty());

        let mut invalid_wire = "A".repeat(64);
        let invalid = redeem_local_browser_phase7_execution_capability_v1(
            &mut cancelled.store,
            &requester,
            &Phase7CapabilityRedemptionInputV1 {
                project_ref: &issued_record.project_ref,
                resource_ref: &issued_record.resource_ref,
                authorization_id: &issued_record.authorization_id,
                operation_id: &issued_record.operation_id,
                idempotency_key: "idempotency:phase7:invalid-wire",
            },
            &mut invalid_wire,
        );
        assert_eq!(invalid, Err(LocalBrowserTransportErrorV1::Rejected));
        assert!(invalid_wire.is_empty());

        let mut revoked = Phase7LocalGatewayFixture::new("phase7-gateway-revoke");
        let requester_head = revoked.requester_mutation_head("/unopened/phase7/authorization");
        let requester = parse_phase7_transport_v1(&requester_head)
            .expect("requester mutation transport should parse");
        let mut issued = issue_local_browser_phase7_execution_authorization_v1(
            &mut revoked.store,
            &requester,
            &LocalBrowserPhase7AuthorizationIssueRequestV1 {
                project_ref: "project:lnsat",
                approval_decision_id: &revoked.approval_decision_id,
                operation_idempotency_key: "idempotency:phase7:revoke:issue",
            },
        )
        .expect("authorization should issue");
        let issued_record = issued.record().clone();
        let wire = issued
            .take_capability_wire_v1()
            .expect("first issue should return one capability");
        let mut capability_wire = wire.expose_for_authenticated_response_v1().to_owned();
        drop(wire);
        let transition = Phase7ExecutionAuthorizationTransitionInputV1 {
            project_ref: &issued_record.project_ref,
            resource_ref: &issued_record.resource_ref,
            authorization_id: &issued_record.authorization_id,
        };
        let wrong_approver = revoke_local_browser_phase7_execution_authorization_v1(
            &mut revoked.store,
            &requester,
            &transition,
        );
        assert_eq!(wrong_approver, Err(LocalBrowserTransportErrorV1::Rejected));
        let owner_head = revoked.owner_mutation_head("/unopened/phase7/revoke");
        let owner =
            parse_phase7_transport_v1(&owner_head).expect("owner mutation transport should parse");
        let revoked_record = revoke_local_browser_phase7_execution_authorization_v1(
            &mut revoked.store,
            &owner,
            &transition,
        )
        .expect("local owner should revoke")
        .expect("authorization should exist");
        assert!(revoked_record.changed);
        assert_eq!(revoked_record.record.state, "revoked");
        assert!(!revoked_record.record.active);
        let redemption = redeem_local_browser_phase7_execution_capability_v1(
            &mut revoked.store,
            &requester,
            &Phase7CapabilityRedemptionInputV1 {
                project_ref: &issued_record.project_ref,
                resource_ref: &issued_record.resource_ref,
                authorization_id: &issued_record.authorization_id,
                operation_id: &issued_record.operation_id,
                idempotency_key: "idempotency:phase7:revoke:redeem",
            },
            &mut capability_wire,
        );
        assert_eq!(redemption, Err(LocalBrowserTransportErrorV1::Rejected));
        assert!(capability_wire.is_empty());
    }

    #[test]
    fn route_neutral_browser_transport_rejects_ambiguous_and_cross_origin_heads() {
        let secrets =
            lnsat_auth::create_local_session_secrets_v1().expect("session secrets should create");
        let bound_address: SocketAddr = "127.0.0.1:7447"
            .parse()
            .expect("bound address should parse");
        let loopback: IpAddr = "127.0.0.1".parse().expect("loopback should parse");
        let cookie = format!(
            "{}={}; {}={}",
            lnsat_auth::LOCAL_SESSION_COOKIE_NAME_V1,
            secrets.raw_session_token,
            lnsat_auth::LOCAL_CSRF_COOKIE_NAME_V1,
            secrets.raw_csrf_token,
        );
        let valid = format!(
            "GET /v1/session HTTP/1.1\r\nHost: 127.0.0.1:7447\r\nSec-Fetch-Site: same-origin\r\nCookie: {cookie}\r\n\r\n"
        );
        let cases = [
            valid.replace(
                "Host: 127.0.0.1:7447",
                "Host: 127.0.0.1:7447\r\nHost: 127.0.0.1:7447",
            ),
            valid.replace("Sec-Fetch-Site: same-origin", "Sec-Fetch-Site: cross-site"),
            valid.replace("Host: 127.0.0.1:7447", "Host: localhost:7447"),
            valid.replace("\r\n\r\n", "\r\nTransfer-Encoding: chunked\r\n\r\n"),
            valid.replace("\r\n\r\n", "\r\nContent-Length: nope\r\n\r\n"),
            valid.replace("\r\n\r\n", "\r\nContent-Length: 1\r\n\r\n"),
            format!("{valid}body"),
            valid.replace(
                &cookie,
                &format!(
                    "{cookie}; {}={}",
                    lnsat_auth::LOCAL_SESSION_COOKIE_NAME_V1,
                    secrets.raw_session_token
                ),
            ),
            format!(
                "GET /v1/session HTTP/1.1\r\nHost: 127.0.0.1:7447\r\nX-Fill: {}\r\n\r\n",
                "x".repeat(MAX_REQUEST_HEAD_BYTES_V1)
            ),
        ];
        for request in cases {
            assert_eq!(
                parse_local_browser_transport_request_v1(
                    request.as_bytes(),
                    loopback,
                    bound_address,
                )
                .err(),
                Some(LocalBrowserTransportErrorV1::Rejected)
            );
        }
        let remote: IpAddr = "192.0.2.1".parse().expect("remote should parse");
        assert_eq!(
            parse_local_browser_transport_request_v1(valid.as_bytes(), remote, bound_address).err(),
            Some(LocalBrowserTransportErrorV1::Rejected)
        );
        assert_eq!(
            LocalBrowserTransportErrorV1::Rejected.code(),
            "lnsatd.browser_transport.rejected"
        );
    }

    #[test]
    fn trusted_clock_formats_epoch_leap_day_and_milliseconds() {
        assert_eq!(
            canonical_system_time_v1(UNIX_EPOCH),
            Ok("1970-01-01T00:00:00.000Z".to_owned())
        );
        assert_eq!(
            canonical_system_time_v1(
                UNIX_EPOCH + Duration::from_hours(474_768) + Duration::from_millis(123)
            ),
            Ok("2024-02-29T00:00:00.123Z".to_owned())
        );
        assert_eq!(
            canonical_system_time_v1(UNIX_EPOCH - Duration::from_millis(1)),
            Err(())
        );
    }

    #[test]
    fn authentication_limiter_is_bounded_and_monotonic() {
        let limiter = LocalAuthenticationLimiterV1::new();
        let started = Instant::now();
        for _ in 0..LOCAL_AUTH_MAX_ATTEMPTS_PER_IDENTITY_V1 {
            assert!(limiter.admit_at("identity:human:owner", started));
        }
        assert!(!limiter.admit_at("identity:human:owner", started));
        assert!(limiter.admit_at("identity:human:owner", started + LOCAL_AUTH_WINDOW_V1));

        let global = LocalAuthenticationLimiterV1::new();
        for index in 0..LOCAL_AUTH_MAX_GLOBAL_ATTEMPTS_V1 {
            assert!(global.admit_at(&format!("identity:human:user-{index}"), started));
        }
        assert!(!global.admit_at("identity:human:overflow", started));
        assert!(!global.admit_at(&"x".repeat(LOCAL_AUTH_MAX_IDENTITY_BYTES_V1 + 1), started));
    }

    #[test]
    fn session_issue_owns_clock_rate_limit_and_generic_denial() {
        let directory = TestDirectory::new("server-owned-session-issue");
        let mut store =
            SqliteStore::open(directory.database_path()).expect("store should bootstrap");
        let password = "correct horse battery staple";
        store
            .bootstrap_local_owner_v1(&lnsat_store::LocalOwnerBootstrapInputV1 {
                identity_ref: "identity:human:owner",
                display_name: "Local Owner",
                password,
                created_at: "2026-07-23T17:00:00Z",
            })
            .expect("owner should bootstrap");
        let limiter = LocalAuthenticationLimiterV1::new();
        let issued = issue_local_browser_session_v1(
            &mut store,
            &limiter,
            &LocalBrowserSessionIssueRequestV1 {
                identity_ref: "identity:human:owner",
                password,
                lifetime_seconds: 60,
            },
        )
        .expect("server-owned session issue should succeed");
        let issued_at = canonical_utc_timestamp_millis_v1(&issued.session().issued_at)
            .expect("issued time should be canonical");
        let expires_at = canonical_utc_timestamp_millis_v1(&issued.session().expires_at)
            .expect("expiry should be canonical");
        assert_eq!(expires_at - issued_at, 60_000);
        assert!(issued.cookie_headers().session().contains("Max-Age=60"));
        assert_eq!(
            issue_local_browser_session_v1(
                &mut store,
                &limiter,
                &LocalBrowserSessionIssueRequestV1 {
                    identity_ref: "identity:human:missing",
                    password,
                    lifetime_seconds: 60,
                },
            )
            .err(),
            Some(LocalBrowserSessionIssueErrorV1::Rejected)
        );
        assert_eq!(
            issue_local_browser_session_v1(
                &mut store,
                &limiter,
                &LocalBrowserSessionIssueRequestV1 {
                    identity_ref: "identity:human:owner",
                    password,
                    lifetime_seconds: 59,
                },
            )
            .err(),
            Some(LocalBrowserSessionIssueErrorV1::Rejected)
        );
        assert_eq!(
            LocalBrowserSessionIssueErrorV1::Rejected.code(),
            "lnsatd.local_auth.rejected"
        );
    }

    #[test]
    #[allow(clippy::too_many_lines)]
    fn browser_revoke_all_requires_mutation_and_revokes_same_identity_family() {
        let directory = TestDirectory::new("browser-revoke-all");
        let mut store =
            SqliteStore::open(directory.database_path()).expect("store should bootstrap");
        let password = "correct horse battery staple";
        store
            .bootstrap_local_owner_v1(&lnsat_store::LocalOwnerBootstrapInputV1 {
                identity_ref: "identity:human:owner",
                display_name: "Local Owner",
                password,
                created_at: "2026-07-23T17:00:00Z",
            })
            .expect("owner should bootstrap");
        let limiter = LocalAuthenticationLimiterV1::new();
        let first = issue_local_browser_session_v1(
            &mut store,
            &limiter,
            &LocalBrowserSessionIssueRequestV1 {
                identity_ref: "identity:human:owner",
                password,
                lifetime_seconds: 60,
            },
        )
        .expect("first session should issue");
        let second = issue_local_browser_session_v1(
            &mut store,
            &limiter,
            &LocalBrowserSessionIssueRequestV1 {
                identity_ref: "identity:human:owner",
                password,
                lifetime_seconds: 60,
            },
        )
        .expect("second session should issue");
        let session_token = second
            .cookie_headers()
            .session()
            .split_once('=')
            .and_then(|(_, value)| value.split(';').next())
            .expect("session cookie should contain token")
            .to_owned();
        let csrf_token = second
            .cookie_headers()
            .csrf()
            .split_once('=')
            .and_then(|(_, value)| value.split(';').next())
            .expect("CSRF cookie should contain token")
            .to_owned();
        let cookie = format!(
            "{}={session_token}; {}={csrf_token}",
            lnsat_auth::LOCAL_SESSION_COOKIE_NAME_V1,
            lnsat_auth::LOCAL_CSRF_COOKIE_NAME_V1,
        );
        let bound_address: SocketAddr = "127.0.0.1:7447"
            .parse()
            .expect("bound address should parse");
        let peer_address: IpAddr = "127.0.0.1".parse().expect("peer should parse");
        let read_head = format!(
            "GET /v1/session/revoke-all HTTP/1.1\r\nHost: 127.0.0.1:7447\r\nSec-Fetch-Site: same-origin\r\nCookie: {cookie}\r\n\r\n"
        );
        let read = parse_local_browser_transport_request_v1(
            read_head.as_bytes(),
            peer_address,
            bound_address,
        )
        .expect("read transport should parse");
        assert_eq!(
            revoke_all_local_browser_sessions_v1(&mut store, &read),
            Err(LocalBrowserTransportErrorV1::Rejected)
        );
        let mutation_head = format!(
            concat!(
                "POST /v1/session/revoke-all HTTP/1.1\r\n",
                "Host: 127.0.0.1:7447\r\n",
                "Origin: http://127.0.0.1:7447\r\n",
                "Sec-Fetch-Site: same-origin\r\n",
                "Content-Type: application/json\r\n",
                "Content-Length: 0\r\n",
                "Cookie: {cookie}\r\n",
                "X-LNSAT-CSRF: {csrf_token}\r\n\r\n"
            ),
            cookie = cookie,
            csrf_token = csrf_token,
        );
        let mutation = parse_local_browser_transport_request_v1(
            mutation_head.as_bytes(),
            peer_address,
            bound_address,
        )
        .expect("mutation transport should parse");
        let revoked = revoke_all_local_browser_sessions_v1(&mut store, &mutation)
            .expect("same-identity family should revoke");
        assert_eq!(revoked.identity_ref, "identity:human:owner");
        assert_eq!(revoked.family_session_count, 2);
        assert_eq!(revoked.newly_revoked_session_count, 2);
        assert_eq!(
            store
                .verify_local_session_v1(&session_token, &revoked.revoked_at)
                .expect("revoked session should reject safely"),
            LocalSessionVerificationV1::Rejected
        );
        assert_ne!(first.session().session_id, second.session().session_id);
    }

    #[test]
    #[allow(clippy::too_many_lines)]
    fn browser_rotation_requires_mutation_and_replaces_cookie_secrets() {
        let directory = TestDirectory::new("browser-rotation");
        let mut store =
            SqliteStore::open(directory.database_path()).expect("store should bootstrap");
        let password = "correct horse battery staple";
        store
            .bootstrap_local_owner_v1(&lnsat_store::LocalOwnerBootstrapInputV1 {
                identity_ref: "identity:human:owner",
                display_name: "Local Owner",
                password,
                created_at: "2026-07-23T17:00:00Z",
            })
            .expect("owner should bootstrap");
        let issued = issue_local_browser_session_v1(
            &mut store,
            &LocalAuthenticationLimiterV1::new(),
            &LocalBrowserSessionIssueRequestV1 {
                identity_ref: "identity:human:owner",
                password,
                lifetime_seconds: 120,
            },
        )
        .expect("browser session should issue");
        let session_token = issued
            .cookie_headers()
            .session()
            .split_once('=')
            .and_then(|(_, value)| value.split(';').next())
            .expect("session cookie should contain token")
            .to_owned();
        let csrf_token = issued
            .cookie_headers()
            .csrf()
            .split_once('=')
            .and_then(|(_, value)| value.split(';').next())
            .expect("CSRF cookie should contain token")
            .to_owned();
        let cookie = format!(
            "{}={session_token}; {}={csrf_token}",
            lnsat_auth::LOCAL_SESSION_COOKIE_NAME_V1,
            lnsat_auth::LOCAL_CSRF_COOKIE_NAME_V1,
        );
        let bound_address: SocketAddr = "127.0.0.1:7447"
            .parse()
            .expect("bound address should parse");
        let peer_address: IpAddr = "127.0.0.1".parse().expect("peer should parse");
        let read_head = format!(
            "GET /v1/session/rotate HTTP/1.1\r\nHost: 127.0.0.1:7447\r\nSec-Fetch-Site: same-origin\r\nCookie: {cookie}\r\n\r\n"
        );
        let read = parse_local_browser_transport_request_v1(
            read_head.as_bytes(),
            peer_address,
            bound_address,
        )
        .expect("read transport should parse");
        assert_eq!(
            rotate_local_browser_session_v1(&mut store, &read).err(),
            Some(LocalBrowserTransportErrorV1::Rejected)
        );
        let mutation_head = format!(
            concat!(
                "POST /v1/session/rotate HTTP/1.1\r\n",
                "Host: 127.0.0.1:7447\r\n",
                "Origin: http://127.0.0.1:7447\r\n",
                "Sec-Fetch-Site: same-origin\r\n",
                "Content-Type: application/json\r\n",
                "Content-Length: 0\r\n",
                "Cookie: {cookie}\r\n",
                "X-LNSAT-CSRF: {csrf_token}\r\n\r\n"
            ),
            cookie = cookie,
            csrf_token = csrf_token,
        );
        let mutation = parse_local_browser_transport_request_v1(
            mutation_head.as_bytes(),
            peer_address,
            bound_address,
        )
        .expect("mutation transport should parse");
        let rotated = rotate_local_browser_session_v1(&mut store, &mutation)
            .expect("active mutation should rotate");
        assert_eq!(rotated.prior_session_id(), issued.session().session_id);
        assert_ne!(rotated.session().session_id, issued.session().session_id);
        assert_ne!(
            rotated.cookie_headers().session(),
            issued.cookie_headers().session()
        );
        assert_ne!(
            rotated.cookie_headers().csrf(),
            issued.cookie_headers().csrf()
        );
        assert!(rotated.cookie_headers().session().contains("Max-Age="));
        let checked_at =
            canonical_system_time_v1(SystemTime::now()).expect("trusted clock should format");
        assert_eq!(
            store
                .verify_local_session_v1(&session_token, &checked_at)
                .expect("prior session should reject"),
            LocalSessionVerificationV1::Rejected
        );
        assert_eq!(
            rotate_local_browser_session_v1(&mut store, &mutation).err(),
            Some(LocalBrowserTransportErrorV1::Rejected)
        );
    }

    #[test]
    fn browser_password_rotation_is_route_neutral_server_timed_and_secret_free() {
        let directory = TestDirectory::new("browser-password-rotation");
        let mut store =
            SqliteStore::open(directory.database_path()).expect("store should bootstrap");
        let current_password = "correct horse battery staple";
        let new_password = "new correct horse battery staple";
        store
            .bootstrap_local_owner_v1(&lnsat_store::LocalOwnerBootstrapInputV1 {
                identity_ref: "identity:human:owner",
                display_name: "Local Owner",
                password: current_password,
                created_at: "2026-07-23T17:00:00Z",
            })
            .expect("owner should bootstrap");
        let limiter = LocalAuthenticationLimiterV1::new();
        let issued = issue_local_browser_session_v1(
            &mut store,
            &limiter,
            &LocalBrowserSessionIssueRequestV1 {
                identity_ref: "identity:human:owner",
                password: current_password,
                lifetime_seconds: 120,
            },
        )
        .expect("browser session should issue");
        let (session_token, csrf_token, cookie) = local_browser_cookie_secrets_v1(&issued);
        let request_head = format!(
            concat!(
                "POST /unopened/password-rotation HTTP/1.1\r\n",
                "Host: 127.0.0.1:7447\r\n",
                "Origin: http://127.0.0.1:7447\r\n",
                "Sec-Fetch-Site: same-origin\r\n",
                "Content-Type: application/json\r\n",
                "Content-Length: 0\r\n",
                "Cookie: {cookie}\r\n",
                "X-LNSAT-CSRF: {csrf_token}\r\n\r\n"
            ),
            cookie = cookie,
            csrf_token = csrf_token,
        );
        let request = parse_local_browser_transport_request_v1(
            request_head.as_bytes(),
            "127.0.0.1".parse().expect("peer should parse"),
            "127.0.0.1:7447"
                .parse()
                .expect("bound address should parse"),
        )
        .expect("mutation transport should parse");
        assert_eq!(
            rotate_local_browser_password_v1(
                &mut store,
                &request,
                "wrong current password",
                new_password,
            ),
            Err(LocalBrowserTransportErrorV1::Rejected)
        );
        let rotated =
            rotate_local_browser_password_v1(&mut store, &request, current_password, new_password)
                .expect("password should rotate");
        assert_eq!(rotated.identity_ref, "identity:human:owner");
        assert_eq!(rotated.credential_version, 2);
        assert_eq!(rotated.revoked_session_count, 1);
        assert_eq!(
            store
                .verify_local_session_v1(&session_token, &rotated.rotated_at)
                .expect("prior session should reject"),
            LocalSessionVerificationV1::Rejected
        );
        assert!(
            issue_local_browser_session_v1(
                &mut store,
                &limiter,
                &LocalBrowserSessionIssueRequestV1 {
                    identity_ref: "identity:human:owner",
                    password: new_password,
                    lifetime_seconds: 120,
                },
            )
            .is_ok()
        );
    }

    #[test]
    fn browser_owner_disablement_is_route_neutral_permanent_and_session_closing() {
        let directory = TestDirectory::new("browser-identity-disablement");
        let mut store =
            SqliteStore::open(directory.database_path()).expect("store should bootstrap");
        let owner_password = "correct horse battery staple";
        let operator_password = "operator bounded password value";
        store
            .bootstrap_local_owner_v1(&lnsat_store::LocalOwnerBootstrapInputV1 {
                identity_ref: "identity:human:owner",
                display_name: "Local Owner",
                password: owner_password,
                created_at: "2026-07-23T17:00:00Z",
            })
            .expect("owner should bootstrap");
        let limiter = LocalAuthenticationLimiterV1::new();
        let owner = issue_local_browser_session_v1(
            &mut store,
            &limiter,
            &LocalBrowserSessionIssueRequestV1 {
                identity_ref: "identity:human:owner",
                password: owner_password,
                lifetime_seconds: 120,
            },
        )
        .expect("owner browser session should issue");
        let (owner_token, owner_csrf, owner_cookie) = local_browser_cookie_secrets_v1(&owner);
        let created_at =
            canonical_system_time_v1(SystemTime::now()).expect("trusted clock should format");
        store
            .create_local_identity_v1(
                &lnsat_store::LocalIdentityCreateInputV1 {
                    identity_ref: "identity:human:operator",
                    display_name: "Local Operator",
                    role: lnsat_store::LocalIdentityRoleV1::Operator,
                    password: operator_password,
                    created_at: &created_at,
                },
                &owner_token,
                &owner_csrf,
                &created_at,
            )
            .expect("owner should create operator");
        let operator = issue_local_browser_session_v1(
            &mut store,
            &limiter,
            &LocalBrowserSessionIssueRequestV1 {
                identity_ref: "identity:human:operator",
                password: operator_password,
                lifetime_seconds: 120,
            },
        )
        .expect("operator browser session should issue");
        let (operator_token, _, _) = local_browser_cookie_secrets_v1(&operator);
        let request_head = format!(
            concat!(
                "POST /unopened/identity-disablement HTTP/1.1\r\n",
                "Host: 127.0.0.1:7447\r\n",
                "Origin: http://127.0.0.1:7447\r\n",
                "Sec-Fetch-Site: same-origin\r\n",
                "Content-Type: application/json\r\n",
                "Content-Length: 0\r\n",
                "Cookie: {owner_cookie}\r\n",
                "X-LNSAT-CSRF: {owner_csrf}\r\n\r\n"
            ),
            owner_cookie = owner_cookie,
            owner_csrf = owner_csrf,
        );
        let request = parse_local_browser_transport_request_v1(
            request_head.as_bytes(),
            "127.0.0.1".parse().expect("peer should parse"),
            "127.0.0.1:7447"
                .parse()
                .expect("bound address should parse"),
        )
        .expect("mutation transport should parse");
        let disabled =
            disable_local_browser_identity_v1(&mut store, &request, "identity:human:operator")
                .expect("operator should disable");
        assert_eq!(disabled.identity_ref, "identity:human:operator");
        assert_eq!(
            disabled.status,
            lnsat_store::LocalIdentityStatusV1::Disabled
        );
        assert_eq!(disabled.revoked_session_count, 1);
        assert_eq!(
            store
                .verify_local_session_v1(&operator_token, &disabled.changed_at)
                .expect("disabled operator session should reject"),
            LocalSessionVerificationV1::Rejected
        );
        assert_eq!(
            disable_local_browser_identity_v1(&mut store, &request, "identity:human:operator",),
            Err(LocalBrowserTransportErrorV1::Rejected)
        );
    }

    #[test]
    fn browser_identity_event_read_is_authenticated_route_neutral_and_read_only() {
        let directory = TestDirectory::new("browser-identity-event-read");
        let mut store =
            SqliteStore::open(directory.database_path()).expect("store should bootstrap");
        let password = "correct horse battery staple";
        store
            .bootstrap_local_owner_v1(&lnsat_store::LocalOwnerBootstrapInputV1 {
                identity_ref: "identity:human:owner",
                display_name: "Local Owner",
                password,
                created_at: "2026-07-23T17:00:00Z",
            })
            .expect("owner should bootstrap");
        let issued = issue_local_browser_session_v1(
            &mut store,
            &LocalAuthenticationLimiterV1::new(),
            &LocalBrowserSessionIssueRequestV1 {
                identity_ref: "identity:human:owner",
                password,
                lifetime_seconds: 120,
            },
        )
        .expect("browser session should issue");
        let (_, csrf_token, cookie) = local_browser_cookie_secrets_v1(&issued);
        let peer: IpAddr = "127.0.0.1".parse().expect("peer should parse");
        let bound: SocketAddr = "127.0.0.1:7447"
            .parse()
            .expect("bound address should parse");
        let read_head = format!(
            "GET /unopened/identity-events HTTP/1.1\r\nHost: 127.0.0.1:7447\r\nSec-Fetch-Site: same-origin\r\nCookie: {cookie}\r\n\r\n"
        );
        let read = parse_local_browser_transport_request_v1(read_head.as_bytes(), peer, bound)
            .expect("read transport should parse");
        let events =
            read_local_browser_identity_events_v1(&mut store, &read, "identity:human:owner")
                .expect("authenticated evidence read should succeed");
        assert_eq!(events.len(), 1);
        assert_eq!(
            events[0].event_kind,
            lnsat_store::LocalIdentityEventKindV1::OwnerBootstrapped
        );

        let mutation_head = format!(
            concat!(
                "POST /unopened/identity-events HTTP/1.1\r\n",
                "Host: 127.0.0.1:7447\r\n",
                "Origin: http://127.0.0.1:7447\r\n",
                "Sec-Fetch-Site: same-origin\r\n",
                "Content-Type: application/json\r\n",
                "Content-Length: 0\r\n",
                "Cookie: {cookie}\r\n",
                "X-LNSAT-CSRF: {csrf_token}\r\n\r\n"
            ),
            cookie = cookie,
            csrf_token = csrf_token,
        );
        let mutation =
            parse_local_browser_transport_request_v1(mutation_head.as_bytes(), peer, bound)
                .expect("mutation transport should parse");
        assert_eq!(
            read_local_browser_identity_events_v1(&mut store, &mutation, "identity:human:owner",),
            Err(LocalBrowserTransportErrorV1::Rejected)
        );
    }

    #[test]
    fn browser_session_event_read_is_authenticated_route_neutral_and_read_only() {
        let directory = TestDirectory::new("browser-session-event-read");
        let mut store =
            SqliteStore::open(directory.database_path()).expect("store should bootstrap");
        let password = "correct horse battery staple";
        store
            .bootstrap_local_owner_v1(&lnsat_store::LocalOwnerBootstrapInputV1 {
                identity_ref: "identity:human:owner",
                display_name: "Local Owner",
                password,
                created_at: "2026-07-23T17:00:00Z",
            })
            .expect("owner should bootstrap");
        let issued = issue_local_browser_session_v1(
            &mut store,
            &LocalAuthenticationLimiterV1::new(),
            &LocalBrowserSessionIssueRequestV1 {
                identity_ref: "identity:human:owner",
                password,
                lifetime_seconds: 120,
            },
        )
        .expect("browser session should issue");
        let (_, csrf_token, cookie) = local_browser_cookie_secrets_v1(&issued);
        let peer: IpAddr = "127.0.0.1".parse().expect("peer should parse");
        let bound: SocketAddr = "127.0.0.1:7447"
            .parse()
            .expect("bound address should parse");
        let read_head = format!(
            "GET /unopened/session-events HTTP/1.1\r\nHost: 127.0.0.1:7447\r\nSec-Fetch-Site: same-origin\r\nCookie: {cookie}\r\n\r\n"
        );
        let read = parse_local_browser_transport_request_v1(read_head.as_bytes(), peer, bound)
            .expect("read transport should parse");
        let events =
            read_local_browser_session_events_v1(&mut store, &read, &issued.session.session_id)
                .expect("authenticated evidence read should succeed");
        assert_eq!(events.len(), 1);
        assert_eq!(
            events[0].event_kind,
            lnsat_store::LocalSessionEventKindV1::Issued
        );
        assert_eq!(
            read_local_browser_session_events_v1(
                &mut store,
                &read,
                "ses_00000000000000000000000000000000",
            ),
            Err(LocalBrowserTransportErrorV1::Rejected)
        );

        let mutation_head = format!(
            concat!(
                "POST /unopened/session-events HTTP/1.1\r\n",
                "Host: 127.0.0.1:7447\r\n",
                "Origin: http://127.0.0.1:7447\r\n",
                "Sec-Fetch-Site: same-origin\r\n",
                "Content-Type: application/json\r\n",
                "Content-Length: 0\r\n",
                "Cookie: {cookie}\r\n",
                "X-LNSAT-CSRF: {csrf_token}\r\n\r\n"
            ),
            cookie = cookie,
            csrf_token = csrf_token,
        );
        let mutation =
            parse_local_browser_transport_request_v1(mutation_head.as_bytes(), peer, bound)
                .expect("mutation transport should parse");
        assert_eq!(
            read_local_browser_session_events_v1(&mut store, &mutation, &issued.session.session_id,),
            Err(LocalBrowserTransportErrorV1::Rejected)
        );
    }

    #[test]
    fn transport_and_worker_errors_have_distinct_public_classes() {
        assert_eq!(
            DaemonErrorV1::RequestReadFailed.code(),
            "lnsatd.request.read_failed"
        );
        assert_eq!(
            DaemonErrorV1::ResponseWriteFailed.code(),
            "lnsatd.response.write_failed"
        );
        assert_eq!(
            DaemonErrorV1::AcceptFailed.code(),
            "lnsatd.connection.accept_failed"
        );
        assert_eq!(DaemonErrorV1::WorkerFailed.code(), "lnsatd.worker.failed");
        assert_eq!(
            DaemonErrorV1::SignalHandlerInstallFailed.code(),
            "lnsatd.signal.install_failed"
        );
    }

    #[test]
    fn host_must_match_bound_numeric_address_and_optional_exact_port() {
        let ipv4: SocketAddr = "127.0.0.1:7447".parse().expect("valid IPv4 socket");
        assert!(host_matches_bound_address("127.0.0.1", ipv4));
        assert!(host_matches_bound_address("127.0.0.1:7447", ipv4));
        assert!(!host_matches_bound_address("127.0.0.1:7448", ipv4));
        assert!(!host_matches_bound_address("localhost:7447", ipv4));

        let ipv6: SocketAddr = "[::1]:7447".parse().expect("valid IPv6 socket");
        assert!(host_matches_bound_address("[::1]", ipv6));
        assert!(host_matches_bound_address("[::1]:7447", ipv6));
        assert!(!host_matches_bound_address("[::1]:7448", ipv6));
    }

    #[test]
    fn oversized_request_is_bounded_and_not_reflected() {
        let mut request = b"GET /healthz HTTP/1.1\r\nHost: 127.0.0.1\r\nX-Fill: ".to_vec();
        request.extend(std::iter::repeat_n(b's', MAX_REQUEST_HEAD_BYTES_V1));
        let response = request_once("oversized", &request);

        assert!(response.starts_with("HTTP/1.1 413 Content Too Large\r\n"));
        assert!(response.contains("lnsatd.request.head_too_large"));
        assert!(!response.contains("ssssssss"));
    }

    #[test]
    fn slow_peer_does_not_block_concurrent_readiness_or_graceful_shutdown() {
        let directory = TestDirectory::new("concurrent");
        let database_path = directory.database_path();
        let config = DaemonConfigV1::for_test(&database_path);
        let server = DaemonServerV1::bind(&config).expect("server should bind");
        let address = server.local_addr();
        let shutdown = server.shutdown_handle();
        let server_thread = thread::spawn(move || server.serve());

        let mut slow = TcpStream::connect(address).expect("slow client should connect");
        slow.write_all(b"GET /healthz HTTP/1.1\r\nHost: 127.0.0.1")
            .expect("partial request should write");
        thread::sleep(Duration::from_millis(100));

        let started = Instant::now();
        let response = request_at(address, b"GET /healthz HTTP/1.1\r\nHost: 127.0.0.1\r\n\r\n");
        assert!(response.starts_with("HTTP/1.1 200 OK\r\n"));
        assert!(started.elapsed() < Duration::from_secs(2));

        drop(slow);
        shutdown.request_shutdown();
        shutdown.request_shutdown();
        assert!(shutdown.is_shutdown_requested());
        server_thread
            .join()
            .expect("server thread should join")
            .expect("cooperative shutdown should succeed");

        let restarted = DaemonServerV1::bind(&DaemonConfigV1::for_test(&database_path))
            .expect("same database should restart cleanly");
        let restarted_address = restarted.local_addr();
        let restarted_thread = thread::spawn(move || restarted.serve_one());
        let response = request_at(
            restarted_address,
            b"GET /healthz HTTP/1.1\r\nHost: 127.0.0.1\r\n\r\n",
        );
        assert!(response.starts_with("HTTP/1.1 200 OK\r\n"));
        restarted_thread
            .join()
            .expect("restarted server thread should join")
            .expect("restarted server should respond");
    }

    #[test]
    fn readiness_concurrency_is_bounded_and_overload_fails_fast() {
        let directory = TestDirectory::new("capacity");
        let config = DaemonConfigV1::for_test(directory.database_path());
        let server = DaemonServerV1::bind(&config).expect("server should bind");
        let address = server.local_addr();
        let shutdown = server.shutdown_handle();
        let server_thread = thread::spawn(move || server.serve());

        let mut slow_clients = Vec::with_capacity(MAX_CONCURRENT_CONNECTIONS_V1);
        for _ in 0..MAX_CONCURRENT_CONNECTIONS_V1 {
            let mut stream = TcpStream::connect(address).expect("slow client should connect");
            stream
                .write_all(b"GET /healthz HTTP/1.1\r\nHost: 127.0.0.1")
                .expect("partial request should write");
            slow_clients.push(stream);
        }
        thread::sleep(Duration::from_millis(100));

        let started = Instant::now();
        let response = request_at(address, b"GET /healthz HTTP/1.1\r\nHost: 127.0.0.1\r\n\r\n");
        assert!(response.starts_with("HTTP/1.1 503 Service Unavailable\r\n"));
        assert!(response.contains("lnsatd.connection.capacity_exhausted"));
        assert!(started.elapsed() < Duration::from_secs(2));

        drop(slow_clients);
        shutdown.request_shutdown();
        server_thread
            .join()
            .expect("server thread should join")
            .expect("bounded workers should drain cleanly");
    }

    #[test]
    fn phase9_control_center_serves_only_manifest_assets_with_exact_get_head_security() {
        let get_response = phase9_console_request("phase9-console-get", |address| {
            format!("GET / HTTP/1.1\r\nHost: {address}\r\nSec-Fetch-Site: same-origin\r\n\r\n")
        });
        assert!(get_response.starts_with("HTTP/1.1 200 OK\r\n"));
        assert!(get_response.ends_with("<main>phase9 console</main>"));
        assert!(get_response.contains("Content-Type: text/html; charset=utf-8\r\n"));
        assert!(get_response.contains("connect-src 'self'"));
        assert!(get_response.contains("Cross-Origin-Resource-Policy: same-origin\r\n"));
        assert!(!get_response.contains("Access-Control-Allow-"));

        let head_response = phase9_console_request("phase9-console-head", |address| {
            format!("HEAD / HTTP/1.1\r\nHost: {address}\r\nSec-Fetch-Site: none\r\n\r\n")
        });
        assert!(head_response.starts_with("HTTP/1.1 200 OK\r\n"));
        assert!(head_response.contains("Content-Length: 27\r\n"));
        assert!(!head_response.contains("<main>phase9 console</main>"));
    }

    #[test]
    fn phase9_control_center_keeps_bind_time_bytes_immutable() {
        let directory = TestDirectory::new("phase9-console-immutable");
        let console_root = directory.path.join("console");
        fs::create_dir(&console_root).expect("console root should create");
        let index_path = console_root.join("index.html");
        fs::write(&index_path, "<main>original console</main>")
            .expect("console asset should write");
        let config = DaemonConfigV1::for_test(directory.database_path())
            .with_internal_console_root(
                &console_root,
                BTreeMap::from([("/".to_owned(), PathBuf::from("index.html"))]),
            )
            .expect("console config should validate");
        let server = DaemonServerV1::bind(&config).expect("console server should bind");
        let address = server.local_addr();
        fs::write(&index_path, "<main>changed after bind</main>")
            .expect("source file should change after immutable load");
        let thread = thread::spawn(move || server.serve_one());
        let response = request_at(
            address,
            format!("GET / HTTP/1.1\r\nHost: {address}\r\n\r\n").as_bytes(),
        );
        thread
            .join()
            .expect("server thread should join")
            .expect("server should respond");
        assert!(response.ends_with("<main>original console</main>"));
        assert!(!response.contains("changed after bind"));
    }

    #[test]
    fn phase9_control_center_rejects_host_forwarding_cross_site_cors_and_arbitrary_paths() {
        let requests = [
            "GET /secret.txt HTTP/1.1\r\nHost: {address}\r\n\r\n",
            "GET /../index.html HTTP/1.1\r\nHost: {address}\r\n\r\n",
            "GET /%2e%2e/index.html HTTP/1.1\r\nHost: {address}\r\n\r\n",
            "GET /assets/ HTTP/1.1\r\nHost: {address}\r\n\r\n",
            "GET / HTTP/1.1\r\nHost: localhost:{port}\r\n\r\n",
            "GET / HTTP/1.1\r\nHost: 127.0.0.1:1\r\n\r\n",
            "GET / HTTP/1.1\r\nHost: {address}\r\nForwarded: host=example.test\r\n\r\n",
            "GET / HTTP/1.1\r\nHost: {address}\r\nX-Forwarded-Host: example.test\r\n\r\n",
            "GET / HTTP/1.1\r\nHost: {address}\r\nX-Forwarded-Proto: https\r\n\r\n",
            "GET / HTTP/1.1\r\nHost: {address}\r\nX-Forwarded-For: 127.0.0.1\r\n\r\n",
            "GET / HTTP/1.1\r\nHost: {address}\r\nSec-Fetch-Site: cross-site\r\n\r\n",
            "GET / HTTP/1.1\r\nHost: {address}\r\nOrigin: https://example.test\r\n\r\n",
            "GET / HTTP/1.1\r\nHost: {address}\r\nContent-Type: text/plain\r\nContent-Length: 0\r\n\r\n",
            "GET / HTTP/1.1\r\nHost: {address}\r\nContent-Length: 1\r\n\r\nx",
            "GET / HTTP/1.1\r\nHost: {address}\r\nTransfer-Encoding: chunked\r\n\r\n",
            "OPTIONS / HTTP/1.1\r\nHost: {address}\r\n\r\n",
        ];
        for (index, request) in requests.into_iter().enumerate() {
            let response =
                phase9_console_request(&format!("phase9-console-denial-{index}"), |address| {
                    request
                        .replace("{address}", &address.to_string())
                        .replace("{port}", &address.port().to_string())
                });
            assert!(!response.starts_with("HTTP/1.1 200 OK\r\n"), "{request}");
            assert!(
                !response.contains("<main>phase9 console</main>"),
                "{request}"
            );
            assert!(!response.contains("Access-Control-Allow-"), "{request}");
        }
    }

    #[test]
    fn phase9_control_center_rejects_invalid_manifests_directories_and_symlinks() {
        let directory = TestDirectory::new("phase9-console-invalid-manifest");
        let console_root = directory.path.join("console");
        fs::create_dir(&console_root).expect("console root should create");
        fs::write(console_root.join("index.html"), "ok").expect("asset should write");
        for (request_path, relative_path) in [
            ("/v1/private", "index.html"),
            ("/healthz", "index.html"),
            ("/../index.html", "index.html"),
            ("/%2e%2e/index.html", "index.html"),
            ("/", "../index.html"),
            ("/", "index.exe"),
        ] {
            let result = DaemonConfigV1::for_test(directory.database_path())
                .with_internal_console_root(
                    &console_root,
                    BTreeMap::from([(request_path.to_owned(), PathBuf::from(relative_path))]),
                );
            assert_eq!(result, Err(DaemonErrorV1::InvalidConsoleConfiguration));
        }

        fs::create_dir(console_root.join("assets")).expect("asset directory should create");
        let directory_config = DaemonConfigV1::for_test(directory.database_path())
            .with_internal_console_root(
                &console_root,
                BTreeMap::from([("/assets".to_owned(), PathBuf::from("assets/index.html"))]),
            )
            .expect("path syntax should validate before filesystem check");
        assert_eq!(
            DaemonServerV1::bind(&directory_config).err(),
            Some(DaemonErrorV1::ConsoleAssetLoadFailed)
        );

        #[cfg(unix)]
        {
            std::os::unix::fs::symlink("index.html", console_root.join("linked.html"))
                .expect("test symlink should create");
            let symlink_config = DaemonConfigV1::for_test(directory.database_path())
                .with_internal_console_root(
                    &console_root,
                    BTreeMap::from([("/linked".to_owned(), PathBuf::from("linked.html"))]),
                )
                .expect("symlink syntax should validate before filesystem check");
            assert_eq!(
                DaemonServerV1::bind(&symlink_config).err(),
                Some(DaemonErrorV1::ConsoleAssetLoadFailed)
            );
        }
    }

    fn phase9_console_request(label: &str, request: impl FnOnce(SocketAddr) -> String) -> String {
        let directory = TestDirectory::new(label);
        let console_root = directory.path.join("console");
        fs::create_dir(&console_root).expect("console root should create");
        fs::write(
            console_root.join("index.html"),
            "<main>phase9 console</main>",
        )
        .expect("console asset should write");
        let config = DaemonConfigV1::for_test(directory.database_path())
            .with_internal_console_root(
                &console_root,
                BTreeMap::from([("/".to_owned(), PathBuf::from("index.html"))]),
            )
            .expect("console config should validate");
        let server = DaemonServerV1::bind(&config).expect("console server should bind");
        let address = server.local_addr();
        let thread = thread::spawn(move || server.serve_one());
        let response = request_at(address, request(address).as_bytes());
        thread
            .join()
            .expect("server thread should join")
            .expect("server should respond");
        response
    }

    #[test]
    fn phase8_route_inventory_and_body_limit_are_exact() {
        let authorization_id = format!("xau_{}", "a".repeat(64));
        let operation_id = format!("opn_{}", "b".repeat(64));
        let attempt_id = format!("opa_{}", "c".repeat(64));
        let paths = [
            LOCAL_EXECUTION_AUTHORIZATIONS_PATH_V1.to_owned(),
            format!("{LOCAL_EXECUTION_AUTHORIZATIONS_PREFIX_V1}{authorization_id}"),
            format!("{LOCAL_EXECUTION_AUTHORIZATIONS_PREFIX_V1}{authorization_id}/cancel"),
            format!("{LOCAL_EXECUTION_AUTHORIZATIONS_PREFIX_V1}{authorization_id}/revoke"),
            format!("{LOCAL_EXECUTION_AUTHORIZATIONS_PREFIX_V1}{authorization_id}/execute"),
            format!("{LOCAL_OPERATIONS_PREFIX_V1}{operation_id}"),
            format!("{LOCAL_OPERATIONS_PREFIX_V1}{operation_id}/attempts/{attempt_id}"),
            format!("{LOCAL_OPERATIONS_PREFIX_V1}{operation_id}/reconcile"),
        ];
        for path in &paths {
            assert!(
                parse_phase8_runtime_route_v1(path)
                    .expect("exact path must parse")
                    .is_some()
            );
            assert_eq!(
                request_body_limit_v1(path),
                PHASE8_MAX_REQUEST_BODY_BYTES_V1
            );
        }
        assert_eq!(PHASE8_MAX_REQUEST_BODY_BYTES_V1, 16 * 1024);
        assert_eq!(
            request_body_limit_v1("/v1/session"),
            MAX_REQUEST_BODY_BYTES_V1
        );
        assert!(
            parse_phase8_runtime_route_v1(&format!(
                "{LOCAL_OPERATIONS_PREFIX_V1}{operation_id}/retry"
            ))
            .is_err()
        );
        assert!(
            parse_phase8_runtime_route_v1(&format!(
                "{LOCAL_OPERATIONS_PREFIX_V1}{operation_id}/receipt"
            ))
            .is_err()
        );
    }

    #[test]
    fn phase8_dispatch_admission_race_has_one_winner_and_zero_queue() {
        let active = Arc::new(AtomicBool::new(false));
        let start = Arc::new(std::sync::Barrier::new(32));
        let finish = Arc::new(std::sync::Barrier::new(32));
        let winners = Arc::new(std::sync::atomic::AtomicUsize::new(0));
        let mut workers = Vec::new();
        for _ in 0..32 {
            let active = Arc::clone(&active);
            let start = Arc::clone(&start);
            let finish = Arc::clone(&finish);
            let winners = Arc::clone(&winners);
            workers.push(thread::spawn(move || {
                start.wait();
                let admission = Phase8DispatchAdmissionV1::try_acquire(&active);
                if admission.is_some() {
                    winners.fetch_add(1, Ordering::AcqRel);
                }
                finish.wait();
                drop(admission);
            }));
        }
        for worker in workers {
            worker.join().expect("admission worker must join");
        }
        assert_eq!(winners.load(Ordering::Acquire), 1);
        assert!(!active.load(Ordering::Acquire));
        assert!(Phase8DispatchAdmissionV1::try_acquire(&active).is_some());
    }

    #[test]
    fn phase8_runtime_cli_requires_paired_absolute_paths() {
        assert_eq!(
            parse_daemon_args_v1([
                "lnsatd",
                "--database",
                "/tmp/lnsat.sqlite3",
                "--disposable-git-root",
                "/tmp/lnsat-fixtures",
            ]),
            Err(DaemonErrorV1::InvalidRuntimeConfiguration)
        );
        let action = parse_daemon_args_v1([
            "lnsatd",
            "--database",
            "/tmp/lnsat.sqlite3",
            "--disposable-git-root",
            "/tmp/lnsat-fixtures",
            "--git-executable",
            "/usr/bin/git",
        ])
        .expect("paired runtime paths must parse");
        let DaemonCliActionV1::Run(config) = action else {
            panic!("runtime paths must produce run configuration");
        };
        assert_eq!(
            config.disposable_git_root(),
            Some(Path::new("/tmp/lnsat-fixtures"))
        );
        assert_eq!(config.git_executable(), Some(Path::new("/usr/bin/git")));
    }

    fn request_once(label: &str, request: &[u8]) -> String {
        let directory = TestDirectory::new(label);
        let config = DaemonConfigV1::for_test(directory.database_path());
        let server = DaemonServerV1::bind(&config).expect("server should bind");
        let address = server.local_addr();
        let thread = thread::spawn(move || server.serve_one());

        let response = request_at(address, request);
        thread
            .join()
            .expect("server thread should join")
            .expect("server should respond");
        response
    }

    fn request_at(address: SocketAddr, request: &[u8]) -> String {
        let mut stream = TcpStream::connect(address).expect("client should connect");
        stream
            .set_read_timeout(Some(Duration::from_secs(2)))
            .expect("timeout should configure");
        stream.write_all(request).expect("request should write");
        let mut response = String::new();
        stream
            .read_to_string(&mut response)
            .expect("response should read");
        response
    }
}
