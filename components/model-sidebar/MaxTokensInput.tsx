"use client";

import { Input } from "@/components/ui/input";

export function MaxTokensInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Max Tokens</p>
      <Input
        type="number"
        value={String(value ?? 512)}
        min={1}
        onChange={(e) => onChange(Number(e.target.value || 0))}
      />
    </div>
  );
}
