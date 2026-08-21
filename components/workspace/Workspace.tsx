"use client";

import { useCallback, useMemo, useState } from "react";
import { FileText, ImageIcon, ShieldCheck, Type } from "lucide-react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { HowItWorks } from "@/components/workspace/HowItWorks";
import { CapabilityStrip } from "@/components/workspace/CapabilityStrip";
import { AuthorizationGate } from "@/components/uploader/AuthorizationGate";
import { Dropzone } from "@/components/uploader/Dropzone";
import { RegionList } from "@/components/editor/RegionList";
import { MaskEditor } from "@/components/editor/MaskEditor";
import { PdfPreview } from "@/components/editor/PdfPreview";
import { BeforeAfterSlider } from "@/components/comparison/BeforeAfterSlider";
import { PdfCompare } from "@/components/comparison/PdfCompare";
import { TextDiff } from "@/components/comparison/TextDiff";
import { DownloadPanel } from "@/components/results/DownloadPanel";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { applyTextRemovals } from "@/lib/text-processing";
import {
  adjustMask,
  analyzeLocal,
  bytesToObjectUrl,
  decodePreviewImage,
  fileToClassified,
  maskFromRegions,
  processLocal,
} from "@/lib/client/local-pipeline";
import type { AnalyzeResult, ClassifiedFile, DetectedRegion, ProcessResult } from "@/lib/types";
import type { RgbaImage } from "@/lib/image-processing/buffer";
import { AppError, isAppError } from "@/lib/errors";
import { buildCleanupReport } from "@/lib/client/cleanup-report";

const GITHUB_URL = "https://github.com/MadanMohan0537/watermark-cleanup";

type Step = "idle" | "analyzing" | "review" | "processing" | "done";

