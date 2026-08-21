# Usage

This walkthrough covers the live app at https://watermark-cleanup.madanmohanlearning.workers.dev/ and a local `npm run dev` session.

## Before you start

Use the tool only with files you own or are authorized to edit. Do not use it to strip copyright marks, licenses, signatures, or authenticity systems from someone else's material.

The main path processes files in the browser. The original file on disk is never overwritten; you download a new copy if you accept the result.

## Fastest path: authorized samples

The home screen includes two project-owned examples:

1. Click **Sample image** to load a generated landscape with a corner overlay.
2. Review the detected region. Keep it or paint a different mask if needed.
3. Click **Clean selected**, compare the before/after slider, then download.
4. Click **Start over** and try **Sample text** to see repeated-header detection and a side-by-side text diff.

Samples skip a separate file picker because they ship with the repository. Your own uploads still require the ownership checkbox.

## Clean an image you own

1. Confirm the ownership checkbox.
2. Drop a PNG, JPG, JPEG, or WEBP file, or browse from disk.
3. Wait for analysis. Detected overlays appear as boxes with confidence scores.
4. For each region, choose **Keep** or **Remove**.
5. If detection missed the mark, use:
   - **Rectangle (R)** to box a region
   - **Brush (B)** to paint extra pixels
   - **Erase (E)** to subtract from the mask
   - **Expand** / **Shrink** to grow or contract the current mask
6. Click **Clean selected**.
7. Inspect the before/after comparison. If reconstruction is incomplete, a warning is shown.
8. Download the cleaned file.

WEBP is decoded in the browser. Prefer the web app over the optional server API for WEBP files.

## Clean a PDF

1. Confirm ownership and upload a PDF.
2. Review overlay-like text detections. Encrypted PDFs are rejected.
3. Keep body content. Remove only confirmed overlay strings.
4. Use the page control when the document has more than one page.
5. Export a cleaned PDF. Scanned pages without selectable text should be exported as images and cleaned with the image editor.

## Clean a text document

1. Confirm ownership, then upload `.txt` / `.md` or use **Paste text**.
2. Repeated header/footer-like lines are proposed for removal and start as **Keep**.
3. Mark the overlay strings as **Remove** after you have reviewed the diff.
4. Export the cleaned text.

Nothing is deleted until you confirm the strings to remove.

## If something goes wrong

| Symptom | What to try |
| --- | --- |
| Upload is disabled | Check the ownership checkbox first. |
| No overlay detected | Paint the region manually, then clean. |
| Low-confidence warning | Review each region before removing all of them. |
| File too large | Stay under 25 MB for images, 40 MB for PDFs, and 2 MB for text. |
| Encrypted PDF | Decrypt the file with a tool you are authorized to use, then retry. |
| Partial result | The original is unchanged. Adjust the mask and clean again. |

## Optional server API

The UI does not need the API. If you are automating jobs, see [api.md](api.md). Temporary server copies, when used, expire after 30 minutes.
