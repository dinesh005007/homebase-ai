"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Bot,
  User,
  FileText,
  Loader2,
  AlertTriangle,
  ShieldCheck,
  Plus,
  MessageSquare,
  Trash2,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  Search,
  Pencil,
  X,
} from "lucide-react";
import { cn, generateId } from "@/lib/utils";
import {
  api,
  type AskSource,
  type ConversationItem,
  type MessageItem,
} from "@/lib/api";
import { usePropertyId } from "@/hooks/use-property-id";
import { PdfViewer } from "@/components/shared/pdf-viewer";

// ─── Types ────────────────────────────────────────────────────────────
interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: AskSource[];
  model?: string;
  latency?: number;
  confidence?: string;
  intent?: string;
  safety_level?: string;
}

interface ViewerState {
  documentId: string;
  title: string;
  page: number | null;
  snippet: string;
}

// ─── Markdown-like renderer ───────────────────────────────────────────
function renderContent(text: string) {
  const parts = text.split(/(```[\s\S]*?```)/g);
  return parts.map((part, i) => {
    if (part.startsWith("```")) {
      const lines = part.slice(3, -3).split("\n");
      const lang = lines[0]?.trim() || "";
      const code = lang ? lines.slice(1).join("\n") : lines.join("\n");
      return <CodeBlock key={i} code={code} language={lang} />;
    }
    let rendered = part.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    rendered = rendered.replace(
      /`([^`]+)`/g,
      '<code class="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">$1</code>'
    );
    rendered = rendered.replace(
      /\[Source:\s*([^\]]+)\]/g,
      '<span class="text-primary font-medium">[Source: $1]</span>'
    );
    return (
      <span
        key={i}
        className="leading-relaxed"
        dangerouslySetInnerHTML={{ __html: rendered }}
      />
    );
  });
}

function CodeBlock({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="my-2 rounded-lg border border-border overflow-hidden">
      <div className="flex items-center justify-between bg-muted px-3 py-1.5">
        <span className="text-[11px] font-mono text-muted-foreground">
          {language || "text"}
        </span>
        <button
          onClick={copy}
          className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-emerald-500" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
      <pre className="overflow-x-auto p-3 text-xs font-mono bg-card">
        <code>{code}</code>
      </pre>
    </div>
  );
}

// ─── Conversation sidebar item ────────────────────────────────────────
function ConvItem({
  conv,
  isActive,
  onClick,
  onDelete,
  onRename,
}: {
  conv: ConversationItem;
  isActive: boolean;
  onClick: () => void;
  onDelete: () => void;
  onRename: (title: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(conv.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const save = () => {
    const trimmed = editTitle.trim();
    if (trimmed && trimmed !== conv.title) onRename(trimmed);
    setEditing(false);
  };

  return (
    <div
      onClick={() => !editing && onClick()}
      className={cn(
        "group flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors duration-150",
        isActive
          ? "bg-accent text-accent-foreground"
          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
        !editing && "cursor-pointer"
      )}
    >
      <MessageSquare className="h-4 w-4 shrink-0" />
      {editing ? (
        <input
          ref={inputRef}
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") setEditing(false);
          }}
          className="flex-1 min-w-0 bg-transparent border-b border-primary/50 text-sm focus:outline-none"
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <div className="flex-1 min-w-0">
          <span className="block truncate">{conv.title}</span>
          {conv.message_count > 2 && (
            <span className="text-[10px] text-muted-foreground">
              {Math.floor(conv.message_count / 2)} messages
            </span>
          )}
        </div>
      )}
      {!editing && (
        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-all">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setEditTitle(conv.title);
              setEditing(true);
            }}
            className="rounded p-0.5 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <Pencil className="h-3 w-3" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="rounded p-0.5 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Suggested prompts ────────────────────────────────────────────────
const SUGGESTIONS = [
  "Can I do short term rental?",
  "What does my warranty cover?",
  "What is my insurance deductible?",
  "What are the HOA architectural guidelines?",
  "When does my builder warranty expire?",
  "What are the parking rules?",
];

// ─── Main Component ───────────────────────────────────────────────────
export default function AskPage() {
  const { propertyId } = usePropertyId();

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Conversation thread tracking
  const [activeConvId, setActiveConvId] = useState<string | null>(null);

  // Sidebar state
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [sidebarSearch, setSidebarSearch] = useState("");
  const [convsLoading, setConvsLoading] = useState(false);

  // PDF viewer
  const [viewer, setViewer] = useState<ViewerState | null>(null);

  // Load conversation list
  const loadConversations = useCallback(async () => {
    if (!propertyId) return;
    setConvsLoading(true);
    try {
      const res = await api.listConversations(propertyId, 100);
      setConversations(res.conversations);
    } catch {
      // fail silently
    } finally {
      setConvsLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  // Focus input on new chat
  useEffect(() => {
    if (!activeConvId) inputRef.current?.focus();
  }, [activeConvId]);

  // ─── Actions ──────────────────────────────────────────────────────
  const newChat = () => {
    setMessages([]);
    setActiveConvId(null);
    setInput("");
    inputRef.current?.focus();
  };

  const loadConversation = async (conv: ConversationItem) => {
    setActiveConvId(conv.id);
    try {
      const detail = await api.getConversation(conv.id);
      const msgs: ChatMessage[] = detail.messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        sources: m.sources as AskSource[] | undefined,
        model: m.model_used || undefined,
        latency: m.latency_ms || undefined,
        confidence: m.confidence || undefined,
        intent: m.intent || undefined,
        safety_level: m.safety_level || undefined,
      }));
      setMessages(msgs);
    } catch {
      // fail silently
    }
  };

  const deleteConversation = async (id: string) => {
    try {
      await api.deleteConversation(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeConvId === id) newChat();
    } catch {
      // fail silently
    }
  };

  const renameConversation = async (id: string, title: string) => {
    try {
      await api.renameConversation(id, title);
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, title } : c))
      );
    } catch {
      // fail silently
    }
  };

  const clearAll = async () => {
    if (!propertyId) return;
    if (!confirm("Delete all conversation history?")) return;
    try {
      await api.clearConversations(propertyId);
      setConversations([]);
      newChat();
    } catch {
      // fail silently
    }
  };

  const openSource = (src: AskSource) => {
    if (!src.document_id) return;
    setViewer({
      documentId: src.document_id,
      title: src.title,
      page: src.page,
      snippet: src.snippet || "",
    });
  };

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  // ─── Submit ───────────────────────────────────────────────────────
  const handleSubmit = async (question?: string) => {
    const q = (question || input).trim();
    if (!q || !propertyId || loading) return;

    const userMsg: ChatMessage = { id: generateId(), role: "user", content: q };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    const assistantId = generateId();
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: "assistant", content: "" },
    ]);

    try {
      let fullContent = "";
      let metadata: Partial<ChatMessage> = {};
      let newConvId = activeConvId;

      for await (const chunk of api.askStream(
        q,
        propertyId,
        activeConvId || undefined
      )) {
        if (!chunk.done) {
          fullContent += chunk.token;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: fullContent } : m
            )
          );
        } else if (chunk.error) {
          fullContent = `Error: ${chunk.error}`;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: fullContent } : m
            )
          );
        } else {
          metadata = {
            sources: chunk.sources,
            model: chunk.model_used,
            latency: chunk.latency_ms,
            confidence: chunk.confidence,
            intent: chunk.intent,
            safety_level: chunk.safety_level,
          };
          // Capture conversation_id from response (new thread created by backend)
          if (chunk.conversation_id) {
            newConvId = chunk.conversation_id;
          }
        }
      }

      setMessages((prev) =>
        prev.map((m) => (m.id === assistantId ? { ...m, ...metadata } : m))
      );

      // Track the conversation thread for follow-ups
      if (newConvId && newConvId !== activeConvId) {
        setActiveConvId(newConvId);
      }

      // Refresh sidebar
      loadConversations();
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                content:
                  err instanceof Error ? err.message : "Something went wrong.",
              }
            : m
        )
      );
    } finally {
      setLoading(false);
    }
  };

  const regenerate = () => {
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUserMsg) return;
    setMessages((prev) => prev.slice(0, -1));
    handleSubmit(lastUserMsg.content);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSubmit();
  };

  // Filter conversations
  const filteredConvs = sidebarSearch
    ? conversations.filter((c) =>
        c.title.toLowerCase().includes(sidebarSearch.toLowerCase())
      )
    : conversations;

  // Group conversations by date
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  const groups: { label: string; convs: ConversationItem[] }[] = [];
  const todayConvs = filteredConvs.filter(
    (c) => new Date(c.updated_at).toDateString() === today
  );
  const yesterdayConvs = filteredConvs.filter(
    (c) => new Date(c.updated_at).toDateString() === yesterday
  );
  const olderConvs = filteredConvs.filter(
    (c) =>
      new Date(c.updated_at).toDateString() !== today &&
      new Date(c.updated_at).toDateString() !== yesterday
  );
  if (todayConvs.length) groups.push({ label: "Today", convs: todayConvs });
  if (yesterdayConvs.length)
    groups.push({ label: "Yesterday", convs: yesterdayConvs });
  if (olderConvs.length) groups.push({ label: "Previous", convs: olderConvs });

  return (
    <div className="flex h-[calc(100vh-3rem)] -m-6">
      {/* ─── Sidebar ─────────────────────────────────────────────── */}
      <div className="flex w-64 flex-col border-r border-border bg-card">
        {/* New Chat */}
        <div className="p-3 border-b border-border">
          <button
            onClick={newChat}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 py-2.5 text-sm font-medium hover:bg-accent transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            New Chat
          </button>
        </div>

        {/* Search */}
        <div className="px-3 pt-3 pb-1">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={sidebarSearch}
              onChange={(e) => setSidebarSearch(e.target.value)}
              placeholder="Search chats..."
              className="w-full rounded-md border border-input bg-background pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-3">
          {convsLoading && conversations.length === 0 && (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          )}
          {groups.map((group) => (
            <div key={group.label}>
              <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {group.label}
              </p>
              {group.convs.map((conv) => (
                <ConvItem
                  key={conv.id}
                  conv={conv}
                  isActive={activeConvId === conv.id}
                  onClick={() => loadConversation(conv)}
                  onDelete={() => deleteConversation(conv.id)}
                  onRename={(title) => renameConversation(conv.id, title)}
                />
              ))}
            </div>
          ))}
          {!convsLoading && conversations.length === 0 && (
            <p className="px-3 py-8 text-center text-xs text-muted-foreground">
              No conversations yet
            </p>
          )}
        </div>

        {/* Sidebar Footer */}
        {conversations.length > 0 && (
          <div className="border-t border-border p-3">
            <button
              onClick={clearAll}
              className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
            >
              <Trash2 className="h-3 w-3" />
              Clear all chats
            </button>
          </div>
        )}
      </div>

      {/* ─── Main Chat Area ──────────────────────────────────────── */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h1 className="text-sm font-semibold">HomeBase AI</h1>
              <p className="text-[11px] text-muted-foreground">
                {activeConvId
                  ? conversations.find((c) => c.id === activeConvId)?.title ||
                    "Chat"
                  : "Ask about your home documents"}
              </p>
            </div>
          </div>
          {!propertyId && (
            <span className="text-xs text-amber-500">
              Loading property...
            </span>
          )}
        </div>

        {/* Messages Area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            // Empty state
            <div className="flex flex-col items-center justify-center h-full px-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-5">
                <Bot className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-lg font-semibold">
                What can I help you with?
              </h2>
              <p className="text-sm text-muted-foreground mt-1 max-w-md text-center">
                Ask about your HOA rules, warranty coverage, insurance details,
                or any uploaded document.
              </p>
              <div className="mt-8 grid grid-cols-2 gap-2 max-w-lg w-full">
                {SUGGESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => handleSubmit(q)}
                    disabled={loading || !propertyId}
                    className="rounded-xl border border-border bg-card px-4 py-3 text-left text-xs text-muted-foreground hover:border-primary/30 hover:text-foreground hover:bg-accent/50 transition-all duration-150 cursor-pointer disabled:opacity-50"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            // Message list
            <div className="max-w-3xl mx-auto px-6 py-6 space-y-6">
              <AnimatePresence mode="popLayout">
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className="group"
                  >
                    <div
                      className={cn(
                        "flex gap-3",
                        msg.role === "user" ? "flex-row-reverse" : ""
                      )}
                    >
                      <div
                        className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-primary/10"
                        )}
                      >
                        {msg.role === "user" ? (
                          <User className="h-4 w-4" />
                        ) : (
                          <Bot className="h-4 w-4 text-primary" />
                        )}
                      </div>

                      <div
                        className={cn(
                          "flex-1 min-w-0",
                          msg.role === "user" ? "text-right" : ""
                        )}
                      >
                        <div
                          className={cn(
                            "inline-block rounded-2xl px-4 py-3 text-sm",
                            msg.role === "user"
                              ? "bg-primary text-primary-foreground text-left"
                              : "bg-card border border-border text-left"
                          )}
                        >
                          <div className="whitespace-pre-wrap">
                            {msg.role === "assistant"
                              ? renderContent(msg.content)
                              : msg.content}
                          </div>

                          {/* Sources */}
                          {msg.sources && msg.sources.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-border/50 flex flex-wrap gap-1.5">
                              {msg.sources.map((src, i) => (
                                <button
                                  key={i}
                                  onClick={() => openSource(src)}
                                  className={cn(
                                    "inline-flex items-center gap-1 rounded-md bg-accent px-2 py-1 text-[11px] font-medium text-accent-foreground transition-colors duration-150",
                                    src.document_id
                                      ? "hover:bg-primary/10 hover:text-primary cursor-pointer"
                                      : "cursor-default"
                                  )}
                                  title={
                                    src.document_id
                                      ? "View source in PDF"
                                      : undefined
                                  }
                                >
                                  <FileText className="h-3 w-3" />
                                  {src.title}
                                  {src.page != null && `, p.${src.page}`}
                                  <span className="text-muted-foreground ml-1">
                                    {(src.similarity * 100).toFixed(0)}%
                                  </span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Meta + Actions */}
                        {msg.role === "assistant" && msg.model && (
                          <div className="mt-1.5 flex items-center gap-1.5 px-1">
                            {msg.confidence === "low" && (
                              <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-500">
                                <AlertTriangle className="h-2.5 w-2.5" />
                                Low confidence
                              </span>
                            )}
                            {msg.confidence === "high" && (
                              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-500">
                                <ShieldCheck className="h-2.5 w-2.5" />
                                Verified
                              </span>
                            )}
                            <span className="text-[10px] text-muted-foreground">
                              {msg.model} &middot; {msg.latency}ms
                            </span>

                            {/* Action buttons */}
                            <div className="ml-auto opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity">
                              <button
                                onClick={() => copyMessage(msg.content)}
                                className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                                title="Copy response"
                              >
                                <Copy className="h-3 w-3" />
                              </button>
                              <button
                                onClick={regenerate}
                                className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                                title="Regenerate"
                              >
                                <RotateCcw className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Typing indicator */}
              {loading &&
                messages[messages.length - 1]?.content === "" && (
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex items-center gap-1.5 rounded-2xl bg-card border border-border px-4 py-3">
                      <span className="flex gap-1">
                        <span
                          className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce"
                          style={{ animationDelay: "0ms" }}
                        />
                        <span
                          className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce"
                          style={{ animationDelay: "150ms" }}
                        />
                        <span
                          className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce"
                          style={{ animationDelay: "300ms" }}
                        />
                      </span>
                    </div>
                  </div>
                )}
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="border-t border-border px-6 py-4">
          <form onSubmit={handleFormSubmit} className="max-w-3xl mx-auto">
            <div className="relative flex items-center rounded-2xl border border-input bg-background shadow-sm focus-within:ring-2 focus-within:ring-ring focus-within:border-transparent transition-shadow">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  activeConvId
                    ? "Ask a follow-up question..."
                    : "Ask about your home documents..."
                }
                disabled={loading || !propertyId}
                className="flex-1 bg-transparent px-4 py-3.5 text-sm placeholder:text-muted-foreground focus:outline-none disabled:opacity-50"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
              />
              <button
                type="submit"
                disabled={loading || !input.trim() || !propertyId}
                className="mr-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-150 cursor-pointer"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </div>
            <p className="mt-2 text-center text-[10px] text-muted-foreground">
              HomeBase AI answers from your uploaded documents only. Always
              verify important details.
            </p>
          </form>
        </div>
      </div>

      {/* PDF Viewer Modal */}
      {viewer && (
        <PdfViewer
          documentId={viewer.documentId}
          title={viewer.title}
          page={viewer.page}
          snippet={viewer.snippet}
          onClose={() => setViewer(null)}
        />
      )}
    </div>
  );
}
