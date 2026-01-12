// Document processing worker - runs in Web Worker context
import { DocumentChunk, EmbeddingResult } from "../document-processing/types";
import { EmbeddingService } from "../document-processing/embedding";
import { DocumentChunker } from "../document-processing/chunker";
import {
  WorkerMessage,
  ProcessDocumentRequest,
  ProcessDocumentResponse,
  LoadModelRequest,
  WorkerStatus,
} from "./worker-types";

// Global state for the worker
let embeddingService: EmbeddingService | null = null;
let chunker: DocumentChunker | null = null;
let workerStatus: WorkerStatus = { status: "idle" };

// Initialize services
function initServices() {
  if (!embeddingService) {
    embeddingService = new EmbeddingService();
  }
  if (!chunker) {
    chunker = new DocumentChunker();
  }
}

// Send status update to main thread
function sendStatusUpdate() {
  const message: WorkerMessage = {
    type: "status_update",
    data: workerStatus,
  };
  postMessage(message);
}

// Process document text (text extraction should be done in main thread)
async function processDocument(
  request: ProcessDocumentRequest
): Promise<ProcessDocumentResponse> {
  try {
    updateStatus({
      status: "processing",
      message: `Processing ${request.fileName}`,
    });

    // Create a mock file object for the chunker
    const mockFile = {
      name: request.fileName,
      type: request.fileType,
      size: new Blob([request.fileContent]).size,
      text: () => Promise.resolve(request.fileContent),
    } as unknown as File;

    // Step 1: Chunk the document text
    const chunks = await chunker!.chunkDocument(mockFile);

    // Step 2: Generate embeddings for chunks
    const embeddings = await embeddingService!.generateEmbeddingsForChunks(
      chunks
    );

    // Prepare response
    const response: ProcessDocumentResponse = {
      fileId: request.fileId,
      chunks: chunks.map((chunk) => ({
        id: chunk.id,
        content: chunk.content,
        metadata: chunk.metadata,
      })),
      embeddings: embeddings.map((embedding) => ({
        chunkId: embedding.chunkId,
        embedding: embedding.embedding,
        content: embedding.content,
        metadata: embedding.metadata,
      })),
    };

    updateStatus({
      status: "ready",
      message: `Completed processing ${request.fileName}`,
    });
    return response;
  } catch (error) {
    updateStatus({
      status: "error",
      message: `Error processing ${request.fileName}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    });
    throw error;
  }
}

// Load embedding model
async function loadModel(request: LoadModelRequest) {
  try {
    updateStatus({
      status: "loading_model",
      message: "Loading embedding model...",
      progress: 0,
    });

    await embeddingService!.loadModel();

    updateStatus({ status: "ready", message: "Model loaded successfully" });
  } catch (error) {
    updateStatus({
      status: "error",
      message: `Failed to load model: ${
        error instanceof Error ? error.message : String(error)
      }`,
    });
    throw error;
  }
}

// Update worker status
function updateStatus(newStatus: Partial<WorkerStatus>) {
  workerStatus = { ...workerStatus, ...newStatus };
  sendStatusUpdate();
}

// Message handler
self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  try {
    initServices();

    const message = event.data;

    switch (message.type) {
      case "load_model":
        await loadModel(message.data);
        break;

      case "process_document":
        const response = await processDocument(message.data);
        const reply: WorkerMessage = {
          type: "process_document_response",
          data: response,
        };
        postMessage(reply);
        break;

      case "get_status":
        sendStatusUpdate();
        break;

      default:
        console.warn(`Unknown message type: ${message.type}`);
    }
  } catch (error) {
    const errorMessage: WorkerMessage = {
      type: "error",
      error: error instanceof Error ? error.message : String(error),
    };
    postMessage(errorMessage);
  }
};

// Send initial status
updateStatus({ status: "ready", message: "Worker initialized" });
