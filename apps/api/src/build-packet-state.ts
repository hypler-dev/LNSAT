import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

export const BUILD_PACKET_STATE_GATEWAY_STATUS = "bp-0018-read-only-gateway-contract";

export const buildPacketStateGatewayContract = {
  contract_id: "lnsat.gateway.build_packet_state.v0_1",
  method: "POST",
  path: "/v1/build/packets/inspect",
  authority: ["synthetic-project-state-fixtures"],
  source_docs: [
    "fixtures/project-state/status.json",
    "fixtures/project-state/board.md",
    "fixtures/project-state/packet-log.md",
    "fixtures/project-state/packets/*.json",
  ],
  side_effects: [],
  status: "contract_only",
} as const;

export type BuildPacketStateGatewayRequest = {
  request_id?: string;
  packet_id?: string;
};

export type BuildPacketStateErrorCode =
  | "build_state.invalid_request"
  | "build_state.unexpected_field"
  | "build_state.invalid_request_id"
  | "build_state.invalid_packet_id"
  | "build_state.packet_not_found"
  | "build_state.source_unavailable";

export type BuildPacketStateError = {
  code: BuildPacketStateErrorCode;
  path: string;
  message: string;
  severity: "error";
};

export type BuildPacketStateSummary = {
  project: string | null;
  name: string | null;
  current_phase: string | null;
  active_packet: string | null;
  next_packet: string | null;
  build_state: string | null;
  last_verified: string | null;
  completed_packets: string[];
  last_checks: string[];
};

export type BoardPacketRow = {
  packet_id: string;
  phase: string;
  status: string;
  objective: string;
};

export type PacketLogEntry = {
  packet_id: string;
  title: string;
};

export type BuildPacketBoardSummary = {
  active_packet: string | null;
  queued_packets: BoardPacketRow[];
  done_packets: BoardPacketRow[];
};

export type SelectedBuildPacketState = {
  packet_id: string;
  source_path: string;
  phase: string | null;
  status: string | null;
  objective: string | null;
  acceptance_checks: string[];
  verification_commands: string[];
  side_effects: unknown;
};

export type BuildPacketStateGatewayResponse =
  | {
      ok: true;
      contract_id: typeof buildPacketStateGatewayContract.contract_id;
      request_id: string | null;
      source_docs: string[];
      build_state: BuildPacketStateSummary;
      board: BuildPacketBoardSummary;
      packet_log: {
        completed_packets: PacketLogEntry[];
      };
      selected_packet: SelectedBuildPacketState | null;
      side_effects: [];
    }
  | {
      ok: false;
      contract_id: typeof buildPacketStateGatewayContract.contract_id;
      request_id: string | null;
      source_docs: string[];
      errors: BuildPacketStateError[];
      side_effects: [];
    };

type NormalizedBuildPacketStateRequest =
  | {
      ok: true;
      request_id: string | null;
      packet_id: string | null;
    }
  | {
      ok: false;
      request_id: string | null;
      errors: BuildPacketStateError[];
    };

type BuildStatusJson = {
  project?: unknown;
  name?: unknown;
  current_phase?: unknown;
  active_packet?: unknown;
  next_packet?: unknown;
  build_state?: unknown;
  last_verified?: unknown;
  completed_packets?: unknown;
  last_checks?: unknown;
};

const LNSAT_REPO_ROOT = fileURLToPath(new URL("../../..", import.meta.url));
const buildPacketStateRequestKeys = new Set(["request_id", "packet_id"]);

