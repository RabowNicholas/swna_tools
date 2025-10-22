import { HTMLAttributes, forwardRef, useId } from 'react';
import { cn } from '@/lib/utils';

interface ProgressProps extends HTMLAttributes<HTMLDivElement> {
  value?: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'success' | 'warning' | 'error';
  showLabel?: boolean;
  label?: string;
}

const Progress = forwardRef<HTMLDivElement, ProgressProps>(
  ({ 
    className, 
    value = 0, 
    max = 100, 
    size = 'md',
    variant = 'default',
    showLabel = false,
    label,
    ...props 
  }, ref) => {
    const fallbackId = useId();
    const progressId = `progress-${fallbackId}`;
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
    
    return (
      <div className="w-full">
        {(showLabel || label) && (
          <div className="flex justify-between items-center mb-2">
            <span 
              id={`${progressId}-label`}
              className="text-sm font-medium text-foreground"
            >
              {label || 'Progress'}
            </span>
            <span className="text-sm text-muted-foreground">
              {Math.round(percentage)}%
            </span>
          </div>
        )}
        
        <div
          ref={ref}
          className={cn(
            // Base styles
            "w-full bg-secondary rounded-full overflow-hidden",
            
            // Size variants
            size === 'sm' && "h-1",
            size === 'md' && "h-2",
            size === 'lg' && "h-3",
            
            className
          )}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={max}
          aria-labelledby={(showLabel || label) ? `${progressId}-label` : undefined}
          aria-label={!showLabel && !label ? 'Progress' : undefined}
          {...props}
        >
          <div
            className={cn(
              // Base styles
              "h-full transition-all duration-300 ease-out rounded-full",
              
              // Color variants using CSS custom properties
              variant === 'default' && "bg-primary",
              variant === 'success' && "bg-success",
              variant === 'warning' && "bg-warning",
              variant === 'error' && "bg-destructive"
            )}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    );
  }
);

Progress.displayName = 'Progress';

export { Progress };