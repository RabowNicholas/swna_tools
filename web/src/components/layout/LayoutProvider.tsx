'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { Sidebar } from './Sidebar';

interface LayoutProviderProps {
  children: React.ReactNode;
}

export function LayoutProvider({ children }: LayoutProviderProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  // Close the phone menu whenever the page changes
  useEffect(() => setMenuOpen(false), [pathname]);

  // The sign-in page stands on its own, without the app's navigation
  if (pathname === '/login') return <>{children}</>;

  return (
    <div className="flex min-h-full">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 border-r border-border">
        <div className="sticky top-0 h-screen">
          <Sidebar />
        </div>
      </aside>

      {/* Phone / narrow-window sidebar */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMenuOpen(false)} aria-hidden />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] border-r border-border shadow-lg">
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              aria-label="Close menu"
              className="absolute right-3 top-4 z-10 rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
            <Sidebar onNavigate={() => setMenuOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="sticky top-0 z-40 flex h-12 items-center gap-2 border-b border-border bg-background/90 px-3 backdrop-blur lg:hidden">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            className="rounded-md p-1.5 text-foreground hover:bg-accent"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="text-[0.9375rem] font-semibold">SWNA Tools</span>
        </div>

        <main id="main-content" className="flex-1 px-4 py-8 sm:px-8 lg:px-12 lg:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}