export async function inspectBuildPacketStateGatewayRequest(
  input: unknown,
): Promise<BuildPacketStateGatewayResponse> {
  const normalized = normalizeBuildPacketStateRequest(input);
  if (!normalized.ok) {
    return buildPacketStateFailure(normalized.request_id, normalized.errors);
  }

  let statusJson: BuildStatusJson;
  let boardMarkdown: string;
  let packetLogMarkdown: string;
  try {
    [statusJson, boardMarkdown, packetLogMarkdown] = await Promise.all([
      readRepoJson<BuildStatusJson>("fixtures/project-state/status.json"),
      readRepoText("fixtures/project-state/board.md"),
      readRepoText("fixtures/project-state/packet-log.md"),
    ]);
  } catch {
    return buildPacketStateFailure(normalized.request_id, [
      buildPacketStateError(
        "build_state.source_unavailable",
        "",
        "Build packet state source docs could not be read.",
      ),
    ]);
  }

  const requestedPacketId = normalized.packet_id;
  const selectedPacketId =
    requestedPacketId ??
    stringOrNull(statusJson.active_packet) ??
    stringOrNull(statusJson.next_packet);
  const selectedPacket =
    selectedPacketId === null
      ? null
      : await readSelectedBuildPacket(selectedPacketId, requestedPacketId !== null);

  if (selectedPacket !== null && "errors" in selectedPacket) {
    return buildPacketStateFailure(normalized.request_id, selectedPacket.errors);
  }

  const completedPackets = parsePacketLogEntries(packetLogMarkdown);
  if (
    selectedPacket?.status === "done" &&
    !completedPackets.some((entry) => entry.packet_id === selectedPacket.packet_id)
  ) {
    completedPackets.push({
      packet_id: selectedPacket.packet_id,
      title: selectedPacket.objective ?? "Completed packet",
    });
  }

  return {
    ok: true,
    contract_id: buildPacketStateGatewayContract.contract_id,
    request_id: normalized.request_id,
    source_docs: buildPacketStateSourceDocs(selectedPacket?.source_path ?? null),
    build_state: summarizeBuildStatus(statusJson),
    board: summarizeBoard(boardMarkdown, statusJson.active_packet),
    packet_log: {
      completed_packets: completedPackets,
    },
    selected_packet: selectedPacket,
    side_effects: [],
  };
}

function normalizeBuildPacketStateRequest(
  input: unknown,
): NormalizedBuildPacketStateRequest {
  if (!isPlainObject(input)) {
    return {
      ok: false,
      request_id: null,
      errors: [
        buildPacketStateError(
          "build_state.invalid_request",
          "",
          "Build packet state request must be an object.",
        ),
      ],
    };
  }

  const errors: BuildPacketStateError[] = [];
  for (const key of Object.keys(input)) {
    if (!buildPacketStateRequestKeys.has(key)) {
      errors.push(
        buildPacketStateError(
          "build_state.unexpected_field",
          jsonPointer(key),
          "Unexpected build packet state request field.",
        ),
      );
    }
  }

  const requestId = typeof input.request_id === "string" ? input.request_id : null;
  if (Object.hasOwn(input, "request_id") && typeof input.request_id !== "string") {
    errors.push(
      buildPacketStateError(
        "build_state.invalid_request_id",
        "/request_id",
        "Build packet state request_id must be a string when provided.",
      ),
    );
  }

  const packetId = typeof input.packet_id === "string" ? input.packet_id : null;
  if (Object.hasOwn(input, "packet_id") && typeof input.packet_id !== "string") {
    errors.push(
      buildPacketStateError(
        "build_state.invalid_packet_id",
        "/packet_id",
        "Build packet id must be a string when provided.",
      ),
    );
  } else if (
    typeof input.packet_id === "string" &&
    !/^(BP|UI|DOC)-\d{4}$/.test(input.packet_id)
  ) {
    errors.push(
      buildPacketStateError(
        "build_state.invalid_packet_id",
        "/packet_id",
        "Build packet id must match the repo-local packet id format.",
      ),
    );
  }

  if (errors.length > 0) {
    return { ok: false, request_id: requestId, errors };
  }

  return {
    ok: true,
    request_id: requestId,
    packet_id: packetId,
  };
}

function buildPacketStateFailure(
  requestId: string | null,
  errors: BuildPacketStateError[],
): BuildPacketStateGatewayResponse {
  return {
    ok: false,
    contract_id: buildPacketStateGatewayContract.contract_id,
    request_id: requestId,
    source_docs: buildPacketStateSourceDocs(null),
    errors,
    side_effects: [],
  };
}

function buildPacketStateError(
  code: BuildPacketStateErrorCode,
  path: string,
  message: string,
): BuildPacketStateError {
  return {
    code,
    path,
    message,
    severity: "error",
  };
}

