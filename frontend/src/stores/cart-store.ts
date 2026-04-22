import { create } from 'zustand';
import { Cart, CartItem } from '@/types';
import { cartService } from '@/services/cart';

// Helper: decimal string from Go shopspring → number
function toNum(val: string | number | undefined | null): number {
  if (val === undefined || val === null) return 0;
  return typeof val === 'number' ? val : parseFloat(val) || 0;
}

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
      const itemCount = cart?.item_count ?? cart?.items?.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
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

    // Optimistic UI update
    set((state) => {
      if (!state.cart) return state;
      const updatedItems = state.cart.items.map((item: CartItem) =>
        item.id === itemId ? { ...item, quantity } : item
      );
      const itemCount = updatedItems.reduce((sum, item) => sum + item.quantity, 0);
      return {
        cart: { ...state.cart, items: updatedItems },
        itemCount,
      };
    });

    try {
      await cartService.updateCartItem(itemId, { quantity });
      // Sync with backend to get fresh totals
      await get().fetchCart();
    } catch (error) {
      // Revert by re-fetching on error
      await get().fetchCart();
      console.error('Failed to update quantity:', error);
    }
  },

  removeItem: async (itemId: string) => {
    // Optimistic UI update
    set((state) => {
      if (!state.cart) return state;
      const updatedItems = state.cart.items.filter((item: CartItem) => item.id !== itemId);
      const itemCount = updatedItems.reduce((sum, item) => sum + item.quantity, 0);
      return {
        cart: { ...state.cart, items: updatedItems },
        itemCount,
      };
    });

    try {
      await cartService.removeFromCart(itemId);
      // Sync with backend to get fresh totals
      await get().fetchCart();
    } catch (error) {
      // Revert by re-fetching on error
      await get().fetchCart();
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
      const price = toNum(item.price);
      return total + price * item.quantity;
    }, 0);
  },
}));