export function Workspace() {
  const [authorized, setAuthorized] = useState(false);
  const [step, setStep] = useState<Step>("idle");
  const [error, setError] = useState<string | null>(null);
  const [classified, setClassified] = useState<ClassifiedFile | null>(null);
  const [analysis, setAnalysis] = useState<AnalyzeResult | null>(null);
  const [regions, setRegions] = useState<DetectedRegion[]>([]);
  const [image, setImage] = useState<RgbaImage | null>(null);
  const [mask, setMask] = useState<Uint8Array | null>(null);
  const [tool, setTool] = useState<"rect" | "brush" | "erase">("rect");
  const [result, setResult] = useState<ProcessResult | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [pdfPage, setPdfPage] = useState(0);
  const [reviewed, setReviewed] = useState(false);
  const [maskPast, setMaskPast] = useState<Uint8Array[]>([]);
  const [maskFuture, setMaskFuture] = useState<Uint8Array[]>([]);

  const originalText = analysis?.textPreview;
  const proposedText = useMemo(() => {
    if (!originalText) return analysis?.proposedText;
    const selected = regions.filter((region) => region.action === "remove" && region.text).map((region) => region.text!);
    return applyTextRemovals(originalText, selected);
  }, [analysis?.proposedText, originalText, regions]);

  async function ingestFile(file: File, permissionGranted = authorized) {
    setError(null);
    if (!permissionGranted) {
      setError("Confirm that you own this content or have permission to modify it.");
      return;
    }
    setStep("analyzing");
    try {
      const next = await fileToClassified(file);
      setClassified(next);
      setOriginalUrl(bytesToObjectUrl(next.bytes, next.mimeType));
      const decoded = await decodePreviewImage(next);
      setImage(decoded);
      const nextAnalysis = await analyzeLocal(next);
      setAnalysis(nextAnalysis);
      setRegions(nextAnalysis.regions);
      if (decoded) {
        setMask(maskFromRegions(decoded, nextAnalysis.regions));
        setMaskPast([]);
        setMaskFuture([]);
      }
      setReviewed(false);
      setStep("review");
    } catch (caught) {
      setStep("idle");
      setError(isAppError(caught) ? caught.message : "This file could not be read.");
    }
  }

  function onFile(file: File) {
    void ingestFile(file);
  }

  function onText(text: string) {
    void ingestFile(new File([text], "pasted-text.txt", { type: "text/plain" }));
  }

  async function loadAuthorizedSample(kind: "image" | "text" | "pdf") {
    setAuthorized(true);
    setError(null);
    try {
      if (kind === "image") {
        const response = await fetch("/samples/corner-overlay.png");
        if (!response.ok) throw new Error("sample missing");
        const blob = await response.blob();
        await ingestFile(new File([blob], "authorized-sample.png", { type: "image/png" }), true);
        return;
      }
      if (kind === "pdf") {
        const response = await fetch("/samples/sample.pdf");
        if (!response.ok) throw new Error("sample missing");
        const blob = await response.blob();
        await ingestFile(new File([blob], "authorized-sample.pdf", { type: "application/pdf" }), true);
        return;
      }
      const response = await fetch("/samples/sample.txt");
      if (!response.ok) throw new Error("sample missing");
      const text = await response.text();
      await ingestFile(new File([text], "authorized-sample.txt", { type: "text/plain" }), true);
    } catch {
      setError("The authorized sample could not be loaded.");
    }
  }

  function snapshotMask() {
    if (!mask) return;
    setMaskPast((history) => [...history.slice(-19), new Uint8Array(mask)]);
    setMaskFuture([]);
  }

  function commitMask(next: Uint8Array) {
    snapshotMask();
    setMask(next);
    setReviewed(true);
  }

  const undoMask = useCallback(() => {
    setMaskPast((history) => {
      if (!history.length || !mask) return history;
      const previous = history[history.length - 1];
      setMaskFuture((future) => [new Uint8Array(mask), ...future].slice(0, 20));
      setMask(previous);
      return history.slice(0, -1);
    });
  }, [mask]);

  const redoMask = useCallback(() => {
    setMaskFuture((future) => {
      if (!future.length || !mask) return future;
      const next = future[0];
      setMaskPast((history) => [...history, new Uint8Array(mask)].slice(-20));
      setMask(next);
      return future.slice(1);
    });
  }, [mask]);

  function removeAllDetected() {
    setReviewed(true);
    const next = regions.map((region) => ({ ...region, action: "remove" as const }));
    setRegions(next);
    if (image) commitMask(maskFromRegions(image, next));
  }

  async function clean() {
    if (!classified || !analysis) return;
    const selected = regions.filter((region) => region.action === "remove").map((region) => region.id);
    if (!selected.length && !mask?.some(Boolean)) {
      setError("Choose overlays to remove, or paint a region first.");
      return;
    }
    if (!reviewed && selected.length === regions.length && regions.length > 0) {
      setError("Review the detected overlays, then clean. You can keep any region that belongs in the file.");
      return;
    }
    setError(null);
    setStep("processing");
    try {
      const next = await processLocal(classified, { ...analysis, regions }, selected, mask ?? undefined);
      if (!next.bytes.byteLength) {
        throw new AppError("reconstruction_failure", "Cleaning did not produce a file.");
      }
      setResult(next);
      setResultUrl(bytesToObjectUrl(next.bytes, next.mimeType));
      setStep("done");
    } catch (caught) {
      setStep("review");
      setError(isAppError(caught) ? caught.message : "Cleaning failed. The original file was not changed.");
    }
  }

  function reset() {
    setStep("idle");
    setClassified(null);
    setAnalysis(null);
    setRegions([]);
    setImage(null);
    setMask(null);
    setResult(null);
    setError(null);
    setReviewed(false);
    setMaskPast([]);
    setMaskFuture([]);
    if (originalUrl) URL.revokeObjectURL(originalUrl);
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    setOriginalUrl(null);
    setResultUrl(null);
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
      {step === "idle" ? (
        <>
          <SiteHeader />
          <header className="space-y-4 text-center">
            <h1 className="text-4xl font-semibold tracking-tight text-stone-900 sm:text-5xl">
              Remove unwanted watermarks from your files
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-stone-600">
              Upload your own or authorized media, review detected overlays, and export a clean version.
              Processing stays on this device whenever possible.
            </p>
          </header>
          <HowItWorks />
          <CapabilityStrip />
          <AuthorizationGate checked={authorized} onCheckedChange={setAuthorized} />
          <Dropzone disabled={!authorized} onFile={onFile} onText={onText} />
          <div className="flex flex-col items-center gap-3">
            <p className="text-sm text-stone-500">Try an authorized sample created for this project</p>
            <div className="flex flex-wrap justify-center gap-2">
              <Button type="button" variant="outline" onClick={() => void loadAuthorizedSample("image")}>
                <ImageIcon className="h-4 w-4" />
                Sample image
              </Button>
              <Button type="button" variant="outline" onClick={() => void loadAuthorizedSample("pdf")}>
                <FileText className="h-4 w-4" />
                Sample PDF
              </Button>
              <Button type="button" variant="outline" onClick={() => void loadAuthorizedSample("text")}>
                <Type className="h-4 w-4" />
                Sample text
              </Button>
            </div>
          </div>
          <p className="text-center text-sm text-stone-500">Images · PDFs · Documents</p>
        </>
      ) : null}

      {step === "analyzing" || step === "processing" ? (
        <div className="rounded-3xl border border-stone-200 bg-white p-10 text-center">
          <p className="text-lg font-medium text-stone-900">
            {step === "analyzing" ? "Analyzing file..." : "Cleaning selected overlays..."}
          </p>
          <Progress className="mx-auto mt-6 max-w-sm" value={step === "analyzing" ? 35 : 70} />
        </div>
      ) : null}

      {step === "review" && analysis ? (
        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.8fr)]">
          <div className="space-y-4">
            {image && originalUrl && mask ? (
              <MaskEditor
                imageUrl={originalUrl}
                width={image.width}
                height={image.height}
                regions={regions}
                mask={mask}
                tool={tool}
                onToolChange={setTool}
                onBeginEdit={snapshotMask}
                onMaskChange={(next) => {
                  setMask(next);
                  setReviewed(true);
                }}
                onExpand={() => commitMask(adjustMask(mask, image.width, image.height, 1))}
                onShrink={() => commitMask(adjustMask(mask, image.width, image.height, -1))}
                onUndo={undoMask}
                onRedo={redoMask}
                canUndo={maskPast.length > 0}
                canRedo={maskFuture.length > 0}
              />
            ) : classified?.mediaKind === "pdf" ? (
              <PdfPreview bytes={classified.bytes} pageIndex={pdfPage} />
            ) : originalText ? (
              <TextDiff original={originalText} proposed={proposedText ?? originalText} />
            ) : (
              <div className="rounded-3xl border border-stone-200 bg-white p-6 text-sm text-stone-600">
                Review detected overlays below. For scanned PDF pages, export the page as an image and use the image
                editor.
              </div>
            )}
            {analysis.pageCount && analysis.pageCount > 1 ? (
              <PdfCompare pageCount={analysis.pageCount} page={pdfPage} onPage={setPdfPage} />
            ) : null}
          </div>
          <aside className="space-y-4">
            <div className="rounded-3xl border border-stone-200 bg-white p-4">
              <h2 className="mb-3 font-medium text-stone-900">Detected overlays</h2>
              <RegionList
                regions={regions}
                onChange={(next) => {
                  setRegions(next);
                  setReviewed(true);
                  if (image) commitMask(maskFromRegions(image, next));
                }}
                onRemoveAll={removeAllDetected}
              />
            </div>
            {analysis.warnings.map((warning) => (
              <p key={warning.code} className="text-sm text-amber-800">
                {warning.message}
              </p>
            ))}
            <Button type="button" className="w-full" size="lg" onClick={clean}>
              Clean selected
            </Button>
            <Button type="button" variant="ghost" className="w-full" onClick={reset}>
              Cancel
            </Button>
          </aside>
        </section>
      ) : null}

      {step === "done" && result && originalUrl && resultUrl ? (
        <section className="space-y-6">
          {result.mediaKind === "image" ? (
            <BeforeAfterSlider beforeUrl={originalUrl} afterUrl={resultUrl} />
          ) : result.mediaKind === "text" && originalText ? (
            <TextDiff original={originalText} proposed={new TextDecoder().decode(result.bytes)} />
          ) : (
            <PdfCompare
              pageCount={analysis?.pageCount ?? 1}
              page={pdfPage}
              onPage={setPdfPage}
              beforeLabel="Original"
              afterLabel="Cleaned"
            />
          )}
          {result.warnings.map((warning) => (
            <p key={warning.code} className="text-sm text-amber-800">
              {warning.message}
            </p>
          ))}
          <DownloadPanel
            filename={result.filename}
            mimeType={result.mimeType}
            bytes={result.bytes}
            report={classified && analysis ? buildCleanupReport(classified, analysis, result, regions) : undefined}
            onReset={reset}
          />
        </section>
      ) : null}

      {error ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p> : null}

      <footer className="flex flex-col gap-3 rounded-2xl bg-white/70 px-4 py-3 text-sm text-stone-600 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-teal-800" />
          <span>
            Your files are processed temporarily and automatically deleted. They are not used for model training.
          </span>
        </div>
        <a href={GITHUB_URL} className="shrink-0 text-teal-800 underline-offset-4 hover:underline">
          Source on GitHub
        </a>
      </footer>
    </div>
  );
}
