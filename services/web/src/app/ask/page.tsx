"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Bot, User, FileText, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { api, type AskResponse } from "@/lib/api";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: AskResponse["sources"];
  model?: string;
  latency?: number;
}

const PROPERTY_ID = typeof window !== "undefined"
  ? localStorage.getItem("homebase_property_id") || ""
  : "";

export default function AskPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [propertyId, setPropertyId] = useState(PROPERTY_ID);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (propertyId) localStorage.setItem("homebase_property_id", propertyId);
  }, [propertyId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !propertyId || loading) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: input.trim(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await api.ask(userMsg.content, propertyId);
      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: res.answer,
        sources: res.sources,
        model: res.model_used,
        latency: res.latency_ms,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: err instanceof Error ? err.message : "Something went wrong.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-3rem)] flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">AI Chat</h1>
          <p className="text-sm text-muted-foreground">
            Ask questions about your home documents
          </p>
        </div>
        <input
          type="text"
          value={propertyId}
          onChange={(e) => setPropertyId(e.target.value)}
          placeholder="Property UUID"
          className="w-64 rounded-lg border border-input bg-background px-3 py-1.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto py-6 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-4">
              <Bot className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-lg font-semibold">Ask HomeBase AI</h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-md">
              Ask about your warranty coverage, insurance details, HOA rules, or any document you've uploaded.
            </p>
            <div className="mt-6 flex flex-wrap gap-2 justify-center">
              {[
                "Is grout cracking covered under warranty?",
                "What is my insurance deductible?",
                "When does my builder warranty expire?",
              ].map((q) => (
                <button
                  key={q}
                  onClick={() => setInput(q)}
                  className="rounded-lg border border-border bg-card px-3 py-2 text-xs text-muted-foreground hover:border-primary/30 hover:text-foreground transition-colors duration-150 cursor-pointer"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        <AnimatePresence mode="popLayout">
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={cn(
                "flex gap-3",
                msg.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              {msg.role === "assistant" && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
              )}
              <div
                className={cn(
                  "max-w-2xl rounded-xl px-4 py-3",
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-card border border-border"
                )}
              >
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {msg.content}
                </p>
                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {msg.sources.map((src, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 rounded-md bg-accent px-2 py-0.5 text-[11px] font-medium text-accent-foreground"
                      >
                        <FileText className="h-3 w-3" />
                        {src.title}
                        {src.page != null && `, p.${src.page}`}
                        <span className="text-muted-foreground ml-1">
                          {(src.similarity * 100).toFixed(0)}%
                        </span>
                      </span>
                    ))}
                  </div>
                )}
                {msg.model && (
                  <p className="mt-2 text-[10px] text-muted-foreground">
                    {msg.model} &middot; {msg.latency}ms
                  </p>
                )}
              </div>
              {msg.role === "user" && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <User className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-3"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Bot className="h-4 w-4 text-primary" />
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-card border border-border px-4 py-3">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Thinking...</span>
            </div>
          </motion.div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t border-border pt-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your home documents..."
            disabled={loading || !propertyId}
            className="flex-1 rounded-xl border border-input bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={loading || !input.trim() || !propertyId}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150 cursor-pointer"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </form>
    </div>
  );
}
