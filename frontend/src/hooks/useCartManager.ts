import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { useCartStore } from '@/stores/cart-store';
import { toNum } from '@/utils';
import { ValidCartItem } from '@/types';

export function useCartManager() {
  const { cart, isLoading, updateQuantity, removeItem, fetchCart } = useCartStore();
  const cartRef = useRef<HTMLDivElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);

  const [removingId, setRemovingId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Fetch cart on mount
  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  // GSAP animations
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

  const handleRemoveItem = async (itemId: string): Promise<void> => {
    setRemovingId(itemId);
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
    setRemovingId(null);
  };

  const validItems = cart?.items?.filter((item): item is ValidCartItem => !!item.product) || [];

  const subtotal = validItems.reduce((sum, item) => {
    const price = toNum(item.price);
    return sum + price * item.quantity;
  }, 0);

  return {
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
  };
}
