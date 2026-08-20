#![forbid(unsafe_code)]

//! Versioned local password-verifier primitives.

use argon2::{
    Algorithm, Argon2, Params, Version,
    password_hash::{
        PasswordHash, PasswordHasher, PasswordVerifier, SaltString,
        rand_core::{OsRng, RngCore},
    },
};
use core::fmt;
use sha2::{Digest, Sha256};
use std::net::IpAddr;
use subtle::ConstantTimeEq;
use zeroize::Zeroize;

/// Versioned password-verifier profile persisted beside every credential.
pub const LOCAL_PASSWORD_PROFILE_V1: &str = "lnsat.argon2id.v1";

/// Argon2id memory cost in KiB.
pub const LOCAL_PASSWORD_ARGON2_M_COST_V1: u32 = 19_456;

/// Argon2id pass count.
pub const LOCAL_PASSWORD_ARGON2_T_COST_V1: u32 = 2;

/// Argon2id parallel lane count.
pub const LOCAL_PASSWORD_ARGON2_P_COST_V1: u32 = 1;

/// Derived password-hash output length.
pub const LOCAL_PASSWORD_OUTPUT_BYTES_V1: usize = 32;

/// Minimum accepted Unicode scalar count.
pub const LOCAL_PASSWORD_MIN_CHARACTERS_V1: usize = 15;

/// Maximum accepted Unicode scalar count.
pub const LOCAL_PASSWORD_MAX_CHARACTERS_V1: usize = 128;

/// Maximum accepted UTF-8 byte length.
pub const LOCAL_PASSWORD_MAX_BYTES_V1: usize = 512;

/// Versioned server-side session-token digest profile.
pub const LOCAL_SESSION_TOKEN_PROFILE_V1: &str = "lnsat.session_token.sha256.v1";

/// Versioned browser anti-CSRF digest profile.
pub const LOCAL_SESSION_CSRF_PROFILE_V1: &str = "lnsat.session_csrf.sha256.v1";

/// Exact host-only session cookie name.
pub const LOCAL_SESSION_COOKIE_NAME_V1: &str = "lnsat_session_v1";

/// Exact host-only browser anti-CSRF cookie name.
pub const LOCAL_CSRF_COOKIE_NAME_V1: &str = "lnsat_csrf_v1";

/// Exact anti-CSRF request-header name.
pub const LOCAL_CSRF_HEADER_NAME_V1: &str = "X-LNSAT-CSRF";

const LOCAL_SESSION_ID_PREFIX: &str = "ses_";
const LOCAL_SESSION_ID_HEX_BYTES: usize = 16;
const LOCAL_SESSION_SECRET_BYTES: usize = 32;
const LOCAL_BROWSER_COOKIE_HEADER_MAX_BYTES_V1: usize = 4 * 1024;

/// Stable public-safe local password errors.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum LocalPasswordErrorV1 {
    /// Candidate password violates the bounded input contract.
    InvalidPassword,
    /// A verifier could not be created.
    VerifierCreationFailed,
    /// Persisted verifier evidence is malformed or uses another profile.
    VerifierEvidenceInvalid,
}

impl LocalPasswordErrorV1 {
    /// Stable machine-readable error code.
    #[must_use]
    pub const fn code(self) -> &'static str {
        match self {
            Self::InvalidPassword => "local_password.invalid_password",
            Self::VerifierCreationFailed => "local_password.verifier_creation_failed",
            Self::VerifierEvidenceInvalid => "local_password.verifier_evidence_invalid",
        }
    }
}

impl fmt::Display for LocalPasswordErrorV1 {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(self.code())
    }
}

impl std::error::Error for LocalPasswordErrorV1 {}

/// Stable public-safe session-secret errors.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum LocalSessionSecretErrorV1 {
    /// Random session material could not be created under the exact profile.
    CreationFailed,
    /// A supplied raw secret or persisted digest violates the exact profile.
    EvidenceInvalid,
}

impl LocalSessionSecretErrorV1 {
    /// Stable machine-readable error code.
    #[must_use]
    pub const fn code(self) -> &'static str {
        match self {
            Self::CreationFailed => "local_session_secret.creation_failed",
            Self::EvidenceInvalid => "local_session_secret.evidence_invalid",
        }
    }
}

impl fmt::Display for LocalSessionSecretErrorV1 {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(self.code())
    }
}

impl std::error::Error for LocalSessionSecretErrorV1 {}

/// Exact loopback browser origin owned by one future Gateway listener.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct LocalBrowserOriginV1 {
    host_header: String,
    serialized_origin: String,
}

impl LocalBrowserOriginV1 {
    /// Creates one HTTP loopback origin with an explicit nonzero port.
    ///
    /// # Errors
    ///
    /// Rejects remote, unspecified, multicast, or port-zero listeners.
    pub fn loopback_http(address: IpAddr, port: u16) -> Result<Self, LocalBrowserRequestErrorV1> {
        if !address.is_loopback() || port == 0 {
            return Err(LocalBrowserRequestErrorV1::InvalidConfiguration);
        }
        let host_header = match address {
            IpAddr::V4(address) => format!("{address}:{port}"),
            IpAddr::V6(address) => format!("[{address}]:{port}"),
        };
        Ok(Self {
            serialized_origin: format!("http://{host_header}"),
            host_header,
        })
    }

    /// Exact HTTP Host header allowed for this listener.
    #[must_use]
    pub fn host_header(&self) -> &str {
        &self.host_header
    }

    /// Exact RFC 6454-style serialized origin allowed for browser mutations.
    #[must_use]
    pub fn serialized_origin(&self) -> &str {
        &self.serialized_origin
    }
}

