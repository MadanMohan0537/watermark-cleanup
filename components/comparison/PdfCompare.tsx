"use client";

import { Button } from "@/components/ui/button";

export function PdfCompare({
  pageCount,
  page,
  onPage,
  beforeLabel = "Original page",
  afterLabel = "Cleaned page",
}: {
  pageCount: number;
  page: number;
  onPage: (page: number) => void;
  beforeLabel?: string;
  afterLabel?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm">
      <span className="text-stone-600">
        {beforeLabel} → {afterLabel}
      </span>
      <div className="flex items-center gap-2">
        <Button type="button" size="sm" variant="outline" disabled={page <= 0} onClick={() => onPage(page - 1)}>
          Previous
        </Button>
        <span>
          Page {page + 1} of {pageCount}
        </span>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={page >= pageCount - 1}
          onClick={() => onPage(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
