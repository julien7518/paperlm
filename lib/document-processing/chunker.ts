import { DocumentChunk, DocumentProcessingOptions } from "./types";

// Dynamic import for pdfjs to avoid server-side execution
let pdfjs: any = null;

async function loadPdfJs() {
  if (!pdfjs) {
    console.log("Loading PDF.js library...");
    const pdfjsLib = await import("pdfjs-dist");
    pdfjs = pdfjsLib.default || pdfjs;

    // Set up PDF.js worker - using version 2.16.105
    if (typeof window !== "undefined") {
      console.log("Setting up PDF.js worker");
      try {
        pdfjs.GlobalWorkerOptions.workerSrc =
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js";
        console.log("PDF.js worker configured successfully");
      } catch (error) {
        console.error("Failed to configure PDF.js worker:", error);
        // Continue without worker - will be slower but should work
      }
    } else {
      console.warn("PDF.js worker setup skipped: not in browser environment");
    }
  }
  return pdfjs;
}

export class DocumentChunker {
  private options: DocumentProcessingOptions;

  private progressCallback: ((progress: number, status: string) => void) | null = null;

  constructor(options: Partial<DocumentProcessingOptions> = {}) {
    this.options = {
      chunkSize: 400,
      chunkOverlap: 80,
      maxTokensPerChunk: 512,
      ...options,
    };
  }

  setProgressCallback(callback: (progress: number, status: string) => void): void {
    this.progressCallback = callback;
  }

