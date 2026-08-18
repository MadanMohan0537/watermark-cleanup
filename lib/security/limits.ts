import { AppError } from "@/lib/errors";
import type { MediaKind } from "@/lib/types";

export const MAX_IMAGE_BYTES = 25 * 1024 * 1024;
export const MAX_PDF_BYTES = 40 * 1024 * 1024;
export const MAX_TEXT_BYTES = 2 * 1024 * 1024;
export const MAX_UPLOAD_BYTES = MAX_PDF_BYTES;

export const IMAGE_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
]);

export const TEXT_MIME_TYPES = new Set([
  "text/plain",
  "text/markdown",
  "text/x-markdown",
]);

export function limitForKind(kind: MediaKind) {
  switch (kind) {
    case "image":
      return MAX_IMAGE_BYTES;
    case "pdf":
      return MAX_PDF_BYTES;
    case "text":
      return MAX_TEXT_BYTES;
    default:
      return MAX_UPLOAD_BYTES;
  }
}

export function assertSize(size: number, kind: MediaKind) {
  const limit = limitForKind(kind);
  if (size > limit) {
    throw new AppError(
      "oversized_upload",
      `This ${kind} file is larger than the ${Math.floor(limit / (1024 * 1024))} MB limit.`,
    );
  }
}
