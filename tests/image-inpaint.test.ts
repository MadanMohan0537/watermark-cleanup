import { describe, expect, it } from "vitest";
import { imageProcessor } from "@/lib/image-processing";
import { decodeImageBytes } from "@/lib/image-processing/codec";
import { asPngFile, cornerOverlayImage, naturalScene } from "./helpers/fixtures";
import { luminance } from "@/lib/image-processing/buffer";

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
});
