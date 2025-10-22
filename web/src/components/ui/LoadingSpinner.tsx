import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps extends HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'primary' | 'secondary';
  label?: string;
  center?: boolean;
}

const LoadingSpinner = forwardRef<HTMLDivElement, LoadingSpinnerProps>(
  ({ 
    className, 
    size = 'md', 
    variant = 'default',
    label = 'Loading',
    center = false,
    ...props 
  }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex items-center gap-2',
          center && 'justify-center',
          className
        )}
        role="status"
        aria-live="polite"
        aria-label={label}
        {...props}
      >
        <Loader2 
          className={cn(
            'animate-spin',
            
            // Size variants
            size === 'sm' && 'h-4 w-4',
            size === 'md' && 'h-6 w-6',
            size === 'lg' && 'h-8 w-8',
            size === 'xl' && 'h-12 w-12',
            
            // Color variants
            variant === 'default' && 'text-muted-foreground',
            variant === 'primary' && 'text-primary',
            variant === 'secondary' && 'text-secondary-foreground'
          )}
        />
        
        {label && (
          <span className={cn(
            'text-muted-foreground',
            size === 'sm' && 'text-xs',
            size === 'md' && 'text-sm',
            size === 'lg' && 'text-base',
            size === 'xl' && 'text-lg'
          )}>
            {label}
          </span>
        )}
      </div>
    );
  }
);

LoadingSpinner.displayName = 'LoadingSpinner';

interface LoadingOverlayProps extends HTMLAttributes<HTMLDivElement> {
  visible: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  label?: string;
  backdrop?: boolean;
}

const LoadingOverlay = forwardRef<HTMLDivElement, LoadingOverlayProps>(
  ({
    className,
    visible,
    size = 'lg',
    label = 'Loading...',
    backdrop = true,
    ...props
  }, ref) => {
    if (!visible) return null;

    return (
      <div
        ref={ref}
        className={cn(
          'fixed inset-0 z-50 flex items-center justify-center',
          backdrop && 'bg-background/80 backdrop-blur-sm',
          className
        )}
        {...props}
      >
        <div className="text-center space-y-4">
          <LoadingSpinner size={size} variant="primary" label="" center />
          {label && (
            <p className="text-foreground font-medium">
              {label}
            </p>
          )}
        </div>
      </div>
    );
  }
);

LoadingOverlay.displayName = 'LoadingOverlay';

export { LoadingSpinner, LoadingOverlay };