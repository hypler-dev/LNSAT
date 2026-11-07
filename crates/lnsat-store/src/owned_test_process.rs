//! Disposable-process runner for tests that deliberately retain process-local state.
//!
//! Test fixtures that permanently seal an in-process physical key must run their
//! original body only in a dedicated copy of the current libtest executable.

use std::{
    env,
    fs::{self, File, OpenOptions},
    io::{self, Read, Write},
    path::PathBuf,
    process::{Child, Command, ExitStatus, Stdio},
    sync::{
        Arc,
        atomic::{AtomicBool, AtomicU64, Ordering},
    },
    thread,
    time::{Duration, Instant},
};

#[cfg(unix)]
use std::os::unix::fs::{DirBuilderExt as _, OpenOptionsExt as _};

const CHILD_MARKER_ENV: &str = "LNSAT_OWNED_TEST_PROCESS";
#[cfg(target_os = "linux")]
const SELECTED_CLOSE_MODE_ENV: &str = "LNSAT_SELECTED_CLOSE_TEST_MODE";
const BODY_ENTRY_MARKER: &str = "LNSAT_OWNED_TEST_BODY_ENTRY:";
const CHILD_TIMEOUT: Duration = Duration::from_secs(20);
const MAX_CAPTURE_BYTES: usize = 1024 * 1024;
const POLL: Duration = Duration::from_millis(20);
static NEXT_OUTPUT_DIRECTORY: AtomicU64 = AtomicU64::new(0);

/// Runs a test body in a dedicated libtest child unless this is that child.
///
/// Call at the first line of a test body and return when this returns `false`.
pub(crate) fn run_or_enter(test_name: &'static str) -> bool {
    enter(test_name, None)
}

/// Runs one ignored selected-close fixture in a dedicated libtest child.
#[cfg(target_os = "linux")]
pub(crate) fn run_ignored(test_name: &'static str, mode: &'static str) {
    validate_test_name(test_name);
    validate_mode(mode);
    run_child(test_name, Some(mode));
}

/// Confirms that an ignored selected-close fixture is in its dedicated child.
#[cfg(target_os = "linux")]
pub(crate) fn enter_ignored(test_name: &'static str, mode_environment: &str) {
    assert_eq!(
        mode_environment, SELECTED_CLOSE_MODE_ENV,
        "ignored test must use the fixed selected-close mode environment"
    );
    let mode = env::var(SELECTED_CLOSE_MODE_ENV)
        .unwrap_or_else(|_| panic!("ignored test requires {SELECTED_CLOSE_MODE_ENV}"));
    validate_mode(&mode);
    assert!(
        enter(test_name, Some(mode.as_str())),
        "ignored test must run only in its dedicated child"
    );
}

fn enter(test_name: &'static str, mode: Option<&str>) -> bool {
    validate_test_name(test_name);
    let expected_marker = child_marker(test_name, mode);
    match env::var(CHILD_MARKER_ENV) {
        Ok(marker) if marker == expected_marker => {
            #[cfg(target_os = "linux")]
            if let Some(expected_mode) = mode {
                assert_eq!(
                    env::var(SELECTED_CLOSE_MODE_ENV).as_deref(),
                    Ok(expected_mode),
                    "selected-close child mode must match its dedicated invocation"
                );
            }
            #[cfg(not(target_os = "linux"))]
            assert!(
                mode.is_none(),
                "selected-close child is supported only on Linux"
            );
            eprintln!("{BODY_ENTRY_MARKER}{expected_marker}");
            true
        }
        Ok(_) => panic!("owned test child marker names a different test"),
        Err(env::VarError::NotPresent) => {
            if mode.is_some() {
                false
            } else {
                run_child(test_name, None);
                false
            }
        }
        Err(env::VarError::NotUnicode(_)) => panic!("owned test child marker is not Unicode"),
    }
}

