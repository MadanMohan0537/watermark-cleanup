import { describe, expect, it } from "vitest";
import { collectCandidates } from "@/lib/detection";
import { photographicCornerImage, naturalScene } from "./helpers/fixtures";
import { imageProcessor } from "@/lib/image-processing";
import { asPngFile } from "./helpers/fixtures";

describe("false-positive protection", () => {
  it("does not classify ordinary scene content as a watermark", async () => {
    const analysis = await imageProcessor.analyze(asPngFile(naturalScene(220, 160), "scene.png"));
    expect(analysis.regions.filter((region) => region.action === "remove")).toHaveLength(0);
  });

  it("does not flag a detailed object in the corner as an overlay", () => {
    const flagged = collectCandidates(photographicCornerImage()).filter((region) => region.action === "remove");
    expect(flagged).toHaveLength(0);
  });
});
