#![forbid(unsafe_code)]

use lnsatd::product_config::load_daemon_config_v1;
use lnsatd::product_output::{
    ProductOutputFormatV1, ProductSemanticResultV1, render_product_result_v1,
};
use lnsatd::product_recovery::{
    ProductRecoveryErrorV1, create_offline_backup_output_json_v1, prepare_owner_recovery_v1,
    read_recovery_password_stdin_v1, recover_prepared_owner_output_json_v1,
    restore_inert_backup_output_json_v1,
};
use lnsatd::product_surface::{
    PRODUCT_SOURCE_VERSION_V1, ProductExitCodeV1, completion_source_v1,
    config_inspection_output_json_v1, doctor_output_json_v1, failure_output_json_v1,
    lnsatctl_usage_v1, man_page_source_v1, product_surface_manifest_json_v1,
    recovery_inspection_output_json_v1,
};
use lnsatd::product_transport::{
    ProductClientErrorV1, ProductReadCommandV1, UnixSocketEndpointV1, read_session_token_stdin_v1,
    request_authenticated_product_read_v1,
};
use std::ffi::{OsStr, OsString};
use std::io;
use std::path::PathBuf;
use std::process::ExitCode;

#[allow(clippy::too_many_lines)] // Exact command shapes stay together for fail-closed review.
fn main() -> ExitCode {
    let arguments: Vec<_> = std::env::args_os().skip(1).collect();
    let selection = match OutputSelectionV1::parse(arguments) {
        Ok(selection) => selection,
        Err(format) => return invalid_arguments("usage", format),
    };
    let format = selection.format;
    match selection.arguments.as_slice() {
        [argument]
            if !selection.output_selected
                && (argument == OsStr::new("--help") || argument == OsStr::new("-h")) =>
        {
            print!("{}", lnsatctl_usage_v1());
            ExitCode::SUCCESS
        }
        [argument]
            if !selection.output_selected
                && (argument == OsStr::new("--version") || argument == OsStr::new("-V")) =>
        {
            println!("lnsatctl {PRODUCT_SOURCE_VERSION_V1} (source-only)");
            ExitCode::SUCCESS
        }
        [command] if !selection.output_selected && command == OsStr::new("manifest") => {
            print!("{}", product_surface_manifest_json_v1());
            ExitCode::SUCCESS
        }
        [command] if command == OsStr::new("doctor") => {
            emit_json_success(&doctor_output_json_v1(), "doctor", format)
        }
        [config, inspect, option, path]
            if config == OsStr::new("config")
                && inspect == OsStr::new("inspect")
                && option == OsStr::new("--config") =>
        {
            match load_daemon_config_v1(PathBuf::from(path)) {
                Ok(loaded) => emit_json_success(
                    &config_inspection_output_json_v1(&loaded),
                    "config.inspect",
                    format,
                ),
                Err(error) => emit_failure(
                    "config.inspect",
                    error.code(),
                    ProductExitCodeV1::UsageOrConfiguration,
                    format,
                ),
            }
        }
        [command, shell] if !selection.output_selected && command == OsStr::new("completion") => {
            let Some(shell) = shell.to_str() else {
                return invalid_arguments("completion", format);
            };
            let Some(source) = completion_source_v1(shell) else {
                return invalid_arguments("completion", format);
            };
            print!("{source}");
            ExitCode::SUCCESS
        }
        [command, page] if !selection.output_selected && command == OsStr::new("man") => {
            let Some(page) = page.to_str() else {
                return invalid_arguments("man", format);
            };
            let Some(source) = man_page_source_v1(page) else {
                return invalid_arguments("man", format);
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
                Ok(output) => emit_json_success(&output, "recovery.inspect", format),
                Err(error) => emit_failure(
                    "recovery.inspect",
                    error.code(),
                    ProductExitCodeV1::UsageOrConfiguration,
                    format,
                ),
            }
        }
        [backup, database, database_path, destination, backup_path]
            if backup == OsStr::new("backup")
                && database == OsStr::new("--database")
                && destination == OsStr::new("--destination") =>
        {
            match create_offline_backup_output_json_v1(
                PathBuf::from(database_path),
                PathBuf::from(backup_path),
            ) {
                Ok(output) => emit_json_success(&output, "backup", format),
                Err(error) => emit_recovery_failure("backup", error, format),
            }
        }
        [restore, backup, backup_path, destination, restored_path]
            if restore == OsStr::new("restore")
                && backup == OsStr::new("--backup")
                && destination == OsStr::new("--destination") =>
        {
            match restore_inert_backup_output_json_v1(
                PathBuf::from(backup_path),
                PathBuf::from(restored_path),
            ) {
                Ok(output) => emit_json_success(&output, "restore", format),
                Err(error) => emit_recovery_failure("restore", error, format),
            }
        }
        [
            recovery,
            owner,
            database,
            database_path,
            expected_owner,
            owner_ref,
            recovered_at,
            timestamp,
            password_stdin,
        ] if recovery == OsStr::new("recovery")
            && owner == OsStr::new("owner")
            && database == OsStr::new("--database")
            && expected_owner == OsStr::new("--expected-owner")
            && recovered_at == OsStr::new("--recovered-at")
            && password_stdin == OsStr::new("--new-password-stdin") =>
        {
            let (Some(owner_ref), Some(timestamp)) = (owner_ref.to_str(), timestamp.to_str())
            else {
                return invalid_arguments("recovery.owner", format);
            };
            let prepared = match prepare_owner_recovery_v1(PathBuf::from(database_path)) {
                Ok(prepared) => prepared,
                Err(error) => return emit_recovery_failure("recovery.owner", error, format),
            };
            let password = match read_recovery_password_stdin_v1(&mut io::stdin().lock()) {
                Ok(password) => password,
                Err(error) => return emit_recovery_failure("recovery.owner", error, format),
            };
            match recover_prepared_owner_output_json_v1(prepared, owner_ref, timestamp, &password) {
                Ok(output) => emit_json_success(&output, "recovery.owner", format),
                Err(error) => emit_recovery_failure("recovery.owner", error, format),
            }
        }
        [command, socket_option, socket_path, stdin_option]
            if (command == OsStr::new("health") || command == OsStr::new("status"))
                && socket_option == OsStr::new("--socket")
                && stdin_option == OsStr::new("--session-token-stdin") =>
        {
            let command_name = command_name(command);
            let endpoint = match UnixSocketEndpointV1::parse(PathBuf::from(socket_path)) {
                Ok(endpoint) => endpoint,
                Err(error) => return emit_client_failure(command_name, error, format),
            };
            let token = match read_session_token_stdin_v1(&mut io::stdin().lock()) {
                Ok(token) => token,
                Err(error) => return emit_client_failure(command_name, error, format),
            };
            let read_command = if command == OsStr::new("health") {
                ProductReadCommandV1::Health
            } else {
                ProductReadCommandV1::Status
            };
            match request_authenticated_product_read_v1(read_command, &endpoint, &token) {
                Ok(result) => emit_semantic_success(&result, format),
                Err(error) => emit_client_failure(read_command.name(), error, format),
            }
        }
        _ => invalid_arguments("usage", format),
    }
}

