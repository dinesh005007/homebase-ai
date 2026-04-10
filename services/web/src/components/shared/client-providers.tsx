"use client";

import { ThemeProvider } from "@/components/shared/theme-provider";
import { Sidebar } from "@/components/layout/sidebar";
import { BottomNav } from "@/components/layout/bottom-nav";
import { CommandPalette } from "@/components/shared/command-palette";
import { Toaster } from "sonner";

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
    >
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 lg:pl-60 pb-16 lg:pb-0 transition-all duration-200">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 py-4 sm:py-6">{children}</div>
        </main>
      </div>
      <BottomNav />
      <CommandPalette />
      <Toaster
        position="top-center"
        toastOptions={{
          className: "bg-card text-card-foreground border-border",
        }}
      />
    </ThemeProvider>
  );
}
