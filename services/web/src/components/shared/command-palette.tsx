"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import {
  Home,
  MessageSquare,
  FileText,
  Building2,
  Wrench,
  Settings,
  Search,
  Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";

const pages = [
  { name: "Dashboard", href: "/", icon: Home, group: "Navigation" },
  { name: "AI Chat", href: "/ask", icon: MessageSquare, group: "Navigation" },
  { name: "Document Vault", href: "/documents", icon: FileText, group: "Navigation" },
  { name: "Home Profile", href: "/home-profile", icon: Building2, group: "Navigation" },
  { name: "Maintenance", href: "/maintenance", icon: Wrench, group: "Navigation" },
  { name: "Settings", href: "/settings", icon: Settings, group: "Navigation" },
];

const actions = [
  { name: "Upload Document", href: "/documents", icon: Upload, group: "Actions" },
  { name: "Ask a Question", href: "/ask", icon: MessageSquare, group: "Actions" },
  { name: "Search Documents", href: "/documents", icon: Search, group: "Actions" },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const navigate = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />
      <div className="fixed left-1/2 top-[20%] z-50 w-full max-w-lg -translate-x-1/2">
        <Command
          className="rounded-xl border border-border bg-card shadow-2xl overflow-hidden"
          label="Command palette"
        >
          <div className="flex items-center gap-2 border-b border-border px-4">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <Command.Input
              placeholder="Search pages, actions..."
              className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            <kbd className="hidden sm:inline-flex h-5 items-center rounded border border-border bg-muted px-1.5 text-[10px] font-mono text-muted-foreground">
              ESC
            </kbd>
          </div>
          <Command.List className="max-h-80 overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
              No results found.
            </Command.Empty>

            <Command.Group heading="Navigation" className="text-xs font-medium text-muted-foreground px-2 py-1.5">
              {pages.map((item) => (
                <Command.Item
                  key={item.href}
                  value={item.name}
                  onSelect={() => navigate(item.href)}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm cursor-pointer aria-selected:bg-accent aria-selected:text-accent-foreground"
                >
                  <item.icon className="h-4 w-4 text-muted-foreground" />
                  {item.name}
                </Command.Item>
              ))}
            </Command.Group>

            <Command.Separator className="my-1 h-px bg-border" />

            <Command.Group heading="Actions" className="text-xs font-medium text-muted-foreground px-2 py-1.5">
              {actions.map((item) => (
                <Command.Item
                  key={item.name}
                  value={item.name}
                  onSelect={() => navigate(item.href)}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm cursor-pointer aria-selected:bg-accent aria-selected:text-accent-foreground"
                >
                  <item.icon className="h-4 w-4 text-muted-foreground" />
                  {item.name}
                </Command.Item>
              ))}
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
