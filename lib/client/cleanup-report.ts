import type { AnalyzeResult, ClassifiedFile, DetectedRegion, ProcessResult } from "@/lib/types";

export interface CleanupReport {
  generatedAt: string;
  originalName: string;
  mediaKind: ProcessResult["mediaKind"];
  outputFilename: string;
  residualDetected: boolean;
  warnings: ProcessResult["warnings"];
  removed: Array<{
    label: string;
    kind: DetectedRegion["kind"];
    confidence: number;
    text?: string;
  }>;
  kept: Array<{
    label: string;
    kind: DetectedRegion["kind"];
    confidence: number;
  }>;
}

export function buildCleanupReport(
  file: ClassifiedFile,
  analysis: AnalyzeResult,
  result: ProcessResult,
  regions: DetectedRegion[],
): CleanupReport {
  return {
    generatedAt: new Date().toISOString(),
    originalName: file.sanitizedName,
    mediaKind: result.mediaKind,
    outputFilename: result.filename,
    residualDetected: result.residualDetected,
    warnings: [...analysis.warnings, ...result.warnings].filter(
      (warning, index, all) =>
        all.findIndex((item) => item.code === warning.code && item.message === warning.message) === index,
    ),
    removed: regions
      .filter((region) => region.action === "remove")
      .map((region) => ({
        label: region.label,
        kind: region.kind,
        confidence: region.confidence,
        ...(region.text ? { text: region.text } : {}),
      })),
    kept: regions
      .filter((region) => region.action === "keep")
      .map((region) => ({
        label: region.label,
        kind: region.kind,
        confidence: region.confidence,
      })),
  };
}
