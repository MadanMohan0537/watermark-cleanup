import { cloneImage, idx, type RgbaImage } from "@/lib/image-processing/buffer";
import { dilateMask } from "@/lib/image-processing/ops";

function neighborsKnown(
  mask: Uint8Array,
  width: number,
  height: number,
  x: number,
  y: number,
  radius: number,
) {
  const points: Array<[number, number]> = [];
  for (let dy = -radius; dy <= radius; dy += 1) {
    for (let dx = -radius; dx <= radius; dx += 1) {
      if (dx === 0 && dy === 0) continue;
      const xx = x + dx;
      const yy = y + dy;
      if (xx < 0 || yy < 0 || xx >= width || yy >= height) continue;
      if (!mask[yy * width + xx]) points.push([xx, yy]);
    }
  }
  return points;
}

function isBoundary(mask: Uint8Array, width: number, height: number, x: number, y: number) {
  if (!mask[y * width + x]) return false;
  const neighbors = [
    [x - 1, y],
    [x + 1, y],
    [x, y - 1],
    [x, y + 1],
  ];
  return neighbors.some(([xx, yy]) => {
    if (xx < 0 || yy < 0 || xx >= width || yy >= height) return true;
    return !mask[yy * width + xx];
  });
}

export function inpaintTelea(image: RgbaImage, mask: Uint8Array, radius = 3): RgbaImage {
  const out = cloneImage(image);
  const working = new Uint8Array(mask);
  const { width, height } = image;
  const maxIters = width * height;
  for (let iter = 0; iter < maxIters; iter += 1) {
    const frontier: Array<[number, number]> = [];
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        if (isBoundary(working, width, height, x, y)) frontier.push([x, y]);
      }
    }
    if (!frontier.length) break;
    for (const [x, y] of frontier) {
      const known = neighborsKnown(working, width, height, x, y, radius);
      if (!known.length) continue;
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      let wsum = 0;
      for (const [xx, yy] of known) {
        const dist = Math.hypot(xx - x, yy - y);
        const weight = 1 / (dist + 0.001);
        const i = idx(out, xx, yy);
        r += out.data[i] * weight;
        g += out.data[i + 1] * weight;
        b += out.data[i + 2] * weight;
        a += out.data[i + 3] * weight;
        wsum += weight;
      }
      const o = idx(out, x, y);
      out.data[o] = r / wsum;
      out.data[o + 1] = g / wsum;
      out.data[o + 2] = b / wsum;
      out.data[o + 3] = a / wsum;
      working[y * width + x] = 0;
    }
  }
  return out;
}

export function reverseUniformOverlay(image: RgbaImage, mask: Uint8Array): RgbaImage | null {
  const { width, height, data } = image;
  let count = 0;
  let r = 0;
  let g = 0;
  let b = 0;
  for (let i = 0, p = 0; i < data.length; i += 4, p += 1) {
    if (!mask[p]) continue;
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
    count += 1;
  }
  if (count < 20) return null;
  const overlay = [r / count, g / count, b / count];
  let variance = 0;
  for (let i = 0, p = 0; i < data.length; i += 4, p += 1) {
    if (!mask[p]) continue;
    variance +=
      (data[i] - overlay[0]) ** 2 +
      (data[i + 1] - overlay[1]) ** 2 +
      (data[i + 2] - overlay[2]) ** 2;
  }
  variance /= count * 3;
  if (variance > 420) return null;

  const dilated = dilateMask(mask, width, height, 4);
  let bgR = 0;
  let bgG = 0;
  let bgB = 0;
  let bgCount = 0;
  for (let p = 0; p < dilated.length; p += 1) {
    if (!dilated[p] || mask[p]) continue;
    const i = p * 4;
    bgR += data[i];
    bgG += data[i + 1];
    bgB += data[i + 2];
    bgCount += 1;
  }
  if (!bgCount) return null;
  const background = [bgR / bgCount, bgG / bgCount, bgB / bgCount];
  const alphaGuess = Math.min(
    0.72,
    Math.max(
      0.18,
      Math.hypot(overlay[0] - background[0], overlay[1] - background[1], overlay[2] - background[2]) /
        255,
    ),
  );
  if (alphaGuess < 0.2) return null;

  const out = cloneImage(image);
  for (let p = 0; p < mask.length; p += 1) {
    if (!mask[p]) continue;
    const i = p * 4;
    for (let c = 0; c < 3; c += 1) {
      const observed = out.data[i + c];
      const restored = (observed - overlay[c] * alphaGuess) / (1 - alphaGuess);
      out.data[i + c] = Math.min(255, Math.max(0, restored));
    }
  }
  return out;
}

export type RemovalStrategy = "overlay-subtract" | "telea-inpaint";

export function restoreRegion(image: RgbaImage, mask: Uint8Array): { image: RgbaImage; strategy: RemovalStrategy } {
  const overlay = reverseUniformOverlay(image, mask);
  if (overlay) return { image: overlay, strategy: "overlay-subtract" };
  return { image: inpaintTelea(image, mask, 4), strategy: "telea-inpaint" };
}
