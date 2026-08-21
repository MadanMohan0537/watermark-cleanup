import { ExternalLink, Github, ShieldCheck } from "lucide-react";

const GITHUB_URL = "https://github.com/MadanMohan0537/watermark-cleanup";
const LIVE_URL = "https://watermark-cleanup.madanmohanlearning.workers.dev/";

export function SiteHeader() {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-900 text-emerald-100 shadow-sm">
          <ShieldCheck className="h-5 w-5" />
        </span>
        <div>
          <p className="text-sm font-semibold tracking-tight text-stone-900">Watermark Cleanup</p>
          <p className="text-xs text-stone-500">Privacy-first media cleanup</p>
        </div>
      </div>
      <nav className="flex flex-wrap items-center gap-2 text-sm">
        <a
          href={LIVE_URL}
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-stone-600 transition hover:bg-white hover:text-stone-900"
        >
          Live deployment <ExternalLink className="h-3.5 w-3.5" />
        </a>
        <a
          href={GITHUB_URL}
          className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-4 py-2 font-medium text-stone-800 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <Github className="h-4 w-4" />
          GitHub
        </a>
      </nav>
    </header>
  );
}
