//! Withdrawn Unix-socket transport compatibility surface.

use crate::product_output::{ProductOutputErrorV1, ProductSemanticResultV1};
use crate::product_surface::ProductExitCodeV1;
#[cfg(test)]
use crate::{
    GATEWAY_CONTRACT_VERSION_HEADER_NAME_V1,
    product_surface::{
        DaemonHealthV1, DaemonStatusV1, DaemonStatusV2, PRODUCT_SURFACE_CONTRACT_HEADER_NAME_V1,
    },
};
#[cfg(test)]
use lnsat_contracts::CONTRACT_VERSION_V1_0;
use std::fmt;
use std::io::Read;
use std::path::{Path, PathBuf};
use std::time::Duration;
use zeroize::Zeroizing;

/// Maximum opaque session token bytes accepted from protected stdin.
pub const MAX_SESSION_TOKEN_STDIN_BYTES_V1: usize = 512;

/// Maximum HTTP response-head bytes accepted from local daemon.
pub const MAX_PRODUCT_RESPONSE_HEAD_BYTES_V1: usize = 8 * 1024;

/// Maximum response-header fields accepted from local daemon.
pub const MAX_PRODUCT_RESPONSE_HEADER_COUNT_V1: usize = 64;

/// Maximum authenticated product response body bytes.
pub const MAX_PRODUCT_RESPONSE_BODY_BYTES_V1: usize = 64 * 1024;

/// Exact connect timeout for one explicit local endpoint.
pub const PRODUCT_CONNECT_TIMEOUT_V1: Duration = Duration::from_secs(2);

/// Absolute wall-clock deadline for the entire write and read phase after
/// connection is established. Not a per-operation timeout.
pub const PRODUCT_IO_TIMEOUT_V1: Duration = Duration::from_secs(2);

/// Closed authenticated daemon read commands.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum ProductReadCommandV1 {
    /// Authenticated storage/daemon health.
    Health,
    /// Authenticated product/Phase 10 status.
    Status,
}

impl ProductReadCommandV1 {
    /// Exact request path.
    #[must_use]
    pub const fn path(self) -> &'static str {
        match self {
            Self::Health => "/v1/health",
            Self::Status => "/v1/status",
        }
    }

    /// Stable command name.
    #[must_use]
    pub const fn name(self) -> &'static str {
        match self {
            Self::Health => "health",
            Self::Status => "status",
        }
    }
}

/// Legacy Unix-socket endpoint type retained for parse-compatible callers.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct UnixSocketEndpointV1 {
    path: PathBuf,
}

impl UnixSocketEndpointV1 {
    /// Rejects every Unix endpoint because live-daemon authentication is absent.
    ///
    /// # Errors
    ///
    /// Rejects relative, oversized, non-UTF-8, dot-component, or trailing
    /// separator paths before secret input or connection.
    pub fn parse(value: impl AsRef<Path>) -> Result<Self, ProductClientErrorV1> {
        let _ = value;
        Err(ProductClientErrorV1::UnixTransportWithdrawn)
    }

    /// Exact validated local socket path.
    #[must_use]
    pub fn path(&self) -> &Path {
        &self.path
    }
}

/// Stable public-safe client transport failures.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum ProductClientErrorV1 {
    /// Authenticated Unix product reads are withdrawn pending mutual authentication.
    UnixTransportWithdrawn,
    /// Explicit Unix-socket path was absent or outside exact syntax.
    SocketPathInvalid,
    /// Unix-socket CLI transport is closed on this target.
    PlatformUnsupported,
    /// Socket path, mode, owner, inode, or server peer identity failed closed.
    ServerIdentityRejected,
    /// Protected stdin did not contain exactly one bounded opaque token.
    SessionTokenInputInvalid,
    /// Explicit local endpoint could not be reached.
    Unavailable,
    /// Bounded local operation timed out or daemon reported temporary capacity failure.
    TemporaryFailure,
    /// Session authentication/authorization failed.
    Authentication,
    /// Daemon response or contract was incompatible.
    IncompatibleResponse,
    /// Explicit product-surface contract was not echoed exactly by daemon.
    ProductSurfaceContractIncompatible,
    /// Local output conversion failed.
    InternalFailure,
}

