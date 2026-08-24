#![forbid(unsafe_code)]

use lnsat_auth::LOCAL_SESSION_COOKIE_NAME_V1;
use lnsat_store::{LocalOwnerBootstrapInputV1, SqliteStore};
use lnsatd::product_output::{
    ProductOutputFormatV1, ProductSemanticResultV1, render_product_result_v1,
};
use lnsatd::product_transport::PRODUCT_IO_TIMEOUT_V1;
use lnsatd::{
    DaemonConfigV1, DaemonErrorV1, DaemonServerV1, DaemonShutdownV1, LocalAuthenticationLimiterV1,
    LocalBrowserSessionIssueRequestV1, issue_local_browser_session_v1,
};
use serde_json::Value;
use std::fs;
use std::io::{self, Read, Write};
use std::net::{IpAddr, Ipv4Addr, Ipv6Addr, SocketAddr, TcpListener};
use std::path::PathBuf;
use std::process::{Command, Output, Stdio};
use std::sync::mpsc;
use std::thread;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

#[test]
fn lnsatctl_reads_ipv4_and_ipv6_with_exact_output_contracts() {
    for ip in [
        IpAddr::V4(Ipv4Addr::LOCALHOST),
        IpAddr::V6(Ipv6Addr::LOCALHOST),
    ] {
        let daemon = TestDaemon::start(ip);
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
                    daemon.endpoint(),
                    command,
                    Some(format.as_str()),
                    daemon.session_token.as_bytes(),
                );
                assert!(
                    output.status.success(),
                    "ip={ip:?} command={command} format={format:?} stderr={}",
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
            daemon.endpoint(),
            "health",
            None,
            daemon.session_token.as_bytes(),
        );
        let explicit_json = run_cli(
            daemon.endpoint(),
            "health",
            Some("json"),
            daemon.session_token.as_bytes(),
        );
        assert!(default_json.status.success());
        assert_eq!(default_json.stdout, explicit_json.stdout);

        let denied = run_cli(daemon.endpoint(), "status", None, b"malformed-opaque-token");
        assert_eq!(denied.status.code(), Some(3));
        assert!(denied.stdout.is_empty());
        let denial: Value = serde_json::from_slice(&denied.stderr).expect("denial must be JSON");
        assert_eq!(denial["error"]["code"], "lnsatctl.authentication.denied");
        assert_eq!(denial["exit_code_family"], "authentication");
        assert_eq!(denial["side_effects"], serde_json::json!([]));
        assert!(!String::from_utf8_lossy(&denied.stderr).contains("malformed-opaque-token"));

        daemon.stop();
    }
}

#[test]
fn invalid_arguments_and_stdin_fail_before_any_connection() {
    let listener = TcpListener::bind((Ipv4Addr::LOCALHOST, 0)).expect("probe listener must bind");
    listener
        .set_nonblocking(true)
        .expect("probe listener must become nonblocking");
    let endpoint = format!(
        "http://{}",
        listener.local_addr().expect("probe address must exist")
    );

    let misplaced = run_cli(&endpoint, "health", Some("text extra"), b"opaque-token");
    assert_eq!(misplaced.status.code(), Some(2));
    assert_no_connection(&listener);

    let empty = run_cli(&endpoint, "health", None, b"");
    assert_eq!(empty.status.code(), Some(2));
    let error: Value = serde_json::from_slice(&empty.stderr).expect("error must be JSON");
    assert_eq!(
        error["error"]["code"],
        "lnsatctl.session_token_stdin.invalid"
    );
    assert_no_connection(&listener);

    let oversized = vec![b'x'; 513];
    let oversized = run_cli(&endpoint, "status", None, &oversized);
    assert_eq!(oversized.status.code(), Some(2));
    assert_no_connection(&listener);
}

#[test]
fn unavailable_and_timeout_are_bounded_read_only_exit_families() {
    let closed = TcpListener::bind((Ipv4Addr::LOCALHOST, 0)).expect("probe must bind");
    let closed_endpoint = format!(
        "http://{}",
        closed.local_addr().expect("address must exist")
    );
    drop(closed);
    let unavailable = run_cli(&closed_endpoint, "health", None, b"opaque-token");
    assert_eq!(unavailable.status.code(), Some(4));
    assert_ne!(unavailable.status.code(), Some(7));

    let listener = TcpListener::bind((Ipv4Addr::LOCALHOST, 0)).expect("timeout listener must bind");
    let endpoint = format!(
        "http://{}",
        listener.local_addr().expect("address must exist")
    );
    let server = thread::spawn(move || {
        let (_stream, _) = listener.accept().expect("timeout connection must arrive");
        thread::sleep(PRODUCT_IO_TIMEOUT_V1 + Duration::from_millis(250));
    });
    let timeout = run_cli(&endpoint, "status", None, b"opaque-token");
    assert_eq!(timeout.status.code(), Some(6));
    assert_ne!(timeout.status.code(), Some(7));
    server.join().expect("timeout server must join");
}

