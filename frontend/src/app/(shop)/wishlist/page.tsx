'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Heart, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProductCard } from '@/components/product/product-card';
import { useWishlistStore } from '@/stores/wishlist-store';
import { useAuthStore } from '@/stores/auth-store';
import { Product } from '@/types';

export default function WishlistPage() {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { items, isLoading, loadWishlist: loadWishlistFn } = useWishlistStore();
  const [pageLoading, setPageLoading] = useState(true);

  // Memoize loadWishlist to prevent infinite loops
  const handleLoadWishlist = useCallback(async () => {
    if (user && isAuthenticated) {
      await loadWishlistFn();
    }
  }, [user, isAuthenticated, loadWishlistFn]);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      await handleLoadWishlist();
      if (isMounted) {
        setPageLoading(false);
      }
    }

    load();

    return () => {
      isMounted = false;
    };
  }, [handleLoadWishlist]);

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-20">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-6"
        >
          <Heart className="h-16 w-16 mx-auto text-muted-foreground opacity-50" />
          <div>
            <h1 className="text-3xl font-bold mb-2">Your Wishlist</h1>
            <p className="text-muted-foreground mb-6">
              Sign in to save your favorite items
            </p>
          </div>
          <Button asChild size="lg">
            <Link href="/login">Sign In</Link>
          </Button>
        </motion.div>
      </div>
    );
  }

  if (pageLoading) {
    return (
      <div className="container mx-auto px-4 py-20 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Extract products from wishlist items
  const products = items
    .map((item) => item.product)
    .filter((product): product is Product => product !== null && product !== undefined);

  return (
    <div className="container mx-auto px-4 py-12">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="space-y-8"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Your Wishlist</h1>
            <p className="text-muted-foreground">
              {items.length} item{items.length !== 1 ? 's' : ''} saved
            </p>
          </div>
          {items.length > 0 && (
            <Heart className="h-8 w-8 text-red-500 fill-red-500" />
          )}
        </div>

        {/* Products Grid */}
        {items.length > 0 ? (
          <>
            <motion.div
              layout
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            >
              {products.map((product, index) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  index={index}
                />
              ))}
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="flex justify-center gap-4 pt-8"
            >
              <Button asChild variant="outline">
                <Link href="/products">Continue Shopping</Link>
              </Button>
              <Button asChild>
                <Link href="/cart">View Cart</Link>
              </Button>
            </motion.div>
          </>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20 space-y-6"
          >
            <Heart className="h-16 w-16 mx-auto text-muted-foreground opacity-50" />
            <div>
              <h2 className="text-2xl font-bold mb-2">Your wishlist is empty</h2>
              <p className="text-muted-foreground mb-6">
                Add items to your wishlist as you explore
              </p>
            </div>
            <Button asChild size="lg">
              <Link href="/products">Browse Products</Link>
            </Button>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