struct OutputSelectionV1 {
    arguments: Vec<OsString>,
    format: ProductOutputFormatV1,
    output_selected: bool,
}

impl OutputSelectionV1 {
    fn parse(mut arguments: Vec<OsString>) -> Result<Self, ProductOutputFormatV1> {
        let mut format = ProductOutputFormatV1::default();
        let mut output_selected = false;
        if arguments.len() >= 2 && arguments[arguments.len() - 2] == OsStr::new("--output") {
            let Some(value) = arguments.last().and_then(|value| value.to_str()) else {
                return Err(format);
            };
            let Some(parsed) = ProductOutputFormatV1::parse(value) else {
                return Err(format);
            };
            format = parsed;
            arguments.truncate(arguments.len() - 2);
            output_selected = true;
        }
        if arguments
            .iter()
            .any(|argument| argument == OsStr::new("--output"))
        {
            return Err(format);
        }
        Ok(Self {
            arguments,
            format,
            output_selected,
        })
    }
}

fn command_name(command: &OsStr) -> &'static str {
    if command == OsStr::new("health") {
        "health"
    } else {
        "status"
    }
}

fn semantic_from_json(value: &str) -> Option<ProductSemanticResultV1> {
    serde_json::from_str(value)
        .ok()
        .and_then(|value| ProductSemanticResultV1::new(value).ok())
}

fn emit_json_success(value: &str, command: &str, format: ProductOutputFormatV1) -> ExitCode {
    let Some(result) = semantic_from_json(value) else {
        return emit_failure(
            command,
            "lnsatctl.output.serialization_failed",
            ProductExitCodeV1::InternalFailure,
            format,
        );
    };
    emit_semantic_success(&result, format)
}

fn emit_semantic_success(
    result: &ProductSemanticResultV1,
    format: ProductOutputFormatV1,
) -> ExitCode {
    match render_product_result_v1(result, format) {
        Ok(output) => {
            print!("{output}");
            ExitCode::SUCCESS
        }
        Err(error) => emit_failure(
            "output",
            error.code(),
            ProductExitCodeV1::InternalFailure,
            format,
        ),
    }
}

fn emit_client_failure(
    command: &str,
    error: ProductClientErrorV1,
    format: ProductOutputFormatV1,
) -> ExitCode {
    emit_failure(command, error.code(), error.exit_code(), format)
}

fn emit_recovery_failure(
    command: &str,
    error: ProductRecoveryErrorV1,
    format: ProductOutputFormatV1,
) -> ExitCode {
    emit_failure(command, error.code(), error.exit_code(), format)
}

fn emit_failure(
    command: &str,
    error_code: &str,
    exit_code: ProductExitCodeV1,
    format: ProductOutputFormatV1,
) -> ExitCode {
    let failure = failure_output_json_v1("lnsatctl", command, error_code, exit_code);
    if let Some(result) = semantic_from_json(&failure)
        && let Ok(output) = render_product_result_v1(&result, format)
    {
        eprint!("{output}");
    } else {
        eprintln!("{failure}");
    }
    ExitCode::from(exit_code.as_u8())
}

fn invalid_arguments(command: &str, format: ProductOutputFormatV1) -> ExitCode {
    emit_failure(
        command,
        "lnsatctl.arguments.invalid",
        ProductExitCodeV1::UsageOrConfiguration,
        format,
    )
}
