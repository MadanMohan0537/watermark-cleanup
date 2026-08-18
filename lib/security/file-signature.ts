import { AppError } from "@/lib/errors";
import type { MediaKind } from "@/lib/types";

function startsWith(bytes: Uint8Array, signature: number[]) {
  if (bytes.length < signature.length) return false;
  return signature.every((value, index) => bytes[index] === value);
}

function asciiAt(bytes: Uint8Array, offset: number, length: number) {
  return String.fromCharCode(...bytes.slice(offset, offset + length));
}

export function sniffMedia(bytes: Uint8Array): { mediaKind: MediaKind; mimeType: string } {
  if (bytes.length < 8) {
    throw new AppError("corrupted_file", "The file is too small or incomplete to process.");
  }

  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return { mediaKind: "image", mimeType: "image/png" };
  }

  if (startsWith(bytes, [0xff, 0xd8, 0xff])) {
    return { mediaKind: "image", mimeType: "image/jpeg" };
  }

  if (
    asciiAt(bytes, 0, 4) === "RIFF" &&
    bytes.length >= 12 &&
    asciiAt(bytes, 8, 4) === "WEBP"
  ) {
    return { mediaKind: "image", mimeType: "image/webp" };
  }

  if (asciiAt(bytes, 0, 4) === "%PDF") {
    return { mediaKind: "pdf", mimeType: "application/pdf" };
  }

  if (asciiAt(bytes, 0, 4) === "ftyp" || asciiAt(bytes, 4, 4) === "ftyp") {
    return { mediaKind: "video", mimeType: "video/mp4" };
  }

  if (isMostlyText(bytes)) {
    const head = new TextDecoder("utf-8", { fatal: false }).decode(bytes.slice(0, 200)).toLowerCase();
    const markdown = head.includes("# ") || head.includes("```") || /\.md$/i.test(head);
    return {
      mediaKind: "text",
      mimeType: markdown ? "text/markdown" : "text/plain",
    };
  }

  return { mediaKind: "unsupported", mimeType: "application/octet-stream" };
}

export function assertMimeMatchesExtension(filename: string, mimeType: string) {
  const lower = filename.toLowerCase();
  const ok =
    (mimeType === "image/png" && lower.endsWith(".png")) ||
    (mimeType === "image/jpeg" && (lower.endsWith(".jpg") || lower.endsWith(".jpeg"))) ||
    (mimeType === "image/webp" && lower.endsWith(".webp")) ||
    (mimeType === "application/pdf" && lower.endsWith(".pdf")) ||
    ((mimeType === "text/plain" || mimeType === "text/markdown") &&
      (lower.endsWith(".txt") || lower.endsWith(".md") || lower.endsWith(".markdown"))) ||
    filename === "upload";
  return ok;
}

function isMostlyText(bytes: Uint8Array) {
  const sample = bytes.slice(0, Math.min(bytes.length, 4096));
  let weird = 0;
  for (const value of sample) {
    if (value === 0) return false;
    if (value < 9 || (value > 13 && value < 32)) weird += 1;
  }
  return weird / sample.length < 0.05;
}
