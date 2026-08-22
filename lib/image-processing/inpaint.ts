import { cloneImage, idx, type RgbaImage } from "@/lib/image-processing/buffer";
import { connectedComponents, dilateMask } from "@/lib/image-processing/ops";

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

/**
 * Conservative diffusion fallback for regions where no clean donor texture can
 * be found. This is intentionally kept as a fallback instead of the primary
 * reconstruction path because averaging neighbors can soften photographic
 * texture.
 */
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

interface DonorMatch {
  x: number;
  y: number;
  score: number;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function componentRing(
  pixels: Array<[number, number]>,
  width: number,
  height: number,
  radius = 3,
) {
  const componentMask = new Uint8Array(width * height);
  for (const [x, y] of pixels) componentMask[y * width + x] = 1;
  const expanded = dilateMask(componentMask, width, height, radius);
  const ring: Array<[number, number]> = [];
  for (let p = 0; p < expanded.length; p += 1) {
    if (!expanded[p] || componentMask[p]) continue;
    ring.push([p % width, Math.floor(p / width)]);
  }
  return ring;
}

function colorError(image: RgbaImage, ax: number, ay: number, bx: number, by: number) {
  const a = idx(image, ax, ay);
  const b = idx(image, bx, by);
  const dr = image.data[a] - image.data[b];
  const dg = image.data[a + 1] - image.data[b + 1];
  const db = image.data[a + 2] - image.data[b + 2];
  // Green receives a little more weight because it tracks perceived luminance
  // strongly and helps donor selection respect gradients and cloud edges.
  return dr * dr * 0.3 + dg * dg * 0.5 + db * db * 0.2;
}

function donorIsClean(
  globalMask: Uint8Array,
  width: number,
  height: number,
  pixels: Array<[number, number]>,
  minX: number,
  minY: number,
  donorX: number,
  donorY: number,
) {
  for (const [x, y] of pixels) {
    const sx = donorX + (x - minX);
    const sy = donorY + (y - minY);
    if (sx < 0 || sy < 0 || sx >= width || sy >= height) return false;
    if (globalMask[sy * width + sx]) return false;
  }
  return true;
}

function findDonor(
  image: RgbaImage,
  globalMask: Uint8Array,
  pixels: Array<[number, number]>,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
): { match: DonorMatch | null; ring: Array<[number, number]> } {
  const { width, height } = image;
  const regionWidth = maxX - minX + 1;
  const regionHeight = maxY - minY + 1;
  const maxDim = Math.max(regionWidth, regionHeight);
  const ring = componentRing(pixels, width, height, 3);
  if (!ring.length) return { match: null, ring };

  const searchRadius = Math.min(128, Math.max(32, maxDim * 4));
  const stride = Math.max(2, Math.floor(maxDim / 10));
  const ringStride = Math.max(1, Math.floor(ring.length / 96));
  let best: DonorMatch | null = null;

  const startX = Math.max(0, minX - searchRadius);
  const endX = Math.min(width - regionWidth, minX + searchRadius);
  const startY = Math.max(0, minY - searchRadius);
  const endY = Math.min(height - regionHeight, minY + searchRadius);

  for (let donorY = startY; donorY <= endY; donorY += stride) {
    for (let donorX = startX; donorX <= endX; donorX += stride) {
      if (Math.abs(donorX - minX) < stride && Math.abs(donorY - minY) < stride) continue;
      if (!donorIsClean(globalMask, width, height, pixels, minX, minY, donorX, donorY)) continue;

      let error = 0;
      let count = 0;
      let invalid = false;
      for (let r = 0; r < ring.length; r += ringStride) {
        const [tx, ty] = ring[r];
        const sx = donorX + (tx - minX);
        const sy = donorY + (ty - minY);
        if (sx < 0 || sy < 0 || sx >= width || sy >= height || globalMask[sy * width + sx]) {
          invalid = true;
          break;
        }
        error += colorError(image, tx, ty, sx, sy);
        count += 1;
      }
      if (invalid || count < 4) continue;

      const normalizedColorError = error / count / (255 * 255);
      const distance = Math.hypot(donorX - minX, donorY - minY) / searchRadius;
      const score = normalizedColorError + distance * 0.018;
      if (!best || score < best.score) best = { x: donorX, y: donorY, score };
    }
  }

  return { match: best, ring };
}

function ringColorCorrection(
  image: RgbaImage,
  ring: Array<[number, number]>,
  minX: number,
  minY: number,
  donorX: number,
  donorY: number,
) {
  if (!ring.length) return [0, 0, 0] as const;
  let tr = 0;
  let tg = 0;
  let tb = 0;
  let sr = 0;
  let sg = 0;
  let sb = 0;
  let count = 0;
  const stride = Math.max(1, Math.floor(ring.length / 160));
  for (let r = 0; r < ring.length; r += stride) {
    const [tx, ty] = ring[r];
    const sx = donorX + (tx - minX);
    const sy = donorY + (ty - minY);
    if (sx < 0 || sy < 0 || sx >= image.width || sy >= image.height) continue;
    const ti = idx(image, tx, ty);
    const si = idx(image, sx, sy);
    tr += image.data[ti];
    tg += image.data[ti + 1];
    tb += image.data[ti + 2];
    sr += image.data[si];
    sg += image.data[si + 1];
    sb += image.data[si + 2];
    count += 1;
  }
  if (!count) return [0, 0, 0] as const;
  return [
    clamp((tr - sr) / count, -24, 24),
    clamp((tg - sg) / count, -24, 24),
    clamp((tb - sb) / count, -24, 24),
  ] as const;
}

function copyFromDonor(
  source: RgbaImage,
  out: RgbaImage,
  pixels: Array<[number, number]>,
  ring: Array<[number, number]>,
  minX: number,
  minY: number,
  donorX: number,
  donorY: number,
) {
  const correction = ringColorCorrection(source, ring, minX, minY, donorX, donorY);
  for (const [x, y] of pixels) {
    const sx = donorX + (x - minX);
    const sy = donorY + (y - minY);
    const src = idx(source, sx, sy);
    const dst = idx(out, x, y);
    out.data[dst] = clamp(source.data[src] + correction[0], 0, 255);
    out.data[dst + 1] = clamp(source.data[src + 1] + correction[1], 0, 255);
    out.data[dst + 2] = clamp(source.data[src + 2] + correction[2], 0, 255);
    out.data[dst + 3] = source.data[src + 3];
  }
}

function softenCopySeam(image: RgbaImage, mask: Uint8Array) {
  const out = cloneImage(image);
  const { width, height } = image;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const p = y * width + x;
      if (!mask[p] || !isBoundary(mask, width, height, x, y)) continue;
      let r = 0;
      let g = 0;
      let b = 0;
      let count = 0;
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) {
        const xx = x + dx;
        const yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= width || yy >= height) continue;
        if (mask[yy * width + xx]) continue;
        const i = idx(image, xx, yy);
        r += image.data[i];
        g += image.data[i + 1];
        b += image.data[i + 2];
        count += 1;
      }
      if (!count) continue;
      const i = idx(image, x, y);
      const blend = 0.12;
      out.data[i] = image.data[i] * (1 - blend) + (r / count) * blend;
      out.data[i + 1] = image.data[i + 1] * (1 - blend) + (g / count) * blend;
      out.data[i + 2] = image.data[i + 2] * (1 - blend) + (b / count) * blend;
    }
  }
  return out;
}

