import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/shared/theme-provider";
import { Sidebar } from "@/components/layout/sidebar";
import { CommandPalette } from "@/components/shared/command-palette";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "HomeBase AI",
  description: "Local-first family home operating system",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen antialiased">
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
      </body>
    </html>
  );
}