async function readRepoText(path: string): Promise<string> {
  return readFile(join(LNSAT_REPO_ROOT, path), "utf8");
}

async function readRepoJson<T>(path: string): Promise<T> {
  return JSON.parse(await readRepoText(path)) as T;
}

async function readSelectedBuildPacket(
  packetId: string,
  requested: boolean,
): Promise<SelectedBuildPacketState | { errors: BuildPacketStateError[] } | null> {
  const sourcePath = `fixtures/project-state/packets/${packetId}.json`;
  let packetDoc: {
    id?: unknown;
    phase?: unknown;
    status?: unknown;
    objective?: unknown;
    acceptance_checks?: unknown;
    verification_commands?: unknown;
    result?: unknown;
  };
  try {
    packetDoc = await readRepoJson(sourcePath);
  } catch {
    if (!requested) {
      return null;
    }

    return {
      errors: [
        buildPacketStateError(
          "build_state.packet_not_found",
          "/packet_id",
          "Requested build packet doc was not found.",
        ),
      ],
    };
  }

  return {
    packet_id: stringOrNull(packetDoc.id) ?? packetId,
    source_path: sourcePath,
    phase: stringOrNull(packetDoc.phase),
    status: stringOrNull(packetDoc.status),
    objective: stringOrNull(packetDoc.objective),
    acceptance_checks: stringArray(packetDoc.acceptance_checks),
    verification_commands: stringArray(packetDoc.verification_commands),
    side_effects: extractPacketSideEffects(packetDoc.result),
  };
}

function buildPacketStateSourceDocs(selectedPacketPath: string | null): string[] {
  return [
    "fixtures/project-state/status.json",
    "fixtures/project-state/board.md",
    "fixtures/project-state/packet-log.md",
    ...(selectedPacketPath === null ? [] : [selectedPacketPath]),
  ];
}

function summarizeBuildStatus(statusJson: BuildStatusJson): BuildPacketStateSummary {
  return {
    project: stringOrNull(statusJson.project),
    name: stringOrNull(statusJson.name),
    current_phase: stringOrNull(statusJson.current_phase),
    active_packet: stringOrNull(statusJson.active_packet),
    next_packet: stringOrNull(statusJson.next_packet),
    build_state: stringOrNull(statusJson.build_state),
    last_verified: stringOrNull(statusJson.last_verified),
    completed_packets: stringArray(statusJson.completed_packets),
    last_checks: stringArray(statusJson.last_checks),
  };
}

function summarizeBoard(
  boardMarkdown: string,
  activePacket: unknown,
): BuildPacketBoardSummary {
  const rows = parseBoardPacketRows(boardMarkdown);
  return {
    active_packet: stringOrNull(activePacket),
    queued_packets: rows.filter((row) => row.status === "queued"),
    done_packets: rows.filter((row) => row.status === "done"),
  };
}

function parseBoardPacketRows(markdown: string): BoardPacketRow[] {
  return markdown
    .split("\n")
    .filter((line) => /^\| (BP|UI|DOC)-\d{4} /.test(line))
    .map((line) =>
      line
        .split("|")
        .slice(1, -1)
        .map((cell) => cell.trim()),
    )
    .filter((cells) => cells.length >= 4)
    .map(([packetId, phase, status, objective]) => ({
      packet_id: packetId ?? "",
      phase: phase ?? "",
      status: status ?? "",
      objective: objective ?? "",
    }));
}

function parsePacketLogEntries(markdown: string): PacketLogEntry[] {
  const entries: PacketLogEntry[] = [];
  const headingPattern = /^## ((?:BP|UI|DOC)-\d{4})(?::|\s+Closeout:)\s+(.+)$/gm;
  let match: RegExpExecArray | null;
  while ((match = headingPattern.exec(markdown)) !== null) {
    entries.push({
      packet_id: match[1] ?? "",
      title: match[2] ?? "",
    });
  }

  return entries;
}

function extractPacketSideEffects(result: unknown): unknown {
  if (isPlainObject(result) && Object.hasOwn(result, "side_effects")) {
    return result.side_effects;
  }

  return [];
}

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function jsonPointer(key: string): string {
  return `/${key.replaceAll("~", "~0").replaceAll("/", "~1")}`;
}
