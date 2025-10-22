import React, { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Button } from './Button';
import { Typography } from './Typography';
import { VStack, HStack } from './Spacing';
import { Surface } from './Surface';
import { ProgressSteps } from './ProgressSteps';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';

interface WizardStep {
  id: string;
  title: string;
  description?: string;
  optional?: boolean;
  content: React.ReactNode;
  validation?: () => boolean | Promise<boolean>;
  onEnter?: () => void;
  onExit?: () => void;
}

interface FormWizardProps {
  steps: WizardStep[];
  currentStepId?: string;
  onStepChange?: (stepId: string) => void;
  onComplete?: () => void;
  onCancel?: () => void;
  completedSteps?: string[];
  className?: string;
  showProgress?: boolean;
  allowNonLinearNavigation?: boolean;
  variant?: 'modal' | 'page' | 'inline';
  loading?: boolean;
  error?: string;
}

export const FormWizard: React.FC<FormWizardProps> = ({
  steps,
  currentStepId,
  onStepChange,
  onComplete,
  onCancel,
  completedSteps = [],
  className,
  showProgress = true,
  allowNonLinearNavigation = false,
  variant = 'page',
  loading = false,
  error
}) => {
  const [internalCurrentStep, setInternalCurrentStep] = useState(steps[0]?.id || '');
  const [internalCompletedSteps, setInternalCompletedSteps] = useState<string[]>([]);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const currentStep = currentStepId || internalCurrentStep;
  const completed = completedSteps.length > 0 ? completedSteps : internalCompletedSteps;

  const currentStepIndex = steps.findIndex(step => step.id === currentStep);
  const currentStepData = steps[currentStepIndex];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === steps.length - 1;

  const handleStepChange = useCallback(async (newStepId: string) => {
    if (newStepId === currentStep) return;

    const newStepIndex = steps.findIndex(step => step.id === newStepId);
    const isMovingForward = newStepIndex > currentStepIndex;

    // Validate current step if moving forward
    if (isMovingForward && currentStepData?.validation) {
      try {
        const isValid = await currentStepData.validation();
        if (!isValid) {
          setValidationErrors(prev => ({
            ...prev,
            [currentStep]: 'Please complete all required fields in this step.'
          }));
          return;
        }
      } catch (error) {
        setValidationErrors(prev => ({
          ...prev,
          [currentStep]: error instanceof Error ? error.message : 'Validation failed'
        }));
        return;
      }
    }

    // Clear validation errors for current step
    setValidationErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[currentStep];
      return newErrors;
    });

    // Call step exit handler
    currentStepData?.onExit?.();

    // Update completed steps if moving forward
    if (isMovingForward && !completed.includes(currentStep)) {
      const newCompleted = [...completed, currentStep];
      setInternalCompletedSteps(newCompleted);
    }

    // Change step
    if (onStepChange) {
      onStepChange(newStepId);
    } else {
      setInternalCurrentStep(newStepId);
    }

    // Call step enter handler
    const newStepData = steps[newStepIndex];
    newStepData?.onEnter?.();
  }, [currentStep, currentStepIndex, currentStepData, completed, onStepChange, steps]);

  const handleNext = () => {
    if (!isLastStep) {
      handleStepChange(steps[currentStepIndex + 1].id);
    }
  };

  const handlePrevious = () => {
    if (!isFirstStep) {
      handleStepChange(steps[currentStepIndex - 1].id);
    }
  };

  const handleComplete = async () => {
    // Validate final step
    if (currentStepData?.validation) {
      try {
        const isValid = await currentStepData.validation();
        if (!isValid) {
          setValidationErrors(prev => ({
            ...prev,
            [currentStep]: 'Please complete all required fields before finishing.'
          }));
          return;
        }
      } catch (error) {
        setValidationErrors(prev => ({
          ...prev,
          [currentStep]: error instanceof Error ? error.message : 'Validation failed'
        }));
        return;
      }
    }

    // Mark final step as completed
    if (!completed.includes(currentStep)) {
      setInternalCompletedSteps([...completed, currentStep]);
    }

    onComplete?.();
  };


  const WizardContent = () => (
    <VStack size="xl" className="flex-1">
      {/* Progress indicator */}
      {showProgress && (
        <ProgressSteps
          steps={steps.map(step => ({
            id: step.id,
            title: step.title,
            description: step.description,
            optional: step.optional
          }))}
          currentStep={currentStep}
          completedSteps={completed}
          onStepClick={allowNonLinearNavigation ? handleStepChange : undefined}
          variant={variant === 'modal' ? 'horizontal' : 'horizontal'}
          size={variant === 'modal' ? 'sm' : 'md'}
        />
      )}

      {/* Step content */}
      <div className="flex-1 w-full">
        <VStack size="lg">
          {/* Step header */}
          <div className="text-center">
            <Typography.Headline className="mb-2">
              {currentStepData?.title}
            </Typography.Headline>
            {currentStepData?.description && (
              <Typography.Body className="text-muted-foreground max-w-2xl mx-auto">
                {currentStepData.description}
              </Typography.Body>
            )}
          </div>

          {/* Error display */}
          {(error || validationErrors[currentStep]) && (
            <Surface
              elevation="raised"
              padding="sm"
              rounded="md"
              className="border border-destructive/30 bg-destructive/10"
            >
              <Typography.Body size="small" className="text-destructive text-center">
                {error || validationErrors[currentStep]}
              </Typography.Body>
            </Surface>
          )}

          {/* Step content */}
          <div className="w-full">
            {currentStepData?.content}
          </div>
        </VStack>
      </div>

      {/* Navigation */}
      <Surface
        elevation="raised"
        padding="lg"
        rounded="lg"
        className="w-full border-t"
      >
        <HStack size="md" className="justify-between">
          {/* Previous button */}
          <div className="flex-1">
            {!isFirstStep ? (
              <Button
                variant="secondary"
                onClick={handlePrevious}
                icon={<ChevronLeft className="h-4 w-4" />}
                disabled={loading}
              >
                Previous
              </Button>
            ) : onCancel ? (
              <Button
                variant="tertiary"
                onClick={onCancel}
                disabled={loading}
              >
                Cancel
              </Button>
            ) : (
              <div /> // Spacer
            )}
          </div>

          {/* Step indicator */}
          <div className="flex-shrink-0">
            <Typography.Caption className="text-center">
              Step {currentStepIndex + 1} of {steps.length}
            </Typography.Caption>
          </div>

          {/* Next/Complete button */}
          <div className="flex-1 flex justify-end">
            {isLastStep ? (
              <Button
                variant="primary"
                hierarchy="primary"
                onClick={handleComplete}
                loading={loading}
                icon={loading ? undefined : <Check className="h-4 w-4" />}
              >
                {loading ? 'Completing...' : 'Complete'}
              </Button>
            ) : (
              <Button
                variant="primary"
                onClick={handleNext}
                iconPosition="right"
                icon={<ChevronRight className="h-4 w-4" />}
                disabled={loading}
              >
                Next
              </Button>
            )}
          </div>
        </HStack>
      </Surface>
    </VStack>
  );

  if (variant === 'modal') {
    return (
      <Surface
        elevation="overlay"
        padding="xl"
        rounded="xl"
        className={cn('max-w-4xl mx-auto max-h-[90vh] overflow-auto', className)}
      >
        <WizardContent />
      </Surface>
    );
  }

  if (variant === 'inline') {
    return (
      <div className={cn('w-full', className)}>
        <WizardContent />
      </div>
    );
  }

  // Page variant (default)
  return (
    <div className={cn('min-h-screen flex flex-col', className)}>
      <div className="flex-1 container mx-auto px-4 py-8">
        <WizardContent />
      </div>
    </div>
  );
};