impl ProductClientErrorV1 {
    /// Stable public-safe code.
    #[must_use]
    pub const fn code(self) -> &'static str {
        match self {
            Self::UnixTransportWithdrawn => "lnsatctl.unix_transport.withdrawn",
            Self::SocketPathInvalid => "lnsatctl.socket.path_invalid",
            Self::PlatformUnsupported => "lnsatctl.socket.unsupported",
            Self::ServerIdentityRejected => "lnsatctl.server_identity.denied",
            Self::SessionTokenInputInvalid => "lnsatctl.session_token_stdin.invalid",
            Self::Unavailable => "lnsatctl.socket.unavailable",
            Self::TemporaryFailure => "lnsatctl.socket.temporary_failure",
            Self::Authentication => "lnsatctl.authentication.denied",
            Self::IncompatibleResponse => "lnsatctl.response.incompatible",
            Self::ProductSurfaceContractIncompatible => {
                "lnsatctl.product_surface_contract.incompatible"
            }
            Self::InternalFailure => "lnsatctl.internal_failure",
        }
    }

    /// Stable exit family; read-only uncertainty never maps to outcome unknown.
    #[must_use]
    pub const fn exit_code(self) -> ProductExitCodeV1 {
        match self {
            Self::UnixTransportWithdrawn
            | Self::SocketPathInvalid
            | Self::PlatformUnsupported
            | Self::SessionTokenInputInvalid => ProductExitCodeV1::UsageOrConfiguration,
            Self::ServerIdentityRejected | Self::Authentication => {
                ProductExitCodeV1::Authentication
            }
            Self::Unavailable => ProductExitCodeV1::Unavailable,
            Self::TemporaryFailure => ProductExitCodeV1::TemporaryFailure,
            Self::IncompatibleResponse | Self::ProductSurfaceContractIncompatible => {
                ProductExitCodeV1::Conflict
            }
            Self::InternalFailure => ProductExitCodeV1::InternalFailure,
        }
    }
}

impl From<ProductOutputErrorV1> for ProductClientErrorV1 {
    fn from(_: ProductOutputErrorV1) -> Self {
        Self::InternalFailure
    }
}

impl fmt::Display for ProductClientErrorV1 {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(self.code())
    }
}

impl std::error::Error for ProductClientErrorV1 {}

/// Reads one opaque token from stdin with only one optional terminal newline.
///
/// # Errors
///
/// Rejects empty, oversized, non-UTF-8, NUL-containing, multiple-token, or
/// whitespace-ambiguous input. Returned storage zeroizes on drop.
pub fn read_session_token_stdin_v1(
    input: &mut impl Read,
) -> Result<Zeroizing<String>, ProductClientErrorV1> {
    let mut bytes = Zeroizing::new(Vec::with_capacity(MAX_SESSION_TOKEN_STDIN_BYTES_V1 + 2));
    input
        .take(u64::try_from(MAX_SESSION_TOKEN_STDIN_BYTES_V1 + 3).unwrap_or(u64::MAX))
        .read_to_end(&mut bytes)
        .map_err(|_| ProductClientErrorV1::SessionTokenInputInvalid)?;
    if bytes.is_empty() || bytes.contains(&0) {
        return Err(ProductClientErrorV1::SessionTokenInputInvalid);
    }
    if bytes.ends_with(b"\n") {
        bytes.pop();
        if bytes.ends_with(b"\r") {
            bytes.pop();
        }
    }
    if bytes.is_empty() || bytes.len() > MAX_SESSION_TOKEN_STDIN_BYTES_V1 {
        return Err(ProductClientErrorV1::SessionTokenInputInvalid);
    }
    let token = String::from_utf8(bytes.to_vec())
        .map_err(|_| ProductClientErrorV1::SessionTokenInputInvalid)?;
    if token.chars().any(char::is_whitespace) || token.bytes().any(|byte| byte == 0) {
        return Err(ProductClientErrorV1::SessionTokenInputInvalid);
    }
    Ok(Zeroizing::new(token))
}

/// Returns the stable withdrawal for the legacy authenticated Unix read.
///
/// # Errors
///
/// Returns before inspecting the endpoint or session token.
pub fn request_authenticated_product_read_v1(
    command: ProductReadCommandV1,
    endpoint: &UnixSocketEndpointV1,
    session_token: &str,
) -> Result<ProductSemanticResultV1, ProductClientErrorV1> {
    request_authenticated_product_read_with_product_surface_contract_v1(
        command,
        endpoint,
        session_token,
        None,
    )
}

