'use client';

import { motion } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';
import { useWishlistData } from '@/hooks/useWishlistData';
import { WishlistNotAuthenticated } from '@/components/wishlist/WishlistNotAuthenticated';
import { WishlistHeader } from '@/components/wishlist/WishlistHeader';
import { WishlistEmpty } from '@/components/wishlist/WishlistEmpty';
import { WishlistContent, WishlistGridSkeleton } from '@/components/wishlist/WishlistContent';

export default function WishlistPage() {
  const { user, items, products, isLoading, pageLoading } = useWishlistData();

  if (!user) {
    return <WishlistNotAuthenticated />;
  }

  if (pageLoading) {
    return (
      <div className="container mx-auto space-y-8 px-4 py-12">
        <div className="space-y-3">
          <Skeleton className="h-9 w-56" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
        <WishlistGridSkeleton />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="space-y-8"
      >
        <WishlistHeader count={items.length} />

        {items.length > 0 || isLoading ? (
          <WishlistContent products={products} isLoading={isLoading} />
        ) : (
          <WishlistEmpty />
        )}
      </motion.div>
    </div>
  );
}
