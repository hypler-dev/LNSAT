#![cfg(any(target_os = "linux", target_os = "macos"))]
#![forbid(unsafe_code)]

use lnsatd::{DaemonConfigV1, DaemonErrorV1};
use std::fs;
use std::io;
use std::net::{Ipv4Addr, SocketAddr, TcpListener};
use std::os::unix::net::UnixListener;
use std::path::PathBuf;
use std::process::{Command, Stdio};
use std::time::{SystemTime, UNIX_EPOCH};

#[test]
fn configured_control_socket_is_withdrawn_before_daemon_bind() {
    let directory = TestDirectory::new("withdrawn-config");
    let socket_path = directory.path.join("lnsatd.sock");
    let error = DaemonConfigV1::new(
        directory.path.join("authority.sqlite3"),
        available_tcp_address(),
    )
    .expect("loopback config must validate")
    .with_control_socket_path(&socket_path)
    .expect_err("withdrawn control socket must reject during configuration");

    assert_eq!(error, DaemonErrorV1::ControlSocketWithdrawn);
    assert!(
        !socket_path.exists(),
        "rejected configuration must not bind a socket"
    );
}

#[test]
fn legacy_health_and_status_fail_before_stdin_or_unix_connection() {
    let directory = TestDirectory::new("withdrawn-client");
    let socket_path = directory.path.join("replacement.sock");
    let listener = UnixListener::bind(&socket_path).expect("replacement listener must bind");
    listener
        .set_nonblocking(true)
        .expect("replacement listener must become nonblocking");

    for arguments in [
        vec![
            "health",
            "--socket",
            socket_path.to_str().unwrap(),
            "--session-token-stdin",
        ],
        vec![
            "status",
            "--socket",
            socket_path.to_str().unwrap(),
            "--session-token-stdin",
            "--product-surface-contract",
            "lnsat.product_surface.v2",
        ],
    ] {
        let output = Command::new(env!("CARGO_BIN_EXE_lnsatctl"))
            .args(arguments)
            .stdin(Stdio::null())
            .output()
            .expect("legacy command must run");
        assert_eq!(output.status.code(), Some(2));
        assert!(output.stdout.is_empty());
        let stderr = String::from_utf8(output.stderr).expect("withdrawal error must be UTF-8");
        assert!(stderr.contains("\"code\":\"lnsatctl.unix_transport.withdrawn\""));
        assert!(
            matches!(listener.accept(), Err(error) if error.kind() == io::ErrorKind::WouldBlock)
        );
    }
}

fn available_tcp_address() -> SocketAddr {
    let probe = TcpListener::bind((Ipv4Addr::LOCALHOST, 0)).expect("loopback probe must bind");
    probe.local_addr().expect("probe must report address")
}

struct TestDirectory {
    path: PathBuf,
}

impl TestDirectory {
    fn new(label: &str) -> Self {
        let nonce = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system clock must follow epoch")
            .as_nanos();
        let path = PathBuf::from("/tmp").join(format!(
            "lnsatd-{label}-{}-{}",
            std::process::id(),
            nonce % 1_000_000
        ));
        fs::create_dir(&path).expect("test directory must create");
        Self { path }
    }
}

impl Drop for TestDirectory {
    fn drop(&mut self) {
        let _ = fs::remove_dir_all(&self.path);
    }
}
