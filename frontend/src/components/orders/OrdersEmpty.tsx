'use client';

import Link from 'next/link';
import { ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface OrdersEmptyProps {
  hasFilters: boolean;
}

export function OrdersEmpty({ hasFilters }: OrdersEmptyProps) {
  return (
    <Card>
      <CardContent className="py-20 text-center">
        <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">No orders found</h2>
        <p className="text-muted-foreground mb-6">
          {hasFilters
            ? 'Try adjusting your filters'
            : "You haven't placed any orders yet"}
        </p>
        <Button asChild>
          <Link href="/products">
            <ShoppingBag className="h-4 w-4 mr-2" />
            Start Shopping
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
