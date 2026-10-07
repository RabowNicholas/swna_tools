'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { Search, LogOut, Sun, Moon, Monitor } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TOOL_SECTIONS, searchTools } from '@/lib/tools';
import { useTheme } from '@/components/theme/ThemeProvider';

function NavLink({
  href,
  children,
  onNavigate,
}: {
  href: string;
  children: React.ReactNode;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const active = pathname === href;
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'block rounded-md px-2.5 py-1.5 text-[14px] transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        active
          ? 'bg-primary text-primary-foreground font-medium'
          : 'text-foreground hover:bg-accent'
      )}
    >
      {children}
    </Link>
  );
}

function ThemeSwitch() {
  const { theme, setTheme } = useTheme();
  const options = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'Auto', icon: Monitor },
  ] as const;
  return (
    <div role="radiogroup" aria-label="Appearance" className="grid grid-cols-3 gap-0.5 rounded-lg bg-accent p-0.5">
      {options.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={theme === value}
          onClick={() => setTheme(value)}
          className={cn(
            'flex items-center justify-center gap-1 rounded-md py-1 text-xs transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            theme === value
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Icon className="h-3.5 w-3.5" aria-hidden />
          {label}
        </button>
      ))}
    </div>
  );
}

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const router = useRouter();
  const { data: session } = useSession();
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const results = searchTools(query);

  // ⌘K / Ctrl+K jumps to the search box (it doesn't override any standard browser shortcut)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const go = (href: string) => {
    setQuery('');
    setHighlight(0);
    inputRef.current?.blur();
    onNavigate?.();
    router.push(href);
  };

  const onSearchKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter' && results[highlight]) {
      e.preventDefault();
      go(results[highlight].tool.href);
    } else if (e.key === 'Escape') {
      setQuery('');
      inputRef.current?.blur();
    }
  };

  const everyday = TOOL_SECTIONS.filter((s) => !s.manage);
  const manage = TOOL_SECTIONS.filter((s) => s.manage);

  return (
    <div className="flex h-full flex-col bg-sidebar">
      <div className="px-4 pt-5 pb-3">
        <Link
          href="/"
          onClick={onNavigate}
          className="block px-1 text-[15px] font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
        >
          SWNA Tools
        </Link>

        <div className="relative mt-4">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setHighlight(0);
            }}
            onKeyDown={onSearchKey}
            placeholder="Find a tool"
            aria-label="Find a tool"
            className="w-full rounded-lg border border-border bg-input py-1.5 pl-8 pr-10 text-[14px] text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {!query && (
            <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded border border-border px-1 text-[11px] text-muted-foreground">
              ⌘K
            </kbd>
          )}
        </div>
      </div>

      <nav aria-label="Tools" className="flex-1 overflow-y-auto px-3 pb-4">
        {query.trim() ? (
          results.length ? (
            <ul className="space-y-0.5">
              {results.map(({ tool, section }, i) => (
                <li key={tool.href}>
                  <button
                    type="button"
                    onClick={() => go(tool.href)}
                    onMouseEnter={() => setHighlight(i)}
                    className={cn(
                      'w-full rounded-md px-2.5 py-1.5 text-left transition-colors',
                      i === highlight ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-accent'
                    )}
                  >
                    <div className="text-[14px]">{tool.name}</div>
                    <div className={cn('text-xs', i === highlight ? 'text-primary-foreground/80' : 'text-muted-foreground')}>
                      {section.title}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-2.5 py-1.5 text-sm text-muted-foreground">No tools match “{query}”.</p>
          )
        ) : (
          <>
            <NavLink href="/" onNavigate={onNavigate}>Home</NavLink>
            {everyday.map((section) => (
              <div key={section.id} className="mt-5">
                <h2 className="px-2.5 pb-1 text-xs font-semibold text-muted-foreground">{section.title}</h2>
                <div className="space-y-0.5">
                  {section.tools.map((tool) => (
                    <NavLink key={tool.href} href={tool.href} onNavigate={onNavigate}>
                      {tool.name}
                    </NavLink>
                  ))}
                </div>
              </div>
            ))}
            {manage.map((section) => (
              <div key={section.id} className="mt-6 border-t border-border pt-4">
                <h2 className="px-2.5 pb-1 text-xs font-semibold text-muted-foreground">{section.title}</h2>
                <div className="space-y-0.5">
                  {section.tools.map((tool) => (
                    <NavLink key={tool.href} href={tool.href} onNavigate={onNavigate}>
                      {tool.name}
                    </NavLink>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}
      </nav>

      <div className="space-y-3 border-t border-border px-4 py-4">
        <ThemeSwitch />
        {session?.user && (
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-xs text-muted-foreground">
              {session.user.name || session.user.email}
            </span>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="flex shrink-0 items-center gap-1 rounded-md px-1.5 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden />
              Sign out
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
