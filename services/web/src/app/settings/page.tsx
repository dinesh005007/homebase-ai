"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Settings,
  Database,
  Cpu,
  Globe,
  Key,
  HardDrive,
  RefreshCw,
  Server,
  Loader2,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

const fadeIn = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

type HostInfo = { cpu_percent: number; cpu_count: number; memory_total_gb: number; memory_used_gb: number; memory_percent: number };
type ServiceInfo = { name: string; pid: number; cpu_percent: number; memory_mb: number };

const SERVICE_COLORS: Record<string, string> = {
  "API Server": "bg-blue-500",
  "Frontend (Next.js)": "bg-emerald-500",
  "Frontend (Node)": "bg-emerald-500",
  "PostgreSQL": "bg-violet-500",
  "Redis": "bg-red-500",
  "Ollama": "bg-amber-500",
  "Tesseract OCR": "bg-cyan-500",
};

export default function SettingsPage() {
  const [propertyId, setPropertyId] = useState("");
  const [host, setHost] = useState<HostInfo | null>(null);
  const [services, setServices] = useState<ServiceInfo[]>([]);
  const [resourcesLoading, setResourcesLoading] = useState(false);

  const loadResources = useCallback(async () => {
    setResourcesLoading(true);
    try {
      const res = await api.systemResources();
      setHost(res.host);
      setServices(res.services);
    } catch {
      // silently fail
    } finally {
      setResourcesLoading(false);
    }
  }, []);

  useEffect(() => {
    setPropertyId(localStorage.getItem("homebase_property_id") || "");
    loadResources();
    const interval = setInterval(loadResources, 10000); // refresh every 10s
    return () => clearInterval(interval);
  }, [loadResources]);

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

      {/* Resource Monitor */}
      <motion.div
        {...fadeIn}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="rounded-xl border border-border bg-card p-6 space-y-5"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Activity className="h-5 w-5 text-primary" />
            <h2 className="text-base font-semibold">Resource Monitor</h2>
          </div>
          <button
            onClick={loadResources}
            disabled={resourcesLoading}
            className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={cn("h-4 w-4", resourcesLoading && "animate-spin")} />
          </button>
        </div>

        {host ? (
          <>
            {/* Host overview */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">CPU</span>
                  <span className="font-mono font-medium">{host.cpu_percent}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      host.cpu_percent > 80 ? "bg-destructive" : host.cpu_percent > 50 ? "bg-amber-500" : "bg-primary"
                    )}
                    style={{ width: `${Math.min(host.cpu_percent, 100)}%` }}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">{host.cpu_count} cores</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Memory</span>
                  <span className="font-mono font-medium">{host.memory_used_gb}/{host.memory_total_gb} GB</span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      host.memory_percent > 85 ? "bg-destructive" : host.memory_percent > 65 ? "bg-amber-500" : "bg-primary"
                    )}
                    style={{ width: `${Math.min(host.memory_percent, 100)}%` }}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">{host.memory_percent}% used</p>
              </div>
            </div>

            {/* Per-service breakdown */}
            {services.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-border">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Services</p>
                {services.map((svc) => (
                  <div
                    key={svc.pid}
                    className="flex items-center justify-between py-2 border-b border-border last:border-0"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={cn("h-2 w-2 rounded-full", SERVICE_COLORS[svc.name] || "bg-gray-500")} />
                      <span className="text-sm">{svc.name}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm font-mono text-muted-foreground">
                      <span title="Memory">{svc.memory_mb < 1024 ? `${svc.memory_mb} MB` : `${(svc.memory_mb / 1024).toFixed(1)} GB`}</span>
                      <span title="CPU" className="w-14 text-right">{svc.cpu_percent}% cpu</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {services.length === 0 && !resourcesLoading && (
              <p className="text-sm text-muted-foreground text-center py-2">No services detected</p>
            )}
          </>
        ) : resourcesLoading ? (
          <div className="flex items-center justify-center py-6 gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Loading resources...</span>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">Could not connect to system API</p>
        )}
      </motion.div>

      {/* System Info */}
      <motion.div
        {...fadeIn}
        transition={{ duration: 0.3, delay: 0.15 }}
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
        transition={{ duration: 0.3, delay: 0.2 }}
        className="text-center text-xs text-muted-foreground"
      >
        HomeBase AI v0.1.0 &middot; Phase 0
      </motion.div>
    </div>
  );
}