  private generateChunkId(fileName: string, chunkIndex: number): string {
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9]/g, "_");
    return `${cleanFileName}_chunk_${chunkIndex}_${Date.now()}`;
  }

  async extractTextFromPdf(file: File): Promise<string> {
    try {
      console.log(
        `Starting PDF extraction for ${file.name}, size: ${file.size} bytes, type: ${file.type}`
      );

      // Ensure we're in a browser environment
      if (typeof window === "undefined") {
        console.error("PDF extraction attempted in non-browser environment");
        throw new Error(
          "PDF extraction can only be performed in a browser environment"
        );
      }

      console.log("Loading PDF.js library...");
      // Load pdfjs dynamically to avoid server-side issues
      const pdfjsLib = await loadPdfJs();
      console.log("PDF.js loaded successfully");

      console.log("Reading file as array buffer...");
      const arrayBuffer = await file.arrayBuffer();
      console.log(
        `Array buffer created, size: ${arrayBuffer.byteLength} bytes`
      );

      // Create a new Uint8Array from the arrayBuffer to avoid detachment issues
      const uint8Array = new Uint8Array(arrayBuffer);
      console.log(`Uint8Array created, length: ${uint8Array.length}`);

      // For pdfjs 2.x, getDocument returns a promise directly
      console.log("Loading PDF document...");
      const loadingTask = pdfjsLib.getDocument(uint8Array);
      const pdf = await loadingTask.promise;
      console.log(`PDF loaded successfully, ${pdf.numPages} pages`);

      let fullText = "";

      for (let i = 1; i <= pdf.numPages; i++) {
        console.log(`Processing page ${i}/${pdf.numPages}`);
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: { str: string }) => item.str)
          .join(" ");
        fullText += pageText + "\n\n";
        console.log(`Page ${i} extracted, ${pageText.length} characters`);
        await new Promise((resolve) => setTimeout(resolve, 0));
      }

      console.log(
        `PDF extraction completed, total ${fullText.length} characters extracted`
      );
      return fullText;
    } catch (error) {
      console.error("Detailed PDF extraction error:", error);
      if (error instanceof Error) {
        console.error("Error stack:", error.stack);
      }
      throw new Error(
        `Failed to extract text from PDF: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  private async extractTextFromFile(file: File): Promise<string> {
    if (file.type === "application/pdf") {
      return this.extractTextFromPdf(file);
    } else if (file.type === "text/plain" || file.type === "text/markdown") {
      return file.text();
    } else {
      throw new Error("Unsupported file type");
    }
  }

  private splitTextIntoChunks(
    text: string,
    fileName: string,
    file: File
  ): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    let start = 0;
    const chunkSize = this.options.chunkSize;
    const overlap = this.options.chunkOverlap;

    while (start < text.length) {
      const end = start + chunkSize;
      let chunk = text.slice(start, end);

      // Intelligent chunking - try to find sentence boundaries
      if (end < text.length) {
        const lastPeriod = chunk.lastIndexOf(".");
        if (lastPeriod > -1 && lastPeriod > chunkSize * 0.5) {
          chunk = chunk.slice(0, lastPeriod + 1);
          start += lastPeriod + 1 - overlap;
        } else {
          const lastSpace = chunk.lastIndexOf(" ");
          if (lastSpace > -1) {
            chunk = chunk.slice(0, lastSpace);
            start += lastSpace - overlap;
          } else {
            start += chunkSize - overlap;
          }
        }
      } else {
        start += chunkSize;
      }

      // Create chunk with proper metadata
      const chunkId = this.generateChunkId(fileName, chunks.length);
      const chunkObj: DocumentChunk = {
        id: chunkId,
        content: chunk.trim(),
        source: fileName,
        chunkIndex: chunks.length,
        totalChunks: 0,
        metadata: {
          fileName,
          fileType: file.type,
          fileSize: file.size,
          uploadDate: new Date().toISOString(),
        },
      };

      chunks.push(chunkObj);
    }

    // Update total chunks count
    return chunks.map((chunk, index) => ({
      ...chunk,
      totalChunks: chunks.length,
      chunkIndex: index,
    }));
  }

  async chunkDocument(file: File): Promise<DocumentChunk[]> {
    try {
      // Extract text from file
      const text = await this.extractTextFromFile(file);

      // Split text into chunks
      const chunks = this.splitTextIntoChunks(text, file.name, file);

      return chunks;
    } catch (error) {
      throw error;
    }
  }

  async chunkMultipleDocuments(files: File[]): Promise<DocumentChunk[]> {
    const allChunks: DocumentChunk[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        if (this.progressCallback) {
          const progress = Math.round(((i + 1) / files.length) * 100);
          this.progressCallback(progress, `Processing file ${i + 1}/${files.length}: ${file.name}`);
        }

        const chunks = await this.chunkDocument(file);
        allChunks.push(...chunks);

        if (this.progressCallback) {
          this.progressCallback(
            Math.round(((i + 1) / files.length) * 100),
            `Completed ${file.name} - ${chunks.length} chunks created`
          );
        }
      } catch (error) {
        console.error(`Failed to process file ${file.name}:`, error);
        if (this.progressCallback) {
          this.progressCallback(
            Math.round(((i + 1) / files.length) * 100),
            `Error processing ${file.name}: ${error instanceof Error ? error.message : String(error)}`
          );
        }
        // Continue with other files
      }

      // Adaptive yield to event loop
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    if (this.progressCallback) {
      this.progressCallback(100, `Chunking complete - ${allChunks.length} total chunks`);
    }

    return allChunks;
  }

  // Utility method to get chunking statistics
  getChunkingStats(chunks: DocumentChunk[]): {
    totalChunks: number;
    avgChunkSize: number;
    minChunkSize: number;
    maxChunkSize: number;
    totalCharacters: number;
  } {
    if (chunks.length === 0) {
      return {
        totalChunks: 0,
        avgChunkSize: 0,
        minChunkSize: 0,
        maxChunkSize: 0,
        totalCharacters: 0,
      };
    }

    const chunkSizes = chunks.map(chunk => chunk.content.length);
    return {
      totalChunks: chunks.length,
      avgChunkSize: chunkSizes.reduce((sum, size) => sum + size, 0) / chunks.length,
      minChunkSize: Math.min(...chunkSizes),
      maxChunkSize: Math.max(...chunkSizes),
      totalCharacters: chunkSizes.reduce((sum, size) => sum + size, 0),
    };
  }
}