/// Bounded browser-request facts supplied by a future Gateway HTTP parser.
#[derive(Clone, Copy)]
pub struct LocalBrowserRequestV1<'a> {
    /// Operating-system peer address.
    pub peer_address: IpAddr,
    /// Exact uppercase HTTP method.
    pub method: &'a str,
    /// Single bounded Host field after duplicate-header refusal.
    pub host: &'a str,
    /// Single bounded Origin field, when sent.
    pub origin: Option<&'a str>,
    /// Single bounded `Sec-Fetch-Site` field.
    pub fetch_site: Option<&'a str>,
    /// Parsed media type with parameters already refused.
    pub content_type: Option<&'a str>,
    /// Result of independent session-bound anti-CSRF verification.
    pub csrf_verified: bool,
}

/// Allowed browser-request class. Neither class grants product capability.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum LocalBrowserRequestClassV1 {
    /// Read-only GET or HEAD request.
    ReadOnly,
    /// JSON POST, PUT, PATCH, or DELETE with Origin and CSRF proof.
    MutationPreflight,
}

/// Stable fail-closed browser-request errors.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum LocalBrowserRequestErrorV1 {
    /// Listener origin was not exact nonzero loopback HTTP.
    InvalidConfiguration,
    /// Peer address was not loopback.
    RemotePeer,
    /// Host did not exactly match the bound numeric listener.
    HostMismatch,
    /// Browser fetch metadata was absent or not same-origin.
    FetchMetadataRejected,
    /// HTTP method was unsupported or noncanonical.
    MethodRejected,
    /// Mutation omitted Origin.
    OriginRequired,
    /// Supplied Origin was not the exact bound origin.
    OriginMismatch,
    /// Mutation media type was not exact JSON.
    ContentTypeRejected,
    /// Independent anti-CSRF proof did not verify.
    CsrfRejected,
}

impl LocalBrowserRequestErrorV1 {
    /// Stable internal decision code. Gateway must map it to one generic
    /// public denial rather than expose security-oracle detail.
    #[must_use]
    pub const fn code(self) -> &'static str {
        match self {
            Self::InvalidConfiguration => "local_browser.invalid_configuration",
            Self::RemotePeer => "local_browser.remote_peer",
            Self::HostMismatch => "local_browser.host_mismatch",
            Self::FetchMetadataRejected => "local_browser.fetch_metadata_rejected",
            Self::MethodRejected => "local_browser.method_rejected",
            Self::OriginRequired => "local_browser.origin_required",
            Self::OriginMismatch => "local_browser.origin_mismatch",
            Self::ContentTypeRejected => "local_browser.content_type_rejected",
            Self::CsrfRejected => "local_browser.csrf_rejected",
        }
    }
}

impl fmt::Display for LocalBrowserRequestErrorV1 {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(self.code())
    }
}

impl std::error::Error for LocalBrowserRequestErrorV1 {}

/// Stable fail-closed browser authentication-transport errors.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum LocalBrowserAuthTransportErrorV1 {
    /// Method is not one exact supported browser API method.
    MethodRejected,
    /// Cookie header is absent, oversized, or syntactically malformed.
    CookieRejected,
    /// Session or anti-CSRF cookie occurs more than once.
    DuplicateAuthCookie,
    /// Session cookie is absent or malformed.
    SessionRejected,
    /// Mutation anti-CSRF cookie/header proof is absent or malformed.
    CsrfRejected,
    /// Anti-CSRF header does not equal the independent cookie secret.
    CsrfMismatch,
    /// Cookie lifetime is outside the session window contract.
    LifetimeRejected,
}

impl LocalBrowserAuthTransportErrorV1 {
    /// Stable internal code. Gateway must expose one generic denial.
    #[must_use]
    pub const fn code(self) -> &'static str {
        match self {
            Self::MethodRejected => "local_browser_transport.method_rejected",
            Self::CookieRejected => "local_browser_transport.cookie_rejected",
            Self::DuplicateAuthCookie => "local_browser_transport.duplicate_auth_cookie",
            Self::SessionRejected => "local_browser_transport.session_rejected",
            Self::CsrfRejected => "local_browser_transport.csrf_rejected",
            Self::CsrfMismatch => "local_browser_transport.csrf_mismatch",
            Self::LifetimeRejected => "local_browser_transport.lifetime_rejected",
        }
    }
}

impl fmt::Display for LocalBrowserAuthTransportErrorV1 {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(self.code())
    }
}

impl std::error::Error for LocalBrowserAuthTransportErrorV1 {}

/// Borrowed authentication material extracted from one strict browser request.
///
/// This type intentionally implements neither `Clone` nor `Debug`.
pub struct LocalBrowserAuthTransportV1<'a> {
    raw_session_token: &'a str,
    raw_csrf_token: Option<&'a str>,
}

impl<'a> LocalBrowserAuthTransportV1<'a> {
    /// Exact bearer material supplied by the host-only session cookie.
    #[must_use]
    pub const fn raw_session_token(&self) -> &'a str {
        self.raw_session_token
    }

    /// Independent anti-CSRF material after cookie/header equality.
    #[must_use]
    pub const fn raw_csrf_token(&self) -> Option<&'a str> {
        self.raw_csrf_token
    }
}

/// One-time `Set-Cookie` response fields for an issued local browser session.
///
/// This type intentionally implements neither `Clone` nor `Debug`.
pub struct LocalBrowserSessionCookieHeadersV1 {
    session: String,
    csrf: String,
}

impl LocalBrowserSessionCookieHeadersV1 {
    /// Host-only, `HttpOnly`, strict same-site session cookie field value.
    #[must_use]
    pub fn session(&self) -> &str {
        &self.session
    }

    /// Host-only, strict same-site anti-CSRF cookie field value.
    #[must_use]
    pub fn csrf(&self) -> &str {
        &self.csrf
    }
}

impl Drop for LocalBrowserSessionCookieHeadersV1 {
    fn drop(&mut self) {
        self.session.zeroize();
        self.csrf.zeroize();
    }
}

