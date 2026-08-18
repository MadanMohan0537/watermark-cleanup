import { AppError } from "@/lib/errors";
import { sniffMedia } from "@/lib/security/file-signature";
import { assertSize } from "@/lib/security/limits";
import { sanitizeFilename } from "@/lib/security/sanitize";
import { createId } from "@/lib/utils";
import type { ClassifiedFile } from "@/lib/types";

export function classifyUpload(bytes: Uint8Array, originalName: string): ClassifiedFile {
  const sniffed = sniffMedia(bytes);
  if (sniffed.mediaKind === "unsupported") {
    throw new AppError(
      "unsupported_file",
      "This file type is not supported. Use PNG, JPG, WEBP, PDF, TXT, or Markdown.",
    );
  }
  if (sniffed.mediaKind === "video") {
    throw new AppError(
      "unsupported_file",
      "Video cleanup is not available yet. The pipeline is structured so it can be added later.",
    );
  }
  assertSize(bytes.byteLength, sniffed.mediaKind);
  return {
    id: createId("file"),
    bytes,
    mimeType: sniffed.mimeType,
    mediaKind: sniffed.mediaKind,
    originalName,
    sanitizedName: sanitizeFilename(originalName),
    size: bytes.byteLength,
  };
}