fn run_child(test_name: &'static str, mode: Option<&str>) {
    let output = OutputDirectory::new();
    let stdout = output.create_file("stdout");
    let stderr = output.create_file("stderr");
    let executable = env::current_exe().expect("current test executable must resolve");
    let mut command = Command::new(executable);
    command
        .env_remove(CHILD_MARKER_ENV)
        .env(CHILD_MARKER_ENV, child_marker(test_name, mode))
        .args(["--exact", test_name, "--nocapture"])
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    if let Some(mode) = mode {
        #[cfg(target_os = "linux")]
        command
            .arg("--ignored")
            .env_remove(SELECTED_CLOSE_MODE_ENV)
            .env(SELECTED_CLOSE_MODE_ENV, mode);
        #[cfg(not(target_os = "linux"))]
        panic!("selected-close child is supported only on Linux: {mode}");
    }
    let mut child = ChildOwner::new(command.spawn().unwrap_or_else(|error| {
        panic!(
            "owned test child must start: test={test_name} mode={} error={error}",
            mode.unwrap_or("none")
        )
    }));
    let stdout_state = Arc::new(CaptureState::default());
    let stderr_state = Arc::new(CaptureState::default());
    let stdout_reader = child
        .child_mut()
        .stdout
        .take()
        .expect("owned test child stdout must exist");
    let stderr_reader = child
        .child_mut()
        .stderr
        .take()
        .expect("owned test child stderr must exist");
    let stdout_capture = spawn_capture(stdout_reader, stdout, Arc::clone(&stdout_state));
    let stderr_capture = spawn_capture(stderr_reader, stderr, Arc::clone(&stderr_state));
    let wait_result = child.wait_with_bound(test_name, mode, &stdout_state, &stderr_state);
    let stdout_result = stdout_capture
        .join()
        .unwrap_or_else(|_| Err(io::Error::other("stdout capture thread panicked")));
    let stderr_result = stderr_capture
        .join()
        .unwrap_or_else(|_| Err(io::Error::other("stderr capture thread panicked")));
    let stdout = output.read("stdout");
    let stderr = output.read("stderr");
    let output_text = format!(
        "{}{}",
        String::from_utf8_lossy(&stdout),
        String::from_utf8_lossy(&stderr)
    );
    let accepted = wait_result.as_ref().is_ok_and(ExitStatus::success)
        && !stdout_state.exceeded.load(Ordering::Acquire)
        && !stderr_state.exceeded.load(Ordering::Acquire)
        && !stdout_state.failed.load(Ordering::Acquire)
        && !stderr_state.failed.load(Ordering::Acquire)
        && stdout_result.is_ok()
        && stderr_result.is_ok()
        && child_output_is_success(test_name, mode, &output_text);
    if accepted {
        output.cleanup();
        return;
    }
    panic!(
        "owned test child failed: test={test_name} mode={} output_directory={} wait={wait_result:?}; stdout_capture={stdout_result:?}; stderr_capture={stderr_result:?}; stdout_limit={} stderr_limit={}; marker={} summary={}; stdout={}; stderr={}",
        mode.unwrap_or("none"),
        output.path.display(),
        stdout_state.exceeded.load(Ordering::Acquire),
        stderr_state.exceeded.load(Ordering::Acquire),
        body_entry_count(test_name, mode, &output_text),
        success_summary_count(&output_text),
        diagnostic(&stdout),
        diagnostic(&stderr),
    );
}

#[derive(Default)]
struct CaptureState {
    exceeded: AtomicBool,
    failed: AtomicBool,
}

fn spawn_capture<R>(
    reader: R,
    file: File,
    state: Arc<CaptureState>,
) -> thread::JoinHandle<io::Result<()>>
where
    R: Read + Send + 'static,
{
    thread::spawn(move || capture(reader, file, &state))
}

fn capture<R: Read>(mut reader: R, mut file: File, state: &CaptureState) -> io::Result<()> {
    let result = (|| {
        let mut retained = 0_usize;
        let mut buffer = [0_u8; 8192];
        loop {
            let count = reader.read(&mut buffer)?;
            if count == 0 {
                return Ok(());
            }
            let available = MAX_CAPTURE_BYTES.saturating_sub(retained);
            let written = available.min(count);
            if written != 0 {
                file.write_all(&buffer[..written])?;
                retained += written;
            }
            if written != count {
                state.exceeded.store(true, Ordering::Release);
            }
        }
    })();
    if result.is_err() {
        state.failed.store(true, Ordering::Release);
    }
    result
}

struct ChildOwner {
    child: Option<Child>,
}

impl ChildOwner {
    fn new(child: Child) -> Self {
        Self { child: Some(child) }
    }

    fn child_mut(&mut self) -> &mut Child {
        self.child
            .as_mut()
            .expect("owned test child must remain active")
    }

