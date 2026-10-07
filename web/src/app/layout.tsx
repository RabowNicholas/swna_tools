import type { Metadata } from "next";
import "./globals.css";
import { LayoutProvider } from "@/components/layout/LayoutProvider";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { ClientProvider } from "@/contexts/ClientContext";
import { SessionProvider } from "@/components/auth/SessionProvider";
import { AnalyticsProvider } from "@/components/analytics/AnalyticsProvider";

export const metadata: Metadata = {
  title: "SWNA Tools",
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
    <html lang="en" className="h-full dark" suppressHydrationWarning>
      <head>
        {/* Apply the saved theme before first paint so light-mode users don't see a dark flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('swna-theme');if(t==='system'){t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}if(t==='light'){document.documentElement.classList.remove('dark');document.documentElement.classList.add('light')}}catch(e){}`,
          }}
        />
      </head>
      <body className="h-full bg-background antialiased">
        <SessionProvider>
          <AnalyticsProvider>
            <ThemeProvider defaultTheme="dark" storageKey="swna-theme">
              <ClientProvider>
                <LayoutProvider>
                  {children}
                </LayoutProvider>
              </ClientProvider>
            </ThemeProvider>
          </AnalyticsProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
