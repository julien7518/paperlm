"use client";

import { useEffect, useRef, useState } from "react";
import { Send, X, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function ChatInput({
  onSend,
  onInterrupt,
  isModelReady = true,
  isGenerating = false,
  replyTo,
  onClearReply,
}: {
  onSend: (msg: string) => void;
  onInterrupt?: () => void;
  isModelReady?: boolean;
  isGenerating?: boolean;
  replyTo?: string | null;
  onClearReply?: () => void;
}) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!replyTo) return;
    const quoted = replyTo
      .split("\n")
      .map((l) => `> ${l}`)
      .join("\n");
    const prefill = `${quoted}\n\n---\n\n`;
    setValue(prefill);
    // focus textarea after next tick
    setTimeout(() => textareaRef.current?.focus(), 50);
  }, [replyTo]);

  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      <div className="flex items-center gap-2">
        <div className="flex-1">
          {replyTo && (
            <div className="mb-2 flex items-center justify-between rounded border px-3 py-1 text-sm">
              <div className="truncate max-w-2xl">
                Respond to : {replyTo.split("\n")[0]}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearReply}
                aria-label="Cancel reply"
              >
                <X />
              </Button>
            </div>
          )}

          <Textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (!isModelReady || value.trim() === "") return;
                if (!isGenerating) {
                  onSend(value);
                  setValue("");
                  onClearReply?.();
                }
              }
            }}
            placeholder={
              isModelReady
                ? "Ask PaperLM something…"
                : "Model is not ready yet."
            }
            className="min-h-[60px] max-h-[200px] resize-none"
          />
        </div>

        <Button
          disabled={!isModelReady || (isGenerating && !onInterrupt)}
          variant={isGenerating ? "destructive" : "default"}
          onClick={() => {
            if (isGenerating && onInterrupt) {
              onInterrupt();
            } else {
              if (value.trim() === "") return;
              onSend(value);
              setValue("");
              onClearReply?.();
            }
          }}
        >
          {isGenerating ? <Square /> : <Send />}
        </Button>
      </div>
    </div>
  );
}
