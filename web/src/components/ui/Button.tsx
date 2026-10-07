import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'tertiary' | 'destructive' | 'outline' | 'ghost' | 'link' | 'success' | 'warning';
  size?: 'sm' | 'default' | 'lg' | 'xl';
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  hierarchy?: 'primary' | 'secondary' | 'tertiary';
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className, 
    variant = 'primary', 
    size = 'default', 
    loading = false,
    icon,
    iconPosition = 'left',
    fullWidth = false,
    hierarchy,
    children,
    disabled,
    ...props 
  }, ref) => {
    const isDisabled = disabled || loading;
    
    return (
      <button
        className={cn(
          // Base styles
          'inline-flex items-center justify-center font-medium transition-colors duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          'disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed',
          
          // Border radius
          'rounded-lg',
          
          // Full width
          fullWidth && 'w-full',
          
          // Size variants
          size === 'sm' && 'h-9 px-3.5 text-sm gap-1.5',
          size === 'default' && 'h-10 px-4 text-[15px] gap-2',
          size === 'lg' && 'h-11 px-5 text-[15px] gap-2',
          size === 'xl' && 'h-12 px-6 text-base gap-2.5',

          // Flat, calm fills. Color carries meaning: blue = the main action,
          // red = destructive, green = success. No gradients, glows or scaling.
          variant === 'primary' && 'bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-active focus-visible:ring-primary',
          variant === 'secondary' && 'bg-secondary text-secondary-foreground border border-border hover:bg-accent focus-visible:ring-ring',
          variant === 'tertiary' && 'text-primary bg-transparent hover:bg-primary/10 focus-visible:ring-primary',
          variant === 'destructive' && 'bg-destructive text-destructive-foreground hover:bg-destructive-hover focus-visible:ring-destructive',
          variant === 'success' && 'bg-success text-success-foreground hover:bg-success-hover focus-visible:ring-success',
          variant === 'warning' && 'bg-warning text-warning-foreground hover:bg-warning-hover focus-visible:ring-warning',
          variant === 'outline' && 'border border-border bg-transparent text-foreground hover:bg-accent focus-visible:ring-ring',
          variant === 'ghost' && 'text-foreground bg-transparent hover:bg-accent focus-visible:ring-ring',
          variant === 'link' && 'text-primary underline-offset-4 bg-transparent h-auto p-0 hover:underline focus-visible:ring-primary',

          // Hierarchy override for better semantic control
          hierarchy === 'tertiary' && 'font-normal',
          
          className
        )}
        ref={ref}
        disabled={isDisabled}
        aria-busy={loading}
        {...props}
      >
        {/* Left icon or loading spinner */}
        {loading && (
          <Loader2 className={cn(
            'animate-spin',
            size === 'sm' && 'h-4 w-4',
            size === 'default' && 'h-5 w-5',
            size === 'lg' && 'h-5 w-5',
            size === 'xl' && 'h-6 w-6'
          )} />
        )}
        
        {!loading && icon && iconPosition === 'left' && (
          <span className={cn(
            'flex-shrink-0',
            size === 'sm' && 'h-4 w-4',
            size === 'default' && 'h-5 w-5',
            size === 'lg' && 'h-5 w-5',
            size === 'xl' && 'h-6 w-6'
          )}>
            {icon}
          </span>
        )}
        
        {/* Button text */}
        {children && (
          <span className={loading ? 'opacity-70' : ''}>
            {children}
          </span>
        )}
        
        {/* Right icon */}
        {!loading && icon && iconPosition === 'right' && (
          <span className={cn(
            'flex-shrink-0',
            size === 'sm' && 'h-4 w-4',
            size === 'default' && 'h-5 w-5',
            size === 'lg' && 'h-5 w-5',
            size === 'xl' && 'h-6 w-6'
          )}>
            {icon}
          </span>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button };