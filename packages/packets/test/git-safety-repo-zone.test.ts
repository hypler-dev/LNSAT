import { describe, expect, it } from "vitest";
import {
  createGitSafetyRepoZone,
  defaultGitSafetyRepoZoneMap,
  gitSafetyRepoZoneContract,
  type GitSafetyRepoZoneMap,
} from "../src/index.js";

describe("Git safety repo-zone contract", () => {
  it("emits source-only Git safety and repo-zone evidence", () => {
    const result = createGitSafetyRepoZone();

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected Git safety repo-zone success");
    }

    expect(result.git_safety).toMatchObject({
      contract_id: gitSafetyRepoZoneContract.contract_id,
      repo_zone_version: "0.1",
      repo_zones: [
        "read_zone",
        "proposal_zone",
        "branch_write_zone",
        "protected_zone",
        "forbidden_destructive_operation",
      ],
      live_git_execution_allowed: false,
      side_effects: [],
    });
    expect(result.git_safety.repo_zone_map).toMatchObject({
      read_zone: {
        allowed_operations: [
          "git.diff.read",
          "git.log.read",
          "git.refs.read",
          "git.show.read",
          "git.status.read",
        ],
        approval_required: false,
        policy_gate: null,
      },
      branch_write_zone: {
        allowed_operations: [
          "git.branch.write.request",
          "git.commit.create.request",
          "git.push.branch.request",
          "git.stage.request",
        ],
        policy_gate: "repo.branch_write.approval",
        approval_required: true,
      },
      protected_zone: {
        policy_gate: "repo.protected_operation.approval",
        approval_required: true,
      },
      forbidden_destructive_operation: {
        allowed_operations: [],
        denied_operations: [
          "git.branch.delete",
          "git.clean_force.execute",
          "git.force_push.write",
          "git.history.delete",
          "git.reset_hard.execute",
          "git.tag.delete",
        ],
      },
    });
    expect(result.git_safety.allowed_git_operations).toEqual(
      expect.arrayContaining([
        "git.status.read",
        "git.patch.propose",
        "git.branch.write.request",
        "git.protected_branch.request",
      ]),
    );
    expect(result.git_safety.denied_git_operations).toEqual(
      expect.arrayContaining([
        "git.reset_hard.execute",
        "git.force_push.write",
        "git.protected_branch.write",
      ]),
    );
    expect(result.git_safety.required_policy_gates).toEqual([
      "repo.branch_write.approval",
      "repo.protected_operation.approval",
    ]);
    expect(result.git_safety.approval_required_operations).toEqual(
      expect.arrayContaining(["git.commit.create.request", "git.merge.request"]),
    );
    expect(result.git_safety.rollback_expectations).toEqual(
      expect.arrayContaining([
        "branch writes require base ref, changed file list, tests, and rollback pointer",
        "protected operations require explicit policy decision, approval ref, and rollback owner",
      ]),
    );
    expect(result.git_safety.source_refs).toEqual(
      expect.arrayContaining([
        "doc:docs/architecture/POLICY_AND_AUDIT.md",
        "doc:docs/reference/CONTRACT_PROVENANCE.md",
      ]),
    );
    expect(result.side_effects).toEqual([]);
  });

  it("accepts additional safe source refs without live collection or mutation", () => {
    const result = createGitSafetyRepoZone({
      source_refs: [
        {
          source_ref: "ticket:BP-0088",
          summary: "Git safety contract keeps repo mutation policy gated",
        },
      ],
      side_effects: [],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected Git safety source-ref success");
    }

    expect(result.git_safety.source_refs).toEqual(
      expect.arrayContaining([
        "ticket:BP-0088: Git safety contract keeps repo mutation policy gated",
      ]),
    );
    expect(result.git_safety.live_git_execution_allowed).toBe(false);
    expect(result.git_safety.side_effects).toEqual([]);
  });

  it("fails closed when protected operations are moved into ungated zones", () => {
    const repoZoneMap: GitSafetyRepoZoneMap = {
      ...defaultGitSafetyRepoZoneMap,
      proposal_zone: {
        ...defaultGitSafetyRepoZoneMap.proposal_zone,
        allowed_operations: [
          ...defaultGitSafetyRepoZoneMap.proposal_zone.allowed_operations,
          "git.merge.request",
        ],
      },
      protected_zone: {
        ...defaultGitSafetyRepoZoneMap.protected_zone,
        policy_gate: null,
        approval_required: false,
      },
    };
    const result = createGitSafetyRepoZone({ repo_zone_map: repoZoneMap });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected protected-zone failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        {
          code: "git_safety.protected_operation_requires_gate",
          path: "/repo_zone_map/proposal_zone/allowed_operations/4",
          message: "Protected or write Git operations require gated repo zones.",
          severity: "error",
        },
        {
          code: "git_safety.protected_operation_requires_gate",
          path: "/repo_zone_map/protected_zone/policy_gate",
          message:
            "Branch write and protected repo zones require policy gate and approval.",
          severity: "error",
        },
      ]),
    );
  });

  it("fails closed for destructive Git requests, live execution, side effects, and raw echo", () => {
    const repoZoneMap: GitSafetyRepoZoneMap = {
      ...defaultGitSafetyRepoZoneMap,
      branch_write_zone: {
        ...defaultGitSafetyRepoZoneMap.branch_write_zone,
        allowed_operations: [
          ...defaultGitSafetyRepoZoneMap.branch_write_zone.allowed_operations,
          "git.reset_hard.execute",
        ],
      },
      read_zone: {
        ...defaultGitSafetyRepoZoneMap.read_zone,
        summary: "read DATABASE_URL TOKEN and run git reset hard",
      },
    };
    const result = createGitSafetyRepoZone({
      repo_zone_map: repoZoneMap,
      live_git_execution_allowed: true,
      side_effects: [{ effect_type: "git reset" }],
      command: "rm -rf .git",
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected destructive Git failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        {
          code: "git_safety.unexpected_field",
          path: "/command",
          message: "Unexpected Git safety request field.",
          severity: "error",
        },
        {
          code: "git_safety.invalid_repo_zone",
          path: "/repo_zone_map/read_zone/summary",
          message: "Repo zone summary must be a safe non-secret string.",
          severity: "error",
        },
        {
          code: "git_safety.destructive_operation_forbidden",
          path: "/repo_zone_map/branch_write_zone/allowed_operations/4",
          message: "Destructive Git operations are forbidden by this contract.",
          severity: "error",
        },
        {
          code: "git_safety.live_git_execution_forbidden",
          path: "/live_git_execution_allowed",
          message: "Git safety contract cannot enable live Git execution.",
          severity: "error",
        },
        {
          code: "git_safety.side_effects_forbidden",
          path: "/side_effects",
          message: "Git safety contract must preserve side_effects: [].",
          severity: "error",
        },
      ]),
    );
    expect(JSON.stringify(result)).not.toContain("DATABASE_URL");
    expect(JSON.stringify(result)).not.toContain("TOKEN");
    expect(JSON.stringify(result)).not.toContain("rm -rf");
  });
});
