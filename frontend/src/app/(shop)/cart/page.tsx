'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';
import { Minus, Plus, X, ArrowRight, ShoppingBag, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useCartStore } from '@/stores/cart-store';
import { formatCurrency } from '@/utils';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { ValidCartItem } from '@/types';

// Helper: decimal string from Go shopspring → number
function toNum(val: string | number | undefined | null): number {
  if (val === undefined || val === null) return 0;
  return typeof val === 'number' ? val : parseFloat(val) || 0;
}

export default function CartPage() {
  const { cart, isLoading, updateQuantity, removeItem, fetchCart } = useCartStore();
  const cartRef = useRef<HTMLDivElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);

  // Removing / updating state
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  // GSAP animations on mount
  useEffect(() => {
    if (!isLoading && cart && cartRef.current && summaryRef.current) {
      const ctx = gsap.context(() => {
        gsap.from('.cart-item', {
          x: -50,
          opacity: 0,
          duration: 0.6,
          stagger: 0.1,
          ease: 'power3.out',
        });
        gsap.from(summaryRef.current, {
          x: 50,
          opacity: 0,
          duration: 0.8,
          ease: 'back.out(1.7)',
        });
      }, cartRef);
      return () => ctx.revert();
    }
  }, [isLoading, cart]);

  const handleQuantityChange = async (itemId: string, newQuantity: number) => {
    setUpdatingId(itemId);
    try {
      await updateQuantity(itemId, newQuantity);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRemoveItem = async (itemId: string, itemName: string) => {
    setRemovingId(itemId);
    // Animate out before removing
    const element = document.querySelector(`[data-item-id="${itemId}"]`);
    if (element) {
      await gsap.to(element, {
        x: -100,
        opacity: 0,
        duration: 0.3,
        ease: 'power2.in',
      });
    }
    await removeItem(itemId);
    toast.success('Removed from cart', { description: itemName });
    setRemovingId(null);
  };


  if (isLoading) {
    return <CartSkeleton />;
  }

  if (!cart || !cart.items || cart.items.length === 0) {
    return <EmptyCart />;
  }

  // Only render items that have product data populated
  const validItems = cart.items.filter((item): item is ValidCartItem => !!item.product);

  const subtotal = validItems.reduce((sum, item) => {
    const price = toNum(item.price);
    return sum + price * item.quantity;
  }, 0);



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
            {validItems.map((item) => {
              // price is snapshot price per unit from backend
              const itemPrice = toNum(item.price);

              return (
                <motion.div
                  key={item.id}
                  layout
                  data-item-id={item.id}
                  className="cart-item"
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex gap-4">
                        {/* Product Image */}
                        <Link
                          href={`/products/${item.product.slug}`}
                          className="relative w-24 h-24 flex-shrink-0 bg-muted rounded-lg overflow-hidden group"
                        >
                          <Image
                            src={item.product.images?.[0]?.url || '/placeholder-product.jpg'}
                            alt={item.product.name}
                            fill
                            className="object-cover group-hover:scale-110 transition-transform duration-300"
                            sizes="96px"
                          />
                        </Link>

                        {/* Product Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <Link
                                href={`/products/${item.product.slug}`}
                                className="font-semibold hover:text-primary transition-colors line-clamp-1"
                              >
                                {item.product.name}
                              </Link>
                              {item.product.brand && (
                                <p className="text-sm text-muted-foreground">{item.product.brand}</p>
                              )}
                              {item.variant && (
                                <Badge variant="secondary" className="mt-1">
                                  {item.variant.variant_type}: {item.variant.variant_value}
                                </Badge>
                              )}
                            </div>

                            {/* Remove Button */}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="flex-shrink-0"
                              disabled={removingId === item.id}
                              onClick={() => handleRemoveItem(item.id, item.product.name)}
                            >
                              {removingId === item.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <X className="h-4 w-4" />
                              )}
                            </Button>
                          </div>

                          <div className="flex items-center justify-between mt-4">
                            {/* Quantity Selector */}
                            <div className="flex items-center border rounded-lg">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                                disabled={item.quantity <= 1 || updatingId === item.id}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="w-12 text-center text-sm font-medium">
                                {updatingId === item.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin mx-auto" />
                                ) : (
                                  item.quantity
                                )}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                                disabled={
                                  updatingId === item.id ||
                                  item.quantity >= (item.variant?.stock_quantity ?? item.product.stock_quantity)
                                }
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>

                            {/* Price */}
                            <div className="text-right">
                              <p className="font-semibold">
                                {formatCurrency(itemPrice * item.quantity)}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {formatCurrency(itemPrice)} each
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
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
          <div ref={summaryRef} className="sticky top-24">
            <Card>
              <CardContent className="p-6 space-y-4">
                <h2 className="text-lg font-semibold">Order Summary</h2>

                <Separator />

                {/* Pricing Breakdown */}
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


                {/* Checkout Button */}
                <Button className="w-full gap-2" size="lg" asChild>
                  <Link href="/checkout">
                    Proceed to Checkout
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>

                {/* Trust Badge */}
                <div className="pt-4 space-y-2 text-center text-sm text-muted-foreground">
                  <p className="flex items-center justify-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    Secure checkout
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyCart() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      gsap.fromTo(
        containerRef.current.children,
        { y: 50, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          stagger: 0.2,
          ease: 'power3.out',
          clearProps: 'all', // remove inline styles after animation so CSS takes over
        }
      );
    }
  }, []);

  return (
    <div className="container mx-auto px-4 py-20">
      <div ref={containerRef} className="max-w-md mx-auto text-center space-y-6">
        <div className="w-32 h-32 mx-auto bg-muted rounded-full flex items-center justify-center">
          <ShoppingBag className="h-16 w-16 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-bold">Your cart is empty</h1>
        <p className="text-muted-foreground">
          Looks like you haven&apos;t added anything to your cart yet.
        </p>
        <Button size="lg" asChild>
          <Link href="/products">
            Start Shopping
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

function CartSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8">
      <Skeleton className="h-10 w-48 mb-8" />
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex gap-4">
                  <Skeleton className="w-24 h-24 rounded-lg" />
                  <div className="flex-1 space-y-3">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-8 w-32" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="lg:col-span-1">
          <Card>
            <CardContent className="p-6 space-y-4">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-12 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
