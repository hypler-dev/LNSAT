import { describe, expect, it } from "vitest";
import {
  containerPacketContract,
  createContainerPacket,
  defaultContainerPacket,
  type ContainerPacketEvidence,
} from "../src/index.js";

describe("container packet contract", () => {
  it("emits source-only container packet evidence", () => {
    const result = createContainerPacket();

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected container packet success");
    }

    expect(result.container_packet).toMatchObject({
      contract_id: containerPacketContract.contract_id,
      container_packet_version: "0.1",
      packet_kinds: ["sandbox_test", "sandbox_build", "package_trial"],
      live_container_execution_allowed: false,
      side_effects: [],
      resource_limits: {
        cpu_cores: 2,
        memory_mb: 4096,
        disk_mb: 8192,
        pids: 256,
        runtime_seconds: 900,
      },
      network_rules: {
        profile: "disabled",
        outbound_allowlist: [],
        inbound_ports: [],
        dns_allowed: false,
      },
      boundaries: {
        no_secrets: true,
        no_host_mutation: true,
        no_privileged: true,
        no_host_network: true,
        no_docker_socket: true,
        no_root: true,
      },
    });
    expect(result.container_packet.container_packet.mount_rules).toEqual(
      expect.arrayContaining([
        {
          mount_type: "workspace_overlay",
          target: "/workspace",
          source_ref: "repo:working-tree-source-ref-only",
          readonly: false,
          host_mutation_allowed: false,
        },
        {
          mount_type: "artifact_output",
          target: "/artifacts",
          source_ref: "artifact:ephemeral-output-directory",
          readonly: false,
          host_mutation_allowed: false,
        },
      ]),
    );
    expect(result.container_packet.artifact_outputs).toEqual(
      expect.arrayContaining([
        {
          name: "test_logs",
          path: "/artifacts/test-logs",
          retention: "operator_review",
          required: true,
        },
      ]),
    );
    expect(result.container_packet.denied_runtime_behavior).toEqual(
      expect.arrayContaining([
        "container.privileged.run",
        "container.host_network.open",
        "container.docker_socket.mount",
        "container.secret.inject",
        "host.mutation.execute",
      ]),
    );
    expect(result.container_packet.required_approvals).toEqual([
      "container.artifact_output.approval",
      "container.resource_limit.approval",
      "container.sandbox.policy_review",
    ]);
    expect(result.container_packet.source_refs).toEqual(
      expect.arrayContaining([
        "doc:docs/architecture/SUBSTRATES_AND_NODES.md",
        "doc:docs/reference/CONTRACT_PROVENANCE.md",
        "ticket:BP-0089: source-only container packet contract",
      ]),
    );
    expect(result.side_effects).toEqual([]);
  });

  it("accepts safe source refs while keeping live execution closed", () => {
    const result = createContainerPacket({
      source_refs: [
        {
          source_ref: "ticket:BP-0089",
          summary: "container contract stays source only",
        },
      ],
      side_effects: [],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected container source-ref success");
    }

    expect(result.container_packet.source_refs).toEqual(
      expect.arrayContaining(["ticket:BP-0089: container contract stays source only"]),
    );
    expect(result.container_packet.live_container_execution_allowed).toBe(false);
    expect(result.container_packet.side_effects).toEqual([]);
  });

  it("fails closed for privileged host-mounted network-open or secret-carrying requests", () => {
    const unsafePacket = {
      ...defaultContainerPacket,
      summary: "read API_KEY TOKEN and run privileged container",
      boundaries: {
        ...defaultContainerPacket.boundaries,
        no_secrets: false,
        no_privileged: false,
        no_host_network: false,
        no_docker_socket: false,
        no_root: false,
      },
      mount_rules: [
        {
          ...defaultContainerPacket.mount_rules[0],
          mount_type: "host_bind",
          source_ref: "/var/run/docker.sock",
          host_mutation_allowed: true,
        },
      ],
      network_rules: {
        profile: "open",
        outbound_allowlist: ["registry.npmjs.org"],
        inbound_ports: [3000],
        dns_allowed: true,
      },
      secret_refs: [{ name: "API_TOKEN", value: "sk-live-secret" }],
      live_container_execution_allowed: true,
      side_effects: [{ effect_type: "docker run" }],
    };

    const result = createContainerPacket({
      container_packet: unsafePacket,
      live_container_execution_allowed: true,
      side_effects: [{ effect_type: "container start" }],
      command: "docker run --privileged -e API_TOKEN=sk-live-secret",
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected unsafe container packet failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        {
          code: "container_packet.unexpected_field",
          path: "/command",
          message: "Unexpected container packet request field.",
          severity: "error",
        },
        {
          code: "container_packet.invalid_packet",
          path: "/container_packet/summary",
          message: "Container packet summary must be a safe non-secret string.",
          severity: "error",
        },
        {
          code: "container_packet.host_mount_forbidden",
          path: "/container_packet/mount_rules/0/mount_type",
          message: "Container mount type must be a safe ephemeral mount type.",
          severity: "error",
        },
        {
          code: "container_packet.host_mount_forbidden",
          path: "/container_packet/mount_rules/0/source_ref",
          message:
            "Container mount source_ref cannot point at host paths or host sockets.",
          severity: "error",
        },
        {
          code: "container_packet.host_mutation_forbidden",
          path: "/container_packet/mount_rules/0/host_mutation_allowed",
          message: "Container mounts cannot allow host mutation.",
          severity: "error",
        },
        {
          code: "container_packet.network_open_forbidden",
          path: "/container_packet/network_rules",
          message: "Container packet contract only permits disabled network rules.",
          severity: "error",
        },
        {
          code: "container_packet.secret_boundary_required",
          path: "/container_packet/boundaries/no_secrets",
          message: "Container packet must explicitly forbid secrets.",
          severity: "error",
        },
        {
          code: "container_packet.privileged_container_forbidden",
          path: "/container_packet/boundaries/no_privileged",
          message: "Container packet must explicitly forbid privileged containers.",
          severity: "error",
        },
        {
          code: "container_packet.secret_value_forbidden",
          path: "/container_packet/secret_refs",
          message: "Container packet cannot carry secrets or secret values.",
          severity: "error",
        },
        {
          code: "container_packet.live_execution_forbidden",
          path: "/live_container_execution_allowed",
          message: "Container packet contract cannot enable live container execution.",
          severity: "error",
        },
        {
          code: "container_packet.side_effects_forbidden",
          path: "/side_effects",
          message: "Container packet contract must preserve side_effects: [].",
          severity: "error",
        },
      ]),
    );
    expect(JSON.stringify(result)).not.toContain("API_TOKEN");
    expect(JSON.stringify(result)).not.toContain("sk-live-secret");
    expect(JSON.stringify(result)).not.toContain("docker run");
  });

  it("fails closed when resource limits or artifact expectations are missing", () => {
    const unsafePacket: ContainerPacketEvidence = {
      ...defaultContainerPacket,
      resource_limits: {
        cpu_cores: 0,
        memory_mb: 0,
        disk_mb: 0,
        pids: 0,
        runtime_seconds: 0,
      },
      artifact_outputs: [],
    };
    const result = createContainerPacket({ container_packet: unsafePacket });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected resource and artifact failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        {
          code: "container_packet.invalid_resource_limit",
          path: "/container_packet/resource_limits/cpu_cores",
          message: "Container resource limit must be an integer from 1 to 16.",
          severity: "error",
        },
        {
          code: "container_packet.invalid_artifact_output",
          path: "/container_packet/artifact_outputs",
          message: "Container packet requires artifact output expectations.",
          severity: "error",
        },
      ]),
    );
  });
});
