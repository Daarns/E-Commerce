'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface PromoCodeProps {
  promoCode: string;
  promoDiscount: number;
  isApplying: boolean;
  onPromoChange: (code: string) => void;
  onApply: () => void;
  onRemove: () => void;
}

export function PromoCode({
  promoCode,
  promoDiscount,
  isApplying,
  onPromoChange,
  onApply,
  onRemove,
}: PromoCodeProps) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Promo Code</p>
      {promoDiscount > 0 ? (
        <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-md px-3 py-2">
          <span className="text-sm text-green-700 font-medium">{promoCode.toUpperCase()} applied</span>
          <button
            onClick={onRemove}
            className="text-xs text-red-500 hover:text-red-700 ml-2"
          >
            Remove
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <Input
            placeholder="Promo code"
            value={promoCode}
            onChange={(e) => onPromoChange(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && onApply()}
            className="text-sm h-8"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={onApply}
            disabled={isApplying || !promoCode}
            className="shrink-0 h-8"
          >
            {isApplying ? '...' : 'Apply'}
          </Button>
        </div>
      )}
    </div>
  );
}
