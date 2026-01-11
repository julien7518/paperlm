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
      console.log("Model already loaded");
      return;
    }

    if (this.isLoading) {
      console.log("Model already loading");
      return;
    }

    try {
      this.isLoading = true;
      console.log("Loading Xenova/all-MiniLM-L6-v2 model...");

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
        console.warn(
          "Warning: Could not fully initialize Xenova environment:",
          envError
        );
        // This is not fatal, continue with model loading
      }

      // Dynamic import to handle ESM modules properly
      let transformersModule;
      try {
        transformersModule = await import("@huggingface/transformers");
      } catch (importError) {
        console.error(
          "Failed to import HuggingFace transformers:",
          importError
        );
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

      // Try alternative model if the main one fails
      const modelsToTry = [
        "Xenova/all-MiniLM-L6-v2",
        "Xenova/multilingual-e5-small", // Smaller alternative model
        "Xenova/paraphrase-multilingual-MiniLM-L12-v2", // Another alternative
      ];

      let pipelineLoaded = false;
      let lastError: any = null;

      // Try each model until one works
      for (const modelName of modelsToTry) {
        try {
          console.log(`Attempting to load model: ${modelName}`);

          this.pipe = await Promise.race([
            pipeline("feature-extraction", modelName, {
              progress_callback: (data: any) => {
                console.log(`Model loading progress: ${data.progress * 100}%`);
              },
            }),
            new Promise((_, reject) =>
              setTimeout(
                () =>
                  reject(new Error("Model loading timed out after 60 seconds")),
                60000
              )
            ),
          ]);

          pipelineLoaded = true;
          console.log(`Successfully loaded model: ${modelName}`);
          break;
        } catch (pipelineError) {
          console.error(`Failed to load model ${modelName}:`, pipelineError);
          lastError = pipelineError;
          pipelineLoaded = false;

          // Clean up if pipeline was partially loaded
          if (this.pipe) {
            try {
              await this.pipe?.dispose?.();
            } catch (cleanupError) {
              console.error("Error cleaning up failed pipeline:", cleanupError);
            }
            this.pipe = null;
          }
        }
      }

      if (!pipelineLoaded) {
        console.error("Failed to load any embedding model:", lastError);
        throw new Error(
          `Failed to load embedding model after trying multiple models: ${
            lastError instanceof Error ? lastError.message : String(lastError)
          }`
        );
      }

      // Verify the pipeline was created successfully
      if (!this.pipe) {
        throw new Error("Failed to create embedding pipeline");
      }

      console.log("Xenova/all-MiniLM-L6-v2 model loaded successfully");

      this.isReady = true;
      this.isLoading = false;
    } catch (error) {
      console.error("Error loading Xenova model:", error);
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
      // Generate embedding using Xenova pipeline
      const output = await this.pipe(text, {
        pooling: "mean",
        normalize: true,
      });

      // The output is already an array of numbers
      return Array.from(output.data) as number[];
    } catch (error) {
      console.error("Error generating embedding:", error);
      throw error;
    }
  }

  async generateEmbeddingsForChunks(
    chunks: DocumentChunk[]
  ): Promise<EmbeddingResult[]> {
    if (!this.isReady) {
      await this.loadModel();
    }

    const results: EmbeddingResult[] = [];

    for (const chunk of chunks) {
      try {
        const embedding = await this.generateEmbedding(chunk.content);

        results.push({
          chunkId: chunk.id,
          embedding,
          content: chunk.content,
          metadata: chunk.metadata,
        });

        console.log(
          `Generated embedding for chunk ${chunk.id} (${embedding.length} dimensions)`
        );
      } catch (error) {
        console.error(
          `Failed to generate embedding for chunk ${chunk.id}:`,
          error
        );
        // Continue with other chunks
      }
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
        // Clean up the pipeline
        this.pipe = null;
        console.log("Cleaned up Xenova pipeline");
      } catch (error) {
        console.error("Error cleaning up Xenova pipeline:", error);
      }
    }
  }
}