/// Builds exact host-only session and anti-CSRF `Set-Cookie` field values.
///
/// The loopback v1 listener is plain HTTP, so these values intentionally omit
/// the `Secure` attribute. They include no `Domain`, use `Path=/`, strict
/// same-site scope, bounded `Max-Age`, and `HttpOnly` on bearer material.
///
/// # Errors
///
/// Rejects malformed raw secrets and lifetimes outside 60 through 3,600
/// seconds.
pub fn create_local_browser_session_cookie_headers_v1(
    raw_session_token: &str,
    raw_csrf_token: &str,
    max_age_seconds: u32,
) -> Result<LocalBrowserSessionCookieHeadersV1, LocalBrowserAuthTransportErrorV1> {
    if local_session_id_from_token_v1(raw_session_token).is_none() {
        return Err(LocalBrowserAuthTransportErrorV1::SessionRejected);
    }
    if !valid_raw_csrf_token_v1(raw_csrf_token) {
        return Err(LocalBrowserAuthTransportErrorV1::CsrfRejected);
    }
    if !(60..=3_600).contains(&max_age_seconds) {
        return Err(LocalBrowserAuthTransportErrorV1::LifetimeRejected);
    }
    Ok(LocalBrowserSessionCookieHeadersV1 {
        session: format!(
            "{LOCAL_SESSION_COOKIE_NAME_V1}={raw_session_token}; Path=/; HttpOnly; SameSite=Strict; Max-Age={max_age_seconds}"
        ),
        csrf: format!(
            "{LOCAL_CSRF_COOKIE_NAME_V1}={raw_csrf_token}; Path=/; SameSite=Strict; Max-Age={max_age_seconds}"
        ),
    })
}

/// Exact clearing `Set-Cookie` values for sign-out and revocation responses.
#[must_use]
pub fn clear_local_browser_session_cookie_headers_v1() -> LocalBrowserSessionCookieHeadersV1 {
    LocalBrowserSessionCookieHeadersV1 {
        session: format!(
            "{LOCAL_SESSION_COOKIE_NAME_V1}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0"
        ),
        csrf: format!("{LOCAL_CSRF_COOKIE_NAME_V1}=; Path=/; SameSite=Strict; Max-Age=0"),
    }
}

/// Parses one duplicate-refused Cookie field and exact anti-CSRF header.
///
/// Reads require a valid session cookie. Mutations additionally require a
/// valid anti-CSRF cookie and request header with constant-time equality.
/// Unknown well-formed cookies are ignored; malformed pairs fail closed.
///
/// # Errors
///
/// Rejects unsupported methods, malformed/oversized cookies, duplicate auth
/// cookies, invalid secrets, and missing/mismatched mutation CSRF proof.
pub fn parse_local_browser_auth_transport_v1<'a>(
    method: &str,
    cookie_header: Option<&'a str>,
    csrf_header: Option<&'a str>,
) -> Result<LocalBrowserAuthTransportV1<'a>, LocalBrowserAuthTransportErrorV1> {
    if !matches!(method, "GET" | "HEAD" | "POST" | "PUT" | "PATCH" | "DELETE") {
        return Err(LocalBrowserAuthTransportErrorV1::MethodRejected);
    }
    let cookie_header = cookie_header.ok_or(LocalBrowserAuthTransportErrorV1::CookieRejected)?;
    if cookie_header.is_empty() || cookie_header.len() > LOCAL_BROWSER_COOKIE_HEADER_MAX_BYTES_V1 {
        return Err(LocalBrowserAuthTransportErrorV1::CookieRejected);
    }
    let mut session_cookie = None;
    let mut csrf_cookie = None;
    for pair in cookie_header.split(';') {
        let pair = pair.trim_matches([' ', '\t']);
        let Some((name, value)) = pair.split_once('=') else {
            return Err(LocalBrowserAuthTransportErrorV1::CookieRejected);
        };
        if !valid_cookie_name_v1(name) || !valid_cookie_value_v1(value) {
            return Err(LocalBrowserAuthTransportErrorV1::CookieRejected);
        }
        match name {
            LOCAL_SESSION_COOKIE_NAME_V1 if session_cookie.is_none() => {
                session_cookie = Some(value);
            }
            LOCAL_CSRF_COOKIE_NAME_V1 if csrf_cookie.is_none() => csrf_cookie = Some(value),
            LOCAL_SESSION_COOKIE_NAME_V1 | LOCAL_CSRF_COOKIE_NAME_V1 => {
                return Err(LocalBrowserAuthTransportErrorV1::DuplicateAuthCookie);
            }
            _ => {}
        }
    }
    let raw_session_token =
        session_cookie.ok_or(LocalBrowserAuthTransportErrorV1::SessionRejected)?;
    if local_session_id_from_token_v1(raw_session_token).is_none() {
        return Err(LocalBrowserAuthTransportErrorV1::SessionRejected);
    }

    if matches!(method, "GET" | "HEAD") {
        if csrf_cookie.is_some_and(|value| !valid_raw_csrf_token_v1(value))
            || csrf_header.is_some_and(|value| !valid_raw_csrf_token_v1(value))
        {
            return Err(LocalBrowserAuthTransportErrorV1::CsrfRejected);
        }
        return Ok(LocalBrowserAuthTransportV1 {
            raw_session_token,
            raw_csrf_token: None,
        });
    }

    let raw_csrf_token = csrf_cookie.ok_or(LocalBrowserAuthTransportErrorV1::CsrfRejected)?;
    let csrf_header = csrf_header.ok_or(LocalBrowserAuthTransportErrorV1::CsrfRejected)?;
    if !valid_raw_csrf_token_v1(raw_csrf_token) || !valid_raw_csrf_token_v1(csrf_header) {
        return Err(LocalBrowserAuthTransportErrorV1::CsrfRejected);
    }
    if !constant_time_str_eq(raw_csrf_token, csrf_header) {
        return Err(LocalBrowserAuthTransportErrorV1::CsrfMismatch);
    }
    Ok(LocalBrowserAuthTransportV1 {
        raw_session_token,
        raw_csrf_token: Some(raw_csrf_token),
    })
}

