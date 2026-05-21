'use client';

import { motion } from 'framer-motion';
import { Heart } from 'lucide-react';

interface WishlistHeaderProps {
  count: number;
}

export function WishlistHeader({ count }: WishlistHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold mb-2">Your Wishlist</h1>
        <p className="text-muted-foreground">
          {count} item{count !== 1 ? 's' : ''} saved
        </p>
      </div>
      {count > 0 && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
        >
          <Heart className="h-8 w-8 text-red-500 fill-red-500" />
        </motion.div>
      )}
    </div>
  );
}
