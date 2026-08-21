import { describe, expect, it } from "vitest";
import { buildCleanupReport } from "@/lib/client/cleanup-report";
import type { AnalyzeResult, ClassifiedFile, DetectedRegion, ProcessResult } from "@/lib/types";

const file: ClassifiedFile = {
  id: "file_1",
  bytes: new Uint8Array([1]),
  mimeType: "image/png",
  mediaKind: "image",
  originalName: "photo.png",
  sanitizedName: "photo.png",
  size: 1,
};

const region = (overrides: Partial<DetectedRegion>): DetectedRegion => ({
  id: "region_1",
  kind: "badge",
  confidence: 0.82,
  bbox: { x: 0.8, y: 0.9, width: 0.15, height: 0.08 },
  label: "Corner overlay",
  action: "remove",
  strategy: "corner-contrast",
  ...overrides,
});

const analysis: AnalyzeResult = {
  jobId: "file_1",
  mediaKind: "image",
  mimeType: "image/png",
  regions: [],
  warnings: [],
};

const result: ProcessResult = {
  jobId: "file_1",
  mediaKind: "image",
  mimeType: "image/png",
  filename: "cleaned-image.png",
  bytes: new Uint8Array([1]),
  warnings: [],
  residualDetected: false,
};

describe("buildCleanupReport", () => {
  it("separates removed and kept regions", () => {
    const report = buildCleanupReport(file, analysis, result, [
      region({ id: "a", action: "remove" }),
      region({ id: "b", action: "keep", label: "Body content", kind: "overlay" }),
    ]);

    expect(report.originalName).toBe("photo.png");
    expect(report.outputFilename).toBe("cleaned-image.png");
    expect(report.removed).toHaveLength(1);
    expect(report.kept[0]?.label).toBe("Body content");
  });
});
