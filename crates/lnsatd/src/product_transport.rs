//! Explicit server-authenticated Unix-socket transport for P10-A3 reads.

use crate::GATEWAY_CONTRACT_VERSION_HEADER_NAME_V1;
use crate::product_output::{ProductOutputErrorV1, ProductSemanticResultV1};
use crate::product_surface::{DaemonHealthV1, DaemonStatusV1, ProductExitCodeV1};
use lnsat_auth::LOCAL_SESSION_COOKIE_NAME_V1;
use lnsat_contracts::CONTRACT_VERSION_V1_0;
use std::fmt;
use std::io::{self, Read, Write};
#[cfg(any(target_os = "linux", target_os = "macos"))]
use std::net::Shutdown;
use std::path::{Path, PathBuf};
use std::time::{Duration, Instant};
use zeroize::{Zeroize, Zeroizing};

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

/// Fixed socket polling interval used while enforcing the absolute I/O deadline.
const PRODUCT_IO_POLL_TIMEOUT_V1: Duration = Duration::from_millis(50);

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

/// Parsed exact macOS/Linux Unix-socket path.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct UnixSocketEndpointV1 {
    path: PathBuf,
}

impl UnixSocketEndpointV1 {
    /// Parses one explicit absolute, bounded, normalized UTF-8 socket path.
    ///
    /// # Errors
    ///
    /// Rejects relative, oversized, non-UTF-8, dot-component, or trailing
    /// separator paths before secret input or connection.
    pub fn parse(value: impl AsRef<Path>) -> Result<Self, ProductClientErrorV1> {
        #[cfg(not(any(target_os = "linux", target_os = "macos")))]
        {
            let _ = value;
            return Err(ProductClientErrorV1::PlatformUnsupported);
        }
        #[cfg(any(target_os = "linux", target_os = "macos"))]
        let path = value.as_ref();
        #[cfg(any(target_os = "linux", target_os = "macos"))]
        if !crate::valid_control_socket_path_v1(path) {
            return Err(ProductClientErrorV1::SocketPathInvalid);
        }
        #[cfg(any(target_os = "linux", target_os = "macos"))]
        Ok(Self {
            path: path.to_path_buf(),
        })
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
    /// Local output conversion failed.
    InternalFailure,
}

impl ProductClientErrorV1 {
    /// Stable public-safe code.
    #[must_use]
    pub const fn code(self) -> &'static str {
        match self {
            Self::SocketPathInvalid => "lnsatctl.socket.path_invalid",
            Self::PlatformUnsupported => "lnsatctl.socket.unsupported",
            Self::ServerIdentityRejected => "lnsatctl.server_identity.denied",
            Self::SessionTokenInputInvalid => "lnsatctl.session_token_stdin.invalid",
            Self::Unavailable => "lnsatctl.socket.unavailable",
            Self::TemporaryFailure => "lnsatctl.socket.temporary_failure",
            Self::Authentication => "lnsatctl.authentication.denied",
            Self::IncompatibleResponse => "lnsatctl.response.incompatible",
            Self::InternalFailure => "lnsatctl.internal_failure",
        }
    }

