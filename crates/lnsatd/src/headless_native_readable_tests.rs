use super::*;
use std::fs::{self, OpenOptions};
use std::sync::atomic::{AtomicU64, Ordering};

static SEQUENCE: AtomicU64 = AtomicU64::new(0);

struct Fixture {
    root: std::path::PathBuf,
}

impl Fixture {
    fn new() -> Self {
        let root = std::env::temp_dir().join(format!(
            "lnsat-native-acl-{}-{}",
            std::process::id(),
            SEQUENCE.fetch_add(1, Ordering::Relaxed)
        ));
        fs::create_dir(&root).unwrap();
        Self { root }
    }

    fn file(&self) -> File {
        let path = self.root.join("sample");
        OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&path)
            .unwrap();
        File::open(path).unwrap()
    }
}

impl Drop for Fixture {
    fn drop(&mut self) {
        fs::remove_dir_all(&self.root).unwrap();
    }
}

#[cfg(not(target_os = "linux"))]
#[test]
fn headless_native_readable_unsupported_platform_denies_before_read() {
    let fixture = Fixture::new();
    let file = fixture.file();
    assert_eq!(
        sample_readable(&file).err(),
        Some(NativeError::UnsupportedPlatform)
    );
}

#[cfg(target_os = "linux")]
#[test]
fn headless_native_readable_actual_file_and_directory_samples_remain_unclassified() {
    use std::os::fd::AsRawFd;
    let fixture = Fixture::new();
    let file = fixture.file();
    let fd = file.as_raw_fd();
    let sample = sample_readable(&file).unwrap();
    assert_eq!(sample.identity, Identity::read(&file).unwrap());
    assert!(matches!(sample.access, AclRead::UnclassifiedNoData));
    assert!(matches!(sample.default, AclRead::UnclassifiedNoData));
    // Borrowing does not close/duplicate or transfer the source descriptor.
    assert_eq!(file.as_raw_fd(), fd);
    assert_eq!(file.metadata().unwrap().len(), 0);
    let directory = File::open(&fixture.root).unwrap();
    let sample = sample_readable(&directory).unwrap();
    assert_eq!(sample.identity, Identity::read(&directory).unwrap());
    assert!(matches!(sample.access, AclRead::UnclassifiedNoData));
    assert!(matches!(sample.default, AclRead::UnclassifiedNoData));
}

#[cfg(target_os = "linux")]
#[test]
fn headless_native_readable_actual_write_only_and_read_write_descriptors_deny() {
    let fixture = Fixture::new();
    let _read = fixture.file();
    let path = fixture.root.join("sample");
    for flags in [nix::fcntl::OFlag::O_WRONLY, nix::fcntl::OFlag::O_RDWR] {
        let fd = nix::fcntl::open(
            &path,
            flags | nix::fcntl::OFlag::O_CLOEXEC,
            nix::sys::stat::Mode::empty(),
        )
        .unwrap();
        let file = File::from(fd);
        assert_eq!(
            sample_readable(&file).err(),
            Some(NativeError::InvalidDescriptor)
        );
    }
}

#[cfg(target_os = "linux")]
#[test]
fn headless_native_readable_actual_missing_cloexec_and_opath_descriptors_deny() {
    use nix::{
        fcntl::{OFlag, open},
        sys::stat::Mode,
    };
    let fixture = Fixture::new();
    let _read = fixture.file();
    let path = fixture.root.join("sample");
    for flags in [OFlag::O_RDONLY, OFlag::O_PATH | OFlag::O_CLOEXEC] {
        let file = File::from(open(&path, flags, Mode::empty()).unwrap());
        assert_eq!(
            sample_readable(&file).err(),
            Some(NativeError::InvalidDescriptor)
        );
    }
}

#[cfg(target_os = "linux")]
#[test]
fn headless_native_readable_actual_pipe_type_denies_without_reading() {
    let (read, _write) = nix::unistd::pipe2(nix::fcntl::OFlag::O_CLOEXEC).unwrap();
    let file = File::from(read);
    assert_eq!(
        sample_readable(&file).err(),
        Some(NativeError::InvalidDescriptor)
    );
}

#[cfg(target_os = "linux")]
#[test]
fn headless_native_readable_actual_inode_link_drift_rejects_retained_sample() {
    let fixture = Fixture::new();
    let file = fixture.file();
    let before = Identity::read(&file).unwrap();
    fs::hard_link(
        fixture.root.join("sample"),
        fixture.root.join("second-link"),
    )
    .unwrap();
    let after = Identity::read(&file).unwrap();
    assert_eq!(after.links, before.links + 1);
    assert_eq!(before.require_same(after), Err(NativeError::ObjectChanged));
}
