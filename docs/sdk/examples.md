# SDK Examples Guide

Status: source-only examples documentation. Examples here are
copy-ready documentation examples only. They are not executable fixtures,
package samples, workflow jobs, package install instructions, external calls,
runtime calls, or live MCP operations.

## Source Basis

- `docs/sdk/mcp.md`
- `docs/sdk/agent.md`
- `docs/sdk/conformance.md`
- `docs/architecture/SDK_INFORMATION_ARCHITECTURE.md`
- `docs/architecture/SDK_DOCUMENTATION_EXPANSION_PLAN.md`
- `docs/architecture/SDK_DOCUMENTATION_INVENTORY.md`
- `packages/mcp/src/index.ts`
- `packages/mcp/test/packet-inspection-adapter.test.ts`
- `packages/mcp/test/stdio-smoke.test.ts`
- `packages/packets/fixtures/valid/context-packet.json`
- `packages/packets/src/startup-wizard-policy-profile.ts`

## Example Rules

Every example in this guide must preserve:

- Gateway authority or repo-local read-only authority.
- Human policy gate and Gateway review boundary.
- Audit obligation.
- Closed live behavior.
- Expected side effects as `[]`.

Do not add package install commands, lockfile updates, network calls, DB writes,
deploys, release commands, workflow execution, MCP mutation, secret values,
storage/network mutation, auth provider wiring, policy activation, runtime
dispatch, live adapter invocation, or live side effects.

## MCP Read-Only Project-State Inspection

Use this request shape for the canonical local stdio tool:

```json
{
  "name": "lnsat.project.state.inspect.v0_1",
  "arguments": {
    "request_id": "req_project_state_doc_example",
    "item_id": "state-item-mcp-inspection"
  }
}
```

A successful adapter response preserves Gateway authority:

```json
{
  "ok": true,
  "tool": "lnsat.project.state.inspect.v0_1",
  "gateway_contract_id": "lnsat.gateway.project_state.v0_1",
  "gateway_response": {
    "ok": true,
    "contract_id": "lnsat.gateway.project_state.v0_1",
    "schema_version": "0.1",
    "request_id": "req_project_state_doc_example",
    "selected_item": {
      "item_id": "state-item-mcp-inspection",
      "source_path": "fixtures/project-state/items/state-item-mcp-inspection.json",
      "side_effects": []
    },
    "side_effects": []
  },
  "side_effects": []
}
```

The deprecated legacy tool is a separate compatibility API. It keeps its exact
legacy request and response vocabulary until the documented removal window;
new integrations should use the canonical request above.

## MCP Read-Only Packet Inspection

Use this shape when documenting local stdio read-only packet inspection. It is a
documentation payload, not a command to run.

```json
{
  "request_id": "stdio_bp0396_packet_inspection_doc_example",
  "tool_call": {
    "name": "lnsat.packet.inspect",
    "arguments": {
      "request_id": "req_bp0396_packet_inspection_doc_example",
      "packet": {
        "packet_id": "pkt_context_0001",
        "packet_type": "ContextPacket",
        "version": "0.1",
        "project_id": "hypler",
        "actor_id": "agent.codex",
        "session_id": "sess_bp0002_0001",
        "intent": "Compile source-backed context for a bounded packet task.",
        "risk_level": 1,
        "source_refs": ["doc:docs/architecture/PACKET_MODEL.md"],
        "resource_refs": ["repo:lnsat"],
        "policy_profile": "context_readonly",
        "permission_envelope": {
          "allow": ["context.read", "context.compile"],
          "block": ["secret.read.never", "deploy.execute.approved"]
        },
        "budget": {
          "tokens": 8000,
          "runtime_seconds": 300,
          "cost_usd": 0.25,
          "cpu": 1,
          "memory_mb": 512
        },
        "constraints": {
          "output_contract": "summary_with_source_refs"
        },
        "requires_approval": false,
        "ttl_seconds": 3600,
        "created_at": "2026-05-03T00:00:00Z"
      }
    }
  }
}
```

