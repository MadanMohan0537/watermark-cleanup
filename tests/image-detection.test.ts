import { describe, expect, it } from "vitest";
import { collectCandidates } from "@/lib/detection";
import { imageProcessor } from "@/lib/image-processing";
import {
  asPngFile,
  cornerOverlayImage,
  multiRegionImage,
  naturalScene,
  photographicCornerImage,
  repeatedOverlayImage,
  translucentOverlayImage,
} from "./helpers/fixtures";

describe("image watermark detection", () => {
  it("does not treat a clean image as a watermark", async () => {
    const file = asPngFile(naturalScene(), "clean.png");
    const analysis = await imageProcessor.analyze(file);
    const high = analysis.regions.filter((region) => region.confidence >= 0.5);
    expect(high).toHaveLength(0);
  });

  it("detects a single corner overlay", async () => {
    const file = asPngFile(cornerOverlayImage(), "corner.png");
    const analysis = await imageProcessor.analyze(file);
    expect(analysis.regions.length).toBeGreaterThan(0);
    expect(analysis.regions.some((region) => region.bbox.x > 0.5 && region.bbox.y > 0.5)).toBe(true);
  });

  it("detects translucent overlay text", () => {
    const regions = collectCandidates(translucentOverlayImage());
    expect(regions.length).toBeGreaterThan(0);
  });

  it("detects a repeated overlay pattern", () => {
    const regions = collectCandidates(repeatedOverlayImage());
    expect(regions.length).toBeGreaterThan(0);
  });

  it("detects multiple overlay regions", () => {
    const regions = collectCandidates(multiRegionImage());
    expect(regions.length).toBeGreaterThanOrEqual(2);
  });

  it("does not remove ordinary photographic content in a corner", () => {
    const regions = collectCandidates(photographicCornerImage()).filter((region) => region.confidence >= 0.5);
    expect(regions).toHaveLength(0);
  });
});
