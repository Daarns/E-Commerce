'use client';

import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ShippingMethod, formatEstimate } from '@/services/shipping';
import { formatCurrency } from '@/utils';

interface ShippingOptionsProps {
  shippingMethods: ShippingMethod[];
  selectedShipping: string;
  onSelectShipping: (code: string) => void;
}

export function ShippingOptions({
  shippingMethods,
  selectedShipping,
  onSelectShipping,
}: ShippingOptionsProps) {
  return (
    <RadioGroup
      value={selectedShipping}
      onValueChange={(value) => onSelectShipping(String(value))}
    >
      <div className="space-y-4">
        {shippingMethods.map((method) => (
          <div
            key={method.code}
            className={`relative p-4 rounded-lg border-2 cursor-pointer transition-colors ${
              selectedShipping === method.code
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50'
            }`}
            onClick={() => onSelectShipping(method.code)}
          >
            <div className="flex items-center gap-4">
              <RadioGroupItem value={method.code} id={`shipping-${method.code}`} />
              <span className="text-2xl">{method.icon}</span>
              <div className="flex-1">
                <p className="font-medium">{method.name}</p>
                <p className="text-sm text-muted-foreground">{formatEstimate(method)}</p>
              </div>
              <p className="font-semibold">{formatCurrency(method.price)}</p>
            </div>
          </div>
        ))}
      </div>
    </RadioGroup>
  );
}
