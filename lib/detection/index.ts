import { createId } from "@/lib/utils";
import type { BoundingBox, DetectedRegion, RegionKind } from "@/lib/types";
import { luminance, type RgbaImage } from "@/lib/image-processing/buffer";
import {
  boxBlurGray,
  connectedComponents,
  grayscale,
  sobelMagnitude,
  type Blob,
} from "@/lib/image-processing/ops";

const CONFIDENCE_KEEP_THRESHOLD = 0.5;
const MAX_WATERMARK_AREA_RATIO = 0.18;
const MIN_WATERMARK_AREA_RATIO = 0.0004;

export interface ScoredCandidate {
  blob: Blob;
  kind: RegionKind;
  strategy: string;
  confidence: number;
  label: string;
}

function bboxFromBlob(blob: Blob, width: number, height: number): BoundingBox {
  return {
    x: blob.minX / width,
    y: blob.minY / height,
    width: (blob.maxX - blob.minX + 1) / width,
    height: (blob.maxY - blob.minY + 1) / height,
  };
}

function cornerScore(blob: Blob, width: number, height: number) {
  const cx = (blob.minX + blob.maxX) / 2 / width;
  const cy = (blob.minY + blob.maxY) / 2 / height;
  const distLeft = cx;
  const distRight = 1 - cx;
  const distTop = cy;
  const distBottom = 1 - cy;
  const edge = Math.min(distLeft, distRight, distTop, distBottom);
  const inCorner =
    (distLeft < 0.22 || distRight < 0.22) && (distTop < 0.22 || distBottom < 0.22);
  if (inCorner) return 0.32;
  if (edge < 0.12) return 0.18;
  if (edge < 0.2) return 0.08;
  return -0.12;
}

function statsForBlob(image: RgbaImage, blob: Blob) {
  let r = 0;
  let g = 0;
  let b = 0;
  let a = 0;
  let lum = 0;
  let lum2 = 0;
  let sat = 0;
  const colors = new Set<number>();
  for (const [x, y] of blob.pixels) {
    const i = (y * image.width + x) * 4;
    const rr = image.data[i];
    const gg = image.data[i + 1];
    const bb = image.data[i + 2];
    const aa = image.data[i + 3];
    r += rr;
    g += gg;
    b += bb;
    a += aa;
    const l = luminance(rr, gg, bb);
    lum += l;
    lum2 += l * l;
    sat += (Math.max(rr, gg, bb) - Math.min(rr, gg, bb)) / 255;
    colors.add(((rr >> 3) << 10) | ((gg >> 3) << 5) | (bb >> 3));
  }
  const n = blob.pixels.length;
  const meanLum = lum / n;
  const variance = lum2 / n - meanLum * meanLum;
  return {
    mean: [r / n, g / n, b / n],
    meanAlpha: a / n,
    meanLum,
    variance,
    meanSat: sat / n,
    colorCount: colors.size,
  };
}

function surroundingStats(image: RgbaImage, blob: Blob, pad = 10) {
  const x0 = Math.max(0, blob.minX - pad);
  const y0 = Math.max(0, blob.minY - pad);
  const x1 = Math.min(image.width - 1, blob.maxX + pad);
  const y1 = Math.min(image.height - 1, blob.maxY + pad);
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  let lum2 = 0;
  for (let y = y0; y <= y1; y += 1) {
    for (let x = x0; x <= x1; x += 1) {
      if (x >= blob.minX && x <= blob.maxX && y >= blob.minY && y <= blob.maxY) continue;
      const i = (y * image.width + x) * 4;
      r += image.data[i];
      g += image.data[i + 1];
      b += image.data[i + 2];
      const l = luminance(image.data[i], image.data[i + 1], image.data[i + 2]);
      lum2 += l * l;
      n += 1;
    }
  }
  if (!n) return { mean: [0, 0, 0], variance: 0, n: 0 };
  return { mean: [r / n, g / n, b / n], variance: lum2 / n, n };
}

