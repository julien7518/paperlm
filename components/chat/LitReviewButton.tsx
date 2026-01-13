"use client";

import { Button } from "@/components/ui/button";
import { BookOpen, Loader2 } from "lucide-react";

interface LitReviewButtonProps {
  onGenerateLitReview: () => Promise<void>;
  isGenerating: boolean;
  hasDocuments: boolean;
  isModelReady: boolean;
}

export function LitReviewButton({
  onGenerateLitReview,
  isGenerating,
  hasDocuments,
  isModelReady,
}: LitReviewButtonProps) {
  return (
    <div className="sticky top-2">
      <div className="flex justify-center">
        <Button
          onClick={onGenerateLitReview}
          disabled={!isModelReady || isGenerating || !hasDocuments}
          variant="default"
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating Literature Review...
            </>
          ) : (
            <>
              <BookOpen className="mr-2 h-4 w-4" />
              Generate Literature Review
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
