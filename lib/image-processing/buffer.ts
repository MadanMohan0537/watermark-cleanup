export interface RgbaImage {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

export function createImage(width: number, height: number, fill?: [number, number, number, number]): RgbaImage {
  const data = new Uint8ClampedArray(width * height * 4);
  if (fill) {
    for (let i = 0; i < data.length; i += 4) {
      data[i] = fill[0];
      data[i + 1] = fill[1];
      data[i + 2] = fill[2];
      data[i + 3] = fill[3];
    }
  }
  return { width, height, data };
}

export function cloneImage(image: RgbaImage): RgbaImage {
  return {
    width: image.width,
    height: image.height,
    data: new Uint8ClampedArray(image.data),
  };
}

export function idx(image: RgbaImage, x: number, y: number) {
  return (y * image.width + x) * 4;
}

export function inBounds(image: RgbaImage, x: number, y: number) {
  return x >= 0 && y >= 0 && x < image.width && y < image.height;
}

export function luminance(r: number, g: number, b: number) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function forEachPixel(
  image: RgbaImage,
  fn: (x: number, y: number, r: number, g: number, b: number, a: number, i: number) => void,
) {
  const { data, width, height } = image;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      fn(x, y, data[i], data[i + 1], data[i + 2], data[i + 3], i);
    }
  }
}

export function crop(image: RgbaImage, x: number, y: number, width: number, height: number): RgbaImage {
  const srcX = Math.max(0, Math.floor(x));
  const srcY = Math.max(0, Math.floor(y));
  const w = Math.max(1, Math.min(image.width - srcX, Math.floor(width)));
  const h = Math.max(1, Math.min(image.height - srcY, Math.floor(height)));
  const out = createImage(w, h);
  for (let yy = 0; yy < h; yy += 1) {
    const srcStart = ((srcY + yy) * image.width + srcX) * 4;
    const dstStart = yy * w * 4;
    out.data.set(image.data.subarray(srcStart, srcStart + w * 4), dstStart);
  }
  return out;
}

export function fillRect(
  image: RgbaImage,
  x: number,
  y: number,
  width: number,
  height: number,
  color: [number, number, number, number],
  blend = 1,
) {
  const x0 = Math.max(0, Math.floor(x));
  const y0 = Math.max(0, Math.floor(y));
  const x1 = Math.min(image.width, Math.ceil(x + width));
  const y1 = Math.min(image.height, Math.ceil(y + height));
  for (let yy = y0; yy < y1; yy += 1) {
    for (let xx = x0; xx < x1; xx += 1) {
      const i = idx(image, xx, yy);
      image.data[i] = image.data[i] * (1 - blend) + color[0] * blend;
      image.data[i + 1] = image.data[i + 1] * (1 - blend) + color[1] * blend;
      image.data[i + 2] = image.data[i + 2] * (1 - blend) + color[2] * blend;
      image.data[i + 3] = Math.max(image.data[i + 3], color[3] * blend);
    }
  }
}

export function drawGlyphBand(
  image: RgbaImage,
  x: number,
  y: number,
  color: [number, number, number, number],
  alpha = 1,
) {
  const pattern = [
    [1, 1, 1, 0, 1, 0, 1],
    [1, 0, 1, 0, 1, 0, 1],
    [1, 1, 1, 0, 1, 1, 1],
    [1, 0, 1, 0, 0, 0, 1],
    [1, 0, 1, 0, 1, 1, 1],
  ];
  for (let gy = 0; gy < pattern.length; gy += 1) {
    for (let gx = 0; gx < pattern[0].length; gx += 1) {
      if (!pattern[gy][gx]) continue;
      const px = x + gx;
      const py = y + gy;
      if (!inBounds(image, px, py)) continue;
      const i = idx(image, px, py);
      image.data[i] = image.data[i] * (1 - alpha) + color[0] * alpha;
      image.data[i + 1] = image.data[i + 1] * (1 - alpha) + color[1] * alpha;
      image.data[i + 2] = image.data[i + 2] * (1 - alpha) + color[2] * alpha;
    }
  }
}
