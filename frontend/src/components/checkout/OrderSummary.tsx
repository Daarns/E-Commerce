'use client';

import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { formatCurrency } from '@/utils';
import { CartItem } from '@/types';
import { PromoCode } from './PromoCode';

interface OrderSummaryProps {
  items: CartItem[];
  subtotal: number;
  shippingCost: number;
  promoCode: string;
  promoDiscount: number;
  isApplyingPromo: boolean;
  onPromoChange: (code: string) => void;
  onApplyPromo: () => void;
  onRemovePromo: () => void;
}

export function OrderSummary({
  items,
  subtotal,
  shippingCost,
  promoCode,
  promoDiscount,
  isApplyingPromo,
  onPromoChange,
  onApplyPromo,
  onRemovePromo,
}: OrderSummaryProps) {
  const total = subtotal + shippingCost - promoDiscount;

  return (
    <Card className="sticky top-24">
      <CardHeader>
        <CardTitle>Order Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Items */}
        <div className="space-y-2">
          {items.slice(0, 3).map((item) => (
            <div key={`${item.product_id}-${item.variant_id}`} className="flex gap-3">
              {item.product?.images?.[0] && (
                <div className="relative h-12 w-12 rounded-md overflow-hidden bg-muted flex-shrink-0">
                  <Image
                    src={item.product.images[0].url}
                    alt={item.product.name}
                    fill
                    className="object-cover"
                  />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground truncate max-w-[180px]">
                  {item.product?.name} x {item.quantity}
                </p>
                <p className="text-sm font-medium">
                  {formatCurrency(Number(item.product?.sale_price || item.product?.regular_price || 0) * item.quantity)}
                </p>
              </div>
            </div>
          ))}
          {items.length > 3 && (
            <p className="text-sm text-muted-foreground">
              +{items.length - 3} more items
            </p>
          )}
        </div>

        <Separator />

        {/* Promo Code */}
        <PromoCode
          promoCode={promoCode}
          promoDiscount={promoDiscount}
          isApplying={isApplyingPromo}
          onPromoChange={onPromoChange}
          onApply={onApplyPromo}
          onRemove={onRemovePromo}
        />

        <Separator />

        {/* Totals */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Shipping</span>
            <span>{formatCurrency(shippingCost)}</span>
          </div>
          {promoDiscount > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Promo Discount</span>
              <span>-{formatCurrency(promoDiscount)}</span>
            </div>
          )}
        </div>

        <Separator />

        <div className="flex justify-between font-semibold">
          <span>Total</span>
          <span className="text-lg">{formatCurrency(total)}</span>
        </div>

        {/* Security Badge */}
        <div className="pt-4 text-center">
          <p className="text-xs text-muted-foreground">
            🔒 Secure checkout powered by Midtrans
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
