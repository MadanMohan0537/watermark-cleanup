# Contributing

Thanks for helping improve Watermark Cleanup.

## What this project is

A privacy-first utility for people who own a file or have permission to edit it. Users review detected overlays before anything is removed. Ordinary document content must not be deleted because a detector guessed wrong.

## Setup

```bash
npm install
npm run dev
npm test
npm run lint
npm run typecheck
```

## Guidelines

- Keep processing local whenever possible.
- Prefer the least destructive removal method first.
- Never claim a watermark was removed if reconstruction failed.
- Add a test when you change detection or cleanup behavior, especially false-positive cases.
- Do not add features meant to strip copyright marks, licenses, signatures, or authenticity systems from other people's material.

## Pull requests

1. Keep the change focused.
2. Run lint, typecheck, tests, and `npm run build`.
3. Describe the user-facing result, not just the code.
