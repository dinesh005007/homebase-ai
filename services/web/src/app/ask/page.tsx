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
  Camera,
  ImageIcon,
  Menu,
} from "lucide-react";
import { Drawer } from "vaul";
import { cn, generateId } from "@/lib/utils";
import {
  api,
  type AskSource,
  type ConversationItem,
} from "@/lib/api";
import { usePropertyId } from "@/hooks/use-property-id";
import { useMediaCapture } from "@/hooks/use-media-capture";
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
  imageUrl?: string; // For vision messages
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
      <span key={i} className="leading-relaxed" dangerouslySetInnerHTML={{ __html: rendered }} />
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
        <span className="text-[11px] font-mono text-muted-foreground">{language || "text"}</span>
        <button onClick={copy} className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      </div>
      <pre className="overflow-x-auto p-3 text-xs font-mono bg-card"><code>{code}</code></pre>
    </div>
  );
}

// ─── Conversation sidebar item ────────────────────────────────────────
function ConvItem({
  conv, isActive, onClick, onDelete, onRename,
}: {
  conv: ConversationItem; isActive: boolean; onClick: () => void;
  onDelete: () => void; onRename: (title: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(conv.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  const save = () => {
    const trimmed = editTitle.trim();
    if (trimmed && trimmed !== conv.title) onRename(trimmed);
    setEditing(false);
  };

  return (
    <div
      onClick={() => !editing && onClick()}
      className={cn(
        "group flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm transition-colors duration-150 min-h-[44px]",
        isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
        !editing && "cursor-pointer"
      )}
    >
      <MessageSquare className="h-4 w-4 shrink-0" />
      {editing ? (
        <input ref={inputRef} value={editTitle} onChange={(e) => setEditTitle(e.target.value)}
          onBlur={save} onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") setEditing(false); }}
          className="flex-1 min-w-0 bg-transparent border-b border-primary/50 text-sm focus:outline-none"
          onClick={(e) => e.stopPropagation()} />
      ) : (
        <div className="flex-1 min-w-0">
          <span className="block truncate">{conv.title}</span>
          {conv.message_count > 2 && (
            <span className="text-[10px] text-muted-foreground">{Math.floor(conv.message_count / 2)} messages</span>
          )}
        </div>
      )}
      {!editing && (
        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-all">
          <button onClick={(e) => { e.stopPropagation(); setEditTitle(conv.title); setEditing(true); }}
            className="rounded p-1 text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
            <Pencil className="h-3 w-3" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="rounded p-1 text-muted-foreground hover:text-destructive transition-colors cursor-pointer">
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

// ─── Sidebar Content (reusable for desktop + mobile drawer) ──────────
function SidebarContent({
  conversations, groups, convsLoading, activeConvId, sidebarSearch,
  setSidebarSearch, onLoadConversation, onDeleteConversation, onRenameConversation,
  onNewChat, onClearAll,
}: {
  conversations: ConversationItem[];
  groups: { label: string; convs: ConversationItem[] }[];
  convsLoading: boolean; activeConvId: string | null;
  sidebarSearch: string; setSidebarSearch: (v: string) => void;
  onLoadConversation: (conv: ConversationItem) => void;
  onDeleteConversation: (id: string) => void;
  onRenameConversation: (id: string, title: string) => void;
  onNewChat: () => void; onClearAll: () => void;
}) {
  return (
    <>
      <div className="p-3 border-b border-border">
        <button onClick={onNewChat}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 py-2.5 text-sm font-medium hover:bg-accent transition-colors cursor-pointer min-h-[44px]">
          <Plus className="h-4 w-4" /> New Chat
        </button>
      </div>
      <div className="px-3 pt-3 pb-1">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input type="text" value={sidebarSearch} onChange={(e) => setSidebarSearch(e.target.value)}
            placeholder="Search chats..." className="w-full rounded-md border border-input bg-background pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring min-h-[44px]" />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-3">
        {convsLoading && conversations.length === 0 && (
          <div className="flex items-center justify-center py-8 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /></div>
        )}
        {groups.map((group) => (
          <div key={group.label}>
            <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{group.label}</p>
            {group.convs.map((conv) => (
              <ConvItem key={conv.id} conv={conv} isActive={activeConvId === conv.id}
                onClick={() => onLoadConversation(conv)} onDelete={() => onDeleteConversation(conv.id)}
                onRename={(title) => onRenameConversation(conv.id, title)} />
            ))}
          </div>
        ))}
        {!convsLoading && conversations.length === 0 && (
          <p className="px-3 py-8 text-center text-xs text-muted-foreground">No conversations yet</p>
        )}
      </div>
      {conversations.length > 0 && (
        <div className="border-t border-border p-3">
          <button onClick={onClearAll}
            className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer min-h-[44px]">
            <Trash2 className="h-3 w-3" /> Clear all chats
          </button>
        </div>
      )}
    </>
  );
}

// ─── Main Component ───────────────────────────────────────────────────
export default function AskPage() {
  const { propertyId } = usePropertyId();
  const media = useMediaCapture();

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
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Attach action sheet
  const [attachOpen, setAttachOpen] = useState(false);

  // PDF viewer
  const [viewer, setViewer] = useState<ViewerState | null>(null);

  // Load conversations
  const loadConversations = useCallback(async () => {
    if (!propertyId) return;
    setConvsLoading(true);
    try {
      const res = await api.listConversations(propertyId, 100);
      setConversations(res.conversations);
    } catch { /* fail silently */ } finally { setConvsLoading(false); }
  }, [propertyId]);

  useEffect(() => { loadConversations(); }, [loadConversations]);
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [messages]);
  useEffect(() => { if (!activeConvId) inputRef.current?.focus(); }, [activeConvId]);

  // ─── Sidebar group computation ──────────────────────────────────
  const filteredConvs = sidebarSearch
    ? conversations.filter((c) => c.title.toLowerCase().includes(sidebarSearch.toLowerCase()))
    : conversations;

  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  const groups: { label: string; convs: ConversationItem[] }[] = [];
  const todayC = filteredConvs.filter((c) => new Date(c.updated_at).toDateString() === today);
  const yesterdayC = filteredConvs.filter((c) => new Date(c.updated_at).toDateString() === yesterday);
  const olderC = filteredConvs.filter((c) => new Date(c.updated_at).toDateString() !== today && new Date(c.updated_at).toDateString() !== yesterday);
  if (todayC.length) groups.push({ label: "Today", convs: todayC });
  if (yesterdayC.length) groups.push({ label: "Yesterday", convs: yesterdayC });
  if (olderC.length) groups.push({ label: "Previous", convs: olderC });

  // ─── Actions ──────────────────────────────────────────────────────
  const newChat = () => { setMessages([]); setActiveConvId(null); setInput(""); media.clearAttachment(); inputRef.current?.focus(); };

  const loadConversation = async (conv: ConversationItem) => {
    setActiveConvId(conv.id);
    setMobileSidebarOpen(false);
    try {
      const detail = await api.getConversation(conv.id);
      setMessages(detail.messages.map((m) => ({
        id: m.id, role: m.role, content: m.content,
        sources: m.sources as AskSource[] | undefined,
        model: m.model_used || undefined, latency: m.latency_ms || undefined,
        confidence: m.confidence || undefined, intent: m.intent || undefined,
        safety_level: m.safety_level || undefined,
      })));
    } catch { /* fail silently */ }
  };

  const deleteConversation = async (id: string) => {
    try { await api.deleteConversation(id); setConversations((prev) => prev.filter((c) => c.id !== id)); if (activeConvId === id) newChat(); } catch {}
  };

  const renameConversation = async (id: string, title: string) => {
    try { await api.renameConversation(id, title); setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, title } : c))); } catch {}
  };

  const clearAll = async () => {
    if (!propertyId) return;
    if (!confirm("Delete all conversation history?")) return;
    try { await api.clearConversations(propertyId); setConversations([]); newChat(); } catch {}
  };

  const openSource = (src: AskSource) => {
    if (!src.document_id) return;
    setViewer({ documentId: src.document_id, title: src.title, page: src.page, snippet: src.snippet || "" });
  };

  const copyMessage = (content: string) => { navigator.clipboard.writeText(content); };

  // ─── Submit ───────────────────────────────────────────────────────
  const handleSubmit = async (question?: string) => {
    const q = (question || input).trim();
    if (!propertyId || loading) return;
    if (!q && !media.attachment) return;

    const userMsg: ChatMessage = {
      id: generateId(), role: "user",
      content: q || (media.attachment ? "What is this?" : ""),
      imageUrl: media.preview || undefined,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    const assistantId = generateId();
    setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "" }]);

    try {
      // ── Vision path: image attached ──
      if (media.attachment) {
        const file = media.attachment;
        const visionQuestion = q || "What is this?";
        media.clearAttachment();

        const result = await api.analyzeImage(file, visionQuestion, propertyId);
        setMessages((prev) =>
          prev.map((m) => m.id === assistantId ? {
            ...m, content: result.answer, model: result.model_used,
            latency: result.latency_ms, confidence: result.confidence,
          } : m)
        );
        loadConversations();
        return;
      }

      // ── RAG path: text-only question ──
      let fullContent = "";
      let metadata: Partial<ChatMessage> = {};
      let newConvId = activeConvId;

      for await (const chunk of api.askStream(q, propertyId, activeConvId || undefined)) {
        if (!chunk.done) {
          fullContent += chunk.token;
          setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: fullContent } : m));
        } else if (chunk.error) {
          fullContent = `Error: ${chunk.error}`;
          setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: fullContent } : m));
        } else {
          metadata = {
            sources: chunk.sources, model: chunk.model_used,
            latency: chunk.latency_ms, confidence: chunk.confidence,
            intent: chunk.intent, safety_level: chunk.safety_level,
          };
          if (chunk.conversation_id) newConvId = chunk.conversation_id;
        }
      }

      setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, ...metadata } : m)));
      if (newConvId && newConvId !== activeConvId) setActiveConvId(newConvId);
      loadConversations();
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) => m.id === assistantId ? { ...m, content: err instanceof Error ? err.message : "Something went wrong." } : m)
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

  const handleFormSubmit = (e: React.FormEvent) => { e.preventDefault(); handleSubmit(); };

  // Sidebar props
  const sidebarProps = {
    conversations, groups, convsLoading, activeConvId, sidebarSearch, setSidebarSearch,
    onLoadConversation: loadConversation, onDeleteConversation: deleteConversation,
    onRenameConversation: renameConversation, onNewChat: newChat, onClearAll: clearAll,
  };

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] sm:h-[calc(100dvh-3rem)] -mx-4 sm:-mx-6 -my-4 sm:-my-6">
      {/* Hidden file input for camera/gallery */}
      <input ref={media.fileInputRef} type="file" className="hidden" onChange={media.handleFileChange} />

      {/* ─── Desktop Sidebar ──────────────────────────────────── */}
      <div className="hidden md:flex w-64 flex-col border-r border-border bg-card">
        <SidebarContent {...sidebarProps} />
      </div>

      {/* ─── Mobile Sidebar Drawer ────────────────────────────── */}
      <Drawer.Root open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen} direction="left">
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-50 bg-black/40" />
          <Drawer.Content className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-card border-r border-border">
            <Drawer.Title className="sr-only">Chat history</Drawer.Title>
            <SidebarContent {...sidebarProps} />
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      {/* ─── Main Chat Area ──────────────────────────────────────── */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 sm:px-6 py-3">
          <div className="flex items-center gap-3">
            {/* Mobile history button */}
            <button onClick={() => setMobileSidebarOpen(true)}
              className="md:hidden flex h-9 w-9 items-center justify-center rounded-lg hover:bg-accent transition-colors cursor-pointer">
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h1 className="text-sm font-semibold">HomeBase AI</h1>
              <p className="text-[11px] text-muted-foreground truncate max-w-[200px]">
                {activeConvId ? conversations.find((c) => c.id === activeConvId)?.title || "Chat" : "Ask about your home"}
              </p>
            </div>
          </div>
          {!propertyId && <span className="text-xs text-amber-500">Loading property...</span>}
        </div>

        {/* Messages Area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full px-4 sm:px-6">
              <div className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-primary/10 mb-4 sm:mb-5">
                <Bot className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
              </div>
              <h2 className="text-base sm:text-lg font-semibold text-center">What can I help you with?</h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-md text-center">
                Ask about your documents or take a photo for AI analysis.
              </p>
              <div className="mt-6 sm:mt-8 grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg w-full">
                {SUGGESTIONS.map((q) => (
                  <button key={q} onClick={() => handleSubmit(q)} disabled={loading || !propertyId}
                    className="rounded-xl border border-border bg-card px-4 py-3 text-left text-xs text-muted-foreground hover:border-primary/30 hover:text-foreground hover:bg-accent/50 transition-all duration-150 cursor-pointer disabled:opacity-50 min-h-[44px]">
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
              <AnimatePresence mode="popLayout">
                {messages.map((msg) => (
                  <motion.div key={msg.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="group">
                    <div className={cn("flex gap-2 sm:gap-3", msg.role === "user" ? "flex-row-reverse" : "")}>
                      <div className={cn("flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg",
                        msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-primary/10")}>
                        {msg.role === "user" ? <User className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : <Bot className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />}
                      </div>
                      <div className={cn("flex-1 min-w-0", msg.role === "user" ? "text-right" : "")}>
                        <div className={cn("inline-block rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 text-sm max-w-[85%] sm:max-w-none",
                          msg.role === "user" ? "bg-primary text-primary-foreground text-left" : "bg-card border border-border text-left")}>
                          {/* Image thumbnail for vision messages */}
                          {msg.imageUrl && (
                            <div className="mb-2">
                              <img src={msg.imageUrl} alt="Attached" className="rounded-lg max-h-48 max-w-full object-cover" />
                            </div>
                          )}
                          <div className="whitespace-pre-wrap break-words">
                            {msg.role === "assistant" ? renderContent(msg.content) : msg.content}
                          </div>
                          {/* Sources */}
                          {msg.sources && msg.sources.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-border/50 flex flex-wrap gap-1.5">
                              {msg.sources.map((src, i) => (
                                <button key={i} onClick={() => openSource(src)}
                                  className={cn("inline-flex items-center gap-1 rounded-md bg-accent px-2 py-1 text-[11px] font-medium text-accent-foreground transition-colors duration-150 min-h-[32px]",
                                    src.document_id ? "hover:bg-primary/10 hover:text-primary cursor-pointer" : "cursor-default")}
                                  title={src.document_id ? "View source in PDF" : undefined}>
                                  <FileText className="h-3 w-3" />
                                  <span className="truncate max-w-[120px]">{src.title}</span>
                                  {src.page != null && <span>, p.{src.page}</span>}
                                  <span className="text-muted-foreground ml-1">{(src.similarity * 100).toFixed(0)}%</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        {/* Meta + Actions */}
                        {msg.role === "assistant" && msg.model && (
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 px-1">
                            {msg.confidence === "low" && (
                              <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-500">
                                <AlertTriangle className="h-2.5 w-2.5" /> Low confidence
                              </span>
                            )}
                            {msg.confidence === "high" && (
                              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-500">
                                <ShieldCheck className="h-2.5 w-2.5" /> Verified
                              </span>
                            )}
                            <span className="text-[10px] text-muted-foreground">{msg.model} &middot; {msg.latency}ms</span>
                            <div className="ml-auto opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity">
                              <button onClick={() => copyMessage(msg.content)} className="rounded p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer" title="Copy"><Copy className="h-3.5 w-3.5" /></button>
                              <button onClick={regenerate} className="rounded p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer" title="Regenerate"><RotateCcw className="h-3.5 w-3.5" /></button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              {/* Typing indicator */}
              {loading && messages[messages.length - 1]?.content === "" && (
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Bot className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                  </div>
                  <div className="flex items-center gap-1.5 rounded-2xl bg-card border border-border px-4 py-3">
                    <span className="flex gap-1">
                      <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "300ms" }} />
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="border-t border-border px-4 sm:px-6 py-3 sm:py-4">
          <form onSubmit={handleFormSubmit} className="max-w-3xl mx-auto">
            {/* Attachment preview */}
            {media.attachment && (
              <div className="mb-2 flex items-center gap-2 rounded-xl bg-accent/50 px-3 py-2">
                {media.preview ? (
                  <img src={media.preview} alt="Preview" className="h-12 w-12 rounded-lg object-cover" />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted"><ImageIcon className="h-5 w-5 text-muted-foreground" /></div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{media.attachment.name}</p>
                  <p className="text-[10px] text-muted-foreground">{(media.attachment.size / 1024).toFixed(0)} KB</p>
                </div>
                <button type="button" onClick={media.clearAttachment}
                  className="rounded-lg p-2 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center">
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            <div className="relative flex items-center rounded-2xl border border-input bg-background shadow-sm focus-within:ring-2 focus-within:ring-ring focus-within:border-transparent transition-shadow">
              {/* Camera button */}
              <button type="button" onClick={() => setAttachOpen(true)} disabled={loading}
                className="ml-1.5 flex h-10 w-10 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 transition-colors cursor-pointer">
                <Camera className="h-5 w-5" />
              </button>

              <input ref={inputRef} type="text" value={input} onChange={(e) => setInput(e.target.value)}
                placeholder={media.attachment ? "Ask about this image..." : activeConvId ? "Ask a follow-up..." : "Ask about your home..."}
                disabled={loading || !propertyId}
                className="flex-1 bg-transparent px-2 sm:px-3 py-3 sm:py-3.5 text-sm placeholder:text-muted-foreground focus:outline-none disabled:opacity-50"
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }} />

              <button type="submit" disabled={loading || (!input.trim() && !media.attachment) || !propertyId}
                className="mr-1.5 flex h-10 w-10 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-150 cursor-pointer">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </div>
            <p className="mt-1.5 text-center text-[10px] text-muted-foreground">
              HomeBase AI answers from your uploaded documents. Always verify important details.
            </p>
          </form>
        </div>
      </div>

      {/* ─── Attach Action Sheet (mobile drawer) ─────────────────── */}
      <Drawer.Root open={attachOpen} onOpenChange={setAttachOpen}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-50 bg-black/40" />
          <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl bg-card border-t border-border" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
            <div className="flex justify-center pt-3 pb-2"><div className="h-1 w-10 rounded-full bg-muted-foreground/30" /></div>
            <Drawer.Title className="sr-only">Attach media</Drawer.Title>
            <div className="px-4 pb-4 space-y-1">
              <button onClick={() => { media.openCamera(); setAttachOpen(false); }}
                className="flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-sm font-medium text-foreground hover:bg-accent transition-colors min-h-[44px] cursor-pointer">
                <Camera className="h-5 w-5 text-primary" /> Take Photo
              </button>
              <button onClick={() => { media.openGallery(); setAttachOpen(false); }}
                className="flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-sm font-medium text-foreground hover:bg-accent transition-colors min-h-[44px] cursor-pointer">
                <ImageIcon className="h-5 w-5 text-primary" /> Choose from Library
              </button>
              <button onClick={() => setAttachOpen(false)}
                className="flex w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-medium text-muted-foreground hover:bg-accent transition-colors min-h-[44px] cursor-pointer">
                Cancel
              </button>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      {/* PDF Viewer Modal */}
      {viewer && (
        <PdfViewer documentId={viewer.documentId} title={viewer.title} page={viewer.page} snippet={viewer.snippet} onClose={() => setViewer(null)} />
      )}
    </div>
  );
}
