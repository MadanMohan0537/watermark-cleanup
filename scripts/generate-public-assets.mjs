import { mkdirSync, writeFileSync, copyFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { encode } from "fast-png";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const samplesDir = join(root, "public", "samples");
const publicDir = join(root, "public");
const fixturesDir = join(root, "fixtures", "authorized");

mkdirSync(samplesDir, { recursive: true });

function create(width, height, paint) {
  const data = new Uint8ClampedArray(width * height * 4);
  paint(data, width, height);
  return encode({ width, height, data });
}

function setPixel(data, width, x, y, color, blend = 1) {
  if (x < 0 || y < 0 || x >= width) return;
  const i = (y * width + x) * 4;
  if (i < 0 || i + 3 >= data.length) return;
  data[i] = data[i] * (1 - blend) + color[0] * blend;
  data[i + 1] = data[i + 1] * (1 - blend) + color[1] * blend;
  data[i + 2] = data[i + 2] * (1 - blend) + color[2] * blend;
  data[i + 3] = 255;
}

function fillRect(data, width, x0, y0, w, h, color, blend = 1) {
  for (let y = y0; y < y0 + h; y += 1) {
    for (let x = x0; x < x0 + w; x += 1) {
      setPixel(data, width, x, y, color, blend);
    }
  }
}

function glyph(data, width, x, y, color, scale = 2) {
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
      fillRect(data, width, x + gx * scale, y + gy * scale, scale, scale, color);
    }
  }
}

const samplePng = create(960, 540, (data, width, height) => {
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const wave = Math.sin(x / 48) * 10 + Math.cos(y / 36) * 8;
      setPixel(data, width, x, y, [
        86 + (x / width) * 42 + wave,
        118 + (y / height) * 34 + wave * 0.4,
        96 + (1 - y / height) * 28,
      ]);
    }
  }
  fillRect(data, width, 48, 48, 280, 180, [210, 186, 150], 0.35);
  fillRect(data, width, 620, 90, 220, 260, [92, 128, 118], 0.28);
  const badgeW = 168;
  const badgeH = 48;
  const badgeX = width - badgeW - 28;
  const badgeY = height - badgeH - 24;
  fillRect(data, width, badgeX, badgeY, badgeW, badgeH, [252, 252, 252]);
  glyph(data, width, badgeX + 18, badgeY + 16, [28, 28, 28], 3);
  glyph(data, width, badgeX + 48, badgeY + 16, [28, 28, 28], 3);
  glyph(data, width, badgeX + 78, badgeY + 16, [28, 28, 28], 3);
  glyph(data, width, badgeX + 108, badgeY + 16, [28, 28, 28], 3);
});

writeFileSync(join(samplesDir, "corner-overlay.png"), samplePng);

const ogPng = create(1200, 630, (data, width, height) => {
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      setPixel(data, width, x, y, [244, 239, 230]);
    }
  }
  fillRect(data, width, 0, 0, 18, height, [17, 94, 89]);
  fillRect(data, width, 80, 90, 1040, 450, [255, 255, 255], 1);
  fillRect(data, width, 80, 90, 1040, 8, [17, 94, 89]);
  fillRect(data, width, 128, 160, 220, 18, [17, 94, 89], 0.85);
  fillRect(data, width, 128, 210, 760, 36, [28, 25, 23]);
  fillRect(data, width, 128, 260, 520, 18, [120, 113, 108]);
  fillRect(data, width, 128, 330, 944, 150, [244, 239, 230]);
  fillRect(data, width, 900, 380, 140, 40, [252, 252, 252]);
  glyph(data, width, 918, 390, [28, 28, 28], 3);
});

writeFileSync(join(publicDir, "og-image.png"), ogPng);

const iconPng = create(180, 180, (data, width, height) => {
  fillRect(data, width, 0, 0, width, height, [17, 94, 89]);
  fillRect(data, width, 36, 36, 108, 108, [244, 239, 230]);
  fillRect(data, width, 92, 108, 40, 14, [17, 94, 89]);
});
writeFileSync(join(publicDir, "apple-touch-icon.png"), iconPng);

const samplePdf = join(fixturesDir, "sample.pdf");
if (existsSync(samplePdf)) {
  copyFileSync(samplePdf, join(samplesDir, "sample.pdf"));
}

const sampleTxt = join(fixturesDir, "sample.txt");
if (existsSync(sampleTxt)) {
  copyFileSync(sampleTxt, join(samplesDir, "sample.txt"));
}

console.log("Wrote public samples, Open Graph image, and apple-touch icon.");