#[test]
fn drip_feed_peer_cannot_extend_absolute_deadline() {
    let listener = TcpListener::bind((Ipv4Addr::LOCALHOST, 0)).expect("drip listener must bind");
    let endpoint = format!(
        "http://{}",
        listener.local_addr().expect("address must exist")
    );
    let (stop_sender, stop_receiver) = mpsc::channel();
    let wall_start = Instant::now();
    let server = thread::spawn(move || {
        let (mut stream, _) = listener.accept().expect("drip connection must arrive");
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
    let output = run_cli(&endpoint, "health", None, b"opaque-token");
    let elapsed = wall_start.elapsed();
    let _ = stop_sender.send(());
    assert_eq!(output.status.code(), Some(6));
    assert!(
        elapsed < PRODUCT_IO_TIMEOUT_V1 + Duration::from_secs(2),
        "drip-feed must be bounded by absolute deadline, took {elapsed:?}"
    );
    server.join().expect("drip server must join");
}

fn run_cli(endpoint: &str, command: &str, output: Option<&str>, stdin: &[u8]) -> Output {
    let mut process = Command::new(env!("CARGO_BIN_EXE_lnsatctl"));
    process.args([command, "--endpoint", endpoint, "--session-token-stdin"]);
    if let Some(output) = output {
        if let Some((format, extra)) = output.split_once(' ') {
            process.args(["--output", format, extra]);
        } else {
            process.args(["--output", output]);
        }
    }
    let mut child = process
        .env("HTTP_PROXY", "http://203.0.113.1:9")
        .env("HTTPS_PROXY", "http://203.0.113.1:9")
        .env("ALL_PROXY", "http://203.0.113.1:9")
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .expect("lnsatctl must spawn");
    child
        .stdin
        .take()
        .expect("stdin pipe must exist")
        .write_all(stdin)
        .expect("stdin must write");
    child.wait_with_output().expect("lnsatctl must finish")
}

fn assert_no_connection(listener: &TcpListener) {
    assert!(matches!(
        listener.accept(),
        Err(error) if error.kind() == io::ErrorKind::WouldBlock
    ));
}

struct TestDaemon {
    _directory: TestDirectory,
    endpoint: String,
    session_token: String,
    shutdown: DaemonShutdownV1,
    thread: Option<thread::JoinHandle<Result<(), DaemonErrorV1>>>,
}

impl TestDaemon {
    fn start(ip: IpAddr) -> Self {
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
        let address = available_address(ip);
        let config = DaemonConfigV1::new(&database_path, address).expect("config must validate");
        let server = DaemonServerV1::bind(&config).expect("daemon must bind");
        let address = server.local_addr();
        let endpoint = format!("http://{address}");
        let shutdown = server.shutdown_handle();
        let thread = thread::spawn(move || server.serve());
        Self {
            _directory: directory,
            endpoint,
            session_token,
            shutdown,
            thread: Some(thread),
        }
    }

    fn endpoint(&self) -> &str {
        &self.endpoint
    }

    fn stop(mut self) {
        self.shutdown.request_shutdown();
        self.thread
            .take()
            .expect("daemon thread must exist")
            .join()
            .expect("daemon thread must join")
            .expect("daemon must stop cleanly");
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

fn available_address(ip: IpAddr) -> SocketAddr {
    let probe = TcpListener::bind(SocketAddr::new(ip, 0)).expect("loopback probe must bind");
    probe.local_addr().expect("probe address must exist")
}

struct TestDirectory {
    path: PathBuf,
}

impl TestDirectory {
    fn new(label: &str) -> Self {
        let nonce = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system time must follow epoch")
            .as_nanos();
        let path =
            std::env::temp_dir().join(format!("lnsat-{label}-{}-{nonce}", std::process::id()));
        fs::create_dir(&path).expect("test directory must be created");
        Self { path }
    }
}

impl Drop for TestDirectory {
    fn drop(&mut self) {
        let _ = fs::remove_dir_all(&self.path);
    }
}
