'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { formatCurrency } from '@/utils';

interface CartSummaryProps {
  subtotal: number;
  itemCount: number;
  summaryRef: React.RefObject<HTMLDivElement | null>;
}

export function CartSummary({ subtotal, itemCount, summaryRef }: CartSummaryProps) {
  return (
    <div ref={summaryRef} className="sticky top-24">
      <Card>
        <CardContent className="p-6 space-y-4">
          <h2 className="text-lg font-semibold">Order Summary</h2>

          <Separator />

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              🏷️ Have a promo code? Enter it at checkout.
            </p>
          </div>

          <Separator />

          <Button className="w-full gap-2" size="lg" asChild>
            <Link href="/checkout">
              Proceed to Checkout
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>

          <div className="pt-4 space-y-2 text-center text-sm text-muted-foreground">
            <p className="flex items-center justify-center gap-2">
              <Sparkles className="h-4 w-4" />
              Secure checkout
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
