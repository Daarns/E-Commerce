import { useState } from 'react';

export function useCheckoutSteps(
  onStepChange?: (step: number) => void
) {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [returnToReview, setReturnToReview] = useState<boolean>(false);

  const TOTAL_STEPS = 3;

  const goToStep = (step: number): void => {
    if (step >= 1 && step <= TOTAL_STEPS) {
      setCurrentStep(step);
      onStepChange?.(step);
    }
  };

  const nextStep = (selectedAddress: string, selectedShipping: string): void => {
    if (returnToReview) {
      setReturnToReview(false);
      setCurrentStep(3);
    } else if (currentStep < TOTAL_STEPS) {
      if (canProceed(currentStep, selectedAddress, selectedShipping)) {
        setCurrentStep(currentStep + 1);
        onStepChange?.(currentStep + 1);
      }
    }
  };

  const prevStep = (): void => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      onStepChange?.(currentStep - 1);
    }
  };

  const canProceed = (
    step: number,
    selectedAddress: string,
    selectedShipping: string
  ): boolean => {
    switch (step) {
      case 1:
        return selectedAddress !== '';
      case 2:
        return selectedShipping !== '';
      default:
        return true;
    }
  };

  const markReview = (): void => {
    setReturnToReview(true);
  };

  return {
    currentStep,
    returnToReview,
    TOTAL_STEPS,
    goToStep,
    nextStep,
    prevStep,
    canProceed,
    markReview,
  };
}