/// Evaluates strict browser transport facts without opening a route or granting
/// capability.
///
/// # Errors
///
/// Denies remote peers, DNS-rebinding Host drift, cross-site/unknown browser
/// fetches, unsafe read methods, and mutations lacking exact Origin, JSON, or
/// independent anti-CSRF proof.
pub fn evaluate_local_browser_request_v1(
    expected: &LocalBrowserOriginV1,
    request: &LocalBrowserRequestV1<'_>,
) -> Result<LocalBrowserRequestClassV1, LocalBrowserRequestErrorV1> {
    if !request.peer_address.is_loopback() {
        return Err(LocalBrowserRequestErrorV1::RemotePeer);
    }
    if request.host != expected.host_header() {
        return Err(LocalBrowserRequestErrorV1::HostMismatch);
    }
    if request.fetch_site != Some("same-origin") {
        return Err(LocalBrowserRequestErrorV1::FetchMetadataRejected);
    }
    if request
        .origin
        .is_some_and(|origin| origin != expected.serialized_origin())
    {
        return Err(LocalBrowserRequestErrorV1::OriginMismatch);
    }
    match request.method {
        "GET" | "HEAD" => Ok(LocalBrowserRequestClassV1::ReadOnly),
        "POST" | "PUT" | "PATCH" | "DELETE" => {
            if request.origin.is_none() {
                return Err(LocalBrowserRequestErrorV1::OriginRequired);
            }
            if request.content_type != Some("application/json") {
                return Err(LocalBrowserRequestErrorV1::ContentTypeRejected);
            }
            if !request.csrf_verified {
                return Err(LocalBrowserRequestErrorV1::CsrfRejected);
            }
            Ok(LocalBrowserRequestClassV1::MutationPreflight)
        }
        _ => Err(LocalBrowserRequestErrorV1::MethodRejected),
    }
}

/// One-time raw session material plus the exact evidence safe to persist.
///
/// This type intentionally implements neither `Clone` nor `Debug`.
pub struct LocalSessionSecretsV1 {
    /// Public random session identifier.
    pub session_id: String,
    /// Bearer token returned exactly once and stored only as a digest.
    pub raw_session_token: String,
    /// Independent anti-CSRF secret returned exactly once and stored as a digest.
    pub raw_csrf_token: String,
    /// Domain-separated digest of the complete raw session token.
    pub session_token_digest: String,
    /// Domain-separated digest of the raw anti-CSRF token.
    pub csrf_token_digest: String,
}

/// Creates independent operating-system-random session and anti-CSRF secrets.
///
/// # Errors
///
/// Returns a public-safe error if the random provider cannot satisfy the exact
/// fixed-size profile.
pub fn create_local_session_secrets_v1() -> Result<LocalSessionSecretsV1, LocalSessionSecretErrorV1>
{
    let mut session_id_bytes = [0_u8; LOCAL_SESSION_ID_HEX_BYTES];
    let mut session_secret_bytes = [0_u8; LOCAL_SESSION_SECRET_BYTES];
    let mut csrf_secret_bytes = [0_u8; LOCAL_SESSION_SECRET_BYTES];
    OsRng
        .try_fill_bytes(&mut session_id_bytes)
        .and_then(|()| OsRng.try_fill_bytes(&mut session_secret_bytes))
        .and_then(|()| OsRng.try_fill_bytes(&mut csrf_secret_bytes))
        .map_err(|_| LocalSessionSecretErrorV1::CreationFailed)?;

    let session_id = format!(
        "{LOCAL_SESSION_ID_PREFIX}{}",
        encode_lower_hex(&session_id_bytes)
    );
    let raw_session_token = format!("{session_id}.{}", encode_lower_hex(&session_secret_bytes));
    let raw_csrf_token = encode_lower_hex(&csrf_secret_bytes);
    let session_token_digest =
        domain_separated_sha256("lnsat.local_session.token.v1", &raw_session_token);
    let csrf_token_digest = domain_separated_sha256("lnsat.local_session.csrf.v1", &raw_csrf_token);

    Ok(LocalSessionSecretsV1 {
        session_id,
        raw_session_token,
        raw_csrf_token,
        session_token_digest,
        csrf_token_digest,
    })
}

/// Returns the strict public session identifier carried by one raw token.
#[must_use]
pub fn local_session_id_from_token_v1(raw_session_token: &str) -> Option<&str> {
    let (session_id, secret) = raw_session_token.split_once('.')?;
    if is_local_session_id_v1(session_id) && is_lower_hex(secret, LOCAL_SESSION_SECRET_BYTES * 2) {
        Some(session_id)
    } else {
        None
    }
}

/// Verifies a raw session token against an exact domain-separated digest.
///
/// # Errors
///
/// Rejects malformed raw or persisted evidence.
pub fn verify_local_session_token_v1(
    raw_session_token: &str,
    expected_digest: &str,
) -> Result<bool, LocalSessionSecretErrorV1> {
    if local_session_id_from_token_v1(raw_session_token).is_none() {
        return Err(LocalSessionSecretErrorV1::EvidenceInvalid);
    }
    verify_domain_digest(
        "lnsat.local_session.token.v1",
        raw_session_token,
        expected_digest,
    )
}

/// Verifies an anti-CSRF token against an exact independent digest.
///
/// # Errors
///
/// Rejects malformed raw or persisted evidence.
pub fn verify_local_session_csrf_v1(
    raw_csrf_token: &str,
    expected_digest: &str,
) -> Result<bool, LocalSessionSecretErrorV1> {
    if !is_lower_hex(raw_csrf_token, LOCAL_SESSION_SECRET_BYTES * 2) {
        return Ok(false);
    }
    verify_domain_digest(
        "lnsat.local_session.csrf.v1",
        raw_csrf_token,
        expected_digest,
    )
}

