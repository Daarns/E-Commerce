import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { wishlistService, Wishlist } from '@/services/wishlist';
import { toast } from 'sonner';
import axios from 'axios';

interface WishlistState {
  items: Wishlist[];
  isLoading: boolean;
  toggleLoadingProductIds: Set<string>;
  
  // Actions
  loadWishlist: () => Promise<void>;
  addToWishlist: (productId: string) => Promise<Wishlist>;
  removeFromWishlist: (wishlistId: string) => Promise<void>;
  toggleWishlist: (productId: string) => Promise<void>;
  isInWishlist: (productId: string) => boolean;
  isToggling: (productId: string) => boolean;
  getWishlistCount: () => number;
  clearWishlist: () => void;
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],
      isLoading: false,
      toggleLoadingProductIds: new Set(),

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
          // Handle 409 Conflict - product already in wishlist
          if (axios.isAxiosError(error) && error.response?.status === 409) {
            toast.info('Already in your wishlist', {
              description: 'Click the heart icon again to remove it'
            });
            // Return a dummy item to signal success to the UI (item already in store)
            return { id: '', product_id: productId, user_id: '', created_at: '' } as Wishlist;
          } else {
            console.error('Failed to add to wishlist:', error);
            toast.error('Failed to add to wishlist');
            throw error;
          }
        }
      },

      removeFromWishlist: async (wishlistId: string) => {
        try {
          // Find the product_id from the wishlist item
          const wishlistItem = get().items.find((item) => item.id === wishlistId);
          if (wishlistItem) {
            await wishlistService.removeFromWishlist(wishlistItem.product_id);
          }
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

      toggleWishlist: async (productId: string) => {
        // Optimistic update: immediately toggle the UI
        const isCurrentlyInWishlist = get().isInWishlist(productId);
        
        // Update loading state
        set((state) => ({
          toggleLoadingProductIds: new Set([...state.toggleLoadingProductIds, productId]),
        }));

        try {
          // Optimistically update the UI
          if (isCurrentlyInWishlist) {
            // Remove from wishlist optimistically
            set((state) => ({
              items: state.items.filter((item) => item.product_id !== productId),
            }));
          } else {
            // Add to wishlist optimistically
            const tempItem: Wishlist = {
              id: `temp-${productId}`,
              product_id: productId,
              user_id: '',
              created_at: new Date().toISOString(),
            };
            set((state) => ({
              items: [tempItem, ...state.items],
            }));
          }

          // Make the server request
          const result = await wishlistService.toggleWishlist(productId);

          // Sync with server response
          if (result.is_wishlisted) {
            // Server says it's wishlisted, ensure it's in the list
            if (!get().isInWishlist(productId) && result.product) {
              set((state) => ({
                items: [result.product!, ...state.items],
              }));
            }
            toast.success('Added to wishlist');
          } else {
            // Server says it's not wishlisted, remove it from the list
            set((state) => ({
              items: state.items.filter((item) => item.product_id !== productId),
            }));
            toast.success('Removed from wishlist');
          }
        } catch (error) {
          // Rollback on error
          if (isCurrentlyInWishlist) {
            // Was in wishlist, but toggle failed—add it back
            const item = get().items.find((i) => i.product_id === productId);
            if (!item) {
              // Need to reload from server if we can't find it
              get().loadWishlist();
            }
          } else {
            // Was not in wishlist, but toggle failed—remove the temp item
            set((state) => ({
              items: state.items.filter((item) => item.product_id !== productId),
            }));
          }
          console.error('Failed to toggle wishlist:', error);
          toast.error('Failed to update wishlist');
        } finally {
          set((state) => ({
            toggleLoadingProductIds: new Set(
              [...state.toggleLoadingProductIds].filter((id) => id !== productId)
            ),
          }));
        }
      },

      isInWishlist: (productId: string) => {
        return get().items.some((item) => item.product_id === productId);
      },

      isToggling: (productId: string) => {
        return get().toggleLoadingProductIds.has(productId);
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
