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
        
        setProcessingProgress(prev => ({
          ...prev,
          currentFile: file.name,
          processedFiles: i,
          status: `processing_${i + 1}_of_${files.length}`,
        }));

        try {
          const processedDoc = await processor.processDocument(file);
          results.push(processedDoc);
          // Add document to store
          documentStore.addDocument(processedDoc);
        } catch (err) {
          console.error(`Failed to process file ${file.name}:`, err);
          setError(`Failed to process file ${file.name}`);
          // Continue with other files
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
