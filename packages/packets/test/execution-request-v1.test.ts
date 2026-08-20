import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  EXECUTION_PROPOSAL_SCHEMA_V1_0,
  EXECUTION_REQUEST_DERIVATION_PROFILE_V1,
  EXECUTION_REQUEST_SCHEMA_V1_0,
  EXECUTION_REQUEST_V1_STATUS,
  ExecutionRequestV1Error,
  deriveExecutionRequestV1,
  hashPacketEnvelopeV1,
  parseExecutionProposalV1,
  type ExecutionRequestV1Input,
  type PacketEnvelopeV1,
} from "../src/index.js";
import { canonicalizeJsonValue } from "../src/canonical.js";

const repoRoot = dirname(dirname(dirname(dirname(fileURLToPath(import.meta.url)))));

describe("@lnsat/packets packet-embedded execution request v1", () => {
  it("parses exact packet-embedded proposal without granting authority", async () => {
    const packet = await packetWithProposal();

    expect(EXECUTION_REQUEST_V1_STATUS).toBe("contract_only");
    expect(parseExecutionProposalV1(packet)).toEqual({
      schema_id: EXECUTION_PROPOSAL_SCHEMA_V1_0,
      derivation_profile: EXECUTION_REQUEST_DERIVATION_PROFILE_V1,
      action: {
        kind: "git.commit",
        arguments: {
          message: "bounded fixture commit",
          path: "fixture.txt",
        },
      },
      target: {
        resource_ref: "repo:lnsat",
        identity: {
          base: "fixture-base",
          repository: "fixture",
        },
      },
      configuration_digest: `sha256:${"c".repeat(64)}`,
      adapter: {
        ref: "adapter:local:git-commit",
        version: "v1",
      },
      executable_digest: `sha256:${"e".repeat(64)}`,
      audience: "audience:gateway:local",
    });
  });

  it("derives canonical chain plus lowercase domain-separated digests", async () => {
    const input = await validInput();
    const derived = await deriveExecutionRequestV1(input);

    expect(derived.request).toEqual({
      contract_version: "lnsat.contracts.v1_0",
      schema_id: EXECUTION_REQUEST_SCHEMA_V1_0,
      derivation_profile: EXECUTION_REQUEST_DERIVATION_PROFILE_V1,
      packet_ref: {
        schema_id: "lnsat.packet_envelope.schema.v1_0",
        packet_id: input.packet.packet_id,
        packet_sha256: input.packet_sha256,
      },
      policy_decision_ref: {
        schema_id: "lnsat.policy_decision.schema.v1_0",
        decision_id: input.policy_decision_id,
      },
      approval_request_ref: {
        schema_id: "lnsat.approval_request.schema.v1_0",
        approval_request_id: input.approval_request_id,
      },
      approval_decision_ref: {
        schema_id: "lnsat.approval_decision.schema.v1_0",
        approval_decision_id: input.approval_decision_id,
      },
      requester_ref: input.requester_ref,
      requester_session_ref: input.requester_session_ref,
      approver_ref: input.approver_ref,
      approver_session_ref: input.approver_session_ref,
      project_ref: "project:lnsat",
      resource_ref: "repo:lnsat",
      action: {
        kind: "git.commit",
        arguments: {
          message: "bounded fixture commit",
          path: "fixture.txt",
        },
      },
      target: {
        resource_ref: "repo:lnsat",
        identity: {
          base: "fixture-base",
          repository: "fixture",
        },
      },
      configuration_digest: `sha256:${"c".repeat(64)}`,
      adapter: {
        ref: "adapter:local:git-commit",
        version: "v1",
      },
      executable_digest: `sha256:${"e".repeat(64)}`,
      audience: "audience:gateway:local",
      prepared_at: input.prepared_at,
      expires_at: input.expires_at,
    });
    expect(derived.canonical_request).toBe(canonicalizeJsonValue(derived.request));
    expect(derived.request_digest).toBe(sha256Text(derived.canonical_request));
    expect(derived.action_digest).toBe(
      domainDigest("lnsat.execution-request.action.v1", derived.request.action),
    );
    expect(derived.target_digest).toBe(
      domainDigest("lnsat.execution-request.target.v1", derived.request.target),
    );
    expect(derived.configuration_digest).toBe(`sha256:${"c".repeat(64)}`);
    expect(derived.executable_digest).toBe(`sha256:${"e".repeat(64)}`);
    for (const digest of [
      derived.request_digest,
      derived.action_digest,
      derived.target_digest,
      derived.configuration_digest,
      derived.executable_digest,
    ]) {
      expect(digest).toMatch(/^sha256:[0-9a-f]{64}$/u);
    }
  });

  it("matches shared Rust and TypeScript conformance vector", async () => {
    const fixture = JSON.parse(
      await readFile(
        join(repoRoot, "fixtures", "contracts", "execution-request-v1_0.json"),
        "utf8",
      ),
    ) as {
      packet_vector: {
        vector_index: number;
        permission_allow_override: string[];
        requires_approval: boolean;
      };
      proposal: PacketEnvelopeV1["constraints"]["execution_proposal"];
      chain: Omit<ExecutionRequestV1Input, "packet" | "packet_sha256">;
      expected: {
        packet_sha256: ExecutionRequestV1Input["packet_sha256"];
        canonical_request: string;
        request_digest: string;
        action_digest: string;
        target_digest: string;
        configuration_digest: string;
        executable_digest: string;
        execution_authorized: boolean;
        side_effects: unknown[];
      };
    };
    const packetFixture = JSON.parse(
      await readFile(
        join(repoRoot, "fixtures", "contracts", "packet-envelope-v1_0.json"),
        "utf8",
      ),
    ) as { vectors: Array<{ packet: PacketEnvelopeV1 }> };
    const base = packetFixture.vectors[fixture.packet_vector.vector_index]?.packet;
    if (base === undefined) throw new Error("shared packet vector missing");
    const packet: PacketEnvelopeV1 = {
      ...base,
      permission_envelope: {
        allow: [...fixture.packet_vector.permission_allow_override],
        block: [...base.permission_envelope.block],
      },
      constraints: {
        ...base.constraints,
        execution_proposal: fixture.proposal,
      },
      requires_approval: fixture.packet_vector.requires_approval,
    };
    const packetHash = await hashPacketEnvelopeV1(packet);
    expect(packetHash).toBe(fixture.expected.packet_sha256);
    const derived = await deriveExecutionRequestV1({
      packet,
      packet_sha256: packetHash,
      ...fixture.chain,
    });
    expect(derived.canonical_request).toBe(fixture.expected.canonical_request);
    expect(derived.request_digest).toBe(fixture.expected.request_digest);
    expect(derived.action_digest).toBe(fixture.expected.action_digest);
    expect(derived.target_digest).toBe(fixture.expected.target_digest);
    expect(derived.configuration_digest).toBe(fixture.expected.configuration_digest);
    expect(derived.executable_digest).toBe(fixture.expected.executable_digest);
    expect(fixture.expected.execution_authorized).toBe(false);
    expect(fixture.expected.side_effects).toEqual([]);
  });

  it("rejects missing, widened, mismatched, and noncanonical proposals", async () => {
    const base = await packetWithProposal();
    const withoutProposal = {
      ...base,
      constraints: { writes: "workspace_only" },
    };
    expectCode(
      () => parseExecutionProposalV1(withoutProposal),
      "execution_request.proposal_missing",
    );

    const proposal = base.constraints.execution_proposal;
    if (!isObject(proposal)) throw new Error("proposal fixture missing");
    expectCode(
      () =>
        parseExecutionProposalV1({
          ...base,
          constraints: {
            ...base.constraints,
            execution_proposal: { ...proposal, future_authority: true },
          },
        }),
      "execution_request.proposal_invalid",
    );
    expectCode(
      () =>
        parseExecutionProposalV1({
          ...base,
          constraints: {
            ...base.constraints,
            execution_proposal: {
              ...proposal,
              configuration_digest: `sha256:${"A".repeat(64)}`,
            },
          },
        }),
      "execution_request.proposal_invalid",
    );
    const adapter = proposal.adapter;
    if (!isObject(adapter)) throw new Error("adapter fixture missing");
    expectCode(
      () =>
        parseExecutionProposalV1({
          ...base,
          constraints: {
            ...base.constraints,
            execution_proposal: {
              ...proposal,
              adapter: { ...adapter, ref: "adapter:local@git-commit" },
            },
          },
        }),
      "execution_request.proposal_invalid",
    );
    const target = proposal.target;
    if (!isObject(target)) throw new Error("target fixture missing");
    expectCode(
      () =>
        parseExecutionProposalV1({
          ...base,
          constraints: {
            ...base.constraints,
            execution_proposal: {
              ...proposal,
              target: { ...target, resource_ref: "repo:not-approved" },
            },
          },
        }),
      "execution_request.proposal_invalid",
    );
    const action = proposal.action;
    if (!isObject(action)) throw new Error("action fixture missing");
    expectCode(
      () =>
        parseExecutionProposalV1({
          ...base,
          constraints: {
            ...base.constraints,
            execution_proposal: {
              ...proposal,
              action: { ...action, arguments: { count: 1.5 } },
            },
          },
        }),
      "execution_request.proposal_invalid",
    );
  });

  it("fails closed on packet/hash, chain, and time drift", async () => {
    const input = await validInput();

    await expectCodeAsync(
      deriveExecutionRequestV1({
        ...input,
        packet_sha256: `sha256:${"0".repeat(64)}`,
      }),
      "execution_request.chain_invalid",
    );
    await expectCodeAsync(
      deriveExecutionRequestV1({
        ...input,
        approval_decision_id: `apd_${"A".repeat(64)}`,
      }),
      "execution_request.chain_invalid",
    );
    await expectCodeAsync(
      deriveExecutionRequestV1({
        ...input,
        prepared_at: input.expires_at,
      }),
      "execution_request.time_invalid",
    );
    await expectCodeAsync(
      deriveExecutionRequestV1({
        ...input,
        packet: {
          ...input.packet,
          packet_type: "NotAPacket" as PacketEnvelopeV1["packet_type"],
        },
      }),
      "execution_request.invalid_packet",
    );
  });
});

