import { AppError } from "@/lib/errors";
import { applyTextRemovals, proposeTextCleanup } from "@/lib/text-processing";
import { createId } from "@/lib/utils";
import type { AnalyzeResult, ClassifiedFile, DetectedRegion, ProcessResult, Processor } from "@/lib/types";

export const textProcessor: Processor = {
  kind: "text",
  canHandle(file) {
    return file.mediaKind === "text";
  },
  async analyze(file: ClassifiedFile): Promise<AnalyzeResult> {
    const source = new TextDecoder("utf-8", { fatal: false }).decode(file.bytes);
    const proposal = proposeTextCleanup(source);
    const regions: DetectedRegion[] = proposal.removals.map((removal) => ({
      id: createId("txt"),
      kind: "text",
      confidence: Math.min(0.95, 0.55 + removal.count * 0.05),
      bbox: { x: 0, y: 0, width: 1, height: 0.08 },
      label: removal.text.slice(0, 80),
      action: "keep",
      text: removal.text,
      strategy: "repeated-line",
    }));
    return {
      jobId: file.id,
      mediaKind: "text",
      mimeType: file.mimeType,
      regions,
      textPreview: proposal.original,
      proposedText: proposal.proposed,
      warnings: regions.length
        ? []
        : [
            {
              code: "no_watermark",
              message: "No repeated overlay strings were found. Nothing will be deleted unless you choose text to remove.",
            },
          ],
    };
  },
  async process(file, plan, analysis): Promise<ProcessResult> {
    const source = new TextDecoder("utf-8", { fatal: false }).decode(file.bytes);
    const selected = analysis.regions
      .filter((region) => plan.regionIds.includes(region.id) && region.text)
      .map((region) => region.text as string);
    if (!selected.length) {
      throw new AppError("no_watermark", "Choose overlay strings to remove before exporting.");
    }
    const cleaned = applyTextRemovals(source, selected);
    if (cleaned === source) {
      throw new AppError("processing_failure", "The selected strings were not removed. Nothing was changed.");
    }
    return {
      jobId: plan.jobId || file.id,
      mediaKind: "text",
      mimeType: file.mimeType,
      filename: `cleaned-${createId("txt")}.txt`,
      bytes: new TextEncoder().encode(cleaned),
      residualDetected: false,
      warnings: [],
    };
  },
};
