"use client";

import { Input } from "@/components/ui/input";

export function MaxTokensInput() {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Max Tokens</p>
      <Input type="number" defaultValue={2048} min={1} />
    </div>
  );
}
