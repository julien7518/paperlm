"use client";

import { ModelSelector } from "./ModelSelector";
import { SettingsSlider } from "./SettingSlider";
import { MaxTokensInput } from "./MaxTokensInput";
import { Button } from "@/components/ui/button";
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
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";

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
}

export function SidebarControls({
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
}: SidebarProps) {
  return (
    <div className="h-full w-72 border-l border-border p-4 flex flex-col gap-6 bg-background">
      <ModelSelector model={model} onChange={onChangeModel} status={status} />

      <div className="space-y-4">
        <SettingsSlider
          label="Temperature"
          defaultValue={temperature}
          min={0}
          max={1}
          step={0.01}
          onChange={onChangeTemperature}
        />
        <SettingsSlider
          label="Top P"
          defaultValue={topP}
          min={0}
          max={1}
          step={0.01}
          onChange={onChangeTopP}
        />
        <MaxTokensInput />
      </div>

      <Collapsible>
        <CollapsibleTrigger className="text-sm text-muted-foreground">
          System Prompt ▼
        </CollapsibleTrigger>
        <CollapsibleContent className="text-xs p-2 border rounded-md mt-2">
          Academic research assistant prompt will be shown here.
        </CollapsibleContent>
      </Collapsible>

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
                <AlertDialogTitle>Clear chat ?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will remove all messages from the current conversation.
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => onClear()}>
                  Clear
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : (
          <Button variant="outline" disabled className="w-full" aria-disabled>
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
                <AlertDialogTitle>Export conversation?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will download the current conversation as a JSON file.
                  You can keep a local copy for records.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => onExport()}>
                  Export
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : (
          <Button variant="outline" disabled className="w-full" aria-disabled>
            Export JSON
          </Button>
        )}
      </div>
    </div>
  );
}
