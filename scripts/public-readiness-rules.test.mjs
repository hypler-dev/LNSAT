import assert from "node:assert/strict";
import test from "node:test";

import {
  containsForbiddenInternalBuildPacketIdentifier,
  hasInternalBuildPacketIdentifier,
  isPublicMarkdownPath,
} from "./public-readiness-rules.mjs";

test("rejects every case variant of an internal build-packet identifier", () => {
  for (const identifier of ["BP-0001", "bp-0001", "Bp-0001", "bP-0001"]) {
    assert.equal(
      containsForbiddenInternalBuildPacketIdentifier("docs/example.md", identifier),
      true,
      identifier,
    );
  }
});

test("does not reject unrelated or malformed identifiers", () => {
  for (const value of ["packet-0001", "BP-001", "BP-00001", "ABP-0001"]) {
    assert.equal(hasInternalBuildPacketIdentifier(value), false, value);
  }
});

test("scans project Markdown except synthetic fixture documents", () => {
  for (const path of [
    "README.md",
    "docs/README.md",
    "apps/api/README.md",
    "packages/mcp/README.md",
  ]) {
    assert.equal(isPublicMarkdownPath(path), true, path);
  }

  assert.equal(isPublicMarkdownPath("fixtures/project-state/board.md"), false);
  assert.equal(isPublicMarkdownPath("packages/mcp/src/index.ts"), false);
  assert.equal(
    containsForbiddenInternalBuildPacketIdentifier(
      "fixtures/project-state/board.md",
      "BP-0001",
    ),
    false,
  );
});
