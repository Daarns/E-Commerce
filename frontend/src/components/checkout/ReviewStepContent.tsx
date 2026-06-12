'use client';

import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { CheckoutPolicyDialog } from './CheckoutPolicyDialog';
import {
  formatCurrency,
  getProductImageForCombination,
  getProductImageUrl,
  shouldBypassNextImageOptimizer,
  toNum,
} from '@/utils';
import { Address, CartItem } from '@/types';
import { ShippingMethod, formatEstimate } from '@/services/shipping';

interface ReviewStepContentProps {
  address: Address | undefined;
  shippingMethod: ShippingMethod | undefined;
  items: CartItem[];
  agreedToTerms: boolean;
  onAgreedToTermsChange: (agreed: boolean) => void;
  onEditAddress: () => void;
  onEditShipping: () => void;
}

export function ReviewStepContent({
  address,
  shippingMethod,
  items,
  agreedToTerms,
  onAgreedToTermsChange,
  onEditAddress,
  onEditShipping,
}: ReviewStepContentProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Review Your Order</h2>

      {/* Address Summary */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Shipping Address</CardTitle>
            <Button variant="ghost" size="sm" onClick={onEditAddress}>
              Edit
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {address && (
            <div className="text-sm">
              <p className="font-medium">{address.recipient_name}</p>
              <p className="text-muted-foreground">{address.phone}</p>
              <p className="text-muted-foreground">
                {address.street_address}
                {address.address_line2 && `, ${address.address_line2}`}
              </p>
              <p className="text-muted-foreground">
                {address.city}, {address.province} {address.postal_code}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Shipping Summary */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Shipping Method</CardTitle>
            <Button variant="ghost" size="sm" onClick={onEditShipping}>
              Edit
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {shippingMethod && (
            <div className="flex items-center gap-2 text-sm">
              <span>{shippingMethod.icon}</span>
              <span>{shippingMethod.name}</span>
              <span className="text-muted-foreground">({formatEstimate(shippingMethod)})</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Items Summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Order Items ({items.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {items.map((item) => {
              const itemImage = getProductImageForCombination(item.product?.images, item.combination);
              const itemImageUrl = getProductImageUrl(itemImage);

              return (
                <div key={`${item.product_id}-${item.combination_id ?? item.id}`} className="flex gap-4">
                  <div className="relative h-16 w-16 rounded-md overflow-hidden bg-muted">
                    {itemImageUrl && (
                      <Image
                        src={itemImageUrl}
                        alt={item.product?.name ?? 'Product image'}
                        fill
                        className="object-cover"
                        sizes="64px"
                        unoptimized={shouldBypassNextImageOptimizer(itemImageUrl)}
                      />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{item.product?.name}</p>
                    {Boolean(item.combination?.options?.length) && (
                      <p className="text-xs text-muted-foreground">
                        {item.combination?.options?.map((option) => option.value).join(' / ')}
                      </p>
                    )}
                    <p className="text-sm">
                      {formatCurrency(toNum(item.price))} x {item.quantity}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Terms and Conditions */}
      <div className="flex items-start gap-2">
        <Checkbox
          id="terms"
          checked={agreedToTerms}
          onCheckedChange={(checked) => onAgreedToTermsChange(checked === true)}
        />
        <div className="text-sm text-muted-foreground">
          Saya menyetujui{' '}
          <CheckoutPolicyDialog type="terms" /> dan{' '}
          <CheckoutPolicyDialog type="privacy" />.
        </div>
      </div>
    </div>
  );
}
