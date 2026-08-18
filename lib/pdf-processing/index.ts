import {
  PDFArray,
  PDFDocument,
  PDFName,
  PDFRawStream,
  PDFStream,
  decodePDFRawStream,
} from "pdf-lib";
import { AppError } from "@/lib/errors";
import { proposeTextCleanup } from "@/lib/text-processing";
import { createId } from "@/lib/utils";
import type { AnalyzeResult, ClassifiedFile, DetectedRegion, ProcessResult, Processor } from "@/lib/types";

function latin1Decode(bytes: Uint8Array) {
  let text = "";
  for (let i = 0; i < bytes.length; i += 1) text += String.fromCharCode(bytes[i]);
  return text;
}

function latin1Encode(text: string) {
  const bytes = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i += 1) bytes[i] = text.charCodeAt(i) & 0xff;
  return bytes;
}

function isEncryptedError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /encrypt/i.test(message);
}

async function loadPdf(bytes: Uint8Array) {
  try {
    return await PDFDocument.load(bytes, { ignoreEncryption: false, updateMetadata: false });
  } catch (error) {
    if (isEncryptedError(error)) {
      throw new AppError(
        "encrypted_pdf",
        "This PDF is encrypted. Export an unlocked copy you are allowed to edit, then try again.",
      );
    }
    throw new AppError("corrupted_file", "The PDF could not be opened. It may be corrupted.");
  }
}

function streamToText(stream: PDFStream) {
  try {
    if (typeof (stream as PDFStream & { getUnencodedContents?: () => Uint8Array }).getUnencodedContents === "function") {
      return latin1Decode(
        (stream as PDFStream & { getUnencodedContents: () => Uint8Array }).getUnencodedContents(),
      );
    }
    if (stream instanceof PDFRawStream) {
      return latin1Decode(decodePDFRawStream(stream).decode());
    }
    return stream.getContentsString();
  } catch {
    try {
      if (stream instanceof PDFRawStream) {
        return latin1Decode(decodePDFRawStream(stream).decode());
      }
    } catch {
      return stream.getContentsString();
    }
    return stream.getContentsString();
  }
}

function allDecodedStreams(pdf: PDFDocument) {
  const chunks: string[] = [];
  for (const [, object] of pdf.context.enumerateIndirectObjects()) {
    if (object instanceof PDFStream) chunks.push(streamToText(object));
  }
  return chunks.join("\n");
}

function stripPdfText(content: string, text: string) {
  const escaped = text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const hex = [...text].map((char) => char.charCodeAt(0).toString(16).padStart(2, "0")).join("");
  return content
    .replace(new RegExp(`\\(${escaped}\\)`, "g"), "()")
    .replace(new RegExp(`<${hex}>`, "gi"), "<>");
}

function extractShownText(content: string) {
  const found: Array<{ text: string; diagonal: boolean; translucent: boolean }> = [];
  const diagonal = /[-+]0\.7\d+\s+[-+]0\.7\d+/.test(content) || /0\.707/.test(content);
  const translucent = /\/Ca\s+0?\.\d+/i.test(content) || /\bca\s+0?\.\d+/i.test(content);
  const push = (text: string) => {
    const cleaned = text.replace(/\s+/g, " ").trim();
    if (cleaned.length >= 3) found.push({ text: cleaned, diagonal, translucent });
  };
  for (const match of content.matchAll(/\((?:\\.|[^\\)]){3,}\)/g)) {
    push(
      match[0]
        .replace(/^\(|\)$/g, "")
        .replace(/\\n/g, "\n")
        .replace(/\\[()\\]/g, (value) => value.slice(1)),
    );
  }
  for (const match of content.matchAll(/<([0-9A-Fa-f\s]+)>/g)) {
    const hex = match[1].replace(/\s/g, "");
    if (hex.length < 6 || hex.length % 2) continue;
    let text = "";
    for (let i = 0; i < hex.length; i += 2) text += String.fromCharCode(Number.parseInt(hex.slice(i, i + 2), 16));
    push(text);
  }
  return found;
}

function asStream(page: ReturnType<PDFDocument["getPages"]>[number], item: unknown) {
  if (item instanceof PDFStream) return item;
  const lookedUp = page.doc.context.lookup(item as never);
  return lookedUp instanceof PDFStream ? lookedUp : null;
}

function pageContentString(page: ReturnType<PDFDocument["getPages"]>[number]) {
  page.node.normalize();
  const contents = page.node.Contents();
  if (!contents) return "";
  if (contents instanceof PDFArray) {
    return contents
      .asArray()
      .map((item) => {
        const stream = asStream(page, item);
        return stream ? streamToText(stream) : "";
      })
      .join("\n");
  }
  if (contents instanceof PDFStream) return streamToText(contents);
  const lookedUp = asStream(page, contents);
  return lookedUp ? streamToText(lookedUp) : "";
}

