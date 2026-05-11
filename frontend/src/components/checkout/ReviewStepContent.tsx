'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { formatCurrency } from '@/utils';
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

const stepVariants = {
  hidden: { opacity: 0, x: 50 },
  visible: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -50 },
};

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
    <motion.div
      variants={stepVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
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

      {/* Payment Info */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Payment</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CreditCard className="h-4 w-4" />
            <span>Pilih metode pembayaran di halaman berikutnya (Midtrans Snap)</span>
          </div>
        </CardContent>
      </Card>

      {/* Items Summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Order Items ({items.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {items.map((item) => (
              <div key={`${item.product_id}-${item.variant_id}`} className="flex gap-4">
                <div className="relative h-16 w-16 rounded-md overflow-hidden bg-muted">
                  {item.product?.images?.[0] && (
                    <Image
                      src={item.product.images[0].url}
                      alt={item.product.name}
                      fill
                      className="object-cover"
                    />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{item.product?.name}</p>
                  {item.variant && (
                    <p className="text-xs text-muted-foreground">
                      {item.variant.variant_type}: {item.variant.variant_value}
                    </p>
                  )}
                  <p className="text-sm">
                    {formatCurrency(item.product?.sale_price || item.product?.regular_price || 0)} x{' '}
                    {item.quantity}
                  </p>
                </div>
              </div>
            ))}
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
        <label htmlFor="terms" className="text-sm text-muted-foreground">
          I agree to the{' '}
          <Link href="/terms" className="text-primary hover:underline">
            Terms and Conditions
          </Link>{' '}
          and{' '}
          <Link href="/privacy" className="text-primary hover:underline">
            Privacy Policy
          </Link>
        </label>
      </div>
    </motion.div>
  );
}
