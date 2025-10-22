import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  href?: string;
  current?: boolean;
}

interface BreadcrumbProps extends HTMLAttributes<HTMLElement> {
  items: BreadcrumbItem[];
  showHome?: boolean;
}

const Breadcrumb = forwardRef<HTMLElement, BreadcrumbProps>(
  ({ className, items, showHome = true, ...props }, ref) => {
    return (
      <nav
        ref={ref}
        className={cn("flex", className)}
        aria-label="Breadcrumb"
        {...props}
      >
        <ol className="inline-flex items-center space-x-1 md:space-x-3">
          {showHome && (
            <li className="inline-flex items-center">
              <Link
                href="/"
                className={cn(
                  "inline-flex items-center text-sm font-medium transition-colors",
                  "text-muted-foreground hover:text-foreground",
                  "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-md px-2 py-1"
                )}
              >
                <Home className="w-4 h-4 mr-2" />
                Home
              </Link>
            </li>
          )}
          
          {items.map((item, index) => (
            <li key={index}>
              <div className="flex items-center">
                {(showHome || index > 0) && (
                  <ChevronRight className="w-4 h-4 text-muted-foreground/60 mx-1" />
                )}
                
                {item.href && !item.current ? (
                  <Link
                    href={item.href}
                    className={cn(
                      "text-sm font-medium transition-colors",
                      "text-muted-foreground hover:text-foreground",
                      "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-md px-2 py-1"
                    )}
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span
                    className={cn(
                      "text-sm font-medium",
                      item.current 
                        ? "text-foreground" 
                        : "text-muted-foreground"
                    )}
                    aria-current={item.current ? 'page' : undefined}
                  >
                    {item.label}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ol>
      </nav>
    );
  }
);

Breadcrumb.displayName = 'Breadcrumb';

export { Breadcrumb };
export type { BreadcrumbItem };