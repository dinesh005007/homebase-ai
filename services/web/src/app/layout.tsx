import type { Metadata } from "next";
import "./globals.css";
import { ClientProviders } from "@/components/shared/client-providers";

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
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
