import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

export const PROJECT_STATE_GATEWAY_STATUS = "read_only";

export const projectStateGatewayContract = {
  contract_id: "lnsat.gateway.project_state.v0_1",
  method: "POST",
  path: "/v1/project-state/inspect",
  request_version: "0.1",
  response_version: "0.1",
  authority: ["synthetic-project-state-fixtures"],
  source_docs: [
    "fixtures/project-state/summary.json",
    "fixtures/project-state/items.md",
    "fixtures/project-state/activity-log.md",
    "fixtures/project-state/items/*.json",
  ],
  side_effects: [],
  status: "read_only",
} as const;

export type ProjectStateGatewayRequest = {
  request_id?: string;
  item_id?: string;
};

export type ProjectStateErrorCode =
  | "project_state.invalid_request"
  | "project_state.unexpected_field"
  | "project_state.invalid_request_id"
  | "project_state.invalid_item_id"
  | "project_state.item_not_found"
  | "project_state.source_unavailable";

export type ProjectStateError = {
  code: ProjectStateErrorCode;
  path: string;
  message: string;
  severity: "error";
};

export type ProjectStateSummary = {
  project: string | null;
  name: string | null;
  current_stage: string | null;
  active_item: string | null;
  next_item: string | null;
  state: string | null;
  last_verified: string | null;
  completed_items: string[];
  last_checks: string[];
};

export type ProjectStateItemRow = {
  item_id: string;
  stage: string;
  status: string;
  objective: string;
};

export type ProjectStateActivityEntry = {
  item_id: string;
  title: string;
};

export type ProjectStateItemsSummary = {
  active_item: string | null;
  queued_items: ProjectStateItemRow[];
  completed_items: ProjectStateItemRow[];
};

export type SelectedProjectStateItem = {
  item_id: string;
  source_path: string;
  stage: string | null;
  status: string | null;
  objective: string | null;
  acceptance_checks: string[];
  verification_commands: string[];
  side_effects: [];
};

export type ProjectStateGatewayResponse =
  | {
      ok: true;
      contract_id: typeof projectStateGatewayContract.contract_id;
      schema_version: typeof projectStateGatewayContract.response_version;
      request_id: string | null;
      source_docs: string[];
      project_state: ProjectStateSummary;
      items: ProjectStateItemsSummary;
      activity: {
        completed_items: ProjectStateActivityEntry[];
      };
      selected_item: SelectedProjectStateItem | null;
      side_effects: [];
    }
  | {
      ok: false;
      contract_id: typeof projectStateGatewayContract.contract_id;
      schema_version: typeof projectStateGatewayContract.response_version;
      request_id: string | null;
      source_docs: string[];
      errors: ProjectStateError[];
      side_effects: [];
    };

type NormalizedProjectStateRequest =
  | { ok: true; request_id: string | null; item_id: string | null }
  | { ok: false; request_id: string | null; errors: ProjectStateError[] };

type ProjectStateSummaryJson = {
  project?: unknown;
  name?: unknown;
  current_stage?: unknown;
  active_item?: unknown;
  next_item?: unknown;
  state?: unknown;
  last_verified?: unknown;
  completed_items?: unknown;
  last_checks?: unknown;
};

const LNSAT_REPO_ROOT = fileURLToPath(new URL("../../..", import.meta.url));
const requestKeys = new Set(["request_id", "item_id"]);

export async function inspectProjectStateGatewayRequest(
  input: unknown,
): Promise<ProjectStateGatewayResponse> {
  const normalized = normalizeRequest(input);
  if (!normalized.ok) {
    return failure(normalized.request_id, normalized.errors);
  }

  let summaryJson: ProjectStateSummaryJson;
  let itemsMarkdown: string;
  let activityMarkdown: string;
  try {
    [summaryJson, itemsMarkdown, activityMarkdown] = await Promise.all([
      readRepoJson<ProjectStateSummaryJson>("fixtures/project-state/summary.json"),
      readRepoText("fixtures/project-state/items.md"),
      readRepoText("fixtures/project-state/activity-log.md"),
    ]);
  } catch {
    return failure(normalized.request_id, [
      error(
        "project_state.source_unavailable",
        "",
        "Project-state source documents could not be read.",
      ),
    ]);
  }

  const selectedId =
    normalized.item_id ??
    stringOrNull(summaryJson.active_item) ??
    stringOrNull(summaryJson.next_item);
  const selectedItem =
    selectedId === null
      ? null
      : await readSelectedItem(selectedId, normalized.item_id !== null);
  if (selectedItem !== null && "errors" in selectedItem) {
    return failure(normalized.request_id, selectedItem.errors);
  }

  const completedItems = parseActivity(activityMarkdown);
  if (
    selectedItem?.status === "done" &&
    !completedItems.some((entry) => entry.item_id === selectedItem.item_id)
  ) {
    completedItems.push({
      item_id: selectedItem.item_id,
      title: selectedItem.objective ?? "Completed item",
    });
  }

  return {
    ok: true,
    contract_id: projectStateGatewayContract.contract_id,
    schema_version: projectStateGatewayContract.response_version,
    request_id: normalized.request_id,
    source_docs: sourceDocs(selectedItem?.source_path ?? null),
    project_state: summarize(summaryJson),
    items: summarizeItems(itemsMarkdown, summaryJson.active_item),
    activity: { completed_items: completedItems },
    selected_item: selectedItem,
    side_effects: [],
  };
}

