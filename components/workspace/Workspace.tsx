"use client";

import { useCallback, useMemo, useState } from "react";
import {
  ArrowRight,
  FileImage,
  FileText,
  ImageIcon,
  LockKeyhole,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Type,
} from "lucide-react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { CapabilityStrip } from "@/components/workspace/CapabilityStrip";
import { HowItWorks } from "@/components/workspace/HowItWorks";
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
import { buildCleanupReport } from "@/lib/client/cleanup-report";
import type { AnalyzeResult, ClassifiedFile, DetectedRegion, ProcessResult } from "@/lib/types";
import type { RgbaImage } from "@/lib/image-processing/buffer";
import { AppError, isAppError } from "@/lib/errors";

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
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
      {step === "idle" ? (
        <>
          <SiteHeader />

          <section className="hero-shell rounded-[2rem] p-6 text-white sm:p-9 lg:p-10">
            <div className="hero-glow right-0 top-0" />
            <div className="relative grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
              <div className="max-w-2xl">
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-200/20 bg-emerald-100/10 px-3 py-1.5 text-xs font-medium text-emerald-100">
                  <Sparkles className="h-3.5 w-3.5" />
                  Local-first cleanup workspace
                </div>
                <h1 className="text-4xl font-semibold leading-[1.02] tracking-[-0.03em] text-white sm:text-5xl lg:text-6xl">
                  Clean visual clutter without giving up control.
                </h1>
                <p className="mt-5 max-w-xl text-base leading-7 text-emerald-50/75 sm:text-lg">
                  Inspect overlay candidates, refine the exact region yourself, undo edits when needed, compare the result, and export a clean copy with an optional cleanup report.
                </p>
                <div className="mt-7 flex flex-wrap gap-3">
                  <Button
                    type="button"
                    size="lg"
                    className="bg-emerald-300 text-emerald-950 hover:bg-emerald-200"
                    onClick={() => void loadAuthorizedSample("image")}
                  >
                    Try sample image <ArrowRight className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    size="lg"
                    variant="outline"
                    className="border-white/20 bg-white/5 text-white hover:bg-white/10"
                    onClick={() => void loadAuthorizedSample("pdf")}
                  >
                    Try sample PDF
                  </Button>
                </div>
                <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-xs text-emerald-50/60">
                  <span className="inline-flex items-center gap-1.5"><LockKeyhole className="h-3.5 w-3.5" /> Local processing when possible</span>
                  <span className="inline-flex items-center gap-1.5"><ScanLine className="h-3.5 w-3.5" /> Review-first detection</span>
                  <span className="inline-flex items-center gap-1.5"><FileImage className="h-3.5 w-3.5" /> Images, PDFs, text</span>
                </div>
              </div>

              <div className="demo-window rounded-[1.75rem] p-5 sm:p-6">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div className="flex gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-white/25" />
                    <span className="h-2.5 w-2.5 rounded-full bg-white/25" />
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-300/70" />
                  </div>
                  <span className="rounded-full bg-emerald-300/10 px-2.5 py-1 text-[11px] font-medium text-emerald-100">Local preview</span>
                </div>
                <div className="mt-5 rounded-2xl border border-white/10 bg-black/15 p-4">
                  <div className="aspect-[4/3] rounded-xl bg-gradient-to-br from-stone-100/20 via-white/10 to-emerald-200/10 p-4">
                    <div className="relative h-full overflow-hidden rounded-lg border border-white/10 bg-[#d6ddd8]/10">
                      <div className="absolute inset-x-[12%] top-[18%] h-[48%] rounded-xl border border-emerald-200/35 bg-emerald-200/5" />
                      <div className="absolute bottom-4 left-4 rounded-lg border border-white/15 bg-black/20 px-3 py-2 text-xs text-white/70">Candidate region · 86%</div>
                    </div>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl bg-white/7 px-2 py-3"><p className="text-[10px] uppercase tracking-wider text-white/40">Detect</p><p className="mt-1 text-xs font-semibold text-white/80">Overlay</p></div>
                  <div className="rounded-xl bg-white/7 px-2 py-3"><p className="text-[10px] uppercase tracking-wider text-white/40">Review</p><p className="mt-1 text-xs font-semibold text-white/80">Human</p></div>
                  <div className="rounded-xl bg-white/7 px-2 py-3"><p className="text-[10px] uppercase tracking-wider text-white/40">Export</p><p className="mt-1 text-xs font-semibold text-white/80">Clean + report</p></div>
                </div>
              </div>
            </div>
          </section>

          <CapabilityStrip />
          <HowItWorks />

          <section className="stage-card rounded-[2rem] p-5 sm:p-7" id="workspace">
            <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Start here</p>
                <h2 className="mt-1 text-2xl font-semibold text-stone-900">Open the cleanup workspace</h2>
              </div>
              <p className="max-w-md text-sm leading-6 text-stone-500">Confirm permission, then upload your file or paste text. Or use a project-owned sample for a fast demo.</p>
            </div>
            <div className="grid gap-5 lg:grid-cols-[0.38fr_0.62fr]">
              <AuthorizationGate checked={authorized} onCheckedChange={setAuthorized} />
              <Dropzone disabled={!authorized} onFile={onFile} onText={onText} />
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 pt-4">
              <p className="text-xs text-stone-400">Supported: PNG · JPG · WEBP · PDF · TXT · Markdown</p>
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="ghost" onClick={() => void loadAuthorizedSample("image")}><ImageIcon className="h-3.5 w-3.5" /> Sample image</Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => void loadAuthorizedSample("pdf")}><FileText className="h-3.5 w-3.5" /> Sample PDF</Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => void loadAuthorizedSample("text")}><Type className="h-3.5 w-3.5" /> Sample text</Button>
              </div>
            </div>
          </section>
        </>
      ) : null}

      {step === "analyzing" || step === "processing" ? (
        <section className="stage-card mx-auto w-full max-w-3xl rounded-[2rem] p-8 text-center sm:p-12">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800">
            {step === "analyzing" ? <ScanLine className="h-6 w-6" /> : <Sparkles className="h-6 w-6" />}
          </span>
          <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">{step === "analyzing" ? "Stage 1 of 3" : "Stage 3 of 3"}</p>
          <h2 className="mt-2 text-2xl font-semibold text-stone-900">{step === "analyzing" ? "Inspecting your file" : "Building the cleaned copy"}</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-stone-500">{step === "analyzing" ? "Classifying the file and looking for overlay-like regions. Nothing is removed automatically." : "Applying only the regions you approved and preserving the original file."}</p>
          <Progress className="mx-auto mt-7 max-w-md" value={step === "analyzing" ? 38 : 82} />
        </section>
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
              <div className="stage-card rounded-3xl p-6 text-sm text-stone-600">Review detected overlays below. For scanned PDF pages, export the page as an image and use the image editor.</div>
            )}
            {analysis.pageCount && analysis.pageCount > 1 ? <PdfCompare pageCount={analysis.pageCount} page={pdfPage} onPage={setPdfPage} /> : null}
          </div>
          <aside className="space-y-4">
            <div className="stage-card rounded-3xl p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Stage 2 of 3</p>
              <h2 className="mb-4 mt-1 text-xl font-semibold text-stone-900">Review detected overlays</h2>
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
            {analysis.warnings.map((warning) => <p key={warning.code} className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">{warning.message}</p>)}
            <Button type="button" className="w-full" size="lg" onClick={clean}>Clean selected <ArrowRight className="h-4 w-4" /></Button>
            <Button type="button" variant="ghost" className="w-full" onClick={reset}>Cancel</Button>
          </aside>
        </section>
      ) : null}

      {step === "done" && result && originalUrl && resultUrl ? (
        <section className="space-y-6">
          <div className="stage-card rounded-3xl p-5 sm:p-6">
            <div className="mb-5 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Complete</p>
                <h2 className="mt-1 text-2xl font-semibold text-stone-900">Compare before exporting</h2>
              </div>
              <p className="text-sm text-stone-500">Your original file was not overwritten.</p>
            </div>
            {result.mediaKind === "image" ? (
              <BeforeAfterSlider beforeUrl={originalUrl} afterUrl={resultUrl} />
            ) : result.mediaKind === "text" && originalText ? (
              <TextDiff original={originalText} proposed={new TextDecoder().decode(result.bytes)} />
            ) : (
              <PdfCompare pageCount={analysis?.pageCount ?? 1} page={pdfPage} onPage={setPdfPage} beforeLabel="Original" afterLabel="Cleaned" />
            )}
          </div>
          {result.warnings.map((warning) => <p key={warning.code} className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">{warning.message}</p>)}
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

      <footer className="flex flex-col gap-3 rounded-2xl border border-white/60 bg-white/65 px-4 py-3 text-sm text-stone-600 shadow-sm backdrop-blur sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-800" />
          <span>Your files are processed temporarily and automatically deleted. They are not used for model training.</span>
        </div>
        <a href={GITHUB_URL} className="shrink-0 font-medium text-emerald-800 underline-offset-4 hover:underline">Source on GitHub</a>
      </footer>
    </div>
  );
}
