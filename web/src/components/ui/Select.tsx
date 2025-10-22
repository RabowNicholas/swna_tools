import { SelectHTMLAttributes, forwardRef, useId } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options?: SelectOption[];
  placeholder?: string;
  required?: boolean;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ 
    className, 
    label, 
    error, 
    helperText, 
    options = [],
    placeholder,
    required,
    children,
    id,
    ...props 
  }, ref) => {
    const fallbackId = useId();
    const selectId = id || fallbackId;
    
    return (
      <div className="w-full">
        {label && (
          <label 
            htmlFor={selectId}
            className={cn(
              "block text-sm font-medium mb-2 transition-colors",
              error ? "text-destructive" : "text-foreground"
            )}
          >
            {label}
            {required && (
              <span className="text-red-500 ml-1" aria-label="required">*</span>
            )}
          </label>
        )}
        
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={cn(
              // Base styles
              "block w-full rounded-lg border transition-all duration-200",
              "text-foreground bg-input",
              "focus:outline-none focus:ring-2 focus:ring-offset-1",
              "appearance-none cursor-pointer",
              
              // Size and spacing
              "px-4 py-3 pr-10",
              
              // Default state
              "border-border hover:border-ring/50",
              "focus:border-ring focus:ring-ring/20",
              
              // Error state
              error && [
                "border-destructive/50 bg-destructive/5",
                "hover:border-destructive",
                "focus:border-destructive focus:ring-destructive/20"
              ],
              
              // Disabled state
              "disabled:bg-muted disabled:border-muted disabled:text-muted-foreground disabled:cursor-not-allowed",
              
              className
            )}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={cn(
              error && `${selectId}-error`,
              helperText && `${selectId}-helper`
            )}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            
            {options.map((option) => (
              <option 
                key={option.value} 
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </option>
            ))}
            
            {children}
          </select>
          
          {/* Dropdown arrow */}
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <ChevronDown 
              className={cn(
                "h-5 w-5 transition-colors",
                error ? "text-destructive" : "text-muted-foreground"
              )}
            />
          </div>
        </div>
        
        {/* Error message */}
        {error && (
          <p 
            id={`${selectId}-error`}
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
            id={`${selectId}-helper`}
            className="mt-2 text-sm text-muted-foreground"
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

export { Select };
export type { SelectOption };