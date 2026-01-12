"use client";

import { useEffect, useRef } from "react";

import { ChatMessage } from "./ChatMessage";

interface ChatContainerProps {
  messages: { role: "user" | "assistant"; content: string }[];
  onReply?: (content: string) => void;
}

export function ChatContainer({ messages, onReply }: ChatContainerProps) {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden p-6">
      <div className="flex flex-col min-w-0 w-full">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground mt-20 text-sm">
            📄 Start by asking a question about your research papers.
          </div>
        )}

        {messages.map((msg, i) => (
          <ChatMessage
            key={i}
            role={msg.role}
            content={msg.content}
            onReply={onReply}
          />
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
