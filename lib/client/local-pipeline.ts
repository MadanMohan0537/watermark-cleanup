import { classifyUpload } from "@/lib/security/classify";
import { decodeImageBytes, decodeWithCanvas, encodeImageBytes, encodeWithCanvas } from "@/lib/image-processing/codec";
import { collectCandidates, regionsToMask } from "@/lib/detection";
import { restoreRegion } from "@/lib/image-processing/inpaint";
import { expandOrShrinkMask } from "@/lib/image-processing/ops";
import { analyzeFile, processFile } from "@/lib/processors";
import type { AnalyzeResult, ClassifiedFile, DetectedRegion, ProcessResult } from "@/lib/types";
import type { RgbaImage } from "@/lib/image-processing/buffer";
import { toArrayBuffer } from "@/lib/utils";

export async function fileToClassified(file: File): Promise<ClassifiedFile> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const classified = classifyUpload(bytes, file.name);
  if (classified.mimeType === "image/webp" && typeof createImageBitmap === "function") {
    const image = await decodeWithCanvas(file);
    return {
      ...classified,
      bytes: encodeImageBytes(image, "image/png"),
      mimeType: "image/png",
    };
  }
  return classified;
}

export async function decodePreviewImage(file: ClassifiedFile): Promise<RgbaImage | null> {
  if (file.mediaKind !== "image") return null;
  try {
    return decodeImageBytes(file.bytes, file.mimeType);
  } catch {
    if (typeof createImageBitmap === "function") {
      return decodeWithCanvas(new Blob([toArrayBuffer(file.bytes)], { type: file.mimeType }));
    }
    throw new Error("Could not decode image");
  }
}

export async function analyzeLocal(file: ClassifiedFile): Promise<AnalyzeResult> {
  if (file.mediaKind === "image") {
    const image = await decodePreviewImage(file);
    if (!image) {
      throw new Error("Could not decode image");
    }
    const regions = collectCandidates(image);
    return {
      jobId: file.id,
      mediaKind: "image",
      mimeType: file.mimeType,
      width: image.width,
      height: image.height,
      pageCount: 1,
      regions,
      warnings: regions.length
        ? regions.every((region) => region.confidence < 0.5)
          ? [
              {
                code: "low_confidence",
                message: "Detection confidence is low. Review or paint the overlay before cleaning.",
              },
            ]
          : []
        : [
            {
              code: "no_watermark",
              message: "No likely overlay was detected. You can paint a region manually.",
            },
          ],
    };
  }
  return analyzeFile(file);
}

export function maskFromRegions(image: RgbaImage, regions: DetectedRegion[]) {
  return regionsToMask(
    image,
    regions.map((region) => ({ ...region, action: region.action })),
  );
}

export function adjustMask(mask: Uint8Array, width: number, height: number, amount: number) {
  return expandOrShrinkMask(mask, width, height, amount);
}

export async function processLocal(
  file: ClassifiedFile,
  analysis: AnalyzeResult,
  regionIds: string[],
  mask?: Uint8Array,
): Promise<ProcessResult> {
  if (file.mediaKind === "image") {
    const image = await decodePreviewImage(file);
    if (!image) {
      throw new Error("Could not decode image");
    }
    const selected = analysis.regions.map((region) => ({
      ...region,
      action: regionIds.includes(region.id) ? ("remove" as const) : ("keep" as const),
    }));
    const workingMask = mask ?? maskFromRegions(image, selected);
    const restored = restoreRegion(image, workingMask);
    const mimeType = file.mimeType === "image/jpeg" ? "image/jpeg" : "image/png";
    const bytes =
      typeof OffscreenCanvas !== "undefined"
        ? await encodeWithCanvas(restored.image, mimeType)
        : encodeImageBytes(restored.image, mimeType);
    return {
      jobId: file.id,
      mediaKind: "image",
      mimeType,
      filename: `cleaned-image.${mimeType === "image/jpeg" ? "jpg" : "png"}`,
      bytes,
      residualDetected: false,
      warnings: [],
    };
  }
  return processFile(file, { jobId: file.id, regionIds }, analysis);
}

export function bytesToObjectUrl(bytes: Uint8Array, mimeType: string) {
  return URL.createObjectURL(new Blob([toArrayBuffer(bytes)], { type: mimeType }));
}
