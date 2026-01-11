import { DocumentChunk, EmbeddingResult, ProcessedDocument } from "./types";
import { DocumentChunker } from "./chunker";
import { EmbeddingService } from "./embedding";

export class DocumentProcessor {
  private chunker: DocumentChunker;
  private embeddingService: EmbeddingService;

  constructor() {
    this.chunker = new DocumentChunker();
    this.embeddingService = new EmbeddingService();
  }

  async processDocument(file: File): Promise<ProcessedDocument> {
    try {
      console.log(`Starting processing of ${file.name}`);

      // Step 1: Chunk the document
      const chunks = await this.chunker.chunkDocument(file);

      // Step 2: Generate embeddings for chunks
      const embeddings = await this.embeddingService.generateEmbeddingsForChunks(chunks);

      // Create processed document
      const processedDocument: ProcessedDocument = {
        fileId: this.generateFileId(file.name),
        fileName: file.name,
        fileType: file.type,
        chunks,
        embeddings,
        processingDate: new Date().toISOString(),
      };

      console.log(`Successfully processed ${file.name}: ${chunks.length} chunks, ${embeddings.length} embeddings`);

      return processedDocument;
    } catch (error) {
      console.error(`Error processing document ${file.name}:`, error);
      throw error;
    }
  }

  async processMultipleDocuments(files: File[]): Promise<ProcessedDocument[]> {
    const results: ProcessedDocument[] = [];

    for (const file of files) {
      try {
        const processedDoc = await this.processDocument(file);
        results.push(processedDoc);
      } catch (error) {
        console.error(`Skipping file ${file.name} due to processing error:`, error);
        // Continue with other files
      }
    }

    return results;
  }

  async loadEmbeddingModel(): Promise<void> {
    // Ensure we're in a browser environment
    if (typeof window === 'undefined') {
      console.warn("Embedding model loading skipped: not in browser environment");
      return;
    }
    
    await this.embeddingService.loadModel();
  }

  getEmbeddingModelStatus(): string {
    return this.embeddingService.getModelStatus();
  }

  private generateFileId(fileName: string): string {
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9]/g, "_");
    return `doc_${cleanFileName}_${Date.now()}`;
  }

  async cleanup(): Promise<void> {
    await this.embeddingService.cleanup();
  }

  // Utility method to get chunks from processed documents
  getAllChunks(documents: ProcessedDocument[]): DocumentChunk[] {
    return documents.flatMap(doc => doc.chunks);
  }

  // Utility method to get all embeddings from processed documents
  getAllEmbeddings(documents: ProcessedDocument[]): EmbeddingResult[] {
    return documents.flatMap(doc => doc.embeddings || []);
  }
}
