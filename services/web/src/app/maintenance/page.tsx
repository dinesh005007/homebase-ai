"use client";

import { motion } from "framer-motion";
import {
  Wrench,
  CalendarDays,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Plus,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";

const tasks = [
  {
    title: "HVAC Filter Change",
    due: "Apr 15, 2026",
    priority: "medium",
    status: "upcoming",
    system: "HVAC",
  },
  {
    title: "Irrigation System Check",
    due: "Apr 20, 2026",
    priority: "low",
    status: "upcoming",
    system: "Irrigation",
  },
  {
    title: "Smoke Detector Battery Test",
    due: "May 1, 2026",
    priority: "high",
    status: "upcoming",
    system: "Safety",
  },
  {
    title: "Gutter Cleaning",
    due: "May 15, 2026",
    priority: "medium",
    status: "upcoming",
    system: "Exterior",
  },
  {
    title: "Water Heater Flush",
    due: "Jun 1, 2026",
    priority: "medium",
    status: "upcoming",
    system: "Plumbing",
  },
];

const priorityColors: Record<string, string> = {
  high: "bg-red-500/10 text-red-500",
  medium: "bg-amber-500/10 text-amber-500",
  low: "bg-blue-500/10 text-blue-500",
};

const fadeIn = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

export default function MaintenancePage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        {...fadeIn}
        transition={{ duration: 0.3 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Maintenance</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Tasks, schedules, and service history
          </p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors duration-150 cursor-pointer">
          <Plus className="h-4 w-4" />
          Add Task
        </button>
      </motion.div>

      {/* Stats */}
      <motion.div
        {...fadeIn}
        transition={{ duration: 0.3, delay: 0.05 }}
        className="grid gap-4 sm:grid-cols-3"
      >
        {[
          { label: "Due This Month", value: "2", icon: Clock, color: "text-amber-500" },
          { label: "Overdue", value: "0", icon: AlertTriangle, color: "text-red-500" },
          { label: "Completed", value: "0", icon: CheckCircle2, color: "text-emerald-500" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="flex items-center gap-4 rounded-xl border border-border bg-card p-5"
          >
            <stat.icon className={cn("h-5 w-5", stat.color)} />
            <div>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className="text-2xl font-bold font-mono">{stat.value}</p>
            </div>
          </div>
        ))}
      </motion.div>

      {/* Task List */}
      <motion.div {...fadeIn} transition={{ duration: 0.3, delay: 0.1 }}>
        <h2 className="text-lg font-semibold mb-3">Upcoming Tasks</h2>
        <div className="space-y-2">
          {tasks.map((task, i) => (
            <motion.div
              key={task.title}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2, delay: i * 0.04 }}
              className="flex items-center gap-4 rounded-xl border border-border bg-card px-5 py-4 transition-all duration-200 hover:shadow-md hover:border-primary/20 cursor-pointer"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                <Wrench className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{task.title}</p>
                <p className="text-xs text-muted-foreground">{task.system}</p>
              </div>
              <span
                className={cn(
                  "rounded-md px-2 py-0.5 text-[11px] font-medium",
                  priorityColors[task.priority]
                )}
              >
                {task.priority}
              </span>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CalendarDays className="h-3 w-3" />
                {task.due}
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
