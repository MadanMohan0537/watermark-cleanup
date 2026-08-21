const steps = [
  {
    title: "Confirm permission",
    body: "Only use files you own or are allowed to edit. The original stays unchanged until you export.",
  },
  {
    title: "Upload or paste",
    body: "Drop an image, PDF, or document, or paste text. Classification uses file contents, not the extension.",
  },
  {
    title: "Review detections",
    body: "Keep or remove each overlay. For images you can paint, erase, expand, shrink, undo, or redo the mask.",
  },
  {
    title: "Export a clean copy",
    body: "Compare the result, then download. Partial reconstructions are reported instead of being hidden.",
  },
];

export function HowItWorks() {
  return (
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {steps.map((step, index) => (
        <article key={step.title} className="rounded-2xl border border-stone-200 bg-white/80 p-4">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-teal-800">Step {index + 1}</p>
          <h2 className="mt-2 text-base font-medium text-stone-900">{step.title}</h2>
          <p className="mt-2 text-sm leading-6 text-stone-600">{step.body}</p>
        </article>
      ))}
    </section>
  );
}
