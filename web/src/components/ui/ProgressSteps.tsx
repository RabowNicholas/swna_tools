import React from 'react';
import { cn } from '@/lib/utils';
import { Check, ChevronRight } from 'lucide-react';
import { Typography } from './Typography';
import { HStack, VStack } from './Spacing';

interface Step {
  id: string;
  title: string;
  description?: string;
  optional?: boolean;
}

interface ProgressStepsProps {
  steps: Step[];
  currentStep: string;
  completedSteps: string[];
  onStepClick?: (stepId: string) => void;
  variant?: 'horizontal' | 'vertical';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const ProgressSteps: React.FC<ProgressStepsProps> = ({
  steps,
  currentStep,
  completedSteps,
  onStepClick,
  variant = 'horizontal',
  size = 'md',
  className
}) => {
  const getCurrentStepIndex = () => steps.findIndex(step => step.id === currentStep);
  const currentIndex = getCurrentStepIndex();

  const getStepStatus = (step: Step, index: number) => {
    if (completedSteps.includes(step.id)) return 'completed';
    if (step.id === currentStep) return 'current';
    if (index < currentIndex) return 'completed';
    return 'upcoming';
  };

  const isClickable = (step: Step, index: number) => {
    return onStepClick && (completedSteps.includes(step.id) || index <= currentIndex);
  };

  if (variant === 'vertical') {
    return (
      <VStack size="md" className={cn('w-64', className)}>
        {steps.map((step, index) => {
          const status = getStepStatus(step, index);
          const clickable = isClickable(step, index);
          
          return (
            <div key={step.id} className="relative w-full">
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div 
                  className={cn(
                    "absolute left-4 top-8 w-0.5 h-16 transition-colors",
                    status === 'completed' ? 'bg-primary' : 'bg-border'
                  )} 
                />
              )}
              
              {/* Step content */}
              <HStack 
                size="sm" 
                className={cn(
                  'relative z-10 p-3 rounded-lg transition-all',
                  clickable && 'cursor-pointer hover:bg-accent/50',
                  status === 'current' && 'bg-primary/10 border border-primary/20'
                )}
                onClick={clickable ? () => onStepClick!(step.id) : undefined}
              >
                {/* Step indicator */}
                <div className={cn(
                  'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all',
                  status === 'completed' && 'bg-primary text-primary-foreground',
                  status === 'current' && 'bg-primary text-primary-foreground ring-4 ring-primary/20',
                  status === 'upcoming' && 'bg-muted border-2 border-border text-muted-foreground'
                )}>
                  {status === 'completed' ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <span className="text-sm font-medium">{index + 1}</span>
                  )}
                </div>
                
                {/* Step text */}
                <VStack size="xs" className="flex-1 min-w-0">
                  <Typography.Subtitle className={cn(
                    'transition-colors',
                    status === 'current' && 'text-primary',
                    status === 'upcoming' && 'text-muted-foreground'
                  )}>
                    {step.title}
                    {step.optional && (
                      <Typography.Caption className="ml-2">(Optional)</Typography.Caption>
                    )}
                  </Typography.Subtitle>
                  
                  {step.description && (
                    <Typography.Caption className="line-clamp-2">
                      {step.description}
                    </Typography.Caption>
                  )}
                </VStack>
              </HStack>
            </div>
          );
        })}
      </VStack>
    );
  }

  // Horizontal variant
  return (
    <div className={cn('w-full', className)}>
      <HStack size="sm" className="relative">
        {steps.map((step, index) => {
          const status = getStepStatus(step, index);
          const clickable = isClickable(step, index);
          
          return (
            <React.Fragment key={step.id}>
              {/* Step */}
              <div 
                className={cn(
                  'flex flex-col items-center min-w-0 flex-1',
                  clickable && 'cursor-pointer group'
                )}
                onClick={clickable ? () => onStepClick!(step.id) : undefined}
              >
                {/* Step indicator */}
                <div className={cn(
                  'flex items-center justify-center rounded-full transition-all mb-2',
                  size === 'sm' && 'w-8 h-8',
                  size === 'md' && 'w-10 h-10',
                  size === 'lg' && 'w-12 h-12',
                  status === 'completed' && 'bg-primary text-primary-foreground',
                  status === 'current' && 'bg-primary text-primary-foreground ring-4 ring-primary/20',
                  status === 'upcoming' && 'bg-muted border-2 border-border text-muted-foreground',
                  clickable && 'group-hover:scale-105'
                )}>
                  {status === 'completed' ? (
                    <Check className={cn(
                      size === 'sm' && 'h-4 w-4',
                      size === 'md' && 'h-5 w-5',
                      size === 'lg' && 'h-6 w-6'
                    )} />
                  ) : (
                    <span className={cn(
                      'font-medium',
                      size === 'sm' && 'text-sm',
                      size === 'md' && 'text-base',
                      size === 'lg' && 'text-lg'
                    )}>
                      {index + 1}
                    </span>
                  )}
                </div>
                
                {/* Step text */}
                <VStack size="xs" className="text-center min-w-0 w-full">
                  <Typography.Label className={cn(
                    'transition-colors truncate',
                    size === 'sm' && 'text-xs',
                    size === 'lg' && 'text-base',
                    status === 'current' && 'text-primary font-semibold',
                    status === 'upcoming' && 'text-muted-foreground',
                    clickable && 'group-hover:text-primary'
                  )}>
                    {step.title}
                    {step.optional && (
                      <Typography.Caption className="block">(Optional)</Typography.Caption>
                    )}
                  </Typography.Label>
                  
                  {step.description && size !== 'sm' && (
                    <Typography.Caption className="line-clamp-2 text-center">
                      {step.description}
                    </Typography.Caption>
                  )}
                </VStack>
              </div>
              
              {/* Connector */}
              {index < steps.length - 1 && (
                <div className="flex items-center px-2">
                  <ChevronRight className={cn(
                    'text-muted-foreground',
                    size === 'sm' && 'h-4 w-4',
                    size === 'md' && 'h-5 w-5',
                    size === 'lg' && 'h-6 w-6'
                  )} />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </HStack>
      
      {/* Progress bar */}
      <div className="mt-4 w-full bg-muted rounded-full h-2">
        <div 
          className="bg-primary h-2 rounded-full transition-all duration-300 ease-out"
          style={{ 
            width: `${((currentIndex + 1) / steps.length) * 100}%` 
          }}
        />
      </div>
    </div>
  );
};