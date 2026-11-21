export const PACKET_RUNTIME_STATUS = "bp-0004-canonical-hash";

export {
  canonicalizeUniversalPacket,
  diffUniversalPackets,
  hashUniversalPacket,
} from "./canonical.js";

export type {
  JsonObject,
  JsonPrimitive,
  JsonValue,
  PacketDiffEntry,
  PacketHash,
} from "./canonical.js";

export {
  universalPacketTypes,
  validateUniversalPacket,
  validateUniversalPacketShape,
} from "./validator.js";

export type {
  PacketValidationError,
  PacketValidationErrorCode,
  PacketValidationResult,
  PacketValidationSeverity,
  UniversalPacket,
  UniversalPacketType,
} from "./validator.js";
