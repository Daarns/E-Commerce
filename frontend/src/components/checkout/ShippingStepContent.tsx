'use client';

import { Button } from '@/components/ui/button';
import { ShippingOptions } from './ShippingOptions';
import { ShippingMethod } from '@/services/shipping';

interface ShippingStepContentProps {
  shippingMethods: ShippingMethod[];
  selectedShipping: string;
  isLoading: boolean;
  error: string | null;
  onSelectedShippingChange: (code: string) => void;
  onReload: () => Promise<void>;
}

export function ShippingStepContent({
  shippingMethods,
  selectedShipping,
  isLoading,
  error,
  onSelectedShippingChange,
  onReload,
}: ShippingStepContentProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Metode Pengiriman</h2>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 rounded-lg border-2 border-border animate-pulse">
              <div className="flex items-center gap-4">
                <div className="h-4 w-4 rounded-full bg-muted" />
                <div className="h-8 w-8 rounded bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/3 bg-muted rounded" />
                  <div className="h-3 w-1/4 bg-muted rounded" />
                </div>
                <div className="h-4 w-16 bg-muted rounded" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error State */}
      {!isLoading && error && (
        <div className="text-center py-6 space-y-3">
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" size="sm" onClick={onReload}>
            Coba Lagi
          </Button>
        </div>
      )}

      {/* Shipping Options */}
      {!isLoading && !error && (
        <ShippingOptions
          shippingMethods={shippingMethods}
          selectedShipping={selectedShipping}
          onSelectShipping={onSelectedShippingChange}
        />
      )}
    </div>
  );
}
