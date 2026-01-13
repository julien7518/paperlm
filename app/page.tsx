"use client";

import { useState, useEffect } from "react";
import { ChatContainer } from "@/components/chat/ChatContainer";
import { ChatInput } from "@/components/chat/ChatInput";
import { SidebarControls } from "@/components/model-sidebar/SidebarControls";
import { PdfSidebarControls } from "@/components/pdf-sidebar/PdfSidebarControls";
import { useWebLLM } from "@/lib/hooks/useWebLLM";
import { useDocumentProcessing } from "@/lib/hooks/useDocumentProcessing";
import { DocumentChunk } from "@/lib/document-processing/types";
import { LitReviewButton } from "@/components/chat/LitReviewButton";

export default function Home() {
  const [messages, setMessages] = useState<
    {
      role: "user" | "assistant";
      content: string;
      citations?: { source: string; chunkId: string }[];
    }[]
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
  const [isGenerating, setIsGenerating] = useState(false);

  // Restore chat history from sessionStorage on initial load (silent restoration)
  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        const savedMessages = sessionStorage.getItem("chatHistory");
        if (savedMessages) {
          const parsedMessages = JSON.parse(savedMessages);
          if (Array.isArray(parsedMessages)) {
            setMessages(parsedMessages);
          }
        }
      }
    } catch (error) {
      console.error("Failed to restore chat history:", error);
      // Silent error handling - no user notification
    }
  }, []);

  // Save chat history to sessionStorage whenever it changes
  useEffect(() => {
    try {
      if (typeof window !== "undefined" && messages.length > 0) {
        sessionStorage.setItem("chatHistory", JSON.stringify(messages));
      }
    } catch (error) {
      console.error("Failed to save chat history:", error);
    }
  }, [messages]);

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
    interruptGenerate,
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
    findSimilarChunks,

  } = useDocumentProcessing();

  const handleFileUpload = async (files: File[]) => {
    try {
      // Add files to UI immediately
      setUploadedFiles((prev) => [...prev, ...files]);

      // Process files for chunking and embedding
      await processFiles(files);
    } catch (error) {
      console.error("Error processing files:", error);
    }
  };

  const handleRemoveFile = (index: number) => {
    const file = uploadedFiles[index];
    // Remove from document store
    const docToRemove = processedDocuments.find(
      (doc) => doc.fileName === file.name
    );
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
    setIsGenerating(true);

    try {
      // Find relevant document chunks based on the user's query
      let relevantChunks: DocumentChunk[] = [];
      if (processedDocuments.length > 0 && embeddingModelStatus === "ready") {
        relevantChunks = await findSimilarChunks(msg, 5);
      }

      // Create context from relevant chunks
      const contextText =
        relevantChunks.length > 0
          ? `\n\n--- RELEVANT DOCUMENT CONTEXT ---\n\n${relevantChunks
              .map(
                (chunk, index) =>
                  `Chunk ${index + 1} (from ${chunk.metadata.fileName}):\n${
                    chunk.content
                  }\n`
              )
              .join("\n")}\n\n--- END OF CONTEXT ---\n\n`
          : "";

      // Create enhanced system prompt with context
      const enhancedSystemPrompt = `${systemPrompt}

## Current Context
- Date and time: ${new Date().toISOString()}
- Available documents: ${
        processedDocuments.map((doc) => doc.fileName).join(", ") || "None"
      }
- Relevant document context:${contextText}`;

      const messagesWithSystem = [
        { role: "system" as const, content: enhancedSystemPrompt },
        ...messages,
        { role: "user" as const, content: msg },
      ];

      // Use higher max_tokens for literature review to allow more comprehensive responses
      const originalMaxTokens = maxTokens;
      setMaxTokens(2048); // Set higher token limit for literature review
      
      const stream = await generate(messagesWithSystem);
      
      // Restore original max_tokens after generation
      setMaxTokens(originalMaxTokens);

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

      // Add citations for relevant chunks used in the response
      if (relevantChunks.length > 0) {
        setMessages((prev) => {
          const updated = [...prev];
          const lastMessage = updated[updated.length - 1];
          if (lastMessage.role === "assistant") {
            const chunkCitations = relevantChunks.map((chunk) => ({
              source: chunk.metadata.fileName,
              chunkId: chunk.id,
              content: chunk.content.substring(0, 200) + (chunk.content.length > 200 ? "..." : "")
            }));
            updated[updated.length - 1] = {
              ...lastMessage,
              citations: chunkCitations,
            };
          }
          return updated;
        });
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error("Generation error:", errMsg);
      // Keep the partial response that was already added
    } finally {
      setIsGenerating(false);
    }
  };

  const generateLitReview = async () => {
    if (processedDocuments.length === 0) {
      alert("Please upload documents first to generate a literature review.");
      return;
    }

    // Add user prompt for literature review
    const litReviewPrompt =
      "Generate a comprehensive literature review based on all uploaded documents.";
    setMessages((prev) => [
      ...prev,
      { role: "user", content: litReviewPrompt },
    ]);

    // Start assistant response (empty)
    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: "", citations: [] },
    ]);
    setIsGenerating(true);

    try {
      // Use cosine similarity to find the most relevant chunks for literature review
      // Get more chunks than normal (10 instead of 5) for comprehensive review
      let relevantChunks: DocumentChunk[] = [];
      if (processedDocuments.length > 0 && embeddingModelStatus === "ready") {
        // Use the lit review prompt to find relevant chunks
        relevantChunks = await findSimilarChunks(litReviewPrompt, 10); // Get top 10 most relevant chunks
      }

      // Create context from relevant chunks (not all chunks to avoid token limit)
      const contextText =
        relevantChunks.length > 0
          ? `

--- COMPREHENSIVE DOCUMENT CONTEXT FOR LITERATURE REVIEW ---

${relevantChunks
  .map(
    (chunk, index) =>
      `Source ${index + 1} (from ${chunk.metadata.fileName}):
${chunk.content}
`
  )
  .join("\n")}

--- END OF COMPREHENSIVE CONTEXT ---

`
          : "";

      // Special system prompt for literature review
      const litReviewSystemPrompt = `${systemPrompt}

## Literature Review Task
- You are now acting as a Literature Review Specialist
- Analyze the provided document excerpts comprehensively
- Synthesize key findings, comparisons, and trends
- Structure the review with: Introduction, Methodologies, Findings, Comparisons, Conclusion
- Cite specific sources when making claims using the format [Source X]
- Highlight agreements, disagreements, and gaps in the literature
- Use academic writing style with proper citations
- If important information is missing from the context, indicate what is needed

## Current Context
- Date and time: ${new Date().toISOString()}
- Available documents: ${processedDocuments
        .map((doc) => doc.fileName)
        .join(", ")}
- Total document count: ${processedDocuments.length}
- Relevant chunks analyzed: ${relevantChunks.length}
- Relevant document context:${contextText}`;

      const messagesWithSystem = [
        { role: "system" as const, content: litReviewSystemPrompt },
        ...messages,
        { role: "user" as const, content: litReviewPrompt },
      ];

      // Use higher max_tokens for literature review to allow more comprehensive responses
      const originalMaxTokens = maxTokens;
      setMaxTokens(2048); // Set higher token limit for literature review
      
      const stream = await generate(messagesWithSystem);
      
      // Restore original max_tokens after generation
      setMaxTokens(originalMaxTokens);

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

      // Add citations for the relevant chunks used in the literature review
      if (relevantChunks.length > 0) {
        setMessages((prev) => {
          const updated = [...prev];
          const lastMessage = updated[updated.length - 1];
          if (lastMessage.role === "assistant") {
            // Create citations for the specific chunks used
            const chunkCitations = relevantChunks.map((chunk) => ({
              source: chunk.metadata.fileName,
              chunkId: chunk.id,
              content: chunk.content.substring(0, 200) + (chunk.content.length > 200 ? "..." : "")
            }));
            updated[updated.length - 1] = {
              ...lastMessage,
              citations: chunkCitations,
            };
          }
          return updated;
        });
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error("Literature review generation error:", errMsg);
      // Keep the partial response that was already added
    } finally {
      setIsGenerating(false);
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
          chunkCount: processedDocuments.reduce(
            (sum, doc) => sum + doc.chunks.length,
            0
          ),
          embeddingCount: processedDocuments.reduce(
            (sum, doc) => sum + (doc.embeddings?.length || 0),
            0
          ),
          totalChunkSize: processedDocuments.reduce(
            (sum, doc) =>
              sum +
              doc.chunks.reduce(
                (chunkSum, chunk) => chunkSum + chunk.content.length,
                0
              ),
            0
          ),
        }}

      />

      {/* Chat - Center */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <LitReviewButton
            onGenerateLitReview={generateLitReview}
            isGenerating={isGenerating}
            hasDocuments={processedDocuments.length > 0}
            isModelReady={!isLoadingModel && statusText === "Ready"}
          />
          <ChatContainer
            messages={messages}
            onReply={(content) => setReplyTo(content)}
          />
        </div>
        <ChatInput
          onSend={handleSend}
          onInterrupt={interruptGenerate}
          isModelReady={!isLoadingModel && statusText === "Ready"}
          isGenerating={isGenerating}
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
