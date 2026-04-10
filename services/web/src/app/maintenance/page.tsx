"use client";

import { useState, useEffect, useCallback } from "react";
import { usePropertyId } from "@/hooks/use-property-id";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wrench,
  CalendarDays,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Plus,
  Trash2,
  Loader2,
  Sprout,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { api, type MaintenanceTask } from "@/lib/api";

const priorityColors: Record<string, string> = {
  high: "bg-red-500/10 text-red-500",
  medium: "bg-amber-500/10 text-amber-500",
  low: "bg-blue-500/10 text-blue-500",
};

const statusFilters = ["all", "pending", "completed"];

const fadeIn = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

export default function MaintenancePage() {
  const { propertyId } = usePropertyId(
  );
  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [seeding, setSeeding] = useState(false);

  // New task form
  const [newTitle, setNewTitle] = useState("");
  const [newPriority, setNewPriority] = useState("medium");
  const [newSystem, setNewSystem] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [newDescription, setNewDescription] = useState("");

  const loadTasks = useCallback(async () => {
    if (!propertyId) return;
    setLoading(true);
    try {
      const filters = statusFilter !== "all" ? { status: statusFilter } : undefined;
      const res = await api.listMaintenanceTasks(propertyId, filters);
      setTasks(res.tasks);
    } catch {
      // empty state on error
    } finally {
      setLoading(false);
    }
  }, [propertyId, statusFilter]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !propertyId) return;
    await api.createMaintenanceTask({
      property_id: propertyId,
      title: newTitle,
      description: newDescription || undefined,
      priority: newPriority,
      system: newSystem || undefined,
      due_date: newDueDate || undefined,
    });
    setNewTitle("");
    setNewDescription("");
    setNewSystem("");
    setNewDueDate("");
    setShowForm(false);
    loadTasks();
  };

  const handleToggleComplete = async (task: MaintenanceTask) => {
    const newStatus = task.status === "completed" ? "pending" : "completed";
    await api.updateMaintenanceTask(task.id, { status: newStatus });
    loadTasks();
  };

  const handleDelete = async (taskId: string) => {
    await api.deleteMaintenanceTask(taskId);
    loadTasks();
  };

  const handleSeed = async () => {
    if (!propertyId) return;
    setSeeding(true);
    try {
      const res = await api.seedMaintenanceTasks(propertyId);
      loadTasks();
    } catch {
      // silently fail
    } finally {
      setSeeding(false);
    }
  };

  const pending = tasks.filter((t) => t.status === "pending");
  const overdue = pending.filter((t) => t.due_date && new Date(t.due_date) < new Date());
  const completed = tasks.filter((t) => t.status === "completed");

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        {...fadeIn}
        transition={{ duration: 0.3 }}
        className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between"
      >
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Maintenance</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Tasks, schedules, and service history
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSeed}
            disabled={seeding || !propertyId}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-accent transition-colors duration-150 cursor-pointer disabled:opacity-50 min-h-[44px]"
          >
            {seeding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sprout className="h-4 w-4" />}
            Seed Seasonal
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors duration-150 cursor-pointer min-h-[44px]"
          >
            {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showForm ? "Cancel" : "Add Task"}
          </button>
        </div>
      </motion.div>

      {/* Create Form */}
      <AnimatePresence>
        {showForm && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleCreate}
            className="rounded-xl border border-border bg-card p-5 space-y-3 overflow-hidden"
          >
            <div className="flex flex-col sm:flex-row gap-3">
              <input type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Task title" required className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring min-h-[44px]" />
              <select value={newPriority} onChange={(e) => setNewPriority(e.target.value)} className="rounded-lg border border-input bg-background px-3 py-2 text-sm cursor-pointer min-h-[44px]">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <input type="text" value={newSystem} onChange={(e) => setNewSystem(e.target.value)} placeholder="System (e.g., HVAC, Plumbing)" className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring min-h-[44px]" />
              <input type="date" value={newDueDate} onChange={(e) => setNewDueDate(e.target.value)} className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring min-h-[44px]" />
            </div>
            <textarea value={newDescription} onChange={(e) => setNewDescription(e.target.value)} placeholder="Description (optional)" rows={2} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none" />
            <button type="submit" className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors duration-150 cursor-pointer min-h-[44px]">
              Create Task
            </button>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Stats */}
      <motion.div {...fadeIn} transition={{ duration: 0.3, delay: 0.05 }} className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Pending", value: String(pending.length), icon: Clock, color: "text-amber-500" },
          { label: "Overdue", value: String(overdue.length), icon: AlertTriangle, color: "text-red-500" },
          { label: "Completed", value: String(completed.length), icon: CheckCircle2, color: "text-emerald-500" },
        ].map((stat) => (
          <div key={stat.label} className="flex items-center gap-4 rounded-xl border border-border bg-card p-5">
            <stat.icon className={cn("h-5 w-5", stat.color)} />
            <div>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className="text-2xl font-bold font-mono">{stat.value}</p>
            </div>
          </div>
        ))}
      </motion.div>

      {/* Filter */}
      <div className="flex gap-1 rounded-lg border border-input bg-background p-0.5 w-fit">
        {statusFilters.map((f) => (
          <button
            key={f}
            onClick={() => setStatusFilter(f)}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors duration-150 cursor-pointer capitalize min-h-[36px]",
              statusFilter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Task List */}
      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {tasks.map((task, i) => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.2, delay: i * 0.03 }}
              className="flex flex-wrap items-center gap-3 sm:gap-4 rounded-xl border border-border bg-card px-4 sm:px-5 py-3 sm:py-4 transition-all duration-200 hover:shadow-md hover:border-primary/20 min-h-[44px]"
            >
              <button
                onClick={() => handleToggleComplete(task)}
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors cursor-pointer",
                  task.status === "completed"
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-muted-foreground hover:border-primary"
                )}
              >
                {task.status === "completed" && <CheckCircle2 className="h-3.5 w-3.5" />}
              </button>
              <div className="flex-1 min-w-0">
                <p className={cn("text-sm font-medium", task.status === "completed" && "line-through text-muted-foreground")}>{task.title}</p>
                <p className="text-xs text-muted-foreground">{task.system || "General"}</p>
              </div>
              <span className={cn("rounded-md px-2 py-0.5 text-[11px] font-medium", priorityColors[task.priority] || priorityColors.medium)}>
                {task.priority}
              </span>
              {task.due_date && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CalendarDays className="h-3 w-3" />
                  <span className="hidden sm:inline">{new Date(task.due_date).toLocaleDateString()}</span>
                  <span className="sm:hidden">{new Date(task.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                </div>
              )}
              <button onClick={() => handleDelete(task.id)} className="text-muted-foreground hover:text-destructive transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center">
                <Trash2 className="h-4 w-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Empty state */}
      {!loading && tasks.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-3">
            <Wrench className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">No maintenance tasks</p>
          <p className="text-xs text-muted-foreground mt-1">
            Add a task or seed seasonal tasks for your region
          </p>
        </div>
      )}
    </div>
  );
}
