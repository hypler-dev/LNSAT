#![cfg(any(target_os = "linux", target_os = "macos"))]
#![forbid(unsafe_code)]

use lnsat_auth::LOCAL_SESSION_COOKIE_NAME_V1;
use lnsat_contracts::CONTRACT_VERSION_V1_0;
use lnsat_store::{LocalOwnerBootstrapInputV1, SqliteStore};
use lnsatd::product_output::{
    ProductOutputFormatV1, ProductSemanticResultV1, render_product_result_v1,
};
use lnsatd::product_transport::PRODUCT_IO_TIMEOUT_V1;
use lnsatd::{
    DaemonConfigV1, DaemonErrorV1, DaemonServerV1, DaemonShutdownV1,
    GATEWAY_CONTRACT_VERSION_HEADER_NAME_V1, LocalAuthenticationLimiterV1,
    LocalBrowserSessionIssueRequestV1, issue_local_browser_session_v1,
};
use serde_json::Value;
use std::fs;
use std::io::{self, Read, Write};
use std::net::{Ipv4Addr, Shutdown, SocketAddr, TcpListener};
use std::os::unix::fs::{DirBuilderExt, FileTypeExt, PermissionsExt, symlink};
use std::os::unix::net::{UnixListener, UnixStream};
use std::path::{Path, PathBuf};
use std::process::{Command, Output, Stdio};
use std::sync::{Barrier, mpsc};
use std::thread;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

#[test]
fn test_directory_retries_collision_without_touching_occupied_candidate() {
    let root = TestDirectory::new("fixture-collision");
    let occupied = root.path.join("occupied");
    fs::create_dir(&occupied).expect("occupied directory must create");
    let sentinel = occupied.join("sentinel");
    fs::write(&sentinel, b"preserve occupied candidate").expect("sentinel must write");
    fs::set_permissions(&occupied, fs::Permissions::from_mode(0o750))
        .expect("occupied permissions must configure");
    let fresh = root.path.join("fresh");
    let mut attempts = Vec::new();
    let directory = TestDirectory::create_with_candidates(|attempt| {
        attempts.push(attempt);
        match attempt {
            0 => occupied.clone(),
            1 => fresh.clone(),
            _ => panic!("second candidate must succeed"),
        }
    })
    .expect("fresh candidate must create");

    assert_eq!(attempts, vec![0, 1]);
    assert_eq!(directory.path, fresh);
    assert_eq!(
        fs::symlink_metadata(&fresh).unwrap().permissions().mode() & 0o7777,
        0o700
    );
    drop(directory);
    assert!(
        !fresh.exists(),
        "only the owned fresh directory must be removed"
    );
    assert_eq!(fs::read(&sentinel).unwrap(), b"preserve occupied candidate");
    assert_eq!(
        fs::symlink_metadata(&occupied)
            .unwrap()
            .permissions()
            .mode()
            & 0o7777,
        0o750
    );
}

#[test]
fn test_directory_collision_budget_preserves_occupied_candidate() {
    let occupied = TestDirectory::new("fixture-exhausted");
    let sentinel = occupied.path.join("sentinel");
    fs::write(&sentinel, b"preserve exhausted candidate").expect("sentinel must write");
    let mut attempts = 0;
    let error = TestDirectory::create_with_candidates(|_| {
        attempts += 1;
        occupied.path.clone()
    })
    .err()
    .expect("occupied candidates must exhaust the bounded budget");

    assert_eq!(error.kind(), io::ErrorKind::AlreadyExists);
    assert_eq!(attempts, TestDirectory::MAX_CREATION_ATTEMPTS);
    assert_eq!(
        fs::read(&sentinel).unwrap(),
        b"preserve exhausted candidate"
    );
    assert_eq!(
        fs::symlink_metadata(&occupied.path)
            .unwrap()
            .permissions()
            .mode()
            & 0o7777,
        0o700
    );
}

#[test]
fn test_directory_stops_on_non_collision_error() {
    let root = TestDirectory::new("fixture-missing-parent");
    let missing = root.path.join("missing");
    let mut attempts = 0;
    let error = TestDirectory::create_with_candidates(|_| {
        attempts += 1;
        missing.join("candidate")
    })
    .err()
    .expect("missing parent must fail without a collision retry");

    assert_eq!(error.kind(), io::ErrorKind::NotFound);
    assert_eq!(attempts, 1);
    assert!(!missing.exists());
}

