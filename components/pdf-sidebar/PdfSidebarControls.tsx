"use client";

import { useState } from "react";
import { PdfSidebarContent } from "./PdfSidebarContent";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
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
}

export function PdfSidebarControls({
  onFileUpload,
  uploadedFiles,
  onRemoveFile,
}: PdfSidebarProps) {
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <>
      {/* Desktop Sidebar - hidden on mobile */}
      <div className="hidden lg:flex h-full w-72 border-r border-border p-4 flex-col gap-6 bg-background">
        <PdfSidebarContent
          onFileUpload={onFileUpload}
          uploadedFiles={uploadedFiles}
          onRemoveFile={onRemoveFile}
        />
      </div>

      {/* Mobile Menu Button - shown only on mobile */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button size="icon" variant="outline">
              <Menu className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-80 p-4">
            <SheetHeader>
              <SheetTitle>PDF Documents</SheetTitle>
            </SheetHeader>
            <div className="mt-6 flex flex-col gap-6 h-full">
              <PdfSidebarContent
                onFileUpload={onFileUpload}
                uploadedFiles={uploadedFiles}
                onRemoveFile={onRemoveFile}
              />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
