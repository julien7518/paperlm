"use client";

import { ModelSelector } from "./ModelSelector";
import { SettingsSlider } from "./SettingSlider";
import { MaxTokensInput } from "./MaxTokensInput";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";

interface SidebarContentProps {
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

export function SidebarContent({
  model,
  onChangeModel,
  temperature,
  onChangeTemperature,
  topP,
  onChangeTopP,
  status,
  onClear,
  onExport,
  hasMessages,
  systemPrompt,
  onChangeSystemPrompt,
}: SidebarContentProps) {
  return (
    <>
      <ModelSelector model={model} onChange={onChangeModel} status={status} />

      <div className="space-y-4">
        <SettingsSlider
          label="Temperature"
          defaultValue={temperature}
          min={0}
          max={2}
          step={0.01}
          onChange={onChangeTemperature}
        />
        <SettingsSlider
          label="Top P"
          defaultValue={topP}
          min={0.01}
          max={1}
          step={0.01}
          onChange={onChangeTopP}
        />
        <MaxTokensInput />
      </div>

      <Accordion type="single" collapsible>
        <AccordionItem value="system-prompt">
          <AccordionTrigger className="text-sm">System Prompt</AccordionTrigger>
          <AccordionContent>
            <Textarea
              value={systemPrompt}
              onChange={(e) => onChangeSystemPrompt(e.target.value)}
              placeholder="Enter system prompt for the LLM..."
              className="min-h-[120px] text-xs resize-none"
            />
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <div className="mt-auto space-y-2">
        {hasMessages ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="w-full">
                Clear chat
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear chat history?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. All messages will be deleted.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onClear}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : (
          <Button variant="outline" disabled className="w-full">
            Clear chat
          </Button>
        )}

        {hasMessages ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="w-full">
                Export JSON
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Export messages?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will download your conversation as a JSON file.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onExport}>Export</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : (
          <Button variant="outline" disabled className="w-full">
            Export JSON
          </Button>
        )}
      </div>
    </>
  );
}
