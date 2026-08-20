import { readFile } from "node:fs/promises";
import { join } from "node:path";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ConsoleShell } from "../src/app/console-shell.js";
import {
  consoleOperationReadback,
  findConsoleSection,
} from "../src/lib/console-model.js";

describe("Control Center browser operation readback", () => {
  it("uses exact API/shared JSON fixture evidence", async () => {
    const fixture = JSON.parse(
      await readFile(
        join(
          process.cwd(),
          "../../fixtures/console/operation-reconciliation-v0_1.json",
        ),
        "utf8",
      ),
    );
    expect(consoleOperationReadback).toEqual(fixture);
  });

  it("renders every required state and disabled retry control", () => {
    const section = findConsoleSection("operations");
    if (section === undefined) throw new Error("operations section missing");
    const html = renderToStaticMarkup(React.createElement(ConsoleShell, { section }));

    for (const state of [
      "stale",
      "degraded",
      "unavailable",
      "unknown",
      "reconciling",
      "expired",
      "orphaned",
      "receipt_pending",
    ]) {
      expect(html).toContain(`<strong>${state}</strong>`);
    }
    expect(html.match(/<button disabled=""/g)).toHaveLength(8);
    expect(html).toContain("Timeout and cancellation remain ambiguous");
    expect(html).toContain("Frontend cannot authorize or dispatch");
  });

  it("keeps AG-UI/MCP Apps presentation unable to create authority", () => {
    expect(consoleOperationReadback).toMatchObject({
      ui_action_transport: "gateway_only",
      frontend_can_authorize: false,
      sandbox_can_bypass_approval: false,
      runtime_connected: false,
      side_effects: [],
    });
    expect(
      consoleOperationReadback.operations.every(
        (operation) => operation.retry.runtime_mutation_open === false,
      ),
    ).toBe(true);
  });
});
