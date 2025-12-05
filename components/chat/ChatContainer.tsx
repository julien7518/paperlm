"use client";

import { ChatMessage } from "./ChatMessage";

interface ChatContainerProps {
  messages: { role: "user" | "assistant"; content: string }[];
}

export function ChatContainer({ messages }: ChatContainerProps) {
  return (
    <div className="flex-1 overflow-y-auto p-6">
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
