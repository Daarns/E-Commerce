'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CheckoutNavigationProps {
  currentStep: number;
  totalSteps: number;
  canProceed: boolean;
  isProcessing: boolean;
  returnToReview: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onPlace: () => void;
}

export function CheckoutNavigation({
  currentStep,
  totalSteps,
  canProceed,
  isProcessing,
  returnToReview,
  onPrevious,
  onNext,
  onPlace,
}: CheckoutNavigationProps) {
  return (
    <div className="flex justify-between mt-8">
      <Button
        variant="outline"
        onClick={onPrevious}
        disabled={currentStep === 1}
      >
        <ChevronLeft className="h-4 w-4 mr-2" />
        Previous
      </Button>

      {currentStep < totalSteps ? (
        <Button
          onClick={onNext}
          disabled={!canProceed}
        >
          {returnToReview ? 'Save & Back to Review' : 'Next'}
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      ) : (
        <Button
          onClick={onPlace}
          disabled={!canProceed || isProcessing}
          className="min-w-[150px]"
        >
          {isProcessing ? 'Processing...' : 'Place Order'}
        </Button>
      )}
    </div>
  );
}
