import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { LayoutProvider } from "@/components/layout/LayoutProvider";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { ClientProvider } from "@/contexts/ClientContext";
import { SessionProvider } from "@/components/auth/SessionProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SWNA Tools - Legal Document Generation",
  description: "Professional legal document generation and client management tools",
  keywords: "legal documents, client management, forms, EE-3, invoicing",
  authors: [{ name: "SWNA Tools" }],
  viewport: "width=device-width, initial-scale=1",
  robots: "index, follow",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body className={`${inter.className} h-full bg-background antialiased`}>
        <SessionProvider>
          <ThemeProvider defaultTheme="system" storageKey="swna-theme">
            <ClientProvider>
              <LayoutProvider>
                {children}
              </LayoutProvider>
            </ClientProvider>
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
