"use client";

import { useState } from "react";
import { BookOpen, ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "../ui/badge";

interface CitationBadgeProps {
  citation: {
    source: string;
    chunkId: string;
    content?: string;
  };
  index: number;
}

export function CitationBadge({ citation, index }: CitationBadgeProps) {
  const [expanded, setExpanded] = useState(false);
  
  // Extract clean filename without timestamps
  const cleanSource = citation.source
    .replace(/doc_/, "")
    .replace(/_\d+$/, "")
    .replace(/_/g, " ");

  return (
    <div className="w-full">
      <div className="flex items-center gap-2 mb-2">
        <Badge 
          variant="secondary"
          className="bg-blue-100 hover:bg-blue-200 text-blue-800 border border-blue-200 cursor-pointer flex items-center gap-1"
          onClick={() => setExpanded(!expanded)}
        >
          <BookOpen className="h-3 w-3" />
          <span className="font-medium">[{index + 1}]</span>
          <span>{cleanSource}</span>
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </Badge>
      </div>

      {expanded && citation.content && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3 ml-6 mb-3">
          <div className="text-xs text-blue-600 italic mb-1">
            Chunk ID: {citation.chunkId}
          </div>
          <div className="text-sm text-blue-800">
            <span className="font-medium">Excerpt: </span>
            <span className="text-blue-700">"{citation.content}"</span>
          </div>
        </div>
      )}
    </div>
  );
}