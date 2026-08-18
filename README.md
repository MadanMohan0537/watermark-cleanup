# Watermark Cleanup

Privacy-focused cleanup for files you own or are allowed to edit. Upload a file, review detected overlays, then export a clean copy.

This is a focused utility: **upload → identify unwanted overlay → review → remove → download**. It does not claim perfect watermark removal.

## What it does

- Accepts PNG, JPG/JPEG, WEBP (browser), PDF, and TXT/Markdown.
- Looks for overlay-like marks: corner badges, translucent or diagonal text, repeated logos, timestamps, and repeated document headers.
- Shows each detection with a bounding box, confidence, and Keep / Remove.
- Reconstructs only the selected region for images. PDFs and text files keep layout and body content.
- Processes in the browser whenever possible. Optional API routes store files only under random ids and delete them automatically.

## How detection works

Files are classified from magic bytes, not extensions. Image detectors then score compact, overlay-like regions:

- Alpha / transparency
- Corner and edge contrast
- Translucent luminance lift
- Repeated tiled patterns

PDF and text detectors look for rotated, translucent, or repeated overlay strings. Ordinary high-texture content is treated as part of the file, not a watermark.

Automatic detection will miss some marks and can be wrong. Manual rectangle, brush, and erase tools are part of the product, not a fallback afterthought.

## How removal works

The pipeline picks the least destructive option first:

1. Reverse a uniform translucent overlay when that model fits.
2. Otherwise inpaint only the mask (Telea-style reconstruction).
3. For PDFs, remove confirmed overlay text from page content instead of rasterizing the whole document.
4. For text, show detected lines → proposed removal → resulting text, and delete nothing until you confirm.

If leftover overlay signal is still high, the result is reported as partial.

## Supported formats

| Input | Output |
| --- | --- |
| PNG, JPG, JPEG | Same image type when possible |
| WEBP | Clean image in the browser |
| PDF | Clean PDF |
| TXT / Markdown | Clean text |

Video is classified but not processed yet. The processor registry is set up so a video module can be added later.

## Privacy model

Your files are processed temporarily and automatically deleted.

- Default path: local / browser processing. Uploads do not have to leave the device.
- Server path: random file ids, no public original filenames, 30-minute TTL, no training use.
- Confirm ownership or permission before processing.

Do not use this tool to strip copyright marks, licenses, signatures, or authenticity systems from someone else's material.

## Limitations

- Detection is heuristic. It will miss some overlays and should never silently delete body content.
- Baked-in photographic watermarks can leave seams after inpainting.
- Encrypted PDFs are rejected.
- WEBP decode on the server is not supported; use the web app.
- OpenCV.js and OCR APIs are optional hooks, not required for the core path.
- Results are best-effort, not forensic restoration.

## Local development

```bash
npm install
npm run generate:fixtures
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

Authorized sample files live in `fixtures/authorized`.

## Deployment

Host on **Cloudflare Workers** with OpenNext:

```bash
npx wrangler login
npm run deploy
```

See [docs/deployment.md](docs/deployment.md) and [docs/architecture.md](docs/architecture.md).
