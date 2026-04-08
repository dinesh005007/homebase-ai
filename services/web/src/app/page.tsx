"use client";

import { motion } from "framer-motion";
import {
  FileText,
  MessageSquare,
  Upload,
  Wrench,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const fadeIn = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

const stats = [
  { label: "Documents", value: "—", icon: FileText, href: "/documents" },
  { label: "AI Queries", value: "—", icon: MessageSquare, href: "/ask" },
  { label: "Tasks Due", value: "—", icon: Wrench, href: "/maintenance" },
  { label: "Alerts", value: "—", icon: AlertTriangle, href: "/maintenance" },
];

const quickActions = [
  {
    label: "Upload Document",
    description: "Add warranty, insurance, or HOA docs",
    icon: Upload,
    href: "/documents",
    color: "bg-primary/10 text-primary",
  },
  {
    label: "Ask AI",
    description: "Query your home documents",
    icon: MessageSquare,
    href: "/ask",
    color: "bg-blue-500/10 text-blue-500",
  },
  {
    label: "View Tasks",
    description: "Check maintenance schedule",
    icon: Wrench,
    href: "/maintenance",
    color: "bg-amber-500/10 text-amber-500",
  },
];

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div {...fadeIn} transition={{ duration: 0.3 }}>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Welcome to HomeBase AI
        </p>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            {...fadeIn}
            transition={{ duration: 0.3, delay: i * 0.05 }}
          >
            <Link
              href={stat.href}
              className="flex items-center gap-4 rounded-xl border border-border bg-card p-5 transition-all duration-200 hover:shadow-md hover:border-primary/20 cursor-pointer"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <stat.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-bold font-mono">{stat.value}</p>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions + Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Quick Actions */}
        <motion.div
          {...fadeIn}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="lg:col-span-1 space-y-3"
        >
          <h2 className="text-lg font-semibold">Quick Actions</h2>
          <div className="space-y-2">
            {quickActions.map((action) => (
              <Link
                key={action.label}
                href={action.href}
                className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-all duration-200 hover:shadow-md hover:border-primary/20 cursor-pointer group"
              >
                <div
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                    action.color
                  )}
                >
                  <action.icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{action.label}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {action.description}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-150" />
              </Link>
            ))}
          </div>
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          {...fadeIn}
          transition={{ duration: 0.3, delay: 0.25 }}
          className="lg:col-span-2"
        >
          <h2 className="text-lg font-semibold mb-3">Recent Activity</h2>
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-3">
                <Clock className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">No activity yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Upload your first document to get started
              </p>
              <Link
                href="/documents"
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors duration-150 cursor-pointer"
              >
                <Upload className="h-4 w-4" />
                Upload Document
              </Link>
            </div>
          </div>
        </motion.div>
      </div>

      {/* System Status */}
      <motion.div {...fadeIn} transition={{ duration: 0.3, delay: 0.3 }}>
        <h2 className="text-lg font-semibold mb-3">System Status</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { label: "Database", status: "checking" },
            { label: "Ollama LLM", status: "checking" },
            { label: "Embeddings", status: "checking" },
          ].map((service) => (
            <div
              key={service.label}
              className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3"
            >
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{service.label}</span>
              <span className="ml-auto text-xs text-muted-foreground">
                {service.status}
              </span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
