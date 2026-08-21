"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Cpu, LockKeyhole, Sparkles } from "lucide-react";

type Capability = {
  label: string;
  value: string;
  detail: string;
};

function Chip({
  icon,
  label,
  value,
  detail,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div
      className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-white/80 px-4 py-3"
      title={detail}
    >
      <span className="text-teal-800">{icon}</span>
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-teal-800">{label}</p>
        <p className="text-sm font-medium text-stone-900">{value}</p>
      </div>
    </div>
  );
}

export function CapabilityStrip() {
  const [capability, setCapability] = useState<Capability>({
    label: "Local engine",
    value: "Browser",
    detail: "Processing stays on-device whenever the selected format supports it.",
  });

  useEffect(() => {
    const hasWebGpu = "gpu" in navigator;
    const hasWasm = typeof WebAssembly !== "undefined";

    if (hasWebGpu) {
      setCapability({
        label: "Device capability",
        value: "WebGPU ready",
        detail: "This browser exposes WebGPU for future accelerated local vision modules.",
      });
      return;
    }

    if (hasWasm) {
      setCapability({
        label: "Device capability",
        value: "WebAssembly ready",
        detail: "This browser supports local WebAssembly processing.",
      });
    }
  }, []);

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <Chip icon={<LockKeyhole className="h-4 w-4" />} label="Privacy" value="Local first" />
      <Chip
        icon={<Cpu className="h-4 w-4" />}
        label={capability.label}
        value={capability.value}
        detail={capability.detail}
      />
      <Chip icon={<Sparkles className="h-4 w-4" />} label="Review model" value="Human controlled" />
    </div>
  );
}
