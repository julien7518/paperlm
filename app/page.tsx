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
  const [systemPrompt, setSystemPrompt] = useState<string>(
    `You are PaperLM, a research-focused AI.  
Always format your responses using clean professional Markdown (if needed):
- Use headlines (#, ##, ###)
- Use bullet points and numbered lists
- Use fenced code blocks for code snippets
- Use LaTeX for equations: $E = mc^2$ or $$\int_0^\infty f(x)\,dx$$
- Use tables when relevant
Your output must always be valid markdown and render beautifully.`
  );

  const {
    model,
    setModel,
    temperature,
    setTemperature,
    topP,
    setTopP,
    statusText,
    generate,
  } = useWebLLM();

  const handleSend = async (msg: string) => {
    // Add user prompt
    setMessages((prev) => [...prev, { role: "user", content: msg }]);

    // Start assistant response (empty)
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      const messagesWithSystem = [
        { role: "system" as const, content: systemPrompt },
        ...messages,
        { role: "user" as const, content: msg },
      ];

      const stream = await generate(messagesWithSystem);

      let fullResponse = "";
      for await (const chunk of stream) {
        const content = chunk.choices?.[0]?.delta?.content;
        if (content) {
          fullResponse += content;
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1].content = fullResponse;
            return updated;
          });
        }
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error("Generation error:", errMsg);
      // Keep the partial response that was already added
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
      a.href = url;
      a.download = `paperLM-conversation.json`;
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
        <ChatContainer messages={messages} />
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
        systemPrompt={systemPrompt}
        onChangeSystemPrompt={setSystemPrompt}
      />
    </div>
  );
}
