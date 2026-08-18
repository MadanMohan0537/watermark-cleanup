"use client";

import { Checkbox } from "@/components/ui/checkbox";

export function AuthorizationGate({
  checked,
  onCheckedChange,
}: {
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-700">
      <Checkbox checked={checked} onCheckedChange={(value) => onCheckedChange(value === true)} className="mt-0.5" />
      <span>
        I own this content or have permission to modify it. Do not use this tool to strip ownership marks, licenses,
        signatures, or authenticity protections from other people&apos;s material.
      </span>
    </label>
  );
}