export function scoreBlob(
  image: RgbaImage,
  blob: Blob,
  kind: RegionKind,
  strategy: string,
): ScoredCandidate | null {
  const areaRatio = blob.area / (image.width * image.height);
  if (areaRatio > MAX_WATERMARK_AREA_RATIO || areaRatio < MIN_WATERMARK_AREA_RATIO) return null;

  const bw = blob.maxX - blob.minX + 1;
  const bh = blob.maxY - blob.minY + 1;
  const fill = blob.area / (bw * bh);
  const inner = statsForBlob(image, blob);
  const around = surroundingStats(image, blob);
  const contrast = Math.hypot(
    inner.mean[0] - around.mean[0],
    inner.mean[1] - around.mean[1],
    inner.mean[2] - around.mean[2],
  );

  if (inner.variance > 900) return null;
  if (inner.meanSat > 0.32 && inner.variance > 500) return null;
  if (inner.colorCount > 18) return null;

  let confidence = 0.12 + cornerScore(blob, image.width, image.height);
  if (inner.meanAlpha < 240) confidence += 0.28;
  if (inner.variance < 280) confidence += 0.22;
  else if (inner.variance < 700) confidence += 0.08;
  else confidence -= 0.22;
  if (contrast > 28) confidence += 0.18;
  if (contrast > 55) confidence += 0.08;
  if (inner.meanSat < 0.18) confidence += 0.08;
  if (fill > 0.18 && fill < 0.92) confidence += 0.06;
  if (areaRatio < 0.04) confidence += 0.08;
  if (inner.variance > 1400 && inner.meanSat > 0.28) confidence -= 0.35;
  if (around.variance > 1800 && inner.variance > 900) confidence -= 0.2;

  confidence = Math.max(0, Math.min(0.98, confidence));
  if (confidence < 0.28) return null;

  const label =
    kind === "badge"
      ? "Corner overlay"
      : kind === "translucent"
        ? "Translucent overlay"
        : kind === "pattern"
          ? "Repeated overlay"
          : kind === "text"
            ? "Text overlay"
            : kind === "diagonal"
              ? "Diagonal overlay"
              : "Unwanted overlay";

  return { blob, kind, strategy, confidence, label };
}

export function toRegion(image: RgbaImage, candidate: ScoredCandidate): DetectedRegion {
  return {
    id: createId("region"),
    kind: candidate.kind,
    confidence: Number(candidate.confidence.toFixed(3)),
    bbox: bboxFromBlob(candidate.blob, image.width, image.height),
    label: candidate.label,
    action: candidate.confidence >= CONFIDENCE_KEEP_THRESHOLD ? "remove" : "keep",
    strategy: candidate.strategy,
  };
}

export function alphaMask(image: RgbaImage) {
  const mask = new Uint8Array(image.width * image.height);
  let hits = 0;
  for (let p = 0, i = 3; i < image.data.length; i += 4, p += 1) {
    const a = image.data[i];
    if (a > 8 && a < 250) {
      mask[p] = 1;
      hits += 1;
    }
  }
  return hits > 20 ? mask : null;
}

export function cornerDifferenceMask(image: RgbaImage) {
  const gray = grayscale(image);
  const blur = boxBlurGray(gray, image.width, image.height, 8);
  const mask = new Uint8Array(image.width * image.height);
  const marginX = Math.max(8, Math.floor(image.width * 0.22));
  const marginY = Math.max(8, Math.floor(image.height * 0.22));
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const nearEdge = x < marginX || x >= image.width - marginX || y < marginY || y >= image.height - marginY;
      if (!nearEdge) continue;
      const i = y * image.width + x;
      if (Math.abs(gray[i] - blur[i]) > 28) mask[i] = 1;
    }
  }
  return mask;
}

export function translucentMask(image: RgbaImage) {
  const gray = grayscale(image);
  const blur = boxBlurGray(gray, image.width, image.height, 3);
  const mask = new Uint8Array(image.width * image.height);
  for (let y = 1; y < image.height - 1; y += 1) {
    for (let x = 1; x < image.width - 1; x += 1) {
      const i = y * image.width + x;
      const lift = gray[i] - blur[i];
      if (lift > 12 && lift < 90) mask[i] = 1;
    }
  }
  return mask;
}

