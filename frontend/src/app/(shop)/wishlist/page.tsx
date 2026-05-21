'use client';

import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { useWishlistData } from '@/hooks/useWishlistData';
import { WishlistNotAuthenticated } from '@/components/wishlist/WishlistNotAuthenticated';
import { WishlistHeader } from '@/components/wishlist/WishlistHeader';
import { WishlistEmpty } from '@/components/wishlist/WishlistEmpty';
import { WishlistContent } from '@/components/wishlist/WishlistContent';

export default function WishlistPage() {
  const { user, items, products, pageLoading } = useWishlistData();

  if (!user) {
    return <WishlistNotAuthenticated />;
  }

  if (pageLoading) {
    return (
      <div className="container mx-auto px-4 py-20 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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

        {items.length > 0 ? (
          <WishlistContent products={products} />
        ) : (
          <WishlistEmpty />
        )}
      </motion.div>
    </div>
  );
}
