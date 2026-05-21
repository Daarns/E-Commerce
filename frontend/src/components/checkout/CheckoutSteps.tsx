'use client';

import { motion } from 'framer-motion';
import { Check, MapPin, Truck, ShoppingBag } from 'lucide-react';

interface CheckoutStepsProps {
  currentStep: number;
  totalSteps: number;
}

const STEPS = [
  { id: 1, name: 'Address', icon: MapPin },
  { id: 2, name: 'Shipping', icon: Truck },
  { id: 3, name: 'Review', icon: ShoppingBag },
];

export function CheckoutSteps({ currentStep, totalSteps }: CheckoutStepsProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-center">
        {STEPS.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <motion.div
              className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors ${
                currentStep >= step.id
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-muted-foreground/30 text-muted-foreground'
              }`}
              animate={{
                scale: currentStep === step.id ? 1.1 : 1,
              }}
            >
              {currentStep > step.id ? (
                <Check className="h-5 w-5" />
              ) : (
                <step.icon className="h-5 w-5" />
              )}
            </motion.div>
            <span
              className={`ml-2 text-sm font-medium hidden sm:block ${
                currentStep >= step.id ? 'text-foreground' : 'text-muted-foreground'
              }`}
            >
              {step.name}
            </span>
            {index < totalSteps - 1 && (
              <div
                className={`w-12 sm:w-24 h-0.5 mx-2 sm:mx-4 ${
                  currentStep > step.id ? 'bg-primary' : 'bg-muted'
                }`}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