export const pdfProcessor: Processor = {
  kind: "pdf",
  canHandle(file) {
    return file.mediaKind === "pdf";
  },
  async analyze(file: ClassifiedFile): Promise<AnalyzeResult> {
    const pdf = await loadPdf(file.bytes);
    const pages = pdf.getPages();
    const regions: DetectedRegion[] = [];
    const allText: string[] = [];

    pages.forEach((page, pageIndex) => {
      const content = `${pageContentString(page)}\n${pageIndex === 0 ? allDecodedStreams(pdf) : ""}`;
      const items = extractShownText(content);
      allText.push(items.map((item) => item.text).join("\n"));
      const counts = new Map<string, number>();
      for (const item of items) counts.set(item.text, (counts.get(item.text) ?? 0) + 1);
      for (const item of items) {
        const watermarky = proposeTextCleanup(item.text).removals.length > 0 || item.diagonal || item.translucent;
        const repeated = (counts.get(item.text) ?? 0) > 1;
        if (!watermarky && !repeated) continue;
        const confidence = Math.min(
          0.93,
          0.42 + (item.diagonal ? 0.22 : 0) + (item.translucent ? 0.18 : 0) + (repeated ? 0.12 : 0),
        );
        regions.push({
          id: createId("pdf"),
          kind: item.diagonal ? "diagonal" : item.translucent ? "translucent" : "text",
          confidence,
          bbox: { x: 0.15, y: 0.35, width: 0.7, height: 0.2 },
          pageIndex,
          label: item.text.slice(0, 80),
          action: confidence >= 0.5 ? "remove" : "keep",
          text: item.text,
          strategy: item.diagonal ? "pdf-rotation" : "pdf-text-overlay",
        });
      }
    });

    const textProposal = proposeTextCleanup(allText.join("\n"));
    for (const removal of textProposal.removals) {
      if (regions.some((region) => region.text === removal.text)) continue;
      regions.push({
        id: createId("pdf"),
        kind: "text",
        confidence: 0.7,
        bbox: { x: 0.1, y: 0.08, width: 0.8, height: 0.08 },
        label: removal.text.slice(0, 80),
        action: "remove",
        text: removal.text,
        strategy: "repeated-text",
      });
    }

    const unique = dedupeRegions(regions);
    return {
      jobId: file.id,
      mediaKind: "pdf",
      mimeType: "application/pdf",
      pageCount: pages.length,
      width: pages[0]?.getWidth(),
      height: pages[0]?.getHeight(),
      regions: unique,
      warnings: unique.length
        ? []
        : [
            {
              code: "no_watermark",
              message:
                "No overlay-like PDF text was found. If the mark is baked into a page image, paint it in the editor.",
            },
          ],
    };
  },
  async process(file, plan, analysis): Promise<ProcessResult> {
    const pdf = await loadPdf(file.bytes);
    const selected = new Set(
      analysis.regions
        .filter((region) => plan.regionIds.includes(region.id) && region.text)
        .map((region) => region.text as string),
    );
    if (!selected.size) {
      throw new AppError("no_watermark", "Select at least one overlay to remove from this PDF.");
    }

    for (const page of pdf.getPages()) {
      page.node.normalize();
      const original = pageContentString(page);
      let next = original;
      for (const text of selected) {
        next = stripPdfText(next, text);
      }
      if (next !== original) {
        page.node.set(PDFName.of("Contents"), pdf.context.flateStream(latin1Encode(next)));
      }
    }

    const output = await PDFDocument.create();
    const copied = await output.copyPages(pdf, pdf.getPageIndices());
    copied.forEach((page) => output.addPage(page));
    const bytes = await output.save({ useObjectStreams: false });
    return {
      jobId: plan.jobId || file.id,
      mediaKind: "pdf",
      mimeType: "application/pdf",
      filename: `cleaned-${createId("pdf")}.pdf`,
      bytes: bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes),
      residualDetected: false,
      warnings: [],
    };
  },
};

export async function createSamplePdf(pages = 2, watermark = "CONFIDENTIAL") {
  const pdf = await PDFDocument.create();
  for (let i = 0; i < pages; i += 1) {
    const page = pdf.addPage([612, 792]);
    page.drawText(`Page ${i + 1} body text that should remain.`, { x: 72, y: 720, size: 14 });
    page.drawText(watermark, { x: 180, y: 400, size: 28, opacity: 0.35 });
  }
  return pdf.save();
}

function dedupeRegions(regions: DetectedRegion[]) {
  const seen = new Set<string>();
  const out: DetectedRegion[] = [];
  for (const region of regions) {
    const key = `${region.pageIndex ?? "*"}:${region.text ?? region.label}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(region);
  }
  return out;
}