#[test]
fn test_directory_parallel_collisions_allocate_distinct_private_directories() {
    let root = TestDirectory::new("fixture-parallel");
    let barrier = Barrier::new(3);
    let directories = thread::scope(|scope| {
        let handles: Vec<_> = (0..3)
            .map(|_| {
                scope.spawn(|| {
                    barrier.wait();
                    TestDirectory::create_with_candidates(|attempt| {
                        root.path.join(format!("candidate-{attempt}"))
                    })
                    .expect("parallel allocation must find a fresh candidate")
                })
            })
            .collect();
        handles
            .into_iter()
            .map(|handle| handle.join().expect("allocation thread must join"))
            .collect::<Vec<_>>()
    });
    let mut paths: Vec<_> = directories
        .iter()
        .map(|directory| directory.path.clone())
        .collect();
    paths.sort();
    paths.dedup();
    assert_eq!(paths.len(), 3);
    for path in &paths {
        assert_eq!(
            fs::symlink_metadata(path).unwrap().permissions().mode() & 0o7777,
            0o700
        );
    }
    drop(directories);
    assert_eq!(fs::read_dir(&root.path).unwrap().count(), 0);
}

#[test]
fn socket_parent_mode_0700_and_socket_mode_0600_at_bind() {
    let daemon = TestDaemon::start();
    let socket_meta = fs::symlink_metadata(&daemon.socket_path).expect("socket must exist");
    assert!(socket_meta.file_type().is_socket());
    assert_eq!(socket_meta.permissions().mode() & 0o7777, 0o600);
    let parent = daemon
        .socket_path
        .parent()
        .expect("socket must have parent");
    let parent_meta = fs::symlink_metadata(parent).expect("parent must exist");
    assert_eq!(parent_meta.permissions().mode() & 0o7777, 0o700);
    daemon.stop();
}

#[test]
fn bind_rejects_occupied_socket_without_unlinking_it() {
    let directory = TestDirectory::new("occupied-socket");
    let socket_path = directory.path.join("control.sock");
    let occupied = UnixListener::bind(&socket_path).expect("occupied socket must bind");
    fs::set_permissions(&socket_path, fs::Permissions::from_mode(0o600))
        .expect("occupied socket chmod must succeed");
    let config = DaemonConfigV1::new(
        directory.path.join("authority.sqlite3"),
        available_tcp_address(),
    )
    .expect("config must validate")
    .with_control_socket_path(&socket_path)
    .expect("control socket path must validate");

    let error = DaemonServerV1::bind(&config)
        .err()
        .expect("occupied socket must fail closed");
    assert_eq!(error, DaemonErrorV1::ControlSocketIdentityRejected);
    assert!(
        socket_path.exists(),
        "occupied socket must remain untouched"
    );
    drop(occupied);
}

#[test]
fn cleanup_never_unlinks_replacement_socket_identity() {
    let directory = TestDirectory::new("replacement-socket");
    let socket_path = directory.path.join("control.sock");
    let config = DaemonConfigV1::new(
        directory.path.join("authority.sqlite3"),
        available_tcp_address(),
    )
    .expect("config must validate")
    .with_control_socket_path(&socket_path)
    .expect("control socket path must validate");
    let server = DaemonServerV1::bind(&config).expect("daemon must bind");

    fs::remove_file(&socket_path).expect("bound pathname must unlink");
    let replacement = UnixListener::bind(&socket_path).expect("replacement socket must bind");
    fs::set_permissions(&socket_path, fs::Permissions::from_mode(0o600))
        .expect("replacement socket chmod must succeed");
    drop(server);

    assert!(
        socket_path.exists(),
        "cleanup must preserve different socket identity"
    );
    drop(replacement);
}