/**
 * Texture-aware local reconstruction. Each connected removal region searches
 * nearby clean content for a donor whose surrounding boundary most closely
 * matches the target. Only masked pixels are copied, then a small local color
 * correction and seam harmonization make the donor conform to the scene.
 *
 * This preserves clouds, grain, water, foliage and other photographic texture
 * substantially better than averaging neighboring pixels.
 */
export function inpaintExemplar(image: RgbaImage, mask: Uint8Array): RgbaImage {
  let out = cloneImage(image);
  const components = connectedComponents(mask, image.width, image.height, 1);
  const unresolved = new Uint8Array(mask.length);

  for (const component of components) {
    const { match, ring } = findDonor(
      image,
      mask,
      component.pixels,
      component.minX,
      component.minY,
      component.maxX,
      component.maxY,
    );
    if (!match) {
      for (const [x, y] of component.pixels) unresolved[y * image.width + x] = 1;
      continue;
    }
    copyFromDonor(
      image,
      out,
      component.pixels,
      ring,
      component.minX,
      component.minY,
      match.x,
      match.y,
    );
  }

  if (unresolved.some((value) => value !== 0)) {
    const fallback = inpaintTelea(out, unresolved, 4);
    out = fallback;
  }

  return softenCopySeam(out, mask);
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

export type RemovalStrategy = "overlay-subtract" | "exemplar-inpaint" | "telea-inpaint";

export function restoreRegion(image: RgbaImage, mask: Uint8Array): { image: RgbaImage; strategy: RemovalStrategy } {
  const overlay = reverseUniformOverlay(image, mask);
  if (overlay) return { image: overlay, strategy: "overlay-subtract" };
  return { image: inpaintExemplar(image, mask), strategy: "exemplar-inpaint" };
}