/// Validates exact persisted session or anti-CSRF SHA-256 evidence.
///
/// # Errors
///
/// Rejects malformed, truncated, widened, or non-lowercase digest evidence.
pub fn validate_local_session_digest_v1(digest: &str) -> Result<(), LocalSessionSecretErrorV1> {
    decode_sha256(digest).map(|_| ())
}

/// Creates one random-salt Argon2id v19 PHC verifier.
///
/// Password bytes are consumed only by the KDF and never returned.
///
/// # Errors
///
/// Returns a public-safe failure for out-of-bounds password input or failed
/// verifier construction.
pub fn create_local_password_verifier_v1(password: &str) -> Result<String, LocalPasswordErrorV1> {
    validate_password_for_creation(password)?;
    let salt = SaltString::generate(&mut OsRng);
    local_argon2_v1()?
        .hash_password(password.as_bytes(), &salt)
        .map(|verifier| verifier.to_string())
        .map_err(|_| LocalPasswordErrorV1::VerifierCreationFailed)
}

/// Validates exact v1 verifier structure and work factors.
///
/// # Errors
///
/// Rejects malformed, downgraded, widened, or wrong-algorithm PHC evidence.
pub fn validate_local_password_verifier_v1(verifier: &str) -> Result<(), LocalPasswordErrorV1> {
    let parsed =
        PasswordHash::new(verifier).map_err(|_| LocalPasswordErrorV1::VerifierEvidenceInvalid)?;
    if parsed.algorithm.as_str() != "argon2id"
        || parsed.version != Some(19)
        || parsed.params.get_decimal("m") != Some(LOCAL_PASSWORD_ARGON2_M_COST_V1)
        || parsed.params.get_decimal("t") != Some(LOCAL_PASSWORD_ARGON2_T_COST_V1)
        || parsed.params.get_decimal("p") != Some(LOCAL_PASSWORD_ARGON2_P_COST_V1)
        || parsed.salt.is_none()
        || parsed
            .hash
            .as_ref()
            .is_none_or(|output| output.len() != LOCAL_PASSWORD_OUTPUT_BYTES_V1)
    {
        return Err(LocalPasswordErrorV1::VerifierEvidenceInvalid);
    }
    Ok(())
}

/// Verifies a bounded candidate against exact v1 Argon2id evidence.
///
/// Invalid candidate input is a normal mismatch. Malformed or downgraded
/// persisted evidence remains a distinct fail-closed storage error.
///
/// # Errors
///
/// Returns `VerifierEvidenceInvalid` when stored PHC evidence does not match the
/// exact v1 profile.
pub fn verify_local_password_v1(
    password: &str,
    verifier: &str,
) -> Result<bool, LocalPasswordErrorV1> {
    if !is_bounded_password(password) {
        return Ok(false);
    }
    validate_local_password_verifier_v1(verifier)?;
    let parsed =
        PasswordHash::new(verifier).map_err(|_| LocalPasswordErrorV1::VerifierEvidenceInvalid)?;
    Ok(local_argon2_v1()?
        .verify_password(password.as_bytes(), &parsed)
        .is_ok())
}

fn validate_password_for_creation(password: &str) -> Result<(), LocalPasswordErrorV1> {
    if is_bounded_password(password) {
        Ok(())
    } else {
        Err(LocalPasswordErrorV1::InvalidPassword)
    }
}

fn is_bounded_password(password: &str) -> bool {
    (LOCAL_PASSWORD_MIN_CHARACTERS_V1..=LOCAL_PASSWORD_MAX_CHARACTERS_V1)
        .contains(&password.chars().count())
        && password.len() <= LOCAL_PASSWORD_MAX_BYTES_V1
        && !password.as_bytes().contains(&0)
}

fn local_argon2_v1() -> Result<Argon2<'static>, LocalPasswordErrorV1> {
    let params = Params::new(
        LOCAL_PASSWORD_ARGON2_M_COST_V1,
        LOCAL_PASSWORD_ARGON2_T_COST_V1,
        LOCAL_PASSWORD_ARGON2_P_COST_V1,
        Some(LOCAL_PASSWORD_OUTPUT_BYTES_V1),
    )
    .map_err(|_| LocalPasswordErrorV1::VerifierCreationFailed)?;
    Ok(Argon2::new(Algorithm::Argon2id, Version::V0x13, params))
}

fn is_local_session_id_v1(value: &str) -> bool {
    value
        .strip_prefix(LOCAL_SESSION_ID_PREFIX)
        .is_some_and(|suffix| is_lower_hex(suffix, LOCAL_SESSION_ID_HEX_BYTES * 2))
}

fn is_lower_hex(value: &str, expected_len: usize) -> bool {
    value.len() == expected_len
        && value
            .bytes()
            .all(|byte| byte.is_ascii_digit() || (b'a'..=b'f').contains(&byte))
}

fn valid_raw_csrf_token_v1(value: &str) -> bool {
    is_lower_hex(value, LOCAL_SESSION_SECRET_BYTES * 2)
}

fn valid_cookie_name_v1(value: &str) -> bool {
    !value.is_empty()
        && value.bytes().all(|byte| {
            byte.is_ascii_alphanumeric()
                || matches!(
                    byte,
                    b'!' | b'#'
                        ..=b'\'' | b'*' | b'+' | b'-' | b'.' | b'^' | b'_' | b'`' | b'|' | b'~'
                )
        })
}

fn valid_cookie_value_v1(value: &str) -> bool {
    value.bytes().all(|byte| {
        byte == b'!'
            || (b'#'..=b'+').contains(&byte)
            || (b'-'..=b':').contains(&byte)
            || (b'<'..=b'[').contains(&byte)
            || (b']'..=b'~').contains(&byte)
    })
}

