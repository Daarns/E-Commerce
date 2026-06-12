import { useEffect, useState } from 'react';
import { useCartStore } from '@/stores/cart-store';
import { useAuthStore } from '@/stores/auth-store';
import { toNum } from '@/utils';
import { ValidCartItem } from '@/types';

export function useCartManager() {
  const { cart, isLoading, updateQuantity, removeItem, fetchCart } = useCartStore();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuthStore();

  const [removingId, setRemovingId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Fetch cart on mount
  useEffect(() => {
    if (isAuthLoading || !isAuthenticated) return;
    fetchCart();
  }, [fetchCart, isAuthenticated, isAuthLoading]);

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
    try {
      await removeItem(itemId);
    } finally {
      setRemovingId(null);
    }
  };

  const validItems = cart?.items?.filter((item): item is ValidCartItem => !!item.product) || [];

  const subtotal = validItems.reduce((sum, item) => {
    const price = toNum(item.price);
    return sum + price * item.quantity;
  }, 0);

  return {
    cart,
    isLoading: isLoading || isAuthLoading,
    validItems,
    subtotal,
    removingId,
    updatingId,
    handleQuantityChange,
    handleRemoveItem,
  };
}
