"use client";

import { useEffect, useState } from "react";
import { Cpu, LockKeyhole, Sparkles } from "lucide-react";

type Capability = {
  label: string;
  value: string;
  detail: string;
};

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
      <div className="feature-chip">
        <LockKeyhole className="h-4 w-4" />
        <div>
          <p className="feature-chip-label">Privacy</p>
          <p className="feature-chip-value">Local first</p>
        </div>
      </div>
      <div className="feature-chip" title={capability.detail}>
        <Cpu className="h-4 w-4" />
        <div>
          <p className="feature-chip-label">{capability.label}</p>
          <p className="feature-chip-value">{capability.value}</p>
        </div>
      </div>
      <div className="feature-chip">
        <Sparkles className="h-4 w-4" />
        <div>
          <p className="feature-chip-label">Review model</p>
          <p className="feature-chip-value">Human controlled</p>
        </div>
      </div>
    </div>
  );
}