    fn wait_with_bound(
        &mut self,
        test_name: &str,
        mode: Option<&str>,
        stdout: &CaptureState,
        stderr: &CaptureState,
    ) -> Result<ExitStatus, String> {
        let deadline = Instant::now() + CHILD_TIMEOUT;
        loop {
            if stdout.exceeded.load(Ordering::Acquire)
                || stderr.exceeded.load(Ordering::Acquire)
                || stdout.failed.load(Ordering::Acquire)
                || stderr.failed.load(Ordering::Acquire)
            {
                self.terminate();
                return Err(format!(
                    "capture bound or capture error: test={test_name} mode={}",
                    mode.unwrap_or("none")
                ));
            }
            match self.child_mut().try_wait() {
                Ok(Some(status)) => {
                    self.child = None;
                    return Ok(status);
                }
                Ok(None) if Instant::now() < deadline => thread::sleep(POLL),
                Ok(None) => {
                    self.terminate();
                    return Err(format!(
                        "timed out after {}s: test={test_name} mode={}",
                        CHILD_TIMEOUT.as_secs(),
                        mode.unwrap_or("none")
                    ));
                }
                Err(error) => {
                    self.terminate();
                    return Err(format!(
                        "wait failed: test={test_name} mode={} error={error}",
                        mode.unwrap_or("none")
                    ));
                }
            }
        }
    }

    fn terminate(&mut self) {
        if let Some(mut child) = self.child.take() {
            let _ = child.kill();
            let _ = child.wait();
        }
    }
}

impl Drop for ChildOwner {
    fn drop(&mut self) {
        self.terminate();
    }
}

struct OutputDirectory {
    path: PathBuf,
}

impl OutputDirectory {
    fn new() -> Self {
        for _ in 0..128 {
            let sequence = NEXT_OUTPUT_DIRECTORY.fetch_add(1, Ordering::Relaxed);
            let path = env::temp_dir().join(format!(
                "lnsat-owned-test-process-{}-{sequence}",
                std::process::id()
            ));
            let mut builder = fs::DirBuilder::new();
            #[cfg(unix)]
            builder.mode(0o700);
            match builder.create(&path) {
                Ok(()) => return Self { path },
                Err(error) if error.kind() == io::ErrorKind::AlreadyExists => {}
                Err(error) => panic!("owned test output directory must create: {error}"),
            }
        }
        panic!("owned test output directory name space exhausted");
    }

    fn create_file(&self, name: &str) -> File {
        let mut options = OpenOptions::new();
        options.write(true).create_new(true);
        #[cfg(unix)]
        options.mode(0o600);
        options
            .open(self.path.join(name))
            .unwrap_or_else(|error| panic!("owned test output file must create: {error}"))
    }

    fn read(&self, name: &str) -> Vec<u8> {
        let bytes = fs::read(self.path.join(name))
            .unwrap_or_else(|error| panic!("owned test output file must read: {error}"));
        assert!(
            bytes.len() <= MAX_CAPTURE_BYTES,
            "owned test output exceeds bounded capture"
        );
        bytes
    }

    fn cleanup(self) {
        fs::remove_file(self.path.join("stdout")).expect("passed owned test stdout must clean");
        fs::remove_file(self.path.join("stderr")).expect("passed owned test stderr must clean");
        fs::remove_dir(&self.path).expect("passed owned test directory must clean");
    }
}

fn diagnostic(bytes: &[u8]) -> String {
    const MAX_DIAGNOSTIC_BYTES: usize = 8192;
    let start = bytes.len().saturating_sub(MAX_DIAGNOSTIC_BYTES);
    String::from_utf8_lossy(&bytes[start..]).into_owned()
}

fn child_marker(test_name: &str, mode: Option<&str>) -> String {
    match mode {
        Some(mode) => format!("{test_name}|{mode}"),
        None => test_name.to_owned(),
    }
}

fn child_output_is_success(test_name: &str, mode: Option<&str>, output: &str) -> bool {
    body_entry_count(test_name, mode, output) == 1 && success_summary_count(output) == 1
}

fn body_entry_count(test_name: &str, mode: Option<&str>, output: &str) -> usize {
    let marker = format!("{BODY_ENTRY_MARKER}{}", child_marker(test_name, mode));
    output
        .lines()
        .map(|line| line.strip_suffix('\r').unwrap_or(line))
        .filter(|line| *line == marker.as_str())
        .count()
}