/// Returns the stable withdrawal for the selector-aware legacy Unix read.
///
/// # Errors
///
/// Returns before inspecting the endpoint, token, or selector.
pub fn request_authenticated_product_read_with_product_surface_contract_v1(
    command: ProductReadCommandV1,
    endpoint: &UnixSocketEndpointV1,
    session_token: &str,
    product_surface_contract: Option<&str>,
) -> Result<ProductSemanticResultV1, ProductClientErrorV1> {
    let _ = (command, endpoint, session_token, product_surface_contract);
    Err(ProductClientErrorV1::UnixTransportWithdrawn)
}

#[cfg(test)]
fn parse_product_response_v1(
    command: ProductReadCommandV1,
    product_surface_contract: Option<&str>,
    response: &[u8],
) -> Result<ProductSemanticResultV1, ProductClientErrorV1> {
    let head_end = response
        .windows(4)
        .position(|window| window == b"\r\n\r\n")
        .map(|index| index + 4)
        .filter(|head_end| *head_end <= MAX_PRODUCT_RESPONSE_HEAD_BYTES_V1)
        .ok_or(ProductClientErrorV1::IncompatibleResponse)?;
    let head = std::str::from_utf8(&response[..head_end - 4])
        .map_err(|_| ProductClientErrorV1::IncompatibleResponse)?;
    let mut lines = head.split("\r\n");
    let status_line = lines
        .next()
        .ok_or(ProductClientErrorV1::IncompatibleResponse)?;
    let status = status_line
        .strip_prefix("HTTP/1.1 ")
        .and_then(|value| value.get(..3))
        .and_then(|value| value.parse::<u16>().ok())
        .ok_or(ProductClientErrorV1::IncompatibleResponse)?;
    if status_line.as_bytes().get(12) != Some(&b' ') {
        return Err(ProductClientErrorV1::IncompatibleResponse);
    }

    let mut names: Vec<&str> = Vec::with_capacity(16);
    let mut content_length = None;
    let mut content_type = None;
    let mut contract_version = None;
    let mut product_surface_response_contract = None;
    let mut connection = None;
    for (index, line) in lines.enumerate() {
        let (name, value) = line
            .split_once(':')
            .ok_or(ProductClientErrorV1::IncompatibleResponse)?;
        if names
            .iter()
            .any(|existing| existing.eq_ignore_ascii_case(name))
            && name.eq_ignore_ascii_case(PRODUCT_SURFACE_CONTRACT_HEADER_NAME_V1)
        {
            return Err(if product_surface_contract.is_some() {
                ProductClientErrorV1::ProductSurfaceContractIncompatible
            } else {
                ProductClientErrorV1::IncompatibleResponse
            });
        }
        if index >= MAX_PRODUCT_RESPONSE_HEADER_COUNT_V1
            || name.is_empty()
            || !name.bytes().all(is_header_name_byte_v1)
            || names
                .iter()
                .any(|existing| existing.eq_ignore_ascii_case(name))
            || value
                .bytes()
                .any(|byte| byte != b'\t' && !(b' '..=b'~').contains(&byte))
        {
            return Err(ProductClientErrorV1::IncompatibleResponse);
        }
        names.push(name);
        let value = value.trim_matches([' ', '\t']);
        if name.eq_ignore_ascii_case("transfer-encoding") {
            return Err(ProductClientErrorV1::IncompatibleResponse);
        }
        if name.eq_ignore_ascii_case("content-length") {
            content_length = Some(parse_content_length_v1(value)?);
        } else if name.eq_ignore_ascii_case("content-type") {
            content_type = Some(value);
        } else if name.eq_ignore_ascii_case(GATEWAY_CONTRACT_VERSION_HEADER_NAME_V1) {
            contract_version = Some(value);
        } else if name.eq_ignore_ascii_case(PRODUCT_SURFACE_CONTRACT_HEADER_NAME_V1) {
            product_surface_response_contract = Some(value);
        } else if name.eq_ignore_ascii_case("connection") {
            connection = Some(value);
        }
    }
    let body = &response[head_end..];
    let content_length = content_length.ok_or(ProductClientErrorV1::IncompatibleResponse)?;
    if content_length != body.len()
        || content_length > MAX_PRODUCT_RESPONSE_BODY_BYTES_V1
        || content_type != Some("application/json")
        || contract_version != Some(CONTRACT_VERSION_V1_0)
        || connection != Some("close")
    {
        return Err(ProductClientErrorV1::IncompatibleResponse);
    }
    validate_product_surface_response_contract_v1(
        command,
        product_surface_contract,
        product_surface_response_contract,
    )?;
    match status {
        200 => parse_product_success_v1(command, product_surface_contract, body),
        401 | 403 => Err(ProductClientErrorV1::Authentication),
        503 => Err(ProductClientErrorV1::TemporaryFailure),
        _ => Err(ProductClientErrorV1::IncompatibleResponse),
    }
}

