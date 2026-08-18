import { encodeImageBytes } from "@/lib/image-processing/codec";
import { createImage, drawGlyphBand, fillRect, type RgbaImage } from "@/lib/image-processing/buffer";
import { classifyUpload } from "@/lib/security/classify";
import type { ClassifiedFile } from "@/lib/types";

export function naturalScene(width = 160, height = 120): RgbaImage {
  const image = createImage(width, height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      const wave = Math.sin(x / 18) * 6 + Math.cos(y / 14) * 5;
      image.data[i] = 72 + (x / width) * 36 + wave;
      image.data[i + 1] = 108 + (y / height) * 28 + wave * 0.4;
      image.data[i + 2] = 88 + (1 - y / height) * 22;
      image.data[i + 3] = 255;
    }
  }
  return image;
}

export function cornerOverlayImage() {
  const image = naturalScene();
  fillRect(image, image.width - 44, image.height - 22, 40, 18, [252, 252, 252, 255]);
  drawGlyphBand(image, image.width - 40, image.height - 17, [24, 24, 24, 255], 1);
  return image;
}

export function translucentOverlayImage() {
  const image = naturalScene(180, 120);
  fillRect(image, 18, 74, 144, 18, [255, 255, 255, 255], 0.4);
  for (let i = 0; i < 10; i += 1) {
    drawGlyphBand(image, 24 + i * 14, 78, [255, 255, 255, 255], 0.55);
  }
  return image;
}

export function repeatedOverlayImage() {
  const image = naturalScene(200, 140);
  for (let y = 10; y < image.height; y += 36) {
    for (let x = 10; x < image.width; x += 44) {
      fillRect(image, x, y, 16, 8, [255, 255, 255, 255], 0.38);
    }
  }
  return image;
}

export function multiRegionImage() {
  const image = naturalScene(180, 130);
  fillRect(image, 6, 6, 36, 16, [250, 250, 250, 255]);
  drawGlyphBand(image, 10, 10, [20, 20, 20, 255], 1);
  fillRect(image, image.width - 42, image.height - 20, 36, 14, [250, 250, 250, 255]);
  drawGlyphBand(image, image.width - 38, image.height - 16, [20, 20, 20, 255], 1);
  return image;
}

export function photographicCornerImage() {
  const image = naturalScene(160, 120);
  for (let y = 4; y < 44; y += 1) {
    for (let x = 4; x < 44; x += 1) {
      const i = (y * image.width + x) * 4;
      const n = ((x * 47 + y * 19) % 97) / 97;
      image.data[i] = 40 + n * 200;
      image.data[i + 1] = 20 + ((x * y) % 180);
      image.data[i + 2] = 30 + ((x * 13 + y * 9) % 160);
      image.data[i + 3] = 255;
    }
  }
  return image;
}

export function asPngFile(image: RgbaImage, name: string): ClassifiedFile {
  return classifyUpload(encodeImageBytes(image, "image/png"), name);
}

export const sampleTextDocument = `CONFIDENTIAL COPY
Meeting notes for the weekly planning session.
The budget review will happen on Thursday.

CONFIDENTIAL COPY
Action items stay with the original owners.
Please keep the product roadmap attached.

CONFIDENTIAL COPY
End of notes.
`;