fn constant_time_str_eq(left: &str, right: &str) -> bool {
    left.len() == right.len() && bool::from(left.as_bytes().ct_eq(right.as_bytes()))
}

fn encode_lower_hex(bytes: &[u8]) -> String {
    let mut encoded = String::with_capacity(bytes.len() * 2);
    for byte in bytes {
        use core::fmt::Write as _;
        write!(&mut encoded, "{byte:02x}").expect("writing to String cannot fail");
    }
    encoded
}

fn domain_separated_sha256(domain: &str, value: &str) -> String {
    let mut digest = Sha256::new();
    digest.update(domain.as_bytes());
    digest.update([0]);
    digest.update(value.as_bytes());
    format!("sha256:{}", encode_lower_hex(&digest.finalize()))
}

fn verify_domain_digest(
    domain: &str,
    value: &str,
    expected_digest: &str,
) -> Result<bool, LocalSessionSecretErrorV1> {
    let expected = decode_sha256(expected_digest)?;
    let mut actual = Sha256::new();
    actual.update(domain.as_bytes());
    actual.update([0]);
    actual.update(value.as_bytes());
    let actual: [u8; 32] = actual.finalize().into();
    Ok(bool::from(actual.ct_eq(&expected)))
}

fn decode_sha256(value: &str) -> Result<[u8; 32], LocalSessionSecretErrorV1> {
    let encoded = value
        .strip_prefix("sha256:")
        .filter(|encoded| is_lower_hex(encoded, 64))
        .ok_or(LocalSessionSecretErrorV1::EvidenceInvalid)?;
    let mut decoded = [0_u8; 32];
    for (index, byte) in decoded.iter_mut().enumerate() {
        *byte = u8::from_str_radix(&encoded[index * 2..index * 2 + 2], 16)
            .map_err(|_| LocalSessionSecretErrorV1::EvidenceInvalid)?;
    }
    Ok(decoded)
}

#[cfg(test)]
mod tests {
    use super::*;

    const PASSWORD: &str = "correct horse battery staple";

    #[test]
    fn creates_exact_random_salt_argon2id_v1_verifiers() {
        let first =
            create_local_password_verifier_v1(PASSWORD).expect("first verifier must create");
        let second =
            create_local_password_verifier_v1(PASSWORD).expect("second verifier must create");

        assert_ne!(first, second);
        validate_local_password_verifier_v1(&first).expect("first verifier must validate");
        validate_local_password_verifier_v1(&second).expect("second verifier must validate");
        assert_eq!(verify_local_password_v1(PASSWORD, &first), Ok(true));
        assert_eq!(
            verify_local_password_v1("wrong password value", &first),
            Ok(false)
        );
    }

    #[test]
    fn creation_rejects_out_of_bounds_or_nul_passwords() {
        for invalid in [
            "",
            "too-short",
            "contains\0nul-and-is-long-enough",
            &"x".repeat(LOCAL_PASSWORD_MAX_CHARACTERS_V1 + 1),
        ] {
            assert_eq!(
                create_local_password_verifier_v1(invalid),
                Err(LocalPasswordErrorV1::InvalidPassword)
            );
        }
        assert!(create_local_password_verifier_v1(&"x".repeat(15)).is_ok());
        assert!(
            create_local_password_verifier_v1(&"x".repeat(LOCAL_PASSWORD_MAX_CHARACTERS_V1))
                .is_ok()
        );
    }

    #[test]
    fn verification_rejects_malformed_and_downgraded_evidence() {
        let verifier = create_local_password_verifier_v1(PASSWORD).expect("verifier must create");
        for invalid in [
            "not-a-phc-verifier".to_owned(),
            verifier.replace("argon2id", "argon2i"),
            verifier.replace("v=19", "v=16"),
            verifier.replace("m=19456", "m=8192"),
            verifier.replace("t=2", "t=1"),
            verifier.replace("p=1", "p=2"),
        ] {
            assert_eq!(
                validate_local_password_verifier_v1(&invalid),
                Err(LocalPasswordErrorV1::VerifierEvidenceInvalid)
            );
            assert_eq!(
                verify_local_password_v1(PASSWORD, &invalid),
                Err(LocalPasswordErrorV1::VerifierEvidenceInvalid)
            );
        }
    }

    #[test]
    fn invalid_candidate_is_mismatch_without_parsing_secret_evidence() {
        let verifier = create_local_password_verifier_v1(PASSWORD).expect("verifier must create");
        assert_eq!(verify_local_password_v1("short", &verifier), Ok(false));
        assert_eq!(
            verify_local_password_v1(&"x".repeat(LOCAL_PASSWORD_MAX_CHARACTERS_V1 + 1), &verifier,),
            Ok(false)
        );
    }

    #[test]
    fn errors_expose_only_stable_codes() {
        assert_eq!(
            LocalPasswordErrorV1::InvalidPassword.code(),
            "local_password.invalid_password"
        );
        assert_eq!(
            LocalPasswordErrorV1::VerifierCreationFailed.code(),
            "local_password.verifier_creation_failed"
        );
        assert_eq!(
            LocalPasswordErrorV1::VerifierEvidenceInvalid.code(),
            "local_password.verifier_evidence_invalid"
        );
        assert_eq!(
            LocalSessionSecretErrorV1::CreationFailed.code(),
            "local_session_secret.creation_failed"
        );
        assert_eq!(
            LocalSessionSecretErrorV1::EvidenceInvalid.code(),
            "local_session_secret.evidence_invalid"
        );
    }

