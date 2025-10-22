import React from 'react';
import { cn } from '@/lib/utils';
import { Typography, TextHierarchy } from './Typography';
import { VStack, HStack } from './Spacing';
import { Surface } from './Surface';
import { Input } from './Input';
import { Button } from './Button';
import { AlertCircle, Info, CheckCircle, HelpCircle } from 'lucide-react';

interface FieldGroupProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  required?: boolean;
  error?: string;
  className?: string;
  layout?: 'vertical' | 'horizontal' | 'inline';
  spacing?: 'xs' | 'sm' | 'md' | 'lg';
}

export const FieldGroup: React.FC<FieldGroupProps> = ({
  children,
  title,
  description,
  required = false,
  error,
  className,
  layout = 'vertical',
  spacing = 'md'
}) => {
  const Container = layout === 'horizontal' ? HStack : VStack;
  const containerSpacing = layout === 'inline' ? 'sm' : spacing;

  return (
    <div className={cn('w-full', className)}>
      <VStack size="sm">
        {(title || description) && (
          <div>
            {title && (
              <TextHierarchy.FormLabel required={required}>
                {title}
              </TextHierarchy.FormLabel>
            )}
            {description && (
              <TextHierarchy.HelperText>
                {description}
              </TextHierarchy.HelperText>
            )}
          </div>
        )}
        
        <Container size={containerSpacing} className={cn(
          layout === 'horizontal' && 'items-start',
          layout === 'inline' && 'flex-wrap'
        )}>
          {children}
        </Container>
        
        {error && (
          <Surface
            elevation="raised"
            padding="sm"
            rounded="md"
            className="border border-destructive/30 bg-destructive/10"
          >
            <HStack size="sm">
              <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
              <Typography.Body size="small" className="text-destructive">
                {error}
              </Typography.Body>
            </HStack>
          </Surface>
        )}
      </VStack>
    </div>
  );
};

interface FormRowProps {
  children: React.ReactNode;
  columns?: 1 | 2 | 3 | 4;
  gap?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  responsive?: boolean;
  className?: string;
}

