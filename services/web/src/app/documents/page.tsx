"use client";

import { useState, useCallback, useEffect } from "react";
import { usePropertyId } from "@/hooks/use-property-id";
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
  Trash2,
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
  { value: "inspection", label: "Inspection" },
  { value: "permit", label: "Permit" },
  { value: "receipt", label: "Receipt/Invoice" },
  { value: "other", label: "Other" },
];

// Map granular backend types to UI filter categories
function docTypeCategory(backendType: string): string {
  if (backendType.startsWith("hoa")) return "hoa";
  if (backendType.startsWith("insurance")) return "insurance";
  if (backendType.startsWith("closing")) return "closing";
  if (backendType === "inspection_report") return "inspection";
  if (backendType === "contractor_quote" || backendType === "invoice" || backendType === "receipt") return "receipt";
  return backendType;
}

const DOC_TYPE_COLORS: Record<string, string> = {
  warranty: "bg-emerald-500/10 text-emerald-500",
  insurance: "bg-blue-500/10 text-blue-500",
  insurance_policy: "bg-blue-500/10 text-blue-500",
  hoa: "bg-violet-500/10 text-violet-500",
  hoa_ccr: "bg-violet-500/10 text-violet-500",
  hoa_architectural: "bg-violet-500/10 text-violet-500",
  closing: "bg-amber-500/10 text-amber-500",
  closing_deed: "bg-amber-500/10 text-amber-500",
  closing_settlement: "bg-amber-500/10 text-amber-500",
  manual: "bg-cyan-500/10 text-cyan-500",
  inspection_report: "bg-teal-500/10 text-teal-500",
  permit: "bg-orange-500/10 text-orange-500",
  receipt: "bg-pink-500/10 text-pink-500",
  invoice: "bg-pink-500/10 text-pink-500",
  contractor_quote: "bg-pink-500/10 text-pink-500",
  other: "bg-gray-500/10 text-gray-500",
};