#[test]
fn authenticated_health_and_status_match_exact_output_contracts_over_unix_socket() {
    let daemon = TestDaemon::start();
    for (command, fixture_source) in [
        (
            "health",
            include_str!("../../../fixtures/contracts/phase10-health-v1.json"),
        ),
        (
            "status",
            include_str!("../../../fixtures/contracts/phase10-status-v1.json"),
        ),
    ] {
        let fixture: Value = serde_json::from_str(fixture_source).expect("fixture must parse");
        let semantic =
            ProductSemanticResultV1::new(fixture.clone()).expect("fixture must be one object");
        for format in [
            ProductOutputFormatV1::Text,
            ProductOutputFormatV1::Json,
            ProductOutputFormatV1::Jsonl,
            ProductOutputFormatV1::Yaml,
        ] {
            let output = run_cli(
                daemon.socket_path.to_str().unwrap(),
                command,
                Some(format.as_str()),
                daemon.session_token.as_bytes(),
            );
            assert!(
                output.status.success(),
                "command={command} format={format:?} stderr={}",
                String::from_utf8_lossy(&output.stderr)
            );
            assert!(
                output.stderr.is_empty(),
                "stderr={}",
                String::from_utf8_lossy(&output.stderr)
            );
            assert_eq!(
                String::from_utf8(output.stdout).expect("stdout must be UTF-8"),
                render_product_result_v1(&semantic, format).expect("fixture must render")
            );
        }
    }

    let default_json = run_cli(
        daemon.socket_path.to_str().unwrap(),
        "health",
        None,
        daemon.session_token.as_bytes(),
    );
    let explicit_json = run_cli(
        daemon.socket_path.to_str().unwrap(),
        "health",
        Some("json"),
        daemon.session_token.as_bytes(),
    );
    assert!(default_json.status.success());
    assert_eq!(default_json.stdout, explicit_json.stdout);

    let denied = run_cli(
        daemon.socket_path.to_str().unwrap(),
        "status",
        None,
        b"malformed-opaque-token",
    );
    assert_eq!(denied.status.code(), Some(3));
    assert!(denied.stdout.is_empty());
    let denial: Value = serde_json::from_slice(&denied.stderr).expect("denial must be JSON");
    assert_eq!(denial["error"]["code"], "lnsatctl.authentication.denied");
    assert_eq!(denial["exit_code_family"], "authentication");
    assert_eq!(denial["side_effects"], serde_json::json!([]));
    assert!(!String::from_utf8_lossy(&denied.stderr).contains("malformed-opaque-token"));

    daemon.stop();
}

#[test]
fn unix_control_get_and_head_have_equal_auth_and_bodyless_head() {
    let daemon = TestDaemon::start();
    for path in ["/v1/health", "/v1/status"] {
        let get = request_control_socket(&daemon, "GET", path);
        assert!(get.starts_with("HTTP/1.1 200 OK\r\n"));
        let (get_head, get_body) = get
            .split_once("\r\n\r\n")
            .expect("GET response must contain header boundary");
        serde_json::from_str::<Value>(get_body).expect("GET body must be JSON");

        let head = request_control_socket(&daemon, "HEAD", path);
        assert!(head.starts_with("HTTP/1.1 200 OK\r\n"));
        let (head_head, head_body) = head
            .split_once("\r\n\r\n")
            .expect("HEAD response must contain header boundary");
        assert!(head_body.is_empty());
        assert_eq!(content_length(get_head), content_length(head_head));
    }
    daemon.stop();
}

#[test]
fn removed_endpoint_and_invalid_stdin_fail_before_any_connection() {
    let probe_dir = TestDirectory::new("no-connect-probe");
    let probe_path = probe_dir.path.join("probe.sock");
    let probe = UnixListener::bind(&probe_path).expect("probe must bind");
    probe
        .set_nonblocking(true)
        .expect("probe must be nonblocking");

    let old_flag = run_cli_with_args(
        &[
            "health",
            "--endpoint",
            probe_path.to_str().unwrap(),
            "--session-token-stdin",
        ],
        b"opaque-token",
    );
    assert_eq!(old_flag.status.code(), Some(2));
    assert_no_unix_connection(&probe);

    let misplaced = run_cli(
        probe_path.to_str().unwrap(),
        "health",
        Some("text extra"),
        b"opaque-token",
    );
    assert_eq!(misplaced.status.code(), Some(2));
    assert_no_unix_connection(&probe);

    let empty = run_cli(probe_path.to_str().unwrap(), "health", None, b"");
    assert_eq!(empty.status.code(), Some(2));
    let error: Value = serde_json::from_slice(&empty.stderr).expect("error must be JSON");
    assert_eq!(
        error["error"]["code"],
        "lnsatctl.session_token_stdin.invalid"
    );
    assert_no_unix_connection(&probe);

    let oversized = vec![b'x'; 513];
    let oversized = run_cli(probe_path.to_str().unwrap(), "status", None, &oversized);
    assert_eq!(oversized.status.code(), Some(2));
    assert_no_unix_connection(&probe);
}

