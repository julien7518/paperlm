"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import {
  FileText,
  FileUp,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { CollapsibleStatusCard } from "./CollapsibleStatusCard";

interface PdfSidebarContentProps {
  onFileUpload: (files: File[]) => void;
  uploadedFiles: File[];
  onRemoveFile: (index: number) => void;
  isProcessing: boolean;
  processingProgress: {
    currentFile: string | null;
    processedFiles: number;
    totalFiles: number;
    status: string;
  };
  embeddingModelStatus: string;
  error: string | null;
  memoryStats: {
    documentCount: number;
    chunkCount: number;
    embeddingCount: number;
    totalChunkSize: number;
  };
}

export function PdfSidebarContent({
  onFileUpload,
  uploadedFiles,
  onRemoveFile,
  isProcessing = false,
  processingProgress = {
    currentFile: null,
    processedFiles: 0,
    totalFiles: 0,
    status: "idle",
  },
  embeddingModelStatus = "not_loaded",
  error = null,
  memoryStats = {
    documentCount: 0,
    chunkCount: 0,
    embeddingCount: 0,
    totalChunkSize: 0,
  },
}: PdfSidebarContentProps) {
  const [isDragging, setIsDragging] = useState(false);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      onFileUpload(acceptedFiles);
      setIsDragging(false);
    },
    [onFileUpload]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "text/plain": [".txt"],
      "text/markdown": [".md"],
    },
    maxFiles: 5,
    onDragEnter: () => setIsDragging(true),
    onDragLeave: () => setIsDragging(false),
  });

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Collapsible Status Card (Embedding Model + Memory Bank) */}
      <CollapsibleStatusCard
        embeddingModelStatus={embeddingModelStatus}
        memoryStats={memoryStats}
      />

      {/* Dropzone Section */}
      <Card className="gap-4">
        <CardHeader>
          <CardTitle className="text-sm">Upload Files</CardTitle>
          <CardDescription className="text-xs">
            Drag & drop .pdf, .txt or .md files, or click to browse
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            {...getRootProps()}
            className={`flex flex-col items-center justify-center gap-4 p-6 border-2 border-dashed rounded-lg cursor-pointer ${
              isDragActive || isDragging
                ? "border-primary bg-primary/10"
                : "border-border"
            }`}
          >
            <input {...getInputProps()} />
            <FileUp className="size-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground text-center">
              {isDragActive ? "Drop the files here" : "Click or drag files"}
            </p>
            <Button
              size="sm"
              variant="outline"
              className="text-xs cursor-pointer"
            >
              Browse Files
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Processing Status */}
      {isProcessing && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
              Processing Documents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between min-w-0">
                <p
                  className="text-xs text-muted-foreground file-name-truncate flex-1 min-w-0"
                  title={processingProgress.currentFile || "Starting..."}
                >
                  {processingProgress.currentFile || "Starting..."}
                </p>
                <p className="text-xs font-mono flex-shrink-0 ml-2">
                  {processingProgress.processedFiles}/
                  {processingProgress.totalFiles}
                </p>
              </div>
              <Progress
                value={
                  (processingProgress.processedFiles /
                    processingProgress.totalFiles) *
                  100
                }
                className="h-2"
              />
              <p className="text-xs text-muted-foreground text-center">
                {processingProgress.status.replace(/_/g, " ")}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle className="text-xs">Processing Error</AlertTitle>
          <AlertDescription className="text-xs">{error}</AlertDescription>
        </Alert>
      )}

      {/* Uploaded Files List */}
      <div className="flex-1">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Uploaded Files</CardTitle>
          </CardHeader>
          <CardContent>
            {uploadedFiles.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-8">
                <FileText className="size-6 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  No files uploaded yet
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[200px]">
                <div className="space-y-3">
                  {uploadedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between gap-2 p-2 border rounded-lg"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <FileText className="size-4 text-muted-foreground flex-shrink-0" />
                        <div className="text-xs flex-1 min-w-0">
                          <p
                            className="font-medium file-name-truncate"
                            title={file.name}
                          >
                            {file.name}
                          </p>
                          <p className="text-muted-foreground file-info-truncate">
                            {file.type} - {(file.size / 1024).toFixed(2)} KB
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => onRemoveFile(index)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
