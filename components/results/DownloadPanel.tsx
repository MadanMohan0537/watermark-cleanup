"use client";

import { Button } from "@/components/ui/button";
import { toArrayBuffer } from "@/lib/utils";

export function DownloadPanel({
  filename,
  mimeType,
  bytes,
  onReset,
}: {
  filename: string;
  mimeType: string;
  bytes: Uint8Array;
  onReset: () => void;
}) {
  function download() {
    const blob = new Blob([toArrayBuffer(bytes)], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col items-start justify-between gap-4 rounded-3xl border border-stone-200 bg-white p-5 sm:flex-row sm:items-center">
      <div>
        <p className="font-medium text-stone-900">Ready to download</p>
        <p className="text-sm text-stone-500">{filename}</p>
      </div>
      <div className="flex gap-2">
        <Button type="button" onClick={download}>
          Download clean file
        </Button>
        <Button type="button" variant="outline" onClick={onReset}>
          Start over
        </Button>
      </div>
    </div>
  );
}
