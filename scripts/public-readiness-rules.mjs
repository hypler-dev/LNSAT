import { extname } from "node:path";

export const internalBuildPacketIdentifierPattern = /\bbp-[0-9]{4}\b/iu;

export function isPublicMarkdownPath(file) {
  return extname(file) === ".md" && !file.startsWith("fixtures/");
}

export function hasInternalBuildPacketIdentifier(source) {
  return internalBuildPacketIdentifierPattern.test(source);
}

export function containsForbiddenInternalBuildPacketIdentifier(file, source) {
  return isPublicMarkdownPath(file) && hasInternalBuildPacketIdentifier(source);
}
