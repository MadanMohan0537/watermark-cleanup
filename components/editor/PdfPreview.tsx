"use client";

import { useEffect, useRef, useState } from "react";
import { toArrayBuffer } from "@/lib/utils";

export function PdfPreview({ bytes, pageIndex }: { bytes: Uint8Array; pageIndex: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let doc: { destroy(): Promise<void> } | null = null;
    async function render() {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
        const loaded = await pdfjs.getDocument({ data: toArrayBuffer(bytes) }).promise;
        doc = loaded;
        if (cancelled) {
          await loaded.destroy();
          return;
        }
        const page = await loaded.getPage(Math.min(loaded.numPages, pageIndex + 1));
        const viewport = page.getViewport({ scale: 1.15 });
        const canvas = canvasRef.current;
        if (!canvas || cancelled) return;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        await page.render({ canvas, canvasContext: ctx, viewport }).promise;
      } catch {
        if (!cancelled) setError("PDF preview is unavailable. You can still review detected overlays and export.");
      }
    }
    void render();
    return () => {
      cancelled = true;
      void doc?.destroy();
    };
  }, [bytes, pageIndex]);

  if (error) {
    return <p className="rounded-2xl border border-stone-200 bg-white p-4 text-sm text-stone-600">{error}</p>;
  }
  return <canvas ref={canvasRef} className="w-full rounded-3xl border border-stone-200 bg-white" />;
}