#[cfg(test)]
fn validate_product_surface_response_contract_v1(
    command: ProductReadCommandV1,
    requested: Option<&str>,
    received: Option<&str>,
) -> Result<(), ProductClientErrorV1> {
    if let Some(expected) = requested
        && (command != ProductReadCommandV1::Status || received != Some(expected))
    {
        return Err(ProductClientErrorV1::ProductSurfaceContractIncompatible);
    }
    if matches!((command, requested), (ProductReadCommandV1::Status, None))
        && received
            .is_some_and(|value| value != crate::product_surface::PRODUCT_SURFACE_CONTRACT_ID_V1)
    {
        return Err(ProductClientErrorV1::ProductSurfaceContractIncompatible);
    }
    if matches!((command, requested), (ProductReadCommandV1::Health, None)) && received.is_some() {
        return Err(ProductClientErrorV1::ProductSurfaceContractIncompatible);
    }
    Ok(())
}

#[cfg(test)]
const fn is_header_name_byte_v1(byte: u8) -> bool {
    byte.is_ascii_alphanumeric()
        || matches!(
            byte,
            b'!' | b'#'..=b'\'' | b'*' | b'+' | b'-' | b'.' | b'^' | b'_' | b'`' | b'|' | b'~'
        )
}

#[cfg(test)]
fn parse_content_length_v1(value: &str) -> Result<usize, ProductClientErrorV1> {
    if value.is_empty()
        || (value.len() > 1 && value.starts_with('0'))
        || !value.bytes().all(|byte| byte.is_ascii_digit())
    {
        return Err(ProductClientErrorV1::IncompatibleResponse);
    }
    value
        .parse()
        .map_err(|_| ProductClientErrorV1::IncompatibleResponse)
}

