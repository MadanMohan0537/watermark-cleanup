"use client";

import { useMemo } from "react";
import type { DetectedRegion } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatPercent } from "@/lib/utils";

export function RegionList({
  regions,
  onChange,
  onRemoveAll,
}: {
  regions: DetectedRegion[];
  onChange: (regions: DetectedRegion[]) => void;
  onRemoveAll: () => void;
}) {
  const removeCount = useMemo(
    () => regions.filter((region) => region.action === "remove").length,
    [regions],
  );

  if (!regions.length) {
    return (
      <div className="rounded-2xl border border-stone-200 bg-white p-4 text-sm text-stone-600">
        Nothing obvious was flagged. Paint or box the overlay, then clean.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-stone-600">{regions.length} possible overlay{regions.length === 1 ? "" : "s"}</p>
        <Button type="button" size="sm" variant="outline" onClick={onRemoveAll}>
          Remove all detected
        </Button>
      </div>
      <ul className="space-y-2">
        {regions.map((region) => (
          <li key={region.id} className="rounded-2xl border border-stone-200 bg-white p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium text-stone-900">{region.label}</p>
                <p className="mt-1 text-xs text-stone-500">
                  {region.kind}
                  {region.pageIndex != null ? ` · page ${region.pageIndex + 1}` : ""} · {formatPercent(region.confidence)} confidence
                </p>
              </div>
              <Badge className={region.confidence < 0.5 ? "bg-amber-100 text-amber-800" : "bg-teal-50 text-teal-800"}>
                {region.confidence < 0.5 ? "Review" : "Likely overlay"}
              </Badge>
            </div>
            <div className="mt-3 flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={region.action === "keep" ? "secondary" : "outline"}
                onClick={() =>
                  onChange(regions.map((item) => (item.id === region.id ? { ...item, action: "keep" } : item)))
                }
              >
                Keep
              </Button>
              <Button
                type="button"
                size="sm"
                variant={region.action === "remove" ? "default" : "outline"}
                onClick={() =>
                  onChange(regions.map((item) => (item.id === region.id ? { ...item, action: "remove" } : item)))
                }
              >
                Remove
              </Button>
            </div>
            {region.action === "remove" ? null : removeCount === 0 ? null : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
