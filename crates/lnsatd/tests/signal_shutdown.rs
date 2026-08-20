#![cfg(unix)]
#![forbid(unsafe_code)]

use std::fs;
use std::io::{Read, Write};
use std::net::{SocketAddr, TcpListener, TcpStream};
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::sync::atomic::{AtomicU64, Ordering};
use std::thread;
use std::time::{Duration, Instant};

static NEXT_TEST_DIRECTORY: AtomicU64 = AtomicU64::new(1);

struct TestDirectory {
    path: PathBuf,
}

impl TestDirectory {
    fn new() -> Self {
        let sequence = NEXT_TEST_DIRECTORY.fetch_add(1, Ordering::Relaxed);
        let path =
            std::env::temp_dir().join(format!("lnsatd-signal-{}-{sequence}", std::process::id()));
        fs::create_dir(&path).expect("test directory should create");
        Self { path }
    }
}

impl Drop for TestDirectory {
    fn drop(&mut self) {
        let _ = fs::remove_dir_all(&self.path);
    }
}

struct ChildGuard {
    child: Child,
}

impl ChildGuard {
    fn spawn(database_path: &Path, address: SocketAddr, disposable_git_root: &Path) -> Self {
        let child = Command::new(env!("CARGO_BIN_EXE_lnsatd"))
            .args([
                "--database",
                database_path
                    .to_str()
                    .expect("test database path should be UTF-8"),
                "--listen",
                &address.to_string(),
                "--disposable-git-root",
                disposable_git_root
                    .to_str()
                    .expect("disposable Git root should be UTF-8"),
                "--git-executable",
                "/usr/bin/git",
            ])
            .stdin(Stdio::null())
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .spawn()
            .expect("lnsatd child should start");
        Self { child }
    }

    fn id(&self) -> u32 {
        self.child.id()
    }

    fn wait_for_success(&mut self) {
        let deadline = Instant::now() + Duration::from_secs(5);
        loop {
            if let Some(status) = self.child.try_wait().expect("child status should inspect") {
                assert!(status.success(), "signal shutdown should exit successfully");
                return;
            }
            assert!(
                Instant::now() < deadline,
                "signal shutdown should finish within five seconds"
            );
            thread::sleep(Duration::from_millis(25));
        }
    }
}

impl Drop for ChildGuard {
    fn drop(&mut self) {
        if self.child.try_wait().ok().flatten().is_none() {
            let _ = self.child.kill();
            let _ = self.child.wait();
        }
    }
}

#[test]
fn sigint_sigterm_and_sighup_shutdown_cleanly_and_allow_restart() {
    let directory = TestDirectory::new();
    let database_path = directory.path.join("lnsat.sqlite3");
    let disposable_git_root = directory.path.join("disposable-git-root");
    fs::create_dir(&disposable_git_root).expect("disposable Git root should create");

    for signal in ["INT", "TERM", "HUP"] {
        let address = reserve_loopback_address();
        let mut child = ChildGuard::spawn(&database_path, address, &disposable_git_root);
        wait_for_readiness(address);

        let status = Command::new("kill")
            .args([format!("-{signal}"), child.id().to_string()])
            .status()
            .expect("kill command should run");
        assert!(status.success(), "test signal should be delivered");
        child.wait_for_success();
    }
}

fn reserve_loopback_address() -> SocketAddr {
    let listener = TcpListener::bind("127.0.0.1:0").expect("test port should reserve");
    listener
        .local_addr()
        .expect("reserved address should inspect")
}

fn wait_for_readiness(address: SocketAddr) {
    let deadline = Instant::now() + Duration::from_secs(5);
    loop {
        if request_readiness(address).is_ok() {
            return;
        }
        assert!(
            Instant::now() < deadline,
            "lnsatd should become ready within five seconds"
        );
        thread::sleep(Duration::from_millis(25));
    }
}

fn request_readiness(address: SocketAddr) -> std::io::Result<()> {
    let mut stream = TcpStream::connect_timeout(&address, Duration::from_millis(100))?;
    stream.set_read_timeout(Some(Duration::from_millis(500)))?;
    stream.write_all(b"GET /healthz HTTP/1.1\r\nHost: 127.0.0.1\r\n\r\n")?;
    let mut response = String::new();
    stream.read_to_string(&mut response)?;
    if response.starts_with("HTTP/1.1 200 OK\r\n") {
        Ok(())
    } else {
        Err(std::io::Error::other("unexpected readiness response"))
    }
}