async function validInput(): Promise<ExecutionRequestV1Input> {
  const packet = await packetWithProposal();
  return {
    packet,
    packet_sha256: await hashPacketEnvelopeV1(packet),
    policy_decision_id: `pol_${"1".repeat(64)}`,
    approval_request_id: `apr_${"2".repeat(64)}`,
    approval_decision_id: `apd_${"3".repeat(64)}`,
    requester_ref: "identity:agent:codex",
    requester_session_ref: "session:local:agent-0001",
    approver_ref: "identity:human:owner",
    approver_session_ref: "session:local:owner-0001",
    prepared_at: "2026-07-22T20:03:00Z",
    expires_at: "2026-07-22T20:05:00Z",
  };
}

async function packetWithProposal(): Promise<PacketEnvelopeV1> {
  const fixture = JSON.parse(
    await readFile(
      join(repoRoot, "fixtures", "contracts", "packet-envelope-v1_0.json"),
      "utf8",
    ),
  ) as { vectors: Array<{ packet: PacketEnvelopeV1 }> };
  const packet = fixture.vectors[0]?.packet;
  if (packet === undefined) throw new Error("packet fixture missing");
  return {
    ...packet,
    permission_envelope: {
      allow: ["deploy.request"],
      block: [...packet.permission_envelope.block],
    },
    constraints: {
      ...packet.constraints,
      execution_proposal: {
        schema_id: EXECUTION_PROPOSAL_SCHEMA_V1_0,
        derivation_profile: EXECUTION_REQUEST_DERIVATION_PROFILE_V1,
        action: {
          kind: "git.commit",
          arguments: {
            path: "fixture.txt",
            message: "bounded fixture commit",
          },
        },
        target: {
          resource_ref: "repo:lnsat",
          identity: {
            repository: "fixture",
            base: "fixture-base",
          },
        },
        configuration_digest: `sha256:${"c".repeat(64)}`,
        adapter: {
          ref: "adapter:local:git-commit",
          version: "v1",
        },
        executable_digest: `sha256:${"e".repeat(64)}`,
        audience: "audience:gateway:local",
      },
    },
    requires_approval: true,
  };
}

function domainDigest(domain: string, value: unknown): string {
  const canonical = Buffer.from(canonicalizeJsonValue(value), "utf8");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(canonical.length);
  return `sha256:${createHash("sha256")
    .update(Buffer.from(domain, "utf8"))
    .update(Buffer.from([0]))
    .update(length)
    .update(canonical)
    .digest("hex")}`;
}

function sha256Text(value: string): string {
  return `sha256:${createHash("sha256").update(value, "utf8").digest("hex")}`;
}

function expectCode(
  operation: () => unknown,
  code: ExecutionRequestV1Error["code"],
): void {
  try {
    operation();
  } catch (error) {
    expect(error).toBeInstanceOf(ExecutionRequestV1Error);
    expect((error as ExecutionRequestV1Error).code).toBe(code);
    return;
  }
  throw new Error(`expected ${code}`);
}

async function expectCodeAsync(
  operation: Promise<unknown>,
  code: ExecutionRequestV1Error["code"],
): Promise<void> {
  await expect(operation).rejects.toMatchObject({ code });
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
