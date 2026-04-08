const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, options);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Request failed: ${res.status}`);
  }
  return res.json();
}

export interface HealthResponse {
  status: string;
  database: string;
  ollama: string;
  version: string;
}

export interface DocumentUploadResponse {
  document_id: string;
  title: string;
  doc_type: string;
  chunks_created: number;
  status: string;
}

export interface DocumentListItem {
  id: string;
  title: string;
  doc_type: string;
  file_size_bytes: number | null;
  mime_type: string | null;
  page_count: number | null;
  ingested_at: string | null;
  created_at: string;
}

export interface AskSource {
  title: string;
  page: number | null;
  similarity: number;
}

export interface AskResponse {
  answer: string;
  sources: AskSource[];
  model_used: string;
  latency_ms: number;
}

export const api = {
  health: () => request<HealthResponse>("/health"),

  uploadDocument: (formData: FormData) =>
    request<DocumentUploadResponse>("/documents/upload", {
      method: "POST",
      body: formData,
    }),

  listDocuments: (propertyId: string) =>
    request<{ documents: DocumentListItem[]; total: number }>(
      `/documents?property_id=${propertyId}`
    ),

  ask: (question: string, propertyId: string) =>
    request<AskResponse>("/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, property_id: propertyId }),
    }),
};
