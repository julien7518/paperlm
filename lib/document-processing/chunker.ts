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

  constructor(options: Partial<DocumentProcessingOptions> = {}) {
    this.options = {
      chunkSize: 400,
      chunkOverlap: 80,
      maxTokensPerChunk: 512,
      ...options,
    };
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
    const words = text.split(/\s+/);
    const chunks: DocumentChunk[] = [];
    let currentChunk: string[] = [];
    let currentChunkWordCount = 0;

    for (let i = 0; i < words.length; i++) {
      const word = words[i];

      if (currentChunkWordCount + word.length <= this.options.chunkSize) {
        currentChunk.push(word);
        currentChunkWordCount += word.length + 1; // +1 for space
      } else {
        // Add current chunk to chunks
        if (currentChunk.length > 0) {
          const chunkId = this.generateChunkId(fileName, chunks.length);
          chunks.push({
            id: chunkId,
            content: currentChunk.join(" "),
            source: fileName,
            chunkIndex: chunks.length,
            totalChunks: 0, // Will be updated later
            metadata: {
              fileName,
              fileType: file.type,
              fileSize: file.size,
              uploadDate: new Date().toISOString(),
            },
          });
        }

        // Start new chunk with overlap
        const overlapWordCount = Math.min(
          this.options.chunkOverlap,
          currentChunk.length
        );
        currentChunk = currentChunk.slice(
          currentChunk.length - overlapWordCount
        );
        currentChunkWordCount = currentChunk.join(" ").length;
        currentChunk.push(word);
        currentChunkWordCount += word.length + 1;
      }
    }

    // Add the last chunk
    if (currentChunk.length > 0) {
      const chunkId = this.generateChunkId(fileName, chunks.length);
      chunks.push({
        id: chunkId,
        content: currentChunk.join(" "),
        source: fileName,
        chunkIndex: chunks.length,
        totalChunks: 0, // Will be updated later
        metadata: {
          fileName,
          fileType: file.type,
          fileSize: file.size,
          uploadDate: new Date().toISOString(),
        },
      });
    }

    // Update totalChunks for all chunks
    const totalChunks = chunks.length;
    return chunks.map((chunk, index) => ({
      ...chunk,
      totalChunks,
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

    for (const file of files) {
      try {
        const chunks = await this.chunkDocument(file);
        allChunks.push(...chunks);
      } catch (error) {
        // Continue with other files
      }
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    return allChunks;
  }
}
