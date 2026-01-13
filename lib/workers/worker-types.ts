// Types for Web Worker communication
export interface WorkerMessage {
  type: string;
  data?: any;
  error?: string;
}

export interface ProcessDocumentRequest {
  fileContent: string;
  fileName: string;
  fileType: string;
  fileId: string;
}

export interface ProcessDocumentResponse {
  fileId: string;
  chunks: {
    id: string;
    content: string;
    metadata: any;
  }[];
  embeddings: {
    chunkId: string;
    embedding: number[];
    content: string;
    metadata: any;
  }[];
}

export interface LoadModelRequest {
  modelName?: string;
}

export interface WorkerStatus {
  status: 'idle' | 'loading_model' | 'processing' | 'ready' | 'error';
  progress?: number;
  message?: string;
}