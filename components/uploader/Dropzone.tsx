"use client";

import { useCallback, useState } from "react";
import { FileUp } from "lucide-react";
import { cn } from "@/lib/utils";

export function Dropzone({
  disabled,
  onFile,
}: {
  disabled?: boolean;
  onFile: (file: File) => void;
}) {
  const [active, setActive] = useState(false);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const file = files?.[0];
      if (file) onFile(file);
    },
    [onFile],
  );

  return (
    <label
      className={cn(
        "flex min-h-64 cursor-pointer flex-col items-center justify-center rounded-3xl border border-dashed border-stone-300 bg-white/80 px-6 py-12 text-center shadow-sm transition",
        active && "border-teal-700 bg-teal-50",
        disabled && "pointer-events-none opacity-60",
      )}
      onDragOver={(event) => {
        event.preventDefault();
        setActive(true);
      }}
      onDragLeave={() => setActive(false)}
      onDrop={(event) => {
        event.preventDefault();
        setActive(false);
        handleFiles(event.dataTransfer.files);
      }}
    >
      <input
        type="file"
        className="sr-only"
        disabled={disabled}
        accept=".png,.jpg,.jpeg,.webp,.pdf,.txt,.md,image/png,image/jpeg,image/webp,application/pdf,text/plain,text/markdown"
        onChange={(event) => handleFiles(event.target.files)}
      />
      <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-stone-100 text-teal-800">
        <FileUp className="h-6 w-6" />
      </span>
      <span className="text-lg font-medium text-stone-900">Drop a file here, or browse</span>
      <span className="mt-2 max-w-md text-sm text-stone-500">
        PNG, JPG, WEBP, PDF, and text documents. Processing stays on this device whenever possible.
      </span>
    </label>
  );
}
