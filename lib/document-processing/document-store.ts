import { DocumentChunk, EmbeddingResult, ProcessedDocument } from "./types";

export class DocumentStore {
  private static instance: DocumentStore;
  private documents: ProcessedDocument[];
  private chunks: DocumentChunk[];
  private embeddings: EmbeddingResult[];

  private constructor() {
    this.documents = [];
    this.chunks = [];
    this.embeddings = [];
  }

  public static getInstance(): DocumentStore {
    if (!DocumentStore.instance) {
      DocumentStore.instance = new DocumentStore();
    }
    return DocumentStore.instance;
  }

  addDocument(document: ProcessedDocument): void {
    // Check if document already exists
    const exists = this.documents.some(doc => doc.fileId === document.fileId);
    if (exists) {
      console.warn(`Document ${document.fileId} already exists in store`);
      return;
    }

    this.documents.push(document);
    
    // Add chunks
    if (document.chunks) {
      this.chunks.push(...document.chunks);
    }
    
    // Add embeddings
    if (document.embeddings) {
      this.embeddings.push(...document.embeddings);
    }
  }

  addDocuments(documents: ProcessedDocument[]): void {
    documents.forEach(doc => this.addDocument(doc));
  }

  removeDocument(fileId: string): boolean {
    const initialLength = this.documents.length;
    
    // Remove document
    this.documents = this.documents.filter(doc => doc.fileId !== fileId);
    
    // Remove associated chunks
    this.chunks = this.chunks.filter(chunk => chunk.metadata.fileName !== fileId);
    
    // Remove associated embeddings
    this.embeddings = this.embeddings.filter(embedding => 
      embedding.metadata.fileName !== fileId
    );
    
    return this.documents.length !== initialLength;
  }

  clearAllDocuments(): void {
    this.documents = [];
    this.chunks = [];
    this.embeddings = [];
  }

  getDocument(fileId: string): ProcessedDocument | undefined {
    return this.documents.find(doc => doc.fileId === fileId);
  }

  getAllDocuments(): ProcessedDocument[] {
    return [...this.documents];
  }

  getChunksForDocument(fileId: string): DocumentChunk[] {
    return this.chunks.filter(chunk => chunk.metadata.fileName === fileId);
  }

  getAllChunks(): DocumentChunk[] {
    return [...this.chunks];
  }

  getEmbeddingsForDocument(fileId: string): EmbeddingResult[] {
    return this.embeddings.filter(embedding => embedding.metadata.fileName === fileId);
  }

  getAllEmbeddings(): EmbeddingResult[] {
    return [...this.embeddings];
  }

  findSimilarChunks(queryEmbedding: number[], topK: number = 5): DocumentChunk[] {
    if (this.embeddings.length === 0) {
      return [];
    }

    // Calculate cosine similarity between query and all embeddings
    const similarities = this.embeddings.map(embedding => {
      const similarity = this.cosineSimilarity(queryEmbedding, embedding.embedding);
      return {
        chunkId: embedding.chunkId,
        similarity,
      };
    });

    // Sort by similarity (descending)
    similarities.sort((a, b) => b.similarity - a.similarity);

    // Get top K results
    const topResults = similarities.slice(0, topK);

    // Find corresponding chunks
    const similarChunks = topResults
      .map(result => this.chunks.find(chunk => chunk.id === result.chunkId))
      .filter((chunk): chunk is DocumentChunk => chunk !== undefined);

    return similarChunks;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    // Handle vectors of different lengths by padding the shorter one with zeros
    const maxLength = Math.max(a.length, b.length);
    
    // Pad vectors if necessary
    const paddedA = a.length < maxLength ? [...a, ...new Array(maxLength - a.length).fill(0)] : a;
    const paddedB = b.length < maxLength ? [...b, ...new Array(maxLength - b.length).fill(0)] : b;

    // Calculate dot product
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < maxLength; i++) {
      dotProduct += paddedA[i] * paddedB[i];
      normA += paddedA[i] * paddedA[i];
      normB += paddedB[i] * paddedB[i];
    }

    // Calculate magnitudes
    const magnitudeA = Math.sqrt(normA);
    const magnitudeB = Math.sqrt(normB);

    // Avoid division by zero
    if (magnitudeA === 0 || magnitudeB === 0) {
      return 0;
    }

    // Calculate cosine similarity
    return dotProduct / (magnitudeA * magnitudeB);
  }

  getStoreStats(): {
    documentCount: number;
    chunkCount: number;
    embeddingCount: number;
    totalChunkSize: number;
  } {
    const totalChunkSize = this.chunks.reduce((sum, chunk) => 
      sum + chunk.content.length, 0
    );

    return {
      documentCount: this.documents.length,
      chunkCount: this.chunks.length,
      embeddingCount: this.embeddings.length,
      totalChunkSize,
    };
  }
}
