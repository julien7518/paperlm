"use client";

import { useEffect, useState, useRef } from "react";
import { CreateMLCEngine, MLCEngine } from "@mlc-ai/web-llm";

type Role = "user" | "assistant" | "system";

export function useWebLLM() {
  const [model, setModel] = useState("Llama-3.2-3B-Instruct-q4f16_1-MLC");
  const [temperature, setTemperature] = useState(0.7);
  const [topP, setTopP] = useState(0.9);
  const [maxTokens, setMaxTokens] = useState(512);

  const [isLoadingModel, setIsLoadingModel] = useState(false);
  const [statusText, setStatusText] = useState("Idle");

  const engineRef = useRef<MLCEngine | null>(null);

  // Load model initially or when model changes
  useEffect(() => {
    loadModel(model);
  }, [model]);

  const loadModel = async (modelName: string) => {
    try {
      setIsLoadingModel(true);
      setStatusText("Initializing…");

      // Use CreateMLCEngine factory function with proper config
      const engine = await CreateMLCEngine(modelName, {
        initProgressCallback: (report) => {
          setStatusText(report.text);
        },
      });

      engineRef.current = engine;
      setStatusText("Ready");
    } catch (err) {
      console.error("Model loading failed:", err);
      setStatusText(
        `Error loading model: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    } finally {
      setIsLoadingModel(false);
    }
  };

  const generate = async (messages: { role: Role; content: string }[]) => {
    if (!engineRef.current) throw new Error("Engine not loaded");

    const completion = await engineRef.current.chat.completions.create({
      messages,
      temperature,
      top_p: topP,
      max_tokens: maxTokens,
      stream: true,
      stream_options: { include_usage: true },
    });

    return completion;
  };

  const interruptGenerate = () => {
    if (engineRef.current) {
      engineRef.current.interruptGenerate();
    }
  };

  return {
    model,
    setModel,
    temperature,
    setTemperature,
    topP,
    setTopP,
    maxTokens,
    setMaxTokens,
    isLoadingModel,
    statusText,
    generate,
    interruptGenerate,
  };
}
