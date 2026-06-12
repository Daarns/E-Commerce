'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useCartManager } from '@/hooks/useCartManager';
import { CartItem } from '@/components/cart/CartItem';
import { CartSummary } from '@/components/cart/CartSummary';
import { EmptyCart } from '@/components/cart/EmptyCart';
import { CartSkeleton } from '@/components/cart/CartSkeleton';

export default function CartPage() {
  const {
    cart,
    isLoading,
    validItems,
    subtotal,
    removingId,
    updatingId,
    handleQuantityChange,
    handleRemoveItem,
  } = useCartManager();

  if (isLoading) {
    return <CartSkeleton />;
  }

  if (!cart || !cart.items || validItems.length === 0) {
    return <EmptyCart />;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Shopping Cart</h1>
        <p className="text-muted-foreground">
          {cart.item_count ?? validItems.reduce((s, i) => s + i.quantity, 0)}{' '}
          {(cart.item_count ?? 1) === 1 ? 'item' : 'items'} in your cart
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {validItems.map((item) => (
            <CartItem
              key={item.id}
              item={item}
              isRemoving={removingId === item.id}
              isUpdating={updatingId === item.id}
              onQuantityChange={handleQuantityChange}
              onRemove={async (itemId) => {
                const itemName = item.product.name;
                await handleRemoveItem(itemId);
                toast.success('Removed from cart', { description: itemName });
              }}
            />
          ))}

          {/* Continue Shopping */}
          <div>
            <Button variant="outline" asChild className="w-full sm:w-auto">
              <Link href="/products">Continue Shopping</Link>
            </Button>
          </div>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <CartSummary subtotal={subtotal} />
        </div>
      </div>
    </div>
  );
}
