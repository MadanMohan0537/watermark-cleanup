"use client";

import { useSyncExternalStore } from "react";
import { Cpu, LockKeyhole, Sparkles } from "lucide-react";

const subscribe = () => () => {};
const serverSnapshot = () => false;

function useBrowserCapability(check: () => boolean) {
  return useSyncExternalStore(subscribe, check, serverSnapshot);
}

export function CapabilityStrip() {
  const hasWebGpu = useBrowserCapability(() => typeof navigator !== "undefined" && "gpu" in navigator);
  const hasWasm = useBrowserCapability(() => typeof WebAssembly !== "undefined");

  const capability = hasWebGpu
    ? {
        label: "Device capability",
        value: "WebGPU ready",
        detail: "This browser exposes WebGPU for future accelerated local vision modules.",
      }
    : hasWasm
      ? {
          label: "Device capability",
          value: "WebAssembly ready",
          detail: "This browser supports local WebAssembly processing.",
        }
      : {
          label: "Local engine",
          value: "Browser",
          detail: "Processing stays on-device whenever the selected format supports it.",
        };

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
