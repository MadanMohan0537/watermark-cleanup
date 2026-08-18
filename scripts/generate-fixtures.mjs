import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { encode } from "fast-png";
import { PDFDocument } from "pdf-lib";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "fixtures", "authorized");

function scene(width, height, overlay) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      data[i] = 72 + (x / width) * 36;
      data[i + 1] = 108 + (y / height) * 28;
      data[i + 2] = 88;
      data[i + 3] = 255;
    }
  }
  overlay?.(data, width, height);
  return encode({ width, height, data });
}

function box(data, width, x0, y0, w, h, color, blend = 1) {
  for (let y = y0; y < y0 + h; y += 1) {
    for (let x = x0; x < x0 + w; x += 1) {
      const i = (y * width + x) * 4;
      data[i] = data[i] * (1 - blend) + color[0] * blend;
      data[i + 1] = data[i + 1] * (1 - blend) + color[1] * blend;
      data[i + 2] = data[i + 2] * (1 - blend) + color[2] * blend;
    }
  }
}

writeFileSync(join(root, "clean.png"), scene(160, 120));
writeFileSync(
  join(root, "corner-overlay.png"),
  scene(160, 120, (data, width, height) => box(data, width, width - 44, height - 22, 40, 18, [252, 252, 252])),
);

const pdf = await PDFDocument.create();
for (let i = 0; i < 2; i += 1) {
  const page = pdf.addPage([612, 792]);
  page.drawText(`Authorized sample page ${i + 1}.`, { x: 72, y: 720, size: 14 });
  page.drawText("CONFIDENTIAL", { x: 180, y: 400, size: 28, opacity: 0.35 });
}
writeFileSync(join(root, "sample.pdf"), await pdf.save());
console.log("Wrote authorized sample images and PDF.");
