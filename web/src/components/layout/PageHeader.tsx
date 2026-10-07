'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { findTool } from '@/lib/tools';

interface PageHeaderProps {
  /** Defaults to the tool's name in lib/tools.ts */
  title?: string;
  /** Defaults to the tool's one-line description in lib/tools.ts */
  description?: React.ReactNode;
  /** Optional controls shown on the right, e.g. a mode switch */
  actions?: React.ReactNode;
}

/** The same header on every tool page: which situation it belongs to, its name, and what it does. */
export function PageHeader({ title, description, actions }: PageHeaderProps) {
  const pathname = usePathname();
  const found = findTool(pathname);

  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0 space-y-1">
        {found && (
          <Link
            href={`/#${found.section.id}`}
            className="text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            {found.section.title}
          </Link>
        )}
        <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-foreground">
          {title ?? found?.tool.name}
        </h1>
        {(description ?? found?.tool.description) && (
          <p className="text-[15px] text-muted-foreground">{description ?? found?.tool.description}</p>
        )}
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </header>
  );
}
