import { decode as decodePng } from "fast-png";
import { AppError } from "@/lib/errors";
import { collectCandidates, regionsToMask } from "@/lib/detection";
import { decodeImageBytes, encodeImageBytes } from "@/lib/image-processing/codec";
import { residualScore } from "@/lib/image-processing/ops";
import { restoreRegion } from "@/lib/image-processing/inpaint";
import { createId } from "@/lib/utils";
import type {
  AnalyzeOptions,
  AnalyzeResult,
  ClassifiedFile,
  ProcessResult,
  Processor,
} from "@/lib/types";

export const imageProcessor: Processor = {
  kind: "image",
  canHandle(file) {
    return file.mediaKind === "image";
  },
  async analyze(file: ClassifiedFile, options?: AnalyzeOptions): Promise<AnalyzeResult> {
    const image = decodeImageBytes(file.bytes, file.mimeType);
    const regions = collectCandidates(image).filter((region) =>
      options?.includeLowConfidence ? true : region.confidence >= 0.32,
    );
    const warnings: AnalyzeResult["warnings"] = [];
    if (!regions.length) {
      warnings.push({
        code: "no_watermark",
        message: "No likely overlay was detected. You can paint a region manually.",
      });
    } else if (regions.every((region) => region.confidence < 0.5)) {
      warnings.push({
        code: "low_confidence",
        message: "Detection confidence is low. Review or paint the overlay before cleaning.",
      });
    }
    return {
      jobId: file.id,
      mediaKind: "image",
      mimeType: file.mimeType,
      width: image.width,
      height: image.height,
      pageCount: 1,
      regions,
      warnings,
    };
  },
  async process(file, plan, analysis): Promise<ProcessResult> {
    const image = decodeImageBytes(file.bytes, file.mimeType);
    const selected = analysis.regions.map((region) => ({
      ...region,
      action: plan.regionIds.includes(region.id) ? ("remove" as const) : region.action,
    }));
    const fromPlan =
      plan.mask && plan.maskWidth === image.width && plan.maskHeight === image.height
        ? plan.mask
        : regionsToMask(image, selected.map((region) => ({
            ...region,
            action: plan.regionIds.includes(region.id) ? "remove" : "keep",
          })));
    const coverage = fromPlan.reduce((sum, value) => sum + value, 0) / fromPlan.length;
    if (coverage === 0) {
      throw new AppError("no_watermark", "Select at least one overlay region to remove.");
    }
    if (coverage > 0.45) {
      throw new AppError(
        "processing_failure",
        "The selected area is too large to remove safely. Shrink the mask to the overlay only.",
      );
    }
    const restored = restoreRegion(image, fromPlan);
    const residual = residualScore(restored.image, fromPlan);
    const bytes = encodeImageBytes(restored.image, file.mimeType === "image/webp" ? "image/png" : file.mimeType);
    return {
      jobId: plan.jobId || file.id,
      mediaKind: "image",
      mimeType: file.mimeType === "image/webp" ? "image/png" : file.mimeType,
      filename: `cleaned-${createId("img")}.${file.mimeType === "image/jpeg" ? "jpg" : "png"}`,
      bytes,
      residualDetected: residual > 0.22,
      warnings:
        residual > 0.22
          ? [
              {
                code: "partial",
                message: "Some overlay edges may remain. Adjust the mask and try again.",
              },
            ]
          : [],
    };
  },
};

export function pngDimensions(bytes: Uint8Array) {
  const decoded = decodePng(bytes);
  return { width: decoded.width, height: decoded.height };
}
