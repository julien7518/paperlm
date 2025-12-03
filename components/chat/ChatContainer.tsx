"use client";

import { ChatMessage } from "./ChatMessage";

interface ChatContainerProps {
  messages: { role: "user" | "assistant"; content: string }[];
  isModelLoading: boolean;
}

export function ChatContainer({
  messages,
  isModelLoading,
}: ChatContainerProps) {
  return (
    <div className="flex-1 overflow-y-auto p-6">
      {isModelLoading && (
        <div className="w-full text-center text-sm mb-4 opacity-70">
          Loading model… (WebGPU)
        </div>
      )}

      <div className="flex flex-col pb-20">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground mt-20 text-sm">
            📄 Start by asking a question about your research papers.
          </div>
        )}

        {messages.map((msg, i) => (
          <ChatMessage key={i} role={msg.role} content={msg.content} />
        ))}
      </div>
    </div>
  );
}
