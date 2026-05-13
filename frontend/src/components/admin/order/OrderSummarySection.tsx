'use client';

import { AdminOrder } from '@/services/admin';
import { Card } from '@/components/ui/card';
import { formatCurrency, toNum } from '@/utils';

interface OrderSummarySectionProps {
  subtotal: AdminOrder['subtotal'];
  shippingCost: AdminOrder['shipping_cost'];
  discountAmount?: AdminOrder['discount_amount'];
  taxAmount?: AdminOrder['tax_amount'];
  total: AdminOrder['total_amount'] | AdminOrder['total'];
}

export function OrderSummarySection({
  subtotal,
  shippingCost,
  discountAmount,
  taxAmount,
  total,
}: OrderSummarySectionProps) {
  const discount = toNum(discountAmount);
  const tax = toNum(taxAmount);

  return (
    <Card className="p-6">
      <h3 className="mb-4 font-semibold text-gray-900">Order Summary</h3>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Subtotal</span>
          <span>{formatCurrency(toNum(subtotal))}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Shipping</span>
          <span>{formatCurrency(toNum(shippingCost))}</span>
        </div>
        {discount > 0 && (
          <div className="flex justify-between text-green-600">
            <span>Discount</span>
            <span>-{formatCurrency(discount)}</span>
          </div>
        )}
        {tax > 0 && (
          <div className="flex justify-between">
            <span className="text-gray-600">Tax</span>
            <span>{formatCurrency(tax)}</span>
          </div>
        )}
        <div className="border-t pt-2 flex justify-between font-semibold">
          <span>Total</span>
          <span>{formatCurrency(toNum(total))}</span>
        </div>
      </div>
    </Card>
  );
}
