// Web Worker manager for document processing
import {
  ProcessedDocument,
  DocumentChunk,
  EmbeddingResult,
} from "../document-processing/types";
import { DocumentChunker } from "../document-processing/chunker";
import {
  WorkerMessage,
  ProcessDocumentRequest,
  ProcessDocumentResponse,
  LoadModelRequest,
  WorkerStatus,
} from "./worker-types";

export class WorkerManager {
  private worker: Worker | null = null;
  private status: WorkerStatus = { status: "idle" };
  private messageHandlers: Map<string, (data: any) => void> = new Map();
  private pendingRequests: Map<
    string,
    { resolve: (value: any) => void; reject: (reason?: any) => void }
  > = new Map();
  private requestCounter = 0;

  private chunker: DocumentChunker;

  constructor() {
    this.chunker = new DocumentChunker();
    this.initializeWorker();
  }

  private initializeWorker(): void {
    try {
      // Create worker - note: in Next.js, we need to use the correct path
      this.worker = new Worker(
        new URL("./document-worker.ts", import.meta.url),
        {
          type: "module",
          name: "document-processor-worker",
        }
      );

      this.worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
        this.handleWorkerMessage(event.data);
      };

      this.worker.onerror = (error) => {
        console.error("Worker error:", error);
        this.updateStatus({
          status: "error",
          message: `Worker error: ${error.message}`,
        });
      };

      this.updateStatus({
        status: "ready",
        message: "Worker manager initialized",
      });
    } catch (error) {
      console.error("Failed to create worker:", error);
      this.updateStatus({
        status: "error",
        message: `Failed to create worker: ${
          error instanceof Error ? error.message : String(error)
        }`,
      });
    }
  }

  private handleWorkerMessage(message: WorkerMessage): void {
    switch (message.type) {
      case "status_update":
        this.updateStatus(message.data);
        break;

      case "process_document_response":
        if (
          message.data.requestId &&
          this.pendingRequests.has(message.data.requestId)
        ) {
          const { resolve } = this.pendingRequests.get(message.data.requestId)!;
          resolve(message.data);
          this.pendingRequests.delete(message.data.requestId);
        }
        break;

      case "error":
        console.error("Worker error:", message.error);
        this.updateStatus({ status: "error", message: message.error });
        break;

      default:
        console.warn(`Unknown worker message type: ${message.type}`);
    }
  }

  private updateStatus(newStatus: Partial<WorkerStatus>): void {
    this.status = { ...this.status, ...newStatus };
    console.log(`Worker status: ${this.status.status}`, this.status.message);
  }

  public getStatus(): WorkerStatus {
    return this.status;
  }

  public async loadModel(modelName?: string): Promise<void> {
    if (!this.worker) {
      throw new Error("Worker not initialized");
    }

    this.updateStatus({
      status: "loading_model",
      message: "Loading embedding model...",
    });

    const request: LoadModelRequest = { modelName };

    return new Promise((resolve, reject) => {
      const requestId = String(this.requestCounter++);
      this.pendingRequests.set(requestId, { resolve, reject });

      const message: WorkerMessage = {
        type: "load_model",
        data: request,
      };

      this.worker?.postMessage(message);
    });
  }

  private async extractTextFromFile(file: File): Promise<string> {
    console.log(`Extracting text from ${file.name} (${file.type}) in main thread`);
    
    // Extract text in main thread where pdf.js works properly
    if (file.type === "application/pdf") {
      console.log("Using PDF extraction method");
      // Use the chunker's PDF extraction method
      return this.chunker.extractTextFromPdf(file);
    } else if (file.type === "text/plain" || file.type === "text/markdown") {
      console.log("Using text extraction method");
      return file.text();
    } else {
      console.error(`Unsupported file type: ${file.type}`);
      throw new Error(`Unsupported file type: ${file.type}`);
    }
  }

  public async processDocument(
    file: File,
    fileId: string
  ): Promise<ProcessedDocument> {
    if (!this.worker) {
      throw new Error("Worker not initialized");
    }

    this.updateStatus({
      status: "processing",
      message: `Processing ${file.name}`,
    });

    // Step 1: Extract text in main thread (pdf.js doesn't work well in workers)
    const fileContent = await this.extractTextFromFile(file);
    
    // Step 2: Send text to worker for chunking and embedding
    const request: ProcessDocumentRequest = {
      fileContent,
      fileName: file.name,
      fileType: file.type,
      fileId
    };

    return new Promise((resolve, reject) => {
      const requestId = String(this.requestCounter++);
      this.pendingRequests.set(requestId, { resolve, reject });

      const message: WorkerMessage = {
        type: "process_document",
        data: { ...request, requestId },
      };

      this.worker?.postMessage(message);
    });
  }

  public async processMultipleDocuments(
    files: File[]
  ): Promise<ProcessedDocument[]> {
    const results: ProcessedDocument[] = [];

    for (const file of files) {
      try {
        const fileId = this.generateFileId(file.name);
        const processedDoc = await this.processDocument(file, fileId);
        results.push(processedDoc);
      } catch (error) {
        console.error(`Failed to process file ${file.name}:`, error);
        // Continue with other files
      }
    }

    return results;
  }

  private generateFileId(fileName: string): string {
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9]/g, "_");
    return `doc_${cleanFileName}_${Date.now()}`;
  }

  public terminate(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.updateStatus({ status: "idle", message: "Worker terminated" });
  }

  public onStatusUpdate(callback: (status: WorkerStatus) => void): void {
    // This would need a more sophisticated implementation with event emitters
    console.log(
      "Status update callback registered (simplified implementation)"
    );
  }
}
