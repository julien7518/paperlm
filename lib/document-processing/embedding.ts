import { DocumentChunk, EmbeddingResult } from "./types";

// Dynamic import for Xenova transformers to handle ESM properly
declare const window: any;

export class EmbeddingService {
  private pipe: any;
  private isLoading: boolean = false;
  private isReady: boolean = false;

  constructor() {
    this.pipe = null;
  }

  async loadModel(): Promise<void> {
    if (this.isReady) {
      return;
    }

    if (this.isLoading) {
      return;
    }

    try {
      this.isLoading = true;

      // Ensure we're in a browser environment
      if (typeof window === "undefined") {
        throw new Error(
          "Embedding model can only be loaded in a browser environment"
        );
      }

      // Ensure Xenova environment is properly initialized
      try {
        // This helps initialize the Xenova environment properly
        if (typeof window !== "undefined") {
          // Set up global variables that Xenova might expect
          window.process = window.process || { env: {} };

          // Add Buffer polyfill if not available
          if (typeof window.Buffer === "undefined") {
            // Simple Buffer polyfill for basic functionality
            window.Buffer = {
              from: (data: any) => data,
              alloc: (size: number) => new Uint8Array(size),
              isBuffer: (obj: any) => obj instanceof Uint8Array,
            };
          }
        }
      } catch (envError) {
        // This is not fatal, continue with model loading
      }

      // Dynamic import to handle ESM modules properly
      let transformersModule;
      try {
        transformersModule = await import("@huggingface/transformers");
      } catch (importError) {
        throw new Error(
          `Failed to import HuggingFace transformers: ${
            importError instanceof Error
              ? importError.message
              : String(importError)
          }`
        );
      }

      // Check if the module loaded correctly
      if (!transformersModule || !transformersModule.pipeline) {
        throw new Error(
          "Failed to load Xenova transformers module - module structure invalid"
        );
      }

      const { pipeline } = transformersModule;

      // Configure pipeline to use WebGPU if available
      const pipelineOptions = {
        progress_callback: () => {},
      };

      // Check if WebGPU is available and add configuration
      if (typeof navigator !== "undefined" && (navigator as any).gpu) {
        try {
          if (transformersModule.env && transformersModule.env.backends) {
            if (transformersModule.env.backends.onnx) {
              if (
                typeof transformersModule.env.backends.onnx.setWebGPU ===
                "function"
              ) {
                transformersModule.env.backends.onnx.setWebGPU(true);
              } else if (transformersModule.env.backends.onnx.webgpuEnabled) {
                transformersModule.env.backends.onnx.webgpuEnabled = true;
              }
            }
          }
        } catch (backendError) {}
      }

      // Try alternative model if the main one fails
      const modelsToTry = [
        "Xenova/all-MiniLM-L6-v2",
        "Xenova/multilingual-e5-small",
        "Xenova/paraphrase-multilingual-MiniLM-L12-v2",
      ];

      let pipelineLoaded = false;
      let lastError: any = null;

      for (const modelName of modelsToTry) {
        try {
          this.pipe = await Promise.race([
            pipeline("feature-extraction", modelName, pipelineOptions),
            new Promise((_, reject) =>
              setTimeout(
                () =>
                  reject(new Error("Model loading timed out after 60 seconds")),
                60000
              )
            ),
          ]);

          pipelineLoaded = true;
          break;
        } catch (pipelineError) {
          lastError = pipelineError;
          pipelineLoaded = false;

          if (this.pipe) {
            try {
              await this.pipe?.dispose?.();
            } catch (cleanupError) {}
            this.pipe = null;
          }
        }
      }

      if (!pipelineLoaded) {
        throw new Error(
          `Failed to load embedding model after trying multiple models: ${
            lastError instanceof Error ? lastError.message : String(lastError)
          }`
        );
      }

      if (!this.pipe) {
        throw new Error("Failed to create embedding pipeline");
      }

      this.isReady = true;
      this.isLoading = false;
    } catch (error) {
      this.isLoading = false;
      this.isReady = false;
      throw error;
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.isReady) {
      await this.loadModel();
    }

    try {
      const output = await this.pipe(text, {
        pooling: "mean",
        normalize: true,
      });

      const embedding = Array.from(output.data) as number[];

      return embedding;
    } catch (error) {
      throw error;
    }
  }

  async generateEmbeddingsForChunks(
    chunks: DocumentChunk[]
  ): Promise<EmbeddingResult[]> {
    if (!this.isReady) {
      await this.loadModel();
    }

    const BATCH_SIZE = 8; // safe default for browser CPU/WASM
    const results: EmbeddingResult[] = [];

    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE);

      const embeddings = await Promise.all(
        batch.map(async (chunk) => {
          const embedding = await this.generateEmbedding(chunk.content);
          return {
            chunkId: chunk.id,
            embedding,
            content: chunk.content,
            metadata: chunk.metadata,
          } as EmbeddingResult;
        })
      );

      results.push(...embeddings);

      // Yield to the event loop to keep UI responsive
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    return results;
  }

  async generateEmbeddingForText(text: string): Promise<number[]> {
    return this.generateEmbedding(text);
  }

  getModelStatus(): string {
    if (this.isReady) return "ready";
    if (this.isLoading) return "loading";
    return "not_loaded";
  }

  async cleanup(): Promise<void> {
    if (this.pipe) {
      try {
        this.pipe = null;
      } catch (error) {}
    }
  }
}