Expected read-only response shape:

```json
{
  "ok": true,
  "transport": "local_stdio_smoke",
  "status": "read_only_stdio_example",
  "request_id": "stdio_packet_inspection_example",
  "mcp_response": {
    "ok": true,
    "tool": "lnsat.packet.inspect",
    "is_error": false,
    "content": [
      {
        "type": "json",
        "json": {
          "ok": true,
          "tool": "lnsat.packet.inspect",
          "gateway_contract_id": "lnsat.gateway.packet_inspection.v0_1",
          "gateway_response": {
            "ok": true,
            "request_id": "req_packet_inspection_example",
            "packet_ref": {
              "packet_id": "pkt_context_0001",
              "packet_type": "ContextPacket"
            },
            "validation": {
              "ok": true,
              "errors": []
            },
            "policy_decision": {
              "decision": "allow",
              "requires_approval": false
            },
            "side_effects": []
          },
          "side_effects": []
        }
      }
    ],
    "side_effects": []
  },
  "side_effects": []
}
```

Example notes:

| Requirement          | Value                                                                                                                       |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Source refs          | `packages/mcp/src/index.ts`, `packages/mcp/test/stdio-smoke.test.ts`, `packages/packets/fixtures/valid/context-packet.json` |
| Gateway authority    | `lnsat.gateway.packet_inspection.v0_1`                                                                                      |
| Policy gate          | `policy_decision.decision: "allow"` with `requires_approval: false`; Gateway remains authority.                             |
| Audit obligation     | Packet validation and policy check remain audit-preview evidence, not persisted audit rows.                                 |
| Closed live behavior | No hosted listener, MCP mutation, DB write, secret read, external call, runtime dispatch, or live execution.                |
| Side effects         | `[]`                                                                                                                        |

## MCP Unknown Tool Fail-Closed Example

Use this example when documenting negative MCP behavior. It must stay a
documentation example until a later packet opens executable fixtures.

```json
{
  "name": "lnsat.platform.runtime.dispatch.execute",
  "arguments": {
    "request_id": "req_bp0396_forbidden_dispatch_doc_example"
  }
}
```

Expected fail-closed shape:

```json
{
  "ok": false,
  "server_id": "lnsat.mcp.read_only.v0_1",
  "tool": null,
  "is_error": true,
  "content": [],
  "error": {
    "code": "mcp.unknown_tool",
    "path": "/name",
    "message": "MCP tool is not registered on this read-only server.",
    "severity": "error"
  },
  "side_effects": []
}
```

Example notes:

| Requirement          | Value                                                                                               |
| -------------------- | --------------------------------------------------------------------------------------------------- |
| Source refs          | `packages/mcp/src/index.ts`, `docs/sdk/conformance.md`                                              |
| Gateway authority    | Unknown tools never reach Gateway execution; read-only MCP server denies at registration boundary.  |
| Policy gate          | Treat unknown tool as denial, not partial permission.                                               |
| Audit obligation     | Keep denial evidence as inspection evidence only until audit persistence opens.                     |
| Closed live behavior | Runtime dispatch, broker dispatch, adapter invocation, DB, network, and live execution stay closed. |
| Side effects         | `[]`                                                                                                |

## Agent Policy Profile Output

Use this output excerpt when documenting startup-wizard agent policy profile
handoff. It is a copy-ready documentation excerpt, not a complete fixture.

