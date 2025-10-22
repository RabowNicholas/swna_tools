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
          'inline-flex items-center justify-center font-medium transition-all duration-200',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
          'disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed',
          
          // Border radius
          'rounded-lg',
          
          // Full width
          fullWidth && 'w-full',
          
          // Size variants - Apple HIG compliant touch targets (minimum 44pt)
          size === 'sm' && 'h-11 px-4 text-sm gap-2',
          size === 'default' && 'h-12 px-6 text-base gap-2',
          size === 'lg' && 'h-14 px-8 text-lg gap-2.5',
          size === 'xl' && 'h-16 px-10 text-xl gap-3',
          
          // Apple HIG Button Hierarchy - Primary Actions
          variant === 'primary' && [
            'bg-gradient-to-r from-primary to-primary-hover text-primary-foreground shadow-lg',
            'hover:from-primary-hover hover:to-primary-active hover:shadow-[0_0_20px_rgba(139,92,246,0.4),0_10px_15px_-3px_rgba(0,0,0,0.1)] transform hover:scale-[1.02]',
            'focus-visible:ring-primary focus-visible:ring-2 focus-visible:ring-offset-2',
            'active:from-primary-active active:to-primary-active active:scale-[0.98] active:shadow-md',
            'font-semibold border border-primary-active/20 transition-all duration-200'
          ],
          
          // Secondary Actions - Less prominent
          variant === 'secondary' && [
            'bg-secondary text-secondary-foreground border-2 border-border shadow-md',
            'hover:bg-accent hover:text-accent-foreground hover:shadow-[0_0_15px_rgba(139,92,246,0.25),0_4px_6px_-1px_rgba(0,0,0,0.1)] hover:border-primary/30 transform hover:scale-[1.01]',
            'focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2',
            'active:bg-accent/80 active:scale-[0.98] active:shadow-sm',
            'font-medium transition-all duration-200'
          ],
          
          // Tertiary Actions - Minimal prominence
          variant === 'tertiary' && [
            'text-primary bg-transparent',
            'hover:bg-primary/10 hover:text-primary-hover',
            'focus-visible:ring-primary focus-visible:ring-2',
            'active:bg-primary/20 active:scale-[0.98]',
            'font-medium'
          ],
          
          // Destructive Actions
          variant === 'destructive' && [
            'bg-destructive text-destructive-foreground shadow-md',
            'hover:bg-destructive-hover hover:shadow-lg transform hover:scale-[1.02]',
            'focus-visible:ring-destructive focus-visible:ring-2',
            'active:bg-destructive-hover/80 active:scale-[0.98] active:shadow-sm',
            'font-semibold'
          ],
          
          // Success Actions
          variant === 'success' && [
            'bg-success text-success-foreground shadow-md',
            'hover:bg-success-hover hover:shadow-lg transform hover:scale-[1.02]',
            'focus-visible:ring-success focus-visible:ring-2',
            'active:bg-success-hover/80 active:scale-[0.98] active:shadow-sm',
            'font-semibold'
          ],
          
          // Warning Actions
          variant === 'warning' && [
            'bg-warning text-warning-foreground shadow-md',
            'hover:bg-warning-hover hover:shadow-lg transform hover:scale-[1.02]',
            'focus-visible:ring-warning focus-visible:ring-2',
            'active:bg-warning-hover/80 active:scale-[0.98] active:shadow-sm',
            'font-semibold'
          ],
          
          // Outlined variant
          variant === 'outline' && [
            'border-2 border-primary bg-transparent text-primary shadow-sm',
            'hover:bg-gradient-to-r hover:from-primary hover:to-primary-hover hover:text-primary-foreground hover:shadow-[0_0_20px_rgba(139,92,246,0.5),0_10px_15px_-3px_rgba(0,0,0,0.1)] transform hover:scale-[1.02]',
            'focus-visible:ring-primary focus-visible:ring-2 focus-visible:ring-offset-2',
            'active:bg-primary-active active:text-primary-foreground active:scale-[0.98] active:shadow-md',
            'font-semibold transition-all duration-200'
          ],
          
          // Ghost variant - Minimal visual weight
          variant === 'ghost' && [
            'text-foreground bg-transparent',
            'hover:bg-accent hover:text-accent-foreground hover:shadow-[0_0_10px_rgba(139,92,246,0.2),0_4px_6px_-1px_rgba(0,0,0,0.1)] transform hover:scale-[1.02]',
            'focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-1',
            'active:bg-accent/60 active:scale-[0.98]',
            'font-medium transition-all duration-200'
          ],
          
          // Link variant - Text-only appearance
          variant === 'link' && [
            'text-primary underline-offset-4 bg-transparent h-auto p-0',
            'hover:underline hover:text-primary-hover',
            'focus-visible:ring-primary focus-visible:ring-2 focus-visible:ring-offset-2',
            'active:text-primary-active',
            'font-medium'
          ],
          
          // Hierarchy override for better semantic control
          hierarchy === 'primary' && 'font-semibold shadow-md',
          hierarchy === 'secondary' && 'font-medium shadow-sm',
          hierarchy === 'tertiary' && 'font-normal shadow-none',
          
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