export function repeatedPatternMask(image: RgbaImage) {
  const gray = grayscale(image);
  const edges = sobelMagnitude(gray, image.width, image.height);
  const stepX = Math.max(16, Math.floor(image.width / 6));
  const stepY = Math.max(16, Math.floor(image.height / 6));
  const mask = new Uint8Array(image.width * image.height);
  const tiles: number[] = [];
  for (let y = 0; y < image.height; y += stepY) {
    for (let x = 0; x < image.width; x += stepX) {
      let sum = 0;
      let n = 0;
      for (let yy = y; yy < Math.min(image.height, y + stepY); yy += 2) {
        for (let xx = x; xx < Math.min(image.width, x + stepX); xx += 2) {
          sum += edges[yy * image.width + xx];
          n += 1;
        }
      }
      tiles.push(n ? sum / n : 0);
    }
  }
  const mean = tiles.reduce((a, b) => a + b, 0) / Math.max(1, tiles.length);
  let similar = 0;
  for (const t of tiles) {
    if (Math.abs(t - mean) < mean * 0.22 && t > 8) similar += 1;
  }
  if (similar < Math.max(4, tiles.length * 0.45)) return mask;

  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const i = y * image.width + x;
      if (edges[i] > 18) mask[i] = 1;
    }
  }
  return mask;
}

export function collectCandidates(image: RgbaImage) {
  const strategies: Array<{ mask: Uint8Array | null; kind: RegionKind; strategy: string; minArea: number }> = [
    { mask: alphaMask(image), kind: "translucent", strategy: "alpha-transparency", minArea: 10 },
    { mask: cornerDifferenceMask(image), kind: "badge", strategy: "corner-contrast", minArea: 18 },
    { mask: translucentMask(image), kind: "translucent", strategy: "translucent-lift", minArea: 40 },
    { mask: repeatedPatternMask(image), kind: "pattern", strategy: "repeated-pattern", minArea: 20 },
  ];

  const scored: ScoredCandidate[] = [];
  for (const strategy of strategies) {
    if (!strategy.mask) continue;
    const blobs = connectedComponents(strategy.mask, image.width, image.height, strategy.minArea);
    for (const blob of blobs) {
      const candidate = scoreBlob(image, blob, strategy.kind, strategy.strategy);
      if (candidate) scored.push(candidate);
    }
  }
  return mergeCandidates(image, scored);
}

function overlap(a: Blob, b: Blob) {
  const x0 = Math.max(a.minX, b.minX);
  const y0 = Math.max(a.minY, b.minY);
  const x1 = Math.min(a.maxX, b.maxX);
  const y1 = Math.min(a.maxY, b.maxY);
  if (x1 < x0 || y1 < y0) return 0;
  const inter = (x1 - x0 + 1) * (y1 - y0 + 1);
  const area = Math.min(
    (a.maxX - a.minX + 1) * (a.maxY - a.minY + 1),
    (b.maxX - b.minX + 1) * (b.maxY - b.minY + 1),
  );
  return inter / area;
}

function mergeCandidates(image: RgbaImage, candidates: ScoredCandidate[]) {
  const sorted = [...candidates].sort((a, b) => b.confidence - a.confidence);
  const kept: ScoredCandidate[] = [];
  for (const candidate of sorted) {
    const duplicate = kept.some((other) => overlap(candidate.blob, other.blob) > 0.55);
    if (!duplicate) kept.push(candidate);
  }
  return kept.map((candidate) => toRegion(image, candidate));
}

export function regionsToMask(image: RgbaImage, regions: DetectedRegion[]) {
  const mask = new Uint8Array(image.width * image.height);
  for (const region of regions) {
    if (region.action !== "remove") continue;
    const x0 = Math.max(0, Math.floor(region.bbox.x * image.width));
    const y0 = Math.max(0, Math.floor(region.bbox.y * image.height));
    const x1 = Math.min(image.width, Math.ceil((region.bbox.x + region.bbox.width) * image.width));
    const y1 = Math.min(image.height, Math.ceil((region.bbox.y + region.bbox.height) * image.height));
    for (let y = y0; y < y1; y += 1) {
      for (let x = x0; x < x1; x += 1) {
        mask[y * image.width + x] = 1;
      }
    }
  }
  return mask;
}