```json
{
  "ok": true,
  "policy_profile": {
    "contract_id": "lnsat.policy_profile.v0_1",
    "packet_ref": "pkt_example_startup",
    "profile_id": "startup_wizard_source_preview",
    "selected_deployment_mode": "local_single_user",
    "selected_control_level": "assist",
    "generated_views": {
      "markdown_summary": "# LNSAT Startup Wizard Policy Profile\n\nCanonical manifest: lnsat.policy_profile.v0_1\nControl levels: Observe, Assist, Managed Autonomy, Strict, Locked Down\nAgent managers can review, draft, triage, and recommend. Human managers activate policy.\nNo secret values, live execution, database writes, DNS mutation, SSH, Docker runner, node-agent, or package mutation are enabled.",
      "json_schema": {
        "$id": "lnsat.policy_profile.v0_1.schema.json",
        "type": "object",
        "additionalProperties": false
      },
      "mcp_capability_descriptors": [
        {
          "descriptor_id": "mcp_descriptor:source-review",
          "skillset_id": "source-review",
          "capabilities": ["source.read", "source.diff.inspect", "proposal.draft"],
          "allowed_resources": ["repo_files"],
          "blocked_resources": ["secrets", "git_mutation"],
          "approval_needs": ["human_manager_for_staging_or_execution"]
        }
      ],
      "agent_context_snippets": [
        "Read canonical JSON manifest first: lnsat.policy_profile.v0_1.",
        "Treat unknown capability as denied.",
        "Agent managers may draft recommendations but cannot activate policy or grant themselves authority.",
        "Policy rows: read.*=allowed; notify.*=allowed; proposal.draft=allowed; stage.preview=approval_required; execute.approved=approval_required; policy.activate=approval_required; database.write=blocked; database.prod.write=blocked; secret.read.never=blocked; ssh=blocked; root=blocked; billing.write=blocked; security.write=blocked; destructive.execute=blocked"
      ]
    },
    "secret_values": [],
    "auth_provider_wiring": [],
    "storage_writes": [],
    "network_exposure_mutations": [],
    "policy_activations": [],
    "runtime_dispatches": [],
    "live_executions": [],
    "database_connections": [],
    "database_writes": [],
    "external_service_calls": [],
    "side_effects": []
  },
  "side_effects": []
}
```

Example notes:

| Requirement          | Value                                                                                                                         |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Source refs          | `packages/packets/src/startup-wizard-policy-profile.ts`, `docs/sdk/agent.md`, `docs/sdk/conformance.md`                       |
| Gateway authority    | Policy profile is preview/context evidence; Gateway remains authority for policy enforcement.                                 |
| Policy gate          | Human managers activate policy; agent managers cannot activate policy or self-grant authority.                                |
| Audit obligation     | Context snippets and policy rows must be carried as evidence for later review.                                                |
| Closed live behavior | No auth provider wiring, policy activation, runtime dispatch, DB, external call, storage/network mutation, or live execution. |
| Side effects         | `[]`                                                                                                                          |

## Agent Policy Profile Fail-Closed Example

Use this example when documenting denied agent policy-profile output.

```json
{
  "ok": false,
  "errors": [
    {
      "code": "startup_wizard.approval_manager_required",
      "path": "/policy_rules/4/approval_manager",
      "message": "Agent manager cannot be the final approval authority."
    },
    {
      "code": "startup_wizard.side_effects_forbidden",
      "path": "/side_effects",
      "message": "Startup wizard contract must preserve side_effects: []."
    }
  ],
  "raw_input_content": "withheld",
  "side_effects": []
}
```

Example notes:

| Requirement          | Value                                                                                      |
| -------------------- | ------------------------------------------------------------------------------------------ |
| Source refs          | `packages/packets/src/startup-wizard-policy-profile.ts`, `docs/sdk/conformance.md`         |
| Gateway authority    | Denied policy-profile output does not create authority outside Gateway review.             |
| Policy gate          | Approval-required rows require human approval managers.                                    |
| Audit obligation     | Raw unsafe input stays withheld; denial evidence remains documentation evidence.           |
| Closed live behavior | No policy activation, self-grant, secret echo, runtime dispatch, DB write, or side effect. |
| Side effects         | `[]`                                                                                       |

## Boundary

Examples are source-only documentation. They do not approve executable
examples, conformance runners, SDK package creation, package mutation,
publication, package install/update, lockfile refresh, runtime behavior, DB,
deploy, release creation, Docker, SSH, node-agent, secrets, external calls, MCP
mutation, auth provider wiring, policy activation, storage/network mutation,
GitHub mutation, workflow execution, Git push, or live side effects.
