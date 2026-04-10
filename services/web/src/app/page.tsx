"use client";

import { motion } from "framer-motion";
import {
  FileText,
  MessageSquare,
  Upload,
  Wrench,
  AlertTriangle,
  ArrowRight,
  Clock,
} from "lucide-react";
import Link from "next/link";

const container = {
  animate: { transition: { staggerChildren: 0.04 } },
};

const item = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } },
};

const stats = [
  { label: "Documents", value: "—", icon: FileText, href: "/documents" },
  { label: "AI Queries", value: "—", icon: MessageSquare, href: "/ask" },
  { label: "Tasks Due", value: "—", icon: Wrench, href: "/maintenance" },
  { label: "Alerts", value: "0", icon: AlertTriangle, href: "/maintenance" },
];

const quickActions = [
  {
    label: "Upload Document",
    description: "Add warranty, insurance, or HOA docs",
    icon: Upload,
    href: "/documents",
  },
  {
    label: "Ask AI",
    description: "Query your home documents",
    icon: MessageSquare,
    href: "/ask",
  },
  {
    label: "View Tasks",
    description: "Check maintenance schedule",
    icon: Wrench,
    href: "/maintenance",
  },
];

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default function DashboardPage() {
  return (
    <motion.div
      variants={container}
      initial="initial"
      animate="animate"
      className="space-y-6"
    >
      {/* Greeting */}
      <motion.div variants={item}>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          {getGreeting()}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Here&apos;s what&apos;s happening with your home
        </p>
      </motion.div>

      {/* Bento Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Stat Cards */}
        {stats.map((stat) => (
          <motion.div key={stat.label} variants={item}>
            <Link
              href={stat.href}
              className="flex flex-col justify-between rounded-2xl border border-border bg-card p-4 sm:p-5 h-full transition-colors duration-200 hover:bg-accent/50 cursor-pointer"
            >
              <stat.icon className="h-5 w-5 text-muted-foreground" />
              <div className="mt-6 sm:mt-8">
                <p className="text-2xl sm:text-3xl font-bold font-mono tracking-tight">
                  {stat.value}
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                  {stat.label}
                </p>
              </div>
            </Link>
          </motion.div>
        ))}

        {/* Quick Actions — spans 2 cols */}
        <motion.div variants={item} className="col-span-2">
          <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 h-full">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
              Quick Actions
            </p>
            <div className="space-y-1">
              {quickActions.map((action) => (
                <Link
                  key={action.label}
                  href={action.href}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors duration-150 hover:bg-accent cursor-pointer group min-h-[44px]"
                >
                  <action.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{action.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {action.description}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-150" />
                </Link>
              ))}
            </div>
          </div>
        </motion.div>

        {/* System Status — spans 2 cols */}
        <motion.div variants={item} className="col-span-2">
          <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 h-full">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
              System
            </p>
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Database" },
                { label: "Ollama LLM" },
                { label: "Embeddings" },
              ].map((service) => (
                <div
                  key={service.label}
                  className="flex items-center gap-2 text-sm"
                >
                  <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 shrink-0" />
                  <span className="text-muted-foreground truncate">
                    {service.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Recent Activity */}
      <motion.div variants={item}>
        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-6">
            Recent Activity
          </p>
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <Clock className="h-8 w-8 text-muted-foreground/20 mb-3" />
            <p className="text-sm text-muted-foreground">No activity yet</p>
            <Link
              href="/documents"
              className="mt-3 inline-flex items-center gap-1.5 text-sm text-primary hover:underline cursor-pointer"
            >
              Upload your first document
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
