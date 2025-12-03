"use client";

import { cn } from "@/lib/utils";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
}

export function ChatMessage({ role, content, isStreaming }: ChatMessageProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Copy failed: ${msg}`);
    }
  };
  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        className={cn(
          "px-4 py-3 rounded-lg",
          role === "user"
            ? "bg-primary/10 border border-primary/20"
            : "bg-muted border border-border"
        )}
      >
        <div className="text-sm whitespace-pre-wrap">{content}</div>

        {isStreaming && (
          <div className="mt-2 text-xs opacity-70 flex items-center gap-2">
            <span className="animate-pulse">●</span> Thinking…
          </div>
        )}
      </div>

      <div
        className={
          "flex " + (role === "assistant" ? "justify-start" : "justify-end")
        }
      >
        <Button
          variant="link"
          onClick={handleCopy}
          aria-label={
            role === "assistant" ? "Copy assistant message" : "Copy message"
          }
          className={role === "assistant" ? "mr-auto" : ""}
        >
          {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
        </Button>
      </div>
    </div>
  );
}
