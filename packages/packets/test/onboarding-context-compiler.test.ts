import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  compileOnboardingContextPacket,
  onboardingContextCompilerContract,
  validateUniversalPacket,
} from "../src/index.js";

const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const fixtureRoot = join(packageRoot, "fixtures");
const projectProfileRef =
  "packages/packets/fixtures/project-profiles/valid/lnsat-project-profile.json";
const agentProfileRef =
  "packages/packets/fixtures/agent-profiles/valid/codex-observer-profile.json";
const compiledAt = new Date("2026-05-04T00:00:00.000Z");

describe("onboarding ContextPacket compiler contract", () => {
  it("compiles validated repo-local onboarding profiles into a read-only ContextPacket proposal", async () => {
    const request = await validCompilerRequest();
    const result = await compileOnboardingContextPacket(request, { now: compiledAt });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected compiler success");
    }

    expect(result.contract_id).toBe(onboardingContextCompilerContract.contract_id);
    expect(result.side_effects).toEqual([]);
    expect(result.trusted_source_refs).toEqual(
      expect.arrayContaining([
        `fixture:${projectProfileRef}`,
        `fixture:${agentProfileRef}`,
        "doc:docs/onboarding/PROJECT_ONBOARDING.md",
        "doc:docs/onboarding/AGENT_ONBOARDING.md",
        "doc:docs/reference/CONTRACT_PROVENANCE.md",
      ]),
    );
    expect(result.packet_ref).toMatchObject({
      packet_id: "pkt_onboarding_context_lnsat_agent_codex",
      packet_type: "ContextPacket",
      packet_hash: expect.stringMatching(/^sha256:[a-f0-9]{64}$/),
    });
    expect(result.context_packet).toMatchObject({
      packet_type: "ContextPacket",
      project_id: "lnsat",
      actor_id: "agent.codex",
      risk_level: 1,
      policy_profile: "onboarding_read_only",
      requires_approval: false,
      ttl_seconds: 7200,
      source_refs: expect.arrayContaining([
        `fixture:${projectProfileRef}`,
        `fixture:${agentProfileRef}`,
      ]),
      resource_refs: expect.arrayContaining([
        "project:lnsat",
        "actor:agent.codex",
        "repo:lnsat-main",
        "domain:lnsat.example.invalid",
      ]),
      permission_envelope: {
        allow: ["context.compile", "context.read", "repo.read"],
        block: expect.arrayContaining([
          "secret.read.never",
          "raw_shell",
          "deploy.prod",
        ]),
      },
      budget: {
        tokens: 120000,
        runtime_seconds: 7200,
        cost_usd: 10,
        cpu: 0,
        memory_mb: 0,
      },
      constraints: expect.objectContaining({
        compiler_contract_id: onboardingContextCompilerContract.contract_id,
        project_profile_ref: projectProfileRef,
        agent_profile_ref: agentProfileRef,
        side_effects: [],
      }),
    });
    expect(validateUniversalPacket(result.context_packet)).toMatchObject({
      ok: true,
      errors: [],
    });
    expect(result.validation).toMatchObject({ ok: true, errors: [] });
  });

  it("rejects malformed compiler inputs fail-closed without raw rejected command echo", async () => {
    const result = await compileOnboardingContextPacket(
      {
        request_id: "ctx-compile-bad",
        project_profile_ref: projectProfileRef,
        agent_profile_ref: agentProfileRef,
        project_profile: {},
        agent_profile: {},
        created_at: "rm -rf /",
        command: "rm -rf /",
      },
      { now: compiledAt },
    );

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected compiler failure");
    }

    expect(result).toMatchObject({
      ok: false,
      request_id: "ctx-compile-bad",
      trusted_source_refs: [],
      packet_ref: null,
      context_packet: null,
      validation: null,
      raw_input_content: "withheld",
      side_effects: [],
    });
    expect(result.errors).toContainEqual({
      code: "onboarding_context.unexpected_field",
      path: "/command",
      message: "Unexpected onboarding ContextPacket compiler request field.",
      severity: "error",
    });
    expect(result.errors).toContainEqual({
      code: "onboarding_context.invalid_created_at",
      path: "/created_at",
      message: "Compiler created_at must be an ISO UTC timestamp.",
      severity: "error",
    });
    expect(JSON.stringify(result)).not.toContain("rm -rf /");
  });

  it("rejects invalid profile inputs without raw secret value echo", async () => {
    const request = await validCompilerRequest();
    const result = await compileOnboardingContextPacket(
      {
        ...request,
        agent_profile: await readJson(
          "agent-profiles/invalid/rejects-secret-value.json",
        ),
      },
      { now: compiledAt },
    );

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected compiler failure");
    }

    expect(result.errors).toContainEqual({
      code: "onboarding_context.agent_profile_rejected",
      path: "/agent_profile",
      message: "Agent profile failed closed validation.",
      severity: "error",
    });
    expect(result.profile_errors).toContainEqual({
      code: "agent_profile.secret_value_embedded",
      path: "/session/secret_value",
      message: "Agent profile secrets must use references only.",
      severity: "error",
    });
    expect(JSON.stringify(result)).not.toContain("redacted-inline-agent-secret");
  });

  it("rejects agents not scoped to the project before packet emission", async () => {
    const request = await validCompilerRequest();
    const result = await compileOnboardingContextPacket(
      {
        ...request,
        agent_profile: {
          ...(request.agent_profile as Record<string, unknown>),
          projects_allowed: ["other-project"],
        },
      },
      { now: compiledAt },
    );

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected compiler failure");
    }

    expect(result.errors).toContainEqual({
      code: "onboarding_context.project_scope_rejected",
      path: "/agent_profile/projects_allowed",
      message: "Agent profile is not scoped to the requested project.",
      severity: "error",
    });
    expect(result.context_packet).toBeNull();
    expect(result.packet_ref).toBeNull();
  });
});

async function validCompilerRequest() {
  return {
    request_id: "ctx-compile-001",
    project_profile_ref: projectProfileRef,
    agent_profile_ref: agentProfileRef,
    project_profile: await readJson(
      "project-profiles/valid/lnsat-project-profile.json",
    ),
    agent_profile: await readJson("agent-profiles/valid/codex-observer-profile.json"),
    session_id: "sess_onboarding_context_0001",
    created_at: compiledAt.toISOString(),
  };
}

async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(join(fixtureRoot, path), "utf8"));
}
