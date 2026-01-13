"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileText,
  ChevronUp,
  ChevronDown,
} from "lucide-react";

interface CollapsibleStatusCardProps {
  embeddingModelStatus: string;
  memoryStats: {
    documentCount: number;
    chunkCount: number;
    embeddingCount: number;
    totalChunkSize: number;
  };
}

export function CollapsibleStatusCard({
  embeddingModelStatus,
  memoryStats,
}: CollapsibleStatusCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Calculate memory usage percentage (capped at 100%)
  const memoryUsage = Math.min(
    Math.round((memoryStats.totalChunkSize / (1024 * 1024)) * 10), // 10MB max for visualization
    100
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            {embeddingModelStatus === "ready" ? (
              <CheckCircle2 className="size-4 text-green-500" />
            ) : embeddingModelStatus === "loading" ? (
              <Loader2 className="size-4 text-blue-500 animate-spin" />
            ) : (
              <AlertCircle className="size-4 text-red-500" />
            )}
            File System Status
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      {isExpanded && (
        <CardContent className="space-y-4">
          {/* Embedding Model Section */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Embedding Model
              </h3>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {embeddingModelStatus === "ready"
                  ? "Xenova/all-MiniLM-L6-v2"
                  : embeddingModelStatus === "loading"
                  ? "Loading model..."
                  : "Model failed to load"}
              </p>
              <div className="flex items-center gap-1">
                <span className="text-xs font-mono">
                  {embeddingModelStatus === "ready" ? (
                    <span className="text-green-500">● Ready</span>
                  ) : embeddingModelStatus === "loading" ? (
                    <span className="text-blue-500">● Loading</span>
                  ) : (
                    <span className="text-red-500">● Error</span>
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Memory Bank Section */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Memory Bank
              </h3>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Documents</p>
                <p className="text-xs font-mono">{memoryStats.documentCount}</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Chunks</p>
                <p className="text-xs font-mono">{memoryStats.chunkCount}</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Embeddings</p>
                <p className="text-xs font-mono">
                  {memoryStats.embeddingCount}
                </p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Storage</p>
                <p className="text-xs font-mono">
                  {Math.round(memoryStats.totalChunkSize / 1024)} KB
                </p>
              </div>
              {/* Memory usage visualization */}
              {memoryStats.totalChunkSize > 0 && (
                <div className="flex items-center gap-2 pt-1">
                  <div className="flex-1 h-1 bg-blue-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full"
                      style={{ width: `${memoryUsage}%` }}
                    ></div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {memoryUsage}%
                  </span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
