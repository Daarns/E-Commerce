'use client';

import { motion, AnimatePresence } from 'framer-motion';
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
    cartRef,
    summaryRef,
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
    <div className="container mx-auto px-4 py-8" ref={cartRef}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold mb-2">Shopping Cart</h1>
        <p className="text-muted-foreground">
          {cart.item_count ?? validItems.reduce((s, i) => s + i.quantity, 0)}{' '}
          {(cart.item_count ?? 1) === 1 ? 'item' : 'items'} in your cart
        </p>
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          <AnimatePresence mode="popLayout">
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
          </AnimatePresence>

          {/* Continue Shopping */}
          <motion.div layout>
            <Button variant="outline" asChild className="w-full sm:w-auto">
              <Link href="/products">Continue Shopping</Link>
            </Button>
          </motion.div>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <CartSummary
            subtotal={subtotal}
            itemCount={cart.item_count ?? validItems.length}
            summaryRef={summaryRef}
          />
        </div>
      </div>
    </div>
  );
}
