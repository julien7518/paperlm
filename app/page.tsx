"use client";

import { useState } from "react";
import { ChatContainer } from "@/components/chat/ChatContainer";
import { ChatInput } from "@/components/chat/ChatInput";
import { SidebarControls } from "@/components/sidebar/SidebarControls";
import { useWebLLM } from "@/lib/hooks/useWebLLM";

export default function Home() {
  const [messages, setMessages] = useState<
    { role: "user" | "assistant"; content: string }[]
  >([]);

  const {
    model,
    setModel,
    temperature,
    setTemperature,
    topP,
    setTopP,
    isLoadingModel,
    statusText,
    generate,
  } = useWebLLM();

  const handleSend = async (msg: string) => {
    // Add user prompt
    setMessages((prev) => [...prev, { role: "user", content: msg }]);

    // Start assistant response (empty)
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    const stream = await generate([
      ...messages,
      { role: "user", content: msg },
    ]);

    for await (const chunk of stream) {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1].content +=
          chunk.choices[0]?.delta?.content || "";
        return updated;
      });
    }
  };

  const clearMessages = () => {
    try {
      setMessages([]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(`Failed to clear messages: ${msg}`);
    }
  };

  const exportMessages = () => {
    try {
      const dataStr = JSON.stringify(messages, null, 2);
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const now = new Date().toISOString().replace(/[:.]/g, "-");
      a.href = url;
      a.download = `conversation-${now}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(`Export failed: ${msg}`);
    }
  };

  return (
    <div className="flex h-screen">
      {/* Chat */}
      <div className="flex flex-col flex-1">
        <ChatContainer messages={messages} isModelLoading={isLoadingModel} />
        <ChatInput onSend={handleSend} />
      </div>

      {/* Sidebar */}
      <SidebarControls
        model={model}
        onChangeModel={setModel}
        temperature={temperature}
        onChangeTemperature={setTemperature}
        topP={topP}
        onChangeTopP={setTopP}
        status={statusText}
        onClear={clearMessages}
        onExport={exportMessages}
        hasMessages={messages.length > 0}
      />
    </div>
  );
}
