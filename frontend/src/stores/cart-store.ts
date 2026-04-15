import { create } from 'zustand';
import { Cart, CartItem } from '@/types';
import { cartService } from '@/services/cart';

interface CartState {
  cart: Cart | null;
  isLoading: boolean;
  itemCount: number;
  
  // Actions
  fetchCart: () => Promise<void>;
  addToCart: (productId: string, quantity: number, variantId?: string) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  getCartTotal: () => number;
}

export const useCartStore = create<CartState>()((set, get) => ({
  cart: null,
  isLoading: false,
  itemCount: 0,

  fetchCart: async () => {
    set({ isLoading: true });
    try {
      const cart = await cartService.getCart();
      const itemCount = cart?.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
      set({ cart, itemCount, isLoading: false });
    } catch {
      set({ cart: null, itemCount: 0, isLoading: false });
    }
  },

  addToCart: async (productId: string, quantity: number, variantId?: string) => {
    set({ isLoading: true });
    try {
      await cartService.addToCart({ product_id: productId, quantity, variant_id: variantId });
      await get().fetchCart();
    } finally {
      set({ isLoading: false });
    }
  },

  updateQuantity: async (itemId: string, quantity: number) => {
    if (quantity < 1) {
      await get().removeItem(itemId);
      return;
    }
    
    try {
      await cartService.updateCartItem(itemId, { quantity });
      await get().fetchCart();
    } catch (error) {
      console.error('Failed to update quantity:', error);
    }
  },

  removeItem: async (itemId: string) => {
    try {
      await cartService.removeFromCart(itemId);
      await get().fetchCart();
    } catch (error) {
      console.error('Failed to remove item:', error);
    }
  },

  clearCart: async () => {
    try {
      await cartService.clearCart();
      set({ cart: null, itemCount: 0 });
    } catch (error) {
      console.error('Failed to clear cart:', error);
    }
  },

  getCartTotal: () => {
    const { cart } = get();
    if (!cart?.items) return 0;
    return cart.items.reduce((total, item) => {
      const price = item.product?.sale_price || item.product?.regular_price || 0;
      return total + (price * item.quantity);
    }, 0);
  },
}));
