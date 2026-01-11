"use client";

import { useState } from "react";
import { ChatContainer } from "@/components/chat/ChatContainer";
import { ChatInput } from "@/components/chat/ChatInput";
import { SidebarControls } from "@/components/model-sidebar/SidebarControls";
import { PdfSidebarControls } from "@/components/pdf-sidebar/PdfSidebarControls";
import { useWebLLM } from "@/lib/hooks/useWebLLM";
import { useDocumentProcessing } from "@/lib/hooks/useDocumentProcessing";

export default function Home() {
  const [messages, setMessages] = useState<
    { role: "user" | "assistant"; content: string }[]
  >([]);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [systemPrompt, setSystemPrompt] =
    useState<string>(`You are **PaperLM**, an academic research assistant specialized in analyzing and synthesizing scientific papers.

### Core Rules
- Use **only the provided context** (retrieved documents + chat history).
- **Do not hallucinate** papers, authors, results, or citations.
- If the context is insufficient, **say so explicitly**.

### Writing Style
- Professional, academic, and concise.
- Prefer **synthesis over paraphrase**.
- Highlight comparisons, limitations, and disagreements when relevant.

### Output Format (Mandatory)
- Valid, clean **Markdown only**
- Use headings, bullet points, tables when useful
- Use LaTeX for equations: \`$E = mc^2$\`, blocks allowed
- No emojis, no casual tone, no filler

### Grounding
- Clearly reference the provided documents when used
- Never cite external sources unless explicitly given

If the question cannot be answered reliably with the context, explain why and state what is missing.

You are a research assistant. Accuracy and structure matter more than verbosity.`);

  const {
    model,
    setModel,
    temperature,
    setTemperature,
    topP,
    setTopP,
    statusText,
    isLoadingModel,
    maxTokens,
    setMaxTokens,
    generate,
  } = useWebLLM();

  // Document processing
  const {
    processedDocuments,
    isProcessing,
    processingProgress,
    embeddingModelStatus,
    error,
    processFiles,
    clearDocuments,
    removeDocument,
  } = useDocumentProcessing();

  const handleFileUpload = async (files: File[]) => {
    try {
      // Add files to UI immediately
      setUploadedFiles(prev => [...prev, ...files]);
      
      // Process files for chunking and embedding
      await processFiles(files);
    } catch (error) {
      console.error("Error processing files:", error);
    }
  };

  const handleRemoveFile = (index: number) => {
    const file = uploadedFiles[index];
    // Remove from document store
    const docToRemove = processedDocuments.find(doc => doc.fileName === file.name);
    if (docToRemove) {
      removeDocument(docToRemove.fileId);
    }
    // Remove from UI
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSend = async (msg: string) => {
    // Add user prompt
    setMessages((prev) => [...prev, { role: "user", content: msg }]);
    // clear reply target when sending
    setReplyTo(null);

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
    <div className="flex h-screen w-screen overflow-hidden">
      {/* PDF Sidebar - Left */}
      <PdfSidebarControls
        onFileUpload={handleFileUpload}
        uploadedFiles={uploadedFiles}
        onRemoveFile={handleRemoveFile}
        isProcessing={isProcessing}
        processingProgress={processingProgress}
        embeddingModelStatus={embeddingModelStatus}
        error={error}
        memoryStats={{
          documentCount: processedDocuments.length,
          chunkCount: processedDocuments.reduce((sum, doc) => sum + doc.chunks.length, 0),
          embeddingCount: processedDocuments.reduce((sum, doc) => sum + (doc.embeddings?.length || 0), 0),
          totalChunkSize: processedDocuments.reduce((sum, doc) => 
            sum + doc.chunks.reduce((chunkSum, chunk) => chunkSum + chunk.content.length, 0), 0
          ),
        }}
      />

      {/* Chat - Center */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <ChatContainer
          messages={messages}
          onReply={(content) => setReplyTo(content)}
        />
        <ChatInput
          onSend={handleSend}
          isModelReady={!isLoadingModel && statusText === "Ready"}
          replyTo={replyTo}
          onClearReply={() => setReplyTo(null)}
        />
      </div>

      {/* Model Sidebar - Right */}
      <SidebarControls
        model={model}
        onChangeModel={setModel}
        temperature={temperature}
        onChangeTemperature={setTemperature}
        topP={topP}
        onChangeTopP={setTopP}
        maxTokens={maxTokens}
        onChangeMaxTokens={setMaxTokens}
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
