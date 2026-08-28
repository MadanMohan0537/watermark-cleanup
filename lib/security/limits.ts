import { AppError } from "@/lib/errors";
import type { MediaKind } from "@/lib/types";

export const MAX_IMAGE_BYTES = 25 * 1024 * 1024;
export const MAX_PDF_BYTES = 40 * 1024 * 1024;
export const MAX_TEXT_BYTES = 2 * 1024 * 1024;
export const MAX_UPLOAD_BYTES = MAX_PDF_BYTES;
export const MAX_IMAGE_DIMENSION = 8_000;
export const MAX_IMAGE_PIXELS = 12_000_000;

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

export function assertImageDimensions(width: number, height: number) {
  const validDimensions =
    Number.isSafeInteger(width) &&
    Number.isSafeInteger(height) &&
    width > 0 &&
    height > 0;
  const pixelCount = validDimensions ? width * height : Number.POSITIVE_INFINITY;

  if (
    !validDimensions ||
    width > MAX_IMAGE_DIMENSION ||
    height > MAX_IMAGE_DIMENSION ||
    !Number.isSafeInteger(pixelCount) ||
    pixelCount > MAX_IMAGE_PIXELS
  ) {
    throw new AppError(
      "oversized_upload",
      `This image is too large to process safely. Use an image up to ${MAX_IMAGE_DIMENSION.toLocaleString("en-US")} pixels per side and ${Math.floor(MAX_IMAGE_PIXELS / 1_000_000)} megapixels.`,
    );
  }
}
