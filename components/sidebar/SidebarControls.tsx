"use client";

import { useState } from "react";
import { SidebarContent } from "./SidebarContent";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface SidebarProps {
  model: string;
  onChangeModel: (m: string) => void;
  temperature: number;
  onChangeTemperature: (v: number) => void;
  topP: number;
  onChangeTopP: (v: number) => void;
  status: string;
  onClear: () => void;
  onExport: () => void;
  hasMessages: boolean;
  systemPrompt: string;
  onChangeSystemPrompt: (prompt: string) => void;
}

export function SidebarControls(props: SidebarProps) {
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <>
      {/* Desktop Sidebar - hidden on mobile */}
      <div className="hidden lg:flex h-full w-72 border-l border-border p-4 flex-col gap-6 bg-background">
        <SidebarContent {...props} />
      </div>

      {/* Mobile Menu Button - shown only on mobile */}
      <div className="lg:hidden fixed top-4 right-4 z-50">
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button size="icon" variant="outline">
              <Menu className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-80 p-4">
            <SheetHeader>
              <SheetTitle>Settings</SheetTitle>
            </SheetHeader>
            <div className="mt-6 flex flex-col gap-6 h-full">
              <SidebarContent {...props} />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
