"use client";

import { useEffect, useRef } from "react";
import type { DetectedRegion } from "@/lib/types";
import { Button } from "@/components/ui/button";

type Tool = "rect" | "brush" | "erase";

export function MaskEditor({
  imageUrl,
  width,
  height,
  regions,
  mask,
  tool,
  onToolChange,
  onMaskChange,
  onBeginEdit,
  onExpand,
  onShrink,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}: {
  imageUrl: string;
  width: number;
  height: number;
  regions: DetectedRegion[];
  mask: Uint8Array;
  tool: Tool;
  onToolChange: (tool: Tool) => void;
  onMaskChange: (mask: Uint8Array) => void;
  onBeginEdit: () => void;
  onExpand: () => void;
  onShrink: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const start = useRef<{ x: number; y: number } | null>(null);
  const strokeMask = useRef<Uint8Array | null>(null);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      if (event.key === "r" || event.key === "R") onToolChange("rect");
      if (event.key === "b" || event.key === "B") onToolChange("brush");
      if (event.key === "e" || event.key === "E") onToolChange("erase");
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        endStroke();
        if (event.shiftKey) onRedo();
        else onUndo();
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "y") {
        event.preventDefault();
        endStroke();
        onRedo();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onToolChange, onUndo, onRedo]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (cancelled || !canvasRef.current) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const overlay = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const scaleX = canvas.width / width;
      const scaleY = canvas.height / height;
      for (let y = 0; y < canvas.height; y += 1) {
        for (let x = 0; x < canvas.width; x += 1) {
          const mx = Math.min(width - 1, Math.floor(x / scaleX));
          const my = Math.min(height - 1, Math.floor(y / scaleY));
          if (!mask[my * width + mx]) continue;
          const i = (y * canvas.width + x) * 4;
          overlay.data[i] = 13;
          overlay.data[i + 1] = 148;
          overlay.data[i + 2] = 136;
          overlay.data[i + 3] = 110;
        }
      }
      ctx.putImageData(overlay, 0, 0);
      ctx.strokeStyle = "rgba(15,118,110,0.95)";
      ctx.lineWidth = 2;
      for (const region of regions) {
        ctx.strokeRect(
          region.bbox.x * canvas.width,
          region.bbox.y * canvas.height,
          region.bbox.width * canvas.width,
          region.bbox.height * canvas.height,
        );
      }
    };
    img.src = imageUrl;
    return () => {
      cancelled = true;
    };
  }, [imageUrl, mask, regions, width, height]);

  function pointFromEvent(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * width;
    const y = ((event.clientY - rect.top) / rect.height) * height;
    return { x: Math.floor(x), y: Math.floor(y) };
  }

  function paintCircle(next: Uint8Array, cx: number, cy: number, radius: number, value: number) {
    for (let y = cy - radius; y <= cy + radius; y += 1) {
      for (let x = cx - radius; x <= cx + radius; x += 1) {
        if (x < 0 || y < 0 || x >= width || y >= height) continue;
        if ((x - cx) * (x - cx) + (y - cy) * (y - cy) > radius * radius) continue;
        next[y * width + x] = value;
      }
    }
  }

  function emitStroke() {
    if (!strokeMask.current) return;
    onMaskChange(new Uint8Array(strokeMask.current));
  }

  function endStroke() {
    drawing.current = false;
    strokeMask.current = null;
    start.current = null;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {(["rect", "brush", "erase"] as Tool[]).map((item) => (
          <Button key={item} type="button" size="sm" variant={tool === item ? "secondary" : "outline"} onClick={() => onToolChange(item)}>
            {item === "rect" ? "Rectangle (R)" : item === "brush" ? "Brush (B)" : "Erase (E)"}
          </Button>
        ))}
        <Button type="button" size="sm" variant="outline" onClick={onExpand}>
          Expand
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onShrink}>
          Shrink
        </Button>
        <Button type="button" size="sm" variant="outline" disabled={!canUndo} onClick={() => { endStroke(); onUndo(); }}>
          Undo
        </Button>
        <Button type="button" size="sm" variant="outline" disabled={!canRedo} onClick={() => { endStroke(); onRedo(); }}>
          Redo
        </Button>
      </div>
      <canvas
        ref={canvasRef}
        width={Math.min(900, width)}
        height={Math.round((Math.min(900, width) / width) * height)}
        className="w-full cursor-crosshair rounded-2xl border border-stone-200 bg-stone-100"
        onPointerDown={(event) => {
          drawing.current = true;
          start.current = pointFromEvent(event);
          strokeMask.current = new Uint8Array(mask);
          onBeginEdit();
          (event.target as HTMLCanvasElement).setPointerCapture(event.pointerId);
          if (tool !== "rect") {
            paintCircle(strokeMask.current, start.current.x, start.current.y, 8, tool === "erase" ? 0 : 1);
            emitStroke();
          }
        }}
        onPointerMove={(event) => {
          if (!drawing.current || tool === "rect" || !strokeMask.current) return;
          const point = pointFromEvent(event);
          paintCircle(strokeMask.current, point.x, point.y, 8, tool === "erase" ? 0 : 1);
          emitStroke();
        }}
        onPointerUp={(event) => {
          if (!drawing.current) return;
          if (tool === "rect" && start.current && strokeMask.current) {
            const end = pointFromEvent(event);
            const x0 = Math.max(0, Math.min(start.current.x, end.x));
            const y0 = Math.max(0, Math.min(start.current.y, end.y));
            const x1 = Math.min(width - 1, Math.max(start.current.x, end.x));
            const y1 = Math.min(height - 1, Math.max(start.current.y, end.y));
            for (let y = y0; y <= y1; y += 1) {
              for (let x = x0; x <= x1; x += 1) strokeMask.current[y * width + x] = 1;
            }
            emitStroke();
          }
          endStroke();
        }}
        onPointerCancel={endStroke}
      />
    </div>
  );
}
