"use client";

import { useCallback, useState } from "react";
import { ClipboardPaste, FileUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function Dropzone({
  disabled,
  onFile,
  onText,
}: {
  disabled?: boolean;
  onFile: (file: File) => void;
  onText: (text: string) => void;
}) {
  const [active, setActive] = useState(false);
  const [mode, setMode] = useState<"upload" | "paste">("upload");
  const [text, setText] = useState("");

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const file = files?.[0];
      if (file) onFile(file);
    },
    [onFile],
  );

  return (
    <section className="rounded-3xl border border-stone-200 bg-white/80 p-3 shadow-sm">
      <div className="mx-auto mb-3 grid max-w-md grid-cols-2 rounded-full bg-stone-100 p-1" role="tablist" aria-label="Choose input method">
        <button
          type="button"
          role="tab"
          aria-selected={mode === "upload"}
          className={cn(
            "flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition",
            mode === "upload" ? "bg-white text-teal-800 shadow-sm" : "text-stone-600 hover:text-stone-900",
          )}
          onClick={() => setMode("upload")}
        >
          <FileUp className="h-4 w-4" /> Upload file
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "paste"}
          className={cn(
            "flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition",
            mode === "paste" ? "bg-white text-teal-800 shadow-sm" : "text-stone-600 hover:text-stone-900",
          )}
          onClick={() => setMode("paste")}
        >
          <ClipboardPaste className="h-4 w-4" /> Paste text
        </button>
      </div>

      {mode === "upload" ? (
        <label
          role="tabpanel"
          className={cn(
            "flex min-h-64 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-stone-300 px-6 py-12 text-center transition",
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
      ) : (
        <form
          role="tabpanel"
          className={cn("rounded-2xl border border-stone-200 p-5", disabled && "opacity-60")}
          onSubmit={(event) => {
            event.preventDefault();
            if (text.trim()) onText(text);
          }}
        >
          <label htmlFor="pasted-text" className="text-sm font-medium text-stone-900">
            Paste the text from your document
          </label>
          <p className="mt-1 text-sm text-stone-500">You will be able to review detected text before downloading the cleaned document.</p>
          <textarea
            id="pasted-text"
            value={text}
            disabled={disabled}
            rows={9}
            placeholder="Paste or type your text here..."
            className="mt-4 w-full resize-y rounded-2xl border border-stone-300 bg-white p-4 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-teal-700 focus:ring-2 focus:ring-teal-700/20 disabled:cursor-not-allowed"
            onChange={(event) => setText(event.target.value)}
          />
          <div className="mt-3 flex items-center justify-between gap-4">
            <span className="text-xs text-stone-500">{text.length.toLocaleString()} characters</span>
            <Button type="submit" disabled={disabled || !text.trim()}>
              Review pasted text
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}

