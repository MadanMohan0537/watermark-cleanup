import { createImage, idx, inBounds, luminance, type RgbaImage } from "@/lib/image-processing/buffer";

export function grayscale(image: RgbaImage) {
  const out = new Float32Array(image.width * image.height);
  for (let i = 0, p = 0; i < image.data.length; i += 4, p += 1) {
    out[p] = luminance(image.data[i], image.data[i + 1], image.data[i + 2]);
  }
  return out;
}

export function boxBlurGray(src: Float32Array, width: number, height: number, radius: number) {
  const tmp = new Float32Array(src.length);
  const out = new Float32Array(src.length);
  const size = radius * 2 + 1;
  for (let y = 0; y < height; y += 1) {
    let sum = 0;
    for (let x = -radius; x <= radius; x += 1) {
      const xx = Math.min(width - 1, Math.max(0, x));
      sum += src[y * width + xx];
    }
    for (let x = 0; x < width; x += 1) {
      tmp[y * width + x] = sum / size;
      const leave = Math.min(width - 1, Math.max(0, x - radius));
      const enter = Math.min(width - 1, Math.max(0, x + radius + 1));
      sum += src[y * width + enter] - src[y * width + leave];
    }
  }
  for (let x = 0; x < width; x += 1) {
    let sum = 0;
    for (let y = -radius; y <= radius; y += 1) {
      const yy = Math.min(height - 1, Math.max(0, y));
      sum += tmp[yy * width + x];
    }
    for (let y = 0; y < height; y += 1) {
      out[y * width + x] = sum / size;
      const leave = Math.min(height - 1, Math.max(0, y - radius));
      const enter = Math.min(height - 1, Math.max(0, y + radius + 1));
      sum += tmp[enter * width + x] - tmp[leave * width + x];
    }
  }
  return out;
}

export function sobelMagnitude(gray: Float32Array, width: number, height: number) {
  const out = new Float32Array(width * height);
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const i = y * width + x;
      const gx =
        -gray[i - width - 1] +
        gray[i - width + 1] -
        2 * gray[i - 1] +
        2 * gray[i + 1] -
        gray[i + width - 1] +
        gray[i + width + 1];
      const gy =
        -gray[i - width - 1] -
        2 * gray[i - width] -
        gray[i - width + 1] +
        gray[i + width - 1] +
        2 * gray[i + width] +
        gray[i + width + 1];
      out[i] = Math.hypot(gx, gy);
    }
  }
  return out;
}

export function dilateMask(mask: Uint8Array, width: number, height: number, radius: number) {
  const out = new Uint8Array(mask.length);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let on = 0;
      for (let dy = -radius; dy <= radius && !on; dy += 1) {
        for (let dx = -radius; dx <= radius; dx += 1) {
          const xx = x + dx;
          const yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= width || yy >= height) continue;
          if (mask[yy * width + xx]) {
            on = 1;
            break;
          }
        }
      }
      out[y * width + x] = on;
    }
  }
  return out;
}

export function erodeMask(mask: Uint8Array, width: number, height: number, radius: number) {
  const out = new Uint8Array(mask.length);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let on = 1;
      for (let dy = -radius; dy <= radius && on; dy += 1) {
        for (let dx = -radius; dx <= radius; dx += 1) {
          const xx = x + dx;
          const yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= width || yy >= height) {
            on = 0;
            break;
          }
          if (!mask[yy * width + xx]) {
            on = 0;
            break;
          }
        }
      }
      out[y * width + x] = on;
    }
  }
  return out;
}

export function expandOrShrinkMask(
  mask: Uint8Array,
  width: number,
  height: number,
  amount: number,
) {
  if (amount === 0) return new Uint8Array(mask);
  if (amount > 0) return dilateMask(mask, width, height, amount);
  return erodeMask(mask, width, height, Math.abs(amount));
}

export interface Blob {
  id: number;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  area: number;
  pixels: Array<[number, number]>;
}

export function connectedComponents(mask: Uint8Array, width: number, height: number, minArea = 12): Blob[] {
  const seen = new Uint8Array(mask.length);
  const blobs: Blob[] = [];
  let nextId = 1;
  const stack: number[] = [];

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const start = y * width + x;
      if (!mask[start] || seen[start]) continue;
      stack.length = 0;
      stack.push(start);
      seen[start] = 1;
      const pixels: Array<[number, number]> = [];
      let minX = x;
      let minY = y;
      let maxX = x;
      let maxY = y;
      while (stack.length) {
        const i = stack.pop()!;
        const px = i % width;
        const py = Math.floor(i / width);
        pixels.push([px, py]);
        minX = Math.min(minX, px);
        minY = Math.min(minY, py);
        maxX = Math.max(maxX, px);
        maxY = Math.max(maxY, py);
        const neighbors = [i - 1, i + 1, i - width, i + width];
        for (const n of neighbors) {
          if (n < 0 || n >= mask.length || seen[n] || !mask[n]) continue;
          const nx = n % width;
          const ny = Math.floor(n / width);
          if (Math.abs(nx - px) + Math.abs(ny - py) !== 1) continue;
          seen[n] = 1;
          stack.push(n);
        }
      }
      if (pixels.length >= minArea) {
        blobs.push({
          id: nextId,
          minX,
          minY,
          maxX,
          maxY,
          area: pixels.length,
          pixels,
        });
        nextId += 1;
      }
    }
  }
  return blobs;
}

export function maskFromBlobs(blobs: Blob[], width: number, height: number, pad = 2) {
  const mask = new Uint8Array(width * height);
  for (const blob of blobs) {
    const x0 = Math.max(0, blob.minX - pad);
    const y0 = Math.max(0, blob.minY - pad);
    const x1 = Math.min(width - 1, blob.maxX + pad);
    const y1 = Math.min(height - 1, blob.maxY + pad);
    for (let y = y0; y <= y1; y += 1) {
      for (let x = x0; x <= x1; x += 1) {
        mask[y * width + x] = 1;
      }
    }
  }
  return mask;
}

export function residualScore(image: RgbaImage, mask: Uint8Array) {
  const gray = grayscale(image);
  const edges = sobelMagnitude(gray, image.width, image.height);
  let edge = 0;
  let count = 0;
  for (let i = 0; i < mask.length; i += 1) {
    if (!mask[i]) continue;
    edge += edges[i];
    count += 1;
  }
  if (!count) return 0;
  return edge / count / 255;
}

export function toMaskImage(mask: Uint8Array, width: number, height: number): RgbaImage {
  const image = createImage(width, height, [0, 0, 0, 0]);
  for (let i = 0; i < mask.length; i += 1) {
    if (!mask[i]) continue;
    const o = i * 4;
    image.data[o] = 20;
    image.data[o + 1] = 184;
    image.data[o + 2] = 166;
    image.data[o + 3] = 140;
  }
  return image;
}

export { idx, inBounds };