export const FormRow: React.FC<FormRowProps> = ({
  children,
  columns = 2,
  gap = 'md',
  responsive = true,
  className
}) => {
  return (
    <div className={cn(
      'grid w-full',
      // Base columns
      columns === 1 && 'grid-cols-1',
      columns === 2 && (responsive ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-2'),
      columns === 3 && (responsive ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-3'),
      columns === 4 && (responsive ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4' : 'grid-cols-4'),
      
      // Gap
      gap === 'xs' && 'gap-2',
      gap === 'sm' && 'gap-3',
      gap === 'md' && 'gap-4',
      gap === 'lg' && 'gap-6',
      gap === 'xl' && 'gap-8',
      
      className
    )}>
      {children}
    </div>
  );
};

interface HelpTooltipProps {
  content: React.ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

export const HelpTooltip: React.FC<HelpTooltipProps> = ({
  content,
  side = 'top',
  className
}) => {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div className={cn('relative inline-block', className)}>
      <Button
        variant="ghost"
        size="sm"
        className="h-6 w-6 p-0 hover:bg-accent/50"
        onClick={() => setIsOpen(!isOpen)}
        onBlur={() => setTimeout(() => setIsOpen(false), 150)}
        aria-label="Help information"
      >
        <HelpCircle className="h-4 w-4 text-muted-foreground" />
      </Button>
      
      {isOpen && (
        <Surface
          elevation="overlay"
          padding="sm"
          rounded="md"
          className={cn(
            'absolute z-50 w-64 border border-border/50',
            'animate-fade-in',
            side === 'top' && 'bottom-full mb-2 left-1/2 -translate-x-1/2',
            side === 'bottom' && 'top-full mt-2 left-1/2 -translate-x-1/2',
            side === 'left' && 'right-full mr-2 top-1/2 -translate-y-1/2',
            side === 'right' && 'left-full ml-2 top-1/2 -translate-y-1/2'
          )}
        >
          <Typography.Body size="small">
            {content}
          </Typography.Body>
        </Surface>
      )}
    </div>
  );
};

interface FieldStatusProps {
  status: 'idle' | 'success' | 'error' | 'warning' | 'loading';
  message?: string;
  className?: string;
}

export const FieldStatus: React.FC<FieldStatusProps> = ({
  status,
  message,
  className
}) => {
  if (status === 'idle' || !message) return null;

  const StatusIcon = () => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-warning" />;
      case 'loading':
        return (
          <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        );
      default:
        return <Info className="h-4 w-4 text-primary" />;
    }
  };

  return (
    <HStack size="sm" className={cn('mt-1', className)}>
      <StatusIcon />
      <Typography.Body size="small" className={cn(
        status === 'success' && 'text-success',
        status === 'error' && 'text-destructive',
        status === 'warning' && 'text-warning',
        status === 'loading' && 'text-primary'
      )}>
        {message}
      </Typography.Body>
    </HStack>
  );
};

interface ConditionalFieldProps {
  children: React.ReactNode;
  condition: boolean;
  fallback?: React.ReactNode;
  animate?: boolean;
  className?: string;
}

export const ConditionalField: React.FC<ConditionalFieldProps> = ({
  children,
  condition,
  fallback = null,
  animate = true,
  className
}) => {
  return (
    <div className={cn(
      'transition-all duration-200',
      animate && condition && 'animate-fade-in',
      className
    )}>
      {condition ? children : fallback}
    </div>
  );
};

// Specialized field components following Apple HIG patterns
interface AddressFieldGroupProps {
  streetValue?: string;
  cityValue?: string;
  stateValue?: string;
  zipValue?: string;
  onStreetChange?: (value: string) => void;
  onCityChange?: (value: string) => void;
  onStateChange?: (value: string) => void;
  onZipChange?: (value: string) => void;
  errors?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
  required?: boolean;
  className?: string;
}

export const AddressFieldGroup: React.FC<AddressFieldGroupProps> = ({
  streetValue,
  cityValue,
  stateValue,
  zipValue,
  onStreetChange,
  onCityChange,
  onStateChange,
  onZipChange,
  errors,
  required = false,
  className
}) => {
  return (
    <FieldGroup
      title="Address"
      description="Complete mailing address"
      required={required}
      className={className}
    >
      <VStack size="md">
        <Input
          label="Street Address"
          required={required}
          value={streetValue}
          onChange={(e) => onStreetChange?.(e.target.value)}
          error={errors?.street}
          placeholder="123 Main Street"
        />
        
        <FormRow columns={3}>
          <Input
            label="City"
            required={required}
            value={cityValue}
            onChange={(e) => onCityChange?.(e.target.value)}
            error={errors?.city}
            placeholder="City"
          />
          <Input
            label="State"
            required={required}
            value={stateValue}
            onChange={(e) => onStateChange?.(e.target.value)}
            error={errors?.state}
            placeholder="State"
          />
          <Input
            label="ZIP Code"
            required={required}
            value={zipValue}
            onChange={(e) => onZipChange?.(e.target.value)}
            error={errors?.zip}
            placeholder="12345"
          />
        </FormRow>
      </VStack>
    </FieldGroup>
  );
};

interface NameFieldGroupProps {
  firstNameValue?: string;
  lastNameValue?: string;
  onFirstNameChange?: (value: string) => void;
  onLastNameChange?: (value: string) => void;
  errors?: {
    firstName?: string;
    lastName?: string;
  };
  required?: boolean;
  className?: string;
}

export const NameFieldGroup: React.FC<NameFieldGroupProps> = ({
  firstNameValue,
  lastNameValue,
  onFirstNameChange,
  onLastNameChange,
  errors,
  required = false,
  className
}) => {
  return (
    <FieldGroup
      title="Name"
      description="Full legal name"
      required={required}
      className={className}
    >
      <FormRow columns={2}>
        <Input
          label="First Name"
          required={required}
          value={firstNameValue}
          onChange={(e) => onFirstNameChange?.(e.target.value)}
          error={errors?.firstName}
          placeholder="John"
        />
        <Input
          label="Last Name"
          required={required}
          value={lastNameValue}
          onChange={(e) => onLastNameChange?.(e.target.value)}
          error={errors?.lastName}
          placeholder="Smith"
        />
      </FormRow>
    </FieldGroup>
  );
};