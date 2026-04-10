"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Drawer } from "vaul";
import {
  Building2,
  Shield,
  Wifi,
  Settings,
  Sun,
  Moon,
} from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

const moreItems = [
  { href: "/home-profile", label: "Home Profile", icon: Building2 },
  { href: "/coverage", label: "Coverage", icon: Shield },
  { href: "/smart-home", label: "Smart Home", icon: Wifi },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function MoreDrawer({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl bg-card border-t border-border" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
          </div>

          <Drawer.Title className="sr-only">More options</Drawer.Title>

          {/* Nav items */}
          <nav className="px-4 pb-4 space-y-1">
            {moreItems.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => onOpenChange(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm font-medium transition-colors duration-150 min-h-[44px]",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-foreground hover:bg-accent"
                  )}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}

            {/* Theme toggle */}
            {mounted && (
              <button
                onClick={() => {
                  setTheme(theme === "dark" ? "light" : "dark");
                  onOpenChange(false);
                }}
                className="flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-sm font-medium text-foreground hover:bg-accent transition-colors duration-150 min-h-[44px] cursor-pointer"
              >
                {theme === "dark" ? (
                  <Sun className="h-5 w-5 shrink-0" />
                ) : (
                  <Moon className="h-5 w-5 shrink-0" />
                )}
                <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
              </button>
            )}
          </nav>

          {/* Version */}
          <div className="border-t border-border px-4 py-3 text-center text-[10px] text-muted-foreground">
            HomeBase AI v0.1.0
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
