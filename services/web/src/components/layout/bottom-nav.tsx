"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  MessageSquare,
  FileText,
  Wrench,
  MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MoreDrawer } from "./more-drawer";

const tabs = [
  { href: "/", label: "Home", icon: Home },
  { href: "/ask", label: "Chat", icon: MessageSquare },
  { href: "/documents", label: "Docs", icon: FileText },
  { href: "/maintenance", label: "Tasks", icon: Wrench },
];

export function BottomNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  // Check if "More" items are active
  const moreActive = ["/home-profile", "/coverage", "/smart-home", "/settings"].some(
    (p) => pathname.startsWith(p)
  );

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex lg:hidden border-t border-border bg-background/80 backdrop-blur-xl" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="flex w-full items-stretch">
          {tabs.map((tab) => {
            const isActive =
              tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "flex flex-1 flex-col items-center justify-center gap-0.5 py-2 min-h-[56px] transition-colors duration-150",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground active:text-foreground"
                )}
              >
                <tab.icon className="h-5 w-5" />
                <span className="text-[10px] font-medium">{tab.label}</span>
              </Link>
            );
          })}
          {/* More tab */}
          <button
            onClick={() => setMoreOpen(true)}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-0.5 py-2 min-h-[56px] transition-colors duration-150 cursor-pointer",
              moreActive
                ? "text-primary"
                : "text-muted-foreground active:text-foreground"
            )}
          >
            <MoreHorizontal className="h-5 w-5" />
            <span className="text-[10px] font-medium">More</span>
          </button>
        </div>
      </nav>

      <MoreDrawer open={moreOpen} onOpenChange={setMoreOpen} />
    </>
  );
}
