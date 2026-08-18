"use client";

import { useState } from "react";

export function BeforeAfterSlider({
  beforeUrl,
  afterUrl,
  alt = "Comparison",
}: {
  beforeUrl: string;
  afterUrl: string;
  alt?: string;
}) {
  const [value, setValue] = useState(50);

  return (
    <div
      className="relative overflow-hidden rounded-3xl border border-stone-200 bg-stone-100"
      onPointerMove={(event) => {
        if (event.buttons !== 1) return;
        const rect = event.currentTarget.getBoundingClientRect();
        setValue(Math.min(100, Math.max(0, ((event.clientX - rect.left) / rect.width) * 100)));
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={afterUrl} alt={`${alt} after`} className="block w-full" />
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ clipPath: `inset(0 ${100 - value}% 0 0)` }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={beforeUrl} alt={`${alt} before`} className="block h-full w-full object-cover" />
      </div>
      <div className="absolute inset-y-0 w-1 bg-white shadow" style={{ left: `${value}%` }} />
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(event) => setValue(Number(event.target.value))}
        className="absolute inset-0 cursor-ew-resize opacity-0"
        aria-label="Comparison slider"
      />
      <div className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-black/60 px-3 py-1 text-xs text-white">
        Before
      </div>
      <div className="pointer-events-none absolute right-3 bottom-3 rounded-full bg-black/60 px-3 py-1 text-xs text-white">
        After
      </div>
    </div>
  );
}
