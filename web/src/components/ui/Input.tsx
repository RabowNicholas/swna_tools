import { InputHTMLAttributes, forwardRef, useState, useId } from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  variant?: 'default' | 'filled';
  icon?: React.ReactNode;
  required?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ 
    className, 
    label, 
    error, 
    helperText, 
    variant = 'default', 
    icon, 
    required,
    id,
    ...props 
  }, ref) => {
    const [isFocused, setIsFocused] = useState(false);
    const fallbackId = useId();
    const inputId = id || fallbackId;
    
    return (
      <div className="w-full">
        {label && (
          <label 
            htmlFor={inputId}
            className={cn(
              "block text-sm font-medium mb-2 transition-colors",
              error ? "text-destructive" : "text-foreground",
              "focus-within:text-primary"
            )}
          >
            {label}
            {required && (
              <span className="text-destructive ml-1" aria-label="required">*</span>
            )}
          </label>
        )}
        
        <div className="relative">
          {icon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <div className={cn(
                "h-5 w-5 transition-colors",
                error ? "text-destructive" : isFocused ? "text-primary" : "text-muted-foreground"
              )}>
                {icon}
              </div>
            </div>
          )}
          
          <input
            ref={ref}
            id={inputId}
            style={error ? {
              borderColor: 'var(--destructive)',
              backgroundColor: 'color-mix(in srgb, var(--destructive) 10%, transparent)',
              '--tw-ring-color': 'color-mix(in srgb, var(--destructive) 50%, transparent)',
            } as React.CSSProperties : undefined}
            className={cn(
              // Base styles
              "block w-full rounded-lg border transition-all duration-200",
              "text-foreground placeholder-muted-foreground",
              "focus:outline-none focus:ring-2 focus:ring-offset-1",

              // Size and spacing
              icon ? "pl-10 pr-4 py-3" : "px-4 py-3",

              // Variants (only apply if no error)
              !error && variant === 'default' && [
                "bg-input border-border",
                "hover:border-border/80",
                "focus:border-ring focus:ring-ring/20"
              ],

              !error && variant === 'filled' && [
                "bg-muted border-border",
                "hover:bg-accent hover:border-border/80",
                "focus:bg-input focus:border-ring focus:ring-ring/20"
              ],

              // Disabled state
              "disabled:bg-muted disabled:border-border disabled:text-muted-foreground disabled:cursor-not-allowed",

              className
            )}
            onFocus={(e) => {
              setIsFocused(true);
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              setIsFocused(false);
              props.onBlur?.(e);
            }}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={cn(
              error && `${inputId}-error`,
              helperText && `${inputId}-helper`
            )}
            {...props}
          />
        </div>
        
        {/* Error message */}
        {error && (
          <p 
            id={`${inputId}-error`}
            className="mt-2 text-sm text-destructive flex items-center"
            role="alert"
            aria-live="polite"
          >
            <svg className="h-4 w-4 mr-1 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </p>
        )}
        
        {/* Helper text */}
        {helperText && !error && (
          <p 
            id={`${inputId}-helper`}
            className="mt-2 text-sm text-muted-foreground"
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input };