    #[test]
    fn creates_independent_hash_only_session_and_csrf_evidence() {
        let first = create_local_session_secrets_v1().expect("session secrets must create");
        let second = create_local_session_secrets_v1().expect("session secrets must create");

        assert_ne!(first.session_id, second.session_id);
        assert_ne!(first.raw_session_token, second.raw_session_token);
        assert_ne!(first.raw_csrf_token, second.raw_csrf_token);
        assert_eq!(
            local_session_id_from_token_v1(&first.raw_session_token),
            Some(first.session_id.as_str())
        );
        assert_eq!(
            verify_local_session_token_v1(&first.raw_session_token, &first.session_token_digest),
            Ok(true)
        );
        assert_eq!(
            verify_local_session_csrf_v1(&first.raw_csrf_token, &first.csrf_token_digest),
            Ok(true)
        );
        assert!(
            !first
                .session_token_digest
                .contains(&first.raw_session_token)
        );
        assert!(!first.csrf_token_digest.contains(&first.raw_csrf_token));
    }

    #[test]
    fn session_and_csrf_verification_fail_closed() {
        let secrets = create_local_session_secrets_v1().expect("session secrets must create");
        let other = create_local_session_secrets_v1().expect("other secrets must create");
        assert_eq!(
            verify_local_session_token_v1(&other.raw_session_token, &secrets.session_token_digest),
            Ok(false)
        );
        assert_eq!(
            verify_local_session_csrf_v1(&other.raw_csrf_token, &secrets.csrf_token_digest),
            Ok(false)
        );
        for malformed in ["", "ses_bad.secret", "ses_0000.0000"] {
            assert_eq!(
                verify_local_session_token_v1(malformed, &secrets.session_token_digest),
                Err(LocalSessionSecretErrorV1::EvidenceInvalid)
            );
        }
        assert_eq!(
            verify_local_session_csrf_v1("not-hex", &secrets.csrf_token_digest),
            Ok(false)
        );
        assert_eq!(
            verify_local_session_token_v1(&secrets.raw_session_token, "sha256:bad"),
            Err(LocalSessionSecretErrorV1::EvidenceInvalid)
        );
    }

    #[test]
    fn browser_cookie_headers_are_host_only_bounded_and_clearable() {
        let secrets = create_local_session_secrets_v1().expect("session secrets must create");
        let headers = create_local_browser_session_cookie_headers_v1(
            &secrets.raw_session_token,
            &secrets.raw_csrf_token,
            300,
        )
        .expect("cookie headers must create");
        assert_eq!(
            headers.session(),
            format!(
                "{LOCAL_SESSION_COOKIE_NAME_V1}={}; Path=/; HttpOnly; SameSite=Strict; Max-Age=300",
                secrets.raw_session_token
            )
        );
        assert_eq!(
            headers.csrf(),
            format!(
                "{LOCAL_CSRF_COOKIE_NAME_V1}={}; Path=/; SameSite=Strict; Max-Age=300",
                secrets.raw_csrf_token
            )
        );
        for header in [headers.session(), headers.csrf()] {
            assert!(!header.contains("Domain="));
            assert!(!header.contains("Secure"));
        }
        let cleared = clear_local_browser_session_cookie_headers_v1();
        assert_eq!(
            cleared.session(),
            "lnsat_session_v1=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0"
        );
        assert_eq!(
            cleared.csrf(),
            "lnsat_csrf_v1=; Path=/; SameSite=Strict; Max-Age=0"
        );
        for invalid_lifetime in [0, 59, 3_601, u32::MAX] {
            assert!(matches!(
                create_local_browser_session_cookie_headers_v1(
                    &secrets.raw_session_token,
                    &secrets.raw_csrf_token,
                    invalid_lifetime,
                ),
                Err(LocalBrowserAuthTransportErrorV1::LifetimeRejected)
            ));
        }
    }

    #[test]
    fn browser_auth_transport_parses_reads_and_constant_time_double_submit() {
        let secrets = create_local_session_secrets_v1().expect("session secrets must create");
        let cookie = format!(
            "theme=dark; empty=; {LOCAL_SESSION_COOKIE_NAME_V1}={}; {LOCAL_CSRF_COOKIE_NAME_V1}={}",
            secrets.raw_session_token, secrets.raw_csrf_token
        );
        let read = parse_local_browser_auth_transport_v1("GET", Some(&cookie), None)
            .expect("read auth transport must parse");
        assert_eq!(read.raw_session_token(), secrets.raw_session_token);
        assert_eq!(read.raw_csrf_token(), None);

        let mutation = parse_local_browser_auth_transport_v1(
            "POST",
            Some(&cookie),
            Some(&secrets.raw_csrf_token),
        )
        .expect("mutation auth transport must parse");
        assert_eq!(mutation.raw_session_token(), secrets.raw_session_token);
        assert_eq!(
            mutation.raw_csrf_token(),
            Some(secrets.raw_csrf_token.as_str())
        );
    }

    #[test]
    fn browser_auth_transport_rejects_malformed_duplicate_and_mismatched_evidence() {
        let secrets = create_local_session_secrets_v1().expect("session secrets must create");
        let other = create_local_session_secrets_v1().expect("other secrets must create");
        let valid = format!(
            "{LOCAL_SESSION_COOKIE_NAME_V1}={}; {LOCAL_CSRF_COOKIE_NAME_V1}={}",
            secrets.raw_session_token, secrets.raw_csrf_token
        );
        let cases = [
            (
                "OPTIONS",
                Some(valid.as_str()),
                Some(secrets.raw_csrf_token.as_str()),
                LocalBrowserAuthTransportErrorV1::MethodRejected,
            ),
            (
                "GET",
                None,
                None,
                LocalBrowserAuthTransportErrorV1::CookieRejected,
            ),
            (
                "GET",
                Some("theme"),
                None,
                LocalBrowserAuthTransportErrorV1::CookieRejected,
            ),
            (
                "GET",
                Some("theme=dark"),
                None,
                LocalBrowserAuthTransportErrorV1::SessionRejected,
            ),
            (
                "GET",
                Some("lnsat_session_v1=bad"),
                None,
                LocalBrowserAuthTransportErrorV1::SessionRejected,
            ),
            (
                "POST",
                Some(valid.as_str()),
                None,
                LocalBrowserAuthTransportErrorV1::CsrfRejected,
            ),
            (
                "POST",
                Some(valid.as_str()),
                Some(other.raw_csrf_token.as_str()),
                LocalBrowserAuthTransportErrorV1::CsrfMismatch,
            ),
        ];
        for (method, cookie, csrf, expected) in cases {
            assert_eq!(
                parse_local_browser_auth_transport_v1(method, cookie, csrf).err(),
                Some(expected)
            );
        }
        let duplicate_session = format!(
            "{LOCAL_SESSION_COOKIE_NAME_V1}={}; {LOCAL_SESSION_COOKIE_NAME_V1}={}",
            secrets.raw_session_token, secrets.raw_session_token
        );
        assert!(matches!(
            parse_local_browser_auth_transport_v1("GET", Some(&duplicate_session), None),
            Err(LocalBrowserAuthTransportErrorV1::DuplicateAuthCookie)
        ));
        let oversized = "x".repeat(LOCAL_BROWSER_COOKIE_HEADER_MAX_BYTES_V1 + 1);
        assert!(matches!(
            parse_local_browser_auth_transport_v1("GET", Some(&oversized), None),
            Err(LocalBrowserAuthTransportErrorV1::CookieRejected)
        ));
    }

