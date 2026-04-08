"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  FileText,
  Search,
  Filter,
  CheckCircle2,
  Loader2,
  File,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { api, type DocumentListItem } from "@/lib/api";

const DOC_TYPES = [
  { value: "all", label: "All Types" },
  { value: "warranty", label: "Warranty" },
  { value: "insurance", label: "Insurance" },
  { value: "hoa", label: "HOA" },
  { value: "closing", label: "Closing" },
  { value: "manual", label: "Manual" },
  { value: "other", label: "Other" },
];

const DOC_TYPE_COLORS: Record<string, string> = {
  warranty: "bg-emerald-500/10 text-emerald-500",
  insurance: "bg-blue-500/10 text-blue-500",
  hoa: "bg-violet-500/10 text-violet-500",
  closing: "bg-amber-500/10 text-amber-500",
  manual: "bg-cyan-500/10 text-cyan-500",
  other: "bg-gray-500/10 text-gray-500",
};

export default function DocumentsPage() {
  const [propertyId] = useState(() =>
    typeof window !== "undefined"
      ? localStorage.getItem("homebase_property_id") || ""
      : ""
  );
  const [documents, setDocuments] = useState<DocumentListItem[]>([]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<string | null>(null);

  // Upload state
  const [title, setTitle] = useState("");
  const [docType, setDocType] = useState("warranty");
  const [dragOver, setDragOver] = useState(false);

  const loadDocuments = useCallback(async () => {
    if (!propertyId) return;
    try {
      const res = await api.listDocuments(propertyId);
      setDocuments(res.documents);
    } catch {
      // silently fail — documents will show empty state
    }
  }, [propertyId]);

  const handleUpload = async (file: File) => {
    if (!propertyId || !title) return;
    setUploading(true);
    setUploadResult(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("property_id", propertyId);
    formData.append("doc_type", docType);
    formData.append("title", title);

    try {
      const res = await api.uploadDocument(formData);
      setUploadResult(`${res.chunks_created} chunks indexed`);
      setTitle("");
      loadDocuments();
    } catch (err) {
      setUploadResult(
        `Error: ${err instanceof Error ? err.message : "Upload failed"}`
      );
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file?.type === "application/pdf") {
      handleUpload(file);
    }
  };

  const filtered = documents.filter((d) => {
    if (filter !== "all" && d.doc_type !== filter) return false;
    if (search && !d.title.toLowerCase().includes(search.toLowerCase()))
      return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-2xl font-bold tracking-tight">Document Vault</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Upload, search, and manage your home documents
        </p>
      </motion.div>

      {/* Upload Area */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
        className={cn(
          "rounded-xl border-2 border-dashed p-6 transition-colors duration-200",
          dragOver
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/30"
        )}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-3 w-full">
            <div className="flex gap-3">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Document title"
                className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
              >
                {DOC_TYPES.filter((t) => t.value !== "all").map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <label className="flex items-center justify-center gap-2 rounded-lg border border-input bg-background px-4 py-3 text-sm text-muted-foreground hover:border-primary/30 transition-colors duration-150 cursor-pointer">
              <Upload className="h-4 w-4" />
              <span>Choose PDF or drag & drop</span>
              <input
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUpload(file);
                }}
                disabled={uploading || !propertyId || !title}
              />
            </label>
          </div>
        </div>
        <AnimatePresence>
          {(uploading || uploadResult) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 flex items-center gap-2 text-sm"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span className="text-muted-foreground">Processing...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span className="text-foreground">{uploadResult}</span>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Search & Filter */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search documents..."
            className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <div className="flex gap-1 rounded-lg border border-input bg-background p-0.5">
          {DOC_TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => setFilter(t.value)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors duration-150 cursor-pointer",
                filter === t.value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Document Grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {filtered.map((doc, i) => (
            <motion.div
              key={doc.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2, delay: i * 0.03 }}
              className="group rounded-xl border border-border bg-card p-4 transition-all duration-200 hover:shadow-md hover:border-primary/20 cursor-pointer"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <File className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{doc.title}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <span
                      className={cn(
                        "rounded-md px-2 py-0.5 text-[11px] font-medium",
                        DOC_TYPE_COLORS[doc.doc_type] || DOC_TYPE_COLORS.other
                      )}
                    >
                      {doc.doc_type}
                    </span>
                    {doc.page_count && (
                      <span className="text-[11px] text-muted-foreground">
                        {doc.page_count} pages
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {doc.ingested_at
                      ? new Date(doc.ingested_at).toLocaleDateString()
                      : "Processing..."}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Empty State */}
      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-3">
            <FileText className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">No documents found</p>
          <p className="text-xs text-muted-foreground mt-1">
            Upload your first document above to get started
          </p>
        </div>
      )}
    </div>
  );
}
