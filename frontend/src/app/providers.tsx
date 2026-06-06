'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import { useCartStore } from '@/stores/cart-store';
import { useWishlistStore } from '@/stores/wishlist-store';
import { ChatWidget } from '@/components/chat/chat-widget';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      refetchOnWindowFocus: false,
    },
  },
});

const LAST_NON_ADMIN_PATH_KEY = 'last_non_admin_path';
const AUTH_PATHS = new Set(['/login', '/register', '/forgot-password', '/reset-password', '/verify-email']);

function RouteMemory() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || pathname.startsWith('/admin') || AUTH_PATHS.has(pathname)) {
      return;
    }

    window.sessionStorage.setItem(LAST_NON_ADMIN_PATH_KEY, pathname);
  }, [pathname]);

  return null;
}

function AuthInitializer({ children }: { children: React.ReactNode }) {
  const { checkAuth, isAuthenticated } = useAuthStore();
  const { fetchCart, resetCart } = useCartStore();
  const { loadWishlist, clearWishlist } = useWishlistStore();
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);

  // Step 1: Check auth on mount
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Step 2: Fetch cart only after auth is resolved and user is logged in
  useEffect(() => {
    if (isAuthenticated) {
      fetchCart();
      loadWishlist();
      return;
    }
    resetCart();
    clearWishlist();
  }, [isAuthenticated, fetchCart, resetCart, loadWishlist, clearWishlist]);

  return (
    <>
      <RouteMemory />
      {children}
      {!pathname?.startsWith('/admin') && user?.role !== 'admin' && <ChatWidget />}
    </>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthInitializer>
        {children}
      </AuthInitializer>
    </QueryClientProvider>
  );
}
