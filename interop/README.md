# Interoperability Harnesses

This directory contains pinned, source-only compatibility harnesses for
third-party protocol implementations. Harnesses run only when their named npm
scripts are invoked; repository checks never install external runtimes
implicitly.

## Current Harness

- `fastmcp/` verifies bounded read-only MCP behavior against pinned FastMCP 3
  and FastMCP 4 environments.

Harness success proves only covered contract behavior at pinned versions. It
does not claim production support, hosted interoperability, runtime authority,
or compatibility with untested versions.

See [MCP interoperability and outage recovery](../docs/architecture/MCP_V2_FASTMCP_INTEROPERABILITY_AND_OUTAGE_RECOVERY.md)
and [local development](../docs/LOCAL_DEVELOPMENT.md).
