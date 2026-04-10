export function getApiBase(): string {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  if (typeof window !== "undefined") return `http://${window.location.hostname}:8000/api/v1`;
  return "http://localhost:8000/api/v1";
}

function getBase(): string {
  return getApiBase();
}

export interface PropertyItem {
  id: string;
  name: string;
  address_line1: string;
  city: string;
  state: string;
  zip_code: string;
  builder: string | null;
  purchase_date: string | null;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${getBase()}${path}`, options);
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
  document_id?: string;
  snippet?: string;
}

export interface AskResponse {
  answer: string;
  sources: AskSource[];
  model_used: string;
  latency_ms: number;
  confidence: string;
  intent?: string;
  safety_level?: string;
  conversation_id?: string;
}

export interface VisionAnalyzeResponse {
  answer: string;
  model_used: string;
  latency_ms: number;
  confidence: string;
}

export interface MessageItem {
  id: string;
  role: "user" | "assistant";
  content: string;
  intent: string | null;
  model_used: string | null;
  latency_ms: number | null;
  confidence: string | null;
  safety_level: string | null;
  sources?: AskSource[];
  created_at: string;
}

export interface ConversationItem {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
  last_message: string | null;
}

export interface ConversationDetail {
  id: string;
  title: string;
  created_at: string;
  messages: MessageItem[];
}

export interface MaintenanceTask {
  id: string;
  property_id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  system: string | null;
  room: string | null;
  due_date: string | null;
  completed_at: string | null;
  recurring: boolean;
  created_at: string;
}

export const api = {
  health: () => request<HealthResponse>("/health"),

  listProperties: () => request<PropertyItem[]>("/properties"),

  uploadDocument: (formData: FormData) =>
    request<DocumentUploadResponse>("/documents/upload", {
      method: "POST",
      body: formData,
    }),

  listDocuments: (propertyId: string) =>
    request<{ documents: DocumentListItem[]; total: number }>(
      `/documents?property_id=${propertyId}`
    ),

  deleteDocument: (documentId: string) =>
    request<{ status: string; document_id: string }>(`/documents/${documentId}`, {
      method: "DELETE",
    }),

  // ─── Conversations (threads) ──────────────────────────────────────
  listConversations: (propertyId: string, limit = 50) =>
    request<{ conversations: ConversationItem[]; total: number }>(
      `/conversations?property_id=${propertyId}&limit=${limit}`
    ),

  getConversation: (conversationId: string) =>
    request<ConversationDetail>(`/conversations/${conversationId}`),

  deleteConversation: (conversationId: string) =>
    request<{ status: string }>(`/conversations/${conversationId}`, { method: "DELETE" }),

  renameConversation: (conversationId: string, title: string) =>
    request<{ status: string; id: string; title: string }>(`/conversations/${conversationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    }),

  clearConversations: (propertyId: string) =>
    request<{ status: string; deleted: number }>(`/conversations?property_id=${propertyId}`, { method: "DELETE" }),

  // ─── Ask (with optional conversation_id for follow-ups) ───────────
  ask: (question: string, propertyId: string, conversationId?: string) =>
    request<AskResponse>("/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question,
        property_id: propertyId,
        conversation_id: conversationId || null,
      }),
    }),

  askStream: async function* (question: string, propertyId: string, conversationId?: string) {
    const res = await fetch(`${getBase()}/ask/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question,
        property_id: propertyId,
        conversation_id: conversationId || null,
      }),
    });
    if (!res.ok || !res.body) throw new Error("Stream failed");

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = JSON.parse(line.slice(6));
          yield data as {
            token: string;
            done: boolean;
            error?: string;
            sources?: AskSource[];
            model_used?: string;
            latency_ms?: number;
            confidence?: string;
            intent?: string;
            safety_level?: string;
            conversation_id?: string;
          };
        }
      }
    }
  },

  // ─── Maintenance ──────────────────────────────────────────────────
  listMaintenanceTasks: (propertyId: string, filters?: { status?: string; priority?: string }) => {
    const params = new URLSearchParams({ property_id: propertyId });
    if (filters?.status) params.set("status", filters.status);
    if (filters?.priority) params.set("priority", filters.priority);
    return request<{ tasks: MaintenanceTask[]; total: number }>(`/maintenance/tasks?${params}`);
  },

  createMaintenanceTask: (task: { property_id: string; title: string; description?: string; priority?: string; system?: string; due_date?: string }) =>
    request<MaintenanceTask>("/maintenance/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(task),
    }),

  updateMaintenanceTask: (taskId: string, update: { status?: string; title?: string; priority?: string; due_date?: string }) =>
    request<MaintenanceTask>(`/maintenance/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(update),
    }),

  deleteMaintenanceTask: (taskId: string) =>
    request<{ status: string }>(`/maintenance/tasks/${taskId}`, { method: "DELETE" }),

  // ─── System ───────────────────────────────────────────────────────
  systemStatus: () => request<{
    version: string;
    uptime_seconds: number;
    database: { status: string; size: string | null };
    ollama: { status: string; models: string[] };
    disk: { total_gb: number; used_gb: number; free_gb: number; percent_used: number };
    usage: { documents: number; conversations: number; ai_runs: number; audit_events: number };
  }>("/system/status"),

  systemResources: () => request<{
    host: { cpu_percent: number; cpu_count: number; memory_total_gb: number; memory_used_gb: number; memory_percent: number };
    services: { name: string; pid: number; cpu_percent: number; memory_mb: number }[];
  }>("/system/resources"),

  seedMaintenanceTasks: (propertyId: string) =>
    request<{ preset: string; season: string; tasks_created: number }>(
      `/maintenance/seed-from-preset?property_id=${propertyId}`,
      { method: "POST" },
    ),

  // ─── Vision ───────────────────────────────────────────────────────
  analyzeImage: async (file: File, question: string, propertyId: string): Promise<VisionAnalyzeResponse> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("question", question);
    formData.append("property_id", propertyId);
    return request<VisionAnalyzeResponse>("/vision/analyze", {
      method: "POST",
      body: formData,
    });
  },
};
