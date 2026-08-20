import type { UniversalPacket } from "./validator.js";

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
export type JsonObject = { [key: string]: JsonValue };

export type PacketHash = `sha256:${string}`;

export type PacketDiffEntry =
  | {
      op: "add";
      path: string;
      after: JsonValue;
    }
  | {
      op: "remove";
      path: string;
      before: JsonValue;
    }
  | {
      op: "replace";
      path: string;
      before: JsonValue;
      after: JsonValue;
    };

export function canonicalizeUniversalPacket(packet: UniversalPacket): string {
  return canonicalizeJsonValue(packet);
}

type CryptoLike = {
  subtle: {
    digest(algorithm: "SHA-256", data: Uint8Array): Promise<ArrayBuffer>;
  };
};

type TextEncoderConstructorLike = new () => {
  encode(input: string): Uint8Array;
};

export async function hashUniversalPacket(
  packet: UniversalPacket,
): Promise<PacketHash> {
  const canonicalPacket = canonicalizeUniversalPacket(packet);
  const digest = await getWebCrypto().subtle.digest(
    "SHA-256",
    new (getTextEncoder())().encode(canonicalPacket),
  );
  const hash = bytesToHex(new Uint8Array(digest));
  return `sha256:${hash}`;
}

export function diffUniversalPackets(
  before: UniversalPacket,
  after: UniversalPacket,
): PacketDiffEntry[] {
  const entries: PacketDiffEntry[] = [];
  diffJsonValues(toJsonValue(before, ""), toJsonValue(after, ""), "", entries);
  return entries;
}

export function canonicalizeJsonValue(value: unknown): string {
  const jsonValue = toJsonValue(value, "");
  return stringifyCanonicalJsonValue(jsonValue);
}

function stringifyCanonicalJsonValue(value: JsonValue): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stringifyCanonicalJsonValue(item)).join(",")}]`;
  }

  return `{${Object.keys(value)
    .sort()
    .map((key) => {
      const item = value[key];
      if (item === undefined) {
        throw new TypeError(`Packet JSON contains unsupported value at '/${key}'.`);
      }

      return `${JSON.stringify(key)}:${stringifyCanonicalJsonValue(item)}`;
    })
    .join(",")}}`;
}

function diffJsonValues(
  before: JsonValue,
  after: JsonValue,
  path: string,
  entries: PacketDiffEntry[],
): void {
  if (stringifyCanonicalJsonValue(before) === stringifyCanonicalJsonValue(after)) {
    return;
  }

  if (!isJsonObject(before) || !isJsonObject(after)) {
    entries.push({
      op: "replace",
      path,
      before,
      after,
    });
    return;
  }

  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  for (const key of [...keys].sort()) {
    const keyPath = `${path}/${escapeJsonPointerSegment(key)}`;
    const beforeHasKey = Object.hasOwn(before, key);
    const afterHasKey = Object.hasOwn(after, key);

    if (!beforeHasKey && afterHasKey) {
      const afterValue = after[key];
      if (afterValue === undefined) {
        throw new TypeError(`Packet JSON contains unsupported value at '${keyPath}'.`);
      }

      entries.push({ op: "add", path: keyPath, after: afterValue });
      continue;
    }

    if (beforeHasKey && !afterHasKey) {
      const beforeValue = before[key];
      if (beforeValue === undefined) {
        throw new TypeError(`Packet JSON contains unsupported value at '${keyPath}'.`);
      }

      entries.push({ op: "remove", path: keyPath, before: beforeValue });
      continue;
    }

    const beforeValue = before[key];
    const afterValue = after[key];
    if (beforeValue === undefined || afterValue === undefined) {
      throw new TypeError(`Packet JSON contains unsupported value at '${keyPath}'.`);
    }

    diffJsonValues(beforeValue, afterValue, keyPath, entries);
  }
}

function toJsonValue(value: unknown, path: string): JsonValue {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new TypeError(`Packet JSON contains non-finite number at '${path}'.`);
    }
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item, index) => toJsonValue(item, `${path}/${index}`));
  }

  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        toJsonValue(item, `${path}/${escapeJsonPointerSegment(key)}`),
      ]),
    );
  }

  throw new TypeError(`Packet JSON contains unsupported value at '${path}'.`);
}

function isJsonObject(value: JsonValue): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function escapeJsonPointerSegment(segment: string): string {
  return segment.replaceAll("~", "~0").replaceAll("/", "~1");
}

function getWebCrypto(): CryptoLike {
  const runtime = globalThis as unknown as { crypto?: CryptoLike };
  if (runtime.crypto === undefined) {
    throw new TypeError("Packet hash requires Web Crypto SHA-256 support.");
  }

  return runtime.crypto;
}

function getTextEncoder(): TextEncoderConstructorLike {
  const runtime = globalThis as unknown as {
    TextEncoder?: TextEncoderConstructorLike;
  };
  if (runtime.TextEncoder === undefined) {
    throw new TypeError("Packet hash requires TextEncoder support.");
  }

  return runtime.TextEncoder;
}

function bytesToHex(bytes: Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