    /// Stable exit family; read-only uncertainty never maps to outcome unknown.
    #[must_use]
    pub const fn exit_code(self) -> ProductExitCodeV1 {
        match self {
            Self::SocketPathInvalid
            | Self::PlatformUnsupported
            | Self::SessionTokenInputInvalid => ProductExitCodeV1::UsageOrConfiguration,
            Self::ServerIdentityRejected | Self::Authentication => {
                ProductExitCodeV1::Authentication
            }
            Self::Unavailable => ProductExitCodeV1::Unavailable,
            Self::TemporaryFailure => ProductExitCodeV1::TemporaryFailure,
            Self::IncompatibleResponse => ProductExitCodeV1::Conflict,
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

/// Performs one bounded authenticated read after proving local server identity.
///
/// No environment, proxy, redirect, retry, discovery, DNS, TLS, or hostname
/// behavior exists in this transport.
///
/// # Errors
///
/// Maps transport, authentication, temporary, and incompatible-response
/// failures to stable read-only exit families.
pub fn request_authenticated_product_read_v1(
    command: ProductReadCommandV1,
    endpoint: &UnixSocketEndpointV1,
    session_token: &str,
) -> Result<ProductSemanticResultV1, ProductClientErrorV1> {
    if !valid_session_token_transport_v1(session_token) {
        return Err(ProductClientErrorV1::SessionTokenInputInvalid);
    }
    #[cfg(not(any(target_os = "linux", target_os = "macos")))]
    {
        let _ = (command, endpoint);
        return Err(ProductClientErrorV1::PlatformUnsupported);
    }
    #[cfg(any(target_os = "linux", target_os = "macos"))]
    let mut stream = crate::local_unix_socket::connect_secure_unix_socket_v1(
        endpoint.path(),
        PRODUCT_CONNECT_TIMEOUT_V1,
    )
    .map_err(map_local_socket_error_v1)?;
    #[cfg(any(target_os = "linux", target_os = "macos"))]
    let io_deadline = Instant::now()
        .checked_add(PRODUCT_IO_TIMEOUT_V1)
        .ok_or(ProductClientErrorV1::TemporaryFailure)?;

    #[cfg(any(target_os = "linux", target_os = "macos"))]
    stream
        .set_write_timeout(Some(PRODUCT_IO_POLL_TIMEOUT_V1))
        .and_then(|()| stream.set_read_timeout(Some(PRODUCT_IO_POLL_TIMEOUT_V1)))
        .map_err(|error| map_io_error_v1(&error))?;
    #[cfg(any(target_os = "linux", target_os = "macos"))]
    let mut request = Zeroizing::new(format!(
        concat!(
            "GET {path} HTTP/1.1\r\n",
            "Host: {host}\r\n",
            "{version_name}: {version}\r\n",
            "Sec-Fetch-Site: same-origin\r\n",
            "Cookie: {cookie_name}={session_token}\r\n",
            "Connection: close\r\n\r\n"
        ),
        path = command.path(),
        host = crate::local_unix_socket::LOCAL_UNIX_SOCKET_HOST_V1,
        version_name = GATEWAY_CONTRACT_VERSION_HEADER_NAME_V1,
        version = CONTRACT_VERSION_V1_0,
        cookie_name = LOCAL_SESSION_COOKIE_NAME_V1,
        session_token = session_token,
    ));
    #[cfg(any(target_os = "linux", target_os = "macos"))]
    let write_result = write_all_until_v1(&mut stream, request.as_bytes(), io_deadline);
    #[cfg(any(target_os = "linux", target_os = "macos"))]
    request.zeroize();
    #[cfg(any(target_os = "linux", target_os = "macos"))]
    write_result?;
    #[cfg(any(target_os = "linux", target_os = "macos"))]
    stream
        .shutdown(Shutdown::Write)
        .map_err(|error| map_io_error_v1(&error))?;

    #[cfg(any(target_os = "linux", target_os = "macos"))]
    let response_limit = MAX_PRODUCT_RESPONSE_HEAD_BYTES_V1
        .checked_add(MAX_PRODUCT_RESPONSE_BODY_BYTES_V1)
        .and_then(|value| value.checked_add(1))
        .ok_or(ProductClientErrorV1::InternalFailure)?;
    #[cfg(any(target_os = "linux", target_os = "macos"))]
    let mut response = Vec::with_capacity(4096);
    #[cfg(any(target_os = "linux", target_os = "macos"))]
    let mut buf = [0u8; 8192];
    #[cfg(any(target_os = "linux", target_os = "macos"))]
    loop {
        if Instant::now() >= io_deadline {
            return Err(ProductClientErrorV1::TemporaryFailure);
        }
        match stream.read(&mut buf) {
            Ok(0) => break,
            Ok(n) => {
                response.extend_from_slice(&buf[..n]);
                if response.len() >= response_limit {
                    return Err(ProductClientErrorV1::IncompatibleResponse);
                }
            }
            Err(ref error)
                if matches!(
                    error.kind(),
                    io::ErrorKind::TimedOut | io::ErrorKind::WouldBlock
                ) => {}
            Err(e) => return Err(map_io_error_v1(&e)),
        }
    }
    #[cfg(any(target_os = "linux", target_os = "macos"))]
    parse_product_response_v1(command, &response)
}

fn valid_session_token_transport_v1(value: &str) -> bool {
    !value.is_empty()
        && value.len() <= MAX_SESSION_TOKEN_STDIN_BYTES_V1
        && value.bytes().all(|byte| {
            (b'!'..=b'~').contains(&byte) && !matches!(byte, b'"' | b',' | b';' | b'\\')
        })
}

fn write_all_until_v1(
    stream: &mut impl Write,
    mut bytes: &[u8],
    deadline: Instant,
) -> Result<(), ProductClientErrorV1> {
    while !bytes.is_empty() {
        if Instant::now() >= deadline {
            return Err(ProductClientErrorV1::TemporaryFailure);
        }
        match stream.write(bytes) {
            Ok(0) => return Err(ProductClientErrorV1::Unavailable),
            Ok(written) => bytes = &bytes[written..],
            Err(ref error)
                if matches!(
                    error.kind(),
                    io::ErrorKind::TimedOut | io::ErrorKind::WouldBlock
                ) => {}
            Err(error) => return Err(map_io_error_v1(&error)),
        }
    }
    loop {
        if Instant::now() >= deadline {
            return Err(ProductClientErrorV1::TemporaryFailure);
        }
        match stream.flush() {
            Ok(()) => return Ok(()),
            Err(ref error)
                if matches!(
                    error.kind(),
                    io::ErrorKind::TimedOut | io::ErrorKind::WouldBlock
                ) => {}
            Err(error) => return Err(map_io_error_v1(&error)),
        }
    }
}

#[cfg(any(target_os = "linux", target_os = "macos"))]
fn map_local_socket_error_v1(
    error: crate::local_unix_socket::LocalUnixSocketErrorV1,
) -> ProductClientErrorV1 {
    match error {
        crate::local_unix_socket::LocalUnixSocketErrorV1::PathInvalid => {
            ProductClientErrorV1::SocketPathInvalid
        }
        crate::local_unix_socket::LocalUnixSocketErrorV1::Unavailable => {
            ProductClientErrorV1::Unavailable
        }
        crate::local_unix_socket::LocalUnixSocketErrorV1::TemporaryFailure => {
            ProductClientErrorV1::TemporaryFailure
        }
        crate::local_unix_socket::LocalUnixSocketErrorV1::IdentityRejected => {
            ProductClientErrorV1::ServerIdentityRejected
        }
    }
}

fn map_io_error_v1(error: &io::Error) -> ProductClientErrorV1 {
    match error.kind() {
        io::ErrorKind::TimedOut | io::ErrorKind::WouldBlock => {
            ProductClientErrorV1::TemporaryFailure
        }
        _ => ProductClientErrorV1::Unavailable,
    }
}

fn parse_product_response_v1(
    command: ProductReadCommandV1,
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
    let mut connection = None;
    for (index, line) in lines.enumerate() {
        let (name, value) = line
            .split_once(':')
            .ok_or(ProductClientErrorV1::IncompatibleResponse)?;
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
    match status {
        200 => parse_product_success_v1(command, body),
        401 | 403 => Err(ProductClientErrorV1::Authentication),
        503 => Err(ProductClientErrorV1::TemporaryFailure),
        _ => Err(ProductClientErrorV1::IncompatibleResponse),
    }
}

const fn is_header_name_byte_v1(byte: u8) -> bool {
    byte.is_ascii_alphanumeric()
        || matches!(
            byte,
            b'!' | b'#'..=b'\'' | b'*' | b'+' | b'-' | b'.' | b'^' | b'_' | b'`' | b'|' | b'~'
        )
}

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

fn parse_product_success_v1(
    command: ProductReadCommandV1,
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
            let status: DaemonStatusV1 = serde_json::from_slice(body)
                .map_err(|_| ProductClientErrorV1::IncompatibleResponse)?;
            if !status.is_compatible_success() {
                return Err(ProductClientErrorV1::IncompatibleResponse);
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
    fn socket_parser_accepts_only_exact_absolute_paths() {
        assert_eq!(
            UnixSocketEndpointV1::parse("/tmp/lnsat/control.sock")
                .expect("absolute socket path must parse")
                .path(),
            Path::new("/tmp/lnsat/control.sock")
        );
        for invalid in [
            "",
            "relative/control.sock",
            "/tmp/./control.sock",
            "/tmp/../control.sock",
            "/tmp/lnsat/",
        ] {
            assert_eq!(
                UnixSocketEndpointV1::parse(invalid),
                Err(ProductClientErrorV1::SocketPathInvalid),
                "unexpected accepted socket path: {invalid}"
            );
        }
        let oversized = format!("/{}", "x".repeat(crate::MAX_CONTROL_SOCKET_PATH_BYTES_V1));
        assert_eq!(
            UnixSocketEndpointV1::parse(oversized),
            Err(ProductClientErrorV1::SocketPathInvalid)
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
        for invalid in ["", "two words", "line\r\nbreak", "cookie;split", "quote\""] {
            assert!(!valid_session_token_transport_v1(invalid));
        }
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
            parse_product_response_v1(ProductReadCommandV1::Health, redirect.as_bytes()),
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
            parse_product_response_v1(ProductReadCommandV1::Status, &oversized),
            Err(ProductClientErrorV1::IncompatibleResponse)
        );

        assert_eq!(
            map_io_error_v1(&io::Error::from(io::ErrorKind::TimedOut)),
            ProductClientErrorV1::TemporaryFailure
        );
        assert_eq!(
            map_io_error_v1(&io::Error::from(io::ErrorKind::ConnectionRefused)),
            ProductClientErrorV1::Unavailable
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
