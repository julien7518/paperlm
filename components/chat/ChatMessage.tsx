"use client";

import { cn } from "@/lib/utils";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check, CornerUpLeft } from "lucide-react";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { toast } from "sonner";

import { marked } from "marked";
import DOMPurify from "dompurify";
import hljs from "highlight.js";
import "highlight.js/styles/github.css";
import katex from "katex";
import "katex/dist/katex.min.css";

marked.setOptions({
  gfm: true,
  breaks: true,
});

marked.use({
  hooks: {
    preprocess(markdown: string) {
      markdown = markdown.replace(
        /```latex\s+([\s\S]*?)```/g,
        (_, math) => `$$${math.trim()}$$`
      );

      return markdown;
    },
  },
  renderer: {
    code({ text, lang }: { text: string; lang?: string }) {
      if (lang && hljs.getLanguage(lang)) {
        const highlighted = hljs.highlight(text, { language: lang }).value;
        return `<pre><code class="language-${lang} hljs">${highlighted}</code></pre>`;
      }
      const highlighted = hljs.highlightAuto(text).value;
      return `<pre><code class="hljs">${highlighted}</code></pre>`;
    },
  } as any,
});

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
  onReply?: (content: string) => void;
}

export function ChatMessage({
  role,
  content,
  isStreaming,
  onReply,
}: ChatMessageProps) {
  const [copied, setCopied] = useState(false);

  const renderedHtml = useMemo(() => {
    let raw = marked.parse(content, { async: false }) as string;

    // 1️⃣ Transforme les $inline$ math en span pour KaTeX
    raw = raw.replace(
      /\$(.+?)\$/g,
      (_, math) => `<span class="inline-math" data-math="${math}"></span>`
    );

    // 2️⃣ Render KaTeX pour inline math
    const withKatex = raw.replace(
      /<span class="inline-math" data-math="([^"]+)"><\/span>/g,
      (_, math) => {
        try {
          return katex.renderToString(math, {
            throwOnError: false,
            displayMode: false,
          });
        } catch {
          return `<span class="text-red-500">Error: ${math}</span>`;
        }
      }
    );

    // 3️⃣ Render KaTeX pour display math $$...$$
    const withDisplayMath = withKatex.replace(
      /\$\$([\s\S]+?)\$\$/g,
      (_, math) => {
        try {
          const html = katex.renderToString(math, {
            throwOnError: false,
            displayMode: true,
          });
          return `<div class="my-2 overflow-x-auto">${html}</div>`;
        } catch {
          return `<div class="text-red-500">Error: ${math}</div>`;
        }
      }
    );

    // 4️⃣ Nettoyage avec DOMPurify
    const clean = DOMPurify.sanitize(withDisplayMath, {
      ALLOWED_TAGS: [
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
        "p",
        "br",
        "strong",
        "em",
        "u",
        "s",
        "code",
        "pre",
        "blockquote",
        "ul",
        "ol",
        "li",
        "table",
        "thead",
        "tbody",
        "tr",
        "th",
        "td",
        "a",
        "img",
        "span",
        "div",
        "hr",
        "sub",
        "sup",
      ],
      ALLOWED_ATTR: ["class", "style", "href", "src", "alt", "title", "data-*"],
    });

    return clean;
  }, [content]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Copy failed: ${msg}`);
    }
  };
  return (
    <div className="w-full max-w-2xl mx-auto mb-3">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <Avatar className="h-6 w-6 flex-shrink-0 mt-3">
            <AvatarFallback
              className={
                role === "user"
                  ? "bg-primary text-primary-foreground text-xs font-semibold"
                  : "bg-muted text-muted-foreground text-xs font-semibold"
              }
            >
              {role === "user" ? "Me" : "Ai"}
            </AvatarFallback>
          </Avatar>
        </div>
        <div className="flex-1">
          <div
            className={cn(
              "px-4 py-3 rounded-lg",
              role === "user"
                ? "bg-primary/10 border border-primary/20"
                : "bg-muted border border-border"
            )}
          >
            <div
              className={`
                max-w-none text-sm space-y-2

                [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mt-4 [&_h1]:mb-2
                [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-3 [&_h2]:mb-2
                [&_h3]:text-lg [&_h3]:font-bold [&_h3]:mt-2 [&_h3]:mb-1

                [&_p]:leading-relaxed
                [&_strong]:font-bold
                [&_em]:italic
                [&_u]:underline

                [&_code]:bg-neutral-800 [&_code]:text-neutral-100 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs
                [&_pre]:bg-neutral-900 [&_pre]:text-neutral-100 [&_pre]:p-4 [&_pre]:rounded-lg [&_pre]:overflow-x-auto
                [&_pre_code]:bg-transparent [&_pre_code]:text-inherit [&_pre_code]:p-0

                [&_blockquote]:border-l-4 [&_blockquote]:border-neutral-500 [&_blockquote]:pl-4 [&_blockquote]:italic

                [&_ul]:list-disc [&_ul]:list-inside
                [&_ol]:list-decimal [&_ol]:list-inside
                [&_li]:ml-2

                [&_a]:text-blue-500 [&_a]:underline [&_a:hover]:text-blue-600

                [&_table]:border-collapse [&_table]:border [&_table]:border-neutral-600
                [&_th]:border [&_th]:border-neutral-600 [&_th]:bg-neutral-800 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left
                [&_td]:border [&_td]:border-neutral-600 [&_td]:px-3 [&_td]:py-2

                [&_hr]:my-4 [&_hr]:border-neutral-600

                .katex-display]:my-3
              `}
              dangerouslySetInnerHTML={{ __html: renderedHtml }}
            />

            {isStreaming && (
              <div className="mt-2 text-xs opacity-70 flex items-center gap-2">
                <span className="animate-pulse">●</span> Thinking…
              </div>
            )}
          </div>

          <div
            className={
              "flex items-center " +
              (role === "assistant" ? "justify-start" : "justify-end")
            }
          >
            <div
              className={
                role === "assistant"
                  ? "mr-auto flex-row-reverse flex items-center"
                  : "flex items-center"
              }
            >
              {onReply && (
                <Button
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => onReply(content)}
                  aria-label={
                    role === "assistant"
                      ? "Reply to assistant"
                      : "Reply to message"
                  }
                >
                  <CornerUpLeft className="size-3" />
                </Button>
              )}

              <Button
                variant="ghost"
                size="icon-sm"
                onClick={handleCopy}
                aria-label={
                  role === "assistant"
                    ? "Copy assistant message"
                    : "Copy message"
                }
              >
                {copied ? (
                  <Check className="size-3" />
                ) : (
                  <Copy className="size-3" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
