"use client";

import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";

export function ModelSelector({
  model,
  onChange,
  status,
}: {
  model: string;
  onChange: (m: string) => void;
  status: string;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Model</p>

      <Select value={model} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>

        <SelectContent>
          <SelectItem value="Llama-3.2-1B-Instruct">Llama-3.2-1B</SelectItem>
          <SelectItem value="Phi-3-mini-instruct">Phi-3 Mini</SelectItem>
        </SelectContent>
      </Select>

      <div className="text-xs text-muted-foreground">Status: {status}</div>
    </div>
  );
}