#[test]
fn insecure_parent_or_socket_mode_rejects_before_bearer_write() {
    let parent_dir = TestDirectory::new("insecure-parent");
    let parent_path = parent_dir.path.join("server.sock");
    let parent_listener = UnixListener::bind(&parent_path).expect("socket must bind");
    fs::set_permissions(&parent_path, fs::Permissions::from_mode(0o600))
        .expect("socket chmod must succeed");
    fs::set_permissions(&parent_dir.path, fs::Permissions::from_mode(0o755))
        .expect("parent chmod must succeed");
    parent_listener
        .set_nonblocking(true)
        .expect("listener must become nonblocking");
    assert_identity_denied_without_connection(&parent_listener, &parent_path);

    let socket_dir = TestDirectory::new("insecure-socket");
    let socket_path = socket_dir.path.join("server.sock");
    let socket_listener = UnixListener::bind(&socket_path).expect("socket must bind");
    fs::set_permissions(&socket_path, fs::Permissions::from_mode(0o644))
        .expect("socket chmod must succeed");
    socket_listener
        .set_nonblocking(true)
        .expect("listener must become nonblocking");
    assert_identity_denied_without_connection(&socket_listener, &socket_path);
}

#[test]
fn ancestor_symlink_traversal_rejects_bind_and_client_before_bearer_write() {
    let directory = TestDirectory::new("ancestor-symlink");
    let real_root = directory.path.join("real");
    let real_parent = real_root.join("private");
    fs::create_dir(&real_root).expect("real root must create");
    fs::create_dir(&real_parent).expect("real private parent must create");
    fs::set_permissions(&real_parent, fs::Permissions::from_mode(0o700))
        .expect("real private parent chmod must succeed");
    let alias = directory.path.join("alias");
    symlink(&real_root, &alias).expect("ancestor symlink must create");

    let bind_path = alias.join("private/daemon.sock");
    let config = DaemonConfigV1::new(
        directory.path.join("authority.sqlite3"),
        available_tcp_address(),
    )
    .expect("config must validate")
    .with_control_socket_path(&bind_path)
    .expect("socket path syntax must validate");
    assert_eq!(
        DaemonServerV1::bind(&config)
            .err()
            .expect("ancestor symlink bind must fail closed"),
        DaemonErrorV1::ControlSocketIdentityRejected
    );
    assert!(!bind_path.exists(), "rejected bind must create no socket");

    let client_path = alias.join("private/server.sock");
    let listener = UnixListener::bind(&client_path).expect("probe socket must bind");
    fs::set_permissions(&client_path, fs::Permissions::from_mode(0o600))
        .expect("probe socket chmod must succeed");
    listener
        .set_nonblocking(true)
        .expect("probe listener must become nonblocking");
    assert_identity_denied_without_connection(&listener, &client_path);
}

#[test]
fn unavailable_socket_path_produces_bounded_read_only_exit() {
    let dir = TestDirectory::new("unavailable");
    let nonexistent = dir.path.join("nonexistent.sock");
    let output = run_cli(
        nonexistent.to_str().unwrap(),
        "health",
        None,
        b"opaque-token",
    );
    assert_eq!(output.status.code(), Some(4));
    assert_ne!(output.status.code(), Some(7));
}

#[test]
fn timeout_on_stalled_peer_is_bounded_temporary_failure() {
    let dir = TestDirectory::new("timeout");
    let socket_path = dir.path.join("stall.sock");
    let listener = UnixListener::bind(&socket_path).expect("socket must bind");
    fs::set_permissions(&socket_path, fs::Permissions::from_mode(0o600))
        .expect("socket chmod must succeed");

    let server = thread::spawn(move || {
        let (_stream, _) = listener.accept().expect("connection must arrive");
        thread::sleep(PRODUCT_IO_TIMEOUT_V1 + Duration::from_millis(250));
    });

    let output = run_cli(
        socket_path.to_str().unwrap(),
        "status",
        None,
        b"opaque-token",
    );
    assert_eq!(output.status.code(), Some(6));
    assert_ne!(output.status.code(), Some(7));
    server.join().expect("server must join");
}

