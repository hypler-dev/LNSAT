#![forbid(unsafe_code)]

use lnsatd::product_config::load_daemon_config_v1;
use lnsatd::product_surface::{
    PRODUCT_SOURCE_VERSION_V1, ProductExitCodeV1, completion_source_v1,
    config_inspection_output_json_v1, doctor_output_json_v1, failure_output_json_v1,
    lnsatctl_usage_v1, man_page_source_v1, product_surface_manifest_json_v1,
    recovery_inspection_output_json_v1,
};
use std::ffi::OsStr;
use std::path::PathBuf;
use std::process::ExitCode;

fn main() -> ExitCode {
    let arguments: Vec<_> = std::env::args_os().skip(1).collect();
    match arguments.as_slice() {
        [argument] if argument == OsStr::new("--help") || argument == OsStr::new("-h") => {
            print!("{}", lnsatctl_usage_v1());
            ExitCode::SUCCESS
        }
        [argument] if argument == OsStr::new("--version") || argument == OsStr::new("-V") => {
            println!("lnsatctl {PRODUCT_SOURCE_VERSION_V1} (source-only)");
            ExitCode::SUCCESS
        }
        [command] if command == OsStr::new("manifest") => {
            print!("{}", product_surface_manifest_json_v1());
            ExitCode::SUCCESS
        }
        [command] if command == OsStr::new("doctor") => {
            println!("{}", doctor_output_json_v1());
            ExitCode::SUCCESS
        }
        [config, inspect, option, path]
            if config == OsStr::new("config")
                && inspect == OsStr::new("inspect")
                && option == OsStr::new("--config") =>
        {
            match load_daemon_config_v1(PathBuf::from(path)) {
                Ok(loaded) => {
                    println!("{}", config_inspection_output_json_v1(&loaded));
                    ExitCode::SUCCESS
                }
                Err(error) => {
                    let exit_code = ProductExitCodeV1::UsageOrConfiguration;
                    eprintln!(
                        "{}",
                        failure_output_json_v1(
                            "lnsatctl",
                            "config.inspect",
                            error.code(),
                            exit_code,
                        )
                    );
                    ExitCode::from(exit_code.as_u8())
                }
            }
        }
        [command, shell] if command == OsStr::new("completion") => {
            let Some(shell) = shell.to_str() else {
                return invalid_arguments("completion");
            };
            let Some(source) = completion_source_v1(shell) else {
                return invalid_arguments("completion");
            };
            print!("{source}");
            ExitCode::SUCCESS
        }
        [command, page] if command == OsStr::new("man") => {
            let Some(page) = page.to_str() else {
                return invalid_arguments("man");
            };
            let Some(source) = man_page_source_v1(page) else {
                return invalid_arguments("man");
            };
            print!("{source}");
            ExitCode::SUCCESS
        }
        [recovery, inspect, database, path]
            if recovery == OsStr::new("recovery")
                && inspect == OsStr::new("inspect")
                && database == OsStr::new("--database") =>
        {
            match recovery_inspection_output_json_v1(PathBuf::from(path)) {
                Ok(output) => {
                    println!("{output}");
                    ExitCode::SUCCESS
                }
                Err(error) => {
                    let exit_code = ProductExitCodeV1::UsageOrConfiguration;
                    eprintln!(
                        "{}",
                        failure_output_json_v1(
                            "lnsatctl",
                            "recovery.inspect",
                            error.code(),
                            exit_code,
                        )
                    );
                    ExitCode::from(exit_code.as_u8())
                }
            }
        }
        _ => invalid_arguments("usage"),
    }
}

fn invalid_arguments(command: &str) -> ExitCode {
    let exit_code = ProductExitCodeV1::UsageOrConfiguration;
    eprintln!(
        "{}",
        failure_output_json_v1("lnsatctl", command, "lnsatctl.arguments.invalid", exit_code,)
    );
    ExitCode::from(exit_code.as_u8())
}
