import { describe, expect, it } from "vitest";
import { imageProcessor } from "@/lib/image-processing";
import { decodeImageBytes } from "@/lib/image-processing/codec";
import { inpaintExemplar } from "@/lib/image-processing/inpaint";
import { asPngFile, cornerOverlayImage, naturalScene } from "./helpers/fixtures";
import { cloneImage, fillRect, luminance } from "@/lib/image-processing/buffer";

describe("image reconstruction", () => {
  it("leaves a clean image unchanged when no region is selected", async () => {
    const file = asPngFile(naturalScene(), "clean.png");
    const analysis = await imageProcessor.analyze(file);
    await expect(
      imageProcessor.process(file, { jobId: file.id, regionIds: [] }, analysis),
    ).rejects.toThrow(/select at least one overlay/i);
  });

  it("reconstructs a corner overlay without changing output dimensions", async () => {
    const original = cornerOverlayImage();
    const file = asPngFile(original, "corner.png");
    const analysis = await imageProcessor.analyze(file);
    const ids = analysis.regions.filter((region) => region.confidence >= 0.4).map((region) => region.id);
    expect(ids.length).toBeGreaterThan(0);
    const result = await imageProcessor.process(file, { jobId: file.id, regionIds: ids }, analysis);
    const decoded = decodeImageBytes(result.bytes, result.mimeType);
    expect(decoded.width).toBe(original.width);
    expect(decoded.height).toBe(original.height);
    const x = original.width - 10;
    const y = original.height - 8;
    const i = (y * decoded.width + x) * 4;
    const after = luminance(decoded.data[i], decoded.data[i + 1], decoded.data[i + 2]);
    const beforeI = (y * original.width + x) * 4;
    const before = luminance(original.data[beforeI], original.data[beforeI + 1], original.data[beforeI + 2]);
    expect(Math.abs(after - before) > 8 || after < 240).toBe(true);
  });

  it("uses nearby scene texture instead of flattening a removed region", () => {
    const original = naturalScene(120, 80);
    for (let y = 0; y < original.height; y += 1) {
      for (let x = 0; x < original.width; x += 1) {
        const i = (y * original.width + x) * 4;
        const texture = ((x % 6) - 2.5) * 3 + ((y % 4) - 1.5) * 2;
        original.data[i] += texture;
        original.data[i + 1] += texture * 0.8;
        original.data[i + 2] += texture * 0.6;
      }
    }

    const edited = cloneImage(original);
    const x0 = 48;
    const y0 = 24;
    const w = 18;
    const h = 14;
    fillRect(edited, x0, y0, w, h, [250, 250, 250, 255]);

    const mask = new Uint8Array(edited.width * edited.height);
    for (let y = y0; y < y0 + h; y += 1) {
      for (let x = x0; x < x0 + w; x += 1) mask[y * edited.width + x] = 1;
    }

    const restored = inpaintExemplar(edited, mask);
    let beforeError = 0;
    let afterError = 0;
    const restoredValues: number[] = [];
    const originalValues: number[] = [];
    for (let y = y0; y < y0 + h; y += 1) {
      for (let x = x0; x < x0 + w; x += 1) {
        const i = (y * edited.width + x) * 4;
        for (let c = 0; c < 3; c += 1) {
          beforeError += Math.abs(edited.data[i + c] - original.data[i + c]);
          afterError += Math.abs(restored.data[i + c] - original.data[i + c]);
        }
        restoredValues.push(luminance(restored.data[i], restored.data[i + 1], restored.data[i + 2]));
        originalValues.push(luminance(original.data[i], original.data[i + 1], original.data[i + 2]));
      }
    }

    const restoredMean = restoredValues.reduce((sum, value) => sum + value, 0) / restoredValues.length;
    const restoredVariance = restoredValues.reduce((sum, value) => sum + (value - restoredMean) ** 2, 0) / restoredValues.length;
    const originalMean = originalValues.reduce((sum, value) => sum + value, 0) / originalValues.length;
    const originalVariance = originalValues.reduce((sum, value) => sum + (value - originalMean) ** 2, 0) / originalValues.length;

    expect(afterError).toBeLessThan(beforeError * 0.55);
    expect(restoredVariance).toBeGreaterThan(originalVariance * 0.45);
  });
});
