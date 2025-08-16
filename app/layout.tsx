import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navigation } from "@/components/navigation";
import { KeyboardShortcuts } from "@/components/keyboard-shortcuts";
import { Toaster } from "@/components/ui/toaster";
import ClientOnly from "@/components/common/ClientOnly";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Insurance Launcher",
  description: "Insurance sales CRM with zero lost follow-ups",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} h-full overflow-hidden`}>
        <KeyboardShortcuts />
        <div className="grid h-full grid-rows-[auto,1fr]">
          <Navigation className="sticky top-0 z-50" />
          <main className="min-h-0 overflow-hidden">
            {children}
          </main>
        </div>
        <div suppressHydrationWarning>
          <ClientOnly>
            <Toaster richColors position="bottom-right" />
          </ClientOnly>
        </div>
      </body>
    </html>
  );
}
