"use client";

import { useEffect, useState } from "react";
import { prebuiltAppConfig } from "@mlc-ai/web-llm";
import { CheckIcon, ChevronsUpDownIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export function ModelSelector({
  model,
  onChange,
  status,
}: {
  model: string;
  onChange: (m: string) => void;
  status: string;
}) {
  const [availableModels, setAvailableModels] = useState<
    { model_id: string; model_name: string }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const QUANT_RANKING = [
    "q4f16_1",
    "q4f32_1",
    "q4f16",
    "q4f32",
    "q3f16",
    "q8f16",
  ];

  function extractFamily(modelId: string) {
    // Llama-3.1-8B-Instruct-q4f16_1-MLC
    const parts = modelId.split("-");
    const quantIndex = parts.findIndex((p) => p.startsWith("q"));
    const base = parts.slice(0, quantIndex).join("-");

    const quant = parts[quantIndex];
    return { base, quant };
  }

  useEffect(() => {
    try {
      const allModels = prebuiltAppConfig.model_list.map((m) => ({
        model_id: m.model_id,
        model_name: m.model_id,
      }));

      const families = new Map();

      allModels.forEach((m) => {
        const { base, quant } = extractFamily(m.model_id);

        if (!families.has(base)) {
          families.set(base, m);
        } else {
          const currentModel = families.get(base);
          const currentQuant = extractFamily(currentModel.model_id).quant;

          // Compare quantization quality
          if (
            QUANT_RANKING.indexOf(quant) < QUANT_RANKING.indexOf(currentQuant)
          ) {
            families.set(base, m);
          }
        }
      });

      setAvailableModels(Array.from(families.values()));
    } catch (err) {
      console.error("Failed to load models:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Model</p>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between truncate"
          >
            <span className="truncate">
              {model
                ? availableModels.find((m) => m.model_id === model)
                    ?.model_name || model
                : "Select model..."}
            </span>
            <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" side="top">
          <Command>
            <CommandInput placeholder="Search models..." />
            <CommandList>
              {loading ? (
                <div className="px-2 py-1.5 text-xs text-muted-foreground">
                  Loading models…
                </div>
              ) : availableModels.length > 0 ? (
                <>
                  <CommandEmpty>No model found.</CommandEmpty>
                  <CommandGroup>
                    {availableModels.map((m) => (
                      <CommandItem
                        key={m.model_id}
                        value={m.model_id}
                        onSelect={(currentValue) => {
                          onChange(currentValue === model ? "" : currentValue);
                          setOpen(false);
                        }}
                      >
                        <CheckIcon
                          className={cn(
                            "mr-2 h-4 w-4",
                            model === m.model_id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <span className="truncate">{m.model_name}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              ) : (
                <CommandEmpty>No models available</CommandEmpty>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <div className="text-xs text-muted-foreground">Status: {status}</div>
    </div>
  );
}
