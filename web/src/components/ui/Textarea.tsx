import { TextareaHTMLAttributes, forwardRef, useId } from 'react';
import { cn } from '@/lib/utils';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  variant?: 'default' | 'filled';
  required?: boolean;
  showCharCount?: boolean;
  maxLength?: number;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ 
    className, 
    label, 
    error, 
    helperText, 
    variant = 'default',
    required,
    showCharCount,
    maxLength,
    value,
    id,
    ...props 
  }, ref) => {
    const fallbackId = useId();
    const textareaId = id || fallbackId;
    const currentLength = typeof value === 'string' ? value.length : 0;
    
    return (
      <div className="w-full">
        {label && (
          <label 
            htmlFor={textareaId}
            className={cn(
              "block text-sm font-medium mb-2 transition-colors",
              error ? "text-destructive" : "text-foreground",
              "focus-within:text-primary"
            )}
          >
            {label}
            {required && (
              <span className="text-red-500 ml-1" aria-label="required">*</span>
            )}
          </label>
        )}
        
        <div className="relative">
          <textarea
            ref={ref}
            id={textareaId}
            value={value}
            maxLength={maxLength}
            className={cn(
              // Base styles
              "block w-full rounded-lg border transition-all duration-200",
              "text-foreground placeholder-muted-foreground",
              "focus:outline-none focus:ring-2 focus:ring-offset-1",
              "resize-vertical min-h-[100px]",
              
              // Size and spacing
              "px-4 py-3",
              
              // Variants
              variant === 'default' && [
                "bg-input border-border",
                "hover:border-ring/50",
                "focus:border-ring focus:ring-ring/20"
              ],
              
              variant === 'filled' && [
                "bg-muted border-border",
                "hover:bg-muted/80 hover:border-ring/50",
                "focus:bg-input focus:border-ring focus:ring-ring/20"
              ],
              
              // Error state
              error && [
                "border-destructive/50 bg-destructive/5",
                "hover:border-destructive",
                "focus:border-destructive focus:ring-destructive/20"
              ],
              
              // Disabled state
              "disabled:bg-muted disabled:border-muted disabled:text-muted-foreground disabled:cursor-not-allowed disabled:resize-none",
              
              className
            )}
            onFocus={props.onFocus}
            onBlur={props.onBlur}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={cn(
              error && `${textareaId}-error`,
              helperText && `${textareaId}-helper`,
              showCharCount && `${textareaId}-count`
            )}
            {...props}
          />
        </div>
        
        {/* Character count and helper text row */}
        <div className="mt-2 flex justify-between items-start">
          <div className="flex-1">
            {/* Error message */}
            {error && (
              <p 
                id={`${textareaId}-error`}
                className="text-sm text-destructive flex items-center"
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
                id={`${textareaId}-helper`}
                className="text-sm text-muted-foreground"
              >
                {helperText}
              </p>
            )}
          </div>
          
          {/* Character count */}
          {showCharCount && maxLength && (
            <p 
              id={`${textareaId}-count`}
              className={cn(
                "text-sm ml-4 flex-shrink-0",
                currentLength > maxLength * 0.9 ? "text-destructive" : "text-muted-foreground"
              )}
              aria-live="polite"
            >
              {currentLength}/{maxLength}
            </p>
          )}
        </div>
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

export { Textarea };