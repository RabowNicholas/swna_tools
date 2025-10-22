import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'success' | 'warning' | 'error' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  /** Semantic role for the badge - use 'status' for status indicators, 'img' for decorative badges */
  role?: 'status' | 'img';
  /** Accessible label for screen readers */
  'aria-label'?: string;
}

const Badge = forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = 'default', size = 'md', role = 'status', ...props }, ref) => {
    return (
      <div
        ref={ref}
        role={role}
        className={cn(
          // Base styles
          "inline-flex items-center font-medium rounded-full transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          
          // Size variants
          size === 'sm' && "px-2 py-0.5 text-xs",
          size === 'md' && "px-2.5 py-1 text-sm", 
          size === 'lg' && "px-3 py-1.5 text-base",
          
          // Color variants using CSS custom properties
          variant === 'default' && "bg-primary/10 text-primary border border-primary/20",
          variant === 'secondary' && "bg-secondary text-secondary-foreground border border-border",
          variant === 'success' && "bg-success/10 text-success border border-success/20",
          variant === 'warning' && "bg-warning/10 text-warning border border-warning/20",
          variant === 'error' && "bg-destructive/10 text-destructive border border-destructive/20",
          variant === 'outline' && "border border-border text-foreground bg-transparent",
          
          className
        )}
        {...props}
      />
    );
  }
);

Badge.displayName = 'Badge';

export { Badge };