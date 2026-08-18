export function TextDiff({ original, proposed }: { original: string; proposed: string }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <pre className="max-h-80 overflow-auto rounded-2xl border border-stone-200 bg-white p-4 text-xs leading-6 text-stone-700">
        {original}
      </pre>
      <pre className="max-h-80 overflow-auto rounded-2xl border border-teal-200 bg-teal-50 p-4 text-xs leading-6 text-stone-700">
        {proposed}
      </pre>
    </div>
  );
}
