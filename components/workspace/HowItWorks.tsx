import { CheckCircle2, FileUp, ScanSearch, WandSparkles } from "lucide-react";

const steps = [
  {
    icon: CheckCircle2,
    title: "Confirm permission",
    body: "Only work on content you own or are authorized to modify.",
  },
  {
    icon: FileUp,
    title: "Bring your file",
    body: "Upload an image or PDF, or paste text directly into the workspace.",
  },
  {
    icon: ScanSearch,
    title: "Review detections",
    body: "Inspect suggestions, keep valid content, and refine masks with undo/redo.",
  },
  {
    icon: WandSparkles,
    title: "Compare and export",
    body: "Preview the result, download the clean copy, and optionally export a cleanup report.",
  },
];

export function HowItWorks() {
  return (
    <section className="stage-card rounded-[1.75rem] p-5 sm:p-6">
      <div className="mb-5 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Workflow</p>
          <h2 className="mt-1 text-xl font-semibold text-stone-900">A review-first cleanup pipeline</h2>
        </div>
        <p className="max-w-md text-sm leading-6 text-stone-500">Nothing is silently removed. You stay in control of every detected region.</p>
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <article key={step.title} className="relative rounded-2xl border border-stone-100 bg-stone-50/70 p-4">
              <div className="mb-4 flex items-center justify-between">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="text-xs font-semibold text-stone-300">0{index + 1}</span>
              </div>
              <h3 className="text-sm font-semibold text-stone-900">{step.title}</h3>
              <p className="mt-2 text-sm leading-6 text-stone-500">{step.body}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
