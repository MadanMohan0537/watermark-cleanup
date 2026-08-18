import { Buffer } from "node:buffer";
import { decode as decodePng, encode as encodePng } from "fast-png";
import jpeg from "jpeg-js";
import { AppError } from "@/lib/errors";
import type { RgbaImage } from "@/lib/image-processing/buffer";

export function decodeImageBytes(bytes: Uint8Array, mimeType: string): RgbaImage {
  try {
    if (mimeType === "image/png") {
      const decoded = decodePng(bytes);
      const width = decoded.width;
      const height = decoded.height;
      const src = decoded.data;
      const data = new Uint8ClampedArray(width * height * 4);
      const channels = src.length / (width * height);
      if (channels === 4) {
        data.set(src);
      } else if (channels === 3) {
        for (let i = 0, o = 0; i < src.length; i += 3, o += 4) {
          data[o] = src[i];
          data[o + 1] = src[i + 1];
          data[o + 2] = src[i + 2];
          data[o + 3] = 255;
        }
      } else if (channels === 1) {
        for (let i = 0, o = 0; i < src.length; i += 1, o += 4) {
          data[o] = src[i];
          data[o + 1] = src[i];
          data[o + 2] = src[i];
          data[o + 3] = 255;
        }
      } else {
        throw new Error("unsupported png channels");
      }
      return { width, height, data };
    }

    if (mimeType === "image/jpeg") {
      const decoded = jpeg.decode(bytes, { maxMemoryUsageInMB: 128, useTArray: true });
      return {
        width: decoded.width,
        height: decoded.height,
        data: new Uint8ClampedArray(decoded.data),
      };
    }
  } catch {
    throw new AppError("corrupted_file", "The image could not be decoded. It may be corrupted.");
  }

  if (mimeType === "image/webp") {
    throw new AppError(
      "unsupported_file",
      "WEBP decoding runs in the browser. Open this file in the web app to process it locally.",
    );
  }

  throw new AppError("unsupported_file", "This image format is not supported.");
}

export function encodeImageBytes(image: RgbaImage, mimeType: string): Uint8Array {
  if (mimeType === "image/jpeg") {
    const encoded = jpeg.encode(
      { data: Buffer.from(image.data), width: image.width, height: image.height },
      92,
    );
    return new Uint8Array(encoded.data);
  }
  const encoded = encodePng({
    width: image.width,
    height: image.height,
    data: image.data,
  });
  return encoded instanceof Uint8Array ? encoded : new Uint8Array(encoded);
}

export async function decodeWithCanvas(file: Blob): Promise<RgbaImage> {
  const bitmap = await createImageBitmap(file);
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new AppError("processing_failure", "Could not read this image in the browser.");
  ctx.drawImage(bitmap, 0, 0);
  const pixels = ctx.getImageData(0, 0, bitmap.width, bitmap.height);
  bitmap.close();
  return {
    width: pixels.width,
    height: pixels.height,
    data: new Uint8ClampedArray(pixels.data),
  };
}

export async function encodeWithCanvas(image: RgbaImage, mimeType: string): Promise<Uint8Array> {
  const canvas = new OffscreenCanvas(image.width, image.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new AppError("processing_failure", "Could not write this image in the browser.");
  const pixels = new ImageData(new Uint8ClampedArray(image.data), image.width, image.height);
  ctx.putImageData(pixels, 0, 0);
  const blob = await canvas.convertToBlob({
    type: mimeType === "image/jpeg" ? "image/jpeg" : mimeType === "image/webp" ? "image/webp" : "image/png",
    quality: mimeType === "image/png" ? undefined : 0.92,
  });
  return new Uint8Array(await blob.arrayBuffer());
}
