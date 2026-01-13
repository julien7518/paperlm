"use client";

import { useState } from "react";
import { PdfSidebarContent } from "./PdfSidebarContent";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { ScrollArea } from "../ui/scroll-area";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface PdfSidebarProps {
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

export function PdfSidebarControls({
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

}: PdfSidebarProps) {
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <>
      {/* Desktop Sidebar - hidden on mobile */}
      <div className="hidden lg:flex h-screen w-80 border-r border-border bg-background">
        <ScrollArea className="h-full w-full p-4">
          <div className="flex flex-col h-full gap-6">
            <PdfSidebarContent
              onFileUpload={onFileUpload}
              uploadedFiles={uploadedFiles}
              onRemoveFile={onRemoveFile}
              isProcessing={isProcessing}
              processingProgress={processingProgress}
              embeddingModelStatus={embeddingModelStatus}
              error={error}
              memoryStats={memoryStats}
            />
          </div>
        </ScrollArea>
      </div>

      {/* Mobile Menu Button - shown only on mobile */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button size="icon" variant="outline">
              <Menu className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-80 p-0">
            <SheetHeader className="p-4">
              <SheetTitle>PDF Documents</SheetTitle>
            </SheetHeader>
            <ScrollArea className="h-[calc(100vh-80px)] p-4">
              <div className="flex flex-col gap-6">
                <PdfSidebarContent
                  onFileUpload={onFileUpload}
                  uploadedFiles={uploadedFiles}
                  onRemoveFile={onRemoveFile}
                  isProcessing={isProcessing}
                  processingProgress={processingProgress}
                  embeddingModelStatus={embeddingModelStatus}
                  error={error}
                  memoryStats={memoryStats}
                />
              </div>
            </ScrollArea>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