function normalizeRequest(input: unknown): NormalizedProjectStateRequest {
  if (!isPlainObject(input)) {
    return {
      ok: false,
      request_id: null,
      errors: [
        error(
          "project_state.invalid_request",
          "",
          "Project-state request must be an object.",
        ),
      ],
    };
  }

  const errors: ProjectStateError[] = [];
  for (const key of Object.keys(input)) {
    if (!requestKeys.has(key)) {
      errors.push(
        error(
          "project_state.unexpected_field",
          jsonPointer(key),
          "Unexpected project-state request field.",
        ),
      );
    }
  }

  const requestId = typeof input.request_id === "string" ? input.request_id : null;
  if (Object.hasOwn(input, "request_id") && typeof input.request_id !== "string") {
    errors.push(
      error(
        "project_state.invalid_request_id",
        "/request_id",
        "Project-state request_id must be a string when provided.",
      ),
    );
  }

  const itemId = typeof input.item_id === "string" ? input.item_id : null;
  if (Object.hasOwn(input, "item_id") && typeof input.item_id !== "string") {
    errors.push(
      error(
        "project_state.invalid_item_id",
        "/item_id",
        "Project-state item id must be a string when provided.",
      ),
    );
  } else if (
    typeof input.item_id === "string" &&
    !/^state-item-[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(input.item_id)
  ) {
    errors.push(
      error(
        "project_state.invalid_item_id",
        "/item_id",
        "Project-state item id must use the state-item slug format.",
      ),
    );
  }

  return errors.length > 0
    ? { ok: false, request_id: requestId, errors }
    : { ok: true, request_id: requestId, item_id: itemId };
}

function failure(
  requestId: string | null,
  errors: ProjectStateError[],
): ProjectStateGatewayResponse {
  return {
    ok: false,
    contract_id: projectStateGatewayContract.contract_id,
    schema_version: projectStateGatewayContract.response_version,
    request_id: requestId,
    source_docs: sourceDocs(null),
    errors,
    side_effects: [],
  };
}

function error(
  code: ProjectStateErrorCode,
  path: string,
  message: string,
): ProjectStateError {
  return { code, path, message, severity: "error" };
}

async function readSelectedItem(
  itemId: string,
  requested: boolean,
): Promise<SelectedProjectStateItem | { errors: ProjectStateError[] } | null> {
  const sourcePath = `fixtures/project-state/items/${itemId}.json`;
  let item: Record<string, unknown>;
  try {
    item = await readRepoJson<Record<string, unknown>>(sourcePath);
  } catch {
    return requested
      ? {
          errors: [
            error(
              "project_state.item_not_found",
              "/item_id",
              "Requested project-state item was not found.",
            ),
          ],
        }
      : null;
  }

  return {
    item_id: stringOrNull(item.id) ?? itemId,
    source_path: sourcePath,
    stage: stringOrNull(item.stage),
    status: stringOrNull(item.status),
    objective: stringOrNull(item.objective),
    acceptance_checks: stringArray(item.acceptance_checks),
    verification_commands: stringArray(item.verification_commands),
    side_effects: [],
  };
}

function sourceDocs(selectedPath: string | null): string[] {
  return [
    "fixtures/project-state/summary.json",
    "fixtures/project-state/items.md",
    "fixtures/project-state/activity-log.md",
    ...(selectedPath === null ? [] : [selectedPath]),
  ];
}

function summarize(value: ProjectStateSummaryJson): ProjectStateSummary {
  return {
    project: stringOrNull(value.project),
    name: stringOrNull(value.name),
    current_stage: stringOrNull(value.current_stage),
    active_item: stringOrNull(value.active_item),
    next_item: stringOrNull(value.next_item),
    state: stringOrNull(value.state),
    last_verified: stringOrNull(value.last_verified),
    completed_items: stringArray(value.completed_items),
    last_checks: stringArray(value.last_checks),
  };
}

function summarizeItems(
  markdown: string,
  activeItem: unknown,
): ProjectStateItemsSummary {
  const rows = markdown
    .split("\n")
    .filter((line) => /^\| state-item-[a-z0-9-]+ /u.test(line))
    .map((line) =>
      line
        .split("|")
        .slice(1, -1)
        .map((cell) => cell.trim()),
    )
    .filter((cells) => cells.length >= 4)
    .map(([itemId, stage, status, objective]) => ({
      item_id: itemId ?? "",
      stage: stage ?? "",
      status: status ?? "",
      objective: objective ?? "",
    }));
  return {
    active_item: stringOrNull(activeItem),
    queued_items: rows.filter((row) => row.status === "queued"),
    completed_items: rows.filter((row) => row.status === "done"),
  };
}

function parseActivity(markdown: string): ProjectStateActivityEntry[] {
  const entries: ProjectStateActivityEntry[] = [];
  const pattern = /^## (state-item-[a-z0-9-]+) — (.+)$/gmu;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(markdown)) !== null) {
    entries.push({ item_id: match[1] ?? "", title: match[2] ?? "" });
  }
  return entries;
}

async function readRepoText(path: string): Promise<string> {
  return readFile(join(LNSAT_REPO_ROOT, path), "utf8");
}

async function readRepoJson<T>(path: string): Promise<T> {
  return JSON.parse(await readRepoText(path)) as T;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function jsonPointer(value: string): string {
  return `/${value.replace(/~/g, "~0").replace(/\//g, "~1")}`;
}
