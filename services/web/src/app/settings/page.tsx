"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Settings,
  Database,
  Cpu,
  Globe,
  Key,
  HardDrive,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

const fadeIn = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

export default function SettingsPage() {
  const [propertyId, setPropertyId] = useState("");

  useEffect(() => {
    setPropertyId(localStorage.getItem("homebase_property_id") || "");
  }, []);

  const savePropertyId = () => {
    localStorage.setItem("homebase_property_id", propertyId);
  };

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Header */}
      <motion.div {...fadeIn} transition={{ duration: 0.3 }}>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configuration and system preferences
        </p>
      </motion.div>

      {/* Property Config */}
      <motion.div
        {...fadeIn}
        transition={{ duration: 0.3, delay: 0.05 }}
        className="rounded-xl border border-border bg-card p-6 space-y-4"
      >
        <div className="flex items-center gap-3">
          <Key className="h-5 w-5 text-primary" />
          <h2 className="text-base font-semibold">Property</h2>
        </div>
        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">Active Property ID</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={propertyId}
              onChange={(e) => setPropertyId(e.target.value)}
              placeholder="UUID from seed script"
              className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <button
              onClick={savePropertyId}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors duration-150 cursor-pointer"
            >
              Save
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Used across all pages for document uploads and AI queries
          </p>
        </div>
      </motion.div>

      {/* System Info */}
      <motion.div
        {...fadeIn}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="rounded-xl border border-border bg-card p-6 space-y-4"
      >
        <div className="flex items-center gap-3">
          <Cpu className="h-5 w-5 text-primary" />
          <h2 className="text-base font-semibold">System</h2>
        </div>
        <div className="space-y-3">
          {[
            { label: "Database", value: "PostgreSQL 16 + pgvector", icon: Database },
            { label: "LLM Runtime", value: "Ollama (local)", icon: Cpu },
            { label: "Primary Model", value: "qwen2.5:7b", icon: Cpu },
            { label: "Embeddings", value: "nomic-embed-text (768 dims)", icon: HardDrive },
            { label: "Cloud Fallback", value: "Disabled", icon: Globe },
          ].map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between py-2 border-b border-border last:border-0"
            >
              <div className="flex items-center gap-2">
                <item.icon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{item.label}</span>
              </div>
              <span className="text-sm font-mono text-muted-foreground">
                {item.value}
              </span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Version */}
      <motion.div
        {...fadeIn}
        transition={{ duration: 0.3, delay: 0.15 }}
        className="text-center text-xs text-muted-foreground"
      >
        HomeBase AI v0.1.0 &middot; Phase 0
      </motion.div>
    </div>
  );
}
