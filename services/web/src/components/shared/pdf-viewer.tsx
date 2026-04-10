"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, FileText, ExternalLink, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { getApiBase } from "@/lib/api";

interface PdfViewerProps {
  documentId: string;
  title: string;
  page: number | null;
  snippet: string;
  onClose: () => void;
}

export function PdfViewer({ documentId, title, page, snippet, onClose }: PdfViewerProps) {
  const pdfUrl = `${getApiBase()}/documents/${documentId}/file`;
  // PDF.js viewer with page parameter
  const viewerUrl = page ? `${pdfUrl}#page=${page}` : pdfUrl;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          className="relative flex flex-col w-full max-w-5xl h-[85vh] rounded-2xl border border-border bg-card shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-5 py-3 bg-card">
            <div className="flex items-center gap-3 min-w-0">
              <FileText className="h-5 w-5 text-primary shrink-0" />
              <div className="min-w-0">
                <h3 className="text-sm font-semibold truncate">{title}</h3>
                {page && (
                  <p className="text-xs text-muted-foreground">Page {page}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={viewerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg p-2 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                title="Open in new tab"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
              <button
                onClick={onClose}
                className="rounded-lg p-2 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Content: PDF + Snippet side by side */}
          <div className="flex flex-1 overflow-hidden">
            {/* PDF embed */}
            <div className="flex-1 bg-muted">
              <iframe
                src={viewerUrl}
                className="w-full h-full border-0"
                title={`PDF: ${title}`}
              />
            </div>

            {/* Snippet panel */}
            {snippet && (
              <div className="w-80 border-l border-border bg-card overflow-y-auto">
                <div className="p-4 space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Matched Text
                  </h4>
                  <div className="rounded-lg bg-primary/5 border border-primary/10 p-3">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">
                      {snippet}
                    </p>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    This is the text chunk that matched your question. The PDF is opened to the relevant page.
                  </p>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