#[cfg(test)]
fn parse_product_success_v1(
    command: ProductReadCommandV1,
    product_surface_contract: Option<&str>,
    body: &[u8],
) -> Result<ProductSemanticResultV1, ProductClientErrorV1> {
    let value = match command {
        ProductReadCommandV1::Health => {
            let health: DaemonHealthV1 = serde_json::from_slice(body)
                .map_err(|_| ProductClientErrorV1::IncompatibleResponse)?;
            if !health.is_compatible_success() {
                return Err(ProductClientErrorV1::IncompatibleResponse);
            }
            serde_json::to_value(health).map_err(|_| ProductClientErrorV1::InternalFailure)?
        }
        ProductReadCommandV1::Status => {
            let incompatible_status = if product_surface_contract.is_some() {
                ProductClientErrorV1::ProductSurfaceContractIncompatible
            } else {
                ProductClientErrorV1::IncompatibleResponse
            };
            if product_surface_contract
                == Some(crate::product_surface::PRODUCT_SURFACE_CONTRACT_ID_V2)
            {
                let status: DaemonStatusV2 = serde_json::from_slice(body)
                    .map_err(|_| ProductClientErrorV1::ProductSurfaceContractIncompatible)?;
                if !status.is_compatible_success() {
                    return Err(ProductClientErrorV1::ProductSurfaceContractIncompatible);
                }
                return serde_json::to_value(status)
                    .map_err(|_| ProductClientErrorV1::InternalFailure)
                    .and_then(|value| ProductSemanticResultV1::new(value).map_err(Into::into));
            }
            let status: DaemonStatusV1 =
                serde_json::from_slice(body).map_err(|_| incompatible_status)?;
            if !status.is_compatible_success() {
                return Err(incompatible_status);
            }
            serde_json::to_value(status).map_err(|_| ProductClientErrorV1::InternalFailure)?
        }
    };
    ProductSemanticResultV1::new(value).map_err(Into::into)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn unix_transport_is_withdrawn_before_endpoint_or_token_processing() {
        for path in ["", "relative/control.sock", "/tmp/lnsat/control.sock"] {
            assert_eq!(
                UnixSocketEndpointV1::parse(path),
                Err(ProductClientErrorV1::UnixTransportWithdrawn)
            );
        }
        assert_eq!(
            request_authenticated_product_read_v1(
                ProductReadCommandV1::Health,
                &UnixSocketEndpointV1 {
                    path: PathBuf::from("/tmp/lnsat/control.sock"),
                },
                "\u{0}",
            ),
            Err(ProductClientErrorV1::UnixTransportWithdrawn)
        );
    }

    #[test]
    fn protected_stdin_accepts_one_token_and_rejects_ambiguity() {
        for input in [
            b"opaque-token".as_slice(),
            b"opaque-token\n",
            b"opaque-token\r\n",
        ] {
            assert_eq!(
                read_session_token_stdin_v1(&mut &input[..])
                    .expect("one token must parse")
                    .as_str(),
                "opaque-token"
            );
        }
        for newline in [b"\n".as_slice(), b"\r\n"] {
            let mut input = vec![b'x'; MAX_SESSION_TOKEN_STDIN_BYTES_V1];
            input.extend_from_slice(newline);
            assert_eq!(
                read_session_token_stdin_v1(&mut input.as_slice())
                    .expect("maximum token plus one terminal newline must parse")
                    .len(),
                MAX_SESSION_TOKEN_STDIN_BYTES_V1
            );
        }
        for input in [
            b"".as_slice(),
            b"\n",
            b" token",
            b"token ",
            b"one two",
            b"one\ntwo",
            b"one\n\n",
            b"one\0two",
        ] {
            assert_eq!(
                read_session_token_stdin_v1(&mut &input[..]),
                Err(ProductClientErrorV1::SessionTokenInputInvalid)
            );
        }
        let oversized = vec![b'x'; MAX_SESSION_TOKEN_STDIN_BYTES_V1 + 1];
        assert_eq!(
            read_session_token_stdin_v1(&mut oversized.as_slice()),
            Err(ProductClientErrorV1::SessionTokenInputInvalid)
        );
    }

    #[test]
    fn explicit_status_selector_requires_exact_single_echo() {
        let status_body = include_str!("../../../fixtures/contracts/phase10-status-v1.json");
        let response = format!(
            "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: {}\r\nLNSAT-Contract-Version: lnsat.contracts.v1_0\r\nLNSAT-Product-Surface-Contract: lnsat.product_surface.v1\r\nConnection: close\r\n\r\n{status_body}",
            status_body.len()
        );
        assert!(
            parse_product_response_v1(
                ProductReadCommandV1::Status,
                Some("lnsat.product_surface.v1"),
                response.as_bytes(),
            )
            .is_ok()
        );
        assert!(
            parse_product_response_v1(ProductReadCommandV1::Status, None, response.as_bytes())
                .is_ok()
        );
        let absent = response.replace(
            "LNSAT-Product-Surface-Contract: lnsat.product_surface.v1\r\n",
            "",
        );
        assert_eq!(
            parse_product_response_v1(
                ProductReadCommandV1::Status,
                Some("lnsat.product_surface.v1"),
                absent.as_bytes(),
            ),
            Err(ProductClientErrorV1::ProductSurfaceContractIncompatible)
        );
        assert!(
            parse_product_response_v1(ProductReadCommandV1::Status, None, absent.as_bytes())
                .is_ok()
        );
        let v2_echo = response.replace(
            "LNSAT-Product-Surface-Contract: lnsat.product_surface.v1",
            "LNSAT-Product-Surface-Contract: lnsat.product_surface.v2",
        );
        assert_eq!(
            parse_product_response_v1(ProductReadCommandV1::Status, None, v2_echo.as_bytes()),
            Err(ProductClientErrorV1::ProductSurfaceContractIncompatible)
        );
        let status_v2_body = include_str!("../../../fixtures/contracts/daemon-status-v2.json");
        let v1_selector_v2_body = format!(
            "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: {}\r\nLNSAT-Contract-Version: lnsat.contracts.v1_0\r\nLNSAT-Product-Surface-Contract: lnsat.product_surface.v1\r\nConnection: close\r\n\r\n{status_v2_body}",
            status_v2_body.len()
        );
        assert_eq!(
            parse_product_response_v1(
                ProductReadCommandV1::Status,
                Some("lnsat.product_surface.v1"),
                v1_selector_v2_body.as_bytes(),
            ),
            Err(ProductClientErrorV1::ProductSurfaceContractIncompatible)
        );
        let v2_selector_v1_body = response.replace(
            "LNSAT-Product-Surface-Contract: lnsat.product_surface.v1",
            "LNSAT-Product-Surface-Contract: lnsat.product_surface.v2",
        );
        assert_eq!(
            parse_product_response_v1(
                ProductReadCommandV1::Status,
                Some("lnsat.product_surface.v2"),
                v2_selector_v1_body.as_bytes(),
            ),
            Err(ProductClientErrorV1::ProductSurfaceContractIncompatible)
        );
        let malformed = response.replace(status_body, "{").replace(
            &format!("Content-Length: {}", status_body.len()),
            "Content-Length: 1",
        );
        assert_eq!(
            parse_product_response_v1(
                ProductReadCommandV1::Status,
                Some("lnsat.product_surface.v1"),
                malformed.as_bytes(),
            ),
            Err(ProductClientErrorV1::ProductSurfaceContractIncompatible)
        );
        let denied_without_echo = "HTTP/1.1 403 Forbidden\r\nContent-Type: application/json\r\nContent-Length: 2\r\nLNSAT-Contract-Version: lnsat.contracts.v1_0\r\nConnection: close\r\n\r\n{}";
        assert_eq!(
            parse_product_response_v1(
                ProductReadCommandV1::Status,
                Some("lnsat.product_surface.v1"),
                denied_without_echo.as_bytes(),
            ),
            Err(ProductClientErrorV1::ProductSurfaceContractIncompatible)
        );
        let duplicate = response.replace(
            "Connection: close",
            "LNSAT-Product-Surface-Contract: lnsat.product_surface.v1\r\nConnection: close",
        );
        assert_eq!(
            parse_product_response_v1(
                ProductReadCommandV1::Status,
                Some("lnsat.product_surface.v1"),
                duplicate.as_bytes(),
            ),
            Err(ProductClientErrorV1::ProductSurfaceContractIncompatible)
        );
    }

    #[test]
    fn redirects_caps_timeouts_and_read_only_exit_mapping_fail_closed() {
        let redirect = concat!(
            "HTTP/1.1 302 Found\r\n",
            "Content-Type: application/json\r\n",
            "Content-Length: 0\r\n",
            "LNSAT-Contract-Version: lnsat.contracts.v1_0\r\n",
            "Connection: close\r\n\r\n"
        );
        assert_eq!(
            parse_product_response_v1(ProductReadCommandV1::Health, None, redirect.as_bytes()),
            Err(ProductClientErrorV1::IncompatibleResponse)
        );

        let mut oversized = format!(
            concat!(
                "HTTP/1.1 200 OK\r\n",
                "Content-Type: application/json\r\n",
                "Content-Length: {}\r\n",
                "LNSAT-Contract-Version: lnsat.contracts.v1_0\r\n",
                "Connection: close\r\n\r\n"
            ),
            MAX_PRODUCT_RESPONSE_BODY_BYTES_V1 + 1
        )
        .into_bytes();
        oversized.resize(
            oversized.len() + MAX_PRODUCT_RESPONSE_BODY_BYTES_V1 + 1,
            b'x',
        );
        assert_eq!(
            parse_product_response_v1(ProductReadCommandV1::Status, None, &oversized),
            Err(ProductClientErrorV1::IncompatibleResponse)
        );

        for error in [
            ProductClientErrorV1::Unavailable,
            ProductClientErrorV1::TemporaryFailure,
            ProductClientErrorV1::ServerIdentityRejected,
            ProductClientErrorV1::Authentication,
            ProductClientErrorV1::IncompatibleResponse,
        ] {
            assert_ne!(error.exit_code(), ProductExitCodeV1::OutcomeUnknown);
        }
    }
}
