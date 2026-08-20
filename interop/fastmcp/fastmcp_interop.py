from __future__ import annotations

import argparse
import asyncio
import importlib.metadata
import json
import os
from pathlib import Path
from typing import Any

MCP_MODERN_VERSION = "2026-07-28"
EXPECTED_VERSIONS = {"3-legacy": "3.4.5", "4-modern": "4.0.0b1"}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run isolated FastMCP interoperability checks.")
    parser.add_argument("--profile", choices=sorted(EXPECTED_VERSIONS), required=True)
    parser.add_argument("--repo", type=Path, required=True)
    return parser.parse_args()


async def run(profile: str, repo: Path) -> dict[str, Any]:
    from fastmcp import Client
    from fastmcp.client.transports import StdioTransport

    installed = importlib.metadata.version("fastmcp")
    expected = EXPECTED_VERSIONS[profile]
    if installed != expected:
        raise RuntimeError("FastMCP version does not match locked profile")

    node_path = os.environ.get("LNSAT_NODE_PATH", "")
    if not Path(node_path).is_absolute() or not Path(node_path).is_file():
        raise RuntimeError("LNSAT_NODE_PATH must name an absolute Node executable")
    server_path = repo / "packages" / "mcp" / "dist" / "stdio.js"
    fixture_path = repo / "packages" / "packets" / "fixtures" / "valid" / "context-packet.json"
    if not server_path.is_file() or not fixture_path.is_file():
        raise RuntimeError("Built MCP server or packet fixture is missing")

    packet = json.loads(fixture_path.read_text(encoding="utf-8"))
    first = await exercise_session(
        Client, StdioTransport, profile, repo, node_path, server_path, packet
    )
    restarted = await exercise_restart(
        Client, StdioTransport, profile, repo, node_path, server_path
    )
    return {
        "profile": profile,
        "fastmcp_version": installed,
        "mcp_era": "legacy" if profile == "3-legacy" else MCP_MODERN_VERSION,
        "tool_count": first["tool_count"],
        "packet_call": "passed",
        "bounded_error": "passed",
        "schema_root": "object",
        "cancellation_notification": "non_authoritative_passed",
        "restart": "passed" if restarted else "failed",
        "oauth_admission": "covered_by_mcp_oauth_security_matrix",
        "gateway_contract_id": "lnsat.gateway.packet_inspection.v0_1",
        "authority_granted_by_fastmcp": False,
        "python_authority_core_dependency": False,
        "side_effects": [],
    }


async def exercise_session(
    client_type: Any,
    transport_type: Any,
    profile: str,
    repo: Path,
    node_path: str,
    server_path: Path,
    packet: dict[str, Any],
) -> dict[str, Any]:
    client_args: dict[str, Any] = {"timeout": 10}
    if profile == "4-modern":
        client_args["mode"] = MCP_MODERN_VERSION
    async with client_type(
        transport(transport_type, repo, node_path, server_path), **client_args
    ) as client:
        tools = await client.list_tools()
        names = {tool.name for tool in tools}
        if "lnsat.packet.inspect" not in names:
            raise RuntimeError("Packet inspection tool is missing")
        packet_tool = next(tool for tool in tools if tool.name == "lnsat.packet.inspect")
        schema = getattr(packet_tool, "input_schema", None)
        if schema is None:
            schema = getattr(packet_tool, "inputSchema", None)
        if not isinstance(schema, dict) or schema.get("type") != "object":
            raise RuntimeError("Packet inspection input schema root is not object")

        result = await client.call_tool(
            "lnsat.packet.inspect",
            {"request_id": f"req_fastmcp_{profile.replace('-', '_')}", "packet": packet},
        )
        data = getattr(result, "data", None)
        if (
            result.is_error
            or not isinstance(data, dict)
            or data.get("gateway_contract_id") != "lnsat.gateway.packet_inspection.v0_1"
            or data.get("side_effects") != []
            or data.get("gateway_response", {}).get("validation", {}).get("ok") is not True
        ):
            raise RuntimeError("Packet inspection did not return bounded Gateway evidence")

        invalid_marker = "must_not_reflect_invalid_fastmcp_marker"
        invalid = await client.call_tool(
            "lnsat.packet.inspect",
            {
                "request_id": "req_fastmcp_invalid",
                "packet": {},
                "unexpected": invalid_marker,
            },
            raise_on_error=False,
        )
        invalid_data = getattr(invalid, "data", None)
        if not invalid.is_error or invalid_marker in json.dumps(invalid_data, sort_keys=True):
            raise RuntimeError("Invalid tool input did not produce bounded non-reflective error")

        await client.cancel("unknown-fastmcp-probe", "compatibility cancellation only")
        if "lnsat.packet.inspect" not in {tool.name for tool in await client.list_tools()}:
            raise RuntimeError("Cancellation notification destabilized server")
        return {"tool_count": len(tools)}


async def exercise_restart(
    client_type: Any,
    transport_type: Any,
    profile: str,
    repo: Path,
    node_path: str,
    server_path: Path,
) -> bool:
    client_args: dict[str, Any] = {"timeout": 10}
    if profile == "4-modern":
        client_args["mode"] = MCP_MODERN_VERSION
    async with client_type(
        transport(transport_type, repo, node_path, server_path), **client_args
    ) as client:
        return "lnsat.packet.inspect" in {tool.name for tool in await client.list_tools()}


def transport(
    transport_type: Any, repo: Path, node_path: str, server_path: Path
) -> Any:
    return transport_type(
        node_path,
        [str(server_path)],
        cwd=str(repo),
        keep_alive=False,
        env={
            "PATH": f"{Path(node_path).parent}:/usr/bin:/bin",
            "NO_COLOR": "1",
            "NODE_NO_WARNINGS": "1",
        },
    )


def main() -> int:
    args = parse_args()
    try:
        result = asyncio.run(run(args.profile, args.repo.resolve()))
    except Exception as error:  # Fail with bounded diagnostics; never print tokens or payloads.
        print(
            json.dumps(
                {
                    "profile": args.profile,
                    "status": "failed",
                    "error_type": type(error).__name__,
                    "side_effects": [],
                },
                sort_keys=True,
            )
        )
        return 1
    print(json.dumps({"status": "passed", **result}, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