#[test]
fn drip_feed_peer_cannot_extend_absolute_deadline() {
    let dir = TestDirectory::new("drip");
    let socket_path = dir.path.join("drip.sock");
    let listener = UnixListener::bind(&socket_path).expect("socket must bind");
    fs::set_permissions(&socket_path, fs::Permissions::from_mode(0o600))
        .expect("socket chmod must succeed");

    let (stop_sender, stop_receiver) = mpsc::channel();
    let wall_start = Instant::now();
    let server = thread::spawn(move || {
        let (mut stream, _) = listener.accept().expect("connection must arrive");
        let mut drain = [0u8; 4096];
        while Read::read(&mut stream, &mut drain).is_ok_and(|n| n > 0) {}
        loop {
            if stop_receiver
                .recv_timeout(Duration::from_millis(500))
                .is_ok()
            {
                break;
            }
            if stream
                .write_all(b"x")
                .and_then(|()| stream.flush())
                .is_err()
            {
                break;
            }
        }
    });
    let output = run_cli(
        socket_path.to_str().unwrap(),
        "health",
        None,
        b"opaque-token",
    );
    let elapsed = wall_start.elapsed();
    let _ = stop_sender.send(());
    assert_eq!(output.status.code(), Some(6));
    assert!(
        elapsed < PRODUCT_IO_TIMEOUT_V1 + Duration::from_secs(2),
        "drip-feed must be bounded by absolute deadline, took {elapsed:?}"
    );
    server.join().expect("drip server must join");
}

fn run_cli(socket_path: &str, command: &str, output: Option<&str>, stdin: &[u8]) -> Output {
    let mut args: Vec<&str> = vec![command, "--socket", socket_path, "--session-token-stdin"];
    if let Some(output) = output {
        if let Some((format, extra)) = output.split_once(' ') {
            args.extend_from_slice(&["--output", format, extra]);
        } else {
            args.push("--output");
            args.push(output);
        }
    }
    spawn_and_collect(&args, stdin)
}

fn run_cli_with_args(args: &[&str], stdin: &[u8]) -> Output {
    spawn_and_collect(args, stdin)
}

fn spawn_and_collect(args: &[&str], stdin: &[u8]) -> Output {
    let mut child = Command::new(env!("CARGO_BIN_EXE_lnsatctl"))
        .args(args)
        .env("HTTP_PROXY", "http://203.0.113.1:9")
        .env("HTTPS_PROXY", "http://203.0.113.1:9")
        .env("ALL_PROXY", "http://203.0.113.1:9")
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .expect("lnsatctl must spawn");
    let mut child_stdin = child.stdin.take().expect("stdin pipe must exist");
    let _ = child_stdin.write_all(stdin);
    drop(child_stdin);
    child.wait_with_output().expect("lnsatctl must finish")
}

fn assert_no_unix_connection(listener: &UnixListener) {
    assert!(matches!(
        listener.accept(),
        Err(error) if error.kind() == io::ErrorKind::WouldBlock
    ));
}

fn assert_identity_denied_without_connection(listener: &UnixListener, socket_path: &Path) {
    let token = b"bearer-must-not-reach-rejected-server";
    let output = run_cli(socket_path.to_str().unwrap(), "health", None, token);
    assert_eq!(output.status.code(), Some(3));
    assert!(output.stdout.is_empty());
    let error: Value = serde_json::from_slice(&output.stderr).expect("error must be JSON");
    assert_eq!(error["error"]["code"], "lnsatctl.server_identity.denied");
    assert!(!String::from_utf8_lossy(&output.stderr).contains("bearer-must-not"));
    assert_no_unix_connection(listener);
}

fn request_control_socket(daemon: &TestDaemon, method: &str, path: &str) -> String {
    let mut stream = UnixStream::connect(&daemon.socket_path).expect("control socket must connect");
    stream
        .set_read_timeout(Some(Duration::from_secs(2)))
        .expect("read timeout must configure");
    stream
        .set_write_timeout(Some(Duration::from_secs(2)))
        .expect("write timeout must configure");
    let request = format!(
        "{method} {path} HTTP/1.1\r\nHost: lnsatd\r\n{GATEWAY_CONTRACT_VERSION_HEADER_NAME_V1}: {CONTRACT_VERSION_V1_0}\r\nSec-Fetch-Site: same-origin\r\nCookie: {LOCAL_SESSION_COOKIE_NAME_V1}={}\r\nConnection: close\r\n\r\n",
        daemon.session_token
    );
    stream
        .write_all(request.as_bytes())
        .expect("control request must write");
    stream
        .shutdown(Shutdown::Write)
        .expect("control request write side must close");
    let mut response = String::new();
    stream
        .read_to_string(&mut response)
        .expect("control response must read");
    response
}

