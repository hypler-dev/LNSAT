#![forbid(unsafe_code)]

use lnsatd::product_surface::product_surface_manifest_json_v1;
use lnsatd::{
    DaemonCliActionV1, DaemonServerV1, daemon_source_version_v1, daemon_usage_v1,
    install_os_shutdown_handler_v1, parse_daemon_args_v1,
};
use std::process::ExitCode;

fn main() -> ExitCode {
    let action = match parse_daemon_args_v1(std::env::args_os()) {
        Ok(action) => action,
        Err(error) => {
            eprintln!("{}", error.code());
            return ExitCode::from(2);
        }
    };

    match action {
        DaemonCliActionV1::Help => {
            print!("{}", daemon_usage_v1());
            ExitCode::SUCCESS
        }
        DaemonCliActionV1::Version => {
            println!("lnsatd {} (source-only)", daemon_source_version_v1());
            ExitCode::SUCCESS
        }
        DaemonCliActionV1::Manifest => {
            print!("{}", product_surface_manifest_json_v1());
            ExitCode::SUCCESS
        }
        DaemonCliActionV1::Run(config) => match DaemonServerV1::bind(&config) {
            Ok(server) => {
                if let Err(error) = install_os_shutdown_handler_v1(server.shutdown_handle()) {
                    eprintln!("{}", error.code());
                    return ExitCode::FAILURE;
                }
                let address = server.local_addr();
                eprintln!("lnsatd source-local Gateway listening on {address}");
                match server.serve() {
                    Ok(()) => ExitCode::SUCCESS,
                    Err(error) => {
                        eprintln!("{}", error.code());
                        ExitCode::FAILURE
                    }
                }
            }
            Err(error) => {
                eprintln!("{}", error.code());
                ExitCode::FAILURE
            }
        },
    }
}