export default function DocumentsPage() {
  const { propertyId } = usePropertyId();
  const [documents, setDocuments] = useState<DocumentListItem[]>([]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>("Uploading...");
  const [uploadResult, setUploadResult] = useState<string | null>(null);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  // Upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [docType, setDocType] = useState("auto");
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

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const stageFile = (file: File) => {
    setSelectedFile(file);
    setUploadResult(null);
    // Auto-fill title from filename (strip extension)
    const name = file.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ");
    setTitle(name);
  };

  const handleProcess = async () => {
    if (!selectedFile || !propertyId || !title) return;
    setUploading(true);
    setUploadResult(null);
    setUploadStatus("Uploading file...");

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("property_id", propertyId);
    formData.append("doc_type", docType);
    formData.append("title", title);
    if (description) formData.append("description", description);

    const steps = [
      { msg: "Extracting text from PDF...", delay: 2000 },
      { msg: "Running OCR on scanned pages...", delay: 5000 },
      { msg: "Chunking and embedding text...", delay: 8000 },
      { msg: "Almost done — indexing chunks...", delay: 15000 },
    ];
    const timers = steps.map(({ msg, delay }) =>
      setTimeout(() => setUploadStatus(msg), delay)
    );

    try {
      const res = await api.uploadDocument(formData);
      timers.forEach(clearTimeout);
      const typeLabel = docType === "auto" ? ` (classified as ${res.doc_type})` : "";
      setUploadResult(`Done — ${res.chunks_created} chunks indexed${typeLabel}`);
      setTitle("");
      setDescription("");
      setSelectedFile(null);
      loadDocuments();
    } catch (err) {
      timers.forEach(clearTimeout);
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
      stageFile(file);
    }
  };

  const handleDelete = async (docId: string, docTitle: string) => {
    if (!confirm(`Delete "${docTitle}"?\n\nThis will remove the document, all embeddings, and entity links.`)) return;
    setDeletingIds((prev) => new Set(prev).add(docId));
    try {
      await api.deleteDocument(docId);
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
    } catch (err) {
      alert(`Failed to delete: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(docId);
        return next;
      });
    }
  };

  const filtered = documents.filter((d) => {
    if (filter !== "all" && docTypeCategory(d.doc_type) !== filter) return false;
    if (search && !d.title.toLowerCase().includes(search.toLowerCase()))
      return false;
    return true;
  });

  return (
    <div className="space-y-6 overflow-x-hidden">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Document Vault</h1>
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
          "rounded-xl border-2 border-dashed p-4 sm:p-6 transition-colors duration-200",
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
        <div className="flex-1 space-y-3 w-full">
          {/* Step 1: Choose file */}
          <label className={cn(
            "flex items-center justify-center gap-2 rounded-lg border border-input bg-background px-4 py-3 text-sm transition-colors duration-150 cursor-pointer",
            uploading ? "opacity-50 cursor-not-allowed" : "text-muted-foreground hover:border-primary/30"
          )}>
            <Upload className="h-4 w-4" />
            <span>{selectedFile ? selectedFile.name : "Choose PDF or drag & drop"}</span>
            <input
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (!propertyId) {
                  alert("Set your Property ID in Settings first!\n\nGo to Settings → paste your property UUID → click Save.");
                  return;
                }
                stageFile(file);
                e.target.value = "";
              }}
              disabled={uploading}
            />
          </label>

          {/* Step 2: Review details (shown after file is selected) */}
          {selectedFile && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="space-y-3"
            >
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Document title"
                  className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring min-h-[44px]"
                />
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer min-h-[44px]"
                >
                  <option value="auto">Auto-detect type</option>
                  {DOC_TYPES.filter((t) => t.value !== "all").map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional: describe what this document is about (helps AI classification)"
                rows={2}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleProcess}
                  disabled={uploading || !title}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors duration-150 cursor-pointer min-h-[44px]",
                    uploading || !title
                      ? "bg-muted text-muted-foreground cursor-not-allowed"
                      : "bg-primary text-primary-foreground hover:bg-primary/90"
                  )}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Process & Upload
                </button>
                <button
                  onClick={() => { setSelectedFile(null); setTitle(""); setDescription(""); setUploadResult(null); }}
                  disabled={uploading}
                  className="rounded-lg border border-input px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors duration-150 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          )}

          {!propertyId && !selectedFile && (
            <p className="text-xs text-destructive">Set your Property ID in Settings first.</p>
          )}
        </div>
        <AnimatePresence>
          {(uploading || uploadResult) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 space-y-2"
            >
              {uploading ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span className="text-muted-foreground">{uploadStatus}</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <motion.div
                      className="h-full bg-primary rounded-full"
                      initial={{ width: "5%" }}
                      animate={{ width: "90%" }}
                      transition={{ duration: 30, ease: "linear" }}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm">
                  {uploadResult?.startsWith("Error") ? (
                    <span className="text-destructive">{uploadResult}</span>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      <span className="text-foreground">{uploadResult}</span>
                    </>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Search & Filter */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search documents..."
            className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring min-h-[44px]"
          />
        </div>
        <div className="overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
          <div className="flex gap-1.5 sm:gap-1 w-max sm:w-auto sm:flex-wrap sm:rounded-lg sm:border sm:border-input sm:bg-background sm:p-0.5">
            {DOC_TYPES.map((t) => (
              <button
                key={t.value}
                onClick={() => setFilter(t.value)}
                className={cn(
                  "rounded-lg sm:rounded-md px-3 py-1.5 text-xs font-medium transition-colors duration-150 cursor-pointer whitespace-nowrap min-h-[36px]",
                  filter === t.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted sm:bg-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
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
              className={cn(
                "group relative rounded-xl border border-border bg-card p-4 transition-all duration-200 hover:shadow-md hover:border-primary/20",
                deletingIds.has(doc.id) && "opacity-50 pointer-events-none"
              )}
            >
              {deletingIds.has(doc.id) && (
                <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-background/60 z-10">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Deleting...</span>
                  </div>
                </div>
              )}
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
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {doc.ingested_at
                        ? new Date(doc.ingested_at).toLocaleDateString()
                        : "Processing..."}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(doc.id, doc.title);
                      }}
                      className="sm:opacity-0 sm:group-hover:opacity-100 rounded-md p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-150 cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
                      title="Delete document"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
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
