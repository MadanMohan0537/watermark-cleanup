# Watermark Cleanup

[![CI](https://github.com/MadanMohan0537/watermark-cleanup/actions/workflows/ci.yml/badge.svg)](https://github.com/MadanMohan0537/watermark-cleanup/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-teal.svg)](LICENSE)
[![Live demo](https://img.shields.io/badge/demo-live-0f766e)](https://watermark-cleanup.madanmohanlearning.workers.dev/)

Privacy-first watermark and overlay cleanup for images, PDFs, and text documents. Upload content you own or are authorized to edit, review detected overlays, choose what should be removed, and export a cleaned copy without blindly modifying the original.

**Live demo:** https://watermark-cleanup.madanmohanlearning.workers.dev/  
**Source:** https://github.com/MadanMohan0537/watermark-cleanup

![Watermark Cleanup home screen](docs/screenshots/app-home.png)

## Why this project

Most watermark-removal tools either upload files to opaque services or apply aggressive edits with little user control. Watermark Cleanup is designed around three principles:

- **User review first** — detections are suggestions, not automatic deletions.
- **Least-destructive editing** — only selected regions are reconstructed or removed.
- **Privacy by default** — the main processing path runs locally in the browser whenever possible.

## Core features

- Drag-and-drop upload for PNG, JPG/JPEG, WEBP, PDF, TXT, and Markdown.
- Paste-text input for document cleanup without creating a file first.
- Built-in authorized sample image and sample text so you can try the workflow immediately.
- Magic-byte file classification instead of trusting file extensions.
- Heuristic overlay detection for corner badges, translucent regions, repeated patterns, timestamps, repeated headers, and overlay-like text.
- Confidence-scored detections with per-region **Keep / Remove** review.
- Manual rectangle, brush, erase, expand, and shrink tools for image masks, with keyboard shortcuts `R`, `B`, and `E`.
- Before/after comparison for cleaned images.
- PDF page review and text-aware PDF cleanup without rasterizing the whole document when possible.
- Side-by-side text diff before export.
- Local reconstruction / inpainting for selected image regions.
- Downloadable cleaned output with warnings when cleanup is only partial.
- Ownership / authorization confirmation before processing.

## How it works

```text
Upload, paste, or load a sample
        ↓
Validate and classify file
        ↓
Detect possible overlays
        ↓
User reviews / edits regions
        ↓
Apply least-destructive cleanup
        ↓
Compare original vs cleaned result
        ↓
Download cleaned file
```

### Detection

Image detectors score overlay-like regions using signals such as transparency, edge/corner contrast, luminance changes, compact geometry, and repeated patterns. PDF and text detectors look for repeated, rotated, translucent, or overlay-like strings.

Detection is intentionally conservative. The application is designed to avoid silently removing normal body content.

### Cleanup

The processing pipeline prefers the least destructive option available:

1. Reverse a uniform translucent overlay when the model fits.
2. Otherwise reconstruct only the selected image mask using local inpainting.
3. For PDFs, remove confirmed overlay text from page content when possible.
4. For text, show the proposed result before anything is exported.

## Supported formats

| Input | Current output / behavior |
| --- | --- |
| PNG | Cleaned image |
| JPG / JPEG | Cleaned image |
| WEBP | Browser-side cleanup |
| PDF | Cleaned PDF where supported |
| TXT / Markdown | Cleaned text |

Video files can be classified by the processor registry, but video watermark cleanup is not implemented yet.

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js 16, React 19, TypeScript |
| Styling / UI | Tailwind CSS, Radix UI, Lucide React |
| Image processing | `fast-png`, `jpeg-js`, local pixel/mask pipeline |
| PDF processing | `pdf-lib`, `pdfjs-dist` |
| Validation | Zod |
| Testing | Vitest |
| Deployment | Cloudflare Workers via OpenNext |

## Privacy and safety model

- Browser/local processing is the default path.
- Originals are not used for model training.
- Server-side temporary files, when used, are addressed by random IDs and expire after 30 minutes.
- The original file is not modified in place.
- The user must confirm ownership or permission before processing their own files.
- Built-in samples are project-owned fixtures, so they can be loaded without a separate upload.

Use this project only for files you own or are authorized to edit. It is not intended to remove copyright notices, signatures, authenticity marks, licenses, or ownership identifiers from third-party material.

## Project structure

```text
app/                  Next.js pages and API routes
components/
  comparison/         Before/after and diff views
  editor/             Region review and manual mask tools
  layout/             Site header and navigation
  results/            Export/download UI
  uploader/           Authorization and file-input flow
  workspace/          Main application workflow
lib/                  Detection, processing, validation, storage, and shared types
public/samples/       Authorized demo files used by the live app
fixtures/             Authorized test fixtures
docs/                 Architecture, usage, API, and deployment notes
scripts/              Fixture and public-asset generation
.github/              CI, issue templates, and pull request template
```

## Documentation

| Document | What it covers |
| --- | --- |
| [docs/usage.md](docs/usage.md) | End-user walkthrough |
| [docs/architecture.md](docs/architecture.md) | Detection and cleanup pipeline |
| [docs/api.md](docs/api.md) | Optional server API |
| [docs/deployment.md](docs/deployment.md) | Cloudflare Workers / OpenNext |
| [CONTRIBUTING.md](CONTRIBUTING.md) | How to propose changes |
| [SECURITY.md](SECURITY.md) | Vulnerability reporting |

## Local development

### Requirements

- Node.js 20+
- npm

```bash
git clone https://github.com/MadanMohan0537/watermark-cleanup.git
cd watermark-cleanup
npm install
npm run generate:fixtures
npm run generate:assets
npm run dev
```

Open `http://localhost:3000`.

On the home screen you can confirm permission and upload a file, or click **Sample image** / **Sample text** to run the built-in authorized examples.

## Quality checks

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

CI runs those checks on every push and pull request to `master`. Authorized test files are stored under `fixtures/authorized`.

## Cloudflare deployment

This project is configured for **Cloudflare Workers** using `@opennextjs/cloudflare`.

```bash
npx wrangler login
npm run deploy
```

For Git-connected Cloudflare Workers Builds:

| Setting | Value |
| --- | --- |
| Build command | `npm run build:cloudflare` |
| Deploy command | `npx opennextjs-cloudflare deploy` |
| Root directory | `/` |

A plain `npm run build` only creates the standard Next.js output and is not enough for a Workers deployment.

Detailed deployment instructions are available in [docs/deployment.md](docs/deployment.md).

## Current limitations

- Overlay detection is heuristic and can miss subtle or highly blended marks.
- Complex photographic reconstruction can leave visible seams.
- Encrypted PDFs are rejected.
- Server-side WEBP decoding is not supported; use the browser path.
- OCR and OpenCV.js integrations are optional extension points rather than hard dependencies.
- Video cleanup is not implemented yet.

## Possible next steps

Good future extensions include batch processing, optional OCR-assisted text-mask detection, worker-backed job history with strict TTL deletion, and video-frame cleanup with temporal consistency.

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request.

## Security

Please follow the reporting guidance in [SECURITY.md](SECURITY.md) for security issues.

## License

Licensed under the [MIT License](LICENSE).
