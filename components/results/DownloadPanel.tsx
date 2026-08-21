"use client";

import { Button } from "@/components/ui/button";
import { toArrayBuffer } from "@/lib/utils";
import type { CleanupReport } from "@/lib/client/cleanup-report";

export function DownloadPanel({
  filename,
  mimeType,
  bytes,
  report,
  onReset,
}: {
  filename: string;
  mimeType: string;
  bytes: Uint8Array;
  report?: CleanupReport;
  onReset: () => void;
}) {
  function downloadFile(blob: Blob, name: string) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = name;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function download() {
    downloadFile(new Blob([toArrayBuffer(bytes)], { type: mimeType }), filename);
  }

  function downloadReport() {
    if (!report) return;
    downloadFile(
      new Blob([JSON.stringify(report, null, 2)], { type: "application/json" }),
      "cleanup-report.json",
    );
  }

  return (
    <div className="flex flex-col items-start justify-between gap-4 rounded-3xl border border-stone-200 bg-white p-5 sm:flex-row sm:items-center">
      <div>
        <p className="font-medium text-stone-900">Ready to download</p>
        <p className="text-sm text-stone-500">{filename}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={download}>
          Download clean file
        </Button>
        {report ? (
          <Button type="button" variant="outline" onClick={downloadReport}>
            Download report
          </Button>
        ) : null}
        <Button type="button" variant="outline" onClick={onReset}>
          Start over
        </Button>
      </div>
    </div>
  );
}
