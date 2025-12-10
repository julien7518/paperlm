"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function ChatInput({ onSend }: { onSend: (msg: string) => void }) {
  const [value, setValue] = useState("");

  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      <div className="flex items-center gap-2">
        <Textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (value.trim() === "") return;
              onSend(value);
              setValue("");
            }
          }}
          placeholder="Ask PaperLM something…"
          className="min-h-[60px] max-h-[200px] resize-none"
        />

        <Button
          onClick={() => {
            if (value.trim() === "") return;
            onSend(value);
            setValue("");
          }}
        >
          <Send />
        </Button>
      </div>
    </div>
  );
}
