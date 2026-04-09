"use client";

import { ThemeProvider } from "@/components/shared/theme-provider";
import { Sidebar } from "@/components/layout/sidebar";
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
        <main className="flex-1 pl-60 transition-all duration-200">
          <div className="mx-auto max-w-7xl px-6 py-6">{children}</div>
        </main>
      </div>
      <CommandPalette />
      <Toaster
        position="bottom-right"
        toastOptions={{
          className: "bg-card text-card-foreground border-border",
        }}
      />
    </ThemeProvider>
  );
}