fn success_summary_count(output: &str) -> usize {
    const SUMMARY_PREFIX: &str = "test result: ok. 1 passed; 0 failed; 0 ignored; 0 measured; ";
    output
        .lines()
        .map(|line| line.strip_suffix('\r').unwrap_or(line))
        .filter(|line| {
            line.strip_prefix(SUMMARY_PREFIX)
                .is_some_and(is_standard_summary_suffix)
        })
        .count()
}

fn is_standard_summary_suffix(suffix: &str) -> bool {
    let Some((filtered, duration)) = suffix.split_once(" filtered out; finished in ") else {
        return false;
    };
    !filtered.is_empty()
        && filtered.bytes().all(|byte| byte.is_ascii_digit())
        && duration
            .strip_suffix('s')
            .is_some_and(|value| !value.is_empty())
}

fn validate_test_name(value: &str) {
    assert!(
        !value.is_empty()
            && value
                .bytes()
                .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'_' | b':')),
        "owned test name must be a Rust libtest path"
    );
}

#[cfg(target_os = "linux")]
fn validate_mode(value: &str) {
    assert!(
        !value.is_empty()
            && value
                .bytes()
                .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'_' | b'-')),
        "selected-close mode must be fixed identifier text"
    );
}

#[cfg(test)]
mod tests {
    use super::*;

    const TEST_NAME: &str = "tests::fixture";
    const SUCCESS: &str = "test result: ok. 1 passed; 0 failed; 0 ignored; 0 measured; 607 filtered out; finished in 0.00s";

    fn output(body_entries: &[String], summary: &str) -> String {
        let markers = body_entries
            .iter()
            .map(|entry| format!("{BODY_ENTRY_MARKER}{entry}"))
            .collect::<Vec<_>>()
            .join("\n");
        format!("{markers}\n{summary}")
    }

    #[test]
    fn oracle_requires_one_exact_body_entry_and_one_success_summary() {
        assert!(child_output_is_success(
            TEST_NAME,
            None,
            &output(&[child_marker(TEST_NAME, None)], SUCCESS)
        ));
    }

    #[test]
    fn oracle_rejects_zero_test_summary() {
        assert!(!child_output_is_success(
            TEST_NAME,
            None,
            &output(
                &[child_marker(TEST_NAME, None)],
                "test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 607 filtered out; finished in 0.00s"
            )
        ));
    }

    #[test]
    fn oracle_rejects_missing_wrong_or_duplicate_body_entry_marker() {
        assert!(!child_output_is_success(TEST_NAME, None, SUCCESS));
        assert!(!child_output_is_success(
            TEST_NAME,
            None,
            &output(&[child_marker("tests::other", None)], SUCCESS)
        ));
        assert!(!child_output_is_success(
            TEST_NAME,
            None,
            &output(
                &[child_marker(TEST_NAME, None), child_marker(TEST_NAME, None),],
                SUCCESS
            )
        ));
        assert!(!child_output_is_success(
            TEST_NAME,
            None,
            &output(&[child_marker("tests::fixture_extra", None)], SUCCESS)
        ));
    }

    #[test]
    fn oracle_rejects_failure_summary() {
        assert!(!child_output_is_success(
            TEST_NAME,
            None,
            &output(
                &[child_marker(TEST_NAME, None)],
                "test result: FAILED. 0 passed; 1 failed; 0 ignored; 0 measured; 607 filtered out; finished in 0.00s"
            )
        ));
    }

    #[test]
    fn ignored_marker_binds_test_and_mode() {
        assert!(!child_output_is_success(
            TEST_NAME,
            Some("busy"),
            &output(&[child_marker(TEST_NAME, Some("wal-replace"))], SUCCESS)
        ));
    }

    #[test]
    fn oracle_rejects_multiple_or_counterfeit_success_summaries() {
        assert!(!child_output_is_success(
            TEST_NAME,
            None,
            &output(
                &[child_marker(TEST_NAME, None)],
                &format!("{SUCCESS}\n{SUCCESS}")
            )
        ));
        assert!(!child_output_is_success(
            TEST_NAME,
            None,
            &output(
                &[child_marker(TEST_NAME, None)],
                "test result: ok. 1 passed; 0 failed; 0 ignored; 0 measured; counterfeit"
            )
        ));
    }
}
