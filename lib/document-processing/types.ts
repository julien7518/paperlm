// Types for document processing

export interface DocumentChunk {
  id: string;
  content: string;
  source: string;
  pageNumber?: number;
  chunkIndex: number;
  totalChunks: number;
  metadata: {
    fileName: string;
    fileType: string;
    fileSize: number;
    uploadDate: string;
  };
}

export interface EmbeddingResult {
  chunkId: string;
  embedding: number[];
  content: string;
  metadata: DocumentChunk['metadata'];
}

export interface DocumentProcessingOptions {
  chunkSize: number;
  chunkOverlap: number;
  maxTokensPerChunk: number;
}

export interface ProcessedDocument {
  fileId: string;
  fileName: string;
  fileType: string;
  chunks: DocumentChunk[];
  embeddings?: EmbeddingResult[];
  processingDate: string;
}