fn content_length(head: &str) -> &str {
    head.lines()
        .find_map(|line| line.strip_prefix("Content-Length: "))
        .expect("content length must exist")
}

struct TestDaemon {
    _directory: TestDirectory,
    socket_path: PathBuf,
    session_token: String,
    shutdown: DaemonShutdownV1,
    thread: Option<thread::JoinHandle<Result<(), DaemonErrorV1>>>,
}

impl TestDaemon {
    fn start() -> Self {
        let directory = TestDirectory::new("status-health-cli");
        let database_path = directory.path.join("authority.sqlite3");
        let issued = {
            let mut store = SqliteStore::open(&database_path).expect("store must open");
            store
                .bootstrap_local_owner_v1(&LocalOwnerBootstrapInputV1 {
                    identity_ref: "identity:human:owner",
                    display_name: "Local Owner",
                    password: "correct horse battery staple",
                    created_at: "2026-01-01T00:00:00Z",
                })
                .expect("owner must bootstrap");
            issue_local_browser_session_v1(
                &mut store,
                &LocalAuthenticationLimiterV1::new(),
                &LocalBrowserSessionIssueRequestV1 {
                    identity_ref: "identity:human:owner",
                    password: "correct horse battery staple",
                    lifetime_seconds: 300,
                },
            )
            .expect("current owner session must issue")
        };
        let session_cookie = issued.cookie_headers().session();
        let session_token = session_cookie
            .strip_prefix(&format!("{LOCAL_SESSION_COOKIE_NAME_V1}="))
            .and_then(|value| value.split_once(';').map(|(token, _)| token))
            .expect("session cookie must contain token")
            .to_owned();
        let socket_path = directory.path.join("control.sock");
        let tcp_address = available_tcp_address();
        let config = DaemonConfigV1::new(&database_path, tcp_address)
            .expect("config must validate")
            .with_control_socket_path(&socket_path)
            .expect("control socket path must validate");
        let server = DaemonServerV1::bind(&config).expect("daemon must bind");
        let shutdown = server.shutdown_handle();
        let thread = thread::spawn(move || server.serve());
        Self {
            _directory: directory,
            socket_path,
            session_token,
            shutdown,
            thread: Some(thread),
        }
    }

    fn stop(mut self) {
        let socket_path = self.socket_path.clone();
        self.shutdown.request_shutdown();
        self.thread
            .take()
            .expect("daemon thread must exist")
            .join()
            .expect("daemon thread must join")
            .expect("daemon must stop cleanly");
        assert!(
            !socket_path.exists(),
            "daemon shutdown must remove exact control socket"
        );
    }
}

impl Drop for TestDaemon {
    fn drop(&mut self) {
        self.shutdown.request_shutdown();
        if let Some(thread) = self.thread.take() {
            let _ = thread.join();
        }
    }
}

fn available_tcp_address() -> SocketAddr {
    let probe = TcpListener::bind((Ipv4Addr::LOCALHOST, 0)).expect("loopback probe must bind");
    probe.local_addr().expect("probe address must exist")
}

struct TestDirectory {
    path: PathBuf,
}

impl TestDirectory {
    const MAX_CREATION_ATTEMPTS: usize = 32;

    fn new(label: &str) -> Self {
        let nonce = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system time must follow epoch")
            .as_nanos();
        let temp_root = fs::canonicalize("/tmp").expect("temporary root must canonicalize");
        Self::create_with_candidates(|attempt| {
            temp_root.join(format!(
                "lnsat-{label}-{}-{nonce}-{attempt}",
                std::process::id()
            ))
        })
        .expect("test directory must be created")
    }

    fn create_with_candidates(mut candidate: impl FnMut(usize) -> PathBuf) -> io::Result<Self> {
        for attempt in 0..Self::MAX_CREATION_ATTEMPTS {
            let path = candidate(attempt);
            match fs::DirBuilder::new().mode(0o700).create(&path) {
                Ok(()) => {
                    let directory = Self { path };
                    fs::set_permissions(&directory.path, fs::Permissions::from_mode(0o700))?;
                    return Ok(directory);
                }
                Err(error) if error.kind() == io::ErrorKind::AlreadyExists => {}
                Err(error) => return Err(error),
            }
        }
        Err(io::Error::new(
            io::ErrorKind::AlreadyExists,
            "test directory collision budget exhausted",
        ))
    }
}

impl Drop for TestDirectory {
    fn drop(&mut self) {
        let _ = fs::remove_dir_all(&self.path);
    }
}
