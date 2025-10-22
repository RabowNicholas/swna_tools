import React from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader } from './Card';
import { Typography, TextHierarchy } from './Typography';
import { VStack, HStack } from './Spacing';
import { Surface } from './Surface';
import { AlertCircle, CheckCircle, Info } from 'lucide-react';

interface FormSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  required?: boolean;
  completed?: boolean;
  error?: string;
  warning?: string;
  info?: string;
  variant?: 'default' | 'elevated' | 'outlined';
  collapsible?: boolean;
  collapsed?: boolean;
  onToggle?: () => void;
  className?: string;
  icon?: React.ReactNode;
}

export const FormSection: React.FC<FormSectionProps> = ({
  title,
  description,
  children,
  required = false,
  completed = false,
  error,
  warning,
  info,
  variant = 'default',
  collapsible = false,
  collapsed = false,
  onToggle,
  className,
  icon
}) => {
  const hasStatusMessage = error || warning || info;
  const statusType = error ? 'error' : warning ? 'warning' : info ? 'info' : null;

  const StatusIcon = () => {
    if (error) return <AlertCircle className="h-4 w-4 text-destructive" />;
    if (warning) return <AlertCircle className="h-4 w-4 text-warning" />;
    if (info) return <Info className="h-4 w-4 text-primary" />;
    if (completed) return <CheckCircle className="h-4 w-4 text-success" />;
    return null;
  };

  const SectionHeader = () => (
    <div 
      className={cn(
        'flex items-start justify-between',
        collapsible && 'cursor-pointer select-none'
      )}
      onClick={collapsible ? onToggle : undefined}
    >
      <HStack size="sm" className="flex-1 min-w-0">
        {icon && (
          <div className="flex-shrink-0 mt-1">
            {icon}
          </div>
        )}
        
        <VStack size="xs" className="flex-1 min-w-0">
          <HStack size="sm" className="items-center">
            <TextHierarchy.CardTitle 
              className={cn(
                'transition-colors',
                completed && 'text-success',
                error && 'text-destructive'
              )}
            >
              {title}
            </TextHierarchy.CardTitle>
            
            {required && (
              <span className="text-destructive text-sm" aria-label="required">
                *
              </span>
            )}
            
            <StatusIcon />
          </HStack>
          
          {description && (
            <Typography.Body size="small" className="text-muted-foreground">
              {description}
            </Typography.Body>
          )}
        </VStack>
      </HStack>
      
      {collapsible && (
        <div className={cn(
          'flex-shrink-0 ml-4 transition-transform duration-200',
          collapsed && 'rotate-180'
        )}>
          <svg className="h-5 w-5 text-muted-foreground" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </div>
      )}
    </div>
  );

  const StatusMessage = () => {
    if (!hasStatusMessage) return null;
    
    const message = error || warning || info;
    
    return (
      <Surface
        elevation="raised"
        padding="sm"
        rounded="md"
        className={cn(
          'border',
          statusType === 'error' && 'bg-destructive/10 border-destructive/30',
          statusType === 'warning' && 'bg-warning/10 border-warning/30',
          statusType === 'info' && 'bg-primary/10 border-primary/30'
        )}
      >
        <HStack size="sm">
          <StatusIcon />
          <Typography.Body size="small" className={cn(
            statusType === 'error' && 'text-destructive',
            statusType === 'warning' && 'text-warning',
            statusType === 'info' && 'text-primary'
          )}>
            {message}
          </Typography.Body>
        </HStack>
      </Surface>
    );
  };

  return (
    <Card
      variant={variant}
      className={cn(
        'transition-all duration-200',
        completed && 'border-success/50 bg-success/5',
        error && 'border-destructive/50',
        className
      )}
    >
      <CardHeader className="pb-4">
        <SectionHeader />
        <StatusMessage />
      </CardHeader>
      
      {(!collapsible || !collapsed) && (
        <CardContent className="pt-0">
          <VStack size="lg">
            {children}
          </VStack>
        </CardContent>
      )}
    </Card>
  );
};

// Specialized form sections
export const BasicInfoSection: React.FC<Omit<FormSectionProps, 'title' | 'icon'>> = (props) => (
  <FormSection
    title="Basic Information"
    description="Core details required for document generation"
    icon={<Info className="h-5 w-5 text-primary" />}
    {...props}
  />
);

export const AddressSection: React.FC<Omit<FormSectionProps, 'title' | 'icon'>> = (props) => (
  <FormSection
    title="Address Information"
    description="Complete mailing address details"
    icon={
      <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    }
    {...props}
  />
);

export const DocumentSection: React.FC<Omit<FormSectionProps, 'title' | 'icon'>> = (props) => (
  <FormSection
    title="Document Details"
    description="Document-specific information and settings"
    icon={
      <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    }
    {...props}
  />
);