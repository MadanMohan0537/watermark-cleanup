# Watermark Cleanup

[![CI](https://github.com/MadanMohan0537/watermark-cleanup/actions/workflows/ci.yml/badge.svg)](https://github.com/MadanMohan0537/watermark-cleanup/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-teal.svg)](LICENSE)
![Next.js](https://img.shields.io/badge/Next.js-16-black)
![React](https://img.shields.io/badge/React-19-61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6)
![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020)

A privacy-first, human-in-the-loop workspace for reviewing and cleaning unwanted overlay-like content from **images, PDFs, and text documents that you own or are authorized to edit**.

Instead of treating cleanup as a black box, Watermark Cleanup exposes the detection step, lets the user decide what should stay or be removed, supports manual mask refinement, compares the result, and exports both the cleaned file and an optional processing report.

### Live application

**https://watermark-cleanup.madanmohanlearning.workers.dev/**

![Watermark Cleanup home screen](docs/screenshots/app-home.png)

---

## Why this project exists

Most cleanup tools optimize for one-click removal. That is convenient, but it can also be destructive: false detections may erase valid content, users often cannot see what changed, and files may be sent to a remote service unnecessarily.

Watermark Cleanup takes a different approach:

- **Review before removal** — detections are proposals, not automatic deletions.
- **Local-first processing** — supported workflows stay in the browser whenever possible.
- **Least-destructive cleanup** — only confirmed regions are reconstructed or removed.
- **User control** — detected regions can be kept, removed, painted, erased, expanded, shrunk, undone, or redone.
- **Transparent output** — users can compare the original and processed result before downloading.
- **Traceable processing** — an optional JSON cleanup report records what the workflow detected and acted on.

## Product highlights

- Polished, guided portfolio/demo experience.
- PNG, JPG/JPEG, WEBP, PDF, TXT, and Markdown workflows.
- Authorized built-in sample image, PDF, and text files for instant testing.
- Paste-text mode for trying the document workflow without uploading a file.
- Magic-byte/file-content classification instead of trusting extensions alone.
- Heuristic overlay detection with confidence-scored **Keep / Remove** review.
- Rectangle, brush, and erase mask tools.
- Expand/shrink mask refinement.
- Mask **undo / redo** with keyboard support.
- Before/after image comparison.
- PDF page review and supported text-overlay cleanup.
- Side-by-side text diff before export.
- Downloadable cleanup report.
- Browser capability indicator for WebGPU / WebAssembly readiness.
- Cloudflare Workers deployment through OpenNext.
- GitHub Actions CI for tests, linting, type checking, and production builds.

> **WebGPU note:** the capability indicator reports whether the browser exposes WebGPU. The current cleanup pipeline does not claim GPU-accelerated reconstruction yet.

---

## Demo flow

The fastest way to evaluate the project is through the built-in samples.

1. Open the [live application](https://watermark-cleanup.madanmohanlearning.workers.dev/).
2. Choose **Try sample image**, **Try sample PDF**, or one of the sample controls in the workspace.
3. Inspect the detected overlay candidates.
4. Mark regions as **Keep** or **Remove**.
5. For images, refine the mask with rectangle, brush, erase, expand, shrink, undo, or redo.
6. Run the cleanup.
7. Compare the original and cleaned result.
8. Download the cleaned file and, when available, the processing report.

This makes the project reviewable without requiring a recruiter, developer, or tester to prepare their own input file first.

---

## How the pipeline works

```text
Upload / paste / sample
          │
          ▼
Validate + classify input
          │
          ▼
Analyze likely overlay regions
          │
          ▼
Human review: Keep / Remove
          │
          ▼
Optional manual mask editing
          │
          ▼
Least-destructive cleanup
          │
          ▼
Before / after comparison
          │
          ▼
Clean file + optional JSON report
```

### 1. Input validation and classification

The application classifies files from their contents instead of relying only on the filename extension. This reduces accidental MIME/extension mismatches and gives the processing layer a consistent media type.

### 2. Detection

#### Images

The detector scores overlay-like areas using signals including:

- alpha/transparency behavior
- luminance changes
- corner and edge contrast
- compact overlay geometry
- repeated or tiled visual patterns

The goal is to surface likely candidates for review rather than silently delete pixels.

#### PDFs and text

PDF/text analysis looks for repeated, rotated, translucent, or overlay-like strings. The implementation is intentionally conservative to reduce false positives on normal document content.

### 3. Cleanup

The processor chooses the least destructive available operation for the selected media type:

1. Reverse a uniform translucent overlay when the detected model is suitable.
2. Otherwise reconstruct only the confirmed image mask with local inpainting.
3. For supported PDFs, remove confirmed overlay text from page content.
4. For text documents, generate a proposed cleaned version and show the diff before export.

---

## Supported formats

| Format | Current workflow |
| --- | --- |
| PNG | Detect → review → mask edit → clean → compare → export |
| JPG / JPEG | Detect → review → mask edit → clean → compare → export |
| WEBP | Browser-side cleanup workflow |
| PDF | Inspect pages → review supported overlays → clean → export |
| TXT | Detect repeated overlay-like text → review → diff → export |
| Markdown | Detect repeated overlay-like text → review → diff → export |

Video files can be recognized by the processor architecture, but video cleanup is **not implemented**.

---

## Tech stack

| Area | Technology |
| --- | --- |
| Framework | Next.js 16 |
| UI runtime | React 19 |
| Language | TypeScript |
| Styling | Tailwind CSS |
| UI primitives | Radix UI |
| Icons | Lucide React |
| Image processing | `fast-png`, `jpeg-js`, local pixel/mask pipeline |
| PDF processing | `pdf-lib`, `pdfjs-dist` |
| Validation | Zod |
| Testing | Vitest |
| CI | GitHub Actions, Node.js 24 |
| Edge deployment | Cloudflare Workers + `@opennextjs/cloudflare` |

---

## Architecture

```text
app/
├── page.tsx                  Application entry
└── api/                      Optional server-side API routes

components/
├── comparison/              Before/after and diff views
├── editor/                  Detection review and mask editor
├── layout/                  Header/navigation
├── results/                 Download/export UI
├── uploader/                Authorization and input flows
└── workspace/               Main client workflow and capability UI

lib/
├── client/                  Browser orchestration + cleanup report
├── detection/               Overlay detection logic
├── image-processing/        Pixel buffers, masks, reconstruction
├── pdf-processing/          PDF analysis and cleanup
├── processors/              Media processor registry
├── security/                Input/security helpers
├── storage/                 Temporary storage abstraction
└── text-processing/         Text detection and cleanup

public/samples/              Authorized demo assets
fixtures/                    Authorized test fixtures
docs/                        Architecture, API, usage, deployment docs
scripts/                     Fixture/public asset generation
.github/                     CI and repository templates
```

For a deeper implementation overview, see [docs/architecture.md](docs/architecture.md).

---

## Local development

### Requirements

- Node.js **24+**
- npm

### Setup

```bash
git clone https://github.com/MadanMohan0537/watermark-cleanup.git
cd watermark-cleanup
npm install
npm run generate:fixtures
npm run generate:assets
npm run dev
```

Open:

```text
http://localhost:3000
```

### Useful commands

```bash
npm run dev              # Next.js development server
npm run test             # Vitest suite
npm run lint             # ESLint
npm run typecheck        # TypeScript validation
npm run build            # Next.js production build (used by CI and OpenNext)
npm run build:cloudflare # OpenNext Cloudflare Worker build
npm run preview          # Build and preview the Worker locally
npm run deploy           # Build and deploy through OpenNext
```

---

## Testing and quality gates

The repository includes automated tests for core processing behavior, including file classification, image detection, false-positive cases, image reconstruction, PDF processing, and text processing.

Before merging changes, run:

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

GitHub Actions performs the same quality checks for pull requests and pushes to `master`.

---

## Cloudflare Workers deployment

The app is deployed as a Next.js application on **Cloudflare Workers** through OpenNext.

### Production URL

**https://watermark-cleanup.madanmohanlearning.workers.dev/**

### Important build detail

`wrangler.jsonc` uses the generated OpenNext entry point:

```text
.open-next/worker.js
```

Therefore the deployment pipeline must run an **OpenNext build**, not only `next build`.

OpenNext invokes `npm run build` (`next build`) internally, then packages `.open-next/worker.js`. Do not point the `build` script at `opennextjs-cloudflare build` — that recurses until the Workers build times out.

A direct deployment can be run with:

```bash
npm run deploy
```

For Cloudflare Workers Builds, use:

| Setting | Value |
| --- | --- |
| Build command | `npx @opennextjs/cloudflare build` |
| Deploy command | `npx @opennextjs/cloudflare deploy` |
| Worker entry point | `.open-next/worker.js` |
| Assets | `.open-next/assets` |

See [docs/deployment.md](docs/deployment.md) for additional deployment notes.

---

## Privacy and responsible use

This project is deliberately designed around authorized content and user review.

- Process only files you own or are authorized to modify.
- The browser/local workflow is preferred whenever the format supports it.
- Original files are not modified in place.
- Files are not used for model training.
- Temporary server-side objects, when used, are addressed through randomized identifiers and expire automatically.
- Built-in samples are project-owned fixtures created specifically for testing and demonstration.

This project is **not intended to remove copyright notices, signatures, authenticity marks, licenses, or ownership identifiers from third-party material**.

---

## Current limitations

- Detection is heuristic and can miss subtle or heavily blended overlays.
- Complex photographic reconstruction can leave visible seams or texture artifacts.
- Encrypted PDFs are rejected.
- Server-side WEBP decoding is not part of the current backend path.
- OCR-assisted scanned-document detection is not yet integrated.
- WebGPU is reported as a browser capability only; the processing pipeline currently uses the existing CPU/browser implementation.
- Video cleanup is not implemented.

---

## Roadmap

High-value additions that fit the current architecture:

- **Batch workspace** — process multiple authorized files with independent review states.
- **OCR-assisted document detection** — improve overlay detection on scanned PDFs and image-based documents.
- **Processing telemetry** — show per-stage timings, resolution, mask size, and selected cleanup path.
- **WebGPU acceleration** — optional local vision/reconstruction modules with WebAssembly/CPU fallback.
- **Improved reconstruction** — stronger texture-aware inpainting for complex backgrounds.
- **Video workflow** — frame-aware cleanup for authorized footage with temporal consistency.

---

## Documentation

| Document | Description |
| --- | --- |
| [Usage guide](docs/usage.md) | End-user workflow |
| [Architecture](docs/architecture.md) | Detection and processing design |
| [API](docs/api.md) | Optional server API |
| [Deployment](docs/deployment.md) | Cloudflare/OpenNext deployment |
| [Contributing](CONTRIBUTING.md) | Contribution guidelines |
| [Security](SECURITY.md) | Security reporting |

---

## Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request, and include tests for changes to detection or cleanup behavior where applicable.

## Security

Please report security issues using the process documented in [SECURITY.md](SECURITY.md).

## License

Licensed under the [MIT License](LICENSE).
