import { describe, expect, it } from "vitest";
import { sniffMedia } from "@/lib/security/file-signature";
import { classifyUpload } from "@/lib/security/classify";
import { AppError } from "@/lib/errors";
import { asPngFile, naturalScene } from "./helpers/fixtures";
import { encodeImageBytes } from "@/lib/image-processing/codec";
import { MAX_IMAGE_DIMENSION, assertImageDimensions } from "@/lib/security/limits";

describe("file classification", () => {
  it("accepts a clean png by signature, not extension", () => {
    const file = asPngFile(naturalScene(), "notes.exe");
    expect(file.mediaKind).toBe("image");
    expect(file.mimeType).toBe("image/png");
  });

  it("rejects unsupported files", () => {
    const bytes = new Uint8Array([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00, 1, 2, 3, 4]);
    expect(sniffMedia(bytes).mediaKind).toBe("unsupported");
    expect(() => classifyUpload(bytes, "tool.exe")).toThrow(AppError);
  });

  it("rejects corrupted tiny files", () => {
    expect(() => classifyUpload(new Uint8Array([0x89, 0x50, 0x4e]), "broken.png")).toThrow(/too small|corrupted/i);
  });

  it("rejects incomplete png payloads as corrupted when decoded", async () => {
    const header = encodeImageBytes(naturalScene(16, 16), "image/png").slice(0, 24);
    expect(() => classifyUpload(header, "broken.png")).not.toThrow();
    const { imageProcessor } = await import("@/lib/image-processing");
    const file = classifyUpload(header, "broken.png");
    await expect(imageProcessor.analyze(file)).rejects.toThrow(/corrupted/i);
  });

  it("rejects decoded images that exceed the safe dimension budget", () => {
    expect(() => assertImageDimensions(MAX_IMAGE_DIMENSION + 1, 1)).toThrow(/too large/i);
    expect(() => assertImageDimensions(4_000, 4_000)).toThrow(/too large/i);
  });

  it("accepts decoded images within the safe dimension budget", () => {
    expect(() => assertImageDimensions(3_000, 3_000)).not.toThrow();
  });
});
