import { Github } from "lucide-react";

const GITHUB_URL = "https://github.com/MadanMohan0537/watermark-cleanup";
const LIVE_URL = "https://watermark-cleanup.madanmohanlearning.workers.dev/";

export function SiteHeader() {
  return (
    <header className="flex items-center justify-between gap-4">
      <p className="text-sm font-medium uppercase tracking-[0.2em] text-teal-800">Watermark Cleanup</p>
      <nav className="flex items-center gap-2 text-sm">
        <a
          href={LIVE_URL}
          className="rounded-full px-3 py-1.5 text-stone-600 transition hover:bg-white hover:text-stone-900"
        >
          Live demo
        </a>
        <a
          href={GITHUB_URL}
          className="inline-flex items-center gap-2 rounded-full border border-stone-300 bg-white px-3 py-1.5 font-medium text-stone-800 transition hover:bg-stone-50"
        >
          <Github className="h-4 w-4" />
          GitHub
        </a>
      </nav>
    </header>
  );
}