    #[test]
    fn browser_request_contract_allows_only_exact_reads_and_mutations() {
        let endpoint =
            LocalBrowserOriginV1::loopback_http("127.0.0.1".parse().expect("IP must parse"), 7401)
                .expect("loopback origin must create");
        assert_eq!(endpoint.host_header(), "127.0.0.1:7401");
        assert_eq!(endpoint.serialized_origin(), "http://127.0.0.1:7401");

        let read = LocalBrowserRequestV1 {
            peer_address: "127.0.0.1".parse().expect("IP must parse"),
            method: "GET",
            host: endpoint.host_header(),
            origin: None,
            fetch_site: Some("same-origin"),
            content_type: None,
            csrf_verified: false,
        };
        assert_eq!(
            evaluate_local_browser_request_v1(&endpoint, &read),
            Ok(LocalBrowserRequestClassV1::ReadOnly)
        );

        let mutation = LocalBrowserRequestV1 {
            method: "POST",
            origin: Some(endpoint.serialized_origin()),
            content_type: Some("application/json"),
            csrf_verified: true,
            ..read
        };
        assert_eq!(
            evaluate_local_browser_request_v1(&endpoint, &mutation),
            Ok(LocalBrowserRequestClassV1::MutationPreflight)
        );

        let ipv6 = LocalBrowserOriginV1::loopback_http("::1".parse().expect("IP must parse"), 7401)
            .expect("IPv6 loopback origin must create");
        assert_eq!(ipv6.host_header(), "[::1]:7401");
        assert_eq!(ipv6.serialized_origin(), "http://[::1]:7401");
    }

    #[test]
    fn browser_request_contract_denies_remote_rebinding_cross_site_and_csrf_gaps() {
        let endpoint =
            LocalBrowserOriginV1::loopback_http("127.0.0.1".parse().expect("IP must parse"), 7401)
                .expect("loopback origin must create");
        let valid = LocalBrowserRequestV1 {
            peer_address: "127.0.0.1".parse().expect("IP must parse"),
            method: "POST",
            host: endpoint.host_header(),
            origin: Some(endpoint.serialized_origin()),
            fetch_site: Some("same-origin"),
            content_type: Some("application/json"),
            csrf_verified: true,
        };

        let cases = [
            (
                LocalBrowserRequestV1 {
                    peer_address: "192.0.2.10".parse().expect("IP must parse"),
                    ..valid
                },
                LocalBrowserRequestErrorV1::RemotePeer,
            ),
            (
                LocalBrowserRequestV1 {
                    host: "localhost:7401",
                    ..valid
                },
                LocalBrowserRequestErrorV1::HostMismatch,
            ),
            (
                LocalBrowserRequestV1 {
                    fetch_site: Some("cross-site"),
                    ..valid
                },
                LocalBrowserRequestErrorV1::FetchMetadataRejected,
            ),
            (
                LocalBrowserRequestV1 {
                    fetch_site: None,
                    ..valid
                },
                LocalBrowserRequestErrorV1::FetchMetadataRejected,
            ),
            (
                LocalBrowserRequestV1 {
                    origin: Some("http://127.0.0.1:7402"),
                    ..valid
                },
                LocalBrowserRequestErrorV1::OriginMismatch,
            ),
            (
                LocalBrowserRequestV1 {
                    origin: None,
                    ..valid
                },
                LocalBrowserRequestErrorV1::OriginRequired,
            ),
            (
                LocalBrowserRequestV1 {
                    content_type: Some("text/plain"),
                    ..valid
                },
                LocalBrowserRequestErrorV1::ContentTypeRejected,
            ),
            (
                LocalBrowserRequestV1 {
                    csrf_verified: false,
                    ..valid
                },
                LocalBrowserRequestErrorV1::CsrfRejected,
            ),
            (
                LocalBrowserRequestV1 {
                    method: "OPTIONS",
                    ..valid
                },
                LocalBrowserRequestErrorV1::MethodRejected,
            ),
        ];
        for (request, expected_error) in cases {
            assert_eq!(
                evaluate_local_browser_request_v1(&endpoint, &request),
                Err(expected_error)
            );
        }
        assert_eq!(
            LocalBrowserOriginV1::loopback_http("0.0.0.0".parse().expect("IP must parse"), 7401),
            Err(LocalBrowserRequestErrorV1::InvalidConfiguration)
        );
        assert_eq!(
            LocalBrowserOriginV1::loopback_http("127.0.0.1".parse().expect("IP must parse"), 0),
            Err(LocalBrowserRequestErrorV1::InvalidConfiguration)
        );
    }
}
