"use client";

import { useState, useEffect } from "react";
import { DocumentProcessor } from "../document-processing/document-processor";
import { DocumentStore } from "../document-processing/document-store";
import { ProcessedDocument, DocumentChunk } from "../document-processing/types";

export function useDocumentProcessing() {
  const [processor] = useState(() => new DocumentProcessor());
  const [documentStore] = useState(() => DocumentStore.getInstance());
  const [processedDocuments, setProcessedDocuments] = useState<ProcessedDocument[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState<{
    currentFile: string | null;
    processedFiles: number;
    totalFiles: number;
    status: string;
  }>({
    currentFile: null,
    processedFiles: 0,
    totalFiles: 0,
    status: "idle",
  });
  const [fileQueue, setFileQueue] = useState<File[]>([]);
  const [embeddingModelStatus, setEmbeddingModelStatus] = useState("not_loaded");
  const [error, setError] = useState<string | null>(null);

  // Load embedding model on initialization
  useEffect(() => {
    const loadModel = async () => {
      try {
        // Only load in browser environment
        if (typeof window === 'undefined') {
          setEmbeddingModelStatus("not_loaded");
          return;
        }

        setEmbeddingModelStatus("loading");
        await processor.loadEmbeddingModel();
        setEmbeddingModelStatus("ready");
      } catch (err) {
        console.error("Failed to load embedding model:", err);
        setEmbeddingModelStatus("error");
        setError(`Failed to load embedding model: ${err instanceof Error ? err.message : String(err)}`);
      }
    };

    loadModel();

    return () => {
      try {
        processor.cleanup();
      } catch (cleanupError) {
        console.error("Error during cleanup:", cleanupError);
      }
    };
  }, [processor]);

  const processFiles = async (files: File[]) => {
    // Add files to queue if already processing
    if (isProcessing) {
      setFileQueue(prevQueue => [...prevQueue, ...files]);
      // Update total files count to include queued files
      setProcessingProgress(prev => ({
        ...prev,
        totalFiles: prev.totalFiles + files.length,
        status: `processing_${prev.processedFiles + 1}_of_${prev.totalFiles + files.length}`,
      }));
      return []; // Return empty array since these will be processed later
    }

    try {
      setIsProcessing(true);
      setError(null);
      
      setProcessingProgress({
        currentFile: null,
        processedFiles: 0,
        totalFiles: files.length,
        status: "starting",
      });

      const results: ProcessedDocument[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Set current file being processed (but don't increment processedFiles yet)
        setProcessingProgress(prev => ({
          ...prev,
          currentFile: file.name,
          status: `processing_${prev.processedFiles + 1}_of_${prev.totalFiles}`,
        }));

        try {
          const processedDoc = await processor.processDocument(file);
          results.push(processedDoc);
          // Add document to store
          documentStore.addDocument(processedDoc);
          
          // Only increment processedFiles after successful processing
          setProcessingProgress(prev => ({
            ...prev,
            processedFiles: prev.processedFiles + 1,
          }));
        } catch (err) {
          console.error(`Failed to process file ${file.name}:`, err);
          setError(`Failed to process file ${file.name}`);
          // Continue with other files (don't increment processedFiles on error)
        }
      }

      setProcessedDocuments(prev => [...prev, ...results]);
      
      setProcessingProgress(prev => ({
        ...prev,
        status: "completed",
      }));

      return results;
    } catch (err) {
      console.error("Error processing files:", err);
      setError("Failed to process files");
      setProcessingProgress(prev => ({
        ...prev,
        status: "error",
      }));
      throw err;
    } finally {
      setIsProcessing(false);
      // Process next batch in queue if exists
      if (fileQueue.length > 0) {
        const nextBatch = fileQueue;
        setFileQueue([]); // Clear queue
        processFiles(nextBatch); // Process next batch
      } else {
        // Reset progress when queue is empty
        setProcessingProgress({
          currentFile: null,
          processedFiles: 0,
          totalFiles: 0,
          status: "idle",
        });
      }
    }
  };

  const clearDocuments = () => {
    setProcessedDocuments([]);
    documentStore.clearAllDocuments();
  };

  const removeDocument = (fileId: string) => {
    setProcessedDocuments(prev => prev.filter(doc => doc.fileId !== fileId));
    documentStore.removeDocument(fileId);
  };

  const findSimilarChunks = async (query: string, topK: number = 5): Promise<DocumentChunk[]> => {
    try {
      // Generate embedding for the query
      const queryEmbedding = await processor["embeddingService"].generateEmbedding(query);
      
      // Find similar chunks
      return documentStore.findSimilarChunks(queryEmbedding, topK);
    } catch (err) {
      console.error("Error finding similar chunks:", err);
      return [];
    }
  };

  return {
    processedDocuments,
    isProcessing,
    processingProgress,
    embeddingModelStatus,
    error,
    processFiles,
    clearDocuments,
    removeDocument,
    findSimilarChunks,

    getAllChunks: () => processor.getAllChunks(processedDocuments),
    getAllEmbeddings: () => processor.getAllEmbeddings(processedDocuments),
  };
}
