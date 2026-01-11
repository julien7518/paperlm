import { DocumentChunk, DocumentProcessingOptions } from "./types";

// Dynamic import for pdfjs to avoid server-side execution
let pdfjs: any = null;

async function loadPdfJs() {
  if (!pdfjs) {
    const pdfjsLib = await import("pdfjs-dist");
    pdfjs = pdfjsLib.default || pdfjsLib;

    // Set up PDF.js worker - using a stable version
    if (typeof window !== "undefined") {
      pdfjs.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/5.4.149/pdf.min.mjs";
    }
  }
  return pdfjs;
}

export class DocumentChunker {
  private options: DocumentProcessingOptions;

  constructor(options: Partial<DocumentProcessingOptions> = {}) {
    this.options = {
      chunkSize: 1000,
      chunkOverlap: 200,
      maxTokensPerChunk: 512,
      ...options,
    };
  }

  private generateChunkId(fileName: string, chunkIndex: number): string {
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9]/g, "_");
    return `${cleanFileName}_chunk_${chunkIndex}_${Date.now()}`;
  }

  private async extractTextFromPdf(file: File): Promise<string> {
    try {
      // Ensure we're in a browser environment
      if (typeof window === "undefined") {
        throw new Error(
          "PDF extraction can only be performed in a browser environment"
        );
      }

      // Load pdfjs dynamically to avoid server-side issues
      console.log(`Loading PDF.js library...`);
      const pdfjsLib = await loadPdfJs();
      console.log(`PDF.js library loaded successfully`);

      console.log(`Converting file to array buffer...`);
      const arrayBuffer = await file.arrayBuffer();
      console.log(
        `Array buffer created, size: ${arrayBuffer.byteLength} bytes`
      );

      console.log(`Loading PDF document...`);
      console.log(`Worker src: ${pdfjsLib.GlobalWorkerOptions.workerSrc}`);

      // Try disabling worker explicitly to force synchronous processing
      const originalWorkerSrc = pdfjsLib.GlobalWorkerOptions.workerSrc;
      console.log(`Worker src: ${pdfjsLib.GlobalWorkerOptions.workerSrc}`);

      // Use the configured worker (should be set in loadPdfJs)
      // If worker causes issues, PDF.js should fall back to synchronous processing
      try {
        const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
        console.log(`PDF loaded, number of pages: ${pdf.numPages}`);
      } catch (error) {
        console.error("Error loading PDF document:", error);
        throw new Error(
          `Failed to load PDF document: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }

      let fullText = "";
      let pdf: any = null; // Declare pdf variable outside try block

      try {
        pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
        console.log(`PDF loaded, number of pages: ${pdf.numPages}`);

        // Restore original worker setting
        pdfjsLib.GlobalWorkerOptions.workerSrc = originalWorkerSrc;
      } catch (error) {
        // Restore original worker setting even if loading fails
        pdfjsLib.GlobalWorkerOptions.workerSrc = originalWorkerSrc;
        console.error("Error loading PDF document:", error);
        throw new Error(
          `Failed to load PDF document: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }

      for (let i = 1; i <= pdf.numPages; i++) {
        console.log(`Processing page ${i}/${pdf.numPages}...`);
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: { str: string }) => item.str)
          .join(" ");
        fullText += pageText + "\n\n";
        console.log(
          `Page ${i} processed, extracted ${pageText.length} characters`
        );
      }

      console.log(
        `PDF processing completed, total characters: ${fullText.length}`
      );
      return fullText;
    } catch (error) {
      console.error("Error extracting text from PDF:", error);
      throw new Error("Failed to extract text from PDF");
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
        const overlapStart = Math.max(0, i - this.options.chunkOverlap);
        currentChunk = words.slice(overlapStart, i + 1);
        currentChunkWordCount = currentChunk.join(" ").length;
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
      console.log(`Processing file: ${file.name} (${file.type})`);

      // Extract text from file
      const text = await this.extractTextFromFile(file);

      // Split text into chunks
      const chunks = this.splitTextIntoChunks(text, file.name, file);

      console.log(`Created ${chunks.length} chunks from ${file.name}`);

      return chunks;
    } catch (error) {
      console.error(`Error processing file ${file.name}:`, error);
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
        console.error(`Skipping file ${file.name} due to error:`, error);
        // Continue with other files
      }
    }

    return allChunks;
  }
}
