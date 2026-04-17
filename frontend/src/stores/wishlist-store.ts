import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { wishlistService, Wishlist } from '@/services/product';
import { toast } from 'sonner';

interface WishlistState {
  items: Wishlist[];
  isLoading: boolean;
  
  // Actions
  loadWishlist: () => Promise<void>;
  addToWishlist: (productId: string) => Promise<Wishlist>;
  removeFromWishlist: (wishlistId: string) => Promise<void>;
  isInWishlist: (productId: string) => boolean;
  getWishlistCount: () => number;
  clearWishlist: () => void;
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],
      isLoading: false,

      loadWishlist: async () => {
        set({ isLoading: true });
        try {
          const response = await wishlistService.getWishlist(100);
          set({ items: response.items });
        } catch (error) {
          console.error('Failed to load wishlist:', error);
          toast.error('Failed to load wishlist');
        } finally {
          set({ isLoading: false });
        }
      },

      addToWishlist: async (productId: string) => {
        try {
          const item = await wishlistService.addToWishlist(productId);
          set((state) => ({
            items: [item, ...state.items],
          }));
          toast.success('Added to wishlist');
          return item;
        } catch (error) {
          console.error('Failed to add to wishlist:', error);
          toast.error('Failed to add to wishlist');
          throw error;
        }
      },

      removeFromWishlist: async (wishlistId: string) => {
        try {
          await wishlistService.removeFromWishlist(wishlistId);
          set((state) => ({
            items: state.items.filter((item) => item.id !== wishlistId),
          }));
          toast.success('Removed from wishlist');
        } catch (error) {
          console.error('Failed to remove from wishlist:', error);
          toast.error('Failed to remove from wishlist');
          throw error;
        }
      },

      isInWishlist: (productId: string) => {
        return get().items.some((item) => item.product_id === productId);
      },

      getWishlistCount: () => {
        return get().items.length;
      },

      clearWishlist: () => {
        set({ items: [] });
      },
    }),
    {
      name: 'wishlist-store',
      partialize: (state) => ({
        items: state.items,
      }),
    }
  )
);
